import React from 'react';
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-70 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60',
        outline:
          'border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export { buttonVariants };

/**
 * Button — Standar button dengan variant: primary, secondary, danger, ghost, icon
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Primary: bg var(--theme-primary), text white, borderRadius var(--theme-btn-radius)
 * - Secondary: border var(--theme-border), color var(--theme-text)
 * - Danger: bg var(--theme-error), text white
 * - Ghost: hover bg-black/[0.03], color var(--theme-text-muted)
 * - Radius: var(--theme-btn-radius) untuk SEMUA tombol
 */
export default function Button({
  children,
  variant = 'primary', // primary | secondary | danger | ghost | icon
  icon,
  loading = false,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const baseClasses = 'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: {
      style: {
        backgroundColor: 'var(--theme-primary)',
        color: 'white',
        border: 'none',
      },
      hover: 'hover:opacity-90 hover:shadow-md',
    },
    secondary: {
      style: {
        backgroundColor: 'var(--theme-surface)',
        color: 'var(--theme-text)',
        border: '1px solid var(--theme-border)',
      },
      hover: 'hover:bg-black/[0.03] hover:shadow-sm',
    },
    danger: {
      style: {
        backgroundColor: 'var(--theme-error)',
        color: 'white',
        border: 'none',
      },
      hover: 'hover:opacity-90 hover:shadow-md',
    },
    ghost: {
      style: {
        backgroundColor: 'transparent',
        color: 'var(--theme-text-muted)',
        border: 'none',
      },
      hover: 'hover:bg-black/[0.03] hover:text-[var(--theme-text)]',
    },
    icon: {
      style: {
        backgroundColor: 'transparent',
        color: 'var(--theme-text-muted)',
        border: 'none',
        padding: '0.625rem',
      },
      hover: 'hover:bg-black/[0.05] hover:text-[var(--theme-text)]',
    },
  };

  const v = variants[variant] || variants.primary;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${v.hover} ${className}`}
      style={v.style}
      {...props}
    >
      {loading ? (
        <span className="material-symbols-outlined text-sm animate-spin">sync</span>
      ) : icon ? (
        <span className="material-symbols-outlined text-sm">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

export { Button };