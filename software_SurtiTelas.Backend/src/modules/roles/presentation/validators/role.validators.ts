import { z } from 'zod';

export const RoleFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['role', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const CreateRoleSchema = z.object({
  role: z.string().min(1, 'El nombre del rol es obligatorio'),
  descripcion: z.string().max(255, 'Máximo 255 caracteres').optional(),
  permisos: z.array(z.string()).optional(),
});

export const UpdateRoleSchema = z.object({
  role: z.string().min(1, 'El nombre del rol es obligatorio').optional(),
  descripcion: z.string().max(255, 'Máximo 255 caracteres').optional().or(z.literal('')),
  permisos: z.array(z.string()).optional(),
});

export const UpdateRoleStatusSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO']),
});

export const AssignPermissionSchema = z.object({
  permissionId: z.string().min(1, 'El permiso es obligatorio'),
});
