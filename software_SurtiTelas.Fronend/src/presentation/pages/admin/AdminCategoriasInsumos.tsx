import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, RefreshCw } from 'lucide-react';
import s from './AdminCategoriasInsumos.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { rawMaterialCategoriesApi, type RawMaterialCategoryDTO } from '@/infrastructure/api/rawMaterialCategoriesApi';
import { useServerPagination } from '@/hooks/useServerPagination';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

export const AdminCategoriasInsumos: React.FC = () => {
  const [items, setItems] = useState<RawMaterialCategoryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RawMaterialCategoryDTO | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<RawMaterialCategoryDTO | null>(null);
  const [saving, setSaving] = useState(false);

  const [formNombre, setFormNombre] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formEstado, setFormEstado] = useState<'ACTIVO' | 'INACTIVO'>('ACTIVO');

  const pagination = useServerPagination(10);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean | undefined | null> = {
        page: pagination.page,
        limit: pagination.limit,
        sort: 'nombre',
        order: 'asc',
      };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      const result = await rawMaterialCategoriesApi.list(query);
      setItems(result.items);
      pagination.setTotalRecords(result.meta.totalRecords);
    } catch {
      setError('No se pudieron cargar las categorías');
      toast.error('No se pudieron cargar las categorías');
    } finally {
      setLoading(false);
    }
  }, [pagination, debouncedSearch]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const resetForm = () => {
    setFormNombre('');
    setFormSlug('');
    setFormDescripcion('');
    setFormEstado('ACTIVO');
    setEditing(null);
    setSaving(false);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (item: RawMaterialCategoryDTO) => {
    setEditing(item);
    setFormNombre(item.nombre);
    setFormSlug(item.slug);
    setFormDescripcion(item.descripcion ?? '');
    setFormEstado(item.estado as 'ACTIVO' | 'INACTIVO');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!formNombre.trim() || !formSlug.trim()) {
      toast.error('Nombre y slug son obligatorios');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        const updated = await rawMaterialCategoriesApi.update(editing.id, {
          nombre: formNombre.trim(),
          slug: formSlug.trim(),
          descripcion: formDescripcion.trim() || undefined,
          estado: formEstado,
        });
        setItems(prev => prev.map(it => (it.id === updated.id ? updated : it)));
        toast.success('Categoría actualizada');
      } else {
        const created = await rawMaterialCategoriesApi.create({
          nombre: formNombre.trim(),
          slug: formSlug.trim(),
          descripcion: formDescripcion.trim() || undefined,
          estado: formEstado,
        });
        setItems(prev => [created, ...prev]);
        toast.success('Categoría creada');
      }
      setModalOpen(false);
      resetForm();
      void fetchCategories();
    } catch {
      toast.error('No se pudo guardar la categoría');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await rawMaterialCategoriesApi.remove(deleteConfirm.id);
      setItems(prev => prev.filter(it => it.id !== deleteConfirm.id));
      toast.success('Categoría eliminada');
      setDeleteConfirm(null);
    } catch {
      toast.error('No se pudo eliminar la categoría');
    }
  };

  const handleToggleStatus = async (item: RawMaterialCategoryDTO) => {
    const newStatus = item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const updated = await rawMaterialCategoriesApi.update(item.id, { estado: newStatus });
      setItems(prev => prev.map(it => (it.id === updated.id ? updated : it)));
      toast.success(`Categoría ${newStatus === 'ACTIVO' ? 'activada' : 'desactivada'}`);
    } catch {
      toast.error('No se pudo cambiar el estado');
    }
  };

  const columns: DataTableColumn<RawMaterialCategoryDTO>[] = [
    { key: 'nombre', header: 'Nombre', sortable: true, render: (c) => <span style={{ fontWeight: 600 }}>{c.nombre}</span> },
    { key: 'slug', header: 'Slug', render: (c) => <code style={{ fontSize: '0.8rem' }}>{c.slug}</code> },
    { key: 'descripcion', header: 'Descripción', render: (c) => c.descripcion ?? '—' },
    {
      key: 'estado',
      header: 'Estado',
      width: '120px',
      render: (c) => <StatusBadge status={c.estado} />,
    },
  ];

  const actions = (c: RawMaterialCategoryDTO) => [
    { label: 'Editar', icon: <Edit size={14} />, onClick: () => openEdit(c) },
    { label: c.estado === 'ACTIVO' ? 'Desactivar' : 'Activar', icon: <RefreshCw size={14} />, onClick: () => handleToggleStatus(c) },
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(c), danger: true },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Categorías de insumos</h1>
          <p className={s.pageSubtitle}>Gestión de categorías para materias primas</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
          Nueva categoría
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar categorías..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <DataTable
        data={items}
        columns={columns}
        actions={actions}
        pageSize={pagination.limit}
        emptyMessage={loading ? 'Cargando...' : error ?? 'No hay categorías'}
        serverMode
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalRecords}
        onPageChange={(newPage) => pagination.setPage(newPage)}
      />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); resetForm(); }} title={editing ? 'Editar categoría' : 'Nueva categoría'} size="sm">
        <form className={f.form} onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className={f.field}>
            <label className={f.label}>Nombre *</label>
            <input className={f.input} value={formNombre} onChange={(e) => setFormNombre(e.target.value)} />
          </div>
          <div className={f.field}>
            <label className={f.label}>Slug *</label>
            <input className={f.input} value={formSlug} onChange={(e) => setFormSlug(e.target.value)} />
          </div>
          <div className={f.field}>
            <label className={f.label}>Descripción</label>
            <textarea className={f.textarea} value={formDescripcion} onChange={(e) => setFormDescripcion(e.target.value)} rows={3} />
          </div>
          <div className={f.field}>
            <label className={f.label}>Estado</label>
            <select className={f.select} value={formEstado} onChange={(e) => setFormEstado(e.target.value as 'ACTIVO' | 'INACTIVO')}>
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
            </select>
          </div>
          <ModalFooter
            secondary={{ label: 'Cancelar', onClick: () => { setModalOpen(false); resetForm(); } }}
            primary={{ label: editing ? 'Guardar cambios' : 'Crear categoría', type: 'submit', loading: saving }}
          />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar categoría"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"?`}
        confirmLabel="Eliminar"
        variant="danger"
      />
    </div>
  );
};
