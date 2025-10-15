// block/block.js

/**
 * Applies translations to the static elements on the block page using data-i18n attributes.
 */
function applyStaticTranslations() {
    // Translate the page title first
    document.title = chrome.i18n.getMessage("blockPageTitle");

    const elementsToTranslate = document.querySelectorAll('[data-i18n]');
    elementsToTranslate.forEach(element => {
        const key = element.getAttribute('data-i18n');
        const translatedText = chrome.i18n.getMessage(key);
        if (translatedText) {
            element.textContent = translatedText;
        }
    });
}

/**
 * Handles the dynamic part of the message which includes the site name placeholder.
 */
function displayDynamicMessage() {
    const messageContainer = document.getElementById('dynamic-message-container');
    const urlParams = new URLSearchParams(window.location.search);
    const site = urlParams.get('site');

    if (site && messageContainer) {
        // Get the translated message, passing the 'site' variable as the substitution
        // for the "$1" placeholder we defined in messages.json.
        const formattedMessage = chrome.i18n.getMessage("blockPageMessage", site);
        
        // Set the text content directly. We don't need innerHTML anymore.
        messageContainer.textContent = formattedMessage;
    }
}

// Run both functions once the page content has fully loaded.
document.addEventListener('DOMContentLoaded', () => {
    applyStaticTranslations();
    displayDynamicMessage();
});