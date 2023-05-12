const platformdiv = document.getElementById('platformdiv');

// Not sure if all of these are valid right now
platforms = ['steam', 'epic', 'gog', 'origin', 'uplay', 'battlenet', 'xbox', 'psn', 'nintendo', 'drmfree'];

platformdiv.innerHTML = `<legend>Choose platforms: </legend>` +
                            platforms.map(p => `<label>${p}: <input id="${p}checkbox" name="platformcheckbox" type="checkbox"></input></label>`).join('<br/>\n')


const versionSpan = document.getElementById('version');
versionSpan.innerText = "Version: " + browser.runtime.getManifest().version;


const button = document.getElementById('saveButton');
button.addEventListener('click', () => {
    saveSettings();
});


var platformRadioValue = "disablePlatforms";
platformdiv.style.display = 'none';
const platformRadios = document.getElementsByName('platformsRadio');
for(const radio of platformRadios) {
    radio.addEventListener('change', () => {
        platformRadioValue = radio.value;
        if(platformRadioValue === 'disablePlatforms') {
            platformdiv.style.display = 'none';
        } else {
            platformdiv.style.display = 'block';
        }
    });
}

var ownedRadioValue = "disableOwned";
const steamSettings = document.getElementById('steamSettings');
const ownedRadios = document.getElementsByName('ownedRadio');

for(const radio of ownedRadios) {
    radio.addEventListener('change', () => {
        ownedRadioValue = radio.value;
        if(ownedRadioValue === 'disableOwned') {
            steamSettings.style.display = 'none';
        } else {
            steamSettings.style.display = 'block';
        }
    });
}


browser.storage.sync.get(['platforms', 'steamid', 'platformMode', 'ownedMode']).then(result => {
    if(!result) return;
    if(result.platforms) {
        for(const platform of result.platforms) {
            document.getElementById(platform + 'checkbox').checked = true;
        }
    }
    if(result.steamid) {
        document.getElementById('steamid').value = result.steamid;
    }

    if(result.platformMode) platformRadioValue = result.platformMode;
    document.getElementById(platformRadioValue).checked = true;
    if(platformRadioValue === 'disablePlatforms') {
        platformdiv.style.display = 'none';
    } else {
        platformdiv.style.display = 'block';
    }

    if(result.ownedMode) ownedRadioValue = result.ownedMode;
    document.getElementById(ownedRadioValue).checked = true;
    if(ownedRadioValue === 'disableOwned') {
        steamSettings.style.display = 'none';
    } else {
        steamSettings.style.display = 'block';
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
        "platforms": checked,
        "platformMode": platformRadioValue || "disablePlatforms",
        "ownedMode": ownedRadioValue || "disableOwned"
    }
    browser.storage.sync.set(settings).then(() => {
        const saveMessage = document.getElementById('saveMessage');
        saveMessage.innerText = 'Settings saved';
        setTimeout(() => {
            saveMessage.innerText = '';
        }, 2000);
    });

}