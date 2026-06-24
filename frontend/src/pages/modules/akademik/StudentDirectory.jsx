"use client"

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/Avatar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { SelectField, SelectOption } from '@/components/ui/SelectField'
import { Tooltip as UITooltip, TooltipTrigger, TooltipContent } from '@/components/ui/Tooltip'
import api from '@/lib/axios'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService, API_BASE_URL } from '@/services/api'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/Select'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, LineChart, Line, ComposedChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts"
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Coordinates dictionary for heatmap mapping
const CITY_COORDINATES = {
  "KABUPATEN BANDUNG": [-7.0253, 107.5381],
  "KOTA BANDUNG": [-6.9175, 107.6191],
  "KABUPATEN GARUT": [-7.2279, 107.9087],
  "KABUPATEN SUMEDANG": [-6.8385, 107.9268],
  "KABUPATEN SUBANG": [-6.5684, 107.7610],
  "KABUPATEN TASIKMALAYA": [-7.3196, 108.2022],
  "KOTA TASIKMALAYA": [-7.3274, 108.2232],
  "KABUPATEN CIANJUR": [-6.8168, 107.1425],
  "KABUPATEN SUKABUMI": [-6.9275, 106.9256],
  "KOTA SUKABUMI": [-6.9237, 106.9287],
  "KABUPATEN BANDUNG BARAT": [-6.8407, 107.5028],
  "KOTA CIMAHI": [-6.8723, 107.5463],
  "KABUPATEN BOGOR": [-6.5976, 106.7990],
  "KOTA BOGOR": [-6.5950, 106.8166],
  "KABUPATEN CIREBON": [-6.7320, 108.5523],
  "KOTA CIREBON": [-6.7320, 108.5523],
  "KABUPATEN PURWAKARTA": [-6.5560, 107.4430],
  "KABUPATEN KARAWANG": [-6.3227, 107.3376],
  "KABUPATEN MAJALENGKA": [-6.8360, 108.2273],
  "KABUPATEN INDRAMAYU": [-6.3275, 108.3249],
  "KABUPATEN KUNINGAN": [-6.9750, 108.4833],
  "KABUPATEN CIAMIS": [-7.3290, 108.3536],
  "KABUPATEN PANGANDARAN": [-7.7028, 108.6534],
  "KOTA BANJAR": [-7.3739, 108.5369],
  "KOTA BEKASI": [-6.2383, 106.9756],
  "KABUPATEN BEKASI": [-6.2300, 107.1688],
  "KOTA DEPOK": [-6.4025, 106.7942],
  "JAKARTA SELATAN": [-6.2615, 106.8106],
  "JAKARTA TIMUR": [-6.2250, 106.9004],
  "JAKARTA BARAT": [-6.1683, 106.7588],
  "JAKARTA UTARA": [-6.1244, 106.8764],
  "JAKARTA PUSAT": [-6.1805, 106.8284],
  "KOTA SURABAYA": [-7.2504, 112.7688],
  "KABUPATEN SIDOARJO": [-7.4478, 112.7183],
  "KOTA MALANG": [-7.9839, 112.6214],
  "KABUPATEN MALANG": [-8.1321, 112.5685],
  "KOTA SEMARANG": [-6.9666, 110.4166],
  "KABUPATEN BANYUMAS": [-7.4500, 109.1667],
  "KOTA YOGYAKARTA": [-7.7970, 110.3705],
  "KABUPATEN SLEMAN": [-7.7308, 110.3541],
  "KOTA MEDAN": [3.5952, 98.6722],
  "KOTA PADANG": [-0.9471, 100.4172],
  "KOTA PALEMBANG": [-2.9909, 104.7566],
  "KOTA PEKANBARU": [0.5333, 101.4500],
  "KOTA BATAM": [1.0828, 104.0305],
  "KOTA BANDAR LAMPUNG": [-5.4500, 105.2667],
  "KOTA JAMBI": [-1.6101, 103.6141],
  "KOTA BENGKULU": [-3.7928, 102.2601],
  "KOTA DENPASAR": [-8.6705, 115.2126],
  "KABUPATEN BADUNG": [-8.5815, 115.1773],
  "KOTA MATARAM": [-8.5833, 116.1167],
  "KOTA KUPANG": [-10.1583, 123.5833],
  "KOTA PONTIANAK": [-0.0227, 109.3425],
  "KOTA PALANGKARAYA": [-2.2083, 113.9167],
  "KOTA BANJARMASIN": [-3.3167, 114.5901],
  "KOTA SAMARINDA": [-0.5022, 117.1536],
  "KOTA BALIKPAPAN": [-1.2653, 116.8312],
  "KOTA MAKASSAR": [-5.1476, 119.4327],
  "KOTA MANADO": [1.4931, 124.8413],
  "KOTA PALU": [-0.8917, 119.8707],
  "KOTA KENDARI": [-3.9749, 122.5113],
  "KOTA AMBON": [-3.6954, 128.1814],
  "KOTA TERNATE": [0.7893, 127.3015],
  "KOTA JAYAPURA": [-2.5337, 140.7181],
  "KABUPATEN MERAUKE": [-8.4996, 140.4014],
  "KOTA SORONG": [-0.8800, 131.2500]
}

import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero, DashboardStatGrid, DashboardStatCard } from '@/components/ui/dashboard'
import { PrimaryStatsCard, SecondaryStatsCard } from '@/components/ui/StatsCard'

