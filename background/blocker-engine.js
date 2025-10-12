// background/blocker-engine.js
// This module is responsible for enforcing the daily time limits set by the user in the options page.
// It checks the cumulative time spent on a domain against its configured limit.

import { getSettings, getDomainDataForToday } from '../utils/storage-manager.js';

/**
 * Checks if the cumulative time spent on a given domain today has exceeded the user's defined limit.
 * This function is called every time a tracking session for a domain ends.
 * @param {string} domain The domain to check (e.g., "www.youtube.com").
 */
export async function checkTimeLimits(domain) {
    // 1. Retrieve the user's saved settings from storage.
    const settings = await getSettings();
    const timeLimits = settings.timeLimits || {};

    // 2. Perform a robust lookup for the domain's time limit.
    // This handles cases where a user enters 'youtube.com' but visits 'www.youtube.com'.
    // It first checks for an exact match, then checks for a match without the 'www.' prefix.
    const limitInMinutes = timeLimits[domain] || timeLimits[domain.replace(/^www\./, '')];

    // If no limit is set for this domain or its base domain, exit the function.
    if (!limitInMinutes) {
        return;
    }

    // 3. Retrieve the total time spent on this domain for today.
    const limitInSeconds = limitInMinutes * 60;
    const domainData = await getDomainDataForToday(domain);
    const totalTimeTodayInSeconds = domainData.totalTime || 0;

    // 4. Compare the time spent against the limit and trigger a notification if exceeded.
    if (totalTimeTodayInSeconds > limitInSeconds) {
        triggerNotification(domain, limitInMinutes);
    }
}

/**
 * Creates and displays a standard Chrome notification to alert the user.
 * @param {string} domain The domain that exceeded its limit.
 * @param {number} limitInMinutes The configured time limit in minutes.
 */
function triggerNotification(domain, limitInMinutes) {
    // Use a unique ID to prevent multiple identical notifications from stacking.
    const notificationId = `limit-exceeded-${domain}`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: '../assets/icons/icon128.png',
        title: 'Time Limit Exceeded',
        message: `You've spent more than your daily limit of ${limitInMinutes} minutes on ${domain}.`,
        priority: 2
    });
}