import React, { useState, useEffect } from 'react';
import useThemeStore from '@/store/useThemeStore';
import { adminService } from '@/services/api';
import ThemePreviewModal from './ThemePreviewModal';
import { toast } from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';

const PRESETS = [
  {
    id: 'ubk_original',
    name: 'UBK Original',
    desc: 'Warna resmi Navy & Emas Universitas Bhakti Kencana. Terlihat formal, berwibawa, dan elegan.',
    colors: {
      color_primary: '#003399',
      color_secondary: '#ffbf00',
      color_accent: '#ffd500',
      color_background: '#F8FAFC',
      color_surface: '#FFFFFF',
      color_border: '#E2E8F0',
      color_border_muted: '#F1F5F9',
      font_headline: 'Plus Jakarta Sans',
      font_body: 'Inter',
      button_radius: '12px',
    }
  },
  {
    id: 'ocean_blue',
    name: 'Sunset Orange',
    desc: 'Oranye hangat berpadu dengan aksen keemasan. Memberikan kesan energik, kreatif, dan ceria.',
    colors: {
      color_primary: '#ff670f',
      color_secondary: '#ff9c1a',
      color_accent: '#ffbf1f',
      color_background: '#F8FAFC',
      color_surface: '#FFFFFF',
      color_border: '#E2E8F0',
      color_border_muted: '#F1F5F9',
      font_headline: 'Poppins',
      font_body: 'Inter',
      button_radius: '8px',
    }
  },
  {
    id: 'forest_green',
    name: 'Forest Green',
    desc: 'Hijau profesional dipadukan dengan aksen emas sawo matang. Menampilkan harmoni, ketenangan, dan keseimbangan.',
    colors: {
      color_primary: '#166534',
      color_secondary: '#CA8A04',
      color_accent: '#FDE047',
      color_background: '#F4F9F4',
      color_surface: '#FFFFFF',
      color_border: '#E2E8F0',
      color_border_muted: '#F1F5F9',
      font_headline: 'Outfit',
      font_body: 'Inter',
      button_radius: '10px',
    }
  },
  {
    id: 'royal_purple',
    name: 'Royal Purple',
    desc: 'Ungu kerajaan berpadu dengan aksen orange-amber. Mengesankan kreativitas tinggi, kemewahan, dan keunikan.',
    colors: {
      color_primary: '#7C3AED',
      color_secondary: '#F59E0B',
      color_accent: '#FDE047',
      color_background: '#FAF5FF',
      color_surface: '#FFFFFF',
      color_border: '#E2E8F0',
      color_border_muted: '#F1F5F9',
      font_headline: 'Montserrat',
      font_body: 'Roboto',
      button_radius: '12px',
    }
  },
  {
    id: 'slate_dark',
    name: 'Slate Dark',
    desc: 'Abu-abu profesional gelap berpadu dengan aksen biru muda (sky). Sangat cocok untuk tampilan bernuansa produktivitas tinggi.',
    colors: {
      color_primary: '#334155',
      color_secondary: '#0EA5E9',
      color_accent: '#38BDF8',
      color_background: '#F1F5F9',
      color_surface: '#FFFFFF',
      color_border: '#E2E8F0',
      color_border_muted: '#F1F5F9',
      font_headline: 'Space Grotesk',
      font_body: 'DM Sans',
      button_radius: '6px',
    }
  },
  {
    id: 'rose_elegant',
    name: 'Rose Elegant',
    desc: 'Merah muda mawar gelap (deep rose) dipadukan dengan aksen kuning keemasan. Memberi kesan hangat, ramah, dan anggun.',
    colors: {
      color_primary: '#BE185D',
      color_secondary: '#F59E0B',
      color_accent: '#FDE047',
      color_background: '#FFF5F7',
      color_surface: '#FFFFFF',
      color_border: '#E2E8F0',
      color_border_muted: '#F1F5F9',
      font_headline: 'Quicksand',
      font_body: 'Nunito',
      button_radius: '16px',
    }
  }
];

