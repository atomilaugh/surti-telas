import { describe, it, expect, vi } from 'vitest';
import { RegisterUser } from '@/modules/auth/application/use-cases/RegisterUser';
import type { AuthRepository } from '@/modules/auth/domain/repositories/AuthRepository';
import type { PasswordHasher } from '@/modules/auth/domain/services/PasswordHasher';
import type { TokenService } from '@/modules/auth/domain/services/TokenService';
import type { CustomerRepository, CreateCustomerInput } from '@/modules/customers/domain/repositories/CustomerRepository';

describe('RegisterUser', () => {
  const makeUseCase = (overrides: { customerRepo?: jest.Mocked<CustomerRepository>; repo?: jest.Mocked<AuthRepository> } = {}) => {
    const repo: jest.Mocked<AuthRepository> = overrides.repo ?? {
      create: vi.fn().mockResolvedValue({
        id: '1',
        email: 'test@test.com',
        nombre: 'Test',
        apellidos: 'User',
        role: 'CLIENTE',
        estado: 'ACTIVO',
        passwordHash: 'hashed',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any),
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
    const customerRepo: jest.Mocked<CustomerRepository> = overrides.customerRepo ?? {
      create: vi.fn().mockResolvedValue({
        id: 'cust-1',
        nombre: 'Test',
        apellidos: 'User',
        email: 'test@test.com',
        ciudad: 'Medellin',
        tel: '3001234567',
        direccion: 'Carrera 50',
        nit: '12345678',
        estado: 'ACTIVO' as const,
        cupoTotal: 0,
        cupoUsado: 0,
        deudaVencida: 0,
        isTrustedCustomer: false,
        pedidos: 0,
        rol: 'CLIENTE' as const,
      } as any),
      list: vi.fn(),
      getById: vi.fn(),
      getByEmail: vi.fn(),
      getTrustedStatusByUserId: vi.fn(),
      update: vi.fn(),
      assignAsesor: vi.fn(),
      updateCupo: vi.fn(),
      delete: vi.fn(),
    };
    const passwordHasher: jest.Mocked<PasswordHasher> = {
      hash: vi.fn().mockResolvedValue('hashed'),
      compare: vi.fn(),
    };
    const tokens: jest.Mocked<TokenService> = {
      signAccessToken: vi.fn().mockReturnValue('access_token'),
      signRefreshToken: vi.fn().mockReturnValue('refresh_token'),
    } as unknown as jest.Mocked<TokenService>;
    return { repo, customerRepo, passwordHasher, tokens, useCase: new RegisterUser(repo, customerRepo, passwordHasher, tokens) };
  };

  it('should register a new user', async () => {
    const { useCase, customerRepo, repo } = makeUseCase();
    const result = await useCase.execute({
      nombre: 'Test',
      email: 'test@test.com',
      password: 'Password123!',
      role: 'CLIENTE',
    });
    expect(result.user.email).toBe('test@test.com');
    expect(result.user.role).toBe('CLIENTE');
    expect(repo.create).toHaveBeenCalled();
    expect(customerRepo.create).toHaveBeenCalled();
  });

  it('CLIENTE crea Customer con todos los campos', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({
      nombre: 'Carlos',
      apellidos: 'Prueba Cliente',
      email: 'cliente.prueba.nuevo@ejemplo.com',
      password: 'Password123!',
      role: 'CLIENTE',
      telefono: '3001234567',
      direccion: 'Carrera 50 # 20-30',
      ciudad: 'Medellin',
      tipoDocumento: 'CC',
      numeroDocumento: '999999991',
    });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.nombre).toBe('Carlos');
    expect(createCall.apellidos).toBe('Prueba Cliente');
    expect(createCall.email).toBe('cliente.prueba.nuevo@ejemplo.com');
    expect(createCall.tel).toBe('3001234567');
    expect(createCall.direccion).toBe('Carrera 50 # 20-30');
    expect(createCall.nit).toBe('999999991');
    expect(createCall.ciudad).toBe('Medellin');
    expect(createCall.estado).toBe('Activo');
    expect(createCall.cupoTotal).toBe(0);
    expect(createCall.cupoUsado).toBe(0);
    expect(createCall.isTrustedCustomer).toBe(false);
  });

  it('nombre se persiste en Customer', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'Carlos', email: 't1@test.com', password: 'Password123!', role: 'CLIENTE' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.nombre).toBe('Carlos');
  });

  it('apellidos se persiste en Customer', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'Carlos', apellidos: 'Prueba', email: 't2@test.com', password: 'Password123!', role: 'CLIENTE' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.apellidos).toBe('Prueba');
  });

  it('email se persiste en Customer', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't3@test.com', password: 'Password123!', role: 'CLIENTE' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.email).toBe('t3@test.com');
  });

  it('telefono se mapea a tel', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't4@test.com', password: 'Password123!', role: 'CLIENTE', telefono: '3001234567' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.tel).toBe('3001234567');
  });

  it('direccion se persiste en Customer', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't5@test.com', password: 'Password123!', role: 'CLIENTE', direccion: 'Cra 50' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.direccion).toBe('Cra 50');
  });

  it('numeroDocumento se mapea a nit', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't6@test.com', password: 'Password123!', role: 'CLIENTE', numeroDocumento: '123456789' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.nit).toBe('123456789');
  });

  it('ciudad se persiste en Customer', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't7@test.com', password: 'Password123!', role: 'CLIENTE', ciudad: 'Medellin' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.ciudad).toBe('Medellin');
  });

  it('estado = Activo', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't8@test.com', password: 'Password123!', role: 'CLIENTE' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.estado).toBe('Activo');
  });

  it('cupoTotal = 0', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't9@test.com', password: 'Password123!', role: 'CLIENTE' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.cupoTotal).toBe(0);
  });

  it('cupoUsado = 0', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't10@test.com', password: 'Password123!', role: 'CLIENTE' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.cupoUsado).toBe(0);
  });

  it('isTrustedCustomer = false', async () => {
    const { customerRepo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', apellidos: 'P', email: 't11@test.com', password: 'Password123!', role: 'CLIENTE' });
    const createCall = (customerRepo.create as jest.Mock).mock.calls[0][0] as CreateCustomerInput;
    expect(createCall.isTrustedCustomer).toBe(false);
  });

  it('no crea Customer para rol no CLIENTE', async () => {
    const { customerRepo, repo, useCase } = makeUseCase();
    await useCase.execute({ nombre: 'C', email: 'admin@test.com', password: 'Password123!', role: 'ADMIN' });
    expect(repo.create).toHaveBeenCalled();
    expect(customerRepo.create).not.toHaveBeenCalled();
  });
});
