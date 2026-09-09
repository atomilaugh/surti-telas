import { NextFunction, Request, Response } from 'express';
import { ForbiddenError, UnauthorizedError } from '../../../../shared/domain/errors';

export const requireRole =
  (...roles: string[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) throw new UnauthorizedError();
    if (req.user.roleActive === false) throw new ForbiddenError('Rol inactivo');
    if (!roles.includes(req.user.role)) throw new ForbiddenError('Rol no autorizado');
    next();
  };

export const requirePermission =
  (code: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) throw new UnauthorizedError();
      if (req.user.roleActive === false) throw new ForbiddenError('Rol inactivo');
      if (req.user.role === 'ADMIN') return next();
      const permissions = Array.isArray(req.user.permissions) ? req.user.permissions : [];
      if (!permissions.includes(code)) {
        throw new ForbiddenError(`Requiere el permiso "${code}"`);
      }
      next();
    } catch (error) {
      console.error('requirePermission error', error, { code, user: req.user });
      throw error;
    }
  };
