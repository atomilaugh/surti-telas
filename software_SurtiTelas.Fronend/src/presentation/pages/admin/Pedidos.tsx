import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Save, Trash2, Eye, Ban, X, Package, Clock, Factory, AlertCircle, Wallet, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { SearchInput } from '@/shared/ui/SearchInput';
import s from './Pedidos.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '../../../shared/ui/Button';
import { DataTable } from '../../../shared/ui/DataTable';
import { Modal } from '../../../shared/ui/Modal';
import { ConfirmationModal } from '../../../shared/ui/ConfirmationModal';
import { ConfirmWithReasonModal } from '@/shared/ui/ConfirmWithReasonModal';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { useAuthStore } from '@/core/stores/authStore';
import { authApi, type BackendAuthUser } from '@/infrastructure/api/authApi';
import { ESTADOS_PEDIDO, type EstadoPedido } from '@/shared/constants/options';
import type { Pedido, PedidoItem } from '@/core/types';
import { useServerPagination } from '@/hooks/useServerPagination';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { OrderStatusSelector } from '@/shared/ui/OrderStatusSelector';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import {
  calculatePaymentSummary,
  getPaymentStatusMeta,
  PAYMENT_STATUS_META,
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
  const [clientes, setClientes] = useState<BackendAuthUser[]>([]);
  const [asesores, setAsesores] = useState<BackendAuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

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
  const [statusConfirm, setStatusConfirm] = useState<{ id: string; estado: Pedido['estado'] } | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<Pedido['estado'] | null>(null);

  const pagination = useServerPagination(10);
  const [reloadToken, setReloadToken] = useState(0);

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
    pagination.setPage(1);
  };

  const reload = useCallback(() => setReloadToken(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const ordersQuery: Record<string, string | number | boolean | undefined | null> = {
          page: 1,
          limit: pagination.limit,
        };
        if (debouncedSearch.trim()) ordersQuery.search = debouncedSearch.trim();

        const [ordersResult, clientesResult, _profile, asesoresResult] = await Promise.all([
          ordersApi.list(ordersQuery),
          authApi.listUsers({ limit: 100, role: 'CLIENTE' }),
          authApi.me(),
          authApi.listUsers({ limit: 100, role: 'ASESOR' }),
        ]);

        if (!cancelled) {
          setClientes(clientesResult.data ?? []);
          setAsesores(asesoresResult.data ?? []);

          const ESTADO_ENTREGADO: EstadoPedido = 'Entregado';
          const ESTADO_RECHAZADO: EstadoPedido = 'Rechazado';
          const ESTADOS_OCULTOS = new Set([ESTADO_ENTREGADO, ESTADO_RECHAZADO] as [EstadoPedido, EstadoPedido]);
          const pedidos = (ordersResult.pedidos ?? []).filter((p) => !ESTADOS_OCULTOS.has(p.estado));
          setPageData(pedidos);
          pagination.setTotalRecords(pedidos.length);
          pagination.setPage(1);

          if (!asesorId && asesoresResult.data?.length) {
            const adminAsesor = asesoresResult.data.find((u) => u.role === 'ASESOR');
            setAsesorId(adminAsesor?.id ?? '');
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
  }, [asesorId, pagination, debouncedSearch, reloadToken]);

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
        const { estado } = calculatePaymentSummary(p);
        if (estado !== filtroEstadoPago) return false;
      }
      return true;
    });
  }, [pageData, filtroEstado, filtroClienteId, filtroAsesorId, filtroEstadoPago, filtroDesde, filtroHasta]);

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
      const { estado, pagado, saldo, total: totalPedido } = calculatePaymentSummary(p);
      if (estado === 'PENDIENTE' || estado === 'SIN_PAGOS' || estado === 'PAGO_PARCIAL') {
        pagoPendiente += 1;
      }
      valorTotal += totalPedido;
      totalRecibido += pagado;
      saldoPendiente += saldo;
    }
    return { total, pendientes, enProduccion, pagoPendiente, valorTotal, totalRecibido, saldoPendiente };
  }, [pageData]);

  const handlePageChange = useCallback((newPage: number) => {
    pagination.setPage(newPage);
  }, [pagination]);

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

  const handleChangeStatus = async () => {
    if (!statusConfirm || !selectedStatus) return;
    try {
      await ordersApi.updateStatus(statusConfirm.id, selectedStatus);
      await reload();
      toast.success(`Pedido ${statusConfirm.id} actualizado a ${selectedStatus}`);
      setStatusConfirm(null);
      setSelectedStatus(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (message.includes('401') || message.includes('No autorizado') || message.includes('Unauthorized')) {
        toast.error('Tu sesión expiró o no es válida. Inicia sesión nuevamente.');
        useAuthStore.getState().logout();
      } else {
        toast.error('No se pudo actualizar el estado');
      }
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

  const handleCancel = async (motivo: string) => {
    if (!cancelConfirm) return;
    setCancelling(true);
    try {
      await ordersApi.cancelOrder(cancelConfirm.id, motivo);
      toast.success('Pedido anulado correctamente');
      setCancelConfirm(null);
      await reload();
    } catch {
      toast.error('No se pudo anular el pedido');
    } finally {
      setCancelling(false);
    }
  };

  const detailPedido = detailId ? pageData.find(p => p.id === detailId) : null;

  return (
    <div className={s.pageRoot}>
      {/* ============== Header ============== */}
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Pedidos</h1>
          <p className={s.pageSubtitle}>
            Centro de control y seguimiento · {pagination.totalRecords} pedido{pagination.totalRecords === 1 ? '' : 's'} registrado{pagination.totalRecords === 1 ? '' : 's'}
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
            onSearch={(value) => { setSearch(value); pagination.setPage(1); }}
            debounceMs={100}
            minChars={0}
          />
        </div>

        <select
          className={s.filterSelect}
          value={filtroEstado}
          onChange={(e) => { setFiltroEstado(e.target.value); pagination.setPage(1); }}
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
          onChange={(e) => { setFiltroEstadoPago(e.target.value); pagination.setPage(1); }}
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
          onChange={(e) => { setFiltroAsesorId(e.target.value); pagination.setPage(1); }}
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
          onChange={(e) => { setFiltroClienteId(e.target.value); pagination.setPage(1); }}
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
            onChange={(e) => { setFiltroDesde(e.target.value); pagination.setPage(1); }}
            aria-label="Desde"
            title="Desde"
            placeholder="dd/mm/aaaa"
          />
          <span className={s.dateRangeSeparator}>—</span>
          <input
            className={s.dateRangeInput}
            type="date"
            value={filtroHasta}
            onChange={(e) => { setFiltroHasta(e.target.value); pagination.setPage(1); }}
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
            pageSize={pagination.limit}
            emptyMessage="Sin pedidos con los filtros actuales"
            enableSorting
            enableColumnFilters={false}
            enableRowSelection={false}
            enableExport
            exportFileName="pedidos"
            maxVisibleColumns={8}
            serverMode
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
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
                  const { estado } = calculatePaymentSummary(p);
                  return <StatusBadge status={estado} dot />;
                },
              },
              {
                key: 'total',
                header: 'Total',
                width: '108px',
                render: (p) => {
                  const { total } = calculatePaymentSummary(p);
                  return <span className={s.tdMoney}>{formatoCOP(total)}</span>;
                },
              },
              {
                key: 'pagado',
                header: 'Pagado',
                width: '108px',
                render: (p) => {
                  const { pagado } = calculatePaymentSummary(p);
                  return <span className={s.tdMoney}>{formatoCOP(pagado)}</span>;
                },
              },
              {
                key: 'saldo',
                header: 'Saldo',
                width: '108px',
                render: (p) => {
                  const { saldo, estado } = calculatePaymentSummary(p);
                  const isPagado = estado === 'PAGADO' || saldo <= 0.5;
                  return (
                    <span className={`${s.tdMoney} ${isPagado ? s.tdMoneyOk : s.tdMoneyDanger}`}>
                      {formatoCOP(saldo)}
                    </span>
                  );
                },
              },
            ]}
            actions={(p) => [
              { label: 'Ver más', icon: <Eye size={14} />, onClick: () => setDetailId(p.id) },
              { label: 'Editar', icon: <Save size={14} />, onClick: () => openEdit(p) },
              { label: 'Cambiar estado', onClick: () => { setStatusConfirm({ id: p.id, estado: p.estado }); setSelectedStatus(null); } },
              ...(p.estado !== 'Cancelado' ? [{ label: 'Anular', icon: <Ban size={14} />, onClick: () => setCancelConfirm(p), danger: true }] : []),
              ...(p.estado === 'Cancelado' ? [{ label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(p), danger: true }] : []),
            ]}
            detailPanel={{
              title: (p) => `Pedido ${p.numero ?? p.id}`,
              render: (p, onClose) => {
                const summary = calculatePaymentSummary(p);
                const paymentMeta = getPaymentStatusMeta(summary.estado);
                const ventas = p.ventas ?? [];
                return (
                  <div className={s.detailModalContent}>
                    <div className={s.detailHero}>
                      <div className={s.detailHeroItem}>
                        <span className={s.detailHeroLabel}>Cliente</span>
                        <span className={s.detailHeroValue}>{p.cliente}</span>
                      </div>
                      <div className={s.detailHeroItem}>
                        <span className={s.detailHeroLabel}>Asesor</span>
                        <span className={s.detailHeroValue}>{p.asesor || 'Sistema'}</span>
                      </div>
                      <div className={s.detailHeroItem}>
                        <span className={s.detailHeroLabel}>Fecha</span>
                        <span className={s.detailHeroValue}>{p.fecha}</span>
                      </div>
                      <div className={s.detailHeroItem}>
                        <span className={s.detailHeroLabel}>Estado</span>
                        <span><StatusBadge status={p.estado} dot /></span>
                      </div>
                      <div className={s.detailHeroItem}>
                        <span className={s.detailHeroLabel}>Pago</span>
                        <span><StatusBadge status={paymentMeta.label} dot /></span>
                      </div>
                    </div>

                    <div className={s.detailSection}>
                      <h4 className={s.detailSectionTitle}>Resumen financiero</h4>
                      <div className={s.financialGrid}>
                        <div className={`${s.financialCard} ${s.financialCardAccent}`}>
                          <span className={s.financialLabel}>Total</span>
                          <span className={s.financialValue}>{formatoCOP(summary.total)}</span>
                        </div>
                        <div className={`${s.financialCard} ${s.financialCardOk}`}>
                          <span className={s.financialLabel}>Pagado</span>
                          <span className={`${s.financialValue} ${s.financialValueOk}`}>{formatoCOP(summary.pagado)}</span>
                        </div>
                        <div className={`${s.financialCard} ${summary.saldo > 0 ? s.financialCardDanger : s.financialCardOk}`}>
                          <span className={s.financialLabel}>Saldo</span>
                          <span className={`${s.financialValue} ${summary.saldo > 0 ? s.financialValueDanger : s.financialValueOk}`}>
                            {formatoCOP(summary.saldo)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {ventas.length > 0 && (
                      <div className={s.detailSection}>
                        <h4 className={s.detailSectionTitle}>Historial de pagos</h4>
                        <div className={s.tableScrollInner}>
                          <table className={s.detailTable}>
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>Tipo</th>
                                <th>Medio</th>
                                <th>Estado</th>
                                <th className={s.rightAlign}>Monto</th>
                                <th>Fecha</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ventas.map((v, idx) => {
                                const tipo = v.tipoPago ?? (v.esAnticipo ? 'Anticipo' : v.esSaldo ? 'Saldo' : 'Pago');
                                const cuotaLabel = v.numeroCuota && v.totalCuotas ? ` · Cuota ${v.numeroCuota}/${v.totalCuotas}` : '';
                                const fecha = v.fechaVenta ? new Date(v.fechaVenta).toLocaleDateString('es-CO') : '—';
                                return (
                                  <tr key={v.id ?? idx}>
                                    <td>{idx + 1}</td>
                                    <td>{tipo}{cuotaLabel}</td>
                                    <td>{v.medioPago ?? '—'}</td>
                                    <td>
                                      <StatusBadge status={v.estado} dot>
                                        {v.estado === 'COMPLETADA' ? 'Aprobado' : v.estado === 'ANULADA' ? 'Anulado' : v.estado}
                                      </StatusBadge>
                                    </td>
                                    <td className={s.rightAlign}>{formatoCOP(Number(v.total) || 0)}</td>
                                    <td>{fecha}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {p.itemsList && p.itemsList.length > 0 && (
                      <div className={s.detailSection}>
                        <h4 className={s.detailSectionTitle}>Productos</h4>
                        <div className={s.tableScrollInner}>
                          <table className={s.detailTable}>
                            <thead>
                              <tr>
                                <th>Producto</th>
                                <th className={s.rightAlign}>Cantidad</th>
                                <th className={s.rightAlign}>Precio</th>
                                <th className={s.rightAlign}>Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {p.itemsList.map((item, idx) => (
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
                      </div>
                    )}

                    <ModalFooter actions={[{ label: 'Cerrar', variant: 'secondary', onClick: onClose }]} />
                  </div>
                );
              },
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
                  {['Pendiente', 'Enviado', 'Entregado', 'Cancelado'].map(es => (
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

      <Modal open={!!statusConfirm} onClose={() => { setStatusConfirm(null); setSelectedStatus(null); }} title="Cambiar estado del pedido" description="Actualiza el estado del pedido." size="md" variant="form">
        <div className={f.form}>
          {statusConfirm && (
            <OrderStatusSelector
              currentStatus={statusConfirm.estado}
              selectedStatus={selectedStatus ?? statusConfirm.estado}
              onSelectedStatusChange={setSelectedStatus}
            />
          )}
          <ModalFooter
            actions={[
              { label: 'Cancelar', variant: 'secondary', onClick: () => { setStatusConfirm(null); setSelectedStatus(null); }, disabled: saving },
              { label: saving ? 'Guardando...' : 'Guardar cambios', onClick: handleChangeStatus, disabled: saving || !selectedStatus || selectedStatus === statusConfirm?.estado },
            ]}
          />
        </div>
      </Modal>

      <Modal open={!!detailId} onClose={() => setDetailId(null)} title={`Pedido ${detailPedido?.numero ?? detailPedido?.id}`} description="Detalle del pedido" size="md">
        {detailPedido && (
          <div className={s.detailModalContent}>
            <div className={s.detailSection}>
              <h4 className={s.detailSectionTitle}>Detalles del pedido</h4>
              <div className={s.detailGrid}>
                <div className={s.detailItem}><span className={s.detailLabel}>ID</span><span>{detailPedido.numero ?? detailPedido.id}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Cliente</span><span>{detailPedido.cliente}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Asesor</span><span>{detailPedido.asesor}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Items</span><span>{detailPedido.items}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Total</span><span>{detailPedido.total}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Estado</span><span><StatusBadge status={detailPedido.estado} /></span></div>
              </div>
            </div>
            {detailPedido.comprobantePagoUrl && (
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Comprobante de pago</h4>
                <a href={detailPedido.comprobantePagoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-primary)] hover:underline">
                  <Eye size={14} />
                  Ver comprobante
                </a>
                <div className="mt-3 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white">
                  <img src={detailPedido.comprobantePagoUrl} alt="Comprobante de pago" className="max-h-64 w-full object-contain" />
                </div>
              </div>
            )}
            {detailPedido.observaciones && (
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Observaciones</h4>
                <p>{detailPedido.observaciones}</p>
              </div>
            )}
            {detailPedido.itemsList && detailPedido.itemsList.length > 0 && (
              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Items</h4>
                <div className={s.detailGrid}>
                  {detailPedido.itemsList.map((it, idx) => (
                    <div className={s.detailItem} key={idx}>
                      <span className={s.detailLabel}>Item {idx + 1}</span>
                      <span>{it.nombre} | Cant: {it.cantidad} | Precio: {formatoCOP(it.precio)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <ModalFooter
              actions={[{ label: 'Cerrar', variant: 'secondary', onClick: () => setDetailId(null) }]} />

          </div>
        )}
      </Modal>
    </div>
  );
};
