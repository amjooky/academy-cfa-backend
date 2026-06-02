"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const aiRoutes_1 = __importDefault(require("./routes/aiRoutes"));
const tenant_1 = require("./middlewares/tenant");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/v1/ai', tenant_1.tenantResolver, aiRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('[AI SERVICE] Error:', err);
    res.status(500).json({ error: 'An unexpected AI model runtime error occurred' });
});
const PORT = process.env.PORT || 3008;
app.listen(PORT, () => {
    console.log(`[AI SERVICE] Running on port ${PORT}`);
});
