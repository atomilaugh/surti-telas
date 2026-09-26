import { NotFoundError, BadRequestError } from '../../../../shared/domain/errors';
import { PrismaClient } from '@prisma/client';
import type { EventBus } from '../../../../shared/application/events';
import {
  ReturnRequestCreatedEvent,
  ReturnRequestStatusChangedEvent,
  ReturnItemAddedEvent,
  ReturnItemApprovedEvent,
  ReturnInspectionCompletedEvent,
  ReturnResolutionAssignedEvent,
} from '../../../../shared/application/events';
import { ReturnRequest, type ReturnRequestStatus } from '../../domain/entities/ReturnRequest';
import { ReturnItem } from '../../domain/entities/ReturnItem';
import { ReturnInspection } from '../../domain/entities/ReturnInspection';
import { ReturnResolution } from '../../domain/entities/ReturnResolution';
import { ReturnHistory, type ReturnHistoryData } from '../../domain/entities/ReturnHistory';
import type {
  ReturnRequestRepository,
  CreateReturnInput,
  ReturnItemInput,
  ReturnInspectionInput,
  ReturnResolutionInput,
  ReturnRequestFilters,
  ReturnRequestListResult,
} from '../../domain/repositories/ReturnRequestRepository';
import type { WarrantyPolicyRepository } from '../../domain/repositories/WarrantyPolicyRepository';

export class ListReturnRequests {
  constructor(private readonly repo: ReturnRequestRepository) {}
  execute(filters?: ReturnRequestFilters): Promise<ReturnRequestListResult> {
    return this.repo.list(filters);
  }
}

export class GetReturnRequest {
  constructor(private readonly repo: ReturnRequestRepository) {}
  async execute(id: string): Promise<ReturnRequest> {
    const request = await this.repo.getById(id);
    if (!request) throw new NotFoundError('Solicitud de devolución no encontrada');
    return request;
  }
}

export class GetReturnRequestWithRelations {
  constructor(private readonly repo: ReturnRequestRepository) {}
  async execute(id: string) {
    const result = await this.repo.findByIdWithRelations(id);
    if (!result) throw new NotFoundError('Solicitud de devolución no encontrada');
    return result;
  }
}

