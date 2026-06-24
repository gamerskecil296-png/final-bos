import React from 'react';
import { cn } from '../../../lib/utils';
import { Link } from 'react-router-dom';

export function DashboardHero({
  title,
  highlightedTitle,
  subtitle,
  icon = 'admin_panel_settings',
  badges = [], 
  breadcrumbs = [], 
  actions, 
  className,
  compact = false 
}) {
  return (
    <section
      className={cn(
        "relative w-full overflow-hidden rounded-2xl md:rounded-3xl mb-6 md:mb-8",
        "bg-[var(--theme-surface)] border border-[var(--theme-border)]/50",
        "shadow-sm transition-all duration-300",
        "group/hero",
        className
      )}
    >
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Subtle Gradient Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)]/5 via-transparent to-[var(--theme-primary)]/5 opacity-50" />
        
        {/* Decorative Blurred Blobs (Positioned Absolutely without affecting layout flow) */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-[var(--theme-primary)]/20 to-transparent rounded-full blur-3xl opacity-60 mix-blend-multiply group-hover/hero:opacity-80 transition-opacity duration-700" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-[var(--theme-primary)]/10 to-transparent rounded-full blur-2xl opacity-40 mix-blend-multiply" />
        
        {/* Optional Noise Texture (if applicable in project, simulated via radial gradient) */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.01)_100%)]" />
      </div>

      {/* Main Content Container (Relies on padding, no min-heights!) */}
      <div className={cn(
        "relative z-10 w-full flex flex-col lg:flex-row gap-6",
        compact ? "p-5 md:p-6" : "p-6 md:p-8 lg:p-10",
        "justify-between lg:items-center"
      )}>
        
        {/* Left Section: Info */}
        <div className="flex flex-col gap-4 max-w-3xl">
          
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex flex-wrap items-center gap-1.5" aria-label="Breadcrumb">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={idx}>
                    {crumb.path && !isLast ? (
                      <Link 
                        to={crumb.path} 
                        className="text-[10px] md:text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest hover:text-[var(--theme-primary)] transition-colors truncate max-w-[150px] md:max-w-[200px]"
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="text-[10px] md:text-[11px] font-bold text-[var(--theme-text)] uppercase tracking-widest truncate max-w-[150px] md:max-w-[200px]">
                        {crumb.label}
                      </span>
                    )}
                    {!isLast && (
                      <span className="text-[10px] text-[var(--theme-text-muted)]/50 mx-0.5 select-none material-symbols-outlined" style={{ fontSize: '12px' }}>
                        chevron_right
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}

          {/* Title & Icon Row */}
          <div className="flex items-start sm:items-center gap-4 md:gap-5">
            {/* Glowing Icon Container */}
            {icon && (
              <div className="relative shrink-0 hidden sm:flex">
                {/* Glow effect behind icon */}
                <div className="absolute inset-0 bg-[var(--theme-primary)]/20 blur-xl rounded-full scale-110 group-hover/hero:bg-[var(--theme-primary)]/30 transition-all duration-500" />
                <div className={cn(
                  "relative flex items-center justify-center rounded-2xl",
                  "bg-gradient-to-br from-[var(--theme-surface)] to-[var(--theme-primary)]/10",
                  "border border-[var(--theme-border)]/50 shadow-sm",
                  compact ? "w-10 h-10" : "w-14 h-14"
                )}>
                  <span className="material-symbols-outlined text-[var(--theme-primary)] drop-shadow-sm" style={{ fontSize: compact ? '20px' : '28px' }}>
                    {icon}
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5 md:gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className={cn(
                  "text-[var(--theme-text)] tracking-tight leading-tight",
                  compact ? "text-xl md:text-2xl font-bold" : "text-2xl md:text-3xl font-extrabold"
                )}>
                  {title} {highlightedTitle && <span className="text-[var(--theme-primary)]">{highlightedTitle}</span>}
                </h1>

                {/* Badges */}
                {badges && badges.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0">
                    {badges.map((badge, idx) => (
                      <span key={idx} className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-wider border shadow-sm backdrop-blur-sm",
                        badge.active
                          ? "bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20"
                          : "bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border-[var(--theme-primary)]/20"
                      )}>
                        {badge.active && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--theme-success)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[var(--theme-success)]"></span>
                          </span>
                        )}
                        {badge.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Subtitle */}
              {subtitle && (
                <p className={cn(
                  "text-[var(--theme-text-muted)] leading-relaxed max-w-2xl",
                  compact ? "text-xs font-normal" : "text-sm md:text-base font-medium"
                )}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Actions */}
        {actions && (
          <div className="shrink-0 flex items-center justify-start lg:justify-end border-t lg:border-t-0 border-[var(--theme-border)]/50 lg:border-none pt-4 lg:pt-0 mt-2 lg:mt-0 w-full lg:w-auto">
            <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-end">
              {actions}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
