import React, { useState } from 'react';

import { AnimatePresence } from 'framer-motion';
import { 
  useVoiceStatsQuery, 
  useVoiceListQuery, 
  useCreateVoiceMutation,
  useCancelVoiceMutation
} from '@/queries/useStudentVoiceQuery';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import DataTable from '@/components/ui/DataTable';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import toast from 'react-hot-toast';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const HelpCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>help</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Filter = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>filter_alt</span>;
const User = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person</span>;



const categories = [
  { id: 'Akademik', label: 'Akademik', color: 'bg-primary/10 text-primary border-primary/20' },
  { id: 'Fasilitas', label: 'Fasilitas', color: 'bg-secondary/10 text-secondary border-secondary/20' },
  { id: 'Kemahasiswaan', label: 'Kemahasiswaan', color: 'bg-success/10 text-success border-success/20' },
  { id: 'Saran & Ide', label: 'Saran & Ide', color: 'bg-info/10 text-info border-info/20' },
  { id: 'Lainnya', label: 'Lainnya', color: 'bg-surface text-text-muted border-border' },
];

export default function StudentVoicePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { hasPermission } = usePermission();
  const canManageAspiration = hasPermission('aspiration.create') || hasPermission('aspiration.manage') || hasPermission('student.aspirations.create');
  const navigate = useNavigate();
  
  // Queries
  const { data: stats, isLoading: isStatsLoading } = useVoiceStatsQuery();
  const { data: listData, isLoading: isListLoading } = useVoiceListQuery(page);
  const cancelMutation = useCancelVoiceMutation();

  const handleCancelTicket = (id) => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan aspirasi ini?')) {
      cancelMutation.mutate(id, {
        onSuccess: () => toast.success('Aspirasi berhasil dibatalkan'),
        onError: (err) => toast.error(err.response?.data?.message || 'Gagal membatalkan aspirasi')
      });
    }
  };

  return (
    <PageContent className="font-body">
      <div className="max-w-7xl mx-auto">
        <DashboardHero
          title="Suara Mahasiswa"
          subtitle="Sampaikan aspirasi, saran, dan pengaduanmu kepada kampus untuk BKU yang lebih baik."
          icon="campaign"
          theme="primary"
          stats={[
            { label: 'Total Diajukan', value: stats?.total || 0, icon: 'chat' },
            { label: 'Di Fakultas', value: stats?.di_fakultas || 0, icon: 'domain' },
            { label: 'Di Universitas', value: stats?.di_universitas || 0, icon: 'account_balance' },
            { label: 'Selesai', value: stats?.selesai || 0, icon: 'check_circle' },
          ]}
          actions={
            canManageAspiration && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center justify-center gap-2 px-5 py-3 bg-[var(--theme-primary)] text-white font-bold rounded-xl hover:opacity-90 transition-all shadow-md shadow-[var(--theme-primary)]/20 text-sm group cursor-pointer"
              >
                <span className="material-symbols-outlined group-hover:rotate-90 transition-transform duration-300" style={{ fontSize: '18px' }}>add</span>
                Sampaikan Aspirasi Baru
              </button>
            )
          }
        />

        {/* List Section */}
        <div className="glass-card rounded-3xl p-6 md:p-8 mb-8 border-0 shadow-xl overflow-hidden">
          <DataTable
            columns={[
              {
                key: 'nomor_tiket',
                label: 'Nomor Tiket',
                render: (_, row) => (
                  <div>
                    <div className="font-black text-[var(--theme-text)]">{row.nomor_tiket}</div>
                    <div className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-tighter mt-1">
                      {new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )
              },
              {
                key: 'kategori_judul',
                label: 'Kategori & Judul',
                render: (_, row) => (
                  <div className="max-w-sm">
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest border ${getCategoryStyle(row.kategori)}`}>
                        {row.kategori}
                      </span>
                      {row.is_anonim && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] px-2 py-0.5 rounded-md">
                          <span className="material-symbols-outlined opacity-40" style={{ fontSize: '10px' }} strokeWidth={3}>visibility</span> Anonim
                        </span>
                      )}
                    </div>
                    <div className="font-bold text-[var(--theme-text)] line-clamp-2 leading-relaxed">{row.judul}</div>
                  </div>
                )
              },
              {
                key: 'level_saat_ini',
                label: 'Level Unit',
                align: 'center',
                render: (_, row) => <LevelBadge level={row.level_saat_ini} />
              },
              {
                key: 'status',
                label: 'Status',
                align: 'center',
                render: (_, row) => <StatusBadge status={row.status} />
              }
            ]}
            data={listData?.list || []}
            loading={isListLoading}
            totalData={listData?.total || 0}
            currentPage={page}
            pageSize={10}
            onPageChange={setPage}
            serverPagination
            onRowClick={(row) => navigate(`/student/voice/tiket/${row.id}`)}
            actions={(row) => (
              row.status === 'menunggu' && row.level_saat_ini === 'fakultas' && canManageAspiration ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    handleCancelTicket(row.id);
                  }}
                  className="w-7 h-7 rounded-lg bg-[var(--theme-error-light)] text-[var(--theme-error)] flex items-center justify-center hover:bg-[var(--theme-error)] hover:text-white transition-all shadow-sm cursor-pointer"
                  title="Batalkan Aspirasi"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                </button>
              ) : null
            )}
            searchable={false}
            title={
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--theme-primary-light)]/80 rounded-2xl flex justify-center items-center text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">history</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-widest block mb-0.5">Riwayat</span>
                  <h2 className="text-lg md:text-xl font-black text-[var(--theme-text)] leading-tight">Aspirasi Kamu</h2>
                </div>
              </div>
            }
            emptyMessage="Kamu belum pernah mengirim aspirasi."
            emptyIcon="help"
          />
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <CreateAspirasiModal onClose={() => setIsModalOpen(false)} />
        )}
      </AnimatePresence>
    </PageContent>
  );
}

function LevelBadge({ level }) {
  const styles = {
    fakultas: 'bg-primary/10 text-primary border-primary/20',
    universitas: 'bg-secondary/10 text-secondary border-secondary/20',
    prodi: 'bg-success/10 text-success border-success/20',
    ormawa: 'bg-info/10 text-info border-info/20',
    selesai: 'bg-surface text-text-muted border-border'
  };
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${styles[level] || styles.selesai}`}>
      {level === 'selesai' ? 'Tutup' : level}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'menunggu': 'bg-surface text-text-muted border-border',
    'diproses': 'bg-primary/10 text-primary border-primary/20',
    'ditindaklanjuti': 'bg-info/10 text-info border-info/20',
    'disetujui fakultas': 'bg-success/10 text-success border-success/20',
    'ditolak fakultas': 'bg-error/10 text-error border-error/20',
    'ditolak': 'bg-error/10 text-error border-error/20',
    'proses': 'bg-primary/10 text-primary border-primary/20',
    'ditinjau': 'bg-warning/10 text-warning border-warning/20',
    'selesai': 'bg-success/10 text-success border-success/20'
  };
  const key = (status || 'menunggu').toLowerCase();
  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wide border ${styles[key] || styles.menunggu}`}>
      {status}
    </span>
  );
}

const getCategoryStyle = (cat) => {
  return categories.find(c => c.id === cat)?.color || 'bg-surface text-text-muted border border-border';
};

function CreateAspirasiModal({ onClose }) {
  const [formData, setFormData] = useState({
    kategori: 'Akademik',
    judul: '',
    isi: '',
    tujuan: 'Fakultas',
    is_anonim: false,
    lampiran: null
  });
  
  const createMutation = useCreateVoiceMutation();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.judul.length > 150) return toast.error('Judul terlalu panjang');
    if (formData.isi.length < 50) return toast.error('Isi aspirasi minimal 50 karakter');

    const data = new FormData();
    data.append('judul', formData.judul);
    data.append('kategori', formData.kategori);
    data.append('isi', formData.isi);
    data.append('tujuan', formData.tujuan);
    data.append('is_anonim', formData.is_anonim);
    if (formData.lampiran) {
      data.append('lampiran', formData.lampiran);
    }

    createMutation.mutate(data, {
      onSuccess: () => {
        toast.success('Aspirasi berhasil dikirim! 🎉');
        onClose();
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Gagal mengirim aspirasi')
    });
  };

  return (
    <Dialog open={true} onOpenChange={onClose} maxWidth="max-w-3xl">
      <DialogContent className="p-0 overflow-hidden glass-card rounded-3xl border-0 shadow-2xl">
        <DialogHeader className="p-8 pb-6 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/50 relative">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <span className="material-symbols-outlined text-8xl text-[var(--theme-primary)]">chat</span>
          </div>
          <div className="text-left relative z-10 flex gap-4 items-start">
            <div className="w-14 h-14 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--theme-primary)]/20 shadow-inner">
               <span className="material-symbols-outlined" style={{ fontSize: 28 }}>campaign</span>
            </div>
            <div>
              <p className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-widest mb-1">Aspirasi Baru</p>
              <DialogTitle className="text-xl md:text-2xl font-black mt-1 text-[var(--theme-text)] leading-tight tracking-tight">
                Sampaikan Aspirasimu
              </DialogTitle>
              <DialogDescription className="text-xs font-bold text-[var(--theme-text-muted)] mt-2">
                Gunakan kata-kata yang bijak & membangun untuk BKU yang lebih baik.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col max-h-[85vh]">
          <div className="p-5 sm:p-8 overflow-y-auto space-y-5 text-left bg-white">
            {/* Category Selector */}
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Pilih Kategori</label>
              <div className="flex flex-wrap gap-2.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, kategori: cat.id })}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wide transition-all border ${
                      formData.kategori === cat.id 
                      ? 'border-[var(--theme-primary)] bg-primary/10 text-primary shadow-sm' 
                      : 'border-slate-200 text-slate-500 hover:border-primary/30 hover:text-slate-900'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tujuan Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Tujuan Aspirasi</label>
              <select
                value={formData.tujuan}
                onChange={(e) => setFormData({ ...formData, tujuan: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 text-slate-700 font-bold text-xs rounded-xl focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none"
              >
                <option value="Fakultas">Fakultas</option>
                <option value="Universitas">Universitas</option>
                <option value="Prodi">Program Studi (Prodi)</option>
                <option value="Ormawa">Organisasi Mahasiswa (Ormawa)</option>
              </select>
            </div>

            <div className="space-y-4">
              {/* Judul */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Judul / Ringkasan</label>
                  <span className={`text-[10px] font-black uppercase ${formData.judul.length > 150 ? 'text-red-500' : 'text-slate-400'}`}>
                    {formData.judul.length} / 150
                  </span>
                </div>
                <input 
                  type="text" 
                  placeholder="Tuliskan inti dari aspirasimu..."
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 text-slate-700 rounded-xl font-bold text-xs focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all font-bold text-xs"
                  value={formData.judul}
                  onChange={(e) => setFormData({ ...formData, judul: e.target.value })}
                  required
                />
              </div>

              {/* Isi */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Detail Aspirasi Lengkap</label>
                  <span className={`text-[10px] font-black uppercase ${formData.isi.length < 50 && formData.isi.length > 0 ? 'text-primary' : 'text-slate-400'}`}>
                    {formData.isi.length < 50 ? `Kurang ${50 - formData.isi.length} karakter` : 'Minimal 50 terpenuhi ✓'}
                  </span>
                </div>
                <textarea 
                  rows={4}
                  placeholder="Ceritakan secara detail aspirasi, saran, atau keluhan kamu..."
                  className="w-full px-4 py-3 bg-slate-50/50 border border-slate-200 text-slate-700 rounded-xl font-medium text-xs focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all resize-none font-bold text-xs"
                  value={formData.isi}
                  onChange={(e) => setFormData({ ...formData, isi: e.target.value })}
                  required
                />
              </div>

              {/* Upload & Anonim Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Unggah Lampiran (Opsional)</label>
                  <div className="relative group/upload">
                    <input 
                      type="file" 
                      onChange={(e) => setFormData({ ...formData, lampiran: e.target.files[0] })}
                      className="absolute inset-0 opacity-0 cursor-pointer z-10"
                      accept=".pdf,.jpg,.jpeg,.png"
                    />
                    <div className="flex items-center justify-between px-4 py-3 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl group-hover/upload:border-primary transition-all">
                      <span className="text-xs font-bold text-slate-500 truncate">
                        {formData.lampiran ? formData.lampiran.name : 'Pilih File (Max 5MB)'}
                      </span>
                      <span className="material-symbols-outlined text-slate-400 group-hover/upload:text-primary" style={{ fontSize: '18px' }} >upload</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Status Pengiriman</label>
                  <button 
                    type="button"
                    onClick={() => setFormData({ ...formData, is_anonim: !formData.is_anonim })}
                    className={`flex items-center justify-between w-full px-4 py-2.5 rounded-xl border transition-all ${
                      formData.is_anonim ? 'bg-primary border-primary text-white' : 'bg-slate-50/50 border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-xl ${formData.is_anonim ? 'bg-white/20' : 'bg-white border border-slate-100 shadow-sm'}`}>
                        <User size={14} className={formData.is_anonim ? 'text-white' : 'text-slate-400'} />
                      </div>
                      <span className="text-xs font-black uppercase tracking-wide">Kirim Anonim?</span>
                    </div>
                    <div className={`w-8 h-4 rounded-full relative transition-all ${formData.is_anonim ? 'bg-white/30' : 'bg-slate-200'}`}>
                      <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${formData.is_anonim ? 'left-4.5' : 'left-0.5'}`} />
                    </div>
                  </button>
                </div>
              </div>

              {formData.is_anonim && (
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex gap-3">
                  <span className="material-symbols-outlined text-primary shrink-0" style={{ fontSize: '18px' }}>security</span>
                  <p className="text-[9px] font-bold text-primary leading-relaxed uppercase">
                    Data pengirim akan disembunyikan dari pihak Admin Fakultas/Universitas, namun tetap tercatat secara internal demi keamanan sistem. Tindak lanjut yang memerlukan konfirmasi langsung mungkin tidak dapat diproses jika Anda anonim.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="p-5 sm:p-6 border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)] shrink-0 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--theme-border)] text-[var(--theme-text-muted)] text-xs font-black hover:bg-[var(--theme-bg)] transition-colors cursor-pointer bg-[var(--theme-surface)] uppercase tracking-wider">
              Batal
            </button>
            <button 
              type="submit" 
              disabled={createMutation.isPending || formData.judul === '' || formData.isi.length < 50} 
              className="flex-1 py-3 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-black hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider border-none shadow-md shadow-[var(--theme-primary)]/20"
            >
              {createMutation.isPending ? 'Mengirim...' : 'Kirim Aspirasi'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
