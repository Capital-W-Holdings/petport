import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { existsSync, mkdirSync } from 'fs';
import { API_PREFIX } from '@petport/shared';
import { config } from './config/index.js';
import { requestLogger, errorHandler, notFoundHandler, standardLimiter } from './middleware/index.js';
import { healthRoutes, authRoutes, petRoutes, publicRoutes } from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  // Ensure upload directory exists
  if (!existsSync(config.uploadDir)) {
    mkdirSync(config.uploadDir, { recursive: true });
  }

  // Security
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin: config.corsOrigins.includes('*') ? '*' : config.corsOrigins,
    credentials: true,
  }));

  // Performance
  app.use(compression());

  // Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Static files - serve uploads
  app.use('/uploads', express.static(config.uploadDir, {
    maxAge: '1d',
    etag: true,
  }));

  // Logging
  app.use(requestLogger);

  // Rate limiting
  app.use(standardLimiter);

  // Health routes (no prefix)
  app.use('/', healthRoutes);

  // Public routes
  app.use(`${API_PREFIX}/public`, publicRoutes);

  // API routes
  app.use(`${API_PREFIX}/auth`, authRoutes);
  app.use(`${API_PREFIX}/pets`, petRoutes);

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
