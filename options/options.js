// options/options.js

// We need to import the functions from our storage manager.
// To do this, we'll create a simple dynamic import.
let storageManager;

async function init() {
    try {
        const src = chrome.runtime.getURL('utils/storage-manager.js');
        storageManager = await import(src);
        loadSettings(); // Load existing settings once the module is ready
    } catch (e) {
        console.error("Error importing storage manager:", e);
    }
}

const form = document.getElementById('settings-form');
const domainInput = document.getElementById('domain');
const limitInput = document.getElementById('limit');
const statusMessage = document.getElementById('status-message');

// --- Load existing settings and populate the form ---
async function loadSettings() {
    if (!storageManager) return;
    const settings = await storageManager.getSettings();
    const timeLimits = settings.timeLimits || {};
    
    // For this simple version, we assume only one limit is set.
    // A more advanced version would handle a list of limits.
    const firstDomain = Object.keys(timeLimits)[0];
    if (firstDomain) {
        domainInput.value = firstDomain;
        limitInput.value = timeLimits[firstDomain];
    }
}

// --- Save settings when the form is submitted ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!storageManager) return;

    const domain = domainInput.value;
    const limitInMinutes = parseInt(limitInput.value, 10);

    if (domain && limitInMinutes > 0) {
        const newSettings = {
            timeLimits: {
                [domain]: limitInMinutes
            }
        };
        await storageManager.saveSettings(newSettings);
        
        statusMessage.textContent = "Settings saved!";
        setTimeout(() => {
            statusMessage.textContent = "";
        }, 3000); // Clear message after 3 seconds
    }
});

// Initialize the script
init();