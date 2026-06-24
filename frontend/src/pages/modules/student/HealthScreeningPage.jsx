import React, { useState, useMemo, useEffect } from 'react';
import { usePermission } from '@/hooks/usePermission';
import { DialogModal } from '@/components/ui/DialogModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';

import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  useHealthRingkasanQuery,
  useHealthRiwayatQuery,
  useHealthDetailQuery,
  useHealthMandiriMutation,
  useHealthTipsQuery,
  useHealthRujukanQuery,
} from '@/queries/useHealthQuery';
import { healthBookingService, insuranceService, fetchBlobWithAuth } from '@/services/api';
import { Skeleton } from '@/components/ui/Skeleton';
import toast from 'react-hot-toast';
import { NavLink } from 'react-router-dom';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import HealthCharacter from '@/components/health/HealthCharacter';
import {
  normalizeRecord,
  calculateHealthScore,
  calculateStreak,
  getInterpretationDelta
} from '@/utils/healthAnalytics';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Scale = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>scale</span>;
const Droplets = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>water_drop</span>;
const Thermometer = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>thermometer</span>;
const Bookmark = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>bookmark</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Info = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>info</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const ChevronRight = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>chevron_right</span>;
const Stethoscope = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>medical_services</span>;
const Heart = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>favorite</span>;
const User = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person</span>;



// ── Helpers ──────────────────────────────────────────────────────────────────
const getBMICategory = (bmi) => {
  if (!bmi || isNaN(bmi)) return { label: 'Unknown', color: 'text-[var(--theme-text-muted)]', bg: 'bg-[var(--theme-bg)]', border: 'border-border', dot: 'bg-[var(--theme-text-muted)]', bar: 'bg-[var(--theme-text-muted)]' };
  const v = parseFloat(bmi);
  if (v < 18.5) return { label: 'Kekurangan BB', color: 'text-[var(--theme-primary)]', bg: 'bg-[var(--theme-primary-light)]', border: 'border-[var(--theme-primary-light)]', dot: 'bg-[var(--theme-primary)]', bar: 'bg-[var(--theme-primary)]' };
  if (v < 25) return { label: 'Normal', color: 'text-[var(--theme-success)]', bg: 'bg-[var(--theme-success-light)]', border: 'border-[var(--theme-success-light)]', dot: 'bg-[var(--theme-success)]', bar: 'bg-[var(--theme-success)]' };
  if (v < 30) return { label: 'Kelebihan BB', color: 'text-[var(--theme-warning)]', bg: 'bg-[var(--theme-warning-light)]', border: 'border-[var(--theme-warning-light)]', dot: 'bg-[var(--theme-warning)]', bar: 'bg-[var(--theme-warning)]' };
  return { label: 'Obesitas', color: 'text-[var(--theme-error)]', bg: 'bg-[var(--theme-error-light)]', border: 'border-[var(--theme-error-light)]', dot: 'bg-[var(--theme-error)]', bar: 'bg-[var(--theme-error)]' };
};

const getBPStatus = (s, d) => {
  const sv = parseInt(s), dv = parseInt(d);
  if (!sv || !dv || isNaN(sv) || isNaN(dv)) return { label: 'Belum Ada Data', color: 'text-[var(--theme-text-muted)]', bg: 'bg-[var(--theme-bg)]', bar: 'bg-[var(--theme-text-muted)]' };
  if (sv >= 140 || dv >= 90) return { label: 'Hipertensi', color: 'text-[var(--theme-error)]', bg: 'bg-[var(--theme-error-light)]', bar: 'bg-[var(--theme-error)]' };
  if (sv >= 120 || dv >= 80) return { label: 'Pre-Hipertensi', color: 'text-[var(--theme-warning)]', bg: 'bg-[var(--theme-warning-light)]', bar: 'bg-[var(--theme-warning)]' };
  return { label: 'Normal', color: 'text-[var(--theme-success)]', bg: 'bg-[var(--theme-success-light)]', bar: 'bg-[var(--theme-success)]' };
};

// Returns display label + description + color theme based on overall health status
const getStatusInfo = (status, bmi, sistolik, diastolik) => {
  const sv = parseInt(sistolik);
  const dv = parseInt(diastolik);
  const vBmi = parseFloat(bmi);

  // Hipertensi is most critical
  if (sv >= 140 || dv >= 90) {
    return {
      label: 'Hipertensi',
      desc: 'Tekanan darah kamu tinggi. Segera konsultasikan ke dokter atau klinik kampus.',
      text: 'text-[var(--theme-error)]',
      iconBg: 'bg-[var(--theme-error)] shadow-[var(--theme-error)]/20',
    };
  }

  // Check string status from backend
  if (status) {
    const s = status.toLowerCase();
    if (s === 'sehat' || s === 'baik') {
      return {
        label: 'Sehat',
        desc: 'Indikator tubuh kamu prima! Pertahankan pola hidup sehat dan olahraga rutin.',
        text: 'text-[var(--theme-success)]',
        iconBg: 'bg-[var(--theme-success)] shadow-[var(--theme-success)]/20',
      };
    }
    if (s.includes('bahaya') || s.includes('kritis') || s.includes('darurat')) {
      return {
        label: 'Memerlukan Tindakan',
        desc: 'Kondisi kesehatanmu memerlukan perhatian segera. Hubungi klinik kampus sekarang.',
        text: 'text-[var(--theme-error)]',
        iconBg: 'bg-[var(--theme-error)] shadow-[var(--theme-error)]/20',
      };
    }
    if (s.includes('tindak') || s.includes('lanjut')) {
      return {
        label: 'Perlu Tindak Lanjut',
        desc: 'Ada indikator yang perlu ditindaklanjuti. Jadwalkan konsultasi dengan tenaga medis.',
        text: 'text-[var(--theme-error)]',
        iconBg: 'bg-[var(--theme-error)] shadow-[var(--theme-error)]/20',
      };
    }
    if (s.includes('pantauan') || s.includes('observasi') || s.includes('waspada')) {
      return {
        label: 'Dalam Pantauan',
        desc: 'Beberapa indikator perlu diperhatikan. Jangan ragu konsultasi ke klinik kampus.',
        text: 'text-[var(--theme-warning)]',
        iconBg: 'bg-[var(--theme-warning)] shadow-[var(--theme-warning)]/20',
      };
    }
  }

  // BMI-based fallback
  if (!isNaN(vBmi)) {
    if (vBmi >= 30) return { label: 'Obesitas', desc: 'Indeks massa tubuh kamu perlu perhatian serius. Konsultasikan program diet sehat.', text: 'text-[var(--theme-error)]', iconBg: 'bg-[var(--theme-error)] shadow-[var(--theme-error)]/20' };
    if (vBmi >= 25) return { label: 'Kelebihan Berat Badan', desc: 'Berat badanmu melebihi ideal. Coba terapkan pola makan sehat dan olahraga teratur.', text: 'text-[var(--theme-warning)]', iconBg: 'bg-[var(--theme-warning)] shadow-[var(--theme-warning)]/20' };
    if (vBmi < 18.5) return { label: 'Kekurangan Berat Badan', desc: 'Berat badanmu kurang dari ideal. Tingkatkan asupan nutrisi dan konsumsi makanan bergizi.', text: 'text-[var(--theme-primary)]', iconBg: 'bg-[var(--theme-primary)] shadow-[var(--theme-primary)]/20' };
  }

  // Pre-hypertension
  if ((sv >= 120 && sv < 140) || (dv >= 80 && dv < 90)) {
    return {
      label: 'Pre-Hipertensi',
      desc: 'Tekanan darahmu sedikit di atas normal. Kurangi stres, konsumsi garam, dan rutin olahraga.',
      text: 'text-[var(--theme-warning)]',
      iconBg: 'bg-[var(--theme-warning)] shadow-[var(--theme-warning)]/20',
    };
  }

  // Default healthy
  return {
    label: 'Sehat',
    desc: 'Semua indikator kesehatanmu dalam batas normal. Pertahankan gaya hidup sehat!',
    text: 'text-[var(--theme-success)]',
    iconBg: 'bg-[var(--theme-success)] shadow-[var(--theme-success)]/20',
  };
};

const fmt = (dateStr, opts) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', opts).format(d);
};
// ─────────────────────────────────────────────────────────────────────────────

