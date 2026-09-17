import { describe, it, expect } from 'vitest';
import { Delivery, DeliveryEstado } from '@/modules/deliveries/domain/entities/Delivery';

describe('Delivery Entity', () => {
  const makeDelivery = (overrides: Partial<Delivery> = {}) => {
    return new Delivery({
      id: 'del-1',
      orderId: 'ORDER-TEST',
      domiciliarioId: 'dom-1',
      estado: 'ASIGNADO',
      direccion: 'Calle 123 #45-67',
      ciudad: 'Bogotá',
      telefono: '3001234567',
      notas: 'Cerca del parque',
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

  describe('Constructor', () => {
    it('should create a delivery with all fields set correctly', () => {
      const delivery = makeDelivery();
      expect(delivery.id).toBe('del-1');
      expect(delivery.orderId).toBe('ORDER-TEST');
      expect(delivery.domiciliarioId).toBe('dom-1');
      expect(delivery.estado).toBe('ASIGNADO');
      expect(delivery.direccion).toBe('Calle 123 #45-67');
      expect(delivery.ciudad).toBe('Bogotá');
      expect(delivery.telefono).toBe('3001234567');
      expect(delivery.notas).toBe('Cerca del parque');
      expect(delivery.asignadoEn).toEqual(new Date('2026-09-17T10:00:00Z'));
    });

    it('should normalize null values for optional fields', () => {
      const delivery = new Delivery({
        orderId: 'ORDER-TEST',
        estado: 'ASIGNADO',
      });

      expect(delivery.domiciliarioId).toBeNull();
      expect(delivery.direccion).toBeNull();
      expect(delivery.ciudad).toBeNull();
      expect(delivery.telefono).toBeNull();
      expect(delivery.notas).toBeNull();
      expect(delivery.motivo).toBeNull();
      expect(delivery.asignadoEn).toBeNull();
      expect(delivery.inicioRutaEn).toBeNull();
      expect(delivery.entregadoEn).toBeNull();
    });
  });

  describe('State transition methods', () => {
    it('asignar() should set estado to ASIGNADO and set asignadoEn timestamp', () => {
      const delivery = makeDelivery({ estado: 'EN_RUTA' });
      delivery.asignar();
      expect(delivery.estado).toBe('ASIGNADO');
      expect(delivery.asignadoEn).toBeInstanceOf(Date);
    });

    it('marcarEnRuta() should set estado to EN_RUTA and set inicioRutaEn', () => {
      const delivery = makeDelivery({ estado: 'ASIGNADO' });
      delivery.marcarEnRuta();
      expect(delivery.estado).toBe('EN_RUTA');
      expect(delivery.inicioRutaEn).toBeInstanceOf(Date);
    });

    it('marcarEntregado() should set estado to ENTREGADO and set entregadoEn', () => {
      const delivery = makeDelivery({ estado: 'EN_RUTA' });
      delivery.marcarEntregado();
      expect(delivery.estado).toBe('ENTREGADO');
      expect(delivery.entregadoEn).toBeInstanceOf(Date);
    });

    it('marcarFallido() should set estado to FALLIDO', () => {
      const delivery = makeDelivery({ estado: 'ASIGNADO' });
      delivery.marcarFallido();
      expect(delivery.estado).toBe('FALLIDO');
    });

    it('marcarFallido() should NOT set entregadoEn (only estado changes)', () => {
      const delivery = makeDelivery({ estado: 'EN_RUTA' });
      delivery.marcarFallido();
      expect(delivery.estado).toBe('FALLIDO');
      expect(delivery.entregadoEn).toBeNull();
    });
  });

  describe('DeliveryEstado type', () => {
    it('should accept all valid estado values', () => {
      const validEstados: DeliveryEstado[] = ['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'FALLIDO'];
      validEstados.forEach((estado) => {
        const delivery = new Delivery({ orderId: 'ORDER-TEST', estado });
        expect(delivery.estado).toBe(estado);
      });
    });
  });

  describe('toDTO()', () => {
    it('should return all fields correctly mapped', () => {
      const delivery = makeDelivery();
      const dto = delivery.toDTO();

      expect(dto.id).toBe('del-1');
      expect(dto.orderId).toBe('ORDER-TEST');
      expect(dto.domiciliarioId).toBe('dom-1');
      expect(dto.estado).toBe('ASIGNADO');
      expect(dto.direccion).toBe('Calle 123 #45-67');
      expect(dto.ciudad).toBe('Bogotá');
      expect(dto.telefono).toBe('3001234567');
      expect(dto.notas).toBe('Cerca del parque');
      expect(dto.orderNumero).toBe('PED-0001');
      expect(dto.clienteNombre).toBe('Cliente Test');
      expect(dto.domiciliarioNombre).toBe('Domiciliario Test');
    });

    it('should include all timestamp fields in DTO', () => {
      const delivery = makeDelivery();
      const dto = delivery.toDTO();

      expect(dto.asignadoEn).toEqual(new Date('2026-09-17T10:00:00Z'));
      expect(dto.inicioRutaEn).toBeNull();
      expect(dto.entregadoEn).toBeNull();
      expect(dto.createdAt).toEqual(new Date('2026-09-17T09:00:00Z'));
      expect(dto.updatedAt).toEqual(new Date('2026-09-17T09:00:00Z'));
    });

    it('should reflect state changes in DTO after transitions', () => {
      const delivery = makeDelivery({ estado: 'ASIGNADO', inicioRutaEn: null });
      delivery.marcarEnRuta();
      delivery.marcarEntregado();
      const dto = delivery.toDTO();

      expect(dto.estado).toBe('ENTREGADO');
      expect(dto.entregadoEn).toBeInstanceOf(Date);
      expect(dto.inicioRutaEn).toBeInstanceOf(Date);
    });
  });

  describe('Reassign flow (asignar → marcarEnRuta → marcarFallido)', () => {
    it('should support full reassignment lifecycle', () => {
      const delivery = makeDelivery({ estado: 'ENTREGADO', entregadoEn: new Date() });

      delivery.asignar();
      expect(delivery.estado).toBe('ASIGNADO');

      delivery.marcarEnRuta();
      expect(delivery.estado).toBe('EN_RUTA');

      delivery.marcarFallido();
      expect(delivery.estado).toBe('FALLIDO');
    });
  });
});
