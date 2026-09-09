import { Prisma, PrismaClient } from '@prisma/client';
import { AuditLog } from '../../domain/entities/AuditLog';
import type { AuditLogFilters, AuditLogRepository } from '../../domain/repositories/AuditLogRepository';

const include = {
  usuario: {
    select: {
      id: true,
      nombre: true,
      email: true,
      role: true,
    },
  },
} satisfies Prisma.AuditLogInclude;

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async list(filters: AuditLogFilters = {}): Promise<{ data: AuditLog[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.targetUserId) where.targetUserId = filters.targetUserId;
    if (filters.module) where.modulo = filters.module;
    if (filters.action) where.accion = filters.action;
    if (filters.result) where.result = filters.result;
    if (filters.entityType) where.entityType = filters.entityType;

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const limit = filters.limit ?? 50;
    const sort = filters.sort ?? 'createdAt';
    const order = filters.order ?? 'desc';
    const orderBy: Prisma.AuditLogOrderByWithRelationInput[] = [{ [sort]: order }, { id: order }];

    const cursorId = filters.cursor ? Buffer.from(filters.cursor, 'base64').toString('utf-8') : undefined;

    if (cursorId) {
      const cursorWhere: Prisma.AuditLogWhereInput = {
        ...where,
        OR: [{ id: order === 'asc' ? { gt: cursorId } : { lt: cursorId } }],
      };

      const [rows, total] = await this.prisma.$transaction([
        this.prisma.auditLog.findMany({
          where: cursorWhere,
          include,
          orderBy,
          take: limit + 1,
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && data.length ? Buffer.from(data[data.length - 1].id).toString('base64') : undefined;

      return {
        data: data.map((r) => new AuditLog(r)),
        meta: { total, page: 1, limit, nextCursor },
      };
    }

    const page = filters.page ?? 1;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include,
        orderBy: orderBy as Prisma.AuditLogOrderByWithRelationInput,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: rows.map((r) => new AuditLog(r)),
      meta: { total, page, limit },
    };
  }

  async getById(id: string): Promise<AuditLog | null> {
    const row = await this.prisma.auditLog.findFirst({
      where: { id },
      include,
    });
    return row ? new AuditLog(row) : null;
  }
}
