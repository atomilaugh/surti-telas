import { Request, Response, NextFunction } from 'express';

const SENSITIVE_FIELDS = new Set(['password', 'currentPassword', 'newPassword', 'token', 'refreshToken', 'idToken', 'resetPasswordToken', 'twoFactorSecret']);

const escapeHtml = (str: string): string => {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

const sanitizeValue = (value: unknown): unknown => {
  if (typeof value === 'string') {
    return escapeHtml(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map((v) => sanitizeValue(v));
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const sanitized: Record<string, unknown> = {};
    for (const k of Object.keys(value as Record<string, unknown>)) {
      sanitized[k] = SENSITIVE_FIELDS.has(k)
        ? (value as Record<string, unknown>)[k]
        : sanitizeValue((value as Record<string, unknown>)[k]);
    }
    return sanitized;
  }
  return value;
};

export function sanitizeInput(req: Request, _res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body) as typeof req.body;
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query) as typeof req.query;
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params) as typeof req.params;
  }
  next();
}
