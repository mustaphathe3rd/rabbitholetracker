// background/service-worker.js
/**
 * @file This script is the main entry point and central orchestrator for all background tasks in the extension.
 * It listens for core browser events (like tab changes and window focus) and messages from other parts of
 * the extension (the popup and content scripts). It then delegates the required tasks to the appropriate
 * specialized modules (time-tracker, session-manager, report-generator, etc.).
 */

// --- Module Imports ---
// Imports the core functions from our specialized background modules.
import { initialize as initializeTimeTracker, trackTab } from './time-tracker.js';
import { addPageVisitToSession } from './session-manager.js';
import { generateSessionReport } from './report-generator.js';

console.log("Rabbithole Insight Engine: Service Worker starting up...");

// --- Main Initialization ---

/**
 * This listener runs once when the extension is first installed or updated to a new version.
 * It's the perfect place to set up initial configurations and state.
 */
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated.");
    // We initialize the time tracker to set up its idle detection listener.
    initializeTimeTracker();
});

/**
 * This listener runs every time the browser is started.
 * We re-initialize the time tracker to ensure idle detection is active from the very beginning of a browser session.
 */
chrome.runtime.onStartup.addListener(() => {
    console.log("Browser startup.");
    initializeTimeTracker();
});

// --- Tab Event Listeners ---
// These listeners are the heart of the activity tracking engine, providing the raw signals for user navigation.

/**
 * Fired when the user physically switches to a different tab. This is the most direct signal of a change in focus.
 */
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        // We get the full tab object to access its URL and title.
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab) {
            // Pass the newly active tab to the time tracker module to start a new timing session.
            trackTab(tab);
        }
    } catch (error) {
        // This catch block handles rare edge cases where the tab might be closed before we can get its info.
        console.warn(`Could not get tab info for tabId ${activeInfo.tabId}:`, error);
    }
});

/**
 * Fired when a tab's properties are updated, most importantly when its URL changes due to navigation.
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // We are only interested in the event when the page has finished loading (`status === 'complete'`)
    // to ensure we capture the final, correct URL and title.
    if (changeInfo.status === 'complete') {
        // We must also verify that this updated tab is the one the user is currently looking at.
        // This prevents tracking of background tabs that might be auto-refreshing.
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0 && activeTabs[0].id === tabId) {
            trackTab(tab);
        }
    }
});

/**
 * Fired when the user focuses on a Chrome window (e.g., switching back from another application).
 */
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    // A windowId of -1 (WINDOW_ID_NONE) means the user has switched away from all Chrome windows.
    // That "pause" state is handled by the time-tracker's idle detection. Here, we only care when they return.
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        // Find the active tab in the newly focused window and start/resume tracking it.
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0) {
            trackTab(activeTabs[0]);
        }
    }
});

// --- Message Listener ---
// This acts as a central communication hub for receiving messages from the popup UI and content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Case 1: Received enriched data (title, AI topics) from a content script.
    if (message.type === 'PAGE_DATA') {
        // Pass this data to the session manager for further processing and analysis.
        addPageVisitToSession(message.payload);
    } 
    // Case 2: Received a command from the popup to generate a session report.
    else if (message.type === 'GENERATE_SESSION_REPORT') {
        // We call the async report generation function. When it completes, we send a "done" response.
        generateSessionReport().then(() => {
            sendResponse({ status: "done" });
        });
    }

    // Crucially, we return `true` to indicate that `sendResponse` will be called asynchronously.
    // This keeps the message channel open until the async operation (like report generation) is complete.
    return true;
});

// --- Initial Tracking ---
/**
 * This function runs when the service worker first starts up. Its purpose is to immediately
 * identify and start tracking the currently active tab. This prevents a "cold start" where
 * no tracking would occur until the user first switches tabs.
 */
async function initializeCurrentTab() {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTabs.length > 0) {
        trackTab(activeTabs[0]);
    }
}

// Kick off the initial tracking as soon as the service worker script is loaded.
initializeCurrentTab();