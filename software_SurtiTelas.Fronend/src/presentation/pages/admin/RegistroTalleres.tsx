import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ToggleLeft, Eye } from 'lucide-react';
import s from './RegistroTalleres.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { workshopsApi, type Workshop } from '@/infrastructure/api/workshopsApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';

interface Taller {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  capacidad: number;
  ocupacion: number;
  estado: 'Activo' | 'Inactivo';
}

function toTaller(w: Workshop): Taller {
  return {
    id: w.id,
    nombre: w.nombre,
    direccion: w.direccion ?? '',
    ciudad: w.ciudad ?? '',
    telefono: w.telefono ?? '',
    email: w.email ?? '',
    capacidad: w.capacidad ?? 0,
    ocupacion: w.ocupacion ?? 0,
    estado: w.estado,
  };
}

export const AdminRegistroTalleres: React.FC = () => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTaller, setSelectedTaller] = useState<Taller | null>(null);
  const [items, setItems] = useState<Taller[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Taller | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailTaller, setDetailTaller] = useState<Taller | null>(null);

  const [nombre, setNombre] = useState('');
  const [capacidad, setCapacidad] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [direccion, setDireccion] = useState('');
  const [ciudad, setCiudad] = useState('');

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const fetchTalleres = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await workshopsApi.list();
        setItems(data.map(toTaller));
      } catch {
        setError('No se pudieron cargar los talleres');
      } finally {
        setLoading(false);
      }
    };
    void fetchTalleres();
  }, []);

  const filteredTalleres = items.filter(t =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.ciudad.toLowerCase().includes(search.toLowerCase())
  );

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTaller(null);
    setNombre('');
    setCapacidad('');
    setTelefono('');
    setEmail('');
    setDireccion('');
    setCiudad('');
  };

  const openModal = (taller?: Taller) => {
    if (taller) {
      setSelectedTaller(taller);
      setNombre(taller.nombre);
      setCapacidad(String(taller.capacidad ?? 0));
      setTelefono(taller.telefono ?? '');
      setEmail(taller.email ?? '');
      setDireccion(taller.direccion ?? '');
      setCiudad(taller.ciudad ?? '');
    } else {
      setSelectedTaller(null);
      setNombre('');
      setCapacidad('');
      setTelefono('');
      setEmail('');
      setDireccion('');
      setCiudad('');
    }
    setModalOpen(true);
  };

  const handleSubmitTaller = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        nombre: nombre.trim(),
        direccion: direccion.trim() || undefined,
        ciudad: ciudad.trim() || undefined,
        telefono: telefono.trim() || undefined,
        email: email.trim() || undefined,
        capacidad: Number(capacidad) || undefined,
      };
      if (selectedTaller) {
        const actualizado = await workshopsApi.update(selectedTaller.id, payload);
        setItems(prev => prev.map(it => it.id === selectedTaller.id ? toTaller(actualizado) : it));
        toast.success('Taller actualizado');
      } else {
        const nuevo = await workshopsApi.create(payload);
        setItems(prev => [toTaller(nuevo), ...prev]);
        toast.success('Taller creado');
      }
      handleCloseModal();
    } catch {
      toast.error('No fue posible guardar el taller');
    }
  };

  const _handleToggleEstado = async (id: string, estadoActual: string) => {
    const nuevoEstado = estadoActual === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      const actualizado = await workshopsApi.update(id, { estado: nuevoEstado });
      setItems(prev => prev.map(it => it.id === id ? toTaller(actualizado) : it));
      toast.success(`Taller ${id} cambiado a estado: ${nuevoEstado}`);
    } catch {
      toast.error('No fue posible cambiar el estado del taller');
    }
  };

  const handleEliminar = (taller: Taller) => {
    setDeleteConfirm(taller);
  };

  const openDetail = (taller: Taller) => {
    setDetailTaller(taller);
    setDetailModalOpen(true);
  };

  const closeDetail = () => {
    setDetailModalOpen(false);
    setDetailTaller(null);
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Registro de Talleres</h1>
          <p className={s.pageSubtitle}>Gestión de talleres externos</p>
        </div>
        <Button onClick={() => openModal()} leftIcon={<Plus size={16} />} >
          Nuevo Taller
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar talleres..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={100}
          minChars={0}
        />
      </div>

      <DataTable enableExport={false} enableRowSelection={false}
        data={filteredTalleres}
        pageSize={10}
        emptyMessage={loading ? 'Cargando talleres...' : error ? error : 'Sin resultados'}
        actions={(t) => [
          { label: 'Ver detalle', icon: <Eye size={14} />, onClick: () => openDetail(t) },
          ...(t.estado === 'Activo' ? [{ label: 'Desactivar', icon: <ToggleLeft size={14} />, onClick: () => _handleToggleEstado(t.id, t.estado) }] : [{ label: 'Activar', icon: <ToggleLeft size={14} />, onClick: () => _handleToggleEstado(t.id, t.estado) }]),
          { label: 'Editar', icon: <Edit size={14} />, onClick: () => openModal(t) },
          { label: 'Eliminar', icon: <Trash2 size={14} />, danger: true, onClick: () => handleEliminar(t) },
        ]}
        columns={[
          { key: 'nombre', header: 'Taller', render: (t) => (
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-[var(--color-text-primary)]">{t.nombre}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{t.ciudad}</span>
            </div>
          )},
          { key: 'ciudad', header: 'Ubicación', render: (t) => (
            <div className="flex flex-col gap-0.5">
              <span className="text-[var(--color-text-primary)]">{t.ciudad}</span>
              <span className="text-xs text-[var(--color-text-secondary)]">{t.direccion}</span>
            </div>
          )},
          { key: 'ocupacion', header: 'Ocupación', width: '140px', render: (t) => (
            <div className="flex flex-col gap-1">
              <div className="h-1.5 w-full rounded-full bg-[var(--color-bg-elevated)]">
                <div className="h-1.5 rounded-full bg-[var(--color-accent)]" style={{ width: `${t.capacidad ? (t.ocupacion / t.capacidad) * 100 : 0}%` }} />
              </div>
              <span className="text-xs text-[var(--color-text-secondary)]">{t.ocupacion} / {t.capacidad}</span>
            </div>
          )},
          { key: 'estado', header: 'Estado', width: '100px', sortable: true, filterable: true, filterType: 'select', filterOptions: [
            { value: 'Activo', label: 'Activo' },
            { value: 'Inactivo', label: 'Inactivo' },
          ], render: (t) => (
            <StatusBadge status={t.estado} />
          )},
        ]}
      />

      {modalOpen && (
        <div className={s.modalOverlay}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {selectedTaller ? 'Editar Taller' : 'Nuevo Taller'}
              </h2>
              <button className={s.closeBtn} onClick={handleCloseModal}>×</button>
            </div>
            <div className={s.modalBody}>
              <form className={f.form} ref={formRef} onSubmit={handleSubmitTaller}>
                <div className={f.formSection}>
                  <h3 className={f.sectionTitle}>Información del taller</h3>
                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Nombre del Taller</label>
                      <input type="text" className={f.input} value={nombre} onChange={e => setNombre(e.target.value)} required />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Capacidad</label>
                      <input type="number" className={f.input} value={capacidad} onChange={e => setCapacidad(e.target.value)} min="0" />
                    </div>
                  </div>

                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Teléfono</label>
                      <input type="tel" className={f.input} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: +57 300 000 0000" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Email</label>
                      <input type="email" className={f.input} value={email} onChange={e => setEmail(e.target.value)} placeholder="taller@correo.com" />
                    </div>
                  </div>

                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Dirección</label>
                      <input type="text" className={f.input} value={direccion} onChange={e => setDireccion(e.target.value)} placeholder="Calle / Carrera / Avenida" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Ciudad</label>
                      <input type="text" className={f.input} value={ciudad} onChange={e => setCiudad(e.target.value)} placeholder="Ciudad" />
                    </div>
                  </div>
                </div>

                <div className={f.formActions}>
                  <Button type="button" variant="secondary" onClick={handleCloseModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {selectedTaller ? 'Guardar cambios' : 'Crear taller'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await workshopsApi.remove(deleteConfirm.id);
            setItems(prev => prev.filter(it => it.id !== deleteConfirm.id));
            toast.success(`Taller ${deleteConfirm.id} eliminado`);
          } catch {
            toast.error('No se pudo eliminar el taller');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar taller"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />

      {detailModalOpen && detailTaller && (
        <div className={s.modalOverlay} onClick={closeDetail}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Detalle del Taller</h2>
              <button className={s.closeBtn} onClick={closeDetail}>×</button>
            </div>
            <div className={s.modalBody}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Nombre</label>
                  <p style={{ margin: '4px 0', fontWeight: 600 }}>{detailTaller.nombre}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Estado</label>
                  <p style={{ margin: '4px 0' }}>
                    <StatusBadge status={detailTaller.estado} />
                  </p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Teléfono</label>
                  <p style={{ margin: '4px 0' }}>{detailTaller.telefono || '—'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Email</label>
                  <p style={{ margin: '4px 0' }}>{detailTaller.email || '—'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Ciudad</label>
                  <p style={{ margin: '4px 0' }}>{detailTaller.ciudad || '—'}</p>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Capacidad</label>
                  <p style={{ margin: '4px 0' }}>{detailTaller.capacidad}</p>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>Dirección</label>
                  <p style={{ margin: '4px 0' }}>{detailTaller.direccion || '—'}</p>
                </div>
              </div>
            </div>
            <div className={s.modalFooter}>
              <Button variant="secondary" onClick={closeDetail}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
