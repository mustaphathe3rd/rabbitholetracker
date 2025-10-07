// background/rabbithole-detector.js
// Made more robust with a safeguard check.

export function scoreSession(session) {
    let score = 0;

    const durationInMinutes = (session.lastActivity - session.startTime) / 60000;
    score += durationInMinutes * 0.5;

    const domainCount = session.domains.length;
    score += domainCount * 1.5;

    const pageCount = session.pages.length;
    score += pageCount * 0.2;

    // --- THIS IS THE SAFEGUARD FIX ---
    // We check if session.allTopics exists before trying to get its keys.
    // If it doesn't, we just treat the number of unique topics as 0.
    const uniqueTopics = session.allTopics ? Object.keys(session.allTopics).length : 0;
    if (uniqueTopics > 1) {
        score += uniqueTopics * 2;
    }
    // --- END OF FIX ---

    let severity = 'Low';
    if (score > 15) severity = 'Medium';
    if (score > 30) severity = 'High';

    console.log(`DETECTOR: Scored session ${session.id}. Score: ${score.toFixed(2)}, Severity: ${severity}`);
    
    return {
        rabbitholeScore: parseFloat(score.toFixed(2)),
        rabbitholeSeverity: severity
    };
}