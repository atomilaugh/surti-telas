import { NotFoundError, ConflictError } from '../../../../shared/domain/errors';
import type { User, UserFilters } from '../../domain/entities/UserDtos';
import type { UserRepository } from '../../domain/repositories/UserRepository';

export class ListUsers {
  constructor(private readonly repo: UserRepository) {}

  async execute(filters?: UserFilters): Promise<{ data: User[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    return this.repo.listUsers(filters);
  }
}

export class GetUserById {
  constructor(private readonly repo: UserRepository) {}

  async execute(id: string): Promise<User | null> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('Usuario no encontrado');
    return user;
  }
}

export class CreateUser {
  constructor(private readonly repo: UserRepository) {}

  async execute(input: { nombre: string; apellidos?: string | null; email: string; passwordHash: string; role: string; telefono?: string | null; direccion?: string | null; tipoDocumento?: string | null; numeroDocumento?: string | null; estado?: 'ACTIVO' | 'INACTIVO'; twoFactorEnabled?: boolean; }): Promise<User> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) throw new ConflictError('El correo ya está registrado');

    const user = await this.repo.create({
      ...input,
      estado: input.estado ?? 'ACTIVO',
      twoFactorEnabled: input.twoFactorEnabled ?? false,
    });

    return user;
  }
}

export class UpdateUser {
  constructor(private readonly repo: UserRepository) {}

  async execute(id: string, input: { nombre?: string; apellidos?: string | null; email?: string; telefono?: string | null; direccion?: string | null; tipoDocumento?: string | null; numeroDocumento?: string | null; avatar?: string | null; role?: string; estado?: 'ACTIVO' | 'INACTIVO'; twoFactorEnabled?: boolean; }): Promise<User> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');

    if (input.email && input.email !== existing.email) {
      const emailOwner = await this.repo.findByEmail(input.email);
      if (emailOwner && emailOwner.id !== id) throw new ConflictError('El correo ya está registrado por otro usuario');
    }

    const user = await this.repo.update(id, input);
    return user;
  }
}

export class DeleteUser {
  constructor(private readonly repo: UserRepository, private readonly prisma: import('@prisma/client').PrismaClient) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');

    if (existing.role === 'ADMIN') {
      const activeAdmins = await this.prisma.user.count({
        where: { role: 'ADMIN', deletedAt: null },
      });
      if (activeAdmins <= 1) {
        throw new ConflictError('No se puede eliminar el último administrador activo del sistema');
      }
    }

    await this.repo.delete(id);
  }
}

export class UpdateUserStatus {
  constructor(private readonly repo: UserRepository) {}

  async execute(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<User> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');
    return this.repo.updateStatus(id, estado);
  }
}

export class ChangeUserRole {
  constructor(private readonly repo: UserRepository, private readonly prisma: import('@prisma/client').PrismaClient) {}

  async execute(id: string, role: string): Promise<User> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');

    if (existing.role === 'ADMIN' && role !== 'ADMIN') {
      const activeAdmins = await this.prisma.user.count({
        where: { role: 'ADMIN', deletedAt: null },
      });
      if (activeAdmins <= 1) {
        throw new ConflictError('No se puede cambiar el rol del último administrador activo del sistema');
      }
    }

    return this.repo.updateRole(id, role);
  }
}

export class LockUser {
  constructor(private readonly repo: UserRepository) {}

  async execute(id: string, until: Date): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');
    await this.repo.lockUser(id, until);
  }
}

export class UnlockUser {
  constructor(private readonly repo: UserRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');
    await this.repo.unlockUser(id);
  }
}

export class GetUserPermissions {
  constructor(private readonly repo: UserRepository) {}

  async execute(id: string): Promise<{ role: string; rolePermissions: string[]; userPermissions: string[]; effectivePermissions: string[] }> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');

    const rolePermissions = await this.repo.findPermissionsByRole(existing.role);
    const userPermissions = await this.repo.findPermissionsByUser(id);
    const effectivePermissions = Array.from(new Set([...rolePermissions, ...userPermissions]));

    return { role: existing.role, rolePermissions, userPermissions, effectivePermissions };
  }
}

export class ResetUserAccess {
  constructor(private readonly repo: UserRepository, private readonly emailService: { sendPasswordReset(email: string, token: string): Promise<void> }) {}

  async execute(id: string): Promise<{ message: string }> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');

    const crypto = await import('node:crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);

    await this.repo.setResetPasswordToken(id, resetToken, expires);
    await this.repo.updateRefreshToken(id, null);

    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;

    await this.emailService.sendPasswordReset(existing.email, resetUrl);

    return { message: 'Se ha enviado el enlace de restablecimiento al correo del usuario' };
  }
}
