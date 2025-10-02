// background/service-worker.js
// This is the main entry point that orchestrates all other background modules.

// --- Import our modules ---
import { initialize as initializeTimeTracker, trackTab } from './time-tracker.js';
import { addPageVisitToSession } from './session-manager.js';

console.log("Rabbithole Insight Engine: Service Worker starting up...");

// --- Main Initialization ---

// This event fires when the extension is first installed or updated.
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed or updated.");
    initializeTimeTracker();
});

// This event fires when Chrome starts up.
chrome.runtime.onStartup.addListener(() => {
    console.log("Browser startup.");
    initializeTimeTracker();
});


// --- Tab Event Listeners ---
// This is the crucial part that was missing.

// Fired when the user switches to a different tab.
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab) {
            trackTab(tab);
        }
    } catch (error) {
        console.warn(`Could not get tab info for tabId ${activeInfo.tabId}:`, error);
    }
});

// Fired when a tab is updated (e.g., the URL changes).
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    // We only care about the page being fully loaded.
    if (changeInfo.status === 'complete') {
        // We also need to check if this tab is the currently active one.
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0 && activeTabs[0].id === tabId) {
            trackTab(tab);
        }
    }
});

// Fired when the user focuses on a Chrome window.
chrome.windows.onFocusChanged.addListener(async (windowId) => {
    if (windowId !== chrome.windows.WINDOW_ID_NONE) {
        const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTabs.length > 0) {
            trackTab(activeTabs[0]);
        }
    }
});

// --- Message Listener from Content Scripts ---
// This is the new part that connects the content script to the session manager.
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'PAGE_DATA') {
        // When we receive page data, we pass it to the session manager.
        addPageVisitToSession(message.payload);
    }
    // Return true to indicate you wish to send a response asynchronously
    return true; 
});

// --- Initial tracking when the service worker starts ---
// This handles cases where the service worker wakes up after being idle.
async function initializeCurrentTab() {
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTabs.length > 0) {
        trackTab(activeTabs[0]);
    }
}

initializeCurrentTab();