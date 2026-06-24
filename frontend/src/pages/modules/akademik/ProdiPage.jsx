"use client"

import React, { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import { toast, Toaster } from "react-hot-toast"
import useAuthStore from '@/store/useAuthStore'
import { usePermission } from '@/hooks/usePermission'
import { cn } from "@/lib/utils"
import api from "@/lib/axios"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/Select"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { pddiktiService, API_BASE_URL, adminService } from "@/services/api"
import { PageContainer, PageHeader, ResponsiveGrid, ResponsiveCard } from "@/components/ui/ResponsiveLayout"
import { DataTable } from "@/components/ui/DataTable"
import { Badge } from "@/components/ui/Badge"
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { DialogModal, ModalCancelButton, ModalSaveButton } from "@/components/ui/DialogModal"
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from "@/components/ui/Button"
// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const GraduationCap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const CheckCircle2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const BookOpen = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>menu_book</span>;

const API = `${API_BASE_URL}/faculty`

const AKRED_STYLES = {
  'Unggul': { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-500' },
  'Baik Sekali': { cls: 'bg-blue-50 text-blue-700 border-blue-200/60', dot: 'bg-blue-500' },
  'Baik': { cls: 'bg-slate-50 text-slate-600 border-slate-200/60', dot: 'bg-slate-400' },
  'A': { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200/60', dot: 'bg-emerald-500' },
  'B': { cls: 'bg-blue-50 text-blue-700 border-blue-200/60', dot: 'bg-blue-500' },
}

const JENJANG_COLORS = {
  'S1': 'bg-[#eef4ff] text-primary',
  'S2': 'bg-purple-50 text-purple-700',
  'D3': 'bg-amber-50 text-amber-700',
}

const EMPTY_FORM = { ID: null, FakultasID: "", Kode: "", Nama: "", Jenjang: "S1", Akreditasi: "Baik" }
const toArray = (x) => {
  if (!x) return [];
  if (Array.isArray(x)) return x;
  if (x.data) {
    if (Array.isArray(x.data)) return x.data;
    if (x.data.data && Array.isArray(x.data.data)) return x.data.data;
  }
  if (Array.isArray(x.data)) return x.data;
  return [];
};

export default function ProdiPage() {
  const { user } = useAuthStore()
  const { hasPermission, withPermissionCheck } = usePermission()
  const canManageProdi = hasPermission('program_studi.manage') || hasPermission('faculty.manage')
  const userRoles = String(user?.role || user?.Role || '').toLowerCase().split(',').map(r => r.trim())
  const isSuperadmin = userRoles.includes('super_admin')
  const [majors, setMajors] = useState([])
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModal] = useState(false)
  const [isEditMode, setIsEdit] = useState(false)
  const [isSubmitting, setIsSub] = useState(false)
  const [deleteTarget, setDelTarget] = useState(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [jenjangOpen, setJenjangOpen] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()
  const [filterFakultasID, setFilterFakultasID] = useState(searchParams.get('fakultas') || 'all')
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [tableFilters, setTableFilters] = useState({})
  const [academicPeriods, setAcademicPeriods] = useState([])

  const fetchPeriods = async () => {
    try {
      const periodRes = await adminService.getAllAcademicPeriods()
      if (periodRes && periodRes.status === 'success' && periodRes.data) {
        setAcademicPeriods(periodRes.data)
      } else if (periodRes?.data?.status === 'success' && periodRes?.data?.data) {
        setAcademicPeriods(periodRes.data.data)
      }
    } catch { }
  }

  useEffect(() => {
    fetchMajors()
  }, [filterPeriode])

  useEffect(() => {
    fetchFaculties()
    fetchPeriods()
  }, [])

  useEffect(() => {
    const fak = searchParams.get('fakultas')
    if (fak) setFilterFakultasID(fak)
  }, [searchParams])

  const fetchMajors = async () => {
    setLoading(true)
    try {
      // 1. Fetch faculties to make sure we have a valid FakultasID
      let activeFacultyID = faculties.length > 0 ? faculties[0].ID : null;
      if (!activeFacultyID) {
        try {
          const facRes = await api.get('/app/dashboard/faculties');
          const facList = toArray(facRes);
          if (facList.length > 0) {
            activeFacultyID = facList[0].ID;
            setFaculties(facList);
          }
        } catch { }
      }

      // 2. Fetch real program studies from database
      let list = []
      const canViewProdi = hasPermission('program_studi.view') || hasPermission('faculty.manage') || isSuperadmin
      if (canViewProdi) {
        if (isSuperadmin) {
          const adminRes = await adminService.getAllProdi({ periode: filterPeriode })
          list = toArray(adminRes)
        } else {
          const res = await api.get(`/app/dashboard/courses?periode=${filterPeriode}`)
          list = toArray(res)
        }
      }
      setMajors(list.map((p, i) => {
        return {
          ID: p.id || p.ID,
          Nama: p.nama || p.Nama,
          Jenjang: p.jenjang || p.Jenjang,
          Kode: p.kode || p.Kode || "FAR",
          Akreditasi: p.akreditasi || p.Akreditasi || "Baik",
          CurrentMahasiswa: p.CurrentMahasiswa !== undefined ? p.CurrentMahasiswa : (p.current_mahasiswa || 0), // Match exact GORM case
          FakultasID: p.FakultasID || p.fakultas_id,
          Fakultas: p.Fakultas || p.fakultas || { Nama: 'Univ. Bhakti Kencana' },
          CreatedAt: p.created_at || p.CreatedAt || new Date('2023-01-01').toISOString()
        };
      }));

    } catch (err) {
      toast.error("Gagal memuat data prodi")
    } finally {
      setLoading(false)
    }
  }

  const fetchFaculties = async () => {
    try {
      // super_admin: gunakan endpoint admin yang mengembalikan SEMUA fakultas
      // faculty_admin: gunakan endpoint faculty yang scope ke fakultas sendiri
      if (isSuperadmin) {
        const res = await adminService.getAllFaculties()
        const list = toArray(res)
        setFaculties(list)
      } else {
        const res = await api.get('/app/dashboard/faculties')
        const list = toArray(res)
        setFaculties(list)
      }
    } catch { }
  }


  const handleSyncProdi = async () => {
    setIsSyncing(true)
    try {
      const res = await adminService.syncSevimaProgramStudi()
      if (res.data?.status === 'success' || res.status === 'success') {
        toast.success(`Sinkronisasi Prodi Berhasil! ${res.data?.total || res.total || 0} Program Studi diproses.`)
      }
      await fetchMajors()
    } catch {
      toast.error('Gagal sinkronisasi data prodi dari Sevima')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleResetData = async () => {
    setIsResetting(true)
    try {
      const res = await adminService.resetProdi()
      if (res.data?.status === 'success' || res.status === 'success') {
        toast.success('Data program studi berhasil direset total!')
        fetchMajors()
      } else {
        toast.error('Gagal mereset data program studi')
      }
    } catch {
      toast.error('Gagal mereset data program studi')
    } finally {
      setIsResetting(false)
    }
  }

  useEffect(() => {
    const fak = searchParams.get('fakultas')
    if (fak) setFilterFakultasID(fak)
  }, [searchParams])

  useEffect(() => {
    if (faculties.length > 0 && !formData.FakultasID) {
      const firstFac = faculties[0];
      setFormData(prev => ({
        ...prev,
        FakultasID: String(firstFac.id || firstFac.ID || '')
      }));
    }
  }, [faculties]);

  const openAdd = () => {
    setIsEdit(false);
    const firstFac = faculties.length > 0 ? faculties[0] : null;
    setFormData({
      ...EMPTY_FORM,
      FakultasID: firstFac ? String(firstFac.id || firstFac.ID || '') : ""
    });
    setIsModal(true)
  }
  const openEdit = (p) => {
    setIsEdit(true)
    const idVal = p.id || p.ID;
    const facIdVal = p.FakultasID || p.fakultas_id || (p.Fakultas?.id || p.Fakultas?.ID || '');
    setFormData({
      ID: idVal,
      FakultasID: String(facIdVal),
      Kode: p.kode || p.Kode || '',
      Nama: p.nama || p.Nama,
      Jenjang: p.jenjang || p.Jenjang || 'S1',
      Akreditasi: p.akreditasi || p.Akreditasi || 'Baik'
    })
    setIsModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // ── Validasi wajib ──────────────────────────────────────────
    const parsedFakID = parseInt(formData.FakultasID)
    if (!parsedFakID || isNaN(parsedFakID) || parsedFakID === 0) {
      toast.error('Pilih Fakultas Naungan terlebih dahulu')
      return
    }
    if (!formData.Kode || !formData.Kode.trim()) {
      toast.error('Kode / Akronim prodi wajib diisi')
      return
    }
    if (!formData.Nama || !formData.Nama.trim()) {
      toast.error('Nama lengkap Program Studi wajib diisi')
      return
    }

    setIsSub(true)
    try {
      const payload = {
        FakultasID: parsedFakID,
        Kode: String(formData.Kode).trim().toUpperCase(),
        Nama: String(formData.Nama).trim(),
        Jenjang: String(formData.Jenjang || 'S1').trim(),
        Akreditasi: String(formData.Akreditasi || 'Baik').trim()
      }

      let res;
      if (isEditMode) {
        // Edit: pakai endpoint yang sesuai role
        if (isSuperadmin) {
          res = await adminService.updateProdi(formData.ID, payload)
          if (res?.status === 'success') {
            toast.success('Program Studi berhasil diperbarui')
            setIsModal(false)
            fetchMajors()
          } else {
            toast.error(res?.message || 'Gagal memperbarui prodi')
          }
        } else {
          res = await api.put(`/app/dashboard/courses/${formData.ID}`, payload)
          if (res.data?.status === 'success' || res.status === 200) {
            toast.success('Program Studi berhasil diperbarui')
            setIsModal(false)
            fetchMajors()
          } else {
            toast.error(res.data?.message || 'Gagal memperbarui prodi')
          }
        }
      } else {
        // Tambah baru: super_admin → /api/admin/prodi, faculty_admin → /faculty/courses
        if (isSuperadmin) {
          res = await adminService.createProdi(payload)
          if (res?.status === 'success') {
            toast.success('Program Studi berhasil ditambahkan')
            setIsModal(false)
            fetchMajors()
          } else {
            toast.error(res?.message || 'Gagal menambahkan prodi')
          }
        } else {
          res = await api.post('/app/dashboard/courses', payload)
          if (res.data?.status === 'success' || res.status === 200 || res.status === 201) {
            toast.success('Program Studi berhasil ditambahkan')
            setIsModal(false)
            fetchMajors()
          } else {
            toast.error(res.data?.message || 'Gagal menambahkan prodi')
          }
        }
      }
    } catch (err) {
      const serverMsg = err.response?.data?.message || err.message || ''
      if (serverMsg.toLowerCase().includes('duplicate') || serverMsg.toLowerCase().includes('unique')) {
        toast.error('Kode atau Nama Prodi sudah terdaftar, gunakan kode/nama lain')
      } else if (serverMsg) {
        toast.error(serverMsg)
      } else {
        toast.error('Gagal menyimpan. Coba lagi.')
      }
    } finally {
      setIsSub(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const idVal = deleteTarget.id || deleteTarget.ID;
    if (!idVal) {
      toast.error("ID prodi tidak valid");
      return;
    }
    setIsSub(true)
    try {
      const res = await api.delete(`/app/dashboard/courses/${idVal}`)
      if (res.data?.status === 'success') {
        toast.success("Program studi dihapus")
        setDelTarget(null)
        fetchMajors()
      } else {
        toast.error("Gagal menghapus prodi")
      }
    } catch {
      toast.error("Gagal menghapus")
    } finally {
      setIsSub(false)
    }
  }

  const set = (k, v) => setFormData(prev => ({ ...prev, [k]: v }))

  const stats = {
    total: majors.length,
    unggul: majors.filter(m => m.Akreditasi === 'Unggul' || m.Akreditasi === 'A').length
  }

  const periodeOptions = useMemo(() => {
    const years = new Set()
    
    // Fallback if no academic periods
    majors.forEach(m => {
      if (m.CreatedAt) {
        const d = new Date(m.CreatedAt)
        if (!isNaN(d.getTime())) years.add(String(d.getFullYear()))
      }
    })

    return Array.from(years).sort((a, b) => Number(b) - Number(a))
  }, [majors])

  const filteredMajors = useMemo(() => {
    let filtered = majors
    if (filterFakultasID !== 'all') {
      filtered = filtered.filter(m => String(m.FakultasID) === filterFakultasID)
    }
    return filtered
  }, [majors, filterFakultasID])

  const totalMahasiswa = filteredMajors.reduce((a, m) => a + (m.CurrentMahasiswa || 0), 0)

  const prodiTerbesar = useMemo(() => {
    if (filteredMajors.length === 0) return '—'
    return filteredMajors.reduce((prev, current) =>
      (prev.CurrentMahasiswa || 0) > (current.CurrentMahasiswa || 0) ? prev : current
    ).Nama || '—'
  }, [filteredMajors])

  const jenjangData = useMemo(() => {
    const counts = {}
    filteredMajors.forEach(m => {
      const j = m.Jenjang || 'Unknown'
      counts[j] = (counts[j] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredMajors])

  const akreditasiData = useMemo(() => {
    const counts = {}
    filteredMajors.forEach(m => {
      const a = m.Akreditasi || 'Baik'
      counts[a] = (counts[a] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [filteredMajors])

  const PIE_COLORS = ['#00236f', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']

  const prodiColumns = [
    {
      key: "index",
      label: "No",
      disableSort: true,
      className: "w-12 text-center",
      cellClassName: "text-center font-bold text-slate-400",
      render: (val, row, index) => index + 1
    },
    {
      key: "Nama",
      label: "Program Studi",
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px]">{val}</span>
          <span className="text-[11px] font-medium text-[var(--theme-text-muted)] font-body tracking-tight mt-0.5">{row.Fakultas?.Nama || "Univ. Bhakti Kencana"}</span>
        </div>
      )
    },
    {
      key: "Jenjang",
      label: "Jenjang",
      className: "text-center",
      cellClassName: "text-center",
      render: (val) => {
        const jk = JENJANG_COLORS[val] || 'bg-slate-50 text-slate-600';
        return (
          <Badge className={cn('font-bold text-[9px] px-2.5 py-0.5 border-none font-inter uppercase tracking-wider shadow-none', jk)}>
            {val || 'S1'}
          </Badge>
        )
      }
    },
    {
      key: "Akreditasi",
      label: "Akreditasi",
      className: "text-center",
      cellClassName: "text-center",
      render: (val) => {
        const ak = AKRED_STYLES[val] || AKRED_STYLES['Baik'];
        return (
          <Badge className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[9px] font-bold border uppercase tracking-wider shadow-none', ak.cls)}>
            <span className={cn('w-1 h-1 rounded-full animate-pulse', ak.dot)} />
            {val}
          </Badge>
        )
      }

    }
  ]

  const renderActions = (row) => (
    <div className="flex items-center justify-end gap-1.5">
      {canManageProdi && (
        <div className="flex items-center justify-end gap-1.5">
          <button onClick={() => openEdit(row)}
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-xl transition-all duration-300" title="Edit">
            <span className="material-symbols-outlined size-4" style={{ fontSize: '16px' }} >edit</span>
          </button>
          <button onClick={() => setDelTarget(row)}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all duration-300" title="Hapus">
            <span className="material-symbols-outlined size-4" style={{ fontSize: '16px' }} >delete</span>
          </button>
        </div>
      )}
    </div>
  )

  const jenjangList = useMemo(() => Array.from(new Set(filteredMajors.map(m => m.Jenjang).filter(Boolean))).sort(), [filteredMajors])
  const akreditasiList = useMemo(() => Array.from(new Set(filteredMajors.map(m => m.Akreditasi).filter(Boolean))).sort(), [filteredMajors])

  const filtersConfig = [
    {
      key: 'Jenjang',
      placeholder: 'Semua Jenjang',
      options: jenjangList.map(j => ({ label: `Jenjang ${j}`, value: j }))
    },
    {
      key: 'Akreditasi',
      placeholder: 'Semua Akreditasi',
      options: akreditasiList.map(a => ({ label: `Akreditasi ${a}`, value: a }))
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />
      <DashboardHero
        title="Program "
        highlightedTitle="Studi"
        subtitle="Kelola kurikulum, jenjang pendidikan, akreditasi."
        icon="school"
        badges={[
          { label: 'Program Studi & Kurikulum', active: false },
          { label: `${filteredMajors.length} Prodi Terdaftar`, active: true }
        ]}
        actions={
          <>
            {faculties.length > 1 && (
              <select
                value={filterFakultasID}
                onChange={(e) => setFilterFakultasID(e.target.value)}
                className="h-10 px-3 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm text-xs font-semibold text-slate-600 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 shadow-sm transition-all"
              >
                <option value="all">Semua Fakultas</option>
                {faculties.map(f => (
                  <option key={f.id || f.ID} value={String(f.id || f.ID)}>
                    {f.Nama || f.nama}
                  </option>
                ))}
              </select>
            )}
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-[160px] h-10 border border-[var(--theme-border)] bg-white/80 backdrop-blur-sm rounded-xl text-xs font-semibold text-[var(--theme-text-muted)] focus:ring-0">
                <SelectValue placeholder="Semua Tahun" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-[var(--theme-surface)]">
                <SelectItem value="all" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">Semua Periode</SelectItem>
                {academicPeriods.length > 0 ? academicPeriods.map(p => (
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
            {isSuperadmin && (
              <>
                <Button
                  onClick={() => setIsResetModalOpen(true)}
                  variant="danger"
                  icon="delete_sweep"
                  loading={isResetting}
                  disabled={isSyncing || isResetting}
                  className="h-11 px-6 w-full sm:w-auto rounded-xl text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer"
                >
                  RESET
                </Button>
                <Button
                  onClick={() => setIsSyncModalOpen(true)}
                  variant="primary"
                  icon="cloud_sync"
                  loading={isSyncing}
                  disabled={isSyncing || isResetting}
                  className="h-11 px-6 w-full sm:w-auto rounded-xl border-slate-200 text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer"
                >
                  SEVIMA Sync
                </Button>
              </>
            )}
          </>
        }
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <PrimaryStatsCard
          title="Total Program Studi"
          value={stats.total}
          icon={GraduationCap}
          colorTheme="primary"
          badgeText="Prodi terdaftar"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">business</span>}
        />
        <PrimaryStatsCard
          title="Akreditasi Unggul"
          value={stats.unggul}
          icon={CheckCircle2}
          colorTheme="success"
          badgeText="Prodi Unggul / A"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
        />
        <PrimaryStatsCard
          title="Total Mahasiswa"
          value={totalMahasiswa}
          icon={Users}
          colorTheme="warning"
          badgeText="Mahasiswa aktif"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">groups</span>}
        />
        <PrimaryStatsCard
          title="Prodi Terbesar"
          value={prodiTerbesar}
          icon={BookOpen}
          colorTheme="info"
          badgeText="Berdasarkan Mhs"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">trending_up</span>}
        />
      </div>

      {/* 5W1H Charts */}
      {!loading && majors.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* WHAT → Distribusi Jenjang */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pie_chart</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Distribusi Jenjang</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Rasio S1 / D3 / S2</h3>
              </div>
            </div>
            <div className="h-[170px] w-full flex items-center justify-center">
              {jenjangData.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={jenjangData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value" stroke="none">
                      {jenjangData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <span className="text-xs text-slate-400 italic">Tidak ada data</span>}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {jenjangData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-[10px] font-bold text-slate-500">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* WHAT → Distribusi Akreditasi */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>verified</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Status Akreditasi</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Kualitas Prodi</h3>
              </div>
            </div>
            <div className="h-[170px] w-full flex items-center justify-center">
              {akreditasiData.length > 0 ? (
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={akreditasiData} cx="50%" cy="50%" innerRadius={42} outerRadius={68} paddingAngle={3} dataKey="value" stroke="none">
                      {akreditasiData.map((_, i) => <Cell key={i} fill={['#10b981', '#3b82f6', '#94a3b8'][i % 3]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <span className="text-xs text-slate-400 italic">Tidak ada data</span>}
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-1">
              {akreditasiData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ['#10b981', '#3b82f6', '#94a3b8'][i % 3] }} />
                  <span className="text-[10px] font-bold text-slate-500">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* Main Data Table */}
      <div className="mt-6 mb-6">
        <DataTable
          title="Daftar Program Studi"
          subtitle="Menampilkan daftar program studi di fakultas."
          columns={prodiColumns}
          data={filteredMajors}
          loading={loading}
          searchPlaceholder="Cari program studi..."
          pagination={true}
          pageSize={10}
          emptyMessage="Tidak Ada Data Program Studi"
          emptyIcon="school"
          filters={filtersConfig}
          filterValues={tableFilters}
          onFilterChange={(key, val) => setTableFilters(prev => ({ ...prev, [key]: val }))}
          actions={renderActions}
        />
      </div>

      {/* CRUD Modal */}
      <DialogModal
        open={isModalOpen}
        onOpenChange={setIsModal}
        icon="school"
        title={isEditMode ? 'Update Data Prodi' : 'Registrasi Prodi Baru'}
        subtitle="Isi semua formulir administrasi di bawah ini dengan lengkap."
        badgeText={isEditMode ? 'Edit Program Studi' : 'Tambah Program Studi'}
        maxWidth="max-w-lg"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsModal(false)} />
            <ModalSaveButton
              form="prodi-form"
              loading={isSubmitting}
              text={isEditMode ? 'Update' : 'Simpan'}
            />
          </>
        }
      >
        <form id="prodi-form" onSubmit={handleSave} className="space-y-4 text-[var(--theme-text)]">
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Fakultas Naungan</label>
            {isSuperadmin ? (
              <div className="relative">
                <select
                  value={formData.FakultasID || ''}
                  onChange={e => set('FakultasID', e.target.value)}
                  className="w-full h-10 pl-3 pr-10 rounded-xl border border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body outline-none transition-colors cursor-pointer appearance-none"
                >
                  <option value="" disabled>Pilih Fakultas...</option>
                  {faculties.map(f => (
                    <option key={f.id || f.ID} value={String(f.id || f.ID)}>
                      {f.Nama || f.nama}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none flex items-center">
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </div>
              </div>
            ) : (
              <input
                type="text"
                value={
                  faculties.find(f => String(f.ID) === String(formData.FakultasID))?.Nama ||
                  (faculties.length > 0 ? faculties[0].Nama : "Universitas Bhakti Kencana")
                }
                readOnly
                disabled
                className="w-full h-10 px-3 rounded-xl border border-[var(--theme-border-muted)] bg-slate-50 text-[var(--theme-text-subtle)] text-sm font-body cursor-not-allowed select-none"
              />
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Kode / Akronim</label>
              <input
                value={formData.Kode}
                onChange={e => set('Kode', e.target.value.toUpperCase())}
                placeholder="TI, SI, MN..."
                required
                className="w-full h-10 px-3 rounded-xl border border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body outline-none transition-colors uppercase"
              />
            </div>

            <div className="space-y-1.5 relative">
              <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Jenjang Pendidikan</label>
              <div className="relative">
                <input
                  value={formData.Jenjang}
                  onChange={e => set('Jenjang', e.target.value)}
                  onFocus={() => setJenjangOpen(true)}
                  onBlur={() => setTimeout(() => setJenjangOpen(false), 200)}
                  placeholder="Ketik atau pilih..."
                  className="w-full h-10 pl-3 pr-10 rounded-xl border border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body outline-none transition-colors"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center">
                  <span className="material-symbols-outlined text-[18px]">expand_more</span>
                </div>
              </div>
              {jenjangOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-[var(--theme-border)] rounded-xl shadow-xl py-1 overflow-y-auto max-h-40">
                  {['S1', 'S2', 'S3', 'D3', 'D4', 'Profesi', 'Spesialis'].map(opt => (
                    <div
                      key={opt}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        set('Jenjang', opt);
                        setJenjangOpen(false);
                      }}
                      className="px-4 py-2 text-sm font-body hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      {opt}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Nama Lengkap Program Studi</label>
            <input
              value={formData.Nama}
              onChange={e => set('Nama', e.target.value)}
              placeholder="Contoh: Teknik Informatika..."
              required
              className="w-full h-10 px-3 rounded-xl border border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Akreditasi Prodi</label>
            <div className="relative">
              <select
                value={formData.Akreditasi}
                onChange={e => set('Akreditasi', e.target.value)}
                className="w-full h-10 pl-3 pr-10 rounded-xl border border-[var(--theme-border)] bg-white text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-sm font-body outline-none transition-colors appearance-none cursor-pointer"
              >
                <option value="Unggul">Unggul</option>
                <option value="Baik Sekali">Baik Sekali</option>
                <option value="Baik">Baik</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center">
                <span className="material-symbols-outlined text-[18px]">expand_more</span>
              </div>
            </div>
          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
        title="Hapus Program Studi?"
        message={`Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada data mahasiswa atau data akademik terkait yang masih menggunakan program studi "${deleteTarget?.Nama || deleteTarget?.nama}" ini.`}
      />

      <DeleteConfirmModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onConfirm={() => {
          setIsSyncModalOpen(false);
          handleSyncProdi();
        }}
        title="Sinkronisasi Prodi SEVIMA?"
        description="Apakah Anda yakin ingin menyinkronkan data Program Studi dari SEVIMA? Aksi ini akan menarik seluruh data terbaru."
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
        title="Hard Reset Data Program Studi?"
        description="PERINGATAN: Aksi ini akan menghapus SELURUH data program studi dari database secara permanen! Apakah Anda benar-benar yakin?"
        loading={isResetting}
      />
    </PageContent>
  )
}
