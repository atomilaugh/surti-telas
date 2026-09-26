/* eslint-disable @typescript-eslint/no-explicit-any */
import { Delivery, normalizeDeliveryEstado, type DeliveryData } from '../../domain/entities/Delivery';

export function toDeliveryData(row: any): DeliveryData {
  return {
    id: row.id,
    orderId: row.orderId,
    domiciliarioId: row.domiciliarioId,
    estado: normalizeDeliveryEstado(row.estado, row.domiciliarioId),
    direccion: row.direccion,
    ciudad: row.ciudad,
    telefono: row.telefono,
    notas: row.notas,
    motivo: row.motivo,
    asignadoEn: row.asignadoEn,
    inicioRutaEn: row.inicioRutaEn,
    entregadoEn: row.entregadoEn,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toDelivery(row: any): Delivery {
  return new Delivery(toDeliveryData(row));
}

export function toCreateInput(d: Delivery) {
  return {
    orderId: d.orderId,
    domiciliarioId: d.domiciliarioId,
    estado: d.estado,
    direccion: d.direccion,
    ciudad: d.ciudad,
    telefono: d.telefono,
    notas: d.notas,
    motivo: d.motivo,
    asignadoEn: d.asignadoEn,
    inicioRutaEn: d.inicioRutaEn,
    entregadoEn: d.entregadoEn,
  };
}

export function toUpdateInput(changes: Partial<DeliveryData>) {
  const data: Record<string, unknown> = {};
  if (changes.domiciliarioId !== undefined) data.domiciliarioId = changes.domiciliarioId;
  if (changes.estado !== undefined) data.estado = changes.estado;
  if (changes.direccion !== undefined) data.direccion = changes.direccion;
  if (changes.ciudad !== undefined) data.ciudad = changes.ciudad;
  if (changes.telefono !== undefined) data.telefono = changes.telefono;
  if (changes.notas !== undefined) data.notas = changes.notas;
  if (changes.motivo !== undefined) data.motivo = changes.motivo;
  if (changes.asignadoEn !== undefined) data.asignadoEn = changes.asignadoEn;
  if (changes.inicioRutaEn !== undefined) data.inicioRutaEn = changes.inicioRutaEn;
  if (changes.entregadoEn !== undefined) data.entregadoEn = changes.entregadoEn;
  return data;
}

