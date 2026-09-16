/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestError, NotFoundError } from '../../../../shared/domain/errors';
import type { CreateDeliveryInput, DeliveryRepository, UpdateDeliveryInput } from '../../domain/repositories/DeliveryRepository';
import { Delivery } from '../../domain/entities/Delivery';
import { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/application/events';
import {
  DeliveryCreatedEvent,
  DeliveryUpdatedEvent,
  DeliveryStatusUpdatedEvent,
  DeliveryCompletedEvent,
} from '../../../../shared/application/events';

export class ListDeliveries {
  constructor(private readonly repo: DeliveryRepository) {}
  execute(filters?: { estado?: Delivery['estado']; domiciliarioId?: string; page?: number; limit?: number }) {
    return this.repo.list(filters);
  }
}

export class ListRutaDelDia {
  constructor(private readonly prisma: PrismaClient) {}
  async execute(filters?: { domiciliarioId?: string; estado?: string }) {
    const deliveriesWhere: any = {
      deletedAt: null,
      ...(filters?.estado ? { estado: filters.estado } : { estado: { in: ['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'FALLIDO'] } }),
    };
    if (filters?.domiciliarioId) {
      deliveriesWhere.OR = [
        { domiciliarioId: filters.domiciliarioId },
        { domiciliarioId: null, order: { estado: { in: ['DESPACHADO', 'EN_CAMINO'] } } as any },
      ];
    }

    const [deliveriesRaw, domiciliariosRaw] = await Promise.all([
      this.prisma.delivery.findMany({
        where: deliveriesWhere,
        include: {
          order: {
            include: {
              cliente: {
                select: {
                  nombre: true,
                  telefono: true,
                  ciudad: true,
                  direccion: true,
                },
              },
            },
          },
          domiciliario: {
            select: {
              nombre: true,
              email: true,
              telefono: true,
            },
          },
        } as any,
        orderBy: { asignadoEn: 'asc' },
      }),
      this.prisma.domiciliario.findMany({
        where: { activo: true },
        select: {
          userId: true,
          zona: true,
        },
      }),
    ]);

    const domiciliarioZonaMap = new Map((domiciliariosRaw as any[]).map((d: any) => [d.userId, d.zona]));
    const deliveries = deliveriesRaw as any[];
    const mappedDeliveries = deliveries.map((delivery: any) => {
      const order = delivery.order;
      const cliente = order?.cliente;
      const rawDireccion = (cliente?.direccion?.trim() || delivery.direccion?.trim()) || null;
      const rawCiudad = (cliente?.ciudad?.trim() || delivery.ciudad?.trim()) || null;
      const rawTelefono = (cliente?.telefono?.trim() || delivery.telefono?.trim()) || null;
      return {
        id: delivery.id,
        orderId: delivery.orderId,
        estado: delivery.estado,
        domiciliarioId: delivery.domiciliarioId,
        domiciliarioNombre: delivery.domiciliario?.nombre ?? null,
        domiciliarioTelefono: delivery.domiciliario?.telefono ?? null,
        domiciliarioZona: domiciliarioZonaMap.get(delivery.domiciliarioId ?? '') ?? null,
        direccion: rawDireccion,
        ciudad: rawCiudad,
        telefono: rawTelefono,
        notas: delivery.notas,
        motivo: delivery.motivo,
        asignadoEn: delivery.asignadoEn,
        inicioRutaEn: delivery.inicioRutaEn,
        entregadoEn: delivery.entregadoEn,
        order: {
          numero: order?.numero ?? null,
          cliente: cliente?.nombre || order?.clienteNombre || null,
          telefono: rawTelefono,
          direccion: rawDireccion,
          ciudad: rawCiudad,
          total: order?.total ? Number(order.total) : null,
          estado: order?.estado ?? null,
        },
      };
    });

    return mappedDeliveries;
  }
}

export class GetDelivery {
  constructor(private readonly repo: DeliveryRepository) {}
  async execute(id: string) {
    const delivery = await this.repo.getById(id);
    if (!delivery) throw new NotFoundError('Entrega no encontrada');
    return delivery;
  }
}

export class CreateDelivery {
  constructor(private readonly repo: DeliveryRepository, private readonly eventBus?: EventBus) {}
  async execute(input: CreateDeliveryInput, requestId?: string) {
    const delivery = new Delivery({
      orderId: input.orderId,
      domiciliarioId: input.domiciliarioId ?? null,
      estado: 'ASIGNADO',
      direccion: input.direccion ?? null,
      ciudad: input.ciudad ?? null,
      telefono: input.telefono ?? null,
      notas: input.notas ?? null,
      asignadoEn: new Date(),
    });
    const created = await this.repo.create(delivery as any);

    if (this.eventBus) {
      this.eventBus.publish(
        new DeliveryCreatedEvent({
          deliveryId: created.id!,
          orderId: created.orderId!,
          orderNumero: created.orderId!,
          domiciliarioId: created.domiciliarioId ?? undefined,
          domiciliarioNombre: undefined,
          direccion: created.direccion ?? '',
          ciudad: created.ciudad ?? undefined,
          telefono: created.telefono ?? undefined,
          total: 0,
        }, requestId)
      );
    }

    return created;
  }
}

export class UpdateDelivery {
  constructor(private readonly repo: DeliveryRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, changes: UpdateDeliveryInput, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Entrega no encontrada');
    const updated = await this.repo.update(id, changes);

    if (this.eventBus) {
      this.eventBus.publish(
        new DeliveryUpdatedEvent({
          deliveryId: updated.id!,
          orderId: updated.orderId!,
          orderNumero: updated.orderId!,
          cambios: changes as Record<string, unknown>,
        }, requestId)
      );
    }

    return updated;
  }
}

export class ChangeDeliveryStatus {
  constructor(
    private readonly repo: DeliveryRepository,
    private readonly orderRepo?: { updateStatus(id: string, estado: string): Promise<any> },
    private readonly eventBus?: EventBus,
  ) {}

  private readonly allowedTransitions: Record<Delivery['estado'], Delivery['estado'][]> = {
    ASIGNADO: ['EN_RUTA', 'FALLIDO'],
    EN_RUTA: ['ENTREGADO', 'FALLIDO'],
    ENTREGADO: [],
    FALLIDO: [],
  };

  async execute(id: string, estado: Delivery['estado'], role?: string, requestId?: string, motivo?: string | null) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Entrega no encontrada');

    const previousStatus = existing.estado;
    const allowed = this.allowedTransitions[previousStatus] ?? [];
    if (!allowed.includes(estado)) {
      throw new BadRequestError(`Transición de estado no permitida: ${previousStatus} → ${estado}`);
    }

    if (role && role !== 'DOMICILIARIO' && (estado === 'ENTREGADO' || estado === 'FALLIDO')) {
      throw new BadRequestError('Solo el domiciliario puede marcar ENTREGADO o FALLIDO');
    }

    const updated = new Delivery({ ...existing.toDTO(), estado, motivo: motivo ?? existing.motivo });
    if (estado === 'ENTREGADO') updated.marcarEntregado();
    if (estado === 'EN_RUTA') updated.marcarEnRuta();
    if (estado === 'FALLIDO') updated.marcarFallido();

    const result = await this.repo.update(id, {
      estado: updated.estado,
      entregadoEn: updated.entregadoEn,
      inicioRutaEn: updated.inicioRutaEn,
      motivo: updated.motivo,
    });

    if (this.eventBus && previousStatus !== estado) {
      this.eventBus.publish(
        new DeliveryStatusUpdatedEvent({
          deliveryId: result.id!,
          orderId: result.orderId!,
          orderNumero: result.orderId!,
          previousStatus,
          newStatus: estado,
          domiciliarioId: result.domiciliarioId ?? undefined,
          domiciliarioNombre: undefined,
        }, requestId)
      );
    }

    if (estado === 'ENTREGADO' && this.orderRepo) {
      try {
        await this.orderRepo.updateStatus(existing.orderId, 'Entregado');
      } catch (error) {
        const err = error as Error;
        console.error('[ChangeDeliveryStatus] Order update failed', {
          name: err.name,
          message: err.message,
          stack: err.stack,
        });
        throw error;
      }
    }

    return result;
  }
}

export class DeleteDelivery {
  constructor(private readonly repo: DeliveryRepository, private readonly eventBus?: EventBus) {}
  async execute(id: string, requestId?: string) {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Entrega no encontrada');
    await this.repo.delete(id);

    if (this.eventBus) {
      this.eventBus.publish(
        new DeliveryCompletedEvent({
          deliveryId: existing.id!,
          orderId: existing.orderId!,
          orderNumero: existing.orderId!,
          domiciliarioId: existing.domiciliarioId ?? undefined,
          domiciliarioNombre: undefined,
        }, requestId)
      );
    }
  }
}

