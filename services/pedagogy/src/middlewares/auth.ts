import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Auth token missing' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    
    if (req.tenantId && req.tenantId !== decoded.tenantId) {
      return res.status(403).json({ error: 'Cross-tenant authentication denied' });
    }
    
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid auth token' });
  }
}

export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized access role' });
    }
    next();
  };
}
