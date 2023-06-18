const modes = {
    "bundles": 0,
    "store": 1,
    "keys": 2,
    "choice": 3
}
// 
let mode = 0


let ownedGames = []
let wishlistGames = []

// Time constants
const _5min = 1000 * 60 * 5

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

browser.storage.sync.get(['platforms', 'platformMode', 'ownedMode', 'fastCacheTime']).then(async (result) => {
    if(!result) return
    const userID = result.steamid
    platforms = result.platforms || platforms
    platformMode = result.platformMode || platformMode
    ownedMode = result.ownedMode || ownedMode

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

    if(result.fastCacheTime && Date.now() - result.fastCacheTime < _5min) return

    const response = await browser.runtime.sendMessage({type: "ownedGames"})
    if(!response) return
    if(response.error) return console.error(response.error)

    ownedGames = response.ownedGames || ownedGames
    wishlistGames = response.wishlistGames || wishlistGames

        addClasses(document.body, platforms, platformMode, ownedMode)

    browser.storage.local.set({ownedGames, wishlistGames, "fastCacheTime": Date.now()})
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