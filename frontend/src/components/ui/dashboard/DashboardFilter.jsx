import React from 'react';
import { cn } from '../../../lib/utils';

export function DashboardFilter({ 
  title = "Filterasi Data", 
  description = "Saring data untuk melihat rincian", 
  icon = "filter_list",
  activeFiltersCount = 0,
  onResetFilters,
  children,
  className
}) {
  return (
    <div className={cn("bg-surface rounded-2xl border border-border shadow-sm overflow-hidden mb-6", className)}>
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-background/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center border" 
            style={{ 
              backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)', 
              color: 'var(--theme-primary)', 
              borderColor: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' 
            }}>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{icon}</span>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-primary font-headline">{title}</h3>
            <p className="text-[10px] text-muted mt-0.5">{description}</p>
          </div>
        </div>

        {/* Action reset if any filter is active */}
        {activeFiltersCount > 0 && onResetFilters && (
          <button
            onClick={onResetFilters}
            className="text-[11px] font-medium text-[var(--theme-error)] hover:opacity-80 flex items-center gap-1 transition-colors bg-[var(--theme-error-light)] px-2.5 py-1 rounded-md border border-[var(--theme-error-light)]"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>close</span>
            Reset Filter
          </button>
        )}
      </div>
      <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
        {children}
      </div>
    </div>
  );
}

export function FilterItem({ label, icon, children }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[11px] font-medium text-muted">{label}</label>
      <div className="relative">
        {icon && (
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-primary z-10 pointer-events-none" 
            style={{ fontSize: '14px' }}>
            {icon}
          </span>
        )}
        <div className={cn(icon && "[&>select]:pl-9 [&>input]:pl-9 [&>div>button]:pl-9")}>
          {children}
        </div>
      </div>
    </div>
  );
}
