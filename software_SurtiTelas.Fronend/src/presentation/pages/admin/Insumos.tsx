import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ToggleLeft, AlertTriangle, Barcode, Package, CreditCard } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import s from './Insumos.module.css';
import f from '@/styles/Form.module.css';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableAction, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { stockApi, type RawMaterial } from '@/infrastructure/api/stockApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { UNIDADES_MEDIDA_INSUMO } from '@/shared/constants/options';
import { rawMaterialCategoriesApi, type RawMaterialCategoryDTO } from '@/infrastructure/api/rawMaterialCategoriesApi';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface Insumo {
  id: string;
  codigo: string;
  nombre: string;
  categoria: string;
  medida: string;
  stock: number;
  stockMin: number;
  precio: number;
  proveedor: string;
  estado: 'Activo' | 'Inactivo';
}

function toInsumo(m: RawMaterial): Insumo {
  return {
    id: m.id,
    codigo: m.id,
    nombre: m.nombre,
    categoria: m.categoria ?? '',
    medida: m.unidadMedida,
    stock: m.stockActual,
    stockMin: m.stockMinimo,
    precio: m.precioUnitario,
    proveedor: m.proveedorId ?? '',
    estado: m.stockActual > 0 ? 'Activo' : 'Inactivo',
  };
}

