import { BadRequestError } from '../../../../shared/domain/errors';
import type { WarrantyPolicyTipo } from './WarrantyPolicy';

export type ReturnRequestStatus =
  | 'SOLICITADA'
  | 'EN_REVISION'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'PRODUCTO_RECIBIDO'
  | 'EN_INSPECCION'
  | 'RESUELTA';

export type ReturnResolutionType =
  | 'REINGRESO_EXISTENCIAS'
  | 'REPARACION'
  | 'DESCARTE'
  | 'DEVOLUCION_PROVEEDOR';

export interface ReturnRequestSnapshot {
  tipoGarantiaSnapshot?: WarrantyPolicyTipo | null;
  diasGarantiaSnapshot?: number | null;
  fechaInicioGarantia?: Date | null;
  fechaVencimientoGarantia?: Date | null;
}

export interface ReturnRequestData extends ReturnRequestSnapshot {
  id?: string;
  numeroDevolucion: string;
  orderId: string;
  customerId?: string | null;
  clienteSnapshot?: string | null;
  clienteIdSnapshot?: string | null;
  motivo?: string | null;
  observaciones?: string | null;
  cantidadTotal: number;
  cantidadInspeccionada?: number | null;
  estado: ReturnRequestStatus;
  canalRegistro?: string | null;
  evidencias?: string[] | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ReturnRequestFilters {
  estado?: ReturnRequestStatus;
  customerId?: string;
  cliente?: string;
  orderId?: string;
  page?: number;
  limit?: number;
}

export interface ReturnRequestListResult {
  data: ReturnRequestData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    nextCursor?: string;
  };
}

export class ReturnRequest {
  readonly id?: string;
  numeroDevolucion: string;
  readonly orderId: string;
  readonly customerId?: string | null;
  readonly clienteSnapshot: string | null;
  readonly clienteIdSnapshot: string | null;
  tipoGarantiaSnapshot: WarrantyPolicyTipo | null;
  diasGarantiaSnapshot: number | null;
  fechaInicioGarantia: Date | null;
  fechaVencimientoGarantia: Date | null;
  motivo: string | null;
  observaciones: string | null;
  cantidadTotal: number;
  cantidadInspeccionada: number | null;
  estado: ReturnRequestStatus;
  canalRegistro: string;
  evidencias: string[];
  readonly createdAt?: Date;
  updatedAt?: Date;

  constructor(data: ReturnRequestData) {
    ReturnRequest.validate(data);
    this.id = data.id;
    this.numeroDevolucion = data.numeroDevolucion;
    this.orderId = data.orderId;
    this.customerId = data.customerId ?? null;
    this.clienteSnapshot = data.clienteSnapshot ?? null;
    this.clienteIdSnapshot = data.clienteIdSnapshot ?? null;
    this.tipoGarantiaSnapshot = data.tipoGarantiaSnapshot ?? null;
    this.diasGarantiaSnapshot = data.diasGarantiaSnapshot ?? null;
    this.fechaInicioGarantia = data.fechaInicioGarantia ?? null;
    this.fechaVencimientoGarantia = data.fechaVencimientoGarantia ?? null;
    this.motivo = data.motivo ?? null;
    this.observaciones = data.observaciones ?? null;
    this.cantidadTotal = data.cantidadTotal;
    this.cantidadInspeccionada = data.cantidadInspeccionada ?? null;
    this.estado = data.estado;
    this.canalRegistro = data.canalRegistro ?? 'PORTAL';
    this.evidencias = data.evidencias ?? [];
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static validate(data: ReturnRequestData): void {
    if (!data.numeroDevolucion || !data.numeroDevolucion.trim()) {
      throw new BadRequestError('El número de devolución es obligatorio');
    }
    if (!data.orderId || !data.orderId.trim()) {
      throw new BadRequestError('El número de orden es obligatorio');
    }
    if (!Number.isInteger(data.cantidadTotal) || data.cantidadTotal <= 0) {
      throw new BadRequestError('La cantidad total debe ser un entero mayor a 0');
    }
    if (data.cantidadInspeccionada !== undefined && data.cantidadInspeccionada !== null) {
      if (!Number.isInteger(data.cantidadInspeccionada) || data.cantidadInspeccionada < 0) {
        throw new BadRequestError('La cantidad inspeccionada debe ser un entero positivo o cero');
      }
    }
    const validEstados: ReturnRequestStatus[] = [
      'SOLICITADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA',
      'PRODUCTO_RECIBIDO', 'EN_INSPECCION', 'RESUELTA',
    ];
    if (!validEstados.includes(data.estado)) {
      throw new BadRequestError(`Estado inválido: ${data.estado}`);
    }
  }

  static getInitialState(): ReturnRequestStatus {
    return 'SOLICITADA';
  }

  static getEstadosTerminales(): ReturnRequestStatus[] {
    return ['RECHAZADA', 'RESUELTA'];
  }

  canTransitionTo(nextStatus: ReturnRequestStatus): boolean {
    if (nextStatus === this.estado) return true;

    const validEstados: ReturnRequestStatus[] = [
      'SOLICITADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA',
      'PRODUCTO_RECIBIDO', 'EN_INSPECCION', 'RESUELTA',
    ];

    if (!validEstados.includes(this.estado) || !validEstados.includes(nextStatus)) {
      return false;
    }

    const allowedTransitions: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
      SOLICITADA: ['EN_REVISION', 'RECHAZADA'],
      EN_REVISION: ['APROBADA', 'RECHAZADA'],
      APROBADA: ['PRODUCTO_RECIBIDO'],
      RECHAZADA: [],
      PRODUCTO_RECIBIDO: ['EN_INSPECCION'],
      EN_INSPECCION: ['RESUELTA'],
      RESUELTA: [],
    };

    return allowedTransitions[this.estado].includes(nextStatus);
  }