export class CreateReturnRequest {
  constructor(
    private readonly repo: ReturnRequestRepository,
    private readonly prisma: PrismaClient,
    private readonly warrantyRepo: WarrantyPolicyRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async execute(input: CreateReturnInput, requestId?: string, usuario?: string): Promise<ReturnRequest> {
    const order = await this.prisma.order.findFirst({
      where: { id: input.orderId, deletedAt: null },
      select: {
        id: true,
        numero: true,
        clienteId: true,
        clienteNombre: true,
        estado: true,
        fecha: true,
      },
    });
    if (!order) {
      throw new NotFoundError('Pedido no encontrado');
    }

    if (order.estado !== 'ENTREGADO') {
      throw new BadRequestError(
        `Solo pedidos ENTREGADOS pueden tener solicitud de devolución. Estado actual: ${order.estado}`,
      );
    }

    const numero = await this.repo.nextNumero();

    const policy = await this.warrantyRepo.getByTipo('VENTA');

    const ent = new ReturnRequest({
      numeroDevolucion: numero,
      orderId: input.orderId,
      customerId: order.clienteId,
      clienteSnapshot: order.clienteNombre,
      clienteIdSnapshot: order.clienteId,
      motivo: input.motivo ?? null,
      observaciones: input.observaciones ?? null,
      cantidadTotal: input.cantidadTotal,
      cantidadInspeccionada: 0,
      estado: ReturnRequest.getInitialState(),
      canalRegistro: input.canalRegistro ?? 'PORTAL',
      evidencias: input.evidencias ?? [],
    });

    if (policy && policy.isApplicable()) {
      const fechaInicio = input.fechaInicioGarantia ?? order.fecha;
      ent.applyWarrantyPolicy(policy.tipo, policy.diasGarantia, fechaInicio);
    }

     const created = await this.repo.create(ent.toDTO() as any);

    if (input.items && input.items.length > 0) {
      for (const itemInput of input.items) {
        const item = new ReturnItem({
          returnRequestId: created.id!,
          orderItemId: itemInput.orderItemId ?? null,
          productId: itemInput.productId ?? null,
          ref: itemInput.ref,
          prenda: itemInput.prenda,
          cantidadSolicitada: itemInput.cantidadSolicitada,
          cantidadAprobada: null,
          cantidadRecibida: null,
          cantidadAceptada: null,
          cantidadRechazada: null,
          defectoTipo: itemInput.defectoTipo as any,
          defectoDescripcion: itemInput.defectoDescripcion ?? null,
        } as any);
        await this.repo.createItem(item.toDTO() as any);
      }
    }

    await this.repo.createHistory({
      returnRequestId: created.id!,
      estadoAnterior: null,
      estadoNuevo: created.estado,
      accion: 'SOLICITUD_CREADA',
      usuario,
      observaciones: input.observaciones ?? null,
      cantidad: created.cantidadTotal,
      fecha: new Date(),
    });

    if (this.eventBus) {
      this.eventBus.publish(
        new ReturnRequestCreatedEvent({
          requestId: created.id!,
          numeroDevolucion: created.numeroDevolucion,
          orderId: created.orderId,
          customerId: created.customerId ?? undefined,
          clienteNombre: created.clienteSnapshot ?? undefined,
          tipoGarantiaSnapshot: created.tipoGarantiaSnapshot ?? undefined,
          diasGarantiaSnapshot: created.diasGarantiaSnapshot ?? undefined,
          fechaVencimientoGarantia: created.fechaVencimientoGarantia ?? undefined,
          cantidadTotal: created.cantidadTotal,
          motivo: created.motivo ?? undefined,
        }, requestId),
      );
    }

    return created;
  }
}

export class ChangeReturnRequestStatus {
  constructor(
    private readonly repo: ReturnRequestRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async execute(
    id: string,
    nextStatus: ReturnRequestStatus,
    usuario?: string,
    observaciones?: string,
    requestId?: string,
  ): Promise<ReturnRequest> {
    const existing = await this.repo.getById(id);
    if (!existing) throw new NotFoundError('Solicitud de devolución no encontrada');

    const previousStatus = existing.estado;
    if (!existing.canTransitionTo(nextStatus)) {
      throw new BadRequestError(
        `No se puede transitar de '${existing.estado}' a '${nextStatus}'`,
      );
    }

    if (observaciones) existing.setObservaciones(observaciones);

    existing.cambiarEstado(nextStatus);

    const updated = await this.repo.update(id, existing.toDTO());

    await this.repo.createHistory({
      returnRequestId: id,
      estadoAnterior: previousStatus,
      estadoNuevo: updated.estado,
      accion: 'ESTADO_CAMBIADO',
      usuario,
      observaciones,
      fecha: new Date(),
    });

    if (this.eventBus) {
      this.eventBus.publish(
        new ReturnRequestStatusChangedEvent({
          requestId: updated.id!,
          numeroDevolucion: updated.numeroDevolucion,
          previousStatus,
          newStatus: updated.estado,
          usuario,
          observaciones,
        }, requestId),
      );
    }

    return updated;
  }
}

export class AddReturnItem {
  constructor(
    private readonly repo: ReturnRequestRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async execute(
    requestId: string,
    input: ReturnItemInput,
    eventRequestId?: string,
  ): Promise<ReturnItem> {
    const request = await this.repo.getById(requestId);
    if (!request) throw new NotFoundError('Solicitud de devolución no encontrada');

    if (request.isTerminal()) {
      throw new BadRequestError('No se pueden agregar items a una solicitud finalizada');
    }

    const existingItems = await this.repo.listItemsByRequestId(requestId);
    const totalSolicitada = existingItems.reduce(
      (sum, item) => sum + (item.cantidadSolicitada ?? 0),
      0,
    );
    if (totalSolicitada + input.cantidadSolicitada > request.cantidadTotal) {
      throw new BadRequestError(
        `La cantidad solicitada (${totalSolicitada + input.cantidadSolicitada}) excede el total de la solicitud (${request.cantidadTotal})`,
      );
    }

    const item = new ReturnItem({
      returnRequestId: requestId,
      orderItemId: input.orderItemId ?? null,
      productId: input.productId ?? null,
      ref: input.ref,
      prenda: input.prenda,
      cantidadSolicitada: input.cantidadSolicitada,
      cantidadAprobada: null,
      cantidadRecibida: null,
      cantidadAceptada: null,
      cantidadRechazada: null,
      defectoTipo: input.defectoTipo as any,
      defectoDescripcion: input.defectoDescripcion ?? null,
    } as any);

    const created = await this.repo.createItem(item.toDTO() as any);

    if (this.eventBus) {
      this.eventBus.publish(
        new ReturnItemAddedEvent({
          returnItemId: created.id!,
          returnRequestId: requestId,
          ref: created.ref,
          prenda: created.prenda,
          cantidadSolicitada: created.cantidadSolicitada,
          defectoTipo: created.defectoTipo,
        }, eventRequestId),
      );
    }

    return created;
  }
}

export class ApproveReturnItem {
  constructor(
    private readonly repo: ReturnRequestRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async execute(
    itemId: string,
    cantidadAprobada: number,
    eventRequestId?: string,
  ): Promise<ReturnItem> {
    const item = await this.repo.getItemById(itemId);
    if (!item) throw new NotFoundError('Item de devolución no encontrado');
    item.approve(cantidadAprobada);
    const updated = await this.repo.updateItem(item.id!, item.toDTO() as any);

    if (this.eventBus) {
      this.eventBus.publish(
        new ReturnItemApprovedEvent({
          returnItemId: updated.id!,
          cantidadAprobada,
        }, eventRequestId),
      );
    }

    return updated;
  }
}

export class CompleteReturnInspection {
  constructor(
    private readonly repo: ReturnRequestRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async execute(
    requestId: string,
    input: ReturnInspectionInput,
    usuario?: string,
    eventRequestId?: string,
  ): Promise<ReturnInspection> {
    const request = await this.repo.getById(requestId);
    if (!request) throw new NotFoundError('Solicitud de devolución no encontrada');

    if (!request.canTransitionTo('EN_INSPECCION')) {
      throw new BadRequestError(
        `La solicitud con estado '${request.estado}' no puede pasar a EN_INSPECCION`,
      );
    }

    const inspection = new ReturnInspection({
      returnRequestId: requestId,
      responsable: input.responsable ?? null,
      fecha: new Date(),
      observaciones: input.observaciones ?? null,
      condicion: input.condicion as any,
      cantidadAceptada: input.cantidadAceptada,
      cantidadRechazada: input.cantidadRechazada,
    } as any);

    const created = await this.repo.createInspection(inspection.toDTO() as any);

    const previousStatus = request.estado;
    request.cambiarEstado('EN_INSPECCION');
    await this.repo.update(requestId, {
      estado: 'EN_INSPECCION',
      cantidadInspeccionada: input.cantidadAceptada + input.cantidadRechazada,
    });

    await this.repo.createHistory({
      returnRequestId: requestId,
      estadoAnterior: previousStatus,
      estadoNuevo: 'EN_INSPECCION',
      accion: 'INSPECCION_COMPLETADA',
      usuario,
      observaciones: input.observaciones ?? null,
      cantidad: input.cantidadAceptada + input.cantidadRechazada,
      fecha: new Date(),
    });

    if (this.eventBus) {
      this.eventBus.publish(
        new ReturnInspectionCompletedEvent({
          requestId,
          inspectionId: created.id!,
          condicion: created.condicion,
           cantidadAceptada: created.quantityAceptada,
           cantidadRechazada: created.quantityRechazada,
          responsable: input.responsable ?? undefined,
        }, eventRequestId),
      );
    }

    return created;
  }
}

export class AssignReturnResolution {
  constructor(
    private readonly repo: ReturnRequestRepository,
    private readonly eventBus?: EventBus,
  ) {}

