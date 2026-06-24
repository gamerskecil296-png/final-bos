"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { PrimaryStatsCard, SecondaryStatsCard } from '@/components/ui/StatsCard'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { SelectField, SelectOption } from '@/components/ui/SelectField'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'
import { usePermission } from '@/hooks/usePermission'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

const Phone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>phone</span>;
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const Building2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>business</span>;
const LayoutGrid = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>grid_view</span>;
const Group = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>award_star</span>;
const CorporateFare = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>corporate_fare</span>;
const School = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const Stars = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>stars</span>;
const GroupAdd = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group_add</span>;



const JENJANG_STYLES = {
  S1: 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border border-[var(--theme-info)]/10',
  S2: 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/10',
  S3: 'bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)] border border-[var(--theme-secondary)]/10',
  D3: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border border-[var(--theme-success)]/10',
  D4: 'bg-teal-50 text-teal-700 border border-teal-200/50',
  Profesi: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border border-[var(--theme-warning)]/10',
  DEFAULT: 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]'
}

export default function KelolaFakultas() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [rawFaculties, setRawFaculties] = useState([])
  const [academicPeriods, setAcademicPeriods] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriode, setSelectedPeriode] = useState('all')
  const [selectedFakultasFilter, setSelectedFakultasFilter] = useState(localStorage.getItem('superadmin_fakultas_id') || 'all')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ Nama: '', Kode: '', Email: '', NoHP: '', Dekan: '' })

  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const { hasPermission } = usePermission()

  const [selectedFacultyDetails, setSelectedFacultyDetails] = useState(null)
  const [isFacultyDetailsOpen, setIsFacultyDetailsOpen] = useState(false)
  const [isAllFacultiesOpen, setIsAllFacultiesOpen] = useState(false)
  const [isAllProdiOpen, setIsAllProdiOpen] = useState(false)

  const fetchData = async ({ syncFromPddikti = false, showSyncToast = false } = {}) => {
    setLoading(true)
    try {
      if (syncFromPddikti) {
        await adminService.syncPddikti('Universitas Bhakti Kencana', 'all')
        if (showSyncToast) toast.success('Sinkronisasi Data Fakultas Berhasil')
      }
      const [facRes, perRes] = await Promise.all([
        adminService.getAllFaculties(),
        adminService.getAllAcademicPeriods()
      ])
      if (facRes.status === 'success') {
        setRawFaculties(facRes.data || [])
      } else {
        toast.error('Gagal memuat sinkronisasi data')
      }
      if (perRes.status === 'success') {
        setAcademicPeriods(perRes.data || [])
      }
    } catch { toast.error('Koneksi node terputus') } finally { setLoading(false) }
  }

  useEffect(() => {
    let fetchedData = rawFaculties
    if (selectedFakultasFilter && selectedFakultasFilter !== 'all') {
      fetchedData = fetchedData.filter(f => String(f.id || f.ID) === selectedFakultasFilter)
    }

    const activeProdi = localStorage.getItem('superadmin_prodi_id')
    if (activeProdi && activeProdi !== 'all') {
      fetchedData = fetchedData.map(f => {
        const prodis = f.ProgramStudi || f.program_studi || []
        const filteredProdis = prodis.filter(p => String(p.id || p.ID) === activeProdi)
        return {
          ...f,
          ProgramStudi: filteredProdis,
          ...(f.program_studi ? { program_studi: filteredProdis } : {})
        }
      }).filter(f => f.ProgramStudi.length > 0)
    }

    setData(fetchedData)
  }, [rawFaculties, selectedFakultasFilter])

  useEffect(() => { fetchData() }, [])

  const handleSyncSevimaFakultas = async () => {
    setIsSyncing(true)
    try {
      const resFak = await adminService.syncSevimaFakultas()
      if (resFak.data?.status === 'success' || resFak.status === 'success') {
        toast.success(`Sinkronisasi Fakultas Berhasil! ${resFak.data?.total || resFak.total || 0} Fakultas diproses.`)
      }
      await fetchData()
    } catch {
      toast.error('Gagal sinkronisasi data fakultas dari Sevima')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleResetData = async () => {
    setIsResetting(true)
    try {
      const res = await adminService.resetFakultas()
      if (res.status === 'success') {
        toast.success('Data fakultas berhasil direset/dihapus total!')
      }
      fetchData()
    } catch {
      toast.error('Gagal mereset data fakultas')
    } finally {
      setIsResetting(false)
    }
  }

  const handleOpenAdd = () => { setIsEditMode(false); setForm({ Nama: '', Kode: '', Email: '', NoHP: '', Dekan: '' }); setIsCrudOpen(true) }
  const handleOpenEdit = (row) => { setIsEditMode(true); setForm({ ID: row.id || row.ID, Nama: row.Nama || '', Kode: row.Kode || '', Email: row.Email || '', NoHP: row.NoHP || '', Dekan: row.Dekan || '' }); setIsCrudOpen(true) }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const targetId = form.ID || form.id
      const res = targetId ? await adminService.updateFaculty(targetId, form) : await adminService.createFaculty(form)
      if (res.status === 'success') {
        toast.success(targetId ? 'Data fakultas berhasil diperbarui' : 'Registrasi fakultas baru berhasil')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menyimpan konfigurasi')
      }
    } catch { toast.error('Terjadi kegagalan operasional internal') } finally { setIsSubmitting(false) }
  }

  const handleResetFakultas = async () => {
    setIsResetting(true)
    try {
      await adminService.resetFakultas()
      toast.success('Semua data Fakultas berhasil dikosongkan (dibotakkin)!')
      setIsResetModalOpen(false)
      fetchData()
    } catch (err) {
      console.error("Reset Fakultas Error:", err)
      toast.error(err.message || 'Gagal mengosongkan data fakultas')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      await adminService.deleteFaculty(selected.id || selected.ID)
      toast.success('Entitas fakultas berhasil dihapus')
      setIsDelOpen(false)
      fetchData()
    } catch { toast.error('Gagal menghapus entitas data') } finally { setIsSubmitting(false) }
  }

  const columns = [
    {
      key: 'Kode',
      label: 'Kode Unit',
      className: 'w-[120px]',
      render: v => <Badge variant="outline" className="font-semibold text-[var(--theme-text-muted)] font-headline uppercase text-[9px] tracking-[0.2em] border-[var(--theme-border)] bg-[var(--theme-bg)] px-2.5 py-1 rounded-md">{v || '—'}</Badge>
    },
    {
      key: 'Nama',
      label: 'Nama Fakultas',
      className: 'min-w-[260px]',
      render: v => <span className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px]">{v || '—'}</span>
    },
    {
      key: 'Dekan',
      label: 'Pimpinan / Dekan',
      className: 'w-[220px]',
      render: v => <span className="text-[12px] font-medium text-[var(--theme-text-muted)] font-body tracking-tight">{v || '—'}</span>
    },
    {
      key: 'Email',
      label: 'Kontak Resmi',
      className: 'w-[200px]',
      render: (v, row) => (
        <div className="flex flex-col leading-tight gap-1.5">
          <div className="flex items-center gap-2 text-[var(--theme-text)]">
            <div className="size-4 rounded bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)]"><span className="material-symbols-outlined" style={{ fontSize: '10px' }} >mail</span></div>
            <span className="text-[11px] font-semibold font-body lowercase">{v || '—'}</span>
          </div>
          <div className="flex items-center gap-2 text-[var(--theme-text-subtle)]">
            <div className="size-4 rounded bg-[var(--theme-bg)] flex items-center justify-center"><Phone size={10} /></div>
            <span className="text-[10px] font-semibold tracking-widest">{row.NoHP || '—'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'JumlahProdi',
      label: 'Total Prodi',
      className: 'w-[120px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => (
        <div className="flex flex-col items-center gap-1">
          <span className="font-semibold text-[var(--theme-primary)] text-[15px] font-headline leading-none tabular-nums">{v || row.jumlah_prodi || 0}</span>
          <span className="text-[8px] font-semibold text-[var(--theme-text-subtle)] uppercase tracking-wider">Programs</span>
        </div>
      )
    }
  ]

  // Enriched metrics calculations
  const allProdis = data.flatMap(fac => fac.ProgramStudi || fac.program_studi || [])
  const totalProdi = allProdis.length
  const akreditasiA = allProdis.filter(p => {
    const akr = (p.Akreditasi || p.akreditasi || '').toUpperCase()
    return akr === 'A' || akr === 'UNGGUL'
  }).length

  // Sebaran Jenjang (for Donut Chart)
  const jenjangCounts = {}
  allProdis.forEach(p => {
    const j = p.Jenjang || p.jenjang || 'Lainnya'
    jenjangCounts[j] = (jenjangCounts[j] || 0) + 1
  })
  const jenjangChartData = Object.entries(jenjangCounts).map(([name, value]) => ({ name, value }))

  // Sebaran Akreditasi (for Bar Chart)
  const akreditasiCounts = {}
  allProdis.forEach(p => {
    const a = p.Akreditasi || p.akreditasi || 'Belum Terakreditasi'
    akreditasiCounts[a] = (akreditasiCounts[a] || 0) + 1
  })
  const akreditasiChartData = Object.entries(akreditasiCounts).map(([name, value]) => ({ name, value }))

  const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6']

  const extraStats = useMemo(() => {
    // 1. Who - Top Faculty (biggest by prodi count)
    let topFaculty = '—'
    let topFacultyProdiCount = 0
    data.forEach(fac => {
      const prodis = fac.ProgramStudi || fac.program_studi || []
      if (prodis.length > topFacultyProdiCount) {
        topFaculty = fac.Nama || fac.nama || '—'
        topFacultyProdiCount = prodis.length
      }
    })

    // Shorten faculty name
    let shortTopFaculty = '—'
    if (topFaculty !== '—') {
      shortTopFaculty = topFaculty
        .replace(/Fakultas\s+/i, '')
        .replace(/Sains\s+dan\s+Teknologi/i, 'Sains & Tek')
        .replace(/Sains\s+&\s+Teknologi/i, 'Sains & Tek')
    }

    // 2. What - Top Jenjang
    const jenjangCounts = {}
    allProdis.forEach(p => {
      const j = p.Jenjang || p.jenjang || 'Lainnya'
      jenjangCounts[j] = (jenjangCounts[j] || 0) + 1
    })
    let topJenjang = '—'
    let topJenjangCount = 0
    Object.entries(jenjangCounts).forEach(([j, count]) => {
      if (count > topJenjangCount) {
        topJenjang = j
        topJenjangCount = count
      }
    })

    // 3. Why - Best Akreditasi
    let akreditasiTerbaik = '—'
    let maxAkrCount = 0
    Object.entries(akreditasiCounts).forEach(([a, count]) => {
      if (count > maxAkrCount) {
        akreditasiTerbaik = a
        maxAkrCount = count
      }
    })

    // Calculate Bottom Faculty
    let bottomFaculty = '—'
    let minFacultyProdiCount = Infinity
    data.forEach(fac => {
      const prodis = fac.ProgramStudi || fac.program_studi || []
      if (prodis.length < minFacultyProdiCount) {
        bottomFaculty = fac.Nama || fac.nama || '—'
        minFacultyProdiCount = prodis.length
      }
    })
    if (minFacultyProdiCount === Infinity) {
      bottomFaculty = '—'
    } else {
      bottomFaculty = bottomFaculty
        .replace(/Fakultas\s+/i, '')
        .replace(/Sains\s+dan\s+Teknologi/i, 'Sains & Tek')
        .replace(/Sains\s+&\s+Teknologi/i, 'Sains & Tek')
    }

    const jenjangDominan = topJenjang;

    return {
      topFaculty: shortTopFaculty,
      bottomFaculty,
      jenjangDominan,
      akreditasiTerbaik,
      rasioUnggulPct: allProdis.length > 0 ? Math.round((akreditasiA / allProdis.length) * 100) : 0
    }
  }, [data, allProdis, akreditasiCounts])

  const prodiModalColumns = [
    {
      key: 'index',
      label: '#',
      className: 'w-[60px]',
      render: (_, __, idx) => <span className="text-[var(--theme-text-subtle)] font-semibold">{idx + 1}</span>
    },
    {
      key: 'Kode',
      label: 'Kode',
      className: 'w-[120px]',
      render: (v, row) => (
        <code className="text-[11px] font-semibold text-[var(--theme-info)] tracking-wider bg-[var(--theme-info-light)] px-2 py-1 rounded">
          {v || row.kode || '—'}
        </code>
      )
    },
    {
      key: 'Jenjang',
      label: 'Jenjang',
      className: 'w-[100px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => {
        const val = v || row.jenjang || '—'
        const style = JENJANG_STYLES[val] || JENJANG_STYLES.DEFAULT
        return (
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider shadow-sm", style)}>
            {val}
          </span>
        )
      }
    },
    {
      key: 'Nama',
      label: 'Nama Program Studi',
      render: (v, row) => <span className="font-semibold text-[var(--theme-text)] text-sm leading-snug">{v || row.nama || '—'}</span>
    },
    {
      key: 'KepalaProdi',
      label: 'Pimpinan / Kaprodi',
      render: (v, row) => <span className="font-medium text-[var(--theme-text-muted)]">{v || row.kepala_prodi || '—'}</span>
    }
  ]

  const allFacultiesColumns = [
    {
      key: 'index',
      label: '#',
      className: 'w-[60px]',
      render: (_, __, idx) => <span className="text-[var(--theme-text-subtle)] font-semibold">{idx + 1}</span>
    },
    {
      key: 'Kode',
      label: 'Kode Fakultas',
      className: 'w-[140px]',
      render: (v, row) => (
        <code className="text-[11px] font-semibold text-[var(--theme-primary)] tracking-widest bg-[var(--theme-primary-light)] px-2.5 py-1 rounded">
          {v || row.kode || '—'}
        </code>
      )
    },
    {
      key: 'Nama',
      label: 'Nama Fakultas',
      render: (v, row) => <span className="font-semibold text-[var(--theme-text)] text-sm leading-snug">{v || row.nama || '—'}</span>
    },
    {
      key: 'Dekan',
      label: 'Pimpinan / Dekan',
      render: (v, row) => <span className="font-medium text-[var(--theme-text-muted)]">{v || row.dekan || '—'}</span>
    },
    {
      key: 'JumlahProdi',
      label: 'Jumlah Prodi',
      className: 'w-[140px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => (
        <span className="inline-flex px-3 py-1 rounded-full bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-semibold text-xs">
          {v || row.jumlah_prodi || row.ProgramStudi?.length || row.program_studi?.length || 0}
        </span>
      )
    }
  ]

  const allProdiColumns = [
    {
      key: 'index',
      label: '#',
      className: 'w-[50px]',
      render: (_, __, idx) => <span className="text-[var(--theme-text-subtle)] font-semibold">{idx + 1}</span>
    },
    {
      key: 'Kode',
      label: 'Kode Prodi',
      className: 'w-[120px]',
      render: (v, row) => (
        <code className="text-[11px] font-semibold text-[var(--theme-info)] tracking-wider bg-[var(--theme-info-light)] px-2 py-1 rounded">
          {v || row.kode || '—'}
        </code>
      )
    },
    {
      key: 'Jenjang',
      label: 'Jenjang',
      className: 'w-[100px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => {
        const val = v || row.jenjang || '—'
        const style = JENJANG_STYLES[val] || JENJANG_STYLES.DEFAULT
        return (
          <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider shadow-sm", style)}>
            {val}
          </span>
        )
      }
    },
    {
      key: 'Nama',
      label: 'Nama Program Studi',
      render: (v, row) => <span className="font-semibold text-[var(--theme-text)] text-sm leading-snug">{v || row.nama || '—'}</span>
    },
    {
      key: 'FakultasNama',
      label: 'Fakultas',
      render: (v, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--theme-text)] text-[11px]">{v || '—'}</span>
          <span className="text-[9px] font-semibold tracking-wider text-[var(--theme-primary)]">{row.FakultasKode || '—'}</span>
        </div>
      )
    },
    {
      key: 'KepalaProdi',
      label: 'Pimpinan / Kaprodi',
      render: (v, row) => <span className="font-medium text-[var(--theme-text-muted)]">{v || row.kepala_prodi || '—'}</span>
    }
  ]

  const flattenedProdiData = useMemo(() => {
    return data.flatMap(fac =>
      (fac.ProgramStudi || fac.program_studi || []).map(prodi => ({
        ...prodi,
        FakultasNama: fac.Nama || fac.nama,
        FakultasKode: fac.Kode || fac.kode
      }))
    )
  }, [data])

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Kelola"
        highlightedTitle="Fakultas"
        subtitle="Manajemen struktur unit kerja dan sinkronisasi data fakultas di lingkungan Universitas Bhakti Kencana."
        icon="business"
        badges={[
          { label: 'Administrative Hierarchy', active: false }
        ]}
        actions={
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <SelectField
              value={selectedPeriode}
              onValueChange={setSelectedPeriode}
              placeholder="Semua Periode"
              className="w-full sm:w-[200px]"
            >
              <SelectOption value="all">Semua Tahun Periode</SelectOption>
              {academicPeriods.map(p => (
                <SelectOption key={p.id || p.ID} value={String(p.id || p.ID)}>
                  Tahun Ajaran {p.AcademicYear || p.academic_year} - {p.Semester || p.semester}
                </SelectOption>
              ))}
            </SelectField>

            <SelectField
              value={selectedFakultasFilter}
              onValueChange={(val) => {
                setSelectedFakultasFilter(val);
                localStorage.setItem('superadmin_fakultas_id', val);
              }}
              placeholder="Semua Fakultas"
              className="w-full sm:w-[200px]"
            >
              <SelectOption value="all">Semua Fakultas</SelectOption>
              {rawFaculties.map(f => (
                <SelectOption key={f.id || f.ID} value={String(f.id || f.ID)}>
                  {f.Nama || f.nama}
                </SelectOption>
              ))}
            </SelectField>

            <Button
              onClick={() => setIsResetModalOpen(true)}
              variant="danger"
              icon="delete_sweep"
              loading={isResetting}
              className="h-11 px-6 w-full sm:w-auto rounded-xl text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer"
            >
              RESET
            </Button>
            <Button
              onClick={() => setIsSyncModalOpen(true)}
              variant="primary"
              icon="cloud_sync"
              loading={isSyncing}
              className="h-11 px-6 w-full sm:w-auto rounded-xl border-slate-200 text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer"
            >
              SEVIMA Sync
            </Button>
          </div >
        }
      />

