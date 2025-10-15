// popup/popup.js
// This script is the main controller for the extension's popup UI.
// It's responsible for fetching and displaying all live data, handling user interactions
// like button clicks, and managing the voice command interface.

// --- Module Imports ---
// Global variables to hold the dynamically imported module functions.
let getWeeklyReport, generateWeeklyReport;

/**
 * Dynamically imports necessary modules from the extension's background scripts.
 * This is the required method for UI scripts to access other modules.
 */
async function initImports() {
    try {
        const storageManagerSrc = chrome.runtime.getURL('utils/storage-manager.js');
        const weeklyReporterSrc = chrome.runtime.getURL('utils/weekly-reporter.js');
        const storageManager = await import(storageManagerSrc);
        const weeklyReporter = await import(weeklyReporterSrc);
        getWeeklyReport = storageManager.getWeeklyReport;
        generateWeeklyReport = weeklyReporter.generateWeeklyReport;
    } catch (error) { console.error("Popup: Failed to import modules", error); }
}

/**
 * NEW: A function to apply translations to the UI.
 * It finds all elements with a 'data-i18n' attribute and replaces their text
 * with the message from the _locales folder.
 */
function applyTranslations() {
    // Find all elements that need translation
    const elementsToTranslate = document.querySelectorAll('[data-i18n]');
    elementsToTranslate.forEach(element => {
        // Get the key from the data attribute (e.g., "appName")
        const key = element.getAttribute('data-i18n');
        // Get the translated message using Chrome's built-in i18n API
        const translatedText = chrome.i18n.getMessage(key);
        // If a translation is found, update the element's text
        if (translatedText) {
            element.textContent = translatedText;
        }
    });
}

// --- Helper Functions ---
let timerInterval = null; // Holds the interval ID for the real-time timer.

/**
 * Formats a duration in milliseconds into a human-readable string (e.g., "1h 5m 32s").
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} The formatted time string.
 */
function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
}

/**
 * Starts a real-time ticking timer that updates a UI element every second.
 * @param {number} startTime - The Unix timestamp (in ms) when the session started.
 * @param {HTMLElement} timerElement - The DOM element to update with the elapsed time.
 */
function startTimer(startTime, timerElement) {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerElement.textContent = formatTime(elapsedTime);
    }, 1000);
}


