import type { RawMaterial } from '../entities/RawMaterial';

export interface CreateRawMaterialInput {
  nombre: string;
  categoria?: string;
  unidadMedida: string;
  stockActual?: number;
  stockMinimo?: number;
  proveedorId?: string;
  precioUnitario?: number;
}

export interface UpdateRawMaterialInput {
  nombre?: string;
  categoria?: string;
  unidadMedida?: string;
  stockActual?: number;
  stockMinimo?: number;
  proveedorId?: string;
  precioUnitario?: number;
}

export interface RawMaterialFilters {
  search?: string;
  proveedorId?: string;
  necesitaReposicion?: boolean;
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: 'nombre' | 'stockActual' | 'precioUnitario';
  order?: 'asc' | 'desc';
}

export interface RawMaterialRepository {
  list(filters?: RawMaterialFilters): Promise<{ data: RawMaterial[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }>;
  getById(id: string): Promise<RawMaterial | null>;
  create(input: CreateRawMaterialInput): Promise<RawMaterial>;
  update(id: string, changes: UpdateRawMaterialInput): Promise<RawMaterial>;
  delete(id: string): Promise<void>;
}
