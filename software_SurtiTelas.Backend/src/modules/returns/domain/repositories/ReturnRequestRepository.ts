import type { ReturnRequest, ReturnRequestData, ReturnRequestFilters, ReturnRequestListResult } from '../entities/ReturnRequest';
import type { ReturnItem, ReturnItemData } from '../entities/ReturnItem';
import type { ReturnInspection, ReturnInspectionData } from '../entities/ReturnInspection';
import type { ReturnResolution, ReturnResolutionData } from '../entities/ReturnResolution';
import type { ReturnHistory, ReturnHistoryData } from '../entities/ReturnHistory';

export type {
  ReturnRequest,
  ReturnRequestData,
  ReturnRequestFilters,
  ReturnRequestListResult,
};

export interface CreateReturnInput {
  orderId: string;
  motivo?: string;
  observaciones?: string;
  cantidadTotal: number;
  tipoGarantia?: string;
  diasGarantia?: number;
  fechaInicioGarantia?: Date;
  canalRegistro?: string;
  evidencias?: string[];
  items?: ReturnItemInput[];
}

export interface UpdateReturnInput {
  motivo?: string;
  observaciones?: string;
  cantidadInspeccionada?: number;
  estado?: string;
}

export interface ReturnItemInput {
  orderItemId?: string;
  productId?: string;
  ref: string;
  prenda: string;
  cantidadSolicitada: number;
  defectoTipo: string;
  defectoDescripcion?: string;
}

export interface ReturnInspectionInput {
  responsable?: string;
  observaciones?: string;
  condicion: string;
  cantidadAceptada: number;
  cantidadRechazada: number;
}

export interface ReturnResolutionInput {
  tipo: string;
  cantidad: number;
  responsable?: string;
  observaciones?: string;
}

export interface ReturnRequestRepository {
  list(filters?: ReturnRequestFilters): Promise<ReturnRequestListResult>;
  getById(id: string): Promise<ReturnRequest | null>;
  getByNumero(numeroDevolucion: string): Promise<ReturnRequest | null>;
  create(data: Omit<ReturnRequestData, 'id'>): Promise<ReturnRequest>;
  update(id: string, changes: Partial<ReturnRequestData>): Promise<ReturnRequest>;
  delete(id: string): Promise<void>;
  nextNumero(): Promise<string>;
  nextNumeroWithLock?(tx?: any): Promise<string>;
  findByIdWithRelations(id: string): Promise<{
    request: ReturnRequest;
    items: ReturnItem[];
    inspection: ReturnInspection | null;
    resolution: ReturnResolution | null;
    histories: ReturnHistory[];
  } | null>;
  listItemsByRequestId(returnRequestId: string): Promise<ReturnItem[]>;
  getItemById(itemId: string): Promise<ReturnItem | null>;
  createItem(data: ReturnItemData): Promise<ReturnItem>;
  updateItem(id: string, changes: Partial<ReturnItemData>): Promise<ReturnItem>;
  createInspection(data: ReturnInspectionData): Promise<ReturnInspection>;
  createResolution(data: ReturnResolutionData): Promise<ReturnResolution>;
  createHistory(data: ReturnHistoryData): Promise<ReturnHistory>;
  listHistoriesByRequestId(returnRequestId: string): Promise<ReturnHistory[]>;
}

export interface ReturnItemRepository {
  listByRequestId(returnRequestId: string): Promise<ReturnItem[]>;
  getById(id: string): Promise<ReturnItem | null>;
  create(data: ReturnItemData): Promise<ReturnItem>;
  update(id: string, changes: Partial<ReturnItemData>): Promise<ReturnItem>;
  delete(id: string): Promise<void>;
}

export interface ReturnInspectionRepository {
  getByRequestId(returnRequestId: string): Promise<ReturnInspection | null>;
  create(data: ReturnInspectionData): Promise<ReturnInspection>;
  update(id: string, changes: Partial<ReturnInspectionData>): Promise<ReturnInspection>;
}

export interface ReturnResolutionRepository {
  getByRequestId(returnRequestId: string): Promise<ReturnResolution | null>;
  create(data: ReturnResolutionData): Promise<ReturnResolution>;
}

export interface ReturnHistoryRepository {
  listByRequestId(returnRequestId: string): Promise<ReturnHistory[]>;
  create(data: ReturnHistoryData): Promise<ReturnHistory>;
}
