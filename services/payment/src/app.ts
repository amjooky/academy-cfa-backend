import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import paymentRoutes from './routes/paymentRoutes';
import { tenantResolver } from './middlewares/tenant';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Public webhook route (mounted before tenant resolver to support arbitrary callback signatures)
app.use('/api/v1/payment/webhooks', paymentRoutes);

// Apply Tenant Schema Resolver globally to core billing API scopes
app.use('/api/v1/payment', tenantResolver, paymentRoutes);

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[PAYMENT SERVICE] Error:', err);
  res.status(500).json({ error: 'An unexpected billing server error occurred' });
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`[PAYMENT SERVICE] Running on port ${PORT}`);
});
