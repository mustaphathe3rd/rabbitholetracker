// popup/js
// This script connects the UI with the live data from the background scripts.

// A variable to hold the timer interval so we can clear it if needed.
let timerInterval = null;

// --- Helper Functions ---

/**
 * Formats milliseconds into a human-readable string (e.g., 1h 23m 45s).
 * @param {number} ms - The total milliseconds to format.
 * @returns {string} The formatted time string.
 */
function formatTime(ms) {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours}h ${minutes}m ${seconds}s`;
    }
    if (minutes > 0) {
        return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
}

/**
 * Starts a real-time ticking timer on the popup.
 * @param {number} startTime - The Unix timestamp (in ms) when the session started.
 */
function startTimer(startTime, timerElement) {
    // Clear any existing timer before starting a new one
    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerElement.textContent = formatTime(elapsedTime);
    }, 1000); // Update every second
}


// --- Main Update Function ---

// This function runs when the popup is opened.
document.addEventListener('DOMContentLoaded', async () => {
    // Get references to all the HTML elements we need to update
    const topicTitleElement = document.getElementById('topic-title');
    const timerElement = document.getElementById('timer');
    const journeyIconsElement = document.getElementById('journey-icons');
    const noSessionElement = document.getElementById('no-session');
    const mainContentElement = document.getElementById('main-content');

    // Fetch the current session data from chrome.storage.session
    // Note: We use .session not .local, as this data is temporary for the browser session.
    const data = await chrome.storage.session.get('currentSession');
    const session = data.currentSession;

    if (session && session.pages && session.pages.length > 0) {
        // A session is active, so show the main content.
        mainContentElement.style.display = 'block';
        noSessionElement.style.display = 'none';

        // 1. Update the Topic Title
        // We'll use the title of the most recent page in the session.
        const latestPage = session.pages[session.pages.length - 1];
        topicTitleElement.textContent = latestPage.title || 'No Title';
        
        // 2. Update the Journey Icons
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

        // 3. Start the Real-time Timer
        startTimer(session.startTime, timerElement);

    } else {
        // No active session, so show the placeholder message.
        mainContentElement.style.display = 'none';
        noSessionElement.style.display = 'block';
    }
});