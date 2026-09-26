import React, { ReactNode } from 'react';
import { Button } from './Button';
import s from './ModalFooter.module.css';

export type ModalFooterAction = {
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'ghost' | 'outline';
  onClick?: (() => void) | undefined;
  loading?: boolean;
  icon?: ReactNode;
  leftIcon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

export interface ModalFooterProps {
  primary?: ModalFooterAction;
  secondary?: ModalFooterAction;
  actions?: ModalFooterAction[];
  align?: 'end' | 'center' | 'start';
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({
  primary,
  secondary,
  actions = [],
  align = 'end',
  className,
}) => {
  if (!primary && !secondary && actions.length === 0) return null;

  return (
    <footer className={`${s.modalFooter} ${s[`align -= 1${align}`]} ${className ?? ''}`.trim()}>
      {actions.map((a) => (
        <Button
          key={a.label}
          type={a.type ?? 'button'}
          variant={a.variant ?? 'ghost'}
          onClick={a.onClick}
          loading={a.loading}
          disabled={a.disabled}
          leftIcon={a.leftIcon ?? a.icon}
        >
          {a.label}
        </Button>
      ))}
      {secondary && (
        <Button
          type={secondary.type ?? 'button'}
          variant={secondary.variant ?? 'secondary'}
          onClick={secondary.onClick}
          loading={secondary.loading}
          disabled={secondary.disabled}
          leftIcon={secondary.leftIcon ?? secondary.icon}
        >
          {secondary.label}
        </Button>
      )}
      {primary && (
        <Button
          type={primary.type ?? 'button'}
          variant={primary.variant ?? 'primary'}
          onClick={primary.onClick}
          loading={primary.loading}
          disabled={primary.disabled}
          leftIcon={primary.leftIcon ?? primary.icon}
        >
          {primary.label}
        </Button>
      )}
    </footer>
  );
};

ModalFooter.displayName = 'ModalFooter';
