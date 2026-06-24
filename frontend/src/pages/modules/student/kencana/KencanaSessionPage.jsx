import React from 'react';
import { Link, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useCompleteMaterialMutation, useKencanaSessionQuery } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, PrimaryButton, StatusBadge } from './components';

export default function KencanaSessionPage() {
  const { sessionId } = useParams();
  const { data, isLoading, isError } = useKencanaSessionQuery(sessionId);
  const completeMaterial = useCompleteMaterialMutation();
  if (isLoading) return <KencanaShell title="Detail Sesi" breadcrumbs={[{ label: 'Dashboard', to: '/student/kencana' }, { label: 'Detail Sesi' }]}><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Detail Sesi" breadcrumbs={[{ label: 'Dashboard', to: '/student/kencana' }, { label: 'Detail Sesi' }]}><ErrorPanel message="Sesi tidak ditemukan atau terkunci." /></KencanaShell>;
  

  // Periksa apakah masih ada quiz di sesi ini yang belum dikerjakan (attempts_used === 0)
  const hasPendingQuizzes = (data?.quizzes || []).some(q => q.attempts_used === 0);

  return (
    <KencanaShell title={data?.title || 'Detail Sesi'} subtitle={data?.description} breadcrumbs={[{ label: 'Dashboard', to: '/student/kencana' }, { label: data?.title || 'Detail Sesi' }]}>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <section className="glass-card p-6 shadow-sm">
          <h2 className="text-xl font-bold font-headline text-slate-800">Materi</h2>
          <div className="mt-5 space-y-4">
            {(data?.materials || []).map((m) => (
                  <article key={m.id} className="rounded-xl bg-slate-50 border border-slate-200 p-5 transition-colors hover:bg-white hover:border-[var(--theme-primary-light)]">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-bold font-headline text-slate-800 leading-tight">{m.title}</h3>
                      {m.status === 'completed' && <span className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200">Selesai</span>}
                    </div>
                    <p className="mt-3 text-sm font-medium leading-relaxed text-slate-500">{m.content || 'Materi belum memiliki konten.'}</p>
                    {m.file_url && (
                      <a 
                        className="mt-3 inline-block text-sm font-black text-blue-600 hover:text-blue-800 transition-colors" 
                        href={m.file_url.startsWith('http') ? m.file_url : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000'}${m.file_url}`} 
                        target="_blank" 
                        rel="noreferrer"
                      >
                        Buka Lampiran
                      </a>
                    )}
                  </div>
                  <div className="shrink-0 self-start">
                    {m.status !== 'completed' && (
                      <button
                        onClick={() => completeMaterial.mutate(m.id)}
                        disabled={completeMaterial.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--theme-primary)] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-[var(--theme-primary-hover)] transition-all cursor-pointer disabled:opacity-50 border-none"
                      >
                        {completeMaterial.isPending ? <span className="material-symbols-outlined animate-spin" style={{fontSize:14}}>sync</span> : <span className="material-symbols-outlined" style={{fontSize:14}}>check</span>}
                        Tandai Selesai
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
            {!(data?.materials || []).length && <Empty label="Belum ada materi" desc="Materi akan tampil di sini setelah admin menambahkannya." />}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="glass-card p-6 shadow-sm">
            <h2 className="text-xl font-bold font-headline text-slate-800">Quiz</h2>
            <div className="mt-5 space-y-3">
              {(data?.quizzes || []).map((q) => {
                const now = new Date();
                const openAt = q.open_at ? new Date(q.open_at) : null;
                const closeAt = q.close_at ? new Date(q.close_at) : null;
                const isTooEarly = openAt && now < openAt;
                const isPastDue = closeAt && now > closeAt;
                const isActive = q.status === 'published' && !isTooEarly && !isPastDue;
                
                return (
                  <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden transition-all hover:bg-white hover:border-[var(--theme-primary-light)] hover:shadow-sm">
                    <div className={`h-1 w-full ${isActive ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-black text-slate-800">{q.title}</p>
                        <span className="px-2 py-1 bg-white rounded-lg text-[10px] font-bold text-slate-500 border border-slate-200 shadow-sm">
                          {q.duration_minutes}m · {q.attempts_used}/{q.max_attempts}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${q.status === 'published' ? 'bg-emerald-100 text-emerald-700' : q.status === 'closed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                          {q.status === 'published' ? 'Aktif' : q.status === 'closed' ? 'Tutup' : 'Draft'}
                        </span>
                        {isTooEarly && <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700">Belum Dibuka</span>}
                        {isPastDue && <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-rose-100 text-rose-700">Terlewat</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-blue-100 mb-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buka</p>
                          <p className="text-xs font-semibold text-slate-600">{q.open_at ? new Date(q.open_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tutup</p>
                          <p className="text-xs font-semibold text-slate-600">{q.close_at ? new Date(q.close_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : '-'}</p>
                        </div>
                      </div>
                      
                      <PrimaryButton to={`/student/kencana/kuis/${q.id}`} className="w-full text-center block">
                        Detail Quiz
                      </PrimaryButton>
                    </div>
                  </div>
                );
              })}
              {!(data?.quizzes || []).length && <Empty label="Belum ada quiz" desc="Quiz belum tersedia untuk sesi ini." />}
            </div>
          </section>
          <section className="glass-card p-6 shadow-sm">
            <h2 className="text-xl font-bold font-headline text-slate-800">Tugas</h2>
            <div className="mt-5 space-y-4">
              {(data?.assignments || []).map((a) => {
                const now = new Date();
                const openAt = a.open_at ? new Date(a.open_at) : null;
                const closeAt = a.due_date ? new Date(a.due_date) : null;
                const isTooEarly = openAt && now < openAt;
                const isPastDue = closeAt && now > closeAt;
                const isActive = a.status === 'published' && !isTooEarly && !isPastDue;
                
                return (
                  <Link key={a.id} to={`/student/kencana/assignment/${a.id}`} className="block rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-[var(--theme-primary-light)] hover:shadow-sm transition-all overflow-hidden">
                    <div className={`h-1 w-full ${isActive ? 'bg-blue-500' : 'bg-slate-300'}`}></div>
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="font-black text-slate-800">{a.title}</p>
                        <StatusBadge status={a.submission_status || 'not_started'} />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${a.status === 'published' ? 'bg-emerald-100 text-emerald-700' : a.status === 'closed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'}`}>
                          {a.status === 'published' ? 'Aktif' : a.status === 'closed' ? 'Tutup' : 'Draft'}
                        </span>
                        {isTooEarly && <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-amber-100 text-amber-700">Belum Dibuka</span>}
                        {isPastDue && <span className="px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest bg-rose-100 text-rose-700">Terlewat</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-blue-100">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Buka</p>
                          <p className="text-xs font-semibold text-slate-600">{a.open_at ? new Date(a.open_at).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : '-'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tutup</p>
                          <p className="text-xs font-semibold text-slate-600">{a.due_date ? new Date(a.due_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'}) : '-'}</p>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {!(data?.assignments || []).length && <Empty label="Belum ada tugas" desc="Tugas belum tersedia untuk sesi ini." />}
            </div>
          </section>
        </aside>
      </div>
    </KencanaShell>
  );
}

function Empty({ label, desc }) {
  return <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-bold text-slate-500"><p className="text-slate-800">{label}</p><p className="mt-1 font-medium">{desc}</p></div>;
}
