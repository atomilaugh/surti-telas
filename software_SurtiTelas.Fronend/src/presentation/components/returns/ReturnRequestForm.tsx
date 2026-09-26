import React, { useEffect, useState } from 'react';
import { CheckCircle, Info, Package, X } from 'lucide-react';
import s from './ReturnRequestForm.module.css';
import { Button } from '@/shared/ui/Button';
import { Select } from '@/shared/ui/Select';
import { Spinner } from '@/shared/ui/Spinner';
import {
  returnsApi,
  type CreateReturnRequestInput,
  type CreateReturnRequestItemInput,
  type ReturnItemDefectoTipo,
  type ReturnRequestMotivo,
} from '@/infrastructure/api/returnsApi';

const MOTIVO_OPTIONS: { value: ReturnRequestMotivo; label: string }[] = [
  { value: 'PRODUCTO_DEFECTUOSO', label: 'Producto defectuoso' },
  { value: 'PRODUCTO_DANADO', label: 'Producto dañado' },
  { value: 'PRODUCTO_INCORRECTO', label: 'Producto incorrecto' },
  { value: 'CANTIDAD_INCORRECTA', label: 'Cantidad incorrecta' },
  { value: 'PROBLEMA_ESTAMPADO', label: 'Problema de estampado' },
  { value: 'OTRO', label: 'Otro' },
];

const MOTIVO_TO_DEFECTO: Record<ReturnRequestMotivo, ReturnItemDefectoTipo> = {
  PRODUCTO_DEFECTUOSO: 'DEFECTO_CONFECCION',
  PRODUCTO_DANADO: 'DEFECTO_CONFECCION',
  PRODUCTO_INCORRECTO: 'IMPERFECCION_VISUAL',
  CANTIDAD_INCORRECTA: 'ERROR_CANTIDAD',
  PROBLEMA_ESTAMPADO: 'DEFECTO_CONFECCION',
  OTRO: 'OTRO',
};

export interface ReturnFormOrderOption {
  id: string;
  numero: string;
  fecha: string;
  estado: string;
}

interface ProductRow {
  id: string;
  productId?: string;
  ref: string;
  nombre: string;
  cantidadComprada: number;
  cantidadDevolver: string;
}

export interface ReturnRequestFormProps {
  orders: ReturnFormOrderOption[];
  loadingOrders?: boolean;
  submitLabel: string;
  saving: boolean;
  formError?: string | null;
  submitDisabled?: boolean;
  showCancel?: boolean;
  compact?: boolean;
  onCancel?: () => void;
  onSubmit: (input: CreateReturnRequestInput) => Promise<void>;
}

const MAX_EVIDENCIAS = 10;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

/**
 * Formulario de solicitud de devolución reutilizado por el portal del cliente
 * y por el registro manual del administrador (misma lógica de pedido, productos,
 * motivo, descripción y evidencias).
 */
