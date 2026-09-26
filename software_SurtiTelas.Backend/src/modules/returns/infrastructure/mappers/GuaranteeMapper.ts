/* eslint-disable @typescript-eslint/no-explicit-any */
import { WarrantyPolicy } from '../../domain/entities/WarrantyPolicy';
import { ReturnRequest, type ReturnRequestData } from '../../domain/entities/ReturnRequest';
import { ReturnItem, type ReturnItemData } from '../../domain/entities/ReturnItem';
import { ReturnInspection } from '../../domain/entities/ReturnInspection';
import { ReturnResolution } from '../../domain/entities/ReturnResolution';
import { ReturnHistory } from '../../domain/entities/ReturnHistory';

export function toWarrantyPolicyEntity(row: any): WarrantyPolicy {
  return new WarrantyPolicy({
    id: row.id,
    tipo: row.tipo as any,
    diasGarantia: row.diasGarantia,
    activa: row.activa,
    descripcion: row.descripcion,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toWarrantyPolicyCreateInput(input: {
  tipo: any;
  diasGarantia: number;
  activa?: boolean;
  descripcion?: string;
}): any {
  return {
    tipo: input.tipo,
    diasGarantia: input.diasGarantia,
    activa: input.activa ?? true,
    descripcion: input.descripcion,
  };
}

export function toWarrantyPolicyUpdateInput(changes: {
  tipo?: any;
  diasGarantia?: number;
  activa?: boolean;
  descripcion?: string;
}): any {
  const data: any = {};
  if (changes.tipo !== undefined) data.tipo = changes.tipo;
  if (changes.diasGarantia !== undefined) data.diasGarantia = changes.diasGarantia;
  if (changes.activa !== undefined) data.activa = changes.activa;
  if (changes.descripcion !== undefined) data.descripcion = changes.descripcion;
  return data;
}

export function toReturnRequestData(row: any): ReturnRequestData {
  return {
    id: row.id,
    numeroDevolucion: row.numeroDevolucion,
    orderId: row.orderId,
    customerId: row.customerId ?? null,
    clienteSnapshot: row.clienteSnapshot ?? null,
    clienteIdSnapshot: row.clienteIdSnapshot ?? null,
    tipoGarantiaSnapshot: row.tipoGarantiaSnapshot ?? null,
    diasGarantiaSnapshot: row.diasGarantiaSnapshot ?? null,
    fechaInicioGarantia: row.fechaInicioGarantia ?? null,
    fechaVencimientoGarantia: row.fechaVencimientoGarantia ?? null,
    motivo: row.motivo ?? null,
    observaciones: row.observaciones ?? null,
    cantidadTotal: row.cantidadTotal ?? 0,
    cantidadInspeccionada: row.cantidadInspeccionada ?? 0,
    estado: row.estado as any,
    canalRegistro: row.canalRegistro ?? 'PORTAL',
    evidencias: row.evidencias ?? [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toReturnRequestEntity(row: any): ReturnRequest {
  return new ReturnRequest(toReturnRequestData(row));
}

export function toReturnRequestCreateInput(ent: ReturnRequest): any {
  return {
    numeroDevolucion: ent.numeroDevolucion,
    orderId: ent.orderId,
    customerId: ent.customerId,
    clienteSnapshot: ent.clienteSnapshot,
    clienteIdSnapshot: ent.clienteIdSnapshot,
    tipoGarantiaSnapshot: ent.tipoGarantiaSnapshot,
    diasGarantiaSnapshot: ent.diasGarantiaSnapshot,
    fechaInicioGarantia: ent.fechaInicioGarantia,
    fechaVencimientoGarantia: ent.fechaVencimientoGarantia,
    motivo: ent.motivo,
    observaciones: ent.observaciones,
    cantidadTotal: ent.cantidadTotal,
    cantidadInspeccionada: ent.cantidadInspeccionada,
    estado: ent.estado,
    canalRegistro: ent.canalRegistro,
    evidencias: ent.evidencias,
  };
}

export function toReturnRequestUpdateInput(changes: Partial<ReturnRequestData>): any {
  const data: any = {};
  if (changes.motivo !== undefined) data.motivo = changes.motivo;
  if (changes.observaciones !== undefined) data.observaciones = changes.observaciones;
  if (changes.cantidadTotal !== undefined) data.cantidadTotal = changes.cantidadTotal;
  if (changes.cantidadInspeccionada !== undefined) data.cantidadInspeccionada = changes.cantidadInspeccionada;
  if (changes.estado !== undefined) data.estado = changes.estado;
  if (changes.tipoGarantiaSnapshot !== undefined) data.tipoGarantiaSnapshot = changes.tipoGarantiaSnapshot;
  if (changes.diasGarantiaSnapshot !== undefined) data.diasGarantiaSnapshot = changes.diasGarantiaSnapshot;
  if (changes.fechaInicioGarantia !== undefined) data.fechaInicioGarantia = changes.fechaInicioGarantia;
  if (changes.fechaVencimientoGarantia !== undefined) data.fechaVencimientoGarantia = changes.fechaVencimientoGarantia;
  if (changes.canalRegistro !== undefined) data.canalRegistro = changes.canalRegistro;
  if (changes.evidencias !== undefined) data.evidencias = changes.evidencias;
  return data;
}

export function toReturnItemData(row: any): ReturnItemData {
  return {
    id: row.id,
    returnRequestId: row.returnRequestId,
    orderItemId: row.orderItemId ?? null,
    productId: row.productId ?? null,
    ref: row.ref,
    prenda: row.prenda,
    cantidadSolicitada: row.cantidadSolicitada,
    cantidadAprobada: row.cantidadAprobada ?? null,
    cantidadRecibida: row.cantidadRecibida ?? null,
    cantidadAceptada: row.cantidadAceptada ?? null,
    cantidadRechazada: row.cantidadRechazada ?? null,
    defectoTipo: row.defectoTipo as any,
    defectoDescripcion: row.defectoDescripcion ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toReturnItemEntity(row: any): ReturnItem {
  return new ReturnItem(toReturnItemData(row));
}

export function toReturnItemCreateInput(ent: ReturnItem): any {
  return {
    returnRequestId: ent.returnRequestId,
    orderItemId: ent.orderItemId,
    productId: ent.productId,
    ref: ent.ref,
    prenda: ent.prenda,
    cantidadSolicitada: ent.cantidadSolicitada,
    cantidadAprobada: ent.cantidadAprobada,
    cantidadRecibida: ent.cantidadRecibida,
    cantidadAceptada: ent.cantidadAceptada,
    cantidadRechazada: ent.cantidadRechazada,
    defectoTipo: ent.defectoTipo,
    defectoDescripcion: ent.defectoDescripcion,
  };
}

export function toReturnItemUpdateInput(changes: Partial<ReturnItemData>): any {
  const data: any = {};
  if (changes.cantidadAprobada !== undefined) data.cantidadAprobada = changes.cantidadAprobada;
  if (changes.cantidadRecibida !== undefined) data.cantidadRecibida = changes.cantidadRecibida;
  if (changes.cantidadAceptada !== undefined) data.cantidadAceptada = changes.cantidadAceptada;
  if (changes.cantidadRechazada !== undefined) data.cantidadRechazada = changes.cantidadRechazada;
  if (changes.defectoTipo !== undefined) data.defectoTipo = changes.defectoTipo;
  if (changes.defectoDescripcion !== undefined) data.defectoDescripcion = changes.defectoDescripcion;
  return data;
}

export function toReturnInspectionEntity(row: any): ReturnInspection {
  return new ReturnInspection({
    id: row.id,
    returnRequestId: row.returnRequestId,
    responsable: row.responsable ?? null,
    fecha: row.fecha,
    observaciones: row.observaciones ?? null,
    condicion: row.condicion as any,
    cantidadAceptada: row.cantidadAceptada,
    cantidadRechazada: row.cantidadRechazada,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toReturnInspectionCreateInput(ent: ReturnInspection): any {
  return {
    returnRequestId: ent.returnRequestId,
    responsable: ent.responsable,
    fecha: ent.fecha,
    observaciones: ent.observaciones,
    condicion: ent.condicion,
    cantidadAceptada: ent.quantityAceptada,
    cantidadRechazada: ent.quantityRechazada,
  };
}

export function toReturnResolutionEntity(row: any): ReturnResolution {
  return new ReturnResolution({
    id: row.id,
    returnRequestId: row.returnRequestId,
    tipo: row.tipo as any,
    cantidad: row.cantidad,
    responsable: row.responsable ?? null,
    observaciones: row.observaciones ?? null,
    fecha: row.fecha,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function toReturnResolutionCreateInput(ent: ReturnResolution): any {
  return {
    returnRequestId: ent.returnRequestId,
    tipo: ent.tipo,
    cantidad: ent.cantidad,
    responsable: ent.responsable,
    observaciones: ent.observaciones,
    fecha: ent.fecha,
  };
}

export function toReturnHistoryEntity(row: any): ReturnHistory {
  return new ReturnHistory({
    id: row.id,
    returnRequestId: row.returnRequestId,
    estadoAnterior: row.estadoAnterior ?? null,
    estadoNuevo: row.estadoNuevo ?? null,
    accion: row.accion as any,
    usuario: row.usuario ?? null,
    observaciones: row.observaciones ?? null,
    cantidad: row.cantidad ?? null,
    fecha: row.fecha,
    createdAt: row.createdAt,
  });
}

export function toReturnHistoryCreateInput(ent: ReturnHistory): any {
  return {
    returnRequestId: ent.returnRequestId,
    estadoAnterior: ent.estadoAnterior,
    estadoNuevo: ent.estadoNuevo,
    accion: ent.accion,
    usuario: ent.usuario,
    observaciones: ent.observaciones,
    cantidad: ent.cantidad,
    fecha: ent.fecha,
  };
}
