import React, { useState, useMemo, useEffect } from 'react';
import { RotateCcw, CheckCircle, AlertTriangle, Package, Clock, Download, FileText, Plus, ChevronDown, Save, Loader2, AlertCircle, Edit3, Trash2, Upload } from 'lucide-react';
import s from './StockDevuelto.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { toast } from 'sonner';
import { returnsApi, type Return } from '@/infrastructure/api/returnsApi';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import type { Pedido } from '@/core/types';
import { workshopsApi } from '@/infrastructure/api/workshopsApi';
import { ApiError } from '@/infrastructure/api/httpClient';

interface Devolucion {
  id: string;
  numeroDevolucion: string;
  numeroOrden: string;
  prenda: string;
  referencia: string;
  motivo: string;
  cantidad: number;
  cantidadInspeccionada: number;
  fechaDevolucion: string;
  estado: 'Recibido' | 'En inspección' | 'Aprobado' | 'Rechazado' | 'En reparación' | 'Reingresado' | 'Descartado';
  destino: 'Reingreso a inventario' | 'Reparación' | 'Descarte' | 'Devolución a proveedor';
  cliente: string;
  responsable?: string;
  observaciones: string;
  evidencias?: string[];
  fechaOrden?: string;
  estadoOrden?: string;
}

interface HistorialCambio {
  id: string;
  devolucionId: string;
  fecha: string;
  estadoAnterior: string;
  estadoNuevo: string;
  destinoAnterior?: string;
  destinoNuevo?: string;
  usuario: string;
}

const ESTADO_TO_UI: Record<string, Devolucion['estado']> = {
  RECIBIDO: 'Recibido',
  EN_INSPECCION: 'En inspección',
  APROBADO: 'Aprobado',
  RECHAZADO: 'Rechazado',
  EN_REPARACION: 'En reparación',
  REINGRESADO: 'Reingresado',
  DESCARTADO: 'Descartado',
};
const ESTADO_TO_API: Record<Devolucion['estado'], string> = {
  Recibido: 'RECIBIDO',
  'En inspección': 'EN_INSPECCION',
  Aprobado: 'APROBADO',
  Rechazado: 'RECHAZADO',
  'En reparación': 'EN_REPARACION',
  Reingresado: 'REINGRESADO',
  Descartado: 'DESCARTADO',
};
const DESTINO_TO_UI: Record<string, Devolucion['destino']> = {
  REINGRESO_INVENTARIO: 'Reingreso a inventario',
  REPARACION: 'Reparación',
  DESCARTE: 'Descarte',
  DEVOLUCION_PROVEEDOR: 'Devolución a proveedor',
};
const DESTINO_TO_API: Record<Devolucion['destino'], string> = {
  'Reingreso a inventario': 'REINGRESO_INVENTARIO',
  Reparación: 'REPARACION',
  Descarte: 'DESCARTE',
  'Devolución a proveedor': 'DEVOLUCION_PROVEEDOR',
};

function toDevolucion(r: Return): Devolucion {
  return {
    id: r.id,
    numeroDevolucion: r.numeroDevolucion,
    numeroOrden: r.numeroOrden,
    prenda: r.prenda,
    referencia: r.referencia,
    motivo: r.motivo,
    cantidad: r.cantidad,
    cantidadInspeccionada: r.cantidadInspeccionada,
    fechaDevolucion: r.fechaDevolucion,
    estado: ESTADO_TO_UI[r.estado] ?? 'Recibido',
    destino: DESTINO_TO_UI[r.destino] ?? 'Reingreso a inventario',
    cliente: r.cliente,
    responsable: r.responsable,
    observaciones: r.observaciones,
    evidencias: r.imagenes ?? [],
    fechaOrden: r.fechaOrden,
    estadoOrden: r.estadoOrden,
  };
}

function fromDevolucion(d: Devolucion): Return {
  return {
    id: d.id,
    numeroDevolucion: d.numeroDevolucion,
    numeroOrden: d.numeroOrden,
    prenda: d.prenda,
    referencia: d.referencia,
    motivo: d.motivo,
    cantidad: d.cantidad,
    cantidadInspeccionada: d.cantidadInspeccionada,
    fechaDevolucion: d.fechaDevolucion,
    estado: ESTADO_TO_API[d.estado] as Return['estado'],
    destino: DESTINO_TO_API[d.destino] as Return['destino'],
    cliente: d.cliente,
    responsable: d.responsable,
    observaciones: d.observaciones,
    imagenes: d.evidencias ?? [],
  };
}

