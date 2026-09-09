export interface Permission {
  id: string;
  code: string;
  description: string;
  module: string;
  estado: 'ACTIVO' | 'INACTIVO';
  createdAt: Date;
  updatedAt: Date;
}

export interface PermissionFilters {
  search?: string;
  module?: string;
  estado?: string;
  page?: number;
  limit?: number;
  sort?: 'code' | 'module' | 'createdAt' | 'updatedAt';
  order?: 'asc' | 'desc';
}
