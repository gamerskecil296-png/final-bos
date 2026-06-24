import React, { useState, useEffect } from 'react';
import { insuranceService } from '../../services/api';
import toast from 'react-hot-toast';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DataTable } from '@/components/ui/DataTable';
import { DialogModal } from '@/components/ui/DialogModal';

// Auto-injected Material Symbol fallbacks
const InsuranceIcon = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>health_and_safety</span>
);
const CheckCircle = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>
);
const CancelIcon = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>cancel</span>
);
const DownloadIcon = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>
);

// Provider options
const PROVIDER_OPTIONS = [
  { value: 'BKU_Assurance', label: 'BKU Assurance' },
  { value: 'BPJS', label: 'BPJS Kesehatan' },
  { value: 'Asuransi_Lain', label: 'Asuransi Lain' },
];

// Status options
const STATUS_OPTIONS = [
  { value: 'PENDING_VERIFICATION', label: 'Menunggu' },
  { value: 'APPROVED_TK', label: 'Disetujui TK' },
  { value: 'APPROVED_FINAL', label: 'Final Approved' },
  { value: 'REJECTED', label: 'Ditolak' },
];

// Status badge component
const StatusBadge = ({ status }) => {
  const statusConfig = {
    'PENDING_VERIFICATION': { label: 'Menunggu', bg: 'color-mix(in srgb, var(--theme-warning) 10%, transparent)', text: 'var(--theme-warning)', border: 'color-mix(in srgb, var(--theme-warning) 20%, transparent)', dot: 'var(--theme-warning)' },
    'APPROVED_TK': { label: 'Disetujui TK', bg: 'color-mix(in srgb, var(--theme-info) 10%, transparent)', text: 'var(--theme-info)', border: 'color-mix(in srgb, var(--theme-info) 20%, transparent)', dot: 'var(--theme-info)' },
    'APPROVED_FINAL': { label: 'Final Approved', bg: 'color-mix(in srgb, var(--theme-success) 10%, transparent)', text: 'var(--theme-success)', border: 'color-mix(in srgb, var(--theme-success) 20%, transparent)', dot: 'var(--theme-success)' },
    'REJECTED': { label: 'Ditolak', bg: 'color-mix(in srgb, var(--theme-error) 10%, transparent)', text: 'var(--theme-error)', border: 'color-mix(in srgb, var(--theme-error) 20%, transparent)', dot: 'var(--theme-error)' },
  };

  const config = statusConfig[status] || statusConfig['PENDING_VERIFICATION'];

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap"
      style={{ backgroundColor: config.bg, color: config.text, borderColor: config.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: config.dot }} />
      {config.label}
    </span>
  );
};

