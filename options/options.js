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


const steamIDinput = document.getElementById('steamid');
steamIDinput.addEventListener('input', (e) => {
    // Only allow numbers
    steamIDinput.value = steamIDinput.value.replace(/\D/g,'');
})

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
const steamIDSettings = document.getElementById('steamIDSettings');
const steamLoginDiv = document.getElementById('steamLogin');
const steamAPIKeySettings = document.getElementById('steamAPIKeySettings');

const updateOwnedRadio = () => {
    steamLoginDiv.style.display = 'none';
    steamIDSettings.style.display = 'none';
    steamAPIKeySettings.style.display = 'none';
    
    if(ownedRadioValue === 'ownedSteamID') {
        steamIDSettings.style.display = 'block';
    } else if(ownedRadioValue === 'ownedLogin') {
        steamLoginDiv.style.display = 'block';
    } else if(ownedRadioValue === 'ownedAPIKey') {
        steamAPIKeySettings.style.display = 'block';
    }
}
updateOwnedRadio()

const ownedRadios = document.getElementsByName('ownedRadio');
for(const radio of ownedRadios) {
    radio.addEventListener('change', () => {
        ownedRadioValue = radio.value;
        updateOwnedRadio();
    });
}

const showAdvanced = document.getElementById('showAdvanced');
const advancedModes = document.getElementById('advancedModes');

const updateAdvancedModes = () => {
    if(showAdvanced.checked) {
        advancedModes.style.display = 'block';
    } else {
        advancedModes.style.display = 'none';
    }
}

showAdvanced.addEventListener('change', () => {
    updateAdvancedModes();
});
updateAdvancedModes();


browser.storage.sync.get(['platforms', 'steamid', 'platformMode', 'ownedMode', 'showAdvanced', 'steamapikey']).then(result => {
    if(!result) return;
    if(result.platforms) {
        for(const platform of result.platforms) {
            document.getElementById(platform + 'checkbox').checked = true;
        }
    }
    if(result.steamid) {
        document.getElementById('steamid').value = result.steamid;
        document.getElementById('steamidapi').value = result.steamid;
    }
    if(result.showAdvanced) {
        showAdvanced.checked = result.showAdvanced;
        updateAdvancedModes();
    }
    if(result.steamapikey) {
        document.getElementById('steamapikey').value = result.steamapikey;
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
    updateOwnedRadio()
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
        "steamid": steamIDinput.value,
        "platforms": checked,
        "platformMode": platformRadioValue || "disablePlatforms",
        "ownedMode": ownedRadioValue || "disableOwned",
        "showAdvanced": showAdvanced.checked,
        "steamapikey": document.getElementById('steamapikey').value
    }
    browser.storage.sync.set(settings).then(() => {
        const saveMessage = document.getElementById('saveMessage');
        saveMessage.innerText = 'Settings saved';
        setTimeout(() => {
            saveMessage.innerText = '';
        }, 2000);
    });

}