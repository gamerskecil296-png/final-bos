import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenagaKesehatanService } from '../../services/api';
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
  
  // Tabs: 'live', 'requests', 'history'
  const [activeTab, setActiveTab] = useState('live');

  // Reject Modal State
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Date Filters for History Tab
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
        setError(err.message || 'Gagal memuat data antrean.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

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

  // Groupings
  const todayStr = new Date().toISOString().split('T')[0];

  const liveQueue = useMemo(() => {
    return bookings.filter(b => getNormalizedStatus(b.status) === 'Dikonfirmasi' && b.raw_date === todayStr);
  }, [bookings, todayStr]);

  const pendingRequests = useMemo(() => {
    return bookings.filter(b => getNormalizedStatus(b.status) === 'Menunggu');
  }, [bookings]);

  const historyQueue = useMemo(() => {
    return bookings.filter(b => {
      const s = getNormalizedStatus(b.status);
      if (s === 'Menunggu' || (s === 'Dikonfirmasi' && b.raw_date === todayStr)) return false;
      const bDate = b.raw_date || '';
      const matchStart = !startDate || (bDate >= startDate);
      const matchEnd = !endDate || (bDate <= endDate);
      return matchStart && matchEnd;
    });
  }, [bookings, startDate, endDate, todayStr]);

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
      alert(err.message || 'Gagal mengubah status antrean.');
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

  const startLiveExamination = (bookingId, patientId, jenisPendaftaran) => {
    // Navigasi ke halaman sesuai dengan tipe pendaftaran
    if (jenisPendaftaran === 'Offline') {
      navigate(`/tenagakes/examination?booking_id=${bookingId}&patient_id=${patientId}`);
    } else {
      navigate(`/tenagakes/emr?booking_id=${bookingId}&patient_id=${patientId}`);
    }
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
            {row.note ? `"${row.note}"` : <span className="italic text-[var(--theme-text-subtle)]">Tidak ada catatan.</span>}
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
                onClick={() => startLiveExamination(row.id, row.mahasiswa_id, row.jenis_pendaftaran)}
                className="h-8 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider shadow-sm transition-all"
              >
                <span className="material-symbols-outlined text-[14px]">monitor_heart</span> Periksa
              </button>
            )}

            {normalized === 'Selesai' && (
              <button
                onClick={() => navigate(`/tenagakes/patients/${row.mahasiswa_id}/medical-record`)}
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

  return (
    <div className="w-full relative space-y-6 scroll-smooth">
      <DashboardHero
        title="Antrean Klinik"
        highlightedTitle="Hari Ini"
        subtitle="Kelola antrean berjalan, tinjau permohonan janji temu masuk, dan lihat riwayat antrean klinik."
        icon="recent_patient"
        badges={[{ label: 'Live Queue', active: activeTab === 'live' }, { label: 'Permintaan Baru', active: activeTab === 'requests' }]}
      />

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-[var(--theme-border)]">
        <button
          onClick={() => setActiveTab('live')}
          className={`flex flex-col items-start gap-1 px-5 py-3 rounded-t-xl transition-all border-b-2 ${activeTab === 'live' ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] bg-[var(--theme-primary-light)]/5' : 'border-transparent text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'}`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">monitor_heart</span>
            <span className="font-bold text-sm tracking-wide">Antrean Hari Ini</span>
            {liveQueue.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-md bg-[var(--theme-primary)] text-white text-[10px] font-black">{liveQueue.length}</span>
            )}
          </div>
          <span className="text-[10px] opacity-80 uppercase tracking-widest">Siap Dipanggil</span>
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex flex-col items-start gap-1 px-5 py-3 rounded-t-xl transition-all border-b-2 ${activeTab === 'requests' ? 'border-amber-500 text-amber-600 bg-amber-500/5' : 'border-transparent text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'}`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">pending_actions</span>
            <span className="font-bold text-sm tracking-wide">Permintaan Baru</span>
            {pendingRequests.length > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black">{pendingRequests.length}</span>
            )}
          </div>
          <span className="text-[10px] opacity-80 uppercase tracking-widest">Perlu Konfirmasi</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-start gap-1 px-5 py-3 rounded-t-xl transition-all border-b-2 ${activeTab === 'history' ? 'border-[var(--theme-text)] text-[var(--theme-text)] bg-[var(--theme-surface)]' : 'border-transparent text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'}`}
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-xl">history</span>
            <span className="font-bold text-sm tracking-wide">Riwayat Antrean</span>
          </div>
          <span className="text-[10px] opacity-80 uppercase tracking-widest">Selesai & Ditolak</span>
        </button>
      </div>

      {activeTab === 'live' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--theme-text)]">Pasien Menunggu Dipanggil</h3>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 text-[10px] font-black tracking-widest border border-emerald-500/20 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              LIVE QUEUE
            </span>
          </div>
          
          {loading ? (
            <div className="h-40 flex items-center justify-center text-[var(--theme-text-muted)]">Memuat antrean...</div>
          ) : liveQueue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-[var(--theme-surface)] border border-[var(--theme-border)] border-dashed rounded-2xl gap-3">
              <span className="material-symbols-outlined text-5xl text-[var(--theme-text-subtle)]">event_available</span>
              <p className="text-sm font-bold text-[var(--theme-text-muted)]">Tidak ada pasien dalam antrean hari ini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveQueue.map((queueItem, idx) => (
                <div key={queueItem.id} className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3">
                    <span className="text-[10px] font-black text-[var(--theme-primary)] bg-[var(--theme-primary-light)]/10 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {queueItem.time}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 mb-4">
                    <div className="size-12 rounded-full bg-[var(--theme-surface)] text-[var(--theme-primary)] flex items-center justify-center font-black text-lg border border-[var(--theme-border)]">
                      {idx + 1}
                    </div>
                    <div>
                      <h4 className="font-bold text-[var(--theme-text)] text-sm line-clamp-1">{queueItem.name}</h4>
                      <p className="text-[11px] font-medium text-[var(--theme-text-muted)] mt-0.5">{queueItem.nim}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-5 bg-[var(--theme-surface)] p-3 rounded-xl border border-[var(--theme-border)]">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-[var(--theme-text-muted)]">stethoscope</span>
                      <span className="text-xs font-bold text-[var(--theme-text)]">{queueItem.tipe_layanan}</span>
                    </div>
                    {queueItem.note && (
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[14px] text-[var(--theme-text-muted)] mt-0.5">assignment</span>
                        <span className="text-[11px] font-medium text-[var(--theme-text-muted)] line-clamp-2 leading-snug">"{queueItem.note}"</span>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => startLiveExamination(queueItem.id, queueItem.mahasiswa_id, queueItem.jenis_pendaftaran)}
                    className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span className="material-symbols-outlined text-sm">campaign</span>
                    Panggil & Periksa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'requests' && (
        <DataTable
          title="Permintaan Janji Temu"
          subtitle="Mahasiswa yang menunggu konfirmasi jadwal klinik"
          columns={columns}
          data={pendingRequests}
          loading={loading}
          searchable={true}
          onSearch={handleTableSearch}
          searchPlaceholder="Cari permintaan..."
          emptyMessage="Tidak ada permintaan janji temu yang perlu dikonfirmasi."
          emptyIcon="inbox"
        />
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Dari Tanggal</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm font-semibold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
              />
            </div>
            <div className="flex flex-col gap-1.5 w-full sm:w-auto">
              <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Sampai Tanggal</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm font-semibold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
              />
            </div>
          </div>
          <DataTable
            title="Riwayat Antrean"
            subtitle="Data antrean yang sudah selesai atau ditolak"
            columns={columns}
            data={historyQueue}
            loading={loading}
            searchable={true}
            onSearch={handleTableSearch}
            searchPlaceholder="Cari histori pasien..."
            pagination={true}
            pageSize={10}
            emptyMessage="Tidak ada histori pada rentang tanggal ini."
            emptyIcon="history"
          />
        </div>
      )}

      {/* Tolak Modal */}
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
            Harap berikan alasan penolakan agar pasien mengetahui kendala jadwal atau layanan.
          </p>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] font-headline">Alasan Penolakan</label>
            <textarea
              placeholder="Misal: Dokter sedang ada agenda operasi..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-[var(--theme-border)] p-3 text-[11px] font-medium text-[var(--theme-text)] outline-none bg-[var(--theme-bg)] resize-none"
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
              className="flex-1 py-2.5 rounded-xl bg-[var(--theme-error)] hover:opacity-90 text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1"
            >
              <span className="material-symbols-outlined text-[14px]">close</span> Tolak Booking
            </button>
          </div>
        </div>
      </DialogModal>
    </div>
  );
}
