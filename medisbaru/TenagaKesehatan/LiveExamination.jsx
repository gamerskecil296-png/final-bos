import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { tenagaKesehatanService, rujukanService } from '../../services/api';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import toast from 'react-hot-toast';

export default function LiveExamination() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const bookingId = searchParams.get('booking_id');
  const patientId = searchParams.get('patient_id');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [patient, setPatient] = useState(null);
  const [bookingData, setBookingData] = useState(null);

  // Form States
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
  
  // Vitals
  const [suhuTubuh, setSuhuTubuh] = useState(36.5);
  const [denyutNadi, setDenyutNadi] = useState(80);
  const [respirationRate, setRespirationRate] = useState(20);
  const [spO2, setSpO2] = useState(98);
  const [skalaNyeri, setSkalaNyeri] = useState(0);
  const [alergiObat, setAlergiObat] = useState('');
  const [konsumsiObat, setKonsumsiObat] = useState('');

  // Psikologis & Rujukan Psikolog
  const [kondisiPsikologis, setKondisiPsikologis] = useState('Normal');
  const [eskalasiPsikolog, setEskalasiPsikolog] = useState(false);
  const [psikologId, setPsikologId] = useState('');
  const [psikologSchedules, setPsikologSchedules] = useState([]);
  const [psikologSlotId, setPsikologSlotId] = useState(null);
  const [psychologists, setPsychologists] = useState([]);

  // Treatment & Recommendations
  const [tindakanDiberikan, setTindakanDiberikan] = useState('');
  const [obatDiberikan, setObatDiberikan] = useState('');
  const [catatan, setCatatan] = useState('');
  const [hasil, setHasil] = useState('Layak Kegiatan'); // Layak Kegiatan / Perlu Perhatian / Tidak Layak
  const [rekomendasi, setRekomendasi] = useState('');

  // Rujukan
  const [eskalasiFaskes, setEskalasiFaskes] = useState(false);
  const [faskesTujuan, setFaskesTujuan] = useState('Klinik UBK');
  const [alasanRujukan, setAlasanRujukan] = useState('Penanganan Lanjutan');
  const [diagnosisSementara, setDiagnosisSementara] = useState('');
  const [keluhanUtama, setKeluhanUtama] = useState('');
  
  const [akhiriSesi, setAkhiriSesi] = useState(true);

  useEffect(() => {
    // If no params, don't load data, just let it render the empty state
    if (!bookingId || !patientId || bookingId === 'undefined' || patientId === 'undefined') {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      try {
        const [patientRes, bookingRes] = await Promise.all([
          tenagaKesehatanService.getMedicalRecord(patientId),
          tenagaKesehatanService.getBookingDetail(bookingId)
        ]);

        if (patientRes.data?.patient) {
          setPatient(patientRes.data.patient);
          if (patientRes.data.patient.golongan_darah) {
            setGolonganDarah(patientRes.data.patient.golongan_darah);
          }
          if (patientRes.data.patient.alergi_obat) {
            setAlergiObat(patientRes.data.patient.alergi_obat);
          }
        }

        if (bookingRes.data) {
          setBookingData(bookingRes.data);
          // Pre-fill keluhan utama dari note booking
          if (bookingRes.data.note) {
            setCatatan(`Keluhan Awal: ${bookingRes.data.note}\n\n`);
            setKeluhanUtama(bookingRes.data.note);
          }
        }
      } catch (err) {
        toast.error('Gagal memuat data pasien.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [bookingId, patientId, navigate]);

  const bmi = useMemo(() => {
    const heightInMeter = tinggiBadan / 100;
    if (heightInMeter <= 0) return 0;
    return Number((beratBadan / (heightInMeter * heightInMeter)).toFixed(1));
  }, [tinggiBadan, beratBadan]);

  const vitalsWarnings = useMemo(() => {
    const warnings = [];
    if (suhuTubuh > 38.0) warnings.push({ type: 'danger', message: '🚨 Suhu tubuh sangat tinggi (>38.0°C). Indikasi demam tinggi (Kritis).' });
    else if (suhuTubuh > 37.5) warnings.push({ type: 'warning', message: '⚠️ Suhu tubuh di atas normal (>37.5°C).' });
    
    if (spO2 < 92) warnings.push({ type: 'danger', message: '🚨 Saturasi Oksigen kritis (<92%). Indikasi hipoksia berat!' });
    else if (spO2 < 95) warnings.push({ type: 'warning', message: '⚠️ Saturasi Oksigen rendah (<95%).' });
    
    if (sistole >= 140 || diastole >= 90) warnings.push({ type: 'danger', message: '🚨 Tekanan darah tergolong Hipertensi Tingkat 1/2 (≥140/90 mmHg).' });
    else if (sistole < 90 || diastole < 60) warnings.push({ type: 'warning', message: '⚠️ Tekanan darah tergolong Hipotensi (<90/60 mmHg).' });
    
    return warnings;
  }, [suhuTubuh, spO2, sistole, diastole]);

  useEffect(() => {
    if (suhuTubuh > 38.0 || spO2 < 92) setHasil('Tidak Layak');
  }, [suhuTubuh, spO2]);

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

  useEffect(() => {
    if (kondisiPsikologis === 'Perlu Rujukan Psikolog') {
      setEskalasiPsikolog(true);
    }
  }, [kondisiPsikologis]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let finalHasil = hasil;
      if (suhuTubuh > 38.0 || spO2 < 92) finalHasil = 'Tidak Layak';

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
        konsumsi_obat: konsumsiObat,
        kondisi_psikologis: kondisiPsikologis,
        eskalasi_psikolog: eskalasiPsikolog,
        psikolog_id: eskalasiPsikolog && psikologId ? Number(psikologId) : undefined,
        psikolog_slot_id: eskalasiPsikolog && psikologId && psikologSlotId ? Number(psikologSlotId) : undefined,
        tindakan_diberikan: tindakanDiberikan,
        obat_diberikan: obatDiberikan,
        catatan,
        hasil: finalHasil,
        rekomendasi: rekomendasi,
        booking_id: Number(bookingId),
        sumber: 'klinik_kampus',
        akhiri_sesi: akhiriSesi,
      };

      // 1. Create Screening / EMR
      const screenRes = await tenagaKesehatanService.createScreening(patientId, payload);
      
      // 2. Rujukan jika dicentang
      if (eskalasiFaskes) {
        await rujukanService.createRujukan({
          self_screening_id: screenRes.data?.id,
          mahasiswa_id: Number(patientId),
          faskes_tujuan: faskesTujuan,
          alasan_rujukan: alasanRujukan,
          keluhan_utama: keluhanUtama || catatan,
          suhu_tubuh: Number(suhuTubuh),
          sistole: Number(sistole),
          diastole: Number(diastole),
          denyut_nadi: Number(denyutNadi),
          respiration_rate: Number(respirationRate),
          spo2: Number(spO2),
          diagnosis: diagnosisSementara || catatan,
          rekomendasi_asuransi: 'BKU_Assurance'
        });
      }

      // 3. Update Booking Status to Selesai
      await tenagaKesehatanService.updateBookingStatus(bookingId, 'Selesai');

      toast.success('Pemeriksaan selesai, data berhasil disimpan!');
      navigate('/tenagakes/bookings'); // Kembali ke antrean
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan pemeriksaan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-4xl animate-spin text-[var(--theme-primary)]">sync</span>
        <p className="text-sm font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">Memuat Data Pasien...</p>
      </div>
    );
  }

  if (!bookingId || !patientId || bookingId === 'undefined' || patientId === 'undefined') {
    return (
      <PageContent>
        <DashboardHero
          title="Pemeriksaan Medis Live"
          highlightedTitle="Offline"
          subtitle="Modul pemeriksaan fisik dan rekam medis khusus pasien pendaftaran manual (Walk-in)."
          icon="monitor_heart"
        />
        <div className="flex min-h-[400px] flex-col items-center justify-center text-center p-8 bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm">
          <div className="size-20 rounded-full bg-[var(--theme-primary-light)]/20 text-[var(--theme-primary)] flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-4xl">person_search</span>
          </div>
          <h2 className="text-xl font-black text-[var(--theme-text)] mb-2">Pilih Pasien Terlebih Dahulu</h2>
          <p className="text-sm font-medium text-[var(--theme-text-muted)] max-w-md mb-8">
            Halaman pemeriksaan langsung ini membutuhkan data pasien. Silakan pilih pasien dari daftar antrean klinik.
          </p>
          <button 
            onClick={() => navigate('/tenagakes/bookings')}
            className="h-12 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm flex items-center gap-2 transition-all shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">list_alt</span>
            Buka Manajemen Antrean
          </button>
        </div>
      </PageContent>
    );
  }

  return (
    <PageContent>
      <div className="flex items-center gap-4 mb-6">
        <button 
          onClick={() => navigate(-1)}
          className="size-10 rounded-xl bg-[var(--theme-surface)] hover:bg-[var(--theme-border)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-text)] transition-all shadow-sm"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-2xl font-black text-[var(--theme-text)] flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-500 animate-pulse">monitor_heart</span> 
            Pemeriksaan Medis Live (Offline)
          </h1>
          <p className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Sesi Manual Sedang Berlangsung</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Patient Profile & Warnings */}
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
                <span className="text-lg font-black text-rose-500">{golonganDarah || 'O'}</span>
              </div>
              <div className="flex justify-between items-center bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)]">
                <span className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Alergi Obat</span>
                <span className="text-xs font-bold text-rose-500 text-right max-w-[120px] truncate">{alergiObat || '-'}</span>
              </div>
            </div>

            {vitalsWarnings.length > 0 && (
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

        {/* Right Column: Medical Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-6 shadow-sm space-y-8">
            
            {/* Tanda Vital */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
                <span className="material-symbols-outlined text-[16px]">vital_signs</span> Tanda-Tanda Vital
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Tinggi (cm)</label>
                  <input type="number" value={tinggiBadan} onChange={e => setTinggiBadan(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Berat (kg)</label>
                  <input type="number" value={beratBadan} onChange={e => setBeratBadan(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Suhu (°C)</label>
                  <input type="number" step="0.1" value={suhuTubuh} onChange={e => setSuhuTubuh(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">SpO2 (%)</label>
                  <input type="number" value={spO2} onChange={e => setSpO2(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Sistole</label>
                  <input type="number" value={sistole} onChange={e => setSistole(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Diastole</label>
                  <input type="number" value={diastole} onChange={e => setDiastole(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Nadi (bpm)</label>
                  <input type="number" value={denyutNadi} onChange={e => setDenyutNadi(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Gula Darah</label>
                  <input type="number" value={gulaDarah} onChange={e => setGulaDarah(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                </div>
              </div>
            </section>

            {/* SOAP: Subjective & Objective */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
                <span className="material-symbols-outlined text-[16px]">clinical_notes</span> Anamnesa (Keluhan & Diagnosa)
              </h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Keluhan Pasien & Pemeriksaan Fisik (SOAP)</label>
                  <textarea 
                    rows={4} 
                    value={catatan} 
                    onChange={e => setCatatan(e.target.value)} 
                    placeholder="S: Pasien mengeluh pusing sejak pagi... O: Tekanan darah tinggi... A: Hipertensi... P: Istirahat..."
                    className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] p-3 text-sm font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Alergi Obat Baru</label>
                    <input type="text" value={alergiObat} onChange={e => setAlergiObat(e.target.value)} placeholder="Misal: Paracetamol..." className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Riwayat Penyakit Terkait</label>
                    <input type="text" value={riwayatPenyakit} onChange={e => setRiwayatPenyakit(e.target.value)} placeholder="Misal: Asma, Maag..." className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                  </div>
                </div>
              </div>
            </section>

            {/* Tindakan & Resep */}
            <section className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] flex items-center gap-2 border-b border-[var(--theme-border)] pb-2">
                <span className="material-symbols-outlined text-[16px]">prescriptions</span> Tindakan & Resep Obat
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Tindakan Klinis</label>
                  <textarea 
                    rows={3} 
                    value={tindakanDiberikan} 
                    onChange={e => setTindakanDiberikan(e.target.value)} 
                    placeholder="Misal: Injeksi, Rawat Luka..."
                    className="w-full rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] p-3 text-sm font-medium text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)] resize-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Resep Obat Diberikan</label>
                  <textarea 
                    rows={3} 
                    value={obatDiberikan} 
                    onChange={e => setObatDiberikan(e.target.value)} 
                    placeholder="Misal: Paracetamol 500mg 3x1..."
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
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-headline">Evaluasi Psikologis</label>
                  <select
                    value={kondisiPsikologis}
                    onChange={(e) => setKondisiPsikologis(e.target.value)}
                    className="w-full h-11 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-bku-primary focus:bg-white"
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
                        className="mt-0.5 rounded text-bku-primary focus:ring-bku-primary size-4"
                      />
                      <div>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Rujuk ke Psikolog</span>
                        <p className="text-[10px] text-slate-400 font-semibold leading-4 mt-0.5">Kirim notifikasi eskalasi rujukan data konseling ke tim Psikolog kampus.</p>
                      </div>
                    </label>

                    {eskalasiPsikolog && (
                      <div className="mt-3 p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-3 animate-in slide-in-from-top-2">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Psikolog Tujuan (Opsional)</label>
                          <select
                            value={psikologId}
                            onChange={(e) => setPsikologId(e.target.value)}
                            className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-bku-primary"
                          >
                            <option value="">Semua Psikolog (Blast Notif)</option>
                            {psychologists.map(psi => (
                              <option key={psi.id} value={psi.id}>{psi.name} - {psi.specialization}</option>
                            ))}
                          </select>
                        </div>

                        {psikologId && (
                          <div className="pt-2 border-t border-slate-200 space-y-2">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Jadwal Aktif Terdekat:</span>
                            {psikologSchedules.length > 0 ? (
                              <div className="flex flex-wrap gap-2 max-h-[100px] overflow-y-auto pr-1">
                                {psikologSchedules.map(slot => (
                                  <button
                                    key={slot.id}
                                    type="button"
                                    onClick={() => setPsikologSlotId(psikologSlotId === slot.id ? null : slot.id)}
                                    className={`border rounded-md p-1.5 text-[10px] font-medium transition-all text-left ${psikologSlotId === slot.id ? 'bg-bku-primary text-white border-bku-primary' : 'bg-white border-slate-200 text-slate-600 hover:border-bku-primary/50'}`}
                                  >
                                    <span className={`font-bold ${psikologSlotId === slot.id ? 'text-white' : 'text-slate-800'}`}>{slot.display_date}</span> ({slot.start}-{slot.end}) - {slot.location}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-[10px] text-slate-400 italic">Tidak ada jadwal aktif.</p>
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
                      <input type="text" value={faskesTujuan} onChange={e => setFaskesTujuan(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Alasan Rujukan</label>
                      <input type="text" value={alasanRujukan} onChange={e => setAlasanRujukan(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Diagnosis Sementara (Untuk Surat Rujukan)</label>
                      <input type="text" value={diagnosisSementara} onChange={e => setDiagnosisSementara(e.target.value)} placeholder="Otomatis mengambil dari catatan SOAP jika kosong..." className="w-full h-10 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]" />
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">Status Kesehatan Akhir</label>
                  <select value={hasil} onChange={e => setHasil(e.target.value)} className="w-full h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-3 text-sm font-bold text-[var(--theme-text)] outline-none focus:border-[var(--theme-primary)]">
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
                onClick={() => navigate('/tenagakes/bookings')}
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
                Simpan & Akhiri Sesi
              </button>
            </div>
            
          </form>
        </div>
      </div>
    </PageContent>
  );
}
