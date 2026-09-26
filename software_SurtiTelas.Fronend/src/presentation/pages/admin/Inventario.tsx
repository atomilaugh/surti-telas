import React, { useEffect, useState, useMemo } from 'react';
import { Plus, X, Package, AlertTriangle } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import s from './Inventario.module.css';
import f from '@/styles/Form.module.css';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { inventoryApi, type InventoryMovement } from '@/infrastructure/api/inventoryApi';
import { useAuthStore } from '@/core/stores/authStore';
import { TIPOS_MOVIMIENTO, MOTIVOS_MOVIMIENTO } from '@/shared/constants/options';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface MovimientoFila {
  id: string;
  ref: string;
  nombre: string;
  cantidad: number;
  tipo: string;
  motivo: string;
  usuario: string;
  fecha: string;
}

function toFila(m: InventoryMovement): MovimientoFila {
  const tipoNormalizado = m.tipo.toUpperCase();
  const tipoDisplay = tipoNormalizado === 'ENTRADA' ? 'entrada' : tipoNormalizado === 'SALIDA' ? 'salida' : tipoNormalizado === 'AJUSTE' ? 'ajuste' : m.tipo.toLowerCase();
  return {
    id: m.id,
    ref: m.productId ?? m.rawMaterialId ?? m.id,
    nombre: m.productId ?? m.rawMaterialId ?? 'Sin referencia',
    cantidad: m.cantidad,
    tipo: tipoDisplay,
    motivo: m.motivo,
    usuario: m.usuarioId,
    fecha: m.fecha,
  };
}

