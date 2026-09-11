import { z } from 'zod';
import { OptionalPhoneSchema, PaginationSchema, DocumentTypeSchema } from '../../../../shared/presentation/validators';

export const LoginSchema = z.object({
  email: z.string().email('Correo inválido').toLowerCase(),
  password: z.string().min(8, 'Mínimo 8 caracteres').max(100),
});

export const RegisterSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Correo inválido').toLowerCase(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
   role: z.string().min(1, 'El rol es obligatorio'),
  telefono: OptionalPhoneSchema,
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional(),
  tipoDocumento: DocumentTypeSchema.optional(),
  numeroDocumento: z.string().max(50, 'Máximo 50 caracteres').optional(),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token requerido'),
});

export const VerifyTwoFactorSchema = z.object({
  tempToken: z.string().min(1, 'Token temporal requerido'),
  code: z.string().min(6, 'Código 2FA inválido'),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(100),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(8, 'Mínimo 8 caracteres').max(100),
});

export const UpdateProfileSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').optional(),
  telefono: OptionalPhoneSchema,
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional(),
  tipoDocumento: DocumentTypeSchema.optional(),
  numeroDocumento: z.string().max(50, 'Máximo 50 caracteres').optional(),
  avatar: z.string().min(1, 'Avatar inválido').max(500000, 'Avatar demasiado grande').optional().or(z.literal('')),
});

export const CreateUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  apellidos: z.string().optional(),
  email: z.string().email('Correo inválido').toLowerCase(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
   role: z.string().min(1, 'El rol es obligatorio'),
  telefono: OptionalPhoneSchema,
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional(),
  tipoDocumento: DocumentTypeSchema.optional(),
  numeroDocumento: z.string().max(50, 'Máximo 50 caracteres').optional(),
  permisos: z.array(z.string()).optional(),
});

export const UpdateUserSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio').optional(),
  apellidos: z.string().optional(),
  email: z.string().email('Correo inválido').optional(),
  telefono: OptionalPhoneSchema,
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional(),
  permisos: z.array(z.string()).optional(),
});

export const UpdateUserStatusSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO', 'Activo', 'Inactivo']).transform((val) => val.toUpperCase() as 'ACTIVO' | 'INACTIVO'),
});

export const UpdateRoleStatusSchema = z.object({
  estado: z.enum(['Activo', 'Inactivo']),
});

export const UserFiltersSchema = z.object({
  search: z.string().optional(),
   role: z.string().min(1, 'El rol es obligatorio').optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'Activo', 'Inactivo']).transform((val) => val.toUpperCase()).optional(),
  ...PaginationSchema.shape,
  sort: z.enum(['nombre', 'email', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const GoogleTokenSchema = z.object({
  idToken: z.string().min(1, 'Token de Google requerido'),
});
