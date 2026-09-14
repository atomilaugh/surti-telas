import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Save, Trash2, Eye, Ban, X, Package, Clock, Factory, AlertCircle, Wallet, RefreshCw, CheckCircle2, AlertTriangle, DollarSign, Phone, Mail, MapPin, CreditCard, FileText, ExternalLink, ChevronRight, Check } from 'lucide-react';
import { toast } from 'sonner';
import { SearchInput } from '@/shared/ui/SearchInput';
import s from './Pedidos.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '../../../shared/ui/Button';
import { DataTable } from '../../../shared/ui/DataTable';
import { Modal } from '../../../shared/ui/Modal';
import { cn } from '@/shared/utils';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import { ConfirmWithReasonModal } from '@/shared/ui/ConfirmWithReasonModal';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { paymentsApi, type Payment } from '@/infrastructure/api/paymentsApi';
import { customOrdersApi } from '@/infrastructure/api/customOrdersApi';
import { useAuthStore } from '@/core/stores/authStore';
import { hasPermission } from '@/presentation/routes/protectedRouteHelpers';
import { authApi } from '@/infrastructure/api/authApi';
import { usersApi, type Usuario } from '@/infrastructure/api/usersApi';
import { ESTADOS_PEDIDO, type EstadoPedido, CUSTOM_ORDER_STATUS_BACKEND_MAP, CUSTOM_ORDER_STATUS_FRONTEND_MAP, ESTADOS_PEDIDO_PERMITIDOS } from '@/shared/constants/options';
import type { Pedido, PedidoItem } from '@/core/types';
import { useServerPagination } from '@/hooks/useServerPagination';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { RegistrarAbonoModal } from '@/presentation/components/RegistrarAbonoModal';
import { OrderStatusSelector } from '@/shared/ui/OrderStatusSelector';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  calculatePaymentSummary,
  PAYMENT_STATUS_META,
  type PaymentSummary,
  type PaymentStatusKey,
} from '@/shared/utils/orderPayment';

type PedidoFormItem = {
  id: string;
  nombre: string;
  precio: number;
  cantidad: number;
};

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

