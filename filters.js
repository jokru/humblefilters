const modes = {
    "bundles": 0,
    "store": 1,
    "keys": 2,
    "choice": 3
}
// 
let mode = 0


function delay(time) {
    return new Promise(resolve => setTimeout(resolve, time));
}
let ownedGames = []
let wishlistGames = []

// Time constants
const _5min = 1000 * 60 * 5
const _1hour = 1000 * 60 * 60

// Used to get the names of the games from appIDs
const getSteamGames = async () => {
    // Check if last cache is less than 1 hour old
    const result = await browser.storage.local.get(["slowCacheTime", "appIDToName"])
    appIDToName = result.appIDToName

    if(result && result.slowCacheTime && Date.now() - result.slowCacheTime < _1hour) return

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
    // nameToAppID = tempNameToAppID
    appIDToName = tempAppIDToName


    browser.storage.local.set({
        // "nameToAppID": nameToAppID, 
        "appIDToName": appIDToName, 
        "slowCacheTime": Date.now()
    })
    // console.log(nameToAppID)
    // console.log(appIDToName)
}

const getSteamData = async (userID) => {
    // Check if last cache is less than 5 minutes old
    const result = await browser.storage.local.get(["fastCacheTime"])
    if(result && result.fastCacheTime && Date.now() - result.fastCacheTime < _5min) return

    // Get new data from Steam
    try {
        const response = await fetch(`https://store.steampowered.com/dynamicstore/userdata`,
        {
            credentials: 'include',
            headers: {
                // Stolen from https://github.com/SteamDatabase/BrowserExtension/
                // Pretend we're doing a normal navigation request.
                // This will trigger login.steampowered.com redirect flow if user has expired cookies.
                Accept: 'text/html',
            }
        })
        // console.log(response)
        const data = await response.json()
        console.log(data)
        if( !data || !data.rgOwnedApps || !data.rgOwnedApps.length ) {
            throw new Error( 'Are you logged on the Steam Store in this browser?' );
        }
        
        const wishlist = data.rgWishlist
        const owned = data.rgOwnedApps

        let notFound = {}
        const getGameName = (appID) => {
            const name = appIDToName[appID]
            if(!name) {
                notFound[appID] = true
            }
            return name //|| appID
        }

        ownedGames = owned.map(appID => getGameName(appID))
        wishlistGames = wishlist.map(appID => getGameName(appID))

        // console.log("not found", Object.keys(notFound))

        // console.log(ownedGames)
        // console.log(wishlistGames)
        browser.storage.local.set({"ownedGames": ownedGames, "wishlistGames": wishlistGames, "fastCacheTime": Date.now()})
    } catch (error) {
        console.error(error)
    }
}


// Let's keep this old function, in case we want to support it as an option
const _oldGetSteamData = async (userID) => {
    // Check if last cache is less than 5 minutes old
    browser.storage.local.get(["cacheTime"]).then(result => {
        if(result && result.cacheTime && Date.now() - result.cacheTime < _5min) return
    })
    // Get new data from Steam
    try {
        // Old API (the one we're using here) is not supported, but new one requires API key
        const responseGames = await fetch(`https://steamcommunity.com/profiles/${userID}/games?tab=all&xml=1`)
        // Parse XML response
        const xmlString = await responseGames.text()
        const parser = new DOMParser()
        const xmlData = parser.parseFromString(xmlString, 'text/xml')
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



const platformClass = (entity, platforms, platformMode) => {
    if(platformMode === 'disablePlatforms') return
    const platformElems = entity.querySelector('.platforms')
    const elemPlatforms = []
    if(!platformElems || !platformElems.children) return
    // Get all platform names from the element
    for(i = 0; i < platformElems.children.length; i++) {
        const platformElem = platformElems.children[i]
        let platformName = platformElem.classList[platformElems.classList.length]
        platformName = platformName.replace('hb-', '')
        elemPlatforms.push(platformName)
    }

    let condition = false
    if(platformMode === 'goodPlatforms') {
        // If the game isn't on any good platforms
        condition = !elemPlatforms.some(p => platforms.includes(p))
    } else if(platformMode === 'badPlatforms') {
        // Or if the game is only on bad platforms
        condition = elemPlatforms.every(p => platforms.includes(p))
    }
    if(condition) {
        entity.classList.add("not-on-platform")
    }
}

const titleSelectors = {}
titleSelectors[modes.bundles] = '.item-title'
titleSelectors[modes.store] = '.entity-title'
titleSelectors[modes.keys] = 'h4'
titleSelectors[modes.choice] = '.content-choice-title'

const ownedClass = (entity) => {
    const title = entity.querySelector(titleSelectors[mode])
    if(title) {
        const titleText = minifyName(title.innerText)
        // console.log(titleText)
        if(ownedGames.includes(titleText)) {
            entity.classList.add("owned-game")
        }
        if(wishlistGames.includes(titleText)) {
            entity.classList.add("wishlisted-game")
        }
    }
}

const entitySelectors = {}
entitySelectors[modes.bundles] = '.desktop-tier-collection-view .tier-item-view'
entitySelectors[modes.store] = '.entity-block-container, .entity-container'
entitySelectors[modes.keys] = '.unredeemed-keys-table tr'
entitySelectors[modes.choice] = '.content-choice-tiles .content-choice'



const addClasses = (node, platforms, platformMode, ownedMode) => {
    if(!node) return
    if(node.nodeType === Node.TEXT_NODE) return
    let entities = node.querySelectorAll(entitySelectors[mode])
    // Bad fix for keys table TODO: find better fix
    if(node.nodeName === 'TR') entities = [node]
    entities.forEach(entity => {
        platformClass(entity, platforms, platformMode)
        ownedMode === "enableOwned" && ownedClass(entity)
    })
}




// Begin


const curURL = window.location.pathname
const parts = curURL.split('/')

// The index 0 part is always empty
const firstPart = parts[1]
const lastPart = parts[parts.length - 1]

if(firstPart === 'games') {
    mode = modes.bundles
}
if(lastPart === 'keys') {
    mode = modes.keys
}
if(firstPart === 'store') {
    mode = modes.store
}
if(firstPart === 'membership') {
    mode = modes.choice
}



let platformMode = "disablePlatforms"
let ownedMode = "disableOwned"
let platforms = []

browser.storage.sync.get(['steamid', 'platforms', 'platformMode', 'ownedMode']).then(async (result) => {
    if(!result) return
    const userID = result.steamid
    platforms = result.platforms || platforms
    platformMode = result.platformMode || platformMode
    ownedMode = result.ownedMode || ownedMode

    await getSteamGames()
    // First do pass with cached data
    browser.storage.local.get(["ownedGames", "wishlistGames"]).then(result => {
        if(result.ownedGames) {
            ownedGames = result.ownedGames
        }
        if(result.wishlistGames) {
            wishlistGames = result.wishlistGames
        }
        addClasses(document.body, platforms, platformMode, ownedMode)
    })

    // Then pass with fresh data
    if(ownedMode === "disableOwned") return
    getSteamData(userID).then(() => {
        addClasses(document.body, platforms, platformMode, ownedMode)
    })
})


const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            // This DOM change was new nodes being added. Run our substitution
            // algorithm on each newly added node.
            for (let i = 0; i < mutation.addedNodes.length; i++) {
                const newNode = mutation.addedNodes[i];
                addClasses(newNode, platforms, platformMode, ownedMode);
            }
        }
    });
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});