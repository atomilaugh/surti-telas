import type { WarrantyPolicy } from '../entities/WarrantyPolicy';

export type { WarrantyPolicy } from '../entities/WarrantyPolicy';

export interface CreateWarrantyPolicyInput {
  tipo: WarrantyPolicy['tipo'];
  diasGarantia: number;
  activa?: boolean;
  descripcion?: string;
}

export interface UpdateWarrantyPolicyInput {
  tipo?: WarrantyPolicy['tipo'];
  diasGarantia?: number;
  activa?: boolean;
  descripcion?: string;
}

export interface WarrantyPolicyRepository {
  list(activas?: boolean): Promise<WarrantyPolicy[]>;
  getById(id: string): Promise<WarrantyPolicy | null>;
  getByTipo(tipo: WarrantyPolicy['tipo']): Promise<WarrantyPolicy | null>;
  create(input: CreateWarrantyPolicyInput): Promise<WarrantyPolicy>;
  update(id: string, changes: UpdateWarrantyPolicyInput): Promise<WarrantyPolicy>;
  delete(id: string): Promise<void>;
}
