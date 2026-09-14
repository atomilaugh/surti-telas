import { z } from 'zod';
import { OptionalPhoneSchema, NitSchema, NonNegativeNumberSchema, PositiveIntegerSchema, PositiveNumberSchema } from '../../../../shared/presentation/validators';

export const CreateSupplierSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  nit: NitSchema,
  tipoPersona: z.enum(['NATURAL', 'JURIDICA']).optional(),
  numeroDocumento: z.string().optional(),
  telefono: OptionalPhoneSchema,
  email: z.string().email().optional().or(z.literal('')),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  materiales: z.array(z.string()).optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  calificacion: z.number().min(0).max(5).optional(),
});

export const UpdateSupplierSchema = CreateSupplierSchema.partial();

export const CreateRawMaterialSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  categoria: z.string().optional(),
  unidadMedida: z.string().min(1, 'La unidad de medida es obligatoria'),
  stockActual: NonNegativeNumberSchema,
  stockMinimo: NonNegativeNumberSchema,
  proveedorId: z.string().optional(),
  precioUnitario: PositiveNumberSchema.optional(),
});

export const UpdateRawMaterialSchema = CreateRawMaterialSchema.partial();

export const RegisterMovementSchema = z.object({
  rawMaterialId: z.string().min(1, 'rawMaterialId es obligatorio'),
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']),
  cantidad: PositiveIntegerSchema,
  ajuste: NonNegativeNumberSchema.optional(),
  motivo: z.string().min(1, 'El motivo es obligatorio'),
});

export const MovementFiltersSchema = z.object({
  tipo: z.enum(['ENTRADA', 'SALIDA', 'AJUSTE']).optional(),
  productId: z.string().optional(),
  rawMaterialId: z.string().optional(),
  usuarioId: z.string().optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['fecha', 'cantidad', 'tipo']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const SupplierFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['nombre', 'calificacion', 'ciudad']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const RawMaterialFiltersSchema = z.object({
  search: z.string().optional(),
  proveedorId: z.string().optional(),
  necesitaReposicion: z.boolean().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['nombre', 'stockActual', 'precioUnitario']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