// --- MAIN SCRIPT ---
// This event listener is the entry point for the entire script. It runs once the popup HTML is fully loaded.
document.addEventListener('DOMContentLoaded', async () => {
    // Call the new translation function right at the beginning
    applyTranslations();
    
    await initImports();
    
    // --- ELEMENT SELECTORS (unchanged) ---
    const topicTitleElement = document.getElementById('topic-title');
    const timerElement = document.getElementById('timer');
    const journeyIconsElement = document.getElementById('journey-icons');
    const noSessionElement = document.getElementById('no-session');
    const mainContentElement = document.getElementById('main-content');
    const insightTextElement = document.getElementById('insight-text');
    const weeklyReportButton = document.getElementById('generate-report-btn');
    const sessionReportBtn = document.getElementById('generate-session-report-btn');
    const micButton = document.getElementById('mic-btn');
    const fullReportLink = document.querySelector('.view-report-link');
    const loadingOverlay = document.getElementById('loading-animation');
    const loadingMessage = document.getElementById('loading-message');

    /**
     * Displays a loading animation overlay with a given message.
     * @param {string} message - The text to display below the animation.
    */
     function showLoading(message) {
        if (loadingOverlay && loadingMessage) {
            loadingMessage.textContent = message;
            loadingOverlay.classList.add('active');
        }
    }
    function hideLoading() {
        if (loadingOverlay) {
            loadingOverlay.classList.remove('active');
        }
    }

    // --- VOICE COMMAND SETUP ---
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        micButton.addEventListener('click', () => {
            console.log("VOICE: Listening...");
            recognition.start();
        });

        recognition.onstart = () => { micButton.classList.add('listening'); micButton.title = "Listening..."; };
        recognition.onend = () => { micButton.classList.remove('listening'); micButton.title = "Activate Voice Commands"; };
        recognition.onerror = (event) => { console.error("VOICE: Speech recognition error", event.error); };

       recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log("VOICE: Heard:", transcript);

        function giveFeedback(button) {
                button.classList.add('active');
                setTimeout(() => button.classList.remove('active'), 1000);
         }

        if (transcript.includes("weekly")) {
            // --- THIS LOG MESSAGE IS UPDATED ---
            console.log("VOICE: Executing 'Generate Weekly Insight' command.");
            weeklyReportButton.click();
        } else if (transcript.includes("session")) {
            console.log("VOICE: Executing 'Generate Session Report' command.");
            sessionReportBtn.click(); // The name of this button is still 'Export Session'
        } else if (transcript.includes("generate report")) {
            // This default case is also updated
            console.log("VOICE: Executing 'Generate Weekly Insight' command (default).");
            weeklyReportButton.click();
        } else {
            console.log("VOICE: Command not recognized.");
        }
    };

    } else {
        console.warn("VOICE: Speech Recognition API not supported in this browser.");
        micButton.style.display = 'none';
    }

    // --- Button Event Listeners ---
     if (weeklyReportButton) {
        // Handles the click for generating the weekly AI insight.
        weeklyReportButton.onclick = async () => {
        showLoading(chrome.i18n.getMessage("loadingWeeklyInsight")); // SHOW ANIMATION
        weeklyReportButton.disabled = true;
        if (generateWeeklyReport) {
            const reportText = await generateWeeklyReport();
            if (reportText && !reportText.startsWith("Not enough browsing data")) {
                insightTextElement.textContent = `🤖 ${reportText}`;
                weeklyReportButton.textContent = chrome.i18n.getMessage("reportGenerated");
            } else if (reportText) {
                insightTextElement.textContent = `🤖 ${reportText}`;
                weeklyReportButton.textContent = chrome.i18n.getMessage("tryAgainLater");
            } else {
                insightTextElement.textContent = '🤖 Failed to generate report. Check console.';
                weeklyReportButton.textContent = chrome.i18n.getMessage("retryReport");
            }
        } else {
            insightTextElement.textContent = '🤖 Error: Reporter module not loaded.';
        }
        hideLoading(); // HIDE ANIMATION
        weeklyReportButton.disabled = false;
    };
}

    if (sessionReportBtn) {
        // Handles the click for exporting the current session as a report.
        sessionReportBtn.addEventListener('click', () => {
            showLoading(chrome.i18n.getMessage("loadingExportSession")); // Show animation
            sessionReportBtn.disabled = true;

            // Send a message and provide a callback function to handle the response
            chrome.runtime.sendMessage({ type: 'GENERATE_SESSION_REPORT' }, (response) => {
                console.log("POPUP: Received response from service worker:", response);
                // This callback runs *after* the service worker signals that the task is complete.
                hideLoading(); // Hide animation
                sessionReportBtn.disabled = false;

                if (response && response.status === 'done') {
                    sessionReportBtn.textContent = 'Report Created!';
                } else {
                    sessionReportBtn.textContent = 'Export Failed';
                }

                // Reset button text after a few seconds for better UX
                setTimeout(() => {
                    sessionReportBtn.textContent = 'Export Session';
                }, 3000);
            });
        });
    }

    if (fullReportLink) {
        // Handles the click for the "View Full Report" link.
        fullReportLink.addEventListener('click', (e) => {
            e.preventDefault();
            // Opens the dedicated summary page in a new tab.
            chrome.tabs.create({ url: chrome.runtime.getURL('summary/summary.html') });
        });
    }


    // --- INITIAL UI POPULATION ---
    // This section runs once when the popup opens to fill the UI with the latest data.

    // a. Fetch the last generated weekly report.
    const report = await getWeeklyReport();
    if (report && report.text) {
        insightTextElement.textContent = `🤖 ${report.text}`;
    } else {
        insightTextElement.textContent = '🤖 Click "Generate Report" to get your first weekly insight!';
    }

    // b. Fetch the current live session data.
    const data = await chrome.storage.session.get('currentSession');
    const session = data.currentSession;
    if (session && session.pages && session.pages.length > 0) {
        // c. If a session exists, display all its details.
        mainContentElement.style.display = 'block';
        noSessionElement.style.display = 'none';
        const latestPage = session.pages[session.pages.length - 1];
        topicTitleElement.textContent = session.primaryTopic !== 'Unknown' ? session.primaryTopic : (latestPage.title || 'No Title');
        
        journeyIconsElement.innerHTML = ''; // Clear any old icons
        session.domains.forEach((domain, index) => {
            const icon = document.createElement('img');
            // Use a favicon service to get domain icons automatically
            icon.src = `https://icons.duckduckgo.com/ip3/${domain}.ico`;
            icon.alt = domain;
            icon.title = domain; // Show domain name on hover
            journeyIconsElement.appendChild(icon);

            // Add an arrow between icons, but not after the last one
            if (index < session.domains.length - 1) {
                const arrow = document.createElement('span');
                arrow.className = 'arrow';
                arrow.textContent = '→';
                journeyIconsElement.appendChild(arrow);
            }
        });

        startTimer(session.startTime, timerElement);

    } else {
        // d. If no session is active, show a placeholder message.
        mainContentElement.style.display = 'none';
        noSessionElement.style.display = 'block';
    }
});