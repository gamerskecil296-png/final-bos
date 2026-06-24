"use client"

import React, { useState, useEffect, useMemo } from "react"
import { DataTable } from "@/components/ui/DataTable"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { DialogModal, ModalCancelButton, ModalSaveButton } from "@/components/ui/DialogModal"
import { Card, CardContent } from "@/components/ui/Card"
import { Input } from "@/components/ui/Input"
import { Label } from "@/components/ui/Label"
import { Textarea } from "@/components/ui/Textarea"
import { PrimaryStatsCard } from "@/components/ui/StatsCard"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { toast, Toaster } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { adminService, API_BASE_URL } from "@/services/api"
import { usePermission } from "@/hooks/usePermission"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

// Material Symbol Icons
const Trophy = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>emoji_events</span>
const Clock = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>schedule</span>
const CheckCircle2 = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>check_circle</span>
const CloseIcon = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>close</span>
const Star = ({ size = 16, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>star</span>
const Award = ({ size = 16, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>military_tech</span>
const Calendar = ({ size = 16, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>calendar_today</span>
const GraduationCap = ({ size = 16, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>school</span>
const RefreshCw = ({ size = 16, className, animate }) => <span className={cn("material-symbols-outlined shrink-0", animate && "animate-spin", className)} style={{ fontSize: size }}>sync</span>
const ExternalLink = ({ size = 16, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>open_in_new</span>
const Apartment = ({ size = 16, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>apartment</span>
const Users = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>group</span>
const Public = ({ size = 20, className }) => <span className={cn("material-symbols-outlined shrink-0", className)} style={{ fontSize: size }}>public</span>

const AVATAR_COLORS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-pink-500",
  "from-violet-400 to-purple-500",
  "from-cyan-400 to-sky-500",
]

const getInitials = (name = "") => {
  return name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase() || "?"
}

const formatDate = (dateString) => {
  if (!dateString) return "—"
  try {
    return new Date(dateString).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  } catch {
    return dateString
  }
}

const getShortFacultyName = (name) => {
  if (!name || name === 'Tidak ada data' || name === '—') return '—'
  return name
    .replace(/Fakultas\s+/i, '')
    .replace(/Sains\s+dan\s+Teknologi/i, 'Sains & Tek')
    .replace(/Sains\s+&\s+Teknologi/i, 'Sains & Tek')
}

const getCleanImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const baseUrl = API_BASE_URL.replace('/api', '')
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

function StudentAvatar({ src, name, className = "w-9 h-9 rounded-xl" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const hasNoImage = !src || src.trim() === "" || src.endsWith("/profiles/") || src.endsWith("/students/") || src.endsWith("localhost:8000") || src.endsWith("localhost:8000/");

  return (
    <div className={cn("relative bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-inner overflow-hidden", className)}>
      {(!loaded || error || hasNoImage) && (
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute animate-in fade-in" style={{ fontSize: className.includes('w-28') ? '56px' : className.includes('w-14') ? '28px' : '20px' }}>
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

export default function KelolaPrestasi() {
  const { hasPermission } = usePermission()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isVerifyOpen, setIsVerifyOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [expandedFaculty, setExpandedFaculty] = useState(null)
  const [chartFacultyFilter, setChartFacultyFilter] = useState("all")
  const [tableFilters, setTableFilters] = useState({})

  const [isImportOpen, setIsImportOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)

  const [allFaculties, setAllFaculties] = useState([])
  const [allProdi, setAllProdi] = useState([])
  const [allPeriods, setAllPeriods] = useState([])

  const activeFacultyId = localStorage.getItem('superadmin_fakultas_id') || 'all'
  const activeProdiId = localStorage.getItem('superadmin_prodi_id') || 'all'
  const activePeriodId = localStorage.getItem('superadmin_period_id') || 'all'

  // Verification Form State
  const [verifyStatus, setVerifyStatus] = useState("verified")
  const [verifyCatatan, setVerifyCatatan] = useState("")
  const [verifyDanaDisetujui, setVerifyDanaDisetujui] = useState("")
  const [verifyPoin, setVerifyPoin] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [res, facRes, prodRes, periodRes] = await Promise.all([
        adminService.getAllAchievements(),
        adminService.getAllFaculties(),
        adminService.getAllProdi(),
        adminService.getAllAcademicPeriods()
      ])
      if (res.status === "success") {
        setData((res.data || []).map((item, i) => {
          const mhs = item.mahasiswa || {}
          const prodi = mhs.program_studi || mhs.ProgramStudi || {}

          const f_mhs = mhs.fakultas || mhs.Fakultas || {}
          const f_prodi = prodi.fakultas || prodi.Fakultas || {}
          const fnama = f_mhs.nama || f_mhs.Nama || f_prodi.nama || f_prodi.Nama || ''
          const fid = f_mhs.id || f_mhs.ID || f_prodi.id || f_prodi.ID || ''

          return {
            ...item,
            colorIdx: i % AVATAR_COLORS.length,
            fakultas_id: String(fid),
            fakultas_nama: String(fnama),
            prodi_id: String(prodi.id || prodi.ID || ''),
            prodi_nama: String(prodi.nama || prodi.Nama || ''),
            kategori_filter: String(item.kategori || ''),
            semester_filter: mhs.SemesterSekarang || mhs.semester_sekarang ? String(mhs.SemesterSekarang || mhs.semester_sekarang) : '',
            periode_filter: item.tanggal || item.Tanggal ? String(new Date(item.tanggal || item.Tanggal).getFullYear()) : (item.created_at || item.CreatedAt ? String(new Date(item.created_at || item.CreatedAt).getFullYear()) : ''),
            Tipe: item.tipe || item.Tipe || 'Laporan Prestasi',
            DanaDiajukan: item.dana_diajukan || item.DanaDiajukan || 0,
            DanaDisetujui: item.dana_disetujui || item.DanaDisetujui || 0,
            CatatanVerifikator: item.catatan_verifikator || item.CatatanVerifikator || ''
          }
        }))
      } else {
        toast.error("Gagal memuat data prestasi")
      }
      if (facRes && facRes.status === "success") {
        setAllFaculties(facRes.data || [])
      }
      if (prodRes && prodRes.status === "success") {
        setAllProdi(prodRes.data || [])
      }
      if (periodRes && periodRes.status === "success") {
        setAllPeriods(periodRes.data || [])
      }
    } catch (err) {
      toast.error("Koneksi ke server gagal")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const filteredData = useMemo(() => {
    return data.filter(item => {
      if (activeFacultyId !== 'all') {
        if (String(item.fakultas_id) !== String(activeFacultyId)) return false
      }
      if (activeProdiId !== 'all') {
        if (String(item.prodi_id) !== String(activeProdiId)) return false
      }
      if (activePeriodId !== 'all') {
        const selectedPeriod = allPeriods.find(p => String(p.id || p.ID) === String(activePeriodId))
        if (selectedPeriod) {
          var year = 0
          const match = selectedPeriod.AcademicYear?.match(/\d+/)
          if (match) year = parseInt(match[0])
          if (year > 0 && String(item.periode_filter) !== String(year)) return false
        }
      }
      return true
    })
  }, [data, activeFacultyId, activeProdiId, activePeriodId, allPeriods])

  const handleOpenVerify = (row, status) => {
    setSelected(row)
    setVerifyStatus(status)
    const isFunding = (row.Tipe || row.tipe) === "Pengajuan Dana"
    setVerifyCatatan(status === "verified" ? (isFunding ? "Pengajuan dana disetujui." : "Prestasi tervalidasi oleh Super Admin.") : "Berkas tidak sesuai kriteria.")
    setVerifyDanaDisetujui(isFunding ? String(row.DanaDiajukan || row.dana_diajukan || 0) : "")
    setVerifyPoin(isFunding ? "" : String(row.Poin || row.poin || 0))
    setIsVerifyOpen(true)
  }

  const handleVerifySubmit = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        Status: verifyStatus === 'verified' ? 'Diverifikasi' : 'Ditolak',
        Poin: Number(verifyPoin) || 0,
        Catatan: verifyCatatan,
        DanaDisetujui: Number(verifyDanaDisetujui) || 0
      }
      const res = await adminService.verifyAchievement(selected.id || selected.ID, payload)
      if (res.status === "success") {
        toast.success(verifyStatus === "verified" ? "Prestasi berhasil disetujui! ✅" : "Prestasi berhasil ditolak ❌")
        setIsVerifyOpen(false)
        setIsDetailOpen(false)
        fetchData()
      } else {
        toast.error(res.message || "Gagal memperbarui status verifikasi")
      }
    } catch {
      toast.error("Koneksi gagal saat menyimpan verifikasi")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSyncSimkatmawa = async (e, id) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await adminService.syncSimkatmawa(id)
      if (res.status === 'success') {
        toast.success('Berhasil sinkronisasi dengan SIMKATMAWA! ✅')
        fetchData()
      } else {
        toast.error(res.message || 'Gagal sinkronisasi dengan SIMKATMAWA')
      }
    } catch (err) {
      toast.error(err.message || 'Koneksi gagal saat sinkronisasi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleImport = async (e) => {
    e.preventDefault()
    if (!importFile) return toast.error("Pilih file excel dulu!")
    setIsSubmitting(true)
    const formData = new FormData()
    formData.append('file', importFile)
    try {
      const res = await adminService.importAchievements(formData)
      if (res.status === 'success') {
        if (res.failed && res.failed.length > 0) {
          toast.error(`${res.message}\nDetail Error:\n${res.failed.slice(0, 3).join('\n')}`, { duration: 6000 })
        } else {
          toast.success(res.message || 'Import berhasil!')
        }
        setIsImportOpen(false)
        setImportFile(null)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal import')
      }
    } catch (err) {
      toast.error(err.message || 'Koneksi gagal saat import')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Stats Calculations
  const stats = useMemo(() => {
    const total = filteredData.length
    const pending = filteredData.filter(item => (item.status || "").toLowerCase() === "menunggu").length
    const verified = filteredData.filter(item => ["verified", "terverifikasi", "disetujui", "diverifikasi"].includes((item.status || "").toLowerCase())).length
    const rejected = filteredData.filter(item => ["rejected", "ditolak"].includes((item.status || "").toLowerCase())).length
    return { total, pending, verified, rejected }
  }, [filteredData])

  const extraStats = useMemo(() => {
    const facultyCounts = {}
    filteredData.forEach(item => {
      const fac = item.fakultas_nama || 'Lainnya'
      facultyCounts[fac] = (facultyCounts[fac] || 0) + 1
    })
    let topFaculty = '—'
    let topFacultyCount = 0
    Object.entries(facultyCounts).forEach(([fac, count]) => {
      if (count > topFacultyCount && fac !== 'Lainnya') {
        topFaculty = fac
        topFacultyCount = count
      }
    })
    if (topFaculty === '—' && facultyCounts['Lainnya']) {
      topFaculty = 'Lainnya'
      topFacultyCount = facultyCounts['Lainnya']
    }

    const categoryCounts = {}
    filteredData.forEach(item => {
      const cat = item.kategori || 'Umum'
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

    const tingkatCounts = {}
    filteredData.forEach(item => {
      const t = item.tingkat || 'Lokal'
      tingkatCounts[t] = (tingkatCounts[t] || 0) + 1
    })
    let topTingkat = '—'
    let topTingkatCount = 0
    Object.entries(tingkatCounts).forEach(([t, count]) => {
      if (count > topTingkatCount) {
        topTingkat = t
        topTingkatCount = count
      }
    })
    const topTingkatPct = filteredData.length > 0 ? Math.round((topTingkatCount / filteredData.length) * 100) : 0

    const yearCounts = {}
    filteredData.forEach(item => {
      const yr = item.periode_filter
      if (yr) yearCounts[yr] = (yearCounts[yr] || 0) + 1
    })
    let topYear = '—'
    let topYearCount = 0
    Object.entries(yearCounts).forEach(([yr, count]) => {
      if (count > topYearCount) {
        topYear = yr
        topYearCount = count
      }
    })

    const totalDanaDisetujui = filteredData.reduce((acc, curr) => acc + (parseFloat(curr.DanaDisetujui) || 0), 0)

    return {
      topFaculty,
      topFacultyCount,
      topCategory,
      topCategoryCount,
      topTingkat,
      topTingkatCount,
      topTingkatPct,
      topYear,
      topYearCount,
      totalDanaDisetujui
    }
  }, [filteredData])

  const leaderboardData = useMemo(() => {
    const counts = {}
    filteredData.forEach(item => {
      const facName = item.fakultas_nama || 'Lainnya'
      counts[facName] = (counts[facName] || 0) + 1
    })
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [filteredData])

  const prodiBreakdown = useMemo(() => {
    const mapping = {}

    // Initialize mapping structure with all master faculties and prodis
    allFaculties.forEach(fac => {
      const facName = fac.nama || fac.Nama
      if (facName) {
        mapping[facName] = {}
        const facId = fac.id || fac.ID
        allProdi.forEach(prod => {
          const prodFid = prod.FakultasID || prod.fakultas_id
          const prodName = prod.nama || prod.Nama
          if (String(prodFid) === String(facId) && prodName) {
            mapping[facName][prodName] = { total: 0, pending: 0, verified: 0 }
          }
        })
      }
    })

    // Populate counts from achievements data
    filteredData.forEach(item => {
      const facName = item.fakultas_nama || 'Lainnya'
      const prodName = item.prodi_nama || 'Lainnya'
      const status = (item.status || '').toLowerCase()
      const isVerified = ["verified", "terverifikasi", "disetujui", "diverifikasi"].includes(status)
      const isPending = !isVerified && !["rejected", "ditolak"].includes(status)

      if (!mapping[facName]) {
        mapping[facName] = {}
      }
      if (!mapping[facName][prodName]) {
        mapping[facName][prodName] = { total: 0, pending: 0, verified: 0 }
      }

      mapping[facName][prodName].total += 1
      if (isPending) mapping[facName][prodName].pending += 1
      if (isVerified) mapping[facName][prodName].verified += 1
    })
    return mapping
  }, [allFaculties, allProdi, filteredData])

  const fakultasOptions = useMemo(() => {
    const list = []
    const ids = new Set()

    // Add all faculties from master data
    allFaculties.forEach(fac => {
      const fid = String(fac.id || fac.ID || '')
      const fnama = String(fac.nama || fac.Nama || '')
      if (fid && fnama && !ids.has(fid)) {
        ids.add(fid)
        list.push({ label: fnama.toUpperCase(), value: fid })
      }
    })

    // Fallback/Supplement from achievements data
    filteredData.forEach(item => {
      const fid = item.fakultas_id
      const fnama = item.fakultas_nama
      if (fid && fnama && !ids.has(fid)) {
        ids.add(fid)
        list.push({ label: fnama.toUpperCase(), value: fid })
      }
    })
    return list
  }, [allFaculties, filteredData])

  const chartData = useMemo(() => {
    if (chartFacultyFilter === "all") {
      return leaderboardData
    } else {
      const counts = {}
      filteredData.forEach(item => {
        if (item.fakultas_id === chartFacultyFilter) {
          const prodName = item.prodi_nama || 'Lainnya'
          counts[prodName] = (counts[prodName] || 0) + 1
        }
      })
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
    }
  }, [chartFacultyFilter, leaderboardData, filteredData])

  const prodiOptions = useMemo(() => {
    const list = []
    const ids = new Set()

    const selectedFakultasId = tableFilters.fakultas_id
    const filteredProdis = selectedFakultasId && selectedFakultasId !== "all"
      ? allProdi.filter(p => String(p.FakultasID || p.fakultas_id || '') === String(selectedFakultasId))
      : allProdi

    filteredProdis.forEach(prod => {
      const pid = String(prod.id || prod.ID || '')
      const pnama = String(prod.nama || prod.Nama || '')
      if (pid && pnama && !ids.has(pid)) {
        ids.add(pid)
        list.push({ label: pnama.toUpperCase(), value: pid })
      }
    })

    // Fallback/Supplement from achievements data
    data.forEach(item => {
      const pid = item.prodi_id
      const pnama = item.prodi_nama
      const fid = item.fakultas_id
      if (selectedFakultasId && selectedFakultasId !== "all" && fid !== selectedFakultasId) {
        return
      }
      if (pid && pnama && !ids.has(pid)) {
        ids.add(pid)
        list.push({ label: pnama.toUpperCase(), value: pid })
      }
    })

    return list
  }, [allProdi, data, tableFilters.fakultas_id])

  const kategoriOptions = useMemo(() => {
    const list = []
    const cats = new Set()
    data.forEach(item => {
      const cat = item.kategori
      if (cat && !cats.has(cat)) {
        cats.add(cat)
        list.push({ label: cat.toUpperCase(), value: cat })
      }
    })
    return list
  }, [data])

  const semesterOptions = useMemo(() => {
    const list = []
    const semesters = new Set()
    data.forEach(item => {
      const sem = item.semester_filter
      if (sem && !semesters.has(sem)) {
        semesters.add(sem)
        list.push({ label: `SEMESTER ${sem}`, value: sem })
      }
    })
    return list.sort((a, b) => Number(a.value) - Number(b.value))
  }, [data])

  const periodeOptions = useMemo(() => {
    const list = []
    const periods = new Set()
    data.forEach(item => {
      const per = item.periode_filter
      if (per && !periods.has(per)) {
        periods.add(per)
        list.push({ label: `PERIODE ${per}`, value: per })
      }
    })
    return list.sort((a, b) => Number(b.value) - Number(a.value))
  }, [data])

  const columns = [
    {
      key: "mahasiswa",
      label: "Mahasiswa",
      className: "min-w-[240px]",
      render: (v, row) => {
        const mhs = row.mahasiswa || {}
        const name = mhs.Nama || mhs.nama || "—"
        const nim = mhs.NIM || mhs.nim || "—"
        return (
          <div className="flex items-center gap-3">
            <StudentAvatar
              src={getCleanImageUrl(mhs.FotoURL || mhs.foto_url)}
              name={name}
              className="w-9 h-9 rounded-xl shadow-sm"
            />
            <div className="flex flex-col">
              <span className="font-bold text-neutral-900 text-[13px] font-jakarta leading-tight">{name}</span>
              <span className="text-[11px] text-neutral-400 font-medium">{nim}</span>
            </div>
          </div>
        )
      }
    },
    {
      key: "nama_kegiatan",
      label: "Prestasi / Penghargaan",
      className: "min-w-[200px]",
      render: (v, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-neutral-900 text-[13px] font-jakarta leading-tight truncate max-w-[220px]" title={row.nama_kegiatan}>
            {row.nama_kegiatan || "—"}
          </span>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="inline-block text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-md uppercase tracking-wider">
              {row.kategori || "Umum"}
            </span>
            <span className={cn("inline-block text-[9px] font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider", row.Tipe === 'Pengajuan Dana' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200')}>
              {row.Tipe || 'Laporan Prestasi'}
            </span>
          </div>
        </div>
      )
    },
    {
      key: "tingkat",
      label: "Tingkat",
      className: "w-[120px] text-center",
      cellClassName: "text-center",
      render: (v) => {
        const tingkat = (v || "").toLowerCase()
        const styles = {
          internasional: "bg-violet-50 text-violet-700 border-violet-100",
          nasional: "bg-blue-50 text-blue-700 border-blue-100",
          regional: "bg-cyan-50 text-cyan-700 border-cyan-100",
        }
        return (
          <Badge className={cn("px-2.5 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider", styles[tingkat] || "bg-slate-50 text-slate-600 border-slate-100")}>
            {v || "Lokal"}
          </Badge>
        )
      }
    },
    {
      key: "status",
      label: "Status",
      className: "w-[140px] text-center",
      cellClassName: "text-center",
      render: (v) => {
        const status = (v || "").toLowerCase()
        const isVerified = ["verified", "terverifikasi", "disetujui", "diverifikasi"].includes(status)
        const isRejected = ["rejected", "ditolak"].includes(status)

        let cls = "bg-amber-50 text-amber-700 border-amber-100"
        let dot = "bg-amber-500"
        let label = "Menunggu"

        if (isVerified) {
          cls = "bg-emerald-50 text-emerald-700 border-emerald-100"
          dot = "bg-emerald-500"
          label = "Terverifikasi"
        } else if (isRejected) {
          cls = "bg-rose-50 text-rose-700 border-rose-100"
          dot = "bg-rose-500"
          label = "Ditolak"
        }

        return (
          <Badge className={cn("px-2.5 py-0.5 rounded-lg border text-[9px] font-bold uppercase tracking-wider gap-1.5 inline-flex items-center", cls)}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
            {label}
          </Badge>
        )
      }
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Kelola"
        highlightedTitle="Prestasi Mahasiswa"
        subtitle="Audit, verifikasi, dan validasi seluruh portofolio prestasi akademik/non-akademik mahasiswa secara terintegrasi."
        icon="emoji_events"
        badges={[{ label: 'Kemahasiswaan Portal', active: false }]}
        actions={
          <div className="flex gap-2">
            {hasPermission('achievement.create') && (
            <Button onClick={() => setIsImportOpen(true)} variant="outline" className="h-10 px-5 rounded-xl border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-900 transition-all active:scale-95 text-xs font-bold uppercase tracking-widest gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>upload_file</span>
              Import Excel
            </Button>
            )}
            <Button onClick={fetchData} disabled={loading} variant="outline" className="h-10 px-5 rounded-xl border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 transition-all active:scale-95 text-xs font-bold uppercase tracking-widest gap-2">
              <RefreshCw size={14} animate={loading} className="text-blue-500" />
              Refresh Data
            </Button>
          </div>
        }
      />

      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="space-y-4 md:space-y-5">
        {/* Row 1: Status Portofolio */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PrimaryStatsCard
            title="Total Portofolio"
            value={stats.total}
            icon={Trophy}
            colorTheme="primary"
            badgeText="Terdaftar"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">list_alt</span>}
          />
          <PrimaryStatsCard
            title="Menunggu Review"
            value={stats.pending}
            icon={Clock}
            colorTheme="warning"
            badgeText="Pending"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">schedule</span>}
          />
          <PrimaryStatsCard
            title="Terverifikasi"
            value={stats.verified}
            icon={CheckCircle2}
            colorTheme="success"
            badgeText="Disetujui"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
          />
          <PrimaryStatsCard
            title="Total Ditolak"
            value={stats.rejected}
            icon={CloseIcon}
            colorTheme="error"
            badgeText="Ditolak"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">cancel</span>}
          />
        </div>

        {/* Row 2: 5W 1H Insights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PrimaryStatsCard
            title="Fakultas Teraktif"
            value={getShortFacultyName(extraStats.topFaculty)}
            badgeText={`${extraStats.topFacultyCount} Prestasi`}
            icon={Users}
            colorTheme="primary"
          />
          <PrimaryStatsCard
            title="Kategori Terbanyak"
            value={extraStats.topCategory}
            badgeText={`${extraStats.topCategoryCount} Pengajuan`}
            icon={Award}
            colorTheme="success"
          />
          <PrimaryStatsCard
            title="Tingkat Dominan"
            value={extraStats.topTingkat}
            badgeText={`${extraStats.topTingkatPct}% Total`}
            icon={Public}
            colorTheme="info"
          />
          <PrimaryStatsCard
            title="Periode Teraktif"
            value={extraStats.topYear !== '—' ? `Tahun ${extraStats.topYear}` : '—'}
            badgeText={`${extraStats.topYearCount} Pengajuan`}
            icon={Calendar}
            colorTheme="warning"
          />
        </div>
      </div>

      {/* ── Analitik & Distribusi Section ────────────────────────── */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
          {/* Bar Chart: Leaderboard Fakultas */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex justify-center items-center text-blue-600 flex-shrink-0">
                    <span className="material-symbols-outlined text-blue-600" style={{ fontSize: '18px' }} >bar_chart</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline block">Kontribusi Prestasi</span>
                    <h3 className="text-sm font-extrabold text-slate-800 leading-tight">
                      {chartFacultyFilter === "all" ? "Fakultas Paling Berprestasi" : "Program Studi Teraktif"}
                    </h3>
                  </div>
                </div>

                {/* Select Filter Fakultas */}
                <div className="w-full sm:w-[200px] shrink-0">
                  <Select value={chartFacultyFilter} onValueChange={setChartFacultyFilter}>
                    <SelectTrigger className="w-full h-9 rounded-xl border-[#e5e5e5] bg-[#fafafa] text-xs">
                      <SelectValue placeholder="Filter Fakultas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Fakultas</SelectItem>
                      {fakultasOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-neutral-500 font-medium mb-6">
                {chartFacultyFilter === "all"
                  ? "Peringkat kontribusi jumlah prestasi mahasiswa per Fakultas secara riil."
                  : "Peringkat kontribusi jumlah prestasi mahasiswa per Program Studi pada Fakultas terpilih."}
              </p>
            </div>

            <div className="h-[240px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      formatter={v => [v, 'Jumlah Prestasi']}
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "11px", fontWeight: "bold" }}
                    />
                    <Bar dataKey="value" name="Prestasi" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-neutral-400 italic">Tidak ada data kontribusi</div>
              )}
            </div>
          </div>

          {/* Rekapitulasi per Fakultas & Prodi */}
          <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex justify-center items-center text-indigo-600 flex-shrink-0">
                  <span className="material-symbols-outlined text-indigo-600" style={{ fontSize: '18px' }} >analytics</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline block">Distribusi Akademik</span>
                  <h3 className="text-sm font-extrabold text-slate-800 leading-tight">Rekap Fakultas & Prodi</h3>
                </div>
              </div>

              <p className="text-xs text-neutral-500 font-medium mb-4">Klik nama fakultas untuk melihat rincian jumlah portofolio per Program Studi.</p>

              <div className="space-y-2.5 overflow-y-auto max-h-[240px] pr-1">
                {Object.keys(prodiBreakdown).length > 0 ? (
                  Object.entries(prodiBreakdown).map(([facName, prodis]) => {
                    const totalFac = Object.values(prodis).reduce((sum, p) => sum + p.total, 0)
                    const pendingFac = Object.values(prodis).reduce((sum, p) => sum + p.pending, 0)
                    const verifiedFac = Object.values(prodis).reduce((sum, p) => sum + p.verified, 0)
                    const isExpanded = expandedFaculty === facName

                    return (
                      <div key={facName} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                        <button
                          type="button"
                          onClick={() => setExpandedFaculty(isExpanded ? null : facName)}
                          className="w-full p-3 flex items-center justify-between text-left hover:bg-slate-100/50 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <span className="font-extrabold text-slate-800 text-[11px] tracking-tight block truncate uppercase">{facName}</span>
                            <span className="text-[9px] font-bold text-slate-400 block mt-0.5">{Object.keys(prodis).length} Program Studi</span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {pendingFac > 0 && (
                              <span className="text-[9px] font-black bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded" title="Menunggu Review">
                                {pendingFac} P
                              </span>
                            )}
                            <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded" title="Sudah Terverifikasi">
                              {verifiedFac} V
                            </span>
                            <span className="text-[9px] font-black bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded" title="Total Portofolio">
                              {totalFac} T
                            </span>
                            <span className="material-symbols-outlined text-slate-400 transition-transform duration-200" style={{ fontSize: 16, transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                              keyboard_arrow_down
                            </span>
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-slate-100 bg-white p-3 space-y-2 animate-in fade-in duration-200">
                            {Object.entries(prodis).map(([prodName, metrics]) => (
                              <div key={prodName} className="flex justify-between items-center py-1.5 border-b border-slate-50 last:border-0">
                                <span className="text-[10px] font-bold text-slate-600 truncate max-w-[150px]">{prodName}</span>
                                <div className="flex items-center gap-1 shrink-0">
                                  {metrics.pending > 0 && (
                                    <span className="text-[8px] font-extrabold text-amber-700 bg-amber-50 px-1 rounded">
                                      {metrics.pending} Pending
                                    </span>
                                  )}
                                  <span className="text-[8px] font-extrabold text-emerald-700 bg-emerald-50 px-1 rounded">
                                    {metrics.verified} Verif
                                  </span>
                                  <span className="text-[8px] font-extrabold text-slate-500 bg-slate-50 px-1 rounded">
                                    {metrics.total} Total
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-8 text-xs text-neutral-400 italic">Belum ada sebaran Fakultas/Prodi</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Data Table Section ───────────────────────────────────── */}
      <Card className="border-neutral-200 shadow-sm rounded-2xl bg-white overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            title="Daftar Prestasi Mahasiswa"
            subtitle="Menampilkan daftar seluruh prestasi mahasiswa yang terverifikasi maupun yang masih dalam proses."
            columns={columns}
            data={filteredData}
            loading={loading}
            searchPlaceholder="Cari mahasiswa, judul kegiatan, kategori..."
            externalFilters={tableFilters}
            onExternalFilterChange={setTableFilters}
            filters={[
              {
                key: "status",
                placeholder: "Status",
                options: [
                  { label: "Menunggu", value: "menunggu" },
                  { label: "Terverifikasi", value: "diverifikasi" },
                  { label: "Ditolak", value: "ditolak" },
                ]
              },
              {
                key: "tingkat",
                placeholder: "Tingkat",
                options: [
                  { label: "Internasional", value: "internasional" },
                  { label: "Nasional", value: "nasional" },
                  { label: "Regional", value: "regional" },
                  { label: "Lokal", value: "lokal" },
                ]
              },
              {
                key: "kategori_filter",
                placeholder: "Kategori",
                options: kategoriOptions
              },
              {
                key: "prodi_id",
                placeholder: "Prodi",
                options: prodiOptions
              },
              {
                key: "semester_filter",
                placeholder: "Semester",
                options: semesterOptions
              }
            ]}
            actions={(row) => (
              <div className="flex items-center gap-1.5">
                <Button
                  onClick={() => { setSelected(row); setIsDetailOpen(true) }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-neutral-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                  title="Lihat Detail"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>visibility</span>
                </Button>
                {(row.status || "").toLowerCase() === "menunggu" && hasPermission('achievement.update') && (
                  <>
                    <Button
                      onClick={() => handleOpenVerify(row, "verified")}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                      title="Setujui"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>check_circle</span>
                    </Button>
                    <Button
                      onClick={() => handleOpenVerify(row, "rejected")}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Tolak"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>cancel</span>
                    </Button>
                  </>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* ── Detail Modal ───────────────────────────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selected?.nama_kegiatan}
        subtitle={selected?.Tipe === 'Pengajuan Dana' ? 'Pengajuan Dana Lomba' : 'Capaian Prestasi'}
        description={selected ? `${selected.mahasiswa?.Nama || selected.mahasiswa?.nama} · NIM ${selected.mahasiswa?.NIM || selected.mahasiswa?.nim}` : ""}
        icon="emoji_events"
        maxWidth="max-w-2xl"
        bodyClassName="p-0"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsDetailOpen(false)}>Tutup</ModalCancelButton>
            {selected && (selected.status || "").toLowerCase() === "menunggu" && hasPermission('achievement.update') && (
              <>
                <ModalSaveButton
                  onClick={() => handleOpenVerify(selected, "rejected")}
                  className="bg-rose-500 hover:bg-rose-600 text-white"
                  icon="cancel"
                >
                  Tolak Pengajuan
                </ModalSaveButton>
                <ModalSaveButton
                  onClick={() => handleOpenVerify(selected, "verified")}
                  className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white"
                  icon="check_circle"
                >
                  Setujui & Validasi
                </ModalSaveButton>
              </>
            )}
            {selected && ['diverifikasi', 'valid', 'disetujui', 'verified'].includes((selected.status || '').toLowerCase()) && !selected.SimkatmawaId && (
              <ModalSaveButton
                onClick={(e) => handleSyncSimkatmawa(e, selected.ID || selected.id)}
                loading={isSubmitting}
                className="bg-[var(--theme-info)] hover:bg-[var(--theme-info-hover)] text-white"
                icon="sync"
              >
                Kirim ke SIMKATMAWA
              </ModalSaveButton>
            )}
          </>
        }
      >
        {selected && (
          <div className="p-8 space-y-6 max-h-[50vh] overflow-y-auto no-scrollbar font-jakarta bg-white">
            <div className="flex flex-wrap gap-2">
              {selected.kategori && (
                <Badge className="bg-[var(--theme-bg)] border border-[var(--theme-border)] px-2.5 py-1 rounded-md text-[10px] font-medium text-[var(--theme-text-muted)] uppercase tracking-wider gap-1.5 flex items-center shadow-none">
                  <Award size={12} className="text-[var(--theme-primary)]" />
                  {selected.kategori}
                </Badge>
              )}
              {selected.tingkat && (
                <Badge className="bg-[var(--theme-bg)] border border-[var(--theme-border)] px-2.5 py-1 rounded-md text-[10px] font-medium text-[var(--theme-text-muted)] uppercase tracking-wider gap-1.5 flex items-center shadow-none">
                  <Star size={12} className="text-[var(--theme-secondary)]" />
                  {selected.tingkat}
                </Badge>
              )}
              <Badge className={cn("px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider gap-1.5 flex items-center shadow-none border",
                ["verified", "terverifikasi", "disetujui", "diverifikasi"].includes((selected.status || "").toLowerCase())
                  ? "bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/10"
                  : (selected.status || "").toLowerCase() === "menunggu"
                    ? "bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/10"
                    : "bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/10"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full bg-current", (selected.status || "").toLowerCase() === "menunggu" && "animate-pulse")} />
                {["verified", "terverifikasi", "disetujui", "diverifikasi"].includes((selected.status || "").toLowerCase()) ? "Terverifikasi" : (selected.status || "").toLowerCase() === "menunggu" ? "Menunggu" : "Ditolak"}
              </Badge>
            </div>

            {/* Reject Alert / Note */}
            {((selected.status || "").toLowerCase() === "rejected" || (selected.status || "").toLowerCase() === "ditolak") && (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-rose-600 flex-shrink-0" style={{ fontSize: "18px" }}>cancel</span>
                <div>
                  <p className="font-bold text-rose-800 text-sm">Pengajuan Ditolak</p>
                  <p className="text-rose-600 text-xs mt-0.5">{selected.CatatanVerifikator || 'Pengajuan ini tidak disetujui. Silakan periksa berkas atau data terkait.'}</p>
                </div>
              </div>
            )}

            {/* Verified Note (Non-Reject) */}
            {["verified", "terverifikasi", "disetujui", "diverifikasi"].includes((selected.status || "").toLowerCase()) && selected.CatatanVerifikator && (
              <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start gap-3">
                <span className="material-symbols-outlined text-emerald-600 flex-shrink-0" style={{ fontSize: "18px" }}>check_circle</span>
                <div>
                  <p className="font-bold text-emerald-800 text-sm">Catatan Verifikator</p>
                  <p className="text-emerald-600 text-xs mt-0.5">{selected.CatatanVerifikator}</p>
                </div>
              </div>
            )}

            {/* 5W 1H Breakdown */}
            <div className="space-y-6">
              {/* 1. WHO (Siapa) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 18 }}>person</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">WHO — Profil Mahasiswa</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Nama Lengkap</p>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">{selected.mahasiswa?.Nama || selected.mahasiswa?.nama || "—"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">NIM</p>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">{selected.mahasiswa?.NIM || selected.mahasiswa?.nim || "—"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Fakultas</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selected.fakultas_nama || "—"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Program Studi</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selected.prodi_nama || "—"}</p>
                  </div>
                </div>
              </div>

              {/* 2. WHAT (Apa) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 18 }}>emoji_events</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">WHAT — Rincian Kegiatan & Prestasi</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50 md:col-span-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Nama Kegiatan / Kompetisi</p>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5">{selected.nama_kegiatan}</p>
                  </div>
                  {selected.Tipe === 'Rekognisi' ? (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Jenis Rekognisi</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selected.jenis_rekognisi || "—"}</p>
                    </div>
                  ) : selected.Tipe !== 'Pengajuan Dana' ? (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Kategori Prestasi</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5">{selected.kategori || "—"}</p>
                    </div>
                  ) : null}
                  {selected.Tipe !== 'Pengajuan Dana' && selected.Tipe !== 'Rekognisi' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Peringkat / Juara</p>
                      <p className="text-xs font-extrabold text-primary mt-0.5">{selected.peringkat || "—"}</p>
                    </div>
                  )}
                  {selected.Tipe === 'Sertifikasi' && (
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                      <p className="text-[9px] font-black text-slate-400 uppercase">Tingkat Sertifikasi</p>
                      <p className="text-xs font-bold text-slate-800 mt-0.5 uppercase">{selected.tingkat || "Lokal"}</p>
                    </div>
                  )}
                  {selected.Tipe !== 'Pengajuan Dana' && (
                    <>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Cabang Lomba</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{selected.cabang || "—"}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Bentuk & Kelompok</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5 capitalize">{selected.bentuk || "Luring/Hibrida"} - {selected.kelompok_prestasi || "Individu"}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Jumlah PT Peserta</p>
                        <p className="text-xs font-bold text-slate-800 mt-0.5">{selected.jumlah_unit_peserta || "1"}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 3. WHERE (Di mana) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 18 }}>public</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">WHERE — Lokasi & Penyelenggara</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Penyelenggara / Institusi</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{selected.penyelenggara || "—"}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Tingkat Kompetisi</p>
                    <p className="text-xs font-extrabold text-slate-800 mt-0.5 uppercase">{selected.tingkat || "Lokal"}</p>
                  </div>
                </div>
              </div>

              {/* 4. WHEN (Kapan) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 18 }}>calendar_today</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">WHEN — Waktu & Periode</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Tanggal Pelaksanaan / Lomba</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">{formatDate(selected.tanggal)}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                    <p className="text-[9px] font-black text-slate-400 uppercase">Periode Akademik / Pengajuan</p>
                    <p className="text-xs font-bold text-slate-800 mt-0.5">Tahun {selected.periode_filter}</p>
                  </div>
                </div>
              </div>

              {/* 5. WHY (Mengapa) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 18 }}>contact_support</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">WHY — Verifikasi & Kelayakan</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100/50 space-y-2">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">Catatan Keputusan / Verifikator</p>
                    <p className="text-xs font-bold text-slate-700 mt-1">
                      {selected.CatatanVerifikator || "Belum ada catatan keputusan dari verifikator."}
                    </p>
                  </div>
                </div>
              </div>

              {/* 6. HOW (Bagaimana) */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-blue-600" style={{ fontSize: 18 }}>payments</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">HOW — Pendanaan & Berkas</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selected.Tipe === 'Pengajuan Dana' ? (
                    <>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Dana Diajukan</p>
                        <p className="text-xs font-extrabold text-amber-600 mt-0.5">Rp {(selected.DanaDiajukan || 0).toLocaleString('id-ID')}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100/50">
                        <p className="text-[9px] font-black text-slate-400 uppercase">Dana Disetujui</p>
                        <p className="text-xs font-extrabold text-emerald-600 mt-0.5">Rp {(selected.DanaDisetujui || 0).toLocaleString('id-ID')}</p>
                      </div>
                    </>
                  ) : null}
                </div>

                {/* SIMKATMAWA Info */}
                {selected.SimkatmawaId && (
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 mt-4">
                    <span className="material-symbols-outlined text-blue-600 flex-shrink-0 mt-0.5" style={{ fontSize: '18px' }} >cloud_sync</span>
                    <div>
                      <p className="font-bold text-blue-700 text-sm">Disinkronkan ke SIMKATMAWA</p>
                      <p className="text-blue-600 text-xs mt-0.5 mb-2">ID Simkatmawa: {selected.SimkatmawaId}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-blue-700">Status:</span>
                        <select
                          className="bg-white border border-blue-200 text-blue-700 text-xs font-bold rounded-lg px-2 py-1 outline-none cursor-pointer hover:border-blue-300 transition-colors"
                          value={selected.SimkatmawaStatus || "Sukses"}
                          onChange={async (e) => {
                            const newStatus = e.target.value;
                            try {
                              await adminService.updateSimkatmawaStatus(selected.id || selected.ID, newStatus);
                              toast.success("Status SIMKATMAWA diperbarui! ✅");
                              fetchData();
                              setSelected({ ...selected, SimkatmawaStatus: newStatus });
                            } catch (err) {
                              toast.error("Gagal update status");
                            }
                          }}
                        >
                          <option value="Sukses">Sukses Terkirim (Menunggu)</option>
                          <option value="Diterima SIMKATMAWA">Diterima SIMKATMAWA</option>
                          <option value="Ditolak SIMKATMAWA">Ditolak SIMKATMAWA</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Bukti File & Tautan SIMKATMAWA */}
                <div className="mt-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase mb-2">Dokumen & Tautan Pendukung</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Berkas Utama */}
                    {selected.bukti_url ? (
                      <a href={`${API_BASE_URL.replace("/api", "")}${selected.bukti_url}`} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-blue-50/20 hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>description</span>
                          </div>
                          <span className="font-bold text-neutral-900 group-hover:text-blue-600 text-xs transition-colors truncate max-w-[150px]">
                            {selected.Tipe === 'Pengajuan Dana' ? 'Proposal / Dokumen' : 'Sertifikat Utama'}
                          </span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                        </span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3.5 rounded-xl border border-dashed border-neutral-200 bg-neutral-50/30">
                        <span className="material-symbols-outlined text-slate-300" style={{ fontSize: "18px" }}>description</span>
                        <p className="text-xs text-slate-400 font-medium italic">Tidak ada berkas utama.</p>
                      </div>
                    )}

                    {/* URL Peserta */}
                    {selected.url_peserta && (
                      <a href={selected.url_peserta.startsWith('http') ? selected.url_peserta : `https://${selected.url_peserta}`} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-blue-50/20 hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>link</span>
                          </div>
                          <span className="font-bold text-neutral-900 group-hover:text-blue-600 text-xs transition-colors truncate max-w-[150px]">URL Kompetisi</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                        </span>
                      </a>
                    )}

                    {/* URL Sertifikat */}
                    {selected.url_sertifikat && (
                      <a href={selected.url_sertifikat.startsWith('http') ? selected.url_sertifikat : `https://${selected.url_sertifikat}`} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-blue-50/20 hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>workspace_premium</span>
                          </div>
                          <span className="font-bold text-neutral-900 group-hover:text-blue-600 text-xs transition-colors truncate max-w-[150px]">URL Sertifikat</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                        </span>
                      </a>
                    )}

                    {/* URL Foto UPP */}
                    {selected.url_foto_upp && (
                      <a href={selected.url_foto_upp.startsWith('http') ? selected.url_foto_upp : `https://${selected.url_foto_upp}`} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-blue-50/20 hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>photo_camera</span>
                          </div>
                          <span className="font-bold text-neutral-900 group-hover:text-blue-600 text-xs transition-colors truncate max-w-[150px]">URL Foto UPP</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                        </span>
                      </a>
                    )}

                    {/* URL Dokumen Undangan */}
                    {selected.url_dokumen_undangan && (
                      <a href={selected.url_dokumen_undangan.startsWith('http') ? selected.url_dokumen_undangan : `https://${selected.url_dokumen_undangan}`} target="_blank" rel="noreferrer"
                        className="flex items-center justify-between p-3.5 rounded-xl border border-neutral-200 bg-white hover:bg-blue-50/20 hover:border-blue-300 transition-all group">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 flex-shrink-0 border border-blue-100">
                            <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>mail</span>
                          </div>
                          <span className="font-bold text-neutral-900 group-hover:text-blue-600 text-xs transition-colors truncate max-w-[150px]">URL Undangan</span>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>open_in_new</span>
                        </span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogModal>

      {/* ── Verification Action Dialog ─────────────────────────────── */}
      <DialogModal
        open={isVerifyOpen}
        onOpenChange={setIsVerifyOpen}
        title={verifyStatus === "verified"
          ? (selected?.Tipe === 'Pengajuan Dana' ? 'Setujui Pengajuan Dana' : 'Setujui Pengajuan Prestasi')
          : (selected?.Tipe === 'Pengajuan Dana' ? 'Tolak Pengajuan Dana' : 'Tolak Pengajuan Prestasi')
        }
        subtitle="Verifikasi Kelayakan"
        description={verifyStatus === "verified"
          ? "Berikan catatan verifikasi kelayakan untuk mahasiswa."
          : "Berikan alasan penolakan berkas agar mahasiswa dapat memperbaiki pengajuannya."
        }
        icon={verifyStatus === "verified" ? "check_circle" : "cancel"}
        variant={verifyStatus === "verified" ? "success" : "danger"}
        maxWidth="max-w-md"
        bodyClassName="p-0"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsVerifyOpen(false)} />
            <ModalSaveButton
              form="verify-form"
              type="submit"
              loading={isSubmitting}
              className={verifyStatus === "verified" ? "bg-[var(--theme-success)] hover:bg-[var(--theme-success)]/90 text-white" : "bg-[var(--theme-error)] hover:bg-[var(--theme-error)]/90 text-white"}
              icon={verifyStatus === "verified" ? "check_circle" : "cancel"}
            >
              {verifyStatus === "verified" ? "Validasi" : "Tolak"}
            </ModalSaveButton>
          </>
        }
      >
        {selected && (
          <form id="verify-form" onSubmit={handleVerifySubmit} className="flex flex-col flex-1 min-h-0 bg-white">
            <div className="p-8 pt-5 space-y-5 overflow-y-auto no-scrollbar flex-1 min-h-0">
              <div className="space-y-1.5 flex flex-col gap-1.5">
                <Label htmlFor="verify_catatan" className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] ml-1 uppercase font-headline">Catatan Verifikator</Label>
                <Textarea
                  id="verify_catatan"
                  placeholder="Masukkan catatan alasan verifikasi..."
                  value={verifyCatatan}
                  onChange={(e) => setVerifyCatatan(e.target.value)}
                  className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none min-h-[90px] transition-colors resize-none"
                  required
                />
              </div>

              {selected.Tipe === "Pengajuan Dana" ? (
                verifyStatus === "verified" && (
                  <div className="space-y-1.5 flex flex-col gap-1.5">
                    <Label htmlFor="verify_dana" className="text-[10px] font-semibold text-[var(--theme-text-muted)] tracking-[0.2em] ml-1 uppercase font-headline">Dana yang Disetujui (Rp)</Label>
                    <Input
                      id="verify_dana"
                      type="number"
                      value={verifyDanaDisetujui}
                      onChange={(e) => setVerifyDanaDisetujui(e.target.value)}
                      className="h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-xs text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors"
                      placeholder="Cth: 1200000"
                      required
                    />
                  </div>
                )
              ) : null}
            </div>
          </form>
        )}
      </DialogModal>


      {/* ── Import Modal ────────────────────────────────────────────── */}
      <DialogModal
        open={isImportOpen}
        onOpenChange={setIsImportOpen}
        title="Import Data Prestasi Lama"
        subtitle="Sinkronisasi Data"
        description="Upload file Excel berisi rekapitulasi data prestasi mahasiswa"
        icon="upload_file"
        maxWidth="max-w-lg"
        bodyClassName="p-0"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsImportOpen(false)} />
            <ModalSaveButton
              form="import-form"
              type="submit"
              disabled={!importFile}
              loading={isSubmitting}
              icon="cloud_upload"
            >
              Upload
            </ModalSaveButton>
          </>
        }
      >
        <form id="import-form" onSubmit={handleImport} className="p-6 space-y-4 bg-white flex-1 min-h-0">
          <div className="p-4 bg-[var(--theme-warning-light)] rounded-2xl border border-[var(--theme-warning)]/20">
            <p className="text-xs text-[var(--theme-warning)] leading-relaxed font-semibold">
              Pastikan kolom pada excel berurutan seperti berikut:<br />
              <strong className="block mt-2">NIM | Nama Prestasi | Tipe | Level | Kategori | Peringkat | Penyelenggara | Tahun | Cabang | Bentuk | Kelompok | URL Sertifikat | Simkatmawa ID</strong>
            </p>
          </div>
          <div className="space-y-1.5 pt-2">
            <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Pilih File Excel (.xlsx)</label>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={(e) => setImportFile(e.target.files[0])}
              className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-[var(--theme-primary-light)] file:text-[var(--theme-primary)] hover:file:bg-[var(--theme-primary-light)]/80 cursor-pointer"
              required
            />
          </div>
        </form>
      </DialogModal>
    </PageContent>
  )
}
