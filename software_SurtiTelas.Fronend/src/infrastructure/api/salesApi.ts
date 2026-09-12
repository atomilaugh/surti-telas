import { api, API_BASE_URL } from './httpClient';
import { tokenStorage } from './tokenStorage';
import type { PaginatedResponse } from './pagination';
import type { Venta } from '@/core/types';

interface SaleDTO {
  id: string;
  orderId: string;
  clienteId: string;
  clienteNombre: string;
  asesorId: string;
  asesorNombre: string;
  fechaVenta: string;
  subtotal: number;
  impuestos: number;
  descuentos: number;
  total: number;
  estado: string;
  motivoAnulacion?: string | null;
  medioPago?: string | null;
  createdAt: string;
  updatedAt: string;
  paymentId?: string | null;
  tipoPago?: string | null;
  numeroCuota?: number | null;
  totalCuotas?: number | null;
  esAnticipo?: boolean | null;
  esSaldo?: boolean | null;
  paymentStatus?: string | null;
  comprobantePagoUrl?: string | null;
  registradoPorId?: string | null;
  order?: {
    id: string;
    numero: string;
    estado: string;
    tipoFlujo: string;
    fecha: string;
    medioPago?: string | null;
    items: Array<{ id: string; nombre: string; precio: number; cantidad: number; productId?: string | null }>;
    payment?: { id: string; amount: number; status: string; method: string; paidAt?: string | null } | null;
    receipt?: { id: string; numero: string; estado: string; estadoEnvio?: string | null } | null;
    customOrder?: { id: string; numero: string; estado: string } | null;
  } | null;
}

function toVenta(dto: SaleDTO): Venta {
  const order = dto.order;
  return {
    id: dto.id,
    orderId: dto.orderId,
    numero: order?.numero ?? dto.id.slice(0, 8).toUpperCase(),
    clienteId: dto.clienteId,
    cliente: dto.clienteNombre,
    asesorId: dto.asesorId,
    asesor: dto.asesorNombre,
    fechaVenta: dto.fechaVenta,
    subtotal: dto.subtotal,
    impuestos: dto.impuestos,
    descuentos: dto.descuentos,
    total: dto.total,
    estado: (dto.estado as Venta['estado']) ?? 'COMPLETADA',
    motivoAnulacion: dto.motivoAnulacion ?? undefined,
    medioPago: dto.medioPago ?? undefined,
    itemsCount: order?.items?.length ?? 0,
    items: (order?.items ?? []).map((i) => ({
      id: i.id,
      nombre: i.nombre,
      precio: i.precio,
      cantidad: i.cantidad,
      productId: i.productId ?? null,
    })),
    orderEstado: order?.estado,
    payment: order?.payment ?? null,
    receipt: order?.receipt ?? null,
    customOrder: order?.customOrder ?? null,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    paymentId: dto.paymentId ?? null,
    tipoPago: dto.tipoPago ?? null,
    numeroCuota: dto.numeroCuota ?? null,
    totalCuotas: dto.totalCuotas ?? null,
    esAnticipo: dto.esAnticipo ?? null,
    esSaldo: dto.esSaldo ?? null,
    paymentStatus: dto.paymentStatus ?? null,
    comprobantePagoUrl: dto.comprobantePagoUrl ?? null,
    registradoPorId: dto.registradoPorId ?? null,
  };
}

export interface SalesListResult {
  data: Venta[];
  meta: PaginatedResponse<Venta>['data']['meta'];
}

export const salesApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<SalesListResult> {
    const response = await api.get<{ items: SaleDTO[]; meta: PaginatedResponse<SaleDTO>['data']['meta'] } | undefined>(
      '/sales',
      { query }
    );
    const items = (response?.items ?? []).map(toVenta);
    const meta = response?.meta ?? { totalRecords: 0, page: 1, limit: 10, totalPages: 1 };
    return { data: items, meta };
  },

  async getById(id: string): Promise<Venta | null> {
    try {
      const dto = await api.get<SaleDTO>(`/sales/${encodeURIComponent(id)}`);
      return dto ? toVenta(dto) : null;
    } catch {
      return null;
    }
  },

  async create(data: {
    orderId: string;
    medioPago?: string;
    observaciones?: string;
  }): Promise<{ orderId: string; saleId: string; receiptId: string }> {
    const result = await api.post<{ orderId: string; saleId: string; receiptId: string }>('/sales', data);
    return result;
  },

  async cancel(id: string, motivoAnulacion: string): Promise<{ success: boolean }> {
    const result = await api.post<{ success: boolean }>(`/sales/${encodeURIComponent(id)}/cancel`, {
      motivoAnulacion,
    });
    return result;
  },

  async addItem(id: string, item: { nombre: string; precio: number; cantidad: number; productId?: string }): Promise<{ success: boolean }> {
    const result = await api.post<{ success: boolean }>(`/sales/${encodeURIComponent(id)}/items`, item);
    return result;
  },

  async removeItem(id: string, itemId: string): Promise<{ success: boolean }> {
    const result = await api.delete<{ success: boolean }>(
      `/sales/${encodeURIComponent(id)}/items/${encodeURIComponent(itemId)}`
    );
    return result;
  },

  async remove(id: string): Promise<void> {
    await api.delete<void>(`/sales/${encodeURIComponent(id)}`);
  },

  async retryReceipt(orderId: string): Promise<{ success: boolean }> {
    const result = await api.post<{ success: boolean }>(
      `/sales-orders/${encodeURIComponent(orderId)}/retry-receipt`,
      {},
    );
    return result;
  },

  async getPdf(id: string): Promise<string> {
    const token = tokenStorage.getAccessToken();
    const headers: Record<string, string> = { Accept: 'text/html' };
    if (token) headers.Authorization = `Bearer ${token}`;

    const url = `${API_BASE_URL}/sales/${encodeURIComponent(id)}/pdf?_t=${Date.now()}`;
    const res = await fetch(url, {
      method: 'GET',
      headers,
      credentials: 'include',
      cache: 'no-store',
    });

    if (!res.ok) {
      const errorText = await res.text().catch(() => 'Error al generar PDF');
      throw new Error(errorText || `Error ${res.status}`);
    }

    return res.text();
  },
};

export default salesApi;
