import { api } from './httpClient';

export type RoleName = 'ADMIN' | 'ASESOR' | 'DOMICILIARIO' | 'CLIENTE' | 'ALMACEN' | 'PRODUCCION' | 'REPORTES';

export interface RoleDTO {
  id?: string;
  role?: string;
  nombre?: string;
  descripcion?: string;
  permisos?: string[];
  usuarios?: number;
  estado?: 'Activo' | 'Inactivo' | 'ACTIVO' | 'INACTIVO';
}

export interface Rol {
  id: string;
  nombre: string;
  descripcion: string;
  permisos: string[];
  usuarios: number;
  estado: 'Activo' | 'Inactivo';
}

export function toRole(dto: RoleDTO, index: number): Rol {
  const roleName = dto.role ?? dto.nombre ?? dto.id ?? `R-${String(index + 1).padStart(3, '0')}`;
  const id = dto.id ?? roleName ?? `R-${String(index + 1).padStart(3, '0')}`;
  return {
    id,
    nombre: roleName,
    descripcion: dto.descripcion ?? '',
    permisos: dto.permisos ?? [],
    usuarios: dto.usuarios ?? 0,
    estado: dto.estado === 'INACTIVO' || dto.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
  };
}

export const rolesApi = {
  async list(): Promise<Rol[]> {
    const allRoles: RoleDTO[] = [];
    let page = 1;
    let totalPages = 1;
    do {
      const response = await api.get<RoleDTO[] | { items: RoleDTO[]; totalPages?: number } | undefined>('/roles', {
        query: { page, limit: 100 },
      });
      const raw = Array.isArray(response) ? response : response?.items ?? [];
      allRoles.push(...raw);
      totalPages = typeof response === 'object' && response && !Array.isArray(response) && typeof response.totalPages === 'number'
        ? response.totalPages
        : 1;
      page += 1;
    } while (page <= totalPages);
    return allRoles.map(toRole);
  },

  async getById(id: string): Promise<Rol | null> {
    try {
      const dto = await api.get<RoleDTO>(`/roles/${encodeURIComponent(id)}`);
      return dto ? toRole(dto, 0) : null;
    } catch {
      return null;
    }
  },

  async create(data: { nombre: string; descripcion?: string; permisos?: string[] }): Promise<Rol> {
    const dto = await api.post<RoleDTO>('/roles', {
      role: data.nombre,
      descripcion: data.descripcion,
      permisos: data.permisos,
    });
    return toRole(dto, 0);
  },

  async update(id: string, data: { nombre?: string; descripcion?: string; permisos?: string[] }): Promise<Rol> {
    const dto = await api.patch<RoleDTO>(`/roles/${encodeURIComponent(id)}`, {
      role: data.nombre,
      descripcion: data.descripcion,
      permisos: data.permisos,
    });
    if (!dto) throw new Error('Respuesta vacía del servidor');
    return toRole(dto, 0);
  },

  async updateStatus(id: string, estado: 'Activo' | 'Inactivo'): Promise<Rol> {
    const dto = await api.patch<RoleDTO>(`/roles/${encodeURIComponent(id)}/status`, { estado: estado.toUpperCase() });
    if (!dto) throw new Error('Respuesta vacía del servidor');
    return toRole(dto, 0);
  },

   async delete(id: string): Promise<void> {
    await api.delete<void>(`/roles/${encodeURIComponent(id)}`);
  },

  async listRolePermissions(role: string): Promise<string[]> {
    const response = await api.get<{ items: { permission: { code: string } }[] }>(
      `/roles/${encodeURIComponent(role)}/permissions`
    );
    return (response?.items ?? []).map((rp) => rp.permission.code);
  },

  async assignPermission(role: string, permissionId: string): Promise<void> {
    await api.post<void>(`/roles/${encodeURIComponent(role)}/permissions`, { permissionId });
  },

  async removePermission(role: string, permissionId: string): Promise<void> {
    await api.delete<void>(
      `/roles/${encodeURIComponent(role)}/permissions`,
      { permissionId }
    );
  },
};

export default rolesApi;
