"use client"

import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast, Toaster } from 'react-hot-toast'

import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'

import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { PageContent } from "@/components/ui/page"
import { DialogModal } from "@/components/ui/DialogModal"
import { DashboardHero } from "@/components/ui/dashboard"
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const ExternalLink = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>open_in_new</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const FileText = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>description</span>;
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const CheckCircle2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const ShieldCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified_user</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const XCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>cancel</span>;



const API = "/app/dashboard"
const formatIDR = (n) => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(n||0)
const formatDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const PROPOSAL_STATUS = {
  disetujui_fakultas: {cls:'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20',   dot:'bg-[var(--theme-primary)]',  label:'ACC Fakultas'},
  disetujui_univ:     {cls:'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20', dot:'bg-[var(--theme-success)]', label:'Disyahkan Univ'},
  revisi:             {cls:'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info)]/20',          dot:'bg-[var(--theme-info)]',    label:'Revisi'},
  ditolak:            {cls:'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20',          dot:'bg-[var(--theme-error)]',    label:'Ditolak'},
  diajukan:           {cls:'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20',       dot:'bg-[var(--theme-warning)]',   label:'Diajukan'},
  selesai:            {cls:'bg-emerald-100 text-emerald-700 border-emerald-500/20',       dot:'bg-emerald-600',   label:'Selesai'},
}
const getStatus = (v='') => PROPOSAL_STATUS[(v||'diajukan').toLowerCase()] || PROPOSAL_STATUS.diajukan

