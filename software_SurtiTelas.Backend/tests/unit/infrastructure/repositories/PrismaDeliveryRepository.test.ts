import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PrismaDeliveryRepository } from '@/modules/deliveries/infrastructure/repositories/PrismaDeliveryRepository';
import { NotFoundError } from '@/shared/domain/errors';

const mockPrisma = {
  delivery: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    count: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  domiciliario: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
} as any;

const repo = new PrismaDeliveryRepository(mockPrisma);

const makeRow = (overrides = {}) => ({
  id: 'del-1',
  orderId: 'order-1',
  domiciliarioId: 'dom-1',
  estado: 'ASIGNADO',
  direccion: 'Calle 123',
  ciudad: 'Bogotá',
  telefono: '3001234567',
  notas: 'Notas de prueba',
  motivo: null,
  asignadoEn: new Date('2026-09-17T10:00:00Z'),
  inicioRutaEn: null,
  entregadoEn: null,
  createdAt: new Date('2026-09-17T09:00:00Z'),
  updatedAt: new Date('2026-09-17T09:00:00Z'),
  order: {
    numero: 'PED-0001',
    clienteNombre: 'Cliente Test',
    direccion: 'Calle 123',
  },
  domiciliario: {
    nombre: 'Domiciliario Test',
    email: 'dom@test.com',
    telefono: '3009999999',
  },
  ...overrides,
});

