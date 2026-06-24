import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useKencanaAssignmentQuery, useSubmitAssignmentMutation } from '@/queries/useKencanaQuery';
import { ErrorPanel, fmtDate, KencanaShell, LoadingPanel, PrimaryButton, StatusBadge } from './components';

export default function KencanaAssignmentPage() {
  const { assignmentId } = useParams();
  const { data, isLoading, isError } = useKencanaAssignmentQuery(assignmentId);
  const submit = useSubmitAssignmentMutation();
  const [answerText, setAnswerText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  
  if (isLoading) return <KencanaShell title="Tugas Kencana" breadcrumbs={[{ label: 'Dashboard', to: '/app/student/kencana' }, { label: 'Tugas' }]}><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Tugas Kencana" breadcrumbs={[{ label: 'Dashboard', to: '/app/student/kencana' }, { label: 'Tugas' }]}><ErrorPanel message="Tugas tidak ditemukan." /></KencanaShell>;
  
  const assignment = data?.assignment || {};
  const submission = data?.submission || {};
  const canSubmit = data?.can_submit ?? true;
  const lockReason = data?.lock_reason;
  
  const handleSubmit = () => submit.mutate({ assignmentId, payload: { answer_text: answerText, link_url: linkUrl, file_url: fileUrl } }, { onSuccess: () => toast.success('Tugas dikumpulkan') });
  
  const now = new Date();
  const openAt = assignment.open_at ? new Date(assignment.open_at) : null;
  const closeAt = assignment.due_date ? new Date(assignment.due_date) : null;
  const isTooEarly = openAt && now < openAt;
  const isPastDue = closeAt && now > closeAt;
  const isAssignmentActive = assignment.status === 'published' && !isTooEarly && !isPastDue && canSubmit;
  
  return (
    <KencanaShell title={assignment.title || 'Tugas Kencana'} subtitle={assignment.description} breadcrumbs={[{ label: 'Dashboard', to: '/app/student/kencana' }, { label: assignment.title || 'Tugas' }]}>
      <section className="grid gap-5 lg:grid-cols-[1fr_0.6fr]">
        <div className="glass-card p-6 shadow-sm">
          <h2 className="text-xl font-bold font-headline text-slate-800">Form Pengumpulan</h2>
          
          {lockReason && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">lock</span> {lockReason}
            </div>
          )}
          {isTooEarly && (
            <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-sm">
              Tugas ini belum dibuka. Anda dapat mengumpulkan tugas mulai dari {fmtDate(assignment.open_at)}.
            </div>
          )}
          {isPastDue && (
            <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 font-semibold text-sm">
              Tenggat waktu tugas ini telah berakhir. Anda tidak dapat mengirimkan jawaban lagi.
            </div>
          )}
          {assignment.status === 'closed' && (
            <div className="mt-4 p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 font-semibold text-sm">
              Tugas ini telah ditutup oleh admin.
            </div>
          )}

          <div className="mt-5 space-y-4">
            <textarea 
              value={answerText} 
              onChange={(e) => setAnswerText(e.target.value)} 
              rows={7} 
              disabled={!isAssignmentActive}
              placeholder={isAssignmentActive ? "Tulis jawaban/refleksi tugas..." : "Form terkunci..."} 
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-[var(--theme-primary)] transition-all disabled:opacity-60" 
            />
            <input 
              value={linkUrl} 
              onChange={(e) => setLinkUrl(e.target.value)} 
              placeholder={isAssignmentActive ? "Link pengumpulan (opsional)" : "Form terkunci..."} 
              disabled={!isAssignmentActive}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-[var(--theme-primary)] transition-all disabled:opacity-60" 
            />
            <input 
              value={fileUrl} 
              onChange={(e) => setFileUrl(e.target.value)} 
              placeholder={isAssignmentActive ? "URL file upload (opsional)" : "Form terkunci..."} 
              disabled={!isAssignmentActive}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-bold outline-none focus:border-[var(--theme-primary)] transition-all disabled:opacity-60" 
            />
            <div className="pt-2">
              <PrimaryButton onClick={handleSubmit} disabled={submit.isPending || !isAssignmentActive} className={!isAssignmentActive ? "opacity-50 cursor-not-allowed" : ""}>
                {submit.isPending ? 'Mengumpulkan...' : 'Kumpulkan Tugas'}
              </PrimaryButton>
            </div>
          </div>
        </div>
        <aside className="space-y-5">
          <div className="glass-card p-6 shadow-sm">
            <h2 className="text-xl font-bold font-headline text-slate-800">Timeline & Status</h2>
            <div className="mt-5 grid grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Status Tugas</p>
                <div className="mt-1">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold ${assignment.status === 'published' ? 'bg-emerald-100 text-emerald-700' : assignment.status === 'closed' ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-700'}`}>
                    {assignment.status === 'published' ? 'Aktif / Berjalan' : assignment.status === 'closed' ? 'Tutup' : 'Draft'}
                  </span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress Saya</p>
                <div className="mt-1"><StatusBadge status={submission.status || 'not_started'} /></div>
              </div>
            </div>
            
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"><span className="material-symbols-outlined text-sm">schedule</span></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dibuka (Open At)</p><p className="text-sm font-black text-slate-700">{fmtDate(assignment.open_at) || '-'}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-100 text-rose-600"><span className="material-symbols-outlined text-sm">event_busy</span></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Ditutup (Due Date)</p><p className="text-sm font-black text-slate-700">{fmtDate(assignment.due_date) || '-'}</p></div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600"><span className="material-symbols-outlined text-sm">category</span></div>
                <div><p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tipe Submission</p><p className="text-sm font-black text-slate-700">{assignment.submission_type}</p></div>
              </div>
            </div>
          </div>
          
          {(submission.score !== undefined && submission.score !== null) && (
            <div className="glass-card p-6 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold font-headline text-[var(--theme-text-muted)] uppercase tracking-widest">Nilai Akhir</p>
                <p className="text-4xl font-black text-slate-800 mt-1">{submission.score}</p>
              </div>
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-black">A</div>
            </div>
          )}
          {submission.feedback && (
            <div className="rounded-xl border border-[var(--theme-warning)]/20 bg-[var(--theme-warning)]/10 p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2"><span className="material-symbols-outlined text-[var(--theme-warning)]">forum</span><h3 className="text-sm font-bold font-headline text-[var(--theme-warning)]">Feedback Mentor</h3></div>
              <p className="text-sm font-semibold text-[var(--theme-warning)]/90">{submission.feedback}</p>
            </div>
          )}
        </aside>
      </section>
    </KencanaShell>
  );
}
