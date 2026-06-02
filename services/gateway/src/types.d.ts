import * as express from 'express';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantConfig?: any;
      user?: any;
    }
  }
}
