"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middlewares/auth");
const parentAccess_1 = require("../utils/parentAccess");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
router.use(auth_1.authenticateToken);
function parentId(req) {
    return req.user.userId;
}
// Full parent hub: children, calendar, billing, academy branding
router.get('/dashboard', (0, auth_1.requireRole)(['PARENT']), async (req, res) => {
    const tenantId = req.tenantId;
    const pid = parentId(req);
    try {
        const playerIds = await (0, parentAccess_1.getParentPlayerIds)(tenantId, pid);
        if (playerIds.length === 0) {
            return res.json({
                children: [],
                upcomingEvents: [],
                subscriptions: [],
                recentEvaluations: [],
                academyProfile: null,
                childAccounts: [],
            });
        }
        const placeholders = playerIds.map(() => '?').join(',');
        const children = await (0, db_1.executeTenantQuery)(tenantId, `SELECT p.id, p.full_name, DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob, p.position, p.status, p.xp_total, p.rank, p.user_id,
              t.name AS team, u.email AS child_login_email
       FROM players p
       LEFT JOIN team_players tp ON tp.player_id = p.id
       LEFT JOIN teams t ON t.id = tp.team_id
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id IN (${placeholders})`, playerIds);
        const calendarQuery = `
      SELECT e.*, t.name AS team
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.starts_at >= NOW()
        AND (
          e.team_id IS NULL
          OR e.team_id IN (
            SELECT tp.team_id FROM team_players tp
            WHERE tp.player_id IN (${placeholders})
          )
        )
      ORDER BY e.starts_at ASC
      LIMIT 20
    `;
        const upcomingEvents = await (0, db_1.executeTenantQuery)(tenantId, calendarQuery, playerIds);
        const subs = await (0, db_1.executeTenantQuery)(tenantId, `SELECT ps.*, p.full_name AS player_name
       FROM player_subscriptions ps
       JOIN players p ON p.id = ps.player_id
       WHERE ps.player_id IN (${placeholders})`, playerIds);
        const evals = await (0, db_1.executeTenantQuery)(tenantId, `SELECT ev.*, p.full_name AS player_name
       FROM evaluations ev
       JOIN players p ON p.id = ev.player_id
       WHERE ev.player_id IN (${placeholders})
       ORDER BY ev.evaluated_at DESC
       LIMIT 10`, playerIds);
        const profileRows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT * FROM academy_profile LIMIT 1`);
        const invoices = await (0, db_1.executeTenantQuery)(tenantId, `SELECT i.*, p.full_name
       FROM invoices i
       JOIN players p ON p.id = i.player_id
       WHERE i.player_id IN (${placeholders})
       ORDER BY i.issued_at DESC
       LIMIT 20`, playerIds);
        res.json({
            children,
            upcomingEvents,
            subscriptions: subs,
            recentEvaluations: evals,
            invoices,
            academyProfile: profileRows[0] || null,
            childAccounts: children.map((c) => ({
                playerId: c.id,
                playerName: c.full_name,
                hasLogin: !!c.user_id,
                childLoginEmail: c.child_login_email || null,
            })),
        });
    }
    catch (error) {
        console.error('Parent dashboard failed:', error);
        res.status(500).json({ error: 'Failed to load parent dashboard' });
    }
});
router.get('/children', (0, auth_1.requireRole)(['PARENT']), async (req, res) => {
    const tenantId = req.tenantId;
    const pid = parentId(req);
    try {
        const playerIds = await (0, parentAccess_1.getParentPlayerIds)(tenantId, pid);
        if (playerIds.length === 0)
            return res.json([]);
        const placeholders = playerIds.map(() => '?').join(',');
        const rows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT p.id, p.full_name, DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob, p.position, p.status,
              p.xp_total, p.rank, p.user_id, p.photo_url,
              t.name AS team, u.email AS child_login_email
       FROM players p
       LEFT JOIN team_players tp ON tp.player_id = p.id
       LEFT JOIN teams t ON t.id = tp.team_id
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id IN (${placeholders})`, playerIds);
        res.json(rows);
    }
    catch (error) {
        console.error('Parent children list failed:', error);
        res.status(500).json({ error: 'Failed to list children' });
    }
});
router.get('/children/:playerId', (0, auth_1.requireRole)(['PARENT']), async (req, res) => {
    const tenantId = req.tenantId;
    const pid = parentId(req);
    const { playerId } = req.params;
    try {
        if (!(await (0, parentAccess_1.parentOwnsPlayer)(tenantId, pid, playerId))) {
            return res.status(403).json({ error: 'You can only view your own children\'s data' });
        }
        const players = await (0, db_1.executeTenantQuery)(tenantId, `SELECT p.id, p.full_name, DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob, p.position, p.status,
              p.xp_total, p.rank, p.user_id, p.photo_url,
              t.name AS team, u.email AS child_login_email
       FROM players p
       LEFT JOIN team_players tp ON tp.player_id = p.id
       LEFT JOIN teams t ON t.id = tp.team_id
       LEFT JOIN users u ON u.id = p.user_id
       WHERE p.id = ? LIMIT 1`, [playerId]);
        if (!players.length)
            return res.status(404).json({ error: 'Player not found' });
        const evaluations = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id, scores, overall, notes, evaluated_at FROM evaluations
       WHERE player_id = ? ORDER BY evaluated_at DESC LIMIT 20`, [playerId]);
        const events = await (0, db_1.executeTenantQuery)(tenantId, `SELECT e.*, t.name AS team
       FROM events e
       LEFT JOIN teams t ON e.team_id = t.id
       WHERE e.starts_at >= NOW()
         AND (e.team_id IS NULL OR e.team_id IN (
           SELECT team_id FROM team_players WHERE player_id = ?
         ))
       ORDER BY e.starts_at ASC LIMIT 15`, [playerId]);
        const attendance = await (0, db_1.executeTenantQuery)(tenantId, `SELECT a.*, e.title, e.starts_at
       FROM attendance a
       JOIN events e ON e.id = a.event_id
       WHERE a.player_id = ?
       ORDER BY a.marked_at DESC LIMIT 20`, [playerId]);
        const subscription = await (0, db_1.executeTenantQuery)(tenantId, `SELECT * FROM player_subscriptions WHERE player_id = ? LIMIT 1`, [playerId]);
        const invoices = await (0, db_1.executeTenantQuery)(tenantId, `SELECT * FROM invoices WHERE player_id = ? ORDER BY issued_at DESC`, [playerId]);
        res.json({
            player: players[0],
            evaluations,
            events,
            attendance,
            subscription: subscription[0] || null,
            invoices,
        });
    }
    catch (error) {
        console.error('Parent child detail failed:', error);
        res.status(500).json({ error: 'Failed to load child profile' });
    }
});
router.get('/calendar', (0, auth_1.requireRole)(['PARENT']), async (req, res) => {
    const tenantId = req.tenantId;
    const pid = parentId(req);
    const { from, to } = req.query;
    try {
        const playerIds = await (0, parentAccess_1.getParentPlayerIds)(tenantId, pid);
        if (playerIds.length === 0)
            return res.json([]);
        const placeholders = playerIds.map(() => '?').join(',');
        let query = `
      SELECT e.*, t.name AS team,
        (SELECT GROUP_CONCAT(p.full_name SEPARATOR ', ')
         FROM team_players tp2
         JOIN players p ON p.id = tp2.player_id
         JOIN parent_children pc ON pc.player_id = p.id
         WHERE tp2.team_id = e.team_id AND pc.parent_user_id = ?
        ) AS your_children
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE (
        e.team_id IS NULL
        OR e.team_id IN (SELECT team_id FROM team_players WHERE player_id IN (${placeholders}))
      )
    `;
        const params = [pid, ...playerIds];
        if (from && to) {
            query += ` AND e.starts_at >= ? AND e.starts_at <= ?`;
            params.push(from, to);
        }
        query += ` ORDER BY e.starts_at ASC`;
        const events = await (0, db_1.executeTenantQuery)(tenantId, query, params);
        res.json(events);
    }
    catch (error) {
        console.error('Parent calendar failed:', error);
        res.status(500).json({ error: 'Failed to load calendar' });
    }
});
// Create child login linked to an existing player (parent-only, optional after registration)
router.post('/children/:playerId/create-login', (0, auth_1.requireRole)(['PARENT']), async (req, res) => {
    const tenantId = req.tenantId;
    const pid = parentId(req);
    const { playerId } = req.params;
    const { childEmail, childPassword, useParentPassword } = req.body;
    try {
        if (!(await (0, parentAccess_1.parentOwnsPlayer)(tenantId, pid, playerId))) {
            return res.status(403).json({ error: 'You can only create login for your own child' });
        }
        const playerRows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id, full_name, user_id FROM players WHERE id = ? LIMIT 1`, [playerId]);
        const player = playerRows[0];
        if (!player)
            return res.status(404).json({ error: 'Player not found' });
        if (player.user_id) {
            return res.status(400).json({ error: 'This child already has a login account' });
        }
        const parentRows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT email, password_hash FROM users WHERE id = ? LIMIT 1`, [pid]);
        const parent = parentRows[0];
        if (!parent)
            return res.status(404).json({ error: 'Parent account not found' });
        const email = (childEmail || '').trim().toLowerCase();
        if (!email) {
            return res.status(400).json({ error: 'Child email is required for player login' });
        }
        const existing = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
        if (existing.length) {
            return res.status(409).json({ error: 'This email is already registered' });
        }
        const password = useParentPassword ? parent.password_hash : (childPassword || parent.password_hash);
        if (!useParentPassword && !childPassword) {
            return res.status(400).json({ error: 'Child password is required' });
        }
        const childUserId = crypto_1.default.randomUUID();
        await (0, db_1.executeTenantQuery)(tenantId, `INSERT INTO users (id, email, password_hash, role, kyc_status, tenant_id)
       VALUES (?, ?, ?, 'PLAYER', 'completed', ?)`, [childUserId, email, password, tenantId]);
        await (0, db_1.executeTenantQuery)(tenantId, `UPDATE players SET user_id = ? WHERE id = ?`, [childUserId, playerId]);
        res.status(201).json({
            message: 'Child login created. Your child can sign in on the Enfant tab.',
            childAccount: { email, role: 'PLAYER', playerId },
        });
    }
    catch (error) {
        console.error('Create child login failed:', error);
        res.status(500).json({ error: 'Failed to create child login' });
    }
});
// Child (PLAYER) — only their own team events
router.get('/player/calendar', (0, auth_1.requireRole)(['PLAYER']), async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.user.userId;
    try {
        const rows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id FROM players WHERE user_id = ? LIMIT 1`, [userId]);
        if (!rows.length)
            return res.json([]);
        const playerId = rows[0].id;
        const events = await (0, db_1.executeTenantQuery)(tenantId, `SELECT e.*, t.name AS team
       FROM events e
       LEFT JOIN teams t ON e.team_id = t.id
       WHERE e.starts_at >= NOW()
         AND (e.team_id IS NULL OR e.team_id IN (
           SELECT team_id FROM team_players WHERE player_id = ?
         ))
       ORDER BY e.starts_at ASC`, [playerId]);
        res.json(events);
    }
    catch (error) {
        console.error('Player calendar failed:', error);
        res.status(500).json({ error: 'Failed to load calendar' });
    }
});
exports.default = router;
