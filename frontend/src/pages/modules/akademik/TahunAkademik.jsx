"use client"

import React, { useState, useEffect, useMemo } from "react"
import api from "@/lib/axios"
import { toast, Toaster } from "react-hot-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"

import { cn } from "@/lib/utils"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { PageContent } from "@/components/ui/page/PageContent"
import { DashboardHero } from "@/components/ui/dashboard/DashboardHero"
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { Card, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const ToggleRight = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>toggle_on</span>;
const ToggleLeft = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>toggle_off</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const CalendarDays = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>calendar_month</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const CheckCircle2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;



export default function TahunAkademikPage() {
  const [data, setData] = useState([])
  const [allPeriods, setAllPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCrudOpen, setCrudOpen] = useState(false)
  const [isEditMode, setEditMode] = useState(false)
  const [isSubmitting, setIsSub] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [isSyncing, setIsSyncing] = useState(false)

  const [formData, setFormData] = useState({
    id: null, activeYear: '', activeSemester: 'Ganjil',
    isKrsOpen: false, isGradeInputOpen: false
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [currentRes, allRes] = await Promise.all([
        api.get("/app/dashboard/academic-periods"),
        api.get("/app/dashboard/academic-periods/all")
      ])
      if (currentRes.data.status === "success" && currentRes.data.data) setData([currentRes.data.data])
      if (allRes.data.status === "success" && allRes.data.data) setAllPeriods(allRes.data.data)
    } catch { toast.error("Gagal mengambil data periode") }
    finally { setLoading(false) }
  }

  const semesterDistData = useMemo(() => {
    const counts = {}
    allPeriods.forEach(p => {
      const s = p.Semester || p.semester || 'Unknown'
      counts[s] = (counts[s] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [allPeriods])

  const yearDistData = useMemo(() => {
    const counts = {}
    allPeriods.forEach(p => {
      const y = p.AcademicYear || p.tahun_ajaran || 'Unknown'
      counts[y] = (counts[y] || 0) + 1
    })
    return Object.entries(counts).sort(([a], [b]) => b.localeCompare(a)).map(([name, value]) => ({ name, value }))
  }, [allPeriods])

  const activeCount = allPeriods.filter(p => p.IsActive || p.is_aktif).length
  const inactiveCount = allPeriods.length - activeCount

  const periodeOptions = useMemo(() => {
    const periods = new Set()
    allPeriods.forEach(p => {
      const year = p.AcademicYear || p.tahun_ajaran
      if (year) {
        periods.add(year)
      }
    })
    return Array.from(periods).sort((a, b) => b.localeCompare(a))
  }, [allPeriods])

  const filteredPeriods = useMemo(() => {
    if (filterPeriode === 'all') return allPeriods
    return allPeriods.filter(p => (p.AcademicYear || p.tahun_ajaran) === filterPeriode)
  }, [allPeriods, filterPeriode])

  const PIE_COLORS = ['#00236f', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444']

  const columns = [
    {
      key: "Name",
      label: "Nama Periode",
      render: (val, row) => {
        const name = val || row.nama_periode || `${row.Semester || row.semester} ${row.AcademicYear || row.tahun_ajaran}`
        return <span className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px]">{name}</span>
      }
    },
    {
      key: "AcademicYear",
      label: "Tahun",
      render: (val, row) => <span className="text-[12px] font-medium text-[var(--theme-text-muted)] tracking-tight">{val || row.tahun_ajaran || '—'}</span>
    },
    {
      key: "Semester",
      label: "Semester",
      render: (val, row) => <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">{val || row.semester || '—'}</span>
    },
    {
      key: "IsActive",
      label: "Status",
      render: (val, row) => {
        const isActive = val || row.is_aktif
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider',
            isActive ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200')}>
            <span className={cn('w-1.5 h-1.5 rounded-full', isActive ? 'bg-emerald-500' : 'bg-slate-300')} />
            {isActive ? 'Aktif' : 'Tidak'}
          </span>
        )
      }
    },
    {
      key: "IsKRSOpen",
      label: "KRS",
      render: (val, row) => {
        const isKrsOpen = val || row.krs_buka
        return (
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wider',
            isKrsOpen ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-500')}>
            {isKrsOpen ? 'BUKA' : 'TUTUP'}
          </span>
        )
      }
    }
  ]

  useEffect(() => { fetchData() }, [])

  const handleOpenAdd = () => {
    setEditMode(false)
    setFormData({ id: 0, activeYear: '', activeSemester: 'Ganjil', isKrsOpen: false, isGradeInputOpen: false })
    setCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setEditMode(true)
    setFormData({ id: row.id, activeYear: row.activeYear, activeSemester: row.activeSemester, isKrsOpen: row.isKrsOpen, isGradeInputOpen: row.isGradeInputOpen })
    setCrudOpen(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSub(true)
    try {
      await api.post("/app/dashboard/academic-periods", formData)
      toast.success(isEditMode ? "Periode berhasil diperbarui" : "Periode baru diinisialisasi")
      fetchData(); setCrudOpen(false)
    } catch (err) { toast.error(err.response?.data?.message || "Gagal menyimpan data periode") }
    finally { setIsSub(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    setIsSub(true)
    try {
      await api.delete(`/app/dashboard/academic-periods/${delTarget.id}`)
      toast.success("Periode akademik berhasil dihapus")
      fetchData(); setDelTarget(null)
    } catch { toast.error("Gagal menghapus periode") }
    finally { setIsSub(false) }
  }

  const handleSyncSevima = async () => {
    setIsSyncing(true)
    try {
      const res = await api.post("/app/dashboard/sync-periode")
      toast.success(res.data?.message || "Berhasil sinkronisasi periode dari SEVIMA")
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || "Gagal sinkronisasi data dari SEVIMA")
    } finally {
      setIsSyncing(false)
    }
  }

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }))
  const current = data[0]

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Periode"
        highlightedTitle="Akademik"
        subtitle="Konfigurasi semester aktif, serta buka/tutup portal pendaftaran beasiswa dan pengajuan aspirasi mahasiswa."
        icon="calendar_month"
        badges={[
          { label: 'Kalender Hub', active: false },
          { label: `Siklus Aktif: ${current?.activeYear || 'IDLE'}`, active: true },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-[160px] h-10 border border-[var(--theme-border)] bg-white/80 backdrop-blur-sm rounded-xl text-xs font-semibold text-[var(--theme-text-muted)] focus:ring-0">
                <SelectValue placeholder="Semua Tahun" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white">
                <SelectItem value="all" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">Semua Tahun</SelectItem>
                {periodeOptions.map(per => (
                  <SelectItem key={per} value={per} className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">
                    Tahun {per}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={fetchData} disabled={loading || isSyncing}
              className="h-10 px-5 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-primary hover:border-primary/30 hover:bg-slate-50/50 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2">
              {loading ? <span className="material-symbols-outlined animate-spin text-primary" style={{ fontSize: '13px' }} >sync</span> : <RefreshCw size={13} className="text-primary" />} Refresh Data
            </button>
            <button onClick={handleSyncSevima} disabled={loading || isSyncing}
              className="h-10 px-5 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2">
              {isSyncing ? <span className="material-symbols-outlined animate-spin text-white" style={{ fontSize: '13px' }} >sync</span> : <span className="material-symbols-outlined text-white" style={{ fontSize: '13px' }}>cloud_download</span>} Sync Sevima
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6 mt-6">
        <PrimaryStatsCard
          title="Siklus Aktif"
          value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : (current?.activeYear || 'IDLE')}
          icon={CalendarDays}
          colorTheme="primary"
          badgeText="Tahun Berjalan"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">event</span>}
        />
        <PrimaryStatsCard
          title="Semester"
          value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : (current?.activeSemester || '—')}
          icon={Clock}
          colorTheme="success"
          badgeText="Saat Ini"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">schedule</span>}
        />
        <PrimaryStatsCard
          title="Portal Beasiswa"
          value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : (current?.isKrsOpen ? 'OPEN' : 'CLOSED')}
          icon={Award}
          colorTheme={current?.isKrsOpen ? "success" : "error"}
          badgeText="Akses Mahasiswa"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">admin_panel_settings</span>}
        />
        <PrimaryStatsCard
          title="Total Periode"
          value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : allPeriods.length}
          icon={CalendarDays}
          colorTheme="info"
        />
      </div>

      {/* 5W1H Charts */}
      {!loading && allPeriods.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* WHAT → Distribusi Semester */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pie_chart</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Rasio Ganjil/Genap</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Distribusi Semester</h3>
              </div>
            </div>
            <div className="h-[160px] w-full flex items-center justify-center">
              {semesterDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={semesterDistData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                      {semesterDistData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <span className="text-xs text-slate-400 italic">Tidak ada data</span>}
            </div>
            <div className="flex justify-center gap-3 mt-1">
              {semesterDistData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-500">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* WHAT → Periode per Tahun */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bar_chart</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Jumlah Periode</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Periode per Tahun</h3>
              </div>
            </div>
            <div className="h-[160px] w-full">
              {yearDistData.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={yearDistData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="value" name="Periode" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="h-full flex items-center justify-center"><span className="text-xs text-slate-400 italic">Tidak ada data</span></div>}
            </div>
          </div>

          {/* HOW → Status Aktif vs Tidak */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4 shrink-0">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>toggle_on</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Aktif vs Tidak Aktif</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Status Periode</h3>
              </div>
            </div>
            <div className="h-[160px] w-full flex items-center justify-center">
              {allPeriods.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={[{ name: 'Aktif', value: activeCount }, { name: 'Tidak Aktif', value: inactiveCount }]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                      <Cell fill="#10b981" /><Cell fill="#e2e8f0" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <span className="text-xs text-slate-400 italic">Tidak ada data</span>}
            </div>
            <div className="flex justify-center gap-4 mt-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500">Aktif: {activeCount}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-200" />
                <span className="text-[10px] font-bold text-slate-500">Tidak: {inactiveCount}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current Period Card */}
      {current && !loading && (
        <div className="glass-card border border-slate-200/60 rounded-2xl shadow-none overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-black text-sm uppercase tracking-tight font-headline" style={{ color: 'var(--theme-h2)' }}>Periode Aktif Saat Ini</h2>
              <p className="text-xs text-slate-500 mt-0.5">Konfigurasi semester yang sedang berjalan (Read-Only)</p>
            </div>
          </div>
          <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Tahun Akademik', value: current.activeYear },
              { label: 'Semester', value: current.activeSemester },
              { label: 'Portal Beasiswa', value: current.isKrsOpen ? 'TERBUKA' : 'TERTUTUP', ok: current.isKrsOpen },
              { label: 'Layanan Aspirasi', value: current.isGradeInputOpen ? 'TERBUKA' : 'TERTUTUP', ok: current.isGradeInputOpen },
            ].map(item => (
              <div key={item.label} className="bg-transparent/50 border border-slate-200/60 rounded-xl p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.15em] mb-1">{item.label}</p>
                <p className={cn('text-sm font-extrabold uppercase',
                  item.ok === true ? 'text-emerald-600' :
                    item.ok === false ? 'text-rose-500' : 'text-slate-900')}>
                  {item.value || '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Periods Timeline */}
      {!loading && allPeriods.length > 1 && (
        <Card className="border border-[var(--theme-border)] shadow-sm bg-[var(--theme-surface)] rounded-2xl overflow-hidden mt-6 mb-6">
          <div className="px-6 py-5 border-b border-[var(--theme-border)] flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-[var(--theme-surface)]">
            <div className="flex-1">
              <h2 className="font-headline font-bold text-lg text-[var(--theme-text)]">Riwayat Periode Akademik</h2>
              <p className="text-xs text-[var(--theme-text-muted)] mt-1 font-medium">
                Menampilkan total <span className="font-bold text-[var(--theme-primary)]">{allPeriods.length}</span> periode yang pernah dikonfigurasi
              </p>
            </div>
          </div>
          <CardContent className="p-0 [&>div]:border-none [&>div]:rounded-none [&>div]:shadow-none">
            <DataTable
              columns={columns}
              data={filteredPeriods}
              loading={loading}
              searchPlaceholder="Cari periode akademik..."
              itemLabel="periode akademik"
            />
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {!loading && data.length === 0 && (
        <div className="glass-card rounded-2xl border border-slate-200/60 shadow-none p-16 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-[#eef4ff] rounded-2xl flex items-center justify-center text-primary"><span className="material-symbols-outlined" style={{ fontSize: '28px' }} >calendar_month</span></div>
            <p className="font-bold text-lg text-slate-900">Belum Ada Periode Akademik</p>
            <p className="text-sm text-slate-400">Silakan hubungi Super Admin untuk menginisialisasi periode semester aktif.</p>
          </div>
        </div>
      )}
    </PageContent>
  )
}