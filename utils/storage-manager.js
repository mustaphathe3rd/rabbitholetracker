// utils/storage-manager.js
// A dedicated module for saving aggregated time data to chrome.storage.

/**
 * Saves a record of time spent on a specific domain.
 * It fetches the existing data for the day and increments the totals.
 *
 * @param {string} domain The domain name (e.g., "www.youtube.com").
 * @param {number} activeTimeInSeconds The active time to add.
 * @param {number} idleTimeInSeconds The idle time to add.
 */
export async function saveDomainTime(domain, activeTimeInSeconds, idleTimeInSeconds) {
    if (!domain || (activeTimeInSeconds === 0 && idleTimeInSeconds === 0)) {
        return; // Nothing to save
    }

    try {
        // Use today's date in YYYY-MM-DD format as the storage key
        const today = new Date().toISOString().split('T')[0];

        // 1. Get existing data for today
        const data = await chrome.storage.local.get(today);
        const dayData = data[today] || {};

        // 2. Update the data for the specific domain
        const domainData = dayData[domain] || { activeTime: 0, idleTime: 0 };
        domainData.activeTime += activeTimeInSeconds;
        domainData.idleTime += idleTimeInSeconds;
        dayData[domain] = domainData;

        // 3. Save the updated data back to storage
        await chrome.storage.local.set({ [today]: dayData });

        console.log(`STORAGE_MANAGER: Saved for ${domain} -> Active: ${activeTimeInSeconds}s, Idle: ${idleTimeInSeconds}s`);

    } catch (error) {
        console.error(`STORAGE_MANAGER: Failed to save time record for domain "${domain}"`, error);
    }
}