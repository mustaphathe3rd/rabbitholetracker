// background/service-worker.js
// This script is the main entry point and central orchestrator for all background tasks in the extension.
// It listens for browser events (like tab changes) and messages from other parts of the extension,
// then delegates tasks to the appropriate modules (time-tracker, session-manager, etc.).

import { initialize as initializeTimeTracker, trackTab } from './time-tracker.js';
import { addPageVisitToSession } from './session-manager.js';
import { generateSessionReport } from './report-generator.js'; 

console.log("Rabbithole Insight Engine: Service Worker starting up...");

// --- Main Initialization ---

// This listener runs once when the extension is first installed or updated to a new version.
// It's the perfect place to set up initial configurations.
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated.");
    initializeTimeTracker();
});

// This listener runs every time the browser is started.
// We re-initialize the time tracker to ensure idle detection is active.
chrome.runtime.onStartup.addListener(() => {
    console.log("Browser startup.");
    initializeTimeTracker();
});


// --- Tab Event Listeners ---
// These listeners form the core of the activity tracking engine.

// Fired when the user switches to a different tab.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        // We get the full tab object to access its URL and title.
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab) {
            // Pass the new active tab to the time tracker to start a new timing session.
            trackTab(tab);
        }
    } catch (error) {
        // This catch block handles cases where the tab might be closed before we can get its info.
        console.warn(`Could not get tab info for tabId ${activeInfo.tabId}:`, error);
    }
});

// Fired when a tab's properties are updated, such as when the URL changes.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // We only care about the page being fully loaded to get the final URL and title.
    if (changeInfo.status === 'complete') {
        // We also check if this updated tab is the one the user is currently looking at.
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0 && activeTabs[0].id === tabId) {
            trackTab(tab);
        }
    }
});

// Fired when the user focuses on a Chrome window (e.g., switching from another application).
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    // A windowId of -1 (WINDOW_ID_NONE) means the user has switched away from all Chrome windows.
    // We handle this in the time-tracker's idle detection. Here, we only care when they come back.
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        // Find the active tab in the newly focused window and start tracking it.
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0) {
            trackTab(activeTabs[0]);
        }
    }
});

// --- Message Listener ---
// This acts as a central communication hub for messages from the popup and content scripts.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PAGE_DATA') {
        // Received enriched data (title, AI topics) from the content script.
        // Pass this data to the session manager for processing.
        addPageVisitToSession(message.payload);
    } else if (message.type === 'GENERATE_SESSION_REPORT') {
        // Received a command from the popup to generate a session report.
        // We call the async function and then send a response when it's done.
        generateSessionReport().then(() => {
            sendResponse({ status: "done" });
        });
    }
    // Return true to indicate that we will send a response asynchronously.
    // This keeps the message channel open until sendResponse() is called.
    return true; 
});

// --- Initial Tracking ---
// This function runs when the service worker starts up to immediately identify and
// track the currently active tab, preventing a "cold start" where no tracking occurs.
async function initializeCurrentTab() {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTabs.length > 0) {
        trackTab(activeTabs[0]);
    }
}

// Kick off the initial tracking when the script first loads.
initializeCurrentTab();