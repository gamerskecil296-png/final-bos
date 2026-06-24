import React, { useState, useEffect, useRef } from 'react';
import useThemeStore from '@/store/useThemeStore';
import { adminService } from '@/services/api';
import ThemePreviewModal from './ThemePreviewModal';
import { toast } from 'react-hot-toast';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

export default function ThemeBranding() {
  const { previewTheme, revertPreview, fetchTheme } = useThemeStore();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [faviconFile, setFaviconFile] = useState(null);
  const [faviconPreview, setFaviconPreview] = useState('');

  const logoBlobRef = useRef(null);
  const faviconBlobRef = useRef(null);

  useEffect(() => {
    loadTheme();
    return () => {
      if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current);
      if (faviconBlobRef.current) URL.revokeObjectURL(faviconBlobRef.current);
      revertPreview();
    };
  }, []);

  const loadTheme = async () => {
    setLoading(true);
    try {
      const data = await fetchTheme();
      if (data) {
        setFormData(data);
        setLogoPreview(data.logo_url || '');
        setFaviconPreview(data.favicon_url || '');
      }
    } catch {
      showToast('error', 'Gagal memuat pengaturan tema');
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

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Block SVG files (XSS prevention)
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      showToast('error', 'SVG tidak diizinkan. Gunakan PNG, JPG, atau WEBP.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('error', 'Ukuran logo maksimal 2MB');
      return;
    }
    if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current);
    const blobUrl = URL.createObjectURL(file);
    logoBlobRef.current = blobUrl;
    setLogoFile(file);
    setLogoPreview(blobUrl);
    previewTheme({ logo_url: blobUrl });
  };

  const handleFaviconChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Block SVG files (XSS prevention)
    if (file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg')) {
      showToast('error', 'SVG tidak diizinkan. Gunakan PNG, ICO, atau WEBP.');
      return;
    }

    if (file.size > 1 * 1024 * 1024) {
      showToast('error', 'Ukuran favicon maksimal 1MB');
      return;
    }
    if (faviconBlobRef.current) URL.revokeObjectURL(faviconBlobRef.current);
    const blobUrl = URL.createObjectURL(file);
    faviconBlobRef.current = blobUrl;
    setFaviconFile(file);
    setFaviconPreview(blobUrl);
  };

  const handleReset = async () => {
    setIsConfirmOpen(false);
    try {
      const res = await adminService.resetTheme();
      if (res.success) {
        showToast('success', 'Branding berhasil di-reset');
        if (logoBlobRef.current) URL.revokeObjectURL(logoBlobRef.current);
        if (faviconBlobRef.current) URL.revokeObjectURL(faviconBlobRef.current);
        setLogoFile(null);
        setFaviconFile(null);
        const data = await fetchTheme();
        if (data) {
          setFormData(data);
          setLogoPreview(data.logo_url || '');
          setFaviconPreview(data.favicon_url || '');
        }
      }
    } catch {
      showToast('error', 'Gagal mereset');
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let finalLogoUrl = formData.logo_url;
      let finalFaviconUrl = formData.favicon_url;

      if (logoFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', logoFile);
        const uploadRes = await adminService.uploadLogo(formDataUpload);
        if (uploadRes.success) finalLogoUrl = uploadRes.url;
      }

      if (faviconFile) {
        const formDataUpload = new FormData();
        formDataUpload.append('file', faviconFile);
        const uploadRes = await adminService.uploadFavicon(formDataUpload);
        if (uploadRes.success) finalFaviconUrl = uploadRes.url;
      }

      const saveData = { ...formData, logo_url: finalLogoUrl, favicon_url: finalFaviconUrl };
      const res = await adminService.updateTheme(saveData);
      if (res.success) {
        showToast('success', 'Branding berhasil disimpan');
        setLogoFile(null);
        setFaviconFile(null);
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

  return (
    <div className="space-y-6">


      {/* Local Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500">image</span>
            Branding
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Logo, favicon, dan identitas situs</p>
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
          title="Reset Branding?"
          description="Apakah Anda yakin ingin mengembalikan pengaturan branding (logo, dll) ke default bawaan sistem? Perubahan ini akan menggantikan konfigurasi Anda saat ini."
          confirmText="YA, RESET"
          confirmClassName="bg-[var(--theme-primary)] hover:opacity-90 text-white"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {/* Section: Site Name */}
          <section className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">business</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Nama Institusi</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Nama yang tampil di navbar & browser</p>
              </div>
            </div>

            <input
              type="text"
              value={formData.site_name || ''}
              onChange={(e) => handleChange('site_name', e.target.value)}
              className="w-full px-4 py-3 rounded-lg text-sm"
              style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
              placeholder="Universitas Bhakti Kencana"
            />
            <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-muted)' }}>
              Nama ini akan muncul di navbar, footer, dan tab browser
            </p>

            {/* Preview */}
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>PREVIEW</p>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)' }}>
                  <span className="material-symbols-outlined text-white text-sm">school</span>
                </div>
                <span className="font-bold text-sm" style={{ color: 'var(--theme-primary)' }}>
                  {formData.site_name || 'Nama Institusi'}
                </span>
              </div>
            </div>
          </section>

          {/* Section: Logo */}
          <section className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">photo_library</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Logo Utama</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Tampil di navbar & sidebar</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-20 h-20 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--theme-bg)' }}>
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="material-symbols-outlined text-2xl" style={{ color: 'var(--theme-text-muted)' }}>image</span>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:opacity-80" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  Pilih Logo
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-muted)' }}>
                  PNG, JPG, WEBP. Maks 2MB. SVG tidak diizinkan (keamanan).
                </p>
                {logoFile && (
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--theme-primary)' }}>
                    ✓ {logoFile.name}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section: Favicon */}
          <section className="bg-white rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">public</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Favicon</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Ikon di tab browser</p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--theme-bg)' }}>
                {faviconPreview ? (
                  <img src={faviconPreview} alt="Favicon" className="w-full h-full object-contain p-2" />
                ) : (
                  <span className="material-symbols-outlined text-xl" style={{ color: 'var(--theme-text-muted)' }}>public</span>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all hover:opacity-80" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                  <span className="material-symbols-outlined text-sm">cloud_upload</span>
                  Pilih Favicon
                  <input
                    type="file"
                    accept="image/png,image/x-icon,image/webp"
                    onChange={handleFaviconChange}
                    className="hidden"
                  />
                </label>
                <p className="text-[10px] mt-2" style={{ color: 'var(--theme-text-muted)' }}>
                  PNG, ICO, WEBP. 32x32px. Maks 1MB.
                </p>
                {faviconFile && (
                  <p className="text-[10px] mt-1 font-semibold" style={{ color: 'var(--theme-primary)' }}>
                    ✓ {faviconFile.name}
                  </p>
                )}
              </div>
            </div>
          </section>

          {/* Section: Branding Preview */}
          <section className="bg-white rounded-xl p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">preview</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Preview Branding</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Tampilan branding di berbagai tempat</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Navbar */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-primary)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.7)' }}>NAVBAR</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-5 h-5 object-contain brightness-0 invert" />
                    ) : (
                      <span className="material-symbols-outlined text-white text-xs">school</span>
                    )}
                  </div>
                  <span className="font-bold text-white text-xs">{formData.site_name || 'Situs'}</span>
                </div>
              </div>

              {/* Sidebar */}
              <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-sidebar-bg)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-sidebar-text)', opacity: 0.7 }}>SIDEBAR</p>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-white/20 flex items-center justify-center">
                    {logoPreview ? (
                      <img src={logoPreview} alt="Logo" className="w-5 h-5 object-contain brightness-0 invert" />
                    ) : (
                      <span className="material-symbols-outlined text-white text-xs">school</span>
                    )}
                  </div>
                  <span className="font-bold text-white text-xs">{formData.site_name || 'Situs'}</span>
                </div>
              </div>

              {/* Browser Tab */}
              <div className="p-3 rounded-lg bg-slate-100">
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>BROWSER TAB</p>
                <div className="flex items-center gap-2">
                  {faviconPreview ? (
                    <img src={faviconPreview} alt="Favicon" className="w-5 h-5" />
                  ) : (
                    <div className="w-5 h-5 rounded bg-slate-300"></div>
                  )}
                  <span className="text-xs font-medium truncate" style={{ color: 'var(--theme-text)' }}>
                    {formData.site_name || 'Nama Situs'} - Dashboard
                  </span>
                </div>
              </div>
            </div>
          </section>
        </div>
    </div>
  );
}