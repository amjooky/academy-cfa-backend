import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

const rootEnv = path.resolve(__dirname, '../../../../.env');
if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

function getXamppPoolConfig(): mysql.PoolOptions {
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

const pool = mysql.createPool(getXamppPoolConfig());

export async function executeTenantQuery<T = any>(
  tenantId: string,
  queryText: string,
  params?: any[]
): Promise<T[]> {
  const safeTenantDb = `tenant_${tenantId.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const connection = await pool.getConnection();
  try {
    await connection.query(`USE \`${safeTenantDb}\``);
    const [rows] = await connection.query(queryText, params);
    return rows as T[];
  } finally {
    connection.release();
  }
}

export async function executeSharedQuery<T = any>(
  queryText: string,
  params?: any[]
): Promise<T[]> {
  const connection = await pool.getConnection();
  try {
    await connection.query(`USE \`shared\``);
    const [rows] = await connection.query(queryText, params);
    return rows as T[];
  } finally {
    connection.release();
  }
}

export default pool;
