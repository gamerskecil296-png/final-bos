"use client"

import React, { useState, useEffect, useMemo } from 'react'
import api from '@/lib/axios'
import { API_BASE_URL, adminService } from '@/services/api'
import { toast, Toaster } from 'react-hot-toast'
import useAuthStore from '@/store/useAuthStore'

import { cn } from '@/lib/utils'
import { SelectField, SelectOption } from "@/components/ui/SelectField"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { DialogModal, ModalCancelButton } from "@/components/ui/DialogModal"
import { Card, CardContent } from '@/components/ui/Card'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'
import { Download, RefreshCw, FileText, Search, Filter } from 'lucide-react'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Droplet = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>opacity</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const HeartPulse = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>monitor_heart</span>;
const AlertCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>error</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const Calendar = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>calendar_today</span>;
const GraduationCap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const ShieldCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified_user</span>;



const AVATAR_COLORS = [
  'from-blue-400 to-indigo-500', 'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500', 'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500', 'from-cyan-400 to-sky-500',
]
const getInitials = (n = '') => n.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() || '?'

const HEALTH_STATUS = {
  prima: { cls: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/10', dot: 'bg-[var(--theme-success)]' },
  stabil: { cls: 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info)]/10', dot: 'bg-[var(--theme-info)]' },
  pantauan: { cls: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/10', dot: 'bg-[var(--theme-warning)]' },
  kritis: { cls: 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/10', dot: 'bg-[var(--theme-error)]' },
}
const getHealth = (v = '') => HEALTH_STATUS[(v || 'stabil').toLowerCase()] || HEALTH_STATUS.stabil

const formatDate = (d) => { try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d } }

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

export default function FacultyKesehatan() {
  const [loading, setLoading] = useState(true)
  const [healthRecords, setHealthRecords] = useState([])
  const [statsData, setStatsData] = useState({ total: 0, condition: { prima: 0, stabil: 0, pantauan: 0, kritis: 0 } })
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterProdi, setFilterProdi] = useState('all')
  const [filterBlood, setFilterBlood] = useState('all')
  const [filterJenis, setFilterJenis] = useState('all')
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [facultyInfo, setFacultyInfo] = useState(null)
  const [periodeOptions, setPeriodeOptions] = useState([])

  const [statsDetail, setStatsDetail] = useState(null)
  const [statsSearch, setStatsSearch] = useState('')

  const uniqueProdis = useMemo(() => {
    const prodis = new Set();
    healthRecords.forEach(r => {
      if (r.Mahasiswa?.ProgramStudi?.Nama) {
        prodis.add(r.Mahasiswa.ProgramStudi.Nama);
      }
    });
    return Array.from(prodis);
  }, [healthRecords]);

  const uniqueJenis = useMemo(() => {
    const js = new Set();
    healthRecords.forEach(r => {
      if (r.JenisPemeriksaan) {
        js.add(r.JenisPemeriksaan);
      }
    });
    return Array.from(js);
  }, [healthRecords]);

  // Empty space where availablePeriods used to be

  const handleOpenStatsDetail = (key, label) => {
    let list = []
    if (key === 'total') {
      list = healthRecords
    } else {
      list = healthRecords.filter(r => (r.StatusKesehatan || '').toLowerCase() === key)
    }
    setStatsDetail({ label, key, list })
    setStatsSearch('')
  }

  const filteredStatsDetailList = useMemo(() => {
    if (!statsDetail) return []
    const q = statsSearch.toLowerCase()
    return statsDetail.list.filter(r =>
      !q || r.Mahasiswa?.Nama?.toLowerCase().includes(q) || r.Mahasiswa?.NIM?.includes(q) || r.Mahasiswa?.ProgramStudi?.Nama?.toLowerCase().includes(q)
    )
  }, [statsDetail, statsSearch])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortConfig, setSortConfig] = useState({ key: 'Tanggal', direction: 'desc' })

  const getKopImage = (facName) => {
    const name = (facName || "").toLowerCase();
    if (name.includes("farmasi")) return "kop_farmasi.jpg";
    if (name.includes("kesehatan") || name.includes("fikes")) return "kop_ilmu_kesehatan.jpg";
    if (name.includes("keperawatan") || name.includes("fkep")) return "kop_keperawatan.jpg";
    if (name.includes("sosial") || name.includes("social") || name.includes("sosiologi") || name.includes("fis")) return "kop_ilmu_sosial.jpg";
    return "kop_farmasi.jpg";
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
          setPeriodeOptions(periodRes.data)
        } else if (periodRes?.data?.status === 'success' && periodRes?.data?.data) {
          setPeriodeOptions(periodRes.data.data)
        }
      } catch (err) {
        console.error("Failed to fetch periods", err)
      }

      const progRes = await api.get('/app/dashboard/health-screening')
      if (progRes.data.status === 'success') {
        const normalized = (progRes.data.data || []).map((r, i) => ({
          ...r,
          Mahasiswa: r.mahasiswa,
          GolonganDarah: r.golongan_darah,
          StatusKesehatan: r.status_kesehatan,
          Tanggal: r.tanggal,
          TinggiBadan: r.tinggi_badan,
          BeratBadan: r.berat_badan,
          Sistole: r.sistole,
          Diastole: r.diastole,
          GulaDarah: r.gula_darah,
          ButaWarna: r.buta_warna,
          RiwayatPenyakit: r.riwayat_penyakit,
          FileURL: r.file_url,
          JenisPemeriksaan: r.jenis_pemeriksaan,
          Hasil: r.hasil,
          Catatan: r.catatan,
          colorIdx: i % AVATAR_COLORS.length
        }))
        setHealthRecords(normalized)
      }
    } catch { toast.error('Gagal sinkronisasi data kesehatan') }
    finally { setLoading(false) }
  }

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
      .badge-prima    { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
      .badge-stabil   { background:#dbeafe; color:#1d4ed8; border:1px solid #bfdbfe; }
      .badge-pantauan { background:#fef9c3; color:#a16207; border:1px solid #fef08a; }
      .badge-kritis   { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
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

  const exportHealthPDF = () => {
    if (healthRecords.length === 0) { toast.error('Tidak ada data kesehatan untuk diekspor'); return; }
    const dataToExport = filtered.length > 0 && filtered.length < healthRecords.length ? filtered : healthRecords;
    const calcBMI = (r) => {
      if (!r.TinggiBadan || r.TinggiBadan <= 0) return '—';
      return (r.BeratBadan / Math.pow(r.TinggiBadan / 100, 2)).toFixed(1);
    };
    const healthBadge = (s) => `<span class="badge badge-${(s || 'stabil').toLowerCase()}">${s || 'Stabil'}</span>`;
    let rows = '';
    dataToExport.forEach((r, i) => {
      const bmiVal = calcBMI(r);
      rows += `<tr>
        <td>${i + 1}</td>
        <td style="font-weight:700;">${r.Mahasiswa?.Nama || '—'}<br/><span style="font-size:7px;color:#64748b;">NIM: ${r.Mahasiswa?.NIM || '—'}</span></td>
        <td>${r.Mahasiswa?.ProgramStudi?.Nama || '—'}</td>
        <td style="text-align:center;font-weight:700;color:#dc2626;">${r.GolonganDarah || '?'}</td>
        <td style="text-align:center;">${r.TinggiBadan ? parseFloat(r.TinggiBadan).toFixed(1) + ' cm' : '—'}</td>
        <td style="text-align:center;">${r.BeratBadan ? parseFloat(r.BeratBadan).toFixed(1) + ' kg' : '—'}</td>
        <td style="text-align:center;${bmiVal !== '—' && parseFloat(bmiVal) >= 25 ? 'color:#dc2626;font-weight:700;' : ''}">${bmiVal}</td>
        <td style="text-align:center;">${(r.Sistole || r.Diastole) ? r.Sistole + '/' + r.Diastole + ' mmHg' : '—'}</td>
        <td>${healthBadge(r.StatusKesehatan)}</td>
        <td>${r.Tanggal ? new Date(r.Tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
      </tr>`;
    });
    const prima = dataToExport.filter(r => (r.StatusKesehatan || '').toLowerCase() === 'prima').length;
    const pantauan = dataToExport.filter(r => (r.StatusKesehatan || '').toLowerCase() === 'pantauan').length;
    const content = `<table style="width:100%;border-collapse:collapse;border:none;margin-bottom:16px;"><tr>
      <td style="padding:0 5px 0 0;width:33%;"><div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
        <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Total Rekam Medis</div>
        <div style="font-size:14px;font-weight:700;color:#00236F;">${dataToExport.length} Data</div>
      </div></td>
      <td style="padding:0 5px;width:33%;"><div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
        <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Kondisi Prima</div>
        <div style="font-size:14px;font-weight:700;color:#15803d;">${prima} Orang</div>
      </div></td>
      <td style="padding:0 0 0 5px;width:34%;"><div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
        <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Dalam Pantauan</div>
        <div style="font-size:14px;font-weight:700;color:#d97706;">${pantauan} Orang</div>
      </div></td>
    </tr></table>
    <table class="data-table"><thead><tr>
      <th style="width:4%;">No</th>
      <th style="width:20%;">Mahasiswa</th>
      <th style="width:18%;">Program Studi</th>
      <th style="width:6%;text-align:center;">Gol. Darah</th>
      <th style="width:8%;text-align:center;">Tinggi</th>
      <th style="width:7%;text-align:center;">Berat</th>
      <th style="width:6%;text-align:center;">BMI</th>
      <th style="width:12%;text-align:center;">Tekanan Darah</th>
      <th style="width:9%;">Status</th>
      <th style="width:10%;">Tgl Periksa</th>
    </tr></thead><tbody>${rows}</tbody></table>`;
    downloadPDF(
      'Rekap Skrining Kesehatan Mahasiswa Fakultas',
      `Laporan Monitoring Rekam Medis — ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      content
    );
    toast.success(`Berhasil mencetak ${dataToExport.length} data rekam medis!`);
  };

  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => healthRecords.filter(r => {
    const q = search.toLowerCase()
    const matchQ = !q || r.Mahasiswa?.Nama?.toLowerCase().includes(q) || r.Mahasiswa?.NIM?.includes(q)
    const matchS = filterStatus === 'all' || (r.StatusKesehatan || '').toLowerCase() === filterStatus
    const matchProdi = filterProdi === 'all' || r.Mahasiswa?.ProgramStudi?.Nama === filterProdi
    const matchBlood = filterBlood === 'all' || (r.GolonganDarah || '').toUpperCase() === filterBlood.toUpperCase()
    const matchJenis = filterJenis === 'all' || r.JenisPemeriksaan === filterJenis
    let matchPer = filterPeriode === 'all'
    if (!matchPer) {
      const yearFromPeriod = filterPeriode.length >= 4 ? filterPeriode.substring(0, 4) : filterPeriode;
      const mhsYear = String(r.Mahasiswa?.TahunMasuk || r.Mahasiswa?.tahun_masuk || r.Mahasiswa?.Angkatan || r.Mahasiswa?.angkatan || (r.Mahasiswa?.NIM ? `20${r.Mahasiswa.NIM.substring(0, 2)}` : ''))
      matchPer = mhsYear === filterPeriode || mhsYear === yearFromPeriod
    }
    return matchQ && matchS && matchProdi && matchBlood && matchJenis && matchPer
  }), [healthRecords, search, filterStatus, filterProdi, filterBlood, filterJenis, filterPeriode])

  const sorted = useMemo(() => {
    let items = [...filtered]
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

        if (sortConfig.key === 'Mahasiswa.Nama') {
          aVal = a.Mahasiswa?.Nama || ''
          bVal = b.Mahasiswa?.Nama || ''
        } else if (sortConfig.key === 'Mahasiswa.ProgramStudi.Nama') {
          aVal = a.Mahasiswa?.ProgramStudi?.Nama || ''
          bVal = b.Mahasiswa?.ProgramStudi?.Nama || ''
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

  const bmi = (r) => {
    if (!r.TinggiBadan || r.TinggiBadan <= 0) return null
    return (r.BeratBadan / Math.pow(r.TinggiBadan / 100, 2)).toFixed(1)
  }

  // Calculate max values for the new StatsCards
  const maxGol = useMemo(() => {
    const golMap = {}
    filtered.forEach(r => {
      const gol = r.GolonganDarah || 'Unknown'
      if (!golMap[gol]) golMap[gol] = 0
      golMap[gol]++
    })
    if (Object.keys(golMap).length === 0) return { name: '—', count: 0 };
    const max = Object.entries(golMap).reduce((a, b) => b[1] > a[1] ? b : a);
    return { name: max[0], count: max[1] };
  }, [filtered]);

  const avgBmi = useMemo(() => {
    const valid = filtered.filter(r => bmi(r));
    if (valid.length === 0) return 0;
    return (valid.reduce((a, r) => a + (parseFloat(bmi(r)) || 0), 0) / valid.length).toFixed(1);
  }, [filtered]);

  const maxGender = useMemo(() => {
    const gMap = { 'Laki-laki': 0, 'Perempuan': 0 }
    filtered.forEach(r => {
      const g = r.Mahasiswa?.jenis_kelamin || r.Mahasiswa?.JenisKelamin || 'Unknown'
      if (gMap[g] !== undefined) gMap[g]++
    })
    const max = gMap['Laki-laki'] > gMap['Perempuan'] ? { gender: 'Laki-laki', total: gMap['Laki-laki'] } : { gender: 'Perempuan', total: gMap['Perempuan'] }
    if (max.total === 0) return { gender: '—', total: 0 }
    return max
  }, [filtered]);

  const maxAngkatan = useMemo(() => {
    if (filtered.length === 0) return { angkatan: '—', count: 0 };
    const aMap = {}
    filtered.forEach(r => {
      let ang = r.Mahasiswa?.Angkatan || r.Mahasiswa?.angkatan
      if (!ang && r.Mahasiswa?.NIM) {
        ang = `20${r.Mahasiswa.NIM.substring(0, 2)}`
      }
      if (!ang) ang = 'Unknown'
      if (!aMap[ang]) aMap[ang] = 0
      aMap[ang]++
    })
    const list = Object.entries(aMap).map(([angkatan, count]) => ({ angkatan, count }))
    return list.reduce((max, curr) => curr.count > max.count ? curr : max, { angkatan: '—', count: 0 });
  }, [filtered]);

  const avgSistole = useMemo(() => {
    const sys = filtered.filter(r => r.Sistole).map(r => parseFloat(r.Sistole));
    if (sys.length === 0) return 0;
    return Math.round(sys.reduce((a, b) => a + b, 0) / sys.length);
  }, [filtered]);

  const computedStatsData = useMemo(() => {
    const counts = { prima: 0, stabil: 0, pantauan: 0, kritis: 0 }
    filtered.forEach(r => {
      const s = (r.StatusKesehatan || 'stabil').toLowerCase()
      if (counts[s] !== undefined) counts[s]++
    })
    return {
      total: filtered.length,
      condition: counts
    }
  }, [filtered]);

  const columns = [
    {
      key: 'Mahasiswa.Nama',
      label: 'Mahasiswa',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-3">
          <StudentAvatar src={getFullUrl(row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url)} name={row.Mahasiswa?.Nama} className="w-9 h-9 rounded-xl" />
          <div>
            <p className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px]">{row.Mahasiswa?.Nama || '—'}</p>
            <p className="text-[11px] text-[var(--theme-text-muted)] font-medium mt-0.5">{row.Mahasiswa?.NIM || '—'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'Mahasiswa.ProgramStudi.Nama',
      label: 'Program Studi',
      sortable: true,
      render: (val, row) => <span className="text-[12px] font-medium text-[var(--theme-text-subtle)] truncate max-w-[150px] block">{row.Mahasiswa?.ProgramStudi?.Nama || '—'}</span>
    },
    {
      key: 'GolonganDarah',
      label: 'Gol. Darah',
      sortable: true,
      render: (val, row) => (
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-[var(--theme-error-light)] border border-[var(--theme-error)]/20 text-[var(--theme-error)] text-xs font-black">
          {row.GolonganDarah || '?'}
        </span>
      )
    },
    {
      key: 'StatusKesehatan',
      label: 'Status Kesehatan',
      sortable: true,
      render: (val, row) => {
        const hs = getHealth(row.StatusKesehatan)
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider whitespace-nowrap', hs.cls)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', hs.dot)} />{row.StatusKesehatan || '—'}
          </span>
        )
      }
    },
    {
      key: 'Tanggal',
      label: 'Tgl Periksa',
      sortable: true,
      render: (val, row) => <span className="text-[12px] font-medium text-[var(--theme-text-muted)] whitespace-nowrap">{formatDate(row.Tanggal)}</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'w-[80px] text-center',
      sortable: false,
      render: (val, row) => (
        <div className="flex items-center justify-center">
          <button onClick={() => setSelected(row)}
            className="w-8 h-8 flex items-center justify-center text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors" title="Detail">
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <PageContent>
      <Toaster position="top-right" />
      <DashboardHero
        title="Pantau "
        highlightedTitle="Kesehatan"
        subtitle="Monitoring kesehatan dan hasil skrining medis mahasiswa di lingkungan fakultas secara real-time."
        icon="monitor_heart"
        badges={[
          { label: 'Medical Monitoring System', active: false },
          { label: `${statsData.condition?.pantauan || 0} Mahasiswa Pantauan`, active: true }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-[160px] h-10 border border-[var(--theme-border)] bg-[var(--theme-surface)] backdrop-blur-sm rounded-xl text-xs font-semibold text-[var(--theme-text-muted)] focus:ring-0">
                <SelectValue placeholder="Semua Periode" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-[var(--theme-surface)]">
                <SelectItem value="all" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">Semua Periode</SelectItem>
                {periodeOptions.length > 0 ? periodeOptions.map(p => (
                  <SelectItem key={p.id || p.ID} value={String(p.sevima_id || p.id || p.ID)} className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">
                    {p.AcademicYear} · {p.Semester} {p.IsActive ? '⭐' : ''}
                  </SelectItem>
                )) : null}
              </SelectContent>
            </Select>
            <button onClick={exportHealthPDF} disabled={loading || healthRecords.length === 0}
              className="h-10 px-4 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 text-xs font-bold uppercase tracking-wider hover:bg-[var(--theme-primary)] hover:text-white shadow-sm transition-all duration-200 active:scale-95 flex items-center gap-2">
              <Download size={13} className="text-current" /> Ekspor PDF
            </button>
            <button onClick={fetchData} disabled={loading}
              className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none">
              {loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '13px' }}>sync</span> : <RefreshCw size={13} className="text-current" />} Refresh Data
            </button>
          </div>
        }
      />

      {/* Stats Row 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <PrimaryStatsCard
          title="Total Skrining"
          value={computedStatsData.total}
          badgeText="Semua rekam medis"
          icon="show_chart"
          colorTheme="primary"
          onClick={() => handleOpenStatsDetail('total', 'Total Skrining')}
        />
        <PrimaryStatsCard
          title="Kondisi Prima"
          value={computedStatsData.condition?.prima || 0}
          badgeText="Status sangat sehat"
          icon="monitor_heart"
          colorTheme="success"
          onClick={() => handleOpenStatsDetail('prima', 'Kondisi Prima')}
        />
        <PrimaryStatsCard
          title="Status Stabil"
          value={computedStatsData.condition?.stabil || 0}
          badgeText="Kondisi normal"
          icon="verified_user"
          colorTheme="info"
          onClick={() => handleOpenStatsDetail('stabil', 'Status Stabil')}
        />
        <PrimaryStatsCard
          title="Dalam Pantauan"
          value={computedStatsData.condition?.pantauan || 0}
          badgeText="Butuh pemantauan"
          icon="error"
          colorTheme="warning"
          onClick={() => handleOpenStatsDetail('pantauan', 'Dalam Pantauan')}
        />
        <PrimaryStatsCard
          title="Kondisi Kritis"
          value={computedStatsData.condition?.kritis || 0}
          badgeText="Penanganan segera"
          icon="warning"
          colorTheme="error"
          onClick={() => handleOpenStatsDetail('kritis', 'Kondisi Kritis')}
        />
      </div>

      {/* Row 2: Analytics & Trends (5 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-5 mb-6">
        <PrimaryStatsCard
          title="Gol. Darah Mayoritas"
          value={`Gol ${maxGol.name}`}
          badgeText={`${maxGol.count} Mahasiswa`}
          icon="water_drop"
          colorTheme="error"
        />
        <PrimaryStatsCard
          title="Rata-rata BMI"
          value={avgBmi}
          badgeText="Indeks Massa Tubuh"
          icon="straighten"
          colorTheme="info"
        />
        <PrimaryStatsCard
          title="Gender Dominan"
          value={maxGender.gender === 'Laki-laki' ? 'Laki-laki' : maxGender.gender === 'Perempuan' ? 'Perempuan' : '—'}
          badgeText={`${maxGender.total} Mahasiswa`}
          icon="group"
          colorTheme="primary"
        />
        <PrimaryStatsCard
          title="Angkatan Terbanyak"
          value={maxAngkatan.angkatan}
          badgeText={`${maxAngkatan.count} Skrining`}
          icon="calendar_month"
          colorTheme="warning"
        />
        <PrimaryStatsCard
          title="Rata-rata Sistolik"
          value={avgSistole}
          badgeText="mmHg"
          icon="monitor_heart"
          colorTheme="success"
        />
      </div>

      {/* Table */}
      <div className="mt-6 mb-6">
        <DataTable
          title="Rekam Medis Mahasiswa"
          subtitle="Daftar lengkap hasil pemeriksaan kesehatan mahasiswa"
          data={filtered}
          columns={columns}
          loading={loading}
          searchable={true}
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Cari nama atau NIM..."
          pagination={true}
          pageSize={10}
          emptyMessage="Tidak Ada Data Kesehatan"
          emptyIcon="monitor_heart"
          toolbarActions={
            <div className="flex flex-wrap items-center gap-2 w-full">
              <SelectField value={filterStatus} onValueChange={setFilterStatus} placeholder="Semua Status" className="w-32 h-9 text-xs">
                <SelectOption value="all">Semua Status</SelectOption>
                <SelectOption value="prima">Prima</SelectOption>
                <SelectOption value="stabil">Stabil</SelectOption>
                <SelectOption value="pantauan">Pantauan</SelectOption>
                <SelectOption value="kritis">Kritis</SelectOption>
              </SelectField>
              <SelectField value={filterProdi} onValueChange={setFilterProdi} placeholder="Semua Prodi" className="w-36 h-9 text-xs">
                <SelectOption value="all">Semua Prodi</SelectOption>
                {uniqueProdis.map(p => <SelectOption key={p} value={p}>{p}</SelectOption>)}
              </SelectField>
              <SelectField value={filterBlood} onValueChange={setFilterBlood} placeholder="Gol. Darah" className="w-32 h-9 text-xs">
                <SelectOption value="all">Semua Gol. Darah</SelectOption>
                <SelectOption value="A">Gol. Darah A</SelectOption>
                <SelectOption value="B">Gol. Darah B</SelectOption>
                <SelectOption value="AB">Gol. Darah AB</SelectOption>
                <SelectOption value="O">Gol. Darah O</SelectOption>
              </SelectField>
              <SelectField value={filterJenis} onValueChange={setFilterJenis} placeholder="Jenis Periksa" className="w-36 h-9 text-xs">
                <SelectOption value="all">Semua Jenis Periksa</SelectOption>
                {uniqueJenis.map(j => <SelectOption key={j} value={j}>{j}</SelectOption>)}
              </SelectField>
              {(search || filterStatus !== 'all' || filterProdi !== 'all' || filterBlood !== 'all' || filterJenis !== 'all') && (
                <button onClick={() => { setSearch(''); setFilterStatus('all'); setFilterProdi('all'); setFilterBlood('all'); setFilterJenis('all'); }}
                  className="h-9 px-3 text-xs font-semibold text-[var(--theme-error)] bg-[var(--theme-error-light)] rounded-lg hover:bg-[var(--theme-error)]/20 transition-colors border border-[var(--theme-error)]/20">Reset</button>
              )}
            </div>
          }
        />
      </div>

      {/* Stats Detail Modal (Pop-up rincian dari card stats) */}
      <DialogModal
        open={!!statsDetail}
        onOpenChange={(open) => !open && setStatsDetail(null)}
        icon="monitor_heart"
        title={statsDetail?.label}
        subtitle="Daftar mahasiswa baru dengan status kesehatan tersebut"
        maxWidth="max-w-4xl"
        footer={
          <button onClick={() => setStatsDetail(null)}
            className="h-10 px-6 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 shadow-md cursor-pointer">
            Tutup
          </button>
        }
      >
        <div className="flex flex-col h-[65vh]">
          {/* Toolbar */}
          <div className="p-4 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/20 flex flex-col sm:flex-row items-center justify-between gap-3 flex-shrink-0">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: '15px' }} >search</span>
              <input
                type="text"
                placeholder="Cari nama, NIM, prodi..."
                value={statsSearch}
                onChange={e => setStatsSearch(e.target.value)}
                className="pl-9 pr-4 h-10 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-xs font-semibold text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-colors"
              />
            </div>
            <p className="text-xs text-[var(--theme-text-muted)] font-semibold">
              Menampilkan <span className="text-[var(--theme-primary)]">{filteredStatsDetailList.length}</span> data
            </p>
          </div>

          {/* List Body */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredStatsDetailList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 bg-[var(--theme-bg)] rounded-2xl flex items-center justify-center text-[var(--theme-text-muted)] mb-2"><HeartPulse size={20} /></div>
                <p className="font-bold text-sm text-[var(--theme-text)]">Tidak ada mahasiswa ditemukan</p>
                <p className="text-xs text-[var(--theme-text-muted)]">Kata kunci tidak cocok dengan data mana pun.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredStatsDetailList.map((row) => {
                  const hs = getHealth(row.StatusKesehatan)
                  return (
                    <div key={row.ID} className="flex items-center gap-3 p-3 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:border-[var(--theme-primary)]/20 hover:shadow-sm transition-all group">
                      <StudentAvatar src={getFullUrl(row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url)} name={row.Mahasiswa?.Nama} className="w-11 h-11 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-[var(--theme-text)] group-hover:text-[var(--theme-primary)] transition-colors truncate">{row.Mahasiswa?.Nama || '—'}</p>
                        <p className="text-[10px] text-[var(--theme-text-muted)] font-semibold">{row.Mahasiswa?.NIM || '—'} · {row.Mahasiswa?.ProgramStudi?.Nama || '—'}</p>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-md bg-[var(--theme-error-light)] border border-[var(--theme-error)]/10 text-[var(--theme-error)] text-[9px] font-semibold font-mono">
                            Gol. {row.GolonganDarah || '?'}
                          </span>
                          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-semibold border uppercase tracking-wider whitespace-nowrap', hs.cls)}>
                            <span className={cn('w-1 h-1 rounded-full shrink-0', hs.dot)} />{row.StatusKesehatan || '—'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => { setSelected(row); setStatsDetail(null); }}
                        className="w-8 h-8 rounded-xl bg-[var(--theme-bg)] hover:bg-[var(--theme-primary-light)] text-[var(--theme-text-subtle)] hover:text-[var(--theme-primary)] flex items-center justify-center transition-colors shadow-inner cursor-pointer"
                        title="Detail Rekam Medis"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>visibility</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </DialogModal>

      {/* Detail Modal */}
      <DialogModal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        icon="person"
        title={selected?.Mahasiswa?.Nama}
        subtitle={`${selected?.Mahasiswa?.NIM} · ${selected?.Mahasiswa?.ProgramStudi?.Nama || '—'}`}
        badgeText="Rekam Medis Mahasiswa"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button onClick={() => window.print()}
              className="flex-1 h-10 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-xs font-semibold text-[var(--theme-text)] uppercase tracking-wider hover:bg-[var(--theme-bg)] transition-all cursor-pointer">
              Cetak
            </button>
            <button onClick={() => setSelected(null)}
              className="flex-1 h-10 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-semibold uppercase tracking-wider transition-all active:scale-95 shadow-md cursor-pointer">
              Tutup
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-6 p-1 pb-4">
          {/* Main Card */}
          <div className="flex flex-col bg-white rounded-2xl border border-[var(--theme-border-muted)] overflow-hidden shadow-sm">
            {/* Header Identity & Status */}
            <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[var(--theme-border-muted)] bg-[var(--theme-surface)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--theme-text)]">{selected?.Mahasiswa?.Nama || '—'}</h3>
                <p className="text-xs text-[var(--theme-text-muted)] font-medium mt-0.5">{selected?.Mahasiswa?.NIM || '—'} · {selected?.Mahasiswa?.ProgramStudi?.Nama || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 bg-[var(--theme-error-light)] border border-[var(--theme-error)]/10 px-3 py-1 rounded-full text-[10px] font-semibold text-[var(--theme-error)] font-mono tracking-wider">
                  <span className="material-symbols-outlined text-[13px]">water_drop</span> Gol. {selected?.GolonganDarah || '?'}
                </span>
                {selected?.StatusKesehatan && (() => {
                  const hs = getHealth(selected.StatusKesehatan);
                  return (
                    <span className={cn('flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-semibold border uppercase tracking-wider', hs.cls)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', hs.dot)} />
                      {selected.StatusKesehatan}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Data Fisik Grid */}
            <div className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '11px' }} >show_chart</span>
                </div>
                <h3 className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Data Fisik & Vital</h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Tinggi Badan', value: selected?.TinggiBadan ? `${parseFloat(selected.TinggiBadan).toFixed(1)} cm` : '—' },
                  { label: 'Berat Badan', value: selected?.BeratBadan ? `${parseFloat(selected.BeratBadan).toFixed(1)} kg` : '—' },
                  { label: 'BMI', value: (selected ? bmi(selected) : null) || '—', highlight: selected && bmi(selected) >= 25 },
                  { label: 'Tekanan Darah', value: (selected?.Sistole || selected?.Diastole) ? `${selected.Sistole || 0}/${selected.Diastole || 0}` : '—' },
                  { label: 'Gula Darah', value: selected?.GulaDarah ? `${selected.GulaDarah} mg/dL` : '—' },
                  { label: 'Buta Warna', value: selected?.ButaWarna || '—' },
                  { label: 'Pemeriksaan', value: selected?.JenisPemeriksaan || '—' },
                  { label: 'Hasil Medis', value: selected?.Hasil || '—' },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col justify-between gap-1 p-3 rounded-xl bg-[var(--theme-bg)]/30 border border-[var(--theme-border)]">
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">{item.label}</p>
                    <p className={cn('text-sm font-bold text-[var(--theme-text)] line-clamp-2', item.highlight && 'text-[var(--theme-error)]')} title={String(item.value)}>
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Medical Notes */}
            {((selected?.RiwayatPenyakit) || (selected?.Catatan)) && (
              <div className="p-5 border-t border-[var(--theme-border-muted)] bg-[var(--theme-surface)] space-y-4">
                {selected?.RiwayatPenyakit && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[var(--theme-error)]" style={{ fontSize: '14px' }}>medical_information</span>
                      <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Riwayat Penyakit</span>
                    </div>
                    <p className="text-xs text-[var(--theme-text)] font-medium leading-relaxed bg-white border border-[var(--theme-border)] rounded-xl p-3 shadow-sm">{selected.RiwayatPenyakit}</p>
                  </div>
                )}
                {selected?.Catatan && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-[var(--theme-warning)]" style={{ fontSize: '14px' }}>warning</span>
                      <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Catatan Khusus</span>
                    </div>
                    <p className="text-xs text-[var(--theme-text)] font-medium leading-relaxed bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 rounded-xl p-3 shadow-sm">{selected.Catatan}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Document & Info Row */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 bg-white rounded-2xl border border-[var(--theme-border-muted)] shadow-sm p-4 flex items-center justify-between group hover:border-[var(--theme-primary)]/40 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-info-light)] flex items-center justify-center text-[var(--theme-info)]">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>assignment</span>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Berkas Medis</p>
                  <p className="text-sm font-bold text-[var(--theme-text)]">Dokumen Skrining</p>
                </div>
              </div>
              {selected?.FileURL ? (
                <a href={getFullUrl(selected.FileURL)} target="_blank" rel="noreferrer"
                  className="h-8 px-4 rounded-lg bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>open_in_new</span> Buka
                </a>
              ) : (
                <span className="h-8 px-3 rounded-lg bg-[var(--theme-bg)] text-[var(--theme-text-muted)] text-xs font-bold flex items-center">
                  Kosong
                </span>
              )}
            </div>

            <div className="flex-1 bg-white rounded-2xl border border-[var(--theme-border-muted)] shadow-sm p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-success-light)] flex items-center justify-center text-[var(--theme-success)]">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>event_available</span>
              </div>
              <div>
                <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Tanggal Periksa</p>
                <p className="text-sm font-bold text-[var(--theme-text)]">{selected ? formatDate(selected.Tanggal) : '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </DialogModal>
    </PageContent>
  )
}