export default function ThemePresets() {
  const { previewTheme, revertPreview, fetchTheme } = useThemeStore();
  const [activeTheme, setActiveTheme] = useState(null);
  const [loading, setLoading] = useState(true);
  const [applyingPreset, setApplyingPreset] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, preset: null });

  useEffect(() => {
    loadActiveTheme();
    return () => revertPreview();
  }, []);

  const loadActiveTheme = async () => {
    setLoading(true);
    try {
      const data = await fetchTheme();
      if (data) setActiveTheme(data);
    } catch {
      showToast('error', 'Gagal memuat tema aktif');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, message) => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const handlePreview = (preset) => {
    // Inject the fonts for the preview
    const fonts = [preset.colors.font_headline, preset.colors.font_body];
    fonts.forEach(font => {
      const id = `google-font-preview-${font.replace(/\s+/g, '-').toLowerCase()}`;
      if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800&display=swap`;
        document.head.appendChild(link);
      }
    });

    setPreviewData({ 
      ...activeTheme, 
      ...preset.colors,
      sidebar_bg_color: preset.colors.color_primary,
      sidebar_text_color: '',
      sidebar_text_muted_color: ''
    });
    previewTheme({ 
      ...preset.colors, 
      sidebar_bg_color: preset.colors.color_primary,
      sidebar_text_color: '',
      sidebar_text_muted_color: ''
    });
    setShowPreview(true);
  };

  const handleApply = (preset) => {
    setConfirmDialog({ isOpen: true, preset });
  };

  const executeApply = async () => {
    const preset = confirmDialog.preset;
    if (!preset) return;
    
    setConfirmDialog({ isOpen: false, preset: null });
    setApplyingPreset(preset.id);
    try {
      const payload = {
        ...activeTheme,
        ...preset.colors,
        sidebar_bg_color: preset.colors.color_primary,
        sidebar_text_color: '',
        sidebar_text_muted_color: '',
        // Sync mobile colors from preset
      };
      const res = await adminService.updateTheme(payload);
      if (res.success) {
        showToast('success', `Preset "${preset.name}" berhasil diterapkan (termasuk warna mobile)`);
        const updated = await fetchTheme();
        if (updated) setActiveTheme(updated);
      } else {
        showToast('error', 'Gagal menerapkan preset');
      }
    } catch (err) {
      showToast('error', err.message || 'Terjadi kesalahan');
    } finally {
      setApplyingPreset(null);
    }
  };

  if (loading || !activeTheme) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[var(--theme-primary)] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm" style={{ color: 'var(--theme-text-muted)' }}>Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-8 md:px-8 xl:px-12 min-h-screen bg-transparent font-inter">
      <div className="max-w-[1600px] mx-auto space-y-6">



        {/* Page Header */}
        <section className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
              <span className="material-symbols-outlined text-xl">style</span>
            </div>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--theme-text)' }}>
                Preset Tema Tampilan
              </h1>
              <p className="text-xs mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                Pilih dari kombinasi warna dan tipografi profesional yang sudah dikonfigurasi
              </p>
            </div>
          </div>
        </section>

        {/* Preview Modal */}
        <ThemePreviewModal 
          isOpen={showPreview} 
          onClose={() => {
            setShowPreview(false);
            revertPreview();
          }} 
          theme={previewData} 
        />

        {/* Presets Card Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PRESETS.map((preset) => {
            // Check if active: matches primary color (case-insensitive)
            const isActive = activeTheme.color_primary?.toLowerCase() === preset.colors.color_primary.toLowerCase();
            const isApplying = applyingPreset === preset.id;

            return (
              <div 
                key={preset.id} 
                className={`bg-white rounded-2xl border p-5 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                  isActive ? 'border-2' : 'border-slate-200/80'
                }`}
                style={{
                  borderColor: isActive ? 'var(--theme-primary)' : ''
                }}
              >
                <div>
                  {/* Title & Badge */}
                  <div className="flex justify-between items-start mb-3">
                    <h2 className="text-base font-bold text-slate-800">{preset.name}</h2>
                    {isActive && (
                      <span 
                        className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider text-white shadow-sm flex items-center gap-1"
                        style={{ backgroundColor: 'var(--theme-primary)' }}
                      >
                        <span className="material-symbols-outlined text-xs">check_circle</span>
                        Aktif
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 leading-relaxed mb-4 min-h-[48px]">
                    {preset.desc}
                  </p>

                  {/* Color Stripe Bar */}
                  <div className="rounded-lg overflow-hidden flex h-6 mb-4 border border-slate-100">
                    <div className="flex-1" style={{ backgroundColor: preset.colors.color_primary }} title={`Primary: ${preset.colors.color_primary}`}></div>
                    <div className="flex-1" style={{ backgroundColor: preset.colors.color_secondary }} title={`Secondary: ${preset.colors.color_secondary}`}></div>
                    <div className="flex-1" style={{ backgroundColor: preset.colors.color_accent }} title={`Accent: ${preset.colors.color_accent}`}></div>
                    <div className="flex-1" style={{ backgroundColor: preset.colors.color_surface }} title={`Surface: ${preset.colors.color_surface}`}></div>
                    <div className="flex-1" style={{ backgroundColor: preset.colors.color_background }} title={`Background: ${preset.colors.color_background}`}></div>
                  </div>

                  {/* Fonts Indicator */}
                  <div className="grid grid-cols-2 gap-3 mb-5 py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-100/50">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Font Judul</span>
                      <span className="text-xs font-bold text-slate-700 truncate block mt-0.5">{preset.colors.font_headline}</span>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Font Isi</span>
                      <span className="text-xs font-semibold text-slate-600 truncate block mt-0.5">{preset.colors.font_body}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2 pt-3 border-t border-slate-50">
                  <button
                    onClick={() => handlePreview(preset)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all hover:bg-slate-50 border border-slate-200 text-slate-600 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">visibility</span>
                    Preview
                  </button>
                  <button
                    onClick={() => handleApply(preset)}
                    disabled={isActive || isApplying}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold text-white transition-all flex items-center justify-center gap-1.5 ${
                      isActive 
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-100' 
                        : 'shadow-md active:scale-95'
                    }`}
                    style={{
                      backgroundColor: isActive ? '' : 'var(--theme-primary)',
                      opacity: isActive ? 1 : isApplying ? 0.8 : 1
                    }}
                  >
                    {isApplying ? (
                      <>
                        <span className="material-symbols-outlined text-xs animate-spin">sync</span>
                        Memuat...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-xs">check</span>
                        Terapkan
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
      
      {/* Global Alert Dialog for Confirmation */}
      <AlertDialog open={confirmDialog.isOpen} onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, preset: null })}>
        <AlertDialogContent className="rounded-2xl p-6 sm:p-8 bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-2xl max-w-md mx-auto text-left gap-0 font-body">
          <AlertDialogHeader className="text-left space-y-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-2">
              <span className="material-symbols-outlined text-amber-600 text-2xl">warning</span>
            </div>
            <AlertDialogTitle className="text-xl font-black text-[var(--theme-text)] font-headline leading-tight">
              Terapkan Preset "{confirmDialog.preset?.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-[var(--theme-text-muted)] font-medium leading-relaxed">
              Ini akan mengubah skema warna dan pengaturan tipografi portal secara instan di seluruh sistem untuk semua pengguna. Apakah Anda yakin ingin melanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col sm:flex-row gap-3 mt-4">
            <AlertDialogCancel 
              onClick={() => setConfirmDialog({ isOpen: false, preset: null })}
              className="flex-1 h-11 rounded-xl bg-[var(--theme-surface)] text-[var(--theme-text-muted)] font-bold border border-[var(--theme-border)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)] transition-all m-0"
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeApply}
              className="flex-1 h-11 rounded-xl bg-[var(--theme-primary)] text-white font-bold border-none hover:brightness-95 transition-all shadow-md shadow-[var(--theme-primary)]/20 m-0"
            >
              Ya, Terapkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
