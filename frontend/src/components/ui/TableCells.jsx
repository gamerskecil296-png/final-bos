import React, { useState } from 'react';
import { cn } from '../../lib/utils'; // Assuming cn exists, if not I will just use template literals

// Cell for User/Student Information (Name + Subtitle like NIM or Email)
export const UserInfoCell = ({ name, subtitle, avatarUrl }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const hasNoImage = !avatarUrl || avatarUrl.trim() === "" || avatarUrl.endsWith("/");

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/60 overflow-hidden shadow-sm">
        {(!loaded || error || hasNoImage) && (
          <span className="material-symbols-outlined text-slate-400/80 absolute text-[20px] select-none">
            person
          </span>
        )}
        {!hasNoImage && !error && (
          <img 
            src={avatarUrl} 
            alt={name} 
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
          />
        )}
      </div>
      <div>
        <p className="font-bold text-[var(--theme-text)] text-xs leading-tight">{name || '-'}</p>
        {subtitle && <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] mt-0.5 tracking-wider">{subtitle}</p>}
      </div>
    </div>
  );
};

// Cell for Status Badges
export const StatusBadgeCell = ({ status, label }) => {
  const styles = {
    success: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]',
    warning: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]',
    error: 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error-light)]',
    info: 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info-light)]',
    default: 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'
  };

  const style = styles[status] || styles.default;

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${style}`}>
      {label || '-'}
    </span>
  );
};

// Cell for Numbers/Scores with optional subtitle
export const ScoreCell = ({ value, subtitle, highlight = false }) => (
  <div>
    <div className={`text-sm ${highlight ? 'font-bold text-[var(--theme-primary)] text-base' : 'font-semibold text-[var(--theme-text)]'}`}>
      {value !== undefined && value !== null ? value : '-'}
    </div>
    {subtitle && <div className="text-[10px] text-[var(--theme-text-muted)] font-semibold mt-0.5">{subtitle}</div>}
  </div>
);

export const PillBadgeCell = ({ title, subtitle, icon, active = false }) => (
  <div className={`inline-flex flex-col px-2.5 py-1.5 rounded-lg border ${active ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'}`}>
    {subtitle && <span className="uppercase text-[9px] font-bold tracking-widest opacity-80 mb-0.5">{subtitle}</span>}
    <div className="flex items-center gap-1">
      {icon && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{icon}</span>}
      <span className="text-xs font-bold leading-none">{title || '-'}</span>
    </div>
  </div>
);

// Cell for simple Bold Text + Subtitle (like Program Studi & Fakultas)
export const TitleSubtitleCell = ({ title, subtitle }) => (
  <div className="flex flex-col py-0.5">
    <p className="font-bold text-[var(--theme-text)] text-xs line-clamp-1">{title || '-'}</p>
    {subtitle && <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] mt-0.5 line-clamp-1">{subtitle}</p>}
  </div>
);

// Cell for Action Buttons
export const ActionButton = ({ onClick, icon, label, disabled = false }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick && onClick(e); }}
    disabled={disabled}
    className="inline-flex items-center justify-center gap-1.5 h-8 px-3 text-xs font-bold text-[var(--theme-text-muted)] bg-white border border-[var(--theme-border)] rounded-lg hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)] transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
  >
    {icon && <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{icon}</span>}
    {label}
  </button>
);
