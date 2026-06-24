import React, { useEffect, useState } from 'react';
import { UI } from '@/constants/designSystem';
import { psychologistService } from '@/services/api';
import { DashboardHero } from '@/components/ui/dashboard';
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { usePermission } from '@/hooks/usePermission';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Brain = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>psychology</span>;
const Target = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>track_changes</span>;
const Sparkles = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>auto_awesome</span>;
const Heart = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>favorite</span>;

export default function AssessmentManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAssessment, setNewAssessment] = useState({ nama: '', kategori: 'Kesehatan Mental', deskripsi: '' });
  const [assessmentMeta, setAssessmentMeta] = useState({ verificationQueue: [], mentalScore: 0 });

  const { hasPermission } = usePermission();
  const canManageRecords = hasPermission('psychologist.medical_records.create') || hasPermission('psychologist.medical_records.update') || hasPermission('psychologist.medical_records.delete');

  const categoryStyle = {
    'Kesehatan Mental': { icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
    'Kepribadian': { icon: Brain, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
    'Minat Bakat': { icon: Target, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    'Lainnya': { icon: Sparkles, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  };
  const [categories, setCategories] = useState(['Kesehatan Mental', 'Kepribadian', 'Minat Bakat', 'Lainnya'].map((name) => ({ name, count: 0, ...categoryStyle[name] })));

  const filterChips = ['Semua', 'Kesehatan Mental', 'Kepribadian', 'Minat Bakat', 'Lainnya'];

  const [submissions, setSubmissions] = useState([]);

  useEffect(() => {
    let ignore = false;
    psychologistService.getAssessments().then((res) => {
      if (!ignore) {
        setSubmissions(res.data.submissions || []);
        setCategories((res.data.categories || []).map((cat) => ({ ...cat, ...(categoryStyle[cat.name] || categoryStyle.Lainnya) })));
        setAssessmentMeta({ verificationQueue: res.data.verification_queue || [], mentalScore: res.data.mental_score || 0 });
      }
    });
    return () => { ignore = true; };
  }, []);

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    await psychologistService.createAssessment(newAssessment);
    const res = await psychologistService.getAssessments();
    setSubmissions(res.data.submissions || []);
    setCategories((res.data.categories || []).map((cat) => ({ ...cat, ...(categoryStyle[cat.name] || categoryStyle.Lainnya) })));
    setAssessmentMeta({ verificationQueue: res.data.verification_queue || [], mentalScore: res.data.mental_score || 0 });
    setNewAssessment({ nama: '', kategori: 'Kesehatan Mental', deskripsi: '' });
    setIsModalOpen(false);
  };

  const filteredSubmissions = submissions.filter(sub => {
    const matchesCategory = selectedCategory === 'Semua' || sub.category === selectedCategory;
    const matchesSearch = (sub.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || (sub.assessment || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <>
      <div className="w-full relative space-y-6 scroll-smooth">

        <DashboardHero title="Manajemen" highlightedTitle="Asesmen" subtitle="Kelola kuesioner dan hasil asesmen awal dari mahasiswa sebelum memulai konseling." icon="assignment" badges={[{ label: 'Layanan Psikologis', active: false }]} />

        {/* Categories Stats Cards (4 Column Bento Grid) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-11 h-11 ${cat.bg} ${cat.color} rounded-[1rem] flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div className={`flex items-center gap-1 rounded-full ${cat.bg} border ${cat.border} px-2.5 py-0.5 text-[9px] font-black ${cat.color} uppercase tracking-widest`}>
                    AKTIF
                  </div>
                </div>

                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-5">{cat.name}</p>
                <p className="mt-1 text-3xl font-extrabold tracking-tight leading-none" style={{ color: 'var(--theme-text)' }}>{cat.count}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide mt-1.5">instrumen terdaftar</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 w-full">

          {/* Submissions List (Col 8) */}
          <div className="lg:col-span-8 space-y-6">

            {/* Search & Filter Chips Bento Card */}
            <div className="rounded-2xl border shadow-sm p-5 space-y-5" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-base shrink-0 transition-colors group-focus-within:text-primary">search</span>
                <input
                  type="text"
                  placeholder="Cari mahasiswa atau nama asesmen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 border rounded-2xl text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-primary/5 transition-all shadow-inner"
                  style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
                />
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {filterChips.map(chip => (
                  <button
                    key={chip}
                    onClick={() => setSelectedCategory(chip)}
                    className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300 ${selectedCategory === chip ? 'bg-primary text-white shadow-md shadow-primary/10' : 'bg-slate-50 text-slate-400 border border-slate-100/50 hover:bg-slate-100 hover:text-slate-600'}`}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>

            {/* Submissions Table Bento Card */}
            <div className="rounded-2xl border shadow-sm p-5" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50">
                <h3 className="text-xs font-black text-primary uppercase tracking-widest flex items-center gap-2">
                  <span className="material-symbols-outlined text-base shrink-0">analytics</span> Submisi {selectedCategory !== 'Semua' ? `: ${selectedCategory}` : 'Terbaru'}
                </h3>
                <button className="text-[9px] font-black text-primary hover:text-primary/80 uppercase tracking-widest hover:underline transition-colors">Lihat Semua</button>
              </div>

              <div className="space-y-3.5">
                {filteredSubmissions.length > 0 ? filteredSubmissions.map((sub) => (
                  <div key={sub.id} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50/50 border border-slate-100 hover:bg-white hover:shadow-md hover:border-slate-200/50 transition-all duration-300 group">
                    <div className={`w-11 h-11 rounded-[1.25rem] ${sub.color || 'bg-primary'} text-white flex items-center justify-center font-black text-xs group-hover:scale-105 transition-transform duration-300 shrink-0 shadow-sm overflow-hidden relative`}>
                      {sub.foto_url || sub.foto ? (
                        <img src={sub.foto_url || sub.foto} alt={sub.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-white/80 text-2xl shrink-0">person</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-bold text-slate-900 truncate leading-snug">{sub.name}</h5>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">{sub.assessment}</p>
                    </div>
                    <div className="text-right px-4 shrink-0">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Skor/Hasil</p>
                      <p className={`text-[10px] font-black uppercase mt-1 ${sub.score === 'Tinggi' || sub.score === 'Indikasi Depresi' || sub.score === 'Risiko Tinggi' ? 'text-rose-500' : 'text-primary'}`}>{sub.score}</p>
                    </div>
                    <button className="w-8 h-8 rounded-lg bg-white border border-slate-100 flex items-center justify-center text-slate-300 hover:text-primary hover:bg-primary/5 hover:border-primary/20 transition-all duration-300 shrink-0">
                      <span className="material-symbols-outlined text-base shrink-0">chevron_right</span>
                    </button>
                  </div>
                )) : (
                  <div className="py-20 text-center">
                    <span className="material-symbols-outlined text-slate-300 text-4xl mb-3">inbox</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada data ditemukan</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Analytics Sidebar (Col 4) */}
          <div className="lg:col-span-4 space-y-6">

            {/* Average Mental Score Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-bku-primary via-[#0b338f] to-[#003B95] p-5 text-white shadow-xl shadow-blue-900/10 border border-white/5">
              <div className="absolute -right-8 -top-5 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10">
                <span className="material-symbols-outlined text-white/60 mb-4 text-2xl shrink-0">analytics</span>
                <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-300 mb-2">Rata-rata Skor Mental</h4>
                <p className="text-4xl font-extrabold tracking-tight mb-4 leading-none">{assessmentMeta.mentalScore}</p>
                <div className="h-1.5 bg-white/20 rounded-full overflow-hidden mb-2">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: '75%' }}></div>
                </div>
                <p className="text-[8px] font-bold uppercase tracking-widest text-slate-300">Dihitung dari skor asesmen tersimpan</p>
              </div>
              <Brain size={120} className="absolute -right-8 -bottom-8 text-white/5 pointer-events-none" />
            </div>

            {/* Verification Queue Bento Card */}
            <div className="rounded-2xl border shadow-sm p-5 space-y-5" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <h3 className="text-[10px] font-black text-primary uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-50">
                <span className="material-symbols-outlined text-base shrink-0">schedule</span> Antrean Verifikasi
              </h3>
              <div className="space-y-3.5">
                {assessmentMeta.verificationQueue.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100 hover:bg-slate-50 transition-all duration-300">
                    <div className="size-2 bg-amber-400 rounded-full animate-pulse"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-slate-800 truncate leading-none">{item.name}</p>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider mt-1">{item.count} data menunggu</p>
                    </div>
                    {canManageRecords && (
                      <button className="text-[8px] font-black text-primary hover:text-primary/80 uppercase tracking-widest transition-colors shrink-0">Verifikasi</button>
                    )}
                  </div>
                ))}
                {assessmentMeta.verificationQueue.length === 0 && (
                  <div className="py-6 text-center">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tidak ada antrean</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- ADD ASSESSMENT MODAL --- */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen} maxWidth="max-w-lg">
        <DialogHeader className="bg-slate-50/50 border-b border-slate-100 flex-shrink-0 relative">
          <div className="pr-8">
            <DialogTitle>Asesmen Baru</DialogTitle>
            <DialogDescription className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Konfigurasi Instrumen Tes</DialogDescription>
          </div>
        </DialogHeader>

        <form onSubmit={handleCreateAssessment} className="flex flex-col">
          <div className="p-6 md:p-8 space-y-6 max-h-[50vh] overflow-y-auto no-scrollbar">
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Nama Instrumen</label>
                <input
                  required
                  value={newAssessment.nama}
                  onChange={(e) => setNewAssessment({ ...newAssessment, nama: e.target.value })}
                  className="w-full border rounded-2xl px-5 py-3.5 text-xs font-bold placeholder-slate-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                  style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  placeholder="Contoh: Tes Kecemasan DASS-21"
                />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Kategori</label>
                <select
                  value={newAssessment.kategori}
                  onChange={(e) => setNewAssessment({ ...newAssessment, kategori: e.target.value })}
                  className="w-full border rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-primary/5 transition-all outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                >
                  {categories.map(c => <option key={c.name}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block">Deskripsi Singkat</label>
                <textarea
                  value={newAssessment.deskripsi}
                  onChange={(e) => setNewAssessment({ ...newAssessment, deskripsi: e.target.value })}
                  className="w-full border rounded-2xl px-5 py-3.5 text-xs font-medium placeholder-slate-400 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-primary/5 transition-all outline-none h-24 resize-none"
                  style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)', color: 'var(--theme-text)' }}
                  placeholder="Jelaskan tujuan dan fungsi tes ini secara singkat..."
                />
              </div>
            </div>
          </div>

          <DialogFooter className="bg-slate-50/20 border-t border-slate-100/60 shrink-0">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-initial px-5 py-3 border hover:bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all" style={{ borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}>Batal</button>
            <button type="submit" className="flex-2 sm:flex-initial bg-primary text-white px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 flex items-center justify-center gap-2 hover:bg-primary/95 transition-all">
              <span className="material-symbols-outlined text-base shrink-0">save</span> Publikasikan Tes
            </button>
          </DialogFooter>
        </form>
      </Dialog>
    </>
  );
}


