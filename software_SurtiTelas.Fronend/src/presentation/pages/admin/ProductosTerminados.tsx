import React, { useState, useMemo, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ToggleLeft, Barcode, Package, CreditCard, Calendar, User, Loader2, AlertCircle, Upload } from 'lucide-react';
import s from './ProductosTerminados.module.css';
import f from '@/styles/Form.module.css';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { AddTagInput } from '@/presentation/components/AddTagInput';
import { catalogApi } from '@/infrastructure/api/catalogApi';
import { categoryService } from '@/services/categoryService';
import type { Producto } from '@/core/types';
import { ETIQUETAS_PRODUCTO } from '@/shared/constants/options';

export const AdminProductosTerminados: React.FC = () => {
  const [search, setSearch] = useState('');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Producto | null>(null);
  const [categorias, setCategorias] = useState<Array<{ id: string; nombre: string; slug: string }>>([]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await catalogApi.list({ page: 1, limit: 100 });
        if (!active) return;
        setProductos(result.data);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'No se pudieron cargar los productos terminados');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [descripcionCorta, setDescripcionCorta] = useState('');
  const [categoria, setCategoria] = useState('');
  const [subcategoria, setSubcategoria] = useState('');
  const [marca, setMarca] = useState('');
  const [cantidadStock, setCantidadStock] = useState('');
  const [precio, setPrecio] = useState('');
  const [precioAnterior, setPrecioAnterior] = useState('');
  const [descuento, setDescuento] = useState('');
  const [tela, setTela] = useState('');
  const [colores, setColores] = useState<string[]>([]);
  const [tallas, setTallas] = useState<string[]>([]);
  const [imagenes, setImagenes] = useState<string[]>([]);
  const [imagenPrincipal, setImagenPrincipal] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [localFiles, setLocalFiles] = useState<Record<string, File>>({});
  const [destacado, setDestacado] = useState(false);
  const [oferta, setOferta] = useState(false);
  const [nuevo, setNuevo] = useState(false);
  const [masVendido, setMasVendido] = useState(false);
  const [estado, setEstado] = useState<'Activo' | 'Inactivo'>('Activo');
  const [editingRef, setEditingRef] = useState<string | null>(null);

  const filteredProductos = useMemo(() => {
    return productos.filter(p =>
      (p.nombre ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.codigo ?? '').toLowerCase().includes(search.toLowerCase()) ||
      (p.categoria ?? '').toLowerCase().includes(search.toLowerCase())
    );
  }, [productos, search]);

  const resetForm = () => {
    setNombre('');
    setDescripcion('');
    setDescripcionCorta('');
    setCategoria('');
    setSubcategoria('');
    setMarca('');
    setCantidadStock('');
    setPrecio('');
    setPrecioAnterior('');
    setDescuento('');
    setTela('');
    setColores([]);
    setTallas([]);
    setImagenes([]);
    setImagenPrincipal('');
    setDestacado(false);
    setOferta(false);
    setNuevo(false);
    setMasVendido(false);
    setEstado('Activo');
    setFormError(null);
  };

  const openModal = async (item?: Producto) => {
    try {
      const data = await categoryService.list();
      setCategorias(data);
    } catch {
      setCategorias([]);
    }

    if (item) {
      setNombre(item.nombre ?? '');
      setDescripcion(item.descripcion ?? '');
      setDescripcionCorta(item.descripcionCorta ?? '');
      setCategoria(item.categoria ?? '');
      setSubcategoria(item.subcategoria ?? '');
      setMarca(item.marca ?? '');
      setCantidadStock(String(item.cantidadStock));
      setPrecio(String(item.precio));
      setPrecioAnterior(String(item.precioAnterior));
      setDescuento(String(item.descuento));
      setTela(item.tela ?? '');
      setColores(item.colores && item.colores.length > 0 ? item.colores : []);
      setTallas(item.tallas && item.tallas.length > 0 ? item.tallas : []);
      setImagenes(item.imagenes);
      setImagenPrincipal(item.imagenPrincipal || (item.imagenes && item.imagenes[0]) || '');
      setDestacado(item.destacado ?? false);
      setOferta(item.oferta ?? false);
      setNuevo(item.nuevo ?? false);
      setMasVendido(item.masVendido ?? false);
      setEstado(item.estado ?? 'Activo');
      setEditingRef(item.ref);
    } else {
      resetForm();
      setEditingRef(null);
    }
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSaving(false);
    setFormError(null);
    setEditingRef(null);
    setLocalFiles({});
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSaving(true);
    try {
      const totalQty = Number(cantidadStock) || 0;
      const pre = precioAnterior ? Number(precioAnterior) : Number(precio);
      const desc = descuento ? Number(descuento) : 0;
      const data: Partial<Producto> = {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || descripcionCorta.trim(),
        descripcionCorta: descripcionCorta.trim() || descripcion.trim() || nombre.trim(),
        categoria: categoria.trim(),
        subcategoria: subcategoria.trim(),
        marca: marca.trim(),
        precio: Number(precio),
        precioAnterior: pre,
        descuento: desc,
        cantidadStock: totalQty,
        stock: totalQty <= 0 ? 'Agotado' : totalQty < 10 ? 'Bajo stock' : 'OK',
        estado,
        publicado: false,
        imagenes: imagenes.filter(Boolean),
        imagenPrincipal: imagenPrincipal || (imagenes.length > 0 ? imagenes[0] : ''),
        destacado,
        oferta,
        nuevo,
        masVendido,
        tela: tela.trim() || 'General',
        colores,
        tallas,
      };

      if (editingRef) {
        const updated = await catalogApi.update(editingRef, data);
        setProductos(prev => prev.map(p => p.ref === editingRef ? { ...p, ...updated } : p));
        toast.success(`${updated.nombre} actualizado correctamente`);
      } else {
        const creado = await catalogApi.create(data);
        setProductos(prev => [creado, ...prev]);
        toast.success(`${creado.nombre} creado correctamente`);
      }
      closeModal();
    } catch (err: unknown) {
      console.error('[ProductosTerminados] submit error', err);
      toast.error((err instanceof Error ? err.message : 'No se pudo guardar el producto'));
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<Producto>[] = [
    {
      key: 'codigo',
      header: 'Código',
      width: '120px',
      sortable: true,
      render: (item) => (
        <div className={s.codigoCell}>
          <Barcode size={14} />
          {item.codigo}
        </div>
      ),
    },
    { key: 'nombre', header: 'Nombre', sortable: true },
    { key: 'categoria', header: 'Categoría', width: '140px', sortable: true },
    { key: 'stock', header: 'Stock', width: '100px', sortable: true, align: 'right' },
    { key: 'precio', header: 'Precio', width: '120px', sortable: true, align: 'right' },
    { key: 'estado', header: 'Estado', width: '120px', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<Producto> = {
    title: item => `Detalle: ${item.nombre}`,
    size: 'xl',
    header: item => ({
      icon: <Package size={18} />,
      title: 'Producto terminado',
      code: item.codigo,
      subtitle: `${item.nombre} Â· ${item.categoria}`,
      status: item.estado,
      badgeVariant: item.estado === 'Activo' ? 'success' : 'default',
    }),
    kpis: item => [
      { label: 'Stock', value: `${item.cantidadStock} uds`, icon: <Package size={16} />, tone: item.cantidadStock > 0 ? 'success' : 'danger' },
      { label: 'Precio', value: `$${item.precio.toLocaleString()}`, icon: <CreditCard size={16} />, tone: 'info' },
      { label: 'Talla', value: item.tallas?.[0] || 'Ášnica', icon: <User size={16} />, tone: 'primary' },
      { label: 'Estado', value: item.estado || 'Activo', icon: <Calendar size={16} />, tone: 'default' },
    ],
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Tallas:</span> {item.tallas?.join(', ') || 'Ášnica'}</div>
        <div className={s.detailRow}><span>Colores:</span> {item.colores?.join(', ') || 'Sin especificar'}</div>
        <div className={s.detailRow}><span>Precio:</span> ${item.precio.toLocaleString()}</div>
        <div className={s.detailRow}><span>Stock:</span> {item.cantidadStock} uds</div>
      </div>
    ),
  };

  const actions: DataTableAction<Producto>[] = [
    { label: 'Editar', icon: <Edit size={14} aria-hidden="true" focusable="false" />, onClick: (item) => openModal(item) },
    { label: 'Desactivar', icon: <ToggleLeft size={14} aria-hidden="true" focusable="false" />, onClick: async (item) => {
      try {
        const nuevoEstado = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
        await catalogApi.update(item.ref, { estado: nuevoEstado });
        setProductos(prev => prev.map(p => p.ref === item.ref ? { ...p, estado: nuevoEstado } : p));
        toast.success(`Producto "${item.nombre}" ${nuevoEstado === 'Inactivo' ? 'desactivado' : 'activado'}`);
      } catch {
        toast.error('No se pudo cambiar el estado del producto');
      }
    } },
    { label: 'Eliminar', icon: <Trash2 size={14} aria-hidden="true" focusable="false" />, danger: true, onClick: (item) => setDeleteConfirm(item) },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de Productos Terminados</h1>
          <p className={s.pageSubtitle}>Control de productos finalizados</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => openModal()}>
          Nuevo Producto
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar productos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={100}
          minChars={0} />
      </div>

      <div className={s.tableWrapper}>
        {loading && (
          <div className={s.stateBox}>
            <Loader2 size={28} className={s.spin} />
            <p>Cargando productos terminados...</p>
          </div>
        )}
        {error && (
          <div className={s.errorBox}>
            <AlertCircle size={28} />
            <p>{error}</p>
          </div>
        )}
        {!loading && !error && (
        <DataTable
          data={filteredProductos}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}

          enableSorting={true}
          toolbarLeft={null}
          maxVisibleColumns={5}
          emptyMessage="Sin resultados" enableExport={false} enableRowSelection={false} />
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingRef ? 'Editar Producto' : 'Registrar Nuevo Producto'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className={f.form}>
          {formError && !saving && (
            <div className={f.formError}>
              {formError}
            </div>
          )}

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Información básica</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Nombre del Producto *</label>
                <input className={f.input} type="text" required value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Ej: Camiseta Oversize Premium" />
              </div>
              <div className={f.field}>
                <label className={f.label} htmlFor="pt-categoria">Categoría *</label>
                <select id="pt-categoria" className={f.select} value={categoria} onChange={e => setCategoria(e.target.value)}>
                  <option value="">Seleccionar categoría</option>
                  {categorias.map((cat) => (
                    <option key={cat.id} value={cat.nombre}>{cat.nombre}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Descripción Corta</label>
                <input className={f.input} type="text" value={descripcionCorta} onChange={e => setDescripcionCorta(e.target.value)} placeholder="Resumen breve del producto" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Descripción Completa</label>
                <textarea className={f.textarea} value={descripcion} onChange={e => setDescripcion(e.target.value)} placeholder="Añade detalles sobre el producto..." rows={3} />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Precio y stock</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Precio ($) *</label>
                <input className={f.input} type="number" required min="1" value={precio} onChange={e => setPrecio(e.target.value)} placeholder="Precio base" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Precio Anterior (opcional)</label>
                <input className={f.input} type="number" min="0" value={precioAnterior} onChange={e => setPrecioAnterior(e.target.value)} placeholder="Sin descuento" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Descuento (%)</label>
                <input className={f.input} type="number" min="0" max="100" value={descuento} onChange={e => setDescuento(e.target.value)} placeholder="0" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Cantidad Stock</label>
                <input className={f.input} type="number" required min="0" value={cantidadStock} onChange={e => setCantidadStock(e.target.value)} placeholder="Unidades en bodega" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Características</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Tipo de Tela</label>
                <input className={f.input} type="text" value={tela} onChange={e => setTela(e.target.value)} placeholder="Ej: Algodón, Poliéster" />
              </div>
              <div className={f.field}>
                <label className={f.label}>Marca</label>
                <input className={f.input} type="text" value={marca} onChange={e => setMarca(e.target.value)} placeholder="Marca" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Colores Disponibles</label>
                <AddTagInput tags={colores} onTagsChange={setColores} placeholder="Ej: Azul, Rojo claro, Verde oscuro" colorMode={true} />
              </div>
              <div className={f.field}>
                <label className={f.label}>Tallas Disponibles</label>
                <AddTagInput tags={tallas} onTagsChange={setTallas} placeholder="Ej: S, M, L, XL" />
              </div>
            </div>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Subcategoría</label>
                <input className={f.input} type="text" value={subcategoria} onChange={e => setSubcategoria(e.target.value)} placeholder="Ej: Básicas, Premium" />
              </div>
            </div>
          </div>

          <div className={f.formSection}>
            <h3 className={f.sectionTitle}>Imágenes</h3>
            <div className={f.formRow}>
              <div className={f.field}>
                <label className={f.label}>Imagen Principal</label>
                <select
                  className={f.select}
                  value={imagenPrincipal}
                  onChange={e => setImagenPrincipal(e.target.value)}
                >
                  <option value="">Sin imagen principal</option>
                  {imagenes.map((url, index) => (
                    <option key={index} value={url}>Imagen {index + 1}</option>
                  ))}
                </select>
              </div>
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
                <label className={s.uploadPlaceholder}>
                  <Upload size={22} />
                  <span>Arrastra imágenes aquí o haz clic para seleccionar</span>
                  <span style={{ fontSize: '0.78rem', opacity: 0.7 }}>JPG, PNG, WEBP (máx 4)</span>
                  <input
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
                      <div key={index} className={s.previewBox} style={{ width: '100%' }}>
                        <img src={url} alt={`Imagen ${index + 1}`} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: '8px' }} />
                        <div style={{ position: 'absolute', top: '4px', right: '4px', display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={() => handleSetPrincipal(url)}
                            style={{
                              width: '22px',
                              height: '22px',
                              borderRadius: '50%',
                              background: imagenPrincipal === url ? 'var(--color-accent)' : 'rgba(0,0,0,0.5)',
                              color: 'white',
                              border: 'none',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: 700,
                            }}
                            title="Establecer como principal"
                          >
                            â˜…
                          </button>
                          <button type="button" onClick={() => handleRemoveImage(index)} className={s.removeImgBtn}>
                            <span style={{ fontSize: '14px' }}>Á—</span>
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
                <label className={f.label}>Estado</label>
                <select className={f.select} value={estado} onChange={e => setEstado(e.target.value as 'Activo' | 'Inactivo')}>
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
            secondary={{ label: 'Cancelar', onClick: closeModal, disabled: saving, loading: saving }}
            primary={{ label: editingRef ? 'Guardar Cambios' : 'Crear Producto (Borrador)', type: 'submit', loading: saving }}
          />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            await catalogApi.remove(deleteConfirm.ref);
            setProductos(prev => prev.filter(p => p.ref !== deleteConfirm.ref));
            toast.success(`Producto "${deleteConfirm.nombre}" eliminado`);
          } catch {
            toast.error('No se pudo eliminar el producto');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar producto"
        description={`Â¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger" />
    </div>
  );
};

