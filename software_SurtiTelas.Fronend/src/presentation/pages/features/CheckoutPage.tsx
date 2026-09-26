import React, { useMemo, useRef, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, CreditCard, Upload, BadgePercent } from 'lucide-react';
import { toast } from 'sonner';
import { useCart, useAuth } from '@/app/providers/AppProviders';
import { useClientes } from '@/core/stores';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import { BankingQrCode } from '@/presentation/components/BankingQrCode';
import type { PedidoItem } from '@/core/types';
import { appContent } from '@/shared/config/appContent';
import './CheckoutPage.css';

const formatCurrency = (value: number) => `$${value.toLocaleString('es-CO')}`;

type PaymentType = 'immediate' | 'installments';

  const installmentOptions = appContent.checkout.installmentOptions;

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clientes } = useClientes();
  const {
    items,
    totalItems,
    subtotal,
    discount,
    shipping,
    tax,
    total,
    clearCart,
  } = useCart();

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentType, setPaymentType] = useState<PaymentType>('immediate');
  const [installments, setInstallments] = useState(2);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isTrustedCustomer, setIsTrustedCustomer] = useState(false);
  const [referencia, setReferencia] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const clienteActual = useMemo(() => {
    if (!user?.email) return null;
    return clientes.find(c => c.email === user.email || c.nombre === user.name || c.nombre === user.email) || null;
  }, [user?.email, user?.name, clientes]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { isTrustedCustomer: trusted } = await customersApi.getTrustedStatus();
        if (!cancelled) setIsTrustedCustomer(!!trusted);
      } catch {
        if (!cancelled) setIsTrustedCustomer(clienteActual?.isTrustedCustomer ?? false);
      }
    })();
    return () => { cancelled = true };
  }, [clienteActual?.isTrustedCustomer]);

  const handlePaymentTypeChange = useCallback((type: PaymentType) => {
    if (type === 'installments' && !isTrustedCustomer) {
      return;
    }
    setPaymentType(type);
  }, [isTrustedCustomer]);

  useEffect(() => {
    if (!isTrustedCustomer && paymentType === 'installments') {
      setPaymentType('immediate');
    }
  }, [isTrustedCustomer, paymentType]);

  const taxesLabel = useMemo(() => `IVA 19%`, []);

  const installmentValue = useMemo(
    () => Math.round((total / installments) * 100) / 100,
    [total, installments],
  );

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setProofFile(null);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El comprobante no puede superar 10 MB.');
      setProofFile(null);
      return;
    }

    setProofFile(file);
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

type CheckoutCustomerSummary = {
  asesorId?: string | null;
};

