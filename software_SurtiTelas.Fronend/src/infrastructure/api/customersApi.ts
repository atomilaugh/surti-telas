import type { Cliente } from '@/core/types';
import { api } from './httpClient';
import type { PaginatedResponse } from './pagination';

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
    pedidos: dto.pedidos ?? 0,
    estado: dto.estado === 'INACTIVO' ? 'Inactivo' : 'Activo',
    nit: dto.nit,
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
  if (c.numeroDocumento !== undefined) body.numeroDocumento = c.numeroDocumento;
  if ((c as Record<string, unknown>).password !== undefined) body.password = (c as Record<string, unknown>).password;
  return body;
}

export interface CustomersListResult {
  data: Cliente[];
  meta: {
    totalRecords: number;
    page: number;
    limit: number;
    totalPages: number;
    nextCursor?: string;
  };
}

export const customersApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<CustomersListResult> {
    const response = await api.get<{ items: CustomerDTO[]; meta: PaginatedResponse<CustomerDTO>['data']['meta'] }>('/customers', { query });
    const data = (response?.items ?? []).map(toCliente);
    const meta = response?.meta ?? { totalRecords: 0, page: 1, limit: 10, totalPages: 1 };
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

  async getTrustedStatus(): Promise<{ isTrustedCustomer: boolean }> {
    return api.get('/customers/me/trusted-status');
  },
};
