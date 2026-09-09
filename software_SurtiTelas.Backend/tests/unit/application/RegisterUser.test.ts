import { describe, it, expect, vi } from 'vitest';
import { RegisterUser } from '@/modules/auth/application/use-cases/RegisterUser';
import type { AuthRepository } from '@/modules/auth/domain/repositories/AuthRepository';
import type { PasswordHasher } from '@/modules/auth/domain/services/PasswordHasher';

describe('RegisterUser', () => {
  it('should register a new user', async () => {
    const userRecord = {
      id: '1',
      email: 'test@test.com',
      nombre: 'Test',
      role: 'CLIENTE',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo: jest.Mocked<AuthRepository> = {
      create: vi.fn().mockResolvedValue(userRecord as any),
      findByEmail: vi.fn(),
      findById: vi.fn(),
      updateRefreshToken: vi.fn(),
      findPermissionsByRole: vi.fn().mockResolvedValue(['users:read']),
      findPermissionsByUser: vi.fn().mockResolvedValue([]),
      listUsers: vi.fn(),
      findAllPermissions: vi.fn(),
      createPermission: vi.fn(),
      findRolePermissions: vi.fn(),
      assignPermissionToRole: vi.fn(),
      removePermissionFromRole: vi.fn(),
      isRoleActive: vi.fn().mockResolvedValue(true),
    };

    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: vi.fn().mockResolvedValue('hashed'),
      compare: vi.fn(),
    };

    const tokens = {
      signAccessToken: vi.fn().mockReturnValue('access_token'),
      signRefreshToken: vi.fn().mockReturnValue('refresh_token'),
    } as unknown as jest.Mocked<import('@/modules/auth/domain/services/TokenService').TokenService>;

    const useCase = new RegisterUser(repo, passwordHasher, tokens);
    const result = await useCase.execute({
      nombre: 'Test',
      email: 'test@test.com',
      password: 'password123',
      role: 'CLIENTE',
    });

    expect(result.user.email).toBe('test@test.com');
    expect(result.user.role).toBe('CLIENTE');
    expect(repo.create).toHaveBeenCalled();
  });
});
