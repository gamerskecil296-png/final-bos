import React, { useState, useEffect } from 'react';

import { useBookingMutation, useCounselingJadwalQuery, useCounselingRiwayatQuery } from '@/queries/useCounselingQuery';
import { PageCard, PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DialogModal } from '@/components/ui/DialogModal';
import { CardGridSkeleton } from '@/components/ui/SkeletonGroups';
import EmptyState from '@/components/ui/EmptyState';
import { toast, Toaster } from 'react-hot-toast';
import { NavLink } from 'react-router-dom';
import { usePermission } from '@/hooks/usePermission';

const formatLongDate = (dateStr) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
};

const TIPE_CONFIG = {
  Akademik: { bg: 'bg-[var(--theme-primary-light)]', text: 'text-[var(--theme-primary)]', border: 'border-[var(--theme-primary-light)]', dot: 'bg-[var(--theme-primary)]', label: 'Akademik' },
  Karir: { bg: 'bg-[var(--theme-error-light)]', text: 'text-[var(--theme-error)]', border: 'border-[var(--theme-error-light)]', dot: 'bg-[var(--theme-error)]', label: 'Psikologi' },
  Personal: { bg: 'bg-[var(--theme-error-light)]', text: 'text-[var(--theme-error)]', border: 'border-[var(--theme-error-light)]', dot: 'bg-[var(--theme-error)]', label: 'Psikologi' },
  Psikologi: { bg: 'bg-[var(--theme-error-light)]', text: 'text-[var(--theme-error)]', border: 'border-[var(--theme-error-light)]', dot: 'bg-[var(--theme-error)]', label: 'Psikologi' },
};

