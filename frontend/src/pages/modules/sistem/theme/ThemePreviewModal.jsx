import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper: Normalize Hex
const normalizeHex = (hex) => {
  if (!hex) return '#000000';
  const clean = hex.trim();
  if (clean.startsWith('#') && clean.length === 4) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return clean;
};

// Helper: Hex to RGB
const hexToRgb = (hex) => {
  const normalized = normalizeHex(hex);
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalized);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

// Helper: Get Luminance
const getLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Helper: Auto Text Color
const getAutoTextColor = (bgColor, threshold = 0.179) => {
  const luminance = getLuminance(bgColor);
  return luminance < threshold ? '#FFFFFF' : '#1B1C1C';
};

// Helper: Get Muted Text Color
const getMutedColor = (textColor) => {
  return textColor === '#FFFFFF' ? 'rgba(255, 255, 255, 0.6)' : 'rgba(100, 116, 139, 0.8)';
};

export default function ThemePreviewModal({ isOpen, onClose, theme }) {
  if (!theme) return null;

  const {
    color_primary = '#0D2B55',
    color_secondary = '#C89B3C',
    color_accent = '#E8B84B',
    color_background = '#F9F6F0',
    color_surface = '#FFFFFF',
    color_text_primary = '#1B1C1C',
    color_text_muted = '#64748B',
    color_h1 = '#0D2B55',
    color_h2 = '#0D2B55',
    color_h3 = '#1E3A5F',
    color_h4 = '#475569',
    color_border = '#E2E8F0',
    color_border_muted = '#F1F5F9',
    sidebar_bg_color = '#0D2B55',
    sidebar_text_color = '',
    sidebar_text_muted_color = '',
    color_success = '#16a34a',
    color_warning = '#d97706',
    color_error = '#dc2626',
    color_info = '#2563eb',
    button_radius = '12px',
    font_headline = 'Plus Jakarta Sans',
    font_body = 'Inter',
    site_name = 'Universitas Bhakti Kencana',
    logo_url,
    favicon_url,
  } = theme;

  // Calculate dynamic contract text for buttons
  const primaryBtnText = getAutoTextColor(color_primary, 0.6);
  const secondaryBtnText = getAutoTextColor(color_secondary);

  // Calculate dynamic sidebar text colors
  const computedSidebarText = sidebar_text_color || getAutoTextColor(sidebar_bg_color, 0.6);
  const computedSidebarTextMuted = sidebar_text_muted_color || getMutedColor(computedSidebarText);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-4 z-[101] flex flex-col bg-slate-50 rounded-3xl shadow-2xl overflow-hidden border border-slate-200"
          >
            {/* Modal Header (Static UI style, independent of theme) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                  <span className="material-symbols-outlined">preview</span>
                </div>
                <div>
                  <h2 className="font-bold text-slate-800" style={{ fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Preview Tampilan Lengkap</h2>
                  <p className="text-xs text-slate-500">Pratinjau bagaimana portal akan terlihat</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-slate-500">close</span>
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6" style={{ backgroundColor: color_background }}>
              {/* Browser Mockup */}
              <div className="max-w-6xl mx-auto space-y-6">

                {/* Browser Window */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border" style={{ borderColor: color_border }}>
                  {/* Browser Header */}
                  <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: color_primary }}>
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-white/30"></div>
                      <div className="w-3 h-3 rounded-full bg-white/30"></div>
                      <div className="w-3 h-3 rounded-full bg-white/30"></div>
                    </div>
                    <div className="flex-1 flex items-center gap-2 px-4 py-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                      <span className="material-symbols-outlined text-white/70" style={{ fontSize: '14px' }}>search</span>
                      <span className="text-white/70 text-xs">{site_name.toLowerCase().replace(/\s+/g, '')}.ac.id</span>
                    </div>
                    <div className="flex gap-2">
                      <span className="material-symbols-outlined text-white/50" style={{ fontSize: '16px' }}>more_horiz</span>
                    </div>
                  </div>

                  {/* App Layout */}
                  <div className="flex" style={{ minHeight: '520px' }}>
                    {/* Sidebar */}
                    <div className="w-64 p-4 flex flex-col" style={{ backgroundColor: sidebar_bg_color }}>
                      {/* Logo */}
                      <div className="flex items-center gap-3 pb-4 mb-4 border-b" style={{ borderColor: computedSidebarText === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: computedSidebarText === '#FFFFFF' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)' }}>
                          {logo_url ? (
                            <img src={logo_url} alt="Logo" className="w-8 h-8 object-contain" style={{ filter: computedSidebarText === '#FFFFFF' ? 'brightness(0) invert(1)' : 'none' }} />
                          ) : (
                            <span className="material-symbols-outlined" style={{ fontSize: '20px', color: computedSidebarText }}>school</span>
                          )}
                        </div>
                        <span className="font-bold text-sm" style={{ fontFamily: `'${font_headline}', sans-serif`, color: computedSidebarText }}>
                          {site_name.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </div>

                      {/* Menu */}
                      <div className="space-y-1 flex-1">
                        <div className="px-3 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2" style={{
                          backgroundColor: computedSidebarText === '#FFFFFF' ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.06)',
                          color: computedSidebarText
                        }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', color: color_accent }}>dashboard</span>
                          Dashboard
                        </div>
                        <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ color: computedSidebarTextMuted }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>school</span>
                          Akademik
                        </div>
                        <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ color: computedSidebarTextMuted }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                          Mahasiswa
                        </div>
                        <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ color: computedSidebarTextMuted }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>assessment</span>
                          Laporan
                        </div>
                      </div>

                      {/* Bottom Section */}
                      <div className="pt-4 border-t" style={{ borderColor: computedSidebarText === '#FFFFFF' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
                        <p className="text-[10px] uppercase tracking-wider mb-2" style={{ color: computedSidebarTextMuted }}>Pengaturan</p>
                        <div className="space-y-1">
                          <div className="px-3 py-2 rounded-lg text-xs flex items-center gap-2" style={{ color: computedSidebarTextMuted }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>settings</span>
                            Pengaturan
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 p-6" style={{ backgroundColor: color_background }}>
                      {/* Header */}
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h1 className="text-xl font-bold" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_h1 }}>
                            Dashboard Super Admin
                          </h1>
                          <p className="text-xs mt-0.5" style={{ color: color_text_muted }}>Selamat datang di panel kontrol portal akademik</p>
                        </div>
                        <button
                          className="px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
                          style={{
                            backgroundColor: color_primary,
                            color: primaryBtnText,
                            borderRadius: button_radius,
                            fontFamily: `'${font_headline}', sans-serif`
                          }}
                        >
                          + Tambah Baru
                        </button>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="p-4 rounded-xl shadow-sm border" style={{ backgroundColor: color_surface, borderColor: color_border }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color_primary}15`, color: color_primary }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>group</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color_text_muted }}>Mahasiswa</span>
                          </div>
                          <p className="text-2xl font-bold" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_text_primary }}>4,850</p>
                        </div>
                        <div className="p-4 rounded-xl shadow-sm border" style={{ backgroundColor: color_surface, borderColor: color_border }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color_success}15`, color: color_success }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color_text_muted }}>Aktif</span>
                          </div>
                          <p className="text-2xl font-bold" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_success }}>98%</p>
                        </div>
                        <div className="p-4 rounded-xl shadow-sm border" style={{ backgroundColor: color_surface, borderColor: color_border }}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color_warning}15`, color: color_warning }}>
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span>
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color_text_muted }}>Pending</span>
                          </div>
                          <p className="text-2xl font-bold" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_text_primary }}>24</p>
                        </div>
                      </div>

                      {/* Content Card */}
                      <div className="p-5 rounded-xl shadow-sm border" style={{ backgroundColor: color_surface, borderColor: color_border }}>
                        <h2 className="text-base font-bold mb-3" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_h2 }}>
                          Aktivitas Terbaru
                        </h2>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: color_background }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color_success}15` }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: color_success }}>check</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium" style={{ color: color_text_primary }}>Proposal disetujui</p>
                              <p className="text-xs" style={{ color: color_text_muted }}>2 menit yang lalu</p>
                            </div>
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${color_success}15`, color: color_success }}>
                              Success
                            </span>
                          </div>
                          <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: color_background }}>
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color_warning}15` }}>
                              <span className="material-symbols-outlined text-sm" style={{ color: color_warning }}>schedule</span>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium" style={{ color: color_text_primary }}>Menunggu review</p>
                              <p className="text-xs" style={{ color: color_text_muted }}>15 menit yang lalu</p>
                            </div>
                            <span className="px-2 py-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: `${color_warning}15`, color: color_warning }}>
                              Pending
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Buttons Preview */}
                      <div className="mt-6">
                        <h3 className="text-[10px] font-black uppercase tracking-widest mb-3" style={{ color: color_text_muted }}>TOMBOL</h3>
                        <div className="flex flex-wrap gap-3">
                          <button
                            className="px-5 py-2.5 text-xs font-bold shadow-md"
                            style={{ backgroundColor: color_primary, color: primaryBtnText, borderRadius: button_radius }}
                          >
                            Primary
                          </button>
                          <button
                            className="px-5 py-2.5 text-xs font-bold border-2 bg-white"
                            style={{ borderColor: color_primary, color: color_primary, borderRadius: button_radius }}
                          >
                            Outline
                          </button>
                          <button
                            className="px-5 py-2.5 text-xs font-bold"
                            style={{ backgroundColor: color_secondary, color: secondaryBtnText, borderRadius: button_radius }}
                          >
                            Secondary
                          </button>
                          <button
                            className="px-5 py-2.5 text-xs font-bold"
                            style={{ backgroundColor: color_success, color: 'white', borderRadius: button_radius }}
                          >
                            Success
                          </button>
                          <button
                            className="px-5 py-2.5 text-xs font-bold"
                            style={{ backgroundColor: color_error, color: 'white', borderRadius: button_radius }}
                          >
                            Error
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Palette Preview */}
                <div className="rounded-2xl shadow-lg border p-6" style={{ backgroundColor: color_surface, borderColor: color_border }}>
                  <h3 className="font-bold mb-4" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_text_primary }}>Palet Warna</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl shadow-inner" style={{ backgroundColor: color_primary }}></div>
                      <p className="text-[10px] font-bold mt-1.5" style={{ color: color_text_primary }}>Primary</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl shadow-inner" style={{ backgroundColor: color_secondary }}></div>
                      <p className="text-[10px] font-bold mt-1.5" style={{ color: color_text_primary }}>Secondary</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl shadow-inner" style={{ backgroundColor: color_accent }}></div>
                      <p className="text-[10px] font-bold mt-1.5" style={{ color: color_text_primary }}>Accent</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl shadow-inner" style={{ backgroundColor: color_success }}></div>
                      <p className="text-[10px] font-bold mt-1.5" style={{ color: color_text_primary }}>Success</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl shadow-inner" style={{ backgroundColor: color_warning }}></div>
                      <p className="text-[10px] font-bold mt-1.5" style={{ color: color_text_primary }}>Warning</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl shadow-inner" style={{ backgroundColor: color_error }}></div>
                      <p className="text-[10px] font-bold mt-1.5" style={{ color: color_text_primary }}>Error</p>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-xl shadow-inner border" style={{ backgroundColor: color_info, borderColor: color_border }}></div>
                      <p className="text-[10px] font-bold mt-1.5" style={{ color: color_text_primary }}>Info</p>
                    </div>
                  </div>
                </div>

                {/* Typography Preview */}
                <div className="rounded-2xl shadow-lg border p-6" style={{ backgroundColor: color_surface, borderColor: color_border }}>
                  <h3 className="font-bold mb-4" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_text_primary }}>Tipografi</h3>
                  <div className="space-y-3">
                    <p className="text-2xl font-black" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_h1 }}>Heading 1 - {font_headline}</p>
                    <p className="text-xl font-bold" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_h2 }}>Heading 2 - {font_headline}</p>
                    <p className="text-lg font-semibold" style={{ fontFamily: `'${font_headline}', sans-serif`, color: color_h3 }}>Heading 3 - {font_headline}</p>
                    <p className="text-base" style={{ fontFamily: `'${font_body}', sans-serif`, color: color_text_primary }}>
                      Body Text - {font_body} - Ini adalah teks tubuh/paragraf yang menggunakan font body untuk membaca yang nyaman.
                    </p>
                    <p className="text-sm" style={{ fontFamily: `'${font_body}', sans-serif`, color: color_text_muted }}>
                      Caption / Muted Text - {font_body} - Teks keterangan kecil atau teks yang kurang penting.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Footer (Static UI style) */}
            <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between">
              <p className="text-xs text-slate-500">
                Preview mencerminkan pengaturan tema saat ini. Simpan untuk menerapkan perubahan.
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-white text-xs font-bold rounded-xl shadow-md transition-all hover:opacity-90 active:scale-95"
                style={{ backgroundColor: 'var(--theme-primary)', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
              >
                Tutup Preview
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}