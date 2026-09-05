import { z } from 'zod';

export const CreateWorkshopSchema = z.object({
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  encargadoId: z.string().optional(),
  direccion: z.string().optional(),
  ciudad: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().email().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  capacidad: z.number().int().positive().optional(),
});

export const UpdateWorkshopSchema = CreateWorkshopSchema.partial();

export const CreateProductionOrderSchema = z.object({
  pedidoId: z.string().optional(),
  operarioId: z.string().optional(),
  tallerId: z.string().optional(),
  referencia: z.string().min(1, 'La referencia es obligatoria'),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a cero'),
  fechaEstimada: z.string().min(1, 'La fecha estimada es obligatoria'),
  fechaInicio: z.string().optional(),
  avance: z.number().int().min(0).max(100).optional(),
  estado: z.enum(['PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'TERMINADO', 'Pendiente', 'Asignada', 'En produccion', 'Completada']).optional(),
  tela: z.string().optional(),
  colores: z.array(z.string()).optional(),
  curvaTallas: z.record(z.string(), z.number()).optional(),
  notasTecnicas: z.string().optional(),
});

export const UpdateProductionOrderSchema = z.object({
  operarioId: z.string().optional(),
  tallerId: z.string().optional(),
  referencia: z.string().min(1).optional(),
  cantidad: z.number().int().positive().optional(),
  fechaEstimada: z.string().min(1).optional(),
  fechaInicio: z.string().optional(),
  avance: z.number().int().min(0).max(100).optional(),
  estado: z.enum(['PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'TERMINADO', 'Pendiente', 'Asignada', 'En produccion', 'Completada']).optional(),
  tela: z.string().optional(),
  colores: z.array(z.string()).optional(),
  curvaTallas: z.record(z.string(), z.number()).optional(),
  notasTecnicas: z.string().optional(),
});

export const ProductionOrderFiltersSchema = z.object({
  estado: z.enum(['PENDIENTE', 'ASIGNADA', 'EN_PROCESO', 'TERMINADO']).optional(),
  tallerId: z.string().optional(),
  operarioId: z.string().optional(),
  pedidoId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['fechaInicio', 'avance', 'estado']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const WorkshopFiltersSchema = z.object({
  search: z.string().optional(),
  estado: z.enum(['ACTIVO', 'INACTIVO']).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['nombre', 'ciudad', 'capacidad']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const AssignToWorkshopSchema = z.object({
  tallerId: z.string().min(1, 'El taller es obligatorio'),
});

export const UpdateProgressSchema = z.object({
  avance: z.number().int().min(0, 'El avance mínimo es 0').max(100, 'El avance máximo es 100'),
});

export const CompleteProductionSchema = z.object({});

export const CreateControlPrendaSchema = z.object({
  produccionId: z.string().min(1, 'La producción es obligatoria'),
  etapa: z.enum(['CORTE', 'CONFECCION', 'ACABADO', 'CONTROL_CALIDAD', 'EMPAQUE']),
  cantidadTotal: z.number().int().positive('La cantidad total debe ser mayor a cero'),
  observaciones: z.string().optional(),
});

export const ReviewControlPrendaSchema = z.object({
  estado: z.enum(['APROBADO', 'RECHAZADO']),
  cantidadAprobada: z.number().int().nonnegative().optional(),
  cantidadRechazada: z.number().int().nonnegative().optional(),
});

export const UpdateControlPrendaSchema = z.object({
  etapa: z.enum(['CORTE', 'CONFECCION', 'ACABADO', 'CONTROL_CALIDAD', 'EMPAQUE']).optional(),
  cantidadTotal: z.number().int().positive().optional(),
  observaciones: z.string().optional(),
});

export const CreateProductionItemSchema = z.object({
  produccionId: z.string().min(1, 'La producción es obligatoria').optional(),
  nombre: z.string().min(1, 'El nombre es obligatorio'),
  descripcion: z.string().optional(),
  cantidad: z.number().int().positive('La cantidad debe ser mayor a cero'),
  unidad: z.string().optional(),
  precioUnitario: z.number().nonnegative().optional(),
});

export const UpdateProductionItemSchema = z.object({
  nombre: z.string().min(1).optional(),
  descripcion: z.string().optional(),
  cantidad: z.number().int().positive().optional(),
  unidad: z.string().optional(),
  precioUnitario: z.number().nonnegative().optional(),
});

export const ProductionItemFiltersSchema = z.object({
  produccionId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['nombre', 'cantidad', 'createdAt']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
});
