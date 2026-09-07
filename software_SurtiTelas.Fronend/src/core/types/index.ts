export interface Producto {
  id?: string;
  ref: string;
  codigo?: string;
  nombre: string;
  descripcion?: string;
  descripcionCorta?: string;
  categoria?: string;
  subcategoria?: string;
  marca?: string;
  precio: number;
  precioAnterior?: number;
  descuento?: number;
  stock: 'OK' | 'Bajo stock' | 'Agotado';
  cantidadStock: number;
  estado?: 'Activo' | 'Inactivo';
  imagenes: string[];
  imagenPrincipal?: string;
  publicado?: boolean;
  fechaPublicacion?: string;
  destacado?: boolean;
  oferta?: boolean;
  nuevo?: boolean;
  masVendido?: boolean;
  tela: string;
  colores: string[];
  tallas: string[];
}

export type PublicationStatus = 'Publicado' | 'Borrador' | 'Oculto';

export interface ProductoDetalle {
  id?: string;
  nombre: string;
  precio: number;
  imagen?: string;
  categoria?: string;
  descripcion?: string;
  tallas?: string[];
  colores?: string[];
  rating?: number;
  reviews?: number;
}

export interface Cliente {
  id: string;
  nombre: string;
  apellidos?: string;
  ciudad: string;
  tel: string;
  asesor: string;
  asesorId?: string;
  pedidos: number;
  estado: 'Activo' | 'Inactivo';
  nit?: string;
  email?: string;
  direccion?: string;
  tipoDocumento?: 'CC' | 'NIE' | 'PASSPORT' | 'CE' | 'OTHER';
  numeroDocumento?: string;
  cupoTotal?: number;
  cupoUsado?: number;
  deudaVencida?: number;
  isTrustedCustomer?: boolean;
  password?: string;
  confirmPassword?: string;
}

export interface PedidoItem {
  nombre: string;
  precio: number;
  cantidad: number;
  referencia?: string;
  productId?: string;
}

export interface Pedido {
  id: string;
  numero?: string;
  cliente: string;
  asesor: string;
  asesorTelefono?: string;
  asesorEmail?: string;
  fecha: string;
  items: number;
  total: string;
  estado: 'Pendiente' | 'Aceptado' | 'Listo' | 'Enviado' | 'Entregado' | 'Rechazado' | 'En validación' | 'Recibo generado' | 'Recibo enviado' | 'Cancelado';
  prioridad?: 'Estándar' | 'Prioritario';
  observaciones?: string;
  itemsList?: PedidoItem[];
  clienteId?: string;
  asesorId?: string;
  comprobantePagoUrl?: string;
  createdAt?: string;
  diasCredito?: number;
  descuentoEspecial?: number;
  envioGratis?: boolean;
  prioridadEnvio?: 'Normal' | 'Express' | 'Urgente';
  tipoFlujo?: string;
  customOrderId?: string;
  /**
   * Ventas generadas a partir de pagos confirmados (regla 1 pago = 1 venta).
   * Una venta representa 1 pago APPROVED. Un pedido puede tener 0, 1 o N ventas.
   * La venta legacy `venta` (singular) se conserva por compatibilidad.
   */
  ventas?: Venta[];
  /** @deprecated Usar `ventas` (plural). Conservado para compatibilidad con backend legacy. */
  venta?: Venta | null;
}

export interface OrdenProduccion {
  id: string;
  pedido: string;
  operario: string;
  referencia: string;
  cantidad: number;
  fechaInicio: string;
  fechaEstimada: string;
  avance: number;
  estado: 'Pendiente' | 'En proceso' | 'Terminado';
  tela?: string;
  colores?: string[];
  curvaTallas?: { s: number; m: number; l: number; xl: number };
  notasTecnicas?: string;
}

export interface MovimientoInventario {
  id: string;
  tipo: 'entrada' | 'salida' | 'ajuste';
  productoRef: string;
  cantidad: number;
  motivo: string;
  usuario: string;
  fecha: string;
  ajuste?: number;
}

export interface Notificacion {
  id: string;
  tipo: 'info' | 'warning' | 'success' | 'danger';
  titulo: string;
  mensaje: string;
  leida: boolean;
  usuarioId?: string;
  modulo?: string;
  referenciaId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  actorId?: string;
  targetUserId?: string;
  readAt?: number;
  metadata?: Record<string, unknown>;
  createdAt: number;
}

export interface VentaItem {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
  productId?: string | null;
}

export interface Venta {
  id: string;
  orderId: string;
  numero: string;
  clienteId: string;
  cliente: string;
  asesorId: string;
  asesor: string;
  fechaVenta: string;
  subtotal: number;
  impuestos: number;
  descuentos: number;
  total: number;
  estado: 'COMPLETADA' | 'ANULADA' | string;
  motivoAnulacion?: string;
  medioPago?: string;
  itemsCount: number;
  items: VentaItem[];
  orderEstado?: string;
  payment?: { id: string; amount: number; status: string; method: string; paidAt?: string | null } | null;
  receipt?: { id: string; numero: string; estado: string; estadoEnvio?: string | null } | null;
  customOrder?: { id: string; numero: string; estado: string } | null;
  createdAt: string;
  updatedAt: string;
  /** ID del pago que originó esta venta (1 venta por pago). Puede ser null en ventas legacy. */
  paymentId?: string | null;
  /** Tipo de pago: PAGO_INMEDIATO | ABONO_INICIAL | CUOTA | PAGO_SALDO. */
  tipoPago?: string | null;
  /** Número de cuota (1..N) si la venta corresponde a una cuota. */
  numeroCuota?: number | null;
  /** Total de cuotas pactadas. */
  totalCuotas?: number | null;
  /** Indica si esta venta fue registrada como anticipo. */
  esAnticipo?: boolean | null;
  /** Indica si esta venta fue el pago del saldo. */
  esSaldo?: boolean | null;
  /** Estado del pago asociado: APPROVED | REFUNDED | ANULADO | PENDING. */
  paymentStatus?: string | null;
  /** URL del comprobante de pago. */
  comprobantePagoUrl?: string | null;
  /** ID del usuario que registró la venta. */
  registradoPorId?: string | null;
}

export interface Proveedor {
  id: string;
  nombre: string;
  apellidos?: string | null;
  nit: string;
  telefono: string;
  email: string;
  direccion: string;
  ciudad: string;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  materiales: string[];
  estado: 'Activo' | 'Inactivo';
  calificacion: number;
  pedidosRealizados: number;
  ultimoPedido?: string;
}
