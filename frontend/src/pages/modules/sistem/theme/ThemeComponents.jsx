import React, { useState, useEffect } from 'react';
import useThemeStore from '@/store/useThemeStore';
import { adminService } from '@/services/api';
import ThemePreviewModal from './ThemePreviewModal';
import { toast } from 'react-hot-toast';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

// Helper functions
const normalizeHex = (color) => {
  if (!color) return '#000000';
  if (color.startsWith('#') && color.length === 4) {
    return `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`;
  }
  return color;
};

const isValidHex = (color) => {
  if (!color) return false;
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
};

const getContrastRatio = (fg, bg) => {
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  const getLuminance = (rgb) => {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const rgb1 = hexToRgb(fg);
  const rgb2 = hexToRgb(bg);
  if (!rgb1 || !rgb2) return 0;

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return ((lighter + 0.05) / (darker + 0.05));
};

const getContrastRating = (ratio) => {
  if (ratio >= 7) return { label: 'AAA', color: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (ratio >= 4.5) return { label: 'AA', color: 'text-blue-600', bg: 'bg-blue-50' };
  if (ratio >= 3) return { label: 'AA Large', color: 'text-amber-600', bg: 'bg-amber-50' };
  return { label: 'FAIL', color: 'text-red-600', bg: 'bg-red-50' };
};

// Sidebar Color Input Component
const SidebarColorInput = ({ label, value, onChange, description, bgContext, isBackground = false }) => {
  const normValue = isValidHex(value) ? normalizeHex(value) : '#000000';

  // Contrast analysis
  let contrastElements = null;
  if (isBackground) {
    // Background Sidebar: Analisis terhadap teks putih dan hitam
    const whiteRatio = getContrastRatio('#FFFFFF', normValue);
    const blackRatio = getContrastRatio('#000000', normValue);
    const whiteRating = getContrastRating(whiteRatio);
    const blackRating = getContrastRating(blackRatio);

    const getHexColor = (rating, isBg) => {
      if (rating.bg === 'bg-emerald-50') return isBg ? '#ecfdf5' : '#059669';
      if (rating.bg === 'bg-blue-50') return isBg ? '#eff6ff' : '#2563eb';
      if (rating.bg === 'bg-amber-50') return isBg ? '#fffbeb' : '#d97706';
      return isBg ? '#fef2f2' : '#dc2626';
    };

    contrastElements = (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block w-full mb-1">Analisis Kontras WCAG</span>
        
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: getHexColor(whiteRating, true), color: getHexColor(whiteRating, false) }}>
          <span className="w-1.5 h-1.5 rounded-full bg-white border border-slate-200"></span>
          <span>Teks Putih: {whiteRatio.toFixed(1)}:1</span>
          <span className="opacity-90 px-1 rounded bg-black/5">{whiteRating.label}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: getHexColor(blackRating, true), color: getHexColor(blackRating, false) }}>
          <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
          <span>Teks Hitam: {blackRatio.toFixed(1)}:1</span>
          <span className="opacity-90 px-1 rounded bg-black/5">{blackRating.label}</span>
        </div>
      </div>
    );
  } else {
    // Teks Sidebar: Analisis terhadap Background Sidebar
    const contrastBg = bgContext || '#0D2B55';
    const normBg = isValidHex(contrastBg) ? normalizeHex(contrastBg) : '#000000';
    const ratio = getContrastRatio(normValue, normBg);
    const rating = getContrastRating(ratio);

    const getHexColor = (rating, isBg) => {
      if (rating.bg === 'bg-emerald-50') return isBg ? '#ecfdf5' : '#059669';
      if (rating.bg === 'bg-blue-50') return isBg ? '#eff6ff' : '#2563eb';
      if (rating.bg === 'bg-amber-50') return isBg ? '#fffbeb' : '#d97706';
      return isBg ? '#fef2f2' : '#dc2626';
    };

    contrastElements = (
      <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
        <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black block w-full mb-1">Keterbacaan vs Background</span>
        
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold" style={{ backgroundColor: getHexColor(rating, true), color: getHexColor(rating, false) }}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: normValue }}></span>
          <span>Rasio Kontras: {ratio.toFixed(1)}:1</span>
          <span className="opacity-90 px-1 rounded bg-black/5">{rating.label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
      <div className="mb-2">
        <h3 className="text-xs font-bold" style={{ color: 'var(--theme-text)' }}>{label}</h3>
        {description && (
          <p className="text-[10px] mt-0.5 leading-relaxed" style={{ color: 'var(--theme-text-muted)' }}>{description}</p>
        )}
      </div>
      <div className="flex items-center gap-3 mt-3">
        <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0">
          <input
            type="color"
            value={normValue}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer scale-150"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-xs font-mono border border-slate-200/80 focus:border-slate-400 focus:outline-none"
            style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
            placeholder="#HEXCODE"
          />
        </div>
      </div>
      {contrastElements}
    </div>
  );
};

// Sidebar Preview Component
const SidebarPreview = ({ bgColor, textColor, mutedColor }) => {
  const isDarkBg = getContrastRatio('#FFFFFF', bgColor) < getContrastRatio('#000000', bgColor);
  const borderCol = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const logoBg = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const activeBg = isDarkBg ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)';

  return (
    <div className="mt-4 p-4 rounded-xl border border-slate-100 transition-colors duration-300" style={{ backgroundColor: bgColor }}>
      <p className="text-[10px] font-semibold mb-3" style={{ color: textColor, opacity: 0.6 }}>PREVIEW SIDEBAR</p>

      {/* Logo section */}
      <div className="flex items-center gap-3 mb-4 pb-3 border-b" style={{ borderColor: borderCol }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: logoBg }}>
          <span style={{ color: textColor }}>🎓</span>
        </div>
        <div>
          <p className="text-sm font-bold" style={{ color: textColor }}>STUDENT HUB</p>
          <p className="text-[10px]" style={{ color: mutedColor }}>Portal Mahasiswa</p>
        </div>
      </div>

      {/* Menu items */}
      <div className="space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ backgroundColor: activeBg, borderLeft: '3px solid #C89B3C' }}>
          <span style={{ color: '#C89B3C' }}>📊</span>
          <span className="text-xs font-medium" style={{ color: textColor }}>Dashboard</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-80 hover:opacity-100 cursor-pointer">
          <span style={{ color: mutedColor }}>👤</span>
          <span className="text-xs font-medium" style={{ color: mutedColor }}>Profile</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-80 hover:opacity-100 cursor-pointer">
          <span style={{ color: mutedColor }}>📋</span>
          <span className="text-xs font-medium" style={{ color: mutedColor }}>Konseling</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-80 hover:opacity-100 cursor-pointer">
          <span style={{ color: mutedColor }}>🏆</span>
          <span className="text-xs font-medium" style={{ color: mutedColor }}>Prestasi</span>
        </div>
      </div>

      {/* Bottom - Logout */}
      <div className="mt-4 pt-3 border-t" style={{ borderColor: borderCol }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg opacity-80 hover:opacity-100 cursor-pointer">
          <span style={{ color: '#ef4444' }}>🚪</span>
          <span className="text-xs font-medium" style={{ color: '#ef4444' }}>Keluar</span>
        </div>
      </div>
    </div>
  );
};

