import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import styles from './CustomOrderFormModal.module.css';

interface CustomOrderFormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  step: number;
  steps: string[];
  onStepChange: (step: number) => void;
  onBack: () => void;
  onSubmit: () => void;
  saving: boolean;
  isEditing: boolean;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  onValidateStep?: (step: number) => boolean;
}

export function CustomOrderFormModal({
  open,
  onClose,
  title,
  step,
  steps,
  onStepChange,
  onBack,
  onSubmit,
  saving,
  isEditing,
  children,
  footerActions,
  onValidateStep,
}: CustomOrderFormModalProps) {
  const isLastStep = step === steps.length;
  const currentStepLabel = steps[step - 1] ?? '';
  const progressPercent = (step / steps.length) * 100;

  const getStepStatus = (stepIndex: number) => {
    if (stepIndex + 1 < step) return 'completed';
    if (stepIndex + 1 === step) return 'active';
    return 'pending';
  };

  const handleNext = () => {
    if (onValidateStep && !onValidateStep(step)) return;
    onStepChange(step + 1);
  };

  const stepStatusClasses = (status: string) => {
    if (status === 'completed') return styles.quotationStepperDotCompleted;
    if (status === 'active') return styles.quotationStepperDotActive;
    return '';
  };

  const labelClasses = (status: string) => {
    if (status === 'active') return `${styles.quotationStepperLabel} ${styles.quotationStepperLabelActive}`;
    if (status === 'completed') return `${styles.quotationStepperLabel} ${styles.quotationStepperLabelCompleted}`;
    return styles.quotationStepperLabel;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="xl"
      variant="form"
      closeOnOverlay={false}
      className={styles.quotationModal}
      headerActions={
        <div className={styles.quotationStepBadgeWrap} aria-live="polite">
          <StatusBadge status={`Paso ${step} de ${steps.length}`} />
        </div>
      }
      footer={
        <div className={styles.quotationFooter}>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <div className={styles.quotationFooterActions}>
            {step > 1 && (
              <Button
                type="button"
                variant="secondary"
                size="md"
                onClick={onBack}
              >
                Anterior
              </Button>
            )}
            {step < steps.length && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleNext}
                data-testid="quotation-next"
              >
                Siguiente
              </Button>
            )}
            {isLastStep && (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={onSubmit}
                loading={saving}
                data-testid="quotation-submit"
              >
                {isEditing ? 'Guardar cambios' : 'Solicitar cotización'}
              </Button>
            )}
            {footerActions}
          </div>
        </div>
      }
      footerClassName={styles.quotationFooterWrapper}
      bodyClassName={styles.quotationModalBody}
    >
      <div className={styles.quotationLayout}>
        <div className={styles.quotationStepperShell} aria-label={`Progreso del formulario: paso ${step} de ${steps.length}`}>
          <div className={styles.quotationStepperProgress} aria-hidden="true">
            <span className={styles.quotationStepperProgressBar} style={{ width: `${progressPercent}%` }} />
          </div>
          <div className={styles.quotationStepper} role="list">
            {steps.map((label, idx) => {
              const status = getStepStatus(idx);
              return (
                <div key={label} className={styles.quotationStepperItem} role="listitem">
                  <div className={styles.quotationStepperConnector}>
                    <div
                      className={`${styles.quotationStepperDot} ${stepStatusClasses(status)}`}
                      aria-current={status === 'active' ? 'step' : undefined}
                    >
                      {status === 'completed' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      ) : (
                        <span className={styles.quotationStepperNumber}>{idx + 1}</span>
                      )}
                    </div>
                    {idx < steps.length - 1 && (
                      <div
                        className={`${styles.quotationStepperLine} ${status === 'completed' ? styles.quotationStepperLineCompleted : ''}`}
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className={styles.quotationStepperLabelWrapper}>
                    <span className={labelClasses(status)}>
                      {label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.quotationBody}>
          <div className={styles.quotationStepHeader}>
            <div className={styles.quotationStepKicker}>Paso {step} de {steps.length}</div>
            <h2 className={styles.quotationStepTitle}>{currentStepLabel}</h2>
            <p className={styles.quotationStepDescription}>
              {step === 1 && 'Identifica quién solicita la cotización.'}
              {step === 2 && 'Configura el producto y sus personalizaciones.'}
              {step === 3 && 'Adjunta referencias y define la entrega esperada.'}
              {step === 4 && 'Revisa la información antes de enviar.'}
            </p>
          </div>

          <div className={styles.quotationContent}>
            {children}
          </div>
        </div>
      </div>
    </Modal>
  );
}
