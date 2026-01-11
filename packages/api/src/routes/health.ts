import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { ApiResponse } from '@petport/shared';
import { isDbInitialized } from '../services/sqlite.js';
import { getStats } from '../services/database.js';
import { getRedisHealth, isRedisAvailable } from '../services/redis.js';
import { config } from '../config/index.js';

const router = Router();

// Async handler wrapper
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;
const asyncHandler = (fn: AsyncHandler): RequestHandler => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Root route - API landing page
router.get('/', (_req: Request, res: Response) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PetPort API</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #2D4A3E 0%, #4A6B5D 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 3rem; margin-bottom: 0.5rem; }
    .emoji { font-size: 4rem; margin-bottom: 1rem; }
    .tagline { font-size: 1.25rem; opacity: 0.9; margin-bottom: 2rem; }
    .status { 
      background: rgba(255,255,255,0.1); 
      padding: 1rem 2rem; 
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .status-dot { 
      display: inline-block; 
      width: 10px; 
      height: 10px; 
      background: #4ade80; 
      border-radius: 50%; 
      margin-right: 8px;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .endpoints { text-align: left; max-width: 400px; margin: 0 auto; }
    .endpoints h3 { margin-bottom: 1rem; }
    .endpoints a { 
      color: #a7f3d0; 
      text-decoration: none; 
      display: block;
      padding: 0.5rem 0;
    }
    .endpoints a:hover { text-decoration: underline; }
    code { background: rgba(0,0,0,0.2); padding: 2px 6px; border-radius: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="emoji">🐾</div>
    <h1>PetPort API</h1>
    <p class="tagline">The Universal Pet Identity Standard</p>
    <div class="status">
      <span class="status-dot"></span>
      API is running
    </div>
    <div class="endpoints">
      <h3>Quick Links</h3>
      <a href="/health">📊 Health Check</a>
      <a href="/health/detailed">📈 Detailed Status</a>
      <a href="/api/v1/public/verify/PP-0000-0000">🔍 Verify a Pet (example)</a>
    </div>
  </div>
</body>
</html>
  `);
});

router.get('/health', (_req: Request, res: Response<ApiResponse>) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    },
  });
});

router.get('/health/detailed', asyncHandler(async (_req: Request, res: Response<ApiResponse>) => {
  const dbReady = isDbInitialized();
  const stats = dbReady ? getStats() : { users: 0, pets: 0, vaccinations: 0 };
  const redisHealth = await getRedisHealth();
  
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      checks: {
        database: {
          status: dbReady ? 'healthy' : 'unavailable',
          type: config.database.type,
        },
        cache: {
          status: redisHealth.available ? 'healthy' : 'unavailable',
          type: redisHealth.type,
          latencyMs: redisHealth.latencyMs,
        },
        storage: 'healthy',
      },
      stats,
    },
  });
}));

router.get('/live', (_req: Request, res: Response<ApiResponse>) => {
  res.json({ success: true, data: { status: 'live' } });
});

router.get('/ready', (_req: Request, res: Response<ApiResponse>) => {
  const dbReady = isDbInitialized();
  if (!dbReady) {
    res.status(503).json({ 
      success: false, 
      error: { code: 'NOT_READY', message: 'Database not initialized' } 
    });
    return;
  }
  res.json({ success: true, data: { status: 'ready' } });
});

export const healthRoutes = router;
