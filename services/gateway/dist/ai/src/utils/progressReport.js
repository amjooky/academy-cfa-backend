"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ageFromDob = ageFromDob;
exports.aggregateEvalMetrics = aggregateEvalMetrics;
exports.buildFallbackReport = buildFallbackReport;
exports.generateProgressReport = generateProgressReport;
const qwen_1 = require("./qwen");
function ageFromDob(dob) {
    if (!dob)
        return null;
    const d = new Date(dob);
    if (Number.isNaN(d.getTime()))
        return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate()))
        age--;
    return age;
}
function parseScores(raw) {
    if (!raw)
        return {};
    if (typeof raw === 'string') {
        try {
            return JSON.parse(raw);
        }
        catch {
            return {};
        }
    }
    return raw;
}
function aggregateEvalMetrics(evaluations) {
    let speedSum = 0;
    let technicalSum = 0;
    let tacticsSum = 0;
    const notes = [];
    const count = evaluations.length;
    evaluations.forEach((e) => {
        const s = parseScores(e.scores);
        speedSum += Number(s.speed) || 5;
        technicalSum += Number(s.technical) || 5;
        tacticsSum += Number(s.tactics) || 5;
        if (e.notes?.trim())
            notes.push(e.notes.trim());
    });
    return {
        avgSpeed: count > 0 ? Math.round(speedSum / count) : 6,
        avgTechnical: count > 0 ? Math.round(technicalSum / count) : 6,
        avgTactics: count > 0 ? Math.round(tacticsSum / count) : 6,
        notes,
    };
}
function buildFallbackReport(ctx) {
    const { avgSpeed, avgTechnical, avgTactics, playerName, position, team } = ctx;
    const strengths = [];
    const areasToImprove = [];
    const developmentPlanRecommendations = [];
    if (avgTechnical >= 7) {
        strengths.push('Strong ball control and technical execution under pressure.');
    }
    else {
        areasToImprove.push('Technical control and first-touch consistency in tight spaces.');
        developmentPlanRecommendations.push(`Schedule ${team} small-sided rondo sessions (4v2) focused on one-touch passing and receiving on the back foot.`);
    }
    if (avgSpeed >= 7) {
        strengths.push('Explosive acceleration and recovery runs in transition.');
    }
    else {
        areasToImprove.push('Sprint explosiveness and repeated high-intensity efforts.');
        developmentPlanRecommendations.push('Add twice-weekly 20m repeat-sprint blocks (6–8 reps, full recovery) before tactical segments.');
    }
    if (avgTactics >= 7) {
        strengths.push('Good tactical awareness — pressing triggers and positional discipline.');
    }
    else {
        areasToImprove.push('Tactical positioning, pressing coordination, and off-ball movement.');
        developmentPlanRecommendations.push(`Run ${team} phase-of-play drills on defensive shape (low block → mid-block transition) with coach freeze-and-reset cues.`);
    }
    if (strengths.length === 0) {
        strengths.push('Committed training attendance and coachable attitude in squad sessions.');
    }
    if (developmentPlanRecommendations.length < 3) {
        developmentPlanRecommendations.push(`Tailor weekly homework for ${position} role: video review of last match clips plus 15-minute position-specific finishing or passing patterns.`);
    }
    if (developmentPlanRecommendations.length < 4 && ctx.evaluationNotes.length > 0) {
        developmentPlanRecommendations.push(`Address coach feedback: "${ctx.evaluationNotes[0].slice(0, 120)}${ctx.evaluationNotes[0].length > 120 ? '…' : ''}"`);
    }
    while (developmentPlanRecommendations.length < 3) {
        developmentPlanRecommendations.push('Track weekly self-assessment scores (speed, technique, tactics) and review with coaching staff every 4 weeks.');
    }
    const agePart = ctx.age != null ? `${ctx.age} years old` : 'age not on file';
    const summary = `${playerName} (${agePart}, ${position}, ${team}) shows a balanced profile with speed ${avgSpeed}/10, ` +
        `technique ${avgTechnical}/10, and tactics ${avgTactics}/10. ` +
        `Current rank: ${ctx.rank.toUpperCase()} (${ctx.xp} XP). ` +
        (ctx.subscriptionSummary ? `Subscription: ${ctx.subscriptionSummary}. ` : '') +
        `Focus the next training block on the highest-impact gaps identified below.`;
    return {
        summary,
        strengths: strengths.slice(0, 4),
        areasToImprove: areasToImprove.slice(0, 4),
        developmentPlanRecommendations: developmentPlanRecommendations.slice(0, 5),
    };
}
async function generateProgressReport(ctx) {
    const apiKey = (0, qwen_1.getQwenApiKey)();
    if (apiKey) {
        const prompt = `
You are an elite youth football academy coach writing a parent-facing progress report.

Player profile:
- Name: ${ctx.playerName}
- Date of birth: ${ctx.dob || 'unknown'}
- Age: ${ctx.age ?? 'unknown'}
- Position: ${ctx.position}
- Team: ${ctx.team}
- Enrollment status: ${ctx.status}
- XP: ${ctx.xp}
- Rank: ${ctx.rank}
- Average speed/stamina score: ${ctx.avgSpeed}/10
- Average technical score: ${ctx.avgTechnical}/10
- Average tactical score: ${ctx.avgTactics}/10

Recent coach evaluation notes:
${ctx.evaluationNotes.length ? ctx.evaluationNotes.map((n) => `- ${n}`).join('\n') : '- None recorded'}

Upcoming / recent events:
${ctx.recentEvents.length ? ctx.recentEvents.map((e) => `- ${e}`).join('\n') : '- None listed'}

${ctx.subscriptionSummary ? `Subscription: ${ctx.subscriptionSummary}` : ''}
${ctx.attendanceSummary ? `Attendance: ${ctx.attendanceSummary}` : ''}

Write a detailed, encouraging, specific progress report. Use real metrics — do NOT use generic placeholder drills.

Output STRICTLY as JSON with these exact keys:
{
  "summary": "2-4 sentence overview for parents",
  "strengths": ["3-5 specific strengths"],
  "areasToImprove": ["2-4 specific areas"],
  "developmentPlanRecommendations": ["3-5 actionable training recommendations tailored to this player"]
}
`;
        try {
            const responseText = await (0, qwen_1.callQwen)([
                {
                    role: 'system',
                    content: 'You are a professional youth football academy coach. Output valid JSON only, no markdown.',
                },
                { role: 'user', content: prompt },
            ], true);
            const parsed = JSON.parse(responseText);
            if (parsed.summary &&
                Array.isArray(parsed.strengths) &&
                Array.isArray(parsed.areasToImprove) &&
                Array.isArray(parsed.developmentPlanRecommendations)) {
                return {
                    report: {
                        summary: String(parsed.summary),
                        strengths: parsed.strengths.map(String).slice(0, 5),
                        areasToImprove: parsed.areasToImprove.map(String).slice(0, 5),
                        developmentPlanRecommendations: parsed.developmentPlanRecommendations
                            .map(String)
                            .slice(0, 5),
                    },
                    engine: 'Qwen AI (Active)',
                };
            }
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[AI SERVICE] Progress report LLM failed, using fallback:', msg);
        }
    }
    return {
        report: buildFallbackReport(ctx),
        engine: 'Simulation Fallback (set GROQ_API_KEY or QWEN_API_KEY for live AI)',
    };
}
