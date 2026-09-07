import { describe, it, expect, vi } from 'vitest';
import { CreateOrder, GetOrders, GetOrderById, UpdateOrderStatus, AssignDomiciliario, CancelOrder } from '@/modules/orders/application/use-cases/OrderUseCases';
import type { OrderRepository, CreateOrderInput } from '@/modules/orders/domain/repositories/OrderRepository';
import type { CustomerRepository } from '@/modules/customers/domain/repositories/CustomerRepository';
import type { ProductRepository } from '@/modules/catalog/domain/repositories/ProductRepository';
import type { EventBus } from '@/modules/shared/application/EventBus';
import type { InventoryMovementRepository } from '@/modules/stock/domain/repositories/InventoryMovementRepository';
import { Order } from '@/modules/orders/domain/entities/Order';

const mockOrder = (overrides = {}) => new Order({
  id: '1',
  numero: 'PED-000001',
  cliente: 'Juan Pérez',
  asesor: 'Asesor Test',
  fecha: new Date().toISOString(),
  total: 50000,
  items: 2,
  estado: 'Nuevo',
  prioridad: 'Estándar',
  itemsList: [{ productId: '1', nombre: 'Camiseta', precio: 25000, cantidad: 2 }],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockCustomer = {
  id: '1',
  nombre: 'Juan Pérez',
  cupoTotal: 100000,
  cupoUsado: 0,
  tieneCupoDisponible: (monto: number) => monto <= 100000,
};

const mockRepo: jest.Mocked<OrderRepository> = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  updateStatus: vi.fn(),
  assignDomiciliario: vi.fn(),
  findReceiptByOrderId: vi.fn(),
  createReceipt: vi.fn(),
  cancelOrder: vi.fn(),
  softDelete: vi.fn(),
  updateFull: vi.fn(),
  updatePaymentProof: vi.fn(),
  updateValidation: vi.fn(),
  getWithPaymentProof: vi.fn(),
  updateToAccepted: vi.fn(),
  updateToRejected: vi.fn(),
  updateReceiptSent: vi.fn(),
  getByNumero: vi.fn(),
};

const mockCustomerRepo: jest.Mocked<CustomerRepository> = {
  getById: vi.fn(),
  updateCupo: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockProductRepo: jest.Mocked<ProductRepository> = {
  list: vi.fn(),
  getById: vi.fn(),
  getByRef: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockEventBus: jest.Mocked<EventBus> = {
  publish: vi.fn(),
  subscribe: vi.fn(),
};

const _mockMovementRepo: jest.Mocked<InventoryMovementRepository> = {
  list: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  delete: vi.fn(),
};

describe('CreateOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create order, reduce stock and register movement', async () => {
    mockCustomerRepo.getById.mockResolvedValue(mockCustomer as any);
    mockRepo.create.mockResolvedValue(mockOrder());

    const mockPrisma = { $transaction: vi.fn().mockResolvedValue(mockOrder()) } as any;

    const useCase = new CreateOrder(mockRepo, mockCustomerRepo, mockProductRepo, mockPrisma, mockEventBus);
    const input: CreateOrderInput = {
      clienteId: '1',
      asesorId: 'asesor1',
      itemsList: [{ productId: '1', nombre: 'Camiseta', precio: 25000, cantidad: 2 }],
    };

    const result = await useCase.execute(input);

    expect(result.numero).toBe('PED-000001');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
  });

  it('should create order without movement repo if not provided', async () => {
    mockCustomerRepo.getById.mockResolvedValue(mockCustomer as any);
    mockRepo.create.mockResolvedValue(mockOrder());

    const mockPrisma = { $transaction: vi.fn().mockResolvedValue(mockOrder()) } as any;

    const useCase = new CreateOrder(mockRepo, mockCustomerRepo, mockProductRepo, mockPrisma, mockEventBus);
    const input: CreateOrderInput = {
      clienteId: '1',
      asesorId: 'asesor1',
      itemsList: [{ productId: '1', nombre: 'Camiseta', precio: 25000, cantidad: 2 }],
    };

    const result = await useCase.execute(input);

    expect(result.numero).toBe('PED-000001');
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
  });

  it('should throw if customer not found', async () => {
    mockCustomerRepo.getById.mockResolvedValue(null as any);
    const mockPrisma = { 
      $transaction: vi.fn(),
      user: { findFirst: vi.fn() },
      customer: { create: vi.fn() },
    } as any;
    const useCase = new CreateOrder(mockRepo, mockCustomerRepo, mockProductRepo, mockPrisma, mockEventBus);

    await expect(useCase.execute({ clienteId: '1', asesorId: 'a', itemsList: [] })).rejects.toThrow('Cliente no encontrado');
  });

  it('should throw if no cupo disponible', async () => {
    mockCustomerRepo.getById.mockResolvedValue({ ...mockCustomer, isTrustedCustomer: false } as any);
    const mockPrisma = {
      $transaction: vi.fn().mockResolvedValue({
        id: '1', numero: 'PED-000001', cliente: 'Juan Pérez', asesor: 'Asesor Test',
        clienteId: '1', asesorId: 'asesor1', total: 50000, items: 2, estado: 'Pendiente',
      }),
      customer: { update: vi.fn() },
      product: { update: vi.fn(), findUnique: vi.fn() },
      inventoryMovement: { create: vi.fn() },
    } as any;
    const useCase = new CreateOrder(mockRepo, mockCustomerRepo, mockProductRepo, mockPrisma, mockEventBus);

    await expect(useCase.execute({ clienteId: '1', asesorId: 'a', itemsList: [{ nombre: 'x', precio: 1, cantidad: 1 }], paymentMethod: 'INSTALLMENTS' })).rejects.toThrow('Solo los clientes de confianza pueden seleccionar pago a cuotas');
  });
});

describe('GetOrders', () => {
  it('should list orders', async () => {
    mockRepo.list.mockResolvedValue({ data: [mockOrder()], meta: { total: 1, page: 1, limit: 10 } });
    const useCase = new GetOrders(mockRepo);
    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
  });
});

describe('GetOrderById', () => {
  it('should get order by id', async () => {
    mockRepo.getById.mockResolvedValue(mockOrder());
    const useCase = new GetOrderById(mockRepo);
    const result = await useCase.execute('1');
    expect(result.numero).toBe('PED-000001');
  });

  it('should throw if not found', async () => {
    mockRepo.getById.mockResolvedValue(null);
    const useCase = new GetOrderById(mockRepo);
    await expect(useCase.execute('1')).rejects.toThrow('Pedido no encontrado');
  });
});

describe('UpdateOrderStatus', () => {
  it('should update status and publish events', async () => {
    const order = mockOrder({ estado: 'Pendiente' });
    mockRepo.getById.mockResolvedValue(order);
    mockRepo.updateStatus.mockResolvedValue(mockOrder({ estado: 'Aceptado' }));

    const useCase = new UpdateOrderStatus(mockRepo, mockEventBus);
    const result = await useCase.execute('1', 'Aceptado');

    expect(result.estado).toBe('Aceptado');
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it('should publish OrderDeliveredEvent when estado is Entregado', async () => {
    const order = mockOrder({ estado: 'Enviado' });
    mockRepo.getById.mockResolvedValue(order);
    mockRepo.updateStatus.mockResolvedValue(mockOrder({ estado: 'Entregado' }));
    mockRepo.findReceiptByOrderId.mockResolvedValue(null);
    mockRepo.createReceipt.mockResolvedValue({ id: 'rec-1', orderId: '1' } as any);

    const useCase = new UpdateOrderStatus(mockRepo, mockEventBus);
    await useCase.execute('1', 'Entregado');

    const deliveredEvent = mockEventBus.publish.mock.calls.find(([e]) => (e as any).type === 'order.delivered');
    expect(deliveredEvent).toBeDefined();
  });

  it('should publish OrderStatusUpdatedEvent when estado is Rechazado', async () => {
    const order = mockOrder({ estado: 'Pendiente' });
    mockRepo.getById.mockResolvedValue(order);
    mockRepo.updateStatus.mockResolvedValue(mockOrder({ estado: 'Rechazado' }));

    const useCase = new UpdateOrderStatus(mockRepo, mockEventBus);
    await useCase.execute('1', 'Rechazado');

    const statusUpdatedEvent = mockEventBus.publish.mock.calls.find(([e]) => (e as any).type === 'order.status.updated');
    expect(statusUpdatedEvent).toBeDefined();
  });
});

describe('AssignDomiciliario', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should assign domiciliario', async () => {
    mockRepo.assignDomiciliario.mockResolvedValue(mockOrder());
    mockRepo.getById.mockResolvedValue(mockOrder());
    const useCase = new AssignDomiciliario(mockRepo, mockEventBus);
    const result = await useCase.execute('1', 'dom1', 'Domiciliario Test');
    expect(result.id).toBe('1');
  });

  it('should throw if order not found', async () => {
    mockRepo.getById.mockResolvedValue(null as any);
    const useCase = new AssignDomiciliario(mockRepo, mockEventBus);
    await expect(useCase.execute('1', 'dom1', 'Domiciliario Test')).rejects.toThrow('Pedido no encontrado');
  });
});

