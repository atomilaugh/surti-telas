import { NextFunction, Request, Response } from 'express';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import { tokenService } from '../../../auth/infrastructure/container/authContainer';
import { JsonWebTokenError } from 'jsonwebtoken';

export const authenticate = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedError('Falta token de acceso');
    }
    const token = header.slice('Bearer '.length);
    req.user = tokenService.verifyAccessToken(token);
    next();
  } catch (error) {
    if (error instanceof JsonWebTokenError) {
      throw new UnauthorizedError('Token inválido o expirado');
    }
    console.error('authenticate error', error);
    throw error;
  }
};
