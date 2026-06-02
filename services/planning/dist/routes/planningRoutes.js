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
router.use(auth_1.authenticateToken);
// ==========================================
// 1. EVENTS CRUD OPERATIONS
// ==========================================
// Create Event (Coaches and Admins only)
router.post('/events', (0, auth_1.requireRole)(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
    const tenantId = req.tenantId;
    const { title, type, teamId, location, startsAt, endsAt } = req.body;
    if (!title || !startsAt || !endsAt) {
        return res.status(400).json({ error: 'Title, start time, and end time are required' });
    }
    try {
        const eventId = crypto_1.default.randomUUID();
        const normalizedType = String(type || 'training').toLowerCase();
        const query = `
      INSERT INTO events (id, title, type, team_id, location, starts_at, ends_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, [
            eventId,
            title,
            normalizedType,
            teamId,
            location,
            startsAt,
            endsAt
        ]);
        res.status(201).json({
            message: 'Event scheduled successfully',
            event: { id: eventId, title, type: normalizedType, team_id: teamId, location, starts_at: startsAt, ends_at: endsAt }
        });
    }
    catch (error) {
        console.error('Failed to schedule event:', error);
        res.status(500).json({ error: 'Failed to create event schedule' });
    }
});
// List Calendar/Events (staff: all; parent: use /api/v1/parent/calendar instead)
router.get('/calendar', async (req, res) => {
    const tenantId = req.tenantId;
    const { from, to } = req.query;
    const user = req.user;
    if (user?.role === 'PARENT') {
        return res.status(403).json({
            error: 'Parents must use /api/v1/parent/calendar to see only their children\'s events',
        });
    }
    if (user?.role === 'PLAYER') {
        return res.status(403).json({
            error: 'Players must use /api/v1/parent/player/calendar for their own schedule',
        });
    }
    try {
        let query = `
      SELECT e.*, t.name AS team
      FROM events e
      LEFT JOIN teams t ON e.team_id = t.id
    `;
        const params = [];
        if (from && to) {
            query += ` WHERE e.starts_at >= ? AND e.starts_at <= ?`;
            params.push(from, to);
        }
        query += ` ORDER BY e.starts_at ASC`;
        const events = await (0, db_1.executeTenantQuery)(tenantId, query, params);
        res.json(events);
    }
    catch (error) {
        console.error('Failed to fetch calendar:', error);
        res.status(500).json({ error: 'Failed to fetch calendar schedules' });
    }
});
// Get single event
router.get('/events/:id', async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `SELECT * FROM events WHERE id = ?`;
        const event = await (0, db_1.executeTenantQuery)(tenantId, query, [req.params.id]);
        if (event.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        res.json(event[0]);
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch event details' });
    }
});
// Delete Event
router.delete('/events/:id', (0, auth_1.requireRole)(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
    const tenantId = req.tenantId;
    const eventId = req.params.id;
    try {
        const checkQuery = `SELECT id FROM events WHERE id = ?`;
        const check = await (0, db_1.executeTenantQuery)(tenantId, checkQuery, [eventId]);
        if (check.length === 0) {
            return res.status(404).json({ error: 'Event not found' });
        }
        const query = `DELETE FROM events WHERE id = ?`;
        await (0, db_1.executeTenantQuery)(tenantId, query, [eventId]);
        res.json({ message: 'Event deleted successfully', id: eventId });
    }
    catch (error) {
        console.error('Failed to delete event:', error);
        res.status(500).json({ error: 'Failed to delete event' });
    }
});
// ==========================================
// 2. ATTENDANCE MANAGEMENT
// ==========================================
// Mark Attendance
router.post('/events/:id/attendance', (0, auth_1.requireRole)(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
    const tenantId = req.tenantId;
    const eventId = req.params.id;
    const { playerId, status } = req.body; // status: present, absent, late, excused
    if (!playerId || !status) {
        return res.status(400).json({ error: 'Player ID and status are required' });
    }
    try {
        const query = `
      INSERT INTO attendance (event_id, player_id, status, marked_at)
      VALUES (?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE status = VALUES(status), marked_at = NOW()
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, [eventId, playerId, status]);
        res.json({
            message: 'Attendance marked successfully',
            record: { event_id: eventId, player_id: playerId, status, marked_at: new Date() }
        });
    }
    catch (error) {
        console.error('Failed to mark attendance:', error);
        res.status(500).json({ error: 'Failed to mark attendance' });
    }
});
// Get Event Attendance Roster
router.get('/events/:id/attendance', async (req, res) => {
    const tenantId = req.tenantId;
    const eventId = req.params.id;
    try {
        const query = `
      SELECT a.*, p.full_name 
      FROM attendance a
      JOIN players p ON a.player_id = p.id
      WHERE a.event_id = ?
    `;
        const roster = await (0, db_1.executeTenantQuery)(tenantId, query, [eventId]);
        res.json(roster);
    }
    catch (error) {
        console.error('Failed to get attendance roster:', error);
        res.status(500).json({ error: 'Failed to load attendance roster' });
    }
});
exports.default = router;
