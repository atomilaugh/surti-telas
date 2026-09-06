/**
 * Opciones compartidas para formularios y selects del panel administrativo.
 *
 * Estas listas son valores de dominio estáticos (no provienen de una tabla
 * gestionable por el usuario en el backend). Si en el futuro el backend expone
 * endpoints para gestionarlas, reemplazar estas constantes por llamadas a la API.
 */

import { appContent } from '@/shared/config/appContent';
import { ALL_MODULE_KEYS, ALL_PERMISSION_CODES } from '@/shared/config/systemModules';

// Productos terminados
export const CATEGORIAS_PRODUCTO = appContent.catalog.productCategories as readonly string[];

export const TALLAS_PRODUCTO = appContent.catalog.productSizes as readonly string[];

// Insumos
export const CATEGORIAS_INSUMO = appContent.catalog.insumoCategories as readonly string[];

export const UNIDADES_MEDIDA_INSUMO = appContent.catalog.insumoUnits as readonly string[];

// Stock devuelto (valores deben coincidir con el enum ReturnDestino del backend)
export const DESTINOS_DEVOLUCION = [
  'REINGRESO_INVENTARIO',
  'REPARACION',
  'DESCARTE',
  'DEVOLUCION_PROVEEDOR',
] as const;

export type DestinoDevolucion = (typeof DESTINOS_DEVOLUCION)[number];

export const DESTINO_DEVOLUCION_LABELS: Record<string, string> = {
  REINGRESO_INVENTARIO: 'Reingreso a inventario',
  REPARACION: 'Reparación',
  DESCARTE: 'Descarte',
  DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
};

export const ESTADO_DEVOLUCION_LABELS: Record<string, string> = {
  RECIBIDO: 'Recibido',
  EN_INSPECCION: 'En inspección',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  EN_REPARACION: 'En reparación',
  REINGRESADO: 'Reingresado',
  DESCARTADO: 'Descartado',
};

// Roles del sistema (enum del backend)
export const ROLES_SISTEMA = ['ADMIN', 'ASESOR', 'DOMICILIARIO', 'CLIENTE', 'ALMACEN', 'PRODUCCION', 'REPORTES'] as const;

export const ROL_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  ASESOR: 'Asesor',
  DOMICILIARIO: 'Domiciliario',
  CLIENTE: 'Cliente',
  ALMACEN: 'Almacén',
  PRODUCCION: 'Producción',
  REPORTES: 'Reportes',
};

export const ROL_COLORS: Record<string, string> = {
  admin: 'var(--chart-series-3)',
  asesor: 'var(--chart-series-1)',
  domiciliario: 'var(--chart-series-2)',
  cliente: 'var(--chart-series-4)',
  almacen: 'var(--chart-series-5)',
  produccion: '#ec4899',
  reportes: '#64748b',
};

export const PERMISOS_SISTEMA = [...ALL_PERMISSION_CODES] as readonly string[];

export const MODULOS_SISTEMA = [...ALL_MODULE_KEYS] as readonly string[];

// Estados generales (valor visual utilizado por algunos módulos como Asesores)
export const ESTADOS_GENERALES = ['Activo', 'Inactivo'] as const;

// Estados de empleado: el VALOR debe ser siempre el enum canónico del backend
// (ACTIVO | INACTIVO). La etiqueta es solo para la interfaz. Nunca enviar la
// etiqueta como valor de API.
export const EMPLEADO_ESTADOS: ReadonlyArray<{ value: 'ACTIVO' | 'INACTIVO'; label: string }> = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'INACTIVO', label: 'Inactivo' },
];

// Regla de negocio: los pedidos en estado Entregado o Rechazado no deben aparecer
// en las listas de pedidos activos de admin y asesor. Siempre que se cargue la lista
// de pedidos se debe filtrar por estos estados finales.
// Ver: AdminPedidos, AsesorPedidos, AdminVentasPedidos

// Pedidos (frontend) -> se mapean desde/hacia el backend OrderStatus
export const ESTADOS_PEDIDO = ['Pendiente', 'Aceptado', 'Listo', 'Enviado', 'Entregado', 'Rechazado', 'En validación', 'Recibo generado', 'Recibo enviado', 'Cancelado'] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ESTADOS_PEDIDO_PERMITIDOS: Record<EstadoPedido, EstadoPedido[]> = {
  Pendiente: ['Aceptado', 'En validación', 'Cancelado'],
  'En validación': ['Recibo generado', 'Cancelado'],
  'Recibo generado': ['Recibo enviado', 'Cancelado'],
  'Recibo enviado': ['Aceptado', 'Cancelado'],
  Aceptado: ['Listo', 'Cancelado'],
  Listo: ['Enviado', 'Cancelado'],
  Enviado: ['Entregado', 'Cancelado'],
  Entregado: [],
  Cancelado: [],
  Rechazado: [],
};

