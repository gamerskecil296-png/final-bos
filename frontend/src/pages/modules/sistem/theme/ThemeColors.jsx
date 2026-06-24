import React, { useState, useEffect } from 'react';
import useThemeStore from '@/store/useThemeStore';
import { adminService } from '@/services/api';
import ThemePreviewModal from './ThemePreviewModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

// Helper: Normalize Hex
const normalizeHex = (color) => {
  if (!color) return '#000000';
  if (color.startsWith('#') && color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return color;
};

// Helper: Hex to RGB
const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

// Helper: Get Luminance
const getLuminance = (rgb) => {
  if (!rgb) return 0.5;
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Helper: Get Contrast Ratio
const getContrastRatio = (fg, bg) => {
  const rgb1 = hexToRgb(fg);
  const rgb2 = hexToRgb(bg);
  if (!rgb1 || !rgb2) return 1;

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
};

// Helper: Get Contrast Rating
const getContrastRating = (ratio) => {
  if (ratio >= 7) return { label: 'AAA', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (ratio >= 4.5) return { label: 'AA', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (ratio >= 3) return { label: 'AA Large', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { label: 'FAIL', color: 'text-red-600', bg: 'bg-red-50' };
};

// Helper: Auto Text Color
const getAutoTextColor = (bgColor, threshold = 0.179) => {
  const rgb = hexToRgb(bgColor);
  const luminance = getLuminance(rgb);
  return luminance < threshold ? '#FFFFFF' : '#1B1C1C';
};

// Helper: Get Muted Text Color
const getMutedColor = (textColor) => {
  return textColor === '#FFFFFF' ? '#E2E8F0' : '#64748B';
};

export default function ThemeColors() {
  const { previewTheme, revertPreview, fetchTheme } = useThemeStore();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    loadTheme();
    return () => revertPreview();
  }, []);

  const loadTheme = async () => {
    setLoading(true);
    try {
      const data = await fetchTheme();
      if (data) setFormData(data);
    } catch {
      showToast('error', 'Gagal memuat pengaturan warna');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleChange = (field, value) => {
    const updated = { ...formData, [field]: value };
    const overrides = { [field]: value };

    if (field === 'color_primary') {
      const currentPrimary = formData.color_primary || '#0D2B55';
      const currentSidebarBg = formData.sidebar_bg_color || '';
      if (!currentSidebarBg || currentSidebarBg.toLowerCase() === currentPrimary.toLowerCase()) {
        updated.sidebar_bg_color = value;
        overrides.sidebar_bg_color = value;
      }
    }

    setFormData(updated);
    previewTheme(overrides);
  };

  const handleReset = async () => {
    setIsConfirmOpen(false);
    try {
      const res = await adminService.resetTheme();
      if (res.success) {
        showToast('success', 'Warna berhasil di-reset');
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
        showToast('success', 'Warna berhasil disimpan');
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

  const colorsConfig = [
    { key: 'color_primary', label: 'Warna Utama (Primary)', desc: 'Warna identitas portal. Digunakan untuk navbar, sidebar background, tombol primer, dan aksen penting.' },
    { key: 'color_secondary', label: 'Warna Kedua (Secondary)', desc: 'Warna pendukung. Digunakan untuk sub-elemen, lencana, status pendukung, dan tombol sekunder.' },
    { key: 'color_accent', label: 'Warna Aksen (Accent)', desc: 'Warna penarik perhatian. Digunakan sebagai highlight aktif, ikon terpilih, atau dekorasi minimal.' },
    { key: 'color_background', label: 'Warna Latar (Background)', desc: 'Warna background utama dari halaman aplikasi. Disarankan menggunakan warna terang lembut.' },
    { key: 'color_surface', label: 'Warna Permukaan (Surface)', desc: 'Warna background untuk kontainer konten, seperti kartu, tabel, dropdown, dan modal.' },
  ];

  const landingColorsConfig = [
    { key: 'landing_color_primary', label: 'Warna Utama Landing (Primary)', desc: 'Warna identitas untuk halaman publik (landing).' },
    { key: 'landing_color_secondary', label: 'Warna Kedua Landing (Secondary)', desc: 'Warna pendukung untuk elemen di landing page.' },
    { key: 'landing_color_accent', label: 'Warna Aksen Landing (Accent)', desc: 'Aksen untuk halaman publik.' },
    { key: 'landing_color_background', label: 'Warna Latar Landing (Background)', desc: 'Background halaman publik.' },
    { key: 'landing_color_surface', label: 'Warna Permukaan Landing (Surface)', desc: 'Background kontainer di halaman publik.' },
  ];

  // Calculate combinations previews
  const primaryText = getAutoTextColor(formData.color_primary, 0.6);
  const primaryContrast = getContrastRatio(primaryText, formData.color_primary);
  const primaryRating = getContrastRating(primaryContrast);

  const secondaryText = getAutoTextColor(formData.color_secondary);
  const secondaryContrast = getContrastRatio(secondaryText, formData.color_secondary);
  const secondaryRating = getContrastRating(secondaryContrast);

  const surfaceBg = formData.color_surface || '#FFFFFF';
  const surfaceText = getAutoTextColor(surfaceBg);
  const surfaceMuted = getMutedColor(surfaceText);
  const textContrast = getContrastRatio(surfaceText, surfaceBg);
  const textRating = getContrastRating(textContrast);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg animate-in fade-in slide-in-from-top-4 duration-300 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
          }`}>
          <span className="material-symbols-outlined">{toast.type === 'success' ? 'check_circle' : 'error'}</span>
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Local Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500">palette</span>
            Warna Tema
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Sesuaikan warna utama, latar belakang, dan warna permukaan</p>
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
        title="Reset Warna Tema?"
        description="Apakah Anda yakin ingin mengembalikan semua pengaturan warna ke default bawaan sistem? Perubahan ini akan menggantikan konfigurasi Anda saat ini."
        confirmText="YA, RESET"
        confirmClassName="bg-[var(--theme-primary)] hover:opacity-90 text-white"
      />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

        {/* Color Picker Cards */}
        <div className="space-y-5">
          <h3 className="text-sm font-bold text-slate-800 border-b pb-2">Warna Portal (Admin/Student)</h3>
          {colorsConfig.map((color) => {
            const value = formData[color.key] || '#000000';
            const whiteRatio = getContrastRatio(value, '#FFFFFF');
            const blackRatio = getContrastRatio(value, '#000000');
            const whiteRating = getContrastRating(whiteRatio);
            const blackRating = getContrastRating(blackRatio);

            return (
              <section key={color.key} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>{color.label}</h2>
                    <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{color.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleChange(color.key, e.target.value)}
                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleChange(color.key, e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm font-mono border border-slate-200/80 focus:border-slate-400 focus:outline-none"
                      style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
                      placeholder="#HEXCODE"
                    />
                  </div>
                </div>

                {/* Contrast ratio metrics */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block w-full mb-1">Analisis Kontras WCAG</span>

                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: whiteRating.bg === 'bg-emerald-50' ? '#ecfdf5' : whiteRating.bg === 'bg-blue-50' ? '#eff6ff' : whiteRating.bg === 'bg-amber-50' ? '#fffbeb' : '#fef2f2', color: whiteRating.color === 'text-emerald-600' ? '#059669' : whiteRating.color === 'text-blue-600' ? '#2563eb' : whiteRating.color === 'text-amber-600' ? '#d97706' : '#dc2626' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white border border-slate-200"></span>
                    <span>Teks Putih: {whiteRatio.toFixed(1)}:1</span>
                    <span className="opacity-90 px-1 rounded bg-black/5">{whiteRating.label}</span>
                  </div>

                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: blackRating.bg === 'bg-emerald-50' ? '#ecfdf5' : blackRating.bg === 'bg-blue-50' ? '#eff6ff' : blackRating.bg === 'bg-amber-50' ? '#fffbeb' : '#fef2f2', color: blackRating.color === 'text-emerald-600' ? '#059669' : blackRating.color === 'text-blue-600' ? '#2563eb' : blackRating.color === 'text-amber-600' ? '#d97706' : '#dc2626' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                    <span>Teks Hitam: {blackRatio.toFixed(1)}:1</span>
                    <span className="opacity-90 px-1 rounded bg-black/5">{blackRating.label}</span>
                  </div>
                </div>
              </section>
            );
          })}

          <h3 className="text-sm font-bold text-slate-800 border-b pb-2 mt-8">Warna Landing Page (Publik)</h3>
          {landingColorsConfig.map((color) => {
            const value = formData[color.key] || '#000000';
            const whiteRatio = getContrastRatio(value, '#FFFFFF');
            const blackRatio = getContrastRatio(value, '#000000');
            const whiteRating = getContrastRating(whiteRatio);
            const blackRating = getContrastRating(blackRatio);

            return (
              <section key={color.key} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>{color.label}</h2>
                    <p className="text-[11px] leading-relaxed mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{color.desc}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 mt-4">
                  <div className="relative w-14 h-14 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => handleChange(color.key, e.target.value)}
                      className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleChange(color.key, e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg text-sm font-mono border border-slate-200/80 focus:border-slate-400 focus:outline-none"
                      style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
                      placeholder="#HEXCODE"
                    />
                  </div>
                </div>

                {/* Contrast ratio metrics */}
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-50">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black block w-full mb-1">Analisis Kontras WCAG</span>

                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: whiteRating.bg === 'bg-emerald-50' ? '#ecfdf5' : whiteRating.bg === 'bg-blue-50' ? '#eff6ff' : whiteRating.bg === 'bg-amber-50' ? '#fffbeb' : '#fef2f2', color: whiteRating.color === 'text-emerald-600' ? '#059669' : whiteRating.color === 'text-blue-600' ? '#2563eb' : whiteRating.color === 'text-amber-600' ? '#d97706' : '#dc2626' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white border border-slate-200"></span>
                    <span>Teks Putih: {whiteRatio.toFixed(1)}:1</span>
                    <span className="opacity-90 px-1 rounded bg-black/5">{whiteRating.label}</span>
                  </div>

                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[10px] font-bold" style={{ backgroundColor: blackRating.bg === 'bg-emerald-50' ? '#ecfdf5' : blackRating.bg === 'bg-blue-50' ? '#eff6ff' : blackRating.bg === 'bg-amber-50' ? '#fffbeb' : '#fef2f2', color: blackRating.color === 'text-emerald-600' ? '#059669' : blackRating.color === 'text-blue-600' ? '#2563eb' : blackRating.color === 'text-amber-600' ? '#d97706' : '#dc2626' }}>
                    <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                    <span>Teks Hitam: {blackRatio.toFixed(1)}:1</span>
                    <span className="opacity-90 px-1 rounded bg-black/5">{blackRating.label}</span>
                  </div>
                </div>
              </section>
            );
          })}
        </div>

        {/* Color Combinations Preview Area */}
        <div className="space-y-5">
          <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 sticky top-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">style</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Kombinasi Warna & Aksesibilitas</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Melihat kecocokan kombinasi elemen UI</p>
              </div>
            </div>

            <div className="space-y-4">

              {/* Combination 1: Primary + Auto Text */}
              <div className="p-4 rounded-xl border border-slate-100" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tombol / Elemen Utama</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ backgroundColor: primaryRating.bg === 'bg-emerald-50' ? '#ecfdf5' : primaryRating.bg === 'bg-blue-50' ? '#eff6ff' : primaryRating.bg === 'bg-amber-50' ? '#fffbeb' : '#fef2f2', color: primaryRating.color === 'text-emerald-600' ? '#059669' : primaryRating.color === 'text-blue-600' ? '#2563eb' : primaryRating.color === 'text-amber-600' ? '#d97706' : '#dc2626' }}>
                    {primaryContrast.toFixed(1)}:1 ({primaryRating.label})
                  </span>
                </div>
                <div className="flex items-center justify-center p-6 rounded-lg bg-white border border-slate-200/40">
                  <button
                    className="px-6 py-2.5 text-sm font-bold transition-all shadow-md active:scale-95"
                    style={{
                      backgroundColor: formData.color_primary,
                      color: primaryText,
                      borderRadius: formData.button_radius || '12px'
                    }}
                  >
                    Tombol Utama
                  </button>
                </div>
              </div>

              {/* Combination 2: Secondary + Auto Text */}
              <div className="p-4 rounded-xl border border-slate-100" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tombol / Elemen Sekunder</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ backgroundColor: secondaryRating.bg === 'bg-emerald-50' ? '#ecfdf5' : secondaryRating.bg === 'bg-blue-50' ? '#eff6ff' : secondaryRating.bg === 'bg-amber-50' ? '#fffbeb' : '#fef2f2', color: secondaryRating.color === 'text-emerald-600' ? '#059669' : secondaryRating.color === 'text-blue-600' ? '#2563eb' : secondaryRating.color === 'text-amber-600' ? '#d97706' : '#dc2626' }}>
                    {secondaryContrast.toFixed(1)}:1 ({secondaryRating.label})
                  </span>
                </div>
                <div className="flex items-center justify-center p-6 rounded-lg bg-white border border-slate-200/40">
                  <button
                    className="px-6 py-2.5 text-sm font-bold transition-all shadow-sm active:scale-95"
                    style={{
                      backgroundColor: formData.color_secondary,
                      color: secondaryText,
                      borderRadius: formData.button_radius || '12px'
                    }}
                  >
                    Tombol Sekunder
                  </button>
                </div>
              </div>

              {/* Combination 3: Background + Surface Layout */}
              <div className="p-4 rounded-xl border border-slate-100" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Kartu di atas Latar Belakang</span>
                  <span className="text-[10px] px-2 py-0.5 rounded font-bold" style={{ backgroundColor: textRating.bg === 'bg-emerald-50' ? '#ecfdf5' : textRating.bg === 'bg-blue-50' ? '#eff6ff' : textRating.bg === 'bg-amber-50' ? '#fffbeb' : '#fef2f2', color: textRating.color === 'text-emerald-600' ? '#059669' : textRating.color === 'text-blue-600' ? '#2563eb' : textRating.color === 'text-amber-600' ? '#d97706' : '#dc2626' }}>
                    Kontras Teks: {textContrast.toFixed(1)}:1 ({textRating.label})
                  </span>
                </div>
                <div className="p-4 rounded-lg border border-slate-200/60" style={{ backgroundColor: formData.color_background }}>
                  <div className="p-4 rounded-xl shadow-sm border border-slate-100" style={{ backgroundColor: formData.color_surface }}>
                    <h4 className="text-sm font-bold" style={{ color: surfaceText }}>Judul Kartu Konten</h4>
                    <p className="text-xs mt-1 leading-relaxed" style={{ color: surfaceMuted }}>
                      Ini adalah pratinjau teks isi yang diletakkan di atas komponen kartu (Surface) dan halaman utama (Background).
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </section>
        </div>
      </div>
    </div>
  );
}