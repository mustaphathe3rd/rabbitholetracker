// background/time-tracker.js
/**
 * @file This module is the core engine for measuring time spent on web pages.
 * It handles the logic for starting and stopping timers, detecting when the user is idle
 * versus active, and orchestrating the saving of time records to permanent storage.
 */

// Imports functions from other modules to delegate tasks.
import { addPageVisitToSession } from './session-manager.js';
import { saveTimeRecord } from '../utils/storage-manager.js';
import { checkTimeLimits } from './blocker-engine.js';

/**
 * A state object that holds the details of the currently active tab being timed.
 * It is exported so other modules can access live, unsaved data if needed.
 * This object acts as the module's "memory" for the current tracking activity.
 */
export let activeTabInfo = {
    tabId: null,
    url: null,
    startTime: null
};

/**
 * Stops the timer for the currently active tab, calculates the elapsed duration,
 * saves the record to storage, and triggers a check against user-set time limits.
 * This function is async because it must wait for storage operations to complete.
 */
async function stopTracking() {
    // If there's no active timer running, there's nothing to stop.
    if (!activeTabInfo.startTime) return;

    const endTime = Date.now();
    const timeSpentInSeconds = Math.round((endTime - activeTabInfo.startTime) / 1000);

    // Only save meaningful durations (e.g., more than 1 second) to avoid polluting storage with brief visits.
    if (timeSpentInSeconds > 1) {
        // Store the URL in a local variable before resetting the state to prevent a race condition.
        const urlToSave = activeTabInfo.url;
        
        // a. Save the time record to permanent storage (`chrome.storage.local`) for long-term analysis.
        await saveTimeRecord(urlToSave, timeSpentInSeconds);

        // b. After saving, check if the new total time for this domain exceeds any user-defined limits.
        try {
            const domain = new URL(urlToSave).hostname;
            await checkTimeLimits(domain);
        } catch (error) {
            console.error("TIME_TRACKER: Error checking time limits", error);
        }
    }
    
    // Reset the state object to be ready for the next tab/activity.
    activeTabInfo = { tabId: null, url: null, startTime: null };
}

/**
 * Starts a new time tracking session for a given tab. This function is the primary
 * entry point for this module and is called by the main service worker's event listeners.
 * @param {object} tab The full Chrome tab object to start tracking.
 */
export function trackTab(tab) {
    // Always stop the previous timer before starting a new one.
    // We use .then() to ensure the async `stopTracking` function fully completes before we proceed.
    stopTracking().then(() => {
        // Only track valid web pages (i.e., ignore chrome:// pages, file:// pages, etc.).
        if (tab && tab.id && tab.url && tab.url.startsWith('http')) {
            // Set the new active tab info and record the start time.
            activeTabInfo = {
                tabId: tab.id,
                url: tab.url,
                startTime: Date.now()
            };
            
            // Immediately send basic page data to the session manager.
            // This is a crucial step to ensure no page visit is missed, even if the
            // content script is slow to load or fails to send its richer data.
            const basicPageData = {
                url: tab.url,
                title: tab.title || 'Loading...' // Use the tab's title as a fallback.
            };
            addPageVisitToSession(basicPageData);
        }
    });
}

/**
 * Initializes the time tracker module. This is called once by the service worker
 * when the extension is installed or the browser starts. Its main purpose is to
 * set up the idle state listener.
 */
export function initialize() {
    // Set the idle detection threshold. The minimum allowed value by Chrome is 15 seconds.
    chrome.idle.setDetectionInterval(15);

    // This listener fires whenever the user's system state changes between 'active', 'idle', or 'locked'.
    chrome.idle.onStateChanged.addListener((newState) => {
        if (newState === 'active') {
            // The user has returned to their computer. Find the currently active tab and restart the timer for it.
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    trackTab(tabs[0]);
                }
            });
        } else {
            // The user is 'idle' or has 'locked' the screen. Stop the timer to pause tracking.
            stopTracking();
        }
    });
}