import React, { useState, useEffect, useMemo } from 'react';
import { 
  useBookingMutation, 
  useCounselingJadwalQuery, 
  useCounselingRiwayatQuery, 
  useCounselingMedicalRecordQuery, 
  useCounselingReferralsQuery, 
  useCancelBookingMutation, 
  useRescheduleMutation 
} from '@/queries/useCounselingQuery';
import { PageCard, PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { DialogModal } from '@/components/ui/DialogModal';
import { DataTable } from '@/components/ui/DataTable';
import { toast, Toaster } from 'react-hot-toast';
import { NavLink, useSearchParams } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AnimatePresence, motion } from 'framer-motion';

const formatLongDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
};

const getHariName = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('id-ID', { weekday: 'long' });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '-';
  return timeStr.substring(0, 5);
};

const TIPE_CONFIG = {
  Akademik: { bg: 'bg-[var(--theme-primary-light)]', text: 'text-[var(--theme-primary)]', border: 'border-[var(--theme-primary-light)]', dot: 'bg-[var(--theme-primary)]', label: 'Akademik' },
  Karir: { bg: 'bg-[var(--theme-secondary-light)]', text: 'text-[var(--theme-secondary)]', border: 'border-[var(--theme-secondary-light)]', dot: 'bg-[var(--theme-secondary)]', label: 'Karir' },
  Personal: { bg: 'bg-[var(--theme-error-light)]', text: 'text-[var(--theme-error)]', border: 'border-[var(--theme-error-light)]', dot: 'bg-[var(--theme-error)]', label: 'Personal' },
};

