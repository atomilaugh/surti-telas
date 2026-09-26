import { ReactNode, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils';
import styles from './DropdownMenu.module.css';

export interface DropdownDivider {
  divider: true;
  label?: never;
  icon?: never;
  onClick?: never;
  danger?: never;
  disabled?: never;
  shortcut?: never;
}

export interface DropdownAction {
  divider?: false;
  label: string;
  icon?: ReactNode;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export interface DropdownHeader {
  title: string;
  description?: string;
}

export type DropdownItem = DropdownAction | DropdownDivider;

export interface DropdownMenuProps {
  trigger: ReactNode;
  items: DropdownItem[];
  header?: DropdownHeader;
  align?: 'left' | 'right';
  className?: string;
}

export const DropdownMenu = ({ trigger, items, header, align = 'right', className }: DropdownMenuProps) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef<number>(-1);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const close = useCallback(() => setOpen(false), []);

  const setItemRef = useCallback((index: number) => (el: HTMLButtonElement | null) => {
    itemRefs.current[index] = el;
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const scrollY = window.scrollY;
    const scrollX = window.scrollX;
    const menuWidth = 236;

    let top = rect.bottom + scrollY + 6;
    let left = rect.right + scrollX - menuWidth;

    if (align === 'left') {
      left = rect.left + scrollX;
    }

    const vw = window.innerWidth;
    if (left + menuWidth > vw - 12) {
      left = vw - menuWidth - 12;
    }
    if (left < 12) {
      left = 12;
    }

    const estimatedBottom = top + 340;
    const viewportBottom = scrollY + window.innerHeight;
    if (estimatedBottom > viewportBottom - 16) {
      top = rect.top + scrollY - 340;
    }
    if (top < scrollY + 12) {
      top = scrollY + 12;
    }

    setCoords({ top, left });
  }, [align]);

  const handleToggle = useCallback(() => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  }, [open, updatePosition]);

  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const actionItems = items.filter((it): it is DropdownAction => !it.divider);
      if (actionItems.length === 0) return;

      const current = activeIndexRef.current;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = current < actionItems.length - 1 ? current + 1 : 0;
        activeIndexRef.current = next;
        itemRefs.current[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = current > 0 ? current - 1 : actionItems.length - 1;
        activeIndexRef.current = prev;
        itemRefs.current[prev]?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    },
    [items, close]
  );

  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      close();
    };

    const scrollHandler = () => updatePosition();

    document.addEventListener('mousedown', handler, true);
    window.addEventListener('scroll', scrollHandler, { passive: true });
    window.addEventListener('resize', scrollHandler, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handler, true);
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', scrollHandler);
    };
  }, [open, close, updatePosition]);

  // Ensure portaled dropdown uses dashboard theme when opened
  useEffect(() => {
    const applyTheme = (value?: string | null) => {
      try {
        const val = value ?? (typeof window !== 'undefined' ? window.localStorage.getItem('dashboard-theme') : null) ?? 'light';
        if (menuRef.current) menuRef.current.setAttribute('data-theme', val);
      } catch (_e) { void _e; }
    };

    if (open) applyTheme();

    const handler = (e: Event) => {
      const theme = (e as CustomEvent).detail as string | undefined;
      applyTheme(theme);
    };

    window.addEventListener('dashboard-theme-changed', handler as EventListener);
    return () => window.removeEventListener('dashboard-theme-changed', handler as EventListener);
  }, [open]);

  useEffect(() => {
    activeIndexRef.current = -1;
  }, [items]);

  const actionItems = items.filter((it): it is DropdownAction => !it.divider);

  return (
    <div ref={triggerRef} className={cn('relative inline-flex items-center', className)}>
      <div
        onClick={handleToggle}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {trigger}
      </div>

      {open && coords &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={close} aria-hidden="true" />

            <div
              ref={menuRef}
              role="menu"
              aria-orientation="vertical"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
              className={styles['DropdownMenu-container']}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                width: 236,
                zIndex: 9999,
              }}
            >
              <div className={styles['DropdownMenu-inner']}>
                {header && (
                  <div className={styles['DropdownMenu-header']}>
                    <span className={styles['DropdownMenu-headerTitle']}>{header.title}</span>
                    {header.description && (
                      <span className={styles['DropdownMenu-headerDesc']}>{header.description}</span>
                    )}
                  </div>
                )}
                {header && actionItems.length > 0 && (
                  <div className={styles['DropdownMenu-divider']} role="separator" />
                )}
                {items.map((item, idx) => {
                  if (item.divider) {
                    return (
                      <div
                        key={`divider-${idx}`}
                        role="separator"
                        className={styles['DropdownMenu-divider']}
                      />
                    );
                  }

                  const isDanger = !!item.danger;
                  const isDisabled = !!item.disabled;

                  return (
                    <button
                      key={item.label + idx}
                      ref={setItemRef(idx)}
                      type="button"
                      role="menuitem"
                      disabled={isDisabled}
                      onClick={() => {
                        item.onClick?.();
                        close();
                      }}
                      className={cn(
                        styles['DropdownMenu-item'],
                        isDanger && styles['DropdownMenu-item -= 1danger'],
                        isDisabled && styles['DropdownMenu-item -= 1disabled']
                      )}
                    >
                      {item.icon && (
                        <span
                          className={cn(
                            styles['DropdownMenu-icon'],
                            isDanger && styles['DropdownMenu-icon -= 1danger']
                          )}
                        >
                          {item.icon}
                        </span>
                      )}

                      <span className={styles['DropdownMenu-label']}>{item.label}</span>

                      {item.shortcut && (
                        <span
                          className={cn(
                            styles['DropdownMenu-shortcut'],
                            isDanger && styles['DropdownMenu-shortcut -= 1danger']
                          )}
                        >
                          {item.shortcut}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
};