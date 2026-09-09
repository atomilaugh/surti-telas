import type { Role, RoleFilters } from '../entities/Role';

export interface RoleRepository {
  findByName(name: string): Promise<Role | null>;
  listRoles(filters?: RoleFilters): Promise<{ data: Role[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;
  create(data: { role: string; descripcion?: string | null; permisos?: string[] }): Promise<Role>;
  update(name: string, data: { role?: string; descripcion?: string | null; permisos?: string[] }): Promise<Role>;
  delete(name: string): Promise<void>;
  updateStatus(name: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<Role>;

  listRolePermissions(role: string): Promise<{ id: string; code: string; description: string; module: string; estado: string }[]>;
  assignPermission(role: string, permissionId: string): Promise<void>;
  removePermission(role: string, permissionId: string): Promise<void>;

  countUsersByRole(role: string): Promise<number>;
}
