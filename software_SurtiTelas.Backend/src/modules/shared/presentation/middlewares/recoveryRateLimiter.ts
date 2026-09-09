import { Request, Response, NextFunction } from 'express';
import { TooManyRequestsError } from '../../../../shared/domain/errors';
import { redisClient } from '../../../../config/redis';

const FORGOT_WINDOW_MS = 15 * 60 * 1000;
const FORGOT_LIMIT = 3;
const RESET_WINDOW_MS = 15 * 60 * 1000;
const RESET_LIMIT = 5;

function getKey(ip: string, suffix: string): string {
  return `ratelimit:recovery:${suffix}:${ip}`;
}

async function checkLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  if (!redisClient.isReady) {
    return false;
  }

  const current = await redisClient.get(key);
  if (!current) {
    await redisClient.setEx(key, Math.ceil(windowMs / 1000), '1');
    return false;
  }

  const count = Number(current);
  if (count >= limit) {
    return true;
  }

  await redisClient.multi().incr(key).expire(key, Math.ceil(windowMs / 1000)).exec();
  return false;
}

export const recoveryRateLimiter = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || 'unknown';
  const path = req.path;

  try {
    if (path === '/forgot-password' || path === '/api/v1/recovery/forgot-password') {
      const key = getKey(ip, 'forgot');
      const limited = await checkLimit(key, FORGOT_LIMIT, FORGOT_WINDOW_MS);
      if (limited) {
        throw new TooManyRequestsError('Demasiados intentos. Intenta de nuevo más tarde');
      }
    } else if (path === '/reset-password' || path === '/api/v1/recovery/reset-password') {
      const key = getKey(ip, 'reset');
      const limited = await checkLimit(key, RESET_LIMIT, RESET_WINDOW_MS);
      if (limited) {
        throw new TooManyRequestsError('Demasiados intentos. Intenta de nuevo más tarde');
      }
    }

    next();
  } catch (error) {
    if (error instanceof TooManyRequestsError) {
      throw error;
    }
    console.error('recoveryRateLimiter error', error);
    next();
  }
};
