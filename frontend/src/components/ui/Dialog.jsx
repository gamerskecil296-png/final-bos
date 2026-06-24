import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Dialog — Modal dialog standar
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Overlay: fixed inset-0 bg-black/40 backdrop-blur-sm
 * - Modal: rounded-2xl, bg var(--theme-surface), border var(--theme-border)
 * - Header: flex justify-between items-center, border-b var(--theme-border)
 * - Close button: absolute right-4 top-4
 * - Radius: rounded-2xl
 */
function DialogPortal({ children }) {
  return typeof document !== 'undefined' ? createPortal(children, document.body) : null;
}

function DialogOverlay({ children }) {
  return children;
}

export function DialogContent({ className = '', children, ...props }) {
  return (
    <div className={`p-0 flex flex-col flex-1 min-h-0 overflow-hidden ${className}`} {...props}>
      {children}
    </div>
  );
}

export function DialogHeader({ className = '', icon, iconClassName = "text-slate-800", children, ...props }) {
  return (
    <div
      className={`p-6 md:px-8 md:pt-8 md:pb-5 bg-white border-b border-[var(--theme-border-muted)] relative text-left overflow-hidden shrink-0 ${className}`}
      {...props}
    >
      {icon && (
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
          <span className={`material-symbols-outlined size-24 rotate-12 ${iconClassName}`}>{icon}</span>
        </div>
      )}
      <div className="relative z-10 flex flex-col space-y-1.5">
        {children}
      </div>
    </div>
  );
}

export function DialogFooter({ className = '', ...props }) {
  return (
    <div
      className={`flex flex-col md:flex-row items-center justify-end gap-3 p-6 md:p-8 bg-white border-t border-[var(--theme-border-muted)] shrink-0 ${className}`}
      {...props}
    />
  );
}

export function DialogTitle({ className = '', ...props }) {
  return (
    <h2
      className={`text-xl font-bold leading-tight tracking-tight text-neutral-900 font-headline ${className}`}
      {...props}
    />
  );
}

export function DialogDescription({ className = '', ...props }) {
  return (
    <p
      className={`text-xs text-neutral-500 font-medium italic mt-1.5 ${className}`}
      {...props}
    />
  );
}

export function DialogClose({ ...props }) {
  return null;
}

export default function Dialog({ open, onOpenChange, children, maxWidth = "max-w-lg", className = "" }) {
  const isOpen = open;
  const handleClose = () => onOpenChange && onOpenChange(false);

  if (!isOpen) return null;

  return (
    <DialogPortal>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div
          className={`relative w-full ${maxWidth} rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200 bg-[var(--theme-surface)] border border-[var(--theme-border)] flex flex-col max-h-[90vh] overflow-hidden ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {children}

          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-4 top-4 p-2 rounded-lg transition-colors hover:bg-[var(--theme-text-subtle)]/10 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] z-[60]"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    </DialogPortal>
  );
}

export { Dialog };