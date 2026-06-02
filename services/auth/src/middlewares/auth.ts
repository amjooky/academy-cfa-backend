import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, TokenPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication Middleware
 * Decodes the JWT access token and appends the payload to the request object.
 */
export function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    
    // Ensure request tenant context matches JWT tenant context
    if (req.tenantId && req.tenantId !== decoded.tenantId) {
      return res.status(403).json({ error: 'Tenant context mismatch with authentication token' });
    }
    
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired access token' });
  }
}

/**
 * Role-Based Access Control Middleware
 * Requires the authenticated user to hold one of the authorized roles.
 */
export function requireRole(allowedRoles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'User is not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Unauthorized role action' });
    }

    next();
  };
}
