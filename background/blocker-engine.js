// background/blocker-engine.js (FINAL VERSION)
// Enforces user-defined time limits with robust domain matching.

import { getSettings, getDomainDataForToday } from '../utils/storage-manager.js';

/**
 * Checks if the time spent on a domain has exceeded the user's limit.
 * @param {string} domain The domain to check (e.g., "www.youtube.com").
 */
export async function checkTimeLimits(domain) {
    console.log(`[BLOCKER] Starting check for domain: "${domain}"`);

    const settings = await getSettings();
    const timeLimits = settings.timeLimits || {};

    // --- THIS IS THE FIX ---
    // Try to find a limit by matching the exact domain first (e.g., 'www.youtube.com'),
    // and if that fails, try matching the domain without the 'www.' prefix (e.g., 'youtube.com').
    const limitInMinutes = timeLimits[domain] || timeLimits[domain.replace(/^www\./, '')];
    // --- END OF FIX ---

    if (!limitInMinutes) {
        console.log(`[BLOCKER] No limit found for "${domain}".`);
        return;
    }
    console.log(`[BLOCKER] Found limit for "${domain}": ${limitInMinutes} minute(s).`);

    const limitInSeconds = limitInMinutes * 60;
    const domainData = await getDomainDataForToday(domain);
    
    const totalTimeTodayInSeconds = domainData.totalTime || 0;
    console.log(`[BLOCKER] Comparing Total Time (${totalTimeTodayInSeconds}s) > Limit (${limitInSeconds}s)`);

    if (totalTimeTodayInSeconds > limitInSeconds) {
        console.log("[BLOCKER] CONDITION MET! Triggering notification.");
        triggerNotification(domain, limitInMinutes);
    } else {
        console.log("[BLOCKER] Condition not met.");
    }
}

function triggerNotification(domain, limitInMinutes) {
    const notificationId = `limit-exceeded-${domain}`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: '../assets/icons/icon128.png',
        title: 'Time Limit Exceeded',
        message: `You've spent more than your daily limit of ${limitInMinutes} minutes on ${domain}.`,
        priority: 2
    });
    console.log(`[BLOCKER] Notification triggered for ${domain}`);
}