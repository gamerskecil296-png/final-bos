import React, { useState, useEffect, useRef } from 'react';
import {
  useSessionDetailQuery,
  useDeleteMaterialMutation,
  useCreateMaterialMutation,
  useUpdateMaterialMutation,
  useUploadMediaMutation
} from '@/queries/useKencanaAdminQuery';
import { DialogModal } from '@/components/ui/DialogModal';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import toast from 'react-hot-toast';

const BACKEND_URL = import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : 'http://localhost:8000';

const FileIcon = ({ type }) => {
  const icons = { 
    pdf: 'picture_as_pdf', 
    video: 'movie', 
    file: 'attach_file', 
    text: 'description', 
    link: 'link' 
  };
  return <span className="material-symbols-outlined text-2xl">{icons[type] || 'attach_file'}</span>;
};

export const ManageMaterialsModal = ({ open, onOpenChange, sessionId }) => {
  const { data: session, isLoading } = useSessionDetailQuery(sessionId, { enabled: !!sessionId && open });
  
  const [view, setView] = useState('list'); // 'list' | 'form'
  const [editingMaterial, setEditingMaterial] = useState(null);
  
  const deleteMaterialMutation = useDeleteMaterialMutation();
  const createMaterialMutation = useCreateMaterialMutation();
  const updateMaterialMutation = useUpdateMaterialMutation();
  const uploadMedia = useUploadMediaMutation();

  const [form, setForm] = useState({ title: '', type: 'text', content: '', link_url: '', is_required: true });
  const [uploadFile, setUploadFile] = useState(null);
  const fileInputRef = useRef();

  // Reset view to 'list' when modal opens/closes
  useEffect(() => {
    if (open) {
      setView('list');
      setEditingMaterial(null);
    }
  }, [open]);

  useEffect(() => {
    if (view === 'form' && editingMaterial) {
      setForm({
        title: editingMaterial.title || '',
        type: editingMaterial.type || 'text',
        content: editingMaterial.content || '',
        link_url: editingMaterial.link_url || '',
        is_required: editingMaterial.is_required ?? true,
      });
      setUploadFile(null);
    } else if (view === 'form') {
      setForm({ title: '', type: 'text', content: '', link_url: '', is_required: true });
      setUploadFile(null);
    }
  }, [view, editingMaterial]);

  const handleDelete = (id) => {
    if (window.confirm('Hapus materi ini?')) {
      deleteMaterialMutation.mutate(id);
    }
  };

  const handleOpenEdit = (m) => {
    setEditingMaterial(m);
    setView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!session) return;
    
    let fileUrl = editingMaterial?.file_url || '';
    let originalFileName = editingMaterial?.original_file_name || '';

    try {
      if (uploadFile) {
        const fd = new FormData();
        fd.append('file', uploadFile);
        const res = await uploadMedia.mutateAsync(fd);
        if (res?.url) {
          fileUrl = res.url;
          originalFileName = uploadFile.name;
        }
      }

      const payload = {
        title: form.title || originalFileName.replace(/\.[^/.]+$/, '') || 'Materi Kencana',
        type: uploadFile ? 'file' : form.type,
        content: form.content,
        link_url: form.link_url,
        file_url: fileUrl,
        original_file_name: originalFileName,
        session_id: session.id,
        is_required: form.is_required,
      };

      if (editingMaterial) {
        await updateMaterialMutation.mutateAsync({ id: editingMaterial.id, ...payload });
        toast.success('Materi berhasil diperbarui!');
      } else {
        await createMaterialMutation.mutateAsync(payload);
        toast.success('Materi berhasil dibuat!');
      }
      setEditingMaterial(null);
      setView('list');
    } catch (err) {
      toast.error('Gagal menyimpan materi');
    }
  };

  const isUploading = uploadMedia.isPending || createMaterialMutation.isPending || updateMaterialMutation.isPending;

  if (!sessionId) return null;

  return (
    <DialogModal
      open={open}
      onOpenChange={onOpenChange}
      title={view === 'list' ? `Kelola Materi: ${session?.title || '...'}` : editingMaterial ? 'Edit Materi' : 'Tambah Materi Baru'}
      description={view === 'list' ? 'Kelola semua materi bacaan, video, atau file presentasi untuk sesi ini.' : 'Isi form sesuai jenis materi. Teks dan link bisa digabung dengan file jika diperlukan.'}
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
                  setEditingMaterial(null);
                  setView('form');
                }}
                className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-colors"
              >
                + Tambah Materi
              </button>
            </div>

            {!session?.materials?.length ? (
              <div className="bg-white border border-dashed border-[var(--theme-border)] rounded-2xl p-12 text-center text-[var(--theme-text-subtle)]">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                    <span className="material-symbols-outlined text-4xl text-slate-300">inventory_2</span>
                  </div>
                </div>
                <p className="font-bold text-sm text-[var(--theme-text)]">Belum ada materi</p>
                <p className="text-xs text-[var(--theme-text-muted)] mt-1">Mulai tambahkan materi bacaan, video, atau file presentasi.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.materials.map(m => (
                  <div key={m.id} className="bg-white p-5 rounded-2xl border border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:shadow-md transition-all flex flex-col justify-between">
                    <div className="flex gap-4 items-start mb-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                        <FileIcon type={m.type} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-[var(--theme-text)] text-sm truncate" title={m.title}>{m.title}</h4>
                        <p className="text-[10px] text-[var(--theme-text-subtle)] mt-1 uppercase tracking-wider font-bold">{m.type}</p>
                        {m.original_file_name && <p className="text-xs text-[var(--theme-text-muted)] truncate mt-1">{m.original_file_name}</p>}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-[var(--theme-border-muted)]">
                      {m.file_url && (
                        <a href={`${BACKEND_URL}${m.file_url}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border border-[var(--theme-border)] hover:bg-[var(--theme-bg)] transition-colors">
                          Buka File
                        </a>
                      )}
                      <button onClick={() => handleOpenEdit(m)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-primary-light)] text-[var(--theme-primary)] hover:opacity-85 transition-colors">
                        Edit
                      </button>
                      <button onClick={() => handleDelete(m.id)} className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[var(--theme-error-light)] text-[var(--theme-error)] hover:opacity-85 transition-colors">
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
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Judul Materi *</label>
              <input 
                type="text" 
                required 
                value={form.title} 
                onChange={e => setForm({ ...form, title: e.target.value })} 
                placeholder="Contoh: Panduan Orientasi Mahasiswa" 
                className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Jenis Materi</label>
                <SelectField 
                  value={form.type} 
                  onValueChange={val => setForm({ ...form, type: val })} 
                  className="w-full"
                >
                  <SelectOption value="text">Teks</SelectOption>
                  <SelectOption value="link">Link URL</SelectOption>
                  <SelectOption value="file">File / Dokumen</SelectOption>
                  <SelectOption value="video">Video</SelectOption>
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
                  <span className="text-sm font-semibold text-[var(--theme-text)]">Materi wajib dibaca</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Deskripsi / Teks Materi</label>
              <textarea 
                rows="4" 
                value={form.content} 
                onChange={e => setForm({ ...form, content: e.target.value })} 
                placeholder="Tambahkan teks penjelasan jika perlu..." 
                className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] resize-y transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Tautan (URL Eksternal)</label>
              <input 
                type="url" 
                value={form.link_url} 
                onChange={e => setForm({ ...form, link_url: e.target.value })} 
                placeholder="https://..." 
                className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Upload File Dokumen / Video</label>
              <div className="border-2 border-dashed border-[var(--theme-border)] rounded-2xl p-6 bg-[var(--theme-bg)] hover:bg-[var(--theme-border-muted)] transition-colors text-center">
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xlsx,.xls,.jpg,.jpeg,.png,.mp4" 
                  onChange={e => setUploadFile(e.target.files[0])} 
                  className="mx-auto block text-xs text-[var(--theme-text)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:font-bold file:bg-[var(--theme-primary)] file:text-white hover:file:bg-[var(--theme-primary-hover)] cursor-pointer" 
                />
                {editingMaterial?.original_file_name && !uploadFile && (
                  <p className="text-xs text-[var(--theme-primary)] font-bold mt-3 border-t border-[var(--theme-border-muted)] pt-3">File Tersimpan: {editingMaterial.original_file_name}</p>
                )}
                <p className="text-xs text-[var(--theme-text-muted)] font-semibold mt-3">Kosongkan jika tidak ingin melampirkan file.</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-[var(--theme-border-muted)] mt-8">
              <button type="button" onClick={() => { setView('list'); setEditingMaterial(null); }} className="px-5 py-2.5 rounded-xl font-bold text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors text-xs">Kembali</button>
              <button type="submit" disabled={isUploading} className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-6 py-2.5 rounded-xl font-bold shadow-md disabled:opacity-50 transition-all flex items-center justify-center min-w-[140px] text-xs">
                {isUploading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : 'Simpan Materi'}
              </button>
            </div>
          </form>
        )}
      </div>
    </DialogModal>
  );
};
