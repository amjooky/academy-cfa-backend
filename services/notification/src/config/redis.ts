import dotenv from 'dotenv';

dotenv.config();

class InMemoryRedisMock {
  private store = new Map<string, string>();
  private listeners: Record<string, Function[]> = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
    return this;
  }

  async connect() {
    console.log('[REDIS MOCK] Initializing in-memory fast Redis storage layer...');
  }

  async get(key: string) {
    return this.store.get(key) || null;
  }

  async set(key: string, value: string, options?: any) {
    this.store.set(key, value);
    return 'OK';
  }

  async del(key: string) {
    const existed = this.store.has(key);
    this.store.delete(key);
    return existed ? 1 : 0;
  }

  async quit() {}
  async disconnect() {}
}

class RedisProxy {
  private client: any;
  private mock = new InMemoryRedisMock();
  private isConnected = false;

  constructor() {
    try {
      const { createClient } = require('redis');
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
        socket: {
          reconnectStrategy: false
        }
      });
      
      this.client.on('error', () => {
        this.isConnected = false;
      });

      this.client.connect()
        .then(() => {
          this.isConnected = true;
          console.log('[REDIS] Connected successfully to Redis server.');
        })
        .catch(() => {
          this.isConnected = false;
          console.log('[REDIS] Server offline. Falling back to in-memory store.');
        });
    } catch {
      this.isConnected = false;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.isConnected) {
      try {
        return await this.client.get(key);
      } catch {
        return this.mock.get(key);
      }
    }
    return this.mock.get(key);
  }

  async set(key: string, value: string, options?: any): Promise<string> {
    if (this.isConnected) {
      try {
        return await this.client.set(key, value, options);
      } catch {
        return this.mock.set(key, value, options);
      }
    }
    return this.mock.set(key, value, options);
  }

  async del(key: string): Promise<number> {
    if (this.isConnected) {
      try {
        return await this.client.del(key);
      } catch {
        return this.mock.del(key);
      }
    }
    return this.mock.del(key);
  }
}

const redisClient = new RedisProxy();
export default redisClient;

