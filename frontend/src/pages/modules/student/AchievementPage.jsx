import React, { useState, useMemo } from 'react';
import { PageContent, PageHeader, PageCard, PageCardHeader } from '@/components/ui/page';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  useAchievementsQuery,
  useCreateAchievementMutation,
  useDeleteAchievementMutation,
} from '@/queries/useAchievementQuery';
import { useOrganisasiListQuery } from '@/queries/useOrganisasiQuery';


import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import { usePermission } from '@/hooks/usePermission';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Trophy = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;



// Format Date Utility
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

// Zod Schema
const achievementSchema = z.object({
  tipe: z.enum(['Prestasi Mandiri', 'Sertifikasi', 'Rekognisi', 'Pengajuan Dana'], {
    required_error: 'Pilih tipe pengajuan',
  }),
  nama_lomba: z.string().min(3, { message: 'Nama lomba minimal 3 karakter' }),
  kategori: z.enum(['RISNOV', 'RISNOVSSH', 'SENBUD', 'OLAHRAGA', 'MINAT']).optional(),
  tingkat: z.enum(['KAB', 'PROV', 'NAS', 'INT'], {
    required_error: 'Pilih tingkat lomba',
  }),
  penyelenggara: z.string().min(3, { message: 'Nama penyelenggara minimal 3 karakter' }),
  tanggal: z.string().nonempty({ message: 'Tanggal wajib diisi' }),
  peringkat: z.string().optional(),
  dana_diajukan: z.string().optional(),
  sertifikat: z
    .any()
    .refine((files) => files?.length === 1, 'File wajib diunggah')
    .refine(
      (files) => files?.[0]?.size <= 5 * 1024 * 1024,
      'Ukuran file maksimal 5MB'
    )
    .refine(
      (files) => ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'].includes(files?.[0]?.type),
      'Format hanya PDF, JPG, atau PNG'
    ),
  riwayat_organisasi_id: z.string().optional(),
  cabang: z.string().optional(),
  kelompok_prestasi: z.string().optional(),
  bentuk: z.string().optional(),
  keterangan: z.string().optional(),
  url_sertifikat: z.string().optional(),
  url_peserta: z.string().optional(),
  url_foto_upp: z.string().optional(),
  url_dokumen_undangan: z.string().optional(),
  jenis_rekognisi: z.string().optional(),
  jumlah_unit_peserta: z.string().optional(),
  anggota_mahasiswa: z.string().optional(),
  pembimbing_dosen: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.tipe === 'Prestasi Mandiri') {
    if (!data.peringkat) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pilih peringkat yang diraih',
        path: ['peringkat'],
      });
    }
    if (!data.kategori) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pilih kategori prestasi',
        path: ['kategori'],
      });
    }
  } else if (data.tipe === 'Rekognisi') {
    if (!data.jenis_rekognisi) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Pilih jenis rekognisi',
        path: ['jenis_rekognisi'],
      });
    }
  } else if (data.tipe === 'Pengajuan Dana') {
    if (!data.dana_diajukan || isNaN(Number(data.dana_diajukan)) || Number(data.dana_diajukan) <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Dana diajukan wajib diisi dengan angka positif',
        path: ['dana_diajukan'],
      });
    }
  }
});

