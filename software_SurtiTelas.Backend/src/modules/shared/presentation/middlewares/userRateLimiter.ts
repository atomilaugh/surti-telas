import { Request, Response, NextFunction } from 'express';

const userRateLimits = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS = 100;

export function userRateLimiter(req: Request, res: Response, next: NextFunction) {
  // Skip rate limiting for OPTIONS (preflight) requests
  if (req.method === 'OPTIONS') {
    return next();
  }

  if (process.env.DISABLE_RATE_LIMIT === 'true') {
    return next();
  }
  const userId = req.user?.id || req.ip || 'anonymous';
  const now = Date.now();

  const record = userRateLimits.get(userId);

  if (!record || now > record.resetAt) {
    userRateLimits.set(userId, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }

  if (record.count >= MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      error: 'too_many_requests',
      message: 'Límite de solicitudes excedido. Intenta más tarde.',
    });
  }

  record.count += 1;
  next();
}
