import { Request, Response } from 'express';
import path from 'path';
import { created, noContent, ok } from '../../../../shared/presentation/http/HttpResponse';
import { buildApiPaginatedResponse } from '../../../../shared/presentation/http/PaginatedResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { authUseCases, tokenService } from '../../infrastructure/container/authContainer';
import { recoveryContainer } from '../../../../modules/recovery/infrastructure/container/recoveryContainer';
import { LoginSchema, RegisterSchema, UserFiltersSchema, VerifyTwoFactorSchema, ForgotPasswordSchema, ResetPasswordSchema, ChangePasswordSchema, UpdateProfileSchema, GoogleTokenSchema, CreateUserSchema, UpdateUserSchema, UpdateUserStatusSchema, UpdateRoleStatusSchema } from '../validators/auth.validators';
import { AssignPermissionSchema, CreatePermissionSchema, PermissionFiltersSchema, RolePermissionFiltersSchema, RoleFiltersSchema, UpdatePermissionStatusSchema, CreateRoleSchema, UpdateRoleSchema } from '../validators/permission.validators';
import { ConflictError, UnauthorizedError } from '../../../../shared/domain/errors';
import { eventBus } from '../../../../shared/infrastructure/eventBus';
import {
  AuthLoginEvent,
  AuthLoginFailedEvent,
  AuthLogoutEvent,
  PasswordResetAttemptedEvent,
} from '../../../../shared/application/events';

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_PATH = '/api/v1/auth';

function setRefreshTokenCookie(res: Response, refreshToken: string): void {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = parseDto(LoginSchema, req.body);
  try {
    const result = await authUseCases.login.execute({ email, password });
    if ('requiresTwoFactor' in result && result.requiresTwoFactor) {
      eventBus.publish(
        new AuthLoginFailedEvent({
          email,
          reason: '2FA_required',
          ip: req.ip,
          userAgent: req.get('user-agent'),
        }),
        req.requestId
      );
      return ok(res, { requiresTwoFactor: true, tempToken: result.tempToken, user: result.user }, 'Se requiere 2FA');
    }
    const authResult = result as { accessToken: string; refreshToken: string; user: typeof result.user };
    setRefreshTokenCookie(res, authResult.refreshToken);
    eventBus.publish(
      new AuthLoginEvent({
        userId: authResult.user.id,
        email: authResult.user.email,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }),
      req.requestId
    );
    return ok(res, { accessToken: authResult.accessToken, user: authResult.user }, 'Sesión iniciada');
  } catch (error) {
    eventBus.publish(
      new AuthLoginFailedEvent({
        email,
        reason: error instanceof Error ? error.message : 'unknown',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }),
      req.requestId
    );
    throw error;
  }
};

export const register = async (req: Request, res: Response) => {
  const input = parseDto(RegisterSchema, req.body);
  const result = await authUseCases.register.execute(input);
  setRefreshTokenCookie(res, result.refreshToken);
  return created(res, { accessToken: result.accessToken, user: result.user }, 'Usuario registrado');
};

export const refresh = async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    throw new UnauthorizedError('No hay sesión activa');
  }
  const result = await authUseCases.refresh.execute(refreshToken);
  setRefreshTokenCookie(res, result.refreshToken);
  return ok(res, { accessToken: result.accessToken, user: result.user });
};

export const logout = async (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(REFRESH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
    path: REFRESH_COOKIE_PATH,
  });

  // Logout must remain idempotent when the access token has expired.
  // The refresh cookie is enough to revoke the stored session; an absent or
  // invalid cookie is already a logged-out state.
  let logoutUser: { id: string; email: string } | undefined = req.user;
  if (!logoutUser) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      try {
        const { userId } = tokenService.verifyRefreshToken(refreshToken);
        const publicUser = await authUseCases.getUserById.execute(userId);
        logoutUser = publicUser ? { id: publicUser.id, email: publicUser.email } : undefined;
      } catch {
        logoutUser = undefined;
      }
    }
  }

  if (logoutUser) {
    await authUseCases.logout.execute(logoutUser.id, logoutUser.id, req.ip, req.get('user-agent'));
    eventBus.publish(
      new AuthLogoutEvent({ userId: logoutUser.id, email: logoutUser.email }),
      req.requestId
    );
  }

  return ok(res, null, 'Sesión cerrada');
};

export const google = async (req: Request, res: Response) => {
  const { idToken } = parseDto(GoogleTokenSchema, req.body);
  const result = await authUseCases.google.execute(idToken);
  setRefreshTokenCookie(res, result.refreshToken);
  return ok(res, { accessToken: result.accessToken, user: result.user }, 'Autenticado con Google');
};

export const me = async (req: Request, res: Response) => {
  const user = await authUseCases.getProfile.execute(req.user!.id);
  return ok(res, user);
};

