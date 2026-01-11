/**
 * Token blacklist with Redis support and in-memory fallback.
 * 
 * Features:
 * - Uses Redis when available (distributed)
 * - Falls back to in-memory for single-instance deployments
 * - Automatic TTL cleanup
 * 
 * @module tokenBlacklist
 */

import * as redis from './redis.js';

const BLACKLIST_PREFIX = 'token:blacklist:';

// In-memory fallback store
interface BlacklistEntry {
  token: string;
  expiresAt: number; // Unix timestamp (ms)
}
const memoryBlacklist = new Map<string, BlacklistEntry>();

// Cleanup interval (run every 5 minutes)
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Add a token to the blacklist.
 * Token will be automatically removed after its original JWT expiry.
 * 
 * @param token - The JWT token to blacklist
 * @param expiresAt - Unix timestamp (ms) when the token expires
 */
export async function blacklistToken(token: string, expiresAt: number): Promise<void> {
  const ttlSeconds = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const key = BLACKLIST_PREFIX + token;
  
  // Try Redis first
  if (redis.isRedisAvailable()) {
    await redis.set(key, '1', ttlSeconds);
  }
  
  // Always store in memory as backup
  memoryBlacklist.set(token, { token, expiresAt });
}

/**
 * Check if a token is blacklisted.
 * 
 * @param token - The JWT token to check
 * @returns true if token is blacklisted (revoked)
 */
export async function isTokenBlacklisted(token: string): Promise<boolean> {
  const key = BLACKLIST_PREFIX + token;
  
  // Check Redis first
  if (redis.isRedisAvailable()) {
    const exists = await redis.exists(key);
    if (exists) return true;
  }
  
  // Check memory fallback
  const entry = memoryBlacklist.get(token);
  if (!entry) return false;
  
  // If token has expired, remove from blacklist and return false
  if (Date.now() > entry.expiresAt) {
    memoryBlacklist.delete(token);
    return false;
  }
  
  return true;
}

/**
 * Synchronous check for backward compatibility.
 * Uses memory store only - for use in sync contexts.
 */
export function isTokenBlacklistedSync(token: string): boolean {
  const entry = memoryBlacklist.get(token);
  if (!entry) return false;
  
  if (Date.now() > entry.expiresAt) {
    memoryBlacklist.delete(token);
    return false;
  }
  
  return true;
}

/**
 * Get the count of currently blacklisted tokens (memory only).
 * Useful for monitoring/debugging.
 */
export function getBlacklistSize(): number {
  return memoryBlacklist.size;
}

/**
 * Remove expired entries from the memory blacklist.
 * Redis handles its own TTL expiry.
 */
function cleanupExpiredTokens(): void {
  const now = Date.now();
  let removed = 0;
  
  for (const [token, entry] of memoryBlacklist.entries()) {
    if (now > entry.expiresAt) {
      memoryBlacklist.delete(token);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[TokenBlacklist] Cleaned up ${removed} expired tokens. Remaining: ${memoryBlacklist.size}`);
  }
}

/**
 * Clear all blacklisted tokens.
 * Used for testing.
 */
export function clearBlacklist(): void {
  memoryBlacklist.clear();
}

// Start cleanup interval
let cleanupTimer: NodeJS.Timeout | null = null;

export function startBlacklistCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

export function stopBlacklistCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Auto-start cleanup on module load (except in test environment)
if (process.env['NODE_ENV'] !== 'test') {
  startBlacklistCleanup();
}
