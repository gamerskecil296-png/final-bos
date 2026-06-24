import { useEffect, useState, useMemo } from 'react';
import { psychologistService, adminService } from '@/services/api';
import { toast } from 'react-hot-toast';
import { DataTable } from '@/components/ui/DataTable';
import { DialogModal } from '@/components/ui/DialogModal';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DashboardHero } from '@/components/ui/dashboard';
import { usePermission } from '@/hooks/usePermission';
import useAuthStore from '@/store/useAuthStore';
import AdminPsychologistReferrals from './AdminPsychologistReferrals';

// Material Symbol icons
const Send = ({ size, className, ...props }) => <span className={`material-symbols-outlined shrink-0 ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>send</span>;
const CheckCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined shrink-0 ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined shrink-0 ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const FileDownload = ({ size, className, ...props }) => <span className={`material-symbols-outlined shrink-0 ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>;


export default function ReferralManagement() {
    const user = useAuthStore(state => state.user);
    const roleStr = user?.role ? user.role.toLowerCase() : '';
    const isSuperAdmin = roleStr.includes('super') && roleStr.includes('admin');

    if (isSuperAdmin) {
    return <AdminPsychologistReferrals />;
  }

  const [referrals, setReferrals] = useState([]);
  const [mahasiswaList, setMahasiswaList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedPatientHistory, setSelectedPatientHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { hasPermission } = usePermission();
  const canManageReferrals = hasPermission('psychologist.referrals.create') || hasPermission('psychologist.referrals.update') || hasPermission('psychologist.referrals.delete');
  const [newReferral, setNewReferral] = useState({
    mahasiswa_id: '',
    tipe: 'Medis',
    alasan: '',
    pihak_tujuan: '',
    email_tujuan: '',
  });

  const statusColors = {
    'menunggu_approval': {
      bg: 'bg-[var(--theme-warning-light)]',
      border: 'border-[var(--theme-warning)]/20',
      text: 'text-[var(--theme-warning)]',
    },
    'Pending': {
      bg: 'bg-[var(--theme-warning-light)]',
      border: 'border-[var(--theme-warning)]/20',
      text: 'text-[var(--theme-warning)]',
    },
    'Selesai': {
      bg: 'bg-[var(--theme-success-light)]',
      border: 'border-[var(--theme-success)]/20',
      text: 'text-[var(--theme-success)]',
    },
    'Ditolak': {
      bg: 'bg-[var(--theme-error-light)]',
      border: 'border-[var(--theme-error)]/20',
      text: 'text-[var(--theme-error)]',
    },
  };

  useEffect(() => {
    loadReferrals();
    loadMahasiswa();
  }, []);

  const loadMahasiswa = async () => {
    try {
      const response = await psychologistService.getPatients();
      setMahasiswaList(response.data || []);
    } catch (err) {
      console.error('Error loading mahasiswa:', err);
    }
  };

  const loadReferrals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await psychologistService.getReferrals();
      setReferrals(response.data || []);
    } catch (err) {
      setError('Gagal memuat data tindak lanjut');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    
    // Validate all fields
    if (!newReferral.mahasiswa_id) {
      toast.error('Pilih pasien terlebih dahulu');
      return;
    }
    if (!newReferral.tipe) {
      toast.error('Pilih tipe rujukan');
      return;
    }
    if (!newReferral.alasan || newReferral.alasan.trim() === '') {
      toast.error('Alasan rujukan tidak boleh kosong');
      return;
    }
    if (!newReferral.pihak_tujuan || newReferral.pihak_tujuan.trim() === '') {
      toast.error('Pihak tujuan tidak boleh kosong');
      return;
    }
    if (!newReferral.email_tujuan || newReferral.email_tujuan.trim() === '') {
      toast.error('Email tujuan tidak boleh kosong');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newReferral.email_tujuan)) {
      toast.error('Format email tidak valid');
      return;
    }

    try {
      const payload = {
        mahasiswa_id: parseInt(newReferral.mahasiswa_id, 10),
        tipe: newReferral.tipe,
        alasan: newReferral.alasan.trim(),
        pihak_tujuan: newReferral.pihak_tujuan.trim(),
        email_tujuan: newReferral.email_tujuan.trim(),
      };
      
      // Validate mahasiswa_id is a valid number
      if (isNaN(payload.mahasiswa_id) || payload.mahasiswa_id <= 0) {
        toast.error('ID Pasien tidak valid');
        return;
      }

      console.log('Creating referral with payload:', payload);
      await psychologistService.createReferral(payload);
      await loadReferrals();
      setNewReferral({
        mahasiswa_id: '',
        tipe: 'Medis',
        alasan: '',
        pihak_tujuan: '',
        email_tujuan: '',
      });
      setSearchQuery('');
      setSelectedPatientHistory([]);
      setIsModalOpen(false);
      toast.success('Surat rujukan berhasil dibuat');
    } catch (err) {
      console.error('Error creating referral:', err);
      toast.error('Gagal membuat surat rujukan: ' + (err.response?.data?.message || err.message || 'Unknown error'));
    }
  };



  const getStatusLabel = (status) => {
    const labels = {
      'Pending': 'Menunggu Persetujuan',
      'menunggu_approval': 'Menunggu Persetujuan',
      'Selesai': 'Selesai',
      'Ditolak': 'Ditolak',
    };
    return labels[status] || status;
  };

  const handleTableSearch = (data, searchVal) => {
    const query = searchVal.trim().toLowerCase();
    if (!query) return data;
    return data.filter((r) => {
      const searchableStr = [
        r.mahasiswa_name,
        r.tipe,
        r.pihak_tujuan,
        r.alasan,
        r.status
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableStr.includes(query);
    });
  };

  const columns = [
    {
      key: 'mahasiswa_name',
      label: 'Identitas Pasien',
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center border border-slate-200 shrink-0 overflow-hidden relative">
            {row.foto_url || row.foto ? (
              <img src={row.foto_url || row.foto} alt={row.mahasiswa_name} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">person</span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900 group-hover:text-primary transition-colors max-w-[200px]">{row.mahasiswa_name}</p>
            <p className="mt-0.5 truncate text-[10px] font-medium text-slate-400">{row.tipe} &bull; {row.pihak_tujuan}</p>
          </div>
        </div>
      )
    },
    {
      key: 'alasan',
      label: 'Alasan Rujukan',
      sortable: true,
      render: (v, row) => (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded flex items-center justify-center shrink-0 bg-slate-100 text-slate-500">
              <span className="material-symbols-outlined !text-[12px]">description</span>
            </span>
            <div className="max-w-[200px]">
              <p className="text-[11px] font-bold text-slate-700 line-clamp-2" title={row.alasan}>{row.alasan}</p>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'approval_status',
      label: 'Status Rujukan',
      render: (v, row) => {
        const meta = {
          disetujui:        { label: 'Disetujui', cls: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: 'check_circle' },
          ditolak:          { label: 'Ditolak',   cls: 'bg-rose-50 text-rose-600 border-rose-100', icon: 'cancel' },
          menunggu_approval:{ label: 'Menunggu',  cls: 'bg-amber-50 text-amber-600 border-amber-100', icon: 'hourglass_empty' },
        }[row.approval_status] || { label: 'Menunggu', cls: 'bg-amber-50 text-amber-600 border-amber-100', icon: 'hourglass_empty' };

        const statusStyle = {
          'Pending': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
          'menunggu_approval': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
          'Selesai': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' },
          'Ditolak': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-100' },
        }[row.status] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-100' };

        return (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0 border", meta.cls)}>
                <span className="material-symbols-outlined !text-[12px]">{meta.icon}</span>
              </span>
              <div>
                <p className="text-[10px] font-bold text-slate-500">Persetujuan: {meta.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("w-5 h-5 rounded flex items-center justify-center shrink-0 border", statusStyle.bg, statusStyle.text, statusStyle.border)}>
                <span className="material-symbols-outlined !text-[12px]">local_shipping</span>
              </span>
              <div>
                <p className="text-[11px] font-bold text-slate-700">{getStatusLabel(row.status)}</p>
              </div>
            </div>
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      render: (v, row) => (
        <div className="flex items-center justify-end gap-1.5 shrink-0">
          {isSuperAdmin && (row.approval_status === 'menunggu_approval' || row.approval_status === 'pending' || row.status === 'Pending') && (
            <>
              <button
                onClick={async () => {
                  try {
                    await adminService.approvePsychologistReferral(row.id, 'approve', '');
                    toast.success('Rujukan disetujui');
                    loadReferrals();
                  } catch (err) {
                    toast.error('Gagal menyetujui: ' + err.message);
                  }
                }}
                className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors border border-emerald-200 active:scale-95"
                title="Setujui Rujukan"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">check</span>
              </button>
              <button
                onClick={async () => {
                  const note = prompt('Alasan penolakan:');
                  if (note === null) return;
                  try {
                    await adminService.approvePsychologistReferral(row.id, 'reject', note);
                    toast.success('Rujukan ditolak');
                    loadReferrals();
                  } catch (err) {
                    toast.error('Gagal menolak: ' + err.message);
                  }
                }}
                className="w-8 h-8 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center hover:bg-rose-200 transition-colors border border-rose-200 active:scale-95"
                title="Tolak Rujukan"
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </>
          )}
          {row.surat_rujukan_url && (
            <button
              onClick={async () => {
                try {
                  await psychologistService.downloadReferralPDF(row.id);
                } catch (err) {
                  toast.error('Gagal download PDF: ' + err.message);
                }
              }}
              className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:text-primary hover:bg-primary/10 transition-colors border border-slate-200 active:scale-95"
              title="Download PDF"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <>
      <div className="w-full relative space-y-6 scroll-smooth font-body">
          
        {/* ── Welcome Banner ─────────────────────────────────────────── */}
        <DashboardHero
          title="Manajemen Surat"
          highlightedTitle="Rujukan"
          subtitle="Kelola surat rujukan medis dan akademik untuk pasien Anda dengan sistem tracking yang terintegrasi."
          icon="send"
          badges={[{ label: 'Tindak Lanjut', active: false }]}
          actions={
            canManageReferrals && (
              <button 
                onClick={() => {
                  setNewReferral({
                    mahasiswa_id: '',
                    tipe: 'Medis',
                    alasan: '',
                    pihak_tujuan: '',
                    email_tujuan: '',
                  });
                  setSearchQuery('');
                  setSelectedPatientHistory([]);
                  setIsModalOpen(true);
                }}
                className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white px-5 py-3 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all flex items-center gap-2 active:scale-95 border-none cursor-pointer w-full lg:w-auto"
              >
                <span className="material-symbols-outlined text-[18px] shrink-0">add</span> Buat Rujukan Baru
              </button>
            )
          }
        />



        {/* Referrals List Card */}
        <div className="w-full">
          <DataTable
            title="Daftar Surat Rujukan"
            subtitle={`Total: ${referrals.length} data`}
            columns={columns}
            data={referrals}
            loading={loading}
            searchable={true}
            onSearch={handleTableSearch}
            searchPlaceholder="Cari nama pasien, tipe, tujuan..."
            pagination={true}
            pageSize={10}
            emptyMessage="Tidak ada rujukan. Belum ada data surat rujukan yang dibuat."
            emptyIcon="inbox"
            filters={[
              {
                key: 'status',
                placeholder: 'Status Rujukan',
                options: [
                  { label: 'Menunggu', value: 'menunggu_approval' },
                  { label: 'Selesai', value: 'Selesai' },
                  { label: 'Ditolak', value: 'Ditolak' }
                ]
              }
            ]}
          />
        </div>
      </div>

      {/* --- CREATE REFERRAL MODAL --- */}
      <DialogModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Surat Rujukan Baru"
        subtitle="Buat Rujukan untuk Pasien"
        icon="send"
        maxWidth="max-w-lg"
        bodyClassName="!p-0"
        footer={
          <div className="flex gap-3 w-full">
            <button 
              type="button" 
              onClick={() => setIsModalOpen(false)} 
              className="flex-1 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Batal
            </button>
            <button 
              type="submit"
              form="create-referral-form"
              className="flex-1 text-white px-5 h-11 rounded-xl text-[10px] font-bold uppercase tracking-widest shadow-sm flex items-center justify-center gap-2 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] active:scale-95 transition-all border-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] shrink-0">save</span> Buat Rujukan
            </button>
          </div>
        }
      >
        <form id="create-referral-form" onSubmit={handleCreateReferral} className="flex flex-col gap-4 p-5 sm:p-6">
          <div className="relative">
            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 mb-1.5 block">Pilih Pasien</label>
            <div className="relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if(e.target.value === '') {
                    setNewReferral({ ...newReferral, mahasiswa_id: '' });
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                placeholder="Cari nama pasien atau NIM..."
                className="h-10 w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-xs font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 placeholder-[var(--theme-text-muted)]/50"
              />
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] pointer-events-none text-[18px]">search</span>
            </div>

            {showDropdown && (
              <div className="absolute z-20 w-full mt-1 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                {mahasiswaList.filter(m => {
                  const str = `${m.nama || m.name} ${m.nim || m.id}`.toLowerCase();
                  return str.includes(searchQuery.toLowerCase());
                }).map((maba) => (
                  <div 
                    key={maba.id} 
                    onClick={async () => {
                      setNewReferral({ ...newReferral, mahasiswa_id: maba.id });
                      setSearchQuery(`${maba.nama || maba.name} (${maba.nim || maba.id})`);
                      setShowDropdown(false);
                      setLoadingHistory(true);
                      try {
                        const res = await psychologistService.getMedicalRecord(maba.id);
                        setSelectedPatientHistory(res.data?.records || []);
                      } catch (err) {
                        console.error('Error fetching medical record:', err);
                        setSelectedPatientHistory([]);
                      } finally {
                        setLoadingHistory(false);
                      }
                    }}
                    className={cn(
                      "px-3 py-2.5 cursor-pointer text-xs transition-colors hover:bg-[var(--theme-bg)] border-b border-[var(--theme-border)] last:border-0",
                      newReferral.mahasiswa_id === maba.id ? 'text-[var(--theme-primary)] font-bold bg-[var(--theme-primary)]/5' : 'text-[var(--theme-text)] font-medium'
                    )}
                  >
                    {maba.nama || maba.name} <span className="text-[10px] text-[var(--theme-text-muted)] ml-1">({maba.nim || maba.id})</span>
                  </div>
                ))}
                {mahasiswaList.filter(m => {
                  const str = `${m.nama || m.name} ${m.nim || m.id}`.toLowerCase();
                  return str.includes(searchQuery.toLowerCase());
                }).length === 0 && (
                  <div className="px-3 py-3 text-center text-xs text-[var(--theme-text-muted)] italic">
                    Pasien tidak ditemukan
                  </div>
                )}
              </div>
            )}

            {newReferral.mahasiswa_id && (
              <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-3 mt-2 max-h-40 overflow-y-auto">
                <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] shrink-0">history</span> Riwayat Sesi
                </p>
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-[var(--theme-primary)]"></div>
                  </div>
                ) : selectedPatientHistory.length === 0 ? (
                  <p className="text-[9px] text-[var(--theme-text-muted)] font-bold uppercase tracking-wide text-center py-1">Tidak ada riwayat</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPatientHistory.map((item, idx) => (
                      <div key={item.id || idx} className="border-b border-[var(--theme-border)] last:border-0 pb-2 last:pb-0">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[8px] font-bold text-[var(--theme-text)] uppercase tracking-wider">{item.date}</span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]">{item.type}</span>
                        </div>
                        <p className="text-[9px] text-[var(--theme-text)] font-medium leading-relaxed">
                          <span className="font-bold">Keluhan:</span> {item.complaint || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 mb-1.5 block">Tipe Rujukan</label>
            <div className="relative">
              <select 
                value={newReferral.tipe}
                onChange={(e) => setNewReferral({ ...newReferral, tipe: e.target.value })}
                className="h-10 w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 pr-8 text-xs font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 cursor-pointer"
              >
                <option value="Medis">Medis</option>
                <option value="Akademik">Akademik</option>
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--theme-text-muted)] pointer-events-none">expand_more</span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 mb-1.5 block">Alasan Rujukan</label>
            <textarea 
              required
              value={newReferral.alasan}
              onChange={(e) => setNewReferral({ ...newReferral, alasan: e.target.value })}
              className="w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-xs font-medium text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]/50 outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 h-20 resize-none leading-relaxed"
              placeholder="Jelaskan alasan rujukan..."
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 mb-1.5 block">Pihak Tujuan</label>
            <input 
              required
              type="text"
              value={newReferral.pihak_tujuan}
              onChange={(e) => setNewReferral({ ...newReferral, pihak_tujuan: e.target.value })}
              className="h-10 w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-xs font-semibold text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]/50 outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10"
              placeholder="Nama klinik/psikolog tujuan"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 mb-1.5 block">Email Tujuan</label>
            <input 
              required
              type="email"
              value={newReferral.email_tujuan}
              onChange={(e) => setNewReferral({ ...newReferral, email_tujuan: e.target.value })}
              className="h-10 w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-xs font-semibold text-[var(--theme-text)] placeholder-[var(--theme-text-muted)]/50 outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10"
              placeholder="email@example.com"
            />
          </div>
        </form>
      </DialogModal>
    </>
  );
}
