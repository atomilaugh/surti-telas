import { z } from 'zod';
import { isValidPhone } from '../../domain/validators/phone.validator';
import { isValidNit, isValidDocumentNumber } from '../../domain/validators/document.validator';

export const DocumentTypeSchema = z.enum(['CC', 'TI', 'NIE', 'PASSPORT', 'CE', 'PP', 'NIT', 'PPT', 'OTHER']);

export const OptionalPhoneSchema = z
  .string()
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined || val === null || val.trim() === '') return;
    if (!isValidPhone(val)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Teléfono inválido. Usa formato: 3001234567 o +573001234567',
      });
    }
  });

export const NitSchema = z
  .string()
  .superRefine((val, ctx) => {
    if (!val.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El NIT es obligatorio' });
      return;
    }
    if (!isValidNit(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NIT inválido. Usa formato: 900123456 o 900123456-7' });
    }
  });

export const OptionalNitSchema = z
  .string()
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined || val === null || val.trim() === '') return;
    if (!isValidNit(val)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'NIT inválido. Usa formato: 900123456 o 900123456-7' });
    }
  });

export const DocumentNumberSchema = z
  .string()
  .superRefine((val, ctx) => {
    if (!val.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'El número de documento es obligatorio' });
      return;
    }
    if (!isValidDocumentNumber(val, 'CC')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documento inválido. Debe tener entre 5 y 12 caracteres numéricos.' });
    }
  });

export const OptionalDocumentNumberSchema = z
  .string()
  .optional()
  .superRefine((val, ctx) => {
    if (val === undefined || val === null || val.trim() === '') return;
    if (!isValidDocumentNumber(val, 'CC')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Documento inválido. Debe tener entre 5 y 12 caracteres numéricos.' });
    }
  });

export const PositiveNumberSchema = z
  .number()
  .positive('Debe ser mayor a 0');

export const NonNegativeNumberSchema = z
  .number()
  .nonnegative('No puede ser negativo');

export const NonNegativeIntegerSchema = z
  .number()
  .int('Debe ser entero')
  .nonnegative('No puede ser negativo');

export const PositiveIntegerSchema = z
  .number()
  .int('Debe ser entero')
  .positive('Debe ser mayor a 0');

export const PercentageSchema = z
  .number()
  .min(0, 'El porcentaje no puede ser negativo')
  .max(100, 'El porcentaje no puede exceder 100');

export const CurrencySchema = z
  .number()
  .nonnegative('El monto no puede ser negativo')
  .multipleOf(0.01, 'El monto debe tener máximo 2 decimales');

export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
});
