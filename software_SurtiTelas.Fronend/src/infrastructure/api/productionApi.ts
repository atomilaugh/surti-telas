import { api } from './httpClient';
import { PRODUCTION_STATUS_BACKEND_MAP, PRODUCTION_STATUS_FRONTEND_MAP, type EstadoProduccion } from '@/shared/constants/options';

export interface ProductionOrderDTO {
  id: string;
  pedidoId?: string;
  operarioId?: string;
  tallerId?: string;
  referencia: string;
  cantidad: number;
  fechaInicio: string;
  fechaEstimada: string;
  avance: number;
  estado: 'PENDIENTE' | 'ASIGNADA' | 'EN_PROCESO' | 'TERMINADO';
  tela?: string;
  colores: string[];
  curvaTallas?: Record<string, unknown>;
  notasTecnicas?: string;
  pedidoNumero?: string;
  pedidoCliente?: string;
  pedidoPrioridad?: string;
  pedidoItemNombre?: string;
  pedidoTotal?: number;
  taller?: { id: string; nombre: string; capacidad?: number };
  operario?: { id: string; nombre: string; telefono?: string };
  items?: ProductionItemDTO[];
}

export interface ProductionOrder {
  id: string;
  pedidoId?: string;
  operarioId?: string;
  tallerId?: string;
  referencia: string;
  cantidad: number;
  fechaInicio: string;
  fechaEstimada: string;
  avance: number;
  estado: EstadoProduccion;
  tela?: string;
  colores: string[];
  curvaTallas?: Record<string, number>;
  notasTecnicas?: string;
  taller?: { id: string; nombre: string; capacidad?: number };
  operario?: { id: string; nombre: string; telefono?: string };
  pedidoNumero?: string;
  pedidoCliente?: string;
  pedidoPrioridad?: string;
  pedidoItemNombre?: string;
  pedidoTotal?: number;
  items?: ProductionItem[];
}

export interface ProductionItemDTO {
  id: string;
  produccionId: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  unidad?: string;
  precioUnitario?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProductionItem {
  id: string;
  produccionId: string;
  nombre: string;
  descripcion?: string;
  cantidad: number;
  unidad?: string;
  precioUnitario?: number;
}

export function toProductionOrder(dto: ProductionOrderDTO): ProductionOrder {
  return {
    id: dto.id,
    pedidoId: dto.pedidoId,
    operarioId: dto.operarioId,
    tallerId: dto.tallerId,
    referencia: dto.referencia,
    cantidad: dto.cantidad,
    fechaInicio: dto.fechaInicio,
    fechaEstimada: dto.fechaEstimada,
    avance: dto.avance,
    estado: PRODUCTION_STATUS_FRONTEND_MAP[dto.estado] ?? 'Pendiente',
    tela: dto.tela,
    colores: dto.colores,
    curvaTallas: dto.curvaTallas as Record<string, number> | undefined,
    notasTecnicas: dto.notasTecnicas,
    taller: dto.taller,
    operario: dto.operario,
    pedidoNumero: dto.pedidoNumero,
    pedidoCliente: dto.pedidoCliente,
    pedidoPrioridad: dto.pedidoPrioridad,
    pedidoItemNombre: dto.pedidoItemNombre,
    pedidoTotal: dto.pedidoTotal,
    items: dto.items?.map(toProductionItem) ?? [],
  };
}

export function toProductionItem(dto: ProductionItemDTO): ProductionItem {
  return {
    id: dto.id,
    produccionId: dto.produccionId,
    nombre: dto.nombre,
    descripcion: dto.descripcion,
    cantidad: dto.cantidad,
    unidad: dto.unidad,
    precioUnitario: dto.precioUnitario,
  };
}

export const productionApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<ProductionOrder[]> {
    const response = await api.get<{ items: ProductionOrderDTO[]; meta: Record<string, unknown> }>('/production/orders', { query });
    const data = response?.items ?? [];
    return data.map(toProductionOrder);
  },

  async create(data: Partial<ProductionOrder>): Promise<ProductionOrder> {
    const body: Record<string, unknown> = {
      referencia: data.referencia,
      cantidad: data.cantidad,
      fechaEstimada: data.fechaEstimada,
      avance: data.avance ?? 0,
      estado: PRODUCTION_STATUS_BACKEND_MAP[data.estado ?? 'Pendiente'] ?? 'PENDIENTE',
      tela: data.tela,
      colores: data.colores ?? [],
      notasTecnicas: data.notasTecnicas,
      tallerId: data.tallerId,
      operarioId: data.operarioId,
    };
    const dto = await api.post<ProductionOrderDTO>('/production/orders', body);
    return toProductionOrder(dto);
  },

