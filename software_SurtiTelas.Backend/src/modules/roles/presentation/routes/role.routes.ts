import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../../modules/auth/presentation/middlewares/authenticate';
import { requirePermission } from '../../../../modules/auth/presentation/middlewares/authorize';
import { sensitiveUserRateLimiter } from '../../../../modules/shared/presentation/middlewares/sensitiveUserRateLimiter';
import * as controller from '../controllers/role.controller';

export const rolesRouter = Router();

rolesRouter.get('/', authenticate, requirePermission('roles:read'), asyncHandler(controller.listRoles));
rolesRouter.get('/:id', authenticate, requirePermission('roles:read'), asyncHandler(controller.getRole));
rolesRouter.post('/', authenticate, requirePermission('roles:create'), sensitiveUserRateLimiter, asyncHandler(controller.createRole));
rolesRouter.patch('/:id', authenticate, requirePermission('roles:update'), asyncHandler(controller.updateRole));
rolesRouter.delete('/:id', authenticate, requirePermission('roles:delete'), sensitiveUserRateLimiter, asyncHandler(controller.deleteRole));
rolesRouter.patch('/:id/status', authenticate, requirePermission('roles:update'), asyncHandler(controller.updateRoleStatus));
rolesRouter.get('/:id/permissions', authenticate, requirePermission('roles:read'), asyncHandler(controller.getRolePermissions));
rolesRouter.post('/:id/permissions', authenticate, requirePermission('roles:update'), asyncHandler(controller.assignPermissionToRole));
rolesRouter.delete('/:id/permissions', authenticate, requirePermission('roles:update'), asyncHandler(controller.removePermissionFromRole));
