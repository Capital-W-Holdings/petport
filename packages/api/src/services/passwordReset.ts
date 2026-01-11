/**
 * Password reset token management.
 * 
 * LIMITATIONS:
 * - In-memory storage, tokens cleared on server restart
 * - For production, upgrade to Redis or database storage
 * 
 * @module passwordReset
 */

import { randomBytes } from 'crypto';

interface ResetToken {
  userId: string;
  email: string;
  token: string;
  expiresAt: number; // Unix timestamp (ms)
  createdAt: number;
}

// Token validity period (1 hour)
const TOKEN_VALIDITY_MS = 60 * 60 * 1000;

// Store reset tokens: token -> ResetToken
const resetTokens = new Map<string, ResetToken>();

// Also index by userId to invalidate old tokens
const userTokens = new Map<string, string>();

/**
 * Generate a password reset token for a user.
 * Invalidates any existing token for the user.
 * 
 * @param userId - The user's ID
 * @param email - The user's email
 * @returns The reset token
 */
export function generateResetToken(userId: string, email: string): string {
  // Invalidate any existing token for this user
  const existingToken = userTokens.get(userId);
  if (existingToken) {
    resetTokens.delete(existingToken);
  }
  
  // Generate a secure random token (32 bytes = 64 hex chars)
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  
  const resetToken: ResetToken = {
    userId,
    email,
    token,
    expiresAt: now + TOKEN_VALIDITY_MS,
    createdAt: now,
  };
  
  resetTokens.set(token, resetToken);
  userTokens.set(userId, token);
  
  return token;
}

/**
 * Validate a reset token and return the associated user info.
 * 
 * @param token - The reset token to validate
 * @returns The userId if valid, null if invalid or expired
 */
export function validateResetToken(token: string): { userId: string; email: string } | null {
  const resetToken = resetTokens.get(token);
  
  if (!resetToken) {
    return null;
  }
  
  // Check if expired
  if (Date.now() > resetToken.expiresAt) {
    // Clean up expired token
    resetTokens.delete(token);
    userTokens.delete(resetToken.userId);
    return null;
  }
  
  return { userId: resetToken.userId, email: resetToken.email };
}

/**
 * Consume a reset token (use it and invalidate).
 * 
 * @param token - The reset token to consume
 * @returns The userId if valid, null if invalid
 */
export function consumeResetToken(token: string): { userId: string; email: string } | null {
  const result = validateResetToken(token);
  
  if (result) {
    // Invalidate the token
    resetTokens.delete(token);
    userTokens.delete(result.userId);
  }
  
  return result;
}

/**
 * Get the reset token for a user (for testing/debugging).
 */
export function getTokenForUser(userId: string): string | null {
  return userTokens.get(userId) ?? null;
}

/**
 * Clear all reset tokens (for testing).
 */
export function clearResetTokens(): void {
  resetTokens.clear();
  userTokens.clear();
}

/**
 * Get count of active reset tokens (for monitoring).
 */
export function getResetTokenCount(): number {
  return resetTokens.size;
}

// Cleanup expired tokens periodically (every 10 minutes)
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;

function cleanupExpiredTokens(): void {
  const now = Date.now();
  let removed = 0;
  
  for (const [token, resetToken] of resetTokens.entries()) {
    if (now > resetToken.expiresAt) {
      resetTokens.delete(token);
      userTokens.delete(resetToken.userId);
      removed++;
    }
  }
  
  if (removed > 0) {
    console.log(`[PasswordReset] Cleaned up ${removed} expired tokens. Remaining: ${resetTokens.size}`);
  }
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startResetTokenCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanupExpiredTokens, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

export function stopResetTokenCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// Auto-start cleanup on module load (except in test environment)
if (process.env['NODE_ENV'] !== 'test') {
  startResetTokenCleanup();
}
