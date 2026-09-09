import { NotFoundError, ForbiddenError } from '../../../../shared/domain/errors';
import type { AuthRepository } from '../../../auth/domain/repositories/AuthRepository';
import type { RecoveryRepository } from '../../domain/repositories/RecoveryRepository';
import type { RecoveryTokenService } from '../../domain/services/RecoveryTokenService';
import type { PasswordHasher } from '../../../auth/domain/services/PasswordHasher';
import { PasswordResetAttemptedEvent, PasswordResetCompletedEvent } from '../../../../shared/application/events';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import { redisClient } from '../../../../config/redis';

const RESET_COOLDOWN_SECONDS = 15 * 60;
const RESET_COOLDOWN_KEY_PREFIX = 'ratelimit:reset-password:user:';

export class ResetPassword {
  constructor(
    private readonly repo: AuthRepository,
    private readonly recoveryRepo: RecoveryRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokenService: RecoveryTokenService
  ) {}

  async execute(token: string, newPassword: string, requestId?: string, ip?: string, userAgent?: string): Promise<{ user: { id: string; email: string } }> {
    const recoveryRequest = await this.recoveryRepo.findByTokenHash(await this.tokenService.hashToken(token));

    if (!recoveryRequest) {
      eventBus.publish(
        new PasswordResetAttemptedEvent({
          userId: 'unknown',
          email: '',
          success: false,
          reason: 'invalid_or_expired_token',
          ip,
          userAgent,
        }),
        requestId
      );
      throw new NotFoundError('Token de restablecimiento inválido o expirado');
    }

    const request = await this.recoveryRepo.findById(recoveryRequest.id);
    if (!request || request.estado !== 'PENDIENTE') {
      eventBus.publish(
        new PasswordResetAttemptedEvent({
          userId: request?.userId ?? 'unknown',
          email: request?.email ?? '',
          success: false,
          reason: 'token_already_used',
          ip,
          userAgent,
        }),
        requestId
      );
      throw new NotFoundError('Token de restablecimiento inválido o expirado');
    }

    if (request.expiresAt < new Date()) {
      await this.recoveryRepo.markExpired(request.id);
      eventBus.publish(
        new PasswordResetAttemptedEvent({
          userId: request.userId,
          email: request.email,
          success: false,
          reason: 'token_expired',
          ip,
          userAgent,
        }),
        requestId
      );
      throw new NotFoundError('Token de restablecimiento inválido o expirado');
    }

    const user = await this.repo.findById(request.userId);
    if (!user || user.estado !== 'ACTIVO') {
      await this.recoveryRepo.markRejected(request.id, 'Usuario inactivo');
      throw new ForbiddenError('Usuario inactivo');
    }

    const roleActive = await this.repo.isRoleActive(user.role);
    if (!roleActive) {
      await this.recoveryRepo.markRejected(request.id, 'Rol inactivo');
      throw new ForbiddenError('Rol inactivo');
    }

    const cooldownKey = `${RESET_COOLDOWN_KEY_PREFIX}${user.id}`;
    if (redisClient.isReady) {
      const lastReset = await redisClient.get(cooldownKey);
      if (lastReset) {
        eventBus.publish(
          new PasswordResetAttemptedEvent({
            userId: user.id,
            email: user.email,
            success: false,
            reason: 'cooldown_active',
            ip,
            userAgent,
          }),
          requestId
        );
        throw new ForbiddenError('Debes esperar antes de volver a restablecer tu contraseña');
      }
    }

    const hashedPassword = await this.hasher.hash(newPassword);
    await this.repo.updatePassword(user.id, hashedPassword);
    await this.repo.updateRefreshToken(user.id, null);

    await this.recoveryRepo.markCompleted(request.id, 'Contraseña actualizada');

    if (redisClient.isReady) {
      await redisClient.setEx(cooldownKey, RESET_COOLDOWN_SECONDS, '1');
    }

    eventBus.publish(
      new PasswordResetCompletedEvent({
        userId: user.id,
        email: user.email,
        recoveryRequestId: request.id,
        ip,
        userAgent,
      }),
      requestId
    );

    return { user: { id: user.id, email: user.email } };
  }
}
