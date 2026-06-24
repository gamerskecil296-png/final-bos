"use client"

import React, { useState, useEffect, useMemo } from "react"
import api from "@/lib/axios"
import { Avatar, AvatarFallback } from "@/components/ui/Avatar"
import { toast, Toaster } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { SelectField, SelectOption } from "@/components/ui/SelectField"
import { Button } from "@/components/ui/Button"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { DialogModal, ModalCancelButton } from "@/components/ui/DialogModal"
import { Card, CardContent } from '@/components/ui/Card'
import { DataTable } from '@/components/ui/DataTable'
import { PrimaryStatsCard, SecondaryStatsCard } from '@/components/ui/StatsCard'

import { API_BASE_URL, adminService } from "@/services/api"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts"

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>layers</span>;
const Mail = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>mail</span>;
const Phone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>phone</span>;
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const Briefcase = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>work</span>;
const UserCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>how_to_reg</span>;
const Building2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>business</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;

const getFullUrl = (path) => {
  if (!path || path.trim() === "" || path === "/" || path.endsWith("/profiles/") || path.endsWith("/app/psikologi/dashboards/")) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path}`;
}

function PsikologAvatar({ src, name, className = "w-10 h-10 rounded-full" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const hasNoImage = !src || src.trim() === "" || src.endsWith("/profiles/") || src.endsWith("/app/psikologi/dashboards/") || src.endsWith("localhost:8000") || src.endsWith("localhost:8000/");

  return (
    <div className={cn("relative bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-inner overflow-hidden", className)}>
      {(!loaded || error || hasNoImage) && (
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute" style={{ fontSize: className.includes('w-[60px]') ? '30px' : '22px' }}>
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


const SPESIALISASI_STYLES = {
  'Klinis': { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' },
  'Umum': { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
  'Pendidikan': { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' },
  'Perkembangan': { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
}

const getSpesialisasiStyle = (sp) => {
  const s = (sp || '').toLowerCase()
  if (s.includes('klinis') && s.includes('pendidikan')) {
    return { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500' }
  }
  if (s.includes('klinis')) {
    return { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500' }
  }
  if (s.includes('pendidikan')) {
    return { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500' }
  }
  if (s.includes('karir') || s.includes('pengembangan')) {
    return { cls: 'bg-violet-50 text-violet-700 border-violet-200', dot: 'bg-violet-500' }
  }
  return { cls: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500' }
}


const AVATAR_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
]

const formatIDR = (num) => {
  if (num === undefined || num === null) return '—'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num)
}

export default function PsikologPage() {
  const [psychologists, setPsychologists] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPsikolog, setSelected] = useState(null)
  const [filterPeriode, setFilterPeriode] = useState('all')

  const [activeTab, setActiveTab] = useState('profile')
  const [bookings, setBookings] = useState([])
  const [loadingBookings, setLoadingBookings] = useState(false)
  const [monthlyTrend, setMonthlyTrend] = useState([])
  const [periodsList, setPeriodsList] = useState([])

  const fetchBookingsForPsikolog = async (psikologId) => {
    setLoadingBookings(true)
    try {
      const res = await api.get('/app/dashboard/counseling')
      const allBookings = res?.data?.data || []
      const filteredBookings = allBookings.filter(b => b.psikolog_id === psikologId)
      setBookings(filteredBookings)
    } catch (err) {
      console.error(err)
      toast.error("Gagal memuat riwayat konseling")
    } finally {
      setLoadingBookings(false)
    }
  }

  const handleSelectPsikolog = (psikolog) => {
    setSelected(psikolog)
    setActiveTab('profile')
    if (psikolog) {
      fetchBookingsForPsikolog(psikolog.ID)
    } else {
      setBookings([])
    }
  }

  const fetchPsychologists = async () => {
    setLoading(true)
    try {
      const res = await api.get('/app/dashboard/psychologists')
      let list = res?.data?.data || []
      
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

      // MOCK DATA INJECTION FOR TESTING LAYOUT
      const mockSpesialisasi = ['Psikologi Klinis Dewasa', 'Klinis Anak & Remaja', 'Psikologi Pendidikan', 'Konseling Karir', 'Psikologi Industri', 'Perkembangan Anak', 'Psikologi Keluarga', 'Trauma & PTSD', 'Adiksi', 'Psikologi Umum'];
      const mockLokasi = ['Online', 'Tatap Muka', 'Hybrid', 'Online & Tatap Muka'];
      const mockNames = ['Budi Santoso', 'Siti Rahma', 'Ahmad Rizal', 'Dewi Lestari', 'Agus Setiawan', 'Rini Yulianti', 'Hendra Wijaya', 'Nina Safitri'];

      const mockData = Array.from({ length: 120 }).map((_, i) => ({
        id: `mock-${i}`,
        nama: `${mockNames[i % mockNames.length]} S.Psi., M.Psi., Psikolog ${i + 1}`,
        email: `psikolog.mock${i + 1}@kampus.ac.id`,
        no_hp: `081234567${String(i).padStart(3, '0')}`,
        spesialisasi: mockSpesialisasi[i % mockSpesialisasi.length],
        bio: `Saya adalah psikolog berpengalaman lebih dari ${5 + (i % 15)} tahun menangani berbagai kasus mahasiswa...`,
        foto_url: '',
        lokasi: mockLokasi[i % mockLokasi.length],
        bahasa: i % 4 === 0 ? 'Indonesia, Inggris' : 'Indonesia',
        is_aktif: i % 10 !== 0,
        CreatedAt: new Date(2023 + (i % 2), i % 12, 1).toISOString()
      }));

      list = [...list, ...mockData];
      setPsychologists(list.map((p, i) => ({
        ID: p.id || p.ID,
        Nama: p.nama || p.Nama || '—',
        Email: p.email || p.Email || '—',
        NoHP: p.no_hp || p.NoHP || '—',
        Spesialisasi: p.spesialisasi || p.Spesialisasi || 'Umum',
        Bio: p.bio || p.Bio || 'Tidak ada bio.',
        Foto: getFullUrl(p.foto_url || p.FotoURL || null),
        Lokasi: p.lokasi || p.Lokasi || '—',
        Bahasa: p.bahasa || p.Bahasa || 'Indonesia',
        IsAktif: p.is_aktif !== false,
        CreatedAt: p.created_at || p.CreatedAt || new Date().toISOString(),
        colorIdx: i % AVATAR_COLORS.length,
      })))
    } catch {
      toast.error("Gagal memuat data psikolog")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPsychologists()
  }, [])

  const spesialisasiList = [...new Set(psychologists.map(p => p.Spesialisasi).filter(Boolean))]

  const periodeOptions = useMemo(() => {
    const periods = new Set()
    psychologists.forEach(p => {
      if (p.CreatedAt) {
        const d = new Date(p.CreatedAt)
        if (!isNaN(d.getTime())) {
          periods.add(String(d.getFullYear()))
        }
      }
    })
    return Array.from(periods).sort((a, b) => Number(b) - Number(a))
  }, [psychologists])

  const filteredPsychologists = useMemo(() => {
    if (filterPeriode === 'all') return psychologists
    return psychologists.filter(p => {
      if (!p.CreatedAt) return false
      const d = new Date(p.CreatedAt)
      if (isNaN(d.getTime())) return false
      const pYear = String(d.getFullYear())
      const yearFromPeriod = filterPeriode.length >= 4 ? filterPeriode.substring(0, 4) : filterPeriode;
      return pYear === filterPeriode || pYear === yearFromPeriod
    })
  }, [psychologists, filterPeriode])

  const distribusiSpes = useMemo(() => {
    const spesMap = {}
    filteredPsychologists.forEach(p => {
      const spes = p.Spesialisasi || 'Umum'
      if (!spesMap[spes]) spesMap[spes] = 0
      spesMap[spes]++
    })
    return Object.entries(spesMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }, [filteredPsychologists])

  const filtersConfig = useMemo(() => [
    {
      key: 'Spesialisasi',
      placeholder: 'Spesialisasi',
      options: spesialisasiList.map(s => ({ label: s, value: s }))
    }
  ], [spesialisasiList])

  const stats = {
    total: filteredPsychologists.length,
    klinis: filteredPsychologists.filter(p => p.Spesialisasi?.toLowerCase().includes('klinis')).length,
    umum: filteredPsychologists.filter(p => p.Spesialisasi?.toLowerCase().includes('umum')).length,
    aktif: filteredPsychologists.filter(p => p.IsAktif).length,
  }

  const columns = [
    {
      key: 'Nama',
      label: 'Identitas Psikolog',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3.5">
          <PsikologAvatar src={row.Foto} name={row.Nama} className="w-10 h-10 rounded-full" />
          <div>
            <p className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px]">{row.Nama || '—'}</p>
            <p className="text-[11px] font-medium text-[var(--theme-text-muted)] font-body tracking-tight mt-0.5">{row.Email}</p>
          </div>
        </div>
      )
    },
    {
      key: 'Lokasi',
      label: 'Lokasi & Bahasa',
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[13px]">{row.Lokasi || 'Online & Tatap Muka'}</p>
          <p className="text-[11px] font-medium text-[var(--theme-text-muted)] font-body tracking-tight mt-0.5">Bahasa: {row.Bahasa}</p>
        </div>
      )
    },
    {
      key: 'Spesialisasi',
      label: 'Spesialisasi',
      sortable: true,
      className: 'w-[240px] text-center',
      render: (val, row) => {
        const spStyle = getSpesialisasiStyle(row.Spesialisasi)
        return (
          <div className="flex items-center justify-center">
            <span className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider whitespace-nowrap',
              spStyle.cls
            )}>
              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', spStyle.dot)} />
              {row.Spesialisasi}
            </span>
          </div>
        )
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'w-[80px] text-center',
      sortable: false,
      render: (val, row) => (
        <div className="flex justify-center items-center">
          <button
            onClick={() => handleSelectPsikolog(row)}
            className="w-8 h-8 flex items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors"
            title="Lihat Detail"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >visibility</span>
          </button>
        </div>
      )
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />
      <DashboardHero
        title="Direktori "
        highlightedTitle="Psikolog"
        subtitle="Database tenaga konselor profesional, spesialisasi, dan jadwal aktif penugasan bimbingan psikologi tingkat fakultas."
        icon="psychology"
        badges={[
          { label: 'Student Wellness', active: false },
          { label: `${stats.aktif} Praktisi Aktif`, active: true }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <SelectField value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectOption value="all">Semua Periode</SelectOption>
              {periodsList.length > 0 ? periodsList.map(p => (
                <SelectOption key={p.id || p.ID} value={String(p.sevima_id || p.id || p.ID)}>
                  {p.AcademicYear} · {p.Semester} {p.IsActive ? '⭐' : ''}
                </SelectOption>
              )) : periodeOptions.map(per => (
                <SelectOption key={per} value={per}>Tahun {per}</SelectOption>
              ))}
            </SelectField>
            <button onClick={fetchPsychologists} disabled={loading}
              className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none">
              {loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>sync</span>} Refresh Data
            </button>
          </div>
        }
      />

      {/* ── Stat Cards Row 1 ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <PrimaryStatsCard
          title="Total Psikolog"
          value={stats.total}
          icon="group"
          colorTheme="primary"
          badgeText="Tervalidasi"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
        />
        <PrimaryStatsCard
          title="Spesialisasi Klinis"
          value={stats.klinis}
          icon="work"
          colorTheme="error"
          badgeText="Tersedia"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">health_and_safety</span>}
        />
        <PrimaryStatsCard
          title="Spesialisasi Umum"
          value={stats.umum}
          icon="emoji_events"
          colorTheme="info"
          badgeText="Tersedia"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">group</span>}
        />
        <PrimaryStatsCard
          title="Psikolog Aktif"
          value={stats.aktif}
          icon="how_to_reg"
          colorTheme="success"
          badgeText="Online"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">bolt</span>}
        />
      </div>

      {/* NEW: 5W1H Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6 mb-6">
        {/* WHAT → Distribusi Spesialisasi */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>psychology</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Spesialisasi</span>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">Distribusi Bidang Ahli</h3>
            </div>
          </div>
          <div className="h-[220px] w-full mt-2 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distribusiSpes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={2}
                  dataKey="count"
                >
                  {distribusiSpes.map((entry, index) => {
                    const colors = ['#fb7185', '#60a5fa', '#fbbf24', '#34d399', '#a78bfa', '#2dd4bf', '#f472b6', '#38bdf8', '#a3e635'];
                    return <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="transparent" />
                  })}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#1e293b' }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-800 leading-none">{distribusiSpes.length}</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Spesialisasi</span>
            </div>
          </div>
        </div>


        {/* WHERE → Lokasi Praktik */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>location_on</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Lokasi Praktik</span>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">Mode Layanan Tersedia</h3>
            </div>
          </div>
          {(() => {
            const online = filteredPsychologists.filter(p => (p.Lokasi || '').toLowerCase().includes('online')).length
            const offline = filteredPsychologists.filter(p => (p.Lokasi || '').toLowerCase().includes('tatap') || (p.Lokasi || '').toLowerCase().includes('kampus')).length
            const hybrid = filteredPsychologists.length - online - offline
            const items = [
              { name: 'Online (Daring)', count: online, color: 'bg-blue-400' },
              { name: 'Tatap Muka (Luring)', count: offline, color: 'bg-emerald-400' },
              { name: 'Hybrid (Campuran)', count: hybrid, color: 'bg-violet-400' }
            ]
            const maxCount = Math.max(...items.map(d => d.count), 1)
            return (
              <div className="space-y-5 mt-4">
                {items.map((item, i) => (
                  <div key={i} className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">{item.name}</span>
                      <span className="text-sm font-black text-slate-800">{item.count}</span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all duration-500 ease-out', item.color)} style={{ width: `${(item.count / maxCount) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}
        </div>

        {/* WHEN → Aktivitas Booking */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_month</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Status Booking</span>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">Kondisi Jadwal Aktif</h3>
            </div>
          </div>
          {(() => {
            const aktif = filteredPsychologists.filter(p => p.IsAktif).length
            const nonaktif = filteredPsychologists.length - aktif
            const total = filteredPsychologists.length || 1
            const aktifPct = Math.round((aktif / total) * 100)

            return (
              <div className="flex flex-col gap-4 mt-3">
                <div className="flex items-center gap-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 group-hover:border-emerald-200 transition-colors">
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-emerald-200">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-20"></span>
                    <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: '22px' }}>bolt</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5 truncate">Siap Melayani</p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-2xl font-black text-emerald-700 leading-none">{aktif}</span>
                      <span className="text-[11px] font-bold text-emerald-600/70 mb-0.5">Psikolog</span>
                    </div>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-lg font-black text-emerald-500">{aktifPct}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 border border-slate-100 group-hover:border-slate-200 transition-colors">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-sm border border-slate-200">
                    <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '22px' }}>bedtime</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5 truncate">Cuti / Off</p>
                    <div className="flex items-end gap-1.5">
                      <span className="text-2xl font-black text-slate-700 leading-none">{nonaktif}</span>
                      <span className="text-[11px] font-bold text-slate-500/70 mb-0.5">Psikolog</span>
                    </div>
                  </div>
                  <div className="text-right pl-2">
                    <span className="text-lg font-black text-slate-400">{100 - aktifPct}%</span>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>


        {/* HOW → Kontak Cepat */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>contact_phone</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Kontak Cepat</span>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">Info Kontak Tersedia</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-rose-50 rounded-lg">
              <Mail size={14} className="text-rose-600" />
              <span className="text-xs font-medium text-slate-600">{filteredPsychologists.filter(p => p.Email && p.Email !== '—').length} Email Terdaftar</span>
            </div>
            <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg">
              <Phone size={14} className="text-emerald-600" />
              <span className="text-xs font-medium text-slate-600">{filteredPsychologists.filter(p => p.NoHP && p.NoHP !== '—').length} No. HP Terdaftar</span>
            </div>
          </div>
        </div>

        {/* WHO → Prodi/Fakultas Tersebar */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>school</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Cakupan</span>
              <h3 className="text-sm font-bold text-slate-800 leading-tight">Prodi/Fakultas Terlayani</h3>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-violet-50 rounded-xl">
              <span className="text-sm font-bold text-violet-700">Total Psikolog</span>
              <span className="text-lg font-extrabold text-violet-600">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl">
              <span className="text-sm font-bold text-emerald-700">Aktif & Siap</span>
              <span className="text-lg font-extrabold text-emerald-600">{stats.aktif}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Table Card ─────────────────────────────────────────── */}
      <div className="mt-6 mb-6">
        <DataTable
          title="Direktori Psikolog"
          subtitle="Daftar lengkap praktisi dan konselor yang tersedia"
          data={filteredPsychologists}
          columns={columns}
          loading={loading}
          searchPlaceholder="Cari nama psikolog, spesialisasi, dsb..."
          filters={filtersConfig}
          pagination={true}
          pageSize={10}
          emptyMessage="Tidak Ada Data Psikolog"
          emptyIcon="psychology"
        />
      </div>

      {/* ── Detail Modal ──────────────────────────────────────────── */}
      <DialogModal
        open={!!selectedPsikolog}
        onOpenChange={(open) => !open && handleSelectPsikolog(null)}
        icon="psychology"
        title={selectedPsikolog?.Nama}
        subtitle={`${selectedPsikolog?.Spesialisasi} Specialist`}
        badgeText="Praktisi Wellness"
        maxWidth="max-w-2xl"
        bodyClassName="p-0 space-y-0"
        footer={
          <button
            onClick={() => handleSelectPsikolog(null)}
            className="h-10 px-5 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-semibold uppercase tracking-wider hover:opacity-90 hover:shadow-md hover:shadow-[var(--theme-primary)]/20 transition-all active:scale-95 cursor-pointer border border-[var(--theme-primary)]"
          >
            Tutup Detail
          </button>
        }
      >
        <div className="flex flex-col">
          {/* Info pills row */}
          <div className="px-6 py-4 flex flex-wrap gap-2 border-b border-[var(--theme-border-muted)]">
            <span className="flex items-center gap-1.5 bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-wider">
              <Award size={11} />
              {selectedPsikolog?.Spesialisasi || 'Umum'}
            </span>
            <span className="flex items-center gap-1.5 bg-[var(--theme-info-light)] border border-[var(--theme-info)]/20 px-3 py-1.5 rounded-xl text-[10px] font-bold text-[var(--theme-info)] tracking-wider">
              Gratis (Di-cover Kampus)
            </span>
            <span className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border",
              selectedPsikolog?.IsAktif
                ? "bg-[var(--theme-success-light)] border-[var(--theme-success)]/20 text-[var(--theme-success)]"
                : "bg-[var(--theme-error-light)] border-[var(--theme-error)]/20 text-[var(--theme-error)]"
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full bg-current", selectedPsikolog?.IsAktif && "animate-pulse")} />
              {selectedPsikolog?.IsAktif ? 'Aktif' : 'Nonaktif'}
            </span>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/20 px-6 pt-2 flex-shrink-0">
            <button
              onClick={() => setActiveTab('profile')}
              className={cn(
                "pb-3 pt-2 text-xs font-bold uppercase tracking-wider border-b-2 mr-6 transition-all cursor-pointer",
                activeTab === 'profile'
                  ? "border-[var(--theme-primary)] text-[var(--theme-primary)]"
                  : "border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
              )}
            >
              Profil Psikolog
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={cn(
                "pb-3 pt-2 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 cursor-pointer",
                activeTab === 'history'
                  ? "border-[var(--theme-primary)] text-[var(--theme-primary)]"
                  : "border-transparent text-[var(--theme-text-muted)] hover:text-[var(--theme-text)]"
              )}
            >
              <span className="material-symbols-outlined text-[14px]">history</span>
              Riwayat Mahasiswa Fakultas
              {bookings.length > 0 && (
                <span className="bg-[var(--theme-primary-light)] text-[var(--theme-primary)] px-1.5 py-0.5 rounded-full text-[10px] font-black">
                  {bookings.length}
                </span>
              )}
            </button>
          </div>

          {/* ── Body ── */}
          <div>
            {activeTab === 'profile' ? (
              <>
                {/* Bio Section */}
                <div className="p-5 border-b border-[var(--theme-border-muted)]">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-5 h-5 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '11px' }} >description</span>
                    </div>
                    <h3 className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Profil & Biografi</h3>
                  </div>
                  <div className="bg-white border border-[var(--theme-border)] shadow-sm rounded-xl p-4 relative mt-1">
                    <span className="material-symbols-outlined absolute top-2 right-3 text-slate-100" style={{ fontSize: '40px', zIndex: 0}}>format_quote</span>
                    <p className="text-sm text-[var(--theme-text)] leading-relaxed italic relative z-10 font-medium">
                      "{selectedPsikolog?.Bio}"
                    </p>
                  </div>
                </div>

                {/* Penugasan Konselor */}
                <div className="p-5 border-b border-[var(--theme-border-muted)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center">
                      <Layers size={11} className="text-[var(--theme-primary)]" />
                    </div>
                    <h3 className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Detail Praktik</h3>
                  </div>
                  <div className="space-y-1">
                    <InfoCard
                      icon={Building2}
                      label="Lokasi Praktik"
                      value={selectedPsikolog?.Lokasi}
                      accent="border-l-[var(--theme-info)]"
                    />
                    <InfoCard
                      icon={Briefcase}
                      label="Bahasa yang Dikuasai"
                      value={selectedPsikolog?.Bahasa}
                      accent="border-l-[var(--theme-primary)]"
                    />
                    <InfoCard
                      icon={Award}
                      label="Biaya Konsultasi"
                      value="Gratis (Di-cover Kampus)"
                      accent="border-l-[var(--theme-secondary)]"
                    />
                  </div>
                </div>

                {/* Informasi Kontak */}
                <div className="p-5 border-b border-[var(--theme-border-muted)]">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '11px' }} >mail</span>
                    </div>
                    <h3 className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Informasi Kontak</h3>
                  </div>
                  <div className="space-y-1">
                    <InfoCard
                      icon={Mail}
                      label="Email Resmi"
                      value={selectedPsikolog?.Email}
                      accent="border-l-[var(--theme-error)]"
                      mono
                    />
                    <InfoCard
                      icon={Phone}
                      label="No. Handphone"
                      value={selectedPsikolog?.NoHP}
                      accent="border-l-[var(--theme-success)]"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[var(--theme-border-muted)]">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--theme-text)]">
                      Catatan Konseling Mahasiswa
                    </h3>
                    <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
                      Daftar riwayat bimbingan mahasiswa fakultas Anda dengan {selectedPsikolog?.Nama}
                    </p>
                  </div>
                </div>

                {loadingBookings ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '32px' }} >sync</span>
                    <p className="text-xs text-[var(--theme-text-muted)] font-semibold">Memuat riwayat...</p>
                  </div>
                ) : bookings.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl flex items-center justify-center text-[var(--theme-text-muted)]">
                      <span className="material-symbols-outlined" style={{ fontSize: '22px' }}>history</span>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-[var(--theme-text)]">Belum Ada Riwayat Konseling</p>
                      <p className="text-xs text-[var(--theme-text-muted)] max-w-sm mt-0.5">
                        Tidak ditemukan data riwayat bimbingan untuk mahasiswa dari fakultas Anda dengan psikolog ini.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b) => {
                      const statusCls =
                        b.status === 'Selesai' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20' :
                          b.status === 'Disetujui' || b.status === 'Dikonfirmasi' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20' :
                            b.status === 'Menunggu' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20' :
                              'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20';

                      return (
                        <div key={b.id} className="p-4 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-2xl hover:bg-[var(--theme-surface)] hover:border-[var(--theme-border)]/60 transition-all space-y-3">
                          {/* Student Info & Status Row */}
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-bold text-sm text-[var(--theme-text)] leading-tight">
                                {b.mahasiswa?.nama || '—'}
                              </p>
                              <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">
                                {b.mahasiswa?.program_studi?.Nama || b.mahasiswa?.program_studi?.nama || '—'}
                              </p>
                            </div>
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider",
                              statusCls
                            )}>
                              {b.status}
                            </span>
                          </div>

                          {/* Date, Time & Mode */}
                          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-[var(--theme-text-muted)] bg-[var(--theme-bg)] p-2.5 rounded-xl border border-[var(--theme-border-muted)]">
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-[var(--theme-text-subtle)]">calendar_today</span>
                              {new Date(b.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[15px] text-[var(--theme-text-subtle)]">schedule</span>
                              {b.jam_mulai} - {b.jam_selesai} WIB
                            </div>
                            <div className="flex items-center gap-1.5 ml-auto">
                              <span className="material-symbols-outlined text-[15px] text-[var(--theme-text-subtle)]">
                                {b.mode === 'Online' ? 'videocam' : 'location_on'}
                              </span>
                              {b.mode || 'Tatap Muka'}
                            </div>
                          </div>

                          {/* Complaint Section */}
                          <div className="space-y-1 bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] p-3 rounded-xl shadow-sm">
                            <div className="flex items-center gap-1.5 text-[var(--theme-text-muted)]">
                              <span className="material-symbols-outlined text-[15px] text-[var(--theme-primary)]">psychology</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wider">Topik: {b.topik || 'Umum'}</span>
                            </div>
                            <p className="text-xs font-semibold text-[var(--theme-text)] mt-1 leading-relaxed">
                              {b.keluhan || 'Tidak ada catatan keluhan.'}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogModal>
    </PageContent>
  )
}

function InfoCard({ icon: Icon, label, value, accent = 'border-l-[var(--theme-border)]', mono = false }) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-3 rounded-xl bg-white shadow-sm border border-[var(--theme-border)] border-l-4 transition-all',
      accent
    )}>
      <div className="w-7 h-7 bg-[var(--theme-surface)] rounded-lg flex items-center justify-center text-[var(--theme-primary)] shadow-sm border border-[var(--theme-border)] flex-shrink-0">
        <Icon size={13} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-[0.15em] mb-0.5">{label}</p>
        <p className={cn(
          'text-sm font-semibold text-[var(--theme-text)] truncate',
          mono && 'font-mono text-xs tracking-tight',
          (!value || value === '—') && 'text-[var(--theme-text-subtle)] italic text-xs'
        )}>
          {value || 'Belum diisi'}
        </p>
      </div>
    </div>
  )
}
