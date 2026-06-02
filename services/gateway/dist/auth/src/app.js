"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const tenant_1 = require("./middlewares/tenant");
dotenv_1.default.config();
const app = (0, express_1.default)();
// Global Middlewares
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Apply Multi-Tenant Resolver Middleware globally to all API routes
app.use('/api/v1/auth', tenant_1.tenantResolver, authRoutes_1.default);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err);
    res.status(500).json({ error: 'An unexpected server error occurred' });
});
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`[AUTH SERVICE] Scaled server listening on port ${PORT}`);
    console.log(`[AUTH SERVICE] Tenant schema resolver middleware active`);
});
