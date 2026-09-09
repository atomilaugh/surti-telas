import { describe, it, expect, vi } from 'vitest';
import { RefreshToken } from '@/modules/auth/application/use-cases/RefreshToken';
import type { AuthRepository } from '@/modules/auth/domain/repositories/AuthRepository';
import type { TokenService } from '@/modules/auth/domain/services/TokenService';
import type { PasswordHasher } from '@/modules/auth/domain/services/PasswordHasher';

describe('RefreshToken', () => {
  it('should refresh tokens with valid refresh token', async () => {
    const userRecord = {
      id: '1',
      email: 'test@test.com',
      nombre: 'Test',
      role: 'CLIENTE',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      refreshToken: 'refresh_token',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo: jest.Mocked<AuthRepository> = {
      findById: vi.fn().mockResolvedValue(userRecord as any),
      updateRefreshToken: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      findPermissionsByRole: vi.fn().mockResolvedValue([]),
      findPermissionsByUser: vi.fn().mockResolvedValue([]),
      listUsers: vi.fn(),
      findAllPermissions: vi.fn(),
      createPermission: vi.fn(),
      findRolePermissions: vi.fn(),
      assignPermissionToRole: vi.fn(),
      removePermissionFromRole: vi.fn(),
      isRoleActive: vi.fn().mockResolvedValue(true),
    };

    const tokenService: jest.Mocked<TokenService> = {
      signAccessToken: vi.fn().mockReturnValue('new_access'),
      signRefreshToken: vi.fn().mockReturnValue('new_refresh'),
      verifyAccessToken: vi.fn(),
      verifyRefreshToken: vi.fn().mockReturnValue({ userId: '1' }),
    };

    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: vi.fn().mockResolvedValue('hashed_new_refresh'),
      compare: vi.fn().mockResolvedValue(true),
    };

    const useCase = new RefreshToken(repo, tokenService, passwordHasher);
    const result = await useCase.execute('valid_refresh_token');

    expect(result.accessToken).toBe('new_access');
    expect(result.refreshToken).toBe('new_refresh');
    expect(repo.updateRefreshToken).toHaveBeenCalledWith('1', 'hashed_new_refresh');
  });
});
