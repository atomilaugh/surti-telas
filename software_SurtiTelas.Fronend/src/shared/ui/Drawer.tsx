import { useEffect, ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Button } from './Button';

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  footer?: ReactNode;
  side?: 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = { sm: 'w-full max-w-xs', md: 'w-full max-w-sm', lg: 'w-full max-w-md' };

export const Drawer = ({ open, onClose, title, children, footer, side = 'right', size = 'md' }: DrawerProps) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      {open && (
        <div
          onClick={onClose}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClose(); } }}
          tabIndex={0}
          role="button"
          aria-label="Cerrar drawer"
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        />
      )}
      <div className={cn(
        'fixed top-0 z-50 h-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 shadow-2xl flex flex-col transition-transform duration-300',
        sizeMap[size],
        side === 'right' ? 'right-0 border-l' : 'left-0 border-r',
        open
          ? 'translate-x-0'
          : side === 'right' ? 'translate-x-full' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-zinc-800 shrink-0">
          {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>}
          <Button variant="ghost" size="icon-sm" onClick={onClose} className="ml-auto">
            <X size={16} />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && (
          <div className="p-6 border-t border-slate-100 dark:border-zinc-800 shrink-0">{footer}</div>
        )}
      </div>
    </>
  );
};



