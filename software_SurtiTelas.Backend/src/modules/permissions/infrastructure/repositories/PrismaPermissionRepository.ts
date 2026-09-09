import { PrismaClient, Prisma } from '@prisma/client';
import type { Permission, PermissionFilters } from '../../domain/entities/Permission';
import type { PermissionRepository } from '../../domain/repositories/PermissionRepository';

export class PrismaPermissionRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Permission | null> {
    const permission = await this.prisma.permission.findUnique({ where: { id } });
    if (!permission) return null;
    return this.map(permission);
  }

  async findByCode(code: string): Promise<Permission | null> {
    const permission = await this.prisma.permission.findUnique({ where: { code } });
    if (!permission) return null;
    return this.map(permission);
  }

  async listPermissions(filters?: PermissionFilters): Promise<{ data: Permission[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    const where: Prisma.PermissionWhereInput = {};

    if (filters?.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.module) where.module = filters.module;
    if (filters?.estado) where.estado = filters.estado as 'ACTIVO' | 'INACTIVO';

    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.permission.findMany({
        where,
        skip,
        take: limit,
        orderBy: this.buildOrderBy(filters?.sort, filters?.order),
      }),
      this.prisma.permission.count({ where }),
    ]);

    const meta: { total: number; page: number; limit: number; nextCursor?: string } = { total, page, limit };
    if (skip + data.length < total) {
      meta.nextCursor = Buffer.from(String(page + 1)).toString('base64');
    }

    return { data: data.map(this.map), meta };
  }

  async create(data: { code: string; description: string; module: string }): Promise<Permission> {
    const permission = await this.prisma.permission.create({
      data: {
        code: data.code,
        description: data.description,
        module: data.module,
        estado: 'ACTIVO',
      },
    });
    return this.map(permission);
  }

  async update(id: string, data: { code?: string; description?: string; module?: string }): Promise<Permission> {
    const updateData: Prisma.PermissionUpdateInput = {};

    if (data.code !== undefined) updateData.code = data.code;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.module !== undefined) updateData.module = data.module;

    const permission = await this.prisma.permission.update({
      where: { id },
      data: updateData,
    });
    return this.map(permission);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.permission.delete({ where: { id } }).catch(() => {});
  }

  async updateStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<Permission> {
    const permission = await this.prisma.permission.update({
      where: { id },
      data: { estado },
    });
    return this.map(permission);
  }

  private map(permission: any): Permission {
    return {
      id: permission.id,
      code: permission.code,
      description: permission.description,
      module: permission.module,
      estado: permission.estado,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }

  private buildOrderBy(sort?: string, order?: 'asc' | 'desc'): Prisma.PermissionOrderByWithRelationInput {
    if (!sort) return { createdAt: 'desc' };
    const direction = order ?? 'asc';
    return { [sort]: direction } as Prisma.PermissionOrderByWithRelationInput;
  }
}
