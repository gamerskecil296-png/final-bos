"use client"

import React, { useState, useEffect, useMemo } from 'react'
import api from '@/lib/axios'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { API_BASE_URL, adminService } from '@/services/api'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { Badge } from "@/components/ui/Badge"
import { DialogModal, ModalCancelButton, ModalSaveButton } from "@/components/ui/DialogModal"
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { DataTable } from "@/components/ui/DataTable"

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Reply = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>reply</span>;
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const Send = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>send</span>;
const AlertCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>error</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const MessageSquare = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>chat</span>;
const CheckCircle2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;

const AVATAR_COLORS = [
  'from-blue-400 to-indigo-500','from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500','from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500','from-cyan-400 to-sky-500',
]

const STATUS_STYLES = {
  'disetujui fakultas': { cls:'bg-blue-50 text-blue-700 border-blue-200', dot:'bg-blue-500' },
  'ditolak fakultas':   { cls:'bg-rose-50 text-rose-700 border-rose-200', dot:'bg-rose-500' },
  selesai:              { cls:'bg-emerald-50 text-emerald-700 border-emerald-200', dot:'bg-emerald-500' },
  proses:               { cls:'bg-blue-50 text-blue-700 border-blue-200',         dot:'bg-blue-500' },
  klarifikasi:          { cls:'bg-amber-50 text-amber-700 border-amber-200',      dot:'bg-amber-500' },
  ditolak:              { cls:'bg-rose-50 text-rose-700 border-rose-200',         dot:'bg-rose-500' },
  terbuka:              { cls:'bg-slate-50 text-slate-600 border-slate-200',      dot:'bg-slate-400' },
}
const getStatus = (v='') => STATUS_STYLES[(v||'terbuka').toLowerCase()] || STATUS_STYLES.terbuka

const formatDate = (d) => { try { return new Date(d).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}) } catch { return d } }

