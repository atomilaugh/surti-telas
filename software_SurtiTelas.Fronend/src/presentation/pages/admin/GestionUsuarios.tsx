import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, ToggleLeft, User, ShieldCheck, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import s from './GestionUsuarios.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { usersApi, type Usuario } from '@/infrastructure/api/usersApi';
import { rolesApi, type Rol } from '@/infrastructure/api/rolesApi';
import { permissionsApi, type Permission } from '@/infrastructure/api/permissionsApi';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface UsuarioConDatos extends Usuario {
  telefono?: string | null;
  direccion?: string | null;
  tipoDocumento?: string | null;
  numeroDocumento?: string | null;
  apellidos?: string | null;
}

export const AdminGestionUsuarios: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<UsuarioConDatos | null>(null);
  const [items, setItems] = useState<UsuarioConDatos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);

  const handleSaveUserPermissions = async () => {
    if (!selectedUsuarioPermisos) return;
    setSavingPermissions(true);
    try {
      const updated = await usersApi.update(selectedUsuarioPermisos.id, { permisos: userPermissions });
      setItems(prev => prev.map(it => it.id === selectedUsuarioPermisos.id ? { ...it, permisos: updated.permisos ?? userPermissions } : it));
      toast.success('Permisos del usuario actualizados');
      setPermisosModalOpen(false);
    } catch {
      toast.error('No se pudieron actualizar los permisos del usuario');
    } finally {
      setSavingPermissions(false);
    }
  };
  const [deleteConfirm, setDeleteConfirm] = useState<UsuarioConDatos | null>(null);
  const [permisosModalOpen, setPermisosModalOpen] = useState(false);
  const [selectedUsuarioPermisos, setSelectedUsuarioPermisos] = useState<UsuarioConDatos | null>(null);
  const [userPermissions, setUserPermissions] = useState<string[]>([]);
  const [rolePermisos, setRolePermisos] = useState<string[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState('');
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loadingPermissions, setLoadingPermissions] = useState(false);

  const formRef = useRef<HTMLFormElement>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (formData: FormData): boolean => {
    const newErrors: Record<string, string> = {};
    const nombre = String(formData.get('nombre') ?? '').trim();
    const apellidos = String(formData.get('apellidos') ?? '').trim();
    const email = String(formData.get('email') ?? '').trim();
    const telefono = String(formData.get('telefono') ?? '').trim();
    const direccion = String(formData.get('direccion') ?? '').trim();
    const tipoDocumento = String(formData.get('tipoDocumento') ?? '').trim();
    const numeroDocumento = String(formData.get('numeroDocumento') ?? '').trim();

    if (!nombre || nombre.length < 3) newErrors.nombre = 'El nombre debe tener al menos 3 caracteres';
    if (!apellidos || apellidos.length < 3) newErrors.apellidos = 'Los apellidos deben tener al menos 3 caracteres';
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido';
    if (telefono && !/^[0-9]{7,11}$/.test(telefono)) newErrors.telefono = 'Teléfono inválido (7-11 dígitos)';
    if (!direccion || direccion.length < 5) newErrors.direccion = 'La dirección debe tener al menos 5 caracteres';

    if (!selectedUsuario) {
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

  const fetchUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.list();
      setItems(data);
    } catch {
      setError('No se pudieron cargar los usuarios');
      toast.error('No se pudieron cargar los usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsuarios();
  }, []);

  useEffect(() => {
    if (!modalOpen || selectedUsuario) return;
    let active = true;
    setRolesLoading(true);
    rolesApi.list()
      .then((availableRoles) => {
        if (!active) return;
        setRoles(availableRoles);
        setRolSeleccionado((current) => current || availableRoles[0]?.id || '');
      })
      .catch(() => toast.error('No se pudieron cargar los roles'))
      .finally(() => {
        if (active) setRolesLoading(false);
      });
    return () => { active = false; };
  }, [modalOpen, selectedUsuario]);

   useEffect(() => {
    let active = true;
    const loadPermissions = async () => {
      setLoadingPermissions(true);
      try {
        let allItems: Permission[] = [];
        let page = 1;
        // El backend limita `limit` a max 100 (PaginationSchema).
        // 100 es suficiente para traer todos los permisos actuales (≈70)
        // en una sola petición. El bucle se mantiene por si crece el catálogo.
        const limit = 100;
        let total = 0;
        do {
          const result = await permissionsApi.list({ page, limit });
          allItems = allItems.concat(result.items);
          total = ((result.meta as { totalRecords?: number } | null)?.totalRecords) ?? 0;
          page++;
        } while (allItems.length < total);
        if (!active) return;
        setPermissions(allItems);
      } catch {
        toast.error('No se pudieron cargar los permisos');
      } finally {
        if (active) setLoadingPermissions(false);
      }
    };
    loadPermissions();
    return () => { active = false; };
  }, []);

  const filteredUsuarios = useMemo(() => {
    return items.filter(u =>
      u.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      u.rol.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch, items]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedUsuario(null);
  };

  const handleSubmitUsuario = async () => {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const nombre = String(fd.get('nombre') ?? '').trim();
    const apellidos = String(fd.get('apellidos') ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    const telefono = String(fd.get('telefono') ?? '').trim();
    const direccion = String(fd.get('direccion') ?? '').trim();
    const tipoDocumento = String(fd.get('tipoDocumento') ?? '').trim();
    const numeroDocumento = String(fd.get('numeroDocumento') ?? '').trim();
    const role = String(fd.get('role') ?? '').trim();
    const permisos = fd.getAll('permisos') as string[];
    const password = String(fd.get('password') ?? '');

    if (!validateForm(fd)) {
      toast.error('Corrige los errores en el formulario');
      return;
    }
    setSaving(true);
    try {
      if (selectedUsuario) {
        await usersApi.update(selectedUsuario.id, { nombre, apellidos, telefono, direccion, permisos });
        setItems(prev => prev.map(it => it.id === selectedUsuario.id ? { ...it, nombre, apellidos, telefono, direccion, permisos } : it));
        toast.success('Usuario actualizado');
      } else {
        const creado = await usersApi.create({ nombre, apellidos, email, password, role, telefono, direccion, tipoDocumento, numeroDocumento, permisos });
        setItems(prev => [creado, ...prev]);
        toast.success('Usuario creado');
      }
      handleCloseModal();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar usuario');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<UsuarioConDatos>[] = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'telefono', header: 'Teléfono', render: (c) => c.telefono ?? '—' },
    { key: 'numeroDocumento', header: 'Documento', render: (c) => c.numeroDocumento ?? '—' },
    { key: 'rol', header: 'Rol', sortable: true },
    { key: 'estado', header: 'Estado', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<UsuarioConDatos> = {
    title: item => `Detalle: ${item.nombre}`,
    size: 'lg',
    header: item => ({
      icon: <User size={18} />,
      title: 'Usuario del sistema',
      code: item.id,
      subtitle: item.email,
      meta: item.fechaRegistro,
      status: item.estado,
      badgeVariant: item.estado === 'Activo' ? 'success' : 'default',
    }),
    kpis: item => [
      { label: 'Rol', value: item.rol, icon: <ShieldCheck size={16} />, tone: 'primary' },
      { label: 'Teléfono', value: item.telefono ?? '—', icon: <ShieldCheck size={16} />, tone: 'default' },
      { label: 'Documento', value: item.numeroDocumento ?? '—', icon: <ShieldCheck size={16} />, tone: 'default' },
      { label: 'Fecha registro', value: item.fechaRegistro, icon: <Calendar size={16} />, tone: 'default' },
      { label: 'Módulos', value: (item.permisos ?? []).join(', ') || 'Sin módulos', icon: <ShieldCheck size={16} />, tone: 'default' },
    ],
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Email:</span> {item.email}</div>
        <div className={s.detailRow}><span>Rol:</span> {item.rol}</div>
        <div className={s.detailRow}><span>Teléfono:</span> {item.telefono ?? '—'}</div>
        <div className={s.detailRow}><span>Documento:</span> {item.numeroDocumento ?? '—'}</div>
        <div className={s.detailRow}><span>Fecha registro:</span> {item.fechaRegistro}</div>
        <div className={s.detailRow}><span>Módulos:</span> {(item.permisos ?? []).join(', ') || 'Sin módulos'}</div>
      </div>
    ),
  };

  const actions: DataTableAction<UsuarioConDatos>[] = [
    {
      label: 'Editar',
      icon: <Edit size={14} />,
      onClick: (i) => { setSelectedUsuario(i); setModalOpen(true); },
    },
    {
      label: (item: UsuarioConDatos) => item.estado === 'Activo' ? 'Desactivar' : 'Activar',
      icon: <ToggleLeft size={14} />,
      onClick: async (item: UsuarioConDatos) => {
        try {
          const actualizado = await usersApi.updateStatus(item.id, item.estado === 'Activo' ? 'INACTIVO' : 'ACTIVO');
          setItems(prev => prev.map(it => it.id === item.id ? actualizado : it));
          toast.success(actualizado.estado === 'Activo' ? 'Usuario activado' : 'Usuario desactivado');
        } catch {
          toast.error('No se pudo cambiar el estado del usuario');
        }
      },
    },
    {
      label: 'Permisos',
      icon: <ShieldCheck size={14} />,
      onClick: async (item: UsuarioConDatos) => {
        setSelectedUsuarioPermisos(item);
        // Se editan los permisos ESPECÍFICOS del usuario (no los heredados del rol).
        setUserPermissions(item.permisosEspecificos ?? []);
        setLoadingPermissions(true);
        try {
          const rol = (item.rol || 'CLIENTE').toUpperCase();
                  const rolData = await rolesApi.getById(rol);
                  setRolePermisos(rolData?.permisos ?? []);
        } catch {
          setRolePermisos([]);
        } finally {
          setLoadingPermissions(false);
          setPermisosModalOpen(true);
        }
      },
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: (item: UsuarioConDatos) => setDeleteConfirm(item),
    },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de Usuarios</h1>
          <p className={s.pageSubtitle}>Todos los usuarios registrados</p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Nuevo Usuario
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar usuarios..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <div className={s.tableWrapper}>
        <DataTable
          data={filteredUsuarios}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}

          enableSorting={true}
          toolbarLeft={null}
          maxVisibleColumns={7}
          emptyMessage={loading ? 'Cargando usuarios...' : error ? error : 'No se encontraron usuarios'} enableExport={false} enableRowSelection={false}
        />
      </div>

      <Modal
        open={modalOpen}
        onClose={handleCloseModal}
        title={selectedUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
        size="lg"
      >
        <form className={f.form} ref={formRef} onSubmit={(e) => { e.preventDefault(); void handleSubmitUsuario(); }}>
          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información personal</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Nombre completo</label>
                <input type="text" className={`${f.input} ${errors.nombre ? f.inputError : ''}`} name="nombre" defaultValue={selectedUsuario?.nombre} minLength={3} />
                {errors.nombre && <span className={f.errorText}>{errors.nombre}</span>}
              </div>
              <div className={f.field}>
                <label className={f.label}>Apellidos</label>
                <input type="text" className={`${f.input} ${errors.apellidos ? f.inputError : ''}`} name="apellidos" defaultValue={selectedUsuario?.apellidos ?? ''} minLength={3} />
                {errors.apellidos && <span className={f.errorText}>{errors.apellidos}</span>}
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Correo electrónico</label>
                <input type="email" className={`${f.input} ${errors.email ? f.inputError : ''}`} name="email" defaultValue={selectedUsuario?.email} />
                {errors.email && <span className={f.errorText}>{errors.email}</span>}
              </div>
              <div className={f.field}>
                <label className={f.label}>Teléfono</label>
                <input type="tel" className={`${f.input} ${errors.telefono ? f.inputError : ''}`} name="telefono" defaultValue={selectedUsuario?.telefono ?? ''} maxLength={11} inputMode="numeric" />
                {errors.telefono && <span className={f.errorText}>{errors.telefono}</span>}
              </div>
            </div>
            <div className={f.field}>
              <label className={f.label}>Dirección</label>
              <input type="text" className={`${f.input} ${errors.direccion ? f.inputError : ''}`} name="direccion" defaultValue={selectedUsuario?.direccion ?? ''} placeholder="Calle, ciudad, código postal" minLength={5} />
              {errors.direccion && <span className={f.errorText}>{errors.direccion}</span>}
            </div>
          </div>

          {!selectedUsuario && (
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
                    <option value="PPT">PPT - Pasaporte especial</option>
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

          {!selectedUsuario && (
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

          {!selectedUsuario && (
            <div className={f.formSection}>
              <h3 className={f.sectionTitle}>Acceso y permisos</h3>
              <div className={f.field}>
                <label className={f.label}>Rol</label>
                <select
                  className={f.select}
                  name="role"
                  value={rolSeleccionado}
                  onChange={async (e) => {
                    const rol = e.target.value;
                    setRolSeleccionado(rol);
                    try {
                      const rd = await rolesApi.getById(rol);
                      setRolePermisos(rd?.permisos ?? []);
                    } catch {
                      setRolePermisos([]);
                    }
                  }}
                >
                  <option value="" disabled>{rolesLoading ? 'Cargando roles...' : 'Selecciona un rol'}</option>
                  {roles.map((rol) => (
                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                  ))}
                </select>
                {!selectedUsuario && rolePermisos.length > 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <p style={{ fontSize: '0.74rem', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
                      Permisos que otorga el rol ({rolSeleccionado}):
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {rolePermisos.map((code) => (
                        <span
                          key={code}
                          style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                        >
                          {code}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className={f.field}>
                <label className={f.label}>Módulos</label>
                <div className={s.permisosGrid}>
                  {Object.entries(
                     permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
                       const module = perm.module || 'General';
                       if (!acc[module]) acc[module] = [];
                       acc[module].push(perm);
                       return acc;
                     }, {})
                  ).map(([module, modPermissions]) => {
                    const usuario = selectedUsuario as UsuarioConDatos | null;
                    return (
                      <div key={module} style={{ marginBottom: '8px' }}>
                        <strong style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)' }}>{module}</strong>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                          {modPermissions.map(perm => (
                            <label key={perm.id} className={s.permisoCheckbox}>
                              <input type="checkbox" name="permisos" value={perm.code} defaultChecked={usuario?.permisos?.includes(perm.code)} />
                              <span>{perm.code}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          <ModalFooter
            actions={[
              { label: 'Cancelar', variant: 'secondary', type: 'button', onClick: handleCloseModal },
              {
                label: saving ? 'Guardando...' : selectedUsuario ? 'Guardar cambios' : 'Crear usuario',
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
            await usersApi.remove(deleteConfirm.id);
            setItems(prev => prev.filter(it => it.id !== deleteConfirm.id));
            toast.success('Usuario eliminado');
          } catch {
            toast.error('No se pudo eliminar el usuario');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar usuario"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />

      <Modal
        open={permisosModalOpen}
        onClose={() => setPermisosModalOpen(false)}
        title={'Gestionar permisos - ' + (selectedUsuarioPermisos?.nombre ?? '')}
        size="lg"
      >
        <div className={s.form}>
          <p className={s.permissionHint}>
            Asigna permisos <strong>específicos</strong> a este usuario. Los permisos marcados como
            "(rol)" ya están activos por herencia y no es necesario duplicarlos.
          </p>

          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '8px', color: 'var(--color-text-secondary)' }}>
              Permisos heredados del rol ({selectedUsuarioPermisos?.rol ?? '—'})
            </h3>
            {loadingPermissions ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>Cargando…</p>
            ) : rolePermisos.length === 0 ? (
              <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>El rol no otorga permisos.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {rolePermisos.map((code) => (
                  <span
                    key={code}
                    style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '999px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
                  >
                    {code}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              Permisos específicos del usuario ({userPermissions.length})
            </h3>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                onClick={() => setUserPermissions(permissions.map((p) => p.code))}
              >
                Seleccionar todos
              </button>
              <button
                type="button"
                style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', fontSize: '0.78rem', textDecoration: 'underline' }}
                onClick={() => setUserPermissions([])}
              >
                Deseleccionar todos
              </button>
            </div>
          </div>

          {loadingPermissions ? (
            <p>Cargando permisos...</p>
          ) : (
            <div className={s.permisosGrid}>
              {Object.entries(
                 permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
                   const module = perm.module || 'General';
                   if (!acc[module]) acc[module] = [];
                   acc[module].push(perm);
                   return acc;
                 }, {})
              ).map(([module, modPermissions]) => (
                <div key={module} style={{ marginBottom: '16px' }}>
                  <h4 style={{ fontSize: '0.78rem', fontWeight: 600, marginBottom: '6px', color: 'var(--color-text-secondary)' }}>{module}</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px' }}>
                    {modPermissions.map((perm) => {
                      const inherited = rolePermisos.includes(perm.code);
                      return (
                        <label key={perm.id} className={s.permisoCheckbox}>
                          <input
                            type="checkbox"
                            checked={userPermissions.includes(perm.code)}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setUserPermissions((prev) =>
                                checked
                                  ? Array.from(new Set([...prev, perm.code]))
                                  : prev.filter((p) => p !== perm.code)
                              );
                            }}
                          />
                          <div>
                            <strong style={{ fontSize: '0.8rem' }}>{perm.code}</strong>
                            {inherited && (
                              <span style={{ fontSize: '0.68rem', color: 'var(--color-text-muted)' }}> (rol)</span>
                            )}
                            <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', margin: 0 }}>{perm.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <ModalFooter
            actions={[
              { label: 'Cancelar', variant: 'secondary', onClick: () => setPermisosModalOpen(false) },
              { label: savingPermissions ? 'Guardando...' : 'Guardar permisos', onClick: handleSaveUserPermissions, loading: savingPermissions },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};
