"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const tenant_1 = require("./middlewares/tenant");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/v1/analytics', tenant_1.tenantResolver, analyticsRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('[ANALYTICS SERVICE] Error:', err);
    res.status(500).json({ error: 'An unexpected analytics server error occurred' });
});
const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
    console.log(`[ANALYTICS SERVICE] Running on port ${PORT}`);
});
