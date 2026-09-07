import { OrderPriority as DbPriority, OrderStatus as DbStatus } from '@prisma/client';
import type { OrderData, OrderItem, OrderPriority, OrderStatus, OrderFlow, EnvioPrioridad } from '../../domain/entities/Order';

const STATUS_TO_DB: Record<OrderStatus, DbStatus> = {
  Pendiente: 'PENDIENTE',
  Aceptado: 'ACEPTADO',
  Listo: 'LISTO',
  Enviado: 'DESPACHADO',
  Entregado: 'ENTREGADO',
  Rechazado: 'RECHAZADO',
  'En validación': 'EN_VALIDACION',
  'Recibo generado': 'RECIBO_GENERADO',
  'Recibo enviado': 'RECIBO_ENVIADO',
  Cancelado: 'CANCELADO',
};

const DB_TO_STATUS: Record<DbStatus, OrderStatus> = {
  NUEVO: 'Pendiente',
  EN_PRODUCCION: 'Listo',
  LISTO: 'Listo',
  DESPACHADO: 'Enviado',
  EN_CAMINO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  PENDIENTE: 'Pendiente',
  EN_VALIDACION: 'En validación',
  ACEPTADO: 'Aceptado',
  RECHAZADO: 'Rechazado',
  RECIBO_GENERADO: 'Recibo generado',
  RECIBO_ENVIADO: 'Recibo enviado',
};

const PRIORITY_TO_DB: Record<OrderPriority, DbPriority> = {
  Estándar: 'ESTANDAR',
  Prioritario: 'PRIORITARIO',
};

const DB_TO_PRIORITY: Record<DbPriority, OrderPriority> = {
  ESTANDAR: 'Estándar',
  PRIORITARIO: 'Prioritario',
};

