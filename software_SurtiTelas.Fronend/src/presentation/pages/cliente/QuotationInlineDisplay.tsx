import React, { useState } from 'react';
import { FileText, User, Mail, Phone, Clock, CreditCard, MessageSquare, AlertCircle, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { CustomOrder } from '@/infrastructure/api/customOrdersApi';
import s from './MisPedidosPersonalizados.module.css';

interface QuotationInlineDisplayProps {
  order: CustomOrder;
  style?: React.CSSProperties;
}

const formatCurrency = (value: number | string): string => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
};

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '-';
  }
};

const getStatusConfig = (estado: string) => {
  switch (estado) {
    case 'ACEPTADA':
      return { label: 'Aceptada', variant: 'success' as const, icon: CheckCircle };
    case 'RECHAZADA':
      return { label: 'Rechazada', variant: 'danger' as const, icon: XCircle };
    case 'ENVIADA':
      return { label: 'Enviada', variant: 'info' as const, icon: AlertCircle };
    case 'VENCIDA':
    case 'VENCIDO':
      return { label: 'Vencida', variant: 'warning' as const, icon: AlertTriangle };
    case 'COTIZADO':
      return { label: 'Cotizado', variant: 'info' as const, icon: FileText };
    default:
      return { label: estado || 'Pendiente', variant: 'default' as const, icon: Clock };
  }
};

const getStatusMessage = (estado: string): string | null => {
  switch (estado) {
    case 'ACEPTADA':
      return 'Esta cotización ha sido aceptada y convertida en pedido.';
    case 'RECHAZADA':
      return 'Esta cotización ha sido rechazada.';
    case 'ENVIADA':
    case 'COTIZADO':
      return 'Esta cotización está pendiente de revisión.';
    case 'VENCIDA':
    case 'VENCIDO':
      return 'Esta cotización ha vencido.';
    default:
      return null;
  }
};

const getStatusMessageClass = (variant: string): string => {
  const classMap: Record<string, string> = {
    success: s.statusMessageSuccess,
    danger: s.statusMessageDanger,
    info: s.statusMessageInfo,
    warning: s.statusMessageWarning,
  };
  return classMap[variant] || '';
};

interface ProductGroup {
  productId: string;
  productName: string;
  conceptos: Array<{
    id: string;
    descripcion: string;
    tipo: string;
    cantidad: number;
    precioUnitario: string;
    subtotal: string;
  }>;
  total: number;
}

function groupDetallesByProduct(
  detalles: Array<{
    id: string;
    customOrderItemId?: string | null;
    descripcion: string;
    tipo: string;
    cantidad: number;
    precioUnitario: string;
    subtotal: string;
  }>,
  productoNombres?: Record<string, string> | null
): ProductGroup[] {
  const productMap = new Map<string, ProductGroup>();

  detalles.forEach((detalle, index) => {
    const productId = detalle.customOrderItemId ?? `sin-producto-${index}`;
    const productName = detalle.customOrderItemId
      ? (productoNombres?.[detalle.customOrderItemId] ?? `Producto ${index + 1}`)
      : detalle.descripcion;

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName,
        conceptos: [],
        total: 0,
      });
    }

    const product = productMap.get(productId)!;
    product.conceptos.push({
      id: detalle.id,
      descripcion: detalle.descripcion,
      tipo: detalle.tipo,
      cantidad: detalle.cantidad,
      precioUnitario: detalle.precioUnitario,
      subtotal: detalle.subtotal,
    });
    product.total += parseFloat(detalle.subtotal) || 0;
  });

  return Array.from(productMap.values());
}

