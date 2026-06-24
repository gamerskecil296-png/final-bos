import React, { useState, useEffect } from 'react';
import useThemeStore from '@/store/useThemeStore';
import { adminService } from '@/services/api';
import ThemePreviewModal from './ThemePreviewModal';
import { toast } from 'react-hot-toast';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

export default function ThemeStatusColors() {
  const { previewTheme, revertPreview, fetchTheme } = useThemeStore();
  const [formData, setFormData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleReset = async () => {
    setIsConfirmOpen(false);
    try {
      const res = await adminService.resetTheme();
      if (res.success) {
        showToast('success', 'Warna status berhasil di-reset');
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
        showToast('success', 'Warna status berhasil disimpan');
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

  const statusColors = [
    {
      key: 'color_success',
      label: 'Success',
      desc: 'Berhasil, OK, Selesai',
      icon: 'check_circle',
    },
    {
      key: 'color_warning',
      label: 'Warning',
      desc: 'Peringatan, Pending',
      icon: 'warning',
    },
    {
      key: 'color_error',
      label: 'Error',
      desc: 'Gagal, Danger, Error',
      icon: 'error',
    },
    {
      key: 'color_info',
      label: 'Info',
      desc: 'Informasi, Netral',
      icon: 'info',
    },
  ];

  return (
    <div className="space-y-6">


      {/* Local Tab Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-slate-500">check_circle</span>
            Warna Status
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Notifikasi, badge, dan indikator status</p>
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
          title="Reset Warna Status?"
          description="Apakah Anda yakin ingin mengembalikan pengaturan warna status ke default bawaan sistem? Perubahan ini akan menggantikan konfigurasi Anda saat ini."
          confirmText="YA, RESET"
          confirmClassName="bg-[var(--theme-primary)] hover:opacity-90 text-white"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">

          {statusColors.map((status) => (
            <section key={status.key} className="bg-white rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${formData[status.key]}15`, color: formData[status.key] }}>
                  <span className="material-symbols-outlined text-base">{status.icon}</span>
                </div>
                <div>
                  <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>{status.label}</h2>
                  <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>{status.desc}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData[status.key]}
                  onChange={(e) => handleChange(status.key, e.target.value)}
                  className="w-12 h-12 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData[status.key]}
                  onChange={(e) => handleChange(status.key, e.target.value)}
                  className="flex-1 px-3 rounded-lg text-sm font-mono"
                  style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text)' }}
                />
              </div>

              {/* Preview Badge */}
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>PREVIEW</p>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold text-white" style={{ backgroundColor: formData[status.key] }}>
                    {status.label}
                  </span>
                  <span className="px-3 py-1.5 rounded-full text-xs font-bold" style={{ backgroundColor: `${formData[status.key]}15`, color: formData[status.key] }}>
                    {status.label} Light
                  </span>
                </div>
              </div>
            </section>
          ))}

          {/* Usage Examples */}
          <section className="bg-white rounded-xl p-5 shadow-sm xl:col-span-2">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--theme-primary)', color: 'white' }}>
                <span className="material-symbols-outlined text-base">preview</span>
              </div>
              <div>
                <h2 className="text-sm font-bold" style={{ color: 'var(--theme-text)' }}>Contoh Penggunaan</h2>
                <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>Bagaimana warna status digunakan di portal</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: 'Mahasiswa Aktif', status: 'success', dot: true },
                { label: 'Menunggu Review', status: 'warning', dot: true },
                { label: 'Proposal Ditolak', status: 'error', dot: true },
                { label: 'Catatan Penting', status: 'info', dot: true },
              ].map(({ label, status, dot }) => (
                <div key={label} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
                  {dot && (
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: formData[`color_${status}`] }}></span>
                  )}
                  <span className="text-sm font-medium flex-1" style={{ color: 'var(--theme-text)' }}>{label}</span>
                  <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: `${formData[`color_${status}`]}15`, color: formData[`color_${status}`] }}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
              ))}
            </div>

            {/* Toast Preview */}
            <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--theme-bg)' }}>
              <p className="text-[10px] font-semibold mb-2" style={{ color: 'var(--theme-text-muted)' }}>TOAST NOTIFICATION</p>
              <div className="space-y-2">
                {['success', 'warning', 'error'].map((type) => (
                  <div key={type} className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: 'white' }}>
                    <span className="material-symbols-outlined" style={{ color: formData[`color_${type}`] }}>{type === 'success' ? 'check_circle' : type === 'warning' ? 'warning' : 'error'}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--theme-text)' }}>
                        {type === 'success' ? 'Berhasil!' : type === 'warning' ? 'Perhatian' : 'Error'}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--theme-text-muted)' }}>
                        Pesan notifikasi untuk {type}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </div>
    </div>
  );
}