const buildCheckoutObservaciones = (
  proofFile: File | undefined,
  paymentType: PaymentType,
  installments: number,
  clienteActual: CheckoutCustomerSummary | null,
  referencia: string,
  content: typeof appContent,
): string => {
  const lines: Array<string | null> = [
    `Banco: ${content.checkout.bankingKey.bankName}`,
    `Cuenta: ${content.checkout.bankingKey.accountNumber}`,
    `Beneficiario: ${content.checkout.bankingKey.beneficiary}`,
    proofFile ? `Comprobante: ${proofFile.name}` : null,
    paymentType === 'installments' ? `Pago por abonos: ${installments} cuotas` : 'Pago inmediato',
    clienteActual?.asesorId ? `Asesor: ${clienteActual.asesorId}` : null,
    referencia ? `Referencia: ${referencia}` : null,
  ];
  return lines.filter(Boolean).join(' | ');
};

  const handleConfirm = async () => {
    if (!proofFile) {
      toast.error('Adjunta el comprobante de pago.');
      return;
    }

    if (items.length === 0) {
      toast.error('No hay productos en el carrito.');
      return;
    }

    setIsSubmitting(true);
    try {
    const itemsList: PedidoItem[] = items.map((item) => ({
      productId: item.productId || undefined,
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.quantity,
      color: item.color,
      talla: item.talla,
      referencia: item.referencia,
    }));

      const validItemsList = itemsList.filter(it => it.nombre.trim() && it.cantidad > 0 && it.precio >= 0);

      const observaciones = buildCheckoutObservaciones(proofFile ?? undefined, paymentType, installments, clienteActual, referencia, appContent);

      const createInput = {
        clienteId: clienteActual?.id,
        asesorId: clienteActual?.asesorId,
        itemsList: validItemsList,
        prioridad: undefined,
        observaciones,
        paymentMethod: paymentType === 'installments' ? 'OTHER' : 'TRANSFER',
        installments: paymentType === 'installments' ? installments : undefined,
        comprobantePago: proofFile ?? undefined,
      } as Parameters<typeof ordersApi.create>[0];

      if (createInput.comprobantePago) {
        const form = new FormData();
        form.append('clienteId', createInput.clienteId || '');
        form.append('asesorId', createInput.asesorId || '');
        form.append('itemsList', JSON.stringify(createInput.itemsList || []));
        form.append('prioridad', createInput.prioridad || 'Estándar');
        form.append('observaciones', createInput.observaciones || '');
        form.append('paymentMethod', createInput.paymentMethod || 'OTHER');
        if (createInput.installments) form.append('installments', String(createInput.installments));
        form.append('comprobantePago', createInput.comprobantePago);
        await ordersApi.createForm(form);
      } else {
        await ordersApi.create(createInput);
      }

      clearCart();
      toast.success('Pago registrado. Tu pedido será confirmado en breve.');
      navigate('/catalogo');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo registrar el pedido. Intenta nuevamente.';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <motion.div
        className="checkout-empty"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24 }}
      >
        <div>
          <h1>Carrito vacío</h1>
          <p>No hay productos seleccionados para continuar con el checkout.</p>
          <Link to="/catalogo">Volver al catálogo</Link>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="checkout-page"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
    >
      <div className="checkout-hero">
        <Link className="checkout-back" to="/carrito">
          <ArrowLeft size={18} />
          Volver al carrito
        </Link>
        <div>
          <span className="checkout-eyebrow">Checkout protegido</span>
          <h1>Finalizar compra</h1>
          <p>
            Hola, {user?.email?.split('@')[0]}. Completa los datos de pago para confirmar tu pedido.
          </p>
        </div>
      </div>

      <div className="checkout-grid">
        <section className="checkout-panel">
          <div className="checkout-panel-header">
            <h2>Productos seleccionados</h2>
            <span>{totalItems} {totalItems === 1 ? 'producto' : 'productos'}</span>
          </div>

          <div className="checkout-items">
            {items.map((item) => (
              <article className="checkout-item" key={item.cartId}>
                <img
                  src={item.imagen || '/assets/images/placeholders/product.svg'}
                  alt={item.nombre}
                  loading="lazy"
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (!target.src.includes('placeholders')) {
                      target.src = '/assets/images/placeholders/product.svg';
                    }
                  }}
                />
                <div className="checkout-item-main">
                  <h3>{item.nombre}</h3>
                  <div className="checkout-item-meta">
                    {item.categoria && <span>{item.categoria}</span>}
                    {item.talla && <span>Talla: {item.talla}</span>}
                    {item.color && <span>Color: {item.color}</span>}
                    <span>Cantidad: {item.quantity}</span>
                  </div>
                </div>
                <strong>{formatCurrency(item.precio * item.quantity)}</strong>
              </article>
            ))}
          </div>
        </section>

        <aside className="checkout-panel checkout-summary">
          <h2>Resumen del pedido</h2>
          <div className="checkout-summary-row">
            <span>Subtotal</span>
            <strong>{formatCurrency(subtotal)}</strong>
          </div>
          {discount > 0 && (
            <div className="checkout-summary-row muted">
              <span>Descuento</span>
              <strong>-{formatCurrency(discount)}</strong>
            </div>
          )}
          <div className="checkout-summary-row muted">
            <span>{taxesLabel}</span>
            <strong>{formatCurrency(tax)}</strong>
          </div>
          <div className="checkout-summary-row muted">
            <span>Envío</span>
            <strong>{shipping === 0 ? 'Gratis' : formatCurrency(shipping)}</strong>
          </div>
          <div className="checkout-summary-total">
            <span>Total</span>
            <strong className="checkout-total-value">{formatCurrency(total)}</strong>
          </div>

          {/* Banking QR Code */}
          <div className="ch-field">
            <BankingQrCode amount={total} />
          </div>

