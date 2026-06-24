import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useSessionDetailQuery,
  useDeleteQuizMutation,
  useCreateQuizMutation,
  useUpdateQuizMutation
} from '@/queries/useKencanaAdminQuery';
import { DialogModal } from '@/components/ui/DialogModal';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import toast from 'react-hot-toast';

const StatusBadge = ({ status }) => {
  const map = {
    published: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]',
    active: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]',
    locked: 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]',
    draft: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]',
    completed: 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info-light)]',
    closed: 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error-light)]',
  };
  const labelMap = { published: 'Diterbitkan', active: 'Aktif', locked: 'Terkunci', draft: 'Draft', completed: 'Selesai', closed: 'Ditutup' };
  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${map[status] || 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'}`}>
      {labelMap[status] || status}
    </span>
  );
};

export const ManageQuizzesModal = ({ open, onOpenChange, sessionId }) => {
  const navigate = useNavigate();
  const getBasePath = () => {
    const p = window.location.pathname;
    if (p.includes('/app/dashboard/kencana-fakultas-admin')) return '/app/dashboard/kencana-fakultas-admin';
    if (p.includes('/kencana-fakultas')) return '/kencana-fakultas';
    if (p.includes('/kencana-fakult')) return '/kencana-fakult';
    return '/app/kencana/dashboard';
  };
  const basePath = getBasePath();
  const { data: session, isLoading } = useSessionDetailQuery(sessionId, { enabled: !!sessionId && open });
  
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingQuiz, setEditingQuiz] = useState(null);
  
  const deleteQuizMutation = useDeleteQuizMutation();
  const createQuizMutation = useCreateQuizMutation();
  const updateQuizMutation = useUpdateQuizMutation();

  const [form, setForm] = useState({ 
    title: '', 
    duration_minutes: 30, 
    max_attempts: 1, 
    open_at: '',
    close_at: '',
    status: 'draft' 
  });

  useEffect(() => {
    if (open) {
      setView('list');
      setEditingQuiz(null);
    }
  }, [open]);

  const toLocalDatetimeStr = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d)) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (view === 'form' && editingQuiz) {
      setForm({
        title: editingQuiz.title,
        duration_minutes: editingQuiz.duration_minutes || 30,
        max_attempts: editingQuiz.max_attempts || 1,
        open_at: toLocalDatetimeStr(editingQuiz.open_at),
        close_at: toLocalDatetimeStr(editingQuiz.close_at),
        status: editingQuiz.status || 'draft'
      });
    } else if (view === 'form') {
      setForm({ 
        title: '', 
        duration_minutes: 30, 
        max_attempts: 1, 
        open_at: '',
        close_at: '',
        status: 'draft' 
      });
    }
  }, [view, editingQuiz]);

  const handleDelete = (id) => {
    if (window.confirm('Hapus kuis ini? Semua soal di dalamnya akan ikut terhapus.')) {
      deleteQuizMutation.mutate(id);
    }
  };

  const handleOpenEdit = (q) => {
    setEditingQuiz(q);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;
    
    const payload = { ...form };
    const formatApiDate = (d) => {
      if (!d) return null;
      return new Date(d).toISOString();
    };
    payload.open_at = formatApiDate(payload.open_at);
    payload.close_at = formatApiDate(payload.close_at);
    payload.session_id = session.id;

    try {
      if (editingQuiz) {
        await updateQuizMutation.mutateAsync({ id: editingQuiz.id, ...payload });
        toast.success('Kuis berhasil diperbarui!');
      } else {
        await createQuizMutation.mutateAsync(payload);
        toast.success('Kuis berhasil dibuat!');
      }
      setEditingQuiz(null);
      setView('list');
    } catch (err) {
      toast.error('Gagal menyimpan kuis');
    }
  };

  const isSaving = createQuizMutation.isPending || updateQuizMutation.isPending;

  if (!sessionId) return null;

  return (
    <DialogModal
      open={open}
      onOpenChange={onOpenChange}
      title={view === 'list' ? `Kelola Kuis: ${session?.title || '...'}` : editingQuiz ? 'Edit Pengaturan Kuis' : 'Tambah Kuis Baru'}
      description={view === 'list' ? 'Kelola semua kuis untuk sesi ini. Setidaknya 1 kuis wajib agar peserta bisa melaju ke tahap berikutnya.' : 'Isi form untuk membuat kuis baru. Link gform disarankan.'}
      maxWidth="max-w-2xl"
    >
      <div className="max-h-[70vh] overflow-y-auto pr-2">
        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
          </div>
        ) : view === 'list' ? (
          <div className="space-y-6">
            <div className="flex justify-end">
              <button 
                onClick={() => {
                  setEditingQuiz(null);
                  setView('form');
                }}
                className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                + Tambah Kuis
              </button>
            </div>

            {!session?.quizzes?.length ? (
              <div className="bg-white border border-dashed border-[var(--theme-border)] rounded-2xl p-12 text-center text-[var(--theme-text-subtle)]">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    <span className="material-symbols-outlined text-4xl text-slate-300">timer</span>
                  </div>
                </div>
                <p className="font-bold text-sm text-[var(--theme-text)]">Belum ada kuis</p>
                <p className="text-xs text-[var(--theme-text-muted)] mt-1">Uji pemahaman peserta dengan menambahkan kuis evaluasi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.quizzes.map(q => (
                  <div key={q.id} className="bg-white p-5 rounded-2xl border border-[var(--theme-border)] hover:border-[var(--theme-secondary)] hover:shadow-md transition-all">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h4 className="font-bold text-[var(--theme-text)] text-sm line-clamp-2">{q.title}</h4>
                      <StatusBadge status={q.status} />
                    </div>
                    <div className="flex gap-4 mb-4">
                      <div className="flex flex-col bg-[var(--theme-bg)] rounded-xl p-2 flex-1 items-center border border-[var(--theme-border)]">
                        <span className="text-[9px] text-[var(--theme-text-subtle)] font-bold uppercase tracking-wider mb-1">Durasi</span>
                        <span className="text-xs font-bold text-[var(--theme-text)]">{q.duration_minutes} Menit</span>
                      </div>
                      <div className="flex flex-col bg-[var(--theme-bg)] rounded-xl p-2 flex-1 items-center border border-[var(--theme-border)]">
                        <span className="text-[9px] text-[var(--theme-text-subtle)] font-bold uppercase tracking-wider mb-1">Max Coba</span>
                        <span className="text-xs font-bold text-[var(--theme-text)]">{q.max_attempts}x</span>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--theme-border-muted)] mt-4">
                      <button onClick={() => handleOpenEdit(q)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border border-[var(--theme-border)] hover:bg-[var(--theme-bg)] transition-colors">
                        Edit Kuis
                      </button>
                      <button onClick={() => navigate(`${basePath}/quiz/${q.id}/builder`)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm">
                        Kelola Soal →
                      </button>
                      <button onClick={() => handleDelete(q.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-error-light)] text-[var(--theme-error)] hover:opacity-85 transition-colors">
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] mb-1">Judul Kuis</label>
              <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:outline-none focus:border-[var(--theme-primary)] text-sm font-semibold" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] mb-1">Durasi (Menit)</label>
                <input type="number" required min="1" value={form.duration_minutes} onChange={e => setForm({...form, duration_minutes: Number(e.target.value)})} className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:outline-none focus:border-[var(--theme-primary)] text-sm font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] mb-1">Maksimal Percobaan</label>
                <input type="number" required min="1" value={form.max_attempts} onChange={e => setForm({...form, max_attempts: Number(e.target.value)})} className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:outline-none focus:border-[var(--theme-primary)] text-sm font-semibold" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] mb-1">Waktu Buka (Open At)</label>
                <input type="datetime-local" value={form.open_at} onChange={e => setForm({...form, open_at: e.target.value})} className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:outline-none focus:border-[var(--theme-primary)] text-sm font-semibold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] mb-1">Tenggat (Close At)</label>
                <input type="datetime-local" value={form.close_at} onChange={e => setForm({...form, close_at: e.target.value})} className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:outline-none focus:border-[var(--theme-primary)] text-sm font-semibold" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] mb-1">Status Kuis</label>
              <SelectField
                value={form.status}
                onValueChange={(val) => setForm({ ...form, status: val })}
                className="w-full"
              >
                <SelectOption value="draft">Draft (Disembunyikan)</SelectOption>
                <SelectOption value="published">Diterbitkan (Aktif)</SelectOption>
                <SelectOption value="closed">Ditutup</SelectOption>
              </SelectField>
              <p className="text-[10px] text-[var(--theme-warning)] mt-1.5 font-bold">Pastikan status "Diterbitkan (Aktif)" agar kuis bisa dikerjakan.</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--theme-border-muted)] mt-8">
              <button type="button" onClick={() => { setView('list'); setEditingQuiz(null); }} className="px-5 py-2.5 rounded-xl font-bold text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors text-xs">Kembali</button>
              <button type="submit" disabled={isSaving} className="px-5 py-2.5 h-10 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-bold rounded-xl shadow-md transition-colors">{isSaving ? 'Menyimpan...' : 'Simpan Kuis'}</button>
            </div>
          </form>
        )}
      </div>
    </DialogModal>
  );
};
