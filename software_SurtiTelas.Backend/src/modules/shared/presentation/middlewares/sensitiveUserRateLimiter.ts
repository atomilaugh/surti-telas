import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../../../../config/redis';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 30;

const RATE_LIMIT_SCRIPT = `
  local key = KEYS[1]
  local limit = tonumber(ARGV[1])
  local window = tonumber(ARGV[2])
  local current = redis.call("GET", key)
  if current and tonumber(current) >= limit then
    return 0
  end
  redis.call("INCR", key)
  if redis.call("TTL", key) == -1 then
    redis.call("EXPIRE", key, window)
  end
  return 1
`;

export async function sensitiveUserRateLimiter(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true' || process.env.NODE_ENV === 'development') {
    return next();
  }

  if (!redisClient.isReady) {
    return res.status(503).json({
      success: false,
      error: 'service_unavailable',
      message: 'Servicio temporalmente no disponible. Intenta de nuevo más tarde.',
    });
  }

  const userId = req.user?.id || req.ip || 'anonymous';
  const key = `ratelimit:sensitive:${userId}`;
  const windowSeconds = Math.ceil(WINDOW_MS / 1000);

  try {
    const result = (await redisClient.sendCommand([
      'EVAL',
      RATE_LIMIT_SCRIPT,
      String(1),
      String(key),
      String(MAX_REQUESTS),
      String(windowSeconds),
    ])) as number;

    if (result === 0) {
      return res.status(429).json({
        success: false,
        error: 'too_many_requests',
        message: 'Demasiados intentos. Intenta de nuevo en 15 minutos.',
      });
    }

    next();
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        error: 'service_unavailable',
        message: 'Servicio temporalmente no disponible. Intenta de nuevo más tarde.',
      });
    }
    next();
  }
}