export default function CounselingPage() {
  const { hasPermission } = usePermission();
  const canBookCounseling = hasPermission('student.counseling.create') || hasPermission('counseling.create') || hasPermission('counseling.manage');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [keluhan, setKeluhan] = useState('');
  const [mode, setMode] = useState('Tatap Muka');
  const [topik, setTopik] = useState('Psikologi');
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [filterTipe, setFilterTipe] = useState('Semua');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: jadwal, isLoading: isJadwalLoading } = useCounselingJadwalQuery();
  const { data: riwayat } = useCounselingRiwayatQuery();
  const bookingMutation = useBookingMutation();

  const totalSlot = jadwal?.length ?? 0;
  const totalRiwayat = riwayat?.length ?? 0;
  const totalMenunggu = riwayat?.filter(r => r.status === 'Menunggu').length ?? 0;
  const totalMedicalRecords = riwayat?.reduce((total, item) => total + Number(item.medical_record_count || 0), 0) ?? 0;

  useEffect(() => {
    if (selectedSlot) {
      const defaultTopic = selectedSlot.Tipe || selectedSlot.Spesialisasi || 'Psikologi';
      if (defaultTopic === 'Personal' || defaultTopic === 'Karir' || defaultTopic === 'Pribadi') {
        setTopik('Psikologi');
      } else if (['Akademik', 'Psikologi'].includes(defaultTopic)) {
        setTopik(defaultTopic);
      } else {
        setTopik('Psikologi');
      }
    }
  }, [selectedSlot]);

  const handleBooking = () => {
    console.log("handleBooking triggered:", { selectedSlot, privacyAgreed, keluhan, topik, mode });
    if (!privacyAgreed) return toast.error('Harap setujui pernyataan privasi');
    if (keluhan.length < 20) return toast.error('Ceritakan topik minimal 20 karakter');

    const payload = {
      psikolog_id: selectedSlot.PsikologID,
      slot_id: selectedSlot.SlotID || selectedSlot.ID,
      date: selectedSlot.Tanggal ? selectedSlot.Tanggal.slice(0, 10) : new Date().toISOString().slice(0, 10),
      start: selectedSlot.JamMulai,
      end: selectedSlot.JamSelesai,
      topic: topik,
      complaint: keluhan,
      mode: mode,
    };

    console.log("Sending booking payload:", payload);

    bookingMutation.mutate(payload, {
      onSuccess: () => {
        toast.success('Booking berhasil diajukan!');
        setSelectedSlot(null);
        setKeluhan('');
        setMode('Tatap Muka');
        setTopik('Psikologi');
        setPrivacyAgreed(false);
      },
      onError: (err) => {
        console.error("Booking mutation failed:", err);
        toast.error(err.response?.data?.message || 'Gagal melakukan booking');
      },
    });
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [filterTipe]);

  const filtered = jadwal?.filter(s => {
    if (filterTipe === 'Semua') return true;
    const mappedTipe = (s.Tipe === 'Personal' || s.Tipe === 'Karir' || s.Tipe === 'Psikologi') ? 'Psikologi' : 'Akademik';
    return mappedTipe === filterTipe;
  }) ?? [];

  const itemsPerPage = 5;
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const currentSlots = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />
      <div className="w-full">

        <DashboardHero
          title="Konseling & Wellness"
          subtitle="Sesi privat bersama psikolog profesional — rahasia, sukarela, dan aman untuk semua mahasiswa."
          breadcrumbs={[
            { label: 'Konseling & Wellness', path: '/app/student/counseling' }
          ]}
          badges={[
            { label: 'Layanan Aktif', active: true },
            { label: 'Privasi Terjamin', active: false }
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <PrimaryStatsCard
            title="Slot"
            value={totalSlot}
            badgeText="Tersedia"
            icon="calendar_month"
            colorTheme="primary"
          />
          <PrimaryStatsCard
            title="Total"
            value={totalRiwayat}
            badgeText="Sesi"
            icon="description"
            colorTheme="primary"
          />
          <PrimaryStatsCard
            title="Sesi"
            value={totalMenunggu}
            badgeText="Menunggu"
            icon="schedule"
            colorTheme="warning"
          />
          <PrimaryStatsCard
            title="Rekam"
            value={totalMedicalRecords}
            badgeText="Medis"
            icon="medical_information"
            colorTheme="success"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { title: 'Konseling Akademik', icon: 'menu_book', color: TIPE_CONFIG.Akademik, desc: 'Motivasi belajar, strategi studi, dan perencanaan akademik.' },
            { title: 'Konseling Karir', icon: 'work', color: TIPE_CONFIG.Karir, desc: 'Minat bakat, persiapan kerja, dan pengembangan potensi.' },
            { title: 'Konseling Personal', icon: 'favorite', color: TIPE_CONFIG.Personal, desc: 'Kesehatan mental, masalah pribadi, dan pengembangan diri.' },
          ].map(({ title, icon, color, desc }) => (
            <PageCard key={title} className="p-5 hover:shadow-md transition-all group cursor-default">
              <div className={`w-10 h-10 ${color.bg} ${color.border} border rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 group-hover:-rotate-6`}>
                <span className={`material-symbols-outlined text-[18px] ${color.text}`}>{icon}</span>
              </div>
              <h3 className="font-bold text-[15px] mb-1.5 font-headline">{title}</h3>
              <p className="text-[var(--theme-text-muted)] text-[13px] leading-relaxed">{desc}</p>
            </PageCard>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* LEFT — Jadwal */}
          <div className="lg:col-span-2 space-y-4">
            {/* Header + Filter dalam satu baris */}
            <div className="glass-card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 group hover:shadow-md transition-all duration-300">
              {/* Title */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="w-12 h-12 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)] group-hover:scale-110 transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">calendar_month</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Booking</span>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Jadwal Tersedia</h3>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--theme-success)]/10 border border-[var(--theme-success)]/20 text-[var(--theme-success)] text-[9px] font-black tracking-widest uppercase">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-success)] animate-pulse" />
                      LIVE
                    </span>
                  </div>
                </div>
              </div>

              {/* Filter pills — sejajar judul di desktop, full width di mobile */}
              <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                {['Semua', 'Akademik', 'Psikologi'].map((tipe) => (
                  <button
                    key={tipe}
                    onClick={() => setFilterTipe(tipe)}
                    className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider border transition-all whitespace-nowrap cursor-pointer ${filterTipe === tipe
                        ? 'bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] border-[var(--theme-primary)] shadow-sm'
                        : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-muted)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-bg)]'
                      }`}
                  >
                    {tipe}
                  </button>
                ))}
              </div>
            </div>

            {/* Slot List */}
            <div className="space-y-3">
              {isJadwalLoading ? (
                <CardGridSkeleton count={4} />
              ) : currentSlots.length > 0 ? (
                currentSlots.map((slot) => {
                  const slotTipeMapped = (slot.Tipe === 'Personal' || slot.Tipe === 'Karir') ? 'Psikologi' : slot.Tipe;
                  const tc = TIPE_CONFIG[slotTipeMapped] ?? TIPE_CONFIG.Akademik;
                  const isFull = slot.SisaKuota <= 0;
                  return (
                    <div
                      key={slot.ID}
                      className="glass-card p-6 hover:border-[var(--theme-primary)] hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[var(--theme-primary)]/5 to-transparent rounded-full -mr-10 -mt-10 opacity-50 pointer-events-none transition-transform group-hover:scale-150"></div>
                      <div className="min-w-0 flex-1 relative z-10">
                        {/* Badges */}
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${tc.bg} ${tc.text} border ${tc.border}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${tc.dot}`} />
                            {tc.label}
                          </span>
                          <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest uppercase border ${isFull ? 'bg-[var(--theme-error)]/10 text-[var(--theme-error)] border-[var(--theme-error)]/20' : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border-muted)]'}`}>
                            Kuota {slot.SisaKuota}/{slot.Kuota}
                          </span>
                        </div>

                        <h4 className="font-bold text-[16px] font-headline mb-1 text-[var(--theme-text)]">{slot.NamaKonselor}</h4>
                        {slot.Spesialisasi && (
                          <p className="text-[11px] font-bold tracking-wider text-[var(--theme-text-muted)] mb-4">{slot.Spesialisasi}</p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-[13px] font-medium text-[var(--theme-text-muted)]">
                          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--theme-primary)] opacity-70 shrink-0" style={{ fontSize: '16px' }} >calendar_month</span>{formatLongDate(slot.Tanggal)}</span>
                          <span className="flex items-center gap-2"><span className="material-symbols-outlined text-[var(--theme-primary)] opacity-70 shrink-0" style={{ fontSize: '16px' }} >schedule</span>{slot.JamMulai} – {slot.JamSelesai} WIB</span>
                          <span className="flex items-center gap-2 sm:col-span-2"><span className="material-symbols-outlined text-[var(--theme-primary)] opacity-70 shrink-0" style={{ fontSize: '16px' }} >location_on</span>{slot.Lokasi}</span>
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-3 shrink-0 relative z-10">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${isFull ? 'bg-[var(--theme-error)]/10 text-[var(--theme-error)] border-[var(--theme-error)]/20' : 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20'}`}>
                          {isFull ? 'Penuh' : 'Tersedia'}
                        </span>
                        {canBookCounseling && (
                          <button
                            onClick={() => !isFull && setSelectedSlot(slot)}
                            disabled={isFull}
                            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] hover:opacity-90 hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-[var(--theme-surface)] disabled:text-[var(--theme-text-muted)] disabled:border disabled:border-[var(--theme-border-muted)] disabled:shadow-none"
                          >
                            Ambil Antrean <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: '16px' }} >arrow_forward</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  icon="volunteer_activism"
                  iconColor="text-[var(--theme-primary)]"
                  iconBgClass="bg-[var(--theme-primary-light)]"
                  iconBorderClass="border-[var(--theme-primary-light)]"
                  title="Tidak Ada Jadwal"
                  description={filterTipe === 'Semua' ? 'Belum ada jadwal tersedia. Cek kembali beberapa saat lagi.' : `Jadwal untuk kategori ${filterTipe} sedang kosong.`}
                />
              )}

              {!isJadwalLoading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_left</span>
                  </button>
                  <span className="text-[11px] font-bold text-[var(--theme-text-muted)] px-3 tracking-widest uppercase">
                    Halaman {currentPage} dari {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[20px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — Riwayat Summary */}
          <div className="space-y-4 lg:sticky lg:top-6 h-fit">
            <div className="glass-card overflow-hidden">
              <div className="bg-[var(--theme-primary)] p-6 text-[var(--theme-text-on-primary)] relative border-b border-[var(--theme-primary)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex justify-center items-center text-white shrink-0">
                    <span className="material-symbols-outlined text-[24px]">history</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-80 block mb-0.5">Pantauan Sesi</span>
                    <h3 className="text-sm font-bold text-white leading-tight">Riwayat Konseling</h3>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-[var(--theme-surface)]">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 text-center">
                    <p className="text-2xl font-black font-headline text-[var(--theme-text)]">{totalRiwayat}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Total</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--theme-warning)]/20 bg-[var(--theme-warning)]/5 p-4 text-center">
                    <p className="text-2xl font-black font-headline text-[var(--theme-warning)]">{totalMenunggu}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--theme-warning)]">Menunggu</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--theme-success)]/20 bg-[var(--theme-success)]/5 p-4 text-center">
                    <p className="text-2xl font-black font-headline text-[var(--theme-success)]">{totalMedicalRecords}</p>
                    <p className="mt-1 text-[9px] font-black uppercase tracking-widest text-[var(--theme-success)]">Rekam</p>
                  </div>
                </div>

                <NavLink
                  to="/app/student/counseling/history"
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 py-3 text-[13px] font-bold text-white transition-all hover:bg-[var(--theme-primary-hover)] hover:shadow-md"
                >
                  Buka Riwayat Konseling
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </NavLink>

                <div className="mt-5 rounded-2xl border border-[var(--theme-primary-light)] bg-[var(--theme-primary-light)] p-4 flex items-start gap-3">
                  <span className="material-symbols-outlined mt-0.5 shrink-0 text-[var(--theme-primary)]" style={{ fontSize: '20px' }} >show_chart</span>
                  <p className="text-[12px] font-semibold leading-relaxed text-[var(--theme-primary)]">
                    Rekam medis hanya muncul setelah psikolog menyimpan catatan sesi pada halaman pasien.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── BOOKING MODAL ── */}
        <DialogModal
          open={!!selectedSlot}
          onOpenChange={(open) => !open && setSelectedSlot(null)}
          maxWidth="max-w-xl"
          title={selectedSlot?.NamaKonselor || 'Pilih Antrean'}
          subtitle="Daftar Antrean Konseling"
          description="Sesi dilindungi protokol kerahasiaan"
          icon="volunteer_activism"
          footer={
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setSelectedSlot(null)}
                className="flex-1 py-3 rounded-2xl border border-[var(--theme-border)] text-[var(--theme-text-muted)] text-[13px] font-black hover:bg-[var(--theme-bg)] transition-colors cursor-pointer bg-[var(--theme-surface)] uppercase tracking-wider"
              >
                Batal
              </button>
              <button
                onClick={handleBooking}
                disabled={bookingMutation.isPending}
                className="flex-1 py-3 rounded-xl bg-[var(--theme-primary)] text-white text-[13px] font-black hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-[var(--theme-primary)]/20 cursor-pointer border-none uppercase tracking-wider"
              >
                {bookingMutation.isPending ? 'Memproses...' : <><span className="material-symbols-outlined text-[18px]" >check_circle</span> Konfirmasi</>}
              </button>
            </div>
          }
        >
          <div className="space-y-5 p-2">
            {/* Slot Summary */}
            {selectedSlot && (
              <div className="bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-2xl p-4 flex items-center justify-between gap-4">
                <div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${(TIPE_CONFIG[selectedSlot.Tipe === 'Personal' || selectedSlot.Tipe === 'Karir' ? 'Psikologi' : selectedSlot.Tipe] ?? TIPE_CONFIG.Akademik).text}`}>
                    {selectedSlot.Tipe === 'Personal' || selectedSlot.Tipe === 'Karir' ? 'Psikologi' : selectedSlot.Tipe}
                  </span>
                  <p className="text-[14px] font-bold text-[var(--theme-text)] mt-0.5">
                    {selectedSlot.JamMulai} – {selectedSlot.JamSelesai} WIB
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--theme-text-muted)] font-medium tracking-widest uppercase">Tanggal</p>
                  <p className="text-[14px] font-bold text-[var(--theme-text)]">{new Date(selectedSlot.Tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <div className="space-y-6">
              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-3">
                  Metode Konseling <span className="text-[var(--theme-error)]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[
                    { value: 'Tatap Muka', label: 'Tatap Muka (Offline)', desc: 'Konseling langsung di ruang BK', icon: 'groups' },
                    { value: 'Online', label: 'Online (Zoom)', desc: 'Konseling daring via video call', icon: 'videocam' }
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setMode(opt.value)}
                      className={`flex items-start gap-3 p-4 rounded-2xl border text-left transition-all cursor-pointer ${mode === opt.value
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] ring-2 ring-[var(--theme-primary)]/10 shadow-sm'
                          : 'border-[var(--theme-border-muted)] hover:border-[var(--theme-border)] bg-[var(--theme-surface)]'
                        }`}
                    >
                      <span className={`material-symbols-outlined text-[20px] mt-0.5 shrink-0 transition-colors ${mode === opt.value ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text-muted)]'}`}>
                        {opt.icon}
                      </span>
                      <div>
                        <p className={`text-[13px] font-bold transition-colors ${mode === opt.value ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>
                          {opt.label}
                        </p>
                        <p className="text-[11px] text-[var(--theme-text-muted)] mt-0.5 leading-snug">
                          {opt.desc}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-3">
                  Kategori Masalah / Topik <span className="text-[var(--theme-error)]">*</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {['Akademik', 'Psikologi'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setTopik(cat)}
                      className={`px-4 py-2.5 rounded-xl border text-[13px] font-bold transition-all cursor-pointer ${topik === cat
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] ring-2 ring-[var(--theme-primary)]/10 shadow-sm'
                          : 'border-[var(--theme-border-muted)] hover:border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-3">
                  Topik Pembahasan <span className="text-[var(--theme-error)]">*</span>
                </label>
                <textarea
                  value={keluhan}
                  onChange={(e) => setKeluhan(e.target.value)}
                  rows={4}
                  className="w-full bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-2xl px-4 py-3 text-[14px] focus:outline-none focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all resize-none placeholder:text-[var(--theme-text-subtle)] font-medium text-[var(--theme-text)]"
                  placeholder="Contoh: Saya merasa kesulitan mengatur waktu belajar dan merasa cemas menjelang ujian..."
                />
                <p className="text-[11px] text-[var(--theme-text-muted)] font-bold mt-2">
                  {keluhan.length}/20 karakter minimum
                </p>
              </div>

              <label className="flex gap-3 p-4 bg-[var(--theme-primary-light)] border border-[var(--theme-primary-light)] rounded-2xl cursor-pointer hover:bg-[var(--theme-primary-light)] transition-colors">
                <input
                  type="checkbox"
                  checked={privacyAgreed}
                  onChange={(e) => setPrivacyAgreed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-[var(--theme-primary-light)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] shrink-0 cursor-pointer"
                />
                <span className="text-[12px] font-semibold text-[var(--theme-primary)] leading-relaxed">
                  Saya memahami bahwa sesi ini bersifat rahasia, sukarela, dan data saya hanya dapat diakses oleh konselor terkait.
                </span>
              </label>
            </div>
          </div>
        </DialogModal>

      </div>
    </PageContent>
  );
}
