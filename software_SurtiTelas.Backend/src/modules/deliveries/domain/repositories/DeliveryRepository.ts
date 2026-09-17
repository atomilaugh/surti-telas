import type { Delivery, DeliveryData, DeliveryFilters, DeliveryListResult, DeliveryRutaItem } from '../entities/Delivery';
export type { Delivery, DeliveryData, DeliveryFilters, DeliveryListResult, DeliveryRutaItem } from '../entities/Delivery';

export interface CreateDeliveryInput {
  orderId: string;
  domiciliarioId?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  notas?: string;
}

export interface UpdateDeliveryInput {
  domiciliarioId?: string;
  direccion?: string;
  ciudad?: string;
  telefono?: string;
  notas?: string;
  estado?: Delivery['estado'];
}

export interface DeliveryRepository {
  list(filters?: DeliveryFilters): Promise<DeliveryListResult>;
  listRutaDelDia(filters?: { domiciliarioId?: string; estado?: string }): Promise<DeliveryRutaItem[]>;
  getById(id: string): Promise<Delivery | null>;
  create(data: DeliveryData): Promise<Delivery>;
  update(id: string, changes: Partial<DeliveryData>): Promise<Delivery>;
  delete(id: string): Promise<void>;
}
