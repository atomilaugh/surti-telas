import type { SupplierData, SupplierStatus } from '../../domain/entities/Supplier';

type SupplierRow = {
  id: string;
  nombre: string;
  nit: string;
  tipoPersona: string | null;
  numeroDocumento: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  materiales: string[];
  estado: string;
  calificacion: number;
  pedidosRealizados: number;
  ultimoPedido: Date | null;
};

export function toSupplierData(row: SupplierRow): SupplierData {
  return {
    id: row.id,
    nombre: row.nombre,
    nit: row.nit,
    tipoPersona: row.tipoPersona as ('NATURAL' | 'JURIDICA' | null) ?? null,
    numeroDocumento: row.numeroDocumento ?? undefined,
    telefono: row.telefono ?? undefined,
    email: row.email ?? undefined,
    direccion: row.direccion ?? undefined,
    ciudad: row.ciudad ?? undefined,
    materiales: row.materiales,
    estado: row.estado as SupplierStatus,
    calificacion: row.calificacion,
    pedidosRealizados: row.pedidosRealizados,
    ultimoPedido: row.ultimoPedido ?? undefined,
  };
}

export const SUPPLIER_STATUS_TO_DB: Record<SupplierStatus, 'ACTIVO' | 'INACTIVO'> = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
};

export const DB_TO_SUPPLIER_STATUS: Record<string, SupplierStatus> = {
  ACTIVO: 'ACTIVO',
  INACTIVO: 'INACTIVO',
};
