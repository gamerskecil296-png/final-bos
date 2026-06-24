import React from 'react';
import { Link } from 'react-router-dom';
import { useKencanaTimelineQuery } from '@/queries/useKencanaQuery';
import { ErrorPanel, fmtDate, KencanaShell, LoadingPanel, ProgressBar, StatusBadge } from './components';

export default function KencanaTimelinePage() {
  const { data, isLoading, isError } = useKencanaTimelineQuery();
  if (isLoading) return <KencanaShell title="Timeline Kencana"><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Timeline Kencana"><ErrorPanel message="Gagal memuat timeline." /></KencanaShell>;
  const stages = data?.stages || [];
  return (
    <KencanaShell title="Timeline Kencana" subtitle="Tahapan berasal dari jadwal yang dibuat dan dipublish admin, tanpa durasi hardcode." breadcrumbs={[{ label: 'Timeline' }]}>
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <Link key={stage.id} to={`/student/kencana/stage/${stage.id}`} className="group grid gap-4 glass-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-[var(--theme-primary-light)] md:grid-cols-[80px_1fr_auto]">
            <div className="grid size-16 place-items-center rounded-2xl bg-[var(--theme-primary)] text-xl font-bold font-headline text-white shadow-sm">{index + 1}</div>
            <div>
              <div className="flex flex-wrap items-center gap-3"><h2 className="text-xl font-bold font-headline text-slate-800 leading-tight">{stage.name}</h2><StatusBadge status={stage.status} /></div>
              <p className="mt-2 text-sm font-medium text-slate-600 leading-relaxed">{stage.description}</p>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-400">{fmtDate(stage.start_date)} - {fmtDate(stage.end_date)}</p>
              <div className="mt-4 max-w-md"><ProgressBar value={stage.progress || 0} /></div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center md:w-72">
              <Mini label="Sesi" value={stage.session_count} />
              <Mini label="Quiz" value={stage.quiz_count} />
              <Mini label="Tugas" value={stage.assignment_count} />
            </div>
          </Link>
        ))}
      </div>
    </KencanaShell>
  );
}

function Mini({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 flex flex-col justify-center transition-colors group-hover:bg-slate-100">
      <p className="text-lg font-bold font-headline text-slate-800 leading-none">{value || 0}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
    </div>
  );
}
