import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoginUser } from '@/modules/auth/application/use-cases/LoginUser';
import { RefreshToken } from '@/modules/auth/application/use-cases/RefreshToken';
import { UnauthorizedError } from '@/shared/domain/errors';

const mockRepo = {
  findByEmail: vi.fn(),
  lockUser: vi.fn(),
  incrementFailedLoginAttempts: vi.fn(),
  resetFailedLoginAttempts: vi.fn(),
  findPermissionsByRole: vi.fn(),
  findPermissionsByUser: vi.fn(),
  updateRefreshToken: vi.fn(),
  findById: vi.fn(),
  isRoleActive: vi.fn().mockResolvedValue(true),
};

const mockTokens = {
  signAccessToken: vi.fn(),
  signRefreshToken: vi.fn(),
  signTempToken: vi.fn(),
  verifyAccessToken: vi.fn(),
  verifyRefreshToken: vi.fn(),
  verifyTempToken: vi.fn(),
};

const mockHasher = {
  compare: vi.fn(),
  hash: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('LoginUser', () => {
  it('should login successfully with valid credentials', async () => {
    const useCase = new LoginUser(mockRepo as any, mockTokens as any, mockHasher as any);
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      failedLoginAttempts: 0,
      lockedUntil: null,
      twoFactorEnabled: false,
    });
    mockHasher.compare.mockResolvedValue(true);
    mockRepo.findPermissionsByRole.mockResolvedValue(['catalog:read']);
    mockRepo.findPermissionsByUser.mockResolvedValue(['customers:create']);
    mockTokens.signAccessToken.mockReturnValue('access-token');
    mockTokens.signRefreshToken.mockReturnValue('refresh-token');
    mockHasher.hash.mockResolvedValue('hashed-refresh');

    const result = await useCase.execute({ email: 'test@test.com', password: 'password' });

    expect(result).toHaveProperty('accessToken', 'access-token');
    expect(result).toHaveProperty('refreshToken', 'refresh-token');
    expect((result as any).user.id).toBe('user-1');
    expect((result as any).user.permissions).toEqual(['catalog:read', 'customers:create']);
    expect(mockRepo.updateRefreshToken).toHaveBeenCalledWith('user-1', 'hashed-refresh');
  });

  it('should throw UnauthorizedError for non-existent user', async () => {
    const useCase = new LoginUser(mockRepo as any, mockTokens as any, mockHasher as any);
    mockRepo.findByEmail.mockResolvedValue(null);

    await expect(useCase.execute({ email: 'nonexistent@test.com', password: 'password' })).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError for inactive user', async () => {
    const useCase = new LoginUser(mockRepo as any, mockTokens as any, mockHasher as any);
    mockRepo.findByEmail.mockResolvedValue({ estado: 'INACTIVO' });

    await expect(useCase.execute({ email: 'inactive@test.com', password: 'password' })).rejects.toThrow(UnauthorizedError);
  });

  it('should lock account after 5 failed attempts', async () => {
    const useCase = new LoginUser(mockRepo as any, mockTokens as any, mockHasher as any);
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      failedLoginAttempts: 4,
      lockedUntil: null,
    });
    mockHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute({ email: 'test@test.com', password: 'wrong' })).rejects.toThrow(UnauthorizedError);

    expect(mockRepo.incrementFailedLoginAttempts).toHaveBeenCalledWith('user-1');
    expect(mockRepo.lockUser).toHaveBeenCalledWith('user-1', expect.any(Date));
  });

  it('should return tempToken when 2FA is enabled', async () => {
    const useCase = new LoginUser(mockRepo as any, mockTokens as any, mockHasher as any);
    mockRepo.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'test@test.com',
      estado: 'ACTIVO',
      passwordHash: 'hashed',
      failedLoginAttempts: 0,
      lockedUntil: null,
      twoFactorEnabled: true,
    });
    mockHasher.compare.mockResolvedValue(true);
    mockRepo.findPermissionsByRole.mockResolvedValue(['catalog:read']);
    mockRepo.findPermissionsByUser.mockResolvedValue(['customers:create']);
    mockTokens.signTempToken.mockReturnValue('temp-token');

    const result = await useCase.execute({ email: 'test@test.com', password: 'password' }) as any;

    expect(result.requiresTwoFactor).toBe(true);
    expect(result.tempToken).toBe('temp-token');
    expect(result.user.permissions).toEqual(['catalog:read', 'customers:create']);
  });
});

describe('RefreshToken', () => {
  it('should refresh tokens successfully', async () => {
    const useCase = new RefreshToken(mockRepo as any, mockTokens as any, mockHasher as any);
    mockTokens.verifyRefreshToken.mockReturnValue({ userId: 'user-1' });
    mockRepo.findById.mockResolvedValue({
      id: 'user-1',
      estado: 'ACTIVO',
      refreshToken: 'hashed-refresh',
    });
    mockHasher.compare.mockResolvedValue(true);
    mockRepo.findPermissionsByRole.mockResolvedValue(['catalog:read']);
    mockRepo.findPermissionsByUser.mockResolvedValue(['customers:create']);
    mockTokens.signAccessToken.mockReturnValue('new-access');
    mockTokens.signRefreshToken.mockReturnValue('new-refresh');
    mockHasher.hash.mockResolvedValue('new-hashed-refresh');

    const result = await useCase.execute('refresh-token');

    expect(result).toHaveProperty('accessToken', 'new-access');
    expect(result).toHaveProperty('refreshToken', 'new-refresh');
    expect((result as any).user.permissions).toEqual(['catalog:read', 'customers:create']);
    expect(mockRepo.updateRefreshToken).toHaveBeenCalledWith('user-1', 'new-hashed-refresh');
  });

  it('should throw UnauthorizedError for invalid refresh token', async () => {
    const useCase = new RefreshToken(mockRepo as any, mockTokens as any, mockHasher as any);
    mockTokens.verifyRefreshToken.mockImplementation(() => {
      throw new UnauthorizedError('Refresh token inválido');
    });

    await expect(useCase.execute('invalid-token')).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when user is not found', async () => {
    const useCase = new RefreshToken(mockRepo as any, mockTokens as any, mockHasher as any);
    mockTokens.verifyRefreshToken.mockReturnValue({ userId: 'user-1' });
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('refresh-token')).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError when refresh token does not match', async () => {
    const useCase = new RefreshToken(mockRepo as any, mockTokens as any, mockHasher as any);
    mockTokens.verifyRefreshToken.mockReturnValue({ userId: 'user-1' });
    mockRepo.findById.mockResolvedValue({
      id: 'user-1',
      estado: 'ACTIVO',
      refreshToken: 'hashed-refresh',
    });
    mockHasher.compare.mockResolvedValue(false);

    await expect(useCase.execute('refresh-token')).rejects.toThrow(UnauthorizedError);
  });
});