  async assignToWorkshop(id: string, tallerId: string): Promise<ProductionOrder> {
    const dto = await api.post<ProductionOrderDTO>(
      `/production/orders/${encodeURIComponent(id)}/workshop`,
      { tallerId },
    );
    return toProductionOrder(dto);
  },

  async update(id: string, changes: Partial<ProductionOrder>): Promise<ProductionOrder> {
    const body: Record<string, unknown> = {};
    if (changes.referencia !== undefined) body.referencia = changes.referencia;
    if (changes.cantidad !== undefined) body.cantidad = changes.cantidad;
    if (changes.fechaEstimada !== undefined) body.fechaEstimada = changes.fechaEstimada;
    if (changes.avance !== undefined) body.avance = changes.avance;
    if (changes.estado !== undefined) body.estado = PRODUCTION_STATUS_BACKEND_MAP[changes.estado] ?? 'PENDIENTE';
    if (changes.tela !== undefined) body.tela = changes.tela;
    if (changes.colores !== undefined) body.colores = changes.colores;
    if (changes.notasTecnicas !== undefined) body.notasTecnicas = changes.notasTecnicas;
    if (changes.tallerId !== undefined) body.tallerId = changes.tallerId;
    if (changes.operarioId !== undefined) body.operarioId = changes.operarioId;
    const dto = await api.patch<ProductionOrderDTO>(`/production/orders/${encodeURIComponent(id)}`, body);
    return toProductionOrder(dto);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/production/orders/${encodeURIComponent(id)}`);
  },

  async complete(id: string): Promise<ProductionOrder> {
    const dto = await api.post<ProductionOrderDTO>(`/production/orders/${encodeURIComponent(id)}/complete`);
    return toProductionOrder(dto);
  },

  async updateProgress(id: string, avance: number): Promise<ProductionOrder> {
    const dto = await api.patch<ProductionOrderDTO>(`/production/orders/${encodeURIComponent(id)}/progress`, { avance });
    return toProductionOrder(dto);
  },

  async getById(id: string): Promise<ProductionOrder | null> {
    try {
      const dto = await api.get<ProductionOrderDTO>(`/production/orders/${encodeURIComponent(id)}`);
      return toProductionOrder(dto);
    } catch {
      return null;
    }
  },

  async listItems(produccionId: string, query?: Record<string, string | number | boolean | undefined | null>): Promise<ProductionItem[]> {
    const response = await api.get<{ items: ProductionItemDTO[]; meta: Record<string, unknown> }>(`/production/orders/${encodeURIComponent(produccionId)}/items`, { query });
    const data = response?.items ?? [];
    return data.map(toProductionItem);
  },

  async createItem(produccionId: string, data: Partial<ProductionItem>): Promise<ProductionItem> {
    const body: Record<string, unknown> = {
      nombre: data.nombre,
      descripcion: data.descripcion,
      cantidad: data.cantidad,
      unidad: data.unidad,
      precioUnitario: data.precioUnitario,
    };
    const dto = await api.post<ProductionItemDTO>(`/production/orders/${encodeURIComponent(produccionId)}/items`, body);
    return toProductionItem(dto);
  },

  async updateItem(produccionId: string, itemId: string, changes: Partial<ProductionItem>): Promise<ProductionItem> {
    const body: Record<string, unknown> = {};
    if (changes.nombre !== undefined) body.nombre = changes.nombre;
    if (changes.descripcion !== undefined) body.descripcion = changes.descripcion;
    if (changes.cantidad !== undefined) body.cantidad = changes.cantidad;
    if (changes.unidad !== undefined) body.unidad = changes.unidad;
    if (changes.precioUnitario !== undefined) body.precioUnitario = changes.precioUnitario;
    const dto = await api.patch<ProductionItemDTO>(`/production/orders/${encodeURIComponent(produccionId)}/items/${encodeURIComponent(itemId)}`, body);
    return toProductionItem(dto);
  },

  async removeItem(produccionId: string, itemId: string): Promise<void> {
    await api.delete(`/production/orders/${encodeURIComponent(produccionId)}/items/${encodeURIComponent(itemId)}`);
  },
};
