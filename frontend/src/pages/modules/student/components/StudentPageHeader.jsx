import React from 'react';
import { cn } from '@/lib/utils';
import { NavLink } from 'react-router-dom';

export default function StudentPageHeader({
  title,
  subtitle,
  icon = "school",
  breadcrumbs = [], // [{ label, to }]
  stats = [], // [{ label, value }]
  actions = null, // JSX
  iconContainerClass = "from-primary/10 to-primary/[0.02] border-primary/10 text-primary",
  iconClass = "text-primary"
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-slate-200/50 bg-white/70 backdrop-blur-md shadow-sm print:hidden mb-6">
      {/* Subtle geometric grid background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/40 to-slate-100/30 pointer-events-none" />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, var(--theme-primary) 1px, transparent 1px), radial-gradient(circle at 80% 20%, var(--theme-primary) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      {/* Accent glow blobs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute -bottom-10 right-40 w-48 h-48 bg-blue-400/5 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1 space-y-3">
          
          {/* Breadcrumb Navigation */}
          <nav className="flex items-center gap-1.5 text-xs font-bold text-slate-400 flex-wrap mb-4">
            <NavLink to="/app/student/dashboard" className="hover:text-primary transition-colors">Portal</NavLink>
            {breadcrumbs.map((bc, i) => (
              <React.Fragment key={i}>
                <span>/</span>
                {bc.to ? (
                  <NavLink to={bc.to} className="hover:text-primary transition-colors">{bc.label}</NavLink>
                ) : (
                  <span className="text-slate-800 font-black uppercase tracking-wider">{bc.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>

          <div className="flex items-start md:items-center gap-4">
            {/* Clean visual anchor icon */}
            <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden group/icon", iconContainerClass)}>
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover/icon:opacity-100 transition-opacity duration-300" />
              <span className={cn("material-symbols-outlined relative z-10 transition-transform duration-300 group-hover/icon:scale-110", iconClass)} style={{ fontSize: '26px' }}>{icon}</span>
            </div>

            <div className="space-y-1">
              {stats && stats.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {stats.map((stat, i) => (
                    <span key={i} className={cn("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border", stat.colorClass || "bg-primary/5 text-primary border-primary/10")}>
                      {stat.value && <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", stat.dotClass || "bg-primary")} />}
                      {stat.value} {stat.label}
                    </span>
                  ))}
                </div>
              )}
              <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight font-headline leading-none">
                {title}
              </h1>
            </div>
          </div>

          {/* Description block */}
          {subtitle && (
            <p className="text-slate-500 font-medium text-xs md:text-sm max-w-3xl leading-relaxed mt-3 pl-0 md:pl-[72px]">
              {subtitle}
            </p>
          )}
        </div>

        {/* Action / Buttons box */}
        {actions && (
          <div className="flex flex-row lg:flex-col items-end gap-3 shrink-0 self-stretch lg:self-auto justify-between lg:justify-center border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100">
            <div className="flex items-center gap-2 flex-wrap justify-end">
               {actions}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
