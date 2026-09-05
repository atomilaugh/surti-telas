import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Download, X, Eye } from 'lucide-react';
import s from './AdminCompras.module.css';
import f from '@/styles/Form.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn } from '@/shared/ui/DataTable';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { purchasesApi, type PurchaseDTO, type PurchaseItemDTO } from '@/infrastructure/api/purchasesApi';
import { suppliersApi } from '@/infrastructure/api/suppliersApi';
import { insumosApi, type InsumoDTO } from '@/infrastructure/api/insumosApi';
import { useServerPagination } from '@/hooks/useServerPagination';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';

interface FormItem {
  rawMaterialId?: string;
  nombre: string;
  unidadMedida?: string;
  cantidad: number;
  precioUnitario: number;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(Number.isFinite(value) ? value : 0);

export const AdminCompras: React.FC = () => {
  const [compras, setCompras] = useState<PurchaseDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<PurchaseDTO | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<PurchaseDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelMotivo, setCancelMotivo] = useState('');
  const [cancelling, setCancelling] = useState<PurchaseDTO | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailCompra, setDetailCompra] = useState<PurchaseDTO | null>(null);
  const [detailItems, setDetailItems] = useState<PurchaseItemDTO[]>([]);

  const [formNumero, setFormNumero] = useState('');
  const [formProveedorId, setFormProveedorId] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formItems, setFormItems] = useState<FormItem[]>([]);
  const [errors, setErrors] = useState<{ numero?: string; items?: string }>({});
  const [suppliers, setSuppliers] = useState<{ id: string; nombre: string }[]>([]);
  const [insumos, setInsumos] = useState<InsumoDTO[]>([]);
  const [insumoSearch, setInsumoSearch] = useState('');
  const [selectedInsumoId, setSelectedInsumoId] = useState('');

  const pagination = useServerPagination(10);

  const fetchCompras = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query: Record<string, string | number | boolean | undefined | null> = {
        page: pagination.page,
        limit: pagination.limit,
        sort: 'fecha',
        order: 'desc',
      };
      if (debouncedSearch.trim()) query.search = debouncedSearch.trim();
      const result = await purchasesApi.list(query);
      setCompras(result.items);
      pagination.setTotalRecords(result.meta.totalRecords);
    } catch {
      setError('No se pudieron cargar las compras');
      toast.error('No se pudieron cargar las compras');
    } finally {
      setLoading(false);
    }
  }, [pagination, debouncedSearch]);

  useEffect(() => {
    void fetchCompras();
  }, [fetchCompras]);

  useEffect(() => {
    const loadAux = async () => {
      try {
        const result = await suppliersApi.list({ limit: 100 });
        setSuppliers(result.data.map((sp) => ({ id: sp.id, nombre: sp.nombre })));
      } catch {
        /* ignore */
      }
      try {
        const result = await insumosApi.list({ limit: 100 });
        setInsumos(result.items);
      } catch {
        /* ignore */
      }
    };
    void loadAux();
  }, []);

  const resetForm = () => {
    setFormNumero('');
    setFormProveedorId('');
    setFormObservaciones('');
    setFormItems([]);
    setErrors({});
    setInsumoSearch('');
    setSelectedInsumoId('');
    setEditing(null);
    setSaving(false);
  };

  const openCreate = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = async (compra: PurchaseDTO) => {
    setEditing(compra);
    setFormNumero(compra.numero);
    setFormProveedorId(compra.proveedorId);
    setFormObservaciones(compra.observaciones ?? '');
    const compraItems = await purchasesApi.getItems(compra.id);
    setFormItems(
      compraItems.length
        ? compraItems.map((i) => ({
            rawMaterialId: i.rawMaterialId,
            nombre: i.nombre,
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
          }))
        : [],
    );
    setModalOpen(true);
  };

  const openDetail = async (compra: PurchaseDTO) => {
    setDetailCompra(compra);
    const compraItems = await purchasesApi.getItems(compra.id);
    setDetailItems(compraItems);
    setDetailModalOpen(true);
  };

  const isItemValid = (item: FormItem): boolean => {
    const nombreOk = item.rawMaterialId ? Boolean(item.nombre) : item.nombre.trim().length > 0;
    const cantidadOk = Number.isFinite(item.cantidad) && Number.isInteger(item.cantidad) && item.cantidad >= 1;
    const precioOk = Number.isFinite(item.precioUnitario) && item.precioUnitario > 0;
    return nombreOk && cantidadOk && precioOk;
  };

  const handleSave = async () => {
    const numeroTrim = formNumero.trim();
    const nextErrors: { numero?: string; items?: string } = {};
    if (!numeroTrim) nextErrors.numero = 'El número de la compra es obligatorio';
    else if (numeroTrim.length > 50) nextErrors.numero = 'El número no puede exceder 50 caracteres';
    if (!formProveedorId) {
      toast.error('El proveedor es obligatorio');
      return;
    }
    const validItems = formItems.filter(isItemValid);
    if (validItems.length === 0) {
      nextErrors.items = 'Agrega al menos una partida válida (cantidad entera ≥ 1 y precio unitario > 0)';
    }
    setErrors(nextErrors);
    if (nextErrors.numero) {
      toast.error(nextErrors.numero);
      return;
    }
    if (nextErrors.items) {
      toast.error(nextErrors.items);
      return;
    }
    setSaving(true);
    try {
      const total = validItems.reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0);
      if (editing) {
        const updated = await purchasesApi.update(editing.id, { observaciones: formObservaciones });
        setCompras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
        toast.success('Compra actualizada');
      } else {
        const created = await purchasesApi.create({
          numero: numeroTrim,
          proveedorId: formProveedorId,
          usuarioId: 'system',
          total,
          observaciones: formObservaciones,
          items: validItems.map((i) => ({
            rawMaterialId: i.rawMaterialId,
            nombre: i.nombre.trim(),
            cantidad: i.cantidad,
            precioUnitario: i.precioUnitario,
          })),
        });
        setCompras((prev) => [created, ...prev]);
        toast.success('Compra creada');
      }
      setModalOpen(false);
      resetForm();
      void fetchCompras();
    } catch (err: unknown) {
      const message = (err as { response?: { body?: { message?: string } } }).response?.body?.message ?? 'No se pudo guardar la compra';
      if (message.toLowerCase().includes('duplicado') || message.toLowerCase().includes('unique') || message.includes('P2002')) {
        toast.error('El número de compra ya existe');
      } else {
        toast.error(message);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await purchasesApi.remove(deleteConfirm.id);
      setCompras((prev) => prev.filter((c) => c.id !== deleteConfirm.id));
      toast.success('Compra eliminada');
      setDeleteConfirm(null);
    } catch {
      toast.error('No se pudo eliminar la compra');
    }
  };

  const handleCancel = async () => {
    if (!cancelling || !cancelMotivo.trim()) return;
    try {
      const updated = await purchasesApi.cancel(cancelling.id, cancelMotivo);
      setCompras((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      toast.success('Compra anulada');
      setCancelModalOpen(false);
      setCancelling(null);
      setCancelMotivo('');
    } catch {
      toast.error('No se pudo anular la compra');
    }
  };

  const handleExportPdf = async (compra: PurchaseDTO) => {
    try {
      const blob = await purchasesApi.exportPdf(compra.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compra-${compra.numero}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('PDF descargado');
    } catch {
      toast.error('No se pudo generar el PDF');
    }
  };

  const addItemFromSelector = () => {
    if (!selectedInsumoId) {
      toast.error('Seleccione un insumo para agregar');
      return;
    }
    if (formItems.some((i) => i.rawMaterialId === selectedInsumoId)) {
      toast.error('Ese insumo ya fue agregado a la compra');
      return;
    }
    const ins = insumos.find((i) => i.id === selectedInsumoId);
    if (!ins) return;
    setFormItems((prev) => [
      ...prev,
      {
        rawMaterialId: ins.id,
        nombre: ins.nombre,
        unidadMedida: ins.unidadMedida,
        cantidad: 1,
        precioUnitario: ins.precioUnitario,
      },
    ]);
    setSelectedInsumoId('');
    setInsumoSearch('');
  };

  const updateItem = (index: number, field: keyof FormItem, value: string | number) => {
    setFormItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeItem = (index: number) => {
    setFormItems((prev) => prev.filter((_, i) => i !== index));
  };

  const unidadPara = (item: FormItem): string =>
    item.unidadMedida || (item.rawMaterialId ? insumos.find((i) => i.id === item.rawMaterialId)?.unidadMedida : '') || '—';

  const filteredInsumos = useMemo(() => {
    const q = insumoSearch.trim().toLowerCase();
    if (!q) return insumos;
    return insumos.filter((i) => i.nombre.toLowerCase().includes(q));
  }, [insumos, insumoSearch]);

  const totalCompra = useMemo(
    () => formItems.filter(isItemValid).reduce((sum, i) => sum + i.cantidad * i.precioUnitario, 0),
    [formItems],
  );

  const columns: DataTableColumn<PurchaseDTO>[] = [
    {
      key: 'numero',
      header: 'Número',
      sortable: true,
      render: (c) => <span style={{ fontWeight: 600 }}>{c.numero}</span>,
    },
    {
      key: 'proveedorId',
      header: 'Proveedor',
      render: (c) => suppliers.find((sp) => sp.id === c.proveedorId)?.nombre ?? c.proveedorId,
    },
    {
      key: 'total',
      header: 'Total',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (c) => <span className={s.tdRight}>{formatCurrency(c.total)}</span>,
    },
    {
      key: 'estado',
      header: 'Estado',
      width: '120px',
      render: (c) => {
        const variant =
          c.estado === 'PENDIENTE' ? 'default' : c.estado === 'RECIBIDA' ? 'success' : c.estado === 'CANCELADA' ? 'warning' : 'danger';
        return <Badge variant={variant}>{c.estado}</Badge>;
      },
    },
    {
      key: 'fecha',
      header: 'Fecha',
      width: '120px',
      sortable: true,
      render: (c) => new Date(c.fecha).toLocaleDateString(),
    },
  ];

  const actions = (c: PurchaseDTO) => [
    { label: 'Ver detalle', icon: <Eye size={14} />, onClick: () => openDetail(c) },
    { label: 'Editar', icon: <Edit size={14} />, onClick: () => openEdit(c) },
    {
      label: 'Anular',
      icon: <X size={14} />,
      onClick: () => {
        setCancelling(c);
        setCancelModalOpen(true);
      },
      disabled: c.estado === 'ANULADA' || c.estado === 'CANCELADA',
    },
    { label: 'PDF', icon: <Download size={14} />, onClick: () => handleExportPdf(c) },
    { label: 'Eliminar', icon: <Trash2 size={14} />, onClick: () => setDeleteConfirm(c), danger: true },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Compras</h1>
          <p className={s.pageSubtitle}>Gestión de compras a proveedores</p>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={openCreate}>
          Nueva compra
        </Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar compras..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <DataTable
        data={compras}
        columns={columns}
        actions={actions}
        pageSize={pagination.limit}
        emptyMessage={loading ? 'Cargando...' : error ?? 'No hay compras'}
        serverMode
        currentPage={pagination.page}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalRecords}
        onPageChange={(newPage) => pagination.setPage(newPage)}
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          resetForm();
        }}
        title={editing ? 'Editar compra' : 'Nueva compra'}
        size="lg"
      >
        <form
          className={f.form}
          onSubmit={(e) => {
            e.preventDefault();
            handleSave();
          }}
        >
          {editing ? (
            <div className={f.field}>
              <label className={f.label}>Observaciones</label>
              <textarea
                className={f.textarea}
                value={formObservaciones}
                onChange={(e) => setFormObservaciones(e.target.value)}
                rows={3}
              />
            </div>
          ) : (
            <>
              <div className={s.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Número de compra *</label>
                  <input
                    className={f.input}
                    value={formNumero}
                    placeholder="Ej: COMP-0001"
                    onChange={(e) => {
                      setFormNumero(e.target.value);
                      if (errors.numero) setErrors((p) => ({ ...p, numero: undefined }));
                    }}
                    aria-invalid={Boolean(errors.numero)}
                  />
                  <small style={{ color: 'var(--color-text-muted)', fontSize: '0.72rem' }}>
                    Número de factura o referencia única de la compra.
                  </small>
                  {errors.numero && (
                    <span style={{ color: 'var(--color-danger)', fontSize: '0.78rem' }}>{errors.numero}</span>
                  )}
                </div>
                <div className={f.field}>
                  <label className={f.label}>Proveedor *</label>
                  <select
                    className={f.select}
                    value={formProveedorId}
                    onChange={(e) => setFormProveedorId(e.target.value)}
                  >
                    <option value="">Seleccione...</option>
                    {suppliers.map((sp) => (
                      <option key={sp.id} value={sp.id}>
                        {sp.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={f.field}>
                <label className={f.label}>Observaciones</label>
                <textarea
                  className={f.textarea}
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  rows={3}
                />
              </div>

              <div className={s.itemsSection}>
                <div className={s.itemsHeader}>
                  <label className={f.label}>Detalle de compra</label>
                </div>
                <div className={s.itemsToolbar}>
                  <input
                    className={f.input}
                    style={{ flex: '1 1 200px' }}
                    placeholder="Buscar insumo..."
                    value={insumoSearch}
                    onChange={(e) => setInsumoSearch(e.target.value)}
                  />
                  <select
                    className={f.select}
                    style={{ flex: '1 1 240px' }}
                    value={selectedInsumoId}
                    onChange={(e) => setSelectedInsumoId(e.target.value)}
                  >
                    <option value="">Seleccione un insumo...</option>
                    {filteredInsumos.map((ins) => (
                      <option key={ins.id} value={ins.id}>
                        {ins.nombre} ({ins.unidadMedida})
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="secondary" leftIcon={<Plus size={14} />} onClick={addItemFromSelector}>
                    Agregar insumo
                  </Button>
                  <Button type="button" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => {
                    setFormItems((prev) => [...prev, { nombre: '', cantidad: 1, precioUnitario: 0 }]);
                  }}>
                    Ítem manual
                  </Button>
                </div>

                {formItems.length === 0 ? (
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                        <line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 0 1-8 0" />
                      </svg>
                    </div>
                    <p className={s.emptyTitle}>No hay ítems</p>
                    <p className={s.emptyDescription}>
                      Selecciona un insumo del catálogo o agrega un ítem manual para comenzar a registrar la compra.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className={s.itemsTableWrapper}>
                      <table className={s.itemsTable}>
                        <thead>
                          <tr>
                            <th>Concepto</th>
                            <th style={{ width: 100, textAlign: 'center' }}>Cantidad</th>
                            <th style={{ width: 100 }}>Unidad</th>
                            <th style={{ width: 140, textAlign: 'right' }}>Precio unitario</th>
                            <th style={{ width: 130, textAlign: 'right' }}>Subtotal</th>
                            <th style={{ width: 50, textAlign: 'center' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {formItems.map((item, idx) => {
                            const invalid = !isItemValid(item);
                            return (
                              <tr key={idx} className={invalid ? s.itemRowInvalid : undefined}>
                                <td data-label="Concepto">
                                  <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                                    {item.rawMaterialId ? (
                                      <>
                                        <div style={{ fontWeight: 600 }}>{item.nombre}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{unidadPara(item)}</div>
                                      </>
                                    ) : (
                                      <input
                                        className={f.input}
                                        value={item.nombre}
                                        onChange={(e) => updateItem(idx, 'nombre', e.target.value)}
                                        placeholder="Nombre del producto/materia prima"
                                        style={{ width: '100%' }}
                                      />
                                    )}
                                  </div>
                                </td>
                                <td data-label="Cantidad" style={{ textAlign: 'center' }}>
                                  <input
                                    className={f.input}
                                    type="number"
                                    min={1}
                                    step={1}
                                    value={Number.isFinite(item.cantidad) ? item.cantidad : ''}
                                    onChange={(e) => updateItem(idx, 'cantidad', Number(e.target.value))}
                                    style={{ width: '100%', textAlign: 'center' }}
                                    aria-label="Cantidad"
                                  />
                                </td>
                                <td data-label="Unidad">
                                  <span style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>{unidadPara(item)}</span>
                                </td>
                                <td data-label="Precio unitario" className={s.tdRight}>
                                  <input
                                    className={f.input}
                                    type="number"
                                    min={0.01}
                                    step={0.01}
                                    value={Number.isFinite(item.precioUnitario) ? item.precioUnitario : ''}
                                    onChange={(e) => updateItem(idx, 'precioUnitario', Number(e.target.value))}
                                    style={{ width: '100%', textAlign: 'right' }}
                                    aria-label="Precio unitario"
                                  />
                                </td>
                                <td data-label="Subtotal" className={s.tdRight}>
                                  <span className={s.subtotalCell}>
                                    {formatCurrency(item.cantidad * item.precioUnitario)}
                                  </span>
                                </td>
                                <td data-label="Acciones" className={s.tdCenter}>
                                  <Button type="button" variant="danger" onClick={() => removeItem(idx)} aria-label="Eliminar partida" size="sm">
                                    <Trash2 size={14} />
                                  </Button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className={s.totalRow}>
                      <span className={s.totalLabel}>Total de la compra</span>
                      <span className={s.totalValue}>{formatCurrency(totalCompra)}</span>
                    </div>

                    {errors.items && (
                      <p style={{ color: 'var(--color-danger)', fontSize: '0.78rem', marginTop: 6 }}>{errors.items}</p>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          <ModalFooter
            secondary={{ label: 'Cancelar', onClick: () => { setModalOpen(false); resetForm(); } }}
            primary={{ label: editing ? 'Guardar cambios' : 'Crear compra', type: 'submit', loading: saving }}
          />
        </form>
      </Modal>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="Eliminar compra"
        description={`¿Estás seguro de que deseas eliminar la compra "${deleteConfirm?.numero}"?`}
        confirmLabel="Eliminar"
        variant="danger"
      />

      <Modal
        open={cancelModalOpen}
        onClose={() => {
          setCancelModalOpen(false);
          setCancelling(null);
          setCancelMotivo('');
        }}
        title="Anular compra"
        size="sm"
      >
        <div className={f.form}>
          <div className={f.field}>
            <label className={f.label}>Motivo de anulación *</label>
            <textarea
              className={f.textarea}
              value={cancelMotivo}
              onChange={(e) => setCancelMotivo(e.target.value)}
              rows={3}
            />
          </div>
          <ModalFooter
            secondary={{ label: 'Cancelar', onClick: () => { setCancelModalOpen(false); setCancelling(null); setCancelMotivo(''); } }}
            primary={{ label: 'Anular compra', onClick: handleCancel }}
          />
        </div>
      </Modal>

      <Modal
        open={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setDetailCompra(null);
          setDetailItems([]);
        }}
        title={`Detalle de compra ${detailCompra?.numero ?? ''}`}
        size="lg"
      >
        <div className={f.form}>
          {detailCompra && (
            <>
              <div className={s.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Número</label>
                  <input className={f.input} value={detailCompra.numero} readOnly />
                </div>
                <div className={f.field}>
                  <label className={f.label}>Proveedor</label>
                  <input
                    className={f.input}
                    value={suppliers.find((sp) => sp.id === detailCompra.proveedorId)?.nombre ?? detailCompra.proveedorId}
                    readOnly
                  />
                </div>
              </div>
              <div className={s.formRow}>
                <div className={f.field}>
                  <label className={f.label}>Estado</label>
                  <Badge
                    variant={
                      detailCompra.estado === 'PENDIENTE'
                        ? 'default'
                        : detailCompra.estado === 'RECIBIDA'
                          ? 'success'
                          : detailCompra.estado === 'CANCELADA'
                            ? 'warning'
                            : 'danger'
                    }
                  >
                    {detailCompra.estado}
                  </Badge>
                </div>
                <div className={f.field}>
                  <label className={f.label}>Total</label>
                  <input className={f.input} value={formatCurrency(detailCompra.total)} readOnly />
                </div>
              </div>
              <div className={f.field}>
                <label className={f.label}>Observaciones</label>
                <textarea className={f.textarea} value={detailCompra.observaciones ?? ''} readOnly rows={2} />
              </div>
              <div className={s.itemsSection}>
                <label className={f.label}>Detalle de compra</label>
                {detailItems.length === 0 ? (
                  <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No hay ítems registrados</p>
                ) : (
                  <table className={s.itemsTable}>
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Cantidad</th>
                        <th>Precio Unit.</th>
                        <th>Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.nombre}</td>
                          <td>{item.cantidad}</td>
                          <td>{formatCurrency(item.precioUnitario)}</td>
                          <td>{formatCurrency(item.cantidad * item.precioUnitario)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
          <ModalFooter
            secondary={{
              label: 'Cerrar',
              onClick: () => {
                setDetailModalOpen(false);
                setDetailCompra(null);
                setDetailItems([]);
              },
            }}
          />
        </div>
      </Modal>
    </div>
  );
};
