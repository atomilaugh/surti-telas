import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '@/config/app';
import { getAuthToken } from './helpers/auth';

describe('Orders Cancel and Status Integration', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = createApp();
    token = await getAuthToken(app);
  });

  it('should create a customer for order testing', async () => {
    const response = await request(app)
      .post('/api/v1/customers')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Cliente Cancel',
        apellidos: 'Test',
        telefono: '3001234567',
        nit: '987654321',
        estado: 'Activo',
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });

  it('should create an order and cancel it successfully', async () => {
    const createResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipoFlujo: 'PRODUCCION',
        itemsList: [
          { nombre: 'Producto Test', precio: 1000, cantidad: 2 },
        ],
        prioridad: 'Estándar',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    const orderId = createResponse.body.data.id;

    const cancelResponse = await request(app)
      .patch(`/api/v1/orders/${orderId}/cancel`)
      .set('Authorization', `Bearer ${token}`)
      .send({ motivoAnulacion: 'Cliente solicitó cancelar el pedido' });

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.success).toBe(true);
    expect(cancelResponse.body.data.estado).toBe('Cancelado');
    expect(cancelResponse.body.data.motivoAnulacion).toBe('Cliente solicitó cancelar el pedido');
  });

  it('should follow valid status transitions: Pendiente -> Aceptado -> Enviado -> Entregado', async () => {
    const createResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipoFlujo: 'PRODUCCION',
        itemsList: [
          { nombre: 'Producto Status', precio: 2000, cantidad: 1 },
        ],
        prioridad: 'Estándar',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    const orderId = createResponse.body.data.id;

    const pendienteToAceptado = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Aceptado' });
    expect(pendienteToAceptado.status).toBe(200);
    expect(pendienteToAceptado.body.data.estado).toBe('Aceptado');

    const aceptadoToEnviado = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Enviado' });
    expect(aceptadoToEnviado.status).toBe(200);
    expect(aceptadoToEnviado.body.data.estado).toBe('Enviado');

    const enviadoToEntregado = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Entregado' });
    expect(enviadoToEntregado.status).toBe(200);
    expect(enviadoToEntregado.body.data.estado).toBe('Entregado');
  });

  it('should reject invalid status transitions', async () => {
    const createResponse = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipoFlujo: 'PRODUCCION',
        itemsList: [
          { nombre: 'Producto Invalid', precio: 2000, cantidad: 1 },
        ],
        prioridad: 'Estándar',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    const orderId = createResponse.body.data.id;

    const invalid1 = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Entregado' });
    expect(invalid1.status).toBe(400);

    const pendienteToAceptado = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Aceptado' });
    expect(pendienteToAceptado.status).toBe(200);
    expect(pendienteToAceptado.body.data.estado).toBe('Aceptado');

    const invalid2 = await request(app)
      .patch(`/api/v1/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'Pendiente' });
    expect(invalid2.status).toBe(400);
  });
});
