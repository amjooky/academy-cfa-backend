import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import gamificationRoutes from './routes/gamificationRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/gamification', tenantResolver, gamificationRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[GAMIFICATION SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected gamification server error occurred' });
});

const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
  console.log(`[GAMIFICATION SERVICE] Running on port ${PORT}`);
});
