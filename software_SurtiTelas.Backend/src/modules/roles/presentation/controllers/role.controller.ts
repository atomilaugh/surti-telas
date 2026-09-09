import { Request, Response } from 'express';
import { created, noContent, ok } from '../../../../shared/presentation/http/HttpResponse';
import { buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { roleUseCases } from '../../infrastructure/container/rolesContainer';
import { RoleFiltersSchema, CreateRoleSchema, UpdateRoleSchema, UpdateRoleStatusSchema, AssignPermissionSchema } from '../validators/role.validators';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';

export const listRoles = async (req: Request, res: Response) => {
  const filters = parseDto(RoleFiltersSchema, req.query);
  const result = await roleUseCases.listRoles.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page || 1,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const getRole = async (req: Request, res: Response) => {
  const role = await roleUseCases.getRole.execute(req.params.id);
  if (!role) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Rol no encontrado' });
  }
  return ok(res, role);
};

export const createRole = async (req: Request, res: Response) => {
  const input = parseDto(CreateRoleSchema, req.body);
  const role = await roleUseCases.createRole.execute(input);
  return created(res, role, 'Rol creado');
};

export const updateRole = async (req: Request, res: Response) => {
  const input = parseDto(UpdateRoleSchema, req.body);
  const role = await roleUseCases.updateRole.execute(req.params.id, input);
  return ok(res, role, 'Rol actualizado');
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    await roleUseCases.deleteRole.execute(req.params.id);
    return noContent(res);
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({ success: false, error: 'conflict', message: error.message });
    }
    if (error instanceof NotFoundError) {
      return res.status(404).json({ success: false, error: 'not_found', message: error.message });
    }
    throw error;
  }
};

export const updateRoleStatus = async (req: Request, res: Response) => {
  const { estado } = parseDto(UpdateRoleStatusSchema, req.body);
  const role = await roleUseCases.updateRoleStatus.execute(req.params.id, estado);
  return ok(res, role, estado === 'ACTIVO' ? 'Rol activado' : 'Rol desactivado');
};

export const getRolePermissions = async (req: Request, res: Response) => {
  const permissions = await roleUseCases.listRolePermissions.execute(req.params.id);
  return ok(res, permissions);
};

export const assignPermissionToRole = async (req: Request, res: Response) => {
  const { permissionId } = parseDto(AssignPermissionSchema, req.body);
  await roleUseCases.assignPermissionToRole.execute(req.params.id, permissionId);
  return ok(res, null, 'Permiso asignado al rol');
};

export const removePermissionFromRole = async (req: Request, res: Response) => {
  const { permissionId } = parseDto(AssignPermissionSchema, req.body);
  await roleUseCases.removePermissionFromRole.execute(req.params.id, permissionId);
  return noContent(res);
};
