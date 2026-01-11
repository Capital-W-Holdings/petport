import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './config/logger.js';
import { initDatabase, closeDatabase, startAutoSave, stopAutoSave } from './services/sqlite.js';
import { initRedis, closeRedis, startMemoryCleanup, stopMemoryCleanup } from './services/redis.js';

async function main(): Promise<void> {
  try {
    // Initialize database
    await initDatabase();
    startAutoSave();
    logger.info({ msg: 'Database ready', type: config.database.type });

    // Initialize Redis (optional - will fall back to memory if not available)
    await initRedis();
    startMemoryCleanup();
    logger.info({ msg: 'Cache ready', redis: config.redis.enabled });

    // Create and start server
    const app = createApp();
    const server = app.listen(config.port, config.host, () => {
      logger.info({
        msg: 'Server started',
        port: config.port,
        host: config.host,
        env: config.env,
        database: config.database.type,
        redis: config.redis.enabled,
      });
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      stopAutoSave();
      stopMemoryCleanup();
      server.close(async () => {
        closeDatabase();
        await closeRedis();
        logger.info('Server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
