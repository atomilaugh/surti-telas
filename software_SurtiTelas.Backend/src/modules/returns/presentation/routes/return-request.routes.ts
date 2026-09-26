import { Router } from 'express';
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler';
import { authenticate } from '../../../auth/presentation/middlewares/authenticate';
import * as controller from '../controllers/return-request.controller';
import { uploadReturnEvidence } from '../controllers/return-request.controller';

export const returnRequestRouter = Router();

returnRequestRouter.use(authenticate);

returnRequestRouter.get(
  '/orders/:orderId',
  asyncHandler(controller.getOrderForReturn),
);

returnRequestRouter.get(
  '/policies/warranty',
  asyncHandler(controller.getWarrantyPolicies),
);

/** Registro manual de una devolución por parte del personal autorizado. */
returnRequestRouter.post(
  '/admin',
  asyncHandler(controller.createAdminReturnRequest),
);

returnRequestRouter.post(
  '/',
  asyncHandler(controller.createReturnRequest),
);

/**
 * Listado de solicitudes. El cliente autenticado solo ve las suyas (identidad derivada
 * del token); el personal con permiso returns:read ve todas y puede filtrar.
 */
returnRequestRouter.get(
  '/',
  asyncHandler(controller.listClientReturnRequests),
);

returnRequestRouter.post(
  '/upload',
  uploadReturnEvidence,
  asyncHandler(controller.storeReturnEvidence),
);

/** Evidencia persistida de la solicitud (protegida por propietario o permiso returns:read). */
returnRequestRouter.get(
  '/:id/evidencias/:index',
  asyncHandler(controller.getReturnEvidence),
);

returnRequestRouter.get(
  '/:id',
  asyncHandler(controller.getReturnRequest),
);

returnRequestRouter.post(
  '/:id/status',
  asyncHandler(controller.changeReturnRequestStatus),
);

returnRequestRouter.post(
  '/:id/inspection',
  asyncHandler(controller.createReturnInspection),
);

returnRequestRouter.post(
  '/:id/resolution',
  asyncHandler(controller.assignReturnResolution),
);
