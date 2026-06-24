import React, { useState, useEffect } from 'react';
import useThemeStore from '@/store/useThemeStore';
import { adminService } from '@/services/api';
import ThemePreviewModal from './ThemePreviewModal';
import { toast } from 'react-hot-toast';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

const GOOGLE_FONTS = [
  'Plus Jakarta Sans',
  'Poppins',
  'Outfit',
  'Montserrat',
  'Inter',
  'Roboto',
  'Open Sans',
  'Lato',
  'Nunito',
  'Raleway',
  'Ubuntu',
  'Quicksand',
  'Josefin Sans',
  'DM Sans',
  'Space Grotesk',
];

export default function ThemeTypography() {
  const { previewTheme, revertPreview, fetchTheme } = useThemeStore();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // Load preview fonts dynamically in head so they render correctly in the visual pickers
  useEffect(() => {
    GOOGLE_FONTS.forEach(font => {
      const id = `google-font-preview-${font.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
    });

    loadTheme();
    return () => revertPreview();
  }, []);

  const loadTheme = async () => {
    setLoading(true);
    try {
      const data = await fetchTheme();
      if (data) setFormData(data);
    } catch {
      showToast('error', 'Gagal memuat pengaturan tipografi');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    previewTheme({ [field]: value });
  };

  const handleReset = async () => {
    setIsConfirmOpen(false);
    try {
      const res = await adminService.resetTheme();
      if (res.success) {
        showToast('success', 'Tipografi berhasil di-reset');
        const data = await fetchTheme();
        if (data) setFormData(data);
      }
    } catch {
      showToast('error', 'Gagal mereset');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await adminService.updateTheme(formData);
      if (res.success) {
        showToast('success', 'Tipografi berhasil disimpan');
        await fetchTheme();
      }
    } catch (err) {
      showToast('error', err.message || 'Gagal menyimpan');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !formData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Memuat...</p>
        </div>
      </div>
    );
  }

  const fontHeadline = formData.font_headline || 'Plus Jakarta Sans';
  const fontBody = formData.font_body || 'Inter';

  return (
    <div className="space-y-6">


      {/* Local Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500">text_fields</span>
            Tipografi
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Font dan gaya teks untuk heading dan body</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsConfirmOpen(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:bg-slate-50"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            Reset
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:bg-slate-50 flex items-center gap-1"
            style={{ color: 'var(--theme-text-muted)' }}
          >
            <span className="material-symbols-outlined text-sm">visibility</span>
            Preview
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90 flex items-center gap-1.5"
            style={{ backgroundColor: 'var(--theme-primary)' }}
          >
            {isSaving ? (
              <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            ) : (
              <span className="material-symbols-outlined text-sm">save</span>
            )}
            Simpan
          </button>
        </div>
      </div>

        {/* Preview Modal */}
        <ThemePreviewModal isOpen={showPreview} onClose={() => setShowPreview(false)} theme={formData} />

        <DeleteConfirmModal
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleReset}
          title="Reset Tipografi?"
          description="Apakah Anda yakin ingin mengembalikan pengaturan tipografi ke default bawaan sistem? Perubahan ini akan menggantikan konfigurasi Anda saat ini."
          confirmText="YA, RESET"
          confirmClassName="bg-[var(--theme-primary)] hover:opacity-90 text-white"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Section: Font Headline Picker */}
          <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">title</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Font Judul (Heading)</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Untuk H1, H2, H3, H4 dan heading navigasi</p>
              </div>
            </div>

            <div className="mb-5 flex-1">
              <label className="text-xs font-bold block mb-3 text-slate-500 uppercase tracking-wider">Pilih Font Judul</label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
                {GOOGLE_FONTS.map((font) => {
                  const isSelected = formData.font_headline === font;
                  return (
                    <button
                      key={font}
                      type="button"
                      onClick={() => handleChange('font_headline', font)}
                      className={`relative p-3 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-24 ${
                        isSelected 
                          ? 'bg-white shadow-sm border-slate-400' 
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                      style={{
                        borderColor: isSelected ? 'var(--theme-primary)' : '',
                        borderWidth: isSelected ? '2px' : '1px',
                      }}
                    >
                      <span 
                        className="text-2xl font-bold block mb-1" 
                        style={{ fontFamily: `'${font}', sans-serif` }}
                      >
                        Aa
                      </span>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold truncate pr-2 text-slate-700">
                          {font}
                        </span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-xs font-bold shrink-0" style={{ color: 'var(--theme-primary)' }}>
                            check_circle
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview Card */}
            <div className="p-4 rounded-xl border border-slate-100 mt-auto" style={{ backgroundColor: 'var(--theme-bg)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--theme-text-muted)' }}>Pratinjau Judul</p>
              <div className="space-y-2">
                <p className="text-2xl font-extrabold tracking-tight leading-none" style={{ fontFamily: `'${fontHeadline}', sans-serif`, color: 'var(--theme-h1)' }}>
                  Aktivitas Akademik BKU Hub
                </p>
                <p className="text-base font-semibold" style={{ fontFamily: `'${fontHeadline}', sans-serif`, color: 'var(--theme-h2)' }}>
                  Data Mahasiswa Aktif Angkatan 2026
                </p>
              </div>
            </div>
          </section>

          {/* Section: Font Body Picker */}
          <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-text)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">notes</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Font Isi (Body)</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Untuk isi teks, tabel, form, paragraf, dan tombol</p>
              </div>
            </div>

            <div className="mb-5 flex-1">
              <label className="text-xs font-bold block mb-3 text-slate-500 uppercase tracking-wider">Pilih Font Isi</label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
                {GOOGLE_FONTS.map((font) => {
                  const isSelected = formData.font_body === font;
                  return (
                    <button
                      key={font}
                      type="button"
                      onClick={() => handleChange('font_body', font)}
                      className={`relative p-3 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between h-24 ${
                        isSelected 
                          ? 'bg-white shadow-sm border-slate-400' 
                          : 'bg-white border-slate-200/80 hover:bg-slate-50'
                      }`}
                      style={{
                        borderColor: isSelected ? 'var(--theme-primary)' : '',
                        borderWidth: isSelected ? '2px' : '1px',
                      }}
                    >
                      <span 
                        className="text-lg block mb-1 text-slate-500 font-medium" 
                        style={{ fontFamily: `'${font}', sans-serif` }}
                      >
                        Aa Bb Cc
                      </span>
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] font-bold truncate pr-2 text-slate-700">
                          {font}
                        </span>
                        {isSelected && (
                          <span className="material-symbols-outlined text-xs font-bold shrink-0" style={{ color: 'var(--theme-primary)' }}>
                            check_circle
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preview Card */}
            <div className="p-4 rounded-xl border border-slate-100 mt-auto" style={{ backgroundColor: 'var(--theme-bg)' }}>
              <p className="text-[9px] font-black uppercase tracking-widest mb-3" style={{ color: 'var(--theme-text-muted)' }}>Pratinjau Paragraf</p>
              <div className="space-y-2">
                <p className="text-xs leading-relaxed" style={{ fontFamily: `'${fontBody}', sans-serif`, color: 'var(--theme-text)' }}>
                  Universitas Bhakti Kencana berkomitmen untuk memberikan pendidikan terbaik bagi generasi bangsa. Sistem Informasi Akademik (Siakad) ini dirancang untuk memudahkan manajemen perkuliahan dan administrasi.
                </p>
                <p className="text-[10px] font-medium" style={{ fontFamily: `'${fontBody}', sans-serif`, color: 'var(--theme-text-muted)' }}>
                  abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 1234567890
                </p>
              </div>
            </div>
          </section>

          {/* Section: Typography Scale */}
          <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 xl:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">format_size</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Skala Tipografi & Penerapan</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Ukuran teks standar yang digunakan di seluruh portal</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Display (H1)', size: '1.875rem', weight: '800', isHeading: true },
                { label: 'Heading 1 (H2)', size: '1.5rem', weight: '700', isHeading: true },
                { label: 'Heading 2 (H3)', size: '1.25rem', weight: '600', isHeading: true },
                { label: 'Heading 3 (H4)', size: '1.125rem', weight: '600', isHeading: true },
                { label: 'Body Large', size: '1rem', weight: '500', isHeading: false },
                { label: 'Body Text', size: '0.875rem', weight: '400', isHeading: false },
                { label: 'Caption / Muted', size: '0.75rem', weight: '400', isHeading: false },
              ].map(({ label, size, weight, isHeading }) => (
                <div key={label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  <div className="w-40 shrink-0">
                    <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">{label}</span>
                    <p className="text-[10px] font-mono text-slate-500 mt-0.5">{size} / font-{weight === '800' ? 'extrabold' : weight === '700' ? 'bold' : weight === '600' ? 'semibold' : weight === '500' ? 'medium' : 'normal'}</p>
                  </div>
                  <div
                    className="flex-1 truncate"
                    style={{ 
                      fontSize: size, 
                      fontWeight: weight, 
                      fontFamily: isHeading ? `'${fontHeadline}', sans-serif` : `'${fontBody}', sans-serif`, 
                      color: isHeading ? 'var(--theme-h1)' : 'var(--theme-text)' 
                    }}
                  >
                    Sistem Informasi Akademik Bhakti Kencana
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
    </div>
  );
}