import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '@/config/app';
import { getAuthToken } from './helpers/auth';

describe('Orders Status Transitions Integration', () => {
  let app: Express;
  let token: string;
  let createdOrderId: string;

  beforeAll(async () => {
    app = createApp();
    token = await getAuthToken(app);
  });

  it('should create a customer for order testing', async () => {
    const response = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Cliente Integración',
        apellidos: 'Test',
        telefono: '3001234567',
        nit: '123456789',
        estado: 'Activo',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should create an order', async () => {
    const response = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipoFlujo: 'PRODUCCION',
        itemsList: [
          { nombre: 'Producto Test', precio: 1000, cantidad: 2 },
        ],
        prioridad: 'Estándar',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.id).toBeDefined();
    createdOrderId = response.body.data.id;
  });

  it('should transition from Pendiente to Aceptado', async () => {
    const response = await request(app)
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Aceptado' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.estado).toBe('Aceptado');
  });

  it('should transition from Aceptado to Enviado', async () => {
    const response = await request(app)
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Enviado' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.estado).toBe('Enviado');
  });

  it('should transition from Enviado to Entregado', async () => {
    const response = await request(app)
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Entregado' });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.estado).toBe('Entregado');
  });

  it('should reject invalid transition from Entregado to Pendiente', async () => {
    const response = await request(app)
      .patch(`/api/v1/orders/${createdOrderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Pendiente' });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });

  it('should get order by id and verify final state', async () => {
    const response = await request(app)
      .get(`/api/v1/orders/${createdOrderId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.estado).toBe('Entregado');
  });
});
