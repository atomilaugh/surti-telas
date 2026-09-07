import type { Pedido, PedidoItem, Venta } from '@/core/types';
import { api } from './httpClient';
import type { PaginatedResponse } from './pagination';
import { ORDER_STATUS_BACKEND_MAP, ORDER_STATUS_FRONTEND_MAP, type EstadoPedido } from '@/shared/constants/options';

/** DTO del backend (OrderMapper.toOrderData). */
export interface OrderDTO {
  id: string;
  numero: string;
  cliente: string;
  asesor: string;
  asesorTelefono?: string;
  asesorEmail?: string;
  fecha: string;
  items: number;
  total: number;
  estado: Pedido['estado'];
  prioridad?: Pedido['prioridad'];
  observaciones?: string;
  itemsList?: PedidoItem[];
  clienteId: string;
  asesorId: string;
  comprobantePagoUrl?: string;
  createdAt: string;
  updatedAt: string;
  diasCredito?: number;
  descuentoEspecial?: number;
  envioGratis?: boolean;
  prioridadEnvio?: 'Normal' | 'Express' | 'Urgente';
  tipoFlujo?: string;
  customOrderId?: string;
  /** Ventas generadas a partir de pagos confirmados (1 pago = 1 venta). */
  ventas?: Venta[];
  /** @deprecated Singular legacy. */
  venta?: Venta | null;
}

export interface CreateOrderInput {
  clienteId?: string;
  asesorId?: string;
  itemsList: PedidoItem[];
  prioridad?: Pedido['prioridad'];
  observaciones?: string;
  comprobantePago?: File;
  paymentMethod?: 'CASH' | 'TRANSFER' | 'CARD' | 'OTHER' | 'INSTALLMENTS';
  installments?: number;
  diasCredito?: number;
  descuentoEspecial?: number;
  envioGratis?: boolean;
  prioridadEnvio?: 'Normal' | 'Express' | 'Urgente';
}

function formatCurrency(value: number): string {
  return `$${Math.round(value).toLocaleString('es-CO')}`;
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const fmt = new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
  return fmt.replace(/\b([a-záéíóú])/g, (m) => m.toUpperCase());
}

export interface OrdersListResult {
  pedidos: Pedido[];
  idByNumero: Record<string, string>;
  meta: PaginatedResponse<OrderDTO>['data']['meta'];
}

export function toPedido(dto: OrderDTO): Pedido {
  return {
    id: dto.id,
    numero: dto.numero,
    cliente: dto.cliente,
    asesor: dto.asesor,
    asesorTelefono: dto.asesorTelefono,
    asesorEmail: dto.asesorEmail,
    fecha: formatDate(dto.fecha),
    items: dto.items,
    total: formatCurrency(dto.total),
    estado: (ORDER_STATUS_FRONTEND_MAP as Record<string, Pedido['estado']>)[dto.estado] ?? dto.estado,
    prioridad: dto.prioridad,
    observaciones: dto.observaciones,
    itemsList: dto.itemsList ?? [],
    clienteId: dto.clienteId,
    asesorId: dto.asesorId,
    comprobantePagoUrl: dto.comprobantePagoUrl,
    createdAt: dto.createdAt,
    diasCredito: dto.diasCredito,
    descuentoEspecial: dto.descuentoEspecial,
    envioGratis: dto.envioGratis,
    prioridadEnvio: dto.prioridadEnvio,
    tipoFlujo: dto.tipoFlujo,
    customOrderId: dto.customOrderId,
    ventas: dto.ventas ?? [],
    venta: dto.venta ?? null,
  };
}

export interface PaginatedApiResponse<T> {
  items: T[];
  totalRecords: number;
  page: number;
  limit: number;
  totalPages: number;
  nextCursor?: string | null;
}

export interface DashboardMetrics {
  totalOrders: number;
  totalCustomers: number;
  totalSales: number;
  ordersByStatus: { estado: string; cantidad: number }[];
  recentOrders: Array<{
    id: string;
    numero: string;
    clienteNombre: string;
    asesorNombre: string;
    total: number;
    estado: string;
    createdAt: string;
  }>;
  lowStockProducts: Array<{ id: string; ref: string; nombre: string; cantidadStock: number }>;
}

