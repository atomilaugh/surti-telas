import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ListDeliveries,
  GetDelivery,
  UpdateDelivery,
  ChangeDeliveryStatus,
  DeleteDelivery,
} from '@/modules/deliveries/application/use-cases/DeliveryUseCases';
import { Delivery } from '@/modules/deliveries/domain/entities/Delivery';
import type { DeliveryRepository } from '@/modules/deliveries/domain/repositories/DeliveryRepository';
import type { EventBus, DomainEvent } from '@/shared/application/EventBus';
import { NotFoundError, BadRequestError } from '@/shared/domain/errors';

const mockDeliveryRepository = {
  list: vi.fn(),
  listRutaDelDia: vi.fn(),
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mockOrderRepo = {
  updateStatus: vi.fn(),
};

const createMockEventBus = (): EventBus => ({
  publish: vi.fn(),
  subscribe: vi.fn(),
});

const makeDelivery = (overrides: Partial<Delivery> = {}): Delivery => {
  return new Delivery({
    id: 'del-1',
    orderId: 'ORDER-TEST',
    domiciliarioId: 'dom-1',
    estado: 'ASIGNADO',
    direccion: 'Calle 123 #45-67',
    ciudad: 'Bogotá',
    telefono: '3001234567',
    notas: null,
    motivo: null,
    asignadoEn: new Date('2026-09-17T10:00:00Z'),
    inicioRutaEn: null,
    entregadoEn: null,
    createdAt: new Date('2026-09-17T09:00:00Z'),
    updatedAt: new Date('2026-09-17T09:00:00Z'),
    orderNumero: 'PED-0001',
    clienteNombre: 'Cliente Test',
    domiciliarioNombre: 'Domiciliario Test',
    ...overrides,
  });
};

describe('ListDeliveries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delegate to repo.list with filters', async () => {
    const expectedResult = {
      data: [makeDelivery().toDTO()],
      meta: { total: 1, page: 1, limit: 10 },
    };
    mockDeliveryRepository.list.mockResolvedValue(expectedResult);

    const useCase = new ListDeliveries(mockDeliveryRepository as unknown as DeliveryRepository);
    const result = await useCase.execute({ estado: 'ASIGNADO', page: 1, limit: 10 });

    expect(mockDeliveryRepository.list).toHaveBeenCalledWith({ estado: 'ASIGNADO', page: 1, limit: 10 });
    expect(result.data).toHaveLength(1);
    expect(result.meta.total).toBe(1);
  });

  it('should call repo.list with undefined when no filters provided', async () => {
    mockDeliveryRepository.list.mockResolvedValue({ data: [], meta: { total: 0, page: 1, limit: 50 } });

    const useCase = new ListDeliveries(mockDeliveryRepository as unknown as DeliveryRepository);
    await useCase.execute();

    expect(mockDeliveryRepository.list).toHaveBeenCalledWith(undefined);
  });
});

describe('GetDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return delivery when found', async () => {
    const delivery = makeDelivery();
    mockDeliveryRepository.getById.mockResolvedValue(delivery);

    const useCase = new GetDelivery(mockDeliveryRepository as unknown as DeliveryRepository);
    const result = await useCase.execute('del-1');

    expect(mockDeliveryRepository.getById).toHaveBeenCalledWith('del-1');
    expect(result.id).toBe('del-1');
    expect(result.orderId).toBe('ORDER-TEST');
  });

  it('should throw NotFoundError when delivery not found', async () => {
    mockDeliveryRepository.getById.mockResolvedValue(null);

    const useCase = new GetDelivery(mockDeliveryRepository as unknown as DeliveryRepository);

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('nonexistent')).rejects.toThrow('Entrega no encontrada');
  });
});