const getFullUrl = (path) => {
  if (!path || path.trim() === "" || path === "/" || path.endsWith("/profiles/") || path.endsWith("/students/")) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

function StudentAvatar({ src, name, className = "w-9 h-9 rounded-xl" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  const hasNoImage = !src || src.trim() === "" || src.endsWith("/profiles/") || src.endsWith("/students/") || src.endsWith("localhost:8000") || src.endsWith("localhost:8000/");

  return (
    <div className={cn("relative bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-inner overflow-hidden", className)}>
      {(!loaded || error || hasNoImage) && (
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute" style={{ fontSize: className.includes('w-14') ? '28px' : '20px' }}>
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

const FacultyAspirationManagement = () => {
  const [aspirations, setAspirations]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [selected, setSelected]         = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [periodsList, setPeriodsList]   = useState([])
  const [form, setForm]                 = useState({ status: 'proses', respon: '' })

  const normalizeAspirasi = (a, i) => {
    const m = a.mahasiswa || a.Mahasiswa || {};
    return {
      ...a,
      ID: a.id || a.ID,
      Judul: a.judul || a.Judul || '—',
      Isi: a.isi || a.Isi || '—',
      Kategori: a.kategori || a.Kategori || 'Umum',
      Status: a.status || a.Status || 'Terbuka',
      normalizedStatus: (a.status || a.Status || 'terbuka').toLowerCase(),
      MahasiswaNama: m.nama || m.Nama || (a.is_anonim || a.IsAnonim ? 'Anonim' : '—'),
      CreatedAt: a.created_at || a.CreatedAt,
      BuktiURL: a.BuktiURL ?? a.bukti_url ?? a.FotoURL ?? a.foto_url ?? a.lampiran_url ?? a.LampiranURL ?? '',
      Mahasiswa: {
        Nama: m.nama || m.Nama || (a.is_anonim || a.IsAnonim ? 'Anonim' : '—'),
        NIM: m.nim || m.NIM || '—',
        ProgramStudi: {
          Nama: m.program_studi?.nama || m.program_studi?.Nama || m.ProgramStudi?.Nama || '—'
        },
        Foto: getFullUrl(m.foto_url || m.FotoURL || m.foto || m.Foto || null),
      },
      colorIdx: i % AVATAR_COLORS.length,
    };
  };

  const fetchAspirations = async () => {
    setLoading(true)
    try {
      const res = await api.get('/app/dashboard/aspirasi')
      if (res.data.status === 'success')
        setAspirations((res.data.data||[]).map(normalizeAspirasi))
        
      try {
        const periodRes = await adminService.getAllAcademicPeriods()
        if (periodRes && periodRes.status === 'success' && periodRes.data) {
          setPeriodsList(periodRes.data)
        } else if (periodRes?.data?.status === 'success' && periodRes?.data?.data) {
          setPeriodsList(periodRes.data.data)
        }
      } catch (err) {
        console.error("Failed to fetch periods", err)
      }
    } catch { toast.error('Gagal mengambil data aspirasi') }
    finally { setLoading(false) }
  }

  const handleUpdateStatus = async (status) => {
    let finalStatus = status
    if (status === 'selesai') {
      finalStatus = 'Disetujui Fakultas'
    } else if (status === 'ditolak') {
      finalStatus = 'Ditolak Fakultas'
    }

    if (!form.respon) {
      toast.error('Tanggapan harus diisi')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await api.put(`/app/dashboard/aspirasi/${selected.ID}`, { Status: finalStatus, tanggapan: form.respon })
      if (res.data.status === 'success') {
        toast.success(finalStatus === 'Disetujui Fakultas' 
          ? 'Aspirasi disetujui & diteruskan ke Super Admin!' 
          : 'Aspirasi ditolak!'
        )
        setSelected(null)
        setForm({ status: '', respon: '' })
        fetchAspirations()
      } else {
        toast.error(res.data.message || 'Gagal update status')
      }
    } catch (e) { 
      toast.error(e.response?.data?.message || 'Gangguan koneksi') 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  useEffect(() => { fetchAspirations() }, [])

  const handleOpenAudit = (asp) => {
    setSelected(asp)
    let initialStatus = asp.Status?.toLowerCase() || 'proses'
    if (initialStatus === 'disetujui fakultas') initialStatus = 'selesai'
    if (initialStatus === 'ditolak fakultas') initialStatus = 'ditolak'
    
    setForm({
      status: initialStatus,
      respon: asp.respon || asp.Respon || ''
    })
  }

  const periodeOptions = useMemo(() => {
    const periods = new Set()
    aspirations.forEach(a => {
      if (a.CreatedAt) {
        const d = new Date(a.CreatedAt)
        if (!isNaN(d.getTime())) {
          periods.add(String(d.getFullYear()))
        }
      }
    })
    return Array.from(periods).sort((a, b) => Number(b) - Number(a))
  }, [aspirations])

  const filteredAspirations = useMemo(() => {
    if (filterPeriode === 'all') return aspirations
    return aspirations.filter(a => {
      if (!a.CreatedAt) return false
      const d = new Date(a.CreatedAt)
      if (isNaN(d.getTime())) return false
      const pYear = String(d.getFullYear())
      const yearFromPeriod = filterPeriode.length >= 4 ? filterPeriode.substring(0, 4) : filterPeriode;
      return pYear === filterPeriode || pYear === yearFromPeriod
    })
  }, [aspirations, filterPeriode])

  const stats = {
    total:      filteredAspirations.length,
    selesai:    filteredAspirations.filter(a=>(a.Status||'').toLowerCase()==='disetujui fakultas' || (a.Status||'').toLowerCase()==='selesai').length,
    proses:     filteredAspirations.filter(a=>(a.Status||'').toLowerCase()==='proses').length,
    klarifikasi:filteredAspirations.filter(a=>(a.Status||'').toLowerCase()==='klarifikasi').length,
  }

  return (
    <PageContent>
      <Toaster position="top-right" />
        <DashboardHero
          title="Manajemen "
          highlightedTitle="Aspirasi"
          subtitle="Kelola dan tanggapi keluhan serta aspirasi mahasiswa secara resmi dari portal fakultas."
          icon="chat"
          badges={[
            { label: 'Student Voice', active: false },
            { label: `${stats.proses} Sedang Ditangani`, active: true }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Select value={filterPeriode} onValueChange={setFilterPeriode}>
                <SelectTrigger className="w-[160px] h-10 border border-[var(--theme-border)] bg-white/80 backdrop-blur-sm rounded-xl text-xs font-semibold text-[var(--theme-text-muted)] focus:ring-0">
                  <SelectValue placeholder="Semua Tahun" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-[var(--theme-surface)]">
                  <SelectItem value="all" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">Semua Periode</SelectItem>
                  {periodsList.length > 0 ? periodsList.map(p => (
                    <SelectItem key={p.id || p.ID} value={String(p.sevima_id || p.id || p.ID)} className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">
                      {p.AcademicYear} · {p.Semester} {p.IsActive ? '⭐' : ''}
                    </SelectItem>
                  )) : periodeOptions.map(per => (
                    <SelectItem key={per} value={per} className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">
                      Tahun {per}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button onClick={fetchAspirations} disabled={loading}
                className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none">
                {loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>sync</span>} Refresh Data
              </button>
            </div>
          }
        />
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 mt-6">
          <PrimaryStatsCard title="Total Masuk" value={stats.total} icon={MessageSquare} colorTheme="primary" badgeText="Semua aspirasi" badgeIcon={<span className="material-symbols-outlined text-[12px]">chat</span>} />
          <PrimaryStatsCard title="Disetujui / Selesai" value={stats.selesai} icon={CheckCircle2} colorTheme="success" badgeText="Selesai diproses" badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>} />
          <PrimaryStatsCard title="Dalam Proses" value={stats.proses} icon={Clock} colorTheme="info" badgeText="Sedang ditangani" badgeIcon={<span className="material-symbols-outlined text-[12px]">schedule</span>} />
          <PrimaryStatsCard title="Klarifikasi" value={stats.klarifikasi} icon={AlertCircle} colorTheme="warning" badgeText="Butuh klarifikasi" badgeIcon={<span className="material-symbols-outlined text-[12px]">error</span>} />
        </div>

        {/* Table */}
        <div className="mt-6 mb-6">
          <DataTable
            columns={[
              {
                key: 'index', label: 'No', disableSort: true, className: "w-12 text-center", cellClassName: "text-center font-bold text-slate-400",
                render: (val, row, index) => index + 1
              },
              {
                key: 'MahasiswaNama', label: 'Mahasiswa',
                render: (val, row) => (
                  <div className="flex items-center gap-3">
                    <StudentAvatar src={row.Mahasiswa?.Foto} name={row.Mahasiswa?.Nama} className="w-9 h-9 rounded-xl" />
                    <div>
                      <p className="font-bold text-sm text-[var(--theme-text)]">{row.Mahasiswa?.Nama||'Anonim'}</p>
                      <p className="text-[10px] text-[var(--theme-text-muted)] font-medium">{row.Mahasiswa?.NIM||'—'}</p>
                    </div>
                  </div>
                )
              },
              {
                key: 'Judul', label: 'Aspirasi & Keluhan',
                render: (val, row) => (
                  <div className="max-w-[200px]">
                    <p className="font-bold text-sm text-[var(--theme-text)] truncate leading-snug">{row.Judul||'—'}</p>
                    <span className="inline-block mt-0.5 text-[10px] font-bold text-primary bg-[var(--theme-primary-light)] px-2 py-0.5 rounded-md border border-[var(--theme-primary)]/20">{row.Kategori||'Umum'}</span>
                  </div>
                )
              },
              {
                key: 'Isi', label: 'Isi Singkat', className: "max-w-[250px]",
                render: (val) => (
                  <p className="text-xs text-[var(--theme-text-muted)] italic line-clamp-2 max-w-[250px]">"{val}"</p>
                )
              },
              {
                key: 'Status', label: 'Status',
                render: (val) => {
                  const st = getStatus(val);
                  return (
                    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider', st.cls)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)}/>{(val||'Terbuka')}
                    </span>
                  )
                }
              },
              {
                key: 'CreatedAt', label: 'Tanggal',
                render: (val) => <span className="text-xs text-[var(--theme-text-muted)] font-medium whitespace-nowrap">{formatDate(val)}</span>
              }
            ]}
            data={filteredAspirations}
            loading={loading}
            searchPlaceholder="Cari pengirim atau judul..."
            pagination={true}
            pageSize={10}
            emptyMessage="Tidak Ada Aspirasi"
            emptyIcon="chat"
            filters={[
              {
                key: 'normalizedStatus',
                placeholder: 'Status',
                options: [
                  { value: 'terbuka', label: 'Terbuka' },
                  { value: 'proses', label: 'Proses' },
                  { value: 'klarifikasi', label: 'Klarifikasi' },
                  { value: 'disetujui fakultas', label: 'Disetujui Fakultas' },
                  { value: 'ditolak fakultas', label: 'Ditolak Fakultas' },
                  { value: 'selesai', label: 'Selesai' },
                ]
              }
            ]}
            actions={(row) => (
              <button onClick={()=>handleOpenAudit(row)}
                className="p-1.5 text-slate-400 hover:text-primary hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors" title="Balas">
                <span className="material-symbols-outlined text-[15px]">reply</span>
              </button>
            )}
          />
        </div>

      {/* ── Global Aspiration Audit Dialog Popup Modal (Faculty Admin) ── */}
      <DialogModal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        icon="security"
        title={selected?.Judul}
        subtitle={`Status: ${selected?.Status || 'Terbuka'}`}
        badgeText={`FACULTY AUDIT PANEL · #ASP-${selected?.ID?.toString().padStart(4, '0')}`}
        maxWidth="max-w-3xl"
        bodyClassName="p-0 overflow-y-auto max-h-[80vh]"
        footer={
          <div className="w-full flex items-center justify-end gap-3 px-6 py-4 bg-[var(--theme-surface)] border-t border-[var(--theme-border)]">
            <ModalCancelButton onClick={() => setSelected(null)} text="Tutup" />
            <ModalSaveButton 
              onClick={() => handleUpdateStatus(form.status)} 
              loading={isSubmitting} 
              disabled={isSubmitting || !form.status}
              text="Simpan Tanggapan" 
            />
          </div>
        }
      >
            {selected && (
              <div className="flex flex-col pb-4">
                {/* Info Pills Row */}
                <div className="px-6 py-4 flex flex-wrap gap-2 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/20 sticky top-0 z-20 backdrop-blur-md">
                  <span className="flex items-center gap-1.5 bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-wider shadow-sm">
                    <span className="material-symbols-outlined" style={{fontSize: '13px'}}>category</span>
                    {selected.Kategori || 'Umum'}
                  </span>
                  <span className="flex items-center gap-1.5 bg-[var(--theme-info-light)] border border-[var(--theme-info)]/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[var(--theme-info)] uppercase tracking-wider shadow-sm">
                    <span className="material-symbols-outlined" style={{fontSize: '13px'}}>calendar_today</span>
                    {formatDate(selected.CreatedAt)}
                  </span>
                  {(() => {
                    const st = getStatus(selected.Status);
                    return (
                      <span className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border shadow-sm', st.cls)}>
                        <span className={cn('w-1.5 h-1.5 rounded-full', st.dot)} />{selected.Status}
                      </span>
                    )
                  })()}
                </div>

                <div className="flex flex-col gap-8 p-6">
                  {/* Profil Pelapor */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '13px' }}>person</span>
                      </div>
                      <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Identitas Pelapor</h3>
                    </div>
                    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm rounded-2xl p-5 flex flex-col sm:flex-row items-center sm:items-start gap-5 hover:shadow-md transition-shadow">
                      <StudentAvatar src={selected.Mahasiswa?.Foto} name={selected.Mahasiswa?.Nama} className="w-16 h-16 rounded-2xl shadow-md ring-4 ring-[var(--theme-bg)] shrink-0" />
                      <div className="flex-1 w-full text-center sm:text-left">
                        <p className="font-extrabold text-base text-[var(--theme-text)]">{selected.Mahasiswa?.Nama}</p>
                        <p className="font-mono text-xs font-bold text-[var(--theme-text-muted)] mt-0.5">{selected.Mahasiswa?.NIM}</p>
                        <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider flex items-center justify-center sm:justify-start gap-1.5 mt-2.5">
                          <span className="material-symbols-outlined text-[14px]">business</span>
                          {selected.Mahasiswa?.ProgramStudi?.Nama || 'Institusional'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Substansi Aspirasi */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '13px' }}>chat</span>
                      </div>
                      <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Substansi Aspirasi</h3>
                    </div>
                    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm rounded-2xl p-6 relative overflow-hidden group hover:shadow-md transition-shadow">
                      <span className="material-symbols-outlined absolute top-3 right-4 text-[var(--theme-border-muted)] pointer-events-none" style={{ fontSize: '60px', zIndex: 0}}>format_quote</span>
                      <p className="text-sm text-[var(--theme-text)] font-semibold leading-relaxed italic relative z-10 whitespace-pre-wrap">
                        "{selected.Isi || 'Tidak ada deskripsi konten.'}"
                      </p>
                    </div>
                  </div>

                  {/* Bukti Lampiran Visual */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '13px' }}>image</span>
                      </div>
                      <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Bukti Lampiran Visual</h3>
                    </div>
                    {selected.BuktiURL ? (
                      <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] p-2 shadow-sm rounded-2xl flex flex-col group hover:shadow-md transition-shadow">
                        <div className="relative aspect-video rounded-xl overflow-hidden bg-[var(--theme-bg)] border border-[var(--theme-border-muted)]">
                          <img 
                            src={getFullUrl(selected.BuktiURL)} 
                            alt="Bukti Aspirasi" 
                            className="w-full h-full object-contain group-hover:scale-[1.03] transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                            <a 
                              href={getFullUrl(selected.BuktiURL)} 
                              target="_blank" 
                              rel="noreferrer"
                              className="px-5 py-2.5 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-[var(--theme-primary)] hover:text-white transition-all active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[16px]">open_in_new</span> Lihat Gambar Penuh
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-[var(--theme-bg)] border-2 border-dashed border-[var(--theme-border)] p-8 rounded-2xl flex flex-col items-center justify-center gap-3 text-[var(--theme-text-muted)] transition-colors hover:border-[var(--theme-border-muted)] hover:bg-[var(--theme-surface)]">
                        <div className="w-12 h-12 rounded-full bg-[var(--theme-border-muted)] flex items-center justify-center opacity-70">
                          <span className="material-symbols-outlined" style={{fontSize: '24px'}}>hide_image</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Tidak ada lampiran disertakan</p>
                      </div>
                    )}
                  </div>

                  <hr className="border-[var(--theme-border)] my-2" />

                  {/* Panel Tindakan */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center shadow-sm">
                        <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '13px' }}>shield</span>
                      </div>
                      <h3 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Panel Tindakan & Resolusi</h3>
                    </div>
                    
                    <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm rounded-2xl p-6 space-y-6 hover:shadow-md transition-shadow">
                      
                      {/* Status Selection */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Ubah Status</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                          {[
                            { val: 'proses', label: 'Proses', icon: 'schedule', cls: 'text-blue-600 bg-blue-50 border-blue-200' },
                            { val: 'klarifikasi', label: 'Klarifikasi', icon: 'chat', cls: 'text-amber-600 bg-amber-50 border-amber-200' },
                            { val: 'selesai', label: 'Setujui', icon: 'check_circle', cls: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
                            { val: 'ditolak', label: 'Tolak', icon: 'close', cls: 'text-rose-600 bg-rose-50 border-rose-200' },
                          ].map(s => (
                            <button 
                              key={s.val} 
                              type="button"
                              onClick={() => setForm({ ...form, status: s.val })}
                              className={cn(
                                'h-11 rounded-xl flex flex-col items-center justify-center gap-1 border font-bold uppercase tracking-widest text-[9px] transition-all',
                                form.status === s.val 
                                  ? cn(s.cls, "shadow-sm ring-2 ring-offset-2", s.cls.split(' ')[0].replace('text-', 'ring-'))
                                  : 'border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)] hover:border-[var(--theme-border-muted)]'
                              )}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{s.icon}</span>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tanggapan Textarea */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Tanggapan Resmi</p>
                        <textarea 
                          value={form.respon}
                          onChange={e => setForm({ ...form, respon: e.target.value })}
                          placeholder="Tuliskan tanggapan resmi fakultas yang informatif..."
                          className="w-full min-h-[140px] rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-4 text-xs font-semibold text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)]/20 shadow-inner transition-all resize-none"
                        />
                      </div>

                      {/* Info SLA */}
                      <div className="p-4 rounded-xl bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 flex gap-3 shadow-sm">
                        <span className="material-symbols-outlined text-[var(--theme-warning)] mt-0.5" style={{ fontSize: '18px' }}>info</span>
                        <div>
                          <p className="text-[10px] font-extrabold text-[var(--theme-warning)] uppercase tracking-wider">Informasi Alur</p>
                          <p className="text-[10px] font-semibold text-[var(--theme-warning)]/80 mt-1 leading-relaxed">
                            Tanggapan Anda akan langsung diteruskan ke dasbor mahasiswa pelapor untuk memastikan transparansi.
                          </p>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            )}
      </DialogModal>
    </PageContent>
  )
}

export default FacultyAspirationManagement
