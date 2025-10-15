// options/options.js
// This script powers the extension's options page.
// It handles loading saved settings from storage, displaying them to the user,
// and saving any changes made by the user (adding/removing time limits, clearing data).

// A global variable to hold the dynamically imported storage manager module.
let storageManager;

/**
 * Initializes the script by dynamically importing the storage manager module.
 * This is necessary because UI scripts (like options pages) cannot use static import statements
 * like background service workers can.
 */
async function init() {
    try {
        const src = chrome.runtime.getURL('utils/storage-manager.js');
        storageManager = await import(src);
        // Once the module is loaded, populate the page with any saved settings.
        loadSettings();
    } catch (e) {
        console.error("Failed to initialize options page script:", e);
    }
}


/**
 * Applies translations to the page.
 */
function applyTranslations() {
    // Translate static elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translatedText = chrome.i18n.getMessage(key);
        if (translatedText) element.textContent = translatedText;
    });

    // Translate placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        const translatedText = chrome.i18n.getMessage(key);
        if (translatedText) element.placeholder = translatedText;
    });

    // Translate the page title
    document.title = chrome.i18n.getMessage("optionsTitle");
}

async function init() {
    // Apply translations as soon as the script starts
    applyTranslations();
    try {
        const src = chrome.runtime.getURL('utils/storage-manager.js');
        storageManager = await import(src);
        loadSettings();
    } catch (e) { console.error(e); }
}

// --- DOM Element References ---
const limitList = document.getElementById('limit-list');
const addLimitForm = document.getElementById('add-limit-form');
const domainInput = document.getElementById('domain-input');
const limitInput = document.getElementById('limit-input');
const statusMessage = document.getElementById('status-message');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// A local variable to hold the settings object for quick access.
let currentSettings = {};

/**
 * Renders the list of currently saved time limits to the UI.
 * It clears the existing list and rebuilds it from the `currentSettings` object.
 */
function renderLimits() {
    limitList.innerHTML = '';
    const timeLimits = currentSettings.timeLimits || {};
    // Loop through each saved limit and create a list item for it.
    const removeButtonText = chrome.i18n.getMessage("removeButton");
    for (const domain in timeLimits) {
        const li = document.createElement('li');
        // Using a template literal to easily create the HTML structure for each list item.
        li.innerHTML = `
            <div>
                <span class="limit-domain">${domain}</span>
                <span class="limit-time">- ${timeLimits[domain]} min/day</span>
            </div>
            <button class="btn-remove" data-domain="${domain}">${removeButtonText}</button>
        `;
        limitList.appendChild(li);
    }
}

/**
 * Fetches the settings from chrome.storage and triggers a UI render.
 */
async function loadSettings() {
    if (!storageManager) return;
    currentSettings = await storageManager.getSettings();
    renderLimits();
}

// --- Event Listeners ---

// Handles the submission of the "Add Limit" form.
addLimitForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent the form from causing a page reload.
    const domain = domainInput.value.trim();
    const limit = parseInt(limitInput.value, 10);
    
    if (domain && limit > 0) {
        if (!currentSettings.timeLimits) {
            currentSettings.timeLimits = {};
        }
        currentSettings.timeLimits[domain] = limit;
        await storageManager.saveSettings(currentSettings);
        
        // Update the UI to reflect the change.
        renderLimits();
        addLimitForm.reset(); // Clear the input fields.
        
        // Provide user feedback.
        statusMessage.textContent = "✓";
        setTimeout(() => { statusMessage.textContent = ""; }, 2000);
    }
});

// Uses event delegation to handle clicks on any "Remove" button in the list.
limitList.addEventListener('click', async (e) => {
    // Only act if the clicked element is a remove button.
    if (e.target.classList.contains('btn-remove')) {
        const domainToRemove = e.target.dataset.domain;
        if (currentSettings.timeLimits && currentSettings.timeLimits[domainToRemove]) {
            delete currentSettings.timeLimits[domainToRemove];
            await storageManager.saveSettings(currentSettings);
            
            // Re-render the UI to show the limit has been removed.
            renderLimits();

            statusMessage.textContent = "✓";
            setTimeout(() => { statusMessage.textContent = ""; }, 2000);
        }
    }
});

// Handles the click on the "Clear All History" button, a destructive action.
clearHistoryBtn.addEventListener('click', async () => {
    const confirmationMessage = chrome.i18n.getMessage("clearHistoryConfirm");
    // Use a confirmation dialog to prevent accidental data loss.
    if (confirm(confirmationMessage)) {
        // Clear all data from chrome.storage.local.
        await chrome.storage.local.clear();
        // IMPORTANT: Re-save the user's settings, which are also stored in local storage.
        await storageManager.saveSettings(currentSettings);
        
        statusMessage.textContent = "✓";
        setTimeout(() => { statusMessage.textContent = ""; }, 2000);
    }
});

// Start the script.
init();