export const AdminInsumos: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInsumo, setSelectedInsumo] = useState<Insumo | null>(null);
  const [items, setItems] = useState<Insumo[]>([]);
  const [proveedores, setProveedores] = useState<Array<{ id: string; nombre: string }>>([]);
  const [categoriasInsumo, setCategoriasInsumo] = useState<RawMaterialCategoryDTO[]>([]);
  const [categoriasLoading, setCategoriasLoading] = useState(true);
  const [categoriasError, setCategoriasError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Insumo | null>(null);

  const [formNombre, setFormNombre] = useState('');
  const [formCategoria, setFormCategoria] = useState('');
  const [formMedida, setFormMedida] = useState('');
  const [formStockMin, setFormStockMin] = useState(0);
  const [formPrecio, setFormPrecio] = useState(0);
  const [formProveedorId, setFormProveedorId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setFormNombre('');
    setFormCategoria('');
    setFormMedida('');
    setFormStockMin(0);
    setFormPrecio(0);
    setFormProveedorId('');
    setErrors({});
  };

  const openCreateModal = () => {
    setSelectedInsumo(null);
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (insumo: Insumo) => {
    setSelectedInsumo(insumo);
    setFormNombre(insumo.nombre);
    setFormCategoria(insumo.categoria);
    setFormMedida(insumo.medida);
    setFormStockMin(insumo.stockMin);
    setFormPrecio(insumo.precio);
    setErrors({});
    setModalOpen(true);
  };

  useEffect(() => {
    let active = true;
    const fetchProveedores = async () => {
      try {
        const result = await stockApi.suppliers.list();
        if (!active) return;
        setProveedores(result.data.map(p => ({ id: p.id, nombre: p.nombre })));
      } catch {
        if (active) setProveedores([]);
      }
    };
    void fetchProveedores();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchCategorias = async () => {
      try {
        const result = await rawMaterialCategoriesApi.list({ limit: 100 });
        if (!active) return;
        setCategoriasInsumo(result.items);
      } catch {
        if (active) {
          setCategoriasError('No se pudieron cargar las categorías');
          setCategoriasInsumo([]);
        }
      } finally {
        if (active) setCategoriasLoading(false);
      }
    };
    void fetchCategorias();
    return () => { active = false; };
  }, []);

  const filteredInsumos = useMemo(() => {
    return items.filter(i =>
      i.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      i.codigo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      i.categoria.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch, items]);

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedInsumo(null);
    resetForm();
  };

  const fetchInsumos = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stockApi.rawMaterials.list();
      setItems(data.map(toInsumo));
    } catch {
      setError('No se pudieron cargar los insumos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchInsumos();
  }, []);

  const handleSubmitInsumo = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!formNombre || formNombre.length < 2) newErrors.nombre = 'El nombre es obligatorio';
    if (!formMedida) newErrors.medida = 'La medida es obligatoria';
    if (formStockMin < 0) newErrors.stockMin = 'Debe ser mayor o igual a 0';
    if (formPrecio <= 0) newErrors.precio = 'Debe ser mayor a 0';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) {
      return;
    }

    try {
      if (selectedInsumo) {
        const actualizado = await stockApi.rawMaterials.update(selectedInsumo.id, {
          nombre: formNombre,
          categoria: formCategoria || undefined,
          unidadMedida: formMedida,
          stockActual: selectedInsumo.stock,
          stockMinimo: formStockMin,
          precioUnitario: formPrecio,
          proveedorId: formProveedorId || undefined,
        });
        setItems(prev => prev.map(it => it.id === selectedInsumo.id ? toInsumo(actualizado) : it));
        toast.success('Insumo actualizado');
      } else {
        const nuevo = await stockApi.rawMaterials.create({
          nombre: formNombre,
          categoria: formCategoria || undefined,
          unidadMedida: formMedida,
          stockActual: 0,
          stockMinimo: formStockMin,
          precioUnitario: formPrecio,
          proveedorId: formProveedorId || undefined,
        });
        setItems(prev => [toInsumo(nuevo), ...prev]);
        toast.success('Insumo creado');
      }
      handleCloseModal();
      void fetchInsumos();
    } catch {
      toast.error('No fue posible guardar el insumo');
    }
  };

  const handleToggleEstado = async (item: Insumo) => {
    const nuevoEstado: Insumo['estado'] = item.estado === 'Activo' ? 'Inactivo' : 'Activo';
    const stockActual = nuevoEstado === 'Activo' ? Math.max(item.stock, item.stockMin || 1) : 0;
    try {
      const actualizado = await stockApi.rawMaterials.update(item.id, { stockActual });
      setItems(prev => prev.map(it => it.id === item.id ? toInsumo(actualizado) : it));
      toast.success(`Insumo ${nuevoEstado === 'Activo' ? 'activado' : 'desactivado'}`);
    } catch {
      toast.error('No fue posible cambiar el estado del insumo');
    }
  };

  const handleEliminar = async (item: Insumo) => {
    setDeleteConfirm(item);
  };

  const columns: DataTableColumn<Insumo>[] = [
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
    {
      key: 'stock',
      header: 'Stock',
      width: '100px',
      sortable: true,
      align: 'right',
      render: (item) => (
        <div className={s.stockCell}>
          <span>{item.stock}</span>
          {item.stock < item.stockMin && (
            <AlertTriangle size={14} className={s.stockAlert} />
          )}
        </div>
      ),
    },
    { key: 'estado', header: 'Estado', width: '110px', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<Insumo> = {
    title: item => `Detalle: ${item.nombre}`,
    size: 'xl',
    header: item => ({
      icon: <Package size={18} />,
      title: 'Insumo',
      code: item.codigo,
      subtitle: `${item.nombre} · ${item.categoria}`,
      meta: item.medida,
      status: item.estado,
      badgeVariant: item.estado === 'Activo' ? 'success' : 'default',
    }),
    kpis: item => [
      { label: 'Stock', value: item.stock, icon: <Package size={16} />, tone: item.stock < item.stockMin ? 'warning' : 'success' },
      { label: 'Stock mínimo', value: item.stockMin, icon: <AlertTriangle size={16} />, tone: 'default' },
      { label: 'Precio', value: `$${item.precio.toLocaleString()}`, icon: <CreditCard size={16} />, tone: 'info' },
    ],
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Medida:</span> {item.medida}</div>
        <div className={s.detailRow}><span>Precio:</span> ${item.precio.toLocaleString()}</div>
        <div className={s.detailRow}><span>Proveedor:</span> {item.proveedor || '—'}</div>
        <div className={s.detailRow}><span>Stock mínimo:</span> {item.stockMin}</div>
      </div>
    ),
  };

  const actions = ((item: Insumo): DataTableAction<Insumo>[] => [
    { label: 'Editar', icon: <Edit size={14} aria-hidden="true" focusable="false" />, onClick: (i) => openEditModal(i) },
    { label: item.estado === 'Activo' ? 'Desactivar' : 'Activar', icon: <ToggleLeft size={14} aria-hidden="true" focusable="false" />, onClick: (i) => handleToggleEstado(i) },
    { label: 'Eliminar', icon: <Trash2 size={14} aria-hidden="true" focusable="false" />, danger: true, onClick: (i) => handleEliminar(i) },
  ]) as DataTableAction<Insumo>[] | ((item: Insumo) => DataTableAction<Insumo>[]);

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de Insumos</h1>
          <p className={s.pageSubtitle}>Inventario de insumos</p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus size={16} />
          Nuevo Insumo
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar insumos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0} />
      </div>

      <div className={s.tableWrapper}>
        <DataTable
          data={filteredInsumos}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}

          enableSorting={true}
          emptyMessage={loading ? 'Cargando insumos...' : error ? error : 'Sin resultados'}
          maxVisibleColumns={5} enableExport={false} enableRowSelection={false} />
      </div>

      {modalOpen && (
        <div className={s.modalOverlay}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                {selectedInsumo ? 'Editar Insumo' : 'Nuevo Insumo'}
              </h2>
              <button className={s.closeBtn} onClick={handleCloseModal}>×</button>
            </div>
            <div className={s.modalBody}>
              <form className={f.form} onSubmit={handleSubmitInsumo}>
                <div className={s.formSection}>
                  <h3 className={s.formSectionTitle}>Datos generales</h3>
                  <div className={s.formRow}>
                    <div className={s.field}>
                      <label className={s.label}>Nombre</label>
                      <input type="text" className={`${s.input} ${errors.nombre ? s.inputError : ''}`} value={formNombre} onChange={e => { setFormNombre(e.target.value); delete errors.nombre; setErrors({...errors}); }} />
                      {errors.nombre && <span className={s.errorText}>{errors.nombre}</span>}
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Categoría</label>
                      <select className={s.select} value={formCategoria} onChange={e => setFormCategoria(e.target.value)} disabled={categoriasLoading}>
                        {categoriasLoading ? (
                          <option value="">Cargando categorías...</option>
                        ) : categoriasError ? (
                          <option value="" disabled>No se pudieron cargar las categorías</option>
                        ) : categoriasInsumo.length === 0 ? (
                          <option value="" disabled>No hay categorías de insumos creadas</option>
                        ) : (
                          <option value="">Sin categoría</option>
                        )}
                        {!categoriasLoading && !categoriasError && categoriasInsumo.map(c => (
                          <option key={c.id} value={c.nombre}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className={s.formRow}>
                    <div className={s.field}>
                      <label className={s.label}>Medida</label>
                      <select className={`${s.select} ${errors.medida ? s.inputError : ''}`} value={formMedida} onChange={e => { setFormMedida(e.target.value); delete errors.medida; setErrors({...errors}); }}>
                        <option value="">Selecciona...</option>
                        {UNIDADES_MEDIDA_INSUMO.map((m, idx) => <option key={`${m}-${idx}`} value={m}>{m}</option>)}
                      </select>
                      {errors.medida && <span className={s.errorText}>{errors.medida}</span>}
                    </div>
                  </div>
                </div>

                <div className={s.formSection}>
                  <h3 className={s.formSectionTitle}>Inventario y costo</h3>
                  <div className={s.formRow}>
                    <div className={s.field}>
                      <label className={s.label}>Stock mínimo</label>
                      <input type="number" className={`${s.input} ${errors.stockMin ? s.inputError : ''}`} value={formStockMin} onChange={e => { setFormStockMin(Number(e.target.value)); delete errors.stockMin; setErrors({...errors}); }} min={0} />
                      {errors.stockMin && <span className={s.errorText}>{errors.stockMin}</span>}
                    </div>
                    <div className={s.field}>
                      <label className={s.label}>Precio</label>
                      <input type="number" className={`${s.input} ${errors.precio ? s.inputError : ''}`} value={formPrecio} onChange={e => { setFormPrecio(Number(e.target.value)); delete errors.precio; setErrors({...errors}); }} min={0} step="0.01" />
                      {errors.precio && <span className={s.errorText}>{errors.precio}</span>}
                    </div>
                  </div>
                </div>

                <div className={s.formSection}>
                  <h3 className={s.formSectionTitle}>Proveedor</h3>
                  <div className={s.formRow}>
                    <div className={s.field}>
                      <label className={s.label}>Proveedor</label>
                      <select className={s.select} value={formProveedorId} onChange={e => setFormProveedorId(e.target.value)}>
                        <option value="">Sin proveedor</option>
                        {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                <div className={s.formActions}>
                  <Button variant="secondary" onClick={handleCloseModal}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {selectedInsumo ? 'Guardar cambios' : 'Crear insumo'}
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
            await stockApi.rawMaterials.remove(deleteConfirm.id);
            setItems(prev => prev.filter(it => it.id !== deleteConfirm.id));
            toast.success('Insumo eliminado');
          } catch {
            toast.error('No fue posible guardar el insumo');
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title="Eliminar insumo"
        description={`¿Estás seguro de que deseas eliminar "${deleteConfirm?.nombre}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger" />
    </div>
  );
};
