import React from 'react';

/**
 * StatCard — Card statistik dengan icon, value, label, dan trend
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Container: rounded-xl p-5, bg var(--theme-surface), border var(--theme-border)
 * - Icon accent: color-mix(in srgb, var(--theme-secondary) 12%, transparent)
 * - Label: text-xs, font-bold, uppercase, tracking-widest
 * - Value: text-2xl font-bold, color var(--theme-text)
 * - Description: text-xs, color var(--theme-text-muted)
 * - Trend: bg-success/10 text-success atau bg-error/10 text-error
 */
export default function StatCard({
  label,
  value,
  icon = 'analytics',
  description,
  trend, // 'up' | 'down' | null
  trendValue,
  loading = false,
  className = '',
  color,
  bg,
}) {
  if (loading) {
    return (
      <div
        className={`rounded-xl p-5 ${className}`}
        style={{
          backgroundColor: 'var(--theme-surface)',
          border: '1px solid var(--theme-border)',
        }}
      >
        <div className="animate-pulse space-y-3">
          <div
            className="w-10 h-10 rounded-xl"
            style={{ backgroundColor: 'var(--theme-border-muted)' }}
          />
          <div
            className="h-6 w-16 rounded"
            style={{ backgroundColor: 'var(--theme-border-muted)' }}
          />
          <div
            className="h-3 w-28 rounded"
            style={{ backgroundColor: 'var(--theme-border-muted)' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:shadow-md ${className}`}
      style={{
        backgroundColor: 'var(--theme-surface)',
        border: '1px solid var(--theme-border)',
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Icon box dengan accent secondary */}
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg || ''}`}
          style={bg ? {} : {
            backgroundColor:
              'color-mix(in srgb, var(--theme-secondary) 12%, transparent)',
            color: 'var(--theme-secondary)',
          }}
        >
          <span 
            className={`material-symbols-outlined text-xl ${color || ''}`}
            style={color ? {} : { color: 'var(--theme-secondary)' }}
          >
            {icon}
          </span>
        </div>

        {/* Trend badge */}
        {trendValue && (
          <span
            className="text-[10px] font-bold px-2 py-1 rounded-full"
            style={{
              backgroundColor:
                trend === 'up'
                  ? 'color-mix(in srgb, var(--theme-success) 10%, transparent)'
                  : 'color-mix(in srgb, var(--theme-error) 10%, transparent)',
              color:
                trend === 'up' ? 'var(--theme-success)' : 'var(--theme-error)',
            }}
          >
            {trend === 'up' ? '↑' : '↓'} {trendValue}
          </span>
        )}
      </div>

      <p
        className="text-2xl font-bold mb-1"
        style={{ color: 'var(--theme-text)' }}
      >
        {value ?? '0'}
      </p>

      <div className="flex items-center justify-between">
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--theme-text-muted)' }}
        >
          {label}
        </span>
        {description && (
          <span
            className="text-xs text-right truncate max-w-[120px]"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            {description}
          </span>
        )}
      </div>
    </div>
  );
}

export { StatCard };