// background/time-tracker.js
// This module is the core engine for measuring time spent on web pages.
// It handles starting and stopping timers, detecting user idle state, and
// saving the final time records to permanent storage.

import { addPageVisitToSession } from "./session-manager";
import { saveTimeRecord } from "../utils/storage-manager.js";
import { checkTimeLimits } from "./blocker-engine.js";

// This state object holds the details of the currently active tab being timed.
// It's exported so other modules (like weekly-reporter) can access live, unsaved data.
export let activeTabInfo = {
    tabId: null,
    url: null,
    startTime: null
};

/**
 * Stops the timer for the currently active tab, calculates the duration,
 * saves the record to storage, and triggers a check against user-set tome limits.
 */
async function stopTracking() {
    // If there's no active timer, do nothing.
    if (!activeTabInfo.startTime) return;

    const endTime = Date.now();
    const timeSpentInSeconds = Math.round((endTime - activeTabInfo.startTime) / 1000);

    // Only save meaningful durations (e.g., more than 1 second).
    if (timeSpentInSeconds > 1) {
        // Store the URL in a local variable before resetting the state,to avoid a race condition.
        const urlToSave = activeTabInfo.url;

        // a. Save the time record to permanent storage for long-term analysis.
        await saveTimeRecord(urlToSave, timeSpentInSeconds);

        //b. Check if the new total time exceeds any user-defined limits.
        try {
            const domain = new URL(urlToSave).hostname;
            await checkTimeLimits(domain);
        } catch (error) {
            console.error("TIME_TRACKER: Error checking time limits:", error);
        }
    }

    // Reset the state to be ready for the next tab.
    activeTabInfo = {tabId: null, url: null, startTime: null};
}

/**
 * Starts a new time tracking session for a give tab.
 * This is the main entry point for this module, called by the service worker.
 * @param {object} tab The Chrome tab object to start tracking.
 */
export function trackTab(tab) {
    // Always stop the previous timer before starting a new one.
    // We use .then() to ensure `stopTracking` completes before the new tracking begins
    stopTracking().then(() => {
        // Only track valid web pages (i.e., ignpore chrome:// pages, etc.).
        if (tab && tab.id && tab.url && tab.url.startsWith('http')) {
            activeTabInfo = {
                tabId: tab.id,
                url: tab.url,
                startTime: Date.now()
            };

            // Immediately send basic page data to the session manager.
            // This ensures no page visit is missed, even if the content script is slow to load.
            const basicPageData = {
                url: tab.url,
                title: tab.title || 'Loading...'
            };
            addPageVisitToSession(basicPageData);
        }
    });
}

/**
 * Initializes the module by setting up the idle state listener.
 * This is called once by the service worker when the extension starts.
 */
export function initialize() {
    // Set the idle detection threshold. The minimum is 15 seconds.
    chrome.idle.setDetectionInterval(15);

    // This listener fires whenever the user's system state changes between active,idle, or locked.
    chrome.idle.onStateChanged.addListener((newState) => {
        if (newState === 'active') {
            // The user has returned. Find the currently active tab and restart the timer.
            chrome.tabs.query({ active: true, currentWindow: true}, (tabs) => {
                if (tabs[0]) {
                    trackTab(tabs[0]);
                }
            });
        } else {
            // The user is idle or has locked the screen. Stop the timer to pause tracking.
            stopTracking();
        }
    });
}