export const AdminStockDevuelto: React.FC = () => {
  const [search, setSearch] = useState('');
  const [devoluciones, setDevoluciones] = useState<Devolucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingDevolucion, setEditingDevolucion] = useState<Devolucion | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Devolucion | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedDevoluciones, setSelectedDevoluciones] = useState<Devolucion[]>([]);
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [filtroCliente, setFiltroCliente] = useState('');
  const [batchEstado, setBatchEstado] = useState('');
  const [batchDestino, setBatchDestino] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [_evidencias, setEvidencias] = useState<Record<string, string[]>>({});
  const [historial, setHistorial] = useState<HistorialCambio[]>([]);
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | 'Recibido' | 'En inspección' | 'Aprobado' | 'Rechazado' | 'En reparación' | 'Reingresado' | 'Descartado'>('Todos');
  const [filtroDestino, setFiltroDestino] = useState<'Todos' | 'Reingreso a inventario' | 'Reparación' | 'Descarte' | 'Devolución a proveedor'>('Todos');
  const [referencias, setReferencias] = useState<{ ref: string; nombre: string }[]>([]);
  const [loadingReferencias, setLoadingReferencias] = useState(false);
  const [ordenes, setOrdenes] = useState<Pedido[]>([]);
  const [talleres, setTalleres] = useState<{ id: string; nombre: string }[]>([]);
  const [_loadingTalleres, setLoadingTalleres] = useState(false);
  const [referenciaAbierta, setReferenciaAbierta] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await returnsApi.list();
      const devs = data.map(toDevolucion);
      setDevoluciones(devs);
    } catch (err) {
      const msg = getFriendlyReturnError(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const loadReferencias = async () => {
      setLoadingReferencias(true);
      try {
        const result = await catalogApi.list({ limit: 100 });
        const refs = result.data
          .filter(p => p.ref && p.ref.trim() !== '')
          .map(p => ({ ref: p.ref, nombre: p.nombre }))
          .sort((a, b) => a.ref.localeCompare(b.ref));
        setReferencias(refs);
      } catch {
        setReferencias([]);
      } finally {
        setLoadingReferencias(false);
      }
    };
    loadReferencias();
    const loadOrdenes = async () => {
      try {
        const result = await ordersApi.adminList({ limit: 100 });
        setOrdenes(result.pedidos ?? []);
      } catch {
        setOrdenes([]);
      }
    };
    loadOrdenes();
    const loadTalleres = async () => {
      setLoadingTalleres(true);
      try {
        const data = await workshopsApi.list();
        setTalleres(data.map(t => ({ id: t.id, nombre: t.nombre })));
      } catch {
        setTalleres([]);
      } finally {
        setLoadingTalleres(false);
      }
    };
    loadTalleres();
  }, []);

  const [formValues, setFormValues] = useState({
    numeroOrden: '',
    prenda: '',
    referencia: '',
    cliente: '',
    motivo: '',
    cantidad: '',
    cantidadInspeccionada: '0',
    destino: 'Reingreso a inventario' as Devolucion['destino'],
    fechaDevolucion: new Date().toISOString().slice(0, 10),
    responsable: '',
    observaciones: '',
  });

  const setForm = (patch: Partial<typeof formValues>) => setFormValues(prev => ({ ...prev, ...patch }));

  const handleReferenciaChange = (ref: string) => {
    setReferenciaAbierta(false);
    setForm({ referencia: ref });
    if (!ref) {
      setForm({ numeroOrden: '', prenda: '' });
      return;
    }
    const producto = referencias.find(r => r.ref === ref);
    if (producto) {
      setForm({ prenda: producto.nombre });
    }
    const ordenEncontrada = ordenes.find(o => (o.itemsList ?? []).some((item) => item.referencia === ref || item.productId === ref || item.nombre === producto?.nombre));
    if (ordenEncontrada) {
      setForm({ numeroOrden: ordenEncontrada.numero });
    }
  };

  useEffect(() => {
    if (!referenciaAbierta) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.customSelect')) {
        setReferenciaAbierta(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [referenciaAbierta]);

  const filteredDevoluciones = useMemo(() => {
    return devoluciones.filter(d =>
      (d.estado === filtroEstado || filtroEstado === 'Todos') &&
      (d.destino === filtroDestino || filtroDestino === 'Todos') &&
      (filtroCliente === '' || d.cliente.toLowerCase().includes(filtroCliente.toLowerCase())) &&
      (fechaDesde === '' || d.fechaDevolucion >= fechaDesde) &&
      (fechaHasta === '' || d.fechaDevolucion <= fechaHasta) &&
      (d.numeroDevolucion.toLowerCase().includes(search.toLowerCase()) ||
       d.numeroOrden.toLowerCase().includes(search.toLowerCase()) ||
       d.prenda.toLowerCase().includes(search.toLowerCase()) ||
       d.referencia.toLowerCase().includes(search.toLowerCase()) ||
       d.cliente.toLowerCase().includes(search.toLowerCase()) ||
       d.motivo.toLowerCase().includes(search.toLowerCase()))
    );
  }, [devoluciones, search, filtroEstado, filtroDestino, filtroCliente, fechaDesde, fechaHasta]);

  const getDestinoIcon = (destino: string) => {
    switch (destino) {
      case 'Reingreso a inventario': return <RotateCcw size={14} />;
      case 'Reparación': return <Package size={14} />;
      case 'Descarte': return <AlertTriangle size={14} />;
      case 'Devolución a proveedor': return <Package size={14} />;
      default: return <Package size={14} />;
    }
  };

  const exportCSV = () => {
    const headers = ['N° Devolución', 'N° Orden', 'Prenda', 'Referencia', 'Motivo', 'Cantidad', 'Cantidad Inspeccionada', 'Estado', 'Destino', 'Cliente', 'Fecha devolución', 'Responsable', 'Observaciones'];
    const rows = filteredDevoluciones.map(d => [
      d.numeroDevolucion, d.numeroOrden, d.prenda, d.referencia, d.motivo, d.cantidad, d.cantidadInspeccionada, d.estado, d.destino, d.cliente, d.fechaDevolucion, d.responsable ?? '', d.observaciones,
    ]);
    const csvContent = [headers, ...rows].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
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

  const resetForm = () => {
    setForm({
      numeroOrden: '', prenda: '', referencia: '', cliente: '', motivo: '', cantidad: '', cantidadInspeccionada: '0',
      destino: 'Reingreso a inventario', fechaDevolucion: new Date().toISOString().slice(0, 10), responsable: '', observaciones: '',
    });
    setFormError(null);
  };

  const openModal = () => { setReferenciaAbierta(false); resetForm(); setModalOpen(true); };
  const closeModal = () => { setReferenciaAbierta(false); setModalOpen(false); setSaving(false); setFormError(null); };

  const openEditModal = (d: Devolucion) => {
    setReferenciaAbierta(false);
    setEditingDevolucion(d);
    setForm({
      numeroOrden: d.numeroOrden, prenda: d.prenda, referencia: d.referencia, cliente: d.cliente, motivo: d.motivo,
      cantidad: String(d.cantidad), cantidadInspeccionada: String(d.cantidadInspeccionada), destino: d.destino,
      fechaDevolucion: d.fechaDevolucion, responsable: d.responsable ?? '', observaciones: d.observaciones,
    });
    setFormError(null);
    setEditModalOpen(true);
  };
  const closeEditModal = () => { setEditModalOpen(false); setEditingDevolucion(null); setSaving(false); setFormError(null); };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!formValues.numeroOrden.trim()) { setFormError('El número de orden es obligatorio'); return; }
    if (!formValues.prenda.trim()) { setFormError('La prenda es obligatoria'); return; }
    if (!formValues.cliente.trim()) { setFormError('El cliente es obligatorio'); return; }
    if (!formValues.cantidad || Number(formValues.cantidad) <= 0) { setFormError('La cantidad debe ser mayor a 0'); return; }
    setSaving(true);
    try {
      const apiInput = fromDevolucion({
        id: '', numeroDevolucion: '', ...formValues, cantidad: Number(formValues.cantidad),
        cantidadInspeccionada: Number(formValues.cantidadInspeccionada) || 0, estado: 'Recibido',
        cliente: formValues.cliente, responsable: formValues.responsable || undefined, observaciones: formValues.observaciones, evidencias: [],
      });
      const creada = await returnsApi.create({
        numeroOrden: apiInput.numeroOrden, prenda: apiInput.prenda, referencia: apiInput.referencia, motivo: apiInput.motivo,
        cantidad: apiInput.cantidad, cantidadInspeccionada: apiInput.cantidadInspeccionada, destino: apiInput.destino,
        cliente: apiInput.cliente, responsable: apiInput.responsable, observaciones: apiInput.observaciones, fechaDevolucion: apiInput.fechaDevolucion,
      });
      setDevoluciones(prev => [{ ...toDevolucion(creada) }, ...prev]);
      toast.success(`Devolución ${creada.numeroDevolucion} registrada`);
      closeModal();
    } catch (err) {
      toast.error(getFriendlyReturnError(err));
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!editingDevolucion) return;
    if (!formValues.prenda.trim()) { setFormError('La prenda es obligatoria'); return; }
    if (!formValues.cliente.trim()) { setFormError('El cliente es obligatorio'); return; }
    if (!formValues.cantidad || Number(formValues.cantidad) <= 0) { setFormError('La cantidad debe ser mayor a 0'); return; }
    setSaving(true);
    try {
      const changes: Partial<Devolucion> = {
        prenda: formValues.prenda.trim(), referencia: formValues.referencia.trim(), motivo: formValues.motivo.trim(),
        cantidad: Number(formValues.cantidad), cantidadInspeccionada: Number(formValues.cantidadInspeccionada) || 0,
        destino: formValues.destino, cliente: formValues.cliente.trim(), responsable: formValues.responsable.trim() || undefined,
        observaciones: formValues.observaciones.trim(), fechaDevolucion: formValues.fechaDevolucion,
      };
      const apiChanges: Partial<Return> = {
        prenda: changes.prenda, referencia: changes.referencia, motivo: changes.motivo, cantidad: changes.cantidad,
        cantidadInspeccionada: changes.cantidadInspeccionada,
        destino: changes.destino ? (DESTINO_TO_API[changes.destino] as Return['destino']) : undefined,
        cliente: changes.cliente, responsable: changes.responsable, observaciones: changes.observaciones, fechaDevolucion: changes.fechaDevolucion,
      };
      const actualizada = await returnsApi.update(editingDevolucion.id, apiChanges);
      setDevoluciones(prev => prev.map(dev => dev.id === editingDevolucion.id ? { ...dev, ...changes, estado: ESTADO_TO_UI[actualizada.estado] ?? dev.estado, destino: DESTINO_TO_UI[actualizada.destino] ?? dev.destino } : dev));
      toast.success(`Devolución ${editingDevolucion.numeroDevolucion} actualizada`);
      closeEditModal();
    } catch (err) {
      toast.error(getFriendlyReturnError(err));
      setSaving(false);
    }
  };

  const cambiarEstado = async (d: Devolucion, estadoUI: Devolucion['estado']) => {
    const estadoApi = ESTADO_TO_API[estadoUI];
    const estadoAnterior = d.estado;
    setDevoluciones(prev => prev.map(dev => dev.id === d.id ? { ...dev, estado: estadoUI } : dev));
    try {
      const actualizada = await returnsApi.changeStatus(d.id, estadoApi as Return['estado']);
      setHistorial(prev => [...prev, {
        id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, devolucionId: d.id, fecha: new Date().toISOString(),
        estadoAnterior, estadoNuevo: estadoUI, usuario: 'Usuario actual',
      }]);
      setDevoluciones(prev => prev.map(dev => dev.id === d.id ? { ...dev, estado: ESTADO_TO_UI[actualizada.estado] ?? estadoUI, destino: DESTINO_TO_UI[actualizada.destino] ?? dev.destino } : dev));
      toast.success(`Devolución ${d.numeroDevolucion} → ${estadoUI}`);
    } catch (err) {
      toast.error(getFriendlyReturnError(err));
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await returnsApi.remove(deleteConfirm.id);
      setDevoluciones(prev => prev.filter(dev => dev.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      toast.success(`Devolución ${deleteConfirm.numeroDevolucion} eliminada`);
    } catch (err) {
      toast.error(getFriendlyReturnError(err));
    }
  };

  const handleBatchUpdate = async () => {
    if (selectedDevoluciones.length === 0) return;
    if (!batchEstado && !batchDestino) return;
    try {
      for (const d of selectedDevoluciones) {
        const changes: Partial<Return> = {};
        if (batchEstado) changes.estado = ESTADO_TO_API[batchEstado as Devolucion['estado']] as Return['estado'];
        if (batchDestino) changes.destino = DESTINO_TO_API[batchDestino as Devolucion['destino']] as Return['destino'];
        await returnsApi.update(d.id, changes);
        setHistorial(prev => [...prev, {
          id: `HIS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, devolucionId: d.id, fecha: new Date().toISOString(),
          estadoAnterior: d.estado, estadoNuevo: batchEstado || d.estado, destinoAnterior: d.destino, destinoNuevo: batchDestino || d.destino, usuario: 'Usuario actual',
        }]);
      }
      await load();
      setSelectedDevoluciones([]);
      setBatchEstado('');
      setBatchDestino('');
      toast.success(`${selectedDevoluciones.length} devoluciones actualizadas`);
    } catch (err) {
      toast.error(getFriendlyReturnError(err));
    }
  };

  const handleEvidenciasChange = (e: React.ChangeEvent<HTMLInputElement>, devolucionId: string) => {
    const files = Array.from(e.target.files ?? []);
    setEvidencias(prev => ({ ...prev, [devolucionId]: [...(prev[devolucionId] ?? []), ...files.map(f => URL.createObjectURL(f))] }));
  };

  const getDevolucionHistorial = (devolucionId: string) => historial.filter(h => h.devolucionId === devolucionId);

  const stats = {
    pendientes: devoluciones.filter(d => ['Recibido', 'En inspección'].includes(d.estado)).length,
    enReparacion: devoluciones.filter(d => d.estado === 'En reparación').length,
    reingresados: devoluciones.filter(d => d.estado === 'Reingresado').length,
    descartados: devoluciones.filter(d => d.estado === 'Descartado').length,
    totalUnidades: devoluciones.reduce((sum, d) => sum + d.cantidad, 0),
  };

  const acciones = (d: Devolucion) => [
    { label: 'Editar', icon: <Edit3 size={14} />, onClick: () => openEditModal(d) },
    { label: 'Inspeccionar', icon: <CheckCircle size={14} />, onClick: () => cambiarEstado(d, 'En inspección'), disabled: d.estado !== 'En inspección' && d.estado !== 'Recibido' },
    { label: 'Asignar destino', icon: <Package size={14} />, onClick: () => cambiarEstado(d, 'En reparación'), disabled: !['Recibido', 'En inspección', 'Aprobado'].includes(d.estado) },
    { label: 'Completar reparación', icon: <CheckCircle size={14} />, onClick: () => cambiarEstado(d, 'Reingresado'), disabled: d.estado !== 'En reparación' },
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(d), danger: true },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Control de Stock Devuelto</h1>
          <p className={s.pageSubtitle}>Inspección, edición y destino de devoluciones</p>
        </div>
        <div className={s.headerActions}>
          <Button variant="secondary" leftIcon={<Download size={16} />} onClick={exportCSV}>Exportar CSV</Button>
          <Button leftIcon={<Plus size={16} />} onClick={openModal}>Nueva Devolución</Button>
        </div>
      </div>

      <div className={s.statsRow}>
        <div className={s.statCard}><Clock size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.pendientes}</div><div className={s.statLabel}>Pendientes</div></div></div>
        <div className={s.statCard}><Package size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.enReparacion}</div><div className={s.statLabel}>En Reparación</div></div></div>
        <div className={`${s.statCard} ${s.statCardSuccess}`}><RotateCcw size={20} className={s.statIconSuccess} /><div><div className={s.statValue}>{stats.reingresados}</div><div className={s.statLabel}>Reingresados</div></div></div>
        <div className={`${s.statCard} ${s.statCardDanger}`}><AlertTriangle size={20} className={s.statIconDanger} /><div><div className={s.statValue}>{stats.descartados}</div><div className={s.statLabel}>Descartados</div></div></div>
        <div className={s.statCard}><FileText size={20} className={s.statIcon} /><div><div className={s.statValue}>{stats.totalUnidades}</div><div className={s.statLabel}>Total Unidades</div></div></div>
      </div>

      <div className={s.toolbar}>
        <SearchInput placeholder="Buscar por devolución, orden, prenda, referencia o motivo..." value={search} onChange={(e) => setSearch(e.target.value)} onSearch={(value) => setSearch(value)} debounceMs={100} minChars={0} />
        <button className={s.filterToggle} onClick={() => setShowFilters(!showFilters)}><FileText size={16} /> Filtros <ChevronDown size={14} className={`${s.filterChevron} ${showFilters ? s.filterChevronOpen : ''}`} /></button>
      </div>

      {showFilters && (
        <div className={s.filtersPanel}>
          <div className={s.filterGroup}>
            <div className={s.field}><label className={s.label}>Cliente</label><input className={s.input} value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} placeholder="Buscar cliente..." /></div>
            <div className={s.field}><label className={s.label}>Fecha desde</label><input className={s.input} type="date" value={fechaDesde} onChange={e => setFechaDesde(e.target.value)} /></div>
            <div className={s.field}><label className={s.label}>Fecha hasta</label><input className={s.input} type="date" value={fechaHasta} onChange={e => setFechaHasta(e.target.value)} /></div>
          </div>
          <button className={s.clearFiltersBtn} onClick={() => { setFiltroCliente(''); setFechaDesde(''); setFechaHasta(''); setFiltroEstado('Todos'); setFiltroDestino('Todos'); }}>Limpiar filtros</button>
        </div>
      )}

      {selectedDevoluciones.length > 0 && (
        <div className={s.selectionBar}>
          <div className={s.selectionText}><strong>{selectedDevoluciones.length}</strong> {selectedDevoluciones.length === 1 ? 'registro seleccionado' : 'registros seleccionados'}</div>
          <div className={s.batchActions}>
            <select className={s.select} value={batchEstado} onChange={e => setBatchEstado(e.target.value)}><option value="">Cambiar estado...</option><option value="Recibido">Recibido</option><option value="En inspección">En inspección</option><option value="Aprobado">Aprobado</option><option value="Rechazado">Rechazado</option><option value="En reparación">En reparación</option><option value="Reingresado">Reingresado</option><option value="Descartado">Descartado</option></select>
            <select className={s.select} value={batchDestino} onChange={e => setBatchDestino(e.target.value)}><option value="">Cambiar destino...</option><option value="Reingreso a inventario">Reingreso a inventario</option><option value="Reparación">Reparación</option><option value="Descarte">Descarte</option><option value="Devolución a proveedor">Devolución a proveedor</option></select>
            <Button size="xs" onClick={handleBatchUpdate} disabled={!batchEstado && !batchDestino}>Aplicar</Button>
            <Button variant="ghost" size="xs" onClick={() => setSelectedDevoluciones([])}>Limpiar</Button>
          </div>
        </div>
      )}

      <div className={s.tableWrapper}>
        {loading && (<div className={s.stateBox}><Loader2 size={28} className={s.spin} /><p>Cargando devoluciones...</p></div>)}
        {error && (<div className={s.errorBox}><AlertCircle size={28} /><p>{error}</p></div>)}
        {!loading && !error && (
          <DataTable<Devolucion>
            data={filteredDevoluciones}
            pageSize={10}
            emptyMessage="No se encontraron devoluciones"
            maxVisibleColumns={5}
            modalSize="xl"
            enableRowSelection
            onSelectionChange={(items) => setSelectedDevoluciones(items)}
            enableExport
            exportFileName="devoluciones"
            detailPanel={{
              title: (d) => `Devolución ${d.numeroDevolucion}`,
              render: (d) => (
                <div className={s.detailPanel}>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Información de la devolución</h4>
                    <div className={s.detailGrid}>
                      <div className={s.detailItem}><span className={s.detailLabel}>N° Orden</span><span>{d.numeroOrden}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Referencia</span><span>{d.referencia}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Motivo</span><span>{d.motivo}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Cantidad</span><span>{d.cantidad}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Cantidad inspeccionada</span><span>{d.cantidadInspeccionada}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Cliente</span><span>{d.cliente}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Fecha devolución</span><span>{d.fechaDevolucion}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Destino previsto</span><span>{d.destino}</span></div>
                      {d.responsable && <div className={s.detailItem}><span className={s.detailLabel}>Responsable</span><span>{d.responsable}</span></div>}
                      {d.observaciones && <div className={s.detailItem}><span className={s.detailLabel}>Observaciones</span><span>{d.observaciones}</span></div>}
                    </div>
                  </div>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Pedido relacionado</h4>
                    <div className={s.detailGrid}>
                      <div className={s.detailItem}><span className={s.detailLabel}>N° Orden</span><span>{d.numeroOrden}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Fecha orden</span><span>{d.fechaOrden}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Estado orden</span><span>{d.estadoOrden}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Prenda</span><span>{d.prenda}</span></div>
                      <div className={s.detailItem}><span className={s.detailLabel}>Estado actual</span><span>{d.estado}</span></div>
                    </div>
                  </div>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Historial de cambios</h4>
                    {getDevolucionHistorial(d.id).length === 0 ? (<p className={s.emptyText}>Sin cambios registrados</p>) : (
                      <div className={s.historialList}>{getDevolucionHistorial(d.id).map(h => (<div key={h.id} className={s.historialItem}><div className={s.historialFecha}>{new Date(h.fecha).toLocaleString()}</div><div className={s.historialCambio}><span>{h.estadoAnterior}</span><ChevronDown size={12} /><span>{h.estadoNuevo}</span></div><div className={s.historialUsuario}>{h.usuario}</div></div>))}</div>
                    )}
                  </div>
                  <div className={s.detailSection}>
                    <h4 className={s.detailSectionTitle}>Evidencias</h4>
                    <div className={s.evidenciasGrid}>
                      {(d.evidencias ?? []).length === 0 ? (<p className={s.emptyText}>Sin evidencias adjuntas</p>) : ((d.evidencias ?? []).map((src, idx) => (<img key={idx} src={src} alt={`Evidencia ${idx + 1}`} className={s.evidenciaImg} />)))}
                      <label className={s.uploadBtn}><input type="file" accept="image/*" multiple hidden onChange={(e) => handleEvidenciasChange(e, d.id)} /><Upload size={14} /> Adjuntar</label>
                    </div>
                  </div>
                </div>
              ),
            }}
            actions={acciones}
            columns={[
              { key: 'numeroDevolucion', header: 'N° Devolución', width: '140px', sortable: true, render: (d) => <span className={s.tdPrimary}>{d.numeroDevolucion}</span> },
              { key: 'prenda', header: 'Prenda', sortable: true, render: (d) => d.prenda },
               { key: 'estado', header: 'Estado', width: '170px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
                { value: 'Recibido', label: 'Recibido' }, { value: 'En inspección', label: 'En inspección' }, { value: 'Aprobado', label: 'Aprobado' },
                { value: 'Rechazado', label: 'Rechazado' }, { value: 'En reparación', label: 'En reparación' }, { value: 'Reingresado', label: 'Reingresado' }, { value: 'Descartado', label: 'Descartado' },
              ], render: (d) => (<div className={s.estadoCell}><StatusBadge status={d.estado} /></div>) },
              { key: 'destino', header: 'Destino', width: '150px', sortable: true, render: (d) => (<div className={s.destinoCell}>{getDestinoIcon(d.destino)}<span>{d.destino}</span></div>) },
              { key: 'cliente', header: 'Cliente', sortable: true, render: (d) => d.cliente },
              { key: 'fechaDevolucion', header: 'Fecha', width: '120px', sortable: true, render: (d) => (<div className={s.fechaCell}><Clock size={14} /><span>{d.fechaDevolucion}</span></div>) },
            ]}
          />
        )}
      </div>

      <Modal open={modalOpen} onClose={closeModal} title="Registrar Nueva Devolución" description="Completa la información de la devolución" size="lg" variant="form">
        <form onSubmit={handleCreateSubmit} className={f.form}>
          {formError && <div className={f.formError}>{formError}</div>}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Datos básicos</h3>
            <div className={f.formRow}>
              <div className={s.selectWrap}>
                <label className={f.label}>Referencia *</label>
                <div className={s.customSelect} onClick={() => setReferenciaAbierta(v => !v)}>
                  <span className={!formValues.referencia ? s.customSelectPlaceholder : ''}>
                    {formValues.referencia ? referencias.find(r => r.ref === formValues.referencia) ? `${formValues.referencia} - ${referencias.find(r => r.ref === formValues.referencia)!.nombre}` : formValues.referencia : (loadingReferencias ? 'Cargando referencias...' : 'Seleccione una referencia')}
                  </span>
                  <span className={s.customSelectArrow}>▼</span>
                </div>
                {referenciaAbierta && (
                  <div className={s.customSelectOptions}>
                    <div className={s.customSelectOption} onMouseDown={(e) => { e.preventDefault(); handleReferenciaChange(''); setReferenciaAbierta(false); }}>
                      <span className={s.customSelectOptionPlaceholder}>Seleccione una referencia</span>
                    </div>
                    {referencias.map(r => (
                      <div key={r.ref} className={s.customSelectOption} onMouseDown={(e) => { e.preventDefault(); handleReferenciaChange(r.ref); setReferenciaAbierta(false); }}>
                        <span>{r.ref} - {r.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={f.field}>
                <label className={f.label}>Prenda *</label>
                <input className={f.input} value={formValues.prenda} onChange={e => setForm({ prenda: e.target.value })} placeholder="Nombre de la prenda" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>N° Orden *</label>
                <input className={f.input} value={formValues.numeroOrden} onChange={e => setForm({ numeroOrden: e.target.value })} placeholder="Ej: PED-000001" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Cliente *</label>
                <input className={f.input} value={formValues.cliente} onChange={e => setForm({ cliente: e.target.value })} placeholder="Ej: Distribuidora del Norte" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Devolución</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Cantidad *</label>
                <input className={f.input} type="number" min="1" value={formValues.cantidad} onChange={e => setForm({ cantidad: e.target.value })} placeholder="0" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Cantidad inspeccionada</label>
                <input className={f.input} type="number" min="0" value={formValues.cantidadInspeccionada} onChange={e => setForm({ cantidadInspeccionada: e.target.value })} placeholder="0" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Destino previsto *</label>
                <select className={f.select} value={formValues.destino} onChange={e => setForm({ destino: e.target.value as Devolucion['destino'] })}>
                  {(['Reingreso a inventario', 'Reparación', 'Descarte', 'Devolución a proveedor'] as Devolucion['destino'][]).map(d => (<option key={d} value={d}>{d}</option>))}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>Fecha de devolución *</label>
                <input className={f.input} type="date" value={formValues.fechaDevolucion} onChange={e => setForm({ fechaDevolucion: e.target.value })} />
              </div>
            </div>
            <div className={f.field}>
              <label className={f.label}>Motivo</label>
              <input className={f.input} value={formValues.motivo} onChange={e => setForm({ motivo: e.target.value })} placeholder="Ej: Defecto de confección" />
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Opcional</h3>
            <div className={f.field}>
              <label className={f.label}>Taller</label>
              <select className={f.select} value={formValues.responsable} onChange={e => setForm({ responsable: e.target.value })}>
                <option value="">Seleccione un taller</option>
                {talleres.map(t => (<option key={t.id} value={t.nombre}>{t.nombre}</option>))}
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>Observaciones</label>
              <textarea className={f.textarea} value={formValues.observaciones} onChange={e => setForm({ observaciones: e.target.value })} placeholder="Notas adicionales..." rows={3} />
            </div>
          </div>

          <ModalFooter secondary={{ label: 'Cancelar', onClick: closeModal, disabled: saving }} primary={{ label: 'Registrar devolución', type: 'submit', loading: saving, leftIcon: <Save size={16} /> }} />
        </form>
      </Modal>

      <Modal open={editModalOpen} onClose={closeEditModal} title="Editar Devolución" description="Modifica los datos de la devolución" size="lg" variant="form">
        <form onSubmit={handleEditSubmit} className={f.form}>
          {formError && <div className={f.formError}>{formError}</div>}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Datos básicos</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Referencia *</label>
                <select className={f.select} value={formValues.referencia} onChange={e => handleReferenciaChange(e.target.value)}>
                  <option value="">Seleccione una referencia</option>
                  {referencias.map(r => (<option key={r.ref} value={r.ref}>{r.ref} - {r.nombre}</option>))}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>Prenda *</label>
                <input className={f.input} value={formValues.prenda} onChange={e => setForm({ prenda: e.target.value })} readOnly />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>N° Orden *</label>
                <input className={f.input} value={formValues.numeroOrden} onChange={e => setForm({ numeroOrden: e.target.value })} />
              </div>
              <div className={f.field}>
                <label className={f.label}>Cliente *</label>
                <input className={f.input} value={formValues.cliente} onChange={e => setForm({ cliente: e.target.value })} />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Devolución</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Cantidad *</label>
                <input className={f.input} type="number" min="1" value={formValues.cantidad} onChange={e => setForm({ cantidad: e.target.value })} />
              </div>
              <div className={f.field}>
                <label className={f.label}>Cantidad inspeccionada</label>
                <input className={f.input} type="number" min="0" value={formValues.cantidadInspeccionada} onChange={e => setForm({ cantidadInspeccionada: e.target.value })} />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Destino previsto</label>
                <select className={f.select} value={formValues.destino} onChange={e => setForm({ destino: e.target.value as Devolucion['destino'] })}>{(['Reingreso a inventario', 'Reparación', 'Descarte', 'Devolución a proveedor'] as Devolucion['destino'][]).map(d => (<option key={d} value={d}>{d}</option>))}</select></div>
              <div className={f.field}>
                <label className={f.label}>Fecha de devolución</label>
                <input className={f.input} type="date" value={formValues.fechaDevolucion} onChange={e => setForm({ fechaDevolucion: e.target.value })} />
              </div>
            </div>
            <div className={f.field}>
              <label className={f.label}>Motivo</label>
              <input className={f.input} value={formValues.motivo} onChange={e => setForm({ motivo: e.target.value })} />
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Opcional</h3>
            <div className={f.field}>
              <label className={f.label}>Taller</label>
              <select className={f.select} value={formValues.responsable} onChange={e => setForm({ responsable: e.target.value })}>
                <option value="">Seleccione un taller</option>
                {talleres.map(t => (<option key={t.id} value={t.nombre}>{t.nombre}</option>))}
              </select>
            </div>
            <div className={f.field}>
              <label className={f.label}>Observaciones</label>
              <textarea className={f.textarea} value={formValues.observaciones} onChange={e => setForm({ observaciones: e.target.value })} rows={3} />
            </div>
          </div>

          <ModalFooter secondary={{ label: 'Cancelar', onClick: closeEditModal, disabled: saving }} primary={{ label: 'Guardar cambios', type: 'submit', loading: saving, leftIcon: <Save size={16} /> }} />
        </form>
      </Modal>

      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Eliminar devolución" description="Esta acción no se puede deshacer" size="sm" variant="default">
        <div className={s.deleteBody}>
          <AlertTriangle size={40} className={s.deleteIcon} />
          <p>¿Deseas eliminar la devolución <strong>{deleteConfirm?.numeroDevolucion}</strong>?</p>
        </div>
        <ModalFooter secondary={{ label: 'Cancelar', onClick: () => setDeleteConfirm(null) }} primary={{ label: 'Eliminar', onClick: handleDelete, variant: 'danger', leftIcon: <Trash2 size={16} /> }} />
      </Modal>
    </div>
  );
};

function getFriendlyReturnError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Tu sesión ha expirado. Inicia sesión nuevamente.';
    if (err.status === 403) return 'No tienes permisos para realizar esta acción.';
    if (err.status === 404) return 'No fue posible cargar las devoluciones. Inténtalo nuevamente.';
    if (err.message) return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'No fue posible realizar la acción. Inténtalo nuevamente.';
}
