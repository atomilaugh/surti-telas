import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrderDeliverySubscriber } from '@/modules/orders/application/use-cases/OrderDeliverySubscriber';
import type { EventBus, DomainEvent } from '@/shared/application/EventBus';

vi.mock('@/config/database', () => ({
  prisma: {
    delivery: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/shared/infrastructure/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockPrisma = vi.mocked(await import('@/config/database')).prisma;

const createMockEventBus = (): EventBus => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
});

const getHandler = (eventBus: EventBus) =>
  (eventBus.subscribe as any).mock.calls.find(([t]) => t === 'order.dispatched')?.[1] as
    | ((event: DomainEvent) => Promise<void>)
    | undefined;

const makeDispatchedEvent = (payload: Record<string, unknown>) => ({
  type: 'order.dispatched' as const,
  occurredAt: new Date(),
  payload,
});

describe('OrderDeliverySubscriber', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should register subscription to order.dispatched event on construction', () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);

    expect(eventBus.subscribe).toHaveBeenCalledTimes(1);
    expect(eventBus.subscribe).toHaveBeenCalledWith(
      'order.dispatched',
      expect.any(Function),
    );
  });

  it('should UPDATE existing delivery when orderId already has a delivery', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);
    expect(handler).toBeDefined();

    mockPrisma.delivery.findFirst.mockResolvedValue({
      id: 'del-existing',
      orderId: 'order-1',
      direccion: 'Old address',
      ciudad: 'Old city',
      telefono: '123',
      domiciliarioId: 'dom-1',
      asignadoEn: new Date('2026-09-17T09:00:00Z'),
      order: { clienteId: 'cli-1' },
    });
    mockPrisma.customer.findUnique.mockResolvedValue({
      direccion: 'Customer address',
      ciudad: 'Customer city',
      telefono: '300customer',
    });
    mockPrisma.delivery.update.mockResolvedValue({
      id: 'del-existing',
      orderId: 'order-1',
      estado: 'ASIGNADO',
    });

    await handler!(makeDispatchedEvent({
      orderId: 'order-1',
      orderNumero: 'PED-0001',
      clienteId: 'cli-1',
      clienteNombre: 'Cliente Test',
      direccion: 'Payload address',
      ciudad: 'Bogotá',
      telefono: '3001234567',
      total: 125000,
    }));

    expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
      where: { id: 'del-existing' },
      data: {
        domiciliarioId: 'dom-1',
        estado: 'ASIGNADO',
        direccion: 'Payload address',
        ciudad: 'Bogotá',
        telefono: '3001234567',
        asignadoEn: new Date('2026-09-17T09:00:00Z'),
      },
    });
    expect(mockPrisma.delivery.create).not.toHaveBeenCalled();
  });

  it('should CREATE new delivery when orderId has no existing delivery', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);
    expect(handler).toBeDefined();

    mockPrisma.delivery.findFirst.mockResolvedValue(null);

    await handler!(makeDispatchedEvent({
      orderId: 'order-2',
      orderNumero: 'PED-0002',
      clienteId: 'cli-2',
      clienteNombre: 'Otro Cliente',
      domiciliarioId: 'dom-2',
      direccion: 'New address',
      ciudad: 'Medellín',
      telefono: '3109876543',
      total: 75000,
    }));

    expect(mockPrisma.delivery.create).toHaveBeenCalledWith({
      data: {
        orderId: 'order-2',
        domiciliarioId: 'dom-2',
        estado: 'ASIGNADO',
        direccion: 'New address',
        ciudad: 'Medellín',
        telefono: '3109876543',
        asignadoEn: expect.any(Date),
      },
    });
    expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
  });

  it('should fallback to customer address when payload.direccion is empty', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);

    mockPrisma.delivery.findFirst.mockResolvedValue({
      id: 'del-existing',
      orderId: 'order-3',
      direccion: 'Old delivery address',
      ciudad: 'Old city',
      telefono: '123',
      domiciliarioId: 'dom-1',
      asignadoEn: new Date('2026-09-17T09:00:00Z'),
      order: { clienteId: 'cli-3' },
    });
    mockPrisma.customer.findUnique.mockResolvedValue({
      direccion: 'Fallback address from customer',
      ciudad: 'Fallback city',
      telefono: '300fallback',
    });
    mockPrisma.delivery.update.mockResolvedValue({ id: 'del-existing' });

    await handler!(makeDispatchedEvent({
      orderId: 'order-3',
      orderNumero: 'PED-0003',
      clienteId: 'cli-3',
      clienteNombre: 'Cliente Fallback',
      direccion: '',
      ciudad: '',
      telefono: '',
      total: 50000,
    }));

    expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
      where: { id: 'del-existing' },
      data: expect.objectContaining({
        direccion: 'Fallback address from customer',
        ciudad: 'Fallback city',
        telefono: '300fallback',
      }),
    });
  });

  it('should use empty string for direccion when both payload and customer have no address', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);

    mockPrisma.delivery.findFirst.mockResolvedValue(null);

    await handler!(makeDispatchedEvent({
      orderId: 'order-4',
      orderNumero: 'PED-0004',
      clienteId: 'cli-4',
      clienteNombre: 'Sin Direccion',
      direccion: null,
      ciudad: null,
      telefono: null,
      total: 25000,
    }));

    expect(mockPrisma.delivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        direccion: '',
        ciudad: '',
        telefono: '',
      }),
    });
  });

  it('should fallback to existing delivery domiciliarioId when payload does not provide it', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);

    mockPrisma.delivery.findFirst.mockResolvedValue({
      id: 'del-existing',
      orderId: 'order-5',
      domiciliarioId: 'dom-existing',
      direccion: 'Delivery street',
      ciudad: 'City',
      telefono: '555',
      asignadoEn: new Date('2026-09-17T08:00:00Z'),
      order: { clienteId: 'cli-5' },
    });
    mockPrisma.delivery.update.mockResolvedValue({ id: 'del-existing' });

    await handler!(makeDispatchedEvent({
      orderId: 'order-5',
      orderNumero: 'PED-0005',
      clienteId: 'cli-5',
      clienteNombre: 'Cliente Test',
      direccion: 'Payload address',
      total: 30000,
    }));

    const updateCall = mockPrisma.delivery.update.mock.calls[0][0];
    expect(updateCall.data.domiciliarioId).toBe('dom-existing');
  });

  it('should handle errors gracefully without throwing', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);

    mockPrisma.delivery.findFirst.mockRejectedValue(new Error('DB error'));

    await expect(
      handler!(makeDispatchedEvent({
        orderId: 'order-6',
        orderNumero: 'PED-0006',
        clienteId: 'cli-6',
        clienteNombre: 'Cliente Error',
        direccion: 'Address',
        total: 10000,
      })),
    ).resolves.not.toThrow();
  });

  it('should include domiciliarioId from payload when provided', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);

    mockPrisma.delivery.findFirst.mockResolvedValue(null);

    await handler!(makeDispatchedEvent({
      orderId: 'order-7',
      orderNumero: 'PED-0007',
      clienteId: 'cli-7',
      clienteNombre: 'Cliente Test',
      domiciliarioId: 'dom-from-payload',
      direccion: 'Address',
      ciudad: 'Bogotá',
      telefono: '3001234567',
      total: 99999,
    }));

    expect(mockPrisma.delivery.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        domiciliarioId: 'dom-from-payload',
      }),
    });
  });

  it('should preserve existing asignadoEn when updating an existing delivery', async () => {
    const eventBus = createMockEventBus();
    new OrderDeliverySubscriber(eventBus);
    const handler = getHandler(eventBus);

    const existingAsignadoEn = new Date('2026-09-16T14:30:00Z');
    mockPrisma.delivery.findFirst.mockResolvedValue({
      id: 'del-existing',
      orderId: 'order-8',
      direccion: 'Old address',
      ciudad: 'Old city',
      telefono: '123',
      domiciliarioId: 'dom-1',
      asignadoEn: existingAsignadoEn,
      order: { clienteId: 'cli-8' },
    });
    mockPrisma.delivery.update.mockResolvedValue({ id: 'del-existing' });

    await handler!(makeDispatchedEvent({
      orderId: 'order-8',
      orderNumero: 'PED-0008',
      clienteId: 'cli-8',
      clienteNombre: 'Cliente Test',
      direccion: 'New address',
      total: 45000,
    }));

    expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
      where: { id: 'del-existing' },
      data: expect.objectContaining({
        asignadoEn: existingAsignadoEn,
      }),
    });
  });
});
