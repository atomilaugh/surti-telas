import { api } from './httpClient';

export interface AuditLogDTO {
  id: string;
  usuarioId?: string;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    role: string;
  } | null;
  accion: string;
  modulo: string;
  referenciaId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  usuarioId?: string;
  usuario?: {
    id: string;
    nombre: string;
    email: string;
    role: string;
  } | null;
  accion: string;
  modulo: string;
  referenciaId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function toAuditLog(dto: AuditLogDTO): AuditLog {
  return {
    id: dto.id,
    usuarioId: dto.usuarioId,
    usuario: dto.usuario,
    accion: dto.accion,
    modulo: dto.modulo,
    referenciaId: dto.referenciaId,
    ip: dto.ip,
    userAgent: dto.userAgent,
    metadata: dto.metadata,
    createdAt: dto.createdAt,
  };
}

export interface CreateAuditInput {
  accion: string;
  modulo: string;
  usuarioId?: string;
  referenciaId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export const auditApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<AuditLog[]> {
    const response = await api.get<{ items: AuditLogDTO[]; meta: Record<string, unknown> }>('/audit', { query });
    const items = response?.items ?? [];
    return items.map(toAuditLog);
  },
};
