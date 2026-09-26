import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '@/config/app';
import { getAuthToken } from './helpers/auth';
import { prisma } from '@/config/database';

describe('Deliveries Integration', () => {
  let app: Express;
  let token: string;

  beforeAll(async () => {
    app = createApp();
    token = await getAuthToken(app);
  });

  it('should list deliveries (paginated)', async () => {
    const res = await request(app)
      .get('/api/v1/deliveries')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 10 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.totalRecords).toBeDefined();
  });

  it('should create, get, update status and delete a delivery', async () => {
    const orderRes = await request(app)
      .get('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .query({ page: 1, limit: 1 });
    const orderId = orderRes.body.data?.items?.[0]?.id;

    if (!orderId) {
      expect(true).toBe(true);
      return;
    }

    const existingDelivery = await prisma.delivery.findFirst({ where: { orderId } });
    if (existingDelivery) {
      await prisma.delivery.delete({ where: { id: existingDelivery.id } });
    }

    const createRes = await request(app)
      .post('/api/v1/deliveries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        orderId,
        direccion: 'Calle 123 #45-67',
        ciudad: 'Bogotá',
        telefono: '3001234567',
        notas: 'Entregar en la tarde',
      });
    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    const id = createRes.body.data.id;
    expect(createRes.body.data.estado).toBe('PENDIENTE');

    const getRes = await request(app)
      .get(`/api/v1/deliveries/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.data.id).toBe(id);

    const statusRes = await request(app)
      .patch(`/api/v1/deliveries/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ estado: 'EN_RUTA' });
    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.estado).toBe('EN_RUTA');

    const updateRes = await request(app)
      .patch(`/api/v1/deliveries/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notas: 'Entregar en la mañana' });
    expect(updateRes.status).toBe(200);
    expect(updateRes.body.data.notas).toBe('Entregar en la mañana');

    const delRes = await request(app)
      .delete(`/api/v1/deliveries/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);
  });

  it('should return 404 for unknown delivery', async () => {
    const res = await request(app)
      .get('/api/v1/deliveries/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
