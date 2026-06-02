import { Router } from 'express';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';
import { generateOtp, saveOtp, verifyOtp } from '../utils/otp';
import { executeTenantQuery } from '../config/db';
import { authenticateToken, AuthenticatedRequest } from '../middlewares/auth';
import redisClient from '../config/redis';

const router = Router();

// 1. Healthcheck
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'auth-service',
    tenantContext: req.tenantId,
    timestamp: new Date().toISOString()
  });
});

import crypto from 'crypto';

// 2. User Registration
router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  const tenantId = req.tenantId;

  if (!email || !password || !role) {
    return res.status(400).json({ error: 'Missing email, password or role' });
  }

  try {
    const userId = crypto.randomUUID();
    const query = `
      INSERT INTO users (id, email, password_hash, role, tenant_id, kyc_status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `;
    
    await executeTenantQuery(tenantId!, query, [userId, email, password, role, tenantId]);
    const user = { id: userId, email, role, kyc_status: 'pending' };

    const payload = { userId: user.id, email: user.email, role: user.role, tenantId: tenantId! };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // Save refresh token to Redis session store
    await redisClient.set(`session:${user.id}:${refreshToken}`, 'active', { EX: 7 * 24 * 3600 });

    res.status(201).json({
      message: 'Registration successful',
      user,
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Registration failed:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

const ACCOUNT_TYPE_ROLES: Record<string, string[]> = {
  staff: ['ACADEMY_ADMIN', 'COACH'],
  parent: ['PARENT'],
  child: ['PLAYER'],
};

// 3. User Login (accountType: staff | parent | child)
router.post('/login', async (req, res) => {
  const { email, password, accountType } = req.body;
  const tenantId = req.tenantId;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  const type = String(accountType || 'staff').toLowerCase();
  const allowedRoles = ACCOUNT_TYPE_ROLES[type] || ACCOUNT_TYPE_ROLES.staff;

  try {
    const rows = await executeTenantQuery(tenantId!, `SELECT * FROM users WHERE email = ?`, [email]);
    const user = rows[0];

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.kyc_status === 'pending') {
      return res.status(403).json({
        error: 'Account pending approval',
        message: 'Your account is pending approval and cannot login until it is activated.',
      });
    }

    if (!allowedRoles.includes(user.role)) {
      return res.status(403).json({
        error: 'Account type does not match this user.',
        hint: type === 'parent'
          ? 'Use the Parent login tab with your parent email (not admin or child).'
          : type === 'child'
            ? 'Use the Child login tab for the player account.'
            : 'Use the Staff tab for admin or coach accounts.',
        actualRole: user.role,
      });
    }

    let linkedPlayers: any[] = [];
    if (user.role === 'PARENT') {
      linkedPlayers = await executeTenantQuery(
        tenantId!,
        `SELECT p.id, p.full_name, p.team, p.status, p.position
         FROM players p
         INNER JOIN parent_children pc ON pc.player_id = p.id
         WHERE pc.parent_user_id = ?`,
        [user.id]
      );
    } else if (user.role === 'PLAYER') {
      linkedPlayers = await executeTenantQuery(
        tenantId!,
        `SELECT id, full_name, team, status, position, xp_total, rank FROM players WHERE user_id = ? LIMIT 1`,
        [user.id]
      );
    }

    const payload = { userId: user.id, email: user.email, role: user.role, tenantId: tenantId! };
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    await redisClient.set(`session:${user.id}:${refreshToken}`, 'active', { EX: 7 * 24 * 3600 });

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        children: user.role === 'PARENT' ? linkedPlayers : undefined,
        playerProfile: user.role === 'PLAYER' ? linkedPlayers[0] : undefined,
      },
    });
  } catch (error) {
    console.error('Login failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// 4. Token Refresh
router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: 'Refresh token required' });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    
    // Check if session exists in Redis
    const sessionActive = await redisClient.get(`session:${decoded.userId}:${refreshToken}`);
    if (!sessionActive) {
      return res.status(403).json({ error: 'Session expired or revoked' });
    }

    // Revoke old refresh token (rotation)
    await redisClient.del(`session:${decoded.userId}:${refreshToken}`);

    // Generate new pair
    const payload = { userId: decoded.userId, email: decoded.email, role: decoded.role, tenantId: decoded.tenantId };
    const newAccessToken = generateAccessToken(payload);
    const newRefreshToken = generateRefreshToken(payload);

    // Save new token
    await redisClient.set(`session:${decoded.userId}:${newRefreshToken}`, 'active', { EX: 7 * 24 * 3600 });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    });
  } catch (err) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

// 5. Send OTP
router.post('/otp/send', async (req, res) => {
  const { identifier } = req.body; // email or phone number

  if (!identifier) {
    return res.status(400).json({ error: 'Identifier required' });
  }

  try {
    const otp = generateOtp();
    await saveOtp(identifier, otp);

    // Log to console for local testing (mock SMS/Email service gateway)
    console.log(`[OTP GATEWAY] Sent code ${otp} to ${identifier}`);

    res.json({ message: 'OTP sent successfully (Simulated)', details: process.env.NODE_ENV === 'development' ? { otp } : undefined });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// 6. Verify OTP and authenticate user
router.post('/otp/verify', async (req, res) => {
  const { identifier, otp } = req.body;
  const tenantId = req.tenantId;

  if (!identifier || !otp) {
    return res.status(400).json({ error: 'Identifier and OTP code required' });
  }

  const isValid = await verifyOtp(identifier, otp);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  // OTP validated, generate dynamic access credentials
  const payload = {
    userId: `otp-usr-${Buffer.from(identifier).toString('hex').slice(0, 8)}`,
    email: identifier.includes('@') ? identifier : `${identifier}@tenant.local`,
    role: 'PLAYER', // Default fallback role
    tenantId: tenantId!
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  await redisClient.set(`session:${payload.userId}:${refreshToken}`, 'active', { EX: 7 * 24 * 3600 });

  res.json({
    message: 'OTP verified successfully',
    accessToken,
    refreshToken,
    user: { id: payload.userId, email: payload.email, role: payload.role }
  });
});

// 7. Get user context (Protected route)
router.get('/me', authenticateToken, (req: AuthenticatedRequest, res) => {
  res.json({ user: req.user });
});

export default router;
