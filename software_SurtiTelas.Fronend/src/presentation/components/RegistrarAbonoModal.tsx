import React, { useEffect, useState } from 'react';
import { DollarSign } from 'lucide-react';
import { toast } from 'sonner';
import f from '@/styles/Form.module.css';
import { Modal } from '@/shared/ui/Modal';
import { ModalFooter } from '@/shared/ui/ModalFooter';
import { paymentsApi } from '@/infrastructure/api/paymentsApi';
import { parseCurrency } from '@/shared/utils/number';

export interface RegistrarAbonoModalProps {
  open: boolean;
  onClose: () => void;
  cliente: string;
  numeroFactura: string;
  orderId: string;
  customerId: string;
  asesorId?: string;
  saldo: number;
  total: number;
  esPrimerAbono: boolean;
  canCreatePayments: boolean;
  onSuccess: () => void;
}

const formatCurrency = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(valor);

export const RegistrarAbonoModal: React.FC<RegistrarAbonoModalProps> = ({
  open,
  onClose,
  cliente,
  numeroFactura,
  orderId,
  customerId,
  asesorId,
  saldo,
  total,
  esPrimerAbono,
  canCreatePayments,
  onSuccess,
}) => {
  const [valor, setValor] = useState('');
  const [metodo, setMetodo] = useState<'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'Credito'>('Transferencia');
  const [concepto, setConcepto] = useState('');
  const [fecha, setFecha] = useState('');

  useEffect(() => {
    if (open) {
      setValor('');
      setMetodo('Transferencia');
      setConcepto('');
      setFecha(new Date().toISOString().split('T')[0]);
    }
  }, [open]);

  const handleGuardar = async () => {
    if (!canCreatePayments) return;
    if (!valor) return;
    const valorNum = parseCurrency(valor);
    if (!Number.isFinite(valorNum) || valorNum <= 0 || valorNum > saldo) {
      toast.error(`El valor del abono debe ser mayor a 0 y menor o igual al saldo pendiente (${formatCurrency(saldo)})`);
      return;
    }
    if (esPrimerAbono) {
      const minimo = total * 0.3;
      if (valorNum < minimo) {
        toast.error('El abono mínimo permitido es del 30%.');
        return;
      }
    }
    try {
      const payment = await paymentsApi.create({
        orderId,
        customerId,
        asesorId: asesorId || undefined,
        amount: valorNum,
        method: metodo,
        reference: concepto,
        notes: `Abono factura ${numeroFactura}`,
        tipoPago: esPrimerAbono ? 'ABONO_INICIAL' : 'PAGO_SALDO',
      });
      await paymentsApi.updateStatus(payment.id, 'Aprobado');
      toast.success(`Abono de ${formatCurrency(valorNum)} registrado para factura ${numeroFactura}`);
      onSuccess();
      onClose();
    } catch {
      toast.error('No se pudo registrar el abono');
    }
  };

  const handlePagoDespues = () => {
    onClose();
    toast.info('Pago diferido. El abono se registrará cuando el cliente realice el pago.');
  };

  const handleClose = () => onClose();

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={esPrimerAbono ? "Primer abono" : "Abono posterior"}
      size="md"
      variant="form"
    >
      <div className={f.form}>
        <div className={f.formSection}>
          <h3 className={f.sectionTitle}>Información de la factura</h3>
          <div className={f.formRow}>
            <div className={f.field}>
              <label className={f.label}>Cliente</label>
              <input type="text" className={f.input} value={cliente} readOnly />
            </div>
            <div className={f.field}>
              <label className={f.label}>Pedido / Cotización</label>
              <input type="text" className={f.input} value={numeroFactura} readOnly />
            </div>
          </div>
          <div className={f.formRow}>
            <div className={f.field}>
              <label className={f.label}>Saldo pendiente</label>
              <input type="text" className={f.input} value={formatCurrency(saldo)} readOnly />
            </div>
            <div className={f.field}>
              <label className={f.label}>Método de pago</label>
              <select
                className={f.select}
                value={metodo}
                onChange={e => setMetodo(e.target.value as 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Otro' | 'Credito')}
              >
                <option value="Efectivo">Efectivo</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Credito">Crédito</option>
              </select>
            </div>
          </div>
        </div>

        <div className={f.formSection}>
          <h3 className={f.sectionTitle}>Detalle del abono</h3>
          <div className={f.formRow}>
            <div className={f.field}>
              <label className={f.label}>Valor del abono *</label>
              <input
                type="text"
                inputMode="numeric"
                className={f.input}
                value={valor}
                onChange={e => setValor(e.target.value)}
                placeholder={formatCurrency(saldo)}
              />
            </div>
            <div className={f.field}>
              <label className={f.label}>Fecha</label>
              <input
                type="date"
                className={f.input}
                value={fecha}
                onChange={e => setFecha(e.target.value)}
              />
            </div>
          </div>
          <div className={f.formRow}>
            <div className={f.field}>
              <label className={f.label}>Concepto / Observación</label>
              <input
                type="text"
                className={f.input}
                value={concepto}
                onChange={e => setConcepto(e.target.value)}
                placeholder="Ej: Abono cuota 2/3"
              />
            </div>
          </div>
        </div>

        <div className={f.formActions}>
          <ModalFooter
            actions={[
              { label: 'Cancelar', variant: 'secondary', onClick: handleClose },
              { label: 'Pagar después', variant: 'secondary', onClick: handlePagoDespues },
              { label: 'Guardar abono', onClick: handleGuardar, leftIcon: <DollarSign size={16} /> },
            ]}
          />
        </div>
      </div>
    </Modal>
  );
};
