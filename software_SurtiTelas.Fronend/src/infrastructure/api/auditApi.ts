import { api } from './httpClient';

export interface AuditLogDTO {
  id: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  accion: string;
  modulo: string;
  result?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  usuario?: { id: string; nombre: string; email: string; role: string } | null;
}

export interface AuditLog {
  id: string;
  actorUserId?: string | null;
  targetUserId?: string | null;
  accion: string;
  modulo: string;
  result?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  usuario?: { id: string; nombre: string; email: string; role: string } | null;
}

export function toAuditLog(dto: AuditLogDTO): AuditLog {
  return {
    id: dto.id,
    actorUserId: dto.actorUserId ?? null,
    targetUserId: dto.targetUserId ?? null,
    accion: dto.accion,
    modulo: dto.modulo,
    result: dto.result ?? null,
    entityType: dto.entityType ?? null,
    entityId: dto.entityId ?? null,
    ip: dto.ip ?? null,
    userAgent: dto.userAgent ?? null,
    metadata: (dto.metadata as Record<string, unknown> | null) ?? null,
    createdAt: dto.createdAt,
    usuario: dto.usuario ?? null,
  };
}

export interface AuditPaginatedResponse {
  items: AuditLogDTO[];
  totalRecords: number;
  page: number;
  limit: number;
  totalPages: number;
  nextCursor: string | null;
}

export const auditApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<AuditLog[]> {
    const response = await api.get<AuditPaginatedResponse>('/audit', { query });
    const items = response?.items ?? [];
    return items.map(toAuditLog);
  },
};
