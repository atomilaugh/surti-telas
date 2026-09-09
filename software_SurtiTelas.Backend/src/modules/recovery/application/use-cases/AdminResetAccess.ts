import { NotFoundError, ForbiddenError } from '../../../../shared/domain/errors';
import type { AuthRepository } from '../../../auth/domain/repositories/AuthRepository';
import type { RecoveryRepository } from '../../domain/repositories/RecoveryRepository';
import type { RecoveryTokenService } from '../../domain/services/RecoveryTokenService';
import type { EmailService } from '../../../shared/domain/services/EmailService';
import { AdminForcedPasswordResetEvent } from '../../../../shared/application/events';
import { eventBus } from '../../../../shared/infrastructure/eventBus';

const TOKEN_TTL_MS = 60 * 60 * 1000;

export class AdminResetAccess {
  constructor(
    private readonly repo: AuthRepository,
    private readonly recoveryRepo: RecoveryRepository,
    private readonly tokenService: RecoveryTokenService,
    private readonly emailService: EmailService
  ) {}

  async execute(userId: string, actorId: string, ip?: string, userAgent?: string): Promise<{ message: string }> {
    const existing = await this.repo.findById(userId);
    if (!existing) throw new NotFoundError('Usuario no encontrado');

    if (existing.estado !== 'ACTIVO') {
      throw new ForbiddenError('Usuario inactivo');
    }

    const roleActive = await this.repo.isRoleActive(existing.role);
    if (!roleActive) {
      throw new ForbiddenError('Rol inactivo');
    }

    const token = await this.tokenService.generateToken();
    const tokenHash = await this.tokenService.hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const recoveryRequest = await this.recoveryRepo.create({
      userId: existing.id,
      email: existing.email,
      tokenHash,
      expiresAt,
      ip,
      userAgent,
    });

    await this.repo.updateRefreshToken(userId, null);

    await this.emailService.sendPasswordReset(existing.email, token, recoveryRequest.id);

    eventBus.publish(
      new AdminForcedPasswordResetEvent({
        userId: existing.id,
        email: existing.email,
        actorId,
        action: 'reset_access',
        recoveryRequestId: recoveryRequest.id,
      }),
      ip
    );

    return { message: 'Se ha enviado el enlace de restablecimiento al correo del usuario' };
  }
}
