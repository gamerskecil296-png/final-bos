import React, { useState, useEffect } from 'react';
import {
  useSessionDetailQuery,
  useDeleteAssignmentMutation,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation
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

export const ManageAssignmentsModal = ({ open, onOpenChange, sessionId }) => {
  const { data: session, isLoading } = useSessionDetailQuery(sessionId, { enabled: !!sessionId && open });
  
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingAssignment, setEditingAssignment] = useState(null);
  
  const deleteAssignmentMutation = useDeleteAssignmentMutation();
  const createAssignmentMutation = useCreateAssignmentMutation();
  const updateAssignmentMutation = useUpdateAssignmentMutation();

  const [form, setForm] = useState({ 
    title: '', 
    description: '', 
    submission_type: 'text', 
    open_at: '',
    due_date: '', 
    status: 'published', 
    is_required: true 
  });

  useEffect(() => {
    if (open) {
      setView('list');
      setEditingAssignment(null);
    }
  }, [open]);

  useEffect(() => {
    if (view === 'form' && editingAssignment) {
      setForm({
        title: editingAssignment.title,
        description: editingAssignment.description || '',
        submission_type: editingAssignment.submission_type || 'text',
        open_at: editingAssignment.open_at ? editingAssignment.open_at.slice(0, 16) : '',
        due_date: editingAssignment.due_date ? editingAssignment.due_date.slice(0, 16) : '',
        status: editingAssignment.status || 'published',
        is_required: editingAssignment.is_required ?? true,
      });
    } else if (view === 'form') {
      setForm({ 
        title: '', 
        description: '', 
        submission_type: 'text', 
        open_at: '',
        due_date: '', 
        status: 'published', 
        is_required: true 
      });
    }
  }, [view, editingAssignment]);

  const handleDelete = (id) => {
    if (window.confirm('Hapus tugas ini?')) {
      deleteAssignmentMutation.mutate(id);
    }
  };

  const handleOpenEdit = (a) => {
    setEditingAssignment(a);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;
    
    const payload = { ...form };
    const formatApiDate = (d) => {
      if (!d) return null;
      if (d.length === 16) return d + ':00Z';
      return d;
    };
    payload.open_at = formatApiDate(payload.open_at);
    payload.due_date = formatApiDate(payload.due_date);
    payload.session_id = session.id;

    try {
      if (editingAssignment) {
        await updateAssignmentMutation.mutateAsync({ id: editingAssignment.id, ...payload });
        toast.success('Tugas berhasil diperbarui!');
      } else {
        await createAssignmentMutation.mutateAsync(payload);
        toast.success('Tugas berhasil dibuat!');
      }
      setEditingAssignment(null);
      setView('list');
    } catch (err) {
      toast.error('Gagal menyimpan tugas');
    }
  };

  const isSaving = createAssignmentMutation.isPending || updateAssignmentMutation.isPending;

  if (!sessionId) return null;

  return (
    <DialogModal
      open={open}
      onOpenChange={onOpenChange}
      title={view === 'list' ? `Kelola Tugas: ${session?.title || '...'}` : editingAssignment ? 'Edit Tugas' : 'Tambah Tugas Baru'}
      description={view === 'list' ? 'Kelola daftar tugas untuk sesi ini.' : 'Tentukan detail dan batas waktu pengumpulan tugas.'}
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
                  setEditingAssignment(null);
                  setView('form');
                }}
                className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                + Tambah Tugas
              </button>
            </div>

            {!session?.assignments?.length ? (
              <div className="bg-white border border-dashed border-[var(--theme-border)] rounded-2xl p-12 text-center text-[var(--theme-text-subtle)]">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    <span className="material-symbols-outlined text-4xl text-slate-300">assignment</span>
                  </div>
                </div>
                <p className="font-bold text-sm text-[var(--theme-text)]">Belum ada tugas</p>
                <p className="text-xs text-[var(--theme-text-muted)] mt-1">Berikan tugas proyek atau individu untuk peserta.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.assignments.map(a => (
                  <div key={a.id} className="bg-white p-5 rounded-2xl border border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:shadow-md transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2 gap-2">
                        <h4 className="font-bold text-[var(--theme-text)] text-sm line-clamp-2">{a.title}</h4>
                        <StatusBadge status={a.status} />
                      </div>
                      <p className="text-xs font-semibold text-[var(--theme-text-muted)] line-clamp-2 mb-3 leading-relaxed">{a.description || 'Tidak ada instruksi.'}</p>
                      <div className="space-y-2 mt-4">
                        <div className="flex items-center justify-between text-xs font-bold bg-[var(--theme-bg)] p-2 rounded-lg border border-[var(--theme-border)]">
                          <span className="text-[var(--theme-text-subtle)]">Tipe Pengumpulan</span>
                          <span className="text-[var(--theme-text)] uppercase">{a.submission_type}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs font-bold bg-[var(--theme-bg)] p-2 rounded-lg border border-[var(--theme-border)]">
                          <span className="text-[var(--theme-text-subtle)]">Tenggat Waktu</span>
                          <span className={new Date(a.due_date) < new Date() ? 'text-[var(--theme-error)]' : 'text-[var(--theme-success)]'}>
                            {a.due_date ? new Date(a.due_date).toLocaleString('id-ID') : '-'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--theme-border-muted)] mt-4">
                      <button onClick={() => handleOpenEdit(a)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-primary-light)] text-[var(--theme-primary)] hover:opacity-85 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(a.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-error-light)] text-[var(--theme-error)] hover:opacity-85 transition-colors">
                        Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Judul Tugas *</label>
              <input 
                type="text" 
                required 
                value={form.title} 
                onChange={e => setForm({ ...form, title: e.target.value })} 
                placeholder="Contoh: Tugas Essay Kepemimpinan" 
                className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Instruksi / Deskripsi Tugas</label>
              <textarea 
                rows="4" 
                value={form.description} 
                onChange={e => setForm({ ...form, description: e.target.value })} 
                placeholder="Jelaskan apa yang harus dilakukan peserta..." 
                className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] resize-y transition-all" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Tipe Pengumpulan</label>
                <SelectField 
                  value={form.submission_type} 
                  onValueChange={val => setForm({ ...form, submission_type: val })} 
                  className="w-full"
                >
                  <SelectOption value="text">Teks Online</SelectOption>
                  <SelectOption value="file">Unggah File (PDF/Doc/dll)</SelectOption>
                  <SelectOption value="link">Tautan (Link URL)</SelectOption>
                  <SelectOption value="media">Media (Gambar/Video)</SelectOption>
                </SelectField>
              </div>

              <div className="flex flex-col justify-end">
                <label className="flex items-center gap-3 cursor-pointer h-10 px-4 border border-[var(--theme-border)] rounded-xl bg-[var(--theme-bg)] hover:bg-[var(--theme-border-muted)] transition-colors">
                  <input 
                    type="checkbox" 
                    checked={form.is_required} 
                    onChange={e => setForm({ ...form, is_required: e.target.checked })} 
                    className="w-4 h-4 text-[var(--theme-primary)] rounded focus:ring-[var(--theme-primary)]" 
                  />
                  <span className="text-sm font-semibold text-[var(--theme-text)]">Tugas Wajib Diselesaikan</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Waktu Mulai (Open At)</label>
                <input 
                  type="datetime-local" 
                  value={form.open_at} 
                  onChange={e => setForm({ ...form, open_at: e.target.value })} 
                  className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Tenggat Waktu (Due Date)</label>
                <input 
                  type="datetime-local" 
                  value={form.due_date} 
                  onChange={e => setForm({ ...form, due_date: e.target.value })} 
                  className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Status</label>
              <SelectField 
                value={form.status} 
                onValueChange={val => setForm({ ...form, status: val })} 
                className="w-full"
              >
                <SelectOption value="draft">Draft (Disembunyikan)</SelectOption>
                <SelectOption value="published">Diterbitkan (Terlihat)</SelectOption>
                <SelectOption value="closed">Ditutup (Tidak menerima submission)</SelectOption>
              </SelectField>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--theme-border-muted)] mt-8">
              <button type="button" onClick={() => { setView('list'); setEditingAssignment(null); }} className="px-5 py-2.5 rounded-xl font-bold text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors text-xs">Kembali</button>
              <button type="submit" disabled={isSaving} className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-6 py-2.5 rounded-xl font-bold shadow-md disabled:opacity-50 transition-all text-xs">
                {isSaving ? 'Menyimpan...' : 'Simpan Tugas'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DialogModal>
  );
};
