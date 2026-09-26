import { z } from 'zod';
import { PositiveNumberSchema, PositiveIntegerSchema } from '../../../../shared/presentation/validators';

export const CreateOrderSchema = z.object({
  clienteId: z.string().min(1, 'clienteId es obligatorio').optional(),
  asesorId: z.string().min(1).optional(),
  tipoFlujo: z.enum(['PRODUCCION', 'VENTAS']).optional(),
  itemsList: z
    .array(
      z.object({
        productId: z.string().optional(),
        nombre: z.string().min(1, 'El item requiere nombre'),
        precio: PositiveNumberSchema,
        cantidad: PositiveIntegerSchema,
        color: z.string().optional(),
        talla: z.string().optional(),
        referencia: z.string().optional(),
      })
    )
    .optional(),
  prioridad: z.enum(['Estándar', 'Prioritario']).optional(),
  observaciones: z.string().optional(),
  paymentMethod: z.enum(['CASH', 'TRANSFER', 'CARD', 'OTHER', 'INSTALLMENTS']).optional(),
  installments: z.coerce.number().int().positive().max(12).optional(),
  subtotal: PositiveNumberSchema.optional(),
  impuestos: z.number().min(0).optional(),
  descuentos: z.number().min(0).optional(),
  comprobantePagoUrl: z.string().optional(),
  diasCredito: z.coerce.number().int().min(0).max(60).optional(),
  descuentoEspecial: z.number().min(0).max(100).optional(),
  envioGratis: z.boolean().optional(),
  prioridadEnvio: z.enum(['Normal', 'Express', 'Urgente']).optional(),
});

export const UpdateOrderStatusSchema = z.object({
  estado: z.enum([
    'Pendiente',
    'Aceptado',
    'Listo',
    'Enviado',
    'Entregado',
    'Rechazado',
    'En validación',
    'Recibo generado',
    'Recibo enviado',
    'Cancelado',
  ]),
});

export const AssignDomiciliarioSchema = z.object({
  domiciliarioId: z.string().min(1, 'domiciliarioId es obligatorio'),
});

export const UpdateOrderFullSchema = z.object({
  clienteId: z.string().min(1).optional(),
  asesorId: z.string().min(1).optional(),
  prioridad: z.enum(['Estándar', 'Prioritario']).optional(),
  observaciones: z.string().optional(),
  itemsList: z
    .array(
      z.object({
        productId: z.string().optional(),
        nombre: z.string().min(1),
        precio: PositiveNumberSchema,
        cantidad: PositiveIntegerSchema,
        color: z.string().optional(),
        talla: z.string().optional(),
        referencia: z.string().optional(),
      })
    )
    .optional(),
});

export const OrderFiltersSchema = z.object({
  estado: z.enum(['Pendiente', 'Aceptado', 'Listo', 'Enviado', 'Entregado', 'Rechazado', 'En validación', 'Recibo generado', 'Recibo enviado', 'Cancelado']).optional(),
  clienteId: z.string().optional(),
  asesorId: z.string().optional(),
  domiciliarioId: z.string().optional(),
  tipoFlujo: z.enum(['PRODUCCION', 'VENTAS']).optional(),
  desde: z.string().optional(),
  hasta: z.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  cursor: z.string().optional(),
  sort: z.enum(['fecha', 'total', 'estado']).optional(),
  order: z.enum(['asc', 'desc']).optional(),
  tieneComprobante: z.boolean().optional(),
  numero: z.string().optional(),
  search: z.string().optional(),
  _t: z.string().optional(),
});

export const CancelOrderSchema = z.object({
  motivoAnulacion: z.string().min(3, 'El motivo de anulación es obligatorio (mínimo 3 caracteres)').max(500, 'El motivo de anulación no debe exceder 500 caracteres'),
});
