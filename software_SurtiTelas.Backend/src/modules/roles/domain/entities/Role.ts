export interface Role {
  role: string;
  descripcion?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  usuarios: number;
  permisos: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RoleFilters {
  search?: string;
  estado?: string;
  page?: number;
  limit?: number;
  sort?: 'role' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}
