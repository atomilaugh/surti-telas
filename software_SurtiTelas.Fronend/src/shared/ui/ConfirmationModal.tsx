import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/shared/utils';
import { Button } from './Button';
import styles from './ConfirmationModal.module.css';

type ConfirmationVariant = 'default' | 'danger' | 'success';

interface ConfirmationModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: ConfirmationVariant;
  icon?: LucideIcon;
  loading?: boolean;
  warning?: string;
  confirmLeftIcon?: React.ReactNode;
}

const iconMap: Record<ConfirmationVariant, LucideIcon> = {
  default: Info,
  danger: AlertTriangle,
  success: CheckCircle2,
};

const variantIconClassMap: Record<ConfirmationVariant, string> = {
  default: styles.iconWrapperDefault,
  danger: styles.iconWrapperDanger,
  success: styles.iconWrapperSuccess,
};

export const ConfirmationModal = ({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  icon,
  loading = false,
  warning,
  confirmLeftIcon,
}: ConfirmationModalProps) => {
  if (!open) return null;

  const Icon = icon ?? iconMap[variant];
  const iconClassName = cn(styles.iconWrapper, variantIconClassMap[variant]);

  return (
    <div
      className={styles.overlay}
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <section
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        aria-describedby={
          description ? 'confirmation-modal-description' : undefined
        }
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div className={iconClassName} aria-hidden="true">
            <Icon size={22} strokeWidth={2} />
          </div>
          <div className={styles.headerText}>
            <h2 id="confirmation-modal-title" className={styles.title}>
              {title}
            </h2>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            disabled={loading}
            aria-label="Cerrar"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </header>

        <div className={styles.body}>
          {description && (
            <p
              id="confirmation-modal-description"
              className={styles.description}
            >
              {description}
            </p>
          )}
          {warning && (
            <div className={styles.warning}>
              <AlertTriangle size={14} strokeWidth={2} />
              <span>{warning}</span>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={loading}
            className={styles.cancelButton}
          >
            {cancelLabel}
          </Button>

          <Button
            type="button"
            variant={variant === 'success' ? 'success' : variant === 'default' ? 'primary' : 'danger'}
            size="md"
            onClick={onConfirm}
            loading={loading}
            disabled={loading}
            leftIcon={confirmLeftIcon}
            className={styles.confirmButton}
          >
            {confirmLabel}
          </Button>
        </footer>
      </section>
    </div>
  );
};
