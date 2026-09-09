import { describe, it, expect, vi } from 'vitest';
import { LoginUser } from '@/modules/auth/application/use-cases/LoginUser';
import type { AuthRepository } from '@/modules/auth/domain/repositories/AuthRepository';
import type { TokenService } from '@/modules/auth/domain/services/TokenService';
import type { PasswordHasher } from '@/modules/auth/domain/services/PasswordHasher';

const createMockRepo = (overrides: Partial<AuthRepository> = {}): AuthRepository => ({
  findByEmail: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  updateRefreshToken: vi.fn(),
  findPermissionsByRole: vi.fn().mockResolvedValue(['users:read']),
  findPermissionsByUser: vi.fn().mockResolvedValue([]),
  listUsers: vi.fn(),
  findAllPermissions: vi.fn(),
  createPermission: vi.fn(),
  findRolePermissions: vi.fn(),
  assignPermissionToRole: vi.fn(),
  removePermissionFromRole: vi.fn(),
  setResetPasswordToken: vi.fn(),
  findByResetPasswordToken: vi.fn(),
  clearResetPasswordToken: vi.fn(),
  updatePassword: vi.fn(),
  incrementFailedLoginAttempts: vi.fn(),
  resetFailedLoginAttempts: vi.fn(),
  lockUser: vi.fn(),
  isRoleActive: vi.fn().mockResolvedValue(true),
  ...overrides,
} as any);

const createMockTokenService = (): TokenService => ({
  signAccessToken: vi.fn().mockReturnValue('access_token'),
  signRefreshToken: vi.fn().mockReturnValue('refresh_token'),
  signTempToken: vi.fn().mockReturnValue('temp_token'),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  verifyTempToken: vi.fn(),
} as any);

const createMockHasher = (): PasswordHasher => ({
  hash: vi.fn(),
  compare: vi.fn(),
} as any);

describe('LoginUser', () => {
  it('should login with valid credentials', async () => {
    const userRecord = {
      id: '1',
      email: 'test@test.com',
      nombre: 'Test',
      role: 'ADMIN',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo = createMockRepo({ findByEmail: vi.fn().mockResolvedValue(userRecord) });
    const tokenService = createMockTokenService();
    const passwordHasher = createMockHasher();
    passwordHasher.compare.mockResolvedValue(true);

    const useCase = new LoginUser(repo, tokenService, passwordHasher);
    const result = await useCase.execute({ email: 'test@test.com', password: 'password' });

    expect(result.accessToken).toBe('access_token');
    expect(result.refreshToken).toBe('refresh_token');
    expect(result.user.email).toBe('test@test.com');
    expect(repo.resetFailedLoginAttempts).toHaveBeenCalledWith('1');
  });

  it('should throw error if user not found', async () => {
    const repo = createMockRepo({ findByEmail: vi.fn().mockResolvedValue(null) });
    const tokenService = createMockTokenService();
    const passwordHasher = createMockHasher();

    const useCase = new LoginUser(repo, tokenService, passwordHasher);
    await expect(useCase.execute({ email: 'test@test.com', password: 'password' })).rejects.toThrow('Credenciales inválidas');
  });

  it('should lock account after 5 failed attempts', async () => {
    let failedAttempts = 0;
    const userRecord = {
      id: '1',
      email: 'test@test.com',
      nombre: 'Test',
      role: 'ADMIN',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      failedLoginAttempts: 0,
      lockedUntil: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo = createMockRepo({
      findByEmail: vi.fn().mockImplementation(() => {
        const record = { ...userRecord, failedLoginAttempts: failedAttempts };
        return Promise.resolve(record);
      }),
      incrementFailedLoginAttempts: vi.fn().mockImplementation(() => {
        failedAttempts++;
      }),
    });
    const tokenService = createMockTokenService();
    const passwordHasher = createMockHasher();
    passwordHasher.compare.mockResolvedValue(false);

    const useCase = new LoginUser(repo, tokenService, passwordHasher);

    for (let i = 0; i < 4; i++) {
      await expect(useCase.execute({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow('Credenciales inválidas');
    }

    await expect(useCase.execute({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow('Cuenta bloqueada');
    expect(repo.lockUser).toHaveBeenCalledWith('1', expect.any(Date));
    expect(repo.incrementFailedLoginAttempts).toHaveBeenCalledTimes(5);
  });

  it('should reject login when account is locked', async () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000);
    const userRecord = {
      id: '1',
      email: 'test@test.com',
      nombre: 'Test',
      role: 'ADMIN',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      failedLoginAttempts: 5,
      lockedUntil,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo = createMockRepo({ findByEmail: vi.fn().mockResolvedValue(userRecord) });
    const tokenService = createMockTokenService();
    const passwordHasher = createMockHasher();

    const useCase = new LoginUser(repo, tokenService, passwordHasher);
    await expect(useCase.execute({ email: 'test@test.com', password: 'password' })).rejects.toThrow('Cuenta bloqueada');
  });

  it('should allow login after lockout expires', async () => {
    const userRecord = {
      id: '1',
      email: 'test@test.com',
      nombre: 'Test',
      role: 'ADMIN',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      failedLoginAttempts: 5,
      lockedUntil: new Date(Date.now() - 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const repo = createMockRepo({ findByEmail: vi.fn().mockResolvedValue(userRecord) });
    const tokenService = createMockTokenService();
    const passwordHasher = createMockHasher();
    passwordHasher.compare.mockResolvedValue(true);

    const useCase = new LoginUser(repo, tokenService, passwordHasher);
    const result = await useCase.execute({ email: 'test@test.com', password: 'password' });

    expect(result.accessToken).toBe('access_token');
    expect(repo.resetFailedLoginAttempts).toHaveBeenCalledWith('1');
  });
});
