import React from 'react';
import { CheckCircle2, XCircle, Clock, Package, Truck, CheckCircle, FileText } from 'lucide-react';
import { Badge } from '@/shared/ui/Badge';
import { ORDER_STATUS_COLORS, ESTADOS_PEDIDO_PERMITIDOS } from '@/shared/constants/options';
import styles from './OrderStatusSelector.module.css';

interface OrderStatusSelectorProps {
  currentStatus: string;
  selectedStatus: string;
  onSelectedStatusChange: (status: string) => void;
  disabled?: boolean;
}

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; label: string; description: string }> = {
  Pendiente: {
    icon: <Clock size={18} />,
    label: 'Pendiente',
    description: 'El pedido está en espera de revisión'
  },
  Aceptado: {
    icon: <CheckCircle2 size={18} />,
    label: 'Aceptado',
    description: 'El pedido ha sido aprobado y está listo para procesar'
  },
  'En validación': {
    icon: <Clock size={18} />,
    label: 'En validación',
    description: 'El comprobante de pago está en validación'
  },
  'Recibo generado': {
    icon: <FileText size={18} />,
    label: 'Recibo generado',
    description: 'El recibo ha sido generado'
  },
  'Recibo enviado': {
    icon: <FileText size={18} />,
    label: 'Recibo enviado',
    description: 'El recibo ha sido enviado al cliente'
  },
  Listo: {
    icon: <Package size={18} />,
    label: 'Listo',
    description: 'El pedido está listo para enviar'
  },
  Enviado: {
    icon: <Truck size={18} />,
    label: 'Enviado',
    description: 'El pedido ha sido despachado'
  },
  Entregado: {
    icon: <CheckCircle size={18} />,
    label: 'Entregado',
    description: 'El pedido fue entregado exitosamente'
  },
  Rechazado: {
    icon: <XCircle size={18} />,
    label: 'Rechazado',
    description: 'El pedido fue rechazado'
  },
  Cancelado: {
    icon: <XCircle size={18} />,
    label: 'Cancelado',
    description: 'El pedido ha sido cancelado'
  },
};

export const OrderStatusSelector: React.FC<OrderStatusSelectorProps> = ({
  currentStatus,
  selectedStatus,
  onSelectedStatusChange,
  disabled = false
}) => {
  const allowedTransitions = (ESTADOS_PEDIDO_PERMITIDOS as Record<string, string[]>)[currentStatus] || [];
  const currentConfig = STATUS_CONFIG[currentStatus];

  if (allowedTransitions.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.currentStatus}>
          <span className={styles.label}>Estado actual</span>
          <Badge variant={ORDER_STATUS_COLORS[currentStatus] ?? 'default'}>
            {currentConfig?.icon}
            {currentConfig?.label}
          </Badge>
        </div>
        <div className={styles.noTransitions}>
          <p className={styles.noTransitionsText}>
            Este pedido no puede cambiar de estado desde &quot;{currentStatus}&quot;.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.currentStatus}>
        <span className={styles.label}>Estado actual</span>
        <Badge variant={ORDER_STATUS_COLORS[currentStatus] ?? 'default'}>
          {currentConfig?.icon}
          {currentConfig?.label}
        </Badge>
      </div>

      <div className={styles.section}>
        <span className={styles.sectionLabel}>Seleccionar nuevo estado</span>
        <div className={styles.grid}>
          {allowedTransitions.map((status: string) => {
            const config = STATUS_CONFIG[status];
            const isSelected = selectedStatus === status;

            return (
              <button
                key={status}
                type="button"
                role="option"
                aria-selected={isSelected}
                disabled={disabled}
                className={`${styles.option} ${isSelected ? styles.optionSelected : ''}`}
                onClick={() => onSelectedStatusChange(status)}
              >
                <span className={styles.optionContent}>
                  <span className={styles.optionIcon}>{config.icon}</span>
                  <span className={styles.optionText}>
                    <span className={styles.optionLabel}>{config.label}</span>
                    <span className={styles.optionDescription}>{config.description}</span>
                  </span>
                </span>
                {isSelected && (
                  <CheckCircle2 size={20} className={styles.checkIcon} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