// Provider badge
const ProviderBadge = ({ provider }) => {
  const config = {
    'BKU_Assurance': { label: 'BKU Assurance', color: 'bg-[var(--theme-primary)] text-white' },
    'BPJS': { label: 'BPJS Kesehatan', color: 'bg-[var(--theme-info)] text-white' },
    'Asuransi_Lain': { label: 'Asuransi Lain', color: 'bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]' },
  };
  const badge = config[provider] || config['Asuransi_Lain'];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${badge.color}`}>
      {badge.label}
    </span>
  );
};

export default function InsuranceReview() {
  const [claims, setClaims] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProvider, setFilterProvider] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch claims
  const fetchClaims = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus && filterStatus !== 'all') params.status = filterStatus;
      if (filterProvider && filterProvider !== 'all') params.jenis_provider = filterProvider;

      const res = await insuranceService.getClaims(params);
      if (res.status === 'success') {
        setClaims(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching claims:', err);
      toast.error('Gagal memuat data klaim');
    } finally {
      setLoading(false);
    }
  };

  // Fetch stats
  const fetchStats = async () => {
    try {
      const res = await insuranceService.getClaimStats();
      if (res.status === 'success') {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchClaims();
    fetchStats();
  }, [filterStatus, filterProvider]);

  // Open detail modal
  const handleOpenDetail = (claim) => {
    setSelectedClaim(claim);
    setIsModalOpen(true);
  };

  // Update claim status
  const handleUpdateStatus = async (newStatus, catatan = '') => {
    if (!selectedClaim) return;

    setProcessing(true);
    try {
      const res = await insuranceService.updateClaimStatus(selectedClaim.id, {
        status: newStatus,
        catatan_review: catatan,
      });

      if (res.status === 'success') {
        toast.success(`Klaim berhasil ${newStatus === 'APPROVED_TK' ? 'disetujui' : 'ditolak'}`);
        setIsModalOpen(false);
        fetchClaims();
        fetchStats();
      }
    } catch (err) {
      toast.error(err.message || 'Gagal update status');
    } finally {
      setProcessing(false);
    }
  };

  // Download PDF
  const handleDownloadPDF = async (id) => {
    try {
      const response = await insuranceService.downloadClaimPDF(id);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `surat_pengantar_klaim_${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF berhasil didownload');
    } catch (err) {
      toast.error('Gagal download PDF');
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount) return '—';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // Filter by search locally
  const filteredClaims = claims.filter(claim => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      claim.mahasiswa?.nama?.toLowerCase().includes(query) ||
      claim.mahasiswa?.nim?.toLowerCase().includes(query) ||
      claim.deskripsi?.toLowerCase().includes(query)
    );
  });

  const columns = [
    {
      key: 'mahasiswa',
      label: 'Identitas Mahasiswa',
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] flex items-center justify-center shrink-0 overflow-hidden relative group-hover:scale-105 transition-transform">
            {row.mahasiswa?.foto_url || row.mahasiswa?.foto ? (
              <img src={row.mahasiswa.foto_url || row.mahasiswa.foto} alt={row.mahasiswa?.nama} className="w-full h-full object-cover" />
            ) : (
              <span className="material-symbols-outlined text-[20px]">person</span>
            )}
          </div>
          <div>
            <p className="font-bold text-[13px] text-[var(--theme-text)] max-w-[180px] truncate">{row.mahasiswa?.nama || '—'}</p>
            <p className="text-[10px] font-medium text-[var(--theme-text-muted)] mt-0.5">{row.mahasiswa?.nim || '—'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'kontak',
      label: 'Kontak',
      sortable: false,
      render: (v, row) => (
        <div className="flex flex-col gap-0.5">
          <p className="text-[11px] font-bold text-[var(--theme-text)]">{row.mahasiswa?.no_hp || '-'}</p>
          <p className="text-[10px] font-medium text-[var(--theme-text-muted)]">{row.mahasiswa?.email_personal || '-'}</p>
        </div>
      )
    },
    {
      key: 'jenis_provider',
      label: 'Provider Asuransi',
      sortable: true,
      render: (v, row) => <ProviderBadge provider={row.jenis_provider} />
    },
    {
      key: 'detail_klaim',
      label: 'Detail Kejadian & Biaya',
      render: (v, row) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--theme-text)]">
            <span className="material-symbols-outlined text-[16px] text-[var(--theme-text-muted)]">calendar_month</span>
            {formatDate(row.tanggal_kejadian)}
          </div>
          <div className="text-[12px] font-black text-[var(--theme-primary)] pl-[22px]">
            {formatCurrency(row.estimasi_biaya)}
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v, row) => <StatusBadge status={row.status} />
    },
    {
      key: 'aksi',
      label: 'Tindakan',
      className: 'text-right',
      render: (v, row) => (
        <div className="flex items-center gap-2 justify-end" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => handleOpenDetail(row)}
            className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--theme-primary)] hover:opacity-90 text-white text-[11px] font-semibold transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[16px]">fact_check</span> Review
          </button>
          {row.status === 'APPROVED_TK' && (
            <button
              onClick={() => handleDownloadPDF(row.id)}
              className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--theme-bg)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text)] text-[11px] font-semibold transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> PDF
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <PageContent>
      <DashboardHero
        title="Review"
        highlightedTitle="Klaim Asuransi"
        subtitle="Lihat pengajuan klaim asuransi kesehatan mahasiswa"
        icon="health_and_safety"
        badges={[{ label: 'Insurance Review', active: true }]}
      />

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <PrimaryStatsCard
          title="Total Pengajuan"
          value={`${stats?.summary?.total_pengajuan || 0} Klaim`}
          icon="description"
          colorTheme="primary"
          badgeText="SEMUA"
        />
        <PrimaryStatsCard
          title="Menunggu Review"
          value={`${stats?.summary?.pending || 0} Antrean`}
          icon="schedule"
          colorTheme="warning"
          badgeText="PERLU TINDAKAN"
        />
        <PrimaryStatsCard
          title="Disetujui TK"
          value={`${stats?.summary?.approved_tk || 0} Klaim`}
          icon="fact_check"
          colorTheme="info"
          badgeText="TAHAP LANJUTAN"
        />
        <PrimaryStatsCard
          title="Total Disetujui"
          value={`${(stats?.summary?.approved_final || 0) + (stats?.summary?.approved_tk || 0)} Klaim`}
          icon="verified"
          colorTheme="success"
          badgeText="FINAL"
        />
      </div>

      {/* DataTable */}
      <div className="w-full">
        <DataTable
          title="Daftar Pengajuan Klaim"
          subtitle={`Menampilkan ${filteredClaims.length} pengajuan klaim asuransi kesehatan`}
          columns={columns}
          data={filteredClaims}
          loading={loading}
          searchable={true}
          manualFiltering={true}
          searchValue={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Cari nama, NIM, atau deskripsi..."
          filterValues={{ status: filterStatus, jenis_provider: filterProvider }}
          onFilterChange={(key, val) => {
            if (key === 'status') setFilterStatus(val);
            if (key === 'jenis_provider') setFilterProvider(val);
          }}
          pagination={true}
          pageSize={10}
          emptyMessage="Tidak ada pengajuan klaim. Coba sesuaikan filter pencarian."
          emptyIcon="health_and_safety"
          filters={[
            {
              key: 'jenis_provider',
              placeholder: 'Provider',
              options: PROVIDER_OPTIONS
            },
            {
              key: 'status',
              placeholder: 'Status',
              options: STATUS_OPTIONS
            }
          ]}
        />
      </div>

      <DialogModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Detail Pengajuan Klaim"
        icon="health_and_safety"
        maxWidth="max-w-xl"
      >
        {selectedClaim && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Data Mahasiswa */}
              <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] font-headline mb-3">Data Mahasiswa</h3>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)]">Nama Lengkap</p>
                    <p className="text-[12px] font-bold text-[var(--theme-text)] mt-0.5">{selectedClaim.mahasiswa?.nama || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)]">NIM & Prodi</p>
                    <p className="text-[11px] font-semibold text-[var(--theme-text)] mt-0.5">
                      {selectedClaim.mahasiswa?.nim || '—'} - {selectedClaim.mahasiswa?.program_studi?.nama || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detail Klaim */}
              <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] font-headline mb-3">Informasi Klaim</h3>
                <div className="space-y-2.5">
                  <div>
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)]">Provider & Tanggal</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ProviderBadge provider={selectedClaim.jenis_provider} />
                      <span className="text-[11px] font-semibold text-[var(--theme-text)]">{formatDate(selectedClaim.tanggal_kejadian)}</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)]">Faskes & Estimasi Biaya</p>
                    <p className="text-[11px] font-bold text-[var(--theme-text)] mt-0.5">
                      {selectedClaim.lokasi_faskes || '—'} <span className="mx-1 text-[var(--theme-text-subtle)]">•</span> <span className="text-[var(--theme-primary)]">{formatCurrency(selectedClaim.estimasi_biaya)}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Kronologis */}
            <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] font-headline mb-2">Kronologis / Deskripsi</h3>
              <p className="text-[11px] leading-relaxed font-medium text-[var(--theme-text)]">{selectedClaim.deskripsi || '—'}</p>
            </div>

            {/* Document Attached */}
            {selectedClaim.file_url && (
              <div className="flex items-center justify-between bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-text-muted)]">
                    <span className="material-symbols-outlined text-[18px]">attach_file</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-[var(--theme-text)]">Dokumen Bukti Terlampir</p>
                    <p className="text-[10px] font-medium text-[var(--theme-text-subtle)]">{selectedClaim.nama_file || 'Berkas klaim asuransi'}</p>
                  </div>
                </div>
                <a href={selectedClaim.file_url} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary)]/10 px-2.5 py-1.5 rounded-lg hover:bg-[var(--theme-primary)] hover:text-white transition-colors">
                  Lihat Berkas
                </a>
              </div>
            )}

            {/* Removed Action Buttons for TenagaKesehatan as it's View Only */}
            {selectedClaim.status === 'PENDING_VERIFICATION' && (
              <div className="flex gap-3 pt-3 mt-4 border-t border-[var(--theme-border)]">
                <div className="w-full py-2.5 rounded-xl border border-amber-500/30 text-amber-600 bg-amber-50 text-[11px] font-bold text-center">
                  Menunggu Persetujuan SuperAdmin
                </div>
              </div>
            )}
          </div>
        )}
      </DialogModal>
    </PageContent>
  );
}