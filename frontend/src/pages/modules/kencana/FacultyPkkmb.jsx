"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { toast, Toaster } from 'react-hot-toast'

import { cn } from '@/lib/utils'
import { API_BASE_URL, fetchWithAuth, adminService } from '@/services/api'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { PageContent } from '@/components/ui/page'
import { DialogModal, ModalCancelButton } from "@/components/ui/DialogModal"
import { DashboardHero } from '@/components/ui/dashboard'
import { DataTable } from '@/components/ui/DataTable'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { UserInfoCell, ScoreCell, StatusBadgeCell, TitleSubtitleCell } from '@/components/ui/TableCells'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const CheckCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const GraduationCap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;



const API = `${API_BASE_URL}/faculty`

const AVATAR_COLORS = ['from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500', 'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500', 'from-violet-400 to-purple-500']
const getInitials = (n = '') => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

const LUL_STATUS = {
  Lulus: { cls: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20', dot: 'bg-[var(--theme-success)]' },
  Proses: { cls: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20', dot: 'bg-[var(--theme-warning)]' },
  Gagal: { cls: 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20', dot: 'bg-[var(--theme-error)]' },
}
const getLulus = (v = '') => LUL_STATUS[v] || LUL_STATUS.Proses

const getFullUrl = (path) => {
  if (!path || path.trim() === "" || path === "/" || path.endsWith("/profiles/") || path.endsWith("/students/")) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path}`;
}

function StudentAvatar({ src, name, className = "w-9 h-9 rounded-xl" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const hasNoImage = !src || src.trim() === "" || src.endsWith("/profiles/") || src.endsWith("/students/") || src.endsWith("localhost:8000") || src.endsWith("localhost:8000/");

  return (
    <div className={cn("relative bg-[var(--theme-surface)] flex items-center justify-center shrink-0 border border-[var(--theme-border-muted)] shadow-inner overflow-hidden", className)}>
      {(error || hasNoImage) && (
        <span className="material-symbols-outlined text-[var(--theme-text-subtle)] block select-none leading-none absolute" style={{ fontSize: className.includes('w-14') ? '28px' : '20px' }}>
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

const TABS = [
  { key: 'prodi', label: 'Breakdown Prodi', icon: GraduationCap },
  { key: 'students', label: 'Detail Peserta', icon: Users },
]

const parseDay = (dateStr) => {
  if (!dateStr) return '--';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    return match[3];
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return String(d.getDate()).padStart(2, '0');
  }
  return '--';
}

const formatFullDate = (dateStr) => {
  if (!dateStr) return '-';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    const year = match[1];
    const month = months[parseInt(match[2], 10) - 1] || match[2];
    const day = match[3];
    return `${day} ${month} ${year}`;
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  return dateStr;
}

const prodiColumns = [
  { label: 'No', key: 'no', sortable: false, render: (_, __, i) => <span className="text-[var(--theme-text-subtle)] font-medium">{i + 1}</span> },
  {
    label: 'Program Studi', key: 'prodi', sortable: true, render: (val) => (
      <div>
        <p className="font-bold text-sm text-[var(--theme-text)]">{val}</p>
        <p className="text-[10px] text-[var(--theme-text-muted)] font-medium">Sertifikasi Internal</p>
      </div>
    )
  },
  {
    label: 'Partisipasi', key: 'partisipasi', sortable: true, render: (val) => (
      <div className="flex items-center gap-2">
        <div className="w-20 h-1.5 bg-[var(--theme-bg)] rounded-full overflow-hidden border border-[var(--theme-border)]">
          <div className="h-full bg-[var(--theme-primary)] rounded-full" style={{ width: `${val}%` }} />
        </div>
        <span className="text-xs font-black text-[var(--theme-text)] tabular-nums">{Math.round(val)}%</span>
      </div>
    )
  },
  { label: 'Rata-rata Nilai', key: 'nilai', sortable: true, render: (val) => <span className="font-black text-sm text-[var(--theme-text)] tabular-nums">{val?.toFixed(1) || '0.0'}</span> },
  {
    label: 'Status', key: 'status', sortable: true, render: (val) => (
      <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider whitespace-nowrap',
        val === 'Optimal' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20' : 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20')}>
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', val === 'Optimal' ? 'bg-[var(--theme-success)]' : 'bg-[var(--theme-warning)]')} />{val}
      </span>
    )
  }
];

const studentColumns = [
  { label: 'No', key: 'no', sortable: false, render: (_, __, i) => <span className="text-[var(--theme-text-subtle)] font-medium">{i + 1}</span> },
  {
    label: 'Mahasiswa', key: 'Mahasiswa.Nama', sortable: true, render: (_, row) => (
      <UserInfoCell
        name={row.Mahasiswa?.Nama}
        subtitle={row.Mahasiswa?.NIM}
        avatarUrl={getFullUrl(row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url || row.Mahasiswa?.Foto || row.Mahasiswa?.Pengguna?.Foto)}
      />
    )
  },
  {
    label: 'Program Studi', key: 'Mahasiswa.ProgramStudi.Nama', sortable: true, render: (_, row) => (
      <TitleSubtitleCell
        title={row.Mahasiswa?.ProgramStudi?.Nama || '—'}
        subtitle={row.Mahasiswa?.Fakultas?.Nama || '—'}
      />
    )
  },
  { label: 'Kehadiran', key: 'attendanceRate', sortable: true, render: (val) => <ScoreCell value={`${val || 0}%`} /> },
  { label: 'Kognitif (25%)', key: 'cognitive', sortable: false, render: () => <ScoreCell value="0.0" subtitle="Weighted: 0.0" /> },
  { label: 'Psikomotor (35%)', key: 'psychomotor', sortable: false, render: () => <ScoreCell value="0.0" subtitle="Weighted: 0.0" /> },
  { label: 'Afektif (40%)', key: 'affective', sortable: false, render: () => <ScoreCell value="0.0" subtitle="Weighted: 0.0" /> },
  { label: 'Nilai Akhir', key: 'Nilai', sortable: true, render: (val) => <ScoreCell value={val || 0} highlight={true} /> },
  {
    label: 'Status', key: 'StatusKelulusan', sortable: true, render: (val) => {
      let st = 'default';
      let label = val || 'Proses';
      if (val === 'Lulus') st = 'success';
      if (val === 'Proses') st = 'warning';
      if (val === 'Gagal') st = 'error';
      return <StatusBadgeCell status={st} label={label} />
    }
  }
];

export default function FacultyPkkmb() {
  const [activeTab, setTab] = useState('prodi')
  const [loading, setLoading] = useState(true)
  const [students, setStudents] = useState([])
  const [periodsList, setPeriodsList] = useState([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilter] = useState('all')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [selected, setSelected] = useState(null)
  const [statsDetail, setStatsDetail] = useState(null)
  const [statsSearch, setStatsSearch] = useState('')
  const [kegiatanList, setKegiatanList] = useState([])
  const [batasNilai, setBatasNilai] = useState(70)
  const [isSyncingSevima, setIsSyncingSevima] = useState(false)

  const handleSyncSevima = async () => {
    setIsSyncingSevima(true)
    try {
      const res = await fetchWithAuth(`${API}/sync-mahasiswa`, { method: 'POST' })
      toast.success(res.message || 'Sinkronisasi Mahasiswa berjalan di latar belakang')
    } catch {
      toast.error('Gagal sinkronisasi dari SEVIMA')
    } finally {
      setIsSyncingSevima(false)
    }
  }

  const handleOpenStatsDetail = (key, label) => {
    let list = []
    if (key === 'totalMaba') {
      list = students
    } else if (key === 'totalLulus') {
      list = students.filter(s => s.StatusKelulusan === 'Lulus')
    } else if (key === 'totalSertifikat') {
      list = students.filter(s => s.Mahasiswa?.PkkmbSertifikat !== null && s.Mahasiswa?.PkkmbSertifikat !== undefined)
    } else if (key === 'totalProses') {
      list = students.filter(s => s.StatusKelulusan === 'Proses')
    }
    setStatsDetail({ label, key, list })
    setStatsSearch('')
  }

  const filteredStatsDetailList = useMemo(() => {
    if (!statsDetail) return []
    const q = statsSearch.toLowerCase()
    return statsDetail.list.filter(s =>
      !q || s.Mahasiswa?.Nama?.toLowerCase().includes(q) || s.Mahasiswa?.NIM?.includes(q) || s.Mahasiswa?.ProgramStudi?.Nama?.toLowerCase().includes(q)
    )
  }, [statsDetail, statsSearch])

  useEffect(() => {
    let isMounted = true;

    const fetchSummary = async () => {
      try {
        const json = await fetchWithAuth(`${API}/ringkasan?tahun=all`)
        if (isMounted && json.status === 'success') {
          setKegiatanList(json.kegiatanList || [])
          setBatasNilai(json.batasNilai || 70)
        }
      } catch { }
    }

    const fetchStudents = async () => {
      if (isMounted) setLoading(true)
      try {
        const periodRes = await adminService.getAllAcademicPeriods()
        if (periodRes && periodRes.status === 'success' && periodRes.data) {
          if (isMounted) setPeriodsList(periodRes.data)
        } else if (periodRes?.data?.status === 'success' && periodRes?.data?.data) {
          if (isMounted) setPeriodsList(periodRes.data.data)
        }
      } catch (err) {
        console.error("Failed to fetch periods", err)
      }

      try {
        const json = await fetchWithAuth(`${API}/peserta?tahun=all`)
        if (isMounted && json.status === 'success') setStudents((json.data || []).map((s, i) => ({ ...s, colorIdx: i % AVATAR_COLORS.length })))
      } catch {
        if (isMounted) toast.error('Gagal memuat data peserta')
      }
      finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSummary();
    fetchStudents();

    return () => { isMounted = false; }
  }, [])

  const periodeOptions = useMemo(() => {
    const periods = new Set()
    students.forEach(s => {
      const angkatan = s.Mahasiswa?.angkatan || s.Mahasiswa?.TahunMasuk || (s.Mahasiswa?.NIM ? `20${s.Mahasiswa.NIM.substring(0, 2)}` : null);
      if (angkatan) {
        const year = parseInt(angkatan)
        if (year > 1900 && year < 2100) periods.add(String(year))
      }
    })
    return Array.from(periods).sort((a, b) => Number(b) - Number(a))
  }, [students])

  const [hasSetDefault, setHasSetDefault] = useState(false);
  useEffect(() => {
    if (periodsList.length > 0 && !hasSetDefault && filterPeriod === 'all') {
      // Find active period or just default to 'all' instead of forcing the first one to avoid confusion if it's empty
      // setFilterPeriod(String(periodsList[0].sevima_id || periodsList[0].id || periodsList[0].ID));
      setHasSetDefault(true);
    } else if (periodeOptions.length > 0 && !hasSetDefault && filterPeriod === 'all') {
      // setFilterPeriod(periodeOptions[0]);
      setHasSetDefault(true);
    }
  }, [periodsList, periodeOptions, hasSetDefault, filterPeriod]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      if (filterPeriod === 'all') return true;
      const angkatan = String(s.Mahasiswa?.angkatan || s.Mahasiswa?.TahunMasuk || (s.Mahasiswa?.NIM ? `20${s.Mahasiswa.NIM.substring(0, 2)}` : null));
      const yearFromPeriod = filterPeriod.length >= 4 ? filterPeriod.substring(0, 4) : filterPeriod;
      return angkatan === filterPeriod || angkatan === yearFromPeriod;
    });
  }, [students, filterPeriod]);

  // Dynamically calculate everything from filteredStudents so filters affect the entire dashboard
  const data = useMemo(() => {
    const prodiMap = {}
    filteredStudents.forEach(s => {
      const pName = s.Mahasiswa?.ProgramStudi?.Nama || 'Tanpa Prodi'
      if (!prodiMap[pName]) prodiMap[pName] = { total: 0, hadir: 0, nilai: 0 }
      prodiMap[pName].total += 1
      prodiMap[pName].hadir += (s.attendanceRate || 0)
      prodiMap[pName].nilai += (s.Nilai || 0)
    })
    return Object.entries(prodiMap).map(([prodi, stats]) => {
      const partisipasi = stats.total > 0 ? (stats.hadir / stats.total) : 0
      const avgNilai = stats.total > 0 ? (stats.nilai / stats.total) : 0
      return {
        prodi, partisipasi, nilai: avgNilai, status: partisipasi >= 80 ? 'Optimal' : 'Kurang'
      }
    })
  }, [filteredStudents])

  const summary = useMemo(() => ({
    totalMaba: filteredStudents.length,
    totalLulus: filteredStudents.filter(s => s.StatusKelulusan === 'Lulus').length,
    totalProses: filteredStudents.filter(s => s.StatusKelulusan === 'Proses').length,
    totalSertifikat: filteredStudents.filter(s => s.Mahasiswa?.PkkmbSertifikat).length
  }), [filteredStudents])

  const distribusi = useMemo(() => {
    const lulus = filteredStudents.filter(s => s.StatusKelulusan === 'Lulus').length
    const proses = filteredStudents.filter(s => s.StatusKelulusan === 'Proses').length
    const gagal = filteredStudents.filter(s => s.StatusKelulusan === 'Gagal').length
    return { Lulus: lulus, Proses: proses, Gagal: gagal, Total: filteredStudents.length }
  }, [filteredStudents])

  const genderStats = useMemo(() => {
    const map = { 'Laki-laki': { total: 0, lulus: 0 }, 'Perempuan': { total: 0, lulus: 0 } }
    filteredStudents.forEach(s => {
      let g = s.Mahasiswa?.JenisKelamin || s.Mahasiswa?.gender || 'Unknown'
      if (g === 'L' || g.toLowerCase() === 'laki-laki') g = 'Laki-laki'
      else if (g === 'P' || g.toLowerCase() === 'perempuan') g = 'Perempuan'

      if (map[g]) {
        map[g].total++
        if (s.StatusKelulusan === 'Lulus') map[g].lulus++
      } else {
        if (!map['Unknown']) map['Unknown'] = { total: 0, lulus: 0 }
        map['Unknown'].total++
        if (s.StatusKelulusan === 'Lulus') map['Unknown'].lulus++
      }
    })
    return Object.entries(map).map(([gender, stats]) => ({ gender, ...stats }))
  }, [filteredStudents])

  const angkatanStats = useMemo(() => {
    const map = {}
    filteredStudents.forEach(s => {
      const angkatan = s.Mahasiswa?.angkatan || s.Mahasiswa?.TahunMasuk || (s.Mahasiswa?.NIM ? `20${s.Mahasiswa.NIM.substring(0, 2)}` : null);
      const k = String(angkatan || 'Unknown')
      if (!map[k]) map[k] = { total: 0, lulus: 0 }
      map[k].total++
      if (s.StatusKelulusan === 'Lulus') map[k].lulus++
    })
    return Object.entries(map).map(([angkatan, stats]) => ({ angkatan, ...stats })).sort((a, b) => b.angkatan.localeCompare(a.angkatan))
  }, [filteredStudents])

  const nilaiDist = useMemo(() => {
    const dist = [
      { range: '90-100', count: 0 },
      { range: '80-89', count: 0 },
      { range: '70-79', count: 0 },
      { range: '< 70', count: 0 }
    ]
    filteredStudents.forEach(s => {
      const n = s.Nilai || 0
      if (n >= 90) dist[0].count++
      else if (n >= 80) dist[1].count++
      else if (n >= 70) dist[2].count++
      else dist[3].count++
    })
    return dist
  }, [filteredStudents])

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        icon="school"
        title="Monitoring "
        highlightedTitle="PKKMB"
        subtitle="Monitor kehadiran, nilai, dan status kelulusan peserta PKKMB per prodi dan per individu."
        badges={[
          { label: 'Portal Orientasi Mahasiswa Baru', active: false },
          { label: `${summary.totalMaba} Registrasi Maba`, active: true }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[180px] h-10 bg-[var(--theme-bg)]/80 backdrop-blur-sm border-[var(--theme-border-muted)] font-bold text-xs text-[var(--theme-text-muted)] hover:border-[var(--theme-primary)]/30 focus:ring-0">
                <SelectValue placeholder="Semua Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Periode</SelectItem>
                {periodsList.length > 0 ? periodsList.map(p => (
                  <SelectItem key={p.id || p.ID} value={String(p.sevima_id || p.id || p.ID)}>
                    {p.AcademicYear} · {p.Semester} {p.IsActive ? '⭐' : ''}
                  </SelectItem>
                )) : periodeOptions.map(p => (
                  <SelectItem key={p} value={p}>Angkatan {p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={handleSyncSevima} disabled={isSyncingSevima}
              className="h-10 px-4 rounded-xl border border-[var(--theme-primary)]/30 bg-[var(--theme-primary)]/10 text-xs font-bold uppercase tracking-wider text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0">
              {isSyncingSevima ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>cloud_sync</span>} Sinkronisasi Sevima
            </button>
            <button onClick={() => { fetchSummary(); fetchStudents() }} disabled={loading}
              className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none">
              {loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: 13 }}>sync</span>} Refresh Data
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <PrimaryStatsCard
          title="Registrasi Maba"
          value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]">sync</span> : summary.totalMaba}
          icon={Users}
          colorTheme="info"
          badgeText="Total mahasiswa baru"
          onClick={() => handleOpenStatsDetail('totalMaba', 'Registrasi Maba')}
        />
        <PrimaryStatsCard
          title="Sertifikasi Lulus"
          value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]">sync</span> : summary.totalLulus}
          icon={CheckCircle}
          colorTheme="success"
          badgeText="Dinyatakan lulus PKKMB"
          onClick={() => handleOpenStatsDetail('totalLulus', 'Sertifikasi Lulus')}
        />
        <PrimaryStatsCard
          title="Sertifikat Terbit"
          value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]">sync</span> : summary.totalSertifikat}
          icon={Award}
          colorTheme="primary"
          badgeText="Telah di-generate"
          onClick={() => handleOpenStatsDetail('totalSertifikat', 'Sertifikat Terbit')}
        />
        <PrimaryStatsCard
          title="Dalam Proses"
          value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]">sync</span> : summary.totalProses}
          icon={Clock}
          colorTheme="warning"
          badgeText="Masih dalam penilaian"
          onClick={() => handleOpenStatsDetail('totalProses', 'Dalam Proses')}
        />
      </div>

      {/* NEW: 5W1H Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* WHAT → Distribusi Status (Donut/Pie Chart) */}
        <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="w-12 h-12 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">pie_chart</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Analisis Kelulusan</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Distribusi Status</h3>
              </div>
            </div>
            {/* Simple Donut visualization */}
            <div className="flex items-center justify-center gap-4">
              <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  {distribusi.Total > 0 ? (
                    <>
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--theme-success)" strokeWidth="3" strokeDasharray={`${(distribusi.Lulus / distribusi.Total) * 100} ${100 - (distribusi.Lulus / distribusi.Total) * 100}`} strokeDashoffset="0" transform="rotate(-90 18 18)" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--theme-warning)" strokeWidth="3" strokeDasharray={`${(distribusi.Proses / distribusi.Total) * 100} ${100 - (distribusi.Proses / distribusi.Total) * 100}`} strokeDashoffset={`-${(distribusi.Lulus / distribusi.Total) * 100}`} transform="rotate(-90 18 18)" />
                      <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--theme-error)" strokeWidth="3" strokeDasharray={`${(distribusi.Gagal / distribusi.Total) * 100} ${100 - (distribusi.Gagal / distribusi.Total) * 100}`} strokeDashoffset={`-${(distribusi.Lulus / distribusi.Total + distribusi.Proses / distribusi.Total) * 100}`} transform="rotate(-90 18 18)" />
                    </>
                  ) : (
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--theme-border)" strokeWidth="3" />
                  )}
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-extrabold text-[var(--theme-text)]">{distribusi.Total}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--theme-success)]" />
                  <span className="text-xs font-medium text-[var(--theme-text-muted)]">Lulus: {distribusi.Lulus}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--theme-warning)]" />
                  <span className="text-xs font-medium text-[var(--theme-text-muted)]">Proses: {distribusi.Proses}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[var(--theme-error)]" />
                  <span className="text-xs font-medium text-[var(--theme-text-muted)]">Gagal: {distribusi.Gagal}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* WHAT → Distribusi Nilai (Bar Chart) */}
        <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="w-12 h-12 bg-[var(--theme-info-light)] rounded-xl flex justify-center items-center text-[var(--theme-info)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">bar_chart</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Statistik Akademik</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Distribusi Nilai</h3>
              </div>
            </div>
            {/* Horizontal Bar Chart */}
            <div className="space-y-2">
              {nilaiDist.length > 0 ? nilaiDist.map((item, i) => {
                const maxCount = Math.max(...nilaiDist.map(d => d.count), 1)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] w-12">{item.range}</span>
                    <div className="flex-1 h-5 bg-[var(--theme-surface)] border border-[var(--theme-border-muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--theme-primary)] rounded-full transition-all" style={{ width: `${(item.count / maxCount) * 100}%` }} />
                    </div>
                    <span className="text-xs font-black text-[var(--theme-text)] w-8 text-right">{item.count}</span>
                  </div>
                )
              }) : (
                <div className="text-center py-8 text-xs text-[var(--theme-text-subtle)]">Tidak ada data nilai</div>
              )}
            </div>
          </div>
        </div>

        {/* WHO → Breakdown Gender */}
        <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="w-12 h-12 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">group</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Demografi Peserta</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Per Gender</h3>
              </div>
            </div>
            <div className="space-y-3">
              {genderStats.filter(item => item.gender === 'Laki-laki' || item.gender === 'Perempuan').length > 0 ? genderStats.filter(item => item.gender === 'Laki-laki' || item.gender === 'Perempuan').map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl text-[var(--theme-primary)]">{item.gender === 'Laki-laki' ? '♂' : item.gender === 'Perempuan' ? '♀' : '?'}</span>
                    <span className="text-sm font-bold text-[var(--theme-text)]">{item.gender || 'Unknown'}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-extrabold text-[var(--theme-text)]">{item.total}</span>
                    <span className="text-[10px] text-[var(--theme-success)] font-semibold ml-1">({item.lulus} lulus)</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-xs text-[var(--theme-text-subtle)]">Tidak ada data gender</div>
              )}
            </div>
          </div>
        </div>

        {/* WHO → Per Angkatan */}
        <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="w-12 h-12 bg-[var(--theme-warning-light)] rounded-xl flex justify-center items-center text-[var(--theme-warning)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">calendar_month</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Tahun Akademik</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Per Angkatan</h3>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {angkatanStats.length > 0 ? angkatanStats.slice(0, 5).map((item, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-[var(--theme-border-muted)] last:border-0">
                  <span className="text-sm font-bold text-[var(--theme-text)]">{item.angkatan}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--theme-success)] font-medium">{item.lulus} lulus</span>
                    <span className="text-sm font-extrabold text-[var(--theme-text)]">{item.total}</span>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-xs text-[var(--theme-text-subtle)]">Tidak ada data angkatan</div>
              )}
            </div>
          </div>
        </div>

        {/* WHEN → Timeline Kegiatan */}
        <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="w-12 h-12 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">event</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Timeline Pelaksanaan</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Agenda Kegiatan</h3>
              </div>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
              {kegiatanList.length > 0 ? kegiatanList.map((k, i) => (
                <div key={i} className="flex items-center gap-3 py-2.5 border-b border-[var(--theme-border-muted)] last:border-0 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary-light)] border border-[var(--theme-border-muted)] flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-[var(--theme-primary)]">{parseDay(k.tanggal)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[var(--theme-text)] truncate" title={k.nama || 'Tidak ada nama'}>{k.nama || 'Tidak ada nama'}</p>
                    <p className="text-[10px] text-[var(--theme-text-muted)] truncate" title={`${formatFullDate(k.tanggal)} · ${k.lokasi || '-'}`}>{formatFullDate(k.tanggal)} · {k.lokasi || '-'}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 text-xs text-[var(--theme-text-subtle)]">Tidak ada agenda</div>
              )}
            </div>
          </div>
        </div>

        {/* HOW → Batas Nilai */}
        <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="w-12 h-12 bg-[var(--theme-success-light)] rounded-xl flex justify-center items-center text-[var(--theme-success)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Kriteria Kelulusan</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Batas Kelulusan</h3>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center py-4">
              <div className="relative w-20 h-20">
                <svg viewBox="0 0 36 36" className="w-full h-full">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--theme-border-muted)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="var(--theme-success)" strokeWidth="3" strokeDasharray="75 25" strokeDashoffset="0" transform="rotate(-90 18 18)" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xl font-extrabold text-[var(--theme-success)]">{batasNilai}</span>
                </div>
              </div>
              <p className="text-xs text-[var(--theme-text-muted)] mt-3 font-medium">Nilai minimum untuk lulus</p>
              <p className="text-[10px] text-[var(--theme-text-subtle)] mt-1">Di bawah ini = Gagal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl p-1.5 w-fit shadow-sm mb-4">
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); setFilter('all') }}
            className={cn('flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
              activeTab === t.key ? 'bg-[var(--theme-primary)] text-white shadow-md' : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface)]')}>
            <t.icon size={14} />{t.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div>
        {activeTab === 'prodi' ? (
          <DataTable
            title="Daftar Program Studi"
            subtitle="Menampilkan daftar program studi di fakultas."
            data={data}
            columns={prodiColumns}
            searchable={true}
            searchPlaceholder="Cari program studi..."
            loading={loading}
            filters={[
              {
                key: 'status',
                placeholder: 'Status',
                options: [
                  { value: 'Optimal', label: 'Optimal' },
                  { value: 'Kurang', label: 'Kurang' }
                ],
                className: 'w-[140px]'
              }
            ]}
          />
        ) : (
          <DataTable
            data={filteredStudents}
            searchable={true}
            searchPlaceholder="Cari nama atau NIM..."
            loading={loading}
            filters={[
              {
                key: 'StatusKelulusan',
                placeholder: 'Status',
                options: [
                  { value: 'Lulus', label: 'Lulus' },
                  { value: 'Proses', label: 'Proses' },
                  { value: 'Gagal', label: 'Gagal' },
                ],
                className: 'w-[140px]'
              }
            ]}
            customTable={({ paginatedData, handleSort, sortConfig }) => {
              const renderSortIcon = (key) => {
                if (sortConfig.key === key) {
                  return sortConfig.direction === 'asc' ? 
                    <span className="material-symbols-outlined text-sm text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>expand_less</span> : 
                    <span className="material-symbols-outlined text-sm text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>expand_more</span>;
                }
                return <span className="material-symbols-outlined text-sm text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: '14px' }}>unfold_more</span>;
              };

              return (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[max-content]">
                  <thead>
                    <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/80 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center">
                      <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">No.</th>
                      <th rowSpan={2} onClick={() => handleSort('Mahasiswa.Nama')} className="p-3 border-r border-[var(--theme-border-muted)] text-left min-w-[200px] cursor-pointer hover:text-slate-900 group">
                        <div className="flex items-center gap-1">Nama {renderSortIcon('Mahasiswa.Nama')}</div>
                      </th>
                      <th rowSpan={2} onClick={() => handleSort('Mahasiswa.ProgramStudi.Nama')} className="p-3 border-r border-[var(--theme-border-muted)] text-left min-w-[150px] cursor-pointer hover:text-slate-900 group">
                        <div className="flex items-center gap-1">Prodi / Kelompok {renderSortIcon('Mahasiswa.ProgramStudi.Nama')}</div>
                      </th>
                      <th rowSpan={2} onClick={() => handleSort('attendanceRate')} className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap cursor-pointer hover:text-slate-900 group">
                        <div className="flex items-center justify-center gap-1">Kehadiran<br />(100%) {renderSortIcon('attendanceRate')}</div>
                      </th>
                      <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">Handbook</th>
                      <th colSpan={3} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Kognitif</th>
                      <th colSpan={8} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Psikomotor</th>
                      <th colSpan={6} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Afektif</th>
                      <th colSpan={3} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Nilai Komponen</th>
                      <th rowSpan={2} onClick={() => handleSort('Nilai')} className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap cursor-pointer hover:text-slate-900 group">
                        <div className="flex items-center justify-center gap-1">Nilai<br />Akhir {renderSortIcon('Nilai')}</div>
                      </th>
                      <th rowSpan={2} onClick={() => handleSort('StatusKelulusan')} className="p-3 border-r border-[var(--theme-border-muted)] cursor-pointer hover:text-slate-900 group">
                        <div className="flex items-center justify-center gap-1">Keterangan {renderSortIcon('StatusKelulusan')}</div>
                      </th>
                      <th rowSpan={2} className="p-3 border-l-4 border-l-[var(--theme-bg)] sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10 whitespace-nowrap">Aksi</th>
                    </tr>
                    <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/40 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center">
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Post Test<br />Day 1</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Post Test<br />Day 2</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br />Kognitif</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Taat<br />Peraturan</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Twibon</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Vidio<br />Analog</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Atribut</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kreativitas<br />Individu</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kreativitas<br />Kelompok</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Fasilitas<br />UBK</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br />Psikomotor</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Etika</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Empati</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Tanggung<br />Jawab</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Disiplin</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Adil</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br />Afektif</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kognitif<br />(25%)</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Psikomotor<br />(35%)</th>
                      <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Afektif<br />(40%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--theme-border-muted)] text-[12px] text-[var(--theme-text)]">
                    {paginatedData.map((row, i) => {
                      const st = getLulus(row.StatusKelulusan);
                      return (
                        <tr key={row.ID || i} className="hover:bg-[var(--theme-bg)]/30 transition-colors group/row">
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[var(--theme-text-muted)]">{i + 1}</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)]">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${st.dot}`} />
                              <div>
                                <p className="font-bold text-sm leading-tight text-[var(--theme-text)]">{row.Mahasiswa?.Nama || '-'}</p>
                                <p className="text-[10px] text-[var(--theme-text-muted)] font-bold">{row.Mahasiswa?.NIM || '-'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-[11px] leading-tight">
                            <p className="font-semibold text-[var(--theme-text-muted)]">{row.Mahasiswa?.ProgramStudi?.Nama || '-'}</p>
                            <p className="font-bold text-[var(--theme-primary)]">{row.group_name || '-'}</p>
                          </td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[var(--theme-primary)]">{row.attendanceRate || 0}%</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold">0</td>

                          {/* Kognitif */}
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">0.0</td>

                          {/* Psikomotor */}
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">0.0</td>

                          {/* Afektif */}
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">0.0</td>

                          {/* Komponen */}
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-primary)]">0.0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-primary)]">0.0</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-primary)]">0.0</td>

                          {/* Akhir */}
                          <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[14px] text-[var(--theme-primary)] bg-[var(--theme-primary)]/5">{row.Nilai || '0'}</td>
                          <td className="p-3 border-r border-[var(--theme-border-muted)]">
                            <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider whitespace-nowrap', st.cls)}>
                              <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)} />{row.StatusKelulusan || 'Proses'}
                            </span>
                          </td>
                          <td className="p-3 border-l-4 border-l-[var(--theme-bg)] sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10 text-center">
                            <button
                              onClick={() => setSelected(row)}
                              className="w-8 h-8 rounded-lg bg-[var(--theme-bg)] text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 flex items-center justify-center transition-colors mx-auto"
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              );
            }}
          />
        )}
      </div>

      {/* Detail Modal */}
      <DialogModal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        icon="person"
        title="Detail Peserta"
        subtitle="Informasi kehadiran dan nilai kelulusan"
        maxWidth="max-w-md"
        footer={<ModalCancelButton onClick={() => setSelected(null)}>Tutup</ModalCancelButton>}
      >
        {selected && (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <StudentAvatar
                src={getFullUrl(selected?.Mahasiswa?.FotoURL || selected?.Mahasiswa?.foto_url || selected?.Mahasiswa?.Foto || selected?.Mahasiswa?.Pengguna?.Foto)}
                name={selected?.Mahasiswa?.Nama}
                className="w-20 h-20 rounded-3xl shadow-xl ring-4 ring-[var(--theme-bg)]"
              />
              <div>
                <h4 className="text-base font-extrabold text-[var(--theme-text)]">{selected?.Mahasiswa?.Nama}</h4>
                <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">
                  {selected?.Mahasiswa?.NIM} · {selected?.Mahasiswa?.ProgramStudi?.Nama || '—'}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { icon: Activity, label: 'Kehadiran', value: `${selected.attendanceRate || 0}%` },
                { icon: GraduationCap, label: 'Nilai Akhir', value: selected.Nilai || 0 },
                { icon: CheckCircle, label: 'Status Kelulusan', value: selected.StatusKelulusan || 'Proses' },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] hover:bg-white hover:shadow-sm transition-all">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[var(--theme-primary)] shadow-sm border border-[var(--theme-border)] flex-shrink-0"><r.icon size={16} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-[0.15em]">{r.label}</p>
                    <p className="text-sm font-semibold text-[var(--theme-text)]">{r.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[var(--theme-border)]">
              <h5 className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-3">Informasi Biodata (Sevima)</h5>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Fakultas / Jurusan', value: selected?.Mahasiswa?.Fakultas?.Nama, fullWidth: true },
                  { label: 'Program Studi', value: selected?.Mahasiswa?.ProgramStudi?.Nama, fullWidth: true },
                  { label: 'Jalur Masuk', value: selected?.Mahasiswa?.JalurMasuk },
                  { label: 'Gelombang', value: selected?.Mahasiswa?.Gelombang },
                  { label: 'Sistem Kuliah', value: selected?.Mahasiswa?.SistemKuliah },
                  { label: 'NIK', value: selected?.Mahasiswa?.NIK },
                  { label: 'NISN', value: selected?.Mahasiswa?.NISN },
                  { label: 'Tempat, Tgl Lahir', value: selected?.Mahasiswa?.TempatLahir && selected?.Mahasiswa?.TanggalLahir ? `${selected.Mahasiswa.TempatLahir}, ${new Date(selected.Mahasiswa.TanggalLahir).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : '-' },
                  { label: 'Agama', value: selected?.Mahasiswa?.Agama },
                  { label: 'Jenis Kelamin', value: selected?.Mahasiswa?.JenisKelamin === 'L' ? 'Laki-Laki' : selected?.Mahasiswa?.JenisKelamin === 'P' ? 'Perempuan' : selected?.Mahasiswa?.JenisKelamin },
                  { label: 'Kewarganegaraan', value: selected?.Mahasiswa?.Kewarganegaraan || 'WNI' },
                  { label: 'Nama Ibu Kandung', value: selected?.Mahasiswa?.NamaIbuKandung },
                  { label: 'Kelurahan / Desa', value: selected?.Mahasiswa?.DesaDomisili || selected?.Mahasiswa?.Desa },
                  { label: 'Kecamatan', value: selected?.Mahasiswa?.KecamatanDomisili || selected?.Mahasiswa?.Kecamatan },
                  { label: 'No. HP / WhatsApp', value: selected?.Mahasiswa?.NoHP },
                  { label: 'Email', value: selected?.Mahasiswa?.EmailPersonal || selected?.Mahasiswa?.Pengguna?.email || selected?.Mahasiswa?.EmailKampus, fullWidth: true, selectable: true },
                ].map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-xl bg-[var(--theme-bg)]/30 border border-[var(--theme-border)] ${item.fullWidth ? 'col-span-2' : ''}`}>
                    <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">{item.label}</p>
                    <p className={`text-sm font-semibold text-[var(--theme-text)] ${item.selectable ? 'select-all whitespace-normal' : 'truncate'}`} title={item.value || '-'}>{item.value || '-'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogModal>

      {/* Stats Detail Modal */}
      <DialogModal
        open={!!statsDetail}
        onOpenChange={(open) => !open && setStatsDetail(null)}
        icon="analytics"
        title={statsDetail?.label}
        subtitle={`Menampilkan ${filteredStatsDetailList.length} mahasiswa dari total ${statsDetail?.list?.length || 0} entri`}
        maxWidth="max-w-lg"
        footer={<ModalCancelButton onClick={() => setStatsDetail(null)}>Tutup</ModalCancelButton>}
      >
        <div className="mb-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: '15px' }} >search</span>
            <input
              type="text"
              placeholder="Cari nama, NIM, atau prodi..."
              value={statsSearch}
              onChange={e => setStatsSearch(e.target.value)}
              className="pl-9 pr-4 h-10 w-full rounded-xl border border-[var(--theme-border)] focus:outline-none focus:border-[var(--theme-primary)] text-sm bg-white placeholder-[var(--theme-text-subtle)] font-semibold text-[var(--theme-text)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-all"
            />
          </div>
        </div>

        <div className="space-y-2">
          {filteredStatsDetailList.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center gap-3">
              <div className="w-12 h-12 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-2xl flex items-center justify-center text-[var(--theme-text-subtle)]">
                <span className="material-symbols-outlined" style={{ fontSize: '22px' }} >group</span>
              </div>
              <div>
                <p className="font-bold text-sm text-[var(--theme-text)]">Tidak ada hasil cocok</p>
                <p className="text-xs text-[var(--theme-text-muted)] max-w-xs mt-0.5">Coba kata kunci pencarian lain atau data sedang kosong.</p>
              </div>
            </div>
          ) : (
            filteredStatsDetailList.map((row, i) => (
              <div key={row.ID || i} className="p-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl hover:border-[var(--theme-primary)]/30 hover:shadow-md transition-all flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <StudentAvatar src={getFullUrl(row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url || row.Mahasiswa?.Foto || row.Mahasiswa?.Pengguna?.Foto)} name={row.Mahasiswa?.Nama} className="w-10 h-10 rounded-xl" />
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-[var(--theme-text)] leading-tight truncate">{row.Mahasiswa?.Nama || '—'}</p>
                    <p className="text-[10px] text-[var(--theme-text-muted)] font-semibold mt-0.5 truncate">{row.Mahasiswa?.NIM || '—'} · {row.Mahasiswa?.ProgramStudi?.Nama || '—'}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {statsDetail?.key === 'totalSertifikat' && row.Mahasiswa?.PkkmbSertifikat ? (
                    <div className="flex flex-col items-end">
                      <span className="inline-flex items-center gap-1 bg-[var(--theme-success-light)] border border-[var(--theme-success)]/20 text-[var(--theme-success)] font-semibold px-2 py-0.5 rounded-lg text-[9px] uppercase tracking-wider">
                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }} >check_circle</span>
                        Tersedia
                      </span>
                      {row.Mahasiswa?.PkkmbSertifikat?.FileURL && (
                        <a href={getFullUrl(row.Mahasiswa.PkkmbSertifikat.FileURL)} target="_blank" rel="noreferrer" className="text-[10px] text-[var(--theme-primary)] font-bold hover:underline mt-1 flex items-center gap-0.5">
                          <span className="material-symbols-outlined" style={{ fontSize: '10px' }} >download</span> Download
                        </a>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-black text-[var(--theme-text)] tabular-nums">{row.Nilai || 0}</span>
                      <span className="text-[9px] font-semibold text-[var(--theme-text-muted)] mt-0.5 uppercase tracking-wider">Hadir: {row.attendanceRate || 0}%</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogModal>
    </PageContent>
  )
}
