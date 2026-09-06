import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Upload } from 'lucide-react';
import { toast } from 'sonner';

import s from './AdminCatalogo.module.css';
import f from '@/styles/Form.module.css';
import { DataTable, DataTableColumn, DataTableAction } from '@/shared/ui/DataTable';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { AddTagInput } from '@/presentation/components/AddTagInput';
import { ProductPreviewModal } from '@/presentation/components/ProductPreviewModal';
import { ProductDetailModal } from '@/presentation/components/ProductDetailModal';
import { useProductos, useAppStore } from '@/core/stores';
import { useAuth } from '@/core/stores/authStore';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import type { Producto, PublicationStatus } from '@/core/types';
import { ETIQUETAS_PRODUCTO } from '@/shared/constants/options';

const publishStatus = (p: Producto): PublicationStatus => {
  if (!p.publicado) return p.estado === 'Inactivo' ? 'Oculto' : 'Borrador';
  return 'Publicado';
};

export const AdminCatalogo: React.FC = () => {
  const isAdmin = useAuth().user?.role === 'admin';
  const canPublish = isAdmin;
  const canUnpublish = isAdmin;
  const { productos, deleteProducto } = useProductos();
  const [search, setSearch] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [previewProduct, setPreviewProduct] = useState<Producto | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<Producto | null>(null);
  const [detailProduct, setDetailProduct] = useState<Producto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const publishingRef = React.useRef<Record<string, boolean>>({} as Record<string, boolean>);
  const [, setTick] = useState(0);

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingRef, setEditingRef] = useState<string | null>(null);

  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string; slug: string }>>([]);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionCorta, setDescripcionCorta] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioAnterior, setPrecioAnterior] = useState('');
  const [descuento, setDescuento] = useState('');
  const [cantidadStock, setCantidadStock] = useState('');
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');
  const [colores, setColores] = useState<string[]>([]);
  const [tallas, setTallas] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [imagenPrincipal, setImagenPrincipal] = useState('');
  const [destacado, setDestacado] = useState(false);
  const [oferta, setOferta] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [masVendido, setMasVendido] = useState(false);
  const [tela, setTela] = useState('');
  const [codigo, setCodigo] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localFiles, setLocalFiles] = useState<Record<string, File>>({});

  const filtered = useMemo(() => {
    return productos.filter(p =>
      p.ref.toLowerCase().includes(search.toLowerCase()) ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase()))
    );
  }, [productos, search]);

  const resetForm = () => {
    setNombre('');
    setDescripcion('');
    setDescripcionCorta('');
    setCategoria('');
    setSubcategoria('');
    setMarca('');
    setPrecio('');
    setPrecioAnterior('');
    setDescuento('');
    setCantidadStock('');
    setEstado('Activo');
    setColores([]);
    setTallas([]);
    setImagenes([]);
    setImagenPrincipal('');
    setDestacado(false);
    setOferta(false);
    setNuevo(false);
    setMasVendido(false);
    setTela('');
    setCodigo('');
    setLocalFiles({});
    setEditingRef(null);
    setFormError(null);
    setIsCreateOpen(false);
    setIsEditOpen(false);
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  };

  const handleAddLocalImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = 4 - imagenes.length;
    if (remaining <= 0) {
      toast.error('Máximo 4 imágenes');
      return;
    }
    const next = [...imagenes];
    const nextLocal = { ...localFiles };
    const toProcess = Array.from(files).slice(0, remaining);
    for (const file of toProcess) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await readFileAsDataURL(file);
      const id = `${Date.now()}-${Math.round(Math.random() * 1000)}`;
      next.push(dataUrl);
      nextLocal[id] = file;
    }
    setImagenes(next);
    setLocalFiles(nextLocal);
    if (!imagenPrincipal && next.length > 0) {
      setImagenPrincipal(next[0]);
    }
  };

  const handleRemoveImage = (index: number) => {
    const next = imagenes.filter((_, i) => i !== index);
    setImagenes(next);
    setLocalFiles((prev) => {
      const nextLocal = { ...prev };
      delete nextLocal[imagenes[index]];
      return nextLocal;
    });
    if (imagenPrincipal === imagenes[index]) {
      setImagenPrincipal(next.length > 0 ? next[0] : '');
    }
  };

  const handleSetPrincipal = (url: string) => {
    setImagenPrincipal(url);
  };

  const openEdit = (product: Producto) => {
    setEditingRef(product.ref);
    setNombre(product.nombre);
    setDescripcion(product.descripcion || '');
    setDescripcionCorta(product.descripcionCorta || product.descripcion || '');
    setCategoria(product.categoria || '');
    setSubcategoria(product.subcategoria || '');
    setMarca(product.marca || '');
    setPrecio(String(product.precio));
    setPrecioAnterior(product.precioAnterior ? String(product.precioAnterior) : '');
    setDescuento(product.descuento ? String(product.descuento) : '');
    setCantidadStock(String(product.cantidadStock));
    setEstado(product.estado || 'Activo');
    setColores(product.colores || []);
    setTallas(product.tallas || []);
    setImagenes(product.imagenes || []);
    setImagenPrincipal(product.imagenPrincipal || '');
    setDestacado(product.destacado || false);
    setOferta(product.oferta || false);
    setNuevo(product.nuevo || false);
    setMasVendido(product.masVendido || false);
    setTela(product.tela || '');
    setCodigo(product.codigo || '');
    setFormError(null);
    setIsEditOpen(true);
  };

  useEffect(() => {
    if (isCreateOpen || isEditOpen) {
      categoryService.list().then((data) => setCategorias(data));
    }
  }, [isCreateOpen, isEditOpen]);

  const validateForm = (): boolean => {
    setFormError(null);
    if (!nombre.trim()) { setFormError('El nombre del producto es obligatorio'); return false; }
    if (!categoria.trim()) { setFormError('La categoría es obligatoria'); return false; }
    if (!precio || Number(precio) <= 0) { setFormError('El precio debe ser mayor a 0'); return false; }
    if (!imagenPrincipal && (!imagenes || imagenes.length === 0)) {
      setFormError('Debes añadir al menos 1 imagen para el producto.');
      return false;
    }
    if (imagenes.length > 4) { setFormError('El producto permite un máximo de 4 imágenes.'); return false; }
    if (cantidadStock !== '' && Number(cantidadStock) < 0) { setFormError('La cantidad en stock no puede ser negativa'); return false; }
    if (!colores || colores.length === 0) { setFormError('Debes añadir al menos 1 color.'); return false; }
    if (!tallas || tallas.length === 0) { setFormError('Debes añadir al menos 1 talla.'); return false; }
    return true;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const totalQty = Number(cantidadStock) || 0;
      const pre = precioAnterior ? Number(precioAnterior) : Number(precio);
      const desc = descuento ? Number(descuento) : 0;
      const baseData: Omit<Producto, 'ref'> = {
        codigo: codigo.trim() || undefined,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || descripcionCorta.trim(),
        descripcionCorta: descripcionCorta.trim() || descripcion.trim() || nombre.trim(),
        categoria: categoria.trim(),
        subcategoria: subcategoria.trim(),
        marca: marca.trim(),
        precio: Number(precio),
        precioAnterior: pre,
        descuento: desc,
        stock: totalQty === 0 ? 'Agotado' : totalQty <= 10 ? 'Bajo stock' : 'OK' as 'OK' | 'Bajo stock' | 'Agotado',
        cantidadStock: totalQty,
        estado,
        imagenes: imagenes.filter(Boolean),
        imagenPrincipal: imagenPrincipal || (imagenes.length > 0 ? imagenes[0] : ''),
        destacado,
        oferta,
        nuevo,
        masVendido,
        tela: tela.trim(),
        colores,
        tallas,
      };

      if (editingRef) {
        const refreshed = await useAppStore.getState().updateProducto(editingRef, baseData);
        toast.success(`${refreshed.nombre} actualizado correctamente`);
      } else {
        const creado = await useAppStore.getState().createProducto(baseData);
        toast.success(`${creado.nombre} creado correctamente`);
      }

      resetForm();
} catch (err: unknown) {
       toast.error((err as { message?: string })?.message || 'Error al guardar producto');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (product: Producto) => {
    if (!canPublish) return;
    try {
      publishingRef.current[product.ref] = true;
      setTick(t => t + 1);
      const resp = await productService.publish(product.ref) as { success: boolean; data?: Producto; error?: string };
      if (resp?.success && resp?.data) {
        useAppStore.getState().updateProducto(product.ref, resp.data);
        toast.success(`"${resp.data.nombre}" publicado correctamente`);
      } else {
        toast.error(resp?.error || 'Error al publicar');
      }
    } catch {
      toast.error('Error de conexión al publicar');
    } finally {
      delete publishingRef.current[product.ref];
      setTick(t => t + 1);
    }
  };

  const handleUnpublish = async (product: Producto) => {
    if (!canUnpublish) return;
    try {
      const resp = await productService.unpublish(product.ref) as { success: boolean; data?: Producto; error?: string };
      if (resp?.success && resp?.data) {
        useAppStore.getState().updateProducto(product.ref, resp.data);
        toast.success(`"${resp.data.nombre}" ya no está visible en el catálogo`);
      } else {
        toast.error(resp?.error || 'Error al ocultar');
      }
    } catch {
      toast.error('Error de conexión');
    }
  };

  const handleOpenPreview = (product: Producto) => {
    setPreviewProduct(product);
    setPreviewOpen(true);
  };

  const handleOpenDetail = (product: Producto) => {
    setDetailProduct(product);
    setIsModalOpen(true);
  };

  const columns: DataTableColumn<Producto>[] = [
    {
      key: 'nombre',
      header: 'Producto',
      sortable: true,
      minWidth: '220px',
      render: (item: Producto) => (
        <div>
          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '0.88rem' }}>
            {item.nombre}
          </div>
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
          {item.subcategoria && (
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{item.subcategoria}</div>
          )}
        </div>
      ),
    },
    {
      key: 'estado',
      header: 'Estado',
      sortable: true,
      align: 'center',
      render: (item: Producto) => {
        return <StatusBadge status={item.stock} />;
      },
    },
    {
      key: 'stock',
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
        return <StatusBadge status={status} dot />;
      },
    },
  ];

  const actions: DataTableAction<Producto>[] = [
    {
      label: 'Ver más',
      icon: <Eye size={14} aria-hidden="true" focusable="false" />,
      onClick: (item: Producto) => handleOpenDetail(item),
    },
    {
      label: 'Vista previa',
      icon: <Eye size={14} aria-hidden="true" focusable="false" />,
      onClick: (item: Producto) => handleOpenPreview(item),
    },
    {
      label: 'Editar',
      icon: <Edit size={14} aria-hidden="true" focusable="false" />,
      onClick: (item: Producto) => openEdit(item),
    },
    ...(canPublish ? [
      {
        label: 'Publicar',
        icon: <Eye size={14} aria-hidden="true" focusable="false" />,
        onClick: (item: Producto) => handlePublish(item),
        disabled: (item: Producto) => (item.publicado === true) || (publishingRef.current[item.ref] === true),
      },
    ] : []),
    ...(canUnpublish ? [
      {
        label: 'Ocultar',
        icon: <EyeOff size={14} aria-hidden="true" focusable="false" />,
        onClick: (item: Producto) => handleUnpublish(item),
        disabled: (item: Producto) => item.publicado !== true,
      },
    ] : []),
    {
      label: 'Eliminar',
      icon: <Trash2 size={14} aria-hidden="true" focusable="false" />,
      danger: true,
      onClick: (item: Producto) => setDeleteConfirm(item),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className={s.pageTitle}>Catálogo Digital</h1>
          <p className={s.pageSubtitle}>Gestiona productos para el catálogo digital del frontend</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => setIsCreateOpen(true)}>
          Nuevo Producto
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar por nombre, código o categoría..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          debounceMs={100}
          minChars={0}
        />
      </div>

      <DataTable enableExport={false} enableRowSelection={false}
        data={filtered}
        columns={columns}
        actions={actions}

        enableSorting={true}
        enableColumnFilters={false}
        toolbarLeft={null}
        maxVisibleColumns={6}
      />

      <Modal open={isCreateOpen || isEditOpen} onClose={resetForm} title={editingRef ? 'Editar Producto' : 'Registrar Nuevo Producto'} size="lg">
        <form onSubmit={handleSaveProduct} className={f.form}>
          {formError && !saving && (
            <div className={f.formError} role="alert">
              {formError}
            </div>
          )}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información básica</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-codigo">Código</label>
                <input id="ac-codigo" className={f.input} type="text" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej: CAM-001" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-nombre">Nombre del Producto *</label>
                <input id="ac-nombre" className={f.input} type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Camiseta Oversize Premium" />
              </div>
            </div>

            <div className={f.formRow}>
              <div className={f.field} style={{ position: 'relative' }}>
                <label className={f.label} htmlFor="ac-categoria">Categoría *</label>
                <select id="ac-categoria" className={f.select} value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">Seleccionar categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className={f.field}>
              <label className={f.label} htmlFor="ac-descripcion-corta">Descripción Corta</label>
              <input id="ac-descripcion-corta" className={f.input} type="text" value={descripcionCorta} onChange={e => setDescripcionCorta(e.target.value)} placeholder="Resumen breve para el catálogo" />
            </div>

            <div className={f.field}>
              <label className={f.label} htmlFor="ac-descripcion">Descripción Completa</label>
              <textarea id="ac-descripcion" className={f.textarea} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Añade detalles sobre el producto..." rows={3} />
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Precio y stock</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-precio">Precio ($) *</label>
                <input id="ac-precio" className={f.input} type="number" required min="1" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio base" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-precio-anterior">Precio Anterior (opcional)</label>
                <input id="ac-precio-anterior" className={f.input} type="number" min="0" value={precioAnterior} onChange={e => setPrecioAnterior(e.target.value)} placeholder="Sin descuento" />
              </div>
            </div>

            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-descuento">Descuento (%)</label>
                <input id="ac-descuento" className={f.input} type="number" min="0" max="100" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-stock">Cantidad Stock</label>
                <input id="ac-stock" className={f.input} type="number" required min="0" value={cantidadStock} onChange={e => setCantidadStock(e.target.value)} placeholder="Unidades en bodega" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Características</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-tela">Tipo de Tela</label>
                <input id="ac-tela" className={f.input} type="text" value={tela} onChange={e => setTela(e.target.value)} placeholder="Ej: Algodón, Poliéster" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-marca">Marca</label>
                <input id="ac-marca" className={f.input} type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Marca" />
              </div>
            </div>

            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-colores">Colores Disponibles</label>
                <AddTagInput tags={colores} onTagsChange={setColores} placeholder="Ej: Azul, Rojo claro, Verde oscuro" colorMode={true} />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-tallas">Tallas Disponibles</label>
                <AddTagInput tags={tallas} onTagsChange={setTallas} placeholder="Ej: S, M, L, XL" />
              </div>
            </div>

            <div className={f.field}>
              <label className={f.label} htmlFor="ac-subcategoria">Subcategoría</label>
              <input id="ac-subcategoria" className={f.input} type="text" value={subcategoria} onChange={e => setSubcategoria(e.target.value)} placeholder="Ej: Básicas, Premium" />
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Imágenes</h3>
            <div className={f.field}>
              <label className={f.label} htmlFor="ac-imagen-principal">Imagen Principal</label>
              <select id="ac-imagen-principal" className={f.select} value={imagenPrincipal} onChange={e => setImagenPrincipal(e.target.value)}>
                <option value="">Sin imagen principal</option>
                {imagenes.map((url, index) => (
                  <option key={index} value={url}>Imagen {index + 1}</option>
                ))}
              </select>
            </div>

            <div className={f.field}>
              <label className={f.label}>Galería de Imágenes</label>
              <div
                className={s.uploadContainer}
                onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={e => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    handleAddLocalImages(e.dataTransfer.files);
                  }
                }}
              >
                <label className={s.uploadPlaceholder} htmlFor="ac-file-input">
                  <Upload size={22} />
                  <span>Arrastra imágenes aquí o haz clic para seleccionar</span>
                  <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>JPG, PNG, WEBP (máx 4)</span>
                  <input
                    id="ac-file-input"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className={s.hiddenFileInput}
                    onChange={e => {
                      handleAddLocalImages(e.target.files);
                      if (e.target.value) e.target.value = '';
                    }}
                  />
                </label>

                {imagenes.length > 0 && (
                  <div className={s.previewGrid}>
                    {imagenes.map((url, index) => (
                      <div key={index} className={s.previewBox}>
                        <img src={url} alt={`Imagen ${index + 1}`} />
                        <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleSetPrincipal(url)}
                            className={s.removeImgBtn}
                            style={{ background: imagenPrincipal === url ? 'var(--color-accent)' : 'rgba(0,0,0,0.5)' }}
                            aria-label={imagenPrincipal === url ? 'Quitar imagen principal' : 'Establecer como principal'}
                            title={imagenPrincipal === url ? 'Quitar imagen principal' : 'Establecer como principal'}
                          >
                            ★
                          </button>
                          <button type="button" onClick={() => handleRemoveImage(index)} className={s.removeImgBtn} aria-label={`Eliminar imagen ${index + 1}`}>
                            <span style={{ fontSize: '14px' }}>×</span>
                          </button>
                        </div>
                        {imagenPrincipal === url && (
                          <div style={{ position: 'absolute', bottom: '4px', left: '4px', background: 'var(--color-accent)', color: 'white', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '999px', fontWeight: 600 }}>
                            Principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Publicación</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-estado">Estado</label>
                <select id="ac-estado" className={f.select} value={estado} onChange={e => setEstado(e.target.value as 'Activo' | 'Inactivo')}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo (Oculto)</option>
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label}>Etiquetas</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {ETIQUETAS_PRODUCTO.map(({ key, label }) => {
                    const state = key === 'destacado' ? destacado : key === 'oferta' ? oferta : key === 'nuevo' ? nuevo : masVendido;
                    const set = key === 'destacado' ? setDestacado : key === 'oferta' ? setOferta : key === 'nuevo' ? setNuevo : setMasVendido;
                    return (
                    <label key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--color-text-secondary)', padding: '6px 12px', background: state ? 'rgba(244,162,97,0.15)' : 'rgba(255,255,255,0.04)', borderRadius: '8px', border: `1px solid ${state ? 'rgba(244,162,97,0.3)' : 'rgba(255,255,255,0.1)'}` }}>
                      <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} />
                      {label}
                    </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <ModalFooter
            secondary={{ label: 'Cancelar', onClick: resetForm, disabled: saving, loading: saving }}
            primary={{ label: editingRef ? 'Guardar Cambios' : 'Crear Producto (Borrador)', type: 'submit', loading: saving }}
          />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            await deleteProducto(deleteConfirm.ref);
            toast.success(`"${deleteConfirm.nombre}" eliminado del catálogo`);
          }
          setDeleteConfirm(null);
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
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};
