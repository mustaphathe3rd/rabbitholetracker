import { getLastDaysData, saveWeeklyReport } from './storage-manager.js';

import { activeTabInfo } from '../background/time-tracker.js';

/**
 * The main function that generates and saves a weekly report.
 */
export async function generateWeeklyReport() {
    console.log("REPORTER: Starting weekly report generation...");

    // 1. Check if the LanguageModel API is available in the service worker's global scope.
    if (!self.LanguageModel) {
        console.warn("REPORTER: LanguageModel API not available in this context.");
        return null;
    }
    
    // Check the model's availability.
    const availability = await self.LanguageModel.availability();
    if (availability === 'unavailable') {
        console.warn("REPORTER: LanguageModel is unavailable on this device.");
        return null;
    }
    console.log("REPORTER: LanguageModel status:", availability);

    // 2. Get and summarize data.
    const weeklyData = await getLastDaysData(7);
    
    if (Object.keys(weeklyData).length === 0) {
        console.log("REPORTER: Not enough data to generate a report.");
        return "Not enough browsing data to generate a report yet. Check back in a few days!";
    }
    const dataSummary = summarizeDataForAI(weeklyData);

    // 3. Craft a detailed prompt for the AI.
     const prompt = `
        You are an expert productivity analyst reviewing a user's browsing data.
        Your goal is to provide a specific, non-generic, and insightful summary.

        Here is the data, showing the top domains and total time in seconds spent on each:
        ${JSON.stringify(dataSummary, null, 2)}

        Based on this data, please perform the following analysis:
        1.  Identify the single biggest time-sink or "rabbithole" domain.
        2.  Suggest a potential reason *why* the user might be spending so much time there (e.g., "It seems you use Gemini for deep research, which is great, but can lead to long sessions.").
        3.  Provide a unique and creative suggestion to help them manage their time on that specific site, going beyond generic advice like "use a timer".

        Combine these points into a single, friendly paragraph of about 75 words.
    `;

    // 4. Call the Prompt API.
    try {
        console.log("REPORTER: Creating LanguageModel session...");
        // This create() call will trigger the download if status is 'downloadable',
        // using the user gesture from the popup button click.
        const session = await self.LanguageModel.create({
        temperature: 0.7, // A good balance for creative but focused advice.
        topK: 3,
        monitor: (monitor) => {
            monitor.addEventListener('downloadprogress', (e) => {
                const progress = Math.round((e.loaded / e.total) * 100);
                console.log(`REPORTER: AI Model download progress: ${progress}%`);
            });
            }
        });
        
        console.log("REPORTER: Sending prompt to AI...");
        const result = await session.prompt(prompt);
        
        console.log("REPORTER: Received AI response:", result);
        await saveWeeklyReport(result);
        session.destroy(); // Clean up the session to free resources
        return result;
    } catch (error) {
        console.error("REPORTER: Error generating report with AI:", error);
        return null;
    }
}

/**
 * A helper function to process raw storage data into a simple summary.
 */
function summarizeDataForAI(data) {
    const summary = {};
    for (const date in data) {
        for (const domain in data[date]) {
            summary[domain] = (summary[domain] || 0) + data[date][domain].totalTime;
        }
    }
    const topDomains = Object.entries(summary)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
    
    return Object.fromEntries(topDomains);
}