export const ReturnRequestForm: React.FC<ReturnRequestFormProps> = ({
  orders,
  loadingOrders = false,
  submitLabel,
  saving,
  formError,
  submitDisabled = false,
  showCancel = false,
  compact = false,
  onCancel,
  onSubmit,
}) => {
  const [ordenSeleccionada, setOrdenSeleccionada] = useState<ReturnFormOrderOption | null>(null);
  const [cliente, setCliente] = useState('');
  const [orderItems, setOrderItems] = useState<ProductRow[]>([]);
  const [loadingOrden, setLoadingOrden] = useState(false);
  const [motivo, setMotivo] = useState<ReturnRequestMotivo>('PRODUCTO_DEFECTUOSO');
  const [descripcion, setDescripcion] = useState('');
  const [evidencias, setEvidencias] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [evidenciaError, setEvidenciaError] = useState<string | null>(null);
  const [subiendoEvidencias, setSubiendoEvidencias] = useState(false);

  useEffect(() => {
    const urls = evidencias.map((file) => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [evidencias]);

  const handleOrdenChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const orderId = e.target.value;
    const orden = orders.find((o) => o.id === orderId) ?? null;
    setOrdenSeleccionada(orden);
    setOrderItems([]);
    setCliente('');
    if (!orden) return;
    setLoadingOrden(true);
    try {
      const order = await returnsApi.getOrderForReturn(orden.id);
      if (order) {
        setCliente(order.cliente);
        setOrderItems(
          order.items.map((item) => ({
            id: item.id,
            productId: item.productId ?? undefined,
            ref: item.ref,
            nombre: item.nombre,
            cantidadComprada: item.cantidad,
            cantidadDevolver: '0',
          })),
        );
      }
    } finally {
      setLoadingOrden(false);
    }
  };

  const handleCantidadChange = (itemId: string, value: string) => {
    setOrderItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, cantidadDevolver: value } : item)));
  };

  const handleEvidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newFiles = Array.from(files);
    if (evidencias.length + newFiles.length > MAX_EVIDENCIAS) {
      setEvidenciaError(`Máximo ${MAX_EVIDENCIAS} archivos permitidos`);
      e.target.value = '';
      return;
    }
    const invalid = newFiles.find((f) => !ALLOWED_TYPES.includes(f.type));
    if (invalid) {
      setEvidenciaError('Formato no permitido. Usa JPG, PNG, WEBP, GIF o PDF');
      e.target.value = '';
      return;
    }
    setEvidenciaError(null);
    setEvidencias((prev) => [...prev, ...newFiles]);
    e.target.value = '';
  };

  const removeEvidence = (index: number) => setEvidencias((prev) => prev.filter((_, i) => i !== index));

  const getSelectedItems = () =>
    orderItems
      .map((item) => ({ item, cantidad: parseInt(item.cantidadDevolver, 10) || 0 }))
      .filter(({ cantidad }) => cantidad > 0);

  const getTotalCantidad = () => getSelectedItems().reduce((sum, { cantidad }) => sum + cantidad, 0);

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    if (!ordenSeleccionada) errors.push('Debe seleccionar un pedido');
    const selected = getSelectedItems();
    if (selected.length === 0) errors.push('Debe seleccionar al menos un producto');
    selected.forEach(({ item, cantidad }) => {
      if (cantidad > item.cantidadComprada) {
        errors.push(`La cantidad para "${item.nombre}" (${cantidad}) excede la comprada (${item.cantidadComprada})`);
      }
      if (!item.ref.trim()) {
        errors.push(`El producto "${item.nombre}" no tiene referencia y no puede devolverse`);
      }
    });
    if (!descripcion.trim()) errors.push('Describe el problema presentado');
    return errors;
  };

  const resetForm = () => {
    setOrdenSeleccionada(null);
    setOrderItems([]);
    setCliente('');
    setMotivo('PRODUCTO_DEFECTUOSO');
    setDescripcion('');
    setEvidencias([]);
    setEvidenciaError(null);
  };

  const handleSubmit = async () => {
    const errors = getValidationErrors();
    if (errors.length > 0) return;

    let evidenciasRefs: string[] = [];
    if (evidencias.length > 0) {
      setSubiendoEvidencias(true);
      try {
        evidenciasRefs = await returnsApi.uploadEvidence(evidencias);
      } finally {
        setSubiendoEvidencias(false);
      }
    }

    const items: CreateReturnRequestItemInput[] = getSelectedItems().map(({ item, cantidad }) => ({
      orderItemId: item.id,
      productId: item.productId,
      ref: item.ref,
      prenda: item.nombre,
      cantidadSolicitada: cantidad,
      defectoTipo: MOTIVO_TO_DEFECTO[motivo],
      defectoDescripcion: descripcion.trim(),
    }));

    await onSubmit({
      orderId: ordenSeleccionada!.id,
      motivo,
      observaciones: descripcion.trim(),
      cantidadTotal: getTotalCantidad(),
      items,
      evidencias: evidenciasRefs,
    });

    resetForm();
  };

  const busy = saving || subiendoEvidencias;
  const validationErrors = getValidationErrors();

  return (
    <div className={compact ? `${s.form} ${s.formCompact}` : s.form}>
      <div className={s.section}>
        <h3 className={s.sectionTitle}>Datos de la solicitud</h3>
        <div className={compact ? s.grid2 : undefined}>
          <div className={s.field}>
            <label className={s.label} htmlFor="return-order">N.º de pedido *</label>
            <Select
              value={ordenSeleccionada?.id ?? ''}
              onChange={handleOrdenChange}
              options={orders.map((o) => ({ value: o.id, label: `${o.numero} - ${o.fecha} - ${o.estado}` }))}
              placeholder={loadingOrders ? 'Cargando pedidos...' : 'Seleccionar pedido'}
            />
          </div>
          <div className={s.field}>
            <label className={s.label} htmlFor="return-client">Cliente</label>
            <input
              id="return-client"
              className={`${s.input} ${s.inputReadOnly}`}
              value={cliente}
              readOnly
              placeholder="Se cargará al seleccionar un pedido"
            />
          </div>
        </div>
      </div>

      {loadingOrden && (
        <div className={s.loadingRow}>
          <Spinner size="sm" />
          <span>Cargando información del pedido...</span>
        </div>
      )}

      {!ordenSeleccionada && !loadingOrden && (
        <div className={s.infoRow}>
          <Info size={16} />
          <span>Selecciona un pedido para ver sus productos.</span>
        </div>
      )}

      {ordenSeleccionada && !loadingOrden && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Productos</h3>
          {orderItems.length === 0 ? (
            <p className={s.emptyText}>No se encontraron productos disponibles para este pedido.</p>
          ) : (
            <div className={s.tableWrapper}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Referencia</th>
                    <th>Comprado</th>
                    <th>Devolver</th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map((item) => {
                    const cant = parseInt(item.cantidadDevolver, 10) || 0;
                    const isError = cant > item.cantidadComprada;
                    return (
                      <tr key={item.id}>
                        <td>{item.nombre}</td>
                        <td>{item.ref || '—'}</td>
                        <td>{item.cantidadComprada}</td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={item.cantidadComprada}
                            value={item.cantidadDevolver}
                            onChange={(e) => handleCantidadChange(item.id, e.target.value)}
                            className={`${s.qtyInput} ${isError ? s.qtyInputError : ''}`}
                            aria-label={`Cantidad a devolver de ${item.nombre}`}
                          />
                          {isError && <span className={s.qtyError}>La cantidad excede lo comprado</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className={s.section}>
        <h3 className={s.sectionTitle}>{compact ? 'Motivo y descripción' : 'Motivo'}</h3>
        <div className={compact ? s.grid2 : undefined}>
          <div className={s.field}>
            <label className={s.label}>Motivo *</label>
            <Select
              value={motivo}
              onChange={(e) => setMotivo(e.target.value as ReturnRequestMotivo)}
              options={MOTIVO_OPTIONS}
              placeholder="Seleccionar motivo"
            />
          </div>
          {compact && (
            <div className={s.field}>
              <label className={s.label} htmlFor="return-description">Descripción del problema *</label>
              <textarea
                id="return-description"
                className={s.textarea}
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Describe detalladamente qué ocurrió con el producto..."
                rows={2}
              />
            </div>
          )}
        </div>
      </div>

      {!compact && (
        <div className={s.section}>
          <h3 className={s.sectionTitle}>Descripción del problema</h3>
          <div className={s.field}>
            <label className={s.label} htmlFor="return-description">Descripción del problema *</label>
            <textarea
              id="return-description"
              className={s.textarea}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Describe detalladamente qué ocurrió con el producto..."
              rows={3}
            />
          </div>
        </div>
      )}

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Evidencias</h3>
        {!compact && (
          <p className={s.hint}>Adjunta fotografías o archivos que ayuden a demostrar el problema presentado con el producto.</p>
        )}
        <div className={s.uploadArea}>
          <input
            id="return-evidence-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
            multiple
            onChange={handleEvidenceChange}
            className={s.hiddenInput}
            disabled={evidencias.length >= MAX_EVIDENCIAS}
          />
          <label htmlFor="return-evidence-upload" className={s.uploadLabel}>
            <Package size={20} />
            <span>+ Agregar evidencia</span>
            <span className={s.uploadHint}>JPG, PNG, WEBP, GIF o PDF. Hasta {MAX_EVIDENCIAS} archivos.</span>
          </label>
          {evidenciaError && <p className={s.imageError}>{evidenciaError}</p>}
          {evidencias.length > 0 && (
            <div className={s.imagePreviewGrid}>
              {evidencias.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className={s.imagePreviewItem}>
                  {file.type.startsWith('image/') ? (
                    <img src={previews[idx]} alt={`evidencia-${idx + 1}`} />
                  ) : (
                    <span className={s.filePreview}>📎 {file.name}</span>
                  )}
                  <button
                    type="button"
                    className={s.removeImageBtn}
                    onClick={() => removeEvidence(idx)}
                    aria-label={`Eliminar evidencia ${idx + 1}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={s.section}>
        <h3 className={s.sectionTitle}>Resumen</h3>
        <div className={compact ? `${s.summary} ${s.summaryCompact}` : s.summary}>
          <div className={s.summaryRow}>
            <span>Pedido:</span>
            <strong>{ordenSeleccionada?.numero ?? 'Sin seleccionar'}</strong>
          </div>
          <div className={s.summaryRow}>
            <span>Productos:</span>
            <strong>{getSelectedItems().length}</strong>
          </div>
          <div className={s.summaryRow}>
            <span>Unidades totales:</span>
            <strong>{getTotalCantidad()}</strong>
          </div>
          <div className={s.summaryRow}>
            <span>Motivo:</span>
            <strong>{MOTIVO_OPTIONS.find((m) => m.value === motivo)?.label ?? motivo}</strong>
          </div>
          <div className={s.summaryRow}>
            <span>Evidencias:</span>
            <strong>{evidencias.length}</strong>
          </div>
        </div>

        {(validationErrors.length > 0 || formError) && (
          <div className={s.errorBox}>
            {formError && <p>{formError}</p>}
            {validationErrors.map((err, i) => (
              <p key={i}>{err}</p>
            ))}
          </div>
        )}
      </div>

      <div className={s.actions}>
        {showCancel && (
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
        )}
        <Button
          leftIcon={<CheckCircle size={16} />}
          loading={busy}
          onClick={handleSubmit}
          disabled={validationErrors.length > 0 || busy || submitDisabled}
        >
          {busy ? 'Enviando solicitud...' : submitLabel}
        </Button>
      </div>
    </div>
  );
};

export default ReturnRequestForm;
