// utils/storage-manager.js
// A dedicated module for all interactions with chrome.storage.

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