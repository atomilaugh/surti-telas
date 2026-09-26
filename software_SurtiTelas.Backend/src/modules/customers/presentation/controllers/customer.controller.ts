import { Request, Response } from 'express';
import { ok, created, noContent } from '../../../../shared/presentation/http/HttpResponse';
import { ForbiddenError } from '../../../../shared/domain/errors';
import { buildHateoasLinks, buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { customerUseCases } from '../../infrastructure/container/customerContainer';
import {
  AssignAsesorSchema,
  CreateCustomerSchema,
  CustomerDocumentSearchSchema,
  CustomerFiltersSchema,
  UpdateCupoSchema,
  UpdateCustomerSchema,
} from '../validators/customer.validators';

export const listCustomers = async (req: Request, res: Response) => {
  const filters = parseDto(CustomerFiltersSchema, req.query);
  const result = await customerUseCases.getCustomers.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page || 1,
    result.meta.limit,
    result.meta.nextCursor,
    { activos: result.meta.activos, inactivos: result.meta.inactivos, conDeuda: result.meta.conDeuda },
  );
  return ok(res, response);
};

export const getCustomer = async (req: Request, res: Response) => {
  const customer = await customerUseCases.getCustomerById.execute(req.params.id);
  const hateoas = buildHateoasLinks('/api/v1/customers', customer.id);
  return ok(res, { ...customer, _links: hateoas });
};

/** Búsqueda de clientes por número de identificación (realizada en base de datos). */
export const searchCustomersByDocument = async (req: Request, res: Response) => {
  // La búsqueda por documento es una herramienta operativa: se restringe al personal
  // para no exponer datos de otros clientes a los usuarios finales.
  if (!req.user || req.user.role === 'CLIENTE') {
    throw new ForbiddenError('No tienes permisos para buscar clientes');
  }
  const { document, limit } = parseDto(CustomerDocumentSearchSchema, req.query);
  const matches = await customerUseCases.searchByDocument.execute(document, limit);
  return ok(res, { items: matches, total: matches.length });
};

export const getCustomerTrustedStatus = async (req: Request, res: Response) => {
  const result = await customerUseCases.getCustomerTrustedStatus.execute(req.user!.id);
  if (!result) {
    return ok(res, { isTrustedCustomer: false });
  }
  return ok(res, result);
};

export const createCustomer = async (req: Request, res: Response) => {
  const input = parseDto(CreateCustomerSchema, req.body);
  const customer = await customerUseCases.createCustomer.execute(input, req.requestId);
  return created(res, customer, 'Cliente creado');
};

export const updateCustomer = async (req: Request, res: Response) => {
  const changes = parseDto(UpdateCustomerSchema, req.body);
  const customer = await customerUseCases.updateCustomer.execute(req.params.id, changes, req.requestId);
  return ok(res, customer, 'Cliente actualizado');
};

export const assignAsesor = async (req: Request, res: Response) => {
  const { asesorId } = parseDto(AssignAsesorSchema, req.body);
  const customer = await customerUseCases.assignAsesor.execute(req.params.id, asesorId, req.requestId);
  return ok(res, customer, 'Asesor asignado');
};

export const updateCupo = async (req: Request, res: Response) => {
  const { cupoTotal, cupoUsado } = parseDto(UpdateCupoSchema, req.body);
  const customer = await customerUseCases.updateCupo.execute(req.params.id, cupoTotal, cupoUsado);
  return ok(res, customer, 'Cupo actualizado');
};

export const deleteCustomer = async (req: Request, res: Response) => {
  await customerUseCases.deleteCustomer.execute(req.params.id);
  return noContent(res);
};
