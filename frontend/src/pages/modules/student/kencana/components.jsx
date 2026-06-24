import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard/DashboardHero';

export const statusLabels = {
  not_started: 'Belum Dikerjakan',
  in_progress: 'Sedang Berjalan',
  waiting_schedule: 'Menunggu Jadwal',
  completed: 'Selesai',
  passed: 'Lulus',
  conditional_pass: 'Lulus Bersyarat',
  remedial: 'Remedial',
  not_eligible: 'Belum Memenuhi Syarat',
  active: 'Aktif',
  locked: 'Terkunci',
  not_open: 'Belum Dibuka',
  submitted: 'Sudah Dikirim',
  approved: 'Disetujui',
  draft: 'Draft',
  pending: 'Menunggu Konfirmasi',
  rejected: 'Ditolak',
  ready: 'Belum Dimulai',
};

export function fmtDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function fmtTime(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value)) + ' WIB';
}

export function fmtLongDate(value) {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date(value));
}

export function isToday(value) {
  if (!value) return false;
  const d1 = new Date(value);
  const d2 = new Date();
  return d1.getDate() === d2.getDate() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
}

export function KencanaShell({ title, highlightedTitle, subtitle, actions, badges, breadcrumbs, children }) {
  const { pathname } = useLocation();
  const isDashboard = pathname.endsWith('/app/student/kencana') || pathname.endsWith('/app/dashboard/student-kencana');

  const defaultBreadcrumbs = [
    { label: 'Student Hub', path: '/app/student/dashboard' },
    { label: 'Kencana', path: isDashboard ? null : '/app/student/kencana' }
  ];

  const finalBreadcrumbs = breadcrumbs ? [
    { label: 'Student Hub', path: '/app/student/dashboard' },
    { label: 'Kencana', path: '/app/student/kencana' },
    ...breadcrumbs.map(bc => ({ label: bc.label, path: bc.to }))
  ] : defaultBreadcrumbs;

  return (
    <PageContent>
      <DashboardHero
        title={title}
        highlightedTitle={highlightedTitle}
        subtitle={subtitle}
        breadcrumbs={isDashboard ? undefined : finalBreadcrumbs}
        actions={actions}
        badges={badges}
        icon="school"
      />
      <div className="w-full space-y-6">
        {children}
      </div>
    </PageContent>
  );
}

export function StatusBadge({ status }) {
  const s = status || 'not_started';
  const tone = s === 'passed' || s === 'approved' || s === 'completed' || s === 'active'
    ? 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20'
    : s === 'remedial' || s === 'not_eligible' || s === 'rejected'
      ? 'bg-[var(--theme-error)]/10 text-[var(--theme-error)] border-[var(--theme-error)]/20'
      : s === 'conditional_pass' || s === 'submitted' || s === 'pending'
        ? 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)] border-[var(--theme-warning)]/20'
        : 'bg-[var(--theme-border-muted)] text-[var(--theme-text-muted)] border-border';
  return <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-wider ${tone}`}>{statusLabels[s] || s}</span>;
}

export function MetricCard({ label, value, hint, icon = 'analytics' }) {
  return (
    <div className="glass-card p-5 group hover:border-[var(--theme-primary-light)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">{label}</p>
          <p className="mt-2 text-3xl font-black text-[var(--theme-text)] font-headline">{value}</p>
          {hint && <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)] opacity-80">{hint}</p>}
        </div>
        <div className="grid size-11 place-items-center rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] group-hover:bg-[var(--theme-primary)] group-hover:text-white transition-all duration-300">
          <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{icon}</span>
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({ value = 0 }) {
  return (
    <div className="h-3 overflow-hidden rounded-full bg-[var(--theme-border-muted)]">
      <div className="h-full rounded-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-secondary)] transition-all" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

export function LoadingPanel() {
  return <div className="glass-card p-8 text-sm font-bold text-[var(--theme-text-muted)] flex justify-center items-center"><span className="material-symbols-outlined animate-spin mr-3">sync</span> Memuat data Kencana...</div>;
}

export function ErrorPanel({ message = 'Data belum tersedia.' }) {
  return <div className="glass-card !border-[var(--theme-error)]/20 !bg-[var(--theme-error)]/5 p-8 text-sm font-bold text-[var(--theme-error)] flex items-center"><span className="material-symbols-outlined mr-3 text-xl">error</span> {message}</div>;
}

export function PrimaryButton({ to, children, onClick, disabled }) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition ${disabled ? 'bg-[var(--theme-border-muted)] text-[var(--theme-text-subtle)] cursor-not-allowed' : 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:bg-[var(--theme-primary-hover)] shadow-sm'}`;
  if (to && !disabled) return <Link to={to} className={cls}>{children}</Link>;
  return <button onClick={onClick} disabled={disabled} className={cls}>{children}</button>;
}
