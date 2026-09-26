import type { Pedido, Venta } from '@/core/types';

export type PaymentStatusKey =
  | 'SIN_PAGOS'
  | 'PENDIENTE'
  | 'PAGO_PARCIAL'
  | 'PAGADO'
  | 'ANULADO'
  | 'REEMBOLSADO';

export interface PaymentSummary {
  /** Suma de ventas con estado=COMPLETADA. */
  pagado: number;
  /** Total del pedido menos lo pagado. Nunca negativo. */
  saldo: number;
  /** Total del pedido en número. */
  total: number;
  /** Estado financiero calculado a partir de las ventas. */
  estado: PaymentStatusKey;
  /** Ventas válidas para el cálculo (COMPLETADA). */
  ventasCompletadas: Venta[];
  /** Cantidad total de ventas asociadas al pedido. */
  cantidadVentas: number;
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return Number(v) || 0;
  if (v && typeof v === 'object' && 'toNumber' in (v as Record<string, unknown>)) {
    return Number((v as { toNumber: () => number }).toNumber()) || 0;
  }
  return 0;
};

/**
 * Calcula el resumen financiero de un pedido a partir de sus ventas
 * (1 pago APPROVED = 1 venta, regla 1 venta por pago).
 *
 * - `pedido.total` se interpreta como número aunque venga formateado ("$135.000").
 * - Las ventas con `estado === 'COMPLETADA'` cuentan como dinero recibido.
 * - Las ventas con `estado === 'ANULADA'` o con `paymentStatus` en
 *   ['ANULADO','REFUNDED'] NO cuentan como dinero recibido.
 * - Si el pedido está cancelado, el estado es ANULADO.
 */
export function calculatePaymentSummary(pedido: Pedido | null | undefined): PaymentSummary {
  const total = toNumber(pedido?.total);
  const ventas: Venta[] = pedido?.ventas ?? [];
  const ventasCompletadas = ventas.filter((v) => v?.estado === 'COMPLETADA');
  const ventasAnuladas = ventas.filter((v) => {
    if (!v) return false;
    if (v.estado === 'ANULADA') return true;
    const ps = (v.paymentStatus ?? '').toUpperCase();
    return ps === 'ANULADO' || ps === 'REFUNDED' || ps === 'REJECTED';
  });

  const pagado = ventasCompletadas.reduce((sum, v) => sum + toNumber(v.total), 0);
  const saldo = Math.max(0, Math.round((total - pagado) * 100) / 100);

  let estado: PaymentStatusKey;
  if (pedido?.estado === 'Cancelado') {
    estado = 'ANULADO';
  } else if (ventas.length === 0) {
    estado = 'SIN_PAGOS';
  } else if (ventasCompletadas.length === 0) {
    // Hay ventas pero todas están anuladas/reembolsadas/rechazadas.
    estado = ventasAnuladas.length > 0 ? 'REEMBOLSADO' : 'PENDIENTE';
  } else if (saldo <= 0.5) {
    estado = 'PAGADO';
  } else if (pagado > 0) {
    estado = 'PAGO_PARCIAL';
  } else {
    estado = 'PENDIENTE';
  }

  return {
    pagado: Math.round(pagado * 100) / 100,
    saldo,
    total,
    estado,
    ventasCompletadas,
    cantidadVentas: ventas.length,
  };
}

export interface PaymentStatusMeta {
  key: PaymentStatusKey;
  label: string;
  variant: 'success' | 'warning' | 'danger' | 'default' | 'info';
}

export const PAYMENT_STATUS_META: Record<PaymentStatusKey, PaymentStatusMeta> = {
  SIN_PAGOS: { key: 'SIN_PAGOS', label: 'Pendiente', variant: 'warning' },
  PENDIENTE: { key: 'PENDIENTE', label: 'Pendiente', variant: 'warning' },
  PAGO_PARCIAL: { key: 'PAGO_PARCIAL', label: 'Pago parcial', variant: 'info' },
  PAGADO: { key: 'PAGADO', label: 'Pagado', variant: 'success' },
  ANULADO: { key: 'ANULADO', label: 'Anulado', variant: 'danger' },
  REEMBOLSADO: { key: 'REEMBOLSADO', label: 'Reembolsado', variant: 'default' },
};

export function getPaymentStatusMeta(key: PaymentStatusKey): PaymentStatusMeta {
  return PAYMENT_STATUS_META[key] ?? PAYMENT_STATUS_META.PENDIENTE;
}
