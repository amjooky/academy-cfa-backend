"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeTenantQuery = executeTenantQuery;
exports.executeSharedQuery = executeSharedQuery;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promise_1 = __importDefault(require("mysql2/promise"));
const dotenv_1 = __importDefault(require("dotenv"));
const rootEnv = path_1.default.resolve(__dirname, '../../../../.env');
if (fs_1.default.existsSync(rootEnv)) {
    dotenv_1.default.config({ path: rootEnv });
}
else {
    dotenv_1.default.config();
}
function getXamppPoolConfig() {
    const dbUrl = process.env.DB_URL;
    if (dbUrl?.startsWith('mysql://')) {
        return {
            uri: dbUrl,
            waitForConnections: true,
            connectionLimit: 20,
            queueLimit: 0,
        };
    }
    return {
        host: process.env.MYSQL_HOST || '127.0.0.1',
        port: Number(process.env.MYSQL_PORT || 3306),
        user: process.env.MYSQL_USER || 'root',
        password: process.env.MYSQL_PASSWORD ?? '',
        waitForConnections: true,
        connectionLimit: 20,
        queueLimit: 0,
    };
}
const pool = promise_1.default.createPool(getXamppPoolConfig());
async function executeTenantQuery(tenantId, queryText, params) {
    const safeTenantDb = `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
    const connection = await pool.getConnection();
    try {
        await connection.query(`USE \`${safeTenantDb}\``);
        const [rows] = await connection.query(queryText, params);
        return rows;
    }
    finally {
        connection.release();
    }
}
async function executeSharedQuery(queryText, params) {
    const connection = await pool.getConnection();
    try {
        await connection.query(`USE \`shared\``);
        const [rows] = await connection.query(queryText, params);
        return rows;
    }
    finally {
        connection.release();
    }
}
exports.default = pool;
