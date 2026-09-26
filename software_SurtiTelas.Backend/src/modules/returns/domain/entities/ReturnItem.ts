import { BadRequestError } from '../../../../shared/domain/errors';

export type ReturnItemDefectoTipo = 'DEFECTO_CONFECCION' | 'DEFECTO_MATERIAL' | 'DESGASTE' | 'IMPERFECCION_VISUAL' | 'ERROR_CANTIDAD' | 'OTRO';

export interface ReturnItemData {
  id?: string;
  returnRequestId?: string | null;
  orderItemId?: string | null;
  productId?: string | null;
  ref: string;
  prenda: string;
  cantidadSolicitada: number;
  cantidadAprobada?: number | null;
  cantidadRecibida?: number | null;
  cantidadAceptada?: number | null;
  cantidadRechazada?: number | null;
  defectoTipo: ReturnItemDefectoTipo;
  defectoDescripcion?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ReturnItem {
  readonly id?: string;
  readonly returnRequestId?: string | null;
  readonly orderItemId?: string | null;
  readonly productId?: string | null;
  readonly ref: string;
  readonly prenda: string;
  cantidadSolicitada: number;
  cantidadAprobada: number | null;
  cantidadRecibida: number | null;
  cantidadAceptada: number | null;
  cantidadRechazada: number | null;
  readonly defectoTipo: ReturnItemDefectoTipo;
  readonly defectoDescripcion: string | null;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;

  constructor(data: ReturnItemData) {
    ReturnItem.validate(data);
    this.id = data.id;
    this.returnRequestId = data.returnRequestId ?? null;
    this.orderItemId = data.orderItemId ?? null;
    this.productId = data.productId ?? null;
    this.ref = data.ref;
    this.prenda = data.prenda;
    this.cantidadSolicitada = data.cantidadSolicitada;
    this.cantidadAprobada = data.cantidadAprobada ?? null;
    this.cantidadRecibida = data.cantidadRecibida ?? null;
    this.cantidadAceptada = data.cantidadAceptada ?? null;
    this.cantidadRechazada = data.cantidadRechazada ?? null;
    this.defectoTipo = data.defectoTipo;
    this.defectoDescripcion = data.defectoDescripcion ?? null;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }

  static validate(data: ReturnItemData): void {
    if (!data.ref || !data.ref.trim()) {
      throw new BadRequestError('El item de devolución debe tener una referencia');
    }
    if (!data.prenda || !data.prenda.trim()) {
      throw new BadRequestError('El item de devolución debe tener un nombre de prenda');
    }
    if (!Number.isInteger(data.cantidadSolicitada) || data.cantidadSolicitada <= 0) {
      throw new BadRequestError('La cantidad solicitada debe ser un entero mayor a 0');
    }
    if (!['DEFECTO_CONFECCION', 'DEFECTO_MATERIAL', 'DESGASTE', 'IMPERFECCION_VISUAL', 'ERROR_CANTIDAD', 'OTRO'].includes(data.defectoTipo)) {
      throw new BadRequestError('El tipo de defecto es inválido');
    }

    const cantidades = [
      data.cantidadAprobada,
      data.cantidadRecibida,
      data.cantidadAceptada,
      data.cantidadRechazada,
    ].filter((c): c is number => c !== null && c !== undefined && c !== 0);

    for (const cant of cantidades) {
      if (!Number.isInteger(cant) || cant < 0) {
        throw new BadRequestError('Las cantidades deben ser enteros positivos o cero');
      }
    }

    if (data.cantidadAprobada !== null && data.cantidadAprobada !== undefined) {
      if (data.cantidadAprobada > data.cantidadSolicitada) {
        throw new BadRequestError('La cantidad aprobada no puede exceder la cantidad solicitada');
      }
    }

    if (
      data.cantidadRecibida !== null &&
      data.cantidadRecibida !== undefined &&
      data.cantidadAceptada !== null &&
      data.cantidadAceptada !== undefined &&
      data.cantidadRechazada !== null &&
      data.cantidadRechazada !== undefined
    ) {
      if (data.cantidadAceptada + data.cantidadRechazada !== data.cantidadRecibida) {
        throw new BadRequestError(
          'La cantidad aceptada más la cantidad rechazada deben igualar la cantidad recibida'
        );
      }
    }

    if (
      data.cantidadAprobada !== null &&
      data.cantidadAprobada !== undefined &&
      data.cantidadRecibida !== null &&
      data.cantidadRecibida !== undefined &&
      data.cantidadRecibida > data.cantidadAprobada
    ) {
      throw new BadRequestError('La cantidad recibida no puede exceder la cantidad aprobada');
    }
  }

  approve(cantidad: number): void {
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new BadRequestError('La cantidad aprobada debe ser un entero positivo o cero');
    }
    if (cantidad > this.cantidadSolicitada) {
      throw new BadRequestError('La cantidad aprobada no puede exceder la cantidad solicitada');
    }
    this.cantidadAprobada = cantidad;
  }

  receive(cantidad: number): void {
    if (this.cantidadAprobada === null || this.cantidadAprobada === undefined) {
      throw new BadRequestError('Debe aprobarse el item antes de recibirlo');
    }
    if (!Number.isInteger(cantidad) || cantidad < 0) {
      throw new BadRequestError('La cantidad recibida debe ser un entero positivo o cero');
    }
    if (cantidad > this.cantidadAprobada) {
      throw new BadRequestError('La cantidad recibida no puede exceder la cantidad aprobada');
    }
    this.cantidadRecibida = cantidad;
  }

  inspeccionar(cantidadAceptada: number, cantidadRechazada: number): void {
    if (this.cantidadRecibida === null || this.cantidadRecibida === undefined) {
      throw new BadRequestError('Debe recibirse el item antes de inspeccionarlo');
    }
    if (!Number.isInteger(cantidadAceptada) || cantidadAceptada < 0) {
      throw new BadRequestError('La cantidad aceptada debe ser un entero positivo o cero');
    }
    if (!Number.isInteger(cantidadRechazada) || cantidadRechazada < 0) {
      throw new BadRequestError('La cantidad rechazada debe ser un entero positivo o cero');
    }
    if (cantidadAceptada + cantidadRechazada !== this.cantidadRecibida) {
      throw new BadRequestError(
        'La cantidad aceptada más la cantidad rechazada deben igualar la cantidad recibida'
      );
    }
    this.cantidadAceptada = cantidadAceptada;
    this.cantidadRechazada = cantidadRechazada;
  }

  toDTO() {
    return {
      id: this.id,
      returnRequestId: this.returnRequestId,
      orderItemId: this.orderItemId,
      productId: this.productId,
      ref: this.ref,
      prenda: this.prenda,
      cantidadSolicitada: this.cantidadSolicitada,
      cantidadAprobada: this.cantidadAprobada,
      cantidadRecibida: this.cantidadRecibida,
      cantidadAceptada: this.cantidadAceptada,
      cantidadRechazada: this.cantidadRechazada,
      defectoTipo: this.defectoTipo,
      defectoDescripcion: this.defectoDescripcion,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
