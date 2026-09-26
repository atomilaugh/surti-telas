import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  History,
  Images,
  Info,
  Loader2,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  UserCheck,
  XCircle,
} from 'lucide-react';
import s from './StockDevuelto.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { toast } from 'sonner';
import {
  returnsApi,
  type CreateReturnRequestInput,
  type ReturnCanalRegistro,
  type ReturnRequestDTO,
  type ReturnRequestDetailDTO,
  type ReturnRequestStatus,
  type ReturnInspectionCondition,
  type ReturnResolutionType,
} from '@/infrastructure/api/returnsApi';
import { customersApi, type CustomerDocumentMatch } from '@/infrastructure/api/customersApi';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { ReturnRequestForm, type ReturnFormOrderOption } from '@/presentation/components/returns/ReturnRequestForm';
import { ReturnEvidenceGallery } from '@/presentation/components/returns/ReturnEvidenceGallery';
import { useAuthStore } from '@/core/stores/authStore';
import { ApiError } from '@/infrastructure/api/httpClient';

type SearchState = 'idle' | 'loading' | 'found' | 'not_found' | 'error';

const CANAL_LABELS: Record<ReturnCanalRegistro, string> = {
  PORTAL: 'Portal web',
  TELEFONO: 'Teléfono',
  PRESENCIAL: 'Presencial',
  WHATSAPP: 'WhatsApp',
  ASESOR: 'Asesor comercial',
};

type EstadoFiltro = ReturnRequestStatus | 'TODOS';

interface StatusModalState {
  request: ReturnRequestDTO;
  nextStatus: ReturnRequestStatus;
}

interface InspectionForm {
  responsable: string;
  condicion: ReturnInspectionCondition;
  cantidadAceptada: string;
  cantidadRechazada: string;
  observaciones: string;
}

interface ResolutionForm {
  tipo: ReturnResolutionType;
  cantidad: string;
  responsable: string;
  observaciones: string;
}

const ESTADOS: ReturnRequestStatus[] = [
  'SOLICITADA',
  'EN_REVISION',
  'APROBADA',
  'RECHAZADA',
  'PRODUCTO_RECIBIDO',
  'EN_INSPECCION',
  'RESUELTA',
];

const ESTADO_LABELS: Record<ReturnRequestStatus, string> = {
  SOLICITADA: 'Solicitada',
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PRODUCTO_RECIBIDO: 'Producto recibido',
  EN_INSPECCION: 'En inspección',
  RESUELTA: 'Resuelta',
};

const CONDITION_LABELS: Record<ReturnInspectionCondition, string> = {
  NUEVO: 'Nuevo',
  DEFECTUOSO: 'Defectuoso',
  DANADO: 'Dañado',
  REPARABLE: 'Reparable',
  NO_RECUPERABLE: 'No recuperable',
};

const RESOLUTION_LABELS: Record<ReturnResolutionType, string> = {
  REINGRESO_EXISTENCIAS: 'Reingreso a existencias',
  REPARACION: 'Reparación',
  DESCARTE: 'Descarte',
  DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
};

const MOTIVO_LABELS: Record<string, string> = {
  PRODUCTO_DEFECTUOSO: 'Producto defectuoso',
  PRODUCTO_DANADO: 'Producto dañado',
  PRODUCTO_INCORRECTO: 'Producto incorrecto',
  CANTIDAD_INCORRECTA: 'Cantidad incorrecta',
  PROBLEMA_ESTAMPADO: 'Problema de estampado',
  OTRO: 'Otro',
};

const DEFECTO_LABELS: Record<string, string> = {
  DEFECTO_CONFECCION: 'Defecto de confección',
  DEFECTO_MATERIAL: 'Defecto de material',
  DESGASTE: 'Desgaste',
  IMPERFECCION_VISUAL: 'Imperfección visual',
  ERROR_CANTIDAD: 'Error de cantidad',
  OTRO: 'Otro',
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-CO');
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('es-CO');
};

const getEnumLabel = (labels: Record<string, string>, value?: string | null) =>
  value ? labels[value] ?? value.replace(/_/g, ' ').toLowerCase() : '—';

const getFriendlyReturnError = (err: unknown): string => {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    if (err.status === 403) return 'No tienes permisos para realizar esta acción.';
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'No fue posible realizar la acción. Inténtalo nuevamente.';
};

