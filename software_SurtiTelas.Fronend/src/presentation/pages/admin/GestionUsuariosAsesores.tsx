import React, { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, User, Users, BarChart3, Calendar } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import s from './GestionUsuariosAsesores.module.css';
import f from '@/styles/Form.module.css';
import { Button } from '../../../shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '../../../shared/ui/DataTable';
import { usersApi, type Usuario } from '@/infrastructure/api/usersApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { ESTADOS_GENERALES } from '@/shared/constants/options';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface Asesor {
  id: string;
  nombre: string;
  apellidos?: string | null;
  email: string;
  tel: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  clientes: number;
  comisiones: string | null;
  estado: 'Activo' | 'Inactivo';
}

const toAsesor = (u: Usuario): Asesor => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  tel: null,
  clientes: 0,
  comisiones: null,
  estado: 'Activo',
});

export const GestionUsuariosAsesores: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedAsesor, setSelectedAsesor] = useState<Asesor | null>(null);
  const [items, setItems] = useState<Asesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [deleteConfirm, setDeleteConfirm] = useState<Asesor | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formRef = useRef<HTMLFormElement>(null);

  const validateAsesorForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};
    const nombre = String(formData.get('nombre') ?? '').trim();
    const apellidos = String(formData.get('apellidos') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const tel = String(formData.get('tel') ?? '').trim();
    const direccion = String(formData.get('direccion') ?? '').trim();
    const tipoDocumento = String(formData.get('tipoDocumento') ?? '').trim();
    const numeroDocumento = String(formData.get('numeroDocumento') ?? '').trim();

    if (!nombre || nombre.length < 3) newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    if (!apellidos || apellidos.length < 3) newErrors.apellidos = 'Los apellidos deben tener al menos 3 caracteres';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido';
    if (tel && !/^[0-9]{7,11}$/.test(tel)) newErrors.tel = 'Teléfono inválido (7-11 dígitos)';
    if (!direccion || direccion.length < 5) newErrors.direccion = 'La dirección debe tener al menos 5 caracteres';

    if (!selectedAsesor) {
      if (!tipoDocumento) newErrors.tipoDocumento = 'Selecciona un tipo de documento';
      if (!numeroDocumento || numeroDocumento.length < 1) newErrors.numeroDocumento = 'Número de documento es obligatorio';
      const password = String(formData.get('password') ?? '');
      const confirmPassword = String(formData.get('confirmPassword') ?? '');
      if (!password) newErrors.password = 'La contraseña es obligatoria';
      else if (password.length < 8) newErrors.password = 'Mínimo 8 caracteres';
      else if (!/[A-Z]/.test(password)) newErrors.password = 'Debe contener una mayúscula';
      else if (!/[a-z]/.test(password)) newErrors.password = 'Debe contener una minúscula';
      else if (!/[0-9]/.test(password)) newErrors.password = 'Debe contener un número';
      if (!confirmPassword) newErrors.confirmPassword = 'Confirma la contraseña';
      else if (password !== confirmPassword) newErrors.confirmPassword = 'Las contraseñas no coinciden';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const fetchAsesores = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list();
      const asesores = data
        .filter((u) => u.rol === 'ASESOR')
        .map(toAsesor);
      setItems(asesores);
    } catch {
      setError('No se pudieron cargar los asesores');
      toast.error('No se pudieron cargar los asesores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAsesores();
  }, []);

  const filteredAsesores = items.filter(a =>
    a.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    a.email.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  const handleSubmitAsesor = async () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const nombre = String(fd.get('nombre') ?? '').trim();
    const apellidos = String(fd.get('apellidos') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const tel = String(fd.get('tel') ?? '').trim();
    const direccion = String(fd.get('direccion') ?? '').trim();
    const tipoDocumento = String(fd.get('tipoDocumento') ?? '').trim();
    const numeroDocumento = String(fd.get('numeroDocumento') ?? '').trim();
    const estado = (String(fd.get('estado') ?? 'Activo') || 'Activo') as Asesor['estado'];
    const password = String(fd.get('password') ?? '');

    if (!validateAsesorForm(fd)) {
      toast.error('Corrige los errores en el formulario');
      return;
    }
    setSaving(true);
    try {
      if (selectedAsesor) {
        await usersApi.update(selectedAsesor.id, { nombre, apellidos, telefono: tel || undefined, direccion: direccion || undefined, tipoDocumento: tipoDocumento || undefined, numeroDocumento: numeroDocumento || undefined });
        setItems(prev => prev.map(it => it.id === selectedAsesor.id ? { ...it, nombre, apellidos, tel: tel || null, direccion: direccion || null, tipoDocumento: tipoDocumento || null, numeroDocumento: numeroDocumento || null, estado } : it));
        toast.success('Asesor actualizado');
      } else {
        const created = await usersApi.create({ email, password, nombre, apellidos, role: 'ASESOR', telefono: tel || undefined, direccion: direccion || undefined, tipoDocumento: tipoDocumento || undefined, numeroDocumento: numeroDocumento || undefined });
        const nuevo: Asesor = {
          id: created.id,
          nombre,
          apellidos,
          email,
          tel: tel || null,
          direccion: direccion || null,
          tipoDocumento: tipoDocumento || null,
          numeroDocumento: numeroDocumento || null,
          clientes: 0,
          comisiones: null,
          estado,
        };
        setItems(prev => [nuevo, ...prev]);
        toast.success('Asesor creado');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar asesor');
    } finally {
      setSaving(false);
      setModalOpen(false);
      setSelectedAsesor(null);
      void fetchAsesores();
    }
  };

  const columns: DataTableColumn<Asesor>[] = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'clientes', header: 'Clientes', sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<Asesor> = {
    title: item => `Detalle: ${item.nombre}`,
    size: 'lg',
    header: item => ({
      icon: <User size={18} aria-hidden="true" focusable="false" />,
      title: 'Asesor comercial',
      code: item.id,
      subtitle: item.email,
      meta: `${item.clientes} clientes activos`,
      status: item.estado,
      badgeVariant: item.estado === 'Activo' ? 'success' : 'default',
    }),
    kpis: item => [
      { label: 'Clientes', value: item.clientes, icon: <Users size={16} aria-hidden="true" focusable="false" />, tone: 'primary' },
      { label: 'Comisiones', value: item.comisiones, icon: <BarChart3 size={16} aria-hidden="true" focusable="false" />, tone: 'success' },
      { label: 'Estado', value: item.estado, icon: <Calendar size={16} aria-hidden="true" focusable="false" />, tone: item.estado === 'Activo' ? 'success' : 'default' },
    ],
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Teléfono:</span> {item.tel || '—'}</div>
        <div className={s.detailRow}><span>Comisiones:</span> {item.comisiones || 'Sin dato'}</div>
        <div className={s.detailRow}><span>Email:</span> {item.email}</div>
        <div className={s.detailRow}><span>Clientes:</span> {item.clientes}</div>
      </div>
    ),
  };

  const actions: DataTableAction<Asesor>[] = [
    { label: 'Editar', icon: <Edit size={14} aria-hidden="true" focusable="false" />, onClick: (item) => { setSelectedAsesor(item); setModalOpen(true); } },
    { label: 'Eliminar', icon: <Trash2 size={14} aria-hidden="true" focusable="false" />, danger: true, onClick: (item) => setDeleteConfirm(item) },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Asesores</h1>
          <p className={s.pageSubtitle}>Gestión del equipo de asesores comerciales</p>
        </div>
        <Button onClick={() => setModalOpen(true)} leftIcon={<Plus size={16} />} >
          Nuevo Asesor
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar asesores..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <div className={s.tableWrapper}>
        <DataTable
          data={filteredAsesores}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}
          enableSorting
          toolbarLeft={null}
          maxVisibleColumns={5}
          emptyMessage={loading ? 'Cargando asesores...' : error ? error : 'No se encontraron asesores'}
          enableExport={false}
          enableRowSelection={false}
        />
      </div>

      {modalOpen && (
        <div className={s.modalOverlay}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {selectedAsesor ? 'Editar Asesor' : 'Nuevo Asesor'}
              </h2>
              <button className={s.closeBtn} onClick={() => { setModalOpen(false); setSelectedAsesor(null); }}>×</button>
            </div>
             <div className={s.modalBody}>
              <form className={f.form} ref={formRef} onSubmit={(e) => { e.preventDefault(); void handleSubmitAsesor(); }}>
                <div className={f.formSection}>
                  <h3 className={f.sectionTitle}>Información personal</h3>
                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Nombre</label>
                      <input type="text" className={`${f.input} ${errors.nombre ? f.inputError : ''}`} name="nombre" defaultValue={selectedAsesor?.nombre} minLength={3} />
                      {errors.nombre && <span className={f.errorText}>{errors.nombre}</span>}
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Apellidos</label>
                      <input type="text" className={`${f.input} ${errors.apellidos ? f.inputError : ''}`} name="apellidos" defaultValue={selectedAsesor?.apellidos ?? ''} minLength={3} />
                      {errors.apellidos && <span className={f.errorText}>{errors.apellidos}</span>}
                    </div>
                  </div>
                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Correo electrónico</label>
                      <input type="email" className={`${f.input} ${errors.email ? f.inputError : ''}`} name="email" defaultValue={selectedAsesor?.email} />
                      {errors.email && <span className={f.errorText}>{errors.email}</span>}
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Teléfono</label>
                      <input type="tel" className={`${f.input} ${errors.tel ? f.inputError : ''}`} name="tel" defaultValue={selectedAsesor?.tel ?? ''} maxLength={11} inputMode="numeric" />
                      {errors.tel && <span className={f.errorText}>{errors.tel}</span>}
                    </div>
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Dirección</label>
                    <input type="text" className={`${f.input} ${errors.direccion ? f.inputError : ''}`} name="direccion" defaultValue={selectedAsesor?.direccion ?? ''} placeholder="Calle, ciudad, código postal" minLength={5} />
                    {errors.direccion && <span className={f.errorText}>{errors.direccion}</span>}
                  </div>
                </div>

                {!selectedAsesor && (
                  <div className={f.formSection}>
                    <h3 className={f.sectionTitle}>Documento</h3>
                    <div className={f.formRow}>
                      <div className={f.field}>
                        <label className={f.label}>Tipo de documento</label>
                        <select className={`${f.select} ${errors.tipoDocumento ? f.inputError : ''}`} name="tipoDocumento" defaultValue="">
                          <option value="" disabled>Selecciona...</option>
                          <option value="CC">C.C. - Cédula de ciudadanía</option>
                          <option value="TI">T.I. - Tarjeta de identidad</option>
                          <option value="CE">C.E. - Cédula de extranjería</option>
                          <option value="PP">P.P. - Pasaporte</option>
                          <option value="NIT">NIT</option>
                          <option value="PPT">P.P.T. - Pasaporte especial</option>
                        </select>
                        {errors.tipoDocumento && <span className={f.errorText}>{errors.tipoDocumento}</span>}
                      </div>
                      <div className={f.field}>
                        <label className={f.label}>Número de documento</label>
                        <input type="text" className={`${f.input} ${errors.numeroDocumento ? f.inputError : ''}`} name="numeroDocumento" defaultValue="" maxLength={15} />
                        {errors.numeroDocumento && <span className={f.errorText}>{errors.numeroDocumento}</span>}
                      </div>
                    </div>
                  </div>
                )}

                {!selectedAsesor && (
                  <div className={f.formSection}>
                    <h3 className={f.sectionTitle}>Seguridad</h3>
                    <div className={f.formRow}>
                      <div className={f.field}>
                        <label className={f.label}>Contraseña</label>
                        <input type="password" className={`${f.input} ${errors.password ? f.inputError : ''}`} name="password" minLength={8} autoComplete="new-password" />
                        {errors.password && <span className={f.errorText}>{errors.password}</span>}
                        <p className={s.hint}>Mínimo 8 caracteres, con mayúscula, minúscula y número</p>
                      </div>
                      <div className={f.field}>
                        <label className={f.label}>Confirmar contraseña</label>
                        <input type="password" className={`${f.input} ${errors.confirmPassword ? f.inputError : ''}`} name="confirmPassword" minLength={8} autoComplete="new-password" />
                        {errors.confirmPassword && <span className={f.errorText}>{errors.confirmPassword}</span>}
                      </div>
                    </div>
                  </div>
                )}

                <div className={f.formSection}>
                  <h3 className={f.sectionTitle}>Estado</h3>
                  <div className={f.field} style={{ maxWidth: '200px' }}>
                    <label className={f.label}>Estado del asesor</label>
                    <select className={f.select} name="estado" defaultValue={selectedAsesor?.estado ?? 'Activo'}>
                      {ESTADOS_GENERALES.map(es => (
                        <option key={es} value={es}>{es}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <ModalFooter
                  actions={[
                    { label: 'Cancelar', variant: 'secondary', type: 'button', onClick: () => { setModalOpen(false); setSelectedAsesor(null); } },
                    {
                      label: saving ? 'Guardando...' : selectedAsesor ? 'Guardar cambios' : 'Crear asesor',
                      type: 'submit',
                      loading: saving,
                      disabled: saving,
                    },
                  ]}
                />
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
            await usersApi.remove(deleteConfirm.id);
            setItems(prev => prev.filter(it => it.id !== deleteConfirm.id));
            toast.success('Asesor eliminado');
          } catch {
            toast.error('No se pudo eliminar el asesor');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar asesor"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};

