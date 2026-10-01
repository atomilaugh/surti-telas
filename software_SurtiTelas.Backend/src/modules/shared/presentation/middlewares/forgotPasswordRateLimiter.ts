import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../../../../config/redis';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS_PER_IP = 5;
const MAX_REQUESTS_PER_EMAIL = 3;

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

function getClientIp(req: Request): string {
  return req.ip || req.connection.remoteAddress || 'unknown';
}

export async function forgotPasswordRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for OPTIONS (preflight) requests
  if (req.method === 'OPTIONS') {
    return next();
  }

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

  const email = (req.body?.email as string | undefined)?.toLowerCase().trim();
  const ip = getClientIp(req);

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'bad_request',
      message: 'El correo electrónico es requerido.',
    });
  }

  const ipKey = `ratelimit:forgot-password:ip:${ip}`;
  const emailKey = `ratelimit:forgot-password:email:${email}`;
  const windowSeconds = Math.ceil(WINDOW_MS / 1000);

  try {
    const ipResult = (await redisClient.sendCommand([
      'EVAL',
      RATE_LIMIT_SCRIPT,
      String(1),
      String(ipKey),
      String(MAX_REQUESTS_PER_IP),
      String(windowSeconds),
    ])) as number;

    if (ipResult === 0) {
      return res.status(429).json({
        success: false,
        error: 'too_many_requests',
        message: 'Demasiados intentos desde esta IP. Intenta de nuevo en 1 hora.',
      });
    }

    const emailResult = (await redisClient.sendCommand([
      'EVAL',
      RATE_LIMIT_SCRIPT,
      String(1),
      String(emailKey),
      String(MAX_REQUESTS_PER_EMAIL),
      String(windowSeconds),
    ])) as number;

    if (emailResult === 0) {
      return res.status(429).json({
        success: false,
        error: 'too_many_requests',
        message: 'Demasiados intentos para este correo. Intenta de nuevo en 1 hora.',
      });
    }

    next();
  } catch {
    next();
  }
}
