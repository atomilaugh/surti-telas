import { Request, Response } from 'express';
import { ok } from '../../../../shared/presentation/http/HttpResponse';
import { parseDto } from '../../../../shared/presentation/http/validate';
import { z } from 'zod';
import { prisma } from '../../../../config/database';

const DeliveryUpdateSchema = z.object({
  estado: z.string().optional(),
  observaciones: z.string().optional(),
});

export const getDeliveryStatus = async (req: Request, res: Response) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id, deletedAt: null },
    include: { cliente: true, asesor: true },
  });
  if (!order) {
    return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
  }

  const delivery = await prisma.delivery.findUnique({
    where: { orderId: order.id },
  });

  return ok(res, {
    orderId: order.id,
    orderNumero: order.numero,
    estado: order.estado,
    cliente: order.cliente,
    delivery: delivery ? {
      id: delivery.id,
      estado: delivery.estado,
      direccion: delivery.direccion,
      ciudad: delivery.ciudad,
      telefono: delivery.telefono,
      notas: delivery.notas,
      domiciliarioId: delivery.domiciliarioId,
      asignadoEn: delivery.asignadoEn?.toISOString() ?? null,
      entregadoEn: delivery.entregadoEn?.toISOString() ?? null,
      createdAt: delivery.createdAt.toISOString(),
    } : null,
    estimatedDelivery: delivery?.asignadoEn ? new Date(delivery.asignadoEn.getTime() + 24 * 60 * 60 * 1000).toISOString() : null,
    shippedAt: delivery?.asignadoEn?.toISOString() ?? null,
    deliveredAt: delivery?.entregadoEn?.toISOString() ?? null,
  });
};

export const updateDeliveryStatus = async (req: Request, res: Response) => {
  const body = parseDto(DeliveryUpdateSchema, req.body);
  const order = await prisma.order.findUnique({
    where: { id: req.params.id, deletedAt: null },
    include: { cliente: true },
  });
  if (!order) {
    return res.status(404).json({ success: false, error: 'Pedido no encontrado' });
  }

    await prisma.delivery.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      estado: body.estado ?? 'PENDIENTE',
      direccion: order.cliente?.direccion?.trim() || '',
      ciudad: order.cliente?.ciudad?.trim() || null,
      telefono: order.cliente?.telefono?.trim() || null,
      notas: body.observaciones ?? '',
      domiciliarioId: null,
      asignadoEn: null,
    },
    update: {
      estado: body.estado ?? order.estado,
      notas: body.observaciones ?? '',
      entregadoEn: body.estado === 'ENTREGADO' ? new Date() : undefined,
    },
  });

  return ok(res, { message: 'Estado de entrega actualizado' });
};

export const getDeliveryHistory = async (req: Request, res: Response) => {
  const delivery = await prisma.delivery.findUnique({
    where: { orderId: req.params.id },
  });

  if (!delivery) {
    return ok(res, []);
  }

  return ok(res, [{
    id: delivery.id,
    estado: delivery.estado,
    direccion: delivery.direccion,
    notas: delivery.notas,
    createdAt: delivery.createdAt.toISOString(),
  }]);
};
