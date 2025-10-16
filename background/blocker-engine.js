// background/blocker-engine.js (Final version with Offscreen API)
import { getSettings, getDomainDataForToday } from '../utils/storage-manager.js';

let offscreenDocumentPath = 'offscreen/offscreen.html';

/**
 * Manages the offscreen document and plays a sound.
 * @param {string} soundFile - The path to the sound file.
 */
async function playSound(soundFile) {
    // Check if an offscreen document is already active.
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT']
    });

    // If an offscreen document does not exist, create one.
    if (!existingContexts.length) {
        await chrome.offscreen.createDocument({
            url: offscreenDocumentPath,
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'To play a notification sound for time limits.',
        });
    }

    // Send a message to the offscreen document to play the sound.
    chrome.runtime.sendMessage({
        target: 'offscreen-document',
        type: 'play-sound',
        soundFile: soundFile
    });
}

/**
 * Checks if the cumulative time spent on a domain has exceeded the user's limit.
 * @param {string} domain The domain to check.
 */
export async function checkTimeLimits(domain) {
    const settings = await getSettings();
    const timeLimits = settings.timeLimits || {};
    const limitInMinutes = timeLimits[domain] || timeLimits[domain.replace(/^www\./, '')];

    if (!limitInMinutes) return;

    const limitInSeconds = limitInMinutes * 60;
    const domainData = await getDomainDataForToday(domain);
    const totalTimeTodayInSeconds = domainData.totalTime || 0;

    if (totalTimeTodayInSeconds > limitInSeconds) {
        const lastNotified = await chrome.storage.session.get([`notified_${domain}`]);
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);

        if (!lastNotified[`notified_${domain}`] || lastNotified[`notified_${domain}`] < tenMinutesAgo) {
            triggerNotification(domain, limitInMinutes);
            await chrome.storage.session.set({ [`notified_${domain}`]: Date.now() });
        }
    }
}

/**
 * Creates a notification and plays the alert sound.
 * @param {string} domain The domain that exceeded its limit.
 * @param {number} limitInMinutes The configured time limit.
 */
async function triggerNotification(domain, limitInMinutes) {
    // Play the alert sound using the new offscreen document method.
    await playSound('assets/sounds/alert.mp3');
    
    const notificationId = `limit-exceeded-${domain}`;
    chrome.notifications.create(notificationId, {
        type: 'basic',
        iconUrl: '../assets/icons/icon128.png',
        title: 'Time Limit Exceeded',
        message: `You've spent more than your daily limit of ${limitInMinutes} minutes on ${domain}.`,
        priority: 2
    });
}