import { prisma } from '../../../../config/database';
import { BcryptPasswordHasher } from '../services/BcryptPasswordHasher';
import { JwtTokenService } from '../services/JwtTokenService';
import { PrismaAuthRepository } from '../repositories/PrismaAuthRepository';
import { LoginUser } from '../../application/use-cases/LoginUser';
import { RegisterUser } from '../../application/use-cases/RegisterUser';
import { RefreshToken } from '../../application/use-cases/RefreshToken';
import { GetProfile, UpdateProfile, Logout } from '../../application/use-cases/ProfileUseCases';
import { ListUsers } from '../../application/use-cases/ListUsers';
import {
  AssignPermissionToRole,
  CreatePermission,
  ListPermissions,
  GetPermissionById,
  UpdatePermission,
  DeletePermission,
  UpdatePermissionStatus,
  ListRolePermissions,
  RemovePermissionFromRole,
  ListRoles,
  GetRole,
  CreateRole,
  UpdateRole,
  DeleteRole,
  UpdateRoleStatus,
} from '../../application/use-cases/ManagePermissions';
import { EnableTwoFactor } from '../../application/use-cases/EnableTwoFactor';
import { VerifyTwoFactor } from '../../application/use-cases/VerifyTwoFactor';
import { DisableTwoFactor } from '../../application/use-cases/DisableTwoFactor';
import { GoogleAuth } from '../../application/use-cases/GoogleAuth';
import { UpdateUserStatus, DeleteUser } from '../../application/use-cases/UserManagement';
import { GetUserById } from '../../application/use-cases/GetUserById';
import { UpdateUserPermissions } from '../../application/use-cases/UpdateUserPermissions';

const passwordHasher = new BcryptPasswordHasher();
const authRepository = new PrismaAuthRepository(prisma, passwordHasher);
const tokenService = new JwtTokenService();

export { authRepository };

export const authUseCases = {
  login: new LoginUser(authRepository, tokenService, passwordHasher),
  register: new RegisterUser(authRepository, passwordHasher, tokenService),
  refresh: new RefreshToken(authRepository, tokenService, passwordHasher),
  getProfile: new GetProfile(authRepository),
  updateProfile: new UpdateProfile(authRepository),
  logout: new Logout(authRepository),
  listUsers: new ListUsers(authRepository),
  listPermissions: new ListPermissions(authRepository),
  getPermissionById: new GetPermissionById(authRepository),
  createPermission: new CreatePermission(authRepository),
  updatePermission: new UpdatePermission(authRepository),
  deletePermission: new DeletePermission(authRepository),
  updatePermissionStatus: new UpdatePermissionStatus(authRepository),
  listRolePermissions: new ListRolePermissions(authRepository),
  assignPermissionToRole: new AssignPermissionToRole(authRepository),
  removePermissionFromRole: new RemovePermissionFromRole(authRepository),
  listRoles: new ListRoles(authRepository),
  getRole: new GetRole(authRepository),
  createRole: new CreateRole(authRepository),
  updateRole: new UpdateRole(authRepository),
  deleteRole: new DeleteRole(authRepository),
  updateRoleStatus: new UpdateRoleStatus(authRepository),
  enableTwoFactor: new EnableTwoFactor(authRepository),
  verifyTwoFactor: new VerifyTwoFactor(authRepository, tokenService),
  disableTwoFactor: new DisableTwoFactor(authRepository),
  google: new GoogleAuth(authRepository, passwordHasher, tokenService),
  updateUserStatus: new UpdateUserStatus(authRepository),
  deleteUser: new DeleteUser(authRepository, prisma),
  getUserById: new GetUserById(authRepository),
  updateUserPermissions: new UpdateUserPermissions(authRepository),
};

export { tokenService };
