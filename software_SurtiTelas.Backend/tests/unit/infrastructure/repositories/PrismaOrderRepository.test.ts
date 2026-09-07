import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaOrderRepository } from '@/modules/orders/infrastructure/repositories/PrismaOrderRepository';

const mockPrisma = {
  order: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  customer: { findFirst: vi.fn() },
  user: { findFirst: vi.fn() },
  delivery: {
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
} as any;

const repo = new PrismaOrderRepository(mockPrisma as any);

describe('PrismaOrderRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const makeRow = (overrides = {}) => ({
    id: '1',
    numero: 'PED-000001',
    clienteNombre: 'Juan',
    asesorNombre: 'Asesor',
    fecha: new Date(),
    total: { toNumber: () => 50000 },
    itemsCount: 2,
    estado: 'NUEVO',
    prioridad: 'ESTANDAR',
    observaciones: null,
    items: [{ productId: '1', nombre: 'Camiseta', precio: { toNumber: () => 25000 }, cantidad: 2 }],
    createdAt: new Date(),
    updatedAt: new Date(),
    cliente: { nombre: 'Juan' },
    asesor: { nombre: 'Asesor' },
    ...overrides,
  });

  it('should list orders with filters', async () => {
    mockPrisma.$transaction.mockResolvedValue([
      [makeRow()],
      1,
    ]);

    const result = await repo.list({ estado: 'Nuevo', page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('should list orders with cursor pagination', async () => {
    const rows = Array.from({ length: 11 }, (_, i) => makeRow({ id: `id-${i}` }));
    mockPrisma.$transaction.mockResolvedValue([rows, 11]);

    const result = await repo.list({ estado: 'Nuevo', limit: 10, order: 'asc', cursor: Buffer.from('id-0').toString('base64') });

    expect(result.data).toHaveLength(10);
    expect(result.meta.total).toBe(11);
    expect(result.meta.nextCursor).toBeDefined();
    expect(result.meta.nextCursor).toBe(Buffer.from('id-9').toString('base64'));
  });

  it('should get order by id', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(makeRow());

    const result = await repo.getById('1');
    expect(result?.numero).toBe('PED-000001');
  });

  it('should return null if order not found', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const result = await repo.getById('999');
    expect(result).toBeNull();
  });

  it('should create an order', async () => {
    mockPrisma.customer.findFirst.mockResolvedValue({ nombre: 'Juan' });
    mockPrisma.user.findFirst.mockResolvedValue({ nombre: 'Asesor' });

    const tx = {
      order: {
        findFirst: vi.fn().mockResolvedValue({ numero: 'PED-000000' }),
        create: vi.fn().mockResolvedValue(makeRow({ id: '1', numero: 'PED-000001' })),
      },
      orderItem: {
        create: vi.fn(),
      },
      customer: { findUnique: vi.fn().mockResolvedValue({ nombre: 'Juan' }) },
      user: { findUnique: vi.fn().mockResolvedValue({ nombre: 'Asesor' }) },
      $executeRaw: vi.fn(),
    };
    mockPrisma.$transaction.mockImplementation((fn: any) => fn(tx));

    const result = await repo.create({
      clienteId: 'cli1',
      asesorId: 'asesor1',
      itemsList: [{ nombre: 'Camiseta', precio: 25000, cantidad: 2 }],
    });

    expect(result.numero).toBe('PED-000001');
    expect(tx.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          numero: 'PED-000001',
        }),
      })
    );
  });

  it('should update order status', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(makeRow({ estado: 'NUEVO' }));
    mockPrisma.order.update.mockResolvedValue(makeRow({ estado: 'ACEPTADO' }));

    const result = await repo.updateStatus('1', 'Aceptado');
    expect(result.estado).toBe('Aceptado');
  });

  it('should throw on invalid transition', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(makeRow({ estado: 'NUEVO' }));

    await expect(repo.updateStatus('1', 'Entregado')).rejects.toThrow('Transición no permitida');
  });

  it('should assign domiciliario', async () => {
    mockPrisma.order.findFirst.mockResolvedValue(makeRow({ estado: 'ACEPTADO', asesorNombre: 'Asesor' }));
    mockPrisma.user.findFirst.mockResolvedValue({ nombre: 'Domi' });
    mockPrisma.delivery.upsert.mockResolvedValue({ id: 'del1', orderId: '1', estado: 'ASIGNADO' });
    mockPrisma.order.update.mockResolvedValue(makeRow({ estado: 'DESPACHADO' }));

    const result = await repo.assignDomiciliario('1', 'dom1');
    expect(result.asesor).toBe('Asesor');
    expect(mockPrisma.delivery.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { orderId: '1' },
        update: expect.objectContaining({ domiciliarioId: 'dom1', estado: 'ASIGNADO' }),
        create: expect.objectContaining({ orderId: '1', domiciliarioId: 'dom1', estado: 'ASIGNADO' }),
      })
    );
  });
});