const formatErrorMsg = (errStr) => {
  if (!errStr) return "-";
  const str = errStr.toLowerCase();
  if (str.includes('idx_mahasiswa_mahasiswa_pengguna_id')) return "Akun Ganda (Mahasiswa ini sudah punya akun atau tersinkronisasi dua kali)";
  if (str.includes('mahasiswas_nim_key') || (str.includes('duplicate') && str.includes('nim'))) return "NIM Ganda (NIM ini sudah dipakai oleh mahasiswa lain)";
  if (str.includes('mahasiswas_nik_key') || (str.includes('duplicate') && str.includes('nik'))) return "NIK Ganda (Nomor KTP sudah terdaftar pada pengguna lain)";
  if (str.includes('duplicate key value')) return "Data Duplikat (Ganda)";
  if (str.includes('null value in column "nim"')) return "NIM Kosong (NIM wajib diisi di portal SEVIMA)";
  if (str.includes('foreign key constraint')) return "Data Referensi Tidak Valid (Cek kesesuaian Program Studi atau Fakultas)";
  if (str.includes('too long')) return "Isian Data Terlalu Panjang (Melebihi batas karakter maksimal)";
  return errStr;
};
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

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SearchableSelect — A styled, searchable dropdown option list               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function SearchableSelect({ value, onChange, options, placeholder, searchPlaceholder = "Cari...", required = false, direction = "down" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Close dropdown when user clicks outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Invisible input to maintain native HTML5 validation constraints */}
      <input
        type="text"
        tabIndex={-1}
        className="sr-only absolute inset-x-0 bottom-0 h-0 w-full opacity-0 pointer-events-none"
        required={required}
        value={value || ""}
        onChange={() => { }}
      />

      {/* Select Trigger */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full h-11 px-3 border rounded-xl text-sm flex items-center justify-between cursor-pointer transition-colors font-semibold font-body ${isOpen
          ? "border-bku-primary bg-white text-slate-800"
          : "border-slate-200 bg-slate-50/30 text-slate-700"
          }`}
      >
        <span className={selectedOption ? "text-slate-800" : "text-slate-400"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span
          className="material-symbols-outlined text-[18px] text-slate-400 transition-transform duration-200"
          style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
        >
          keyboard_arrow_down
        </span>
      </div>

      {/* Styled Popover list */}
      {isOpen && (
        <div className={`absolute z-[100] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in duration-150 ${direction === "up"
          ? "bottom-full mb-1.5 slide-in-from-bottom-1"
          : "top-full mt-1.5 slide-in-from-top-1"
          }`}>
          {/* Search bar */}
          <div className="p-2 border-b border-slate-100 bg-slate-50/30 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-slate-400 ml-1 shrink-0">search</span>
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 bg-transparent text-xs outline-none text-slate-800 placeholder-slate-400 font-semibold font-body"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-450 hover:text-slate-800 flex items-center justify-center shrink-0"
              >
                <span className="material-symbols-outlined text-[12px]">close</span>
              </button>
            )}
          </div>

          {/* Options Wrapper */}
          <div className="max-h-48 overflow-y-auto no-scrollbar py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-slate-400 text-center font-semibold font-body">
                Tidak ada hasil ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                      setSearch("");
                    }}
                    className={`px-3 py-2.5 text-xs cursor-pointer font-semibold font-body transition-colors flex items-center justify-between ${isSelected
                      ? "bg-blue-50 text-blue-600 font-bold"
                      : "text-slate-700 hover:bg-slate-50"
                      }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[14px] text-blue-600 font-bold">check</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/95 text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-xl border border-white/10 backdrop-blur-md flex flex-col gap-1 font-body">
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</p>
        {payload.map((p, idx) => (
          <div key={idx} className="flex items-center gap-1.5 leading-none mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color || p.fill }} />
            <span>{p.name}: <strong className="text-white font-extrabold">{p.value}</strong></span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const UserX = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person_off</span>;
const UserIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const Building2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>business</span>;



const EMPTY_FORM = {
  NIM: '', Nama: '', EmailKampus: '', password: '', FakultasID: '',
  ProgramStudiID: '', SemesterSekarang: 1, StatusAkun: 'Aktif',
  Alamat: '', TahunMasuk: new Date().getFullYear()
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
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute animate-in fade-in" style={{ fontSize: className.includes('w-28') ? '56px' : className.includes('w-20') ? '40px' : className.includes('w-14') ? '28px' : '20px' }}>
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

function mapStatusAkun(statusAkun = '', statusAkademik = '') {
  if (statusAkademik) return statusAkademik;
  if (statusAkun) return statusAkun;
  return 'Aktif';
}

function mapSemester(statusAkun = '', semester = 1) {
  if ((statusAkun || '').toLowerCase() === 'lulus') return 0
  const parsed = Number(semester)
  if (!Number.isInteger(parsed) || parsed < 1) return 1
  return parsed
}

function normalizeStudentRow(row = {}) {
  const normalizedStatus = mapStatusAkun(row.StatusAkun, row.StatusAkademik)
  return {
    ...row,
    StatusAkun: normalizedStatus,
    SemesterSekarang: mapSemester(normalizedStatus, row.SemesterSekarang)
  }
}

export default function StudentDirectory() {
  const [students, setStudents] = useState([])
  const [anomalies, setAnomalies] = useState([])
  const [syncedNims, setSyncedNims] = useState(new Set())
  const [prodi, setProdi] = useState([])
  const [faculties, setFaculties] = useState([])
  const [loading, setLoading] = useState(true)

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [searchQuery, setSearchQuery] = useState('')
  const [totalStudents, setTotalStudents] = useState(0)
  const [filterValues, setFilterValues] = useState({})
  const [analyticsFilter, setAnalyticsFilter] = useState({ angkatan: 'all', statusAkun: 'all' })
  const [dashboardStats, setDashboardStats] = useState({
    total_data: 0,
    terverifikasi: 0,
    anomali: 0,
    aktif: 0,
    cuti: 0,
    lulus: 0,
    keluar: 0,
    laki_laki: 0,
    perempuan: 0,
    avg_ipk: 0,
    at_risk: 0,
    data_anomaly_rate: 0,
    faculty_data: [],
    trend_data: [],
    faculty_ipk: [],
    top_sekolah: [],
    top_kota: [],
    age_distribution: [],
    sistem_kuliah_data: [],
    kategori_ukt_data: []
  })

  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncingIpk, setIsSyncingIpk] = useState(false)
  const [syncProgress, setSyncProgress] = useState(null)
  const [hoveredFaculty, setHoveredFaculty] = useState(null)

  const [activeTab, setActiveTab] = useState('profile')
  const [activeView, setActiveView] = useState('list')
  const [isSyncBiodataModalOpen, setIsSyncBiodataModalOpen] = useState(false)
  const [isSyncIpkModalOpen, setIsSyncIpkModalOpen] = useState(false)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const [tabData, setTabData] = useState({
    kencana: null,
    counseling: null,
    healthBookings: null,
    healthRecords: null,
    scholarships: null,
    achievements: null,
    organisasi: null,
    aspirasi: null
  })
  const [tabLoading, setTabLoading] = useState({
    kencana: false,
    counseling: false,
    health: false,
    scholarships: false,
    achievements: false,
    organisasi: false,
    aspirasi: false
  })

  const [academicData, setAcademicData] = useState(null)
  const [loadingAcademic, setLoadingAcademic] = useState(false)
  const [perwalianData, setPerwalianData] = useState(null)
  const [loadingPerwalian, setLoadingPerwalian] = useState(false)
  const [expandedPeriods, setExpandedPeriods] = useState({})

  useEffect(() => {
    if (!selected) {
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
                  DosenPA: res.data.data.dosen_pa ? { Nama: res.data.data.dosen_pa } : prev.DosenPA
                }
              })

              setStudents(prevList => prevList.map(s => {
                if (s.NIM === selected.NIM) {
                  return {
                    ...s,
                    IPK: res.data.data.ipk,
                    TotalSKS: res.data.data.total_sks,
                    DosenPA: res.data.data.dosen_pa ? { Nama: res.data.data.dosen_pa } : s.DosenPA
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

    if (activeTab === "perwalian" && !perwalianData) {
      setLoadingPerwalian(true)
      api.get(`/app/dashboard/students/${selected.NIM}/perwalian`)
        .then(res => {
          if (res.data?.status === 'success') {
            setPerwalianData(res.data.data)

            if (res.data.data && res.data.data.length > 0) {
              const latestPA = res.data.data[0].attributes?.penasehat || res.data.data[0].attributes?.dosen_pembimbing
              if (latestPA) {
                setSelected(prev => {
                  if (!prev) return null
                  return {
                    ...prev,
                    DosenPA: { Nama: latestPA }
                  }
                })

                setStudents(prevList => prevList.map(s => {
                  if (s.NIM === selected.NIM) {
                    return {
                      ...s,
                      DosenPA: { Nama: latestPA }
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
  }, [selected?.NIM, activeTab])

  const togglePeriod = (periodId) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [periodId]: !prev[periodId]
    }))
  }

  const formatPeriodeName = (periodeId) => {
    if (!periodeId || periodeId.length < 5) return periodeId;
    const year = periodeId.substring(0, 4);
    const semester = periodeId.substring(4, 5);
    const semName = semester === '1' ? 'Ganjil' : 'Genap';
    const nextYear = parseInt(year) + 1;
    return `Semester ${semester} (${year}/${nextYear} ${semName})`;
  }

  const fetchTabContext = async (tab, studentId) => {
    if (!studentId) return;
    const config = {
      headers: {
        'X-Student-ID': String(studentId)
      }
    };

    if (tab === 'kencana' && !tabData.kencana) {
      setTabLoading(prev => ({ ...prev, kencana: true }))
      try {
        const res = await api.get('/kencana/progress', config)
        if (res.data?.success || res.data) {
          setTabData(prev => ({ ...prev, kencana: toArray(res) }))
        }
      } catch (err) {
        console.error("Gagal memuat data PKKMB:", err)
      } finally {
        setTabLoading(prev => ({ ...prev, kencana: false }))
      }
    }

    if (tab === 'counseling_health' && (!tabData.counseling || !tabData.healthBookings || !tabData.healthRecords)) {
      setTabLoading(prev => ({ ...prev, health: true }))
      try {
        const [counsRes, hbRes, hrRes] = await Promise.allSettled([
          api.get('/counseling/psychologist-bookings', config),
          api.get('/student-health/bookings', config),
          api.get('/student-health/riwayat', config)
        ])

        const counselingData = counsRes.status === 'fulfilled' ? toArray(counsRes.value) : []
        const healthBookingsData = hbRes.status === 'fulfilled' ? toArray(hbRes.value) : []
        const healthRecordsData = hrRes.status === 'fulfilled' ? toArray(hrRes.value) : []

        setTabData(prev => ({
          ...prev,
          counseling: counselingData,
          healthBookings: healthBookingsData,
          healthRecords: healthRecordsData
        }))
      } catch (err) {
        console.error("Gagal memuat data konseling & kesehatan:", err)
      } finally {
        setTabLoading(prev => ({ ...prev, health: false }))
      }
    }

    if (tab === 'akademik_beasiswa' && (!tabData.scholarships || !tabData.achievements)) {
      setTabLoading(prev => ({ ...prev, scholarships: true }))
      try {
        const [schRes, achRes] = await Promise.allSettled([
          api.get('/scholarship/riwayat', config),
          api.get('/achievement', config)
        ])

        const scholarshipsData = schRes.status === 'fulfilled' ? toArray(schRes.value) : []
        const achievementsData = achRes.status === 'fulfilled' ? toArray(achRes.value) : []

        setTabData(prev => ({
          ...prev,
          scholarships: scholarshipsData,
          achievements: achievementsData
        }))
      } catch (err) {
        console.error("Gagal memuat data beasiswa & prestasi:", err)
      } finally {
        setTabLoading(prev => ({ ...prev, scholarships: false }))
      }
    }

    if (tab === 'organisasi_aspirasi' && (!tabData.organisasi || !tabData.aspirasi)) {
      setTabLoading(prev => ({ ...prev, organisasi: true }))
      try {
        const [orgRes, aspRes] = await Promise.allSettled([
          api.get('/organisasi/pendaftaran', config),
          api.get('/student-voice', config)
        ])

        const organisasiData = orgRes.status === 'fulfilled' ? toArray(orgRes.value) : []
        const aspirasiData = aspRes.status === 'fulfilled' ? toArray(aspRes.value) : []

        setTabData(prev => ({
          ...prev,
          organisasi: organisasiData,
          aspirasi: aspirasiData
        }))
      } catch (err) {
        console.error("Gagal memuat data organisasi & aspirasi:", err)
      } finally {
        setTabLoading(prev => ({ ...prev, organisasi: false }))
      }
    }
  }

  const handleOpenDetail = (row) => {
    setSelected(row)
    setActiveTab('profile')
    setTabData({
      kencana: null,
      counseling: null,
      healthBookings: null,
      healthRecords: null,
      scholarships: null,
      achievements: null,
      organisasi: null,
      aspirasi: null
    })
    setIsDetailOpen(true)
  }

  const [sevimaHealth, setSevimaHealth] = useState('online') // 'online' or 'offline'

  // Fetch Sevima Health every 5 mins
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const res = await api.get('/app/dashboard/sevima/health')
        if (res.data && res.data.status) {
          setSevimaHealth(res.data.status)
        }
      } catch (err) {
        setSevimaHealth('offline')
      }
    }

    fetchHealth()
    const interval = setInterval(fetchHealth, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async ({ syncFromPddikti = false, showSyncToast = false } = {}) => {
    setLoading(true)
    try {
      let latestSyncedNims = syncedNims
      if (syncFromPddikti) {
        const syncRes = await adminService.syncPddikti('Universitas Bhakti Kencana', 'all')
        const syncedList = syncRes?.data?.mahasiswa || []
        latestSyncedNims = new Set(syncedList.map(m => String(m?.nim || '').trim()).filter(Boolean))
        setSyncedNims(latestSyncedNims)
        if (showSyncToast) {
          toast.success('Sinkronisasi PDDikti Cluster Berhasil')
        }
      }
      const [statsRes, prodiRes, facRes, anomaliRes] = await Promise.all([
        adminService.getStudentStats(analyticsFilter).catch(() => ({ data: {} })),
        adminService.getAllProdi().catch(() => ({ data: [] })),
        adminService.getAllFaculties().catch(() => ({ data: [] })),
        api.get('/app/dashboard/sevima/anomali').catch(() => ({ data: { data: [] } }))
      ])

      if (statsRes?.data) {
        setDashboardStats(statsRes.data)
      }
      if (anomaliRes?.data?.data) {
        setAnomalies(anomaliRes.data.data)
      }
      if (prodiRes?.status === 'success' || prodiRes?.data) setProdi(prodiRes.data || [])
      if (facRes?.status === 'success' || facRes?.data) setFaculties(facRes.data || [])

    } catch {
      toast.error('Gagal memuat sinkronisasi cluster')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const stdRes = await adminService.getAllStudents(currentPage, pageSize, searchQuery, filterValues)
      if (stdRes?.status === 'success' || stdRes?.data) {
        const allStudents = (stdRes.data || []).map(normalizeStudentRow)
        setStudents(allStudents)
        if (stdRes.pagination) {
          setTotalStudents(stdRes.pagination.total)
        } else {
          setTotalStudents(allStudents.length)
        }
      }
    } catch {
      toast.error('Gagal memuat daftar mahasiswa')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [currentPage, pageSize, searchQuery, filterValues])

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    const fetchStatsOnly = async () => {
      try {
        const statsRes = await adminService.getStudentStats(analyticsFilter)
        if (statsRes?.data) setDashboardStats(statsRes.data)
      } catch (e) { }
    }
    fetchStatsOnly()
  }, [analyticsFilter])

  const handleExportAnomaliCsv = () => {
    if (anomalies.length === 0) {
      toast.error('Tidak ada data anomali untuk diexport');
      return;
    }
    const headers = ['ID_SEVIMA', 'NIM', 'NAMA_MAHASISWA', 'PRODI', 'ALASAN_ERROR'];
    const csvContent = "data:text/csv;charset=utf-8,"
      + headers.join(',') + '\n'
      + anomalies.map(e => `"${e.id_sevima}","${e.nim || ''}","${e.nama || ''}","${e.prodi || ''}","${(e.alasan_error || '').replace(/"/g, '""')}"`).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Karantina_Anomali_Sevima_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSyncAnomali = async (row) => {
    const toastId = toast.loading(`Mencoba sync ulang data: ${row.nama || row.id_sevima}...`);
    try {
      await api.post(`/app/dashboard/sevima/anomali/${row.id_sevima}/sync`);
      toast.success('Sinkronisasi berhasil! Data masuk ke direktori utama.', { id: toastId });
      fetchData(); // Refresh data
    } catch (err) {
      toast.error(err.response?.data?.error || 'Gagal sinkronisasi ulang', { id: toastId });
    }
  };

  const handleDeleteAnomali = async (row) => {
    if (!window.confirm(`Yakin ingin menghapus data karantina ${row.nama || row.id_sevima} secara permanen?`)) return;
    try {
      await api.delete(`/app/dashboard/sevima/anomali/${row.id_sevima}?t=${new Date().getTime()}`);
      toast.success('Data anomali berhasil dihapus');
      setAnomalies(prev => prev.filter(a => a.id_sevima !== row.id_sevima));
    } catch (err) {
      toast.error('Gagal menghapus data anomali');
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const handleDownloadReport = async () => {
    setIsDownloadingPdf(true);
    const toastId = toast.loading('Membuat laporan PDF...');
    try {
      await adminService.downloadExecutiveReport(analyticsFilter);
      toast.success('Laporan berhasil diunduh', { id: toastId });
    } catch (error) {
      toast.error(error.message || 'Gagal mengunduh laporan', { id: toastId });
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    let interval;
    const checkProgress = async () => {
      try {
        const res = await adminService.getSyncProgress();
        if (res.data) {
          const prog = res.data;
          setSyncProgress(prog);

          if (prog.is_running) {
            if (prog.phase === 2) {
              if (!isSyncingIpk) setIsSyncingIpk(true);
            } else {
              if (!isSyncing) setIsSyncing(true);
            }
          } else {
            if (isSyncing) {
              setIsSyncing(false);
              setIsSyncBiodataModalOpen(false);
              toast.success(`Sinkronisasi SEVIMA Selesai/Dibatalkan! ${prog.total_synced} data ditarik.`, { duration: 6000 });
              fetchData();
              fetchStudents();
            }
            if (isSyncingIpk) {
              setIsSyncingIpk(false);
              setIsSyncIpkModalOpen(false);
              toast.success(`Sinkronisasi IPK Selesai/Dibatalkan! ${prog.ipk_synced} data diperbarui.`, { duration: 6000 });
              fetchData();
              fetchStudents();
            }
          }
        }
      } catch (e) { }
    };

    if (isSyncing || isSyncingIpk) {
      interval = setInterval(checkProgress, 1000);
    } else {
      checkProgress();
    }

    return () => clearInterval(interval);
  }, [isSyncing, isSyncingIpk]);

  const handleSyncSevima = async () => {
    setIsSyncing(true)
    setSyncProgress({ is_running: true, status_text: 'Memulai koneksi ke SEVIMA...' })
    try {
      await adminService.syncSevima()
    } catch {
      toast.error('Gagal memulai sinkronisasi dari Sevima Siakad Cloud')
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }

  const handleSyncIpk = async () => {
    setIsSyncingIpk(true)
    try {
      const res = await api.post('/app/dashboard/integrasi/sync-ipk')
      toast.success(res.data?.message || 'Sinkronisasi IPK sedang berjalan di latar belakang.', { duration: 5000 })
    } catch (err) {
      toast.error('Gagal memulai sinkronisasi IPK dari SEVIMA')
    } finally {
      setIsSyncingIpk(false)
    }
  }

  const handleResetData = async () => {
    setIsResetting(true)
    try {
      const res = await adminService.resetStudents()
      if (res.data?.status === 'success' || res.status === 'success') {
        toast.success('Data mahasiswa berhasil direset/dihapus total!')
      }
      await fetchData()
      await fetchStudents()
    } catch {
      toast.error('Gagal mereset data mahasiswa')
    } finally {
      setIsResetting(false)
    }
  }

  const handleOpenAdd = () => { setIsEditMode(false); setForm(EMPTY_FORM); setIsCrudOpen(true) }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({
      ID: row.id || row.ID,
      NIM: row.NIM || '',
      Nama: row.Nama || '',
      EmailKampus: row.EmailKampus || row.Pengguna?.email || row.Pengguna?.Email || '',
      password: '',
      FakultasID: String(row.FakultasID || ''),
      ProgramStudiID: String(row.ProgramStudiID || ''),
      SemesterSekarang: row.SemesterSekarang || 1,
      StatusAkun: row.StatusAkun || 'Aktif',
      Alamat: row.Alamat || '',
      TahunMasuk: row.TahunMasuk || new Date().getFullYear()
    })
    setIsCrudOpen(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    const payload = {
      ...form,
      FakultasID: parseInt(form.FakultasID) || 0,
      ProgramStudiID: parseInt(form.ProgramStudiID) || 0,
      SemesterSekarang: parseInt(form.SemesterSekarang) || 1,
      TahunMasuk: parseInt(form.TahunMasuk) || new Date().getFullYear()
    }
    try {
      const targetId = form.ID || form.id
      const res = targetId ? await adminService.updateStudent(targetId, payload) : await adminService.createStudent(payload)
      if (res.status === 'success') {
        toast.success(targetId ? 'Profil mahasiswa berhasil diperbarui' : 'Registrasi mahasiswa baru berhasil')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menyimpan konfigurasi data')
      }
    } catch (err) {
      toast.error(err.message || 'Kesalahan operasional internal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      await adminService.deleteStudent(selected.id || selected.ID)
      toast.success('Entitas mahasiswa berhasil dihapus')
      setIsDelOpen(false)
      fetchData()
    } catch {
      toast.error('Gagal menghapus entitas data')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await adminService.resetStudents()
      toast.success('Seluruh data mahasiswa berhasil direset (dikosongkan)')
      setIsResetModalOpen(false)
      fetchData()
      fetchStudents()
    } catch {
      toast.error('Gagal mereset data mahasiswa')
    } finally {
      setIsResetting(false)
    }
  }

  const STATUS_STYLES = {
    'Aktif': 'bg-green-50 text-green-600 border-green-100 shadow-none',
    'Selesai Pendidikan Non Gelar': 'bg-purple-50 text-purple-600 border-purple-100 shadow-none',
    'Lulus': 'bg-blue-50 text-blue-600 border-blue-100 shadow-none',
    'Cuti': 'bg-amber-50 text-amber-600 border-amber-100 shadow-none',
    'Mutasi': 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 shadow-none',
    'Dikeluarkan': 'bg-red-50 text-red-800 border-red-200 shadow-none',
    'Mengajukan pengunduran diri': 'bg-orange-50 text-orange-600 border-orange-100 shadow-none',
    'Putus Studi': 'bg-rose-50 text-rose-600 border-rose-100 shadow-none',
    'Meninggal dunia': 'bg-slate-100 text-slate-600 border-slate-200 shadow-none',
    'Non-Aktif': 'bg-red-50 text-red-800 border-red-200 shadow-none',
    'LL': 'bg-blue-50 text-blue-600 border-blue-100 shadow-none',
    'Transfer': 'bg-indigo-50 text-indigo-600 border-indigo-100 shadow-none',
    'Sedang Double Degree': 'bg-violet-50 text-violet-600 border-violet-100 shadow-none',
    'DEFAULT': 'bg-neutral-50 text-neutral-400 border-neutral-100'
  }

  const columns = [
    {
      key: 'NIM',
      label: 'ID / NIM',
      className: 'min-w-[120px] w-[120px]',
      render: v => (
        <span className="text-[12px] font-bold text-slate-800 bg-slate-100/50 px-2.5 py-1.5 rounded-lg border border-slate-200/50 font-body">
          {v || '—'}
        </span>
      )
    },
    {
      key: 'Nama',
      label: 'Identitas Mahasiswa',
      className: 'min-w-[280px] w-[280px]',
      render: (v, row) => (
        <div className="flex items-center gap-4 py-2 group/avatar">
          <StudentAvatar
            src={getCleanImageUrl(row.FotoURL || row.foto_url || row.Foto || row.Pengguna?.Foto || row.foto || row.pengguna?.foto)}
            name={v}
            className="w-11 h-11 rounded-xl border-2 border-white shadow-md transition-all group-hover/avatar:scale-110"
          />
          <div className="flex flex-col">
            <span className="font-bold text-slate-800 font-body tracking-tight text-[14px] leading-tight">
              {v ? v.toLowerCase().replace(/\b\w/g, s => s.toUpperCase()) : '—'}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-slate-400">
              <span className="material-symbols-outlined text-bku-primary/60" style={{ fontSize: '10px' }} >mail</span>
              <span className="text-[10px] font-semibold font-body tracking-widest lowercase">{row.EmailKampus || row.Pengguna?.email || row.Pengguna?.Email || '—'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'Fakultas',
      label: 'Fakultas',
      className: 'min-w-[180px] w-[180px]',
      render: v => <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tight font-body leading-snug block truncate" title={v?.Nama || v?.nama}>{v?.Nama || v?.nama || '—'}</span>
    },
    {
      key: 'ProgramStudi',
      label: 'Program Studi',
      className: 'min-w-[200px] w-[200px]',
      render: v => <span className="text-[12px] font-semibold text-slate-700 font-body tracking-tight leading-tight block truncate" title={v?.Nama || v?.nama}>{v?.Nama || v?.nama || '—'}</span>
    },
    {
      key: 'JenisKelamin',
      label: 'L/P',
      className: 'min-w-[60px] w-[60px] text-center',
      cellClassName: 'text-center',
      render: v => <span className="text-[12px] font-bold text-slate-500 font-body">{v === 'Laki-laki' || v === 'L' || v === 'LAKI-LAKI' ? 'L' : v === 'Perempuan' || v === 'P' || v === 'PEREMPUAN' ? 'P' : '—'}</span>
    },
    {
      key: 'Agama',
      label: 'Agama',
      className: 'min-w-[100px] w-[100px]',
      render: v => <span className="text-[12px] font-semibold text-slate-600 font-body truncate">{v || '—'}</span>
    },
    {
      key: 'TahunMasuk',
      label: 'Angkatan',
      className: 'min-w-[80px] w-[80px] text-center',
      cellClassName: 'text-center',
      render: v => <span className="text-[12px] font-bold text-slate-700 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 font-body">{v || '—'}</span>
    },
    {
      key: 'semester_sekarang',
      label: 'Smstr',
      className: 'min-w-[60px] w-[60px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => {
        const smtVal = v || row.SemesterSekarang || row.semester_sekarang || 0;
        const isLulus = row.StatusAkademik === 'Lulus' || row.StatusAkun === 'Lulus' || row.status_akademik === 'Lulus'
        return (
          <div className="flex flex-col items-center">
            <span className="font-bold text-slate-800 font-body text-sm leading-none">{smtVal > 0 ? smtVal : 8}</span>
            <span className="text-[8px] font-semibold text-slate-400 font-body uppercase tracking-widest mt-1">
              {isLulus ? 'LULUS' : 'ACTIVE'}
            </span>
          </div>
        )
      }
    },
    {
      key: 'StatusAkun',
      label: 'Status',
      className: 'min-w-[140px] w-[140px] text-center',
      cellClassName: 'text-center pr-4',
      render: (v, row) => {
        const status = row.StatusAkademik || row.StatusAkun || 'Aktif';
        return (
          <Badge className={cn('px-2.5 py-1 rounded-lg border text-[10px] font-semibold uppercase tracking-wider shadow-none', STATUS_STYLES[status] || STATUS_STYLES.DEFAULT)}>
            {status}
          </Badge>
        )
      }
    }
  ]

  const avgIpk = useMemo(() => {
    const activeWithIpk = students.filter(s => s.StatusAkun === 'Aktif' && (s.IpkTerakhir > 0 || s.ipk_terakhir > 0))
    if (activeWithIpk.length === 0) return 0
    const sum = activeWithIpk.reduce((acc, curr) => acc + (parseFloat(curr.IpkTerakhir || curr.ipk_terakhir) || 0), 0)
    return (sum / activeWithIpk.length).toFixed(2)
  }, [students])

  const totalSks = useMemo(() => {
    return students.reduce((acc, curr) => acc + (curr.TotalSKS || curr.total_sks || 0), 0)
  }, [students])

  const jalurMasukPopuler = useMemo(() => {
    const counts = {}
    students.forEach(s => {
      const j = s.JalurMasuk || s.jalur_masuk || 'Reguler'
      counts[j] = (counts[j] || 0) + 1
    })
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    return sorted.length > 0 ? sorted[0][0] : 'Reguler'
  }, [students])

  const enrollmentTrendData = dashboardStats.trend_data || []
  const facultyIpkData = dashboardStats.faculty_ipk || []
  const studentFacultyData = dashboardStats.faculty_data || []

  const studentStatusData = useMemo(() => {
    const counts = {
      'Aktif': dashboardStats.aktif || 0,
      'Cuti': dashboardStats.cuti || 0,
      'Lulus': dashboardStats.lulus || 0,
      'Keluar': dashboardStats.keluar || 0,
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [dashboardStats])

  const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444']

  return (
    <PageContent className="pb-12 font-body">
      <Toaster position="top-right" />

      {/* ── Page Header ─────────────────────────────────────────── */}
      <DashboardHero
        title="Direktori"
        highlightedTitle="Mahasiswa"
        subtitle="Database pusat manajemen akademik, sinkronisasi PDDikti cluster, dan verifikasi status aktif seluruh civitas akademika Universitas Bhakti Kencana."
        icon="groups"
        badges={[
          { label: 'Enrollment Governance', active: true }
        ]}
        actions={
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
              onClick={() => setIsSyncBiodataModalOpen(true)}
              variant="primary"
              icon={isSyncing ? "sync" : "cloud_sync"}
              disabled={isResetting || isSyncingIpk}
              className={`h-11 px-6 w-full sm:w-auto rounded-xl border-slate-200 text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer ${isSyncing ? 'animate-pulse' : ''}`}
            >
              {isSyncing ? `Syncing... (${syncProgress?.total_synced || 0})` : 'SEVIMA Sync'}
            </Button>
            <Button
              onClick={() => setIsSyncIpkModalOpen(true)}
              variant="outline"
              icon="school"
              disabled={isResetting || isSyncing}
              className={`h-11 px-6 w-full sm:w-auto rounded-xl border-slate-200 text-slate-600 text-[10px] font-semibold font-body uppercase tracking-widest transition-all active:scale-95 shadow-none justify-center cursor-pointer bg-white hover:bg-slate-50 ${isSyncingIpk ? 'animate-pulse' : ''}`}
            >
              {isSyncingIpk ? `Syncing IPK...` : 'Sinkron IPK'}
            </Button>
          </>
        }
      />

      {/* ── Tabs Layout ────────────────────────────────────────── */}
      <Tabs value={activeView} onValueChange={setActiveView} className="w-full space-y-6">
        <TabsList className="inline-flex flex-col sm:flex-row bg-[var(--theme-surface)] p-1.5 rounded-2xl w-full sm:w-auto border border-[var(--theme-border)] shadow-[inset_0_2px_4px_rgba(0,0,0,0.02)] gap-1">
          <TabsTrigger
            value="list"
            className="flex-1 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 data-[state=inactive]:text-[var(--theme-text-muted)] data-[state=inactive]:hover:bg-[var(--theme-surface-hover)] data-[state=inactive]:hover:text-[var(--theme-text)] data-[state=active]:bg-[var(--theme-primary)] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(0,35,111,0.25)] border-none"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span>
            Daftar Direktori
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex-1 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 data-[state=inactive]:text-[var(--theme-text-muted)] data-[state=inactive]:hover:bg-[var(--theme-surface-hover)] data-[state=inactive]:hover:text-[var(--theme-text)] data-[state=active]:bg-[var(--theme-primary)] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(0,35,111,0.25)] border-none"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>analytics</span>
            Analitik & Demografi
          </TabsTrigger>
          <TabsTrigger
            value="anomali"
            className="flex-1 px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer transition-all duration-300 data-[state=inactive]:text-[var(--theme-text-muted)] data-[state=inactive]:hover:bg-[var(--theme-error-light)] data-[state=inactive]:hover:text-[var(--theme-error)] data-[state=active]:bg-[var(--theme-error)] data-[state=active]:text-white data-[state=active]:shadow-[0_4px_12px_rgba(220,38,38,0.25)] border-none"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
            Data Anomali
            <span className="px-2 py-0.5 rounded-full text-[9px] font-black data-[state=active]:bg-white/20 data-[state=inactive]:bg-[var(--theme-border)]">
              {anomalies.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6 focus-visible:ring-0 focus-visible:outline-none">
          {/* ── Enriched Stats Grid (Core stats only, clean 4 column) ── */}
          <DashboardStatGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 xl:grid-cols-5">
            <PrimaryStatsCard
              className="bg-white"
              title="Total Data (SEVIMA)"
              value={dashboardStats.total_data}
              icon="database"
              colorTheme="primary"
              badgeText="Raw Data"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">cloud_download</span>}
            />

            <PrimaryStatsCard
              className="bg-white"
              title="Terverifikasi"
              value={dashboardStats.terverifikasi}
              icon="verified_user"
              colorTheme="success"
              badgeText="100% Valid"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">check_circle</span>}
            />

            <PrimaryStatsCard
              className={anomalies.length > 0 ? "bg-red-50 border border-red-100 cursor-pointer transition-transform hover:scale-[1.02]" : "bg-white cursor-pointer transition-transform hover:scale-[1.02]"}
              title="Data Anomali"
              value={anomalies.length}
              icon="warning"
              colorTheme={anomalies.length > 0 ? "danger" : "neutral"}
              badgeText="Karantina"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">error</span>}
              onClick={() => setActiveView('anomali')}
            />

            <PrimaryStatsCard
              className="bg-white"
              title="Status Aktif"
              value={dashboardStats.aktif}
              icon="school"
              colorTheme="info"
              badgeText="Active"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
            />

            <PrimaryStatsCard
              className="bg-white"
              title="IPK Rata-rata"
              value={(dashboardStats.avg_ipk || 0).toFixed(2)}
              icon="star"
              colorTheme="warning"
              badgeText="Avg GPA"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">analytics</span>}
            />
          </DashboardStatGrid>

          {/* ── Table Section ── */}
          <DataTable
            title="Laporan Mahasiswa Direktori"
            subtitle="Menampilkan daftar seluruh mahasiswa dari Pagu Kampus dan Kas Mandiri."
            serverPagination={true}
            manualFiltering={true}
            pageSize={pageSize}
            totalData={totalStudents}
            currentPage={currentPage}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onSearchChange={setSearchQuery}
            filterValues={filterValues}
            onFilterChange={(key, val) => {
              setFilterValues(prev => ({ ...prev, [key]: val }))
              setCurrentPage(1)
            }}
            columns={columns}
            data={students}
            loading={loading}
            searchPlaceholder="Search by NIM, Name, or Academic Status..."
            searchWidth="max-w-md"
            filters={[
              {
                key: 'StatusAkun', placeholder: 'Pilih Status', options: [
                  { label: 'Aktif', value: 'Aktif' },
                  { label: 'Selesai Pendidikan Non Gelar', value: 'Selesai Pendidikan Non Gelar' },
                  { label: 'Lulus', value: 'Lulus' },
                  { label: 'Cuti', value: 'Cuti' },
                  { label: 'Mutasi', value: 'Mutasi' },
                  { label: 'Dikeluarkan', value: 'Dikeluarkan' },
                  { label: 'Mengajukan pengunduran diri', value: 'Mengajukan pengunduran diri' },
                  { label: 'Putus Studi', value: 'Putus Studi' },
                  { label: 'Meninggal dunia', value: 'Meninggal dunia' },
                  { label: 'Non-Aktif', value: 'Non-Aktif' },
                  { label: 'Transfer', value: 'Transfer' },
                  { label: 'Sedang Double Degree', value: 'Sedang Double Degree' }
                ]
              },
              { key: 'FakultasID', placeholder: 'Pilih Fakultas', options: faculties.map(f => ({ label: f.Nama || f.nama, value: f.id || f.ID })) },
              { key: 'ProgramStudiID', placeholder: 'Pilih Program Studi', options: prodi.filter(p => !filterValues.FakultasID || filterValues.FakultasID === 'all' || String(p.FakultasID) === String(filterValues.FakultasID)).map(p => ({ label: p.Nama || p.nama, value: p.id || p.ID })) }
            ]}
            actions={(row) => (
              <div className="flex items-center gap-1.5">
                <Button onClick={() => handleOpenDetail(row)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-bku-primary hover:bg-bku-primary/5 rounded-lg transition-colors shadow-none cursor-pointer"><span className="material-symbols-outlined" style={{ fontSize: '15px' }} >visibility</span></Button>
                <Button onClick={() => handleOpenEdit(row)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-bku-primary hover:bg-bku-primary/5 rounded-lg transition-colors shadow-none cursor-pointer"><span className="material-symbols-outlined" style={{ fontSize: '15px' }} >edit</span></Button>
              </div>
            )}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6 focus-visible:ring-0 focus-visible:outline-none">
          {/* Top Bar Filter & Export */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] border border-slate-100">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
              <div className="w-full sm:w-[200px]">
                <SelectField
                  value={analyticsFilter.angkatan}
                  onValueChange={(val) => setAnalyticsFilter(prev => ({ ...prev, angkatan: val }))}
                  placeholder="Filter Angkatan"
                >
                  <SelectOption value="all">Semua Angkatan</SelectOption>
                  {Array.from({ length: 15 }, (_, i) => {
                    const yr = new Date().getFullYear() - i;
                    return <SelectOption key={yr} value={String(yr)}>Angkatan {yr}</SelectOption>;
                  })}
                </SelectField>
              </div>
            </div>
            <Button
              onClick={handleDownloadReport}
              disabled={isDownloadingPdf}
              variant="outline"
              icon={isDownloadingPdf ? "hourglass_empty" : "print"}
              className="w-full sm:w-auto h-11 px-5 rounded-xl border-slate-200 text-xs font-bold text-slate-700 shadow-none hover:bg-slate-50 transition-colors"
            >
              {isDownloadingPdf ? "Mengunduh..." : "Unduh Executive Report"}
            </Button>
          </div>

          {/* ── Full Demographics Stats Grid ── */}
          <DashboardStatGrid className="grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <PrimaryStatsCard
              className="bg-white"
              title="Total Mahasiswa"
              value={dashboardStats.terverifikasi}
              icon="group"
              colorTheme="primary"
              badgeText="All Enrolled"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">database</span>}
            />

            <PrimaryStatsCard
              className="bg-white"
              title="Total Lulus"
              value={dashboardStats.lulus}
              icon="trending_up"
              colorTheme="info"
              badgeText="Alumni"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">workspace_premium</span>}
            />

            <PrimaryStatsCard
              className="bg-white"
              title="Status Aktif"
              value={dashboardStats.aktif}
              icon="school"
              colorTheme="success"
              badgeText="Active"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
            />

            <PrimaryStatsCard
              className="bg-white"
              title="Status Lainnya"
              value={dashboardStats.terverifikasi - (dashboardStats.aktif + dashboardStats.lulus)}
              icon="person_off"
              colorTheme="error"
              badgeText="Cuti/Keluar"
              badgeIcon={<span className="material-symbols-outlined text-[12px]">warning</span>}
            />
          </DashboardStatGrid>

          {/* ── Secondary Demographics Stats Grid ── */}
          <DashboardStatGrid className="grid-cols-1 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-3">
            <SecondaryStatsCard
              className="bg-white"
              title="IPK Rata-rata"
              value={(dashboardStats.avg_ipk || 0).toFixed(2)}
              icon="star"
              colorTheme="warning"
              subtitle="Rata-rata IPK Mahasiswa"
            />

            <SecondaryStatsCard
              className="bg-white"
              title="Total SKS"
              value={totalSks.toLocaleString('id-ID')}
              icon="menu_book"
              colorTheme="primary"
              subtitle="Kumulatif SKS Diambil"
            />

            <SecondaryStatsCard
              className="bg-white"
              title="Jalur Terbanyak"
              value={jalurMasukPopuler}
              icon="shortcut"
              colorTheme="error"
              subtitle="Dominasi Jalur Masuk"
            />
          </DashboardStatGrid>

          {/* ── Enriched Visual Charts Grid ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* Chart 2: Composed Bar + Line - Tren Angkatan */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full border border-slate-100">
              <div className="flex items-center gap-3 mb-3 shrink-0">
                <div className="w-8 h-8 bg-indigo-50 rounded-lg flex justify-center items-center text-indigo-600 shadow-sm border border-indigo-500/5">
                  <span className="material-symbols-outlined text-sm">analytics</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 font-body leading-tight">Tren Angkatan</h4>
                  <p className="text-[9px] text-slate-400 font-medium font-body mt-0.5">Pertumbuhan jumlah mahasiswa baru per angkatan</p>
                </div>
              </div>

              <div className="flex-1 w-full min-h-[220px] mt-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <ComposedChart data={enrollmentTrendData} margin={{ top: 15, right: 20, left: 15, bottom: 25 }}>
                    <defs>
                      <linearGradient id="composedBarGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--theme-primary)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="var(--theme-primary)" stopOpacity={0.05} />
                      </linearGradient>
                      <linearGradient id="composedLineGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#818cf8" />
                        <stop offset="50%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#4f46e5" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(226, 232, 240, 0.3)" />
                    <XAxis dataKey="name" padding={{ left: 18, right: 18 }} tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b', fontFamily: 'var(--theme-font-body)' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 600, fill: '#64748b', fontFamily: 'var(--theme-font-body)' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 600, color: '#64748b', fontFamily: 'var(--theme-font-body)' }} verticalAlign="top" height={36} iconType="circle" />
                    <Area type="monotone" dataKey="value" name="Total Mahasiswa (Daftar)" fill="url(#composedBarGrad)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#6366f1' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#6366f1' }} />
                    <Line type="monotone" dataKey="aktif" name="Mahasiswa Aktif" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#10b981' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#10b981' }} />
                    <Line type="monotone" dataKey="lulus" name="Alumni / Lulus" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#ffffff', stroke: '#3b82f6' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#3b82f6' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Demografi: Status Mahasiswa */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full border border-slate-100">
              <div className="flex items-center gap-3 mb-3 shrink-0">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex justify-center items-center text-green-600 shadow-sm border border-green-500/5">
                  <span className="material-symbols-outlined text-sm">school</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 font-body leading-tight">Status Mahasiswa</h4>
                  <p className="text-[9px] text-slate-400 font-medium font-body mt-0.5">Komposisi status akademik terkini</p>
                </div>
              </div>
              <div className="relative flex-1 min-h-[160px] w-full mt-2 flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-4 text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight font-body text-center max-w-[90px] break-words">
                    Total
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-800 font-body mt-1 tracking-tight leading-none">
                    {(dashboardStats.total_data || 0).toLocaleString('id-ID')}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={(dashboardStats.status_dist && dashboardStats.status_dist.length > 0) ? dashboardStats.status_dist : [
                        { name: 'Aktif', count: dashboardStats.aktif || 0 },
                        { name: 'Cuti', count: dashboardStats.cuti || 0 },
                        { name: 'Lulus', count: dashboardStats.lulus || 0 },
                        { name: 'Keluar', count: dashboardStats.keluar || 0 },
                      ].filter(d => d.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {((dashboardStats.status_dist && dashboardStats.status_dist.length > 0) ? dashboardStats.status_dist : [
                        { name: 'Aktif', count: dashboardStats.aktif || 0 },
                        { name: 'Cuti', count: dashboardStats.cuti || 0 },
                        { name: 'Lulus', count: dashboardStats.lulus || 0 },
                        { name: 'Keluar', count: dashboardStats.keluar || 0 },
                      ].filter(d => d.count > 0)).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="cursor-pointer transition-all duration-300 hover:opacity-90 outline-none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-3 shrink-0">
                {((dashboardStats.status_dist && dashboardStats.status_dist.length > 0) ? dashboardStats.status_dist : [
                  { name: 'Aktif', count: dashboardStats.aktif || 0 },
                  { name: 'Cuti', count: dashboardStats.cuti || 0 },
                  { name: 'Lulus', count: dashboardStats.lulus || 0 },
                  { name: 'Keluar', count: dashboardStats.keluar || 0 },
                ].filter(d => d.count > 0)).map((entry, idx) => {
                  const total = dashboardStats.total_data || 1;
                  const percent = ((entry.count / total) * 100).toFixed(1);
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-[11px] font-body">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="font-semibold text-slate-600 truncate">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="font-bold text-slate-800 font-body">{entry.count.toLocaleString('id-ID')}</span>
                        <span className="text-[9px] text-slate-400 font-medium font-body">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Chart 1: Sebaran Mahasiswa per Fakultas (Donut Chart) */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full border border-slate-100">
              <div className="flex items-center gap-3 mb-3 shrink-0">
                <div className="w-8 h-8 bg-bku-primary/10 rounded-lg flex justify-center items-center text-bku-primary shadow-sm border border-bku-primary/5">
                  <span className="material-symbols-outlined text-bku-primary text-sm">pie_chart</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 font-body leading-tight">Sebaran Mahasiswa</h4>
                  <p className="text-[9px] text-slate-400 font-medium font-body mt-0.5">Komposisi sebaran mahasiswa per fakultas</p>
                </div>
              </div>

              <div className="relative flex-1 min-h-[160px] w-full mt-2 flex items-center justify-center">
                {/* Absolute Center Stats */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-4 text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight font-body text-center max-w-[90px] break-words">
                    {hoveredFaculty ? hoveredFaculty.name : "Total Mahasiswa"}
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-800 font-body mt-1 tracking-tight leading-none">
                    {(hoveredFaculty ? hoveredFaculty.value : (dashboardStats.total_data || 0)).toLocaleString('id-ID')}
                  </span>
                  {hoveredFaculty && (
                    <span className="text-[8px] font-semibold text-slate-400 mt-1 font-body leading-none">
                      {((hoveredFaculty.value / (dashboardStats.total_data || 1)) * 100).toFixed(1)}%
                    </span>
                  )}
                </div>

                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={studentFacultyData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                      onMouseEnter={(data) => {
                        setHoveredFaculty({ name: data.name, value: data.count });
                      }}
                      onMouseLeave={() => {
                        setHoveredFaculty(null);
                      }}
                    >
                      {studentFacultyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} className="cursor-pointer transition-all duration-300 hover:opacity-90 outline-none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend Section */}
              <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-3 shrink-0">
                {studentFacultyData.map((entry, idx) => {
                  const total = dashboardStats.total_data || 1;
                  const percent = ((entry.count / total) * 100).toFixed(1);
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-[11px] font-body">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="font-semibold text-slate-600 truncate">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="font-bold text-slate-800 font-body">{entry.count.toLocaleString('id-ID')}</span>
                        <span className="text-[9px] text-slate-400 font-medium font-body">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Demografi: Jenis Kelamin */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full border border-slate-100">
              <div className="flex items-center gap-3 mb-3 shrink-0">
                <div className="w-8 h-8 bg-pink-50 rounded-lg flex justify-center items-center text-pink-600 shadow-sm border border-pink-500/5">
                  <span className="material-symbols-outlined text-sm">wc</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 font-body leading-tight">Jenis Kelamin</h4>
                  <p className="text-[9px] text-slate-400 font-medium font-body mt-0.5">Komposisi Laki-laki & Perempuan</p>
                </div>
              </div>
              <div className="relative flex-1 min-h-[160px] w-full mt-2 flex items-center justify-center">
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10 px-4 text-center">
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-tight font-body text-center max-w-[90px] break-words">
                    Total
                  </span>
                  <span className="text-lg sm:text-xl font-black text-slate-800 font-body mt-1 tracking-tight leading-none">
                    {((dashboardStats.laki_laki || 0) + (dashboardStats.perempuan || 0)).toLocaleString('id-ID')}
                  </span>
                </div>
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Laki-laki', count: dashboardStats.laki_laki || 0, fill: '#3b82f6' },
                        { name: 'Perempuan', count: dashboardStats.perempuan || 0, fill: '#ec4899' },
                      ].filter(d => d.count > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="count"
                    >
                      {[
                        { name: 'Laki-laki', count: dashboardStats.laki_laki || 0, fill: '#3b82f6' },
                        { name: 'Perempuan', count: dashboardStats.perempuan || 0, fill: '#ec4899' },
                      ].filter(d => d.count > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} className="cursor-pointer transition-all duration-300 hover:opacity-90 outline-none" />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-3 shrink-0">
                {[
                  { name: 'Laki-laki', count: dashboardStats.laki_laki || 0, fill: '#3b82f6' },
                  { name: 'Perempuan', count: dashboardStats.perempuan || 0, fill: '#ec4899' },
                ].filter(d => d.count > 0).map((entry) => {
                  const total = (dashboardStats.laki_laki || 0) + (dashboardStats.perempuan || 0) || 1;
                  const percent = ((entry.count / total) * 100).toFixed(1);
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-[11px] font-body">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.fill }} />
                        <span className="font-semibold text-slate-600 truncate">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="font-bold text-slate-800 font-body">{entry.count.toLocaleString('id-ID')}</span>
                        <span className="text-[9px] text-slate-400 font-medium font-body">({percent}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* Chart 3: Rerata IPK per Fakultas (Radar Chart) */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.05)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-between h-full border border-slate-100">
              <div className="flex items-center gap-3 mb-3 shrink-0">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex justify-center items-center text-amber-600 shadow-sm border border-amber-550/5">
                  <span className="material-symbols-outlined text-sm">stars</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 font-body leading-tight">Performa Akademik</h4>
                  <p className="text-[9px] text-slate-400 font-medium font-body mt-0.5">Perbandingan rata-rata IPK per fakultas</p>
                </div>
              </div>

              <div className="relative flex-1 min-h-[160px] w-full mt-2 flex items-center justify-center">
                {facultyIpkData && facultyIpkData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                    <BarChart data={facultyIpkData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" domain={[0, 4.0]} tick={{ fontSize: 9, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 9, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="Rerata IPK" fill="#f59e0b" radius={[0, 4, 4, 0]} barSize={16}>
                        {facultyIpkData.map((entry, index) => {
                          const donutIndex = studentFacultyData.findIndex(d => d.name === entry.name);
                          const colorIndex = donutIndex !== -1 ? donutIndex : index;
                          return <Cell key={`cell-${index}`} fill={PIE_COLORS[colorIndex % PIE_COLORS.length]} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                    <span className="material-symbols-outlined text-3xl opacity-40">query_stats</span>
                    <p className="text-[10px] font-medium font-body text-center px-4">Belum ada data IPK pada angkatan ini</p>
                  </div>
                )}
              </div>

              {/* Legend Section */}
              <div className="mt-4 flex flex-col gap-1.5 border-t border-slate-100 pt-3 shrink-0">
                {facultyIpkData.map((entry, idx) => {
                  const donutIndex = studentFacultyData.findIndex(d => d.name === entry.name);
                  const colorIndex = donutIndex !== -1 ? donutIndex : idx;
                  return (
                    <div key={entry.name} className="flex items-center justify-between text-[11px] font-body">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[colorIndex % PIE_COLORS.length] }} />
                        <span className="font-semibold text-slate-600 truncate">{entry.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 pl-2">
                        <span className="font-bold text-slate-800 font-body">{Number(entry['Rerata IPK']).toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wilayah */}
            <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex justify-center items-center text-blue-600">
                  <span className="material-symbols-outlined text-sm">map</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800 font-body leading-tight">Wilayah</h4>
                  <p className="text-[9px] text-slate-400 font-medium font-body mt-0.5">Heatmap & asal daerah pendaftar terbanyak</p>
                </div>
                <Button
                  onClick={() => window.open('/app/akademik/mahasiswa/analytics/regions', '_blank')}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] px-3 border-slate-200 text-slate-600 shadow-none font-bold font-body"
                >
                  Lihat Detail
                </Button>
              </div>
              <div className="flex-1 flex flex-col gap-4">
                {/* Heatmap Area (Leaflet) */}
                <div className="w-full h-[360px] bg-slate-50/50 rounded-xl overflow-hidden border border-slate-100 relative z-0">
                  {dashboardStats.top_kota && dashboardStats.top_kota.length > 0 ? (
                    <MapContainer
                      center={[-2.5, 118.0]}
                      zoom={5}
                      scrollWheelZoom={false}
                      className="w-full h-full z-0"
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                      />
                      {dashboardStats.top_kota.map((item, idx) => {
                        const coords = CITY_COORDINATES[item.name.toUpperCase()];
                        if (!coords) return null;

                        // Calculate radius based on count (min 8, max 30)
                        const maxCount = dashboardStats.top_kota[0]?.count || 1;
                        const radius = Math.max(8, (item.count / maxCount) * 25);

                        return (
                          <CircleMarker
                            key={idx}
                            center={coords}
                            radius={radius}
                            fillColor="#f5a746"
                            color="#f5a746"
                            weight={1}
                            opacity={0.8}
                            fillOpacity={0.5}
                          >
                            <Popup>
                              <div className="text-center font-body">
                                <p className="font-bold text-xs">{item.name}</p>
                                <p className="text-[10px] text-slate-500">{item.count} Mahasiswa</p>
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}
                    </MapContainer>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-xs text-slate-400 font-medium font-body">Data tidak tersedia</span>
                    </div>
                  )}
                </div>

                {/* Top 10 List */}
                <div className="space-y-2 mt-2">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Top 10 Wilayah</h5>
                  {(dashboardStats.top_kota || []).slice(0, 10).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-700">{idx + 1}. {item.name}</span>
                      <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{item.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 10 Asal Sekolah */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl shadow-[0_2px_12px_-3px_rgba(0,0,0,0.02),0_4px_16px_-8px_rgba(0,0,0,0.03)] border border-slate-100 flex flex-col h-full">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex justify-center items-center text-emerald-600">
                  <span className="material-symbols-outlined text-sm">location_city</span>
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800 font-body leading-tight">Top 10 Asal Sekolah</h4>
                  <p className="text-[9px] text-slate-400 font-medium font-body mt-0.5">Sekolah penyumbang mahasiswa terbanyak</p>
                </div>
                <Button
                  onClick={() => window.open('/app/akademik/mahasiswa/analytics/schools', '_blank')}
                  variant="outline"
                  size="sm"
                  className="h-7 text-[10px] px-3 border-slate-200 text-slate-600 shadow-none font-bold font-body"
                >
                  Lihat Detail
                </Button>
              </div>
              <div className="flex-1 flex flex-col pt-2">
                <div className="space-y-4">
                  {(dashboardStats.top_sekolah || []).slice(0, 10).map((item, idx, arr) => {
                    const maxCount = arr[0]?.count || 1;
                    const percentage = (item.count / maxCount) * 100;
                    return (
                      <div key={idx} className="relative group">
                        <div className="flex items-end justify-between mb-1.5 gap-4">
                          <span className="text-[11px] font-semibold text-slate-700 truncate group-hover:text-emerald-600 transition-colors" title={item.name}>
                            {idx + 1}. {item.name}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md whitespace-nowrap group-hover:bg-emerald-100 transition-colors">
                            {item.count}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100/80 rounded-full h-[6px] overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full transition-all duration-1000 ease-out"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

        </TabsContent>

        <TabsContent value="anomali" className="space-y-6 focus-visible:ring-0 focus-visible:outline-none">
          <div className="bg-white rounded-xl border border-red-100 p-6 shadow-sm shadow-slate-100/50">
            <div className="mb-6 flex items-center gap-3 text-red-600">
              <span className="material-symbols-outlined text-3xl">warning</span>
              <div>
                <h3 className="text-lg font-bold font-display">Karantina Data Anomali</h3>
                <p className="text-sm text-slate-500 font-body">
                  Data berikut tidak dimasukkan ke dalam database utama karena memiliki anomali/error.
                  Silakan perbaiki data ini di portal SEVIMA agar dapat tertarik pada sinkronisasi berikutnya.
                </p>
              </div>
            </div>

            <DataTable
              title="Daftar Data Anomali"
              subtitle="Menampilkan data yang ditolak sistem karena anomali."
              columns={[
                { label: 'ID SEVIMA', key: 'id_sevima', className: 'font-mono text-xs text-slate-500' },
                { label: 'NIM', key: 'nim', className: 'font-bold text-slate-700' },
                { label: 'NAMA MAHASISWA', key: 'nama' },
                { label: 'PRODI (SEVIMA)', key: 'prodi' },
                {
                  label: 'ALASAN ERROR / PENOLAKAN',
                  key: 'alasan_error',
                  render: (val) => <span className="text-red-600 text-xs font-semibold">{formatErrorMsg(val)}</span>
                }
              ]}
              data={anomalies}
              loading={loading}
              searchPlaceholder="Cari berdasarkan NIM atau Nama..."
              searchWidth="max-w-md"
              toolbarActions={
                <button
                  type="button"
                  onClick={handleExportAnomaliCsv}
                  className="h-9 px-3.5 rounded-lg bg-green-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-green-700 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  Export CSV
                </button>
              }
              actions={(row) => (
                <div className="flex gap-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleSyncAnomali(row); }}
                    className="p-1.5 rounded-md text-blue-600 hover:bg-blue-50 transition-colors"
                    title="Sync Ulang dari SEVIMA"
                  >
                    <span className="material-symbols-outlined text-[16px]">sync</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteAnomali(row); }}
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
                    title="Hapus Permanen dari Karantina"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              )}
            />
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Detail Profile Modal ─────────────────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Profil Mahasiswa"
        subtitle="Detail Akademik & Layanan"
        icon="person"
        maxWidth="max-w-4xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsDetailOpen(false)}>Tutup</ModalCancelButton>
            <ModalSaveButton onClick={() => { setIsDetailOpen(false); handleOpenEdit(selected) }} icon="edit">Edit Profil</ModalSaveButton>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col">
            <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm mx-1">
              <StudentAvatar
                src={getCleanImageUrl(selected.FotoURL || selected.foto_url || selected.Foto || selected.Pengguna?.Foto || selected.foto || selected.pengguna?.foto)}
                name={selected.Nama}
                className="w-16 h-16 rounded-2xl border border-slate-200/60 shadow-sm bg-slate-50"
              />
              <div className="space-y-1">
                <h2 className="text-lg sm:text-xl font-bold text-slate-800">
                  {selected.Nama ? selected.Nama.toUpperCase() : '—'}
                </h2>
                <div className="flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-400">
                  <span className="font-bold tracking-wider text-slate-500 font-body">{selected.NIM}</span>
                  <div className="hidden sm:block w-1.5 h-1.5 rounded-full bg-slate-200" />
                  <span className="font-bold uppercase tracking-wider text-slate-500 font-body">{selected.ProgramStudi?.Nama || selected.ProgramStudi?.nama || '—'}</span>
                </div>
              </div>
              <div className="sm:ml-auto shrink-0 flex items-center gap-2">
                <Badge className={cn("px-3 py-1 rounded-lg border-none text-[10px] font-bold uppercase tracking-widest font-body", STATUS_STYLES[selected.StatusAkun] || STATUS_STYLES.DEFAULT)}>
                  {selected.StatusAkun}
                </Badge>
              </div>
            </div>

            {/* Profile Content Section */}
            <div className="px-1 relative">

              {/* Tabs Implementation */}
              <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); fetchTabContext(val, selected.id || selected.ID) }} className="w-full">
                <TabsList className="w-full flex border-b border-slate-200 bg-slate-50/50 p-1 rounded-none justify-start overflow-x-auto gap-2 pb-2">
                  <TabsTrigger value="profile" className="px-4 py-2 text-xs font-bold font-body uppercase tracking-wider gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>person</span>
                    Profile
                  </TabsTrigger>
                  <TabsTrigger value="academic" className="px-4 py-2 text-xs font-bold font-body uppercase tracking-wider gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>assignment</span>
                    KRS & Transkrip
                  </TabsTrigger>
                  <TabsTrigger value="perwalian" className="px-4 py-2 text-xs font-bold font-body uppercase tracking-wider gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>supervisor_account</span>
                    Perwalian & Bimbingan
                  </TabsTrigger>
                  <TabsTrigger value="kencana" className="px-4 py-2 text-xs font-bold font-body uppercase tracking-wider gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>school</span>
                    PKKMB (Kencana)
                  </TabsTrigger>
                  <TabsTrigger value="counseling_health" className="px-4 py-2 text-xs font-bold font-body uppercase tracking-wider gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>psychology</span>
                    Layanan (Konseling & Sehat)
                  </TabsTrigger>
                  <TabsTrigger value="akademik_beasiswa" className="px-4 py-2 text-xs font-bold font-body uppercase tracking-wider gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>payments</span>
                    Beasiswa & Prestasi
                  </TabsTrigger>
                  <TabsTrigger value="organisasi_aspirasi" className="px-4 py-2 text-xs font-bold font-body uppercase tracking-wider gap-1.5 cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>groups</span>
                    Organisasi & Aspirasi
                  </TabsTrigger>
                </TabsList>

                <div className="py-6 max-h-[50vh] overflow-y-auto no-scrollbar">
                  <TabsContent value="profile" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Kolom 1: Informasi Akademik Dasar */}
                      <div className="space-y-4 border-b md:border-b-0 md:border-r border-slate-100/80 pb-4 md:pb-0 md:pr-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-bku-primary mb-3">Data Akademik</h4>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Fakultas & Prodi</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.Fakultas?.Nama || '—'}</p>
                          <p className="text-[11px] font-semibold font-body text-slate-500 leading-snug">{selected.ProgramStudi?.Nama || '—'}</p>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Angkatan & Semester</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">
                            Angkatan {selected.TahunMasuk || selected.tahun_masuk || '—'} <span className="text-slate-300 mx-1">•</span>
                            {(() => {
                              const status = selected.StatusAkademik || selected.StatusAkun || selected.status_akademik || selected.status_akun || '';
                              const st = status.toLowerCase();
                              const smt = selected.SemesterSekarang || selected.semester_sekarang || 0;

                              if (st === 'lulus') return <span className="text-blue-600 font-bold">Telah Lulus</span>;
                              if (st === 'dikeluarkan' || st === 'putus studi') return <span className="text-red-600 font-bold">{status}</span>;
                              if (st === 'cuti') return <span className="text-amber-600 font-bold">Sedang Cuti</span>;
                              if (st === 'mengajukan pengunduran diri') return <span className="text-rose-600 font-bold">Mengundurkan Diri</span>;
                              if (st === 'meninggal dunia') return <span className="text-slate-500 font-bold">Meninggal Dunia</span>;
                              if (st === 'mutasi' || st === 'transfer') return <span className="text-indigo-600 font-bold">{status}</span>;
                              if (st === 'selesai pendidikan non gelar') return <span className="text-purple-600 font-bold">{status}</span>;

                              return `Smt ${smt > 0 ? smt : 'Awal'}`;
                            })()}
                          </p>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Dosen Pembimbing Akademik</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.DosenPA?.Nama || selected.DosenPA?.nama || 'Belum diatur'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="group">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">IPK</p>
                            <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">
                              {selected.IPK !== undefined && selected.IPK !== null ? Number(selected.IPK).toFixed(2) : '—'}
                            </p>
                          </div>
                          <div className="group">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Total SKS</p>
                            <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">
                              {selected.TotalSKS !== undefined && selected.TotalSKS !== null ? selected.TotalSKS : '—'}
                            </p>
                          </div>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Jalur Masuk & Asal Sekolah</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.JalurMasuk || selected.jalur_masuk || '—'}</p>
                          <p className="text-[11px] font-semibold font-body text-slate-500 leading-snug">{selected.AsalSekolah || selected.asal_sekolah || '—'}</p>
                        </div>
                      </div>

                      {/* Kolom 2: Biodata Pribadi */}
                      <div className="space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100/80 pb-4 lg:pb-0 lg:pr-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-amber-500 mb-3">Biodata Pribadi</h4>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Tempat & Tanggal Lahir</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">
                            {selected.TempatLahir || selected.tempat_lahir || '—'}, {selected.TanggalLahir || selected.tanggal_lahir ? new Date(selected.TanggalLahir || selected.tanggal_lahir).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="group">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Jenis Kelamin</p>
                            <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.JenisKelamin || selected.jenis_kelamin || '—'}</p>
                          </div>
                          <div className="group">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Agama</p>
                            <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.Agama || selected.agama || '—'}</p>
                          </div>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">NIK / NISN</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.NIK || selected.nik || '—'}</p>
                          <p className="text-[10px] font-semibold font-body text-slate-500 leading-snug">{selected.NISN || selected.nisn || '—'}</p>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Kontak (HP/Email)</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.NoHP || selected.no_hp || selected.Telepon || selected.telepon || '—'}</p>
                          <p className="text-[10px] font-semibold font-body text-slate-500 leading-snug truncate" title={selected.EmailPersonal || selected.EmailKampus || selected.Pengguna?.email || selected.Pengguna?.Email}>{selected.EmailPersonal || selected.email_personal || selected.EmailKampus || selected.email_kampus || selected.Pengguna?.email || selected.Pengguna?.Email || '—'}</p>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Alamat & Tempat Tinggal</p>
                          <p className="text-[12px] font-medium font-body text-slate-600 leading-tight mb-2">
                            {selected.AlamatDomisili || selected.alamat_domisili || selected.Alamat || selected.alamat || 'Alamat jalan belum diatur'}
                          </p>

                          <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-2">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kelurahan / Desa</p>
                              <p className="text-[11px] font-semibold text-slate-700">{selected.DesaDomisili || selected.desa_domisili || selected.Desa || selected.desa || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kecamatan</p>
                              <p className="text-[11px] font-semibold text-slate-700">{selected.KecamatanDomisili || selected.kecamatan_domisili || selected.Kecamatan || selected.kecamatan || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Dusun</p>
                              <p className="text-[11px] font-semibold text-slate-700">{selected.DusunDomisili || selected.dusun_domisili || selected.Dusun || selected.dusun || '—'}</p>
                            </div>
                            <div className="flex gap-4">
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RT</p>
                                <p className="text-[11px] font-semibold text-slate-700">{selected.RTDomisili || selected.rt_domisili || selected.RT || selected.rt || '—'}</p>
                              </div>
                              <div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">RW</p>
                                <p className="text-[11px] font-semibold text-slate-700">{selected.RWDomisili || selected.rw_domisili || selected.RW || selected.rw || '—'}</p>
                              </div>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Kode Pos</p>
                              <p className="text-[11px] font-semibold text-slate-700">{selected.KodePosDomisili || selected.kode_pos_domisili || selected.KodePos || selected.kode_pos || '—'}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Jenis Tinggal</p>
                              <p className="text-[11px] font-semibold text-slate-700">{selected.JenisTinggal || selected.jenis_tinggal || '—'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Penerima KPS</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">
                            {selected.NomorKPS || selected.nomor_kps ? `Ya (${selected.NomorKPS || selected.nomor_kps})` : 'Tidak / Belum diatur'}
                          </p>
                        </div>
                      </div>

                      {/* Kolom 3: Data Keluarga */}
                      <div className="space-y-4">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-500 mb-3">Data Keluarga</h4>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Data Ayah Kandung</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.NamaAyah || selected.nama_ayah || selected.NamaOrangTua || selected.nama_orang_tua || '—'}</p>
                          <p className="text-[11px] font-medium font-body text-slate-500 leading-snug">{selected.PekerjaanAyah || selected.pekerjaan_ayah || 'Pekerjaan tidak diketahui'}</p>
                        </div>

                        <div className="group">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Data Ibu Kandung</p>
                          <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.NamaIbuKandung || selected.nama_ibu_kandung || '—'}</p>
                          <p className="text-[11px] font-medium font-body text-slate-500 leading-snug">{selected.PekerjaanIbu || selected.pekerjaan_ibu || 'Pekerjaan tidak diketahui'}</p>
                        </div>

                        {(selected.NamaWali || selected.nama_wali) && (
                          <div className="group">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 font-body">Data Wali</p>
                            <p className="text-[13px] font-semibold font-body text-slate-700 leading-snug">{selected.NamaWali || selected.nama_wali}</p>
                          </div>
                        )}

                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="academic" className="space-y-6">
                    {/* KRS Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-bku-primary flex items-center gap-1.5 font-body">
                          <span className="material-symbols-outlined text-[16px]">assignment</span>
                          Kartu Rencana Studi (KRS)
                        </h4>
                        {sevimaHealth === 'offline' ? (
                          <span className="text-[9px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2 py-0.5 rounded-lg border border-red-100 font-body">
                            SEVIMA OFFLINE
                          </span>
                        ) : (
                          <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-body">
                            SEVIMA Live
                          </span>
                        )}
                      </div>

                      {loadingAcademic ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-400 font-semibold font-body">
                          <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: 16 }}>sync</span>
                          Menghubungi SEVIMA...
                        </div>
                      ) : !academicData?.krs || academicData.krs.length === 0 ? (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400 font-semibold font-body">
                          Belum ada mata kuliah aktif di KRS periode ini.
                        </div>
                      ) : (
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                              <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-[9px] font-body">Mata Kuliah</th>
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-center text-[9px] w-12 font-body">SKS</th>
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-[9px] w-20 font-body">Kelas</th>
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-[9px] font-body">Dosen</th>
                                </tr>
                              </thead>
                              <tbody>
                                {academicData.krs.map((item, idx) => (
                                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors">
                                    <td className="p-3">
                                      <span className="font-bold text-slate-700 block font-body">{item.nama_mata_kuliah || item.nama_mk}</span>
                                      <span className="text-[9px] text-slate-400 font-mono font-bold">{item.kode_mata_kuliah || item.kode_mk}</span>
                                    </td>
                                    <td className="p-3 text-center font-mono font-bold text-slate-700">{item.sks_mata_kuliah || item.sks || '—'}</td>
                                    <td className="p-3 text-slate-500 font-semibold font-body">{item.nama_kelas || item.kelas || '—'}</td>
                                    <td className="p-3 text-slate-500 font-semibold font-body truncate max-w-[180px]" title={item.nama_dosen || item.dosen}>{item.nama_dosen || item.dosen || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Transkrip Section */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[11px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5 font-body">
                          <span className="material-symbols-outlined text-[16px]">history_edu</span>
                          Transkrip Nilai
                        </h4>
                        <div className="flex gap-1.5">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/40 font-body">
                            IPK: {academicData?.ipk !== undefined && academicData?.ipk !== null ? Number(academicData.ipk).toFixed(2) : '0.00'}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-600 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/40 font-body">
                            SKS: {academicData?.total_sks !== undefined && academicData?.total_sks !== null ? academicData.total_sks : 0}
                          </span>
                        </div>
                      </div>

                      {loadingAcademic ? (
                        <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-400 font-semibold font-body">
                          <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: 16 }}>sync</span>
                          Menghubungi SEVIMA...
                        </div>
                      ) : !academicData?.transkrip || academicData.transkrip.length === 0 ? (
                        <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-6 text-center text-xs text-slate-400 font-semibold font-body">
                          Belum ada riwayat nilai transkrip dari SEVIMA.
                        </div>
                      ) : (
                        <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white shadow-sm">
                          <div className="overflow-x-auto no-scrollbar">
                            <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                              <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-[9px] font-body">Mata Kuliah</th>
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-center text-[9px] w-12 font-body">SKS</th>
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-center text-[9px] w-20 font-body">Nilai</th>
                                  <th className="p-3 font-bold text-slate-400 uppercase tracking-wider text-center text-[9px] w-20 font-body">Status</th>
                                </tr>
                              </thead>
                              <tbody>
                                {academicData.transkrip.map((item, idx) => {
                                  const isLulus = item.is_lulus === '1' || item.is_lulus === 1 || item.is_lulus === true;
                                  return (
                                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors">
                                      <td className="p-3">
                                        <span className="font-bold text-slate-700 block font-body">{item.nama_mata_kuliah}</span>
                                        <span className="text-[9px] text-slate-400 font-mono font-bold">{item.kode_mata_kuliah}</span>
                                      </td>
                                      <td className="p-3 text-center font-mono font-bold text-slate-700">{item.sks_mata_kuliah}</td>
                                      <td className="p-3 text-center">
                                        <span className="font-extrabold text-slate-850 block font-body">{item.nilai_huruf || '—'}</span>
                                        <span className="text-[9px] text-slate-400 font-mono font-bold">({item.nilai_angka || '0.00'})</span>
                                      </td>
                                      <td className="p-3 text-center">
                                        <span className={cn(
                                          "inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                          isLulus ? "bg-emerald-50 text-emerald-600 border border-emerald-100/60" : "bg-rose-50 text-rose-500 border border-rose-100/60"
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
                  </TabsContent>

                  <TabsContent value="perwalian" className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-black uppercase tracking-widest text-bku-primary flex items-center gap-1.5 font-body">
                        <span className="material-symbols-outlined text-[16px]">supervisor_account</span>
                        Riwayat Perwalian & Bimbingan
                      </h4>
                      <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 font-body">
                        SEVIMA Live
                      </span>
                    </div>

                    {loadingPerwalian ? (
                      <div className="flex items-center justify-center py-12 gap-2 text-xs text-slate-400 font-semibold font-body">
                        <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: 16 }}>sync</span>
                        Menghubungi SEVIMA...
                      </div>
                    ) : !perwalianData || perwalianData.length === 0 ? (
                      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-8 text-center text-xs text-slate-400 font-semibold font-body">
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
                                className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md"
                              >
                                {/* Header Card */}
                                <div
                                  onClick={() => togglePeriod(pId)}
                                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer bg-slate-50/40 hover:bg-slate-50/80 transition-colors select-none"
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_today</span>
                                    </div>
                                    <div>
                                      <h5 className="text-xs font-bold text-slate-700 font-body">
                                        {formatPeriodeName(pId)}
                                      </h5>
                                      <p className="text-[10px] text-slate-400 font-bold font-body">
                                        Semester {attr.semester_mahasiswa || '—'} <span className="text-slate-200 mx-1">•</span> Status: <span className="text-blue-600 font-extrabold">{attr.status_mahasiswa || '—'}</span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-4 ml-12 sm:ml-0">
                                    {/* Quick Stats */}
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-body">
                                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-250/20 font-bold">
                                        IPS: {attr.ips || '0.00'}
                                      </span>
                                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border border-slate-250/20 font-bold">
                                        SKS: {attr.sks_semester || '0'}
                                      </span>
                                    </div>

                                    {/* Arrow Icon */}
                                    <span
                                      className={cn(
                                        "material-symbols-outlined transition-transform duration-300 text-slate-400",
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
                                  <div className="p-4 border-t border-slate-100 bg-white space-y-4">
                                    {/* Advisor & Bimbingan Info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                                      <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-body">Dosen Pembimbing Akademik</p>
                                        <p className="text-xs font-bold text-slate-700 font-body">{attr.dosen_pembimbing || '—'}</p>
                                        {attr.nidn_dosen_pembimbing && (
                                          <p className="text-[9px] text-slate-400 font-mono font-semibold">NIDN {attr.nidn_dosen_pembimbing}</p>
                                        )}
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-body">Catatan Bimbingan</p>
                                        <p className="text-xs font-semibold text-slate-600 italic font-body">
                                          {attr.keterangan ? `"${attr.keterangan}"` : 'Belum ada catatan bimbingan'}
                                        </p>
                                        {attr.tanggal_perwalian && (
                                          <p className="text-[9px] text-slate-400 font-mono font-semibold">
                                            Tanggal: {new Date(attr.tanggal_perwalian).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                          </p>
                                        )}
                                      </div>
                                    </div>

                                    {/* KRS Status */}
                                    <div className="flex flex-wrap items-center gap-3 py-1">
                                      <p className="text-[9px] font-bold text-slate-450 uppercase tracking-wider mr-1 font-body">Status KRS:</p>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                        attr.is_krs_terisi === '1' ? "bg-emerald-50 text-emerald-600 border-emerald-100/60" : "bg-slate-50 text-slate-400 border-slate-200/50"
                                      )}>
                                        KRS Terisi
                                      </span>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                        attr.is_krs_diajukan === '1' ? "bg-emerald-50 text-emerald-600 border-emerald-100/60" : "bg-slate-50 text-slate-400 border-slate-200/50"
                                      )}>
                                        KRS Diajukan
                                      </span>
                                      <span className={cn(
                                        "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border",
                                        attr.is_krs_disetujui === '1' ? "bg-emerald-50 text-emerald-600 border-emerald-100/60" : "bg-slate-50 text-slate-400 border-slate-200/50"
                                      )}>
                                        KRS Disetujui
                                      </span>
                                    </div>

                                    {/* KHS Grades Table */}
                                    <div className="space-y-2">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-body">
                                        Hasil Studi (KHS)
                                      </p>
                                      {khsList.length === 0 ? (
                                        <p className="text-xs text-slate-450 italic p-4 text-center bg-slate-50 border border-slate-100 rounded-xl font-semibold font-body">
                                          Belum ada data nilai hasil studi (KHS) untuk periode ini.
                                        </p>
                                      ) : (
                                        <div className="border border-slate-100 rounded-xl overflow-hidden bg-white">
                                          <div className="overflow-x-auto no-scrollbar">
                                            <table className="w-full text-left text-xs border-collapse min-w-[400px]">
                                              <thead>
                                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                                  <th className="p-2.5 font-bold text-slate-400 uppercase tracking-wider text-[9px] font-body">Mata Kuliah</th>
                                                  <th className="p-2.5 font-bold text-slate-400 uppercase tracking-wider text-center text-[9px] w-12 font-body">SKS</th>
                                                  <th className="p-2.5 font-bold text-slate-400 uppercase tracking-wider text-center text-[9px] w-20 font-body">Nilai</th>
                                                  <th className="p-2.5 font-bold text-slate-400 uppercase tracking-wider text-center text-[9px] w-20 font-body">Status</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {khsList.map((khsItem, kIdx) => {
                                                  const khsLulus = khsItem.is_lulus === '1' || khsItem.is_lulus === 1 || khsItem.is_lulus === true;
                                                  return (
                                                    <tr key={kIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30 transition-colors">
                                                      <td className="p-2.5">
                                                        <span className="font-bold text-slate-700 block font-body">{khsItem.mata_kuliah}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono font-bold">{khsItem.kode_mata_kuliah}</span>
                                                      </td>
                                                      <td className="p-2.5 text-center font-mono font-bold text-slate-700">{khsItem.sks}</td>
                                                      <td className="p-2.5 text-center">
                                                        <span className="font-extrabold text-slate-850 block font-body">{khsItem.nilai_huruf || '—'}</span>
                                                        <span className="text-[9px] text-slate-400 font-mono font-bold">({khsItem.nilai_angka || '0.00'})</span>
                                                      </td>
                                                      <td className="p-2.5 text-center">
                                                        <span className={cn(
                                                          "inline-flex items-center justify-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider",
                                                          khsLulus ? "bg-emerald-50 text-emerald-600 border border-emerald-100/60" : "bg-rose-50 text-rose-500 border border-rose-100/60"
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
                  </TabsContent>

                  <TabsContent value="kencana">
                    {tabLoading.kencana ? (
                      <div className="space-y-4 py-8 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: '28px' }}>sync</span>
                        <p className="text-xs font-semibold uppercase tracking-widest font-body">Memuat Progres PKKMB...</p>
                      </div>
                    ) : tabData.kencana ? (
                      <div className="space-y-6">
                        {/* Overview Card */}
                        <div className={cn("p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4",
                          tabData.kencana.status_keseluruhan === 'lulus' ? 'bg-emerald-50/50 border-emerald-100' :
                            tabData.kencana.status_keseluruhan === 'berlangsung' ? 'bg-amber-50/50 border-amber-100' : 'bg-slate-50/50 border-slate-100'
                        )}>
                          <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body">Status Kelulusan Kencana</p>
                            <div className="flex items-center gap-2">
                              <span className={cn("text-sm font-black font-body uppercase tracking-wider px-2 py-0.5 rounded-lg",
                                tabData.kencana.status_keseluruhan === 'lulus' ? 'bg-emerald-100 text-emerald-700' :
                                  tabData.kencana.status_keseluruhan === 'berlangsung' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                              )}>
                                {tabData.kencana.status_keseluruhan === 'lulus' ? 'Lulus' : tabData.kencana.status_keseluruhan === 'berlangsung' ? 'Berlangsung' : 'Belum Mulai'}
                              </span>
                              {tabData.kencana.has_sertifikat && (
                                <span className="text-[9px] font-black uppercase tracking-widest font-body text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">Sertifikat Terbit</span>
                              )}
                            </div>
                          </div>
                          <div className="text-left sm:text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body">Nilai Kumulatif</p>
                            <p className="text-2xl font-black font-body text-slate-800">{tabData.kencana.nilai_kumulatif ? tabData.kencana.nilai_kumulatif.toFixed(1) : '0.0'}<span className="text-xs text-slate-400 font-bold"> / 100</span></p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs font-bold font-body text-slate-500">
                            <span>PROGRES KUIS ({tabData.kencana.kuis_selesai} / {tabData.kencana.total_kuis})</span>
                            <span>{tabData.kencana.total_kuis > 0 ? Math.round((tabData.kencana.kuis_selesai / tabData.kencana.total_kuis) * 100) : 0}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-bku-primary h-full rounded-full transition-all duration-300"
                              style={{ width: `${tabData.kencana.total_kuis > 0 ? (tabData.kencana.kuis_selesai / tabData.kencana.total_kuis) * 100 : 0}%` }}
                            />
                          </div>
                        </div>

                        {/* Tahapan List */}
                        <div className="space-y-4">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body">Tahapan PKKMB</p>
                          {tabData.kencana.tahaps && tabData.kencana.tahaps.length > 0 ? (
                            <div className="space-y-3">
                              {tabData.kencana.tahaps.map((t, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow">
                                  <div className="flex justify-between items-center mb-3">
                                    <span className="font-bold text-slate-700 text-sm font-body">{t.label}</span>
                                    <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none border-none",
                                      t.status === 'selesai' ? 'bg-emerald-50 text-emerald-600' :
                                        t.status === 'berlangsung' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                                    )}>
                                      {t.status}
                                    </Badge>
                                  </div>
                                  {t.materis && t.materis.length > 0 ? (
                                    <div className="space-y-2">
                                      {t.materis.map((m, mIdx) => (
                                        <div key={mIdx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-slate-50/50">
                                          <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '14px' }}>
                                              {m.tipe === 'video' ? 'movie' : m.tipe === 'pdf' ? 'picture_as_pdf' : 'description'}
                                            </span>
                                            <span className="font-semibold text-slate-600">{m.judul}</span>
                                          </div>
                                          {m.kuis && (
                                            <div className="flex items-center gap-3">
                                              <span className="text-[10px] font-bold text-slate-400">Kuis: {m.kuis.judul_kuis}</span>
                                              <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                                m.kuis.status === 'lulus' ? 'bg-emerald-100 text-emerald-700' :
                                                  m.kuis.status === 'tidak_lulus' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                                              )}>
                                                {m.kuis.status === 'lulus' ? `Lulus (${m.kuis.nilai_terbaik})` : m.kuis.status === 'tidak_lulus' ? `Gagal (${m.kuis.nilai_terbaik})` : 'Belum'}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[10px] font-semibold text-slate-400 italic">Tidak ada materi pada tahap ini</p>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400 italic">Belum ada tahapan terdaftar</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs font-semibold text-slate-400 italic">Data PKKMB tidak ditemukan</p>
                    )}
                  </TabsContent>

                  <TabsContent value="counseling_health">
                    {tabLoading.health ? (
                      <div className="space-y-4 py-8 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: '28px' }}>sync</span>
                        <p className="text-xs font-semibold uppercase tracking-widest font-body">Memuat Layanan Kesehatan & Konseling...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Sesi Konseling */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '14px' }}>psychology</span>
                            Riwayat Booking Konseling (Psikolog)
                          </p>
                          {tabData.counseling && tabData.counseling.length > 0 ? (
                            <div className="space-y-2">
                              {tabData.counseling.map((c, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-white hover:bg-slate-50/30 transition-colors flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-700">{c.Psychologist?.Nama || 'Psikolog BKU'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Jadwal: {c.JadwalSesi ? new Date(c.JadwalSesi).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                                    {c.LinkMeeting && <a href={c.LinkMeeting} target="_blank" rel="noreferrer" className="text-blue-500 font-bold hover:underline block text-[10px]">Link Konseling Online</a>}
                                  </div>
                                  <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none border-none",
                                    c.Status === 'Selesai' || c.Status === 'selesai' ? 'bg-emerald-50 text-emerald-600' :
                                      c.Status === 'Menunggu' || c.Status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                  )}>
                                    {c.Status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400 italic p-3 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">Belum ada booking konseling</p>
                          )}
                        </div>

                        {/* Riwayat Kesehatan */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '14px' }}>favorite</span>
                            Bookings & Rekam Medis Kesehatan
                          </p>
                          {tabData.healthBookings && tabData.healthBookings.length > 0 ? (
                            <div className="space-y-2">
                              {tabData.healthBookings.map((h, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-white hover:bg-slate-50/30 transition-colors flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-700">Pemeriksaan: {h.HealthWorker?.Nama || 'Tenaga Kesehatan'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Tanggal: {h.TanggalBooking ? new Date(h.TanggalBooking).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                                    {h.Keluhan && <p className="text-[10px] text-slate-500 italic">"Keluhan: {h.Keluhan}"</p>}
                                  </div>
                                  <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none border-none",
                                    h.Status === 'Selesai' || h.Status === 'selesai' ? 'bg-emerald-50 text-emerald-600' :
                                      h.Status === 'Menunggu' || h.Status === 'pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                  )}>
                                    {h.Status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400 italic p-3 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">Belum ada riwayat layanan kesehatan</p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="akademik_beasiswa">
                    {tabLoading.scholarships ? (
                      <div className="space-y-4 py-8 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: '28px' }}>sync</span>
                        <p className="text-xs font-semibold uppercase tracking-widest font-body">Memuat Data Beasiswa & Prestasi...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Riwayat Beasiswa */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '14px' }}>payments</span>
                            Pengajuan Beasiswa
                          </p>
                          {tabData.scholarships && tabData.scholarships.length > 0 ? (
                            <div className="space-y-2">
                              {tabData.scholarships.map((s, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-white hover:bg-slate-50/30 transition-colors flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-700">{s.Scholarship?.Judul || s.Scholarship?.Nama || 'Program Beasiswa'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Tanggal Daftar: {s.CreatedAt ? new Date(s.CreatedAt).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</p>
                                    {s.Catatan && <p className="text-[10px] text-slate-500">Keterangan: {s.Catatan}</p>}
                                  </div>
                                  <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none border-none",
                                    s.Status === 'Disetujui' || s.Status === 'disetujui' || s.Status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                                      s.Status === 'Menunggu' || s.Status === 'menunggu' || s.Status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                  )}>
                                    {s.Status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400 italic p-3 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">Belum ada pengajuan beasiswa</p>
                          )}
                        </div>

                        {/* Daftar Prestasi */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '14px' }}>emoji_events</span>
                            Prestasi Mahasiswa
                          </p>
                          {tabData.achievements && tabData.achievements.length > 0 ? (
                            <div className="space-y-2">
                              {tabData.achievements.map((a, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-white hover:bg-slate-50/30 transition-colors flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-700">{a.NamaKegiatan || a.NamaPrestasi}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Tingkat: {a.Tingkat} | Kategori: {a.Kategori}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Tahun: {a.Tahun || a.TahunPrestasi}</p>
                                  </div>
                                  <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none border-none",
                                    a.StatusVerifikasi === 'Disetujui' || a.StatusVerifikasi === 'disetujui' || a.StatusVerifikasi === 'Approved' || a.IsVerified ? 'bg-emerald-50 text-emerald-600' :
                                      a.StatusVerifikasi === 'Menunggu' || a.StatusVerifikasi === 'menunggu' || a.StatusVerifikasi === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                  )}>
                                    {a.StatusVerifikasi || (a.IsVerified ? 'Disetujui' : 'Menunggu')}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400 italic p-3 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">Belum ada prestasi yang tercatat</p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="organisasi_aspirasi">
                    {tabLoading.organisasi ? (
                      <div className="space-y-4 py-8 flex flex-col items-center justify-center text-slate-400">
                        <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: '28px' }}>sync</span>
                        <p className="text-xs font-semibold uppercase tracking-widest font-body">Memuat Data Keanggotaan & Aspirasi...</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Keikutsertaan Ormawa */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '14px' }}>groups</span>
                            Keikutsertaan Organisasi (Ormawa)
                          </p>
                          {tabData.organisasi && tabData.organisasi.length > 0 ? (
                            <div className="space-y-2">
                              {tabData.organisasi.map((o, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-white hover:bg-slate-50/30 transition-colors flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-700">{o.Ormawa?.Nama || o.NamaOrganisasi || 'Organisasi'}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Jabatan / Role: {o.Jabatan || 'Anggota'}</p>
                                  </div>
                                  <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none border-none",
                                    o.Status === 'Aktif' || o.Status === 'aktif' || o.Status === 'Disetujui' ? 'bg-emerald-50 text-emerald-600' :
                                      o.Status === 'Menunggu' || o.Status === 'menunggu' || o.Status === 'Pending' ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-600'
                                  )}>
                                    {o.Status}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400 italic p-3 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">Belum tergabung dalam organisasi</p>
                          )}
                        </div>

                        {/* Aspirasi Mahasiswa */}
                        <div className="space-y-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-body flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '14px' }}>campaign</span>
                            Aspirasi / Pengaduan Mahasiswa
                          </p>
                          {tabData.aspirasi && tabData.aspirasi.length > 0 ? (
                            <div className="space-y-2">
                              {tabData.aspirasi.map((a, idx) => (
                                <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-white hover:bg-slate-50/30 transition-colors flex justify-between items-center text-xs">
                                  <div className="space-y-1">
                                    <p className="font-bold text-slate-700">{a.Judul || a.Subjek}</p>
                                    <p className="text-[10px] text-slate-400 font-medium">Kategori: {a.Kategori} | Tanggal: {a.CreatedAt ? new Date(a.CreatedAt).toLocaleDateString('id-ID') : '—'}</p>
                                    {a.Deskripsi && <p className="text-[10px] text-slate-500 truncate max-w-md">{a.Deskripsi}</p>}
                                  </div>
                                  <Badge className={cn("px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-none border-none",
                                    a.Status === 'Selesai' || a.Status === 'selesai' || a.Status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                                      a.Status === 'Diproses' || a.Status === 'diproses' || a.Status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                                  )}>
                                    {a.Status || 'Menunggu'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-semibold text-slate-400 italic p-3 border border-dashed border-slate-100 rounded-xl bg-slate-50/20">Belum pernah menyampaikan aspirasi</p>
                          )}
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        )}
      </DialogModal>

      {/* ── CRUD Modal ───────────────────────────────────────────── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? 'Update Identity' : 'Enroll Student'}
        subtitle="Registry Engine"
        icon={isEditMode ? 'edit' : 'add'}
        maxWidth="max-w-xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} />
            <ModalSaveButton form="crud-form" loading={isSubmitting}>{isEditMode ? 'Simpan Perubahan' : 'Daftarkan Mahasiswa'}</ModalSaveButton>
          </>
        }
      >
        <form id="crud-form" onSubmit={handleSave}>
          <div className="px-1 py-2 space-y-4 font-body">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">NIM / Student ID</Label>
                <Input required value={form.NIM} onChange={e => setForm({ ...form, NIM: e.target.value })} placeholder="BKU..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-body" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">Full Legal Name</Label>
                <Input required value={form.Nama} onChange={e => setForm({ ...form, Nama: e.target.value })} placeholder="Full name..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-body" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">Academic Email</Label>
                <Input required type="email" value={form.EmailKampus} onChange={e => setForm({ ...form, EmailKampus: e.target.value })} placeholder="id@bku.ac.id" className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-body" />
              </div>
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">
                  {isEditMode ? 'New Password (Optional)' : 'Account Password'}
                </Label>
                <Input
                  required={!isEditMode}
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder={isEditMode ? "Leave blank to keep current..." : "Set password..."}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-body"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">Faculty Branch</Label>
                <SearchableSelect
                  value={String(form.FakultasID)}
                  onChange={v => setForm({ ...form, FakultasID: v, ProgramStudiID: '' })}
                  options={faculties.map(f => ({
                    value: String(f.id || f.ID),
                    label: f.Nama || f.nama
                  }))}
                  placeholder="Pilih Fakultas"
                  searchPlaceholder="Cari fakultas..."
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">Academic Program</Label>
                <SearchableSelect
                  value={String(form.ProgramStudiID)}
                  onChange={v => setForm({ ...form, ProgramStudiID: v })}
                  options={prodi.filter(p => !form.FakultasID || parseInt(p.FakultasID) === parseInt(form.FakultasID)).map(p => ({
                    value: String(p.id || p.ID),
                    label: p.Nama || p.nama
                  }))}
                  placeholder="Pilih Prodi"
                  searchPlaceholder="Cari prodi..."
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">Account Status</Label>
                <Select value={form.StatusAkun} onValueChange={v => setForm({ ...form, StatusAkun: v })}>
                  <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30 font-semibold text-slate-700 text-sm font-body"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-slate-100">
                    {['Aktif', 'Cuti', 'Lulus', 'Nonaktif'].map(s => <SelectItem key={s} value={s} className="text-xs font-semibold text-slate-700 font-body">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">Current Semester</Label>
                <Input type="number" min={1} max={14} value={form.SemesterSekarang} onChange={e => setForm({ ...form, SemesterSekarang: e.target.value })} className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-850 focus:border-bku-primary font-body" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div className="space-y-1.5 sm:col-span-1">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-body">Admission Batch (Year)</Label>
                <Input type="number" value={form.TahunMasuk} onChange={e => setForm({ ...form, TahunMasuk: e.target.value })} className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-850 focus:border-bku-primary font-body" />
              </div>
            </div>
          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Destroy Student Entity?"
        description="Seluruh data akademik, riwayat registrasi, dan kaitan entitas mahasiswa ini akan dihapus permanen dari basis data sistem. Prosedur ini tidak dapat dibatalkan."
        loading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={() => {
          setIsResetModalOpen(false);
          handleResetData();
        }}
        title="Hard Reset Data Mahasiswa?"
        description="PERINGATAN: Aksi ini akan menghapus SELURUH data mahasiswa beserta riwayat nilai, konseling, dan semua akun mahasiswa dari database secara permanen! Apakah Anda benar-benar yakin?"
        loading={isResetting}
        confirmText="YA, RESET TOTAL"
        confirmClassName="bg-red-600 hover:brightness-90 text-white"
      />

      <DeleteConfirmModal
        isOpen={isSyncBiodataModalOpen}
        onClose={() => setIsSyncBiodataModalOpen(false)}
        onConfirm={handleSyncSevima}
        title="Sinkronisasi Biodata SEVIMA?"
        description={
          isSyncing ? (
            <div className="flex flex-col gap-5 mt-4 w-full">
              {/* Sinkronisasi Data Mahasiswa */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 font-body">
                  <span>Sinkronisasi Biodata Mahasiswa</span>
                  {syncProgress?.total_data > 0 && (
                    <span className={syncProgress.phase === 2 || syncProgress?.total_synced >= syncProgress?.total_data ? "text-emerald-500" : "text-bku-primary"}>
                      {syncProgress.phase === 2 || syncProgress?.total_synced >= syncProgress?.total_data ? "100%" : `${Math.min(100, Math.floor(((syncProgress?.total_synced || 0) / syncProgress.total_data) * 100))}%`}
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className={`${syncProgress?.phase === 2 || syncProgress?.total_synced >= syncProgress?.total_data ? 'bg-emerald-500' : 'bg-bku-primary'} h-3 rounded-full transition-all duration-500 relative`}
                    style={{ width: syncProgress?.phase === 2 || syncProgress?.total_synced >= syncProgress?.total_data ? '100%' : `${syncProgress?.total_data > 0 ? Math.min(100, Math.max(5, ((syncProgress?.total_synced || 0) / syncProgress.total_data) * 100)) : Math.min(100, Math.max(5, (syncProgress?.total_synced || 0) / 100))}%` }}
                  >
                    {syncProgress?.phase === 1 && syncProgress?.total_synced < syncProgress?.total_data && <div className="absolute inset-0 bg-white/20 progress-shimmer"></div>}
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold font-mono">
                  {syncProgress?.phase === 2 || syncProgress?.total_synced >= syncProgress?.total_data ? 'Selesai.' : `${syncProgress?.total_synced || 0} / ${syncProgress?.total_data || '?'} Data berhasil ditarik.`}
                </p>
              </div>
            </div>
          ) : "Apakah Anda yakin ingin menyinkronkan biodata mahasiswa dari SEVIMA? Aksi ini akan menarik ratusan/ribuan data terbaru."
        }
        loading={isSyncing}
        cancelText={isSyncing ? "Tutup (Sembunyikan)" : "Batal"}
        extraAction={
          isSyncing ? (
            <Button
              variant="destructive"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await adminService.cancelSyncSevima();
                } catch (err) {
                  console.error('Failed to cancel sync', err);
                }
              }}
              className="h-10 px-6 rounded-xl bg-red-100 text-[11px] font-bold text-red-600 uppercase tracking-wider hover:bg-red-200 transition-all flex items-center justify-center cursor-pointer shadow-none"
            >
              Batal Sinkron
            </Button>
          ) : null
        }
        confirmText={isSyncing ? "SINKRONISASI BERJALAN..." : "YA, SINKRONISASI BIODATA"}
        confirmClassName={isSyncing ? "hidden" : "bg-[var(--theme-primary)] hover:brightness-90 text-white"}
      />

      <DeleteConfirmModal
        isOpen={isSyncIpkModalOpen}
        onClose={() => setIsSyncIpkModalOpen(false)}
        onConfirm={handleSyncIpk}
        title="Sinkronisasi Transkrip IPK?"
        description={
          isSyncingIpk ? (
            <div className="flex flex-col gap-5 mt-4 w-full">
              {/* Sinkronisasi IPK */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-xs font-bold text-slate-600 font-body">
                  <span>{syncProgress?.status_text || 'Sinkronisasi Transkrip IPK'}</span>
                  {syncProgress?.ipk_total > 0 && (
                    <span className="text-bku-primary">
                      {Math.min(100, Math.floor((((syncProgress?.ipk_synced || 0) + (syncProgress?.ipk_failed || 0)) / syncProgress.ipk_total) * 100))}%
                    </span>
                  )}
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden shadow-inner">
                  <div
                    className="bg-bku-primary h-3 rounded-full transition-all duration-500 relative"
                    style={{ width: `${syncProgress?.ipk_total > 0 ? Math.min(100, Math.max(5, (((syncProgress?.ipk_synced || 0) + (syncProgress?.ipk_failed || 0)) / syncProgress.ipk_total) * 100)) : 5}%` }}
                  >
                    <div className="absolute inset-0 bg-white/20 progress-shimmer"></div>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 font-bold font-mono flex gap-2">
                  <span className="text-emerald-500">Berhasil: {syncProgress?.ipk_synced || 0}</span>
                  <span className="text-red-500">Gagal: {syncProgress?.ipk_failed || 0}</span>
                  <span>Total: {syncProgress?.ipk_total || '?'}</span>
                </p>
              </div>
            </div>
          ) : "Apakah Anda yakin ingin menyinkronkan data transkrip IPK dari SEVIMA? Proses ini akan menarik KHS masing-masing mahasiswa secara intensif."
        }
        loading={isSyncingIpk}
        cancelText={isSyncingIpk ? "Tutup (Sembunyikan)" : "Batal"}
        extraAction={null}
        confirmText={isSyncingIpk ? "SINKRONISASI BERJALAN..." : "YA, SINKRONISASI IPK"}
        confirmClassName={isSyncingIpk ? "hidden" : "bg-[var(--theme-primary)] hover:brightness-90 text-white"}
      />

      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleReset}
        title="Reset Data Mahasiswa?"
        description="Apakah Anda yakin ingin mengosongkan SELURUH data mahasiswa? Semua data di sistem akan hilang dan harus ditarik ulang dari SEVIMA. Proses ini tidak bisa dibatalkan."
        loading={isResetting}
        confirmText="YA, KOSONGKAN"
        confirmClassName="bg-red-600 hover:bg-red-700 text-white"
      />
    </PageContent>
  )
}
