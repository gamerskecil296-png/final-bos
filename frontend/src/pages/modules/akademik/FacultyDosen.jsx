"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import api from '@/lib/axios'
import { API_BASE_URL } from '@/services/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { PageContent } from '@/components/ui/page/PageContent'
import { DashboardHero } from '@/components/ui/dashboard/DashboardHero'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { usePermission } from '@/hooks/usePermission'

const EMPTY_FORM = { NIDN: '', Nama: '', Email: '', NoHP: '', Alamat: '', Jabatan: 'Lektor', ProgramStudiID: '', NIK: '', NIP: '', JenisKelamin: '', TempatLahir: '', TanggalLahir: '', Agama: '', StatusAktif: '', StatusKepegawaian: '' }

const JABATAN_STYLES = {
  'Asisten': 'bg-slate-50 text-slate-500 border-slate-100',
  'Lektor': 'bg-blue-50 text-blue-600 border-blue-100',
  'Lektor Kepala': 'bg-indigo-50 text-indigo-600 border-indigo-100',
  'Profesor': 'bg-amber-50 text-amber-600 border-amber-100',
  'DEFAULT': 'bg-neutral-50 text-neutral-400 border-neutral-100'
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
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute" style={{ fontSize: className.includes('w-28') ? '56px' : className.includes('w-14') ? '28px' : '20px' }}>
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

export default function FacultyLecturerDirectory() {
  const { hasPermission } = usePermission()
  const canManageLecturers = hasPermission('dosen.manage')

  const [data, setData] = useState([])
  const [prodi, setProdi] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [filterProdi, setFilterProdi] = useState('all')
  const [filterJabatan, setFilterJabatan] = useState('all')

  const filteredData = useMemo(() => {
    let items = data
    if (filterProdi !== 'all') {
      items = items.filter(d => {
        const nama = d.ProgramStudi?.Nama || d.ProgramStudi?.nama || d.program_studi?.nama || ''
        const id = String(d.ProgramStudiID || d.ProgramStudi?.ID || d.program_studi_id || '')
        const fVal = String(filterProdi)
        return nama.toLowerCase() === fVal.toLowerCase() || id === fVal
      })
    }
    if (filterJabatan !== 'all') {
      items = items.filter(d => d.Jabatan === filterJabatan)
    }
    return items
  }, [data, filterProdi, filterJabatan])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lecRes, prodiRes] = await Promise.all([
        api.get('/app/dashboard/lecturers'),
        api.get('/app/dashboard/majors')
      ])
      if (lecRes.data?.status === 'success') setData(lecRes.data.data || [])
      if (prodiRes.data?.status === 'success') setProdi(prodiRes.data.data || [])
    } catch { 
      toast.error('Gagal memuat data direktori dosen') 
    } finally { 
      setLoading(false) 
    }
  }

  useEffect(() => { 
    fetchData() 
  }, [])

  const handleOpenAdd = () => { 
    setIsEditMode(false)
    setForm(EMPTY_FORM)
    setIsCrudOpen(true) 
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({
      ID: row.ID,
      NIDN: row.NIDN || '',
      Nama: row.Nama || '',
      Email: row.Email || row.pengguna?.email || row.Pengguna?.Email || '',
      NoHP: row.NoHP || '',
      Alamat: row.Alamat || '',
      NIK: row.NIK || '',
      NIP: row.NIP || '',
      JenisKelamin: row.JenisKelamin || '',
      TempatLahir: row.TempatLahir || '',
      TanggalLahir: row.TanggalLahir || '',
      Agama: row.Agama || '',
      StatusAktif: row.StatusAktif || '',
      StatusKepegawaian: row.StatusKepegawaian || '',
      Jabatan: row.Jabatan || 'Lektor',
      ProgramStudiID: String(row.ProgramStudiID || '')
    })
    setIsCrudOpen(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    const payload = { ...form, ProgramStudiID: parseInt(form.ProgramStudiID) || 0 }
    try {
      const res = form.ID 
        ? await api.put(`/app/dashboard/lecturers/${form.ID}`, payload) 
        : await api.post('/app/dashboard/lecturers', payload)
      
      if (res.data?.status === 'success') {
        toast.success(form.ID ? 'Data dosen diperbarui' : 'Dosen berhasil didaftarkan')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(res.data?.message || 'Gagal menyimpan data')
      }
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Terjadi kesalahan sistem') 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const res = await api.delete(`/app/dashboard/lecturers/${selected.ID}`)
      if (res.data?.status === 'success') {
        toast.success('Data dosen dihapus')
        setIsDelOpen(false)
        fetchData()
      } else {
        toast.error(res.data?.message || 'Gagal menghapus data')
      }
    } catch (err) { 
      toast.error(err.response?.data?.message || 'Gagal menghapus data') 
    } finally { 
      setIsSubmitting(false) 
    }
  }

  const handleSyncSevima = async () => {
    setIsSyncing(true)
    try {
      const res = await api.post('/app/dashboard/sync-dosen')
      if (res.data?.status === 'success') {
        toast.success(res.data.message || 'Sinkronisasi SEVIMA Dosen berhasil diinisiasi')
        setTimeout(fetchData, 3000)
      } else {
        toast.error(res.data?.message || 'Gagal sinkronisasi data dari SEVIMA')
      }
    } catch {
      toast.error('Terjadi kesalahan saat memanggil API SEVIMA')
    } finally {
      setIsSyncing(false)
    }
  }

  const columns = [
    {
      key: 'NIDN',
      label: 'NIDN',
      className: 'w-[140px]',
      render: v => (
        <code className="text-[12px] font-bold text-blue-600 tracking-[0.1em] bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">
          {v ? v : '—'}
        </code>
      )
    },
    {
      key: 'Nama',
      label: 'Identitas Dosen',
      className: 'w-[280px]',
      render: (v, row) => (
        <div className="flex items-center gap-4 py-2 group/avatar">
          <StudentAvatar
            src={getCleanImageUrl(row.Foto || row.Pengguna?.Foto)}
            name={v}
            className="w-11 h-11 rounded-xl border-2 border-white shadow-md"
          />
          <div className="flex flex-col">
            <span className="font-bold text-neutral-900 tracking-tight text-[14px] leading-tight">
              {v ? v.toLowerCase().replace(/\b\w/g, s => s.toUpperCase()) : '—'}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-neutral-400">
              <span className="material-symbols-outlined text-primary/60" style={{ fontSize: '10px' }} >mail</span>
            <span className="text-[10px] font-bold tracking-widest lowercase">{row.Email || row.pengguna?.email || row.Pengguna?.Email || '—'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'ProgramStudi',
      label: 'Program Studi',
      className: 'w-[200px]',
      render: v => <span className="text-[12px] font-extrabold text-neutral-700 tracking-tight leading-tight block truncate" title={v?.Nama || v?.nama}>{v?.Nama || v?.nama || '—'}</span>
    },
    {
      key: 'Jabatan',
      label: 'Jabatan',
      className: 'w-[140px] text-center',
      cellClassName: 'text-center pr-4',
      render: v => (
        <Badge className={cn('px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider shadow-none', JABATAN_STYLES[v] || JABATAN_STYLES.DEFAULT)}>
          {v || 'Lektor'}
        </Badge>
      )
    }
  ]

  const stats = useMemo(() => ({
    total: data.length,
    professors: data.filter(d => d.Jabatan === 'Profesor').length,
    lektor: data.filter(d => d.Jabatan === 'Lektor' || d.Jabatan === 'Lektor Kepala').length,
    asisten: data.filter(d => d.Jabatan === 'Asisten').length
  }), [data])

  return (
    <PageContent>
      <Toaster position="top-right" />

      {/* ── Page Header ─────────────────────────────────────────── */}
      <DashboardHero
        title="Direktori"
        highlightedTitle="Dosen"
        subtitle="Manajemen database tenaga pendidik, jabatan fungsional, dan program studi di lingkungan Fakultas."
        icon="badge"
        badges={[
          { label: 'Academic Staff', active: true }
        ]}
        actions={
          <div className="flex items-center gap-2">
            <button onClick={fetchData} disabled={loading} className="h-10 px-4 rounded-xl border border-slate-200/80 bg-[var(--theme-surface)] text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary-light)] shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2">
              {loading ? <span className="material-symbols-outlined animate-spin text-[var(--theme-primary)]" style={{ fontSize: '13px' }} >sync</span> : <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 13 }}>sync</span>} Refresh Data
            </button>
            {canManageLecturers && (
              <button
                onClick={() => setIsSyncModalOpen(true)}
                disabled={isSyncing}
                className="h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-xs font-bold uppercase tracking-wider text-white hover:opacity-90 shadow-sm transition-all duration-200 active:scale-95 disabled:opacity-60 flex items-center gap-2 shrink-0 border-none"
              >
                {isSyncing ? <span className="material-symbols-outlined animate-spin text-white" style={{ fontSize: '13px' }} >sync</span> : <span className="material-symbols-outlined text-white" style={{ fontSize: '13px' }}>cloud_sync</span>}
                {isSyncing ? 'Syncing...' : 'SEVIMA Sync'}
              </button>
            )}
          </div>
        }
      />

      {/* ── Stats Grid ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <PrimaryStatsCard
          title="Total Dosen"
          value={stats.total}
          icon="group"
          colorTheme="primary"
          badgeText="Tenaga pendidik terdaftar"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">how_to_reg</span>}
        />

        <PrimaryStatsCard
          title="Profesor"
          value={stats.professors}
          icon="school"
          colorTheme="warning"
          badgeText="Guru Besar"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">workspace_premium</span>}
        />

        <PrimaryStatsCard
          title="Lektor"
          value={stats.lektor}
          icon="work"
          colorTheme="info"
          badgeText="Lektor & Kepala"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">auto_stories</span>}
        />

        <PrimaryStatsCard
          title="Asisten"
          value={stats.asisten}
          icon="how_to_reg"
          colorTheme="primary"
          badgeText="Asisten Ahli"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">assignment_ind</span>}
        />
      </div>

      {/* ── Table Section ────────────────────────────────────────── */}
      <DataTable
        title="Daftar Dosen"
        subtitle="Menampilkan daftar Dosen dan Tenaga Pendidik"
        columns={columns}
        data={filteredData}
        loading={loading}
        searchPlaceholder="Cari NIDN atau Nama..."
        manualFiltering
        filterValues={{ Jabatan: filterJabatan, ProgramStudiID: filterProdi }}
        onFilterChange={(key, val) => {
          if (key === 'Jabatan') setFilterJabatan(val)
          if (key === 'ProgramStudiID') setFilterProdi(val)
        }}
        filters={[
          { key: 'Jabatan', placeholder: 'Pilih Jabatan', options: [{ label: 'Asisten', value: 'Asisten' }, { label: 'Lektor', value: 'Lektor' }, { label: 'Profesor', value: 'Profesor' }] },
          { key: 'ProgramStudiID', placeholder: 'Pilih Program Studi', options: prodi.map(p => ({ label: p.Nama || p.nama, value: p.Nama || p.nama })) }
        ]}
        actions={(row) => (
          <Button onClick={() => handleOpenEdit(row)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >visibility</span></Button>
        )}
      />

      {/* ── CRUD Modal ───────────────────────────────────────────── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? "Detail Dosen" : "Registrasi Dosen"}
        subtitle="Academic Registry"
        description={isEditMode ? "Informasi detail profil dan jabatan akademik dosen." : "Pendaftaran identitas dan jabatan akademik tenaga pendidik baru."}
        icon={isEditMode ? "visibility" : "person_add"}
        maxWidth="max-w-2xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)}>Tutup Profil</ModalCancelButton>
            {!isEditMode && (
              <ModalSaveButton onClick={handleSave} loading={isSubmitting} icon="save">
                Simpan Data
              </ModalSaveButton>
            )}
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">NIDN / NIP</Label>
              <Input readOnly={isEditMode} value={form.NIDN} onChange={e => setForm({ ...form, NIDN: e.target.value })} placeholder="Nomor Induk..." className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm uppercase" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Nama Lengkap</Label>
              <Input readOnly={isEditMode} value={form.Nama} onChange={e => setForm({ ...form, Nama: e.target.value })} placeholder="Nama..." className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Email Institusi</Label>
            <Input readOnly={isEditMode} type="email" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} placeholder="dosen@bku.ac.id" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">No. Handphone</Label>
              <Input readOnly={isEditMode} value={form.NoHP} onChange={e => setForm({ ...form, NoHP: e.target.value })} placeholder="-" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Alamat Domisili</Label>
              <Input readOnly={isEditMode} value={form.Alamat} onChange={e => setForm({ ...form, Alamat: e.target.value })} placeholder="-" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">NIK / No. KTP</Label>
              <Input readOnly={isEditMode} value={form.NIK} onChange={e => setForm({ ...form, NIK: e.target.value })} placeholder="-" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">NIP / No. Pegawai</Label>
              <Input readOnly={isEditMode} value={form.NIP} onChange={e => setForm({ ...form, NIP: e.target.value })} placeholder="-" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Tempat, Tanggal Lahir</Label>
              <Input readOnly={isEditMode} value={form.TempatLahir} onChange={e => setForm({ ...form, TempatLahir: e.target.value })} placeholder="Format: Kota, DD-MM-YYYY" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Jenis Kelamin</Label>
              <Select disabled={isEditMode} value={form.JenisKelamin} onValueChange={v => setForm({ ...form, JenisKelamin: v })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm opacity-100"><SelectValue placeholder="-" /></SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  {['L', 'P'].map(j => <SelectItem key={j} value={j} className="text-xs font-medium">{j === 'L' ? 'Laki-Laki' : 'Perempuan'}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Status Kepegawaian</Label>
              <Input readOnly={isEditMode} value={form.StatusKepegawaian} onChange={e => setForm({ ...form, StatusKepegawaian: e.target.value })} placeholder="-" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Status Aktif</Label>
              <Input readOnly={isEditMode} value={form.StatusAktif} onChange={e => setForm({ ...form, StatusAktif: e.target.value })} placeholder="-" className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Jabatan</Label>
              <Select disabled={isEditMode} value={form.Jabatan} onValueChange={v => setForm({ ...form, Jabatan: v })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm opacity-100"><SelectValue /></SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  {['Asisten', 'Lektor', 'Lektor Kepala', 'Profesor'].map(j => <SelectItem key={j} value={j} className="text-xs font-medium">{j}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black text-slate-500 ml-1 uppercase tracking-widest">Program Studi</Label>
              <Select disabled={isEditMode} value={form.ProgramStudiID} onValueChange={v => setForm({ ...form, ProgramStudiID: v })}>
                <SelectTrigger className="h-11 rounded-lg border-slate-200/60 bg-slate-50 font-medium text-sm opacity-100"><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl">
                  {prodi.map(p => <SelectItem key={p.id || p.ID} value={String(p.id || p.ID)} className="text-xs font-medium uppercase">{p.Nama}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Data Dosen?"
        description="Seluruh riwayat pengajaran dan penugasan dosen ini akan dihapus permanen."
        loading={isSubmitting}
      />

      <DeleteConfirmModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onConfirm={() => {
          setIsSyncModalOpen(false);
          handleSyncSevima();
        }}
        title="Sinkronisasi Data Dosen SEVIMA?"
        description="Apakah Anda yakin ingin menyinkronkan data Tenaga Pendidik (Dosen) dari SEVIMA? Aksi ini akan menarik data terbaru dan mengatasi konflik ID."
        loading={isSyncing}
        confirmText="YA, SINKRONISASI"
        confirmClassName="bg-[var(--theme-primary)] hover:brightness-90 text-white"
      />
    </PageContent>
  )
}
