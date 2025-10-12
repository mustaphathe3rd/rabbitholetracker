// background/rabbithole-detector.js
// This module contains the core heuristic algorithm for analyzing a browsing session
// and calculating a "rabbithole" score to determine its severity.

/**
 * Calculates a numerical score for a given session based on several weighted factors.
 * A higher score indicates a higher likelihood of the session being a "rabbithole".
 * @param {object} session - The session object from `chrome.storage.session`.
 * @returns {object} - An object containing the final score and a severity label ('Low', 'Medium', 'High').
 */
export function scoreSession(session) {
    let score = 0;

    // --- Scoring Factors ---

    // Factor 1: Time Duration. Longer sessions contribute more to the score.
    // Weighting: 0.5 points per minute.
    const durationInMinutes = (session.lastActivity - session.startTime) / 60000;
    score += durationInMinutes * 0.5;

    // Factor 2: Domain Hops. A high number of unique domains suggests topic drifting.
    // Weighting: 1.5 points per unique domain.
    const domainCount = session.domains.length;
    score += domainCount * 1.5;

    // Factor 3: Page Depth. A high number of pages visited contributes to the score.
    // Weighting: 0.2 points per page.
    const pageCount = session.pages.length;
    score += pageCount * 0.2;

    // Factor 4: Topic Diversity (using AI data). A high number of unique keywords suggests a lack of focus.
    // This is a robust check that ensures the function doesn't crash if `allTopics` is missing.
    // Weighting: 2 points per unique topic keyword.
    const uniqueTopics = session.allTopics ? Object.keys(session.allTopics).length : 0;
    if (uniqueTopics > 1) {
        score += uniqueTopics * 2;
    }

    // --- Severity Classification ---
    // Classify the final score into a human-readable severity level.
    let severity = 'Low';
    if (score > 15) severity = 'Medium';
    if (score > 30) severity = 'High';
    
    // Return the calculated score and severity.
    return {
        rabbitholeScore: parseFloat(score.toFixed(2)),
        rabbitholeSeverity: severity
    };
}