export default function FacultyProposalApproval() {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState(null)
  const [isSubmitting, setIsSub]  = useState(false)
  const [showPdf, setShowPdf]     = useState(false)
  const [catatan, setCatatan]     = useState('')
  const [search, setSearch]       = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [periodsList, setPeriodsList]     = useState([])
  const [currentPage, setCurrentPage]   = useState(1)
  const [pageSize, setPageSize]         = useState(10)
  const [sortConfig, setSortConfig]     = useState({ key: 'CreatedAt', direction: 'desc' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/ormawa/proposals`)
      if (res.data.status === 'success') setProposals(res.data.data||[])
      
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
    } catch { toast.error('Gagal mengambil data proposal') }
    finally { setLoading(false) }
  }

  const handleUpdateStatus = async (status) => {
    if (!selected) return

    if ((status === 'revisi' || status === 'ditolak') && !catatan.trim()) {
      toast.error(`Harap isi catatan evaluasi sebelum memilih ${status === 'revisi' ? 'Revisi' : 'Tolak'}!`)
      return
    }

    setIsSub(true)
    try {
      const res = await axios.put(`${API}/ormawa/proposals/${selected.id || selected.ID}`, { status: status, catatan_admin: catatan })
      if (res.data.status === 'success') { toast.success(`Proposal berhasil ${status === 'disetujui_fakultas' ? 'disetujui dan diteruskan ke Universitas' : status}`); setSelected(null); fetchData() }
      else toast.error(res.data.message||'Gagal update')
    } catch (e) { toast.error(e.response?.data?.message||'Server sibuk') }
    finally { setIsSub(false) }
  }

  useEffect(() => { fetchData() }, [])

  const periodeOptions = useMemo(() => {
    const periods = new Set()
    proposals.forEach(p => {
      const date = p.created_at || p.CreatedAt || p.TanggalKegiatan || p.tanggal_kegiatan
      if (date) {
        const d = new Date(date)
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear()
          if (year > 1900) {
            periods.add(String(year))
          }
        }
      }
    })
    return Array.from(periods).sort((a, b) => Number(b) - Number(a))
  }, [proposals])

  const filtered = useMemo(() => proposals.filter(p => {
    const q = search.toLowerCase()
    const org = p.Ormawa||p.ormawa||p.Organisasi||{}
    const matchQ = !q || p.Judul?.toLowerCase().includes(q) || (org.Nama||org.nama||'').toLowerCase().includes(q)
    const matchS = filterStatus==='all' || (p.Status||'pending').toLowerCase()===filterStatus
    let matchP = filterPeriode === 'all'
    if (!matchP) {
      const date = p.created_at || p.CreatedAt || p.TanggalKegiatan || p.tanggal_kegiatan
      if (date) {
        const d = new Date(date)
        if (!isNaN(d.getTime())) {
          const propYear = String(d.getFullYear())
          const yearFromPeriod = filterPeriode.length >= 4 ? filterPeriode.substring(0, 4) : filterPeriode;
          matchP = propYear === filterPeriode || propYear === yearFromPeriod
        }
      }
    }
    return matchQ && matchS && matchP
  }), [proposals, search, filterStatus, filterPeriode])

  const sorted = useMemo(() => {
    let items = [...filtered]
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'ormawa') {
          const aOrg = a.Ormawa||a.ormawa||a.Organisasi||{}
          const bOrg = b.Ormawa||b.ormawa||b.Organisasi||{}
          aVal = aOrg.Nama||aOrg.nama||aOrg.NamaOrg||''
          bVal = bOrg.Nama||bOrg.nama||bOrg.NamaOrg||''
        } else {
          aVal = a[sortConfig.key]
          bVal = b[sortConfig.key]
        }

        if (typeof aVal === 'string') aVal = aVal.toLowerCase()
        if (typeof bVal === 'string') bVal = bVal.toLowerCase()

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }
    return items
  }, [filtered, sortConfig])

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return sorted.slice(start, start + pageSize)
  }, [sorted, currentPage, pageSize])

  const totalItems = filtered.length
  const totalPages = Math.ceil(totalItems / pageSize)

  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
    setCurrentPage(1)
  }

  const stats = {
    total: proposals.length,
    totalBudget: proposals.reduce((a,p)=>a+(p.Anggaran||0),0),
    accFakultas: proposals.filter(p=>p.Status==='disetujui_fakultas').length,
    accUniv: proposals.filter(p=>p.Status==='disetujui_univ').length,
  }

  const approvalRate = stats.total > 0 ? Math.round(((stats.accFakultas + stats.accUniv) / stats.total) * 100) : 0

  const statusDistribution = useMemo(() => {
    const counts = {}
    proposals.forEach(p => {
      let s = (p.Status || 'diajukan').toLowerCase()
      if (s === 'pending') s = 'diajukan'
      if (!PROPOSAL_STATUS[s]) s = 'diajukan'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts).map(([key, value]) => ({
      name: getStatus(key).label,
      value
    }))
  }, [proposals])

  const topOrmawaData = useMemo(() => {
    const counts = {}
    proposals.forEach(p => {
      const org = p.Ormawa || p.ormawa || p.Organisasi || {}
      const name = org.Nama || org.nama || org.NamaOrg || 'Unknown'
      counts[name] = (counts[name] || 0) + 1
    })
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  }, [proposals])

  const monthlyTrendData = useMemo(() => {
    const byMonth = {}
    proposals.forEach(p => {
      const date = p.created_at || p.CreatedAt
      if (!date) return
      const d = new Date(date)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      byMonth[key] = (byMonth[key] || 0) + 1
    })
    const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des']
    return Object.entries(byMonth)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([m, v]) => {
        const [y, mo] = m.split('-')
        return { month: `${months[parseInt(mo)-1]} ${y}`, value: v }
      })
  }, [proposals])

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b']

  const tableColumns = [
    {
      key: 'Judul',
      label: 'Program Kerja',
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-semibold text-sm text-[var(--theme-text)] max-w-[200px] truncate">{row.Judul}</p>
          <p className="text-[10px] text-[var(--theme-text-muted)] font-medium mt-0.5">{formatDate(row.created_at || row.CreatedAt)}</p>
        </div>
      )
    },
    {
      key: 'ormawa',
      label: 'Organisasi',
      sortable: true,
      render: (val, row) => {
        const org = row.Ormawa || row.ormawa || row.Organisasi || {};
        return (
          <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] bg-[var(--theme-bg)] border border-[var(--theme-border)] px-2.5 py-1 rounded-md">
            {org?.Nama || org?.nama || org?.NamaOrg || '—'}
          </span>
        );
      }
    },
    {
      key: 'Anggaran',
      label: 'Anggaran',
      sortable: true,
      render: (val, row) => (
        <span className="font-bold text-sm text-[var(--theme-success)] tabular-nums">{formatIDR(row.Anggaran)}</span>
      )
    },
    {
      key: 'Status',
      label: 'Status',
      sortable: true,
      render: (val, row) => {
        const st = getStatus(row.Status);
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider whitespace-nowrap', st.cls)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)}/>{st.label}
          </span>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (val, row) => {
        const s = (row.Status || '').toLowerCase();
        const canVerify = s === 'diajukan' || s === 'revisi';
        return (
          <button onClick={() => { setSelected(row); setCatatan(row.catatan_admin || row.Catatan || ''); }}
            className={cn("flex items-center gap-1 h-8 px-2.5 text-[11px] font-semibold border rounded-lg transition-all active:scale-95 cursor-pointer",
              canVerify 
              ? "text-[var(--theme-primary)] bg-[var(--theme-primary-light)] border-[var(--theme-primary)]/10 hover:bg-[var(--theme-primary)] hover:text-white"
              : "text-[var(--theme-text-muted)] bg-[var(--theme-bg)] border-[var(--theme-border-muted)] hover:bg-[var(--theme-bg-hover)]"
            )}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >{canVerify ? 'security' : 'visibility'}</span> {canVerify ? 'Verifikasi' : 'Detail'}
          </button>
        )
      }
    }
  ];

  return (
    <div className="min-h-screen bg-transparent font-body">
      <Toaster position="top-right"/>
      <PageContent>
        <DashboardHero
          title="Proposal "
          highlightedTitle="ORMAWA"
          subtitle="Review dan validasi proposal program kerja serta anggaran kegiatan organisasi mahasiswa."
          icon="description"
          badges={[
            { label: 'Validasi Anggaran & Kegiatan', active: false },
            { label: `${stats.accFakultas} ACC Fakultas`, active: true }
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Select value={filterPeriode} onValueChange={setFilterPeriode}>
                <SelectTrigger className="w-[160px] h-10 border border-[var(--theme-border)] bg-[var(--theme-surface)]/80 backdrop-blur-sm rounded-xl text-xs font-semibold text-[var(--theme-text-muted)] focus:ring-0">
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
              <button onClick={fetchData} disabled={loading}
                className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none">
                {loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>sync</span>} Refresh Data
              </button>
            </div>
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <PrimaryStatsCard title="Total Proposal" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.total} icon={FileText} colorTheme="primary" badgeText="Semua pengajuan" />
          <PrimaryStatsCard title="Total Anggaran" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : formatIDR(stats.totalBudget)} icon={Activity} colorTheme="success" badgeText="Akumulasi budget" />
          <PrimaryStatsCard title="Approval Rate" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : `${approvalRate}%`} icon={CheckCircle2} colorTheme="info" badgeText="Disetujui / total" />
          <PrimaryStatsCard title="ACC Fakultas" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.accFakultas} icon={ShieldCheck} colorTheme="warning" badgeText="Disetujui fakultas" />
          <PrimaryStatsCard title="Disyahkan Univ" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.accUniv} icon={ShieldCheck} colorTheme="success" badgeText="Final disyahkan" />
        </div>

        {/* Charts */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Pie: Status Distribution */}
            <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4 shrink-0">
                  <div className="w-12 h-12 bg-[var(--theme-info-light)] rounded-xl flex justify-center items-center text-[var(--theme-info)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                    <span className="material-symbols-outlined text-[24px]">pie_chart</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Analisis Data</span>
                    <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Distribusi Status</h3>
                  </div>
                </div>
              <div className="flex-1 w-full flex flex-col justify-center">
                {statusDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={statusDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {statusDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-[var(--theme-text-subtle)] italic text-center w-full block">Tidak ada data</span>}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-4">
                {statusDistribution.slice(0, 6).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--theme-surface-hover)] border border-[var(--theme-border-muted)]">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-[var(--theme-text-muted)] truncate leading-none">{item.name}</p>
                      <p className="text-xs font-extrabold text-[var(--theme-text)] leading-none mt-1">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              </div>
            </div>

            {/* Bar: Proposal per Ormawa (Top 5) */}
            <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4 shrink-0">
                  <div className="w-12 h-12 bg-[var(--theme-success-light)] rounded-xl flex justify-center items-center text-[var(--theme-success)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                    <span className="material-symbols-outlined text-[24px]">bar_chart</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Demografi</span>
                    <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Pengajuan per ORMAWA (Top 5)</h3>
                  </div>
                </div>
              <div className="flex-1 w-full flex flex-col justify-center">
                {topOrmawaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topOrmawaData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border-muted)" />
                      <XAxis type="number" tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                      <Bar dataKey="value" name="Proposal" fill="var(--theme-success)" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><span className="text-xs text-[var(--theme-text-subtle)] italic">Tidak ada data</span></div>}
              </div>
              </div>
            </div>

            {/* Line: Tren Pengajuan per Bulan */}
            <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-4 mb-4 shrink-0">
                  <div className="w-12 h-12 bg-[var(--theme-warning-light)] rounded-xl flex justify-center items-center text-[var(--theme-warning)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                    <span className="material-symbols-outlined text-[24px]">trending_up</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Statistik</span>
                    <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Tren Pengajuan Bulanan</h3>
                  </div>
                </div>
              <div className="flex-1 w-full flex flex-col justify-center">
                {monthlyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border-muted)" />
                      <XAxis dataKey="month" tick={{ fontSize: 8, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                      <Line type="monotone" dataKey="value" name="Proposal" stroke="var(--theme-warning)" strokeWidth={2.5} dot={{ fill: 'var(--theme-warning)', r: 3 }} activeDot={{ r: 5, fill: 'var(--theme-warning)' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><span className="text-xs text-[var(--theme-text-subtle)] italic">Tidak ada data</span></div>}
              </div>
              </div>
            </div>
          </div>
        )}



        {/* Table */}
        <div>
          <DataTable
            title="Daftar Proposal Ormawa"
            subtitle="Menampilkan daftar proposal ormawa di fakultas."
            data={filtered}
            columns={tableColumns}
            loading={loading}
            searchable={true}
            pagination={true}
            pageSize={10}
            emptyMessage="Belum Ada Proposal"
            emptyIcon="description"
            searchPlaceholder="Cari judul atau organisasi..."
            searchValue={search}
            onSearchChange={setSearch}
            manualFiltering={true}
            filterValues={{ status: filterStatus }}
            onFilterChange={(key, val) => {
              if (key === 'status') setFilter(val);
            }}
            filters={[
              {
                key: 'status',
                placeholder: 'Status',
                options: [
                  { value: 'pending', label: 'Diajukan' },
                  { value: 'revisi', label: 'Revisi' },
                  { value: 'disetujui_fakultas', label: 'ACC Fakultas' },
                  { value: 'disetujui_univ', label: 'Disyahkan Univ' },
                  { value: 'ditolak', label: 'Ditolak' }
                ],
                className: 'w-[140px]'
              }
            ]}
          />
        </div>
      </PageContent>
      {/* Verification Modal / Side-by-Side Review Panel */}
      <DialogModal
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null)
            setShowPdf(false)
          }
        }}
        icon="description"
        title={<span className="capitalize">{selected?.Judul?.toLowerCase() || ''}</span>}
        subtitle="Detail Review Proposal ORMAWA"
        maxWidth="max-w-2xl"
        bodyClassName="p-6 sm:p-8 space-y-6"
      >        <div className="flex flex-col gap-6">
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
                  <p className="font-bold text-xs text-[var(--theme-text)]">{(selected?.Ormawa||selected?.ormawa||selected?.Organisasi||{})?.Nama || "ORMAWA"}</p>
                </div>
                <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                  <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Anggaran Pengajuan</p>
                  <p className="font-bold text-xs text-[var(--theme-success)] tabular-nums">{selected ? formatIDR(selected.Anggaran) : ''}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div className="p-3 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl">
                  <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider leading-none mb-1.5">Tanggal Pelaksanaan</p>
                  <p className="font-bold text-xs text-[var(--theme-text)]">{selected ? formatDate(selected.TanggalKegiatan || selected.tanggal_kegiatan) : ''}</p>
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
              {selected && (!(selected.FileURL || selected.file_url) || selected.Anggaran > 50000000) && (
                <div className="p-3 bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 rounded-2xl flex items-start gap-2.5">
                  <span className="material-symbols-outlined text-[var(--theme-warning)] text-[18px] mt-0.5">warning</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold text-[var(--theme-warning)] uppercase tracking-wider">Perhatian Khusus</p>
                    <ul className="list-disc pl-4 text-[10.5px] text-[var(--theme-warning)] font-medium space-y-0.5 mt-1 leading-snug">
                      {!(selected.FileURL || selected.file_url) && <li>Dokumen proposal belum dilampirkan ormawa</li>}
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

            {/* 2. Review Decision Form */}
            {['diajukan', 'revisi'].includes((selected?.Status || '').toLowerCase()) && (
              <div className="p-5 space-y-4 bg-[var(--theme-bg)]/10">
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Catatan Verifikasi / Instruksi Revisi</label>
                  <textarea
                    value={catatan}
                    onChange={e=>setCatatan(e.target.value)}
                    rows={3}
                    placeholder="Masukkan evaluasi detail atau arahan perbaikan berkas..."
                    className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border)] bg-white focus:outline-none focus:border-primary focus:ring-2 focus:ring-[var(--theme-primary-light)] text-xs font-semibold text-[var(--theme-text)] transition-colors resize-none shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-2">Pilih Keputusan Akhir</label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      {s:'disetujui_fakultas', label:'Setujui', icon:CheckCircle2, cls:'bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)]'},
                      {s:'revisi',            label:'Revisi',   icon:Clock,       cls:'bg-[var(--theme-info)] hover:bg-[var(--theme-info)]/90'}, // standard info/blue button
                      {s:'ditolak',           label:'Tolak',    icon:XCircle,     cls:'bg-[var(--theme-error)] hover:bg-[var(--theme-error-hover)]'}, // standard error/red button
                    ].map(opt=>(
                      <button 
                        key={opt.s} 
                        onClick={()=>handleUpdateStatus(opt.s)} 
                        disabled={isSubmitting}
                        className={cn('flex flex-row items-center justify-center gap-2 h-11 rounded-xl text-white text-[11px] font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-sm disabled:opacity-50', opt.cls)}
                      >
                        {isSubmitting ? (
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span>
                        ) : (
                          <opt.icon size={16}/>
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
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
                    const st = getStatus(log.Status)
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
                            <span className="text-[9px] font-semibold text-[var(--theme-text-muted)]">{formatDate(log.created_at || log.CreatedAt)}</span>
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
      </DialogModal>
    </div>
  )
}
