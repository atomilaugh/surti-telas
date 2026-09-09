import type { AuditLog } from '../entities/AuditLog';

export interface AuditLogFilters {
  actorUserId?: string;
  targetUserId?: string;
  module?: string;
  action?: string;
  result?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: 'createdAt';
  order?: 'asc' | 'desc';
}

export interface AuditLogRepository {
  list(filters?: AuditLogFilters): Promise<{ data: AuditLog[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }>;
  getById(id: string): Promise<AuditLog | null>;
}
