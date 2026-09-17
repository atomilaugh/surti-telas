import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ToggleLeft, Eye, User, Phone, Mail, MapPin, Package } from 'lucide-react';
import s from './RegistroTalleres.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { workshopsApi, type Workshop } from '@/infrastructure/api/workshopsApi';
import { usersApi, type Usuario } from '@/infrastructure/api/usersApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { DetailModal } from '@/shared/ui/DetailModal';

interface Taller {
  id: string;
  nombre: string;
  direccion: string;
  ciudad: string;
  telefono: string;
  email: string;
  capacidad: number;
  ocupacion: number;
  encargadoId?: string;
  encargadoNombre?: string;
  estado: 'Activo' | 'Inactivo';
}

function resolverNombreFromList(usuarios: Usuario[], userId?: string): string {
  if (!userId) return '';
  const user = usuarios.find(u => u.id === userId);
  return user ? (user.apellidos ? `${user.nombre} ${user.apellidos}` : user.nombre) : '';
}

function toTaller(w: Workshop, usuarios: Usuario[]): Taller {
  return {
    id: w.id,
    nombre: w.nombre,
    direccion: w.direccion ?? '',
    ciudad: w.ciudad ?? '',
    telefono: w.telefono ?? '',
    email: w.email ?? '',
    capacidad: w.capacidad ?? 0,
    ocupacion: w.ocupacion ?? 0,
    encargadoId: w.encargadoId,
    encargadoNombre: resolverNombreFromList(usuarios, w.encargadoId),
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
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);

  const [formNombre, setFormNombre] = useState('');
  const [formCapacidad, setFormCapacidad] = useState('');
  const [formTelefono, setFormTelefono] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formDireccion, setFormDireccion] = useState('');
  const [formCiudad, setFormCiudad] = useState('');
  const [formEncargadoId, setFormEncargadoId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLFormElement>(null);

  const resolverNombre = (userId?: string) => resolverNombreFromList(usuarios, userId);

  useEffect(() => {
    const fetchUsuarios = async () => {
      try {
        const data = await usersApi.list();
        setUsuarios(data);
      } catch {
        /* ignore */
      }
    };
    void fetchUsuarios();
  }, []);

  const fetchTalleres = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workshopsApi.list();
      setItems(data.map(w => toTaller(w, usuarios)));
    } catch {
      setError('No se pudieron cargar los talleres');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchTalleres();
  }, []);

  useEffect(() => {
    if (usuarios.length > 0) {
      void fetchTalleres();
    }
  }, [usuarios]);

  const filteredTalleres = items.filter(t =>
    t.nombre.toLowerCase().includes(search.toLowerCase()) ||
    t.ciudad.toLowerCase().includes(search.toLowerCase())
  );

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedTaller(null);
    setFormNombre('');
    setFormCapacidad('');
    setFormTelefono('');
    setFormEmail('');
    setFormDireccion('');
    setFormCiudad('');
    setFormEncargadoId('');
  };

  const openModal = (taller?: Taller) => {
    if (taller) {
      setSelectedTaller(taller);
      setFormNombre(taller.nombre);
      setFormCapacidad(String(taller.capacidad ?? 0));
      setFormTelefono(taller.telefono ?? '');
      setFormEmail(taller.email ?? '');
      setFormDireccion(taller.direccion ?? '');
      setFormCiudad(taller.ciudad ?? '');
      setFormEncargadoId(taller.encargadoId ?? '');
    } else {
      setSelectedTaller(null);
      setFormNombre('');
      setFormCapacidad('');
      setFormTelefono('');
      setFormEmail('');
      setFormDireccion('');
      setFormCiudad('');
      setFormEncargadoId('');
    }
    setModalOpen(true);
  };

  const handleSubmitTaller = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formNombre || formNombre.length < 3) newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;
    try {
      const payload = {
        nombre: formNombre.trim(),
        direccion: formDireccion.trim() || undefined,
        ciudad: formCiudad.trim() || undefined,
        telefono: formTelefono.trim() || undefined,
        email: formEmail.trim() || undefined,
        capacidad: Number(formCapacidad) || undefined,
        encargadoId: formEncargadoId || undefined,
      };
      if (selectedTaller) {
        const actualizado = await workshopsApi.update(selectedTaller.id, payload);
        const updated = { ...toTaller(actualizado, usuarios), encargadoNombre: resolverNombre(actualizado.encargadoId) };
        setItems(prev => prev.map(it => it.id === selectedTaller.id ? updated : it));
        toast.success('Taller actualizado');
      } else {
        const nuevo = await workshopsApi.create(payload);
        const nuevoConNombre = { ...toTaller(nuevo, usuarios), encargadoNombre: resolverNombre(nuevo.encargadoId) };
        setItems(prev => [nuevoConNombre, ...prev]);
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
      setItems(prev => prev.map(it => it.id === id ? { ...toTaller(actualizado, usuarios), encargadoNombre: resolverNombre(actualizado.encargadoId) } : it));
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
          { key: 'encargado', header: 'Responsable', width: '160px', render: (t) => (
            <div className="flex items-center gap-1.5">
              {t.encargadoNombre ? (
                <>
                  <User size={12} />
                  <span className="text-xs text-[var(--color-text-primary)]">{t.encargadoNombre}</span>
                </>
              ) : (
                <span className="text-xs text-[var(--color-text-muted)]">—</span>
              )}
            </div>
          )},
          { key: 'ciudad', header: 'Ubicación', width: '140px', render: (t) => (
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
                      <input type="text" className={`${f.input} ${errors.nombre ? f.inputError : ''}`} value={formNombre} onChange={e => { setFormNombre(e.target.value); delete errors.nombre; setErrors({...errors}); }} required />
                      {errors.nombre && <span className={f.errorText}>{errors.nombre}</span>}
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Capacidad</label>
                      <input type="number" className={`${f.input} ${errors.capacidad ? f.inputError : ''}`} value={formCapacidad} onChange={e => { setFormCapacidad(e.target.value); delete errors.capacidad; setErrors({...errors}); }} min="0" />
                      {errors.capacidad && <span className={f.errorText}>{errors.capacidad}</span>}
                    </div>
                  </div>

                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Teléfono</label>
                      <input type="tel" className={f.input} value={formTelefono} onChange={e => setFormTelefono(e.target.value)} placeholder="Ej: +57 300 000 0000" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Email</label>
                      <input type="email" className={f.input} value={formEmail} onChange={e => setFormEmail(e.target.value)} placeholder="taller@correo.com" />
                    </div>
                  </div>

                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Dirección</label>
                      <input type="text" className={f.input} value={formDireccion} onChange={e => setFormDireccion(e.target.value)} placeholder="Calle / Carrera / Avenida" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Ciudad</label>
                      <input type="text" className={f.input} value={formCiudad} onChange={e => setFormCiudad(e.target.value)} placeholder="Ciudad" />
                    </div>
                  </div>

                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Responsable / Contacto</label>
                      <select
                        className={`${f.select} ${errors.encargado ? f.inputError : ''}`}
                        value={formEncargadoId}
                        onChange={e => { setFormEncargadoId(e.target.value); delete errors.encargado; setErrors({...errors}); }}
                      >
                        <option value="">Sin responsable</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.apellidos ? `${u.nombre} ${u.apellidos}` : u.nombre}
                          </option>
                        ))}
                      </select>
                      {errors.encargado && <span className={f.errorText}>{errors.encargado}</span>}
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

      <DetailModal
        children={null}
        open={detailModalOpen}
        onClose={closeDetail}
        title={`Taller ${detailTaller?.id || ''}`}
        subtitle={detailTaller?.nombre}
        size="lg"
        header={{
          icon: <Package size={18} />,
          status: detailTaller ? <StatusBadge status={detailTaller.estado} /> : undefined,
        }}
        sections={[
          {
            title: 'Información del taller',
            fields: [
              { label: 'Nombre', value: detailTaller?.nombre || '—', icon: <User size={16} /> },
              { label: 'Responsable', value: detailTaller?.encargadoNombre || '—', icon: <User size={16} /> },
              { label: 'Teléfono', value: detailTaller?.telefono || '—', icon: <Phone size={16} /> },
              { label: 'Email', value: detailTaller?.email || '—', icon: <Mail size={16} /> },
              { label: 'Ciudad', value: detailTaller?.ciudad || '—', icon: <MapPin size={16} /> },
              { label: 'Capacidad', value: detailTaller?.capacidad, icon: <Package size={16} /> },
              { label: 'Dirección', value: detailTaller?.direccion || '—', icon: <MapPin size={16} />, fullWidth: true },
            ],
          },
        ]}
        footer={
          <Button variant="secondary" onClick={closeDetail}>Cerrar</Button>
        }
      />
    </div>
  );
};
