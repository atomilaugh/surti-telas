import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Loader2, AlertCircle, EyeOff } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction } from '@/shared/ui/DataTable';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { useDelegatedTooltips } from '@/shared/components/Tooltip';
import { cn } from '@/shared/utils';
import { permissionsApi, type Permission } from '@/infrastructure/api/permissionsApi';
import { MODULOS_SISTEMA } from '@/shared/constants/options';
import s from './Permisos.module.css';
import f from '@/styles/Form.module.css';

interface Permiso extends Permission {
  modulo: string;
}

const mapPermissionToPermiso = (p: Permission, _index: number): Permiso => {
  return {
    ...p,
    modulo: p.module,
  };
};

export const AdminPermisos: React.FC = () => {
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPermiso, setSelectedPermiso] = useState<Permiso | null>(null);
  const [items, setItems] = useState<Permiso[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Permiso | null>(null);

  const tableRef = React.useRef<HTMLDivElement>(null);
  const formRef = React.useRef<HTMLFormElement>(null);
  useDelegatedTooltips(tableRef, { placement: 'top' });

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await permissionsApi.list();
        if (!active) return;
        setItems(result.items.map((p, idx) => mapPermissionToPermiso(p, idx)));
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los permisos');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const filteredPermisos = useMemo(() => {
    return items.filter(p =>
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase()) ||
      p.module.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedPermiso(null);
  };

  const [saving, setSaving] = useState(false);

  const handleSubmitPermiso = async (e?: React.FormEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    const code = String(fd.get('code') ?? '').trim();
    const description = String(fd.get('description') ?? '').trim();
    const module = String(fd.get('module') ?? '').trim();
    try {
      setSaving(true);
      if (selectedPermiso) {
        await permissionsApi.update(selectedPermiso.id, { code, description, module });
        setItems(prev => prev.map(it => it.id === selectedPermiso.id ? { ...it, code, description, module } : it));
        toast.success('Permiso actualizado');
      } else {
        const nuevo = await permissionsApi.create({ code, description, module });
        setItems(prev => [{ ...nuevo, modulo: nuevo.module }, ...prev]);
        toast.success('Permiso creado');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar permiso');
    } finally {
      setSaving(false);
      handleCloseModal();
      try {
        const result = await permissionsApi.list();
        setItems(result.items.map((p, idx) => mapPermissionToPermiso(p, idx)));
      } catch {
        toast.error('No se pudieron recargar los permisos');
      }
    }
  };

  const columns: DataTableColumn<Permiso>[] = [
    {
      key: 'code',
      header: 'Código',
      sortable: true,
      minWidth: '200px',
      render: (item: Permiso) => (
        <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.88rem', fontFamily: 'var(--font-mono)' }}>
          {item.code}
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Descripción',
      sortable: true,
      render: (item: Permiso) => (
        <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>
          {item.description}
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Módulo',
      sortable: true,
      align: 'center',
      render: (item: Permiso) => (
        <Badge variant="outline">{item.module}</Badge>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (item: Permiso) => (
        <StatusBadge status={item.estado} />
      ),
    },
  ];

  const toggleEstado = async (item: Permiso) => {
    const nuevoEstado = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await permissionsApi.updateStatus(item.id, nuevoEstado === 'Activo' ? 'ACTIVO' : 'INACTIVO');
      setItems(prev => prev.map(it => it.id === item.id ? { ...it, estado: nuevoEstado } : it));
      toast.success(`Permiso ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'} correctamente`);
    } catch {
      toast.error('No se pudo actualizar el estado del permiso');
    }
  };

  const actions: DataTableAction<Permiso>[] = [
    {
      label: (item: Permiso) => item.estado === 'Activo' ? 'Desactivar' : 'Activar',
      icon: <EyeOff size={14} aria-hidden="true" focusable="false" />,
      onClick: (item: Permiso) => { void toggleEstado(item); },
    },
    {
      label: 'Editar',
      icon: <Edit size={14} aria-hidden="true" focusable="false" />,
      onClick: (item: Permiso) => {
        setSelectedPermiso(item);
        setModalOpen(true);
      },
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} aria-hidden="true" focusable="false" />,
      danger: true,
      onClick: (item: Permiso) => setDeleteConfirm(item),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Permisos</h1>
          <p className={s.pageSubtitle}>Gestión de permisos del sistema</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => { setSelectedPermiso(null); setModalOpen(true); }}>
          Nuevo Permiso
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar permisos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={100}
          minChars={0}
        />
      </div>

      <div className={s.tableWrapper} ref={tableRef}>
        {loading && (
          <div className={cn(s.stateBox)}>
            <Loader2 size={28} className={s.spin} />
            <p>Cargando permisos...</p>
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
            data={filteredPermisos}
            columns={columns}
            actions={actions}

            enableSorting={true}
            enableColumnFilters={false}
            toolbarLeft={null}
            maxVisibleColumns={6}
          />
        )}
      </div>

      {modalOpen && (
        <div className={s.modalOverlay}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {selectedPermiso ? 'Editar Permiso' : 'Nuevo Permiso'}
              </h2>
              <button className={s.closeBtn} onClick={handleCloseModal}>×</button>
            </div>
            <div className={s.modalBody}>
              <form className={f.form} ref={formRef} onSubmit={(e) => { e.preventDefault(); void handleSubmitPermiso(e); }}>
                <div className={f.formSection}>
                  <h3 className={f.sectionTitle}>Información del permiso</h3>
                  <div className={f.formRow}>
                    <div className={f.field}>
                      <label className={f.label}>Código del Permiso</label>
                      <input type="text" className={f.input} name="code" defaultValue={selectedPermiso?.code} placeholder="ej: catalog:read" />
                    </div>
                    <div className={f.field}>
                      <label className={f.label}>Módulo</label>
                      <select className={f.select} name="module" defaultValue={selectedPermiso?.module}>
                        {MODULOS_SISTEMA.map(modulo => (
                          <option key={modulo} value={modulo.toLowerCase()}>{modulo}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Descripción</label>
                    <textarea className={f.textarea} placeholder="Descripción del permiso..." name="description" defaultValue={selectedPermiso?.description} />
                  </div>
                </div>
                 <div className={f.formActions}>
                   <Button variant="secondary" type="button" onClick={handleCloseModal}>
                     Cancelar
                   </Button>
                   <Button type="submit" disabled={saving}>
                     {saving ? 'Guardando...' : (selectedPermiso ? 'Guardar cambios' : 'Crear permiso')}
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
            await permissionsApi.remove(deleteConfirm.id);
            setItems(prev => prev.filter(it => it.id !== deleteConfirm.id));
            toast.success('Permiso eliminado');
          } catch {
            toast.error('No se pudo eliminar el permiso');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar permiso"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.code}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};
