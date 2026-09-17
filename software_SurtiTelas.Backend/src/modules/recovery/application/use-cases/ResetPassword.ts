import { NotFoundError, ForbiddenError } from '../../../../shared/domain/errors';
import { RecoveryRequestStatus } from '../../domain/entities/RecoveryRequest';
import type { AuthRepository } from '../../../auth/domain/repositories/AuthRepository';
import type { RecoveryRepository } from '../../domain/repositories/RecoveryRepository';
import type { RecoveryRequest } from '../../domain/entities/RecoveryRequest';
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
    const { data: pendingRequests } = await this.recoveryRepo.findAll({ estado: RecoveryRequestStatus.PENDIENTE, limit: 1000 });

    let matchedRequest: RecoveryRequest | null = null;
    for (const req of pendingRequests) {
      if (await this.tokenService.verifyToken(token, req.tokenHash)) {
        matchedRequest = req;
        break;
      }
    }

    if (matchedRequest) {
      if (matchedRequest.expiresAt < new Date()) {
        await this.recoveryRepo.markExpired(matchedRequest.id);
        eventBus.publish(
          new PasswordResetAttemptedEvent({
            userId: matchedRequest.userId,
            email: matchedRequest.email,
            success: false,
            reason: 'token_expired',
            ip,
            userAgent,
          }),
          requestId
        );
        throw new NotFoundError('Token de restablecimiento expirado');
      }

      const user = await this.repo.findById(matchedRequest.userId);
      if (!user || user.estado !== 'ACTIVO') {
        await this.recoveryRepo.markRejected(matchedRequest.id, 'Usuario inactivo');
        throw new ForbiddenError('Usuario inactivo');
      }

      const roleActive = await this.repo.isRoleActive(user.role);
      if (!roleActive) {
        await this.recoveryRepo.markRejected(matchedRequest.id, 'Rol inactivo');
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

      await this.recoveryRepo.markCompleted(matchedRequest.id, 'Contraseña actualizada');

      if (redisClient.isReady) {
        await redisClient.setEx(cooldownKey, RESET_COOLDOWN_SECONDS, '1');
      }

      eventBus.publish(
        new PasswordResetCompletedEvent({
          userId: user.id,
          email: user.email,
          recoveryRequestId: matchedRequest.id,
          ip,
          userAgent,
        }),
        requestId
      );

      return { user: { id: user.id, email: user.email } };
    }

    const { data: completedRequests } = await this.recoveryRepo.findAll({ estado: RecoveryRequestStatus.COMPLETADA, limit: 1000 });
    for (const req of completedRequests) {
      if (await this.tokenService.verifyToken(token, req.tokenHash)) {
        eventBus.publish(
          new PasswordResetAttemptedEvent({
            userId: req.userId,
            email: req.email,
            success: false,
            reason: 'token_already_used',
            ip,
            userAgent,
          }),
          requestId
        );
        throw new ForbiddenError('Token de restablecimiento ya utilizado');
      }
    }

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
    throw new NotFoundError('Token de restablecimiento no encontrado');
  }
}
