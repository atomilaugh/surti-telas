import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Factory, Clock, AlertTriangle, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import s from './AsignacionProduccion.module.css';
import f from '@/styles/Form.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { productionApi } from '@/infrastructure/api/productionApi';
import { workshopsApi } from '@/infrastructure/api/workshopsApi';
import { ESTADOS_PRODUCCION } from '@/shared/constants/options';

interface OrdenProduccion {
  id: string;
  numeroOrden: string;
  prenda: string;
  referencia: string;
  cantidad: number;
  fechaPrometida: string;
  estado: 'Pendiente' | 'Asignada' | 'En produccion' | 'Completada';
  tallerAsignado?: string;
  prioridad: 'Alta' | 'Media' | 'Baja';
  cliente: string;
}

interface Taller {
  id: string;
  nombre: string;
  capacidadDisponible: number;
  especialidad: string;
}

export const AdminAsignacionProduccion: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | (typeof ESTADOS_PRODUCCION)[number]>('Todos');
  const [ordenes, setOrdenes] = useState<OrdenProduccion[]>([]);
  const [talleres, setTalleres] = useState<Taller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedOrden, setSelectedOrden] = useState<OrdenProduccion | null>(null);
  const [tallerSeleccionado, setTallerSeleccionado] = useState('');
  const [saving, setSaving] = useState(false);
  const [crudModalOpen, setCrudModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [formReferencia, setFormReferencia] = useState('');
  const [formCantidad, setFormCantidad] = useState('');
  const [formFecha, setFormFecha] = useState('');
  const [formEstado, setFormEstado] = useState<'Pendiente' | 'Asignada' | 'En produccion' | 'Completada'>('Pendiente');
  const [formNotas, setFormNotas] = useState('');
  const [formTela, setFormTela] = useState('');
  const [formColores, setFormColores] = useState('');
  const [formCurvaTallas, setFormCurvaTallas] = useState('');
  const [formFechaInicio, setFormFechaInicio] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const [orders, workshops] = await Promise.all([
          productionApi.list(),
          workshopsApi.list(),
        ]);
        const mappedOrders: OrdenProduccion[] = orders.map((o) => ({
          id: o.id,
          numeroOrden: o.pedidoNumero || o.referencia,
          prenda: o.pedidoItemNombre || o.referencia,
          referencia: o.referencia,
          cantidad: o.cantidad,
          fechaPrometida: o.fechaEstimada,
          estado: o.estado === 'En produccion' ? 'En produccion' : o.estado === 'Completada' ? 'Completada' : o.estado === 'Pendiente' ? 'Pendiente' : 'Asignada',
          tallerAsignado: o.taller?.nombre,
          prioridad: (o.pedidoPrioridad === 'ALTA' ? 'Alta' : o.pedidoPrioridad === 'MEDIA' ? 'Media' : o.pedidoPrioridad === 'BAJA' ? 'Baja' : 'Media') as OrdenProduccion['prioridad'],
          cliente: o.pedidoCliente ?? '',
        }));
        const mappedWorkshops: Taller[] = workshops.map((w) => ({
          id: w.id,
          nombre: w.nombre,
          capacidadDisponible: Math.max((w.capacidad || 0) - (w.ocupacion || 0), 0),
          especialidad: w.ciudad || 'General',
        }));
        setOrdenes(mappedOrders);
        setTalleres(mappedWorkshops);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error cargando datos');
        toast.error('Error cargando datos de producción');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filteredOrdenes = useMemo(() => {
    return ordenes.filter(o =>
      (filtroEstado === 'Todos' || o.estado === filtroEstado) &&
      (o.numeroOrden.toLowerCase().includes(search.toLowerCase()) ||
       o.prenda.toLowerCase().includes(search.toLowerCase()) ||
       o.referencia.toLowerCase().includes(search.toLowerCase()) ||
       o.cliente.toLowerCase().includes(search.toLowerCase()))
    );
  }, [ordenes, search, filtroEstado]);

  const handleOpenModal = (orden: OrdenProduccion) => {
    setSelectedOrden(orden);
    setTallerSeleccionado(orden.tallerAsignado || '');
    setModalOpen(true);
  };

  const handleAsignarTaller = async () => {
    if (!selectedOrden || !tallerSeleccionado) return;
    try {
      setSaving(true);
      const taller = talleres.find(t => t.nombre === tallerSeleccionado);
      if (!taller) return;
      if (selectedOrden.cantidad > taller.capacidadDisponible) {
        toast.error(`El taller no tiene capacidad disponible para ${selectedOrden.cantidad} unidades`);
        return;
      }
      const updated = await productionApi.assignToWorkshop(selectedOrden.id, taller.id);
      setOrdenes(prev => prev.map(o => o.id === selectedOrden.id
        ? {
            ...o,
            estado: 'Asignada',
            tallerAsignado: updated.taller?.nombre || tallerSeleccionado,
          }
        : o
      ));
      toast.success(`Orden ${selectedOrden.numeroOrden} asignada a ${tallerSeleccionado}`);
      setModalOpen(false);
      setSelectedOrden(null);
      setTallerSeleccionado('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error asignando taller');
    } finally {
      setSaving(false);
    }
  };

  const openCrudModal = (orden?: OrdenProduccion) => {
    if (orden) {
      setEditingId(orden.id);
      setFormReferencia(orden.referencia);
      setFormCantidad(String(orden.cantidad));
      setFormFecha(orden.fechaPrometida);
      setFormEstado(orden.estado === 'Asignada' ? 'Asignada' : orden.estado === 'En produccion' ? 'En produccion' : orden.estado === 'Completada' ? 'Completada' : 'Pendiente');
      setFormNotas('');
      setFormTela('');
      setFormColores('');
      setFormCurvaTallas('');
      setFormFechaInicio('');
    } else {
      setEditingId(null);
      setFormReferencia('');
      setFormCantidad('');
      setFormFecha('');
      setFormEstado('Pendiente');
      setFormNotas('');
      setFormTela('');
      setFormColores('');
      setFormCurvaTallas('');
      setFormFechaInicio('');
    }
    setCrudModalOpen(true);
  };

  const handleCrudSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        const updated = await productionApi.update(editingId, {
          referencia: formReferencia,
          cantidad: Number(formCantidad),
          fechaEstimada: formFecha,
          estado: formEstado,
          notasTecnicas: formNotas || undefined,
          tela: formTela || undefined,
          colores: formColores ? formColores.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
          curvaTallas: formCurvaTallas ? (() => { try { return JSON.parse(formCurvaTallas); } catch { return undefined; } })() : undefined,
          fechaInicio: formFechaInicio || undefined,
        });
        setOrdenes(prev => prev.map(o => o.id === editingId ? {
          ...o,
          referencia: updated.referencia,
          cantidad: updated.cantidad,
          fechaPrometida: updated.fechaEstimada,
          estado: updated.estado === 'En produccion' ? 'En produccion' : updated.estado === 'Completada' ? 'Completada' : updated.estado === 'Pendiente' ? 'Pendiente' : 'Asignada',
        } : o));
        toast.success('Orden actualizada');
      } else {
        const created = await productionApi.create({
          referencia: formReferencia,
          cantidad: Number(formCantidad),
          fechaEstimada: formFecha,
          estado: formEstado,
          notasTecnicas: formNotas || undefined,
          tela: formTela || undefined,
          colores: formColores ? formColores.split(',').map((c) => c.trim()).filter(Boolean) : undefined,
          curvaTallas: formCurvaTallas ? (() => { try { return JSON.parse(formCurvaTallas); } catch { return undefined; } })() : undefined,
        });
        setOrdenes(prev => [{
          id: created.id,
          numeroOrden: created.pedidoNumero || created.referencia,
          prenda: created.pedidoItemNombre || created.referencia,
          referencia: created.referencia,
          cantidad: created.cantidad,
          fechaPrometida: created.fechaEstimada,
          estado: created.estado === 'En produccion' ? 'En produccion' : created.estado === 'Completada' ? 'Completada' : created.estado === 'Pendiente' ? 'Pendiente' : 'Asignada',
          tallerAsignado: created.taller?.nombre,
          prioridad: 'Media',
          cliente: created.pedidoCliente ?? '',
        }, ...prev]);
        toast.success('Orden creada');
      }
      setCrudModalOpen(false);
      setEditingId(null);
    } catch {
      toast.error(editingId ? 'No se pudo actualizar la orden' : 'No se pudo crear la orden');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      setSaving(true);
      await productionApi.remove(deleteId);
      setOrdenes(prev => prev.filter(o => o.id !== deleteId));
      toast.success('Orden eliminada');
      setDeleteId(null);
    } catch {
      toast.error('No se pudo eliminar la orden');
    } finally {
      setSaving(false);
    }
  };

  const stats = {
    pendientes: ordenes.filter(o => o.estado === 'Pendiente').length,
    asignadas: ordenes.filter(o => o.estado === 'Asignada').length,
    enProduccion: ordenes.filter(o => o.estado === 'En produccion').length,
    completadas: ordenes.filter(o => o.estado === 'Completada').length,
  };

  if (loading) {
    return <div className={s.header}><p>Cargando órdenes de producción...</p></div>;
  }

  if (error) {
    return <div className={s.header}><p className="text-red-500">{error}</p></div>;
  }

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Asignación de Producción</h1>
          <p className={s.pageSubtitle}>Asignar órdenes a talleres</p>
        </div>
        <Button size="lg" onClick={() => openCrudModal()}>
          <Plus size={16} />
          Nueva orden
        </Button>
        <div className={s.statsRow}>
          <div className={s.statCard}>
            <Clock size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{stats.pendientes}</div>
              <div className={s.statLabel}>Pendientes</div>
            </div>
          </div>
          <div className={s.statCard}>
            <Factory size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{stats.asignadas}</div>
              <div className={s.statLabel}>Asignadas</div>
            </div>
          </div>
          <div className={s.statCard}>
            <AlertTriangle size={20} className={s.statIconWarning} />
            <div>
              <div className={s.statValue}>{stats.enProduccion}</div>
              <div className={s.statLabel}>En Producción</div>
            </div>
          </div>
          <div className={s.statCard}>
            <div className={s.statIconDone}>✓</div>
            <div>
              <div className={s.statValue}>{stats.completadas}</div>
              <div className={s.statLabel}>Completadas</div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.filters}>
        <div className={s.filterGroup}>
          {['Todos', ...ESTADOS_PRODUCCION].map(estado => (
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
            placeholder="Buscar por orden, prenda, referencia o cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.searchInput}
          />
        </div>
      </div>

      <DataTable<OrdenProduccion>
        data={filteredOrdenes}
        pageSize={10}
        emptyMessage="Sin resultados"
        enableSorting
        enableColumnFilters
        enableRowSelection
        enableExport
        exportFileName="asignacion_produccion"
        actions={(o) => [
          ...(o.estado === 'Pendiente' ? [{ label: 'Asignar', icon: <Plus size={14} />, onClick: () => handleOpenModal(o) }] : []),
          { label: 'Editar', icon: <Edit size={14} />, onClick: () => openCrudModal(o) },
          { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteId(o.id) },
        ]}
        columns={[
          { key: 'orden', header: 'Orden', width: '180px', sortable: true, filterable: true, filterPlaceholder: 'Filtrar orden...', render: (o) => (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[var(--color-text-primary)]">{o.numeroOrden}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{o.referencia}</span>
            </div>
          )},
          { key: 'producto', header: 'Producto', width: '220px', sortable: true, filterable: true, filterPlaceholder: 'Filtrar producto...', render: (o) => (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[var(--color-text-primary)]">{o.prenda}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{o.cantidad} unidades</span>
            </div>
          )},
          { key: 'clienteTaller', header: 'Cliente / Taller', width: '240px', sortable: true, filterable: true, filterPlaceholder: 'Filtrar cliente...', render: (o) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-[var(--color-text-primary)]">{o.cliente}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{o.tallerAsignado || '—'}</span>
            </div>
          )},
          { key: 'entrega', header: 'Entrega', width: '160px', sortable: true, render: (o) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-[var(--color-text-primary)]">{o.fechaPrometida}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">Prioridad {o.prioridad}</span>
            </div>
          )},
           { key: 'estado', header: 'Estado', width: '170px', sortable: true, filterable: true, filterType: 'select', filterOptions: ESTADOS_PRODUCCION.map(e => ({ value: e, label: e === 'En produccion' ? 'En producción' : e })), render: (o) => <StatusBadge status={o.estado} /> },
        ]}
        detailPanel={{
          title: (o) => `${o.estado === 'Pendiente' ? 'Asignar Taller' : 'Cambiar Taller Asignado'} - ${o.numeroOrden}`,
          render: (o, onClose) => (
            <div>
              <div className={s.ordenInfo}>
                <div className={s.infoRow}><span className={s.infoLabel}>Orden:</span><span className={s.infoValue}>{o.numeroOrden}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Prenda:</span><span className={s.infoValue}>{o.prenda}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Cantidad:</span><span className={s.infoValue}>{o.cantidad} unidades</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Fecha prometida:</span><span className={s.infoValue}>{o.fechaPrometida}</span></div>
                <div className={s.infoRow}><span className={s.infoLabel}>Cliente:</span><span className={s.infoValue}>{o.cliente}</span></div>
              </div>
              <div className={s.field}>
                <label className={s.label}>Seleccionar Taller</label>
                <div className={s.selectWrapper}>
                  <select className={s.select} value={tallerSeleccionado} onChange={e => setTallerSeleccionado(e.target.value)}>
                    <option value="">-- Seleccione un taller --</option>
                    {talleres.map(t => (<option key={t.id} value={t.nombre}>{t.nombre} (Disponible: {t.capacidadDisponible})</option>))}
                  </select>
                </div>
              </div>              <ModalFooter
                actions={[{ label: 'Cancelar', variant: 'secondary', onClick: onClose }, { label: saving ? 'Guardando...' : 'Asignar taller' , onClick: handleAsignarTaller, disabled: !tallerSeleccionado || saving }]}
              />
            </div>
          ),
        }}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedOrden ? `Asignar Taller - ${selectedOrden.numeroOrden}` : 'Asignar Taller'}
        size="md"
        variant="form"
      >
        {selectedOrden && (
          <div className={s.detailModalContent}>
            <div className={s.ordenInfo}>
              <div className={s.infoRow}><span className={s.infoLabel}>Prenda:</span><span className={s.infoValue}>{selectedOrden.prenda}</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Cantidad:</span><span className={s.infoValue}>{selectedOrden.cantidad} unidades</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Fecha prometida:</span><span className={s.infoValue}>{selectedOrden.fechaPrometida}</span></div>
              <div className={s.infoRow}><span className={s.infoLabel}>Cliente:</span><span className={s.infoValue}>{selectedOrden.cliente}</span></div>
            </div>
            <div className={s.field}>
              <label className={s.label}>Seleccionar Taller</label>
              <div className={s.selectWrapper}>
                <select className={s.select} value={tallerSeleccionado} onChange={e => setTallerSeleccionado(e.target.value)}>
                  <option value="">-- Seleccione un taller --</option>
                  {talleres.map(t => (<option key={t.id} value={t.nombre}>{t.nombre} (Disponible: {t.capacidadDisponible})</option>))}
                </select>
              </div>
            </div>            <ModalFooter
              actions={[{ label: 'Cancelar', variant: 'secondary', onClick: () => setModalOpen(false) }, { label: saving ? 'Guardando...' : 'Asignar taller' , onClick: handleAsignarTaller, disabled: !tallerSeleccionado || saving }]}
            />
          </div>
        )}
      </Modal>

      <Modal
        open={crudModalOpen}
        onClose={() => { setCrudModalOpen(false); setEditingId(null); }}
        title={editingId ? 'Editar orden de producción' : 'Nueva orden de producción'}
        description={editingId ? 'Modifica los datos de la orden.' : 'Crea una nueva orden de producción.'}
        size="lg"
        variant="form"
      >
        <form id="ordenForm" className={f.form} onSubmit={handleCrudSubmit}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Datos de la orden</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Referencia</label>
                <input
                  type="text"
                  className={f.input}
                  value={formReferencia}
                  onChange={e => setFormReferencia(e.target.value)}
                  placeholder="Ej: CMR-001"
                  required
                />
              </div>
              <div className={f.field}>
                <label className={f.label}>Cantidad</label>
                <input
                  type="number"
                  className={f.input}
                  value={formCantidad}
                  onChange={e => setFormCantidad(e.target.value)}
                  placeholder="Ej: 50"
                  required
                  min="1"
                />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Fecha estimada</label>
                <input
                  type="date"
                  className={f.input}
                  value={formFecha}
                  onChange={e => setFormFecha(e.target.value)}
                  required
                />
              </div>
              <div className={f.field}>
                <label className={f.label}>Estado</label>
                <select className={f.select} value={formEstado} onChange={e => setFormEstado(e.target.value as 'Pendiente' | 'Asignada' | 'En produccion' | 'Completada')}>
                  <option value="Pendiente">Pendiente</option>
                  <option value="Asignada">Asignada</option>
                  <option value="En produccion">En producción</option>
                  <option value="Completada">Completada</option>
                </select>
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Detalles</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Notas técnicas</label>
                <input
                  type="text"
                  className={f.input}
                  value={formNotas}
                  onChange={e => setFormNotas(e.target.value)}
                  placeholder="Opcional"
                />
              </div>
              <div className={f.field}>
                <label className={f.label}>Fecha inicio</label>
                <input
                  type="date"
                  className={f.input}
                  value={formFechaInicio}
                  onChange={e => setFormFechaInicio(e.target.value)}
                />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Tela</label>
                <input
                  type="text"
                  className={f.input}
                  value={formTela}
                  onChange={e => setFormTela(e.target.value)}
                  placeholder="Ej: Algodón"
                />
              </div>
              <div className={f.field}>
                <label className={f.label}>Colores (separados por coma)</label>
                <input
                  type="text"
                  className={f.input}
                  value={formColores}
                  onChange={e => setFormColores(e.target.value)}
                  placeholder="Ej: Rojo, Azul"
                />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Tallas (JSON)</label>
                <input
                  type="text"
                  className={f.input}
                  value={formCurvaTallas}
                  onChange={e => setFormCurvaTallas(e.target.value)}
                  placeholder='Ej: {"s":10,"m":20}'
                />
              </div>
            </div>
          </div>

          <ModalFooter
            actions={[{ label: 'Cancelar', variant: 'secondary', type: 'button', onClick: () => { setCrudModalOpen(false); setEditingId(null); }, disabled: saving }, { label: editingId ? (saving ? 'Guardando...' : 'Guardar cambios') : (saving ? 'Creando...' : 'Crear orden') , type: 'submit', disabled: saving }]} />
        </form>
      </Modal>

      <Modal
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        title="Eliminar orden"
        description="Esta acción no se puede deshacer."
        size="sm"
      >
        <ModalFooter
          actions={[{ label: 'Cancelar', variant: 'secondary', onClick: () => setDeleteId(null), disabled: saving }, { label: saving ? 'Eliminando...' : 'Eliminar' , variant: 'danger', onClick: handleDelete, disabled: saving }]} />

      </Modal>
    </div>
  );
};
