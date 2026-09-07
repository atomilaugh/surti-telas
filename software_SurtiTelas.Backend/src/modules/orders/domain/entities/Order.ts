export type OrderStatus =
  | 'Pendiente'
  | 'Aceptado'
  | 'Listo'
  | 'Enviado'
  | 'Entregado'
  | 'Rechazado'
  | 'En validación'
  | 'Recibo generado'
  | 'Recibo enviado'
  | 'Cancelado';

export type OrderPriority = 'Estándar' | 'Prioritario';
export type OrderFlow = 'PRODUCCION' | 'VENTAS';
export type EnvioPrioridad = 'Normal' | 'Express' | 'Urgente';

export type RejectionReason =
  | 'COMPROBANTE_FALSO'
  | 'COMPROBANTE_ILEGIBLE'
  | 'DATOS_INCONSISTENTES'
  | 'OTRA';

import { BadRequestError } from '../../../../shared/domain/errors';

export interface OrderItem {
  productId?: string;
  customOrderItemId?: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface OrderData {
  id: string;
  numero: string;
  cliente: string;
  clienteId: string;
  asesor: string;
  asesorId: string;
  asesorTelefono?: string;
  asesorEmail?: string;
  tipoFlujo: OrderFlow;
  fecha: string;
  subtotal?: number;
  impuestos?: number;
  descuentos?: number;
  total: number;
  items: number;
  estado: OrderStatus;
  prioridad?: OrderPriority;
  observaciones?: string;
  medioPago?: string;
  fechaValidacion?: string;
  usuarioValidacionId?: string;
  razonRechazo?: string;
  observacionesRechazo?: string;
  comprobantePagoUrl?: string;
  comprobantePagoNombre?: string;
  comprobantePagoMime?: string;
  comprobantePagoTamaño?: number;
  comprobantePagoCargadoEn?: string;
  comprobantePagoCargadoPorId?: string;
  comprobantePagoEstado?: string;
  comprobantePagoObservaciones?: string;
  usuarioValidacionNombre?: string;
  comprobantePagoCargadoPorNombre?: string;
  diasCredito?: number;
  descuentoEspecial?: number;
  envioGratis?: boolean;
  prioridadEnvio?: EnvioPrioridad;
  itemsList?: OrderItem[];
  motivoAnulacion?: string;
  fechaAnulacion?: string;
  ventas?: Array<{
    id: string;
    orderId: string;
    clienteId: string;
    clienteNombre: string;
    asesorId: string;
    asesorNombre: string;
    fechaVenta: string;
    subtotal: number;
    impuestos: number;
    descuentos: number;
    total: number;
    estado: string;
    medioPago?: string;
  }>;
  /** @deprecated Use `ventas` (plural). Mantenido para compat. */
  venta?: {
    id: string;
    orderId: string;
    clienteId: string;
    clienteNombre: string;
    asesorId: string;
    asesorNombre: string;
    fechaVenta: string;
    subtotal: number;
    impuestos: number;
    descuentos: number;
    total: number;
    estado: string;
    medioPago?: string;
  };
  customOrderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export class Order {
  readonly id: string;
  readonly numero: string;
  readonly cliente: string;
  readonly clienteId: string;
  readonly asesor: string;
  readonly asesorId: string;
  readonly tipoFlujo: OrderFlow;
  readonly fecha: string;
  readonly subtotal?: number;
  readonly impuestos?: number;
  readonly descuentos?: number;
  readonly total: number;
  readonly items: number;
  readonly estado: OrderStatus;
  readonly prioridad?: OrderPriority;
  readonly observaciones?: string;
  readonly medioPago?: string;
  readonly fechaValidacion?: string;
  readonly usuarioValidacionId?: string;
  readonly razonRechazo?: string;
  readonly observacionesRechazo?: string;
  readonly comprobantePagoUrl?: string;
  readonly comprobantePagoNombre?: string;
  readonly comprobantePagoMime?: string;
  readonly comprobantePagoTamaño?: number;
  readonly comprobantePagoCargadoEn?: string;
  readonly comprobantePagoCargadoPorId?: string;
  readonly comprobantePagoEstado?: string;
  readonly comprobantePagoObservaciones?: string;
  readonly usuarioValidacionNombre?: string;
  readonly comprobantePagoCargadoPorNombre?: string;
  readonly asesorTelefono?: string;
  readonly asesorEmail?: string;
  readonly diasCredito?: number;
  readonly descuentoEspecial?: number;
  readonly envioGratis?: boolean;
  readonly prioridadEnvio?: EnvioPrioridad;
  readonly itemsList?: OrderItem[];
  readonly motivoAnulacion?: string;
  readonly fechaAnulacion?: string;
  readonly ventas?: Array<{
    id: string;
    orderId: string;
    clienteId: string;
    clienteNombre: string;
    asesorId: string;
    asesorNombre: string;
    fechaVenta: string;
    subtotal: number;
    impuestos: number;
    descuentos: number;
    total: number;
    estado: string;
    medioPago?: string;
  }>;
  /** @deprecated Use `ventas` (plural). */
  readonly venta?: {
    id: string;
    orderId: string;
    clienteId: string;
    clienteNombre: string;
    asesorId: string;
    asesorNombre: string;
    fechaVenta: string;
    subtotal: number;
    impuestos: number;
    descuentos: number;
    total: number;
    estado: string;
    medioPago?: string;
  };
  readonly customOrderId?: string;
  readonly createdAt?: string;
  readonly updatedAt?: string;

  constructor(data: OrderData) {
    Order.validate(data);

    this.id = data.id;
    this.numero = data.numero;
    this.cliente = data.cliente;
    this.clienteId = data.clienteId;
    this.asesor = data.asesor;
    this.asesorId = data.asesorId;
    this.tipoFlujo = data.tipoFlujo;
    this.fecha = data.fecha;
    this.subtotal = data.subtotal;
    this.impuestos = data.impuestos;
    this.descuentos = data.descuentos;
    this.total = data.total;
    this.items = data.items;
    this.estado = data.estado;
    this.prioridad = data.prioridad;
    this.observaciones = data.observaciones;
    this.medioPago = data.medioPago;
    this.fechaValidacion = data.fechaValidacion;
    this.usuarioValidacionId = data.usuarioValidacionId;
    this.razonRechazo = data.razonRechazo;
    this.observacionesRechazo = data.observacionesRechazo;
    this.comprobantePagoUrl = data.comprobantePagoUrl;
    this.comprobantePagoNombre = data.comprobantePagoNombre;
    this.comprobantePagoMime = data.comprobantePagoMime;
    this.comprobantePagoTamaño = data.comprobantePagoTamaño;
    this.comprobantePagoCargadoEn = data.comprobantePagoCargadoEn;
    this.comprobantePagoCargadoPorId = data.comprobantePagoCargadoPorId;
    this.comprobantePagoEstado = data.comprobantePagoEstado;
    this.comprobantePagoObservaciones = data.comprobantePagoObservaciones;
    this.usuarioValidacionNombre = data.usuarioValidacionNombre;
    this.comprobantePagoCargadoPorNombre = data.comprobantePagoCargadoPorNombre;
    this.asesorTelefono = data.asesorTelefono;
    this.asesorEmail = data.asesorEmail;
    this.diasCredito = data.diasCredito;
    this.descuentoEspecial = data.descuentoEspecial;
    this.envioGratis = data.envioGratis;
    this.prioridadEnvio = data.prioridadEnvio;
    this.itemsList = data.itemsList;
    this.motivoAnulacion = data.motivoAnulacion;
    this.fechaAnulacion = data.fechaAnulacion;
    this.ventas = data.ventas;
    this.venta = data.venta ?? (data.ventas && data.ventas[0]);
    this.customOrderId = data.customOrderId;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static validate(data: OrderData): void {
    if (!data.id.trim()) {
      throw new BadRequestError('El pedido debe tener un identificador');
    }
    if (!data.cliente.trim()) {
      throw new BadRequestError('El pedido debe tener un cliente asociado');
    }
    if (!data.asesor.trim()) {
      throw new BadRequestError('El pedido debe tener un asesor asignado');
    }
    if (!Number.isFinite(data.total) || data.total < 0) {
      throw new BadRequestError('El total del pedido debe ser mayor o igual a cero');
    }
    if (!Number.isInteger(data.items) || data.items < 0) {
      throw new BadRequestError('La cantidad de items del pedido debe ser un número entero positivo');
    }

    const itemsList = data.itemsList ?? [];
    if (itemsList.length > 0) {
      const itemsTotal = itemsList.reduce((sum, item) => sum + item.cantidad, 0);
      if (itemsTotal !== data.items) {
        throw new BadRequestError('La cantidad de items no coincide con la suma de itemsList');
      }

      const invalidItems = itemsList.filter(
        (item) =>
          !item.nombre.trim() ||
          !Number.isFinite(item.precio) ||
          item.precio < 0 ||
          !Number.isInteger(item.cantidad) ||
          item.cantidad <= 0
      );
      if (invalidItems.length > 0) {
        throw new BadRequestError('El pedido contiene items inválidos');
      }
    }
  }

  withStatus(estado: OrderStatus, updatedAt?: string): Order {
    const nextUpdatedAt = updatedAt ?? new Date().toISOString();
    return new Order({ ...this, estado, updatedAt: nextUpdatedAt });
  }

  getItemsCount(): number {
    return this.items;
  }

  canTransitionTo(nextStatus: OrderStatus): boolean {
    if (nextStatus === this.estado) return true;

    const validStates: OrderStatus[] = ['Pendiente', 'Aceptado', 'Enviado', 'Entregado', 'Rechazado', 'Cancelado'];
    if (!validStates.includes(this.estado) || !validStates.includes(nextStatus)) {
      return false;
    }

    const allowedTransitions: Record<OrderStatus, OrderStatus[]> = {
      Pendiente: ['Aceptado', 'Rechazado'],
      Aceptado: ['Enviado'],
      Enviado: ['Entregado'],
      Entregado: [],
      Cancelado: [],
      Listo: [],
      Rechazado: [],
      'En validación': [],
      'Recibo generado': [],
      'Recibo enviado': [],
    };
    return allowedTransitions[this.estado].includes(nextStatus);
  }

  isTerminal(): boolean {
    return this.estado === 'Entregado' || this.estado === 'Rechazado' || this.estado === 'Cancelado';
  }

  canAcceptPaymentProof(): boolean {
    return this.estado === 'Pendiente';
  }

  isSalesFlow(): boolean {
    return true;
  }

  isProductionFlow(): boolean {
    return false;
  }

  canBeValidated(): boolean {
    return this.estado === 'Pendiente';
  }

  canBeAccepted(): boolean {
    return this.estado === 'Pendiente' || this.estado === 'En validación';
  }

  canBeRejected(): boolean {
    return this.estado === 'Pendiente' || this.estado === 'En validación' || this.estado === 'Aceptado';
  }

  canBeAssigned(): boolean {
    return this.estado === 'Aceptado' || this.estado === 'Enviado' || this.estado === 'Recibo generado';
  }

  canBeDelivered(): boolean {
    return this.estado === 'Enviado' || this.estado === 'Recibo enviado';
  }

  canBeCanceled(): boolean {
    if (this.estado === 'Entregado' || this.estado === 'Rechazado' || this.estado === 'Cancelado' || this.estado === 'Enviado') {
      return false;
    }
    return true;
  }

  paymentProofRequired(): boolean {
    return this.estado === 'Pendiente';
  }

  hasPaymentProof(): boolean {
    return !!this.comprobantePagoUrl;
  }

  receiptRequired(): boolean {
    return this.estado === 'Entregado' || this.estado === 'Recibo enviado';
  }
}
