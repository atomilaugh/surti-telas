import { PrismaClient, Prisma } from '@prisma/client';
import type { Role, RoleFilters } from '../../domain/entities/Role';
import type { RoleRepository } from '../../domain/repositories/RoleRepository';

export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByName(name: string): Promise<Role | null> {
    const roleConfig = await this.prisma.roleConfig.findUnique({ where: { role: name } });
    if (!roleConfig) return null;

    const [permissions, usersCount] = await Promise.all([
      this.prisma.permission.findMany({
        where: {
          id: {
            in: (await this.prisma.rolePermission.findMany({
              where: { role: name },
              select: { permissionId: true },
            })).map(rp => rp.permissionId),
          },
          estado: 'ACTIVO',
        },
        select: { code: true },
      }),
      this.prisma.user.count({ where: { role: name, deletedAt: null } }),
    ]);

    return {
      role: roleConfig.role,
      descripcion: roleConfig.descripcion,
      estado: roleConfig.estado === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
      usuarios: usersCount,
      permisos: permissions.map(p => p.code),
      createdAt: roleConfig.createdAt,
      updatedAt: roleConfig.updatedAt,
    };
  }

  async listRoles(filters?: RoleFilters): Promise<{ data: Role[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    const where: Prisma.RoleConfigWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { role: { contains: filters.search, mode: 'insensitive' } },
        { descripcion: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.estado) {
      where.estado = filters.estado === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO';
    }

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.roleConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(filters?.sort, filters?.order),
      }),
      this.prisma.roleConfig.count({ where }),
    ]);

    const rolesWithPermissions = await Promise.all(
      data.map(async (rc) => {
        const permissions = await this.prisma.permission.findMany({
          where: {
            id: {
              in: (await this.prisma.rolePermission.findMany({
                where: { role: rc.role },
                select: { permissionId: true },
              })).map(rp => rp.permissionId),
            },
            estado: 'ACTIVO',
          },
          select: { code: true },
        });
        const usersCount = await this.prisma.user.count({ where: { role: rc.role, deletedAt: null } });

        return {
          role: rc.role,
          descripcion: rc.descripcion,
          estado: rc.estado === 'ACTIVO' ? 'ACTIVO' : 'INACTIVO',
          usuarios: usersCount,
          permisos: permissions.map(p => p.code),
          createdAt: rc.createdAt,
          updatedAt: rc.updatedAt,
        } as Role;
      })
    );

    const meta: { total: number; page: number; limit: number; nextCursor?: string } = { total, page, limit };
    if (skip + data.length < total) {
      meta.nextCursor = Buffer.from(String(page + 1)).toString('base64');
    }

    return { data: rolesWithPermissions, meta };
  }

  async create(data: { role: string; descripcion?: string | null; permisos?: string[] }): Promise<Role> {
    const roleConfig = await this.prisma.roleConfig.create({
      data: {
        role: data.role,
        descripcion: data.descripcion,
        estado: 'ACTIVO',
      },
    });

    if (data.permisos && data.permisos.length > 0) {
      const permissions = await this.prisma.permission.findMany({
        where: { code: { in: data.permisos } },
      });

      await this.prisma.rolePermission.createMany({
        data: permissions.map(p => ({ role: roleConfig.role, permissionId: p.id })),
      });
    }

    const result = await this.findByName(roleConfig.role);
    if (!result) throw new Error('Failed to create role');
    return result;
  }

  async update(name: string, data: { role?: string; descripcion?: string | null; permisos?: string[] }): Promise<Role> {
    const existing = await this.prisma.roleConfig.findUnique({ where: { role: name } });
    if (!existing) throw new Error('Role not found');

    const updateData: Prisma.RoleConfigUpdateInput = {};

    if (data.descripcion !== undefined) updateData.descripcion = data.descripcion;

    if (data.role && data.role !== name) {
      updateData.role = data.role;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const roleConfig = await tx.roleConfig.update({
        where: { role: name },
        data: updateData,
      });

      if (roleConfig.role !== name) {
        await tx.rolePermission.updateMany({ where: { role: name }, data: { role: roleConfig.role } });
        await tx.user.updateMany({ where: { role: name, deletedAt: null }, data: { role: roleConfig.role } });
      }

      if (data.permisos !== undefined) {
        await tx.rolePermission.deleteMany({ where: { role: roleConfig.role } });
        if (data.permisos.length > 0) {
          const permissions = await tx.permission.findMany({ where: { code: { in: data.permisos } } });
          await tx.rolePermission.createMany({
            data: permissions.map(p => ({ role: roleConfig.role, permissionId: p.id })),
            skipDuplicates: true,
          });
        }
      }

      return roleConfig;
    });

    const result = await this.findByName(updated.role);
    if (!result) throw new Error('Failed to update role');
    return result;
  }

  async delete(name: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({ where: { role: name } });
    await this.prisma.roleConfig.delete({ where: { role: name } }).catch(() => {});
  }

  async updateStatus(name: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<Role> {
    const updated = await this.prisma.roleConfig.update({
      where: { role: name },
      data: { estado },
    });

    const result = await this.findByName(updated.role);
    if (!result) throw new Error('Failed to update role status');
    return result;
  }

  async listRolePermissions(role: string): Promise<{ id: string; code: string; description: string; module: string; estado: string }[]> {
    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { role },
      include: { permission: true },
    });

    return rolePermissions.map(rp => ({
      id: rp.permission.id,
      code: rp.permission.code,
      description: rp.permission.description,
      module: rp.permission.module,
      estado: rp.permission.estado,
    }));
  }

  async assignPermission(role: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.create({
      data: { role, permissionId },
    }).catch(() => {});
  }

  async removePermission(role: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.delete({
      where: {
        role_permissionId: { role, permissionId },
      },
    }).catch(() => {});
  }

  async countUsersByRole(role: string): Promise<number> {
    return this.prisma.user.count({ where: { role, deletedAt: null } });
  }

  private buildOrderBy(sort?: string, order?: 'asc' | 'desc'): Prisma.RoleConfigOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const direction = order ?? 'asc';

    switch (sort) {
      case 'role':
        return { role: direction };
      case 'createdAt':
        return { createdAt: direction };
      case 'updatedAt':
        return { updatedAt: direction };
      default:
        return { createdAt: 'desc' };
    }
  }
}
