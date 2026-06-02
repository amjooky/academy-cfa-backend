"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectMongo = connectMongo;
exports.getMongoDb = getMongoDb;
const mongodb_1 = require("mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const client = new mongodb_1.MongoClient(mongoUrl);
let db;
async function connectMongo() {
    if (db)
        return db;
    try {
        await client.connect();
        console.log('[PEDAGOGY SERVICE] Connected to MongoDB Cluster');
        db = client.db('academy_pedagogy');
        return db;
    }
    catch (error) {
        console.error('[PEDAGOGY SERVICE] Failed to connect to MongoDB:', error);
        throw error;
    }
}
function getMongoDb() {
    return db;
}
