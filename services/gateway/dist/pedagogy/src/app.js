"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const pedagogyRoutes_1 = __importDefault(require("./routes/pedagogyRoutes"));
const tenant_1 = require("./middlewares/tenant");
const mongo_1 = require("./config/mongo");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.use('/api/v1/pedagogy', tenant_1.tenantResolver, pedagogyRoutes_1.default);
app.use((err, req, res, next) => {
    console.error('[PEDAGOGY SERVICE] Error:', err);
    res.status(500).json({ error: 'An unexpected database error occurred in Pedagogy' });
});
const PORT = process.env.PORT || 3004;
// Connect to MongoDB first, then start Express listener
(async () => {
    try {
        await (0, mongo_1.connectMongo)();
        app.listen(PORT, () => {
            console.log(`[PEDAGOGY SERVICE] Running on port ${PORT}`);
        });
    }
    catch (err) {
        console.error('Failed to start Pedagogy Service:', err);
    }
})();
