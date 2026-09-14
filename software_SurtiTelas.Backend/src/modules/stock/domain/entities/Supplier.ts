export type SupplierStatus = 'ACTIVO' | 'INACTIVO';

import { BadRequestError } from '../../../../shared/domain/errors';

export interface SupplierData {
  id?: string;
  nombre: string;
  nit: string;
  tipoPersona?: 'NATURAL' | 'JURIDICA' | null;
  numeroDocumento?: string | null;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  materiales: string[];
  estado: SupplierStatus;
  calificacion: number;
  pedidosRealizados: number;
  ultimoPedido?: Date;
}

export class Supplier {
  readonly id?: string;
  readonly nombre: string;
  readonly nit: string;
  readonly tipoPersona?: 'NATURAL' | 'JURIDICA' | null;
  readonly numeroDocumento?: string | null;
  readonly telefono?: string;
  readonly email?: string;
  readonly direccion?: string;
  readonly ciudad?: string;
  readonly materiales: string[];
  readonly estado: SupplierStatus;
  readonly calificacion: number;
  readonly pedidosRealizados: number;
  readonly ultimoPedido?: Date;

  constructor(data: SupplierData) {
    Supplier.validate(data);
    this.id = data.id;
    this.nombre = data.nombre;
    this.nit = data.nit;
    this.tipoPersona = data.tipoPersona;
    this.numeroDocumento = data.numeroDocumento;
    this.telefono = data.telefono;
    this.email = data.email;
    this.direccion = data.direccion;
    this.ciudad = data.ciudad;
    this.materiales = data.materiales;
    this.estado = data.estado;
    this.calificacion = data.calificacion;
    this.pedidosRealizados = data.pedidosRealizados;
    this.ultimoPedido = data.ultimoPedido;
  }

  static validate(data: SupplierData): void {
    if (!data.nombre.trim()) throw new BadRequestError('El proveedor debe tener un nombre');
    if (!data.nit.trim()) throw new BadRequestError('El proveedor debe tener un NIT');
    if (data.calificacion < 0 || data.calificacion > 5) {
      throw new BadRequestError('La calificación debe estar entre 0 y 5');
    }
  }

  activate(): Supplier {
    if (this.estado === 'ACTIVO') return this;
    return new Supplier({ ...this, estado: 'ACTIVO' });
  }

  deactivate(): Supplier {
    if (this.estado === 'INACTIVO') return this;
    return new Supplier({ ...this, estado: 'INACTIVO' });
  }
}

