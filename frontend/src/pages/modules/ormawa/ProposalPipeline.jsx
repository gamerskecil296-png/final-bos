"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'

import { Textarea } from '@/components/ui/Textarea'
import { Label } from '@/components/ui/Label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'
import { usePermission } from '@/hooks/usePermission'
import { toast, Toaster } from 'react-hot-toast'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  AreaChart, Area,
  Radar, RadarChart, PolarGrid, PolarAngleAxis,
  RadialBarChart, RadialBar, Legend
} from 'recharts'
import { PageContent } from '@/components/ui/page'
import { DashboardHero, DashboardStatGrid, DashboardStatCard } from '@/components/ui/dashboard'
import { TitleSubtitleCell } from '@/components/ui/TableCells'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>description</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const AlertTriangle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>cancel</span>;
const CheckCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified</span>;
const Payments = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>account_balance_wallet</span>;
const Wallet = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>account_balance_wallet</span>;

const STATUS_CFG = {
  diajukan: { label: 'DIAJUKAN', cls: 'bg-neutral-50 text-neutral-500 border-neutral-100' },
  disetujui_fakultas: { label: 'ACC FAKULTAS', cls: 'bg-blue-50 text-blue-700 border-blue-100' },
  disetujui_univ: { label: 'DISYAHKAN', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  revisi: { label: 'BUTUH REVISI', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  ditolak: { label: 'DITOLAK', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
}

const formatRp = n => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

export default function ProposalPipeline() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const { withPermissionCheck } = usePermission()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [tenggatHari, setTenggatHari] = useState(14)

  const activeFacultyId = localStorage.getItem('superadmin_fakultas_id') || 'all'
  const activeProdiId = localStorage.getItem('superadmin_prodi_id') || 'all'

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getGlobalProposals()
      if (res.status === 'success') {
        setData(res.data || [])
      } else {
        toast.error('Gagal memuat data proposal')
      }
    } catch {
      toast.error('Koneksi sistem terputus')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    setIsSubmitting(true)
    try {
      const res = await adminService.approveProposal(id, { tenggat_hari: Number(tenggatHari) || 14 })
      if (res.status === 'success') {
        toast.success('Proposal telah resmi disyahkan')
        fetchData()
        setIsDetailOpen(false)
      }
    } catch { toast.error('Gagal memproses pengesahan') } finally { setIsSubmitting(false) }
  }
  useEffect(() => { fetchData() }, [activeFacultyId, activeProdiId])

  const handleReject = async () => {
    setIsSubmitting(true)
    try {
      await adminService.rejectProposal(selected.id || selected.ID, rejectNote)
      toast.success('Proposal ditolak dengan catatan')
      setRejectNote('')
      setIsDetailOpen(false)
      fetchData()
    } catch { toast.error('Gagal mengirim penolakan') } finally { setIsSubmitting(false) }
  }

  const handleRevise = async () => {
    setIsSubmitting(true)
    try {
      await adminService.reviseProposal(selected.id || selected.ID, rejectNote)
      toast.success('Proposal dikembalikan untuk direvisi')
      setRejectNote('')
      setIsDetailOpen(false)
      fetchData()
    } catch { toast.error('Gagal mengirim revisi') } finally { setIsSubmitting(false) }
  }

  const filteredData = useMemo(() => {
    return data.filter(p => {
      if (activeFacultyId !== 'all') {
        const fid = p.FakultasID || p.fakultas_id || p.Mahasiswa?.FakultasID || p.Mahasiswa?.fakultas_id
        if (String(fid) !== String(activeFacultyId)) return false
      }
      if (activeProdiId !== 'all') {
        const pid = p.Mahasiswa?.ProgramStudiID || p.Mahasiswa?.program_studi_id
        if (String(pid) !== String(activeProdiId)) return false
      }
      return true
    })
  }, [data, activeFacultyId, activeProdiId])

  const isUnivLevelOrmawa = (p) => !p.Ormawa?.FakultasID && !p.Ormawa?.fakultas_id
  const isPendingUniv = (p) => p.Status === 'disetujui_fakultas' || (p.Status === 'diajukan' && isUnivLevelOrmawa(p))
  const pending = filteredData.filter(isPendingUniv).length
  const totalBudget = filteredData.filter(isPendingUniv).reduce((acc, curr) => acc + (curr.Anggaran || 0), 0)
  const totalProposal = filteredData.length
  const approvedProposal = filteredData.filter(p => p.Status === 'disetujui_univ').length
  const rejectedProposal = filteredData.filter(p => p.Status === 'ditolak').length

  // ── Chart data derived from live data ─────────────────────────────
  // ── 5W1H Analytics Data ───────────────────────────────────────────

  // 1. WHAT (Jenis Kegiatan)
  const whatChartData = useMemo(() => {
    const map = {};
    filteredData.forEach(p => { const j = p.Jenis || 'Lainnya'; map[j] = (map[j] || 0) + 1 });
    const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value], i) => ({
      name: name.substring(0, 15), value, color: colors[i % colors.length]
    }));
  }, [filteredData]);

  // 2. WHY (Status Alur - Mengapa tertahan/lanjut)
  const whyChartData = useMemo(() => {
    const cfg = {
      diajukan: { label: 'Diajukan', color: '#94a3b8' },
      disetujui_fakultas: { label: 'Acc Fakultas', color: '#3b82f6' },
      disetujui_univ: { label: 'Disyahkan', color: '#10b981' },
      revisi: { label: 'Revisi', color: '#f59e0b' },
      ditolak: { label: 'Ditolak', color: '#ef4444' },
    }
    const counts = {}
    filteredData.forEach(p => { const s = p.Status || 'diajukan'; counts[s] = (counts[s] || 0) + 1 })
    return Object.entries(counts).map(([key, value]) => ({
      name: cfg[key]?.label || key,
      value,
      color: cfg[key]?.color || '#94a3b8'
    }));
  }, [filteredData]);

  // 3. WHO (Top Pengaju / Ormawa)
  const whoChartData = useMemo(() => {
    const map = {};
    filteredData.forEach(p => { const o = (p.Ormawa?.Nama || 'Lainnya').substring(0, 20); map[o] = (map[o] || 0) + 1 });
    const colors = ['#047857', '#059669', '#10b981', '#34d399', '#6ee7b7'];
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, value], i) => ({ name, value, fill: colors[i % colors.length] }));
  }, [filteredData]);



  // 6. HOW (Distribusi Anggaran per Ormawa)
  const howChartData = useMemo(() => {
    const map = {}
    filteredData.forEach(p => {
      const name = (p.Ormawa?.Nama || 'Lainnya').substring(0, 16)
      map[name] = (map[name] || 0) + (p.Anggaran || 0)
    })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }, [filteredData]);

  const columns = [
    {
      key: 'ID',
      label: 'ID Track',
      className: 'w-[120px]',
      render: (v, row) => (
        <span className="font-bold text-[var(--theme-text-muted)] text-[11px] tracking-wide">#{row.id || row.ID || v}</span>
      )
    },
    {
      key: 'Judul',
      label: 'Judul Proposal & Pengaju',
      className: 'w-[400px]',
      render: (v, row) => (
        <TitleSubtitleCell
          title={v || '—'}
          subtitle={`${row.Ormawa?.Nama || 'Unit Mahasiswa'} • ${row.Fakultas?.Nama || 'Institusi'}`}
        />
      )
    },
    {
      key: 'Anggaran',
      label: 'Estimasi Dana',
      className: 'w-[160px]',
      render: v => (
        <span className="font-bold text-[13px] text-[var(--theme-text)]">{formatRp(v)}</span>
      )
    },
    {
      key: 'Status',
      label: 'Alur Verifikasi',
      className: 'w-[160px] text-center',
      cellClassName: 'text-center',
      render: v => {
        const cfg = STATUS_CFG[v] || { label: v || '—', cls: 'bg-slate-100 text-slate-600' }
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
        title="Proposal"
        highlightedTitle="Global"
        subtitle="Pusat pengawasan dan pengesahan akhir anggaran kegiatan mahasiswa yang telah diverifikasi di tingkat fakultas."
        icon="account_balance_wallet"
        badges={[
          { label: 'Financial Intelligence', active: true }
        ]}
        actions={
          <div className="flex items-center gap-6 bg-[var(--theme-surface)] p-4 md:p-6 rounded-2xl border border-[var(--theme-border-muted)] shadow-sm">
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Antrian Pending</span>
              <span className="text-3xl font-bold text-[var(--theme-text)] font-headline tracking-tight tabular-nums leading-none">{pending} <span className="text-[10px] font-bold text-primary uppercase tracking-widest ml-1">Unit</span></span>
            </div>
            <div className="size-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-md border-none">
              <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '28px' }} strokeWidth={2.5}>pending_actions</span>
            </div>
          </div>
        }
      />

      {/* ── Stats Summary ────────────────────────────────────────── */}
      <div className="space-y-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <PrimaryStatsCard
            title="Total Proposal"
            value={totalProposal}
            icon={Layers}
            colorTheme="info"
            badgeText="Semua pengajuan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">description</span>}
          />

          <PrimaryStatsCard
            title="Menunggu Review"
            value={pending}
            icon={Clock}
            colorTheme="primary"
            badgeText="Butuh aksi universitas"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">pending</span>}
          />

          <PrimaryStatsCard
            title="Disetujui Universitas"
            value={approvedProposal}
            icon={CheckCircle}
            colorTheme="success"
            badgeText="Telah disyahkan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
          />

          <PrimaryStatsCard
            title="Total Ditolak"
            value={rejectedProposal}
            icon={AlertTriangle}
            colorTheme="error"
            badgeText="Proposal ditolak"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">cancel</span>}
          />

          <PrimaryStatsCard
            title="Anggaran Pending"
            value={formatRp(totalBudget)}
            icon={Payments}
            colorTheme="warning"
            badgeText="Menunggu persetujuan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">account_balance_wallet</span>}
          />
        </div>
      </div>

      {/* ── Analytics Charts ─────────────────────────────────────── */}
      {!loading && filteredData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

          {/* 1. WHAT */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>category</span>
                </div>
                <h3 className="text-[13px] font-bold text-[var(--theme-text)]">Topik Kegiatan</h3>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-[110px]">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={whatChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={2} dataKey="value" stroke="none">
                      {whatChartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [value + ' Proposal', props.payload.name || 'Topik']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '700' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {whatChartData.length === 0 ? <p className="text-[10px] text-slate-400">Belum ada data</p> : whatChartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] flex-1 truncate">{d.name}</span>
                    <span className="text-[11px] font-bold text-[var(--theme-text)] tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. WHY */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-purple-50 border border-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>donut_large</span>
                </div>
                <h3 className="text-[13px] font-bold text-[var(--theme-text)]">Status Validasi</h3>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-[110px]">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={whyChartData} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={2} dataKey="value" stroke="none">
                      {whyChartData.map((entry, idx) => <Cell key={idx} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name, props) => [value + ' Proposal', props.payload.name || 'Status']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '700' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {whyChartData.length === 0 ? <p className="text-[10px] text-slate-400">Belum ada data</p> : whyChartData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.color }} />
                    <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] flex-1 truncate">{d.name}</span>
                    <span className="text-[11px] font-bold text-[var(--theme-text)] tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 3. HOW */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-rose-50 border border-rose-100 rounded-xl flex items-center justify-center text-rose-600 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>account_balance_wallet</span>
                </div>
                <h3 className="text-[13px] font-bold text-[var(--theme-text)]">Alokasi Anggaran</h3>
              </div>
            </div>
            <div className="flex-1 flex items-end justify-center">
              {howChartData.length === 0 ? (
                <p className="text-[10px] text-slate-400">Belum ada data anggaran</p>
              ) : (
                <ResponsiveContainer width="100%" height={120}>
                  <AreaChart data={howChartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorHow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fb7185" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#fb7185" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#64748b' }} tickFormatter={(val) => new Intl.NumberFormat('id-ID', { notation: 'compact' }).format(val)} />
                    <Tooltip labelFormatter={(label) => `Ormawa: ${label}`} cursor={{ stroke: '#fb7185', strokeWidth: 1, strokeDasharray: '3 3', fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '700' }} formatter={(val) => [new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', notation: 'compact', maximumFractionDigits: 1 }).format(val), 'Total Anggaran']} />
                    <Area type="monotone" dataKey="value" stroke="#fb7185" strokeWidth={3} fillOpacity={1} fill="url(#colorHow)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Table Section ────────────────────────────────────────── */}
      <div>
        <div>
          <DataTable
            title="Daftar Proposal"
            subtitle="Menampilkan daftar proposal yang sedang dalam proses atau sudah selesai."
            columns={columns}
            data={filteredData}
            loading={loading}
            searchPlaceholder="Cari judul proposal, ormawa, atau ID..."
            actions={(row) => (
              <div className="flex items-center gap-1.5">
                <Button onClick={() => { setSelected(row); setIsDetailOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-bku-primary hover:bg-bku-primary/10 rounded-lg transition-colors cursor-pointer shadow-none"><span className="material-symbols-outlined" style={{ fontSize: '18px' }} >visibility</span></Button>
              </div>
            )}
          />
        </div>
      </div>

      {/* ── Detail Dialog ─────────────────────────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selected?.Judul}
        subtitle={`Detail Proposal Kegiatan • PRP-${selected?.id || selected?.ID}`}
        description={
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[14px]">corporate_fare</span>
            Pengaju: {selected?.Ormawa?.Nama || 'Unit Mahasiswa'} | {selected?.Fakultas?.Nama || 'Institusi'}
          </span>
        }
        icon="account_balance_wallet"
        maxWidth="max-w-4xl"
        variant="default"
        bodyClassName="p-6 sm:p-8 space-y-6"
        footer={
          <ModalCancelButton onClick={() => setIsDetailOpen(false)}>
            TUTUP
          </ModalCancelButton>
        }
      >

        {selected && (<>
          <div className="flex flex-col gap-6">
            {/* Main Info Section */}
            <div className="flex flex-col bg-white rounded-2xl border border-[var(--theme-border-muted)] overflow-hidden shadow-sm">
              {/* 1. Proposal & Proposer Details */}
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Identitas Pengaju</span>
                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-[var(--theme-success)] bg-[var(--theme-success-light)] border border-[var(--theme-success)]/20 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {selected?.Jenis || "Program Kerja"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Organisasi</p>
                    <p className="font-bold text-xs text-[var(--theme-text)]">{(selected?.Ormawa || selected?.ormawa || selected?.Organisasi || {})?.Nama || "ORMAWA"}</p>
                  </div>
                  <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Anggaran Pengajuan</p>
                    <p className="font-bold text-xs text-[var(--theme-success)] tabular-nums">{selected ? formatRp(selected.Anggaran) : ''}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Tanggal Pelaksanaan</p>
                    <p className="font-bold text-xs text-[var(--theme-text)]">{selected ? ((selected.TanggalKegiatan || selected.tanggal_kegiatan) ? new Date(selected.TanggalKegiatan || selected.tanggal_kegiatan).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-') : ''}</p>
                  </div>
                  <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Pengusul / Ketua</p>
                    <p className="font-bold text-xs text-[var(--theme-text)]">{(selected?.Mahasiswa?.Nama) || "Perwakilan ORMAWA"}</p>
                  </div>
                </div>

                {/* Detail Baru Proposal */}
                <div className="mt-4 pt-4 border-t border-[var(--theme-border-muted)] space-y-3.5">
                  <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Informasi Detail Kegiatan</p>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                      <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Bentuk Kegiatan</p>
                      <p className="font-bold text-[11px] text-[var(--theme-text)]">{selected?.BentukKegiatan || selected?.bentuk_kegiatan || '—'}</p>
                    </div>
                    <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                      <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Mitra Kerja</p>
                      <p className="font-bold text-[11px] text-[var(--theme-text)]">{selected?.Mitra || selected?.mitra || '—'}</p>
                    </div>
                    <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                      <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Sasaran Kegiatan</p>
                      <p className="font-bold text-[11px] text-[var(--theme-text)]">{selected?.SasaranKegiatan || selected?.sasaran_kegiatan || '—'}</p>
                    </div>
                    <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                      <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Sumber Dana</p>
                      <p className="font-bold text-[11px] text-[var(--theme-text)]">{selected?.SumberDana || selected?.sumber_dana || '—'}</p>
                    </div>
                    <div className="col-span-2 p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                      <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Indikator Keberhasilan</p>
                      <p className="font-bold text-[11px] text-[var(--theme-text)]">{selected?.IndikatorKeberhasilan || selected?.indikator_keberhasilan || '—'}</p>
                    </div>
                    <div className="col-span-2 p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                      <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Latar Belakang / Deskripsi</p>
                      <p className="font-bold text-[11px] leading-relaxed text-[var(--theme-text)]">{selected?.LatarBelakang || selected?.latar_belakang || selected?.Deskripsi || selected?.deskripsi || '—'}</p>
                    </div>
                  </div>
                </div>

                {/* Document & Budget Risk Warnings */}
                {selected && (!selected.FileURL || selected.Anggaran > 50000000) && (
                  <div className="p-3 bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 rounded-2xl flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-[var(--theme-warning)] text-[18px] mt-0.5">warning</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold text-[var(--theme-warning)] uppercase tracking-wider">Perhatian Khusus</p>
                      <ul className="list-disc pl-4 text-[10.5px] text-[var(--theme-warning)] font-medium space-y-0.5 mt-1 leading-snug">
                        {!selected.FileURL && <li>Dokumen proposal belum dilampirkan ormawa</li>}
                        {selected.Anggaran > 50000000 && <li>Anggaran melebihi batas standar fakultas (&gt; Rp 50jt)</li>}
                      </ul>
                    </div>
                  </div>
                )}
                {/* Document Link Card */}
                <div className="pt-2">
                  <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2.5">Berkas Pendaftaran</p>
                  {(() => {
                    let files = [];
                    if (selected?.FileURL || selected?.file_url) {
                      const rawUrl = selected.FileURL || selected.file_url;
                      try {
                        const parsed = JSON.parse(rawUrl);
                        files = Array.isArray(parsed) ? parsed : [rawUrl];
                      } catch {
                        files = [rawUrl];
                      }
                    }

                    if (files.length > 0) {
                      return (
                        <div className="space-y-2">
                          {files.map((file, idx) => {
                            const isAbsolute = file.startsWith('http');
                            // Fix URL parsing to point correctly to backend uploads directory
                            const baseUrl = import.meta.env.VITE_API_URL || '/api';
                            const href = isAbsolute ? file : baseUrl.replace('/api', '') + file;
                            const fileName = file.split('/').pop() || `Berkas Utama ${idx + 1}`;
                            const cleanName = fileName.includes('_') ? fileName.substring(fileName.indexOf('_') + 1) : fileName;
                            return (
                              <a
                                key={idx}
                                href={href}
                                target="_blank"
                                rel="noreferrer"
                                className="group flex items-center justify-between p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]/50 hover:bg-[var(--theme-primary-light)] hover:border-[var(--theme-primary)]/30 transition-all duration-300 cursor-pointer"
                              >
                                <div className="flex items-center gap-3.5">
                                  <div className="w-10 h-10 rounded-lg bg-[var(--theme-error-light)] text-[var(--theme-error)] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-[22px]">description</span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-[var(--theme-text)] text-sm group-hover:text-[var(--theme-primary)] transition-colors truncate">{cleanName}</h4>
                                    <p className="text-[11px] font-medium text-[var(--theme-text-muted)] mt-0.5">Klik untuk melihat file</p>
                                  </div>
                                </div>
                                <span className="material-symbols-outlined text-[var(--theme-text-subtle)] group-hover:text-[var(--theme-primary)] transition-colors" style={{ fontSize: '20px' }}>open_in_new</span>
                              </a>
                            )
                          })}
                        </div>
                      )
                    }

                    return (
                      <div className="flex items-center justify-between p-4 rounded-xl border border-dashed border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/30 opacity-70">
                        <div className="flex items-center gap-3.5">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[22px]">description</span>
                          </div>
                          <div>
                            <h4 className="font-bold text-[var(--theme-text-muted)] text-sm">Belum Ada Berkas</h4>
                            <p className="text-[11px] font-medium text-[var(--theme-text-subtle)] mt-0.5">Dokumen belum dilampirkan</p>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>


              {/* 2. Review Decision Form (Super Admin) */}
              <div className="p-5 space-y-4 bg-[var(--theme-bg)]/10">
                {/* Tenggat LPJ */}
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Tenggat Waktu LPJ (Hari)</label>
                  <div className="flex items-center bg-white border border-[var(--theme-border)] rounded-xl overflow-hidden shadow-sm md:w-1/2">
                    <input type="number" min={1} max={365}
                      value={tenggatHari}
                      onChange={e => setTenggatHari(parseInt(e.target.value) || 14)}
                      className="w-full h-11 px-4 text-sm font-bold text-slate-800 border-none bg-transparent focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)]" />
                    <span className="text-xs font-bold text-[var(--theme-text-muted)] px-4 bg-[var(--theme-bg)]/50 h-full flex items-center border-l border-[var(--theme-border)]">hari</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Catatan Verifikasi / Instruksi Penolakan</label>
                  <textarea
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    rows={3}
                    placeholder="Masukkan evaluasi detail atau arahan penolakan berkas..."
                    className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border)] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--theme-primary-light)] text-xs font-semibold text-[var(--theme-text)] transition-colors resize-none shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Pilih Keputusan Akhir</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <Button
                      type="button"
                      onClick={withPermissionCheck('faculty_proposal.update', () => handleApprove(selected.id || selected.ID))}
                      disabled={isSubmitting}
                      className="flex-1 h-11 rounded-xl bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] transition-all active:scale-95 flex items-center justify-center gap-2 border-none font-bold text-[11px] tracking-wider uppercase shadow-sm"
                    >
                      {isSubmitting ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>}
                      SAHKAN
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={withPermissionCheck('faculty_proposal.update', () => {
                        if (!rejectNote.trim()) { toast.error('Catatan revisi wajib diisi'); return }
                        handleRevise()
                      })}
                      className="flex-1 h-11 rounded-xl bg-[var(--theme-warning)] text-white hover:bg-[var(--theme-warning-hover)] font-bold text-[11px] tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-2 border-none shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit_note</span>
                      REVISI
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={withPermissionCheck('faculty_proposal.update', () => {
                        if (!rejectNote.trim()) { toast.error('Catatan penolakan wajib diisi'); return }
                        handleReject()
                      })}
                      className="flex-1 h-11 rounded-xl bg-[var(--theme-error)] text-white hover:bg-[var(--theme-error-hover)] font-bold text-[11px] tracking-wider uppercase transition-all active:scale-95 flex items-center justify-center gap-2 border-none shadow-sm"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      TOLAK
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Catatan Revisi & Peringatan (Jika Ada) */}
            <div className="p-5 space-y-4 bg-[var(--theme-bg)]/5 border-t border-[var(--theme-border-muted)]">
              {selected.Catatan && (
                <div className="bg-[var(--theme-error-light)] border border-[var(--theme-error)]/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 text-[var(--theme-error)] mb-2">
                    <span className="material-symbols-outlined text-[16px]">feedback</span>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider">Catatan Penolakan / Revisi</h3>
                  </div>
                  <div className="text-xs font-medium text-[var(--theme-error)] leading-relaxed whitespace-pre-wrap bg-white/60 p-3 rounded-lg border border-[var(--theme-error)]/10 shadow-inner">
                    {selected.Catatan}
                  </div>
                </div>
              )}

              {selected.Status === 'diajukan' && (!selected.Fakultas || !selected.fakultas_id) && (
                <div className="flex items-start gap-3 bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 rounded-xl p-4">
                  <span className="material-symbols-outlined text-[var(--theme-warning)] text-[18px] mt-0.5">info</span>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-warning)]">Peringatan</p>
                    <p className="text-[11px] font-medium text-[var(--theme-warning)]/80 leading-relaxed">
                      Ormawa tingkat Universitas (BEM/UKM/MPM). Proposal ini langsung diajukan ke Rektorat tanpa validasi Fakultas.
                    </p>
                  </div>
                </div>
              )}
            </div>




            {/* 3. Review Timeline & Logs */}
            <div className="bg-white rounded-2xl border border-[var(--theme-border-muted)] p-5 shadow-sm space-y-4">
              <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider block">Riwayat Aliran Status</span>

              {selected?.Riwayat && selected.Riwayat.length > 0 ? (
                <div className="relative border-l border-[var(--theme-border-muted)] pl-4 ml-2 space-y-4.5">
                  {selected.Riwayat.map((log, idx) => {
                    const st = STATUS_CFG[log.Status] || { label: log.Status, cls: 'bg-slate-100 text-slate-700', dot: 'bg-slate-500' }
                    return (
                      <div key={idx} className="relative">
                        {/* Marker dot */}
                        <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full border border-[var(--theme-border)] bg-white flex items-center justify-center">
                          <div className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                        </div>

                        {/* Log card */}
                        <div className="bg-[var(--theme-bg)]/30 border border-[var(--theme-border)] rounded-2xl p-3 shadow-none">
                          <div className="flex items-center justify-between">
                            <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8px] font-semibold border uppercase tracking-wider', st.cls)}>
                              {st.label}
                            </span>
                            <span className="text-[9px] font-semibold text-[var(--theme-text-muted)]">{((log.created_at || log.CreatedAt) ? new Date(log.created_at || log.CreatedAt).toLocaleDateString('id-ID', { dateStyle: 'long' }) : '-')}</span>
                          </div>
                          {log.Catatan && (
                            <p className="text-[10.5px] text-[var(--theme-text-muted)] font-medium mt-1.5 italic bg-white border border-[var(--theme-border)] rounded-lg p-2 leading-relaxed">
                              &ldquo;{log.Catatan}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4 bg-[var(--theme-bg)]/20 border border-dashed border-[var(--theme-border)] rounded-2xl">
                  <span className="material-symbols-outlined text-[var(--theme-text-subtle)] text-lg mb-1" style={{ fontSize: '20px' }}>info</span>
                  <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Belum ada riwayat aktivitas</p>
                </div>
              )}
            </div>
          </div>
        </>
        )}
      </DialogModal>

    </PageContent >
  )
}
