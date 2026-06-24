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
import { studentCounselingService } from '@/services/api';
import { DashboardHero } from '@/components/ui/dashboard';
import { PageContent } from '@/components/ui/page';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DialogModal } from '@/components/ui/DialogModal';
import { DataTable } from '@/components/ui/DataTable';
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
  Selesai: { bg: 'bg-[var(--theme-success)]/10', text: 'text-[var(--theme-success)]', border: 'border-[var(--theme-success)]/20' },
  Dikonfirmasi: { bg: 'bg-[var(--theme-primary)]/10', text: 'text-[var(--theme-primary)]', border: 'border-[var(--theme-primary)]/20' },
  Menunggu: { bg: 'bg-[var(--theme-warning)]/10', text: 'text-[var(--theme-warning)]', border: 'border-[var(--theme-warning)]/20' },
  Ditolak: { bg: 'bg-[var(--theme-error)]/10', text: 'text-[var(--theme-error)]', border: 'border-[var(--theme-error)]/20' },
  Dibatalkan: { bg: 'bg-[var(--theme-bg)]', text: 'text-[var(--theme-text-muted)]', border: 'border-[var(--theme-border-muted)]' },
  default: { bg: 'bg-[var(--theme-bg)]', text: 'text-[var(--theme-text-muted)]', border: 'border-[var(--theme-border-muted)]' },
};

const hasScreeningData = (record) => {
  return (
    record.aspek_kognitif || record.aspek_emosional || record.aspek_perilaku || record.kesimpulan || record.riwayat_keluhan || record.tujuan_pemeriksaan || record.rekomendasi_mahasiswa || record.rekomendasi_prodi || record.rekomendasi_orang_tua || record.tindak_lanjut?.length > 0
  );
};