{/* ── Enriched Stats Grid ─────────────────────────────────── */ }
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
  <PrimaryStatsCard
    title="Total Fakultas"
    value={data.length}
    icon={Building2}
    colorTheme="info"
    badgeText="Active"
    badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
    onClick={() => setIsAllFacultiesOpen(true)}
  />

  <PrimaryStatsCard
    title="Total Prodi"
    value={totalProdi}
    icon={LayoutGrid}
    colorTheme="primary"
    onClick={() => setIsAllProdiOpen(true)}
  />

  <PrimaryStatsCard
    title="Akreditasi Unggul/A"
    value={<>{akreditasiA.toLocaleString('id-ID')} <span className="text-sm font-bold text-slate-400">Prodi</span></>}
    icon={Award}
    colorTheme="success"
    badgeText="Sangat memuaskan"
    badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
  />

  <PrimaryStatsCard
    title="Fakultas Terbesar"
    value={extraStats.topFaculty}
    icon={CorporateFare}
    colorTheme="info"
  />

  <PrimaryStatsCard
    title="Jenjang Terbanyak"
    value={extraStats.jenjangDominan}
    icon={School}
    colorTheme="primary"
  />

  <PrimaryStatsCard
    title="Rasio Unggul"
    value={`${extraStats.rasioUnggulPct}%`}
    icon={Stars}
    colorTheme="primary"
  />
