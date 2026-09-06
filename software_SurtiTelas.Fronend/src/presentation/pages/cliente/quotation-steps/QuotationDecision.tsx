import { useState } from 'react';
import { Check, X, AlertCircle, Package, DollarSign, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { toast } from 'sonner';
import s from './QuotationDecision.module.css';

export interface QuotationItemDecision {
  detalleId: string;
  customOrderItemId?: string | null;
  descripcion: string;
  tipo: string;
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
  status: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  rejectReason?: string;
  rejectComment?: string;
}

export interface ProductDecision {
  productId: string;
  productName: string;
  status: 'PENDIENTE' | 'ACEPTADO' | 'RECHAZADO';
  rejectReason?: string;
  rejectComment?: string;
  conceptos: QuotationItemDecision[];
  total: number;
}

export interface QuotationDecisionProps {
  quotationId: string;
  numeroCotizacion: string;
  numeroSolicitud: string;
  estado: string;
  fechaEmision?: string;
  validaHasta?: string;
  condicionesPago?: string;
  observaciones?: string;
  subtotal: number;
  descuento: number;
  impuestos: number;
  total: number;
  items: QuotationItemDecision[];
  productoNombres?: Record<string, string>;
  onConfirmSelection: (decisions: QuotationItemDecision[]) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const REJECT_REASONS = [
  { value: 'PRECIO_ALTO', label: 'Precio demasiado alto' },
  { value: 'TIEMPO_ENTREGA', label: 'Tiempo de entrega' },
  { value: 'YA_NO_NECESITO', label: 'Ya no lo necesito' },
  { value: 'QUIERO_MODIFICAR', label: 'Quiero modificarlo' },
  { value: 'OTRO', label: 'Otro' },
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('es-CO');
};

const getTipoLabel = (tipo: string) => {
  const labels: Record<string, string> = {
    PRODUCTO_BASE: 'Producto base',
    MATERIA_PRIMA: 'Materia prima',
    MANO_OBRA: 'Mano de obra',
    DISENO: 'Diseño',
    LOGISTICA: 'Logística',
    OTRO: 'Otro',
  };
  return labels[tipo] ?? tipo.replace(/_/g, ' ');
};

function groupItemsByProduct(items: QuotationItemDecision[], productoNombres?: Record<string, string>): ProductDecision[] {
  const productMap = new Map<string, ProductDecision>();

  items.forEach((item, index) => {
    const productId = item.customOrderItemId ?? `sin-producto-${index}`;
    const productName = item.customOrderItemId
      ? (productoNombres?.[item.customOrderItemId] ?? `Producto ${index + 1}`)
      : item.descripcion;

    if (!productMap.has(productId)) {
      productMap.set(productId, {
        productId,
        productName,
        status: 'PENDIENTE',
        conceptos: [],
        total: 0,
      });
    }

    const product = productMap.get(productId)!;
    product.conceptos.push(item);
    product.total += item.subtotal;
  });

  return Array.from(productMap.values());
}

export const QuotationDecision = ({
  numeroCotizacion,
  numeroSolicitud,
  estado,
  fechaEmision,
  validaHasta,
  condicionesPago,
  observaciones,
  subtotal,
  descuento,
  impuestos,
  total,
  items,
  productoNombres,
  onConfirmSelection,
  onCancel,
  loading = false,
}: QuotationDecisionProps) => {
  const [products, setProducts] = useState<ProductDecision[]>(() =>
    groupItemsByProduct(items, productoNombres)
  );
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectingProduct, setRejectingProduct] = useState<ProductDecision | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectComment, setRejectComment] = useState('');
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const acceptedProducts = products.filter(p => p.status === 'ACEPTADO');
  const rejectedProducts = products.filter(p => p.status === 'RECHAZADO');
  const pendingProducts = products.filter(p => p.status === 'PENDIENTE');
  const totalAccepted = acceptedProducts.reduce((sum, p) => sum + p.total, 0);

  const canConfirm = acceptedProducts.length > 0 && pendingProducts.length === 0;

  const handleAcceptProduct = (productId: string) => {
    setProducts(prev =>
      prev.map(p =>
        p.productId === productId
          ? { ...p, status: 'ACEPTADO', rejectReason: undefined, rejectComment: undefined }
          : p
      )
    );
  };

  const handleRejectClick = (product: ProductDecision) => {
    setRejectingProduct(product);
    setRejectReason('');
    setRejectComment('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectingProduct || !rejectReason) return;
    setProducts(prev =>
      prev.map(p =>
        p.productId === rejectingProduct.productId
          ? { ...p, status: 'RECHAZADO', rejectReason, rejectComment: rejectComment.trim() || undefined }
          : p
      )
    );
    setRejectModalOpen(false);
    setRejectingProduct(null);
    setRejectReason('');
    setRejectComment('');
  };

  const handleChangeDecision = (productId: string) => {
    setProducts(prev =>
      prev.map(p =>
        p.productId === productId
          ? { ...p, status: 'PENDIENTE', rejectReason: undefined, rejectComment: undefined }
          : p
      )
    );
  };

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

  const handleConfirmSelection = () => {
    if (!canConfirm) {
      if (pendingProducts.length > 0) {
        toast.error('Debes decidir sobre todos los productos antes de confirmar.');
      } else if (acceptedProducts.length === 0) {
        toast.error('Debes aceptar al menos un producto.');
      }
      return;
    }
    setConfirmModalOpen(true);
  };

  const handleFinalConfirm = async () => {
    setConfirmModalOpen(false);

    const allDecisions: QuotationItemDecision[] = [];
    products.forEach(product => {
      const productStatus = product.status;
      product.conceptos.forEach(concepto => {
        allDecisions.push({
          ...concepto,
          status: productStatus,
          rejectReason: product.status === 'RECHAZADO' ? product.rejectReason : undefined,
          rejectComment: product.status === 'RECHAZADO' ? product.rejectComment : undefined,
        });
      });
    });

    await onConfirmSelection(allDecisions);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACEPTADO':
        return <StatusBadge status="ACEPTADO" className={s.statusBadge}>Aceptado</StatusBadge>;
      case 'RECHAZADO':
        return <StatusBadge status="RECHAZADO" className={s.statusBadge}>Rechazado</StatusBadge>;
      default:
        return <StatusBadge status="Pendiente" className={s.statusBadge}>Pendiente</StatusBadge>;
    }
  };

  return (
    <div className={s.container}>
      <div className={s.header}>
        <div className={s.headerTop}>
          <div>
            <h2 className={s.title}>Cotización {numeroCotizacion ? `#${numeroCotizacion}` : ''}</h2>
            <p className={s.subtitle}>Solicitud #{numeroSolicitud}</p>
          </div>
          <StatusBadge status={estado} className={s.statusBadge} />
        </div>

        <div className={s.headerMeta}>
          <div className={s.metaItem}>
            <span className={s.metaLabel}>Fecha de emisión</span>
            <span className={s.metaValue}>{formatDate(fechaEmision)}</span>
          </div>
          <div className={s.metaItem}>
            <span className={s.metaLabel}>Vigencia hasta</span>
            <span className={s.metaValue}>{formatDate(validaHasta)}</span>
          </div>
          {condicionesPago && (
            <div className={s.metaItem}>
              <span className={s.metaLabel}>Condiciones de pago</span>
              <span className={s.metaValue}>{condicionesPago}</span>
            </div>
          )}
        </div>
      </div>

      {observaciones && (
        <div className={s.observationsBlock}>
          <div className={s.observationsLabel}><FileText size={14} /> Observaciones</div>
          <p className={s.observationsText}>{observaciones}</p>
        </div>
      )}

      <div className={s.section}>
        <h3 className={s.sectionTitle}>
          <Package size={18} />
          Productos cotizados
        </h3>
        <p className={s.sectionDescription}>Revisa cada producto y decide si lo aceptas o lo rechazas.</p>

        <div className={s.itemsList}>
          {products.map((product, index) => {
            const isExpanded = expandedProducts.has(product.productId);
            return (
              <div key={product.productId} className={`${s.itemCard} ${s[`itemCard${product.status}`]}`}>
                <div className={s.itemHeader}>
                  <div className={s.itemMainInfo}>
                    <div className={s.itemNumber}>#{index + 1}</div>
                    <div className={s.itemInfo}>
                      <div className={s.itemName}>{product.productName}</div>
                      <div className={s.itemMeta}>
                        <span className={s.itemTag}>{product.conceptos.length} concepto{product.conceptos.length !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                  </div>
                  <div className={s.itemStatus}>
                    {getStatusBadge(product.status)}
                  </div>
                </div>

                <div className={s.itemPricing}>
                  <div className={`${s.pricingItem} ${s.pricingItemTotal}`}>
                    <span className={s.pricingLabel}>Total producto</span>
                    <span className={s.pricingTotal}>{formatCurrency(product.total)}</span>
                  </div>
                  <button
                    className={s.expandBtn}
                    onClick={() => toggleExpanded(product.productId)}
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {isExpanded ? 'Ocultar detalle' : 'Ver detalle'}
                  </button>
                </div>

                {isExpanded && (
                  <div className={s.conceptosList}>
                    {product.conceptos.map(concepto => (
                      <div key={concepto.detalleId} className={s.conceptoItem}>
                        <div className={s.conceptoInfo}>
                          <span className={s.conceptoTipo}>{getTipoLabel(concepto.tipo)}</span>
                          <span className={s.conceptoDesc}>{concepto.descripcion}</span>
                        </div>
                        <div className={s.conceptoValues}>
                          <span className={s.conceptoCant}>{concepto.cantidad} und</span>
                          <span className={s.conceptoPrice}>{formatCurrency(concepto.precioUnitario)}</span>
                          <span className={s.conceptoSubtotal}>{formatCurrency(concepto.subtotal)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {product.status === 'RECHAZADO' && product.rejectReason && (
                  <div className={s.rejectInfo}>
                    <AlertCircle size={14} />
                    <span>
                      <strong>Motivo:</strong> {REJECT_REASONS.find(r => r.value === product.rejectReason)?.label ?? product.rejectReason}
                      {product.rejectComment && ` — ${product.rejectComment}`}
                    </span>
                  </div>
                )}

                {product.status === 'PENDIENTE' && (
                  <div className={s.itemActions}>
                    <Button
                      size="sm"
                      variant="success"
                      onClick={() => handleAcceptProduct(product.productId)}
                      className={s.acceptBtn}
                    >
                      <Check size={16} />
                      Aceptar producto
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleRejectClick(product)}
                      className={s.rejectBtn}
                    >
                      <X size={16} />
                      Rechazar producto
                    </Button>
                  </div>
                )}

                {product.status !== 'PENDIENTE' && (
                  <div className={s.itemActions}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleChangeDecision(product.productId)}
                      className={s.undoBtn}
                    >
                      Cambiar decisión
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>
          <DollarSign size={18} />
          Resumen económico
        </h3>
        <div className={s.economicSummary}>
          <div className={s.summaryRow}>
            <span className={s.summaryLabel}>Subtotal</span>
            <span className={s.summaryValue}>{formatCurrency(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Descuento</span>
              <span className={s.summaryValue}>-{formatCurrency(descuento)}</span>
            </div>
          )}
          {impuestos > 0 && (
            <div className={s.summaryRow}>
              <span className={s.summaryLabel}>Impuestos</span>
              <span className={s.summaryValue}>{formatCurrency(impuestos)}</span>
            </div>
          )}
          <div className={`${s.summaryRow} ${s.summaryRowTotal}`}>
            <span className={s.summaryLabel}>Total cotización</span>
            <span className={s.summaryValue}>{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>
          <Check size={18} />
          Resumen de mi selección
        </h3>

        <div className={s.selectionSummary}>
          <div className={s.selectionStats}>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <div className={s.statValue}>{acceptedProducts.length}</div>
              <div className={s.statLabel}>Aceptados</div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <div className={s.statValue}>{rejectedProducts.length}</div>
              <div className={s.statLabel}>Rechazados</div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <div className={s.statValue}>{pendingProducts.length}</div>
              <div className={s.statLabel}>Pendientes</div>
            </div>
          </div>

          {acceptedProducts.length > 0 && (
            <div className={s.acceptedList}>
              <div className={s.acceptedTitle}>Productos aceptados:</div>
              {acceptedProducts.map(product => (
                <div key={product.productId} className={s.acceptedItem}>
                  <Check size={14} className={s.acceptedIcon} />
                  <span>{product.productName}</span>
                  <span className={s.acceptedPrice}>{formatCurrency(product.total)}</span>
                </div>
              ))}
            </div>
          )}

          {rejectedProducts.length > 0 && (
            <div className={s.rejectedList}>
              <div className={s.rejectedTitle}>Productos rechazados:</div>
              {rejectedProducts.map(product => (
                <div key={product.productId} className={s.rejectedItem}>
                  <X size={14} className={s.rejectedIcon} />
                  <span>{product.productName}</span>
                  <span className={s.rejectedPrice}>{formatCurrency(product.total)}</span>
                  {product.rejectReason && (
                    <span className={s.rejectedReason}>
                      — {REJECT_REASONS.find(r => r.value === product.rejectReason)?.label}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className={`${s.summaryRow} ${s.summaryRowSelected}`}>
            <span className={s.summaryLabel}>Total seleccionado</span>
            <span className={s.summaryValueSelected}>{formatCurrency(totalAccepted)}</span>
          </div>
        </div>

        {pendingProducts.length > 0 && (
          <div className={s.validationWarning}>
            <AlertCircle size={16} />
            <span>Debes decidir sobre todos los productos antes de confirmar.</span>
          </div>
        )}

        {acceptedProducts.length === 0 && pendingProducts.length === 0 && (
          <div className={s.validationWarning}>
            <AlertCircle size={16} />
            <span>Debes aceptar al menos un producto para continuar.</span>
          </div>
        )}
      </div>

      <div className={s.footerActions}>
        <Button variant="secondary" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          onClick={handleConfirmSelection}
          disabled={!canConfirm || loading}
          className={s.confirmBtn}
        >
          {loading ? 'Procesando...' : 'Revisar selección'}
        </Button>
      </div>

      <Modal
        open={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectingProduct(null);
          setRejectReason('');
          setRejectComment('');
        }}
        title="Rechazar producto"
        description={`Indica por qué deseas rechazar "${rejectingProduct?.productName ?? ''}"`}
        size="md"
        variant="form"
      >
        <div className={s.rejectForm}>
          <div className={s.rejectReasonOptions}>
            <label className={s.rejectFormLabel}>¿Por qué deseas rechazar este producto? <span className={s.required}>*</span></label>
            <div className={s.reasonOptions}>
              {REJECT_REASONS.map(reason => (
                <button
                  key={reason.value}
                  type="button"
                  className={`${s.reasonOption} ${rejectReason === reason.value ? s.reasonOptionSelected : ''}`}
                  onClick={() => setRejectReason(reason.value)}
                >
                  {reason.label}
                </button>
              ))}
            </div>
          </div>

          <div className={s.rejectCommentField}>
            <label className={s.rejectFormLabel}>Comentario (opcional)</label>
            <textarea
              className={s.rejectTextarea}
              rows={3}
              placeholder="Agrega más detalles si lo deseas..."
              value={rejectComment}
              onChange={(e) => setRejectComment(e.target.value)}
            />
          </div>

          <ModalFooter
            actions={[
              {
                label: 'Cancelar',
                variant: 'secondary',
                onClick: () => {
                  setRejectModalOpen(false);
                  setRejectingProduct(null);
                  setRejectReason('');
                  setRejectComment('');
                },
              },
              {
                label: 'Rechazar producto',
                variant: 'danger',
                onClick: handleConfirmReject,
                disabled: !rejectReason,
              },
            ]}
          />
        </div>
      </Modal>

      <Modal
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Confirmar selección"
        description="Estás a punto de confirmar los productos que deseas comprar."
        size="md"
        variant="form"
      >
        <div className={s.confirmModal}>
          <div className={s.confirmSummary}>
            <div className={s.confirmRow}>
              <span className={s.confirmLabel}>Productos aceptados:</span>
              <span className={s.confirmValue}>{acceptedProducts.length}</span>
            </div>
            <div className={s.confirmRow}>
              <span className={s.confirmLabel}>Productos rechazados:</span>
              <span className={s.confirmValue}>{rejectedProducts.length}</span>
            </div>
            <div className={`${s.confirmRow} ${s.confirmRowTotal}`}>
              <span className={s.confirmLabel}>Total de la selección:</span>
              <span className={s.confirmValueTotal}>{formatCurrency(totalAccepted)}</span>
            </div>
          </div>

          {acceptedProducts.length > 0 && (
            <div className={s.confirmProductsList}>
              <div className={s.confirmProductsTitle}>Productos aceptados:</div>
              {acceptedProducts.map(product => (
                <div key={product.productId} className={s.confirmProductItem}>
                  <Check size={14} className={s.confirmProductIcon} />
                  <span>{product.productName}</span>
                  <span className={s.confirmProductPrice}>{formatCurrency(product.total)}</span>
                </div>
              ))}
            </div>
          )}

          {rejectedProducts.length > 0 && (
            <div className={s.confirmWarning}>
              <AlertCircle size={16} />
              <span>
                Los productos rechazados no se incluirán en tu pedido. El asesor podrá contactarte si necesita más información.
              </span>
            </div>
          )}

          <div className={s.confirmFinalWarning}>
            <AlertCircle size={16} />
            <span>Una vez confirmada, no podrás modificar esta selección.</span>
          </div>

          <ModalFooter
            actions={[
              {
                label: 'Volver',
                variant: 'secondary',
                onClick: () => setConfirmModalOpen(false),
              },
              {
                label: 'Confirmar selección',
                variant: 'primary',
                onClick: handleFinalConfirm,
                disabled: loading,
              },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default QuotationDecision;
