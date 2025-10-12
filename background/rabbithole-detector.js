// background/rabbithole-detector.js
/**
 * @file This module contains the core heuristic algorithm for analyzing a browsing session
 * and calculating a "rabbithole" score to determine its severity. It quantifies how much
 * a browsing journey resembles an unintentional, deep dive across the web.
 */

/**
 * Calculates a numerical score for a given session based on several weighted factors.
 * A higher score indicates a higher likelihood of the session being a "rabbithole".
 *
 * @param {object} session - The session object from `chrome.storage.session`, containing details about the browsing journey.
 * @returns {{rabbitholeScore: number, rabbitholeSeverity: string}} - An object containing the final numerical score and a severity label ('Low', 'Medium', 'High').
 */
export function scoreSession(session) {
    let score = 0;

    // --- Scoring Factors ---
    // The final score is an aggregate of several weighted metrics designed to quantify "rabbithole" behavior.

    // Factor 1: Time Duration. Longer sessions are more likely to be rabbitholes.
    // Weighting: 0.5 points are added for every minute the session lasts.
    const durationInMinutes = (session.lastActivity - session.startTime) / 60000;
    score += durationInMinutes * 0.5;

    // Factor 2: Domain Hops. A high number of unique domains suggests topic drifting and wide exploration.
    // Weighting: 1.5 points are added for every unique domain visited.
    const domainCount = session.domains.length;
    score += domainCount * 1.5;

    // Factor 3: Page Depth. A high number of total pages visited within the session indicates a deep dive.
    // Weighting: 0.2 points are added for each individual page visit.
    const pageCount = session.pages.length;
    score += pageCount * 0.2;

    // Factor 4: Topic Diversity (powered by AI data). A high number of unique keywords
    // suggests a lack of focus or a wide-ranging, exploratory rabbithole.
    // Weighting: 2 points are added for every unique topic keyword found.
    // This is a robust check that prevents a crash if `session.allTopics` is missing for any reason.
    const uniqueTopics = session.allTopics ? Object.keys(session.allTopics).length : 0;
    if (uniqueTopics > 1) {
        score += uniqueTopics * 2;
    }

    // --- Severity Classification ---
    // The final numerical score is classified into a simple, human-readable severity level.
    // These thresholds (15 and 30) can be adjusted to change the sensitivity of the detector.
    let severity = 'Low';
    if (score > 15) severity = 'Medium';
    if (score > 30) severity = 'High';

    // Log the result for debugging and verification purposes.
    console.log(`DETECTOR: Scored session ${session.id}. Score: ${score.toFixed(2)}, Severity: ${severity}`);
    
    // Return the final score and severity level as a structured object.
    return {
        rabbitholeScore: parseFloat(score.toFixed(2)),
        rabbitholeSeverity: severity
    };
}