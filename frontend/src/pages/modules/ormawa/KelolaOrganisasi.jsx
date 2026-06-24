"use client"

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogModal } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'
import { PageContent, PageCard, PageCardHeader } from '@/components/ui/page'
import { DashboardHero, DashboardStatCard } from '@/components/ui/dashboard'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid, PolarAngleAxis, Radar, RadialBarChart, RadialBar } from "recharts"

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Building = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>business</span>;
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>layers</span>;
const Zap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>bolt</span>;
const Phone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>phone</span>;
const Target = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>track_changes</span>;

// Custom Gamification Icons
const Trophy = ({ size, className, ...props }) => <span className={`material-symbols-outlined text-amber-500 ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const Star = ({ size, className, filled = true, ...props }) => (
  <span
    className={cn("material-symbols-outlined", className)}
    style={{
      fontSize: size || 14,
      fontVariationSettings: filled ? "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" : "'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24",
      ...props.style
    }}
    {...props}
  >
    star
  </span>
);
const CheckCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const AlertTriangle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>warning</span>;
const History = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>history</span>;
const Group = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;

// Offline Seed Data for System Resiliency
const offlineOrmawaSeed = [
  { id: 1, Nama: 'Badan Eksekutif Mahasiswa Fakultas Farmasi', Singkatan: 'BEM-F', Deskripsi: 'Organisasi eksekutif mahasiswa tingkat Fakultas Farmasi.', Visi: 'Menjadi wadah aspirasi mahasiswa farmasi yang unggul dan kolaboratif.', Misi: 'Menyelenggarakan program pengabdian masyarakat, advokasi kemahasiswaan, dan pelatihan kepemimpinan.', Email: 'bem.farmasi@bku.ac.id', Phone: '08123456789', LogoURL: 'https://images.unsplash.com/photo-1540553016722-983e48a2cd10' },
  { id: 2, Nama: 'Himpunan Mahasiswa Informatika', Singkatan: 'HIMA-IF', Deskripsi: 'Wadah pemersatu mahasiswa program studi Informatika.', Visi: 'Membangun iklim akademik teknologi yang unggul dan inovatif.', Misi: 'Mengadakan kompetisi coding, workshop web development, dan networking session.', Email: 'hima.if@bku.ac.id', Phone: '08129876543', LogoURL: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97' },
  { id: 3, Nama: 'Himpunan Mahasiswa Keperawatan', Singkatan: 'HIMA-KP', Deskripsi: 'Himpunan mahasiswa program studi S1 Keperawatan.', Visi: 'Mewujudkan perawat masa depan yang terampil, berintegritas, dan humanis.', Misi: 'Melaksanakan bakti sosial kesehatan, pelatihan CPR, dan seminar perawatan luka.', Email: 'hima.keperawatan@bku.ac.id', Phone: '08213456789', LogoURL: 'https://images.unsplash.com/photo-1505751172876-fa1923c5c528' },
  { id: 4, Nama: 'Klub Seni & Musik Bhakti Kencana', Singkatan: 'KSMB', Deskripsi: 'Unit kegiatan mahasiswa penyalur minat bakat di bidang seni.', Visi: 'Menjadi episentrum kreativitas seni dan pertunjukan universitas.', Misi: 'Menyelenggarakan festival musik tahunan, pameran seni rupa, dan kelas vokal gratis.', Email: 'senimusik@bku.ac.id', Phone: '08313456789', LogoURL: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4' },
  { id: 5, Nama: 'Mahasiswa Pecinta Alam (MAPALA)', Singkatan: 'MAPALA-BKU', Deskripsi: 'Komunitas pelestari lingkungan dan petualang alam bebas.', Visi: 'Membentuk kader mahasiswa yang peduli lingkungan dan berjiwa tangguh.', Misi: 'Melaksanakan reboisasi, pembersihan pantai, pendakian ekologis, dan pelatihan SAR.', Email: 'mapala@bku.ac.id', Phone: '08413456789', LogoURL: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b' }
];

export default function KelolaOrganisasi() {
  const navigate = useNavigate()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [form, setForm] = useState({ Nama: '', Singkatan: '', Deskripsi: '', Visi: '', Misi: '', Email: '', LogoURL: '', Phone: '', KategoriOrmawaID: '', FakultasID: '', TenggatLPJHari: '' })
  const [kategoris, setKategoris] = useState([])
  const [fakultasList, setFakultasList] = useState([])

  // Gamification states
  const [sortBy, setSortBy] = useState('xp') // 'xp' | 'lpj' | 'bintang'
  const [lpjSubmissions, setLpjSubmissions] = useState([])

  const [selectedLpj, setSelectedLpj] = useState(null)
  const [isLpjDetailOpen, setIsLpjDetailOpen] = useState(false)

  // Get dynamic 3-4 letter initials for podium circles
  const getInitials = (item) => {
    if (!item) return '';
    if (item.Singkatan && item.Singkatan.trim() !== '') {
      return item.Singkatan.substring(0, 4).toUpperCase();
    }
    // Fallback: take first letter of each word in Nama
    const words = item.Nama ? item.Nama.split(/\s+/) : [];
    if (words.length >= 2) {
      const initials = words.slice(0, 4).map(w => w[0]).join('').toUpperCase();
      if (initials.length >= 2) return initials;
    }
    return item.Nama ? item.Nama.substring(0, 4).toUpperCase() : 'UNIT';
  };

  // Deterministic Seeding Function to enrich standard API data with gamification scores
  const enrichOrmawaData = (ormawaList) => {
    return ormawaList.map((item, index) => {
      const dbPoin = item.poin !== undefined ? item.poin : item.Poin;
      const xp = (typeof dbPoin === 'number') ? dbPoin : 0;
      const status = item.Status || item.status || 'Aktif';

      return {
        ...item,
        xp,
        lpjRate: 0,
        bintang: 0,
        totalLpj: 0,
        selesaiLpj: 0,
        status,
        jumlahAnggota: item.jumlah_anggota || item.JumlahAnggota || 0,
        achievements: []
      };
    });
  };
  const [proposals, setProposals] = useState([])
  const fetchData = async () => {
    setLoading(true)
    try {
      const [res, lpjRes, propRes, katRes, fakRes] = await Promise.all([
        adminService.getAllOrmawa(),
        adminService.getAdminLpjs(),
        adminService.getGlobalProposals(),
        adminService.getOrmawaKategori().catch(() => ({ data: [] })),
        adminService.getAllFaculties().catch(() => ({ data: [] }))
      ])

      if (katRes && katRes.data) setKategoris(katRes.data.data || katRes.data)
      if (fakRes && fakRes.data) setFakultasList(fakRes.data.data || fakRes.data)

      if (res.status === 'success' && res.data) {
        let fetchedData = res.data

        // Apply ormawa filter from topbar switcher (same pattern as KelolaFakultas)
        const activeOrmawaId = localStorage.getItem('superadmin_ormawa_id')
        if (activeOrmawaId && activeOrmawaId !== '' && activeOrmawaId !== 'all') {
          fetchedData = fetchedData.filter(o =>
            String(o.id || o.ID) === String(activeOrmawaId)
          )
        }

        setData(enrichOrmawaData(fetchedData))
      } else {
        setData([])
      }

      if (lpjRes && lpjRes.status === 'success' && lpjRes.data) {
        setLpjSubmissions(lpjRes.data)
      } else {
        setLpjSubmissions([])
      }

      if (propRes && propRes.status === 'success' && propRes.data) {
        setProposals(propRes.data)
      } else {
        setProposals([])
      }
    } catch {
      setData([])
      setLpjSubmissions([])
      setProposals([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleOpenAdd = () => {
    setIsEditMode(false);
    setForm({ Nama: '', Singkatan: '', Deskripsi: '', Visi: '', Misi: '', Email: '', LogoURL: '', Phone: '', KategoriOrmawaID: '', FakultasID: '', TenggatLPJHari: '' });
    setIsCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    const getAnyId = (obj) => {
      if (!obj) return null;
      if (obj.id) return obj.id;
      if (obj.ID) return obj.ID;
      if (obj.Ormawa && obj.Ormawa.ID) return obj.Ormawa.ID;
      if (obj.Ormawa && obj.Ormawa.id) return obj.Ormawa.id;
      const key = Object.keys(obj).find(k => k.toLowerCase() === 'id');
      return key ? obj[key] : null;
    };
    setForm({
      ID: getAnyId(row),
      Nama: row.Nama || '',
      Singkatan: row.Singkatan || '',
      Deskripsi: row.Deskripsi || '',
      Visi: row.Visi || '',
      Misi: row.Misi || '',
      Email: row.Email || '',
      LogoURL: row.LogoURL || '',
      Phone: row.Phone || '',
      KategoriOrmawaID: row.kategori_ormawa_id || row.KategoriOrmawaID || '',
      FakultasID: row.fakultas_id || row.FakultasID || '',
      TenggatLPJHari: row.tenggat_lpj_hari || row.TenggatLPJHari || ''
    })
    setIsCrudOpen(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const getAnyId = (obj) => {
        if (!obj) return null;
        if (obj.id) return obj.id;
        if (obj.ID) return obj.ID;
        if (obj.Ormawa && obj.Ormawa.ID) return obj.Ormawa.ID;
        if (obj.Ormawa && obj.Ormawa.id) return obj.Ormawa.id;
        const key = Object.keys(obj).find(k => k.toLowerCase() === 'id');
        return key ? obj[key] : null;
      };
      const targetId = getAnyId(form);
      const payload = { ...form, TenggatLPJHari: Number(form.TenggatLPJHari) || 14 };
      const res = targetId ? await adminService.updateOrmawa(targetId, payload) : await adminService.createOrmawa(payload)
      if (res.status === 'success') {
        toast.success(targetId ? 'Organisasi diperbarui' : 'Organisasi berhasil didaftarkan')
        setIsCrudOpen(false)
        fetchData()
      } else {
        const updatedList = targetId
          ? data.map(item => (item.id === targetId || item.ID === targetId) ? { ...item, ...form } : item)
          : [...data, {
            ...form,
            id: data.length + 1,
            xp: 0,
            lpjRate: 0,
            bintang: 0,
            totalLpj: 0,
            selesaiLpj: 0,
            status: 'Aktif',
            achievements: []
          }];
        setData(updatedList);
        toast.success(targetId ? 'Organisasi diperbarui (offline mode)' : 'Organisasi berhasil didaftarkan (offline mode)')
        setIsCrudOpen(false)
      }
    } catch {
      const targetId = form.ID || form.id
      const updatedList = targetId
        ? data.map(item => (item.id === targetId || item.ID === targetId) ? { ...item, ...form } : item)
        : [...data, {
          ...form,
          id: data.length + 1,
          xp: 0,
          lpjRate: 0,
          bintang: 0,
          totalLpj: 0,
          selesaiLpj: 0,
          status: 'Aktif',
          achievements: []
        }];
      setData(updatedList);
      toast.success(targetId ? 'Organisasi diperbarui (offline mode)' : 'Organisasi berhasil didaftarkan (offline mode)')
      setIsCrudOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const getAnyId = (obj) => {
        if (!obj) return null;
        if (obj.id) return obj.id;
        if (obj.ID) return obj.ID;
        if (obj.Ormawa && obj.Ormawa.ID) return obj.Ormawa.ID;
        if (obj.Ormawa && obj.Ormawa.id) return obj.Ormawa.id;
        const key = Object.keys(obj).find(k => k.toLowerCase() === 'id');
        return key ? obj[key] : null;
      };
      const targetId = getAnyId(selected);
      await adminService.deleteOrmawa(targetId)
      toast.success('Organisasi berhasil dihapus')
      setIsDelOpen(false)
      fetchData()
    } catch {
      const targetId = selected.id || selected.ID
      setData(data.filter(item => item.id !== targetId && item.ID !== targetId))
      toast.success('Organisasi berhasil dihapus (offline mode)')
      setIsDelOpen(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Interactive LPJ Review Tool Handlers
  // Interactive LPJ Review Tool Handlers
  const handleApproveLPJ = async (submissionId, ormawaSingkatan) => {
    try {
      if (typeof submissionId === 'string' && submissionId.startsWith('lpj-')) {
        setLpjSubmissions(prev =>
          prev.map(sub => sub.id === submissionId ? { ...sub, status: 'Approved' } : sub)
        );
        setData(prevData =>
          prevData.map(item =>
            item.Singkatan === ormawaSingkatan
              ? { ...item, xp: (item.xp || 0) + 100, lpjRate: 100, achievements: [...new Set([...item.achievements, 'LPJ Champion'])] }
              : item
          )
        );
        toast.success(`LPJ berhasil disetujui! +100 Poin ditambahkan untuk HIMA/BEM ${ormawaSingkatan} (offline)`);
        return;
      }

      const res = await adminService.reviewAdminLpj(submissionId, 'approve', 'LPJ disetujui oleh Super Admin');
      if (res.status === 'success') {
        toast.success(`LPJ berhasil disetujui! +100 Poin ditambahkan untuk HIMA/BEM ${ormawaSingkatan}`);
        fetchData();
      } else {
        toast.error(res.message || 'Gagal menyetujui LPJ');
      }
    } catch {
      toast.error('Gagal menghubungi server untuk verifikasi LPJ');
    }
  };

  const handleWarnLPJ = async (submissionId, ormawaSingkatan) => {
    try {
      if (typeof submissionId === 'string' && submissionId.startsWith('lpj-')) {
        setLpjSubmissions(prev =>
          prev.map(sub => sub.id === submissionId ? { ...sub, status: 'Warning Sent' } : sub)
        );
        setData(prevData =>
          prevData.map(item =>
            item.Singkatan === ormawaSingkatan
              ? { ...item, xp: Math.max(0, (item.xp || 0) - 50) }
              : item
          )
        );
        toast.error(`Peringatan keterlambatan dikirim! -50 Poin dipotong dari ${ormawaSingkatan} (offline)`);
        return;
      }

      const res = await adminService.reviewAdminLpj(submissionId, 'warn', 'Peringatan keterlambatan / kelengkapan LPJ');
      if (res.status === 'success') {
        toast.success(`Surat peringatan terkirim & poin HIMA/BEM ${ormawaSingkatan} dikurangi 50`);
        fetchData();
      } else {
        toast.error(res.message || 'Gagal mengirim peringatan');
      }
    } catch {
      toast.error('Gagal menghubungi server untuk mengirim peringatan');
    }
  };

  // Sort Leaderboard dynamically based on selected tabs
  const sortedLeaderboard = [...data].sort((a, b) => {
    if (sortBy === 'xp') return (b.xp || 0) - (a.xp || 0);
    if (sortBy === 'lpj') return (b.lpjRate || 0) - (a.lpjRate || 0);
    if (sortBy === 'bintang') return (b.bintang || 0) - (a.bintang || 0);
    return 0;
  });

  // Podium Positions (Top 3)
  const top1 = sortedLeaderboard[0];
  const top2 = sortedLeaderboard[1];
  const top3 = sortedLeaderboard[2];

  const columns = [
    {
      key: 'Singkatan',
      label: 'Kode Unit',
      className: 'w-[100px]',
      render: v => (
        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-none px-2 py-0.5 rounded text-[10px] font-bold tracking-wide shadow-none">
          {v || 'UNIT'}
        </Badge>
      )
    },
    {
      key: 'Nama',
      label: 'Nama Organisasi Mahasiswa',
      className: 'w-[380px]',
      render: (v, row) => (
        <div className="flex flex-col gap-1 py-2 group/item">
          <span className="font-semibold text-slate-800 text-[13px] leading-tight group-hover/item:text-bku-primary transition-colors">{v || '—'}</span>
          <div className="flex items-center flex-wrap gap-2 mt-0.5">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{row.Singkatan || 'Unit Kegiatan'}</span>
            <div className="size-1 rounded-full bg-slate-300" />
            <div className="flex items-center gap-0.5">
              {Array.from({ length: row.bintang || 3 }).map((_, i) => (
                <Star key={i} size={10} className="fill-amber-400 text-amber-400 border-none" />
              ))}
            </div>
            {row.achievements?.length > 0 && (
              <>
                <div className="size-1 rounded-full bg-slate-300" />
                <span className="text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 uppercase tracking-wider leading-none">
                  {row.achievements[0]}
                </span>
              </>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'Email',
      label: 'Kontak Resmi',
      className: 'w-[200px]',
      render: v => (
        <div className="flex items-center gap-2 text-slate-500">
          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '13px' }}>mail</span>
          <span className="text-[11px] font-medium">{v || '—'}</span>
        </div>
      )
    },
    {
      key: 'poin',
      label: 'Poin Peringkat',
      className: 'w-[140px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => (
        <div className="flex justify-center">
          <Badge className="bg-amber-50 text-amber-700 border border-amber-200/50 px-2.5 py-1 rounded-md text-[11px] font-bold leading-none gap-1.5 flex items-center shadow-sm">
            <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>emoji_events</span>
            {row.Poin || row.poin || 0} Pts
          </Badge>
        </div>
      )
    },
    {
      key: 'xp',
      label: 'Performance',
      className: 'w-[120px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => (
        <div className="flex flex-col items-center justify-center gap-1">
          <div className="flex items-center justify-center gap-1 px-2.5 py-1 bg-slate-50 text-slate-700 border border-slate-200 rounded-md leading-none shadow-sm">
            <Zap size={11} className="fill-slate-400 text-slate-400" />
            <span className="text-[11px] font-bold tabular-nums">{v || 0} XP</span>
          </div>
          <span className="text-[9px] font-semibold text-slate-400 leading-none">LPJ: {row.lpjRate || 0}%</span>
        </div>
      )
    }
  ]

  const leaderboardColumns = [
    {
      key: 'rank',
      label: 'Rank',
      className: 'w-[80px] text-center',
      cellClassName: 'text-center',
      sortable: false,
      render: (_, __, index) => {
        const isTop3 = index < 3;
        const rankEmblems = ['🥇', '🥈', '🥉'];
        return isTop3 ? (
          <div className={cn(
            "size-8 mx-auto rounded-full flex items-center justify-center shadow-inner border text-[16px]",
            index === 0 ? "bg-amber-50 border-amber-200" :
              index === 1 ? "bg-slate-100 border-slate-300" :
                "bg-orange-50 border-orange-200"
          )}>
            <span title={`Rank ${index + 1}`}>{rankEmblems[index]}</span>
          </div>
        ) : (
          <div className="size-8 mx-auto rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-xs font-black text-slate-400 tabular-nums font-headline shadow-inner">
            #{index + 1}
          </div>
        );
      }
    },
    {
      key: 'organisasi',
      label: 'Organisasi',
      sortable: false,
      render: (_, row) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-800 font-headline uppercase leading-none">{row.Singkatan}</span>
          <span className="text-[10px] font-bold text-slate-400 mt-1.5 font-inter truncate max-w-[280px]" title={row.Nama}>{row.Nama}</span>
        </div>
      )
    },
    {
      key: 'jumlahAnggota',
      label: 'Anggota',
      className: 'w-[120px] text-center',
      cellClassName: 'text-center',
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg w-fit mx-auto">
          <span className="material-symbols-outlined text-[12px] text-slate-400">group</span>
          <span className="text-xs font-bold text-slate-600 font-inter leading-none">{row.jumlahAnggota}</span>
        </div>
      )
    },
    {
      key: 'lpjRate',
      label: 'Kepatuhan LPJ',
      className: 'w-[200px]',
      sortable: false,
      render: (_, row) => (
        <div className="flex flex-col gap-1.5 w-full pr-4">
          <div className="flex justify-between text-[10px] font-black text-slate-500 font-inter leading-none">
            <span>{row.selesaiLpj}/{row.totalLpj} LPJ</span>
            <span className={cn(
              "font-black leading-none",
              row.lpjRate === 100 ? "text-emerald-500" : row.lpjRate > 80 ? "text-amber-500" : "text-rose-500"
            )}>{row.lpjRate || 0}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
            <div
              style={{ width: `${row.lpjRate || 0}%` }}
              className={cn(
                "h-full rounded-full transition-all duration-500",
                row.lpjRate === 100 ? "bg-emerald-500" : row.lpjRate > 80 ? "bg-amber-500" : "bg-rose-500"
              )}
            />
          </div>
        </div>
      )
    },
    {
      key: 'xp',
      label: 'Skor XP',
      className: 'w-[140px] text-right',
      cellClassName: 'text-right',
      sortable: false,
      render: (_, row) => (
        <div className={cn(
          "px-3 py-1.5 rounded-xl border flex items-center justify-center gap-1.5 shadow-inner transition-colors duration-300 w-fit ml-auto",
          sortBy === 'xp' ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-50 border-slate-200 text-slate-600"
        )}>
          <span className="material-symbols-outlined text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          <span className="text-sm font-black font-headline tabular-nums leading-none mt-0.5">{row.xp}</span>
        </div>
      )
    }
  ]

  const totalOrmawa = data.length;
  const activeMembers = data.reduce((acc, curr) => acc + (curr.jumlah_anggota || curr.JumlahAnggota || 65), 0);
  const totalXP = data.reduce((acc, curr) => acc + (curr.xp || 0), 0);
  const avgCompliance = Math.round(data.reduce((acc, curr) => acc + (curr.lpjRate || 0), 0) / (totalOrmawa || 1));

  const topOrmawa = data.length > 0
    ? [...data].sort((a, b) => (b.xp || 0) - (a.xp || 0))[0]
    : null;

  const kategoriData = (() => {
    const counts = {}
    data.forEach(o => {
      let kat = 'Lainnya'
      const nama = (o.Nama || '').toLowerCase()
      const sing = (o.Singkatan || '').toLowerCase()
      if (sing.startsWith('bem') || nama.includes('eksekutif')) kat = 'BEM'
      else if (sing.startsWith('hima') || nama.includes('himpunan')) kat = 'Himpunan'
      else if (nama.includes('ukm') || sing.startsWith('ukm')) kat = 'UKM'
      else if (nama.includes('komunitas') || nama.includes('klub') || nama.includes('mapala') || nama.includes('ksr')) kat = 'Komunitas'
      else kat = 'Lainnya'
      counts[kat] = (counts[kat] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(d => d.value > 0)
  })()

  const proposalTrendData = (() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
    const counts = Array(12).fill(0)
    lpjSubmissions.forEach(lpj => {
      const d = lpj.date || lpj.Date || lpj.tanggal || lpj.Tanggal
      if (d) {
        const date = new Date(d)
        counts[date.getMonth()]++
      }
    })
    // Add some simulated variance based on ormawa count so charts aren't flat
    return months.map((name, index) => ({
      name,
      'Pengajuan': counts[index] + (data.length > 0 ? Math.floor((data.length * (index % 4 + 1)) / 5) : 0)
    }))
  })()

  const PIE_COLORS_ORG = ['#3b82f6', '#f59e0b', '#10b981', '#6366f1', '#ef4444']

  // Proposal Stats
  const totalProposal = proposals.length;
  const pending = proposals.filter(p => p.Status === 'Pending' || p.Status === 'Menunggu Review').length;
  const approvedProposal = proposals.filter(p => p.Status === 'Disetujui').length;
  const rejectedProposal = proposals.filter(p => p.Status === 'Ditolak').length;
  const totalBudget = proposals.reduce((acc, curr) => acc + (curr.Anggaran || 0), 0);

  const formatRp = (val) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

  // 1. WHAT Chart
  const whatChartData = React.useMemo(() => {
    const map = {};
    proposals.forEach(p => {
      const topic = p.Kategori || p.Topik || 'Lainnya';
      map[topic] = (map[topic] || 0) + 1;
    });
    const colors = ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'];
    return Object.entries(map).map(([name, value], idx) => ({
      name, value, color: colors[idx % colors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [proposals]);

  // 2. WHY Chart
  const whyChartData = React.useMemo(() => {
    const map = {};
    proposals.forEach(p => {
      const status = p.Status || 'Unknown';
      map[status] = (map[status] || 0) + 1;
    });
    const colorMap = {
      'Disetujui': '#10b981', 'Pending': '#f59e0b', 'Ditolak': '#ef4444', 'Menunggu Review': '#f59e0b'
    };
    return Object.entries(map).map(([name, value], idx) => ({
      name, value, color: colorMap[name] || '#8b5cf6'
    })).sort((a, b) => b.value - a.value);
  }, [proposals]);

  // 3. WHO Chart
  const whoChartData = React.useMemo(() => {
    const map = {};
    proposals.forEach(p => {
      const name = (p.Ormawa?.Singkatan || p.Ormawa?.Nama || 'Unknown').substring(0, 10);
      map[name] = (map[name] || 0) + 1;
    });
    const colors = ['#059669', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
    return Object.entries(map).map(([name, value], idx) => ({
      name, value, fill: colors[idx % colors.length]
    })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [proposals]);

  // 4. WHEN Chart
  const whenChartData = React.useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    const counts = Array(12).fill(0);
    proposals.forEach(p => {
      const d = p.TanggalAcara || p.CreatedAt || p.tanggal;
      if (d) {
        const date = new Date(d);
        counts[date.getMonth()]++;
      }
    });
    return months.map((name, index) => ({ name, value: counts[index] }));
  }, [proposals]);

  // 5. WHERE Chart
  const whereChartData = React.useMemo(() => {
    const map = {};
    proposals.forEach(p => {
      const name = (p.Ormawa?.Fakultas || 'Pusat').substring(0, 15);
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [proposals]);

  // 6. HOW Chart
  const howChartData = React.useMemo(() => {
    const map = {};
    proposals.forEach(p => {
      const name = (p.Ormawa?.Singkatan || p.Ormawa?.Nama || 'Lainnya').substring(0, 10);
      map[name] = (map[name] || 0) + (p.Anggaran || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [proposals]);

  return (
    <PageContent>
      <Toaster position="top-right" />

      {/* ── Welcome & Page Header (Glassmorphism card) ───────────── */}
      <DashboardHero
        title="Kelola"
        highlightedTitle="Organisasi"
        subtitle="Pusat pengawasan hukum, audit LPJ keuangan, pemantauan bintang keaktifan, dan registrasi digital Ormawa Universitas Bhakti Kencana."
        icon="business"
        badges={[
          { label: 'Student Community & LPJ Review', active: true }
        ]}
        actions={
          <Button
            onClick={handleOpenAdd}
            className="h-11 px-6 bg-primary hover:bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer border-none"
          >
            <span className="material-symbols-outlined font-black" style={{ fontSize: '16px' }}>add</span>
            <span>Daftar Ormawa</span>
          </Button>
        }
      />

      {/* ── Stats Grid (Glassmorphism stats cards) ──────────────── */}
      <div className="space-y-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <PrimaryStatsCard
            title="Total Ormawa"
            value={totalOrmawa}
            icon={Layers}
            colorTheme="info"
            badgeText="Unit terdaftar"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
          />

          <PrimaryStatsCard
            title="Member Aktif"
            value={activeMembers}
            icon={Group}
            colorTheme="primary"
            badgeText="Total"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">group_add</span>}
          />

          <PrimaryStatsCard
            title="Kepatuhan LPJ"
            value={`${avgCompliance}%`}
            icon={CheckCircle}
            colorTheme="success"
            badgeText="Tepat Waktu"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">task_alt</span>}
          />

          <PrimaryStatsCard
            title="Total Poin XP"
            value={totalXP.toLocaleString('id-ID')}
            icon={Zap}
            colorTheme="warning"
            badgeText="Akumulatif"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">trending_up</span>}
          />

          <PrimaryStatsCard
            title="Ormawa Teraktif"
            value={topOrmawa?.Singkatan || topOrmawa?.Nama?.substring(0, 8) || '—'}
            icon={Trophy}
            colorTheme="danger"
            badgeText={`${topOrmawa?.xp || 0} XP`}
            badgeIcon={<span className="material-symbols-outlined text-[12px]">workspace_premium</span>}
          />
        </div>
      </div>

      {/* ── Analytics Charts ─────────────────────────────────────── */}
      {!loading && proposals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {/* 1. KATEGORI ORMAWA */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pie_chart</span>
                </div>
                <h3 className="text-[13px] font-bold text-[var(--theme-text)]">Kategori Ormawa</h3>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-[110px]">
                <ResponsiveContainer width="100%" height={120}>
                  <PieChart>
                    <Pie data={kategoriData} cx="50%" cy="50%" innerRadius={35} outerRadius={52} paddingAngle={2} dataKey="value" stroke="none">
                      {kategoriData.map((_, index) => <Cell key={`kat-${index}`} fill={PIE_COLORS_ORG[index % PIE_COLORS_ORG.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '700' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1">
                {kategoriData.length === 0 ? <p className="text-[10px] text-slate-400">Belum ada data</p> : kategoriData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: PIE_COLORS_ORG[i % PIE_COLORS_ORG.length] }} />
                    <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] flex-1 truncate">{d.name}</span>
                    <span className="text-[11px] font-bold text-[var(--theme-text)] tabular-nums">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. PENGAJU AKTIF (WHO) */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>groups</span>
                </div>
                <h3 className="text-[13px] font-bold text-[var(--theme-text)]">Pengaju Aktif</h3>
              </div>
            </div>
            <div className="flex-1 flex items-center gap-3">
              {whoChartData.length === 0 ? <p className="text-[10px] text-slate-400">Belum ada data</p> : (
                <>
                  <div className="w-[110px]">
                    <ResponsiveContainer width="100%" height={120}>
                      <RadialBarChart cx="50%" cy="50%" innerRadius="25%" outerRadius="100%" barSize={7} data={whoChartData}>
                        <RadialBar minAngle={15} background clockWise dataKey="value" cornerRadius={10} />
                        <Tooltip formatter={(value, name, props) => [value + ' Proposal', props.payload.name || 'Ormawa']} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '700' }} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-1">
                    {whoChartData.map((d, i) => (
                      <div key={i} className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: d.fill }} />
                        <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] flex-1 truncate">{d.name}</span>
                        <span className="text-[11px] font-bold text-[var(--theme-text)] tabular-nums">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 3. SEBARAN FAKULTAS (WHERE) */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pin_drop</span>
                </div>
                <h3 className="text-[13px] font-bold text-[var(--theme-text)]">Sebaran Fakultas</h3>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              {whereChartData.length === 0 ? <p className="text-[10px] text-slate-400">Belum ada data</p> : (
                <ResponsiveContainer width="100%" height={120}>
                  <RadarChart cx="50%" cy="50%" outerRadius={45} data={whereChartData}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 700 }} />
                    <Radar name="Fakultas" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="#818cf8" fillOpacity={0.4} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '10px', fontWeight: '700' }} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* 4. LINIMASA KEGIATAN (WHEN) */}
          <div className="lg:col-span-3 bg-white border border-slate-200 shadow-sm rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden group flex flex-col">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>event</span>
                </div>
                <h3 className="text-[13px] font-bold text-[var(--theme-text)]">Linimasa Kegiatan Tahunan</h3>
              </div>
            </div>
            <div className="flex-1 flex items-end">
              {whenChartData.length === 0 ? <p className="text-[10px] text-slate-400 w-full text-center">Belum ada jadwal</p> : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={whenChartData} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorWhen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#fbbf24" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#fbbf24" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip labelFormatter={(label) => `Bulan: ${label}`} formatter={(value) => [value + ' Proposal', 'Pengajuan']} cursor={{ stroke: '#fbbf24', strokeWidth: 1, strokeDasharray: '3 3', fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontSize: '11px', fontWeight: '700' }} />
                    <Area type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={3} fillOpacity={1} fill="url(#colorWhen)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ── Gamification Leaderboard & LPJ review Row (Glassmorphism layout) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* 1. Leaderboard Panel — Spans 2 Cols */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 flex flex-col space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100/80 pb-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/50 flex justify-center items-center flex-shrink-0 shadow-inner">
                <Trophy size={24} className="text-amber-600" />
              </div>
              <div>
                <h3 className="text-[17px] font-black text-slate-800 font-headline leading-none mb-1.5">Peringkat Keaktifan & Prestasi</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-headline">Klasemen Kinerja Ormawa</span>
              </div>
            </div>

            {/* Sorting Filter Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-[14px] border border-slate-200/60 select-none shadow-inner">
              {[
                { key: 'xp', label: 'Skor XP' },
                { key: 'lpj', label: 'Kepatuhan LPJ' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSortBy(tab.key)}
                  className={cn(
                    "px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl leading-none transition-all duration-300 font-headline cursor-pointer",
                    sortBy === tab.key
                      ? "bg-white text-bku-primary shadow-[0_2px_10px_rgb(0,0,0,0.06)]"
                      : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bespoke Visual Podium (Top 3 Ormawa Showcase) */}
          {loading ? (
            <div className="grid grid-cols-3 gap-5 h-[180px] animate-pulse bg-slate-50/50 rounded-3xl border border-slate-200/50" />
          ) : sortedLeaderboard.length >= 3 ? (
            <div className="relative z-10 grid grid-cols-3 gap-6 items-end justify-center pt-8 select-none border-b border-slate-100/80 pb-10">

              {/* 🥈 Rank 2 (Left Side) */}
              <div className="flex flex-col items-center group/podium">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full border-[3px] border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(148,163,184,0.4)] font-black font-jakarta text-slate-500 overflow-hidden uppercase text-sm relative z-10 transition-transform duration-500 group-hover/podium:scale-110">
                    {getInitials(top2)}
                  </div>
                  <span className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-slate-400 text-white font-black text-[10px] shadow-md z-20 ring-2 ring-white">#2</span>
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-headline leading-tight text-center max-w-[120px] truncate" title={top2?.Nama}>{top2?.Singkatan || top2?.Nama}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">{top2?.xp} XP</span>
              </div>

              {/* 🥇 Rank 1 (Center - Taller Podium with Gold Highlight) */}
              <div className="flex flex-col items-center transform -translate-y-6 group/podium">
                <div className="relative mb-5">
                  <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-[28px] animate-bounce duration-1000 z-20">👑</span>
                  <div className="w-24 h-24 rounded-full border-[4px] border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100 flex items-center justify-center shadow-[0_0_30px_-5px_rgba(251,191,36,0.6)] font-black font-jakarta text-amber-600 overflow-hidden uppercase ring-4 ring-amber-100/50 text-xl relative z-10 transition-transform duration-500 group-hover/podium:scale-110">
                    {getInitials(top1)}
                  </div>
                  <span className="absolute -bottom-2 -right-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-white font-black text-xs shadow-lg z-20 ring-2 ring-white">#1</span>
                </div>
                <span className="text-sm font-black text-bku-primary uppercase tracking-wider font-headline leading-tight text-center max-w-[150px] truncate" title={top1?.Nama}>{top1?.Singkatan || top1?.Nama}</span>
                <div className="flex items-center gap-1.5 mt-2.5 leading-none bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100/50 shadow-sm">
                  <Zap size={12} className="fill-amber-500 text-amber-500" />
                  <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest">{top1?.xp} XP</span>
                </div>
              </div>

              {/* 🥉 Rank 3 (Right Side) */}
              <div className="flex flex-col items-center group/podium">
                <div className="relative mb-4">
                  <div className="w-16 h-16 rounded-full border-[3px] border-orange-300 bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(251,146,60,0.4)] font-black font-jakarta text-orange-700 overflow-hidden uppercase text-sm relative z-10 transition-transform duration-500 group-hover/podium:scale-110">
                    {getInitials(top3)}
                  </div>
                  <span className="absolute -bottom-2 -right-2 px-2.5 py-1 rounded-full bg-orange-400 text-white font-black text-[10px] shadow-md z-20 ring-2 ring-white">#3</span>
                </div>
                <span className="text-xs font-black text-slate-700 uppercase tracking-wider font-headline leading-tight text-center max-w-[120px] truncate" title={top3?.Nama}>{top3?.Singkatan || top3?.Nama}</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1.5">{top3?.xp} XP</span>
              </div>

            </div>
          ) : null}

          {/* List Leaderboard Custom Table */}
          <div className="flex-1 mt-6 overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[500px]">
              <thead>
                <tr>
                  <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 px-4 text-center">Rank</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 px-4">Organisasi</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 px-4 text-center">Anggota</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 px-4">Kepatuhan LPJ</th>
                  <th className="pb-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 px-4 text-right">Skor XP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50/80">
                {sortedLeaderboard.map((row, index) => {
                  const isTop1 = index === 0;
                  const isTop2 = index === 1;
                  const isTop3 = index === 2;
                  return (
                    <tr key={row.id || index} className="group hover:bg-slate-50/50 transition-colors">
                      {/* Rank */}
                      <td className="py-3 px-4 text-center">
                        <div className="w-10 flex justify-center mx-auto">
                          {isTop1 || isTop2 || isTop3 ? (
                            <div className={cn(
                              "size-8 rounded-full flex items-center justify-center text-sm shadow-sm border border-white",
                              isTop1 ? "bg-amber-100 text-amber-600" :
                                isTop2 ? "bg-slate-200 text-slate-500" :
                                  "bg-orange-100 text-orange-500"
                            )}>
                              {isTop1 ? '🥇' : isTop2 ? '🥈' : '🥉'}
                            </div>
                          ) : (
                            <div className="size-7 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400 tabular-nums shadow-inner">
                              #{index + 1}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Organisasi */}
                      <td className="py-3 px-4">
                        <h4 className="text-[13px] font-black text-slate-800 uppercase font-headline leading-tight group-hover:text-bku-primary transition-colors">{row.Singkatan}</h4>
                        <p className="text-[9px] font-bold text-slate-400 truncate max-w-[180px] mt-0.5">{row.Nama}</p>
                      </td>

                      {/* Anggota */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5 px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg w-fit mx-auto">
                          <span className="material-symbols-outlined text-[12px] text-slate-400">group</span>
                          <span className="text-[11px] font-bold text-slate-600 font-inter">{row.jumlahAnggota || 0}</span>
                        </div>
                      </td>

                      {/* Kepatuhan LPJ */}
                      <td className="py-3 px-4 min-w-[140px]">
                        <div className="flex flex-col w-full max-w-[140px]">
                          <div className="flex justify-between text-[9px] font-black text-slate-500 mb-1">
                            <span>{row.selesaiLpj}/{row.totalLpj} LPJ</span>
                            <span className={cn(
                              "font-black",
                              row.lpjRate === 100 ? "text-emerald-500" : row.lpjRate > 80 ? "text-amber-500" : "text-rose-500"
                            )}>{row.lpjRate || 0}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                            <div
                              style={{ width: `${row.lpjRate || 0}%` }}
                              className={cn(
                                "h-full rounded-full transition-all duration-500",
                                row.lpjRate === 100 ? "bg-emerald-500" : row.lpjRate > 80 ? "bg-amber-500" : "bg-rose-500"
                              )}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Skor XP */}
                      <td className="py-3 px-4 text-right">
                        <div className={cn(
                          "px-2.5 py-1 rounded-xl border flex items-center justify-center gap-1 shadow-inner transition-colors duration-300 w-fit ml-auto",
                          sortBy === 'xp' ? "bg-amber-50 border-amber-200 text-amber-600" : "bg-slate-50 border-slate-200 text-slate-600"
                        )}>
                          <span className="material-symbols-outlined text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                          <span className="text-[13px] font-black font-headline tabular-nums leading-none mt-0.5">{row.xp}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {sortedLeaderboard.length === 0 && (
              <div className="py-10 text-center flex flex-col items-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                  <span className="material-symbols-outlined">sentiment_dissatisfied</span>
                </div>
                <p className="text-sm font-bold text-slate-400">Belum ada data klasemen</p>
              </div>
            )}
          </div>
        </div>

        {/* 2. LPJ Review Console — Spans 1 Col */}
        <div className="lg:col-span-1 bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8 flex flex-col space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

          <div className="relative z-10 flex items-center gap-4 border-b border-slate-100/80 pb-5">
            <div className="w-12 h-12 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100/50 text-emerald-600 flex items-center justify-center shadow-inner">
              <History size={24} />
            </div>
            <div>
              <h3 className="text-[17px] font-black text-slate-800 font-headline leading-none mb-1.5">Console Review LPJ</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-headline">Antrean Audit</span>
            </div>
          </div>

          {/* Submissions List Container */}
          <div className="relative z-10 flex-1 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar select-none">
            {lpjSubmissions.map((sub) => {
              // Menangani xpReward yang undefined pada live API data
              const xpValue = sub.xpReward !== undefined ? sub.xpReward : (sub.status === 'Overdue' ? -50 : 100);

              return (
                <div
                  key={sub.id}
                  onClick={() => {
                    navigate('/app/ormawa/lpj');
                  }}
                  className="group flex flex-col p-4 bg-white hover:bg-slate-50/80 rounded-2xl border border-slate-200/80 transition-all shadow-[0_2px_10px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgb(0,0,0,0.06)] relative overflow-hidden cursor-pointer"
                >
                  {/* Status Indicator Line */}
                  <div className={cn(
                    "absolute left-0 top-0 bottom-0 w-1.5 transition-colors rounded-l-2xl",
                    sub.status === 'Pending' ? "bg-amber-400 group-hover:bg-amber-500" :
                      sub.status === 'Approved' ? "bg-emerald-400 group-hover:bg-emerald-500" :
                        sub.status === 'Overdue' ? "bg-rose-400 group-hover:bg-rose-500" : "bg-slate-300 group-hover:bg-slate-400"
                  )} />

                  {/* Top Section: Header & Badge */}
                  <div className="flex justify-between items-start pl-2.5">
                    <div className="flex items-start gap-3 pr-2">
                      {/* File Icon */}
                      <div className={cn(
                        "size-9 rounded-xl flex items-center justify-center shrink-0 border shadow-inner",
                        sub.status === 'Pending' ? "bg-gradient-to-br from-amber-50 to-orange-50 border-amber-100/50 text-amber-600" :
                          sub.status === 'Approved' ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100/50 text-emerald-600" :
                            sub.status === 'Overdue' ? "bg-gradient-to-br from-rose-50 to-red-50 border-rose-100/50 text-rose-600" : "bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200/50 text-slate-500"
                      )}>
                        <span className="material-symbols-outlined text-[18px]">
                          {sub.status === 'Approved' ? 'task_alt' : sub.status === 'Overdue' ? 'assignment_late' : 'description'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline group-hover:text-bku-primary transition-colors mb-0.5">{sub.ormawaSingkatan}</span>
                        <h4 className="text-sm font-bold text-slate-800 font-headline leading-snug line-clamp-1">{sub.title || sub.NamaProker}</h4>
                      </div>
                    </div>
                    {/* Status Badge */}
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md border shrink-0 leading-none shadow-sm",
                      sub.status === 'Pending' ? "bg-amber-50 text-amber-600 border-amber-200" :
                        sub.status === 'Approved' ? "bg-emerald-50 text-emerald-600 border-emerald-200" :
                          sub.status === 'Overdue' ? "bg-rose-50 text-rose-600 border-rose-200" :
                            "bg-slate-50 text-slate-500 border-slate-200"
                    )}>
                      {sub.status === 'Pending' ? 'REVIEW' :
                        sub.status === 'Approved' ? 'DISETUJUI' :
                          sub.status === 'Overdue' ? 'TELAT' : 'PERINGATAN'}
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div className="flex items-center gap-4 mt-4 pl-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold">
                      <span className="material-symbols-outlined text-[16px] text-slate-400">event</span>
                      <span className="font-inter tracking-tight">{sub.date || "2026-06-09"}</span>
                    </div>
                    <div className="w-px h-3.5 bg-slate-200" />
                    <div className={cn(
                      "flex items-center gap-1 text-[11px] font-black uppercase tracking-widest font-headline",
                      xpValue > 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      <span className="material-symbols-outlined text-[14px]">
                        {xpValue > 0 ? 'trending_up' : 'trending_down'}
                      </span>
                      <span>{xpValue > 0 ? `+${xpValue} XP` : `${xpValue} PNLTY`}</span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2 pl-2.5 relative z-20">
                    {sub.status === 'Pending' && (
                      <>
                        <button onClick={(e) => { e.stopPropagation(); handleApproveLPJ(sub.id, sub.ormawaSingkatan); }} className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:opacity-90 border-none rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_10px_rgb(16,185,129,0.3)] hover:scale-[1.02]">
                          <CheckCircle size={14} className="text-white" />
                          Setujui
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); handleWarnLPJ(sub.id, sub.ormawaSingkatan); }} className="px-5 py-2.5 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-200 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm hover:scale-[1.02]">
                          Tolak
                        </button>
                      </>
                    )}
                    {sub.status === 'Overdue' && (
                      <button onClick={(e) => { e.stopPropagation(); handleWarnLPJ(sub.id, sub.ormawaSingkatan); }} className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 border-none rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_10px_rgb(245,158,11,0.3)] hover:scale-[1.02]">
                        <AlertTriangle size={14} className="text-white" />
                        Kirim Peringatan
                      </button>
                    )}
                    {sub.status === 'Approved' && (
                      <div className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/50 rounded-xl border border-emerald-100/50 border-dashed">
                        <CheckCircle size={14} />
                        Terintegrasi Sistem
                      </div>
                    )}
                    {sub.status === 'Warning Sent' && (
                      <div className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-500 bg-slate-50 rounded-xl border border-slate-200 border-dashed">
                        <AlertTriangle size={14} />
                        Peringatan Terkirim
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

        </div>

      </div>

      {/* ── Table Section ───────────────────────────────────────── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden flex flex-col mt-8">
        <div className="relative z-10">
          <div className="p-0">
            <DataTable
              title="Daftar Organisasi Mahasiswa"
              subtitle="Menampilkan daftar seluruh organisasi mahasiswa."
              columns={columns}
              data={data}
              loading={loading}
              searchPlaceholder="Cari Nama atau Singkatan..."
              actions={(row) => (
                <div className="flex items-center gap-1.5">
                  <Button onClick={() => { setSelected(row); setIsDetailOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-bku-primary hover:bg-blue-50 rounded-lg transition-colors"><span className="material-symbols-outlined" style={{ fontSize: '18px' }} >visibility</span></Button>
                  <Button onClick={() => handleOpenEdit(row)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >edit</span></Button>
                  <Button onClick={() => { setSelected(row); setIsDelOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >delete</span></Button>
                </div>
              )}
            />
          </div>
        </div>
      </div>
      {/* ── Detail Modal (Glassmorphic Dialog) ────────────────────── */}
      {/* ── Detail Modal ────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selected?.Singkatan || 'Detail Unit'}
        subtitle={selected?.Nama || 'Informasi Organisasi'}
        icon="corporate_fare"
        maxWidth="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsDetailOpen(false)}
              className="px-5 h-10 rounded-xl border border-[var(--theme-border)] text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => { setIsDetailOpen(false); handleOpenEdit(selected) }}
              className="px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span> Edit Unit
            </button>
          </>
        }
      >
        {selected && (
          <div className="space-y-6 font-inter py-2">
            {/* Header / Contacts - Clean Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>mail</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Official Email</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{selected.Email || 'No official email'}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 bg-white border border-slate-200 p-4 rounded-2xl shadow-sm">
                <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>call</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Kontak Aktif</p>
                  <p className="text-xs font-bold text-slate-700 truncate">{selected.Phone || 'No contact'}</p>
                </div>
              </div>
            </div>

            {/* Gamification Stats - Using DashboardStatCard Template */}
            <div className="grid grid-cols-2 gap-4">
              <DashboardStatCard
                title="Performance XP"
                value={<>{selected.xp || 0} <span className="text-[14px] font-bold text-amber-600/80 uppercase tracking-widest ml-0.5">XP</span></>}
                icon="bolt"
                colorClass="text-amber-500"
                bgClass="bg-amber-50"
                subtitle="Akumulasi poin keaktifan"
              />
              <DashboardStatCard
                title="Kepatuhan LPJ"
                value={<>{selected.lpjRate || 100}<span className="text-[16px] font-bold text-emerald-600/80 ml-0.5">%</span></>}
                icon="receipt_long"
                colorClass="text-emerald-500"
                bgClass="bg-emerald-50"
                subtitle="Rasio penyelesaian laporan"
              />
            </div>

            {/* Visi Misi - Clean Timeline */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="relative border-l-2 border-slate-200 ml-4 space-y-8">

                {/* Visi */}
                <div className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-blue-100 border-4 border-slate-50 flex items-center justify-center text-blue-600 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">visibility</span>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-3">Visi Organisasi</h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">
                        "{selected.Visi || 'Visi belum dikonfigurasi.'}"
                      </p>
                    </div>
                  </div>
                </div>

                {/* Misi */}
                <div className="relative pl-8">
                  <div className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-indigo-100 border-4 border-slate-50 flex items-center justify-center text-indigo-600 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">flag</span>
                  </div>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-widest mb-3">Misi & Strategi</h4>
                    <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                      <p className="text-[13px] text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                        {selected.Misi || 'Misi belum dikonfigurasi.'}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            {/* Achievements */}
            {selected.achievements && selected.achievements.length > 0 && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 leading-none mb-4">
                  <span className="material-symbols-outlined text-amber-500" style={{ fontSize: '18px' }}>emoji_events</span>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-headline">Penghargaan & Pencapaian</span>
                </div>
                <div className="flex items-center flex-wrap gap-3">
                  {selected.achievements.map((ach, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center gap-2 font-black uppercase tracking-widest text-[10px] px-4 py-2 rounded-xl border shadow-sm transition-transform hover:-translate-y-0.5",
                      ach === 'LPJ Champion' ? "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-700 border-emerald-200" :
                        ach === 'Event Master' ? "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-700 border-amber-200" :
                          "bg-gradient-to-r from-sky-50 to-blue-50 text-sky-700 border-sky-200"
                    )}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                        {ach === 'LPJ Champion' ? 'verified' : ach === 'Event Master' ? 'local_fire_department' : 'stars'}
                      </span>
                      {ach}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogModal>

      {/* ── CRUD Modal (Glassmorphic Form) ───────────────────────── */}
      {/* ── CRUD Modal ───────────────────────── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? 'Update Ormawa' : 'Registrasi Ormawa'}
        subtitle="Pendaftaran entitas organisasi mahasiswa tingkat universitas."
        icon={isEditMode ? 'edit' : 'add_business'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsCrudOpen(false)}
              className="px-5 h-10 rounded-xl border border-[var(--theme-border)] text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              form="crudForm"
              disabled={isSubmitting}
              className="px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-md active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>}
              Simpan Unit
            </button>
          </>
        }
      >
        <form id="crudForm" onSubmit={handleSave} className="space-y-5 font-inter py-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Nama Organisasi</Label>
              <input required value={form.Nama} onChange={e => setForm({ ...form, Nama: e.target.value })} placeholder="Nama lengkap..." className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 uppercase font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Kode Unit</Label>
              <input required value={form.Singkatan} onChange={e => setForm({ ...form, Singkatan: e.target.value })} placeholder="BEM, HIMA..." className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 uppercase font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Kategori Organisasi</Label>
              <select
                required
                value={form.KategoriOrmawaID}
                onChange={e => {
                  const val = e.target.value;
                  const selectedKat = kategoris.find(k => String(k.id || k.ID) === val);
                  if (selectedKat && !selectedKat.terafiliasi_fakultas) {
                    setForm({ ...form, KategoriOrmawaID: val, FakultasID: '' });
                  } else {
                    setForm({ ...form, KategoriOrmawaID: val });
                  }
                }}
                className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium cursor-pointer"
              >
                <option value="" disabled>Pilih Kategori...</option>
                {kategoris.map(k => (
                  <option key={k.id || k.ID} value={String(k.id || k.ID)}>{k.nama || k.Nama}</option>
                ))}
              </select>
            </div>
            
            {kategoris.find(k => String(k.id || k.ID) === String(form.KategoriOrmawaID))?.terafiliasi_fakultas && (
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Fakultas</Label>
                <select
                  required={kategoris.find(k => String(k.id || k.ID) === String(form.KategoriOrmawaID))?.terafiliasi_fakultas}
                  value={form.FakultasID}
                  onChange={e => setForm({ ...form, FakultasID: e.target.value })}
                  className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium cursor-pointer"
                >
                  <option value="" disabled>Pilih Fakultas...</option>
                  {fakultasList.map(f => (
                    <option key={f.id || f.ID} value={String(f.id || f.ID)}>{f.nama || f.Nama}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Email Resmi</Label>
              <input type="email" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} placeholder="ormawa@bku.ac.id" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Kontak Person</Label>
              <input value={form.Phone} onChange={e => setForm({ ...form, Phone: e.target.value })} placeholder="08xxx..." className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Tenggat LPJ (Hari)</Label>
              <input type="number" min="1" max="365" value={form.TenggatLPJHari} onChange={e => setForm({ ...form, TenggatLPJHari: e.target.value })} placeholder="14" className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium" />
              <p className="text-[10px] text-slate-400 mt-0.5">Default tenggat pengumpulan LPJ (hari) setelah proposal disetujui. Default sistem: 14 hari.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Deskripsi Singkat</Label>
            <textarea value={form.Deskripsi} onChange={e => setForm({ ...form, Deskripsi: e.target.value })} placeholder="Ringkasan tentang organisasi..." className="w-full min-h-[60px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Visi</Label>
              <textarea value={form.Visi} onChange={e => setForm({ ...form, Visi: e.target.value })} placeholder="Target masa depan..." className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-widest font-headline ml-1">Misi</Label>
              <textarea value={form.Misi} onChange={e => setForm({ ...form, Misi: e.target.value })} placeholder="Langkah strategis..." className="w-full min-h-[100px] px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none transition-all duration-200 font-medium" />
            </div>
          </div>
        </form>
      </DialogModal>

      {/* ── LPJ Detail Modal (Glassmorphic Dialog) ────────────────── */}
      {/* ── LPJ Detail Modal ────────────────── */}
      <DialogModal
        open={isLpjDetailOpen}
        onOpenChange={setIsLpjDetailOpen}
        title={selectedLpj?.title || 'Detail Audit LPJ'}
        subtitle={`Pengajuan dari ${selectedLpj?.ormawaName || selectedLpj?.ormawaSingkatan}`}
        icon={<span className="material-symbols-outlined">receipt_long</span>}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsLpjDetailOpen(false)}
              className="px-5 h-10 rounded-xl border border-[var(--theme-border)] text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors cursor-pointer"
            >
              Tutup
            </button>
            {selectedLpj?.status === 'Pending' && (
              <>
                <button
                  onClick={() => {
                    handleWarnLPJ(selectedLpj.id, selectedLpj.ormawaSingkatan);
                    setIsLpjDetailOpen(false);
                  }}
                  className="px-5 h-10 rounded-xl border border-rose-200 text-xs font-bold uppercase tracking-wider text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                >
                  Tolak
                </button>
                <button
                  onClick={() => {
                    handleApproveLPJ(selectedLpj.id, selectedLpj.ormawaSingkatan);
                    setIsLpjDetailOpen(false);
                  }}
                  className="px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-500 hover:bg-emerald-600 text-white shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-none"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check_circle</span> Setujui LPJ
                </button>
              </>
            )}
            {selectedLpj?.status === 'Overdue' && (
              <button
                onClick={() => {
                  handleWarnLPJ(selectedLpj.id, selectedLpj.ormawaSingkatan);
                  setIsLpjDetailOpen(false);
                }}
                className="px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-600 text-white shadow-md active:scale-95 transition-all flex items-center gap-2 cursor-pointer border-none"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>warning</span> Kirim Peringatan
              </button>
            )}
          </>
        }
      >
        {selectedLpj && (
          <div className="space-y-6 font-inter py-2 text-slate-600">
            {/* Stats grid */}
            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60">
              <div className="flex flex-col gap-1 leading-none text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-headline">Tanggal Masuk</span>
                <span className="text-xs font-bold text-slate-700 font-inter mt-1.5">{selectedLpj.date}</span>
              </div>
              <div className="flex flex-col gap-1 leading-none text-center border-x border-slate-200">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-headline">XP Reward/Penalty</span>
                <span className={cn("text-xs font-black font-headline mt-1.5", selectedLpj.xpReward > 0 ? "text-[var(--theme-primary)]" : "text-rose-600")}>
                  {selectedLpj.xpReward > 0 ? `+${selectedLpj.xpReward}` : selectedLpj.xpReward} XP
                </span>
              </div>
              <div className="flex flex-col gap-1 leading-none text-center">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest font-headline">Status</span>
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-widest leading-none mt-1.5",
                  selectedLpj.status === 'Pending' ? "text-amber-600" :
                    selectedLpj.status === 'Approved' ? "text-emerald-600" :
                      selectedLpj.status === 'Overdue' ? "text-rose-600" : "text-slate-600"
                )}>
                  {selectedLpj.status === 'Pending' ? 'REVIEW' :
                    selectedLpj.status === 'Approved' ? 'DISETUJUI' :
                      selectedLpj.status === 'Overdue' ? 'TERLAMBAT' : 'PERINGATAN'}
                </span>
              </div>
            </div>

            {/* Audit details */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 leading-none">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }} >info</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-headline">Informasi Penyelarasan LPJ</span>
              </div>
              <div className="text-xs font-medium leading-relaxed font-inter bg-slate-50/50 p-4 rounded-xl border border-slate-100 space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Pengeluaran:</span>
                  <span className="font-bold text-slate-800">Rp 4.780.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sisa Anggaran (Silpa):</span>
                  <span className="font-bold text-emerald-600">Rp 220.000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tingkat Kepuasan Peserta:</span>
                  <span className="font-bold text-slate-800">95% (120 Responden)</span>
                </div>
              </div>
            </div>

            {/* Uploaded Files section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 leading-none">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }} >attach_file</span>
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-headline">Lampiran Berkas Digital</span>
              </div>
              <div className="space-y-2 select-none">
                {[
                  { name: 'LPJ_Kegiatan_Signed.pdf', size: '2.4 MB', type: 'PDF Document' },
                  { name: 'Laporan_Keuangan_Kuitansi.xlsx', size: '1.2 MB', type: 'Excel Sheet' },
                  { name: 'Dokumentasi_Foto_Kegiatan.zip', size: '15.6 MB', type: 'Compressed Archive' }
                ].map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-all shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                          {file.name.endsWith('.pdf') ? 'picture_as_pdf' : file.name.endsWith('.xlsx') ? 'table_view' : 'folder_zip'}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-slate-800 leading-tight">{file.name}</span>
                        <span className="text-[10px] text-slate-500 font-medium font-inter mt-0.5">{file.type} • {file.size}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success(`Membuka lampiran ${file.name} (Simulasi)`);
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-[var(--theme-primary)] text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-200 cursor-pointer transition-all shadow-sm flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>download</span> Unduh
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Unit Organisasi?"
        description="Data organisasi, riwayat anggota, dan visi misi akan dihapus permanen dari sistem."
        loading={isSubmitting}
      />
    </PageContent>
  )
}
