"use client"
import React, { useState, useEffect, useRef } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { DataTable } from '@/components/ui/DataTable'



import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'

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
  if (r.includes('pembina') || r.includes('penanggung jawab')) return 'bg-violet-50 text-violet-700 border-violet-200 ring-1 ring-violet-500/10'
  if (r.includes('sekretaris') || r.includes('bendahara')) return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-500/10'
  if (r.includes('koordinator') || r.includes('staf khusus')) return 'bg-amber-50 text-amber-700 border-amber-200 ring-1 ring-amber-500/10'
  if (r.includes('staff') || r.includes('staf') || r === 'anggota') return 'bg-sky-50 text-sky-700 border-sky-200 ring-1 ring-sky-500/10'
  return 'bg-slate-50 text-slate-600 border-border ring-1 ring-slate-500/5'
}

const JABATAN = ['Pembina', 'Penanggung Jawab', 'Sekretaris Eksekutif', 'Koordinator Program', 'Staf Khusus']

export default function StaffManagement() {
  const [data, setData] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const ormawaId = getOrmawaId()
  const [form, setForm] = useState({ Nama: '', MahasiswaID: '', Jabatan: 'Pembina', Divisi: 'Umum', Email: '', NoHP: '', OrmawaID: ormawaId })

  const { hasPermission } = usePermission()
  const canManageStaff = hasPermission('ormawa.members.update')

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mRes, sRes] = await Promise.all([
        fetchWithAuth(`${API}/members?ormawaId=${ormawaId}`),
        fetchWithAuth(`${API}/students`)
      ])
      if (mRes.status === 'success') {
        setData((mRes.data || []).filter(m => ['Pembina', 'Penanggung Jawab', 'Sekretaris Eksekutif', 'Koordinator Program', 'Staf Khusus', 'Ketua', 'Wakil Ketua'].includes(m.Role)))
      }
      if (sRes.status === 'success') setStudents(sRes.data || [])
    } catch {
      toast.error('Gagal memuat data staf')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [ormawaId])

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
    setIsEditMode(false)
    setForm({ Nama: '', MahasiswaID: '', Jabatan: 'Pembina', Divisi: 'Umum', Email: '', NoHP: '', OrmawaID: ormawaId })
    setSearchQuery('')
    setIsSearching(false)
    setIsCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({ 
      id: row.id || row.ID, 
      Nama: row.Mahasiswa?.Nama || '', 
      MahasiswaID: String(row.MahasiswaID || ''), 
      Jabatan: row.Role || 'Pembina', 
      Divisi: row.Divisi || 'Umum',
      Email: row.Mahasiswa?.EmailKampus || '', 
      NoHP: row.Mahasiswa?.NoHP || '', 
      OrmawaID: ormawaId 
    })
    setSearchQuery(row.Mahasiswa ? `${row.Mahasiswa.Nama} (${row.Mahasiswa.NIM})` : '')
    setIsSearching(false)
    setIsCrudOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const formId = form.id || form.ID
    const url = isEditMode ? `${API}/members/${formId}` : `${API}/members`
    const method = isEditMode ? 'PUT' : 'POST'
    try {
      const payload = { 
        Role: form.Jabatan, 
        Divisi: form.Divisi,
        MahasiswaID: Number(form.MahasiswaID), 
        OrmawaID: Number(form.OrmawaID),
        EmailKampus: form.Email,
        NoHP: form.NoHP
      }
      const data = await fetchWithAuth(url, { 
        method, 
        body: JSON.stringify(payload), 
        headers: { 'Content-Type': 'application/json' } 
      })
      if (data.status === 'success') {
        toast.success(isEditMode ? 'Data diperbarui' : 'Staf ditambahkan')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(data.message || 'Gagal menyimpan')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    const selectedId = selected?.id || selected?.ID
    try {
      const data = await fetchWithAuth(`${API}/members/${selectedId}`, { method: 'DELETE' })
      if (data.status === 'success') {
        toast.success('Staf dihapus')
        setIsDelOpen(false)
        fetchData()
      } else {
        toast.error('Gagal menghapus')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'Mahasiswa', label: 'Profil Staf', className: 'min-w-[280px]',
      render: (val, row) => {
        const fotoUrl = getFullUrl(row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url || row.Mahasiswa?.Foto || row.Mahasiswa?.Pengguna?.Foto || null);
        return (
          <div className="flex items-center gap-3">
            {fotoUrl ? (
              <img
                src={fotoUrl}
                alt={row.Mahasiswa?.Nama || 'Staf'}
                className="w-10 h-10 rounded-xl object-cover shrink-0 shadow-sm border border-border"
                onError={(e) => { e.target.src = ''; }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-end justify-center overflow-hidden shrink-0 border border-border shadow-sm">
                <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">person</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-bold text-slate-900 font-headline tracking-tighter text-[13px]">{row.Mahasiswa?.Nama || '—'}</span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-tight font-mono">{row.Mahasiswa?.NIM || '—'}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'Role', label: 'Jabatan', className: 'w-[200px]',
      render: (val) => (
        <Badge className={cn("font-black text-[10px] px-3 py-1 border shadow-sm rounded-lg uppercase tracking-wider", getRoleStyle(val))}>
          {val || 'Staf'}
        </Badge>
      )
    },
    {
      key: 'Divisi', label: 'Divisi', className: 'w-[180px]',
      render: (val) => val
        ? <Badge className="bg-primary/5 text-primary font-extrabold text-[10px] border border-primary/10 rounded-lg px-2.5 py-0.5">{val}</Badge>
        : <span className="text-slate-400 text-xs font-bold uppercase tracking-wider font-headline">Umum</span>
    },
    {
      key: 'Status', label: 'Status', className: 'w-[130px] text-center', cellClassName: 'text-center',
      render: (val) => {
        const s = String(val || 'aktif').toLowerCase().trim();
        const isAktif = s === 'aktif' || s === '';
        return (
          <Badge className={cn('font-black text-[10px] px-3 py-1 border-none shadow-sm rounded-lg uppercase tracking-wider',
            isAktif ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-500/20' : 'bg-slate-100 text-slate-600')}>
            {isAktif ? 'Aktif' : val}
          </Badge>
        );
      }
    }
  ]

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />

            {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <PageHeader 
        title="Manajemen Staf"
        subtitle="Database keanggotaan pengurus struktural dan pembina organisasi mahasiswa."
        icon="admin_panel_settings"
       
        breadcrumbs={[ { label: 'Dashboard', path: '/ormawa' }, { label: 'Manajemen Staf', path: '#' } ]} 
      />

      {/* ── Content Area ───────────────────────────────────────────── */}
      <Card className="border border-border shadow-sm overflow-hidden bg-surface rounded-2xl">
        <CardContent className="p-0">
          <DataTable
          title="Daftar Staf"
          subtitle="Menampilkan daftar staf yang ada di Siakad."
            columns={columns}
            data={data}
            loading={loading}
            searchPlaceholder="Cari nama atau NIM staf..."
            onAdd={canManageStaff ? handleOpenAdd : undefined}
            addLabel="Tambah Staf"
            actions={(row) => (
              <div className="flex items-center justify-end gap-1">
                <button onClick={() => { setSelected(row); setIsDetailOpen(true) }} className="p-1.5 text-[var(--theme-text-subtle)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors duration-150" title="Detail"><span className="material-symbols-outlined block" style={{ fontSize: '18px' }} >visibility</span></button>
                {canManageStaff && (
                  <button onClick={() => handleOpenEdit(row)} className="p-1.5 text-[var(--theme-text-subtle)] hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors duration-150" title="Edit"><span className="material-symbols-outlined block" style={{ fontSize: '18px' }} >edit</span></button>
                )}
                {canManageStaff && (
                  <button onClick={() => { setSelected(row); setIsDelOpen(true) }} className="p-1.5 text-[var(--theme-text-subtle)] hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors duration-150" title="Hapus"><span className="material-symbols-outlined block" style={{ fontSize: '18px' }} >delete</span></button>
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
        onClose={() => setIsDetailOpen(false)}
        title="Detail Staf"
        description="Informasi lengkap tugas dan kontak pengurus ormawa."
        icon={<span className="material-symbols-outlined">badge</span>}
        maxWidth="max-w-2xl"
        footer={
          <Button variant="default" onClick={() => setIsDetailOpen(false)} className="w-full h-10 justify-center rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white">Tutup Profil</Button>
        }
      >
        {selected && (() => {
          const selectedFotoUrl = getFullUrl(selected.Mahasiswa?.FotoURL || selected.Mahasiswa?.foto_url || selected.Mahasiswa?.Foto || selected.Mahasiswa?.Pengguna?.Foto || null);
          return (
            <div className="p-6 space-y-6">
                <div className="h-32 bg-gradient-to-br from-[var(--theme-primary)] to-[var(--theme-primary-hover)] relative overflow-hidden rounded-2xl">
                  <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                    <span className="material-symbols-outlined size-24 rotate-12 text-white">fingerprint</span>
                  </div>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.08),transparent)]" />
                  <div className="absolute -bottom-8 left-6 z-20 p-1 bg-[var(--theme-surface)] rounded-2xl shadow-xl">
                    {selectedFotoUrl ? (
                      <img
                        src={selectedFotoUrl}
                        alt={selected.Mahasiswa?.Nama}
                        className="h-16 w-16 rounded-xl object-cover"
                        onError={(e) => { e.target.src = ''; }}
                      />
                    ) : (
                      <div className="h-16 w-16 rounded-xl bg-gradient-to-br from-[var(--theme-bg)] to-[var(--theme-border-muted)] text-[var(--theme-text)] flex items-center justify-center font-headline text-xl font-black border border-border">
                        {selected.Mahasiswa?.Nama?.split(' ').map(n => n[0]).join('').substring(0, 2) || '?'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 space-y-6">
                  <div>
                    <h2 className="text-xl font-black font-headline tracking-tighter leading-none" style={{ color: 'var(--theme-h2)' }}>{selected.Mahasiswa?.Nama}</h2>
                    <div className="flex items-center gap-1.5 mt-2.5">
                      <span className="text-[9px] font-black tracking-widest px-2.5 py-0.5 bg-slate-100 text-slate-500 rounded-full font-headline">PENGURUS</span>
                      <span className="text-[10px] text-slate-400 font-bold font-mono">{selected.Mahasiswa?.NIM}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 rounded-2xl bg-[var(--theme-bg)]/50 border border-[var(--theme-border-muted)]">
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-headline">Jabatan Struktural</p>
                      <Badge className={cn("font-black text-[9px] px-2.5 py-0.5 border shadow-sm rounded-lg uppercase tracking-wider", getRoleStyle(selected.Role))}>
                        {selected.Role || 'Staf'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-headline">Divisi Kerja</p>
                      <Badge className="bg-primary/5 text-primary font-extrabold text-[9px] border border-primary/10 rounded-lg px-2.5 py-0.5 uppercase tracking-wider">
                        {selected.Divisi || 'Umum'}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-headline">Email Kampus</p>
                      <p className="text-xs font-bold text-slate-700 underline underline-offset-4 decoration-primary/30">
                        {selected.Mahasiswa?.EmailKampus || selected.Mahasiswa?.email_campuse || '—'}
                      </p>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-headline">No. WhatsApp</p>
                      <p className="text-xs font-bold text-slate-700">
                        {selected.Mahasiswa?.NoHP || '—'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-[9px] font-black text-slate-400 tracking-widest uppercase font-headline ml-1">Tugas & Kontribusi</p>
                    <p className="text-xs text-slate-500 leading-relaxed bg-white p-4 rounded-2xl border border-slate-100 italic">
                      "Staf bertanggung jawab dalam membantu koordinasi internal organisasi sesuai dengan jabatan yang diamanahkan."
                    </p>
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
        onClose={() => setIsCrudOpen(false)}
        title={isEditMode ? 'Edit Staf' : 'Tambah Staf Baru'}
        subtitle="MANAJEMEN STAF"
        description="Daftarkan mahasiswa sebagai pengurus struktural ormawa."
        icon={isEditMode ? "edit" : "person_add"}
        maxWidth="max-w-lg"
        bodyClassName="p-0"
      >
        <form onSubmit={handleSave}>
          <div className="p-6 space-y-4">
              <div className="space-y-2 relative" ref={dropdownRef}>
                <Label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 font-headline">Pilih Mahasiswa</Label>
                {isEditMode ? (
                  <Input
                    value={form.MahasiswaID ? (() => {
                      const s = students.find(x => (x?.id?.toString() || x?.ID?.toString()) === form?.MahasiswaID?.toString());
                      return s ? `${s.Nama} (${s.NIM})` : '—';
                    })() : '—'}
                    disabled
                    className="h-12 rounded-2xl border-border bg-slate-100 text-slate-400 font-bold text-sm font-headline cursor-not-allowed"
                  />
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '18px' }}>search</span>
                      <Input
                        type="text"
                        placeholder="Ketik nama atau NIM mahasiswa..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setIsSearching(true);
                          if (form.MahasiswaID) setForm({ ...form, MahasiswaID: '' });
                        }}
                        className="pl-11 pr-10 h-10 rounded-xl border border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-all font-bold text-sm"
                      />
                      {form.MahasiswaID && (
                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold" style={{ fontSize: '18px' }}>check_circle</span>
                      )}
                    </div>

                    {isSearching && searchQuery.trim() !== '' && (
                      <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-2xl shadow-xl max-h-60 overflow-y-auto p-1 flex flex-col">
                        {students
                          .filter(s => s?.Nama?.toLowerCase().includes(searchQuery.toLowerCase()) || s?.NIM?.toLowerCase().includes(searchQuery.toLowerCase()))
                          .slice(0, 8)
                          .map(s => {
                            const studentFotoUrl = getFullUrl(s?.FotoURL || s?.foto_url || s?.Foto || s?.Pengguna?.Foto || null);
                            return (
                              <button
                                type="button"
                                key={s.id || s.ID}
                                className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl cursor-pointer transition-all duration-150 my-0.5 hover:bg-blue-50/50 text-slate-700 font-bold"
                                onClick={() => {
                                  setForm({ 
                                    ...form, 
                                    MahasiswaID: s?.id?.toString() || s?.ID?.toString(),
                                    Email: s?.EmailKampus || '',
                                    NoHP: s?.NoHP || ''
                                  });
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
                                  <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-end justify-center overflow-hidden shrink-0 border border-border">
                                    <span className="material-symbols-outlined text-slate-400 text-base mb-0.5">person</span>
                                  </div>
                                )}
                                <div className="flex flex-col min-w-0">
                                  <span className="text-xs font-bold text-slate-800 truncate">{s.Nama}</span>
                                  <span className="text-[9px] text-slate-400 font-medium font-mono">{s.NIM}</span>
                                </div>
                              </button>
                            );
                          })}
                        {students.filter(s => s?.Nama?.toLowerCase().includes(searchQuery.toLowerCase()) || s?.NIM?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                           <div className="px-3 py-4 text-center text-xs font-medium text-slate-400">
                            Mahasiswa tidak ditemukan
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 font-headline">Jabatan</Label>
                <Select value={form.Jabatan} onValueChange={(val) => setForm({ ...form, Jabatan: val })}>
                  <SelectTrigger className="w-full h-10 rounded-xl border border-border bg-white px-4 text-xs md:text-sm font-bold text-slate-700 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-all cursor-pointer">
                    <SelectValue placeholder="Pilih Jabatan" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-border shadow-xl p-1 bg-white font-body">
                    {JABATAN.map((j) => (
                      <SelectItem key={j} value={j} className="rounded-lg text-xs py-1.5 focus:bg-[var(--theme-primary-light)] focus:text-[var(--theme-primary)] cursor-pointer font-bold text-slate-700">
                        {j}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 font-headline">Divisi</Label>
                <Input value={form.Divisi} onChange={e => setForm({ ...form, Divisi: e.target.value })} placeholder="Masukkan nama divisi..."
                  className="h-10 rounded-xl border border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-all font-bold text-xs md:text-sm font-headline" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 font-headline">Email</Label>
                  <Input type="email" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} placeholder="email@bku.ac.id"
                    className="h-10 rounded-xl border border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-all font-bold text-xs md:text-sm font-headline" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 font-headline">No. HP</Label>
                  <Input value={form.NoHP} onChange={e => setForm({ ...form, NoHP: e.target.value })} placeholder="08xx-xxxx-xxxx"
                    className="h-10 rounded-xl border border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-all font-bold text-xs md:text-sm font-headline" />
                </div>
              </div>
            </div>
          <div className="px-6 py-4 border-t border-[var(--theme-border-muted)] flex justify-end gap-3 shrink-0">
            <Button variant="ghost" type="button" onClick={() => setIsCrudOpen(false)}>
              Batalkan
            </Button>
            <Button type="submit" disabled={isSubmitting} className="h-10 px-6 rounded-xl bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary)]/90 transition-all font-bold font-headline uppercase flex items-center justify-center gap-2">
              {isSubmitting ? (
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
              ) : (
                <span className="material-symbols-outlined stroke-[3px]" style={{ fontSize: '14px' }}>save</span>
              )}
              <span className="uppercase tracking-[0.1em]">{isEditMode ? 'Update Record' : 'Simpan Data'}</span>
            </Button>
          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal isOpen={isDelOpen} onClose={() => setIsDelOpen(false)} onConfirm={handleDelete}
        title="Hapus Staf?" description="Data staf ini akan dihapus permanen dari sistem." loading={isSubmitting} />
    </PageContent>
  )
}
