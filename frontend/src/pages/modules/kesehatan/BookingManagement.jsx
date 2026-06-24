import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenagaKesehatanService } from '@/services/api';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DataTable } from '@/components/ui/DataTable';
import { DialogModal } from '@/components/ui/DialogModal';
import { usePermission } from '@/hooks/usePermission';

export default function BookingManagement() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [bookings, setBookings] = useState([]);
  const { hasPermission } = usePermission();
  const canManageBookings = hasPermission('health.bookings.update') || hasPermission('health.bookings');
  
  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Date Filters for Hero Actions
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = () => {
    setLoading(true);
    tenagaKesehatanService.getBookings()
      .then((res) => {
        setBookings(res.data || []);
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat data booking.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  // Standardize backend status string
  const getNormalizedStatus = (statusStr) => {
    if (!statusStr) return 'Menunggu';
    if (statusStr === 'Menunggu Konfirmasi') return 'Menunggu';
    return statusStr;
  };

  const statusMeta = {
    'Menunggu': { bg: 'color-mix(in srgb, var(--theme-warning) 10%, transparent)', text: 'var(--theme-warning)', border: 'color-mix(in srgb, var(--theme-warning) 20%, transparent)', dot: 'var(--theme-warning)' },
    'Dikonfirmasi': { bg: 'color-mix(in srgb, var(--theme-info) 10%, transparent)', text: 'var(--theme-info)', border: 'color-mix(in srgb, var(--theme-info) 20%, transparent)', dot: 'var(--theme-info)' },
    'Selesai': { bg: 'color-mix(in srgb, var(--theme-success) 10%, transparent)', text: 'var(--theme-success)', border: 'color-mix(in srgb, var(--theme-success) 20%, transparent)', dot: 'var(--theme-success)' },
    'Ditolak': { bg: 'color-mix(in srgb, var(--theme-error) 10%, transparent)', text: 'var(--theme-error)', border: 'color-mix(in srgb, var(--theme-error) 20%, transparent)', dot: 'var(--theme-error)' },
  };

  const facultyOptions = useMemo(() => Array.from(new Set(bookings.map(b => b.faculty).filter(Boolean))), [bookings]);
  const serviceOptions = useMemo(() => Array.from(new Set(bookings.map(b => b.tipe_layanan).filter(Boolean))), [bookings]);

  const filteredByDate = useMemo(() => {
    return bookings.filter(b => {
      const bDate = b.raw_date || '';
      const matchStart = !startDate || (bDate >= startDate);
      const matchEnd = !endDate || (bDate <= endDate);
      return matchStart && matchEnd;
    });
  }, [bookings, startDate, endDate]);

  const statusCounts = useMemo(() => {
    const counts = { 'Menunggu': 0, 'Dikonfirmasi': 0, 'Selesai': 0, 'Ditolak': 0 };
    filteredByDate.forEach(b => {
      const s = getNormalizedStatus(b.status);
      if (counts[s] !== undefined) counts[s]++;
    });
    return counts;
  }, [filteredByDate]);

  const handleTableSearch = (data, searchVal) => {
    const query = searchVal.trim().toLowerCase();
    if (!query) return data;
    return data.filter((b) => {
      const searchable = [b.name, b.nim, b.tipe_layanan, b.note].filter(Boolean).join(' ').toLowerCase();
      return searchable.includes(query);
    });
  };

  const handleAction = async (id, newStatus, reason = '') => {
    setUpdatingId(id);
    try {
      await tenagaKesehatanService.updateBookingStatus(id, newStatus, reason);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus, alasan_penolakan: reason } : b));
      setShowRejectModal(false);
      setRejectingBookingId(null);
      setRejectionReason('');
    } catch (err) {
      alert(err.message || 'Gagal mengubah status booking.');
    } finally {
      setUpdatingId(null);
    }
  };

  const openRejectModal = (id) => {
    setRejectingBookingId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };

  const handleRejectConfirm = () => {
    if (!rejectionReason.trim()) {
      alert('Harap masukkan alasan penolakan.');
      return;
    }
    handleAction(rejectingBookingId, 'Ditolak', rejectionReason);
  };

  const columns = [
    {
      key: 'name',
      label: 'Identitas Pasien',
      sortable: true,
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-primary)] flex items-center justify-center font-black text-sm uppercase shrink-0 overflow-hidden relative">
            {row.avatar ? (
              <img src={row.avatar} alt={row.name} className="w-full h-full object-cover" />
            ) : (
              row.name ? row.name.slice(0, 2) : 'MH'
            )}
          </div>
          <div>
            <p className="font-bold text-sm text-[var(--theme-text)] max-w-[180px] truncate">{row.name}</p>
            <p className="text-[10px] text-[var(--theme-text-muted)] font-medium mt-0.5">{row.nim} &bull; {row.faculty}</p>
          </div>
        </div>
      )
    },
    {
      key: 'jadwal',
      label: 'Jadwal & Layanan',
      render: (v, row) => (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[var(--theme-primary-light)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 rounded-md text-[9px] font-bold uppercase tracking-wider">
              {row.tipe_layanan}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-[var(--theme-text)] mt-1">
            <span className="material-symbols-outlined text-[14px] text-[var(--theme-text-muted)]">calendar_month</span>
            {row.date}
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--theme-text-muted)]">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {row.time}
          </div>
        </div>
      )
    },
    {
      key: 'keluhan',
      label: 'Catatan / Keluhan',
      render: (v, row) => (
        <div className="max-w-[200px]">
          <p className="text-xs font-medium text-[var(--theme-text)] line-clamp-2 leading-snug">
            {row.note ? `"${row.note}"` : <span className="italic text-[var(--theme-text-subtle)]">Tidak ada catatan keluhan.</span>}
          </p>
          {row.alasan_penolakan && (
            <p className="mt-1.5 text-[10px] font-bold text-[var(--theme-error)] flex items-center gap-1 line-clamp-2">
              <span className="material-symbols-outlined text-[12px]">info</span> {row.alasan_penolakan}
            </p>
          )}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (v, row) => {
        const normalized = getNormalizedStatus(row.status);
        const style = statusMeta[normalized] || { bg: 'var(--theme-bg)', text: 'var(--theme-text)', border: 'var(--theme-border)', dot: 'var(--theme-text-muted)' };
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border whitespace-nowrap"
            style={{ backgroundColor: style.bg, color: style.text, borderColor: style.border }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.dot }} />
            {normalized}
          </span>
        );
      }
    },
    {
      key: 'aksi',
      label: 'Aksi',
      render: (v, row) => {
        const normalized = getNormalizedStatus(row.status);
        const isUpdating = updatingId === row.id;

        return (
          <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
            {normalized === 'Menunggu' && canManageBookings && (
              <>
                <button
                  disabled={isUpdating}
                  onClick={() => openRejectModal(row.id)}
                  className="size-8 flex items-center justify-center rounded-lg text-[var(--theme-error)] bg-[var(--theme-error-light)]/10 hover:bg-[var(--theme-error)] hover:text-white transition-all border border-[var(--theme-error)]/20"
                  title="Tolak"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
                <button
                  disabled={isUpdating}
                  onClick={() => handleAction(row.id, 'Dikonfirmasi')}
                  className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--theme-primary)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
                >
                  <span className="material-symbols-outlined text-[14px]">check_circle</span> Setujui
                </button>
              </>
            )}

            {normalized === 'Dikonfirmasi' && canManageBookings && (
              <button
                onClick={() => navigate(`/app/kesehatan/patients/${row.mahasiswa_id}/medical-record?booking_id=${row.id}`)}
                className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--theme-primary)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">medical_services</span> Mulai Sesi
              </button>
            )}

            {normalized === 'Selesai' && (
              <button
                onClick={() => navigate(`/app/kesehatan/patients/${row.mahasiswa_id}/medical-record`)}
                className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-[var(--theme-bg)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text)] text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">history</span> Riwayat
              </button>
            )}

            {normalized === 'Ditolak' && (
              <span className="text-[10px] font-black uppercase text-[var(--theme-error)] tracking-widest flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">cancel</span> Ditolak
              </span>
            )}
          </div>
        );
      }
    }
  ];

  const HeaderActions = (
    <div className="flex flex-col sm:flex-row gap-3 items-end">
      <div className="flex flex-col gap-1.5 w-full sm:w-auto">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Dari Tanggal</label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10"
        />
      </div>
      <div className="flex flex-col gap-1.5 w-full sm:w-auto">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Sampai Tanggal</label>
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10"
        />
      </div>
    </div>
  );

  return (
    <div className="w-full relative space-y-6 scroll-smooth">
      <DashboardHero
        title="Janji Temu"
        highlightedTitle="Medis"
        subtitle="Kelola pendaftaran booking online mahasiswa untuk pemeriksaan umum dan konsultasi kesehatan."
        icon="calendar_month"
        badges={[{ label: 'Layanan Kesehatan', active: true }]}
        actions={HeaderActions}
      />

      {/* Statistics Top Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <PrimaryStatsCard
          title="Menunggu"
          value={`${statusCounts['Menunggu']} Antrean`}
          icon="pending_actions"
          colorTheme="warning"
          badgeText="PERLU TINDAKAN"
        />
        <PrimaryStatsCard
          title="Dikonfirmasi"
          value={`${statusCounts['Dikonfirmasi']} Sesi`}
          icon="event_available"
          colorTheme="info"
          badgeText="AKAN DATANG"
        />
        <PrimaryStatsCard
          title="Selesai"
          value={`${statusCounts['Selesai']} Sesi`}
          icon="check_circle"
          colorTheme="success"
          badgeText="HARI INI"
        />
        <PrimaryStatsCard
          title="Ditolak"
          value={`${statusCounts['Ditolak']} Antrean`}
          icon="cancel"
          colorTheme="error"
          badgeText="DIBATALKAN"
        />
      </div>

      <div className="w-full">
        <DataTable
          title="Daftar Pengajuan Masuk"
          subtitle={`Menampilkan ${filteredByDate.length} riwayat antrean berdasarkan filter tanggal`}
          columns={columns}
          data={filteredByDate.map(b => ({ ...b, status: getNormalizedStatus(b.status) }))} // normalize status for filtering
          loading={loading}
          searchable={true}
          onSearch={handleTableSearch}
          searchPlaceholder="Cari nama, NIM, atau keluhan..."
          pagination={true}
          pageSize={10}
          emptyMessage="Tidak ada antrean. Coba sesuaikan rentang tanggal atau kata kunci pencarian."
          emptyIcon="event_busy"
          filters={[
            {
              key: 'status',
              placeholder: 'Semua Status',
              options: [
                { label: 'Menunggu', value: 'Menunggu' },
                { label: 'Dikonfirmasi', value: 'Dikonfirmasi' },
                { label: 'Selesai', value: 'Selesai' },
                { label: 'Ditolak', value: 'Ditolak' }
              ]
            },
            {
              key: 'tipe_layanan',
              placeholder: 'Semua Layanan',
              options: serviceOptions.map(s => ({ label: s, value: s }))
            },
            {
              key: 'faculty',
              placeholder: 'Semua Fakultas',
              options: facultyOptions.map(f => ({ label: f, value: f }))
            }
          ]}
        />
      </div>

      <DialogModal
        isOpen={showRejectModal}
        onClose={() => { setShowRejectModal(false); setRejectingBookingId(null); }}
        title="Tolak Pengajuan Booking"
        icon="cancel"
        iconColor="var(--theme-error)"
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-[11px] font-medium text-[var(--theme-text-muted)]">
            Harap berikan alasan penolakan agar mahasiswa mengetahui kendala jadwal atau layanan.
          </p>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] font-headline">Alasan Penolakan</label>
            <textarea
              placeholder="Misal: Petugas sedang ada agenda kedinasan..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[var(--theme-border)] p-3 text-[11px] font-medium text-[var(--theme-text)] outline-none transition-all placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary-light)]/20 bg-[var(--theme-bg)] resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowRejectModal(false); setRejectingBookingId(null); }}
              className="flex-1 py-2.5 rounded-xl border border-[var(--theme-border)] text-[var(--theme-text)] text-[10px] font-bold uppercase tracking-widest hover:bg-[var(--theme-bg)] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              className="flex-1 py-2.5 rounded-xl bg-[var(--theme-error)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span> Tolak Booking
            </button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
