import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function DialogModal({
    open,
    onOpenChange,
    onClose,
    title,
    description,
    subtitle,
    icon,
    children,
    footer,
    maxWidth = 'max-w-lg',
    className,
    bodyClassName,
    variant = 'default'
}) {
    const handleOpenChange = (isOpen) => {
        onOpenChange?.(isOpen);
        if (!isOpen) {
            onClose?.();
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={handleOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
                <Dialog.Content 
                    aria-describedby={undefined}
                    className={cn(
                    "fixed left-1/2 top-1/2 z-[100] -translate-x-1/2 -translate-y-1/2 w-full max-h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 overflow-hidden",
                    maxWidth,
                    className
                )}>
                    {/* ── Clean Header ────────────────────────────────────── */}
                    <div className={cn(
                        "relative pt-6 pb-4 px-6 md:px-8 flex-shrink-0 border-b border-slate-100 bg-white overflow-hidden"
                    )}>
                        {/* Education Theme Watermark */}
                        <div className="absolute -top-6 -right-4 opacity-[0.04] pointer-events-none select-none">
                            <span className="material-symbols-outlined -rotate-12 text-slate-900" style={{ fontSize: "140px" }}>school</span>
                        </div>
                        <Dialog.Close asChild>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenChange(false); }}
                                className="absolute z-50 top-5 right-5 w-8 h-8 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="h-4 w-4" strokeWidth={2.5} />
                            </button>
                        </Dialog.Close>

                        <div className="relative z-10 pr-8">
                            {(icon || subtitle) && (
                                <div className="flex items-center gap-3 mb-3">
                                    {icon && (
                                        <div className="size-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm flex-shrink-0">
                                            {typeof icon === 'string' ? (
                                                <span className="material-symbols-outlined stroke-[2px] whitespace-nowrap" style={{ fontSize: "20px" }}>
                                                    {icon}
                                                </span>
                                            ) : (
                                                <div className="[&>svg]:w-5 [&>svg]:h-5">
                                                    {icon}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {subtitle && (
                                        <div className="text-[10px] font-black tracking-widest px-2.5 py-1 bg-slate-100 text-slate-500 rounded-md uppercase">
                                            {subtitle}
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            <Dialog.Title className="text-lg font-bold text-slate-900 font-jakarta tracking-tight">
                                {title}
                            </Dialog.Title>
                            {description && (
                                <Dialog.Description className="text-[13px] font-medium text-slate-500 mt-1.5 leading-relaxed">
                                    {description}
                                </Dialog.Description>
                            )}
                        </div>
                    </div>

                    {/* ── Body ────────────────────────────────────────────── */}
                    <div className={cn("flex-1 overflow-y-auto bg-white", bodyClassName || "p-6 md:p-8 space-y-6")}>
                        {children}
                    </div>

                    {/* ── Footer ───────────────────────────────────────────── */}
                    {footer && (
                        <div className="px-6 md:px-8 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
                            {footer}
                        </div>
                    )}
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

export function ModalCancelButton({ onClick, children = "Batal", className }) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "group h-11 px-6 sm:px-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[11px] uppercase tracking-[0.1em] transition-all duration-300 flex items-center justify-center cursor-pointer hover:-translate-y-0.5 active:translate-y-0 border-none",
                className
            )}
        >
            <span>{children}</span>
        </button>
    );
}

export function ModalSaveButton({ onClick, disabled, loading, text, children = "Simpan", icon = "task_alt", className, form, type }) {
    return (
        <button
            type={type || (form ? "submit" : "button")}
            form={form}
            onClick={onClick}
            disabled={disabled || loading}
            className={cn(
                "group relative h-11 px-6 sm:px-8 rounded-xl bg-[var(--theme-primary)] hover:opacity-90 text-white font-black text-[11px] uppercase tracking-[0.1em] transition-all duration-300 flex items-center justify-center gap-2 border border-transparent shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden",
                className
            )}
        >
            <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none" />
            {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white relative z-10"></div>
            ) : icon ? (
                <span className="material-symbols-outlined relative z-10 group-hover:scale-110 transition-transform duration-300" style={{ fontSize: '18px' }} >{icon}</span>
            ) : null}
            <span className="relative z-10">{children}</span>
        </button>

    );
}