import { describe, it, expect } from 'vitest';
import { Order, OrderStatus } from '@/modules/orders/domain/entities/Order';

describe('Order', () => {
  const createOrder = (estado: OrderStatus = 'Nuevo') =>
    new Order({
      id: '1',
      numero: 'PED-000001',
      cliente: 'Juan Pérez',
      asesor: 'Asesor Test',
      fecha: new Date().toISOString(),
      total: 50000,
      items: 2,
      estado,
      prioridad: 'Estándar',
      itemsList: [
        { productId: '1', nombre: 'Camiseta', precio: 25000, cantidad: 2 },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

  it('should create a valid order', () => {
    const order = createOrder();
    expect(order.numero).toBe('PED-000001');
    expect(order.estado).toBe('Nuevo');
    expect(order.total).toBe(50000);
  });

  it('should validate order', () => {
    expect(() => {
      new Order({
        id: '1',
        numero: 'PED-000001',
        cliente: '',
        asesor: 'Test',
        fecha: new Date().toISOString(),
        total: 50000,
        items: 2,
        estado: 'Nuevo',
        prioridad: 'Estándar',
        itemsList: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }).toThrow();
  });

  it('should transition from Pendiente to Aceptado', () => {
    const order = createOrder('Pendiente');
    const updated = order.withStatus('Aceptado');
    expect(updated.estado).toBe('Aceptado');
  });

  it('should not allow invalid transition', () => {
    const order = createOrder('Pendiente');
    expect(order.canTransitionTo('Entregado')).toBe(false);
    expect(order.canTransitionTo('Aceptado')).toBe(true);
  });

  it('should return true for valid transition', () => {
    const order = createOrder('Pendiente');
    expect(order.canTransitionTo('Aceptado')).toBe(true);
    expect(order.canTransitionTo('Enviado')).toBe(false);
  });
});
