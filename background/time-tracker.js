// background/time-tracker.js
// Handles precise time measurement, including active vs. idle detection.

// --- NEW: Import the session manager ---
import { addPageVisitToSession } from './session-manager.js';
import { saveTimeRecord } from '../utils/storage-manager.js';

// This object holds the state of the currently tracked tab.
let activeTabInfo = {
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

    // Only save meaningful durations (e.g., more than 1 second)
    if (timeSpentInSeconds > 1) {
        console.log(`TIME_TRACKER: Stopping track for ${activeTabInfo.url}. Time spent: ${timeSpentInSeconds}s`);
        await saveTimeRecord(activeTabInfo.url, timeSpentInSeconds);
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