import { prisma } from '../../../../config/database';
import { PrismaAuditLogRepository } from '../repositories/PrismaAuditLogRepository';
import { ListAuditLogs, GetAuditLog } from '../../application/use-cases/AuditLogUseCases';

const auditLogRepository = new PrismaAuditLogRepository(prisma);

export const auditUseCases = {
  listAuditLogs: new ListAuditLogs(auditLogRepository),
  getAuditLog: new GetAuditLog(auditLogRepository),
};
