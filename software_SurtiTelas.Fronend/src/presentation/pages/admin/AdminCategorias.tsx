import React, { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import s from './AdminCategorias.module.css';
import { DataTable, DataTableColumn, DataTableAction } from '@/shared/ui/DataTable';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { categoryService, type CategoryDTO, type CategoryWithStockDTO } from '@/services/categoryService';

type FormState = {
  nombre: string;
  slug: string;
};

const initialForm: FormState = { nombre: '', slug: '' };

export const AdminCategorias: React.FC = () => {
  const [items, setItems] = useState<CategoryDTO[]>([]);
  const [search, setSearch] = useState('');
  const [_loading, setLoading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<CategoryDTO | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const [stockStatus, setStockStatus] = useState<CategoryWithStockDTO[]>([]);
  const [_stockLoading, setStockLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await categoryService.list();
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  const loadStockStatus = async () => {
    setStockLoading(true);
    try {
      const data = await categoryService.getWithLowStock();
      setStockStatus(data);
    } finally {
      setStockLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadStockStatus();
  }, []);

  const openCreate = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsCreateOpen(true);
  };

  const openEdit = (item: CategoryDTO) => {
    setForm({
      nombre: item.nombre,
      slug: item.slug,
    });
    setEditingId(item.id);
    setIsEditOpen(true);
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setIsCreateOpen(false);
    setIsEditOpen(false);
  };

  const handleSave = async () => {
    if (!form.nombre.trim() || !form.slug.trim()) {
      toast.error('Nombre y slug son obligatorios');
      return;
    }
    try {
      if (editingId) {
        const updated = await categoryService.update(editingId, {
          nombre: form.nombre.trim(),
          slug: form.slug.trim(),
        });
        setItems((prev) => prev.map((it) => (it.id === updated.id ? updated : it)));
      } else {
        const created = await categoryService.create({
          nombre: form.nombre.trim(),
          slug: form.slug.trim(),
        });
        setItems((prev) => [...prev, created]);
      }
      resetForm();
      loadStockStatus();
    } catch (err: unknown) {
      const message = (err as { message?: string })?.message || 'Error al guardar la categoría';
      toast.error(message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await categoryService.delete(deleteConfirm.id);
      setItems((prev) => prev.filter((it) => it.id !== deleteConfirm.id));
      setDeleteConfirm(null);
      loadStockStatus();
    } catch {
      // handled in service
    }
  };

  const handleToggleStatus = async (item: CategoryDTO) => {
    const newStatus = item.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    try {
      const updated = await categoryService.update(item.id, { estado: newStatus });
      setItems((prev) => prev.map((it) => (it.id === updated.id ? { ...it, estado: newStatus } : it)));
      toast.success(`Categoría ${newStatus === 'ACTIVO' ? 'activada' : 'desactivada'}`);
    } catch {
      toast.error('No se pudo cambiar el estado');
    }
  };

  const filtered = items.filter((it) => {
    const term = search.toLowerCase();
    return (
      it.nombre.toLowerCase().includes(term) ||
      it.slug.toLowerCase().includes(term)
    );
  });

  const stockMap = new Map(stockStatus.map((it) => [it.id, it]));

  const columns: DataTableColumn<CategoryDTO>[] = [
    {
      key: 'nombre',
      header: 'Nombre',
      sortable: true,
      minWidth: '200px',
      render: (item) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.88rem' }}>
            {item.nombre}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {item.slug}
          </div>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      width: '160px',
      align: 'center',
      render: (item) => {
        const st = stockMap.get(item.id);
        if (!st) return <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>—</span>;
        const hasLow = st.productosBajoStock > 0 || st.productosAgotados > 0;
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {hasLow && <AlertTriangle size={14} style={{ color: 'var(--color-accent)' }} />}
            <StatusBadge status={hasLow ? 'Bajo stock' : 'OK'} label={`${st.totalProductos} prod.`} />
            <span style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
              {st.productosBajoStock > 0 && <>Bajo: {st.productosBajoStock} </>}
              {st.productosAgotados > 0 && <>Agot: {st.productosAgotados}</>}
            </span>
          </div>
        );
      },
    },
  ];

  const actions: DataTableAction<CategoryDTO>[] = [
    {
      label: 'Editar',
      icon: <Edit size={14} aria-hidden="true" focusable="false" />,
      onClick: openEdit,
    },
    {
      label: (item) => item.estado === 'ACTIVO' ? 'Desactivar' : 'Activar',
      icon: <RefreshCw size={14} aria-hidden="true" focusable="false" />,
      onClick: (item) => handleToggleStatus(item),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} aria-hidden="true" focusable="false" />,
      danger: true,
      onClick: (item) => setDeleteConfirm(item),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Categorías</h1>
          <p className={s.pageSubtitle}>Gestión de categorías de productos</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
          Nueva Categoría
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar categorías..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          debounceMs={100}
          minChars={0}
        />
      </div>

      <DataTable
        data={filtered}
        columns={columns}
        actions={actions}
        enableSorting={true}
        enableColumnFilters={false}
        toolbarLeft={null}
        maxVisibleColumns={6}
      />

      <Modal open={isCreateOpen || isEditOpen} onClose={resetForm} title={editingId ? 'Editar Categoría' : 'Nueva Categoría'} size="sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
          className={s.form}
        >
          <div className={s.formRow}>
            <div className={s.field}>
              <label className={s.label} htmlFor="cat-nombre">Nombre *</label>
              <input id="cat-nombre" className={s.input} type="text" value={form.nombre} onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Camisetas" />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="cat-slug">Slug *</label>
              <input id="cat-slug" className={s.input} type="text" value={form.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} placeholder="Ej: camisetas" />
            </div>
          </div>
          <ModalFooter
            secondary={{ label: 'Cancelar', onClick: resetForm }}
            primary={{ label: editingId ? 'Guardar Cambios' : 'Crear Categoría', type: 'submit' }}
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
