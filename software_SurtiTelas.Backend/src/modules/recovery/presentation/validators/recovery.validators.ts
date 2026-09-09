import { z } from 'zod';

export const ForgotPasswordSchema = z.object({
  email: z.string().email('Correo inválido'),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Token requerido'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual requerida'),
  newPassword: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
});

export const AdminResetAccessSchema = z.object({
  userId: z.string().min(1, 'ID de usuario requerido'),
});

export const RecoveryRequestFiltersSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  estado: z.enum(['PENDIENTE', 'COMPLETADA', 'EXPIRADA', 'RECHAZADA']).optional(),
  userId: z.string().optional(),
  email: z.string().optional(),
  fromDate: z.coerce.date().optional(),
  toDate: z.coerce.date().optional(),
});
