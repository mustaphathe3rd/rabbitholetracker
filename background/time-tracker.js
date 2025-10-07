// background/time-tracker.js
// Handles precise time measurement, including active vs. idle detection.

// --- NEW: Import the session manager ---
import { addPageVisitToSession } from './session-manager.js';
import { saveTimeRecord } from '../utils/storage-manager.js';
import { checkTimeLimits } from './blocker-engine.js';

// This object holds the state of the currently tracked tab.
export let activeTabInfo = {
    tabId: null,
    url: null,
    startTime: null
};

/**
 * Stops the timer for the currently active tab and saves the duration.
 * This is an async function because it waits for the data to be saved.
 */
async function stopTracking() {
    if (!activeTabInfo.startTime) return;

    const endTime = Date.now();
    const timeSpentInSeconds = Math.round((endTime - activeTabInfo.startTime) / 1000);

    if (timeSpentInSeconds > 1) {
        const urlToSave = activeTabInfo.url; // Save before it gets reset
        console.log(`TIME_TRACKER: Stopping track for ${urlToSave}. Time spent: ${timeSpentInSeconds}s`);
        await saveTimeRecord(urlToSave, timeSpentInSeconds);

        // --- NEW: CHECK TIME LIMITS AFTER SAVING ---
        try {
            const domain = new URL(urlToSave).hostname;
            await checkTimeLimits(domain);
        } catch (error) {
            console.error("TIME_TRACKER: Error checking time limits", error);
        }
        // --- END OF NEW LOGIC ---
    }
    
    // Reset the tracker state
    activeTabInfo = { tabId: null, url: null, startTime: null };
}

/**
 * Starts the timer for a new tab. This is called by the tab-tracker.
 * It implicitly stops any previously running timer.
 * @param {object} tab The Chrome tab object to start tracking.
 */
export function trackTab(tab) {
    // Stop tracking the previous tab first.
    stopTracking().then(() => {
        // Start tracking the new tab if it's a valid web page
        if (tab && tab.id && tab.url && tab.url.startsWith('http')) {
            activeTabInfo = {
                tabId: tab.id,
                url: tab.url,
                startTime: Date.now()
            };
            console.log(`TIME_TRACKER: Started tracking ${activeTabInfo.url}`);
            
            // --- NEW: Immediately update the session with basic info ---
            // We create a basic pageData object here. The content script will
            // send a richer version later, but this ensures no visit is ever missed.
            const basicPageData = {
                url: tab.url,
                title: tab.title || 'Loading...' // Use tab title as a fallback
            };
            addPageVisitToSession(basicPageData);
        }
    });
}

/**
 * Initializes the time tracker module, setting up the idle state listener.
 * This is called once by the main service worker.
 */
export function initialize() {
    // The minimum interval for idle detection is 15 seconds.
    chrome.idle.setDetectionInterval(15);

    chrome.idle.onStateChanged.addListener((newState) => {
        console.log(`IDLE_STATE: Changed to ${newState}`);
        if (newState === 'active') {
            // User is back. Find the current tab and restart the timer.
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    trackTab(tabs[0]);
                }
            });
        } else {
            // User is idle or has locked the screen. Stop the timer.
            stopTracking();
        }
    });

    console.log("TIME_TRACKER: Module initialized.");
}