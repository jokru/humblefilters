
// The names might differ with non-alphanumeric characters and case

const minifyRules = [
    // Remove beginning numbers before dot, for store sidebar
    /^\d+\. /g,
    // Remove "the" from the beginning
    /^the /g,
    // Some games have "(steam)" in their name, but it's not part of the name
    /(steam)/g,
    // Remove non-alphanumeric characters
    /[\W_]/g
]

const minifyName = (name) => {
    if(!name) return
    name = name.toLowerCase()
    minifyRules.forEach(rule => {
        name = name.replace(rule, '')
    })
    return name
}