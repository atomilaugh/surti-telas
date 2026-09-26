import type { DomainEvent, EventBus } from '../../../../shared/application/events';
import { prisma } from '../../../../config/database';
import { logger } from '../../../../shared/infrastructure/logger';

export class OrderDeliverySubscriber {
  constructor(private readonly eventBus: EventBus) {
    this.subscribe();
    logger.info('[OrderDeliverySubscriber] Iniciado - escuchando eventos order.dispatched');
  }

  private subscribe() {
    this.eventBus.subscribe('order.dispatched', async (event: DomainEvent) => {
      const payload = event.payload as {
        orderId: string;
        orderNumero: string;
        clienteId: string;
        clienteNombre: string;
        domiciliarioId?: string;
        domiciliarioNombre?: string;
        direccion: string;
        ciudad?: string;
        telefono?: string;
        total: number;
      };

      logger.info(`[OrderDeliverySubscriber] Pedido despachado: ${payload.orderId}`, { orderId: payload.orderId, orderNumero: payload.orderNumero });

      try {
        const existing = (await prisma.delivery.findFirst({
          where: { orderId: payload.orderId, deletedAt: null },
          include: {
            order: {
              select: {
                clienteId: true,
              },
            },
          },
        })) as any;

        const customer = existing?.order?.clienteId
          ? await prisma.customer.findUnique({
              where: { id: existing.order.clienteId },
              select: { ciudad: true, telefono: true, direccion: true },
            })
          : null;

        const direccion = payload.direccion || customer?.direccion || existing?.direccion || '';
        const ciudad = payload.ciudad || customer?.ciudad || existing?.ciudad || '';
        const telefono = payload.telefono || customer?.telefono || existing?.telefono || '';

        const domiciliarioId = payload.domiciliarioId || existing?.domiciliarioId || undefined;

        if (existing) {
          const result = await prisma.delivery.update({
            where: { id: existing.id },
            data: {
              domiciliarioId,
              estado: domiciliarioId ? 'ASIGNADO' : 'PENDIENTE',
              direccion,
              ciudad,
              telefono,
              asignadoEn: domiciliarioId ? (existing.asignadoEn ?? new Date()) : null,
            },
          });
          logger.info(`[OrderDeliverySubscriber] Delivery actualizado para pedido ${payload.orderId}: ${result.id}`);
          return;
        }

        const result = await prisma.delivery.create({
          data: {
            orderId: payload.orderId,
            domiciliarioId,
            estado: domiciliarioId ? 'ASIGNADO' : 'PENDIENTE',
            direccion,
            ciudad,
            telefono,
            asignadoEn: domiciliarioId ? new Date() : null,
          },
        });

        logger.info(`[OrderDeliverySubscriber] Delivery creado para pedido ${payload.orderId}: ${result.id}`);
      } catch (error) {
        logger.error(`[OrderDeliverySubscriber] Error creando delivery para pedido ${payload.orderId}`, { error: (error as Error).message });
      }
    });
  }
}
