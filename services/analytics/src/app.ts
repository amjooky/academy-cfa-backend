import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import analyticsRoutes from './routes/analyticsRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/analytics', tenantResolver, analyticsRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[ANALYTICS SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected analytics server error occurred' });
});

const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`[ANALYTICS SERVICE] Running on port ${PORT}`);
});
