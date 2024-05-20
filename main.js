	// contact for EVE Devs
	const config = {
		ESI_USER_AGENT: "SHWRD++ (ruslan.musaev200121@gmail.com)"
	};
	// function for fetching JSONs from EVE's ESI
	// options argument is used only once, in getCharacterInfo()
	// because https://esi.evetech.net/ui/#/Universe/post_universe_ids is a POST
	async function fetchJSON(url, options = {}) {
		const response = await fetch(url, {
			headers: {
			"Content-Type": "application/json",
			"User-Agent": config.ESI_USER_AGENT
			},
			// spread operator to pass new options (POST)
			...options
		});
		if (!response.ok){
			throw new Error("Network response was not ok");
		}
		return await response.json();
	}
	// actual function for getting character info
	// first we take input from the user in the form of a character name (because they obviously dont know character ID)
	// then we try to search with that name using /universe/ids/ (to get the character ID)
	// 
	async function getCharacterInfo() {
		// setup variables
		const characterName = document.getElementById("character-name").value;
		const characterInfoDiv = document.getElementById("character-info");
		characterInfoDiv.innerHTML = "";
		// if its empty
		if (!characterName) {
			characterInfoDiv.innerHTML = "<p>Please enter a character name.</p>";
			return;
		}

		try {
			// Fetch character ID by name using POST /universe/ids/
			const idsEndpoint = "https://esi.evetech.net/latest/universe/ids/";
			const searchData = await fetchJSON(idsEndpoint, {
				method: "POST",
				body: JSON.stringify([characterName])
			});
			// if character is not there
			if (!searchData.characters || searchData.characters.length === 0) {
				throw new Error("Character not found");
			}
			// get ID of the first character (if multiple found)
			const characterId = searchData.characters[0].id;

			// Fetch character details
			const characterEndpoint = `https://esi.evetech.net/latest/characters/${characterId}/`;
			const characterData = await fetchJSON(characterEndpoint);

			// Fetch corporation details
			const corporationEndpoint = `https://esi.evetech.net/latest/corporations/${characterData.corporation_id}/`;
			const corporationData = await fetchJSON(corporationEndpoint);
			const corporationURL = corporationData.url;
			// defaulting info to N/A with OR
			const allianceId = characterData.alliance_id || "N/A";
			const factionId = characterData.faction_id || "N/A";
			// temporarily removing description because if a character has fancy description - it's styling
			// transfers to the html. Example:
			/*	"<font size=\"14\" color=\"#bfffffff\">
				</font><font size=\"18\" color=\"#bfffffff\">
				Ever find yourself stranded in a wormhole? */
			// ^^^ That's the response that I get from ESI, I maybe could use regex to remove the styling, but I got no time for that
			//const description = characterData.description || "N/A";
			const securityStatus = characterData.security_status || "N/A";
			const title = characterData.title || "N/A";
			let characterRace = "N/A";
			// There are only 4 races that player can choose from, so instead of requesting that data everytime from ESI
			// I just do this :D
			switch (characterData.race_id){
				case 1:
					characterRace = "Caldari";
					break;
				case 2:
					characterRace = "Minmatar";
					break;
				case 4:
					characterRace = "Amarr";
					break;
				case 8:
					characterRace = "Gallente";
					break;
			}
			// There are a bit more bloodlines in EVE, but I still dont wanna request them everytime from ESI
			// to not make any unnecessary API calls
			let characterBloodline = setBloodline(characterData) || "N/A";
			// if corporationURL is a valid URL - name will be a link, otherwise just a text
			characterInfoDiv.innerHTML = 
			`	<h2>Character Info</h2>
				<p><strong>Name:</strong> ${characterData.name}</p>
				<p><strong>Birthday:</strong> ${new Date(characterData.birthday).toLocaleDateString()}</p>
				<p><strong>Gender:</strong> ${characterData.gender}</p>
				<p><strong>Bloodline:</strong> ${characterBloodline}</p>
				<p><strong>Race:</strong> ${characterRace}</p>
				<p><strong>Corporation:</strong> ${corporationURL ? `<a href="${corporationURL}" target="_blank">${corporationData.name}</a>` : corporationData.name}</p>
				<p><strong>Alliance ID:</strong> ${allianceId}</p>
				<p><strong>Faction ID:</strong> ${factionId}</p>
				<p><strong>Security Status:</strong> ${securityStatus}</p>
				<p><strong>Title:</strong> ${title}</p>`;
		}
		catch (e) {
			characterInfoDiv.innerHTML = `<p>Error fetching character info: ${e.message}</p>`;
		}
	}

	async function setBloodline(charData) {
		try {
			const response = await fetch("bloodlines.json");
			if (!response) {
				throw new Error("Response was not ok");
			}
			const bloodlines = await response.json();
			const bloodline = await bloodlines.find(bl => bl.bloodline_id === charData.bloodline_id);
			const charBloodlineName = bloodline ? bloodline.name : "Unknown Bloodline";
			return charBloodlineName;
		}
		catch (error) {
			console.error("Error fetching bloodlines:", error);
		}
	}
