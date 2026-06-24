import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useKencanaHandbookQuery, useSaveHandbookDraftMutation, useSubmitHandbookMutation } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, PrimaryButton, StatusBadge } from './components';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';

export default function KencanaHandbookPage() {
  const { data, isLoading, isError } = useKencanaHandbookQuery();
  const saveDraft = useSaveHandbookDraftMutation();
  const submit = useSubmitHandbookMutation();
  const [form, setForm] = useState({ refleksi: '', komitmen: '', rencana: '' });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (data?.content_json) {
      let content = {};
      try {
        content = typeof data.content_json === 'string' ? JSON.parse(data.content_json || '{}') : data.content_json;
      } catch {
        content = {};
      }
      setForm({ refleksi: content.refleksi || '', komitmen: content.komitmen || '', rencana: content.rencana || '' });
    }
  }, [data]);

  if (isLoading) return <KencanaShell title="Handbook"><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Handbook"><ErrorPanel message="Gagal memuat handbook." /></KencanaShell>;

  const hasSubmitted = data?.status === 'submitted' || data?.status === 'approved';

  const actionDraft = () => {
    saveDraft.mutate(form, { onSuccess: () => toast.success('Draft handbook disimpan') });
  };

  const actionSubmit = () => {
    setShowConfirm(false);
    submit.mutate(form, { onSuccess: () => toast.success('Handbook dikirim') });
  };

  return (
    <KencanaShell title="Handbook Mahasiswa" subtitle="Handbook wajib diisi dan disetujui agar bisa lulus penuh.">
      <DialogModal
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Konfirmasi Pengiriman"
        description="Apakah Anda yakin ingin mengirimkan handbook ini? Setelah terkirim, Anda tidak dapat mengubah isinya kecuali ditolak oleh pembimbing."
        icon="send_check"
        maxWidth="max-w-md"
        footer={
          <>
            <ModalCancelButton onClick={() => setShowConfirm(false)} />
            <ModalSaveButton onClick={actionSubmit} loading={submit.isPending} text="Ya, Kumpulkan!" icon="send">
              Ya, Kirimkan
            </ModalSaveButton>
          </>
        }
      >
        <div className="text-sm font-medium text-[var(--theme-text)]">
          Pastikan semua refleksi, komitmen, dan rencana pengembangan diri sudah sesuai.
        </div>
      </DialogModal>

      <section className="grid gap-6 lg:grid-cols-[1fr_300px] items-start">
        <div className="glass-card p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-[var(--theme-border-muted)] pb-4 flex justify-between items-start gap-4">
            <div>
              <h3 className="text-lg font-black text-[var(--theme-text)] uppercase tracking-tight flex items-center gap-2 mb-1.5">
                <span className="material-symbols-outlined text-[var(--theme-primary)]">edit_document</span> Formulir Pengisian
              </h3>
              <p className="text-xs font-bold text-[var(--theme-text-muted)]">Isi poin-poin refleksi dan rencana Anda selama mengikuti program Kencana.</p>
            </div>
          </div>

          <div className="space-y-6">
            <Field label="Refleksi Kencana" value={form.refleksi} onChange={(v) => setForm({ ...form, refleksi: v })} disabled={hasSubmitted} />
            <Field label="Komitmen Mahasiswa" value={form.komitmen} onChange={(v) => setForm({ ...form, komitmen: v })} disabled={hasSubmitted} />
            <Field label="Rencana Pengembangan Diri" value={form.rencana} onChange={(v) => setForm({ ...form, rencana: v })} disabled={hasSubmitted} />
          </div>
          
          <div className="pt-4 flex flex-wrap items-center gap-3 border-t border-[var(--theme-border-muted)]">
            {!hasSubmitted ? (
              <>
                <button onClick={actionDraft} disabled={saveDraft.isPending || submit.isPending} className="h-10 px-5 rounded-xl border border-[var(--theme-primary)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  {saveDraft.isPending ? <span className="material-symbols-outlined animate-spin" style={{fontSize: 16}}>sync</span> : <span className="material-symbols-outlined" style={{fontSize: 16}}>save</span>}
                  Simpan Draft
                </button>
                <button onClick={() => setShowConfirm(true)} disabled={submit.isPending} className="h-10 px-5 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white font-black text-[10px] uppercase tracking-widest transition-colors flex items-center gap-2 shadow-md shadow-[var(--theme-primary)]/20 disabled:opacity-50 disabled:cursor-not-allowed">
                  <span className="material-symbols-outlined" style={{fontSize: 16}}>send</span>
                  Kirim Handbook
                </button>
              </>
            ) : (
              <div className="h-10 px-5 rounded-xl bg-[var(--theme-success)]/10 text-[var(--theme-success)] border border-[var(--theme-success)]/20 font-black text-[10px] uppercase tracking-widest flex items-center gap-2 w-full sm:w-auto">
                <span className="material-symbols-outlined" style={{fontSize: 16}}>check_circle</span>
                Handbook Sudah Terkirim
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-6">
          <div className="glass-card p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--theme-primary)]/10 to-transparent rounded-bl-full pointer-events-none"></div>
            <div className="relative z-10">
              <h2 className="text-sm font-black text-[var(--theme-text)] uppercase tracking-widest flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{fontSize: 20}}>info</span> 
                Informasi Status
              </h2>
              
              <div className="bg-[var(--theme-bg)]/50 p-4 rounded-xl border border-[var(--theme-border)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] mb-2">Status Saat Ini</p>
                <StatusBadge status={data?.status} />
              </div>

              {data?.feedback && (
                <div className="mt-4 p-4 rounded-xl bg-[var(--theme-warning)]/10 border border-[var(--theme-warning)]/20">
                   <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-warning)] mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-sm">warning</span> Catatan Mentor</p>
                   <p className="text-xs font-bold text-[var(--theme-text)]">{data.feedback}</p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </section>
    </KencanaShell>
  );
}

function Field({ label, value, onChange, disabled }) { 
  return (
    <label className="block group">
      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] group-focus-within:text-[var(--theme-primary)] transition-colors">{label}</span>
      <textarea 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        disabled={disabled}
        rows={6} 
        placeholder={`Tulis ${label.toLowerCase()} di sini...`}
        className="mt-2 w-full rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)]/50 p-4 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] focus:bg-white focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all disabled:opacity-50 disabled:bg-[var(--theme-bg)] shadow-sm resize-none custom-scrollbar" 
      />
    </label>
  ); 
}
