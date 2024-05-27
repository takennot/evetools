$(document).ready(function() {
	// start setup, hiding stuff
	$("#navheader").hide().slideDown(1000);

	const statusElement = $("#status");
	statusElement.hide();

	const loadingSpinner = $("#loadingSpinner");
	loadingSpinner.hide();

	const config2 = {
		ESI_USER_AGENT: "SHWRD++ (ruslan.musaev200121@gmail.com)",
		CACHE_FILE: "cache"
	};

	const cache = {
		getItem: (key) => JSON.parse(localStorage.getItem(key)), // get item & parse it
		setItem: (key, value) => localStorage.setItem(key, JSON.stringify(value)), // Stringify & set item
		hasKey: (key) => localStorage.getItem(key) !== null, // Check if item exists
		removeItem: (key) => localStorage.removeItem(key), // Remove item
		clear: () => localStorage.clear() // Clear all local storage
	};

	// function for getting JSONs from EVE's ESI
	async function fetchJSON(url) {
		const response = await fetch(url, { 
			headers: { 
				"User-Agent": config2.ESI_USER_AGENT 
			}
		});
		if (!response.ok) {
			throw new Error("Network response was not ok");
		}
		return await response.json();
	}

	// get market data based on the region input
	async function fetchMarketData() {
		const regionNameInput = $("#regionName").val();
		const outputElement = $("#output");
		statusElement.hide();
		outputElement.fadeOut();
		loadingSpinner.show();

		try {
			await runner(regionNameInput);
			outputElement.fadeIn();
		} catch (error) {
			statusElement.show().text("Error: " + error.message);
		} finally {
			loadingSpinner.hide();
		}
	}

	// get market data from the ESI and cache it
	async function getMarketData(cache, r_id) {
		try {
			const marketEndpoint = `https://esi.evetech.net/latest/markets/${r_id}/orders/?order_type=sell`;
			const response = await fetch(marketEndpoint, { method: "HEAD" });
			const numberOfPages = response.headers.get("x-pages");

			let marketData = [];
			for (let page = 1; page <= numberOfPages; page++) {
				const pageData = await fetchJSON(`https://esi.evetech.net/latest/markets/${r_id}/orders/?order_type=sell&page=${page}`);
				marketData = marketData.concat(pageData);
			}

			if (cache.hasKey("insurance_data")) {
				const data = cache.getItem("insurance_data");
				const dicter = {};
				const typeIds = Object.keys(data);
				marketData.forEach(entry => {
					if (typeIds.includes(entry.type_id.toString())) {
						if (!dicter[entry.type_id]) {
							dicter[entry.type_id] = [];
						}
						dicter[entry.type_id].push(entry);
					}
				});

				const marketIds = Object.keys(dicter);
				cache.setItem(`${r_id}_market_ids`, marketIds);

				marketIds.forEach(m_id => {
					const sortedId = dicter[m_id].sort((a, b) => a.price - b.price);
					cache.setItem(`${r_id}_${m_id}`, sortedId);
				});
			}
		} catch (e) {
			console.error("Failed to fetch market data", e);
		}
	}

	// get insurance data and cache it
	async function getInsurance(cache) {
		try {
			const insuranceEndpoint = "https://esi.evetech.net/latest/insurance/prices/";
			const data = await fetchJSON(insuranceEndpoint);

			const platinumLevels = {};
			data.forEach(val => {
				val.levels.forEach(level => {
					if (level.name === "Platinum") {
						platinumLevels[val.type_id] = level; // Store only Platinum insurance levels
					}
				});
			});

			cache.setItem("insurance_data", platinumLevels);
		} catch (e) {
			console.error("Failed to cache insurance data", e);
		}
	}

	// get region data and cache it
	async function getRegions(cache) {
		try {
			const regionsEndpoint = "https://esi.evetech.net/latest/universe/regions/";
			const regionIds = await fetchJSON(regionsEndpoint);

			const regions = {};
			const promises = regionIds.map(async (reg) => {
				const regionData = await fetchJSON(`https://esi.evetech.net/latest/universe/regions/${reg}/`);
				regions[regionData.region_id] = regionData.name; // Map region ID to region name
			});

			await Promise.all(promises);
			cache.setItem("regions", regions);
		} catch (e) {
			console.error("Failed to cache regions", e);
		}
	}

	// get system name by system ID
	async function getSystemName(systemId) {
		const systemData = await fetchJSON(`https://esi.evetech.net/latest/universe/systems/${systemId}/`);
		return systemData.name;
	}

	// Main function
	async function runner(reg_name) {
		statusElement.hide();
		if (!cache.hasKey("insurance_data")) {
			await getInsurance(cache);
		}

		if (!cache.hasKey("regions")) {
			await getRegions(cache);
		}

		const regions = cache.getItem("regions");
		let r_id;

		try {
			const regNameLower = reg_name.toLowerCase();
			r_id = Object.keys(regions).find(key => regions[key].toLowerCase() === regNameLower);
			if (!r_id) {
				throw new Error();
			}
		} catch (e) {
			throw new Error("Unknown Region");
		}

		try {
			await getMarketData(cache, r_id);

			const marketIds = cache.getItem(`${r_id}_market_ids`);
			if (!marketIds || marketIds.length === 0) {
				statusElement.show();
				statusElement.text("No market data found for the specified region.");
				return;
			}

			let mostProfitableShip = null;
			let highestProfit = 0;

			// Loop through market IDs to find the most profitable ship
			for (const t_id of marketIds) {
				let totalProfit = 0;
				let totalVolumeRemaining = 0;
				let minPrice = 0;
				let maxPrice = 0;
				let systemId = null;

				const cached = cache.getItem(`${r_id}_${t_id}`);
				if (!cached || cached.length === 0) {
					statusElement.show();
					statusElement.text("No cached market data for type ID: " + t_id);
					continue;
				}

				minPrice = cached[0].price;

				// Calculate total profit for the current ship
				for (const item of cached) {
					let profit = (cache.getItem("insurance_data")[t_id].payout - (item.price + cache.getItem("insurance_data")[t_id].cost));
					profit *= item.volume_remain;
					if (profit > 0) {
						totalProfit += profit;
						totalVolumeRemaining += item.volume_remain;
						maxPrice = item.price;
						systemId = item.system_id;
					} else {
						break;
					}
				}

				// Update the most profitable ship if the current one is more profitable
				if (totalProfit > highestProfit) {
					highestProfit = totalProfit;
					mostProfitableShip = {
						type_id: t_id,
						totalProfit,
						totalVolumeRemaining,
						minPrice,
						maxPrice,
						systemId
					};
				}
			}

			// Display ship info
			if (mostProfitableShip) {
				const { type_id, totalProfit, totalVolumeRemaining, minPrice, maxPrice, systemId } = mostProfitableShip;
				const shipIconUrl = `https://images.evetech.net/types/${type_id}/render`;
				const typeData = await fetchJSON(`https://esi.evetech.net/latest/universe/types/${type_id}/`);
				const systemName = await getSystemName(systemId);

				$("#shipImg").attr("src", shipIconUrl).attr("alt", typeData.name + " icon");
				$(".shipName").text("Ship: " + typeData.name);
				$(".totalProfit").text("Total Profit: " + totalProfit.toLocaleString());
				$(".volumeRemaining").text("Total Volume Remaining: " + totalVolumeRemaining);
				$(".minPrice").text("Min Price: " + minPrice.toLocaleString());
				$(".maxPrice").text("Max Price: " + maxPrice.toLocaleString());
				$(".systemName").text("System: " + systemName);
			} else {
				statusElement.show();
				statusElement.text("No profitable items in this Region");
			}
		} catch (e) {
			throw new Error("Failed to get market data");
		}
	}

	$("#fetchButton").click(fetchMarketData);
});
