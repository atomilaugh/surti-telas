import { Request, Response } from 'express';
import { created, noContent, ok } from '../../../../shared/presentation/http/HttpResponse';
import { buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { permissionUseCases } from '../../infrastructure/container/permissionsContainer';
import { PermissionFiltersSchema, CreatePermissionSchema, UpdatePermissionSchema, UpdatePermissionStatusSchema } from '../validators/permission.validators';
import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';

export const listPermissions = async (req: Request, res: Response) => {
  const filters = parseDto(PermissionFiltersSchema, req.query);
  const result = await permissionUseCases.listPermissions.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page || 1,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const getPermission = async (req: Request, res: Response) => {
  const permission = await permissionUseCases.getPermission.execute(req.params.id);
  if (!permission) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Permiso no encontrado' });
  }
  return ok(res, permission);
};

export const createPermission = async (req: Request, res: Response) => {
  const input = parseDto(CreatePermissionSchema, req.body);
  const permission = await permissionUseCases.createPermission.execute(input);
  return created(res, permission, 'Permiso creado');
};

export const updatePermission = async (req: Request, res: Response) => {
  const input = parseDto(UpdatePermissionSchema, req.body);
  const permission = await permissionUseCases.updatePermission.execute(req.params.id, input);
  return ok(res, permission, 'Permiso actualizado');
};

export const deletePermission = async (req: Request, res: Response) => {
  try {
    await permissionUseCases.deletePermission.execute(req.params.id);
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

export const updatePermissionStatus = async (req: Request, res: Response) => {
  const { estado } = parseDto(UpdatePermissionStatusSchema, req.body);
  const permission = await permissionUseCases.updatePermissionStatus.execute(req.params.id, estado);
  return ok(res, permission, estado === 'ACTIVO' ? 'Permiso activado' : 'Permiso desactivado');
};
