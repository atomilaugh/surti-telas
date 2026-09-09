import type { User, UserFilters } from '../entities/UserDtos';
import type { CreateUserInput, UpdateUserInput } from './UserInputs';

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(input: CreateUserInput): Promise<User>;
  update(id: string, input: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
  updateStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<User>;
  updateRole(id: string, role: string): Promise<User>;
  lockUser(id: string, until: Date): Promise<void>;
  unlockUser(id: string): Promise<void>;
  resetAccess(id: string): Promise<void>;

  listUsers(filters?: UserFilters): Promise<{ data: User[]; meta: { total: number; page: number; limit: number; nextCursor?: string } }>;

  findPermissionsByRole(role: string): Promise<string[]>;
  findPermissionsByUser(userId: string): Promise<string[]>;
  setUserPermissions(userId: string, permissionCodes: string[]): Promise<void>;

  setResetPasswordToken(id: string, token: string, expires: Date): Promise<void>;
  updateRefreshToken(id: string, token: string | null): Promise<void>;
  isRoleActive(role: string): Promise<boolean>;
}