describe('CancelOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should cancel order and publish event when getById returns Order entity', async () => {
    const order = mockOrder({ estado: 'Pendiente' });
    mockRepo.getById.mockResolvedValue(order);
    mockRepo.cancelOrder.mockResolvedValue(mockOrder({ estado: 'Cancelado', motivoAnulacion: 'Motivo test' }));

    const useCase = new CancelOrder(mockRepo, mockEventBus);
    const result = await useCase.execute('1', 'Motivo test');

    expect(result.estado).toBe('Cancelado');
    expect(mockRepo.cancelOrder).toHaveBeenCalledWith('1', 'Motivo test');
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it('should throw NotFoundError when order does not exist', async () => {
    mockRepo.getById.mockResolvedValue(null as any);
    const useCase = new CancelOrder(mockRepo, mockEventBus);

    await expect(useCase.execute('nonexistent', 'Motivo válido')).rejects.toThrow('Pedido no encontrado');
  });

  it('should throw BadRequestError when order cannot be canceled', async () => {
    const order = mockOrder({ estado: 'Entregado' });
    mockRepo.getById.mockResolvedValue(order);
    const useCase = new CancelOrder(mockRepo, mockEventBus);

    await expect(useCase.execute('1', 'Motivo válido')).rejects.toThrow('El pedido no puede ser cancelado en su estado actual');
  });
});
