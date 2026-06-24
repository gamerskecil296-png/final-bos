import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useKencanaAssignmentQuery, useSubmitAssignmentMutation } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, StatusBadge } from './components';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';

export default function KencanaAssignmentPage() {
  const { assignmentId } = useParams();
  const { data, isLoading, isError, refetch } = useKencanaAssignmentQuery(assignmentId);
  const submit = useSubmitAssignmentMutation();
  const [answerText, setAnswerText] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  
  const [showConfirm, setShowConfirm] = useState(false);
  
  // Update local state when submission data is fetched
  React.useEffect(() => {
    if (data?.submission?.id) {
      setAnswerText(data.submission.answer_text || '');
      setLinkUrl(data.submission.link_url || '');
      setFileUrl(data.submission.file_url || '');
    }
  }, [data?.submission]);

  if (isLoading) return <KencanaShell title="Tugas Kencana" breadcrumbs={[{ label: 'Dashboard', to: '/student/kencana' }, { label: 'Tugas' }]}><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Tugas Kencana" breadcrumbs={[{ label: 'Dashboard', to: '/student/kencana' }, { label: 'Tugas' }]}><ErrorPanel message="Tugas tidak ditemukan." /></KencanaShell>;
  
  const assignment = data?.assignment || {};
  const submission = data?.submission || {};
  const canSubmit = data?.can_submit ?? true;
  const lockReason = data?.lock_reason;
  
  const hasSubmitted = !!submission.id;
  
  const now = new Date();
  const openAt = assignment.open_at ? new Date(assignment.open_at) : null;
  const closeAt = assignment.due_date ? new Date(assignment.due_date) : null;
  const isTooEarly = openAt && now < openAt;
  const isPastDue = closeAt && now > closeAt;
  const isAssignmentActive = assignment.status === 'published' && !isTooEarly && !isPastDue && canSubmit && !hasSubmitted;
  
  const handleSubmit = () => {
    setShowConfirm(false);
    submit.mutate(
      { assignmentId, payload: { answer_text: answerText, link_url: linkUrl, file_url: fileUrl } }, 
      { onSuccess: () => {
          toast.success('Tugas berhasil dikumpulkan!');
          refetch();
      }}
    );
  };
  
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(d).replace(/\./g, ':') + ' WIB';
  };
  
  return (
    <KencanaShell 
      title={assignment.title || 'Tugas Kencana'} 
      subtitle="Detail penugasan dan form pengumpulan" 
      breadcrumbs={[{ label: 'Dashboard', to: '/student/kencana' }, { label: assignment.title || 'Tugas' }]}
    >
      {/* Konfirmasi Pengumpulan Modal */}
      <DialogModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Konfirmasi Pengumpulan"
        description="Apakah Anda yakin ingin mengirimkan tugas ini? Pastikan jawaban Anda sudah final, karena setelah terkirim tugas tidak dapat diubah lagi."
        icon="send_check"
        maxWidth="max-w-md"
        footer={
          <>
            <ModalCancelButton onClick={() => setShowConfirm(false)} />
            <ModalSaveButton onClick={handleSubmit} loading={submit.isPending} text="Ya, Kumpulkan!" icon="send">
              Ya, Kirimkan
            </ModalSaveButton>
          </>
        }
      >
        <div className="text-sm font-medium text-[var(--theme-text)]">
          Tugas: <strong>{assignment.title}</strong> akan diserahkan ke Dewan Pembimbing untuk dinilai.
        </div>
      </DialogModal>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        
        {/* Left Column: Instructions and Form */}
        <div className="space-y-6">
          
          {/* Instruksi Tugas Card */}
          <div className="glass-card p-6 md:p-8 shadow-sm border border-[var(--theme-border-muted)] relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-[var(--theme-primary)]/10 to-transparent rounded-full -mr-20 -mt-20 blur-2xl pointer-events-none"></div>
             
             <div className="relative z-10">
               <div className="flex items-center gap-3 mb-6 border-b border-[var(--theme-border-muted)] pb-4">
                 <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center">
                   <span className="material-symbols-outlined">assignment</span>
                 </div>
                 <div>
                   <h2 className="text-lg font-black font-headline text-[var(--theme-text)]">Instruksi Tugas</h2>
                   <p className="text-[10px] font-bold tracking-widest text-[var(--theme-text-muted)] uppercase">Deskripsi Penugasan</p>
                 </div>
               </div>

               <div className="prose prose-sm max-w-none text-[var(--theme-text)] font-medium leading-relaxed whitespace-pre-wrap">
                 {assignment.description || 'Tidak ada instruksi khusus.'}
               </div>
             </div>
          </div>

          {/* Form Pengumpulan Card */}
          <div className="glass-card p-6 md:p-8 shadow-sm border border-[var(--theme-border-muted)] relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6 border-b border-[var(--theme-border-muted)] pb-4">
                 <div className="w-10 h-10 rounded-xl bg-[var(--theme-success)]/10 text-[var(--theme-success)] flex items-center justify-center">
                   <span className="material-symbols-outlined">send</span>
                 </div>
                 <div>
                   <h2 className="text-lg font-black font-headline text-[var(--theme-text)]">Lembar Pengumpulan</h2>
                   <p className="text-[10px] font-bold tracking-widest text-[var(--theme-text-muted)] uppercase">Kirimkan Hasil Pengerjaan Anda</p>
                 </div>
               </div>
              
              {hasSubmitted && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--theme-success-light)] border border-[var(--theme-success)]/20 text-[var(--theme-success)] font-semibold text-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] mt-0.5">task_alt</span> 
                  <div>
                    <span className="block font-bold">Tugas Telah Dikumpulkan</span>
                    <span className="text-xs opacity-90">Anda telah berhasil mengirimkan tugas ini pada {formatDateTime(submission.submitted_at)}. Form sekarang dikunci.</span>
                  </div>
                </div>
              )}
              {!hasSubmitted && lockReason && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 text-[var(--theme-warning)] font-semibold text-sm flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">lock</span> {lockReason}
                </div>
              )}
              {!hasSubmitted && isTooEarly && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 text-[var(--theme-warning)] font-semibold text-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] mt-0.5">schedule</span> 
                  <div>
                    <span className="block font-bold">Tugas Belum Dibuka</span>
                    <span className="text-xs opacity-90">Anda baru dapat mengumpulkan tugas ini mulai dari {formatDateTime(assignment.open_at)}</span>
                  </div>
                </div>
              )}
              {!hasSubmitted && isPastDue && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--theme-error-light)] border border-[var(--theme-error)]/20 text-[var(--theme-error)] font-semibold text-sm flex items-start gap-3">
                  <span className="material-symbols-outlined text-[20px] mt-0.5">event_busy</span> 
                  <div>
                    <span className="block font-bold">Tenggat Waktu Berakhir</span>
                    <span className="text-xs opacity-90">Anda sudah tidak dapat mengirimkan jawaban lagi.</span>
                  </div>
                </div>
              )}
              {!hasSubmitted && assignment.status === 'closed' && (
                <div className="mb-6 p-4 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] font-semibold text-sm flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">block</span> Tugas ini telah ditutup.
                </div>
              )}

              <div className="space-y-5">
                {(!assignment.submission_type || assignment.submission_type === 'text') && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Teks Jawaban</label>
                    <textarea 
                      value={answerText} 
                      onChange={(e) => setAnswerText(e.target.value)} 
                      rows={8} 
                      disabled={!isAssignmentActive}
                      placeholder={isAssignmentActive ? "Tuliskan jawaban atau refleksi Anda di sini..." : hasSubmitted ? "Sudah dikumpulkan" : "Form terkunci..."} 
                      className="w-full rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 text-sm font-medium outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all disabled:opacity-60 resize-y" 
                    />
                  </div>
                )}
                
                {assignment.submission_type === 'link' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Tautan (URL)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--theme-text-muted)]">link</span>
                      <input 
                        value={linkUrl} 
                        onChange={(e) => setLinkUrl(e.target.value)} 
                        placeholder={isAssignmentActive ? "https://..." : hasSubmitted ? "Sudah dikumpulkan" : "Form terkunci..."} 
                        disabled={!isAssignmentActive}
                        className="w-full pl-12 rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 text-sm font-semibold outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all disabled:opacity-60" 
                      />
                    </div>
                  </div>
                )}
                
                {assignment.submission_type === 'file' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Tautan File</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-[var(--theme-text-muted)]">attach_file</span>
                      <input 
                        value={fileUrl} 
                        onChange={(e) => setFileUrl(e.target.value)} 
                        placeholder={isAssignmentActive ? "URL file Google Drive / OneDrive..." : hasSubmitted ? "Sudah dikumpulkan" : "Form terkunci..."} 
                        disabled={!isAssignmentActive}
                        className="w-full pl-12 rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 text-sm font-semibold outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all disabled:opacity-60" 
                      />
                    </div>
                  </div>
                )}

                {/* If it's undefined/all allowed, show all fields (legacy fallback) */}
                {(!['text','link','file'].includes(assignment.submission_type)) && (
                   <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Teks Jawaban</label>
                        <textarea value={answerText} onChange={e=>setAnswerText(e.target.value)} disabled={!isAssignmentActive} rows={5} placeholder={isAssignmentActive ? "Jawaban teks..." : hasSubmitted ? "Sudah dikumpulkan" : "Terkunci"} className="w-full rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 text-sm font-medium outline-none focus:border-[var(--theme-primary)] transition-all disabled:opacity-60" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Tautan (URL)</label>
                        <input value={linkUrl} onChange={e=>setLinkUrl(e.target.value)} disabled={!isAssignmentActive} placeholder={isAssignmentActive ? "Link pengumpulan (opsional)" : hasSubmitted ? "Sudah dikumpulkan" : "Terkunci"} className="w-full rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 text-sm font-bold outline-none focus:border-[var(--theme-primary)] transition-all disabled:opacity-60" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Tautan File</label>
                        <input value={fileUrl} onChange={e=>setFileUrl(e.target.value)} disabled={!isAssignmentActive} placeholder={isAssignmentActive ? "URL file upload (opsional)" : hasSubmitted ? "Sudah dikumpulkan" : "Terkunci"} className="w-full rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 text-sm font-bold outline-none focus:border-[var(--theme-primary)] transition-all disabled:opacity-60" />
                      </div>
                   </div>
                )}

                <div className="pt-4 border-t border-[var(--theme-border-muted)] flex justify-end">
                  <button 
                    onClick={() => setShowConfirm(true)} 
                    disabled={submit.isPending || !isAssignmentActive} 
                    className={`h-11 px-8 rounded-xl font-black text-xs tracking-widest uppercase transition-all duration-300 flex items-center justify-center gap-2 ${
                      isAssignmentActive 
                        ? 'bg-[var(--theme-primary)] text-white hover:-translate-y-1 hover:shadow-lg hover:shadow-[var(--theme-primary)]/30 active:translate-y-0 border border-transparent' 
                        : hasSubmitted 
                          ? 'bg-[var(--theme-success)] text-white opacity-100 cursor-not-allowed'
                          : 'bg-[var(--theme-border-muted)] text-[var(--theme-text-subtle)] cursor-not-allowed opacity-70'
                    }`}
                  >
                    {submit.isPending ? (
                      <><span className="material-symbols-outlined animate-spin text-[16px]">sync</span> Mengirim...</>
                    ) : hasSubmitted ? (
                      <><span className="material-symbols-outlined text-[16px]">check_circle</span> Tugas Terkirim</>
                    ) : (
                      <><span className="material-symbols-outlined text-[16px]">send</span> Kumpulkan Tugas</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Timeline & Status */}
        <aside className="space-y-6">
          <div className="glass-card p-6 shadow-sm border border-[var(--theme-border-muted)]">
            <h2 className="text-sm font-black font-headline tracking-widest uppercase text-[var(--theme-text)] border-b border-[var(--theme-border-muted)] pb-4 mb-5">Timeline & Status</h2>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="p-3 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] flex flex-col items-center justify-center text-center">
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest mb-1.5">Status</p>
                <StatusBadge status={assignment.status === 'published' ? 'active' : assignment.status === 'closed' ? 'closed' : 'draft'} />
              </div>
              <div className="p-3 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] flex flex-col items-center justify-center text-center">
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest mb-1.5">Progress</p>
                <StatusBadge status={submission.status || 'not_started'} />
              </div>
            </div>
            
            <div className="space-y-4 relative before:absolute before:left-4 before:top-4 before:bottom-4 before:w-px before:bg-[var(--theme-border-muted)]">
              <div className="flex gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-[var(--theme-success-light)] text-[var(--theme-success)] flex items-center justify-center border border-[var(--theme-success)]/20 shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Waktu Dibuka</p>
                  <p className="text-xs font-bold text-[var(--theme-text)] mt-0.5">{formatDateTime(assignment.open_at)}</p>
                </div>
              </div>
              
              <div className="flex gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-[var(--theme-error-light)] text-[var(--theme-error)] flex items-center justify-center border border-[var(--theme-error)]/20 shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[16px]">event_busy</span>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Tenggat Waktu</p>
                  <p className="text-xs font-bold text-[var(--theme-text)] mt-0.5">{formatDateTime(assignment.due_date)}</p>
                </div>
              </div>

              <div className="flex gap-4 relative z-10">
                <div className="w-8 h-8 rounded-full bg-[var(--theme-info-light)] text-[var(--theme-info)] flex items-center justify-center border border-[var(--theme-info)]/20 shadow-sm shrink-0">
                  <span className="material-symbols-outlined text-[16px]">category</span>
                </div>
                <div className="pt-1">
                  <p className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Tipe Tugas</p>
                  <p className="text-xs font-bold text-[var(--theme-text)] mt-0.5 uppercase">{assignment.submission_type || 'Teks Online'}</p>
                </div>
              </div>
            </div>
          </div>
          
          {(submission.score !== undefined && submission.score !== null) && (
            <div className="glass-card p-6 shadow-sm border border-[var(--theme-border-muted)] bg-gradient-to-br from-[var(--theme-success-light)] to-[var(--theme-surface)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-[var(--theme-success)] uppercase tracking-widest mb-1">Nilai Akhir</p>
                  <p className="text-4xl font-black text-[var(--theme-text)] font-headline">{submission.score}</p>
                </div>
                <div className="w-16 h-16 rounded-full bg-[var(--theme-success)] text-white flex items-center justify-center shadow-lg shadow-[var(--theme-success)]/30 border-2 border-white/50">
                  <span className="material-symbols-outlined text-3xl">workspace_premium</span>
                </div>
              </div>
            </div>
          )}

          {submission.feedback && (
            <div className="glass-card p-6 shadow-sm border border-[var(--theme-warning)]/20 bg-[var(--theme-warning-light)]">
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[var(--theme-warning)]/20">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-warning)] text-white flex items-center justify-center shadow-sm">
                  <span className="material-symbols-outlined text-[16px]">forum</span>
                </div>
                <h3 className="text-xs font-black tracking-widest text-[var(--theme-warning)] uppercase font-headline">Umpan Balik</h3>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-[var(--theme-warning)]/90 italic">"{submission.feedback}"</p>
            </div>
          )}
        </aside>

      </section>
    </KencanaShell>
  );
}