export default function CounselingPage() {
  const { hasPermission } = usePermission();
  const canBookCounseling = hasPermission('student.counseling.create') || hasPermission('counseling.create') || hasPermission('counseling.manage');

  // Load initial tab from URL search params
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'antrean';
  const [activeTab, setActiveTab] = useState(initialTab); // antrean, riwayat, rujukan

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab }, { replace: true });
  }, [activeTab, setSearchParams]);

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [bookingKeluhan, setBookingKeluhan] = useState('');
  const [mode, setMode] = useState('Tatap Muka');
  const [topik, setTopik] = useState('Psikologi');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  // Detail Modals State
  const [selectedBookingDetail, setSelectedBookingDetail] = useState(null);
  const [selectedRecordDetail, setSelectedRecordDetail] = useState(null);
  const [selectedRujukanDetail, setSelectedRujukanDetail] = useState(null);

  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState(null);

  // Queries
  const { data: jadwal, isLoading: isJadwalLoading } = useCounselingJadwalQuery();
  const { data: riwayat, isLoading: isRiwayatLoading } = useCounselingRiwayatQuery();
  const { data: medicalRecordData, isLoading: isMedicalRecordLoading } = useCounselingMedicalRecordQuery();
  const { data: rujukans, isLoading: isRujukanLoading } = useCounselingReferralsQuery();

  // Mutations
  const bookingMutation = useBookingMutation();
  const cancelMutation = useCancelBookingMutation();
  const rescheduleMutation = useRescheduleMutation();

  const totalSlot = jadwal?.length ?? 0;
  const totalRiwayat = riwayat?.length ?? 0;
  const totalMenunggu = riwayat?.filter(r => r.status === 'Menunggu' || r.status === 'Dikonfirmasi' || r.status === 'Perlu Kontrol').length ?? 0;
  const totalMedicalRecords = medicalRecordData?.summary?.total_records ?? 0;

  const activeBookings = riwayat?.filter(r => r.status === 'Menunggu' || r.status === 'Dikonfirmasi' || r.status === 'Perlu Kontrol') || [];
  const riwayatSesi = medicalRecordData?.records || [];

  useEffect(() => {
    if (selectedSchedule) {
      const defaultTopic = selectedSchedule.Tipe || selectedSchedule.Spesialisasi || 'Personal';
      setTopik(defaultTopic);
    }
  }, [selectedSchedule]);

  const handleBookingSubmit = () => {
    if (!privacyAgreed) return toast.error('Harap setujui pernyataan privasi');
    if (bookingKeluhan.length < 10 && !isRescheduleMode) return toast.error('Ceritakan keluhan minimal 10 karakter');

    if (isRescheduleMode && rescheduleBookingTarget) {
      const payload = {
        id: rescheduleBookingTarget.id,
        date: selectedSchedule.Tanggal ? selectedSchedule.Tanggal.slice(0, 10) : new Date().toISOString().slice(0, 10),
        start: selectedSchedule.JamMulai,
        end: selectedSchedule.JamSelesai,
      };

      rescheduleMutation.mutate(payload, {
        onSuccess: () => {
          toast.success('Jadwal berhasil diubah!');
          setIsBookingModalOpen(false);
          setIsRescheduleMode(false);
          setRescheduleBookingTarget(null);
          setSelectedSchedule(null);
          setBookingKeluhan('');
          setPrivacyAgreed(false);
        },
        onError: (err) => {
          toast.error(err.response?.data?.message || 'Gagal mengubah jadwal');
        },
      });
      return;
    }

    const payload = {
      psikolog_id: selectedSchedule.PsikologID,
      slot_id: selectedSchedule.SlotID || selectedSchedule.ID,
      date: selectedSchedule.Tanggal ? selectedSchedule.Tanggal.slice(0, 10) : new Date().toISOString().slice(0, 10),
      start: selectedSchedule.JamMulai,
      end: selectedSchedule.JamSelesai,
      topic: topik,
      complaint: bookingKeluhan,
      mode: mode,
    };

    bookingMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Booking berhasil diajukan!');
        setIsBookingModalOpen(false);
        setSelectedSchedule(null);
        setBookingKeluhan('');
        setMode('Tatap Muka');
        setTopik('Personal');
        setPrivacyAgreed(false);
      },
      onError: (err) => {
        toast.error(err.response?.data?.message || 'Gagal melakukan booking');
      },
    });
  };

  const handleCancelBooking = (id) => {
    if (window.confirm('Apakah Anda yakin ingin membatalkan antrean ini?')) {
      cancelMutation.mutate(id, {
        onSuccess: () => {
          toast.success('Antrean berhasil dibatalkan.');
        },
        onError: (err) => toast.error(err.response?.data?.message || 'Gagal membatalkan antrean.'),
      });
    }
  };

  const openRescheduleModal = (booking) => {
    setIsRescheduleMode(true);
    setRescheduleBookingTarget(booking);
    setSelectedSchedule(null);
    setBookingKeluhan(booking.keluhan || '');
    setIsBookingModalOpen(true);
  };

  const chartData = useMemo(() => {
    if (!riwayatSesi || riwayatSesi.length === 0) return [];
    
    // Group by month
    const grouped = {};
    [...riwayatSesi]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .forEach(item => {
        const d = new Date(item.date);
        if (Number.isNaN(d.getTime())) return;
        const monthYear = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        if (!grouped[monthYear]) {
          grouped[monthYear] = { name: monthYear, total: 0 };
        }
        grouped[monthYear].total += 1;
      });

    return Object.values(grouped).slice(-6); // last 6 months
  }, [riwayatSesi]);

  // COLUMNS
  const bookingColumns = [
    {
      key: 'tanggal',
      label: 'Jadwal & Waktu',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">{formatLongDate(val)}</div>
          <div className="text-xs text-[var(--theme-text-muted)] flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">schedule</span>
            {row.jam_mulai} - {row.jam_selesai} WIB
          </div>
          <div className="text-xs text-[var(--theme-text-muted)] flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">{row.mode === 'Online' ? 'videocam' : 'groups'}</span>
            {row.mode === 'Online' ? 'Online' : 'Tatap Muka'}
          </div>
        </div>
      ),
    },
    {
      key: 'nama_konselor',
      label: 'Konselor & Topik',
      sortable: true,
      render: (val, row) => {
        const tc = TIPE_CONFIG[row.tipe === 'Psikologi' ? 'Personal' : row.tipe] || TIPE_CONFIG.Akademik;
        return (
          <div>
            <div className="font-bold text-[var(--theme-text)]">{val}</div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${tc.bg} ${tc.text}`}>
                  {row.tipe}
              </span>
              {row.queue_number && <span className="inline-flex items-center gap-1 text-[10px] text-[var(--theme-primary)] font-bold px-2 py-0.5 bg-[var(--theme-primary-light)] rounded"><span className="material-symbols-outlined text-[12px]">tag</span> Antrean #{row.queue_number}</span>}
            </div>
          </div>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col items-end gap-1.5">
          <span className={`inline-flex px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-widest ${
          val === 'Menunggu' || val === 'Perlu Kontrol' ? 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)] border border-[var(--theme-warning)]/20' : 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border border-[var(--theme-success)]/20'
          }`}>
            {val}
          </span>
          {row.mode === 'Online' && row.link_meeting ? (
              <a href={row.link_meeting.startsWith('http') ? row.link_meeting : `https://${row.link_meeting}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">link</span> Gabung Meeting</a>
          ) : row.mode === 'Online' ? (
              <span className="text-[10px] text-[var(--theme-text-subtle)] font-medium italic">Link menunggu dikirim</span>
          ) : (
              <span className="text-[10px] text-[var(--theme-text-subtle)] font-medium">Ruang Konseling BKU</span>
          )}
        </div>
      ),
    },
  ];

  const riwayatColumns = [
    {
      key: 'date',
      label: 'Tanggal Sesi',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)] text-[13px]">{row.display_date}</div>
          <div className="text-[11px] text-[var(--theme-text-muted)] mt-0.5">{row.time}</div>
        </div>
      ),
    },
    {
      key: 'psychologist',
      label: 'Konselor',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)] text-[13px]">{val}</div>
          <div className="text-[11px] text-[var(--theme-text-muted)] mt-0.5">{row.type}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
            val === 'Selesai' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20' : 
            'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20'
          }`}>
          {val}
        </span>
      ),
    },
  ];

  const rujukanColumns = [
    {
      key: 'created_at',
      label: 'Tanggal Rujukan',
      sortable: true,
      render: (val) => (
        <span className="font-bold text-[var(--theme-text)] text-[13px]">
          {val ? new Date(val).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '-'}
        </span>
      )
    },
    {
      key: 'faskes_tujuan',
      label: 'Tujuan Rujukan',
      sortable: true,
      render: (val) => <span className="font-bold text-[var(--theme-text)] text-[13px]">{val || '-'}</span>
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => (
        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase border ${
            val === 'Selesai' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20' : 
            'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20'
          }`}>
          {val || 'Menunggu'}
        </span>
      )
    }
  ];

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />
      <DashboardHero
        title="Pusat Konseling & Wellness BKU"
        subtitle="Sesi privat bersama psikolog profesional — rahasia, sukarela, dan aman untuk semua mahasiswa."
        breadcrumbs={[
          { label: 'Konseling & Wellness', path: '/student/counseling' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canBookCounseling && (
              <button
                onClick={() => {
                  setIsRescheduleMode(false);
                  setRescheduleBookingTarget(null);
                  setSelectedSchedule(null);
                  setBookingKeluhan('');
                  setIsBookingModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] font-semibold rounded-xl hover:opacity-90 transition-all text-sm shadow-md shadow-[var(--theme-primary)]/20 uppercase tracking-wider"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }} strokeWidth={2.5}>calendar_month</span> Sesi Baru
              </button>
            )}
          </div>
        }
      />

      {/* ── HERO: Latest Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        
        {/* Main Stats */}
        <div className="lg:col-span-8 glass-card overflow-hidden relative">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--theme-primary)]/5 rounded-full -mr-20 -mt-20 pointer-events-none blur-3xl"></div>
            <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex items-center justify-between relative z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md bg-[var(--theme-primary)]">
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>psychology</span>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Status Profil</span>
                        <h2 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Ringkasan Sesi</h2>
                    </div>
                </div>
            </div>
            
            <div className="p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
                <div className="bg-[var(--theme-surface)] rounded-2xl p-4 border border-[var(--theme-border-muted)]">
                    <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Total Sesi</p>
                    <p className="text-2xl font-black text-[var(--theme-text)]">{totalRiwayat}</p>
                </div>
                <div className="bg-[var(--theme-surface)] rounded-2xl p-4 border border-[var(--theme-border-muted)]">
                    <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Menunggu</p>
                    <p className="text-2xl font-black text-[var(--theme-warning)]">{totalMenunggu}</p>
                </div>
                <div className="bg-[var(--theme-surface)] rounded-2xl p-4 border border-[var(--theme-border-muted)]">
                    <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Rekam Medis</p>
                    <p className="text-2xl font-black text-[var(--theme-success)]">{totalMedicalRecords}</p>
                </div>
                <div className="bg-[var(--theme-surface)] rounded-2xl p-4 border border-[var(--theme-border-muted)]">
                    <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Slot Tersedia</p>
                    <p className="text-2xl font-black text-[var(--theme-primary)]">{totalSlot}</p>
                </div>
            </div>
        </div>

        {/* Small Analytics/Quote */}
        <div className="lg:col-span-4 glass-card p-6 flex flex-col justify-center relative overflow-hidden bg-[var(--theme-primary)]/5 border-[var(--theme-primary)]/20">
            <span className="material-symbols-outlined absolute right-[-20px] bottom-[-20px] text-[var(--theme-primary)] opacity-[0.05] pointer-events-none" style={{ fontSize: '150px' }}>favorite</span>
            <div className="relative z-10 text-center">
                <span className="material-symbols-outlined text-[var(--theme-primary)] mb-3" style={{ fontSize: '32px' }}>spa</span>
                <h3 className="text-sm font-bold tracking-wide text-[var(--theme-text)] mb-2">Kesehatan Mental Prioritas</h3>
                <p className="text-[12px] font-medium text-[var(--theme-text-muted)] leading-relaxed">
                    "Jangan ragu bercerita. Psikolog kami siap membantu Anda."
                </p>
            </div>
        </div>
      </div>

      {/* ── Main Dashboard Tabs ── */}
      <div className="flex gap-2 flex-wrap mb-6">
        {[
          { id: 'antrean', label: 'Antrean Saya', icon: 'event_note' },
          { id: 'riwayat', label: 'Rekam Sesi Konseling', icon: 'receipt_long' },
          { id: 'rujukan', label: 'Riwayat Rujukan', icon: 'home_health' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 rounded-xl text-[12px] font-bold uppercase tracking-wider transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--theme-primary)] text-white shadow-md'
                : 'bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] text-[var(--theme-text-muted)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
        >
            {activeTab === 'antrean' && (
                <div className="glass-card overflow-hidden mb-6">
                    <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--theme-warning-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-warning)]">
                                <span className="material-symbols-outlined text-[24px]">event_upcoming</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Sesi Mendatang</span>
                                <h2 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Antrean Aktif</h2>
                            </div>
                        </div>
                    </div>
                    <DataTable 
                        columns={bookingColumns} 
                        data={activeBookings || []} 
                        loading={isRiwayatLoading}
                        onRowClick={(row) => setSelectedBookingDetail(row)} 
                        actions={(row) => (
                            <React.Fragment>
                                {(row.status === 'Menunggu' || row.status === 'Dikonfirmasi') && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCancelBooking(row.id); }}
                                    className="text-[10px] font-bold text-[var(--theme-error)] bg-[var(--theme-error-light)] hover:bg-[var(--theme-error)] hover:text-white px-2 py-1 rounded transition-colors opacity-80 hover:opacity-100"
                                >
                                    Batalkan
                                </button>
                                )}
                                {row.status === 'Perlu Kontrol' && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); openRescheduleModal(row); }}
                                    className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary-light)] hover:bg-[var(--theme-primary)] hover:text-white px-2 py-1 rounded transition-colors opacity-80 hover:opacity-100"
                                >
                                    Jadwal Ulang
                                </button>
                                )}
                            </React.Fragment>
                        )}
                        emptyMessage="Belum ada antrean konseling aktif."
                        emptyIcon="event_busy"
                    />
                </div>
            )}

            {activeTab === 'riwayat' && (
                <>
                    {/* Analytics Chart for History */}
                    <div className="glass-card p-6 mb-6">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4 border-b border-[var(--theme-border-muted)] pb-4">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--theme-primary-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
                                    <span className="material-symbols-outlined text-[24px]">trending_up</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Grafik</span>
                                    <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Tren Frekuensi Konseling</h3>
                                </div>
                            </div>
                        </div>
                        <div className="w-full" style={{ minHeight: '200px' }}>
                            {chartData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200} debounce={50}>
                                    <AreaChart data={chartData}>
                                    <defs>
                                        <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="var(--theme-primary)" stopOpacity={0.15} />
                                            <stop offset="95%" stopColor="var(--theme-primary)" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--theme-border)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--theme-text-subtle)' }} dy={10} />
                                    <YAxis hide domain={[0, 'dataMax + 2']} />
                                    <Tooltip
                                        cursor={{ stroke: 'var(--theme-primary)', strokeWidth: 1, strokeDasharray: '4 4' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', fontWeight: 700, padding: '8px 14px' }}
                                        itemStyle={{ color: 'var(--theme-primary)' }}
                                    />
                                    <Area type="monotone" dataKey="total" stroke="var(--theme-primary)" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTotal)" animationDuration={1000} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="flex items-center justify-center h-full text-[var(--theme-text-muted)] text-sm font-medium border border-dashed border-[var(--theme-border-muted)] rounded-2xl bg-[var(--theme-bg)]/50">
                                    Belum cukup data untuk grafik tren.
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="glass-card overflow-hidden mb-6">
                        <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[var(--theme-success-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-success)]">
                                    <span className="material-symbols-outlined text-[24px]">description</span>
                                </div>
                                <div>
                                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Catatan Sesi</span>
                                    <h2 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Riwayat Medis Konseling</h2>
                                </div>
                            </div>
                        </div>
                        <DataTable 
                            columns={riwayatColumns} 
                            data={riwayatSesi || []} 
                            loading={isMedicalRecordLoading}
                            onRowClick={(row) => setSelectedRecordDetail(row)}
                            emptyMessage="Belum ada catatan medis / sesi."
                            emptyIcon="book"
                            searchable={true}
                        />
                    </div>
                </>
            )}

            {activeTab === 'rujukan' && (
                <div className="glass-card overflow-hidden mb-6">
                    <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-[var(--theme-primary-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
                                <span className="material-symbols-outlined text-[24px]">home_health</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Referensi Eksternal</span>
                                <h2 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Riwayat Rujukan</h2>
                            </div>
                        </div>
                    </div>
                    <DataTable 
                        columns={rujukanColumns} 
                        data={rujukans || []} 
                        loading={isRujukanLoading}
                        onRowClick={(row) => setSelectedRujukanDetail(row)}
                        searchable={true}
                        emptyMessage="Belum ada riwayat rujukan medis."
                        emptyIcon="bookmark"
                    />
                </div>
            )}
        </motion.div>
      </AnimatePresence>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {isBookingModalOpen && (
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => {
              setIsBookingModalOpen(false);
              setIsRescheduleMode(false);
              setRescheduleBookingTarget(null);
            }}
            title={isRescheduleMode ? "Jadwal Ulang Sesi Lanjutan" : "Buat Jadwal Konseling Baru"}
            subtitle={isRescheduleMode ? "Pilih tanggal kontrol lanjutan" : "Pilih jadwal & konselor yang tersedia"}
            schedules={jadwal || []}
            loading={isJadwalLoading}
            selectedSchedule={selectedSchedule}
            setSelectedSchedule={setSelectedSchedule}
            bookingKeluhan={bookingKeluhan}
            setBookingKeluhan={setBookingKeluhan}
            onSubmit={handleBookingSubmit}
            isSubmitting={bookingMutation.isPending || rescheduleMutation.isPending}
            isRescheduleMode={isRescheduleMode}
            rescheduleBookingTarget={rescheduleBookingTarget}
            mode={mode}
            setMode={setMode}
            topik={topik}
            setTopik={setTopik}
            privacyAgreed={privacyAgreed}
            setPrivacyAgreed={setPrivacyAgreed}
          />
        )}

        {selectedBookingDetail && (
          <BookingDetailModal
            booking={selectedBookingDetail}
            onClose={() => setSelectedBookingDetail(null)}
            onCancel={handleCancelBooking}
            onReschedule={openRescheduleModal}
          />
        )}

        {selectedRecordDetail && (
          <RecordDetailModal
            record={selectedRecordDetail}
            onClose={() => setSelectedRecordDetail(null)}
          />
        )}

        {selectedRujukanDetail && (
          <RujukanDetailModal
            rujukan={selectedRujukanDetail}
            onClose={() => setSelectedRujukanDetail(null)}
          />
        )}
      </AnimatePresence>
    </PageContent>
  );
}

