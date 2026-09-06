import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Edit, Trash2, Package, CheckCircle2, Clock, XCircle, User, MapPin } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import s from './AdminDomicilios.module.css';
import f from '@/styles/Form.module.css';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '../../../shared/ui/DataTable';
import { domiciliariosApi, type Domiciliario } from '@/infrastructure/api/domiciliariosApi';
import { usersApi, type Usuario } from '@/infrastructure/api/usersApi';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { StatusBadge } from '@/shared/ui/StatusBadge';

export const AdminDomicilios: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [domiciliarios, setDomiciliarios] = useState<Domiciliario[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [formZona, setFormZona] = useState('');
  const [formVehiculo, setFormVehiculo] = useState('');
  const [formCapacidad, setFormCapacidad] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchDomiciliarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await domiciliariosApi.list({ limit: 100 });
      setDomiciliarios(result?.items ?? []);
    } catch {
      setError('No se pudieron cargar los domiciliarios');
      toast.error('No se pudieron cargar los domiciliarios');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchUsuarios = useCallback(async () => {
    try {
      const data = await usersApi.list({ limit: 100, role: 'DOMICILIARIO' });
      setUsuarios(data);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    void fetchDomiciliarios();
    void fetchUsuarios();
  }, [fetchDomiciliarios, fetchUsuarios]);

  const openEdit = (item: Domiciliario) => {
    setEditingId(item.id);
    setFormZona(item.zona ?? '');
    setFormVehiculo(item.vehiculo ?? '');
    setFormCapacidad(item.capacidad?.toString() ?? '');
    setEditOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    setSaving(true);
    try {
      const updated = await domiciliariosApi.update(editingId, {
        zona: formZona || undefined,
        vehiculo: formVehiculo || undefined,
        capacidad: formCapacidad ? Number(formCapacidad) : undefined,
      });
      setDomiciliarios(prev => prev.map(d => (d.id === editingId ? updated : d)));
      toast.success('Domiciliario actualizado');
      setEditOpen(false);
      setEditingId(null);
    } catch {
      toast.error('No se pudo actualizar el domiciliario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await domiciliariosApi.update(deleteId, { activo: false });
      setDomiciliarios(prev => prev.filter(d => d.id !== deleteId));
      toast.success('Domiciliario eliminado');
      setDeleteId(null);
    } catch {
      toast.error('No se pudo eliminar el domiciliario');
    } finally {
      setSaving(false);
    }
  };

  const filteredDomiciliarios = domiciliarios.filter(d => {
    const usuario = usuarios.find(u => u.id === d.userId);
    const nombre = usuario?.nombre ?? '';
    const email = usuario?.email ?? '';
    return nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) || email.toLowerCase().includes(debouncedSearch.toLowerCase());
  });

  const stats = {
    total: domiciliarios.length,
    activos: domiciliarios.filter(d => d.activo).length,
    inactivos: domiciliarios.filter(d => !d.activo).length,
    pendientes: domiciliarios.filter(d => !d.zona).length,
  };

  const columns: DataTableColumn<Domiciliario>[] = [
    { key: 'userId', header: 'Usuario', sortable: true, render: (item) => {
      const usuario = usuarios.find(u => u.id === item.userId);
      return usuario?.nombre ?? item.userId;
    }},
    { key: 'zona', header: 'Zona', sortable: true },
    { key: 'vehiculo', header: 'Vehículo', sortable: true },
    { key: 'capacidad', header: 'Capacidad', sortable: true },
    {
      key: 'activo',
      header: 'Estado',
      render: (item) => (
        <StatusBadge status={item.activo ? 'Activo' : 'Inactivo'} />
      ),
    },
  ];

  const detailPanel: DataTableDetailPanel<Domiciliario> = {
    title: (item) => `Domiciliario ${item.id}`,
    size: 'lg',
    header: (item) => ({
      icon: <User size={18} />,
      title: 'Domiciliario',
      code: item.id,
      subtitle: item.zona ?? 'Sin zona',
      meta: item.vehiculo ?? 'Sin vehículo',
      status: item.activo ? 'Activo' : 'Inactivo',
      badgeVariant: item.activo ? 'success' : 'default',
    }),
    kpis: (item) => [
      { label: 'Capacidad', value: item.capacidad?.toString() ?? 'N/A', icon: <Package size={16} />, tone: 'primary' as const },
      { label: 'Zona', value: item.zona ?? 'N/A', icon: <MapPin size={16} />, tone: 'info' as const },
    ],
    render: (item) => {
      const usuario = usuarios.find(u => u.id === item.userId);
      return (
        <div className={s.detailPanel}>
          <div className={s.detailRow}><span>Usuario:</span> {usuario?.nombre ?? item.userId}</div>
          <div className={s.detailRow}><span>Email:</span> {usuario?.email ?? '-'}</div>
          <div className={s.detailRow}><span>Vehículo:</span> {item.vehiculo ?? '-'}</div>
          <div className={s.detailRow}><span>Capacidad:</span> {item.capacidad ?? '-'}</div>
        </div>
      );
    },
  };

  const actions: DataTableAction<Domiciliario>[] = [
    { label: 'Editar', icon: <Edit size={14} />, onClick: openEdit },
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: (item) => setDeleteId(item.id), danger: true },
  ];

  if (loading) {
    return (
      <div>
        <div className={s.header}>
          <div>
            <h1 className={s.pageTitle}>Domiciliarios</h1>
            <p className={s.pageSubtitle}>Gestión del equipo de entregas</p>
          </div>
        </div>
        <div className={s.statsGrid}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className={s.statCard}>
              <div className={s.statIcon} style={{ opacity: 0.3 }}><Package size={20} /></div>
              <div className={s.statValue} style={{ opacity: 0.3 }}>—</div>
              <div className={s.statLabel} style={{ opacity: 0.3 }}>Cargando...</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className={s.header}>
          <div>
            <h1 className={s.pageTitle}>Domiciliarios</h1>
            <p className={s.pageSubtitle}>Gestión del equipo de entregas</p>
          </div>
        </div>
        <div className={s.statCard} style={{ textAlign: 'center', color: 'var(--color-danger)' }}>
          <p>{error}</p>
          <Button size="sm" onClick={fetchDomiciliarios} style={{ marginTop: 12 }}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Domiciliarios</h1>
          <p className={s.pageSubtitle}>Gestión del equipo de entregas</p>
        </div>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar domiciliarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <div className={s.statsGrid}>
        <div className={s.statCard}>
          <div className={s.statIcon}><Package size={20} /></div>
          <div className={s.statValue}>{stats.total}</div>
          <div className={s.statLabel}>Total</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon}><CheckCircle2 size={20} /></div>
          <div className={s.statValue}>{stats.activos}</div>
          <div className={s.statLabel}>Activos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon}><Clock size={20} /></div>
          <div className={s.statValue}>{stats.inactivos}</div>
          <div className={s.statLabel}>Inactivos</div>
        </div>
        <div className={s.statCard}>
          <div className={s.statIcon}><XCircle size={20} /></div>
          <div className={s.statValue}>{stats.pendientes}</div>
          <div className={s.statLabel}>Pendientes</div>
        </div>
      </div>

      <div className={s.tableWrapper}>
        <DataTable<Domiciliario>
          data={filteredDomiciliarios}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}
          enableSorting={true}
          toolbarLeft={null}
          maxVisibleColumns={5} enableExport={false} enableRowSelection={false}
        />
      </div>

      <Modal open={editOpen} onClose={() => { setEditOpen(false); setEditingId(null); }} title="Editar domiciliario" description="Modifica los datos del domiciliario." size="lg" variant="form">
        <form id="editDomiciliarioForm" className={f.form} onSubmit={handleUpdate}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información del domiciliario</h3>
            <div className={f.field}>
              <label className={f.label}>Usuario</label>
              <input type="text" className={f.input} value={editingId ? (usuarios.find(u => u.id === domiciliarios.find(d => d.id === editingId)?.userId)?.nombre ?? '') : ''} disabled />
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Zona</label>
                <input type="text" className={f.input} value={formZona} onChange={e => setFormZona(e.target.value)} />
              </div>
              <div className={f.field}>
                <label className={f.label}>Vehículo</label>
                <input type="text" className={f.input} value={formVehiculo} onChange={e => setFormVehiculo(e.target.value)} />
              </div>
            </div>
            <div className={f.field}>
              <label className={f.label}>Capacidad</label>
              <input type="number" className={f.input} value={formCapacidad} onChange={e => setFormCapacidad(e.target.value)} min={1} />
            </div>
          </div>
          <div className={f.formActions}>
            <Button variant="secondary" type="button" onClick={() => { setEditOpen(false); setEditingId(null); }} disabled={saving}>Cancelar</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Eliminar domiciliario" description="Esta acción no se puede deshacer. El registro de domiciliario será eliminado." size="sm">
        <div className={f.formActions}>
          <Button variant="secondary" onClick={() => setDeleteId(null)} disabled={saving}>Cancelar</Button>
          <Button variant="danger" onClick={handleDelete} disabled={saving}>{saving ? 'Eliminando...' : 'Eliminar'}</Button>
        </div>
      </Modal>
    </div>
  );
};
