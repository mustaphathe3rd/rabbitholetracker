// --- MODULE IMPORTS ---
let getWeeklyReport, generateWeeklyReport;
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

// --- TIMER LOGIC ---
let timerInterval = null;
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

function startTimer(startTime, timerElement) {
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        const elapsedTime = Date.now() - startTime;
        timerElement.textContent = formatTime(elapsedTime);
    }, 1000);
}


// --- MAIN SCRIPT ---
// All logic is now correctly placed inside this event listener.
document.addEventListener('DOMContentLoaded', async () => {
    await initImports();
    
    // --- ELEMENT SELECTORS ---
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

            if (transcript.includes("generate weekly report")) {
                console.log("VOICE: Executing 'Generate Weekly Report' command.");
                weeklyReportButton.click(); // Simulate a click on the weekly report button
            } else if (transcript.includes("generate session report")) {
                console.log("VOICE: Executing 'Generate Session Report' command.");
                sessionReportBtn.click(); // Simulate a click on the session report button
            } else {
                console.log("VOICE: Command not recognized.");
            }
        };

    } else {
        console.warn("VOICE: Speech Recognition API not supported in this browser.");
        micButton.style.display = 'none';
    }
    // --- END OF VOICE COMMAND SETUP ---


    // --- EVENT LISTENERS FOR BUTTONS ---
    weeklyReportButton.onclick = async () => {
        weeklyReportButton.textContent = 'Generating...';
        weeklyReportButton.disabled = true;
        if (generateWeeklyReport) {
            const reportText = await generateWeeklyReport();
            if (reportText && !reportText.startsWith("Not enough browsing data")) {
                insightTextElement.textContent = `🤖 ${reportText}`;
                weeklyReportButton.textContent = 'Report Generated!';
            } else if (reportText) {
                insightTextElement.textContent = `🤖 ${reportText}`;
                weeklyReportButton.textContent = 'Try Again Later';
            } else {
                insightTextElement.textContent = '🤖 Failed to generate report. Check console.';
                weeklyReportButton.textContent = 'Retry Report';
            }
        } else {
            insightTextElement.textContent = '🤖 Error: Reporter module not loaded.';
        }
        weeklyReportButton.disabled = false;
    };

    if (sessionReportBtn) {
        sessionReportBtn.addEventListener('click', () => {
            sessionReportBtn.textContent = 'Generating...';
            sessionReportBtn.disabled = true;
            chrome.runtime.sendMessage({ type: 'GENERATE_SESSION_REPORT' });
            setTimeout(() => {
                sessionReportBtn.textContent = 'Generate Session Report';
                sessionReportBtn.disabled = false;
            }, 4000);
        });
    }

    if (fullReportLink) {
        fullReportLink.addEventListener('click', (e) => {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL('summary/summary.html') });
        });
    }


    // --- INITIAL UI POPULATION ---
    const report = await getWeeklyReport();
    if (report && report.text) {
        insightTextElement.textContent = `🤖 ${report.text}`;
    } else {
        insightTextElement.textContent = '🤖 Click "Generate Report" to get your first weekly insight!';
    }

    const data = await chrome.storage.session.get('currentSession');
    const session = data.currentSession;
    if (session && session.pages && session.pages.length > 0) {
        // ... (The code to display the session details is complex and correct, so it's kept the same)
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
        mainContentElement.style.display = 'none';
        noSessionElement.style.display = 'block';
    }
});