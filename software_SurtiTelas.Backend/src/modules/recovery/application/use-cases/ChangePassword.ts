import { UnauthorizedError } from '../../../../shared/domain/errors';
import type { AuthRepository } from '../../../auth/domain/repositories/AuthRepository';
import type { PasswordHasher } from '../../../auth/domain/services/PasswordHasher';
import { PasswordChangedEvent } from '../../../../shared/application/events';
import { eventBus } from '../../../../shared/infrastructure/eventBus';

export class ChangePassword {
  constructor(
    private readonly repo: AuthRepository,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(userId: string, currentPassword: string, newPassword: string, requestId?: string, ip?: string, userAgent?: string): Promise<void> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new UnauthorizedError('Usuario no encontrado');
    }

    const valid = await this.hasher.compare(currentPassword, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedError('Contraseña actual incorrecta');
    }

    const hashedPassword = await this.hasher.hash(newPassword);
    await this.repo.updatePassword(userId, hashedPassword);
    await this.repo.updateRefreshToken(userId, null);

    eventBus.publish(
      new PasswordChangedEvent({
        userId: user.id,
        email: user.email,
        ip,
        userAgent,
      }),
      requestId
    );
  }
}
