import { PrismaClient, Prisma, EstadoUsuario } from '@prisma/client';
import type { User, UserFilters } from '../../domain/entities/UserDtos';
import type { CreateUserInput, UpdateUserInput } from '../../domain/repositories/UserInputs';
import type { UserRepository } from '../../domain/repositories/UserRepository';
import { BcryptPasswordHasher } from '../../../auth/infrastructure/services/BcryptPasswordHasher';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient, private readonly hasher: BcryptPasswordHasher) {}

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;
    return this.map(user);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) return null;
    return this.map(user);
  }

  async create(input: CreateUserInput): Promise<User> {
    const data: Prisma.UserCreateInput = {
      email: input.email,
      nombre: input.nombre,
      apellidos: input.apellidos,
      passwordHash: input.passwordHash,
      role: input.role,
      telefono: input.telefono,
      direccion: input.direccion,
      tipoDocumento: input.tipoDocumento,
      numeroDocumento: input.numeroDocumento,
      estado: input.estado ?? 'ACTIVO',
      twoFactorEnabled: input.twoFactorEnabled ?? false,
    };

    const user = await this.prisma.user.create({ data });
    return this.map(user);
  }

  async update(id: string, input: UpdateUserInput): Promise<User> {
    const data: Prisma.UserUpdateInput = {};

    if (input.nombre !== undefined) data.nombre = input.nombre;
    if (input.apellidos !== undefined) data.apellidos = input.apellidos;
    if (input.email !== undefined) data.email = input.email;
    if (input.telefono !== undefined) data.telefono = input.telefono;
    if (input.direccion !== undefined) data.direccion = input.direccion;
    if (input.tipoDocumento !== undefined) data.tipoDocumento = input.tipoDocumento;
    if (input.numeroDocumento !== undefined) data.numeroDocumento = input.numeroDocumento;
    if (input.avatar !== undefined) data.avatar = input.avatar;
    if (input.role !== undefined) data.role = input.role;
    if (input.estado !== undefined) data.estado = input.estado;
    if (input.twoFactorEnabled !== undefined) data.twoFactorEnabled = input.twoFactorEnabled;

    const user = await this.prisma.user.update({ where: { id }, data });
    return this.map(user);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async updateStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<User> {
    const user = await this.prisma.user.update({ where: { id }, data: { estado } });
    return this.map(user);
  }

  async updateRole(id: string, role: string): Promise<User> {
    const user = await this.prisma.user.update({ where: { id }, data: { role } });
    return this.map(user);
  }

  async lockUser(id: string, until: Date): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lockedUntil: until } });
  }

  async unlockUser(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lockedUntil: null } });
  }

  async resetAccess(id: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { lockedUntil: null, failedLoginAttempts: 0 } });
  }

  async setResetPasswordToken(id: string, token: string, expires: Date): Promise<void> {
    const hashed = await this.hasher.hash(token);
    await this.prisma.user.update({ where: { id }, data: { resetPasswordToken: hashed, resetPasswordExpires: expires } });
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { refreshToken: token } });
  }

  async listUsers(filters?: UserFilters): Promise<{ data: User[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    const where: Prisma.UserWhereInput = { deletedAt: null };

    if (filters?.search) {
      where.OR = [
        { nombre: { contains: filters.search } },
        { email: { contains: filters.search } },
        { numeroDocumento: { contains: filters.search } },
      ];
    }

    if (filters?.role) where.role = filters.role;
    if (filters?.estado) where.estado = filters.estado as EstadoUsuario;
    if (filters?.twoFactorEnabled !== undefined) where.twoFactorEnabled = filters.twoFactorEnabled;

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(filters?.sort, filters?.order),
      }),
      this.prisma.user.count({ where }),
    ]);

    const usersWithRoleActive = await Promise.all(
      data.map(async (u) => {
        const roleActive = await this.isRoleActive(u.role);
        return { ...this.map(u), roleActive };
      })
    );

    const meta: { total: number; page: number; limit: number; nextCursor?: string } = { total, page, limit };
    if (skip + data.length < total) {
      meta.nextCursor = Buffer.from(String(page + 1)).toString('base64');
    }

    return { data: usersWithRoleActive, meta };
  }

  async isRoleActive(role: string): Promise<boolean> {
    const roleConfig = await this.prisma.roleConfig.findUnique({
      where: { role },
      select: { estado: true },
    });
    return roleConfig ? roleConfig.estado === 'ACTIVO' : false;
  }

  async findPermissionsByRole(role: string): Promise<string[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    return rolePermissions
      .filter(rp => rp.permission.estado === 'ACTIVO')
      .map(rp => rp.permission.code);
  }

  async findPermissionsByUser(userId: string): Promise<string[]> {
    const userPermissions = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });

    return userPermissions
      .filter(up => up.permission.estado === 'ACTIVO')
      .map(up => up.permission.code);
  }

  async setUserPermissions(userId: string, permissionCodes: string[]): Promise<void> {
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
    });

    await this.prisma.userPermission.deleteMany({ where: { userId } });
    await this.prisma.userPermission.createMany({
      data: permissions.map(p => ({ userId, permissionId: p.id })),
    });
  }

  private map(user: any): User {
    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellidos: user.apellidos,
      role: user.role,
      telefono: user.telefono,
      direccion: user.direccion,
      tipoDocumento: user.tipoDocumento,
      numeroDocumento: user.numeroDocumento,
      avatar: user.avatar,
      estado: user.estado,
      twoFactorEnabled: user.twoFactorEnabled,
      lockedUntil: user.lockedUntil,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  private buildOrderBy(sort?: string, order?: 'asc' | 'desc'): Prisma.UserOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const direction = order ?? 'asc';
    return { [sort]: direction } as Prisma.UserOrderByWithRelationInput;
  }
}
