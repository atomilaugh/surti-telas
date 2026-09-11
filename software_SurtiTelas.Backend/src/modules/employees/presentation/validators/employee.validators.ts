import { z } from 'zod';
import { OptionalPhoneSchema, PaginationSchema, DocumentTypeSchema } from '../../../../shared/presentation/validators';

export const EmployeeRoleSchema = z.enum(['ASESOR', 'DOMICILIARIO']);
export const EmployeeEstadoSchema = z.enum(['ACTIVO', 'INACTIVO']);

export const EmployeeFiltersSchema = z.object({
  search: z.string().optional(),
  role: EmployeeRoleSchema.optional(),
  estado: EmployeeEstadoSchema.optional(),
  ...PaginationSchema.shape,
  sort: z.enum(['nombre', 'email', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const EmployeeProfileSchema = z.object({
  cargo: z.string().max(100, 'Máximo 100 caracteres').optional(),
  fechaContratacion: z.coerce.date().optional(),
  salario: z.coerce.number().nonnegative('El salario no puede ser negativo').optional(),
  tipoEmpleado: EmployeeRoleSchema.optional(),
});

export const DomiciliaryDataSchema = z.object({
  zona: z.string().optional(),
  vehiculo: z.string().optional(),
  capacidad: z.coerce.number().int().positive('La capacidad debe ser mayor a 0').optional(),
});

export const CreateEmployeeSchema = z.object({
  email: z.string().email('Correo inválido').toLowerCase(),
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres'),
  apellidos: z.string().min(3, 'Los apellidos deben tener al menos 3 caracteres').optional(),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  role: EmployeeRoleSchema,
  telefono: OptionalPhoneSchema,
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional(),
   tipoDocumento: DocumentTypeSchema.optional(),
  numeroDocumento: z.string().max(50, 'Máximo 50 caracteres').optional(),
  profile: EmployeeProfileSchema.optional(),
  domiciliaryData: DomiciliaryDataSchema.optional(),
});

export const UpdateEmployeeSchema = z.object({
  nombre: z.string().min(3, 'El nombre debe tener al menos 3 caracteres').optional(),
  apellidos: z.string().min(3, 'Los apellidos deben tener al menos 3 caracteres').optional(),
  email: z.string().email('Correo inválido').optional(),
  telefono: OptionalPhoneSchema,
  direccion: z.string().max(150, 'Máximo 150 caracteres').optional().nullable(),
   tipoDocumento: DocumentTypeSchema.optional().nullable(),
  numeroDocumento: z.string().max(50, 'Máximo 50 caracteres').optional().nullable(),
  avatar: z.string().min(1, 'Avatar inválido').max(500000, 'Avatar demasiado grande').optional().or(z.literal('')),
  estado: z.enum(['ACTIVO', 'INACTIVO', 'Activo', 'Inactivo']).transform((val) => val.toUpperCase() as 'ACTIVO' | 'INACTIVO').optional(),
  role: EmployeeRoleSchema.optional(),
  profile: z.object({
    cargo: z.string().max(100, 'Máximo 100 caracteres').optional(),
    fechaContratacion: z.coerce.date().optional().nullable(),
    salario: z.coerce.number().nonnegative('El salario no puede ser negativo').optional().nullable(),
    tipoEmpleado: EmployeeRoleSchema.optional().nullable(),
  }).optional(),
  domiciliaryData: DomiciliaryDataSchema.optional(),
});

export const ChangeEmployeeStatusSchema = z.object({
  estado: z.enum(['ACTIVO', 'INACTIVO', 'Activo', 'Inactivo']).transform((val) => val.toUpperCase() as 'ACTIVO' | 'INACTIVO'),
});

export const EmployeeSearchSchema = z.object({
  q: z.string().min(2, 'Mínimo 2 caracteres'),
});
