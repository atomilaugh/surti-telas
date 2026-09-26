import { ReactNode } from 'react';
import { cn } from '@/shared/utils';

interface TableProps { children: ReactNode; className?: string; }
interface ThProps { children: ReactNode; className?: string; sortable?: boolean; onClick?: () => void; }
interface TdProps { children: ReactNode; className?: string; colSpan?: number; }

export const Table = ({ children, className }: TableProps) => (
  <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-zinc-800">
    <table className={cn('w-full text-sm', className)}>{children}</table>
  </div>
);

export const TableHead = ({ children, className }: TableProps) => (
  <thead className={cn('bg-slate-50 dark:bg-zinc-800/50', className)}>{children}</thead>
);

export const TableBody = ({ children }: TableProps) => (
  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">{children}</tbody>
);

export const TableRow = ({ children, className }: TableProps) => (
  <tr className={cn('hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors', className)}>
    {children}
  </tr>
);

export const TableHeader = ({ children, className, sortable, onClick }: ThProps) => (
  <th
    onClick={onClick}
    tabIndex={onClick ? 0 : undefined}
    role={onClick ? 'button' : undefined}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    className={cn(
      'px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider whitespace-nowrap',
      sortable && 'cursor-pointer hover:text-slate-900 dark:hover:text-white select-none',
      className
    )}
  >
    {children}
  </th>
);

export const TableCell = ({ children, className, colSpan }: TdProps) => (
  <td colSpan={colSpan} className={cn('px-4 py-3 text-slate-700 dark:text-zinc-300 whitespace-nowrap', className)}>
    {children}
  </td>
);



