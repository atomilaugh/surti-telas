import { api } from './httpClient';

export type DevolucionEstado =
  | 'RECIBIDO'
  | 'EN_INSPECCION'
  | 'APROBADO'
  | 'RECHAZADO'
  | 'EN_REPARACION'
  | 'REINGRESADO'
  | 'DESCARTADO';

export type DevolucionDestino =
  | 'REINGRESO_INVENTARIO'
  | 'REPARACION'
  | 'DESCARTE'
  | 'DEVOLUCION_PROVEEDOR';

export interface ReturnDTO {
  id: string;
  numeroDevolucion?: string;
  numeroOrden?: string;
  prenda?: string;
  referencia?: string;
  motivo?: string;
  cantidad?: number;
  cantidadInspeccionada?: number;
  fechaDevolucion?: string;
  estado?: DevolucionEstado;
  destino?: DevolucionDestino;
  cliente?: string;
  responsable?: string;
  observaciones?: string;
  imagenes?: string[];
  orderId?: string;
  fechaOrden?: string;
  estadoOrden?: string;
}

export interface Return {
  id: string;
  numeroDevolucion: string;
  numeroOrden: string;
  prenda: string;
  referencia: string;
  motivo: string;
  cantidad: number;
  cantidadInspeccionada: number;
  fechaDevolucion: string;
  estado: DevolucionEstado;
  destino: DevolucionDestino;
  cliente: string;
  responsable?: string;
  observaciones: string;
  imagenes: string[];
  orderId?: string;
  fechaOrden?: string;
  estadoOrden?: string;
}

export function toReturn(dto: ReturnDTO): Return {
  return {
    id: dto.id,
    numeroDevolucion: dto.numeroDevolucion ?? dto.id,
    numeroOrden: dto.numeroOrden ?? '',
    prenda: dto.prenda ?? 'Sin especificar',
    referencia: dto.referencia ?? '',
    motivo: dto.motivo ?? '',
    cantidad: Number(dto.cantidad) || 0,
    cantidadInspeccionada: Number(dto.cantidadInspeccionada) || 0,
    fechaDevolucion: dto.fechaDevolucion ?? new Date().toISOString().slice(0, 10),
    estado: dto.estado ?? 'RECIBIDO',
    destino: dto.destino ?? 'REINGRESO_INVENTARIO',
    cliente: dto.cliente ?? '',
    responsable: dto.responsable,
    observaciones: dto.observaciones ?? '',
    imagenes: dto.imagenes ?? [],
    orderId: dto.orderId,
    fechaOrden: dto.fechaOrden,
    estadoOrden: dto.estadoOrden,
  };
}

export interface CreateReturnInput {
  numeroOrden: string;
  prenda: string;
  referencia?: string;
  motivo?: string;
  cantidad: number;
  cantidadInspeccionada?: number;
  destino?: DevolucionDestino;
  cliente: string;
  responsable?: string;
  observaciones?: string;
  fechaDevolucion?: string;
  imagenes?: string[];
}