describe('PrismaDeliveryRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return paginated deliveries with meta', async () => {
      mockPrisma.$transaction.mockResolvedValue([
        [makeRow()],
        1,
      ]);

      const result = await repo.list({ estado: 'ASIGNADO', page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.data[0].id).toBe('del-1');
      expect(result.data[0].orderId).toBe('order-1');
    });

    it('should default to page 1 and limit 50 when no pagination provided', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      const result = await repo.list();

      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
    });

    it('should apply estado filter in findMany query', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await repo.list({ estado: 'ENTREGADO' });

      expect(mockPrisma.delivery.findMany).toHaveBeenCalledTimes(1);
      const findManyCall = mockPrisma.delivery.findMany.mock.calls[0][0];
      expect(findManyCall.where.estado).toBe('ENTREGADO');
    });

    it('should apply soft delete filter (deletedAt: null) by default', async () => {
      mockPrisma.$transaction.mockResolvedValue([[], 0]);

      await repo.list();

      const findManyCall = mockPrisma.delivery.findMany.mock.calls[0][0];
      expect(findManyCall.where.deletedAt).toBeNull();
    });
  });

  describe('getById', () => {
    it('should return a Delivery when found', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(makeRow());

      const result = await repo.getById('del-1');

      expect(mockPrisma.delivery.findFirst).toHaveBeenCalledWith({
        where: { id: 'del-1', deletedAt: null },
        include: expect.any(Object),
      });
      expect(result).toBeDefined();
      expect(result!.id).toBe('del-1');
      expect(result!.orderId).toBe('order-1');
      expect(result!.estado).toBe('ASIGNADO');
    });

    it('should return null when delivery not found', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(null);

      const result = await repo.getById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a delivery with mapped fields', async () => {
      const row = makeRow();
      mockPrisma.delivery.create.mockResolvedValue(row);

      const result = await repo.create({
        orderId: 'order-1',
        domiciliarioId: 'dom-1',
        estado: 'ASIGNADO',
        direccion: 'Calle 123',
        ciudad: 'Bogotá',
        telefono: '3001234567',
        notas: 'Notas',
        motivo: null,
        asignadoEn: new Date('2026-09-17T10:00:00Z'),
      });

      expect(mockPrisma.delivery.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          domiciliarioId: 'dom-1',
          estado: 'ASIGNADO',
          direccion: 'Calle 123',
          ciudad: 'Bogotá',
          telefono: '3001234567',
          notas: 'Notas',
          motivo: '',
          asignadoEn: new Date('2026-09-17T10:00:00Z'),
        }),
        include: expect.any(Object),
      });
      expect(result.id).toBe('del-1');
    });

    it('should handle null optional fields with empty strings in create', async () => {
      const row = makeRow({
        direccion: '',
        ciudad: '',
        telefono: '',
        notas: '',
        motivo: '',
        domiciliarioId: null,
      });
      mockPrisma.delivery.create.mockResolvedValue(row);

      await repo.create({
        orderId: 'order-1',
        estado: 'ASIGNADO',
      });

      const createCall = mockPrisma.delivery.create.mock.calls[0][0];
      expect(createCall.data.direccion).toBe('');
      expect(createCall.data.ciudad).toBe('');
      expect(createCall.data.domiciliarioId).toBeUndefined();
    });
  });

  describe('update', () => {
    it('should update delivery and return mapped result', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(makeRow());
      mockPrisma.delivery.update.mockResolvedValue(
        makeRow({ estado: 'EN_RUTA', inicioRutaEn: new Date(), direccion: 'New address' }),
      );

      const result = await repo.update('del-1', {
        estado: 'EN_RUTA',
        direccion: 'New address',
      });

      expect(mockPrisma.delivery.findFirst).toHaveBeenCalledWith({
        where: { id: 'del-1', deletedAt: null },
      });
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: expect.objectContaining({
          estado: 'EN_RUTA',
          direccion: 'New address',
          updatedAt: expect.any(Date),
        }),
        include: expect.any(Object),
      });
      expect(result.estado).toBe('EN_RUTA');
    });

    it('should throw NotFoundError when delivery does not exist on update', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(null);

      await expect(repo.update('nonexistent', { notas: 'test' })).rejects.toThrow(NotFoundError);
      await expect(repo.update('nonexistent', { notas: 'test' })).rejects.toThrow('Entrega no encontrada');
      expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
    });

    it('should only include changed fields in update (selective update)', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(makeRow());
      mockPrisma.delivery.update.mockResolvedValue(makeRow());

      await repo.update('del-1', { motivo: ' Cliente no disponible' });

      const updateCall = mockPrisma.delivery.update.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty('motivo', ' Cliente no disponible');
      expect(updateCall.data).toHaveProperty('updatedAt');
      expect(updateCall.data).not.toHaveProperty('estado');
      expect(updateCall.data).not.toHaveProperty('direccion');
    });

    it('should omit domiciliarioId when passed undefined (selective update)', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(makeRow());
      mockPrisma.delivery.update.mockResolvedValue(makeRow({ domiciliarioId: null }));

      await repo.update('del-1', { domiciliarioId: undefined });

      const updateCall = mockPrisma.delivery.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('domiciliarioId');
    });
  });

  describe('delete', () => {
    it('should soft delete by setting deletedAt', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(makeRow());
      mockPrisma.delivery.update.mockResolvedValue({});

      await repo.delete('del-1');

      expect(mockPrisma.delivery.findFirst).toHaveBeenCalledWith({
        where: { id: 'del-1', deletedAt: null },
      });
      expect(mockPrisma.delivery.update).toHaveBeenCalledWith({
        where: { id: 'del-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundError when delivery does not exist on delete', async () => {
      mockPrisma.delivery.findFirst.mockResolvedValue(null);

      await expect(repo.delete('nonexistent')).rejects.toThrow(NotFoundError);
      expect(mockPrisma.delivery.update).not.toHaveBeenCalled();
    });
  });

  describe('listRutaDelDia', () => {
    it('should return DeliveryRutaItem array with order and domiciliario info', async () => {
      const rawRow = {
        id: 'del-1',
        orderId: 'order-1',
        estado: 'ASIGNADO',
        domiciliarioId: 'dom-1',
        direccion: 'Delivery direccion',
        ciudad: 'Bogotá',
        telefono: '3001234567',
        notas: null,
        motivo: null,
        asignadoEn: new Date('2026-09-17T10:00:00Z'),
        inicioRutaEn: null,
        entregadoEn: null,
          order: {
          numero: 'PED-0001',
          total: 125000,
          estado: 'DESPACHADO',
          cliente: {
            nombre: 'Cliente Test',
            telefono: '300client',
            ciudad: 'Client city',
            direccion: 'Client address',
          },
        },
        domiciliario: {
          nombre: 'Domiciliario Test',
          email: 'dom@test.com',
          telefono: '300dom',
        },
      };

      mockPrisma.delivery.findMany.mockResolvedValue([rawRow]);
      mockPrisma.domiciliario.findMany.mockResolvedValue([
        { userId: 'dom-1', zona: 'Zona Norte' },
      ]);

      const result = await repo.listRutaDelDia();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('del-1');
      expect(result[0].orderId).toBe('order-1');
      expect(result[0].domiciliarioNombre).toBe('Domiciliario Test');
      expect(result[0].domiciliarioZona).toBe('Zona Norte');
      expect(result[0].order!.cliente).toBe('Cliente Test');
      expect(result[0].order!.total).toBe(125000);
      expect(result[0].order!.numero).toBe('PED-0001');
    });

    it('should prefer customer address over delivery direccion', async () => {
      const rawRow = {
        id: 'del-1',
        orderId: 'order-1',
        estado: 'ASIGNADO',
        domiciliarioId: null,
        direccion: 'Delivery snapshot address',
        ciudad: 'Delivery city',
        telefono: '300delivery',
          order: {
          numero: 'PED-0001',
          total: 100000,
          estado: 'DESPACHADO',
          cliente: {
            nombre: 'Cliente Test',
            telefono: '300client',
            ciudad: 'Client city',
            direccion: 'Client address priority',
          },
        },
        domiciliario: null,
      };

      mockPrisma.delivery.findMany.mockResolvedValue([rawRow]);
      mockPrisma.domiciliario.findMany.mockResolvedValue([]);

      const result = await repo.listRutaDelDia();

      expect(result[0].direccion).toBe('Client address priority');
      expect(result[0].order!.direccion).toBe('Client address priority');
      expect(result[0].order!.telefono).toBe('300client');
    });

    it('should fallback to delivery fields when order has no cliente', async () => {
      const rawRow = {
        id: 'del-1',
        orderId: 'order-1',
        estado: 'ASIGNADO',
        domiciliarioId: null,
        direccion: 'Delivery fallback address',
        ciudad: 'Delivery fallback city',
        telefono: '300fallback',
          order: {
          numero: 'PED-0001',
          total: 50000,
          estado: 'DESPACHADO',
          cliente: null,
        },
        domiciliario: null,
      };

      mockPrisma.delivery.findMany.mockResolvedValue([rawRow]);
      mockPrisma.domiciliario.findMany.mockResolvedValue([]);

      const result = await repo.listRutaDelDia();

      expect(result[0].direccion).toBe('Delivery fallback address');
      expect(result[0].order!.cliente).toBe(null);
      expect(result[0].order!.direccion).toBe('Delivery fallback address');
    });

    it('should apply domiciliarioId filter with OR clause', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.domiciliario.findMany.mockResolvedValue([]);

      await repo.listRutaDelDia({ domiciliarioId: 'dom-1' });

      const findCall = mockPrisma.delivery.findMany.mock.calls[0][0];
      expect(findCall.where.OR).toBeDefined();
      expect(findCall.where.OR).toContainEqual({ domiciliarioId: 'dom-1' });
    });

    it('should apply estado filter when provided', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.domiciliario.findMany.mockResolvedValue([]);

      await repo.listRutaDelDia({ estado: 'ENTREGADO' });

      const findCall = mockPrisma.delivery.findMany.mock.calls[0][0];
      expect(findCall.where.estado).toBe('ENTREGADO');
    });

    it('should use default estados when no estado filter provided', async () => {
      mockPrisma.delivery.findMany.mockResolvedValue([]);
      mockPrisma.domiciliario.findMany.mockResolvedValue([]);

      await repo.listRutaDelDia();

      const findCall = mockPrisma.delivery.findMany.mock.calls[0][0];
      expect(findCall.where.estado).toEqual({
        in: ['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'FALLIDO'],
      });
    });

    it('should map null total to null in order', async () => {
      const rawRow = {
        id: 'del-1',
        orderId: 'order-1',
        estado: 'ASIGNADO',
        domiciliarioId: null,
        direccion: null,
        ciudad: null,
        telefono: null,
        order: {
          numero: null,
          total: null,
          estado: 'DESPACHADO',
          cliente: null,
        },
        domiciliario: null,
      };

      mockPrisma.delivery.findMany.mockResolvedValue([rawRow]);
      mockPrisma.domiciliario.findMany.mockResolvedValue([]);

      const result = await repo.listRutaDelDia();
      expect(result).toHaveLength(1);
      expect(result[0].order!.total).toBeNull();
    });
  });
});
