import React from 'react';
import { useKencanaRemedialQuery } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, StatusBadge } from './components';

export default function KencanaRemedialPage() {
  const { data, isLoading, isError } = useKencanaRemedialQuery();
  if (isLoading) return <KencanaShell title="Remedial"><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Remedial"><ErrorPanel message="Gagal memuat remedial." /></KencanaShell>;
  return (
    <KencanaShell title="Remedial Kencana" subtitle="Perbaiki komponen yang belum memenuhi syarat ketika admin membuka remedial.">
      <section className="glass-card p-6 shadow-sm mb-6">
        <h2 className="text-xl font-bold font-headline text-slate-800">Alasan Remedial / Perbaikan</h2>
        <div className="mt-4 space-y-3">
          {(data?.reasons || []).length === 0 ? <p className="rounded-xl bg-[var(--theme-success)]/10 p-4 text-sm font-bold text-[var(--theme-success)]">Tidak ada alasan remedial saat ini.</p> : data.reasons.map((r) => <p key={r} className="rounded-xl bg-[var(--theme-warning)]/10 p-4 text-sm font-bold text-[var(--theme-warning)]">{r}</p>)}
        </div>
      </section>
      <section className="glass-card p-6 shadow-sm">
        <h2 className="text-xl font-bold font-headline text-slate-800">Daftar Remedial Dibuka</h2>
        <div className="mt-4 grid gap-3">
          {(data?.remedials || []).map((r) => <div key={r.id} className="rounded-xl bg-slate-50 border border-slate-100 p-4"><div className="flex justify-between gap-3"><p className="font-bold font-headline text-slate-800">{r.component}</p><StatusBadge status={r.status} /></div><p className="mt-2 text-sm font-medium text-slate-600 leading-relaxed">{r.reason}</p></div>)}
        </div>
      </section>
    </KencanaShell>
  );
}
