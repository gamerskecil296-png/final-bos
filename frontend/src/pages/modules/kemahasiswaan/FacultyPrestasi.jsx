"use client"

import React, { useState, useEffect, useMemo } from "react"

import { toast, Toaster } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { API_BASE_URL, adminService } from "@/services/api"
import api from "@/lib/axios"
import useAuthStore from "@/store/useAuthStore"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { Badge } from "@/components/ui/Badge"
import { usePermission } from '@/hooks/usePermission'
import { DialogModal, ModalCancelButton, ModalSaveButton } from "@/components/ui/DialogModal"
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Download = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>;
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const ExternalLink = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>open_in_new</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Trophy = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const Star = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>star</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const CheckCircle2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const GraduationCap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const Calendar = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>calendar_today</span>;



const API = `${API_BASE_URL}/faculty`

const AVATAR_COLORS = [
  'from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500', 'from-cyan-400 to-sky-500',
]
const getInitials = (n = '') => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

const STATUS_STYLES = {
  verified: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Terverifikasi' },
  terverifikasi: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Terverifikasi' },
  diverifikasi: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Terverifikasi' },
  disetujui: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Disetujui' },
  rejected: { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Ditolak' },
  ditolak: { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Ditolak' },
  pending: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Menunggu' },
}
const getStatus = (val = '') => STATUS_STYLES[val.toLowerCase()] || STATUS_STYLES.pending

const TINGKAT_STYLES = {
  internasional: 'bg-violet-50 text-violet-700 border-violet-200',
  nasional: 'bg-blue-50 text-blue-700 border-blue-200',
  regional: 'bg-cyan-50 text-cyan-700 border-cyan-200',
}

const formatDate = (d) => { try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) } catch { return d } }

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

