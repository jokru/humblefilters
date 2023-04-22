const platformdiv = document.getElementById('platformdiv');

// Not sure if all of these are valid right now
platforms = ['steam', 'epic', 'gog', 'origin', 'uplay', 'battlenet', 'xbox', 'psn', 'nintendo', 'drmfree'];

platformdiv.innerHTML = platforms.map(p => `<label>${p}: <input id="${p}checkbox" name="platformcheckbox" type="checkbox"></input></label>`).join('<br/>\n');




const button = document.getElementById('saveButton');
button.addEventListener('click', () => {
    saveSettings();
});

browser.storage.sync.get(['platforms', 'steamid']).then(result => {
    if(!result) return;
    if(result.platforms) {
        for(const platform of result.platforms) {
            document.getElementById(platform + 'checkbox').checked = true;
        }
    }
    if(result.steamid) {
        document.getElementById('steamid').value = result.steamid;
    }
});


const saveSettings = () => {
    const checkboxes = document.getElementsByName('platformcheckbox');
    const checked = [];
    for(const checkbox of checkboxes) {
        if(checkbox.checked) {
            checked.push(checkbox.id.replace('checkbox', ''));
        }
    }

    const settings = {
        "steamid": document.getElementById('steamid').value,
        "platforms": checked
    }
    browser.storage.sync.set(settings).then(() => {
        const saveMessage = document.getElementById('saveMessage');
        saveMessage.innerText = 'Settings saved';
        setTimeout(() => {
            saveMessage.innerText = '';
        }, 2000);
    });

}