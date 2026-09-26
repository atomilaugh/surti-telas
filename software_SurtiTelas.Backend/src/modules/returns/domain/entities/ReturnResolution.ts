import { BadRequestError } from '../../../../shared/domain/errors';
import type { ReturnResolutionType } from './ReturnRequest';

export interface ReturnResolutionData {
  id?: string;
  returnRequestId: string;
  tipo: ReturnResolutionType;
  cantidad: number;
  responsable?: string | null;
  observaciones?: string | null;
  fecha: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ReturnResolution {
  readonly id?: string;
  readonly returnRequestId: string;
  readonly tipo: ReturnResolutionType;
  readonly cantidad: number;
  readonly responsable: string | null;
  readonly observaciones: string | null;
  readonly fecha: Date;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(data: ReturnResolutionData) {
    ReturnResolution.validate(data);
    this.id = data.id;
    this.returnRequestId = data.returnRequestId;
    this.tipo = data.tipo;
    this.cantidad = data.cantidad;
    this.responsable = data.responsable ?? null;
    this.observaciones = data.observaciones ?? null;
    this.fecha = data.fecha ?? new Date();
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static validate(data: ReturnResolutionData): void {
    if (!data.returnRequestId || !data.returnRequestId.trim()) {
      throw new BadRequestError('La resolución debe estar asociada a una solicitud de devolución');
    }
    const validTipos: ReturnResolutionType[] = [
      'REINGRESO_EXISTENCIAS',
      'REPARACION',
      'DESCARTE',
      'DEVOLUCION_PROVEEDOR',
    ];
    if (!validTipos.includes(data.tipo)) {
      throw new BadRequestError(`Tipo de resolución inválido: ${data.tipo}`);
    }
    if (!Number.isInteger(data.cantidad) || data.cantidad < 0) {
      throw new BadRequestError('La cantidad de la resolución debe ser un entero positivo o cero');
    }
  }

  static getTipos(): ReturnResolutionType[] {
    return ['REINGRESO_EXISTENCIAS', 'REPARACION', 'DESCARTE', 'DEVOLUCION_PROVEEDOR'];
  }

  toDTO() {
    return {
      id: this.id,
      returnRequestId: this.returnRequestId,
      tipo: this.tipo,
      cantidad: this.cantidad,
      responsable: this.responsable,
      observaciones: this.observaciones,
      fecha: this.fecha,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
