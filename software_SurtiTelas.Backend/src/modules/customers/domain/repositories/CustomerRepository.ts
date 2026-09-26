import type { Customer, CustomerStatus } from '../entities/Customer';

export interface CreateCustomerInput {
  nombre: string;
  apellidos?: string;
  email?: string;
  ciudad?: string;
  tel?: string;
  asesorId?: string;
  nit?: string;
  cupoTotal?: number;
  cupoUsado?: number;
  deudaVencida?: number;
  isTrustedCustomer?: boolean;
  estado?: CustomerStatus;
  direccion?: string;
  tipoDocumento?: string | null;
}

export interface UpdateCustomerInput {
  nombre?: string;
  apellidos?: string;
  email?: string;
  ciudad?: string;
  tel?: string;
  nit?: string;
  cupoTotal?: number;
  cupoUsado?: number;
  deudaVencida?: number;
  isTrustedCustomer?: boolean;
  estado?: CustomerStatus;
  asesorId?: string;
  direccion?: string;
  tipoDocumento?: string | null;
}

export interface CustomerFilters {
  search?: string;
  asesorId?: string;
  estado?: CustomerStatus;
  page?: number;
  limit?: number;
  cursor?: string;
  sort?: 'nombre' | 'ciudad' | 'createdAt';
  order?: 'asc' | 'desc';
}

/** Resultado mínimo y seguro para la búsqueda de clientes por número de identificación. */
export interface CustomerDocumentMatch {
  id: string;
  nombre: string;
  documento: string;
  tipoDocumento: string | null;
  telefono: string | null;
  email: string | null;
}

export interface CustomerRepository {
  list(filters?: CustomerFilters): Promise<{ data: Customer[]; meta: { total: number; page?: number; limit: number; nextCursor?: string; activos?: number; inactivos?: number; conDeuda?: number } }>;
  getById(id: string): Promise<Customer | null>;
  getByEmail(email: string): Promise<Customer | null>;
  findByDocument(documento: string, limit?: number): Promise<CustomerDocumentMatch[]>;
  getTrustedStatusByUserId(userId: string): Promise<{ isTrustedCustomer: boolean } | null>;
  create(input: CreateCustomerInput): Promise<Customer>;
  update(id: string, changes: UpdateCustomerInput): Promise<Customer>;
  assignAsesor(id: string, asesorId: string): Promise<Customer>;
  updateCupo(id: string, cupoTotal?: number, cupoUsado?: number, deudaVencida?: number): Promise<Customer>;
  delete(id: string): Promise<void>;
}
