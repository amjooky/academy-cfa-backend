import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const client = new MongoClient(mongoUrl);

let db: Db;

export async function connectMongo(): Promise<Db> {
  if (db) return db;
  
  try {
    await client.connect();
    console.log('[PEDAGOGY SERVICE] Connected to MongoDB Cluster');
    db = client.db('academy_pedagogy');
    return db;
  } catch (error) {
    console.error('[PEDAGOGY SERVICE] Failed to connect to MongoDB:', error);
    throw error;
  }
}

export function getMongoDb(): Db {
  return db;
}
