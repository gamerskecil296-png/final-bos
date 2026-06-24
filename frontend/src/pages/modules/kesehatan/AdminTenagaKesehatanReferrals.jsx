"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogModal } from '@/components/ui/DialogModal'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService, API_BASE_URL, fetchBlobWithAuth } from '@/services/api'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

const getCleanImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const baseUrl = API_BASE_URL.replace('/api', '')
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

const APPROVAL_META = {
  menunggu_approval: { 
    label: 'Menunggu Persetujuan', 
    cls: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/20',
    icon: 'hourglass_empty'
  },
  disetujui: { 
    label: 'Disetujui Admin', 
    cls: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20',
    icon: 'check_circle'
  },
  ditolak: { 
    label: 'Ditolak Admin', 
    cls: 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20',
    icon: 'cancel'
  },
}

const getInitials = (name = '') => {
  return name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export default function TenagaKesehatanReferrals() {
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  
  // Approval modal state
  const [approvalModal, setApprovalModal] = useState({ open: false, item: null, action: null })
  const [approvalNote, setApprovalNote] = useState('')
  const [approving, setApproving] = useState(false)
  const [comingFromDetail, setComingFromDetail] = useState(false)
  const [exportingId, setExportingId] = useState(null)

  const handleExportPDF = async (id, patientName) => {
    setExportingId(id)
    try {
      const blob = await fetchBlobWithAuth(`${API_BASE_URL}/super-admin/health/rujukan/${id}/export-pdf`)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Surat_Rujukan_Medis_${(patientName || 'Pasien').replace(/\s+/g, '_')}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      a.remove()
      toast.success('Surat rujukan berhasil diunduh')
    } catch (err) {
      console.error(err)
      toast.error('Gagal mengunduh surat rujukan')
    } finally {
      setExportingId(null)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const rfRes = await adminService.getTenagaKesehatanReferrals()
      if (rfRes.status === 'success') {
        const flattened = (rfRes.data || []).map(item => {
          const mhs = item.mahasiswa || item.Mahasiswa
          return {
            ...item,
            _fakultas: mhs?.fakultas?.Nama || mhs?.Fakultas?.Nama || mhs?.fakultas?.nama || mhs?.Fakultas?.nama || '',
            _semester: mhs?.SemesterSekarang || mhs?.semester_sekarang || ''
          }
        })
        setReferrals(flattened)
      } else {
        toast.error('Gagal memuat data rujukan')
      }
    } catch (err) {
      console.error(err)
      toast.error('Koneksi sistem terputus / Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleOpenApproval = (item, action, fromDetail = false) => {
    if (fromDetail) {
      setComingFromDetail(true)
      setIsDetailOpen(false)
    } else {
      setComingFromDetail(false)
    }
    setApprovalModal({ open: true, item, action })
    setApprovalNote('')
  }

  const handleApprove = async () => {
    const { item, action } = approvalModal
    if (!item) return
    setApproving(true)
    try {
      const res = await adminService.approveTenagaKesehatanReferral(item.id, action, approvalNote)
      if (res.status === 'success') {
        toast.success(action === 'approve' ? 'Referral berhasil disetujui' : 'Referral berhasil ditolak')
        setApprovalModal({ open: false, item: null, action: null })
        setComingFromDetail(false)
        setIsDetailOpen(false)
        setDetailItem(null)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal memproses tindakan')
      }
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan')
    } finally {
      setApproving(false)
    }
  }

  const fakultasOptions = useMemo(() => {
    const unique = [...new Set(referrals.map(i => i._fakultas).filter(Boolean))].sort()
    return unique.map(f => ({ label: f.toUpperCase(), value: f }))
  }, [referrals])

  const referralColumns = [
    {
      key: 'mahasiswa',
      label: 'Mahasiswa',
      render: (v, row) => {
        const mhs = row.mahasiswa || row.Mahasiswa
        return (
          <div className="flex items-center gap-3 py-1 font-body">
            <div className="w-9 h-9 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center font-bold text-xs shrink-0 shadow-sm border border-[var(--theme-primary)]/20">
              {getInitials(mhs?.Nama || mhs?.nama)}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-[var(--theme-text)] text-xs truncate">{mhs?.Nama || mhs?.nama || '—'}</span>
              <span className="text-[10px] text-[var(--theme-text-muted)] font-semibold">{mhs?.NIM || mhs?.nim || '—'}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                {row._fakultas && (
                  <span className="text-[8px] text-[var(--theme-primary)] font-semibold bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/10 px-1 py-0.2 rounded uppercase tracking-wider">
                    {row._fakultas}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'faskes_tujuan',
      label: 'Faskes Tujuan',
      render: (v, row) => (
        <div className="flex flex-col py-1 font-body">
          <span className="font-bold text-[var(--theme-text)] text-xs">{row.faskes_tujuan || '—'}</span>
          <span className="text-[9px] text-[var(--theme-text-muted)] font-semibold uppercase tracking-widest">{row.alasan_rujukan || '—'}</span>
        </div>
      )
    },
    {
      key: 'diagnosis',
      label: 'Diagnosis',
      render: (v, row) => (
        <div className="flex flex-col py-1 font-body">
          <span className="text-[10px] text-[var(--theme-text)] font-semibold leading-tight">{row.diagnosis || '—'}</span>
          <span className="text-[9px] text-[var(--theme-text-muted)] font-medium truncate">{row.keluhan_utama || '—'}</span>
        </div>
      )
    },
    {
      key: 'approval_status',
      label: 'Persetujuan',
      render: (v) => {
        const meta = APPROVAL_META[v] || APPROVAL_META.menunggu_approval
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border font-body shadow-none', meta.cls)}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>{meta.icon}</span>
            {meta.label}
          </span>
        )
      }
    },
    {
      key: 'status',
      label: 'Status',
      render: (v) => {
        const statusLower = String(v || '').toLowerCase()
        let cls = 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'
        if (statusLower === 'selesai') {
          cls = 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20'
        } else if (statusLower === 'ditolak') {
          cls = 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20'
        }
        return (
          <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-wider border font-body shadow-none', cls)}>
            {v || 'Menunggu'}
          </span>
        )
      }
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Tindak Lanjut &"
        highlightedTitle="Rujukan Medis"
        subtitle="Log surat rujukan klinis yang dikeluarkan oleh tenaga kesehatan ke Fasilitas Kesehatan Tingkat Lanjut. Tinjau dan berikan persetujuan."
        icon="medical_services"
        badges={[
          { label: 'Layanan Kesehatan Kampus', active: false },
          { label: `${referrals.filter(r => r.approval_status === 'menunggu_approval' || r.approval_status === 'pending').length} Perlu Persetujuan`, active: true }
        ]}
      />

      {/* ── Table Section ────────────────────────────────────────── */}
      <div className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden mb-6">
        <div className="p-0 animate-in fade-in duration-300">
          <DataTable
          columns={referralColumns}
          data={referrals}
          loading={loading}
          searchable
          searchPlaceholder="Cari nama mahasiswa, faskes tujuan, atau diagnosis..."
          onSearch={(data, q) => {
            if (!q) return data
            const lower = q.toLowerCase()
            return data.filter(item => {
              const mhs = item.mahasiswa || item.Mahasiswa
              return (
                (mhs?.Nama || mhs?.nama || '').toLowerCase().includes(lower) ||
                (item.faskes_tujuan || '').toLowerCase().includes(lower) ||
                (item.diagnosis || '').toLowerCase().includes(lower) ||
                (item.keluhan_utama || '').toLowerCase().includes(lower)
              )
            })
          }}
          filters={[
            { key: 'approval_status', placeholder: 'Status Approval', options: [
              { label: 'Menunggu', value: 'pending' },
              { label: 'Disetujui', value: 'disetujui' },
              { label: 'Ditolak', value: 'ditolak' },
            ]}
          ]}
          actions={(row) => (
            <div className="flex items-center gap-1.5 font-body">
              <Button
                onClick={() => { setDetailItem(row); setIsDetailOpen(true) }}
                variant="ghost" size="icon"
                className="h-8 w-8 text-[var(--theme-text-subtle)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors"
                title="Lihat Detail Rujukan"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
              </Button>
              {(row.approval_status === 'menunggu_approval' || row.approval_status === 'pending') && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleOpenApproval(row, 'approve')}
                    className="h-8 px-3 rounded-lg bg-[var(--theme-success-light)] hover:bg-[var(--theme-success)]/20 border border-[var(--theme-success)]/10 text-[var(--theme-success)] text-xs font-semibold transition-all flex items-center gap-1 shadow-none active:scale-95 cursor-pointer"
                    title="Setujui Rujukan"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                    Setujui
                  </button>
                  <button
                    onClick={() => handleOpenApproval(row, 'reject')}
                    className="h-8 px-3 rounded-lg bg-[var(--theme-error-light)] hover:bg-[var(--theme-error)]/20 border border-[var(--theme-error)]/10 text-[var(--theme-error)] text-xs font-semibold transition-all flex items-center gap-1 shadow-none active:scale-95 cursor-pointer"
                    title="Tolak Rujukan"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>cancel</span>
                    Tolak
                  </button>
                </div>
              )}
            </div>
          )}
        />
        </div>
      </div>

      {/* ── Approval Confirmation Modal ───────────────────────── */}
      <DialogModal
        open={approvalModal.open}
        onOpenChange={(o) => {
          if (!o) {
            setApprovalModal({ open: false, item: null, action: null })
            if (comingFromDetail) {
              setIsDetailOpen(true)
              setComingFromDetail(false)
            }
          }
        }}
        title={approvalModal.action === 'approve' ? 'Setujui Surat Rujukan Medis?' : 'Tolak Surat Rujukan Medis?'}
        description={approvalModal.item ? (() => {
          const mhs = approvalModal.item.mahasiswa || approvalModal.item.Mahasiswa
          return `Pasien: ${mhs?.Nama || mhs?.nama || '—'} (Rujukan ke ${approvalModal.item.faskes_tujuan})`
        })() : ''}
        icon={approvalModal.action === 'approve' ? 'check_circle' : 'cancel'}
        iconBg={approvalModal.action === 'approve' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)]' : 'bg-[var(--theme-error-light)] text-[var(--theme-error)]'}
        maxWidth="max-w-lg"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setApprovalModal({ open: false, item: null, action: null })
                if (comingFromDetail) {
                  setIsDetailOpen(true)
                  setComingFromDetail(false)
                }
              }}
              className="h-10 px-4 rounded-xl border border-[var(--theme-border)] text-sm font-medium text-[var(--theme-text)] hover:bg-[var(--theme-bg)]"
              disabled={approving}
            >
              Batal
            </Button>
            <button
              onClick={handleApprove}
              disabled={approving || (approvalModal.action === 'reject' && !approvalNote.trim())}
              className={cn(
                'h-10 px-5 rounded-xl text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm active:scale-98 cursor-pointer',
                approvalModal.action === 'approve'
                  ? 'bg-[var(--theme-success)] hover:bg-[var(--theme-success-hover)]'
                  : 'bg-[var(--theme-error)] hover:bg-[var(--theme-error-hover)]'
              )}
            >
              {approving && <span className="material-symbols-outlined animate-spin" style={{ fontSize: '14px' }}>sync</span>}
              {approvalModal.action === 'approve' ? 'Ya, Setujui' : 'Ya, Tolak'}
            </button>
          </>
        }
      >
        <div className="space-y-4 font-body">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block">
              {approvalModal.action === 'approve' ? 'Catatan Tambahan (Opsional)' : 'Alasan Penolakan (Wajib)'}
            </label>
            <textarea
              value={approvalNote}
              onChange={e => setApprovalNote(e.target.value)}
              rows={3}
              placeholder={approvalModal.action === 'approve'
                ? 'Tambahkan pesan opsional...'
                : 'Sebutkan alasan penolakan rujukan agar dapat diperbaiki...'}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm text-[var(--theme-text)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors resize-none leading-relaxed"
            />
          </div>
        </div>
      </DialogModal>

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Detail Rujukan Medis"
        description="Tinjauan rujukan medis klinis eksternal untuk mahasiswa."
        icon="medical_services"
        iconBg="bg-[var(--theme-primary-light)] text-[var(--theme-primary)]"
        maxWidth="max-w-xl"
      >
        <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar font-jakarta">
          {detailItem && (() => {
            const mhs = detailItem.mahasiswa || detailItem.Mahasiswa
            let appStatus = detailItem.approval_status
            if (appStatus === 'pending') appStatus = 'menunggu_approval'
            const approvalMeta = APPROVAL_META[appStatus] || APPROVAL_META.menunggu_approval
            
            return (
              <div className="space-y-6">
                {/* Identity Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Patient Card */}
                  <div className="bg-[var(--theme-bg)]/40 p-4 rounded-2xl border border-[var(--theme-border)] shadow-sm flex items-start gap-4 hover:border-[var(--theme-primary)]/20 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)] border border-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      {getInitials(mhs?.Nama || mhs?.nama)}
                    </div>
                    <div className="min-w-0">
                      <span className="text-[9px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-widest block mb-0.5">Mahasiswa / Pasien</span>
                      <p className="text-xs font-bold text-[var(--theme-text)] truncate leading-tight">{mhs?.Nama || mhs?.nama || '—'}</p>
                      <p className="text-[10px] text-[var(--theme-text-muted)] font-semibold mt-0.5">{mhs?.NIM || mhs?.nim || '—'}</p>
                      <p className="text-[9px] text-[var(--theme-primary)] font-bold uppercase tracking-widest mt-1">
                        {mhs?.program_studi?.nama || mhs?.ProgramStudi?.Nama || mhs?.program_studi?.Nama || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Vitals Card */}
                  <div className="bg-[var(--theme-bg)]/40 p-4 rounded-2xl border border-[var(--theme-border)] shadow-sm flex items-start gap-4 hover:border-[var(--theme-primary)]/20 transition-colors">
                    <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-subtle)] flex items-center justify-center text-xs font-bold shrink-0 shadow-sm">
                      <span className="material-symbols-outlined">vital_signs</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-widest block mb-1">Vital Signs</span>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                        <div className="text-[10px]"><span className="text-[var(--theme-text-muted)]">BP:</span> {detailItem.sistole}/{detailItem.diastole} mmHg</div>
                        <div className="text-[10px]"><span className="text-[var(--theme-text-muted)]">HR:</span> {detailItem.denyut_nadi} bpm</div>
                        <div className="text-[10px]"><span className="text-[var(--theme-text-muted)]">Temp:</span> {detailItem.suhu_tubuh}°C</div>
                        <div className="text-[10px]"><span className="text-[var(--theme-text-muted)]">SpO2:</span> {detailItem.spo2}%</div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Details Section */}
                <div className="p-4 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface-muted)]/30 space-y-4">
                  <h4 className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Metadata Rujukan</h4>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                    <div>
                      <span className="text-[10px] text-[var(--theme-text-subtle)] font-semibold block mb-0.5">Tipe Rujukan</span>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-semibold uppercase tracking-wider bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary)]/10">
                        Medis (TK)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--theme-text-subtle)] font-semibold block mb-0.5">Persetujuan Admin</span>
                      <span className={cn('inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-semibold uppercase tracking-widest border shadow-none', approvalMeta.cls)}>
                        <span className="material-symbols-outlined shrink-0" style={{ fontSize: '10px' }}>{approvalMeta.icon}</span>
                        {approvalMeta.label}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--theme-text-subtle)] font-semibold block mb-0.5">Tanggal Dibuat</span>
                      <span className="text-xs font-semibold text-[var(--theme-text)]">
                        {detailItem.created_at ? new Date(detailItem.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                      </span>
                    </div>
                    <div className="col-span-2 sm:col-span-3">
                      <span className="text-[10px] text-[var(--theme-text-subtle)] font-semibold block mb-0.5">Instansi/Faskes Tujuan</span>
                      <span className="text-xs font-semibold text-[var(--theme-text)]">{detailItem.faskes_tujuan || '—'}</span>
                    </div>
                  </div>
                </div>

                {/* Rejection / Note Area */}
                {detailItem.approval_note && (
                  <div className="p-4 rounded-xl bg-[var(--theme-error-light)] border border-[var(--theme-error)]/10 flex gap-3 items-start animate-pulse">
                    <span className="material-symbols-outlined text-[var(--theme-error)] shrink-0 mt-0.5" style={{ fontSize: '16px' }}>error</span>
                    <div>
                      <span className="text-[9px] font-bold text-[var(--theme-error)] uppercase tracking-widest block">Catatan Penolakan Admin</span>
                      <p className="text-xs font-semibold text-[var(--theme-error)] mt-1 leading-relaxed">{detailItem.approval_note}</p>
                    </div>
                  </div>
                )}

                {/* Alasan Kondisi Klinis */}
                <div className="space-y-1.5">
                  <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 block">Diagnosis & Keluhan Utama</span>
                  <div className="relative p-5 rounded-2xl bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] text-xs font-medium text-[var(--theme-text)] whitespace-pre-wrap leading-relaxed shadow-inner">
                    <div className="font-bold mb-2">Diagnosis: {detailItem.diagnosis}</div>
                    <div className="text-[11px] text-[var(--theme-text-muted)]">Alasan Rujukan: {detailItem.alasan_rujukan}</div>
                    <div className="mt-3 border-t border-[var(--theme-border)] pt-2">
                      <span className="font-semibold text-[var(--theme-text)]">Keluhan Utama:</span><br/>
                      {detailItem.keluhan_utama || '—'}
                    </div>
                  </div>
                </div>

                {/* Documents Download Cards */}
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-3.5 rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)]/50 shadow-sm flex items-center justify-between hover:border-[var(--theme-primary)]/30 transition-all group">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-[var(--theme-error-light)] border border-[var(--theme-error)]/10 text-[var(--theme-error)] flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[var(--theme-text)] truncate">Surat Rujukan Medis PDF</p>
                        <p className="text-[9px] text-[var(--theme-text-subtle)] font-bold uppercase tracking-widest mt-0.5">Dokumen Rujukan ke Faskes Lanjutan</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleExportPDF(detailItem.id, detailItem.mahasiswa?.Nama || detailItem.Mahasiswa?.nama || detailItem.mahasiswa?.nama)} 
                      disabled={exportingId === detailItem.id}
                      className="h-8 px-3 rounded-lg bg-[var(--theme-surface)] hover:bg-[var(--theme-primary)] hover:text-white border border-[var(--theme-border)] hover:border-[var(--theme-primary)] text-[var(--theme-text-muted)] text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {exportingId === detailItem.id ? (
                        <span className="material-symbols-outlined animate-spin text-[12px]">sync</span>
                      ) : (
                        <>
                          Lihat / Unduh
                          <span className="material-symbols-outlined text-[12px]">download</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
                
                {/* Action row in detail if status is waiting */}
                {(detailItem.approval_status === 'menunggu_approval' || detailItem.approval_status === 'pending') && (
                  <div className="pt-4 border-t border-[var(--theme-border-muted)] flex items-center justify-end gap-3">
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mr-auto">Tindakan Admin</span>
                    <button
                      onClick={() => handleOpenApproval(detailItem, 'reject', true)}
                      className="h-9 px-3 rounded-xl bg-[var(--theme-error-light)] border border-[var(--theme-error)]/20 hover:bg-[var(--theme-error)]/10 text-[var(--theme-error)] text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-none active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">cancel</span>
                      Tolak
                    </button>
                    <button
                      onClick={() => handleOpenApproval(detailItem, 'approve', true)}
                      className="h-9 px-4 rounded-xl bg-[var(--theme-success)] hover:bg-[var(--theme-success-hover)] text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm active:scale-95 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Setujui
                    </button>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        <div className="flex justify-end pt-4 mt-6 border-t border-[var(--theme-border-muted)]">
          <Button 
            onClick={() => setIsDetailOpen(false)} 
            className="h-10 px-6 rounded-xl font-semibold bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white border-none shadow-sm active:scale-98 transition-all cursor-pointer text-sm"
          >
            Tutup Rincian
          </Button>
        </div>
      </DialogModal>
    </PageContent>
  )
}

