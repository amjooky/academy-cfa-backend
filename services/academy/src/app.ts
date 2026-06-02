import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import academyRoutes from './routes/academyRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Apply Multi-Tenant Resolver globally to the Academy routing scope
app.use('/api/v1/academy', tenantResolver, academyRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ACADEMY SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected database/server error occurred' });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`[ACADEMY SERVICE] Running on port ${PORT}`);
});