export type OrderRow = {
  id: string;
  numero: string;
  clienteId: string;
  cliente: { nombre: string } | null;
  clienteNombre: string;
  asesorId: string;
  asesor: { nombre: string; telefono?: string | null; email?: string | null } | null;
  asesorNombre: string;
  tipoFlujo: string;
  fecha: Date;
  subtotal: { toNumber(): number } | null;
  impuestos: { toNumber(): number } | null;
  descuentos: { toNumber(): number } | null;
  total: { toNumber(): number };
  itemsCount: number;
  estado: DbStatus;
  prioridad: DbPriority;
  observaciones: string | null;
  medioPago: string | null;
  fechaValidacion: Date | null;
  usuarioValidacionId: string | null;
  usuarioValidacion: { nombre: string } | null;
  razonRechazo: string | null;
  observacionesRechazo: string | null;
  comprobantePagoUrl: string | null;
  comprobantePagoNombre: string | null;
  comprobantePagoMime: string | null;
  comprobantePagoTamaño: number | null;
  comprobantePagoCargadoEn: Date | null;
  comprobantePagoCargadoPorId: string | null;
  comprobantePagoCargadoPor: { nombre: string } | null;
  comprobantePagoEstado: string | null;
  comprobantePagoObservaciones: string | null;
  items: Array<{ productId: string | null; customOrderItemId: string | null; nombre: string; precio: { toNumber(): number }; cantidad: number }>;
  custom_orders: { id: string } | null;
  venta?: {
    id: string;
    orderId: string;
    clienteId: string;
    clienteNombre: string;
    asesorId: string;
    asesorNombre: string;
    fechaVenta: Date;
    subtotal: { toNumber(): number };
    impuestos: { toNumber(): number };
    descuentos: { toNumber(): number };
    total: { toNumber(): number };
    estado: string;
    medioPago: string | null;
  } | null;
  ventas: Array<{
    id: string;
    orderId: string;
    clienteId: string;
    clienteNombre: string;
    asesorId: string;
    asesorNombre: string;
    fechaVenta: Date;
    subtotal: { toNumber(): number };
    impuestos: { toNumber(): number };
    descuentos: { toNumber(): number };
    total: { toNumber(): number };
    estado: string;
    medioPago: string | null;
  }> | null;
  diasCredito: number | null;
  descuentoEspecial: { toNumber(): number } | null;
  envioGratis: boolean | null;
  prioridadEnvio: string | null;
  motivoAnulacion: string | null;
  fechaAnulacion: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export function toOrderData(row: OrderRow): OrderData {
  return {
    id: row.id,
    numero: row.numero,
    cliente: row.clienteNombre || row.cliente?.nombre || '',
    clienteId: row.clienteId,
    asesor: row.asesorNombre || row.asesor?.nombre || '',
    asesorId: row.asesorId,
    asesorTelefono: row.asesor?.telefono ?? undefined,
    asesorEmail: row.asesor?.email ?? undefined,
    tipoFlujo: row.tipoFlujo as OrderFlow,
    fecha: row.fecha.toISOString(),
    subtotal: row.subtotal ? Number(row.subtotal.toNumber()) : undefined,
    impuestos: row.impuestos ? Number(row.impuestos.toNumber()) : undefined,
    descuentos: row.descuentos ? Number(row.descuentos.toNumber()) : undefined,
    total: Number(row.total.toNumber()),
    estado: DB_TO_STATUS[row.estado],
    prioridad: DB_TO_PRIORITY[row.prioridad],
    observaciones: row.observaciones ?? undefined,
    medioPago: row.medioPago ?? undefined,
    fechaValidacion: row.fechaValidacion?.toISOString(),
    usuarioValidacionId: row.usuarioValidacionId ?? undefined,
    usuarioValidacionNombre: row.usuarioValidacion?.nombre,
    razonRechazo: row.razonRechazo ?? undefined,
    observacionesRechazo: row.observacionesRechazo ?? undefined,
    comprobantePagoUrl: row.comprobantePagoUrl ?? undefined,
    comprobantePagoNombre: row.comprobantePagoNombre ?? undefined,
    comprobantePagoMime: row.comprobantePagoMime ?? undefined,
    comprobantePagoTamaño: row.comprobantePagoTamaño ?? undefined,
    comprobantePagoCargadoEn: row.comprobantePagoCargadoEn?.toISOString(),
    comprobantePagoCargadoPorId: row.comprobantePagoCargadoPorId ?? undefined,
    comprobantePagoCargadoPorNombre: row.comprobantePagoCargadoPor?.nombre,
    comprobantePagoEstado: row.comprobantePagoEstado ?? undefined,
    comprobantePagoObservaciones: row.comprobantePagoObservaciones ?? undefined,
    diasCredito: row.diasCredito ?? undefined,
    descuentoEspecial: row.descuentoEspecial ? Number(row.descuentoEspecial.toNumber()) : undefined,
    envioGratis: row.envioGratis ?? undefined,
    prioridadEnvio: (row.prioridadEnvio ?? undefined) as EnvioPrioridad | undefined,
    motivoAnulacion: row.motivoAnulacion ?? undefined,
    fechaAnulacion: row.fechaAnulacion?.toISOString(),
    customOrderId: row.custom_orders?.id ?? undefined,
    itemsList: row.items.map(
      (i): OrderItem => ({
        productId: i.productId ?? undefined,
        customOrderItemId: i.customOrderItemId ?? undefined,
        nombre: i.nombre,
        precio: i.precio.toNumber(),
        cantidad: i.cantidad,
      })
    ),
    items: row.items.reduce((sum, i) => sum + i.cantidad, 0),
    ventas: row.ventas
      ? row.ventas.map((v) => ({
          id: v.id,
          orderId: v.orderId,
          clienteId: v.clienteId,
          clienteNombre: v.clienteNombre,
          asesorId: v.asesorId,
          asesorNombre: v.asesorNombre,
          fechaVenta: v.fechaVenta.toISOString(),
          subtotal: Number(v.subtotal.toNumber()),
          impuestos: Number(v.impuestos.toNumber()),
          descuentos: Number(v.descuentos.toNumber()),
          total: Number(v.total.toNumber()),
          estado: v.estado,
          medioPago: v.medioPago ?? undefined,
        }))
      : undefined,
    venta: row.ventas && row.ventas[0]
      ? {
          id: row.ventas[0].id,
          orderId: row.ventas[0].orderId,
          clienteId: row.ventas[0].clienteId,
          clienteNombre: row.ventas[0].clienteNombre,
          asesorId: row.ventas[0].asesorId,
          asesorNombre: row.ventas[0].asesorNombre,
          fechaVenta: row.ventas[0].fechaVenta.toISOString(),
          subtotal: Number(row.ventas[0].subtotal.toNumber()),
          impuestos: Number(row.ventas[0].impuestos.toNumber()),
          descuentos: Number(row.ventas[0].descuentos.toNumber()),
          total: Number(row.ventas[0].total.toNumber()),
          estado: row.ventas[0].estado,
          medioPago: row.ventas[0].medioPago ?? undefined,
        }
      : undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const orderStatusToDb = (status: OrderStatus): DbStatus => STATUS_TO_DB[status];
export const dbToOrderStatus = (status: DbStatus): OrderStatus => DB_TO_STATUS[status];
export const orderPriorityToDb = (priority: OrderPriority): DbPriority => PRIORITY_TO_DB[priority];
