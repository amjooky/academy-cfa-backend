"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middlewares/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
// ==========================================
// 1. XP REWARDS & RANKS CALCULATION
// ==========================================
// Helper function to resolve Rank from total XP points
function calculateRank(xp) {
    if (xp >= 5000)
        return 'legend';
    if (xp >= 3000)
        return 'elite';
    if (xp >= 1500)
        return 'pro';
    if (xp >= 500)
        return 'challenger';
    return 'rookie';
}
// Award XP to player (Coaches only)
router.post('/xp/award', (0, auth_1.requireRole)(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
    const tenantId = req.tenantId;
    const { playerId, xpAmount } = req.body;
    if (!playerId || !xpAmount) {
        return res.status(400).json({ error: 'Player ID and XP amount are required' });
    }
    const addedXp = Number(xpAmount);
    if (isNaN(addedXp) || addedXp <= 0) {
        return res.status(400).json({ error: 'XP amount must be a positive integer' });
    }
    try {
        // 1. Retrieve current XP
        const getQuery = `SELECT xp_total, rank FROM players WHERE id = ?`;
        const playerRecord = await (0, db_1.executeTenantQuery)(tenantId, getQuery, [playerId]);
        if (playerRecord.length === 0) {
            return res.status(404).json({ error: 'Player not found' });
        }
        const currentXp = Number(playerRecord[0].xp_total) || 0;
        const newXpTotal = currentXp + addedXp;
        const resolvedRank = calculateRank(newXpTotal);
        // 2. Update player stats
        const updateQuery = `
      UPDATE players 
      SET xp_total = ?, rank = ? 
      WHERE id = ?
    `;
        await (0, db_1.executeTenantQuery)(tenantId, updateQuery, [newXpTotal, resolvedRank, playerId]);
        const selectQuery = `SELECT xp_total, rank, full_name FROM players WHERE id = ? LIMIT 1`;
        const selectResult = await (0, db_1.executeTenantQuery)(tenantId, selectQuery, [playerId]);
        const updatedPlayer = selectResult[0];
        const isRankUp = resolvedRank !== playerRecord[0].rank;
        res.json({
            message: 'XP successfully awarded to player',
            playerName: updatedPlayer.full_name,
            xpAdded: addedXp,
            xpTotal: updatedPlayer.xp_total,
            rank: updatedPlayer.rank,
            isRankUp
        });
    }
    catch (error) {
        console.error('XP Award failure:', error);
        res.status(500).json({ error: 'Failed to award XP' });
    }
});
// ==========================================
// 2. BADGES & ACHIEVEMENTS MANAGEMENT
// ==========================================
// Unlock Achievement Badge for Player (Coaches only)
router.post('/badges/unlock', (0, auth_1.requireRole)(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
    const tenantId = req.tenantId;
    const { playerId, badgeName } = req.body;
    if (!playerId || !badgeName) {
        return res.status(400).json({ error: 'Player ID and badge name are required' });
    }
    try {
        const checkQuery = `SELECT player_id FROM player_badges WHERE player_id = ? AND badge_name = ? LIMIT 1`;
        const existing = await (0, db_1.executeTenantQuery)(tenantId, checkQuery, [playerId, badgeName]);
        if (existing.length > 0) {
            return res.status(409).json({ error: 'Badge already unlocked for this player' });
        }
        const query = `
      INSERT INTO player_badges (player_id, badge_name, unlocked_at)
      VALUES (?, ?, NOW())
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, [playerId, badgeName]);
        res.status(201).json({
            message: 'Achievement badge unlocked!',
            badge: { player_id: playerId, badge_name: badgeName, unlocked_at: new Date() }
        });
    }
    catch (error) {
        console.error('Failed to unlock badge:', error);
        res.status(500).json({ error: 'Failed to record achievement badge' });
    }
});
// Get player achievements unlocked
router.get('/players/:id/achievements', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `SELECT badge_name, unlocked_at FROM player_badges WHERE player_id = ?`;
        const list = await (0, db_1.executeTenantQuery)(tenantId, query, [req.params.id]);
        res.json(list);
    }
    catch (error) {
        console.error('Failed to fetch player achievements:', error);
        res.status(500).json({ error: 'Failed to fetch player achievements' });
    }
});
// ==========================================
// 3. XP LEADERBOARDS
// ==========================================
router.get('/leaderboard', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `
      SELECT id, full_name, xp_total, rank 
      FROM players 
      ORDER BY xp_total DESC 
      LIMIT 25
    `;
        const leaderboard = await (0, db_1.executeTenantQuery)(tenantId, query);
        res.json(leaderboard);
    }
    catch (error) {
        console.error('Failed to get leaderboard:', error);
        res.status(500).json({ error: 'Failed to query leaderboard' });
    }
});
exports.default = router;
