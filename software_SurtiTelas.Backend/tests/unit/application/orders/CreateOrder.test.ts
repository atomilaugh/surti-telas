import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateOrder } from '@/modules/orders/application/use-cases/OrderUseCases';

const mockRepo = {
  create: vi.fn(),
};

const mockCustomerRepo = {
  getById: vi.fn(),
};

const mockProductRepo = {
  getById: vi.fn(),
};

const mockEventBus = {
  publish: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CreateOrder', () => {
  const mockPrisma = {
    $transaction: vi.fn(),
    user: { findFirst: vi.fn() },
    customer: { create: vi.fn() },
  };

  it('should create order and reduce stock', async () => {
    const orderResult = {
      id: 'order-1',
      numero: 'PED-000001',
      cliente: 'cli1',
      asesor: 'asesor1',
      total: 50000,
      items: 2,
      estado: 'Pendiente',
      itemsList: [
        { productId: 'prod1', nombre: 'Camiseta', precio: 25000, cantidad: 2 },
      ],
    };

    mockPrisma.$transaction.mockResolvedValue(orderResult);

    const useCase = new CreateOrder(
      mockRepo as any,
      mockCustomerRepo as any,
      mockProductRepo as any,
      mockPrisma as any,
      mockEventBus as any,
    );

    mockCustomerRepo.getById.mockResolvedValue({
      id: 'cli1',
      nombre: 'Juan',
      tieneCupoDisponible: () => true,
    });

    mockProductRepo.getById.mockResolvedValue({
      id: 'prod1',
      ref: 'REF-001',
      cantidadStock: 10,
    });

    mockRepo.create.mockResolvedValue(orderResult);

    const result = await useCase.execute({
      clienteId: 'cli1',
      asesorId: 'asesor1',
      itemsList: [
        { productId: 'prod1', nombre: 'Camiseta', precio: 25000, cantidad: 2 },
      ],
    });

    expect(result.id).toBe('order-1');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it('should throw NotFoundError when customer does not exist', async () => {
    const useCase = new CreateOrder(
      mockRepo as any,
      mockCustomerRepo as any,
      mockProductRepo as any,
      mockPrisma as any,
      mockEventBus as any,
    );

    mockCustomerRepo.getById.mockResolvedValue(null);
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'asesor1' });
    mockPrisma.customer.create.mockResolvedValue({ id: 'cli1' });

    await expect(
      useCase.execute({
        clienteId: 'cli1',
        asesorId: 'asesor1',
        itemsList: [{ nombre: 'Camiseta', precio: 25000, cantidad: 2 }],
      }),
    ).rejects.toThrow();
  });

  it('should discount the exact color + size variant of the ordered item', async () => {
    const orderResult = {
      id: 'order-2',
      numero: 'PED-000002',
      cliente: 'cli1',
      asesor: 'asesor1',
      total: 25000,
      items: 2,
      estado: 'Pendiente',
      itemsList: [
        { productId: 'prod1', nombre: 'Camiseta', precio: 25000, cantidad: 2, color: 'Azul', talla: 'M' },
      ],
    };

    const productUpdate = vi.fn();
    const variantUpdate = vi.fn();
    const tx = {
      customer: { update: vi.fn() },
      product: { update: productUpdate, findUnique: vi.fn() },
      productColorStock: { updateMany: variantUpdate },
      inventoryMovement: { create: vi.fn() },
    };
    mockPrisma.$transaction.mockImplementation(async (cb: (t: unknown) => unknown) => cb(tx));
    mockRepo.create.mockResolvedValue(orderResult);

    const useCase = new CreateOrder(
      mockRepo as any,
      mockCustomerRepo as any,
      mockProductRepo as any,
      mockPrisma as any,
      mockEventBus as any,
    );

    mockCustomerRepo.getById.mockResolvedValue({
      id: 'cli1',
      nombre: 'Juan',
      tieneCupoDisponible: () => true,
    });

    mockProductRepo.getById.mockResolvedValue({
      id: 'prod1',
      ref: 'REF-001',
      cantidadStock: 30,
      stockPorColor: [
        { color: 'Azul', size: 'S', cantidad: 10 },
        { color: 'Azul', size: 'M', cantidad: 8 },
        { color: 'Rojo', size: 'M', cantidad: 12 },
      ],
    });

    await useCase.execute({
      clienteId: 'cli1',
      asesorId: 'asesor1',
      itemsList: [
        { productId: 'prod1', nombre: 'Camiseta', precio: 25000, cantidad: 3, color: 'Azul', talla: 'M' },
      ],
    });

    expect(productUpdate).toHaveBeenCalledWith({
      where: { ref: 'REF-001' },
      data: { cantidadStock: 27, stockStatus: 'OK' },
    });
    expect(variantUpdate).toHaveBeenCalledWith({
      where: { productId: 'prod1', color: 'Azul', size: 'M', deletedAt: null },
      data: { cantidad: 5, stockStatus: 'BAJO_STOCK' },
    });
  });

  it('should throw error when customer has insufficient credit', async () => {    const useCase = new CreateOrder(
      mockRepo as any,
      mockCustomerRepo as any,
      mockProductRepo as any,
      mockPrisma as any,
      mockEventBus as any,
    );

    mockCustomerRepo.getById.mockResolvedValue({
      id: 'cli1',
      nombre: 'Juan',
      isTrustedCustomer: false,
    });

    await expect(
      useCase.execute({
        clienteId: 'cli1',
        asesorId: 'asesor1',
        itemsList: [{ nombre: 'Camiseta', precio: 25000, cantidad: 2 }],
        paymentMethod: 'INSTALLMENTS',
      }),
    ).rejects.toThrow('Solo los clientes de confianza pueden seleccionar pago a cuotas');
  });
});
