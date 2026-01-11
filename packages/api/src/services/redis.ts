/**
 * Redis service for distributed caching, rate limiting, and token blacklist
 * Falls back to in-memory storage when Redis is not available
 */

import { config } from '../config/index.js';
import { logger } from '../config/logger.js';

// In-memory fallback stores
const memoryStore = new Map<string, { value: string; expiresAt: number | null }>();

// Redis client placeholder - will be dynamically imported
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let redisClient: any = null;
let isConnected = false;

/**
 * Initialize Redis connection
 */
export async function initRedis(): Promise<void> {
  if (!config.redis.enabled) {
    logger.info('Redis disabled, using in-memory fallback');
    return;
  }

  try {
    // Dynamic import to avoid issues when redis is not installed
    const redis = await import('redis');
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clientOptions: any = {};
    
    if (config.redis.url) {
      clientOptions.url = config.redis.url;
    } else {
      clientOptions.socket = {
        host: config.redis.host,
        port: config.redis.port,
        tls: config.redis.tls,
      };
      if (config.redis.password) {
        clientOptions.password = config.redis.password;
      }
    }

    redisClient = redis.createClient(clientOptions);

    redisClient.on('error', (err: Error) => {
      logger.error('Redis client error:', err);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected');
      isConnected = true;
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
      isConnected = false;
    });

    await redisClient.connect();
    isConnected = true;
    logger.info('Redis initialized successfully');
  } catch (error) {
    logger.warn('Redis connection failed, using in-memory fallback:', error);
    redisClient = null;
    isConnected = false;
  }
}

/**
 * Check if Redis is available
 */
export function isRedisAvailable(): boolean {
  return isConnected && redisClient !== null;
}

/**
 * Get a value from Redis or memory
 */
export async function get(key: string): Promise<string | null> {
  if (isRedisAvailable() && redisClient) {
    try {
      return await redisClient.get(key);
    } catch (error) {
      logger.error('Redis get error:', error);
      // Fall through to memory
    }
  }

  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt && Date.now() > item.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

/**
 * Set a value in Redis or memory
 */
export async function set(key: string, value: string, ttlSeconds?: number): Promise<void> {
  if (isRedisAvailable() && redisClient) {
    try {
      if (ttlSeconds) {
        await redisClient.set(key, value, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, value);
      }
      return;
    } catch (error) {
      logger.error('Redis set error:', error);
      // Fall through to memory
    }
  }

  memoryStore.set(key, {
    value,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

/**
 * Delete a key from Redis or memory
 */
export async function del(key: string): Promise<void> {
  if (isRedisAvailable() && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (error) {
      logger.error('Redis del error:', error);
    }
  }
  memoryStore.delete(key);
}

/**
 * Increment a counter (for rate limiting)
 */
export async function incr(key: string, ttlSeconds?: number): Promise<number> {
  if (isRedisAvailable() && redisClient) {
    try {
      const count = await redisClient.incr(key);
      if (ttlSeconds && count === 1) {
        await redisClient.expire(key, ttlSeconds);
      }
      return count;
    } catch (error) {
      logger.error('Redis incr error:', error);
    }
  }

  // Memory fallback
  const item = memoryStore.get(key);
  let count = 1;
  if (item && (!item.expiresAt || Date.now() <= item.expiresAt)) {
    count = parseInt(item.value, 10) + 1;
  }
  memoryStore.set(key, {
    value: count.toString(),
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
  return count;
}

/**
 * Check if a key exists
 */
export async function exists(key: string): Promise<boolean> {
  const value = await get(key);
  return value !== null;
}

/**
 * Get Redis health status
 */
export async function getRedisHealth(): Promise<{
  available: boolean;
  type: 'redis' | 'memory';
  latencyMs?: number;
}> {
  if (!isRedisAvailable() || !redisClient) {
    return { available: true, type: 'memory' };
  }

  try {
    const start = Date.now();
    await redisClient.ping();
    return {
      available: true,
      type: 'redis',
      latencyMs: Date.now() - start,
    };
  } catch {
    return { available: false, type: 'memory' };
  }
}

/**
 * Close Redis connection
 */
export async function closeRedis(): Promise<void> {
  if (redisClient && isConnected) {
    try {
      await redisClient.disconnect();
      logger.info('Redis connection closed');
    } catch (error) {
      logger.error('Error closing Redis:', error);
    }
  }
  redisClient = null;
  isConnected = false;
}

/**
 * Clean expired entries from memory store (called periodically)
 */
export function cleanupMemoryStore(): void {
  const now = Date.now();
  for (const [key, item] of memoryStore.entries()) {
    if (item.expiresAt && now > item.expiresAt) {
      memoryStore.delete(key);
    }
  }
}

// Run cleanup every 60 seconds
let cleanupInterval: NodeJS.Timeout | null = null;

export function startMemoryCleanup(): void {
  if (cleanupInterval) return;
  cleanupInterval = setInterval(cleanupMemoryStore, 60000);
}

export function stopMemoryCleanup(): void {
  if (cleanupInterval) {
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
