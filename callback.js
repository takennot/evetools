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
                    'Origin': 'http://localhost:3000', // Replace with your origin
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
            const characterIdUrl = 'https://esi.evetech.net/latest/characters/{character_id}/location/'; // Replace with the actual character ID endpoint
            const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // Optional CORS proxy

            const response = await fetch(proxyUrl + characterIdUrl, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Origin': 'http://localhost:3000', // Replace with your origin
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