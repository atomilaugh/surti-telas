import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Trash2, Save, Send, ShoppingCart, AlertCircle, Loader2, Package, FileText, Tag } from 'lucide-react';
import s from './CrearPedido.module.css';
import { FileUpload } from '@/shared/ui/FileUpload';
import { Button } from '@/shared/ui/Button';
import { Modal } from '@/shared/ui/Modal';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { productsApi } from '@/infrastructure/api/productsApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import type { ProductTerminado } from '@/infrastructure/api/productsApi';
import type { Cliente } from '@/core/types';
import { useAuthStore } from '@/core/stores/authStore';
import { useNotifications } from '@/shared/context';

const TASA_IVA = 0.19;

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(value);
};

export const CrearPedido: React.FC = () => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);
  const isCliente = currentUser?.role === 'cliente';
  const { refresh } = useNotifications();

  const [products, setProducts] = useState<ProductTerminado[]>([]);
  const [customers, setCustomers] = useState<Cliente[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [prioridad, setPrioridad] = useState<'Estándar' | 'Prioritario'>('Estándar');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD' | 'OTHER'>('CASH');
  const [installments, setInstallments] = useState(1);
  const [comprobantePago, setComprobantePago] = useState<File | null>(null);
  const [items, setItems] = useState<Array<{ productId?: string; nombre: string; precio: number; cantidad: number }>>([]);
  const [descuentoPorcentaje, setDescuentoPorcentaje] = useState(0);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [isTrustedCustomer, setIsTrustedCustomer] = useState(false);
  const [diasCredito, setDiasCredito] = useState(0);
  const [descuentoEspecial, setDescuentoEspecial] = useState(0);
  const [envioGratis, setEnvioGratis] = useState(false);
  const [prioridadEnvio, setPrioridadEnvio] = useState<'Normal' | 'Express' | 'Urgente'>('Normal');

  const [submitConfirm, setSubmitConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoadingProducts(true);
      setLoadingCustomers(true);
      try {
        const [productsResult, customersResult] = await Promise.all([
          productsApi.list().catch(() => []),
          customersApi.list().catch(() => ({ data: [], meta: { totalRecords: 0, page: 1, limit: 10, totalPages: 1 } })),
        ]);
        setProducts(productsResult);
        setCustomers(customersResult.data ?? []);

        if (isCliente) {
          try {
            const trusted = await customersApi.getTrustedStatus();
            setIsTrustedCustomer(trusted.isTrustedCustomer);
          } catch {
            setIsTrustedCustomer(false);
          }
        }
      } catch {
        setError('No se pudieron cargar los datos iniciales');
        toast.error('No se pudieron cargar los datos iniciales');
      } finally {
        setLoadingProducts(false);
        setLoadingCustomers(false);
      }
    };
    void load();
  }, [isCliente]);

  useEffect(() => {
    if (!isCliente && selectedClientId) {
      const client = customers.find(c => c.id === selectedClientId);
      setIsTrustedCustomer(client?.isTrustedCustomer ?? false);
      if (client?.cupoTotal && client.cupoTotal > 0) {
        setDiasCredito(5);
      }
    }
  }, [selectedClientId, isCliente, customers]);

  const selectedClient = useMemo(() => customers.find(c => c.id === selectedClientId) ?? null, [customers, selectedClientId]);

  const productOptions = useMemo(() => {
    return products.map(p => ({
      value: p.id,
      label: `${p.nombre} (${p.codigo}) - ${formatCurrency(p.precio)} - Stock: ${p.stock}`,
      product: p,
    }));
  }, [products]);

  const handleAddItem = useCallback(() => {
    setItems(prev => [...prev, { nombre: '', precio: 0, cantidad: 1 }]);
  }, []);

  const handleRemoveItem = useCallback((index: number) => {
    setItems(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  }, []);

  const handleItemChange = useCallback((index: number, field: 'nombre' | 'precio' | 'cantidad' | 'productId', value: string | number) => {
    setItems(prev => {
      const newItems = [...prev];
      const item = { ...newItems[index], [field]: value };

      if (field === 'productId' && typeof value === 'string') {
        const product = products.find(p => p.id === value);
        if (product) {
          item.nombre = product.nombre;
          item.precio = product.precio;
        }
      }

      newItems[index] = item;
      return newItems;
    });
  }, [products]);

  const subtotalGeneral = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.precio || 0) * (item.cantidad || 0), 0);
  }, [items]);

  const descuentoMonto = useMemo(() => {
    return subtotalGeneral * (descuentoPorcentaje / 100);
  }, [subtotalGeneral, descuentoPorcentaje]);

  const subtotalNeto = useMemo(() => {
    return subtotalGeneral - descuentoMonto;
  }, [subtotalGeneral, descuentoMonto]);

  const ivaMonto = useMemo(() => {
    return subtotalNeto * TASA_IVA;
  }, [subtotalNeto]);

  const totalGeneral = useMemo(() => {
    return subtotalNeto + ivaMonto;
  }, [subtotalNeto, ivaMonto]);

  const validateForm = useCallback((): boolean => {
    const errors: Record<string, string> = {};

    if (!isCliente && !selectedClientId) {
      errors.client = 'Debes seleccionar un cliente';
    }

    const validItems = items.filter(it => it.nombre.trim() && it.cantidad > 0 && it.precio >= 0);
    if (validItems.length === 0) {
      errors.items = 'Debes agregar al menos un producto válido al pedido';
    }

    items.forEach((item, index) => {
      if (item.nombre.trim() && !item.productId) {
        errors[`item_${index}_product`] = 'Selecciona un producto de la lista';
      }
      if (item.cantidad <= 0) {
        errors[`item_${index}_cantidad`] = 'La cantidad debe ser mayor a 0';
      }
      if (item.precio < 0) {
        errors[`item_${index}_precio`] = 'El precio no puede ser negativo';
      }
    });

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [isCliente, selectedClientId, items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      toast.error('Corrige los errores antes de enviar el pedido');
      return;
    }

    setSaving(true);
    try {
      const validItems = items
        .filter(it => it.nombre.trim() && it.cantidad > 0 && it.precio >= 0)
        .map(it => ({
          productId: it.productId,
          nombre: it.nombre,
          precio: it.precio,
          cantidad: it.cantidad,
        }));

      const observacionesTexto = [
        observaciones || null,
        comprobantePago ? `Comprobante de pago adjunto: ${comprobantePago.name}` : null,
      ].filter(Boolean).join(' ');

      const result = await ordersApi.create({
        clienteId: isCliente ? undefined : selectedClientId,
        itemsList: validItems,
        prioridad,
        observaciones: observacionesTexto,
        paymentMethod,
        installments,
        comprobantePago: comprobantePago ?? undefined,
        diasCredito: isTrustedCustomer && diasCredito > 0 ? diasCredito : undefined,
        descuentoEspecial: isTrustedCustomer ? descuentoEspecial || undefined : undefined,
        envioGratis: isTrustedCustomer ? envioGratis : undefined,
        prioridadEnvio: isTrustedCustomer && prioridadEnvio !== 'Normal' ? prioridadEnvio : undefined,
      });
      await refresh();

      toast.success(`Pedido ${result.pedido.numero ?? result.pedido.id} creado correctamente`);
      navigate(`/cliente/pedidos/${result.id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo crear el pedido';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loadingProducts || loadingCustomers) {
    return (
      <div className={s.page}>
        <div className={s.loadingState}>
          <Loader2 size={28} className={s.spin} />
          <span>Cargando productos y clientes...</span>
        </div>
      </div>
    );
  }

  if (error && !saving) {
    return (
      <div className={s.page}>
        <div className={s.errorState}>
          <AlertCircle size={28} />
          <span>{error}</span>
          <Button variant="secondary" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <div className={s.pageHeader}>
        <div>
          <h1 className={s.pageTitle}>Crear Nuevo Pedido</h1>
          <p className={s.pageSubtitle}>Registra un pedido seleccionando productos, cantidades y adjuntando el comprobante de pago</p>
        </div>
        <Button variant="secondary" onClick={() => navigate('/cliente/pedidos')}>
          Volver a Mis Pedidos
        </Button>
      </div>

      <form onSubmit={handleSubmit} className={s.form}>
        {error && (
          <div className={s.formError}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <ShoppingCart size={18} />
            Datos del pedido
          </h2>
          <div className={s.formRow}>
            <div className={s.field}>
              <label className={s.label}>{isCliente ? 'Cliente (tu cuenta)' : 'Cliente *'}</label>
              {isCliente ? (
                <input
                  className={s.input}
                  value={currentUser?.name || currentUser?.email || 'Tu cuenta'}
                  disabled
                />
              ) : (
                <select
                  className={s.select}
                  value={selectedClientId}
                  onChange={e => setSelectedClientId(e.target.value)}
                >
                  <option value="">Selecciona un cliente</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              )}
              {formErrors.client && <span className={s.fieldError}>{formErrors.client}</span>}
            </div>
            <div className={s.field}>
              <label className={s.label}>Método de pago</label>
              <select
                className={s.select}
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value as typeof paymentMethod)}
              >
                 <option value="CASH">Efectivo</option>
                 <option value="TRANSFER">Transferencia</option>
                 <option value="CARD">Tarjeta</option>
                 <option value="OTHER">Otro</option>
                 {isTrustedCustomer && <option value="INSTALLMENTS">A crédito</option>}
              </select>
            </div>
          </div>
          <div className={s.formRow}>
            <div className={s.field}>
              <label className={s.label}>Prioridad</label>
              <select
                className={s.select}
                value={prioridad}
                onChange={e => setPrioridad(e.target.value as 'Estándar' | 'Prioritario')}
              >
                <option value="Estándar">Estándar</option>
                <option value="Prioritario">Prioritario</option>
              </select>
            </div>
            <div className={s.field}>
              <label className={s.label}>Cuotas</label>
              <input
                className={s.input}
                type="number"
                min="1"
                max="36"
                value={installments}
                onChange={e => setInstallments(Math.max(1, Math.min(36, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
          <div className={s.field}>
            <label className={s.label}>Descuento (%)</label>
            <input
              className={s.input}
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={descuentoPorcentaje}
              onChange={e => setDescuentoPorcentaje(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
            />
          </div>
          <div className={s.field}>
            <label className={s.label}>Observaciones</label>
            <textarea
              className={s.textarea}
              rows={3}
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Notas adicionales del pedido..."
            />
          </div>

          {isTrustedCustomer && (
            <div className={s.trustedSection}>
              <h3 className={s.trustedTitle}>
                <Tag size={16} /> Opciones de cliente de confianza
              </h3>
              <div className={s.formRow}>
                <div className={s.field}>
                  <label className={s.label}>Días de crédito</label>
                  <input
                    className={s.input}
                    type="number"
                    min="0"
                    max="60"
                    value={diasCredito}
                    onChange={e => setDiasCredito(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
                  />
                </div>
                <div className={s.field}>
                  <label className={s.label}>Descuento especial (%)</label>
                  <input
                    className={s.input}
                    type="number"
                    min="0"
                    max="50"
                    step="0.01"
                    value={descuentoEspecial}
                    onChange={e => setDescuentoEspecial(Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
                  />
                </div>
              </div>
              <div className={s.formRow}>
                <div className={s.field} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 24 }}>
                  <input
                    type="checkbox"
                    id="envioGratis"
                    checked={envioGratis}
                    onChange={e => setEnvioGratis(e.target.checked)}
                  />
                  <label htmlFor="envioGratis" className={s.label} style={{ margin: 0 }}>Envío gratis</label>
                </div>
                <div className={s.field}>
                  <label className={s.label}>Prioridad de envío</label>
                  <select
                    className={s.select}
                    value={prioridadEnvio}
                    onChange={e => setPrioridadEnvio(e.target.value as typeof prioridadEnvio)}
                  >
                    <option value="Normal">Normal</option>
                    <option value="Express">Express</option>
                    <option value="Urgente">Urgente</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </section>

        <section className={s.section}>
          <div className={s.sectionHeader}>
            <h2 className={s.sectionTitle}>
              <Package size={18} />
              Productos del pedido
            </h2>
            <Button type="button" variant="secondary" size="sm" onClick={handleAddItem} leftIcon={<Plus size={14} />}>
              Agregar producto
            </Button>
          </div>
          {formErrors.items && <div className={s.fieldError}>{formErrors.items}</div>}
          <div className={s.itemsTableWrapper}>
            <table className={s.itemsTable}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th className={s.centerCol}>Cant.</th>
                  <th className={s.rightCol}>Precio unit.</th>
                  <th className={s.rightCol}>Subtotal</th>
                  <th style={{ width: 40 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <tr key={index}>
                    <td>
                      <select
                        className={s.select}
                        value={item.productId ?? ''}
                        onChange={e => handleItemChange(index, 'productId', e.target.value)}
                      >
                        <option value="">Buscar o escribir producto</option>
                        {productOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                      {formErrors[`item_${index}_product`] && (
                        <span className={s.fieldError}>{formErrors[`item_${index}_product`]}</span>
                      )}
                      {!item.productId && (
                        <input
                          className={s.input}
                          value={item.nombre}
                          onChange={e => handleItemChange(index, 'nombre', e.target.value)}
                          placeholder="Nombre del producto"
                          style={{ marginTop: 4 }}
                        />
                      )}
                    </td>
                    <td className={s.centerCol}>
                      <input
                        className={s.input}
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={e => handleItemChange(index, 'cantidad', Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className={s.rightCol}>
                      <input
                        className={s.input}
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.precio}
                        onChange={e => handleItemChange(index, 'precio', Number(e.target.value) || 0)}
                      />
                    </td>
                    <td className={s.rightCol} style={{ fontWeight: 600 }}>
                      {formatCurrency((item.precio || 0) * (item.cantidad || 0))}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={s.removeRowBtn}
                        onClick={() => handleRemoveItem(index)}
                        aria-label="Eliminar producto"
                        disabled={items.length === 1}
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>Resumen del pedido</h2>
          <div className={s.resumen}>
            <div className={s.resumenRow}>
              <span>Subtotal</span>
              <span>{formatCurrency(subtotalGeneral)}</span>
            </div>
            {descuentoPorcentaje > 0 && (
              <div className={s.resumenRow}>
                <span>Descuento ({descuentoPorcentaje}%)</span>
                <span style={{ color: 'var(--color-error)' }}>-{formatCurrency(descuentoMonto)}</span>
              </div>
            )}
            <div className={s.resumenRow}>
              <span>Subtotal neto</span>
              <span>{formatCurrency(subtotalNeto)}</span>
            </div>
            <div className={s.resumenRow}>
              <span>IVA (19%)</span>
              <span>{formatCurrency(ivaMonto)}</span>
            </div>
            <div className={`${s.resumenRow} ${s.resumenRowTotal}`}>
              <span>Total</span>
              <strong>{formatCurrency(totalGeneral)}</strong>
            </div>
          </div>
        </section>

        <section className={s.section}>
          <h2 className={s.sectionTitle}>
            <FileText size={18} />
            Comprobante de pago (opcional)
          </h2>
          <FileUpload
            accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
            maxSizeMB={10}
            maxFiles={1}
            value={comprobantePago}
            onChange={(files) => {
              if (files && files.length > 0) {
                setComprobantePago(files[0]);
              } else {
                setComprobantePago(null);
              }
            }}
            hint="Formatos permitidos: PDF, JPG, PNG, GIF, WEBP. Tamaño máximo: 10 MB."
            label="Adjuntar comprobante de pago"
            allowPreview
          />
        </section>

        <div className={s.formActions}>
          <Button type="button" variant="secondary" onClick={() => navigate('/cliente/pedidos')} disabled={saving}>
            Cancelar
          </Button>
          <Button type="button" variant="secondary" onClick={() => setSubmitConfirm(true)} leftIcon={<Send size={16} />}>
            Vista previa
          </Button>
          <Button type="submit" loading={saving} leftIcon={<Save size={16} />}>
            Confirmar pedido
          </Button>
        </div>
      </form>

      <PreviewModal
        open={submitConfirm}
        onClose={() => setSubmitConfirm(false)}
        items={items}
        selectedClient={selectedClient}
        subtotal={subtotalGeneral}
        descuento={descuentoMonto}
        iva={ivaMonto}
        total={totalGeneral}
        observaciones={observaciones}
        prioridad={prioridad}
        paymentMethod={paymentMethod}
        installments={installments}
        comprobantePago={comprobantePago}
        isTrustedCustomer={isTrustedCustomer}
        diasCredito={diasCredito > 0 ? diasCredito : undefined}
        descuentoEspecial={descuentoEspecial > 0 ? descuentoEspecial : undefined}
        envioGratis={envioGratis}
        prioridadEnvio={prioridadEnvio}
      />

      <ConfirmationModal
        open={submitConfirm}
        onClose={() => setSubmitConfirm(false)}
        onConfirm={() => {
          setSubmitConfirm(false);
          void document.querySelector('form')?.requestSubmit();
        }}
        title="Confirmar pedido"
        description={`¿Estás seguro de crear el pedido para "${selectedClient?.nombre ?? 'desconocido'}" con un total de ${formatCurrency(totalGeneral)}?`}
        confirmLabel="Confirmar pedido"
      />
    </div>
  );
};

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  items: Array<{ nombre: string; precio: number; cantidad: number }>;
  selectedClient: Cliente | null;
  subtotal: number;
  descuento: number;
  iva: number;
  total: number;
  observaciones: string;
  prioridad: 'Estándar' | 'Prioritario';
  paymentMethod: string;
  installments: number;
  comprobantePago: File | null;
  isTrustedCustomer: boolean;
  diasCredito?: number;
  descuentoEspecial?: number;
  envioGratis?: boolean;
  prioridadEnvio?: 'Normal' | 'Express' | 'Urgente';
}

const PreviewModal: React.FC<PreviewModalProps> = ({
  open,
  onClose,
  items,
  selectedClient,
  subtotal,
  descuento,
  iva,
  total,
  observaciones,
  prioridad,
  paymentMethod,
  installments,
  comprobantePago,
  isTrustedCustomer,
  diasCredito,
  descuentoEspecial,
  envioGratis,
  prioridadEnvio,
}) => {
  const metodoLabels: Record<string, string> = {
    CASH: 'Efectivo',
    TRANSFER: 'Transferencia',
    CARD: 'Tarjeta',
    OTHER: 'Otro',
  };

  return (
    <Modal open={open} onClose={onClose} title="Vista previa del pedido" description="Revisa los datos antes de confirmar" size="xl">
      <div className={s.preview}>
        <div className={s.previewSection}>
          <h4 className={s.previewTitle}>Cliente</h4>
          <p>{selectedClient?.nombre ?? 'No seleccionado'}</p>
        </div>
         <div className={s.previewSection}>
          <h4 className={s.previewTitle}>Pago</h4>
          <p>Método: {metodoLabels[paymentMethod] ?? paymentMethod}</p>
          <p>Cuotas: {installments}</p>
          <p>Prioridad: {prioridad}</p>
          {isTrustedCustomer && (
            <>
              {diasCredito && diasCredito > 0 && <p>Días de crédito: {diasCredito}</p>}
              {descuentoEspecial && descuentoEspecial > 0 && <p>Descuento especial: {descuentoEspecial}%</p>}
              {envioGratis && <p>Envío gratis: Sí</p>}
              {prioridadEnvio && prioridadEnvio !== 'Normal' && <p>Envío: {prioridadEnvio}</p>}
            </>
          )}
        </div>
        <div className={s.previewSection}>
          <h4 className={s.previewTitle}>Productos</h4>
          <table className={s.previewTable}>
            <thead>
              <tr>
                <th>Producto</th>
                <th className={s.centerCol}>Cant.</th>
                <th className={s.rightCol}>Precio</th>
                <th className={s.rightCol}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.nombre || '—'}</td>
                  <td className={s.centerCol}>{item.cantidad}</td>
                  <td className={s.rightCol}>{formatCurrency(item.precio)}</td>
                  <td className={s.rightCol}>{formatCurrency(item.precio * item.cantidad)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={s.previewSection}>
          <h4 className={s.previewTitle}>Totales</h4>
          <div className={s.previewTotals}>
            <div className={s.previewRow}><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
            {descuento > 0 && <div className={s.previewRow}><span>Descuento</span><span style={{ color: 'var(--color-error)' }}>-{formatCurrency(descuento)}</span></div>}
            <div className={s.previewRow}><span>IVA (19%)</span><span>{formatCurrency(iva)}</span></div>
            <div className={`${s.previewRow} ${s.previewRowTotal}`}><span>Total</span><strong>{formatCurrency(total)}</strong></div>
          </div>
        </div>
        {observaciones && (
          <div className={s.previewSection}>
            <h4 className={s.previewTitle}>Observaciones</h4>
            <p>{observaciones}</p>
          </div>
        )}
        {comprobantePago && (
          <div className={s.previewSection}>
            <h4 className={s.previewTitle}>Comprobante de pago</h4>
            <div className={s.previewFile}>
              <FileText size={18} />
              <span>{comprobantePago.name}</span>
              <span className={s.previewMeta}>({comprobantePago.size} bytes)</span>
            </div>
          </div>
        )}
      </div>
      <div className={s.previewActions}>
        <Button variant="secondary" onClick={onClose}>Cerrar</Button>
      </div>
    </Modal>
  );
};