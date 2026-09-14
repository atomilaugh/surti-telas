import type { Supplier, SupplierStatus } from '../entities/Supplier';

export interface CreateSupplierInput {
  nombre: string;
  nit: string;
  tipoPersona?: 'NATURAL' | 'JURIDICA' | null;
  numeroDocumento?: string | null;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  materiales?: string[];
  estado?: SupplierStatus;
  calificacion?: number;
}

export interface UpdateSupplierInput {
  nombre?: string;
  nit?: string;
  tipoPersona?: 'NATURAL' | 'JURIDICA' | null;
  numeroDocumento?: string | null;
  telefono?: string;
  email?: string;
  direccion?: string;
  ciudad?: string;
  materiales?: string[];
  estado?: SupplierStatus;
  calificacion?: number;
}

export interface SupplierFilters {
  search?: string;
  estado?: SupplierStatus;
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: 'nombre' | 'calificacion' | 'ciudad';
  order?: 'asc' | 'desc';
}

export interface SupplierRepository {
  list(filters?: SupplierFilters): Promise<{ data: Supplier[]; meta: { total: number; page?: number; limit: number; nextCursor?: string } }>;
  getById(id: string): Promise<Supplier | null>;
  create(input: CreateSupplierInput): Promise<Supplier>;
  update(id: string, changes: UpdateSupplierInput): Promise<Supplier>;
  delete(id: string): Promise<void>;
}
