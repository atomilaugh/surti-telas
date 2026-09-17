export type DeliveryEstado = 'ASIGNADO' | 'EN_RUTA' | 'ENTREGADO' | 'FALLIDO';

export interface DeliveryRutaItem {
  id: string;
  orderId: string;
  estado: DeliveryEstado;
  domiciliarioId?: string | null;
  domiciliarioNombre?: string | null;
  domiciliarioTelefono?: string | null;
  domiciliarioZona?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  notas?: string | null;
  motivo?: string | null;
  asignadoEn?: Date | null;
  inicioRutaEn?: Date | null;
  entregadoEn?: Date | null;
  order?: {
    numero?: string;
    cliente?: string;
    telefono?: string;
    direccion?: string;
    ciudad?: string;
    total?: number | null;
    estado?: string;
  };
}

export interface DeliveryData {
  id?: string;
  orderId: string;
  domiciliarioId?: string | null;
  estado: DeliveryEstado;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  notas?: string | null;
  motivo?: string | null;
  asignadoEn?: Date | null;
  inicioRutaEn?: Date | null;
  entregadoEn?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  orderNumero?: string | null;
  clienteNombre?: string | null;
  domiciliarioNombre?: string | null;
}

export interface DeliveryFilters {
  estado?: DeliveryEstado;
  domiciliarioId?: string;
  page?: number;
  limit?: number;
}

export interface DeliveryListResult {
  data: DeliveryData[];
  meta: {
    total: number;
    page: number;
    limit: number;
    nextCursor?: string;
  };
}

export class Delivery {
  readonly id?: string;
  orderId: string;
  domiciliarioId?: string | null;
  estado: DeliveryEstado;
  direccion?: string | null;
  ciudad?: string | null;
  telefono?: string | null;
  notas?: string | null;
  motivo?: string | null;
  asignadoEn?: Date | null;
  inicioRutaEn?: Date | null;
  entregadoEn?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  orderNumero?: string | null;
  clienteNombre?: string | null;
  domiciliarioNombre?: string | null;

  constructor(data: DeliveryData) {
    this.id = data.id;
    this.orderId = data.orderId;
    this.domiciliarioId = data.domiciliarioId ?? null;
    this.estado = data.estado;
    this.direccion = data.direccion ?? null;
    this.ciudad = data.ciudad ?? null;
    this.telefono = data.telefono ?? null;
    this.notas = data.notas ?? null;
    this.motivo = data.motivo ?? null;
    this.asignadoEn = data.asignadoEn ?? null;
    this.inicioRutaEn = data.inicioRutaEn ?? null;
    this.entregadoEn = data.entregadoEn ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
    this.orderNumero = data.orderNumero ?? null;
    this.clienteNombre = data.clienteNombre ?? null;
    this.domiciliarioNombre = data.domiciliarioNombre ?? null;
  }

  asignar() {
    this.estado = 'ASIGNADO';
    this.asignadoEn = new Date();
  }

  marcarEnRuta() {
    this.estado = 'EN_RUTA';
    this.inicioRutaEn = new Date();
  }

  marcarEntregado() {
    this.estado = 'ENTREGADO';
    this.entregadoEn = new Date();
  }

  marcarFallido() {
    this.estado = 'FALLIDO';
  }

  toDTO() {
    return {
      id: this.id,
      orderId: this.orderId,
      domiciliarioId: this.domiciliarioId,
      estado: this.estado,
      direccion: this.direccion,
      ciudad: this.ciudad,
      telefono: this.telefono,
      notas: this.notas,
      motivo: this.motivo,
      asignadoEn: this.asignadoEn,
      inicioRutaEn: this.inicioRutaEn,
      entregadoEn: this.entregadoEn,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      orderNumero: this.orderNumero,
      clienteNombre: this.clienteNombre,
      domiciliarioNombre: this.domiciliarioNombre,
    };
  }
}
