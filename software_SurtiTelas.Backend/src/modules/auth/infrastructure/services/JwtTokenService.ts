import jwt from 'jsonwebtoken';
import { env } from '../../../../config/env';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import type { AuthUser } from '../../domain/entities/User';
import type { TokenService } from '../../domain/services/TokenService';

interface TokenPayload extends AuthUser {
  type: 'access' | 'refresh' | 'temp';
}

export class JwtTokenService implements TokenService {
  signAccessToken(user: AuthUser): string {
    const payload: TokenPayload = { ...user, type: 'access' };
    return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.ACCESS_TTL as jwt.SignOptions['expiresIn'],
    });
  }

  signRefreshToken(user: AuthUser): string {
    const payload: TokenPayload = { ...user, type: 'refresh' };
    return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.REFRESH_TTL as jwt.SignOptions['expiresIn'],
    });
  }

  signTempToken(user: AuthUser): string {
    const payload: TokenPayload = { ...user, type: 'temp' };
    return jwt.sign(payload, env.JWT_TEMP_SECRET, {
      expiresIn: '5m',
    });
  }

  verifyAccessToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as TokenPayload;
      return { id: decoded.id, email: decoded.email, nombre: decoded.nombre, role: decoded.role, permissions: decoded.permissions ?? [], roleActive: decoded.roleActive ?? false };
    } catch {
      throw new UnauthorizedError('Token de acceso inválido o expirado');
    }
  }

  verifyRefreshToken(token: string): { userId: string } {
    try {
      const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
      return { userId: decoded.id };
    } catch {
      throw new UnauthorizedError('Refresh token inválido o expirado');
    }
  }

  verifyTempToken(token: string): AuthUser {
    try {
      const decoded = jwt.verify(token, env.JWT_TEMP_SECRET) as TokenPayload;
      if (decoded.type !== 'temp') {
        throw new UnauthorizedError('Token temporal inválido');
      }
      return { id: decoded.id, email: decoded.email, nombre: decoded.nombre, role: decoded.role, permissions: decoded.permissions, roleActive: decoded.roleActive ?? false };
    } catch {
      throw new UnauthorizedError('Token temporal inválido o expirado');
    }
  }
}
