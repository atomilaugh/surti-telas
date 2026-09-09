import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { auditService } from '../../../../shared/domain/services/AuditService';

export class DisableTwoFactor {
  constructor(private readonly repo: AuthRepository) {}

  async execute(userId: string, actorUserId?: string, ip?: string, userAgent?: string) {
    await this.repo.updateTwoFactorSecret(userId, null);
    await this.repo.enableTwoFactor(userId, false);
    await auditService.register({
      actorUserId: actorUserId ?? userId,
      targetUserId: userId,
      action: 'AUTH_2FA_DISABLED',
      module: 'auth',
      result: 'SUCCESS',
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }
}
