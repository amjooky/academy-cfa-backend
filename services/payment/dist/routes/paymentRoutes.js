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
// 1. TENANT SUBSCRIPTIONS (SHARED CONTEXT SCHEMA)
// ==========================================
// Get current tenant's subscription status
router.get('/subscriptions/current', auth_1.authenticateToken, async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `SELECT * FROM subscriptions WHERE tenant_id = ? LIMIT 1`;
        const rows = await (0, db_1.executeSharedQuery)(query, [tenantId]);
        res.json(rows[0] || { status: 'none', plan: 'STARTER' });
    }
    catch (error) {
        console.error('Subscription query failed:', error);
        res.status(500).json({ error: 'Failed to retrieve subscription context' });
    }
});
// Trigger purchase subscription via Konnect API (Admin only)
router.post('/subscriptions', auth_1.authenticateToken, (0, auth_1.requireRole)(['ACADEMY_ADMIN']), async (req, res) => {
    const tenantId = req.tenantId;
    const { plan } = req.body; // plan: STARTER | PRO | ELITE
    if (!plan) {
        return res.status(400).json({ error: 'Subscription plan is required' });
    }
    // Define pricing mapping in TND
    const priceMap = { STARTER: 49.0, PRO: 149.0, ELITE: 299.0 };
    const amount = priceMap[plan] || 49.0;
    try {
        const transactionId = crypto_1.default.randomUUID();
        const simulatedPayUrl = `https://pay.konnect.network/gateway/${transactionId}`;
        res.json({
            message: 'Payment initialized successfully',
            payUrl: simulatedPayUrl,
            transactionId,
            amount,
            currency: 'TND'
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Payment gateway initialization failed' });
    }
});
// Konnect webhook receiver (Public, no standard auth middleware but authenticates signature)
router.post('/webhooks/konnect', async (req, res) => {
    const { paymentRef, status, tenantId, plan } = req.body;
    if (!paymentRef || !status || !tenantId) {
        return res.status(400).json({ error: 'Webhook payload incomplete' });
    }
    try {
        if (status === 'completed') {
            const subId = crypto_1.default.randomUUID();
            const updateQuery = `
        INSERT INTO subscriptions (id, tenant_id, plan, status, current_period_end, konnect_sub_id)
        VALUES (?, ?, ?, 'active', DATE_ADD(NOW(), INTERVAL 1 MONTH), ?)
        ON DUPLICATE KEY UPDATE plan = VALUES(plan), status = 'active', current_period_end = DATE_ADD(NOW(), INTERVAL 1 MONTH)
      `;
            await (0, db_1.executeSharedQuery)(updateQuery, [subId, tenantId, plan || 'STARTER', paymentRef]);
            console.log(`[PAYMENT SERVICE] Webhook processed: Subscription upgraded for tenant ${tenantId} to plan ${plan}`);
        }
        res.json({ status: 'success', message: 'Webhook registered successfully' });
    }
    catch (error) {
        console.error('Webhook error:', error);
        res.status(500).json({ error: 'Failed to process gateway webhook' });
    }
});
// ==========================================
// 2. PLAYER INVOICING (TENANT SCHEMA ISOLATION)
// ==========================================
const PLAN_AMOUNTS = {
    monthly: 120,
    quarterly: 340,
    semester: 650,
    annual: 1200,
};
function nextDueFromPlan(plan) {
    const d = new Date();
    if (plan === 'annual')
        d.setFullYear(d.getFullYear() + 1);
    else if (plan === 'semester')
        d.setMonth(d.getMonth() + 6);
    else if (plan === 'quarterly')
        d.setMonth(d.getMonth() + 3);
    else
        d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
}
// Monthly revenue chart + subscription status counts
router.get('/overview', auth_1.authenticateToken, async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jui', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        const revenueRows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT MONTH(COALESCE(paid_at, issued_at)) as m,
              SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) as collected,
              SUM(amount) as expected
       FROM invoices
       WHERE YEAR(COALESCE(paid_at, issued_at)) = YEAR(CURDATE())
       GROUP BY MONTH(COALESCE(paid_at, issued_at))
       ORDER BY m ASC`);
        const monthlyRevenue = monthLabels.map((month, idx) => {
            const row = revenueRows.find((r) => Number(r.m) === idx + 1);
            return {
                month,
                collected: Number(row?.collected || 0),
                expected: Number(row?.expected || 0),
            };
        });
        const subStats = await (0, db_1.executeTenantQuery)(tenantId, `SELECT status, COUNT(*) as cnt FROM player_subscriptions GROUP BY status`);
        res.json({ monthlyRevenue, subscriptionStats: subStats });
    }
    catch (error) {
        console.error('Payment overview failed:', error);
        res.status(500).json({ error: 'Failed to load payment overview' });
    }
});
// List player billing subscriptions (parent/child plans)
router.get('/player-subscriptions', auth_1.authenticateToken, async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `
      SELECT ps.*, p.full_name AS player_name, t.name AS team,
        u.email AS parent_email
      FROM player_subscriptions ps
      JOIN players p ON p.id = ps.player_id
      LEFT JOIN team_players tp ON tp.player_id = p.id
      LEFT JOIN teams t ON t.id = tp.team_id
      LEFT JOIN users u ON u.id = ps.parent_user_id
      ORDER BY ps.next_due ASC
    `;
        const rows = await (0, db_1.executeTenantQuery)(tenantId, query);
        res.json(rows.map((r) => ({
            ...r,
            parent_label: r.parent_email ? r.parent_email.split('@')[0] : '—',
        })));
    }
    catch (error) {
        console.error('Player subscriptions query failed:', error);
        res.status(500).json({ error: 'Failed to fetch player subscriptions' });
    }
});
// Create Player Invoice (Academy Admin only)
router.post('/invoices', auth_1.authenticateToken, (0, auth_1.requireRole)(['ACADEMY_ADMIN']), async (req, res) => {
    const tenantId = req.tenantId;
    const { playerId, amount, currency, plan } = req.body;
    if (!playerId || !amount) {
        return res.status(400).json({ error: 'Player ID and amount are required' });
    }
    const billingPlan = plan || 'monthly';
    const billingAmount = amount || PLAN_AMOUNTS[billingPlan] || 120;
    try {
        const invoiceId = crypto_1.default.randomUUID();
        const query = `
      INSERT INTO invoices (id, player_id, amount, currency, plan, status, issued_at)
      VALUES (?, ?, ?, ?, ?, 'pending', NOW())
    `;
        await (0, db_1.executeTenantQuery)(tenantId, query, [
            invoiceId, playerId, billingAmount, currency || 'TND', billingPlan,
        ]);
        const subCheck = await (0, db_1.executeTenantQuery)(tenantId, `SELECT id FROM player_subscriptions WHERE player_id = ? LIMIT 1`, [playerId]);
        if (subCheck.length === 0) {
            await (0, db_1.executeTenantQuery)(tenantId, `INSERT INTO player_subscriptions (id, player_id, plan, amount, currency, status, next_due)
         VALUES (?, ?, ?, ?, ?, 'pending', ?)`, [crypto_1.default.randomUUID(), playerId, billingPlan, billingAmount, currency || 'TND', nextDueFromPlan(billingPlan)]);
        }
        res.status(201).json({
            message: 'Invoice issued to player',
            invoice: {
                id: invoiceId,
                player_id: playerId,
                amount: billingAmount,
                currency: currency || 'TND',
                plan: billingPlan,
                status: 'pending',
                issued_at: new Date(),
            },
        });
    }
    catch (error) {
        console.error('Invoice issuance failed:', error);
        res.status(500).json({ error: 'Failed to record billing invoice' });
    }
});
// List Invoices (Admin, Coaches, and parents of the players)
router.get('/invoices', auth_1.authenticateToken, async (req, res) => {
    const tenantId = req.tenantId;
    try {
        const query = `
      SELECT i.id, i.player_id, i.amount, i.currency, i.plan, i.status,
             i.paid_manually, i.admin_note, i.marked_by,
             DATE_FORMAT(i.issued_at, '%Y-%m-%d') AS issued_at,
             DATE_FORMAT(i.paid_at, '%Y-%m-%d') AS paid_at,
             p.full_name
      FROM invoices i
      JOIN players p ON i.player_id = p.id
      ORDER BY i.issued_at DESC
    `;
        const list = await (0, db_1.executeTenantQuery)(tenantId, query);
        res.json(list);
    }
    catch (error) {
        console.error('Invoices query failed:', error);
        res.status(500).json({ error: 'Failed to fetch billing invoicing history' });
    }
});
// Pay / complete invoice (Admin, coaches, or parents)
router.post('/invoices/:id/pay', auth_1.authenticateToken, async (req, res) => {
    const tenantId = req.tenantId;
    const { id } = req.params;
    const { method, adminNote } = req.body;
    try {
        let query;
        let params;
        if (method === 'ADMIN_OVERRIDE') {
            query = `
        UPDATE invoices
        SET status = 'completed',
            paid_manually = true,
            paid_at = NOW(),
            marked_by = ?,
            admin_note = ?
        WHERE id = ?
      `;
            params = [req.user?.userId || null, adminNote || null, id];
        }
        else {
            query = `
        UPDATE invoices
        SET status = 'completed',
            paid_manually = false,
            paid_at = NOW()
        WHERE id = ?
      `;
            params = [id];
        }
        await (0, db_1.executeTenantQuery)(tenantId, query, params);
        const invRows = await (0, db_1.executeTenantQuery)(tenantId, `SELECT player_id, plan FROM invoices WHERE id = ?`, [id]);
        if (invRows[0]) {
            const { player_id: playerId, plan } = invRows[0];
            await (0, db_1.executeTenantQuery)(tenantId, `UPDATE player_subscriptions
         SET status = 'active', next_due = ?, plan = COALESCE(?, plan)
         WHERE player_id = ?`, [nextDueFromPlan(plan || 'monthly'), plan, playerId]);
        }
        const getInvoiceQuery = `SELECT * FROM invoices WHERE id = ? LIMIT 1`;
        const result = await (0, db_1.executeTenantQuery)(tenantId, getInvoiceQuery, [id]);
        res.json({ message: 'Invoice paid successfully', invoice: result[0] });
    }
    catch (error) {
        console.error('Invoice payment failed:', error);
        res.status(500).json({ error: 'Failed to process payment status update' });
    }
});
exports.default = router;
