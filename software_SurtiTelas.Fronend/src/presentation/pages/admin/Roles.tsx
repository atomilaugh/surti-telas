import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Edit, Shield, Loader2, AlertCircle, EyeOff, Trash2, Plus } from 'lucide-react';
import s from './Roles.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction } from '@/shared/ui/DataTable';
import { useDelegatedTooltips } from '@/shared/components/Tooltip';
import { cn } from '@/shared/utils';
import { rolesApi, type Rol } from '@/infrastructure/api/rolesApi';
import { PERMISOS_SISTEMA } from '@/shared/constants/options';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

const PROTECTED_ROLES = new Set(['ADMIN', 'ASESOR', 'DOMICILIARIO', 'CLIENTE']);

const isProtectedRole = (rol: Rol) => PROTECTED_ROLES.has((rol.nombre ?? '').toUpperCase());

const mapBackendRole = (rol: Rol): Rol => ({
  ...rol,
  permisos: rol.permisos ?? [],
});

export const AdminRoles: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRol, setSelectedRol] = useState<Rol | null>(null);
  const [items, setItems] = useState<Rol[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const tableRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  useDelegatedTooltips(tableRef, { placement: 'top' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await rolesApi.list();
        if (!active) return;
        setItems(data.map(mapBackendRole));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los roles');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const normalizedRoles = useMemo(() => {
    return items.filter(r => r.id && (r.nombre ?? '').trim().length > 0);
  }, [items]);

  const filteredRoles = useMemo(() => {
    return normalizedRoles.filter(r =>
      String(r.nombre ?? '').toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      String(r.descripcion ?? '').toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [normalizedRoles, debouncedSearch]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedRol(null);
  };

   const handleSubmitRol = async (e?: React.FormEvent<HTMLFormElement>) => {
     if (e) e.preventDefault();
     if (!formRef.current) return;
     const fd = new FormData(formRef.current);
     const nombre = String(fd.get('nombre') ?? '').trim();
     const descripcion = String(fd.get('descripcion') ?? '').trim();
     const permisos = fd.getAll('permisos') as string[];
     try {
       if (selectedRol) {
         await rolesApi.update(selectedRol.id, { nombre, descripcion, permisos });
         toast.success('Rol actualizado');
       } else {
         await rolesApi.create({ nombre, descripcion, permisos });
         toast.success('Rol creado');
       }
     } catch (err) {
       toast.error(err instanceof Error ? err.message : 'Error al guardar rol');
     } finally {
       handleCloseModal();
       const data = await rolesApi.list();
       setItems(data.map(mapBackendRole));
     }
   };

  const columns: DataTableColumn<Rol>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      minWidth: '180px',
      render: (item: Rol) => (
        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.88rem' }}>
          {item.nombre}
        </div>
      ),
    },
    {
      key: 'descripcion',
      header: 'Descripción',
      sortable: true,
      render: (item: Rol) => (
        <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
          {item.descripcion || '—'}
        </div>
      ),
    },
    {
      key: 'permisos',
      header: 'Permisos',
      sortable: false,
      render: (item: Rol) => (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(item.permisos ?? []).slice(0, 3).map((permiso, idx) => (
            <span key={idx} className={cn(s.permisoTag)}>
              <Shield size={12} />
              {permiso}
            </span>
          ))}
          {(item.permisos ?? []).length > 3 && (
            <span className={cn(s.permisoTag)}>+{item.permisos.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      key: 'usuarios',
      header: 'Usuarios',
      sortable: true,
      align: 'center',
      render: (item: Rol) => <span style={{ fontSize: '0.84rem' }}>{item.usuarios}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (item: Rol) => (
        <StatusBadge status={item.estado} />
      ),
    },
  ];

  const actions: DataTableAction<Rol>[] = [
    {
      label: 'Editar',
      icon: <Edit size={14} aria-hidden="true" focusable="false" />,
      onClick: (item: Rol) => {
        setSelectedRol(item);
        setModalOpen(true);
      },
    },
    {
      label: (item: Rol) => item.estado === 'Activo' ? 'Desactivar' : 'Activar',
      icon: <EyeOff size={14} aria-hidden="true" focusable="false" />,
      onClick: async (item: Rol) => {
        const nuevoEstado = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
        try {
          await rolesApi.updateStatus(item.id, nuevoEstado);
          setItems(prev => prev.map(it => it.id === item.id ? { ...it, estado: nuevoEstado } : it));
          toast.success(`Rol ${nuevoEstado.toLowerCase()} correctamente`);
        } catch {
          toast.error('No se pudo actualizar el estado del rol');
        }
      },
    },
    {
      label: (item: Rol) => (isProtectedRole(item) ? 'Protegido' : 'Eliminar'),
      icon: <Trash2 size={14} aria-hidden="true" focusable="false" />,
      disabled: (item: Rol) => isProtectedRole(item),
      danger: true,
      onClick: async (item: Rol) => {
        if (isProtectedRole(item)) {
          toast.error('Rol protegido, no se puede eliminar');
          return;
        }
        try {
          await rolesApi.delete(item.id);
          setItems(prev => prev.filter(it => it.id !== item.id));
          toast.success('Rol eliminado correctamente');
        } catch {
          toast.error('No se pudo eliminar el rol');
        }
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Roles</h1>
          <p className={s.pageSubtitle}>Gestión de roles y permisos del sistema</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => { setSelectedRol(null); setModalOpen(true); }}>
          Nuevo Rol
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar roles..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={100}
          minChars={0} />
      </div>

      <div className={s.tableWrapper} ref={tableRef}>
        {loading && (
          <div className={cn(s.stateBox)}>
            <Loader2 size={28} className={s.spin} />
            <p>Cargando roles...</p>
          </div>
        )}
        {error && (
          <div className={cn(s.stateBox, s.errorBox)}>
            <AlertCircle size={28} />
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
          <DataTable enableExport={false} enableRowSelection={false}
            data={filteredRoles}
            columns={columns}
            actions={actions}

            enableSorting={true}
            enableColumnFilters={false}
            toolbarLeft={null}
            maxVisibleColumns={6} />
        )}
      </div>

      {modalOpen && (
        <div className={s.modalOverlay}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {selectedRol ? 'Editar Rol' : 'Nuevo Rol'}
              </h2>
              <button className={s.closeBtn} onClick={handleCloseModal}>×</button>
            </div>
            <div className={s.modalBody}>
               <form className={f.form} ref={formRef} onSubmit={(e) => { e.preventDefault(); void handleSubmitRol(e); }}>
                 <div className={f.formSection}>
                   <h3 className={f.sectionTitle}>Información del rol</h3>
                   <div className={f.formRow}>
                     <div className={f.field}>
                       <label className={f.label}>Nombre del Rol</label>
                       <input className={f.input} name="nombre" defaultValue={selectedRol?.nombre} placeholder="Nombre del rol" />
                     </div>
                   </div>
                   <div className={f.field}>
                     <label className={f.label}>Descripción</label>
                     <textarea className={f.textarea} placeholder="Descripción del rol..." name="descripcion" defaultValue={selectedRol?.descripcion} />
                   </div>
                 </div>
                 <div className={f.formSection}>
                   <h3 className={f.sectionTitle}>Permisos</h3>
                   <div className={f.field}>
                     <label className={f.label}>Permisos</label>
                     <div className={s.permisosGrid}>
                       {PERMISOS_SISTEMA.map(permiso => (
                         <label key={permiso} className={s.permisoCheckbox}>
                           <input type="checkbox" name="permisos" value={permiso.toLowerCase()} defaultChecked={selectedRol?.permisos.includes(permiso.toLowerCase())} />
                           <Shield size={14} className={s.checkIcon} />
                           <span>{permiso}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                 </div>
                  <div className={f.formActions}>
                    <Button variant="secondary" type="button" onClick={handleCloseModal}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {selectedRol ? 'Guardar cambios' : 'Crear rol'}
                    </Button>
                  </div>
               </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
