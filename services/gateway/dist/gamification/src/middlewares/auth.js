"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
const jwt_1 = require("../utils/jwt");
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'Auth token missing' });
    }
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = decoded;
        if (req.tenantId && req.tenantId !== decoded.tenantId) {
            return res.status(403).json({ error: 'Cross-tenant authentication denied' });
        }
        next();
    }
    catch (err) {
        return res.status(403).json({ error: 'Invalid auth token' });
    }
}
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Unauthorized access role' });
        }
        next();
    };
}
