import rateLimit, { Store, Options, ClientRateLimitInfo } from 'express-rate-limit';
import { RATE_LIMITS } from '@petport/shared';
import { Request, Response, NextFunction } from 'express';
import * as redis from '../services/redis.js';

// Skip rate limiting in test environment
const isTest = process.env['NODE_ENV'] === 'test';
const skipMiddleware = (_req: Request, _res: Response, next: NextFunction) => next();

/**
 * Redis store for express-rate-limit
 * Uses our Redis service with in-memory fallback
 */
class RedisStore implements Store {
  prefix: string;
  windowMs: number;

  constructor(options: { prefix: string; windowMs: number }) {
    this.prefix = options.prefix;
    this.windowMs = options.windowMs;
  }

  private getKey(key: string): string {
    return `ratelimit:${this.prefix}:${key}`;
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    const redisKey = this.getKey(key);
    const ttlSeconds = Math.ceil(this.windowMs / 1000);
    
    const totalHits = await redis.incr(redisKey, ttlSeconds);
    
    return {
      totalHits,
      resetTime: new Date(Date.now() + this.windowMs),
    };
  }

  async decrement(key: string): Promise<void> {
    // Not implemented - express-rate-limit doesn't require this
    // Just let the key expire naturally
  }

  async resetKey(key: string): Promise<void> {
    const redisKey = this.getKey(key);
    await redis.del(redisKey);
  }
}

function createRateLimiter(options: {
  prefix: string;
  windowMs: number;
  max: number;
  message: string;
}): ReturnType<typeof rateLimit> {
  const limiterOptions: Partial<Options> = {
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: { code: 'RATE_LIMIT', message: options.message },
    },
  };

  // Use Redis store when available, otherwise use default memory store
  if (redis.isRedisAvailable()) {
    limiterOptions.store = new RedisStore({
      prefix: options.prefix,
      windowMs: options.windowMs,
    });
  }

  return rateLimit(limiterOptions);
}

export const standardLimiter = isTest
  ? skipMiddleware
  : createRateLimiter({
      prefix: 'standard',
      windowMs: RATE_LIMITS.STANDARD.windowMs,
      max: RATE_LIMITS.STANDARD.max,
      message: 'Too many requests, please try again later',
    });

export const authLimiter = isTest
  ? skipMiddleware
  : createRateLimiter({
      prefix: 'auth',
      windowMs: RATE_LIMITS.AUTH.windowMs,
      max: RATE_LIMITS.AUTH.max,
      message: 'Too many authentication attempts',
    });

export const uploadLimiter = isTest
  ? skipMiddleware
  : createRateLimiter({
      prefix: 'upload',
      windowMs: RATE_LIMITS.UPLOAD.windowMs,
      max: RATE_LIMITS.UPLOAD.max,
      message: 'Too many uploads, please try again later',
    });