export const AdminPedidos: React.FC = () => {
  const [pageData, setPageData] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Usuario[]>([]);
  const [asesores, setAsesores] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [isChangingState, setIsChangingState] = useState(false);

  const [clienteId, setClienteId] = useState('');
  const [asesorId, setAsesorId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [estado, setEstado] = useState<Pedido['estado']>(ESTADOS_PEDIDO[0]);
  const [observaciones, setObservaciones] = useState('');
  const [items, setItems] = useState<PedidoFormItem[]>([
    { id: 'I1', nombre: '', precio: 0, cantidad: 1 },
  ]);
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<Pedido | null>(null);
  const [cancelConfirm, setCancelConfirm] = useState<Pedido | null>(null);
  const [_cancelMotivo, setCancelMotivo] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState<Pedido | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [paymentsByOrderId, setPaymentsByOrderId] = useState<Record<string, Payment[]>>({});
  const [abonoModalOpen, setAbonoModalOpen] = useState(false);
  const [abonoPedido, setAbonoPedido] = useState<Pedido | null>(null);

  const permissions = useAuthStore.getState().user?.permissions ?? [];
  const canCreatePayments = hasPermission(permissions, 'payments:create');

  const {
    page,
    limit,
    totalPages,
    totalRecords,
    setPage,
    setTotalRecords,
  } = useServerPagination(10);
  const [reloadToken, setReloadToken] = useState(0);
  const asesorInicializado = useRef(false);

  // ---- Filtros nuevos (cliente, asesor, estado, estado de pago) ----
  const [filtroClienteId, setFiltroClienteId] = useState('');
  const [filtroAsesorId, setFiltroAsesorId] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroEstadoPago, setFiltroEstadoPago] = useState<string>('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  const limpiarFiltros = () => {
    setFiltroClienteId('');
    setFiltroAsesorId('');
    setFiltroEstado('');
    setFiltroEstadoPago('');
    setFiltroDesde('');
    setFiltroHasta('');
    setSearch('');
    setPage(1);
  };

  const reload = useCallback(() => setReloadToken(t => t + 1), []);

  const openAbonoModal = (pedido: Pedido) => {
    setAbonoPedido(pedido);
    setAbonoModalOpen(true);
  };

  const handleAbonoSuccess = () => {
    reload();
  };

  // Función para confirmar un pago usando el endpoint existente
  const handleConfirmPayment = async (paymentId: string) => {
    setConfirmingPayment(true);
    try {
      await paymentsApi.updateStatus(paymentId, 'Aprobado');
      toast.success('Pago confirmado correctamente');
      // Recargar los datos del pedido para obtener la información actualizada
      reload();
    } catch (error) {
      console.error('Error confirmando pago:', error);
      toast.error('Error al confirmar el pago');
    } finally {
      setConfirmingPayment(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const ordersQuery: Record<string, string | number | boolean | undefined | null> = {
          page,
          limit,
        };
        if (debouncedSearch.trim()) ordersQuery.search = debouncedSearch.trim();

        const perms = useAuthStore.getState().user?.permissions ?? [];
        const canReadUsers = hasPermission(perms, 'users:read');

        const [ordersResult, clientesResult, _profile, asesoresResult] = await Promise.all([
          ordersApi.list(ordersQuery),
          canReadUsers ? usersApi.list({ limit: 100, role: 'CLIENTE' }) : Promise.resolve([]),
          authApi.me(),
          canReadUsers ? usersApi.list({ limit: 100, role: 'ASESOR' }) : Promise.resolve([]),
        ]);

        if (!cancelled) {
          setClientes(clientesResult);
          setAsesores(asesoresResult);

          const ESTADO_RECHAZADO: EstadoPedido = 'Rechazado';
          const ESTADOS_OCULTOS = new Set([ESTADO_RECHAZADO] as [EstadoPedido]);
          const pedidos = (ordersResult.pedidos ?? []).filter((p) => !ESTADOS_OCULTOS.has(p.estado));
          setPageData(pedidos);
          setTotalRecords(ordersResult.meta.totalRecords ?? pedidos.length);

          if (!asesorInicializado.current && asesoresResult.length) {
            const adminAsesor = asesoresResult.find((u) => u.rol === 'ASESOR');
            if (adminAsesor) {
              setAsesorId(adminAsesor.id);
              asesorInicializado.current = true;
            }
          }
        }
      } catch {
        if (!cancelled) toast.error('No se pudieron cargar los pedidos');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [page, limit, debouncedSearch, reloadToken, setTotalRecords]);

  useEffect(() => {
    let cancelled = false;
    setLoadingPayments(true);
      paymentsApi
        .list({ limit: 100 })
      .then((payments) => {
        if (!cancelled) {
          const map: Record<string, Payment[]> = {};
          payments.forEach((p) => {
            if (!map[p.orderId]) map[p.orderId] = [];
            map[p.orderId].push(p);
          });
          setPaymentsByOrderId(map);
        }
      })
      .catch(() => {
        if (!cancelled) setPaymentsByOrderId({});
      })
      .finally(() => {
        if (!cancelled) setLoadingPayments(false);
      });
    return () => { cancelled = true; };
  }, [reloadToken, page]);

  const getOrderSummary = useCallback((p: Pedido | null | undefined): PaymentSummary => {
    const base = calculatePaymentSummary(p);
    if (!p) return base;
    const payments = paymentsByOrderId[p.id] ?? [];
    if (payments.length === 0) return base;
    const approvedAmount = payments
      .filter((pmt) => pmt.status === 'Aprobado')
      .reduce((sum, pmt) => sum + pmt.amount, 0);
    const pagado = Math.round(approvedAmount * 100) / 100;
    const saldo = Math.max(0, Math.round((base.total - pagado) * 100) / 100);
    let estado: PaymentStatusKey;
    if (p.estado === 'Cancelado') {
      estado = 'ANULADO';
    } else if (saldo <= 0.5) {
      estado = 'PAGADO';
    } else if (pagado > 0) {
      estado = 'PAGO_PARCIAL';
    } else if (payments.some((pmt) => pmt.status === 'Pendiente')) {
      estado = 'PENDIENTE';
    } else {
      estado = base.estado;
    }
    return { ...base, pagado, saldo, estado };
  }, [paymentsByOrderId]);

  // ---- Filtros client-side (estado, estado de pago, cliente, asesor, fecha) ----
  const pedidosFiltrados = useMemo(() => {
    return pageData.filter((p) => {
      if (filtroEstado && p.estado !== filtroEstado) return false;
      if (filtroClienteId && p.clienteId !== filtroClienteId) return false;
      if (filtroAsesorId && p.asesorId !== filtroAsesorId) return false;
      if (filtroDesde || filtroHasta) {
        const d = new Date(p.createdAt ?? p.fecha);
        if (filtroDesde && d < new Date(filtroDesde)) return false;
        if (filtroHasta && d > new Date(`${filtroHasta}T23:59:59`)) return false;
      }
      if (filtroEstadoPago) {
        const { estado } = getOrderSummary(p);
        if (estado !== filtroEstadoPago) return false;
      }
      return true;
    });
  }, [pageData, filtroEstado, filtroClienteId, filtroAsesorId, filtroEstadoPago, filtroDesde, filtroHasta, getOrderSummary]);

  // ---- Resumen superior (calculado a partir de los datos cargados) ----
  const resumen = useMemo(() => {
    let total = 0;
    let pendientes = 0;
    let enProduccion = 0;
    let pagoPendiente = 0;
    let valorTotal = 0;
    let totalRecibido = 0;
    let saldoPendiente = 0;
    for (const p of pageData) {
      total += 1;
      if (p.estado === 'Pendiente' || p.estado === 'En validación') pendientes += 1;
      if (p.estado === 'Aceptado' || p.estado === 'Listo') enProduccion += 1;
      const { estado, pagado, saldo, total: totalPedido } = getOrderSummary(p);
      if (estado === 'PENDIENTE' || estado === 'SIN_PAGOS' || estado === 'PAGO_PARCIAL') {
        pagoPendiente += 1;
      }
      valorTotal += totalPedido;
      totalRecibido += pagado;
      saldoPendiente += saldo;
    }
    return { total, pendientes, enProduccion, pagoPendiente, valorTotal, totalRecibido, saldoPendiente };
  }, [pageData, getOrderSummary]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, [setPage]);

  const subtotal = items.reduce((sum, it) => sum + it.precio * it.cantidad, 0);
  const totalItems = items.reduce((sum, it) => sum + it.cantidad, 0);

  const resetForm = () => {
    setClienteId('');
    setAsesorId('');
    setFecha(new Date().toISOString().slice(0, 10));
    setEstado(ESTADOS_PEDIDO[0]);
    setObservaciones('');
    setItems([{ id: 'I1', nombre: '', precio: 0, cantidad: 1 }]);
    setFormError(null);
  };

  const openNew = () => {
    resetForm();
    setSelectedPedido(null);
    setEditModalOpen(true);
  };

  const openEdit = (p: Pedido) => {
    setSelectedPedido(p);
    setClienteId(p.clienteId ?? '');
    setFecha(p.fecha);
    setEstado(p.estado);
    setObservaciones(p.observaciones || '');
    setItems(
      (p.itemsList ?? []).map((it, idx) => ({
        id: `I${idx + 1}-${Date.now()}`,
        nombre: it.nombre,
        precio: it.precio,
        cantidad: it.cantidad,
      }))
    );
    setFormError(null);
    setEditModalOpen(true);
  };

  const updateFormItem = (id: string, field: keyof PedidoFormItem, value: string | number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: `I${prev.length + 1}-${Date.now()}`, nombre: '', precio: 0, cantidad: 1 },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!clienteId) {
      setFormError('Selecciona un cliente');
      return;
    }

    const itemsValidos = items.filter((it) => it.nombre.trim() && it.cantidad > 0);
    if (itemsValidos.length === 0) {
      setFormError('Debes agregar al menos un producto al pedido');
      return;
    }

    setSaving(true);
    try {
      const itemsList: PedidoItem[] = itemsValidos.map((it) => ({
        productId: undefined,
        nombre: it.nombre,
        precio: it.precio,
        cantidad: it.cantidad,
      }));

      if (selectedPedido) {
        const actualizado = await ordersApi.updateOrderFull(selectedPedido.id, {
          clienteId,
          asesorId: asesorId || undefined,
          prioridad: undefined,
          observaciones: observaciones || undefined,
          itemsList,
        });
        setPageData((prev) =>
          prev.map((p) => (p.id === selectedPedido.id ? actualizado : p))
        );
        toast.success(`Pedido ${selectedPedido.id} actualizado`);
      } else {
        const resultado = await ordersApi.create({
          clienteId,
          asesorId: asesorId || undefined,
          itemsList,
          prioridad: undefined,
          observaciones: observaciones || undefined,
        });
        await reload();
        toast.success(`Pedido ${resultado.pedido.id} creado`);
      }
      setEditModalOpen(false);
      resetForm();
    } catch {
      toast.error('No fue posible guardar el pedido.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async (motivo: string) => {
    if (!cancelConfirm) return;
    setCancelling(true);
    try {
      const isCustom = cancelConfirm.tipoFlujo === 'PERSONALIZADO';
      if (isCustom && !cancelConfirm.customOrderId) {
        throw new Error('El pedido personalizado no tiene asociado un CustomOrder');
      }
      if (isCustom) {
        await customOrdersApi.updateStatus(cancelConfirm.customOrderId!, CUSTOM_ORDER_STATUS_BACKEND_MAP['Cancelado'] || 'CANCELADO');
      } else {
        await ordersApi.cancelOrder(cancelConfirm.id, motivo);
      }
      toast.success('Pedido cancelado correctamente');
      setCancelConfirm(null);
      await reload();
    } catch {
      toast.error('No se pudo cancelar el pedido');
    } finally {
      setCancelling(false);
    }
  };

  const doUpdateStatus = async (pedido: Pedido, nuevoEstado: string): Promise<void> => {
    setSaving(true);
    try {
      const isCustom = pedido.tipoFlujo === 'PERSONALIZADO';
      const targetId = isCustom ? pedido.customOrderId! : pedido.id;

      if (isCustom) {
        const payload = CUSTOM_ORDER_STATUS_BACKEND_MAP[nuevoEstado] || nuevoEstado;
        await customOrdersApi.updateStatus(targetId, payload);
        await reload();
      } else {
        const updatedPedido = await ordersApi.updateStatus(targetId, nuevoEstado);
        if (updatedPedido) {
          setPageData((prev) =>
            prev.map((p) => (p.id === updatedPedido.id ? updatedPedido : p)),
          );
          setStatusConfirm((prev) =>
            (prev && prev.id === updatedPedido.id ? updatedPedido : prev),
          );
          if (updatedPedido.estado !== nuevoEstado) {
            throw new Error(`El backend no confirmó el estado solicitado. Esperado: ${nuevoEstado}, recibido: ${updatedPedido.estado}`);
          }
        }
        await reload();
      }

      toast.success(`Pedido ${pedido.id} actualizado a ${nuevoEstado}`);

      if (nuevoEstado === 'Entregado') {
        window.location.href = '/admin/gestion-ventas';
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('401') || message.includes('No autorizado') || message.includes('Unauthorized')) {
        toast.error('Tu sesión expiró o no es válida. Inicia sesión nuevamente.');
        useAuthStore.getState().logout();
      } else {
        toast.error(`No se pudo actualizar el estado: ${message || 'Error desconocido'}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async () => {
    if (!statusConfirm || !selectedStatus) return;
    await doUpdateStatus(statusConfirm, selectedStatus);
    setStatusConfirm(null);
    setSelectedStatus(null);
  };

  const getNextValidState = useCallback((currentState: EstadoPedido): EstadoPedido | null => {
    const allowed = ESTADOS_PEDIDO_PERMITIDOS[currentState];
    if (!allowed || allowed.length === 0) return null;
    const nextStates: EstadoPedido[] = ['Aceptado', 'Listo', 'Enviado', 'Entregado'];
    return nextStates.find(s => allowed.includes(s)) ?? allowed[0] ?? null;
  }, []);

  const doChangeDetailState = async (pedido: Pedido) => {
    const nextState = getNextValidState(pedido.estado);
    if (!nextState) return;
    
    setIsChangingState(true);
    try {
      await doUpdateStatus(pedido, nextState);
      // The modal will update via reload
    } finally {
      setIsChangingState(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await ordersApi.delete(deleteConfirm.id);
      await reload();
      toast.success(`Pedido ${deleteConfirm.id} eliminado`);
      setDeleteConfirm(null);
    } catch {
      toast.error('No se pudo eliminar el pedido');
    }
  };

  const detailPedido = detailId ? pageData.find(p => p.id === detailId) : null;

  // Find client data for the detail modal
  const detailCliente = detailPedido ? clientes.find(c => c.id === detailPedido.clienteId) : null;

  // Calculate payment summary once
  const paymentSummary = detailPedido ? calculatePaymentSummary(detailPedido) : null;

  const pendingPayment = detailPedido ? (paymentsByOrderId[detailPedido.id]?.find((p) => p.status === 'Pendiente') ?? null) : null;
  const pendingPaymentId = pendingPayment?.id ?? null;

  // Determine if order has installments
  const hasInstallments = detailPedido?.ventas?.some(v => v.tipoPago === 'ABONO_INICIAL' || v.tipoPago === 'CUOTA' || (v.totalCuotas && v.totalCuotas > 1)) ?? false;
  const totalCuotas = detailPedido?.ventas?.find(v => v.totalCuotas)?.totalCuotas ?? 0;
  const cuotasPagadas = detailPedido?.ventas?.filter(v => v.estado === 'COMPLETADA' && (v.tipoPago === 'ABONO_INICIAL' || v.tipoPago === 'CUOTA' || v.esAnticipo)).length ?? 0;
  const cuotasFaltantes = Math.max(0, totalCuotas - cuotasPagadas);
  const progress = totalCuotas > 0 ? (cuotasPagadas / totalCuotas) * 100 : 0;

  // Compute next valid state for display
  const nextStateForDisplay = detailPedido ? getNextValidState(detailPedido.estado) : null;

  return (
    <div className={s.pageRoot}>
      {/* ============== Header ============== */}
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Pedidos</h1>
          <p className={s.pageSubtitle}>
            Centro de control y seguimiento · {totalRecords} pedido{totalRecords === 1 ? '' : 's'} registrado{totalRecords === 1 ? '' : 's'}
          </p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" leftIcon={<RefreshCw size={15} />} onClick={reload}>
            Actualizar
          </Button>
          <Button leftIcon={<Plus size={16} />} onClick={openNew}>
            Nuevo pedido
          </Button>
        </div>
      </div>

      {/* ============== Indicadores ============== */}
      <div className={s.statsSection}>
        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Operación</div>
          <div className={s.statsRow}>
            <div className={s.statCard}>
              <Package size={20} className={s.statIcon} />
              <div>
                <div className={s.statValue}>{resumen.total}</div>
                <div className={s.statLabel}>Total pedidos</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <Clock size={20} className={s.statIconWarning} />
              <div>
                <div className={s.statValue}>{resumen.pendientes}</div>
                <div className={s.statLabel}>Pendientes</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardInfo}`}>
              <Factory size={20} className={s.statIconInfo} />
              <div>
                <div className={s.statValue}>{resumen.enProduccion}</div>
                <div className={s.statLabel}>En producción</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <AlertCircle size={20} className={s.statIconDanger} />
              <div>
                <div className={s.statValue}>{resumen.pagoPendiente}</div>
                <div className={s.statLabel}>Pago pendiente</div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Finanzas</div>
          <div className={s.statsRow}>
            <div className={`${s.statCard} ${s.statCardAccent}`}>
              <Wallet size={20} className={s.statIconAccent} />
              <div>
                <div className={s.statValue}>{formatoCOP(resumen.valorTotal)}</div>
                <div className={s.statLabel}>Valor total</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <CheckCircle2 size={20} className={s.statIconSuccess} />
              <div>
                <div className={s.statValue}>{formatoCOP(resumen.totalRecibido)}</div>
                <div className={s.statLabel}>Total recibido</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <AlertTriangle size={20} className={s.statIconDanger} />
              <div>
                <div className={s.statValue}>{formatoCOP(resumen.saldoPendiente)}</div>
                <div className={s.statLabel}>Saldo pendiente</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============== Toolbar / Filtros ============== */}
      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <SearchInput
            placeholder="Buscar pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => { setSearch(value); setPage(1); }}
            debounceMs={100}
            minChars={0}
          />
        </div>

        <select
          className={s.filterSelect}
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); setPage(1); }}
          aria-label="Estado del pedido"
          title="Estado del pedido"
        >
          <option value="">Estado</option>
          {ESTADOS_PEDIDO.map((es) => (
            <option key={es} value={es}>{es}</option>
          ))}
        </select>

        <select
          className={s.filterSelect}
          value={filtroEstadoPago}
          onChange={(e) => { setFiltroEstadoPago(e.target.value); setPage(1); }}
          aria-label="Estado de pago"
          title="Estado de pago"
        >
          <option value="">Pago</option>
          {(Object.keys(PAYMENT_STATUS_META) as PaymentStatusKey[]).map((k) => (
            <option key={k} value={k}>{PAYMENT_STATUS_META[k].label}</option>
          ))}
        </select>

        <select
          className={s.filterSelect}
          value={filtroAsesorId}
          onChange={(e) => { setFiltroAsesorId(e.target.value); setPage(1); }}
          aria-label="Asesor"
          title="Asesor"
        >
          <option value="">Asesor</option>
          {asesores.map((a) => (
            <option key={a.id} value={a.id}>{a.nombre}</option>
          ))}
        </select>

        <select
          className={s.filterSelect}
          value={filtroClienteId}
          onChange={(e) => { setFiltroClienteId(e.target.value); setPage(1); }}
          aria-label="Cliente"
          title="Cliente"
        >
          <option value="">Cliente</option>
          {clientes.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>

        <div className={s.dateRange}>
          <span className={s.dateRangeLabel}>Rango de fechas</span>
          <input
            className={s.dateRangeInput}
            type="date"
            value={filtroDesde}
            onChange={(e) => { setFiltroDesde(e.target.value); setPage(1); }}
            aria-label="Desde"
            title="Desde"
            placeholder="dd/mm/aaaa"
          />
          <span className={s.dateRangeSeparator}>—</span>
          <input
            className={s.dateRangeInput}
            type="date"
            value={filtroHasta}
            onChange={(e) => { setFiltroHasta(e.target.value); setPage(1); }}
            aria-label="Hasta"
            title="Hasta"
            placeholder="dd/mm/aaaa"
          />
        </div>

        <button type="button" className={s.filterClear} onClick={limpiarFiltros}>
          <X size={14} />
          Limpiar filtros
        </button>
      </div>

      <div className={s.tableCard}>
        {loading && (
          <div className={s.loadingRow}>
            <span>Cargando pedidos...</span>
          </div>
        )}
        {!loading && (
          <div className={s.tableScroll}>
          <DataTable<Pedido>
            title="Pedidos"
            subtitle="Listado completo de pedidos"
            data={pedidosFiltrados}
            pageSize={limit}
            emptyMessage="Sin pedidos con los filtros actuales"
            enableSorting
            enableColumnFilters={false}
            enableRowSelection={false}
            enableExport
            exportFileName="pedidos"
            maxVisibleColumns={8}
            serverMode
            currentPage={page}
            totalPages={totalPages}
            totalItems={pedidosFiltrados.length}
            onPageChange={handlePageChange}
            columns={[
              {
                key: 'id',
                header: 'Pedido',
                width: '128px',
                render: (p) => <span className={s.tdMono}>{p.numero ?? p.id}</span>,
              },
              {
                key: 'cliente',
                header: 'Cliente',
                render: (p) => (
                  <div className={s.cellClient}>
                    <span className={s.cellClientName}>{p.cliente}</span>
                    {p.asesor ? (
                      <span className={s.cellClientMeta}>
                        <span className={s.cellClientMetaPrefix}>Asesor:</span>
                        {p.asesor}
                      </span>
                    ) : null}
                  </div>
                ),
              },
              {
                key: 'fecha',
                header: 'Fecha',
                width: '108px',
                render: (p) => <span className={s.cellDate}>{p.fecha}</span>,
                hidden: true,
              },
              {
                key: 'estado',
                header: 'Estado',
                width: '170px',
                render: (p) => <StatusBadge status={p.estado} dot />,
              },
              {
                key: 'estadoPago',
                header: 'Pago',
                width: '120px',
                render: (p) => {
                  const { estado } = getOrderSummary(p);
                  return <StatusBadge status={estado} dot />;
                },
              },
              {
                key: 'total',
                header: 'Total',
                width: '108px',
                render: (p) => {
                  const { total } = getOrderSummary(p);
                  return <span className={s.tdMoney}>{formatoCOP(total)}</span>;
                },
              },
              {
                key: 'pagado',
                header: 'Pagado',
                width: '108px',
                render: (p) => {
                  const { pagado } = getOrderSummary(p);
                  return <span className={s.tdMoney}>{formatoCOP(pagado)}</span>;
                },
              },
              {
                key: 'saldo',
                header: 'Saldo',
                width: '108px',
                   render: (p) => {
                   const { saldo, estado } = getOrderSummary(p);
                  const isPagado = estado === 'PAGADO' || saldo <= 0.5;
                  return (
                    <span className={`${s.tdMoney} ${isPagado ? s.tdMoneyOk : s.tdMoneyDanger}`}>
                      {formatoCOP(saldo)}
                    </span>
                  );
                },
              },
            ]}
            actions={(p) => {
              const summary = getOrderSummary(p);
              return [
                { label: 'Ver detalle', icon: <Eye size={14} />, onClick: () => setDetailId(p.id) },
                ...(summary.saldo > 0 ? [{ label: 'Realizar abono', icon: <DollarSign size={14} />, onClick: () => openAbonoModal(p) }] : []),
                { label: 'Editar', icon: <Save size={14} />, onClick: () => openEdit(p) },
                { label: 'Estados', onClick: () => { setStatusConfirm(p); setSelectedStatus(null); } },
                ...(p.estado !== 'Cancelado' ? [{ label: 'Anular', icon: <Ban size={14} />, onClick: () => setCancelConfirm(p), danger: true }] : []),
                ...(p.estado === 'Cancelado' ? [{ label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(p), danger: true }] : []),
              ];
            }}
          />
          </div>
        )}
      </div>

      <Modal
        open={editModalOpen}
        onClose={() => { setEditModalOpen(false); resetForm(); }}
        title={selectedPedido ? 'Editar Pedido' : 'Nuevo Pedido'}
        description={selectedPedido ? `Modificando ${selectedPedido.id}` : 'Completa la información del pedido'}
        size="xl"
        variant="form"
      >
        <form onSubmit={handleSubmit} className={f.form}>
          {formError && <div className={f.formError}>{formError}</div>}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información general</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Cliente *</label>
                <select className={f.select} value={clienteId} onChange={(e) => setClienteId(e.target.value)}>
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>Asesor *</label>
                <select className={f.select} value={asesorId} onChange={(e) => setAsesorId(e.target.value)}>
                  <option value="">Selecciona un asesor</option>
                  {asesores.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>Fecha *</label>
                <input className={f.input} type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Estado *</label>
                <select className={f.select} value={estado} onChange={(e) => setEstado(e.target.value as Pedido['estado'])}>
                  {ESTADOS_PEDIDO.map(es => (
                    <option key={es} value={es}>{es}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Productos del pedido</h3>
            <div className={f.field}>
              <label className={f.label}>Productos del pedido</label>
              <table className={f.itemsTable}>
                <thead>
                  <tr>
                    <th>Descripción</th>
                    <th className={f.centerCol}>Cant.</th>
                    <th className={f.rightCol}>Precio unit.</th>
                    <th className={f.rightCol}>Subtotal</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const sub = it.precio * it.cantidad;
                    return (
                      <tr key={it.id}>
                        <td>
                          <input
                            className={f.input}
                            value={it.nombre}
                            onChange={(e) => updateFormItem(it.id, 'nombre', e.target.value)}
                            placeholder="Producto"
                          />
                        </td>
                        <td className={f.centerCol}>
                          <input
                            className={f.input}
                            type="number"
                            min="1"
                            value={it.cantidad}
                            onChange={(e) => updateFormItem(it.id, 'cantidad', Number(e.target.value))}
                          />
                        </td>
                        <td className={f.rightCol}>
                          <input
                            className={f.input}
                            type="number"
                            min="0"
                            value={it.precio}
                            onChange={(e) => updateFormItem(it.id, 'precio', Number(e.target.value))}
                          />
                        </td>
                        <td className={f.rightCol} style={{ fontWeight: 600 }}>
                          {formatoCOP(sub)}
                        </td>
                        <td>
                          <button
                            type="button"
                            className={f.removeRowBtn}
                            onClick={() => removeItem(it.id)}
                            aria-label="Eliminar producto"
                            disabled={items.length === 1}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={14} />} onClick={addItem}>
                Agregar producto
              </Button>
            </div>
            <div className={f.totalsBox}>
              <div className={f.totalRow}><span>Total de items:</span><span>{totalItems}</span></div>
              <div className={`${f.totalRow} ${f.totalRowFinal}`}><span>Total pedido:</span><span>{formatoCOP(subtotal)}</span></div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Observaciones</h3>
            <div className={f.field}>
              <label className={f.label}>Observaciones</label>
              <textarea
                className={f.textarea}
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                placeholder="Notas del pedido..."
                rows={2}
              />
            </div>
          </div>

          <div className={f.formActions}>
            <ModalFooter
              actions={[{ label: 'Cancelar', variant: 'secondary', type: 'button', onClick: () => { setEditModalOpen(false); resetForm(); }, disabled: saving }, { label: selectedPedido ? 'Guardar cambios' : 'Crear pedido' , type: 'submit', loading: saving, leftIcon: <Save size={16} /> }]} />
          </div>
        </form>
      </Modal>

      <ConfirmWithReasonModal
        open={!!cancelConfirm}
        onClose={() => { setCancelConfirm(null); setCancelMotivo(''); }}
        onConfirm={handleCancel}
        title="Anular pedido"
        description={`¿Estás seguro de que deseas anular el pedido "${cancelConfirm?.numero ?? cancelConfirm?.id}"? Esta acción no se puede deshacer.`}
        referenceLabel={cancelConfirm ? `Pedido: ${cancelConfirm.numero ?? cancelConfirm.id}` : undefined}
        confirmLabel="Anular pedido"
        loading={cancelling}
      />

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar pedido"
        description={`¿Estás seguro de que deseas eliminar el pedido "${deleteConfirm?.id}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />

      <Modal open={!!statusConfirm} onClose={() => { setStatusConfirm(null); setSelectedStatus(null); }} title="Estado del pedido" description="Gestiona el flujo del pedido." size="md" variant="form">
        <div className={f.form}>
          {statusConfirm && (() => {
            const isCustom = statusConfirm.tipoFlujo === 'PERSONALIZADO';
            const currentLabel = isCustom
              ? CUSTOM_ORDER_STATUS_FRONTEND_MAP[statusConfirm.estado] || statusConfirm.estado
              : statusConfirm.estado;

            if (isCustom) {
              return (
                <>
                  <OrderStatusSelector
                    currentStatus={currentLabel}
                    selectedStatus={selectedStatus ?? currentLabel}
                    onSelectedStatusChange={setSelectedStatus}
                  />
                  <ModalFooter
                    actions={[
                      { label: 'Cerrar', variant: 'secondary', onClick: () => { setStatusConfirm(null); setSelectedStatus(null); }, disabled: saving },
                      { label: saving ? 'Guardando...' : 'Guardar cambios', onClick: handleChangeStatus, disabled: saving || !selectedStatus || selectedStatus === currentLabel },
                    ]}
                  />
                </>
              );
            }

            const estado = statusConfirm.estado;

            const getDescription = () => {
              if (estado === 'Pendiente') return '¿Qué deseas hacer con este pedido?';
              if (estado === 'Aceptado') return 'Pedido aceptado, listo para preparar.';
              if (estado === 'Listo') return 'Pedido listo para ser entregado.';
              if (estado === 'Entregado') return 'El pedido fue entregado correctamente.';
              if (estado === 'Rechazado') return 'El pedido fue rechazado.';
              if (estado === 'Cancelado') return 'El pedido ha sido cancelado.';
              return 'Gestiona el flujo del pedido.';
            };

            const flowSteps = [
              { label: 'Pendiente', state: 'Pendiente' },
              { label: 'Aceptado', state: 'Aceptado' },
              { label: 'Listo', state: 'Listo' },
              { label: 'Enviado', state: 'Enviado' },
              { label: 'Entregado', state: 'Entregado' },
            ];

            const currentStepIndex = flowSteps.findIndex((step) => step.state === estado);
            const isTerminal = estado === 'Entregado' || estado === 'Rechazado' || estado === 'Cancelado';

            return (
              <>
                <div className={s.statusModalContext}>
                  <div className={s.statusModalContextRow}>
                    <span className={s.statusModalContextLabel}>Pedido</span>
                    <span className={s.statusModalContextValue}>{statusConfirm.numero ?? statusConfirm.id}</span>
                  </div>
                  <div className={s.statusModalContextRow}>
                    <span className={s.statusModalContextLabel}>Cliente</span>
                    <span className={s.statusModalContextValue}>{statusConfirm.cliente}</span>
                  </div>
                  <div className={s.statusModalContextRow}>
                    <span className={s.statusModalContextLabel}>Estado actual</span>
                    <StatusBadge status={estado} />
                  </div>
                </div>

                {!isTerminal && (
                  <div className={s.statusModalFlow}>
                    {flowSteps.map((step, index) => {
                      const isCompleted = index < currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      return (
                        <div key={step.state} className={s.statusModalFlowStep}>
                          <div
                            className={cn(
                              s.statusModalFlowDot,
                              isCompleted && s.statusModalFlowDotCompleted,
                              isCurrent && s.statusModalFlowDotCurrent,
                            )}
                          />
                          <span
                            className={cn(
                              s.statusModalFlowLabel,
                              isCompleted && s.statusModalFlowLabelCompleted,
                              isCurrent && s.statusModalFlowLabelCurrent,
                            )}
                          >
                            {step.label}
                          </span>
                          {index < flowSteps.length - 1 && <div className={s.statusModalFlowLine} />}
                        </div>
                      );
                    })}
                  </div>
                )}

                <p className={s.statusModalDescription}>{getDescription()}</p>

                {estado === 'Pendiente' && (
                  <div className={s.statusModalActions}>
                    <Button variant="primary" onClick={() => setSelectedStatus('Aceptado')} disabled={saving}>Aceptar</Button>
                    <Button variant="danger" onClick={() => setSelectedStatus('Rechazado')} disabled={saving}>Rechazar</Button>
                  </div>
                )}

                {estado === 'Aceptado' && (
                  <div className={s.statusModalActions}>
                    <Button variant="primary" onClick={() => setSelectedStatus('Listo')} disabled={saving}>Listo para entregar</Button>
                  </div>
                )}

                {estado === 'Listo' && (
                  <div className={s.statusModalActions}>
                    <Button variant="primary" onClick={() => setSelectedStatus('Enviado')} disabled={saving}>Enviar</Button>
                  </div>
                )}

                {estado === 'Enviado' && (
                  <div className={s.statusModalActions}>
                    <Button variant="primary" onClick={() => setSelectedStatus('Entregado')} disabled={saving}>Entregar</Button>
                  </div>
                )}

                {(estado === 'Entregado' || estado === 'Rechazado' || estado === 'Cancelado') && (
                  <p className={s.statusModalNoActions}>No hay transiciones disponibles para este estado.</p>
                )}

                <ModalFooter
                  actions={[
                    { label: 'Cerrar', variant: 'secondary', onClick: () => { setStatusConfirm(null); setSelectedStatus(null); }, disabled: saving || !selectedStatus },
                    ...(selectedStatus ? [{ label: saving ? 'Guardando...' : 'Guardar cambios', onClick: handleChangeStatus, disabled: saving || selectedStatus === estado }] : []),
                  ]}
                />
              </>
            );
          })()}
        </div>
      </Modal>

      <Modal
        open={!!detailId}
        onClose={() => { setDetailId(null); }}
        title="Detalle del pedido"
        description="Información completa, productos y estado del pedido."
        size="2xl"
        icon={<Package size={20} />}
        footer={
          (() => {
            const actions: Array<{ label: string; variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline'; onClick?: () => void | Promise<void>; disabled?: boolean }> = [
              { label: 'Cerrar', variant: 'secondary', onClick: () => { setDetailId(null); }, disabled: saving || isChangingState },
            ];
            if (detailPedido && paymentSummary && paymentSummary.saldo > 0) {
              actions.unshift({ label: 'Realizar abono', variant: 'secondary', onClick: () => { if (detailPedido) openAbonoModal(detailPedido); }, disabled: saving || isChangingState });
            }
            if (detailPedido && nextStateForDisplay) {
              actions.unshift({
                label: `Cambiar a ${nextStateForDisplay}`,
                variant: 'primary',
                leftIcon: <ChevronRight size={14} />,
                onClick: () => { if (detailPedido) doChangeDetailState(detailPedido); },
                disabled: saving || isChangingState,
              });
            }
            return <ModalFooter actions={actions.reverse()} />;
          })()
        }
      >
        {detailPedido && (
          <div className={s.detailUnified}>
            {/* SECCIÓN PEDIDO - ID + Estado */}
            <div className={s.orderIdentityCard}>
              <div className={s.orderIdentityMain}>
                <span className={s.orderIdentityId}>{detailPedido.numero ?? detailPedido.id}</span>
                <StatusBadge status={detailPedido.estado} dot size="lg" />
              </div>
            </div>

            {/* CLIENTE */}
            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>CLIENTE</h3>
              <div className={s.clientGrid}>
                <div className={s.clientMain}>
                  <span className={s.clientName}>{detailPedido.cliente || 'No registrado'}</span>
                </div>
                <div className={s.clientDetails}>
                  {detailCliente?.telefono ? (
                    <div className={s.clientDetailRow}>
                      <Phone size={14} className={s.clientIcon} />
                      <span>{detailCliente.telefono}</span>
                    </div>
                  ) : (
                    <div className={s.clientDetailRow}>
                      <Phone size={14} className={s.clientIcon} />
                      <span className={s.clientEmpty}>No registrado</span>
                    </div>
                  )}
                  {detailCliente?.email ? (
                    <div className={s.clientDetailRow}>
                      <Mail size={14} className={s.clientIcon} />
                      <span>{detailCliente.email}</span>
                    </div>
                  ) : (
                    <div className={s.clientDetailRow}>
                      <Mail size={14} className={s.clientIcon} />
                      <span className={s.clientEmpty}>No registrado</span>
                    </div>
                  )}
                  {detailCliente?.direccion ? (
                    <div className={s.clientDetailRow}>
                      <MapPin size={14} className={s.clientIcon} />
                      <span>{detailCliente.direccion}</span>
                    </div>
                  ) : (
                    <div className={s.clientDetailRow}>
                      <MapPin size={14} className={s.clientIcon} />
                      <span className={s.clientEmpty}>No registrado</span>
                    </div>
                  )}
                  {(detailCliente as Usuario & { ciudad?: string })?.ciudad ? (
                    <div className={s.clientDetailRow}>
                      <MapPin size={14} className={s.clientIcon} />
                      <span>{(detailCliente as Usuario & { ciudad?: string }).ciudad}, Colombia</span>
                    </div>
                  ) : (
                    <div className={s.clientDetailRow}>
                      <MapPin size={14} className={s.clientIcon} />
                      <span className={s.clientEmpty}>No registrado</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* INFORMACIÓN DEL PEDIDO */}
            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>INFORMACIÓN DEL PEDIDO</h3>
              <div className={s.orderInfoGrid}>
                <div className={s.orderInfoItem}>
                  <span className={s.orderInfoLabel}>Tipo de pago</span>
                  <span className={s.orderInfoValue}>
                    {hasInstallments ? (
                      <>
                        <span className={s.paymentTypeInstallments}>Pago a cuotas</span>
                        {totalCuotas > 0 && <span className={s.installmentsCount}> · {totalCuotas} cuotas</span>}
                      </>
                    ) : (
                      <span className={s.paymentTypeImmediate}>Pago inmediato</span>
                    )}
                  </span>
                </div>
                <div className={s.orderInfoItem}>
                  <span className={s.orderInfoLabel}>Fecha del pedido</span>
                  <span className={s.orderInfoValue}>{detailPedido.fecha}</span>
                </div>
                <div className={s.orderInfoItem}>
                  <span className={s.orderInfoLabel}>Total del pedido</span>
                  <span className={s.orderInfoValueTotal}>{formatoCOP(paymentSummary?.total ?? 0)}</span>
                </div>
                {hasInstallments && totalCuotas > 0 && (
                  <div className={s.orderInfoItem}>
                    <span className={s.orderInfoLabel}>Número de cuotas</span>
                    <span className={s.orderInfoValue}>{totalCuotas}</span>
                  </div>
                )}
                {hasInstallments && paymentSummary && (
                  <div className={s.orderInfoItem}>
                    <span className={s.orderInfoLabel}>Valor por cuota</span>
                    <span className={s.orderInfoValue}>{formatoCOP(paymentSummary.total / totalCuotas)}</span>
                  </div>
                )}
                {hasInstallments && (() => {
                  const vencimiento = detailPedido.ventas?.find(v => v.tipoPago === 'CUOTA' && v.numeroCuota === v.totalCuotas) || detailPedido.ventas?.[detailPedido.ventas.length - 1];
                  if (vencimiento?.fechaVenta) {
                    const fecha = new Date(vencimiento.fechaVenta);
                    return (
                      <div className={s.orderInfoItem}>
                        <span className={s.orderInfoLabel}>Fecha de vencimiento</span>
                        <span className={s.orderInfoValue}>{fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>

            {/* COMPROBANTE DE PAGO */}
            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>COMPROBANTE DE PAGO</h3>
              {(() => {
                const comprobanteUrl = detailPedido.comprobantePagoUrl || detailPedido.ventas?.find(v => v.comprobantePagoUrl)?.comprobantePagoUrl;
                if (comprobanteUrl) {
                  return (
                    <div className={s.comprobanteCard}>
                      <div className={s.comprobantePreview}>
                        {comprobanteUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img src={comprobanteUrl} alt="Comprobante de pago" className={s.comprobanteImage} />
                        ) : (
                          <div className={s.comprobanteFile}>
                            <FileText size={32} className={s.comprobanteFileIcon} />
                            <span>Documento de pago</span>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<ExternalLink size={14} />}
                        onClick={() => window.open(comprobanteUrl, '_blank')}
                        disabled={isChangingState}
                      >
                        Ver comprobante
                      </Button>
                    </div>
                  );
                }
                return (
                  <div className={s.comprobanteEmpty}>
                    <FileText size={24} className={s.comprobanteEmptyIcon} />
                    <span>Sin comprobante de pago</span>
                  </div>
                );
              })()}
            </div>

            {/* ESTADO DE CUENTA */}
            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>ESTADO DE CUENTA</h3>
              {hasInstallments ? (
                <div className={s.accountStatusGrid}>
                  <div className={s.accountStatusMain}>
                    <div className={s.accountStatusRow}>
                      <span className={s.accountStatusLabel}>Cuotas pagadas</span>
                      <span className={s.accountStatusValue}>{cuotasPagadas} / {totalCuotas}</span>
                    </div>
                    <div className={s.accountStatusRow}>
                      <span className={s.accountStatusLabel}>Cuotas pendientes</span>
                      <span className={s.accountStatusValueDanger}>{cuotasFaltantes}</span>
                    </div>
                    <div className={s.accountStatusRow}>
                      <span className={s.accountStatusLabel}>Total de cuotas</span>
                      <span className={s.accountStatusValue}>{totalCuotas}</span>
                    </div>
                    <div className={s.progressContainer}>
                      <div className={s.progressBar}>
                        <div className={s.progressFill} style={{ width: `${progress}%` }}></div>
                      </div>
                      <span className={s.progressText}>{cuotasPagadas} de {totalCuotas} cuotas pagadas · {Math.round(progress)}%</span>
                    </div>
                    {(() => {
                      const vencimiento = detailPedido.ventas?.find(v => v.tipoPago === 'CUOTA' && v.numeroCuota === v.totalCuotas) || detailPedido.ventas?.[detailPedido.ventas.length - 1];
                      if (vencimiento?.fechaVenta) {
                        const fecha = new Date(vencimiento.fechaVenta);
                        return (
                          <div className={s.accountStatusRow}>
                            <span className={s.accountStatusLabel}>Próximo vencimiento</span>
                            <span className={s.accountStatusValue}>{fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                          </div>
                        );
                      }
                      return null;
                    })()}
                    {cuotasFaltantes === 0 && totalCuotas > 0 && (
                      <div className={s.accountStatusPaid}>
                        <CheckCircle2 size={18} className={s.paidIcon} />
                        <span>Cuenta pagada</span>
                      </div>
                    )}
                  </div>
                  <div className={s.accountStatusSummary}>
                    <div className={s.summaryItem}>
                      <span className={s.summaryLabel}>TOTAL</span>
                      <span className={s.summaryValue}>{formatoCOP(paymentSummary?.total ?? 0)}</span>
                    </div>
                    <div className={s.summaryItem}>
                      <span className={s.summaryLabel}>PAGADO</span>
                      <span className={s.summaryValueOk}>{formatoCOP(paymentSummary?.pagado ?? 0)}</span>
                    </div>
                    <div className={s.summaryItem}>
                      <span className={s.summaryLabel}>SALDO</span>
                      <span className={(paymentSummary?.saldo ?? 0) > 0 ? s.summaryValueDanger : s.summaryValueOk}>{formatoCOP(paymentSummary?.saldo ?? 0)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={s.immediatePaymentCard}>
                  <div className={s.immediatePaymentRow}>
                    <CreditCard size={24} className={s.immediateIcon} />
                    <div>
                      <span className={s.immediateLabel}>Pago inmediato</span>
                      <span className={s.immediateSub}>Sin cuotas pendientes</span>
                    </div>
                  </div>
                  <div className={s.immediateSummary}>
                    <div className={s.summaryItem}>
                      <span className={s.summaryLabel}>TOTAL</span>
                      <span className={s.summaryValue}>{formatoCOP(paymentSummary?.total ?? 0)}</span>
                    </div>
                    <div className={s.summaryItem}>
                      <span className={s.summaryLabel}>PAGADO</span>
                      <span className={s.summaryValueOk}>{formatoCOP(paymentSummary?.pagado ?? 0)}</span>
                    </div>
                    <div className={s.summaryItem}>
                      <span className={s.summaryLabel}>SALDO</span>
                      <span className={(paymentSummary?.saldo ?? 0) > 0 ? s.summaryValueDanger : s.summaryValueOk}>{formatoCOP(paymentSummary?.saldo ?? 0)}</span>
                    </div>
                  </div>
                </div>
              )}
              {pendingPaymentId && !hasInstallments && (
                <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="success"
                    size="sm"
                    leftIcon={<DollarSign size={14} />}
                    onClick={() => handleConfirmPayment(pendingPaymentId)}
                    disabled={confirmingPayment || saving || isChangingState || loadingPayments}
                    loading={confirmingPayment}
                  >
                    Confirmar pago
                  </Button>
                </div>
              )}
            </div>

            {/* ESTADO DEL PEDIDO */}
            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}>ESTADO DEL PEDIDO</h3>
              {(() => {
                const flowSteps = [
                  { label: 'Pendiente', state: 'Pendiente' },
                  { label: 'Aceptado', state: 'Aceptado' },
                  { label: 'Listo', state: 'Listo' },
                  { label: 'Enviado', state: 'Enviado' },
                  { label: 'Entregado', state: 'Entregado' },
                ];
                const currentStepIndex = flowSteps.findIndex((step) => step.state === detailPedido.estado);
                if (currentStepIndex < 0) return null;
                return (
                  <div className={s.detailFlowSection}>
                    {flowSteps.map((step, index) => {
                      const isCompleted = index < currentStepIndex;
                      const isCurrent = index === currentStepIndex;
                      return (
                        <div key={step.state} className={cn(s.statusModalFlowStep, s.detailFlowItem)}>
                          <div
                            className={cn(
                              s.statusModalFlowDot,
                              isCompleted && s.statusModalFlowDotCompleted,
                              isCurrent && s.statusModalFlowDotCurrent,
                            )}
                          />
                          <span
                            className={cn(
                              s.statusModalFlowLabel,
                              isCompleted && s.statusModalFlowLabelCompleted,
                              isCurrent && s.statusModalFlowLabelCurrent,
                            )}
                          >
                            {step.label}
                          </span>
                          {index < flowSteps.length - 1 && <div className={s.statusModalFlowLine} />}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
              {nextStateForDisplay ? (
                <div className={s.nextStateAction}>
                  <div className={s.nextStateInfo}>
                    <span className={s.nextStateLabel}>Siguiente estado</span>
                    <StatusBadge status={nextStateForDisplay} dot size="lg" />
                  </div>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<ChevronRight size={14} />}
                    onClick={() => doChangeDetailState(detailPedido)}
                    disabled={saving || isChangingState}
                  >
                    Cambiar estado
                  </Button>
                </div>
              ) : (
                <div className={s.completedState}>
                  <CheckCircle2 size={20} className={s.completedIcon} />
                  <span>Pedido completado</span>
                </div>
              )}
            </div>

            {/* PRODUCTOS */}
            <div className={s.detailSection}>
              <div className={s.detailSectionHeader}>
                <h3 className={s.detailSectionTitle}>PRODUCTOS</h3>
                <span className={s.detailSectionBadge}>
                  {detailPedido.itemsList?.reduce((sum, it) => sum + it.cantidad, 0) || 0} producto{detailPedido.itemsList && detailPedido.itemsList.length > 1 ? 's' : ''}
                </span>
              </div>
              {detailPedido.itemsList && detailPedido.itemsList.length > 0 ? (
                <>
                  <div className={s.tableScrollInner}>
                    <table className={s.detailTable}>
                      <thead>
                        <tr>
                          <th>PRODUCTO</th>
                          <th className={s.rightAlign}>CANTIDAD</th>
                          <th className={s.rightAlign}>PRECIO UNIT.</th>
                          <th className={s.rightAlign}>SUBTOTAL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailPedido.itemsList.map((item, idx) => (
                          <tr key={idx}>
                            <td>{item.nombre}</td>
                            <td className={s.rightAlign}>{item.cantidad}</td>
                            <td className={s.rightAlign}>{formatoCOP(item.precio)}</td>
                            <td className={s.rightAlign}>{formatoCOP(item.precio * item.cantidad)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className={s.detailProductsFooter}>
                    <span>Total productos: {detailPedido.itemsList.reduce((sum, it) => sum + it.cantidad, 0)}</span>
                    <span className={s.tdMoney}>{formatoCOP(detailPedido.itemsList.reduce((sum, it) => sum + it.precio * it.cantidad, 0))}</span>
                  </div>
                </>
              ) : (
                <div className={s.emptyProducts}>Sin productos registrados</div>
              )}
            </div>

            {/* RESUMEN FINANCIERO + OBSERVACIONES */}
            <div className={s.detailTwoColumn}>
              <div className={s.detailFinancialSection}>
                <h3 className={s.detailSectionTitle}>RESUMEN FINANCIERO</h3>
                <div className={s.detailFinancialGrid}>
                  <div className={s.detailFinancialItem}>
                    <span className={s.detailFinancialLabel}>TOTAL</span>
                    <span className={s.detailFinancialValue}>{formatoCOP(paymentSummary?.total ?? 0)}</span>
                  </div>
                  <div className={s.detailFinancialItem}>
                    <span className={s.detailFinancialLabel}>PAGADO</span>
                    <span className={s.detailFinancialValueOk}>{formatoCOP(paymentSummary?.pagado ?? 0)}</span>
                  </div>
                  <div className={s.detailFinancialItem}>
                    <span className={s.detailFinancialLabel}>SALDO</span>
                    <span className={(paymentSummary?.saldo ?? 0) > 0 ? s.detailFinancialValueDanger : s.detailFinancialValueOk}>
                      {formatoCOP(paymentSummary?.saldo ?? 0)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={s.detailSideCards}>
                <div className={s.detailSideCard}>
                  <h3 className={s.detailSectionTitle}>OBSERVACIONES</h3>
                  {detailPedido.observaciones ? (
                    <p className={s.detailObservations}>{detailPedido.observaciones}</p>
                  ) : (
                    <p className={s.detailEmptyText}>Sin observaciones.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      <RegistrarAbonoModal
        open={abonoModalOpen}
        onClose={() => setAbonoModalOpen(false)}
        cliente={abonoPedido?.cliente ?? ''}
        numeroFactura={abonoPedido?.numero ?? abonoPedido?.id ?? ''}
        orderId={abonoPedido?.id ?? ''}
        customerId={abonoPedido?.clienteId ?? ''}
        asesorId={abonoPedido?.asesorId ?? ''}
        saldo={abonoPedido ? getOrderSummary(abonoPedido).saldo : 0}
        total={abonoPedido ? getOrderSummary(abonoPedido).total : 0}
        esPrimerAbono={abonoPedido ? (() => {
          const summary = getOrderSummary(abonoPedido);
          const noApprovedPayments = !paymentsByOrderId[abonoPedido.id]?.some(p => p.status === 'Aprobado');
          return noApprovedPayments && summary.saldo >= summary.total;
        })() : true}
        canCreatePayments={canCreatePayments}
        onSuccess={handleAbonoSuccess}
      />
    </div>
  );
};
