// background/report-generator.js
// This version uses a simpler prompt to avoid the "low quality output" error.

export async function generateSessionReport() {
    console.log("REPORT_GENERATOR: Starting session report generation...");

    if (!self.Writer) {
        console.warn("REPORT_GENERATOR: Writer API is not available in this browser.");
        return;
    }
    
    const availability = await self.Writer.availability();
    if (availability !== 'available' && availability !== 'readily') {
        console.warn("REPORT_GENERATOR: Writer model is not ready. Status:", availability);
        return;
    }
    console.log("REPORT_GENERATOR: Writer model status:", availability);

    const data = await chrome.storage.session.get('currentSession');
    const session = data.currentSession;
    if (!session || !session.pages || !session.pages.length === 0) {
        console.warn("REPORT_GENERATOR: No active session data to report.");
        return;
    }

    let promptData = `Primary Topic: ${session.primaryTopic}\n\nPages Visited:\n`;
    session.pages.forEach(page => {
        promptData += `- Title: ${page.title}\n`;
        if (page.aiTopics && page.aiTopics.length > 0) {
            promptData += `  AI Topics: ${page.aiTopics.join(', ')}\n`;
        }
    });

    // --- NEW, SIMPLER PROMPT ---
    const prompt = `
        You are a research assistant. Your task is to organize the following browsing data into a simple summary report using Markdown.

        Here is the data from the browsing session:
        ---
        ${promptData}
        ---

        Please format this into a clean report:
        1. Create a single, suitable title for the report.
        2. Then, list each page you were given as a main bullet point.
        3. Under each page, list its key topics as sub-bullets.
    `;
    // --- END OF NEW PROMPT ---

    try {
        const writer = await self.Writer.create({ format: 'markdown' });
        console.log("REPORT_GENERATOR: Sending prompt to Writer API...");
        const reportContent = await writer.write(prompt);
        console.log("REPORT_GENERATOR: Received report from AI.");
        
        await displayReportInNewTab(reportContent);
        writer.destroy();
    } catch (error) {
        console.error("REPORT_GENERATOR: Error during report generation:", error);
    }
}


async function displayReportInNewTab(reportContent) {
    // 1. Save the report content to a temporary location.
    await chrome.storage.local.set({ latestReport: reportContent });

    // 2. Open our dedicated report.html page in a new tab.
    // This is a much more reliable method than using a data: URL.
    await chrome.tabs.create({ url: 'report/report.html' });
}