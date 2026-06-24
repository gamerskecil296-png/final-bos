import React from 'react';

/**
 * StatusBadge — Badge status seragam
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Success: bg var(--theme-success)/10, text var(--theme-success)
 * - Warning: bg var(--theme-warning)/10, text var(--theme-warning)
 * - Error: bg var(--theme-error)/10, text var(--theme-error)
 * - Info: bg var(--theme-info)/10, text var(--theme-info)
 * - Dot indicator: w-1.5 h-1.5 rounded-full
 */
export default function StatusBadge({ status, children, className = '' }) {
  const config = {
    success: {
      bg: 'color-mix(in srgb, var(--theme-success) 10%, transparent)',
      text: 'var(--theme-success)',
      dot: 'var(--theme-success)',
      label: 'Aktif',
    },
    active: {
      bg: 'color-mix(in srgb, var(--theme-success) 10%, transparent)',
      text: 'var(--theme-success)',
      dot: 'var(--theme-success)',
      label: 'Aktif',
    },
    warning: {
      bg: 'color-mix(in srgb, var(--theme-warning) 10%, transparent)',
      text: 'var(--theme-warning)',
      dot: 'var(--theme-warning)',
      label: 'Pending',
    },
    pending: {
      bg: 'color-mix(in srgb, var(--theme-warning) 10%, transparent)',
      text: 'var(--theme-warning)',
      dot: 'var(--theme-warning)',
      label: 'Pending',
    },
    inactive: {
      bg: 'color-mix(in srgb, var(--theme-error) 10%, transparent)',
      text: 'var(--theme-error)',
      dot: 'var(--theme-error)',
      label: 'Nonaktif',
    },
    error: {
      bg: 'color-mix(in srgb, var(--theme-error) 10%, transparent)',
      text: 'var(--theme-error)',
      dot: 'var(--theme-error)',
      label: 'Error',
    },
    info: {
      bg: 'color-mix(in srgb, var(--theme-info) 10%, transparent)',
      text: 'var(--theme-info)',
      dot: 'var(--theme-info)',
      label: 'Baru',
    },
    new: {
      bg: 'color-mix(in srgb, var(--theme-info) 10%, transparent)',
      text: 'var(--theme-info)',
      dot: 'var(--theme-info)',
      label: 'Baru',
    },
  };

  const c = config[status?.toLowerCase()] || config.info;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${className}`}
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: c.dot }}
      />
      {children ?? c.label}
    </span>
  );
}