  async execute(
    requestId: string,
    input: ReturnResolutionInput,
    usuario?: string,
    eventRequestId?: string,
  ): Promise<ReturnResolution> {
    const request = await this.repo.getById(requestId);
    if (!request) throw new NotFoundError('Solicitud de devolución no encontrada');

    if (request.estado !== 'EN_INSPECCION') {
      throw new BadRequestError(
        'Solo se puede resolver una solicitud que esté EN_INSPECCION',
      );
    }

    const { tipo, cantidad, responsable, observaciones } = input;
    const resolution = new ReturnResolution({
      returnRequestId: requestId,
      tipo: tipo as any,
      cantidad,
      responsable: responsable ?? null,
      observaciones: observaciones ?? null,
      fecha: new Date(),
    } as any);

    const created = await this.repo.createResolution(resolution.toDTO() as any);

    const previousStatus = request.estado;
    request.cambiarEstado('RESUELTA');
    await this.repo.update(requestId, { estado: 'RESUELTA' });

    await this.repo.createHistory({
      returnRequestId: requestId,
      estadoAnterior: previousStatus,
      estadoNuevo: 'RESUELTA',
      accion: 'RESOLUCION_ASIGNADA',
      usuario,
      observaciones: input.observaciones ?? null,
      cantidad,
      fecha: new Date(),
    });

    if (this.eventBus) {
      this.eventBus.publish(
        new ReturnResolutionAssignedEvent({
          requestId,
          resolutionId: created.id!,
          tipo: created.tipo,
          cantidad: created.cantidad,
          responsable: input.responsable ?? undefined,
          observaciones: input.observaciones ?? undefined,
        }, eventRequestId),
      );
    }

    return created;
  }
}

export class CreateReturnHistoryEntry {
  constructor(private readonly repo: ReturnRequestRepository) {}
  create(data: ReturnHistoryData): Promise<ReturnHistory> {
    return this.repo.createHistory(data as any);
  }
}

export class ListReturnItems {
  constructor(private readonly repo: ReturnRequestRepository) {}
  execute(requestId: string) {
    return this.repo.listItemsByRequestId(requestId);
  }
}

export class ListReturnHistories {
  constructor(private readonly repo: ReturnRequestRepository) {}
  execute(requestId: string) {
    return this.repo.listHistoriesByRequestId(requestId);
  }
}

export {
  ReturnRequest,
  ReturnItem,
  ReturnInspection,
  ReturnResolution,
  ReturnHistory,
  NotFoundError,
  BadRequestError,
  type ReturnRequestStatus,
  type ReturnRequestRepository,
  type CreateReturnInput,
  type ReturnItemInput,
  type ReturnInspectionInput,
  type ReturnResolutionInput,
  type ReturnRequestFilters,
  type ReturnRequestListResult,
};
