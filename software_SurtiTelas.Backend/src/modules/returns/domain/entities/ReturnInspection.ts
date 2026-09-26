import { BadRequestError } from '../../../../shared/domain/errors';

export type ReturnInspectionCondition = 'NUEVO' | 'DEFECTUOSO' | 'DANADO' | 'REPARABLE' | 'NO_RECUPERABLE';

export interface ReturnInspectionData {
  id?: string;
  returnRequestId: string;
  responsable?: string | null;
  fecha: Date;
  observaciones?: string | null;
  condicion: ReturnInspectionCondition;
  cantidadAceptada: number;
  cantidadRechazada: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ReturnInspection {
  readonly id?: string;
  readonly returnRequestId: string;
  readonly responsable: string | null;
  readonly fecha: Date;
  readonly observaciones: string | null;
  readonly condicion: ReturnInspectionCondition;
  quantityAceptada: number;
  quantityRechazada: number;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(data: ReturnInspectionData) {
    ReturnInspection.validate(data);
    this.id = data.id;
    this.returnRequestId = data.returnRequestId;
    this.responsable = data.responsable ?? null;
    this.fecha = data.fecha ?? new Date();
    this.observaciones = data.observaciones ?? null;
    this.condicion = data.condicion;
    this.quantityAceptada = data.cantidadAceptada;
    this.quantityRechazada = data.cantidadRechazada;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static validate(data: ReturnInspectionData): void {
    if (!data.returnRequestId || !data.returnRequestId.trim()) {
      throw new BadRequestError('La inspección debe estar asociada a una solicitud de devolución');
    }
    const validCondiciones: ReturnInspectionCondition[] = [
      'NUEVO', 'DEFECTUOSO', 'DANADO', 'REPARABLE', 'NO_RECUPERABLE',
    ];
    if (!validCondiciones.includes(data.condicion)) {
      throw new BadRequestError(`Condición de inspección inválida: ${data.condicion}`);
    }
    if (!Number.isInteger(data.cantidadAceptada) || data.cantidadAceptada < 0) {
      throw new BadRequestError('La cantidad aceptada debe ser un entero positivo o cero');
    }
    if (!Number.isInteger(data.cantidadRechazada) || data.cantidadRechazada < 0) {
      throw new BadRequestError('La cantidad rechazada debe ser un entero positivo o cero');
    }
  }

  toDTO() {
    return {
      id: this.id,
      returnRequestId: this.returnRequestId,
      responsable: this.responsable,
      fecha: this.fecha,
      observaciones: this.observaciones,
      condicion: this.condicion,
      cantidadAceptada: this.quantityAceptada,
      cantidadRechazada: this.quantityRechazada,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
