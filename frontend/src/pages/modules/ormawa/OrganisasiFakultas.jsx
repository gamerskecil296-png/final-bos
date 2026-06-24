"use client"

import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast, Toaster } from 'react-hot-toast'

import { cn } from '@/lib/utils'
import { API_BASE_URL, adminService } from '@/services/api'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { DeleteConfirmModal } from "@/components/ui/DeleteConfirmModal"
import { DialogModal, ModalCancelButton, ModalSaveButton } from "@/components/ui/DialogModal"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import DataTable from '@/components/ui/DataTable'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Users2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>groups</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const CheckCircle2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const ShieldCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified_user</span>;



const API = "/app/dashboard"
const EMPTY_FORM = { kode_org: '', nama_org: '', ketua_nama: '', KetuaID: null, jumlah_anggota: 0, status: 'Aktif', KategoriOrmawaID: '', email: '', password: '', phone: '', fakultas_id: '' }

export default function FacultyOrganisasi() {
  const [organizations, setOrgs] = useState([])
  const [students, setStudents] = useState([])
  const [faculties, setFaculties] = useState([])
  const [kategoris, setKategoris] = useState([])
  const [periodsList, setPeriodsList] = useState([])
  const [loading, setLoading] = useState(true)
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isSuperAdmin = user.role === 'super_admin' || user.role === 'kencana_admin'
  const [showModal, setModal] = useState(false)
  const [editingOrg, setEdit] = useState(null)
  const [isSubmitting, setIsSub] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [filterPeriode, setFilterPeriode] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortConfig, setSortConfig] = useState({ key: 'kode', direction: 'asc' })
  const [studentSearch, setStudentSearch] = useState('')
  const [isStudentDropdownOpen, setIsStudentDropdownOpen] = useState(false)
  const [fakultasSearch, setFakultasSearch] = useState('')
  const [isFakultasDropdownOpen, setIsFakultasDropdownOpen] = useState(false)

  const filteredFaculties = useMemo(() => {
    if (!fakultasSearch || fakultasSearch === '-- Tingkat Universitas --') return faculties
    return faculties.filter(f => (f.nama || f.Nama)?.toLowerCase().includes(fakultasSearch.toLowerCase()))
  }, [faculties, fakultasSearch])

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const q = studentSearch.toLowerCase()
      const studentName = (s.Pengguna?.nama_lengkap || s.nama || s.Nama || '').toLowerCase()
      const studentNim = (s.nim || s.NIM || '').toLowerCase()
      return !q || studentName.includes(q) || studentNim.includes(q)
    })
  }, [students, studentSearch])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API}/organizations`)
      const data = res.data
      const mapped = Array.isArray(data.data) ? data.data.map(item => ({
        id: item.id || item.ID, nama: item.Nama, kode: item.Singkatan || item.Kode || '',
        status: item.Status || 'Aktif', kategori: item.kategori_detail?.nama || item.KategoriDetail?.Nama || item.Kategori || '',
        kategori_ormawa_id: item.KategoriOrmawaID || item.kategori_ormawa_id || '',
        jumlah_anggota: item.JumlahAnggota || 0, deskripsi: item.Deskripsi || '',
        email: item.Email || '', phone: item.Phone || '', CreatedAt: item.CreatedAt || item.created_at || null
      })) : []
      setOrgs(mapped)

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

      const stdRes = await axios.get('/app/dashboard/students')
      setStudents(stdRes.data.data || [])

      try {
        const katRes = await axios.get(`${API}/ormawa-kategori`)
        if (katRes && katRes.data) {
          setKategoris(katRes.data.data || katRes.data)
        }
      } catch (e) { console.error('Failed to load kategori', e) }

      if (isSuperAdmin) {
        const facRes = await axios.get('/app/dashboard/fakultas')
        setFaculties(facRes.data.data || [])
      }
    } catch { toast.error('Gagal mengambil data organisasi') }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSub(true)
    const payload = { Nama: formData.nama_org, Singkatan: formData.kode_org, Status: formData.status, JumlahAnggota: parseInt(formData.jumlah_anggota) || 0, Deskripsi: formData.ketua_nama, Email: formData.email, Password: formData.password, Phone: formData.phone }

    if (formData.KategoriOrmawaID) {
      payload.KategoriOrmawaID = parseInt(formData.KategoriOrmawaID)
    }

    if (formData.KetuaID) {
      payload.KetuaID = parseInt(formData.KetuaID)
      payload.KetuaNama = formData.ketua_nama
    }
    if (isSuperAdmin && formData.fakultas_id) {
      payload.fakultas_id = parseInt(formData.fakultas_id)
    }
    if (formData.program_studi_id) {
      payload.program_studi_id = parseInt(formData.program_studi_id)
    }
    try {
      const targetId = editingOrg ? (editingOrg.id || editingOrg.ID || editingOrg?.Ormawa?.ID || editingOrg?.Ormawa?.id) : null;
      console.log('Editing target ID:', targetId, 'editingOrg:', editingOrg);
      if (editingOrg) { await axios.put(`${API}/organizations/${targetId}`, payload); toast.success('Organisasi diperbarui') }
      else { await axios.post(`${API}/organizations`, payload); toast.success('Organisasi ditambahkan') }
      setModal(false); fetchData()
    } catch (e) { toast.error(`Gagal menyimpan: ${e.response?.data?.message || 'Error'}`) }
    finally { setIsSub(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return; setIsSub(true)
    const id = delTarget.id || delTarget.ID || delTarget?.Ormawa?.ID || delTarget?.Ormawa?.id;
    try {
      console.log('Deleting target ID:', id, 'from', delTarget);
      const res = await axios.delete(`${API}/organizations/${id}`)
      if (res.data.status === 'success') { toast.success('Organisasi dihapus'); setDelTarget(null); fetchData() }
      else toast.error(res.data.message || 'Gagal hapus')
    } catch (e) { toast.error(e.response?.data?.message || 'Gagal menghapus') }
    finally { setIsSub(false) }
  }

  const openEdit = (org) => {
    console.log('Open Edit ORMAWA:', org);
    setEdit(org);
    setFormData({ kode_org: org.kode || org.Singkatan || '', nama_org: org.nama || org.Nama || '', ketua_nama: org.deskripsi || org.Deskripsi || org.ketua_nama || '', KetuaID: org.ketua_id || org.KetuaID || null, jumlah_anggota: org.jumlah_anggota || org.JumlahAnggota || 0, status: org.status || org.Status || 'Aktif', KategoriOrmawaID: org.kategori_ormawa_id || org.KategoriOrmawaID || '', email: org.email || org.Email || '', password: '', phone: org.phone || org.Phone || '', fakultas_id: org.fakultas_id || org.FakultasID || '' });
    const facIdToFind = org.fakultas_id || org.FakultasID;
    const foundFac = faculties.find(f => (f.id || f.ID) === facIdToFind)
    setFakultasSearch(foundFac ? (foundFac.nama || foundFac.Nama) : '')
    setModal(true)
  }
  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  useEffect(() => { fetchData() }, [])

  const filtered = useMemo(() => organizations.filter(o => {
    const q = search.toLowerCase()
    const matchSearch = !q || o.nama?.toLowerCase().includes(q) || o.kode?.toLowerCase().includes(q)
    let matchP = filterPeriode === 'all'
    if (!matchP && o.CreatedAt) {
      const d = new Date(o.CreatedAt)
      if (!isNaN(d.getTime())) {
        const orgYear = String(d.getFullYear())
        const yearFromPeriod = filterPeriode.length >= 4 ? filterPeriode.substring(0, 4) : filterPeriode;
        matchP = orgYear === filterPeriode || orgYear === yearFromPeriod
      }
    }
    const matchS = filterStatus === 'all' || o.status === filterStatus
    
    return matchSearch && matchP && matchS
  }), [organizations, search, filterPeriode, filterStatus])

  const periodeOptions = useMemo(() => {
    const periods = new Set()
    organizations.forEach(o => {
      if (o.CreatedAt) {
        const d = new Date(o.CreatedAt)
        if (!isNaN(d.getTime())) {
          const year = d.getFullYear()
          if (year > 1900) {
            periods.add(String(year))
          }
        }
      }
    })
    return Array.from(periods).sort((a, b) => Number(b) - Number(a))
  }, [organizations])

  const sorted = useMemo(() => {
    let items = [...filtered]
    if (sortConfig.key !== null) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key]
        let bVal = b[sortConfig.key]

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

  const stats = { total: organizations.length, aktif: organizations.filter(o => o.status === 'Aktif').length, anggota: organizations.reduce((a, o) => a + (o.jumlah_anggota || 0), 0) }

  const filteredKategoris = useMemo(() => {
    if (isSuperAdmin) return kategoris;
    return kategoris.filter(v => v.terafiliasi_fakultas === true || v.TerafiliasiFakultas === true || (v.Nama || v.nama || '').toLowerCase() === 'himpunan');
  }, [kategoris, isSuperAdmin])

  const openAdd = () => {
    setEdit(null)
    const initialForm = { ...EMPTY_FORM }
    if (!isSuperAdmin) {
      const himpunanKat = kategoris.find(v => v.terafiliasi_fakultas === true || v.TerafiliasiFakultas === true || (v.Nama || v.nama || '').toLowerCase() === 'himpunan')
      if (himpunanKat) {
        initialForm.KategoriOrmawaID = String(himpunanKat.ID || himpunanKat.id)
      }
    }
    setFormData(initialForm)
    setModal(true)
  }

  const kategoriData = useMemo(() => {
    const counts = {}
    organizations.forEach(o => {
      const k = o.kategori || 'Lainnya'
      counts[k] = (counts[k] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [organizations])

  const topAnggotaData = useMemo(() => {
    return [...organizations]
      .sort((a, b) => (b.jumlah_anggota || 0) - (a.jumlah_anggota || 0))
      .slice(0, 10)
      .map(o => ({ name: o.kode || o.nama, value: o.jumlah_anggota || 0 }))
  }, [organizations])

  const PIE_COLORS = ['#00236f', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6', '#ef4444', '#ec4899', '#14b8a6']

  const tableColumns = [
    { key: 'kode', label: 'Kode', sortable: true, render: (val) => <span className="text-[10px] font-black text-[var(--theme-text-muted)] bg-[var(--theme-surface-hover)] border border-[var(--theme-border)] px-2 py-1 rounded-lg uppercase tracking-wider">{val || '—'}</span> },
    { key: 'nama', label: 'Nama Organisasi', sortable: true, render: (val) => <span className="font-bold text-sm text-[var(--theme-text)]">{val}</span> },
    { key: 'deskripsi', label: 'Ketua', sortable: true, render: (val) => <span className="text-sm text-[var(--theme-text-muted)] font-medium">{val || '—'}</span> },
    { key: 'kategori', label: 'Kategori', sortable: true, render: (val) => <span className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary-light)] border border-[var(--theme-primary-light)] px-2.5 py-1 rounded-lg">{val || '—'}</span> },
    { key: 'jumlah_anggota', label: 'Anggota', sortable: true, render: (val) => <div className="flex items-center gap-1.5 text-sm font-black text-[var(--theme-text)]"><span className="material-symbols-outlined text-[var(--theme-text-subtle)]" style={{ fontSize: '12px' }}>group</span>{val || 0}</div> },
    {
      key: 'status', label: 'Status', sortable: true, render: (val) => (
        <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider',
          val === 'Aktif' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-border-muted)]' : 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-border-muted)]')}>
          <span className={cn('w-1.5 h-1.5 rounded-full', val === 'Aktif' ? 'bg-[var(--theme-success)]' : 'bg-[var(--theme-error)]')} />{val}
        </span>
      )
    },
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />
      <DashboardHero
        title="Organisasi "
        highlightedTitle="Fakultas"
        subtitle="Kelola data legalitas dan identitas organisasi mahasiswa di lingkungan fakultas."
        icon="groups"
        badges={[
          { label: 'Master Data ORMAWA', active: false },
          { label: `${stats.aktif} ORMAWA Aktif`, active: true }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Select value={filterPeriode} onValueChange={setFilterPeriode}>
              <SelectTrigger className="w-[180px] h-10 border border-[var(--theme-border)] bg-white/80 backdrop-blur-sm rounded-xl text-xs font-bold text-slate-600 focus:ring-0">
                <SelectValue placeholder="Semua Tahun" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white">
                <SelectItem value="all" className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">Semua Periode</SelectItem>
                {periodsList.length > 0 ? periodsList.map(p => (
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
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PrimaryStatsCard title="Total ORMAWA" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.total} icon={Users2} colorTheme="info" badgeText="Organisasi terdaftar" />
        <PrimaryStatsCard title="Organisasi Aktif" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.aktif} icon={CheckCircle2} colorTheme="success" badgeText="Status aktif beroperasi" />
        <PrimaryStatsCard title="Total Anggota" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : stats.anggota} icon={ShieldCheck} colorTheme="primary" badgeText="Jangkauan anggota" />
        <PrimaryStatsCard title="Total Kategori" value={loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }} >sync</span> : kategoriData.length} icon={Users2} colorTheme="warning" badgeText="Jenis organisasi" />
      </div>

      {/* Charts */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Pie: Distribusi Kategori */}
          <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-4 shrink-0">
                <div className="w-12 h-12 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">pie_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Analisis Data</span>
                  <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Distribusi Kategori</h3>
                </div>
              </div>
              <div className="flex-1 w-full flex flex-col justify-center">
                {kategoriData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={kategoriData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {kategoriData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-[var(--theme-text-subtle)] italic text-center w-full block">Tidak ada data</span>}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-4">
                {kategoriData.slice(0, 6).map((item, i) => (
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

          {/* Bar: Top 10 Anggota per Ormawa */}
          <div className="bg-[var(--theme-surface)] p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-4 mb-4 shrink-0">
                <div className="w-12 h-12 bg-[var(--theme-success-light)] rounded-xl flex justify-center items-center text-[var(--theme-success)] group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                  <span className="material-symbols-outlined text-[24px]">bar_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Demografi</span>
                  <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Anggota per Ormawa (Top 10)</h3>
                </div>
              </div>
              <div className="flex-1 w-full flex flex-col justify-center">
                {topAnggotaData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topAnggotaData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--theme-border-muted)" />
                      <XAxis type="number" tick={{ fontSize: 9, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fontWeight: 700, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} width={60} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid var(--theme-border-muted)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                      <Bar dataKey="value" name="Anggota" fill="#00236f" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
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
          title="Daftar Organisasi"
          subtitle="Menampilkan daftar organisasi di fakultas."
          data={filtered}
          columns={tableColumns}
          loading={loading}
          searchable={true}
          pagination={true}
          pageSize={10}
          emptyMessage="Belum Ada Organisasi"
          emptyIcon="groups"
          searchPlaceholder="Cari nama atau kode..."
          searchValue={search}
          onSearchChange={setSearch}
          manualFiltering={true}
          filterValues={{ status: filterStatus }}
          onFilterChange={(key, val) => {
            if (key === 'status') setFilterStatus(val);
          }}
          filters={[
            {
              key: 'status',
              placeholder: 'Status',
              options: [
                { value: 'Aktif', label: 'Aktif' },
                { value: 'Nonaktif', label: 'Nonaktif' },
                { value: 'Pembekuan', label: 'Pembekuan' }
              ],
              className: 'w-[140px]'
            }
          ]}
        />
      </div>

      {/* Form Modal */}
      <DialogModal
        open={showModal}
        onOpenChange={setModal}
        icon="groups"
        title={editingOrg ? 'Update Data ORMAWA' : 'Tambah Organisasi'}
        subtitle={editingOrg ? 'Edit Organisasi' : 'Registrasi Baru'}
        maxWidth="max-w-lg"
        footer={
          <>
            <ModalCancelButton onClick={() => setModal(false)}>Batal</ModalCancelButton>
            <ModalSaveButton type="submit" form="orgForm" isSubmitting={isSubmitting}>
              {editingOrg ? 'Update Data' : 'Simpan Data'}
            </ModalSaveButton>
          </>
        }
      >
        <form id="orgForm" onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="space-y-4 overflow-y-auto max-h-[60vh]">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Kode Akronim</label>
                <input
                  value={formData.kode_org}
                  onChange={e => set('kode_org', e.target.value.toUpperCase())}
                  placeholder="BEM-FT"
                  required
                  className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 text-sm text-[var(--theme-text)] uppercase placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Kategori</label>
                <Select value={String(formData.KategoriOrmawaID || '')} onValueChange={val => set('KategoriOrmawaID', val)}>
                  <SelectTrigger className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 text-sm text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none">
                    <SelectValue placeholder="Pilih Kategori" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white">
                    {filteredKategoris.map(v => (
                      <SelectItem key={v.ID || v.id} value={String(v.ID || v.id)} className="rounded-lg text-sm py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">
                        {v.Nama || v.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isSuperAdmin && (
              <div className="relative">
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Pilih Fakultas</label>
                <div className="relative">
                  <div
                    className="w-full h-10 px-3 rounded-xl border border-[var(--theme-border)] bg-white text-sm text-[var(--theme-text)] flex items-center justify-between cursor-pointer focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none"
                    onClick={() => setIsFakultasDropdownOpen(!isFakultasDropdownOpen)}
                  >
                    <span className={`truncate ${!formData.fakultas_id ? 'text-[var(--theme-text-subtle)]' : ''}`}>{fakultasSearch || '-- Tingkat Universitas --'}</span>
                    <span className="material-symbols-outlined text-[var(--theme-text-subtle)]">expand_more</span>
                  </div>

                  {isFakultasDropdownOpen && (
                    <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--theme-border)] rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
                      <div className="sticky top-0 bg-white p-2 border-b border-[var(--theme-border-muted)]">
                        <input
                          type="text"
                          placeholder="Cari fakultas..."
                          value={fakultasSearch === '-- Tingkat Universitas --' ? '' : fakultasSearch}
                          onChange={e => setFakultasSearch(e.target.value)}
                          className="w-full h-9 px-3 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] text-sm focus:outline-none focus:border-[var(--theme-primary)]"
                          onClick={e => e.stopPropagation()}
                        />
                      </div>
                      <div className="p-1">
                        <div
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            set('fakultas_id', '')
                            setFakultasSearch('-- Tingkat Universitas --')
                            setIsFakultasDropdownOpen(false)
                          }}
                          className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-[var(--theme-primary-light)] hover:text-[var(--theme-primary)] ${!formData.fakultas_id ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-semibold' : 'text-[var(--theme-text)]'}`}
                        >
                          -- Tingkat Universitas --
                        </div>
                        {filteredFaculties.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-[var(--theme-text-muted)] text-center">Tidak ada fakultas ditemukan</div>
                        ) : (
                          filteredFaculties.map(f => (
                            <div
                              key={f.id || f.ID}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => {
                                set('fakultas_id', f.id || f.ID)
                                setFakultasSearch(f.nama || f.Nama)
                                setIsFakultasDropdownOpen(false)
                              }}
                              className={`px-3 py-2 text-sm rounded-lg cursor-pointer hover:bg-[var(--theme-primary-light)] hover:text-[var(--theme-primary)] ${parseInt(formData.fakultas_id) === (f.id || f.ID) ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-semibold' : 'text-[var(--theme-text)]'}`}
                            >
                              {f.nama || f.Nama}
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Nama Panjang Organisasi</label>
              <input
                value={formData.nama_org}
                onChange={e => set('nama_org', e.target.value)}
                placeholder="Nama resmi organisasi..."
                required
                className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors"
              />
            </div>

            <div className="relative z-40">
              <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Nama Ketua Umum</label>
              <div className="relative">
                <div
                  className="w-full h-10 px-3 rounded-xl border border-[var(--theme-border)] bg-white text-sm text-[var(--theme-text)] flex items-center justify-between cursor-pointer"
                  onClick={() => setIsStudentDropdownOpen(!isStudentDropdownOpen)}
                >
                  <span className={`truncate ${!formData.ketua_nama ? 'text-[var(--theme-text-subtle)]' : ''}`}>{formData.ketua_nama || '-- Pilih Mahasiswa --'}</span>
                  <span className="material-symbols-outlined text-[var(--theme-text-subtle)]">expand_more</span>
                </div>

                {isStudentDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-[var(--theme-border)] rounded-xl shadow-lg max-h-60 overflow-y-auto overflow-x-hidden">
                    <div className="sticky top-0 bg-white p-2 border-b border-[var(--theme-border-muted)]">
                      <input
                        type="text"
                        placeholder="Cari nama atau NIM..."
                        value={studentSearch}
                        onChange={e => setStudentSearch(e.target.value)}
                        className="w-full h-9 px-3 rounded-lg bg-[var(--theme-bg)] border border-[var(--theme-border)] text-sm focus:outline-none focus:border-[var(--theme-primary)]"
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                    <div className="p-1">
                      {filteredStudents.length === 0 ? (
                        <div className="px-4 py-8 text-center flex flex-col items-center justify-center">
                          <span className="material-symbols-outlined text-4xl text-[var(--theme-text-subtle)] mb-2">search_off</span>
                          <span className="text-sm font-medium text-[var(--theme-text-muted)]">Tidak ada mahasiswa ditemukan</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1">
                          {filteredStudents.slice(0, 50).map(s => {
                            const studentName = s.Pengguna?.nama_lengkap || s.nama || s.Nama || 'Tanpa Nama'
                            const studentNim = s.nim || s.NIM || '-'
                            const isSelected = formData.ketua_nama === studentName
                            return (
                              <div
                                key={s.ID || s.id}
                                onClick={() => {
                                  set('ketua_nama', studentName)
                                  setIsStudentDropdownOpen(false)
                                  setStudentSearch('')
                                }}
                                className={`flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-[var(--theme-primary-light)] border border-[var(--theme-primary-light)]'
                                    : 'hover:bg-[var(--theme-surface-hover)] border border-transparent'
                                }`}
                              >
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0 ${isSelected ? 'bg-[var(--theme-primary)] text-white shadow-sm' : 'bg-[var(--theme-surface-active)] text-[var(--theme-text-muted)]'}`}>
                                  <span className="material-symbols-outlined text-[16px]">{isSelected ? 'check' : 'person'}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className={`text-sm truncate ${isSelected ? 'font-bold text-[var(--theme-primary)]' : 'font-semibold text-[var(--theme-text)]'}`}>
                                    {studentName}
                                  </div>
                                  <div className={`text-[11px] font-medium ${isSelected ? 'text-[var(--theme-primary)] opacity-80' : 'text-[var(--theme-text-muted)]'}`}>
                                    {studentNim}
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Jumlah Anggota</label>
                <input
                  type="number"
                  value={formData.jumlah_anggota}
                  onChange={e => set('jumlah_anggota', parseInt(e.target.value) || 0)}
                  className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Status</label>
                <Select value={formData.status} onValueChange={val => set('status', val)}>
                  <SelectTrigger className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 text-sm text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white z-[9999]">
                    {['Aktif', 'Nonaktif', 'Pembekuan'].map(v => (
                      <SelectItem key={v} value={v} className="rounded-lg text-sm py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)]">
                        {v}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">Email Resmi</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="info@ormawa.com"
                  className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">{editingOrg ? 'Password (opsional)' : 'Password Admin'}</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Password login..."
                  required={!editingOrg}
                  className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-white px-3 text-sm text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </form>
      </DialogModal>

      {/* Delete Confirm */}
      <DeleteConfirmModal
        isOpen={!!delTarget}
        onClose={() => setDelTarget(null)}
        onConfirm={handleDelete}
        isDeleting={isSubmitting}
        title="Hapus Organisasi?"
        message={`Tindakan ini tidak dapat dibatalkan. Pastikan tidak ada data kepengurusan, berkas proposal, atau laporan aktif yang masih terkait dengan organisasi "${delTarget?.nama}" ini.`}
      />
    </PageContent>
  )
}
