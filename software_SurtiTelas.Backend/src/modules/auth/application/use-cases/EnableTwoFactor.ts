import { generateSecret, generateURI } from 'otplib';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { auditService } from '../../../../shared/domain/services/AuditService';

export class EnableTwoFactor {
  constructor(private readonly repo: AuthRepository) {}

  async execute(userId: string, actorUserId?: string, ip?: string, userAgent?: string) {
    const secret = generateSecret();
    const otpauthUrl = generateURI({ strategy: 'totp', issuer: 'SurtiTelas', label: 'admin@surtitelas.com', secret });
    await this.repo.updateTwoFactorSecret(userId, secret);
    await this.repo.enableTwoFactor(userId, true);
    await auditService.register({
      actorUserId: actorUserId ?? userId,
      targetUserId: userId,
      action: 'AUTH_2FA_ENABLED',
      module: 'auth',
      result: 'SUCCESS',
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
    return { secret, otpauthUrl };
  }
}
