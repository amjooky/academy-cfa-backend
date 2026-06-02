"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantResolver = tenantResolver;
const redis_1 = __importDefault(require("../config/redis"));
async function tenantResolver(req, res, next) {
    try {
        const tenantIdentifier = req.headers['x-tenant-id'] || req.hostname;
        if (!tenantIdentifier) {
            return res.status(400).json({ error: 'Tenant identifier missing' });
        }
        const cleanTenantId = tenantIdentifier.trim().toLowerCase();
        const cacheKey = `tenant:config:${cleanTenantId}`;
        let cachedConfig = null;
        try {
            cachedConfig = await redis_1.default.get(cacheKey);
        }
        catch {
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
            await redis_1.default.set(cacheKey, JSON.stringify(mockTenantDbResult), { EX: 300 });
        }
        catch {
            /* cache optional when Redis unavailable */
        }
        req.tenantId = mockTenantDbResult.id;
        req.tenantConfig = mockTenantDbResult;
        next();
    }
    catch (error) {
        res.status(500).json({ error: 'Tenant resolution failed' });
    }
}
