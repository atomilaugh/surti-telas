import { Request, Response } from 'express';
import { z } from 'zod';
import { ok, created } from '../../../../shared/presentation/http/HttpResponse';
import { buildHateoasLinks, buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { clearCache } from '../../../../modules/shared/presentation/middlewares/cache';
import { returnRequestUseCases, warrantyPolicyUseCases } from '../../infrastructure/container/returnsContainer';
import {
  CreateReturnRequestSchema,
  ReturnRequestStatusEnum,
  ChangeReturnRequestStatusSchema,
  CreateReturnInspectionSchema,
  CreateReturnResolutionSchema,
} from '../validators/guarantee.validators';
import { prisma } from '../../../../config/database';
import { ForbiddenError, NotFoundError, UnauthorizedError } from '../../../../shared/domain/errors';
import { returnEvidenceUpload, resolveReturnEvidencePath, toReturnEvidenceRef } from '../middlewares/returnEvidenceUpload';
import type { ReturnRequestFilters } from '../../domain/entities/ReturnRequest';

const ReturnRequestQuerySchema = z.object({
  estado: ReturnRequestStatusEnum.optional(),
  cliente: z.string().optional(),
  customerId: z.string().optional(),
  orderId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

const CLIENT_SCOPED_QUERY_SCHEMA = z.object({
  estado: ReturnRequestStatusEnum.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

/** Identidad del cliente autenticado resuelta desde la sesión (nunca desde el body/query). */
async function resolveAuthenticatedCustomerId(req: Request): Promise<string> {
  const user = req.user;
  if (!user) throw new UnauthorizedError();
  const customer = await prisma.customer.findFirst({
    where: { email: user.email, deletedAt: null },
    select: { id: true },
  });
  if (!customer) {
    throw new NotFoundError('No se encontró un cliente asociado a tu usuario');
  }
  return customer.id;
}

function isStaff(req: Request): boolean {
  return req.user?.role !== 'CLIENTE';
}

function hasPermission(req: Request, code: string): boolean {
  const user = req.user;
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  return Array.isArray(user.permissions) && user.permissions.includes(code);
}

function assertCanManageReturns(req: Request, code: 'returns:read' | 'returns:create' | 'returns:update'): void {
  if (!req.user) throw new UnauthorizedError();
  if (!hasPermission(req, code)) {
    throw new ForbiddenError(`Requiere el permiso "${code}"`);
  }
}

/** Un cliente solo puede operar sobre sus propias solicitudes; el personal autorizado sobre todas. */
async function assertCanAccessRequest(req: Request, request: { customerId?: string | null }): Promise<void> {
  if (isStaff(req)) {
    assertCanManageReturns(req, 'returns:read');
    return;
  }
  const customerId = await resolveAuthenticatedCustomerId(req);
  if (!request.customerId || request.customerId !== customerId) {
    throw new ForbiddenError('No tienes permisos para consultar esta solicitud');
  }
}

export const listReturnRequests = async (req: Request, res: Response) => {
  assertCanManageReturns(req, 'returns:read');
  const filters = parseDto(ReturnRequestQuerySchema, req.query) as ReturnRequestFilters;
  const result = await returnRequestUseCases.listRequests.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.limit,
    result.meta.nextCursor,
  );
  return ok(res, response);
};

export const listClientReturnRequests = async (req: Request, res: Response) => {
  let filters: ReturnRequestFilters;

  if (isStaff(req)) {
    assertCanManageReturns(req, 'returns:read');
    filters = parseDto(ReturnRequestQuerySchema, req.query) as ReturnRequestFilters;
  } else {
    const customerId = await resolveAuthenticatedCustomerId(req);
    const scoped = parseDto(CLIENT_SCOPED_QUERY_SCHEMA, req.query);
    filters = { customerId, ...scoped };
  }

  const result = await returnRequestUseCases.listRequests.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.limit,
    result.meta.nextCursor,
  );
  return ok(res, response);
};

export const getReturnRequest = async (req: Request, res: Response) => {
  const result = await returnRequestUseCases.getRequestWithRelations.execute(req.params.id);
  await assertCanAccessRequest(req, result.request);
  const links = buildHateoasLinks('/api/v1/client/return-requests', result.request.id);
  return ok(res, { ...result.request.toDTO(), items: result.items.map(i => i.toDTO()), ...(result.inspection && { inspection: result.inspection.toDTO() }), ...(result.resolution && { resolution: result.resolution.toDTO() }), histories: result.histories.map(h => h.toDTO()), _links: links });
};

/** Verifica que el pedido pertenezca al cliente indicado (los empleados pueden ver cualquier pedido). */
async function assertOrderBelongsToCustomer(order: { clienteId: string }, customerId: string | null): Promise<void> {
  if (customerId && order.clienteId !== customerId) {
    throw new ForbiddenError('El pedido seleccionado no pertenece a tu cuenta');
  }
}

const buildCreateInput = (
  validated: ReturnType<typeof CreateReturnRequestSchema.parse>,
  opts: { canalRegistro?: string; evidencias?: string[] },
) => ({
  orderId: validated.orderId,
  motivo: validated.motivo,
  observaciones: validated.observaciones,
  cantidadTotal: validated.cantidadTotal,
  items: validated.items,
  canalRegistro: opts.canalRegistro,
  evidencias: opts.evidencias,
});

export const createReturnRequest = async (req: Request, res: Response) => {
  const validated = parseDto(CreateReturnRequestSchema, req.body);
  const evidencias = validated.evidencias ?? validated.imagenes ?? [];
  const customerId = isStaff(req) ? null : await resolveAuthenticatedCustomerId(req);
  if (customerId) {
    const order = await prisma.order.findFirst({
      where: { id: validated.orderId, deletedAt: null },
      select: { clienteId: true },
    });
    if (!order) throw new NotFoundError('Pedido no encontrado');
    await assertOrderBelongsToCustomer(order, customerId);
  }
  const result = await returnRequestUseCases.createRequest.execute(
    buildCreateInput(validated, { canalRegistro: validated.canalRegistro ?? 'PORTAL', evidencias }),
    req.requestId,
    req.user?.nombre,
  );
  clearCache('/api/v1/client/return-requests');
  return created(res, result.toDTO(), 'Solicitud de devolución creada');
};

/** Registro manual por parte del administrador (teléfono, presencial, WhatsApp o asesor). */
export const createAdminReturnRequest = async (req: Request, res: Response) => {
  assertCanManageReturns(req, 'returns:create');
  const validated = parseDto(CreateReturnRequestSchema, req.body);
  const evidencias = validated.evidencias ?? validated.imagenes ?? [];
  const result = await returnRequestUseCases.createRequest.execute(
    buildCreateInput(validated, {
      canalRegistro: validated.canalRegistro ?? 'TELEFONO',
      evidencias,
    }),
    req.requestId,
    req.user?.nombre,
  );
  clearCache('/api/v1/client/return-requests');
  return created(res, result.toDTO(), 'Solicitud de devolución registrada');
};

export const getOrderForReturn = async (req: Request, res: Response) => {
  const order = await prisma.order.findFirst({
    where: {
      id: req.params.orderId,
      deletedAt: null,
    },
    select: {
      id: true,
      numero: true,
      clienteId: true,
      clienteNombre: true,
      estado: true,
      fecha: true,
      items: {
        select: {
          id: true,
          productId: true,
          nombre: true,
          cantidad: true,
          product: {
            select: {
              id: true,
              ref: true,
            },
          },
        },
      },
    },
  });
  if (!order) {
    return ok(res, null);
  }
  if (!isStaff(req)) {
    await assertOrderBelongsToCustomer(order, await resolveAuthenticatedCustomerId(req));
  }
  const formatted = {
    id: order.id,
    numero: order.numero,
    cliente: order.clienteNombre,
    clienteId: order.clienteId,
    estado: order.estado,
    fecha: order.fecha,
    items: order.items.map((i) => ({
      id: i.id,
      productId: i.productId ?? null,
      ref: i.product?.ref ?? '',
      nombre: i.nombre,
      cantidad: i.cantidad,
    })),
  };
  return ok(res, formatted);
};

export const getWarrantyPolicies = async (_req: Request, res: Response) => {
  const policies = await warrantyPolicyUseCases.listPolicies.execute(true);
  return ok(res, policies.map(p => p.toDTO()));
};

export const uploadReturnEvidence = returnEvidenceUpload.array('files', 10);

export const storeReturnEvidence = async (req: Request, res: Response) => {
  const files = (req.files as Express.Multer.File[] | undefined) ?? [];
  const evidencias: { url: string; nombre: string; mime: string; size: number }[] = files.map((file) => ({
    url: toReturnEvidenceRef(file),
    nombre: file.originalname,
    mime: file.mimetype,
    size: file.size,
  }));
  return created(res, { evidencias }, 'Evidencias cargadas');
};

export const getReturnEvidence = async (req: Request, res: Response) => {
  const result = await returnRequestUseCases.getRequestWithRelations.execute(req.params.id);
  await assertCanAccessRequest(req, result.request);

  const index = Number.parseInt(req.params.index, 10);
  const evidencias: string[] = result.request.evidencias ?? [];
  if (!Number.isInteger(index) || index < 0 || index >= evidencias.length) {
    throw new NotFoundError('Evidencia no encontrada');
  }

  const filePath = resolveReturnEvidencePath(evidencias[index]);
  if (!filePath) {
    throw new NotFoundError('El archivo de evidencia no está disponible');
  }

  const extension = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  const mimeByExtension: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.pdf': 'application/pdf',
  };

  return res.sendFile(filePath, {
    headers: {
      'Content-Type': mimeByExtension[extension] ?? 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
      'Content-Disposition': `inline; filename="evidencia${extension}"`,
    },
  });
};

export const changeReturnRequestStatus = async (req: Request, res: Response) => {
  assertCanManageReturns(req, 'returns:update');
  const { estado, usuario, observaciones } = parseDto(ChangeReturnRequestStatusSchema, req.body);
  const result = await returnRequestUseCases.changeRequestStatus.execute(
    req.params.id,
    estado,
    req.user?.nombre ?? usuario,
    observaciones,
    req.requestId,
  );
  clearCache('/api/v1/client/return-requests');
  return ok(res, result.toDTO(), 'Estado de solicitud actualizado');
};

export const createReturnInspection = async (req: Request, res: Response) => {
  assertCanManageReturns(req, 'returns:update');
  const input = parseDto(CreateReturnInspectionSchema, req.body);
  const result = await returnRequestUseCases.completeInspection.execute(
    req.params.id,
    input,
    req.user?.nombre,
    req.requestId,
  );
  clearCache('/api/v1/client/return-requests');
  return created(res, result.toDTO(), 'Inspección completada');
};

export const assignReturnResolution = async (req: Request, res: Response) => {
  assertCanManageReturns(req, 'returns:update');
  const input = parseDto(CreateReturnResolutionSchema, req.body);
  const result = await returnRequestUseCases.assignResolution.execute(
    req.params.id,
    input,
    req.user?.nombre,
    req.requestId,
  );
  clearCache('/api/v1/client/return-requests');
  return created(res, result.toDTO(), 'Resolución asignada');
};