export default function FacultyPrestasi() {
  const { isSuperAdmin, hasPermission } = usePermission()
  const canManageAchievement = isSuperAdmin || hasPermission('faculty.achievement.update')
  const [achievements, setAchievements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [filterSemester, setFilterSemester] = useState('all')
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [filterProdi, setFilterProdi] = useState('all')
  const [pageSize, setPageSize] = useState(10)
  const [sortConfig, setSortConfig] = useState({ key: 'CreatedAt', direction: 'desc' })
  const [facultyInfo, setFacultyInfo] = useState(null)
  const [periodsList, setPeriodsList] = useState([])

  // Verification dialog states
  const [isVerifyOpen, setIsVerifyOpen] = useState(false)
  const [verifyStatus, setVerifyStatus] = useState("verified")
  const [verifyCatatan, setVerifyCatatan] = useState("")
  const [verifyDanaDisetujui, setVerifyDanaDisetujui] = useState("")
  const [verifyPoin, setVerifyPoin] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const getKopImage = (facName) => {
    const name = (facName || "").toLowerCase();
    if (name.includes("farmasi")) return "kop_farmasi.jpg";
    if (name.includes("kesehatan") || name.includes("fikes")) return "kop_ilmu_kesehatan.jpg";
    if (name.includes("keperawatan") || name.includes("fkep")) return "kop_keperawatan.jpg";
    if (name.includes("sosial") || name.includes("social") || name.includes("sosiologi") || name.includes("fis")) return "kop_ilmu_sosial.jpg";
    return "kop_farmasi.jpg";
  };

  const downloadPDF = (title, subtitle, contentHtml) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) { toast.error('Gagal membuka jendela cetak. Pastikan pop-up tidak diblokir.'); return; }

    const user = useAuthStore.getState().user;
    const isSuperAdmin = user?.role === 'super_admin';

    const facName = facultyInfo?.Nama || facultyInfo?.nama || "Fakultas Farmasi";
    const facDekan = facultyInfo?.Dekan || facultyInfo?.dekan || "Dekan Bidang Akademik";

    const printSize = isSuperAdmin ? 'A4 landscape' : 'A4 portrait';
    const bgSize = isSuperAdmin ? '297mm 210mm' : '210mm 297mm';
    const kopImage = isSuperAdmin ? 'format_kop_rektorat_landscape.jpg' : getKopImage(facName);
    const kopImageUrl = `${window.location.origin}/images/${kopImage}`;
    const facNameResolved = isSuperAdmin ? 'Universitas Bhakti Kencana' : facName;
    const titleResolved = isSuperAdmin ? 'Rektor Universitas Bhakti Kencana' : `Dekan ${facNameResolved}`;
    const nameResolved = isSuperAdmin ? 'Dr. apt. Entris Sutrisno, MH. Kes.' : facDekan;
    const footerText = isSuperAdmin ? 'Portal SIAKAD Rektorat BKU' : `Portal Akademik ${facNameResolved}`;

    const htmlContent = `<html><head><meta charset="utf-8"><title>${title}</title><style>
      @page { size: ${printSize}; margin: 0; }
      body {
        font-family: 'Segoe UI', Arial, sans-serif;
        line-height: 1.5;
        color: #334155;
        background-image: url('${kopImageUrl}');
        background-size: ${bgSize};
        background-repeat: no-repeat;
        background-position: top center;
        margin: 0;
        padding: 38mm 18mm 20mm 18mm;
        box-sizing: border-box;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      h1 { color:#1e293b; text-align:center; font-size:14px; font-weight:800; margin:0 0 3px; text-transform:uppercase; }
      h2 { color:#64748b; text-align:center; font-size:8px; font-weight:700; margin:0 0 20px; text-transform:uppercase; letter-spacing:1px; }
      table.data-table { width:100%; border-collapse:collapse; margin-top:8px; }
      table.data-table th { background:#00236F; color:#fff; font-weight:700; text-align:left; padding:7px 8px; border:1px solid #cbd5e1; font-size:8px; text-transform:uppercase; }
      table.data-table td { padding:6px 8px; border:1px solid #cbd5e1; font-size:8px; color:#334155; }
      table.data-table tr:nth-child(even) td { background:#f8fafc; }
      .badge { display:inline-block; padding:2px 5px; font-size:7px; font-weight:700; border-radius:3px; text-transform:uppercase; }
      .badge-success { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
      .badge-warning { background:#fef9c3; color:#a16207; border:1px solid #fef08a; }
      .badge-info    { background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe; }
      .footer { margin-top:30px; text-align:right; font-size:8px; color:#64748b; }
      @media print { .no-print { display:none; } }
    </style></head><body>
      <h1>${title}</h1>
      <h2>${subtitle}</h2>
      ${contentHtml}
      <div class="footer">
        <p>Dicetak secara otomatis oleh ${footerText}</p>
        <p>Tanggal Cetak: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })} WIB</p>
        <br/><p>Mengetahui,</p>
        <p style="font-weight:700;margin-top:4px;">${titleResolved}</p>
        <div style="margin-top:45px; font-weight:700; text-decoration:underline;">${nameResolved}</div>
      </div>
    </body></html>`;
    
    try {
      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => { printWindow.close(); }, 100);
        }, 300);
      };
    } catch (err) {
      console.error("Print Error:", err);
      toast.error("Gagal memproses PDF, mungkin karena ekstensi browser.");
    }
  };

  const exportAchievementsPDF = () => {
    if (achievements.length === 0) { toast.error('Tidak ada data prestasi untuk diekspor'); return; }
    const dataToExport = filtered.length > 0 && filtered.length < achievements.length ? filtered : achievements;
    let tableRows = '';
    dataToExport.forEach((item, idx) => {
      const stLabel = ['verified', 'terverifikasi', 'disetujui', 'diverifikasi'].includes((item.Status || '').toLowerCase())
        ? '<span class="badge badge-success">Terverifikasi</span>'
        : (item.Status || '').toLowerCase().includes('tolak') || (item.Status || '').toLowerCase() === 'rejected'
          ? '<span class="badge badge-warning">Ditolak</span>'
          : '<span class="badge badge-info">Menunggu</span>';
      const tingkatCls = (item.Tingkat || '').toLowerCase() === 'internasional' ? 'color:#7c3aed;font-weight:700;'
        : (item.Tingkat || '').toLowerCase() === 'nasional' ? 'color:#1d4ed8;font-weight:700;' : 'color:#0e7490;font-weight:700;';
      tableRows += `<tr>
        <td>${idx + 1}</td>
        <td style="font-weight:700;">${item.Mahasiswa?.Nama || '—'}<br/><span style="font-size:7px;color:#64748b;">NIM: ${item.Mahasiswa?.NIM || '—'}</span></td>
        <td>${item.NamaKegiatan || '—'}<br/><span style="font-size:7px;color:#1d4ed8;font-weight:700;">${item.Kategori || 'Umum'}</span></td>
        <td style="${tingkatCls}">${item.Tingkat || 'Lokal'}</td>
        <td>${item.Peringkat || '—'}</td>
        <td style="font-weight:700;text-align:center;">${item.Poin || 0}</td>
        <td>${item.CreatedAt ? new Date(item.CreatedAt).getFullYear() : '—'}</td>
        <td>${stLabel}</td>
      </tr>`;
    });
    const totalVerified = dataToExport.filter(a => ['verified', 'terverifikasi', 'disetujui', 'diverifikasi'].includes((a.Status || '').toLowerCase())).length;
    const contentHtml = `
      <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:16px;">
        <tr>
          <td style="padding:0 6px 0 0;width:33%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Total Data Diekspor</div>
              <div style="font-size:14px;font-weight:700;color:#00236F;">${dataToExport.length} Capaian</div>
            </div>
          </td>
          <td style="padding:0 6px;width:33%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Tervalidasi Fakultas</div>
              <div style="font-size:14px;font-weight:700;color:#15803d;">${totalVerified} Pengajuan</div>
            </div>
          </td>
          <td style="padding:0 0 0 6px;width:34%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Menunggu Review</div>
              <div style="font-size:14px;font-weight:700;color:#d97706;">${dataToExport.length - totalVerified} Pengajuan</div>
            </div>
          </td>
        </tr>
      </table>
      <table class="data-table">
        <thead><tr>
          <th style="width:4%;">No</th>
          <th style="width:20%;">Mahasiswa</th>
          <th style="width:28%;">Prestasi / Penghargaan</th>
          <th style="width:10%;">Tingkat</th>
          <th style="width:10%;">Peringkat</th>
          <th style="width:6%;text-align:center;">Poin</th>
          <th style="width:7%;">Tahun</th>
          <th style="width:10%;">Status</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`;
    downloadPDF(
      'Laporan Prestasi & Capaian Mahasiswa',
      `Dataset Rekapitulasi Kompetisi Dan Penghargaan — ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      contentHtml
    );
    toast.success(`Berhasil mencetak ${dataToExport.length} data prestasi!`);
  };

  const fetchData = async () => {
    setLoading(true)
    try {
      try {
        const profileRes = await api.get('/app/dashboard/profile')
        if (profileRes.data?.success && profileRes.data?.data?.fakultas) {
          setFacultyInfo(profileRes.data.data.fakultas)
        }
      } catch (err) {
        console.error("Failed to fetch faculty profile", err)
      }

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

      const res = await api.get('/app/dashboard/prestasi')
      if (res.data.status === 'success')
        setAchievements((res.data.data || []).map((a, i) => ({
          ...a,
          Mahasiswa: a.mahasiswa || a.Mahasiswa,
          NamaKegiatan: a.nama_kegiatan || a.NamaKegiatan,
          Kategori: a.kategori || a.Kategori,
          Tingkat: a.tingkat || a.Tingkat,
          Peringkat: a.peringkat || a.Peringkat,
          Status: a.status || a.Status,
          Poin: a.poin || a.Poin,
          BuktiURL: a.bukti_url || a.BuktiURL,
          CreatedAt: a.created_at || a.CreatedAt,
          ID: a.id || a.ID,
          Tipe: a.tipe || a.Tipe || 'Laporan Prestasi',
          Penyelenggara: a.penyelenggara || a.Penyelenggara || '',
          Tanggal: a.tanggal || a.Tanggal || '',
          DanaDiajukan: a.dana_diajukan || a.DanaDiajukan || 0,
          DanaDisetujui: a.dana_disetujui || a.DanaDisetujui || 0,
          CatatanVerifikator: a.catatan_verifikator || a.CatatanVerifikator || '',
          semester_filter: (a.mahasiswa || a.Mahasiswa)?.SemesterSekarang || (a.mahasiswa || a.Mahasiswa)?.semester_sekarang ? String((a.mahasiswa || a.Mahasiswa)?.SemesterSekarang || (a.mahasiswa || a.Mahasiswa)?.semester_sekarang) : '',
          periode_filter: a.tanggal || a.Tanggal ? String(new Date(a.tanggal || a.Tanggal).getFullYear()) : (a.created_at || a.CreatedAt ? String(new Date(a.created_at || a.CreatedAt).getFullYear()) : ''),
          prodi_filter: (a.mahasiswa || a.Mahasiswa)?.ProgramStudi?.Nama || (a.mahasiswa || a.Mahasiswa)?.program_studi?.nama || '',
          colorIdx: i % AVATAR_COLORS.length
        })))
    } catch { toast.error('Gagal memuat data prestasi') }
    finally { setLoading(false) }
  }

  const handleOpenVerify = (row, status) => {
    setSelected(row)
    setVerifyStatus(status)
    const isFunding = (row.Tipe || row.tipe) === "Pengajuan Dana"
    setVerifyCatatan(status === "verified" ? (isFunding ? "Pengajuan dana disetujui." : "Prestasi tervalidasi oleh Fakultas.") : "Berkas tidak sesuai kriteria.")
    setVerifyDanaDisetujui(isFunding ? String(row.DanaDiajukan || row.dana_diajukan || 0) : "")
    setVerifyPoin(isFunding ? "" : String(row.Poin || row.poin || 0))
    setIsVerifyOpen(true)
  }

  const handleVerifySubmit = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await fetch(`${API}/prestasi/${selected.ID || selected.id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Status: verifyStatus === 'verified' ? 'Diverifikasi' : 'Ditolak',
          Poin: Number(verifyPoin) || 0,
          Catatan: verifyCatatan,
          DanaDisetujui: Number(verifyDanaDisetujui) || 0
        })
      })
      const json = await res.json()
      if (json.status === 'success') {
        toast.success(verifyStatus === 'verified' ? 'Pengajuan disetujui! ✅' : 'Pengajuan ditolak ❌')
        setIsVerifyOpen(false)
        setSelected(null)
        fetchData()
      } else {
        toast.error(json.message || 'Gagal update status')
      }
    } catch {
      toast.error('Koneksi gagal saat menyimpan verifikasi')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSyncSimkatmawa = async (e, id) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const res = await api.post(`/app/dashboard/achievements/${id}/sync-simkatmawa`)
      if (res.data?.status === 'success') {
        toast.success('Berhasil sinkronisasi dengan SIMKATMAWA! ✅')
        fetchData()
      } else {
        toast.error(res.data?.message || 'Gagal sinkronisasi dengan SIMKATMAWA')
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Koneksi gagal saat sinkronisasi')
    } finally {
      setIsSubmitting(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const semesterOptions = useMemo(() => {
    const semesters = new Set()
    achievements.forEach(a => {
      if (a.semester_filter) semesters.add(a.semester_filter)
    })
    return Array.from(semesters).sort((a, b) => Number(a) - Number(b))
  }, [achievements])

  const periodeOptions = useMemo(() => {
    const periods = new Set()
    achievements.forEach(a => {
      if (a.periode_filter) periods.add(a.periode_filter)
    })
    return Array.from(periods).sort((a, b) => Number(b) - Number(a))
  }, [achievements])

  const prodiOptions = useMemo(() => {
    const prodis = new Set()
    achievements.forEach(a => {
      if (a.prodi_filter) prodis.add(a.prodi_filter)
    })
    return Array.from(prodis).sort()
  }, [achievements])

  const filtered = useMemo(() => achievements.filter(a => {
    const q = search.toLowerCase()
    const matchQ = !q || a.Mahasiswa?.Nama?.toLowerCase().includes(q) || a.NamaKegiatan?.toLowerCase().includes(q)
    const st = (a.Status || '').toLowerCase()
    const matchS = filterStatus === 'all' || st === filterStatus || (filterStatus === 'verified' && ['verified', 'terverifikasi', 'disetujui', 'diverifikasi'].includes(st))

    const matchSem = filterSemester === 'all' || a.semester_filter === filterSemester
    
    let matchPer = filterPeriode === 'all'
    if (!matchPer && a.periode_filter) {
      const yearFromPeriod = filterPeriode.length >= 4 ? filterPeriode.substring(0, 4) : filterPeriode;
      matchPer = a.periode_filter === filterPeriode || a.periode_filter === yearFromPeriod
    }

    const matchPr = filterProdi === 'all' || a.prodi_filter === filterProdi

    return matchQ && matchS && matchSem && matchPer && matchPr
  }), [achievements, search, filterStatus, filterSemester, filterPeriode, filterProdi])

  const sorted = useMemo(() => {
    let items = [...filtered]
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        let aVal, bVal;
        if (sortConfig.key === 'mahasiswa') {
          aVal = a.Mahasiswa?.Nama || ''
          bVal = b.Mahasiswa?.Nama || ''
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
    total: achievements.length,
    verified: achievements.filter(a => ['verified', 'terverifikasi', 'disetujui', 'diverifikasi'].includes((a.Status || '').toLowerCase())).length,
    pending: achievements.filter(a => !['verified', 'terverifikasi', 'disetujui', 'diverifikasi', 'rejected', 'ditolak'].includes((a.Status || '').toLowerCase())).length,
  }

  const tingkatData = useMemo(() => {
    const counts = {}
    achievements.forEach(a => {
      const t = a.Tingkat || 'Lokal'
      counts[t] = (counts[t] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [achievements])

  const kategoriData = useMemo(() => {
    const counts = {}
    achievements.forEach(a => {
      const k = a.Kategori || 'Umum'
      counts[k] = (counts[k] || 0) + 1
    })
    return Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 8).map(([name, value]) => ({ name, value }))
  }, [achievements])

  const monthlyTrendData = useMemo(() => {
    const byMonth = {}
    achievements.forEach(a => {
      const date = a.created_at || a.CreatedAt
      if (!date) return
      const d = new Date(date)
      if (isNaN(d.getTime())) return
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth[key] = (byMonth[key] || 0) + 1
    })
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    return Object.entries(byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([m, v]) => {
        const [y, mo] = m.split('-')
        return { month: `${months[parseInt(mo) - 1]} ${y}`, value: v }
      })
  }, [achievements])

  const PIE_COLORS = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444']

  const tableColumns = [
    {
      key: 'mahasiswa',
      label: 'Mahasiswa',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <StudentAvatar src={getFullUrl(row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url || row.Mahasiswa?.Foto || row.Mahasiswa?.Pengguna?.Foto)} name={row.Mahasiswa?.Nama} className="w-9 h-9 rounded-xl" />
          <div>
            <p className="font-bold text-sm text-[var(--theme-text)] leading-snug">{row.Mahasiswa?.Nama || '—'}</p>
            <p className="text-[10px] text-[var(--theme-text-muted)] font-medium">{row.Mahasiswa?.NIM || '—'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'NamaKegiatan',
      label: 'Prestasi / Penghargaan',
      sortable: true,
      render: (val, row) => (
        <div>
          <p className="font-bold text-sm text-[var(--theme-text)] leading-snug max-w-[200px] truncate">{row.NamaKegiatan || '—'}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="inline-block text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary-light)] px-2 py-0.5 rounded-md border border-[var(--theme-primary)]/20">{row.Kategori || 'Umum'}</span>
            <span className={cn('inline-block text-[10px] font-bold px-2 py-0.5 rounded-md border', row.Tipe === 'Pengajuan Dana' ? 'text-[var(--theme-warning)] bg-[var(--theme-warning-light)] border-[var(--theme-warning)]/20' : 'text-[var(--theme-success)] bg-[var(--theme-success-light)] border-[var(--theme-success)]/20')}>{row.Tipe || 'Laporan Prestasi'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'Tingkat',
      label: 'Tingkat',
      sortable: true,
      render: (val, row) => {
        const tingkat = (row.Tingkat || 'Lokal').toLowerCase();
        let tingkatCls = 'bg-[var(--theme-surface-hover)] text-[var(--theme-text)] border-[var(--theme-border)]';
        if (tingkat === 'internasional') tingkatCls = 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20';
        else if (tingkat === 'nasional') tingkatCls = 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info)]/20';
        else if (tingkat === 'regional') tingkatCls = 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20';
        
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider', tingkatCls)}>
            {row.Tingkat || 'Lokal'}
          </span>
        );
      }
    },
    {
      key: 'Status',
      label: 'Status',
      sortable: true,
      render: (val, row) => {
        const st = getStatus(row.Status);
        let cls = 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20';
        let dot = 'bg-[var(--theme-warning)]';
        if (st.label === 'Terverifikasi' || st.label === 'Disetujui') {
            cls = 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20';
            dot = 'bg-[var(--theme-success)]';
        } else if (st.label === 'Ditolak') {
            cls = 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20';
            dot = 'bg-[var(--theme-error)]';
        }

        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap', cls)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', dot)} />{st.label}
          </span>
        );
      }
    },
    {
      key: 'CreatedAt',
      label: 'Tahun',
      sortable: true,
      render: (val, row) => (
        <span className="text-xs text-[var(--theme-text-muted)] font-medium whitespace-nowrap">
          {row.CreatedAt ? new Date(row.CreatedAt).getFullYear() : '—'}
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center gap-1.5">
          <button onClick={() => setSelected(row)}
            className="p-1.5 text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors" title="Detail">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }} >visibility</span>
          </button>
          {canManageAchievement && (row.Status || '').toLowerCase() === 'menunggu' && (
            <>
              <button onClick={() => handleOpenVerify(row, 'verified')} disabled={isSubmitting}
                className="p-1.5 text-[var(--theme-text-muted)] hover:text-[var(--theme-success)] hover:bg-[var(--theme-success-light)] rounded-lg transition-colors" title="Setujui">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }} >check_circle</span>
              </button>
              <button onClick={() => handleOpenVerify(row, 'rejected')} disabled={isSubmitting}
                className="p-1.5 text-[var(--theme-text-muted)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] rounded-lg transition-colors" title="Tolak">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }} >close</span>
              </button>
            </>
          )}
          {canManageAchievement && ['diverifikasi', 'valid', 'disetujui', 'verified'].includes((row.Status || '').toLowerCase()) && !row.SimkatmawaId && (
            <button onClick={(e) => handleSyncSimkatmawa(e, row.ID || row.id)} disabled={isSubmitting}
              className="p-1.5 text-[var(--theme-text-muted)] hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sinkron SIMKATMAWA">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }} >sync</span>
            </button>
          )}
          {canManageAchievement && (
            <button onClick={() => handleDelete(row.ID || row.id)}
              className="p-1.5 text-[var(--theme-text-muted)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] rounded-lg transition-colors" title="Hapus">
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }} >delete</span>
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        icon="emoji_events"
        title="Validasi "
        highlightedTitle="Prestasi"
        subtitle="Verifikasi dan validasi capaian mahasiswa dalam kompetisi akademik maupun non-akademik."
        badges={[
          { label: 'Student Achievement', active: false },
          { label: `${stats.total} Pengajuan Masuk`, active: true }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-[180px] h-10 border border-slate-200/80 bg-white/80 rounded-xl text-xs font-bold text-slate-600 focus:ring-0">
                <SelectValue placeholder="Semua Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Periode</SelectItem>
                {periodsList.length > 0 ? periodsList.map(p => (
                  <SelectItem key={p.id || p.ID} value={String(p.sevima_id || p.id || p.ID)}>
                    {p.AcademicYear} · {p.Semester} {p.IsActive ? '⭐' : ''}
                  </SelectItem>
                )) : periodeOptions.map(per => (
                  <SelectItem key={per} value={per}>Periode {per}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button onClick={exportAchievementsPDF} disabled={loading || achievements.length === 0}
              className="h-10 px-4 rounded-xl border border-[var(--theme-primary)]/30 bg-[var(--theme-primary)]/10 text-xs font-bold uppercase tracking-wider text-[var(--theme-primary)] hover:bg-[var(--theme-primary)] hover:text-white shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2 shrink-0">
              <Download size={13} className="text-current" /> Ekspor PDF
            </button>
            <button onClick={fetchData} disabled={loading}
              className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none">
              {loading ? <span className="material-symbols-outlined animate-spin text-current" style={{ fontSize: '13px' }}>sync</span> : <RefreshCw size={13} className="text-current" />} Refresh Data
            </button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <PrimaryStatsCard title="Total Pengajuan" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.total} icon={Trophy} colorTheme="primary" badgeText="Prestasi masuk" />
        <PrimaryStatsCard title="Tervalidasi" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.verified} icon={CheckCircle2} colorTheme="success" badgeText="Sudah diverifikasi" />
        <PrimaryStatsCard title="Menunggu Review" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.pending} icon={Clock} colorTheme="warning" badgeText="Perlu tindak lanjut" />
      </div>

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Pie: Tingkat Prestasi */}
          <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-4 shrink-0">
                <div className="w-12 h-12 bg-[var(--theme-info-light)] rounded-xl flex justify-center items-center text-[var(--theme-info)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">pie_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Analisis Data</span>
                  <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Tingkat Prestasi</h3>
                </div>
              </div>
              <div className="flex-1 w-full flex flex-col justify-center">
                {tingkatData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={tingkatData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {tingkatData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-[var(--theme-text-subtle)] italic text-center w-full block">Tidak ada data</span>}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-4">
                {tingkatData.slice(0, 4).map((item, i) => (
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

          {/* Bar: Kategori Terbanyak */}
          <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-4 shrink-0">
                <div className="w-12 h-12 bg-[var(--theme-success-light)] rounded-xl flex justify-center items-center text-[var(--theme-success)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">bar_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Demografi</span>
                  <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Kategori Terbanyak</h3>
                </div>
              </div>
              <div className="flex-1 w-full flex flex-col justify-center">
                {kategoriData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={kategoriData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border-muted)" />
                      <XAxis type="number" tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                      <Bar dataKey="value" name="Jumlah" fill="var(--theme-success)" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><span className="text-xs text-[var(--theme-text-subtle)] italic">Tidak ada data</span></div>}
              </div>
            </div>
          </div>

          {/* Line: Tren Pengajuan */}
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
                      <Line type="monotone" dataKey="value" name="Prestasi" stroke="var(--theme-warning)" strokeWidth={2.5} dot={{ fill: 'var(--theme-warning)', r: 3 }} activeDot={{ r: 5, fill: 'var(--theme-warning)' }} />
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
          title="Daftar Prestasi"
          subtitle="Menampilkan daftar prestasi di fakultas."
          data={filtered}
          columns={tableColumns}
          loading={loading}
          searchable={true}
          pagination={true}
          pageSize={10}
          emptyMessage="Tidak Ada Pengajuan"
          emptyIcon="emoji_events"
          searchPlaceholder="Cari nama atau prestasi..."
          searchValue={search}
          onSearchChange={setSearch}
          manualFiltering={true}
          filterValues={{
            status: filterStatus,
            semester: filterSemester,
            prodi: filterProdi
          }}
          onFilterChange={(key, val) => {
            if (key === 'status') setFilterStatus(val);
            if (key === 'semester') setFilterSemester(val);
            if (key === 'prodi') setFilterProdi(val);
          }}
          filters={[
            {
              key: 'status',
              placeholder: 'Status',
              options: [
                { value: 'verified', label: 'Terverifikasi' },
                { value: 'pending', label: 'Menunggu' },
                { value: 'rejected', label: 'Ditolak' }
              ],
              className: 'w-40'
            },
            {
              key: 'semester',
              placeholder: 'Semester',
              options: semesterOptions.map(sem => ({ value: sem, label: `Semester ${sem}` })),
              className: 'w-44'
            },
            {
              key: 'prodi',
              placeholder: 'Prodi',
              options: prodiOptions.map(prod => ({ value: prod, label: prod })),
              className: 'w-48'
            }
          ]}
        />
      </div>

      {/* Detail Modal */}
      <DialogModal
        open={!!selected && !isVerifyOpen}
        onOpenChange={(open) => !open && setSelected(null)}
        icon="emoji_events"
        title={selected?.NamaKegiatan}
        subtitle={`${selected?.Mahasiswa?.Nama || ''} · ${selected?.Mahasiswa?.NIM || ''}`}
        badgeText={selected?.Tipe === 'Pengajuan Dana' ? 'DANA LOMBA' : 'PRESTASI MAHASISWA'}
        maxWidth="max-w-lg"
        footer={
          <>
            <ModalCancelButton onClick={() => setSelected(null)}>Tutup</ModalCancelButton>
            {canManageAchievement && selected && selected.Status === "pending" && (
                <>
                <Button onClick={() => handleVerifyClick(selected, "verified")}
                  className="w-full md:w-auto h-11 px-8 rounded-xl bg-green-600 hover:bg-green-700 text-white text-[10px] font-black tracking-widest uppercase cursor-pointer flex items-center justify-center gap-2 border-none">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check_circle</span> Validasi Prestasi
                </Button>
                <Button onClick={() => handleVerifyClick(selected, "rejected")} variant="destructive"
                  className="w-full md:w-auto h-11 px-8 rounded-xl bg-red-500 hover:bg-red-600 text-white text-[10px] font-black tracking-widest uppercase cursor-pointer flex items-center justify-center gap-2 border-none">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>cancel</span> Tolak
                </Button>
                </>
              )}
              {canManageAchievement && selected && selected.Status === "verified" && (
                <Button onClick={(e) => handleSyncSimkatmawa(e, selected.ID || selected.id)} disabled={isSubmitting}
                  className="w-full md:w-auto h-11 px-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black tracking-widest uppercase cursor-pointer flex items-center justify-center gap-2 border-none">
                  <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>sync</span> Kirim ke SIMKATMAWA
                </Button>
              )}
          </>
        }
      >
        <div className="space-y-4 px-1 pb-2">
            {selected && (
              <>
                {/* Clean Status Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] rounded-2xl">
                  <div className="flex flex-wrap gap-2">
                    {selected.Kategori && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <Award size={12} className="text-slate-400" />
                        {selected.Kategori}
                      </span>
                    )}
                    {selected.Tingkat && (
                      <span className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                        <Star size={12} className="text-slate-400" />
                        {selected.Tingkat}
                      </span>
                    )}
                  </div>
                  <span className={cn('inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest',
                    ['verified', 'terverifikasi', 'disetujui', 'diverifikasi'].includes((selected.Status || '').toLowerCase())
                      ? 'bg-emerald-50 text-emerald-700'
                      : (selected.Status || '').toLowerCase().includes('tolak') || (selected.Status || '').toLowerCase() === 'rejected'
                        ? 'bg-rose-50 text-rose-700'
                        : 'bg-amber-50 text-amber-700'
                  )}>
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                    {getStatus(selected.Status).label}
                  </span>
                </div>

                {/* Ditolak alert */}
                {((selected.Status || '').toLowerCase().includes('tolak') || (selected.Status || '').toLowerCase() === 'rejected') && (
                  <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-rose-600 flex-shrink-0 mt-0.5" style={{ fontSize: '18px' }} >info</span>
                    <div>
                      <p className="font-bold text-rose-700 text-xs uppercase tracking-wider mb-1">Alasan Penolakan</p>
                      <p className="text-rose-600 text-sm">{selected.CatatanVerifikator || 'Berkas tidak sesuai kriteria.'}</p>
                    </div>
                  </div>
                )}

                {/* SIMKATMAWA Info */}
                {selected.SimkatmawaId && (
                  <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-600 flex-shrink-0 mt-0.5" style={{ fontSize: '18px' }} >cloud_sync</span>
                    <div className="flex-1">
                      <p className="font-bold text-blue-700 text-xs uppercase tracking-wider mb-1">Status SIMKATMAWA</p>
                      <p className="text-blue-600 text-sm mb-3">Tersinkronisasi dengan ID <span className="font-bold">{selected.SimkatmawaId}</span></p>
                      <select
                        className="bg-white border border-blue-200 text-blue-700 text-xs font-semibold rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-blue-300 transition-colors w-full sm:w-auto"
                        value={selected.SimkatmawaStatus || "Sukses"}
                        onChange={async (e) => {
                          const newStatus = e.target.value;
                          try {
                            await api.put(`/app/dashboard/achievements/${selected.ID || selected.id}/simkatmawa-status`, { simkatmawa_status: newStatus });
                            toast.success("Status SIMKATMAWA diperbarui!");
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
                )}

                {/* Clean Info Grid Card */}
                <div className="bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>feed</span>
                    Informasi Utama
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-5 gap-x-6">
                    {[
                      { label: 'Program Studi', value: selected.Mahasiswa?.ProgramStudi?.Nama || selected.mahasiswa?.program_studi?.nama, full: true },
                      selected.Tipe === 'Rekognisi' ? { label: 'Jenis Rekognisi', value: selected.jenis_rekognisi || selected.JenisRekognisi || "—" } : null,
                      selected.Tipe !== 'Pengajuan Dana' && selected.Tipe !== 'Rekognisi' ? { label: 'Kategori', value: selected.Kategori || selected.kategori || "—" } : null,
                      selected.Tipe === 'Sertifikasi' || selected.Tipe === 'Prestasi Mandiri' ? { label: 'Tingkat', value: selected.Tingkat || selected.tingkat || "Lokal" } : null,
                      selected.Tipe !== 'Pengajuan Dana' && selected.Tipe !== 'Rekognisi' ? { label: 'Peringkat', value: selected.Peringkat || selected.peringkat || "—" } : null,
                      selected.Tipe !== 'Pengajuan Dana' ? { label: 'Cabang Lomba', value: selected.cabang || selected.Cabang || "—" } : null,
                      selected.Tipe !== 'Pengajuan Dana' ? { label: 'Bentuk & Kelompok', value: `${selected.bentuk || selected.Bentuk || "luring/hibrida"} - ${selected.kelompok_prestasi || selected.KelompokPrestasi || "individu"}` } : null,
                      selected.Tipe !== 'Pengajuan Dana' ? { label: 'Jumlah PT Peserta', value: selected.jumlah_unit_peserta || selected.JumlahUnitPeserta || "1" } : null,
                      { label: 'Tanggal', value: formatDate(selected.CreatedAt) },
                      selected.Tipe === 'Pengajuan Dana' ? { label: 'Dana Diajukan', value: `Rp ${(selected.DanaDiajukan || 0).toLocaleString('id-ID')}` } : null,
                      selected.Tipe === 'Pengajuan Dana' && selected.DanaDisetujui > 0 ? { label: 'Dana Disetujui', value: `Rp ${selected.DanaDisetujui.toLocaleString('id-ID')}` } : null,
                    ].filter(Boolean).map(r => (
                      <div key={r.label} className={r.full ? 'sm:col-span-2' : ''}>
                        <p className="text-[11px] font-semibold text-slate-400 mb-1">{r.label}</p>
                        <p className="text-sm font-semibold text-slate-800">{r.value || '—'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Clean Bukti Card & Tautan Tambahan */}
                <div className="bg-white border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.05)] p-5 rounded-2xl mt-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>attach_file</span>
                    Dokumen & Tautan Pendukung
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Berkas Utama */}
                    {selected.BuktiURL || selected.bukti_url ? (
                      <a href={`${API_BASE_URL.replace('/api', '')}${selected.BuktiURL || selected.bukti_url}`} target="_blank" rel="noreferrer"
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-[var(--theme-primary)]/50 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--theme-primary)] transition-colors">{(selected.BuktiURL || selected.bukti_url).split('/').pop() || 'Dokumen Utama'}</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Klik untuk melihat berkas</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-[var(--theme-primary)] ml-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 bg-slate-50">
                        <div className="w-10 h-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-300 flex-shrink-0">
                          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>description</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-600">Belum Ada Lampiran</p>
                          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Dokumen utama tidak tersedia</p>
                        </div>
                      </div>
                    )}

                    {/* URL Peserta */}
                    {(selected.url_peserta || selected.UrlPeserta) && (
                      <a href={(selected.url_peserta || selected.UrlPeserta).startsWith('http') ? (selected.url_peserta || selected.UrlPeserta) : `https://${(selected.url_peserta || selected.UrlPeserta)}`} target="_blank" rel="noreferrer"
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-[var(--theme-primary)]/50 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm border border-blue-100">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>link</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--theme-primary)] transition-colors">URL Kompetisi</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Klik untuk membuka tautan</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-[var(--theme-primary)] ml-3 flex-shrink-0" />
                      </a>
                    )}

                    {/* URL Sertifikat */}
                    {(selected.url_sertifikat || selected.UrlSertifikat) && (
                      <a href={(selected.url_sertifikat || selected.UrlSertifikat).startsWith('http') ? (selected.url_sertifikat || selected.UrlSertifikat) : `https://${(selected.url_sertifikat || selected.UrlSertifikat)}`} target="_blank" rel="noreferrer"
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-[var(--theme-primary)]/50 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm border border-emerald-100">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>workspace_premium</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--theme-primary)] transition-colors">URL Sertifikat</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Tautan sertifikat Simkatmawa</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-[var(--theme-primary)] ml-3 flex-shrink-0" />
                      </a>
                    )}

                    {/* URL Foto UPP */}
                    {(selected.url_foto_upp || selected.UrlFotoUpp) && (
                      <a href={(selected.url_foto_upp || selected.UrlFotoUpp).startsWith('http') ? (selected.url_foto_upp || selected.UrlFotoUpp) : `https://${(selected.url_foto_upp || selected.UrlFotoUpp)}`} target="_blank" rel="noreferrer"
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-[var(--theme-primary)]/50 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm border border-purple-100">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>photo_camera</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--theme-primary)] transition-colors">URL Foto UPP</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Tautan foto penerimaan penghargaan</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-[var(--theme-primary)] ml-3 flex-shrink-0" />
                      </a>
                    )}

                    {/* URL Dokumen Undangan */}
                    {(selected.url_dokumen_undangan || selected.UrlDokumenUndangan) && (
                      <a href={(selected.url_dokumen_undangan || selected.UrlDokumenUndangan).startsWith('http') ? (selected.url_dokumen_undangan || selected.UrlDokumenUndangan) : `https://${(selected.url_dokumen_undangan || selected.UrlDokumenUndangan)}`} target="_blank" rel="noreferrer"
                        className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-[var(--theme-primary)]/50 hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform shadow-sm border border-orange-100">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>mail</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate group-hover:text-[var(--theme-primary)] transition-colors">URL Undangan</p>
                            <p className="text-[11px] text-slate-500 font-medium mt-0.5">Tautan undangan kegiatan</p>
                          </div>
                        </div>
                        <ExternalLink size={16} className="text-slate-400 group-hover:text-[var(--theme-primary)] ml-3 flex-shrink-0" />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
        </div>
      </DialogModal>

      {/* Verification Action Dialog */}
      <DialogModal
        open={isVerifyOpen && !!selected}
        onOpenChange={setIsVerifyOpen}
        icon={verifyStatus === "verified" ? "check_circle" : "close"}
        iconTheme={verifyStatus === "verified" ? "success" : "error"}
        badgeText={verifyStatus === "verified" ? "APPROVE" : "REJECT"}
        title={verifyStatus === "verified" ? "Setujui Pengajuan" : "Tolak Pengajuan"}
        subtitle="Tuliskan catatan verifikasi hasil peninjauan berkas mahasiswa."
        maxWidth="max-w-md"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsVerifyOpen(false)}>Batal</ModalCancelButton>
            <ModalSaveButton type="submit" form="verifyForm" isSubmitting={isSubmitting} variant={verifyStatus === "verified" ? "success" : "danger"}>
              {verifyStatus === "verified" ? "Validasi" : "Tolak"}
            </ModalSaveButton>
          </>
        }
      >
        <form id="verifyForm" onSubmit={handleVerifySubmit} className="flex flex-col">
          <div className="space-y-4 pt-1">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-black text-[var(--theme-text-muted)] tracking-[0.2em] ml-1 uppercase">Catatan Verifikator</label>
                <textarea
                  placeholder="Masukkan catatan tinjauan berkas..."
                  value={verifyCatatan}
                  onChange={(e) => setVerifyCatatan(e.target.value)}
                  className="rounded-2xl border-2 border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 text-xs font-bold text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none min-h-[100px] transition-all resize-none shadow-sm hover:border-[var(--theme-border-muted)]"
                  required
                />
              </div>

              {selected && ((selected.Tipe || selected.tipe) === "Pengajuan Dana" ? (
                verifyStatus === "verified" && (
                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-[10px] font-black text-[var(--theme-text-muted)] tracking-[0.2em] ml-1 uppercase">Dana yang Disetujui (Rp)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-[var(--theme-text-muted)] text-sm">Rp</span>
                      <input
                        type="number"
                        value={verifyDanaDisetujui}
                        onChange={(e) => setVerifyDanaDisetujui(e.target.value)}
                        className="h-12 w-full rounded-2xl border-2 border-[var(--theme-border)] bg-[var(--theme-surface)] pl-10 pr-4 text-sm font-black text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-all shadow-sm hover:border-[var(--theme-border-muted)]"
                        placeholder="Contoh: 1500000"
                        required
                      />
                    </div>
                  </div>
                )
              ) : null)}
          </div>
        </form>
      </DialogModal>
    </PageContent>
  )
}
