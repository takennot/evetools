	// second cfg
	const config2 = {
		ESI_USER_AGENT: "SHWRD++ (ruslan.musaev200121@gmail.com)",
		CACHE_FILE: "cache" // This will map to localStorage
	};

	// Helper function to capitalize words
	function capwords(str) {
		return str.replace(/\w\S*/g, function(txt) {
			return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
		});
	}

	// Initialize storage
	const cache = {
		getItem: (key) => JSON.parse(localStorage.getItem(key)),
		setItem: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
		hasKey: (key) => localStorage.getItem(key) !== null,
		removeItem: (key) => localStorage.removeItem(key),
		clear: () => localStorage.clear()
	};
	// func to get json
	async function fetchJSON(url) {
		const response = await fetch(url, { 
			headers: { 
				"User-Agent": config2.ESI_USER_AGENT 
			}
		});
		if (!response.ok){
			throw new Error("Network response was not ok");
		}
		return await response.json();
	}
	async function fetchMarketData() {
		const regionNameInput = document.getElementById('regionName').value;
		const outputElement = document.getElementById('output');
		outputElement.innerHTML = '';

		try {
			const result = await runner(regionNameInput);
			outputElement.innerHTML = result;
		} 
		catch (error) {
			outputElement.innerHTML = `<p>Error: ${error.message}</p>`;
		}
	}

	// get sell orders for items
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
				if (!dicter[entry.type_id]){
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
		} 
		catch (e) {
			console.error("Failed to fetch market data", e);
		}
	}
	// get platinum insurance (highest level, thus highest payout)
	async function getInsurance(cache) {
		try {
			const insuranceEndpoint = "https://esi.evetech.net/latest/insurance/prices/";
			const data = await fetchJSON(insuranceEndpoint);

			const platinumLevels = {};
			data.forEach(val => {
				val.levels.forEach(level => {
				if (level.name === "Platinum") {
					platinumLevels[val.type_id] = level;
				}
				});
			});

			cache.setItem("insurance_data", platinumLevels);
		} 
		catch (e) {
			console.error("Failed to cache insurance data", e);
		}
	}
	// get regions
	async function getRegions(cache) {
		try {
			const regionsEndpoint = "https://esi.evetech.net/latest/universe/regions/";
			const regionIds = await fetchJSON(regionsEndpoint);

			const regions = {};
			const promises = regionIds.map(async (reg) => {
				const regionData = await fetchJSON(`https://esi.evetech.net/latest/universe/regions/${reg}/`);
				regions[regionData.region_id] = regionData.name;
			});

			await Promise.all(promises);
			cache.setItem("regions", regions);
		} 
		catch (e) {
			console.error("Failed to cache regions", e);
		}
	}
	// actual runner function
	async function runner(reg_name) {
		if (!cache.hasKey("insurance_data")) {
			await getInsurance(cache);
		}

		if (!cache.hasKey("regions")) {
			await getRegions(cache);
		}

		const regions = cache.getItem("regions");
		let r_id;

		try {
			// Convert reg_name to lowercase for case-insensitive comparison
			const regNameLower = reg_name.toLowerCase();
			r_id = Object.keys(regions).find(key => regions[key].toLowerCase() === regNameLower);
			if (!r_id){
				throw new Error();
			}
		} 
		catch (e) {
			throw new Error("Unknown Region");
		}

		try {
			await getMarketData(cache, r_id);

			const marketIds = cache.getItem(`${r_id}_market_ids`);
			if (!marketIds || marketIds.length === 0) {
				return "<p>No market data found for the specified region.</p>";
			}

			let profitableFound = false; // bool to track if any profitable ships were found
			let html = "";
			for (const t_id of marketIds) {
				let totalProfit = 0;
				let totalVolumeRemaining = 0;
				let minPrice = 0;
				let maxPrice = 0;

				const cached = cache.getItem(`${r_id}_${t_id}`);
				if (!cached || cached.length === 0) {
					html += `<p>No cached market data for type ID: ${t_id}</p>`;
					continue;
				}

				minPrice = cached[0].price;

				for (const item of cached) {
					let profit = (cache.getItem("insurance_data")[t_id].payout - (item.price + cache.getItem("insurance_data")[t_id].cost));
					profit *= item.volume_remain;
					if (profit > 0) {
						profitableFound = true; // Set bool to true if profitable ship found
						totalProfit += profit;
						totalVolumeRemaining += item.volume_remain;
						maxPrice = item.price;
					} 
					else {
						break;
					}
				}

				if (totalProfit > 0) {
					const typeData = await fetchJSON(`https://esi.evetech.net/latest/universe/types/${t_id}/`);
					html += `<hr><p>Ship: ${typeData.name}</p>`;
					html += `<p>Total Profit: ${totalProfit.toLocaleString()}</p>`;
					html += `<p>Total Volume Remaining: ${totalVolumeRemaining}</p>`;
					html += `<p>Min Price: ${minPrice.toLocaleString()}</p>`;
					html += `<p>Max Price: ${maxPrice.toLocaleString()}</p>`;
				}
			}

			if (!profitableFound) {
				return "<p>No profitable items in this Region</p>";
			}

			return html;
		} 
		catch (e) {
			throw new Error("Failed to get market data");
		}
	}



	// Example usage:
	// runner("the forge");