import React from 'react';
import { cn } from '../../../lib/utils';
import { Link } from 'react-router-dom';

export function DashboardQuickActions({ title = "Aksi Cepat", description = "Pintasan Menu", actions = [], className }) {
  if (!actions || actions.length === 0) return null;

  return (
    <div className={cn("bg-gradient-to-br from-white to-slate-50/80 border border-slate-100/80 rounded-[1.25rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 md:p-6 mb-6 transition-all duration-500 overflow-hidden relative", className)}>
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-[var(--theme-primary)]/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="flex items-center gap-3.5 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-hover)] text-white flex items-center justify-center shadow-[0_8px_16px_-6px_color-mix(in_srgb,var(--theme-primary)_50%,transparent)] shrink-0 border border-white/20">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>offline_bolt</span>
        </div>
        <div>
          <h2 className="text-[15px] font-bold text-slate-800 font-headline leading-tight">{title}</h2>
          {description && <p className="text-[12px] text-slate-500 font-medium mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7 gap-3 relative z-10">
        {actions.map((item, i) => {
          const Wrapper = item.path ? Link : 'button';
          const props = item.path ? { to: item.path } : { onClick: item.onClick };

          return (
            <Wrapper
              key={i}
              {...props}
              className="group flex flex-row items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[var(--theme-primary)]/30 active:scale-95 text-left w-full"
            >
              <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-110", item.iconBg || "bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/20")}>
                <span className="material-symbols-outlined text-[20px] transition-transform duration-300 group-hover:rotate-6">{item.icon}</span>
              </div>
              <span className="text-[12px] font-bold text-slate-700 group-hover:text-[var(--theme-primary)] transition-colors line-clamp-2 leading-tight">{item.label}</span>
            </Wrapper>
          );
        })}
      </div>
    </div>
  );
}
