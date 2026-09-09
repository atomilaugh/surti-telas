import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../../modules/auth/presentation/middlewares/authenticate';
import { requirePermission } from '../../../../modules/auth/presentation/middlewares/authorize';
import { sensitiveUserRateLimiter } from '../../../../modules/shared/presentation/middlewares/sensitiveUserRateLimiter';
import * as controller from '../controllers/user.controller';

export const usersRouter = Router();

usersRouter.get('/', authenticate, requirePermission('users:read'), asyncHandler(controller.listUsers));
usersRouter.get('/:id', authenticate, requirePermission('users:read'), asyncHandler(controller.getUser));
usersRouter.post('/', authenticate, requirePermission('users:create'), sensitiveUserRateLimiter, asyncHandler(controller.createUser));
usersRouter.patch('/:id', authenticate, requirePermission('users:update'), asyncHandler(controller.updateUser));
usersRouter.delete('/:id', authenticate, requirePermission('users:delete'), sensitiveUserRateLimiter, asyncHandler(controller.deleteUser));
usersRouter.patch('/:id/status', authenticate, requirePermission('users:update'), asyncHandler(controller.updateUserStatus));
usersRouter.patch('/:id/role', authenticate, requirePermission('users:update'), asyncHandler(controller.changeUserRole));
usersRouter.post('/:id/lock', authenticate, requirePermission('users:update'), asyncHandler(controller.lockUser));
usersRouter.post('/:id/unlock', authenticate, requirePermission('users:update'), asyncHandler(controller.unlockUser));
usersRouter.get('/:id/permissions', authenticate, requirePermission('users:read'), asyncHandler(controller.getUserPermissions));
usersRouter.post('/:id/reset-access', authenticate, requirePermission('users:update'), sensitiveUserRateLimiter, asyncHandler(controller.resetUserAccess));
