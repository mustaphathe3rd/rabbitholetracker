// background/session-manager.js
// Corrected to always provide the 'allTopics' object for the detector.

import { scoreSession } from './rabbithole-detector.js';

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
                allTopics: {}, // <-- FIX #1: ADD THIS LINE BACK
                primaryTopic: 'Unknown',
                lastActivity: now
            };
            console.log("SESSION_MANAGER: Created new session:", session.id);
        }
        
        session.pages.push(pageData);
        session.lastActivity = now;
        const domain = new URL(pageData.url).hostname;
        if (!session.domains.includes(domain)) {
            session.domains.push(domain);
        }

        if (session.pages.length > 0) {
            // --- FIX #2: ENSURE WE POPULATE session.allTopics ---
            const keywordCounts = {}; // We'll still use a local var for counting
            const stopWords = new Set(['a', 'an', 'the', 'in', 'on', 'of', 'for', 'to', 'and', 'is', 'was', 'as', 'it']);

            session.pages.forEach(page => {
                if (page.aiTopics) {
                    page.aiTopics.forEach(topicSentence => {
                        const keywords = topicSentence.split(/\s+/);
                        keywords.forEach(keyword => {
                            const cleanKeyword = keyword.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"").toLowerCase();
                            if (cleanKeyword.length > 3 && !stopWords.has(cleanKeyword)) {
                                keywordCounts[cleanKeyword] = (keywordCounts[cleanKeyword] || 0) + 1;
                            }
                        });
                    });
                }
            });
            
            // Assign the final counts to the session object for the detector to use
            session.allTopics = keywordCounts;

            const topKeywords = Object.entries(keywordCounts).sort(([, a], [, b]) => b - a).slice(0, 5).map(([keyword]) => keyword);

            if (topKeywords.length > 0) {
                session.primaryTopic = topKeywords[0];
            }
	    if (topKeywords.length > 1 && self.LanguageModel) {
                const synthesisPrompt = `Based on these keywords from a browsing session: [${topKeywords.join(', ')}], generate a short, descriptive title for the session, no more than 8 words.`;
                try {
                    const availability = await self.LanguageModel.availability();
                    if (availability === 'available' || availability === 'readily') {
                        console.log("SESSION_MANAGER: Attempting to synthesize a better topic...");
                        const ai_session = await self.LanguageModel.create();
                        const synthesizedTopic = await ai_session.prompt(synthesisPrompt);
                        // Clean up the response (remove quotes, trim whitespace)
                        session.primaryTopic = synthesizedTopic.replace(/[#*_"]/g, '').trim();
                        console.log("SESSION_MANAGER: Synthesized a new topic:", session.primaryTopic);
                        ai_session.destroy();
                    }
                } catch (error) {
                    console.error("SESSION_MANAGER: Topic synthesis failed, using most frequent keyword as fallback.", error);
                    // If synthesis fails, we just keep the fallback topic set in step 3.
                }
            }
                   }
        
        const { rabbitholeScore, rabbitholeSeverity } = scoreSession(session);
        session.rabbitholeScore = rabbitholeScore;
        session.rabbitholeSeverity = rabbitholeSeverity;
        
        await chrome.storage.session.set({ currentSession: session });
        console.log("SESSION_MANAGER: Updated session.", session);

    } catch (error) {
        console.error("SESSION_MANAGER: Error updating session:", error);
    }
}