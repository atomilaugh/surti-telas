import { BadRequestError } from '../../../../shared/domain/errors';
import type { ReturnRequestStatus } from './ReturnRequest';

export type ReturnHistoryAccion =
  | 'ESTADO_CAMBIADO'
  | 'ITEM_AGREGADO'
  | 'ITEM_APROBADO'
  | 'ITEM_RECHAZADO'
  | 'ITEM_RECIBIDO'
  | 'INSPECCION_INICIADA'
  | 'INSPECCION_COMPLETADA'
  | 'RESOLUCION_ASIGNADA'
  | 'MOTIVO_ACTUALIZADO'
  | 'OBSERVACIONES_ACTUALIZADAS'
  | 'GARANTIA_APLICADA'
  | 'SOLICITUD_CREADA';

export interface ReturnHistoryData {
  id?: string;
  returnRequestId: string;
  estadoAnterior?: ReturnRequestStatus | null;
  estadoNuevo?: ReturnRequestStatus | null;
  accion: ReturnHistoryAccion;
  usuario?: string | null;
  observaciones?: string | null;
  cantidad?: number | null;
  fecha: Date;
  createdAt?: Date;
}

export class ReturnHistory {
  readonly id?: string;
  readonly returnRequestId: string;
  readonly estadoAnterior: ReturnRequestStatus | null;
  readonly estadoNuevo: ReturnRequestStatus | null;
  readonly accion: ReturnHistoryAccion;
  readonly usuario: string | null;
  readonly observaciones: string | null;
  readonly cantidad: number | null;
  readonly fecha: Date;
  readonly createdAt?: Date;

  constructor(data: ReturnHistoryData) {
    ReturnHistory.validate(data);
    this.id = data.id;
    this.returnRequestId = data.returnRequestId;
    this.estadoAnterior = data.estadoAnterior ?? null;
    this.estadoNuevo = data.estadoNuevo ?? null;
    this.accion = data.accion;
    this.usuario = data.usuario ?? null;
    this.observaciones = data.observaciones ?? null;
    this.cantidad = data.cantidad ?? null;
    this.fecha = data.fecha ?? new Date();
    this.createdAt = data.createdAt;
  }

  static validate(data: ReturnHistoryData): void {
    if (!data.returnRequestId || !data.returnRequestId.trim()) {
      throw new BadRequestError('El historial debe estar asociado a una solicitud de devolución');
    }
    const validAcciones: ReturnHistoryAccion[] = [
      'ESTADO_CAMBIADO',
      'ITEM_AGREGADO',
      'ITEM_APROBADO',
      'ITEM_RECHAZADO',
      'ITEM_RECIBIDO',
      'INSPECCION_INICIADA',
      'INSPECCION_COMPLETADA',
      'RESOLUCION_ASIGNADA',
      'MOTIVO_ACTUALIZADO',
      'OBSERVACIONES_ACTUALIZADAS',
      'GARANTIA_APLICADA',
      'SOLICITUD_CREADA',
    ];
    if (!validAcciones.includes(data.accion)) {
      throw new BadRequestError(`Acción de historial inválida: ${data.accion}`);
    }
    if (data.cantidad !== null && data.cantidad !== undefined) {
      if (!Number.isInteger(data.cantidad) || data.cantidad < 0) {
        throw new BadRequestError('La cantidad del historial debe ser un entero positivo o cero');
      }
    }
  }

  toDTO() {
    return {
      id: this.id,
      returnRequestId: this.returnRequestId,
      estadoAnterior: this.estadoAnterior,
      estadoNuevo: this.estadoNuevo,
      accion: this.accion,
      usuario: this.usuario,
      observaciones: this.observaciones,
      cantidad: this.cantidad,
      fecha: this.fecha,
      createdAt: this.createdAt,
    };
  }
}
