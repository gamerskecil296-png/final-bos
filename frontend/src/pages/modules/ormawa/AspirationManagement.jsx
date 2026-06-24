"use client"
import React, { useState, useEffect } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';

import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { Card, CardContent } from '@/components/ui/Card'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'


import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const QuestionAnswerIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>question_answer</span>;
const MarkChatReadIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>mark_chat_read</span>;
const QuickreplyIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>quickreply</span>;
const CancelIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>cancel</span>;

export default function AspirationManagement() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [tanggapan, setTanggapan] = useState('')
  const { withPermissionCheck, hasPermission } = usePermission()
  const canRespond = hasPermission('ormawa.aspirations.update')

  const ormawaId = getOrmawaId()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API}/aspirations?ormawaId=${ormawaId}`)
      if (res.status === 'success') {
        const normalizedData = (res.data || []).map(a => {
          const createdAt = a.created_at || a.CreatedAt || new Date();
          const year = new Date(createdAt).getFullYear();
          return {
            ...a,
            ID: a.id || a.ID,
            Judul: a.judul || a.Judul || '—',
            Isi: a.isi || a.Isi || '—',
            Status: (a.status || a.Status || 'pending').toLowerCase(),
            Tanggapan: a.tanggapan || a.Tanggapan || '',
            CreatedAt: createdAt,
            OrmawaNama: a.ormawa?.nama || a.Ormawa?.Nama || 'Organisasi Mahasiswa',
            PeriodeFilter: String(year)
          };
        });
        setData(normalizedData)
      } else {
        toast.error('Gagal memuat aspirasi')
      }
    } catch (err) {
      toast.error('Koneksi ke database backend gagal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [ormawaId])

  const periodeOptions = React.useMemo(() => {
    const periods = new Set()
    data.forEach(a => {
      if (a.PeriodeFilter) {
        periods.add(a.PeriodeFilter)
      }
    })
    return Array.from(periods).sort((a, b) => Number(b) - Number(a)).map(p => ({
      label: `Tahun ${p}`, value: p
    }))
  }, [data])

  const handleTanggapi = async () => {
    if (!tanggapan.trim()) {
      toast.error('Isi tanggapan terlebih dahulu')
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API}/aspirations/${selected?.id || selected?.ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Tanggapan: tanggapan, Status: 'ditanggapi' })
      })
      if (res.status === 'success') {
        toast.success('Tanggapan resmi berhasil dikirim!')
        setIsDetailOpen(false)
        setTanggapan('')
        fetchData()
      } else {
        toast.error(res.message || 'Gagal mengirim tanggapan')
      }
    } catch (err) {
      toast.error('Koneksi ke backend gagal')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'Judul',
      label: 'Topik Aspirasi',
      className: 'min-w-[280px]',
      render: (v, row) => (
        <div className="flex items-center gap-3 py-1">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100/50">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>forum</span>
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-slate-900 text-[13px] font-headline tracking-tighter truncate">{v || '—'}</span>
            <span className="text-[10px] text-slate-500 font-bold tracking-tight mt-0.5 truncate flex items-center gap-1">
              <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>group</span>
              {row.OrmawaNama || 'Organisasi Mahasiswa'}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'Status',
      label: 'Status',
      className: 'w-[150px] text-center',
      cellClassName: 'text-center',
      render: v => {
        const isDitanggapi = v === 'ditanggapi'
        return (
          <Badge className={cn(
            'inline-flex items-center justify-center gap-1 font-bold text-[10px] uppercase tracking-wider px-3 py-1 border rounded-full',
            isDitanggapi
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-amber-50 text-amber-700 border-amber-200'
          )}>
            <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>
              {isDitanggapi ? 'mark_chat_read' : 'quickreply'}
            </span>
            {isDitanggapi ? 'Ditanggapi' : 'Menunggu'}
          </Badge>
        )
      }
    },
    {
      key: 'CreatedAt',
      label: 'Tanggal Dikirim',
      className: 'w-[160px]',
      render: v => (
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Masuk Pada</span>
          <span className="font-bold text-slate-700 text-[12px] font-headline">
            {v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        </div>
      )
    }
  ]

  // Calculated Stats
  const totalAspirasi = data.length
  const answeredAspirasi = data.filter(x => x.Status === 'ditanggapi').length
  const pendingAspirasi = data.filter(x => x.Status === 'pending' || !x.Status).length
  const rejectedAspirasi = data.filter(x => x.Status === 'ditolak').length

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

      <div className="w-full relative space-y-6 scroll-smooth">
        {/* ── Welcome Banner ─────────────────────────────────────────── */}
        <DashboardHero
          title="Manajemen"
          highlightedTitle="Aspirasi"
          subtitle="Tampung gagasan, kritik, dan berikan tanggapan resmi atas aspirasi dari mahasiswa secara transparan."
          icon="forum"
          badges={[{ label: 'Suara Mahasiswa', active: false }]}
          actions={
            <div className="px-4 py-2 bg-[var(--theme-primary)]/5 border border-[var(--theme-primary)]/20 rounded-xl flex items-center gap-3 w-full lg:w-auto justify-center">
              <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }}>group</span>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold text-[var(--theme-primary)]/70 uppercase tracking-widest">Akses Validasi</span>
                <span className="text-[12px] font-bold text-[var(--theme-primary)] font-jakarta">Ormawa Portal</span>
              </div>
            </div>
          }
        />

        {/* ── Statistics Summary Cards ────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          <PrimaryStatsCard
            title="Total Aspirasi Masuk"
            value={totalAspirasi}
            icon={QuestionAnswerIcon}
            colorTheme="primary"
            badgeText="Semua"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">forum</span>}
          />

          <PrimaryStatsCard
            title="Sudah Ditanggapi"
            value={answeredAspirasi}
            icon={MarkChatReadIcon}
            colorTheme="success"
            badgeText="Selesai"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
          />

          <PrimaryStatsCard
            title="Menunggu Tanggapan"
            value={pendingAspirasi}
            icon={QuickreplyIcon}
            colorTheme="warning"
            badgeText="Pending"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">schedule</span>}
          />

          <PrimaryStatsCard
            title="Aspirasi Ditolak"
            value={rejectedAspirasi}
            icon={CancelIcon}
            colorTheme="error"
            badgeText="Ditolak"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">cancel</span>}
          />
        </div>

        <div className="space-y-5 w-full">
          <DataTable
            title="Daftar Aspirasi"
            subtitle="Menampilkan aspirasi dari mahasiswa yang ditujukan untuk organisasi Anda."
            columns={columns}
            data={data}
            loading={loading}
            searchPlaceholder="Cari topik atau konten aspirasi..."
            filters={[
              {
                key: 'PeriodeFilter',
                placeholder: 'Periode Akademik',
                options: periodeOptions
              },
              {
                key: 'Status',
                placeholder: 'Filter Status',
                options: [
                  { label: 'Menunggu', value: 'pending' },
                  { label: 'Ditanggapi', value: 'ditanggapi' }
                ]
              }
            ]}
            actions={(row) => (
              <Button
                onClick={() => { setSelected(row); setTanggapan(''); setIsDetailOpen(true) }}
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-[var(--theme-text-subtle)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-xl active:scale-95 transition-all"
                title="Lihat Detail & Tanggapi"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
              </Button>
            )}
          />
        </div>
      </div>

      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selected?.Judul || "Detail Aspirasi"}
        subtitle={`ASP-${selected?.id || selected?.ID || ''}`}
        description="Rincian informasi aspirasi yang masuk dari mahasiswa."
        icon="chat"
        maxWidth="max-w-2xl"
        bodyClassName="p-0"
        footer={
          <ModalCancelButton onClick={() => setIsDetailOpen(false)}>
            TUTUP DIALOG
          </ModalCancelButton>
        }
      >
        {selected && (
          <div className="flex flex-col">
            {/* Dialog Content Grid */}
            <div className="p-6 sm:p-8 space-y-5 max-h-[60vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between gap-4 mb-2">
                <Badge className={cn(
                  'font-bold text-[10px] uppercase tracking-wider px-3.5 py-1 border shrink-0 rounded-full',
                  selected.Status === 'ditanggapi'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                )}>
                  {selected.Status === 'ditanggapi' ? 'Ditanggapi' : 'Menunggu'}
                </Badge>
              </div>

              {/* Content Box */}
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 uppercase font-headline">Konten & Uraian Aspirasi</Label>
                <div className="text-sm font-medium text-[var(--theme-text)] leading-relaxed bg-[var(--theme-surface)] p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                  {selected.Isi || selected.Konten || '—'}
                </div>
              </div>

              {selected.Tanggapan ? (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <Label className="text-[10px] font-black text-emerald-600 tracking-[0.2em] ml-1 uppercase font-headline flex items-center gap-1.5">
                    <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>check_circle</span>
                    Tanggapan Resmi Pengurus
                  </Label>
                  <div className="text-sm font-medium text-[var(--theme-text)] leading-relaxed bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
                    {selected.Tanggapan}
                  </div>
                </div>
              ) : canRespond ? (
                <div className="space-y-3.5 pt-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 uppercase font-headline">Berikan Balasan / Tanggapan Resmi</Label>
                  <Textarea
                    rows={3}
                    value={tanggapan}
                    onChange={e => setTanggapan(e.target.value)}
                    placeholder="Ketik tanggapan atau resolusi resmi dari pengurus organisasi..."
                  />

                  <ModalSaveButton
                    label="KIRIM TANGGAPAN RESMI"
                    icon="send"
                    disabled={isSubmitting}
                    loading={isSubmitting}
                    onClick={handleTanggapi}
                    className="w-full"
                  />
                </div>
              ) : (
                <div className="space-y-2 pt-2">
                  <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 uppercase font-headline">Status Tanggapan</Label>
                  <div className="text-sm font-medium text-amber-700 bg-amber-50 p-4 rounded-xl border border-amber-100/50">
                    Belum ditanggapi. Anda tidak memiliki izin untuk memberikan tanggapan resmi.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </DialogModal>
    </PageContent>
  )
}
