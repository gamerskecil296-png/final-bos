import React, { useState, useEffect } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { motion, AnimatePresence } from 'framer-motion';
import { selfScreeningService } from '@/services/api';
import toast from 'react-hot-toast';

// Auto-injected Material Symbol fallbacks
const HealthIcon = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>medical_information</span>
);
const CheckCircle = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>
);
const Clock = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>
);
const Warning = ({ size, className, ...props }) => (
  <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>warning</span>
);

export default function SelfScreeningPage() {
  const [activeTab, setActiveTab] = useState('input'); // 'input' | 'riwayat'
  const [screenings, setScreenings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [form, setForm] = useState({
    keluhan_utama: '',
    skala_nyeri: 0,
    alergi_obat: '',
    konsumsi_obat: '',
  });

  // Fetch screenings
  const fetchScreenings = async () => {
    setLoading(true);
    try {
      const res = await selfScreeningService.getMyScreenings();
      if (res.status === 'success') {
        setScreenings(res.data || []);
      }
    } catch (err) {
      console.error('Error fetching screenings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScreenings();
  }, []);

  // Handle form input
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  // Handle skala nyeri slider
  const handleNyeriChange = (value) => {
    setForm(prev => ({ ...prev, skala_nyeri: parseInt(value) }));
  };

  // Submit screening
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.keluhan_utama.trim()) {
      toast.error('Keluhan utama wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      const res = await selfScreeningService.createScreening(form);
      if (res.status === 'success') {
        toast.success('Data screening berhasil disimpan!');

        // Reset form
        setForm({
          keluhan_utama: '',
          skala_nyeri: 0,
          alergi_obat: '',
          konsumsi_obat: '',
        });

        // Refresh list
        fetchScreenings();

        // Switch to riwayat tab to show result
        setActiveTab('riwayat');
      }
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan data screening');
    } finally {
      setSubmitting(false);
    }
  };

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // Get nyeri color
  const getNyeriColor = (value) => {
    if (value <= 3) return 'bg-emerald-500';
    if (value <= 6) return 'bg-amber-500';
    return 'bg-red-500';
  };

  // Get nyeri label
  const getNyeriLabel = (value) => {
    if (value === 0) return 'Tidak Sakit';
    if (value <= 3) return 'Ringan';
    if (value <= 6) return 'Sedang';
    if (value <= 8) return 'Berat';
    return 'Sangat Berat';
  };

  return (
    <PageContent className="font-body">
      <PageHeader 
        title="Self-Screening" 
        subtitle="Isi data subjektif/gejala sebelum melakukan kunjungan ke klinik" 
        icon="medical_information" 
        breadcrumbs={[
          { label: 'Student Hub', path: '/student/dashboard' },
          { label: 'Self-Screening' }
        ]} 
      />

      {/* Content */}
      <div className="w-full py-6 space-y-6">
        {/* Info Card */}
        <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200 rounded-xl p-4">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-teal-600">info</span>
            </div>
            <div>
              <h3 className="font-bold text-teal-800 text-sm">Patient Intake Flow</h3>
              <p className="text-xs text-teal-700 mt-1">
                Isi data subjektif di sini sebelum datang ke klinik. Petugas UKK akan melanjutkan dengan pemeriksaan objektif.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-surface rounded-xl p-1 shadow-sm border border-border">
          <button
            onClick={() => setActiveTab('input')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'input'
                ? 'bg-[var(--theme-primary)] text-white shadow-md'
                : 'text-slate-600 hover:bg-background'
            }`}
          >
            <span className="material-symbols-outlined text-lg">edit_note</span>
            Input Screening
          </button>
          <button
            onClick={() => setActiveTab('riwayat')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
              activeTab === 'riwayat'
                ? 'bg-[var(--theme-primary)] text-white shadow-md'
                : 'text-slate-600 hover:bg-background'
            }`}
          >
            <span className="material-symbols-outlined text-lg">history</span>
            Riwayat
            {screenings.length > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">{screenings.length}</span>
            )}
          </button>
        </div>

        {/* Input Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'input' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div className="bg-surface rounded-xl p-4 border border-border space-y-4">
                {/* Keluhan Utama */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Keluhan Utama <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="keluhan_utama"
                    value={form.keluhan_utama}
                    onChange={handleInputChange}
                    rows={4}
                    placeholder="Jelaskan apa yang Anda rasakan saat ini..."
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none resize-none bg-background text-[var(--theme-text)]"
                  />
                </div>

                {/* Skala Nyeri */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-2">
                    Skala Nyeri (0-10)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={form.skala_nyeri}
                      onChange={(e) => handleNyeriChange(e.target.value)}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[var(--theme-primary)]"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl ${getNyeriColor(form.skala_nyeri)} flex items-center justify-center`}>
                          <span className="text-white font-bold text-sm">{form.skala_nyeri}</span>
                        </div>
                        <span className="text-sm font-semibold text-slate-700">{getNyeriLabel(form.skala_nyeri)}</span>
                      </div>
                      <div className="flex gap-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
                          <button
                            key={val}
                            onClick={() => handleNyeriChange(val)}
                            className={`w-6 h-6 rounded-full text-xs font-bold transition-all ${
                              form.skala_nyeri === val
                                ? 'bg-[var(--theme-primary)] text-white'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Alergi Obat */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Alergi Obat <span className="text-slate-400 font-normal">(jika ada)</span>
                  </label>
                  <input
                    type="text"
                    name="alergi_obat"
                    value={form.alergi_obat}
                    onChange={handleInputChange}
                    placeholder="Contoh: Penicillin, Amoxicillin, dll"
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-background text-[var(--theme-text)]"
                  />
                </div>

                {/* Konsumsi Obat */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Konsumsi Obat Saat Ini <span className="text-slate-400 font-normal">(jika ada)</span>
                  </label>
                  <input
                    type="text"
                    name="konsumsi_obat"
                    value={form.konsumsi_obat}
                    onChange={handleInputChange}
                    placeholder="Contoh: Metformin 500mg 2x1, Amlodipine 10mg 1x1"
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-background text-[var(--theme-text)]"
                  />
                </div>

                {/* Warning */}
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Warning size={20} className="text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      <p className="font-bold">Penting:</p>
                      <p>Jika suhu tubuh {`>`} 37.5°C atau SpO2 {`<`} 95%, segera ke klinik untuk pemeriksaan lebih lanjut.</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="w-full py-3 bg-[var(--theme-primary)] text-white font-bold rounded-xl shadow-md hover:opacity-90 transition-all disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      Menyimpan...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined">save</span>
                      Simpan Data Screening
                    </span>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Riwayat Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'riwayat' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-surface rounded-xl p-4 border border-border animate-pulse">
                      <div className="h-4 bg-slate-200 rounded w-2/3 mb-2"></div>
                      <div className="h-3 bg-slate-100 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              ) : screenings.length === 0 ? (
                <div className="bg-surface rounded-xl p-8 border border-border text-center">
                  <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">medical_information</span>
                  </div>
                  <p className="text-slate-500 font-medium">Belum ada data screening</p>
                  <button
                    onClick={() => setActiveTab('input')}
                    className="mt-4 px-4 py-2 bg-teal-500 text-white text-sm font-bold rounded-lg"
                  >
                    Isi Screening Sekarang
                  </button>
                </div>
              ) : (
                screenings.map((screening) => (
                  <div key={screening.id} className="bg-surface rounded-xl p-4 border border-border">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {screening.is_completed_tk ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle size={12} />
                              Completed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700">
                              <Clock size={12} />
                              Pending
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">ID: #{screening.id}</p>
                      </div>
                      <p className="text-xs text-slate-500">{formatDate(screening.created_at)}</p>
                    </div>

                    <p className="text-sm text-slate-700 mb-3">{screening.keluhan_utama}</p>

                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Skala Nyeri</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={`w-6 h-6 rounded ${getNyeriColor(screening.skala_nyeri)} flex items-center justify-center`}>
                            <span className="text-white text-xs font-bold">{screening.skala_nyeri}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-600">{getNyeriLabel(screening.skala_nyeri)}</span>
                        </div>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-2">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">Alergi Obat</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1 truncate">
                          {screening.alergi_obat || 'Tidak ada'}
                        </p>
                      </div>
                    </div>

                    {screening.is_completed_tk && (
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-emerald-600">
                        <CheckCircle size={14} />
                        <span>Diverifikasi oleh Tenaga Kesehatan</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageContent>
  );
}