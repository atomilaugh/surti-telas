import React, { useState, useMemo, useEffect } from 'react';
import { Search, Clock, Factory, TrendingUp, Edit, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import s from './SeguimientoProduccion.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { productionApi } from '@/infrastructure/api/productionApi';
import { useProductionOrders } from '@/shared/hooks/useProductionOrders';
import { useLocation } from 'react-router-dom';
import { ESTADOS_PRODUCCION, PRIORIDADES } from '@/shared/constants/options';

const getAvanceColor = (producido: number, total: number): string => {
  const pct = (producido / total) * 100;
  if (pct >= 100) return '#22c55e';
  if (pct >= 75) return '#C4A574';
  if (pct >= 50) return '#f59e0b';
  return '#ef4444';
};

const _getEstadoBadge = (estado: string): 'default' | 'primary' | 'warning' | 'success' | 'danger' => {
  if (estado === 'Pendiente') return 'default';
  if (estado === 'Asignada') return 'primary';
  if (estado === 'En produccion') return 'warning';
  if (estado === 'Completada') return 'success';
  return 'default';
};

const _getDiasRestantes = (fecha: string): number => {
  const today = new Date();
  const target = new Date(fecha);
  const diff = target.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

interface OrdenProduccion {
  id: string;
  numeroOrden: string;
  prenda: string;
  referencia: string;
  cantidad: number;
  cantidadProducida: number;
  fechaInicio: string;
  fechaPrometida: string;
  estado: 'Pendiente' | 'Asignada' | 'En produccion' | 'Completada';
  tallerAsignado?: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  cliente: string;
  observaciones: string;
  avance: number;
  tela?: string;
  colores?: string[];
  curvaTallas?: Record<string, number>;
  operarioId?: string;
}

export const AdminSeguimientoProduccion: React.FC = () => {
  const { orders: rawOrders, loading, error, refetch } = useProductionOrders();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('');
  const [filtroTaller, setFiltroTaller] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenProduccion | null>(null);
  const [nuevoAvance, setNuevoAvance] = useState('');
  const [saving, setSaving] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editReferencia, setEditReferencia] = useState('');
  const [editCantidad, setEditCantidad] = useState('');
  const [editFecha, setEditFecha] = useState('');
  const [editNotas, setEditNotas] = useState('');
  const [editTela, setEditTela] = useState('');
  const [editColores, setEditColores] = useState('');
  const [editCurvaTallas, setEditCurvaTallas] = useState('');
  const [editOperarioId, setEditOperarioId] = useState('');
  const [editFechaInicio, setEditFechaInicio] = useState('');

  const ordenes = useMemo(() => rawOrders.map((o) => ({
    id: o.id,
    numeroOrden: o.pedidoNumero || o.referencia,
    prenda: o.pedidoItemNombre || o.referencia,
    referencia: o.referencia,
    cantidad: o.cantidad,
    cantidadProducida: Math.round((o.avance / 100) * o.cantidad),
    fechaInicio: o.fechaInicio,
    fechaPrometida: o.fechaEstimada,
    estado: o.estado,
    tallerAsignado: o.taller?.nombre,
    prioridad: (o.pedidoPrioridad === 'ALTA' ? 'Alta' : o.pedidoPrioridad === 'MEDIA' ? 'Media' : o.pedidoPrioridad === 'BAJA' ? 'Baja' : 'Media') as OrdenProduccion['prioridad'],
    cliente: o.pedidoCliente ?? '',
    observaciones: o.notasTecnicas || '',
    avance: o.avance,
    tela: o.tela,
    colores: o.colores,
    curvaTallas: o.curvaTallas,
    operarioId: o.operarioId,
  })), [rawOrders]);

  const location = useLocation();
  useEffect(() => {
    void refetch();
  }, [location.pathname, refetch]);

  const filteredOrdenes = useMemo(() => {
    return ordenes.filter(o =>
      (filtroEstado === '' || o.estado === filtroEstado) &&
      (filtroPrioridad === '' || o.prioridad === filtroPrioridad) &&
      (filtroTaller === '' || o.tallerAsignado === filtroTaller) &&
      (o.numeroOrden.toLowerCase().includes(search.toLowerCase()) ||
       o.prenda.toLowerCase().includes(search.toLowerCase()) ||
       o.referencia.toLowerCase().includes(search.toLowerCase()) ||
       o.cliente.toLowerCase().includes(search.toLowerCase()))
    );
  }, [ordenes, search, filtroEstado, filtroPrioridad, filtroTaller]);

  const abrirModal = (orden: OrdenProduccion) => {
    setSelectedOrden(orden);
    setNuevoAvance(String(orden.cantidadProducida));
    setModalOpen(true);
  };

  const openEditModal = (orden: OrdenProduccion) => {
    setEditingId(orden.id);
    setEditReferencia(orden.referencia);
    setEditCantidad(String(orden.cantidad));
    setEditFecha(orden.fechaPrometida);
    setEditNotas(orden.observaciones);
    setEditTela(orden.tela || '');
    setEditColores((orden.colores || []).join(', '));
    setEditCurvaTallas(orden.curvaTallas ? JSON.stringify(orden.curvaTallas) : '');
    setEditOperarioId(orden.operarioId || '');
    setEditFechaInicio(orden.fechaInicio || '');
    setEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      await productionApi.update(editingId, {
        referencia: editReferencia,
        cantidad: Number(editCantidad),
        fechaEstimada: editFecha,
        fechaInicio: editFechaInicio || undefined,
        notasTecnicas: editNotas || undefined,
        tela: editTela || undefined,
        colores: editColores ? editColores.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
        curvaTallas: editCurvaTallas ? JSON.parse(editCurvaTallas) : undefined,
        operarioId: editOperarioId || undefined,
      });
      await refetch();
      toast.success('Orden actualizada');
      setEditModalOpen(false);
      setEditingId(null);
    } catch {
      toast.error('No se pudo actualizar la orden');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSaving(true);
      await productionApi.remove(deleteId);
      await refetch();
      toast.success('Orden eliminada');
      setDeleteId(null);
    } catch {
      toast.error('No se pudo eliminar la orden');
    } finally {
      setSaving(false);
    }
  };

  const handleActualizarAvance = async () => {
    if (!selectedOrden || nuevoAvance === '') return;
    if (selectedOrden.estado === 'Completada') {
      toast.error('La orden ya está completada');
      return;
    }
    try {
      setSaving(true);
      const producidas = Number(nuevoAvance);
      if (producidas > selectedOrden.cantidad) {
        toast.error('La cantidad producida no puede superar la cantidad total');
        return;
      }
      const avance = Math.round((producidas / selectedOrden.cantidad) * 100);
      await productionApi.updateProgress(selectedOrden.id, avance);
      await refetch();
      toast.success(`Avance actualizado para ${selectedOrden.numeroOrden}`);
      setModalOpen(false);
      setSelectedOrden(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error actualizando avance');
    } finally {
      setSaving(false);
    }
  };

  const handleCompletarOrden = async (orden: OrdenProduccion) => {
    if (orden.estado === 'Completada') {
      toast.error('La orden ya está completada');
      return;
    }
    try {
      setSaving(true);
      await productionApi.complete(orden.id);
      await refetch();
      toast.success(`Orden ${orden.numeroOrden} marcada como entregada`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error completando orden');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    pendientes: ordenes.filter(o => o.estado === 'Pendiente').length,
    asignadas: ordenes.filter(o => o.estado === 'Asignada').length,
    enProduccion: ordenes.filter(o => o.estado === 'En produccion').length,
    completadas: ordenes.filter(o => o.estado === 'Completada').length,
    retrasadas: ordenes.filter(o => {
      if (o.estado === 'Completada' || o.estado === 'Pendiente') return false;
      return _getDiasRestantes(o.fechaPrometida) < 0;
    }).length,
  };

  if (loading) {
    return <div className={s.header}><p>Cargando seguimiento de producción...</p></div>;
  }

  if (error) {
    return <div className={s.header}><p className="text-red-500">{error}</p></div>;
  }

  return (
    <div className={s.pageRoot}>
      <div className={s.header}>
        <div className={s.headerText}>
          <h1 className={s.pageTitle}>Seguimiento de Producción</h1>
          <p className={s.pageSubtitle}>Tracking de producción externa</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="primary" onClick={() => {}}>Actualizar</Button>
        </div>
      </div>

      <div className={s.statsSection}>
        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Operación</div>
          <div className={s.statsRow}>
            <div className={s.statCard}>
              <Clock size={20} className={s.statIcon} />
              <div>
                <div className={s.statValue}>{stats.pendientes}</div>
                <div className={s.statLabel}>Pendientes</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardInfo}`}>
              <Factory size={20} className={s.statIconInfo} />
              <div>
                <div className={s.statValue}>{stats.asignadas}</div>
                <div className={s.statLabel}>Asignadas</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardWarning}`}>
              <TrendingUp size={20} className={s.statIconWarning} />
              <div>
                <div className={s.statValue}>{stats.enProduccion}</div>
                <div className={s.statLabel}>En Producción</div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.statsGroup}>
          <div className={s.statsGroupTitle}>Seguimiento</div>
          <div className={s.statsRow}>
            <div className={`${s.statCard} ${s.statCardSuccess}`}>
              <div className={s.statIconDone}>✓</div>
              <div>
                <div className={s.statValue}>{stats.completadas}</div>
                <div className={s.statLabel}>Completadas</div>
              </div>
            </div>
            <div className={`${s.statCard} ${s.statCardDanger}`}>
              <Clock size={20} className={s.statIconDanger} />
              <div>
                <div className={s.statValue}>{stats.retrasadas}</div>
                <div className={s.statLabel}>Retrasadas</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.toolbar}>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="Buscar por orden, prenda, referencia o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>

        <select
          className={s.toolbarSelect}
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {ESTADOS_PRODUCCION.map((e) => (
            <option key={e} value={e}>{e === 'En produccion' ? 'En producción' : e}</option>
          ))}
        </select>

        <select
          className={s.toolbarSelect}
          value={filtroPrioridad}
          onChange={(e) => setFiltroPrioridad(e.target.value)}
        >
          <option value="">Todas las prioridades</option>
          {PRIORIDADES.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <select
          className={s.toolbarSelect}
          value={filtroTaller}
          onChange={(e) => setFiltroTaller(e.target.value)}
        >
          <option value="">Todos los talleres</option>
          {[...new Set(ordenes.map(o => o.tallerAsignado).filter((v): v is string => Boolean(v)))].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <Button size="sm" variant="ghost" onClick={() => { setFiltroEstado(''); setFiltroPrioridad(''); setFiltroTaller(''); setSearch(''); }}>
          Limpiar filtros
        </Button>
      </div>

      <div className={s.tableCard}>
        {loading && (
          <div className={s.loadingRow}>Cargando seguimiento de producción...</div>
        )}
        {!loading && (
          <div className={s.tableScroll}>
            <DataTable<OrdenProduccion>
              data={filteredOrdenes}
              pageSize={10}
              emptyMessage="Sin resultados"
              enableSorting
              enableColumnFilters
              enableRowSelection
              enableExport
              exportFileName="seguimiento_produccion"
              actions={(o) => [
                ...(o.estado === 'En produccion' ? [{ label: 'Actualizar avance', icon: <Clock size={14} />, onClick: () => abrirModal(o) }] : []),
                ...(o.estado === 'Asignada' ? [{ label: 'Iniciar producción', icon: <Factory size={14} />, onClick: () => abrirModal(o) }] : []),
                { label: 'Editar', icon: <Edit size={14} />, onClick: () => openEditModal(o) },
                { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteId(o.id) },
              ]}
              columns={[
                { key: 'orden', header: 'Orden', width: '140px', sortable: true, render: (o) => (
                  <span className={s.tdMono}>{o.numeroOrden}</span>
                )},
                { key: 'producto', header: 'Producto', sortable: true, render: (o) => (
                  <div className="flex flex-col gap-0.5">
                    <span className={s.tdPrimary}>{o.prenda}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{o.cantidadProducida}/{o.cantidad} unds</span>
                  </div>
                )},
                { key: 'clienteTaller', header: 'Cliente / Taller', sortable: true, render: (o) => (
                  <div className="flex flex-col gap-0.5">
                    <span className={s.tdPrimary}>{o.cliente}</span>
                    <span className="text-xs text-[var(--color-text-secondary)]">{o.tallerAsignado || '—'}</span>
                  </div>
                )},
                { key: 'avance', header: 'Avance', width: '160px', sortable: true, render: (o) => {
                  const porcentaje = Math.round((o.cantidadProducida / o.cantidad) * 100);
                  return (
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-text-secondary)]">{porcentaje}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--color-bg-elevated)]">
                        <div className="h-full rounded-full" style={{ width: `${porcentaje}%`, background: getAvanceColor(o.cantidadProducida, o.cantidad) }} />
                      </div>
                    </div>
                  );
                }},
                { key: 'estado', header: 'Estado', width: '170px', sortable: true, render: (o) => <StatusBadge status={o.estado} /> },
              ]}
              detailPanel={{
                title: (o) => `Seguimiento - ${o.numeroOrden}`,
                render: (o, onClose) => (
                  <div className={s.detailModalContent}>
                    <div className={s.detailHero}>
                      <div className={s.detailHeroMain}>
                        <div className={s.detailHeroTitle}>{o.numeroOrden}</div>
                        <div className={s.detailHeroSubtitle}>{o.referencia}</div>
                      </div>
                      <div className={s.detailHeroMeta}>
                        <span className={s.detailBadge} data-variant={_getEstadoBadge(o.estado)}>{o.estado}</span>
                      </div>
                    </div>

                    <div className={s.detailSection}>
                      <div className={s.detailSectionTitle}>Información general</div>
                      <div className={s.detailTable}>
                        <div className={s.detailRow}>
                          <span className={s.detailLabel}>Cliente</span>
                          <span className={s.detailValue}>{o.cliente}</span>
                        </div>
                        <div className={s.detailRow}>
                          <span className={s.detailLabel}>Taller</span>
                          <span className={s.detailValue}>{o.tallerAsignado || '—'}</span>
                        </div>
                        <div className={s.detailRow}>
                          <span className={s.detailLabel}>Prenda</span>
                          <span className={s.detailValue}>{o.prenda}</span>
                        </div>
                        <div className={s.detailRow}>
                          <span className={s.detailLabel}>Cantidad</span>
                          <span className={s.detailValue}>{o.cantidadProducida}/{o.cantidad}</span>
                        </div>
                      </div>
                    </div>

                    <div className={s.detailSection}>
                      <div className={s.detailSectionTitle}>Fechas</div>
                      <div className={s.detailTable}>
                        <div className={s.detailRow}>
                          <span className={s.detailLabel}>Inicio</span>
                          <span className={s.detailValue}>{o.fechaInicio}</span>
                        </div>
                        <div className={s.detailRow}>
                          <span className={s.detailLabel}>Límite</span>
                          <span className={`${s.detailValue} ${_getDiasRestantes(o.fechaPrometida) < 0 && (o.estado !== 'Completada' && o.estado !== 'Pendiente') ? s.detailValueWarning : ''}`}>{o.fechaPrometida}</span>
                        </div>
                      </div>
                    </div>

                    <div className={s.avanceSection}>
                      <label className={s.label}>Unidades Producidas</label>
                      <div className={s.avanceInputRow}>
                        <input type="number" className={s.avanceInput} value={nuevoAvance} onChange={e => setNuevoAvance(e.target.value)} min={0} max={o.cantidad} />
                        <span className={s.avanceTotal}>/ {o.cantidad} unidades</span>
                      </div>
                      <div className={s.avancePreview}>
                        <div className={s.avanceBarLarge}>
                          <div className={s.avanceFillLarge} style={{ width: `${Math.min(((Number(nuevoAvance) || 0) / o.cantidad) * 100, 100)}%`, background: getAvanceColor(Number(nuevoAvance) || 0, o.cantidad) }} />
                        </div>
                        <span className={s.avancePorcentaje}>{Math.round(((Number(nuevoAvance) || 0) / o.cantidad) * 100)}%</span>
                      </div>
                    </div>

                    <ModalFooter
                      actions={[{ label: 'Cerrar', variant: 'secondary', onClick: onClose }, { label: saving ? 'Guardando...' : 'Actualizar avance' , onClick: handleActualizarAvance, disabled: saving }, { label: 'Marcar como entregada', variant: 'success', onClick: () => o && handleCompletarOrden(o) }]}
                    />
                  </div>
                ),
              }}
            />
          </div>
        )}
      </div>

      {modalOpen && selectedOrden && (
        <div className={s.modalOverlay} onClick={() => setModalOpen(false)}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Clock size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Actualizar Avance</div>
                  <div className={s.detailHeaderSubtitle}>
                    Pedido #{selectedOrden.numeroOrden || selectedOrden.id}
                  </div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                {!saving && (
                  <button type="button" className={s.detailClose} onClick={() => setModalOpen(false)}>
                    <Search size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className={s.detailContent}>
              <div className={s.detailSection}>
                <div className={s.detailSectionTitle}>Información de la orden</div>
                <div className={s.detailSummaryGrid}>
                  <div className={s.detailSummaryItem}>
                    <div className={s.detailLabel}>Prenda</div>
                    <div className={s.detailValue}>{selectedOrden.prenda}</div>
                  </div>
                  <div className={s.detailSummaryItem}>
                    <div className={s.detailLabel}>Cliente</div>
                    <div className={s.detailValue}>{selectedOrden.cliente}</div>
                  </div>
                  <div className={s.detailSummaryItem}>
                    <div className={s.detailLabel}>Taller</div>
                    <div className={s.detailValue}>{selectedOrden.tallerAsignado || '—'}</div>
                  </div>
                </div>
              </div>

              <div className={s.avanceSection}>
                <label className={s.label}>Unidades Producidas</label>
                <div className={s.avanceInputRow}>
                  <input type="number" className={s.avanceInput} value={nuevoAvance} onChange={e => setNuevoAvance(e.target.value)} min={0} max={selectedOrden.cantidad} />
                  <span className={s.avanceTotal}>/ {selectedOrden.cantidad} unidades</span>
                </div>
                <div className={s.avancePreview}>
                  <div className={s.avanceBarLarge}>
                    <div className={s.avanceFillLarge} style={{ width: `${Math.min(((Number(nuevoAvance) || 0) / selectedOrden.cantidad) * 100, 100)}%`, background: getAvanceColor(Number(nuevoAvance) || 0, selectedOrden.cantidad) }} />
                  </div>
                  <span className={s.avancePorcentaje}>{Math.round(((Number(nuevoAvance) || 0) / selectedOrden.cantidad) * 100)}%</span>
                </div>
              </div>
            </div>

            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button variant="primary" onClick={handleActualizarAvance} disabled={saving}>
                {saving ? 'Guardando...' : 'Actualizar avance'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editModalOpen && (
        <div className={s.modalOverlay} onClick={() => { setEditModalOpen(false); setEditingId(null); }}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Edit size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Editar orden de producción</div>
                  <div className={s.detailHeaderSubtitle}>Modifica los datos de la orden.</div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                {!saving && (
                  <button type="button" className={s.detailClose} onClick={() => { setEditModalOpen(false); setEditingId(null); }}>
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className={s.detailContent}>
              <form id="editOrdenForm" className={f.form} onSubmit={handleEditSubmit}>
                <div className={f.formSection}>
                  <h3 className={f.sectionTitle}>Datos de la orden</h3>
                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Referencia</label>
                      <input
                        type="text"
                        className={f.input}
                        value={editReferencia}
                        onChange={e => setEditReferencia(e.target.value)}
                        required
                      />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Cantidad</label>
                      <input
                        type="number"
                        className={f.input}
                        value={editCantidad}
                        onChange={e => setEditCantidad(e.target.value)}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Fecha límite</label>
                      <input
                        type="date"
                        className={f.input}
                        value={editFecha}
                        onChange={e => setEditFecha(e.target.value)}
                        required
                      />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Observaciones</label>
                      <input
                        type="text"
                        className={f.input}
                        value={editNotas}
                        onChange={e => setEditNotas(e.target.value)}
                        placeholder="Opcional"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => { setEditModalOpen(false); setEditingId(null); }}>Cancelar</Button>
              <Button type="submit" form="editOrdenForm" loading={saving}>Guardar cambios</Button>
            </div>
          </div>
        </div>
      )}

      {deleteId && (
        <div className={s.modalOverlay} onClick={() => !saving && setDeleteId(null)}>
          <div className={s.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.detailHeader}>
              <div className={s.detailHeaderLeft}>
                <Trash2 size={18} className={s.detailHeaderIcon} />
                <div>
                  <div className={s.detailHeaderTitle}>Eliminar orden</div>
                  <div className={s.detailHeaderSubtitle}>Esta acción no se puede deshacer.</div>
                </div>
              </div>
              <div className={s.detailHeaderRight}>
                {!saving && (
                  <button type="button" className={s.detailClose} onClick={() => setDeleteId(null)}>
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>

            <div className={s.detailContent}>
              <p className="text-sm text-[var(--color-text-secondary)]">
                ¿Seguro que deseas eliminar la orden <strong>{deleteId}</strong>? Esta acción no se puede deshacer.
              </p>
            </div>

            <div className={s.detailFooter}>
              <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={saving}>Cancelar</Button>
              <Button variant="danger" onClick={handleDelete} disabled={saving}>
                {saving ? 'Eliminando...' : 'Eliminar'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
