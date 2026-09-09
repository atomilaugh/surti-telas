import type { DomainEvent } from './EventBus';

export type { DomainEvent, EventBus } from './EventBus';

export class OrderCreatedEvent implements DomainEvent {
  readonly type = 'order.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
      total: number;
      itemsCount: number;
      paymentMethod: string;
      installments?: number;
      tipoFlujo?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderStatusUpdatedEvent implements DomainEvent {
  readonly type = 'order.status.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      previousStatus: string;
      newStatus: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderDispatchedEvent implements DomainEvent {
  readonly type = 'order.dispatched';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
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
    },
    public readonly requestId?: string
  ) {}
}

export class StockReservedEvent implements DomainEvent {
  readonly type = 'stock.reserved';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      items: { productId: string; productRef: string; cantidad: number }[];
    },
    public readonly requestId?: string
  ) {}
}

export class OrderDeliveredEvent implements DomainEvent {
  readonly type = 'order.delivered';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
      total: number;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderReceiptGeneratedEvent implements DomainEvent {
  readonly type = 'order.receipt.generated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
      receiptId: string;
      total: number;
    },
    public readonly requestId?: string
  ) {}
}

export class ReceiptPaidEvent implements DomainEvent {
  readonly type = 'receipt.paid';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      receiptId: string;
      orderId?: string;
      customerId: string;
      total: number;
      estado: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderCanceledEvent implements DomainEvent {
  readonly type = 'order.canceled';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      clienteId: string;
      clienteNombre: string;
      total: number;
      items: { productId: string; productRef: string; cantidad: number }[];
    },
    public readonly requestId?: string
  ) {}
}

