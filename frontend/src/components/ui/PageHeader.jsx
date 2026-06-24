import React from 'react';

/**
 * PageHeader — Standar header untuk setiap halaman portal
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Icon box: w-12 h-12, rounded-xl, bg var(--theme-primary), color white
 * - Title: text-xl font-bold, color var(--theme-text)
 * - Subtitle: text-xs, color var(--theme-text-muted)
 * - Actions: flex gap-2, di kanan
 * - Section: rounded-xl p-5, bg var(--theme-surface)
 */
export default function PageHeader({ icon, title, subtitle, actions, className = '' }) {
  return (
    <section
      className={`rounded-xl p-5 ${className}`}
      style={{ backgroundColor: 'var(--theme-surface)' }}
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Kiri: Icon + Judul */}
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: 'var(--theme-primary)',
              color: 'white',
            }}
          >
            <span className="material-symbols-outlined text-xl">{icon}</span>
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ color: 'var(--theme-text)' }}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Kanan: Action buttons */}
        {actions && (
          <div className="flex items-center gap-2 shrink-0">{actions}</div>
        )}
      </div>
    </section>
  );
}