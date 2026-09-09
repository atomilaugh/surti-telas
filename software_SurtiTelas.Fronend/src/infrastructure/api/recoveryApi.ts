import { api } from './httpClient';

export interface RecoveryRequestDTO {
  id: string;
  userId: string;
  email: string;
  estado: 'PENDIENTE' | 'COMPLETADA' | 'EXPIRADA' | 'RECHAZADA';
  fechaSolicitud: string;
  expiresAt: string;
  completedAt?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface RecoveryRequest {
  id: string;
  userId: string;
  email: string;
  estado: 'Pendiente' | 'Completada' | 'Expirada' | 'Rechazada';
  fechaSolicitud: string;
  expiracion: string;
  completada?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export function toRecoveryRequest(dto: RecoveryRequestDTO): RecoveryRequest {
  return {
    id: dto.id,
    userId: dto.userId,
    email: dto.email,
    estado: dto.estado === 'PENDIENTE' ? 'Pendiente' : dto.estado === 'COMPLETADA' ? 'Completada' : dto.estado === 'EXPIRADA' ? 'Expirada' : 'Rechazada',
    fechaSolicitud: dto.fechaSolicitud,
    expiracion: dto.expiresAt,
    completada: dto.completedAt ?? null,
    ip: dto.ip ?? null,
    userAgent: dto.userAgent ?? null,
  };
}

export interface RecoveryFilters {
  page?: number;
  limit?: number;
  estado?: string;
  userId?: string;
  email?: string;
  fromDate?: string;
  toDate?: string;
}

export const recoveryApi = {
  async list(filters?: RecoveryFilters): Promise<{ items: RecoveryRequest[]; meta: Record<string, unknown> }> {
    const response = await api.get<{ items: RecoveryRequestDTO[]; meta: Record<string, unknown> }>('/recovery/requests', { query: filters as Record<string, string | number | boolean | (string | number | boolean)[] | null | undefined> });
    const items = (response?.items ?? []).map(toRecoveryRequest);
    return { items, meta: response?.meta ?? { total: 0, page: 1, limit: 20 } };
  },

  async getById(id: string): Promise<RecoveryRequest | null> {
    try {
      const dto = await api.get<RecoveryRequestDTO>(`/recovery/requests/${encodeURIComponent(id)}`);
      return dto ? toRecoveryRequest(dto) : null;
    } catch {
      return null;
    }
  },

  async reject(id: string, motivo: string): Promise<void> {
    await api.patch<void>(`/recovery/requests/${encodeURIComponent(id)}/reject`, { motivo });
  },
};

export default recoveryApi;
