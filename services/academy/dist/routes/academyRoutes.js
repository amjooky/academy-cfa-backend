"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../config/db");
const auth_1 = require("../middlewares/auth");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// ==========================================
// PUBLIC ONLINE REGISTRATION (No Auth Required)
// ==========================================
router.post('/public/register', async (req, res) => {
    const tenantId = req.tenantId || 'demo';
    const { parentEmail, parentPassword, parentPhone, parentName, fullName, dob, position, team, createChildAccount, childEmail, childPassword, useSamePasswordAsParent, } = req.body;
    if (!parentEmail || !parentPassword || !fullName) {
        return res.status(400).json({ error: 'Missing required parent or player registration details' });
    }
    try {
        const parentUserId = crypto_1.default.randomUUID();
        await (0, db_1.executeTenantQuery)(tenantId, `INSERT INTO users (id, email, password_hash, role, kyc_status, tenant_id, full_name, phone)
       VALUES (?, ?, ?, 'PARENT', 'pending', ?, ?, ?)`, [parentUserId, parentEmail, parentPassword, tenantId, parentName || null, parentPhone || null]);
        let childUserId = null;
        let childLoginEmail = null;
        if (createChildAccount) {
            childLoginEmail = (childEmail || '').trim().toLowerCase();
            if (!childLoginEmail) {
                return res.status(400).json({
                    error: 'Child email is required when creating a player login account',
                });
            }
            const taken = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id FROM users WHERE email = ? LIMIT 1`, [childLoginEmail]);
            if (taken.length) {
                return res.status(409).json({ error: 'Child email is already registered' });
            }
            const pwd = useSamePasswordAsParent ? parentPassword : childPassword;
            if (!pwd) {
                return res.status(400).json({ error: 'Child password is required (or enable same password as parent)' });
            }
            childUserId = crypto_1.default.randomUUID();
            await (0, db_1.executeTenantQuery)(tenantId, `INSERT INTO users (id, email, password_hash, role, kyc_status, tenant_id)
         VALUES (?, ?, ?, 'PLAYER', 'pending', ?)`, [childUserId, childLoginEmail, pwd, tenantId]);
        }
        const dobDate = String(dob || '').trim().match(/^(\d{4}-\d{2}-\d{2})/)?.[1] || dob;
        const playerId = crypto_1.default.randomUUID();
        await (0, db_1.executeTenantQuery)(tenantId, `INSERT INTO players (id, user_id, full_name, dob, position, status, photo_url, team)
       VALUES (?, ?, ?, ?, ?, 'pending', '', ?)`, [playerId, childUserId, fullName, dobDate, position, team || null]);
        await (0, db_1.executeTenantQuery)(tenantId, `INSERT IGNORE INTO parent_children (parent_user_id, player_id) VALUES (?, ?)`, [parentUserId, playerId]);
        if (team) {
            const teamRow = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id FROM teams WHERE name = ? LIMIT 1`, [team]);
            if (teamRow.length) {
                await (0, db_1.executeTenantQuery)(tenantId, `INSERT IGNORE INTO team_players (team_id, player_id) VALUES (?, ?)`, [teamRow[0].id, playerId]);
            }
        }
        res.status(201).json({
            message: createChildAccount
                ? 'Registration submitted. Parent and child logins are ready (Enfant tab for your child).'
                : 'Registration submitted. Log in with your parent email (Parent tab). You can add a child login later.',
            player: { id: playerId, full_name: fullName, dob: dobDate, position, status: 'pending', team },
            parentAccount: { email: parentEmail, role: 'PARENT' },
            childAccount: childUserId
                ? { email: childLoginEmail, role: 'PLAYER', playerId }
                : null,
        });
    }
    catch (error) {
        console.error('Online registration failed:', error);
        res.status(500).json({ error: 'Failed to process online registration' });
    }
});
// Ensure all endpoints are authenticated
router.use(auth_1.authenticateToken);
// ==========================================
// 1. ACADEMY BRANDING & CONFIG PROFILE
// ==========================================
// Get branding details
router.get('/profile', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `SELECT * FROM academy_profile LIMIT 1`;
        const profile = await (0, db_1.executeTenantQuery)(tenantId, query);
        res.json(profile[0] || { name: 'My Sports Academy', primaryColor: '#2563EB', secondaryColor: '#F59E0B' });
    }
    catch (error) {
        console.error('Failed to get academy profile:', error);
        res.status(500).json({ error: 'Failed to retrieve academy config profile' });
    }
});
// Update branding details (Admin only)
router.put('/profile', async (req, res) => {
    const tenantId = req.tenantId;
    const { name, logoUrl, primaryColor, secondaryColor, language } = req.body;
    try {
        const checkQuery = `SELECT id FROM academy_profile LIMIT 1`;
        const check = await (0, db_1.executeTenantQuery)(tenantId, checkQuery);
        let query;
        let params;
        const profileId = check.length > 0 ? check[0].id : crypto_1.default.randomUUID();
        if (check.length > 0) {
            query = `
        UPDATE academy_profile 
        SET name = ?, logo_url = ?, primary_color = ?, secondary_color = ?, language = ?
        WHERE id = ?
      `;
            params = [name, logoUrl, primaryColor, secondaryColor, language, profileId];
        }
        else {
            query = `
        INSERT INTO academy_profile (id, name, logo_url, primary_color, secondary_color, language)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
            params = [profileId, name, logoUrl, primaryColor, secondaryColor, language];
        }
        await (0, db_1.executeTenantQuery)(tenantId, query, params);
        res.json({
            message: 'Profile updated successfully',
            profile: { id: profileId, name, logo_url: logoUrl, primary_color: primaryColor, secondary_color: secondaryColor, language }
        });
    }
    catch (error) {
        console.error('Failed to update academy profile:', error);
        res.status(500).json({ error: 'Failed to update academy branding' });
    }
});
// ==========================================
// 2. TEAMS MANAGEMENT
// ==========================================
// Create Team
router.post('/teams', async (req, res) => {
    const tenantId = req.tenantId;
    const { name, ageGroup, coachId, season } = req.body;
    if (!name) {
        return res.status(400).json({ error: 'Team name is required' });
    }
    try {
        const teamId = crypto_1.default.randomUUID();
        const query = `
      INSERT INTO teams (id, name, age_group, coach_id, season)
      VALUES (?, ?, ?, ?, ?)
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, [teamId, name, ageGroup, coachId, season]);
        res.status(201).json({
            message: 'Team created successfully',
            team: { id: teamId, name, age_group: ageGroup, coach_id: coachId, season }
        });
    }
    catch (error) {
        console.error('Failed to create team:', error);
        res.status(500).json({ error: 'Failed to create team' });
    }
});
// List Teams
router.get('/teams', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `SELECT * FROM teams ORDER BY name ASC`;
        const teams = await (0, db_1.executeTenantQuery)(tenantId, query);
        res.json(teams);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch teams' });
    }
});
// ==========================================
// 3. PLAYERS MANAGEMENT
// ==========================================
// Create Player Profile
router.post('/players', async (req, res) => {
    const tenantId = req.tenantId;
    const { userId, fullName, dob, position, photoUrl, team } = req.body;
    if (!fullName) {
        return res.status(400).json({ error: 'Player full name is required' });
    }
    try {
        const playerId = crypto_1.default.randomUUID();
        const query = `
      INSERT INTO players (id, user_id, full_name, dob, position, photo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, [playerId, userId, fullName, dob, position, photoUrl]);
        const createdPlayer = { id: playerId, user_id: userId, full_name: fullName, dob, position, photo_url: photoUrl, xp_total: 100, rank: 'rookie', status: 'active', team };
        // Enroll player in the team if provided
        if (team) {
            const teamQuery = `SELECT id FROM teams WHERE name = ? LIMIT 1`;
            const teamResult = await (0, db_1.executeTenantQuery)(tenantId, teamQuery, [team]);
            if (teamResult.length > 0) {
                const teamId = teamResult[0].id;
                const enrollQuery = `
          INSERT IGNORE INTO team_players (team_id, player_id)
          VALUES (?, ?)
        `;
                await (0, db_1.executeTenantQuery)(tenantId, enrollQuery, [teamId, playerId]);
            }
        }
        res.status(201).json({ message: 'Player created successfully', player: createdPlayer });
    }
    catch (error) {
        console.error('Failed to create player:', error);
        res.status(500).json({ error: 'Failed to create player profile' });
    }
});
// List Players
router.get('/players', async (req, res) => {
    const tenantId = req.tenantId;
    const user = req.user;
    if (user?.role === 'PARENT' || user?.role === 'PLAYER') {
        return res.status(403).json({
            error: 'Use parent portal APIs — you can only access your linked children',
        });
    }
    const { status } = req.query;
    try {
        let query = `
      SELECT p.id, p.user_id, p.full_name,
             DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
             p.position, p.xp_total, p.rank, p.status, p.photo_url, p.team,
             t.name as team
      FROM players p
      LEFT JOIN team_players tp ON p.id = tp.player_id
      LEFT JOIN teams t ON tp.team_id = t.id
      WHERE p.status = 'active'
      ORDER BY p.full_name ASC
    `;
        if (status === 'pending') {
            query = `
        SELECT p.id, p.user_id, p.full_name,
               DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
               p.position, p.xp_total, p.rank, p.status, p.photo_url, p.team,
               t.name as team
        FROM players p
        LEFT JOIN team_players tp ON p.id = tp.player_id
        LEFT JOIN teams t ON tp.team_id = t.id
        WHERE p.status = 'pending'
        ORDER BY p.full_name ASC
      `;
        }
        else if (status === 'all') {
            query = `
        SELECT p.id, p.user_id, p.full_name,
               DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
               p.position, p.xp_total, p.rank, p.status, p.photo_url, p.team,
               t.name as team
        FROM players p
        LEFT JOIN team_players tp ON p.id = tp.player_id
        LEFT JOIN teams t ON tp.team_id = t.id
        ORDER BY p.full_name ASC
      `;
        }
        const players = await (0, db_1.executeTenantQuery)(tenantId, query);
        res.json(players);
    }
    catch (error) {
        console.error('Failed to fetch players list:', error);
        res.status(500).json({ error: 'Failed to fetch players list' });
    }
});
// ==========================================
// 4. TEAM-PLAYER ASSOCIATION (ENROLLMENT)
// ==========================================
// Enroll Player into Team
router.post('/teams/:id/players', async (req, res) => {
    const tenantId = req.tenantId;
    const teamId = req.params.id;
    const { playerId } = req.body;
    if (!playerId) {
        return res.status(400).json({ error: 'Player ID is required for enrollment' });
    }
    try {
        const query = `
      INSERT IGNORE INTO team_players (team_id, player_id)
      VALUES (?, ?)
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, [teamId, playerId]);
        res.status(200).json({
            message: 'Player enrolled into team successfully',
            association: { team_id: teamId, player_id: playerId }
        });
    }
    catch (error) {
        console.error('Failed to enroll player:', error);
        res.status(500).json({ error: 'Failed to enroll player into team' });
    }
});
// ==========================================
// 5. REGISTRATIONS REVIEW (ADMIN ONLY)
// ==========================================
// List Pending Registrations
router.get('/registrations', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        // MySQL does not have p.created_at, we order by p.full_name or p.id
        const query = `
      SELECT p.id, p.user_id, p.full_name,
             DATE_FORMAT(p.dob, '%Y-%m-%d') AS dob,
             p.position, p.xp_total, p.rank, p.status, p.photo_url, p.team,
             t.name AS team,
             u.email AS parent_email,
             u.full_name AS parent_name,
             u.phone AS parent_phone
      FROM players p
      LEFT JOIN parent_children pc ON pc.player_id = p.id
      LEFT JOIN users u ON u.id = pc.parent_user_id
      LEFT JOIN team_players tp ON tp.player_id = p.id
      LEFT JOIN teams t ON t.id = tp.team_id
      WHERE p.status = 'pending'
      ORDER BY p.full_name ASC
    `;
        const pending = await (0, db_1.executeTenantQuery)(tenantId, query);
        res.json(pending);
    }
    catch (error) {
        console.error('Failed to fetch pending registrations:', error);
        res.status(500).json({ error: 'Failed to fetch pending registrations' });
    }
});
// Approve Pending Registration
router.post('/registrations/:id/approve', async (req, res) => {
    const tenantId = req.tenantId;
    const playerId = req.params.id;
    const { teamName } = req.body;
    try {
        const updateQuery = `
      UPDATE players
      SET status = ?
      WHERE id = ?
    `;
        await (0, db_1.executeTenantQuery)(tenantId, updateQuery, ['active', playerId]);
        // Query updated player to return
        const getPlayerQuery = `SELECT * FROM players WHERE id = ? LIMIT 1`;
        const playerRows = await (0, db_1.executeTenantQuery)(tenantId, getPlayerQuery, [playerId]);
        const player = playerRows[0];
        if (!player) {
            return res.status(404).json({ error: 'Player registration not found' });
        }
        if (teamName) {
            const teamQuery = `SELECT id FROM teams WHERE name = ? LIMIT 1`;
            const teamResult = await (0, db_1.executeTenantQuery)(tenantId, teamQuery, [teamName]);
            if (teamResult.length > 0) {
                const teamId = teamResult[0].id;
                const enrollQuery = `
          INSERT IGNORE INTO team_players (team_id, player_id)
          VALUES (?, ?)
        `;
                await (0, db_1.executeTenantQuery)(tenantId, enrollQuery, [teamId, playerId]);
            }
        }
        const parentLink = await (0, db_1.executeTenantQuery)(tenantId, `SELECT parent_user_id FROM parent_children WHERE player_id = ? LIMIT 1`, [playerId]);
        await (0, db_1.executeTenantQuery)(tenantId, `INSERT IGNORE INTO player_subscriptions (id, player_id, parent_user_id, plan, amount, currency, status, next_due)
       VALUES (?, ?, ?, 'monthly', 120, 'TND', 'pending', DATE_ADD(CURDATE(), INTERVAL 1 MONTH))`, [crypto_1.default.randomUUID(), playerId, parentLink[0]?.parent_user_id || null]);
        res.json({ message: 'Registration approved successfully', player });
    }
    catch (error) {
        console.error('Failed to approve registration:', error);
        res.status(500).json({ error: 'Failed to approve registration' });
    }
});
// Reject Pending Registration
router.post('/registrations/:id/reject', async (req, res) => {
    const tenantId = req.tenantId;
    const playerId = req.params.id;
    try {
        const query = `
      UPDATE players
      SET status = ?
      WHERE id = ?
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, ['rejected', playerId]);
        const getPlayerQuery = `SELECT * FROM players WHERE id = ? LIMIT 1`;
        const playerRows = await (0, db_1.executeTenantQuery)(tenantId, getPlayerQuery, [playerId]);
        res.json({ message: 'Registration rejected successfully', player: playerRows[0] });
    }
    catch (error) {
        console.error('Failed to reject registration:', error);
        res.status(500).json({ error: 'Failed to reject registration' });
    }
});
exports.default = router;
