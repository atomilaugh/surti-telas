import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Plus, Edit, Trash2, Eye, EyeOff, Upload, Check, Info, Tag, Palette, Image as ImageIcon, Star, X, Globe } from 'lucide-react';
import { toast } from 'sonner';

import s from './AdminCatalogo.module.css';
import f from '@/styles/Form.module.css';
import { DataTable, DataTableColumn, DataTableAction } from '@/shared/ui/DataTable';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { AddTagInput } from '@/presentation/components/AddTagInput';
import { ColorStockEditor } from '@/presentation/components/ColorStockEditor';
import { ProductDetailModal } from '@/presentation/components/ProductDetailModal';
import { useProductos, useAppStore } from '@/core/stores';
import { useAuth } from '@/core/stores/authStore';
import { productService } from '@/services/productService';
import { categoryService } from '@/services/categoryService';
import type { Producto, PublicationStatus } from '@/core/types';
import {
  colorRowsFromProducto,
  colorsFromRows,
  createColorRow,
  rowsToVariantes,
  sizesFromRows,
  totalStockFromRows,
  validateColorRows,
  variantLabel,
} from '@/shared/utils/colorStock';
import type { ColorStockRow } from '@/shared/utils/colorStock';
import { ETIQUETAS_PRODUCTO } from '@/shared/constants/options';

