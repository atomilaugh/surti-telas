import { prisma } from '../../../config/database';
import { logger } from '../../../shared/infrastructure/logger';

const SENSITIVE_KEYS = [
  'password',
  'contraseña',
  'contrasena',
  'contrasenia',
  'token',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'jwt',
  'secret',
  'clave',
  'recoveryToken',
  'recovery_token',
  'tokenHash',
  'token_hash',
];

function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    const isSensitive = SENSITIVE_KEYS.some((s) => lowerKey.includes(s));
    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeMetadata(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === 'object' && item !== null ? sanitizeMetadata(item as Record<string, unknown>) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export interface AuditEventInput {
  actorUserId?: string | null;
  targetUserId?: string | null;
  action: string;
  module: string;
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';
  entityType?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

export class AuditService {
  constructor(private readonly prismaClient = prisma) {}

  async register(input: AuditEventInput): Promise<void> {
    try {
      await this.prismaClient.auditLog.create({
        data: {
          accion: input.action,
          modulo: input.module,
          actorUserId: input.actorUserId ?? null,
          targetUserId: input.targetUserId ?? null,
          result: input.result,
          entityType: input.entityType ?? null,
          entityId: input.entityId ?? null,
          referenciaId: input.entityId ?? input.targetUserId ?? null,
          ip: input.ip ?? null,
          userAgent: input.userAgent ?? null,
          metadata: sanitizeMetadata(input.metadata) as any,
        },
      });
    } catch (err) {
      logger.error('[Audit] Failed to persist audit event', {
        action: input.action,
        module: input.module,
        error: (err as Error).message,
      });
    }
  }

  async list(filters: {
    actorUserId?: string;
    targetUserId?: string;
    module?: string;
    action?: string;
    result?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    page?: number;
    limit?: number;
    sort?: 'createdAt';
    order?: 'asc' | 'desc';
  }): Promise<{ data: any[]; meta: { total: number; page: number; limit: number } }> {
    const where: any = {};
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

    const limit = Math.min(filters.limit ?? 50, 100);
    const page = filters.page ?? 1;
    const skip = (page - 1) * limit;
    const orderBy = [{ [filters.sort ?? 'createdAt']: filters.order ?? 'desc' }, { id: filters.order ?? 'desc' }];

    const [rows, total] = await this.prismaClient.$transaction([
      this.prismaClient.auditLog.findMany({
        where,
        include: { usuario: { select: { id: true, nombre: true, email: true, role: true } } },
        orderBy: orderBy as any,
        skip,
        take: limit,
      }),
      this.prismaClient.auditLog.count({ where }),
    ]);

    return {
      data: rows.map((r) => ({
        id: r.id,
        actorUserId: r.actorUserId,
        targetUserId: r.targetUserId,
        action: r.accion,
        module: r.modulo,
        result: r.result ?? 'SUCCESS',
        entityType: r.entityType,
        entityId: r.entityId ?? r.referenciaId ?? null,
        ip: r.ip,
        userAgent: r.userAgent,
        metadata: r.metadata,
        createdAt: r.createdAt,
      })),
      meta: { total, page, limit },
    };
  }
}

export const auditService = new AuditService();
