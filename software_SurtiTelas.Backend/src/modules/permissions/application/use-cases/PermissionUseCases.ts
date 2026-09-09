import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import type { Permission, PermissionFilters } from '../../domain/entities/Permission';
import type { PermissionRepository } from '../../domain/repositories/PermissionRepository';

export class ListPermissions {
  constructor(private readonly repo: PermissionRepository) {}

  async execute(filters?: PermissionFilters): Promise<{ data: Permission[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    return this.repo.listPermissions(filters);
  }
}

export class GetPermission {
  constructor(private readonly repo: PermissionRepository) {}

  async execute(id: string): Promise<Permission | null> {
    return this.repo.findById(id);
  }
}

export class CreatePermission {
  constructor(private readonly repo: PermissionRepository) {}

  async execute(input: { code: string; description: string; module: string }): Promise<Permission> {
    const existing = await this.repo.findByCode(input.code);
    if (existing) throw new ConflictError('El permiso ya existe');

    return this.repo.create(input);
  }
}

export class UpdatePermission {
  constructor(private readonly repo: PermissionRepository) {}

  async execute(id: string, input: { code?: string; description?: string; module?: string }): Promise<Permission> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Permiso no encontrado');

    if (input.code && input.code !== existing.code) {
      const duplicate = await this.repo.findByCode(input.code);
      if (duplicate) throw new ConflictError('El código de permiso ya existe');
    }

    return this.repo.update(id, input);
  }
}

export class DeletePermission {
  constructor(private readonly repo: PermissionRepository) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Permiso no encontrado');

    await this.repo.delete(id);
  }
}

export class UpdatePermissionStatus {
  constructor(private readonly repo: PermissionRepository) {}

  async execute(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<Permission> {
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Permiso no encontrado');

    return this.repo.updateStatus(id, estado);
  }
}
