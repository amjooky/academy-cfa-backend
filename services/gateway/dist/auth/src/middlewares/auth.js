"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateToken = authenticateToken;
exports.requireRole = requireRole;
const jwt_1 = require("../utils/jwt");
/**
 * Authentication Middleware
 * Decodes the JWT access token and appends the payload to the request object.
 */
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    if (!token) {
        return res.status(401).json({ error: 'Access token missing' });
    }
    try {
        const decoded = (0, jwt_1.verifyAccessToken)(token);
        req.user = decoded;
        // Ensure request tenant context matches JWT tenant context
        if (req.tenantId && req.tenantId !== decoded.tenantId) {
            return res.status(403).json({ error: 'Tenant context mismatch with authentication token' });
        }
        next();
    }
    catch (err) {
        return res.status(403).json({ error: 'Invalid or expired access token' });
    }
}
/**
 * Role-Based Access Control Middleware
 * Requires the authenticated user to hold one of the authorized roles.
 */
function requireRole(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'User is not authenticated' });
        }
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Unauthorized role action' });
        }
        next();
    };
}
