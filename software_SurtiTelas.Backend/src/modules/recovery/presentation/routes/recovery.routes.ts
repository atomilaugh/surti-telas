import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../../modules/auth/presentation/middlewares/authenticate';
import { requirePermission } from '../../../../modules/auth/presentation/middlewares/authorize';
import { recoveryRateLimiter } from '../../../../modules/shared/presentation/middlewares/recoveryRateLimiter';
import * as controller from '../controllers/recovery.controller';

export const recoveryRouter = Router();

recoveryRouter.post('/forgot-password', recoveryRateLimiter, asyncHandler(controller.forgotPassword));
recoveryRouter.post('/reset-password', recoveryRateLimiter, asyncHandler(controller.resetPassword));
recoveryRouter.patch('/change-password', authenticate, asyncHandler(controller.changePassword));

recoveryRouter.get('/requests', authenticate, requirePermission('users:read'), asyncHandler(controller.listRecoveryRequests));
recoveryRouter.get('/requests/:id', authenticate, requirePermission('users:read'), asyncHandler(controller.getRecoveryRequest));
recoveryRouter.patch('/requests/:id/reject', authenticate, requirePermission('users:update'), asyncHandler(controller.rejectRecoveryRequest));
