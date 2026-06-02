import { Request, Response, NextFunction } from 'express';
import redisClient from '../config/redis';

// Extend Express Request interface to include tenant details
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantConfig?: any;
    }
  }
}

/**
 * Tenant Resolver Middleware
 * Identifies the tenant from the custom header 'x-tenant-id', host name, or subdomain.
 * Caches tenant configuration/validation in Redis to avoid hitting the main database repeatedly.
 */
export async function tenantResolver(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Resolve tenant identifier from headers or hostname
    const tenantIdentifier = (req.headers['x-tenant-id'] as string) || req.hostname;
    
    if (!tenantIdentifier) {
      return res.status(400).json({ error: 'Tenant identifier missing in request' });
    }

    // Clean identifier to prevent malicious path inputs
    const cleanTenantId = tenantIdentifier.trim().toLowerCase();

    // 2. Check cache first
    const cacheKey = `tenant:config:${cleanTenantId}`;
    const cachedConfig = await redisClient.get(cacheKey);

    if (cachedConfig) {
      const parsedConfig = JSON.parse(cachedConfig);
      req.tenantId = parsedConfig.id;
      req.tenantConfig = parsedConfig;
      return next();
    }

    // 3. Fallback: Query shared metadata DB to check if tenant exists
    // (For this mock setup, we assume tenant exists. In production, check shared.tenants table)
    const mockTenantDbResult = {
      id: cleanTenantId,
      name: `Academy ${cleanTenantId}`,
      isActive: true,
      features: ['gamification', 'ai-scouting']
    };

    if (!mockTenantDbResult.isActive) {
      return res.status(403).json({ error: 'Tenant is deactivated' });
    }

    // 4. Cache tenant profile for 5 minutes (300 seconds)
    await redisClient.set(cacheKey, JSON.stringify(mockTenantDbResult), {
      EX: 300
    });

    req.tenantId = mockTenantDbResult.id;
    req.tenantConfig = mockTenantDbResult;

    next();
  } catch (error) {
    console.error('Error resolving tenant:', error);
    res.status(500).json({ error: 'Internal system error resolving tenant' });
  }
}
