import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Package,
  Clock,
  Download,
  FileText,
  Plus,
  ChevronDown,
  Save,
  Loader2,
  AlertCircle,
  Edit3,
  Trash2,
  Upload,
  Search,
  Calendar,
  User,
  Shield,
} from 'lucide-react';
import s from './StockDevuelto.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { toast } from 'sonner';
import {
  returnsApi,
  type ReturnRequestDTO,
  type ReturnRequestDetailDTO,
  type ReturnRequestItemDTO,
  type ReturnInspectionDTO,
  type ReturnResolutionDTO,
  type ReturnHistoryDTO,
  type ReturnRequestStatus,
} from '@/infrastructure/api/returnsApi';

interface DevolucionAdmin {
  id: string;
  numeroDevolucion: string;
  orderId: string;
  cliente: string;
  motivo: string;
  cantidadTotal: number;
  cantidadInspeccionada: number | null;
  estado: ReturnRequestStatus;
  tipoGarantia: string | null;
  diasGarantia: number | null;
  fechaVencimientoGarantia: string | null;
  createdAt: string;
  updatedAt: string;
}

const ESTADO_UI: Record<ReturnRequestStatus, string> = {
  SOLICITADA: 'Solicitada',
  EN_REVISION: 'En revisión',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  PRODUCTO_RECIBIDO: 'Producto recibido',
  EN_INSPECCION: 'En inspección',
  RESUELTA: 'Resuelta',
};

const RESOLUCION_UI: Record<string, string> = {
  REINGRESO_EXISTENCIAS: 'Reingreso a inventario',
  REPARACION: 'Reparación',
  DESCARTE: 'Descarte',
  DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
};

const DEFECTO_UI: Record<string, string> = {
  DEFECTO_CONFECCION: 'Defecto de confección',
  DEFECTO_MATERIAL: 'Defecto de material',
  DESGASTE: 'Desgaste',
  IMPERFECCION_VISUAL: 'Imperfección visual',
  ERROR_CANTIDAD: 'Error de cantidad',
  OTRO: 'Otro',
};

const CONDICION_UI: Record<string, string> = {
  NUEVO: 'Nuevo',
  DEFECTUOSO: 'Defectuoso',
  DANADO: 'Dañado',
  REPARABLE: 'Reparable',
  NO_RECUPERABLE: 'No recuperable',
};

const ESTADOS_PENDIENTES: ReturnRequestStatus[] = ['SOLICITADA', 'EN_REVISION'];
const ESTADOS_INSPECCION: ReturnRequestStatus[] = ['PRODUCTO_RECIBIDO', 'EN_INSPECCION'];
const ESTADOS_TERMINALES: ReturnRequestStatus[] = ['RECHAZADA', 'RESUELTA'];

