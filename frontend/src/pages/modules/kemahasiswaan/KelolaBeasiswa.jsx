"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService, API_BASE_URL } from '@/services/api'
import { PrimaryStatsCard, SecondaryStatsCard } from '@/components/ui/StatsCard'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const Banknote = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>payments</span>;
const Wallet = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>account_balance_wallet</span>;

const TrendingUpIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>trending_up</span>;
const TrendingDownIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>trending_down</span>;
const FactCheckIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>fact_check</span>;
const AlarmIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>alarm</span>;

const StudentAvatar = ({ src, name, className = "w-9 h-9 rounded-xl" }) => {
  const [loaded, setLoaded] = React.useState(false);
  const [error, setError] = React.useState(false);

  const hasNoImage = !src || src.trim() === "" || src.endsWith("/profiles/") || src.endsWith("/students/") || src.endsWith("localhost:8000") || src.endsWith("localhost:8000/");

  return (
    <div className={cn("relative bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-inner overflow-hidden", className)}>
      {(!loaded || error || hasNoImage) && (
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute" style={{ fontSize: className && className.includes('w-14') ? '28px' : '20px' }}>
          person
        </span>
      )}
      {!hasNoImage && !error && (
        <img
          src={src}
          alt={name}
          className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

const formatDate = (d) => { try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return d } }
const formatDateTime = (d) => { try { return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB' } catch { return d } }
const getShortFacultyName = (name) => {
  if (!name || name === 'Tidak ada data') return '—'
  return name
    .replace(/Fakultas\s+/i, '')
    .replace(/Sains\s+dan\s+Teknologi/i, 'Sains & Tek')
    .replace(/Sains\s+&\s+Teknologi/i, 'Sains & Tek')
}

const APP_STATUS = {
  diterima: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Diterima' },
  ditolak: { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Ditolak' },
  proses: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Proses' },
  'disetujui fakultas': { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Disetujui Fakultas' },
}

const getAppStatus = (v = '') => {
  const norm = (v || 'proses').toLowerCase();
  if (norm === 'diterima' || norm === 'disetujui') return APP_STATUS.diterima;
  if (norm === 'ditolak') return APP_STATUS.ditolak;
  if (norm === 'disetujui fakultas') return APP_STATUS['disetujui fakultas'];
  if (norm === 'dikirim' || norm === 'diajukan' || norm === 'menunggu' || norm === 'menunggu verifikasi' || norm === 'proses') {
    return { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Pengajuan Dikirim' };
  }
  if (norm === 'seleksi_berkas') {
    return { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Seleksi Berkas' };
  }
  if (norm === 'evaluasi') {
    return { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', label: 'Evaluasi & Wawancara' };
  }
  if (norm === 'review') {
    return { cls: 'bg-purple-50 text-purple-700 border-purple-200', dot: 'bg-purple-500', label: 'Review Akhir' };
  }
  if (norm === 'penetapan') {
    return { cls: 'bg-cyan-50 text-cyan-700 border-cyan-200', dot: 'bg-cyan-500', label: 'Penetapan Pemenang' };
  }
  return APP_STATUS.proses;
}

const getFullUrl = (path) => {
  if (!path || path.trim() === "" || path === "/" || path.endsWith("/profiles/") || path.endsWith("/students/")) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path}`;
}

const renderAttachment = (url, label) => {
  if (!url) return null;
  const fullUrl = getFullUrl(url);
  if (!fullUrl) return null;

  const isImage = fullUrl.match(/\.(jpeg|jpg|gif|png)$/i) != null;
  return (
    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 flex flex-col gap-2 shadow-sm mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="material-symbols-outlined text-rose-500" style={{ fontSize: 20 }}>
            {isImage ? 'image' : 'description'}
          </span>
          <div className="text-left">
            <p className="text-xs font-bold text-slate-700 truncate max-w-[200px]">
              {label}
            </p>
            <p className="text-[9px] text-slate-400">Klik untuk melihat file</p>
          </div>
        </div>
        <a href={fullUrl} target="_blank" rel="noreferrer" className="text-primary hover:bg-blue-50 p-1.5 rounded-lg transition-colors">
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
        </a>
      </div>
      {isImage && (
        <a href={fullUrl} target="_blank" rel="noreferrer" className="mt-1 block rounded-xl overflow-hidden border border-slate-200 hover:opacity-90 transition-opacity">
          <img src={fullUrl} alt={label} className="w-full h-auto object-cover max-h-48" />
        </a>
      )}
    </div>
  );
};

const ReviewModal = ({ selectedApp, onClose, onSubmit, isSubmitting }) => {
  const [status, setStatus] = useState('dikirim');
  const [catatan, setCatatan] = useState('');

  useEffect(() => {
    if (selectedApp) {
      const s = selectedApp.Status;
      if (s === 'Disetujui Fakultas' || s === 'Proses' || s === 'proses' || s === 'disetujui fakultas') {
        setStatus('dikirim');
      } else {
        setStatus(s || 'dikirim');
      }
      setCatatan(selectedApp.Catatan || '');
    }
  }, [selectedApp]);

  return (
    <DialogModal
      open={!!selectedApp}
      onOpenChange={(open) => !open && onClose()}
      title={selectedApp?.MahasiswaNama || 'Review Pendaftaran'}
      subtitle="Review Pendaftaran"
      description={selectedApp?.MahasiswaNIM || ''}
      icon="edit_note"
      maxWidth="max-w-md"
      bodyClassName="p-0"
      footer={
        <>
          <ModalCancelButton onClick={onClose} />
          <ModalSaveButton
            label="SIMPAN KEPUTUSAN"
            icon="save"
            onClick={() => onSubmit(status, catatan)}
            disabled={isSubmitting}
            loading={isSubmitting}
          />
        </>
      }
    >
      {selectedApp && (
        <div className="p-6 md:p-8 space-y-4 overflow-y-auto flex-1 min-h-0 font-body bg-[var(--theme-bg)]">
          {/* Scholarship Program */}
          <div className="space-y-1">
            <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">PROGRAM BEASISWA</span>
            <p className="text-xs font-semibold text-[var(--theme-text)] bg-white p-3 rounded-xl border border-[var(--theme-border)]">
              {selectedApp.BeasiswaNama}
            </p>
          </div>

          {/* Berkas Lampiran */}
          {(selectedApp.FileURL || selectedApp.KtmKtpURL || selectedApp.TranskripURL || selectedApp.SertifikatURL) && (
            <div>
              <label className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">BERKAS PENDAFTARAN</label>
              <div className="flex flex-col gap-1">
                {renderAttachment(selectedApp.FileURL, "Berkas Utama")}
                {renderAttachment(selectedApp.KtmKtpURL, "KTM / KTP")}
                {renderAttachment(selectedApp.TranskripURL, "Transkrip Nilai")}
                {renderAttachment(selectedApp.SertifikatURL, "Sertifikat Pendukung")}
              </div>
            </div>
          )}

          {/* Custom Answers */}
          {(() => {
            const rawAnswers = selectedApp.custom_answers || selectedApp.CustomAnswers;
            if (!rawAnswers) return null;
            let answers = {};
            try {
              answers = typeof rawAnswers === 'string' ? JSON.parse(rawAnswers) : rawAnswers;
            } catch (e) {
              console.error(e);
              return null;
            }
            if (Object.keys(answers).length === 0) return null;
            return (
              <div className="space-y-3 border-t border-[var(--theme-border-muted)] pt-3">
                <label className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">PERSYARATAN KUSTOM (JAWABAN)</label>
                <div className="space-y-2.5">
                  {Object.entries(answers).map(([label, value]) => {
                    const isFile = typeof value === 'string' && (value.startsWith('/uploads/') || value.startsWith('http') || value.includes('/api/scholarship/upload-custom-file'));
                    return (
                      <div key={label} className="bg-white p-3 rounded-xl border border-[var(--theme-border)] text-left">
                        <span className="block text-[9px] font-bold text-[var(--theme-text-muted)] uppercase">{label}</span>
                        {isFile ? (
                          <div className="mt-1">
                            {renderAttachment(value, label)}
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-[var(--theme-text)] mt-1 whitespace-pre-line">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Status Options */}
          <div className="space-y-2">
            <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">TAHAP SELEKSI / KEPUTUSAN</span>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-full h-10 rounded-xl border-[var(--theme-border)] bg-white text-xs">
                <SelectValue placeholder="Pilih Tahap Seleksi" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white">
                <SelectItem value="dikirim" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">1. Pengajuan Dikirim</SelectItem>
                <SelectItem value="seleksi_berkas" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">2. Seleksi Berkas</SelectItem>
                <SelectItem value="evaluasi" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">3. Evaluasi & Wawancara</SelectItem>
                <SelectItem value="review" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">4. Review Akhir</SelectItem>
                <SelectItem value="penetapan" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">5. Penetapan Pemenang</SelectItem>
                <SelectItem value="Diterima" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">6. Hasil Akhir: Diterima</SelectItem>
                <SelectItem value="Ditolak" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">6. Hasil Akhir: Ditolak</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Catatan */}
          <div className="space-y-1">
            <label className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">CATATAN REVIEWER</label>
            <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={3}
              placeholder="Berikan alasan keputusan atau catatan perbaikan..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border)] bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-xs text-[var(--theme-text)] transition-all resize-none shadow-sm placeholder:text-[var(--theme-text-subtle)]" />
          </div>
        </div>



      )}
    </DialogModal>
  );
};

export default function KelolaBeasiswa() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('programs')
  const [data, setData] = useState([])
  const [appsData, setAppsData] = useState([])
  const [allPeriods, setAllPeriods] = useState([])

  const activeFacultyId = localStorage.getItem('superadmin_fakultas_id') || 'all'
  const activeProdiId = localStorage.getItem('superadmin_prodi_id') || 'all'
  const activePeriodId = localStorage.getItem('superadmin_period_id') || 'all'

  const filteredAppsData = useMemo(() => {
    return appsData.filter(a => {
      const m = a.Mahasiswa || {};

      // Filter by Faculty
      if (activeFacultyId !== 'all') {
        const fId = m.FakultasID || m.fakultas_id || a.FakultasID || a.fakultas_id;
        if (fId && String(fId) !== String(activeFacultyId)) return false;
      }

      // Filter by Prodi
      if (activeProdiId !== 'all') {
        const pId = m.ProgramStudiID || m.program_studi_id || a.ProgramStudiID || a.program_studi_id;
        if (pId && String(pId) !== String(activeProdiId)) return false;
      }

      // Filter by Academic Period
      if (activePeriodId !== 'all') {
        const selectedPeriod = allPeriods.find(p => String(p.id || p.ID) === String(activePeriodId))
        if (selectedPeriod) {
          let year = 0
          const match = selectedPeriod.AcademicYear?.match(/\d+/)
          if (match) year = parseInt(match[0])

          if (year > 0) {
            const entryYear = m.TahunMasuk || m.tahun_masuk || 0;
            if (entryYear > 0 && entryYear !== year) return false;
          }
        }
      }

      return true;
    });
  }, [appsData, activeFacultyId, activeProdiId, activePeriodId, allPeriods])
  const uniqueSchNames = React.useMemo(() => {
    const map = new Map()
    data.forEach(s => {
      if (s.Nama) {
        map.set(s.Nama, s.Nama)
      }
    })
    return Array.from(map.values())
  }, [data])

  const appStatusData = useMemo(() => {
    const counts = { 'Diterima': 0, 'Ditolak': 0, 'Proses': 0, 'Disetujui Fakultas': 0 }
    filteredAppsData.forEach(a => {
      let s = a.Status || 'Proses'
      if (s !== 'Diterima' && s !== 'Ditolak' && s !== 'Disetujui Fakultas') {
        s = 'Proses'
      }
      if (counts[s] !== undefined) counts[s]++
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter(d => d.value > 0)
  }, [filteredAppsData])

  const budgetByProgramData = useMemo(() => {
    return [...data]
      .sort((a, b) => (b.Anggaran || 0) - (a.Anggaran || 0))
      .slice(0, 5)
      .map(item => ({
        name: (item.Nama || '—').replace('Beasiswa ', 'B. ').substring(0, 15),
        value: item.Anggaran || 0
      }))
  }, [data])

  const PIE_COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6']

  const [loading, setLoading] = useState(true)
  const [appsLoading, setAppsLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [selectedProgram, setSelectedProgram] = useState(null)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ Nama: '', Penyelenggara: '', Deskripsi: '', Deadline: '', Kuota: 0, IPKMin: 0, Anggaran: 0, Kategori: 'Internal', Persyaratan: '', FileKtm: 'wajib', FileTranskrip: 'wajib', FileSertifikat: 'opsional' })
  const [customFieldsList, setCustomFieldsList] = useState([])
  const [selectedApp, setSelectedApp] = useState(null)
  const [previewApp, setPreviewApp] = useState(null)
  const [appFilters, setAppFilters] = useState({})
  const [selectedAppIds, setSelectedAppIds] = useState([])
  const [isBulkOpen, setIsBulkOpen] = useState(false)
  const [bulkStatus, setBulkStatus] = useState('dikirim')
  const [bulkCatatan, setBulkCatatan] = useState('')

  const handleBulkAppUpdate = async () => {
    if (selectedAppIds.length === 0) return
    setIsSubmitting(true)
    try {
      const payload = {
        ids: selectedAppIds,
        status: bulkStatus,
        catatan: bulkCatatan
      }
      console.log('Sending bulk scholarship application status update:', payload)
      const res = await adminService.updateBulkScholarshipApplicationStatus(payload)
      if (res.status === 'success') {
        toast.success(res.message || 'Keputusan review massal berhasil disimpan')
        setSelectedAppIds([])
        setIsBulkOpen(false)
        setBulkCatatan('')
        fetchApps()
      } else {
        toast.error(res.message || 'Gagal menyimpan keputusan massal')
      }
    } catch (err) {
      toast.error('Terjadi kesalahan sistem saat menyimpan review massal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAppUpdate = async (status, catatan) => {
    if (!selectedApp?.id && !selectedApp?.ID) return
    setIsSubmitting(true)
    try {
      const id = selectedApp.id || selectedApp.ID
      const payload = {
        status,
        catatan,
        Status: status,
        Catatan: catatan
      }
      console.log('Sending scholarship application status update:', payload)
      const res = await adminService.updateScholarshipApplicationStatus(id, payload)
      if (res.status === 'success') {
        toast.success('Keputusan review berhasil disimpan')
        setSelectedApp(null)
        fetchApps()
      } else {
        toast.error(res.message || 'Gagal menyimpan keputusan')
      }
    } catch {
      toast.error('Terjadi kesalahan sistem saat menyimpan review')
    } finally {
      setIsSubmitting(false)
    }
  }

  const downloadRealisasiPDF = async () => {
    let nomorSurat = '-';
    try {
      const { documentSettingsService } = await import('@/services/api');
      const numRes = await documentSettingsService.generateNumber("Laporan Realisasi Beasiswa");
      if (numRes && numRes.status === 'success' && numRes.data) {
        nomorSurat = numRes.data;
      }
    } catch (err) {
      console.error('Failed to fetch document number', err);
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error("Gagal membuka jendela cetak. Pastikan pop-up browser tidak diblokir.");
      return;
    }

    const kopImageUrl = `${window.location.origin}/images/format_kop_rektorat_landscape.jpg`;

    // 1. Prepare Summary Cards HTML
    const summaryHtml = `
      <div class="summary-container">
        <div class="summary-card">
          <div class="card-title">TOTAL PAGU ANGGARAN</div>
          <div class="card-value">${formatCurrency(stats.totalBudget)}</div>
          <div class="card-desc">Proyeksi pagu anggaran global beasiswa</div>
        </div>
        <div class="summary-card">
          <div class="card-title">TOTAL DANA TERSERAP</div>
          <div class="card-value text-success">${formatCurrency(absorbedBudget)} (${absorptionRate}%)</div>
          <div class="card-desc">Sudah disalurkan ke penerima aktif</div>
        </div>
        <div class="summary-card">
          <div class="card-title">SISA ANGGARAN GLOBAL</div>
          <div class="card-value text-warning">${formatCurrency(remainingBudget)}</div>
          <div class="card-desc">Sisa anggaran belum terdistribusi</div>
        </div>
      </div>
      
      <div class="summary-container" style="margin-top: 12px;">
        <div class="summary-card" style="width: 49%;">
          <div class="card-title">PENYERAP ANGGARAN TERBESAR</div>
          <div class="card-value" style="font-size: 13px;">${highestAbsorbingFaculty}</div>
          <div class="card-desc">Fakultas dengan penyerapan dana beasiswa terbanyak</div>
        </div>
        <div class="summary-card" style="width: 49%;">
          <div class="card-title">PEMBERI BEASISWA (INTERNAL VS MITRA)</div>
          <div class="card-value" style="font-size: 13px;">
            ${providerData.kampusCount} Kampus (${formatCurrency(providerData.kampusBudget)}) vs ${providerData.mitraCount} Mitra (${formatCurrency(providerData.mitraBudget)})
          </div>
          <div class="card-desc">Perbandingan beasiswa internal & eksternal</div>
        </div>
      </div>
    `;

    // 2. Prepare Faculty Absorption Table HTML
    let facultyRows = '';
    facultyAbsorption.forEach((row) => {
      const pct = stats.totalBudget <= 0 ? 0 : Math.round((row.value / stats.totalBudget) * 100);
      facultyRows += `
        <tr>
          <td><strong>${row.name.toUpperCase()}</strong></td>
          <td align="right"><strong>${formatCurrency(row.value)}</strong></td>
          <td align="center">${pct}%</td>
        </tr>
      `;
    });
    if (facultyAbsorption.length === 0) {
      facultyRows = `<tr><td colspan="3" align="center" style="color: #94a3b8; font-style: italic;">Belum ada dana terserap</td></tr>`;
    }

    // 3. Prepare Program Realization Table HTML
    let programRows = '';
    data.forEach((row) => {
      const count = filteredAppsData.filter(a => (a.BeasiswaID === (row.id || row.ID) || a.Beasiswa?.id === (row.id || row.ID) || a.Beasiswa?.ID === (row.id || row.ID)) && a.Status === 'Diterima').length;
      const absorbed = count * (row.NilaiBantuan || row.nilai_bantuan || 0);
      const remaining = (row.Anggaran || 0) - absorbed;
      const sponsor = (row.Kategori || '').toLowerCase() === 'internal' ? 'Kampus' : 'Mitra';
      programRows += `
        <tr>
          <td><strong>${row.Nama || '—'}</strong></td>
          <td align="center">${sponsor}</td>
          <td align="right">${formatCurrency(row.Anggaran || 0)}</td>
          <td align="right"><strong>${formatCurrency(absorbed)}</strong></td>
          <td align="right" style="color: ${remaining < 0 ? '#dc2626' : '#475569'}">${formatCurrency(remaining)}</td>
          <td align="center"><strong>${count} Mhs</strong></td>
        </tr>
      `;
    });
    if (data.length === 0) {
      programRows = `<tr><td colspan="6" align="center" style="color: #94a3b8; font-style: italic;">Tidak ada data program</td></tr>`;
    }

    // 4. Prepare Recipient Table HTML
    let recipientRows = '';
    const acceptedMhs = filteredAppsData.filter(a => a.Status === 'Diterima');
    acceptedMhs.forEach((row) => {
      recipientRows += `
        <tr>
          <td><strong>${row.Mahasiswa?.Nama || '—'}</strong></td>
          <td align="center">${row.Mahasiswa?.NIM || '—'}</td>
          <td>${(row._fakultas || '—').toUpperCase()}</td>
          <td>${row._prodi || '—'}</td>
          <td><strong>${row.BeasiswaNama || '—'}</strong></td>
          <td align="right" style="color: #16a34a; font-weight: bold;">${formatCurrency(row.Beasiswa?.NilaiBantuan || row.Beasiswa?.nilai_bantuan || 0)}</td>
        </tr>
      `;
    });
    if (acceptedMhs.length === 0) {
      recipientRows = `<tr><td colspan="6" align="center" style="color: #94a3b8; font-style: italic;">Tidak ada data penerima beasiswa aktif</td></tr>`;
    }

    const htmlContent = `<html>
<head>
<meta charset="utf-8">
<title>Laporan Realisasi Beasiswa Rektorat</title>
<style>
  @page {
    size: A4 landscape;
    margin: 0;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    line-height: 1.4;
    color: #334155;
    background-color: #f1f5f9;
    margin: 0;
    padding: 20px 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  .page {
    width: 297mm;
    height: 210mm;
    position: relative;
    box-sizing: border-box;
    background-image: url('${kopImageUrl}');
    background-size: 100% 100%;
    background-repeat: no-repeat;
    background-position: center;
    background-color: #ffffff;
    padding: 38mm 18mm 15mm 18mm;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  
  @media print {
    body {
      background-color: transparent;
      padding: 0;
      gap: 0;
    }
    .page {
      box-shadow: none;
      page-break-after: always;
    }
    .page:last-child {
      page-break-after: avoid;
    }
  }

  .header-report {
    text-align: center;
    margin-bottom: 15px;
    border-bottom: 2px solid #00236f;
    padding-bottom: 8px;
  }

  h1 {
    color: #00236f;
    font-size: 15px;
    font-weight: 800;
    margin: 0 0 3px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .subtitle {
    color: #64748b;
    font-size: 9px;
    font-weight: 700;
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  h3 {
    color: #00236f;
    font-size: 10.5px;
    font-weight: 700;
    margin-top: 15px;
    margin-bottom: 6px;
    border-left: 3px solid #00236f;
    padding-left: 8px;
    text-transform: uppercase;
  }

  .summary-container {
    display: flex;
    justify-content: space-between;
    width: 100%;
    margin-bottom: 8px;
  }

  .summary-card {
    background-color: #f8fafc;
    border: 1px solid #e2e8f0;
    padding: 8px 12px;
    border-radius: 8px;
    width: 32%;
    box-sizing: border-box;
  }

  .card-title {
    font-size: 8px;
    font-weight: 700;
    color: #64748b;
    text-transform: uppercase;
    margin-bottom: 2px;
  }

  .card-value {
    font-size: 13px;
    font-weight: 800;
    color: #1e293b;
  }

  .text-success { color: #16a34a !important; }
  .text-warning { color: #d97706 !important; }

  .card-desc {
    font-size: 8px;
    color: #94a3b8;
    margin-top: 2px;
  }

  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 5px;
    margin-bottom: 10px;
  }

  table.data-table th {
    background-color: #00236f;
    color: #ffffff;
    font-weight: 700;
    text-align: left;
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    font-size: 9px;
    text-transform: uppercase;
  }

  table.data-table td {
    padding: 6px 8px;
    border: 1px solid #cbd5e1;
    font-size: 9px;
    color: #334155;
  }

  table.data-table tr:nth-child(even) td {
    background-color: #f8fafc;
  }

  .signature-section {
    margin-top: 20px;
    text-align: right;
    font-size: 9px;
    color: #334155;
    float: right;
    width: 280px;
  }
</style>
</head>
<body>
  <div class="page">
    <div class="header-report">
      <h1>LAPORAN REALISASI & DISTRIBUSI DANA BEASISWA</h1>
      <div class="subtitle">UNIVERSITAS BHAKTI KENCANA REKTORAT</div>
      <div style="font-size: 11px; font-weight: bold; margin-top: 8px;">Nomor: ${nomorSurat}</div>
    </div>

    <h3>I. RINGKASAN EKSEKUTIF REALISASI</h3>
    ${summaryHtml}

    <h3>II. PENYERAPAN ANGGARAN BEASISWA PER FAKULTAS</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Fakultas</th>
          <th align="right" style="text-align: right;">Dana Terserap</th>
          <th align="center" style="text-align: center;">Persentase Distribusi</th>
        </tr>
      </thead>
      <tbody>
        ${facultyRows}
      </tbody>
    </table>
  </div>

  <div class="page">
    <div class="header-report">
      <h1>LAPORAN REALISASI & DISTRIBUSI DANA BEASISWA</h1>
      <div class="subtitle">UNIVERSITAS BHAKTI KENCANA REKTORAT</div>
      <div style="font-size: 11px; font-weight: bold; margin-top: 8px;">Nomor: ${nomorSurat}</div>
    </div>

    <h3>III. REALISASI ANGGARAN DETAIL PER PROGRAM</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Program Beasiswa</th>
          <th align="center" style="text-align: center;">Sponsor</th>
          <th align="right" style="text-align: right;">Pagu Anggaran</th>
          <th align="right" style="text-align: right;">Dana Terserap</th>
          <th align="right" style="text-align: right;">Sisa Anggaran</th>
          <th align="center" style="text-align: center;">Jumlah Penerima</th>
        </tr>
      </thead>
      <tbody>
        ${programRows}
      </tbody>
    </table>
  </div>

  <div class="page">
    <div class="header-report">
      <h1>LAPORAN REALISASI & DISTRIBUSI DANA BEASISWA</h1>
      <div class="subtitle">UNIVERSITAS BHAKTI KENCANA REKTORAT</div>
      <div style="font-size: 11px; font-weight: bold; margin-top: 8px;">Nomor: ${nomorSurat}</div>
    </div>

    <h3>IV. DAFTAR PENERIMA BEASISWA AKTIF</h3>
    <table class="data-table">
      <thead>
        <tr>
          <th>Nama Mahasiswa</th>
          <th align="center" style="text-align: center;">NIM</th>
          <th>Fakultas</th>
          <th>Program Studi</th>
          <th>Beasiswa Terdaftar</th>
          <th align="right" style="text-align: right;">Nilai Bantuan</th>
        </tr>
      </thead>
      <tbody>
        ${recipientRows}
      </tbody>
    </table>

    <!-- Footer Signature Section -->
    <div style="width: 100%; display: inline-block; margin-top: 10px;">
      <div class="signature-section">
        <p>Dicetak secara otomatis oleh Portal SIAKAD Rektorat BKU</p>
        <p style="margin-top: 2px;">Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</p>
        <br/>
        <p>Mengetahui,</p>
        <p style="font-weight: 700; margin-top: 5px;">Rektor Universitas Bhakti Kencana</p>
        <div style="margin-top: 40px; font-weight: 700; text-decoration: underline;">Dr. apt. Entris Sutrisno, MH. Kes.</div>
      </div>
    </div>
  </div>

  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>`;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getAllScholarships()
      if (res.status === 'success') setData(res.data || [])
      else toast.error('Gagal memuat data beasiswa')
    } catch { toast.error('Koneksi sistem terputus') } finally { setLoading(false) }
  }

  const fetchApps = async () => {
    setAppsLoading(true)
    try {
      const res = await adminService.getAllScholarshipApplications()
      if (res.status === 'success') {
        const getStandardDbStatus = (status) => {
          const s = (status || '').toLowerCase();
          if (s === 'disetujui fakultas') return 'Disetujui Fakultas';
          if (s === 'ditolak fakultas') return 'Ditolak Fakultas';
          if (s === 'diterima') return 'Diterima';
          if (s === 'ditolak') return 'Ditolak';
          if (s === 'proses') return 'Proses';
          if (s === 'menunggu' || s === 'menunggu verifikasi') return 'Menunggu';
          if (['dikirim', 'seleksi_berkas', 'evaluasi', 'review', 'penetapan'].includes(s)) {
            return status;
          }
          return status || 'Proses';
        }

        const normalized = (res.data || []).map(a => {
          const m = a.Mahasiswa || a.mahasiswa || {};
          const b = a.Beasiswa || a.beasiswa || {};
          const mNama = m.Nama || m.nama || '—';
          const mNim = m.NIM || m.nim || '—';
          const bNama = b.Nama || b.nama || '—';
          const mFoto = m.Foto || m.foto || m.foto_url || null;
          const fak = m.fakultas?.Nama || m.Fakultas?.Nama || m.fakultas?.nama || m.Fakultas?.nama || '—';
          const prodi = m.program_studi?.nama || m.ProgramStudi?.Nama || m.program_studi?.Nama || '—';
          return {
            ...a,
            Mahasiswa: {
              ...m,
              Nama: mNama,
              NIM: mNim,
              Foto: mFoto
            },
            Beasiswa: {
              ...b,
              Nama: bNama
            },
            MahasiswaNama: mNama,
            MahasiswaNIM: mNim,
            BeasiswaNama: bNama,
            Status: getStandardDbStatus(a.Status || a.status),
            Catatan: a.Catatan || a.catatan || '',
            Motivasi: a.motivasi || a.Motivasi || '',
            FileURL: a.bukti_url || a.BuktiURL || a.file_url || a.FileURL || null,
            KtmKtpURL: a.ktm_ktp_url || a.KtmKtpURL || null,
            SertifikatURL: a.sertifikat_url || a.SertifikatURL || null,
            TranskripURL: a.transkrip_url || a.TranskripURL || null,
            _fakultas: fak,
            _prodi: prodi,
            _semester: m.SemesterSekarang || m.semester_sekarang || '—'
          }
        })

        // Super Admin only sees applications once approved by the faculty (or finalized by admin)
        const filtered = normalized.filter(a =>
          a.Status !== 'Menunggu' &&
          a.Status !== 'Ditolak Fakultas'
        )
        setAppsData(filtered)
      }
      else toast.error('Gagal memuat data pendaftar')
    } catch { toast.error('Koneksi sistem terputus') } finally { setAppsLoading(false) }
  }

  const fetchPeriods = async () => {
    try {
      const res = await adminService.getAllAcademicPeriods()
      if (res && res.status === 'success') {
        setAllPeriods(res.data || [])
      }
    } catch {
      // silent fail
    }
  }

  useEffect(() => {
    fetchData()
    fetchApps()
    fetchPeriods()
  }, [])



  const handleOpenAdd = () => {
    setIsEditMode(false);
    setForm({ Nama: '', Penyelenggara: '', Deskripsi: '', Deadline: '', Kuota: 0, IPKMin: 0, Anggaran: 0, Kategori: 'Internal', Persyaratan: '', FileKtm: 'wajib', FileTranskrip: 'wajib', FileSertifikat: 'opsional' });
    setCustomFieldsList([]);
    setIsCrudOpen(true)
  }
  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({
      ID: row.id || row.ID,
      Nama: row.Nama || '',
      Penyelenggara: row.Penyelenggara || '',
      Deskripsi: row.Deskripsi || '',
      Deadline: (row.Deadline || '').split('T')[0],
      Kuota: row.Kuota || 0,
      IPKMin: row.IPKMin || 0,
      Anggaran: row.Anggaran || 0,
      Kategori: row.Kategori || row.kategori || 'Internal',
      Persyaratan: row.Persyaratan || row.persyaratan || '',
      FileKtm: row.FileKtm || row.file_ktm || 'wajib',
      FileTranskrip: row.FileTranskrip || row.file_transkrip || 'wajib',
      FileSertifikat: row.FileSertifikat || row.file_sertifikat || 'opsional'
    })
    let fields = [];
    try {
      const rawFields = row.CustomFields || row.custom_fields;
      if (rawFields) {
        fields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields;
      }
    } catch (e) {
      console.error("Error parsing custom fields", e);
    }
    setCustomFieldsList(Array.isArray(fields) ? fields : []);
    setIsCrudOpen(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    const payload = {
      ...form,
      Kuota: parseInt(form.Kuota) || 0,
      IPKMin: parseFloat(form.IPKMin) || 0,
      Anggaran: parseFloat(form.Anggaran) || 0,
      Deadline: form.Deadline ? new Date(form.Deadline).toISOString() : null,
      Persyaratan: form.Persyaratan || '',
      FileKtm: form.FileKtm || 'wajib',
      FileTranskrip: form.FileTranskrip || 'wajib',
      FileSertifikat: form.FileSertifikat || 'opsional',
      CustomFields: JSON.stringify(customFieldsList)
    }
    try {
      const targetId = form.ID || form.id
      const res = targetId ? await adminService.updateScholarship(targetId, payload) : await adminService.createScholarship(payload)
      if (res.status === 'success') {
        toast.success(targetId ? 'Beasiswa diperbarui' : 'Beasiswa berhasil ditambahkan')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menyimpan data')
      }
    } catch { toast.error('Terjadi kesalahan sistem') } finally { setIsSubmitting(false) }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      await adminService.deleteScholarship(selected.id || selected.ID)
      toast.success('Beasiswa berhasil dihapus')
      setIsDelOpen(false)
      fetchData()
    } catch { toast.error('Gagal menghapus data') } finally { setIsSubmitting(false) }
  }

  const isDeadlinePassed = (d) => d && new Date(d) < new Date()

  const getDaysLeft = (d) => {
    if (!d) return -1
    const diff = new Date(d) - new Date()
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  // Stats Calculations
  const stats = {
    totalPrograms: data.length,
    pendingApps: filteredAppsData.filter(a => a.Status === 'Menunggu' || a.Status === 'Menunggu Verifikasi' || a.Status === 'Proses').length,
    activeAwardees: filteredAppsData.filter(a => a.Status === 'Diterima' || a.Status === 'Disetujui').length,
    totalBudget: data.reduce((acc, curr) => acc + (parseFloat(curr.Anggaran) || 0), 0),
    verificationProgress: filteredAppsData.length > 0 ? Math.round((filteredAppsData.filter(a => a.Status === 'Diterima' || a.Status === 'Ditolak').length / filteredAppsData.length) * 100) : 0,
    urgentPrograms: data.filter(s => {
      const days = getDaysLeft(s.Deadline)
      return days <= 3 && days >= 0
    }).length
  }

  const absorbedBudget = React.useMemo(() => {
    return filteredAppsData
      .filter(a => a.Status === 'Diterima')
      .reduce((acc, curr) => acc + (parseFloat(curr.Beasiswa?.NilaiBantuan || curr.Beasiswa?.nilai_bantuan || 0)), 0)
  }, [filteredAppsData])

  const remainingBudget = stats.totalBudget - absorbedBudget
  const absorptionRate = stats.totalBudget > 0 ? Math.round((absorbedBudget / stats.totalBudget) * 100) : 0

  const facultyAbsorption = React.useMemo(() => {
    const counts = {}
    filteredAppsData.filter(a => a.Status === 'Diterima').forEach(a => {
      const fac = a._fakultas || 'Lainnya'
      const val = parseFloat(a.Beasiswa?.NilaiBantuan || a.Beasiswa?.nilai_bantuan || 0)
      counts[fac] = (counts[fac] || 0) + val
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredAppsData])

  const facultyApplicants = React.useMemo(() => {
    const counts = {}
    filteredAppsData.forEach(a => {
      const fac = a._fakultas || 'Lainnya'
      counts[fac] = (counts[fac] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredAppsData])

  const highestApplicantFaculty = React.useMemo(() => {
    if (facultyApplicants.length === 0) return { name: 'Tidak ada data', count: 0 }
    const top = facultyApplicants[0]
    return { name: top.name, count: top.value }
  }, [facultyApplicants])

  const lowestApplicantFaculty = React.useMemo(() => {
    if (facultyApplicants.length === 0) return { name: 'Tidak ada data', count: 0 }
    const bot = facultyApplicants[facultyApplicants.length - 1]
    return { name: bot.name, count: bot.value }
  }, [facultyApplicants])

  const highestAbsorbingFaculty = React.useMemo(() => {
    if (facultyAbsorption.length === 0) return '—'
    return facultyAbsorption[0].name
  }, [facultyAbsorption])

  const providerData = React.useMemo(() => {
    let kampusCount = 0
    let kampusBudget = 0
    let mitraCount = 0
    let mitraBudget = 0

    data.forEach(s => {
      const cat = (s.Kategori || '').toLowerCase()
      const budget = parseFloat(s.Anggaran || 0)
      if (cat === 'internal') {
        kampusCount++
        kampusBudget += budget
      } else {
        mitraCount++
        mitraBudget += budget
      }
    })

    return {
      kampusCount,
      kampusBudget,
      mitraCount,
      mitraBudget,
      chartData: [
        { name: 'Kampus (Internal)', value: kampusCount, budget: kampusBudget },
        { name: 'Mitra (Eksternal)', value: mitraCount, budget: mitraBudget }
      ]
    }
  }, [data])

  const facultyComparisonData = React.useMemo(() => {
    const map = {}
    filteredAppsData.forEach(a => {
      const fac = a._fakultas || 'Lainnya'
      if (!map[fac]) {
        map[fac] = { name: getShortFacultyName(fac), pendaftar: 0, penerima: 0 }
      }
      map[fac].pendaftar++
      if (a.Status === 'Diterima') {
        map[fac].penerima++
      }
    })
    return Object.values(map).sort((a, b) => b.pendaftar - a.pendaftar)
  }, [filteredAppsData])

  const categoryBreakdownData = React.useMemo(() => {
    const counts = {}
    data.forEach(s => {
      const cat = s.Kategori || 'Lainnya'
      counts[cat] = (counts[cat] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [data])

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val)
  }

  const columns = [
    {
      key: 'Nama',
      label: 'Program Beasiswa',
      className: 'min-w-[260px]',
      render: (v, row) => {
        const val = row?.created_at || row?.CreatedAt || '';
        return (
          <div className="flex flex-col py-1">
            <span className="font-bold text-[var(--theme-text)] font-headline text-[13px] tracking-tighter leading-tight">{v || '—'}</span>
            <span className="text-[10px] text-[var(--theme-text-muted)] font-semibold mt-0.5">
              Dibuat: {val ? formatDateTime(val) : '—'}
            </span>
          </div>
        )
      }
    },
    {
      key: 'Penyelenggara',
      label: 'Instansi',
      className: 'w-[180px]',
      render: v => <span className="text-[12px] font-medium text-[var(--theme-text-muted)]">{v || '—'}</span>
    },
    {
      key: 'IPKMin',
      label: 'IPK Min',
      className: 'w-[100px] text-center',
      cellClassName: 'text-center',
      render: v => <span className="font-bold text-[var(--theme-primary)] text-[13px] font-headline tracking-tighter">{parseFloat(v || 0).toFixed(2)}</span>
    },
    {
      key: 'Anggaran',
      label: 'Alokasi Dana',
      className: 'w-[160px] text-right',
      cellClassName: 'text-right',
      render: v => <span className="font-bold text-[var(--theme-text)] text-[13px] font-headline tracking-tighter">Rp {new Intl.NumberFormat('id-ID').format(v || 0)}</span>
    },
    {
      key: 'Kuota',
      label: 'Kapasitas & Penerima',
      className: 'w-[180px]',
      render: (v, row) => {
        const current = filteredAppsData.filter(a => (a.BeasiswaID === (row.id || row.ID) || a.Beasiswa?.id === (row.id || row.ID) || a.Beasiswa?.ID === (row.id || row.ID)) && (a.Status === 'Diterima' || a.Status === 'Disetujui')).length;
        const capacity = row.Kuota || 0;
        const pct = capacity <= 0
          ? 0
          : current >= capacity
            ? 100
            : Math.min(99, Math.floor((current / capacity) * 100));
        return (
          <div className="flex items-center gap-4 min-w-[120px]">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-[var(--theme-text-muted)] font-bold">{current} / {capacity} Mhs</span>
                <span className="text-[10px] font-black text-[var(--theme-primary)]">{pct}%</span>
              </div>
              <div className="w-full h-1.5 bg-neutral-100/80 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", pct > 90 ? "bg-rose-500" : "bg-gradient-to-r from-primary to-blue-400")}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'Deadline',
      label: 'Status Batas',
      className: 'w-[150px] text-center',
      cellClassName: 'text-center',
      render: v => (
        <Badge className={cn('px-3 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-widest', isDeadlinePassed(v) ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100')}>
          {v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '—'}
        </Badge>
      )
    }
  ]

  const appColumns = [
    {
      key: 'Mahasiswa',
      label: 'Profil Mahasiswa',
      className: 'min-w-[220px]',
      render: (v, row) => {
        const val = row?.created_at || row?.CreatedAt || '';
        return (
          <div className="flex flex-col py-1">
            <span className="font-bold text-[var(--theme-text)] font-headline text-[13px] tracking-tighter leading-tight">{row.Mahasiswa?.Nama || '—'}</span>
            <div className="flex flex-col gap-0.5 mt-0.5">
              <span className="text-[11px] text-[var(--theme-text-muted)] font-medium">{row.Mahasiswa?.NIM || '—'}</span>
              <span className="text-[10px] text-[var(--theme-text-muted)] opacity-80 font-semibold">
                Mendaftar: {val ? formatDateTime(val) : '—'}
              </span>
            </div>
          </div>
        )
      }
    },
    {
      key: 'Beasiswa',
      label: 'Program Pilihan',
      className: 'w-[200px]',
      render: (v, row) => <span className="text-[12px] font-medium text-[var(--theme-text-muted)]">{row.Beasiswa?.Nama || '—'}</span>
    },
    {
      key: 'created_at',
      label: 'Waktu Submit',
      className: 'w-[180px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => {
        const val = row?.created_at || row?.CreatedAt || v;
        return <span className="text-[11px] font-semibold text-[var(--theme-text-muted)] tabular-nums">{val ? formatDateTime(val) : '—'}</span>
      }
    },
    {
      key: 'Status',
      label: 'Status Verifikasi',
      className: 'w-[140px] text-center',
      cellClassName: 'text-center',
      render: v => {
        const st = getAppStatus(v)
        return <Badge className={cn('px-3 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-widest', st.cls)}>{st.label || v}</Badge>
      }
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Manajemen"
        highlightedTitle="Beasiswa"
        subtitle="Kelola program bantuan dana pendidikan, beasiswa eksternal, dan verifikasi pendaftaran mahasiswa secara terintegrasi."
        icon="emoji_events"
        badges={[{ label: 'Student Welfare', active: false }]}
        actions={
          activeTab === 'programs' && (
            <Button
              onClick={handleOpenAdd}
              className="h-11 px-6 w-full lg:w-auto rounded-xl bg-primary text-white hover:bg-primary/90 shadow-md gap-2 transition-all active:scale-95 border-none justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={3}>add</span>
              <span className="text-xs font-bold uppercase tracking-widest">Tambah Program</span>
            </Button>
          )
        }
      />

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div className="space-y-4 md:space-y-5">
        {/* Row 1: Utama (5 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
          <PrimaryStatsCard
            title="Total Program"
            value={stats.totalPrograms}
            icon={Award}
            colorTheme="primary"
            badgeText="Aktif"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
          />
          <PrimaryStatsCard
            title="Antrian Verifikasi"
            value={stats.pendingApps}
            icon={Activity}
            colorTheme="warning"
            badgeText="Pending"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">schedule</span>}
          />
          <PrimaryStatsCard
            title="Penerima Beasiswa"
            value={stats.activeAwardees}
            icon={Users}
            colorTheme="success"
            badgeText="Tersalurkan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">done_all</span>}
          />
          <PrimaryStatsCard
            title="Total Anggaran"
            value={formatCurrency(stats.totalBudget)}
            icon={Banknote}
            colorTheme="info"
            badgeText="Proyeksi"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">info</span>}
          />
          <PrimaryStatsCard
            title="Realisasi Anggaran"
            value={formatCurrency(absorbedBudget)}
            icon={Wallet}
            colorTheme="success"
            badgeText={`${absorptionRate}%`}
            badgeIcon={<span className="material-symbols-outlined text-[12px]">trending_up</span>}
          />
        </div>

        {/* Row 2: Faculty Insights & Extra Stats (4 Cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          <PrimaryStatsCard
            title="Pendaftar Terbanyak"
            value={getShortFacultyName(highestApplicantFaculty.name)}
            badgeText={`${highestApplicantFaculty.count} Pendaftar`}
            icon={TrendingUpIcon}
            colorTheme="primary"
          />
          <PrimaryStatsCard
            title="Pendaftar Terendah"
            value={getShortFacultyName(lowestApplicantFaculty.name)}
            badgeText={`${lowestApplicantFaculty.count} Pendaftar`}
            icon={TrendingDownIcon}
            colorTheme="error"
          />
          <PrimaryStatsCard
            title="Progres Review"
            value={`${stats.verificationProgress}%`}
            badgeText="Pengajuan"
            icon={FactCheckIcon}
            colorTheme="success"
          />
          <PrimaryStatsCard
            title="Deadline Dekat"
            value={`${stats.urgentPrograms} Program`}
            badgeText="<= 3 hari"
            icon={AlarmIcon}
            colorTheme={stats.urgentPrograms > 0 ? "error" : "primary"}
          />
        </div>
      </div>

      {/* ── Charts Section ──────────────────────────────────────── */}
      {!loading && data.length > 0 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Bar Chart: Program dengan Anggaran Terbesar */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#eef4ff] rounded-xl flex justify-center items-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }} >bar_chart</span>
                </div>
                <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest font-headline">Alokasi Anggaran Beasiswa Terbesar</span>
              </div>
              <div className="h-[200px] w-full mt-2">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={budgetByProgramData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-muted)" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                    <YAxis tickFormatter={v => `Rp ${new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(v)}`} tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'var(--theme-surface)' }}
                      formatter={v => [formatCurrency(v), 'Alokasi Anggaran']}
                      contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "11px", fontWeight: "bold", color: "var(--theme-text)" }}
                    />
                    <Bar dataKey="value" name="Anggaran" fill="var(--theme-primary)" radius={[6, 6, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Pie Chart: Status Seleksi Pendaftaran */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-success/10 rounded-xl flex justify-center items-center text-success flex-shrink-0">
                  <span className="material-symbols-outlined text-success" style={{ fontSize: '18px' }} >pie_chart</span>
                </div>
                <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest font-headline">Status Pendaftaran Seleksi</span>
              </div>
              <div className="h-[140px] w-full flex items-center justify-center">
                {appStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={appStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {appStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold", color: "var(--theme-text)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400 italic">Tidak ada data pendaftaran</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {appStatusData.slice(0, 4).map((item, idx) => (
                  <div key={item.name} className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <p className="text-[9px] font-bold text-[var(--theme-text-muted)] truncate leading-none uppercase tracking-wide">{item.name}</p>
                    </div>
                    <p className="text-sm font-black text-[var(--theme-text)] leading-none font-headline tracking-tighter pl-3.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 2 Charts: Faculty Comparison & Category Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
            {/* Double Bar Chart: Pendaftar vs Penerima per Fakultas */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-[#eef4ff] rounded-xl flex justify-center items-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }} >compare_arrows</span>
                </div>
                <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest font-headline">Komparasi Pendaftar vs Penerima per Fakultas</span>
              </div>
              <div className="h-[200px] w-full mt-2">
                {facultyComparisonData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={facultyComparisonData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-muted)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'var(--theme-surface)' }}
                        contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "11px", fontWeight: "bold", color: "var(--theme-text)" }}
                      />
                      <Bar dataKey="pendaftar" name="Total Pendaftar" fill="var(--theme-primary)" radius={[6, 6, 0, 0]} barSize={20} />
                      <Bar dataKey="penerima" name="Diterima" fill="var(--theme-success)" radius={[6, 6, 0, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Belum ada data pendaftar</div>
                )}
              </div>
            </div>

            {/* Donut Chart: Kategori Beasiswa */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex justify-center items-center flex-shrink-0">
                  <span className="material-symbols-outlined text-purple-600" style={{ fontSize: '18px' }} >category</span>
                </div>
                <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest font-headline">Distribusi Kategori Beasiswa</span>
              </div>
              <div className="h-[140px] w-full flex items-center justify-center">
                {categoryBreakdownData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={categoryBreakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        paddingAngle={4}
                        dataKey="value"
                        stroke="none"
                      >
                        {categoryBreakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold", color: "var(--theme-text)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400 italic">Tidak ada data beasiswa</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {categoryBreakdownData.slice(0, 4).map((item, idx) => (
                  <div key={item.name} className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <p className="text-[9px] font-bold text-[var(--theme-text-muted)] truncate leading-none uppercase tracking-wide">{item.name}</p>
                    </div>
                    <p className="text-sm font-black text-[var(--theme-text)] leading-none font-headline tracking-tighter pl-3.5">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tabbed Content Section ─────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-6">
        <div className="flex justify-center md:justify-start overflow-x-auto pb-1">
          <TabsList className="bg-white border border-neutral-200 p-1.5 rounded-xl h-auto shadow-sm flex-nowrap shrink-0">
            <TabsTrigger value="programs" className="rounded-lg px-4 sm:px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
              <Award size={14} className="mr-2 inline" /> Program Beasiswa
            </TabsTrigger>
            <TabsTrigger value="applications" className="rounded-lg px-4 sm:px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
              <span className="material-symbols-outlined mr-2 inline" style={{ fontSize: '14px' }} >group</span> Verifikasi Pendaftar
            </TabsTrigger>
            <TabsTrigger value="reports" className="rounded-lg px-4 sm:px-8 py-2.5 text-[10px] font-bold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-white transition-all duration-300">
              <span className="material-symbols-outlined mr-2 inline" style={{ fontSize: '14px' }} >monitoring</span> Laporan & Realisasi
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="programs">
          <div>
            <div>
              <DataTable
                title="Daftar Program Beasiswa"
                subtitle="Menampilkan daftar program beasiswa yang tersedia."
                columns={columns}
                data={data}
                loading={loading}
                searchPlaceholder="Cari nama program atau instansi..."
                actions={(row) => (
                  <div className="flex items-center gap-1.5">
                    <Button onClick={() => setSelectedProgram(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-primary hover:bg-[#eef4ff] rounded-lg transition-colors" title="Lihat Detail"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >visibility</span></Button>
                    <Button onClick={() => handleOpenEdit(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >edit</span></Button>
                    <Button onClick={() => { setSelected(row); setIsDelOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >delete</span></Button>
                  </div>
                )}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <div>
            <div>
              <DataTable
                title="Laporan Penerimaan Beasiswa"
                subtitle="Menampilkan daftar seluruh penerimaan beasiswa."
                columns={appColumns}
                data={filteredAppsData}
                loading={appsLoading}
                searchPlaceholder="Cari mahasiswa atau program..."
                externalFilters={appFilters}
                onExternalFilterChange={setAppFilters}
                filters={[
                  {
                    key: 'BeasiswaNama',
                    placeholder: 'Semua Beasiswa',
                    options: uniqueSchNames.map(name => ({ label: name, value: name }))
                  }
                ]}
                enableRowSelection={true}
                selectedRows={selectedAppIds}
                onSelectedRowsChange={setSelectedAppIds}
                actions={(row) => (
                  <div className="flex items-center gap-1.5">
                    <Button onClick={() => setPreviewApp(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors" title="Lihat Detail Pendaftaran"><span className="material-symbols-outlined" style={{ fontSize: '18px' }} >visibility</span></Button>
                    <Button onClick={() => setSelectedApp(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Review Pendaftaran"><span className="material-symbols-outlined" style={{ fontSize: '18px' }} >edit_note</span></Button>
                  </div>
                )}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white border border-slate-200/60 p-4 md:p-5 rounded-2xl gap-4">
            <div>
              <h3 className="text-sm font-black text-[var(--theme-text)] font-headline tracking-tighter">Laporan Realisasi & Penyerapan Dana</h3>
              <p className="text-[10px] text-[var(--theme-text-muted)] font-bold uppercase tracking-widest mt-1.5 font-headline">Unduh laporan resmi beasiswa rektorat dalam format PDF Landscape</p>
            </div>
            <Button
              onClick={downloadRealisasiPDF}
              className="h-10 px-5 rounded-xl bg-[#00236F] text-white hover:bg-[#001f5c] shadow-md gap-2 transition-all active:scale-95 border-none w-full sm:w-auto justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>download</span>
              <span className="text-xs font-bold uppercase tracking-widest">Unduh Laporan PDF</span>
            </Button>
          </div>

          {/* Realisasi Anggaran Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border border-slate-200/60 p-5 rounded-2xl bg-white shadow-none">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest leading-none font-headline">Realisasi Anggaran</p>
                    <h4 className="text-xl font-black text-[var(--theme-text)] tracking-tighter font-headline mt-1">{absorptionRate}% Terserap</h4>
                  </div>
                  <span className="material-symbols-outlined text-[var(--theme-primary)] bg-[var(--theme-primary-light)] p-2 rounded-xl" style={{ fontSize: 20 }}>payments</span>
                </div>

                <div className="space-y-2">
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--theme-primary)] rounded-full transition-all duration-500" style={{ width: `${absorptionRate}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-[var(--theme-text-muted)] font-headline tracking-wide">
                    <span>Terserap: {formatCurrency(absorbedBudget)}</span>
                    <span>Pagu: {formatCurrency(stats.totalBudget)}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between text-[11px] font-bold font-headline tracking-wide">
                  <span className="text-[var(--theme-text-muted)]">Sisa Anggaran Belum Tersalurkan:</span>
                  <span className="text-[var(--theme-text)]">{formatCurrency(remainingBudget)}</span>
                </div>
              </div>
            </Card>

            <Card className="border border-slate-200/60 p-5 rounded-2xl bg-white shadow-none flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest leading-none font-headline">Penyerap Anggaran Terbesar</p>
                <h4 className="text-lg font-black text-[var(--theme-text)] tracking-tighter font-headline mt-1.5 truncate" title={highestAbsorbingFaculty}>{highestAbsorbingFaculty}</h4>
                <p className="text-[10px] text-[var(--theme-text-muted)] font-bold mt-1 font-headline tracking-wide">
                  Fakultas ini memimpin penyerapan beasiswa dengan alokasi total:
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline font-headline">
                <span className="text-[11px] font-bold text-[var(--theme-text-muted)] tracking-wide">Nilai Terserap:</span>
                <span className="text-lg font-black text-[var(--theme-primary)] tracking-tighter font-headline">{formatCurrency(facultyAbsorption[0]?.value || 0)}</span>
              </div>
            </Card>

            <Card className="border border-slate-200/60 p-5 rounded-2xl bg-white shadow-none flex flex-col justify-between">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest leading-none font-headline">Breakdown Pemberi Beasiswa</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="p-2 bg-blue-50/50 border border-blue-100 rounded-xl">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest font-headline block">KAMPUS (INTERNAL)</span>
                    <span className="text-sm font-black text-[var(--theme-text)] tracking-tighter font-headline block mt-1">{providerData.kampusCount} Program</span>
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] font-headline tracking-wide block mt-0.5">{formatCurrency(providerData.kampusBudget)}</span>
                  </div>
                  <div className="p-2 bg-purple-50/50 border border-purple-100 rounded-xl">
                    <span className="text-[9px] font-black text-purple-500 uppercase tracking-widest font-headline block">MITRA (EKSTERNAL)</span>
                    <span className="text-sm font-black text-[var(--theme-text)] tracking-tighter font-headline block mt-1">{providerData.mitraCount} Program</span>
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] font-headline tracking-wide block mt-0.5">{formatCurrency(providerData.mitraBudget)}</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Graphics Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart: Penyerapan Dana per Fakultas */}
            <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex justify-center items-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined text-primary" style={{ fontSize: '18px' }} >apartment</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest font-headline block">Distribusi Penyerapan Anggaran per Fakultas</span>
                  <span className="text-xs font-bold text-[var(--theme-text-muted)] opacity-80 block mt-0.5">Urutan fakultas berdasarkan nominal dana beasiswa yang berhasil diserap</span>
                </div>
              </div>
              <div className="h-[250px] w-full mt-2">
                {facultyAbsorption.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={facultyAbsorption} margin={{ top: 10, right: 10, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-muted)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => `Rp ${new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(v)}`} tick={{ fontSize: 9, fontWeight: 800, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: 'var(--theme-surface)' }}
                        formatter={v => [formatCurrency(v), 'Dana Terserap']}
                        contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "11px", fontWeight: "bold", color: "var(--theme-text)" }}
                      />
                      <Bar dataKey="value" name="Dana Terserap" fill="var(--theme-primary)" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 italic text-xs">Belum ada dana terserap (penerima berstatus Diterima)</div>
                )}
              </div>
            </div>

            {/* Pie/Donut Chart: Provider comparison */}
            <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none flex flex-col justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-success/10 rounded-xl flex justify-center items-center text-success flex-shrink-0">
                  <span className="material-symbols-outlined text-success" style={{ fontSize: '18px' }} >corporate_fare</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest font-headline block">Proporsi Dana Pemberi Beasiswa</span>
                  <span className="text-xs font-bold text-[var(--theme-text-muted)] opacity-80 block mt-0.5">Kampus (Internal) vs Mitra (Eksternal)</span>
                </div>
              </div>
              <div className="h-[160px] w-full flex items-center justify-center">
                {stats.totalBudget > 0 ? (
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie
                        data={providerData.chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="budget"
                        stroke="none"
                      >
                        {providerData.chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={v => [formatCurrency(v), 'Pagu Anggaran']}
                        contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold", color: "var(--theme-text)" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <span className="text-xs text-slate-400 italic">Tidak ada data pendaftaran</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {providerData.chartData.map((item, idx) => (
                  <div key={item.name} className="flex flex-col gap-1.5 p-2 rounded-xl bg-slate-50/80 border border-slate-100/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                      <p className="text-[9px] font-bold text-[var(--theme-text-muted)] truncate leading-none uppercase tracking-wide">{item.name}</p>
                    </div>
                    <p className="text-sm font-black text-[var(--theme-text)] leading-none font-headline tracking-tighter pl-3.5">{formatCurrency(item.budget)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Faculty Realization Leaderboard Table */}
          <div className="border border-neutral-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="p-0">
              <DataTable
                title="Laporan Penyerapan Anggaran per Fakultas"
                subtitle="Menampilkan daftar seluruh penyerapan anggaran per fakultas."
                columns={[
                  {
                    key: 'name',
                    label: 'Fakultas',
                    render: v => <span className="font-bold text-xs text-neutral-800 font-jakarta">{v.toUpperCase()}</span>
                  },
                  {
                    key: 'value',
                    label: 'Dana Terserap',
                    className: 'text-right',
                    cellClassName: 'text-right',
                    render: v => <span className="font-bold text-neutral-900 text-xs">{formatCurrency(v)}</span>
                  },
                  {
                    key: 'pct',
                    label: 'Persentase Penyerapan',
                    className: 'w-[250px]',
                    render: (v, row) => {
                      const pct = stats.totalBudget <= 0 ? 0 : Math.round((row.value / stats.totalBudget) * 100);
                      return (
                        <div className="flex items-center gap-3 min-w-[150px]">
                          <span className="text-[10px] font-black text-slate-500 w-8">{pct}%</span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    }
                  }
                ]}
                data={facultyAbsorption}
                loading={appsLoading}
                searchPlaceholder="Filter nama fakultas..."
              />
            </div>
          </div>

          {/* Detailed Scholarship Program Realization List */}
          <div className="border border-neutral-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="p-0">
              <DataTable
                title="Laporan Realisasi Dana per Program"
                subtitle="Menampilkan daftar seluruh realisasi dana per program beasiswa."
                columns={[
                  {
                    key: 'Nama',
                    label: 'Program Beasiswa',
                    render: v => <span className="font-bold text-slate-800 text-xs">{v || '—'}</span>
                  },
                  {
                    key: 'Kategori',
                    label: 'Sponsor',
                    render: v => (
                      <Badge className={cn('px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest', (v || '').toLowerCase() === 'internal' ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-purple-50 text-purple-700 border-purple-100')}>
                        {(v || '').toLowerCase() === 'internal' ? 'Kampus' : 'Mitra'}
                      </Badge>
                    )
                  },
                  {
                    key: 'Anggaran',
                    label: 'Pagu Anggaran',
                    className: 'text-right',
                    cellClassName: 'text-right',
                    render: v => <span className="font-semibold text-neutral-600 text-xs">{formatCurrency(v || 0)}</span>
                  },
                  {
                    key: 'absorbed',
                    label: 'Dana Terserap',
                    className: 'text-right',
                    cellClassName: 'text-right',
                    render: (v, row) => {
                      const count = filteredAppsData.filter(a => (a.BeasiswaID === (row.id || row.ID) || a.Beasiswa?.id === (row.id || row.ID) || a.Beasiswa?.ID === (row.id || row.ID)) && a.Status === 'Diterima').length;
                      const val = count * (row.NilaiBantuan || row.nilai_bantuan || 0);
                      return <span className="font-bold text-neutral-800 text-xs">{formatCurrency(val)}</span>;
                    }
                  },
                  {
                    key: 'remaining',
                    label: 'Sisa Anggaran',
                    className: 'text-right',
                    cellClassName: 'text-right',
                    render: (v, row) => {
                      const count = filteredAppsData.filter(a => (a.BeasiswaID === (row.id || row.ID) || a.Beasiswa?.id === (row.id || row.ID) || a.Beasiswa?.ID === (row.id || row.ID)) && a.Status === 'Diterima').length;
                      const absorbed = count * (row.NilaiBantuan || row.nilai_bantuan || 0);
                      const remaining = (row.Anggaran || 0) - absorbed;
                      return <span className={cn("font-bold text-xs", remaining < 0 ? "text-rose-600" : "text-neutral-500")}>{formatCurrency(remaining)}</span>;
                    }
                  },
                  {
                    key: 'recipients',
                    label: 'Penerima',
                    className: 'text-center',
                    cellClassName: 'text-center',
                    render: (v, row) => {
                      const count = filteredAppsData.filter(a => (a.BeasiswaID === (row.id || row.ID) || a.Beasiswa?.id === (row.id || row.ID) || a.Beasiswa?.ID === (row.id || row.ID)) && a.Status === 'Diterima').length;
                      return <span className="font-bold text-neutral-700 text-xs">{count} Mhs</span>;
                    }
                  }
                ]}
                data={data}
                loading={loading}
                searchPlaceholder="Cari program beasiswa..."
              />
            </div>
          </div>

          {/* Detailed Scholarship Recipient List Table */}
          <div className="border border-neutral-200 shadow-sm rounded-xl bg-white overflow-hidden">
            <div className="p-0">
              <DataTable
                title="Laporan Penerima Beasiswa Aktif"
                subtitle="Menampilkan daftar lengkap seluruh mahasiswa penerima beasiswa."
                columns={[
                  {
                    key: 'Mahasiswa',
                    label: 'Nama Mahasiswa',
                    render: (v, row) => (
                      <div className="flex flex-col py-1">
                        <span className="font-bold text-neutral-900 text-xs">{row.Mahasiswa?.Nama || '—'}</span>
                        <span className="text-[10px] text-neutral-400 font-semibold">{row.Mahasiswa?.NIM || '—'}</span>
                      </div>
                    )
                  },
                  {
                    key: '_fakultas',
                    label: 'Fakultas',
                    render: v => <span className="text-xs text-neutral-500 font-medium">{v?.toUpperCase() || '—'}</span>
                  },
                  {
                    key: '_prodi',
                    label: 'Program Studi',
                    render: v => <span className="text-xs text-neutral-400 font-medium">{v || '—'}</span>
                  },
                  {
                    key: 'BeasiswaNama',
                    label: 'Beasiswa Terdaftar',
                    render: v => <span className="text-xs text-neutral-600 font-bold">{v || '—'}</span>
                  },
                  {
                    key: 'Beasiswa.NilaiBantuan',
                    label: 'Nilai Bantuan',
                    className: 'text-right',
                    cellClassName: 'text-right',
                    render: (v, row) => <span className="font-bold text-success text-xs">{formatCurrency(row.Beasiswa?.NilaiBantuan || row.Beasiswa?.nilai_bantuan || 0)}</span>
                  }
                ]}
                data={filteredAppsData.filter(a => a.Status === 'Diterima')}
                loading={appsLoading}
                searchPlaceholder="Cari nama atau NIM penerima..."
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Scholarship CRUD Modal ─────────────────────────────────── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? 'Update Beasiswa' : 'Tambah Beasiswa'}
        subtitle="Program Registry"
        description="Pendaftaran program bantuan dana pendidikan baru."
        icon={isEditMode ? 'edit' : 'add'}
        maxWidth="max-w-2xl"
        bodyClassName="p-0"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} disabled={isSubmitting} />
            <ModalSaveButton
              form="scholarship-form"
              label={isEditMode ? 'SIMPAN PROGRAM' : 'TERBITKAN PROGRAM'}
              icon="save"
              disabled={isSubmitting}
              loading={isSubmitting}
            />
          </>
        }
      >
        <form id="scholarship-form" onSubmit={handleSave} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="p-6 sm:p-8 space-y-4 overflow-y-auto flex-1 min-h-0 font-body bg-[var(--theme-bg)]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Nama Program</Label>
                <Input required value={form.Nama} onChange={e => setForm({ ...form, Nama: e.target.value })} placeholder="Nama beasiswa..." className="h-11 rounded-lg border-neutral-200 bg-white focus:bg-white font-medium text-sm font-jakarta" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Penyelenggara</Label>
                <Input value={form.Penyelenggara} onChange={e => setForm({ ...form, Penyelenggara: e.target.value })} placeholder="Instansi/Lembaga..." className="h-11 rounded-lg border-neutral-200 bg-white focus:bg-white font-medium text-sm font-jakarta" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Kategori</Label>
              <select
                value={form.Kategori}
                onChange={e => setForm({ ...form, Kategori: e.target.value })}
                className="w-full h-11 rounded-lg border border-neutral-200 bg-white focus:bg-white font-medium text-sm font-jakarta px-3 outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="Internal">Internal</option>
                <option value="Mitra">Mitra</option>
                <option value="Prestasi">Prestasi</option>
                <option value="Eksternal">Eksternal</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1 flex items-center gap-1.5">
                  IPK Minimal <span className="material-symbols-outlined text-primary" style={{ fontSize: '12px' }} >show_chart</span>
                </Label>
                <Input type="number" step="0.1" value={form.IPKMin} onChange={e => setForm({ ...form, IPKMin: e.target.value })} placeholder="3.0" className="h-11 rounded-lg border-neutral-200 bg-white focus:bg-white font-medium text-sm font-jakarta" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1 flex items-center gap-1.5">
                  Kuota <span className="material-symbols-outlined text-primary" style={{ fontSize: '12px' }} >group</span>
                </Label>
                <Input type="number" value={form.Kuota} onChange={e => setForm({ ...form, Kuota: e.target.value })} placeholder="50" className="h-11 rounded-lg border-neutral-200 bg-white focus:bg-white font-medium text-sm font-jakarta" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1 flex items-center gap-1.5">
                  Budget (Rp) <Banknote size={12} className="text-primary" />
                </Label>
                <Input type="number" value={form.Anggaran} onChange={e => setForm({ ...form, Anggaran: e.target.value })} placeholder="Rp..." className="h-11 rounded-lg border-neutral-200 bg-white focus:bg-white font-medium text-sm font-jakarta" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1 flex items-center gap-1.5">
                Batas Akhir <span className="material-symbols-outlined text-primary" style={{ fontSize: '12px' }} >calendar_month</span>
              </Label>
              <Input type="date" value={form.Deadline} onChange={e => setForm({ ...form, Deadline: e.target.value })} className="h-11 rounded-lg border-neutral-200 bg-white focus:bg-white font-medium text-sm font-jakarta" />
            </div>

            <div className="bg-white p-4 rounded-xl border border-neutral-200/60 space-y-3">
              <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Ketentuan Berkas Pendaftaran</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-neutral-500 font-jakarta">KTM & KTP</Label>
                  <select
                    value={form.FileKtm}
                    onChange={e => setForm({ ...form, FileKtm: e.target.value })}
                    className="w-full h-10 rounded-lg border border-neutral-200 bg-white font-medium text-xs font-jakarta px-2 outline-none"
                  >
                    <option value="wajib">Wajib</option>
                    <option value="opsional">Opsional</option>
                    <option value="tidak">Tidak Diperlukan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-neutral-500 font-jakarta">Transkrip Nilai</Label>
                  <select
                    value={form.FileTranskrip}
                    onChange={e => setForm({ ...form, FileTranskrip: e.target.value })}
                    className="w-full h-10 rounded-lg border border-neutral-200 bg-white font-medium text-xs font-jakarta px-2 outline-none"
                  >
                    <option value="wajib">Wajib</option>
                    <option value="opsional">Opsional</option>
                    <option value="tidak">Tidak Diperlukan</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-bold text-neutral-500 font-jakarta">Sertifikat Pendukung</Label>
                  <select
                    value={form.FileSertifikat}
                    onChange={e => setForm({ ...form, FileSertifikat: e.target.value })}
                    className="w-full h-10 rounded-lg border border-neutral-200 bg-white font-medium text-xs font-jakarta px-2 outline-none"
                  >
                    <option value="wajib">Wajib</option>
                    <option value="opsional">Opsional</option>
                    <option value="tidak">Tidak Diperlukan</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Custom Requirements Form Builder */}
            <div className="bg-white p-4 rounded-xl border border-neutral-200/60 space-y-3">
              <div className="flex justify-between items-center">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-wider">Persyaratan Kustom Tambahan</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCustomFieldsList([...customFieldsList, { label: '', type: 'text', required: false, options: '' }])}
                  className="h-8 px-3 rounded-lg border-primary/30 hover:border-primary text-primary hover:bg-[#eef4ff] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>add</span>
                  Tambah Form
                </Button>
              </div>

              {customFieldsList.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic">Belum ada persyaratan kustom tambahan.</p>
              ) : (
                <div className="space-y-3">
                  {customFieldsList.map((field, index) => (
                    <div key={index} className="p-3 bg-white border border-neutral-200 rounded-xl space-y-2 relative">
                      <button
                        type="button"
                        onClick={() => setCustomFieldsList(customFieldsList.filter((_, i) => i !== index))}
                        className="absolute top-2 right-2 text-rose-500 hover:bg-rose-50 p-1 rounded-lg transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-500 font-jakarta">Label Pertanyaan</Label>
                          <Input
                            type="text"
                            value={field.label}
                            onChange={(e) => {
                              const updated = [...customFieldsList];
                              updated[index].label = e.target.value;
                              setCustomFieldsList(updated);
                            }}
                            placeholder="Contoh: Essay Singkat / Upload CV"
                            className="h-9 rounded-lg border-neutral-200 text-xs font-medium"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-500 font-jakarta">Tipe Jawaban</Label>
                          <select
                            value={field.type}
                            onChange={(e) => {
                              const updated = [...customFieldsList];
                              updated[index].type = e.target.value;
                              setCustomFieldsList(updated);
                            }}
                            className="w-full h-9 rounded-lg border border-neutral-200 bg-white text-xs font-jakarta px-2 outline-none"
                          >
                            <option value="text">Jawaban Singkat (Text)</option>
                            <option value="paragraph">Paragraf (Textarea)</option>
                            <option value="select">Dropdown (Select)</option>
                            <option value="checkbox">Centang (Checkbox)</option>
                            <option value="file">Unggah Berkas (File)</option>
                          </select>
                        </div>
                      </div>

                      {['select', 'checkbox'].includes(field.type) && (
                        <div className="space-y-1">
                          <Label className="text-[10px] font-bold text-neutral-500 font-jakarta">Opsi Jawaban (pisahkan dengan koma)</Label>
                          <Input
                            type="text"
                            value={field.options || ''}
                            onChange={(e) => {
                              const updated = [...customFieldsList];
                              updated[index].options = e.target.value;
                              setCustomFieldsList(updated);
                            }}
                            placeholder="Contoh: A, B, C"
                            className="h-9 rounded-lg border-neutral-200 text-xs font-medium"
                          />
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          id={`required-${index}`}
                          checked={field.required}
                          onChange={(e) => {
                            const updated = [...customFieldsList];
                            updated[index].required = e.target.checked;
                            setCustomFieldsList(updated);
                          }}
                          className="rounded text-primary focus:ring-primary size-4"
                        />
                        <label htmlFor={`required-${index}`} className="text-[10px] font-bold text-neutral-500 cursor-pointer select-none">
                          Wajib Diisi (Required)
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Deskripsi Program</Label>
              <Textarea value={form.Deskripsi} onChange={e => setForm({ ...form, Deskripsi: e.target.value })} placeholder="Detail deskripsi program beasiswa..." className="min-h-[80px] rounded-xl border-neutral-200 bg-white focus:bg-white p-4 font-medium text-sm font-jakarta" />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Persyaratan (Format Khusus/Custom)</Label>
              <Textarea value={form.Persyaratan} onChange={e => setForm({ ...form, Persyaratan: e.target.value })} placeholder="Masukkan persyaratan rinci beasiswa (bisa list/bullet points)..." className="min-h-[120px] rounded-xl border-neutral-200 bg-white focus:bg-white p-4 font-medium text-sm font-jakarta" />
            </div>

          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Program Beasiswa?"
        description="Data beasiswa dan riwayat pendaftar terkait akan dihapus permanen dari sistem."
        loading={isSubmitting}
      />

      {/* View Program Modal */}
      {selectedProgram && (() => {
        const programApps = filteredAppsData.filter(a => (a.BeasiswaID === (selectedProgram.id || selectedProgram.ID) || a.Beasiswa?.id === (selectedProgram.id || selectedProgram.ID) || a.Beasiswa?.ID === (selectedProgram.id || selectedProgram.ID)));
        const acceptedApps = programApps.filter(a => a.Status === 'Diterima' || a.Status === 'Disetujui');
        const current = acceptedApps.length;
        const capacity = selectedProgram.Kuota || 1;
        const pct = current >= capacity ? 100 : Math.min(99, Math.floor((current / capacity) * 100));
        const first5Apps = programApps.slice(0, 5);

        return (
          <DialogModal
            open={!!selectedProgram}
            onOpenChange={(open) => !open && setSelectedProgram(null)}
            title={selectedProgram?.Nama || ''}
            subtitle="Detail Program Beasiswa"
            description={selectedProgram?.Penyelenggara || ''}
            icon="emoji_events"
            maxWidth="max-w-md"
            bodyClassName="p-0"
            footer={
              <button onClick={() => setSelectedProgram(null)}
                className="flex-1 md:flex-none h-10 px-6 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95">
                Tutup Detail
              </button>
            }
          >
            <div className="p-6 md:p-8 space-y-4 overflow-y-auto flex-1 min-h-0 font-body bg-[var(--theme-bg)]">
              {/* Deskripsi */}
              {selectedProgram?.Deskripsi && (
                <div className="space-y-1">
                  <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">DESKRIPSI PROGRAM</span>
                  <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed bg-white p-3 rounded-xl border border-[var(--theme-border)]">
                    {selectedProgram.Deskripsi}
                  </p>
                </div>
              )}

              {/* Persyaratan */}
              {(selectedProgram?.Persyaratan || selectedProgram?.persyaratan) && (
                <div className="space-y-1">
                  <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">PERSYARATAN</span>
                  <div className="text-xs text-[var(--theme-text-muted)] leading-relaxed bg-white p-3 rounded-xl border border-[var(--theme-border)] whitespace-pre-line">
                    {selectedProgram.Persyaratan || selectedProgram.persyaratan}
                  </div>
                </div>
              )}

              {/* Ketentuan Berkas */}
              <div className="space-y-1">
                <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">KETENTUAN BERKAS</span>
                <div className="bg-white p-3.5 rounded-xl border border-[var(--theme-border)] flex flex-col gap-1.5 font-body">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--theme-text-muted)] font-medium">KTM & KTP</span>
                    <span className={cn("font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide",
                      (selectedProgram?.FileKtm || selectedProgram?.file_ktm || 'wajib') === 'wajib' ? 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border border-[var(--theme-error)]/20' :
                        (selectedProgram?.FileKtm || selectedProgram?.file_ktm || 'wajib') === 'opsional' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border border-[var(--theme-warning)]/20' : 'bg-slate-100 text-slate-500'
                    )}>
                      {selectedProgram?.FileKtm || selectedProgram?.file_ktm || 'wajib'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--theme-text-muted)] font-medium">Transkrip Nilai</span>
                    <span className={cn("font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide",
                      (selectedProgram?.FileTranskrip || selectedProgram?.file_transkrip || 'wajib') === 'wajib' ? 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border border-[var(--theme-error)]/20' :
                        (selectedProgram?.FileTranskrip || selectedProgram?.file_transkrip || 'wajib') === 'opsional' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border border-[var(--theme-warning)]/20' : 'bg-slate-100 text-slate-500'
                    )}>
                      {selectedProgram?.FileTranskrip || selectedProgram?.file_transkrip || 'wajib'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[var(--theme-text-muted)] font-medium">Sertifikat Pendukung</span>
                    <span className={cn("font-bold px-2 py-0.5 rounded text-[9px] uppercase tracking-wide",
                      (selectedProgram?.FileSertifikat || selectedProgram?.file_sertifikat || 'opsional') === 'wajib' ? 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border border-[var(--theme-error)]/20' :
                        (selectedProgram?.FileSertifikat || selectedProgram?.file_sertifikat || 'opsional') === 'opsional' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border border-[var(--theme-warning)]/20' : 'bg-slate-100 text-slate-500'
                    )}>
                      {selectedProgram?.FileSertifikat || selectedProgram?.file_sertifikat || 'opsional'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Persyaratan Kustom */}
              {(() => {
                const rawFields = selectedProgram?.CustomFields || selectedProgram?.custom_fields;
                if (!rawFields) return null;
                let fields = [];
                try {
                  fields = typeof rawFields === 'string' ? JSON.parse(rawFields) : rawFields;
                } catch (e) {
                  console.error(e);
                }
                if (!Array.isArray(fields) || fields.length === 0) return null;
                return (
                  <div className="space-y-1">
                    <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">PERSYARATAN TAMBAHAN (KUSTOM)</span>
                    <div className="bg-white p-3.5 rounded-xl border border-[var(--theme-border)] space-y-2 font-body">
                      {fields.map((f, i) => (
                        <div key={i} className="flex justify-between items-start text-xs border-b border-[var(--theme-border-muted)] last:border-0 pb-1.5 last:pb-0">
                          <div className="min-w-0 pr-2 text-left">
                            <span className="font-bold text-[var(--theme-text)] block">{f.label}</span>
                            {f.options && (
                              <span className="text-[9px] text-[var(--theme-text-muted)] block mt-0.5">Opsi: {f.options}</span>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className="font-semibold text-[9px] px-1.5 py-0.5 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] rounded">
                              {f.type}
                            </span>
                            {f.required && (
                              <span className="font-bold text-[8px] px-1 bg-[var(--theme-error-light)] text-[var(--theme-error)] rounded">
                                Wajib
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Tanggal & Waktu Dibuat */}
              <div className="bg-white p-3 rounded-xl border border-[var(--theme-border)] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)] flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_add_on</span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-0.5">TANGGAL & WAKTU DIBUAT</span>
                  <span className="text-xs font-semibold text-[var(--theme-text)]">
                    {(selectedProgram?.created_at || selectedProgram?.CreatedAt) ? formatDateTime(selectedProgram.created_at || selectedProgram.CreatedAt) : '—'}
                  </span>
                </div>
              </div>

              {/* Deadline & IPK Requirement */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white p-3 rounded-xl border border-[var(--theme-border)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--theme-error-light)] flex items-center justify-center text-[var(--theme-error)] flex-shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>event_busy</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-0.5">DEADLINE</span>
                    <span className="text-xs font-semibold text-[var(--theme-error)]">
                      {selectedProgram?.Deadline ? formatDate(selectedProgram.Deadline) : '—'}
                    </span>
                  </div>
                </div>
                <div className="bg-white p-3 rounded-xl border border-[var(--theme-border)] flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--theme-warning-light)] flex items-center justify-center text-[var(--theme-warning)] flex-shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>star</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-0.5">MINIMAL IPK</span>
                    <span className="text-xs font-semibold text-[var(--theme-text)]">{selectedProgram?.IPKMin || '3.00'}</span>
                  </div>
                </div>
              </div>

              {/* Capacity */}
              <div className="bg-white p-3 rounded-xl border border-[var(--theme-border)] flex flex-col justify-between">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">KAPASITAS & KETERISIAN</span>
                  <span className="text-xs font-semibold text-[var(--theme-text)]">{current} / {selectedProgram?.Kuota || 0} Mahasiswa</span>
                </div>
                <div className="w-full h-1.5 bg-[var(--theme-border-muted)] rounded-full overflow-hidden mt-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      pct > 90
                        ? "bg-[var(--theme-error)]"
                        : "bg-[var(--theme-primary)]"
                    )}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Anggaran */}
              {selectedProgram?.Anggaran > 0 && (
                <div className="bg-white p-3 rounded-xl border border-[var(--theme-border)] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[var(--theme-success-light)] flex items-center justify-center text-[var(--theme-success)] flex-shrink-0">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-0.5">TOTAL ANGGARAN</span>
                    <span className="text-xs font-semibold text-[var(--theme-success)]">
                      Rp {new Intl.NumberFormat('id-ID').format(selectedProgram.Anggaran)}
                    </span>
                  </div>
                </div>
              )}

              {/* Applicants List */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-[var(--theme-text)] uppercase tracking-wider flex items-center justify-between">
                  <span>Pendaftar Terkini</span>
                  <span className="text-[10px] text-[var(--theme-text-muted)] lowercase">({programApps.length} pendaftar)</span>
                </h3>

                {first5Apps.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl border border-dashed border-[var(--theme-border)] text-center">
                    <p className="text-xs text-[var(--theme-text-subtle)] italic">Belum ada mahasiswa mendaftar program ini</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {first5Apps.map((a) => {
                      const st = getAppStatus(a.Status);
                      return (
                        <div key={a.ID || a.id} className="flex items-center justify-between p-2.5 bg-white border border-[var(--theme-border-muted)] rounded-xl hover:border-[var(--theme-border)] transition-colors shadow-sm">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <StudentAvatar src={a.Mahasiswa?.Foto || a.Mahasiswa?.foto_url} name={a.MahasiswaNama} className="w-8 h-8 rounded-lg" />
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-[var(--theme-text)] truncate">{a.MahasiswaNama}</p>
                              <p className="text-[9px] font-medium text-[var(--theme-text-muted)] mt-0.5">{a.MahasiswaNIM}</p>
                            </div>
                          </div>
                          <span className={cn('text-[8px] font-semibold uppercase tracking-wider px-2 py-0.5 border rounded-md flex-shrink-0', st.cls)}>
                            {st.label}
                          </span>
                        </div>
                      );
                    })}

                    {programApps.length > 5 && (
                      <button
                        onClick={() => {
                          setActiveTab('applications');
                          setSelectedProgram(null);
                          setAppFilters({ BeasiswaNama: selectedProgram?.Nama });
                        }}
                        className="w-full py-2.5 border border-dashed border-[var(--theme-primary)]/30 hover:border-[var(--theme-primary)]/60 rounded-xl text-[10px] font-semibold text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] uppercase tracking-wider flex items-center justify-center gap-1 transition-all"
                      >
                        Lihat Selengkapnya <span className="material-symbols-outlined" style={{ fontSize: 13 }}>chevron_right</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </DialogModal>
        );
      })()}

      {/* Edit/Review Application Modal */}
      <ReviewModal
        selectedApp={selectedApp}
        onClose={() => setSelectedApp(null)}
        onSubmit={handleAppUpdate}
        isSubmitting={isSubmitting}
      />

      {/* Bulk Review Modal */}
      <DialogModal
        open={isBulkOpen}
        onOpenChange={setIsBulkOpen}
        title={`Review ${selectedAppIds.length} Pendaftar`}
        subtitle="Aksi Masal"
        icon="group"
        maxWidth="max-w-md"
        bodyClassName="p-0"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsBulkOpen(false)} />
            <button
              type="button"
              onClick={handleBulkAppUpdate}
              disabled={isSubmitting}
              className="flex-1 md:flex-none h-10 px-6 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Keputusan'}
            </button>
          </>
        }
      >
        <div className="p-6 md:p-8 space-y-4 overflow-y-auto flex-1 min-h-0 font-body bg-[var(--theme-bg)]">
          <div className="space-y-2">
            <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">TAHAP SELEKSI MASSAL</span>
            <Select value={bulkStatus} onValueChange={setBulkStatus}>
              <SelectTrigger className="w-full h-10 rounded-xl border-[var(--theme-border)] bg-white text-xs">
                <SelectValue placeholder="Pilih Tahap Seleksi Massal" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white">
                <SelectItem value="dikirim" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">1. Pengajuan Dikirim</SelectItem>
                <SelectItem value="seleksi_berkas" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">2. Seleksi Berkas</SelectItem>
                <SelectItem value="evaluasi" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">3. Evaluasi & Wawancara</SelectItem>
                <SelectItem value="review" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">4. Review Akhir</SelectItem>
                <SelectItem value="penetapan" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">5. Penetapan Pemenang</SelectItem>
                <SelectItem value="Diterima" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">6. Hasil Akhir: Diterima</SelectItem>
                <SelectItem value="Ditolak" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">6. Hasil Akhir: Ditolak</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-[10px] font-semibold text-[var(--theme-text-subtle)] block mt-1">Status {selectedAppIds.length} mahasiswa terpilih akan diset secara serentak.</span>
          </div>

          <div className="space-y-1">
            <label className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">CATATAN REVIEW MASSAL</label>
            <textarea
              value={bulkCatatan}
              onChange={e => setBulkCatatan(e.target.value)}
              rows={3}
              placeholder="Masukkan catatan keputusan massal di sini (berlaku untuk semua mahasiswa terpilih)..."
              className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border)] bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-xs text-[var(--theme-text)] transition-all resize-none shadow-sm placeholder:text-[var(--theme-text-subtle)]"
            />
          </div>
        </div>
      </DialogModal>

      {/* Floating Bulk Action Bar */}
      {selectedAppIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] bg-white border border-neutral-200 rounded-2xl shadow-xl px-4 py-3 sm:px-6 sm:py-4 flex flex-col md:flex-row items-center gap-3 md:gap-6 w-[92vw] sm:w-[90vw] md:w-auto transition-all animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <div className="text-left">
              <p className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider">Aksi Massal</p>
              <p className="text-xs sm:text-sm font-extrabold text-neutral-800 whitespace-nowrap">{selectedAppIds.length} Pendaftar Terpilih</p>
            </div>
            <button
              onClick={() => setSelectedAppIds([])}
              className="text-[10px] sm:text-xs font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider md:ml-4"
            >
              Batal
            </button>
          </div>

          <div className="hidden md:block h-8 w-px bg-neutral-200" />

          <div className="grid grid-cols-3 sm:flex items-center gap-2 w-full md:w-auto">
            <button
              onClick={() => {
                setBulkStatus('Diterima');
                setIsBulkOpen(true);
              }}
              className="h-10 sm:h-11 px-2 sm:px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-sm truncate"
            >
              <span className="material-symbols-outlined hidden xs:inline" style={{ fontSize: 16 }}>check_circle</span>
              Terima
            </button>
            <button
              onClick={() => {
                setBulkStatus('Ditolak');
                setIsBulkOpen(true);
              }}
              className="h-10 sm:h-11 px-2 sm:px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-sm truncate"
            >
              <span className="material-symbols-outlined hidden xs:inline" style={{ fontSize: 16 }}>cancel</span>
              Tolak
            </button>
            <button
              onClick={() => {
                setBulkStatus('seleksi_berkas');
                setIsBulkOpen(true);
              }}
              className="h-10 sm:h-11 px-2 sm:px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-[9px] xs:text-[10px] sm:text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95 shadow-sm truncate"
            >
              <span className="material-symbols-outlined hidden xs:inline" style={{ fontSize: 16 }}>rule</span>
              Ubah Tahap
            </button>
          </div>
        </div>
      )}

      {previewApp && (() => {
        const st = getAppStatus(previewApp.Status);
        return (
          <DialogModal
            open={!!previewApp}
            onOpenChange={(open) => !open && setPreviewApp(null)}
            title={previewApp.MahasiswaNama || ''}
            subtitle="Detail Pendaftaran"
            description={previewApp.MahasiswaNIM || ''}
            icon="visibility"
            maxWidth="max-w-md"
            bodyClassName="p-0"
            footer={
              <button onClick={() => setPreviewApp(null)}
                className="flex-1 md:flex-none h-10 px-6 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-xs font-bold text-white uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm active:scale-95">
                Tutup Detail
              </button>
            }
            headerContent={
              <div className="absolute top-4 right-4">
                <StudentAvatar src={previewApp.Mahasiswa?.Foto || previewApp.Mahasiswa?.foto_url} name={previewApp.MahasiswaNama} className="w-10 h-10 rounded-xl shadow-sm border border-[var(--theme-border)]" />
              </div>
            }
          >
            <div className="p-6 md:p-8 space-y-4 overflow-y-auto flex-1 min-h-0 font-body bg-[var(--theme-bg)]">
              {/* Scholarship Program */}
              <div className="space-y-1">
                <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">PROGRAM BEASISWA</span>
                <p className="text-xs font-semibold text-[var(--theme-text)] bg-white p-3.5 rounded-xl border border-[var(--theme-border)]">
                  {previewApp.BeasiswaNama}
                </p>
              </div>

              {/* Tanggal Daftar - Full Width */}
              <div className="bg-white p-3 rounded-xl border border-[var(--theme-border)] flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)] flex-shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_add_on</span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-0.5">TANGGAL & WAKTU DAFTAR</span>
                  <span className="text-xs font-semibold text-[var(--theme-text)]">
                    {previewApp.created_at || previewApp.CreatedAt ? formatDateTime(previewApp.created_at || previewApp.CreatedAt) : '—'}
                  </span>
                </div>
              </div>

              {/* Status Seleksi - Full Width */}
              <div className="bg-white p-3 rounded-xl border border-[var(--theme-border)] flex items-center gap-3">
                <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                  previewApp.Status === 'Diterima' || previewApp.Status === 'Disetujui' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)]' :
                    previewApp.Status === 'Ditolak' ? 'bg-[var(--theme-error-light)] text-[var(--theme-error)]' : 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)]')}>
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>verified</span>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-0.5">STATUS SELEKSI</span>
                  <span className={cn('inline-flex items-center text-[10px] font-bold uppercase tracking-wider',
                    previewApp.Status === 'Diterima' || previewApp.Status === 'Disetujui' ? 'text-[var(--theme-success)]' :
                      previewApp.Status === 'Ditolak' ? 'text-[var(--theme-error)]' : 'text-[var(--theme-warning)]')}>
                    {st.label}
                  </span>
                </div>
              </div>

              {/* Submitted Files */}
              <div className="space-y-1.5">
                <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">BERKAS PENDAFTARAN</span>
                {!previewApp.FileURL && !previewApp.KtmKtpURL && !previewApp.TranskripURL && !previewApp.SertifikatURL ? (
                  <div className="bg-white p-4 rounded-xl border border-dashed border-[var(--theme-border)] text-center">
                    <p className="text-xs text-[var(--theme-text-subtle)] italic">Tidak ada berkas yang dilampirkan</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-1">
                    {renderAttachment(previewApp.FileURL, "Berkas Utama")}
                    {renderAttachment(previewApp.KtmKtpURL, "KTM / KTP")}
                    {renderAttachment(previewApp.TranskripURL, "Transkrip Nilai")}
                    {renderAttachment(previewApp.SertifikatURL, "Sertifikat Pendukung")}
                  </div>
                )}
              </div>

              {/* Custom Answers in Preview */}
              {(() => {
                const rawAnswers = previewApp.custom_answers || previewApp.CustomAnswers;
                if (!rawAnswers) return null;
                let answers = {};
                try {
                  answers = typeof rawAnswers === 'string' ? JSON.parse(rawAnswers) : rawAnswers;
                } catch (e) {
                  console.error(e);
                  return null;
                }
                if (Object.keys(answers).length === 0) return null;
                return (
                  <div className="space-y-1.5">
                    <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">JAWABAN PERSYARATAN KUSTOM</span>
                    <div className="space-y-2">
                      {Object.entries(answers).map(([label, value]) => {
                        const isFile = typeof value === 'string' && (value.startsWith('/uploads/') || value.startsWith('http') || value.includes('/api/scholarship/upload-custom-file'));
                        return (
                          <div key={label} className="bg-white p-3 rounded-xl border border-[var(--theme-border)] text-left">
                            <span className="block text-[9px] font-bold text-[var(--theme-text-muted)] uppercase">{label}</span>
                            {isFile ? (
                              <div className="mt-1">
                                {renderAttachment(value, label)}
                              </div>
                            ) : (
                              <p className="text-xs font-semibold text-[var(--theme-text)] mt-1 whitespace-pre-line">
                                {Array.isArray(value) ? value.join(', ') : String(value)}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Motivasi */}
              <div className="space-y-1.5">
                <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">MOTIVASI / MOTIVATION LETTER</span>
                <div className="bg-white p-4 rounded-xl border border-[var(--theme-border)]">
                  {previewApp.Motivasi ? (
                    <div
                      className="text-xs text-[var(--theme-text)] leading-relaxed prose prose-sm max-w-none break-words"
                      dangerouslySetInnerHTML={{ __html: previewApp.Motivasi }}
                    />
                  ) : (
                    <p className="text-xs text-[var(--theme-text-subtle)] italic">Tidak ada motivasi yang diinputkan</p>
                  )}
                </div>
              </div>

              {/* Reviewer Notes */}
              <div className="space-y-1.5">
                <span className="block text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">CATATAN REVIEWER</span>
                <p className="text-xs text-[var(--theme-text-muted)] leading-relaxed bg-white p-3 rounded-xl border border-[var(--theme-border)]">
                  {previewApp.Catatan || previewApp.catatan || 'Belum ada catatan dari reviewer.'}
                </p>
              </div>
            </div>
          </DialogModal>
        );
      })()}
    </PageContent>
  )
}
