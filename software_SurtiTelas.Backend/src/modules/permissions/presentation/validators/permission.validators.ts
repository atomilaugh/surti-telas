import { z } from 'zod';

export const PermissionFiltersSchema = z.object({
  search: z.string().optional(),
  module: z.string().optional(),
  estado: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['code', 'module', 'createdAt', 'updatedAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const CreatePermissionSchema = z.object({
  code: z.string().min(1, 'El código del permiso es obligatorio'),
  description: z.string().min(1, 'La descripción es obligatoria'),
  module: z.string().min(1, 'El módulo es obligatorio'),
});

export const UpdatePermissionSchema = z.object({
  code: z.string().min(1, 'El código del permiso es obligatorio').optional(),
  description: z.string().min(1, 'La descripción es obligatoria').optional(),
  module: z.string().min(1, 'El módulo es obligatorio').optional(),
});

export const UpdatePermissionStatusSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO']),
});
