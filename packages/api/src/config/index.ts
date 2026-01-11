import { randomBytes } from 'crypto';

export interface DatabaseConfig {
  type: 'sqlite' | 'postgres';
  // PostgreSQL settings
  url?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  ssl?: boolean;
  poolMin?: number;
  poolMax?: number;
}

export interface RedisConfig {
  enabled: boolean;
  url?: string;
  host?: string;
  port?: number;
  password?: string;
  tls?: boolean;
}

export interface Config {
  env: string;
  port: number;
  host: string;
  jwtSecret: string;
  jwtExpiry: string;
  bcryptRounds: number;
  uploadDir: string;
  dataDir: string;
  maxFileSize: number;
  publicUrl: string;
  corsOrigins: string[];
  database: DatabaseConfig;
  redis: RedisConfig;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  const num = parseInt(value, 10);
  if (isNaN(num)) throw new Error(`Invalid number for ${key}: ${value}`);
  return num;
}

export const config: Config = {
  env: getEnv('NODE_ENV', 'development'),
  port: getEnvNumber('PORT', 3001),
  host: getEnv('HOST', '0.0.0.0'),
  // JWT_SECRET required in production, random fallback only for development/test
  jwtSecret: (() => {
    const secret = process.env['JWT_SECRET'];
    const env = getEnv('NODE_ENV', 'development');
    if (!secret && env === 'production') {
      throw new Error('FATAL: JWT_SECRET environment variable is required in production');
    }
    return secret || randomBytes(32).toString('hex');
  })(),
  jwtExpiry: getEnv('JWT_EXPIRY', '7d'),
  bcryptRounds: getEnvNumber('BCRYPT_ROUNDS', 12),
  uploadDir: getEnv('UPLOAD_DIR', './uploads'),
  dataDir: getEnv('DATA_DIR', './data'),
  maxFileSize: getEnvNumber('MAX_FILE_SIZE', 10 * 1024 * 1024),
  publicUrl: getEnv('PUBLIC_URL', 'http://localhost:3001'),
  // CORS: No wildcard default - explicit origins required for non-dev environments
  corsOrigins: (() => {
    const origins = process.env['CORS_ORIGINS'];
    const env = getEnv('NODE_ENV', 'development');
    if (!origins) {
      if (env === 'production') {
        throw new Error('FATAL: CORS_ORIGINS environment variable is required in production');
      }
      return ['http://localhost:5173', 'http://localhost:3000'];
    }
    return origins.split(',').map(o => o.trim());
  })(),
  // Database configuration
  database: (() => {
    const dbUrl = process.env['DATABASE_URL'];
    if (dbUrl) {
      return {
        type: 'postgres' as const,
        url: dbUrl,
        ssl: process.env['DATABASE_SSL'] !== 'false',
        poolMin: getEnvNumber('DATABASE_POOL_MIN', 2),
        poolMax: getEnvNumber('DATABASE_POOL_MAX', 10),
      };
    }
    // Fall back to SQLite for development/testing
    return {
      type: 'sqlite' as const,
    };
  })(),
  // Redis configuration
  redis: (() => {
    const redisUrl = process.env['REDIS_URL'];
    const redisHost = process.env['REDIS_HOST'];
    if (redisUrl || redisHost) {
      return {
        enabled: true,
        url: redisUrl,
        host: redisHost || 'localhost',
        port: getEnvNumber('REDIS_PORT', 6379),
        password: process.env['REDIS_PASSWORD'],
        tls: process.env['REDIS_TLS'] === 'true',
      };
    }
    return { enabled: false };
  })(),
};

export function isDev(): boolean {
  return config.env === 'development';
}

export function isProd(): boolean {
  return config.env === 'production';
}

export function isTest(): boolean {
  return config.env === 'test';
}
