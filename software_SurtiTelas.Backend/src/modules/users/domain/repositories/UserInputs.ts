export interface CreateUserInput {
  nombre: string;
  apellidos?: string | null;
  email: string;
  passwordHash: string;
  role: string;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  estado?: 'ACTIVO' | 'INACTIVO';
  twoFactorEnabled?: boolean;
}

export interface UpdateUserInput {
  nombre?: string;
  apellidos?: string | null;
  email?: string;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  avatar?: string | null;
  role?: string;
  estado?: 'ACTIVO' | 'INACTIVO';
  twoFactorEnabled?: boolean;
}
