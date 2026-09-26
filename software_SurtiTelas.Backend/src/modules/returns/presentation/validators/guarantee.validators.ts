import { z } from 'zod';
import { PositiveIntegerSchema, NonNegativeIntegerSchema } from '../../../../shared/presentation/validators';

export const ReturnRequestStatusEnum = z.enum([
  'SOLICITADA',
  'EN_REVISION',
  'APROBADA',
  'RECHAZADA',
  'PRODUCTO_RECIBIDO',
  'EN_INSPECCION',
  'RESUELTA',
]);

export const ReturnResolutionTypeEnum = z.enum([
  'REINGRESO_EXISTENCIAS',
  'REPARACION',
  'DESCARTE',
  'DEVOLUCION_PROVEEDOR',
]);

export const ReturnInspectionConditionEnum = z.enum([
  'NUEVO',
  'DEFECTUOSO',
  'DANADO',
  'REPARABLE',
  'NO_RECUPERABLE',
]);

export const ReturnItemDefectoTipoEnum = z.enum([
  'DEFECTO_CONFECCION',
  'DEFECTO_MATERIAL',
  'DESGASTE',
  'IMPERFECCION_VISUAL',
  'ERROR_CANTIDAD',
  'OTRO',
]);

export const WarrantyPolicyTipoEnum = z.enum(['VENTA', 'FABRICANTE', 'NINGUNA']);

/** Canal por el que se registra la solicitud de devolución. */
export const ReturnCanalRegistroEnum = z.enum([
  'PORTAL',
  'TELEFONO',
  'PRESENCIAL',
  'WHATSAPP',
  'ASESOR',
]);

export const CreateWarrantyPolicySchema = z.object({
  tipo: WarrantyPolicyTipoEnum,
  diasGarantia: PositiveIntegerSchema,
  activa: z.boolean().optional(),
  descripcion: z.string().optional(),
});

export const UpdateWarrantyPolicySchema = z.object({
  tipo: WarrantyPolicyTipoEnum.optional(),
  diasGarantia: PositiveIntegerSchema.optional(),
  activa: z.boolean().optional(),
  descripcion: z.string().optional(),
});

export const ReturnRequestMotivoEnum = z.enum([
  'PRODUCTO_DEFECTUOSO',
  'PRODUCTO_DANADO',
  'PRODUCTO_INCORRECTO',
  'CANTIDAD_INCORRECTA',
  'PROBLEMA_ESTAMPADO',
  'OTRO',
]);

export const CreateReturnItemInputSchema = z.object({
  orderItemId: z.string().optional(),
  productId: z.string().optional(),
  ref: z.string().min(1, 'La referencia es obligatoria'),
  prenda: z.string().min(1, 'El nombre de la prenda es obligatorio'),
  cantidadSolicitada: PositiveIntegerSchema,
  defectoTipo: ReturnItemDefectoTipoEnum,
  defectoDescripcion: z.string().optional(),
});

export const CreateReturnRequestSchema = z.object({
  orderId: z.string().min(1, 'orderId es obligatorio'),
  motivo: z.string().optional(),
  observaciones: z.string().optional(),
  cantidadTotal: PositiveIntegerSchema,
  tipoGarantia: WarrantyPolicyTipoEnum.optional(),
  diasGarantia: PositiveIntegerSchema.optional(),
  fechaInicioGarantia: z.string().optional(),
  clienteSnapshot: z.string().optional(),
  clienteIdSnapshot: z.string().optional(),
  customerId: z.string().optional(),
  items: z.array(CreateReturnItemInputSchema).min(1, 'Debe seleccionar al menos un producto'),
  canalRegistro: ReturnCanalRegistroEnum.optional(),
  evidencias: z.array(z.string().min(1)).max(10).optional(),
  imagenes: z.array(z.string().min(1)).max(10).optional(),
});

export const UpdateReturnRequestSchema = z.object({
  motivo: z.string().optional(),
  observaciones: z.string().optional(),
  cantidadInspeccionada: NonNegativeIntegerSchema.optional(),
  estado: ReturnRequestStatusEnum.optional(),
});

export const ReturnRequestFiltersSchema = z.object({
  estado: ReturnRequestStatusEnum.optional(),
  customerId: z.string().optional(),
  cliente: z.string().optional(),
  orderId: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  cursor: z.string().optional(),
});

export const AddReturnItemSchema = z.object({
  orderItemId: z.string().optional(),
  productId: z.string().optional(),
  ref: z.string().min(1, 'La referencia es obligatoria'),
  prenda: z.string().min(1, 'El nombre de la prenda es obligatorio'),
  cantidadSolicitada: PositiveIntegerSchema,
  defectoTipo: ReturnItemDefectoTipoEnum,
  defectoDescripcion: z.string().optional(),
});

export const ApproveReturnItemSchema = z.object({
  cantidadAprobada: PositiveIntegerSchema,
});

export const CreateReturnInspectionSchema = z.object({
  responsable: z.string().optional(),
  observaciones: z.string().optional(),
  condicion: ReturnInspectionConditionEnum,
  cantidadAceptada: NonNegativeIntegerSchema,
  cantidadRechazada: NonNegativeIntegerSchema,
});

export const CreateReturnResolutionSchema = z.object({
  tipo: ReturnResolutionTypeEnum,
  cantidad: PositiveIntegerSchema,
  responsable: z.string().optional(),
  observaciones: z.string().optional(),
});

export const ChangeReturnRequestStatusSchema = z.object({
  estado: ReturnRequestStatusEnum,
  usuario: z.string().optional(),
  observaciones: z.string().optional(),
});
