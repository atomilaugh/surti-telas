import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForgotPassword } from '@/modules/recovery/application/use-cases/ForgotPassword';
import { ResetPassword } from '@/modules/recovery/application/use-cases/ResetPassword';
import { ChangePassword } from '@/modules/recovery/application/use-cases/ChangePassword';
import { RecoveryTokenService } from '@/modules/recovery/domain/services/RecoveryTokenService';
import { BcryptPasswordHasher } from '@/modules/auth/infrastructure/services/BcryptPasswordHasher';

const mockAuthRepo = {
  findByEmail: vi.fn(),
  findById: vi.fn(),
  isRoleActive: vi.fn().mockResolvedValue(true),
  updatePassword: vi.fn(),
  updateRefreshToken: vi.fn(),
};

const createRecoveryRepo = () => {
  const requests: any[] = [];
  return {
    create: vi.fn(async (req: any) => {
      const id = 'req-' + requests.length + '-' + Date.now();
      const request = { ...req, id, estado: 'PENDIENTE', createdAt: new Date(), updatedAt: new Date() };
      requests.push(request);
      return request;
    }),
    findByTokenHash: vi.fn(),
    findById: vi.fn(async (id: string) => requests.find(r => r.id === id) || null),
    findPendingByUserId: vi.fn(async (userId: string) => requests.filter(r => r.userId === userId && r.estado === 'PENDIENTE')),
    findAll: vi.fn(async (filters?: { estado?: string; limit?: number }) => {
      let filtered = [...requests];
      if (filters?.estado) filtered = filtered.filter(r => r.estado === filters.estado);
      return { data: filtered, meta: { total: filtered.length, page: 1, limit: filters?.limit ?? 100 } };
    }),
    markCompleted: vi.fn(async (id: string, resultado?: string) => {
      const req = requests.find(r => r.id === id);
      if (req) { req.estado = 'COMPLETADA'; req.completedAt = new Date(); req.resultado = resultado ?? null; }
    }),
    markExpired: vi.fn(async (id: string) => {
      const req = requests.find(r => r.id === id);
      if (req) { req.estado = 'EXPIRADA'; }
    }),
    markRejected: vi.fn(async (id: string, motivo: string) => {
      const req = requests.find(r => r.id === id);
      if (req) { req.estado = 'RECHAZADA'; req.resultado = motivo; }
    }),
    _requests: requests,
  };
};

const mockTokenService = new RecoveryTokenService();
const mockHasher = {
  hash: vi.fn(),
  compare: vi.fn(),
};
const realHasher = new BcryptPasswordHasher();

const mockEmailService = {
  sendPasswordReset: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ForgotPassword', () => {
  it('should set reset token for existing active user', async () => {
    const recoveryRepo = createRecoveryRepo();
    mockAuthRepo.findByEmail.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE', email: 'test@test.com' });
    mockEmailService.sendPasswordReset.mockResolvedValue({ previewUrl: undefined });

    const useCase = new ForgotPassword(mockAuthRepo as any, recoveryRepo as any, mockTokenService as any, mockEmailService as any);
    const result = await useCase.execute('test@test.com');

    expect(mockAuthRepo.findByEmail).toHaveBeenCalledWith('test@test.com');
    expect(recoveryRepo.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-1', email: 'test@test.com' }));
    expect(mockEmailService.sendPasswordReset).toHaveBeenCalledWith('test@test.com', expect.any(String), expect.any(String));
    expect(result.message).toContain('Si el correo existe');
  });

  it('should return generic message for non-existing user', async () => {
    const recoveryRepo = createRecoveryRepo();
    mockAuthRepo.findByEmail.mockResolvedValue(null);

    const useCase = new ForgotPassword(mockAuthRepo as any, recoveryRepo as any, mockTokenService as any, mockEmailService as any);
    const result = await useCase.execute('nonexistent@test.com');

    expect(recoveryRepo.create).not.toHaveBeenCalled();
    expect(mockEmailService.sendPasswordReset).not.toHaveBeenCalled();
    expect(result.message).toContain('Si el correo existe');
  });
});