export const AdminStockDevuelto: React.FC = () => {
  const userName = useAuthStore((state) => state.user?.name ?? state.user?.email);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const sessionChecked = useAuthStore((state) => state.sessionChecked);
  const [requests, setRequests] = useState<ReturnRequestDTO[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<EstadoFiltro>('TODOS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [detail, setDetail] = useState<ReturnRequestDetailDTO | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [statusModal, setStatusModal] = useState<StatusModalState | null>(null);
  const [statusObservaciones, setStatusObservaciones] = useState('');
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionForm, setInspectionForm] = useState<InspectionForm>({
    responsable: '',
    condicion: 'NUEVO',
    cantidadAceptada: '0',
    cantidadRechazada: '0',
    observaciones: '',
  });
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [resolutionForm, setResolutionForm] = useState<ResolutionForm>({
    tipo: 'REINGRESO_EXISTENCIAS',
    cantidad: '0',
    responsable: '',
    observaciones: '',
  });

  const loadingRequests = useRef(false);

  // Registro manual de devoluciones (teléfono, presencial, WhatsApp o asesor)
  const [createOpen, setCreateOpen] = useState(false);
  const [documento, setDocumento] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchMessage, setSearchMessage] = useState<string | null>(null);
  const [clienteEncontrado, setClienteEncontrado] = useState<CustomerDocumentMatch | null>(null);
  const [clienteOrders, setClienteOrders] = useState<ReturnFormOrderOption[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [canal, setCanal] = useState<ReturnCanalRegistro>('TELEFONO');
  const [createError, setCreateError] = useState<string | null>(null);
  const [createSaving, setCreateSaving] = useState(false);

  const resetCreateForm = () => {
    setDocumento('');
    setSearchState('idle');
    setSearchMessage(null);
    setClienteEncontrado(null);
    setClienteOrders([]);
    setCanal('TELEFONO');
    setCreateError(null);
  };

  const openCreateModal = () => {
    resetCreateForm();
    setCreateOpen(true);
  };

  const loadClientOrders = async (clienteId: string) => {
    setLoadingOrders(true);
    try {
      const result = await ordersApi.adminList({ clienteId, limit: 100 });
      setClienteOrders(
        (result.pedidos ?? [])
          .filter((p) => p.estado === 'Entregado')
          .map((p) => ({ id: p.id, numero: p.numero ?? '', fecha: p.fecha, estado: p.estado })),
      );
    } catch (err) {
      toast.error(getFriendlyReturnError(err));
    } finally {
      setLoadingOrders(false);
    }
  };

  const handleDocumentSearch = async () => {
    const term = documento.trim();
    if (term.length < 3) {
      setSearchState('error');
      setSearchMessage('Ingresa el número de identificación del cliente (mínimo 3 caracteres).');
      return;
    }
    setSearchState('loading');
    setSearchMessage(null);
    setClienteEncontrado(null);
    try {
      const matches = await customersApi.searchByDocument(term);
      if (matches.length === 0) {
        setSearchState('not_found');
        setSearchMessage('No se encontró un cliente con ese número de identificación.');
        return;
      }
      const match = matches[0];
      setClienteEncontrado(match);
      setSearchState('found');
      setSearchMessage(
        matches.length > 1 ? `Se encontraron ${matches.length} coincidencias. Se seleccionó la primera.` : null,
      );
      await loadClientOrders(match.id);
    } catch (err) {
      setSearchState('error');
      setSearchMessage(getFriendlyReturnError(err));
    }
  };

  const handleAdminCreate = async (input: CreateReturnRequestInput) => {
    setCreateSaving(true);
    setCreateError(null);
    try {
      const created = await returnsApi.createAdminReturnRequest({ ...input, canal });
      toast.success(`Devolución ${created.numeroDevolucion} registrada correctamente`);
      setCreateOpen(false);
      resetCreateForm();
      await loadRequests(false);
    } catch (err) {
      const message = getFriendlyReturnError(err);
      setCreateError(message);
      toast.error(message);
    } finally {
      setCreateSaving(false);
    }
  };

  const loadRequests = async (showLoader = true) => {
    if (loadingRequests.current) return;
    loadingRequests.current = true;
    if (showLoader) setLoading(true);
    setError(null);
    try {
      const data = await returnsApi.listReturnRequests();
      setRequests(data);
    } catch (err) {
      const message = getFriendlyReturnError(err);
      setError(message);
      toast.error(message);
    } finally {
      loadingRequests.current = false;
      if (showLoader) setLoading(false);
    }
  };

  useEffect(() => {
    if (!sessionChecked || !isAuthenticated) return;
    void loadRequests();
  }, [sessionChecked, isAuthenticated]);

  const filteredRequests = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es-CO');
    return requests.filter((request) => {
      if (statusFilter !== 'TODOS' && request.estado !== statusFilter) return false;
      if (!query) return true;
      return [
        request.numeroDevolucion,
        request.orderId,
        request.clienteSnapshot,
        request.motivo,
        request.observaciones,
      ].some((value) => value?.toLocaleLowerCase('es-CO').includes(query));
    });
  }, [requests, search, statusFilter]);

  const stats = useMemo(() => ({
    solicitude: requests.filter((item) => item.estado === 'SOLICITADA').length,
    proceso: requests.filter((item) => ['EN_REVISION', 'APROBADA', 'PRODUCTO_RECIBIDO'].includes(item.estado)).length,
    inspeccion: requests.filter((item) => item.estado === 'EN_INSPECCION').length,
    resueltas: requests.filter((item) => item.estado === 'RESUELTA').length,
    unidades: requests.reduce((sum, item) => sum + item.cantidadTotal, 0),
  }), [requests]);

  const refreshAfterAction = async (id: string) => {
    await loadRequests(false);
    const updated = await returnsApi.getReturnRequest(id);
    if (!updated) {
      setDetail(null);
      return;
    }
    setDetail(updated);
  };

  const openDetail = async (request: ReturnRequestDTO) => {
    setDetailOpen(true);
    setDetail(request as ReturnRequestDetailDTO);
    setDetailLoading(true);
    setFormError(null);
    try {
      const response = await returnsApi.getReturnRequest(request.id);
      if (!response) throw new Error('No fue posible cargar el detalle de la devolución.');
      setDetail(response);
    } catch (err) {
      const message = getFriendlyReturnError(err);
      setError(message);
      toast.error(message);
    } finally {
      setDetailLoading(false);
    }
  };

  const openStatusModal = (request: ReturnRequestDTO, nextStatus: ReturnRequestStatus) => {
    setFormError(null);
    setStatusObservaciones(request.observaciones ?? '');
    setStatusModal({ request, nextStatus });
  };

  const handleStatusSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!statusModal) return;
    if (statusModal.nextStatus === 'RECHAZADA' && !statusObservaciones.trim()) {
      setFormError('Ingresa el motivo de rechazo.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await returnsApi.changeReturnRequestStatus(
        statusModal.request.id,
        statusModal.nextStatus,
        userName,
        statusObservaciones.trim(),
      );
      toast.success(`Devolución actualizada a ${ESTADO_LABELS[statusModal.nextStatus]}`);
      const id = statusModal.request.id;
      setStatusModal(null);
      await refreshAfterAction(id);
    } catch (err) {
      const message = getFriendlyReturnError(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openInspection = (request: ReturnRequestDTO) => {
    setFormError(null);
    setInspectionForm({
      responsable: userName ?? '',
      condicion: 'NUEVO',
      cantidadAceptada: String(request.cantidadTotal),
      cantidadRechazada: '0',
      observaciones: '',
    });
    setInspectionOpen(true);
  };

  const handleInspectionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    const accepted = Number(inspectionForm.cantidadAceptada);
    const rejected = Number(inspectionForm.cantidadRechazada);
    if (!Number.isInteger(accepted) || accepted < 0) {
      setFormError('La cantidad aceptada debe ser un entero válido.');
      return;
    }
    if (!Number.isInteger(rejected) || rejected < 0) {
      setFormError('La cantidad rechazada debe ser un entero válido.');
      return;
    }
    if (accepted + rejected !== detail.cantidadTotal) {
      setFormError(`Las cantidades deben sumar ${detail.cantidadTotal}.`);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await returnsApi.createReturnInspection(detail.id, {
        responsable: inspectionForm.responsable.trim() || undefined,
        observaciones: inspectionForm.observaciones.trim() || undefined,
        condicion: inspectionForm.condicion,
        cantidadAceptada: accepted,
        cantidadRechazada: rejected,
      });
      toast.success('Inspección registrada correctamente');
      setInspectionOpen(false);
      await refreshAfterAction(detail.id);
    } catch (err) {
      const message = getFriendlyReturnError(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const openResolution = (request: ReturnRequestDTO) => {
    setFormError(null);
    setResolutionForm({
      tipo: 'REINGRESO_EXISTENCIAS',
      cantidad: String(request.cantidadTotal),
      responsable: userName ?? '',
      observaciones: '',
    });
    setResolutionOpen(true);
  };

  const handleResolutionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detail) return;
    const quantity = Number(resolutionForm.cantidad);
    const accepted = detail.inspection?.cantidadAceptada ?? 0;
    if (!Number.isInteger(quantity) || quantity <= 0) {
      setFormError('La cantidad debe ser un entero mayor a cero.');
      return;
    }
    if (quantity > accepted) {
      setFormError(`La cantidad no puede superar ${accepted} unidades aceptadas.`);
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await returnsApi.assignReturnResolution(detail.id, {
        tipo: resolutionForm.tipo,
        cantidad: quantity,
        responsable: resolutionForm.responsable.trim() || undefined,
        observaciones: resolutionForm.observaciones.trim() || undefined,
      });
      toast.success('Resolución asignada correctamente');
      setResolutionOpen(false);
      await refreshAfterAction(detail.id);
    } catch (err) {
      const message = getFriendlyReturnError(err);
      setFormError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Devolución', 'Pedido', 'Cliente', 'Estado', 'Cantidad', 'Inspeccionadas', 'Motivo', 'Solicitud', 'Actualización'];
    const rows = filteredRequests.map((item) => [
      item.numeroDevolucion,
      item.orderId,
      item.clienteSnapshot ?? '',
      ESTADO_LABELS[item.estado],
      item.cantidadTotal,
      item.cantidadInspeccionada ?? '',
      item.motivo ?? '',
      item.createdAt,
      item.updatedAt,
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `devoluciones_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Exportación CSV descargada');
  };

  const getActions = (request: ReturnRequestDTO) => {
    const actions = [];
    if (request.estado === 'SOLICITADA') {
      actions.push(
        { label: 'Iniciar revisión', icon: <Eye size={14} />, onClick: () => openStatusModal(request, 'EN_REVISION') },
        { label: 'Rechazar', icon: <XCircle size={14} />, onClick: () => openStatusModal(request, 'RECHAZADA'), danger: true },
      );
    }
    if (request.estado === 'EN_REVISION') {
      actions.push(
        { label: 'Aprobar', icon: <CheckCircle size={14} />, onClick: () => openStatusModal(request, 'APROBADA') },
        { label: 'Rechazar', icon: <XCircle size={14} />, onClick: () => openStatusModal(request, 'RECHAZADA'), danger: true },
      );
    }
    if (request.estado === 'APROBADA') {
      actions.push({ label: 'Confirmar recepción', icon: <PackageCheck size={14} />, onClick: () => openStatusModal(request, 'PRODUCTO_RECIBIDO') });
    }
    if (request.estado === 'PRODUCTO_RECIBIDO') {
      actions.push({ label: 'Realizar inspección', icon: <ClipboardCheck size={14} />, onClick: () => openInspection(request) });
    }
    if (request.estado === 'EN_INSPECCION') {
      actions.push({ label: 'Asignar resolución', icon: <CheckCircle size={14} />, onClick: () => openResolution(request) });
    }
    actions.push({ label: 'Ver detalle', icon: <FileText size={14} />, onClick: () => void openDetail(request) });
    return actions;
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Control de Devoluciones</h1>
          <p className={s.pageSubtitle}>Revisión, inspección y resolución de solicitudes</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" leftIcon={<RefreshCw size={16} />} onClick={() => void loadRequests()}>Actualizar</Button>
          <Button leftIcon={<Plus size={16} />} onClick={openCreateModal}>Registrar devolución</Button>
          <Button leftIcon={<Download size={16} />} onClick={exportCSV}>Exportar CSV</Button>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}><Clock size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.solicitude}</div><div className={s.statLabel}>Por revisar</div></div></div>
        <div className={s.statCard}><FileText size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.proceso}</div><div className={s.statLabel}>En proceso</div></div></div>
        <div className={s.statCard}><ClipboardCheck size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.inspeccion}</div><div className={s.statLabel}>En inspección</div></div></div>
        <div className={`${s.statCard} ${s.statCardSuccess}`}><CheckCircle size={20} className={s.statIconSuccess} /><div><div className={s.statValue}>{stats.resueltas}</div><div className={s.statLabel}>Resueltas</div></div></div>
        <div className={s.statCard}><PackageCheck size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.unidades}</div><div className={s.statLabel}>Unidades</div></div></div>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar por devolución, pedido, cliente o motivo..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          onSearch={setSearch}
          debounceMs={100}
          minChars={0}
        />
        <button className={s.filterToggle} onClick={() => setShowFilters((value) => !value)}>
          <Filter size={16} /> Filtros
        </button>
      </div>

      {showFilters && (
        <div className={s.filtersPanel}>
          <div className={s.field}>
            <label className={s.label} htmlFor="return-status-filter">Estado</label>
            <select id="return-status-filter" className={s.select} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as EstadoFiltro)}>
              <option value="TODOS">Todos los estados</option>
              {ESTADOS.map((status) => <option key={status} value={status}>{ESTADO_LABELS[status]}</option>)}
            </select>
          </div>
          <button className={s.clearFiltersBtn} onClick={() => setStatusFilter('TODOS')}>Limpiar filtros</button>
        </div>
      )}

      <div className={s.tableWrapper}>
        {loading && <div className={s.stateBox}><Loader2 size={28} className={s.spin} /><p>Cargando devoluciones...</p></div>}
        {error && !loading && <div className={s.errorBox}><AlertCircle size={28} /><p>{error}</p></div>}
        {!loading && !error && (
          <DataTable<ReturnRequestDTO>
            data={filteredRequests}
            pageSize={10}
            emptyMessage="No se encontraron devoluciones"
            enableRowSelection={false}
            enableExport={false}
            modalSize="xl"
            onRowClick={(request) => void openDetail(request)}
            actions={getActions}
            columns={[
              { key: 'numeroDevolucion', header: 'N° Devolución', render: (item) => <span className={s.tdPrimary}>{item.numeroDevolucion}</span> },
              { key: 'orderId', header: 'Pedido', render: (item) => item.orderId },
              { key: 'clienteSnapshot', header: 'Cliente', render: (item) => item.clienteSnapshot || '—' },
              { key: 'cantidadTotal', header: 'Unidades', width: '100px', render: (item) => item.cantidadTotal },
              { key: 'estado', header: 'Estado', width: '170px', render: (item) => <div className={s.estadoCell}><StatusBadge status={item.estado} label={ESTADO_LABELS[item.estado]} /></div> },
              { key: 'createdAt', header: 'Solicitud', width: '130px', sortable: true, render: (item) => <div className={s.fechaCell}><Clock size={14} /><span>{formatDate(item.createdAt)}</span></div> },
            ]}
          />
        )}
      </div>

      <Modal
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        title={detail ? `Devolución ${detail.numeroDevolucion}` : 'Detalle de devolución'}
        description={detail ? `Pedido ${detail.orderId} · ${detail.clienteSnapshot || 'Cliente no disponible'}` : undefined}
        size="lg"
        variant="form"
        className={s.returnDetailModal}
        bodyClassName={s.returnDetailModalBody}
      >
        {detailLoading && <div className={s.stateBox}><Loader2 size={26} className={s.spin} /><p>Cargando detalle...</p></div>}
        {!detailLoading && detail && (
          <div className={s.detailPanel}>
            <div className={s.detailHero}>
              <div className={s.detailHeroTop}>
                <StatusBadge status={detail.estado} label={ESTADO_LABELS[detail.estado]} />
                <span className={s.detailHeroMeta}>
                  <Clock size={13} />
                  {formatDate(detail.createdAt)}
                </span>
              </div>
              <div className={s.detailStats}>
                <div className={s.detailStat}>
                  <span className={s.detailStatValue}>{detail.cantidadTotal}</span>
                  <span className={s.detailStatLabel}>Unidades</span>
                </div>
                <div className={s.detailStat}>
                  <span className={s.detailStatValue}>{detail.items.length}</span>
                  <span className={s.detailStatLabel}>Productos</span>
                </div>
                <div className={s.detailStat}>
                  <span className={s.detailStatValue}>{detail.cantidadInspeccionada ?? 0}</span>
                  <span className={s.detailStatLabel}>Inspeccionadas</span>
                </div>
              </div>
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}><Info size={15} />Información de la solicitud</h3>
              <div className={s.detailGrid}>
                <div className={s.detailItem}><span className={s.detailLabel}>Pedido</span><span>{detail.orderId}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Cliente</span><span>{detail.clienteSnapshot || '—'}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Motivo</span><span>{getEnumLabel(MOTIVO_LABELS, detail.motivo)}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Canal</span><span>{getEnumLabel(CANAL_LABELS, detail.canalRegistro)}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Garantía</span><span>{detail.tipoGarantiaSnapshot || 'NINGUNA'}{detail.diasGarantiaSnapshot ? ` · ${detail.diasGarantiaSnapshot} días` : ''}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Vence garantía</span><span>{formatDate(detail.fechaVencimientoGarantia)}</span></div>
              </div>
              {detail.observaciones && <div className={s.observationBox}><strong>Observaciones</strong><p>{detail.observaciones}</p></div>}
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}><Package size={15} />Productos solicitados</h3>
              {detail.items.length === 0 ? <p className={s.emptyText}>Sin productos registrados</p> : (
                <div className={s.itemsTableWrap}>
                  <table className={s.itemsTable}>
                    <thead><tr><th>Referencia</th><th>Prenda</th><th>Solicitadas</th><th>Aprobadas</th><th>Recibidas</th><th>Defecto</th></tr></thead>
                    <tbody>{detail.items.map((item) => <tr key={item.id}><td>{item.ref}</td><td>{item.prenda}</td><td>{item.cantidadSolicitada}</td><td>{item.cantidadAprobada ?? '—'}</td><td>{item.cantidadRecibida ?? '—'}</td><td>{getEnumLabel(DEFECTO_LABELS, item.defectoTipo)}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}><Images size={15} />Evidencias</h3>
              <ReturnEvidenceGallery
                returnRequestId={detail.id}
                evidencias={detail.evidencias}
                numeroDevolucion={detail.numeroDevolucion}
              />
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}><ClipboardCheck size={15} />Inspección</h3>
              {detail.inspection ? (
                <div className={s.recordCard}>
                  <div className={s.recordHeader}><ClipboardCheck size={18} /><strong>{getEnumLabel(CONDITION_LABELS, detail.inspection.condicion)}</strong><span>{formatDateTime(detail.inspection.fecha)}</span></div>
                  <div className={s.detailGrid}>
                    <div className={s.detailItem}><span className={s.detailLabel}>Responsable</span><span>{detail.inspection.responsable || '—'}</span></div>
                    <div className={s.detailItem}><span className={s.detailLabel}>Resultado</span><span>{detail.inspection.cantidadAceptada} aceptadas · {detail.inspection.cantidadRechazada} rechazadas</span></div>
                  </div>
                  {detail.inspection.observaciones && <p>{detail.inspection.observaciones}</p>}
                </div>
              ) : <p className={s.pendingBox}>La inspección aún no ha sido registrada</p>}
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}><CheckCircle size={15} />Resolución</h3>
              {detail.resolution ? (
                <div className={s.recordCard}>
                  <div className={s.recordHeader}><CheckCircle size={18} /><strong>{getEnumLabel(RESOLUTION_LABELS, detail.resolution.tipo)}</strong><span>{formatDateTime(detail.resolution.fecha)}</span></div>
                  <div className={s.detailGrid}>
                    <div className={s.detailItem}><span className={s.detailLabel}>Cantidad</span><span>{detail.resolution.cantidad}</span></div>
                    <div className={s.detailItem}><span className={s.detailLabel}>Responsable</span><span>{detail.resolution.responsable || '—'}</span></div>
                  </div>
                  {detail.resolution.observaciones && <p>{detail.resolution.observaciones}</p>}
                </div>
              ) : <p className={s.pendingBox}>La resolución aún no ha sido asignada</p>}
            </div>

            <div className={s.detailSection}>
              <h3 className={s.detailSectionTitle}><History size={15} />Historial</h3>
              {detail.histories.length === 0 ? <p className={s.emptyText}>Sin cambios registrados</p> : (
                <div className={s.timeline}>
                  {detail.histories.map((history) => (
                    <div key={history.id} className={s.timelineItem}>
                      <span className={s.timelineDot} />
                      <div className={s.timelineContent}>
                        <div className={s.timelineTop}>
                          <strong>{getEnumLabel(ESTADO_LABELS, history.estadoNuevo)}</strong>
                          <span>{formatDateTime(history.fecha)}</span>
                        </div>
                        <p>{history.usuario || 'Usuario no identificado'}</p>
                        {history.observaciones && <p className={s.timelineNote}>{history.observaciones}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={s.detailActions}>
              {detail.estado === 'SOLICITADA' && <Button leftIcon={<Search size={16} />} onClick={() => openStatusModal(detail, 'EN_REVISION')}>Iniciar revisión</Button>}
              {detail.estado === 'EN_REVISION' && <Button leftIcon={<CheckCircle size={16} />} onClick={() => openStatusModal(detail, 'APROBADA')}>Aprobar solicitud</Button>}
              {detail.estado === 'EN_REVISION' && <Button variant="secondary" leftIcon={<XCircle size={16} />} onClick={() => openStatusModal(detail, 'RECHAZADA')}>Rechazar</Button>}
              {detail.estado === 'APROBADA' && <Button leftIcon={<PackageCheck size={16} />} onClick={() => openStatusModal(detail, 'PRODUCTO_RECIBIDO')}>Confirmar recepción</Button>}
              {detail.estado === 'PRODUCTO_RECIBIDO' && <Button leftIcon={<ClipboardCheck size={16} />} onClick={() => openInspection(detail)}>Realizar inspección</Button>}
              {detail.estado === 'EN_INSPECCION' && <Button leftIcon={<CheckCircle size={16} />} onClick={() => openResolution(detail)}>Asignar resolución</Button>}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Registrar devolución"
        description="Registra una devolución reportada por teléfono, en el punto de venta o por un asesor"
        size="md"
        variant="form"
        className={s.registerReturnModal}
        bodyClassName={s.registerReturnModalBody}
      >
        <div className={`${f.form} ${s.registerReturnForm}`}>
          <div className={f.field}>
            <label className={f.label} htmlFor="admin-client-document">Documento del cliente</label>
            <input
              id="admin-client-document"
              className={f.input}
              value={documento}
              onChange={(event) => {
                setDocumento(event.target.value);
                setSearchState('idle');
                setSearchMessage(null);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void handleDocumentSearch();
                }
              }}
              placeholder="Número de identificación"
            />
          </div>
          <div className={f.field}>
            <label className={f.label} htmlFor="admin-return-channel">Canal de registro</label>
            <select
              id="admin-return-channel"
              className={f.select}
              value={canal}
              onChange={(event) => setCanal(event.target.value as ReturnCanalRegistro)}
            >
              {(Object.keys(CANAL_LABELS) as ReturnCanalRegistro[]).map((value) => (
                <option key={value} value={value}>{CANAL_LABELS[value]}</option>
              ))}
            </select>
          </div>
          <div className={f.field}>
            <Button
              type="button"
              className={s.registerReturnSearchButton}
              leftIcon={searchState === 'loading' ? <Loader2 size={16} className={s.spin} /> : <Search size={16} />}
              onClick={() => void handleDocumentSearch()}
              loading={searchState === 'loading'}
              disabled={searchState === 'loading'}
            >
              Buscar
            </Button>
          </div>

          {searchState === 'loading' && (
            <div className={s.stateBox}>
              <Loader2 size={22} className={s.spin} />
              <p>Buscando cliente...</p>
            </div>
          )}

          {searchState === 'not_found' && (
            <div className={s.errorBox}>
              <AlertCircle size={18} />
              <p>{searchMessage}</p>
            </div>
          )}

          {searchState === 'error' && (
            <div className={s.errorBox}>
              <AlertCircle size={18} />
              <p>{searchMessage}</p>
            </div>
          )}

          {searchState === 'found' && clienteEncontrado && (
            <div className={s.recordCard}>
              <div className={s.recordHeader}>
                <UserCheck size={18} />
                <strong>Cliente encontrado</strong>
              </div>
              <div className={s.detailGrid}>
                <div className={s.detailItem}><span className={s.detailLabel}>Nombre</span><span>{clienteEncontrado.nombre}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Documento</span><span>{clienteEncontrado.documento}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Teléfono</span><span>{clienteEncontrado.telefono ?? '—'}</span></div>
                <div className={s.detailItem}><span className={s.detailLabel}>Correo</span><span>{clienteEncontrado.email ?? '—'}</span></div>
              </div>
              {searchMessage && <p>{searchMessage}</p>}
            </div>
          )}

          {clienteEncontrado && (
            <ReturnRequestForm
              orders={clienteOrders}
              loadingOrders={loadingOrders}
              submitLabel="Registrar devolución"
              saving={createSaving}
              formError={createError}
              showCancel
              compact
              onCancel={() => setCreateOpen(false)}
              onSubmit={handleAdminCreate}
            />
          )}

          {clienteEncontrado && clienteOrders.length === 0 && !loadingOrders && (
            <div className={s.filtersPanel}>
              <p className={s.emptyText}>El cliente no tiene pedidos entregados aptos para devolución.</p>
            </div>
          )}
        </div>
      </Modal>

      <Modal open={!!statusModal} onClose={() => setStatusModal(null)} title="Actualizar estado" description={statusModal ? `${statusModal.request.numeroDevolucion} · ${ESTADO_LABELS[statusModal.nextStatus]}` : undefined} size="md" variant="form">
        <form className={f.form} onSubmit={handleStatusSubmit}>
          {formError && <div className={f.formError}>{formError}</div>}
          <div className={f.field}>
            <label className={f.label} htmlFor="status-observations">Observaciones</label>
            <textarea id="status-observations" className={f.textarea} value={statusObservaciones} onChange={(event) => setStatusObservaciones(event.target.value)} rows={4} placeholder="Registra el motivo o detalle del cambio..." />
          </div>
          <ModalFooter secondary={{ label: 'Cancelar', onClick: () => setStatusModal(null), disabled: saving }} primary={{ label: 'Confirmar cambio', type: 'submit', loading: saving }} />
        </form>
      </Modal>

      <Modal open={inspectionOpen} onClose={() => setInspectionOpen(false)} title="Registrar inspección" description={detail ? `Devolución ${detail.numeroDevolucion}` : undefined} size="lg" variant="form">
        <form className={f.form} onSubmit={handleInspectionSubmit}>
          {formError && <div className={f.formError}>{formError}</div>}
          {detail && <div className={f.formRow3}>
            <div className={f.field}><label className={f.label}>Total recibido</label><input className={f.input} value={detail.cantidadTotal} disabled /></div>
            <div className={f.field}><label className={f.label} htmlFor="inspection-condition">Condición</label><select id="inspection-condition" className={f.select} value={inspectionForm.condicion} onChange={(event) => setInspectionForm((form) => ({ ...form, condicion: event.target.value as ReturnInspectionCondition }))}>{Object.entries(CONDITION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className={f.field}><label className={f.label} htmlFor="inspection-responsible">Responsable</label><input id="inspection-responsible" className={f.input} value={inspectionForm.responsable} onChange={(event) => setInspectionForm((form) => ({ ...form, responsable: event.target.value }))} /></div>
          </div>}
          <div className={f.formRow}>
            <div className={f.field}><label className={f.label} htmlFor="accepted-quantity">Cantidad aceptada</label><input id="accepted-quantity" className={f.input} type="number" min="0" value={inspectionForm.cantidadAceptada} onChange={(event) => setInspectionForm((form) => ({ ...form, cantidadAceptada: event.target.value }))} /></div>
            <div className={f.field}><label className={f.label} htmlFor="rejected-quantity">Cantidad rechazada</label><input id="rejected-quantity" className={f.input} type="number" min="0" value={inspectionForm.cantidadRechazada} onChange={(event) => setInspectionForm((form) => ({ ...form, cantidadRechazada: event.target.value }))} /></div>
          </div>
          <div className={f.field}><label className={f.label} htmlFor="inspection-observations">Observaciones</label><textarea id="inspection-observations" className={f.textarea} value={inspectionForm.observaciones} onChange={(event) => setInspectionForm((form) => ({ ...form, observaciones: event.target.value }))} rows={4} /></div>
          <ModalFooter secondary={{ label: 'Cancelar', onClick: () => setInspectionOpen(false), disabled: saving }} primary={{ label: 'Guardar inspección', type: 'submit', loading: saving, leftIcon: <ClipboardCheck size={16} /> }} />
        </form>
      </Modal>

      <Modal open={resolutionOpen} onClose={() => setResolutionOpen(false)} title="Asignar resolución" description={detail ? `Devolución ${detail.numeroDevolucion}` : undefined} size="lg" variant="form">
        <form className={f.form} onSubmit={handleResolutionSubmit}>
          {formError && <div className={f.formError}>{formError}</div>}
          <div className={f.formRow}>
            <div className={f.field}><label className={f.label} htmlFor="resolution-type">Tipo de resolución</label><select id="resolution-type" className={f.select} value={resolutionForm.tipo} onChange={(event) => setResolutionForm((form) => ({ ...form, tipo: event.target.value as ReturnResolutionType }))}>{Object.entries(RESOLUTION_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
            <div className={f.field}><label className={f.label} htmlFor="resolution-quantity">Cantidad</label><input id="resolution-quantity" className={f.input} type="number" min="1" max={detail?.inspection?.cantidadAceptada} value={resolutionForm.cantidad} onChange={(event) => setResolutionForm((form) => ({ ...form, cantidad: event.target.value }))} /></div>
          </div>
          <div className={f.field}><label className={f.label} htmlFor="resolution-responsible">Responsable</label><input id="resolution-responsible" className={f.input} value={resolutionForm.responsable} onChange={(event) => setResolutionForm((form) => ({ ...form, responsable: event.target.value }))} /></div>
          <div className={f.field}><label className={f.label} htmlFor="resolution-observations">Observaciones</label><textarea id="resolution-observations" className={f.textarea} value={resolutionForm.observaciones} onChange={(event) => setResolutionForm((form) => ({ ...form, observaciones: event.target.value }))} rows={4} /></div>
          <ModalFooter secondary={{ label: 'Cancelar', onClick: () => setResolutionOpen(false), disabled: saving }} primary={{ label: 'Asignar resolución', type: 'submit', loading: saving, leftIcon: <CheckCircle size={16} /> }} />
        </form>
      </Modal>
    </div>
  );
};
