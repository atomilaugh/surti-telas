export type StatusVariant = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'purple' | 'outline';

export interface StatusConfig {
  label: string;
  variant: StatusVariant;
}

export const ORDER_STATUS_COLORS: Record<string, StatusVariant> = {
  Nuevo: 'info',
  Pendiente: 'warning',
  Aceptado: 'info',
  Listo: 'success',
  Enviado: 'info',
  Entregado: 'success',
  Rechazado: 'danger',
  Cancelado: 'danger',
  'En validación': 'warning',
  'Recibo generado': 'info',
  'Recibo enviado': 'info',
};

export const CUSTOM_ORDER_STATUS_COLORS: Record<string, StatusVariant> = {
  PENDIENTE: 'warning',
  ACEPTADO: 'success',
  CANCELADO: 'danger',
  SOLICITUD_RECIBIDA: 'info',
  EN_REVISION: 'warning',
  COTIZADO: 'info',
  COTIZACION_ACEPTADA: 'success',
  COTIZACION_RECHAZADA: 'danger',
  PAGO_PENDIENTE: 'warning',
  PAGO_EN_VERIFICACION: 'warning',
  PAGO_APROBADO: 'success',
  CONVERTIDO_A_PEDIDO: 'success',
  EN_PRODUCCION: 'info',
  COMPLETADO: 'success',
  VENCIDO: 'danger',
};

export const PRODUCTION_STATUS_COLORS: Record<string, StatusVariant> = {
  Pendiente: 'warning',
  Asignada: 'info',
  'En produccion': 'primary',
  Completada: 'success',
  Cancelada: 'danger',
};

export const PAYMENT_STATUS_COLORS: Record<string, StatusVariant> = {
  Pendiente: 'warning',
  Aprobado: 'success',
  Rechazado: 'danger',
  Reembolsado: 'info',
  Anulado: 'danger',
};

export const INVOICE_STATUS_COLORS: Record<string, StatusVariant> = {
  Pagado: 'success',
  Parcial: 'primary',
  Pendiente: 'warning',
  Vencido: 'danger',
  'En Mora': 'danger',
};

export const RECEIPT_STATUS_COLORS: Record<string, StatusVariant> = {
  Borrador: 'default',
  Enviado: 'primary',
  Pagado: 'success',
  Vencido: 'danger',
  Cancelado: 'danger',
};

export const DELIVERY_STATUS_COLORS: Record<string, StatusVariant> = {
  Pendiente: 'warning',
  ASIGNADO: 'warning',
  'En camino': 'info',
  EN_RUTA: 'info',
  Entregado: 'success',
  ENTREGADO: 'success',
  Fallido: 'danger',
  FALLIDO: 'danger',
};

export const RETURN_STATUS_COLORS: Record<string, StatusVariant> = {
  RECIBIDO: 'info',
  EN_INSPECCION: 'warning',
  APROBADO: 'success',
  RECHAZADO: 'danger',
  EN_REPARACION: 'warning',
  REINGRESADO: 'success',
  DESCARTADO: 'danger',
};

export const PRODUCT_STATUS_COLORS: Record<string, StatusVariant> = {
  Activo: 'success',
  Inactivo: 'default',
  Publicado: 'success',
  Borrador: 'warning',
  Oculto: 'default',
};

export const STOCK_STATUS_COLORS: Record<string, StatusVariant> = {
  OK: 'success',
  'Bajo stock': 'warning',
  Agotado: 'danger',
};

export const WORKSHOP_STATUS_COLORS: Record<string, StatusVariant> = {
  Activo: 'success',
  Inactivo: 'default',
};

export const ALERT_STATUS_COLORS: Record<string, StatusVariant> = {
  Pendiente: 'warning',
  Vista: 'info',
  Resuelta: 'success',
  Cancelada: 'danger',
};

export const CONTACT_STATUS_COLORS: Record<string, StatusVariant> = {
  Nuevo: 'warning',
  Leído: 'info',
  Respondido: 'success',
  Cerrado: 'default',
};

export const COMMISSION_STATUS_COLORS: Record<string, StatusVariant> = {
  Pendiente: 'warning',
  Pagado: 'success',
  Cancelado: 'danger',
};

export const PURCHASE_STATUS_COLORS: Record<string, StatusVariant> = {
  PENDIENTE: 'warning',
  RECIBIDA: 'success',
  CANCELADA: 'danger',
  ANULADA: 'danger',
};

export const SALE_STATUS_COLORS: Record<string, StatusVariant> = {
  COMPLETADA: 'success',
  ANULADA: 'danger',
};

export const AUDIT_STATUS_COLORS: Record<string, StatusVariant> = {
  Éxito: 'success',
  Fallido: 'danger',
  Alerta: 'warning',
  Activo: 'success',
  Expirado: 'default',
  Pendiente: 'warning',
};

export const GARMENT_CONTROL_STATUS_COLORS: Record<string, StatusVariant> = {
  Proceso: 'warning',
  Aprobado: 'success',
  Rechazado: 'danger',
};

export const INVENTORY_ALERT_STATUS_COLORS: Record<string, StatusVariant> = {
  Pendiente: 'warning',
  Resuelta: 'success',
  Critico: 'danger',
};

export const GENERIC_ACTIVE_STATUS_COLORS: Record<string, StatusVariant> = {
  Activo: 'success',
  ACTIVO: 'success',
  Inactivo: 'default',
  INACTIVO: 'default',
};

export const GENERIC_STATUS_COLORS: Record<string, StatusVariant> = {
  Activo: 'success',
  ACTIVO: 'success',
  Inactivo: 'default',
  INACTIVO: 'default',
  Pendiente: 'warning',
  Cancelado: 'danger',
  CANCELADO: 'danger',
  Completado: 'success',
  COMPLETADO: 'success',
  Rechazado: 'danger',
  RECHAZADO: 'danger',
  Aprobado: 'success',
  APROBADO: 'success',
  Fallido: 'danger',
  FALLIDO: 'danger',
  Entregado: 'success',
  ENTREGADO: 'success',
  Enviado: 'info',
  ENVIADO: 'info',
  'En ruta': 'info',
  EN_RUTA: 'info',
  'En producción': 'info',
  EN_PRODUCCION: 'info',
  Asignado: 'info',
  ASIGNADO: 'info',
  'Por confirmar': 'warning',
  'POR CONFIRMAR': 'warning',
  'En revisión': 'warning',
  'EN_REVISION': 'warning',
  Procesando: 'info',
  PROCESANDO: 'info',
};
