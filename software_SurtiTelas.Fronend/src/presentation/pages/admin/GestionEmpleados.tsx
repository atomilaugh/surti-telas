import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, User, ShieldCheck, Calendar, Truck } from 'lucide-react';
import { toast } from 'sonner';
import s from './GestionEmpleados.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '../../../shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '../../../shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { EMPLEADO_ESTADOS } from '@/shared/constants/options';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { employeesApi, type Empleado, type EmployeeEstado, type EmployeeProfile, type EmployeeRole } from '@/infrastructure/api/employeesApi';
import { domiciliariosApi } from '@/infrastructure/api/domiciliariosApi';

const ROLE_LABELS: Record<EmployeeRole, string> = {
  ASESOR: 'Asesor',
  DOMICILIARIO: 'Domiciliario',
};

const ROLE_OPTIONS: { value: EmployeeRole; label: string }[] = [
  { value: 'ASESOR', label: 'Asesor' },
  { value: 'DOMICILIARIO', label: 'Domiciliario' },
];

export const GestionEmpleados: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState<Empleado | null>(null);
  const [items, setItems] = useState<Empleado[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Empleado | null>(null);
  const [formRole, setFormRole] = useState<EmployeeRole>('ASESOR');

  const [domicilioZona, setDomicilioZona] = useState('');
  const [domicilioVehiculo, setDomicilioVehiculo] = useState('');
  const [domicilioCapacidad, setDomicilioCapacidad] = useState('');

  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};
    const nombre = String(formData.get('nombre') ?? '').trim();
    const apellidos = String(formData.get('apellidos') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const tel = String(formData.get('telefono') ?? '').trim();
    const direccion = String(formData.get('direccion') ?? '').trim();
    const tipoDocumento = String(formData.get('tipoDocumento') ?? '').trim();
    const numeroDocumento = String(formData.get('numeroDocumento') ?? '').trim();
    const role = String(formData.get('role') ?? '').trim();

    if (!nombre || nombre.length < 3) newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    if (!apellidos || apellidos.length < 3) newErrors.apellidos = 'Los apellidos deben tener al menos 3 caracteres';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido';
    if (tel && !/^[0-9]{7,11}$/.test(tel)) newErrors.telefono = 'Teléfono inválido (7-11 dígitos)';
    if (!direccion || direccion.length < 5) newErrors.direccion = 'La dirección debe tener al menos 5 caracteres';
    if (tipoDocumento && !numeroDocumento) newErrors.numeroDocumento = 'Número de documento es obligatorio';
    if (!role) newErrors.role = 'Selecciona un rol';

    if (role === 'DOMICILIARIO') {
      if (!domicilioZona.trim()) newErrors.domicilioZona = 'La zona es obligatoria';
      if (!domicilioVehiculo.trim()) newErrors.domicilioVehiculo = 'El vehículo es obligatorio';
      const capacidadNum = Number(domicilioCapacidad);
      if (!domicilioCapacidad || Number.isNaN(capacidadNum) || capacidadNum <= 0) newErrors.domicilioCapacidad = 'La capacidad debe ser mayor a 0';
    }

    if (!selectedEmpleado) {
      if (!tipoDocumento) newErrors.tipoDocumento = 'Selecciona un tipo de documento';
      if (!numeroDocumento) newErrors.numeroDocumento = 'Número de documento es obligatorio';
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

  const fetchEmpleados = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await employeesApi.list();
      setItems(result.items);
    } catch {
      setError('No se pudieron cargar los empleados');
      toast.error('No se pudieron cargar los empleados');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    void fetchEmpleados();
  }, []);

  const filteredEmpleados = useMemo(() => {
    return items.filter(e =>
      e.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      e.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (e.apellidos ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      (e.numeroDocumento ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch, items]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedEmpleado(null);
    setErrors({});
    setDomicilioZona('');
    setDomicilioVehiculo('');
    setDomicilioCapacidad('');
  };

const buildEmployeeProfile = (fd: FormData): EmployeeProfile => {
  const roleValue = String(fd.get('role') ?? 'ASESOR').toUpperCase();
  return {
    cargo: String(fd.get('cargo') ?? '').trim() || undefined,
    fechaContratacion: String(fd.get('fechaContratacion') ?? '') || undefined,
    salario: String(fd.get('salario') ?? '') ? parseFloat(String(fd.get('salario') ?? '')) : undefined,
    tipoEmpleado: roleValue === 'DOMICILIARIO' ? 'DOMICILIARIO' : 'ASESOR',
  };
};

const buildDomiciliaryData = (fd: FormData, role: EmployeeRole) =>
  role === 'DOMICILIARIO'
    ? {
        zona: String(fd.get('zona') ?? '').trim() || undefined,
        vehiculo: String(fd.get('vehiculo') ?? '').trim() || undefined,
        capacidad: String(fd.get('capacidad') ?? '') ? Number(String(fd.get('capacidad') ?? '')) : undefined,
      }
    : undefined;

type EmpleadoFormData = {
  nombre: string;
  apellidos: string;
  email: string;
  telefono: string;
  direccion: string;
  tipoDocumento: string;
  numeroDocumento: string;
  role: EmployeeRole;
  estado: EmployeeEstado;
};

const readEmpleadoFormData = (fd: FormData): EmpleadoFormData => ({
  nombre: String(fd.get('nombre') ?? '').trim(),
  apellidos: String(fd.get('apellidos') ?? '').trim(),
  email: String(fd.get('email') ?? '').trim(),
  telefono: String(fd.get('telefono') ?? '').trim(),
  direccion: String(fd.get('direccion') ?? '').trim(),
  tipoDocumento: String(fd.get('tipoDocumento') ?? '').trim(),
  numeroDocumento: String(fd.get('numeroDocumento') ?? '').trim(),
  role: String(fd.get('role') ?? 'ASESOR').toUpperCase() as EmployeeRole,
  estado: (String(fd.get('estado') ?? 'ACTIVO').toUpperCase() || 'ACTIVO') as EmployeeEstado,
});

const updateEmpleadoRecord = async (
  selected: Empleado,
  data: EmpleadoFormData,
  profile: EmployeeProfile,
  domiciliaryData: { zona?: string; vehiculo?: string; capacidad?: number } | undefined,
): Promise<void> => {
  const actualizado = await employeesApi.update(selected.id, {
    nombre: data.nombre, apellidos: data.apellidos, email: data.email, telefono: data.telefono, direccion: data.direccion, tipoDocumento: data.tipoDocumento, numeroDocumento: data.numeroDocumento,
    profile,
    domiciliaryData,
  });
  setItems(prev => prev.map(it => it.id === selected.id ? actualizado : it));
  if (actualizado.estado !== data.estado) {
    await employeesApi.changeStatus(selected.id, data.estado);
  }
};

const createEmpleadoRecord = async (
  data: EmpleadoFormData,
  password: string,
  profile: EmployeeProfile,
  domiciliaryData: { zona?: string; vehiculo?: string; capacidad?: number } | undefined,
): Promise<Empleado> => {
  const creado = await employeesApi.create({
    email: data.email, password, nombre: data.nombre, apellidos: data.apellidos, role: data.role,
    telefono: data.telefono || undefined, direccion: data.direccion || undefined,
    tipoDocumento: data.tipoDocumento || undefined, numeroDocumento: data.numeroDocumento || undefined,
    profile,
    domiciliaryData,
  });
  setItems(prev => [creado, ...prev]);
  return creado;
};

  const handleSubmitEmpleado = async () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const data = readEmpleadoFormData(fd);

    if (!validateForm(fd)) {
      toast.error('Corrige los errores en el formulario');
      return;
    }

    const profile = buildEmployeeProfile(fd);
    const domiciliaryData = buildDomiciliaryData(fd, data.role);
    const password = String(fd.get('password') ?? '');

    setSaving(true);
    try {
      if (selectedEmpleado) {
        await updateEmpleadoRecord(selectedEmpleado, data, profile, domiciliaryData);
        toast.success('Empleado actualizado');
      } else {
        await createEmpleadoRecord(data, password, profile, domiciliaryData);
        toast.success('Empleado creado');
      }
      void fetchEmpleados();
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar empleado');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<Empleado>[] = [
    { key: 'nombre', header: 'Nombre', sortable: true, render: (c) => c.nombre },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'role', header: 'Rol', sortable: true, render: (c) => ROLE_LABELS[c.role] ?? c.role },
    { key: 'telefono', header: 'Teléfono', render: (c) => c.telefono ?? '—' },
    { key: 'estado', header: 'Estado', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<Empleado> = {
    title: item => `Detalle: ${item.nombre}`,
    size: 'lg',
    header: item => ({
      icon: <User size={18} aria-hidden="true" focusable="false" />,
      title: 'Empleado',
      code: item.id,
      subtitle: item.email,
      meta: item.createdAt ?? '',
      status: item.estado,
      badgeVariant: item.estado === 'ACTIVO' ? 'success' : 'default',
    }),
    kpis: item => [
      { label: 'Rol', value: ROLE_LABELS[item.role] ?? item.role, icon: <ShieldCheck size={16} aria-hidden="true" focusable="false" />, tone: 'primary' },
      { label: 'Teléfono', value: item.telefono ?? '—', icon: <ShieldCheck size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Documento', value: item.numeroDocumento ?? '—', icon: <ShieldCheck size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Cargo', value: item.profile?.cargo ?? '—', icon: <ShieldCheck size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Salario', value: item.profile?.salario != null ? `$${item.profile.salario.toLocaleString('es-CO')}` : '—', icon: <Calendar size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Tipo Empleado', value: item.profile?.tipoEmpleado ? ROLE_LABELS[item.profile.tipoEmpleado] : '—', icon: <Truck size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
      { label: 'Fecha registro', value: item.createdAt ?? '—', icon: <Calendar size={16} aria-hidden="true" focusable="false" />, tone: 'default' },
    ],
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Email:</span> {item.email}</div>
        <div className={s.detailRow}><span>Rol:</span> {ROLE_LABELS[item.role] ?? item.role}</div>
        <div className={s.detailRow}><span>Teléfono:</span> {item.telefono ?? '—'}</div>
        <div className={s.detailRow}><span>Documento:</span> {item.tipoDocumento ?? ''} {item.numeroDocumento ?? '—'}</div>
        <div className={s.detailRow}><span>Dirección:</span> {item.direccion ?? '—'}</div>
        <div className={s.detailRow}><span>Cargo:</span> {item.profile?.cargo ?? '—'}</div>
        <div className={s.detailRow}><span>Salario:</span> {item.profile?.salario != null ? `$${item.profile.salario.toLocaleString('es-CO')}` : '—'}</div>
        <div className={s.detailRow}><span>Tipo empleado:</span> {item.profile?.tipoEmpleado ? ROLE_LABELS[item.profile.tipoEmpleado] : '—'}</div>
        <div className={s.detailRow}><span>Fecha contratación:</span> {item.profile?.fechaContratacion ?? '—'}</div>
        <div className={s.detailRow}><span>Fecha registro:</span> {item.createdAt ?? '—'}</div>
      </div>
    ),
  };

  const actions: DataTableAction<Empleado>[] = [
    { label: 'Editar', icon: <Edit size={14} aria-hidden="true" focusable="false" />, onClick: async (i) => {
      setSelectedEmpleado(i);
      setFormRole(i.role);
      setDomicilioZona('');
      setDomicilioVehiculo('');
      setDomicilioCapacidad('');
      if (i.role === 'DOMICILIARIO') {
        try {
          const dom = await domiciliariosApi.getByUserId(i.id);
          if (dom) {
            setDomicilioZona(dom.zona ?? '');
            setDomicilioVehiculo(dom.vehiculo ?? '');
            setDomicilioCapacidad(dom.capacidad != null ? String(dom.capacidad) : '');
          }
        } catch {
          // silent
        }
      }
      setModalOpen(true);
    } },
    {
      label: (item: Empleado) => item.estado === 'ACTIVO' ? 'Desactivar' : 'Activar',
      icon: <ToggleLeft size={14} aria-hidden="true" focusable="false" />,
      onClick: async (item: Empleado) => {
        const nuevoEstado = (item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO').toUpperCase() as 'ACTIVO' | 'INACTIVO';
        const actualizado = await employeesApi.changeStatus(item.id, nuevoEstado);
        setItems(prev => prev.map(it => it.id === item.id ? actualizado : it));
        toast.success(actualizado.estado === 'ACTIVO' ? 'Empleado activado' : 'Empleado desactivado');
      },
    },
    { label: 'Eliminar', icon: <Trash2 size={14} aria-hidden="true" focusable="false" />, danger: true, onClick: (i) => setDeleteConfirm(i) },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de Empleados</h1>
          <p className={s.pageSubtitle}>Empleados tipo Asesor y Domiciliario</p>
        </div>
        <Button onClick={() => { setSelectedEmpleado(null); setErrors({}); setModalOpen(true); }} leftIcon={<Plus size={16} />}>
          Nuevo Empleado
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar empleados..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <div className={s.tableWrapper}>
        <DataTable
          data={filteredEmpleados}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}
          enableSorting
          toolbarLeft={null}
          maxVisibleColumns={6}
          emptyMessage={loading ? 'Cargando empleados...' : error ? error : 'No se encontraron empleados'}
          enableExport={false}
          enableRowSelection={false}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={selectedEmpleado ? 'Editar Empleado' : 'Nuevo Empleado'}
        size="lg"
      >
        <form className={f.form} ref={formRef} onSubmit={(e) => { e.preventDefault(); void handleSubmitEmpleado(); }}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Identificación</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Tipo de documento</label>
                <select className={`${f.select} ${errors.tipoDocumento ? f.inputError : ''}`} name="tipoDocumento" defaultValue={selectedEmpleado?.tipoDocumento ?? ''}>
                  <option value="" disabled>Selecciona...</option>
                  <option value="CC">C.C. - Cédula de ciudadanía</option>
                  <option value="TI">T.I. - Tarjeta de identidad</option>
                  <option value="CE">C.E. - Cédula de Extranjería</option>
                  <option value="PP">P.P. - Pasaporte</option>
                  <option value="NIT">NIT</option>
                  <option value="PPT">PPT - Pasaporte especial</option>
                </select>
                {errors.tipoDocumento && <span className={f.errorText}>{errors.tipoDocumento}</span>}
              </div>
              <div className={f.field}>
                <label className={f.label}>Número de documento</label>
                <input type="text" className={`${f.input} ${errors.numeroDocumento ? f.inputError : ''}`} name="numeroDocumento" defaultValue={selectedEmpleado?.numeroDocumento ?? ''} maxLength={15} autoComplete="off" />
                {errors.numeroDocumento && <span className={f.errorText}>{errors.numeroDocumento}</span>}
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Nombre</label>
                <input type="text" className={`${f.input} ${errors.nombre ? f.inputError : ''}`} name="nombre" defaultValue={selectedEmpleado?.nombre} minLength={3} autoComplete="given-name" />
                {errors.nombre && <span className={f.errorText}>{errors.nombre}</span>}
              </div>
              <div className={f.field}>
                <label className={f.label}>Apellidos</label>
                <input type="text" className={`${f.input} ${errors.apellidos ? f.inputError : ''}`} name="apellidos" defaultValue={selectedEmpleado?.apellidos ?? ''} minLength={3} autoComplete="family-name" />
                {errors.apellidos && <span className={f.errorText}>{errors.apellidos}</span>}
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Contacto</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Correo electrónico</label>
                <input type="email" className={`${f.input} ${errors.email ? f.inputError : ''}`} name="email" defaultValue={selectedEmpleado?.email} autoComplete="email" />
                {errors.email && <span className={f.errorText}>{errors.email}</span>}
              </div>
              <div className={f.field}>
                <label className={f.label}>Teléfono</label>
                <input type="tel" className={`${f.input} ${errors.telefono ? f.inputError : ''}`} name="telefono" defaultValue={selectedEmpleado?.telefono ?? ''} maxLength={11} inputMode="numeric" autoComplete="tel" />
                {errors.telefono && <span className={f.errorText}>{errors.telefono}</span>}
              </div>
            </div>
            <div className={f.field}>
              <label className={f.label}>Dirección</label>
              <input type="text" className={`${f.input} ${errors.direccion ? f.inputError : ''}`} name="direccion" defaultValue={selectedEmpleado?.direccion ?? ''} placeholder="Calle, ciudad, código postal" minLength={5} autoComplete="street-address" />
              {errors.direccion && <span className={f.errorText}>{errors.direccion}</span>}
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Empleado</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Rol</label>
                <select className={`${f.select} ${errors.role ? f.inputError : ''}`} name="role" defaultValue={selectedEmpleado?.role ?? 'ASESOR'} onChange={(e) => setFormRole(e.target.value as EmployeeRole)}>
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {errors.role && <span className={f.errorText}>{errors.role}</span>}
              </div>
            </div>

            {formRole === 'DOMICILIARIO' && (
              <div className={f.formSection} style={{ marginTop: 12 }}>
                <h3 className={f.sectionTitle}>Información del domiciliario</h3>
                <p className={s.hint} style={{ marginBottom: 12 }}>Completa estos datos operativos del empleado como domiciliario.</p>
                <div className={f.formRow}>
                  <div className={f.field}>
                    <label className={f.label}>Zona</label>
                    <input type="text" className={`${f.input} ${errors.domicilioZona ? f.inputError : ''}`} value={domicilioZona} onChange={(e) => setDomicilioZona(e.target.value)} placeholder="Ej: Norte" />
                    {errors.domicilioZona && <span className={f.errorText}>{errors.domicilioZona}</span>}
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Vehículo</label>
                    <input type="text" className={`${f.input} ${errors.domicilioVehiculo ? f.inputError : ''}`} value={domicilioVehiculo} onChange={(e) => setDomicilioVehiculo(e.target.value)} placeholder="Ej: Moto, Camioneta" />
                    {errors.domicilioVehiculo && <span className={f.errorText}>{errors.domicilioVehiculo}</span>}
                  </div>
                </div>
                <div className={f.field}>
                  <label className={f.label}>Capacidad</label>
                  <input type="number" className={`${f.input} ${errors.domicilioCapacidad ? f.inputError : ''}`} value={domicilioCapacidad} onChange={(e) => setDomicilioCapacidad(e.target.value)} placeholder="Ej: 20 pedidos" min={1} />
                  {errors.domicilioCapacidad && <span className={f.errorText}>{errors.domicilioCapacidad}</span>}
                </div>
              </div>
            )}

            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Cargo</label>
                <input type="text" className={f.input} name="cargo" defaultValue={selectedEmpleado?.profile?.cargo ?? ''} placeholder="Ej: Asesor Senior" autoComplete="organization-title" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Salario</label>
                <input type="number" className={f.input} name="salario" defaultValue={selectedEmpleado?.profile?.salario != null ? String(selectedEmpleado.profile.salario) : ''} min="0" step="0.01" autoComplete="off" />
              </div>
            </div>
            <div className={f.field}>
              <label className={f.label}>Fecha de contratación</label>
              <input type="date" className={f.input} name="fechaContratacion" defaultValue={selectedEmpleado?.profile?.fechaContratacion?.split('T')[0] ?? ''} autoComplete="off" />
            </div>
          </div>

          {!selectedEmpleado && (
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
              <label className={f.label}>Estado del empleado</label>
              <select className={f.select} name="estado" defaultValue={selectedEmpleado?.estado ?? 'ACTIVO'}>
                {EMPLEADO_ESTADOS.map(es => (
                  <option key={es.value} value={es.value}>{es.label}</option>
                ))}
              </select>
            </div>
          </div>

          <ModalFooter
            actions={[
              { label: 'Cancelar', variant: 'secondary', type: 'button', onClick: handleCloseModal },
              {
                label: saving ? 'Guardando...' : selectedEmpleado ? 'Guardar cambios' : 'Crear empleado',
                type: 'submit',
                loading: saving,
                disabled: saving,
              },
            ]}
          />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await employeesApi.remove(deleteConfirm.id);
            setItems(prev => prev.filter(it => it.id !== deleteConfirm.id));
            toast.success('Empleado eliminado');
          } catch {
            toast.error('No se pudo eliminar el empleado');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar empleado"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};

export default GestionEmpleados;