  isTerminal(): boolean {
    return this.estado === 'RECHAZADA' || this.estado === 'RESUELTA';
  }

  cambiarEstado(nextStatus: ReturnRequestStatus): void {
    if (!this.canTransitionTo(nextStatus)) {
      throw new BadRequestError(
        `No se puede transitar de '${this.estado}' a '${nextStatus}'`
      );
    }
    this.estado = nextStatus;
  }

  applyWarrantyPolicy(
    policyTipo: WarrantyPolicyTipo,
    policyDias: number,
    fechaInicio: Date,
  ): void {
    this.tipoGarantiaSnapshot = policyTipo;
    this.diasGarantiaSnapshot = policyDias;
    this.fechaInicioGarantia = fechaInicio;
    const vencimiento = new Date(fechaInicio);
    vencimiento.setDate(vencimiento.getDate() + policyDias);
    this.fechaVencimientoGarantia = vencimiento;
  }

  tieneGarantiaVigente(fechaActual: Date = new Date()): boolean {
    if (!this.fechaVencimientoGarantia) return false;
    if (this.tipoGarantiaSnapshot !== 'VENTA' && this.tipoGarantiaSnapshot !== 'FABRICANTE') {
      return false;
    }
    return fechaActual <= this.fechaVencimientoGarantia;
  }

  setObservaciones(observaciones: string): void {
    this.observaciones = observaciones;
  }

  setMotivo(motivo: string): void {
    this.motivo = motivo;
  }

  setCantidadInspeccionada(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new BadRequestError('La cantidad inspeccionada debe ser un entero positivo o cero');
    }
    this.cantidadInspeccionada = cantidad;
  }

  toDTO() {
    return {
      id: this.id,
      numeroDevolucion: this.numeroDevolucion,
      orderId: this.orderId,
      customerId: this.customerId,
      clienteSnapshot: this.clienteSnapshot,
      clienteIdSnapshot: this.clienteIdSnapshot,
      tipoGarantiaSnapshot: this.tipoGarantiaSnapshot,
      diasGarantiaSnapshot: this.diasGarantiaSnapshot,
      fechaInicioGarantia: this.fechaInicioGarantia,
      fechaVencimientoGarantia: this.fechaVencimientoGarantia,
      motivo: this.motivo,
      observaciones: this.observaciones,
      cantidadTotal: this.cantidadTotal,
      cantidadInspeccionada: this.cantidadInspeccionada,
      estado: this.estado,
      canalRegistro: this.canalRegistro,
      evidencias: this.evidencias,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
