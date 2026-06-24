"use client"
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { DialogModal } from '@/components/ui/DialogModal'
import { DataTable } from '@/components/ui/DataTable'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'

import { toast, Toaster } from 'react-hot-toast'
import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

// ─────────────────────────────────────────────
// Utility Components
// ─────────────────────────────────────────────





function FieldGroup({ label, children, icon, description }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 ml-1">
          {icon && <span className="material-symbols-outlined text-[var(--theme-primary)] text-sm">{icon}</span>}
          <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] uppercase font-headline">{label}</Label>
        </div>
      </div>
      {description && <p className="text-[10px] text-[var(--theme-text-muted)] font-medium ml-1 leading-snug">{description}</p>}
      <div className="pt-1">{children}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────

export default function Recruitment() {
  const [activeTab, setActiveTab] = useState('pendaftar')
  const [loading, setLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [fieldsLoading, setFieldsLoading] = useState(false)

  // ── Applicants ──
  const [applicants, setApplicants] = useState([])
  const [filterStatus, setFilterStatus] = useState('semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedIds, setSelectedIds] = useState(new Set())

  // ── Modal detail ──
  const [selectedApplicant, setSelectedApplicant] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)

  // ── Rejection Modal ──
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')

  // ── Bulk Action Modal ──
  const [bulkActionModalOpen, setBulkActionModalOpen] = useState(false)
  const [bulkAction, setBulkAction] = useState('')

  // ── Settings ──
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [config, setConfig] = useState({
    open_recruitment: false,
    recruitment_requirements: '',
    min_ipk: 0,
    recruitment_start: '',
    recruitment_end: ''
  })

  // ── Form Fields ──
  const [formFields, setFormFields] = useState([])

  const ormawaId = getOrmawaId()
  const { hasPermission, withPermissionCheck } = usePermission()

  // ── Computed ──
  const filteredApplicants = useMemo(() => {
    let list = applicants
    // Filter by status
    if (filterStatus !== 'semua') {
      if (filterStatus === 'pending') list = list.filter(a => (a.Status || a.status)?.toLowerCase() === 'pending')
      else if (filterStatus === 'aktif') list = list.filter(a => (a.Status || a.status)?.toLowerCase() === 'aktif')
      else list = list.filter(a => (a.Status || a.status)?.toLowerCase() === 'tidak_aktif' || (a.Status || a.status)?.toLowerCase() === 'ditolak')
    }
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter(a => {
        const nama = (a.Mahasiswa?.Nama || '').toLowerCase()
        const nim = (a.Mahasiswa?.NIM || '').toLowerCase()
        return nama.includes(q) || nim.includes(q)
      })
    }
    return list
  }, [applicants, filterStatus, searchQuery])

  const pendingCount = useMemo(() => applicants.filter(a => (a.Status || a.status)?.toLowerCase() === 'pending').length, [applicants])
  const acceptedCount = useMemo(() => applicants.filter(a => (a.Status || a.status)?.toLowerCase() === 'aktif').length, [applicants])
  const rejectedCount = useMemo(() => applicants.filter(a => (a.Status || a.status)?.toLowerCase() === 'tidak_aktif' || (a.Status || a.status)?.toLowerCase() === 'ditolak').length, [applicants])

  // ── Fetch Functions ──
  const fetchApplicants = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchWithAuth(`${API}/members?ormawaId=${ormawaId}&limit=200`)
      if (data.status === 'success') setApplicants(data.data || [])
    } catch (e) {
      console.error(e)
      toast.error('Gagal memuat data pendaftar')
    } finally {
      setLoading(false)
    }
  }, [ormawaId])

  const fetchRecruitmentSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const data = await fetchWithAuth(`${API_BASE_URL}/ormawa/settings/${ormawaId}`)
      if (data.status === 'success') {
        const d = data.data
        setConfig({
          open_recruitment: d.open_recruitment || false,
          recruitment_requirements: d.recruitment_requirements || '',
          min_ipk: d.min_ipk || 0,
          recruitment_start: d.recruitment_start ? new Date(d.recruitment_start).toISOString().split('T')[0] : '',
          recruitment_end: d.recruitment_end ? new Date(d.recruitment_end).toISOString().split('T')[0] : ''
        })
      }
    } catch (e) {
      console.error('Gagal memuat pengaturan:', e)
    } finally {
      setSettingsLoading(false)
    }
  }, [ormawaId])

  const fetchFormFields = useCallback(async () => {
    setFieldsLoading(true)
    try {
      const data = await fetchWithAuth(`${API}/recruitment-fields`)
      if (data.success !== false) setFormFields(data.data || [])
    } catch (e) {
      console.error(e)
    } finally {
      setFieldsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (ormawaId) {
      fetchApplicants()
      fetchFormFields()
      fetchRecruitmentSettings()
    }
  }, [ormawaId, fetchApplicants, fetchFormFields, fetchRecruitmentSettings])

  // ── Handle Accept ──
  const handleAccept = async (id, applicantData) => {
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API}/members/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Role: 'Anggota',
          Divisi: applicantData.Divisi || 'Umum',
          Status: 'aktif'
        })
      })
      if (res.status === 'success') {
        toast.success('Mahasiswa berhasil diterima!')
        setIsDetailOpen(false)
        setSelectedApplicant(null)
        fetchApplicants()
      } else toast.error(res.message || 'Gagal memproses')
    } catch { toast.error('Terjadi kesalahan jaringan') }
    finally { setActionLoading(false) }
  }

  // ── Handle Reject (opens modal) ──
  const openRejectModal = (applicant) => {
    setRejectTarget(applicant)
    setRejectionReason('')
    setRejectModalOpen(true)
  }

  const confirmReject = async () => {
    if (!rejectTarget) return
    setActionLoading(true)
    try {
      const res = await fetchWithAuth(`${API}/members/${rejectTarget.ID || rejectTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Role: 'Anggota',
          Divisi: rejectTarget.Divisi || 'Umum',
          Status: 'tidak_aktif',
          rejection_reason: rejectionReason
        })
      })
      if (res.status === 'success') {
        toast.success('Pendaftar ditolak!')
        setRejectModalOpen(false)
        setRejectTarget(null)
        setIsDetailOpen(false)
        setSelectedApplicant(null)
        fetchApplicants()
      } else toast.error(res.message || 'Gagal memproses')
    } catch { toast.error('Terjadi kesalahan jaringan') }
    finally { setActionLoading(false) }
  }

  // ── Bulk Actions ──
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApplicants.length) setSelectedIds(new Set())
    else setSelectedIds(new Set(filteredApplicants.map(a => a.ID || a.id)))
  }

  const toggleSelect = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  const openBulkModal = (action) => {
    setBulkAction(action)
    setBulkActionModalOpen(true)
  }

  const confirmBulkAction = async () => {
    setActionLoading(true)
    let success = 0, fail = 0
    for (const id of selectedIds) {
      try {
        const applicant = applicants.find(a => (a.ID || a.id) === id)
        const status = bulkAction === 'accept' ? 'aktif' : 'tidak_aktif'
        await fetchWithAuth(`${API}/members/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            Role: 'Anggota',
            Divisi: applicant?.Divisi || 'Umum',
            Status: status,
            rejection_reason: bulkAction === 'reject' ? 'Penolakan massal oleh admin' : ''
          })
        })
        success++
      } catch { fail++ }
    }
    setBulkActionModalOpen(false)
    setSelectedIds(new Set())
    fetchApplicants()
    toast.success(`${success} pendaftar ${bulkAction === 'accept' ? 'diterima' : 'ditolak'}${fail > 0 ? `, ${fail} gagal` : ''}`)
    setActionLoading(false)
  }

  // ── Export CSV ──
  const handleExport = () => {
    const url = `${API}/recruitment/export`
    window.open(url, '_blank')
    toast.success('Mengunduh data pendaftar...')
  }

  // ── Settings & Form Save ──
  const handleSaveSettingsAndFields = async (e) => {
    if (e) e.preventDefault()
    setSettingsLoading(true)
    try {
      const payloadSettings = {
        open_recruitment: config.open_recruitment,
        recruitment_requirements: config.recruitment_requirements,
        min_ipk: parseFloat(config.min_ipk) || 0,
        recruitment_start: config.recruitment_start ? new Date(config.recruitment_start).toISOString() : null,
        recruitment_end: config.recruitment_end ? new Date(config.recruitment_end).toISOString() : null
      }
      await fetchWithAuth(`${API_BASE_URL}/ormawa/settings/${ormawaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadSettings)
      })

      const payloadFields = formFields.map((f, i) => {
        const { id, isNew, ...rest } = f
        return { ...rest, id: 0, order: i }
      })
      await fetchWithAuth(`${API}/recruitment-fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFields)
      })

      toast.success('Konfigurasi dan form berhasil disimpan!')
      fetchRecruitmentSettings()
      fetchFormFields()
    } catch (err) {
      console.error(err)
      toast.error('Terjadi kesalahan jaringan')
    } finally {
      setSettingsLoading(false)
    }
  }

  // ── Form Field Handlers ──
  const addField = (type) => {
    setFormFields(prev => [...prev, {
      id: Date.now(),
      label: '',
      type,
      options: '',
      required: false,
      order: prev.length,
      isNew: true
    }])
  }

  const updateField = (idx, key, value) => {
    setFormFields(prev => prev.map((f, i) => i === idx ? { ...f, [key]: value } : f))
  }

  const removeField = (idx) => {
    setFormFields(prev => prev.filter((_, i) => i !== idx))
  }

  const moveField = (idx, direction) => {
    setFormFields(prev => {
      const next = [...prev]
      const target = idx + direction
      if (target < 0 || target >= next.length) return prev
      ;[next[idx], next[target]] = [next[target], next[idx]]
      return next
    })
  }

  // ── Column Definitions ──
  const columns = [
    {
      key: '_select', 
      label: (
        <input
          type="checkbox"
          checked={filteredApplicants.length > 0 && selectedIds.size === filteredApplicants.length}
          onChange={toggleSelectAll}
          className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
        />
      ),
      className: 'w-[40px]',
      sortable: false,
      render: (val, row) => {
        const id = row.ID || row.id
        return (
          <input
            type="checkbox"
            checked={selectedIds.has(id)}
            onChange={() => toggleSelect(id)}
            className="w-4 h-4 rounded border-[var(--theme-border)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
            onClick={(e) => e.stopPropagation()}
          />
        )
      }
    },
    {
      key: 'Mahasiswa', label: 'Profil Pendaftar', className: 'min-w-[240px]',
      render: (val, row) => {
        const fotoUrl = row.Mahasiswa?.FotoURL || row.Mahasiswa?.foto_url || null
        const hasAlasanTolak = row.rejection_reason || row.RejectionReason
        return (
          <div className="flex items-center gap-3">
            {fotoUrl ? (
              <img
                src={fotoUrl.startsWith('http') ? fotoUrl : `${API_BASE_URL.replace('/api', '')}${fotoUrl}`}
                alt={row.Mahasiswa?.Nama}
                className="w-10 h-10 rounded-xl object-cover shrink-0 border border-border"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] flex items-center justify-center border border-border">
                <span className="material-symbols-outlined text-[var(--theme-text-muted)] text-2xl">person</span>
              </div>
            )}
            <div className="flex flex-col gap-0.5 leading-none">
              <span className="font-bold text-[var(--theme-text)] font-headline tracking-tighter text-[13px]">{row.Mahasiswa?.Nama || '—'}</span>
              <span className="text-[10px] text-[var(--theme-text-subtle)] font-semibold tracking-tight font-mono">{row.Mahasiswa?.NIM || '—'}</span>
              {hasAlasanTolak && (
                <span className="text-[9px] text-[var(--theme-danger)] font-semibold mt-0.5 truncate max-w-[200px]">
                  Alasan: {row.rejection_reason || row.RejectionReason}
                </span>
              )}
            </div>
          </div>
        )
      }
    },
    {
      key: 'IPK', label: 'IPK', className: 'w-[80px]',
      render: (val, row) => (
        <span className="font-bold text-[var(--theme-text-subtle)] text-sm">
          {row.IPK ? row.IPK.toFixed(2) : (row.Mahasiswa?.IPK ? row.Mahasiswa.IPK.toFixed(2) : '—')}
        </span>
      )
    },
    {
      key: 'Divisi', label: 'Divisi', className: 'w-[120px]',
      render: (val, row) => (
        <span className="text-[var(--theme-text-subtle)] text-xs font-bold uppercase tracking-wider font-headline">
          {row.Divisi || 'Umum'}
        </span>
      )
    },
    {
      key: 'Tanggal', label: 'Tgl Daftar', className: 'w-[110px]',
      render: (val, row) => (
        <span className="text-[var(--theme-text-muted)] text-[10px] font-semibold">
          {row.CreatedAt ? new Date(row.CreatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '—'}
        </span>
      )
    },
    {
      key: 'Status', label: 'Status', className: 'w-[120px]',
      render: (val, row) => {
        const s = (row.Status || row.status)?.toLowerCase()
        if (s === 'aktif') return <Badge className="bg-[var(--theme-success-light)]/50 text-[var(--theme-success)] border border-[var(--theme-success)]/20 font-black text-[9px] px-2 uppercase tracking-widest">DITERIMA</Badge>
        if (s === 'pending') return <Badge className="bg-[var(--theme-warning-light)]/50 text-[var(--theme-warning)] border border-[var(--theme-warning)]/20 font-black text-[9px] px-2 uppercase tracking-widest">MENUNGGU</Badge>
        return <Badge className="bg-[var(--theme-danger-light)]/50 text-[var(--theme-danger)] border border-[var(--theme-danger)]/20 font-black text-[9px] px-2 uppercase tracking-widest">DITOLAK</Badge>
      }
    }
  ]

  // ── Render ──
  return (
    <PageContent className="font-body">
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />

      {/* ── HEADER ── */}
      <PageHeader 
        title="Open Recruitment"
        subtitle="Kelola calon anggota baru dan konfigurasikan pendaftaran."
        icon="how_to_reg"
        breadcrumbs={[
          { label: 'Ormawa Admin', path: '/app/ormawa/dashboard' },
          { label: 'Recruitment', path: '/app/ormawa/recruitment' }
        ]}
        action={
          <div className="flex bg-[var(--theme-bg)] p-1.5 rounded-2xl border border-[var(--theme-border)] w-full md:w-auto">
            {[
              { id: 'pendaftar', label: 'Daftar Pendaftar', icon: 'group' },
              { id: 'form', label: 'Form Builder', icon: 'dynamic_form' },
              { id: 'pengaturan', label: 'Pengaturan', icon: 'settings' }
            ].filter(tab => hasPermission('ormawa.recruitment.update') || tab.id === 'pendaftar').map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex-1 md:flex-none px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  activeTab === tab.id ? 'bg-white text-[var(--theme-primary)] shadow-sm' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-subtle)]'
                }`}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        }
      />

      {/* ═══════════════════════════════════════════════
         TAB 1: DAFTAR PENDAFTAR
         ═══════════════════════════════════════════════ */}
      {activeTab === 'pendaftar' && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <PrimaryStatsCard title="Total Pendaftar" value={applicants.length} icon="group" colorTheme="primary" />
            <PrimaryStatsCard title="Menunggu Review" value={pendingCount} colorTheme="warning" icon="hourglass_top" />
            <PrimaryStatsCard title="Diterima" value={acceptedCount} colorTheme="success" icon="check_circle" />
            <PrimaryStatsCard title="Ditolak" value={rejectedCount} colorTheme="error" icon="cancel" />
          </div>

          <DataTable
            title="Daftar Pendaftar"
            subtitle="Kelola pendaftaran calon anggota baru."
            columns={columns}
            data={filteredApplicants}
            loading={loading}
            manualFiltering={true}
            searchable={true}
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Cari nama atau NIM..."
            filters={[
              {
                key: 'status',
                placeholder: 'Status',
                options: [
                  { label: `Menunggu (${pendingCount})`, value: 'pending' },
                  { label: `Diterima (${acceptedCount})`, value: 'aktif' },
                  { label: `Ditolak (${rejectedCount})`, value: 'tidak_aktif' }
                ]
              }
            ]}
            filterValues={{ status: filterStatus === 'semua' ? 'all' : filterStatus }}
            onFilterChange={(key, val) => {
              if (key === 'status') setFilterStatus(val === 'all' ? 'semua' : val)
            }}
            actions={(row) => (
              <button
                onClick={(e) => { e.stopPropagation(); setSelectedApplicant(row); setIsDetailOpen(true) }}
                className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[var(--theme-bg)] text-[var(--theme-primary)] text-[10px] font-black hover:bg-[var(--theme-primary-light)]/50 transition-all"
              >
                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>visibility</span>
                Detail
              </button>
            )}
            toolbarActions={
              <>
                              {selectedIds.size > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2 duration-200">
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] whitespace-nowrap">{selectedIds.size} dipilih</span>
                    <Button onClick={withPermissionCheck('manage_staff', () => openBulkModal('accept'))} className="h-8 px-3 rounded-xl bg-[var(--theme-success)] text-white text-[10px] font-black hover:bg-[var(--theme-success-hover)] shadow-sm">
                      Terima Semua
                    </Button>
                    <Button onClick={withPermissionCheck('manage_staff', () => openBulkModal('reject'))} className="h-8 px-3 rounded-xl bg-[var(--theme-danger-light)]/50 text-[var(--theme-danger)] text-[10px] font-black hover:bg-[var(--theme-danger-light)] shadow-sm">
                      Tolak Semua
                    </Button>
                  </div>
                )}
                <Button onClick={handleExport} variant="outline" className="h-9 px-3 rounded-xl border border-[var(--theme-border)] text-[10px] font-black text-[var(--theme-text-subtle)] hover:bg-[var(--theme-bg)] shadow-sm flex items-center gap-1">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                  Export CSV
                </Button>
              </>
            }
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════
         TAB 2: FORM BUILDER (Sederhana)
         ═══════════════════════════════════════════════ */}
      {activeTab === 'form' && (
        <form onSubmit={handleSaveSettingsAndFields} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-[var(--theme-border)] shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--theme-border)]">
                <div>
                  <h3 className="text-sm font-black text-[var(--theme-text)] uppercase tracking-widest font-headline">Pertanyaan Formulir</h3>
                  <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">Tambah pertanyaan untuk diisi pendaftar.</p>
                </div>
                <button type="button" onClick={() => addField('text')}
                  className="h-9 px-4 rounded-xl bg-[var(--theme-primary)] text-white text-[10px] font-black hover:bg-[var(--theme-primary-hover)] transition-all flex items-center gap-1 shadow-sm">
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Tambah Pertanyaan
                </button>
              </div>

              {formFields.length === 0 ? (
                <div className="py-14 text-center flex flex-col items-center">
                  <div className="w-20 h-20 rounded-3xl bg-[var(--theme-bg)] flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[var(--theme-text-muted)] text-4xl">dynamic_form</span>
                  </div>
                  <p className="text-base font-black text-[var(--theme-text-subtle)]">Belum ada pertanyaan</p>
                  <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">Klik "Tambah Pertanyaan" untuk mulai membuat formulir.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formFields.map((field, idx) => (
                    <div key={field.id || idx} className="p-4 border border-[var(--theme-border)] bg-white rounded-xl space-y-3 group hover:border-[var(--theme-primary)]/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-lg bg-[var(--theme-bg)] flex items-center justify-center text-[10px] font-black text-[var(--theme-text-muted)] shrink-0">{idx + 1}</span>
                        <input
                          type="text"
                          value={field.label}
                          onChange={e => updateField(idx, 'label', e.target.value)}
                          placeholder="Tulis pertanyaan di sini..."
                          className="flex-1 h-9 px-3 rounded-lg bg-[var(--theme-bg)] border border-transparent focus:border-[var(--theme-primary)] text-xs font-bold outline-none transition-colors"
                        />
                        <div className="flex items-center gap-2 shrink-0">
                          <select value={field.type} onChange={e => updateField(idx, 'type', e.target.value)}
                            className="h-9 px-2 rounded-lg bg-white border border-[var(--theme-border)] text-[10px] font-black text-[var(--theme-text-subtle)] outline-none cursor-pointer">
                            <option value="text">Teks</option>
                            <option value="paragraph">Paragraf</option>
                            <option value="select">Pilihan</option>
                            <option value="file">Upload</option>
                          </select>
                          <label className="flex items-center gap-1.5 cursor-pointer px-2 py-1.5 rounded-lg hover:bg-[var(--theme-bg)]">
                            <input type="checkbox" checked={field.required} onChange={e => updateField(idx, 'required', e.target.checked)}
                              className="w-3.5 h-3.5 rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]" />
                            <span className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Wajib</span>
                          </label>
                          <button type="button" onClick={() => removeField(idx)} className="w-7 h-7 rounded-lg bg-rose-50 text-rose-400 flex items-center justify-center hover:bg-rose-100 hover:text-rose-600 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>close</span>
                          </button>
                        </div>
                      </div>
                      {field.type === 'select' && (
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: 14 }}>list</span>
                          <input type="text" value={field.options} onChange={e => updateField(idx, 'options', e.target.value)}
                            placeholder="Opsi: pisahkan dengan koma, contoh: HMI, PMII, IMM"
                            className="flex-1 h-9 px-3 rounded-lg bg-[var(--theme-bg)] border border-transparent focus:border-[var(--theme-primary)] text-xs font-bold outline-none transition-colors" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2 pb-10">
            <Button type="submit" disabled={settingsLoading} className="h-12 px-8 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-black tracking-widest uppercase shadow-md shadow-[var(--theme-primary)]/20 active:scale-95 transition-all">
              {settingsLoading ? 'MENYIMPAN...' : 'SIMPAN FORM & PENGATURAN'}
            </Button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════
         TAB 3: PENGATURAN (Sederhana)
         ═══════════════════════════════════════════════ */}
      {activeTab === 'pengaturan' && (
        <form onSubmit={handleSaveSettingsAndFields} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <Card className="border-[var(--theme-border)] shadow-sm bg-white rounded-2xl overflow-hidden">
            <CardContent className="p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--theme-border)]">
                <div>
                  <h3 className="text-sm font-black text-[var(--theme-text)] uppercase tracking-widest font-headline">Pengaturan Pendaftaran</h3>
                  <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">Atur jadwal dan syarat pendaftaran.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={config.open_recruitment}
                    onChange={e => setConfig({ ...config, open_recruitment: e.target.checked })} className="sr-only peer" />
                  <div className="w-14 h-8 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-full peer peer-checked:bg-[var(--theme-success)] peer-checked:border-[var(--theme-success)] after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:after:translate-x-full"></div>
                </label>
              </div>

              {config.open_recruitment && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest ml-1">Tanggal Buka</label>
                      <Input type="date" value={config.recruitment_start} onChange={e => setConfig({ ...config, recruitment_start: e.target.value })}
                        className="h-11 rounded-xl border-[var(--theme-border)] bg-[var(--theme-bg)]/50 focus:bg-white text-xs font-bold w-full" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest ml-1">Tanggal Tutup</label>
                      <Input type="date" value={config.recruitment_end} onChange={e => setConfig({ ...config, recruitment_end: e.target.value })}
                        className="h-11 rounded-xl border-[var(--theme-border)] bg-[var(--theme-bg)]/50 focus:bg-white text-xs font-bold w-full" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest ml-1">IPK Minimal</label>
                      <Input type="number" step="0.01" min="0" max="4" placeholder="Kosongkan jika tidak ada" value={config.min_ipk}
                        onChange={e => setConfig({ ...config, min_ipk: parseFloat(e.target.value) || 0 })}
                        className="h-11 rounded-xl border-[var(--theme-border)] bg-[var(--theme-bg)]/50 focus:bg-white text-xs font-bold w-full" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest ml-1">Persyaratan Khusus</label>
                    <Textarea value={config.recruitment_requirements} onChange={e => setConfig({ ...config, recruitment_requirements: e.target.value })}
                      placeholder="Misal: Bersedia mengikuti rapat mingguan, memiliki laptop..."
                      className="min-h-[100px] rounded-xl border-[var(--theme-border)] bg-[var(--theme-bg)]/50 focus:bg-white p-4 font-semibold text-xs leading-relaxed" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end pt-2 pb-10">
            <Button type="submit" disabled={settingsLoading} className="h-12 px-8 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-black tracking-widest uppercase shadow-md shadow-[var(--theme-primary)]/20 active:scale-95 transition-all">
              {settingsLoading ? 'MENYIMPAN...' : 'SIMPAN PENGATURAN'}
            </Button>
          </div>
        </form>
      )}

      {/* ═══════════════════════════════════════════════
         DETAIL REVIEW MODAL
         ═══════════════════════════════════════════════ */}
      {selectedApplicant && (
        <DialogModal
          open={isDetailOpen}
          onOpenChange={setIsDetailOpen}
          onClose={() => { setIsDetailOpen(false); setSelectedApplicant(null) }}
          title="Review Pendaftar"
          description="Periksa kelengkapan administrasi calon anggota."
          icon={<span className="material-symbols-outlined">person_search</span>}
          maxWidth="max-w-3xl"
          footer={
            <>
              <Button variant="ghost" type="button" onClick={() => { setIsDetailOpen(false); setSelectedApplicant(null) }} className="rounded-xl font-bold">
                Tutup
              </Button>
                            {selectedApplicant.Status?.toLowerCase() === 'pending' && (
                <div className="flex gap-2">
                  <Button type="button" onClick={withPermissionCheck('manage_staff', () => openRejectModal(selectedApplicant))} disabled={actionLoading}
                    className="h-10 px-5 rounded-xl bg-white text-[var(--theme-danger)] border-2 border-[var(--theme-danger)]/30 hover:bg-[var(--theme-danger-light)]/20 text-xs font-black transition-all active:scale-95 shadow-none">
                    Tolak
                  </Button>
                  <Button type="button" onClick={withPermissionCheck('manage_staff', () => handleAccept(selectedApplicant.ID || selectedApplicant.id, selectedApplicant))} disabled={actionLoading}
                    className="h-10 px-5 rounded-xl bg-[var(--theme-success)] text-white text-xs font-black hover:bg-[var(--theme-success-hover)] transition-all active:scale-95 border-none shadow-md shadow-[var(--theme-success)]/20">
                    {actionLoading ? 'Memproses...' : 'Terima'}
                  </Button>
                </div>
              )}
            </>
          }
        >
          <div className="p-6 md:p-8 space-y-6 bg-white max-h-[70vh] overflow-y-auto">
            {/* Profile Header */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-primary)] flex items-center justify-center font-bold text-2xl shrink-0 p-1 overflow-hidden">
                {selectedApplicant.Mahasiswa?.FotoURL ? (
                  <img src={selectedApplicant.Mahasiswa.FotoURL.startsWith('http') ? selectedApplicant.Mahasiswa.FotoURL : `${API_BASE_URL.replace('/api', '')}${selectedApplicant.Mahasiswa.FotoURL}`}
                    alt={selectedApplicant.Mahasiswa?.Nama || 'Foto'} className="w-full h-full object-cover rounded-lg" />
                ) : selectedApplicant.Mahasiswa?.Nama?.slice(0, 2).toUpperCase() || 'MHS'}
              </div>
              <div className="flex-1">
                <Badge className={`font-black text-[9px] px-2.5 py-0.5 border rounded-lg uppercase tracking-wider mb-2 ${
                  selectedApplicant.Status?.toLowerCase() === 'aktif' ? 'bg-[var(--theme-success-light)]/50 text-[var(--theme-success)] border-[var(--theme-success)]/20' :
                  selectedApplicant.Status?.toLowerCase() === 'pending' ? 'bg-[var(--theme-warning-light)]/50 text-[var(--theme-warning)] border-[var(--theme-warning)]/20' :
                  'bg-[var(--theme-danger-light)]/50 text-[var(--theme-danger)] border-[var(--theme-danger)]/20'
                }`}>
                  {selectedApplicant.Status?.toLowerCase() === 'aktif' ? 'DITERIMA' : selectedApplicant.Status?.toLowerCase() === 'pending' ? 'MENUNGGU REVIEW' : 'DITOLAK'}
                </Badge>
                <h3 className="font-black text-[var(--theme-text)] text-xl leading-snug font-headline">{selectedApplicant.Mahasiswa?.Nama}</h3>
                <p className="text-sm text-[var(--theme-text-subtle)] font-bold mt-1 tracking-tight font-mono">{selectedApplicant.Mahasiswa?.NIM || '—'}</p>
                <p className="text-[10px] text-[var(--theme-text-muted)] font-black mt-1 uppercase tracking-widest">{selectedApplicant.Mahasiswa?.ProgramStudi?.Nama || 'Program Studi'}</p>
              </div>
            </div>

            {/* Quick Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 bg-[var(--theme-bg)] rounded-2xl">
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest mb-1">IPK</p>
                <p className="text-lg font-black text-[var(--theme-text)]">
                  {selectedApplicant.Mahasiswa?.SemesterSekarang == 1
                    ? '0.00 (Maba)'
                    : (selectedApplicant.ipk ?? selectedApplicant.IPK ?? selectedApplicant.Mahasiswa?.IPK ?? 0).toFixed(2)}
                </p>
              </div>
              <div className="p-4 bg-[var(--theme-bg)] rounded-2xl">
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest mb-1">Divisi Pilihan 1</p>
                <p className="text-base font-black text-[var(--theme-text)]">{selectedApplicant.Divisi || 'Umum'}</p>
              </div>
              <div className="p-4 bg-[var(--theme-bg)] rounded-2xl">
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest mb-1">Divisi Pilihan 2</p>
                <p className="text-base font-black text-[var(--theme-text)]">{selectedApplicant.divisi_pilihan_dua || selectedApplicant.DivisiPilihanDua || '—'}</p>
              </div>
              <div className="p-4 bg-[var(--theme-bg)] rounded-2xl">
                <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest mb-1">Tgl Mendaftar</p>
                <p className="text-base font-black text-[var(--theme-text)]">
                  {selectedApplicant.CreatedAt && !String(selectedApplicant.CreatedAt).startsWith('0001') ? new Date(selectedApplicant.CreatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>

            {/* Rejection Info */}
            {selectedApplicant.rejection_reason || selectedApplicant.RejectionReason ? (
              <div className="p-4 bg-[var(--theme-danger-light)]/20 border border-[var(--theme-danger)]/20 rounded-2xl">
                <p className="text-[9px] font-black text-[var(--theme-danger)] uppercase tracking-widest mb-1">Alasan Penolakan</p>
                <p className="text-xs font-semibold text-[var(--theme-danger)]">{selectedApplicant.rejection_reason || selectedApplicant.RejectionReason}</p>
                {selectedApplicant.ReviewedAt && (
                  <p className="text-[10px] font-medium text-[var(--theme-text-muted)] mt-1">
                    Direview pada: {new Date(selectedApplicant.ReviewedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            ) : selectedApplicant.ReviewedAt ? (
              <div className="p-4 bg-[var(--theme-success-light)]/20 border border-[var(--theme-success)]/20 rounded-2xl">
                <p className="text-[9px] font-black text-[var(--theme-success)] uppercase tracking-widest mb-1">Waktu Diterima</p>
                <p className="text-xs font-semibold text-[var(--theme-success)]">
                  {new Date(selectedApplicant.ReviewedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ) : null}

            {/* Alasan / Motivasi */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-[var(--theme-primary)] tracking-[0.2em] uppercase font-headline pl-1">Motivasi & Alasan Bergabung</p>
              <div className="p-5 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-xl text-xs font-semibold text-[var(--theme-text-subtle)] leading-relaxed whitespace-pre-wrap">
                {selectedApplicant.alasan || selectedApplicant.Alasan || 'Tidak menyertakan alasan.'}
              </div>
            </div>

            {/* Custom Answers */}
            {(() => {
              const rawAnswers = selectedApplicant.CustomAnswers || selectedApplicant.custom_answers
              if (!rawAnswers) return null
              let answers = {}
              try { answers = typeof rawAnswers === 'string' ? JSON.parse(rawAnswers) : rawAnswers } catch { return null }
              const keys = Object.keys(answers)
              if (keys.length === 0) return null
              return (
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-[var(--theme-secondary)] tracking-[0.2em] uppercase font-headline pl-1">Jawaban Tambahan</p>
                  <div className="grid grid-cols-1 gap-3">
                    {keys.map(k => {
                      const field = formFields.find(f => String(f.id || f.ID) === String(k))
                      const questionLabel = field ? (field.label || field.Label) : 'Pertanyaan Tambahan'
                      const isFile = field && (field.type || field.Type || '').toLowerCase() === 'file'
                      return (
                        <div key={k} className="p-4 border border-[var(--theme-border)] rounded-2xl flex flex-col justify-center">
                          <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-wider mb-1.5">{questionLabel}</p>
                          {isFile && answers[k] ? (
                            <a href={answers[k].startsWith('http') ? answers[k] : `${API_BASE_URL.replace('/api', '')}${answers[k]}`} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-[var(--theme-primary)] font-black hover:underline">
                              <span className="material-symbols-outlined text-sm">open_in_new</span> Lihat File
                            </a>
                          ) : (
                            <p className="text-xs font-bold text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap">
                              {Array.isArray(answers[k]) ? answers[k].join(', ') : String(answers[k]) || '—'}
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}

            {/* CV / Portofolio */}
            {(selectedApplicant.cv_url || selectedApplicant.CVURL) ? (
              <a href={(selectedApplicant.cv_url || selectedApplicant.CVURL).startsWith('http') ? (selectedApplicant.cv_url || selectedApplicant.CVURL) : `${API_BASE_URL.replace('/api', '')}${selectedApplicant.cv_url || selectedApplicant.CVURL}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-[var(--theme-primary-light)]/20 border border-[var(--theme-primary)]/20 rounded-xl hover:bg-[var(--theme-primary-light)]/40 transition-all group">
                <div className="flex items-center gap-3 text-[var(--theme-primary)]">
                  <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)]/50 flex items-center justify-center">
                    <span className="material-symbols-outlined">folder_shared</span>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">Dokumen Pendukung</p>
                    <p className="text-[10px] font-bold opacity-70">Lihat CV / Portofolio</p>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[var(--theme-primary)] group-hover:translate-x-1 transition-transform">chevron_right</span>
              </a>
            ) : (
              <div className="p-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] border-dashed rounded-xl text-xs text-[var(--theme-text-muted)] text-center font-bold">
                Tidak ada dokumen tambahan.
              </div>
            )}
          </div>
        </DialogModal>
      )}

      {/* ═══════════════════════════════════════════════
         REJECTION REASON MODAL
         ═══════════════════════════════════════════════ */}
      <DialogModal
        open={rejectModalOpen}
        onOpenChange={setRejectModalOpen}
        onClose={() => { setRejectModalOpen(false); setRejectTarget(null); setRejectionReason('') }}
        title="Tolak Pendaftar"
        description="Berikan alasan penolakan untuk pendaftar ini."
        icon={<span className="material-symbols-outlined text-[var(--theme-danger)]">block</span>}
        maxWidth="max-w-md"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => { setRejectModalOpen(false); setRejectTarget(null); setRejectionReason('') }} className="rounded-xl font-bold">
              Batal
            </Button>
            <Button type="button" onClick={confirmReject} disabled={actionLoading}
              className="h-10 px-5 rounded-xl bg-[var(--theme-danger)] text-white text-xs font-black hover:bg-[var(--theme-danger-hover)] transition-all active:scale-95 border-none shadow-md shadow-[var(--theme-danger)]/20">
              {actionLoading ? 'Memproses...' : 'Ya, Tolak Pendaftar'}
            </Button>
          </>
        }
      >
        <div className="p-6 space-y-4">
          <p className="text-sm font-semibold text-[var(--theme-text)]">
            Menolak <span className="font-black">{rejectTarget?.Mahasiswa?.Nama || 'pendaftar'}</span>?
          </p>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest block">
              Alasan Penolakan <span className="text-[var(--theme-text-muted)]">(opsional, akan dikirim ke mahasiswa)</span>
            </label>
            <textarea
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Contoh: IPK tidak memenuhi syarat, berkas tidak lengkap..."
              rows={4}
              className="w-full p-4 bg-[var(--theme-bg)]/50 border border-[var(--theme-border)] rounded-xl text-xs font-semibold outline-none focus:border-[var(--theme-danger)] transition-colors resize-none"
            />
          </div>
        </div>
      </DialogModal>

      {/* ═══════════════════════════════════════════════
         BULK ACTION CONFIRM MODAL
         ═══════════════════════════════════════════════ */}
      <DialogModal
        open={bulkActionModalOpen}
        onOpenChange={setBulkActionModalOpen}
        onClose={() => { setBulkActionModalOpen(false); setBulkAction('') }}
        title={bulkAction === 'accept' ? 'Terima Semua Pendaftar' : 'Tolak Semua Pendaftar'}
        description={`Anda akan ${bulkAction === 'accept' ? 'menerima' : 'menolak'} ${selectedIds.size} pendaftar sekaligus.`}
        icon={<span className={`material-symbols-outlined ${bulkAction === 'accept' ? 'text-[var(--theme-success)]' : 'text-[var(--theme-danger)]'}`}>
          {bulkAction === 'accept' ? 'how_to_reg' : 'block'}
        </span>}
        maxWidth="max-w-sm"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => { setBulkActionModalOpen(false); setBulkAction('') }} className="rounded-xl font-bold">
              Batal
            </Button>
            <Button type="button" onClick={confirmBulkAction} disabled={actionLoading}
              className={`h-10 px-5 rounded-xl text-white text-xs font-black transition-all active:scale-95 border-none shadow-md ${
                bulkAction === 'accept' ? 'bg-[var(--theme-success)] hover:bg-[var(--theme-success-hover)] shadow-[var(--theme-success)]/20' : 'bg-[var(--theme-danger)] hover:bg-[var(--theme-danger-hover)] shadow-[var(--theme-danger)]/20'
              }`}>
              {actionLoading ? 'Memproses...' : `Ya, ${bulkAction === 'accept' ? 'Terima' : 'Tolak'} Semua`}
            </Button>
          </>
        }
      >
        <div className="p-6">
          <p className="text-sm font-semibold text-[var(--theme-text-muted)]">
            Tindakan ini akan memproses <strong className="text-[var(--theme-text)]">{selectedIds.size} pendaftar</strong> secara bersamaan.
            {bulkAction === 'reject' && (
              <span className="block mt-2 text-[var(--theme-danger)]">Pendaftar yang ditolak tidak akan bisa mendaftar ulang tanpa dihapus oleh admin.</span>
            )}
          </p>
        </div>
      </DialogModal>
    </PageContent>
  )
}
