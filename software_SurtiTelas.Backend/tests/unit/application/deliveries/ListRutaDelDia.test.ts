import { describe, it, expect, vi } from 'vitest';
import { ListRutaDelDia } from '@/modules/deliveries/application/use-cases/DeliveryUseCases';

const mockListRutaDelDia = vi.fn();
const mockDeliveryRepository = {
  list: vi.fn(),
  listRutaDelDia: mockListRutaDelDia,
  getById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe('ListRutaDelDia', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return customer address in order.direccion when customer has address', async () => {
    const expectedResult = [
      {
        id: 'del-1',
        orderId: 'order-1',
        estado: 'ASIGNADO',
        direccion: 'Calle 123 #45-67',
        order: { direccion: 'Calle 123 #45-67' },
      },
    ];
    mockListRutaDelDia.mockResolvedValue(expectedResult);

    const useCase = new ListRutaDelDia(mockDeliveryRepository as any);
    const result = await useCase.execute();

    expect(mockListRutaDelDia).toHaveBeenCalledWith(undefined);
    expect(result).toHaveLength(1);
    expect(result[0].order?.direccion).toBe('Calle 123 #45-67');
    expect(result[0].direccion).toBe('Calle 123 #45-67');
  });

  it('should fallback to delivery.direccion when customer has no address', async () => {
    const expectedResult = [
      {
        id: 'del-1',
        orderId: 'order-1',
        estado: 'ASIGNADO',
        direccion: 'Delivery snapshot',
        order: { direccion: 'Delivery snapshot' },
      },
    ];
    mockListRutaDelDia.mockResolvedValue(expectedResult);

    const useCase = new ListRutaDelDia(mockDeliveryRepository as any);
    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].order?.direccion).toBe('Delivery snapshot');
    expect(result[0].direccion).toBe('Delivery snapshot');
  });

  it('should return null for direccion when both customer and delivery have no address', async () => {
    const expectedResult = [
      {
        id: 'del-1',
        orderId: 'order-1',
        estado: 'ASIGNADO',
        direccion: null,
        order: { direccion: null },
      },
    ];
    mockListRutaDelDia.mockResolvedValue(expectedResult);

    const useCase = new ListRutaDelDia(mockDeliveryRepository as any);
    const result = await useCase.execute();

    expect(result).toHaveLength(1);
    expect(result[0].order?.direccion).toBeNull();
    expect(result[0].direccion).toBeNull();
  });
});
