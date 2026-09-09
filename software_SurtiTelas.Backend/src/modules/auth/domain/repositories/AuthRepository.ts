import type { UserRecord } from '../entities/User';

export interface CreateUserInput {
  email: string;
  nombre: string;
  apellidos?: string;
  passwordHash: string;
  role: string;
  telefono?: string;
  direccion?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  permisos?: string[];
}

export interface PermissionData {
  id: string;
  code: string;
  description: string;
  module: string;
  estado: 'ACTIVO' | 'INACTIVO';
}

export interface RolePermissionData {
  role: string;
  permissionId: string;
  permission: PermissionData;
}

export interface RoleData {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
  usuarios: number;
  estado: 'Activo' | 'Inactivo';
}

export interface UserFilters {
  search?: string;
  role?: string;
  estado?: string;
  page?: number;
  limit?: number;
  sort?: 'nombre' | 'email' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface AuthRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(input: CreateUserInput): Promise<UserRecord>;
  updateRefreshToken(id: string, token: string | null): Promise<void>;
  findPermissionsByRole(role: string): Promise<string[]>;
  isRoleActive(role: string): Promise<boolean>;
  listUsers(filters?: UserFilters): Promise<{ data: UserRecord[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;

  listPermissions(filters?: { page?: number; limit?: number }): Promise<{ data: PermissionData[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;
  createPermission(code: string, description: string, module: string): Promise<PermissionData>;
  findPermissionById(id: string): Promise<PermissionData | null>;
  updatePermission(id: string, data: { code?: string; description?: string; module?: string }): Promise<PermissionData>;
  updatePermissionStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<PermissionData>;
  deletePermission(id: string): Promise<void>;
  listRolePermissions(role: string, filters?: { page?: number; limit?: number }): Promise<{ data: RolePermissionData[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;
  assignPermissionToRole(role: string, permissionId: string): Promise<void>;
  removePermissionFromRole(role: string, permissionId: string): Promise<void>;
  listRoles(filters?: { page?: number; limit?: number }): Promise<{ data: RoleData[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;
  getRole(id: string): Promise<RoleData | null>;
  findRoleByName(name: string): Promise<RoleData | null>;
  createRole(name: string, description?: string, permisos?: string[]): Promise<RoleData>;
  updateRole(currentName: string, newName: string, description?: string, permisos?: string[]): Promise<RoleData>;
  updateRoleStatus(name: string, estado: 'Activo' | 'Inactivo'): Promise<RoleData>;
  deleteRole(name: string): Promise<void>;
  delete(id: string): Promise<void>;

  createUserPermission(userId: string, permissionId: string): Promise<void>;
  removeUserPermission(userId: string, permissionId: string): Promise<void>;
  setUserPermissions(userId: string, permissionCodes: string[]): Promise<void>;
  findPermissionsByUser(userId: string): Promise<string[]>;

  updateTwoFactorSecret(id: string, secret: string | null): Promise<void>;
  enableTwoFactor(id: string, enabled: boolean): Promise<void>;

  setResetPasswordToken(id: string, token: string, expires: Date): Promise<void>;
  findByResetPasswordToken(token: string): Promise<UserRecord | null>;
  clearResetPasswordToken(id: string): Promise<void>;
  updatePassword(id: string, passwordHash: string): Promise<void>;

  updateProfile(id: string, data: { nombre?: string; telefono?: string | null; direccion?: string | null; tipoDocumento?: string | null; numeroDocumento?: string | null; avatar?: string | null }): Promise<UserRecord>;
  updateStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<UserRecord>;

  incrementFailedLoginAttempts(id: string): Promise<void>;
  resetFailedLoginAttempts(id: string): Promise<void>;
  lockUser(id: string, until: Date): Promise<void>;
  updateGoogleId(id: string, googleId: string): Promise<void>;

  findPermissionsByUser(userId: string): Promise<string[]>;
  setUserPermissions(userId: string, permissionCodes: string[]): Promise<void>;
}
