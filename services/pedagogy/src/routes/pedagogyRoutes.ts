import { Router } from 'express';
import { executeTenantQuery } from '../config/db';
import { getMongoDb } from '../config/mongo';
import { authenticateToken, requireRole } from '../middlewares/auth';
import crypto from 'crypto';

const router = Router();

router.use(authenticateToken);

// ==========================================
// 1. EXERCISES LIBRARY (MONGODB INTERACTIVE LAYER)
// ==========================================

// Create Exercise
router.post('/exercises', requireRole(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
  const tenantId = req.tenantId!;
  const { title, description, category, difficulty, mediaUrls, tags } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Exercise title is required' });
  }

  try {
    const db = getMongoDb();
    
    // Isolation boundary: prefix the collection with tenant identifier
    const collectionName = `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '')}_exercises`;
    const collection = db.collection(collectionName);

    const doc = {
      title,
      description,
      category: category || 'technical',
      difficulty: Number(difficulty) || 1,
      mediaUrls: mediaUrls || [],
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(doc);
    res.status(201).json({ message: 'Exercise added to library', id: result.insertedId, exercise: doc });
  } catch (error) {
    console.error('Failed to create exercise in MongoDB:', error);
    res.status(500).json({ error: 'Failed to create exercise document' });
  }
});

// List Exercises
router.get('/exercises', async (req, res) => {
  const tenantId = req.tenantId!;
  const { category } = req.query;

  try {
    const db = getMongoDb();
    const collectionName = `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '')}_exercises`;
    const collection = db.collection(collectionName);

    const filter: any = {};
    if (category) {
      filter.category = category;
    }

    const list = await collection.find(filter).sort({ createdAt: -1 }).toArray();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to query exercise library' });
  }
});

// ==========================================
// 2. PLAYER EVALUATIONS (POSTGRESQL RELATIONAL LAYER)
// ==========================================

// Create Evaluation (Coach only)
router.post('/evaluations', requireRole(['ACADEMY_ADMIN', 'COACH']), async (req, res) => {
  const tenantId = req.tenantId!;
  const { playerId, eventId, scores, overall, notes } = req.body; // scores: { speed: 8, technique: 7, tactics: 9 }

  if (!playerId || !scores || !overall) {
    return res.status(400).json({ error: 'Player ID, overall rating and scores are required' });
  }

  try {
    const evalId = crypto.randomUUID();
    const query = `
      INSERT INTO evaluations (id, player_id, coach_id, event_id, scores, overall, notes, evaluated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
    `;
    await executeTenantQuery(tenantId, query, [
      evalId,
      playerId,
      (req as any).user?.userId,
      eventId,
      JSON.stringify(scores),
      overall,
      notes
    ]);

    const evaluation = {
      id: evalId,
      player_id: playerId,
      coach_id: (req as any).user?.userId,
      event_id: eventId,
      scores: JSON.stringify(scores),
      overall,
      notes,
      evaluated_at: new Date()
    };

    res.status(201).json({ message: 'Player evaluated successfully', evaluation });
  } catch (error) {
    console.error('Failed to create evaluation:', error);
    res.status(500).json({ error: 'Failed to record assessment evaluation' });
  }
});

// Get player assessment scores (staff, parent own children, or player self only)
router.get('/evaluations/player/:id', async (req, res) => {
  const tenantId = req.tenantId!;
  const playerId = req.params.id;
  const user = (req as any).user;

  try {
    if (user?.role === 'PARENT') {
      const link = await executeTenantQuery(
        tenantId,
        `SELECT 1 AS ok FROM parent_children WHERE parent_user_id = ? AND player_id = ? LIMIT 1`,
        [user.userId, playerId]
      );
      if (!link.length) {
        return res.status(403).json({ error: 'You can only view evaluations for your own children' });
      }
    } else if (user?.role === 'PLAYER') {
      const own = await executeTenantQuery(
        tenantId,
        `SELECT id FROM players WHERE user_id = ? LIMIT 1`,
        [user.userId]
      );
      if (!own.length || own[0].id !== playerId) {
        return res.status(403).json({ error: 'You can only view your own evaluations' });
      }
    }

    const query = `
      SELECT id, scores, overall, notes, evaluated_at 
      FROM evaluations 
      WHERE player_id = ? 
      ORDER BY evaluated_at DESC 
      LIMIT 10
    `;
    const history = await executeTenantQuery(tenantId, query, [playerId]);
    res.json(history);
  } catch (error) {
    console.error('Failed to load player assessment history:', error);
    res.status(500).json({ error: 'Failed to load player assessment history' });
  }
});

export default router;
