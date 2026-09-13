import { ReactNode, useRef, useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/shared/utils';
import s from './TableActionsMenu.module.css';

/* ------------------------------------------------------------------ */
/*  Tipos                                                             */
/* ------------------------------------------------------------------ */

export interface TableAction {
  key: string;
  label: string;
  icon?: ReactNode;
  iconClassName?: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  shortcut?: string;
  tooltip?: string;
}

export interface TableActionsMenuProps {
  trigger: ReactNode;
  actions: TableAction[];
  primaryAction?: { label: string; icon?: ReactNode; onClick?: () => void; tooltip?: string; shortcut?: string };
  align?: 'left' | 'right';
}

/* ------------------------------------------------------------------ */
/*  TableActionsMenu                                                  */
/* ------------------------------------------------------------------ */

export const TableActionsMenu = ({
  trigger,
  actions,
  primaryAction,
  align = 'right',
}: TableActionsMenuProps) => {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const activeIndexRef = useRef<number>(-1);

  const close = useCallback(() => {
    setOpen(false);
    activeIndexRef.current = -1;
  }, []);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 260;
    const menuHeight = menuRef.current?.offsetHeight ?? 280;
    const viewportHeight = window.innerHeight;
    const maxMenuHeight = Math.max(160, viewportHeight - 32);

    // getBoundingClientRect() returns viewport-relative coordinates.
    // Since the menu uses position: fixed, we use these directly —
    // adding window.scrollY would double-count the scroll offset.
    let top = rect.bottom + 8;
    let left = rect.right - menuWidth;

    if (align === 'left') {
      left = rect.left;
    }

    const vw = window.innerWidth;
    if (left + menuWidth > vw - 16) left = vw - menuWidth - 16;
    if (left < 16) left = 16;

    const fitsBelow = top + menuHeight <= viewportHeight - 16;
    const fitsAbove = rect.top - menuHeight - 8 >= 16;

    if (!fitsBelow && fitsAbove) {
      top = rect.top - menuHeight - 8;
    }

    if (top + menuHeight > viewportHeight - 16) {
      top = viewportHeight - maxMenuHeight - 16;
    }
    if (top < 12) {
      top = 12;
    }

    setCoords({ top, left });
  }, [align]);

  const handleToggle = useCallback(() => {
    if (!open) updatePosition();
    setOpen((v) => !v);
  }, [open, updatePosition]);

  /* ---------------- keyboard: trigger ---------------- */
  const handleTriggerKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleToggle();
      }
    },
    [handleToggle]
  );

  /* ---------------- keyboard: menu (arrows + escape) ---------------- */
  const handleMenuKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
      if (items.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const next = (activeIndexRef.current + 1) % items.length;
        activeIndexRef.current = next;
        items[next]?.focus();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prev = (activeIndexRef.current - 1 + items.length) % items.length;
        activeIndexRef.current = prev;
        items[prev]?.focus();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        close();
        triggerRef.current?.focus();
      }
    },
    [close]
  );

  /* ---------------- outside click ---------------- */
  useEffect(() => {
    if (!open) return;

    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
      close();
    };

    const scrollHandler = () => updatePosition();

    document.addEventListener('mousedown', handler, true);
    window.addEventListener('scroll', scrollHandler, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handler, true);
      window.removeEventListener('scroll', scrollHandler, true);
    };
  }, [open, close, updatePosition]);

  useEffect(() => {
    if (!open) return;

    requestAnimationFrame(() => {
      updatePosition();
    });

    if (menuRef.current && 'ResizeObserver' in window) {
      resizeObserverRef.current = new ResizeObserver(() => {
        updatePosition();
      });
      resizeObserverRef.current.observe(menuRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
    };
  }, [open, updatePosition]);

  // Theme sync — listener always active, not gated on open
  useEffect(() => {
    const applyTheme = (value?: string | null) => {
      try {
        const val = value ?? (typeof window !== 'undefined' ? window.localStorage.getItem('dashboard-theme') : null) ?? 'light';
        if (menuRef.current) menuRef.current.setAttribute('data-theme', val);
      } catch (_e) {
        // ignore
      }
    };

    if (open) applyTheme();

    const handler = (e: Event) => {
      const theme = (e as CustomEvent).detail as string | undefined;
      applyTheme(theme);
    };

    window.addEventListener('dashboard-theme-changed', handler as EventListener);
    return () => window.removeEventListener('dashboard-theme-changed', handler as EventListener);
  }, [open]);

  const regularActions = actions.filter((a) => !a.danger);
  const dangerActions = actions.filter((a) => a.danger);

  const resetAndClose = useCallback(() => {
    close();
    triggerRef.current?.focus();
  }, [close]);

  return (
    <div ref={triggerRef} className="relative inline-flex items-center">
      <div
        onClick={handleToggle}
        className="cursor-pointer"
        role="button"
        tabIndex={0}
        onKeyDown={handleTriggerKeyDown}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Abrir menú de acciones"
      >
        {trigger}
      </div>

      {open && coords &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[9998]" onClick={close} aria-hidden="true" />
            <div
              ref={menuRef}
              className={cn(s.menu, align === 'left' && s.alignLeft)}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                width: 260,
                zIndex: 9999,
              }}
              role="menu"
              aria-orientation="vertical"
              aria-label="Acciones disponibles"
              tabIndex={-1}
              onKeyDown={handleMenuKeyDown}
            >
              <div className={s.menuInner}>
                {/* Primary action (View Detail) */}
                {primaryAction && (
                  <button
                    type="button"
                    role="menuitem"
                    ref={(el) => { itemRefs.current[0] = el; }}
                    className={cn(s.item, s.primaryItem)}
                    onClick={() => {
                      primaryAction.onClick?.();
                      resetAndClose();
                    }}
                  >
                    {primaryAction.icon && <span className={cn(s.icon, s.primaryIcon)}>{primaryAction.icon}</span>}
                    <span className={cn(s.label, s.primaryLabel)}>{primaryAction.label}</span>
                    {primaryAction.shortcut && <kbd className={s.shortcut}>{primaryAction.shortcut}</kbd>}
                  </button>
                )}

                {/* Divider after primary */}
                {primaryAction && regularActions.length > 0 && (
                  <div className={s.divider} />
                )}

                {/* Regular actions */}
                {regularActions.map((action, i) => (
                  <button
                    key={action.key}
                    type="button"
                    role="menuitem"
                    ref={(el) => { itemRefs.current[primaryAction ? i + 1 : i] = el; }}
                    className={s.item}
                    aria-disabled={action.disabled}
                    disabled={action.disabled}
                    onClick={() => {
                      action.onClick?.();
                      resetAndClose();
                    }}
                  >
                      {action.icon && <span className={cn(s.icon, action.iconClassName)}>{action.icon}</span>}
                    <span className={s.label}>{action.label}</span>
                    {action.shortcut && <kbd className={s.shortcut}>{action.shortcut}</kbd>}
                  </button>
                ))}

                {/* Divider before danger */}
                {dangerActions.length > 0 && (primaryAction || regularActions.length > 0) && (
                  <div className={s.divider} />
                )}

                {/* Danger actions */}
                {dangerActions.map((action, i) => {
                  const baseIndex = (primaryAction ? 1 : 0) + regularActions.length;
                  return (
                    <button
                      key={action.key}
                      type="button"
                      role="menuitem"
                      ref={(el) => { itemRefs.current[baseIndex + i] = el; }}
                      className={cn(s.item, s.dangerItem)}
                      aria-disabled={action.disabled}
                      disabled={action.disabled}
                      onClick={() => {
                        action.onClick?.();
                        resetAndClose();
                      }}
                    >
                    {action.icon && <span className={cn(s.icon, action.iconClassName)}>{action.icon}</span>}
                      <span className={cn(s.label, s.dangerLabel)}>{action.label}</span>
                      {action.shortcut && <kbd className={s.shortcut}>{action.shortcut}</kbd>}
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
