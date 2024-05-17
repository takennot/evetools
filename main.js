const CLIENT_ID = 'aaae58b7e1d34d6fad4f30d8736fbb83'; // Client ID (from EVE Dev)
const REDIRECT_URI = 'https://takennot.github.io/evetools/'; // Callback URL
const SCOPES = 'esi-location.read_location.v1'; // required scopes
const CLIENT_SECRET1 = 'FHfTqcW79O'; // secret key consists of 7 parts, its not secure, but at least im not storing it as-is.
const CLIENT_SECRET2 = "ujjTo";
const CLIENT_SECRET3 = "HLsKl";
const CLIENT_SECRET4 = "zRgbg";
const CLIENT_SECRET5 = "FAKDb";
const CLIENT_SECRET6 = "PmCvH";
const CLIENT_SECRET7 = 'brbAr';
const CLIENT_SECRET = CLIENT_SECRET1 + CLIENT_SECRET2 + CLIENT_SECRET3 + CLIENT_SECRET4 + CLIENT_SECRET5 + CLIENT_SECRET6 + CLIENT_SECRET7;

document.getElementById('login-button').addEventListener('click', () => {
    const authUrl = `https://login.eveonline.com/v2/oauth/authorize/?response_type=token&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&client_id=${CLIENT_ID}&scope=${SCOPES}&state=${makeid()}`;
    window.location.href = authUrl;
});

// Function to extract access token from URL fragment
function getAccessTokenFromUrl() {
    const fragment = window.location.hash.substring(1);
    const params = new URLSearchParams(fragment);
    return params.get('access_token');
}


async function getCharacterId(accessToken) {
    const verifyUrl = 'https://esi.evetech.net/latest/verify/';

    const response = await fetch(verifyUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.CharacterID;
}

async function getPlayerLocation(accessToken) {
    const characterId = await getCharacterId(accessToken);
    const characterIdUrl = `https://esi.evetech.net/latest/characters/${characterId}/location/`;

    const response = await fetch(characterIdUrl, {
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'X-Requested-With': 'XMLHttpRequest' // Custom header
        }
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
}

// Handling the callback
window.onload = async () => {
    const accessToken = getAccessTokenFromUrl();
    if (accessToken) {
        try {
            const location = await getPlayerLocation(accessToken);
            document.getElementById('location').textContent = JSON.stringify(location, null, 2);
        } catch (error) {
            console.error('Error fetching location:', error);
            document.getElementById('location').textContent = 'Failed to retrieve location.';
        }
    }
};


function makeid() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter <= 5) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}
