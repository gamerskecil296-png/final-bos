import React from 'react';
import { cn } from '../../../lib/utils';
import { Link } from 'react-router-dom';

export function DashboardStatCard({
  label,
  title,
  value,
  description,
  subtitle,
  icon = "show_chart",
  route,
  loading = false,
  badge, // { text, icon: "show_chart" }
  colorClass = "text-[var(--theme-primary)]",
  iconColor,
  bgClass = "bg-[var(--theme-primary-light)] border-[var(--theme-primary)]/20 border",
  iconBg,
  accentGradient = "from-[var(--theme-primary)]/10",
  className,
  ...props
}) {
  const displayLabel = label || title;
  const displayDescription = description || subtitle;
  const displayColorClass = iconColor || colorClass;
  const displayBgClass = iconBg || bgClass;

  const CardWrapper = route ? Link : 'div';
  const wrapperProps = route ? { to: route } : {};

  return (
    <CardWrapper
      {...wrapperProps}
      {...props}
      className={cn(
        "group block bg-gradient-to-br from-white to-slate-50/60 border border-slate-100/70 rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_24px_rgba(27,58,107,0.05)] hover:-translate-y-1 hover:border-[var(--theme-primary)]/30 transition-all duration-500 relative overflow-hidden",
        (route || props.onClick) && "cursor-pointer",
        className
      )}
    >
      {/* Decorative subtle light blob */}
      <div className={cn("absolute -top-12 -right-12 w-28 h-28 bg-gradient-to-br to-transparent rounded-full opacity-35 blur-xl pointer-events-none transition-transform duration-500 group-hover:scale-125 group-hover:opacity-50", accentGradient)} />

      {loading ? (
        <div className="p-5 space-y-4 font-body">
          <div className="flex justify-between items-center mb-2">
            <div className="h-10 w-10 animate-pulse bg-border-muted/50 rounded-xl" />
          </div>
          <div className="h-4 w-24 animate-pulse bg-border-muted/50 rounded-md" />
          <div className="h-8 w-16 animate-pulse bg-border-muted/50 rounded-md mt-1" />
          <div className="h-3 w-32 animate-pulse bg-border-muted/50 rounded-md mt-2" />
        </div>
      ) : (
        <div className="p-5 relative z-10 flex flex-col h-full font-body text-left">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 border shadow-sm",
              displayBgClass.includes('border') ? displayBgClass : `${displayBgClass} border-transparent`,
              displayColorClass
            )}>
              <span className="material-symbols-outlined text-[20px]">{icon}</span>
            </div>

            {badge && (
              <div
                className={cn(
                  "flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 border",
                  badge.className || (() => {
                    const color = badge.color || (
                      colorClass?.includes('primary') ? 'primary' :
                        colorClass?.includes('info') ? 'info' :
                          colorClass?.includes('success') ? 'success' :
                            colorClass?.includes('secondary') ? 'secondary' :
                              colorClass?.includes('warning') ? 'warning' :
                                colorClass?.includes('error') ? 'error' : 'success'
                    );
                    const colorMap = {
                      primary: 'text-[var(--theme-primary)] bg-[var(--theme-primary-light)] border-[var(--theme-primary)]/20',
                      info: 'text-[var(--theme-info)] bg-[var(--theme-info-light)] border-[var(--theme-info)]/20',
                      success: 'text-[var(--theme-success)] bg-[var(--theme-success-light)] border-[var(--theme-success)]/20',
                      secondary: 'text-[var(--theme-secondary)] bg-[var(--theme-secondary-light)] border-[var(--theme-secondary)]/20',
                      warning: 'text-[var(--theme-warning)] bg-[var(--theme-warning-light)] border-[var(--theme-warning)]/20',
                      error: 'text-[var(--theme-error)] bg-[var(--theme-error-light)] border-[var(--theme-error)]/20',
                    };
                    return colorMap[color] || colorMap.success;
                  })()
                )}
              >
                {badge.icon && <span className="material-symbols-outlined" style={{ fontSize: '9px' }}>{badge.icon}</span>}
                {badge.text}
              </div>
            )}
          </div>

          <div className="flex-1">
            <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-wider uppercase mb-1.5 line-clamp-1 font-body">{displayLabel}</p>
            <p className="text-2xl font-bold text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors duration-300 leading-none mt-1.5 font-body truncate">
              {value}
            </p>
            {displayDescription && (
              <p className="text-[11px] text-[var(--theme-text-muted)] font-normal mt-2 line-clamp-2 leading-relaxed font-body">
                {displayDescription}
              </p>
            )}
          </div>
        </div>
      )}
    </CardWrapper>
  );
}

export function DashboardStatGrid({ children, className }) {
  return (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 md:gap-6", className)}>
      {children}
    </div>
  );
}