const ProductDetails: React.FC<{
  detalles: Array<{
    id: string;
    customOrderItemId?: string | null;
    descripcion: string;
    tipo: string;
    cantidad: number;
    precioUnitario: string;
    subtotal: string;
  }>;
  productoNombres?: Record<string, string> | null;
}> = ({ detalles, productoNombres }) => {
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const products = groupDetallesByProduct(detalles, productoNombres);

  const toggleExpanded = (productId: string) => {
    setExpandedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  if (products.length === 1 && products[0].conceptos.length <= 2) {
    return (
      <div className={s.tableWrapper}>
        <table className={s.productsTable}>
          <thead>
            <tr>
              <th>#</th>
              <th>Concepto</th>
              <th>Cantidad</th>
              <th>P. Unitario</th>
              <th>Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {products[0].conceptos.map((concepto, index) => (
              <tr key={concepto.id}>
                <td>{index + 1}</td>
                <td>
                  <div>{concepto.descripcion}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    {concepto.tipo.replace(/_/g, ' ')}
                  </div>
                </td>
                <td>{concepto.cantidad}</td>
                <td>{formatCurrency(concepto.precioUnitario)}</td>
                <td>{formatCurrency(concepto.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className={s.productGroupsList}>
      {products.map((product, index) => {
        const isExpanded = expandedProducts.has(product.productId);
        return (
          <div key={product.productId} className={s.productGroup}>
            <div className={s.productGroupHeader}>
              <div className={s.productGroupInfo}>
                <span className={s.productGroupNumber}>#{index + 1}</span>
                <div>
                  <div className={s.productGroupName}>{product.productName}</div>
                  <div className={s.productGroupMeta}>
                    {product.conceptos.length} concepto{product.conceptos.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
              <div className={s.productGroupTotal}>
                <span className={s.productGroupTotalLabel}>Total</span>
                <span className={s.productGroupTotalValue}>{formatCurrency(product.total)}</span>
              </div>
              <button
                className={s.expandProductBtn}
                onClick={() => toggleExpanded(product.productId)}
                aria-label={isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
              >
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
            {isExpanded && (
              <div className={s.productConceptos}>
                <table className={s.productsTable}>
                  <thead>
                    <tr>
                      <th>Concepto</th>
                      <th>Cantidad</th>
                      <th>P. Unitario</th>
                      <th>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.conceptos.map(concepto => (
                      <tr key={concepto.id}>
                        <td>
                          <div>{concepto.descripcion}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {concepto.tipo.replace(/_/g, ' ')}
                          </div>
                        </td>
                        <td>{concepto.cantidad}</td>
                        <td>{formatCurrency(concepto.precioUnitario)}</td>
                        <td>{formatCurrency(concepto.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const QuotationInlineDisplay: React.FC<QuotationInlineDisplayProps> = ({ order, style }) => {
  const cotizacion = order.cotizacion;
  if (!cotizacion) return null;

  const statusConfig = getStatusConfig(cotizacion.estado);
  const StatusIcon = statusConfig.icon;
  const statusMessage = getStatusMessage(cotizacion.estado);

  return (
    <div style={style}>
      {/* Section Header */}
      <div className={s.sectionHeader}>
        <FileText size={18} />
        <h3 className={s.sectionTitle}>
          Cotización #{cotizacion.numeroCotizacion || '---'}
        </h3>
        <StatusBadge status={statusConfig.label} dot />
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`${s.statusMessage} ${getStatusMessageClass(statusConfig.variant)}`}>
          <StatusIcon size={14} />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Rejection Reason */}
      {cotizacion.estado === 'RECHAZADA' && cotizacion.motivoRechazo && (
        <div className={s.rejectionBox}>
          <AlertCircle size={14} />
          <div>
            <strong>Motivo del rechazo:</strong>
            <p>{cotizacion.motivoRechazo}</p>
          </div>
        </div>
      )}

      {/* General Info */}
      <div className={s.sectionContent}>
        <div className={s.infoGrid}>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>Número de solicitud</span>
            <span className={s.infoValue}>{order.numeroSolicitud}</span>
          </div>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>Número de cotización</span>
            <span className={s.infoValue}>{cotizacion.numeroCotizacion || '-'}</span>
          </div>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>Fecha de emisión</span>
            <span className={s.infoValue}>{formatDate(order.createdAt)}</span>
          </div>
          <div className={s.infoItem}>
            <span className={s.infoLabel}>Fecha de vigencia</span>
            <span className={s.infoValue}>{formatDate(cotizacion.validaHasta)}</span>
          </div>
          {cotizacion.tiempoEstimadoDias && (
            <div className={s.infoItem}>
              <span className={s.infoLabel}>Tiempo estimado</span>
              <span className={s.infoValue}>{cotizacion.tiempoEstimadoDias} días</span>
            </div>
          )}
          {cotizacion.generadoPorNombre && (
            <div className={s.infoItem}>
              <span className={s.infoLabel}>Generado por</span>
              <span className={s.infoValue}>{cotizacion.generadoPorNombre}</span>
            </div>
          )}
        </div>
      </div>

      {/* Client Data */}
      <div className={s.sectionContent}>
        <h4 className={s.sectionTitle}>Datos del Cliente</h4>
        <div className={s.clientCard}>
          <div className={s.clientRow}>
            <User size={14} />
            <div>
              <span className={s.infoLabel}>Nombre</span>
              <span className={s.infoValue}>{order.clienteNombre}</span>
            </div>
          </div>
          {order.clienteEmail && (
            <div className={s.clientRow}>
              <Mail size={14} />
              <div>
                <span className={s.infoLabel}>Correo electrónico</span>
                <span className={s.infoValue}>{order.clienteEmail}</span>
              </div>
            </div>
          )}
          {order.clienteTelefono && (
            <div className={s.clientRow}>
              <Phone size={14} />
              <div>
                <span className={s.infoLabel}>Teléfono</span>
                <span className={s.infoValue}>{order.clienteTelefono}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Detail */}
      {cotizacion.detalles && cotizacion.detalles.length > 0 && (
        <div className={s.sectionContent}>
          <h4 className={s.sectionTitle}>Detalle de Productos</h4>
          <ProductDetails detalles={cotizacion.detalles} productoNombres={order.productoNombres} />
        </div>
      )}

      {/* Economic Summary */}
      <div className={s.sectionContent}>
        <h4 className={s.sectionTitle}>Resumen Económico</h4>
        <div className={s.summaryCard}>
          <div className={s.summaryRow}>
            <span>Subtotal</span>
            <span>{formatCurrency(cotizacion.subtotal)}</span>
          </div>
          <div className={s.summaryRow}>
            <span>Descuento</span>
            <span style={{ color: 'var(--color-danger)' }}>-{formatCurrency(cotizacion.descuento)}</span>
          </div>
          <div className={s.summaryRow}>
            <span>Impuestos</span>
            <span>{formatCurrency(cotizacion.impuestos)}</span>
          </div>
          <div className={s.summaryDivider} />
          <div className={`${s.summaryRow} ${s.summaryTotal}`}>
            <span>TOTAL</span>
            <span>{formatCurrency(cotizacion.total)}</span>
          </div>
        </div>
      </div>

      {/* Payment Conditions */}
      {(cotizacion.condicionesPago || cotizacion.porcentajeAnticipo || cotizacion.valorAnticipo || cotizacion.saldo) && (
        <div className={s.sectionContent}>
          <h4 className={s.sectionTitle}>Condiciones de Pago</h4>
          <div className={s.paymentCard}>
            {cotizacion.porcentajeAnticipo && (
              <div className={s.paymentRow}>
                <CreditCard size={14} />
                <div>
                  <span className={s.infoLabel}>Anticipo</span>
                  <span className={s.infoValue}>{cotizacion.porcentajeAnticipo}%</span>
                </div>
              </div>
            )}
            {cotizacion.valorAnticipo && (
              <div className={s.paymentRow}>
                <div>
                  <span className={s.infoLabel}>Valor anticipo</span>
                  <span className={s.infoValue}>{formatCurrency(cotizacion.valorAnticipo)}</span>
                </div>
              </div>
            )}
            {cotizacion.saldo && (
              <div className={s.paymentRow}>
                <div>
                  <span className={s.infoLabel}>Saldo / Contra entrega</span>
                  <span className={s.infoValue}>{formatCurrency(cotizacion.saldo)}</span>
                </div>
              </div>
            )}
            {cotizacion.condicionesPago && (
              <div className={s.paymentRow}>
                <div>
                  <span className={s.infoLabel}>Condiciones adicionales</span>
                  <span className={s.infoValue}>{cotizacion.condicionesPago}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Observations */}
      {cotizacion.observaciones && (
        <div className={s.sectionContent}>
          <h4 className={s.sectionTitle}>Observaciones</h4>
          <div className={s.observationsCard}>
            <MessageSquare size={14} />
            <p>{cotizacion.observaciones}</p>
          </div>
        </div>
      )}
    </div>
  );
};
