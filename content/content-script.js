// content/content-script.js
// This script is injected into every webpage the user visits.
// Its primary responsibilities are:
// 1. Checking if the browser's built-in Summarizer AI is available.
// 2. Handling the one-time, user-approved download of the AI model.
// 3. If the AI is ready, summarizing the page content to extract key topics.
// 4. Sending this enriched page data to the background service worker for session management.

/**
 * Main initialization function that runs once the page has loaded.
 * It orchestrates the entire process of checking for AI and summarizing content.
 */
async function initializeAI() {
    console.log("AI SCRIPT: Initializing AI check for:", window.location.href);

    // First, check if the 'Summarizer' API constructor exists on the window object.
    // This is the most basic check to see if the browser version supports the feature at all.
    if (!('Summarizer' in window)) {
        console.warn("AI SCRIPT: The 'Summarizer' API is not supported by this browser version.");
        sendMessage(); // Send basic page data even if AI isn't supported.
        return;
    }

    try {
        // As per official documentation, check the availability of the AI model.
        const availability = await window.Summarizer.availability();
        console.log("AI SCRIPT: Model availability status:", availability);

        // Case 1: The model is already downloaded and ready to use.
        if (availability === "readily" || availability === "available") {
            const summarizer = await window.Summarizer.create({ outputLanguage: 'en' });
            const pageData = getPageData();
            await runSummarization(summarizer, pageData);
            sendMessage(pageData);

        // Case 2: The model is available but needs to be downloaded.
        } else if (availability === "downloadable") {
            console.log("AI SCRIPT: Model requires a user gesture to download. Creating 'Enable AI' button.");
            // We must get the user's permission (a click) before starting a large download.
            createEnableAIButton();
            sendMessage(); // Send basic page data for now; the AI will be available on the next page load.

        // Case 3: The model is unavailable for other reasons (e.g., hardware not supported).
        } else {
            console.warn("AI SCRIPT: AI model is unavailable on this device.", availability);
            sendMessage();
        }
    } catch (error) {
        console.error("AI SCRIPT: An error occurred during the AI initialization process:", error);
        sendMessage(); // Ensure we always send basic data, even on error.
    }
}

/**
 * Creates and injects a button onto the page to get the user's explicit permission
 * (a "user gesture") to download the AI model for the first time.
 */
function createEnableAIButton() {
    const button = document.createElement('button');
    button.id = 'rabbithole-ai-enable-btn';
    button.textContent = 'Enable AI Summarizer (One-time Download)';
    
    // Styles are applied via JS to keep the button's logic self-contained.
    Object.assign(button.style, {
        position: 'fixed', bottom: '20px', right: '20px', zIndex: '9999',
        padding: '12px 18px', backgroundColor: '#4CAF50', color: 'white',
        border: 'none', borderRadius: '8px', fontSize: '14px',
        fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    });

    // The click listener is the "user gesture" that allows the download to start.
    button.addEventListener('click', async () => {
        button.textContent = 'Downloading AI Model...';
        button.disabled = true;

        // This create() call triggers the download.
        await window.Summarizer.create({
            outputLanguage: 'en',
            // The monitor provides real-time feedback on the download process.
            monitor: (monitor) => {
                monitor.addEventListener('downloadprogress', (e) => {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    button.textContent = `Downloading AI Model... ${progress}%`;
                });
                monitor.addEventListener('statechange', (e) => {
                     if (e.target.state === 'ready') {
                         console.log("AI SCRIPT: Model download complete and ready!");
                         button.textContent = 'AI Enabled!';
                         setTimeout(() => button.remove(), 2000);
                     }
                });
            }
        });
    }, { once: true }); // The listener is removed after the first click.

    document.body.appendChild(button);
}

/**
 * A helper function to gather basic, non-AI metadata from the page.
 * @returns {object} An object containing the page's title, description, h1, and URL.
 */
function getPageData() {
    return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        h1: document.querySelector('h1')?.innerText || '',
        url: window.location.href,
        aiTopics: [] // Initialize as empty; will be filled by runSummarization.
    };
}

/**
 * Executes the AI summarization on the page's text content.
 * @param {object} summarizer - The created summarizer instance.
 * @param {object} pageData - The page data object that will be enriched with AI topics.
 */
async function runSummarization(summarizer, pageData) {
    console.log("AI SCRIPT: Running summarization...");
    try {
        const pageText = document.body.innerText;
        // Only attempt to summarize if there is a meaningful amount of text.
        if (pageText && pageText.trim().length > 200) {
            // Truncate the text to a safe limit to avoid "QuotaExceededError" on very long pages.
            const truncatedText = pageText.substring(0, 20000);
            const summaryResult = await summarizer.summarize(truncatedText);
            
            if (summaryResult) {
                // Process the raw AI output (often a string with newlines/asterisks) into a clean array of topics.
                const topics = summaryResult
                    .replace(/\*/g, '')
                    .split(/\n/)
                    .map(topic => topic.trim().toLowerCase())
                    .filter(topic => topic.length > 5);
            
                // Use a Set to ensure all topics are unique before saving.
                pageData.aiTopics = [...new Set(topics)];
                console.log("AI SCRIPT: Successfully extracted topics:", pageData.aiTopics);
            }
        } else {
            console.warn("AI SCRIPT: Page has insufficient text to summarize.");
        }
    } catch (error) {
        // Gracefully handle errors from the AI model itself.
        console.error("AI SCRIPT: Error during summarization (potentially due to input size):", error);
    }
}

/**
 * A robust helper function to send the final page data object to the service worker.
 * It includes a small delay to prevent race conditions where chrome.runtime might not be ready.
 */
function sendMessage(pageData) {
    if (!pageData) {
        pageData = getPageData();
    }
    console.log("AI SCRIPT: Sending final pageData object to service worker:", pageData);

    setTimeout(() => {
        try {
            // Check if the runtime API is available before sending.
            if (chrome && chrome.runtime && chrome.runtime.sendMessage) {
                chrome.runtime.sendMessage({ type: 'PAGE_DATA', payload: pageData });
            } else {
                console.error("AI SCRIPT: chrome.runtime is not available. Cannot send message.");
            }
        } catch (error) {
            // This catches errors like "message port closed", which can happen if the popup closes.
            console.error("AI SCRIPT: Error sending message:", error);
        }
    }, 100); // 100ms delay for stability.
}

// The entry point for the script. It waits for the entire page to load before initializing.
window.addEventListener('load', initializeAI, { once: true });