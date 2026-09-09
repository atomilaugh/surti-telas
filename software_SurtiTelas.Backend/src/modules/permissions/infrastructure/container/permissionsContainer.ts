import { prisma } from '@/config/database';
import { PrismaPermissionRepository } from '@/modules/permissions/infrastructure/repositories/PrismaPermissionRepository';
import {
  ListPermissions,
  GetPermission,
  CreatePermission,
  UpdatePermission,
  DeletePermission,
  UpdatePermissionStatus,
} from '@/modules/permissions/application/use-cases/PermissionUseCases';

const permissionRepository = new PrismaPermissionRepository(prisma);

export const permissionUseCases = {
  listPermissions: new ListPermissions(permissionRepository),
  getPermission: new GetPermission(permissionRepository),
  createPermission: new CreatePermission(permissionRepository),
  updatePermission: new UpdatePermission(permissionRepository),
  deletePermission: new DeletePermission(permissionRepository),
  updatePermissionStatus: new UpdatePermissionStatus(permissionRepository),
};
