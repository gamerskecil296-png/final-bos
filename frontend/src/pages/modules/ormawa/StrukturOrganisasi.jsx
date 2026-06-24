"use client"
import React, { useState, useEffect } from 'react';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { Modal, ModalBody, ModalFooter, ModalBtn } from '@/components/ui/Modal'



import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton } from '@/components/ui/DialogModal'
import { SelectField, SelectOption } from '@/components/ui/SelectField'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'

import { toast, Toaster } from 'react-hot-toast'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
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

const getMemberId = (m) => m?.id || m?.ID

const getRoleBadge = (role = '') => {
  const r = role.toLowerCase();
  if (r.includes('ketua') && !r.includes('wakil')) return 'text-[var(--theme-primary)] bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/20'
  if (r.includes('wakil')) return 'text-[var(--theme-secondary)] bg-[var(--theme-secondary-light)] border border-[var(--theme-secondary)]/20'
  if (r.includes('pembina') || r.includes('penanggung jawab')) return 'text-[var(--theme-info)] bg-[var(--theme-info-light)] border border-[var(--theme-info)]/20'
  if (r.includes('sekretaris') || r.includes('eksekutif')) return 'text-[var(--theme-info)] bg-[var(--theme-info-light)] border border-[var(--theme-info)]/20'
  if (r.includes('bendahara')) return 'text-[var(--theme-success)] bg-[var(--theme-success-light)] border border-[var(--theme-success)]/20'
  if (r.includes('koordinator') || r.includes('staf khusus') || r.includes('spesial')) return 'text-[var(--theme-warning)] bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20'
  return 'text-[var(--theme-text-subtle)] bg-[var(--theme-bg)] border border-border'
}

