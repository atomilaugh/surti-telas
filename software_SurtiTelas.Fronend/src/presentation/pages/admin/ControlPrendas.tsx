import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Search, ClipboardCheck, CheckCircle, XCircle, Layers, Plus, Edit, Trash2 } from 'lucide-react';
import s from './ControlPrendas.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { controlPrendaApi, type ControlPrenda } from '@/infrastructure/api/controlPrendaApi';
import { productionApi } from '@/infrastructure/api/productionApi';
import { ETAPAS_CONTROL, ESTADOS_CONTROL } from '@/shared/constants/options';

type Etapa = ControlPrenda['etapa'];
type Estado = ControlPrenda['estado'];

const ETAPAS = ETAPAS_CONTROL as unknown as Etapa[];
const ESTADOS = ESTADOS_CONTROL as unknown as Estado[];

export const AdminControlPrendas: React.FC = () => {
  const [search, setSearch] = useState('');
  const [registros, setRegistros] = useState<ControlPrenda[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEtapa, setFiltroEtapa] = useState<'Todos' | Etapa>('Todos');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | Estado>('Todos');

  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [produccionId, setProduccionId] = useState('');
  const [ordenesProduccion, setOrdenesProduccion] = useState<{ id: string; numero?: string; cliente?: string }[]>([]);
  const [etapa, setEtapa] = useState<Etapa>('Control de Calidad');
  const [cantidadTotal, setCantidadTotal] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewEstado, setReviewEstado] = useState<'Aprobado' | 'Rechazado'>('Aprobado');
  const [reviewAprobada, setReviewAprobada] = useState('');
  const [reviewRechazada, setReviewRechazada] = useState('');

  useEffect(() => {
    const loadOrdenes = async () => {
      try {
        const data = await productionApi.list();
        const ordenes = data.map((o: { id: string; numero?: string; clienteNombre?: string }) => ({
          id: o.id,
          numero: o.numero,
          cliente: o.clienteNombre,
        }));
        setOrdenesProduccion(ordenes);
      } catch {
        // Si falla la carga de órdenes, igual se permite escribir el ID manualmente
      }
    };
    void loadOrdenes();
  }, []);

  const fetchRegistros = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await controlPrendaApi.list();
      setRegistros(data);
    } catch {
      setError('No se pudieron cargar los registros de control de prendas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRegistros();
  }, [fetchRegistros]);

  const filteredRegistros = useMemo(() => {
    const q = search.toLowerCase();
    return registros.filter(r =>
      (filtroEtapa === 'Todos' || r.etapa === filtroEtapa) &&
      (filtroEstado === 'Todos' || r.estado === filtroEstado) &&
      (r.id.toLowerCase().includes(q) ||
       (r.produccionNumero ?? '').toLowerCase().includes(q) ||
       (r.produccionCliente ?? '').toLowerCase().includes(q) ||
       r.etapa.toLowerCase().includes(q))
    );
  }, [search, filtroEtapa, filtroEstado, registros]);

  const getEtapaIcon = (etapa: string) => {
    return etapa === 'Control de Calidad' ? <ClipboardCheck size={14} /> : <Layers size={14} />;
  };

  const stats = {
    enProceso: registros.filter(r => r.estado === 'Proceso').length,
    aprobados: registros.filter(r => r.estado === 'Aprobado').length,
    rechazados: registros.filter(r => r.estado === 'Rechazado').length,
    total: registros.length,
  };

  const handleReview = async (r: ControlPrenda) => {
    setReviewingId(r.id);
    setReviewEstado('Aprobado');
    setReviewAprobada(String(r.cantidadTotal));
    setReviewRechazada('0');
    setModalOpen(true);
  };

  const submitReview = async () => {
    if (!reviewingId) return;
    const aprobada = Number(reviewAprobada) || 0;
    const rechazada = Number(reviewRechazada) || 0;
    if (aprobada + rechazada <= 0) {
      toast.error('Ingresá al menos una cantidad aprobada o rechazada');
      return;
    }
    if (aprobada + rechazada > (registros.find(r => r.id === reviewingId)?.cantidadTotal ?? 0)) {
      toast.error('La suma aprobada + rechazada no puede superar la cantidad total');
      return;
    }
    try {
      const actualizado = await controlPrendaApi.review(reviewingId, reviewEstado, aprobada, rechazada);
      setRegistros(prev => prev.map(reg => reg.id === reviewingId ? actualizado : reg));
      toast.success('Control actualizado');
      setModalOpen(false);
      setReviewingId(null);
    } catch {
      toast.error('No fue posible actualizar el control');
    }
  };

  const handleEdit = (r: ControlPrenda) => {
    setEditingId(r.id);
    setProduccionId(r.produccionId);
    setEtapa(r.etapa);
    setCantidadTotal(String(r.cantidadTotal));
    setObservaciones(r.observaciones ?? '');
    setModalOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const actualizado = await controlPrendaApi.update(editingId, {
        etapa,
        cantidadTotal: Number(cantidadTotal),
        observaciones: observaciones.trim() || undefined,
      });
      setRegistros(prev => prev.map(reg => reg.id === editingId ? actualizado : reg));
      toast.success('Control actualizado');
      setModalOpen(false);
      setEditingId(null);
    } catch {
      toast.error('No se pudo actualizar el control');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSaving(true);
      await controlPrendaApi.remove(deleteId);
      setRegistros(prev => prev.filter(reg => reg.id !== deleteId));
      toast.success('Control eliminado');
      setDeleteId(null);
    } catch {
      toast.error('No se pudo eliminar el control');
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!produccionId) {
      toast.error('Seleccioná una orden de producción');
      return;
    }
    setSaving(true);
    try {
      const creado = await controlPrendaApi.create({
        produccionId,
        etapa,
        cantidadTotal: Number(cantidadTotal),
        observaciones: observaciones.trim() || undefined,
      });
      setRegistros(prev => [creado, ...prev]);
      setModalOpen(false);
      setProduccionId('');
      setEtapa('Control de Calidad');
      setCantidadTotal('');
      setObservaciones('');
      toast.success('Control de prenda creado');
    } catch {
      toast.error('No se pudo crear el control');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Control de Prendas</h1>
          <p className={s.pageSubtitle}>Control de calidad de producción</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Nuevo control
        </Button>
        <div className={s.metricsRow}>
          <div className={`${s.metricCard} ${s.metricCardWarning}`}>
            <span className={`${s.metricIcon} ${s.metricIconPending}`}>
              <Layers size={22} />
            </span>
            <div className={s.metricBody}>
              <span className={s.metricValue}>{stats.enProceso}</span>
              <span className={s.metricLabel}>En Proceso</span>
            </div>
          </div>
          <div className={`${s.metricCard} ${s.metricCardSuccess}`}>
            <span className={`${s.metricIcon} ${s.metricIconDone}`}>
              <CheckCircle size={22} />
            </span>
            <div className={s.metricBody}>
              <span className={s.metricValue}>{stats.aprobados}</span>
              <span className={s.metricLabel}>Aprobados</span>
            </div>
          </div>
          <div className={`${s.metricCard} ${s.metricCardPrimary}`}>
            <span className={`${s.metricIcon} ${s.metricIconWarning}`}>
              <XCircle size={22} />
            </span>
            <div className={s.metricBody}>
              <span className={s.metricValue}>{stats.rechazados}</span>
              <span className={s.metricLabel}>Rechazados</span>
            </div>
          </div>
          <div className={`${s.metricCard} ${s.metricCardSuccess}`}>
            <span className={`${s.metricIcon} ${s.metricIconReceived}`}>
              <ClipboardCheck size={22} />
            </span>
            <div className={s.metricBody}>
              <span className={s.metricValue}>{stats.total}</span>
              <span className={s.metricLabel}>Total</span>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={s.errorBox}>
          <span>{error}</span>
          <Button className={s.retryBtn} onClick={() => void fetchRegistros()}>Reintentar</Button>
        </div>
      )}

      <div className={s.filters}>
        <div className={s.filterGroup}>
          {(['Todos', ...ETAPAS] as const).map(etapa => (
            <button
              key={etapa}
              className={`${s.filterBtn} ${filtroEtapa === etapa ? s.filterBtnActive : ''}`}
              onClick={() => setFiltroEtapa(etapa as typeof filtroEtapa)}
            >
              {etapa !== 'Todos' && getEtapaIcon(etapa)}
              <span className={s.filterBtnText}>{etapa}</span>
            </button>
          ))}
        </div>
        <div className={s.filterGroup}>
          {(['Todos', ...ESTADOS] as const).map(estado => (
            <button
              key={estado}
              className={`${s.filterBtn} ${filtroEstado === estado ? s.filterBtnActive : ''}`}
              onClick={() => setFiltroEstado(estado as typeof filtroEstado)}
            >
              {estado}
            </button>
          ))}
        </div>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por ID, orden, cliente o etapa..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>
      </div>

      <DataTable<ControlPrenda>
        data={filteredRegistros}
        pageSize={10}
        emptyMessage={loading ? 'Cargando registros...' : error ? error : 'No se encontraron registros de control de prendas'}
        enableSorting
        enableColumnFilters
        enableRowSelection
        enableExport
        exportFileName="control_prendas"
        actions={(r) => [
          ...(r.estado === 'Proceso' ? [
            { label: 'Revisar', icon: <ClipboardCheck size={14} />, onClick: () => handleReview(r) },
          ] : []),
          { label: 'Editar', icon: <Edit size={14} />, onClick: () => handleEdit(r) },
          { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteId(r.id) },
        ]}
        toolbarLeft={
          <div className={s.quickStats}>
            <div className={s.quickStatCard}>
              <span className={`${s.quickStatIcon} ${s.quickStatIconPending}`}>
                <Layers size={14} />
              </span>
              <span className={s.quickStatNumber}>{stats.enProceso}</span>
              <span className={s.quickStatLabel}>En proceso</span>
            </div>
            <div className={s.quickStatCard}>
              <span className={`${s.quickStatIcon} ${s.quickStatIconReceived}`}>
                <CheckCircle size={14} />
              </span>
              <span className={s.quickStatNumber}>{stats.aprobados}</span>
              <span className={s.quickStatLabel}>Aprobados</span>
            </div>
            <div className={`${s.quickStatCard} ${s.quickStatWarning}`}>
              <span className={`${s.quickStatIcon} ${s.quickStatIconAlert}`}>
                <XCircle size={14} />
              </span>
              <span className={s.quickStatNumber}>{stats.rechazados}</span>
              <span className={s.quickStatLabel}>Rechazados</span>
            </div>
          </div>
        }
        columns={[
          { key: 'orden', header: 'Producción', width: '200px', sortable: true, filterable: true, filterPlaceholder: 'Filtrar orden...', render: (r) => (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[var(--color-text-primary)]">{r.produccionNumero ?? r.produccionId}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{r.produccionCliente ?? '—'}</span>
            </div>
          )},
          { key: 'etapa', header: 'Etapa', width: '200px', sortable: true, filterable: true, filterType: 'select', filterOptions: ETAPAS.map(e => ({ value: e, label: e })), render: (r) => (
            <div className="flex items-center gap-1.5">
              {getEtapaIcon(r.etapa)}
              <span className="text-[var(--color-text-primary)]">{r.etapa}</span>
            </div>
          )},
          { key: 'cantidades', header: 'Cantidades', width: '240px', sortable: false, render: (r) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-[var(--color-text-primary)]">Total: {r.cantidadTotal} · Revisadas: {r.cantidadRevisada}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">Aprobadas: {r.cantidadAprobada} · Rechazadas: {r.cantidadRechazada}</span>
            </div>
          )},
          { key: 'estado', header: 'Estado', width: '120px', sortable: true, filterable: true, filterType: 'select', filterOptions: ESTADOS.map(e => ({ value: e, label: e })), render: (r) => <StatusBadge status={r.estado} /> },
        ]}
        detailPanel={{
          title: (r) => `Detalle de Control - ${r.id}`,
          render: (r, onClose) => (
            <div className={s.registroInfo}>
              <div className={s.infoRow}><span className={s.infoLabel}>ID:</span><span className={s.infoValue}>{r.id}</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Producción:</span><span className={s.infoValue}>{r.produccionNumero ?? r.produccionId}</span></div>
              {r.produccionCliente && <div className={s.infoRow}><span className={s.infoLabel}>Cliente:</span><span className={s.infoValue}>{r.produccionCliente}</span></div>}
              <div className={s.infoRow}><span className={s.infoLabel}>Etapa:</span><StatusBadge status={r.etapa} /></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Estado:</span><StatusBadge status={r.estado} /></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Cantidad total:</span><span className={s.infoValue}>{r.cantidadTotal} unidades</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Revisadas:</span><span className={s.infoValue}>{r.cantidadRevisada}</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Aprobadas:</span><span className={s.infoValue}>{r.cantidadAprobada}</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Rechazadas:</span><span className={s.infoValue}>{r.cantidadRechazada}</span></div>
              {r.revisadoPor && <div className={s.infoRow}><span className={s.infoLabel}>Revisado por:</span><span className={s.infoValue}>{r.revisadoPor.nombre}</span></div>}
              <div className={s.infoRow}><span className={s.infoLabel}>Creado por:</span><span className={s.infoValue}>{r.creadoPor.nombre}</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Creado:</span><span className={s.infoValue}>{new Date(r.createdAt).toLocaleString()}</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Actualizado:</span><span className={s.infoValue}>{new Date(r.updatedAt).toLocaleString()}</span></div>
              {r.observaciones && <div className={s.infoRowFull}><span className={s.infoLabel}>Observaciones:</span><span className={s.infoValue}>{r.observaciones}</span></div>}
              <ModalFooter
                actions={[{ label: 'Revisar', variant: 'primary', onClick: () => { handleReview(r); onClose(); } }, { label: 'Cerrar', variant: 'secondary', onClick: onClose }]}
              />
            </div>
          ),
        }}
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setReviewingId(null); }}
        title={reviewingId ? 'Revisar control de prenda' : 'Nuevo control de prenda'}
        description={reviewingId ? 'Registrá la revisión parcial o total del control.' : 'Registra un nuevo control de prenda para producción.'}
        size="md"
        variant="form"
        closeOnOverlay
      >
        {reviewingId ? (
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Revisión</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Cantidad aprobada</label>
                <input type="number" className={f.input} value={reviewAprobada} onChange={e => setReviewAprobada(e.target.value)} min={0} />
              </div>
              <div className={f.field}>
                <label className={f.label}>Cantidad rechazada</label>
                <input type="number" className={f.input} value={reviewRechazada} onChange={e => setReviewRechazada(e.target.value)} min={0} />
              </div>
            </div>
            <ModalFooter
              secondary={{ label: 'Cancelar', onClick: () => { setModalOpen(false); setReviewingId(null); } }}
              primary={{ label: 'Confirmar revisión', onClick: submitReview, variant: 'success' }}
            />
          </div>
        ) : (
          <form className={f.form} onSubmit={editingId ? handleUpdate : handleCreate}>
            <div className={f.formSection}>
              <h3 className={f.sectionTitle}>Control de prenda</h3>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={s.label}>Orden de producción</label>
                  <select
                    className={f.select}
                    value={produccionId}
                    onChange={e => setProduccionId(e.target.value)}
                    required
                    disabled={!!editingId}
                  >
                    <option value="">Seleccioná una orden...</option>
                    {ordenesProduccion.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.numero ? `${o.numero} - ${o.cliente ?? ''}` : o.id}
                      </option>
                    ))}
                  </select>
                  {!editingId && ordenesProduccion.length === 0 && (
                    <span className={s.fieldError}>No hay órdenes de producción disponibles</span>
                  )}
                </div>
                <div className={f.field}>
                  <label className={f.label}>Etapa</label>
                  <select
                    className={f.select}
                    value={etapa}
                    onChange={e => setEtapa(e.target.value as Etapa)}
                  >
                    {ETAPAS.map(e => (
                      <option key={e} value={e}>{e}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={f.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Cantidad total</label>
                  <input
                    type="number"
                    className={f.input}
                    value={cantidadTotal}
                    onChange={e => setCantidadTotal(e.target.value)}
                    placeholder="Ej: 50"
                    required
                    min="1"
                  />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Observaciones</label>
                  <input
                    type="text"
                    className={f.input}
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
              </div>
            </div>
            <ModalFooter
              actions={[{ label: editingId ? (saving ? 'Guardando...' : 'Guardar cambios') : (saving ? 'Guardando...' : 'Crear control') , type: 'submit', disabled: saving }]}
            />
          </form>
        )}
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar control"
        description="Esta acción no se puede deshacer."
        size="sm"
      >
        <ModalFooter
          actions={[{ label: 'Cancelar', variant: 'secondary', onClick: () => setDeleteId(null), disabled: saving }, { label: saving ? 'Eliminando...' : 'Eliminar' , variant: 'danger', onClick: handleDelete, disabled: saving }]} />

      </Modal>
    </div>
  );
};
