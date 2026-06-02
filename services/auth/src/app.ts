import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Apply Multi-Tenant Resolver Middleware globally to all API routes
app.use('/api/v1/auth', tenantResolver, authRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'An unexpected server error occurred' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`[AUTH SERVICE] Scaled server listening on port ${PORT}`);
  console.log(`[AUTH SERVICE] Tenant schema resolver middleware active`);
});