describe('ResetPassword - REAL bcrypt integration', () => {
  const future = (mins: number) => new Date(Date.now() + mins * 60 * 1000);

  it('TEST 1: Token correcto + pendiente + no expirado → reset exitoso', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(15) });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE', passwordHash: 'old-hash' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    const result = await useCase.execute(token, 'Password123!');

    expect(result.user.id).toBe('user-1');
    expect(recoveryRepo.markCompleted).toHaveBeenCalled();
    expect(mockAuthRepo.updatePassword).toHaveBeenCalled();
    const newHash = mockAuthRepo.updatePassword.mock.calls[0][1];
    expect(newHash).not.toBe('old-hash');
  });

  it('TEST 2: Token incorrecto → 404', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(15) });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    await expect(useCase.execute('wrong-token-never', 'Password123!')).rejects.toThrow('Token de restablecimiento no encontrado');
  });

  it('TEST 3: Token expirado → 404', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(-1) });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    await expect(useCase.execute(token, 'Password123!')).rejects.toThrow('Token de restablecimiento expirado');
    expect(recoveryRepo.markExpired).toHaveBeenCalled();
  });

  it('TEST 4: Token ya utilizado → 403', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    const req = await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(15) });
    await recoveryRepo.markCompleted(req.id, 'Ya utilizado');

    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    await expect(useCase.execute(token, 'Password123!')).rejects.toThrow('Token de restablecimiento ya utilizado');
  });

  it('TEST 5: Reutilizar token completado → rechazo', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(15) });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE', passwordHash: 'old-hash' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    await useCase.execute(token, 'Password123!');
    await expect(useCase.execute(token, 'NewPass456!')).rejects.toThrow('Token de restablecimiento ya utilizado');
    const completed = recoveryRepo._requests.filter(r => r.estado === 'COMPLETADA');
    expect(completed.length).toBe(1);
  });

  it('TEST 6: passwordHash cambia después de reset exitoso', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(15) });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE', passwordHash: 'old-hash' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    await useCase.execute(token, 'Password123!');

    expect(mockAuthRepo.updatePassword).toHaveBeenCalled();
    const newHash = mockAuthRepo.updatePassword.mock.calls[0][1];
    expect(newHash).not.toBe('old-hash');
  });

  it('TEST 7: completedAt establecido después de reset exitoso', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(15) });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE', passwordHash: 'old-hash' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    await useCase.execute(token, 'Password123!');

    expect(recoveryRepo.markCompleted).toHaveBeenCalledWith(expect.any(String), 'Contraseña actualizada');
    const completed = recoveryRepo._requests.find(r => r.estado === 'COMPLETADA');
    expect(completed).toBeDefined();
    expect(completed.completedAt).toBeInstanceOf(Date);
  });

  it('TEST 8: Segunda utilización del mismo token falla', async () => {
    const recoveryRepo = createRecoveryRepo();
    const token = await mockTokenService.generateToken();
    const tokenHash = await mockTokenService.hashToken(token);

    await recoveryRepo.create({ userId: 'user-1', email: 'test@test.com', tokenHash, expiresAt: future(15) });
    mockAuthRepo.findById.mockResolvedValue({ id: 'user-1', estado: 'ACTIVO', role: 'CLIENTE', passwordHash: 'old-hash' });

    const useCase = new ResetPassword(mockAuthRepo as any, recoveryRepo as any, realHasher as any, mockTokenService as any);
    await useCase.execute(token, 'Password123!');
    await expect(useCase.execute(token, 'Password123!')).rejects.toThrow('Token de restablecimiento ya utilizado');
    const completed = recoveryRepo._requests.filter(r => r.estado === 'COMPLETADA');
    expect(completed.length).toBe(1);
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