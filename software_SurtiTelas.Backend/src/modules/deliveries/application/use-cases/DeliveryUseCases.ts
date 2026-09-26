/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestError, NotFoundError } from '../../../../shared/domain/errors';
import type { CreateDeliveryInput, DeliveryData, DeliveryRepository, UpdateDeliveryInput } from '../../domain/repositories/DeliveryRepository';
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
  constructor(private readonly repo: DeliveryRepository) {}
  async execute(filters?: { domiciliarioId?: string; estado?: string }) {
    return this.repo.listRutaDelDia(filters);
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
  constructor(private repo: DeliveryRepository, private prisma: PrismaClient, private eventBus?: EventBus) {}
  async execute(input: CreateDeliveryInput, requestId?: string) {
    const domiciliarioId = input.domiciliarioId ?? null;
    const delivery = new Delivery({
      orderId: input.orderId,
      domiciliarioId,
      estado: domiciliarioId ? 'ASIGNADO' : 'PENDIENTE',
      direccion: input.direccion ?? null,
      ciudad: input.ciudad ?? null,
      telefono: input.telefono ?? null,
      notas: input.notas ?? null,
      asignadoEn: domiciliarioId ? new Date() : null,
    });
    const created = await this.repo.create(delivery as any);

    let deliveryTotal: number;
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: input.orderId, deletedAt: null },
        select: { total: true },
      });
      deliveryTotal = order ? Number(order.total) : 0;
    } catch {
      deliveryTotal = 0;
    }

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
          total: deliveryTotal,
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

    const updates: Partial<DeliveryData> = { ...changes };
    if (changes.domiciliarioId !== undefined) {
      const domId = changes.domiciliarioId ?? null;
      if (!domId) {
        updates.estado = 'PENDIENTE';
        updates.asignadoEn = null;
      } else if (existing.estado === 'PENDIENTE') {
        updates.estado = 'ASIGNADO';
        if (!existing.asignadoEn) updates.asignadoEn = new Date();
      }
    }

    const updated = await this.repo.update(id, updates);

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
    PENDIENTE: ['ASIGNADO', 'EN_RUTA', 'FALLIDO'],
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

