// background/session-manager.js
/**
 * @file This module is the core intelligence behind understanding a user's browsing journey.
 * It manages the concept of a "browsing session" by grouping individual page visits,
 * determining when a session starts and ends based on user inactivity, and using AI to
 * synthesize a high-level, human-like topic for the entire session.
 */

// Imports the scoring function to analyze the session's "rabbithole" severity.
import { scoreSession } from './rabbithole-detector.js';

// Defines the period of inactivity (in milliseconds) that will automatically end a session and start a new one.
const SESSION_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes

/**
 * The main entry point for this module. It takes page data (from a content script or time tracker),
 * adds it to the current session, or starts a new session if necessary. After updating the session,
 * it triggers the advanced topic synthesis and rabbithole scoring.
 *
 * @param {object} pageData - A data object containing the URL, title, and any AI-extracted topics for a page visit.
 */
export async function addPageVisitToSession(pageData) {
    // Ignore function call if page data is invalid.
    if (!pageData || !pageData.url) return;

    try {
        // 1. Load the current session object from temporary session storage.
        const data = await chrome.storage.session.get('currentSession');
        let session = data.currentSession;
        const now = Date.now();

        // 2. Check for session expiration. If the user has been inactive for longer than the threshold,
        // we end the current session by setting it to null, which will force a new one to be created.
        if (session) {
            const timeSinceLastVisit = now - session.lastActivity;
            if (timeSinceLastVisit > SESSION_GAP_THRESHOLD) {
                session = null;
            }
        }

        // 3. If no session exists (either because it's the first run or the previous one expired),
        // create a new, empty session object with the current timestamp.
        if (!session) {
            session = {
                id: `session-${now}`,
                startTime: now,
                pages: [],
                domains: [],
                allTopics: {}, // Will store the frequency of each keyword for rabbithole scoring.
                primaryTopic: 'Unknown', // The final, AI-synthesized topic for the session.
                lastActivity: now
            };
        }
        
        // 4. Update the session with the new page visit information.
        session.pages.push(pageData);
        session.lastActivity = now; // Always update the last activity timestamp.
        const domain = new URL(pageData.url).hostname;
        if (!session.domains.includes(domain)) {
            session.domains.push(domain);
        }

        // 5. Perform advanced topic analysis using the collected AI data.
        if (session.pages.length > 0) {
            const keywordCounts = {};
            // A set of common "stop words" to filter out for more meaningful topic analysis.
            const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'and', 'is', 'was', 'as', 'it']);

            // a. Aggregate all AI-generated topic sentences from every page in the session.
            session.pages.forEach(page => {
                if (page.aiTopics) {
                    page.aiTopics.forEach(topicSentence => {
                        // b. Split sentences into individual keywords.
                        const keywords = topicSentence.split(/\s+/);
                        keywords.forEach(keyword => {
                            // c. Clean up each keyword and count its frequency.
                            const cleanKeyword = keyword.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
                            if (cleanKeyword.length > 3 && !stopWords.has(cleanKeyword)) {
                                keywordCounts[cleanKeyword] = (keywordCounts[cleanKeyword] || 0) + 1;
                            }
                        });
                    });
                }
            });
            
            // This object is used by the rabbithole-detector for scoring.
            session.allTopics = keywordCounts;

            // d. Find the top 5 most frequent keywords in the entire session.
            const topKeywords = Object.entries(keywordCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([keyword]) => keyword);

            // e. Set a simple, reliable fallback topic (the single most frequent keyword).
            if (topKeywords.length > 0) {
                session.primaryTopic = topKeywords[0];
            }
            
            // f. If we have enough keywords, ask the AI to synthesize a more insightful, high-level topic.
            if (topKeywords.length > 1 && self.LanguageModel) {
                const synthesisPrompt = `Based on these keywords from a browsing session: [${topKeywords.join(', ')}], generate a short, descriptive title for the session, no more than 8 words.`;
                try {
                    const availability = await self.LanguageModel.availability();
                    if (availability === 'available' || availability === 'readily') {
                        const ai_session = await self.LanguageModel.create();
                        const synthesizedTopic = await ai_session.prompt(synthesisPrompt);
                        // Clean up the AI's response and set it as the new primary topic.
                        session.primaryTopic = synthesizedTopic.replace(/[#*_"]/g, '').trim();
                        ai_session.destroy(); // Free up resources.
                    }
                } catch (error) {
                    // If AI synthesis fails, we gracefully fall back to the simple keyword topic.
                    console.error("SESSION_MANAGER: Topic synthesis failed, using most frequent keyword as fallback.", error);
                }
            }
        }
        
        // 6. Score the newly updated session for "rabbithole" severity.
        const { rabbitholeScore, rabbitholeSeverity } = scoreSession(session);
        session.rabbitholeScore = rabbitholeScore;
        session.rabbitholeSeverity = rabbitholeSeverity;
        
        // 7. Save the fully updated session object back to storage.
        await chrome.storage.session.set({ currentSession: session });

    } catch (error) {
        console.error("SESSION_MANAGER: Error updating session:", error);
    }
}