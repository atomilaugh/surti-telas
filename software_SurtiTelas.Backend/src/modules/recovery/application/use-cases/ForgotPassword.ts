import type { AuthRepository } from '../../../auth/domain/repositories/AuthRepository';
import type { RecoveryRepository } from '../../domain/repositories/RecoveryRepository';
import type { RecoveryTokenService } from '../../domain/services/RecoveryTokenService';
import type { EmailService } from '../../../shared/domain/services/EmailService';
import { PasswordResetRequestedEvent } from '../../../../shared/application/events';
import { eventBus } from '../../../../shared/infrastructure/eventBus';

const TOKEN_TTL_MS = 15 * 60 * 1000;

export class ForgotPassword {
  constructor(
    private readonly repo: AuthRepository,
    private readonly recoveryRepo: RecoveryRepository,
    private readonly tokenService: RecoveryTokenService,
    private readonly emailService: EmailService
  ) {}

  async execute(email: string, requestId?: string, ip?: string, userAgent?: string): Promise<{ message: string }> {
    const user = await this.repo.findByEmail(email);
    if (!user || user.estado !== 'ACTIVO') {
      return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' };
    }

    const roleActive = await this.repo.isRoleActive(user.role);
    if (!roleActive) {
      return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' };
    }

    const token = await this.tokenService.generateToken();
    const tokenHash = await this.tokenService.hashToken(token);
    const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

    const recoveryRequest = await this.recoveryRepo.create({
      userId: user.id,
      email: user.email,
      tokenHash,
      expiresAt,
      ip,
      userAgent,
    });

    await this.emailService.sendPasswordReset(user.email, token, recoveryRequest.id);

    eventBus.publish(
      new PasswordResetRequestedEvent({
        userId: user.id,
        email: user.email,
        recoveryRequestId: recoveryRequest.id,
      }),
      requestId
    );

    return { message: 'Si el correo existe, recibirás instrucciones para restablecer tu contraseña' };
  }
}
