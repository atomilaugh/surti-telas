import { Request, Response } from 'express';
import { created, noContent, ok } from '../../../../shared/presentation/http/HttpResponse';
import { buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { userUseCases } from '../../infrastructure/container/usersContainer';
import { recoveryContainer } from '../../../../modules/recovery/infrastructure/container/recoveryContainer';
import { CreateUserSchema, UpdateUserSchema, UpdateUserStatusSchema, ChangeUserRoleSchema, UserFiltersSchema } from '../validators/user.validators';
import { ConflictError } from '../../../../shared/domain/errors';
import { BcryptPasswordHasher } from '../../../auth/infrastructure/services/BcryptPasswordHasher';

const passwordHasher = new BcryptPasswordHasher();

export const listUsers = async (req: Request, res: Response) => {
  const filters = parseDto(UserFiltersSchema, req.query);
  const result = await userUseCases.listUsers.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page || 1,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const getUser = async (req: Request, res: Response) => {
  const user = await userUseCases.getUserById.execute(req.params.id);
  return ok(res, user);
};

export const createUser = async (req: Request, res: Response) => {
  const input = parseDto(CreateUserSchema, req.body);
  const passwordHash = await passwordHasher.hash(input.password);
  const user = await userUseCases.createUser.execute({ ...input, passwordHash });
  return created(res, user, 'Usuario creado');
};

export const updateUser = async (req: Request, res: Response) => {
  const input = parseDto(UpdateUserSchema, req.body);
  const user = await userUseCases.updateUser.execute(req.params.id, input);
  return ok(res, user, 'Usuario actualizado');
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    await userUseCases.deleteUser.execute(req.params.id);
    return noContent(res);
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({ success: false, error: 'conflict', message: error.message });
    }
    throw error;
  }
};

export const updateUserStatus = async (req: Request, res: Response) => {
  const { estado } = parseDto(UpdateUserStatusSchema, req.body);
  const user = await userUseCases.updateUserStatus.execute(req.params.id, estado);
  return ok(res, user, estado === 'ACTIVO' ? 'Usuario activado' : 'Usuario desactivado');
};

export const changeUserRole = async (req: Request, res: Response) => {
  const { role } = parseDto(ChangeUserRoleSchema, req.body);
  const user = await userUseCases.changeUserRole.execute(req.params.id, role);
  return ok(res, user, 'Rol actualizado');
};

export const lockUser = async (req: Request, res: Response) => {
  const { until } = req.body as { until?: string };
  const lockUntil = until ? new Date(until) : new Date(Date.now() + 15 * 60 * 1000);
  await userUseCases.lockUser.execute(req.params.id, lockUntil);
  return ok(res, null, 'Usuario bloqueado');
};

export const unlockUser = async (req: Request, res: Response) => {
  await userUseCases.unlockUser.execute(req.params.id);
  return ok(res, null, 'Usuario desbloqueado');
};

export const getUserPermissions = async (req: Request, res: Response) => {
  const permissions = await userUseCases.getUserPermissions.execute(req.params.id);
  return ok(res, permissions);
};

export const resetUserAccess = async (req: Request, res: Response) => {
  const result = await recoveryContainer.adminResetAccess().execute(
    req.params.id,
    req.user!.id,
    req.ip,
    req.get('user-agent')
  );
  return ok(res, result, result.message);
};
