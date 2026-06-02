"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middlewares/auth");
const qwen_1 = require("../utils/qwen");
const playerAccess_1 = require("../utils/playerAccess");
const progressReport_1 = require("../utils/progressReport");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// ==========================================
// 1. AI SCOUTING REPORTS GENERATOR
// ==========================================
router.post('/scout-report', (0, auth_1.requireRole)(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
    const tenantId = req.tenantId;
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required for generating a scouting report' });
    }
    try {
        // 1. Load player details and recent evaluations
        const playerQuery = `SELECT * FROM players WHERE id = ?`;
        const player = await (0, db_1.executeTenantQuery)(tenantId, playerQuery, [playerId]);
        if (player.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }
        const evaluationsQuery = `
      SELECT scores, overall, notes, evaluated_at 
      FROM evaluations 
      WHERE player_id = ? 
      ORDER BY evaluated_at DESC 
      LIMIT 3;
    `;
        const evaluations = await (0, db_1.executeTenantQuery)(tenantId, evaluationsQuery, [playerId]);
        // Calculate dynamic aggregate scores
        let speedSum = 0, technicalSum = 0, tacticsSum = 0;
        const evalCount = evaluations.length;
        evaluations.forEach((e) => {
            const s = e.scores || {};
            speedSum += Number(s.speed) || 5;
            technicalSum += Number(s.technical) || 5;
            tacticsSum += Number(s.tactics) || 5;
        });
        const avgSpeed = evalCount > 0 ? Math.round(speedSum / evalCount) : 6;
        const avgTech = evalCount > 0 ? Math.round(technicalSum / evalCount) : 6;
        const avgTactics = evalCount > 0 ? Math.round(tacticsSum / evalCount) : 6;
        const apiKey = (0, qwen_1.getQwenApiKey)();
        if (apiKey) {
            console.log('[AI SERVICE] Generating scouting report utilizing Qwen LLM API...');
            const prompt = `
        You are a highly experienced professional football scout and coaching analyst.
        Generate a detailed scouting report for the following youth player:
        - Name: ${player[0].full_name}
        - Current Registered Position: ${player[0].position || 'Midfielder'}
        - Average Stamina/Speed: ${avgSpeed}/10
        - Average Technical: ${avgTech}/10
        - Average Tactics: ${avgTactics}/10
        
        Recent Evaluation Coach Notes:
        "${evaluations.map(e => e.notes).filter(Boolean).join('; ') || 'No previous coach notes'}"

        Provide the output STRICTLY in JSON format with the following exact keys:
        {
          "recommendedPosition": "suggested optimal position on the pitch",
          "strengths": ["list", "of", "strengths"],
          "developmentAreas": ["areas", "to", "improve"],
          "coachActionPlan": ["specific", "drills", "to", "schedule"]
        }
      `;
            try {
                const responseText = await (0, qwen_1.callQwen)([
                    { role: 'system', content: 'You are a professional football scouting director. Output valid JSON only.' },
                    { role: 'user', content: prompt }
                ], true);
                const parsedReport = JSON.parse(responseText);
                return res.json({
                    playerId,
                    playerName: player[0].full_name,
                    metrics: {
                        speedRating: avgSpeed,
                        technicalRating: avgTech,
                        tacticsRating: avgTactics,
                        overallIndex: player[0].xp_total
                    },
                    aiAnalysis: parsedReport,
                    engine: 'Qwen AI (Active)',
                    generatedAt: new Date()
                });
            }
            catch (err) {
                console.error('[AI SERVICE] Qwen live call failed, falling back to simulated engine:', err.message);
            }
        }
        // FALLBACK SIMULATION (If API Key is missing or Qwen call fails)
        console.log('[AI SERVICE] Running premium fallback simulation...');
        let recommendedPosition = player[0].position || 'Midfielder';
        let recommendations = [];
        if (avgSpeed > 8 && avgTech > 7) {
            recommendedPosition = 'Winger / Forward';
            recommendations.push('Leverage high sprinting velocity during offensive counter attacks.');
            recommendations.push('Incorporate dribbling drills under physical pressure (e.g. 1v1 wing sessions).');
        }
        else if (avgTactics > 7 && avgTech > 8) {
            recommendedPosition = 'Playmaker / Central Defensive Midfielder';
            recommendations.push('Control game progression using deep-lying playmaker transitions.');
            recommendations.push('Work on defensive shielding and rapid 1-touch pass options.');
        }
        else {
            recommendations.push('Standardize technical ball control drills and basic stamina runs.');
            recommendations.push('Incorporate weekly pass accuracy milestones.');
        }
        res.json({
            playerId,
            playerName: player[0].full_name,
            metrics: {
                speedRating: avgSpeed,
                technicalRating: avgTech,
                tacticsRating: avgTactics,
                overallIndex: player[0].xp_total
            },
            aiAnalysis: {
                recommendedPosition,
                strengths: avgTech > 7 ? ['Excellent technical footwork', 'Reliable passing range'] : ['Strong stamina', 'Disciplined positioning'],
                developmentAreas: ['Sustained stamina under extreme defensive presses', 'Shot-taking decision speeds'],
                coachActionPlan: recommendations
            },
            engine: 'Simulation Fallback (Add Qwen Key to apiQwen.txt to activate live agent)',
            generatedAt: new Date()
        });
    }
    catch (error) {
        console.error('AI scouting report failed:', error);
        res.status(500).json({ error: 'Failed to generate AI scouting report' });
    }
});
// ==========================================
// 2. EXERCISE TRANSLATION ASSISTANT
// ==========================================
router.post('/translate', async (req, res) => {
    const { text, targetLanguage } = req.body;
    if (!text || !targetLanguage) {
        return res.status(400).json({ error: 'Text content and target language are required' });
    }
    try {
        const apiKey = (0, qwen_1.getQwenApiKey)();
        if (apiKey) {
            console.log('[AI SERVICE] Translating utilizing Qwen LLM API...');
            const prompt = `Translate the following sports exercise description into target language "${targetLanguage}". Return ONLY the translation, no extra comments.\n\nText: "${text}"`;
            const translatedText = await (0, qwen_1.callQwen)([
                { role: 'system', content: 'You are a precise multilingual sports translation assistant.' },
                { role: 'user', content: prompt }
            ]);
            return res.json({
                originalText: text,
                translatedText: translatedText.trim(),
                targetLanguage,
                engine: 'Qwen AI (Active)'
            });
        }
    }
    catch (err) {
        console.error('[AI SERVICE] Qwen translation failed, falling back:', err.message);
    }
    // Fallback translation mapping
    const mockTranslations = {
        fr: {
            'Shoot and score': 'Tirer et marquer',
            'Pass accuracy drill': 'Exercice de précision de passe',
            'Dribbling around cones': 'Dribbler autour des cônes'
        },
        ar: {
            'Shoot and score': 'التسديد والتسجيل',
            'Pass accuracy drill': 'تدريب دقة التمرير',
            'Dribbling around cones': 'المراوغة حول المخاريط'
        }
    };
    const translatedText = mockTranslations[targetLanguage]?.[text] || `${text} [AI Translated to ${targetLanguage.toUpperCase()}]`;
    res.json({
        originalText: text,
        translatedText,
        targetLanguage,
        engine: 'Simulation Fallback (Add Qwen Key to apiQwen.txt to activate live agent)'
    });
});
// ==========================================
// 3. AI DYNAMIC TRAINING GENERATOR
// ==========================================
router.post('/generate-plan', (0, auth_1.requireRole)(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
    const { focusArea, durationMinutes, ageGroup } = req.body;
    if (!focusArea) {
        return res.status(400).json({ error: 'Focus area is required' });
    }
    const duration = Number(durationMinutes) || 60;
    try {
        const apiKey = (0, qwen_1.getQwenApiKey)();
        if (apiKey) {
            console.log('[AI SERVICE] Generating custom plan utilizing Qwen LLM API...');
            const prompt = `
        Create a detailed soccer/football training plan:
        - Focus Area: ${focusArea}
        - Total Duration: ${duration} minutes
        - Target Age Group: ${ageGroup || 'U15'}

        Output strictly in JSON format with the following keys:
        {
          "title": "A catchy title for the session",
          "targetAgeGroup": "${ageGroup || 'U15'}",
          "totalDuration": ${duration},
          "timeline": [
            { "duration": 10, "exerciseName": "Exercise title", "details": "Detailed instructions" }
          ]
        }
      `;
            const responseText = await (0, qwen_1.callQwen)([
                { role: 'system', content: 'You are an elite soccer coach. Output valid JSON only.' },
                { role: 'user', content: prompt }
            ], true);
            const parsedPlan = JSON.parse(responseText);
            return res.json({
                ...parsedPlan,
                engine: 'Qwen AI (Active)'
            });
        }
    }
    catch (err) {
        console.error('[AI SERVICE] Qwen plan generator failed, falling back:', err.message);
    }
    // Fallback
    const d1 = Math.round(duration * 0.15);
    const d2 = Math.round(duration * 0.4);
    const d3 = Math.round(duration * 0.3);
    const d4 = duration - (d1 + d2 + d3);
    const plan = {
        title: `AI Recommended ${focusArea.toUpperCase()} Plan`,
        targetAgeGroup: ageGroup || 'U15',
        totalDuration: duration,
        timeline: [
            { duration: d1, exerciseName: 'Dynamic Muscle Warm-ups', details: 'Low-intensity runs and flexibility drills' },
            { duration: d2, exerciseName: `${focusArea} Core Drills`, details: `Drills focused primarily on the requested focus area: ${focusArea}` },
            { duration: d3, exerciseName: 'Tactical Game Practice', details: 'Half-pitch scrimmage applying the focus area limits' },
            { duration: d4, exerciseName: 'Cool Down & Recovery Stretches', details: 'Decompression jog followed by light muscle stretches' }
        ],
        engine: 'Simulation Fallback (Add Qwen Key to apiQwen.txt to activate live agent)',
        generatedAt: new Date()
    };
    res.json(plan);
});
// ==========================================
// 4. AI PLAYER PROGRESS REPORT
// ==========================================
router.post('/progress-report', async (req, res) => {
    const tenantId = req.tenantId;
    const user = req.user;
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required' });
    }
    if (!user?.userId || !user?.role) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    try {
        const allowed = await (0, playerAccess_1.canAccessPlayer)(tenantId, user.userId, user.role, playerId);
        if (!allowed) {
            return res.status(403).json({
                error: 'You can only generate progress reports for players you are authorized to view',
            });
        }
        const playerRows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT p.id, p.full_name, DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob, p.position, p.status,
              p.xp_total, p.rank, t.name AS team_name
       FROM players p
       LEFT JOIN team_players tp ON tp.player_id = p.id
       LEFT JOIN teams t ON t.id = tp.team_id
       WHERE p.id = ? LIMIT 1`, [playerId]);
        if (!playerRows.length) {
            return res.status(404).json({ error: 'Player not found' });
        }
        const player = playerRows[0];
        const dob = player.dob || null;
        const evaluations = await (0, db_1.executeTenantQuery)(tenantId, `SELECT scores, overall, notes, evaluated_at
       FROM evaluations WHERE player_id = ? ORDER BY evaluated_at DESC LIMIT 10`, [playerId]);
        const { avgSpeed, avgTechnical, avgTactics, notes } = (0, progressReport_1.aggregateEvalMetrics)(evaluations);
        const upcomingEvents = await (0, db_1.executeTenantQuery)(tenantId, `SELECT e.title, e.type, e.starts_at, t.name AS team
       FROM events e
       LEFT JOIN teams t ON e.team_id = t.id
       WHERE e.starts_at >= NOW()
         AND (e.team_id IS NULL OR e.team_id IN (
           SELECT team_id FROM team_players WHERE player_id = ?
         ))
       ORDER BY e.starts_at ASC LIMIT 8`, [playerId]);
        const attendance = await (0, db_1.executeTenantQuery)(tenantId, `SELECT a.status, e.title, e.starts_at
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE a.player_id = ?
       ORDER BY a.marked_at DESC LIMIT 10`, [playerId]);
        const subs = await (0, db_1.executeTenantQuery)(tenantId, `SELECT status, plan, amount, currency, next_due FROM player_subscriptions WHERE player_id = ? LIMIT 1`, [playerId]);
        const recentEvents = upcomingEvents.map((e) => {
            const when = new Date(e.starts_at).toLocaleDateString();
            return `${e.title} (${e.type || 'session'}, ${when}${e.team ? `, ${e.team}` : ''})`;
        });
        let subscriptionSummary = null;
        if (subs.length) {
            const s = subs[0];
            subscriptionSummary = `${s.status} — ${s.plan || 'plan'} ${s.amount} ${s.currency}, next due ${s.next_due ? new Date(s.next_due).toLocaleDateString() : 'n/a'}`;
        }
        let attendanceSummary = null;
        if (attendance.length) {
            const present = attendance.filter((a) => a.status === 'present').length;
            attendanceSummary = `${present}/${attendance.length} recent sessions marked present`;
        }
        const ctx = {
            playerName: player.full_name,
            dob,
            age: (0, progressReport_1.ageFromDob)(dob),
            position: player.position || 'Midfielder',
            team: player.team_name || 'Unassigned',
            status: player.status || 'active',
            xp: Number(player.xp_total) || 0,
            rank: player.rank || 'rookie',
            avgSpeed,
            avgTechnical,
            avgTactics,
            evaluationNotes: notes,
            recentEvents,
            subscriptionSummary,
            attendanceSummary,
        };
        const { report, engine } = await (0, progressReport_1.generateProgressReport)(ctx);
        res.json({
            playerId,
            playerName: player.full_name,
            dob,
            age: ctx.age,
            position: ctx.position,
            team: ctx.team,
            status: ctx.status,
            xp: ctx.xp,
            rank: ctx.rank,
            metrics: {
                speedRating: avgSpeed,
                technicalRating: avgTechnical,
                tacticsRating: avgTactics,
                overallIndex: evaluations[0]?.overall ?? null,
            },
            report,
            engine,
            generatedAt: new Date().toISOString(),
        });
    }
    catch (error) {
        console.error('AI progress report failed:', error);
        res.status(500).json({ error: 'Failed to generate progress report' });
    }
});
exports.default = router;
