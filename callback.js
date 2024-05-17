const CLIENT_ID = 'aaae58b7e1d34d6fad4f30d8736fbb83'; // Client ID (from EVE Dev)
const REDIRECT_URI = 'https://takennot.github.io/evetools/callback'; // Callback URL
const SCOPES = 'esi-location.read_location.v1'; // required scopes
const CLIENT_SECRET1 = 'FHfTqcW79O'; // secret key consists of 7 parts, its not secure, but at least im not storing it as-is.
const CLIENT_SECRET2 = "ujjTo";
const CLIENT_SECRET3 = "HLsKl";
const CLIENT_SECRET4 = "zRgbg";
const CLIENT_SECRET5 = "FAKDb";
const CLIENT_SECRET6 = "PmCvH";
const CLIENT_SECRET7 = 'brbAr';
const CLIENT_SECRET = CLIENT_SECRET1 + CLIENT_SECRET2 + CLIENT_SECRET3 + CLIENT_SECRET4 + CLIENT_SECRET5 + CLIENT_SECRET6 + CLIENT_SECRET7;

        function base64Encode(str) {
            return btoa(unescape(encodeURIComponent(str)));
        }

        async function getAccessToken(code) {
            const url = 'https://login.eveonline.com/v2/oauth/token';
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Optional CORS proxy

            const auth = base64Encode(`${CLIENT_ID}:${CLIENT_SECRET}`);

            const response = await fetch(proxyUrl + url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`,
                    'X-Requested-With': 'XMLHttpRequest' // Custom header
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data.access_token;
        }

        async function getPlayerLocation(accessToken) {
            const characterIdUrl = 'https://esi.evetech.net/latest/characters/2118039294/location/'; // Replace with the actual character ID endpoint
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Optional CORS proxy

            const response = await fetch(proxyUrl + characterIdUrl, {
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
async function main() {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        try {
            const accessToken = await getAccessToken(code);
        } catch (error) {
            console.error('Error:', error);
            // Handle error
        }
    } else {
        console.error('No authorization code found.');
        // Handle missing authorization code
    }
}

main();