export const ORDER_STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default' | null> = {
  Pendiente: 'warning',
  Aceptado: 'info',
  'En validación': 'warning',
  'Recibo generado': 'info',
  'Recibo enviado': 'info',
  Listo: 'success',
  Enviado: 'default',
  Entregado: 'success',
  Rechazado: 'danger',
  Cancelado: 'danger',
};

export const CUSTOM_ORDER_STATUS_COLORS: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  SOLICITUD_RECIBIDA: 'info',
  EN_REVISION: 'warning',
  COTIZADO: 'success',
  COTIZACION_ACEPTADA: 'success',
  COTIZACION_RECHAZADA: 'danger',
  EN_PRODUCCION: 'info',
  COMPLETADO: 'success',
  CANCELADO: 'danger',
  CONVERTIDO_A_PEDIDO: 'default',
};

export const ORDER_STATUS_BACKEND_MAP: Record<string, string> = {
  Pendiente: 'PENDIENTE',
  Aceptado: 'ACEPTADO',
  Listo: 'LISTO',
  'En validación': 'EN_VALIDACION',
  'Recibo generado': 'RECIBO_GENERADO',
  'Recibo enviado': 'RECIBO_ENVIADO',
  Enviado: 'DESPACHADO',
  Entregado: 'ENTREGADO',
  Rechazado: 'RECHAZADO',
  Cancelado: 'CANCELADO',
};

export const ORDER_STATUS_FRONTEND_MAP: Record<string, EstadoPedido> = {
  PENDIENTE: 'Pendiente',
  ACEPTADO: 'Aceptado',
  LISTO: 'Listo',
  EN_PRODUCCION: 'Listo',
  EN_VALIDACION: 'En validación',
  RECIBO_GENERADO: 'Recibo generado',
  RECIBO_ENVIADO: 'Recibo enviado',
  DESPACHADO: 'Enviado',
  EN_CAMINO: 'Enviado',
  ENVIADO: 'Enviado',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  RECHAZADO: 'Rechazado',
  NUEVO: 'Pendiente',
} as const;

// Mapeos específicos de producción (backend enum -> frontend)
export const PRODUCTION_STATUS_BACKEND_MAP: Record<string, string> = {
  Pendiente: 'PENDIENTE',
  Asignada: 'ASIGNADA',
  'En produccion': 'EN_PROCESO',
  Completada: 'TERMINADO',
};

export const PRODUCTION_STATUS_FRONTEND_MAP: Record<string, 'Pendiente' | 'Asignada' | 'En produccion' | 'Completada'> = {
  PENDIENTE: 'Pendiente',
  ASIGNADA: 'Asignada',
  EN_PROCESO: 'En produccion',
  TERMINADO: 'Completada',
};

// Control de prendas
export const ETAPAS_CONTROL = ['Corte', 'Confección', 'Acabado', 'Control de Calidad', 'Empaque'] as const;
export type EtapaControl = (typeof ETAPAS_CONTROL)[number];

export const ESTADOS_CONTROL = ['Proceso', 'Aprobado', 'Rechazado'] as const;
export type EstadoControl = (typeof ESTADOS_CONTROL)[number];

// Alertas (estado de las alertas del sistema)
export const ESTADOS_ALERTA = ['Pendiente', 'Vista', 'Resuelta', 'Cancelada'] as const;
export type EstadoAlerta = (typeof ESTADOS_ALERTA)[number];

// Producción (estado de órdenes de producción)
export const ESTADOS_PRODUCCION = ['Pendiente', 'Asignada', 'En produccion', 'Completada'] as const;
export type EstadoProduccion = (typeof ESTADOS_PRODUCCION)[number];

// Acceso (estado de los registros de acceso)
export const ESTADOS_ACCESO = ['Activo', 'Expirado', 'Pendiente'] as const;

// Tipos de permiso (formulario de gestión de acceso)
export const TIPOS_PERMISO_ACCESO = ['Gestión completa', 'Crear y editar', 'Solo lectura', 'Visualización'] as const;

// Prioridad (compartida por alertas y producción)
export const PRIORIDADES = ['Alta', 'Media', 'Baja'] as const;

