// // background/session-manager.js
// // Manages the logic for creating and updating browsing sessions with robust, clear logic.

// // Define the period of inactivity in milliseconds that ends a session.
// // Set to 15 seconds for easy testing. Change to 30 * 60 * 1000 for production.
// const SESSION_GAP_THRESHOLD = 30 * 60 * 1000;

// /**
//  * Adds a page visit to the current session.
//  * If no session exists, or the last one is too old, it creates a new one.
//  * @param {object} pageData - The data extracted by the content script.
//  */
// export async function addPageVisitToSession(pageData) {
//     if (!pageData || !pageData.url) return;

//     console.log("SESSION_MANAGER: Received page data for", pageData.url);

//     try {
//         const data = await chrome.storage.session.get('currentSession');
//         let session = data.currentSession;
//         const now = Date.now();

//         // 1. CHECK FOR EXPIRATION
//         // If a session exists, check if it has expired due to inactivity.
//         if (session) {
//             const timeSinceLastVisit = now - session.lastActivity;
//             if (timeSinceLastVisit > SESSION_GAP_THRESHOLD) {
//                 console.log(`SESSION_MANAGER: Session expired due to inactivity (${Math.round(timeSinceLastVisit / 1000)}s). Starting new session.`);
//                 // Mark the session as null to force the creation of a new one.
//                 session = null;
//             }
//         }

//         // 2. CREATE NEW SESSION IF NEEDED
//         // If session is null (either because it's the first run or it just expired), create a fresh one.
//         if (!session) {
//             session = {
//                 id: `session-${now}`,
//                 startTime: now,
//                 pages: [],
//                 domains: [], // Using a simple Array is more robust with storage.
//                 lastActivity: now
//             };
//             console.log("SESSION_MANAGER: Created new session:", session.id);
//         }

//         // 3. UPDATE THE CURRENT SESSION
//         // Now that we have a guaranteed valid session, we can update it.
//         const domain = new URL(pageData.url).hostname;

//         // Add domain to the list if it's not already there.
//         if (!session.domains.includes(domain)) {
//             session.domains.push(domain);
//         }
        
//         // Add the full page data.
//         session.pages.push(pageData);

//         // Update the last activity timestamp to the current time.
//         session.lastActivity = now;
        
//         // Save the updated session back to storage.
//         await chrome.storage.session.set({ currentSession: session });
//         console.log("SESSION_MANAGER: Updated session.", session);

//     } catch (error) {
//         console.error("SESSION_MANAGER: Error updating session:", error);
//     }
// }

// background/session-manager.js
// Upgraded to handle AI-generated topics and determine a session's primary topic.

const SESSION_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes

export async function addPageVisitToSession(pageData) {
    if (!pageData || !pageData.url) return;
    console.log("SESSION_MANAGER: Received page data for", pageData.url);

    try {
        const data = await chrome.storage.session.get('currentSession');
        let session = data.currentSession;
        const now = Date.now();

        if (session) {
            const timeSinceLastVisit = now - session.lastActivity;
            if (timeSinceLastVisit > SESSION_GAP_THRESHOLD) {
                session = null;
            }
        }

        if (!session) {
            session = {
                id: `session-${now}`,
                startTime: now,
                pages: [],
                domains: [],
                allTopics: {}, // --- NEW: An object to count topic frequency ---
                primaryTopic: 'Unknown', // --- NEW: The main topic of the session ---
                lastActivity: now
            };
            console.log("SESSION_MANAGER: Created new session:", session.id);
        }

        // Add the new page's data
        session.pages.push(pageData);
        session.lastActivity = now;
        const domain = new URL(pageData.url).hostname;
        if (!session.domains.includes(domain)) {
            session.domains.push(domain);
        }

        // --- NEW: Process AI Topics to find the primary session topic ---
        if (pageData.aiTopics && pageData.aiTopics.length > 0) {
            // Add the new topics to our session's topic counter
            for (const topic of pageData.aiTopics) {
                session.allTopics[topic] = (session.allTopics[topic] || 0) + 1;
            }

            // Find the most frequent topic in the session so far
            let maxCount = 0;
            let mostFrequentTopic = session.primaryTopic;
            for (const topic in session.allTopics) {
                if (session.allTopics[topic] > maxCount) {
                    maxCount = session.allTopics[topic];
                    mostFrequentTopic = topic;
                }
            }
            session.primaryTopic = mostFrequentTopic;
        }
        // --- End of New Logic ---
        
        await chrome.storage.session.set({ currentSession: session });
        console.log("SESSION_MANAGER: Updated session.", session);

    } catch (error) {
        console.error("SESSION_MANAGER: Error updating session:", error);
    }
}