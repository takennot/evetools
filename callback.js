        const CLIENT_ID = 'aaae58b7e1d34d6fad4f30d8736fbb83';
        const REDIRECT_URI = 'https://takennot.github.io/evetools/callback';
        const CLIENT_SECRET1 = 'FHfTqcW79O'; // secret key consists of 7 parts, its not secure, but at least im not storing it as-is.
const CLIENT_SECRET2 = "ujjTo";
const CLIENT_SECRET3 = "HLsKl";
const CLIENT_SECRET4 = "zRgbg";
const CLIENT_SECRET5 = "FAKDb";
const CLIENT_SECRET6 = "PmCvH";
const CLIENT_SECRET7 = 'brbAr';
const CLIENT_SECRET = CLIENT_SECRET1 + CLIENT_SECRET2 + CLIENT_SECRET3 + CLIENT_SECRET4 + CLIENT_SECRET5 + CLIENT_SECRET6 + CLIENT_SECRET7;
        async function getAccessToken(code) {
            const url = 'https://login.eveonline.com/v2/oauth/token';
            const auth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${auth}`
                },
                body: new URLSearchParams({
                    grant_type: 'authorization_code',
                    code: code,
                    redirect_uri: REDIRECT_URI
                })
            });

            const data = await response.json();
            return data.access_token;
        }

        async function getPlayerLocation(accessToken) {
            const response = await fetch('https://esi.evetech.net/latest/characters/{character_id}/location/', {
                headers: {
                    'Authorization': `Bearer ${accessToken}`
                }
            });

            const data = await response.json();
            return data;
        }

        async function main() {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');

            if (code) {
                try {
                    const accessToken = await getAccessToken(code);
                    const location = await getPlayerLocation(accessToken);
                    document.getElementById('location').textContent = JSON.stringify(location, null, 2);
                } catch (error) {
                    console.error('Error fetching location:', error);
                    document.getElementById('location').textContent = 'Failed to retrieve location.';
                }
            } else {
                document.getElementById('location').textContent = 'No authorization code found.';
            }
        }

        main();