export const AdminInventario: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState<MovimientoFila | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const user = useAuthStore((st) => st.user);
  const [movimientos, setMovimientos] = useState<MovimientoFila[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editCantidad, setEditCantidad] = useState(0);
  const [editMotivo, setEditMotivo] = useState('Ingreso de mercancía');
  const [editTipo, setEditTipo] = useState<'entrada' | 'salida' | 'ajuste'>('entrada');

  useEffect(() => {
    const fetchMovimientos = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await inventoryApi.list();
        setMovimientos(result.data.map(toFila));
      } catch {
        setError('No se pudieron cargar los movimientos de inventario');
      } finally {
        setLoading(false);
      }
    };
    void fetchMovimientos();
  }, []);

  const filtered = useMemo(() => {
    return movimientos.filter(p =>
      p.ref.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.nombre.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      p.motivo.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [movimientos, debouncedSearch]);

  const tableData = useMemo(() => filtered.map(p => ({ ...p, id: p.ref })), [filtered]);

  const closeModals = () => {
    setAjusteModalOpen(false);
    setSelectedProducto(null);
    setEditCantidad(0);
    setEditMotivo('Ingreso de mercancía');
    setEditTipo('entrada');
    setFormError(null);
    setSaving(false);
  };

  const openAjusteModal = () => {
    setSelectedProducto(null);
    setEditCantidad(0);
    setEditMotivo('Ingreso de mercancía');
    setEditTipo('entrada');
    setFormError(null);
    setAjusteModalOpen(true);
  };

  const handleGuardarAjuste = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await inventoryApi.create({
        tipo: editTipo,
        cantidad: Math.abs(editCantidad),
        motivo: editMotivo,
        productId: selectedProducto?.ref || undefined,
        usuarioId: user?.uid ?? '',
      });
      const result = await inventoryApi.list();
      setMovimientos(result.data.map(toFila));
      closeModals();
    } catch {
      setFormError('Error al registrar movimiento');
    } finally {
      setSaving(false);
    }
  };

  const columns: DataTableColumn<MovimientoFila>[] = [
    { key: 'ref', header: 'Referencia', sortable: true },
    { key: 'nombre', header: 'Producto/Insumo', sortable: true },
    { key: 'tipo', header: 'Tipo', sortable: true },
    { key: 'cantidad', header: 'Cantidad', sortable: true, align: 'right' },
    { key: 'motivo', header: 'Motivo', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<MovimientoFila> = {
    title: item => `Detalle: ${item.nombre}`,
    size: 'lg',
    header: item => ({
      icon: <Package size={18} />,
      title: 'Movimiento de inventario',
      code: item.ref,
      subtitle: item.motivo,
      meta: `Tipo: ${item.tipo}`,
      status: item.tipo === 'entrada' ? 'Activo' : item.tipo === 'salida' ? 'warning' : 'default',
      badgeVariant: item.tipo === 'entrada' ? 'success' : item.tipo === 'salida' ? 'warning' : 'default',
    }),
    kpis: item => [
      { label: 'Cantidad', value: item.cantidad, icon: <Package size={16} />, tone: item.tipo === 'entrada' ? 'success' : item.tipo === 'salida' ? 'warning' : 'default' },
      { label: 'Tipo', value: item.tipo, icon: <AlertTriangle size={16} />, tone: item.tipo === 'entrada' ? 'success' : item.tipo === 'salida' ? 'warning' : 'default' },
    ],
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Referencia:</span> {item.ref}</div>
        <div className={s.detailRow}><span>Cantidad:</span> {item.cantidad}</div>
        <div className={s.detailRow}><span>Tipo:</span> {item.tipo}</div>
        <div className={s.detailRow}><span>Motivo:</span> {item.motivo}</div>
        <div className={s.detailRow}><span>Usuario:</span> {item.usuario}</div>
        <div className={s.detailRow}><span>Fecha:</span> {item.fecha}</div>
      </div>
    ),
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Inventario</h1>
          <p className={s.pageSubtitle}>Movimientos de stock e insumos</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openAjusteModal}>
          Registrar movimiento
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar movimientos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <div className={s.tableWrapper}>
        <DataTable
          data={tableData}
          columns={columns}
          detailPanel={detailPanel}
          actions={[]}
          enableColumnFilters={false}

          enableSorting={true}
          emptyMessage={loading ? 'Cargando inventario...' : error ? error : 'No se encontraron movimientos'}
          toolbarLeft={null}
          maxVisibleColumns={5} enableExport={false} enableRowSelection={false}
        />
      </div>

      {ajusteModalOpen && (
        <div
          className={s.modalOverlay}
          onClick={e => { if (e.target === e.currentTarget) closeModals(); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (e.target === e.currentTarget) closeModals(); } }}
          tabIndex={0}
          role="button"
          aria-label="Cerrar modal"
        >
          <div className={s.modal}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>Registrar Movimiento</h2>
              <button className={s.closeBtn} onClick={closeModals}><X size={16} /></button>
            </div>
            <div className={s.modalBody}>
              <form className={f.form} onSubmit={handleGuardarAjuste}>
                {formError && (
                  <div className={f.formErrorBanner}>
                    {formError}
                  </div>
                )}
                <div className={f.formSection}>
                  <h3 className={f.sectionTitle}>Información del movimiento</h3>
                  <div className={f.field}>
                    <label className={f.label}>Producto/Insumo (Referencia)</label>
                    <select className={f.select} value={selectedProducto?.ref || ''} onChange={e => {
                      const mov = movimientos.find(p => p.ref === e.target.value);
                      setSelectedProducto(mov || null);
                    }} required>
                      <option value="">Seleccionar referencia...</option>
                      {movimientos.map(p => <option key={p.ref} value={p.ref}>{p.ref} - {p.nombre}</option>)}
                    </select>
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Tipo de movimiento</label>
                    <select className={f.select} value={editTipo} onChange={e => setEditTipo(e.target.value as 'entrada' | 'salida' | 'ajuste')}>
                      {TIPOS_MOVIMIENTO.map(t => (
                        <option key={t} value={t}>{t === 'entrada' ? 'Entrada (+)' : t === 'salida' ? 'Salida (-)' : 'Ajuste'}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={f.formSection}>
                  <h3 className={f.sectionTitle}>Detalles</h3>
                  <div className={f.field}>
                    <label className={f.label}>Cantidad</label>
                    <input type="number" className={f.input} value={editCantidad} onChange={e => setEditCantidad(Number(e.target.value))} min="0" required />
                  </div>
                  <div className={f.field}>
                    <label className={f.label}>Motivo</label>
                    <select className={f.select} value={editMotivo} onChange={e => setEditMotivo(e.target.value)}>
                      {MOTIVOS_MOVIMIENTO.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className={f.formActions}>
                  <Button type="button" variant="secondary" onClick={closeModals} disabled={saving}>Cancelar</Button>
                  <Button type="submit" loading={saving}>Registrar movimiento</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};