const FORM_ID = 'admin-producto-form';

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
  const [colorRows, setColorRows] = useState<ColorStockRow[]>([createColorRow()]);
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');
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

  const stockTotal = useMemo(() => totalStockFromRows(colorRows), [colorRows]);
  const coloresActivos = useMemo(() => colorsFromRows(colorRows).length, [colorRows]);
  const descuentoNum = Number.parseInt(descuento, 10) || 0;
  const precioFinal = useMemo(() => {
    const base = Number.parseInt(precio, 10) || 0;
    return Math.max(0, Math.round(base * (1 - Math.min(Math.max(descuentoNum, 0), 100) / 100)));
  }, [precio, descuentoNum]);
  const colorSuggestions = useMemo(
    () => [...new Set(productos.flatMap((p) => p.colores ?? []).map((c) => c.trim()).filter(Boolean))].slice(0, 30),
    [productos]
  );

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
    setColorRows([createColorRow()]);
    setEstado('Activo');
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
      const id = `${Date.now()}-${(() => { const b = new Uint8Array(2); crypto.getRandomValues(b); return Array.from(b).map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 4); })()}`;
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
    setColorRows(colorRowsFromProducto(product));
    setEstado(product.estado || 'Activo');
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
    const colorError = validateColorRows(colorRows);
    if (colorError) { setFormError(colorError); return false; }
    if (!tallas || tallas.length === 0) { setFormError('Debes añadir al menos 1 talla.'); return false; }
    return true;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const variantes = rowsToVariantes(colorRows);
      const totalQty = totalStockFromRows(colorRows);
      const colores = colorsFromRows(colorRows);
      const tallasVariantes = sizesFromRows(colorRows);
      const tallasFinales = [...tallas];
      for (const talla of tallasVariantes) {
        if (!tallasFinales.some((t) => t.trim().toLowerCase() === talla.toLowerCase())) tallasFinales.push(talla);
      }
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
        stockPorColor: variantes,
        tallas: tallasFinales,
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
      render: (item: Producto) => {
        const variantes = item.stockPorColor ?? [];
        return (
          <div>
            <div style={{ fontSize: '0.84rem', fontWeight: 600 }}>{item.cantidadStock}</div>
            {variantes.length > 0 && (
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {variantes
                  .slice(0, 3)
                  .map((v) => `${variantLabel(v.color, v.size)}: ${v.cantidad}`)
                  .join(' · ')}
                {variantes.length > 3 ? ` · +${variantes.length - 3}` : ''}
              </div>
            )}
          </div>
        );
      },
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
      label: 'Ver detalle',
      icon: <Eye size={14} aria-hidden="true" focusable="false" />,
      onClick: (item: Producto) => handleOpenDetail(item),
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
          <h1 className={s.pageTitle}>Gestión de Productos</h1>
          <p className={s.pageSubtitle}>Gestiona productos para el Gestión de Productos del frontend</p>
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

      <Modal
        open={isCreateOpen || isEditOpen}
        onClose={resetForm}
        variant="form"
        size="md"
        className={s.modalCompact}
        title={editingRef ? 'Editar producto' : 'Registrar nuevo producto'}
        description="Define los datos del catálogo, el inventario por color y talla, y las imágenes del producto."
        meta={`${colorRows.length} ${colorRows.length === 1 ? 'variante' : 'variantes'} · ${stockTotal} unidades`}
        bodyClassName={s.modalBody}
        footer={
          <div className={s.footerBar}>
            <div className={s.footerSummary}>
              <span className={s.footerChip}>
                Variantes <span className={s.footerChipValue}>{colorRows.length}</span>
              </span>
              <span className={s.footerChip}>
                Colores <span className={s.footerChipValue}>{coloresActivos}</span>
              </span>
              <span className={s.footerChip}>
                Stock general <span className={s.footerChipValue}>{stockTotal}</span>
              </span>
              {descuentoNum > 0 && (
                <span className={s.footerChip}>
                  Precio con descuento <span className={s.footerChipValue}>{precioFinal.toLocaleString('es-CO')}</span>
                </span>
              )}
            </div>
            <div className={s.footerActions}>
              <Button variant="secondary" onClick={resetForm} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" form={FORM_ID} loading={saving} leftIcon={<Check size={15} />}>
                {editingRef ? 'Guardar cambios' : 'Crear producto'}
              </Button>
            </div>
          </div>
        }
      >
        <form id={FORM_ID} onSubmit={handleSaveProduct} className={s.modalBody}>
          {formError && !saving && (
            <div className={f.formError} role="alert">
              {formError}
            </div>
          )}

          <section className={s.section}>
            <header className={s.sectionHeader}>
              <span className={s.sectionIcon} aria-hidden="true"><Info size={15} /></span>
              <div className={s.sectionHeading}>
                <h3 className={s.sectionTitle}>Información del producto</h3>
                <span className={s.sectionHint}>Identificación y clasificación en el catálogo.</span>
              </div>
            </header>

            <div className={s.grid2}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-codigo">Código</label>
                <input id="ac-codigo" className={f.input} type="text" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ej: CAM-001" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-nombre">Nombre del producto *</label>
                <input id="ac-nombre" className={f.input} type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Camiseta Oversize Premium" />
              </div>
            </div>

            <div className={s.grid2}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-categoria">Categoría *</label>
                <select id="ac-categoria" className={f.select} value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">Seleccionar categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-subcategoria">Subcategoría</label>
                <input id="ac-subcategoria" className={f.input} type="text" value={subcategoria} onChange={e => setSubcategoria(e.target.value)} placeholder="Ej: Básicas, Premium" />
              </div>
            </div>

            <div className={s.grid2}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-tela">Tipo de tela</label>
                <input id="ac-tela" className={f.input} type="text" value={tela} onChange={e => setTela(e.target.value)} placeholder="Ej: Algodón, Poliéster" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-marca">Marca</label>
                <input id="ac-marca" className={f.input} type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Marca" />
              </div>
            </div>

            <div className={f.field}>
              <label className={f.label} htmlFor="ac-descripcion-corta">Descripción corta</label>
              <input id="ac-descripcion-corta" className={f.input} type="text" value={descripcionCorta} onChange={e => setDescripcionCorta(e.target.value)} placeholder="Resumen breve para el catálogo" />
            </div>

            <div className={f.field}>
              <label className={f.label} htmlFor="ac-descripcion">Descripción completa</label>
              <textarea id="ac-descripcion" className={f.textarea} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Añade detalles sobre el producto..." rows={3} />
            </div>
          </section>

          <section className={s.section}>
            <header className={s.sectionHeader}>
              <span className={s.sectionIcon} aria-hidden="true"><Tag size={15} /></span>
              <div className={s.sectionHeading}>
                <h3 className={s.sectionTitle}>Precio</h3>
                <span className={s.sectionHint}>Valor de venta y promociones aplicadas en el catálogo.</span>
              </div>
            </header>

            <div className={s.grid3}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-precio">Precio ($) *</label>
                <input id="ac-precio" className={f.input} type="number" required min="1" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio base" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-precio-anterior">Precio anterior</label>
                <input id="ac-precio-anterior" className={f.input} type="number" min="0" value={precioAnterior} onChange={e => setPrecioAnterior(e.target.value)} placeholder="Sin descuento" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-descuento">Descuento (%)</label>
                <input id="ac-descuento" className={f.input} type="number" min="0" max="100" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0" />
              </div>
            </div>

            <div className={s.priceCard}>
              <span className={s.priceCardLabel}>
                Precio final para el cliente
                {descuentoNum > 0 ? ` (${descuentoNum}% de descuento)` : ''}
              </span>
              <span className={s.priceCardValue}>${precioFinal.toLocaleString('es-CO')}</span>
            </div>
          </section>

          <section className={s.section}>
            <header className={s.sectionHeader}>
              <span className={s.sectionIcon} aria-hidden="true"><Palette size={15} /></span>
              <div className={s.sectionHeading}>
                <h3 className={s.sectionTitle}>Inventario por color y talla</h3>
                <span className={s.sectionHint}>
                  Define una fila por combinación (Azul/S, Azul/M, Rojo/L…); el stock general es la suma de todas.
                </span>
              </div>
            </header>

            <div className={s.grid2}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-tallas">Tallas disponibles</label>
                <AddTagInput tags={tallas} onTagsChange={setTallas} placeholder="Ej: S, M, L, XL" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-stock-total">Stock general (calculado)</label>
                <input
                  id="ac-stock-total"
                  className={f.input}
                  type="number"
                  readOnly
                  value={stockTotal}
                  style={{ opacity: 0.75, cursor: 'not-allowed' }}
                />
                <span className={s.sectionHint}>Suma de las variantes de color y talla.</span>
              </div>
            </div>

            <ColorStockEditor
              rows={colorRows}
              onChange={setColorRows}
              sugerencias={colorSuggestions}
              tallasSugeridas={tallas}
              disabled={saving}
            />
          </section>

          <section className={s.section}>
            <header className={s.sectionHeader}>
              <span className={s.sectionIcon} aria-hidden="true"><ImageIcon size={15} /></span>
              <div className={s.sectionHeading}>
                <h3 className={s.sectionTitle}>Imágenes</h3>
                <span className={s.sectionHint}>Hasta 4 imágenes. La principal es la que se ve en el catálogo.</span>
              </div>
            </header>

            <div className={f.field}>
              <label className={f.label} htmlFor="ac-imagen-principal">Imagen principal</label>
              <select id="ac-imagen-principal" className={f.select} value={imagenPrincipal} onChange={e => setImagenPrincipal(e.target.value)}>
                <option value="">Sin imagen principal</option>
                {imagenes.map((url, index) => (
                  <option key={index} value={url}>Imagen {index + 1}</option>
                ))}
              </select>
            </div>

            <div className={f.field}>
              <label className={f.label} htmlFor="ac-file-input">Galería de imágenes</label>
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
                            <Star size={12} aria-hidden="true" focusable="false" />
                          </button>
                          <button type="button" onClick={() => handleRemoveImage(index)} className={s.removeImgBtn} aria-label={`Eliminar imagen ${index + 1}`}>
                            <X size={12} aria-hidden="true" focusable="false" />
                          </button>
                        </div>
                        {imagenPrincipal === url && (
                          <div className={s.previewBadge}>Principal</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={s.section}>
            <header className={s.sectionHeader}>
              <span className={s.sectionIcon} aria-hidden="true"><Globe size={15} /></span>
              <div className={s.sectionHeading}>
                <h3 className={s.sectionTitle}>Publicación</h3>
                <span className={s.sectionHint}>Visibilidad en el catálogo y etiquetas destacadas.</span>
              </div>
            </header>

            <div className={s.grid2}>
              <div className={f.field}>
                <label className={f.label} htmlFor="ac-estado">Estado</label>
                <select id="ac-estado" className={f.select} value={estado} onChange={e => setEstado(e.target.value as 'Activo' | 'Inactivo')}>
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo (Oculto)</option>
                </select>
              </div>
              <div className={f.field}>
                <span className={f.label}>Etiquetas</span>
                <div className={s.tagList}>
                  {ETIQUETAS_PRODUCTO.map(({ key, label }) => {
                    const state = key === 'destacado' ? destacado : key === 'oferta' ? oferta : key === 'nuevo' ? nuevo : masVendido;
                    const set = key === 'destacado' ? setDestacado : key === 'oferta' ? setOferta : key === 'nuevo' ? setNuevo : setMasVendido;
                    return (
                      <label key={key} className={`${s.tagToggle} ${state ? s.tagToggleActive : ''}`}>
                        <input type="checkbox" checked={state} onChange={e => set(e.target.checked)} />
                        {label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>
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
