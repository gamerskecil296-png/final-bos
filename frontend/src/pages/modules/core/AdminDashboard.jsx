import React, { useState, useEffect, useRef, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Link, useNavigate } from 'react-router-dom'
import { adminService } from '@/services/api'
import api from '@/lib/axios'
import { toast } from 'react-hot-toast'
import useAuthStore from '@/store/useAuthStore'
import { PageContent, PageCard, PageCardHeader } from '@/components/ui/page'
import { DashboardHero, DashboardQuickActions } from '@/components/ui/dashboard'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'

// ─── Skeleton ───────────────────────────────────────────────
const Skeleton = ({ className }) => (
  <div className={cn('animate-pulse bg-[var(--theme-border-muted)]/30 rounded-2xl', className)} />
)

// ─── Mini Donut Chart (Pure SVG) ────────────────────────────
const MiniDonut = ({ data, size = 140, thickness = 22, className }) => {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="flex items-center justify-center" style={{ width: size, height: size }}><span className="text-xs text-[var(--theme-text-muted)] italic">Belum ada data</span></div>
  const center = size / 2
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  let accumulated = 0

  return (
    <svg width={size} height={size} className={className}>
      {data.map((item, i) => {
        const percent = item.value / total
        const offset = circumference * (1 - percent)
        const rotation = (accumulated / total) * 360 - 90
        accumulated += item.value
        return (
          <circle
            key={i}
            cx={center} cy={center} r={radius}
            fill="none"
            stroke={item.color}
            strokeWidth={thickness}
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(${rotation} ${center} ${center})`}
            className="transition-all duration-700"
            style={{ opacity: 0.9 }}
          />
        )
      })}
      <text x={center} y={center - 6} textAnchor="middle" className="fill-[var(--theme-text)] text-xl font-black">{total.toLocaleString('id-ID')}</text>
      <text x={center} y={center + 12} textAnchor="middle" className="fill-[var(--theme-text-muted)] text-[10px] font-bold">Total</text>
    </svg>
  )
}

// ─── Horizontal Bar ─────────────────────────────────────────
const HBar = ({ label, value, max, color, suffix = '' }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px] font-bold">
        <span className="text-[var(--theme-text-muted)] truncate max-w-[140px]">{label}</span>
        <span className="text-[var(--theme-text)] tabular-nums">{typeof value === 'number' ? value.toLocaleString('id-ID') : value}{suffix}</span>
      </div>
      <div className="w-full h-2 bg-[var(--theme-border-muted)]/40 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ─── Pipeline Step ──────────────────────────────────────────
const PipelineStep = ({ label, value, icon, color, isLast, active }) => (
  <div className="flex flex-col items-center flex-1 min-w-0 relative group">
    <div className={cn(
      "w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all duration-300 shadow-sm",
      "border-[var(--theme-border-muted)] bg-[var(--theme-surface)]"
    )} style={active ? { borderColor: color, backgroundColor: `${color}15` } : {}}>
      <span className="material-symbols-outlined text-[18px]" style={{ color }}>{icon}</span>
    </div>
    <span className="text-base font-black text-[var(--theme-text)] mt-2 tabular-nums">{value}</span>
    <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center mt-0.5 leading-tight">{label}</span>
    {!isLast && (
      <div className="absolute top-5 left-[calc(50%+24px)] w-[calc(100%-48px)] h-0.5 bg-[var(--theme-border-muted)]/60" style={{ zIndex: 0 }}>
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)]/30 to-transparent" />
      </div>
    )}
  </div>
)

// ─── Action Badge Style ─────────────────────────────────────
const getActionStyles = (action = '') => {
  const act = action.toUpperCase()
  if (act.includes('LOGIN')) return 'bg-emerald-50 text-emerald-600 border-emerald-100 rounded-xl'
  if (act.includes('DELETE') || act.includes('HAPUS')) return 'bg-rose-50 text-rose-600 border-rose-100 rounded-xl'
  if (act.includes('CREATE') || act.includes('BUAT')) return 'bg-blue-50 text-blue-600 border-blue-100 rounded-xl'
  if (act.includes('UPDATE') || act.includes('UBAH')) return 'bg-amber-50 text-amber-600 border-amber-100 rounded-xl'
  return 'bg-slate-50 text-slate-500 border-slate-100 rounded-xl'
}

// ─── Main Component ─────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const user = useAuthStore(state => state.user)
  const [academicSettings, setAcademicSettings] = useState(null)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const containerRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 600, height: 280 })

  // Filter state
  const [filterTahunMasuk, setFilterTahunMasuk] = useState('')

  // Chart hover state
  const [hoveredIndex, setHoveredIndex] = useState(null)

  useEffect(() => {
    if (!containerRef.current) return
    const ro = new ResizeObserver(entries => {
      for (let e of entries) setDimensions({ width: e.contentRect.width || 600, height: e.contentRect.height || 280 })
    })
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)
    try {
      const params = {}
      if (filterTahunMasuk && filterTahunMasuk !== 'all') params.tahun_masuk = filterTahunMasuk

      const [analyticsRes, settingsRes] = await Promise.all([
        adminService.getDashboardAnalytics(params),
        api.get('/super-admin/academic-settings').catch(() => ({ data: { status: 'error' } }))
      ])
      if (analyticsRes.status === 'success') setData(analyticsRes.data)
      if (settingsRes?.data?.status === 'success') setAcademicSettings(settingsRes.data.data)
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat data dashboard')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [filterTahunMasuk])

  useEffect(() => { fetchData() }, [fetchData])

  // ── Computed Values ─────────────────────────────────────────
  const d = data || {}

  const statCards = [
    { title: 'Total Mahasiswa', value: (d.total_mahasiswa || 0).toLocaleString('id-ID'), icon: 'school', colorTheme: 'primary', route: '/app/akademik/mahasiswa', subtitle: 'Data mahasiswa terdaftar' },
    { title: 'Total Dosen', value: (d.total_dosen || 0).toLocaleString('id-ID'), icon: 'supervisor_account', colorTheme: 'info', route: '/app/dashboard/lecturers', subtitle: 'Tenaga pengajar aktif' },
    { title: 'Rerata IPK', value: (d.avg_ipk && d.avg_ipk > 0) ? d.avg_ipk.toFixed(2) : '—', icon: 'insights', colorTheme: 'success', route: '/app/akademik/mahasiswa', subtitle: 'IPK rata-rata mahasiswa aktif' },
    { title: 'Aspirasi Aktif', value: d.aspirasi_aktif || 0, icon: 'chat', colorTheme: 'warning', route: '/app/dashboard/aspirations', subtitle: 'Menunggu respon' },
    { title: 'SLA Overdue', value: d.sla_overdue || 0, icon: 'running_with_errors', colorTheme: 'error', route: '/app/dashboard/aspirations', subtitle: 'Melebihi tenggat',
      badgeText: (d.sla_overdue || 0) > 0 ? 'Kritis' : null,
    },
  ]

  const quickLinks = [
    { label: 'Mahasiswa', icon: 'school', path: '/app/akademik/mahasiswa', iconBg: 'bg-[var(--theme-primary)]/10 border-[var(--theme-primary)]/20 text-[var(--theme-primary)]' },
    { label: 'Fakultas', icon: 'business', path: '/app/dashboard/faculties', iconBg: 'bg-[var(--theme-secondary)]/10 border-[var(--theme-secondary)]/20 text-[var(--theme-secondary)]' },
    { label: 'PMB', icon: 'group_add', path: '/app/dashboard/pmb', iconBg: 'bg-[var(--theme-info)]/10 border-[var(--theme-info)]/20 text-[var(--theme-info)]' },
    { label: 'Kencana', icon: 'workspace_premium', path: '/app/dashboard/kencana-univ', iconBg: 'bg-[var(--theme-warning)]/10 border-[var(--theme-warning)]/20 text-[var(--theme-warning)]' },
    { label: 'Proposal', icon: 'description', path: '/app/dashboard/proposals', iconBg: 'bg-[var(--theme-success)]/10 border-[var(--theme-success)]/20 text-[var(--theme-success)]' },
    { label: 'Aspirasi', icon: 'chat', path: '/app/dashboard/aspirations', iconBg: 'bg-[var(--theme-error)]/10 border-[var(--theme-error)]/20 text-[var(--theme-error)]' },
    { label: 'Beasiswa', icon: 'emoji_events', path: '/app/dashboard/scholarships', iconBg: 'bg-amber-500/10 border-amber-500/20 text-amber-500' },
  ]

  // Donut data for student status
  const statusColors = { 'Aktif': 'var(--theme-success)', 'Lulus': 'var(--theme-info)', 'Keluar': 'var(--theme-warning)', 'Cuti': '#f97316', 'Non-Aktif': 'var(--theme-error)', 'DO': 'var(--theme-error)' }
  const fallbackColors = ['#6366f1', '#f59e0b', '#ef4444', '#14b8a6', '#8b5cf6', '#ec4899', '#f97316']
  const studentStatusDonut = (d.student_status_dist || []).map((item, i) => ({
    label: item.name, value: item.count,
    color: statusColors[item.name] || fallbackColors[i % fallbackColors.length]
  }))

  // Chart data
  const chartData = d.monthly_trends || []

  // Faculty distribution
  const facultyDist = d.faculty_distribution || []
  const maxFaculty = facultyDist.length > 0 ? Math.max(...facultyDist.map(f => f.count)) : 1
  const facultyColors = ['var(--theme-primary)', 'var(--theme-info)', 'var(--theme-warning)', 'var(--theme-success)', 'var(--theme-error)', '#8b5cf6', '#ec4899']

  // Role distribution
  const roleDist = d.role_distribution || []
  const maxRole = roleDist.length > 0 ? Math.max(...roleDist.map(r => r.count)) : 1
  const roleColors = ['var(--theme-primary)', 'var(--theme-info)', 'var(--theme-success)', 'var(--theme-warning)', 'var(--theme-error)', '#8b5cf6', '#ec4899', '#14b8a6']

  // City distribution (demografi)
  const cityDist = d.city_distribution || []
  const maxCity = cityDist.length > 0 ? Math.max(...cityDist.map(c => c.count)) : 1
  const cityColors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6']

  // Enrollment trend
  const enrollmentTrend = d.enrollment_trend || []

  // Top sekolah
  const topSekolah = d.top_sekolah || []
  const maxSekolah = topSekolah.length > 0 ? Math.max(...topSekolah.map(s => s.count)) : 1

  // Aspirasi by category
  const aspirasiByCategory = d.aspirasi_by_category || []
  const totalAspirasiCat = aspirasiByCategory.reduce((s, a) => s + a.count, 0) || 1

  // Proposal by faculty
  const proposalByFaculty = d.proposal_by_faculty || []
  const maxProposalFac = proposalByFaculty.length > 0 ? Math.max(...proposalByFaculty.map(p => p.count)) : 1

  // Recent Logs
  const recentLogs = d.recent_logs || []

  // Tahun masuk list for filter — backend returns [{tahun_masuk: 2024}, ...]
  const tahunMasukList = (d.tahun_masuk_list || []).map(item => typeof item === 'object' ? item.tahun_masuk : item).filter(Boolean)

  // ── SVG Chart Helpers ─────────────────────────────────────
  const svgW = dimensions.width
  const svgH = dimensions.height
  const chartKeys = ['aspirasi', 'proposal', 'login']
  const chartColors = ['var(--theme-primary)', 'var(--theme-warning)', 'var(--theme-info)']
  const chartLabels = ['Aspirasi', 'Proposal', 'Login']
  const allMax = chartData.length > 0 ? Math.max(...chartData.flatMap(item => chartKeys.map(k => item[k] || 0)), 10) : 10

  const getCurvePath = (data, key, w, h, max) => {
    const pts = data.map((item, i) => ({
      x: 40 + (i * (w - 60)) / Math.max(data.length - 1, 1),
      y: (h - 30) - ((item[key] || 0) / max) * (h - 50)
    }))
    if (pts.length === 0) return ''
    let p = `M ${pts[0].x},${pts[0].y}`
    for (let i = 0; i < pts.length - 1; i++) {
      const cpx = pts[i].x + (pts[i + 1].x - pts[i].x) / 2
      p += ` C ${cpx},${pts[i].y} ${cpx},${pts[i + 1].y} ${pts[i + 1].x},${pts[i + 1].y}`
    }
    return p
  }

  const getAreaPath = (data, key, w, h, max) => {
    const p = getCurvePath(data, key, w, h, max)
    if (!p) return ''
    const pts = data.map((item, i) => ({
      x: 40 + (i * (w - 60)) / Math.max(data.length - 1, 1),
    }))
    return p + ` L ${pts[pts.length - 1].x},${h - 30} L ${pts[0].x},${h - 30} Z`
  }

  // ── Loading State ──────────────────────────────────────────
  if (loading) {
    return (
      <PageContent>
        <div className="space-y-6 animate-pulse">
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </PageContent>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <PageContent>
      {/* ═══ HERO ═══ */}
      <DashboardHero
        title={`${greeting},`}
        highlightedTitle={`${user?.Nama?.split(' ')[0] || 'Admin'}!`}
        subtitle="Pusat kendali eksekutif Universitas Bhakti Kencana. Pantau seluruh operasional akademik, kemahasiswaan, dan administrasi dalam satu pandangan."
        icon="admin_panel_settings"
        badges={[
          { label: 'Super Admin Portal', active: false },
          { label: academicSettings ? `${academicSettings.TahunAkademik} - ${academicSettings.Semester}` : 'Loading...', active: true },
          filterTahunMasuk && filterTahunMasuk !== 'all' ? { label: `Angkatan ${filterTahunMasuk}`, active: true } : null,
        ].filter(Boolean)}
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] pointer-events-none" style={{ color: 'var(--theme-primary)' }}>calendar_today</span>
              <select
                value={filterTahunMasuk}
                onChange={e => setFilterTahunMasuk(e.target.value)}
                className="h-9 pl-8 pr-7 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-bold shadow-sm cursor-pointer focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] outline-none transition-all appearance-none"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M3 5l3 3 3-3'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center' }}
              >
                <option value="">Semua Angkatan</option>
                {tahunMasukList.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            {filterTahunMasuk && filterTahunMasuk !== 'all' && (
              <button onClick={() => setFilterTahunMasuk('')} className="h-9 w-9 rounded-lg border border-rose-200 bg-rose-50 text-rose-500 flex items-center justify-center hover:bg-rose-100 transition-all cursor-pointer" title="Reset Filter">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            )}
            <button onClick={() => navigate('/app/dashboard/docs')} className="px-4 py-2 rounded-lg font-bold text-xs transition-all border border-slate-200 text-slate-600 hover:bg-slate-50 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer bg-white">
              <span className="material-symbols-outlined text-[16px]">menu_book</span> Dokumentasi
            </button>
            <button onClick={() => fetchData(true)} disabled={refreshing} className="px-4 py-2 rounded-lg font-bold text-xs transition-all text-white hover:opacity-90 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer" style={{ backgroundColor: 'var(--theme-primary)' }}>
              <span className={`material-symbols-outlined text-[16px] ${refreshing ? 'animate-spin' : ''}`}>sync</span>
              {refreshing ? 'Sinkronisasi...' : 'Sync Data'}
            </button>
          </div>
        }
      />

      {/* ═══ PRIMARY METRICS (WHAT) ═══ */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
        {statCards.map((card, i) => (
          <PrimaryStatsCard key={i} {...card} onClick={() => navigate(card.route)} />
        ))}
      </div>

      {/* ═══ QUICK ACTIONS ═══ */}
      <DashboardQuickActions
        title="Akses Cepat" description="Pintasan ke modul utama"
        actions={quickLinks}
      />

      {/* ═══ SECONDARY METRICS ═══ */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Aktif Hari Ini', value: d.active_users_today || 0, icon: 'person', color: 'var(--theme-success)' },
          { label: 'Selesai Hari Ini', value: d.resolved_today || 0, icon: 'check_circle', color: 'var(--theme-success)' },
          { label: 'Organisasi', value: d.total_ormawa || 0, icon: 'groups', color: 'var(--theme-info)' },
          { label: 'Peserta Kencana', value: d.total_peserta_kencana || 0, icon: 'workspace_premium', color: 'var(--theme-warning)' },
          { label: 'Pendaftar PMB', value: (d.total_pmb || 0).toLocaleString('id-ID'), icon: 'group_add', color: 'var(--theme-primary)' },
          { label: 'Mhs. Berisiko', value: d.at_risk_students || 0, icon: 'warning', color: 'var(--theme-error)' },
        ].map((item, i) => (
          <div key={i} className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 flex items-center gap-3 hover:shadow-md hover:border-[var(--theme-primary-light)] transition-all duration-300 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${item.color}15` }}>
              <span className="material-symbols-outlined text-[20px] transition-transform group-hover:scale-110" style={{ color: item.color }}>{item.icon}</span>
            </div>
            <div className="min-w-0">
              <p className="text-lg font-black text-[var(--theme-text)] tabular-nums leading-none">{item.value}</p>
              <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mt-1 truncate">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ═══ ROW: TREN AKTIVITAS + STATUS DONUT ═══ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Tren Aktivitas Bulanan (WHEN) */}
        <PageCard className="lg:col-span-2 flex flex-col">
          <PageCardHeader title="Tren Aktivitas Bulanan" description="Volume aspirasi, proposal & login — 6 bulan terakhir" icon="trending_up"
            action={
              <div className="flex items-center gap-4 text-[10px] font-bold text-[var(--theme-text-muted)]">
                {chartLabels.map((label, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: chartColors[i] }} />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            }
          />
          <div className="min-h-[280px] flex-1 w-full relative pt-6 select-none">
            <div ref={containerRef} className="w-full h-full relative">
              {hoveredIndex !== null && chartData[hoveredIndex] && (
                <div style={{ left: `${40 + (hoveredIndex * (svgW - 60)) / Math.max(chartData.length - 1, 1)}px`, transform: 'translate(-50%, -100%)' }}
                  className="absolute top-2 pointer-events-none bg-slate-900 text-white text-xs font-medium py-3 px-4 rounded-2xl shadow-xl flex flex-col gap-1.5 items-center z-30 border border-white/10">
                  <span className="text-white/60 font-medium text-[10px]">{chartData[hoveredIndex].month}</span>
                  {chartKeys.map((key, ki) => (
                    <div key={ki} className="flex items-center gap-2 leading-none">
                      <span className="w-2 h-2 rounded-full shrink-0 border border-white" style={{ backgroundColor: chartColors[ki] }} />
                      <span>{chartLabels[ki]}: {chartData[hoveredIndex][key] || 0}</span>
                    </div>
                  ))}
                </div>
              )}
              <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible">
                <defs>
                  {chartKeys.map((key, ki) => (
                    <linearGradient key={ki} id={`area-${key}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={chartColors[ki]} stopOpacity="0.18" />
                      <stop offset="100%" stopColor={chartColors[ki]} stopOpacity="0.00" />
                    </linearGradient>
                  ))}
                </defs>
                {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                  const y = (svgH - 30) - pct * (svgH - 50)
                  return (
                    <g key={pct}>
                      <line x1="40" y1={y} x2={svgW - 20} y2={y} stroke="var(--theme-border)" strokeOpacity="0.3" strokeWidth="1" />
                      <text x="10" y={y + 3} fill="var(--theme-text-muted)" fontSize="9">{Math.round(pct * allMax)}</text>
                    </g>
                  )
                })}
                {chartKeys.map((key, ki) => (
                  <g key={ki}>
                    <path d={getAreaPath(chartData, key, svgW, svgH, allMax)} fill={`url(#area-${key})`} className="transition-all duration-500" />
                    <path d={getCurvePath(chartData, key, svgW, svgH, allMax)} fill="none" stroke={chartColors[ki]} strokeWidth="3" strokeLinecap="round" className="transition-all duration-500" />
                  </g>
                ))}
                {hoveredIndex !== null && (() => {
                  const x = 40 + (hoveredIndex * (svgW - 60)) / Math.max(chartData.length - 1, 1)
                  return (
                    <g>
                      <line x1={x} y1={20} x2={x} y2={svgH - 30} stroke="var(--theme-text-muted)" strokeDasharray="4 4" strokeWidth="1.5" />
                      {chartKeys.map((key, ki) => {
                        const yv = (svgH - 30) - ((chartData[hoveredIndex]?.[key] || 0) / allMax) * (svgH - 50)
                        return <circle key={ki} cx={x} cy={yv} r="5" fill={chartColors[ki]} stroke="white" strokeWidth="2.5" />
                      })}
                    </g>
                  )
                })()}
                {chartData.map((item, i) => {
                  const x = 40 + (i * (svgW - 60)) / Math.max(chartData.length - 1, 1)
                  return <text key={i} x={x} y={svgH - 8} textAnchor="middle" fontSize="9" fontWeight="bold" className={cn("select-none transition-all", hoveredIndex === i ? "fill-[var(--theme-primary)]" : "fill-slate-400")}>{item.month}</text>
                })}
                {chartData.map((_, i) => {
                  const x = 40 + (i * (svgW - 60)) / Math.max(chartData.length - 1, 1)
                  const colW = (svgW - 60) / Math.max(chartData.length - 1, 1)
                  return <rect key={i} x={x - colW / 2} y={20} width={colW} height={svgH - 50} fill="transparent" className="cursor-crosshair" onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)} />
                })}
              </svg>
            </div>
          </div>
        </PageCard>

        {/* Status Akademik Donut (WHY — risk analysis) */}
        <PageCard className="flex flex-col">
          <PageCardHeader title="Status Akademik" description="Distribusi status mahasiswa terkini" icon="donut_large" />
          <div className="flex-1 flex flex-col items-center justify-center py-4 gap-4">
            <MiniDonut data={studentStatusDonut} size={160} thickness={24} />
            <div className="w-full space-y-2 px-2">
              {studentStatusDonut.slice(0, 6).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="font-bold text-[var(--theme-text-muted)] truncate max-w-[120px]">{item.label}</span>
                  </div>
                  <span className="font-black text-[var(--theme-text)] tabular-nums">{item.value.toLocaleString('id-ID')}</span>
                </div>
              ))}
            </div>
          </div>
        </PageCard>
      </div>

      {/* ═══ ROW: DISTRIBUSI FAKULTAS + PIPELINE PROPOSAL + ROLE ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Distribusi Fakultas (WHERE) */}
        <PageCard>
          <PageCardHeader title="Distribusi per Fakultas" description="Persebaran mahasiswa di setiap fakultas" icon="business" />
          <div className="space-y-3 mt-2">
            {facultyDist.slice(0, 6).map((item, i) => (
              <HBar key={i} label={item.name} value={item.count} max={maxFaculty} color={facultyColors[i % facultyColors.length]} />
            ))}
            {facultyDist.length === 0 && <p className="text-xs text-[var(--theme-text-muted)] italic text-center py-8">Belum ada data</p>}
          </div>
        </PageCard>

        {/* Pipeline Proposal (HOW) */}
        <PageCard>
          <PageCardHeader title="Pipeline Proposal" description="Alur persetujuan proposal kegiatan" icon="account_tree" />
          <div className="flex items-start justify-between gap-2 mt-4 px-2">
            <PipelineStep label="Diajukan" value={d.proposal_diajukan || 0} icon="send" color="var(--theme-info)" active={(d.proposal_diajukan || 0) > 0} />
            <PipelineStep label="Fakultas" value={d.proposal_disetujui_fak || 0} icon="domain" color="var(--theme-warning)" active={(d.proposal_disetujui_fak || 0) > 0} />
            <PipelineStep label="Universitas" value={d.proposal_disetujui_univ || 0} icon="verified" color="var(--theme-success)" active={(d.proposal_disetujui_univ || 0) > 0} />
            <PipelineStep label="Revisi" value={d.proposal_revisi || 0} icon="edit_note" color="#f59e0b" active={(d.proposal_revisi || 0) > 0} />
            <PipelineStep label="Ditolak" value={d.proposal_ditolak || 0} icon="cancel" color="var(--theme-error)" active={(d.proposal_ditolak || 0) > 0} isLast />
          </div>
          <div className="mt-6 pt-4 border-t border-[var(--theme-border-muted)]">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-[var(--theme-success)]/5 border border-[var(--theme-success)]/15">
                <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Rate Persetujuan</p>
                <p className="text-lg font-black text-[var(--theme-success)] mt-1">
                  {(() => { const t = (d.proposal_diajukan||0)+(d.proposal_disetujui_fak||0)+(d.proposal_disetujui_univ||0)+(d.proposal_ditolak||0)+(d.proposal_revisi||0); return t > 0 ? Math.round(((d.proposal_disetujui_univ||0)/t)*100) : 0 })()}%
                </p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--theme-warning)]/5 border border-[var(--theme-warning)]/15">
                <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Antrean</p>
                <p className="text-lg font-black text-[var(--theme-warning)] mt-1">{(d.proposal_diajukan||0)+(d.proposal_disetujui_fak||0)}</p>
              </div>
            </div>
          </div>
        </PageCard>

        {/* Ekosistem Pengguna (WHO) */}
        <PageCard>
          <PageCardHeader title="Ekosistem Pengguna" description="Distribusi akun per peran sistem" icon="shield_person" />
          <div className="space-y-3 mt-2">
            {roleDist.slice(0, 8).map((item, i) => (
              <HBar key={i} label={item.role} value={item.count} max={maxRole} color={roleColors[i % roleColors.length]} />
            ))}
            {roleDist.length === 0 && <p className="text-xs text-[var(--theme-text-muted)] italic text-center py-8">Belum ada data</p>}
          </div>
          <div className="mt-4 pt-4 border-t border-[var(--theme-border-muted)] flex items-center justify-between">
            <div className="text-[10px] text-[var(--theme-text-muted)] font-bold">Total: <span className="text-[var(--theme-text)] font-black">{(d.total_users||0).toLocaleString('id-ID')}</span></div>
            <div className="text-[10px] text-[var(--theme-text-muted)] font-bold">Aktif bulan ini: <span className="text-[var(--theme-success)] font-black">{d.active_users_month||0}</span></div>
          </div>
        </PageCard>
      </div>

      {/* ═══ ROW: DEMOGRAFI KOTA (WHERE - ENHANCED) ═══ */}
      <PageCard className="mb-6">
        <PageCardHeader title="Top 10 Asal Kabupaten/Kota" description={`Dari total ${cityDist.length} kota/kabupaten — ${cityDist.reduce((s, c) => s + c.count, 0).toLocaleString('id-ID')} mahasiswa terdata`} icon="location_on"
          action={
            <Link to="/app/akademik/mahasiswa/analytics/regions" className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 transition-colors">
              Detail <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
            </Link>
          }
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 mt-3">
          {cityDist.slice(0, 10).map((item, i) => (
            <HBar key={i} label={item.name} value={item.count} max={maxCity} color={cityColors[i % cityColors.length]} />
          ))}
        </div>
        {cityDist.length === 0 && <p className="text-xs text-[var(--theme-text-muted)] italic text-center py-8">Belum ada data lokasi</p>}
        {cityDist.length > 10 && (
          <div className="mt-4 pt-3 border-t border-[var(--theme-border-muted)]">
            <Link to="/app/akademik/mahasiswa/analytics/regions" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:shadow-sm border border-[var(--theme-primary)]/20 bg-[var(--theme-primary)]/5 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10">
              <span className="material-symbols-outlined text-[16px]">map</span>
              Lihat Seluruh {cityDist.length} Kota/Kabupaten
            </Link>
          </div>
        )}
      </PageCard>

      {/* ═══ ROW: ENROLLMENT TREND + TOP SEKOLAH + ASPIRASI KATEGORI ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Enrollment Trend (WHEN — enrollment timeline) */}
        <PageCard>
          <PageCardHeader title="Tren Enrollment" description="Jumlah mahasiswa per tahun masuk" icon="stacked_line_chart" />
          <div className="space-y-3 mt-3 max-h-[400px] overflow-y-auto pr-1">
            {(() => {
              const maxEnroll = enrollmentTrend.length > 0 ? Math.max(...enrollmentTrend.map(e => e.total || 0)) : 1
              const statusDefs = [
                { key: 'aktif', label: 'Aktif', color: 'var(--theme-success)' },
                { key: 'lulus', label: 'Lulus', color: 'var(--theme-info)' },
                { key: 'keluar', label: 'Keluar', color: 'var(--theme-warning)' },
                { key: 'cuti', label: 'Cuti', color: '#f97316' },
                { key: 'non_aktif', label: 'Non-Aktif', color: 'var(--theme-error)' },
                { key: 'lainnya', label: 'Belum Sinkron', color: '#94a3b8' },
              ]
              return enrollmentTrend.map((item, i) => {
                const total = item.total || 1
                return (
                  <div key={i} className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-background)]/60 backdrop-blur-sm p-3 hover:border-[var(--theme-primary)]/30 hover:shadow-sm transition-all duration-300">
                    {/* Header: year + total */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0" style={{ backgroundColor: 'var(--theme-primary)', opacity: 0.85 }}>{String(item.year).slice(-2)}</span>
                        <span className="text-xs font-black text-[var(--theme-text)]">{item.year}</span>
                      </div>
                      <span className="text-sm font-black text-[var(--theme-text)] tabular-nums">{(item.total||0).toLocaleString('id-ID')}</span>
                    </div>
                    {/* Stacked segmented bar */}
                    <div className="w-full h-2.5 rounded-full overflow-hidden flex bg-[var(--theme-border-muted)]/30">
                      {statusDefs.map((s) => {
                        const val = item[s.key] || 0
                        if (val === 0) return null
                        const pct = (val / total) * (maxEnroll > 0 ? ((item.total||0) / maxEnroll) * 100 : 0)
                        return <div key={s.key} className="h-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: s.color, opacity: 0.8 }} />
                      })}
                    </div>
                    {/* Status pills */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {statusDefs.map((s) => {
                        const val = item[s.key] || 0
                        if (val === 0) return null
                        return (
                          <span key={s.key} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-bold border" style={{ color: s.color, backgroundColor: `color-mix(in srgb, ${s.color} 8%, transparent)`, borderColor: `color-mix(in srgb, ${s.color} 15%, transparent)` }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: s.color, opacity: 0.7 }} />
                            {s.label} {val.toLocaleString('id-ID')}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            })()}
            {enrollmentTrend.length === 0 && <p className="text-xs text-[var(--theme-text-muted)] italic text-center py-8">Belum ada data</p>}
          </div>
        </PageCard>

        {/* Top 10 Asal Sekolah (WHERE — origin) */}
        <PageCard>
          <PageCardHeader title="Top 10 Asal Sekolah" description="Sekolah pengirim mahasiswa terbanyak" icon="school"
            action={
              <Link to="/app/akademik/mahasiswa/analytics/schools" className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1 transition-colors">
                Detail <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            }
          />
          <div className="space-y-3 mt-2">
            {topSekolah.slice(0, 10).map((item, i) => (
              <HBar key={i} label={item.name} value={item.count} max={maxSekolah} color={facultyColors[i % facultyColors.length]} />
            ))}
            {topSekolah.length === 0 && <p className="text-xs text-[var(--theme-text-muted)] italic text-center py-8">Belum ada data</p>}
          </div>
          {topSekolah.length > 0 && (
            <div className="mt-4 pt-3 border-t border-[var(--theme-border-muted)]">
              <Link to="/app/akademik/mahasiswa/analytics/schools" className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-bold transition-all hover:shadow-sm border border-[var(--theme-primary)]/20 bg-[var(--theme-primary)]/5 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10">
                <span className="material-symbols-outlined text-[16px]">analytics</span>
                Lihat Analisis Asal Sekolah Lengkap
              </Link>
            </div>
          )}
        </PageCard>

        {/* Aspirasi by Category (WHY — what concerns students) */}
        <PageCard>
          <PageCardHeader title="Aspirasi per Kategori" description="Topik yang paling banyak dibahas mahasiswa" icon="forum" />
          <div className="space-y-3 mt-2">
            {aspirasiByCategory.map((item, i) => {
              const pct = Math.round((item.count / totalAspirasiCat) * 100)
              return (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                      <span className="text-[var(--theme-text-muted)] truncate max-w-[130px]">{item.name || 'Lainnya'}</span>
                      <span className="text-[var(--theme-text)] tabular-nums">{item.count}</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--theme-border-muted)]/40 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: fallbackColors[i % fallbackColors.length] }} />
                    </div>
                  </div>
                  <span className="text-[10px] font-black tabular-nums shrink-0" style={{ color: fallbackColors[i % fallbackColors.length] }}>{pct}%</span>
                </div>
              )
            })}
            {aspirasiByCategory.length === 0 && <p className="text-xs text-[var(--theme-text-muted)] italic text-center py-8">Belum ada data</p>}
          </div>
        </PageCard>
      </div>

      {/* ═══ ROW: BEASISWA + LAYANAN KESEJAHTERAAN + DEMOGRAFI/KONTEN ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Beasiswa Pipeline */}
        <PageCard>
          <PageCardHeader title="Pipeline Beasiswa" description="Status pendaftaran & seleksi beasiswa" icon="emoji_events" />
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Program Aktif', value: d.beasiswa_aktif||0, icon: 'auto_awesome', color: 'var(--theme-primary)' },
                { label: 'Menunggu Seleksi', value: d.beasiswa_applicants||0, icon: 'hourglass_top', color: 'var(--theme-warning)' },
                { label: 'Diterima', value: d.beasiswa_approved||0, icon: 'check_circle', color: 'var(--theme-success)' },
                { label: 'Ditolak', value: d.beasiswa_rejected||0, icon: 'cancel', color: 'var(--theme-error)' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-background)]">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="material-symbols-outlined text-[14px]" style={{ color: item.color }}>{item.icon}</span>
                    <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">{item.label}</span>
                  </div>
                  <p className="text-lg font-black tabular-nums" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </PageCard>

        {/* Layanan Kesejahteraan */}
        <PageCard>
          <PageCardHeader title="Layanan Kesejahteraan" description="Booking psikolog & tenaga kesehatan" icon="health_and_safety" />
          <div className="space-y-4 mt-4">
            <div className="p-4 rounded-xl border border-[var(--theme-border-muted)] bg-gradient-to-r from-indigo-50/50 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-indigo-500 text-[18px]">psychology</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">Konseling Psikolog</span>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-600">{d.booking_psikolog_pending||0} menunggu</span>
              </div>
              <p className="text-2xl font-black text-indigo-600 tabular-nums">{d.booking_psikolog_total||0}</p>
              <p className="text-[10px] text-[var(--theme-text-muted)] font-medium mt-1">Total sesi terdaftar</p>
            </div>
            <div className="p-4 rounded-xl border border-[var(--theme-border-muted)] bg-gradient-to-r from-teal-50/50 to-transparent">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-teal-500 text-[18px]">local_hospital</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">Kesehatan Umum</span>
                </div>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-600">{d.booking_kesehatan_pending||0} menunggu</span>
              </div>
              <p className="text-2xl font-black text-teal-600 tabular-nums">{d.booking_kesehatan_total||0}</p>
              <p className="text-[10px] text-[var(--theme-text-muted)] font-medium mt-1">Total sesi terdaftar</p>
            </div>
          </div>
        </PageCard>

        {/* Demografi Gender + Konten */}
        <PageCard>
          <PageCardHeader title="Demografi & Konten" description="Gender, berita & anggota ormawa" icon="pie_chart" />
          <div className="space-y-4 mt-4">
            {/* Gender */}
            <div>
              <div className="flex items-center justify-between text-[11px] font-bold mb-2">
                <span className="text-[var(--theme-text-muted)]">Rasio Gender</span>
                <span className="text-[var(--theme-text)] tabular-nums">{(d.gender_male||0).toLocaleString('id-ID')} L / {(d.gender_female||0).toLocaleString('id-ID')} P</span>
              </div>
              <div className="w-full h-4 rounded-full overflow-hidden flex bg-[var(--theme-border-muted)]/30">
                {(() => {
                  const total = (d.gender_male||0) + (d.gender_female||0)
                  const malePct = total > 0 ? ((d.gender_male||0) / total) * 100 : 50
                  return (<>
                    <div className="h-full bg-blue-500 transition-all duration-700 rounded-l-full" style={{ width: `${malePct}%` }} />
                    <div className="h-full bg-pink-400 transition-all duration-700 rounded-r-full" style={{ width: `${100 - malePct}%` }} />
                  </>)
                })()}
              </div>
              <div className="flex items-center justify-between text-[9px] font-bold text-[var(--theme-text-muted)] mt-1.5">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Laki-laki</div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-pink-400" /> Perempuan</div>
              </div>
            </div>

            {/* Content Stats */}
            <div className="pt-4 border-t border-[var(--theme-border-muted)]">
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Berita', value: d.total_berita||0, icon: 'newspaper', color: 'var(--theme-primary)' },
                  { label: 'Published', value: d.berita_published||0, icon: 'public', color: 'var(--theme-success)' },
                  { label: 'Draft', value: d.berita_draft||0, icon: 'edit_note', color: 'var(--theme-warning)' },
                ].map((item, i) => (
                  <div key={i} className="text-center p-3 rounded-xl bg-[var(--theme-background)] border border-[var(--theme-border-muted)]">
                    <span className="material-symbols-outlined text-[18px]" style={{ color: item.color }}>{item.icon}</span>
                    <p className="text-base font-black tabular-nums mt-1" style={{ color: item.color }}>{item.value}</p>
                    <p className="text-[8px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Ormawa + Proposal by Faculty */}
            <div className="pt-4 border-t border-[var(--theme-border-muted)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-purple-500 text-[18px]">diversity_3</span>
                  <span className="text-xs font-bold text-[var(--theme-text)]">Total Anggota Ormawa</span>
                </div>
                <span className="text-base font-black text-purple-600 tabular-nums">{(d.total_anggota_ormawa||0).toLocaleString('id-ID')}</span>
              </div>
            </div>
          </div>
        </PageCard>
      </div>

      {/* ═══ ROW: PROPOSAL PER FAKULTAS (HOW — cross-unit performance) ═══ */}
      {proposalByFaculty.length > 0 && (
        <PageCard className="mb-6">
          <PageCardHeader title="Proposal per Fakultas" description="Distribusi pengajuan proposal kegiatan per fakultas" icon="leaderboard" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2.5 mt-2">
            {proposalByFaculty.map((item, i) => (
              <HBar key={i} label={item.name} value={item.count} max={maxProposalFac} color={facultyColors[i % facultyColors.length]} />
            ))}
          </div>
        </PageCard>
      )}

      {/* ═══ AUDIT LOG TIMELINE ═══ */}
      <PageCard>
        <PageCardHeader title="Aktivitas Terbaru" description="Catatan audit sistem terkini" icon="history"
          action={<Link to="/app/dashboard/audit" className="text-xs font-bold text-[var(--theme-primary)] hover:underline flex items-center gap-1">Lihat Semua<span className="material-symbols-outlined text-[14px]">arrow_forward</span></Link>}
        />
        <div className="divide-y divide-[var(--theme-border-muted)]/50">
          {recentLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--theme-text-muted)] italic">Belum ada aktivitas</div>
          ) : (
            recentLogs.map((log, i) => (
              <div key={i} className="flex items-center gap-4 py-3.5 px-1 hover:bg-slate-50/30 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center shrink-0 text-[10px] font-bold border border-[var(--theme-primary)]/10">
                  {(log.user_email || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn("px-2 py-0.5 border text-[9px] font-bold tracking-wide uppercase", getActionStyles(log.aktivitas))}>
                      {(log.aktivitas || 'INFO').replace('_', ' ')}
                    </span>
                    <span className="text-[11px] font-semibold text-[var(--theme-text-muted)] truncate">{log.user_email}</span>
                  </div>
                  <p className="text-[11px] text-[var(--theme-text-muted)]/80 font-medium mt-0.5 truncate">{log.deskripsi}</p>
                </div>
                <span className="text-[10px] text-[var(--theme-text-muted)] font-mono whitespace-nowrap shrink-0">
                  {log.created_at ? new Date(log.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
            ))
          )}
        </div>
      </PageCard>
    </PageContent>
  )
}