describe('UpdateDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update delivery and publish DeliveryUpdatedEvent', async () => {
    const existing = makeDelivery();
    const updated = makeDelivery({ domiciliarioId: 'dom-2', notas: 'Updated notes' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.update.mockResolvedValue(updated);

    const eventBus = createMockEventBus();
    const useCase = new UpdateDelivery(
      mockDeliveryRepository as unknown as DeliveryRepository,
      eventBus,
    );

    const changes = { domiciliarioId: 'dom-2', notas: 'Updated notes' };
    const result = await useCase.execute('del-1', changes, 'req-abc');

    expect(mockDeliveryRepository.getById).toHaveBeenCalledWith('del-1');
    expect(mockDeliveryRepository.update).toHaveBeenCalledWith('del-1', {
      domiciliarioId: 'dom-2',
      notas: 'Updated notes',
    });
    expect(result.domiciliarioId).toBe('dom-2');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.type).toBe('delivery.updated');
    expect(publishedEvent.payload.deliveryId).toBe('del-1');
    expect(publishedEvent.payload.orderId).toBe('ORDER-TEST');
    expect(publishedEvent.payload.cambios).toEqual(changes);
    expect((eventBus.publish as any).mock.calls[0][0].requestId).toBe('req-abc');
  });

  it('should throw NotFoundError when delivery does not exist', async () => {
    mockDeliveryRepository.getById.mockResolvedValue(null);

    const eventBus = createMockEventBus();
    const useCase = new UpdateDelivery(
      mockDeliveryRepository as unknown as DeliveryRepository,
      eventBus,
    );

    await expect(useCase.execute('nonexistent', { notas: 'test' })).rejects.toThrow(NotFoundError);
    expect(mockDeliveryRepository.update).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should not publish event when eventBus is not provided', async () => {
    const existing = makeDelivery();
    const updated = makeDelivery({ notas: 'New notas' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.update.mockResolvedValue(updated);

    const useCase = new UpdateDelivery(mockDeliveryRepository as unknown as DeliveryRepository);
    await useCase.execute('del-1', { notas: 'New notas' });

    expect(mockDeliveryRepository.update).toHaveBeenCalled();
  });
});

describe('ChangeDeliveryStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const getUseCase = (withOrderRepo = false, withEventBus = false) =>
    new ChangeDeliveryStatus(
      mockDeliveryRepository as unknown as DeliveryRepository,
      withOrderRepo ? mockOrderRepo as any : undefined,
      withEventBus ? createMockEventBus() : undefined,
    );

  it('should transition ASIGNADO → EN_RUTA and publish event', async () => {
    const existing = makeDelivery({ estado: 'ASIGNADO' });
    const updated = makeDelivery({ estado: 'EN_RUTA', inicioRutaEn: new Date() });
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.update.mockResolvedValue(updated);

    const eventBus = createMockEventBus();
    const useCase = new ChangeDeliveryStatus(
      mockDeliveryRepository as unknown as DeliveryRepository,
      undefined,
      eventBus,
    );

    const result = await useCase.execute('del-1', 'EN_RUTA', 'DOMICILIARIO');

    expect(mockDeliveryRepository.update).toHaveBeenCalledWith(
      'del-1',
      expect.objectContaining({
        estado: 'EN_RUTA',
        entregadoEn: updated.entregadoEn,
        inicioRutaEn: expect.any(Date),
        motivo: updated.motivo,
      }),
    );
    expect(result.estado).toBe('EN_RUTA');

    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.type).toBe('delivery.status.updated');
    expect(publishedEvent.payload.previousStatus).toBe('ASIGNADO');
    expect(publishedEvent.payload.newStatus).toBe('EN_RUTA');
  });

  it('should transition ASIGNADO → FALLIDO', async () => {
    const existing = makeDelivery({ estado: 'ASIGNADO' });
    const updated = makeDelivery({ estado: 'FALLIDO', motivo: 'No hay nadie en casa' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.update.mockResolvedValue(updated);

    const useCase = getUseCase();
    const result = await useCase.execute('del-1', 'FALLIDO', 'DOMICILIARIO', undefined, 'No hay nadie en casa');

    expect(result.estado).toBe('FALLIDO');
    const updatedArg = mockDeliveryRepository.update.mock.calls[0][1];
    expect(updatedArg.motivo).toBe('No hay nadie en casa');
  });

  it('should transition EN_RUTA → ENTREGADO and call orderRepo.updateStatus', async () => {
    const existing = makeDelivery({ estado: 'EN_RUTA' });
    const updated = makeDelivery({ estado: 'ENTREGADO', entregadoEn: new Date() });
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.update.mockResolvedValue(updated);
    mockOrderRepo.updateStatus.mockResolvedValue({});

    const eventBus = createMockEventBus();
    const useCase = new ChangeDeliveryStatus(
      mockDeliveryRepository as unknown as DeliveryRepository,
      mockOrderRepo as any,
      eventBus,
    );

    const result = await useCase.execute('del-1', 'ENTREGADO', 'DOMICILIARIO');

    expect(mockOrderRepo.updateStatus).toHaveBeenCalledWith('ORDER-TEST', 'Entregado');
    expect(result.estado).toBe('ENTREGADO');

    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.payload.newStatus).toBe('ENTREGADO');
  });

  it('should throw BadRequestError for invalid transition (ENTREGADO → EN_RUTA)', async () => {
    const existing = makeDelivery({ estado: 'ENTREGADO' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);

    const useCase = getUseCase();
    await expect(useCase.execute('del-1', 'EN_RUTA')).rejects.toThrow(BadRequestError);
    await expect(useCase.execute('del-1', 'EN_RUTA')).rejects.toThrow('Transición de estado no permitida');
  });

  it('should throw BadRequestError for invalid transition (FALLIDO → ENTREGADO)', async () => {
    const existing = makeDelivery({ estado: 'FALLIDO' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);

    const useCase = getUseCase();
    await expect(useCase.execute('del-1', 'ENTREGADO')).rejects.toThrow('Transición de estado no permitida');
  });

  it('should throw NotFoundError when delivery does not exist', async () => {
    mockDeliveryRepository.getById.mockResolvedValue(null);
    const useCase = getUseCase(true, true);
    await expect(useCase.execute('nonexistent', 'EN_RUTA')).rejects.toThrow(NotFoundError);
  });

  it('should not allow non-DOMICILIARIO role to mark ENTREGADO (includes ADMIN)', async () => {
    const existing = makeDelivery({ estado: 'EN_RUTA' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);

    const useCase = getUseCase();
    await expect(useCase.execute('del-1', 'ENTREGADO', 'ADMIN')).rejects.toThrow(BadRequestError);
    await expect(useCase.execute('del-1', 'ENTREGADO', 'ADMIN')).rejects.toThrow('Solo el domiciliario puede marcar ENTREGADO o FALLIDO');
  });

  it('should not allow non-DOMICILIARIO role to mark FALLIDO', async () => {
    const existing = makeDelivery({ estado: 'ASIGNADO' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);

    const useCase = getUseCase();
    await expect(useCase.execute('del-1', 'FALLIDO', 'ASESOR')).rejects.toThrow(BadRequestError);
    await expect(useCase.execute('del-1', 'FALLIDO', 'ASESOR')).rejects.toThrow('Solo el domiciliario puede marcar ENTREGADO o FALLIDO');
  });

  it('should allow ADMIN to mark EN_RUTA (only ENTREGADO/FALLIDO are restricted)', async () => {
    const existing = makeDelivery({ estado: 'ASIGNADO' });
    const updated = makeDelivery({ estado: 'EN_RUTA', inicioRutaEn: new Date() });
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.update.mockResolvedValue(updated);

    const useCase = getUseCase();
    const result = await useCase.execute('del-1', 'EN_RUTA', 'ADMIN');

    expect(result.estado).toBe('EN_RUTA');
  });

  it('should throw BadRequestError when transitioning to the same state (ASIGNADO → ASIGNADO)', async () => {
    const existing = makeDelivery({ estado: 'ASIGNADO' });
    mockDeliveryRepository.getById.mockResolvedValue(existing);

    const eventBus = createMockEventBus();
    const useCase = new ChangeDeliveryStatus(
      mockDeliveryRepository as unknown as DeliveryRepository,
      undefined,
      eventBus,
    );

    await expect(useCase.execute('del-1', 'ASIGNADO', 'DOMICILIARIO')).rejects.toThrow(BadRequestError);
    expect(mockDeliveryRepository.update).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should rethrow orderRepo error when marking ENTREGADO', async () => {
    const existing = makeDelivery({ estado: 'EN_RUTA' });
    const updated = makeDelivery({ estado: 'ENTREGADO', entregadoEn: new Date() });
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.update.mockResolvedValue(updated);
    mockOrderRepo.updateStatus.mockRejectedValue(new Error('Order update failed'));

    const useCase = getUseCase(true);
    await expect(useCase.execute('del-1', 'ENTREGADO', 'DOMICILIARIO')).rejects.toThrow('Order update failed');
  });
});

describe('DeleteDelivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete delivery and publish DeliveryCompletedEvent', async () => {
    const existing = makeDelivery();
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.delete.mockResolvedValue(undefined);

    const eventBus = createMockEventBus();
    const useCase = new DeleteDelivery(
      mockDeliveryRepository as unknown as DeliveryRepository,
      eventBus,
    );

    await useCase.execute('del-1', 'req-delete-456');

    expect(mockDeliveryRepository.getById).toHaveBeenCalledWith('del-1');
    expect(mockDeliveryRepository.delete).toHaveBeenCalledWith('del-1');

    expect(eventBus.publish).toHaveBeenCalledTimes(1);
    const publishedEvent = (eventBus.publish as any).mock.calls[0][0] as DomainEvent;
    expect(publishedEvent.type).toBe('delivery.completed');
    expect(publishedEvent.payload.deliveryId).toBe('del-1');
    expect(publishedEvent.payload.orderId).toBe('ORDER-TEST');
    expect(publishedEvent.payload.orderNumero).toBe('ORDER-TEST');
    expect((eventBus.publish as any).mock.calls[0][0].requestId).toBe('req-delete-456');
  });

  it('should throw NotFoundError when delivery does not exist', async () => {
    mockDeliveryRepository.getById.mockResolvedValue(null);

    const eventBus = createMockEventBus();
    const useCase = new DeleteDelivery(
      mockDeliveryRepository as unknown as DeliveryRepository,
      eventBus,
    );

    await expect(useCase.execute('nonexistent')).rejects.toThrow(NotFoundError);
    expect(mockDeliveryRepository.delete).not.toHaveBeenCalled();
    expect(eventBus.publish).not.toHaveBeenCalled();
  });

  it('should not publish event when eventBus is not provided', async () => {
    const existing = makeDelivery();
    mockDeliveryRepository.getById.mockResolvedValue(existing);
    mockDeliveryRepository.delete.mockResolvedValue(undefined);

    const useCase = new DeleteDelivery(mockDeliveryRepository as unknown as DeliveryRepository);
    await expect(useCase.execute('del-1')).resolves.not.toThrow();
    expect(mockDeliveryRepository.delete).toHaveBeenCalledWith('del-1');
  });
});
