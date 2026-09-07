import { describe, it, expect } from 'vitest';
import { Order, type OrderStatus } from '@/modules/orders/domain/entities/Order';

describe('Order entity', () => {
  const makeOrder = (overrides = {}): Order => {
    const base = {
      id: 'order-1',
      numero: 'PED-000001',
      cliente: 'Juan',
      asesor: 'Asesor',
      fecha: new Date().toISOString(),
      items: 2,
      total: 50000,
      estado: 'Nuevo' as OrderStatus,
      itemsList: [
        { nombre: 'Camiseta', precio: 25000, cantidad: 2 },
      ],
    };
    return new Order({ ...base, ...overrides });
  };

  describe('validation', () => {
    it('should create valid order', () => {
      const order = makeOrder();
      expect(order.id).toBe('order-1');
      expect(order.estado).toBe('Nuevo');
    });

    it('should throw when id is empty', () => {
      expect(() => makeOrder({ id: '' })).toThrow('identificador');
    });

    it('should throw when cliente is empty', () => {
      expect(() => makeOrder({ cliente: '' })).toThrow('cliente');
    });

    it('should throw when asesor is empty', () => {
      expect(() => makeOrder({ asesor: '' })).toThrow('asesor');
    });

    it('should throw when total is negative', () => {
      expect(() => makeOrder({ total: -1 })).toThrow('total');
    });

    it('should throw when items count does not match itemsList', () => {
      expect(() => makeOrder({ items: 3, itemsList: [{ nombre: 'A', precio: 1000, cantidad: 1 }] })).toThrow('items');
    });

    it('should throw when itemsList has invalid items', () => {
      expect(() => makeOrder({
        items: 1,
        itemsList: [{ nombre: '', precio: -1, cantidad: 0 }],
      })).toThrow('items');
    });
  });

  describe('canTransitionTo', () => {
    it('should allow Pendiente -> Aceptado', () => {
      const order = makeOrder({ estado: 'Pendiente' });
      expect(order.canTransitionTo('Aceptado')).toBe(true);
    });

    it('should allow Pendiente -> Rechazado', () => {
      const order = makeOrder({ estado: 'Pendiente' });
      expect(order.canTransitionTo('Rechazado')).toBe(true);
    });

    it('should reject Pendiente -> Cancelado', () => {
      const order = makeOrder({ estado: 'Pendiente' });
      expect(order.canTransitionTo('Cancelado')).toBe(false);
    });

    it('should reject Pendiente -> Entregado', () => {
      const order = makeOrder({ estado: 'Pendiente' });
      expect(order.canTransitionTo('Entregado')).toBe(false);
    });

    it('should allow Aceptado -> Enviado', () => {
      const order = makeOrder({ estado: 'Aceptado' });
      expect(order.canTransitionTo('Enviado')).toBe(true);
    });

    it('should NOT allow Aceptado -> Rechazado', () => {
      const order = makeOrder({ estado: 'Aceptado' });
      expect(order.canTransitionTo('Rechazado')).toBe(false);
    });

    it('should NOT allow Aceptado -> Cancelado', () => {
      const order = makeOrder({ estado: 'Aceptado' });
      expect(order.canTransitionTo('Cancelado')).toBe(false);
    });

    it('should allow Enviado -> Entregado', () => {
      const order = makeOrder({ estado: 'Enviado' });
      expect(order.canTransitionTo('Entregado')).toBe(true);
    });

    it('should NOT allow Enviado -> Cancelado', () => {
      const order = makeOrder({ estado: 'Enviado' });
      expect(order.canTransitionTo('Cancelado')).toBe(false);
    });

    it('should reject Enviado -> Pendiente', () => {
      const order = makeOrder({ estado: 'Enviado' });
      expect(order.canTransitionTo('Pendiente')).toBe(false);
    });

    it('should allow same status transition', () => {
      const order = makeOrder({ estado: 'Pendiente' });
      expect(order.canTransitionTo('Pendiente')).toBe(true);
    });

    it('should not allow transitions from Entregado', () => {
      const order = makeOrder({ estado: 'Entregado' });
      expect(order.canTransitionTo('Pendiente')).toBe(false);
      expect(order.canTransitionTo('Enviado')).toBe(false);
      expect(order.canTransitionTo('Cancelado')).toBe(false);
    });

    it('should not allow transitions from Cancelado', () => {
      const order = makeOrder({ estado: 'Cancelado' });
      expect(order.canTransitionTo('Pendiente')).toBe(false);
      expect(order.canTransitionTo('Enviado')).toBe(false);
      expect(order.canTransitionTo('Entregado')).toBe(false);
    });

    it('should allow transitions from flow state Aceptado only to Enviado', () => {
      const order = makeOrder({ estado: 'Aceptado' });
      expect(order.canTransitionTo('Enviado')).toBe(true);
      expect(order.canTransitionTo('Cancelado')).toBe(false);
      expect(order.canTransitionTo('Entregado')).toBe(false);
    });

    it('should not allow transitions from non-flow states like Listo', () => {
      const order = makeOrder({ estado: 'Listo' });
      expect(order.canTransitionTo('Enviado')).toBe(false);
      expect(order.canTransitionTo('Cancelado')).toBe(false);
      expect(order.canTransitionTo('Entregado')).toBe(false);
    });

    it('should not allow transitions from non-flow states like Rechazado', () => {
      const order = makeOrder({ estado: 'Rechazado' });
      expect(order.canTransitionTo('Pendiente')).toBe(false);
      expect(order.canTransitionTo('Enviado')).toBe(false);
      expect(order.canTransitionTo('Cancelado')).toBe(false);
    });
  });

  describe('withStatus', () => {
    it('should create new order with updated status', () => {
      const order = makeOrder({ estado: 'Nuevo' });
      const updated = order.withStatus('En producción');
      expect(updated.estado).toBe('En producción');
      expect(updated.id).toBe(order.id);
    });

    it('should use provided updatedAt', () => {
      const order = makeOrder({ estado: 'Nuevo' });
      const fixedDate = '2024-01-01T00:00:00.000Z';
      const updated = order.withStatus('En producción', fixedDate);
      expect(updated.updatedAt).toBe(fixedDate);
    });
  });

  describe('getItemsCount', () => {
    it('should return items count', () => {
      const order = makeOrder({ items: 2, itemsList: [{ nombre: 'A', precio: 1000, cantidad: 2 }] });
      expect(order.getItemsCount()).toBe(2);
    });
  });
});