export const ordersApi = {
  async getDashboard(): Promise<DashboardMetrics> {
    const data = await api.get<DashboardMetrics>('/orders/dashboard');
    return data;
  },

  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<OrdersListResult> {
    const response = await api.get<PaginatedApiResponse<OrderDTO>>('/orders', { query });
    const data = response?.items ?? [];
    const idByNumero: Record<string, string> = {};
    const pedidos = data.map((dto) => {
      idByNumero[dto.numero] = dto.id;
      return toPedido(dto);
    });
    const meta = {
      totalRecords: response?.totalRecords ?? 0,
      page: response?.page ?? 1,
      limit: response?.limit ?? 10,
      totalPages: response?.totalPages ?? 1,
    };
    return { pedidos, idByNumero, meta };
  },

  async getById(id: string): Promise<Pedido | null> {
    try {
      const dto = await api.get<OrderDTO>(`/orders/${encodeURIComponent(id)}`);
      return dto ? toPedido(dto) : null;
    } catch {
      return null;
    }
  },

  async me(query?: Record<string, string | number | boolean | undefined | null>): Promise<OrdersListResult> {
    const response = await api.get<PaginatedApiResponse<OrderDTO>>('/orders/me', { query });
    const data = response?.items ?? [];
    const idByNumero: Record<string, string> = {};
    const pedidos = data.map((dto) => {
      idByNumero[dto.numero] = dto.id;
      return toPedido(dto);
    });
    const meta = {
      totalRecords: response?.totalRecords ?? 0,
      page: response?.page ?? 1,
      limit: response?.limit ?? 10,
      totalPages: response?.totalPages ?? 1,
    };
    return { pedidos, idByNumero, meta };
  },

  async create(input: CreateOrderInput): Promise<{ pedido: Pedido; id: string }> {
    const observaciones = [
      input.observaciones,
      input.comprobantePago ? `Comprobante: ${input.comprobantePago.name}` : null,
    ].filter(Boolean).join(' ');

    const body: Record<string, unknown> = {
      asesorId: input.asesorId,
      itemsList: input.itemsList,
      prioridad: input.prioridad,
      observaciones: observaciones || undefined,
      paymentMethod: input.paymentMethod,
      installments: input.installments,
      diasCredito: input.diasCredito,
      descuentoEspecial: input.descuentoEspecial,
      envioGratis: input.envioGratis,
      prioridadEnvio: input.prioridadEnvio,
    };
    if (input.clienteId) {
      body.clienteId = input.clienteId;
    }
    const dto = await api.post<OrderDTO>('/orders', body);
    return { pedido: toPedido(dto), id: dto.id };
  },

  async createForm(formData: FormData): Promise<{ pedido: Pedido; id: string }> {
    const dto = await api.postForm<OrderDTO>('/orders', formData);
    return { pedido: toPedido(dto), id: dto.id };
  },

  async updateStatus(id: string, estado: string): Promise<Pedido> {
    const dto = await api.patch<OrderDTO>(
      `/orders/${encodeURIComponent(id)}/status`,
      { estado },
    );
    return toPedido(dto);
  },

  async approveOrder(id: string, usuarioValidacionId: string): Promise<Pedido> {
    const dto = await api.post<OrderDTO>(`/orders/${encodeURIComponent(id)}/approve`, { usuarioValidacionId });
    return toPedido(dto);
  },

  async rejectOrder(id: string, usuarioValidacionId: string, razonRechazo: string, observacionesRechazo?: string): Promise<Pedido> {
    const dto = await api.post<OrderDTO>(`/orders/${encodeURIComponent(id)}/reject`, { usuarioValidacionId, razonRechazo, observacionesRechazo });
    return toPedido(dto);
  },

  async cancelOrder(id: string, motivoAnulacion?: string): Promise<Pedido> {
    const dto = await api.patch<OrderDTO>(`/orders/${encodeURIComponent(id)}/cancel`, { motivoAnulacion });
    return toPedido(dto);
  },

  async acceptOrder(id: string, medioPago?: string): Promise<Pedido> {
    const dto = await api.post<OrderDTO>(`/orders/${encodeURIComponent(id)}/accept`, { medioPago });
    return toPedido(dto);
  },

  async updateOrderFull(id: string, changes: { clienteId?: string; asesorId?: string; prioridad?: Pedido['prioridad']; observaciones?: string; itemsList?: PedidoItem[] }): Promise<Pedido> {
    const dto = await api.patch<OrderDTO>(
      `/orders/${encodeURIComponent(id)}`,
      changes,
    );
    return toPedido(dto);
  },

  async delete(id: string): Promise<void> {
    await api.delete<void>(`/orders/${encodeURIComponent(id)}`);
  },

  async adminList(query?: Record<string, string | number | boolean | undefined | null>): Promise<OrdersListResult> {
    const response = await api.get<PaginatedApiResponse<OrderDTO>>('/admin/orders', { query });
    const data = response?.items ?? [];
    const idByNumero: Record<string, string> = {};
    const pedidos = data.map((dto) => {
      idByNumero[dto.numero] = dto.id;
      return toPedido(dto);
    });
    const meta = {
      totalRecords: response?.totalRecords ?? 0,
      page: response?.page ?? 1,
      limit: response?.limit ?? 10,
      totalPages: response?.totalPages ?? 1,
    };
    return { pedidos, idByNumero, meta };
  },

  async adminUpdate(id: string, changes: { estado?: EstadoPedido; prioridad?: Pedido['prioridad']; observaciones?: string; asesorId?: string }): Promise<Pedido> {
    const body: Record<string, unknown> = {};
    if (changes.estado !== undefined) body.estado = ORDER_STATUS_BACKEND_MAP[changes.estado] ?? changes.estado;
    if (changes.prioridad !== undefined) body.prioridad = changes.prioridad;
    if (changes.observaciones !== undefined) body.observaciones = changes.observaciones;
    if (changes.asesorId !== undefined) body.asesorId = changes.asesorId;
    const dto = await api.patch<OrderDTO>(`/admin/orders/${encodeURIComponent(id)}`, body);
    return toPedido(dto);
  },

  async adminDelete(id: string): Promise<void> {
    await api.delete<void>(`/admin/orders/${encodeURIComponent(id)}`);
  },
};
