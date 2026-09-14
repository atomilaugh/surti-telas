export interface RawMaterialData {
  id?: string;
  nombre: string;
  categoria?: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  proveedorId?: string;
  precioUnitario?: number;
}

import { BadRequestError } from '../../../../shared/domain/errors';

export class RawMaterial {
  readonly id?: string;
  readonly nombre: string;
  readonly categoria?: string;
  readonly unidadMedida: string;
  readonly stockActual: number;
  readonly stockMinimo: number;
  readonly proveedorId?: string;
  readonly precioUnitario?: number;

  constructor(data: RawMaterialData) {
    RawMaterial.validate(data);
    this.id = data.id;
    this.nombre = data.nombre;
    this.categoria = data.categoria;
    this.unidadMedida = data.unidadMedida;
    this.stockActual = data.stockActual;
    this.stockMinimo = data.stockMinimo;
    this.proveedorId = data.proveedorId;
    this.precioUnitario = data.precioUnitario;
  }

  static validate(data: RawMaterialData): void {
    if (!data.nombre.trim()) throw new BadRequestError('El insumo debe tener un nombre');
    if (!data.unidadMedida.trim()) throw new BadRequestError('El insumo debe tener una unidad de medida');
    if (!Number.isInteger(data.stockActual) || data.stockActual < 0) {
      throw new BadRequestError('El stock actual no puede ser negativo');
    }
    if (!Number.isInteger(data.stockMinimo) || data.stockMinimo < 0) {
      throw new BadRequestError('El stock mínimo no puede ser negativo');
    }
    if (data.precioUnitario !== undefined && data.precioUnitario < 0) throw new BadRequestError('El precio unitario no puede ser negativo');
  }

  necesitaReposicion(): boolean {
    return this.stockActual <= this.stockMinimo;
  }

  withStock(newStock: number): RawMaterial {
    const next = Math.max(0, newStock);
    return new RawMaterial({ ...this, stockActual: next });
  }
}

