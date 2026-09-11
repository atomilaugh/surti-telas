import { UnauthorizedError } from '../../../../shared/domain/errors';
import type { AuthUser } from '../../domain/entities/User';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { PasswordHasher } from '../../domain/services/PasswordHasher';
import type { TokenService } from '../../domain/services/TokenService';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import { AuthLoginEvent } from '../../../../shared/application/events';
import { auditService } from '../../../../shared/domain/services/AuditService';

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

export interface LoginResultWith2FA {
  requiresTwoFactor: true;
  tempToken: string;
  user: Pick<AuthUser, 'id' | 'email' | 'nombre' | 'role'>;
}

export type LoginResult = AuthResult | LoginResultWith2FA;

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export class LoginUser {
  constructor(
    private readonly repo: AuthRepository,
    private readonly tokens: TokenService,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(input: { email: string; password: string; ip?: string; userAgent?: string }): Promise<LoginResult> {
    const normalizedEmail = input.email.toLowerCase();
    const user = await this.repo.findByEmail(normalizedEmail);

    if (!user || user.estado !== 'ACTIVO') {
      await auditService.register({
        actorUserId: null,
        targetUserId: null,
        action: 'AUTH_LOGIN_FAILED',
        module: 'auth',
        result: 'FAILURE',
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: { reason: 'invalid_credentials' },
      });
      throw new UnauthorizedError('Credenciales inválidas');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      await auditService.register({
        actorUserId: user.id,
        targetUserId: user.id,
        action: 'USER_LOCKED',
        module: 'auth',
        result: 'DENIED',
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: { remainingMinutes },
      });
      throw new UnauthorizedError(`Cuenta bloqueada temporalmente. Intenta de nuevo en ${remainingMinutes} minutos`);
    }

    const valid = await this.hasher.compare(input.password, user.passwordHash);
    if (!valid) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      if (newAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await this.repo.lockUser(user.id, lockedUntil);
        await this.repo.incrementFailedLoginAttempts(user.id);
        await auditService.register({
          actorUserId: user.id,
          targetUserId: user.id,
          action: 'USER_LOCKED',
          module: 'auth',
          result: 'DENIED',
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          metadata: { reason: 'too_many_failed_attempts' },
        });
        throw new UnauthorizedError(`Demasiados intentos fallidos. Cuenta bloqueada por ${LOCKOUT_DURATION_MS / 60000} minutos`);
      }
      await this.repo.incrementFailedLoginAttempts(user.id);
      await auditService.register({
        actorUserId: user.id,
        targetUserId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        module: 'auth',
        result: 'FAILURE',
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: { reason: 'invalid_password' },
      });
      throw new UnauthorizedError('Credenciales inválidas');
    }

    await this.repo.resetFailedLoginAttempts(user.id);

    const roleActive = await this.repo.isRoleActive(user.role);
    if (!roleActive) {
      await auditService.register({
        actorUserId: user.id,
        targetUserId: user.id,
        action: 'AUTH_LOGIN_FAILED',
        module: 'auth',
        result: 'DENIED',
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
        metadata: { reason: 'role_inactive' },
      });
      throw new UnauthorizedError('Tu rol no está activo. Contacta al administrador.');
    }

    const rolePermissions = await this.repo.findPermissionsByRole(user.role);
    const userSpecificPermissions = await this.repo.findPermissionsByUser(user.id);
    const permissions = Array.from(new Set([...rolePermissions, ...userSpecificPermissions]));
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      permissions,
      roleActive,
    };

    if (user.twoFactorEnabled) {
      const tempToken = this.tokens.signTempToken(authUser);
      await auditService.register({
        actorUserId: user.id,
        targetUserId: user.id,
        action: 'AUTH_2FA_REQUIRED',
        module: 'auth',
        result: 'SUCCESS',
        ip: input.ip ?? null,
        userAgent: input.userAgent ?? null,
      });
      return { requiresTwoFactor: true, tempToken, user: authUser };
    }

    const accessToken = this.tokens.signAccessToken(authUser);
    const refreshToken = this.tokens.signRefreshToken(authUser);
    const hashedRefresh = await this.hasher.hash(refreshToken);
    await this.repo.updateRefreshToken(user.id, hashedRefresh);

    await auditService.register({
      actorUserId: user.id,
      targetUserId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      module: 'auth',
      result: 'SUCCESS',
      ip: input.ip ?? null,
      userAgent: input.userAgent ?? null,
    });

    eventBus.publish(
      new AuthLoginEvent({
        userId: authUser.id,
        email: authUser.email,
      })
    );

    return { accessToken, refreshToken, user: authUser };
  }
}
