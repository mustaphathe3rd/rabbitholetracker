/**
 * Saves a record of time spent on a specific URL.
 * It aggregates time by domain for a given day.
 *
 * @param {string} url The full URL of the page.
 * @param {number} timeSpentInSeconds The duration of the visit in seconds.
 */
export async function saveTimeRecord(url, timeSpentInSeconds) {
    if (!url || !url.startsWith('http')) {
        return; // Ignore internal chrome pages or invalid URLs
    }

    try {
        const urlObject = new URL(url);
        const domain = urlObject.hostname;

        // Use today's date in YYYY-MM-DD format as the storage key
        const today = new Date().toISOString().split('T')[0];

        // 1. Get existing data for today
        const data = await chrome.storage.local.get(today);
        const dayData = data[today] || {};

        // 2. Update the data for the specific domain
        const domainData = dayData[domain] || { totalTime: 0, pages: {} };
        domainData.totalTime += timeSpentInSeconds;
        domainData.pages[url] = (domainData.pages[url] || 0) + timeSpentInSeconds;
        dayData[domain] = domainData;

        // 3. Save the updated data back to storage
        await chrome.storage.local.set({ [today]: dayData });

        console.log(`STORAGE_MANAGER: Saved ${timeSpentInSeconds}s for ${domain}`);

    } catch (error) {
        console.error(`STORAGE_MANAGER: Failed to save time record for URL "${url}"`, error);
    }
}

/**
 * Saves the user's settings to chrome.storage.local.
 * @param {object} settings - The settings object to save.
 */
export async function saveSettings(settings) {
    try {
        await chrome.storage.local.set({ settings: settings });
        console.log("STORAGE_MANAGER: Settings saved", settings);
    } catch (error) {
        console.error("STORAGE_MANAGER: Error saving settings", error);
    }
}

/**
 * Retrieves the user's settings from chrome.storage.local.
 * @returns {Promise<object>} - A promise that resolves to the settings object.
 */
export async function getSettings() {
    try {
        const data = await chrome.storage.local.get('settings');
        // Return the settings object, or a default empty object if none are found.
        return data.settings || {};
    } catch (error) {
        console.error("STORAGE_MANAGER: Error getting settings", error);
        return {}; // Return default on error
    }
}

/**
 * Retrieves all data for a specific domain for today.
 * @param {string} domain The domain to retrieve data for.
 * @returns {Promise<object>} The data object for that domain.
 */
export async function getDomainDataForToday(domain) {
    try {
        const today = new Date().toISOString().split('T')[0];
        const data = await chrome.storage.local.get(today);
        const dayData = data[today] || {};
        return dayData[domain] || { totalTime: 0, pages: {} };
    } catch (error) {
        console.error(`STORAGE_MANAGER: Failed to get data for domain "${domain}"`, error);
        return { totalTime: 0, pages: {}};
    }
}

/**
 * Retrieves all browsing data from the last N days.
 * @param {number} days - The number of days of data to retrieve.
 * @returns {Promise<object>} - An object containing data for the requested days.
 */
export async function getLastDaysData(days = 7) {
    const dateKeys = [];
    for (let i =0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dateKeys.push(date.toISOString().split('T')[0]);
    }
    try {
        return await chrome.storage.local.get(dateKeys);
    } catch (error) {
        console.error("STORAGE_MANAGER: Error getting last days data", error);
        return {};
    }
}

/**
 * Saves the AI-generated weekly report to storage.
 * @param {string} reportText - The report content.
 */
export async function saveWeeklyReport(reportText) {
    const reportData = {
        text: reportText,
        generatedDate: new Date().toISOString().split('T')[0]
    };
    await chrome.storage.local.set({ weeklyReport: reportData });
}

/**
 * Retrieves the saved weekly report from storage.
 * @returns {Promise<object|null>} - The report object or null if not found.
 */
export async function getWeeklyReport() {
    const data = await chrome.storage.local.get('weeklyReport');
    return data.weeklyReport || null;
}