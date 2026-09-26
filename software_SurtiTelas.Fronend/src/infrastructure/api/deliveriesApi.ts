import { api } from './httpClient';

export interface DeliveryDTO {
  id: string;
  orderId: string;
  customerId?: string;
  domiciliarioId?: string | null;
  estado: 'PENDIENTE' | 'ASIGNADO' | 'EN_RUTA' | 'ENTREGADO' | 'FALLIDO';
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  notas?: string;
  motivo?: string;
  asignadoEn?: string;
  inicioRutaEn?: string;
  entregadoEn?: string;
  createdAt?: string;
  updatedAt?: string;
  orderNumero?: string;
  clienteNombre?: string;
  domiciliarioNombre?: string;
  order?: {
    numero?: string;
    cliente?: string;
    telefono?: string;
    direccion?: string;
    ciudad?: string;
    total?: number;
  };
}

export interface Delivery {
  id: string;
  orderId?: string;
  customerId?: string;
  domiciliarioId?: string | null;
  estado?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  notas?: string;
  asignadoEn?: string;
  entregadoEn?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function toDelivery(dto: DeliveryDTO): Delivery {
  return {
    id: dto.id,
    orderId: dto.orderId,
    customerId: dto.customerId,
    domiciliarioId: dto.domiciliarioId,
    estado: dto.estado,
    direccion: dto.direccion,
    ciudad: dto.ciudad,
    telefono: dto.telefono,
    notas: dto.notas,
    asignadoEn: dto.asignadoEn,
    entregadoEn: dto.entregadoEn,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export interface Domiciliario {
  id: string;
  nombre: string;
  email: string;
  tel: string;
  zona: string;
  entregas: number;
  estado: 'Activo' | 'Inactivo';
}

export function toDomiciliario(dto: DeliveryDTO): Domiciliario {
  const parts = [dto.direccion, dto.ciudad].filter(Boolean);
  return {
    id: dto.domiciliarioId ?? dto.id,
    nombre: dto.clienteNombre ?? dto.customerId ?? dto.domiciliarioNombre ?? 'Desconocido',
    email: '',
    tel: dto.telefono ?? '',
    zona: parts.join(', ') || 'Sin zona',
    entregas: 1,
    estado: dto.estado === 'ENTREGADO' || dto.estado === 'EN_RUTA' ? 'Activo' : 'Inactivo',
  };
}

export function aggregateDomiciliarios(deliveries: DeliveryDTO[]): Domiciliario[] {
  const map = new Map<string, Domiciliario>();

  for (const dto of deliveries) {
    const key = dto.domiciliarioId ?? dto.id;
    const existing = map.get(key);

    if (existing) {
      existing.entregas += 1;
      if (dto.estado === 'EN_RUTA' || dto.estado === 'ENTREGADO') {
        existing.estado = 'Activo';
      }
    } else {
      map.set(key, toDomiciliario(dto));
    }
  }

  return Array.from(map.values());
}

export interface DeliveryRutaItem {
  id: string;
  orderId: string;
  estado: 'PENDIENTE' | 'ASIGNADO' | 'EN_RUTA' | 'ENTREGADO' | 'FALLIDO';
  domiciliarioId?: string;
  domiciliarioNombre?: string;
  domiciliarioTelefono?: string;
  domiciliarioZona?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  notas?: string;
  motivo?: string;
  asignadoEn?: string;
  inicioRutaEn?: string;
  entregadoEn?: string;
  order?: {
    numero?: string;
    cliente?: string;
    telefono?: string;
    direccion?: string;
    ciudad?: string;
    total?: number;
  };
}

export const deliveriesApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<DeliveryDTO[]> {
    try {
      const response = await api.get<{ items: DeliveryDTO[]; meta: Record<string, unknown> }>('/deliveries', { query });
      return response?.items ?? [];
    } catch {
      return [] as DeliveryDTO[];
    }
  },

  async rutaDelDia(query?: Record<string, string | number | boolean | undefined | null>): Promise<DeliveryRutaItem[]> {
    const items = await api.get<DeliveryRutaItem[]>('/deliveries/ruta-del-dia', { query });
    return items ?? [];
  },

  async updateStatus(id: string, estado: DeliveryDTO['estado'], motivo?: string): Promise<DeliveryDTO> {
    const dto = await api.patch<DeliveryDTO>(`/deliveries/${encodeURIComponent(id)}/status`, { estado, motivo });
    return dto;
  },

  async update(id: string, changes: Partial<DeliveryDTO>): Promise<DeliveryDTO> {
    const dto = await api.patch<DeliveryDTO>(`/deliveries/${encodeURIComponent(id)}`, changes);
    return dto;
  },
};
