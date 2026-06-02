import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';

// Import sub-service routers statically to load type contexts
import authRoutes from '../../auth/src/routes/authRoutes';
import academyRoutes from '../../academy/src/routes/academyRoutes';
import parentRoutes from '../../academy/src/routes/parentRoutes';
import planningRoutes from '../../planning/src/routes/planningRoutes';
import pedagogyRoutes from '../../pedagogy/src/routes/pedagogyRoutes';
import paymentRoutes from '../../payment/src/routes/paymentRoutes';
import notificationRoutes from '../../notification/src/routes/notificationRoutes';
import gamificationRoutes from '../../gamification/src/routes/gamificationRoutes';
import aiRoutes from '../../ai/src/routes/aiRoutes';
import analyticsRoutes from '../../analytics/src/routes/analyticsRoutes';

// Import sub-service middlewares (which contain declare global to extend Request interface)
import { tenantResolver as authTenant } from '../../auth/src/middlewares/tenant';
import { tenantResolver as academyTenant } from '../../academy/src/middlewares/tenant';
import { tenantResolver as planningTenant } from '../../planning/src/middlewares/tenant';
import { tenantResolver as pedagogyTenant } from '../../pedagogy/src/middlewares/tenant';
import { tenantResolver as paymentTenant } from '../../payment/src/middlewares/tenant';
import { tenantResolver as notificationTenant } from '../../notification/src/middlewares/tenant';
import { tenantResolver as gamificationTenant } from '../../gamification/src/middlewares/tenant';
import { tenantResolver as aiTenant } from '../../ai/src/middlewares/tenant';
import { tenantResolver as analyticsTenant } from '../../analytics/src/middlewares/tenant';

// Import pedagogy MongoDB connector
import { connectMongo } from '../../pedagogy/src/config/mongo';

// Load environment from monorepo root (works for dev and compiled dist/)
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];

const corsOptions = allowedOrigins.length
  ? {
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS policy does not allow access from origin ${origin}`));
        }
      },
      credentials: true,
    }
  : {};

// Determine execution mode (default to monolith mode)
const IS_MONOLITH = process.env.MONOLITH !== 'false';
const PORT = process.env.PORT || 3000;

if (IS_MONOLITH) {
  console.log(`\n======================================================`);
  console.log(`  ACADEMY SAAS - MONOLITH UNIFIED BACKEND INITIATED`);
  console.log(`  Running all 10 services natively on unified Port: ${PORT}`);
  console.log(`======================================================\n`);

  // Configure Global Middlewares
  app.use(cors(corsOptions));
  app.use(express.json());

  // Graceful Pedagogy MongoDB connection setup
  connectMongo()
    .then(() => {
      console.log('   [DATABASE] [SUCCESS] Pedagogy Service connected to MongoDB cluster.');
    })
    .catch((err: any) => {
      console.warn('   [DATABASE] [WARNING] MongoDB local cluster offline. Pedagogy interactive layer running in fallback mode.');
    });

  // Mount API Endpoints Natively
  console.log('   [MONOLITH] Registering native endpoints:');
  
  app.use('/api/v1/auth', authTenant, authRoutes);
  console.log('     -> Mounted Route: /api/v1/auth');
  
  app.use('/api/v1/academy', academyTenant, academyRoutes);
  console.log('     -> Mounted Route: /api/v1/academy');

  app.use('/api/v1/parent', academyTenant, parentRoutes);
  console.log('     -> Mounted Route: /api/v1/parent');
  
  app.use('/api/v1/planning', planningTenant, planningRoutes);
  console.log('     -> Mounted Route: /api/v1/planning');
  
  app.use('/api/v1/pedagogy', pedagogyTenant, pedagogyRoutes);
  console.log('     -> Mounted Route: /api/v1/pedagogy');
  
  // Public webhook route (mounted before tenant resolver)
  app.use('/api/v1/payment/webhooks', paymentRoutes);
  app.use('/api/v1/payment', paymentTenant, paymentRoutes);
  console.log('     -> Mounted Route: /api/v1/payment');
  
  app.use('/api/v1/notification', notificationTenant, notificationRoutes);
  console.log('     -> Mounted Route: /api/v1/notification');
  
  app.use('/api/v1/gamification', gamificationTenant, gamificationRoutes);
  console.log('     -> Mounted Route: /api/v1/gamification');
  
  app.use('/api/v1/ai', aiTenant, aiRoutes);
  console.log('     -> Mounted Route: /api/v1/ai');
  
  app.use('/api/v1/analytics', analyticsTenant, analyticsRoutes);
  console.log('     -> Mounted Route: /api/v1/analytics');

  // Monolith Healthcheck Endpoint
  app.get('/api/v1/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      mode: 'monolith',
      services: ['auth', 'academy', 'planning', 'pedagogy', 'payment', 'notification', 'gamification', 'ai', 'analytics'],
      timestamp: new Date().toISOString()
    });
  });
  console.log('     -> Mounted Route: /api/v1/health [Healthcheck]');

  // Catch-all route for unmatched paths inside the monolith
  app.use('/api/v1/*', (req: Request, res: Response) => {
    res.status(404).json({ error: `API route ${req.originalUrl} not found in unified monolith` });
  });

  // Global Unified Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('[UNIFIED MONOLITH SERVER ERROR]:', err);
    res.status(500).json({ error: 'An unexpected server error occurred inside the unified monolith' });
  });

} else {
  // Proxy Mode: Fallback reverse-proxying configuration
  console.log(`\n======================================================`);
  console.log(`  ACADEMY SAAS - API GATEWAY (REVERSE-PROXY MODE)`);
  console.log(`  Listening on Port: ${PORT}`);
  console.log(`======================================================\n`);

  app.use(cors());

  // List of target microservice endpoints on local ports
  const targetServices: Record<string, string> = {
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
  app.use((req: Request, res: Response) => {
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

    const proxyReq = http.request(options, (proxyRes) => {
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
