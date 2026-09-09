import { api } from './httpClient';
import type { PaginatedResponse } from './pagination';
import { usersApi } from './usersApi';
import { permissionsApi } from './permissionsApi';

/** Roles tal como los devuelve el backend (String, incluye roles personalizados). */
export type BackendRole = string;

export interface BackendAuthUser {
  id: string;
  email: string;
  nombre: string;
  role: BackendRole;
  permissions?: string[];
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  apellidos?: string | null;
  estado?: 'ACTIVO' | 'INACTIVO';
  avatar?: string | null;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: BackendAuthUser;
}

export interface ProfileResponse {
  id: string;
  email: string;
  nombre: string;
  apellidos?: string | null;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  role: BackendRole;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
  permissions?: string[];
  avatar?: string | null;
}

export interface UpdateProfileResponse {
  id: string;
  email: string;
  nombre: string;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  avatar?: string | null;
  role: BackendRole;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: string;
}

export interface PermissionDTO {
  id: string;
  code: string;
  description: string;
  module: string;
  estado?: 'ACTIVO' | 'INACTIVO';
}

export interface CreateUserRequest {
  email: string;
  password: string;
  nombre: string;
  apellidos?: string;
  role: BackendRole;
  telefono?: string;
  direccion?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
}

export interface CreateUserResponse {
  id: string;
  email: string;
  nombre: string;
  role: BackendRole;
}

export interface GoogleLoginResponse {
  accessToken: string;
  user: BackendAuthUser;
}

export interface ForgotPasswordRequest {
  email: string;
  turnstileToken?: string;
}

export interface ForgotPasswordResponse {
  message: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface UsersListResult {
  data: BackendAuthUser[];
  meta: PaginatedResponse<BackendAuthUser>['data']['meta'];
}

export const authApi = {
  login: (email: string, password: string) => {
    return api.post<LoginResponse>('/auth/login', { email, password }, { auth: false }).then(r => {
      return r;
    }).catch(err => {
      throw err;
    });
  },

  googleLogin: (idToken: string) =>
    api.post<GoogleLoginResponse>('/auth/google', { idToken }, { auth: false }),

  me: () => api.get<ProfileResponse>('/auth/me'),

  updateProfile: (data: { nombre?: string; telefono?: string; email?: string; direccion?: string; tipoDocumento?: string; numeroDocumento?: string; password?: string; avatar?: string }) =>
    api.patch<UpdateProfileResponse>('/auth/me', data),

  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return api.postForm<UpdateProfileResponse>('/auth/me/avatar', form);
  },

  logout: () => api.post<null>('/auth/logout', undefined, { auth: false }),

  forgotPassword: (data: ForgotPasswordRequest) =>
    api.post<ForgotPasswordResponse>('/auth/forgot-password', data, { auth: false }),

  resetPassword: (data: ResetPasswordRequest) =>
    api.post<ForgotPasswordResponse>('/auth/reset-password', data, { auth: false }),

  listUsers: (query?: Record<string, string | number | boolean | undefined | null>) =>
    usersApi.list(query).then(data => ({ data, meta: { totalRecords: data.length, page: 1, limit: data.length, totalPages: 1 } })),

  createUser: (data: CreateUserRequest) =>
    usersApi.create(data).then(u => ({ ...u, password: undefined })),

  updateUser: (id: string, data: { nombre?: string; apellidos?: string; email?: string; telefono?: string; direccion?: string; tipoDocumento?: string; numeroDocumento?: string }) =>
    usersApi.update(id, data),

  deleteUser: (id: string) =>
    usersApi.remove(id),

  listPermissions: (query?: Record<string, string | number | boolean | undefined | null>) =>
    permissionsApi.list(query).then(result => ({ ...result, data: result.items })),

  createPermission: (data: { code: string; description?: string; module?: string }) =>
    permissionsApi.create(data),

  updatePermission: (id: string, data: { code?: string; description?: string; module?: string }) =>
    permissionsApi.update(id, data),

  updatePermissionStatus: (id: string, estado: 'ACTIVO' | 'INACTIVO') =>
    permissionsApi.updateStatus(id, estado),

  deletePermission: (id: string) =>
    permissionsApi.remove(id),
};
