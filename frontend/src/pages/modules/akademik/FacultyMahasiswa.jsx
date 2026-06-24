"use client"

import React, { useState, useEffect, useMemo } from "react"
import api from "@/lib/axios"
import { API_BASE_URL, adminService } from "@/services/api"
import useAuthStore from "@/store/useAuthStore"
import { usePermission } from '@/hooks/usePermission'
import { toast, Toaster } from "react-hot-toast"
import { cn } from "@/lib/utils"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { PageContent } from "@/components/ui/page/PageContent"
import { DashboardHero } from "@/components/ui/dashboard/DashboardHero"
import { DialogModal, ModalCancelButton } from "@/components/ui/DialogModal"
import { PrimaryStatsCard } from "@/components/ui/StatsCard"
import DataTable from "@/components/ui/DataTable"

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const Icon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>info</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>layers</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Phone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>phone</span>;
const Mail = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>mail</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const UserCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>how_to_reg</span>;
const GraduationCap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const Calendar = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>calendar_today</span>;
const BookOpen = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>menu_book</span>;
const Building2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>business</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const FileText = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>description</span>;
const MapPin = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>location_on</span>;
const Heart = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>favorite</span>;



const STATUS_STYLES = {
  'Aktif': { cls: 'bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0]', dot: 'bg-[#22c55e]' },
  'Lulus': { cls: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]', dot: 'bg-[#3b82f6]' },
  'Cuti': { cls: 'bg-[#fefce8] text-[#a16207] border-[#fef08a]', dot: 'bg-[#eab308]' },
  'Mutasi': { cls: 'bg-[#fdf4ff] text-[#a21caf] border-[#f5d0fe]', dot: 'bg-[#d946ef]' },
  'Dikeluarkan': { cls: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]', dot: 'bg-[#ef4444]' },
  'Putus Studi': { cls: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]', dot: 'bg-[#ef4444]' },
  'Mengajukan pengunduran diri': { cls: 'bg-[#fff7ed] text-[#c2410c] border-[#fed7aa]', dot: 'bg-[#f97316]' },
  'Meninggal dunia': { cls: 'bg-[#f8fafc] text-[#475569] border-[#cbd5e1]', dot: 'bg-[#64748b]' },
  'Selesai Pendidikan Non Gelar': { cls: 'bg-[#f0fdfa] text-[#0f766e] border-[#ccfbf1]', dot: 'bg-[#14b8a6]' },
  'Non-Aktif': { cls: 'bg-[#fef2f2] text-[#b91c1c] border-[#fecaca]', dot: 'bg-[#ef4444]' },
  'LL': { cls: 'bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe]', dot: 'bg-[#3b82f6]' },
  'Transfer': { cls: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500' },
  'Sedang Double Degree': { cls: 'bg-purple-50 text-purple-700 border-purple-100', dot: 'bg-purple-500' }
}

const AVATAR_COLORS = [
  'from-blue-400 to-indigo-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-rose-400 to-pink-500',
  'from-violet-400 to-purple-500',
  'from-cyan-400 to-sky-500',
]

const formatDate = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) }
  catch { return d }
}

const getFullUrl = (path) => {
  if (!path || path.trim() === "" || path === "/" || path.endsWith("/profiles/") || path.endsWith("/students/")) return null;
  if (path.startsWith('http')) return path;
  const baseUrl = API_BASE_URL.replace('/api', '');
  return `${baseUrl}${path}`;
}

const mapStudent = (m, i) => {
  const statusAkun = m.StatusAkun || m.status_akun || 'Aktif'
  const isLulus = String(statusAkun).toLowerCase() === 'lulus'
  return {
    ID: m.ID || m.id,
    NIM: m.NIM || m.nim,
    Nama: m.Nama || m.nama_mahasiswa || m.nama || m.NamaMahasiswa || '—',
    ProgramStudi: m.ProgramStudi?.Nama || m.ProgramStudi?.nama || m.ProgramStudi?.nama_prodi || m.program_studi?.nama_prodi || '—',
    SemesterSekarang: isLulus ? null : (m.SemesterSekarang || m.current_semester || 1),
    StatusAkun: statusAkun,
    StatusAkademik: m.StatusAkademik || m.status_akademik || '—',
    TahunMasuk: m.TahunMasuk || m.tahun_masuk ? String(m.TahunMasuk || m.tahun_masuk) : (m.NIM || m.nim ? `20${(m.NIM || m.nim).substring(0, 2)}` : '—'),
    NoHP: m.NoHP || m.no_hp || '—',
    JalurMasuk: m.JalurMasuk || m.jalur_masuk || 'PDDIKTI Sync',
    TempatLahir: m.TempatLahir || m.tempat_lahir || '—',
    TanggalLahir: m.TanggalLahir || m.tanggal_lahir,
    NIK: m.NIK || m.nik || '—',
    NISN: m.NISN || m.nisn || '—',
    NIRM: m.NIRM || m.nirm || '—',
    Email: m.EmailKampus || m.EmailPersonal || m.email_kampus || m.email_personal || m.Pengguna?.Email || m.pengguna?.email || '—',
    EmailPersonal: m.EmailPersonal || m.email_personal || '—',
    Alamat: m.Alamat || m.alamat || '—',
    Kota: m.Kota || m.kota || '—',
    Provinsi: m.Provinsi || m.provinsi || '—',
    NamaAyah: m.NamaAyah || m.nama_ayah || '—',
    NamaIbu: m.NamaIbuKandung || m.nama_ibu_kandung || '—',
    PekerjaanAyah: m.PekerjaanAyah || m.pekerjaan_ayah || '—',
    PekerjaanIbu: m.PekerjaanIbu || m.pekerjaan_ibu || '—',
    PekerjaanOrtu: m.PekerjaanAyah || m.pekerjaan_ayah || m.PekerjaanIbu || m.pekerjaan_ibu || '—',
    PenghasilanOrtu: m.PenghasilanOrtu || m.penghasilan_ortu,
    IPK: m.IPK || m.ipk || 0,
    TotalSKS: m.TotalSKS || m.total_sks || 0,
    DosenPAID: m.DosenPAID || m.dosen_pa_id,
    DosenPA: m.DosenPA?.Nama || m.DosenPA?.nama_dosen || m.DosenPA?.Name || '—',
    Agama: m.Agama || m.agama || '—',
    Kewarganegaraan: m.Kewarganegaraan || m.kewarganegaraan || '—',
    JenisKelamin: m.JenisKelamin || m.jenis_kelamin || '—',
    GolonganDarah: m.GolonganDarah || m.golongan_darah || '—',
    AsalSekolah: m.AsalSekolah || m.asal_sekolah || '—',
    NoIjazahSMA: m.NoIjazahSMA || m.no_ijazah_sma || '—',
    colorIdx: i % AVATAR_COLORS.length,
    Foto: getFullUrl(m.FotoURL || m.foto_url || m.Foto || m.Pengguna?.Foto || m.Pengguna?.avatar_url || null),
  }
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


export default function MahasiswaPage() {
  const { hasPermission } = usePermission()
  const canManageStudents = hasPermission('students.manage') || hasPermission('faculty.manage')
  const [studentData, setStudentData] = useState([])
  const [loading, setLoading] = useState(true)
  const [isSyncingSevima, setIsSyncingSevima] = useState(false)
  const [selected, setSelected] = useState(null)
  const [facultyInfo, setFacultyInfo] = useState(null)
  const [periodsList, setPeriodsList] = useState([])
  const [tableFilters, setTableFilters] = useState({})
  const filterPeriod = tableFilters.TahunMasuk || 'all'
  const setFilterPeriod = (val) => setTableFilters(prev => ({ ...prev, TahunMasuk: val === 'all' ? undefined : val }))

  const [detailTab, setDetailTab] = useState("profil")
  const [academicData, setAcademicData] = useState(null)
  const [loadingAcademic, setLoadingAcademic] = useState(false)
  const [perwalianData, setPerwalianData] = useState(null)
  const [loadingPerwalian, setLoadingPerwalian] = useState(false)
  const [expandedPeriods, setExpandedPeriods] = useState({})

  useEffect(() => {
    if (perwalianData && perwalianData.length > 0) {
      const sorted = [...perwalianData].sort((a, b) => b.attributes?.id_periode?.localeCompare(a.attributes?.id_periode))
      if (sorted[0]?.attributes?.id_periode) {
        setExpandedPeriods({ [sorted[0].attributes.id_periode]: true })
      }
    } else {
      setExpandedPeriods({})
    }
  }, [perwalianData])

  const togglePeriod = (periodId) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [periodId]: !prev[periodId]
    }))
  }

  const formatPeriodeName = (id) => {
    if (!id || id.length < 5) return id;
    const year = id.substring(0, 4);
    const sem = id.substring(4);
    const semType = sem === '1' ? 'Ganjil' : sem === '2' ? 'Genap' : 'Antara';
    return `${semType} ${year}/${parseInt(year)+1}`;
  }


  useEffect(() => {
    if (!selected) {
      setDetailTab("profil")
      setAcademicData(null)
      setPerwalianData(null)
      return
    }

    setPerwalianData(null)

    if (selected.NIM) {
      setLoadingAcademic(true)
      api.get(`/app/dashboard/students/${selected.NIM}/academic`)
        .then(res => {
          if (res.data?.status === 'success') {
            setAcademicData(res.data.data)
            
            if (res.data.data) {
              setSelected(prev => {
                if (!prev) return null
                return {
                  ...prev,
                  IPK: res.data.data.ipk,
                  TotalSKS: res.data.data.total_sks,
                  DosenPA: res.data.data.dosen_pa || prev.DosenPA
                }
              })

              setStudentData(prevList => prevList.map(s => {
                if (s.NIM === selected.NIM) {
                  return {
                    ...s,
                    IPK: res.data.data.ipk,
                    TotalSKS: res.data.data.total_sks,
                    DosenPA: res.data.data.dosen_pa || s.DosenPA
                  }
                }
                return s
              }))
            }
          }
        })
        .catch(err => {
          console.error("Gagal mengambil data akademik:", err)
        })
        .finally(() => {
          setLoadingAcademic(false)
        })
    }
  }, [selected?.NIM])

  useEffect(() => {
    if (!selected || !selected.NIM) {
      setPerwalianData(null)
      return
    }

    if (detailTab === "perwalian" && !perwalianData) {
      setLoadingPerwalian(true)
      api.get(`/app/dashboard/students/${selected.NIM}/perwalian`)
        .then(res => {
          if (res.data?.status === 'success') {
            setPerwalianData(res.data.data)
            
            // Sync Dosen PA from latest period if present
            if (res.data.data && res.data.data.length > 0) {
              const latestPA = res.data.data[0].attributes?.dosen_pembimbing
              if (latestPA) {
                setSelected(prev => {
                  if (!prev) return null
                  return {
                    ...prev,
                    DosenPA: latestPA
                  }
                })

                setStudentData(prevList => prevList.map(s => {
                  if (s.NIM === selected.NIM) {
                    return {
                      ...s,
                      DosenPA: latestPA
                    }
                  }
                  return s
                }))
              }
            }
          }
        })
        .catch(err => {
          console.error("Gagal mengambil data perwalian:", err)
        })
        .finally(() => {
          setLoadingPerwalian(false)
        })
    }
  }, [selected?.NIM, detailTab])

  const getKopImage = (facName) => {
    const name = (facName || "").toLowerCase();
    if (name.includes("farmasi")) return "kop_farmasi.jpg";
    if (name.includes("kesehatan") || name.includes("fikes")) return "kop_ilmu_kesehatan.jpg";
    if (name.includes("keperawatan") || name.includes("fkep")) return "kop_keperawatan.jpg";
    if (name.includes("sosial") || name.includes("social") || name.includes("sosiologi") || name.includes("fis")) return "kop_ilmu_sosial.jpg";
    return "kop_farmasi.jpg";
  };

  const fetchStudents = React.useCallback(async () => {
    Promise.resolve().then(() => setLoading(true))
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

      const res = await api.get('/app/dashboard/students')
      setStudentData((res?.data?.data || []).map(mapStudent))
    } catch { toast.error("Gagal memuat data mahasiswa") }
    finally {
      Promise.resolve().then(() => setLoading(false))
    }
  }, [])

  const filteredStudentData = useMemo(() => {
    return studentData.filter(s => {
      if (filterPeriod === 'all') return true;
      const angkatan = String(s.TahunMasuk || (s.NIM ? `20${s.NIM.substring(0,2)}` : null));
      const yearFromPeriod = filterPeriod.length >= 4 ? filterPeriod.substring(0, 4) : filterPeriod;
      return angkatan === filterPeriod || angkatan === yearFromPeriod;
    });
  }, [studentData, filterPeriod]);

  const handleSyncSevima = async () => {
    setIsSyncingSevima(true)
    try {
      const res = await api.post('/app/dashboard/sync-mahasiswa')
      toast.success(res.data?.message || 'Sinkronisasi Mahasiswa berjalan di latar belakang')
    } catch {
      toast.error('Gagal sinkronisasi dari SEVIMA')
    } finally {
      setIsSyncingSevima(false)
    }
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
      .badge-aktif   { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
      .badge-lulus   { background:#e0f2fe; color:#0284c7; border:1px solid #bae6fd; }
      .badge-cuti    { background:#fef9c3; color:#a16207; border:1px solid #fef08a; }
      .badge-nonaktif{ background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
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

  const exportStudentsPDF = () => {
    if (studentData.length === 0) { toast.error('Tidak ada data mahasiswa untuk diekspor'); return; }
    const dataToExport = studentData;
    const statusBadge = (s) => {
      const key = (s || '').toLowerCase();
      if (key === 'aktif' || key === 'active') return '<span class="badge badge-aktif">Aktif</span>';
      if (key === 'lulus') return '<span class="badge badge-lulus">Lulus</span>';
      if (key === 'cuti' || key === 'leave') return '<span class="badge badge-cuti">Cuti</span>';
      return '<span class="badge badge-nonaktif">Non-Aktif</span>';
    };
    let tableRows = '';
    dataToExport.forEach((item, idx) => {
      tableRows += `<tr>
        <td>${idx + 1}</td>
        <td style="font-family:monospace;font-weight:700;color:#00236F;font-size:7.5px;">${item.NIM || '—'}</td>
        <td style="font-weight:700;">${item.Nama || '—'}</td>
        <td>${item.ProgramStudi || '—'}</td>
        <td style="text-align:center;font-weight:700;">${item.SemesterSekarang || '—'}</td>
        <td>${item.TahunMasuk || '—'}</td>
        <td>${item.JalurMasuk || '—'}</td>
        <td>${statusBadge(item.StatusAkademik)}</td>
      </tr>`;
    });

    const aktif = dataToExport.filter(d => d.StatusAkademik === 'Aktif' || d.StatusAkademik === 'active').length;
    const lulus = dataToExport.filter(d => d.StatusAkademik === 'Lulus').length;
    const cuti = dataToExport.filter(d => d.StatusAkademik === 'Cuti' || d.StatusAkademik === 'leave').length;
    const contentHtml = `
      <table style="width:100%;border-collapse:collapse;border:none;margin-bottom:16px;">
        <tr>
          <td style="padding:0 5px 0 0;width:25%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Total Mahasiswa</div>
              <div style="font-size:14px;font-weight:700;color:#00236F;">${dataToExport.length} Orang</div>
            </div>
          </td>
          <td style="padding:0 5px;width:25%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Aktif</div>
              <div style="font-size:14px;font-weight:700;color:#15803d;">${aktif} Orang</div>
            </div>
          </td>
          <td style="padding:0 5px;width:25%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Lulus</div>
              <div style="font-size:14px;font-weight:700;color:#0284c7;">${lulus} Orang</div>
            </div>
          </td>
          <td style="padding:0 0 0 5px;width:25%;">
            <div style="background:#f8fafc;border:1px solid #e2e8f0;padding:10px 12px;border-radius:5px;">
              <div style="font-size:7px;font-weight:700;color:#64748b;text-transform:uppercase;">Cuti</div>
              <div style="font-size:14px;font-weight:700;color:#d97706;">${cuti} Orang</div>
            </div>
          </td>
        </tr>
      </table>
      <table class="data-table">
        <thead><tr>
          <th style="width:4%;">No</th>
          <th style="width:12%;">NIM</th>
          <th style="width:22%;">Nama Mahasiswa</th>
          <th style="width:22%;">Program Studi</th>
          <th style="width:6%;text-align:center;">Smt</th>
          <th style="width:8%;">Angkatan</th>
          <th style="width:14%;">Jalur Masuk</th>
          <th style="width:9%;">Status</th>
        </tr></thead>
        <tbody>${tableRows}</tbody>
      </table>`;
    downloadPDF(
      'Daftar Database Mahasiswa Fakultas',
      `Rekap Data Akademik Mahasiswa — ${new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}`,
      contentHtml
    );
    toast.success(`Berhasil mencetak ${dataToExport.length} data mahasiswa!`);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStudents()
  }, [fetchStudents])

  const statusList = useMemo(() => [
    'Aktif',
    'Selesai Pendidikan Non Gelar',
    'Lulus',
    'Cuti',
    'Mutasi',
    'Dikeluarkan',
    'Mengajukan pengunduran diri',
    'Putus Studi',
    'Meninggal dunia',
    'Non-Aktif',
    'Transfer',
    'Sedang Double Degree'
  ], [])

  const semesterList = useMemo(() => {
    return [...new Set(studentData.map(d => d.SemesterSekarang).filter(s => s !== null && s !== undefined && s > 0))].sort((a, b) => a - b)
  }, [studentData])

  const prodiList = useMemo(() => {
    return [...new Set(studentData.map(d => d.ProgramStudi).filter(s => s && s !== '—'))].sort()
  }, [studentData])

  const angkatanList = useMemo(() => {
    return [...new Set(studentData.map(d => d.TahunMasuk).filter(s => s && s !== '—'))].sort((a, b) => Number(b) - Number(a))
  }, [studentData])

  const columns = useMemo(() => [
    { label: 'NIM', key: 'NIM', render: (val) => <code className="text-[11px] font-bold text-primary tracking-wide bg-[#eff6ff] px-2 py-1 rounded-lg border border-[#dbeafe]">{val || '—'}</code> },
    { label: 'Identitas Mahasiswa', key: 'Nama', render: (val, row) => (
        <div className="flex items-center gap-3">
          <StudentAvatar src={row.Foto} name={row.Nama} className="w-9 h-9 rounded-xl" />
          <div>
            <p className="font-bold text-[13px] text-slate-900 leading-snug">{row.Nama}</p>
            <p className="text-[10px] text-slate-500 font-medium">{row.TahunMasuk} · {row.JalurMasuk}</p>
          </div>
        </div>
      ) 
    },
    { label: 'Program Studi', key: 'ProgramStudi' },
    { label: 'Smt', key: 'SemesterSekarang', className: 'text-center', render: (val, row) => <span className="text-sm font-black text-slate-900 tabular-nums">{(row.StatusAkademik !== 'Aktif') ? '—' : (val ?? '—')}</span> },
    { label: 'Status', key: 'StatusAkademik', render: (val) => {
        const st = STATUS_STYLES[val] || STATUS_STYLES['Non-Aktif']
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider whitespace-nowrap', st.cls)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)} />
            {val}
          </span>
        )
      } 
    }
  ], [])

  const filtersConfig = useMemo(() => [
    {
      key: 'ProgramStudi',
      placeholder: 'Program Studi',
      options: prodiList.map(p => ({ label: p, value: p }))
    },
    {
      key: 'SemesterSekarang',
      placeholder: 'Semester',
      options: semesterList.map(s => ({ label: `Semester ${s}`, value: String(s) }))
    },
    {
      key: 'TahunMasuk',
      placeholder: 'Angkatan',
      options: angkatanList.map(a => ({ label: `Angkatan ${a}`, value: String(a) }))
    },
    {
      key: 'StatusAkademik',
      placeholder: 'Status',
      options: statusList.map(s => ({ label: s, value: s }))
    }
  ], [prodiList, semesterList, angkatanList, statusList])

  const stats = useMemo(() => ({
    total: filteredStudentData.length,
    aktif: filteredStudentData.filter(d => d.StatusAkademik === 'Aktif' || d.StatusAkademik === 'active').length,
    lulus: filteredStudentData.filter(d => d.StatusAkademik === 'Lulus').length,
    cuti: filteredStudentData.filter(d => d.StatusAkademik === 'Cuti' || d.StatusAkademik === 'leave').length,
  }), [filteredStudentData])

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Database"
        highlightedTitle="Mahasiswa"
        subtitle="Manajemen data dan arsip akademik seluruh mahasiswa di lingkungan fakultas."
        icon="group"
        badges={[
          { label: 'Data Akademik', active: false },
          { label: `${stats.aktif} Mahasiswa Aktif`, active: true },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[180px] h-10 border border-slate-200/80 bg-white/80 rounded-xl text-xs font-bold text-slate-600 focus:ring-0">
                <SelectValue placeholder="Semua Periode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Periode</SelectItem>
                {periodsList.length > 0 ? periodsList.map(p => (
                  <SelectItem key={p.id || p.ID} value={String(p.sevima_id || p.id || p.ID)}>
                    {p.AcademicYear} · {p.Semester} {p.IsActive ? '⭐' : ''}
                  </SelectItem>
                )) : angkatanList.map(a => <SelectItem key={a} value={String(a)}>Angkatan {a}</SelectItem>)}
              </SelectContent>
            </Select>
              <button onClick={exportStudentsPDF} disabled={loading || filteredStudentData.length === 0}
                className="h-10 px-4 rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm text-xs font-bold uppercase tracking-wider text-slate-600 hover:text-primary hover:border-primary/30 hover:bg-slate-50/50 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                <FileText size={13} className="text-primary" /> Ekspor PDF
              </button>
              {canManageStudents && (
                <button onClick={handleSyncSevima} disabled={isSyncingSevima}
                  className="h-10 px-4 rounded-xl border border-slate-200/80 bg-[var(--theme-primary)] text-white text-xs font-bold uppercase tracking-wider hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2">
                  {isSyncingSevima ? <span className="material-symbols-outlined animate-spin text-white" style={{ fontSize: '13px' }} >sync</span> : <RefreshCw size={13} className="text-white" />} {isSyncingSevima ? 'Syncing...' : 'Sync Sevima'}
                </button>
              )}
            </div>
          }
      />

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <PrimaryStatsCard
            title="Total Mahasiswa"
            value={loading ? <span className="material-symbols-outlined animate-spin text-slate-300" style={{ fontSize: '18px' }} >sync</span> : stats.total}
            subtitle="Terdaftar di sistem"
            icon="group"
            colorTheme="primary"
          />
          <PrimaryStatsCard
            title="Aktif"
            value={loading ? <span className="material-symbols-outlined animate-spin text-slate-300" style={{ fontSize: '18px' }} >sync</span> : stats.aktif}
            subtitle="Sedang aktif kuliah"
            icon="verified_user"
            colorTheme="success"
          />
          <PrimaryStatsCard
            title="Lulus"
            value={loading ? <span className="material-symbols-outlined animate-spin text-slate-300" style={{ fontSize: '18px' }} >sync</span> : stats.lulus}
            subtitle="Telah menyelesaikan studi"
            icon="school"
            colorTheme="info"
          />
          <PrimaryStatsCard
            title="Cuti"
            value={loading ? <span className="material-symbols-outlined animate-spin text-slate-300" style={{ fontSize: '18px' }} >sync</span> : stats.cuti}
            subtitle="Sedang dalam masa cuti"
            icon="calendar_month"
            colorTheme="warning"
          />
        </div>

        {/* ── Table Card ── */}
        <DataTable
          title="Daftar Mahasiswa"
          subtitle="Menampilkan daftar mahasiswa di fakultas."
          columns={columns}
          data={filteredStudentData}
          loading={loading}
          searchPlaceholder="Cari NIM, nama, atau prodi..."
          filters={filtersConfig}
          filterValues={tableFilters}
          onFilterChange={(key, val) => setTableFilters(prev => ({ ...prev, [key]: val }))}
          actions={(row) => (
            <button
              onClick={() => setSelected(row)}
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-[#eef4ff] rounded-lg transition-colors"
              title="Lihat Detail"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >visibility</span>
            </button>
          )}
        />

      {/* ── Detail Modal ── */}
      <DialogModal
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        icon="person"
        title="Detail Mahasiswa"
        subtitle="Informasi akademik dan biodata lengkap"
        badgeText="Profil Mahasiswa"
        maxWidth="max-w-xl"
        bodyClassName="p-0 flex flex-col"
        footer={<ModalCancelButton onClick={() => setSelected(null)} text="Tutup" />}
      >
          {/* Header */}
          <div className="shrink-0 relative bg-[var(--theme-bg)]/50 p-6 pb-5 border-b border-[var(--theme-border-muted)]">
            <div className="relative z-10 flex items-center gap-4 mb-4">
              <StudentAvatar src={selected?.Foto} name={selected?.Nama} className="w-14 h-14 rounded-2xl shadow-inner ring-2 ring-[var(--theme-border)]" />
              <div className="min-w-0">
                <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-[0.25em] mb-1">Profil Mahasiswa</p>
                <h3 className="text-base font-bold font-headline leading-tight truncate text-[var(--theme-text)]">{selected?.Nama}</h3>
                <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">{selected?.ProgramStudi}</p>
              </div>
            </div>
            <div className="relative z-10 flex flex-wrap gap-2">
              <span className="flex items-center gap-1.5 bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/10 px-3 py-1 rounded-full text-[10px] font-semibold text-[var(--theme-primary)] font-mono tracking-wider">
                NIM {selected?.NIM}
              </span>
              <span className="flex items-center gap-1.5 bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/10 px-3 py-1 rounded-full text-[10px] font-semibold text-[var(--theme-primary)] uppercase tracking-wider">
                <Award size={10} /> Angkatan {selected?.TahunMasuk}
              </span>
              {selected?.StatusAkademik && (() => {
                const st = STATUS_STYLES[selected.StatusAkademik] || STATUS_STYLES['Non-Aktif']
                return (
                  <div className={cn("px-3 py-1 rounded-full text-[11px] font-bold border flex items-center gap-1.5", st.cls)}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", st.dot)} />
                    {selected.StatusAkademik}
                  </div>
                )
              })()}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/30 px-6 py-2 gap-2 shrink-0 overflow-x-auto">
            <button
              onClick={() => setDetailTab("profil")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                detailTab === "profil" 
                  ? "bg-[var(--theme-primary)] text-white shadow-sm" 
                  : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-border-muted)]/50"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span>
              Profil & Biodata
            </button>
            <button
              onClick={() => setDetailTab("akademik")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                detailTab === "akademik" 
                  ? "bg-[var(--theme-primary)] text-white shadow-sm" 
                  : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-border-muted)]/50"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>menu_book</span>
              KRS & Transkrip
            </button>
            <button
              onClick={() => setDetailTab("perwalian")}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap",
                detailTab === "perwalian" 
                  ? "bg-[var(--theme-primary)] text-white shadow-sm" 
                  : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-border-muted)]/50"
              )}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>supervisor_account</span>
              Perwalian & Bimbingan
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto max-h-[60vh]">
            {detailTab === "profil" && (
              <>
                {/* Akademik */}
                <SectionBlock icon={BookOpen} title="Informasi Akademik">
                  <InfoCard icon={Building2} label="Program Studi" value={selected?.ProgramStudi} accent="border-l-[var(--theme-info)]" />
                  <InfoCard icon={Layers} label="Semester" value={selected?.SemesterSekarang ? `Semester ${selected.SemesterSekarang}` : '—'} accent="border-l-[var(--theme-primary)]" />
                  <InfoCard icon={UserCheck} label="Dosen PA / Wali" value={selected?.DosenPA || '—'} accent="border-l-[var(--theme-success)]" />
                  <InfoCard icon={Award} label="Jalur Masuk" value={selected?.JalurMasuk} accent="border-l-[var(--theme-warning)]" />
                  <InfoCard icon={BookOpen} label="IPK" value={selected?.IPK !== undefined && selected?.IPK !== null ? Number(selected.IPK).toFixed(2) : '—'} accent="border-l-[var(--theme-info)]" />
                  <InfoCard icon={BookOpen} label="Total SKS" value={selected?.TotalSKS !== undefined && selected?.TotalSKS !== null ? String(selected.TotalSKS) : '—'} accent="border-l-[var(--theme-primary)]" />
                </SectionBlock>

                {/* Identitas */}
                <SectionBlock icon={FileText} title="Identitas & Biodata">
                  <InfoCard icon={Calendar} label="Tempat, Tgl Lahir" value={selected ? `${selected.TempatLahir || '—'}, ${formatDate(selected.TanggalLahir)}` : ''} accent="border-l-[var(--theme-error)]" />
                  <InfoCard icon={Users} label="Jenis Kelamin" value={selected?.JenisKelamin === 'L' ? 'Laki-laki' : selected?.JenisKelamin === 'P' ? 'Perempuan' : selected?.JenisKelamin || '—'} accent="border-l-[var(--theme-info)]" />
                  <InfoCard icon={Heart} label="Agama / WN" value={selected ? `${selected.Agama || '—'} - ${selected.Kewarganegaraan || '—'}` : '—'} accent="border-l-[var(--theme-warning)]" />
                  <InfoCard icon={FileText} label="Golongan Darah" value={selected?.GolonganDarah || '—'} accent="border-l-[var(--theme-error)]" />
                  <InfoCard icon={FileText} label="NIK" value={selected?.NIK || '—'} accent="border-l-[var(--theme-info)]" mono />
                  <InfoCard icon={Award} label="NISN" value={selected?.NISN || '—'} accent="border-l-[var(--theme-primary)]" mono />
                  <InfoCard icon={Layers} label="NIRM" value={selected?.NIRM || '—'} accent="border-l-[var(--theme-success)]" mono />
                </SectionBlock>

                {/* Kontak */}
                <SectionBlock icon={Phone} title="Kontak & Alamat">
                  <InfoCard icon={Phone} label="No. HP / WhatsApp" value={selected?.NoHP} accent="border-l-[var(--theme-success)]" />
                  <InfoCard icon={Mail} label="Email Institusi" value={selected?.Email} accent="border-l-[var(--theme-info)]" mono />
                  <InfoCard icon={Mail} label="Email Personal" value={selected?.EmailPersonal || '—'} accent="border-l-[var(--theme-warning)]" mono />
                  <InfoCard icon={MapPin} label="Alamat" value={selected?.Alamat || '—'} accent="border-l-[var(--theme-text-subtle)]" />
                  <InfoCard icon={MapPin} label="Kota" value={selected?.Kota || '—'} accent="border-l-[var(--theme-info)]" />
                  <InfoCard icon={MapPin} label="Provinsi" value={selected?.Provinsi || '—'} accent="border-l-[var(--theme-warning)]" />
                </SectionBlock>

                {/* Pendidikan Sebelumnya */}
                <SectionBlock icon={GraduationCap} title="Pendidikan Sebelumnya">
                  <InfoCard icon={Building2} label="Asal Sekolah" value={selected?.AsalSekolah || '—'} accent="border-l-[var(--theme-info)]" />
                  <InfoCard icon={FileText} label="No. Ijazah SMA" value={selected?.NoIjazahSMA || '—'} accent="border-l-[var(--theme-primary)]" mono />
                </SectionBlock>

                {/* Orang Tua */}
                <SectionBlock icon={Heart} title="Data Orang Tua" last>
                  <InfoCard icon={Users} label="Nama Ayah" value={selected?.NamaAyah || '—'} accent="border-l-[var(--theme-info)]" />
                  <InfoCard icon={Users} label="Nama Ibu" value={selected?.NamaIbu || '—'} accent="border-l-[var(--theme-error)]" />
                  <InfoCard icon={FileText} label="Pekerjaan Ayah" value={selected?.PekerjaanAyah || '—'} accent="border-l-[var(--theme-warning)]" />
                  <InfoCard icon={FileText} label="Pekerjaan Ibu" value={selected?.PekerjaanIbu || '—'} accent="border-l-[var(--theme-success)]" />
                  <InfoCard icon={FileText} label="Penghasilan Ortu" value={selected?.PenghasilanOrtu ? `Rp ${Number(selected.PenghasilanOrtu).toLocaleString('id-ID')}` : '—'} accent="border-l-[var(--theme-info)]" />
                </SectionBlock>
              </>
            )}

            {detailTab === "akademik" && (
              <div className="p-5 space-y-5">
                {/* KRS Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-[var(--theme-text)] uppercase tracking-[0.18em] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 16 }}>assignment</span>
                      Kartu Rencana Studi (KRS)
                    </h4>
                    <span className="text-[9px] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] px-2 py-0.5 rounded-full font-bold">
                      SEVIMA Live
                    </span>
                  </div>
                  {loadingAcademic ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-xs text-[var(--theme-text-muted)]">
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>
                      Menghubungi SEVIMA...
                    </div>
                  ) : !academicData?.krs || academicData.krs.length === 0 ? (
                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-2xl p-6 text-center text-xs text-[var(--theme-text-muted)]">
                      Belum ada mata kuliah aktif di KRS periode ini.
                    </div>
                  ) : (
                    <div className="border border-[var(--theme-border-muted)] rounded-2xl overflow-hidden bg-[var(--theme-bg)]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                          <thead>
                            <tr className="bg-[var(--theme-bg)]/50 border-b border-[var(--theme-border-muted)]">
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-[9px]">Mata Kuliah</th>
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center text-[9px] w-12">SKS</th>
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-[9px] w-20">Kelas</th>
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-[9px]">Dosen</th>
                            </tr>
                          </thead>
                          <tbody>
                            {academicData.krs.map((item, idx) => (
                              <tr key={idx} className="border-b border-[var(--theme-border-muted)] last:border-0 hover:bg-[var(--theme-bg)]/50">
                                <td className="p-3">
                                  <span className="font-semibold text-[var(--theme-text)] block">{item.nama_mata_kuliah || item.nama_mk}</span>
                                  <span className="text-[9px] text-[var(--theme-text-muted)] font-mono">{item.kode_mata_kuliah || item.kode_mk}</span>
                                </td>
                                <td className="p-3 text-center font-mono font-semibold text-[var(--theme-text)]">{item.sks_mata_kuliah || item.sks || '—'}</td>
                                <td className="p-3 text-[var(--theme-text-muted)]">{item.nama_kelas || item.kelas || '—'}</td>
                                <td className="p-3 text-[var(--theme-text-muted)] truncate max-w-[150px]" title={item.nama_dosen || item.dosen}>{item.nama_dosen || item.dosen || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>

                {/* Transkrip Section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10px] font-bold text-[var(--theme-text)] uppercase tracking-[0.18em] flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[var(--theme-success)]" style={{ fontSize: 16 }}>history_edu</span>
                      Transkrip Nilai
                    </h4>
                    <div className="flex gap-1.5">
                      <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                        IPK: {academicData?.ipk !== undefined && academicData?.ipk !== null ? Number(academicData.ipk).toFixed(2) : '0.00'}
                      </span>
                      <span className="text-[9px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                        SKS: {academicData?.total_sks !== undefined && academicData?.total_sks !== null ? academicData.total_sks : 0}
                      </span>
                    </div>
                  </div>
                  {loadingAcademic ? (
                    <div className="flex items-center justify-center py-8 gap-2 text-xs text-[var(--theme-text-muted)]">
                      <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>
                      Menghubungi SEVIMA...
                    </div>
                  ) : !academicData?.transkrip || academicData.transkrip.length === 0 ? (
                    <div className="bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-2xl p-6 text-center text-xs text-[var(--theme-text-muted)]">
                      Belum ada riwayat nilai transkrip dari SEVIMA.
                    </div>
                  ) : (
                    <div className="border border-[var(--theme-border-muted)] rounded-2xl overflow-hidden bg-[var(--theme-bg)]">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                          <thead>
                            <tr className="bg-[var(--theme-bg)]/50 border-b border-[var(--theme-border-muted)]">
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-[9px]">Mata Kuliah</th>
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center text-[9px] w-12">SKS</th>
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center text-[9px] w-20">Nilai</th>
                              <th className="p-3 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center text-[9px] w-20">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {academicData.transkrip.map((item, idx) => {
                              const isLulus = item.is_lulus === '1' || item.is_lulus === 1 || item.is_lulus === true;
                              return (
                                <tr key={idx} className="border-b border-[var(--theme-border-muted)] last:border-0 hover:bg-[var(--theme-bg)]/50">
                                  <td className="p-3">
                                    <span className="font-semibold text-[var(--theme-text)] block">{item.nama_mata_kuliah}</span>
                                    <span className="text-[9px] text-[var(--theme-text-muted)] font-mono">{item.kode_mata_kuliah}</span>
                                  </td>
                                  <td className="p-3 text-center font-mono font-semibold text-[var(--theme-text)]">{item.sks_mata_kuliah}</td>
                                  <td className="p-3 text-center">
                                    <span className="font-bold text-[var(--theme-text)] block">{item.nilai_huruf || '—'}</span>
                                    <span className="text-[9px] text-[var(--theme-text-muted)] font-mono">({item.nilai_angka || '0.00'})</span>
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={cn(
                                      "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider",
                                      isLulus ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-500 border border-rose-100"
                                    )}>
                                      {isLulus ? "LULUS" : "TDK LULUS"}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {detailTab === "perwalian" && (
              <div className="p-5 space-y-4">
                {/* Section Header */}
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-[10px] font-bold text-[var(--theme-text)] uppercase tracking-[0.18em] flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 16 }}>supervisor_account</span>
                    Riwayat Perwalian & Bimbingan
                  </h4>
                  <span className="text-[9px] bg-[var(--theme-primary-light)] text-[var(--theme-primary)] px-2 py-0.5 rounded-full font-bold">
                    SEVIMA Live
                  </span>
                </div>

                {loadingPerwalian ? (
                  <div className="flex items-center justify-center py-12 gap-2 text-xs text-[var(--theme-text-muted)]">
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: 16 }}>sync</span>
                    Menghubungi SEVIMA...
                  </div>
                ) : !perwalianData || perwalianData.length === 0 ? (
                  <div className="bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-2xl p-8 text-center text-xs text-[var(--theme-text-muted)]">
                    Belum ada riwayat perwalian dari SEVIMA.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {[...perwalianData]
                      .sort((a, b) => b.attributes?.id_periode?.localeCompare(a.attributes?.id_periode))
                      .map((item) => {
                        const attr = item.attributes || {};
                        const pId = attr.id_periode;
                        const isExpanded = !!expandedPeriods[pId];
                        const khsList = item.khs || [];

                        return (
                          <div 
                            key={item.id} 
                            className="bg-white border border-[var(--theme-border-muted)] rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
                          >
                            {/* Header Card */}
                            <div 
                              onClick={() => togglePeriod(pId)}
                              className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-[var(--theme-bg)]/20 hover:bg-[var(--theme-bg)]/40 transition-colors select-none"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)]">
                                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_today</span>
                                </div>
                                <div>
                                  <h5 className="text-xs font-bold text-[var(--theme-text)]">
                                    {formatPeriodeName(pId)}
                                  </h5>
                                  <p className="text-[10px] text-[var(--theme-text-muted)] font-medium">
                                    Semester {attr.semester_mahasiswa || '—'} • Status: <span className="font-bold text-[var(--theme-primary)]">{attr.status_mahasiswa || '—'}</span>
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 ml-12 sm:ml-0">
                                {/* Quick Stats */}
                                <div className="flex items-center gap-2 text-[10px] text-[var(--theme-text-muted)]">
                                  <div className="bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                                    IPS: {attr.ips || '0.00'}
                                  </div>
                                  <div className="bg-slate-100 px-2 py-0.5 rounded-full font-bold">
                                    SKS: {attr.sks_semester || '0'}
                                  </div>
                                </div>

                                {/* Arrow Icon */}
                                <span 
                                  className={cn(
                                    "material-symbols-outlined transition-transform duration-300 text-[var(--theme-text-muted)]",
                                    isExpanded && "transform rotate-180"
                                  )}
                                  style={{ fontSize: 20 }}
                                >
                                  keyboard_arrow_down
                                </span>
                              </div>
                            </div>

                            {/* Collapsible Details */}
                            {isExpanded && (
                              <div className="p-4 border-t border-[var(--theme-border-muted)] bg-white space-y-4">
                                {/* Advisor & Bimbingan Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[var(--theme-bg)]/10 p-3.5 rounded-xl border border-[var(--theme-border-muted)]/50">
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Dosen Pembimbing Akademik</p>
                                    <p className="text-xs font-bold text-[var(--theme-text)]">{attr.dosen_pembimbing || '—'}</p>
                                    {attr.nidn_dosen_pembimbing && (
                                      <p className="text-[9px] text-[var(--theme-text-muted)] font-mono">NIDN {attr.nidn_dosen_pembimbing}</p>
                                    )}
                                  </div>
                                  <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Catatan Bimbingan</p>
                                    <p className="text-xs font-medium text-[var(--theme-text)] italic">
                                      {attr.keterangan ? `"${attr.keterangan}"` : 'Belum ada catatan bimbingan'}
                                    </p>
                                    {attr.tanggal_perwalian && (
                                      <p className="text-[9px] text-[var(--theme-text-muted)] font-mono">
                                        Tanggal: {new Date(attr.tanggal_perwalian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {/* KRS Status */}
                                <div className="flex flex-wrap items-center gap-3 py-1">
                                  <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mr-1">Status KRS:</p>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                    attr.is_krs_terisi === '1' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"
                                  )}>
                                    KRS Terisi
                                  </span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                    attr.is_krs_diajukan === '1' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"
                                  )}>
                                    KRS Diajukan
                                  </span>
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                    attr.is_krs_disetujui === '1' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-slate-50 text-slate-500 border-slate-200"
                                  )}>
                                    KRS Disetujui
                                  </span>
                                </div>

                                {/* KHS Grades Table */}
                                <div className="space-y-2">
                                  <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">
                                    Hasil Studi (KHS)
                                  </p>
                                  {khsList.length === 0 ? (
                                    <p className="text-xs text-[var(--theme-text-muted)] italic p-4 text-center bg-slate-50 border border-slate-100 rounded-xl">
                                      Belum ada data nilai hasil studi (KHS) untuk periode ini.
                                    </p>
                                  ) : (
                                    <div className="border border-[var(--theme-border-muted)] rounded-xl overflow-hidden bg-white">
                                      <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                                          <thead>
                                            <tr className="bg-[var(--theme-bg)]/10 border-b border-[var(--theme-border-muted)]">
                                              <th className="p-2.5 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-[9px]">Mata Kuliah</th>
                                              <th className="p-2.5 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center text-[9px] w-12">SKS</th>
                                              <th className="p-2.5 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center text-[9px] w-20">Nilai</th>
                                              <th className="p-2.5 font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center text-[9px] w-20">Status</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {khsList.map((khsItem, kIdx) => {
                                              const khsLulus = khsItem.is_lulus === '1' || khsItem.is_lulus === 1 || khsItem.is_lulus === true;
                                              return (
                                                <tr key={kIdx} className="border-b border-[var(--theme-border-muted)] last:border-0 hover:bg-[var(--theme-bg)]/50">
                                                  <td className="p-2.5">
                                                    <span className="font-semibold text-[var(--theme-text)] block">{khsItem.mata_kuliah}</span>
                                                    <span className="text-[9px] text-[var(--theme-text-muted)] font-mono">{khsItem.kode_mata_kuliah}</span>
                                                  </td>
                                                  <td className="p-2.5 text-center font-mono font-semibold text-[var(--theme-text)]">{khsItem.sks}</td>
                                                  <td className="p-2.5 text-center">
                                                    <span className="font-bold text-[var(--theme-text)] block">{khsItem.nilai_huruf || '—'}</span>
                                                    <span className="text-[9px] text-[var(--theme-text-muted)] font-mono">({khsItem.nilai_angka || '0.00'})</span>
                                                  </td>
                                                  <td className="p-2.5 text-center">
                                                    <span className={cn(
                                                      "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[9px] font-bold font-mono tracking-wider",
                                                      khsLulus ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-500 border border-rose-100"
                                                    )}>
                                                      {khsLulus ? "LULUS" : "TDK LULUS"}
                                                    </span>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            )}
          </div>
      </DialogModal>
    </PageContent>
  )
}

function SectionBlock({ icon, title, children, last = false }) {
  const IconComponent = icon
  return (
    <div className={cn('p-5', !last && 'border-b border-[var(--theme-border-muted)]')}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-5 h-5 rounded-md bg-[var(--theme-primary-light)] flex items-center justify-center">
          <IconComponent size={11} className="text-[var(--theme-primary)]" />
        </div>
        <h3 className="text-[10px] font-bold font-headline uppercase tracking-[0.18em] text-[var(--theme-text)]">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function InfoCard({ icon, label, value, accent = 'border-l-[var(--theme-text-subtle)]', mono = false }) {
  const IconComponent = icon
  const empty = !value || value === '—'
  return (
    <div className={cn('flex items-start gap-3 p-3.5 rounded-xl bg-white border border-[var(--theme-border-muted)] border-l-4 group hover:shadow-md hover:border-[var(--theme-border)] transition-all duration-300', accent)}>
      <div className="w-8 h-8 bg-[var(--theme-bg)] rounded-lg flex items-center justify-center text-[var(--theme-primary)] shadow-sm border border-[var(--theme-border-muted)] flex-shrink-0 group-hover:scale-110 transition-transform">
        <IconComponent size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">{label}</p>
        <p className={cn('text-[13px] font-bold text-[var(--theme-text)] truncate', mono && 'font-mono text-xs', empty && 'text-[var(--theme-text-subtle)] italic font-medium')}>
          {empty ? 'Belum diisi' : value}
        </p>
      </div>
    </div>
  )
}
