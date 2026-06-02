"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const tenant_1 = require("./middlewares/tenant");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Public webhook route (mounted before tenant resolver to support arbitrary callback signatures)
app.use('/api/v1/payment/webhooks', paymentRoutes_1.default);
// Apply Tenant Schema Resolver globally to core billing API scopes
app.use('/api/v1/payment', tenant_1.tenantResolver, paymentRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('[PAYMENT SERVICE] Error:', err);
    res.status(500).json({ error: 'An unexpected billing server error occurred' });
});
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`[PAYMENT SERVICE] Running on port ${PORT}`);
});
