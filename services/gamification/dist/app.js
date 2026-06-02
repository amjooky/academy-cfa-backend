"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const gamificationRoutes_1 = __importDefault(require("./routes/gamificationRoutes"));
const tenant_1 = require("./middlewares/tenant");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/v1/gamification', tenant_1.tenantResolver, gamificationRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('[GAMIFICATION SERVICE] Error:', err);
    res.status(500).json({ error: 'An unexpected gamification server error occurred' });
});
const PORT = process.env.PORT || 3007;
app.listen(PORT, () => {
    console.log(`[GAMIFICATION SERVICE] Running on port ${PORT}`);
});
