"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const tenant_1 = require("./middlewares/tenant");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/v1/notification', tenant_1.tenantResolver, notificationRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('[NOTIFICATION SERVICE] Error:', err);
    res.status(500).json({ error: 'An unexpected notification dispatch error occurred' });
});
const PORT = process.env.PORT || 3006;
app.listen(PORT, () => {
    console.log(`[NOTIFICATION SERVICE] Running on port ${PORT}`);
});
