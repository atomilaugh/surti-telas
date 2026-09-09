import { OAuth2Client } from 'google-auth-library';
import { UnauthorizedError } from '../../../../shared/domain/errors';
import type { AuthUser } from '../../domain/entities/User';
import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { PasswordHasher } from '../../domain/services/PasswordHasher';
import type { TokenService } from '../../domain/services/TokenService';
import type { AuthResult } from './LoginUser';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

export class GoogleAuth {
  constructor(
    private readonly repo: AuthRepository,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenService
  ) {}

  async execute(idToken: string): Promise<AuthResult> {
    if (!GOOGLE_CLIENT_ID) {
      throw new UnauthorizedError('Google Client ID no configurado');
    }

    const client = new OAuth2Client(GOOGLE_CLIENT_ID);

    let ticket: { getPayload: () => { email?: string; sub?: string; name?: string } | null };
    try {
      ticket = await client.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      }) as { getPayload: () => { email?: string; sub?: string; name?: string } | null };
    } catch {
      throw new UnauthorizedError('Token de Google inválido');
    }

    const payload = ticket.getPayload();
    if (!payload?.email || !payload?.sub || !payload?.name) {
      throw new UnauthorizedError('Token de Google incompleto');
    }

    const email = payload.email.toLowerCase();
    const nombre = payload.name;
    const googleId = payload.sub;

    let user = await this.repo.findByEmail(email);

    if (!user) {
      const randomPassword = await this.hasher.hash(googleId + Date.now());
      user = await this.repo.create({
        email,
        nombre,
        passwordHash: randomPassword,
        role: 'CLIENTE',
      });
    } else if (user.googleId !== googleId) {
      if (!user.passwordHash) {
        const randomPassword = await this.hasher.hash(googleId + Date.now());
        await this.repo.updatePassword(user.id, randomPassword);
      }
      await this.repo.updateGoogleId(user.id, googleId);
    }

    const permissions = await this.repo.findPermissionsByRole(user.role);
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
    const refreshToken = this.tokens.signRefreshToken(authUser);
    const hashedRefresh = await this.hasher.hash(refreshToken);
    await this.repo.updateRefreshToken(user.id, hashedRefresh);

    return { accessToken, refreshToken, user: authUser };
  }
}
