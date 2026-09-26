import type { Cliente } from '@/core/types';
import { api } from './httpClient';

/** DTO del backend (CustomerMapper.toCustomerData). */
export interface CustomerDTO {
  id: string;
  nombre: string;
  apellidos?: string;
  email?: string;
  ciudad?: string;
  tel?: string;
  asesorId?: string;
  asesor?: string;
  nit?: string;
  direccion?: string;
  tipoDocumento?: Cliente['tipoDocumento'];
  numeroDocumento?: string;
  cupoTotal: number;
  cupoUsado: number;
  deudaVencida: number;
  isTrustedCustomer: boolean;
  estado: 'ACTIVO' | 'INACTIVO';
  pedidos: number;
}

export function toCliente(dto: CustomerDTO): Cliente {
  return {
    id: dto.id,
    nombre: dto.nombre,
    apellidos: dto.apellidos,
    email: dto.email,
    ciudad: dto.ciudad ?? '',
    tel: dto.tel ?? '',
    asesor: dto.asesor ?? '',
    asesorId: dto.asesorId,
    pedidos: dto.pedidos ?? 0,
    estado: dto.estado === 'INACTIVO' ? 'Inactivo' : 'Activo',
    nit: dto.nit,
    direccion: dto.direccion ?? '',
    tipoDocumento: dto.tipoDocumento,
    numeroDocumento: dto.numeroDocumento ?? dto.nit ?? '',
    cupoTotal: dto.cupoTotal,
    cupoUsado: dto.cupoUsado,
    deudaVencida: dto.deudaVencida,
    isTrustedCustomer: dto.isTrustedCustomer,
  };
}

function toCustomerBody(c: Partial<Cliente>): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (c.nombre !== undefined) body.nombre = c.nombre;
  if (c.apellidos !== undefined) body.apellidos = c.apellidos;
  if (c.email !== undefined) body.email = c.email;
  if (c.ciudad !== undefined) body.ciudad = c.ciudad;
  if (c.tel !== undefined) body.tel = c.tel;
  if (c.nit !== undefined) body.nit = c.nit;
  if (c.cupoTotal !== undefined) body.cupoTotal = c.cupoTotal;
  if (c.cupoUsado !== undefined) body.cupoUsado = c.cupoUsado;
  if (c.deudaVencida !== undefined) body.deudaVencida = c.deudaVencida;
  if (c.isTrustedCustomer !== undefined) body.isTrustedCustomer = c.isTrustedCustomer;
  if (c.estado !== undefined) body.estado = c.estado === 'Inactivo' ? 'Inactivo' : 'Activo';
  if ((c as Record<string, unknown>).asesorId !== undefined) body.asesorId = (c as Record<string, unknown>).asesorId;
  if (c.direccion !== undefined) body.direccion = c.direccion;
  if ((c as Record<string, unknown>).tipoDocumento !== undefined) body.tipoDocumento = (c as Record<string, unknown>).tipoDocumento;
  return body;
}

/** Resultado de la búsqueda de clientes por número de identificación. */
export interface CustomerDocumentMatch {
  id: string;
  nombre: string;
  documento: string;
  tipoDocumento: string | null;
  telefono: string | null;
  email: string | null;
}

export interface CustomersListResult {
  data: Cliente[];
  meta: {
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
    nextCursor?: string | null;
    activos?: number;
    inactivos?: number;
    conDeuda?: number;
  };
}

export const customersApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<CustomersListResult> {
    const response = await api.get<{ items: CustomerDTO[]; totalRecords: number; page: number; limit: number; totalPages: number; nextCursor: string | null; activos?: number; inactivos?: number; conDeuda?: number }>('/customers', { query });
    const data = (response?.items ?? []).map(toCliente);
    const meta = {
      totalRecords: response?.totalRecords ?? 0,
      page: response?.page ?? 1,
      limit: response?.limit ?? 10,
      totalPages: response?.totalPages ?? 1,
      nextCursor: response?.nextCursor ?? undefined,
      activos: response?.activos,
      inactivos: response?.inactivos,
      conDeuda: response?.conDeuda,
    };
    return { data, meta };
  },

  async create(c: Partial<Cliente>): Promise<Cliente> {
    const dto = await api.post<CustomerDTO>('/customers', toCustomerBody(c));
    return toCliente(dto);
  },

  async update(id: string, changes: Partial<Cliente>): Promise<Cliente> {
    const dto = await api.patch<CustomerDTO>(
      `/customers/${encodeURIComponent(id)}`,
      toCustomerBody(changes),
    );
    return toCliente(dto);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/customers/${encodeURIComponent(id)}`);
  },

  /** Obtiene un cliente por su id de Customer (no de User). */
  async getById(id: string): Promise<Cliente> {
    const dto = await api.get<CustomerDTO>(`/customers/${encodeURIComponent(id)}`);
    return toCliente(dto);
  },

  async getTrustedStatus(): Promise<{ isTrustedCustomer: boolean }> {
    return api.get('/customers/me/trusted-status');
  },

  /**
   * Busca clientes por número de identificación (NIT/CC) directamente en el backend.
   * No descarga el listado completo de clientes para filtrar en el navegador.
   */
  async searchByDocument(document: string): Promise<CustomerDocumentMatch[]> {
    const response = await api.get<{ items: CustomerDocumentMatch[]; total: number }>('/customers/search', {
      query: { document },
    });
    return response?.items ?? [];
  },
};