export default function HealthScreeningPage() {
  const { hasPermission } = usePermission();
  const canManageHealth = hasPermission('student.health.bookings.create') || hasPermission('health.create') || hasPermission('health.update') || hasPermission('health.manage');
  const [isInputOpen, setIsInputOpen] = useState(false);
  const [selectedDetailId, setSelectedDetailId] = useState(null);
  const [filterSumber, setFilterSumber] = useState('Semua');
  const [successModalData, setSuccessModalData] = useState(null);
  const [activeChartTab, setActiveChartTab] = useState('berat');

  // Booking states
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [availableSchedules, setAvailableSchedules] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [bookingKeluhan, setBookingKeluhan] = useState('');
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [isRescheduleMode, setIsRescheduleMode] = useState(false);
  const [rescheduleBookingTarget, setRescheduleBookingTarget] = useState(null);
  const [claims, setClaims] = useState([]);

  // Fetch claims data
  const fetchClaims = async () => {
    try {
      const res = await insuranceService.getMyClaims();
      if (res.status === 'success') {
        setClaims(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching claims:', err);
    }
  };

  // Fetch booking data
  const fetchBookingData = async () => {
    setLoadingSchedules(true);
    try {
      const [schedulesRes, bookingsRes] = await Promise.all([
        healthBookingService.getAvailableSchedules(),
        healthBookingService.getMyBookings(),
      ]);
      if (schedulesRes.success) {
        setAvailableSchedules(schedulesRes.data || []);
      }
      if (bookingsRes.success) {
        setMyBookings(bookingsRes.data || []);
      }
    } catch (err) {
      console.error('Error fetching booking data:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    fetchBookingData();
  }, []);

  // Create / Reschedule booking
  const handleCreateBooking = async () => {
    if (!selectedSchedule) {
      toast.error('Pilih jadwal terlebih dahulu');
      return;
    }

    if (!isRescheduleMode && !bookingKeluhan.trim()) {
      toast.error('Silakan isi keluhan Anda');
      return;
    }

    setSubmittingBooking(true);
    try {
      if (isRescheduleMode && rescheduleBookingTarget) {
        // Reschedule
        const res = await healthBookingService.rescheduleBooking(rescheduleBookingTarget.id, selectedSchedule.id);
        if (res.success) {
          toast.success(res.message || 'Jadwal berhasil diubah');
          setIsBookingModalOpen(false);
          setIsRescheduleMode(false);
          setRescheduleBookingTarget(null);
          setSelectedSchedule(null);
          fetchBookingData();
        } else {
          toast.error(res.message || 'Gagal mengubah jadwal');
        }
      } else {
        // Create new
        const res = await healthBookingService.createBooking({
          jadwal_id: selectedSchedule.id,
          keluhan: bookingKeluhan,
        });
        if (res.success) {
          toast.success('Booking berhasil dibuat');
          setIsBookingModalOpen(false);
          setSelectedSchedule(null);
          setBookingKeluhan('');
          fetchBookingData();
        } else {
          toast.error(res.message || 'Gagal membuat booking');
        }
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setSubmittingBooking(false);
    }
  };

  const openRescheduleModal = (booking) => {
    setIsRescheduleMode(true);
    setRescheduleBookingTarget(booking);
    setSelectedSchedule(null);
    setBookingKeluhan('');
    setIsBookingModalOpen(true);
  };

  // Cancel booking
  const handleCancelBooking = async (bookingId) => {
    if (!confirm('Yakin ingin membatalkan booking ini?')) return;

    try {
      const res = await healthBookingService.cancelBooking(bookingId);
      if (res.success) {
        toast.success('Booking berhasil dibatalkan');
        fetchBookingData();
      }
    } catch (err) {
      toast.error(err.message || 'Gagal membatalkan booking');
    }
  };

  const { data: terbaru, isLoading: isTerbaruLoading } = useHealthRingkasanQuery();
  const { data: riwayat, isLoading: isRiwayatLoading } = useHealthRiwayatQuery({ sumber: filterSumber });
  const { data: detailRecord, isLoading: isDetailLoading } = useHealthDetailQuery(selectedDetailId);
  const { data: tips } = useHealthTipsQuery(terbaru?.bmi);
  const { data: rujukans, isLoading: isRujukanLoading } = useHealthRujukanQuery();
  const mandiriMutation = useHealthMandiriMutation();

  const chartData = useMemo(() => {
    if (!riwayat) return [];
    return [...riwayat]
      .sort((a, b) => new Date(a.tanggal_periksa) - new Date(b.tanggal_periksa))
      .slice(-6)
      .map(item => ({
        name: fmt(item.tanggal_periksa, { day: 'numeric', month: 'short' }),
        berat: item.berat_badan,
        bmi: item.bmi,
        skor: calculateHealthScore(item),
      }));
  }, [riwayat]);

  const bmiCat = getBMICategory(terbaru?.bmi);
  const bpStat = getBPStatus(terbaru?.sistolik, terbaru?.diastolik);
  const statusInfo = getStatusInfo(terbaru?.status_kesehatan, terbaru?.bmi, terbaru?.sistolik, terbaru?.diastolik);

  const lifestyleData = useMemo(() => {
    if (!terbaru?.keluhan) return null;
    try {
      if (terbaru.keluhan.startsWith('{') && terbaru.keluhan.endsWith('}')) {
        return JSON.parse(terbaru.keluhan);
      }
    } catch (_) { }
    return null;
  }, [terbaru]);

  const jamTidur = lifestyleData?.jam_tidur ?? 8;
  const olahraga = lifestyleData?.olahraga ?? 2;
  const air = lifestyleData?.konsumsi_air ?? 2.0;
  const stres = lifestyleData?.tingkat_stres ?? 5;

  const handleInputSubmit = (formData) => {
    mandiriMutation.mutate(formData, {
      onSuccess: (res) => {
        toast.success('Data kesehatan berhasil diperbarui!');
        setIsInputOpen(false);
        const prev = riwayat && riwayat.length > 0 ? normalizeRecord(riwayat[0]) : null;
        const newRecord = normalizeRecord(res?.data || res || formData);
        setSuccessModalData({ current: newRecord, previous: prev });
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Gagal menyimpan data.'),
    });
  };

  // Fetch initial data on mount
  useEffect(() => {
    fetchBookingData();
    fetchClaims();
  }, []);

  const hasActiveInsuranceClaim = claims.some(c => c.status === 'PENDING_VERIFICATION' || c.status === 'APPROVED_TK');

  return (
    <PageContent className="font-body">
      <DashboardHero
        title="Pusat Kesehatan BKU"
        subtitle="Pantau tren kesehatan & rekam medis digital kamu"
        breadcrumbs={[
          { label: 'Health Screening', path: '/app/student/health' }
        ]}
        actions={
          <div className="flex items-center gap-2">
            {canManageHealth && (
              <>
                <button
                  onClick={() => setIsBookingModalOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] font-semibold rounded-xl hover:opacity-90 transition-all text-sm shadow-md shadow-[var(--theme-primary)]/20"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={2.5}>calendar_month</span> Ambil Antrean
                </button>
                <button
                  onClick={() => setIsInputOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] font-semibold rounded-xl hover:opacity-90 transition-all text-sm shadow-md shadow-[var(--theme-primary)]/20"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={2.5}>add</span> Input Data Mandiri
                </button>
              </>
            )}
          </div>
        }
      />

      {/* ── HERO: Latest Stats ── */}
      {isTerbaruLoading ? (
        <Skeleton className="h-56 rounded-2xl mb-6" />
      ) : terbaru ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">

          {/* Main Stats */}
          <div className="lg:col-span-8 glass-card overflow-hidden">
            <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-md ${statusInfo.iconBg}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '24px' }} >monitor_heart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Kondisi</span>
                  <h3 className="text-sm font-bold text-[var(--theme-text)] tracking-tight">Kesehatan Terakhir</h3>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--theme-success)]/10 border border-[var(--theme-success)]/20 text-[var(--theme-success)] shadow-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }} >security</span>
                <span className="text-[10px] font-bold uppercase tracking-wider">Tervalidasi BKU</span>
              </div>
            </div>

            <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 bg-[var(--theme-surface)]">
              <StatItem label="Tinggi" value={terbaru.tinggi_badan} unit="cm" icon={<span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }} >straighten</span>} colorClass="text-[var(--theme-primary)]" bgClass="bg-[var(--theme-primary-light)]" />
              <StatItem label="Berat" value={terbaru.berat_badan} unit="kg" icon={<Scale size={16} />} colorClass="text-[var(--theme-success)]" bgClass="bg-[var(--theme-success-light)]" />
              <StatItem label="Tidur" value={jamTidur} unit="Jam" icon={<span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }} >bedtime</span>} colorClass="text-[var(--theme-info)]" bgClass="bg-[var(--theme-info-light)]" />
              <StatItem label="Olahraga" value={olahraga} unit="x/Mgg" icon={<span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }} >fitness_center</span>} colorClass="text-[var(--theme-warning)]" bgClass="bg-[var(--theme-warning-light)]" />
              <StatItem label="Air Minum" value={air} unit="L/Hari" icon={<Droplets size={16} />} colorClass="text-[var(--theme-primary)]" bgClass="bg-[var(--theme-primary-light)]" />
              <StatItem label="Stres" value={stres} unit="/10" icon={<span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }} >psychology</span>} colorClass="text-[var(--theme-error)]" bgClass="bg-[var(--theme-error-light)]" />
            </div>

            <div className="p-6 bg-[var(--theme-surface)] border-t border-[var(--theme-border-muted)] flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
              <div className="flex items-center gap-5 relative z-10 w-full">
                <HealthCharacter
                  bmi={terbaru.bmi}
                  sistolik={terbaru.sistolik}
                  diastolik={terbaru.diastolik}
                  statusKesehatan={terbaru.status_kesehatan}
                  className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 transition-transform hover:scale-105"
                />
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1.5">Status Umum</p>
                  <p className={`text-xl sm:text-2xl font-black capitalize tracking-tight ${statusInfo.text}`}>
                    {statusInfo.label}
                  </p>
                  <p className={`text-xs font-medium mt-1 max-w-[280px] leading-relaxed hidden sm:block text-[var(--theme-text-muted)]`}>
                    {statusInfo.desc}
                  </p>
                </div>

                {/* Circular Health Score gauge right inside status block */}
                {(() => {
                  const score = calculateHealthScore(terbaru);
                  const ringColor = score >= 85 ? "var(--theme-success)" : score >= 70 ? "var(--theme-warning)" : "var(--theme-error)";
                  const scoreLabel = score >= 85 ? "Sangat Sehat 👍" : score >= 70 ? "Cukup Sehat 👍" : "Perlu Atensi ⚠️";
                  return (
                    <div className="flex items-center gap-3 bg-[var(--theme-bg)] px-4 py-2.5 rounded-2xl border border-border shrink-0">
                      <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                        <svg className="w-full h-full transform -rotate-90">
                          <circle cx="24" cy="24" r="20" stroke="var(--theme-border)" strokeWidth="3.5" fill="transparent" />
                          <circle
                            cx="24"
                            cy="24"
                            r="20"
                            stroke={ringColor}
                            strokeWidth="3.5"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 20}
                            strokeDashoffset={2 * Math.PI * 20 * (1 - score / 100)}
                            strokeLinecap="round"
                          />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-[13px] font-black text-[var(--theme-text)]">{score}</span>
                          <span className="text-[6px] text-[var(--theme-text-muted)] font-bold uppercase tracking-wider leading-none">Skor</span>
                        </div>
                      </div>
                      <div className="hidden xs:block">
                        <p className="text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Wellness Score</p>
                        <p className="text-[11px] font-bold text-[var(--theme-text)] mt-0.5">{scoreLabel}</p>
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div className="flex flex-col sm:items-end gap-2 w-full sm:w-auto relative z-10 shrink-0">
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full">
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Tensi Darah</span>
                  <span className={`text-[11px] font-black uppercase px-2.5 py-1 rounded-lg ${bpStat.bg} ${bpStat.color} shadow-sm border border-black/5`}>
                    {bpStat.label}
                  </span>
                </div>
                <div className="flex gap-1 w-full sm:w-32 mt-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`h-1.5 flex-1 rounded-full ${i === 0 ? bpStat.bar : 'bg-[var(--theme-bg)]'}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BMI Card */}
          <div className={`lg:col-span-4 glass-card p-6 flex flex-col justify-between relative overflow-hidden ${bmiCat.bg} ${bmiCat.border}`}>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Indeks Massa Tubuh</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-surface/60 border border-white ${bmiCat.color}`}>IMT</span>
              </div>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-5xl font-black tracking-tight text-[var(--theme-text)]">{terbaru.bmi}</span>
                <span className="text-sm font-semibold text-[var(--theme-text-muted)]">BMI</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${bmiCat.color}`}>
                {bmiCat.label} <span className="material-symbols-outlined" style={{ fontSize: '14px' }} >arrow_forward</span>
              </span>
            </div>

            {/* BMI Bar */}
            <div className="relative z-10 mt-5">
              <div className="flex justify-between mb-1.5 text-[9px] font-semibold text-[var(--theme-text-muted)]">
                <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40+</span>
              </div>
              <div className="w-full h-2.5 bg-surface/50 border border-border/40 rounded-full overflow-hidden flex relative">
                <div className="h-full bg-[var(--theme-primary)]/70" style={{ width: '18.5%' }} />
                <div className="h-full bg-[var(--theme-success)]/70" style={{ width: '25%' }} />
                <div className="h-full bg-[var(--theme-warning)]/70" style={{ width: '20%' }} />
                <div className="h-full bg-[var(--theme-error)]/70" style={{ width: '36.5%' }} />
                <motion.div
                  initial={{ left: 0 }}
                  animate={{ left: `${Math.min(Math.max((terbaru.bmi / 40) * 100, 3), 95)}%` }}
                  transition={{ type: 'spring', stiffness: 60, damping: 12 }}
                  className="absolute top-[-3px] bottom-[-3px] w-1.5 bg-[var(--theme-text)] ring-2 ring-surface rounded-full shadow"
                />
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-3.5 bg-surface/70 backdrop-blur-sm rounded-xl border border-border/80 relative z-10">
              <div className="flex items-center gap-2 mb-1 text-[var(--theme-text-muted)]">
                <Info size={12} />
                <span className="text-[9px] font-bold uppercase tracking-wider">Tips IMT</span>
              </div>
              <p className="text-xs font-medium text-[var(--theme-text-muted)] leading-relaxed italic">
                "{tips || 'Jaga pola makan seimbang dan tetap aktif bergerak.'}"
              </p>
            </div>
          </div>
        </div>
      ) : (
        <EmptyHealthState onOpen={() => setIsInputOpen(true)} />
      )}

      {/* ── Antrian Saya ── */}
      {myBookings && myBookings.length > 0 && (
        <div className="glass-card overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--theme-success-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-success)]">
                <span className="material-symbols-outlined text-[24px]">event_note</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Booking</span>
                <h2 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Antrian Saya</h2>
              </div>
            </div>
            <button
              onClick={() => {
                setIsRescheduleMode(false);
                setRescheduleBookingTarget(null);
                setSelectedSchedule(null);
                setBookingKeluhan('');
                setIsBookingModalOpen(true);
              }}
              className="text-[10px] font-bold text-white bg-[var(--theme-primary)] hover:opacity-90 px-3 py-1.5 rounded-lg transition-opacity flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px]">add</span>
              Sesi Baru
            </button>
          </div>
          <div className="divide-y divide-[var(--theme-border-muted)]">
            {myBookings.slice(0, 3).map((booking) => {
              const statusColors = {
                'Menunggu Konfirmasi': 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20',
                'Dikonfirmasi': 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20',
                'Selesai': 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20',
                'Ditolak': 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20',
                'Dibatalkan': 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]',
              };
              const statusColor = statusColors[booking.status] || 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]';

              return (
                <div key={booking.id} className="px-5 py-4 flex items-center justify-between hover:bg-[var(--theme-bg)] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: '18px' }}>medical_services</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--theme-text)]">
                        {booking.jadwal?.tenaga_kes?.nama || 'Tenaga Kesehatan'}
                      </p>
                      <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
                        {booking.jadwal?.tanggal ? new Date(booking.jadwal.tanggal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' }) : '-'}
                        {' • '}
                        {booking.jadwal?.jam_mulai || ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${statusColor}`}>
                        {booking.status}
                      </span>
                      {(booking.status === 'Menunggu Konfirmasi' || booking.status === 'Dikonfirmasi') && (
                        <button
                          onClick={() => handleCancelBooking(booking.id)}
                          className="text-[10px] font-bold text-[var(--theme-error)] hover:underline"
                        >
                          Batal
                        </button>
                      )}
                    </div>
                    {booking.status === 'Perlu Kontrol' && (
                      <button
                        onClick={() => openRescheduleModal(booking)}
                        className="text-[10px] font-bold text-[var(--theme-warning)] hover:underline flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                        Jadwal Ulang Kontrol
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Analytics & Vitals ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">

        {/* Weight Trend */}
        <div className="lg:col-span-2 glass-card p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4 border-b border-[var(--theme-border-muted)] pb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[var(--theme-primary-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
                <span className="material-symbols-outlined text-[24px]">timeline</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Grafik</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Tren Kesehatan</h3>
              </div>
            </div>
            <div className="flex bg-[var(--theme-surface)] p-1 rounded-xl gap-1 shrink-0 border border-[var(--theme-border-muted)]">
              {[
                { id: 'berat', label: 'Berat' },
                { id: 'bmi', label: 'IMT/BMI' },
                { id: 'skor', label: 'Wellness Score' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChartTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeChartTab === tab.id
                    ? 'bg-surface text-[var(--theme-primary)] shadow-sm'
                    : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="w-full" style={{ minHeight: '200px' }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={200} debounce={50}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="dynamicColor" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor={activeChartTab === 'skor' ? 'var(--theme-warning)' : activeChartTab === 'bmi' ? 'var(--theme-success)' : 'var(--theme-primary)'}
                        stopOpacity={0.15}
                      />
                      <stop
                        offset="95%"
                        stopColor={activeChartTab === 'skor' ? 'var(--theme-warning)' : activeChartTab === 'bmi' ? 'var(--theme-success)' : 'var(--theme-primary)'}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--theme-border)" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 600, fill: 'var(--theme-text-subtle)' }} dy={10} />
                  <YAxis hide domain={activeChartTab === 'skor' ? [0, 100] : activeChartTab === 'bmi' ? [10, 40] : ['dataMin - 3', 'dataMax + 3']} />
                  <Tooltip
                    cursor={{
                      stroke: activeChartTab === 'skor' ? 'var(--theme-warning)' : activeChartTab === 'bmi' ? 'var(--theme-success)' : 'var(--theme-primary)',
                      strokeWidth: 1,
                      strokeDasharray: '4 4'
                    }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px', fontWeight: 700, padding: '8px 14px' }}
                    itemStyle={{ color: activeChartTab === 'skor' ? 'var(--theme-warning)' : activeChartTab === 'bmi' ? 'var(--theme-success)' : 'var(--theme-primary)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey={activeChartTab}
                    stroke={activeChartTab === 'skor' ? 'var(--theme-warning)' : activeChartTab === 'bmi' ? 'var(--theme-success)' : 'var(--theme-primary)'}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#dynamicColor)"
                    animationDuration={1000}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-[var(--theme-text-muted)] text-sm">
                Belum cukup data untuk grafik tren.
              </div>
            )}
          </div>
        </div>

        {/* BP Reference */}
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary)]/10 flex items-center justify-center border border-[var(--theme-primary)]/20">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }} >show_chart</span>
              </div>
              <h3 className="text-sm font-bold tracking-wide text-[var(--theme-text)]">Tensi Referensi</h3>
            </div>
            <div className="space-y-4">
              <BPReference label="Normal" range="< 120 / 80" color="bg-[var(--theme-success)]" text="text-[var(--theme-text)]" />
              <BPReference label="Pre-Hipertensi" range="120–139 / 80–89" color="bg-[var(--theme-warning)]" text="text-[var(--theme-text)]" />
              <BPReference label="Hipertensi" range="≥ 140 / 90" color="bg-[var(--theme-error)]" text="text-[var(--theme-text)]" />
            </div>
          </div>
          <div className="mt-5 p-3.5 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border-muted)] flex gap-3 relative z-10">
            <Thermometer size={14} className="text-[var(--theme-primary)] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[var(--theme-text-muted)] font-semibold leading-relaxed">
              Istirahat 5 menit sebelum mengecek tensi mandiri untuk hasil yang akurat.
            </p>
          </div>
          <Heart size={200} className="absolute right-[-70px] top-[-70px] text-[var(--theme-primary)] opacity-[0.03] pointer-events-none" />
        </div>
      </div>

      {/* ── History Table ── */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--theme-primary-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
              <span className="material-symbols-outlined text-[24px]">receipt_long</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Rincian</span>
              <h2 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Riwayat Medis</h2>
            </div>
          </div>
          {/* Filter tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {['Semua', 'mandiri', 'kencana_screening', 'klinik_kampus'].map(s => (
              <button
                key={s}
                onClick={() => setFilterSumber(s)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-all whitespace-nowrap ${filterSumber === s
                  ? 'bg-[var(--theme-primary)] text-white shadow-sm'
                  : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border border-border hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'
                  }`}
              >
                {s === 'Semua' ? 'Semua' : s.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {['Tanggal', 'TB / BB / Tensi', 'BMI', 'Status', 'Sumber', ''].map((h, i) => (
                  <th key={i} className={`px-5 py-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ${i >= 2 ? 'text-center' : ''} ${i === 5 ? 'text-right' : ''}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isRiwayatLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i}><td colSpan="6" className="px-5 py-4"><Skeleton className="h-12 w-full rounded-xl" /></td></tr>
                ))
              ) : riwayat?.length > 0 ? (
                riwayat.map((rec) => {
                  const rb = getBMICategory(rec.bmi);
                  return (
                    <tr key={rec.id} className="group hover:bg-[var(--theme-bg)] transition-colors">
                      {/* Tanggal */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-surface border border-border shadow-sm flex flex-col items-center justify-center group-hover:border-[var(--theme-primary)]/30 transition-colors shrink-0">
                            <span className="text-xs font-black text-[var(--theme-text)] leading-none">{new Date(rec.tanggal_periksa).getDate()}</span>
                            <span className="text-[8px] font-bold text-[var(--theme-text-muted)] uppercase">{fmt(rec.tanggal_periksa, { month: 'short' })}</span>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-[var(--theme-text)]">{new Date(rec.tanggal_periksa).getFullYear()}</p>
                            <p className="text-[10px] text-[var(--theme-text-muted)]">Berkala</p>
                          </div>
                        </div>
                      </td>
                      {/* Vitals */}
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-[var(--theme-text)]">
                          {rec.tinggi_badan} <span className="text-[var(--theme-text-muted)] font-normal">/</span> {rec.berat_badan} <span className="text-[var(--theme-text-muted)] font-normal">/</span> {rec.sistolik}/{rec.diastolik}
                        </p>
                        <div className="flex gap-1.5 mt-1">
                          {['cm', 'kg', 'mmHg'].map(u => (
                            <span key={u} className="text-[8px] font-bold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] border border-border px-1.5 py-0.5 rounded">{u}</span>
                          ))}
                        </div>
                      </td>
                      {/* BMI */}
                      <td className="px-5 py-4 text-center">
                        <p className="text-sm font-black text-[var(--theme-text)]">{rec.bmi}</p>
                        <p className={`text-[10px] font-bold uppercase ${rb.color}`}>{rb.label}</p>
                      </td>
                      {/* Status */}
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${rec.status_kesehatan === 'sehat' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)]' : 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]'
                          }`}>
                          {rec.status_kesehatan.replace('_', ' ')}
                        </span>
                      </td>
                      {/* Sumber */}
                      <td className="px-5 py-4 text-center">
                        <div className="flex flex-col items-center gap-1.5">
                          {(() => {
                            if (rec.sumber === 'kencana_screening') {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] shadow-sm">
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>verified</span>
                                  <span className="text-[9px] font-extrabold tracking-wide uppercase">Kencana Screening</span>
                                </div>
                              );
                            } else if (rec.sumber === 'klinik_kampus') {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-success-light)] border border-[var(--theme-success)]/20 text-[var(--theme-success)] shadow-sm">
                                  <span className="material-symbols-outlined" style={{ fontSize: '11px' }}>shield</span>
                                  <span className="text-[9px] font-extrabold tracking-wide uppercase">Klinik Kampus</span>
                                </div>
                              );
                            } else {
                              return (
                                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--theme-bg)] border border-border text-[var(--theme-text-muted)] shadow-sm">
                                  <User size={11} className="text-[var(--theme-text-muted)]" />
                                  <span className="text-[9px] font-extrabold tracking-wide uppercase">Mandiri</span>
                                </div>
                              );
                            }
                          })()}
                          {rec.diperiksa_oleh && (
                            <span className="text-[9px] font-medium text-[var(--theme-text-muted)] bg-[var(--theme-bg)] px-2 py-0.5 rounded-md border border-border/50 max-w-[120px] truncate shadow-sm" title={rec.diperiksa_oleh}>
                              by {rec.diperiksa_oleh}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Action */}
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedDetailId(rec.id)}
                          className="w-8 h-8 rounded-xl bg-surface border border-border flex items-center justify-center text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white transition-all ml-auto shadow-sm"
                        >
                          <ChevronRight size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="6" className="py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--theme-bg)] border-2 border-dashed border-border flex items-center justify-center">
                        <Bookmark size={20} className="text-[var(--theme-text-muted)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--theme-text-muted)]">Belum ada rekam medis.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Referral History (Rujukan Medis) ── */}
      <div className="glass-card overflow-hidden mb-6">
        <div className="px-6 py-5 border-b border-[var(--theme-border-muted)] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--theme-primary-light)]/80 rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
              <span className="material-symbols-outlined text-[24px]">home_health</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Rujukan</span>
              <h2 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Riwayat Rujukan Medis</h2>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                {['Tanggal', 'Faskes Tujuan', 'Alasan', 'Rekomendasi Asuransi', 'Aksi'].map((h, i) => (
                  <th key={i} className="px-5 py-3 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isRujukanLoading ? (
                [...Array(2)].map((_, i) => (
                  <tr key={i}><td colSpan="5" className="px-5 py-4"><Skeleton className="h-12 w-full rounded-xl" /></td></tr>
                ))
              ) : rujukans?.length > 0 ? (
                rujukans.map((ruj) => (
                  <tr key={ruj.id} className="group hover:bg-[var(--theme-bg)] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-surface border border-border shadow-sm flex flex-col items-center justify-center shrink-0">
                          <span className="text-xs font-black text-[var(--theme-text)] leading-none">{new Date(ruj.created_at || ruj.CreatedAt).getDate()}</span>
                          <span className="text-[8px] font-bold text-[var(--theme-text-muted)] uppercase">{fmt(ruj.created_at || ruj.CreatedAt, { month: 'short' })}</span>
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[var(--theme-text)]">{new Date(ruj.created_at || ruj.CreatedAt).getFullYear()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-[var(--theme-text)]">{ruj.faskes_tujuan}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-xs text-[var(--theme-text-muted)] max-w-[200px] truncate" title={ruj.alasan_rujukan}>{ruj.alasan_rujukan}</p>
                    </td>
                    <td className="px-5 py-4">
                      {ruj.rekomendasi_asuransi ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20">
                          {ruj.rekomendasi_asuransi.replace(/_/g, ' ')}
                        </span>
                      ) : (
                        <span className="text-xs text-[var(--theme-text-muted)]">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {(ruj.is_published || ruj.approval_status === "disetujui" || ruj.status === "Selesai") && (
                        <button
                          onClick={async () => {
                            try {
                              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173/api';
                              const blob = await fetchBlobWithAuth(`${API_URL}/mahasiswa/rujukan/${ruj.id || ruj.ID}/export-pdf`);
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `Surat_Rujukan_Medis.pdf`;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              window.URL.revokeObjectURL(url);
                            } catch (err) {
                              console.error(err);
                            }
                          }}
                          className="w-8 h-8 rounded-xl bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 flex items-center justify-center text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white transition-all ml-auto shadow-sm group/btn"
                          title="Download Surat Rujukan"
                        >
                          <span className="material-symbols-outlined text-[16px] group-hover/btn:-translate-y-0.5 transition-transform">download</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="py-16 text-center">
                    <div className="inline-flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-[var(--theme-bg)] border-2 border-dashed border-border flex items-center justify-center">
                        <Bookmark size={20} className="text-[var(--theme-text-muted)]" />
                      </div>
                      <p className="text-sm font-semibold text-[var(--theme-text-muted)]">Belum ada riwayat rujukan medis.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── CTA Panels ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Asuransi CTA */}
        <div className="glass-card p-6 relative overflow-hidden flex flex-col justify-between border-[var(--theme-primary)]/20 bg-[var(--theme-primary)]/5">
          <div className="relative z-10">
            <div className="bg-[var(--theme-primary)]/10 w-fit p-2 rounded-xl mb-4 border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >health_and_safety</span>
            </div>
            <h4 className="text-base font-bold mb-2 leading-tight text-[var(--theme-text)]">Asuransi Kesehatan</h4>
            <p className="text-[var(--theme-text-muted)] text-sm leading-relaxed mb-4 font-semibold">
              Ajukan klaim asuransi kesehatan BKU Assurance atau reimburse biaya medis kamu.
            </p>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-[var(--theme-bg)] px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--theme-border-muted)] text-[var(--theme-text-muted)]">BKU Assurance</span>
              <span className="bg-[var(--theme-bg)] px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[var(--theme-border-muted)] text-[var(--theme-text-muted)]">BPJS</span>
            </div>
            <NavLink
              to="/app/student/insurance"
              className="flex items-center gap-2 px-4 py-2.5 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] text-sm font-bold rounded-xl hover:opacity-90 transition-all w-fit shadow-md shadow-[var(--theme-primary)]/20"
            >
              Ajukan Klaim <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >arrow_forward</span>
            </NavLink>
          </div>
          <span className="material-symbols-outlined absolute right-[-60px] top-[-60px] text-[var(--theme-primary)] opacity-[0.03] pointer-events-none" style={{ fontSize: '200px' }} >health_and_safety</span>
        </div>

        {/* Privacy Info */}
        <div className="glass-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[var(--theme-bg)] rounded-xl text-[var(--theme-primary)] border border-[var(--theme-border-muted)]">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >security</span>
              </div>
              <h4 className="text-base font-bold tracking-tight text-[var(--theme-text)]">Kerahasiaan Rekam Medis</h4>
            </div>
            <p className="text-sm text-[var(--theme-text-muted)] leading-relaxed mb-4 font-medium">
              BKU Student Hub menjaga 100% privasi data kesehatan Anda. Riwayat medis hanya dapat diakses oleh Anda dan tenaga medis universitas bersertifikasi untuk keperluan klinis resmi.
            </p>
            <div className="p-3 bg-[var(--theme-primary)]/5 rounded-xl border border-[var(--theme-primary)]/20 flex items-start gap-2">
              <span className="material-symbols-outlined text-[var(--theme-primary)] shrink-0 mt-0.5" style={{ fontSize: '14px' }} >error</span>
              <p className="text-[11px] text-[var(--theme-text-muted)] font-semibold leading-relaxed">
                Data mandiri digunakan sebagai referensi awal, bukan hasil diagnosis medis final.
              </p>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-[var(--theme-border-muted)] flex items-center justify-between text-[var(--theme-text-muted)]">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }} >verified_user</span>
              <span className="text-[11px] font-bold uppercase tracking-wider">Verified System 2026</span>
            </div>
            <div className="w-8 h-1 bg-[var(--theme-primary)]/20 rounded-full" />
          </div>
        </div>
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {isInputOpen && (
          <InputModal
            onClose={() => setIsInputOpen(false)}
            onSubmit={handleInputSubmit}
            isLoading={mandiriMutation.isPending}
          />
        )}
        {selectedDetailId && (
          <DetailModal
            record={detailRecord}
            isLoading={isDetailLoading}
            hasActiveInsuranceClaim={hasActiveInsuranceClaim}
            onClose={() => setSelectedDetailId(null)}
          />
        )}
        {successModalData && (
          <SuccessFeedbackModal
            data={successModalData}
            onClose={() => setSuccessModalData(null)}
          />
        )}
        {isBookingModalOpen && (
          <BookingModal
            isOpen={isBookingModalOpen}
            onClose={() => {
              setIsBookingModalOpen(false);
              setIsRescheduleMode(false);
              setRescheduleBookingTarget(null);
            }}
            title={isRescheduleMode ? "Jadwal Ulang Sesi Lanjutan" : "Buat Jadwal Screening / Konsultasi Baru"}
            subtitle={isRescheduleMode ? "Pilih tanggal kontrol lanjutan dengan tenaga medis Anda" : "Pilih Jadwal & Isi Keluhan"}
            schedules={availableSchedules}
            myBookings={myBookings}
            loading={loadingSchedules}
            selectedSchedule={selectedSchedule}
            setSelectedSchedule={setSelectedSchedule}
            bookingKeluhan={bookingKeluhan}
            setBookingKeluhan={setBookingKeluhan}
            onSubmit={handleCreateBooking}
            onCancel={handleCancelBooking}
            isSubmitting={submittingBooking}
            isRescheduleMode={isRescheduleMode}
            rescheduleBookingTarget={rescheduleBookingTarget}
          />
        )}
      </AnimatePresence>
    </PageContent>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatItem({ label, value, unit, icon, colorClass = "text-[var(--theme-primary)]", bgClass = "bg-[var(--theme-primary)]/5" }) {
  return (
    <div className="relative overflow-hidden bg-surface border border-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow group/stat flex flex-col justify-between">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider group-hover/stat:text-[var(--theme-text-muted)] transition-colors">
          {label}
        </span>
        <div className={`p-1.5 rounded-lg ${bgClass} ${colorClass}`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-black text-[var(--theme-text)] tracking-tight">{value}</span>
        <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">{unit}</span>
      </div>
    </div>
  );
}

function BPReference({ label, range, color, text }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">{label}</span>
        <span className={`text-[10px] font-bold ${text}`}>{range}</span>
      </div>
      <div className="h-1.5 w-full bg-surface/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} w-full opacity-40`} />
      </div>
    </div>
  );
}

function EmptyHealthState({ onOpen }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-surface rounded-2xl p-10 border-2 border-dashed border-border text-center mb-6"
    >
      <div className="w-16 h-16 bg-[var(--theme-bg)] rounded-2xl flex items-center justify-center mx-auto mb-4 border border-border">
        <Stethoscope size={28} className="text-[var(--theme-text-muted)]" />
      </div>
      <h3 className="text-lg font-bold text-[var(--theme-text)] mb-2">Belum Ada Catatan Kesehatan</h3>
      <p className="text-sm text-[var(--theme-text-muted)] max-w-sm mx-auto mb-5 leading-relaxed">
        Mulai perjalanan hidup sehatmu dengan menginput data biometrik pertamamu.
      </p>
      <button
        onClick={onOpen}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--theme-primary)] text-white text-sm font-bold rounded-xl hover:bg-[var(--theme-primary-dark)] transition-all"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={2.5}>add</span> Input Sekarang
      </button>
    </motion.div>
  );
}

function InputModal({ onClose, onSubmit, isLoading }) {
  const [formData, setFormData] = useState({
    tinggi_badan: '', berat_badan: '',
    sistolik: '', diastolik: '',
    gula_darah: '', golongan_darah: 'A',
    jam_tidur: '8', olahraga: '2',
    konsumsi_air: '2.0', merokok: 'Tidak',
    tingkat_stres: 5, mood: 'Biasa Saja',
    motivasi_belajar: 'Biasa Saja',
    sakit_kepala: false, pusing: false,
    lelah: false, nyeri_sendi: false,
    keluhan: '',
    tanggal: new Date().toISOString().split('T')[0],
  });

  const bmi = useMemo(() => {
    if (!formData.tinggi_badan || !formData.berat_badan) return null;
    const h = formData.tinggi_badan / 100;
    const r = formData.berat_badan / (h * h);
    return isNaN(r) ? null : r.toFixed(1);
  }, [formData.tinggi_badan, formData.berat_badan]);

  const bmiCat = getBMICategory(bmi);
  const bpStat = getBPStatus(formData.sistolik, formData.diastolik);

  return (
    <DialogModal
      open={true}
      onOpenChange={onClose}
      maxWidth="max-w-5xl"
      title="Perbarui Biometrik"
      subtitle="Laporan Kesehatan Mandiri"
      description="Indikator dihitung otomatis berdasarkan data yang kamu masukkan."
      icon="accessibility_new"
      footer={
        <div className="flex gap-3 w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface border border-border text-[var(--theme-text-muted)] text-[13px] font-black rounded-xl hover:bg-[var(--theme-bg)] transition-all uppercase tracking-widest cursor-pointer"
          >
            Batal
          </button>
          <button
            disabled={isLoading || !formData.tinggi_badan || !formData.berat_badan}
            onClick={() => {
              const notesPayload = {
                is_screening_realistis: true,
                jam_tidur: parseInt(formData.jam_tidur) || 8,
                olahraga: parseInt(formData.olahraga) || 0,
                konsumsi_air: parseFloat(formData.konsumsi_air) || 2.0,
                merokok: formData.merokok,
                tingkat_stres: parseInt(formData.tingkat_stres) || 5,
                mood: formData.mood,
                motivasi_belajar: formData.motivasi_belajar,
                daftar_keluhan: [
                  ...(formData.sakit_kepala ? ['Sakit Kepala'] : []),
                  ...(formData.pusing ? ['Pusing'] : []),
                  ...(formData.lelah ? ['Lelah / Lemas'] : []),
                  ...(formData.nyeri_sendi ? ['Nyeri Sendi'] : []),
                ],
                catatan_tambahan: formData.keluhan,
              };
              const notesStr = JSON.stringify(notesPayload);
              onSubmit({
                tinggi_badan: parseFloat(formData.tinggi_badan),
                berat_badan: parseFloat(formData.berat_badan),
                sistolik: parseInt(formData.sistolik) || 120,
                diastolik: parseInt(formData.diastolik) || 80,
                gula_darah: parseInt(formData.gula_darah) || 0,
                golongan_darah: formData.golongan_darah,
                catatan: notesStr,
                keluhan: notesStr,
                tanggal: new Date(formData.tanggal).toISOString(),
              });
            }}
            className="flex-1 py-3 bg-[var(--theme-primary)] text-white text-[13px] font-black rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md shadow-[var(--theme-primary)]/20 uppercase tracking-widest cursor-pointer border-none"
          >
            {isLoading
              ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
              : <><span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span> Simpan Rekam Medis</>
            }
          </button>
        </div>
      }
    >
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Analytics */}
        <div className="w-full md:w-72 bg-[var(--theme-primary-light)]/50 border border-[var(--theme-primary)]/20 p-6 rounded-3xl shrink-0 h-fit space-y-6">
          <div className="flex items-center gap-3 border-b border-[var(--theme-primary)]/20 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-surface border border-[var(--theme-primary)]/20 shadow-sm flex items-center justify-center text-[var(--theme-primary)]">
              <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '20px' }}>show_chart</span>
            </div>
            <h2 className="text-[12px] font-black uppercase tracking-widest text-[var(--theme-text)]">Live Analytics</h2>
          </div>

          <div className="space-y-6">
            {/* BMI Live */}
            <div className="bg-surface p-4 rounded-2xl border border-[var(--theme-primary-light)] shadow-sm">
              <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2">BMI Meter</p>
              <div className="flex items-baseline gap-1.5 mb-2">
                <span className="text-3xl font-black tracking-tight text-[var(--theme-text)]">{bmi || '–'}</span>
                <span className="text-[10px] text-[var(--theme-text-muted)] font-bold">pts</span>
              </div>
              {bmi && (
                <span className={`text-[10px] font-bold uppercase flex items-center gap-1.5 ${bmiCat.color}`}>
                  <span className={`w-2 h-2 rounded-full ${bmiCat.dot}`} /> {bmiCat.label}
                </span>
              )}
              <div className="w-full h-2 bg-[var(--theme-bg)] rounded-full mt-3 overflow-hidden">
                {bmi && (
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(Math.max((bmi / 40) * 100, 5), 100)}%` }}
                    className={`h-full ${bmiCat.bar}`}
                  />
                )}
              </div>
            </div>

            {/* BP Live */}
            <div className="bg-surface p-4 rounded-2xl border border-[var(--theme-primary-light)] shadow-sm">
              <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-2">Tekanan Darah</p>
              <div className="text-2xl font-black tracking-tight mb-2 text-[var(--theme-text)]">
                {formData.sistolik || '–'}<span className="text-[var(--theme-text-subtle)] font-medium">/</span>{formData.diastolik || '–'}
              </div>
              <span className={`text-[10px] font-bold uppercase ${bpStat.label === 'Belum Ada Data' ? 'text-[var(--theme-text-muted)]' : bpStat.color}`}>
                {bpStat.label === 'Belum Ada Data' ? 'Menunggu input' : `Status: ${bpStat.label}`}
              </span>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="flex-1 space-y-6">
          {/* 1. Kategori Fisik */}
          <div className="border border-[var(--theme-border)] rounded-3xl p-5 bg-[var(--theme-surface)] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border-muted)]">
              <span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '20px' }}>accessibility_new</span>
              <span className="text-[11px] font-black text-[var(--theme-text)] uppercase tracking-widest">1. Kategori Fisik</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Tinggi Badan" unit="cm" value={formData.tinggi_badan} onChange={v => setFormData(p => ({ ...p, tinggi_badan: v }))} icon={<span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>straighten</span>} placeholder="170" />
              <InputField label="Berat Badan" unit="kg" value={formData.berat_badan} onChange={v => setFormData(p => ({ ...p, berat_badan: v }))} icon={<span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>scale</span>} placeholder="65" />
            </div>
          </div>

          {/* 2. Gaya Hidup */}
          <div className="border border-[var(--theme-border)] rounded-3xl p-5 bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border)]">
              <span className="material-symbols-outlined text-[var(--theme-success)] font-bold" style={{ fontSize: '20px' }}>sports_gymnastics</span>
              <span className="text-[11px] font-black text-[var(--theme-text)] uppercase tracking-widest">2. Gaya Hidup (Self-report)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[var(--theme-success)] font-bold" style={{ fontSize: '16px' }}>bedtime</span> Jam Tidur / Hari
                </label>
                <select
                  className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
                  value={formData.jam_tidur}
                  onChange={e => setFormData(p => ({ ...p, jam_tidur: e.target.value }))}
                >
                  {['4', '5', '6', '7', '8', '9'].map(v => <option key={v} value={v}>{v} Jam</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[var(--theme-success)] font-bold" style={{ fontSize: '16px' }}>fitness_center</span> Olahraga / Minggu
                </label>
                <select
                  className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
                  value={formData.olahraga}
                  onChange={e => setFormData(p => ({ ...p, olahraga: e.target.value }))}
                >
                  {['0', '1', '2', '3', '4'].map(v => <option key={v} value={v}>{v} Kali</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[var(--theme-success)] font-bold" style={{ fontSize: '16px' }}>local_drink</span> Air Minum (L)
                </label>
                <select
                  className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
                  value={formData.konsumsi_air}
                  onChange={e => setFormData(p => ({ ...p, konsumsi_air: e.target.value }))}
                >
                  {['1.0', '1.5', '2.0', '2.5', '3.0'].map(v => <option key={v} value={v}>{v} Liter</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[var(--theme-success)] font-bold" style={{ fontSize: '16px' }}>smoke_free</span> Apakah Merokok?
                </label>
                <select
                  className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
                  value={formData.merokok}
                  onChange={e => setFormData(p => ({ ...p, merokok: e.target.value }))}
                >
                  {['Tidak', 'Ya'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Mental */}
          <div className="border border-[var(--theme-border)] rounded-3xl p-5 bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border)]">
              <span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '20px' }}>psychology</span>
              <span className="text-[11px] font-black text-[var(--theme-text)] uppercase tracking-widest">3. Kategori Mental (Self-report)</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                  Tingkat Stres (1-10)
                </label>
                <span className="px-3 py-1 text-[13px] font-extrabold bg-[var(--theme-primary-light)] text-[var(--theme-primary)] rounded-xl">{formData.tingkat_stres}</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                className="w-full accent-[var(--theme-primary)] bg-[var(--theme-bg)] h-2 rounded-xl appearance-none cursor-pointer"
                value={formData.tingkat_stres}
                onChange={e => setFormData(p => ({ ...p, tingkat_stres: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-2">
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>mood</span> Mood Minggu Ini
                </label>
                <select
                  className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
                  value={formData.mood}
                  onChange={e => setFormData(p => ({ ...p, mood: e.target.value }))}
                >
                  {['Sangat Baik', 'Baik', 'Biasa Saja', 'Buruk', 'Sangat Buruk'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>auto_stories</span> Motivasi Belajar
                </label>
                <select
                  className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
                  value={formData.motivasi_belajar}
                  onChange={e => setFormData(p => ({ ...p, motivasi_belajar: e.target.value }))}
                >
                  {['Sangat Tinggi', 'Tinggi', 'Biasa Saja', 'Rendah', 'Sangat Rendah'].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 4. Keluhan */}
          <div className="border border-[var(--theme-border)] rounded-3xl p-5 bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border)]">
              <span className="material-symbols-outlined text-[var(--theme-error)] font-bold" style={{ fontSize: '20px' }}>healing</span>
              <span className="text-[11px] font-black text-[var(--theme-text)] uppercase tracking-widest">4. Kategori Keluhan (Bila Ada)</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'sakit_kepala', label: 'Sakit Kepala' },
                { key: 'pusing', label: 'Pusing' },
                { key: 'lelah', label: 'Lelah / Lemas' },
                { key: 'nyeri_sendi', label: 'Nyeri Sendi' },
              ].map(item => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, [item.key]: !p[item.key] }))}
                  className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-left text-[13px] font-bold transition-all cursor-pointer ${formData[item.key]
                    ? 'bg-[var(--theme-error-light)] border-[var(--theme-error)]/20 text-[var(--theme-error)] shadow-sm ring-2 ring-[var(--theme-error)]/10'
                    : 'bg-[var(--theme-bg)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)]'
                    }`}
                >
                  <span className="material-symbols-outlined font-bold" style={{ fontSize: '18px' }}>
                    {formData[item.key] ? 'check_circle' : 'add_circle'}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. Kategori Opsional */}
          <div className="border border-[var(--theme-border)] rounded-3xl p-5 bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border)]">
              <span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '20px' }}>query_stats</span>
              <span className="text-[11px] font-black text-[var(--theme-text)] uppercase tracking-widest">5. Kategori Opsional (Alat/Klinik)</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Tensi Sistolik" unit="mmHg" value={formData.sistolik} onChange={v => setFormData(p => ({ ...p, sistolik: v }))} icon={<span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>arrow_upward</span>} placeholder="120" isOptional={true} />
              <InputField label="Tensi Diastolik" unit="mmHg" value={formData.diastolik} onChange={v => setFormData(p => ({ ...p, diastolik: v }))} icon={<span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>arrow_downward</span>} placeholder="80" isOptional={true} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Gula Darah" unit="mg/dL" value={formData.gula_darah} onChange={v => setFormData(p => ({ ...p, gula_darah: v }))} icon={<span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>water_drop</span>} placeholder="90" isOptional={true} />
              <div>
                <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2 justify-between">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[var(--theme-primary)] font-bold" style={{ fontSize: '16px' }}>bloodtype</span> Golongan Darah
                  </span>
                  <span className="text-[9px] font-extrabold px-2 py-1 rounded-md bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border border-[var(--theme-border)] normal-case tracking-normal">Opsional</span>
                </label>
                <select
                  className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
                  value={formData.golongan_darah}
                  onChange={e => setFormData(p => ({ ...p, golongan_darah: e.target.value }))}
                >
                  {['A', 'B', 'AB', 'O', '-'].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 6. Catatan */}
          <div>
            <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }}>description</span> Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={3}
              placeholder="Ceritakan kondisi kesehatanmu atau keluhan yang dirasakan..."
              className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-medium focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all resize-none text-[var(--theme-text)] placeholder:text-[var(--theme-text-muted)]"
              value={formData.keluhan}
              onChange={e => setFormData(p => ({ ...p, keluhan: e.target.value }))}
            />
          </div>

          {/* 7. Tanggal */}
          <div>
            <label className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }}>calendar_month</span> Tanggal Pengukuran
            </label>
            <input
              type="date"
              className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
              value={formData.tanggal}
              onChange={e => setFormData(p => ({ ...p, tanggal: e.target.value }))}
            />
          </div>
        </div>
      </div>
    </DialogModal>
  );
}

