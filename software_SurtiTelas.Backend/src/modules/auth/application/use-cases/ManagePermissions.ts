import type { AuthRepository, PermissionData } from '../../domain/repositories/AuthRepository';
import { ForbiddenError } from '../../../../shared/domain/errors';
import { auditService } from '../../../../shared/domain/services/AuditService';

export class ListPermissions {
  constructor(private readonly repo: AuthRepository) {}
  execute(filters?: { page?: number; limit?: number }) {
    return this.repo.listPermissions(filters);
  }
}

export class GetPermissionById {
  constructor(private readonly repo: AuthRepository) {}
  execute(id: string): Promise<PermissionData | null> {
    return this.repo.findPermissionById(id);
  }
}

export class CreatePermission {
  constructor(private readonly repo: AuthRepository) {}
  async execute(code: string, description: string, module: string, actorUserId?: string, ip?: string, userAgent?: string) {
    const permission = await this.repo.createPermission(code, description, module);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'PERMISSION_CREATED',
      module: 'permissions',
      result: 'SUCCESS',
      entityType: 'Permission',
      entityId: permission.id,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
    return permission;
  }
}

export class UpdatePermission {
  constructor(private readonly repo: AuthRepository) {}
  async execute(id: string, data: { code?: string; description?: string; module?: string }, actorUserId?: string, ip?: string, userAgent?: string) {
    const permission = await this.repo.updatePermission(id, data);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'PERMISSION_UPDATED',
      module: 'permissions',
      result: 'SUCCESS',
      entityType: 'Permission',
      entityId: id,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: { changes: data },
    });
    return permission;
  }
}

export class DeletePermission {
  constructor(private readonly repo: AuthRepository) {}
  async execute(id: string, actorUserId?: string, ip?: string, userAgent?: string) {
    await this.repo.deletePermission(id);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'PERMISSION_DELETED',
      module: 'permissions',
      result: 'SUCCESS',
      entityType: 'Permission',
      entityId: id,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }
}

export class UpdatePermissionStatus {
  constructor(private readonly repo: AuthRepository) {}
  async execute(id: string, estado: 'ACTIVO' | 'INACTIVO', actorUserId?: string, ip?: string, userAgent?: string) {
    const existing = await this.repo.findPermissionById(id);
    const permission = await this.repo.updatePermissionStatus(id, estado);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: estado === 'ACTIVO' ? 'PERMISSION_ACTIVATED' : 'PERMISSION_DEACTIVATED',
      module: 'permissions',
      result: 'SUCCESS',
      entityType: 'Permission',
      entityId: id,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: { previousEstado: existing?.estado, newEstado: estado },
    });
    return permission;
  }
}

export class ListRolePermissions {
  constructor(private readonly repo: AuthRepository) {}
  execute(role: string, filters?: { page?: number; limit?: number }) {
    return this.repo.listRolePermissions(role, filters);
  }
}

export class AssignPermissionToRole {
  constructor(private readonly repo: AuthRepository) {}
  async execute(role: string, permissionId: string, actorUserId?: string, ip?: string, userAgent?: string) {
    await this.repo.assignPermissionToRole(role, permissionId);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'PERMISSION_ASSIGNED',
      module: 'permissions',
      result: 'SUCCESS',
      entityType: 'RolePermission',
      entityId: `${role}:${permissionId}`,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }
}

export class RemovePermissionFromRole {
  constructor(private readonly repo: AuthRepository) {}
  async execute(role: string, permissionId: string, actorUserId?: string, ip?: string, userAgent?: string) {
    await this.repo.removePermissionFromRole(role, permissionId);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'PERMISSION_REVOKED',
      module: 'permissions',
      result: 'SUCCESS',
      entityType: 'RolePermission',
      entityId: `${role}:${permissionId}`,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }
}

export class ListRoles {
  constructor(private readonly repo: AuthRepository) {}
  execute(filters?: { page?: number; limit?: number }) {
    return this.repo.listRoles(filters);
  }
}

export class GetRole {
  constructor(private readonly repo: AuthRepository) {}
  execute(id: string) {
    return this.repo.getRole(id);
  }
}

export class CreateRole {
  constructor(private readonly repo: AuthRepository) {}
  async execute(nombre: string, descripcion?: string, permisos?: string[], actorUserId?: string, ip?: string, userAgent?: string) {
    const role = await this.repo.createRole(nombre, descripcion, permisos);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'ROLE_CREATED',
      module: 'roles',
      result: 'SUCCESS',
      entityType: 'Role',
      entityId: nombre,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
    return role;
  }
}

export class UpdateRole {
  constructor(private readonly repo: AuthRepository) {}
  async execute(currentId: string, data: { nombre?: string; descripcion?: string; permisos?: string[] }, actorUserId?: string, ip?: string, userAgent?: string) {
    const currentName = currentId.startsWith('R-') ? currentId.slice(2) : currentId;
    const newName = (data.nombre ?? currentName).startsWith('R-') ? (data.nombre ?? currentName).slice(2) : (data.nombre ?? currentName);
    const result = await this.repo.updateRole(currentName, newName, data.descripcion, data.permisos);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'ROLE_UPDATED',
      module: 'roles',
      result: 'SUCCESS',
      entityType: 'Role',
      entityId: currentName,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: { changes: data },
    });
    if (data.permisos === undefined) {
      return this.repo.listRolePermissions(newName).then((res) => ({
        ...result,
        permisos: res.data.map((rp) => rp.permission.code),
      }));
    }
    return result;
  }
}

export class DeleteRole {
  constructor(private readonly repo: AuthRepository) {}
  async execute(nombre: string, actorUserId?: string, ip?: string, userAgent?: string) {
    const roleName = nombre.startsWith('R-') ? nombre.slice(2) : nombre;
    if (['ADMIN', 'ASESOR'].includes(roleName)) {
      throw new ForbiddenError('No se puede eliminar un rol protegido');
    }
    await this.repo.deleteRole(nombre);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: 'ROLE_DELETED',
      module: 'roles',
      result: 'SUCCESS',
      entityType: 'Role',
      entityId: roleName,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    });
  }
}

export class UpdateRoleStatus {
  constructor(private readonly repo: AuthRepository) {}
  async execute(nombre: string, estado: 'Activo' | 'Inactivo', actorUserId?: string, ip?: string, userAgent?: string) {
    const existing = await this.repo.getRole(nombre);
    const role = await this.repo.updateRoleStatus(nombre, estado);
    await auditService.register({
      actorUserId: actorUserId ?? null,
      targetUserId: null,
      action: estado === 'Activo' ? 'ROLE_ACTIVATED' : 'ROLE_DEACTIVATED',
      module: 'roles',
      result: 'SUCCESS',
      entityType: 'Role',
      entityId: nombre,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
      metadata: { previousEstado: existing?.estado, newEstado: estado },
    });
    return role;
  }
}
