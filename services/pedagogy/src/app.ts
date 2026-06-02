import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pedagogyRoutes from './routes/pedagogyRoutes';
import { tenantResolver } from './middlewares/tenant';
import { connectMongo } from './config/mongo';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/pedagogy', tenantResolver, pedagogyRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[PEDAGOGY SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected database error occurred in Pedagogy' });
});

const PORT = process.env.PORT || 3004;

// Connect to MongoDB first, then start Express listener
(async () => {
  try {
    await connectMongo();
    app.listen(PORT, () => {
      console.log(`[PEDAGOGY SERVICE] Running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start Pedagogy Service:', err);
  }
})();
