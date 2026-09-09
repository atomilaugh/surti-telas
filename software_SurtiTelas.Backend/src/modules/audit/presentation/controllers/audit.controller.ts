import { Request, Response } from 'express';
import { ok } from '../../../../shared/presentation/http/HttpResponse';
import { buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { auditUseCases } from '../../infrastructure/container/auditContainer';
import { AuditLogFiltersSchema } from '../validators/audit.validators';

export const listAuditLogs = async (req: Request, res: Response) => {
  const filters = parseDto(AuditLogFiltersSchema, req.query);
  const result = await auditUseCases.listAuditLogs.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page || 1,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const getAuditLog = async (req: Request, res: Response) => {
  const auditLog = await auditUseCases.getAuditLog.execute(req.params.id);
  return ok(res, auditLog);
};