export default function CounselingHistoryPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: history = [], isLoading: isHistoryLoading } = useCounselingRiwayatQuery();
  const { data: medicalRecord, isLoading: isMedicalLoading } = useCounselingMedicalRecordQuery();
  const { data: referrals = [], isLoading: isReferralsLoading } = useCounselingReferralsQuery();
  
  const initialTab = ['booking', 'medical_record', 'screening', 'referrals'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'booking';
  const [activeTab, setActiveTab] = useState(initialTab);
  
  const cancelMutation = useCancelBookingMutation();
  const rescheduleMutation = useRescheduleMutation();
  const bookingMutation = useBookingMutation();
  const { data: jadwalSemua = [] } = useCounselingJadwalQuery();

  // Dialog Modals
  const [rescheduleItem, setRescheduleItem] = useState(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStart, setRescheduleStart] = useState('');
  const [rescheduleEnd, setRescheduleEnd] = useState('');
  
  const [screeningDetail, setScreeningDetail] = useState(null);

  const records = medicalRecord?.records || [];
  const screeningRecords = records.filter(hasScreeningData);
  const waitingCount = history.filter((item) => item.status === 'Menunggu').length;
  const confirmedCount = history.filter((item) => item.status === 'Dikonfirmasi').length;
  const completedCount = history.filter((item) => item.status === 'Selesai').length;

  useEffect(() => {
    const nextTab = searchParams.get('tab');
    if (['booking', 'medical_record', 'screening', 'referrals'].includes(nextTab)) {
      setActiveTab(nextTab);
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'booking' ? {} : { tab });
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
    const dateStr = item.tanggal ? new Date(item.tanggal).toISOString().split('T')[0] : '';
    setRescheduleDate(dateStr);
    setRescheduleStart(item.jam_mulai || '');
    setRescheduleEnd(item.jam_selesai || '');
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
          mode: rescheduleItem.mode || 'Tatap Muka'
        },
        {
          onSuccess: () => {
            toast.success('Jadwal lanjutan berhasil diajukan!');
            setRescheduleItem(null);
          },
          onError: (err) => {
            toast.error(err?.response?.data?.message || 'Gagal mengajukan jadwal lanjutan');
          },
        }
      );
    } else {
      rescheduleMutation.mutate(
        { id: rescheduleItem.id, date: rescheduleDate, start: rescheduleStart, end: rescheduleEnd },
        {
          onSuccess: () => {
            toast.success('Jadwal berhasil diubah! Menunggu konfirmasi psikolog.');
            setRescheduleItem(null);
          },
          onError: (err) => {
            toast.error(err?.response?.data?.message || 'Gagal mengubah jadwal');
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

  // DATATABLE COLUMNS
  const historyColumns = [
    {
      key: 'tanggal',
      label: 'Waktu & Tipe',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">{formatLongDate(val)}</div>
          <div className="text-xs text-[var(--theme-text-muted)] mt-0.5">{row.jam_mulai} - {row.jam_selesai} WIB</div>
          <div className="text-xs text-[var(--theme-primary)] font-bold mt-1 uppercase tracking-widest">{row.tipe}</div>
        </div>
      ),
    },
    {
      key: 'nama_konselor',
      label: 'Detail Sesi',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">Psikolog: {val}</div>
          <div className="text-xs text-[var(--theme-text-muted)] flex items-center gap-1 mt-0.5">
            <span className="material-symbols-outlined text-[14px]">{row.mode === 'Online' ? 'videocam' : 'groups'}</span>
            {row.mode === 'Online' ? 'Online' : 'Tatap Muka'}
          </div>
          {row.queue_number && <div className="text-xs text-[var(--theme-primary)] font-bold mt-0.5">Antrean #{row.queue_number}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val, row) => {
        const sc = STATUS_CONFIG[val] || STATUS_CONFIG.default;
        return (
          <div className="flex flex-col gap-1.5 items-start">
            <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${sc.bg} ${sc.text} ${sc.border}`}>
              {val}
            </span>
            {row.mode === 'Online' && row.link_meeting && (
               <a href={row.link_meeting.startsWith('http') ? row.link_meeting : `https://${row.link_meeting}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">link</span> Meeting</a>
            )}
          </div>
        );
      },
    },
  ];

  const medicalColumns = [
    {
      key: 'display_date',
      label: 'Tanggal Sesi',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">{val}</div>
          <div className="text-xs text-[var(--theme-text-muted)] mt-0.5">{row.time}</div>
        </div>
      ),
    },
    {
      key: 'psychologist',
      label: 'Psikolog',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">{val}</div>
          <div className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-widest font-bold mt-0.5">{row.type}</div>
        </div>
      ),
    },
    {
      key: 'complaint',
      label: 'Topik / Keluhan',
      sortable: false,
      render: (val) => <div className="max-w-xs truncate text-[13px]">{val}</div>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => <span className="inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20">{val}</span>,
    },
  ];

  const screeningColumns = [
    {
      key: 'display_date',
      label: 'Tanggal Sesi',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">{row.tanggal_asesmen || val}</div>
          <div className="text-xs text-[var(--theme-text-muted)] mt-0.5">{row.time}</div>
        </div>
      ),
    },
    {
      key: 'psychologist',
      label: 'Psikolog',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">{val}</div>
          <div className="text-[10px] text-[var(--theme-text-muted)] uppercase tracking-widest font-bold mt-0.5">{row.type}</div>
        </div>
      ),
    },
    {
      key: 'tindak_lanjut',
      label: 'Tindak Lanjut',
      sortable: false,
      render: (val) => {
        if (!val || val.length === 0) return '-';
        return (
          <div className="flex flex-wrap gap-1.5">
            {val.map(t => (
               <span key={t} className="inline-flex items-center gap-0.5 rounded-md border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]">
                 {t}
               </span>
            ))}
          </div>
        );
      },
    },
  ];

  const referralColumns = [
    {
      key: 'tanggal_rujukan',
      label: 'Tanggal Rujukan',
      sortable: true,
      render: (val) => <div className="font-bold">{formatLongDate(val)}</div>,
    },
    {
      key: 'psikolog_nama',
      label: 'Psikolog Pengirim',
      sortable: true,
      render: (val) => <div className="font-bold">{val}</div>,
    },
    {
      key: 'institusi_tujuan',
      label: 'Tujuan Rujukan',
      sortable: true,
      render: (val, row) => (
        <div>
          <div className="font-bold text-[var(--theme-text)]">{val}</div>
          {row.spesialis_tujuan && <div className="text-xs text-[var(--theme-text-muted)]">{row.spesialis_tujuan}</div>}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (val) => {
        const bg = val === 'Pending' ? 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)]' : 'bg-[var(--theme-success)]/10 text-[var(--theme-success)]';
        return <span className={`inline-flex px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${bg}`}>{val}</span>;
      },
    },
  ];

  return (
    <PageContent className="font-body">
      <DashboardHero
        title="Riwayat Konseling"
        subtitle="Pantau booking konseling dan lihat rekam medis yang sudah dicatat psikolog setelah sesi."
        breadcrumbs={[{ label: 'Konseling', path: '/student/counseling' }, { label: 'Riwayat' }]}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <PrimaryStatsCard title="Total Booking" value={history.length} badgeText="Sesi" icon="calendar_month" colorTheme="primary" />
        <PrimaryStatsCard title="Menunggu" value={waitingCount} badgeText="Konfirmasi" icon="hourglass_empty" colorTheme="warning" />
        <PrimaryStatsCard title="Dikonfirmasi" value={confirmedCount} badgeText="Disetujui" icon="event_available" colorTheme="info" />
        <PrimaryStatsCard title="Selesai" value={completedCount} badgeText="Tuntas" icon="check_circle" colorTheme="success" />
      </div>

      <div className="glass-card overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)] flex overflow-x-auto">
          {[
            { id: 'booking', label: 'Booking', icon: 'pending_actions', count: history.length },
            { id: 'medical_record', label: 'Rekam Medis', icon: 'description', count: records.length },
            { id: 'screening', label: 'Hasil Screening', icon: 'psychology', count: screeningRecords.length },
            { id: 'referrals', label: 'Rujukan', icon: 'assignment_turned_in', count: referrals.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-6 py-4 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id ? 'border-[var(--theme-primary)] text-[var(--theme-primary)] bg-[var(--theme-primary-light)]/20' : 'border-transparent text-[var(--theme-text-subtle)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text-muted)]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold ${activeTab === tab.id ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'bg-[var(--theme-surface)] border border-[var(--theme-border-muted)]'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {activeTab === 'booking' && (
            <DataTable
              title="Daftar Booking Konseling"
              data={history}
              loading={isHistoryLoading}
              columns={historyColumns}
              searchable={true}
              searchPlaceholder="Cari jadwal atau psikolog..."
              emptyIcon="event_busy"
              filters={[
                {
                  key: 'status',
                  placeholder: 'Status',
                  options: [
                    { label: 'Menunggu', value: 'Menunggu' },
                    { label: 'Dikonfirmasi', value: 'Dikonfirmasi' },
                    { label: 'Selesai', value: 'Selesai' },
                    { label: 'Dibatalkan', value: 'Dibatalkan' }
                  ]
                }
              ]}
              actions={(row) => (
                <div className="flex items-center gap-1">
                  {['Menunggu', 'Dikonfirmasi', 'Selesai'].includes(row.status) && (
                    <button onClick={() => openReschedule(row)} className="px-2 py-1 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] text-[10px] font-bold rounded flex items-center gap-1 hover:opacity-80 transition-opacity">
                      <span className="material-symbols-outlined text-[14px]">event_repeat</span> Reschedule
                    </button>
                  )}
                  {row.status === 'Menunggu' && (
                    <button onClick={() => handleCancel(row.id)} className="px-2 py-1 bg-[var(--theme-error)]/10 text-[var(--theme-error)] text-[10px] font-bold rounded flex items-center gap-1 hover:opacity-80 transition-opacity">
                      <span className="material-symbols-outlined text-[14px]">delete</span> Batal
                    </button>
                  )}
                </div>
              )}
            />
          )}

          {activeTab === 'medical_record' && (
            <DataTable
              title="Rekam Medis Konseling"
              data={records}
              loading={isMedicalLoading}
              columns={medicalColumns}
              searchable={true}
              emptyIcon="description"
              actions={(row) => (
                <button onClick={() => handleDownloadPDF(row.id)} className="px-3 py-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] text-[var(--theme-text)] text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-[var(--theme-bg)] shadow-sm transition-colors">
                  <span className="material-symbols-outlined text-[14px]">download</span> PDF
                </button>
              )}
            />
          )}

          {activeTab === 'screening' && (
            <DataTable
              title="Hasil Screening Psikologis"
              data={screeningRecords}
              loading={isMedicalLoading}
              columns={screeningColumns}
              searchable={true}
              emptyIcon="psychology"
              actions={(row) => (
                <div className="flex gap-2">
                  <button onClick={() => setScreeningDetail(row)} className="px-3 py-1.5 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] text-[11px] font-bold rounded-lg flex items-center gap-1 hover:opacity-80 shadow-sm transition-opacity">
                    <span className="material-symbols-outlined text-[14px]">visibility</span> Detail
                  </button>
                  <button onClick={() => handleDownloadPDF(row.id)} className="px-3 py-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] text-[var(--theme-text)] text-[11px] font-bold rounded-lg flex items-center gap-1 hover:bg-[var(--theme-bg)] shadow-sm transition-colors">
                    <span className="material-symbols-outlined text-[14px]">download</span> PDF
                  </button>
                </div>
              )}
            />
          )}

          {activeTab === 'referrals' && (
            <DataTable
              title="Daftar Rujukan"
              data={referrals}
              loading={isReferralsLoading}
              columns={referralColumns}
              searchable={true}
              emptyIcon="assignment_turned_in"
            />
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      <DialogModal
        open={!!rescheduleItem}
        onOpenChange={(open) => !open && setRescheduleItem(null)}
        title="Ubah Jadwal (Reschedule)"
        subtitle="Pilih tanggal dan waktu pengganti"
        footer={
          <div className="flex gap-3 w-full">
            <button onClick={() => setRescheduleItem(null)} className="flex-1 py-2.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[13px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider hover:bg-[var(--theme-bg)] transition-colors">Batal</button>
            <button onClick={handleReschedule} disabled={rescheduleMutation.isPending || bookingMutation.isPending} className="flex-1 py-2.5 rounded-xl bg-[var(--theme-primary)] text-white text-[13px] font-bold disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider hover:opacity-90 transition-opacity shadow-sm">
              <span className="material-symbols-outlined text-[16px]">save</span> Simpan
            </button>
          </div>
        }
      >
        <div className="space-y-4 p-2">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] mb-2">Tanggal Baru</label>
            <input type="date" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} className="w-full px-3 py-2 border border-[var(--theme-border-muted)] rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] mb-2">Jam Mulai</label>
              <input type="time" value={rescheduleStart} onChange={(e) => setRescheduleStart(e.target.value)} className="w-full px-3 py-2 border border-[var(--theme-border-muted)] rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none" />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] mb-2">Jam Selesai</label>
              <input type="time" value={rescheduleEnd} onChange={(e) => setRescheduleEnd(e.target.value)} className="w-full px-3 py-2 border border-[var(--theme-border-muted)] rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none" />
            </div>
          </div>
        </div>
      </DialogModal>

      {/* Screening Detail Modal */}
      <DialogModal
        open={!!screeningDetail}
        onOpenChange={(open) => !open && setScreeningDetail(null)}
        title="Detail Hasil Screening"
        subtitle={`Asesmen oleh ${screeningDetail?.psychologist}`}
        maxWidth="max-w-2xl"
        footer={
            <button onClick={() => setScreeningDetail(null)} className="w-full py-3 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] text-[13px] font-bold uppercase tracking-wider hover:bg-[var(--theme-bg)] transition-colors">Tutup Detail</button>
        }
      >
        <div className="space-y-4 p-2 max-h-[60vh] overflow-y-auto">
            {screeningDetail?.tujuan_pemeriksaan && (
                <div className="rounded-xl border border-[var(--theme-primary-light)] bg-[var(--theme-primary-light)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-primary)]">Tujuan Pemeriksaan</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--theme-primary)] font-medium">{screeningDetail.tujuan_pemeriksaan}</p>
                </div>
            )}
            {screeningDetail?.riwayat_keluhan && (
                <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-subtle)]">Riwayat Keluhan</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-[var(--theme-text)] font-medium">{screeningDetail.riwayat_keluhan}</p>
                </div>
            )}
            {(screeningDetail?.aspek_kognitif || screeningDetail?.aspek_emosional || screeningDetail?.aspek_perilaku) && (
                <div>
                    <h4 className="text-xs font-bold mb-2 border-b border-[var(--theme-border-muted)] pb-2 uppercase tracking-widest text-[var(--theme-text-muted)] mt-2">Aspek Psikologis</h4>
                    <div className="space-y-3">
                        {screeningDetail.aspek_kognitif && (
                            <div className="p-3 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border-muted)] shadow-sm">
                                <p className="text-[10px] font-bold text-[var(--theme-primary)] mb-1 uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">psychology_alt</span> Kognitif</p>
                                <p className="text-[13px] text-[var(--theme-text)] font-medium">{screeningDetail.aspek_kognitif}</p>
                            </div>
                        )}
                        {screeningDetail.aspek_emosional && (
                            <div className="p-3 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border-muted)] shadow-sm">
                                <p className="text-[10px] font-bold text-[var(--theme-primary)] mb-1 uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">favorite</span> Emosional</p>
                                <p className="text-[13px] text-[var(--theme-text)] font-medium">{screeningDetail.aspek_emosional}</p>
                            </div>
                        )}
                        {screeningDetail.aspek_perilaku && (
                            <div className="p-3 bg-[var(--theme-surface)] rounded-xl border border-[var(--theme-border-muted)] shadow-sm">
                                <p className="text-[10px] font-bold text-[var(--theme-warning)] mb-1 uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">directions_run</span> Perilaku</p>
                                <p className="text-[13px] text-[var(--theme-text)] font-medium">{screeningDetail.aspek_perilaku}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {(screeningDetail?.rekomendasi_mahasiswa || screeningDetail?.rekomendasi_prodi || screeningDetail?.rekomendasi_orang_tua) && (
                <div>
                    <h4 className="text-xs font-bold mt-4 mb-2 border-b border-[var(--theme-border-muted)] pb-2 uppercase tracking-widest text-[var(--theme-text-muted)]">Rekomendasi</h4>
                    <div className="space-y-3">
                        {screeningDetail.rekomendasi_mahasiswa && (
                            <div className="p-3 bg-[var(--theme-success)]/5 rounded-xl border border-[var(--theme-success)]/20 shadow-sm">
                                <p className="text-[10px] font-bold text-[var(--theme-success)] mb-1 uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person</span> Untuk Mahasiswa</p>
                                <p className="text-[13px] text-[var(--theme-text)] font-medium">{screeningDetail.rekomendasi_mahasiswa}</p>
                            </div>
                        )}
                        {screeningDetail.rekomendasi_prodi && (
                            <div className="p-3 bg-[var(--theme-success)]/5 rounded-xl border border-[var(--theme-success)]/20 shadow-sm">
                                <p className="text-[10px] font-bold text-[var(--theme-success)] mb-1 uppercase tracking-wider flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">school</span> Untuk Prodi</p>
                                <p className="text-[13px] text-[var(--theme-text)] font-medium">{screeningDetail.rekomendasi_prodi}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {screeningDetail?.kesimpulan && (
                <div className="mt-4 p-4 rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--theme-text-subtle)] flex items-center gap-1 mb-1.5"><span className="material-symbols-outlined text-[14px]">summarize</span> Kesimpulan</p>
                    <p className="text-[13px] font-medium leading-relaxed text-[var(--theme-text)]">{screeningDetail.kesimpulan}</p>
                </div>
            )}
        </div>
      </DialogModal>

    </PageContent>
  );
}
