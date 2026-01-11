import { pino } from 'pino';
import type { Logger } from 'pino';
import { config, isDev, isTest } from './index.js';

export const logger = pino({
  level: isTest() ? 'silent' : isDev() ? 'debug' : 'info',
  transport: isDev()
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: { env: config.env },
  redact: ['req.headers.authorization', 'password', 'token'],
});

export function createChildLogger(bindings: Record<string, unknown>): Logger {
  return logger.child(bindings);
}
