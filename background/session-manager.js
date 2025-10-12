// background/session-manager.js
// This module manages the concept of a "browsing session". It groups individual page visits,
// determines when a session starts and ends based on inactivity, and uses AI to synthesize a
// high-level topic for the entire session.

import { scoreSession } from './rabbithole-detector.js';

// Defines the period of inactivity (in milliseconds) that will automatically end a session.
const SESSION_GAP_THRESHOLD = 30 * 60 * 1000; // 30 minutes

/**
 * The main entry point for this module. It takes page data, adds it to the current session,
 * or starts a new session if necessary. It also triggers topic synthesis and rabbithole scoring.
 * @param {object} pageData - Data object containing URL, title, and AI topics from a content script.
 */
export async function addPageVisitToSession(pageData) {
    if (!pageData || !pageData.url) return;

    try {
        // 1. Load the current session from temporary session storage.
        const data = await chrome.storage.session.get('currentSession');
        let session = data.currentSession;
        const now = Date.now();

        // 2. Check for session expiration. If the user has been inactive for too long, end the session.
        if (session) {
            const timeSinceLastVisit = now - session.lastActivity;
            if (timeSinceLastVisit > SESSION_GAP_THRESHOLD) {
                // By setting session to null, we force a new one to be created.
                session = null;
            }
        }

        // 3. If no session exists (first run or expired), create a new session object.
        if (!session) {
            session = {
                id: `session-${now}`,
                startTime: now,
                pages: [],
                domains: [],
                allTopics: {}, 
                primaryTopic: 'Unknown',
                lastActivity: now
            };
        }
        
        // 4. Update the session with the new page visit information.
        session.pages.push(pageData);
        session.lastActivity = now;
        const domain = new URL(pageData.url).hostname;
        if (!session.domains.includes(domain)) {
            session.domains.push(domain);
        }

        // 5. Perform advanced topic analysis.
        if (session.pages.length > 0) {
            const keywordCounts = {};
            const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'and', 'is', 'was', 'as', 'it']);

            // a. Aggregate all AI topics from all pages in the session.
            session.pages.forEach(page => {
                if (page.aiTopics) {
                    page.aiTopics.forEach(topicSentence => {
                        // b. Split sentences into individual keywords and count their frequency.
                        const keywords = topicSentence.split(/\s+/);
                        keywords.forEach(keyword => {
                            const cleanKeyword = keyword.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
                            // c. Filter out common "stop words" and short words.
                            if (cleanKeyword.length > 3 && !stopWords.has(cleanKeyword)) {
                                keywordCounts[cleanKeyword] = (keywordCounts[cleanKeyword] || 0) + 1;
                            }
                        });
                    });
                }
            });
            
            session.allTopics = keywordCounts;

            // d. Find the top 5 most frequent keywords.
            const topKeywords = Object.entries(keywordCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([keyword]) => keyword);

            // e. Set a simple fallback topic (the single most frequent keyword).
            if (topKeywords.length > 0) {
                session.primaryTopic = topKeywords[0];
            }
            
            // f. If we have enough keywords, ask the AI to synthesize a high-level topic.
            if (topKeywords.length > 1 && self.LanguageModel) {
                const synthesisPrompt = `Based on these keywords from a browsing session: [${topKeywords.join(', ')}], generate a short, descriptive title for the session, no more than 8 words.`;
                try {
                    const availability = await self.LanguageModel.availability();
                    if (availability === 'available' || availability === 'readily') {
                        const ai_session = await self.LanguageModel.create();
                        const synthesizedTopic = await ai_session.prompt(synthesisPrompt);
                        // Clean up the AI's response for display.
                        session.primaryTopic = synthesizedTopic.replace(/[#*_"]/g, '').trim();
                        ai_session.destroy();
                    }
                } catch (error) {
                    // If AI synthesis fails, we gracefully fall back to the simple keyword topic.
                    console.error("SESSION_MANAGER: Topic synthesis failed, using most frequent keyword as fallback.", error);
                }
            }
        }
        
        // 6. Score the updated session for "rabbithole" severity.
        const { rabbitholeScore, rabbitholeSeverity } = scoreSession(session);
        session.rabbitholeScore = rabbitholeScore;
        session.rabbitholeSeverity = rabbitholeSeverity;
        
        // 7. Save the fully updated session object back to storage.
        await chrome.storage.session.set({ currentSession: session });

    } catch (error) {
        console.error("SESSION_MANAGER: Error updating session:", error);
    }
}