export class StockBelowMinimumEvent implements DomainEvent {
  readonly type = 'stock.below_minimum';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      rawMaterialId: string;
      rawMaterialNombre: string;
      stockActual: number;
      stockMinimo: number;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductionCompletedEvent implements DomainEvent {
  readonly type = 'production.completed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productionOrderId: string;
      referencia: string;
      cantidad: number;
      tallerId?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class AuthLoginEvent implements DomainEvent {
  readonly type = 'auth.login';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      ip?: string;
      userAgent?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class AuthLoginFailedEvent implements DomainEvent {
  readonly type = 'auth.login.failed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      email?: string;
      reason?: string;
      ip?: string;
      userAgent?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class AuthLogoutEvent implements DomainEvent {
  readonly type = 'auth.logout';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PasswordResetRequestedEvent implements DomainEvent {
  readonly type = 'auth.password_reset.requested';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      recoveryRequestId: string;
      ip?: string;
      userAgent?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class UserCreatedEvent implements DomainEvent {
  readonly type = 'user.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      nombre: string;
      email: string;
      role: string;
    },
    public readonly requestId?: string
  ) {}
}

export class UserUpdatedEvent implements DomainEvent {
  readonly type = 'user.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      nombre?: string;
      cambios: Record<string, unknown>;
    },
    public readonly requestId?: string
  ) {}
}

export class UserDeletedEvent implements DomainEvent {
  readonly type = 'user.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      nombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductCreatedEvent implements DomainEvent {
  readonly type = 'product.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productId: string;
      nombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductUpdatedEvent implements DomainEvent {
  readonly type = 'product.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productId: string;
      nombre: string;
      cambios: unknown;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductDeletedEvent implements DomainEvent {
  readonly type = 'product.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productId: string;
      nombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ControlCreatedEvent implements DomainEvent {
  readonly type = 'control.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      controlId: string;
      produccionId: string;
      etapa: string;
      estado: string;
      cantidadTotal: number;
      creadoPorId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ControlUpdatedEvent implements DomainEvent {
  readonly type = 'control.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      controlId: string;
      produccionId: string;
      estado: string;
      etapa: string;
      creadoPorId: string;
      revisadoPorId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderPaymentProofUploadedEvent implements DomainEvent {
  readonly type = 'order.payment_proof.uploaded';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderAcceptedEvent implements DomainEvent {
  readonly type = 'order.accepted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
      saleId: string;
      receiptId: string;
      total: number;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderRejectedEvent implements DomainEvent {
  readonly type = 'order.rejected';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
      razon: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderReceiptRetryEvent implements DomainEvent {
  readonly type = 'order.receipt.retry';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
      receiptId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderCreatedEvent implements DomainEvent {
  readonly type = 'custom_order.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      clienteId: string;
      clienteNombre: string;
      asesorId?: string;
      asesorNombre?: string;
      itemsCount: number;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderSubmittedEvent implements DomainEvent {
  readonly type = 'custom_order.submitted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      clienteId: string;
      clienteNombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class QuotationGeneratedEvent implements DomainEvent {
  readonly type = 'quotation.generated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      numeroCotizacion: string;
      clienteId: string;
      clienteNombre: string;
      total: number;
      valorAnticipo: number;
      saldo: number;
      draft?: boolean;
    },
    public readonly requestId?: string
  ) {}
}

export class QuotationAcceptedEvent implements DomainEvent {
  readonly type = 'quotation.accepted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      numeroCotizacion: string;
      clienteId: string;
      clienteNombre: string;
      total: number;
      valorAnticipo: number;
    },
    public readonly requestId?: string
  ) {}
}

export class QuotationNegotiationStartedEvent implements DomainEvent {
  readonly type = 'quotation.negotiation.started';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      customOrderId: string;
      quoteId: string;
      authorId: string;
      authorRole: string;
      message: string;
      round: number;
    },
    public readonly requestId?: string
  ) {}
}

export class QuotationNegotiationRespondedEvent implements DomainEvent {
  readonly type = 'quotation.negotiation.responded';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      customOrderId: string;
      quoteId: string;
      authorId: string;
      authorRole: string;
      message: string;
      round: number;
      proposalData?: any;
    },
    public readonly requestId?: string
  ) {}
}

export class QuotationNegotiationAcceptedEvent implements DomainEvent {
  readonly type = 'quotation.negotiation.accepted';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      customOrderId: string;
      quoteId: string;
      negotiationId: string;
      acceptedBy: string;
    },
    public readonly requestId?: string
  ) {}
}

export class QuotationNegotiationRejectedEvent implements DomainEvent {
  readonly type = 'quotation.negotiation.rejected';
  readonly occurredAt = new Date();
  constructor(
    public readonly payload: {
      customOrderId: string;
      quoteId: string;
      negotiationId: string;
      rejectedBy: string;
      reason?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class QuotationRejectedEvent implements DomainEvent {
  readonly type = 'quotation.rejected';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      numeroCotizacion: string;
      clienteId: string;
      clienteNombre: string;
      motivoRechazo?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderConvertedEvent implements DomainEvent {
  readonly type = 'custom_order.converted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      total: number;
    },
    public readonly requestId?: string
  ) {}
}

export class PasswordResetAttemptedEvent implements DomainEvent {
  readonly type = 'auth.password_reset.attempted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      success: boolean;
      ip?: string;
      userAgent?: string;
      reason?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PasswordResetCompletedEvent implements DomainEvent {
  readonly type = 'auth.password_reset.completed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      recoveryRequestId: string;
      ip?: string;
      userAgent?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PasswordResetExpiredEvent implements DomainEvent {
  readonly type = 'auth.password_reset.expired';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      recoveryRequestId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PasswordResetRejectedEvent implements DomainEvent {
  readonly type = 'auth.password_reset.rejected';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      recoveryRequestId: string;
      motivo: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PasswordChangedEvent implements DomainEvent {
  readonly type = 'auth.password.changed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      ip?: string;
      userAgent?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class AdminForcedPasswordResetEvent implements DomainEvent {
  readonly type = 'auth.admin.forced_password_reset';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      userId: string;
      email: string;
      actorId: string;
      action: 'reset_access' | 'rejected';
      motivo?: string;
      recoveryRequestId?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ReturnCreatedEvent implements DomainEvent {
  readonly type = 'return.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      returnId: string;
      numeroDevolucion: string;
      orderId?: string;
      orderNumero?: string;
      prenda: string;
      referencia: string;
      motivo: string;
      cantidad: number;
      clienteId?: string;
      clienteNombre?: string;
      responsable?: string;
      destino: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ReturnUpdatedEvent implements DomainEvent {
  readonly type = 'return.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      returnId: string;
      numeroDevolucion: string;
      cambios: Record<string, unknown>;
      clienteId?: string;
      clienteNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ReturnStatusUpdatedEvent implements DomainEvent {
  readonly type = 'return.status.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      returnId: string;
      numeroDevolucion: string;
      previousStatus: string;
      newStatus: string;
      clienteId?: string;
      clienteNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ReturnDeletedEvent implements DomainEvent {
  readonly type = 'return.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      returnId: string;
      numeroDevolucion: string;
      clienteId?: string;
      clienteNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class DeliveryCreatedEvent implements DomainEvent {
  readonly type = 'delivery.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      deliveryId: string;
      orderId: string;
      orderNumero: string;
      domiciliarioId?: string;
      domiciliarioNombre?: string;
      direccion?: string;
      ciudad?: string;
      telefono?: string;
      total: number;
    },
    public readonly requestId?: string
  ) {}
}

export class DeliveryUpdatedEvent implements DomainEvent {
  readonly type = 'delivery.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      deliveryId: string;
      orderId: string;
      orderNumero: string;
      cambios: Record<string, unknown>;
    },
    public readonly requestId?: string
  ) {}
}

export class DeliveryStatusUpdatedEvent implements DomainEvent {
  readonly type = 'delivery.status.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      deliveryId: string;
      orderId: string;
      orderNumero: string;
      previousStatus: string;
      newStatus: string;
      domiciliarioId?: string;
      domiciliarioNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class DeliveryCompletedEvent implements DomainEvent {
  readonly type = 'delivery.completed';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      deliveryId: string;
      orderId: string;
      orderNumero: string;
      domiciliarioId?: string;
      domiciliarioNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomerCreatedEvent implements DomainEvent {
  readonly type = 'customer.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customerId: string;
      nombre: string;
      email?: string;
      ciudad: string;
      asesorId?: string;
      asesorNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomerUpdatedEvent implements DomainEvent {
  readonly type = 'customer.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customerId: string;
      nombre: string;
      cambios: Record<string, unknown>;
      asesorId?: string;
      asesorNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PaymentCreatedEvent implements DomainEvent {
  readonly type = 'payment.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      paymentId: string;
      orderId?: string;
      customerId: string;
      amount: number;
      method: string;
      status: string;
      asesorId?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PaymentStatusUpdatedEvent implements DomainEvent {
  readonly type = 'payment.status.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      paymentId: string;
      orderId?: string;
      customerId: string;
      previousStatus: string;
      newStatus: string;
      amount: number;
      asesorId?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PaymentUpdatedEvent implements DomainEvent {
  readonly type = 'payment.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      paymentId: string;
      orderId?: string;
      customerId: string;
      cambios: Record<string, unknown>;
      asesorId?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class PaymentDeletedEvent implements DomainEvent {
  readonly type = 'payment.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      paymentId: string;
      orderId?: string;
      customerId: string;
      asesorId?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ReceiptCreatedEvent implements DomainEvent {
  readonly type = 'receipt.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      receiptId: string;
      orderId?: string;
      customerId: string;
      numero: string;
      total: number;
      estado: string;
      emitidoPor?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ReceiptUpdatedEvent implements DomainEvent {
  readonly type = 'receipt.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      receiptId: string;
      orderId?: string;
      customerId: string;
      cambios: Record<string, unknown>;
    },
    public readonly requestId?: string
  ) {}
}

export class ReceiptStatusUpdatedEvent implements DomainEvent {
  readonly type = 'receipt.status.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      receiptId: string;
      orderId?: string;
      customerId: string;
      previousStatus: string;
      newStatus: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ReceiptDeletedEvent implements DomainEvent {
  readonly type = 'receipt.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      receiptId: string;
      orderId?: string;
      customerId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderAssignedEvent implements DomainEvent {
  readonly type = 'order.assigned';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      domiciliarioId: string;
      domiciliarioNombre: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderUpdatedEvent implements DomainEvent {
  readonly type = 'order.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      cambios: Record<string, unknown>;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class OrderDeletedEvent implements DomainEvent {
  readonly type = 'order.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      orderId: string;
      orderNumero: string;
      clienteId: string;
      clienteNombre: string;
      asesorId: string;
      asesorNombre: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductionOrderCreatedEvent implements DomainEvent {
  readonly type = 'production_order.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productionOrderId: string;
      referencia: string;
      cantidad: number;
      estado: string;
      tallerId?: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductionOrderUpdatedEvent implements DomainEvent {
  readonly type = 'production_order.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productionOrderId: string;
      referencia: string;
      cambios: Record<string, unknown>;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductionOrderDeletedEvent implements DomainEvent {
  readonly type = 'production_order.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productionOrderId: string;
      referencia: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductionOrderAssignedEvent implements DomainEvent {
  readonly type = 'production_order.assigned';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productionOrderId: string;
      referencia: string;
      tallerId: string;
      tallerNombre: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ProductionProgressUpdatedEvent implements DomainEvent {
  readonly type = 'production_progress.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      productionOrderId: string;
      referencia: string;
      avance: number;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class WorkshopCreatedEvent implements DomainEvent {
  readonly type = 'workshop.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      workshopId: string;
      nombre: string;
      ciudad?: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class WorkshopUpdatedEvent implements DomainEvent {
  readonly type = 'workshop.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      workshopId: string;
      nombre: string;
      cambios: Record<string, unknown>;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class WorkshopDeletedEvent implements DomainEvent {
  readonly type = 'workshop.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      workshopId: string;
      nombre: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class ControlDeletedEvent implements DomainEvent {
  readonly type = 'control.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      controlId: string;
      produccionId: string;
      etapa: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class SupplierCreatedEvent implements DomainEvent {
  readonly type = 'supplier.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      supplierId: string;
      nombre: string;
      email?: string;
      telefono?: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class SupplierUpdatedEvent implements DomainEvent {
  readonly type = 'supplier.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      supplierId: string;
      nombre: string;
      cambios: Record<string, unknown>;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class SupplierDeletedEvent implements DomainEvent {
  readonly type = 'supplier.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      supplierId: string;
      nombre: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class RawMaterialCreatedEvent implements DomainEvent {
  readonly type = 'raw_material.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      rawMaterialId: string;
      nombre: string;
      stockActual: number;
      stockMinimo: number;
      unidadMedida?: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class RawMaterialUpdatedEvent implements DomainEvent {
  readonly type = 'raw_material.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      rawMaterialId: string;
      nombre: string;
      cambios: Record<string, unknown>;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class RawMaterialDeletedEvent implements DomainEvent {
  readonly type = 'raw_material.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      rawMaterialId: string;
      nombre: string;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class StockMovementCreatedEvent implements DomainEvent {
  readonly type = 'stock.movement.created';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      movementId: string;
      rawMaterialId: string;
      rawMaterialNombre: string;
      tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
      cantidad: number;
      nuevoStock: number;
      usuarioId: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderStatusUpdatedEvent implements DomainEvent {
  readonly type = 'customOrder.status.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      previousStatus: string;
      newStatus: string;
      clienteId: string;
      clienteNombre: string;
      asesorId?: string;
      asesorNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderUpdatedEvent implements DomainEvent {
  readonly type = 'custom_order.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      cambios: Record<string, unknown>;
      clienteId: string;
      clienteNombre: string;
      asesorId?: string;
      asesorNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderDeletedEvent implements DomainEvent {
  readonly type = 'custom_order.deleted';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      clienteId: string;
      clienteNombre: string;
      asesorId?: string;
      asesorNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderPaymentUpdatedEvent implements DomainEvent {
  readonly type = 'custom_order.payment.updated';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      cambios: Record<string, unknown>;
      clienteId: string;
      clienteNombre: string;
      asesorId?: string;
      asesorNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}

export class CustomOrderReferenceUploadedEvent implements DomainEvent {
  readonly type = 'custom_order.reference.uploaded';
  readonly occurredAt = new Date();

  constructor(
    public readonly payload: {
      customOrderId: string;
      numeroSolicitud: string;
      clienteId: string;
      clienteNombre: string;
      asesorId?: string;
      asesorNombre?: string;
    },
    public readonly requestId?: string
  ) {}
}
