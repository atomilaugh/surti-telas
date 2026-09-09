export interface User {
  id: string;
  email: string;
  nombre: string;
  apellidos?: string | null;
  role: string;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  avatar?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  twoFactorEnabled: boolean;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
  roleActive?: boolean;
}

export interface PublicUser {
  id: string;
  email: string;
  nombre: string;
  apellidos?: string | null;
  role: string;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  avatar?: string | null;
  estado: 'ACTIVO' | 'INACTIVO';
  twoFactorEnabled: boolean;
  lockedUntil?: Date | null;
  lastLoginAt?: Date | null;
  lastLoginIp?: string | null;
  emailVerified?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserFilters {
  search?: string;
  role?: string;
  estado?: string;
  twoFactorEnabled?: boolean;
  page?: number;
  limit?: number;
  sort?: 'nombre' | 'email' | 'createdAt' | 'lastLoginAt';
  order?: 'asc' | 'desc';
}
