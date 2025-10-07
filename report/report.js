// report/report.js

document.addEventListener('DOMContentLoaded', async () => {
    const contentElement = document.getElementById('content');
    
    try {
        const result = await chrome.storage.local.get(['latestReport']);
        if (result.latestReport) {
            // Use marked.parse() to convert the stored Markdown into beautiful HTML
            contentElement.innerHTML = marked.parse(result.latestReport);
            
            // Clean up the temporary storage after we're done with it
            await chrome.storage.local.remove('latestReport');
        } else {
            contentElement.innerHTML = '<p>Could not find a report to display. Please try generating one again from the popup.</p>';
        }
    } catch (error) {
        console.error("Error loading or rendering report:", error);
        contentElement.innerHTML = '<p>An error occurred while displaying the report.</p>';
    }
});