// Contacto empresarial
export const TIPOS_CONTACTO = ['Consulta general', 'Soporte técnico', 'Cotización', 'Reclamo', 'Sugerencia'] as const;
export const ESTADOS_CONTACTO = ['Nuevo', 'Leído', 'Respondido', 'Cerrado'] as const;

// Alertas de stock
export const ESTADOS_ALERTA_STOCK = ['Pendiente', 'Resuelta', 'Critico'] as const;

// Inventario
export const TIPOS_MOVIMIENTO = ['entrada', 'salida', 'ajuste'] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const MOTIVOS_MOVIMIENTO = [
  'Ingreso de mercancía',
  'Devolución cliente',
  'Daño/rotura',
  'Corrección inventario',
] as const;

// Reportes (periodos de filtro)
export const PERIODOS_REPORTE_VENTAS = [
  { value: 'ultimos_6_meses', label: 'Últimos 6 meses' },
  { value: 'ultimo_ano', label: 'Último año' },
  { value: 'todo', label: 'Todo el historial' },
] as const;

export const PERIODOS_REPORTE_INVENTARIO = [
  { value: 'ultimo_mes', label: 'Último mes' },
  { value: 'ultimo_trimestre', label: 'Último trimestre' },
  { value: 'ultimo_ano', label: 'Último año' },
] as const;

// Filtros de cumplimiento / eficiencia (reportes)
export interface FiltroRango {
  value: string;
  label: string;
  test: (v: number) => boolean;
}

export const FILTROS_CUMPLIMIENTO: FiltroRango[] = [
  { value: 'Todos', label: 'Todos', test: () => true },
  { value: 'Alto', label: 'Alto (>=90)', test: (v) => v >= 90 },
  { value: 'Medio', label: 'Medio (75-89)', test: (v) => v >= 75 && v < 90 },
  { value: 'Bajo', label: 'Bajo (<75)', test: (v) => v < 75 },
];

export const FILTROS_EFICIENCIA: FiltroRango[] = [
  { value: 'Todos', label: 'Todos', test: () => true },
  { value: 'Alta', label: 'Alta (>=90)', test: (v) => v >= 90 },
  { value: 'Media', label: 'Media (75-89)', test: (v) => v >= 75 && v < 90 },
  { value: 'Baja', label: 'Baja (<75)', test: (v) => v < 75 },
];

// Auditoría de seguridad
export const ESTADOS_AUDITORIA = ['Éxito', 'Fallido', 'Alerta'] as const;
export const TIPO_ALERTA_ASIGNACION: Record<string, string> = {
  'ORDEN_SIN_ASIGNAR': 'Orden sin asignar',
  'TALLER_SIN_CAPACIDAD': 'Taller sin capacidad',
  'FECHA_COMPROMETIDA': 'Fecha comprometida',
  'RETRASO_EN_ASIGNACION': 'Retraso en asignacion',
  'CAMBIO_DE_TALLER': 'Cambio de taller',
};

export const TIPO_ALERTA_TALLER: Record<string, string> = {
  'CAPACIDAD_MAXIMA': 'Capacidad maxima',
  'INACTIVIDAD': 'Inactividad',
  'SIN_ORDENES': 'Sin ordenes',
  'CONTACTO_NO_DISPONIBLE': 'Contacto no disponible',
};

export const TIPO_ALERTA_SEGUIMIENTO: Record<string, string> = {
  'RETRASO_EN_ENTREGA': 'Retraso en entrega',
  'CANCELACION_DE_TALLER': 'Cancelacion de taller',
  'CALIDAD_BAJA': 'Calidad baja',
  'CAMBIO_DE_FECHA': 'Cambio de fecha',
  'PRODUCCION_DETENIDA': 'Produccion detenida',
  'MATERIAL_FALTANTE': 'Material faltante',
};

// Catálogo
export const MARCA_DEFECTO = 'SurtiTelas';

export interface EtiquetaProducto {
  key: string;
  label: string;
  state: boolean;
  set: (value: boolean) => void;
}

// Devuelve las etiquetas de producto a renderizar como toggles en el formulario del catálogo.
export const ETIQUETAS_PRODUCTO: { key: string; label: string }[] = [
  { key: 'destacado', label: 'Destacado' },
  { key: 'oferta', label: 'Oferta' },
  { key: 'nuevo', label: 'Nuevo' },
  { key: 'masVendido', label: 'Más vendido' },
];
