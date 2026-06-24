import React from 'react';

/**
 * EmptyState — Tampilan ketika data kosong
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Container: rounded-xl, flex-col, items-center, justify-center
 * - Icon box: w-20 h-20 rounded-2xl, bg var(--theme-text-muted)/8, color var(--theme-text-muted)
 * - Title: text-lg font-bold, color var(--theme-text)
 * - Description: text-sm, color var(--theme-text-muted)
 * - Action: Button primary variant
 */
export default function EmptyState({
  icon = 'folder_open',
  title = 'Tidak ada data',
  description = 'Data yang Anda cari tidak ditemukan.',
  action,
  className = '',
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      {/* Icon Box */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--theme-text-muted) 8%, transparent)',
          color: 'var(--theme-text-muted)',
        }}
      >
        <span className="material-symbols-outlined text-4xl">{icon}</span>
      </div>

      {/* Title */}
      <h3
        className="text-lg font-bold mb-2"
        style={{ color: 'var(--theme-text)' }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="text-sm max-w-sm mb-6"
        style={{ color: 'var(--theme-text-muted)' }}
      >
        {description}
      </p>

      {/* Action */}
      {action && <div>{action}</div>}
    </div>
  );
}