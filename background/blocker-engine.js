// background/blocker-engine.js
/**
 * @file This module serves as the rule enforcement engine for the extension.
 * Its primary responsibility is to check a user's browsing time against the daily
 * limits they have configured in the options page. It is designed to be called
 * from the time-tracker module every time a browsing period for a specific site concludes.
 */

// Imports functionality from the storage manager to get user settings and daily browsing data.
import { getSettings, getDomainDataForToday } from '../utils/storage-manager.js';

/**
 * Checks if the cumulative time spent on a given domain for the current day has exceeded
 * the user's defined limit. If the limit is surpassed, it triggers a system notification.
 * This is an async function because it needs to retrieve data from the asynchronous
 * chrome.storage API.
 *
 * @param {string} domain The full domain to check (e.g., "www.youtube.com").
 */
export async function checkTimeLimits(domain) {
    // 1. Retrieve the user's saved settings from persistent storage.
    const settings = await getSettings();
    const timeLimits = settings.timeLimits || {};

    // 2. Perform a robust lookup for the domain's time limit.
    // This is a key piece of logic to improve user experience, as a user might type
    // 'youtube.com' in the settings, but the browser reports the domain as 'www.youtube.com'.
    // This check handles both cases by first trying an exact match, and if that fails,
    // it tries again after stripping the 'www.' prefix from the domain.
    const limitInMinutes = timeLimits[domain] || timeLimits[domain.replace(/^www\./, '')];

    // If no limit is configured for this domain, there's nothing more to do.
    if (!limitInMinutes) {
        return;
    }

    // 3. Convert the limit to seconds and retrieve today's total time for the domain.
    const limitInSeconds = limitInMinutes * 60;
    const domainData = await getDomainDataForToday(domain);
    const totalTimeTodayInSeconds = domainData.totalTime || 0;

    // 4. Compare the total time spent against the configured limit.
    if (totalTimeTodayInSeconds > limitInSeconds) {
        // If the time spent is greater than the limit, trigger the notification.
        triggerNotification(domain, limitInMinutes);
    }
}

/**
 * Creates and displays a standard Chrome system notification to alert the user.
 * This function is internal to the blocker-engine module.
 *
 * @param {string} domain The domain that has exceeded its time limit.
 * @param {number} limitInMinutes The time limit in minutes that was surpassed.
 */
function triggerNotification(domain, limitInMinutes) {
    // A unique ID is used for the notification. If a notification with the same ID
    // is created again, Chrome will update the existing one instead of creating a new one,
    // which prevents notification spam for the same domain.
    const notificationId = `limit-exceeded-${domain}`;
    
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: '../assets/icons/icon128.png', // Main extension icon.
        title: 'Time Limit Exceeded',
        message: `You've spent more than your daily limit of ${limitInMinutes} minutes on ${domain}.`,
        priority: 2 // Sets the notification priority to high.
    });
}