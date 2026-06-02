"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const http_1 = __importDefault(require("http"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
// Import sub-service routers statically to load type contexts
const authRoutes_1 = __importDefault(require("../../auth/src/routes/authRoutes"));
const academyRoutes_1 = __importDefault(require("../../academy/src/routes/academyRoutes"));
const parentRoutes_1 = __importDefault(require("../../academy/src/routes/parentRoutes"));
const planningRoutes_1 = __importDefault(require("../../planning/src/routes/planningRoutes"));
const pedagogyRoutes_1 = __importDefault(require("../../pedagogy/src/routes/pedagogyRoutes"));
const paymentRoutes_1 = __importDefault(require("../../payment/src/routes/paymentRoutes"));
const notificationRoutes_1 = __importDefault(require("../../notification/src/routes/notificationRoutes"));
const gamificationRoutes_1 = __importDefault(require("../../gamification/src/routes/gamificationRoutes"));
const aiRoutes_1 = __importDefault(require("../../ai/src/routes/aiRoutes"));
const analyticsRoutes_1 = __importDefault(require("../../analytics/src/routes/analyticsRoutes"));
// Import sub-service middlewares (which contain declare global to extend Request interface)
const tenant_1 = require("../../auth/src/middlewares/tenant");
const tenant_2 = require("../../academy/src/middlewares/tenant");
const tenant_3 = require("../../planning/src/middlewares/tenant");
const tenant_4 = require("../../pedagogy/src/middlewares/tenant");
const tenant_5 = require("../../payment/src/middlewares/tenant");
const tenant_6 = require("../../notification/src/middlewares/tenant");
const tenant_7 = require("../../gamification/src/middlewares/tenant");
const tenant_8 = require("../../ai/src/middlewares/tenant");
const tenant_9 = require("../../analytics/src/middlewares/tenant");
// Import pedagogy MongoDB connector
const mongo_1 = require("../../pedagogy/src/config/mongo");
// Load environment from monorepo root (works for dev and compiled dist/)
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../../.env') });
const app = (0, express_1.default)();
// Determine execution mode (default to monolith mode)
const IS_MONOLITH = process.env.MONOLITH !== 'false';
const PORT = process.env.PORT || 3000;
if (IS_MONOLITH) {
    console.log(`\n======================================================`);
    console.log(`  ACADEMY SAAS - MONOLITH UNIFIED BACKEND INITIATED`);
    console.log(`  Running all 10 services natively on unified Port: ${PORT}`);
    console.log(`======================================================\n`);
    // Configure Global Middlewares
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    // Graceful Pedagogy MongoDB connection setup
    (0, mongo_1.connectMongo)()
        .then(() => {
        console.log('   [DATABASE] [SUCCESS] Pedagogy Service connected to MongoDB cluster.');
    })
        .catch((err) => {
        console.warn('   [DATABASE] [WARNING] MongoDB local cluster offline. Pedagogy interactive layer running in fallback mode.');
    });
    // Mount API Endpoints Natively
    console.log('   [MONOLITH] Registering native endpoints:');
    app.use('/api/v1/auth', tenant_1.tenantResolver, authRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/auth');
    app.use('/api/v1/academy', tenant_2.tenantResolver, academyRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/academy');
    app.use('/api/v1/parent', tenant_2.tenantResolver, parentRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/parent');
    app.use('/api/v1/planning', tenant_3.tenantResolver, planningRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/planning');
    app.use('/api/v1/pedagogy', tenant_4.tenantResolver, pedagogyRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/pedagogy');
    // Public webhook route (mounted before tenant resolver)
    app.use('/api/v1/payment/webhooks', paymentRoutes_1.default);
    app.use('/api/v1/payment', tenant_5.tenantResolver, paymentRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/payment');
    app.use('/api/v1/notification', tenant_6.tenantResolver, notificationRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/notification');
    app.use('/api/v1/gamification', tenant_7.tenantResolver, gamificationRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/gamification');
    app.use('/api/v1/ai', tenant_8.tenantResolver, aiRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/ai');
    app.use('/api/v1/analytics', tenant_9.tenantResolver, analyticsRoutes_1.default);
    console.log('     -> Mounted Route: /api/v1/analytics');
    // Monolith Healthcheck Endpoint
    app.get('/api/v1/health', (req, res) => {
        res.json({
            status: 'ok',
            mode: 'monolith',
            services: ['auth', 'academy', 'planning', 'pedagogy', 'payment', 'notification', 'gamification', 'ai', 'analytics'],
            timestamp: new Date().toISOString()
        });
    });
    console.log('     -> Mounted Route: /api/v1/health [Healthcheck]');
    // Catch-all route for unmatched paths inside the monolith
    app.use('/api/v1/*', (req, res) => {
        res.status(404).json({ error: `API route ${req.originalUrl} not found in unified monolith` });
    });
    // Global Unified Error Handler
    app.use((err, req, res, next) => {
        console.error('[UNIFIED MONOLITH SERVER ERROR]:', err);
        res.status(500).json({ error: 'An unexpected server error occurred inside the unified monolith' });
    });
}
else {
    // Proxy Mode: Fallback reverse-proxying configuration
    console.log(`\n======================================================`);
    console.log(`  ACADEMY SAAS - API GATEWAY (REVERSE-PROXY MODE)`);
    console.log(`  Listening on Port: ${PORT}`);
    console.log(`======================================================\n`);
    app.use((0, cors_1.default)());
    // List of target microservice endpoints on local ports
    const targetServices = {
        '/api/v1/auth': 'http://localhost:3001',
        '/api/v1/academy': 'http://localhost:3002',
        '/api/v1/planning': 'http://localhost:3003',
        '/api/v1/pedagogy': 'http://localhost:3004',
        '/api/v1/payment': 'http://localhost:3005',
        '/api/v1/notification': 'http://localhost:3006',
        '/api/v1/gamification': 'http://localhost:3007',
        '/api/v1/ai': 'http://localhost:3008',
        '/api/v1/analytics': 'http://localhost:3009',
    };
    Object.entries(targetServices).forEach(([prefix, url]) => {
        console.log(`   [PROXY]  Route: ${prefix} -> ${url}`);
    });
    // Stream-based raw HTTP proxy handler
    app.use((req, res) => {
        const path = req.path;
        // Find matching service prefix
        const match = Object.keys(targetServices).find(prefix => path.startsWith(prefix));
        if (!match) {
            console.warn(`[GATEWAY ROUTER] Route not matched: ${path}`);
            return res.status(404).json({ error: `Route ${path} not found in API Gateway` });
        }
        const targetUrl = targetServices[match];
        const targetPort = parseInt(targetUrl.split(':')[2]);
        console.log(`[GATEWAY PROXY] ${req.method} ${req.originalUrl} -> port ${targetPort}`);
        // Create reverse proxy connection options
        const options = {
            hostname: 'localhost',
            port: targetPort,
            path: req.originalUrl,
            method: req.method,
            headers: req.headers
        };
        const proxyReq = http_1.default.request(options, (proxyRes) => {
            // Forward status code and headers from target microservice
            res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
            // Stream response body back to the client
            proxyRes.pipe(res, { end: true });
        });
        proxyReq.on('error', (err) => {
            console.error(`[GATEWAY PROXY ERROR] Failed connecting to port ${targetPort} for ${path}:`, err.message);
            res.status(502).json({ error: `Service at port ${targetPort} is offline or unreachable` });
        });
        // Stream raw incoming request body stream directly to target microservice
        req.pipe(proxyReq, { end: true });
    });
}
app.listen(PORT, () => {
    console.log(`\n------------------------------------------------------`);
    console.log(`  Unified server listening on http://localhost:${PORT}`);
    console.log(`------------------------------------------------------\n`);
});
