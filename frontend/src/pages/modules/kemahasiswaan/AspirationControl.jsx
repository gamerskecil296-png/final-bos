"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService, API_BASE_URL } from '@/services/api'
import { usePermission } from '@/hooks/usePermission'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts'

import { Badge } from '@/components/ui/Badge'
import { cn } from '@/lib/utils'
import { toast, Toaster } from 'react-hot-toast'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DataTable } from '@/components/ui/DataTable'
import { Eye } from 'lucide-react'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Filter = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>filter_alt</span>;
const Database = ({ size = 20, className, ...props }) => <span className={cn("material-symbols-outlined shrink-0", className, props.animate && 'animate-spin')} style={{ fontSize: size, ...props.style }} {...props}>storage</span>;
const ChevronRight = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>chevron_right</span>;
const ChatIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>chat</span>
const TimerIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>timer</span>
const CheckCircleIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>check_circle</span>
const GroupIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>group</span>
const ForumIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>forum</span>
const UrgentIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>gpp_maybe</span>
const CalendarIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>calendar_month</span>

const getCleanImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const baseUrl = API_BASE_URL.replace('/api', '')
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

const getShortFacultyName = (name) => {
  if (!name || name === 'Tidak ada data' || name === '—' || name === 'Institusional') return '—'
  return name
    .replace(/Fakultas\s+/i, '')
    .replace(/Sains\s+dan\s+Teknologi/i, 'Sains & Tek')
    .replace(/Sains\s+&\s+Teknologi/i, 'Sains & Tek')
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

const normalizeAspiration = (asp = {}) => {
  const mahasiswa = asp.Mahasiswa || asp.mahasiswa || {}
  const fakultas = asp.Fakultas || asp.fakultas || mahasiswa.Fakultas || mahasiswa.fakultas || {}
  const id = asp.ID ?? asp.id ?? ''

  return {
    ...asp,
    ID: id,
    Judul: asp.Judul ?? asp.judul ?? asp.Subjek ?? asp.subjek ?? '',
    Subjek: asp.Subjek ?? asp.subjek ?? asp.Judul ?? asp.judul ?? '',
    Isi: asp.Isi ?? asp.isi ?? '',
    Kategori: asp.Kategori ?? asp.kategori ?? 'General',
    Priority: asp.Priority ?? asp.Prioritas ?? asp.prioritas ?? 'NORMAL',
    Deadline: asp.Deadline ?? asp.deadline ?? null,
    Status: asp.Status ?? asp.status ?? 'OPEN',
    Respon: asp.Respon ?? asp.respon ?? '',
    CreatedAt: asp.CreatedAt ?? asp.created_at ?? new Date(),
    BuktiURL: asp.BuktiURL ?? asp.bukti_url ?? asp.FotoURL ?? asp.foto_url ?? asp.lampiran_url ?? asp.LampiranURL ?? '',
    Mahasiswa: {
      ...mahasiswa,
      Nama: mahasiswa.Nama ?? mahasiswa.nama ?? 'System Identity',
      NIM: mahasiswa.NIM ?? mahasiswa.nim ?? '-',
      Fakultas: {
        ...fakultas,
        Nama: fakultas.Nama ?? fakultas.nama ?? 'Institusional',
      },
      Foto: getCleanImageUrl(mahasiswa.foto_url || mahasiswa.FotoURL || mahasiswa.foto || mahasiswa.Foto || null)
    },
    Fakultas: {
      ...fakultas,
      Nama: fakultas.Nama ?? fakultas.nama ?? 'Institusional',
    },
  }
}

const AspirationControl = () => {
  const [aspirations, setAspirations] = useState([])
  const [stats, setStats] = useState({ active: 0, overdue: 0, resolved: 0 })
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ status: '', respon: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [faculties, setFaculties] = useState([])
  const [periods, setPeriods] = useState([])
  
  const { withPermissionCheck } = usePermission()

  const activeFacultyId = localStorage.getItem('superadmin_fakultas_id') || 'all'
  const activeProdiId = localStorage.getItem('superadmin_prodi_id') || 'all'
  const activePeriodId = localStorage.getItem('superadmin_period_id') || 'all'

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [aspRes, statsRes, facRes, periodRes] = await Promise.all([
        adminService.getGlobalAspirations(),
        adminService.getStats(),
        adminService.getAllFaculties(),
        adminService.getAllAcademicPeriods()
      ])

      if (aspRes.status === 'success') {
        setAspirations((aspRes.data || []).map(normalizeAspiration))
      }
      if (statsRes.status === 'success') {
        setStats({
          active: statsRes.data.aspirasi_aktif || 0,
          overdue: statsRes.data.sla_overdue || 0,
          resolved: statsRes.data.resolved_today || 0
        })
      }
      if (facRes && facRes.status === 'success') {
        setFaculties(facRes.data || [])
      }
      if (periodRes && periodRes.status === 'success') {
        setPeriods(periodRes.data || [])
      }
    } catch (error) {
      toast.error('Gagal memuat pusat aspirasi global')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAudit = (asp) => {
    setSelected(asp)
    setForm({
      status: asp.Status || 'proses',
      respon: asp.Respon || ''
    })
  }

  const handleSubmitResolution = async (e) => {
    if (e) e.preventDefault()
    if (!form.status || !form.respon) {
      toast.error('Status dan Tanggapan harus diisi')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await adminService.updateAspirationStatus(selected.ID, form)
      if (res.status === 'success') {
        toast.success('Resolusi aspirasi berhasil diperbarui')
        setSelected(null)
        loadData()
      } else {
        toast.error(res.message || 'Gagal memperbarui status')
      }
    } catch {
      toast.error('Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  const viewableAspirations = useMemo(() => {
    const allowedStatuses = ['disetujui fakultas', 'selesai', 'proses', 'ditinjau', 'ditolak'];
    return aspirations.filter(asp => allowedStatuses.includes((asp.Status || '').toLowerCase()))
  }, [aspirations])

  const computedStats = useMemo(() => {
    const active = viewableAspirations.filter(a => ['proses', 'disetujui fakultas', 'ditinjau'].includes((a.Status || '').toLowerCase())).length
    const resolved = viewableAspirations.filter(a => (a.Status || '').toLowerCase() === 'selesai').length
    const total = viewableAspirations.length
    const overdue = viewableAspirations.filter(a => {
      if (!a.Deadline) return false
      const isPast = new Date(a.Deadline) < new Date()
      const isPending = !['selesai', 'ditolak'].includes((a.Status || '').toLowerCase())
      return isPast && isPending
    }).length

    return { active, overdue, resolved, total }
  }, [viewableAspirations])

  const baseFilteredAspirations = viewableAspirations.filter(asp => {
    // Filter by Faculty Context
    if (activeFacultyId !== 'all') {
      const activeFaculty = faculties.find(f => String(f.id || f.ID) === String(activeFacultyId))
      const targetFacultyName = activeFaculty ? (activeFaculty.nama || activeFaculty.Nama || '').toLowerCase() : ''
      const facultyName = (asp.Fakultas?.Nama || asp.Mahasiswa?.Fakultas?.Nama || '').toLowerCase();
      if (facultyName !== targetFacultyName) return false;
    }

    // Filter by Prodi Context
    if (activeProdiId !== 'all') {
      const prodiId = asp.Mahasiswa?.ProgramStudiID || asp.Mahasiswa?.program_studi_id || '';
      if (String(prodiId) !== String(activeProdiId)) return false;
    }

    // Filter by Period Context
    if (activePeriodId !== 'all') {
      const selectedPeriod = periods.find(p => String(p.id || p.ID) === String(activePeriodId))
      if (selectedPeriod) {
        let year = 0;
        const match = selectedPeriod.AcademicYear?.match(/\d+/);
        if (match) year = parseInt(match[0]);
        if (year > 0) {
          const entryYear = asp.Mahasiswa?.TahunMasuk || asp.Mahasiswa?.tahun_masuk || 0;
          if (entryYear !== year) return false;
        }
      }
    }

    return true;
  }).map(asp => ({
    ...asp,
    FakultasNama: asp.Fakultas?.Nama || asp.Mahasiswa?.Fakultas?.Nama || '',
    StatusLower: (asp.Status || '').toLowerCase()
  }));

  // Priority mapping for UI
  const priorityStyles = {
    'CRITICAL': 'bg-rose-500 text-white shadow-lg shadow-rose-100',
    'HIGH': 'bg-amber-500 text-white shadow-lg shadow-amber-100',
    'NORMAL': 'bg-primary text-white shadow-lg shadow-primary/20',
    'LOW': 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
  }

  // ── Derived Chart Data ─────────────────────────────────────────────
  const statusDonutData = useMemo(() => {
    const counts = { proses: 0, selesai: 0, ditolak: 0, ditinjau: 0, 'disetujui fakultas': 0 }
    viewableAspirations.forEach(a => {
      const s = (a.Status || '').toLowerCase()
      if (counts[s] !== undefined) counts[s]++
    })
    return [
      { name: 'Diproses', value: counts['proses'], color: '#3b82f6' },
      { name: 'Selesai', value: counts['selesai'], color: '#10b981' },
      { name: 'Ditolak', value: counts['ditolak'], color: '#ef4444' },
      { name: 'Ditinjau', value: counts['ditinjau'], color: '#f59e0b' },
      { name: 'Acc Fakultas', value: counts['disetujui fakultas'], color: '#8b5cf6' },
    ].filter(d => d.value > 0)
  }, [viewableAspirations])

  const priorityBarData = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, NORMAL: 0, LOW: 0 }
    viewableAspirations.forEach(a => { const p = (a.Priority || 'NORMAL').toUpperCase(); if (counts[p] !== undefined) counts[p]++ })
    return [
      { name: 'Critical', value: counts.CRITICAL, fill: '#ef4444' },
      { name: 'High', value: counts.HIGH, fill: '#f59e0b' },
      { name: 'Normal', value: counts.NORMAL, fill: '#3b82f6' },
      { name: 'Low', value: counts.LOW, fill: '#10b981' },
    ]
  }, [viewableAspirations])

  const facultyTrendData = useMemo(() => {
    const map = {}
    viewableAspirations.forEach(a => {
      const fac = a.Fakultas?.Nama || a.Mahasiswa?.Fakultas?.Nama || 'Lainnya'
      const shortFac = fac.replace('Fakultas ', 'F. ').substring(0, 14)
      map[shortFac] = (map[shortFac] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5)
  }, [viewableAspirations])

  const extraStats = useMemo(() => {
    // 1. Who - Top Faculty
    const facultyCounts = {}
    viewableAspirations.forEach(a => {
      const fac = a.Fakultas?.Nama || a.Mahasiswa?.Fakultas?.Nama || 'Lainnya'
      if (fac !== 'Lainnya' && fac !== 'Institusional') {
        facultyCounts[fac] = (facultyCounts[fac] || 0) + 1
      }
    })
    let topFaculty = '—'
    let topFacultyCount = 0
    Object.entries(facultyCounts).forEach(([fac, count]) => {
      if (count > topFacultyCount) {
        topFaculty = fac
        topFacultyCount = count
      }
    })

    // 2. What - Top Category
    const categoryCounts = {}
    viewableAspirations.forEach(a => {
      const cat = a.Kategori || 'Umum'
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1
    })
    let topCategory = '—'
    let topCategoryCount = 0
    Object.entries(categoryCounts).forEach(([cat, count]) => {
      if (count > topCategoryCount) {
        topCategory = cat
        topCategoryCount = count
      }
    })

    // 3. Where/Why - Dominant Urgency
    const priorityCounts = {}
    viewableAspirations.forEach(a => {
      const prio = a.Priority || 'NORMAL'
      priorityCounts[prio] = (priorityCounts[prio] || 0) + 1
    })
    let topPriority = '—'
    let topPriorityCount = 0
    Object.entries(priorityCounts).forEach(([prio, count]) => {
      if (count > topPriorityCount) {
        topPriority = prio
        topPriorityCount = count
      }
    })
    const topPriorityPct = viewableAspirations.length > 0 ? Math.round((topPriorityCount / viewableAspirations.length) * 100) : 0

    // 4. When - Top Month/Day
    const monthCounts = {}
    viewableAspirations.forEach(a => {
      try {
        const date = new Date(a.CreatedAt)
        const monthYear = date.toLocaleString('id-ID', { month: 'long', year: 'numeric' })
        monthCounts[monthYear] = (monthCounts[monthYear] || 0) + 1
      } catch (e) { }
    })
    let topMonth = '—'
    let topMonthCount = 0
    Object.entries(monthCounts).forEach(([m, count]) => {
      if (count > topMonthCount) {
        topMonth = m
        topMonthCount = count
      }
    })

    return {
      topFaculty,
      topFacultyCount,
      topCategory,
      topCategoryCount,
      topPriority,
      topPriorityCount,
      topPriorityPct,
      topMonth,
      topMonthCount
    }
  }, [viewableAspirations])

  const CustomDonutLabel = ({ cx, cy, midAngle, outerRadius, percent, name }) => {
    if (percent < 0.05) return null
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 28
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
      <text x={x} y={y} fill="#64748b" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={10} fontWeight="700" fontFamily="monospace">
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    )
  }

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Global"
        highlightedTitle="Aspiration Hub"
        subtitle="Pusat monitoring dan resolusi aspirasi mahasiswa lintas fakultas. Pastikan setiap suara mahasiswa mendapatkan penanganan sesuai SLA."
        icon="forum"
        badges={[{ label: 'Incident Management', active: false }]}
        actions={
          <Button
            variant="outline"
            onClick={loadData}
            className="h-11 px-6 rounded-xl border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 hover:text-bku-primary gap-2.5 transition-all active:scale-95 shadow-none cursor-pointer font-headline"
          >
            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '16px' }}>show_chart</span>
            Live Refresh
          </Button>
        }
      />

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div className="space-y-4 md:space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PrimaryStatsCard
            title="Active Tickets"
            value={computedStats.active}
            icon={ChatIcon}
            colorTheme="info"
            badgeText="Menunggu respons"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">chat</span>}
          />
          <PrimaryStatsCard
            title="SLA Overdue"
            value={computedStats.overdue}
            icon={TimerIcon}
            colorTheme="error"
            badgeText="Melewati batas waktu"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">timer</span>}
          />
          <PrimaryStatsCard
            title="Resolved Today"
            value={computedStats.resolved}
            icon={CheckCircleIcon}
            colorTheme="success"
            badgeText="Selesai hari ini"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">check_circle</span>}
          />
          <PrimaryStatsCard
            title="Total Aspirasi"
            value={computedStats.total}
            icon={Database}
            colorTheme="primary"
            badgeText="Volume keseluruhan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">storage</span>}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PrimaryStatsCard
            title="Fakultas Teraktif"
            value={getShortFacultyName(extraStats.topFaculty)}
            icon={GroupIcon}
            colorTheme="primary"
            badgeText={`${extraStats.topFacultyCount} Laporan`}
          />
          <PrimaryStatsCard
            title="Kategori Dominan"
            value={extraStats.topCategory}
            icon={ForumIcon}
            colorTheme="success"
            badgeText={`${extraStats.topCategoryCount} Pengajuan`}
          />
          <PrimaryStatsCard
            title="Urgensi Terbesar"
            value={extraStats.topPriority}
            icon={UrgentIcon}
            colorTheme="warning"
            badgeText={`${extraStats.topPriorityPct}% dari Total`}
          />
          <PrimaryStatsCard
            title="Periode Puncak"
            value={extraStats.topMonth}
            icon={CalendarIcon}
            colorTheme="error"
            badgeText={`${extraStats.topMonthCount} Tiket Masuk`}
          />
        </div>
      </div>

      {/* ── Analytics Charts ─────────────────────────────────────── */}
      {!loading && aspirations.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut – Status Distribution */}
          <div className="glass-card rounded-3xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col bg-white/60 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.02] text-bku-primary group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>donut_large</span>
            </div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-10 h-10 bg-bku-primary/10 rounded-2xl flex items-center justify-center text-bku-primary shadow-inner">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>donut_large</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-bku-primary uppercase tracking-widest font-headline mb-0.5">Distribusi Status</p>
                <p className="text-xs font-bold text-slate-700 font-headline">Komposisi Aspirasi</p>
              </div>
            </div>
            <div className="flex-1 min-h-[180px] relative z-10 flex items-center justify-center mt-2">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusDonutData}
                    cx="50%" cy="50%"
                    innerRadius={55} outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    stroke="none"
                    cornerRadius={6}
                  >
                    {statusDonutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} style={{ filter: `drop-shadow(0px 4px 6px ${entry.color}40)` }} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: '800', backgroundColor: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}
                    formatter={(val, name) => [val + ' Laporan', name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-y-3 gap-x-2 mt-4 relative z-10 bg-white/50 p-4 rounded-2xl border border-slate-100">
              {statusDonutData.map((d, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: d.color }} />
                  <span className="text-[10px] font-bold text-slate-500 truncate">{d.name}</span>
                  <span className="text-[10px] font-black text-slate-800 ml-auto tabular-nums">{d.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bar – Priority Breakdown */}
          <div className="glass-card rounded-3xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col bg-white/60 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.02] text-amber-500 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>bar_chart</span>
            </div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 shadow-inner">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>bar_chart</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest font-headline mb-0.5">Level Prioritas</p>
                <p className="text-xs font-bold text-slate-700 font-headline">Urgensi Penanganan</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-4 mt-2 relative z-10">
              {priorityBarData.map((d, i) => {
                const max = Math.max(...priorityBarData.map(x => x.value), 1)
                const pct = Math.round((d.value / max) * 100)
                return (
                  <div key={i} className="flex flex-col gap-1.5 group/bar">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-500 uppercase font-headline">{d.name}</span>
                      {d.value > 0 && <span className="text-[10px] font-black text-slate-800 tabular-nums">{d.value}</span>}
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-1.5 group-hover/bar:brightness-110"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: d.fill,
                          minWidth: d.value > 0 ? '10px' : '0',
                          boxShadow: `0 0 10px ${d.fill}40`
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Bar – Faculty Distribution */}
          <div className="glass-card rounded-3xl border border-slate-200/60 p-6 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col bg-white/60 group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.02] text-emerald-500 group-hover:scale-110 transition-transform duration-500 pointer-events-none">
              <span className="material-symbols-outlined" style={{ fontSize: '120px' }}>school</span>
            </div>
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>school</span>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest font-headline mb-0.5">Top Fakultas</p>
                <p className="text-xs font-bold text-slate-700 font-headline">Volume Aspirasi</p>
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-center gap-4 mt-2 relative z-10">
              {facultyTrendData.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                  <span className="material-symbols-outlined text-4xl opacity-50">data_alert</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Belum ada data</p>
                </div>
              ) : facultyTrendData.map((d, i) => {
                const max = Math.max(...facultyTrendData.map(x => x.value), 1)
                const pct = Math.round((d.value / max) * 100)
                const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444']
                const color = colors[i % colors.length]
                return (
                  <div key={i} className="flex flex-col gap-1.5 group/bar">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black text-slate-500 uppercase truncate font-headline max-w-[80%]">{d.name}</span>
                      <span className="text-[10px] font-black text-slate-800 tabular-nums">{d.value}</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out flex items-center justify-end pr-1.5 group-hover/bar:brightness-110"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: color,
                          minWidth: '10px',
                          boxShadow: `0 0 10px ${color}40`
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Main Data Table ────────────────────────────────────── */}
      <div className="flex flex-col gap-4">

        <DataTable
          title="Laporan Aspirasi Mahasiswa"
          subtitle="Menampilkan daftar seluruh aspirasi mahasiswa."
          searchable={true}
          searchPlaceholder="Cari ID, nama, subjek..."
          searchWidth="sm:w-80"
          filters={[
            ...(activeFacultyId === 'all' ? [{
              key: 'FakultasNama',
              placeholder: 'Fakultas',
              options: faculties.map(f => ({ label: f.Nama || f.nama, value: f.Nama || f.nama }))
            }] : []),
            {
              key: 'StatusLower',
              placeholder: 'Status',
              options: [
                { label: 'On Process', value: 'proses' },
                { label: 'Resolved', value: 'selesai' },
                { label: 'Review', value: 'ditinjau' },
                { label: 'Rejected', value: 'ditolak' },
                { label: 'Disetujui Fakultas', value: 'disetujui fakultas' }
              ]
            }
          ]}
          onSearch={(data, search) => data.filter(asp => {
            const normalizedSearch = search.toLowerCase();
            const title = asp.Judul?.toString().toLowerCase() || ''
            const studentName = asp.Mahasiswa?.Nama?.toString().toLowerCase() || ''
            const facultyName = asp.Fakultas?.Nama?.toString().toLowerCase() || asp.Mahasiswa?.Fakultas?.Nama?.toString().toLowerCase() || ''
            const ticketId = asp.ID?.toString() || ''
            return title.includes(normalizedSearch) ||
              studentName.includes(normalizedSearch) ||
              facultyName.includes(normalizedSearch) ||
              ticketId.includes(search)
          })}
          data={baseFilteredAspirations}
          loading={loading}
          emptyMessage="No incident tickets found"
          actions={(asp) => (
            <div className="flex justify-end items-center gap-1.5">
              <Button
                onClick={() => { setSelected(asp); handleOpenAudit(asp); }}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-neutral-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors shadow-none"
                title="Lihat Detail"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
              </Button>
            </div>
          )}
          columns={[
            {
              key: 'ID',
              label: 'ID Tiket',
              className: 'w-[140px]',
              render: (_, asp) => (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[12px] font-bold text-blue-600 bg-blue-50/60 px-2.5 py-1 rounded-lg border border-blue-100/50 font-body w-fit">
                    #ASP-{asp.ID?.toString().padStart(4, '0') || '----'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold font-body flex items-center gap-1">
                    <span className={cn("w-1.5 h-1.5 rounded-full",
                      asp.Priority === 'CRITICAL' ? 'bg-rose-500' :
                        asp.Priority === 'HIGH' ? 'bg-amber-500' : 'bg-emerald-500')} />
                    {asp.Priority === 'CRITICAL' ? 'Critical' : asp.Priority === 'HIGH' ? 'High Priority' : 'Normal Priority'}
                  </span>
                </div>
              )
            },
            {
              key: 'Judul',
              label: 'Subjek Aspirasi',
              className: 'max-w-[280px]',
              render: (_, asp) => (
                <div className="flex flex-col max-w-[260px]">
                  <span className="text-[13px] font-bold text-slate-800 font-body truncate leading-tight">
                    {asp.Subjek || asp.Judul || 'Tanpa Subjek'}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 font-body truncate mt-1">
                    Oleh: <span className="text-slate-600">{asp.Mahasiswa?.Nama || 'Mahasiswa'}</span>
                  </span>
                </div>
              )
            },
            {
              key: 'Fakultas',
              label: 'Fakultas / Node',
              className: 'max-w-[200px]',
              render: (_, asp) => (
                <span className="text-[12px] font-semibold text-slate-700 font-body block truncate max-w-[180px]" title={asp.Fakultas?.Nama || asp.Mahasiswa?.Fakultas?.Nama || '—'}>
                  {asp.Fakultas?.Nama || asp.Mahasiswa?.Fakultas?.Nama || '—'}
                </span>
              )
            },
            {
              key: 'Status',
              label: 'Status Tiket',
              className: 'w-[140px]',
              render: (_, asp) => {
                const status = (asp.Status || 'Proses').toLowerCase();
                let style = 'bg-slate-50 text-slate-600 border-slate-200';
                let label = asp.Status || 'Proses';
                if (status === 'selesai') style = 'bg-emerald-50 text-emerald-600 border-emerald-100';
                else if (status.includes('ditolak')) style = 'bg-rose-50 text-rose-600 border-rose-100';
                else if (status.includes('proses')) style = 'bg-blue-50 text-blue-600 border-blue-100';
                else if (status.includes('ditinjau')) style = 'bg-amber-50 text-amber-600 border-amber-100';
                else if (status.includes('disetujui')) style = 'bg-indigo-50 text-indigo-600 border-indigo-100';

                return (
                  <div className="flex flex-col gap-1.5">
                    <Badge className={cn('px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wider shadow-none w-fit', style)}>
                      {label}
                    </Badge>
                    {asp.Deadline && (
                      <span className="text-[9px] font-semibold text-slate-400 font-body">
                        Deadline: {new Date(asp.Deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                );
              }
            }
          ]}
        />
      </div>

      <DialogModal
        open={!!selected}
        onOpenChange={(val) => { if (!val && !isSubmitting) setSelected(null) }}
        icon="admin_panel_settings"
        title={selected?.Judul || selected?.Subjek || "Detail Aspirasi"}
        subtitle={`Incident Audit · #ASP-${selected?.ID?.toString().padStart(4, '0')} · Oleh: ${selected?.Mahasiswa?.Nama || 'Mahasiswa'} · Status: ${selected?.Status || 'OPEN'}`}
        maxWidth="max-w-3xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setSelected(null)} disabled={isSubmitting}>
              Batal
            </ModalCancelButton>
            <ModalSaveButton onClick={withPermissionCheck('aspiration.update_status', handleSubmitResolution)} loading={isSubmitting} icon="task_alt">
              Simpan Resolusi
            </ModalSaveButton>
          </>
        }
      >
        {selected && (
          <div className="space-y-8">
            {/* 1. Identitas Pelapor */}
            <div className="p-5 rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm flex gap-5 items-center group hover:shadow-md transition-all">
              <StudentAvatar src={selected.Mahasiswa?.Foto} name={selected.Mahasiswa?.Nama} className="w-16 h-16 rounded-[1rem] shadow-md ring-4 ring-[var(--theme-border-muted)] shrink-0 group-hover:scale-105 transition-transform" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Identitas Pelapor</p>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[8px] font-black border border-[var(--theme-border)] text-[var(--theme-text-muted)] bg-[var(--theme-bg)] uppercase tracking-widest">
                    Verified
                  </span>
                </div>
                <p className="font-black text-[var(--theme-text)] text-sm truncate">{selected.Mahasiswa?.Nama}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[var(--theme-text-muted)]">
                  <span className="font-mono bg-[var(--theme-bg)] px-1.5 py-0.5 rounded border border-[var(--theme-border)] text-[10px] font-bold">{selected.Mahasiswa?.NIM}</span>
                  <span className="flex items-center gap-1 font-bold text-[10px] uppercase">
                    <span className="material-symbols-outlined text-[14px] text-[var(--theme-primary)]">domain</span>
                    {selected.Mahasiswa?.Fakultas?.Nama || 'Institusional'}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Substansi Aspirasi */}
            <div className="space-y-3">
              <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-[var(--theme-text-muted)] ml-1">
                <span className="material-symbols-outlined text-[var(--theme-primary)] text-[18px]">article</span>
                Substansi Aspirasi
              </h4>
              <div className="p-6 rounded-3xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-5 opacity-5 text-[var(--theme-primary)] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                  <span className="material-symbols-outlined text-[80px]">format_quote</span>
                </div>
                <p className="text-[14px] text-[var(--theme-text)] font-medium leading-relaxed font-body relative z-10 whitespace-pre-wrap">
                  {selected.Isi || 'Tidak ada deskripsi konten.'}
                </p>
              </div>
            </div>

            {/* 3. Visual Proof */}
            {selected.BuktiURL && (
              <div className="space-y-3">
                <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-[var(--theme-text-muted)] ml-1">
                  <span className="material-symbols-outlined text-[var(--theme-primary)] text-[18px]">photo_library</span>
                  Bukti Lampiran
                </h4>
                <div className="relative aspect-[21/9] rounded-3xl overflow-hidden border border-[var(--theme-border)] shadow-md group bg-[var(--theme-bg)] cursor-pointer">
                  <img
                    src={getCleanImageUrl(selected.BuktiURL)}
                    alt="Bukti Aspirasi"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                    <a
                      href={getCleanImageUrl(selected.BuktiURL)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-5 py-2.5 bg-[var(--theme-surface)] text-[var(--theme-text)] rounded-xl font-black text-[11px] uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-[var(--theme-primary)] hover:text-white transition-all active:scale-95"
                    >
                      <span className="material-symbols-outlined text-[16px]">open_in_new</span> Lihat Penuh
                    </a>
                  </div>
                </div>
              </div>
            )}

            <hr className="border-[var(--theme-border-muted)]" />

            {/* 4. Governance Panel */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-border-muted)] flex items-center justify-center text-[var(--theme-text-muted)]">
                  <span className="material-symbols-outlined">gavel</span>
                </div>
                <div>
                  <h3 className="text-sm font-black text-[var(--theme-text)]">Panel Resolusi</h3>
                  <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-widest">Tindakan Admin</p>
                </div>
              </div>

              {/* Status Selection */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 block">Ubah Status Tiket</Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { val: 'proses', label: 'Diproses', icon: 'sync', active: 'bg-blue-50 text-blue-700 border-blue-200 shadow-sm ring-1 ring-blue-500/20' },
                    { val: 'Selesai', label: 'Selesai', icon: 'check_circle', active: 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm ring-1 ring-emerald-500/20' },
                    { val: 'Ditinjau', label: 'Ditinjau', icon: 'plagiarism', active: 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm ring-1 ring-amber-500/20' },
                    { val: 'Ditolak', label: 'Ditolak', icon: 'cancel', active: 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm ring-1 ring-rose-500/20' },
                  ].map(s => (
                    <button
                      key={s.val}
                      type="button"
                      onClick={() => setForm({ ...form, status: s.val })}
                      className={cn(
                        'h-11 rounded-xl flex items-center justify-center gap-2 border font-black uppercase tracking-widest text-[9px] transition-all duration-300 cursor-pointer',
                        form.status?.toLowerCase() === s.val.toLowerCase()
                          ? s.active
                          : 'border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] hover:border-[var(--theme-border-muted)] hover:bg-[var(--theme-bg)]'
                      )}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }} >{s.icon}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Response */}
              <div className="space-y-3">
                <Label className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 block">Tanggapan Resmi</Label>
                <textarea
                  value={form.respon}
                  onChange={e => setForm({ ...form, respon: e.target.value })}
                  placeholder="Tuliskan respon resmi, klarifikasi, atau solusi..."
                  className="w-full min-h-[140px] rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-5 text-[13px] font-medium font-body text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none resize-none transition-all placeholder:text-[var(--theme-text-subtle)] leading-relaxed shadow-inner"
                />
              </div>
            </div>
          </div>
        )}
      </DialogModal>

    </PageContent>
  )
}

export default AspirationControl