export const updateProfile = async (req: Request, res: Response) => {
  const { nombre, telefono, direccion, tipoDocumento, numeroDocumento, avatar } = parseDto(UpdateProfileSchema, req.body);
  const user = await authUseCases.updateProfile.execute(req.user!.id, { nombre, telefono, direccion, tipoDocumento, numeroDocumento, avatar: avatar || undefined });
  return ok(res, user, 'Perfil actualizado');
};

export const uploadAvatar = async (req: Request & { file?: Express.Multer.File }, res: Response) => {
  const userId = req.user!.id;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'bad_request', message: 'No se proporcionó archivo' });
  }

  const avatarUrl = `/uploads/profile/${path.basename(file.filename)}`;

  const user = await authUseCases.updateProfile.execute(userId, { avatar: avatarUrl });

  return ok(res, user, 'Foto de perfil actualizada');
};

export const getUser = async (req: Request, res: Response) => {
  const user = await authUseCases.getUserById.execute(req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Usuario no encontrado' });
  }
  return ok(res, user);
};

export const listUsers = async (req: Request, res: Response) => {
  const filters = parseDto(UserFiltersSchema, req.query);
  const result = await authUseCases.listUsers.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page || 1,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const listPermissions = async (req: Request, res: Response) => {
  const filters = parseDto(PermissionFiltersSchema, req.query);
  const result = await authUseCases.listPermissions.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const getPermission = async (req: Request, res: Response) => {
  const permission = await authUseCases.getPermissionById.execute(req.params.id);
  if (!permission) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Permiso no encontrado' });
  }
  return ok(res, permission);
};

export const createPermission = async (req: Request, res: Response) => {
  const input = parseDto(CreatePermissionSchema, req.body);
  const permission = await authUseCases.createPermission.execute(input.code, input.description, input.module, req.user!.id, req.ip, req.get('user-agent'));
  return created(res, permission, 'Permiso creado');
};

export const updatePermission = async (req: Request, res: Response) => {
  const permission = await authUseCases.updatePermission.execute(req.params.id, req.body, req.user!.id, req.ip, req.get('user-agent'));
  return ok(res, permission, 'Permiso actualizado');
};

export const deletePermission = async (req: Request, res: Response) => {
  await authUseCases.deletePermission.execute(req.params.id, req.user!.id, req.ip, req.get('user-agent'));
  return noContent(res);
};

export const listRolePermissions = async (req: Request, res: Response) => {
  const role = req.params.role;
  const filters = parseDto(RolePermissionFiltersSchema, req.query);
  const result = await authUseCases.listRolePermissions.execute(role, filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const assignPermissionToRole = async (req: Request, res: Response) => {
  const role = req.params.role;
  const { permissionId } = parseDto(AssignPermissionSchema, req.body);
  await authUseCases.assignPermissionToRole.execute(role, permissionId, req.user!.id, req.ip, req.get('user-agent'));
  return ok(res, null, 'Permiso asignado al rol');
};

export const removePermissionFromRole = async (req: Request, res: Response) => {
  const role = req.params.role;
  const { permissionId } = parseDto(AssignPermissionSchema, req.body);
  await authUseCases.removePermissionFromRole.execute(role, permissionId, req.user!.id, req.ip, req.get('user-agent'));
  return noContent(res);
};

export const listRoles = async (req: Request, res: Response) => {
  const filters = parseDto(RoleFiltersSchema, req.query);
  const result = await authUseCases.listRoles.execute(filters);
  const response = buildApiPaginatedResponse(
    result.data,
    result.meta.total,
    result.meta.page,
    result.meta.limit,
    result.meta.nextCursor
  );
  return ok(res, response);
};

export const getRole = async (req: Request, res: Response) => {
  const role = await authUseCases.getRole.execute(req.params.id);
  if (!role) {
    return res.status(404).json({ success: false, error: 'not_found', message: 'Rol no encontrado' });
  }
  return ok(res, role);
};

export const createRole = async (req: Request, res: Response) => {
  const input = parseDto(CreateRoleSchema, req.body);
  const role = await authUseCases.createRole.execute(input.nombre, input.descripcion, input.permisos, req.user!.id, req.ip, req.get('user-agent'));
  return created(res, role, 'Rol creado');
};

export const updateRole = async (req: Request, res: Response) => {
  const input = parseDto(UpdateRoleSchema, req.body);
  const role = await authUseCases.updateRole.execute(req.params.id, { nombre: input.nombre, descripcion: input.descripcion, permisos: input.permisos }, req.user!.id, req.ip, req.get('user-agent'));
  return ok(res, role, 'Rol actualizado');
};

export const deleteRole = async (req: Request, res: Response) => {
  try {
    await authUseCases.deleteRole.execute(req.params.id, req.user!.id, req.ip, req.get('user-agent'));
    return noContent(res);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'No se pudo eliminar el rol';
    const status = message.toLowerCase().includes('protegido') ? 409 : 400;
    return res.status(status).json({ success: false, error: 'conflict', message });
  }
};

export const enableTwoFactor = async (req: Request, res: Response) => {
  const result = await authUseCases.enableTwoFactor.execute(req.user!.id);
  return ok(res, result, '2FA habilitado');
};

export const verifyTwoFactor = async (req: Request, res: Response) => {
  const { tempToken, code } = parseDto(VerifyTwoFactorSchema, req.body);
  const result = await authUseCases.verifyTwoFactor.execute({ tempToken, code });
  return ok(res, result, 'Sesión iniciada');
};

export const disableTwoFactor = async (req: Request, res: Response) => {
  await authUseCases.disableTwoFactor.execute(req.user!.id);
  return ok(res, null, '2FA deshabilitado');
};

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = parseDto(ForgotPasswordSchema, req.body);
  const result = await recoveryContainer.forgotPassword().execute(
    email,
    req.requestId,
    req.ip,
    req.get('user-agent')
  );
  return ok(res, result, result.message);
};

export const resetPassword = async (req: Request, res: Response) => {
  const { token, newPassword } = parseDto(ResetPasswordSchema, req.body);

  let userForAudit: { id: string; email: string } | null = null;
  try {
    const result = await recoveryContainer.resetPassword().execute(
      token,
      newPassword,
      req.requestId,
      req.ip,
      req.get('user-agent')
    );
    userForAudit = result.user;
    return ok(res, null, 'Contraseña restablecida correctamente');
  } catch (error) {
    const fallbackEmail = (req.body?.email as string | undefined) || '';
    eventBus.publish(
      new PasswordResetAttemptedEvent({
        userId: userForAudit?.id ?? 'unknown',
        email: userForAudit?.email ?? fallbackEmail,
        success: false,
        reason: error instanceof Error ? error.message : 'unknown_error',
        ip: req.ip,
        userAgent: req.get('user-agent'),
      }),
      req.requestId
    );
    throw error;
  }
};

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = parseDto(ChangePasswordSchema, req.body);
  await recoveryContainer.changePassword().execute(
    req.user!.id,
    currentPassword,
    newPassword,
    req.requestId,
    req.ip,
    req.get('user-agent')
  );
  return ok(res, null, 'Contraseña actualizada correctamente');
};

export const createUser = async (req: Request, res: Response) => {
  const input = parseDto(CreateUserSchema, req.body);
  const result = await authUseCases.register.execute(input);
  return created(res, { id: result.user.id, email: result.user.email, nombre: result.user.nombre, role: result.user.role, permissions: result.user.permissions }, 'Usuario creado');
};

export const updateUser = async (req: Request, res: Response) => {
  const { nombre, email, telefono, permisos } = parseDto(UpdateUserSchema, req.body);
  const profileData: { nombre?: string; email?: string; telefono?: string | null } = {};
  if (nombre !== undefined) profileData.nombre = nombre;
  if (email !== undefined) profileData.email = email;
  if (telefono !== undefined) profileData.telefono = telefono;
  await authUseCases.updateProfile.execute(req.params.id, profileData);
  if (permisos !== undefined) {
    await authUseCases.updateUserPermissions.execute(req.params.id, permisos);
  }
  const updatedUser = await authUseCases.getUserById.execute(req.params.id);
  return ok(res, updatedUser, 'Usuario actualizado');
};

export const updateUserStatus = async (req: Request, res: Response) => {
  const { estado } = parseDto(UpdateUserStatusSchema, req.body);
  const user = await authUseCases.updateUserStatus.execute(req.params.id, estado as 'ACTIVO' | 'INACTIVO');
  return ok(res, user, estado === 'ACTIVO' ? 'Usuario activado' : 'Usuario desactivado');
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    await authUseCases.deleteUser.execute(id);
    return noContent(res);
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({ success: false, error: 'conflict', message: error.message });
    }
    throw error;
  }
};

export const updatePermissionStatus = async (req: Request, res: Response) => {
  const { estado } = parseDto(UpdatePermissionStatusSchema, req.body);
  const permission = await authUseCases.updatePermissionStatus.execute(req.params.id, estado);
  return ok(res, permission, estado === 'ACTIVO' ? 'Permiso activado' : 'Permiso desactivado');
};

export const updateRoleStatus = async (req: Request, res: Response) => {
  const { estado } = parseDto(UpdateRoleStatusSchema, req.body);
  const role = await authUseCases.updateRoleStatus.execute(req.params.id, estado);
  return ok(res, role, estado === 'Activo' ? 'Rol activado' : 'Rol desactivado');
};
