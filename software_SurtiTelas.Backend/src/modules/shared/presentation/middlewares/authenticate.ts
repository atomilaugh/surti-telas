import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import { tokenService } from '../../../auth/infrastructure/container/authContainer';
import { authRepository } from '../../../auth/infrastructure/container/authContainer';
import { JsonWebTokenError } from 'jsonwebtoken';

export const authenticate = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Falta token de acceso');
    }
    const token = header.slice('Bearer '.length);
    let user = tokenService.verifyAccessToken(token);
    if (!user.permissions || user.permissions.length === 0) {
      const fullUser = await authRepository.findById(user.id);
      if (fullUser) {
        const permissions = fullUser.role ? await authRepository.findPermissionsByRole(fullUser.role) : [];
        user = { ...user, permissions };
      }
    }
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Token inválido o expirado');
    }
    console.error('authenticate error', error);
    throw error;
  }
};
