"use client"

import React, { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'

const API = `${API_BASE_URL}/faculty/prodi-roles`

const PERM_LABELS = {
  view_dashboard: 'Dashboard: Lihat Ringkasan & Grafik',
  view_mahasiswa: 'Mahasiswa: Lihat Daftar',
  edit_mahasiswa: 'Mahasiswa: Edit Data Profil',
  view_dosen: 'Dosen: Lihat Direktori Dosen',
  edit_dosen: 'Dosen: Edit & Kelola Data Dosen',
  view_akademik: 'Akademik: Lihat Periode & Jadwal',
  edit_akademik: 'Akademik: Kelola Periode & Jadwal',
  view_psikolog: 'Psikolog: Lihat Profil Konselor',
  view_prodi: 'Program Studi: Lihat Detail Prodi',
  view_pkkmb: 'PKKMB: Lihat Agenda Kegiatan',
  view_organisasi: 'Organisasi: Lihat Struktur & Ormawa',
  view_proposal: 'Proposal: Lihat Pengajuan Proposal',
  view_prestasi: 'Prestasi: Lihat Portofolio Prestasi',
  edit_prestasi: 'Prestasi: Validasi & Edit Prestasi',
  view_beasiswa: 'Beasiswa: Lihat Daftar Penerima',
  edit_beasiswa: 'Beasiswa: Edit Status Beasiswa',
  view_kesehatan: 'Kesehatan: Lihat Catatan Medis',
  view_aspirasi: 'Aspirasi: Lihat Umpan Balik',
  edit_aspirasi: 'Aspirasi: Jawab & Kelola Keluhan',
  view_laporan: 'Laporan: Lihat Laporan Hasil Studi',
  view_pengaturan: 'Pengaturan: Akses Konfigurasi Umum'
}

const PERM_DESCS = {
  view_dashboard: 'Mampu melihat grafik perkembangan nilai, jumlah mahasiswa aktif, prestasi, dan timeline kegiatan prodi.',
  view_mahasiswa: 'Mampu mengakses data identitas, status studi, dan rekam jejak akademik mahasiswa.',
  edit_mahasiswa: 'Mampu merubah biodata, nomor telepon, alamat, dan status akademik mahasiswa.',
  view_dosen: 'Mampu mengakses direktori biodata, email, dan jabatan akademik dosen.',
  edit_dosen: 'Mampu menambah, memperbarui data profil dosen, serta melakukan sinkronisasi data SEVIMA.',
  view_akademik: 'Mampu melihat periode akademik, kalender akademik, dan jadwal perkuliahan.',
  edit_akademik: 'Mampu mengatur periode akademik baru, mengubah jadwal perkuliahan, dan mengelola nilai.',
  view_psikolog: 'Mampu memantau data profil psikolog dan riwayat janji konseling yang terikat ke prodi.',
  view_prodi: 'Mampu mengakses struktur kurikulum, visi misi prodi, dan data akreditasi.',
  view_pkkmb: 'Mampu memantau progres kehadiran, kelulusan, dan agenda kegiatan orientasi (PKKMB).',
  view_organisasi: 'Mampu memantau organisasi kemahasiswaan (Himpunan Mahasiswa) yang dinaungi prodi.',
  view_proposal: 'Mampu meninjau proposal kegiatan ormawa prodi sebelum diajukan ke tingkat fakultas.',
  view_prestasi: 'Mampu melihat galeri sertifikat, piala, dan rekognisi nasional/internasional mahasiswa.',
  edit_prestasi: 'Mampu memvalidasi keaslian berkas bukti prestasi mahasiswa and menyetujuinya.',
  view_beasiswa: 'Mampu melihat penerima bantuan dana beasiswa internal maupun eksternal.',
  edit_beasiswa: 'Mampu memverifikasi pengajuan beasiswa baru dari mahasiswa program studi.',
  view_kesehatan: 'Mampu meninjau statistik riwayat pemeriksaan kesehatan fisik/mental mahasiswa.',
  view_aspirasi: 'Mampu membaca saran, aduan sarana prasarana, atau masukan kurikulum dari mahasiswa.',
  edit_aspirasi: 'Mampu menuliskan tanggapan resmi dan memperbarui status penanganan keluhan.',
  view_laporan: 'Mampu mengekspor laporan kelulusan mahasiswa, IPK rata-rata, dan statistik angkatan.',
  view_pengaturan: 'Mampu menyesuaikan jam operasional sekretariat prodi dan detail kontak resmi.'
}

const PERM_GROUPS = [
  {
    title: 'Dashboard & Statistik',
    icon: 'dashboard',
    permissions: ['view_dashboard']
  },
  {
    title: 'Data Master Akademik',
    icon: 'school',
    permissions: ['students.view', 'students.manage', 'dosen.view', 'dosen.manage', 'psychologist.view', 'program_studi.view', 'akademik.view', 'akademik.manage']
  },
  {
    title: 'Kemahasiswaan & Kegiatan',
    icon: 'group',
    permissions: ['kencana.faculty.dashboard', 'faculty_ormawa.view', 'faculty_proposal.view', 'faculty_health.view']
  },
  {
    title: 'Prestasi & Rekognisi',
    icon: 'emoji_events',
    permissions: ['faculty.achievement.view', 'faculty.achievement.update']
  },
  {
    title: 'Beasiswa & Finansial',
    icon: 'payments',
    permissions: ['faculty.scholarship.view']
  },
  {
    title: 'Aspirasi & Administrasi',
    icon: 'campaign',
    permissions: ['faculty.aspiration.view', 'faculty.aspiration.update', 'faculty.aspiration.delete', 'faculty_report.view', 'faculty_settings.view']
  }
]

const TABS = [
  { key: 'roles', label: 'Prodi Roles', icon: 'badge' },
  { key: 'permissions', label: 'Permission Matrix', icon: 'security' }
]

export default function ProdiRBAC() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('roles')
  const [selectedRoleKey, setSelectedRoleKey] = useState('')
  const [permissionDraft, setPermissionDraft] = useState([])

  // Matrix specific state
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedModules, setExpandedModules] = useState({})

  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)

  const [form, setForm] = useState({ Nama: '', Deskripsi: '' })

  const parsePermissions = (rawHak) => {
    if (!rawHak) return []
    if (Array.isArray(rawHak)) return rawHak
    if (typeof rawHak === 'string') {
      try {
        const parsed = JSON.parse(rawHak)
        return Array.isArray(parsed) ? parsed : []
      } catch (e) {
        return []
      }
    }
    return []
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const json = await fetchWithAuth(API)
      if (json.status === 'success') {
        const normalized = (json.data || []).map(r => {
          const rawPermissions = r.Permissions || r.permissions || r.Hak || r.hak || []
          return {
            ID: r.ID || r.id,
            Nama: r.Nama || r.nama || '',
            Deskripsi: r.Deskripsi || r.deskripsi || '',
            Hak: parsePermissions(rawPermissions)
          }
        })
        setRoles(normalized)
      }
    } catch (e) {
      toast.error('Gagal memuat data role Prodi')
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Sinkronisasi permissionDraft saat selectedRoleKey berubah
  useEffect(() => {
    if (selectedRoleKey && roles.length > 0) {
      const role = roles.find(r => r.ID === selectedRoleKey || r.id === selectedRoleKey || r.Nama === selectedRoleKey)
      if (role) {
        setPermissionDraft(role.Hak || [])
      }
    }
  }, [selectedRoleKey, roles])

  const handleOpenAdd = () => {
    setIsEditMode(false)
    setForm({ Nama: '', Deskripsi: '' })
    setIsCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({
      ID: row.ID || row.id,
      Nama: row.Nama || row.nama || '',
      Deskripsi: row.Deskripsi || row.deskripsi || ''
    })
    setIsCrudOpen(true)
  }

  const handleSaveRoleInfo = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const url = isEditMode ? `${API}/${form.ID || form.id}` : API
    const method = isEditMode ? 'PUT' : 'POST'
    try {
      // Pertahankan Hak lama jika sedang Edit
      let currentHak = []
      if (isEditMode) {
        const existingRole = roles.find(r => r.ID === form.ID || r.id === form.ID)
        if (existingRole) currentHak = existingRole.Hak || []
      }

      const json = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          Nama: form.Nama,
          Deskripsi: form.Deskripsi,
          Hak: isEditMode ? currentHak : []
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (json.status === 'success') {
        toast.success(isEditMode ? 'Role Prodi berhasil diperbarui!' : 'Role Prodi baru berhasil dibuat!')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(json.message || 'Gagal menyimpan role')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedRoleKey) { toast.error('Role belum dipilih'); return }
    const role = roles.find(r => r.ID === selectedRoleKey || r.id === selectedRoleKey || r.Nama === selectedRoleKey)
    if (!role) { toast.error('Role tidak ditemukan'); return }

    setIsSubmitting(true)
    try {
      const json = await fetchWithAuth(`${API}/${role.ID || role.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          Nama: role.Nama,
          Deskripsi: role.Deskripsi,
          Hak: permissionDraft
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (json.status === 'success') {
        toast.success('Matrix otorisasi berhasil disimpan!')
        fetchData()
      } else {
        toast.error(json.message || 'Gagal menyimpan matrix')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const json = await fetchWithAuth(`${API}/${selected?.id || selected?.ID}`, { method: 'DELETE' })
      if (json.status === 'success') {
        toast.success('Role Prodi berhasil dihapus')
        if (selectedRoleKey === selected?.ID || selectedRoleKey === selected?.id) setSelectedRoleKey('')
        setIsDelOpen(false)
        fetchData()
      } else {
        toast.error('Gagal menghapus role')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  const togglePermission = (permKey) => {
    setPermissionDraft(prev =>
      prev.includes(permKey) ? prev.filter(k => k !== permKey) : [...prev, permKey]
    )
  }

  return (
    <PageContent>
      <Toaster position="top-right" />

      {/* ── Page Header ─────────────────────────── */}
      <DashboardHero
        title="RBAC"
        highlightedTitle="Program Studi"
        subtitle="Konfigurasi hak akses role administrator level program studi (Prodi) untuk membatasi navigasi portal."
        icon="security"
        badges={[
          { label: 'Otorisasi & Keamanan Prodi', active: true }
        ]}
        actions={
          <>
            <button
              onClick={() => setActiveTab('permissions')}
              className="h-11 px-6 rounded-xl border border-[var(--theme-primary)]/20 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] text-[10px] font-black uppercase tracking-widest hover:bg-[var(--theme-primary)] hover:text-white gap-2.5 transition-all active:scale-95 shadow-none cursor-pointer font-headline hidden md:flex items-center"
            >
              <span className="material-symbols-outlined text-current" style={{ fontSize: '14px' }}>security</span>
              Permission Matrix
            </button>
            <button
              onClick={handleOpenAdd}
              className="h-10 px-4 rounded-xl bg-primary hover:bg-bku-hover text-white text-xs font-bold uppercase tracking-wider gap-2 flex items-center transition-all active:scale-95 shadow-lg shadow-bku-primary/20 shrink-0"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>add</span>
              BUAT ROLE PRODI
            </button>
          </>
        }
      />

      {/* Tabs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'h-14 rounded-2xl border px-5 flex items-center justify-between text-left transition-all',
              activeTab === tab.key ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)] shadow-md' : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border)] hover:border-[var(--theme-primary)]/30 hover:text-[var(--theme-text)]'
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-widest">{tab.label}</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{tab.icon}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Roles Grid ───────────────────────────────────────────── */}
      {activeTab === 'roles' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map(role => (
            <div key={role.ID || role.id} className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl shadow-sm hover:shadow-md transition-all group flex flex-col justify-between overflow-hidden">
              <div className="p-6 flex flex-col flex-1 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1 min-w-0">
                    <span className="inline-block font-bold text-[9px] px-2.5 py-1 border border-[var(--theme-primary)]/20 shadow-none uppercase tracking-widest rounded-lg break-words whitespace-normal leading-relaxed text-left bg-[var(--theme-primary-light)] text-[var(--theme-primary)]">
                      {role.Nama}
                    </span>
                    <h3 className="text-base font-bold text-[var(--theme-text)] leading-tight break-all">Role Prodi</h3>
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg shrink-0 bg-[var(--theme-success-light)] text-[var(--theme-success)]">Active</span>
                </div>

                <p className="text-xs font-medium text-[var(--theme-text-subtle)] leading-relaxed flex-1 min-h-[48px]">
                  {role.Deskripsi || 'Akses spesifik kaprodi atau staff dalam unit Program Studi.'}
                </p>

                <div className="flex items-center justify-between border-t border-[var(--theme-border-muted)] pt-4 mt-auto">
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">
                    {(role.Hak || []).length} permissions
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(role)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-bg)] text-[10px] font-bold text-[var(--theme-text)] transition-colors flex items-center gap-1.5"
                      title="Edit Detail Role"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span> Edit Info
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRoleKey(role.ID || role.id || role.Nama)
                        setActiveTab('permissions')
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-[10px] font-bold shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                      title="Configure Matrix"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>rule_settings</span> Configure Matrix
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(role); setIsDelOpen(true); }}
                      className="p-1.5 text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] rounded-lg transition-colors cursor-pointer"
                      title="Hapus Role"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Tab: Permission Matrix ───────────────────────────────────────────── */}
      {activeTab === 'permissions' && (
        <section className="space-y-6 pb-24">
          {/* Top Selector: Role List */}
          <div className="space-y-3 bg-[var(--theme-surface)] border border-[var(--theme-border)] p-5 rounded-2xl shadow-sm">
            <div>
              <h3 className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Pilih Role Prodi</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {roles.map(role => {
                const rID = role.ID || role.id || role.Nama
                const isSelected = selectedRoleKey === rID
                const count = (role.Hak || []).length

                return (
                  <button
                    key={rID}
                    type="button"
                    onClick={() => setSelectedRoleKey(rID)}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col justify-between gap-2.5 transition-all duration-150 active:scale-[0.98] cursor-pointer text-left min-h-[76px]",
                      isSelected
                        ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-md"
                        : "bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-text)] hover:border-[var(--theme-primary)]/30 hover:bg-[var(--theme-primary-light)]/20"
                    )}
                  >
                    <div className="min-w-0 w-full flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-bold tracking-tight truncate block">{role.Nama}</span>
                      </div>
                      <span className={cn(
                        'font-bold text-[9px] px-1.5 py-0.5 uppercase tracking-widest rounded-md shrink-0',
                        isSelected ? "bg-white/20 text-white" : "bg-[var(--theme-primary-light)] text-[var(--theme-primary)]"
                      )}>
                        {count} Izin
                      </span>
                    </div>
                    <span className={cn("text-[9px] uppercase tracking-wider block truncate opacity-80 w-full", isSelected ? "text-white/80" : "text-[var(--theme-text-muted)]")}>
                      {role.Deskripsi || 'Role Prodi'}
                    </span>
                  </button>
                )
              })}
              {roles.length === 0 && (
                <div className="col-span-full p-4 text-center text-[var(--theme-text-muted)] text-xs font-medium border border-dashed border-[var(--theme-border-muted)] rounded-xl">
                  Belum ada role prodi terdaftar.
                </div>
              )}
            </div>
          </div>

          {/* Matrix Workspace */}
          {selectedRoleKey && (
            <div className="space-y-6">
              {/* Target info and Search */}
              <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm rounded-2xl p-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>shield</span>
                      <h3 className="font-bold text-base text-[var(--theme-text)] leading-tight">Konfigurasi Otorisasi</h3>
                    </div>
                    <p className="text-[11px] font-medium text-[var(--theme-text-muted)] tracking-wide">
                      Centang modul dan tindakan yang diizinkan untuk role ini.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleSavePermissions}
                      disabled={isSubmitting}
                      className="h-10 px-6 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-lg shadow-[var(--theme-primary)]/20 transition-all active:scale-95 flex items-center justify-center gap-2 border-none cursor-pointer"
                    >
                      {isSubmitting ? (
                        <span className="material-symbols-outlined animate-spin size-4" style={{ fontSize: '15px' }}>sync</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>save</span>
                      )}
                      <span className="text-[10px] font-bold tracking-widest uppercase">
                        Simpan
                      </span>
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 transform -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }}>search</span>
                  <Input
                    type="text"
                    placeholder="Cari izin akses..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-12 pl-11 rounded-xl border-[var(--theme-border)] bg-[var(--theme-bg)]/40 focus:bg-[var(--theme-surface)] text-sm font-bold text-[var(--theme-text)] tracking-wide shadow-none"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] cursor-pointer transition-colors"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Modules Accordion */}
              <div className="space-y-3">
                {PERM_GROUPS.filter(g => !searchQuery || g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.permissions.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))).map(group => {
                  const isExpanded = !!expandedModules[group.title]
                  const moduleItems = group.permissions
                  const activeCount = moduleItems.filter(p => permissionDraft.includes(p)).length
                  const allChecked = activeCount === moduleItems.length && moduleItems.length > 0
                  const someChecked = activeCount > 0 && !allChecked

                  const toggleModuleAccordion = (title) => {
                    setExpandedModules(prev => ({ ...prev, [title]: !prev[title] }))
                  }

                  const toggleModulePermissions = () => {
                    if (allChecked) {
                      setPermissionDraft(prev => prev.filter(p => !moduleItems.includes(p)))
                    } else {
                      setPermissionDraft(prev => {
                        const newDraft = new Set(prev)
                        moduleItems.forEach(p => newDraft.add(p))
                        return Array.from(newDraft)
                      })
                    }
                  }

                  const groupPermissionsByFeature = (permsList) => {
                    const featuresMap = {}
                    permsList.forEach(p => {
                      const parts = p.split('_')
                      const action = parts[0]
                      const featureName = parts.slice(1).join(' ')

                      if (!featuresMap[featureName]) {
                        featuresMap[featureName] = { name: featureName.charAt(0).toUpperCase() + featureName.slice(1), prefix: featureName, permissions: [] }
                      }
                      featuresMap[featureName].permissions.push({ key: p, action })
                    })
                    return Object.values(featuresMap)
                  }

                  return (
                    <div key={group.title} className="bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm rounded-2xl overflow-visible">
                      {/* Accordion Header */}
                      <div
                        onClick={() => toggleModuleAccordion(group.title)}
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-[var(--theme-surface-hover)] transition-colors cursor-pointer select-none rounded-t-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <span className={cn(
                            "material-symbols-outlined text-[var(--theme-text-subtle)] transition-transform duration-200",
                            isExpanded ? "rotate-90 text-[var(--theme-primary)]" : ""
                          )} style={{ fontSize: '18px' }}>
                            chevron_right
                          </span>
                          <div>
                            <h3 className="font-bold text-sm text-[var(--theme-text)] leading-tight">{group.title}</h3>
                            <p className={cn(
                              "text-[10px] font-bold uppercase tracking-widest mt-1",
                              activeCount > 0 ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-muted)]"
                            )}>
                              {`${activeCount} dari ${moduleItems.length} Izin Diaktifkan`}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3" onClick={e => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={toggleModulePermissions}
                            className={cn(
                              "text-[9px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-lg border transition-all active:scale-95 cursor-pointer flex items-center gap-1.5",
                              allChecked
                                ? "bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20 hover:bg-[var(--theme-primary)]/20"
                                : someChecked
                                  ? "bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20 hover:bg-[var(--theme-warning)]/20"
                                  : "bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)] hover:bg-[var(--theme-border-muted)] hover:text-[var(--theme-text)]"
                            )}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                              {allChecked ? 'check_box' : someChecked ? 'indeterminate_check_box' : 'add_box'}
                            </span>
                            {allChecked ? 'Semua Aktif' : someChecked ? 'Sebagian Aktif' : 'Aktifkan Semua'}
                          </button>
                        </div>
                      </div>

                      {/* Accordion Content */}
                      {isExpanded && (
                        <div className="p-0 border-t border-[var(--theme-border-muted)] bg-[var(--theme-surface)] overflow-visible rounded-b-2xl">
                          <div className="w-full overflow-x-auto pb-2 custom-scrollbar">
                            <table className="w-full min-w-[800px] text-left border-collapse table-fixed">
                              <thead>
                                <tr className="bg-[var(--theme-surface-hover)] border-b border-[var(--theme-border)] text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] select-none">
                                  <th className="py-3 px-5 w-[30%]">Nama Fitur</th>
                                  <th className="py-3 px-4 w-[14%] text-left">Lihat (Read)</th>
                                  <th className="py-3 px-4 w-[14%] text-left">Tambah (Create)</th>
                                  <th className="py-3 px-4 w-[14%] text-left">Ubah (Update)</th>
                                  <th className="py-3 px-4 w-[14%] text-left">Hapus (Delete)</th>
                                  <th className="py-3 px-5 w-[14%] text-left">Aksi Lain</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--theme-border-muted)]">
                                {(() => {
                                  const renderCell = (permsList) => {
                                    if (permsList.length === 0) return <span className="text-[var(--theme-text-subtle)] font-bold text-xs select-none pl-1.5">-</span>;
                                    return (
                                      <div className="flex flex-col items-start justify-center gap-1.5">
                                        {permsList.map(p => {
                                          const isPermChecked = permissionDraft.includes(p.key);
                                          const showLabel = permsList.length > 1 || !['view', 'create', 'edit', 'delete'].includes(p.action);
                                          return (
                                            <label
                                              key={p.key}
                                              className={cn(
                                                "group flex items-center gap-2 p-1.5 px-2 -ml-2 rounded-xl border border-transparent transition-all select-none w-max max-w-full cursor-pointer hover:bg-[var(--theme-surface-hover)] hover:border-[var(--theme-border-muted)]",
                                                isPermChecked ? "bg-[var(--theme-primary)]/[0.04] border-[var(--theme-primary)]/10" : ""
                                              )}
                                              title={PERM_DESCS[p.key] || p.key}
                                            >
                                              <div className="relative flex items-center justify-center shrink-0">
                                                <input
                                                  type="checkbox"
                                                  checked={isPermChecked}
                                                  onChange={() => togglePermission(p.key)}
                                                  className="absolute opacity-0 w-full h-full cursor-pointer z-10"
                                                />
                                                <div className={cn(
                                                  "w-[18px] h-[18px] rounded-md flex items-center justify-center transition-all duration-200 border-2",
                                                  isPermChecked
                                                    ? "bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white shadow-sm shadow-[var(--theme-primary)]/30 scale-105"
                                                    : "bg-[var(--theme-surface)] border-[var(--theme-border-muted)] text-transparent group-hover:border-[var(--theme-primary)]/40 group-hover:bg-[var(--theme-primary)]/[0.02]"
                                                )}>
                                                  <span className="material-symbols-outlined font-black" style={{ fontSize: '13px' }}>check</span>
                                                </div>
                                              </div>
                                              {showLabel && (
                                                <span className={cn(
                                                  "text-[9px] font-bold tracking-wider select-none truncate max-w-[120px] uppercase",
                                                  isPermChecked ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-muted)]"
                                                )}>
                                                  {p.action}
                                                </span>
                                              )}
                                            </label>
                                          );
                                        })}
                                      </div>
                                    );
                                  };

                                  return groupPermissionsByFeature(moduleItems).map(feature => {
                                    const featurePermissions = feature.permissions;
                                    const isSomeChecked = featurePermissions.some(p => permissionDraft.includes(p.key));

                                    const views = [];
                                    const creates = [];
                                    const updates = [];
                                    const deletes = [];
                                    const others = [];

                                    featurePermissions.forEach(p => {
                                      if (p.action === 'view') views.push(p);
                                      else if (p.action === 'create' || p.action === 'add' || p.action === 'submit') creates.push(p);
                                      else if (p.action === 'edit' || p.action === 'update') updates.push(p);
                                      else if (p.action === 'delete' || p.action === 'remove') deletes.push(p);
                                      else others.push(p);
                                    });

                                    return (
                                      <tr
                                        key={feature.prefix}
                                        className={cn(
                                          "transition-colors hover:bg-[var(--theme-surface-hover)]",
                                          isSomeChecked ? "bg-[var(--theme-primary)]/[0.02]" : ""
                                        )}
                                      >
                                        <td className="py-3.5 px-5 align-middle">
                                          <div className="flex flex-col">
                                            <span className="text-[13px] font-bold font-headline text-[var(--theme-text)] tracking-tight">
                                              {feature.name}
                                            </span>
                                            <span className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest mt-0.5">
                                              {feature.prefix}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="py-3.5 px-4 text-left align-middle">{renderCell(views)}</td>
                                        <td className="py-3.5 px-4 text-left align-middle">{renderCell(creates)}</td>
                                        <td className="py-3.5 px-4 text-left align-middle">{renderCell(updates)}</td>
                                        <td className="py-3.5 px-4 text-left align-middle">{renderCell(deletes)}</td>
                                        <td className="py-3.5 px-5 text-left align-middle">{renderCell(others)}</td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── Role Identity Dialog (Simplified) ── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        icon="add"
        title={isEditMode ? 'Edit Identitas Role Prodi' : 'Buat Identitas Role Baru'}
        description="Tentukan nama role dan deskripsi. Matriks izin dapat diatur pada tab Permission Matrix."
        subtitle="ROLE IDENTITY"
        maxWidth="max-w-xl"
        bodyClassName="p-8 pt-5 max-h-[50vh] overflow-y-auto no-scrollbar"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)}>BATAL</ModalCancelButton>
            <ModalSaveButton
              form="crud-role-form"
              loading={isSubmitting}
            >
              SIMPAN IDENTITAS
            </ModalSaveButton>
          </>
        }
      >
        <form id="crud-role-form" onSubmit={handleSaveRoleInfo} className="flex flex-col space-y-5">
          {/* Nama Role */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">Nama Otoritas Role</Label>
            <Input
              required
              value={form.Nama}
              onChange={e => setForm({ ...form, Nama: e.target.value })}
              placeholder="Misal: Kaprodi, Sekretaris Prodi, Staff..."
              className="h-11 rounded-xl border-slate-200 bg-white focus:bg-slate-50 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] shadow-none transition-all font-semibold text-sm text-slate-900"
            />
          </div>

          {/* Deskripsi */}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-slate-500 tracking-widest uppercase mb-1.5">Tanggung Jawab Singkat</Label>
            <Input
              value={form.Deskripsi}
              onChange={e => setForm({ ...form, Deskripsi: e.target.value })}
              placeholder="Deskripsi singkat kewenangan tugas..."
              className="h-11 rounded-xl border-slate-200 bg-white focus:bg-slate-50 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] shadow-none transition-all font-semibold text-sm text-slate-900"
            />
          </div>
        </form>
      </DialogModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Role Otoritas Prodi?"
        description="Apakah Anda yakin ingin menghapus role otorisasi ini? Seluruh admin prodi dengan role ini akan kehilangan izin akses halaman terkait."
        loading={isSubmitting}
      />
    </PageContent>
  )
}
