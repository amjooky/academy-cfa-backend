import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import notificationRoutes from './routes/notificationRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/notification', tenantResolver, notificationRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[NOTIFICATION SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected notification dispatch error occurred' });
});

const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
  console.log(`[NOTIFICATION SERVICE] Running on port ${PORT}`);
});
