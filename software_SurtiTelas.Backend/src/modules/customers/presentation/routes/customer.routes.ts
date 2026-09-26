import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../auth/presentation/middlewares/authenticate';
import { requirePermission } from '../../../auth/presentation/middlewares/authorize';
import * as controller from '../controllers/customer.controller';

export const customerRouter = Router();

customerRouter.use(authenticate);
customerRouter.get('/', requirePermission('customers:read'), asyncHandler(controller.listCustomers));
customerRouter.get('/search', requirePermission('customers:read'), asyncHandler(controller.searchCustomersByDocument));
customerRouter.get('/:id', requirePermission('customers:read'), asyncHandler(controller.getCustomer));
customerRouter.get('/me/trusted-status', requirePermission('customers:read'), asyncHandler(controller.getCustomerTrustedStatus));
customerRouter.post('/', requirePermission('customers:create'), asyncHandler(controller.createCustomer));
customerRouter.patch('/:id', requirePermission('customers:update'), asyncHandler(controller.updateCustomer));
customerRouter.post('/:id/asesor', requirePermission('customers:update'), asyncHandler(controller.assignAsesor));
customerRouter.patch('/:id/cupo', requirePermission('customers:update'), asyncHandler(controller.updateCupo));
customerRouter.delete('/:id', requirePermission('customers:delete'), asyncHandler(controller.deleteCustomer));
