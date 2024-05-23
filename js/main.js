// contact for EVE Devs
const config = {
	ESI_USER_AGENT: "SHWRD++ (ruslan.musaev200121@gmail.com)"
};

const loadingSpinner = $("#loadingSpinner");
loadingSpinner.hide();

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
	if (!response.ok) {
		throw new Error("Network response was not ok");
	}
	return await response.json();
}

// jQuery document ready function to initialize animations and button click handler
$(document).ready(function() {
	// Animations for the header
	$("#navheader").hide().slideDown(1000);

	// Animations for main section
	$("#mainSection").hide().fadeIn(2000);

	// Button hover animations
	$("button").hover(
		function() {
			$(this).animate({ backgroundColor: "#8E1ED9", color: "#fff" }, 300);
		}, function() {
			$(this).animate({ backgroundColor: "#380759", color: "#fff" }, 300);
		}
	);

	// Button click handler
	$("#fetchCharacterInfoButton").on("click", function() {
		getCharacterInfo();
		loadingSpinner.show();
	});

	// Show character info section with animation
	function showCharacterInfo() {
		$("#characterInfo").hide().slideDown(1000);
	}

	// Animate character info content
	function animateCharacterInfo() {
		$("#characterInfo").children().each(function(index) {
			$(this).hide().delay(index * 200).fadeIn(1000);
		});
	}

	// actual function for getting character info
	// first we take input from the user in the form of a character name (because they obviously don't know character ID)
	// then we try to search with that name using /universe/ids/ (to get the character ID)
	async function getCharacterInfo() {
		// setup variables
		const characterName = $("#characterName").val();
		const characterInfoDiv = $("#characterInfo");
		characterInfoDiv.html("");
		// if its empty
		if (!characterName) {
			characterInfoDiv.html("<p>Please enter a character name.</p>");
			showCharacterInfo();
			return;
		}

		try {
			// Fetch character ID by name using POST /universe/ids/
			const idsEndpoint = "https://esi.evetech.net/latest/universe/ids/?datasource=tranquility&language=en";
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

			// Corpo info
			const corporationEndpoint = `https://esi.evetech.net/latest/corporations/${characterData.corporation_id}/`;
			const corporationData = await fetchJSON(corporationEndpoint);
			const corporationURL = corporationData.url;
			const corporationTicker = corporationData.ticker;
			const corporationNameWithTicker = corporationData.name + ` [${corporationTicker}]`;

			// alliance info
			// defaulting info to N/A with OR
			const allianceId = characterData.alliance_id || "N/A";
			const allianceEndpoint = `https://esi.evetech.net/latest/alliances/${allianceId}/`;
			let allianceName = "";
			let allianceTicker = "";
			let allianceNameWithTicker = "";
			if (allianceId == "N/A") {
				allianceNameWithTicker = "N/A";
			} else {
				const allianceData = await fetchJSON(allianceEndpoint);
				allianceName = allianceData.name;
				allianceTicker = allianceData.ticker;
				allianceNameWithTicker = allianceName + ` [${allianceTicker}]`;
			}

			// temporarily removing description because if a character has fancy description - it's styling
			// transfers to the html. Example:
			/*	"<font size=\"14\" color=\"#bfffffff\">
				</font><font size=\"18\" color=\"#bfffffff\">
				Ever find yourself stranded in a wormhole? */
			// ^^^ That's the response that I get from ESI, I maybe could use regex to remove the styling, but I got no time for that
			//const description = characterData.description || "N/A";
			const securityStatus = characterData.security_status.toFixed(2) || "N/A";
			const title = characterData.title || "N/A";
			let characterRace = "N/A";
			// There are only 4 races that player can choose from, so instead of requesting that data every time from ESI
			// I just do this :D
			switch (characterData.race_id) {
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

			// Image URLs
			const characterImageURL = `https://images.evetech.net/characters/${characterId}/portrait`;
			const corporationImageURL = `https://images.evetech.net/corporations/${characterData.corporation_id}/logo`;
			// set alliance image url only if its available
			const allianceImageURL = allianceId !== "N/A" ? `https://images.evetech.net/alliances/${allianceId}/logo` : "";
			// if corporationURL is a valid URL - name will be a link, otherwise just a text
			// show alliance img only if its valid
			characterInfoDiv.html(`
				<div id="characterInfoDiv">
					<div class="left-column">
						<h2>Character Info</h2>
						<img id="characterPortrait" src="${characterImageURL}" alt="${characterData.name} Portrait">
						<p id="characterName"><strong>Name:</strong> ${characterData.name}</p>
						<p id="characterBirthday"><strong>Birthday:</strong> ${new Date(characterData.birthday).toLocaleDateString()}</p>
						<p id="characterGender"><strong>Gender:</strong> ${characterData.gender}</p>
						<p id="characterRace"><strong>Race:</strong> ${characterRace}</p>
						<p id="characterSecurityStatus"><strong>Security Status:</strong> ${securityStatus}</p>
						<p id="characterTitles"><strong>Title(s):</strong> ${title}</p>
					</div>
					<div class="right-column">
						<p id="corporationName"><strong>Corporation:</strong><br> ${corporationURL ? `<a href="${corporationURL}" target="_blank">${corporationNameWithTicker}</a>` : `${corporationNameWithTicker}`}</p>
						<img id="corporationLogo" src="${corporationImageURL}" alt="${corporationData.name} Logo">
						<p id="allianceName"><strong>Alliance:</strong><br> ${allianceNameWithTicker}</p>
						${allianceImageURL ? `<img id="allianceLogo" src="${allianceImageURL}" alt="${allianceName} Logo">` : ""}
						
					</div>
				</div>`);
			showCharacterInfo();
			animateCharacterInfo();
		} catch (e) {
			characterInfoDiv.html(`<p>Error fetching character info: ${e.message}</p>`);
			showCharacterInfo();
		}
		finally {
			loadingSpinner.hide();
		}
	}
});
