// report/report.js
// This script powers the dedicated Session Report page (report.html).
// Its sole purpose is to retrieve the AI-generated report content from storage,
// render it from Markdown to formatted HTML, and handle the "Export to PDF" functionality.

document.addEventListener('DOMContentLoaded', async () => {
    // --- DOM Element References ---
    const mainContentElement = document.getElementById('main-content');
    const exportBtn = document.getElementById('export-pdf-btn');
    
    // --- Event Listener for the PDF Button ---
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            // This leverages the browser's built-in print functionality.
            // The user can then choose "Save as PDF" as the destination.
            window.print();
        });
    }

    // --- Load and Render the Report ---
    try {
        // 1. Fetch the report content, which was temporarily saved by the report-generator module.
        const result = await chrome.storage.local.get(['latestReport']);
        if (result.latestReport) {
            // 2. Use the marked.js library (loaded in the HTML) to convert the Markdown string into HTML.
            mainContentElement.innerHTML = marked.parse(result.latestReport);
            
            // 3. Clean up the temporary storage to prevent this report from being shown again.
            await chrome.storage.local.remove('latestReport');
        } else {
            // Display a message if no report data was found.
            mainContentElement.innerHTML = '<h2>Report Not Found</h2><p>Could not find a report to display. Please try generating one again.</p>';
        }
    } catch (error) {
        // Gracefully handle any errors during the rendering process.
        console.error("Error loading or rendering report:", error);
        mainContentElement.innerHTML = '<h2>Error</h2><p>An error occurred while displaying the report.</p>';
    }
});