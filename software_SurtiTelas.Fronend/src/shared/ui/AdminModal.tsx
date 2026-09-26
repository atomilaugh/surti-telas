import React, { useId, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import m from './AdminModal.module.css';

interface AdminModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
}

const sizeClassMap: Record<'sm' | 'md' | 'lg' | 'xl', string> = {
  sm: m.adminModalSm,
  md: m.adminModalMd,
  lg: m.adminModalLg,
  xl: m.adminModalXl,
};

export const AdminModal: React.FC<AdminModalProps> = ({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  closeOnEscape = true,
}) => {
  const titleId = `admin-modal-title-${useId()}`;
  const descId = `${titleId}-desc`;
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Guardar el elemento activo antes de abrir para restaurar el foco al cerrar
  useEffect(() => {
    if (open) {
      previousActiveElementRef.current = document.activeElement as HTMLElement;
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
    }
  }, [open]);

  // Manejo de Escape, Scroll Lock y Focus Trap
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
        return;
      }

      // Focus Trap (Atrapa el foco dentro del modal al presionar Tab)
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement?.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement?.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    // Auto-enfocar el modal o su primer elemento interactivo al abrir
    const timer = setTimeout(() => {
      if (modalRef.current) {
        const firstFocusable = modalRef.current.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }
    }, 50);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
      clearTimeout(timer);
    };
  }, [open, onClose, closeOnEscape]);

  if (!open) return null;

  const handleOverlayClick = () => {
    if (closeOnOverlayClick) onClose();
  };

  return (
    <div
      className={m.modalOverlay}
      onClick={handleOverlayClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOverlayClick(); } }}
      tabIndex={0}
      role="button"
      aria-label="Cerrar modal"
    >
      <div
        ref={modalRef}
        className={`${m.modal} ${sizeClassMap[size] ?? ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descId : undefined}
      >
        <div className={m.modalHeader}>
          <div className={m.headerText}>
            <h2 id={titleId} className={m.modalTitle}>
              {title}
            </h2>
            {description && (
              <p id={descId} className={m.modalDescription}>
                {description}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Cerrar modal"
          >
            <X size={16} />
          </Button>
        </div>
        <div className={m.modalBody}>{children}</div>
      </div>
    </div>
  );
};

AdminModal.displayName = 'AdminModal';