// ==========================================
// MODAL COMPONENTS
// ==========================================

function BookingModal({
  isOpen, onClose, title, subtitle, schedules, loading,
  selectedSchedule, setSelectedSchedule, bookingKeluhan, setBookingKeluhan,
  onSubmit, isSubmitting, isRescheduleMode, rescheduleBookingTarget,
  mode, setMode, topik, setTopik, privacyAgreed, setPrivacyAgreed
}) {
  const [filterHari, setFilterHari] = useState('Semua');
  const [filterNakes, setFilterNakes] = useState('Semua');
  const [filterKategori, setFilterKategori] = useState('Semua');

  const uniqueHari = [...new Set(schedules.map(s => getHariName(s.Tanggal)))].filter(Boolean);
  const uniqueNakes = [...new Set(schedules.map(s => s.NamaKonselor))].filter(Boolean);
  
  // Hardcode the default categories so they always appear in the filter
  const defaultCategories = ['Personal', 'Akademik', 'Karir'];
  const uniqueKategori = Array.from(new Set([...defaultCategories, ...schedules.map(s => s.Tipe).filter(Boolean)]));

  return (
    <DialogModal
      open={isOpen}
      onOpenChange={onClose}
      maxWidth="max-w-2xl"
      title={title}
      subtitle={subtitle}
      icon="psychology"
      footer={
        <div className="flex gap-3 pt-6 border-t border-[var(--theme-border)] w-full">
          <button onClick={onClose} className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] hover:bg-[var(--theme-bg)] transition-all cursor-pointer">
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !selectedSchedule}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-black uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${isSubmitting || !selectedSchedule ? 'bg-[var(--theme-text-muted)]' : 'bg-[var(--theme-primary)] hover:shadow-lg hover:-translate-y-0.5'}`}
          >
            {isSubmitting ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : <><span className="material-symbols-outlined relative z-10" style={{ fontSize: '18px' }}>event_available</span> <span className="relative z-10">Konfirmasi</span></>}
          </button>
        </div>
      }
      bodyClassName="p-6 md:p-8 space-y-8 bg-surface"
    >
      <div className="space-y-6">
        {/* Step 1: Jadwal */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
            <h4 className="text-sm font-black text-[var(--theme-text)] flex items-center gap-2 shrink-0">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] text-xs">1</span>
              {isRescheduleMode ? 'Pilih Jadwal Kontrol' : 'Pilih Jadwal Tersedia'}
            </h4>
            {!isRescheduleMode && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select value={filterHari} onChange={e => setFilterHari(e.target.value)} className="px-3 py-1.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-[11px] font-bold focus:outline-none focus:border-[var(--theme-primary)] w-full sm:w-auto">
                  <option value="Semua">Semua Hari</option>
                  {uniqueHari.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={filterKategori} onChange={e => setFilterKategori(e.target.value)} className="px-3 py-1.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-[11px] font-bold focus:outline-none focus:border-[var(--theme-primary)] w-full sm:w-auto">
                  <option value="Semua">Semua Kategori</option>
                  {uniqueKategori.map(k => <option key={k} value={k}>{k}</option>)}
                </select>
                <select value={filterNakes} onChange={e => setFilterNakes(e.target.value)} className="px-3 py-1.5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-[11px] font-bold focus:outline-none focus:border-[var(--theme-primary)] w-full sm:w-auto">
                  <option value="Semua">Semua Konselor</option>
                  {uniqueNakes.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 bg-[var(--theme-bg)] rounded-2xl animate-pulse" />)}
            </div>
          ) : (
            <div className="grid gap-3 max-h-[200px] overflow-y-auto pr-1 snap-y custom-scrollbar">
              {(() => {
                let displaySchedules = isRescheduleMode && rescheduleBookingTarget
                  ? schedules.filter(s => s.PsikologID === rescheduleBookingTarget.psikolog_id)
                  : schedules;

                if (!isRescheduleMode) {
                  if (filterHari !== 'Semua') displaySchedules = displaySchedules.filter(s => getHariName(s.Tanggal) === filterHari);
                  if (filterKategori !== 'Semua') displaySchedules = displaySchedules.filter(s => s.Tipe === filterKategori);
                  if (filterNakes !== 'Semua') displaySchedules = displaySchedules.filter(s => s.NamaKonselor === filterNakes);
                }

                if (displaySchedules.length === 0) {
                  return (
                    <div className="text-center py-8 bg-[var(--theme-bg)] rounded-2xl border border-dashed border-[var(--theme-border)]">
                      <span className="material-symbols-outlined text-3xl text-[var(--theme-text-muted)] mb-2">event_busy</span>
                      <p className="text-sm text-[var(--theme-text-muted)] font-medium">Belum ada jadwal tersedia</p>
                    </div>
                  );
                }

                return displaySchedules.map((schedule) => {
                  const isSelected = selectedSchedule?.SlotID === schedule.SlotID;
                  const isFull = schedule.SisaKuota === 0;
                  return (
                    <button
                      key={schedule.SlotID}
                      disabled={isFull}
                      onClick={() => setSelectedSchedule(schedule)}
                      className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 outline-none snap-start group ${isSelected ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 shadow-md shadow-[var(--theme-primary)]/5' : isFull ? 'border-transparent bg-[var(--theme-bg)] opacity-60 cursor-not-allowed' : 'border-[var(--theme-border)] bg-surface hover:border-[var(--theme-border)] hover:shadow-sm cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex flex-1 items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[var(--theme-primary)] text-white shadow-sm' : isFull ? 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]' : 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] group-hover:bg-[var(--theme-primary-light)]'}`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>psychology</span>
                          </div>
                          <div>
                            <h5 className={`text-[15px] font-bold leading-tight ${isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>{schedule.NamaKonselor}</h5>
                            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] px-2 py-1 rounded-md uppercase tracking-wider">{schedule.Tipe}</span>
                              <span className="text-[11px] text-[var(--theme-text-muted)] flex items-center gap-1 font-semibold">
                                <span className="material-symbols-outlined text-[14px]">event</span>
                                {formatLongDate(schedule.Tanggal)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[11px] text-[var(--theme-text-muted)] flex items-center gap-1 font-semibold">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                {formatTime(schedule.JamMulai)} - {formatTime(schedule.JamSelesai)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isFull ? 'bg-[var(--theme-error-light)] text-[var(--theme-error)]' : 'bg-[var(--theme-success-light)] text-[var(--theme-success)]'}`}>
                            {isFull ? 'Penuh' : `Sisa ${schedule.SisaKuota}`}
                          </div>
                          {isSelected ? <span className="material-symbols-outlined text-[var(--theme-primary)] text-[22px]">check_circle</span> : !isFull ? <div className="w-5 h-5 rounded-full border-2 border-[var(--theme-border)] transition-colors" /> : null}
                        </div>
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </section>

        {/* Step 2: Form */}
        {!isRescheduleMode && (
          <section className={`transition-opacity duration-300 space-y-5 ${!selectedSchedule ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-black text-[var(--theme-text)] flex items-center gap-2">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs transition-colors ${selectedSchedule ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]'}`}>2</span>
                Informasi Sesi
              </h4>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-3">Metode Konseling *</label>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { value: 'Tatap Muka', label: 'Tatap Muka', desc: 'Konseling langsung di ruang BK', icon: 'groups' },
                  { value: 'Online', label: 'Online (Zoom)', desc: 'Konseling daring via video call', icon: 'videocam' }
                ].map((opt) => (
                  <button key={opt.value} type="button" onClick={() => setMode(opt.value)} className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${mode === opt.value ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] ring-2 ring-[var(--theme-primary)]/10' : 'border-[var(--theme-border-muted)] bg-[var(--theme-surface)] hover:border-[var(--theme-border)]'}`}>
                    <span className={`material-symbols-outlined text-[20px] shrink-0 mt-0.5 ${mode === opt.value ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-muted)]'}`}>{opt.icon}</span>
                    <div>
                      <p className={`text-[13px] font-bold ${mode === opt.value ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>{opt.label}</p>
                      <p className="text-[11px] text-[var(--theme-text-muted)] mt-0.5 leading-snug">{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-3">Kategori Masalah *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {Array.from(new Set([selectedSchedule?.Tipe, ...(selectedSchedule?.Spesialisasi || '').split(',').map(s => s.trim()).filter(Boolean)].filter(Boolean))).map((cat) => (
                  <button key={cat} type="button" onClick={() => setTopik(cat)} className={`px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all cursor-pointer ${topik === cat ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/10' : 'border-[var(--theme-border-muted)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:border-[var(--theme-border)]'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
                <label className="block text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-3">Topik Pembahasan *</label>
              <textarea
                value={bookingKeluhan} onChange={(e) => setBookingKeluhan(e.target.value)}
                placeholder="Contoh: Saya merasa kesulitan mengatur waktu belajar dan merasa cemas..."
                disabled={!selectedSchedule}
                className="w-full min-h-[100px] p-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[14px] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 resize-none font-medium text-[var(--theme-text)] transition-all leading-relaxed placeholder:text-[var(--theme-text-muted)] disabled:bg-[var(--theme-bg)]/50"
              />
            </div>

            <label className="flex gap-3 p-4 bg-[var(--theme-primary-light)] border border-[var(--theme-primary-light)] rounded-2xl cursor-pointer hover:opacity-90 transition-opacity">
              <input type="checkbox" checked={privacyAgreed} onChange={(e) => setPrivacyAgreed(e.target.checked)} className="w-4 h-4 mt-0.5 rounded text-[var(--theme-primary)] cursor-pointer" />
              <span className="text-[12px] font-semibold text-[var(--theme-primary)]">Saya memahami bahwa sesi ini bersifat rahasia, sukarela, dan data saya hanya dapat diakses oleh konselor terkait.</span>
            </label>
          </section>
        )}
      </div>
    </DialogModal>
  );
}

function BookingDetailModal({ booking, onClose, onCancel, onReschedule }) {
  if (!booking) return null;
  return (
    <DialogModal
      open={true} onOpenChange={onClose} title="Detail Booking Konseling" subtitle={`Antrean dengan ${booking.nama_konselor || 'Konselor'}`} icon="assignment" maxWidth="max-w-md"
      footer={
        <div className="flex gap-2 justify-end w-full">
          {(booking.status === 'Menunggu' || booking.status === 'Dikonfirmasi') && (
            <button onClick={() => { onClose(); onCancel(booking.id); }} className="py-2.5 px-4 bg-[var(--theme-error-light)] text-[var(--theme-error)] text-xs font-black rounded-xl hover:bg-[var(--theme-error)] hover:text-white transition-all uppercase tracking-wider cursor-pointer">Batalkan Sesi</button>
          )}
          {booking.status === 'Perlu Kontrol' && (
            <button onClick={() => { onClose(); onReschedule(booking); }} className="py-2.5 px-4 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] text-xs font-black rounded-xl hover:bg-[var(--theme-primary)] hover:text-white transition-all uppercase tracking-wider cursor-pointer">Jadwal Ulang</button>
          )}
          <button onClick={onClose} className="py-2.5 px-5 bg-[var(--theme-primary)] text-white text-xs font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-wider cursor-pointer">Tutup</button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-[var(--theme-bg)] rounded-xl p-4 border border-[var(--theme-border)]">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Tanggal & Waktu</span>
              <p className="font-bold text-[var(--theme-text)]">{formatLongDate(booking.tanggal)}</p>
              <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">{booking.jam_mulai} - {booking.jam_selesai}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Metode & Tipe</span>
              <p className="font-bold text-[var(--theme-text)]">{booking.mode}</p>
              <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">{booking.tipe}</p>
            </div>
            <div className="col-span-2">
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Status</span>
              <span className="inline-block bg-[var(--theme-bg)] text-[var(--theme-text)] px-2 py-1 rounded border border-[var(--theme-border)] font-bold text-xs uppercase">{booking.status}</span>
            </div>
            {booking.link_meeting && booking.mode === 'Online' && (
                <div className="col-span-2 pt-2 border-t border-[var(--theme-border)]">
                    <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Link Meeting Zoom</span>
                    <a href={booking.link_meeting.startsWith('http') ? booking.link_meeting : `https://${booking.link_meeting}`} target="_blank" rel="noreferrer" className="text-sm font-bold text-[var(--theme-primary)] underline">Gabung ke Ruangan</a>
                </div>
            )}
            <div className="col-span-2 pt-2 border-t border-[var(--theme-border)]">
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Keluhan / Topik Awal</span>
              <p className="text-sm font-medium text-[var(--theme-text)] whitespace-pre-wrap leading-relaxed">{booking.keluhan || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </DialogModal>
  );
}

function RecordDetailModal({ record, onClose }) {
  if (!record) return null;
  return (
    <DialogModal
      open={true} onOpenChange={onClose} title="Rekam Medis Konseling" subtitle={`Sesi pada ${record.display_date}`} icon="description" maxWidth="max-w-xl"
      footer={<div className="flex justify-end w-full"><button onClick={onClose} className="py-2.5 px-5 bg-[var(--theme-primary)] text-white text-xs font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-wider cursor-pointer">Tutup</button></div>}
    >
      <div className="space-y-4">
        <div className="bg-[var(--theme-bg)] rounded-xl p-4 border border-[var(--theme-border)]">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4 border-b border-[var(--theme-border-muted)] pb-4">
            <div>
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Konselor</span>
              <p className="font-bold text-[var(--theme-text)]">{record.psychologist}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Tipe Sesi</span>
              <p className="font-bold text-[var(--theme-text)]">{record.type}</p>
            </div>
          </div>

          <div className="space-y-4">
              <div>
                  <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Observasi Psikolog</span>
                  <p className="text-sm font-medium text-[var(--theme-text)] whitespace-pre-wrap leading-relaxed bg-[var(--theme-surface)] p-3 rounded-xl border border-[var(--theme-border-muted)]">{record.observation || '-'}</p>
              </div>
              <div>
                  <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Kesimpulan & Rekomendasi</span>
                  <p className="text-sm font-medium text-[var(--theme-text)] whitespace-pre-wrap leading-relaxed bg-[var(--theme-surface)] p-3 rounded-xl border border-[var(--theme-border-muted)]">{record.recommendation || '-'}</p>
              </div>
          </div>
        </div>
      </div>
    </DialogModal>
  );
}

function RujukanDetailModal({ rujukan, onClose }) {
  if (!rujukan) return null;
  const dateStr = rujukan.created_at ? new Date(rujukan.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '-';
  return (
    <DialogModal
      open={true} onOpenChange={onClose} title="Detail Rujukan" subtitle={`Tujuan: ${rujukan.faskes_tujuan || 'Fasilitas Kesehatan'}`} icon="home_health" maxWidth="max-w-md"
      footer={<div className="flex justify-end w-full"><button onClick={onClose} className="py-2.5 px-5 bg-[var(--theme-primary)] text-white text-xs font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-wider cursor-pointer">Tutup</button></div>}
    >
      <div className="space-y-4">
        <div className="bg-[var(--theme-bg)] rounded-xl p-4 border border-[var(--theme-border)]">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Tanggal Rujukan</span>
              <p className="font-bold text-[var(--theme-text)]">{dateStr}</p>
            </div>
            <div>
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Faskes Tujuan</span>
              <p className="font-bold text-[var(--theme-text)]">{rujukan.faskes_tujuan || '-'}</p>
            </div>
            <div className="col-span-2 pt-2 border-t border-[var(--theme-border)]">
              <span className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Alasan Rujukan</span>
              <p className="text-sm font-medium text-[var(--theme-text)] whitespace-pre-wrap leading-relaxed">{rujukan.alasan_rujukan || '-'}</p>
            </div>
          </div>
        </div>
      </div>
    </DialogModal>
  );
}
