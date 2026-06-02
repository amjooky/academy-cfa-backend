import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import aiRoutes from './routes/aiRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/ai', tenantResolver, aiRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[AI SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected AI model runtime error occurred' });
});

const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
  console.log(`[AI SERVICE] Running on port ${PORT}`);
});
