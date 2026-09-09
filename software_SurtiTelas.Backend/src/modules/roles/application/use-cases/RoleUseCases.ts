import { ConflictError, NotFoundError } from '../../../../shared/domain/errors';
import type { Role, RoleFilters } from '../../domain/entities/Role';
import type { RoleRepository } from '../../domain/repositories/RoleRepository';

export class ListRoles {
  constructor(private readonly repo: RoleRepository) {}

  async execute(filters?: RoleFilters): Promise<{ data: Role[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }> {
    return this.repo.listRoles(filters);
  }
}

export class GetRole {
  constructor(private readonly repo: RoleRepository) {}

  async execute(name: string): Promise<Role | null> {
    return this.repo.findByName(name);
  }
}

export class CreateRole {
  constructor(private readonly repo: RoleRepository) {}

  async execute(input: { role: string; descripcion?: string | null; permisos?: string[] }): Promise<Role> {
    const existing = await this.repo.findByName(input.role);
    if (existing) throw new ConflictError('El rol ya existe');

    return this.repo.create(input);
  }
}

export class UpdateRole {
  constructor(private readonly repo: RoleRepository) {}

  async execute(name: string, input: { role?: string; descripcion?: string | null; permisos?: string[] }): Promise<Role> {
    const existing = await this.repo.findByName(name);
    if (!existing) throw new NotFoundError('Rol no encontrado');

    if (input.role && input.role !== name) {
      const duplicate = await this.repo.findByName(input.role);
      if (duplicate) throw new ConflictError('El nuevo nombre de rol ya existe');
    }

    return this.repo.update(name, input);
  }
}

export class DeleteRole {
  constructor(private readonly repo: RoleRepository) {}

  async execute(name: string): Promise<void> {
    const existing = await this.repo.findByName(name);
    if (!existing) throw new NotFoundError('Rol no encontrado');

    if (['ADMIN', 'ASESOR', 'CLIENTE'].includes(name)) {
      throw new ConflictError('No se puede eliminar un rol protegido del sistema');
    }

    const usersCount = await this.repo.countUsersByRole(name);
    if (usersCount > 0) {
      throw new ConflictError(`No se puede eliminar el rol porque tiene ${usersCount} usuario(s) asignado(s)`);
    }

    await this.repo.delete(name);
  }
}

export class UpdateRoleStatus {
  constructor(private readonly repo: RoleRepository) {}

  async execute(name: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<Role> {
    const existing = await this.repo.findByName(name);
    if (!existing) throw new NotFoundError('Rol no encontrado');

    if (name === 'ADMIN' && estado === 'INACTIVO') {
      throw new ConflictError('No se puede desactivar el rol ADMIN');
    }

    return this.repo.updateStatus(name, estado);
  }
}

export class ListRolePermissions {
  constructor(private readonly repo: RoleRepository) {}

  async execute(role: string) {
    const existing = await this.repo.findByName(role);
    if (!existing) throw new NotFoundError('Rol no encontrado');

    return this.repo.listRolePermissions(role);
  }
}

export class AssignPermissionToRole {
  constructor(private readonly repo: RoleRepository) {}

  async execute(role: string, permissionId: string): Promise<void> {
    const existing = await this.repo.findByName(role);
    if (!existing) throw new NotFoundError('Rol no encontrado');

    await this.repo.assignPermission(role, permissionId);
  }
}

export class RemovePermissionFromRole {
  constructor(private readonly repo: RoleRepository) {}

  async execute(role: string, permissionId: string): Promise<void> {
    const existing = await this.repo.findByName(role);
    if (!existing) throw new NotFoundError('Rol no encontrado');

    await this.repo.removePermission(role, permissionId);
  }
}
