import React, { useState } from 'react';
import { useAnnouncementsQuery, useCreateAnnouncementMutation, useDeleteAnnouncementMutation } from '@/queries/useKencanaAdminQuery';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

export default function Announcements({ portal = 'admin' }) {
  const { data: announcements, isLoading } = useAnnouncementsQuery(portal);
  const createMutation = useCreateAnnouncementMutation(portal);
  const deleteMutation = useDeleteAnnouncementMutation(portal);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    defaultValues: { target_role: 'mahasiswa', judul: '', isi: '' }
  });
  
  const isiValue = watch("isi");

  const onSubmit = (data) => {
    if (!data.isi || data.isi.trim() === '' || data.isi === '<p><br></p>') {
      toast.error('Isi pengumuman wajib diisi');
      return;
    }
    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Pengumuman berhasil dibuat');
        setIsModalOpen(false);
        reset();
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Gagal membuat pengumuman');
      }
    });
  };

  const handleDelete = (id) => {
    if (window.confirm('Yakin ingin menghapus pengumuman ini?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success('Pengumuman dihapus'),
        onError: (err) => toast.error(err?.response?.data?.message || 'Gagal menghapus pengumuman')
      });
    }
  };

  const columns = [
    { header: 'Tanggal', accessor: (row) => new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
    { header: 'Judul', accessor: 'judul' },
    { header: 'Target', accessor: (row) => row.target_role === 'both' ? 'Semua' : (row.target_role === 'mahasiswa' ? 'Mahasiswa' : 'Mentor') },
    { header: 'Aksi', accessor: (row) => (
      <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700 p-1 rounded transition-colors" title="Hapus">
        <span className="material-symbols-outlined text-xl">delete</span>
      </button>
    ) }
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--theme-text)]">Pengumuman</h2>
          <p className="text-[var(--theme-text-muted)]">Kelola informasi dan pengumuman untuk mahasiswa dan dewan pembimbing.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-[var(--theme-primary)] text-white rounded-lg font-medium shadow hover:opacity-90 flex items-center gap-2 transition-all active:scale-95">
          <span className="material-symbols-outlined text-sm">add</span>
          Buat Pengumuman
        </button>
      </div>

      <div className="glass-card">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--theme-text-muted)] animate-pulse">Memuat data...</div>
        ) : announcements?.length === 0 ? (
          <div className="p-12 text-center text-[var(--theme-text-muted)]">
            <span className="material-symbols-outlined text-4xl mb-3 opacity-50 block">campaign</span>
            <p>Belum ada pengumuman.</p>
          </div>
        ) : (
          <DataTable columns={columns} data={announcements || []} />
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-surface)] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-[var(--theme-border-muted)] flex justify-between items-center bg-[var(--theme-bg)]">
              <h3 className="text-lg font-bold text-[var(--theme-text)]">Buat Pengumuman Baru</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors rounded-full p-1 hover:bg-slate-100 dark:hover:bg-slate-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">Target Role</label>
                <select {...register('target_role')} className="w-full rounded-lg border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] px-4 py-2 text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none transition-all">
                  <option value="mahasiswa">Mahasiswa Saja</option>
                  <option value="mentor">Mentor Saja</option>
                  <option value="both">Mahasiswa & Mentor</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">Judul Pengumuman</label>
                <input {...register('judul', { required: true })} type="text" className="w-full rounded-lg border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] px-4 py-2 text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none transition-all" placeholder="Masukkan judul..." />
                {errors.judul && <span className="text-red-500 text-xs mt-1">Judul wajib diisi</span>}
              </div>
              <div className="flex flex-col flex-1 h-[300px]">
                <label className="block text-sm font-medium text-[var(--theme-text)] mb-1">Isi Pengumuman</label>
                <div className="flex-1 rounded-lg overflow-hidden border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] relative">
                  <ReactQuill 
                    theme="snow" 
                    value={isiValue} 
                    onChange={(val) => setValue('isi', val)} 
                    className="h-[258px] bg-white text-black"
                  />
                </div>
              </div>
              <div className="pt-4 border-t border-[var(--theme-border-muted)] flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-[var(--theme-text-muted)] hover:bg-[var(--theme-border-muted)] transition-colors font-medium">Batal</button>
                <button type="submit" disabled={createMutation.isPending} className="px-6 py-2 rounded-lg bg-[var(--theme-primary)] text-white font-medium shadow hover:opacity-90 disabled:opacity-50 transition-all">
                  {createMutation.isPending ? 'Menyimpan...' : 'Terbitkan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
