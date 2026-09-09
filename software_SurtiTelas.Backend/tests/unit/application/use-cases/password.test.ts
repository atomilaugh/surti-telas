import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPassword } from '@/modules/recovery/application/use-cases/ForgotPassword';
import { ResetPassword } from '@/modules/recovery/application/use-cases/ResetPassword';
import { ChangePassword } from '@/modules/recovery/application/use-cases/ChangePassword';

const mockAuthRepo = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  isRoleActive: vi.fn().mockResolvedValue(true),
  updatePassword: vi.fn(),
  updateRefreshToken: vi.fn(),
};

const mockRecoveryRepo = {
  create: vi.fn(),
  findByTokenHash: vi.fn(),
  findById: vi.fn(),
  markCompleted: vi.fn(),
  markExpired: vi.fn(),
  markRejected: vi.fn(),
  findAll: vi.fn(),
};

const mockTokenService = {
  generateToken: vi.fn().mockResolvedValue('test-token'),
  hashToken: vi.fn().mockResolvedValue('hashed-token'),
  verifyToken: vi.fn().mockResolvedValue(true),
};

const mockEmailService = {
  sendPasswordReset: vi.fn(),
};

const mockHasher = {
  hash: vi.fn(),
  compare: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPassword', () => {
  it('should set reset token for existing active user', async () => {
    mockAuthRepo.findByEmail.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE', email: 'test@test.com' });
    mockRecoveryRepo.create.mockResolvedValue({ id: 'req-1', userId: 'user-1', email: 'test@test.com', tokenHash: 'hashed-token', expiresAt: new Date(), estado: 'PENDIENTE', createdAt: new Date(), updatedAt: new Date() });
    mockEmailService.sendPasswordReset.mockResolvedValue({ previewUrl: undefined });

    const useCase = new ForgotPassword(mockAuthRepo as any, mockRecoveryRepo as any, mockTokenService as any, mockEmailService as any);
    const result = await useCase.execute('test@test.com');

    expect(mockAuthRepo.findByEmail).toHaveBeenCalledWith('test@test.com');
    expect(mockRecoveryRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', email: 'test@test.com' }));
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith('test@test.com', 'test-token', 'req-1');
    expect(result.message).toContain('Si el correo existe');
  });

  it('should return generic message for non-existing user', async () => {
    mockAuthRepo.findByEmail.mockResolvedValue(null);

    const useCase = new ForgotPassword(mockAuthRepo as any, mockRecoveryRepo as any, mockTokenService as any, mockEmailService as any);
    const result = await useCase.execute('nonexistent@test.com');

    expect(mockRecoveryRepo.create).not.toHaveBeenCalled();
    expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
    expect(result.message).toContain('Si el correo existe');
  });
});

describe('ResetPassword', () => {
  it('should reset password with valid token', async () => {
    mockRecoveryRepo.findByTokenHash.mockResolvedValue({ id: 'req-1', userId: 'user-1', email: 'test@test.com', tokenHash: 'hashed-token', expiresAt: new Date(Date.now() + 3600000), estado: 'PENDIENTE', createdAt: new Date(), updatedAt: new Date() });
    mockRecoveryRepo.findById.mockResolvedValue({ id: 'req-1', userId: 'user-1', email: 'test@test.com', tokenHash: 'hashed-token', expiresAt: new Date(Date.now() + 3600000), estado: 'PENDIENTE', createdAt: new Date(), updatedAt: new Date() });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE' });
    mockHasher.hash.mockResolvedValue('hashed-password');
    mockAuthRepo.updatePassword.mockResolvedValue(undefined);
    mockAuthRepo.updateRefreshToken.mockResolvedValue(undefined);
    mockRecoveryRepo.markCompleted.mockResolvedValue(undefined);

    const useCase = new ResetPassword(mockAuthRepo as any, mockRecoveryRepo as any, mockHasher as any, mockTokenService as any);
    await useCase.execute('valid-token', 'NewPass123!');

    expect(mockHasher.hash).toHaveBeenCalledWith('NewPass123!');
    expect(mockAuthRepo.updatePassword).toHaveBeenCalledWith('user-1', 'hashed-password');
    expect(mockAuthRepo.updateRefreshToken).toHaveBeenCalledWith('user-1', null);
    expect(mockRecoveryRepo.markCompleted).toHaveBeenCalledWith('req-1', 'Contraseña actualizada');
  });

  it('should throw for invalid or expired token', async () => {
    mockRecoveryRepo.findByTokenHash.mockResolvedValue(null);

    const useCase = new ResetPassword(mockAuthRepo as any, mockRecoveryRepo as any, mockHasher as any, mockTokenService as any);
    await expect(useCase.execute('invalid-token', 'NewPass123!')).rejects.toThrow('Token de restablecimiento inválido o expirado');
  });

  it('should throw for expired token', async () => {
    mockRecoveryRepo.findByTokenHash.mockResolvedValue({ id: 'req-1', userId: 'user-1', tokenHash: 'hashed', expiresAt: new Date(Date.now() - 3600000), estado: 'PENDIENTE', createdAt: new Date(), updatedAt: new Date() });
    mockRecoveryRepo.findById.mockResolvedValue({ id: 'req-1', userId: 'user-1', tokenHash: 'hashed', expiresAt: new Date(Date.now() - 3600000), estado: 'PENDIENTE', createdAt: new Date(), updatedAt: new Date() });
    mockRecoveryRepo.markExpired.mockResolvedValue(undefined);

    const useCase = new ResetPassword(mockAuthRepo as any, mockRecoveryRepo as any, mockHasher as any, mockTokenService as any);
    await expect(useCase.execute('expired-token', 'NewPass123!')).rejects.toThrow('Token de restablecimiento inválido o expirado');
    expect(mockRecoveryRepo.markExpired).toHaveBeenCalledWith('req-1');
  });
});

describe('ChangePassword', () => {
  it('should change password with correct current password', async () => {
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', passwordHash: 'old-hash', estado: 'ACTIVO', role: 'CLIENTE' });
    mockHasher.compare.mockResolvedValue(true);
    mockHasher.hash.mockResolvedValue('new-hash');
    mockAuthRepo.updatePassword.mockResolvedValue(undefined);
    mockAuthRepo.updateRefreshToken.mockResolvedValue(undefined);

    const useCase = new ChangePassword(mockAuthRepo as any, mockHasher as any);
    await useCase.execute('user-1', 'OldPass123!', 'NewPass123!');

    expect(mockHasher.compare).toHaveBeenCalledWith('OldPass123!', 'old-hash');
    expect(mockHasher.hash).toHaveBeenCalledWith('NewPass123!');
    expect(mockAuthRepo.updatePassword).toHaveBeenCalledWith('user-1', 'new-hash');
    expect(mockAuthRepo.updateRefreshToken).toHaveBeenCalledWith('user-1', null);
  });

  it('should throw for incorrect current password', async () => {
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', passwordHash: 'old-hash', estado: 'ACTIVO', role: 'CLIENTE' });
    mockHasher.compare.mockResolvedValue(false);

    const useCase = new ChangePassword(mockAuthRepo as any, mockHasher as any);
    await expect(useCase.execute('user-1', 'WrongPass123!', 'NewPass123!')).rejects.toThrow('Contraseña actual incorrecta');
  });

  it('should throw for non-existing user', async () => {
    mockAuthRepo.findById.mockResolvedValue(null);

    const useCase = new ChangePassword(mockAuthRepo as any, mockHasher as any);
    await expect(useCase.execute('non-existent', 'OldPass123!', 'NewPass123!')).rejects.toThrow('Usuario no encontrado');
  });
});
