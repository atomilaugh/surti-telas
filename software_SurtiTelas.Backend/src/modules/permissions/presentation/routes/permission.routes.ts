import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../../modules/auth/presentation/middlewares/authenticate';
import { requirePermission } from '../../../../modules/auth/presentation/middlewares/authorize';
import { sensitiveUserRateLimiter } from '../../../../modules/shared/presentation/middlewares/sensitiveUserRateLimiter';
import * as controller from '../controllers/permission.controller';

export const permissionsRouter = Router();

permissionsRouter.get('/', authenticate, requirePermission('permissions:read'), asyncHandler(controller.listPermissions));
permissionsRouter.get('/:id', authenticate, requirePermission('permissions:read'), asyncHandler(controller.getPermission));
permissionsRouter.post('/', authenticate, requirePermission('permissions:create'), sensitiveUserRateLimiter, asyncHandler(controller.createPermission));
permissionsRouter.patch('/:id', authenticate, requirePermission('permissions:update'), asyncHandler(controller.updatePermission));
permissionsRouter.delete('/:id', authenticate, requirePermission('permissions:delete'), sensitiveUserRateLimiter, asyncHandler(controller.deletePermission));
permissionsRouter.patch('/:id/status', authenticate, requirePermission('permissions:update'), asyncHandler(controller.updatePermissionStatus));
