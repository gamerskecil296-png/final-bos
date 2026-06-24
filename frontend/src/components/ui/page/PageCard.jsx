import React from 'react';
import { cn } from '../../../lib/utils';

export function PageCard({ children, className, noPadding = false, ...props }) {
  return (
    <div 
      className={cn(
        "bg-gradient-to-br from-white to-slate-50/80 border border-slate-100/80 rounded-[1.25rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-500 overflow-hidden relative",
        !noPadding && "p-5 sm:p-6",
        className
      )}
      {...props}
    >
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[var(--theme-primary)]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}

export function PageCardHeader({ title, description, icon, action, className }) {
  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10", className)}>
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-xl bg-white text-[var(--theme-primary)] flex items-center justify-center border border-slate-100 shadow-sm shrink-0">
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
          </div>
        )}
        <div>
          <h2 className="text-[15px] font-bold text-slate-800 font-headline leading-tight">{title}</h2>
          {description && <p className="text-[12px] text-slate-500 font-medium mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