const OrgCard = ({ member, size = 'md' }) => {
  if (!member) return null
  const sizes = { lg: 'p-4 gap-4', md: 'p-3.5 gap-3.5', sm: 'p-3 gap-3' }
  const avatarSizes = { lg: 'w-14 h-14 rounded-2xl text-lg', md: 'w-11 h-11 rounded-xl text-sm', sm: 'w-9 h-9 rounded-xl text-[10px]' }
  const nameSizes = { lg: 'text-sm md:text-base', md: 'text-[13px]', sm: 'text-[11px]' }
  const cardWidths = { lg: 'w-[320px]', md: 'w-[285px]', sm: 'w-[250px]' }

  const fotoUrl = getFullUrl(member.Mahasiswa?.FotoURL || member.Mahasiswa?.foto_url || member.Mahasiswa?.Foto || member.Mahasiswa?.Pengguna?.Foto || null);

  return (
    <div className={cn(
      'flex items-center glass-card rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group relative overflow-hidden shrink-0',
      sizes[size],
      cardWidths[size]
    )}>
      {/* Dynamic hover color glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-[var(--theme-primary)]/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      {fotoUrl ? (
        <img
          src={fotoUrl}
          alt={member.Mahasiswa?.Nama || member.Nama || 'Member'}
          className={cn('object-cover shrink-0 border border-border shadow-sm transition-transform duration-200 group-hover:scale-102', avatarSizes[size])}
          onError={(e) => { e.target.src = ''; }}
        />
      ) : (
        <div className={cn('bg-[var(--theme-bg)] flex items-center justify-center shrink-0 border border-border shadow-inner', avatarSizes[size])}>
          <span className="material-symbols-outlined text-[var(--theme-text-subtle)] block select-none leading-none" style={{ fontSize: size === 'lg' ? '28px' : size === 'md' ? '22px' : '18px' }}>person</span>
        </div>
      )}

      <div className="flex flex-col min-w-0 leading-none gap-1.5">
        <p className={cn('font-bold font-headline tracking-tight text-[var(--theme-text)] truncate leading-none', nameSizes[size])}>
          {member.Mahasiswa?.Nama || member.Nama || '—'}
        </p>
        <div>
          <span className={cn('text-[9px] font-semibold tracking-widest px-2.5 py-1 rounded-full uppercase font-headline inline-block border-none shadow-none', getRoleBadge(member.Role || 'Anggota'))}>
            {member.Role || 'Anggota'}
          </span>
        </div>
      </div>
    </div>
  )
}

export default function StrukturOrganisasi() {
  const [members, setMembers] = useState([])
  const [divisions, setDivisions] = useState([])
  const [loading, setLoading] = useState(true)
  const [isAddDivOpen, setIsAddDivOpen] = useState(false)
  const [divName, setDivName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [delDiv, setDelDiv] = useState(null)

  // States for BPH Management
  const [students, setStudents] = useState([])
  const [isManageBphOpen, setIsManageBphOpen] = useState(false)
  const [bphForm, setBphForm] = useState({ MahasiswaID: '', Role: 'Sekretaris', Divisi: '' })
  const [bphSearchQuery, setBphSearchQuery] = useState('')
  const [bphIsSearching, setBphIsSearching] = useState(false)

  const { hasPermission } = usePermission()
  const canManage = hasPermission('ormawa.members.update')

  const ormawaId = getOrmawaId()

  const fetchData = async () => {
    setLoading(true)
    try {
      const [memberJson, divJson] = await Promise.all([
        fetchWithAuth(`${API}/members?ormawaId=${ormawaId}`),
        fetchWithAuth(`${API}/divisions?ormawaId=${ormawaId}`)
      ])
      if (memberJson.status === 'success') setMembers(memberJson.data || [])
      if (divJson.status === 'success') setDivisions(divJson.data || [])
    } catch {
      toast.error('Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  const fetchStudents = async () => {
    try {
      const data = await fetchWithAuth(`${API}/students`)
      if (data.status === 'success') setStudents(data.data || [])
    } catch { }
  }

  useEffect(() => {
    fetchData()
    fetchStudents()
  }, [ormawaId])

  const handleSaveBph = async (e) => {
    e.preventDefault()
    if (!bphForm.MahasiswaID) {
      toast.error('Wajib mencari dan memilih mahasiswa terlebih dahulu!')
      return
    }
    setIsSubmitting(true)

    // Check if student is already an active member
    const existingMember = members.find(m =>
      String(m.MahasiswaID || m.mahasiswaID || m.Mahasiswa?.id || m.Mahasiswa?.ID || '') === String(bphForm.MahasiswaID)
    )

    const isEdit = !!existingMember
    const url = isEdit ? `${API}/members/${existingMember.id || existingMember.ID}` : `${API}/members`
    const method = isEdit ? 'PUT' : 'POST'

    const payload = isEdit ? {
      Role: bphForm.Role,
      Divisi: ''
    } : {
      Role: bphForm.Role,
      Divisi: '',
      MahasiswaID: Number(bphForm.MahasiswaID),
      OrmawaID: Number(ormawaId)
    }

    try {
      const data = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      })
      if (data.status === 'success') {
        toast.success(isEdit ? 'Jabatan BPH diperbarui' : 'Pengurus BPH ditambahkan')
        setBphForm({ MahasiswaID: '', Role: 'Sekretaris', Divisi: '' })
        setBphSearchQuery('')
        setBphIsSearching(false)
        fetchData()
      } else {
        toast.error(data.message || 'Gagal menyimpan pengurus BPH')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveBphMember = async (memberId) => {
    if (!confirm('Apakah Anda yakin ingin menghapus pengurus BPH ini dari keanggotaan?')) return
    setIsSubmitting(true)
    try {
      const data = await fetchWithAuth(`${API}/members/${memberId}`, { method: 'DELETE' })
      if (data.status === 'success') {
        toast.success('Pengurus BPH berhasil dihapus')
        fetchData()
      } else {
        toast.error('Gagal menghapus pengurus BPH')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddDivision = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const json = await fetchWithAuth(`${API}/divisions`, {
        method: 'POST',
        body: JSON.stringify({ Nama: divName, OrmawaID: Number(ormawaId) }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (json.status === 'success') {
        toast.success('Divisi ditambahkan')
        setIsAddDivOpen(false)
        setDivName('')
        fetchData()
      } else {
        toast.error(json.message || 'Gagal menambahkan divisi')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDeleteDivision = async () => {
    setIsSubmitting(true)
    const divisionId = delDiv?.id || delDiv?.ID
    try {
      const json = await fetchWithAuth(`${API}/divisions/${divisionId}`, { method: 'DELETE' })
      if (json.status === 'success') {
        toast.success('Divisi dihapus')
        setDelDiv(null)
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

  const pembina = members.filter(m => {
    const r = m.Role?.toLowerCase() || ''
    return r.includes('pembina') || r.includes('penanggung jawab') || r.includes('penasihat')
  })

  const pembinaIds = pembina.map(m => getMemberId(m))

  const ketua = members.find(m => {
    const r = m.Role?.toLowerCase() || ''
    const mId = getMemberId(m)
    return r.includes('ketua') && !r.includes('wakil') && !pembinaIds.includes(mId)
  }) || members.find(m => !pembinaIds.includes(getMemberId(m))) || members[0]

  const wakil = members.find(m => {
    const r = m.Role?.toLowerCase() || ''
    const mId = getMemberId(m)
    return r.includes('wakil') && !pembinaIds.includes(mId)
  }) || null

  const sekretarisList = members.filter(m => {
    const r = m.Role?.toLowerCase() || ''
    const mId = getMemberId(m)
    return r.includes('sekretaris') && !pembinaIds.includes(mId)
  })

  const bendaharaList = members.filter(m => {
    const r = m.Role?.toLowerCase() || ''
    const mId = getMemberId(m)
    return r.includes('bendahara') && !pembinaIds.includes(mId)
  })

  const ketuaId = getMemberId(ketua)
  const wakilId = getMemberId(wakil)
  const sekretarisIds = sekretarisList.map(m => getMemberId(m))
  const bendaharaIds = bendaharaList.map(m => getMemberId(m))

  const pengurusInti = members.filter(m => {
    const mId = getMemberId(m)
    return (
      mId !== ketuaId &&
      mId !== wakilId &&
      !pembinaIds.includes(mId) &&
      !sekretarisIds.includes(mId) &&
      !bendaharaIds.includes(mId) &&
      (!m.Divisi || m.Divisi === '' || m.Divisi === 'INTI')
    )
  })

  const getDivisionMembers = (divName) => members.filter(m => m.Divisi === divName)

  const bphMembers = members.filter(m => {
    const r = m.Role?.toLowerCase() || ''
    return r.includes('ketua') || r.includes('wakil') || r.includes('sekretaris') || r.includes('bendahara') || r.includes('pembina') || r.includes('penanggung jawab') || r.includes('penasihat')
  })

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Struktur"
        highlightedTitle="Pengurus"
        subtitle="Hierarki dan bagan organisasi untuk pembagian tugas operasional."
        icon="account_tree"
        actions={canManage ? (
          <Button
            onClick={() => setIsManageBphOpen(true)}
            className="h-11 px-6 rounded-xl bg-slate-800 text-white font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-none border-none cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={3}>group_add</span>
            Kelola Pengurus BPH
          </Button>
        ) : null}
        badges={[{ label: 'Organisasi Kemahasiswaan', active: true }]}

      />

      {/* ── Content Area ───────────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="size-8 border-4 border-[var(--theme-primary)]/30 border-t-[var(--theme-primary)] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pembina / Penasihat */}
          {pembina.length > 0 && (
            <div className="flex flex-col items-center gap-2.5">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 bg-[var(--theme-info)] rounded-full animate-pulse" />
                <p className="text-[9px] font-black text-[var(--theme-info)] tracking-[0.3em] font-headline uppercase">Pembina / Penasihat</p>
              </div>
              <div className="flex flex-wrap gap-4 justify-center">
                {pembina.map(m => (
                  <OrgCard key={getMemberId(m)} member={m} size="md" />
                ))}
              </div>
              <div className="h-8 w-px border-l-2 border-dashed border-border my-1" />
            </div>
          )}

          {/* Root: Ketua / Wakil / BPH */}
          <div className="flex flex-col items-center gap-4">
            {ketua && (
              <OrgCard member={ketua} size="lg" />
            )}

            {wakil && (
              <>
                <div className="h-8 w-px bg-[var(--theme-border)]" />
                <OrgCard member={wakil} size="md" />
              </>
            )}

            {(sekretarisList.length > 0 || bendaharaList.length > 0) && (
              <>
                <div className="h-8 w-px bg-[var(--theme-border)]" />
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 bg-[var(--theme-primary)] rounded-full animate-pulse" />
                    <p className="text-[9px] font-black text-[var(--theme-primary)] tracking-[0.3em] font-headline uppercase">Sekretaris & Bendahara</p>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    {sekretarisList.map(m => (
                      <OrgCard key={getMemberId(m)} member={m} size="md" />
                    ))}
                    {bendaharaList.map(m => (
                      <OrgCard key={getMemberId(m)} member={m} size="md" />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Pengurus Inti */}
          {pengurusInti.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-[var(--theme-border-muted)]" />
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] tracking-[0.3em] font-headline uppercase">Pengurus Inti</p>
                <div className="h-px flex-1 bg-[var(--theme-border-muted)]" />
              </div>
              <div className="flex flex-wrap gap-3 justify-center">
                {pengurusInti.map(m => (
                  <OrgCard key={getMemberId(m)} member={m} size="sm" />
                ))}
              </div>
            </div>
          )}

          {/* Divisi-Divisi */}
          {divisions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-[var(--theme-border-muted)]" />
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] tracking-[0.3em] font-headline uppercase">Divisi</p>
                <div className="h-px flex-1 bg-[var(--theme-border-muted)]" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {divisions.map((div) => {
                  const divMembers = getDivisionMembers(div.Nama)
                  const divId = div.id || div.ID
                  return (
                    <Card key={divId} className="border border-border shadow-sm overflow-hidden glass-card rounded-xl animate-in fade-in duration-300">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-bold font-headline tracking-tighter text-sm" style={{ color: 'var(--theme-text)' }}>{div.Nama}</h3>
                            <p className="text-[9px] font-bold text-[var(--theme-text-subtle)] tracking-widest uppercase">{divMembers.length} anggota</p>
                          </div>
                          {canManage && (
                            <button
                              onClick={() => setDelDiv(div)}
                              className="p-1.5 text-[var(--theme-text-subtle)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] rounded-lg transition-colors duration-150"
                              title="Hapus Divisi"
                            >
                              <span className="material-symbols-outlined block" style={{ fontSize: '18px' }} >delete</span>
                            </button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {divMembers.length === 0 ? (
                            <p className="text-[9px] font-bold text-[var(--theme-text-subtle)] tracking-widest uppercase">Belum ada anggota</p>
                          ) : (
                            divMembers.map(m => {
                              const fotoUrl = getFullUrl(m.Mahasiswa?.FotoURL || m.Mahasiswa?.foto_url || m.Mahasiswa?.Foto || m.Mahasiswa?.Pengguna?.Foto || null);
                              return (
                                <div key={getMemberId(m)} className="flex items-center gap-1.5 bg-[var(--theme-bg)] rounded-xl px-2.5 py-1.5 border border-border">
                                  {fotoUrl ? (
                                    <img
                                      src={fotoUrl}
                                      alt={m.Mahasiswa?.Nama || 'Staf'}
                                      className="size-5 rounded-lg object-cover"
                                      onError={(e) => { e.target.src = ''; }}
                                    />
                                  ) : (
                                    <div className="size-5 rounded-lg bg-[var(--theme-bg)] flex items-end justify-center overflow-hidden border border-border">
                                      <span className="material-symbols-outlined text-[var(--theme-text-subtle)] block select-none leading-none" style={{ fontSize: '12px' }}>person</span>
                                    </div>
                                  )}
                                  <span className="text-[9px] font-bold text-[var(--theme-text-muted)] font-headline">{m.Mahasiswa?.Nama?.split(' ')[0] || '—'}</span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {divisions.length === 0 && pengurusInti.length === 0 && !ketua && (
            <Card className="border border-border shadow-sm glass-card rounded-xl">
              <CardContent className="flex flex-col items-center justify-center py-20 gap-4">
                <span className="material-symbols-outlined size-12 text-[var(--theme-text-subtle)] stroke-[1px]">account_tree</span>
                <p className="text-[11px] font-black text-[var(--theme-text-subtle)] tracking-widest text-center uppercase">Belum ada data struktur organisasi.<br />{canManage ? 'Tambahkan anggota terlebih dahulu.' : ''}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {canManage && (
        <>
          {/* Add Division Dialog */}
      <DialogModal
        open={isAddDivOpen}
        onClose={() => setIsAddDivOpen(false)}
        title="Tambah Divisi Baru"
        subtitle="Buat divisi baru untuk pembagian tugas organisasi."
        icon="category"
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setIsAddDivOpen(false)} className="rounded-xl h-10">
              Batalkan
            </Button>
            <Button type="button" onClick={handleAddDivision} disabled={isSubmitting} className="rounded-xl h-10 bg-[var(--theme-primary)] text-white hover:opacity-90 flex items-center gap-1 border-none">
              {isSubmitting ? (
                <span className="material-symbols-outlined animate-spin size-4">sync</span>
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span>
              )}
              <span className="uppercase tracking-[0.1em]">Simpan Divisi</span>
            </Button>
          </>
        }
      >
        <div className="p-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline">Nama Divisi</Label>
            <Input
              required
              value={divName}
              onChange={e => setDivName(e.target.value)}
              placeholder="Misal: Humas, Akademik, IT..."
              className="h-12 rounded-2xl border-border bg-[var(--theme-bg)]/50 focus:bg-[var(--theme-surface)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-all font-bold text-sm font-headline"
            />
          </div>
        </div>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={!!delDiv}
        onClose={() => setDelDiv(null)}
        onConfirm={handleDeleteDivision}
        title={`Hapus Divisi ${delDiv?.Nama || ''}?`}
        description="Divisi ini akan dihapus. Anggota yang berada di divisi ini tidak akan ikut terhapus."
        loading={isSubmitting}
      />

      {/* Manage BPH Modal */}
      <DialogModal
        open={isManageBphOpen}
        onClose={() => setIsManageBphOpen(false)}
        title="Kelola Pengurus BPH"
        subtitle="MANAJEMEN BPH"
        icon="group_add"
        maxWidth="max-w-lg"
        bodyClassName="p-5 space-y-5"
        footer={
          <Button variant="ghost" type="button" onClick={() => setIsManageBphOpen(false)} className="rounded-xl h-10 w-full sm:w-auto font-bold text-slate-500 hover:text-slate-700">
            Tutup
          </Button>
        }
      >
        {/* Form to Assign Role */}
        <form onSubmit={handleSaveBph} className="bg-[var(--theme-bg)]/50 p-3.5 rounded-2xl border border-border space-y-3">
          <h4 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-wider font-headline">Tambah/Ubah Jabatan BPH</h4>

          <div className="space-y-2 relative">
            <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline">Pilih Mahasiswa</Label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: '18px' }}>search</span>
              <Input
                type="text"
                placeholder="Ketik nama atau NIM mahasiswa..."
                value={bphSearchQuery}
                onChange={(e) => {
                  setBphSearchQuery(e.target.value);
                  setBphIsSearching(true);
                  if (bphForm.MahasiswaID) setBphForm({ ...bphForm, MahasiswaID: '' });
                }}
                className="pl-11 pr-10 h-12 rounded-2xl border-border bg-[var(--theme-surface)] focus:bg-[var(--theme-surface)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] transition-all font-bold text-sm"
              />
              {bphForm.MahasiswaID && (
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-success)] font-bold" style={{ fontSize: '18px' }}>check_circle</span>
              )}
            </div>

            {bphIsSearching && bphSearchQuery.trim() !== '' && (
              <div className="absolute z-50 w-full mt-0.5 bg-[var(--theme-surface)] border border-border rounded-xl shadow-xl max-h-48 overflow-y-auto p-1 flex flex-col">
                {students
                  .filter(s => s?.Nama?.toLowerCase().includes(bphSearchQuery.toLowerCase()) || s?.NIM?.toLowerCase().includes(bphSearchQuery.toLowerCase()))
                  .slice(0, 6)
                  .map(s => {
                    const studentFotoUrl = getFullUrl(s?.FotoURL || s?.foto_url || s?.Foto || s?.Pengguna?.Foto || null);
                    return (
                      <button
                        type="button"
                        key={s.id || s.ID}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-xl cursor-pointer transition-all duration-150 my-0.5 hover:bg-[var(--theme-bg)] text-[var(--theme-text)] font-bold"
                        onClick={() => {
                          setBphForm({ ...bphForm, MahasiswaID: s?.id?.toString() || s?.ID?.toString() });
                          setBphSearchQuery(`${s.Nama} (${s.NIM})`);
                          setBphIsSearching(false);
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
                {students.filter(s => s?.Nama?.toLowerCase().includes(bphSearchQuery.toLowerCase()) || s?.NIM?.toLowerCase().includes(bphSearchQuery.toLowerCase())).length === 0 && (
                  <div className="px-3 py-4 text-center text-xs font-medium text-[var(--theme-text-subtle)]">
                    Mahasiswa tidak ditemukan
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
            <div className="space-y-2">
              <Label className="text-[9px] md:text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline">Jabatan BPH</Label>
              <SelectField value={bphForm.Role} onValueChange={(val) => setBphForm({ ...bphForm, Role: val })} className="w-full h-12">
                {['Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara', 'Pembina'].map((r) => (
                  <SelectOption key={r} value={r}>
                    {r}
                  </SelectOption>
                ))}
              </SelectField>
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || !bphForm.MahasiswaID}
              className="h-12 w-full rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white flex items-center justify-center text-xs font-bold font-headline uppercase tracking-wider border-none shadow-none"
            >
              {isSubmitting ? (
                <span className="material-symbols-outlined animate-spin size-4 mr-2">sync</span>
              ) : (
                <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }}>save</span>
              )}
              Simpan
            </Button>
          </div>
        </form>

        {/* List of Current BPH Members */}
        <div className="space-y-2.5">
          <h4 className="text-xs font-black text-[var(--theme-text-subtle)] uppercase tracking-widest font-headline">Daftar Pengurus BPH Aktif</h4>
          <div className="divide-y divide-[var(--theme-border-muted)] max-h-60 overflow-y-auto border border-border rounded-xl bg-[var(--theme-surface)] p-1.5">
            {bphMembers.length === 0 ? (
              <p className="text-center text-xs text-[var(--theme-text-subtle)] py-6 font-medium">Belum ada pengurus BPH yang terdaftar.</p>
            ) : (
              bphMembers.map(m => {
                const fotoUrl = getFullUrl(m.Mahasiswa?.FotoURL || m.Mahasiswa?.foto_url || m.Mahasiswa?.Foto || m.Mahasiswa?.Pengguna?.Foto || null);
                const mId = getMemberId(m)
                return (
                  <div key={mId} className="flex items-center justify-between py-2 px-1 hover:bg-[var(--theme-bg)] rounded-xl transition-colors duration-150">
                    <div className="flex items-center gap-3">
                      {fotoUrl ? (
                        <img
                          src={fotoUrl}
                          alt={m.Mahasiswa?.Nama || 'BPH'}
                          className="w-9 h-9 rounded-xl object-cover shrink-0 shadow-sm border border-border"
                          onError={(e) => { e.target.src = ''; }}
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-xl bg-[var(--theme-bg)] flex items-end justify-center overflow-hidden shrink-0 border border-border shadow-sm">
                          <span className="material-symbols-outlined text-[var(--theme-text-subtle)] text-xl mb-0.5">person</span>
                        </div>
                      )}
                      <div className="flex flex-col min-w-0 leading-none gap-0.5">
                        <span className="font-bold text-[var(--theme-text)] font-headline tracking-tighter text-xs truncate max-w-[200px]">{m.Mahasiswa?.Nama || '—'}</span>
                        <span className="text-[9px] text-[var(--theme-text-subtle)] font-semibold tracking-tight font-mono">{m.Mahasiswa?.NIM || '—'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('text-[8px] font-semibold tracking-widest px-2 py-1 rounded-full uppercase font-headline inline-block scale-90 border-none shadow-none', getRoleBadge(m.Role || 'Anggota'))}>
                        {m.Role}
                      </span>
                      <button
                        onClick={() => handleRemoveBphMember(mId)}
                        disabled={isSubmitting}
                        className="p-1.5 text-[var(--theme-text-subtle)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] rounded-lg transition-colors duration-150"
                        title="Hapus BPH"
                      >
                        <span className="material-symbols-outlined block" style={{ fontSize: '16px' }} >delete</span>
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </DialogModal>
      </>
      )}
    </PageContent>
  )
}
