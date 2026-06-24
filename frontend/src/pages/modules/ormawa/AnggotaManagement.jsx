"use client"
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';



import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { SelectField, SelectOption } from '@/components/ui/SelectField'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const getFullUrl = (path) => {
  if (!path) return null
  if (path.startsWith('http')) return path
  const baseUrl = API_BASE_URL.replace('/api', '')
  return `${baseUrl}${path}`
}

const getRoleStyle = (role = '') => {
  const r = String(role).toLowerCase().trim();
  if (r.includes('ketua umum') || r === 'ketua') return 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary)]/20'
  if (r.includes('wakil ketua')) return 'bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)] border-[var(--theme-secondary)]/20'
  if (r.includes('sekretaris') || r.includes('bendahara')) return 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info)]/20'
  if (r.includes('kepala') || r.includes('kadiv')) return 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20'
  if (r.includes('staff') || r.includes('staf') || r === 'anggota') return 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20'
  return 'bg-[var(--theme-bg)] text-[var(--theme-text-subtle)] border-border'
}

const ROLES = ['Ketua', 'Ketua Umum', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Kepala Divisi', 'Staff', 'Anggota']

export default function AnggotaManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [members, setMembers] = useState([])
  const [students, setStudents] = useState([])
  const [divisions, setDivisions] = useState([])
  const [customRoles, setCustomRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const ormawaId = getOrmawaId()
  const [form, setForm] = useState({ MahasiswaID: '', Role: 'Anggota', Divisi: '', Email: '', NoHP: '', OrmawaID: ormawaId })

  const user = useAuthStore(state => state.user)
  const { hasPermission, withPermissionCheck } = usePermission()
  
  const canCreate = hasPermission('ormawa.members.create')
  const canEdit = hasPermission('ormawa.members.update')
  const canDelete = hasPermission('ormawa.members.delete')

  const [sortConfig, setSortConfig] = useState({ key: 'Nama', direction: 'asc' })
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const [filterRole, setFilterRole] = useState('all')
  const [filterDivisi, setFilterDivisi] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const filteredMembers = useMemo(() => {
    return members.filter(m => {
      if (filterRole !== 'all' && (m.Role || 'Anggota') !== filterRole) return false
      if (filterDivisi !== 'all' && (m.Divisi || '') !== filterDivisi) return false
      if (filterStatus !== 'all') {
        const s = String(m.Status || 'aktif').toLowerCase().trim()
        if (filterStatus === 'aktif' && s !== 'aktif' && s !== '') return false
        if (filterStatus === 'nonaktif' && (s === 'aktif' || s === '')) return false
      }
      return true
    })
  }, [members, filterRole, filterDivisi, filterStatus])

  const sortedMembers = useMemo(() => {
    const items = [...filteredMembers]
    items.sort((a, b) => {
      let aVal, bVal
      if (sortConfig.key === 'Nama') {
        aVal = (a.Mahasiswa?.Nama || '').toLowerCase()
        bVal = (b.Mahasiswa?.Nama || '').toLowerCase()
      } else if (sortConfig.key === 'NIM') {
        aVal = (a.Mahasiswa?.NIM || '').toLowerCase()
        bVal = (b.Mahasiswa?.NIM || '').toLowerCase()
      } else {
        aVal = String(a[sortConfig.key] || '').toLowerCase()
        bVal = String(b[sortConfig.key] || '').toLowerCase()
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    return items
  }, [filteredMembers, sortConfig])

  const [isAddingNewDiv, setIsAddingNewDiv] = useState(false)
  const [newDivName, setNewDivName] = useState('')
  const [isSavingDiv, setIsSavingDiv] = useState(false)
  const [periods, setPeriods] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('aktif')
  const [isRegenOpen, setIsRegenOpen] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const fetchMembers = async () => {
    setLoading(true)
    try {
      const data = await fetchWithAuth(`${API}/members?ormawaId=${ormawaId}&periode=${selectedPeriod}`)
      if (data.status === 'success') {
        setMembers(data.data || [])
        if (data.periods) {
          setPeriods(data.periods)
        }
      } else {
        toast.error('Gagal memuat anggota')
      }
    } catch { toast.error('Koneksi gagal') } finally { setLoading(false) }
  }
  const fetchStudents = async () => {
    try { const data = await fetchWithAuth(`${API}/students`); if (data.status === 'success') setStudents(data.data || []) } catch { }
  }
  const fetchDivisions = async () => {
    try { const data = await fetchWithAuth(`${API}/divisions?ormawaId=${ormawaId}`); if (data.status === 'success') setDivisions(data.data || []) } catch { }
  }
  const fetchCustomRoles = async () => {
    try { const data = await fetchWithAuth(`${API}/roles?ormawaId=${ormawaId}`); if (data.status === 'success') setCustomRoles(data.data || []) } catch { }
  }

  const handleCreateDivInline = async () => {
    if (!newDivName.trim()) return
    setIsSavingDiv(true)
    try {
      const data = await fetchWithAuth(`${API}/divisions`, {
        method: 'POST',
        body: JSON.stringify({ Nama: newDivName.trim(), OrmawaID: Number(ormawaId) }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (data.status === 'success') {
        toast.success('Divisi baru dibuat')
        setForm(prev => ({ ...prev, Divisi: newDivName.trim() }))
        setNewDivName('')
        setIsAddingNewDiv(false)
        await fetchDivisions()
      } else {
        toast.error(data.message || 'Gagal membuat divisi')
      }
    } catch {
      toast.error('Koneksi gagal')
    } finally {
      setIsSavingDiv(false)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchDivisions()
    fetchCustomRoles()
  }, [ormawaId])

  useEffect(() => {
    fetchMembers()
  }, [selectedPeriod, ormawaId])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleOpenAdd = () => {
    setIsEditMode(false); setForm({ MahasiswaID: '', Role: 'Anggota', Divisi: '', OrmawaID: ormawaId, Mahasiswa: null }); setSearchQuery(''); setIsSearching(false); setIsCrudOpen(true)
  }
  const handleOpenEdit = (row) => {
    setIsEditMode(true); setForm({ id: row.id || row.ID, MahasiswaID: String(row.MahasiswaID || row.mahasiswaID || row.Mahasiswa?.id || row.Mahasiswa?.ID || row.Mahasiswa?.Id || ''), Role: row.Role || 'Anggota', Divisi: row.Divisi || '', OrmawaID: ormawaId, Mahasiswa: row.Mahasiswa }); setSearchQuery(row.Mahasiswa ? `${row.Mahasiswa.Nama || row.Mahasiswa.nama} (${row.Mahasiswa.NIM || row.Mahasiswa.nim})` : ''); setIsSearching(false); setIsCrudOpen(true)
  }
  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.MahasiswaID || form.MahasiswaID === '0' || form.MahasiswaID === '') {
      toast.error('Wajib mencari dan memilih mahasiswa terlebih dahulu!')
      return
    }
    setIsSubmitting(true)
    const formId = form.id || form.ID
    const url = isEditMode ? `${API}/members/${formId}` : `${API}/members`
    const method = isEditMode ? 'PUT' : 'POST'
    const payload = {
      Role: form.Role,
      Divisi: form.Divisi,
      MahasiswaID: Number(form.MahasiswaID),
      OrmawaID: Number(form.OrmawaID),
      EmailKampus: form.Email,
      NoHP: form.NoHP
    }
    try {
      const data = await fetchWithAuth(url, { method, body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
      if (data.status === 'success') { toast.success(isEditMode ? 'Data diperbarui' : 'Anggota ditambahkan'); setIsCrudOpen(false); fetchMembers() }
      else toast.error(data.message || 'Gagal menyimpan')
    } catch { toast.error('Terjadi kesalahan') } finally { setIsSubmitting(false) }
  }
  const handleDelete = async () => {
    setIsSubmitting(true)
    const selectedId = selected?.id || selected?.ID
    try {
      const data = await fetchWithAuth(`${API}/members/${selectedId}`, { method: 'DELETE' })
      if (data.status === 'success') { toast.success('Anggota deleted'); setIsDelOpen(false); fetchMembers() }
      else toast.error('Gagal menghapus')
    } catch { toast.error('Terjadi kesalahan') } finally { setIsSubmitting(false) }
  }

  const handleRegenerate = async () => {
    setIsRegenerating(true)
    try {
      const data = await fetchWithAuth(API + '/members/regenerate', { method: 'POST' })
      if (data.status === 'success') {
        toast.success(data.message || 'Regenerasi berhasil')
        setIsRegenOpen(false)
        fetchMembers()
      } else {
        toast.error(data.message || 'Gagal regenerasi')
      }
    } catch (e) {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsRegenerating(false)
    }
  }

  const columns = [
    {
      key: 'Nama', label: 'Profil Anggota', sortable: true, className: 'min-w-[280px]',
      render: (val, row) => {
        const fotoUrl = getFullUrl(row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url || row.Mahasiswa?.Foto || row.Mahasiswa?.Pengguna?.Foto || null);
        return (
          <div className="flex items-center gap-3">
            {fotoUrl ? (
              <img src={fotoUrl} alt={row.Mahasiswa?.Nama || 'Member'}
                className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-border"
                onError={(e) => { e.target.src = ''; }} />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] flex items-end justify-center overflow-hidden shrink-0 border border-border shadow-sm">
                <span className="material-symbols-outlined text-[var(--theme-text-subtle)] text-2xl mb-1">person</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-bold text-[var(--theme-text)] font-headline tracking-tighter text-[13px]">{row.Mahasiswa?.Nama || '—'}</span>
              <span className="text-[10px] text-[var(--theme-text-subtle)] font-semibold tracking-tight font-mono">{row.Mahasiswa?.NIM || '—'}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'Role', label: 'Jabatan', sortable: true, className: 'w-[200px]',
      render: (val) => (
        <Badge className={cn("font-semibold text-[10px] px-2.5 py-1 border shadow-none rounded-full uppercase tracking-wider", getRoleStyle(val))}>
          {val || 'Anggota'}
        </Badge>
      )
    },
    {
      key: 'Divisi', label: 'Divisi', sortable: true, className: 'w-[180px]',
      render: (val) => val
        ? <Badge className="bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-semibold text-[10px] border border-[var(--theme-primary)]/20 rounded-full px-2.5 py-1">{val}</Badge>
        : <span className="text-[var(--theme-text-subtle)] text-xs font-bold uppercase tracking-wider font-headline">Umum</span>
    },
    {
      key: 'Status', label: 'Status', sortable: true, className: 'w-[130px] text-center', cellClassName: 'text-center',
      render: (val) => {
        const s = String(val || 'aktif').toLowerCase().trim();
        const isAktif = s === 'aktif' || s === '';
        return (
          <Badge className={cn('font-semibold text-[10px] px-2.5 py-1 border-none shadow-none rounded-full uppercase tracking-wider',
            isAktif ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] ring-1 ring-[var(--theme-success)]/20' : 'bg-[var(--theme-bg)] text-[var(--theme-text-subtle)]')}>
            {isAktif ? 'Aktif' : val}
          </Badge>
        );
      }
    }
  ]

  const combinedRoles = Array.from(new Set([
    ...ROLES,
    ...customRoles.map(r => r.Nama || r.nama)
  ])).filter(Boolean)

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Manajemen"
        highlightedTitle="Anggota"
        subtitle="Database keanggotaan dan struktur kepengurusan organisasi mahasiswa."
        icon="groups"

        badges={[{ label: 'Organisasi Kemahasiswaan', active: true }]}
        actions={canCreate ? (
          <Button onClick={handleOpenAdd} className="h-11 px-6 rounded-xl bg-slate-800 text-white font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-none border-none cursor-pointer">
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={3}>add</span>
            Tambah Anggota
          </Button>
        ) : null}
      />

      {/* ── Period Filter Bar ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card shadow-sm rounded-xl border border-border p-5 mb-6">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-[var(--theme-text)] uppercase tracking-tight font-headline">Periode Kepengurusan</h3>
          <p className="text-xs font-semibold text-[var(--theme-text-subtle)]">Tampilkan daftar pengurus berdasarkan tahun periode aktif.</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto ml-auto">
          <div className="w-full sm:w-72">
            <SelectField
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              className="w-full h-10"
            >
              <SelectOption value="aktif">Aktif Sekarang (Terbaru)</SelectOption>
              {periods.map(p => (
                <SelectOption key={p} value={p}>Periode {p} (Demisioner/Alumni)</SelectOption>
              ))}
            </SelectField>
          </div>
          <button type="button" onClick={() => setIsRegenOpen(true)}
            className="h-10 px-5 rounded-xl bg-[var(--theme-error)] hover:bg-[var(--theme-error)]/90 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shrink-0 flex items-center gap-2 border-none">
            <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>history</span>
            Regenerasi
          </button>
        </div>
      </div>

      {/* ── Content Area ───────────────────────────────────────────── */}
      <Card className="glass-card shadow-sm rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-300 mb-6">
        <CardContent className="p-0">
          <DataTable
          title="Daftar Anggota"
          subtitle="Menampilkan daftar anggota yang ada di Siakad."
            columns={columns}
            data={sortedMembers}
            loading={loading}
            sortConfig={sortConfig}
            onSort={handleSort}
            searchPlaceholder="Cari nama atau NIM anggota..."
            toolbarActions={
              <div className="flex items-center gap-2">
                <SelectField value={filterRole} onValueChange={setFilterRole} className="h-9 min-w-[140px] text-xs rounded-lg" placeholder="Semua Jabatan">
                  <SelectOption value="all">Semua Jabatan</SelectOption>
                  {combinedRoles.map(r => <SelectOption key={r} value={r}>{r}</SelectOption>)}
                </SelectField>

                <SelectField value={filterDivisi} onValueChange={setFilterDivisi} className="h-9 min-w-[140px] text-xs rounded-lg" placeholder="Semua Divisi">
                  <SelectOption value="all">Semua Divisi</SelectOption>
                  {divisions.map(d => <SelectOption key={d.ID || d.id} value={d.Nama || d.nama}>{d.Nama || d.nama}</SelectOption>)}
                </SelectField>

                <SelectField value={filterStatus} onValueChange={setFilterStatus} className="h-9 min-w-[120px] text-xs rounded-lg" placeholder="Semua Status">
                  <SelectOption value="all">Semua Status</SelectOption>
                  <SelectOption value="aktif">Aktif</SelectOption>
                  <SelectOption value="nonaktif">Nonaktif</SelectOption>
                </SelectField>

                {(filterRole !== 'all' || filterDivisi !== 'all' || filterStatus !== 'all') && (
                  <button onClick={() => { setFilterRole('all'); setFilterDivisi('all'); setFilterStatus('all') }}
                    className="h-9 px-3 text-xs font-bold text-[var(--theme-error)] bg-[var(--theme-error-light)] rounded-lg border border-[var(--theme-error)]/20 hover:bg-[var(--theme-error-light)]/80 transition-colors">
                    Reset
                  </button>
                )}
                <div className="ml-2 hidden lg:block text-[10px] font-bold text-[var(--theme-text-subtle)] whitespace-nowrap">
                  {sortedMembers.length} / {members.length} anggota
                </div>
              </div>
            }
            actions={(row) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button onClick={() => { setSelected(row); setIsDetailOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors cursor-pointer" title="Detail"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >visibility</span></Button>
                {canEdit && (
                  <Button onClick={() => handleOpenEdit(row)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[var(--theme-warning)] hover:bg-[var(--theme-warning-light)] rounded-lg transition-colors cursor-pointer" title="Edit"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >edit</span></Button>
                )}
                {canDelete && (
                  <Button onClick={() => { setSelected(row); setIsDelOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] rounded-lg transition-colors cursor-pointer" title="Hapus"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >delete</span></Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* DETAIL */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Detail Anggota"
        subtitle="Informasi keanggotaan aktif organisasi mahasiswa."
        icon="person"
        maxWidth="max-w-md"
        footer={
          <ModalCancelButton onClick={() => setIsDetailOpen(false)}>
            TUTUP PROFIL
          </ModalCancelButton>
        }
      >
        {selected && (() => {
          const selectedFotoUrl = getFullUrl(selected.Mahasiswa?.FotoURL || selected.Mahasiswa?.foto_url || selected.Mahasiswa?.Foto || selected.Mahasiswa?.Pengguna?.Foto || null);
          return (
            <div className="flex flex-col items-center pt-2 space-y-6 w-full">
              {/* Profile Image */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-hover)] rounded-3xl blur-lg opacity-30"></div>
                <div className="relative size-24 rounded-3xl bg-white p-1 shadow-xl border border-slate-100">
                  {selectedFotoUrl ? (
                    <img
                      src={selectedFotoUrl}
                      alt={selected.Mahasiswa?.Nama}
                      className="size-full rounded-2xl object-cover"
                      onError={(e) => { e.target.src = ''; }}
                    />
                  ) : (
                    <div className="size-full rounded-2xl bg-slate-50 flex items-center justify-center font-headline text-3xl font-black text-slate-300 border border-slate-100">
                      {selected.Mahasiswa?.Nama?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
                    </div>
                  )}
                </div>
              </div>

              {/* Name & NIM */}
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black font-headline tracking-tighter text-[var(--theme-text)]">{selected.Mahasiswa?.Nama}</h2>
                <div className="flex items-center justify-center gap-2">
                  <span className="text-[10px] font-black tracking-widest px-2.5 py-1 bg-slate-100 text-slate-500 rounded-full font-headline uppercase">NIM</span>
                  <span className="text-xs text-slate-600 font-bold font-mono">{selected.Mahasiswa?.NIM}</span>
                </div>
              </div>

              {/* Role & Divisi */}
              <div className="w-full grid grid-cols-2 gap-4 bg-slate-50 rounded-2xl p-5 border border-slate-200 shadow-inner">
                <div className="flex flex-col items-center text-center space-y-2">
                  <span className="material-symbols-outlined text-slate-400 text-2xl">badge</span>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Jabatan</p>
                    <Badge className={cn("font-semibold text-[10px] px-3 py-1 border shadow-none rounded-full uppercase tracking-wider", getRoleStyle(selected.Role))}>
                      {selected.Role || 'Anggota'}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-center text-center space-y-2 border-l border-slate-200">
                  <span className="material-symbols-outlined text-slate-400 text-2xl">workspaces</span>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 tracking-widest uppercase mb-1">Divisi</p>
                    <Badge className="bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-semibold text-[10px] border border-[var(--theme-primary)]/20 rounded-full px-3 py-1 uppercase tracking-wider">
                      {selected.Divisi || 'Umum'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </DialogModal>

      {/* CRUD */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? 'Edit Anggota' : 'Tambah Anggota Baru'}
        subtitle="Daftarkan mahasiswa sebagai anggota aktif ormawa."
        icon={isEditMode ? 'edit' : 'person_add'}
        maxWidth="max-w-xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} />
            <ModalSaveButton
              onClick={handleSave}
              disabled={isSubmitting || !form.MahasiswaID}
              loading={isSubmitting}
              icon="save"
            >
              {isEditMode ? 'UPDATE DATA' : 'SIMPAN ANGGOTA'}
            </ModalSaveButton>
          </>
        }
      >
        <div className="space-y-2 relative" ref={dropdownRef}>
          <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline">Pilih Mahasiswa</Label>
          {isEditMode ? (
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }}>person</span>
              <input
                value={form.Mahasiswa ? `${form.Mahasiswa.Nama || form.Mahasiswa.nama} (${form.Mahasiswa.NIM || form.Mahasiswa.nim})` : '—'}
                disabled
                className="w-full pl-11 pr-4 h-12 rounded-2xl border border-border bg-[var(--theme-bg)] text-[var(--theme-text-subtle)] font-bold text-sm font-headline cursor-not-allowed focus:outline-none"
              />
            </div>
          ) : (
            <div className="relative">
              <div className="relative group">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] group-focus-within:text-[var(--theme-primary)] transition-colors" style={{ fontSize: '18px' }}>search</span>
                <input
                  type="text"
                  placeholder="Ketik nama atau NIM mahasiswa..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setIsSearching(true);
                    if (form.MahasiswaID) setForm({ ...form, MahasiswaID: '' });
                  }}
                  className="w-full pl-11 pr-10 h-12 rounded-2xl border border-border bg-[var(--theme-bg)]/50 focus:bg-[var(--theme-surface)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-all font-bold text-sm outline-none"
                />
                {form.MahasiswaID && (
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-success)] font-bold" style={{ fontSize: '18px' }}>check_circle</span>
                )}
              </div>

              {isSearching && searchQuery.trim() !== '' && (
                <div className="absolute z-50 w-full mt-1 bg-[var(--theme-surface)] border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1 flex flex-col">
                  {students
                    .filter(s => s?.Nama?.toLowerCase().includes(searchQuery.toLowerCase()) || s?.NIM?.toLowerCase().includes(searchQuery.toLowerCase()))
                    .slice(0, 8)
                    .map(s => {
                      const studentFotoUrl = getFullUrl(s?.FotoURL || s?.foto_url || s?.Foto || s?.Pengguna?.Foto || null);
                      return (
                        <button
                          type="button"
                          key={s.id || s.ID}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl cursor-pointer transition-all duration-150 my-0.5 hover:bg-[var(--theme-bg)] text-[var(--theme-text)] font-bold"
                          onClick={() => {
                            setForm({ ...form, MahasiswaID: s?.id?.toString() || s?.ID?.toString() });
                            setSearchQuery(`${s.Nama} (${s.NIM})`);
                            setIsSearching(false);
                          }}
                        >
                          {studentFotoUrl ? (
                            <img
                              src={studentFotoUrl}
                              alt={s.Nama}
                              className="w-7 h-7 rounded-lg object-cover shrink-0 border border-border shadow-sm"
                              onError={(e) => { e.target.src = ''; }}
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-[var(--theme-bg)] flex items-end justify-center overflow-hidden shrink-0 border border-border">
                              <span className="material-symbols-outlined text-[var(--theme-text-subtle)] text-base mb-0.5">person</span>
                            </div>
                          )}
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-bold text-[var(--theme-text)] truncate">{s.Nama}</span>
                            <span className="text-[9px] text-[var(--theme-text-subtle)] font-medium font-mono">{s.NIM}</span>
                          </div>
                        </button>
                      );
                    })}
                  {students.filter(s => s?.Nama?.toLowerCase().includes(searchQuery.toLowerCase()) || s?.NIM?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                    <div className="px-3 py-4 text-center text-xs font-medium text-[var(--theme-text-subtle)]">
                      Mahasiswa tidak ditemukan
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1 h-5">
              <Label className="text-[9px] md:text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] font-headline">Jabatan</Label>
            </div>
            <SelectField value={form.Role} onValueChange={(val) => setForm({ ...form, Role: val })} className="w-full h-12">
              {combinedRoles.map((r) => (
                <SelectOption key={r} value={r}>
                  {r}
                </SelectOption>
              ))}
            </SelectField>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1 h-5">
              <Label className="text-[9px] md:text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] font-headline">Divisi</Label>
              <button
                type="button"
                onClick={() => setIsAddingNewDiv(!isAddingNewDiv)}
                className="text-[9px] font-black text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] tracking-wider uppercase font-headline flex items-center gap-0.5"
              >
                <span className="material-symbols-outlined text-[12px] block font-black">add</span>
                {isAddingNewDiv ? 'Pilih Divisi' : 'Buat Baru'}
              </button>
            </div>
            {isAddingNewDiv ? (
              <div className="flex gap-2">
                <Input
                  value={newDivName}
                  onChange={e => setNewDivName(e.target.value)}
                  placeholder="Nama Divisi Baru..."
                  className="h-12 rounded-2xl border-border bg-[var(--theme-bg)]/50 font-bold text-xs md:text-sm"
                />
                <Button
                  type="button"
                  onClick={handleCreateDivInline}
                  disabled={isSavingDiv || !newDivName.trim()}
                  className="h-12 px-4 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white flex items-center justify-center text-xs font-bold shrink-0 border-none shadow-none"
                >
                  {isSavingDiv ? '...' : 'OK'}
                </Button>
              </div>
            ) : (
              <SelectField value={form.Divisi || 'Umum'} onValueChange={(val) => setForm({ ...form, Divisi: val === 'Umum' ? '' : val })} className="w-full h-12">
                <SelectOption value="Umum">
                  Umum
                </SelectOption>
                {divisions.map((d) => (
                  <SelectOption key={d.id || d.ID} value={d.Nama}>
                    {d.Nama}
                  </SelectOption>
                ))}
              </SelectField>
            )}
          </div>
        </div>
      </DialogModal>

      <DeleteConfirmModal isOpen={isDelOpen} onClose={() => setIsDelOpen(false)} onConfirm={handleDelete}
        title="Hapus Anggota?" description="Data keanggotaan ini akan dihapus permanen dari sistem." loading={isSubmitting} />

      <DeleteConfirmModal isOpen={isRegenOpen} onClose={() => setIsRegenOpen(false)} onConfirm={handleRegenerate}
        title="Regenerasi Kepengurusan?"
        description="Arsipkan semua anggota aktif ke periode sebelumnya. Tindakan ini tidak bisa dikembalikan."
        loading={isRegenerating} />
    </PageContent>
  )
}