export default function AchievementPage() {
  const user = useAuthStore(state => state.user);
  const { hasPermission } = usePermission();
  const canManageAchievement = hasPermission('achievement.create') || hasPermission('achievement.update') || hasPermission('achievement.delete') || hasPermission('achievement.manage') || hasPermission('student.achievement.create') || hasPermission('student.achievement.update') || hasPermission('student.achievement.delete');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null); // Data For Detail Modal

  // Queries
  const { data: achievementData, isLoading } = useAchievementsQuery();
  const createMutation = useCreateAchievementMutation();
  const deleteMutation = useDeleteAchievementMutation();

  const stats = achievementData?.stats || { total: 0, verified: 0, pending: 0 };



  const mappedList = useMemo(() => {
    return (achievementData?.list || []).map(a => {
      return {
        ...a,
        semester_filter: a.mahasiswa?.SemesterSekarang || a.mahasiswa?.semester_sekarang ? String(a.mahasiswa?.SemesterSekarang || a.mahasiswa?.semester_sekarang) : '',
        periode_filter: a.tanggal || a.Tanggal ? String(new Date(a.tanggal || a.Tanggal).getFullYear()) : (a.created_at || a.CreatedAt ? String(new Date(a.created_at || a.CreatedAt).getFullYear()) : ''),
        prodi_filter: a.mahasiswa?.ProgramStudi?.Nama || a.mahasiswa?.program_studi?.nama || '',
      };
    });
  }, [achievementData]);

  const semesterOptions = useMemo(() => {
    const semesters = new Set();
    mappedList.forEach(a => {
      if (a.semester_filter) semesters.add(a.semester_filter);
    });
    return Array.from(semesters).sort((a, b) => Number(a) - Number(b));
  }, [mappedList]);

  const periodeOptions = useMemo(() => {
    const periods = new Set();
    mappedList.forEach(a => {
      if (a.periode_filter) periods.add(a.periode_filter);
    });
    return Array.from(periods).sort((a, b) => Number(b) - Number(a));
  }, [mappedList]);

  const prodiOptions = useMemo(() => {
    const prodis = new Set();
    mappedList.forEach(a => {
      if (a.prodi_filter) prodis.add(a.prodi_filter);
    });
    return Array.from(prodis).sort();
  }, [mappedList]);


  const { data: orgData } = useOrganisasiListQuery();
  const orgList = orgData || [];

  // Form setup
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(achievementSchema),
  });
  
  const fileValue = watch('sertifikat');
  const tipeValue = watch('tipe');

  const onSubmit = (formData) => {
    const payload = new FormData();
    payload.append('tipe', formData.tipe);
    payload.append('nama_kegiatan', formData.nama_lomba);
    payload.append('kategori', formData.kategori);
    payload.append('tingkat', formData.tingkat);
    payload.append('penyelenggara', formData.penyelenggara);
    payload.append('tanggal', formData.tanggal);
    if (formData.tipe === 'Prestasi Mandiri') {
      payload.append('peringkat', formData.peringkat);
    } else if (formData.tipe === 'Pengajuan Dana') {
      payload.append('dana_diajukan', formData.dana_diajukan);
    }
    payload.append('bukti', formData.sertifikat[0]);
    
    if (formData.riwayat_organisasi_id) {
       payload.append('riwayat_organisasi_id', formData.riwayat_organisasi_id);
    }
    if (formData.cabang) payload.append('cabang', formData.cabang);
    if (formData.kelompok_prestasi) payload.append('kelompok_prestasi', formData.kelompok_prestasi);
    if (formData.bentuk) payload.append('bentuk', formData.bentuk);
    if (formData.keterangan) payload.append('keterangan', formData.keterangan);
    if (formData.url_sertifikat) payload.append('url_sertifikat', formData.url_sertifikat);
    if (formData.url_peserta) payload.append('url_peserta', formData.url_peserta);
    if (formData.url_foto_upp) payload.append('url_foto_upp', formData.url_foto_upp);
    if (formData.url_dokumen_undangan) payload.append('url_dokumen_undangan', formData.url_dokumen_undangan);
    if (formData.jenis_rekognisi) payload.append('jenis_rekognisi', formData.jenis_rekognisi);
    if (formData.jumlah_unit_peserta) payload.append('jumlah_unit_peserta', formData.jumlah_unit_peserta);

    // Convert comma separated string to JSON array
    if (formData.anggota_mahasiswa) {
       const arr = formData.anggota_mahasiswa.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n));
       if (arr.length > 0) payload.append('anggota_mahasiswa', JSON.stringify(arr));
    }
    if (formData.pembimbing_dosen) {
       const arr = formData.pembimbing_dosen.split(',').map(s => s.trim()).filter(s => s !== '').map(s => {
         const num = Number(s);
         if (!isNaN(num) && s.length < 8) {
           return { dosen_id: num };
         }
         return { nidn: s, nama_dosen: '-' };
       });
       if (arr.length > 0) payload.append('pembimbing_dosen', JSON.stringify(arr));
    }

    createMutation.mutate(payload, {
      onSuccess: () => {
        toast.success(formData.tipe === 'Pengajuan Dana' ? 'Pengajuan dana berhasil dikirim!' : 'Prestasi berhasil dilaporkan!');
        reset();
        setIsModalOpen(false);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Gagal menyimpan data');
      },
    });
  };

  const handleDelete = (id) => {
    if (confirm('Apakah Anda yakin ingin menghapus laporan ini?')) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success('Berhasil dihapus'),
        onError: () => toast.error('Gagal menghapus data'),
      });
    }
  };

  // Table Setup
  const columns = useMemo(
    () => [
      {
        key: 'no',
        label: 'No',
        render: (v, row, idx) => idx + 1,
      },
      {
        key: 'nama_kegiatan',
        label: 'Nama Lomba & Kategori',
        sortable: true,
        render: (v, row) => {
          const name = row.nama_kegiatan || row.NamaKegiatan || '';
          const category = row.kategori || row.Kategori || '';
          const tipe = row.tipe || row.Tipe || 'Laporan Prestasi';
          return (
            <div>
              <p className="font-bold text-on-surface">{name}</p>
              <div className="flex gap-1.5 mt-1">
                <span className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary-light)] px-1.5 py-0.5 rounded">{category}</span>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${tipe === 'Pengajuan Dana' ? 'text-[var(--theme-warning)] bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20' : 'text-[var(--theme-success)] bg-[var(--theme-success-light)] border border-[var(--theme-success)]/20'}`}>{tipe}</span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'tingkat',
        label: 'Tingkat',
        sortable: true,
        render: (v, row) => {
          const val = row.tingkat || row.Tingkat || '';
          return <span className="text-[var(--theme-text-muted)]">{val}</span>;
        },
      },
      {
        key: 'peringkat',
        label: 'Peringkat / Pendanaan',
        sortable: true,
        render: (v, row) => {
          const tipe = row.tipe || row.Tipe || 'Laporan Prestasi';
          if (tipe === 'Pengajuan Dana') {
            const reqAmt = row.dana_diajukan || row.DanaDiajukan || 0;
            const appAmt = row.dana_disetujui || row.DanaDisetujui || 0;
            return (
              <div className="text-xs whitespace-nowrap">
                <p className="text-[var(--theme-text-muted)]">Diajukan: <span className="font-bold">Rp {reqAmt.toLocaleString('id-ID')}</span></p>
                {appAmt > 0 ? (
                  <p className="text-[var(--theme-success)] font-bold mt-0.5">Disetujui: Rp {appAmt.toLocaleString('id-ID')}</p>
                ) : (
                  <p className="text-[var(--theme-text-subtle)] italic mt-0.5">Belum disetujui</p>
                )}
              </div>
            );
          }
          const val = row.peringkat || row.Peringkat || '';
          return <span className="font-semibold text-[var(--theme-primary)]">{val}</span>;
        },
      },
      {
        key: 'created_at',
        label: 'Tanggal',
        sortable: true,
        render: (v, row) => {
          const val = row.created_at || row.CreatedAt || '';
          return <span className="text-[var(--theme-text-muted)] text-sm">{formatDate(val)}</span>;
        },
      },
      {
        key: 'status',
        label: 'Status',
        sortable: true,
        render: (v, row) => {
          const val = row.status || row.Status || 'Menunggu';
          let style = 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]';
          if (val === 'Diverifikasi' || val === 'Valid' || val === 'Disetujui') style = 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20';
          if (val === 'Menunggu' || val === 'Pending') style = 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20';
          if (val === 'Ditolak') style = 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20';

          return (
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${style}`}>
              {val === 'Diverifikasi' || val === 'Valid' || val === 'Disetujui' ? 'Disetujui' : val}
            </span>
          );
        },
      }
    ],
    []
  );

  return (
    <PageContent className="font-body">
      
      <PageHeader
        title="Achievement"
        subtitle="Lapor, pantau status verifikasi, dan kelola seluruh prestasi akademik/non-akademikmu."
        icon="emoji_events"
        breadcrumbs={[
          { label: 'Dashboard', path: '/student/dashboard' },
          { label: 'Achievement', path: '/student/achievement' }
        ]}
        action={
          canManageAchievement && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-[var(--theme-primary)] text-white px-4 py-2.5 rounded-xl text-sm font-bold flex justify-center items-center gap-2 hover:opacity-90 transition-colors shadow-sm shadow-[var(--theme-primary)]/20 w-full sm:w-auto"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >add</span>
              Lapor Prestasi Baru
            </button>
          )
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <PrimaryStatsCard
          title="Total Prestasi"
          value={stats.total}
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>emoji_events</span>}
          colorTheme="primary"
          badgeText="Total"
          badgeIcon={<span className="material-symbols-outlined" style={{ fontSize: '10px' }}>emoji_events</span>}
        />
        <PrimaryStatsCard
          title="Diverifikasi"
          value={stats.verified}
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>check_circle</span>}
          colorTheme="success"
          badgeText="Valid"
          badgeIcon={<span className="material-symbols-outlined" style={{ fontSize: '10px' }}>check_circle</span>}
        />
        <PrimaryStatsCard
          title="Menunggu Validasi"
          value={stats.pending}
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>schedule</span>}
          colorTheme="warning"
          badgeText="Pending"
          badgeIcon={<span className="material-symbols-outlined" style={{ fontSize: '10px' }}>schedule</span>}
        />
      </div>

      {/* Table Section */}
      <DataTable
        title="Riwayat Prestasi"
        subtitle="Daftar laporan prestasi dan pengajuan dana yang telah diajukan."
        columns={columns}
        data={mappedList}
        loading={isLoading}
        searchable={true}
        searchPlaceholder="Cari lomba, kategori..."
        pagination={true}
        pageSize={10}
        onRowClick={(row) => setSelectedDetail(row)}
        emptyMessage="Belum Ada Prestasi. Lapor prestasi pertamamu sekarang!"
        emptyIcon="emoji_events"

        actions={(row) => {
          const status = row.status || row.Status || 'Menunggu';
          const id = row.id || row.ID;
          return (
            status === 'Menunggu' && canManageAchievement ? (
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(id); }}
                className="p-1.5 text-[#dc2626] bg-[#fef2f2] rounded hover:bg-[#fee2e2] transition-colors"
                title="Hapus"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
              </button>
            ) : null
          );
        }}
        filters={[
          {
            key: 'semester_filter',
            placeholder: 'Semester',
            options: semesterOptions.map(s => ({ label: `Semester ${s}`, value: s }))
          },
          {
            key: 'periode_filter',
            placeholder: 'Periode',
            options: periodeOptions.map(p => ({ label: `Periode ${p}`, value: p }))
          },
          {
            key: 'prodi_filter',
            placeholder: 'Prodi',
            options: prodiOptions.map(p => ({ label: p, value: p }))
          }
        ]}
      />

      {/* MODAL LAPOR PRESTASI */}
      <Dialog open={isModalOpen} onOpenChange={(open) => !open && setIsModalOpen(false)} maxWidth="max-w-2xl">
        <DialogContent className="p-0 overflow-hidden glass-card rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="p-8 pb-6 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/50 relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <span className="material-symbols-outlined text-8xl text-[var(--theme-primary)]">emoji_events</span>
            </div>
            <div className="text-left relative z-10 flex gap-4 items-start">
              <div className="w-14 h-14 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--theme-primary)]/20 shadow-inner">
                 <span className="material-symbols-outlined" style={{ fontSize: 28 }}>military_tech</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-widest mb-1">Form Pengajuan</p>
                <DialogTitle className="text-xl md:text-2xl font-black mt-1 text-[var(--theme-text)] leading-tight tracking-tight">
                  Lapor Prestasi / Rekognisi / Dana
                </DialogTitle>
                <DialogDescription className="text-xs font-bold text-[var(--theme-text-muted)] mt-2">
                  Isi data prestasi, rekognisi, atau rencana pendanaan lomba luar kampus dengan lengkap.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col max-h-[85vh]">
            <div className="p-5 sm:p-8 overflow-y-auto space-y-5 text-left bg-white">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Tipe Pengajuan <span className="text-[var(--theme-error)]">*</span></label>
                  <select {...register('tipe')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-on-surface bg-[var(--theme-bg)] h-[40px] text-xs font-semibold">
                    <option value="">Pilih Tipe Pengajuan</option>
                    <option value="Prestasi Mandiri">Prestasi Mandiri</option>
                    <option value="Sertifikasi">Sertifikasi</option>
                    <option value="Rekognisi">Rekognisi</option>
                    <option value="Pengajuan Dana">Pengajuan Dana Lomba</option>
                  </select>
                  {errors.tipe && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.tipe.message}</p>}
                </div>
                
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Terkait Organisasi (Opsional)</label>
                  <select {...register('riwayat_organisasi_id')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-on-surface bg-[var(--theme-bg)] h-[40px] text-xs font-semibold">
                    <option value="">-- Tidak Terkait Organisasi --</option>
                    {orgList.filter(o => o.StatusVerifikasi === 'Terverifikasi' || o.StatusVerifikasi === 'Diverifikasi' || o.StatusVerifikasi === 'Aktif').map(org => (
                      <option key={org.id || org.ID} value={org.id || org.ID}>
                        {org.NamaOrganisasi} ({org.Tipe})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[var(--theme-text-subtle)] mt-1">Pilih jika prestasi ini mewakili UKM/Ormawa Anda.</p>
                </div>
              </div>

            {tipeValue && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">
                      {tipeValue === 'Sertifikasi' ? 'Nama Sertifikasi' : tipeValue === 'Rekognisi' ? 'Nama Rekognisi' : 'Nama Lomba/Kompetisi'} <span className="text-[var(--theme-error)]">*</span>
                    </label>
                    <input {...register('nama_lomba')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-xs font-semibold h-[40px] bg-white text-[var(--theme-text)]" placeholder={tipeValue === 'Sertifikasi' ? 'Cth: Sertifikasi BNSP' : 'Cth: Gemastik 2026'} />
                    {errors.nama_lomba && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.nama_lomba.message}</p>}
                  </div>
                  
                  {tipeValue === 'Prestasi Mandiri' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Kategori (Prestasi Mandiri) <span className="text-[var(--theme-error)]">*</span></label>
                      <select {...register('kategori')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-on-surface bg-[var(--theme-bg)] h-[40px] text-xs font-semibold">
                        <option value="">Pilih Kategori</option>
                        <option value="RISNOV">Riset dan Inovasi : STEM</option>
                        <option value="RISNOVSSH">Riset dan Inovasi : SSH</option>
                        <option value="SENBUD">Seni dan Budaya</option>
                        <option value="OLAHRAGA">Olahraga</option>
                        <option value="MINAT">Minat Khusus</option>
                      </select>
                      {errors.kategori && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.kategori.message}</p>}
                    </div>
                  )}

                  {tipeValue === 'Rekognisi' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Jenis Rekognisi <span className="text-[var(--theme-error)]">*</span></label>
                      <select {...register('jenis_rekognisi')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-on-surface bg-[var(--theme-bg)] h-[40px] text-xs font-semibold">
                        <option value="">Pilih Jenis Rekognisi</option>
                        <option value="SERKOM">Sertifikat Kompetensi</option>
                        <option value="JURIOR">Juri/Pelatih/Wasit Olahraga</option>
                        <option value="JURINOR">Juri/Pelatih/Wasit Non Olahraga</option>
                        <option value="KEYCONF">Keynote speaker conference</option>
                        <option value="KEYWORK">Keynote speaker workshop/pelatihan/bimtek</option>
                        <option value="PAMERAN">Pameran karya seni</option>
                        <option value="KARYA">Karya cipta lagu dan/atau seni tari</option>
                        <option value="BUKU">Penulis buku</option>
                        <option value="PATEN">Paten/Paten Sederhana</option>
                        <option value="PUB">Publikasi artikel ilmiah</option>
                        <option value="DUTA">Duta (Brand Ambassador)</option>
                        <option value="PTG">Produk Teknologi tepat guna</option>
                        <option value="PSB">Produk Seni dan Budaya</option>
                        <option value="PKD">Produk Kreatif Dunia Usaha dan Industri</option>
                      </select>
                      {errors.jenis_rekognisi && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.jenis_rekognisi.message}</p>}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Tingkat <span className="text-[var(--theme-error)]">*</span></label>
                    <select {...register('tingkat')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-on-surface bg-[var(--theme-bg)] h-[40px] text-xs font-semibold">
                      <option value="">Pilih Tingkat</option>
                      <option value="KAB">Kabupaten/Kota</option>
                      <option value="PROV">Provinsi</option>
                      <option value="NAS">Nasional</option>
                      <option value="INT">Internasional</option>
                    </select>
                    {errors.tingkat && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.tingkat.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Penyelenggara <span className="text-[var(--theme-error)]">*</span></label>
                    <input {...register('penyelenggara')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-xs font-semibold h-[40px] bg-white text-[var(--theme-text)]" placeholder="Cth: Kemendikbud" />
                    {errors.penyelenggara && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.penyelenggara.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Tanggal Pelaksanaan <span className="text-[var(--theme-error)]">*</span></label>
                    <input type="date" {...register('tanggal')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-on-surface bg-white h-[40px] text-xs font-semibold" />
                    {errors.tanggal && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.tanggal.message}</p>}
                  </div>
                  {tipeValue === 'Prestasi Mandiri' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Peringkat Diraih <span className="text-[var(--theme-error)]">*</span></label>
                      <select {...register('peringkat')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-on-surface bg-[var(--theme-bg)] h-[40px] text-xs font-semibold">
                        <option value="">Pilih Peringkat</option>
                        <option value="JUARA1">Juara I</option>
                        <option value="JUARA2">Juara II</option>
                        <option value="JUARA3">Juara III</option>
                        <option value="HARAPAN1">Harapan I</option>
                        <option value="HARAPAN2">Harapan II</option>
                        <option value="HARAPAN3">Harapan III</option>
                        <option value="APRESIASI">Apresiasi Kejuaraan/Penghargaan Tambahan/Juara Umum</option>
                        <option value="PESERTA">Peserta</option>
                      </select>
                      {errors.peringkat && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.peringkat.message}</p>}
                    </div>
                  )}
                  {tipeValue === 'Pengajuan Dana' && (
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">Dana yang Diajukan (Rp) <span className="text-[var(--theme-error)]">*</span></label>
                      <input type="number" {...register('dana_diajukan')} className="w-full border border-border rounded-xl px-4 py-2 focus:border-[var(--theme-primary)] outline-none text-xs font-semibold h-[40px] bg-white text-[var(--theme-text)]" placeholder="Cth: 1500000" />
                      {errors.dana_diajukan && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.dana_diajukan.message}</p>}
                    </div>
                  )}
                </div>

                {/* SIMKATMAWA Optional Fields */}
                <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-4 mt-2">
                   <h3 className="text-sm font-bold text-[var(--theme-text)] mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{fontSize: '18px'}}>account_balance</span>
                      Informasi Tambahan untuk SIMKATMAWA (Opsional)
                   </h3>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">Cabang Lomba</label>
                        <input {...register('cabang')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="Cth: Lomba Esai" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">Kepesertaan</label>
                        <select {...register('kelompok_prestasi')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm bg-white">
                          <option value="">Pilih</option>
                          <option value="INDIVIDU">Individu</option>
                          <option value="KELOMPOK">Kelompok</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">Bentuk Kompetisi</label>
                        <select {...register('bentuk')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm bg-white">
                          <option value="">Pilih</option>
                          <option value="LURING">Luring/hibrida</option>
                          <option value="DARING">Daring</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">URL Kompetisi / Lomba</label>
                        <input {...register('url_peserta')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">URL Dokumen Sertifikat</label>
                        <input {...register('url_sertifikat')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">URL Foto UPP (Serah Terima)</label>
                        <input {...register('url_foto_upp')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">URL Dokumen Undangan</label>
                        <input {...register('url_dokumen_undangan')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="https://..." />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">Jumlah PT Peserta (Atau Negara)</label>
                        <input type="number" {...register('jumlah_unit_peserta')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="Cth: 10" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">Keterangan</label>
                        <input {...register('keterangan')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="Keterangan tambahan..." />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">ID Mahasiswa Tim (Pisahkan dengan koma)</label>
                        <input {...register('anggota_mahasiswa')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="Cth: 1, 2, 3" />
                        <p className="text-[10px] text-[var(--theme-text-muted)] mt-1">Isi jika prestasi ini diraih secara berkelompok.</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs font-semibold mb-1 text-[var(--theme-text-muted)]">ID / NIDN Dosen Pembimbing (Pisahkan dengan koma)</label>
                        <input {...register('pembimbing_dosen')} className="w-full border border-border rounded-xl px-3 py-1.5 focus:border-[var(--theme-primary)] outline-none text-sm" placeholder="Cth: 5, 0012345678" />
                      </div>
                   </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-[var(--theme-text-muted)]">
                    {tipeValue === 'Pengajuan Dana' ? 'Upload Proposal/Bukti Pendukung' : 'Upload Sertifikat/Bukti'} <span className="text-[var(--theme-error)]">*</span>
                  </label>
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:bg-background transition-colors relative">
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg" {...register('sertifikat')} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                    <div className="pointer-events-none flex flex-col items-center">
                      <span className="material-symbols-outlined text-[var(--theme-text-subtle)] mb-2" style={{ fontSize: '32px' }}>upload</span>
                      <p className="text-sm font-semibold text-[var(--theme-primary)]">Klik untuk Upload File</p>
                      <p className="text-xs text-[var(--theme-text-subtle)] mt-1">Format: PDF, JPG, PNG (Max. 5MB)</p>
                      {fileValue && fileValue.length > 0 && (
                        <div className="mt-3 px-3 py-1 bg-[var(--theme-primary-light)] border border-[var(--theme-primary-light)] text-[var(--theme-primary)] text-xs font-bold rounded-lg truncate w-full max-w-xs">
                          Terpilih: {fileValue[0].name}
                        </div>
                      )}
                    </div>
                  </div>
                  {errors.sertifikat && <p className="text-xs text-[var(--theme-error)] mt-1">{errors.sertifikat?.message || errors.sertifikat?.root?.message}</p>}
                </div>
              </>
            )}
          </div>

            <div className="p-5 sm:p-6 border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)] shrink-0 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl border border-[var(--theme-border)] text-[var(--theme-text-muted)] text-xs font-black hover:bg-[var(--theme-bg)] transition-colors cursor-pointer bg-[var(--theme-surface)] uppercase tracking-wider">Batal</button>
              <button type="submit" disabled={createMutation.isLoading} className="flex-1 py-3 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-black hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider border-none shadow-md shadow-[var(--theme-primary)]/20">
                {createMutation.isLoading ? 'Menyimpan...' : (tipeValue === 'Pengajuan Dana' ? 'Kirim Pengajuan' : 'Simpan Laporan')}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DETAIL */}
      <Dialog open={!!selectedDetail} onOpenChange={() => setSelectedDetail(null)} maxWidth="max-w-xl">
        <DialogContent className="p-0 overflow-hidden glass-card rounded-3xl border-0 shadow-2xl">
          <DialogHeader className="p-8 pb-6 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/50 relative">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
              <span className="material-symbols-outlined text-8xl text-[var(--theme-primary)]">task</span>
            </div>
            <div className="text-left relative z-10 flex gap-4 items-start">
              <div className="w-14 h-14 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-2xl flex items-center justify-center shrink-0 border border-[var(--theme-primary)]/20 shadow-inner">
                 <span className="material-symbols-outlined" style={{ fontSize: 28 }}>fact_check</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-widest mb-1">Detail Informasi</p>
                <DialogTitle className="text-xl md:text-2xl font-black mt-1 text-[var(--theme-text)] leading-tight tracking-tight">
                  {selectedDetail && (selectedDetail.tipe || selectedDetail.Tipe || 'Laporan Prestasi') === 'Pengajuan Dana' ? 'Detail Pengajuan Dana Lomba' : 'Detail Prestasi'}
                </DialogTitle>
                <DialogDescription className="text-xs font-bold text-[var(--theme-text-muted)] mt-2">
                  Informasi lengkap dan status verifikasi pengajuan atau pelaporan prestasi.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        {selectedDetail && (
          <div className="flex flex-col max-h-[85vh]">
            <div className="p-5 sm:p-8 overflow-y-auto space-y-5 text-left bg-white">
              {(selectedDetail.catatan_verifikator || selectedDetail.CatatanVerifikator) && (
                 <div className={`p-4 rounded-xl border ${
                   selectedDetail.status === 'Ditolak' || selectedDetail.Status === 'Ditolak'
                     ? 'bg-[var(--theme-error-light)] border-[var(--theme-error)]/20 text-[var(--theme-error)]'
                     : 'bg-[var(--theme-success-light)] border-[var(--theme-success)]/20 text-[var(--theme-success)]'
                 } font-semibold text-xs leading-relaxed`}>
                   <p className="font-bold text-sm">{selectedDetail.status === 'Ditolak' || selectedDetail.Status === 'Ditolak' ? 'Alasan Ditolak:' : 'Catatan Verifikator:'}</p>
                   <p className="text-xs mt-1">{selectedDetail.catatan_verifikator || selectedDetail.CatatanVerifikator}</p>
                 </div>
              )}

              <table className="w-full text-sm">
                <tbody>
                  <tr className="border-b border-[var(--theme-border-muted)]"><td className="py-2.5 font-semibold text-[var(--theme-text-subtle)] w-1/3">Tipe Pengajuan</td><td className="py-2 font-bold text-on-surface">{(selectedDetail.tipe || selectedDetail.Tipe || 'Laporan Prestasi')}</td></tr>
                  <tr className="border-b border-[var(--theme-border-muted)]"><td className="py-2.5 font-semibold text-[var(--theme-text-subtle)]">Nama Lomba</td><td className="py-2 font-bold text-on-surface">{selectedDetail.nama_kegiatan || selectedDetail.NamaKegiatan}</td></tr>
                  <tr className="border-b border-[var(--theme-border-muted)]"><td className="py-2.5 font-semibold text-[var(--theme-text-subtle)]">Kategori / Tingkat</td><td className="py-2 font-bold text-on-surface">{selectedDetail.kategori || selectedDetail.Kategori} - {selectedDetail.tingkat || selectedDetail.Tingkat}</td></tr>
                  <tr className="border-b border-[var(--theme-border-muted)]"><td className="py-2.5 font-semibold text-[var(--theme-text-subtle)]">Penyelenggara</td><td className="py-2 font-bold text-on-surface">{selectedDetail.penyelenggara || selectedDetail.Penyelenggara || '—'}</td></tr>
                  
                  {(selectedDetail.tipe || selectedDetail.Tipe || 'Laporan Prestasi') === 'Pengajuan Dana' ? (
                    <>
                      <tr className="border-b border-[var(--theme-border-muted)]">
                        <td className="py-2.5 font-semibold text-[var(--theme-text-subtle)]">Dana Diajukan</td>
                        <td className="py-2 font-bold text-[var(--theme-primary)]">Rp {(selectedDetail.dana_diajukan || selectedDetail.DanaDiajukan || 0).toLocaleString('id-ID')}</td>
                      </tr>
                      <tr className="border-b border-[var(--theme-border-muted)]">
                        <td className="py-2.5 font-semibold text-[var(--theme-text-subtle)]">Dana Disetujui</td>
                        <td className="py-2 font-bold text-[var(--theme-success)]">
                          {(selectedDetail.dana_disetujui || selectedDetail.DanaDisetujui) ? `Rp ${(selectedDetail.dana_disetujui || selectedDetail.DanaDisetujui).toLocaleString('id-ID')}` : 'Belum disetujui'}
                        </td>
                      </tr>
                    </>
                  ) : (
                    <tr className="border-b border-[var(--theme-border-muted)]"><td className="py-2.5 font-semibold text-[var(--theme-text-subtle)]">Peringkat</td><td className="py-2 font-bold text-[var(--theme-primary)]">{selectedDetail.peringkat || selectedDetail.Peringkat || '—'}</td></tr>
                  )}
                  
                  <tr className="border-b border-[var(--theme-border-muted)]">
                    <td className="py-2.5 font-semibold text-[var(--theme-text-subtle)]">Status</td>
                    <td className="py-2 font-bold text-on-surface">
                      {selectedDetail.status === 'Diverifikasi' || selectedDetail.status === 'Valid' || selectedDetail.status === 'Disetujui' || selectedDetail.Status === 'Diverifikasi' || selectedDetail.Status === 'Disetujui' ? 'Disetujui' : (selectedDetail.status || selectedDetail.Status || 'Menunggu')}
                    </td>
                  </tr>
                </tbody>
              </table>

              <div className="mt-6">
                <p className="font-semibold text-sm mb-2 text-[var(--theme-text-subtle)]">
                  {(selectedDetail.tipe || selectedDetail.Tipe || 'Laporan Prestasi') === 'Pengajuan Dana' ? 'Proposal / Dokumen Pendukung' : 'Bukti Sertifikat'}
                </p>
                {(selectedDetail.bukti_url || selectedDetail.BuktiURL) ? (
                  <a href={`${API_BASE_URL.replace('/api', '')}${selectedDetail.bukti_url || selectedDetail.BuktiURL}`} target="_blank" rel="noreferrer" className="flex items-center justify-center p-3 border border-border rounded-xl hover:bg-[var(--theme-primary-light)] hover:border-[var(--theme-primary)] transition-colors text-sm font-bold text-[var(--theme-primary)]">
                    {(selectedDetail.tipe || selectedDetail.Tipe || 'Laporan Prestasi') === 'Pengajuan Dana' ? 'Lihat Proposal / Dokumen' : 'Lihat Dokumen Sertifikat'}
                  </a>
                ) : (
                  <p className="text-sm italic text-[var(--theme-text-subtle)]">Tidak ada lampiran.</p>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)] shrink-0">
              <button
                onClick={() => setSelectedDetail(null)}
                className="w-full sm:w-auto py-3 px-6 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] text-xs font-black rounded-xl hover:bg-[var(--theme-bg)] transition-all uppercase tracking-wider cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
        </DialogContent>
      </Dialog>

    </PageContent>
  );
}