export default function ThemeComponents() {
  const { previewTheme, revertPreview, fetchTheme } = useThemeStore();
  const [formData, setFormData] = useState(null);
  const [loading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  useEffect(() => {
    loadTheme();
    return () => revertPreview();
  }, []);

  const loadTheme = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTheme();
      if (data) setFormData(data);
    } catch {
      showToast('error', 'Gagal memuat pengaturan tema');
    } finally {
      setIsLoading(false);
    }
  };

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const handleChange = (field, value) => {
    let normalizedValue = value;
    if (field.includes('color') || field.includes('bg')) {
      normalizedValue = normalizeHex(value);
    }
    const updated = { ...formData, [field]: normalizedValue };
    setFormData(updated);
    
    // Preview theme
    if (field.includes('color') || field.includes('bg')) {
      if (isValidHex(normalizedValue)) {
        previewTheme({ [field]: normalizedValue });
      }
    } else {
      previewTheme({ [field]: normalizedValue });
    }
  };

  const handleReset = async () => {
    setIsConfirmOpen(false);
    try {
      const res = await adminService.resetTheme();
      if (res.success) {
        showToast('success', 'Komponen berhasil di-reset');
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
        showToast('success', 'Pengaturan komponen berhasil disimpan');
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

  // Sidebar colors from formData - INDEPENDENT dari Portal/Landing colors
  const sidebarBg = formData.sidebar_bg_color || '#0D2B55';
  const sidebarText = formData.sidebar_text_color || '#E2E8F0';
  const sidebarMuted = formData.sidebar_text_muted_color || '#94A3B8';
  const buttonRadius = formData.button_radius || '12px';

  return (
    <div className="space-y-6">


      {/* Local Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500">widgets</span>
            Komponen
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Sidebar, tombol, dan elemen UI lainnya</p>
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
          title="Reset Komponen?"
          description="Apakah Anda yakin ingin mengembalikan pengaturan komponen ke default bawaan sistem? Perubahan ini akan menggantikan konfigurasi Anda saat ini."
          confirmText="YA, RESET"
          confirmClassName="bg-[var(--theme-primary)] hover:opacity-90 text-white"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Section: Sidebar dengan Preview */}
          <section className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: sidebarBg, color: 'white' }}>
                <span className="material-symbols-outlined text-base">view_sidebar</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Sidebar</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Warna panel navigasi kiri (hanya untuk portal pages)</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Background */}
              <SidebarColorInput
                label="Background Sidebar"
                value={sidebarBg}
                onChange={(v) => handleChange('sidebar_bg_color', v)}
                description="Warna dasar panel sidebar (disarankan warna gelap untuk kontras optimal)"
                isBackground={true}
              />

              {/* Text Color */}
              <SidebarColorInput
                label="Warna Teks Utama"
                value={sidebarText}
                onChange={(v) => handleChange('sidebar_text_color', v)}
                description="Warna teks ikon/menu utama yang aktif/terpilih"
                bgContext={sidebarBg}
              />

              {/* Muted Text */}
              <SidebarColorInput
                label="Warna Teks Muted"
                value={sidebarMuted}
                onChange={(v) => handleChange('sidebar_text_muted_color', v)}
                description="Warna teks menu non-aktif/hover"
                bgContext={sidebarBg}
              />
            </div>

            {/* Sidebar Preview */}
            <SidebarPreview
              bgColor={sidebarBg}
              textColor={sidebarText}
              mutedColor={sidebarMuted}
            />
          </section>

          {/* Section: Buttons */}
          <section className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">smart_button</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Tombol</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Pengaturan border radius</p>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold" style={{ color: 'var(--theme-text)' }}>Border Radius</label>
                <span className="text-xs font-mono font-bold" style={{ color: 'var(--theme-primary)' }}>{buttonRadius}</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="2"
                value={parseInt(buttonRadius) || 12}
                onChange={(e) => handleChange('button_radius', `${e.target.value}px`)}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{ backgroundColor: 'var(--theme-bg)' }}
              />
              <div className="flex justify-between text-[10px] mt-1" style={{ color: 'var(--theme-text-muted)' }}>
                <span>0px</span>
                <span>12px</span>
                <span>24px</span>
              </div>
            </div>

            {/* Button Preview */}
            <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>PREVIEW TOMBOL</p>
              <div className="flex flex-wrap gap-2">
                <button
                  className="px-4 py-2 text-white text-xs font-bold"
                  style={{ backgroundColor: 'var(--theme-primary)', borderRadius: buttonRadius }}
                >
                  Primary
                </button>
                <button
                  className="px-4 py-2 text-xs font-bold border-2"
                  style={{ borderColor: 'var(--theme-primary)', color: 'var(--theme-primary)', borderRadius: buttonRadius, backgroundColor: 'white' }}
                >
                  Outline
                </button>
                <button
                  className="px-4 py-2 text-xs font-bold"
                  style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)', borderRadius: buttonRadius }}
                >
                  Secondary
                </button>
              </div>
            </div>
          </section>

          {/* Section: UI Components */}
          <section className="bg-white rounded-xl p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">integration_instructions</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Preview Elemen UI</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Tampilan komponen dengan tema saat ini</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Badge */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>BADGE</p>
                <div className="flex flex-wrap gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#dcfce7', color: '#166534' }}>Active</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>Pending</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>Error</span>
                </div>
              </div>

              {/* Input */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>INPUT</p>
                <input
                  type="text"
                  placeholder="Input field..."
                  className="w-full px-3 py-2 rounded-lg text-sm"
                  style={{ backgroundColor: 'white', color: 'var(--theme-text)' }}
                />
              </div>

              {/* Card */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>CARD</p>
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'white' }}>
                  <p className="font-bold text-sm" style={{ color: 'var(--theme-text)' }}>Judul Card</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--theme-text-muted)' }}>Deskripsi card</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>TABS</p>
                <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: 'white' }}>
                  <button className="flex-1 px-3 py-1.5 rounded text-xs font-bold text-white" style={{ backgroundColor: 'var(--theme-primary)' }}>
                    Tab 1
                  </button>
                  <button className="flex-1 px-3 py-1.5 rounded text-xs" style={{ color: 'var(--theme-text-muted)' }}>
                    Tab 2
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
    </div>
  );
}