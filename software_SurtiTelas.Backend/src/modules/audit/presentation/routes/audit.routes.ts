import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../auth/presentation/middlewares/authenticate';
import { requirePermission } from '../../../auth/presentation/middlewares/authorize';
import * as controller from '../controllers/audit.controller';

export const auditRouter = Router();

auditRouter.use(authenticate);
auditRouter.get('/', requirePermission('audit:read'), asyncHandler(controller.listAuditLogs));
auditRouter.get('/logs', requirePermission('audit:read'), asyncHandler(controller.listAuditLogs));
auditRouter.get('/:id', requirePermission('audit:read'), asyncHandler(controller.getAuditLog));
