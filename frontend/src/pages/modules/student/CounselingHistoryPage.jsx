import React, { useEffect, useState } from 'react';

import { NavLink, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  useCancelBookingMutation,
  useCounselingMedicalRecordQuery,
  useCounselingRiwayatQuery,
  useCounselingReferralsQuery,
  useRescheduleMutation,
  useCounselingJadwalQuery,
  useBookingMutation,
} from '@/queries/useCounselingQuery';
import { API_BASE_URL, studentCounselingService } from '@/services/api';

const getFullUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path}`;
};

const REFERRAL_STATUS_CONFIG = {
  Pending: { bg: 'bg-[var(--theme-bg)]', text: 'text-[var(--theme-text-muted)]', border: 'border-[var(--theme-border)]' },
  Sent: { bg: 'bg-[var(--theme-primary-light)]', text: 'text-[var(--theme-primary)]', border: 'border-[var(--theme-primary-light)]' },
  Received: { bg: 'bg-[var(--theme-success-light)]', text: 'text-[var(--theme-success)]', border: 'border-[var(--theme-success-light)]' },
  default: { bg: 'bg-[var(--theme-bg)]', text: 'text-[var(--theme-text-muted)]', border: 'border-[var(--theme-border)]' },
};

import { DashboardHero } from '@/components/ui/dashboard';
import { PageContent } from '@/components/ui/page';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DialogModal } from '@/components/ui/DialogModal';
import { NotifListSkeleton } from '@/components/ui/SkeletonGroups';
import EmptyState from '@/components/ui/EmptyState';







const formatLongDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
};

const STATUS_CONFIG = {
  Selesai: { bg: 'bg-[var(--theme-success-light)]', text: 'text-[var(--theme-success)]', border: 'border-[var(--theme-success-light)]', bar: 'bg-[var(--theme-success)]' },
  Dikonfirmasi: { bg: 'bg-[var(--theme-primary-light)]', text: 'text-[var(--theme-primary)]', border: 'border-[var(--theme-primary-light)]', bar: 'bg-[var(--theme-primary)]' },
  Menunggu: { bg: 'bg-[var(--theme-warning-light)]', text: 'text-[var(--theme-warning)]', border: 'border-[var(--theme-warning-light)]', bar: 'bg-[var(--theme-warning)]' },
  Ditolak: { bg: 'bg-[var(--theme-error-light)]', text: 'text-[var(--theme-error)]', border: 'border-[var(--theme-error-light)]', bar: 'bg-[var(--theme-error)]' },
  Dibatalkan: { bg: 'bg-[var(--theme-bg)]', text: 'text-[var(--theme-text-muted)]', border: 'border-[var(--theme-border-muted)]', bar: 'bg-[var(--theme-border)]' },
  default: { bg: 'bg-[var(--theme-bg)]', text: 'text-[var(--theme-text-muted)]', border: 'border-[var(--theme-border-muted)]', bar: 'bg-[var(--theme-border)]' },
};

const hasScreeningData = (record) => {
  return (
    record.aspek_kognitif ||
    record.aspek_emosional ||
    record.aspek_perilaku ||
    record.kesimpulan ||
    record.riwayat_keluhan ||
    record.tujuan_pemeriksaan ||
    record.rekomendasi_mahasiswa ||
    record.rekomendasi_prodi ||
    record.rekomendasi_orang_tua ||
    record.tindak_lanjut?.length > 0
  );
};

export default function CounselingHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: history = [], isLoading: isHistoryLoading } = useCounselingRiwayatQuery();
  const { data: medicalRecord, isLoading: isMedicalLoading } = useCounselingMedicalRecordQuery();
  const { data: referrals = [], isLoading: isReferralsLoading } = useCounselingReferralsQuery();
  const initialTab = ['medical_record', 'screening', 'referrals'].includes(searchParams.get('tab'))
    ? searchParams.get('tab')
    : 'medical_record';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [expandedScreening, setExpandedScreening] = useState(null);
  const cancelMutation = useCancelBookingMutation();
  const rescheduleMutation = useRescheduleMutation();
  const bookingMutation = useBookingMutation();
  const { data: jadwalSemua = [] } = useCounselingJadwalQuery();

  // Reschedule state
  const [rescheduleItem, setRescheduleItem] = useState(null); // booking being rescheduled
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  const [rescheduleMode, setRescheduleMode] = useState('Tatap Muka');

  const records = medicalRecord?.records || [];
  const summary = medicalRecord?.summary || { total_records: 0, latest_status: 'Belum ada catatan' };
  const screeningRecords = records.filter(hasScreeningData);
  const waitingCount = history.filter((item) => item.status === 'Menunggu').length;
  const confirmedCount = history.filter((item) => item.status === 'Dikonfirmasi').length;
  const completedCount = history.filter((item) => item.status === 'Selesai').length;

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (['medical_record', 'screening', 'referrals'].includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'medical_record' ? {} : { tab });
  };

  const handleCancel = (id) => {
    if (!confirm('Yakin ingin membatalkan jadwal konseling ini?')) return;
    cancelMutation.mutate(id, {
      onSuccess: () => toast.success('Booking berhasil dibatalkan'),
      onError: () => toast.error('Gagal membatalkan booking'),
    });
  };

  const openReschedule = (item) => {
    setRescheduleItem(item);
    // Pre-fill with existing values
    const dateStr = item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : '';
    setRescheduleDate(dateStr);
    setRescheduleStart(item.jam_mulai || '');
    setRescheduleEnd(item.jam_selesai || '');
    setRescheduleMode(item.mode || 'Tatap Muka');
  };

  const handleReschedule = () => {
    if (!rescheduleDate) return toast.error('Pilih tanggal baru');
    if (!rescheduleStart) return toast.error('Isi jam mulai');

    if (rescheduleItem.status === 'Selesai') {
      const availableSchedules = jadwalSemua.filter(j =>
        (j.PsikologID === rescheduleItem.psikolog_id || j.NamaKonselor === rescheduleItem.nama_konselor) &&
        new Date(j.Tanggal) >= new Date(new Date().setHours(0, 0, 0, 0))
      );
      const slot = availableSchedules.find(s => s.Tanggal.startsWith(rescheduleDate) && s.JamMulai === rescheduleStart);

      bookingMutation.mutate(
        {
          psikolog_id: rescheduleItem.psikolog_id,
          slot_id: slot?.SlotID || slot?.ID || 0,
          date: rescheduleDate,
          start: rescheduleStart,
          end: rescheduleEnd,
          topic: rescheduleItem.tipe || 'Konseling Lanjutan',
          complaint: rescheduleItem.keluhan || 'Sesi lanjutan',
          mode: rescheduleMode
        },
        {
          onSuccess: () => {
            toast.success('Jadwal lanjutan berhasil diajukan!');
            setRescheduleItem(null);
          },
          onError: (err) => {
            const msg = err?.response?.data?.message || 'Gagal mengajukan jadwal lanjutan';
            toast.error(msg);
          },
        }
      );
    } else {
      rescheduleMutation.mutate(
        { id: rescheduleItem.id, date: rescheduleDate, start: rescheduleStart, end: rescheduleEnd, mode: rescheduleMode },
        {
          onSuccess: () => {
            toast.success('Jadwal berhasil diubah! Menunggu konfirmasi psikolog.');
            setRescheduleItem(null);
          },
          onError: (err) => {
            const msg = err?.response?.data?.message || 'Gagal mengubah jadwal';
            toast.error(msg);
          },
        }
      );
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      await studentCounselingService.downloadSessionNotePDF(id);
      toast.success('PDF Sesi berhasil diunduh');
    } catch (err) {
      toast.error('Gagal mengunduh PDF Sesi');
    }
  };

  return (
    <PageContent className="font-body">
      <DashboardHero
        title="Riwayat Konseling"
        subtitle="Pantau booking konseling dan lihat rekam medis yang sudah dicatat psikolog setelah sesi."
        breadcrumbs={[
          { label: 'Konseling', path: '/app/student/counseling' },
          { label: 'Riwayat' }
        ]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <PrimaryStatsCard
          title="Total Booking"
          value={history.length}
          badgeText="Sesi"
          icon="calendar_month"
          colorTheme="primary"
        />
        <PrimaryStatsCard
          title="Menunggu"
          value={waitingCount}
          badgeText="Konfirmasi"
          icon="hourglass_empty"
          colorTheme="warning"
        />
        <PrimaryStatsCard
          title="Dikonfirmasi"
          value={confirmedCount}
          badgeText="Disetujui"
          icon="event_available"
          colorTheme="info"
        />
        <PrimaryStatsCard
          title="Selesai"
          value={completedCount}
          badgeText="Tuntas"
          icon="check_circle"
          colorTheme="success"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <section className="xl:col-span-7">
          <div className="glass-card overflow-hidden flex flex-col h-[calc(100vh-240px)] min-h-[500px]">
            <div className="border-b border-[var(--theme-border-muted)] px-6 py-5 flex items-center gap-4 shrink-0">
              <div className="w-12 h-12 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
                <span className="material-symbols-outlined text-[24px]">calendar_month</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Status & Daftar</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Booking Konseling</h3>
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {isHistoryLoading ? (
                <NotifListSkeleton count={5} />
              ) : history.length > 0 ? (
                <div className="space-y-3">
                  {history.map((item) => {
                    const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.default;
                    return (
                      <article key={item.id} className="overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] shadow-sm">
                        <div className={`h-1 w-full ${status.bar}`} />
                        <div className="p-4">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">{formatLongDate(item.tanggal)}</p>
                              <h3 className="mt-1 text-sm font-extrabold text-[var(--theme-text)]">
                                {item.tipe?.startsWith('[Personal]')
                                  ? item.tipe.replace('[Personal]', '[Psikologi]')
                                  : item.tipe?.startsWith('[Karir]')
                                    ? item.tipe.replace('[Karir]', '[Psikologi]')
                                    : item.tipe === 'Personal' || item.tipe === 'Karir'
                                      ? 'Psikologi'
                                      : item.tipe}
                              </h3>
                              <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-[var(--theme-text-subtle)]">
                                <span className="material-symbols-outlined opacity-50 text-[13px]">person</span>
                                {item.nama_konselor}
                              </p>
                              {item.queue_number ? (
                                <span className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wide bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary-light)] w-fit">
                                  <span className="material-symbols-outlined shrink-0" style={{ fontSize: '12px' }}>tag</span>
                                  Antrean #{item.queue_number}
                                </span>
                              ) : null}
                            </div>
                            <span className={`w-fit rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${status.bg} ${status.text} ${status.border}`}>
                              {item.status}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
                            <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >schedule</span>
                                Waktu
                              </p>
                              <p className="mt-1 text-xs font-extrabold text-[var(--theme-text)]">{item.jam_mulai}{item.jam_selesai ? ` - ${item.jam_selesai}` : ''}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >
                                  {item.mode === 'Online' ? 'videocam' : 'groups'}
                                </span>
                                Metode & Lokasi
                              </p>
                              <p className="mt-1 text-xs font-extrabold text-[var(--theme-text)]">
                                {item.mode === 'Online' ? 'Online (Zoom)' : 'Tatap Muka'}
                              </p>
                              {item.mode === 'Online' && item.status === 'Dikonfirmasi' && item.link_meeting ? (
                                <a
                                  href={item.link_meeting.startsWith('http') ? item.link_meeting : `https://${item.link_meeting}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-[var(--theme-primary)] hover:text-[var(--theme-primary)] underline"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>link</span>
                                  Gabung Meeting
                                </a>
                              ) : (
                                <p className="text-[10px] text-[var(--theme-text-subtle)] mt-0.5 leading-snug">
                                  {item.mode === 'Online' ? 'Link dikirim jika disetujui' : 'Ruang Konseling BKU'}
                                </p>
                              )}
                            </div>
                            <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-3 sm:col-span-2 md:col-span-1">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >chat</span>
                                Topik Mahasiswa
                              </p>
                              <p className="mt-1 text-xs font-medium leading-relaxed text-[var(--theme-text)]">{item.keluhan || 'Tidak ada topik tambahan.'}</p>
                            </div>
                          </div>

                          <div className="mt-3 flex items-center justify-between border-t border-[var(--theme-border-muted)] pt-3">
                            <span className="text-[11px] font-semibold text-[var(--theme-text-subtle)]">
                              Rekam medis: {item.medical_record_count || 0} catatan
                            </span>
                            <div className="flex items-center gap-1">
                              {['Menunggu', 'Dikonfirmasi', 'Selesai'].includes(item.status) && (
                                <button
                                  type="button"
                                  onClick={() => openReschedule(item)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--theme-primary)] transition-all hover:bg-[var(--theme-primary-light)]"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>event_repeat</span>
                                  Reschedule
                                </button>
                              )}
                              {item.status === 'Menunggu' && (
                                <button
                                  type="button"
                                  onClick={() => handleCancel(item.id)}
                                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[var(--theme-error)] transition-all hover:bg-[var(--theme-error-light)]"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>delete</span>
                                  Batalkan
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  size="sm"
                  icon="schedule"
                  iconColor="text-[var(--theme-primary)]"
                  iconBgClass="bg-[var(--theme-primary-light)]"
                  iconBorderClass="border-[var(--theme-primary-light)]"
                  title="Belum Ada Riwayat"
                  description="Booking konseling kamu akan muncul di sini setelah membuat jadwal."
                />
              )}
            </div>
          </div>
        </section>

        <section className="xl:col-span-5">
          <div className="glass-card overflow-hidden flex flex-col h-[calc(100vh-240px)] min-h-[500px]">
            <div className="border-b border-[var(--theme-border-muted)] px-5 py-4 shrink-0">
              <div className="flex gap-4 border-b border-[var(--theme-border-muted)] pb-3 overflow-x-auto">
                <button
                  onClick={() => handleTabChange('medical_record')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 -mb-3.5 whitespace-nowrap ${activeTab === 'medical_record'
                    ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                    : 'border-transparent text-[var(--theme-text-subtle)] hover:text-[var(--theme-text-muted)]'
                    }`}
                >
                  <span className="material-symbols-outlined text-[16px]">description</span>
                  Rekam Medis
                  <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-full ${activeTab === 'medical_record' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]'
                    }`}>
                    {records.length}
                  </span>
                </button>
                <button
                  onClick={() => handleTabChange('screening')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 -mb-3.5 whitespace-nowrap ${activeTab === 'screening'
                    ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                    : 'border-transparent text-[var(--theme-text-subtle)] hover:text-[var(--theme-text-muted)]'
                    }`}
                >
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                  Hasil Screening
                  <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-full ${activeTab === 'screening' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]'
                    }`}>
                    {screeningRecords.length}
                  </span>
                </button>
                <button
                  onClick={() => handleTabChange('referrals')}
                  className={`pb-2 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center gap-1.5 -mb-3.5 whitespace-nowrap ${activeTab === 'referrals'
                    ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]'
                    : 'border-transparent text-[var(--theme-text-subtle)] hover:text-[var(--theme-text-muted)]'
                    }`}
                >
                  <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                  Tindak Lanjut
                  <span className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded-full ${activeTab === 'referrals' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]'
                    }`}>
                    {referrals.length}
                  </span>
                </button>
              </div>
              <p className="mt-4 text-xs font-semibold text-[var(--theme-text-muted)]">
                {activeTab === 'medical_record'
                  ? 'Catatan sesi yang sudah disimpan oleh psikolog.'
                  : activeTab === 'screening'
                    ? 'Hasil asesmen psikologis dari psikolog berdasarkan sesi konseling.'
                    : 'Rujukan dan rekomendasi tindak lanjut penanganan dari psikolog.'}
              </p>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              {activeTab === 'screening' ? (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Total Screening</p>
                      <p className="mt-1 text-2xl font-extrabold text-[var(--theme-primary)]">{screeningRecords.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Status Terakhir</p>
                      <p className="mt-1 text-sm font-extrabold text-[var(--theme-text)]">{summary.latest_status}</p>
                    </div>
                  </div>

                  {isMedicalLoading ? (
                    <NotifListSkeleton count={3} />
                  ) : screeningRecords.length > 0 ? (
                    <div className="space-y-3">
                      {screeningRecords.map((record) => {
                        const isExpanded = expandedScreening === record.id;
                        const tindakChipConfig = {
                          Tuntas: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]',
                          Lanjutan: 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]',
                          Rujuk: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]',
                        };
                        return (
                          <article key={record.id} className="overflow-hidden rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] shadow-sm transition-shadow hover:shadow-md">
                            {/* Header */}
                            <div className="h-1 w-full bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-primary-light)]" />
                            <button
                              type="button"
                              className="w-full p-4 text-left"
                              onClick={() => setExpandedScreening(isExpanded ? null : record.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-subtle)]">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>calendar_month</span>
                                    {record.tanggal_asesmen || record.display_date} • {record.time}
                                  </p>
                                  <h3 className="mt-1 text-sm font-extrabold text-[var(--theme-text)]">{record.type}</h3>
                                  <p className="mt-0.5 text-xs font-semibold text-[var(--theme-text-muted)]">Psikolog: {record.psychologist}</p>
                                  {record.tindak_lanjut?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                      {record.tindak_lanjut.map((t) => (
                                        <span key={t} className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${tindakChipConfig[t] || 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'
                                          }`}>
                                          <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
                                            {t === 'Tuntas' ? 'check_circle' : t === 'Rujuk' ? 'local_hospital' : 'repeat'}
                                          </span>
                                          {t}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadPDF(record.id);
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] bg-[var(--theme-bg)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl transition-all shadow-sm"
                                  >
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>download</span>
                                    PDF
                                  </button>
                                  <span className={`flex h-6 w-6 items-center justify-center rounded-full transition-transform ${isExpanded ? 'bg-[var(--theme-primary-light)] rotate-180' : 'bg-[var(--theme-bg)]'
                                    }`}>
                                    <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: '14px' }}>expand_more</span>
                                  </span>
                                </div>
                              </div>
                            </button>

                            {/* Expanded detail */}
                            {isExpanded && (
                              <div className="border-t border-[var(--theme-border-muted)] p-4 space-y-3">
                                {record.tujuan_pemeriksaan && (
                                  <div className="rounded-xl border border-[var(--theme-primary-light)] bg-[var(--theme-primary-light)] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-primary)]">Tujuan Pemeriksaan</p>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--theme-primary)]">{record.tujuan_pemeriksaan}</p>
                                  </div>
                                )}
                                {record.riwayat_keluhan && (
                                  <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-3">
                                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-subtle)]">Riwayat Keluhan</p>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text)]">{record.riwayat_keluhan}</p>
                                  </div>
                                )}
                                {(record.aspek_kognitif || record.aspek_emosional || record.aspek_perilaku) && (
                                  <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-subtle)]">Aspek Psikologis</p>
                                    <div className="space-y-2">
                                      {record.aspek_kognitif && (
                                        <div className="rounded-xl border border-[var(--theme-primary-light)] bg-[var(--theme-primary-light)] p-3">
                                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-primary)]">
                                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>psychology_alt</span>
                                            Kognitif
                                          </p>
                                          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-primary)]">{record.aspek_kognitif}</p>
                                        </div>
                                      )}
                                      {record.aspek_emosional && (
                                        <div className="rounded-xl border border-[var(--theme-primary-light)] bg-[var(--theme-primary-light)] p-3">
                                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-primary)]">
                                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>favorite</span>
                                            Emosional
                                          </p>
                                          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-primary)]">{record.aspek_emosional}</p>
                                        </div>
                                      )}
                                      {record.aspek_perilaku && (
                                        <div className="rounded-xl border border-[var(--theme-warning-light)] bg-[var(--theme-warning-light)] p-3">
                                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-warning)]">
                                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>directions_run</span>
                                            Perilaku
                                          </p>
                                          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-warning)]">{record.aspek_perilaku}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {(record.rekomendasi_mahasiswa || record.rekomendasi_prodi || record.rekomendasi_orang_tua) && (
                                  <div>
                                    <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-subtle)]">Rekomendasi</p>
                                    <div className="space-y-2">
                                      {record.rekomendasi_mahasiswa && (
                                        <div className="rounded-xl border border-[var(--theme-success-light)] bg-[var(--theme-success-light)] p-3">
                                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-success)]">
                                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>person</span>
                                            Untuk Mahasiswa
                                          </p>
                                          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-success)]">{record.rekomendasi_mahasiswa}</p>
                                        </div>
                                      )}
                                      {record.rekomendasi_prodi && (
                                        <div className="rounded-xl border border-[var(--theme-success-light)] bg-[var(--theme-success-light)] p-3">
                                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-success)]">
                                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>school</span>
                                            Untuk Program Studi
                                          </p>
                                          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-success)]">{record.rekomendasi_prodi}</p>
                                        </div>
                                      )}
                                      {record.rekomendasi_orang_tua && (
                                        <div className="rounded-xl border border-[var(--theme-primary-light)] bg-[var(--theme-primary-light)] p-3">
                                          <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-primary)]">
                                            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>family_restroom</span>
                                            Untuk Orang Tua
                                          </p>
                                          <p className="mt-1 text-xs leading-relaxed text-[var(--theme-primary)]">{record.rekomendasi_orang_tua}</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                {record.kesimpulan && (
                                  <div className="rounded-xl border border-[var(--theme-border)] bg-gradient-to-br from-[var(--theme-bg)] to-[var(--theme-bg)] p-3">
                                    <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">
                                      <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>summarize</span>
                                      Kesimpulan Psikolog
                                    </p>
                                    <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text)] font-medium">{record.kesimpulan}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      size="sm"
                      icon="psychology"
                      iconColor="text-[var(--theme-primary)]"
                      iconBgClass="bg-[var(--theme-primary-light)]"
                      iconBorderClass="border-[var(--theme-primary-light)]"
                      title="Belum Ada Hasil Screening"
                      description="Hasil asesmen psikologis akan muncul setelah psikolog mengisi catatan sesi lengkap."
                    />
                  )}
                </>
              ) : activeTab === 'medical_record' ? (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Total Catatan</p>
                      <p className="mt-1 text-2xl font-extrabold text-[var(--theme-primary)]">{summary.total_records}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Status Terakhir</p>
                      <p className="mt-1 text-sm font-extrabold text-[var(--theme-text)]">{summary.latest_status}</p>
                    </div>
                  </div>

                  {isMedicalLoading ? (
                    <NotifListSkeleton count={4} />
                  ) : records.length > 0 ? (
                    <div className="space-y-3">
                      {records.map((record) => (
                        <article key={record.id} className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >calendar_month</span>
                                {record.display_date} • {record.time}
                              </p>
                              <h3 className="mt-1 text-sm font-extrabold text-[var(--theme-text)]">{record.type}</h3>
                              <p className="mt-0.5 text-xs font-semibold text-[var(--theme-text-subtle)]">Psikolog: {record.psychologist}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className="rounded-full border border-[var(--theme-success-light)] bg-[var(--theme-success-light)] px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-success)]">
                                {record.status}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDownloadPDF(record.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] bg-[var(--theme-bg)] hover:bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl transition-all shadow-sm"
                              >
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>download</span>
                                PDF
                              </button>
                            </div>
                          </div>

                          <div className="mt-4 space-y-3">
                            <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-3">
                              <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Keluhan / Isu</p>
                              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text)]">{record.complaint}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--theme-primary-light)] bg-[var(--theme-primary-light)] p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-primary)]">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >show_chart</span>
                                Observasi
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-primary)]">{record.observation}</p>
                            </div>
                            <div className="rounded-xl border border-[var(--theme-success-light)] bg-[var(--theme-success-light)] p-3">
                              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-success)]">
                                <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >security</span>
                                Rekomendasi
                              </p>
                              <p className="mt-1 text-xs leading-relaxed text-[var(--theme-success)]">{record.recommendation}</p>
                            </div>
                            {record.tindak_lanjut?.length > 0 && (
                              <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] p-3 shadow-sm">
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>assignment_turned_in</span>
                                  Tindak Lanjut Sesi
                                </p>
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {record.tindak_lanjut.map((t) => {
                                    const tindakChipConfig = {
                                      Tuntas: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]',
                                      Lanjutan: 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]',
                                      Rujuk: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]',
                                    };
                                    return (
                                      <span key={t} className={`inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wide ${tindakChipConfig[t] || 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'
                                        }`}>
                                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }}>
                                          {t === 'Tuntas' ? 'check_circle' : t === 'Rujuk' ? 'local_hospital' : 'repeat'}
                                        </span>
                                        {t}
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      size="sm"
                      icon="description"
                      iconColor="text-[var(--theme-primary)]"
                      iconBgClass="bg-[var(--theme-primary-light)]"
                      iconBorderClass="border-[var(--theme-primary-light)]"
                      title="Belum Ada Rekam Medis"
                      description="Catatan rekam medis akan muncul setelah psikolog menyimpan catatan sesi."
                    />
                  )}
                </>
              ) : (
                <>
                  <div className="mb-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Total Tindak Lanjut</p>
                      <p className="mt-1 text-2xl font-extrabold text-[var(--theme-primary)]">{referrals.length}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Status Aktif</p>
                      <p className="mt-1 text-sm font-extrabold text-[var(--theme-text)]">
                        {referrals.filter(r => r.status === 'Sent' || r.status === 'Received').length} Diproses
                      </p>
                    </div>
                  </div>

                  {isReferralsLoading ? (
                    <NotifListSkeleton count={3} />
                  ) : referrals.length > 0 ? (
                    <div className="space-y-3">
                      {referrals.map((ref) => {
                        const statusConfig = REFERRAL_STATUS_CONFIG[ref.status] || REFERRAL_STATUS_CONFIG.default;
                        return (
                          <article key={ref.id} className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">
                                  <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >calendar_month</span>
                                  {ref.display_date} • {ref.time}
                                </p>
                                <h3 className="mt-1 text-sm font-extrabold text-[var(--theme-text)]">{ref.type}</h3>
                                <p className="mt-0.5 text-xs font-semibold text-[var(--theme-text-subtle)]">Dari: {ref.psychologist}</p>
                              </div>
                              <span className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wide ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}>
                                {ref.status === 'Sent' ? 'Dikirim' : ref.status === 'Received' ? 'Diterima' : ref.status}
                              </span>
                            </div>

                            <div className="mt-4 space-y-3">
                              <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Pihak Penerima Rujukan</p>
                                <p className="mt-1 text-xs font-extrabold text-[var(--theme-text)]">{ref.target_party}</p>
                                {ref.target_email && (
                                  <p className="text-[10px] text-[var(--theme-text-subtle)] mt-0.5 flex items-center gap-1">
                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>mail</span>
                                    {ref.target_email}
                                  </p>
                                )}
                              </div>

                              <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-3">
                                <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-muted)]">Alasan / Rekomendasi Rujukan</p>
                                <p className="mt-1 text-xs leading-relaxed text-[var(--theme-text)]">{ref.reason}</p>
                              </div>

                              {(ref.referral_pdf_url || ref.support_file_url) && (
                                <div className="flex gap-2 pt-1">
                                  {ref.referral_pdf_url && (
                                    <a
                                      href={getFullUrl(ref.referral_pdf_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-[11px] font-bold text-[var(--theme-text)] shadow-sm transition-all hover:bg-[var(--theme-bg)]"
                                    >
                                      <span className="material-symbols-outlined text-[var(--theme-error)] animate-pulse" style={{ fontSize: '16px' }} >picture_as_pdf</span>
                                      Unduh Surat Rujukan
                                    </a>
                                  )}
                                  {ref.support_file_url && (
                                    <a
                                      href={getFullUrl(ref.support_file_url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-[11px] font-bold text-[var(--theme-text)] shadow-sm transition-all hover:bg-[var(--theme-bg)]"
                                    >
                                      <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }} >attachment</span>
                                      Berkas Pendukung
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      size="sm"
                      icon="forward_to_inbox"
                      iconColor="text-[var(--theme-primary)]"
                      iconBgClass="bg-[var(--theme-primary-light)]"
                      iconBorderClass="border-[var(--theme-primary-light)]"
                      title="Belum Ada Tindak Lanjut"
                      description="Rujukan atau tindak lanjut khusus dari psikolog akan muncul di sini."
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* ── RESCHEDULE MODAL ── */}
      {rescheduleItem && (
        <DialogModal
          open={!!rescheduleItem}
          onOpenChange={(open) => !open && setRescheduleItem(null)}
          maxWidth="max-w-md"
          title="Reschedule Konseling"
          subtitle="Ubah Jadwal"
          description="Ubah tanggal & waktu sesi konseling"
          icon="event_repeat"
          footer={
            <div className="flex gap-3 w-full">
              <button
                type="button"
                onClick={() => setRescheduleItem(null)}
                className="flex-1 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] py-3 text-[13px] font-black text-[var(--theme-text-muted)] transition-all hover:bg-[var(--theme-bg)] cursor-pointer tracking-widest uppercase"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleReschedule}
                disabled={rescheduleMutation.isPending || !rescheduleDate}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] py-3 text-[13px] font-black text-white shadow-sm transition-all hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-none tracking-widest uppercase"
              >
                {rescheduleMutation.isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check</span>
                    Simpan
                  </>
                )}
              </button>
            </div>
          }
        >
          <div className="space-y-4 p-2">
            {/* Booking info */}
            <div className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">Booking Saat Ini</p>
              <p className="mt-1 text-[15px] font-bold font-headline text-[var(--theme-text)]">
                {rescheduleItem.nama_konselor}
              </p>
              <p className="mt-0.5 text-[12px] text-[var(--theme-text-muted)] font-semibold tracking-wider">
                {formatLongDate(rescheduleItem.tanggal)} • {rescheduleItem.jam_mulai}
                {rescheduleItem.jam_selesai ? ` - ${rescheduleItem.jam_selesai}` : ''}
              </p>
            </div>

            {(() => {
              const availableSchedules = jadwalSemua.filter(j =>
                (j.PsikologID === rescheduleItem.psikolog_id || j.NamaKonselor === rescheduleItem.nama_konselor) &&
                new Date(j.Tanggal) >= new Date(new Date().setHours(0, 0, 0, 0))
              );
              if (availableSchedules.length === 0) return (
                <div className="rounded-xl border border-[var(--theme-error-light)] bg-[var(--theme-error-light)] p-3 mb-2">
                  <p className="text-[11px] text-[var(--theme-error)] font-medium">
                    <span className="font-bold">Info:</span> Psikolog ini belum memiliki jadwal baru yang tersedia. Silakan hubungi admin atau tunggu jadwal dibuka kembali.
                  </p>
                </div>
              );
              return (
                <div className="mb-2">
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">Pilih Jadwal Tersedia <span className="text-[var(--theme-error)]">*</span></p>
                  <div className="flex flex-col gap-2 max-h-[220px] overflow-y-auto pr-1">
                    {availableSchedules.map(j => {
                      const tDate = new Date(j.Tanggal).toISOString().split('T')[0];
                      const isSelected = rescheduleDate === tDate && rescheduleStart === j.JamMulai;
                      return (
                        <button
                          key={j.SlotID || Math.random()}
                          type="button"
                          onClick={() => {
                            setRescheduleDate(tDate);
                            setRescheduleStart(j.JamMulai);
                            setRescheduleEnd(j.JamSelesai);
                          }}
                          className={`text-left w-full rounded-xl border p-3 transition-all ${isSelected
                              ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] ring-1 ring-[var(--theme-primary)]'
                              : 'border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-[var(--theme-primary)] hover:bg-[var(--theme-bg)]'
                            }`}
                        >
                          <div className="flex items-center justify-between">
                            <p className={`text-[13px] font-extrabold ${isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>
                              {new Date(j.Tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </p>
                            <p className={`text-xs font-bold ${isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-muted)]'}`}>
                              {j.JamMulai} - {j.JamSelesai}
                            </p>
                          </div>
                          <p className="text-[10px] mt-1 text-[var(--theme-text-subtle)] font-semibold">
                            Lokasi: <span className="text-[var(--theme-text-muted)]">{j.Lokasi}</span> • Sisa Kuota: <span className="text-[var(--theme-text-muted)]">{j.SisaKuota}</span>
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Mode Konseling Selection */}
            <div className="mb-2">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">Mode Konseling <span className="text-[var(--theme-error)]">*</span></p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRescheduleMode('Tatap Muka')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${rescheduleMode === 'Tatap Muka'
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] ring-1 ring-[var(--theme-primary)]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)] hover:border-[var(--theme-primary)]'
                    }`}
                >
                  <span className={`material-symbols-outlined mb-1.5 ${rescheduleMode === 'Tatap Muka' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-muted)]'}`}>groups</span>
                  <span className={`text-[12px] font-bold ${rescheduleMode === 'Tatap Muka' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>Tatap Muka</span>
                  <span className="text-[9px] text-[var(--theme-text-subtle)] mt-0.5">Ruang Konseling BKU</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRescheduleMode('Online')}
                  className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all ${rescheduleMode === 'Online'
                    ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] ring-1 ring-[var(--theme-primary)]'
                    : 'border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)] hover:border-[var(--theme-primary)]'
                    }`}
                >
                  <span className={`material-symbols-outlined mb-1.5 ${rescheduleMode === 'Online' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-muted)]'}`}>videocam</span>
                  <span className={`text-[12px] font-bold ${rescheduleMode === 'Online' ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>Online</span>
                  <span className="text-[9px] text-[var(--theme-text-subtle)] mt-0.5">Via Zoom / GMeet</span>
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 rounded-2xl border border-[var(--theme-warning-light)] bg-[var(--theme-warning-light)] p-4 mt-4">
              <span className="material-symbols-outlined text-[var(--theme-warning)] mt-0.5 shrink-0" style={{ fontSize: '20px' }}>info</span>
              <p className="text-[12px] leading-relaxed text-[var(--theme-warning)] font-semibold">
                Setelah reschedule, status booking akan kembali ke <strong>Menunggu</strong> dan psikolog perlu mengonfirmasi ulang jadwal baru.
              </p>
            </div>
          </div>
        </DialogModal>
      )}
    </PageContent>
  );
}
