import { Prisma, PrismaClient, EstadoUsuario } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../../../shared/domain/errors';
import type { AuthRepository, CreateUserInput, PermissionData, RolePermissionData, RoleData } from '../../domain/repositories/AuthRepository';
import type { UserRecord } from '../../domain/entities/User';
import type { Role } from '@/shared/types/role';
import type { PasswordHasher } from '../../domain/services/PasswordHasher';

const toRecord = (u: {
  id: string;
  email: string;
  passwordHash: string;
  nombre: string;
  apellidos?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  role: Role;
  estado: 'ACTIVO' | 'INACTIVO';
  refreshToken?: string | null;
  twoFactorEnabled?: boolean;
  twoFactorSecret?: string | null;
  resetPasswordToken?: string | null;
  resetPasswordExpires?: Date | null;
  failedLoginAttempts?: number;
  lockedUntil?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  avatar?: string | null;
}): UserRecord => ({
  id: u.id,
  email: u.email,
  nombre: u.nombre,
  apellidos: u.apellidos ?? undefined,
  telefono: u.telefono,
  direccion: u.direccion,
  tipoDocumento: u.tipoDocumento,
  numeroDocumento: u.numeroDocumento,
  role: u.role,
  estado: u.estado,
  passwordHash: u.passwordHash,
  refreshToken: u.refreshToken,
  twoFactorEnabled: u.twoFactorEnabled,
  twoFactorSecret: u.twoFactorSecret,
  resetPasswordToken: u.resetPasswordToken,
  resetPasswordExpires: u.resetPasswordExpires,
  failedLoginAttempts: u.failedLoginAttempts,
  lockedUntil: u.lockedUntil,
  createdAt: u.createdAt,
  updatedAt: u.updatedAt,
  avatar: u.avatar ?? undefined,
});

import { BadRequestError } from '../../../../shared/domain/errors';

export class PrismaAuthRepository implements AuthRepository {
  constructor(private readonly prisma: PrismaClient, private readonly hasher: PasswordHasher) {}

