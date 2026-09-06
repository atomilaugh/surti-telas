import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, FileText, Package, Search, Trash2, Send, Wallet, CheckCircle2, AlertTriangle, Clock, Receipt, CalendarDays, DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import s from './GestionVentas.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmWithReasonModal } from '@/shared/ui/ConfirmWithReasonModal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { salesApi } from '@/infrastructure/api/salesApi';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { receiptsApi } from '@/infrastructure/api/receiptsApi';
import { api } from '@/infrastructure/api/httpClient';
import { useServerPagination } from '@/hooks/useServerPagination';
import { formatCurrency } from '@/shared/utils';
import type { Venta, Pedido } from '@/core/types';

const ESTADOS_VENTA_LABELS: Record<string, string> = {
  COMPLETADA: 'Completada',
  ANULADA: 'Anulada',
};

const TIPO_PAGO_LABELS: Record<string, string> = {
  PAGO_INMEDIATO: 'Pago inmediato',
  ABONO_INICIAL: 'Anticipo',
  CUOTA: 'Cuota',
  PAGO_SALDO: 'Pago de saldo',
};

const MEDIOS_PAGO: { value: string; label: string }[] = [
  { value: 'CASH', label: 'Efectivo' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'CARD', label: 'Tarjeta' },
  { value: 'OTHER', label: 'Otro' },
  { value: 'INSTALLMENTS', label: 'Cuotas' },
];

const CANCELABLE_ORDER_STATES = ['NUEVO', 'PENDIENTE', 'EN_VALIDACION', 'ACEPTADO', 'EN_PRODUCCION', 'LISTO', 'DESPACHADO', 'EN_CAMINO', 'RECIBO_GENERADO', 'RECIBO_ENVIADO', 'ENTREGADO', 'RECHAZADO'] as const;

