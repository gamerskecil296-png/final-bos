import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, FileText } from 'lucide-react';
import { API_BASE_URL, fetchWithAuth } from '@/services/api';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/ui/page';

const DocumentSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterModul, setFilterModul] = useState('Semua');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await fetchWithAuth(`${API_BASE_URL}/admin/document-settings`);
      setSettings(res.data);
    } catch (err) {
      toast.error('Gagal memuat pengaturan surat');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id, field, value) => {
    const newSettings = settings.map(s => s.id === id ? { ...s, [field]: value } : s);
    setSettings(newSettings);
  };

  const saveSetting = async (setting) => {
    try {
      await fetchWithAuth(`${API_BASE_URL}/admin/document-settings/${setting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format_nomor: setting.format_nomor,
          reset_period: setting.reset_period
        })
      });
      toast.success(`Format ${setting.jenis_surat} berhasil disimpan`);
    } catch (err) {
      toast.error(`Gagal menyimpan ${setting.jenis_surat}`);
    }
  };

  const getPreview = (format, lastNumber) => {
    if (!format) return '-';
    const now = new Date();
    const nextNumber = String((lastNumber || 0) + 1).padStart(3, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear());
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[now.getMonth()];

    return format
      .replace(/{{nomor}}/g, nextNumber)
      .replace(/{{bulan_romawi}}/g, romanMonth)
      .replace(/{{bulan_biasa}}/g, month)
      .replace(/{{tahun}}/g, year);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Pengaturan Penomoran Surat"
        subtitle="Konfigurasi format penomoran dokumen untuk rujukan medis, BAP, dan hasil konseling."
        icon="settings"
        breadcrumbs={[
          { label: 'Super Admin', path: '/app/dashboard' },
          { label: 'Document Settings', path: '/app/dashboard/document-settings' }
        ]}
      />

      {/* Filterization */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 custom-scrollbar">
        {['Semua', ...new Set(settings.map(s => s.modul))].map((modul) => (
          <button
            key={modul}
            onClick={() => setFilterModul(modul)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${filterModul === modul
                ? 'bg-primary text-white shadow-md shadow-primary/20'
                : 'bg-white text-slate-500 border border-slate-200 hover:border-primary/30 hover:text-primary'
              }`}
          >
            {modul}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {settings.filter(s => filterModul === 'Semua' || s.modul === filterModul).map((setting) => (
          <div key={setting.id} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">{setting.jenis_surat}</h3>
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
                    Modul: {setting.modul}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 flex-1">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Format Penomoran</label>
                <div className="relative">
                  <input
                    type="text"
                    value={setting.format_nomor}
                    onChange={(e) => handleUpdate(setting.id, 'format_nomor', e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all font-mono text-sm"
                    placeholder="{{nomor}}/RUJ/{{bulan_romawi}}/{{tahun}}"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Variabel tersedia: <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">{"{{nomor}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">{"{{bulan_romawi}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">{"{{bulan_biasa}}"}</code>, <code className="bg-slate-100 px-1 py-0.5 rounded text-primary">{"{{tahun}}"}</code>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Periode Reset Nomor</label>
                <select
                  value={setting.reset_period}
                  onChange={(e) => handleUpdate(setting.id, 'reset_period', e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                >
                  <option value="Tahunan">Tahunan (Reset setiap 1 Januari)</option>
                  <option value="Bulanan">Bulanan (Reset setiap tanggal 1)</option>
                </select>
              </div>

              <div className="pt-2 space-y-4">
                <div className="bg-slate-100 border border-slate-200 rounded-xl p-4">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[11px] font-black tracking-widest text-slate-500 uppercase">Live Preview Dokumen</span>
                    <span className="text-[10px] bg-white px-2 py-1 rounded text-slate-400 font-medium border border-slate-200 shadow-sm">Simulasi A4</span>
                  </div>

                  {/* Mockup Kertas Surat */}
                  <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6 mx-auto w-full max-w-sm relative overflow-hidden">
                    {/* Header / Kop Surat Mock */}
                    <div className="border-b-2 border-slate-800 pb-3 mb-4 flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center shrink-0">
                        <div className="w-6 h-6 bg-slate-300 rounded-sm"></div>
                      </div>
                      <div className="space-y-1 w-full">
                        <div className="h-2.5 bg-slate-800 rounded w-3/4"></div>
                        <div className="h-1.5 bg-slate-400 rounded w-full"></div>
                        <div className="h-1.5 bg-slate-400 rounded w-5/6"></div>
                      </div>
                    </div>

                    {/* Tanggal & Nomor */}
                    <div className="flex justify-between text-[10px] mb-6 text-slate-600 font-medium">
                      <div className="space-y-1">
                        <div>Nomor: <span className="font-bold text-slate-900 bg-yellow-100 px-1 py-0.5 rounded">{getPreview(setting.format_nomor, setting.last_number)}</span></div>
                        <div>Hal: {setting.jenis_surat}</div>
                      </div>
                      <div className="text-right">
                        Bandung, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    {/* Isi Surat Skeleton */}
                    <div className="space-y-2 opacity-50">
                      <div className="h-2 bg-slate-300 rounded w-1/3 mb-4"></div>
                      <div className="h-1.5 bg-slate-200 rounded w-full"></div>
                      <div className="h-1.5 bg-slate-200 rounded w-full"></div>
                      <div className="h-1.5 bg-slate-200 rounded w-4/5"></div>
                      <div className="h-1.5 bg-slate-200 rounded w-full mt-4"></div>
                      <div className="h-1.5 bg-slate-200 rounded w-3/4"></div>
                    </div>

                    {/* TTD Skeleton */}
                    <div className="mt-8 flex justify-end opacity-60">
                      <div className="w-24 text-center space-y-6">
                        <div className="h-1.5 bg-slate-300 rounded mx-auto w-16"></div>
                        <div className="h-1.5 bg-slate-800 rounded mx-auto w-20"></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 border border-blue-100/50 rounded-xl p-3.5 flex items-start gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-blue-600">info</span>
                  </div>
                  <div className="text-sm text-blue-900/80">
                    <span className="font-bold block mb-0.5 text-blue-900">Info Tracking</span>
                    Nomor terakhir yang diterbitkan sistem adalah <span className="font-bold bg-blue-100/50 px-1.5 py-0.5 rounded text-blue-700">{setting.last_number}</span> (Update: {setting.last_update || 'Belum ada'}).
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <Button
                variant="primary"
                className="w-full"
                onClick={() => saveSetting(setting)}
              >
                <Save className="w-4 h-4 mr-2" />
                Simpan Perubahan
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DocumentSettings;
