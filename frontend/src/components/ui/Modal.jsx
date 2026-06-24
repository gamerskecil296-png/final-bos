import React from 'react';
import { DialogModal } from './DialogModal';
import { cn } from '@/lib/utils';

/**
 * Modal - Custom overlay modal wrapped around Radix UI DialogModal (backward-compatibility wrapper)
 */
export function Modal({ open, onClose, title, subtitle, icon, children, maxWidth = 'max-w-2xl', className }) {
  return (
    <DialogModal
      open={open}
      onClose={onClose}
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose?.();
      }}
      title={title}
      subtitle={subtitle}
      icon={icon}
      maxWidth={maxWidth}
      className={className}
    >
      {children}
    </DialogModal>
  );
}

/**
 * ModalFooter - Standard footer for Modal with action buttons
 */
export function ModalFooter({ children, className }) {
  return (
    <div className={cn(
      'px-6 py-4 border-t border-[var(--theme-border-muted)] flex items-center justify-end gap-3 bg-slate-50/50 rounded-b-2xl shrink-0',
      className
    )}>
      {children}
    </div>
  );
}

/**
 * ModalBody - Standard padded body content area
 */
export function ModalBody({ children, className }) {
  return (
    <div className={cn('p-6 space-y-5', className)}>
      {children}
    </div>
  );
}

/**
 * Pre-built button styles for modal actions using design token styles
 */
export function ModalBtn({ variant = 'default', children, className, ...props }) {
  const base = 'h-10 px-5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer';
  const variants = {
    default:   'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)]',
    outline:   'border border-[var(--theme-border)] text-[var(--theme-text-muted)] bg-white hover:bg-[var(--theme-bg)]',
    danger:    'bg-[var(--theme-error)] text-white hover:opacity-95',
    ghost:     'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)]',
    success:   'bg-[var(--theme-success)] text-white hover:opacity-95',
  }
  return (
    <button className={cn(base, variants[variant], className)} {...props}>
      {children}
    </button>
  );
}