export const AdminGestionVentas: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [items, setItems] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState<Venta | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Venta | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const [availableOrders, setAvailableOrders] = useState<Pedido[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [createMedioPago, setCreateMedioPago] = useState('CASH');
  const [createObservaciones, setCreateObservaciones] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [filterOrderId, setFilterOrderId] = useState('');
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('');
  const [filterTipoPago, setFilterTipoPago] = useState('');
  const [filterMedioPago, setFilterMedioPago] = useState('');
  const [filterDesde, setFilterDesde] = useState('');
  const [filterHasta, setFilterHasta] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const orderDebouncedSearch = useDebouncedValue(orderSearch, 300);
  const pagination = useServerPagination(20);

  const kpis = useMemo(() => {
    let totalRecibido = 0;
    let ventasConfirmadas = 0;
    let ingresosHoy = 0;
    let abonos = 0;
    let saldoPendiente = 0;
    const hoy = new Date().toISOString().slice(0, 10);

    for (const v of items) {
      if (v.estado !== 'ANULADA') {
        ventasConfirmadas++;
      }

      const esPagada = v.paymentStatus === 'APPROVED' || v.payment?.status === 'PAGADO' || Boolean(v.payment?.paidAt);
      const esHoy = v.fechaVenta.startsWith(hoy);
      const esAbono = v.tipoPago === 'ABONO_INICIAL';
      const esPendiente = !esPagada && v.estado !== 'ANULADA';

      if (esPagada) {
        totalRecibido += v.total;
      }
      if (esHoy && esPagada) {
        ingresosHoy += v.total;
      }
      if (esAbono) {
        abonos++;
      }
      if (esPendiente) {
        saldoPendiente += v.total;
      }
    }

    return { totalRecibido, ventasConfirmadas, ingresosHoy, abonos, saldoPendiente };
  }, [items]);

  const fetchVentas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await salesApi.list({
        search: debouncedSearch || undefined,
        page: pagination.page,
        limit: pagination.limit,
        orderId: filterOrderId || undefined,
        paymentStatus: filterPaymentStatus || undefined,
        tipoPago: filterTipoPago || undefined,
        medioPago: filterMedioPago || undefined,
        desde: filterDesde || undefined,
        hasta: filterHasta || undefined,
      });
      setItems(result.data);
      pagination.setTotalRecords(result.meta.totalRecords);
    } catch {
      setError('No se pudieron cargar las ventas');
      toast.error('No se pudieron cargar las ventas');
    } finally {
      setLoading(false);
    }
  }, [
    debouncedSearch,
    pagination,
    filterOrderId,
    filterPaymentStatus,
    filterTipoPago,
    filterMedioPago,
    filterDesde,
    filterHasta,
  ]);

  const fetchAvailableOrders = useCallback(async () => {
    try {
      const result = await ordersApi.adminList({
        search: orderDebouncedSearch || undefined,
        limit: 100,
      });
      const ordersWithoutSale = result.pedidos.filter(
        (p) => p.estado === 'Pendiente' || (p.estado as string) === 'En validación',
      );
      setAvailableOrders(ordersWithoutSale);
    } catch {
      setAvailableOrders([]);
    }
  }, [orderDebouncedSearch]);

  useEffect(() => {
    void fetchVentas();
  }, [fetchVentas]);

  useEffect(() => {
    if (createModalOpen) {
      void fetchAvailableOrders();
    }
  }, [orderDebouncedSearch, createModalOpen, fetchAvailableOrders]);

  useEffect(() => {
    const handler = () => {
      void fetchVentas();
    };
    window.addEventListener('receipt:sent', handler as EventListener);
    return () => window.removeEventListener('receipt:sent', handler as EventListener);
  }, [fetchVentas]);

  const getEstadoPago = (venta: Venta): string => {
    if (venta.estado === 'ANULADA') return 'Anulada';
    if (venta.paymentStatus === 'REFUNDED') return 'Reembolsado';
    if (venta.paymentStatus === 'ANULADO') return 'Anulado';
    if (venta.paymentStatus === 'REJECTED') return 'Rechazado';
    if (venta.payment) {
      if (venta.payment.status === 'PAGADO' || venta.payment.paidAt) return 'Pagada';
      return 'Pendiente pago';
    }
    if (venta.paymentStatus === 'APPROVED' || venta.paymentId) return 'Pagada';
    return 'Sin pago';
  };

  const getTipoPago = (venta: Venta): string => {
    if (!venta.tipoPago) return '—';
    return TIPO_PAGO_LABELS[venta.tipoPago] ?? venta.tipoPago;
  };

  const getCuotaLabel = (venta: Venta): string => {
    if (typeof venta.numeroCuota === 'number' && typeof venta.totalCuotas === 'number') {
      return `${venta.numeroCuota}/${venta.totalCuotas}`;
    }
    if (typeof venta.numeroCuota === 'number') {
      return `${venta.numeroCuota}`;
    }
    return '—';
  };

  const handleOpenCreate = () => {
    setSelectedOrderId('');
    setCreateMedioPago('CASH');
    setCreateObservaciones('');
    setOrderSearch('');
    setErrors({});
    setCreateModalOpen(true);
    void fetchAvailableOrders();
  };

  const handleCloseCreate = () => {
    setCreateModalOpen(false);
    setSelectedOrderId('');
    setCreateMedioPago('CASH');
    setCreateObservaciones('');
    setOrderSearch('');
    setErrors({});
    setAvailableOrders([]);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!selectedOrderId) newErrors.orderId = 'Selecciona un pedido';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreateVenta = async () => {
    if (!validateForm()) {
      toast.error('Corrige los errores en el formulario');
      return;
    }

    setSaving(true);
    try {
      await salesApi.create({
        orderId: selectedOrderId,
        medioPago: createMedioPago,
        observaciones: createObservaciones || undefined,
      });

      toast.success('Venta registrada correctamente');
      void fetchVentas();
      handleCloseCreate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al crear la venta');
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmCancel = async (motivo: string) => {
    if (!cancelConfirm) return;
    setCancelling(true);
    try {
      await salesApi.cancel(cancelConfirm.id, motivo);
      toast.success('Venta anulada correctamente');
      void fetchVentas();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al anular la venta');
    } finally {
      setCancelling(false);
      setCancelConfirm(null);
    }
  };

  const handleDeleteSale = async () => {
    if (!deleteConfirm) return;
    try {
      await salesApi.remove(deleteConfirm.id);
      void fetchVentas();
      toast.success('Venta eliminada');
      setDeleteConfirm(null);
    } catch {
      toast.error('No se pudo eliminar la venta');
    }
  };

  const columns: DataTableColumn<Venta>[] = [
    {
      key: 'numero',
      header: 'Venta',
      sortable: true,
      width: '110px',
      render: (v) => <span className={s.tdMono}>{v.numero}</span>,
    },
    {
      key: 'orderId',
      header: 'Pedido',
      sortable: true,
      width: '110px',
      render: (v) => <span className={s.tdMono}>{v.numero}</span>,
    },
    {
      key: 'cliente',
      header: 'Cliente',
      sortable: true,
      render: (v) => <span className={s.tdPrimary}>{v.cliente || '—'}</span>,
    },
    {
      key: 'fechaVenta',
      header: 'Fecha',
      sortable: true,
      width: '110px',
      render: (v) => <span className={s.cellDate}>{new Date(v.fechaVenta).toLocaleDateString('es-CO')}</span>,
    },
    {
      key: 'tipoPago',
      header: 'Tipo',
      sortable: true,
      width: '120px',
      render: (v) => <span className="text-xs">{getTipoPago(v)}</span>,
    },
    {
      key: 'cuota',
      header: 'Cuota',
      sortable: false,
      width: '90px',
      render: (v) => <span className="text-xs">{getCuotaLabel(v)}</span>,
    },
    {
      key: 'medioPago',
      header: 'Medio',
      sortable: true,
      width: '110px',
      render: (v) => <span className={s.tdMuted}>{v.medioPago ?? '—'}</span>,
    },
    {
      key: 'total',
      header: 'Monto',
      sortable: true,
      width: '120px',
      align: 'right',
      render: (v) => <span className={s.tdMoney}>{formatCurrency(v.total)}</span>,
    },
    {
      key: 'paymentState',
      header: 'Estado de pago',
      sortable: true,
      width: '140px',
      render: (v) => <StatusBadge status={getEstadoPago(v)} />,
    },
  ];

  const actions = (v: Venta) => [
    {
      label: 'Generar PDF',
      icon: <FileText size={14} aria-hidden="true" focusable="false" />,
      onClick: async (vv: Venta) => {
        try {
          const html = await salesApi.getPdf(vv.id);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
          }
        } catch (err) {
          toast.error(err instanceof Error ? err.message : 'Error al generar PDF');
        }
      },
    },
    ...(v.receipt && (v.receipt.estado === 'Borrador' || v.receipt.estado === 'BORRADOR' || v.receipt.estado === 'EMITIDO') ? [{
      label: 'Enviar recibo',
      icon: <Send size={14} aria-hidden="true" focusable="false" />,
      onClick: async (vv: Venta) => {
        if (!vv.receipt?.id) return;
        try {
          await receiptsApi.updateStatus(vv.receipt.id, 'ENVIADO');
          await fetchVentas();
          if (vv.orderId) {
            try {
              await api.post(`/sales-orders/${encodeURIComponent(vv.orderId)}/retry-receipt`, {});
              toast.success(`Recibo ${vv.receipt.numero} enviado`);
            } catch {
              toast.error(`Recibo ${vv.receipt.numero} enviado, pero no tienes permiso para reintentar el envío`);
            }
          } else {
            toast.success(`Recibo ${vv.receipt.numero} enviado`);
          }
          window.dispatchEvent(new CustomEvent('receipt:sent', { detail: { receiptId: vv.receipt.id } }));
        } catch {
          toast.error('No se pudo enviar el recibo');
        }
      },
    }] : []),
    ...(v.estado !== 'ANULADA' && CANCELABLE_ORDER_STATES.includes((v.orderEstado ?? '') as typeof CANCELABLE_ORDER_STATES[number]) ? [{
      label: 'Anular',
      icon: <FileText size={14} aria-hidden="true" focusable="false" />,
      danger: true,
      onClick: (vv: Venta) => {
        if (vv.estado === 'ANULADA') {
          toast.error('La venta ya está anulada');
          return;
        }
        setCancelConfirm(vv);
      },
    }] : []),
    ...(v.estado === 'ANULADA' ? [{
      label: 'Eliminar',
      icon: <Trash2 size={14} aria-hidden="true" focusable="false" />,
      danger: true,
      onClick: (vv: Venta) => setDeleteConfirm(vv),
    }] : []),
  ];

  const detailPanel: DataTableDetailPanel<Venta> = {
    title: (item) => `Detalle de venta ${item.numero}`,
    size: 'xl',
    header: (item) => ({
      icon: <Receipt size={18} aria-hidden="true" focusable="false" />,
      title: 'Venta',
      code: item.numero,
      subtitle: item.cliente,
      meta: new Date(item.fechaVenta).toLocaleDateString('es-CO'),
      status: item.estado,
      badgeVariant: item.estado === 'ANULADA' ? 'danger' : 'success',
    }),
    kpis: (item) => [
      { label: 'Monto recibido', value: formatCurrency(item.total), icon: <DollarSign size={16} aria-hidden="true" focusable="false" />, tone: 'primary' },
      { label: 'Subtotal', value: formatCurrency(item.subtotal ?? 0), icon: <Package size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Impuestos', value: formatCurrency(item.impuestos ?? 0), icon: <Package size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Descuentos', value: `-${formatCurrency(item.descuentos ?? 0)}`, icon: <Package size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Productos', value: String(item.itemsCount ?? item.items.length), icon: <Package size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Tipo de pago', value: getTipoPago(item), icon: <Wallet size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Cuota', value: getCuotaLabel(item), icon: <CalendarDays size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Estado pago', value: getEstadoPago(item), icon: <CheckCircle2 size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
    ],
    render: (item) => (
      <div className={s.detailModalContent}>
        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Datos de la venta</div>
          <div className={s.detailGrid}>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Número de venta</span>
              <span className={s.detailFieldValue}>{item.numero}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Fecha</span>
              <span className={s.detailFieldValue}>{new Date(item.fechaVenta).toLocaleString('es-CO')}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Cliente</span>
              <span className={s.detailFieldValue}>{item.cliente}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Asesor</span>
              <span className={s.detailFieldValue}>{item.asesor}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Estado</span>
              <span className={s.detailFieldValue}>{ESTADOS_VENTA_LABELS[item.estado] ?? item.estado}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Medio de pago</span>
              <span className={s.detailFieldValue}>{item.medioPago ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Detalle del pago</div>
          <div className={s.detailGrid}>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Tipo de pago</span>
              <span className={s.detailFieldValue}>{getTipoPago(item)}</span>
            </div>
            {getCuotaLabel(item) !== '—' && (
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Cuota</span>
                <span className={s.detailFieldValue}>{getCuotaLabel(item)}</span>
              </div>
            )}
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Estado de pago</span>
              <span className={s.detailFieldValue}>{getEstadoPago(item)}</span>
            </div>
            {item.paymentId && (
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>ID de pago</span>
                <span className={`${s.detailFieldValue} font-mono text-xs`}>{item.paymentId}</span>
              </div>
            )}
            {item.comprobantePagoUrl && (
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Comprobante</span>
                <span className={s.detailFieldValue}>
                  <a href={item.comprobantePagoUrl} target="_blank" rel="noreferrer" className="text-blue-400 underline">Ver archivo</a>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Resumen del pedido</div>
          <div className={s.detailGrid}>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Pedido relacionado</span>
              <span className={s.detailFieldValue}>{item.orderId}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Estado del pedido</span>
              <span className={s.detailFieldValue}>{item.orderEstado ?? '—'}</span>
            </div>
            {item.receipt && (
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Recibo</span>
                <span className={s.detailFieldValue}>{item.receipt.numero} ({item.receipt.estado})</span>
              </div>
            )}
            {item.customOrder && (
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Cotización</span>
                <span className={s.detailFieldValue}>{item.customOrder.numero} ({item.customOrder.estado})</span>
              </div>
            )}
          </div>
        </div>

        <div className={s.detailSection}>
          <div className={s.detailSectionTitle}>Auditoría</div>
          <div className={s.detailGrid}>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Creado</span>
              <span className={s.detailFieldValue}>{new Date(item.createdAt).toLocaleString('es-CO')}</span>
            </div>
            <div className={s.detailField}>
              <span className={s.detailFieldLabel}>Actualizado</span>
              <span className={s.detailFieldValue}>{new Date(item.updatedAt).toLocaleString('es-CO')}</span>
            </div>
            {item.motivoAnulacion && (
              <div className={s.detailField}>
                <span className={s.detailFieldLabel}>Motivo de anulación</span>
                <span className={s.detailFieldValue}>{item.motivoAnulacion}</span>
              </div>
            )}
          </div>
        </div>

        <div className={s.productsSection}>
          <h3>Productos</h3>
          <div className={s.productRow} style={{ fontWeight: 600, borderBottom: '2px solid var(--color-border)' }}>
            <span>Producto</span>
            <span className={s.productCol}>Cant.</span>
            <span className={s.productCol}>Precio unit.</span>
            <span className={s.productCol}>Subtotal</span>
          </div>
          {item.items.map((prod) => (
            <div key={prod.id} className={s.productRow}>
              <span>{prod.nombre}</span>
              <span className={s.productCol}>{prod.cantidad}</span>
              <span className={s.productCol}>{formatCurrency(prod.precio)}</span>
              <span className={s.productCol}>{formatCurrency(prod.precio * prod.cantidad)}</span>
            </div>
          ))}
          {item.items.length === 0 && <span className="text-sm text-[var(--color-text-secondary)]">Sin productos</span>}
          <div className={s.totalsRow}>
            <div className={s.totalsItem}>Subtotal: {formatCurrency(item.subtotal ?? 0)}</div>
            <div className={s.totalsItem}>Impuestos: {formatCurrency(item.impuestos ?? 0)}</div>
            <div className={s.totalsItem}>Descuentos: -{formatCurrency(item.descuentos ?? 0)}</div>
            <div className={s.totalsItem}>Total: {formatCurrency(item.total)}</div>
          </div>
        </div>
      </div>
    ),
  };

  const limpiarFiltros = () => {
    setFilterOrderId('');
    setFilterPaymentStatus('');
    setFilterTipoPago('');
    setFilterMedioPago('');
    setFilterDesde('');
    setFilterHasta('');
    pagination.setPage(1);
  };

  return (
    <div className={s.pageRoot}>
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Gestión de Ventas</h1>
          <p className={s.pageSubtitle}>
            Centro de control financiero · {pagination.totalRecords} venta{pagination.totalRecords === 1 ? '' : 's'} registrada{pagination.totalRecords === 1 ? '' : 's'}
          </p>
        </div>
        <div className={s.headerActions}>
          <Button onClick={handleOpenCreate} leftIcon={<Plus size={16} />}>
            Nueva Venta
          </Button>
        </div>
      </div>

      <div className={s.statsSection}>
        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Operación</div>
          <div className={s.statsRow}>
            <div className={s.statCard}>
              <Package size={20} className={s.statIcon} />
              <div>
                <div className={s.statValue}>{kpis.ventasConfirmadas}</div>
                <div className={s.statLabel}>Ventas confirmadas</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <Clock size={20} className={s.statIconWarning} />
              <div>
                <div className={s.statValue}>{kpis.abonos}</div>
                <div className={s.statLabel}>Abonos</div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Finanzas</div>
          <div className={s.statsRow}>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <CheckCircle2 size={20} className={s.statIconSuccess} />
              <div>
                <div className={s.statValue}>{formatCurrency(kpis.totalRecibido)}</div>
                <div className={s.statLabel}>Total recibido</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardInfo}`}>
              <CalendarDays size={20} className={s.statIconInfo} />
              <div>
                <div className={s.statValue}>{formatCurrency(kpis.ingresosHoy)}</div>
                <div className={s.statLabel}>Ingresos del día</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <AlertTriangle size={20} className={s.statIconDanger} />
              <div>
                <div className={s.statValue}>{formatCurrency(kpis.saldoPendiente)}</div>
                <div className={s.statLabel}>Saldo pendiente</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <SearchInput
            placeholder="Buscar ventas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => setSearch(value)}
            debounceMs={300}
            minChars={0}
          />
        </div>

        <input
          type="text"
          placeholder="ID de pedido"
          className={s.searchInput}
          value={filterOrderId}
          onChange={(e) => { setFilterOrderId(e.target.value); pagination.setPage(1); }}
          style={{ maxWidth: 220 }}
        />
        <select
          className={s.filterSelect}
          value={filterTipoPago}
          onChange={(e) => { setFilterTipoPago(e.target.value); pagination.setPage(1); }}
          style={{ maxWidth: 200 }}
        >
          <option value="">Tipo de pago (todos)</option>
          <option value="PAGO_INMEDIATO">Pago inmediato</option>
          <option value="ABONO_INICIAL">Anticipo</option>
          <option value="CUOTA">Cuota</option>
          <option value="PAGO_SALDO">Pago de saldo</option>
        </select>
        <select
          className={s.filterSelect}
          value={filterPaymentStatus}
          onChange={(e) => { setFilterPaymentStatus(e.target.value); pagination.setPage(1); }}
          style={{ maxWidth: 200 }}
        >
          <option value="">Estado pago (todos)</option>
          <option value="APPROVED">Aprobado</option>
          <option value="PENDING">Pendiente</option>
          <option value="REFUNDED">Reembolsado</option>
          <option value="ANULADO">Anulado</option>
        </select>
        <select
          className={s.filterSelect}
          value={filterMedioPago}
          onChange={(e) => { setFilterMedioPago(e.target.value); pagination.setPage(1); }}
          style={{ maxWidth: 180 }}
        >
          <option value="">Medio (todos)</option>
          <option value="CASH">Efectivo</option>
          <option value="TRANSFER">Transferencia</option>
          <option value="CARD">Tarjeta</option>
          <option value="OTHER">Otro</option>
        </select>
        <div className={s.dateRange}>
          <span className={s.dateRangeLabel}>Rango</span>
          <input
            className={s.dateRangeInput}
            type="date"
            value={filterDesde}
            onChange={(e) => { setFilterDesde(e.target.value); pagination.setPage(1); }}
          />
          <span className={s.dateRangeSeparator}>—</span>
          <input
            className={s.dateRangeInput}
            type="date"
            value={filterHasta}
            onChange={(e) => { setFilterHasta(e.target.value); pagination.setPage(1); }}
          />
        </div>
        {(filterOrderId || filterTipoPago || filterPaymentStatus || filterMedioPago || filterDesde || filterHasta) && (
          <button type="button" className={s.filterClear} onClick={limpiarFiltros}>
            Limpiar filtros
          </button>
        )}
      </div>

      <div className={s.tableCard}>
        {loading && (
          <div className={s.loadingRow}>
            <span>Cargando ventas...</span>
          </div>
        )}
        {!loading && (
          <div className={s.tableScroll}>
            <DataTable
              data={items}
              columns={columns}
              actions={actions}
              detailPanel={detailPanel}
              enableColumnFilters={false}
              enableSorting
              toolbarLeft={null}
              maxVisibleColumns={6}
              emptyMessage={error ? error : 'No se encontraron ventas'}
              enableExport={false}
              enableRowSelection={false}
              serverMode
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              totalItems={pagination.totalRecords}
              onPageChange={pagination.setPage}
            />
          </div>
        )}
      </div>

      <Modal
        open={createModalOpen}
        onClose={handleCloseCreate}
        title="Nueva Venta"
        size="lg"
      >
        <form className={s.productForm} ref={formRef} onSubmit={(e) => { e.preventDefault(); void handleCreateVenta(); }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <h3 className={s.detailSectionTitle} style={{ marginBottom: 10 }}>Seleccionar pedido</h3>
          </div>
          <div style={{ gridColumn: '1 / -1', position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-secondary)', zIndex: 1 }}
            />
            <input
              type="text"
              className={s.searchInput}
              style={{ paddingLeft: '36px', width: '100%' }}
              placeholder="Buscar por número, cliente o asesor..."
              value={orderSearch}
              onChange={(e) => setOrderSearch(e.target.value)}
            />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <select
              className={`${s.filterSelect} ${errors.orderId ? '' : ''}`}
              value={selectedOrderId}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              disabled={availableOrders.length === 0}
              style={{ width: '100%' }}
            >
              <option value="" disabled>Selecciona un pedido</option>
              {availableOrders.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.numero ?? p.id} — {p.cliente} ({p.estado})
                </option>
              ))}
            </select>
            {errors.orderId && <span className="text-xs text-red-400 mt-1">{errors.orderId}</span>}
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className={s.detailFieldLabel}>Medio de pago</label>
            <select
              className={s.filterSelect}
              value={createMedioPago}
              onChange={(e) => setCreateMedioPago(e.target.value)}
              style={{ width: '100%' }}
            >
              {MEDIOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className={s.detailFieldLabel}>Observaciones</label>
            <input
              type="text"
              className={s.searchInput}
              style={{ paddingLeft: 12, width: '100%' }}
              value={createObservaciones}
              onChange={(e) => setCreateObservaciones(e.target.value)}
              placeholder="Observaciones de la venta"
            />
          </div>

          <ModalFooter
            actions={[
              { label: 'Cancelar', variant: 'secondary', type: 'button', onClick: handleCloseCreate },
              {
                label: saving ? 'Guardando...' : 'Registrar venta',
                type: 'submit',
                loading: saving,
                disabled: saving,
              },
            ]}
          />
        </form>
      </Modal>

      <ConfirmWithReasonModal
        open={!!cancelConfirm}
        onClose={() => setCancelConfirm(null)}
        onConfirm={handleConfirmCancel}
        referenceLabel={cancelConfirm ? `Venta ${cancelConfirm.numero}` : undefined}
        loading={cancelling}
      />

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDeleteSale}
        title="Eliminar venta"
        description={`¿Estás seguro de que deseas eliminar la venta "${deleteConfirm?.id}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default AdminGestionVentas;
