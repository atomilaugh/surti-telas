import { UnauthorizedError } from '../../../../shared/domain/errors';
import type { AuthUser } from '../../domain/entities/User';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { PasswordHasher } from '../../domain/services/PasswordHasher';
import type { TokenService } from '../../domain/services/TokenService';
import type { AuthResult } from './LoginUser';

export class RefreshToken {
  constructor(
    private readonly repo: AuthRepository,
    private readonly tokens: TokenService,
    private readonly hasher: PasswordHasher
  ) {}

  async execute(refreshToken: string): Promise<AuthResult> {
    const { userId } = this.tokens.verifyRefreshToken(refreshToken);
    const user = await this.repo.findById(userId);
    if (!user || user.estado !== 'ACTIVO') {
      throw new UnauthorizedError('Sesión inválida');
    }
    if (!user.refreshToken) {
      throw new UnauthorizedError('Sesión revocada');
    }
    const match = await this.hasher.compare(refreshToken, user.refreshToken);
    if (!match) {
      throw new UnauthorizedError('Refresh token inválido');
    }

    const rolePermissions = await this.repo.findPermissionsByRole(user.role);
    const userSpecificPermissions = await this.repo.findPermissionsByUser(user.id);
    // Permisos efectivos = permisos del rol + permisos específicos del usuario (sin duplicados).
    const permissions = Array.from(new Set([...rolePermissions, ...userSpecificPermissions]));
    const roleActive = await this.repo.isRoleActive(user.role);
    if (!roleActive) {
      throw new UnauthorizedError('Tu rol no está activo. Contacta al administrador.');
    }
    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      permissions,
      roleActive,
    };

    const accessToken = this.tokens.signAccessToken(authUser);
    const newRefresh = this.tokens.signRefreshToken(authUser);
    const hashedRefresh = await this.hasher.hash(newRefresh);
    await this.repo.updateRefreshToken(user.id, hashedRefresh);

    return { accessToken, refreshToken: newRefresh, user: authUser };
  }
}
