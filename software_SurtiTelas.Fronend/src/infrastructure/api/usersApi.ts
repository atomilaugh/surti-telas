import { api } from './httpClient';
import type { BackendAuthUser } from './authApi';

export type UserRole = string;

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  estado: 'Activo' | 'Inactivo' | 'Pendiente';
  fechaRegistro: string;
  pedidosRealizados: number;
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  apellidos?: string | null;
  permisos?: string[];
  permisosEspecificos?: string[];
}

function mapBackendRole(role: string | undefined): UserRole {
  switch (role) {
    case 'ADMIN': return 'admin';
    case 'ASESOR': return 'asesor';
    case 'DOMICILIARIO': return 'domiciliario';
    case 'CLIENTE': return 'cliente';
    case 'ALMACEN': return 'almacen';
    case 'PRODUCCION': return 'produccion';
    case 'REPORTES': return 'reportes';
    default: return role ?? 'CLIENTE';
  }
}

function toUser(dto: BackendAuthUser & { estado?: string; createdAt?: string; pedidosRealizados?: number; permisos?: string[]; permisosEspecificos?: string[]; specificPermissions?: string[] }): Usuario {
  const estadoStr = dto.estado as string | undefined;
  const estado = estadoStr === 'INACTIVO' ? 'Inactivo' : estadoStr === 'PENDIENTE' ? 'Pendiente' : 'Activo';
  return {
    id: dto.id,
    nombre: dto.nombre,
    email: dto.email,
    rol: mapBackendRole(dto.role),
    estado,
    fechaRegistro: (dto.createdAt ?? '').slice(0, 10),
    pedidosRealizados: dto.pedidosRealizados ?? 0,
    telefono: dto.telefono ?? null,
    direccion: dto.direccion ?? null,
    tipoDocumento: dto.tipoDocumento ?? null,
    numeroDocumento: dto.numeroDocumento ?? null,
    apellidos: dto.apellidos ?? null,
    permisos: dto.permisos ?? dto.permissions ?? [],
    permisosEspecificos: dto.permisosEspecificos ?? dto.specificPermissions ?? [],
  };
}

export interface CreateUserInput {
  nombre: string;
  apellidos?: string;
  email: string;
  password: string;
  role: string;
  telefono?: string;
  direccion?: string;
  tipoDocumento?: string;
  numeroDocumento?: string;
  permisos?: string[];
}

export interface UpdateUserInput {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  direccion?: string;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  permisos?: string[];
}

export const usersApi = {
  async list(query?: Record<string, string | number | boolean | undefined | null>): Promise<Usuario[]> {
    const response = await api.get<{ items: (BackendAuthUser & { estado?: string; createdAt?: string; pedidosRealizados?: number })[]; meta: Record<string, unknown> }>('/users', { query });
    const data = response?.items ?? [];
    return data.map(toUser);
  },

  async create(input: CreateUserInput): Promise<Usuario> {
    const dto = await api.post<BackendAuthUser & { estado?: string; createdAt?: string }>('/users', input);
    return toUser(dto);
  },

  async update(id: string, changes: UpdateUserInput): Promise<Usuario> {
    const dto = await api.patch<BackendAuthUser & { estado?: string; createdAt?: string }>(`/users/${encodeURIComponent(id)}`, changes);
    return toUser(dto);
  },

  async updateStatus(id: string, estado: 'ACTIVO' | 'INACTIVO'): Promise<Usuario> {
    const dto = await api.patch<BackendAuthUser & { estado?: string; createdAt?: string }>(`/users/${encodeURIComponent(id)}/status`, { estado });
    return toUser(dto);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/users/${encodeURIComponent(id)}`);
  },
};

export default usersApi;
