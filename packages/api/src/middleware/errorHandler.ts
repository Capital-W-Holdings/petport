import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { AppError, ApiResponse } from '@petport/shared';
import { logger } from '../config/logger.js';
import { isDev } from '../config/index.js';

export const errorHandler: ErrorRequestHandler = (
  error: Error,
  req: Request,
  res: Response<ApiResponse>,
  _next: NextFunction
): void => {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (error instanceof AppError) {
    logger.warn({ err: error, requestId, path: req.path }, error.message);
    res.status(error.statusCode).json({
      success: false,
      error: error.toJSON(),
    });
    return;
  }

  if (error instanceof ZodError) {
    const details = error.errors.reduce<Record<string, string>>((acc, err) => {
      const path = err.path.join('.');
      acc[path] = err.message;
      return acc;
    }, {});

    logger.warn({ err: error, requestId, path: req.path }, 'Validation error');
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details,
      },
    });
    return;
  }

  logger.error({ err: error, requestId, path: req.path }, 'Unhandled error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev() ? error.message : 'An unexpected error occurred',
    },
  });
};

export function notFoundHandler(req: Request, res: Response<ApiResponse>): void {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
}
