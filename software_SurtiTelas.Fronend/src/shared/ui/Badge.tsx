import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/shared/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold leading-snug transition-all duration-200 select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        default: 'border border-[var(--color-border)] bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]',
        primary: 'border border-amber-500/80 bg-amber-500/20 text-amber-700 dark:text-amber-300',
        success: 'border border-emerald-500/80 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
        warning: 'border border-orange-500/80 bg-orange-500/20 text-orange-700 dark:text-orange-300',
        danger: 'border border-red-500/80 bg-red-500/20 text-red-700 dark:text-red-300',
        info: 'border border-blue-500/80 bg-blue-500/20 text-blue-700 dark:text-blue-300',
        purple: 'border border-purple-500/80 bg-purple-500/20 text-purple-700 dark:text-purple-300',
        outline: 'border border-[var(--color-border)] bg-transparent text-[var(--color-text-secondary)]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
);

interface BadgeProps extends VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export const Badge = ({ variant, children, className, dot, ...props }: BadgeProps & React.HTMLAttributes<HTMLSpanElement>) => {
  const baseStyle: React.CSSProperties = {
    boxSizing: 'border-box',
    minHeight: '28px',
    padding: '5px 11px',
    fontSize: '12px',
    fontWeight: 600,
    lineHeight: 1.2,
    whiteSpace: 'nowrap',
  };

  return (
    <span style={baseStyle} className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className={cn(
          'h-1.5 w-1.5 rounded-full shadow-[0_0_0_2px_rgba(255,255,255,0.7)]',
          variant === 'success' && 'bg-emerald-500',
          variant === 'warning' && 'bg-amber-500',
          variant === 'danger' && 'bg-red-500',
          variant === 'info' && 'bg-amber-500',
          variant === 'purple' && 'bg-purple-500',
          variant === 'primary' && 'bg-amber-500',
          (!variant || variant === 'default') && 'bg-[var(--color-text-muted)]',
        )} />
      )}
      {children}
    </span>
  );
};
