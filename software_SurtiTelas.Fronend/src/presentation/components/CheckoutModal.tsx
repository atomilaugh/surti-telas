import React, { useMemo, useRef, useState, useEffect } from 'react'
import { X, Upload, CreditCard, BadgePercent, ShieldCheck, Info } from 'lucide-react'
import { toast } from 'sonner'
import { useCart, useAuth } from '@/app/providers/AppProviders'
import { useClientes } from '@/core/stores'
import { ordersApi } from '@/infrastructure/api/ordersApi'
import { paymentsApi } from '@/infrastructure/api/paymentsApi'
import { customersApi } from '@/infrastructure/api/customersApi'
import { AuthRequiredModal } from './AuthRequiredModal'
import { BankingQrCode } from './BankingQrCode'
import { appContent } from '@/shared/config/appContent'
import './CheckoutModal.css'

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
}

type PaymentMode = 'immediate' | 'installments'

const currencyCOP = (value: number): string =>
  value.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })

const installmentOptions = [1, 2, 3, 6, 12]

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose }) => {
  const { subtotal, discount, tax, shipping, total, clearCart, items } = useCart()
  const { isAuthenticated, user } = useAuth();
  const { clientes } = useClientes();
  const [proofFile, setProofFile] = useState<File | null>(null)
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('immediate')
  const [installments, setInstallments] = useState<number>(1)
  const [abonoInicial, setAbonoInicial] = useState<number>(0)
  const [pagoAhora, setPagoAhora] = useState<boolean>(true)
  const [referencia, setReferencia] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [paymentResult, setPaymentResult] = useState<'success' | 'error' | null>(null)
  const [isTrustedCustomer, setIsTrustedCustomer] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const minAbonoInicial = Math.ceil(total * 0.3)

  const clienteActual = useMemo(() => {
    if (!user?.email) return null;
    return clientes.find(c => c.email === user.email || c.nombre === user.name || c.nombre === user.email) || null;
  }, [user?.email, user?.name, clientes]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    (async () => {
      try {
        const { isTrustedCustomer: trusted } = await customersApi.getTrustedStatus();
        if (!cancelled) {
          setIsTrustedCustomer(!!trusted);
          if (!trusted) {
            setPaymentMode('immediate');
          }
        }
      } catch {
        if (!cancelled) setIsTrustedCustomer(clienteActual?.isTrustedCustomer ?? false);
      }
    })();
    return () => { cancelled = true };
  }, [isOpen, clienteActual?.isTrustedCustomer]);

  // Reset del flujo cuando se cierra o se abre el modal.
  useEffect(() => {
    if (!isOpen) {
      setPaymentMode('immediate');
      setInstallments(1);
      setAbonoInicial(0);
      setPagoAhora(true);
      setProofFile(null);
      setReferencia('');
      setPaymentResult(null);
    }
  }, [isOpen]);

  const handlePaymentModeChange = (mode: PaymentMode) => {
    if (mode === 'installments' && !isTrustedCustomer) return;
    setPaymentMode(mode);
    if (mode === 'immediate') {
      // Pago inmediato: el saldo a financiar es 0 → no requiere selección de cuotas.
      setAbonoInicial(0);
      setInstallments(1);
    } else if (abonoInicial === 0 && total > 0) {
      // El abono inicial debe cubrir como mínimo el 30% del pedido.
      setAbonoInicial(minAbonoInicial);
    }
  }

  const saldoPendiente = useMemo(() => {
    if (paymentMode !== 'installments') return 0;
    const safeAbono = Math.max(0, Math.min(abonoInicial, total));
    return Math.max(0, total - safeAbono);
  }, [paymentMode, abonoInicial, total]);

  const installmentValue = useMemo(() => {
    if (saldoPendiente <= 0) return 0;
    const safeCount = Math.max(1, installments);
    return Math.round((saldoPendiente / safeCount) * 100) / 100;
  }, [saldoPendiente, installments]);

  const taxesLabel = useMemo(() => `IVA 19%`, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    if (!file) {
      setProofFile(null)
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El comprobante no puede superar 10 MB.')
      setProofFile(null)
      event.target.value = ''
      return
    }

    setProofFile(file)
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const requiresProof = !isTrustedCustomer || pagoAhora
  const showInstallmentDetails = isTrustedCustomer && paymentMode === 'installments'
  const hasSaldo = showInstallmentDetails && saldoPendiente > 0
  const isAbonoValid = !pagoAhora || paymentMode !== 'installments'
    || (abonoInicial >= minAbonoInicial && abonoInicial <= total && Number.isFinite(abonoInicial))

  const handleConfirm = async () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      toast.warning('Necesitas una cuenta para finalizar la compra.');
      return;
    }

    if (items.length === 0) {
      toast.error('No hay productos en el carrito.')
      onClose()
      return
    }

    if (!isAbonoValid) {
      toast.error(`El abono debe ser como mínimo el 30% del pedido (${currencyCOP(minAbonoInicial)}) y no superar el total.`)
      return
    }

    if (requiresProof && !proofFile) {
      toast.error('Adjunta el comprobante de pago para confirmar el pedido.')
      return
    }

    setIsSubmitting(true)
    try {
      const totalCarrito = items.reduce((sum, item) => sum + item.precio * item.quantity, 0);
      if (totalCarrito <= 0) {
        toast.error('El total del pedido no es válido.');
        setIsSubmitting(false);
        return;
      }

      const itemsList = items.map((item) => ({
        productId: item.productId || undefined,
        nombre: item.nombre,
        precio: item.precio,
        cantidad: item.quantity,
      }));

      const validItemsList = itemsList.filter(it => it.nombre.trim() && it.cantidad > 0 && it.precio >= 0);
      if (validItemsList.length === 0) {
        toast.error('No hay productos válidos para registrar el pedido.');
        setIsSubmitting(false);
        return;
      }

      const bk = appContent.checkout.bankingKey;
      const observationLines: Array<string | null> = [
        `Banco: ${bk.bankName}`,
        `Cuenta: ${bk.accountNumber}`,
        `Beneficiario: ${bk.beneficiary}`,
      ];

      if (paymentMode === 'immediate') {
        observationLines.push('Modalidad: Pago inmediato');
        observationLines.push(`Pago ahora: ${pagoAhora ? 'Sí' : 'No'}`);
      } else {
        observationLines.push('Modalidad: Pago por abono');
        observationLines.push(`Abono inicial: ${currencyCOP(abonoInicial)}`);
        observationLines.push(`Saldo pendiente: ${currencyCOP(saldoPendiente)}`);
        observationLines.push(`Cuotas saldo: ${saldoPendiente > 0 ? installments : 0}`);
        if (saldoPendiente > 0) {
          observationLines.push(`Valor por cuota: ${currencyCOP(installmentValue)}`);
        }
        observationLines.push(`Pago ahora: ${pagoAhora ? 'Sí' : 'No'}`);
      }

      if (clienteActual?.asesorId) observationLines.push(`Asesor: ${clienteActual.asesorId}`);
      if (referencia.trim()) observationLines.push(`Referencia: ${referencia.trim()}`);

      const observaciones = observationLines.filter(Boolean).join(' | ');

      // Sólo se envía el comprobante si el cliente declara que está pagando ahora.
      const shouldSendProof = pagoAhora && !!proofFile;
      const backendPaymentMethod: 'TRANSFER' | 'INSTALLMENTS' =
        paymentMode === 'installments' ? 'INSTALLMENTS' : 'TRANSFER';
      const backendInstallments = paymentMode === 'installments' && saldoPendiente > 0
        ? installments
        : undefined;

      let createdOrderId: string;
      if (shouldSendProof && proofFile) {
        const form = new FormData();
        if (clienteActual?.id) form.append('clienteId', clienteActual.id);
        if (clienteActual?.asesorId) form.append('asesorId', clienteActual.asesorId);
        form.append('itemsList', JSON.stringify(validItemsList));
        form.append('prioridad', 'Estándar');
        form.append('observaciones', observaciones);
        form.append('paymentMethod', backendPaymentMethod);
        if (backendInstallments) form.append('installments', String(backendInstallments));
        if (paymentMode === 'installments') {
          form.append('diasCredito', '0');
        }
        form.append('comprobantePago', proofFile);
        const created = await ordersApi.createForm(form);
        createdOrderId = created.id;
      } else {
        const created = await ordersApi.create({
          clienteId: clienteActual?.id,
          asesorId: clienteActual?.asesorId,
          itemsList: validItemsList,
          prioridad: 'Estándar',
          observaciones,
          paymentMethod: backendPaymentMethod,
          installments: backendInstallments,
        });
        createdOrderId = created.id;
      }

      // Regla 1 VENTA = 1 PAGO CONFIRMADO:
      // Tras crear el pedido, registramos un Payment explícito que será
      // confirmado por el asesor/admin. El PaymentApprovedSubscriber creará
      // la venta en cuanto el pago pase a APPROVED.
      //
      // - Pago inmediato + pagoAhora: monto = total, tipoPago=PAGO_INMEDIATO.
      // - Pago por abono + pagoAhora: monto = abonoInicial, tipoPago=ABONO_INICIAL.
      // - Pago por abono + "pagar después": no creamos Payment aquí; el cliente
      //   pagará después y cada cuota generará su propio Payment.
      const shouldCreateInitialPayment = pagoAhora
        && (paymentMode === 'immediate' || (paymentMode === 'installments' && isAbonoValid));

      if (shouldCreateInitialPayment && clienteActual?.id) {
        const initialAmount = paymentMode === 'immediate'
          ? total
          : Math.max(0, Math.min(abonoInicial, total));
        const tipoPago: 'PAGO_INMEDIATO' | 'ABONO_INICIAL' = paymentMode === 'immediate'
          ? 'PAGO_INMEDIATO'
          : 'ABONO_INICIAL';
        const totalCuotas = paymentMode === 'installments' && saldoPendiente > 0 ? installments : 1;

        try {
          const payment = await paymentsApi.create({
            orderId: createdOrderId,
            customerId: clienteActual.id,
            asesorId: clienteActual.asesorId,
            amount: initialAmount,
            method: 'Transferencia',
            reference: referencia.trim() || undefined,
            notes: observaciones,
            // Metadatos que el PaymentApprovedSubscriber usa al crear la venta.
            tipoPago,
            numeroCuota: 1,
            totalCuotas,
            esAnticipo: paymentMode === 'installments',
            esSaldo: false,
          } as unknown as Parameters<typeof paymentsApi.create>[0]);
          if (payment?.id) {
            toast.success('Pedido y pago inicial registrados. Un asesor confirmará tu pago.');
          }
        } catch (payErr) {
          // No fallamos el flujo principal si el pago no se registra;
          // el admin puede registrarlo manualmente desde Gestión de Pagos.
          console.error('No se pudo registrar el pago inicial:', payErr);
          toast.warning('Pedido registrado. El pago inicial deberá ser confirmado por un asesor.');
        }
      }

      clearCart();
      setPaymentResult('success');
      toast.success('Pago registrado. Tu pedido será confirmado en breve.');
      setTimeout(() => { onClose(); setPaymentResult(null); }, 2500);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : '';
      if (errMsg.includes('422') || errMsg.includes('Error de validación')) {
        toast.error('Error en los datos del pedido. Verifica que tu información esté completa e intenta de nuevo.');
      } else if (errMsg.includes('cupo disponible')) {
        toast.error('Tu cliente no tiene cupo disponible. Contacta a tu asesor para actualizar tu límite de crédito.');
      } else if (errMsg.includes('Solo los clientes de confianza')) {
        toast.error('Esta modalidad de pago solo está disponible para clientes de confianza.');
      } else if (errMsg.includes('network_error') || errMsg.includes('No se pudo conectar')) {
        toast.error('No se pudo conectar con el servidor. Verifica tu conexión e intenta de nuevo.');
      } else {
        toast.error(errMsg || 'No se pudo registrar el pedido. Intenta nuevamente.');
      }
      setPaymentResult('error');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="ch-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Finalizar compra"
    >
      <div
        className="ch-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="ch-close-btn"
          type="button"
          onClick={onClose}
          aria-label="Cerrar modal"
        >
          <X size={18} />
        </button>

        {/* Header */}
        <div className="ch-header">
          {paymentResult === 'success' ? (
            <>
              <h2 className="ch-title" style={{ color: '#16a34a' }}>¡Compra Realizada!</h2>
              <p className="ch-subtitle">Tu pedido ha sido Registrado correctamente.</p>
            </>
          ) : paymentResult === 'error' ? (
            <>
              <h2 className="ch-title" style={{ color: '#dc2626' }}>Error al Registrar el Pago</h2>
              <p className="ch-subtitle">No se pudo procesar tu pedido. Intenta de nuevo.</p>
            </>
          ) : (
            <>
              <h2 className="ch-title">Finalizar Compra</h2>
              <p className="ch-subtitle">Completa los datos de pago para confirmar tu pedido.</p>
            </>
          )}
        </div>

        {/* Body */}
        <div className={`ch-body ${paymentResult ? 'ch-body--centered' : ''}`}>
          {paymentResult === 'success' ? (
            <div className="ch-success-screen">
              <div className="ch-success-icon" role="img" aria-label="Pedido registrado correctamente">
                <svg
                  className="ch-success-check"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>

              <h3 className="ch-success-title">
                Pedido registrado
                <span>exitosamente</span>
              </h3>

              <p className="ch-success-message">
                Tu pedido fue recibido correctamente. Un asesor revisará la información y se comunicará contigo dentro de las próximas 24 horas para confirmar tu pago.
              </p>

              <aside className="ch-next-step" aria-label="Próximo paso">
                <span className="ch-next-step-icon" aria-hidden="true">
                  <Info size={14} strokeWidth={2.2} />
                </span>
                <div className="ch-next-step-text">
                  <strong>¿Qué sigue?</strong>
                  <span>Un asesor revisará tu pedido y confirmará tu pago en las próximas 24 horas.</span>
                </div>
              </aside>

              <button
                type="button"
                className="ch-btn-primary ch-btn-primary--success-close"
                onClick={onClose}
                autoFocus
              >
                Cerrar
              </button>
            </div>
          ) : paymentResult === 'error' ? (
            <div className="ch-error-screen">
              <div className="ch-error-icon">✕</div>
              <p className="ch-error-text">Ocurrió un error al registrar tu pedido.</p>
              <p className="ch-error-hint">Puedes intentar nuevamente o contactar a tu asesor.</p>
              <div className="ch-actions">
                <button className="ch-btn-primary" onClick={() => setPaymentResult(null)}>Intentar de Nuevo</button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary */}
              <aside className="ch-summary-card">
                <div className="ch-summary-top">
                  <h3 className="ch-section-title">Resumen del Pedido</h3>
                  <span className="ch-items-count">{items.length} {items.length === 1 ? 'producto' : 'productos'}</span>
                </div>

                <ul className="ch-summary-list">
                  <li className="ch-summary-row">
                    <span>Subtotal</span>
                    <strong>{subtotal.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>
                  </li>
                  {discount > 0 && (
                    <li className="ch-summary-row muted">
                      <span>Descuento</span>
                      <strong>-{discount.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>
                    </li>
                  )}
                  <li className="ch-summary-row muted">
                    <span>{taxesLabel}</span>
                    <strong>{tax.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>
                  </li>
                  <li className="ch-summary-row muted">
                    <span>Envío</span>
                    <strong>{shipping === 0 ? 'Gratis' : shipping.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}</strong>
                  </li>
                </ul>

                <div className="ch-summary-spacer" />

                <div className="ch-divider" />

                <div className="ch-summary-footer">
                  <div className="ch-summary-row ch-total-row">
                    <span>Total</span>
                    <strong className="ch-total-value">
                      {total.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}
                    </strong>
                  </div>

                  <div className="ch-trust-badges">
                    {appContent.checkout.trustBadges.map((item) => (
                      <div className="ch-trust-item" key={item.label}>
                        <ShieldCheck size={14} strokeWidth={2} />
                        <span>{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Form */}
              <section className="ch-form-card">
                {/* 1. Datos bancarios */}
                <div className="ch-field">
                  <h3 className="ch-section-title">Transfiere a nuestra cuenta bancaria</h3>
                  <BankingQrCode amount={total} />
                  <p className="ch-bank-hint">
                    <Info size={14} strokeWidth={2} />
                    Escanea el código QR o realiza la transferencia desde tu aplicación bancaria usando los datos mostrados.
                  </p>
                </div>

                {/* 2. Forma de pago */}
                <div className={`ch-field ${isTrustedCustomer ? '' : 'ch-field--centered'}`}>
                  <div className="ch-payment-label">
                    <CreditCard size={16} strokeWidth={2.2} />
                    {isTrustedCustomer ? '¿Cómo deseas realizar el pago?' : 'Forma de pago *'}
                  </div>
                  <div className={`ch-payment-grid ${isTrustedCustomer ? '' : 'ch-payment-grid--single'}`}>
                    <button
                      type="button"
                      className={`ch-pay-card ${paymentMode === 'immediate' ? 'active' : ''}`}
                      onClick={() => handlePaymentModeChange('immediate')}
                      aria-pressed={paymentMode === 'immediate'}
                    >
                      <span className="ch-pay-badge">Pago inmediato</span>
                      <p className="ch-pay-text">
                        Pagas el 100% de tu pedido ahora.
                      </p>
                      <span className="ch-pay-total">
                        {currencyCOP(total)}
                      </span>
                    </button>

                    {isTrustedCustomer && (
                      <button
                        type="button"
                        className={`ch-pay-card ${paymentMode === 'installments' ? 'active' : ''}`}
                        onClick={() => handlePaymentModeChange('installments')}
                        aria-pressed={paymentMode === 'installments'}
                      >
                        <span className="ch-pay-badge accent">
                          <BadgePercent size={13} /> Pago por abono
                        </span>
                        <p className="ch-pay-text">
                          Realiza un abono y paga el saldo restante en cuotas.
                        </p>
                        <span className="ch-pay-total accent">
                          desde {currencyCOP(Math.round((total / 12) * 100) / 100)}
                          <span className="ch-pay-total-sub"> /cuota</span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. ¿Pago ahora? (solo clientes de confianza) */}
                {isTrustedCustomer && (
                  <div className="ch-field">
                    <div className="ch-payment-label">
                      ¿Deseas realizar un pago ahora?
                    </div>
                    <div className="ch-payment-grid">
                      <button
                        type="button"
                        className={`ch-pay-card ${pagoAhora ? 'active' : ''}`}
                        onClick={() => {
                          setPagoAhora(true);
                          if (abonoInicial === 0) setAbonoInicial(minAbonoInicial);
                        }}
                        aria-pressed={pagoAhora}
                      >
                        <span className="ch-pay-badge">Sí, realizar pago ahora</span>
                        <p className="ch-pay-text">
                          Realiza el pago y adjunta el comprobante.
                        </p>
                      </button>
                      <button
                        type="button"
                        className={`ch-pay-card ${!pagoAhora ? 'active' : ''}`}
                        onClick={() => {
                          setPagoAhora(false);
                          setAbonoInicial(0);
                        }}
                        aria-pressed={!pagoAhora}
                      >
                        <span className="ch-pay-badge accent">No, pagar después</span>
                        <p className="ch-pay-text">
                          Tu pedido quedará registrado y podrás realizar el pago más adelante.
                        </p>
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Abono, saldo y cuotas (solo cliente de confianza con saldo pendiente) */}
                {showInstallmentDetails && (
                  <div className="ch-installments-block">
                    {pagoAhora && (
                      <>
                        {/* === Paso 1: Abono inicial === */}
                        <div className="ch-field">
                          <label className="ch-label" htmlFor="ch-abono-input">
                            ¿Cuánto deseas abonar ahora?
                          </label>
                          <p className="ch-field-help">
                            El abono mínimo corresponde al 30% del pedido: <strong>{currencyCOP(minAbonoInicial)}</strong>.
                          </p>
                          <div className="ch-abono-input-wrap">
                            <span className="ch-abono-currency">$</span>
                            <input
                              id="ch-abono-input"
                              type="number"
                              className="ch-abono-input"
                              min={minAbonoInicial}
                              max={total}
                              step={1000}
                              value={abonoInicial || ''}
                              onChange={(e) => {
                                const parsed = Number(e.target.value);
                                setAbonoInicial(Number.isFinite(parsed) ? parsed : 0);
                              }}
                              placeholder="0"
                              inputMode="numeric"
                            />
                          </div>
                          {!isAbonoValid && (
                            <span className="ch-field-error">
                              El abono debe ser como mínimo el 30% del pedido ({currencyCOP(minAbonoInicial)}) y no superar el total.
                            </span>
                          )}
                        </div>

                        {/* === Paso 2: Resumen del pago (destaca el saldo pendiente) === */}
                        <div className="ch-install-summary">
                          <div className="ch-install-summary-head">
                            <strong>Resumen del pago</strong>
                          </div>
                          <div className="ch-install-summary-row">
                            <span>Total del pedido</span>
                            <span>{currencyCOP(total)}</span>
                          </div>
                          <div className="ch-install-summary-row">
                            <span>Abono inicial</span>
                            <span>{currencyCOP(Math.max(0, Math.min(abonoInicial, total)))}</span>
                          </div>
                          <div className="ch-install-summary-row total ch-install-summary-row--saldo">
                            <span>Saldo pendiente</span>
                            <span>{currencyCOP(saldoPendiente)}</span>
                          </div>
                        </div>
                      </>
                    )}

                    {/* === Paso 3: Selección de cuotas (subordinada al saldo) === */}
                    {hasSaldo && (
                      <div className="ch-install-quotas-subblock">
                        <span className="ch-install-label">
                          ¿En cuántas cuotas deseas pagar el <strong>saldo</strong>?
                        </span>
                        <p className="ch-install-help">
                          Las cuotas se aplican únicamente al saldo pendiente de {currencyCOP(saldoPendiente)}.
                        </p>
                        <div className="ch-install-dots">
                          {installmentOptions.map((n) => (
                            <button
                              key={n}
                              type="button"
                              className={`ch-install-dot ${installments === n ? 'active' : ''}`}
                              onClick={() => setInstallments(n)}
                              aria-label={`${n} ${n === 1 ? 'cuota' : 'cuotas'}`}
                              aria-pressed={installments === n}
                            >
                              <span className="ch-dot-num">{n}</span>
                              <span className="ch-dot-sub">{n === 1 ? 'cuota' : 'cuotas'}</span>
                            </button>
                          ))}
                        </div>

                        {/* === Paso 4: Resumen de cuotas (subordinado, derivado) === */}
                        <div className="ch-install-summary ch-install-summary--derived">
                          <div className="ch-install-summary-head">
                            <strong>Resumen de cuotas</strong>
                            <span className="ch-no-interest">Sin intereses</span>
                          </div>
                          <div className="ch-install-summary-row">
                            <span>Saldo pendiente</span>
                            <span>{currencyCOP(saldoPendiente)}</span>
                          </div>
                          <div className="ch-install-summary-row">
                            <span>Número de cuotas</span>
                            <span>{installments}</span>
                          </div>
                          <div className="ch-install-summary-row total ch-install-summary-row--valor">
                            <span>Valor por cuota</span>
                            <span>{currencyCOP(installmentValue)}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 5. Información adicional */}
                <div className="ch-field">
                  <h3 className="ch-section-title">Información adicional</h3>
                  <p className="ch-field-help">
                    Si necesitas indicarnos algo sobre la entrega o el pedido, usa los campos opcionales de abajo.
                  </p>
                </div>

                {/* 6. Referencia o nota personal */}
                <div className="ch-field">
                  <label className="ch-label" htmlFor="ch-referencia">
                    Referencia o nota personal (opcional)
                  </label>
                  <textarea
                    id="ch-referencia"
                    className="ch-textarea"
                    placeholder="Ej: referencias del producto, detalles adicionales, etc."
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* 7. Comprobante (obligatorio si está pagando ahora; los clientes estándar siempre pagan ahora) */}
                {requiresProof && (
                  <div className="ch-field">
                    <label className="ch-label" htmlFor="ch-proof">
                      Comprobante de pago *
                    </label>
                    <div className="ch-upload-zone" onClick={handleUploadClick} role="button" tabIndex={0}>
                      <Upload size={22} />
                      <div>
                        <p className="ch-upload-title">
                          {proofFile ? proofFile.name : 'Haz clic para subir tu comprobante'}
                        </p>
                        <p className="ch-upload-sub">PNG, JPG o JPEG (máx. 10MB)</p>
                      </div>
                    </div>
                    <input
                      id="ch-proof"
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      className="ch-file-input"
                      onChange={handleFileSelect}
                    />
                    {proofFile && (
                      <div className="ch-proof-preview">
                        <img
                          src={URL.createObjectURL(proofFile)}
                          alt="Vista previa del comprobante"
                          className="ch-proof-img"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Notice */}
                <div className="ch-notice">
                  <strong>Nota:</strong>
                  <span>
                    Tu pago será verificado por un asesor en las proximas 24 horas. Si tienes dudas, no dudes en ponerte en contacto con nosotros.
                  </span>
                </div>

                {/* Actions */}
                <div className="ch-actions">
                  <button
                    className="ch-btn-secondary"
                    type="button"
                    onClick={onClose}
                  >
                    Cancelar
                  </button>
                  <button
                    className="ch-btn-primary"
                    type="button"
                    onClick={handleConfirm}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Procesando…' : 'Confirmar pedido'}
                  </button>
                </div>
              </section>
            </>
          )}
        </div>

        {showAuthModal && (
          <AuthRequiredModal
            open={showAuthModal}
            onOpenChange={setShowAuthModal}
            onContinueShopping={() => setShowAuthModal(false)}
          />
        )}
      </div>
    </div>
  )
}