function InputField({ label, unit, value, onChange, icon, placeholder, isOptional }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-[var(--theme-text)] uppercase tracking-wider flex items-center gap-1.5 mb-1.5 justify-between">
        <span className="flex items-center gap-1.5">
          {icon} {label} <span className="text-[var(--theme-text-muted)] font-normal normal-case tracking-normal">({unit})</span>
        </span>
        {isOptional && (
          <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border border-border/50 normal-case tracking-normal">Opsional</span>
        )}
      </label>
      <input
        type="number"
        placeholder={placeholder}
        className="w-full px-4 py-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all text-[var(--theme-text)]"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}

function DetailModal({ record, isLoading, onClose, hasActiveInsuranceClaim }) {
  if (isLoading || !record) {
    return (
      <DialogModal
        open={true}
        onOpenChange={onClose}
        maxWidth="max-w-lg"
        title="Memuat rekam medis..."
        icon="hourglass_empty"
      >
        <div className="space-y-3 p-4">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </DialogModal>
    );
  }

  const bmiCat = getBMICategory(record.bmi);

  let parsedNotes = null;
  if (record.keluhan) {
    try {
      if (record.keluhan.trim().startsWith('{')) {
        parsedNotes = JSON.parse(record.keluhan);
      }
    } catch (e) {
      // standard string
    }
  }

  const handleDownloadPDF = async () => {
    const toastId = toast.loading('Menyiapkan PDF Rekam Medis...');
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5173/api';
      const blob = await fetchBlobWithAuth(`${API_URL}/student-health/session-notes/${record.id}/export-pdf`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Rekam_Medis_${record.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Berhasil mengunduh PDF', { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error('Gagal mengunduh PDF', { id: toastId });
    }
  };

  return (
    <DialogModal
      open={true}
      onOpenChange={onClose}
      maxWidth="max-w-xl"
      title="Laporan Rekam Medis"
      subtitle={`BMI: ${bmiCat.label}`}
      description={fmt(record.tanggal_periksa, { day: 'numeric', month: 'long', year: 'numeric' })}
      icon="medical_services"
      footer={
        <div className="flex flex-col sm:flex-row gap-3 w-full">
          {hasActiveInsuranceClaim ? (
            <button
              disabled
              className="flex-1 py-3 bg-[var(--theme-bg)] text-[var(--theme-text-muted)] text-xs font-black rounded-xl cursor-not-allowed uppercase tracking-wider flex items-center justify-center gap-1.5 text-center border-none"
            >
              <span className="material-symbols-outlined text-[16px]">hourglass_top</span> Klaim Sedang Diproses / Disetujui
            </button>
          ) : (
            <NavLink
              to="/app/student/insurance"
              state={{
                tanggal: record.tanggal_periksa ? record.tanggal_periksa.split('T')[0] : '',
                deskripsi: `Klaim biaya pemeriksaan kesehatan (${record.jenis_pemeriksaan}) pada tanggal ${fmt(record.tanggal_periksa, { day: 'numeric', month: 'long', year: 'numeric' })}. Catatan: ${parsedNotes ? "Hasil Skrining Mandiri" : (record.catatan_medis || record.catatan || 'Pemeriksaan rutin.')}`
              }}
              onClick={onClose}
              className="flex-1 py-3 bg-[var(--theme-primary)] text-[var(--theme-text-on-primary)] text-xs font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-[var(--theme-primary)]/20 text-center border-none cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">health_and_safety</span> Ajukan Asuransi
            </NavLink>
          )}
          {(record.sumber === 'kencana_screening' || record.sumber === 'klinik_kampus') && (
            <button
              onClick={handleDownloadPDF}
              className="py-3 px-5 bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/20 text-[var(--theme-primary)] text-xs font-black rounded-xl hover:bg-[var(--theme-primary-light)] transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">download</span> Unduh PDF
            </button>
          )}
          <button
            onClick={onClose}
            className="py-3 px-6 bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] text-[var(--theme-text-muted)] text-xs font-black rounded-xl hover:bg-surface transition-all uppercase tracking-wider cursor-pointer"
          >
            Tutup
          </button>
        </div>
      }
      bodyClassName="p-5 sm:p-6 space-y-4"
    >
      <div className="text-left space-y-4">
        {/* Physical Metrics Grid */}
        <div>
          <h4 className="text-[10px] font-black font-headline uppercase tracking-wider mb-2.5" style={{ color: 'var(--theme-h4)' }}>Indikator Utama</h4>
          <div className="grid grid-cols-4 gap-2.5">
            {[
              { label: 'Tinggi', value: record.tinggi_badan, unit: 'cm', color: 'text-[var(--theme-primary)]' },
              { label: 'Berat', value: record.berat_badan, unit: 'kg', color: 'text-[var(--theme-primary)]' },
              { label: 'BMI', value: record.bmi, unit: 'pts', color: bmiCat.color },
              { label: 'Tensi', value: `${record.sistolik}/${record.diastolik}`, unit: 'mmHg', color: 'text-[var(--theme-primary)]' },
              { label: 'Suhu', value: record.suhu_tubuh || '-', unit: '°C', color: 'text-[var(--theme-warning)]' },
              { label: 'Nadi', value: record.denyut_nadi || '-', unit: 'bpm', color: 'text-[var(--theme-error)]' },
              { label: 'SpO2', value: record.spo2 || '-', unit: '%', color: 'text-[var(--theme-primary)]' },
              { label: 'RR', value: record.respiration_rate || '-', unit: 'x/mnt', color: 'text-[var(--theme-primary)]' },
            ].map(({ label, value, unit, color }) => (
              <div key={label} className="bg-[var(--theme-bg)] rounded-2xl p-3 border border-border/70 text-center">
                <p className="text-[9px] font-extrabold text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">{label}</p>
                <p className={`text-sm font-black leading-none ${color}`}>{value}</p>
                <p className="text-[9px] text-[var(--theme-text-muted)] font-semibold mt-1">{unit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Gula Darah & Golongan Darah */}
        {(record.gula_darah > 0 || (record.golongan_darah && record.golongan_darah !== '-')) && (
          <div className="grid grid-cols-2 gap-3">
            {record.gula_darah > 0 && (
              <div className="bg-[var(--theme-bg)] rounded-2xl p-3.5 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--theme-error-light)] text-[var(--theme-error)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }}>water_drop</span>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-[var(--theme-text-muted)] uppercase tracking-wider">Gula Darah</p>
                  <p className="text-sm font-black text-[var(--theme-text)]">{record.gula_darah} <span className="text-[10px] text-[var(--theme-text-muted)] font-semibold">mg/dL</span></p>
                </div>
              </div>
            )}
            {record.golongan_darah && record.golongan_darah !== '-' && (
              <div className="bg-[var(--theme-bg)] rounded-2xl p-3.5 border border-border flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined font-bold" style={{ fontSize: '16px' }}>bloodtype</span>
                </div>
                <div>
                  <p className="text-[9px] font-extrabold text-[var(--theme-text-muted)] uppercase tracking-wider">Golongan Darah</p>
                  <p className="text-sm font-black text-[var(--theme-text)]">{record.golongan_darah}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Advanced Lifestyle & Mental Insights */}
        {parsedNotes && (
          <>
            {/* Lifestyle Category */}
            <div className="bg-[var(--theme-success-light)]/20 border border-[var(--theme-success)]/20 rounded-2xl p-4 space-y-3">
              <p className="text-[10px] font-black text-[var(--theme-success)] uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-[var(--theme-success)]/20">
                <span className="material-symbols-outlined font-bold" style={{ fontSize: '14px' }}>sports_gymnastics</span> Gaya Hidup (Self-report)
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="flex flex-col">
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-extrabold uppercase">Jam Tidur</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">{parsedNotes.jam_tidur} Jam / Hari</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-extrabold uppercase">Olahraga</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">{parsedNotes.olahraga} Kali / Minggu</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-extrabold uppercase">Konsumsi Air</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">{parsedNotes.konsumsi_air} Liter</span>
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-extrabold uppercase">Apakah Merokok</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">{parsedNotes.merokok}</span>
                </div>
              </div>
            </div>

            {/* Mental Category */}
            <div className="bg-[var(--theme-primary-light)]/20 border border-[var(--theme-primary)]/20 rounded-2xl p-4 space-y-3 text-left">
              <p className="text-[10px] font-black text-[var(--theme-primary)] uppercase tracking-wider flex items-center gap-1.5 pb-1.5 border-b border-[var(--theme-primary)]/20">
                <span className="material-symbols-outlined font-bold" style={{ fontSize: '14px' }}>psychology</span> Kondisi Mental (Self-report)
              </p>
              <div className="grid grid-cols-2 gap-3 text-left">
                <div className="flex flex-col">
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-extrabold uppercase">Tingkat Stres</span>
                  <span className="text-xs font-bold text-[var(--theme-primary)]">{parsedNotes.tingkat_stres || 0} / 10</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-extrabold uppercase">Mood</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">{parsedNotes.mood || '-'}</span>
                </div>
                <div className="flex flex-col col-span-2">
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-extrabold uppercase">Motivasi Belajar</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">{parsedNotes.motivasi_belajar || '-'}</span>
                </div>
              </div>
            </div>

            {/* Symptoms Category */}
            {parsedNotes.daftar_keluhan && parsedNotes.daftar_keluhan.length > 0 && (
              <div className="bg-[var(--theme-error-light)]/20 border border-[var(--theme-error)]/20 rounded-2xl p-4 space-y-2.5 text-left">
                <p className="text-[10px] font-black text-[var(--theme-error)] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="material-symbols-outlined font-bold" style={{ fontSize: '14px' }}>healing</span> Keluhan Fisik
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {parsedNotes.daftar_keluhan.map((kel, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-[var(--theme-error-light)] border border-[var(--theme-error)]/20 text-[var(--theme-error)] rounded-xl text-[10px] font-bold">
                      {kel}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Standard notes if standard text */}
        {!parsedNotes && record.keluhan && (
          <div className="p-3.5 bg-[var(--theme-bg)] rounded-2xl border border-border text-left">
            <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined font-bold text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>bookmark</span> Keluhan
            </p>
            <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed italic">"{record.keluhan}"</p>
          </div>
        )}

        {parsedNotes && parsedNotes.catatan_tambahan && (
          <div className="p-3.5 bg-[var(--theme-bg)] rounded-2xl border border-border text-left">
            <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined font-bold text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>bookmark</span> Catatan Tambahan
            </p>
            <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed italic">"{parsedNotes.catatan_tambahan}"</p>
          </div>
        )}

        {!parsedNotes && record.catatan_medis && (
          <div className="p-3.5 bg-[var(--theme-primary-light)] rounded-2xl border border-[var(--theme-primary)]/20 text-left">
            <p className="text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <span className="material-symbols-outlined font-bold text-[var(--theme-primary)]" style={{ fontSize: '14px' }} >error</span> Analisis & Saran Medis
            </p>
            <p className="text-xs font-semibold text-[var(--theme-primary)] leading-relaxed">{record.catatan_medis}</p>
          </div>
        )}

        {/* Source and status banner */}
        <div className="flex items-center justify-between p-4 bg-[var(--theme-primary)] rounded-2xl text-white">
          <div className="flex items-center gap-3 text-left">
            <div className="w-9 h-9 rounded-xl bg-surface/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-[var(--theme-text-on-primary)]/60" style={{ fontSize: '16px' }}>admin_panel_settings</span>
            </div>
            <div>
              <p className="text-[10px] text-white/40 uppercase tracking-wider">Sumber Data</p>
              <p className="text-xs font-bold capitalize">{record.sumber.replace(/_/g, ' ')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-white/40 uppercase tracking-wider mb-0.5">Status</p>
            <p className={`text-xs font-bold uppercase ${record.status_kesehatan === 'sehat' ? 'text-[var(--theme-success)]' : 'text-[var(--theme-text-on-primary)]/70'}`}>
              {record.status_kesehatan.replace('_', ' ')}
            </p>
          </div>
        </div>
      </div>
    </DialogModal>
  );
}

function SuccessFeedbackModal({ data, onClose }) {
  const currentRecord = data.current;
  const previousRecord = data.previous;

  const score = calculateHealthScore(currentRecord);
  const delta = getInterpretationDelta(currentRecord, previousRecord);
  const streak = calculateStreak([currentRecord, ...(previousRecord ? [previousRecord] : [])]);

  // Calculate stress level if present
  let stressLevel = 0;
  if (currentRecord.keluhan && currentRecord.keluhan.startsWith('{')) {
    try {
      const parsed = JSON.parse(currentRecord.keluhan);
      stressLevel = parseInt(parsed.tingkat_stres) || 0;
    } catch (_) { }
  }

  // Custom suggestion based on score
  let badgeColor = "bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20";
  let scoreColor = "text-[var(--theme-success)]";
  let ringColor = "var(--theme-success)";

  if (score < 70) {
    badgeColor = "bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20";
    scoreColor = "text-[var(--theme-error)]";
    ringColor = "var(--theme-error)";
  } else if (score < 85) {
    badgeColor = "bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20";
    scoreColor = "text-[var(--theme-warning)]";
    ringColor = "var(--theme-warning)";
  }

  // Check if student needs counselor or clinic
  const needsCounseling = stressLevel >= 7 || currentRecord.bmi >= 30;

  return (
    <Dialog open={true} onOpenChange={onClose} maxWidth="max-w-lg">
      <DialogContent>
        {/* Top Header Card */}
        <DialogHeader className="bg-[var(--theme-primary)] text-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-surface/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-[var(--theme-primary)]/20 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <DialogTitle className="text-xl font-extrabold font-headline leading-tight text-white">Data Kesehatan Disimpan!</DialogTitle>
            <DialogDescription className="text-xs text-[var(--theme-text-on-primary)]/60 mt-1 max-w-xs leading-relaxed font-semibold">
              Hasil analisis otomatis parameter kebugaran dan gaya hidup kamu.
            </DialogDescription>
          </div>
        </DialogHeader>

        {/* Modal Scrollable Body */}
        <div className="p-8 overflow-y-auto max-h-[50vh] no-scrollbar space-y-5 text-left bg-surface">
          {/* Radial Score Gauge & Interpretation Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center bg-[var(--theme-bg)] p-4 rounded-2xl border border-border">
            {/* SVG Radial Score */}
            <div className="flex flex-col items-center justify-center p-2 bg-surface rounded-xl shadow-sm border border-border">
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Skor Kesehatan</span>
              <div className="relative w-24 h-24 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="48" cy="48" r="40" stroke="var(--theme-border)" strokeWidth="8" fill="transparent" strokeDasharray="" />
                  <circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke={ringColor}
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={2 * Math.PI * 40 * (1 - score / 100)}
                    strokeLinecap="round"
                    className="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
                  <span className="text-[9px] text-[var(--theme-text-muted)] font-bold uppercase tracking-wider">Poin</span>
                </div>
              </div>
            </div>

            {/* General evaluation text */}
            <div className="space-y-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '15px' }}>psychology</span>
                <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Interpretasi</span>
              </div>
              <p className="text-xs text-[var(--theme-text-muted)] font-semibold leading-relaxed">
                {score >= 85
                  ? "Sangat Baik! Tubuh dan gaya hidup kamu menunjukkan konsistensi prima. Teruskan habit ini!"
                  : score >= 70
                    ? "Cukup Baik! Ada beberapa hal kecil yang bisa ditingkatkan agar kesehatanmu lebih optimal."
                    : "Perlu Perhatian! Disarankan untuk menyeimbangkan pola makan, istirahat, dan kelola stres."
                }
              </p>
            </div>
          </div>

          {/* Inline Personal Comments Delta */}
          {delta && (
            <div className={`p-4 rounded-2xl border ${delta.type === 'success' ? 'bg-[var(--theme-success-light)]/50 border-[var(--theme-success)]/20 text-[var(--theme-success)]' :
              delta.type === 'warning' ? 'bg-[var(--theme-error-light)]/50 border-[var(--theme-error)]/20 text-[var(--theme-error)]' :
                'bg-[var(--theme-primary-light)]/50 border-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
              }`}>
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined shrink-0 mt-0.5" style={{ fontSize: '18px' }}>
                  {delta.type === 'success' ? 'check_circle' : delta.type === 'warning' ? 'warning' : 'info'}
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">Perbandingan Kesehatan</p>
                  <p className="text-xs font-semibold leading-relaxed">{delta.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Grid Stats Comparison (Current vs Previous) */}
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '15px' }}>monitoring</span>
              <span className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Ringkasan Metrik</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Berat Badan', val: `${currentRecord.berat_badan} kg`, prevVal: previousRecord ? `${previousRecord.berat_badan} kg` : '-' },
                { label: 'IMT (BMI)', val: currentRecord.bmi, prevVal: previousRecord ? previousRecord.bmi : '-' },
                { label: 'Tensi Darah', val: `${currentRecord.sistolik}/${currentRecord.diastolik}`, prevVal: previousRecord ? `${previousRecord.sistolik}/${previousRecord.diastolik}` : '-' },
              ].map(({ label, val, prevVal }) => (
                <div key={label} className="bg-[var(--theme-bg)] p-3 rounded-2xl border border-border flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">{label}</span>
                  <div>
                    <p className="text-sm font-black text-[var(--theme-text)]">{val}</p>
                    <p className="text-[9px] text-[var(--theme-text-muted)] font-semibold mt-0.5">Lalu: {prevVal}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Follow-up Recommending Psychologists or Clinic */}
          {needsCounseling && (
            <div className="bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/20 p-4 rounded-2xl flex items-start gap-3">
              <div className="bg-[var(--theme-primary)] p-2 rounded-xl text-white shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>support_agent</span>
              </div>
              <div className="space-y-2 flex-1">
                <p className="text-xs font-bold text-[var(--theme-primary)]">Rekomendasi Tindak Lanjut</p>
                <p className="text-[11px] text-[var(--theme-primary)] leading-relaxed font-semibold">
                  Tingkat stresmu atau BMI terdeteksi memerlukan panduan ahli. Kamu bisa berkonsultasi gratis dengan psikolog profesional di unit konseling universitas secara rahasia.
                </p>
                <a
                  href="/app/student/counseling"
                  className="inline-flex items-center gap-1 text-[11px] font-black text-[var(--theme-primary)] hover:underline"
                >
                  Jadwalkan Konseling Sekarang <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>arrow_forward</span>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <DialogFooter className="p-8 border-t border-[var(--theme-border)]/60 bg-[var(--theme-bg)]/20 shrink-0">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[var(--theme-primary)] text-white text-xs font-bold rounded-xl hover:bg-[var(--theme-primary-dark)] transition-all shadow-md shadow-bku-primary/10 flex items-center justify-center gap-1.5 cursor-pointer border-none"
          >
            <span className="material-symbols-outlined text-sm font-bold">check</span> Paham, Tutup
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ========================
// Booking Modal
// ========================
function BookingModal({
  isOpen,
  onClose,
  title,
  subtitle,
  schedules,
  loading,
  selectedSchedule,
  setSelectedSchedule,
  bookingKeluhan,
  setBookingKeluhan,
  onSubmit,
  isSubmitting,
  isRescheduleMode,
  rescheduleBookingTarget,
}) {
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '-';
    return timeStr.substring(0, 5);
  };

  return (
    <DialogModal
      open={isOpen}
      onOpenChange={onClose}
      maxWidth="max-w-xl"
      title={title}
      subtitle={subtitle}
      icon="stethoscope"
      footer={
        <div className="flex gap-3 pt-6 border-t border-[var(--theme-border)] w-full">
          <button
            onClick={onClose}
            className="flex-1 py-3.5 px-6 rounded-2xl font-bold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] hover:bg-[var(--theme-bg)] transition-all cursor-pointer"
          >
            Batal
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !selectedSchedule}
            className={`flex-1 py-3.5 px-6 rounded-2xl font-black uppercase tracking-wider text-white transition-all flex items-center justify-center gap-2 cursor-pointer ${isSubmitting || !selectedSchedule
                ? 'bg-[var(--theme-text-muted)]'
                : 'bg-[var(--theme-primary)] hover:shadow-lg hover:-translate-y-0.5'
              }`}
          >
            {isSubmitting ? (
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span>
            ) : (
              <>
                <span className="material-symbols-outlined relative z-10 group-hover:scale-110 transition-transform" style={{ fontSize: '18px' }}>
                  {isRescheduleMode ? 'update' : 'event_available'}
                </span>
                <span className="relative z-10">
                  {isRescheduleMode ? 'Konfirmasi Jadwal Ulang' : 'Konfirmasi Booking'}
                </span>
              </>
            )}
          </button>
        </div>
      }
      bodyClassName="p-6 md:p-8 space-y-8 bg-surface"
    >
      <div className="space-y-6">

        {/* Step 1: Jadwal */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-black text-[var(--theme-text)] flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] text-xs">1</span>
              {isRescheduleMode ? 'Pilih Jadwal Kontrol Lanjutan' : 'Pilih Jadwal Tersedia'}
            </h4>
            <span className="px-2.5 py-1 bg-[var(--theme-bg)] text-[var(--theme-text-muted)] rounded-lg text-[10px] font-bold">
              {(() => {
                const filtered = isRescheduleMode && rescheduleBookingTarget
                  ? schedules.filter(s => s.tenaga_kes_id === rescheduleBookingTarget.jadwal?.tenaga_kes_id)
                  : schedules;
                return filtered.length;
              })()} Tersedia
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-24 bg-[var(--theme-bg)] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 max-h-[300px] overflow-y-auto pr-1 snap-y custom-scrollbar">
              {(() => {
                const displaySchedules = isRescheduleMode && rescheduleBookingTarget
                  ? schedules.filter(s => s.tenaga_kes_id === rescheduleBookingTarget.jadwal?.tenaga_kes_id)
                  : schedules;

                if (displaySchedules.length === 0) {
                  return (
                    <div className="text-center py-8 bg-[var(--theme-bg)] rounded-2xl border border-dashed border-[var(--theme-border)]">
                      <span className="material-symbols-outlined text-3xl text-[var(--theme-text-muted)] mb-2">event_busy</span>
                      <p className="text-sm text-[var(--theme-text-muted)] font-medium">Belum ada jadwal tersedia saat ini</p>
                    </div>
                  );
                }

                return displaySchedules.map((schedule) => {
                  const isSelected = selectedSchedule?.id === schedule.id;
                  const isFull = schedule.sisa_kuota === 0;

                  return (
                    <button
                      key={schedule.id}
                      disabled={isFull}
                      onClick={() => setSelectedSchedule(schedule)}
                      className={`relative w-full text-left p-4 rounded-2xl border-2 transition-all duration-200 outline-none snap-start group ${isSelected
                          ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 shadow-md shadow-[var(--theme-primary)]/5'
                          : isFull
                            ? 'border-transparent bg-[var(--theme-bg)] opacity-60 cursor-not-allowed'
                            : 'border-[var(--theme-border)] bg-surface hover:border-[var(--theme-border)] hover:shadow-sm cursor-pointer'
                        }`}
                    >
                      <div className="flex items-center justify-between gap-4">

                        <div className="flex flex-1 items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-[var(--theme-primary)] text-white shadow-sm' :
                              isFull ? 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]' : 'bg-[var(--theme-success-light)] text-[var(--theme-success)] group-hover:bg-[var(--theme-success-light)]'
                            }`}>
                            <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>
                              {schedule.tipe_layanan.toLowerCase().includes('gigi') ? 'dentistry' : 'stethoscope'}
                            </span>
                          </div>

                          <div>
                            <h5 className={`text-[15px] font-bold leading-tight ${isSelected ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>
                              {schedule.tenaga_kes?.nama || 'Tenaga Kesehatan'}
                            </h5>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[11px] font-bold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] px-2 py-0.5 rounded-md uppercase tracking-wider">
                                {schedule.tipe_layanan}
                              </span>
                              <span className="text-xs text-[var(--theme-text-muted)] flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                {formatTime(schedule.jam_mulai)}-{formatTime(schedule.jam_selesai)}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <div className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${isFull ? 'bg-[var(--theme-error-light)] text-[var(--theme-error)]' :
                              schedule.sisa_kuota <= 2 ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)]' :
                                'bg-[var(--theme-success-light)] text-[var(--theme-success)]'
                            }`}>
                            {isFull ? 'Penuh' : `Sisa ${schedule.sisa_kuota}`}
                          </div>
                          {isSelected ? (
                            <span className="material-symbols-outlined text-[var(--theme-primary)] text-[22px] animate-in zoom-in">check_circle</span>
                          ) : !isFull ? (
                            <div className="w-5 h-5 rounded-full border-2 border-[var(--theme-border)] group-hover:border-[var(--theme-border)] transition-colors" />
                          ) : null}
                        </div>

                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </section>

        {/* Step 2: Keluhan */}
        {!isRescheduleMode && (
          <section className={`transition-opacity duration-300 ${!selectedSchedule ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-[var(--theme-text)] flex items-center gap-2">
                <span className={`flex items-center justify-center w-6 h-6 rounded-full text-xs transition-colors ${selectedSchedule ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]'
                  }`}>2</span>
                Keluhan Saat Ini
              </h4>
            </div>

            <div className="relative group">
              <textarea
                value={bookingKeluhan}
                onChange={(e) => setBookingKeluhan(e.target.value)}
                placeholder="Jelaskan secara singkat apa yang kamu rasakan (contoh: Demam ringan sejak 2 hari lalu)..."
                disabled={!selectedSchedule}
                className="w-full min-h-[140px] p-5 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl text-[14px] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 resize-none font-medium text-[var(--theme-text)] transition-all leading-relaxed placeholder:text-[var(--theme-text-muted)] disabled:bg-[var(--theme-bg)]/50"
              />
              <div className={`absolute bottom-4 right-4 text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${bookingKeluhan.length > 0 ? 'bg-[var(--theme-primary)]/10 text-[var(--theme-primary)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)]'
                }`}>
                {bookingKeluhan.length} karakter
              </div>
            </div>
          </section>
        )}

      </div>
    </DialogModal>
  );
}

