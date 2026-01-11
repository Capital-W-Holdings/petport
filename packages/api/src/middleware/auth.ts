import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthenticationError } from '@petport/shared';
import { config } from '../config/index.js';
import { userStore } from '../services/database.js';
import { isTokenBlacklisted, isTokenBlacklistedSync } from '../services/tokenBlacklist.js';

export interface JwtPayload {
  userId: string;
  email: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: { id: string; email: string; name: string };
      token?: string;
      tokenExp?: number; // Token expiry timestamp
    }
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    
    // Check if token has been revoked (logout) - async for Redis support
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      throw new AuthenticationError('Token has been revoked');
    }
    
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = userStore.get(payload.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    req.token = token;
    req.tokenExp = payload.exp * 1000; // Convert to milliseconds
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.slice(7);
    
    // Check blacklist for optional auth too
    const blacklisted = await isTokenBlacklisted(token);
    if (blacklisted) {
      return next(); // Token revoked, treat as no auth
    }
    
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = userStore.get(payload.userId);
    if (user) {
      req.user = { id: user.id, email: user.email, name: user.name };
      req.token = token;
      req.tokenExp = payload.exp * 1000;
    }
  } catch {
    // Ignore token errors for optional auth
  }
  next();
}

/**
 * Sync version of authenticate for middleware chains that don't support async.
 * Uses memory-only blacklist check.
 */
export function authenticateSync(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('Missing or invalid authorization header');
    }

    const token = authHeader.slice(7);
    
    // Use sync check (memory only)
    if (isTokenBlacklistedSync(token)) {
      throw new AuthenticationError('Token has been revoked');
    }
    
    const payload = jwt.verify(token, config.jwtSecret) as JwtPayload;
    const user = userStore.get(payload.userId);

    if (!user) {
      throw new AuthenticationError('User not found');
    }

    req.user = { id: user.id, email: user.email, name: user.name };
    req.token = token;
    req.tokenExp = payload.exp * 1000;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AuthenticationError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AuthenticationError('Token expired'));
    } else {
      next(error);
    }
  }
}

export function generateToken(userId: string, email: string): string {
  // expiresIn accepts string like '7d' or number in seconds
  return jwt.sign({ userId, email }, config.jwtSecret, { 
    expiresIn: config.jwtExpiry 
  } as jwt.SignOptions);
}
