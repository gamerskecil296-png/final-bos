"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton } from '@/components/ui/DialogModal'

import { Textarea } from '@/components/ui/Textarea'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { TitleSubtitleCell } from '@/components/ui/TableCells'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>description</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const AlertTriangle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>cancel</span>;
const CheckCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified</span>;
const Payments = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>account_balance_wallet</span>;

const STATUS_CFG = {
  diajukan: { label: 'MENUNGGU REVIEW', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  disetujui: { label: 'DISETUJUI', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  revisi: { label: 'REVISI / DITOLAK', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
}

const formatRp = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

export default function LpjPipeline() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [reviewNote, setReviewNote] = useState('')

  const activeFacultyId = localStorage.getItem('superadmin_fakultas_id') || 'all'

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getAdminLpjs()
      if (res.status === 'success' || Array.isArray(res.data)) {
        setData(res.data || [])
      } else {
        toast.error('Gagal memuat data LPJ')
      }
    } catch {
      toast.error('Koneksi sistem terputus')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (action) => {
    if ((action === 'revise' || action === 'warn') && !reviewNote.trim()) {
      toast.error('Catatan wajib diisi untuk revisi/penolakan')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await adminService.reviewAdminLpj(selected.id || selected.ID, action, reviewNote)
      if (res.status === 'success') {
        toast.success(`LPJ berhasil ${action === 'approve' ? 'disetujui' : 'direvisi'}`)
        setReviewNote('')
        setIsDetailOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal memproses review LPJ')
      }
    } catch { toast.error('Gagal memproses review') } finally { setIsSubmitting(false) }
  }

  useEffect(() => { fetchData() }, [activeFacultyId])

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (activeFacultyId !== 'all') {
        const fid = p.Proposal?.FakultasID || p.Proposal?.fakultas_id
        if (fid && String(fid) !== String(activeFacultyId)) return false
      }
      return true
    })
  }, [data, activeFacultyId])

  const pending = filteredData.filter(p => p.Status === 'diajukan' || !p.Status).length
  const totalLpj = filteredData.length
  const approvedLpj = filteredData.filter(p => p.Status === 'disetujui').length
  const rejectedLpj = filteredData.filter(p => p.Status === 'revisi' || p.Status === 'ditolak').length
  const totalPengeluaran = filteredData.reduce((acc, curr) => acc + (curr.RealisasiAnggaran || 0), 0)

  // ── Chart data derived from live data ─────────────────────────────
  
  // 1. Status Chart
  const statusChartData = useMemo(() => {
    const counts = { diajukan: 0, disetujui: 0, revisi: 0 }
    filteredData.forEach(p => { 
      const s = p.Status || 'diajukan'; 
      counts[s] = (counts[s] || 0) + 1 
    })
    return [
      { name: 'Pending', value: counts.diajukan, color: '#f59e0b' },
      { name: 'Disetujui', value: counts.disetujui, color: '#10b981' },
      { name: 'Revisi', value: counts.revisi, color: '#ef4444' }
    ]
  }, [filteredData])

  // 2. Kinerja Penyerapan Dana
  const budgetChartData = useMemo(() => {
    const map = {}
    filteredData.forEach(p => {
      const name = (p.Proposal?.Ormawa?.Singkatan || 'Ormawa').substring(0, 10)
      map[name] = (map[name] || 0) + (p.RealisasiAnggaran || 0)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value]) => ({ name, value }))
  }, [filteredData])

  const columns = [
    {
      key: 'ID',
      label: 'ID LPJ',
      className: 'w-[100px]',
      render: (v, row) => (
        <span className="font-bold text-[var(--theme-text-muted)] text-[11px] tracking-wide">#{row.id || row.ID || v}</span>
      )
    },
    {
      key: 'Judul',
      label: 'Kegiatan & Ormawa',
      className: 'w-[350px]',
      render: (v, row) => (
        <TitleSubtitleCell
          title={row.title || 'Laporan Kegiatan'}
          subtitle={`${row.ormawaName || 'Ormawa'} • ${row.ormawaSingkatan || 'Universitas'}`}
        />
      )
    },
    {
      key: 'Anggaran',
      label: 'Pagu & Realisasi',
      render: (v, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-bold text-[var(--theme-text)]">{formatRp(row.totalAnggaran)}</span>
          <span className="text-[10px] text-[var(--theme-primary)] font-semibold mt-0.5">{formatRp(row.realisasiAnggaran)}</span>
        </div>
      )
    },
    {
      key: 'Tanggal',
      label: 'Tgl. Laporan',
      render: (v, row) => <span className="text-xs text-[var(--theme-text-muted)] font-medium">{row.date || '-'}</span>
    },
    {
      key: 'Status',
      label: 'Status',
      render: (v, row) => {
        const s = (row.status || 'diajukan').toLowerCase()
        const cfg = STATUS_CFG[s] || STATUS_CFG['diajukan']
        return (
          <div className="flex justify-center">
            <Badge className={cn('px-2.5 py-1 text-[10px] font-bold tracking-wide rounded-full border-none shadow-none', cfg.cls)}>
              {cfg.label}
            </Badge>
          </div>
        )
      }
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      {/* ── Page Header ─────────────────────────────────────────── */}
      <DashboardHero
        title="Laporan"
        highlightedTitle="Pertanggungjawaban"
        subtitle="Pusat validasi dan audit Laporan Pertanggungjawaban (LPJ) dari seluruh Organisasi Mahasiswa."
        icon="task"
        badges={[
          { label: 'Audit Compliance', active: true }
        ]}
        actions={
          <div className="flex items-center gap-6 bg-[var(--theme-surface)] p-4 md:p-6 rounded-2xl border border-[var(--theme-border-muted)] shadow-sm">
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Menunggu Audit</span>
              <span className="text-3xl font-bold text-[var(--theme-text)] font-headline tracking-tight tabular-nums leading-none">{pending} <span className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Berkas</span></span>
            </div>
            <div className="size-14 rounded-2xl bg-amber-500 flex items-center justify-center text-white shadow-md border-none">
              <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '28px' }} strokeWidth={2.5}>plagiarism</span>
            </div>
          </div>
        }
      />

      {/* ── Stats Summary ────────────────────────────────────────── */}
      <div className="space-y-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <PrimaryStatsCard
            title="Total LPJ"
            value={totalLpj}
            icon={Layers}
            colorTheme="info"
            badgeText="Semua laporan masuk"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">description</span>}
          />

          <PrimaryStatsCard
            title="Menunggu Review"
            value={pending}
            icon={Clock}
            colorTheme="warning"
            badgeText="Butuh aksi segera"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">pending</span>}
          />

          <PrimaryStatsCard
            title="LPJ Disetujui"
            value={approvedLpj}
            icon={CheckCircle}
            colorTheme="success"
            badgeText="Telah diverifikasi"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
          />

          <PrimaryStatsCard
            title="Revisi / Ditolak"
            value={rejectedLpj}
            icon={AlertTriangle}
            colorTheme="error"
            badgeText="LPJ butuh perbaikan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">cancel</span>}
          />

          <PrimaryStatsCard
            title="Total Realisasi"
            value={formatRp(totalPengeluaran)}
            icon={Payments}
            colorTheme="primary"
            badgeText="Pengeluaran tercatat"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">account_balance_wallet</span>}
          />
        </div>
      </div>

      {/* ── Analytics Charts ─────────────────────────────────────── */}
      {!loading && filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
          <div className="bg-white border border-[var(--theme-border-muted)] shadow-sm rounded-2xl p-5 relative overflow-hidden flex flex-col">
            <h3 className="text-[13px] font-bold text-[var(--theme-text)] mb-4">Distribusi Status LPJ</h3>
            <div className="flex-1 flex items-center justify-center gap-6">
              <div className="w-[120px] h-[120px] relative">
                  <PieChart width={120} height={120}>
                    <Pie data={statusChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={2} dataKey="value" stroke="none">
                      {statusChartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} />
                  </PieChart>
              </div>
              <div className="space-y-2 flex-1">
                {statusChartData.map((d, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[var(--theme-bg)]/50">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      <span className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase">{d.name}</span>
                    </div>
                    <span className="font-bold text-sm text-[var(--theme-text)] tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white border border-[var(--theme-border-muted)] shadow-sm rounded-2xl p-5 flex flex-col">
            <h3 className="text-[13px] font-bold text-[var(--theme-text)] mb-4">Realisasi Anggaran per Ormawa</h3>
            <div className="flex-1 min-h-[140px] w-full">
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={budgetChartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorBudget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)} />
                  <Tooltip labelFormatter={(l) => `Ormawa: ${l}`} formatter={(val) => [formatRp(val), 'Realisasi']} />
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorBudget)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ── Table Section ────────────────────────────────────────── */}
      <DataTable
        title="Daftar LPJ Ormawa"
        subtitle="Menampilkan seluruh Laporan Pertanggungjawaban (LPJ) dari Organisasi Mahasiswa."
        columns={columns}
        data={filteredData}
        loading={loading}
        searchPlaceholder="Cari LPJ berdasarkan kegiatan atau Ormawa..."
        actions={(row) => (
          <Button onClick={() => { setSelected(row); setIsDetailOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-bku-primary hover:bg-bku-primary/10 rounded-lg transition-colors cursor-pointer shadow-none">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
          </Button>
        )}
      />

      {/* ── Detail Dialog ─────────────────────────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Audit LPJ"
        subtitle={`Detail Laporan Pertanggungjawaban • LPJ-${selected?.id || selected?.ID}`}
        icon="task"
        maxWidth="max-w-4xl"
        bodyClassName="p-6 sm:p-8 space-y-6"
        footer={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => handleReview('revise')} disabled={isSubmitting} className="border-rose-200 text-rose-600 hover:bg-rose-50">REVISI/TOLAK</Button>
            <Button onClick={() => handleReview('approve')} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">SETUJUI</Button>
            <ModalCancelButton onClick={() => setIsDetailOpen(false)}>TUTUP</ModalCancelButton>
          </div>
        }
      >
        {selected && (
          <div className="flex flex-col gap-6">
            <div className="bg-white rounded-2xl border border-[var(--theme-border-muted)] overflow-hidden">
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Informasi Kegiatan</span>
                  <Badge className={STATUS_CFG[(selected.status || 'diajukan').toLowerCase()]?.cls}>{STATUS_CFG[(selected.status || 'diajukan').toLowerCase()]?.label}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="p-3 rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/30">
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Nama Kegiatan</p>
                    <p className="font-bold text-xs">{selected.title || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/30">
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Penyelenggara</p>
                    <p className="font-bold text-xs">{selected.ormawaName || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-[var(--theme-border-muted)] pt-4 mt-4">
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Pagu Anggaran</p>
                    <p className="font-bold text-xs text-[var(--theme-text)]">{formatRp(selected.totalAnggaran)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Realisasi Pengeluaran</p>
                    <p className="font-bold text-xs text-[var(--theme-primary)]">{formatRp(selected.realisasiAnggaran)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Sisa (SiLPA) / Defisit</p>
                    <p className={cn("font-bold text-xs", (selected.totalAnggaran || 0) >= (selected.realisasiAnggaran || 0) ? "text-emerald-600" : "text-rose-600")}>
                      {formatRp((selected.totalAnggaran || 0) - (selected.realisasiAnggaran || 0))}
                    </p>
                  </div>
                </div>

                {/* File Links */}
                <div className="mt-4 pt-4 border-t border-[var(--theme-border-muted)]">
                  <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-3">Lampiran LPJ</p>
                  {(() => {
                    let files = [];
                    if (selected.FileURL || selected.file_url) {
                      try {
                        const parsed = JSON.parse(selected.FileURL || selected.file_url);
                        files = Array.isArray(parsed) ? parsed : [selected.FileURL || selected.file_url];
                      } catch {
                        files = [selected.FileURL || selected.file_url];
                      }
                    }

                    if (files.length > 0) {
                      return (
                        <div className="space-y-2">
                          {files.map((file, idx) => {
                            const baseUrl = import.meta.env.VITE_API_URL || '/api';
                            const href = file.startsWith('http') ? file : baseUrl.replace('/api', '') + file;
                            return (
                              <a key={idx} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 rounded-lg border border-[var(--theme-border)] hover:bg-[var(--theme-primary-light)] transition-colors">
                                <span className="material-symbols-outlined text-rose-500">picture_as_pdf</span>
                                <span className="text-xs font-semibold text-[var(--theme-text)] flex-1 truncate">{file.split('/').pop()}</span>
                                <span className="material-symbols-outlined text-slate-400">download</span>
                              </a>
                            )
                          })}
                        </div>
                      )
                    }
                    return <p className="text-xs text-slate-500 italic">Belum ada dokumen yang dilampirkan.</p>
                  })()}
                </div>
              </div>
            </div>

            {/* Review Notes - MOVED OUTSIDE FOR CLEARER SCROLLING */}
            <div className="mt-6 bg-white rounded-2xl border border-[var(--theme-border-muted)] overflow-hidden">
              <div className="p-5">
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Catatan Evaluasi Audit</label>
                <Textarea
                  value={reviewNote}
                  onChange={e => setReviewNote(e.target.value)}
                  rows={3}
                  placeholder="Tuliskan catatan apresiasi, revisi, atau penolakan..."
                  className="w-full text-xs rounded-xl"
                />
              </div>
            </div>
          </div>
        )}
      </DialogModal>
    </PageContent>
  )
}
