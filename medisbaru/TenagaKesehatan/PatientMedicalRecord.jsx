import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { tenagaKesehatanService, rujukanService, fetchBlobWithAuth } from '../../services/api';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import toast from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';

const BackIcon = () => <span className="material-symbols-outlined text-sm">arrow_back</span>;
const HistoryIcon = () => <span className="material-symbols-outlined text-sm">history</span>;
const AddIcon = () => <span className="material-symbols-outlined text-sm">add_circle</span>;
const AlertIcon = () => <span className="material-symbols-outlined text-base">warning</span>;
const CriticalIcon = () => <span className="material-symbols-outlined text-base">emergency</span>;

export default function PatientMedicalRecord() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const canManageRecords = hasPermission('health.medical_records.update') || hasPermission('health.medical_records.create') || hasPermission('health.medical_records');

  // Booking references
  const bookingId = searchParams.get('booking_id');
  const openNewScreeningDefault = searchParams.get('new_screening') === 'true' || !!bookingId;

  // View States
  const [activeTab, setActiveTab] = useState(openNewScreeningDefault ? 'new' : 'history');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patient, setPatient] = useState(null);
  const [records, setRecords] = useState([]);
  const [bookingData, setBookingData] = useState(null);

  // Form States
  const [editingRecordId, setEditingRecordId] = useState(null);
  const [editingBookingId, setEditingBookingId] = useState(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [jenisPemeriksaan, setJenisPemeriksaan] = useState('Pemeriksaan Reguler');
  const [tinggiBadan, setTinggiBadan] = useState(170);
  const [beratBadan, setBeratBadan] = useState(60);
  const [sistole, setSistole] = useState(120);
  const [diastole, setDiastole] = useState(80);
  const [gulaDarah, setGulaDarah] = useState(90);
  const [butaWarna, setButaWarna] = useState('Normal');
  const [riwayatPenyakit, setRiwayatPenyakit] = useState('');
  const [golonganDarah, setGolonganDarah] = useState('O');
  const [sumber, setSumber] = useState('klinik_kampus');

  // Vitals
  const [suhuTubuh, setSuhuTubuh] = useState(36.5);
  const [denyutNadi, setDenyutNadi] = useState(80);
  const [respirationRate, setRespirationRate] = useState(20);
  const [spO2, setSpO2] = useState(98);
  const [skalaNyeri, setSkalaNyeri] = useState(0);
  const [alergiObat, setAlergiObat] = useState('');
  const [kondisiPsikologis, setKondisiPsikologis] = useState('Normal');
  const [konsumsiObat, setKonsumsiObat] = useState('');

  // Treatment & Recommendations
  const [tindakanDiberikan, setTindakanDiberikan] = useState('');
  const [obatDiberikan, setObatDiberikan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [hasil, setHasil] = useState('Layak Kegiatan'); // Layak Kegiatan / Perlu Perhatian / Tidak Layak
  const [rekomendasi, setRekomendasi] = useState('');

  // Escalation Checkboxes
  const [eskalasiPsikolog, setEskalasiPsikolog] = useState(false);

  // Psikolog Escalation Data
  const [psychologists, setPsychologists] = useState([]);
  const [psikologId, setPsikologId] = useState('');
  const [psikologSchedules, setPsikologSchedules] = useState([]);
  const [psikologSlotId, setPsikologSlotId] = useState(null);

  // Rujukan Medis Form States
  const [eskalasiFaskes, setEskalasiFaskes] = useState(false);
  const [faskesTujuan, setFaskesTujuan] = useState('Klinik UBK');
  const [faskesTujuanLainnya, setFaskesTujuanLainnya] = useState('');
  const [alasanRujukan, setAlasanRujukan] = useState('Penanganan Lanjutan');
  const [alasanRujukanLainnya, setAlasanRujukanLainnya] = useState('');
  const [diagnosisSementara, setDiagnosisSementara] = useState('');
  const [keluhanUtama, setKeluhanUtama] = useState('');
  const [rekomendasiAsuransi, setRekomendasiAsuransi] = useState('BKU_Assurance');

  const [akhiriSesi, setAkhiriSesi] = useState(true); // true = Selesai/Sembuh, false = Perlu Kontrol

  const [submitting, setSubmitting] = useState(false);

  const handleMarkAsDone = async () => {
    if (!bookingId) return;
    if (!window.confirm("Yakin ingin menandai sesi ini sebagai Selesai tanpa menyimpan/update rekam medis tambahan?")) return;
    setSubmitting(true);
    try {
      await tenagaKesehatanService.updateBookingStatus(bookingId, 'Selesai');
      toast.success('Sesi berhasil ditandai selesai');
      setTimeout(() => navigate('/tenagakes/dashboard'), 1500);
    } catch (err) {
      toast.error('Gagal menyelesaikan sesi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditRecord = (rec) => {
    setEditingRecordId(rec.id);
    setEditingBookingId(rec.booking_id || null);
    const tzoffset = (new Date()).getTimezoneOffset() * 60000;
    const localISOTime = rec.tanggal ? (new Date(new Date(rec.tanggal) - tzoffset)).toISOString().split('T')[0] : '';
    setTanggal(localISOTime);
    setJenisPemeriksaan(rec.jenis_pemeriksaan || 'Pemeriksaan Reguler');
    setTinggiBadan(rec.tinggi_badan || 0);
    setBeratBadan(rec.berat_badan || 0);
    setSistole(rec.sistole || 0);
    setDiastole(rec.diastole || 0);
    setGulaDarah(rec.gula_darah || 0);
    setButaWarna(rec.buta_warna || 'Normal');
    setRiwayatPenyakit(rec.riwayat_penyakit || '');
    setGolonganDarah(rec.golongan_darah || 'O');
    setSumber(rec.sumber || 'klinik_kampus');
    setSuhuTubuh(rec.suhu_tubuh || 0);
    setDenyutNadi(rec.denyut_nadi || 0);
    setRespirationRate(rec.respiration_rate || 0);
    setSpO2(rec.spo2 || 0);
    setSkalaNyeri(rec.skala_nyeri || 0);
    setAlergiObat(rec.alergi_obat || '');
    setKondisiPsikologis(rec.kondisi_psikologis || 'Normal');
    setKonsumsiObat(rec.konsumsi_obat || '');
    setTindakanDiberikan(rec.tindakan_diberikan || '');
    setObatDiberikan(rec.obat_diberikan || '');
    setCatatan(rec.catatan || '');
    setHasil(rec.hasil || 'Layak Kegiatan');
    setRekomendasi(rec.rekomendasi || '');
    
    setActiveTab('new');
  };

  const loadData = () => {
    setLoading(true);
    tenagaKesehatanService.getMedicalRecord(id)
      .then((res) => {
        setPatient(res.data?.patient || null);
        setRecords(res.data?.records || []);

        // Prefill golongan darah if exists in student database
        if (res.data?.patient?.golongan_darah) {
          setGolonganDarah(res.data.patient.golongan_darah);
        }
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat rekam medis pasien.');
      })
      .finally(() => {
        setLoading(false);
      });

    if (bookingId) {
      tenagaKesehatanService.getBookingDetail(bookingId).then(res => {
        if (res.data) {
          setBookingData(res.data);
          if (res.data.status === 'Selesai') {
            setActiveTab('history');
          }
        }
      }).catch(err => console.error("Gagal memuat data booking", err));
    } else {
      setActiveTab('history');
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (eskalasiPsikolog && psychologists.length === 0) {
      tenagaKesehatanService.getPsychologists().then(res => {
        setPsychologists(res.data || []);
      }).catch(err => console.error("Gagal memuat psikolog", err));
    }
  }, [eskalasiPsikolog]);

  useEffect(() => {
    if (psikologId) {
      tenagaKesehatanService.getPsychologistSchedules(psikologId).then(res => {
        setPsikologSchedules(res.data?.slots || []);
        setPsikologSlotId(null);
      }).catch(err => console.error("Gagal memuat jadwal", err));
    } else {
      setPsikologSchedules([]);
      setPsikologSlotId(null);
    }
  }, [psikologId]);

  // Calculate BMI dynamically
  const bmi = useMemo(() => {
    const heightInMeter = tinggiBadan / 100;
    if (heightInMeter <= 0) return 0;
    return Number((beratBadan / (heightInMeter * heightInMeter)).toFixed(1));
  }, [tinggiBadan, beratBadan]);

  // BMI status label
  const bmiStatus = useMemo(() => {
    if (bmi <= 0) return '';
    if (bmi < 18.5) return 'Underweight (Kurus)';
    if (bmi < 25) return 'Normal';
    if (bmi < 30) return 'Overweight (Gemuk)';
    return 'Obese (Obesitas)';
  }, [bmi]);

  // Auto Warning Triggers based on Vitals
  const vitalsWarnings = useMemo(() => {
    const warnings = [];

    // Suhu Tubuh warnings
    if (suhuTubuh > 38.0) {
      warnings.push({
        type: 'danger',
        message: '🚨 Suhu tubuh sangat tinggi (>38.0°C). Pasien terindikasi demam tinggi (Kritis).'
      });
    } else if (suhuTubuh > 37.5) {
      warnings.push({
        type: 'warning',
        message: '⚠️ Suhu tubuh di atas batas normal (>37.5°C). Pantau kondisi pasien.'
      });
    }

    // SpO2 warnings
    if (spO2 < 92) {
      warnings.push({
        type: 'danger',
        message: '🚨 Saturasi Oksigen kritis (<92%). Indikasi hipoksia berat!'
      });
    } else if (spO2 < 95) {
      warnings.push({
        type: 'warning',
        message: '⚠️ Saturasi Oksigen rendah (<95%). Pantau pernapasan pasien.'
      });
    }

    // Blood Pressure warnings
    if (sistole >= 140 || diastole >= 90) {
      warnings.push({
        type: 'danger',
        message: '🚨 Tekanan darah tergolong Hipertensi Tingkat 1/2 (≥140/90 mmHg).'
      });
    } else if (sistole < 90 || diastole < 60) {
      warnings.push({
        type: 'warning',
        message: '⚠️ Tekanan darah tergolong Hipotensi (<90/60 mmHg).'
      });
    }

    // BMI Obese
    if (bmi >= 30) {
      warnings.push({
        type: 'warning',
        message: '⚠️ Indeks Massa Tubuh (IMT) menunjukkan status Obesitas (≥30.0).'
      });
    }

    return warnings;
  }, [suhuTubuh, spO2, sistole, diastole, bmi]);

  useEffect(() => {
    // Auto set Hasil if vitals are dangerous
    if (suhuTubuh > 38.0 || spO2 < 92) {
      setHasil('Tidak Layak');
    }
  }, [suhuTubuh, spO2]);

  useEffect(() => {
    // Auto check Psychologist if psychological state is set to "Perlu Rujukan Psikolog"
    if (kondisiPsikologis === 'Perlu Rujukan Psikolog') {
      setEskalasiPsikolog(true);
    }
  }, [kondisiPsikologis]);

  const handleSubmitScreening = async (e) => {
    e.preventDefault();

    // Auto set Hasil if conditions are critical
    let finalHasil = hasil;
    if (suhuTubuh > 38.0 || spO2 < 92) {
      finalHasil = 'Tidak Layak';
    }

    const payload = {
      tanggal,
      jenis_pemeriksaan: jenisPemeriksaan,
      tinggi_badan: Number(tinggiBadan),
      berat_badan: Number(beratBadan),
      sistole: Number(sistole),
      diastole: Number(diastole),
      gula_darah: Number(gulaDarah),
      buta_warna: butaWarna,
      riwayat_penyakit: riwayatPenyakit,
      golongan_darah: golonganDarah,
      suhu_tubuh: Number(suhuTubuh),
      denyut_nadi: Number(denyutNadi),
      respiration_rate: Number(respirationRate),
      spo2: Number(spO2),
      skala_nyeri: Number(skalaNyeri),
      alergi_obat: alergiObat,
      kondisi_psikologis: kondisiPsikologis,
      konsumsi_obat: konsumsiObat,
      tindakan_diberikan: tindakanDiberikan,
      obat_diberikan: obatDiberikan,
      catatan,
      hasil: finalHasil,
      rekomendasi: rekomendasi,
      booking_id: editingRecordId ? (editingBookingId || undefined) : (bookingId ? Number(bookingId) : undefined),
      sumber: bookingId ? 'klinik_kampus' : sumber,
      akhiri_sesi: akhiriSesi,
      eskalasi_psikolog: eskalasiPsikolog,
      psikolog_id: eskalasiPsikolog && psikologId ? Number(psikologId) : undefined,
      psikolog_slot_id: eskalasiPsikolog && psikologId && psikologSlotId ? Number(psikologSlotId) : undefined,
    };

    setSubmitting(true);
    try {
      if (editingRecordId) {
        await tenagaKesehatanService.updateMedicalRecord(editingRecordId, payload);
        toast.success('Rekam medis berhasil diubah.');
        setEditingRecordId(null);
        setActiveTab('history');
        loadData();
      } else {
        const screenRes = await tenagaKesehatanService.createScreening(id, payload);
        const createdScreeningId = screenRes.data?.id; // Assuming the API returns the created record

        // Create Rujukan Medis if checked
        if (eskalasiFaskes) {
          const finalFaskes = faskesTujuan === 'Lainnya' ? faskesTujuanLainnya : faskesTujuan;
          const finalAlasan = alasanRujukan === 'Lainnya' ? alasanRujukanLainnya : alasanRujukan;

          await rujukanService.createRujukan({
            self_screening_id: createdScreeningId,
            mahasiswa_id: patient?.id || Number(id),
            faskes_tujuan: finalFaskes,
            alasan_rujukan: finalAlasan,
            keluhan_utama: keluhanUtama,
            suhu_tubuh: Number(suhuTubuh),
            sistole: Number(sistole),
            diastole: Number(diastole),
            denyut_nadi: Number(denyutNadi),
            respiration_rate: Number(respirationRate),
            spo2: Number(spO2),
            diagnosis: diagnosisSementara,
            rekomendasi_asuransi: rekomendasiAsuransi
          });
        }

        toast.success('Pemeriksaan kesehatan berhasil disimpan!');

        // Reset form variables
        setRiwayatPenyakit('');
        setAlergiObat('');
        setTindakanDiberikan('');
        setObatDiberikan('');
        setCatatan('');
        setRekomendasi('');
        setEskalasiPsikolog(false);
        setEskalasiFaskes(false);
        setSumber('klinik_kampus');
        setDiagnosisSementara('');
        setKeluhanUtama('');
        setFaskesTujuan('Klinik UBK');
        setAlasanRujukan('Penanganan Lanjutan');

        // Load updated history list
        loadData();
        setActiveTab('history');
      }
    } catch (err) {
      alert(err.message || 'Gagal menyimpan pemeriksaan.');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusKesehatanColor = (status) => {
    if (!status) return 'bg-slate-100 text-slate-600 border-slate-200';
    const clean = status.toLowerCase();
    if (clean === 'kritis') return 'bg-rose-500/10 text-rose-600 border border-rose-500/25';
    if (clean === 'pantauan') return 'bg-amber-500/10 text-amber-600 border border-amber-500/25';
    return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/25';
  };

  const handleDownloadPDF = async (recordId) => {
    const toastId = toast.loading('Menyiapkan PDF Rekam Medis...');
    try {
      const API_URL = import.meta.env.VITE_API_URL || '/api';
      const blob = await fetchBlobWithAuth(`${API_URL}/tenagakes/medical-records/${recordId}/export-pdf`);

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const safeName = patient?.nama ? patient.nama.replace(/\s+/g, '_') : 'Pasien';
      link.download = `Rekam_Medis_${safeName}_${recordId}.pdf`;
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
    <PageContent>
      <DashboardHero
        title="Rekam Medis"
        highlightedTitle="Pasien"
        subtitle="Riwayat pemeriksaan, screening fisik, dan konsultasi kesehatan pasien"
        icon="medical_services"
        badges={[
          { label: 'Daftar Pasien', active: false },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/tenagakes/patients')}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-slate-600 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(6,81,237,0.15)] focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <span className="material-symbols-outlined text-[18px] transition-transform group-hover:-translate-x-1">arrow_back</span>
              Kembali
            </button>
            <div className="flex items-center rounded-xl bg-slate-100/80 p-1 shadow-inner border border-slate-200/60 backdrop-blur-sm">
              <button
                onClick={() => setActiveTab('history')}
                className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                  activeTab === 'history'
                    ? 'bg-white text-bku-primary shadow-[0_2px_8px_-2px_rgba(0,0,0,0.1)]'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">history</span>
                Riwayat
              </button>
              {(editingRecordId || (bookingId && bookingData?.status !== 'Selesai')) && canManageRecords && (
                <button
                  onClick={() => setActiveTab('new')}
                  className={`inline-flex items-center gap-2 rounded-lg px-5 py-2 text-xs font-bold transition-all ${
                    activeTab === 'new'
                      ? 'bg-bku-primary text-white shadow-[0_4px_12px_-2px_rgba(6,81,237,0.3)]'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {editingRecordId ? 'edit' : 'add_circle'}
                  </span>
                  {editingRecordId ? 'Edit Rekam Medis' : 'Screening Baru'}
                </button>
              )}
            </div>
            {bookingId && bookingData?.status !== 'Selesai' && canManageRecords && (
              <button
                onClick={handleMarkAsDone}
                disabled={submitting}
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-[0_4px_12px_-2px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.4)] disabled:opacity-50"
              >
                {submitting ? (
                  <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-[18px] transition-transform group-hover:scale-110">check_circle</span>
                )}
                Tandai Selesai
              </button>
            )}
          </div>
        }
      />

      {/* Grid Layout matching LiveExamination */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left Column: Patient Profile & Warnings */}
        {patient && (
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-6 shadow-sm sticky top-6">
              <div className="flex flex-col items-center text-center pb-6 border-b border-[var(--theme-border)] mb-6">
                <div className="size-20 rounded-[1.5rem] bg-[var(--theme-primary-light)]/20 text-[var(--theme-primary)] flex items-center justify-center font-black text-2xl uppercase mb-4 border border-[var(--theme-primary)]/20 shadow-inner">
                  {patient?.nama ? patient.nama.slice(0, 2) : 'MH'}
                </div>
                <h2 className="text-lg font-black text-[var(--theme-text)] leading-tight">{patient?.nama}</h2>
                <p className="text-xs font-bold text-[var(--theme-text-muted)] mt-1">{patient?.nim} &bull; {patient?.ProgramStudi?.nama}</p>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Golongan Darah</span>
                  <span className="text-lg font-black text-rose-500">{patient?.golongan_darah || 'O'}</span>
                </div>
                <div className="flex justify-between items-center bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Alergi Obat</span>
                  <span className="text-xs font-bold text-rose-500 text-right max-w-[120px] truncate">{patient?.alergi_obat || '-'}</span>
                </div>
                <div className="flex justify-between items-center bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)]">
                  <span className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Kontak</span>
                  <span className="text-xs font-bold text-slate-700 text-right">{patient?.no_hp || '-'}</span>
                </div>
              </div>

              {activeTab === 'new' && vitalsWarnings.length > 0 && (
                <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 space-y-3">
                  <h4 className="text-[10px] font-black uppercase text-rose-600 tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">warning</span> Alert Tanda Vital
                  </h4>
                  <div className="space-y-2">
                    {vitalsWarnings.map((warn, i) => (
                      <p key={i} className="text-[10px] font-bold text-rose-700 leading-snug">{warn.message}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Right Column: Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Loading / Error state */}
          {loading && (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
              <span className="material-symbols-outlined text-3xl animate-spin text-[var(--theme-primary)]/50">sync</span>
              <p className="text-[10px] font-black uppercase tracking-widest">Memuat rekam medis...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12 bg-rose-50 rounded-2xl border border-rose-200">
              <p className="text-xs text-rose-500 font-bold">{error}</p>
            </div>
          )}

          {/* Tab 1: Medical History History */}
      {!loading && !error && activeTab === 'history' && (
        <section className="bg-white/80 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 p-6 md:p-8 space-y-6 backdrop-blur-xl relative overflow-hidden">
          {/* Subtle background icon */}
          <span className="material-symbols-outlined absolute -right-10 -bottom-10 text-[200px] text-slate-50/50 rotate-[-15deg] pointer-events-none select-none">
            medical_information
          </span>

          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-slate-100 pb-5">
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-bku-primary">clinical_notes</span>
                Riwayat Pemeriksaan Fisik
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-1">Daftar lengkap riwayat diagnosa dan tindakan medis pasien</p>
            </div>
          </div>

          <div className="relative z-10">
            {records.length === 0 ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center text-center p-8 rounded-2xl bg-slate-50/50 border border-dashed border-slate-300">
                <div className="h-20 w-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-slate-400 text-4xl">medical_information</span>
                </div>
                <h4 className="text-sm font-black uppercase tracking-tight text-slate-700">Belum Ada Rekam Medis</h4>
                <p className="mt-2 max-w-md text-xs font-semibold text-slate-500 leading-relaxed">Pasien ini belum pernah melakukan screening fisik reguler di Klinik Kampus.</p>
                {bookingId && bookingData?.status !== 'Selesai' && canManageRecords && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="mt-6 rounded-xl bg-bku-primary px-6 py-3 text-xs font-bold text-white hover:bg-bku-hover transition-all shadow-lg shadow-bku-primary/30 flex items-center gap-2 hover:-translate-y-0.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">add_circle</span>
                    Mulai Screening Sekarang
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {records.map((rec) => {
                  const checkupDate = rec.tanggal ? new Date(rec.tanggal).toLocaleDateString('id-ID', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : '-';

                  return (
                    <div
                      key={rec.id}
                      className="group relative overflow-hidden border border-slate-200/80 rounded-2xl bg-white shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300"
                    >
                      {/* Left accent border */}
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-bku-primary to-indigo-400" />
                      
                      <div className="p-5 md:p-6 pl-6 md:pl-8 space-y-5">
                        {/* Visit Header */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                          <div className="flex items-start gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 shadow-inner">
                              <span className="material-symbols-outlined text-[24px]">local_hospital</span>
                            </div>
                            <div>
                              <div className="flex items-center gap-3">
                                <h4 className="text-sm font-black text-slate-800 uppercase tracking-tight">{rec.jenis_pemeriksaan}</h4>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${rec.sumber === 'kencana_screening'
                                    ? 'bg-purple-100 text-purple-700'
                                    : rec.sumber === 'klinik_kampus'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}>
                                  {rec.sumber ? rec.sumber.replace(/_/g, ' ') : 'MANDIRI'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 font-semibold mt-1 flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">event</span>
                                {checkupDate}
                                {rec.diperiksa_oleh && (
                                  <span className="ml-2 pl-2 border-l border-slate-300">Dr. {rec.diperiksa_oleh}</span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3">
                            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${getStatusKesehatanColor(rec.status_kesehatan)}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              Kondisi: {rec.status_kesehatan}
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl ${rec.hasil === 'Tidak Layak'
                                ? 'bg-rose-100 text-rose-700'
                                : rec.hasil === 'Perlu Perhatian'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              }`}>
                              Hasil: {rec.hasil}
                            </span>
                            
                            <div className="flex items-center gap-2 ml-auto lg:ml-2">
                              {canManageRecords && (
                                <button
                                  type="button"
                                  onClick={() => handleEditRecord(rec)}
                                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-200 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
                                  title="Edit Rekam Medis"
                                >
                                  <span className="material-symbols-outlined text-[16px]">edit</span>
                                </button>
                              )}
                              <button
                                onClick={() => handleDownloadPDF(rec.id)}
                                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 h-8 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all shadow-md shadow-slate-900/20 hover:-translate-y-0.5"
                              >
                                <span className="material-symbols-outlined text-[16px]">download</span> PDF
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Diagnostic details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tinggi/Berat</p>
                            <p className="text-xs font-bold text-slate-800 mt-1">{rec.tinggi_badan || '-'}<span className="text-[10px] font-semibold text-slate-400">cm</span> / {rec.berat_badan || '-'}<span className="text-[10px] font-semibold text-slate-400">kg</span></p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tensi Darah</p>
                            <p className={`text-xs font-bold mt-1 ${rec.sistole >= 140 || rec.diastole >= 90 ? 'text-rose-600' : 'text-slate-800'}`}>{rec.sistole || '-'}/{rec.diastole || '-'} <span className="text-[10px] font-semibold text-slate-400">mmHg</span></p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Suhu Tubuh</p>
                            <p className={`text-xs font-bold mt-1 ${rec.suhu_tubuh > 37.5 ? 'text-rose-600' : 'text-slate-800'}`}>
                              {rec.suhu_tubuh || '-'} <span className="text-[10px] font-semibold text-slate-400">°C</span>
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Denyut Nadi</p>
                            <p className="text-xs font-bold text-slate-800 mt-1">{rec.denyut_nadi || '-'} <span className="text-[10px] font-semibold text-slate-400">bpm</span></p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Respirasi</p>
                            <p className="text-xs font-bold text-slate-800 mt-1">{rec.respiration_rate || '-'} <span className="text-[10px] font-semibold text-slate-400">x/m</span></p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SpO2</p>
                            <p className={`text-xs font-bold mt-1 ${rec.spo2 < 95 ? 'text-rose-600' : 'text-slate-800'}`}>
                              {rec.spo2 || '-'} <span className="text-[10px] font-semibold text-slate-400">%</span>
                            </p>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center transition-colors group-hover:bg-indigo-50/50 group-hover:border-indigo-100">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gula Darah</p>
                            <p className="text-xs font-bold text-slate-800 mt-1">{rec.gula_darah || '-'} <span className="text-[10px] font-semibold text-slate-400">mg/dL</span></p>
                          </div>
                        </div>

                        {/* Subjective & Treatment Reports */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                                <span className="material-symbols-outlined text-[14px]">edit_note</span>
                              </span>
                              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Anamnesa & Catatan Klinis</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 min-h-[80px]">
                              <p className="text-sm text-slate-700 italic leading-relaxed">
                                {rec.catatan ? `"${rec.catatan}"` : 'Tidak ada catatan klinis spesifik.'}
                              </p>
                              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-200/60 pt-3 text-[11px] text-slate-600">
                                <div><strong className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider text-[9px]">Riwayat Penyakit</strong><span className="font-semibold text-slate-800">{rec.riwayat_penyakit || '-'}</span></div>
                                <div><strong className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider text-[9px]">Alergi</strong><span className="font-semibold text-rose-600">{rec.alergi_obat || '-'}</span></div>
                                <div><strong className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider text-[9px]">Status Psikologis</strong><span className="font-semibold text-slate-800">{rec.kondisi_psikologis || '-'}</span></div>
                                <div><strong className="text-slate-400 block mb-0.5 font-bold uppercase tracking-wider text-[9px]">Konsumsi Obat Terkini</strong><span className="font-semibold text-slate-800">{rec.konsumsi_obat || '-'}</span></div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                                <span className="material-symbols-outlined text-[14px]">prescriptions</span>
                              </span>
                              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Tindakan, Resep & Rekomendasi</p>
                            </div>
                            <div className="rounded-xl border border-emerald-100 bg-emerald-50/30 p-4 h-full flex flex-col justify-between">
                              <div className="space-y-3">
                                <div className="flex gap-3">
                                  <span className="material-symbols-outlined text-[18px] text-emerald-500 shrink-0">medical_services</span>
                                  <div>
                                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Tindakan Klinis</p>
                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{rec.tindakan_diberikan || '-'}</p>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <span className="material-symbols-outlined text-[18px] text-emerald-500 shrink-0">vaccines</span>
                                  <div>
                                    <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Obat / Farmasi</p>
                                    <p className="text-xs font-bold text-slate-800 mt-0.5">{rec.obat_diberikan || '-'}</p>
                                  </div>
                                </div>
                              </div>
                              <div className="mt-4 rounded-lg bg-emerald-100/50 p-3 border border-emerald-200/50">
                                <p className="text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-1 flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">stars</span> Rekomendasi Medis
                                </p>
                                <p className="text-sm font-bold text-emerald-900 leading-snug">{rec.rekomendasi || 'Istirahat yang cukup.'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tab 2: New Screening Form */}
      {!loading && !error && activeTab === 'new' && canManageRecords && (
        <form onSubmit={handleSubmitScreening} className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-6 shadow-sm space-y-8 relative">
          
          {/* Subtle background decoration */}
          <div className="absolute top-0 right-0 h-64 w-64 bg-emerald-500/5 rounded-full blur-3xl -z-10" />

          {/* Info Utama Screening */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
              <span className="material-symbols-outlined text-[16px]">info</span> Informasi Screening
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Tanggal Screening</label>
                <input type="date" required value={tanggal} onChange={(e) => setTanggal(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Jenis Pemeriksaan</label>
                <select value={jenisPemeriksaan} onChange={(e) => setJenisPemeriksaan(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]">
                  <option value="Pemeriksaan Reguler">Pemeriksaan Reguler</option>
                  <option value="Screening PKKMB">Screening PKKMB</option>
                  <option value="Pemeriksaan Massal">Pemeriksaan Massal</option>
                  <option value="Screening Atlet/Ormawa">Screening Atlet/Ormawa</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Sumber Pemeriksaan</label>
                <select value={sumber} onChange={(e) => setSumber(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]">
                  <option value="klinik_kampus">Klinik Kampus</option>
                  <option value="kencana_screening">Kencana Screening</option>
                  <option value="mandiri">Mandiri (Verifikasi)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Tanda Vital */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
              <span className="material-symbols-outlined text-[16px]">vital_signs</span> Tanda-Tanda Vital
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Tinggi (cm)</label>
                <input type="number" required value={tinggiBadan} onChange={e => setTinggiBadan(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Berat (kg)</label>
                <input type="number" required value={beratBadan} onChange={e => setBeratBadan(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Suhu (°C)</label>
                <input type="number" step="0.1" required value={suhuTubuh} onChange={e => setSuhuTubuh(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">SpO2 (%)</label>
                <input type="number" required value={spO2} onChange={e => setSpO2(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Sistole</label>
                <input type="number" required value={sistole} onChange={e => setSistole(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Diastole</label>
                <input type="number" required value={diastole} onChange={e => setDiastole(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Nadi (bpm)</label>
                <input type="number" required value={denyutNadi} onChange={e => setDenyutNadi(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Respirasi (x/m)</label>
                <input type="number" required value={respirationRate} onChange={e => setRespirationRate(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Gula Darah</label>
                <input type="number" required value={gulaDarah} onChange={e => setGulaDarah(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Golongan Darah</label>
                <select value={golonganDarah} onChange={e => setGolonganDarah(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]">
                  <option value="A">A</option>
                  <option value="B">B</option>
                  <option value="AB">AB</option>
                  <option value="O">O</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Tes Buta Warna</label>
                <select value={butaWarna} onChange={e => setButaWarna(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]">
                  <option value="Normal">Normal</option>
                  <option value="Parsial">Parsial</option>
                  <option value="Total">Total</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Skala Nyeri (0-10)</label>
                <input type="number" min="0" max="10" required value={skalaNyeri} onChange={e => setSkalaNyeri(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
              </div>
            </div>

            {bmi > 0 && (
              <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] flex items-center justify-between text-xs font-semibold text-[var(--theme-text-muted)] mt-2">
                <p>Indeks Massa Tubuh (IMT): <span className="font-bold text-[var(--theme-text)]">{bmi}</span></p>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${bmi >= 30
                    ? 'bg-rose-500/10 text-rose-600'
                    : bmi >= 25
                      ? 'bg-amber-500/10 text-amber-600'
                      : bmi >= 18.5
                        ? 'bg-emerald-500/10 text-emerald-600'
                        : 'bg-blue-500/10 text-blue-600'
                  }`}>
                  {bmiStatus}
                </span>
              </div>
            )}
          </section>

          {/* SOAP: Subjective & Objective */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
              <span className="material-symbols-outlined text-[16px]">clinical_notes</span> Anamnesa (Keluhan & Diagnosa)
            </h3>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Catatan UKS (SOAP) / Observasi Internal</label>
                <textarea 
                  rows={4} 
                  value={catatan} 
                  onChange={e => setCatatan(e.target.value)} 
                  placeholder="S: Pasien mengeluh pusing sejak pagi... O: Tekanan darah tinggi... A: Hipertensi... P: Istirahat..."
                  className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] p-3 text-sm font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] resize-none"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Alergi Obat Baru</label>
                  <input type="text" value={alergiObat} onChange={e => setAlergiObat(e.target.value)} placeholder="Misal: Paracetamol..." className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Riwayat Penyakit Terkait</label>
                  <input type="text" value={riwayatPenyakit} onChange={e => setRiwayatPenyakit(e.target.value)} placeholder="Misal: Asma, Maag..." className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Konsumsi Obat Terkini</label>
                  <input type="text" value={konsumsiObat} onChange={e => setKonsumsiObat(e.target.value)} placeholder="Obat rutin yang sedang dikonsumsi..." className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
              </div>
            </div>
          </section>

          {/* Tindakan & Resep */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
              <span className="material-symbols-outlined text-[16px]">prescriptions</span> Tindakan & Saran Medis
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Tindakan Klinis</label>
                <textarea 
                  rows={2} 
                  value={tindakanDiberikan} 
                  onChange={e => setTindakanDiberikan(e.target.value)} 
                  placeholder="Misal: Injeksi, Rawat Luka..."
                  className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] p-3 text-sm font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Resep Obat Diberikan</label>
                <textarea 
                  rows={2} 
                  value={obatDiberikan} 
                  onChange={e => setObatDiberikan(e.target.value)} 
                  placeholder="Misal: Paracetamol 500mg 3x1..."
                  className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] p-3 text-sm font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] resize-none"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Rekomendasi / Saran Medis</label>
                <textarea 
                  rows={2} 
                  value={rekomendasi} 
                  onChange={e => setRekomendasi(e.target.value)} 
                  placeholder="Saran medis untuk pasien..."
                  className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] p-3 text-sm font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] resize-none"
                />
              </div>
            </div>
          </section>

          {/* Rujukan & Status */}
          <section className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
              <span className="material-symbols-outlined text-[16px]">forward</span> Evaluasi & Rujukan
            </h3>

            <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl p-4 mb-4 space-y-4">
              
              {/* Evaluasi Psikologis */}
              <div className="space-y-1.5 border-b border-[var(--theme-border)] pb-4">
                <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] font-headline">Evaluasi Psikologis</label>
                <select
                  value={kondisiPsikologis}
                  onChange={(e) => setKondisiPsikologis(e.target.value)}
                  className="w-full h-11 px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl text-xs font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
                >
                  <option value="Normal">Normal (Stabil)</option>
                  <option value="Cemas">Cemas Ringan/Sedang</option>
                  <option value="Stres">Stres Akademik</option>
                  <option value="Perlu Rujukan Psikolog">Perlu Rujukan Psikolog</option>
                </select>

                <div className="pt-3">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={eskalasiPsikolog}
                      onChange={(e) => setEskalasiPsikolog(e.target.checked)}
                      className="mt-0.5 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] size-4"
                    />
                    <div>
                      <span className="text-xs font-bold text-[var(--theme-text)] uppercase tracking-wide">Rujuk ke Psikolog</span>
                      <p className="text-[10px] text-[var(--theme-text-muted)] font-semibold leading-4 mt-0.5">Kirim notifikasi eskalasi rujukan data konseling ke tim Psikolog kampus.</p>
                    </div>
                  </label>

                  {eskalasiPsikolog && (
                    <div className="mt-3 p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl space-y-3 animate-in slide-in-from-top-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Pilih Psikolog Tujuan (Opsional)</label>
                        <select
                          value={psikologId}
                          onChange={(e) => setPsikologId(e.target.value)}
                          className="w-full h-10 px-3 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-xs font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
                        >
                          <option value="">Semua Psikolog (Blast Notif)</option>
                          {psychologists.map(psi => (
                            <option key={psi.id} value={psi.id}>{psi.name} - {psi.specialization}</option>
                          ))}
                        </select>
                      </div>

                      {psikologId && (
                        <div className="pt-2 border-t border-[var(--theme-border)] space-y-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Jadwal Aktif Terdekat:</span>
                          {psikologSchedules.length > 0 ? (
                            <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-1">
                              {psikologSchedules.map(slot => (
                                <button
                                  key={slot.id}
                                  type="button"
                                  onClick={() => setPsikologSlotId(psikologSlotId === slot.id ? null : slot.id)}
                                  className={`border rounded-md p-1.5 text-[10px] font-medium transition-all text-left ${psikologSlotId === slot.id ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]' : 'bg-[var(--theme-bg)] border-[var(--theme-border)] text-[var(--theme-text)] hover:border-[var(--theme-primary)]/50'}`}
                                >
                                  <span className={`font-bold ${psikologSlotId === slot.id ? 'text-white' : 'text-[var(--theme-text)]'}`}>{slot.display_date}</span> ({slot.start}-{slot.end}) - {slot.location}
                                </button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-[var(--theme-text-muted)] italic">Tidak ada jadwal aktif.</p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <label className="flex items-center gap-3 cursor-pointer pt-2">
                <div className={`size-5 rounded flex items-center justify-center border transition-all ${eskalasiFaskes ? 'bg-[var(--theme-primary)] border-[var(--theme-primary)]' : 'border-[var(--theme-text-muted)]'}`}>
                  {eskalasiFaskes && <span className="material-symbols-outlined text-[14px] text-white font-black">check</span>}
                </div>
                <input type="checkbox" checked={eskalasiFaskes} onChange={e => setEskalasiFaskes(e.target.checked)} className="hidden" />
                <span className="text-sm font-bold text-[var(--theme-text)]">Rujuk Pasien ke Faskes Lanjutan (Rumah Sakit)</span>
              </label>
              
              {eskalasiFaskes && (
                <div className="mt-4 pt-4 border-t border-[var(--theme-border)] grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Faskes Tujuan</label>
                    <select
                      value={faskesTujuan}
                      onChange={(e) => setFaskesTujuan(e.target.value)}
                      className="w-full h-10 px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl text-xs font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
                    >
                      <option value="Klinik UBK">Klinik UBK</option>
                      <option value="RSUD">RSUD</option>
                      <option value="Puskesmas">Puskesmas</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    {faskesTujuan === 'Lainnya' && (
                      <input
                        type="text"
                        placeholder="Sebutkan nama Faskes..."
                        value={faskesTujuanLainnya}
                        onChange={(e) => setFaskesTujuanLainnya(e.target.value)}
                        className="w-full h-10 mt-2 px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl text-xs font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
                      />
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Alasan Rujukan</label>
                    <select
                      value={alasanRujukan}
                      onChange={(e) => setAlasanRujukan(e.target.value)}
                      className="w-full h-10 px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl text-xs font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
                    >
                      <option value="Penanganan Lanjutan">Penanganan Lanjutan</option>
                      <option value="Pemeriksaan Penunjang">Pemeriksaan Penunjang</option>
                      <option value="Gawat Darurat">Gawat Darurat</option>
                      <option value="Lainnya">Lainnya</option>
                    </select>
                    {alasanRujukan === 'Lainnya' && (
                      <input
                        type="text"
                        placeholder="Sebutkan alasan..."
                        value={alasanRujukanLainnya}
                        onChange={(e) => setAlasanRujukanLainnya(e.target.value)}
                        className="w-full h-10 mt-2 px-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl text-xs font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
                      />
                    )}
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Keluhan Utama (Penyerta Rujukan)</label>
                    <input type="text" required={eskalasiFaskes} value={keluhanUtama} onChange={e => setKeluhanUtama(e.target.value)} placeholder="Jelaskan keluhan utama pasien..." className="w-full h-10 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Diagnosis Sementara (Untuk Surat Rujukan)</label>
                    <input type="text" required={eskalasiFaskes} value={diagnosisSementara} onChange={e => setDiagnosisSementara(e.target.value)} placeholder="Otomatis mengambil dari catatan SOAP jika kosong..." className="w-full h-10 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Saran Asuransi (Klaim)</label>
                    <select
                      value={rekomendasiAsuransi}
                      onChange={(e) => setRekomendasiAsuransi(e.target.value)}
                      className="w-full h-10 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 text-xs font-semibold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]"
                    >
                      <option value="BKU_Assurance">BKU Assurance</option>
                      <option value="BPJS_Kesehatan">BPJS Kesehatan</option>
                      <option value="Asuransi_Swasta">Asuransi Swasta / Pribadi</option>
                      <option value="Mandiri">Mandiri / Tidak Menggunakan Asuransi</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Status Kesehatan Akhir</label>
                <select value={hasil} disabled={suhuTubuh > 38.0 || spO2 < 92} onChange={e => setHasil(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] disabled:opacity-75 disabled:bg-rose-50 disabled:text-rose-600 disabled:border-rose-200">
                  <option value="Layak Kegiatan">Layak Kegiatan (Sembuh/Ringan)</option>
                  <option value="Perlu Perhatian">Perlu Perhatian (Observasi)</option>
                  <option value="Tidak Layak">Tidak Layak (Sakit Parah/Menular)</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Akhiri Sesi Booking?</label>
                <select value={akhiriSesi} onChange={e => setAkhiriSesi(e.target.value === 'true')} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]">
                  <option value="true">Ya, Selesai (Pasien Pulang)</option>
                  <option value="false">Tidak (Pasien butuh kontrol lagi)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Submit Action */}
          <div className="pt-6 border-t border-[var(--theme-border)] flex gap-4">
            <button 
              type="button"
              onClick={() => setActiveTab('history')}
              className="px-6 py-3 rounded-xl border border-[var(--theme-border)] text-[var(--theme-text)] font-bold text-sm hover:bg-[var(--theme-bg)] transition-all"
            >
              Batal
            </button>
            <button 
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg disabled:opacity-50"
            >
              {submitting ? (
                <span className="material-symbols-outlined animate-spin">sync</span>
              ) : (
                <span className="material-symbols-outlined">save</span>
              )}
              {editingRecordId ? 'Simpan Perubahan' : 'Simpan & Rilis Rekam Medis'}
            </button>
          </div>
          
        </form>
      )}

        </div>
      </div>
    </PageContent>
  );
}
