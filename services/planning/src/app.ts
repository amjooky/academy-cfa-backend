import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import planningRoutes from './routes/planningRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/planning', tenantResolver, planningRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[PLANNING SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected planning database error occurred' });
});

const PORT = process.env.PORT || 3003;
app.listen(PORT, () => {
  console.log(`[PLANNING SERVICE] Running on port ${PORT}`);
});
