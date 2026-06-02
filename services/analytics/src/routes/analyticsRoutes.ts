import { Router } from 'express';
import { executeTenantQuery } from '../config/db';
import { exportQueue } from '../queues/exportQueue';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// ==========================================
// 1. DASHBOARD ANALYTICS OVERVIEWS
// ==========================================
router.get('/stats', requireRole(['ACADEMY_ADMIN']), async (req, res) => {
  const tenantId = req.tenantId!;

  try {
    // High-performance count aggregation queries inside isolated schema tables
    const playerQuery = `SELECT COUNT(*) as total FROM players WHERE status = 'active'`;
    const teamQuery = `SELECT COUNT(*) as total FROM teams`;
    const userQuery = `SELECT COUNT(*) as total FROM users WHERE role = 'COACH'`;
    const invoiceQuery = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END), 0) as collected,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_bills
      FROM invoices`;
    const eventsQuery = `SELECT COUNT(*) as total FROM events WHERE starts_at >= NOW()`;
    const [players, teams, coaches, billing, upcoming, evalRows] = await Promise.all([
      executeTenantQuery(tenantId, playerQuery),
      executeTenantQuery(tenantId, teamQuery),
      executeTenantQuery(tenantId, userQuery),
      executeTenantQuery(tenantId, invoiceQuery),
      executeTenantQuery(tenantId, eventsQuery),
      executeTenantQuery(tenantId, `SELECT scores FROM evaluations`),
    ]);

    let avgSpeed = 0;
    let avgTechnique = 0;
    let avgTactical = 0;
    if (evalRows.length > 0) {
      const parsed = evalRows.map((r: any) => {
        try {
          return typeof r.scores === 'string' ? JSON.parse(r.scores) : r.scores;
        } catch {
          return { speed: 0, technique: 0, tactics: 0 };
        }
      });
      const n = parsed.length;
      avgSpeed = Math.round((parsed.reduce((s: number, x: any) => s + (x.speed || 0), 0) / n) * 10);
      avgTechnique = Math.round((parsed.reduce((s: number, x: any) => s + (x.technique || 0), 0) / n) * 10);
      avgTactical = Math.round((parsed.reduce((s: number, x: any) => s + (x.tactics || 0), 0) / n) * 10);
    }

    const recentInvoices = await executeTenantQuery(
      tenantId,
      `SELECT i.id, p.full_name, i.amount, i.status, i.issued_at
       FROM invoices i JOIN players p ON p.id = i.player_id
       ORDER BY i.issued_at DESC LIMIT 3`
    );
    const recentEvents = await executeTenantQuery(
      tenantId,
      `SELECT title, type, starts_at FROM events ORDER BY starts_at DESC LIMIT 2`
    );

    const activity = [
      ...recentInvoices.map((r: any) => ({
        icon: '💳',
        title: r.status === 'completed' ? `Payment received — ${r.full_name}` : `Invoice pending — ${r.full_name}`,
        detail: `${r.amount} TND`,
        at: r.issued_at,
      })),
      ...recentEvents.map((e: any) => ({
        icon: '📅',
        title: `Event scheduled — ${e.title}`,
        detail: String(e.type).toUpperCase(),
        at: e.starts_at,
      })),
    ].slice(0, 5);

    res.json({
      summary: {
        totalPlayers: Number(players[0].total || 0),
        totalTeams: Number(teams[0].total || 0),
        totalCoaches: Number(coaches[0].total || 0),
        kpiRevenueTnd: Number(billing[0].collected || 0),
        pendingInvoicesCount: Number(billing[0].pending_bills || 0),
        pendingAmountTnd: Number(billing[0].pending_amount || 0),
        upcomingEvents: Number(upcoming[0].total || 0),
        avgSpeed: avgSpeed || 0,
        avgTechnique: avgTechnique || 0,
        avgTactical: avgTactical || 0,
      },
      recentActivity: activity,
      retrievedAt: new Date(),
    });
  } catch (error) {
    console.error('Stats query failure:', error);
    res.status(500).json({ error: 'Failed to aggregate dashboard analytics' });
  }
});

// ==========================================
// 2. REPORT EXPORTS (ASYNCHRONOUS BULL QUEUE)
// ==========================================

// Trigger a CSV / PDF export background job
router.post('/export', requireRole(['ACADEMY_ADMIN']), async (req, res) => {
  const tenantId = req.tenantId!;
  const { format, type } = req.body; // format: csv|pdf, type: attendance|evaluations|billing

  if (!format || !type) {
    return res.status(400).json({ error: 'Format and type fields are required' });
  }

  if (!['csv', 'pdf'].includes(format)) {
    return res.status(400).json({ error: 'Export format must be csv or pdf' });
  }

  if (!['attendance', 'evaluations', 'billing'].includes(type)) {
    return res.status(400).json({ error: 'Export scope must be attendance, evaluations, or billing' });
  }

  try {
    const job = await exportQueue.add({
      tenantId,
      format,
      type
    });

    res.status(202).json({
      message: 'Report export job scheduled successfully in background',
      jobId: job.id,
      state: 'enqueued'
    });
  } catch (error) {
    console.error('Export enqueuing failure:', error);
    res.status(500).json({ error: 'Failed to schedule report export' });
  }
});

// Check status of background export compiling job
router.get('/exports/jobs/:id', async (req, res) => {
  try {
    const job = await exportQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Export compilation job not found' });
    }

    const state = await job.getState();
    const result = job.failedReason || job.returnvalue;

    res.json({
      jobId: job.id,
      state,
      progress: job.progress(),
      result,
      timestamp: job.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to query export job status' });
  }
});

export default router;
