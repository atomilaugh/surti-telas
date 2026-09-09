import { describe, it, expect, vi } from 'vitest';
import { ListUsers } from '@/modules/auth/application/use-cases/ListUsers';
import {
  AssignPermissionToRole,
  CreatePermission,
  ListPermissions,
  ListRolePermissions,
  RemovePermissionFromRole,
} from '@/modules/auth/application/use-cases/ManagePermissions';
import { GetProfile, Logout } from '@/modules/auth/application/use-cases/ProfileUseCases';
import { NotFoundError } from '@/shared/domain/errors';
import { auditService } from '@/shared/domain/services/AuditService';

vi.mock('@/shared/domain/services/AuditService', () => ({
  auditService: {
    register: vi.fn().mockResolvedValue(undefined),
  },
}));

const userRecord = (overrides = {}) => ({
  id: 'u-1',
  email: 'a@b.com',
  nombre: 'Ana',
  telefono: null,
  role: 'ADMIN' as const,
  estado: 'ACTIVO' as const,
  passwordHash: 'hash',
  refreshToken: 'tok',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const repo = {
  listUsers: vi.fn(),
  findById: vi.fn(),
  updateRefreshToken: vi.fn(),
  listPermissions: vi.fn(),
  createPermission: vi.fn(),
  listRolePermissions: vi.fn(),
  assignPermissionToRole: vi.fn(),
  removePermissionFromRole: vi.fn(),
} as any;

describe('ListUsers', () => {
  it('strips sensitive fields from users', async () => {
    repo.listUsers.mockResolvedValue({ data: [userRecord()], meta: { total: 1, page: 1, limit: 50 } });
    const result = await new ListUsers(repo).execute();
    expect(result.data[0]).not.toHaveProperty('passwordHash');
    expect(result.data[0]).not.toHaveProperty('refreshToken');
    expect(result.data[0].email).toBe('a@b.com');
    expect(result.meta).toEqual({ total: 1, page: 1, limit: 50 });
  });

  it('forwards filters to the repository', async () => {
    repo.listUsers.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50 } });
    await new ListUsers(repo).execute({ search: 'Ana', role: 'ADMIN' });
    expect(repo.listUsers).toHaveBeenCalledWith({ search: 'Ana', role: 'ADMIN' });
  });
});

describe('ManagePermissions', () => {
  it('ListPermissions lists all permissions', () => {
    repo.listPermissions.mockReturnValue({ data: [{ code: 'a:b' }], meta: { total: 1, page: 1, limit: 50 } });
    expect(new ListPermissions(repo).execute()).toEqual({ data: [{ code: 'a:b' }], meta: { total: 1, page: 1, limit: 50 } });
  });

  it('CreatePermission delegates to repo', async () => {
    repo.createPermission.mockResolvedValue({ code: 'a:b' });
    const result = await new CreatePermission(repo).execute('a:b', 'd', 'm');
    expect(result).toEqual({ code: 'a:b' });
    expect(repo.createPermission).toHaveBeenCalledWith('a:b', 'd', 'm');
  });

  it('ListRolePermissions delegates to repo', () => {
    repo.listRolePermissions.mockReturnValue({ data: [{ permissionId: 'p1' }], meta: { total: 1, page: 1, limit: 50 } });
    expect(new ListRolePermissions(repo).execute('ADMIN')).toEqual({ data: [{ permissionId: 'p1' }], meta: { total: 1, page: 1, limit: 50 } });
  });

  it('AssignPermissionToRole delegates to repo', async () => {
    repo.assignPermissionToRole.mockResolvedValue(undefined);
    await new AssignPermissionToRole(repo).execute('ADMIN', 'p1');
    expect(repo.assignPermissionToRole).toHaveBeenCalledWith('ADMIN', 'p1');
  });

  it('RemovePermissionFromRole delegates to repo', async () => {
    repo.removePermissionFromRole.mockResolvedValue(undefined);
    await new RemovePermissionFromRole(repo).execute('ADMIN', 'p1');
    expect(repo.removePermissionFromRole).toHaveBeenCalledWith('ADMIN', 'p1');
  });
});

describe('ProfileUseCases', () => {
  it('GetProfile returns a public user', async () => {
    repo.findById.mockResolvedValue(userRecord());
    const profile = await new GetProfile(repo).execute('u-1');
    expect(profile.email).toBe('a@b.com');
    expect(profile).not.toHaveProperty('passwordHash');
  });

  it('GetProfile throws NotFound when user missing', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(new GetProfile(repo).execute('u-1')).rejects.toThrow(NotFoundError);
  });

  it('Logout clears the refresh token', async () => {
    await new Logout(repo).execute('u-1');
    expect(repo.updateRefreshToken).toHaveBeenCalledWith('u-1', null);
  });
});
