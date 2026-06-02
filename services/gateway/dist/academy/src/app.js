"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const academyRoutes_1 = __importDefault(require("./routes/academyRoutes"));
const tenant_1 = require("./middlewares/tenant");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Apply Multi-Tenant Resolver globally to the Academy routing scope
app.use('/api/v1/academy', tenant_1.tenantResolver, academyRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('[ACADEMY SERVICE] Error:', err);
    res.status(500).json({ error: 'An unexpected database/server error occurred' });
});
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
    console.log(`[ACADEMY SERVICE] Running on port ${PORT}`);
});
