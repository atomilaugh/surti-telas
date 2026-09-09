import { NotFoundError } from '../../../../shared/domain/errors';
import type { AuditLogFilters, AuditLogRepository } from '../../domain/repositories/AuditLogRepository';

export class ListAuditLogs {
  constructor(private readonly repo: AuditLogRepository) {}
  execute(filters?: AuditLogFilters) {
    return this.repo.list(filters);
  }
}

export class GetAuditLog {
  constructor(private readonly repo: AuditLogRepository) {}
  async execute(id: string) {
    const log = await this.repo.getById(id);
    if (!log) throw new NotFoundError('Registro de auditoría no encontrado');
    return log;
  }
}
