// content-script.js
// Final version that handles the 'available' status and fixes the language warning.

async function initializeAI() {
    console.log("AI SCRIPT: Initializing AI check for:", window.location.href);

    if (!('Summarizer' in window)) {
        console.warn("AI SCRIPT: The 'Summarizer' API is not supported by this browser version.");
        sendMessage(); 
        return;
    }

    try {
        const availability = await window.Summarizer.availability();
        console.log("AI SCRIPT: Model availability status:", availability);

        // --- THIS IS THE FIX ---
        // We now check for 'readily' OR 'available' as success states.
        if (availability === "readily" || availability === "available") {
            // Added { outputLanguage: 'en' } to fix the warning.
            const summarizer = await window.Summarizer.create({ outputLanguage: 'en' });
            const pageData = getPageData();
            await runSummarization(summarizer, pageData);
            sendMessage(pageData);

        } else if (availability === "downloadable") {
            console.log("AI SCRIPT: Model requires a user gesture to download. Creating 'Enable AI' button.");
            createEnableAIButton();
            sendMessage();

        } else {
            console.warn("AI SCRIPT: AI model is unavailable on this device.", availability);
            sendMessage();
        }
    } catch (error) {
        console.error("AI SCRIPT: An error occurred during the AI initialization process:", error);
        sendMessage();
    }
}

function createEnableAIButton() {
    // ... (This function remains unchanged)
    const button = document.createElement('button');
    button.id = 'rabbithole-ai-enable-btn';
    button.textContent = 'Enable AI Summarizer (One-time Download)';
    
    Object.assign(button.style, {
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: '9999',
        padding: '12px 18px',
        backgroundColor: '#4CAF50',
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
    });

    button.addEventListener('click', async () => {
        button.textContent = 'Downloading AI Model...';
        button.disabled = true;

        await window.Summarizer.create({
            monitor: (monitor) => {
                monitor.addEventListener('downloadprogress', (e) => {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    button.textContent = `Downloading AI Model... ${progress}%`;
                    console.log(`AI SCRIPT: Model download progress: ${progress}%`);
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
    }, { once: true });

    document.body.appendChild(button);
}

function getPageData() {
    // ... (This function remains unchanged)
    return {
        title: document.title,
        description: document.querySelector('meta[name="description"]')?.content || '',
        h1: document.querySelector('h1')?.innerText || '',
        url: window.location.href,
        aiTopics: []
    };
}

async function runSummarization(summarizer, pageData) {
    // ... (This function remains unchanged)
    console.log("AI SCRIPT: Running summarization...");
    const pageText = document.body.innerText;
    if (pageText && pageText.trim().length > 200) {
        // We truncate the text to a safe limit (e.g., 30000 characters)
        const truncatedText = pageText.substring(0, 30000);
        const summaryResult = await summarizer.summarize(truncatedText);
        console.log("AI SCRIPT: Raw summary result from AI:", summaryResult);
        if (summaryResult) {
            const topics = summaryResult
                .replace(/\*/g, '')
                .split(/\n/)
                .map(topic => topic.trim().toLowerCase())
                .filter(topic => topic.length > 5); // Filter out empty or very short strings
    
            pageData.aiTopics = [...new Set(topics)];
            console.log("AI SCRIPT: Successfully extracted topics:", pageData.aiTopics);
            }
    } else {
        console.warn("AI SCRIPT: Page has insufficient text to summarize.");
    }
}

function sendMessage(pageData) {
    // ... (This function remains unchanged)
    if (!pageData) {
        pageData = getPageData();
    }
    console.log("AI SCRIPT: Sending final pageData object to service worker:", pageData);
    chrome.runtime.sendMessage({ type: 'PAGE_DATA', payload: pageData });
}

window.addEventListener('load', initializeAI, { once: true });