import React, { useState, useMemo } from 'react';
import { Eye, EyeOff, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import s from './Catalogo.module.css';
import f from '@/styles/Form.module.css';
import { DataTable, DataTableColumn } from '@/shared/ui/DataTable';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Modal } from '@/shared/ui/Modal';
import { ProductPreviewModal } from '@/presentation/components/ProductPreviewModal';
import { ProductDetailModal } from '@/presentation/components/ProductDetailModal';
import { useProductos } from '@/core/stores';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import type { Producto, ProductoDetalle, PublicationStatus } from '@/core/types';

const publishStatus = (p: Producto): PublicationStatus => {
  if (!p.publicado) return p.estado === 'Inactivo' ? 'Oculto' : 'Borrador';
  return 'Publicado';
};

export const AsesorCatalogo: React.FC = () => {
  const { productos, createProducto, updateProducto, deleteProducto, publishProducto, unpublishProducto } = useProductos();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Producto | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publicationProduct, setPublicationProduct] = useState<Producto | null>(null);
  const [detailProduct, setDetailProduct] = useState<Producto | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Producto | null>(null);

  const emptyForm: ProductoDetalle = {
    nombre: '',
    precio: 0,
    imagen: '',
    categoria: '',
    descripcion: '',
    tallas: [],
    colores: [],
    rating: undefined,
    reviews: undefined,
  };

  const [form, setForm] = useState<ProductoDetalle>(emptyForm);

  const updateForm = (patch: Partial<ProductoDetalle>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const filtered = useMemo(() => {
    return productos.filter(p =>
      p.ref.toLowerCase().includes(search.toLowerCase()) ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase()))
    );
  }, [productos, search]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingRef(null);
    setFormError(null);
    setIsModalOpen(false);
  };

  const openEdit = (product: Producto) => {
    setEditingRef(product.ref);
    setForm({
      id: product.ref,
      nombre: product.nombre,
      precio: product.precio,
      imagen: product.imagenPrincipal || product.imagenes?.[0] || '',
      categoria: product.categoria || '',
      descripcion: product.descripcion || product.descripcionCorta || '',
      tallas: product.tallas || [],
      colores: product.colores || [],
      rating: undefined,
      reviews: undefined,
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const validateForm = (): boolean => {
    setFormError(null);
    if (!form.nombre?.trim()) { setFormError('El nombre del producto es obligatorio'); return false; }
    if (!form.categoria?.trim()) { setFormError('La categoría es obligatoria'); return false; }
    if (!form.precio || Number(form.precio) <= 0) { setFormError('El precio debe ser mayor a 0'); return false; }
    if (!form.imagen?.trim()) {
      setFormError('Debes añadir al menos 1 imagen para el producto.');
      return false;
    }
    return true;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const totalQty = 0;
      const stockStatus: Producto['stock'] = totalQty === 0 ? 'Agotado' : totalQty <= 10 ? 'Bajo stock' : 'OK';
      const baseData: Omit<Producto, 'ref'> = {
        nombre: form.nombre.trim(),
        descripcion: form.descripcion?.trim() || '',
        descripcionCorta: form.descripcion?.trim() || form.nombre.trim(),
        categoria: form.categoria?.trim() || 'General',
        subcategoria: '',
        marca: 'SurtiTelas',
        precio: Number(form.precio) || 0,
        precioAnterior: 0,
        descuento: 0,
        stock: stockStatus,
        cantidadStock: totalQty,
        estado: 'Activo',
        imagenes: form.imagen ? [form.imagen] : [],
        imagenPrincipal: form.imagen || '',
        publicado: false,
        destacado: false,
        oferta: false,
        nuevo: false,
        masVendido: false,
        tela: '',
        colores: form.colores || [],
        tallas: form.tallas || [],
      };

      if (editingRef) {
        const refreshed = await updateProducto(editingRef, baseData);
        toast.success(`${refreshed.nombre} actualizado correctamente`);
      } else {
        const nuevoCodigo = `PROD-${String(productos.length + 1).padStart(3, '0')}`;
        const creado = await createProducto({ ...baseData, codigo: nuevoCodigo });
        toast.success(`${creado.nombre} creado correctamente`);
      }

      resetForm();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePublication = async () => {
    if (!publicationProduct) return;
    const status = publishStatus(publicationProduct);
    try {
      const success = status === 'Publicado'
        ? await unpublishProducto(publicationProduct.ref)
        : await publishProducto(publicationProduct.ref);

      if (success) {
        toast.success(status === 'Publicado' ? 'Producto ocultado correctamente' : 'Producto publicado correctamente');
      } else {
        toast.error('El producto requiere nombre, categoría, precio e imagen para publicarse');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al cambiar estado de publicación');
    } finally {
      setPublicationProduct(null);
    }
  };

  const handleEdit = (product: Producto) => openEdit(product);

  const handleOpenDetail = (product: Producto) => {
    setDetailProduct(product);
    setIsDetailOpen(true);
  };

  const columns: DataTableColumn<Producto>[] = [
    {
      key: 'nombre',
      header: 'Producto',
      sortable: true,
      minWidth: '220px',
      render: (item: Producto) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.88rem' }}>{item.nombre}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            {item.codigo || item.ref}
          </div>
        </div>
      ),
    },
    {
      key: 'categoria',
      header: 'Categoría',
      sortable: true,
      render: (item: Producto) => (
        <div>
          <div style={{ fontSize: '0.84rem', color: 'var(--color-text-secondary)' }}>{item.categoria || 'General'}</div>
          {item.subcategoria && <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.subcategoria}</div>}
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (item: Producto) => {
        return <StatusBadge status={item.stock} />;
      },
    },
    {
      key: 'cantidadStock',
      header: 'Stock',
      sortable: true,
      align: 'right',
      render: (item: Producto) => <span style={{ fontSize: '0.84rem' }}>{item.cantidadStock}</span>,
    },
    {
      key: 'precio',
      header: 'Precio',
      sortable: true,
      align: 'right',
      render: (item: Producto) => (
        <div>
          <span style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '0.88rem' }}>
            ${item.precio.toLocaleString()}
          </span>
          {item.precioAnterior && item.precioAnterior > item.precio && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
              ${item.precioAnterior.toLocaleString()}
              {(item.descuento ?? 0) > 0 && <span style={{ color: '#ef4444', marginLeft: '4px' }}>-{item.descuento}%</span>}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'publicacion',
      header: 'Publicación',
      sortable: true,
      align: 'center',
      render: (item: Producto) => {
        const status = publishStatus(item);
        const config: { [K in PublicationStatus]: { variant: 'success' | 'warning' | 'danger'; icon: string } } = {
          Publicado: { variant: 'success', icon: '🟢' },
          Borrador: { variant: 'warning', icon: '🟡' },
          Oculto: { variant: 'danger', icon: '🔴' },
        };
        const cfg = config[status];
        return <StatusBadge status={status} dot>{cfg.icon} {status}</StatusBadge>;
      },
    },
  ];

  const actions = (item: Producto) => [
    {
      label: 'Ver más',
      icon: <Eye size={14} />,
      onClick: () => handleOpenDetail(item),
    },
    {
      label: 'Vista previa',
      icon: <Eye size={14} />,
      onClick: () => { setPreviewProduct(item); setPreviewOpen(true); },
    },
    {
      label: 'Editar',
      icon: <Edit size={14} />,
      onClick: () => handleEdit(item),
    },
    {
      label: publishStatus(item) === 'Publicado' ? 'Ocultar' : 'Publicar',
      icon: <EyeOff size={14} />,
      onClick: () => setPublicationProduct(item),
    },
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: () => setDeleteConfirm(item),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 className={s.pageTitle}>Gestión de Productos</h1>
        <p className={s.pageSubtitle}>Gestiona productos para el Gestión de Productos del frontend</p>
      </div>

      <div style={{ marginBottom: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <SearchInput
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          debounceMs={100}
          minChars={0}
        />
        <Button leftIcon={<Plus size={16} />} onClick={() => { setEditingRef(null); setIsModalOpen(true); }}>
          Nuevo Producto
        </Button>
      </div>

      <DataTable<Producto>
        data={filtered}
        columns={columns}
        actions={actions}
        enableExport={false}
        enableRowSelection={false}
        enableSorting={true}
        enableColumnFilters={false}
        toolbarLeft={null}
        maxVisibleColumns={6}
      />

      <Modal open={isModalOpen} onClose={resetForm} title={editingRef ? 'Editar Producto' : 'Registrar Nuevo Producto'} size="lg">
        <form onSubmit={handleSaveProduct} className={s.modalForm}>
          {formError && !saving && (
            <div style={{ padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: '10px', color: '#ef4444', fontSize: '0.82rem', fontWeight: 500 }}>
              {formError}
            </div>
          )}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información básica</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label>Nombre del Producto *</label>
                <input type="text" value={form.nombre} onChange={(e) => updateForm({ nombre: e.target.value })} placeholder="Ej: Camiseta Oversize Premium" />
              </div>
              <div className={f.field}>
                <label>Categoría *</label>
                <input type="text" value={form.categoria || ''} onChange={(e) => updateForm({ categoria: e.target.value })} placeholder="Ej: Camisetas" />
              </div>
            </div>

            <div className={f.field}>
              <label>Descripción</label>
              <textarea value={form.descripcion || ''} onChange={(e) => updateForm({ descripcion: e.target.value })} placeholder="Añade detalles..." rows={3} />
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Precio y atributos</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label>Precio ($) *</label>
                <input type="number" min="1" value={form.precio} onChange={(e) => updateForm({ precio: Number(e.target.value) })} placeholder="Precio base" />
              </div>
              <div className={f.field}>
                <label>Calificación (rating)</label>
                <input type="number" min="0" max="5" step="0.1" value={form.rating ?? ''} onChange={(e) => updateForm({ rating: e.target.value ? Number(e.target.value) : undefined })} placeholder="0 - 5" />
              </div>
            </div>

            <div className={f.formRow}>
              <div className={f.field}>
                <label>Colores Disponibles</label>
                <input type="text" value={(form.colores || []).join(', ')} onChange={(e) => updateForm({ colores: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })} placeholder="Ej: Azul, Blanco, Verde" />
              </div>
              <div className={f.field}>
                <label>Tallas Disponibles</label>
                <input type="text" value={(form.tallas || []).join(', ')} onChange={(e) => updateForm({ tallas: e.target.value.split(',').map(t => t.trim().toUpperCase()).filter(Boolean) })} placeholder="Ej: S, M, L, XL" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Imagen y reseñas</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label>Imagen del Producto (URL) *</label>
                <input type="text" value={form.imagen || ''} onChange={(e) => updateForm({ imagen: e.target.value })} placeholder="https://..." />
              </div>
              <div className={f.field}>
                <label>Reseñas (reviews)</label>
                <input type="number" min="0" value={form.reviews ?? ''} onChange={(e) => updateForm({ reviews: e.target.value ? Number(e.target.value) : undefined })} placeholder="0" />
              </div>
            </div>
          </div>

          <div className={f.formActions}>
            <Button type="button" variant="secondary" onClick={resetForm} disabled={saving}>Cancelar</Button>
            <Button type="submit" loading={saving}>{editingRef ? 'Guardar Cambios' : 'Crear Producto (Borrador)'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmationModal
        open={Boolean(publicationProduct)}
        onClose={() => setPublicationProduct(null)}
        onConfirm={handleTogglePublication}
        title={publicationProduct && publishStatus(publicationProduct) === 'Publicado' ? 'Ocultar producto' : 'Publicar producto'}
        description={publicationProduct && publishStatus(publicationProduct) === 'Publicado'
          ? `¿Ocultar "${publicationProduct.nombre}" del catálogo público?`
          : `¿Publicar "${publicationProduct?.nombre}" en el catálogo público?`}
        confirmLabel={publicationProduct && publishStatus(publicationProduct) === 'Publicado' ? 'Ocultar' : 'Publicar'}
      />

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await deleteProducto(deleteConfirm.ref);
            toast.success('Producto eliminado del catálogo');
          } catch {
            toast.error('No se pudo eliminar el producto');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar producto"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger"
      />

      <ProductPreviewModal open={previewOpen} onClose={() => setPreviewOpen(false)} product={previewProduct} />

      {detailProduct && (
        <ProductDetailModal
          product={detailProduct}
          isOpen={isDetailOpen}
          onClose={() => setIsDetailOpen(false)}
        />
      )}
    </div>
  );
};
