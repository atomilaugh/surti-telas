import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateDelivery } from '@/modules/deliveries/application/use-cases/DeliveryUseCases';
import { Delivery } from '@/modules/deliveries/domain/entities/Delivery';
import type { DeliveryRepository, CreateDeliveryInput } from '@/modules/deliveries/domain/repositories/DeliveryRepository';
import type { EventBus, DomainEvent } from '@/shared/application/EventBus';

const mockDeliveryRepository = {
  list: vi.fn(),
  listRutaDelDia: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockPrisma = {
  order: {
    findFirst: vi.fn(),
  },
};

const mockEventBus: EventBus = {
  publish: vi.fn(),
  subscribe: vi.fn(),
};

const createUseCase = (eventBus?: EventBus) =>
  new CreateDelivery(
    mockDeliveryRepository as unknown as DeliveryRepository,
    mockPrisma as any,
    eventBus,
  );

describe('CreateDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validInput: CreateDeliveryInput = {
    orderId: 'ORDER-TEST',
    domiciliarioId: 'dom-1',
    direccion: 'Calle 123 #45-67',
    ciudad: 'Bogotá',
    telefono: '3001234567',
    notas: 'Cerca del parque',
  };

  it('should create a delivery with ASIGNADO status and asignadoEn timestamp', async () => {
    const createdDelivery = new Delivery({
      id: 'del-1',
      orderId: 'ORDER-TEST',
      domiciliarioId: 'dom-1',
      estado: 'ASIGNADO',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      telefono: '3001234567',
      notas: 'Cerca del parque',
      asignadoEn: new Date(),
    });

    mockDeliveryRepository.create.mockResolvedValue(createdDelivery);
    mockPrisma.order.findFirst.mockResolvedValue({ total: { toNumber: () => 125000 } });

    const useCase = createUseCase();
    const result = await useCase.execute(validInput);

    expect(mockDeliveryRepository.create).toHaveBeenCalledTimes(1);

    const createdArg = mockDeliveryRepository.create.mock.calls[0][0];
    expect(createdArg.orderId).toBe('ORDER-TEST');
    expect(createdArg.estado).toBe('ASIGNADO');
    expect(createdArg.domiciliarioId).toBe('dom-1');
    expect(createdArg.direccion).toBe('Calle 123 #45-67');
    expect(createdArg.asignadoEn).toBeInstanceOf(Date);

    expect(result).toBe(createdDelivery);
  });

  it('should look up order total from prisma and publish DeliveryCreatedEvent with correct total', async () => {
    const createdDelivery = new Delivery({
      id: 'del-1',
      orderId: 'ORDER-TEST',
      estado: 'ASIGNADO',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      telefono: '3001234567',
      notas: null,
      asignadoEn: new Date(),
    });

    mockDeliveryRepository.create.mockResolvedValue(createdDelivery);
    mockPrisma.order.findFirst.mockResolvedValue({ total: 125000 });

    const eventBus = { publish: vi.fn(), subscribe: vi.fn() };
    const useCase = createUseCase(eventBus);
    await useCase.execute(validInput, 'req-123');

    expect(mockPrisma.order.findFirst).toHaveBeenCalledWith({
      where: { id: 'ORDER-TEST', deletedAt: null },
      select: { total: true },
    });

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.type).toBe('delivery.created');
    expect(publishedEvent.payload.deliveryId).toBe('del-1');
    expect(publishedEvent.payload.orderId).toBe('ORDER-TEST');
    expect(publishedEvent.payload.total).toBe(125000);
  });

  it('should default total to 0 when order is not found', async () => {
    const createdDelivery = new Delivery({
      id: 'del-1',
      orderId: 'ORDER-TEST',
      estado: 'ASIGNADO',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      telefono: '3001234567',
      notas: null,
      asignadoEn: new Date(),
    });

    mockDeliveryRepository.create.mockResolvedValue(createdDelivery);
    mockPrisma.order.findFirst.mockResolvedValue(null);

    const eventBus = { publish: vi.fn(), subscribe: vi.fn() };
    const useCase = createUseCase(eventBus);
    await useCase.execute(validInput);

    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.payload.total).toBe(0);
  });

  it('should default total to 0 when prisma order lookup throws', async () => {
    const createdDelivery = new Delivery({
      id: 'del-1',
      orderId: 'ORDER-TEST',
      estado: 'ASIGNADO',
      direccion: null,
      ciudad: null,
      telefono: null,
      notas: null,
      asignadoEn: new Date(),
    });

    mockDeliveryRepository.create.mockResolvedValue(createdDelivery);
    mockPrisma.order.findFirst.mockRejectedValue(new Error('DB connection lost'));

    const eventBus = { publish: vi.fn(), subscribe: vi.fn() };
    const useCase = createUseCase(eventBus);
    await useCase.execute({ orderId: 'ORDER-TEST' });

    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.payload.total).toBe(0);
  });

  it('should handle input with null domiciliarioId (optional)', async () => {
    const createdDelivery = new Delivery({
      id: 'del-2',
      orderId: 'ORDER-TEST-2',
      domiciliarioId: null,
      estado: 'PENDIENTE',
      direccion: null,
      ciudad: null,
      telefono: null,
      notas: null,
      asignadoEn: null,
    });

    mockDeliveryRepository.create.mockResolvedValue(createdDelivery);
    mockPrisma.order.findFirst.mockResolvedValue({ total: 5000 });

    const useCase = createUseCase();
    await useCase.execute({ orderId: 'ORDER-TEST-2' });

    const createdArg = mockDeliveryRepository.create.mock.calls[0][0];
    expect(createdArg.domiciliarioId).toBeNull();
    expect(createdArg.estado).toBe('PENDIENTE');
    expect(createdArg.asignadoEn).toBeNull();
  });

  it('should not publish event when eventBus is not provided', async () => {
    const createdDelivery = new Delivery({
      id: 'del-1',
      orderId: 'ORDER-TEST',
      estado: 'ASIGNADO',
      direccion: null,
      ciudad: null,
      telefono: null,
      notas: null,
      asignadoEn: new Date(),
    });

    mockDeliveryRepository.create.mockResolvedValue(createdDelivery);
    mockPrisma.order.findFirst.mockResolvedValue({ total: 100 });

    const useCase = createUseCase(undefined);
    const result = await useCase.execute({ orderId: 'ORDER-TEST' });

    expect(result).toBe(createdDelivery);
    expect(mockEventBus.publish).not.toHaveBeenCalled();
  });

  it('should pass requestId to the published event', async () => {
    const createdDelivery = new Delivery({
      id: 'del-1',
      orderId: 'ORDER-TEST',
      estado: 'ASIGNADO',
      direccion: null,
      ciudad: null,
      telefono: null,
      notas: null,
      asignadoEn: new Date(),
    });

    mockDeliveryRepository.create.mockResolvedValue(createdDelivery);
    mockPrisma.order.findFirst.mockResolvedValue({ total: 99999 });

    const eventBus = { publish: vi.fn(), subscribe: vi.fn() };
    const useCase = createUseCase(eventBus);
    await useCase.execute({ orderId: 'ORDER-TEST' }, 'request-xyz-789');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.requestId).toBe('request-xyz-789');
  });
});