</div>

{/* ── Enriched Visual Charts Grid ─────────────────────────── */ }
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
  {/* Chart: Demografi & Persebaran (List) */}
  <div className="bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)] shrink-0 transition-transform group-hover:scale-110">
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Ringkasan</span>
          <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Insight Fakultas</h3>
        </div>
      </div>
    </div>

    <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fakultas Terbesar</span>
        <span className="text-xs font-bold text-primary">{extraStats.topFaculty}</span>
      </div>
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Fakultas Terkecil</span>
        <span className="text-xs font-bold text-slate-700">{extraStats.bottomFaculty}</span>
      </div>
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Jenjang Mayoritas</span>
        <span className="text-xs font-bold text-indigo-600">{extraStats.jenjangDominan}</span>
      </div>
      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Akr. Dominan</span>
        <span className="text-xs font-bold text-emerald-600">{extraStats.akreditasiTerbaik}</span>
      </div>
    </div>
  </div>

  {/* Chart 2: Donut Chart - Distribusi Jenjang */}
  <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-emerald-50/80 rounded-xl flex justify-center items-center text-emerald-600 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
          <span className="material-symbols-outlined text-[24px]">donut_small</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Komposisi Pendidikan</span>
          <h3 className="text-sm font-bold text-slate-800 leading-tight">Sebaran Jenjang Program Studi</h3>
        </div>
      </div>
      <div className="h-[180px] w-full flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={jenjangChartData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={4}
              dataKey="value"
              stroke="none"
            >
              {jenjangChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", fontSize: "11px", fontWeight: "bold" }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 mt-4">
      {jenjangChartData.map((item, idx) => (
        <div key={item.name} className="flex items-center gap-2 p-1.5 rounded-md bg-slate-50 border border-slate-100 hover:bg-white transition-colors">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-slate-400 truncate leading-none">{item.name}</p>
            <p className="text-sm font-black text-slate-700 leading-none mt-1">{item.value}</p>
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Chart 3: Akreditasi Prodi */}
  <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
    <div>
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 bg-indigo-50/80 rounded-xl flex justify-center items-center text-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
          <span className="material-symbols-outlined text-[24px]">workspace_premium</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Kualitas Mutu</span>
          <h3 className="text-sm font-bold text-slate-800 leading-tight">Sebaran Akreditasi Nasional</h3>
        </div>
      </div>
      <div className="h-[200px] w-full mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={akreditasiChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", fontSize: "11px", fontWeight: "bold" }}
            />
            <Bar dataKey="value" name="Jumlah Prodi" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  </div>
</div>

{/* ── Table Section ────────────────────────────────────────── */ }
      <div>
        <div>
          <DataTable
            title="Daftar Fakultas"
            subtitle="Menampilkan daftar seluruh fakultas."
            columns={columns}
            data={data}
            loading={loading}
            searchPlaceholder="Cari nama fakultas atau kode unit..."
            actions={(row) => (
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => navigate(`/app/dashboard/prodi?fakultas=${row.id || row.ID}`)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors shadow-none"
                  title="Lihat Detail Program Studi"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }} >visibility</span>
                </Button>
                {hasPermission('faculty.update') && (
                  <Button onClick={() => handleOpenEdit(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors shadow-none"><span className="material-symbols-outlined" style={{ fontSize: '15px' }} >edit</span></Button>
                )}
                {hasPermission('faculty.delete') && (
                  <Button onClick={() => { setSelected(row); setIsDelOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shadow-none"><span className="material-symbols-outlined" style={{ fontSize: '15px' }} >delete</span></Button>
                )}
              </div>
            )}
          />
        </div>
      </div>

      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        icon={isEditMode ? "edit" : "add"}
        subtitle="Unit Configuration"
        title={isEditMode ? 'Update Fakultas' : 'Registrasi Unit'}
        maxWidth="max-w-lg"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} />
            <ModalSaveButton onClick={handleSave} loading={isSubmitting}>
              {isEditMode ? 'Update' : 'Simpan Perubahan'}
            </ModalSaveButton>
          </>
        }
      >
        <form id="fakultas-form" onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Nama Lengkap Fakultas</Label>
              <Input required value={form.Nama} onChange={e => setForm({ ...form, Nama: e.target.value })} placeholder="Fakultas..." className="h-10 rounded-xl border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Kode Unit</Label>
              <Input required value={form.Kode} onChange={e => setForm({ ...form, Kode: e.target.value })} placeholder="Ex: FSK" className="h-10 rounded-xl border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body uppercase" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Pimpinan Unit (Dekan)</Label>
            <Input value={form.Dekan} onChange={e => setForm({ ...form, Dekan: e.target.value })} placeholder="Lengkap dengan gelar akademik..." className="h-10 rounded-xl border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Email Korespondensi</Label>
              <Input type="email" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} placeholder="fakultas@bku.ac.id" className="h-10 rounded-xl border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Hotline / Telepon</Label>
              <Input value={form.NoHP} onChange={e => setForm({ ...form, NoHP: e.target.value.replace(/\D/g, '') })} placeholder="08..." className="h-10 rounded-xl border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body" />
            </div>
          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Destroy Faculty Entity?"
        description="Aksi ini akan menghapus permanen entitas fakultas dan seluruh relasi program studi di bawahnya. Prosedur ini tidak dapat dibatalkan."
        loading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onConfirm={() => {
          setIsSyncModalOpen(false);
          handleSyncSevimaFakultas();
        }}
        title="Sinkronisasi Fakultas SEVIMA?"
        description="Apakah Anda yakin ingin menyinkronkan data Fakultas dari SEVIMA? Aksi ini akan menarik data fakultas terbaru dan mungkin menimpa perubahan manual."
        loading={isSyncing}
        confirmText="YA, SINKRONISASI"
        confirmClassName="bg-[var(--theme-primary)] hover:brightness-90 text-white"
      />

      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          setIsResetModalOpen(false);
          handleResetData();
        }}
        title="Hard Reset Data Fakultas?"
        description="PERINGATAN: Aksi ini akan menghapus SELURUH data fakultas dan program studi di bawahnya secara permanen! Apakah Anda benar-benar yakin?"
        loading={isResetting}
      />

      <DialogModal
        open={isAllFacultiesOpen}
        onOpenChange={setIsAllFacultiesOpen}
        icon="business"
        subtitle="Daftar Unit Kerja"
        title="Seluruh Fakultas Universitas Bhakti Kencana"
        maxWidth="max-w-4xl"
        footer={
          <ModalCancelButton onClick={() => setIsAllFacultiesOpen(false)}>Tutup</ModalCancelButton>
        }
      >
        <div>
          <DataTable
            data={data}
            columns={allFacultiesColumns}
            searchable={true}
            searchPlaceholder="Cari unit kerja / fakultas..."
            loading={loading}
          />
        </div>
      </DialogModal>

      <DialogModal
        open={isAllProdiOpen}
        onOpenChange={setIsAllProdiOpen}
        icon="grid_view"
        subtitle="Daftar Program Studi"
        title="Seluruh Program Studi Universitas Bhakti Kencana"
        maxWidth="max-w-3xl"
        footer={
          <ModalCancelButton onClick={() => setIsAllProdiOpen(false)}>Tutup</ModalCancelButton>
        }
      >
        <div>
          <DataTable
            data={flattenedProdiData}
            columns={allProdiColumns}
            searchable={true}
            searchPlaceholder="Cari program studi atau prodi..."
            loading={loading}
          />
        </div>
      </DialogModal>
      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          setIsResetModalOpen(false);
          handleResetFakultas();
        }}
        title="Kosongkan Semua Data Fakultas?"
        description="Peringatan keras! Aksi ini akan mengosongkan (botakkin) semua data Fakultas di sistem Siakad. Apakah Anda yakin ingin melanjutkan?"
        loading={isResetting}
        confirmText="YA, KOSONGKAN DATA"
        confirmClassName="bg-rose-600 hover:bg-rose-700 text-white"
      />

    </PageContent >
  )
}
