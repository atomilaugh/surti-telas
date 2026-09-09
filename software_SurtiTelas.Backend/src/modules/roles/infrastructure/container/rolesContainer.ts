import { prisma } from '@/config/database';
import { PrismaRoleRepository } from '@/modules/roles/infrastructure/repositories/PrismaRoleRepository';
import {
  ListRoles,
  GetRole,
  CreateRole,
  UpdateRole,
  DeleteRole,
  UpdateRoleStatus,
  ListRolePermissions,
  AssignPermissionToRole,
  RemovePermissionFromRole,
} from '@/modules/roles/application/use-cases/RoleUseCases';

const roleRepository = new PrismaRoleRepository(prisma);

export const roleUseCases = {
  listRoles: new ListRoles(roleRepository),
  getRole: new GetRole(roleRepository),
  createRole: new CreateRole(roleRepository),
  updateRole: new UpdateRole(roleRepository),
  deleteRole: new DeleteRole(roleRepository),
  updateRoleStatus: new UpdateRoleStatus(roleRepository),
  listRolePermissions: new ListRolePermissions(roleRepository),
  assignPermissionToRole: new AssignPermissionToRole(roleRepository),
  removePermissionFromRole: new RemovePermissionFromRole(roleRepository),
};