function toDevolucionAdmin(dto: ReturnRequestDTO): DevolucionAdmin {
  return {
    id: dto.id,
    numeroDevolucion: dto.numeroDevolucion,
    orderId: dto.orderId,
    cliente: dto.clienteSnapshot ?? '',
    motivo: dto.motivo ?? '',
    cantidadTotal: dto.cantidadTotal,
    cantidadInspeccionada: dto.cantidadInspeccionada,
    estado: dto.estado,
    tipoGarantia: dto.tipoGarantiaSnapshot,
    diasGarantia: dto.diasGarantiaSnapshot,
    fechaVencimientoGarantia: dto.fechaVencimientoGarantia,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getAllowedTransitions(estado: ReturnRequestStatus): ReturnRequestStatus[] {
  const map: Record<ReturnRequestStatus, ReturnRequestStatus[]> = {
    SOLICITADA: ['EN_REVISION', 'RECHAZADA'],
    EN_REVISION: ['APROBADA', 'RECHAZADA'],
    APROBADA: ['PRODUCTO_RECIBIDO'],
    RECHAZADA: [],
    PRODUCTO_RECIBIDO: ['EN_INSPECCION'],
    EN_INSPECCION: ['RESUELTA'],
    RESUELTA: [],
  };
  return map[estado];
}

export const AdminStockDevuelto: React.FC = () => {
  const [devoluciones, setDevoluciones] = useState<DevolucionAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<ReturnRequestStatus | 'Todos'>('Todos');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedDevoluciones, setSelectedDevoluciones] = useState<DevolucionAdmin[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailDevolucion, setDetailDevolucion] = useState<DevolucionAdmin | null>(null);
  const [detailData, setDetailData] = useState<ReturnRequestDetailDTO | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [inspectionOpen, setInspectionOpen] = useState(false);
  const [inspectionData, setInspectionData] = useState({
    responsable: '',
    observaciones: '',
    condicion: 'DEFECTUOSO' as string,
    cantidadAceptada: 0,
    cantidadRechazada: 0,
  });
  const [resolutionOpen, setResolutionOpen] = useState(false);
  const [resolutionData, setResolutionData] = useState({
    tipo: 'REINGRESO_EXISTENCIAS' as string,
    cantidad: 0,
    responsable: '',
    observaciones: '',
  });
  const [saving, setSaving] = useState(false);
  const [batchEstado, setBatchEstado] = useState<ReturnRequestStatus | ''>('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await returnsApi.listReturnRequests();
      setDevoluciones(data.map(toDevolucionAdmin));
    } catch (err: any) {
      setError(err?.message ?? 'Error al cargar devoluciones');
      toast.error('No se pudieron cargar las devoluciones');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredDevoluciones = useMemo(() => {
    return devoluciones.filter((d) => {
      const matchesSearch =
        search === '' ||
        d.numeroDevolucion.toLowerCase().includes(search.toLowerCase()) ||
        d.orderId.toLowerCase().includes(search.toLowerCase()) ||
        d.cliente.toLowerCase().includes(search.toLowerCase()) ||
        (d.motivo?.toLowerCase().includes(search.toLowerCase()) ?? false);
      const matchesEstado = filtroEstado === 'Todos' || d.estado === filtroEstado;
      return matchesSearch && matchesEstado;
    });
  }, [devoluciones, search, filtroEstado]);

  const openDetail = async (d: DevolucionAdmin) => {
    setDetailDevolucion(d);
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailData(null);
    try {
      const data = await returnsApi.getReturnRequest(d.id);
      setDetailData(data);
    } catch (err: any) {
      toast.error('No se pudieron cargar los detalles');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailDevolucion(null);
    setDetailData(null);
  };

  const handleStatusChange = async (d: DevolucionAdmin, nextStatus: ReturnRequestStatus) => {
    try {
      await returnsApi.changeReturnRequestStatus(d.id, nextStatus);
      setDevoluciones((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, estado: nextStatus } : x)),
      );
      toast.success(`Estado actualizado a "${ESTADO_UI[nextStatus]}"`);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado');
    }
  };

  const openInspection = () => {
    if (!detailDevolucion) return;
    const totalItems = detailData?.items.length ?? 0;
    const totalCantidad = detailData?.items.reduce((sum, i) => sum + i.cantidadSolicitada, 0) ?? 0;
    setInspectionData({
      responsable: '',
      observaciones: '',
      condicion: 'DEFECTUOSO',
      cantidadAceptada: totalCantidad,
      cantidadRechazada: 0,
    });
    setInspectionOpen(true);
  };

  const handleInspectionSubmit = async () => {
    if (!detailDevolucion) return;
    setSaving(true);
    try {
      await returnsApi.changeReturnRequestStatus(detailDevolucion.id, 'EN_INSPECCION');
      await returnsApi.createReturnInspection(detailDevolucion.id, inspectionData);
      await load();
      closeDetail();
      setInspectionOpen(false);
      toast.success('Inspección completada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo completar la inspección');
    } finally {
      setSaving(false);
    }
  };

  const openResolution = () => {
    if (!detailDevolucion) return;
    const totalCantidad = detailData?.items.reduce((sum, i) => sum + i.cantidadSolicitada, 0) ?? 0;
    setResolutionData({
      tipo: 'REINGRESO_EXISTENCIAS',
      cantidad: totalCantidad,
      responsable: '',
      observaciones: '',
    });
    setResolutionOpen(true);
  };

  const handleResolutionSubmit = async () => {
    if (!detailDevolucion) return;
    setSaving(true);
    try {
      await returnsApi.assignReturnResolution(detailDevolucion.id, resolutionData);
      await returnsApi.changeReturnRequestStatus(detailDevolucion.id, 'RESUELTA');
      await load();
      closeDetail();
      setResolutionOpen(false);
      toast.success('Resolución asignada y solicitud resuelta');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo asignar la resolución');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    pendientes: devoluciones.filter((d) => ESTADOS_PENDIENTES.includes(d.estado)).length,
    aprobadas: devoluciones.filter((d) => d.estado === 'APROBADA').length,
    enInspeccion: devoluciones.filter((d) => ESTADOS_INSPECCION.includes(d.estado)).length,
    resueltas: devoluciones.filter((d) => d.estado === 'RESUELTA').length,
    rechazadas: devoluciones.filter((d) => d.estado === 'RECHAZADA').length,
    totalItems: devoluciones.reduce((sum, d) => sum + d.cantidadTotal, 0),
  };

  const getEstadoColor = (estado: ReturnRequestStatus): string => {
    const colors: Record<ReturnRequestStatus, string> = {
      SOLICITADA: 'info',
      EN_REVISION: 'warning',
      APROBADA: 'success',
      RECHAZADA: 'danger',
      PRODUCTO_RECIBIDO: 'info',
      EN_INSPECCION: 'warning',
      RESUELTA: 'default',
    };
    return colors[estado];
  };

  const acciones = (d: DevolucionAdmin) => {
    const actions: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }[] = [];

    if (d.estado === 'SOLICITADA') {
      actions.push({ label: 'Revisar', icon: <CheckCircle size={14} />, onClick: () => handleStatusChange(d, 'EN_REVISION') });
      actions.push({ label: 'Rechazar', icon: <AlertTriangle size={14} />, onClick: () => handleStatusChange(d, 'RECHAZADA'), danger: true });
    } else if (d.estado === 'EN_REVISION') {
      actions.push({ label: 'Aprobar', icon: <CheckCircle size={14} />, onClick: () => handleStatusChange(d, 'APROBADA') });
      actions.push({ label: 'Rechazar', icon: <AlertTriangle size={14} />, onClick: () => handleStatusChange(d, 'RECHAZADA'), danger: true });
    } else if (d.estado === 'APROBADA') {
      actions.push({ label: 'Confirmar recepción', icon: <Package size={14} />, onClick: () => handleStatusChange(d, 'PRODUCTO_RECIBIDO') });
    } else if (d.estado === 'PRODUCTO_RECIBIDO') {
      actions.push({ label: 'Iniciar inspección', icon: <Edit3 size={14} />, onClick: () => openDetail(d) });
    } else if (d.estado === 'EN_INSPECCION') {
      actions.push({ label: 'Asignar resolución', icon: <Package size={14} />, onClick: () => openDetail(d) });
    }

    actions.push({ label: 'Ver detalle', icon: <FileText size={14} />, onClick: () => openDetail(d) });

    return actions;
  };

  const renderEstadoCell = (d: DevolucionAdmin) => {
    const transitions = getAllowedTransitions(d.estado);
    return (
      <div className={s.estadoCell}>
        <StatusBadge status={getEstadoColor(d.estado)} text={ESTADO_UI[d.estado]} />
      </div>
    );
  };

  const exportCSV = () => {
    const headers = ['N° Devolución', 'N° Orden', 'Cliente', 'Motivo', 'Cant. Total', 'Cant. Inspecc.', 'Estado', 'Tipo Garantía', 'Días Garantía', 'Venc. Garantía', 'Fecha creación', 'Última actualización'];
    const rows = filteredDevoluciones.map((d) => [
      d.numeroDevolucion,
      d.orderId,
      d.cliente,
      d.motivo,
      String(d.cantidadTotal),
      String(d.cantidadInspeccionada ?? 0),
      ESTADO_UI[d.estado],
      d.tipoGarantia ?? '-',
      d.diasGarantia !== null ? String(d.diasGarantia) : '-',
      d.fechaVencimientoGarantia ? formatDate(d.fechaVencimientoGarantia) : '-',
      formatDate(d.createdAt),
      formatDate(d.updatedAt),
    ]);
    const csvContent = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `devoluciones_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success('Exportación CSV descargada');
  };

  const handleBatchStatus = async () => {
    if (selectedDevoluciones.length === 0 || !batchEstado) return;
    try {
      for (const d of selectedDevoluciones) {
        await returnsApi.changeReturnRequestStatus(d.id, batchEstado);
      }
      await load();
      setSelectedDevoluciones([]);
      setBatchEstado('');
      toast.success(`${selectedDevoluciones.length} solicitudes actualizadas`);
    } catch (err: any) {
      toast.error('Error al actualizar lote');
    }
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de Devoluciones</h1>
          <p className={s.pageSubtitle}>Solicitudes de devolución, inspección y resolución</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" leftIcon={<Download size={16} />} onClick={exportCSV}>
            Exportar CSV
          </Button>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}>
          <Clock size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>{stats.pendientes}</div>
            <div className={s.statLabel}>Pendientes</div>
          </div>
        </div>
        <div className={s.statCard}>
          <CheckCircle size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>{stats.aprobadas}</div>
            <div className={s.statLabel}>Aprobadas</div>
          </div>
        </div>
        <div className={s.statCard}>
          <Search size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>{stats.enInspeccion}</div>
            <div className={s.statLabel}>En inspección</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardSuccess}`}>
          <RotateCcw size={20} className={s.statIconSuccess} />
          <div>
            <div className={s.statValue}>{stats.resueltas}</div>
            <div className={s.statLabel}>Resueltas</div>
          </div>
        </div>
        <div className={`${s.statCard} ${s.statCardDanger}`}>
          <AlertTriangle size={20} className={s.statIconDanger} />
          <div>
            <div className={s.statValue}>{stats.rechazadas}</div>
            <div className={s.statLabel}>Rechazadas</div>
          </div>
        </div>
        <div className={s.statCard}>
          <Package size={20} className={s.statIcon} />
          <div>
            <div className={s.statValue}>{stats.totalItems}</div>
            <div className={s.statLabel}>Total unidades</div>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            className={s.searchInput}
            placeholder="Buscar por devolución, orden, cliente o motivo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className={s.filterToggle} onClick={() => setShowFilters(!showFilters)}>
          <FileText size={16} /> Filtros <ChevronDown size={14} className={`${s.filterChevron} ${showFilters ? s.filterChevronOpen : ''}`} />
        </button>
      </div>

      {showFilters && (
        <div className={s.filtersPanel}>
          <div className={s.filterGroup}>
            <label className={s.label}>Estado</label>
            <div className={s.batchActions}>
              {(['Todos', 'SOLICITADA', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'PRODUCTO_RECIBIDO', 'EN_INSPECCION', 'RESUELTA'] as const).map((e) => (
                <button
                  key={e}
                  className={`${s.filterBtn} ${filtroEstado === e ? s.filterBtnActive : ''}`}
                  onClick={() => setFiltroEstado(e)}
                >
                  {e === 'Todos' ? 'Todos' : ESTADO_UI[e as ReturnRequestStatus]}
                </button>
              ))}
            </div>
          </div>
          <button className={s.clearFiltersBtn} onClick={() => setFiltroEstado('Todos')}>
            Limpiar filtros
          </button>
        </div>
      )}

      {selectedDevoluciones.length > 0 && (
        <div className={s.selectionBar}>
          <div className={s.selectionText}>
            <strong>{selectedDevoluciones.length}</strong> {selectedDevoluciones.length === 1 ? 'registro seleccionado' : 'registros seleccionados'}
          </div>
          <div className={s.batchActions}>
            <select
              className={s.select}
              value={batchEstado}
              onChange={(e) => setBatchEstado(e.target.value as ReturnRequestStatus | '')}
            >
              <option value="">Cambiar estado...</option>
              {ESTADOS_PENDIENTES.map((e) => (
                <option key={e} value={e}>{ESTADO_UI[e]}</option>
              ))}
              <option value="APROBADA">Aprobada</option>
              <option value="PRODUCTO_RECIBIDO">Producto recibido</option>
              <option value="EN_INSPECCION">En inspección</option>
              <option value="RESUELTA">Resuelta</option>
              <option value="RECHAZADA">Rechazada</option>
            </select>
            <Button size="xs" onClick={handleBatchStatus} disabled={!batchEstado}>
              Aplicar
            </Button>
            <Button variant="ghost" size="xs" onClick={() => setSelectedDevoluciones([])}>
              Limpiar
            </Button>
          </div>
        </div>
      )}

      <div className={s.tableWrapper}>
        {loading && (
          <div className={s.stateBox}>
            <Loader2 size={28} className={s.spin} />
            <p>Cargando devoluciones...</p>
          </div>
        )}
        {error && (
          <div className={s.errorBox}>
            <AlertCircle size={28} />
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
          <table className={s.table}>
            <thead>
              <tr>
                <th style={{ width: '36px' }}></th>
                <th>N° Devolución</th>
                <th>N° Orden</th>
                <th>Cliente</th>
                <th>Motivo</th>
                <th style={{ textAlign: 'center' }}>Cant.</th>
                <th>Estado</th>
                <th>Garantía</th>
                <th>Fecha</th>
                <th style={{ width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevoluciones.length === 0 ? (
                <tr>
                  <td colSpan={10} className={s.emptyRow}>
                    No se encontraron devoluciones
                  </td>
                </tr>
              ) : (
                filteredDevoluciones.map((d) => (
                  <tr key={d.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedDevoluciones.some((s) => s.id === d.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDevoluciones((prev) => [...prev, d]);
                          } else {
                            setSelectedDevoluciones((prev) => prev.filter((s) => s.id !== d.id));
                          }
                        }}
                      />
                    </td>
                    <td className={s.tdPrimary}>{d.numeroDevolucion}</td>
                    <td className={s.tdMono}>{d.orderId}</td>
                    <td>{d.cliente || '-'}</td>
                    <td className={s.motivoCell}>{d.motivo || '-'}</td>
                    <td className={s.tdCenter}>
                      <span className={s.cantidadBadge}>{d.cantidadTotal}</span>
                      {d.cantidadInspeccionada !== null && d.cantidadInspeccionada > 0 && (
                        <span className={s.cantidadBadge} style={{ marginLeft: 4 }}>
                          {d.cantidadInspeccionada}
                        </span>
                      )}
                    </td>
                    <td>{renderEstadoCell(d)}</td>
                    <td>
                      {d.tipoGarantia ? (
                        <div style={{ fontSize: '0.82rem' }}>
                          <div>{d.tipoGarantia === 'NINGUNA' ? 'Sin garantía' : d.tipoGarantia === 'VENTA' ? 'Venta' : 'Fabricante'}</div>
                          {d.diasGarantia !== null && <span style={{ color: 'var(--color-text-muted)' }}>{d.diasGarantia} días</span>}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-text-muted)' }}>Sin garantía</span>
                      )}
                    </td>
                    <td>
                      <div className={s.fechaCell}>
                        <Calendar size={14} />
                        <span>{formatDate(d.fechaVencimientoGarantia ?? d.createdAt)}</span>
                      </div>
                    </td>
                    <td>
                      <div className={s.actions}>
                        {acciones(d).map((a) => (
                          <button
                            key={a.label}
                            className={s.actionBtn}
                            onClick={a.onClick}
                            disabled={a.disabled}
                            title={a.label}
                          >
                            {a.icon}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        open={detailOpen}
        onClose={closeDetail}
        title={`Devolución ${detailDevolucion?.numeroDevolucion ?? ''}`}
        description="Detalles de la solicitud"
        size="xl"
      >
        <div>
          {detailLoading && (
            <div className={s.stateBox}>
              <Loader2 size={24} className={s.spin} />
              <p>Cargando detalles...</p>
            </div>
          )}
          {!detailLoading && detailData && (
            <div>
              <div className={s.devolucionInfo}>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Estado</span>
                  <span className={s.infoValue}>{ESTADO_UI[detailData.estado]}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Cliente</span>
                  <span className={s.infoValue}>{detailData.clienteSnapshot ?? '-'}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Orden</span>
                  <span className={s.infoValue}>{detailData.orderId}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Motivo</span>
                  <span className={s.infoValue}>{detailData.motivo ?? '-'}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Observaciones</span>
                  <span className={s.infoValue}>{detailData.observaciones ?? '-'}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Cantidad total / inspeccionada</span>
                  <span className={s.infoValue}>
                    {detailData.cantidadTotal} / {detailData.cantidadInspeccionada ?? '-'}
                  </span>
                </div>
                {detailData.tipoGarantiaSnapshot && (
                  <div className={s.infoRow}>
                    <span className={s.infoLabel}>Garantía</span>
                    <span className={s.infoValue}>
                      {detailData.tipoGarantiaSnapshot === 'VENTA' ? 'Venta' : detailData.tipoGarantiaSnapshot === 'FABRICANTE' ? 'Fabricante' : 'Ninguna'} • {detailData.diasGarantiaSnapshot ?? 0} días • Vence: {formatDate(detailData.fechaVencimientoGarantia ?? undefined)}
                    </span>
                  </div>
                )}
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Creado</span>
                  <span className={s.infoValue}>{formatDate(detailData.createdAt)}</span>
                </div>
                <div className={s.infoRow}>
                  <span className={s.infoLabel}>Actualizado</span>
                  <span className={s.infoValue}>{formatDate(detailData.updatedAt)}</span>
                </div>
              </div>

              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Productos ({detailData.items.length})</h4>
                <div style={{ overflowX: 'auto' }}>
                  <table className={s.table} style={{ fontSize: '0.82rem' }}>
                    <thead>
                      <tr>
                        <th>Referencia</th>
                        <th>Prenda</th>
                        <th style={{ textAlign: 'center' }}>Cant. Solicitada</th>
                        <th>Defecto</th>
                        <th>Descripción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailData.items.map((item) => (
                        <tr key={item.id}>
                          <td className={s.tdMono}>{item.ref}</td>
                          <td>{item.prenda}</td>
                          <td className={s.tdCenter}>{item.cantidadSolicitada}</td>
                          <td>{DEFECTO_UI[item.defectoTipo] ?? item.defectoTipo}</td>
                          <td>{item.defectoDescripcion ?? '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {detailData.inspection && (
                <div className={s.detailSection}>
                  <h4 className={s.detailSectionTitle}>Inspección</h4>
                  <div className={s.detailGrid}>
                    <div className={s.detailItem}>
                      <span className={s.detailLabel}>Condición</span>
                      <span className={s.infoValue}>{CONDICION_UI[detailData.inspection.condicion] ?? detailData.inspection.condicion}</span>
                    </div>
                    <div className={s.detailItem}>
                      <span className={s.detailLabel}>Cant. aceptada</span>
                      <span className={s.infoValue}>{detailData.inspection.cantidadAceptada}</span>
                    </div>
                    <div className={s.detailItem}>
                      <span className={s.detailLabel}>Cant. rechazada</span>
                      <span className={s.infoValue}>{detailData.inspection.cantidadRechazada}</span>
                    </div>
                    {detailData.inspection.responsable && (
                      <div className={s.detailItem}>
                        <span className={s.detailLabel}>Responsable</span>
                        <span className={s.infoValue}>{detailData.inspection.responsable}</span>
                      </div>
                    )}
                    {detailData.inspection.observaciones && (
                      <div className={s.detailItem}>
                        <span className={s.detailLabel}>Observaciones</span>
                        <span className={s.infoValue}>{detailData.inspection.observaciones}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailData.resolution && (
                <div className={s.detailSection}>
                  <h4 className={s.detailSectionTitle}>Resolución</h4>
                  <div className={s.detailGrid}>
                    <div className={s.detailItem}>
                      <span className={s.detailLabel}>Tipo</span>
                      <span className={s.infoValue}>{RESOLUCION_UI[detailData.resolution.tipo] ?? detailData.resolution.tipo}</span>
                    </div>
                    <div className={s.detailItem}>
                      <span className={s.detailLabel}>Cantidad</span>
                      <span className={s.infoValue}>{detailData.resolution.cantidad}</span>
                    </div>
                    {detailData.resolution.responsable && (
                      <div className={s.detailItem}>
                        <span className={s.detailLabel}>Responsable</span>
                        <span className={s.infoValue}>{detailData.resolution.responsable}</span>
                      </div>
                    )}
                    {detailData.resolution.observaciones && (
                      <div className={s.detailItem}>
                        <span className={s.detailLabel}>Observaciones</span>
                        <span className={s.infoValue}>{detailData.resolution.observaciones}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={s.detailSection}>
                <h4 className={s.detailSectionTitle}>Historial de cambios ({detailData.histories.length})</h4>
                <div className={s.historialList}>
                  {detailData.histories.length === 0 ? (
                    <p className={s.emptyText}>Sin cambios registrados</p>
                  ) : (
                    detailData.histories
                      .slice()
                      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
                      .map((h) => (
                        <div key={h.id} className={s.historialItem}>
                          <span className={s.historialFecha}>{formatDate(h.fecha)}</span>
                          <span className={s.historialCambio}>
                            {ESTADO_UI[h.estadoAnterior as ReturnRequestStatus] ?? h.estadoAnterior} → {ESTADO_UI[h.estadoNuevo as ReturnRequestStatus] ?? h.estadoNuevo}
                          </span>
                          <span className={s.historialUsuario}>{h.usuario ?? '-'}</span>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
        {detailData && detailData.estado === 'PRODUCTO_RECIBIDO' && (
          <ModalFooter
            secondary={{ label: 'Cerrar', onClick: closeDetail }}
            primary={{
              label: 'Iniciar inspección',
              onClick: openInspection,
              leftIcon: <Edit3 size={16} />,
            }}
          />
        )}
        {detailData && detailData.estado === 'EN_INSPECCION' && !detailData.inspection && (
          <ModalFooter
            secondary={{ label: 'Cerrar', onClick: closeDetail }}
            primary={{
              label: 'Completar inspección',
              onClick: openInspection,
              leftIcon: <CheckCircle size={16} />,
            }}
          />
        )}
        {detailData && detailData.estado === 'EN_INSPECCION' && detailData.inspection && (
          <ModalFooter
            secondary={{ label: 'Cerrar', onClick: closeDetail }}
            primary={{
              label: 'Asignar resolución',
              onClick: openResolution,
              leftIcon: <Package size={16} />,
            }}
          />
        )}
      </Modal>

      <Modal open={inspectionOpen} onClose={() => setInspectionOpen(false)} title="Completar inspección" description="Registra los resultados de la inspección física" size="lg">
        <div>
          <div className={s.detailSection}>
            <h4 className={s.detailSectionTitle}>Información de inspección</h4>
            <div className={s.detailGrid}>
              <div className={s.field}>
                <label className={s.label}>Condición *</label>
                <select
                  className={s.select}
                  value={inspectionData.condicion}
                  onChange={(e) => setInspectionData((p) => ({ ...p, condicion: e.target.value }))}
                >
                  <option value="NUEVO">Nuevo</option>
                  <option value="DEFECTUOSO">Defectuoso</option>
                  <option value="DANADO">Dañado</option>
                  <option value="REPARABLE">Reparable</option>
                  <option value="NO_RECUPERABLE">No recuperable</option>
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Responsable *</label>
                <input
                  className={s.input}
                  value={inspectionData.responsable}
                  onChange={(e) => setInspectionData((p) => ({ ...p, responsable: e.target.value }))}
                  placeholder="Nombre del responsable"
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Cant. aceptada *</label>
                <input
                  className={s.input}
                  type="number"
                  min="0"
                  value={inspectionData.cantidadAceptada}
                  onChange={(e) => setInspectionData((p) => ({ ...p, cantidadAceptada: Number(e.target.value) }))}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Cant. rechazada *</label>
                <input
                  className={s.input}
                  type="number"
                  min="0"
                  value={inspectionData.cantidadRechazada}
                  onChange={(e) => setInspectionData((p) => ({ ...p, cantidadRechazada: Number(e.target.value) }))}
                />
              </div>
              <div className={s.field} style={{ gridColumn: '1 / -1' }}>
                <label className={s.label}>Observaciones</label>
                <textarea
                  className={s.textarea}
                  rows={3}
                  value={inspectionData.observaciones}
                  onChange={(e) => setInspectionData((p) => ({ ...p, observaciones: e.target.value }))}
                  placeholder="Notas de la inspección..."
                />
              </div>
            </div>
          </div>
        </div>
        <ModalFooter
          secondary={{ label: 'Cancelar', onClick: () => setInspectionOpen(false), disabled: saving }}
          primary={{ label: 'Guardar inspección', type: 'submit', loading: saving, onClick: handleInspectionSubmit }}
        />
      </Modal>

      <Modal open={resolutionOpen} onClose={() => setResolutionOpen(false)} title="Asignar resolución" description="Define el destino de los productos inspeccionados" size="lg">
        <div>
          <div className={s.detailSection}>
            <h4 className={s.detailSectionTitle}>Resolución</h4>
            <div className={s.detailGrid}>
              <div className={s.field}>
                <label className={s.label}>Tipo de resolución *</label>
                <select
                  className={s.select}
                  value={resolutionData.tipo}
                  onChange={(e) => setResolutionData((p) => ({ ...p, tipo: e.target.value }))}
                >
                  <option value="REINGRESO_EXISTENCIAS">Reingreso a inventario</option>
                  <option value="REPARACION">Reparación</option>
                  <option value="DESCARTE">Descarte</option>
                  <option value="DEVOLUCION_PROVEEDOR">Devolución a proveedor</option>
                </select>
              </div>
              <div className={s.field}>
                <label className={s.label}>Cantidad *</label>
                <input
                  className={s.input}
                  type="number"
                  min="0"
                  value={resolutionData.cantidad}
                  onChange={(e) => setResolutionData((p) => ({ ...p, cantidad: Number(e.target.value) }))}
                />
              </div>
              <div className={s.field}>
                <label className={s.label}>Responsable / Taller</label>
                <input
                  className={s.input}
                  value={resolutionData.responsable}
                  onChange={(e) => setResolutionData((p) => ({ ...p, responsable: e.target.value }))}
                  placeholder="Nombre del taller o responsable"
                />
              </div>
              <div className={s.field} style={{ gridColumn: '1 / -1' }}>
                <label className={s.label}>Observaciones</label>
                <textarea
                  className={s.textarea}
                  rows={3}
                  value={resolutionData.observaciones}
                  onChange={(e) => setResolutionData((p) => ({ ...p, observaciones: e.target.value }))}
                  placeholder="Notas de la resolución..."
                />
              </div>
            </div>
          </div>
        </div>
        <ModalFooter
          secondary={{ label: 'Cancelar', onClick: () => setResolutionOpen(false), disabled: saving }}
          primary={{ label: 'Asignar y resolver', type: 'submit', loading: saving, onClick: handleResolutionSubmit }}
        />
      </Modal>
    </div>
  );
};
