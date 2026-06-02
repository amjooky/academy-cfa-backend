"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantResolver = tenantResolver;
const redis_1 = __importDefault(require("../config/redis"));
/**
 * Tenant Resolver Middleware
 * Identifies the tenant from the custom header 'x-tenant-id', host name, or subdomain.
 * Caches tenant configuration/validation in Redis to avoid hitting the main database repeatedly.
 */
async function tenantResolver(req, res, next) {
    try {
        // 1. Resolve tenant identifier from headers or hostname
        const tenantIdentifier = req.headers['x-tenant-id'] || req.hostname;
        if (!tenantIdentifier) {
            return res.status(400).json({ error: 'Tenant identifier missing in request' });
        }
        // Clean identifier to prevent malicious path inputs
        const cleanTenantId = tenantIdentifier.trim().toLowerCase();
        // 2. Check cache first
        const cacheKey = `tenant:config:${cleanTenantId}`;
        const cachedConfig = await redis_1.default.get(cacheKey);
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
        await redis_1.default.set(cacheKey, JSON.stringify(mockTenantDbResult), {
            EX: 300
        });
        req.tenantId = mockTenantDbResult.id;
        req.tenantConfig = mockTenantDbResult;
        next();
    }
    catch (error) {
        console.error('Error resolving tenant:', error);
        res.status(500).json({ error: 'Internal system error resolving tenant' });
    }
}
