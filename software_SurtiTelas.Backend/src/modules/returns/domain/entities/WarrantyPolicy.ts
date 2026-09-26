import { BadRequestError } from '../../../../shared/domain/errors';

export type WarrantyPolicyTipo = 'VENTA' | 'FABRICANTE' | 'NINGUNA';

export interface WarrantyPolicyData {
  id?: string;
  tipo: WarrantyPolicyTipo;
  diasGarantia: number;
  activa?: boolean;
  descripcion?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WarrantyPolicy {
  readonly id?: string;
  readonly tipo: WarrantyPolicyTipo;
  readonly diasGarantia: number;
  readonly activa: boolean;
  readonly descripcion: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(data: WarrantyPolicyData) {
    WarrantyPolicy.validate(data);
    this.id = data.id;
    this.tipo = data.tipo;
    this.diasGarantia = data.diasGarantia;
    this.activa = data.activa ?? true;
    this.descripcion = data.descripcion ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static validate(data: WarrantyPolicyData): void {
    if (!data.tipo || !['VENTA', 'FABRICANTE', 'NINGUNA'].includes(data.tipo)) {
      throw new BadRequestError('El tipo de garantía es inválido');
    }
    if (!Number.isInteger(data.diasGarantia) || data.diasGarantia < 0) {
      throw new BadRequestError('Los días de garantía deben ser un entero positivo o cero');
    }
  }

  get isActive(): boolean {
    return this.activa;
  }

  isApplicable(): boolean {
    return this.activa && this.tipo !== 'NINGUNA';
  }

  calcularVencimiento(fechaInicio: Date): Date {
    const vencimiento = new Date(fechaInicio);
    vencimiento.setDate(vencimiento.getDate() + this.diasGarantia);
    return vencimiento;
  }

  toDTO() {
    return {
      id: this.id,
      tipo: this.tipo,
      diasGarantia: this.diasGarantia,
      activa: this.activa,
      descripcion: this.descripcion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