{/* Payment type selector */}
          <div className="ch-field">
            <div className="ch-payment-label">
              <CreditCard size={16} strokeWidth={2.2} />
              Forma de pago *
            </div>
            <div className="ch-payment-grid">
              <button
                type="button"
                className={`ch-pay-card ${paymentType === 'immediate' ? 'active' : ''}`}
                onClick={() => handlePaymentTypeChange('immediate')}
              >
                <span className="ch-pay-badge">Pago inmediato</span>
                <p className="ch-pay-text">
                  Pago completo de tu pedido en una sola transacción.
                </p>
                <span className="ch-pay-total">
                  {formatCurrency(total)}
                </span>
              </button>

              {isTrustedCustomer && (
                <button
                  type="button"
                  className={`ch-pay-card ${paymentType === 'installments' ? 'active' : ''}`}
                  onClick={() => handlePaymentTypeChange('installments')}
                >
                  <span className="ch-pay-badge accent">
                    <BadgePercent size={13} /> Pago por abonos
                  </span>
                  <p className="ch-pay-text">
                    Divide el pago en cuotas cómodas adaptadas a tu presupuesto.
                  </p>
                  <span className="ch-pay-total accent">
                    desde {Math.round((total / 12) * 100) / 100}
                    <span className="ch-pay-total-sub"> /cuota</span>
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Installments block */}
          {paymentType === 'installments' && (
            <div className="ch-installments-block">
              <span className="ch-install-label">Selecciona número de cuotas</span>
              <div className="ch-install-dots">
                {installmentOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`ch-install-dot ${installments === n ? 'active' : ''}`}
                    onClick={() => setInstallments(n)}
                    aria-label={`${n} cuotas`}
                  >
                    <span className="ch-dot-num">{n}</span>
                    <span className="ch-dot-sub">cuotas</span>
                  </button>
                ))}
              </div>

              <div className="ch-install-summary">
                <div className="ch-install-summary-head">
                  <strong>Resumen de cuotas</strong>
                </div>
                <div className="ch-install-summary-row">
                  <span>Total del pedido</span>
                  <span>{formatCurrency(total)}</span>
                </div>
                <div className="ch-install-summary-row">
                  <span>Número de cuotas</span>
                  <span>{installments}</span>
                </div>
                <div className="ch-install-summary-row total">
                  <span>Valor por cuota</span>
                  <span>{formatCurrency(installmentValue)}</span>
                </div>
                <span className="ch-no-interest">Sin intereses</span>
              </div>
            </div>
          )}

           {/* Reference / personal note */}
           <div className="ch-field">
             <label className="ch-label">Referencia o nota personal (opcional)</label>
             <textarea
               className="ch-textarea"
               placeholder="Ej: referencias del producto, detalles adicionales, etc."
               value={referencia}
               onChange={(e) => setReferencia(e.target.value)}
               rows={3}
             />
           </div>

           {/* Proof upload */}
           <div className="ch-field">
            <label className="ch-label">Comprobante de Pago *</label>
            <div className="ch-upload-zone" onClick={handleUploadClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleUploadClick(); } }} role="button" tabIndex={0}>
              <Upload size={22} />
              <div>
                <p className="ch-upload-title">
                  {proofFile ? proofFile.name : 'Haz clic para subir tu comprobante'}
                </p>
                <p className="ch-upload-sub">PNG, JPG o JPEG (máx. 10MB)</p>
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg"
              className="ch-file-input"
              onChange={handleFileSelect}
            />
          </div>

          <div className="ch-notice">
            <strong>Nota:</strong>
            <span>
              Tu pago será verificado por un asesor en las próximas 24 horas. Si tienes dudas, no dudes en ponerte en contacto con nosotros.
            </span>
          </div>

          <div className="ch-actions">
            <button
              className="ch-btn-secondary"
              type="button"
              onClick={() => window.history.back()}
            >
              Cancelar
            </button>
            <button
              className="ch-btn-primary"
              type="button"
              onClick={handleConfirm}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Confirmando…' : 'Confirmar Pedido'}
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  );
};

export default CheckoutPage;
