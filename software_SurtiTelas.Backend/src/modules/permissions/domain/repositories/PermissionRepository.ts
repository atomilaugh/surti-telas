import type { Permission, PermissionFilters } from '../entities/Permission';

export interface PermissionRepository {
  findById(id: string): Promise<Permission | null>;
  findByCode(code: string): Promise<Permission | null>;
  listPermissions(filters?: PermissionFilters): Promise<{ data: Permission[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;
  create(data: { code: string; description: string; module: string }): Promise<Permission>;
  update(id: string, data: { code?: string; description?: string; module?: string }): Promise<Permission>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<Permission>;
}
