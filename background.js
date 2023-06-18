function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}

// Time constants
const _5min = 1000 * 60 * 5
const _1hour = 1000 * 60 * 60

// Used to get the names of the games from appIDs
const getAllSteamGames = async () => {
    const result = await browser.storage.local.get(["slowCacheTime", "appIDToName"])
    let appIDToName = result.appIDToName
    
    // Check if last cache is less than 1 hour old
    if(!(result && result.slowCacheTime && Date.now() - result.slowCacheTime < _1hour)) {
        const responseGames = await fetch(`https://api.steampowered.com/ISteamApps/GetAppList/v2/`)
        const data = await responseGames.json()
        const games = data.applist.apps
    
        // Don't need nametoappid yet, but might be useful later
        // const tempNameToAppID = {}
        const tempAppIDToName = {}
    
        games.forEach(game => {
            // tempNameToAppID[minifyName(game.name)] = game.appid
            tempAppIDToName[game.appid] = minifyName(game.name)
        })
        // const nameToAppID = tempNameToAppID
        appIDToName = tempAppIDToName
    
        browser.storage.local.set({
            // "nameToAppID": nameToAppID, 
            "appIDToName": appIDToName, 
            "slowCacheTime": Date.now()
        })
    }
    return {appIDToName}
}


// This version requires the user to be logged in to Steam on the browser, supports DLC and wishlist
const getSteamUserDataLogin = async () => {
    const {appIDToName} = await getAllSteamGames()

    const params = new URLSearchParams();
    params.set( '_', Date.now() );
    // Get new data from Steam
    try {
        const response = await fetch(`https://store.steampowered.com/dynamicstore/userdata/?${params.toString()}`,
        {
            credentials: 'include',
            headers: {
                // Stolen from https://github.com/SteamDatabase/BrowserExtension/
                // Pretend we're doing a normal navigation request.
                // This will trigger login.steampowered.com redirect flow if user has expired cookies.
                Accept: 'text/html',
            }
        })
        const data = await response.json()
        if( !data || !data.rgOwnedApps || !data.rgOwnedApps.length ) {
            throw new Error( 'HBF: Are you logged on the Steam Store in this browser?' );
        }
        
        const wishlist = data.rgWishlist
        const owned = data.rgOwnedApps

        const ownedGames = owned.map(appID => appIDToName[appID])
        const wishlistGames = wishlist.map(appID => appIDToName[appID])
        return {ownedGames, wishlistGames}
    } catch (error) {
        console.error(error)
        return {ownedGames: [], wishlistGames: [], error}
    }
}

// This uses an old API that doesn't require an API key, has wishlist, but doesn't return DLC
const getSteamUserDataID = async (userID) => {
    // Check if last cache is less than 5 minutes old
    browser.storage.local.get([]).then(result => {
        if(result && result.cacheTime && Date.now() - result.cacheTime < _5min) {
            return {ownedGames: result.ownedGames, wishlistGames: result.wishlistGames}
        }
    })
    // Get new data from Steam
    try {
        // Old API (the one we're using here) is not supported, but new one requires API key
        const responseGames = await fetch(`https://steamcommunity.com/profiles/${userID}/games?tab=all&xml=1`)
        // Parse XML response
        const xmlString = await responseGames.text()
        const parser = new DOMParser()
        const xmlData = parser.parseFromString(xmlString, 'text/xml')
        console.log(xmlData)
        const data = JSON.parse(xml2json(xmlData, '  '))
        // Get names from JSON
        if(!data) {
            console.log("HBF: No response from Steam")
            return
        }
        const steamData = data.gamesList
        if(!steamData) {
            console.log("HBF: Response from Steam doesn't contain data")
            return
        }
        const gamesList = steamData.games
        if(!gamesList) {
            let str = "HBF: Response from Steam doesn't contain games"
            if (steamData.steamID) str += `, Steam ID: ${steamData.steamID["#cdata"]}`
            console.log(str)
            return
        }
        const games = gamesList.game
        if(!games) {
            console.log("HBF: Response from Steam has gamelist but doesn't contain games")
            return
        }
        ownedGames = games.map(game => minifyName(game.name["#cdata"]))
    } catch (error) {
        console.error(error)
    }
    try {
        // Wishlist is paged
        const wishlistGamesTemp = []
        var p = 0
        while(true) {
            const responseWishlist = await fetch(`https://store.steampowered.com/wishlist/profiles/${userID}/wishlistdata/?p=${p++}`)
            const data = await responseWishlist.json()
            if(!data) break
            const newGames = Object.values(data).map(game => minifyName(game.name))
            if(newGames.length === 0) break
            wishlistGamesTemp.push(...newGames)
            // Add delay to prevent rate limiting
            await delay(500)
        }
        wishlistGames = wishlistGamesTemp
    } catch (error) {
        console.error(error)
    }
    browser.storage.local.set({"ownedGames": ownedGames, "wishlistGames": wishlistGames, "cacheTime": Date.now()})
}

// The new API version requires an API key and doesn't support wishlist or DLC so it's worse than the SteamID one
const getSteamUserDataAPIKey = async (userID, apiKey) => {
    const params = new URLSearchParams();
    params.set( 'key', apiKey );
    params.set( 'steamid', userID );
    params.set( 'include_appinfo', 1 );
    params.set( 'include_played_free_games', 1 );

    const response = await fetch(`https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?${params.toString()}`)
    // console.log(response)
    const data = await response.json()
    // console.log(data)
}

const getSteamUserData = async () => {
    const result = await browser.storage.local.get(['ownedGames', 'wishlistGames', 'fastCacheTime'])
    if(!result) return
    let ownedGames = result.ownedGames || []
    let wishlistGames = result.wishlistGames || []
    let error = null
    
    // Check if last cache is less than 5 minutes old or if there's no data
    if(!(result.fastCacheTime && Date.now() - result.fastCacheTime < _5min) || ownedGames.length === 0 || wishlistGames.length === 0) {
        const resultSync = await browser.storage.sync.get(['ownedMode', 'steamid'])
        
        if(resultSync.ownedMode === "ownedSteamID") {
            if(!resultSync.userID) error = new Error("HBF: No Steam ID")
            else ({ownedGames, wishlistGames, error} = await getSteamUserDataID(resultSync.steamid))
        } else if(resultSync.ownedMode === "ownedLogin") {
            ({ownedGames, wishlistGames, error} = await getSteamUserDataLogin())
        }
        browser.storage.local.set({ownedGames, wishlistGames, "fastCacheTime": Date.now()})
    }
    
    // if(ownedGames.length === 0) error = new Error("HBF: No owned games found")
    // if(wishlistGames.length === 0) error = new Error("HBF: No wishlist games found")
    return new Promise((resolve) => resolve({ownedGames, wishlistGames, error}))
}


browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    switch (message.type) {
        case 'ownedGames': return getSteamUserData();
        default: return new Promise((resolve) => resolve({error: new Error(`HBF: Unknown message type: ${message.type}`)}));
    }
});
console.log("HBF: background script loaded")
