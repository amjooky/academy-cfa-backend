import { Router } from 'express';
import { notificationQueue } from '../queues/notificationQueue';
import { authenticateToken, requireRole } from '../middlewares/auth';

const router = Router();

router.use(authenticateToken);

// ==========================================
// NOTIFICATIONS TRIGGER AND MANAGEMENT
// ==========================================

// Enqueue single notification job (Admin & Coaches only)
router.post('/dispatch', requireRole(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
  const tenantId = req.tenantId!;
  const { recipient, type, title, body } = req.body;

  if (!recipient || !type || !body) {
    return res.status(400).json({ error: 'Recipient, notification type, and body are required' });
  }

  if (!['sms', 'email', 'push'].includes(type)) {
    return res.status(400).json({ error: 'Notification channel must be sms, email, or push' });
  }

  try {
    const job = await notificationQueue.add({
      tenantId,
      recipient,
      type,
      title: title || 'Academy Notification Alert',
      body
    }, {
      attempts: 3, // Enable automatic retry fallback on Twilio/SendGrid outages
      backoff: {
        type: 'exponential',
        delay: 5000 // Retry every 5s, 10s, 20s
      }
    });

    res.status(202).json({
      message: 'Notification successfully enqueued for processing',
      jobId: job.id,
      state: 'pending'
    });
  } catch (error) {
    console.error('Failed to enqueue notification job:', error);
    res.status(500).json({ error: 'Queue insertion failed' });
  }
});

// Check status of a background notification job
router.get('/jobs/:id', async (req, res) => {
  try {
    const job = await notificationQueue.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Notification job not found in queue' });
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
    res.status(500).json({ error: 'Failed to retrieve job status' });
  }
});

export default router;
