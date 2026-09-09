import { z } from 'zod';

export const CreateUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().optional(),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: z.string().min(1, 'El rol es obligatorio'),
  telefono: z.string().optional(),
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional(),
  tipoDocumento: z.enum(['CC', 'NIE', 'PASSPORT', 'CE', 'OTHER']).optional(),
  numeroDocumento: z.string().max(50, 'Máximo 50 caracteres').optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  twoFactorEnabled: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export const UpdateUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').optional(),
  apellidos: z.string().optional(),
  email: z.string().email('Correo inválido').optional(),
  telefono: z.string().optional(),
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional(),
  tipoDocumento: z.enum(['CC', 'NIE', 'PASSPORT', 'CE', 'OTHER']).optional(),
  numeroDocumento: z.string().max(50, 'Máximo 50 caracteres').optional(),
  avatar: z.string().optional(),
  role: z.string().min(1, 'El rol es obligatorio').optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  twoFactorEnabled: z.boolean().optional(),
  emailVerified: z.boolean().optional(),
});

export const UpdateUserStatusSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO']),
});

export const ChangeUserRoleSchema = z.object({
  role: z.string().min(1, 'El rol es obligatorio'),
});

export const UserFiltersSchema = z.object({
  search: z.string().optional(),
  role: z.string().optional(),
  estado: z.string().optional(),
  twoFactorEnabled: z.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  sort: z.enum(['nombre', 'email', 'createdAt', 'lastLoginAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
