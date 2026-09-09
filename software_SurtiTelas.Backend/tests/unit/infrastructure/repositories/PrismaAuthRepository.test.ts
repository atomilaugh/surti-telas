import { describe, it, expect, vi } from 'vitest';
import { PrismaAuthRepository } from '@/modules/auth/infrastructure/repositories/PrismaAuthRepository';
import { NotFoundError } from '@/shared/domain/errors';

const mockPrisma = {
  user: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  rolePermission: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), delete: vi.fn(), count: vi.fn() },
  permission: { findMany: vi.fn(), create: vi.fn(), count: vi.fn() },
  userPermission: { findMany: vi.fn().mockResolvedValue([]), deleteMany: vi.fn(), createMany: vi.fn() },
  roleConfig: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn(), update: vi.fn() },
  $transaction: vi.fn(),
} as any;

const repo = new PrismaAuthRepository(mockPrisma as any);

const userRow = (overrides = {}) => ({
  id: 'u-1',
  email: 'a@b.com',
  passwordHash: 'hash',
  nombre: 'Ana',
  telefono: null,
  role: 'ADMIN',
  estado: 'ACTIVO',
  refreshToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('PrismaAuthRepository', () => {
  it('finds user by email', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(userRow());
    const user = await repo.findByEmail('a@b.com');
    expect(user?.email).toBe('a@b.com');
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'a@b.com' } });
  });

  it('finds user by id', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(userRow());
    mockPrisma.rolePermission.findMany.mockResolvedValue([{ permission: { code: 'orders:read' } }]);
    mockPrisma.userPermission.findMany.mockResolvedValue([]);
    expect((await repo.findById('u-1'))?.id).toBe('u-1');
  });

  it('returns null when user missing', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    expect(await repo.findByEmail('x@y.com')).toBeNull();
  });

  it('creates a user', async () => {
    mockPrisma.user.create.mockResolvedValue(userRow());
    const user = await repo.create({ email: 'a@b.com', nombre: 'Ana', passwordHash: 'hash', role: 'ADMIN' });
    expect(user.email).toBe('a@b.com');
    const data = mockPrisma.user.create.mock.calls.at(-1)![0].data;
    expect(data).toMatchObject({ email: 'a@b.com', nombre: 'Ana', role: 'ADMIN' });
  });

  it('updates refresh token', async () => {
    await repo.updateRefreshToken('u-1', 'tok');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { refreshToken: 'tok' } });
  });

  it('lists users with filters', async () => {
    mockPrisma.$transaction.mockResolvedValue([[userRow()], 1]);
    mockPrisma.rolePermission.findMany.mockResolvedValue([{ permission: { code: 'orders:read' } }]);
    mockPrisma.userPermission.findMany.mockResolvedValue([]);
    const result = await repo.listUsers({ search: 'Ana', role: 'ADMIN', estado: 'ACTIVO' });
    expect(result.data).toHaveLength(1);
    const where = mockPrisma.user.findMany.mock.calls.at(-1)![0].where;
    expect(where.OR).toEqual([
      { nombre: { contains: 'Ana', mode: 'insensitive' } },
      { email: { contains: 'Ana', mode: 'insensitive' } },
    ]);
    expect(where.role).toBe('ADMIN');
    expect(where.estado).toBe('ACTIVO');
  });

  it('finds permissions by role', async () => {
    mockPrisma.rolePermission.findMany.mockResolvedValue([{ permission: { code: 'orders:read', estado: 'ACTIVO' } }]);
    const codes = await repo.findPermissionsByRole('ADMIN');
    expect(codes).toEqual(['orders:read']);
  });

  it('lists all permissions', async () => {
    mockPrisma.$transaction.mockResolvedValue([[{ id: '1', code: 'a:b', description: 'd', module: 'm', estado: 'ACTIVO' }], 1]);
    const perms = await repo.listPermissions();
    expect(perms.data[0]).toMatchObject({ code: 'a:b', module: 'm' });
    expect(perms.meta.total).toBe(1);
  });

  it('creates a permission', async () => {
    mockPrisma.permission.create.mockResolvedValue({ id: '1', code: 'a:b', description: 'd', module: 'm' });
    const perm = await repo.createPermission('a:b', 'd', 'm');
    expect(perm.code).toBe('a:b');
  });

  it('lists role permissions', async () => {
    mockPrisma.$transaction.mockResolvedValue([[
      { role: 'ADMIN', permissionId: 'p1', permission: { id: 'p1', code: 'a:b', description: 'd', module: 'm', estado: 'ACTIVO' } },
    ], 1]);
    const rp = await repo.listRolePermissions('ADMIN');
    expect(rp.data[0]).toMatchObject({ role: 'ADMIN', permissionId: 'p1', permission: { code: 'a:b' } });
    expect(rp.meta.total).toBe(1);
  });

  it('assigns permission to role', async () => {
    await repo.assignPermissionToRole('ADMIN', 'p1');
    expect(mockPrisma.rolePermission.create).toHaveBeenCalledWith({ data: { role: 'ADMIN', permissionId: 'p1' } });
  });

  it('removes permission from role', async () => {
    await repo.removePermissionFromRole('ADMIN', 'p1');
    expect(mockPrisma.rolePermission.delete).toHaveBeenCalledWith({ where: { role_permissionId: { role: 'ADMIN', permissionId: 'p1' } } });
  });

  it('soft deletes a user', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(userRow());
    await repo.delete('u-1');
    expect(mockPrisma.user.update).toHaveBeenCalledWith({ where: { id: 'u-1' }, data: { deletedAt: expect.any(Date) } });
  });

  it('throws NotFound when deleting missing user', async () => {
    mockPrisma.user.findFirst.mockResolvedValue(null);
    await expect(repo.delete('u-1')).rejects.toThrow(NotFoundError);
  });

  it('setUserPermissions removes previous user permissions and keeps only existing ones', async () => {
    mockPrisma.permission.findMany.mockResolvedValue([
      { id: 'p1', code: 'customers:read' },
      { id: 'p2', code: 'customers:create' },
    ]);
    await repo.setUserPermissions('u-1', ['customers:read', 'customers:create']);
    expect(mockPrisma.userPermission.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    expect(mockPrisma.userPermission.createMany).toHaveBeenCalledWith({
      data: [
        { userId: 'u-1', permissionId: 'p1' },
        { userId: 'u-1', permissionId: 'p2' },
      ],
    });
  });

  it('setUserPermissions ignores non-existent permission codes', async () => {
    mockPrisma.permission.findMany.mockResolvedValue([{ id: 'p1', code: 'customers:read' }]);
    await repo.setUserPermissions('u-1', ['customers:read', 'fake:permission']);
    expect(mockPrisma.userPermission.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'u-1', permissionId: 'p1' }],
    });
  });

  it('setUserPermissions removes permissions not included in the new list', async () => {
    mockPrisma.permission.findMany.mockResolvedValue([{ id: 'p1', code: 'customers:read' }]);
    await repo.setUserPermissions('u-1', ['customers:read']);
    expect(mockPrisma.userPermission.deleteMany).toHaveBeenCalledWith({ where: { userId: 'u-1' } });
    expect(mockPrisma.userPermission.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'u-1', permissionId: 'p1' }],
    });
  });

  it('setUserPermissions does not create duplicates', async () => {
    mockPrisma.permission.findMany.mockResolvedValue([{ id: 'p1', code: 'customers:read' }]);
    await repo.setUserPermissions('u-1', ['customers:read', 'customers:read']);
    expect(mockPrisma.userPermission.createMany).toHaveBeenCalledWith({
      data: [{ userId: 'u-1', permissionId: 'p1' }],
    });
  });
});