export const returnsApi = {
  async list(): Promise<Return[]> {
    const response = await api.get<{ items: ReturnDTO[]; totalRecords: number; page: number; limit: number; totalPages: number; nextCursor: string | null }>('/returns');
    const data = response?.items ?? [];
    return data.map(toReturn);
  },

  async listClient(): Promise<Return[]> {
    const response = await api.get<{ items: ReturnDTO[]; totalRecords: number; page: number; limit: number; totalPages: number; nextCursor: string | null }>('/client/returns');
    const data = response?.items ?? [];
    return data.map(toReturn);
  },

  async getById(id: string): Promise<Return | null> {
    try {
      const dto = await api.get<ReturnDTO>(`/returns/${encodeURIComponent(id)}`);
      return dto ? toReturn(dto) : null;
    } catch {
      return null;
    }
  },

  async create(input: CreateReturnInput): Promise<Return> {
    const dto = await api.post<ReturnDTO>('/returns', {
      orderId: input.numeroOrden,
      prenda: input.prenda,
      referencia: input.referencia,
      motivo: input.motivo,
      cantidad: input.cantidad,
      cantidadInspeccionada: input.cantidadInspeccionada,
      destino: input.destino,
      cliente: input.cliente,
      responsable: input.responsable,
      observaciones: input.observaciones,
      fechaDevolucion: input.fechaDevolucion,
    });
    return toReturn(dto);
  },

  async createClient(input: CreateReturnInput): Promise<Return> {
    const dto = await api.post<ReturnDTO>('/client/returns', {
      orderId: input.numeroOrden,
      prenda: input.prenda,
      referencia: input.referencia,
      motivo: input.motivo,
      cantidad: input.cantidad,
      cantidadInspeccionada: input.cantidadInspeccionada,
      destino: input.destino,
      cliente: input.cliente,
      responsable: input.responsable,
      observaciones: input.observaciones,
      fechaDevolucion: input.fechaDevolucion,
      imagenes: input.imagenes,
    });
    return toReturn(dto);
  },

  async update(
    id: string,
    changes: Partial<Omit<CreateReturnInput, 'numeroOrden'>>,
  ): Promise<Return> {
    const dto = await api.patch<ReturnDTO>(`/returns/${encodeURIComponent(id)}`, changes);
    return toReturn(dto);
  },

  async changeStatus(id: string, estado: DevolucionEstado): Promise<Return> {
    const dto = await api.post<ReturnDTO>(`/returns/${encodeURIComponent(id)}/status`, { estado });
    return toReturn(dto);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/returns/${encodeURIComponent(id)}`);
  },

  async getOrderForReturn(orderId: string): Promise<OrderForReturn | null> {
    try {
      return await api.get<OrderForReturn>(`/client/return-requests/orders/${encodeURIComponent(orderId)}`);
    } catch {
      return null;
    }
  },

  async getWarrantyPolicies(): Promise<WarrantyPolicyDTO[]> {
    const response = await api.get<WarrantyPolicyDTO[]>('/client/return-requests/policies/warranty');
    return response ?? [];
  },

  async uploadEvidence(files: File[]): Promise<string[]> {
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    const res = await api.postForm<{ evidencias: { url: string; nombre?: string; mime?: string }[] }>(
      '/client/return-requests/upload',
      form,
    );
    return res.evidencias?.map((e) => e.url) ?? [];
  },

  async createReturnRequest(input: CreateReturnRequestInput): Promise<ReturnRequestDTO> {
    const dto = await api.post<ReturnRequestDTO>('/client/return-requests', {
      orderId: input.orderId,
      motivo: input.motivo,
      observaciones: input.observaciones,
      cantidadTotal: input.cantidadTotal,
      items: input.items,
      evidencias: input.evidencias ?? input.imagenes,
    });
    return dto;
  },

  /** Registro manual de una devolución por parte del administrador. */
  async createAdminReturnRequest(input: CreateReturnRequestInput & { canal: ReturnCanalRegistro }): Promise<ReturnRequestDTO> {
    const dto = await api.post<ReturnRequestDTO>('/client/return-requests/admin', {
      orderId: input.orderId,
      motivo: input.motivo,
      observaciones: input.observaciones,
      cantidadTotal: input.cantidadTotal,
      items: input.items,
      evidencias: input.evidencias ?? input.imagenes,
      canalRegistro: input.canal,
    });
    return dto;
  },

  async listReturnRequests(query?: Record<string, string | number | undefined>): Promise<ReturnRequestDTO[]> {
    const response = await api.get<{ items: ReturnRequestDTO[]; totalRecords: number; page: number; limit: number; totalPages: number; nextCursor: string | null }>(
      '/client/return-requests',
      { query: { limit: 100, ...query } },
    );
    return response?.items ?? [];
  },

  async getReturnRequest(id: string): Promise<ReturnRequestDetailDTO | null> {
    try {
      return await api.get<ReturnRequestDetailDTO>(`/client/return-requests/${encodeURIComponent(id)}`);
    } catch {
      return null;
    }
  },

  async changeReturnRequestStatus(id: string, estado: ReturnRequestStatus, usuario?: string, observaciones?: string): Promise<ReturnRequestDTO> {
    const dto = await api.post<ReturnRequestDTO>(`/client/return-requests/${encodeURIComponent(id)}/status`, {
      estado,
      usuario,
      observaciones,
    });
    return dto;
  },

  async createReturnInspection(
    id: string,
    input: { responsable?: string; observaciones?: string; condicion: ReturnInspectionCondition; cantidadAceptada: number; cantidadRechazada: number },
  ): Promise<ReturnInspectionDTO> {
    return await api.post<ReturnInspectionDTO>(`/client/return-requests/${encodeURIComponent(id)}/inspection`, input);
  },

  async assignReturnResolution(
    id: string,
    input: { tipo: ReturnResolutionType; cantidad: number; responsable?: string; observaciones?: string },
  ): Promise<ReturnResolutionDTO> {
    return await api.post<ReturnResolutionDTO>(`/client/return-requests/${encodeURIComponent(id)}/resolution`, input);
  },

  /**
   * Descarga autenticada de una evidencia persistida de la solicitud.
   * La evidencia no se expone por URL pública: siempre requiere sesión y validación de propiedad.
   */
  async getEvidenceBlob(returnRequestId: string, index: number): Promise<Blob> {
    return api.getBlob(
      `/client/return-requests/${encodeURIComponent(returnRequestId)}/evidencias/${index}`,
    );
  },
};

export default returnsApi;

export type ReturnRequestStatus = 'SOLICITADA' | 'EN_REVISION' | 'APROBADA' | 'RECHAZADA' | 'PRODUCTO_RECIBIDO' | 'EN_INSPECCION' | 'RESUELTA';

export type ReturnInspectionCondition = 'NUEVO' | 'DEFECTUOSO' | 'DANADO' | 'REPARABLE' | 'NO_RECUPERABLE';

export type ReturnResolutionType = 'REINGRESO_EXISTENCIAS' | 'REPARACION' | 'DESCARTE' | 'DEVOLUCION_PROVEEDOR';

export type ReturnItemDefectoTipo = 'DEFECTO_CONFECCION' | 'DEFECTO_MATERIAL' | 'DESGASTE' | 'IMPERFECCION_VISUAL' | 'ERROR_CANTIDAD' | 'OTRO';

export type ReturnHistoryAccion = 'ESTADO_CAMBIADO' | 'ITEM_AGREGADO' | 'ITEM_APROBADO' | 'ITEM_RECHAZADO' | 'ITEM_RECIBIDO' | 'INSPECCION_INICIADA' | 'INSPECCION_COMPLETADA' | 'RESOLUCION_ASIGNADA' | 'MOTIVO_ACTUALIZADO' | 'OBSERVACIONES_ACTUALIZADAS' | 'GARANTIA_APLICADA' | 'SOLICITUD_CREADA';

export type ReturnRequestMotivo =
  | 'PRODUCTO_DEFECTUOSO'
  | 'PRODUCTO_DANADO'
  | 'PRODUCTO_INCORRECTO'
  | 'CANTIDAD_INCORRECTA'
  | 'PROBLEMA_ESTAMPADO'
  | 'OTRO';

/** Canal por el que se registra la solicitud de devolución. */
export type ReturnCanalRegistro = 'PORTAL' | 'TELEFONO' | 'PRESENCIAL' | 'WHATSAPP' | 'ASESOR';

export interface OrderForReturnItem {
  id: string;
  productId?: string | null;
  ref: string;
  nombre: string;
  cantidad: number;
}

export interface OrderForReturn {
  id: string;
  numero: string;
  cliente: string;
  clienteId: string;
  estado: string;
  fecha: string;
  items: OrderForReturnItem[];
}

export interface WarrantyPolicyDTO {
  id: string;
  tipo: 'VENTA' | 'FABRICANTE' | 'NINGUNA';
  diasGarantia: number;
  activa: boolean;
  descripcion?: string | null;
}

export interface CreateReturnRequestItemInput {
  ref: string;
  prenda: string;
  cantidadSolicitada: number;
  defectoTipo: ReturnItemDefectoTipo;
  defectoDescripcion?: string;
  orderItemId?: string;
  productId?: string | null;
}

export interface CreateReturnRequestInput {
  orderId: string;
  motivo: ReturnRequestMotivo;
  observaciones: string;
  cantidadTotal: number;
  items: CreateReturnRequestItemInput[];
  evidencias?: string[];
  /** @deprecated usar evidencias */
  imagenes?: string[];
}

export interface ReturnRequestDTO {
  id: string;
  numeroDevolucion: string;
  orderId: string;
  customerId?: string | null;
  clienteIdSnapshot?: string | null;
  estado: ReturnRequestStatus;
  cantidadTotal: number;
  cantidadInspeccionada: number | null;
   motivo: string | null;
   observaciones: string | null;
   tipoGarantiaSnapshot: string | null;
   diasGarantiaSnapshot: number | null;
   fechaInicioGarantia: string | null;
   fechaVencimientoGarantia: string | null;
   clienteSnapshot: string | null;
   canalRegistro?: string | null;
   evidencias?: string[];
   createdAt: string;
   updatedAt: string;
}

export interface ReturnRequestItemDTO {
  id: string;
  returnRequestId: string;
  orderItemId?: string | null;
  productId?: string | null;
  ref: string;
  prenda: string;
  cantidadSolicitada: number;
  cantidadAprobada?: number | null;
  cantidadRecibida?: number | null;
  cantidadAceptada?: number | null;
  cantidadRechazada?: number | null;
  defectoTipo: ReturnItemDefectoTipo;
  defectoDescripcion?: string | null;
  createdAt?: string;
}

export interface ReturnInspectionDTO {
  id: string;
  returnRequestId: string;
  responsable: string | null;
  fecha: string;
  observaciones: string | null;
  condicion: string;
  cantidadAceptada: number;
  cantidadRechazada: number;
}

export interface ReturnResolutionDTO {
  id: string;
  returnRequestId: string;
  tipo: string;
  cantidad: number;
  responsable: string | null;
  observaciones: string | null;
  fecha: string;
}

export interface ReturnHistoryDTO {
  id: string;
  returnRequestId: string;
  fecha: string;
  estadoAnterior: ReturnRequestStatus | null;
  estadoNuevo: ReturnRequestStatus | null;
  accion: ReturnHistoryAccion;
  usuario: string | null;
  observaciones?: string | null;
  cantidad?: number | null;
  createdAt?: string;
}

export interface ReturnRequestDetailDTO extends ReturnRequestDTO {
  items: ReturnRequestItemDTO[];
  inspection: ReturnInspectionDTO | null;
  resolution: ReturnResolutionDTO | null;
  histories: ReturnHistoryDTO[];
}
