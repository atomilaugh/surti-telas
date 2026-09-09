import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { auditService } from '../../../../shared/domain/services/AuditService';

export class GetProfile {
  constructor(private readonly repo: AuthRepository) {}
  async execute(userId: string) {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    const { passwordHash, refreshToken, ...publicUser } = user as any;
    return publicUser;
  }
}

export class UpdateProfile {
  constructor(private readonly repo: AuthRepository) {}
  async execute(userId: string, data: { nombre?: string; telefono?: string | null; direccion?: string | null; tipoDocumento?: string | null; numeroDocumento?: string | null; avatar?: string | null }) {
    return this.repo.updateProfile(userId, data);
  }
}

export class Logout {
  constructor(private readonly repo: AuthRepository) {}

  async execute(userId: string, actorUserId?: string, ip?: string, userAgent?: string): Promise<void> {
    await this.repo.updateRefreshToken(userId, null);
    await auditService.register({
      actorUserId: actorUserId ?? userId,
      targetUserId: userId,
      action: 'AUTH_LOGOUT',
      module: 'auth',
      result: 'SUCCESS',
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }
}
