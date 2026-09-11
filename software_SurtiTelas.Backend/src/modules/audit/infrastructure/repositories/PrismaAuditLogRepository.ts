import { Prisma, PrismaClient } from '@prisma/client';
import { AuditLog } from '../../domain/entities/AuditLog';
import type { AuditLogFilters, AuditLogRepository } from '../../domain/repositories/AuditLogRepository';

interface AuditRow {
  id: string;
  actorUserId: string | null;
  targetUserId: string | null;
  usuarioId: string | null;
  accion: string;
  modulo: string;
  result: string | null;
  entityType: string | null;
  entityId: string | null;
  referenciaId: string | null;
  ip: string | null;
  userAgent: string | null;
  metadata: unknown;
  createdAt: Date;
}

interface UsuarioRef {
  id: string;
  nombre: string;
  email: string;
  role: string;
}

type AuditRowWithUser = AuditRow & { usuario: UsuarioRef | null };

export class PrismaAuditLogRepository implements AuditLogRepository {
  constructor(private readonly prisma: PrismaClient) {}

  private async attachUsuarios(rows: AuditRow[]): Promise<AuditRowWithUser[]> {
    const ids = new Set<string>();
    for (const r of rows) {
      if (r.actorUserId) ids.add(r.actorUserId);
      if (r.usuarioId) ids.add(r.usuarioId);
    }
    if (ids.size === 0) {
      return rows.map((r) => ({ ...r, usuario: null }));
    }
    const users = await this.prisma.user.findMany({
      where: { id: { in: Array.from(ids) } },
      select: { id: true, nombre: true, email: true, role: true },
    });
    const map = new Map(users.map((u) => [u.id, u]));
    return rows.map((r) => {
      const key = r.actorUserId ?? r.usuarioId;
      return { ...r, usuario: key ? (map.get(key) ?? null) : null };
    });
  }

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
          orderBy,
          take: limit + 1,
        }),
        this.prisma.auditLog.count({ where }),
      ]);

      const hasMore = rows.length > limit;
      const data = hasMore ? rows.slice(0, limit) : rows;
      const nextCursor = hasMore && data.length ? Buffer.from(data[data.length - 1].id).toString('base64') : undefined;

      const enriched = await this.attachUsuarios(data);

      return {
        data: enriched.map((r) => new AuditLog(r)),
        meta: { total, page: 1, limit, nextCursor },
      };
    }

    const page = filters.page ?? 1;
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: orderBy as Prisma.AuditLogOrderByWithRelationInput,
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    const enriched = await this.attachUsuarios(rows);

    return {
      data: enriched.map((r) => new AuditLog(r)),
      meta: { total, page, limit },
    };
  }

  async getById(id: string): Promise<AuditLog | null> {
    const row = await this.prisma.auditLog.findFirst({ where: { id } });
    if (!row) return null;
    const [enriched] = await this.attachUsuarios([row]);
    return new AuditLog(enriched);
  }
}
