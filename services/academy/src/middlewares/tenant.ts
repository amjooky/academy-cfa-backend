import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantConfig?: any;
    }
  }
}

export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantIdentifier = (req.headers['x-tenant-id'] as string) || req.hostname;
    if (!tenantIdentifier) {
      return res.status(400).json({ error: 'Tenant identifier missing' });
    }

    const cleanTenantId = tenantIdentifier.trim().toLowerCase();
    const cacheKey = `tenant:config:${cleanTenantId}`;
    let cachedConfig: string | null = null;
    try {
      cachedConfig = await redisClient.get(cacheKey);
    } catch {
      cachedConfig = null;
    }

    if (cachedConfig) {
      const parsedConfig = JSON.parse(cachedConfig);
      req.tenantId = parsedConfig.id;
      req.tenantConfig = parsedConfig;
      return next();
    }

    const mockTenantDbResult = {
      id: cleanTenantId,
      name: `Academy ${cleanTenantId}`,
      isActive: true,
      features: ['gamification']
    };

    try {
      await redisClient.set(cacheKey, JSON.stringify(mockTenantDbResult), { EX: 300 });
    } catch {
      /* cache optional when Redis unavailable */
    }
    req.tenantId = mockTenantDbResult.id;
    req.tenantConfig = mockTenantDbResult;

    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant resolution failed' });
  }
}
