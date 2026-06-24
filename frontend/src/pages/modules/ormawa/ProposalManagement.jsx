"use client"
import React, { useState, useEffect } from 'react';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { createPortal } from 'react-dom'



import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import useAuthStore from '@/store/useAuthStore'
import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const STATUS_CONFIG = {
  diajukan: { label: 'Diajukan', cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-500/20 border-blue-200', icon: 'schedule' },
  disetujui_fakultas: { label: 'ACC Fakultas', cls: 'bg-violet-50 text-violet-700 ring-1 ring-violet-500/20 border-violet-200', icon: 'check_circle' },
  disetujui_univ: { label: 'Disetujui Univ', cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-500/20 border-emerald-200', icon: 'check_circle' },
  revisi: { label: 'Butuh Revisi', cls: 'bg-amber-50 text-amber-700 ring-1 ring-amber-500/20 border-amber-200', icon: 'error' },
  ditolak: { label: 'Ditolak', cls: 'bg-rose-50 text-rose-700 ring-1 ring-rose-500/20 border-rose-200', icon: 'cancel' },
  selesai: { label: 'Selesai', cls: 'bg-slate-100 text-slate-600 ring-1 ring-slate-400/20 border-border', icon: 'check_circle' },
}

const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>description</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const AlertTriangle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>error</span>;
const CheckCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const Payments = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>payments</span>;


const getProposalId = (p) => p?.id || p?.ID

const StatusBadge = ({ status }) => {
  const s = String(status || 'diajukan').toLowerCase().trim()
  const cfg = STATUS_CONFIG[s] || { label: status, cls: 'bg-slate-100 text-slate-600 border-border', icon: 'description' }
  return (
    <Badge className={cn('capitalize font-black text-[10px] px-3 py-1 border shadow-sm rounded-lg uppercase tracking-wider', cfg.cls)}>
      {cfg.label}
    </Badge>
  )
}

const formatRupiah = (n) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0)

const parseRupiahInput = (value) => {
  return String(value || '').replace(/\D/g, '')
}

const formatRupiahInput = (value) => {
  if (value === null || value === undefined || value === '') return ''
  const numberString = String(value).replace(/\D/g, '')
  return new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(numberString)
}

const isUnivLevelOrmawa = (p) => {
  if (!p) return false
  const nama = p.Ormawa?.Nama || p.ormawa?.Nama || p.Organisasi?.Nama || ''
  const namaLower = nama.toLowerCase()
  return namaLower.includes('universitas') ||
    namaLower.includes('ukm') ||
    namaLower.includes('mpm')
}

export default function ProposalManagement() {
  const [printData, setPrintData] = useState(null)

  useEffect(() => {
    if (printData) {
      const timer = setTimeout(() => {
        window.print()
        setPrintData(null)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [printData])
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [history, setHistory] = useState([])
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [komentar, setKomentar] = useState('')
  const [dokumenList, setDokumenList] = useState([])
  const [existingFileList, setExistingFileList] = useState([])
  const [budgetInfo, setBudgetInfo] = useState(null)
  const [budgetLoading, setBudgetLoading] = useState(false)
  const userObj = useAuthStore.getState()?.user
  const mhsObj = useAuthStore.getState()?.mahasiswa
  const ormawaId = getOrmawaId()
  const { hasPermission } = usePermission()
  const mahasiswaId = mhsObj?.id || mhsObj?.ID || 0
  const [formData, setFormData] = useState({
    Judul: '',
    Catatan: '',
    TanggalKegiatan: '',
    Anggaran: '',
    OrmawaID: ormawaId,
    MahasiswaID: mahasiswaId,
    LandasanKegiatan: '',
    Deskripsi: '',
    BentukKegiatan: '',
    Mitra: '',
    LatarBelakang: '',
    TujuanKegiatan: '',
    JadwalPelaksanaan: '',
    SasaranKegiatan: '',
    IndikatorKeberhasilan: '',
    SumberDana: '',
    PJKegiatan: ''
  })


  const fetchProposals = async () => {
    if (!ormawaId) { setLoading(false); return }
    setLoading(true)
    try {
      const data = await fetchWithAuth(`${API}/proposals?ormawaId=${ormawaId}`)
      if (data.status === 'success') {
        setProposals(data.data || [])
        return data.data || []
      }
      else toast.error('Gagal memuat data proposal')
    } catch {
      toast.error('Koneksi ke server gagal')
    } finally {
      setLoading(false)
    }
    return []
  }

  const fetchHistory = async (proposalId) => {
    try {
      const data = await fetchWithAuth(`${API}/proposals/${proposalId}/history`)
      if (data.status === 'success') setHistory(data.data || [])
    } catch { }
  }

  const fetchBudgetStatus = async () => {
    if (!ormawaId) return
    try {
      setBudgetLoading(true)
      const data = await fetchWithAuth(`${API}/budget-status?ormawaId=${ormawaId}`)
      if (data.status === 'success') setBudgetInfo(data.data || null)
      else setBudgetInfo(null)
    } catch {
      setBudgetInfo(null)
    } finally {
      setBudgetLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [ormawaId])

  const handleOpenAdd = () => {
    setIsEditMode(false)
    setFormData({
      Judul: '',
      Catatan: '',
      TanggalKegiatan: '',
      Anggaran: '',
      OrmawaID: ormawaId,
      MahasiswaID: mahasiswaId,
      LandasanKegiatan: '',
      Deskripsi: '',
      BentukKegiatan: '',
      Mitra: '',
      LatarBelakang: '',
      TujuanKegiatan: '',
      JadwalPelaksanaan: '',
      SasaranKegiatan: '',
      IndikatorKeberhasilan: '',
      SumberDana: '',
      PJKegiatan: ''
    })
    setDokumenList([])
    setExistingFileList([])
    fetchBudgetStatus()
    setIsCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    let existingFiles = []
    try {
      const parsed = JSON.parse(row.file_url || row.FileURL || '[]')
      existingFiles = Array.isArray(parsed) ? parsed : (row.file_url || row.FileURL ? [row.file_url || row.FileURL] : [])
    } catch {
      existingFiles = (row.file_url || row.FileURL) ? [row.file_url || row.FileURL] : []
    }
    setFormData({
      id: row.id || row.ID,
      Judul: row.Judul || row.judul || '',
      Catatan: row.Catatan || row.catatan || '',
      TanggalKegiatan: row.TanggalKegiatan ? row.TanggalKegiatan.split('T')[0] : (row.tanggal_kegiatan ? row.tanggal_kegiatan.split('T')[0] : ''),
      Anggaran: row.Anggaran || row.anggaran || '',
      OrmawaID: row.OrmawaID || row.ormawa_id || ormawaId,
      file_url: row.file_url || row.FileURL || '',
      FileURL: row.file_url || row.FileURL || '',

      LandasanKegiatan: row.LandasanKegiatan || row.landasan_kegiatan || '',
      Deskripsi: row.Deskripsi || row.deskripsi || '',
      BentukKegiatan: row.BentukKegiatan || row.bentuk_kegiatan || '',
      Mitra: row.Mitra || row.mitra || '',
      LatarBelakang: row.LatarBelakang || row.latar_belakang || '',
      TujuanKegiatan: row.TujuanKegiatan || row.tujuan_kegiatan || '',
      JadwalPelaksanaan: row.JadwalPelaksanaan || row.jadwal_pelaksanaan || '',
      SasaranKegiatan: row.SasaranKegiatan || row.sasaran_kegiatan || '',
      IndikatorKeberhasilan: row.IndikatorKeberhasilan || row.indikator_keberhasilan || '',
      SumberDana: row.SumberDana || row.sumber_dana || '',
      PJKegiatan: row.PJKegiatan || row.pj_kegiatan || '',
    })
    setDokumenList([])
    setExistingFileList(existingFiles)
    setIsCrudOpen(true)
  }

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files)
    const validFiles = []
    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`File "${file.name}" melebihi batas 5MB`)
        continue
      }
      validFiles.push(file)
    }
    if (validFiles.length > 0) {
      setDokumenList((prev) => [...prev, ...validFiles])
      toast.success(`${validFiles.length} file berhasil terpilih`)
    }
  }

  const handleRemoveNewFile = (index) => {
    setDokumenList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleRemoveExistingFile = (index) => {
    setExistingFileList((prev) => prev.filter((_, i) => i !== index))
  }

  const handleView = (row) => {
    setSelected(row)
    setHistory([])
    fetchHistory(row.id || row.ID)
    setIsDetailOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    // Frontend budget validation before submit
    const anggaranVal = Number(formData.Anggaran || 0)
    if (!isEditMode && budgetInfo?.is_active && budgetInfo?.enforce_limit && anggaranVal > budgetInfo.remaining_budget) {
      toast.error(`Anggaran melebihi sisa pagu sebesar ${formatRupiah(anggaranVal - budgetInfo.remaining_budget)}. Sisa pagu: ${formatRupiah(budgetInfo.remaining_budget)}`)
      return
    }

    setIsSubmitting(true)

    // 1. Upload all new files in dokumenList
    const newUploadedUrls = []
    for (const file of dokumenList) {
      const uploadData = new FormData()
      uploadData.append('file', file)
      try {
        const uploadRes = await fetchWithAuth(`${API_BASE_URL}/ormawa/upload`, {
          method: 'POST',
          body: uploadData,
        })
        if (uploadRes.status === 'success') {
          newUploadedUrls.push(uploadRes.url)
        } else {
          toast.error(`Gagal mengunggah file "${file.name}"`)
          setIsSubmitting(false)
          return
        }
      } catch (err) {
        toast.error(`Gagal mengunggah file "${file.name}"`)
        setIsSubmitting(false)
        return
      }
    }

    // 2. Combine remaining existing files with newly uploaded file URLs
    const finalFiles = [...existingFileList, ...newUploadedUrls]
    const finalFileUrl = finalFiles.length > 0 ? JSON.stringify(finalFiles) : ''

    const formId = formData.id || formData.ID
    const url = isEditMode ? `${API}/proposals/${formId}` : `${API}/proposals`
    const method = isEditMode ? 'PUT' : 'POST'

    const payload = {
      ...formData,
      Anggaran: Number(formData.Anggaran),
      OrmawaID: Number(formData.OrmawaID),
      TanggalKegiatan: formData.TanggalKegiatan ? new Date(formData.TanggalKegiatan).toISOString() : new Date().toISOString(),
      file_url: finalFileUrl,
      FileURL: finalFileUrl,
    }
    try {
      const data = await fetchWithAuth(url, {
        method,
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' }
      })
      if (data.status === 'success') {
        toast.success(isEditMode ? 'Proposal diperbarui' : 'Proposal berhasil diajukan')
        setIsCrudOpen(false)
        const updatedList = await fetchProposals()
        if (!isEditMode && data.data) {
          const newId = data.data.id || data.data.ID
          const newlyCreated = (updatedList || []).find(p => (p.id || p.ID) === newId)
          if (newlyCreated) {
            printProposalPDF(newlyCreated)
          }
        }
      } else {
        toast.error(data.message || 'Gagal menyimpan proposal')
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  const [nomorSuratProposal, setNomorSuratProposal] = useState('-')

  const printProposalPDF = async (proposal) => {
    try {
      const { documentSettingsService } = await import('@/services/api');
      const numRes = await documentSettingsService.generateNumber("Persetujuan Proposal");
      if (numRes && numRes.status === 'success' && numRes.data) {
        setNomorSuratProposal(numRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch document number', err);
    }
    setPrintData(proposal)
  }

  const handleAction = async (status) => {
    if (!selected) return
    const selectedId = selected.id || selected.ID
    if ((status === 'revisi' || status === 'ditolak') && !komentar.trim()) {
      toast.error('Catatan/alasan wajib diisi untuk revisi atau penolakan')
      return
    }
    setIsSubmitting(true)
    try {
      const data = await fetchWithAuth(`${API}/proposals/${selectedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: status, Catatan: komentar })
      })
      if (data.status === 'success') {
        toast.success('Status proposal diperbarui')
        setIsDetailOpen(false)
        setKomentar('')
        fetchProposals()
      } else {
        toast.error(data.message || 'Gagal memperbarui status')
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    const selectedId = selected?.id || selected?.ID
    if (!selectedId) return
    setIsSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API}/proposals/${selectedId}`, { method: 'DELETE' })
      if (res.status === 'success') {
        toast.success('Proposal dihapus')
        setIsDelOpen(false)
        fetchProposals()
      } else {
        toast.error(res.message || 'Gagal menghapus proposal')
      }
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus proposal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResubmit = async () => {
    const selectedId = selected?.id || selected?.ID
    if (!selectedId) return
    setIsResubmitting(true)
    try {
      const res = await fetchWithAuth(`${API}/proposals/${selectedId}/resubmit`, { method: 'POST' })
      if (res.status === 'success') {
        toast.success('Proposal berhasil diajukan ulang')
        setIsDetailOpen(false)
        fetchProposals()
      } else {
        toast.error(res.message || 'Gagal mengajukan ulang')
      }
    } catch (err) {
      toast.error(err.message || 'Gagal mengajukan ulang')
    } finally {
      setIsResubmitting(false)
    }
  }

  const columns = [
    {
      key: 'ID',
      label: 'Kode Ref',
      className: 'w-[120px]',
      render: (val, row) => {
        const id = row.id || row.ID
        return <span className="font-bold text-slate-400 font-headline text-[10px] tracking-widest uppercase">PROP-{id}</span>
      }
    },
    {
      key: 'Judul',
      label: 'Kegiatan',
      className: 'min-w-[280px]',
      render: (val, row) => (
        <div className="flex flex-col leading-tight gap-0.5">
          <span className="font-bold text-slate-900 font-headline tracking-tighter text-[13px]">{val || '—'}</span>
          <span className="text-[10px] text-slate-400 font-semibold tracking-tight font-body">
            {row.TanggalKegiatan ? new Date(row.TanggalKegiatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        </div>
      )
    },
    {
      key: 'Anggaran',
      label: 'Anggaran',
      className: 'w-[180px]',
      render: (val) => <span className="font-black text-emerald-600 text-[12px] font-headline">{formatRupiah(val)}</span>
    },
    {
      key: 'Status',
      label: 'Status',
      className: 'w-[170px] text-center',
      cellClassName: 'text-center',
      render: (val) => <StatusBadge status={val} />
    }
  ]

  const totalProposal = proposals.length;
  const menunggu = proposals.filter(p => {
    const s = String(p.Status || 'diajukan').toLowerCase().trim();
    return s === 'diajukan';
  }).length;
  const butuhRevisi = proposals.filter(p => {
    const s = String(p.Status || 'diajukan').toLowerCase().trim();
    return s === 'revisi';
  }).length;
  const disetujui = proposals.filter(p => {
    const s = String(p.Status || 'diajukan').toLowerCase().trim();
    return ['disetujui_fakultas', 'disetujui_univ', 'selesai'].includes(s);
  }).length;
  const totalAnggaran = proposals.reduce((acc, curr) => acc + (curr.Anggaran || 0), 0);

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" containerStyle={{ zIndex: 99999 }} />
      <img src="/images/format_kop_rektorat_landscape.jpg" style={{ display: 'none' }} alt="" />

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Manajemen"
        highlightedTitle="Proposal"
        subtitle={proposals.length > 0 && isUnivLevelOrmawa(proposals[0])
          ? "Ajukan & Pantau Persetujuan Kegiatan: Ormawa → Universitas"
          : "Ajukan & Pantau Persetujuan Kegiatan: Ormawa → Fakultas → Universitas"}
        icon="description"
        badges={[{ label: 'Pengajuan Kegiatan', active: true }]}
      />

      {/* ── Stats Grid (Glassmorphism stats cards) ──────────────── */}
      <div className="space-y-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <PrimaryStatsCard
            title="Total Proposal"
            value={totalProposal}
            icon={Layers}
            colorTheme="info"
            badgeText="Semua pengajuan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">description</span>}
          />

          <PrimaryStatsCard
            title="Menunggu"
            value={menunggu}
            icon={Clock}
            colorTheme="primary"
            badgeText="Dalam antrean"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">pending</span>}
          />

          <PrimaryStatsCard
            title="Butuh Revisi"
            value={butuhRevisi}
            icon={AlertTriangle}
            colorTheme="warning"
            badgeText="Perlu perbaikan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">edit_note</span>}
          />

          <PrimaryStatsCard
            title="Disetujui"
            value={disetujui}
            icon={CheckCircle}
            colorTheme="success"
            badgeText="Telah di-ACC"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
          />

          <PrimaryStatsCard
            title="Total Anggaran"
            value={formatRupiah(totalAnggaran)}
            icon={Payments}
            colorTheme="success"
            badgeText="Diajukan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">account_balance_wallet</span>}
          />
        </div>
      </div>

      {/* ── Content Area ───────────────────────────────────────────── */}
      <div>
        <div>
          <DataTable
          title="Daftar Proposal"
          subtitle="Menampilkan daftar proposal yang diajukan oleh Ormawa."
            columns={columns}
            data={proposals}
            loading={loading}
            searchPlaceholder="Cari judul atau kode proposal..."
            onAdd={hasPermission('ormawa.proposals.create') ? handleOpenAdd : undefined}
            addLabel="Buat Proposal"
            filters={[
              {
                key: 'Status',
                placeholder: 'Filter Status',
                options: Object.entries(STATUS_CONFIG).map(([value, { label }]) => ({ label, value }))
              }
            ]}
            actions={(row) => {
              const statusStr = String(row.Status || 'diajukan').toLowerCase().trim()
              const isLocked = ['disetujui_fakultas', 'disetujui_univ', 'selesai'].includes(statusStr)
              return (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => handleView(row)} title="Detail"><span className="material-symbols-outlined block" style={{ fontSize: '18px' }} >visibility</span></Button>
                  <Button variant="ghost" size="icon" onClick={() => printProposalPDF(row)} title="Cetak PDF"><span className="material-symbols-outlined block text-[var(--theme-success)]" style={{ fontSize: '18px' }} >print</span></Button>
                  {!isLocked && (
                    <>
                      {hasPermission('ormawa.proposals.update') && (
                        <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(row)} title="Edit"><span className="material-symbols-outlined block text-[var(--theme-warning)]" style={{ fontSize: '18px' }} >edit</span></Button>
                      )}
                      {hasPermission('ormawa.proposals.delete') && (
                        <Button variant="ghost" size="icon" onClick={() => { setSelected(row); setIsDelOpen(true) }} title="Hapus"><span className="material-symbols-outlined block text-[var(--theme-error)]" style={{ fontSize: '18px' }} >delete</span></Button>
                      )}
                    </>
                  )}
                </div>
              )
            }}
          />
        </div>
      </div>

      {/* DETAIL & REVIEW MODAL */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onClose={() => { setIsDetailOpen(false); setKomentar('') }}
        title={selected ? `PROP-${getProposalId(selected)}: ${selected.Judul}` : 'Detail Proposal'}
        subtitle="Pantau proses persetujuan, anggaran, dan riwayat revisi kegiatan."
        icon="description"
        maxWidth="max-w-5xl"
        footer={
          <>
            {selected && (
              <Button onClick={() => printProposalPDF(selected)} className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/90 text-white font-bold gap-2 flex items-center transition-all shadow-sm h-10 rounded-xl">
                <span className="material-symbols-outlined text-[16px]">print</span>
                Cetak Proposal (PDF)
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={() => { setIsDetailOpen(false); setKomentar('') }} className="h-10 rounded-xl border border-border text-[var(--theme-text-subtle)] hover:bg-[var(--theme-bg)]">
              Tutup Detail
            </Button>
          </>
        }
      >
        {selected && (
          <div className="w-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Left Column: Details */}
              <div className="lg:col-span-2 space-y-6">

                {/* Metrics Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-[var(--theme-bg)] border border-border/60 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-success-light)] text-[var(--theme-success)] flex items-center justify-center border border-[var(--theme-success)]/20 shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>payments</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-[var(--theme-text-subtle)] tracking-wider uppercase">Anggaran Diajukan</p>
                      <p className="text-sm font-black text-[var(--theme-success)] font-headline mt-0.5 truncate">{formatRupiah(selected.Anggaran)}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--theme-bg)] border border-border/60 rounded-2xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center border border-[var(--theme-primary)]/20 shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>calendar_today</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[8px] font-black text-[var(--theme-text-subtle)] tracking-wider uppercase">Tanggal Kegiatan</p>
                      <p className="text-sm font-black text-[var(--theme-text)] font-headline mt-0.5 truncate">
                        {selected.TanggalKegiatan ? new Date(selected.TanggalKegiatan).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Detail Fields Grid */}
                <div className="bg-[var(--theme-bg)] border border-border/60 rounded-2xl p-6 space-y-4">
                  <h3 className="text-xs font-black text-[var(--theme-text)] uppercase tracking-widest font-headline">Informasi Detail Proposal</h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-[var(--theme-text-subtle)]">
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Landasan Kegiatan</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.LandasanKegiatan || selected.landasan_kegiatan || "—"}</p>
                    </div>
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Bentuk Kegiatan</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.BentukKegiatan || selected.bentuk_kegiatan || "—"}</p>
                    </div>
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Mitra Kerja</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.Mitra || selected.mitra || "—"}</p>
                    </div>
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">PJ Kegiatan</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.PJKegiatan || selected.pj_kegiatan || "—"}</p>
                    </div>
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Jadwal Pelaksanaan</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.JadwalPelaksanaan || selected.jadwal_pelaksanaan || "—"}</p>
                    </div>
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Sasaran Kegiatan</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.SasaranKegiatan || selected.sasaran_kegiatan || "—"}</p>
                    </div>
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Sumber Dana</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.SumberDana || selected.sumber_dana || "—"}</p>
                    </div>
                    <div className="bg-[var(--theme-surface)] p-3 rounded-xl border border-border/40 space-y-1">
                      <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Indikator Keberhasilan</p>
                      <p className="font-bold text-[var(--theme-text)]">{selected.IndikatorKeberhasilan || selected.indikator_keberhasilan || "—"}</p>
                    </div>
                  </div>

                  <div className="bg-[var(--theme-surface)] p-4 rounded-xl border border-border/40 space-y-1.5 text-xs text-[var(--theme-text-subtle)]">
                    <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Latar Belakang</p>
                    <p className="font-medium leading-relaxed whitespace-pre-line text-[var(--theme-text)]">{selected.LatarBelakang || selected.latar_belakang || "—"}</p>
                  </div>

                  <div className="bg-[var(--theme-surface)] p-4 rounded-xl border border-border/40 space-y-1.5 text-xs text-[var(--theme-text-subtle)]">
                    <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Tujuan Kegiatan</p>
                    <p className="font-medium leading-relaxed whitespace-pre-line text-[var(--theme-text)]">{selected.TujuanKegiatan || selected.tujuan_kegiatan || "—"}</p>
                  </div>

                  <div className="bg-[var(--theme-surface)] p-4 rounded-xl border border-border/40 space-y-1.5 text-xs text-[var(--theme-text-subtle)]">
                    <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-wider">Deskripsi Kegiatan</p>
                    <p className="font-medium leading-relaxed whitespace-pre-line text-[var(--theme-text)]">{selected.Deskripsi || selected.deskripsi || "—"}</p>
                  </div>
                </div>

                {/* Dokumen Proposal */}
                {(() => {
                  const getFileUrlsList = (val) => {
                    try {
                      const parsed = JSON.parse(val || '[]')
                      return Array.isArray(parsed) ? parsed : (val ? [val] : [])
                    } catch {
                      return val ? [val] : []
                    }
                  }
                  const files = getFileUrlsList(selected.FileURL || selected.file_url)
                  return files.length > 0 ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.15em] uppercase font-headline">Dokumen Lampiran ({files.length})</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {files.map((file, idx) => {
                          const filename = file.split('/').pop() || `Berkas_${idx + 1}`
                          const cleanName = filename.substring(filename.indexOf('_') + 1)
                          return (
                            <a
                              key={idx}
                              href={`${API_BASE_URL.replace('/api', '')}${file}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center justify-between p-3.5 bg-[var(--theme-primary-light)]/60 border border-[var(--theme-primary)]/20 rounded-2xl hover:bg-[var(--theme-primary-light)] hover:border-[var(--theme-primary)]/30 transition-all group"
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-9 h-9 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center shadow-sm shrink-0 border border-[var(--theme-primary)]/20">
                                  <span className="material-symbols-outlined normal-case" style={{ fontSize: '18px' }}>upload_file</span>
                                </div>
                                <div className="flex flex-col leading-tight min-w-0 flex-1">
                                  <span className="text-[11px] font-black text-[var(--theme-primary)] uppercase tracking-wider font-headline truncate" title={cleanName}>{cleanName}</span>
                                  <span className="text-[9px] text-[var(--theme-primary)] font-bold mt-0.5">Klik untuk melihat file</span>
                                </div>
                              </div>
                              <span className="material-symbols-outlined normal-case text-[var(--theme-primary)] group-hover:translate-x-0.5 transition-transform shrink-0" style={{ fontSize: '18px' }}>arrow_forward</span>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.15em] uppercase font-headline">Dokumen Lampiran</Label>
                      <div className="flex items-center gap-3 p-4 bg-[var(--theme-bg)] border border-border/40 rounded-2xl">
                        <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text-subtle)] flex items-center justify-center shadow-inner">
                          <span className="material-symbols-outlined normal-case" style={{ fontSize: '20px' }}>description</span>
                        </div>
                        <div className="flex flex-col leading-tight">
                          <span className="text-[11px] font-bold text-[var(--theme-text-subtle)]">Tidak ada dokumen terunggah</span>
                        </div>
                      </div>
                    </div>
                  )
                })()}

                {/* Alur Persetujuan */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.15em] uppercase font-headline">Alur Persetujuan</Label>
                  <div className="bg-[var(--theme-bg)] border border-border/60 rounded-2xl p-5 flex items-center justify-between gap-2">
                    {(() => {
                      const isUniv = isUnivLevelOrmawa(selected)
                      const flowKeys = isUniv ? ['disetujui_univ'] : ['disetujui_fakultas', 'disetujui_univ']
                      const flowLabels = isUniv ? ['Universitas'] : ['Fakultas', 'Universitas']
                      const statuses = isUniv ? ['disetujui_univ', 'selesai'] : ['disetujui_fakultas', 'disetujui_univ', 'selesai']

                      return flowKeys.map((s, i) => {
                        const active = statuses.indexOf(selected.Status) >= i
                        return (
                          <React.Fragment key={s}>
                            <div className={cn('flex flex-col items-center gap-1.5', active ? '' : 'opacity-30')}>
                              <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', active ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20 shadow-sm' : 'bg-[var(--theme-bg)] text-[var(--theme-text-subtle)] border-border/40')}>
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
                              </div>
                              <span className="text-[9px] font-black tracking-wider text-[var(--theme-text-subtle)] font-headline uppercase">{flowLabels[i]}</span>
                            </div>
                            {i < flowKeys.length - 1 && <div className={cn('flex-1 h-[2px] rounded-full', active ? 'bg-[var(--theme-success)]' : 'bg-[var(--theme-border)]')} />}
                          </React.Fragment>
                        )
                      })
                    })()}
                  </div>
                </div>

                {/* Histori */}
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.15em] uppercase font-headline">Riwayat Status</Label>
                  <div className="space-y-3 relative before:absolute before:left-5 before:top-4 before:bottom-0 before:w-px before:bg-[var(--theme-border)]">
                    {history.length === 0 && <p className="text-[11px] text-[var(--theme-text-subtle)] font-semibold pl-4">Belum ada riwayat</p>}
                    {history.map((log) => {
                      const timestamp = log.created_at || log.CreatedAt || log.createdat
                      return (
                        <div key={log.id || log.ID} className="flex gap-4 relative z-10">
                          <div className="w-10 h-10 shrink-0 rounded-xl bg-[var(--theme-surface)] border border-border/50 flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }}>history</span>
                          </div>
                          <div className="flex-1 bg-[var(--theme-bg)] rounded-2xl p-4 border border-border/50">
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <StatusBadge status={log.Status} />
                              <span className="text-[9px] text-[var(--theme-text-subtle)] font-semibold font-mono">
                                {timestamp ? new Date(timestamp).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--theme-text)] font-medium leading-relaxed">{log.Catatan || 'Tanpa catatan'}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

              </div>

              {/* Right Column: Status Info — read only, no action buttons */}
              <div className="space-y-5 lg:border-l lg:border-border/50 lg:pl-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.15em] uppercase font-headline">Status Saat Ini</Label>
                  <div className="flex items-center">
                    <StatusBadge status={selected.Status} />
                  </div>
                </div>

                {/* Alur approval info box */}
                <div className="bg-[var(--theme-bg)] border border-border/60 rounded-2xl p-4 space-y-2">
                  <p className="text-[9px] font-black text-[var(--theme-text-subtle)] uppercase tracking-widest">Alur Persetujuan</p>
                  <p className="text-[11px] text-[var(--theme-text-subtle)] font-medium leading-relaxed">
                    Proposal diteruskan secara otomatis setelah disetujui masing-masing tingkat:
                  </p>
                  {(() => {
                    const isUniv = isUnivLevelOrmawa(selected)
                    const flowSteps = isUniv
                      ? [{ s: 'disetujui_univ', label: 'Universitas' }]
                      : [{ s: 'disetujui_fakultas', label: 'Admin Fakultas' }, { s: 'disetujui_univ', label: 'Universitas' }]
                    const statuses = isUniv ? ['disetujui_univ', 'selesai'] : ['disetujui_fakultas', 'disetujui_univ', 'selesai']

                    return flowSteps.map((step, i) => {
                      const done = statuses.indexOf(selected.Status) >= i
                      return (
                        <div key={step.s} className={`flex items-center gap-2.5 p-2.5 rounded-xl border ${done ? 'bg-[var(--theme-success-light)] border-[var(--theme-success)]/20' : 'bg-[var(--theme-bg)] border-border/50 opacity-50'
                          }`}>
                          <span className={`material-symbols-outlined text-[16px] ${done ? 'text-[var(--theme-success)]' : 'text-[var(--theme-text-subtle)]'}`}>
                            {done ? 'check_circle' : 'radio_button_unchecked'}
                          </span>
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${done ? 'text-[var(--theme-success)]' : 'text-[var(--theme-text-subtle)]'}`}>
                            {step.label}
                          </span>
                        </div>
                      )
                    })
                  })()}
                </div>

                {/* Catatan dari reviewer */}
                {selected.Catatan && (
                  <div className="bg-[var(--theme-warning-light)] border border-[var(--theme-warning)]/20 rounded-2xl p-4 space-y-1.5">
                    <p className="text-[9px] font-black text-[var(--theme-warning)] uppercase tracking-widest">Catatan Reviewer</p>
                    <p className="text-[11px] text-[var(--theme-warning)] font-medium leading-relaxed">{selected.Catatan}</p>
                  </div>
                )}

                {/* Ajukan Ulang — only visible when status is revisi */}
                {selected.Status === 'revisi' && (
                  <button
                    onClick={handleResubmit}
                    disabled={isResubmitting}
                    className="w-full h-11 rounded-2xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/90 text-white text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-[var(--theme-primary)]/20 flex items-center justify-center gap-2 border-none"
                  >
                    {isResubmitting ? (
                      <><span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span> Mengirim...</>
                    ) : (
                      <><span className="material-symbols-outlined" style={{ fontSize: '16px' }}>refresh</span> Ajukan Ulang</>
                    )}
                  </button>
                )}
              </div>

            </div>
          </div>
        )}
      </DialogModal>

      {/* CRUD MODAL */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        onClose={() => setIsCrudOpen(false)}
        title={isEditMode ? 'Edit Proposal' : 'Buat Proposal Baru'}
        subtitle="Isi data kegiatan dan anggaran yang dibutuhkan untuk pengajuan."
        icon={isEditMode ? "edit" : "add"}
        maxWidth="max-w-4xl"
        footer={
          <>
            <Button variant="ghost" type="button" onClick={() => setIsCrudOpen(false)} className="h-10 rounded-xl border border-border text-[var(--theme-text-subtle)] hover:bg-[var(--theme-bg)]">
              Batalkan
            </Button>
            <Button type="submit" form="proposal-form" disabled={isSubmitting} className="h-10 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/90 text-white font-bold gap-2 flex items-center transition-all shadow-sm px-5 border-none">
              {isSubmitting ? (
                <span className="material-symbols-outlined animate-spin text-[16px]">sync</span>
              ) : (
                <span className="material-symbols-outlined stroke-[3px]" style={{ fontSize: '14px' }}>save</span>
              )}
              <span className="uppercase tracking-[0.1em]">{isEditMode ? 'Simpan Perubahan' : 'Buat Proposal'}</span>
            </Button>
          </>
        }
      >
        <form id="proposal-form" onSubmit={handleSave}>
          <div className="space-y-6">

            {/* Bagian 1: Informasi Umum */}
            <div className="p-5 bg-[var(--theme-bg)]/30 border border-border rounded-3xl space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-3">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>info</span>
                <h4 className="font-bold text-xs uppercase tracking-widest text-[var(--theme-text)]">Informasi Umum</h4>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Nama Kegiatan</Label>
                <Input required value={formData.Judul} onChange={(e) => setFormData({ ...formData, Judul: e.target.value })} placeholder="Contoh: Pekan Olahraga Fakultas..." className="h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all font-bold text-xs font-headline" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Landasan Kegiatan</Label>
                  <select
                    value={["", "Program Kerja Tahunan", "Instruksi Universitas", "Instruksi Fakultas", "Delegasi Ormawa"].includes(formData.LandasanKegiatan) ? formData.LandasanKegiatan : "Lainnya"}
                    onChange={(e) => setFormData({ ...formData, LandasanKegiatan: e.target.value === "Lainnya" ? "Lainnya: " : e.target.value })}
                    className="w-full h-11 px-3 rounded-2xl border border-border bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline appearance-none"
                  >
                    <option value="" disabled>Pilih Landasan Kegiatan...</option>
                    <option value="Program Kerja Tahunan">Program Kerja Tahunan</option>
                    <option value="Instruksi Universitas">Instruksi Universitas</option>
                    <option value="Instruksi Fakultas">Instruksi Fakultas</option>
                    <option value="Delegasi Ormawa">Delegasi Ormawa</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {formData.LandasanKegiatan && !["Program Kerja Tahunan", "Instruksi Universitas", "Instruksi Fakultas", "Delegasi Ormawa"].includes(formData.LandasanKegiatan) && (
                    <Input required autoFocus value={formData.LandasanKegiatan.replace(/^Lainnya:\s*/, '')} onChange={(e) => setFormData({ ...formData, LandasanKegiatan: 'Lainnya: ' + e.target.value })} placeholder="Tuliskan landasan kegiatan lainnya..." className="mt-2 h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Bentuk Kegiatan</Label>
                  <select
                    value={["", "Kompetisi / Lomba", "Seminar / Webinar", "Pelatihan / Workshop", "Pengabdian Masyarakat", "Musyawarah / Rapat Kerja", "Olahraga / Seni"].includes(formData.BentukKegiatan) ? formData.BentukKegiatan : "Lainnya"}
                    onChange={(e) => setFormData({ ...formData, BentukKegiatan: e.target.value === "Lainnya" ? "Lainnya: " : e.target.value })}
                    className="w-full h-11 px-3 rounded-2xl border border-border bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline appearance-none"
                  >
                    <option value="" disabled>Pilih Bentuk Kegiatan...</option>
                    <option value="Kompetisi / Lomba">Kompetisi / Lomba</option>
                    <option value="Seminar / Webinar">Seminar / Webinar</option>
                    <option value="Pelatihan / Workshop">Pelatihan / Workshop</option>
                    <option value="Pengabdian Masyarakat">Pengabdian Masyarakat</option>
                    <option value="Musyawarah / Rapat Kerja">Musyawarah / Rapat Kerja</option>
                    <option value="Olahraga / Seni">Olahraga / Seni</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {formData.BentukKegiatan && !["Kompetisi / Lomba", "Seminar / Webinar", "Pelatihan / Workshop", "Pengabdian Masyarakat", "Musyawarah / Rapat Kerja", "Olahraga / Seni"].includes(formData.BentukKegiatan) && (
                    <Input required autoFocus value={formData.BentukKegiatan.replace(/^Lainnya:\s*/, '')} onChange={(e) => setFormData({ ...formData, BentukKegiatan: 'Lainnya: ' + e.target.value })} placeholder="Tuliskan bentuk kegiatan lainnya..." className="mt-2 h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline" />
                  )}
                </div>
              </div>
            </div>

            {/* Bagian 2: Pelaksanaan */}
            <div className="p-5 bg-[var(--theme-bg)]/30 border border-border rounded-3xl space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-3">
                <span className="material-symbols-outlined text-[var(--theme-warning)]" style={{ fontSize: '20px' }}>event</span>
                <h4 className="font-bold text-xs uppercase tracking-widest text-[var(--theme-text)]">Rincian Pelaksanaan</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Mitra</Label>
                  <select
                    value={["", "Tidak Ada Mitra", "Sponsor Swasta", "Instansi Pemerintah", "Ormawa Lain", "Organisasi Eksternal Kampus"].includes(formData.Mitra) ? formData.Mitra : "Lainnya"}
                    onChange={(e) => setFormData({ ...formData, Mitra: e.target.value === "Lainnya" ? "Lainnya: " : e.target.value })}
                    className="w-full h-11 px-3 rounded-2xl border border-border bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline appearance-none"
                  >
                    <option value="" disabled>Pilih Mitra...</option>
                    <option value="Tidak Ada Mitra">Tidak Ada Mitra</option>
                    <option value="Sponsor Swasta">Sponsor Swasta</option>
                    <option value="Instansi Pemerintah">Instansi Pemerintah</option>
                    <option value="Ormawa Lain">Ormawa Lain</option>
                    <option value="Organisasi Eksternal Kampus">Organisasi Eksternal Kampus</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {formData.Mitra && !["Tidak Ada Mitra", "Sponsor Swasta", "Instansi Pemerintah", "Ormawa Lain", "Organisasi Eksternal Kampus"].includes(formData.Mitra) && (
                    <Input required autoFocus value={formData.Mitra.replace(/^Lainnya:\s*/, '')} onChange={(e) => setFormData({ ...formData, Mitra: 'Lainnya: ' + e.target.value })} placeholder="Tuliskan mitra lainnya..." className="mt-2 h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">PJ Kegiatan</Label>
                  <Input value={formData.PJKegiatan} onChange={(e) => setFormData({ ...formData, PJKegiatan: e.target.value })} placeholder="Contoh: Budi Santoso (Ketua Panitia)..." className="h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline" />
                </div>

                <div className="space-y-2 col-span-1 md:col-span-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Jadwal & Tanggal Pelaksanaan Utama</Label>
                  <Input
                    required
                    type="datetime-local"
                    value={formData.TanggalKegiatan ? (formData.TanggalKegiatan.includes('T') ? formData.TanggalKegiatan.slice(0, 16) : formData.TanggalKegiatan + 'T00:00') : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setFormData({ ...formData, TanggalKegiatan: '', JadwalPelaksanaan: '' });
                        return;
                      }

                      try {
                        const dateObj = new Date(val);
                        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                        const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

                        const dayName = days[dateObj.getDay()];
                        const date = dateObj.getDate();
                        const monthName = months[dateObj.getMonth()];
                        const year = dateObj.getFullYear();
                        const hours = String(dateObj.getHours()).padStart(2, '0');
                        const minutes = String(dateObj.getMinutes()).padStart(2, '0');

                        const formattedText = `${dayName}, ${date} ${monthName} ${year}, ${hours}.${minutes} WIB`;

                        setFormData({
                          ...formData,
                          TanggalKegiatan: val,
                          JadwalPelaksanaan: formattedText
                        });
                      } catch (err) {
                        setFormData({ ...formData, TanggalKegiatan: val, JadwalPelaksanaan: val });
                      }
                    }}
                    className="h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline cursor-pointer w-full"
                  />
                  {formData.JadwalPelaksanaan && (
                    <p className="text-[10px] text-[var(--theme-primary)] font-semibold ml-2 mt-1 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[12px]">info</span>
                      Terformat otomatis: {formData.JadwalPelaksanaan}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Sasaran Kegiatan</Label>
                  <select
                    value={["", "Seluruh Mahasiswa Universitas", "Seluruh Mahasiswa Fakultas", "Pengurus Ormawa Internal", "Masyarakat Umum", "Siswa SMA/SMK"].includes(formData.SasaranKegiatan) ? formData.SasaranKegiatan : "Lainnya"}
                    onChange={(e) => setFormData({ ...formData, SasaranKegiatan: e.target.value === "Lainnya" ? "Lainnya: " : e.target.value })}
                    className="w-full h-11 px-3 rounded-2xl border border-border bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline appearance-none"
                  >
                    <option value="" disabled>Pilih Sasaran Kegiatan...</option>
                    <option value="Seluruh Mahasiswa Universitas">Seluruh Mahasiswa Universitas</option>
                    <option value="Seluruh Mahasiswa Fakultas">Seluruh Mahasiswa Fakultas</option>
                    <option value="Pengurus Ormawa Internal">Pengurus Ormawa Internal</option>
                    <option value="Masyarakat Umum">Masyarakat Umum</option>
                    <option value="Siswa SMA/SMK">Siswa SMA/SMK</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {formData.SasaranKegiatan && !["Seluruh Mahasiswa Universitas", "Seluruh Mahasiswa Fakultas", "Pengurus Ormawa Internal", "Masyarakat Umum", "Siswa SMA/SMK"].includes(formData.SasaranKegiatan) && (
                    <Input required autoFocus value={formData.SasaranKegiatan.replace(/^Lainnya:\s*/, '')} onChange={(e) => setFormData({ ...formData, SasaranKegiatan: 'Lainnya: ' + e.target.value })} placeholder="Tuliskan sasaran kegiatan lainnya..." className="mt-2 h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Indikator Keberhasilan</Label>
                  <select
                    value={["", "Target Peserta Terpenuhi", "Publikasi Media Luas", "Mendapatkan Profit / Keuntungan", "Kerjasama Jangka Panjang", "Meningkatkan Akreditasi"].includes(formData.IndikatorKeberhasilan) ? formData.IndikatorKeberhasilan : "Lainnya"}
                    onChange={(e) => setFormData({ ...formData, IndikatorKeberhasilan: e.target.value === "Lainnya" ? "Lainnya: " : e.target.value })}
                    className="w-full h-11 px-3 rounded-2xl border border-border bg-white focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline appearance-none"
                  >
                    <option value="" disabled>Pilih Indikator Keberhasilan...</option>
                    <option value="Target Peserta Terpenuhi">Target Peserta Terpenuhi</option>
                    <option value="Publikasi Media Luas">Publikasi Media Luas</option>
                    <option value="Mendapatkan Profit / Keuntungan">Mendapatkan Profit / Keuntungan</option>
                    <option value="Kerjasama Jangka Panjang">Kerjasama Jangka Panjang</option>
                    <option value="Meningkatkan Akreditasi">Meningkatkan Akreditasi</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {formData.IndikatorKeberhasilan && !["Target Peserta Terpenuhi", "Publikasi Media Luas", "Mendapatkan Profit / Keuntungan", "Kerjasama Jangka Panjang", "Meningkatkan Akreditasi"].includes(formData.IndikatorKeberhasilan) && (
                    <Input required autoFocus value={formData.IndikatorKeberhasilan.replace(/^Lainnya:\s*/, '')} onChange={(e) => setFormData({ ...formData, IndikatorKeberhasilan: 'Lainnya: ' + e.target.value })} placeholder="Tuliskan indikator lainnya..." className="mt-2 h-11 rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 transition-all text-xs font-bold font-headline" />
                  )}
                </div>
              </div>
            </div>

            {/* Bagian 3: Anggaran */}
            <div className="p-5 bg-[var(--theme-success-light)]/40 border border-[var(--theme-success)]/20 rounded-3xl space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-[var(--theme-success)]/20 pb-3">
                <span className="material-symbols-outlined text-[var(--theme-success)]" style={{ fontSize: '20px' }}>payments</span>
                <h4 className="font-bold text-xs uppercase tracking-widest text-[var(--theme-success)]">Estimasi Anggaran</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-success)] tracking-[0.2em] ml-1 font-headline uppercase">Estimasi Dana (Rp)</Label>
                  <Input required type="text" value={formatRupiahInput(formData.Anggaran)} onChange={(e) => { const rawVal = parseRupiahInput(e.target.value); setFormData({ ...formData, Anggaran: rawVal }) }} placeholder="Cth: 10.000.000" className="h-11 rounded-2xl border-[var(--theme-success)]/30 bg-white focus:border-[var(--theme-success)] focus:ring-2 focus:ring-[var(--theme-success)]/20 transition-all text-xs font-bold font-headline text-[var(--theme-success)]" />
                  {budgetInfo && (
                    <div className={`mt-2 p-3 rounded-xl text-[11px] space-y-1.5 ${budgetInfo.is_active ? (Number(formData.Anggaran || 0) > budgetInfo.remaining_budget ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50/50 border border-emerald-100') : 'bg-slate-50 border border-slate-200'}`}>
                      {budgetInfo.is_active ? (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Total Pagu</span>
                            <span className="font-bold text-slate-800">{formatRupiah(budgetInfo.budget_limit)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Dana Terpakai</span>
                            <span className="font-semibold text-rose-600">{formatRupiah(budgetInfo.used_budget)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500 font-medium">Dana Tahap Review</span>
                            <span className="font-semibold text-amber-600">{formatRupiah(budgetInfo.pending_budget)}</span>
                          </div>
                          <div className="flex justify-between pt-1 mt-1 border-t border-slate-200/50">
                            <span className="text-slate-600 font-bold">Sisa Pagu Tersedia</span>
                            <span className={`font-bold ${Number(formData.Anggaran || 0) > budgetInfo.remaining_budget ? 'text-rose-600' : 'text-emerald-600'}`}>
                              {formatRupiah(budgetInfo.remaining_budget)}
                            </span>
                          </div>
                          {Number(formData.Anggaran || 0) > budgetInfo.remaining_budget && (
                            <div className="mt-2 text-rose-600 flex items-center gap-1.5 bg-rose-100/50 p-2 rounded-lg font-bold">
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              Melebihi sisa pagu sebesar {formatRupiah(Number(formData.Anggaran || 0) - budgetInfo.remaining_budget)}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-slate-600 text-center py-1 font-medium">
                          <span className="material-symbols-outlined text-[16px] mb-1 block text-slate-400">info</span>
                          Sistem Pagu Dana sedang dinonaktifkan
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-success)] tracking-[0.2em] ml-1 font-headline uppercase">Sumber Dana Utama</Label>
                  <select
                    value={["", "Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas", "Kas Organisasi", "Sponsor / Mitra", "Dana Swadaya Mahasiswa"].includes(formData.SumberDana) ? formData.SumberDana : "Lainnya"}
                    onChange={(e) => setFormData({ ...formData, SumberDana: e.target.value === "Lainnya" ? "Lainnya: " : e.target.value })}
                    className="w-full h-11 px-3 rounded-2xl border border-[var(--theme-success)]/30 bg-white focus:outline-none focus:border-[var(--theme-success)] focus:ring-2 focus:ring-[var(--theme-success)]/20 transition-all text-xs font-bold font-headline appearance-none text-[var(--theme-text)]"
                  >
                    <option value="" disabled>Pilih Sumber Dana...</option>
                    <option value="Dana Kemahasiswaan Universitas">Dana Kemahasiswaan Universitas</option>
                    <option value="Dana Kemahasiswaan Fakultas">Dana Kemahasiswaan Fakultas</option>
                    <option value="Kas Organisasi">Kas Organisasi</option>
                    <option value="Sponsor / Mitra">Sponsor / Mitra</option>
                    <option value="Dana Swadaya Mahasiswa">Dana Swadaya Mahasiswa</option>
                    <option value="Lainnya">Lainnya</option>
                  </select>
                  {formData.SumberDana && !["Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas", "Kas Organisasi", "Sponsor / Mitra", "Dana Swadaya Mahasiswa"].includes(formData.SumberDana) && (
                    <Input required autoFocus value={formData.SumberDana.replace(/^Lainnya:\s*/, '')} onChange={(e) => setFormData({ ...formData, SumberDana: 'Lainnya: ' + e.target.value })} placeholder="Tuliskan sumber dana lainnya..." className="mt-2 h-11 rounded-2xl border-[var(--theme-success)]/30 bg-white focus:border-[var(--theme-success)] focus:ring-2 focus:ring-[var(--theme-success)]/20 transition-all text-xs font-bold font-headline" />
                  )}
                </div>
              </div>
            </div>

            {/* Bagian 4: Deskripsi */}
            <div className="p-5 bg-[var(--theme-bg)]/30 border border-border rounded-3xl space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-3">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>article</span>
                <h4 className="font-bold text-xs uppercase tracking-widest text-[var(--theme-text)]">Deskripsi & Tujuan</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Latar Belakang</Label>
                  <Textarea value={formData.LatarBelakang} onChange={(e) => setFormData({ ...formData, LatarBelakang: e.target.value })} placeholder="Deskripsikan latar belakang pengajuan kegiatan..." className="min-h-[80px] rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] p-4 text-xs font-medium leading-relaxed font-headline" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Tujuan Kegiatan</Label>
                  <Textarea value={formData.TujuanKegiatan} onChange={(e) => setFormData({ ...formData, TujuanKegiatan: e.target.value })} placeholder="Deskripsikan tujuan dari kegiatan..." className="min-h-[80px] rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] p-4 text-xs font-medium leading-relaxed font-headline" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Deskripsi Detail Kegiatan</Label>
                  <Textarea value={formData.Deskripsi} onChange={(e) => setFormData({ ...formData, Deskripsi: e.target.value })} placeholder="Deskripsikan rincian detail/mekanisme kegiatan..." className="min-h-[80px] rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] p-4 text-xs font-medium leading-relaxed font-headline" />
                </div>
              </div>
            </div>

            {/* Bagian 5: Berkas Pendukung */}
            <div className="p-5 bg-[var(--theme-bg)]/30 border border-border rounded-3xl space-y-4">
              <div className="flex items-center gap-2 mb-2 border-b border-border pb-3">
                <span className="material-symbols-outlined text-[var(--theme-error)]" style={{ fontSize: '20px' }}>folder_open</span>
                <h4 className="font-bold text-xs uppercase tracking-widest text-[var(--theme-text)]">Berkas Pendukung</h4>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Catatan Tambahan Organisasi</Label>
                  <Textarea required value={formData.Catatan} onChange={(e) => setFormData({ ...formData, Catatan: e.target.value })} placeholder="Tambahkan catatan atau keterangan pelengkap..." className="min-h-[60px] rounded-2xl border-border bg-white focus:border-[var(--theme-primary)] p-4 text-xs font-medium leading-relaxed font-headline" />
                </div>

                <div className="space-y-2.5">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 font-headline uppercase">Upload Dokumen Proposal</Label>
                  <div className="border-2 border-dashed border-border hover:border-[var(--theme-primary)]/50 rounded-2xl p-6 text-center hover:bg-[var(--theme-bg)]/50 transition-all duration-150 relative group bg-white">
                    <input type="file" multiple accept=".pdf,.doc,.docx,.xls,.xlsx" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                    <div className="pointer-events-none flex flex-col items-center">
                      <div className="w-12 h-12 rounded-xl bg-[var(--theme-bg)] group-hover:bg-[var(--theme-primary-light)] text-[var(--theme-text-subtle)] group-hover:text-[var(--theme-primary)] flex items-center justify-center mb-3 transition-colors duration-150 border border-border/50">
                        <span className="material-symbols-outlined normal-case" style={{ fontSize: '24px' }}>upload_file</span>
                      </div>
                      <p className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-wider">Klik untuk Upload Dokumen</p>
                      <p className="text-[10px] text-[var(--theme-text-subtle)] font-semibold mt-1">Bisa pilih lebih dari 1 file (PDF, Word, Excel, Maks. 5MB per file)</p>
                    </div>
                  </div>

                  {dokumenList.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      <p className="text-[9px] font-black text-[var(--theme-success)] tracking-wider uppercase ml-1">File Baru Terpilih ({dokumenList.length})</p>
                      <div className="space-y-1.5">
                        {dokumenList.map((file, idx) => (
                          <div key={idx} className="px-3.5 py-2.5 bg-[var(--theme-success-light)] border border-[var(--theme-success)]/20 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <span className="material-symbols-outlined normal-case text-[var(--theme-success)] text-[16px] shrink-0">check_circle</span>
                              <span className="text-[11px] font-bold text-[var(--theme-success)] truncate">{file.name}</span>
                            </div>
                            <button type="button" onClick={() => handleRemoveNewFile(idx)} className="w-6 h-6 rounded-lg hover:bg-[var(--theme-success-light)]/80 text-[var(--theme-success)] flex items-center justify-center transition-colors shrink-0 z-20 relative">
                              <span className="material-symbols-outlined normal-case text-[14px]">close</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {existingFileList.length > 0 && (
                    <div className="space-y-1.5 mt-3">
                      <p className="text-[9px] font-black text-[var(--theme-primary)] tracking-wider uppercase ml-1">Dokumen Aktif Saat Ini ({existingFileList.length})</p>
                      <div className="space-y-1.5">
                        {existingFileList.map((file, idx) => {
                          const filename = file.split('/').pop() || `Berkas_${idx + 1}`
                          const cleanName = filename.substring(filename.indexOf('_') + 1)
                          return (
                            <div key={idx} className="px-3.5 py-2.5 bg-[var(--theme-primary-light)]/60 border border-[var(--theme-primary)]/20 rounded-2xl flex items-center justify-between gap-2 shadow-sm">
                              <a href={`${API_BASE_URL.replace('/api', '')}${file}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:underline truncate min-w-0 z-20 relative">
                                <span className="material-symbols-outlined normal-case text-[var(--theme-primary)] text-[16px] shrink-0">description</span>
                                <span className="text-[11px] font-bold text-[var(--theme-primary)] truncate">{cleanName}</span>
                              </a>
                              <button type="button" onClick={() => handleRemoveExistingFile(idx)} className="w-6 h-6 rounded-lg hover:bg-[var(--theme-primary-light)] text-[var(--theme-error)] flex items-center justify-center transition-colors shrink-0 z-20 relative">
                                <span className="material-symbols-outlined normal-case text-[14px]">delete</span>
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

          </div>
        </form>
      </DialogModal >

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Proposal?"
        description="Proposal dan seluruh riwayat persetujuannya akan dihapus permanen dari sistem."
        loading={isSubmitting}
      />
      {
        printData && createPortal(
          <div className="print-only-container">
            <style>{`
            @media screen {
              .print-only-container {
                display: none !important;
              }
            }
            @media print {
              #root {
                display: none !important;
              }
              .print-only-container {
                display: block !important;
                width: 297mm;
                height: 210mm;
                margin: 0;
                padding: 0;
                background-color: #ffffff;
              }
              @page {
                size: landscape;
                margin: 0;
              }
              body {
                background-color: #ffffff !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .page {
                width: 297mm;
                height: 210mm;
                position: relative;
                page-break-after: always;
                box-sizing: border-box;
                overflow: hidden;
                background-color: #ffffff;
              }
              .page:last-child {
                page-break-after: avoid;
              }
              .page-bg {
                position: absolute;
                top: 0;
                left: 0;
                width: 297mm;
                height: 210mm;
                z-index: 1;
                pointer-events: none;
              }
              .page-content {
                position: relative;
                z-index: 2;
                padding: 42mm 20mm 15mm 20mm;
                height: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: space-between;
              }
              .content-title {
                text-align: center;
                font-size: 14px;
                font-weight: 800;
                color: #0f172a;
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-top: 5px;
                margin-bottom: 15px;
              }
              .grid-container {
                display: flex;
                gap: 20px;
                margin-bottom: 15px;
              }
              .col-left, .col-right {
                flex: 1;
                display: flex;
                flex-direction: column;
                gap: 8px;
              }
              .info-card {
                background-color: #f8fafc;
                border: 1px solid #f1f5f9;
                border-radius: 8px;
                padding: 8px 12px;
              }
              .info-label {
                font-size: 8px;
                font-weight: 700;
                color: #94a3b8;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin: 0 0 2px 0;
              }
              .info-val {
                font-size: 11px;
                font-weight: 700;
                color: #334155;
                margin: 0;
              }
              .full-width-card {
                background-color: #f8fafc;
                border: 1px solid #f1f5f9;
                border-radius: 10px;
                padding: 10px 14px;
                margin-bottom: 10px;
                max-height: 85px;
                overflow: hidden;
              }
              .full-width-card .info-val {
                font-weight: 500;
                font-size: 10px;
                line-height: 1.4;
                color: #475569;
                display: -webkit-box;
                -webkit-line-clamp: 3;
                -webkit-box-orient: vertical;
                overflow: hidden;
              }
              .pengesahan-title {
                text-align: center;
                font-size: 13px;
                font-weight: 800;
                color: #0f172a;
                margin-top: 5px;
                margin-bottom: 15px;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              .summary-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
              }
              .summary-table td {
                padding: 5px 10px;
                font-size: 10px;
                border: 1px solid #e2e8f0;
              }
              .summary-table td.label-cell {
                background-color: #f8fafc;
                font-weight: bold;
                color: #64748b;
                width: 25%;
                text-transform: uppercase;
                font-size: 8px;
                letter-spacing: 0.5px;
              }
              .summary-table td.val-cell {
                font-weight: 600;
                color: #1e293b;
              }
              .signature-container {
                margin-top: 15px;
                font-size: 9px;
                color: #334155;
                line-height: 1.4;
              }
              .sig-block {
                text-align: center;
                width: 38%;
              }
              .sig-block-three {
                text-align: center;
                width: 30%;
              }
              .sig-space {
                height: 38px;
              }
              .sig-name {
                font-weight: 700;
                text-decoration: underline;
                margin: 0;
                font-size: 9.5px;
              }
              .sig-title {
                margin: 1px 0 0 0;
                color: #64748b;
                font-size: 8.5px;
                font-weight: 600;
              }
              .section-title {
                font-weight: 700;
                margin-bottom: 4px;
                text-transform: uppercase;
                font-size: 9px;
                color: #0f172a;
              }
            }
          `}</style>
            {(() => {
              const ormawa = printData?.Ormawa || {}
              const ormawaName = ormawa.Nama || ormawa.nama || 'Organisasi Kemahasiswaan'
              const ormawaAbbreviation = ormawa.Singkatan || ormawa.singkatan || ''
              const ormawaKategori = (ormawa.Kategori || ormawa.kategori || '').toUpperCase()

              let ormawaType = 'UKM'
              const upperName = ormawaName.toUpperCase()
              const upperAbbrev = ormawaAbbreviation.toUpperCase()

              if (ormawaKategori === 'UKM' || upperName.includes('UKM') || upperAbbrev.includes('UKM') || upperName.includes('UNIT KEGIATAN')) {
                ormawaType = 'UKM'
              } else if (ormawaKategori === 'HIMPUNAN' || upperName.includes('HIMPUNAN') || upperName.includes('HIMA') || upperAbbrev.includes('HIMA')) {
                ormawaType = 'HIMA'
              } else if (upperAbbrev.includes('DPM') || upperName.includes('DEWAN PERWAKILAN')) {
                if (upperName.includes('FAKULTAS') || upperName.includes('FARMASI') || upperName.includes('FIKES') || upperName.includes('KEPERAWATAN') || upperName.includes('SOSIAL')) {
                  ormawaType = 'DPM Fakultas'
                } else {
                  ormawaType = 'DPM Universitas'
                }
              } else if (upperAbbrev.includes('BEM') || upperName.includes('BADAN EKSEKUTIF')) {
                if (upperName.includes('FAKULTAS') || upperName.includes('FARMASI') || upperName.includes('FIKES') || upperName.includes('KEPERAWATAN') || upperName.includes('SOSIAL')) {
                  ormawaType = 'BEM Fakultas'
                } else {
                  ormawaType = 'BEM Universitas'
                }
              } else {
                if (ormawaKategori === 'BEM') ormawaType = 'BEM Universitas'
                else if (ormawaKategori === 'DPM') ormawaType = 'DPM Universitas'
                else if (ormawaKategori === 'HIMPUNAN') ormawaType = 'HIMA'
                else ormawaType = 'UKM'
              }

              const pjKegiatan = printData.PJKegiatan || printData.pj_kegiatan || '____________________'

              return (
                <>
                  {/* Page 1: Proposal Details */}
                  <div className="page">
                    <img src="/images/format_kop_rektorat_landscape.jpg" className="page-bg" />
                    <div className="page-content">
                      <div>
                        <div className="content-title" style={{ marginTop: '10px' }}>
                          PROPOSAL KEGIATAN {ormawaAbbreviation.toUpperCase()}
                        </div>

                        <div className="grid-container">
                          <div className="col-left">
                            <div className="info-card">
                              <p className="info-label">Nama Kegiatan</p>
                              <p className="info-val" style={{ fontSize: '11.5px', color: '#0f172a' }}>{printData.Judul || '—'}</p>
                            </div>
                            <div className="info-card">
                              <p className="info-label">Organisasi Penyelenggara</p>
                              <p className="info-val">{ormawaName} ({ormawaAbbreviation.toUpperCase()})</p>
                            </div>
                            <div className="info-card">
                              <p className="info-label">PJ Kegiatan / Kontak</p>
                              <p className="info-val">{printData.PJKegiatan || printData.pj_kegiatan || '—'}</p>
                            </div>
                            <div className="info-card">
                              <p className="info-label">Mitra Kerja / Sponsor</p>
                              <p className="info-val">{printData.Mitra || printData.mitra || '—'}</p>
                            </div>
                          </div>
                          <div className="col-right">
                            <div className="info-card">
                              <p className="info-label">Rencana Anggaran</p>
                              <p className="info-val" style={{ color: '#059669' }}>
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(printData.Anggaran || 0)}
                              </p>
                            </div>
                            <div className="info-card">
                              <p className="info-label">Sumber Dana</p>
                              <p className="info-val">{printData.SumberDana || printData.sumber_dana || '—'}</p>
                            </div>
                            <div className="info-card">
                              <p className="info-label">Waktu Pelaksanaan</p>
                              <p className="info-val">{printData.JadwalPelaksanaan || printData.jadwal_pelaksanaan || '—'}</p>
                            </div>
                            <div className="info-card">
                              <p className="info-label">Indikator Keberhasilan</p>
                              <p className="info-val">{printData.IndikatorKeberhasilan || printData.indikator_keberhasilan || '—'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="full-width-card">
                          <p class="info-label">Latar Belakang Kegiatan</p>
                          <div className="info-val">{printData.LatarBelakang || printData.latar_belakang || '—'}</div>
                        </div>
                        <div className="full-width-card">
                          <p class="info-label">Deskripsi & Bentuk Kegiatan</p>
                          <div className="info-val">{printData.Deskripsi || printData.deskripsi || '—'}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Page 2: Lembar Pengesahan */}
                  <div className="page">
                    <img src="/images/format_kop_rektorat_landscape.jpg" className="page-bg" />
                    <div className="page-content">
                      <div>
                        <div className="pengesahan-title" style={{ marginTop: '10px' }}>Lembar Pengesahan Dokumen Proposal</div>
                        <div style={{ textAlign: 'center', marginBottom: '15px', fontSize: '14px', fontWeight: 'bold' }}>Nomor: {nomorSuratProposal}</div>

                        <table className="summary-table">
                          <tbody>
                            <tr>
                              <td className="label-cell">Nama Kegiatan</td>
                              <td className="val-cell" colSpan={3}>{printData.Judul || '—'}</td>
                            </tr>
                            <tr>
                              <td className="label-cell">Organisasi</td>
                              <td className="val-cell">{ormawaName} ({ormawaAbbreviation.toUpperCase()})</td>
                              <td className="label-cell">Klasifikasi Ormawa</td>
                              <td className="val-cell">{ormawaType}</td>
                            </tr>
                            <tr>
                              <td className="label-cell">PJ Pelaksana</td>
                              <td className="val-cell">{printData.PJKegiatan || printData.pj_kegiatan || '—'}</td>
                              <td className="label-cell">Anggaran Diajukan</td>
                              <td className="val-cell" style={{ color: '#059669', fontWeight: 800 }}>
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(printData.Anggaran || 0)}
                              </td>
                            </tr>
                          </tbody>
                        </table>

                        {/* Signatures */}
                        {ormawaType === 'DPM Universitas' && (
                          <div className="signature-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                              <div className="sig-block">
                                <p>Ketua Pelaksana Kegiatan,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">{pjKegiatan}</p>
                                <p className="sig-title">Ketua Pelaksana</p>
                              </div>
                              <div className="sig-block">
                                <p>Ketua DPM UBK,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua DPM UBK</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui:</p>
                                <p>Ketua Divisi Pengembangan Prestasi, Beasiswa, Ormawa</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Kepala Divisi</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {ormawaType === 'BEM Universitas' && (
                          <div className="signature-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                              <div className="sig-block">
                                <p>Ketua Pelaksana Kegiatan,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">{pjKegiatan}</p>
                                <p className="sig-title">Ketua Pelaksana</p>
                              </div>
                              <div className="sig-block">
                                <p>Ketua BEM UBK,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua BEM UBK</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '20px' }}>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui*:</p>
                                <p>Ketua Divisi Pengembangan Prestasi, Beasiswa, Ormawa</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Kepala Divisi</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {ormawaType === 'UKM' && (
                          <div className="signature-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                              <div className="sig-block-three">
                                <p>Ketua Pelaksana Kegiatan,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">{pjKegiatan}</p>
                                <p className="sig-title">Ketua Pelaksana</p>
                              </div>
                              <div className="sig-block-three">
                                <p>Ketua UKM,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua {ormawaAbbreviation || 'UKM'}</p>
                              </div>
                              <div className="sig-block-three">
                                <p>Ketua BEM Universitas,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua BEM UBK</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui:</p>
                                <p>Pembina UKM,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Pembina</p>
                              </div>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui:</p>
                                <p>Ketua Divisi Pengembangan Prestasi, Beasiswa, Ormawa</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Kepala Divisi</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {ormawaType === 'DPM Fakultas' && (
                          <div className="signature-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                              <div className="sig-block">
                                <p>Ketua Pelaksana Kegiatan,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">{pjKegiatan}</p>
                                <p className="sig-title">Ketua Pelaksana</p>
                              </div>
                              <div className="sig-block">
                                <p>Ketua DPM,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua DPM</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui:</p>
                                <p>PJ Ormawa Fakultas,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">PJ Ormawa</p>
                              </div>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui:</p>
                                <p>Wakil Dekan 1 Bidang Akademik, Penelitian, Pengmas, dan Kemahasiswaan</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Wakil Dekan 1</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {ormawaType === 'BEM Fakultas' && (
                          <div className="signature-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
                              <div className="sig-block">
                                <p>Ketua Pelaksana Kegiatan,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">{pjKegiatan}</p>
                                <p className="sig-title">Ketua Pelaksana</p>
                              </div>
                              <div className="sig-block">
                                <p>Ketua BEM,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua BEM</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px' }}>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui*:</p>
                                <p>PJ Ormawa Fakultas,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">PJ Ormawa</p>
                              </div>
                              <div className="sig-block">
                                <p className="section-title">Menyetujui*:</p>
                                <p>Wakil Dekan 1 Bidang Akademik, Penelitian, Pengmas, dan Kemahasiswaan</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Wakil Dekan 1</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {ormawaType === 'HIMA' && (
                          <div className="signature-container">
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px' }}>
                              <div className="sig-block-three">
                                <p>Ketua Pelaksana Kegiatan,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">{pjKegiatan}</p>
                                <p className="sig-title">Ketua Pelaksana</p>
                              </div>
                              <div className="sig-block-three">
                                <p>Ketua HIMA,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua HIMA</p>
                              </div>
                              <div className="sig-block-three">
                                <p>Ketua BEM Fakultas,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua BEM Fakultas</p>
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
                              <div className="sig-block-three">
                                <p className="section-title">Menyetujui:</p>
                                <p>Ketua Program Studi,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Ketua Prodi</p>
                              </div>
                              <div className="sig-block-three">
                                <p className="section-title">Menyetujui:</p>
                                <p>PJ Ormawa Fakultas,</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">PJ Ormawa</p>
                              </div>
                              <div className="sig-block-three">
                                <p className="section-title">Menyetujui:</p>
                                <p>Wakil Dekan 1 Bidang Akademik, Penelitian, Pengmas, dan Kemahasiswaan</p>
                                <div className="sig-space"></div>
                                <p className="sig-name">____________________</p>
                                <p className="sig-title">Wakil Dekan 1</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )
            })()}
          </div>,
          document.body
        )
      }    </PageContent >
  )
}