  async findByEmail(email: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || user.deletedAt != null) return null;
    return toRecord(user);
  }

  async findById(id: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) return null;
    const rolePermissions = await this.findPermissionsByRole(user.role);
    const userPermissions = await this.findPermissionsByUser(user.id);
    const roleActive = await this.isRoleActive(user.role);
    const permissions = Array.from(new Set([...rolePermissions, ...userPermissions]));
    return { ...toRecord(user), permissions, specificPermissions: userPermissions, roleActive };
  }

  async create(input: CreateUserInput): Promise<UserRecord> {
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        nombre: input.nombre,
        apellidos: input.apellidos,
        passwordHash: input.passwordHash,
        role: input.role,
        telefono: input.telefono,
        direccion: input.direccion,
        tipoDocumento: input.tipoDocumento,
        numeroDocumento: input.numeroDocumento,
      },
    });

    if (input.permisos && input.permisos.length > 0) {
      await this.setUserPermissions(user.id, input.permisos);
    }

    return toRecord(user);
  }

  async updateRefreshToken(id: string, token: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { refreshToken: token } });
  }

  async updateStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<UserRecord> {
    const user = await this.prisma.user.update({ where: { id }, data: { estado } });
    return toRecord(user);
  }

  async updateProfile(id: string, data: { nombre?: string; email?: string; telefono?: string | null; direccion?: string | null; tipoDocumento?: string | null; numeroDocumento?: string | null; avatar?: string | null }): Promise<UserRecord> {
    const updateData: any = {
      nombre: data.nombre,
      email: data.email,
      telefono: data.telefono,
      direccion: data.direccion,
      tipoDocumento: data.tipoDocumento,
      numeroDocumento: data.numeroDocumento,
    };
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }
    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
    });
    return toRecord(user);
  }

  async findPermissionsByRole(role: string): Promise<string[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    return rows
      .filter(rp => rp.permission.estado === 'ACTIVO')
      .map(rp => rp.permission.code);
  }

  async isRoleActive(role: string): Promise<boolean> {
    const roleConfig = await this.prisma.roleConfig.findUnique({
      where: { role },
      select: { estado: true },
    });
    return roleConfig ? roleConfig.estado === 'ACTIVO' : false;
  }

  async listUsers(filters: {
    search?: string;
    role?: string;
    estado?: string;
    page?: number;
    limit?: number;
    sort?: 'nombre' | 'email' | 'createdAt';
    order?: 'asc' | 'desc';
  } = {}): Promise<{ data: UserRecord[]; meta: { total: number; page: number; limit: number } }> {
    const where: Prisma.UserWhereInput = { deletedAt: null };
    if (filters.search) {
      where.OR = [
        { nombre: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    if (filters.role) where.role = filters.role ;
    if (filters.estado) where.estado = filters.estado as EstadoUsuario;

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const sort = filters.sort ?? 'createdAt';
    const order = filters.order ?? 'desc';

    const orderBy: Record<string, 'asc' | 'desc'> = { [sort]: order };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        orderBy: orderBy as Prisma.UserOrderByWithRelationInput,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    const usersWithPermissions = await Promise.all(
      rows.map(async (u) => {
        const record = toRecord(u);
        const permissions = await this.findPermissionsByRole(u.role);
        const userPermissions = await this.findPermissionsByUser(u.id);
        const roleActive = await this.isRoleActive(u.role);
        return { ...record, permissions: Array.from(new Set([...permissions, ...userPermissions])), specificPermissions: userPermissions, roleActive };
      })
    );

    return {
      data: usersWithPermissions,
      meta: { total, page, limit },
    };
  }

  async listPermissions(filters?: { page?: number; limit?: number }): Promise<{ data: PermissionData[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const [permissions, total] = await this.prisma.$transaction([
      this.prisma.permission.findMany({ orderBy: { module: 'asc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.permission.count(),
    ]);
    return {
      data: permissions.map((p) => ({
        id: p.id,
        code: p.code,
        description: p.description,
        module: p.module,
        estado: p.estado as 'ACTIVO' | 'INACTIVO',
      })),
      meta: { total, page, limit },
    };
  }

  async createPermission(code: string, description: string, module: string): Promise<PermissionData> {
    const permission = await this.prisma.permission.create({
      data: { code, description, module },
    });
    return {
      id: permission.id,
      code: permission.code,
      description: permission.description,
      module: permission.module,
      estado: permission.estado as 'ACTIVO' | 'INACTIVO',
    };
  }

  async updatePermission(id: string, data: { code?: string; description?: string; module?: string }): Promise<PermissionData> {
    const permission = await this.prisma.permission.update({
      where: { id },
      data,
    });
    return {
      id: permission.id,
      code: permission.code,
      description: permission.description,
      module: permission.module,
      estado: permission.estado as 'ACTIVO' | 'INACTIVO',
    };
  }

  async updatePermissionStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<PermissionData> {
    const permission = await this.prisma.permission.update({
      where: { id },
      data: { estado },
    });
    return {
      id: permission.id,
      code: permission.code,
      description: permission.description,
      module: permission.module,
      estado: permission.estado as 'ACTIVO' | 'INACTIVO',
    };
  }

  async deletePermission(id: string): Promise<void> {
    await this.prisma.permission.delete({ where: { id } });
  }

  async findPermissionById(id: string): Promise<PermissionData | null> {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) return null;
    return { id: permission.id, code: permission.code, description: permission.description, module: permission.module, estado: permission.estado as 'ACTIVO' | 'INACTIVO' };
  }

  async listRolePermissions(role: Role, filters?: { page?: number; limit?: number }): Promise<{ data: RolePermissionData[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const where: Prisma.RolePermissionWhereInput = { role };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.rolePermission.findMany({ where, include: { permission: true }, skip: (page - 1) * limit, take: limit }),
      this.prisma.rolePermission.count({ where }),
    ]);
    return {
      data: rows.map((r) => ({
        role,
        permissionId: r.permissionId,
        permission: {
          id: r.permission.id,
          code: r.permission.code,
          description: r.permission.description,
          module: r.permission.module,
          estado: r.permission.estado as 'ACTIVO' | 'INACTIVO',
        },
      })),
      meta: { total, page, limit },
    };
  }

  async assignPermissionToRole(role: Role, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.create({
      data: { role, permissionId },
    });
  }

  async removePermissionFromRole(role: Role, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: { role_permissionId: { role, permissionId } },
    });
  }

  async listRoles(filters?: { page?: number; limit?: number }): Promise<{ data: RoleData[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    const roleConfigs = await this.prisma.roleConfig.findMany();
    const uniqueRoles = Array.from(new Set(roleConfigs.map(rc => rc.role)));
    const roles = uniqueRoles.filter(Boolean);
    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      where: { deletedAt: null, role: { in: roles } },
      _count: { role: true },
    });

    const countMap = new Map<string, number>();
    for (const row of counts) {
      countMap.set(row.role, (row as any)._count?.role ?? 0);
    }

    const estadoMap = new Map<string, 'Activo' | 'Inactivo'>();
    const descripcionMap = new Map<string, string>();
    const defaultDescriptions: Record<string, string> = {
      ADMIN: 'Administrador del sistema',
      ASESOR: 'Asesor de ventas',
      DOMICILIARIO: 'Domiciliario',
      CLIENTE: 'Cliente',
      ALMACEN: 'Almacén',
      PRODUCCION: 'Producción',
      REPORTES: 'Reportes',
    };
    for (const rc of roleConfigs) {
      estadoMap.set(rc.role, rc.estado === 'ACTIVO' ? 'Activo' : 'Inactivo');
      if (rc.descripcion) descripcionMap.set(rc.role, rc.descripcion);
    }

    const permissionMap = new Map<string, string[]>();
    const allRolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: { in: roles } },
      include: { permission: { select: { code: true } } },
    });
    for (const rp of allRolePermissions) {
      const existing = permissionMap.get(rp.role) ?? [];
      existing.push(rp.permission.code);
      permissionMap.set(rp.role, existing);
    }

    const allRoles = roles.map((name) => ({
      id: `R-${name}`,
      nombre: name,
      descripcion: descripcionMap.get(name) ?? defaultDescriptions[name] ?? name,
      permisos: permissionMap.get(name) ?? [],
      usuarios: countMap.get(name) ?? 0,
      estado: estadoMap.get(name) ?? 'Activo',
    }));

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 50;
    const total = allRoles.length;
    const start = (page - 1) * limit;
    const paginated = allRoles.slice(start, start + limit);

    return { data: paginated, meta: { total, page, limit } };
  }

  async getRole(id: string): Promise<RoleData | null> {
    const roleName = id.startsWith('R-') ? id.slice(2) : id;
    const roleConfig = await this.prisma.roleConfig.findUnique({
      where: { role: roleName },
    });
    if (!roleConfig) return null;

    const counts = await this.prisma.user.groupBy({
      by: ['role'],
      where: { role: roleName , deletedAt: null },
      _count: { role: true },
    });
    const usuarios = counts[0]?._count.role ?? 0;

    const defaultDescriptions: Record<string, string> = {
      ADMIN: 'Administrador del sistema',
      ASESOR: 'Asesor de ventas',
      DOMICILIARIO: 'Domiciliario',
      CLIENTE: 'Cliente',
      ALMACEN: 'Almacén',
      PRODUCCION: 'Producción',
      REPORTES: 'Reportes',
    };
    const estado = roleConfig.estado === 'ACTIVO' ? 'Activo' : 'Inactivo';

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: roleName  },
      include: { permission: { select: { code: true } } },
    });
    const permisos = rolePermissions.map(rp => rp.permission.code);

    return {
      id: `R-${roleName}`,
      nombre: roleName,
      descripcion: roleConfig?.descripcion ?? defaultDescriptions[roleName] ?? roleName,
      permisos,
      usuarios,
      estado,
    };
  }

  async findRoleByName(name: string): Promise<RoleData | null> {
    const roleName = name.startsWith('R-') ? name.slice(2) : name;
    const roleConfig = await this.prisma.roleConfig.findUnique({
      where: { role: roleName },
    });
    if (!roleConfig) return null;

    const count = await this.prisma.user.count({ where: { role: roleName , deletedAt: null } });

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role: roleName  },
      include: { permission: { select: { code: true } } },
    });
    const permisos = rolePermissions.map(rp => rp.permission.code);

    const defaultDescriptions: Record<string, string> = {
      ADMIN: 'Administrador del sistema',
      ASESOR: 'Asesor de ventas',
      DOMICILIARIO: 'Domiciliario',
      CLIENTE: 'Cliente',
      ALMACEN: 'Almacén',
      PRODUCCION: 'Producción',
      REPORTES: 'Reportes',
    };

    return {
      id: `R-${roleName}`,
      nombre: roleName,
      descripcion: roleConfig.descripcion ?? defaultDescriptions[roleName] ?? roleName,
      permisos,
      usuarios: count,
      estado: roleConfig.estado === 'INACTIVO' ? 'Inactivo' : 'Activo',
    };
  }

  async createRole(nombre: string, descripcion?: string, permisos?: string[]): Promise<RoleData> {
    const roleName = nombre.startsWith('R-') ? nombre.slice(2) : nombre;
    const defaultDescriptions: Record<string, string> = {
      ADMIN: 'Administrador del sistema',
      ASESOR: 'Asesor de ventas',
      DOMICILIARIO: 'Domiciliario',
      CLIENTE: 'Cliente',
      ALMACEN: 'Almacén',
      PRODUCCION: 'Producción',
      REPORTES: 'Reportes',
    };
    const roleConfig = await this.prisma.roleConfig.upsert({
      where: { role: roleName },
      update: { descripcion: descripcion ?? defaultDescriptions[roleName] ?? roleName },
      create: { role: roleName, estado: 'ACTIVO', descripcion: descripcion ?? defaultDescriptions[roleName] ?? roleName },
    });
    const count = await this.prisma.user.count({ where: { role: roleName , deletedAt: null } });

    if (permisos && permisos.length > 0) {
      await this.prisma.rolePermission.deleteMany({ where: { role: roleName } });

      const existingPermissions = await this.prisma.permission.findMany({
        where: { code: { in: permisos } },
        select: { id: true, code: true },
      });
      const existingCodes = new Set(existingPermissions.map(p => p.code));
      const validPermissions = permisos.filter(code => existingCodes.has(code));

      if (validPermissions.length > 0) {
        const validIds = existingPermissions.filter(p => validPermissions.includes(p.code)).map(p => p.id);
        await this.prisma.rolePermission.createMany({
          data: validIds.map(permissionId => ({ role: roleName, permissionId })),
        });
      }
    }

    return {
      id: `R-${roleName}`,
      nombre: roleName,
      descripcion: roleConfig.descripcion ?? defaultDescriptions[roleName] ?? roleName,
      permisos: permisos ?? [],
      usuarios: count,
      estado: roleConfig.estado === 'INACTIVO' ? 'Inactivo' : 'Activo',
    };
  }

  async updateRole(currentName: string, newName: string, descripcion?: string, permisos?: string[]): Promise<RoleData> {
    const currentRoleName = currentName.startsWith('R-') ? currentName.slice(2) : currentName;
    const targetRoleName = newName.startsWith('R-') ? newName.slice(2) : newName;
    const found = await this.findRoleByName(currentRoleName);
    if (!found) throw new NotFoundError('Rol no encontrado');
    
    const shouldRename = currentRoleName !== targetRoleName;
    if (shouldRename) {
      const existingTarget = await this.findRoleByName(targetRoleName);
      if (existingTarget) throw new ConflictError('Ya existe un rol con ese nombre');
    }
    
    const updated = await this.prisma.roleConfig.update({
      where: { role: currentRoleName },
      data: { 
        role: shouldRename ? targetRoleName : currentRoleName,
        descripcion: descripcion ?? found.descripcion 
      },
    });

    if (shouldRename) {
      await this.prisma.rolePermission.updateMany({
        where: { role: currentRoleName },
        data: { role: targetRoleName },
      });
    }
    
    const finalRoleName = shouldRename ? targetRoleName : currentRoleName;
    const count = await this.prisma.user.count({ where: { role: finalRoleName , deletedAt: null } });
    const defaultDescriptions: Record<string, string> = {
      ADMIN: 'Administrador del sistema',
      ASESOR: 'Asesor de ventas',
      DOMICILIARIO: 'Domiciliario',
      CLIENTE: 'Cliente',
      ALMACEN: 'Almacén',
      PRODUCCION: 'Producción',
      REPORTES: 'Reportes',
    };

    if (permisos !== undefined) {
      await this.prisma.rolePermission.deleteMany({ where: { role: finalRoleName } });
      if (permisos.length > 0) {
        const existingPermissions = await this.prisma.permission.findMany({
          where: { code: { in: permisos } },
          select: { id: true, code: true },
        });
        const existingCodes = new Set(existingPermissions.map(p => p.code));
        const validPermissions = permisos.filter(code => existingCodes.has(code));

        if (validPermissions.length > 0) {
          const validIds = existingPermissions.filter(p => validPermissions.includes(p.code)).map(p => p.id);
          await this.prisma.rolePermission.createMany({
            data: validIds.map(permissionId => ({ role: finalRoleName, permissionId })),
          });
        }
      }
    }

    return {
      id: `R-${finalRoleName}`,
      nombre: finalRoleName,
      descripcion: updated.descripcion ?? defaultDescriptions[finalRoleName] ?? finalRoleName,
      permisos: permisos ?? found.permisos,
      usuarios: count,
      estado: updated.estado === 'INACTIVO' ? 'Inactivo' : 'Activo',
    };
  }

  async updateRoleStatus(nombre: string, estado: 'Activo' | 'Inactivo'): Promise<RoleData> {
    const roleName = nombre.startsWith('R-') ? nombre.slice(2) : nombre;
    const roleEstado = estado === 'Activo' ? 'ACTIVO' : 'INACTIVO';
    const roleConfig = await this.prisma.roleConfig.upsert({
      where: { role: roleName },
      update: { estado: roleEstado },
      create: { role: roleName, estado: roleEstado },
    });
    const count = await this.prisma.user.count({ where: { role: roleName , deletedAt: null } });
    const descriptions: Record<string, string> = {
      ADMIN: 'Administrador del sistema',
      ASESOR: 'Asesor de ventas',
      DOMICILIARIO: 'Domiciliario',
      CLIENTE: 'Cliente',
      ALMACEN: 'Almacén',
      PRODUCCION: 'Producción',
      REPORTES: 'Reportes',
    };
    return {
      id: `R-${roleName}`,
      nombre: roleName,
      descripcion: descriptions[roleName] ?? roleName,
      permisos: [],
      usuarios: count,
      estado: roleConfig.estado === 'INACTIVO' ? 'Inactivo' : 'Activo',
    };
  }

  async deleteRole(nombre: string): Promise<void> {
    const roleName = nombre.startsWith('R-') ? nombre.slice(2) : nombre;
    const count = await this.prisma.user.count({ where: { role: roleName as any, deletedAt: null } });
    if (count > 0) {
      throw new BadRequestError(`No se puede eliminar el rol ${roleName} porque tiene ${count} usuario(s) asignado(s)`);
    }
    try {
      await this.prisma.roleConfig.delete({ where: { role: roleName as any } });
    } catch (error) {
      if ((error as any)?.code === 'P2025') {
        return;
      }
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError('Usuario no encontrado');
    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async updateTwoFactorSecret(id: string, secret: string | null): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { twoFactorSecret: secret } });
  }

  async enableTwoFactor(id: string, enabled: boolean): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { twoFactorEnabled: enabled } });
  }

  async setResetPasswordToken(id: string, token: string, expires: Date): Promise<void> {
    const hashedToken = await this.hasher.hash(token);
    await this.prisma.recoveryRequest.create({
      data: {
        userId: id,
        email: '',
        tokenHash: hashedToken,
        expiresAt: expires,
        estado: 'PENDIENTE',
      },
    });
  }

  async findByResetPasswordToken(token: string): Promise<UserRecord | null> {
    const request = await this.prisma.recoveryRequest.findFirst({
      where: {
        estado: 'PENDIENTE',
        expiresAt: { gte: new Date() },
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!request) return null;

    const match = await this.hasher.compare(token, request.tokenHash);
    if (!match) return null;

    const user = await this.prisma.user.findFirst({
      where: { id: request.userId, deletedAt: null },
    });

    if (!user) return null;
    return toRecord(user);
  }

  async clearResetPasswordToken(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { resetPasswordToken: null, resetPasswordExpires: null },
    });
    await this.prisma.recoveryRequest.updateMany({
      where: { userId: id, estado: 'PENDIENTE' },
      data: { estado: 'COMPLETADA', completedAt: new Date(), resultado: 'Contraseña actualizada' },
    });
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { passwordHash } });
  }

  async incrementFailedLoginAttempts(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: { increment: 1 } },
    });
  }

  async resetFailedLoginAttempts(id: string): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  }

  async lockUser(id: string, until: Date): Promise<void> {
    await this.prisma.user.update({
      where: { id },
      data: { lockedUntil: until },
    });
  }

  async updateGoogleId(id: string, googleId: string): Promise<void> {
    await this.prisma.user.update({ where: { id }, data: { googleId } });
  }

  async findPermissionsByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.userPermission.findMany({
      where: { userId },
      include: { permission: true },
    });
    return rows.map((r) => r.permission.code);
  }

  async setUserPermissions(userId: string, permissionCodes: string[]): Promise<void> {
    // permissionCodes are functional codes (e.g. "customers:read"), not DB ids.
    // Only valid, existing permission codes are linked (security: never create
    // permissions for codes that do not exist in the catalog).
    await this.prisma.userPermission.deleteMany({ where: { userId } });
    if (permissionCodes.length > 0) {
      const existingPermissions = await this.prisma.permission.findMany({
        where: { code: { in: permissionCodes } },
        select: { id: true },
      });
      const validIds = existingPermissions.map((p) => p.id);

      if (validIds.length > 0) {
        await this.prisma.userPermission.createMany({
          data: validIds.map((permissionId) => ({ userId, permissionId })),
        });
      }
    }
  }

  async createUserPermission(userId: string, permissionId: string): Promise<void> {
    await this.prisma.userPermission.create({
      data: { userId, permissionId },
    });
  }

  async removeUserPermission(userId: string, permissionId: string): Promise<void> {
    await this.prisma.userPermission.delete({
      where: { userId_permissionId: { userId, permissionId } },
    });
  }
}

