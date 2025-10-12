// Helper function to safely get text content from an element.
function getText(selector) {
    const element = document.querySelector(selector);
    return element ? element.innerText : '';
}

// --- Parsers for each domain ---

function parseYouTube() {
    // Selectors for YouTube's video page structure.
    const videoTitle = getText('h1.ytd-watch-metadata');
    const channelName = getText('#owner-name a');
    const description = getText('#description-inline-expander .ytd-text-inline-expander');
    return { videoTitle, channelName, description };
}

function parseWikipedia() {
    // Wikipedia articles have a very consistent title ID.
    const articleTitle = getText('#firstHeading');
    return { articleTitle };
}

function parseReddit() {
    // Selectors for Reddit's post structure.
    const postTitle = getText('h1[slot="title"]');
    const subreddit = getText('a[slot="subredditName"]');
    return { postTitle, subreddit };
}

/**
 * Main exported function. It checks the current domain and runs the
 * appropriate parser.
 * @returns {object} An object containing domain-specific data.
 */
export function parseDomainSpecificContent() {
    const { hostname } = window.location;

    if (hostname.includes('youtube.com')) {
        return parseYouTube();
    }
    if (hostname.includes('wikipedia.org')) {
        return parseWikipedia();
    }
    if (hostname.includes('reddit.com')) {
        return parseReddit();
    }
    
    // If the domain doesn't match, return an empty object.
    return {};
}