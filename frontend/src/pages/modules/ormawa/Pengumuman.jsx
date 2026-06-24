"use client"
import React, { useState, useEffect } from 'react';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';

import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const KATEGORI_CFG = {
  umum: { label: 'Umum', cls: 'bg-slate-50 text-slate-600 border-border' },
  kegiatan: { label: 'Kegiatan', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  penting: { label: 'Penting', cls: 'bg-rose-50 text-rose-700 border-rose-200' },
  prestasi: { label: 'Prestasi', cls: 'bg-amber-50 text-amber-700 border-amber-200' }
}

export default function Pengumuman() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { hasPermission } = usePermission()

  const ormawaId = getOrmawaId()

  const [form, setForm] = useState({ Judul: '', Isi: '', Kategori: 'umum', OrmawaID: ormawaId, TanggalMulai: '' })

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API}/announcements?ormawaId=${ormawaId}`)
      if (res.status === 'success') {
        setData(res.data || [])
      } else {
        toast.error('Gagal memuat daftar pengumuman')
      }
    } catch (err) {
      toast.error('Koneksi database backend gagal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [ormawaId])

  const handleOpenAdd = () => {
    setIsEditMode(false)
    setForm({ Judul: '', Isi: '', Kategori: 'umum', OrmawaID: ormawaId, TanggalMulai: '' })
    setIsCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({
      ID: row.id || row.ID,
      Judul: row.Judul || row.judul || '',
      Isi: row.Isi || row.isi || '',
      Kategori: row.Kategori || row.kategori || row.Target || 'umum',
      OrmawaID: ormawaId,
      TanggalMulai: row.TanggalMulai ? String(row.TanggalMulai).substring(0, 10) : ''
    })
    setIsCrudOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const url = isEditMode ? `${API}/announcements/${form.ID || form.id}` : `${API}/announcements`
    const method = isEditMode ? 'PUT' : 'POST'
    try {
      const res = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          ...form,
          Target: form.Kategori,
          OrmawaID: Number(form.OrmawaID),
          TanggalMulai: form.TanggalMulai ? new Date(form.TanggalMulai).toISOString() : undefined
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.status === 'success') {
        toast.success(isEditMode ? 'Pengumuman diperbarui!' : 'Pengumuman baru berhasil diterbitkan!')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menyimpan pengumuman')
      }
    } catch (err) {
      console.error(err); toast.error(err.message || 'Terjadi kesalahan koneksi backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API}/announcements/${selected?.id || selected?.ID}`, {
        method: 'DELETE'
      })
      if (res.status === 'success') {
        toast.success('Pengumuman berhasil dihapus')
        setIsDelOpen(false)
        fetchData()
      } else {
        toast.error('Gagal menghapus pengumuman')
      }
    } catch (err) {
      console.error(err); toast.error(err.message || 'Terjadi kesalahan koneksi backend')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'Judul',
      label: 'Judul Pengumuman',
      className: 'min-w-[300px]',
      render: (v, row) => <span className="font-bold text-slate-900 text-[13px] font-headline tracking-tighter">{row.Judul || row.judul || v || '—'}</span>
    },
    {
      key: 'Kategori',
      label: 'Kategori',
      className: 'w-[140px] text-center',
      cellClassName: 'text-center',
      render: (v, row) => {
        const cat = row.Kategori || row.kategori || row.Target || 'umum'
        const cfg = KATEGORI_CFG[cat] || { label: cat || 'Umum', cls: 'bg-slate-50 text-slate-600 border-border' }
        return (
          <Badge className={cn('font-bold text-[10px] uppercase tracking-wider px-3.5 py-1 border rounded-full', cfg.cls)}>
            {cfg.label}
          </Badge>
        )
      }
    },
    {
      key: 'CreatedAt',
      label: 'Diterbitkan',
      className: 'w-[180px]',
      render: (v, row) => {
        const dateVal = row.created_at || row.CreatedAt || row.TanggalMulai || v
        return (
          <span className="font-bold text-slate-400 text-[11px] font-headline">
            {dateVal ? new Date(dateVal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
        )
      }
    }
  ]

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Siaran &"
        highlightedTitle="Pengumuman"
        subtitle="Publikasi pengumuman penting, agenda rapat, dan regulasi resmi bagi seluruh anggota."
        icon="campaign"
        badges={[
          { label: 'Pusat Informasi', active: true }
        ]}
      />

      {/* ── Pengumuman DataTable Container ────────────────────────────── */}
      <div className="glass-card mb-8 animate-in slide-in-from-bottom-4 duration-500 fade-in border border-white/20 overflow-hidden">
        <div className="p-0">
          <DataTable
            title="Daftar Pengumuman"
            subtitle="Menampilkan daftar pengumuman yang diterbitkan oleh organisasi Anda."   
            containerClassName="border-0 shadow-none rounded-none"
            columns={columns}
            data={data}
            loading={loading}
            searchPlaceholder="Cari judul pengumuman..."
            onAdd={hasPermission('ormawa.announcements.create') ? handleOpenAdd : undefined}
            addLabel="Buat Pengumuman"
            filters={[
              {
                key: 'Kategori',
                placeholder: 'Filter Kategori',
                options: Object.entries(KATEGORI_CFG).map(([v, { label }]) => ({ label, value: v }))
              }
            ]}
            actions={(row) => (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  onClick={() => {
                    setSelected(row)
                    setIsDetailOpen(true)
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--theme-text-subtle)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-xl active:scale-95 transition-all"
                  title="Lihat Detail Pengumuman"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>
                </Button>
                {hasPermission('ormawa.announcements.update') && (
                  <Button
                    onClick={() => handleOpenEdit(row)}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--theme-text-subtle)] hover:text-amber-600 hover:bg-amber-50 rounded-xl active:scale-95 transition-all"
                    title="Edit Pengumuman"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit_note</span>
                  </Button>
                )}
                {hasPermission('ormawa.announcements.delete') && (
                  <Button
                    onClick={() => {
                      setSelected(row)
                      setIsDelOpen(true)
                    }}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-[var(--theme-text-subtle)] hover:text-rose-600 hover:bg-rose-50 rounded-xl active:scale-95 transition-all"
                    title="Hapus Pengumuman"
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>delete</span>
                  </Button>
                )}
              </div>
            )}
          />
        </div>
      </div>

      {/* ── Detail View Dialog ── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selected ? selected.Judul || selected.judul : 'Detail Pengumuman'}
        subtitle={selected ? `SIARAN ANN-${selected.id || selected.ID} • ${new Date(selected.created_at || selected.CreatedAt || selected.TanggalMulai).toLocaleDateString('id-ID')}` : 'Detail'}
        icon="campaign"
        maxWidth="max-w-2xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <ModalCancelButton onClick={() => setIsDetailOpen(false)}>TUTUP</ModalCancelButton>
            <Button
              type="button"
              onClick={() => {
                setIsDetailOpen(false);
                handleOpenEdit(selected);
              }}
              className="h-11 px-6 sm:px-8 rounded-xl bg-[var(--theme-primary)] text-white hover:opacity-90 shadow-lg active:translate-y-0 transition-all border-none font-black text-[11px] uppercase tracking-[0.1em] flex items-center justify-center cursor-pointer hover:-translate-y-0.5"
            >
              EDIT PENGUMUMAN
            </Button>
          </div>
        }
      >
        {selected && (
          <div className="flex flex-col">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left Metadata Column */}
                <div className="space-y-4 md:col-span-1 md:border-r md:border-slate-100 md:pr-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase font-headline block">Oleh Ormawa</span>
                    <span className="text-xs font-bold text-slate-700 block bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">Badan Pengurus Harian</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-slate-400 tracking-wider uppercase font-headline block">Target Pembaca</span>
                    <span className="text-xs font-bold text-slate-700 block bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">Seluruh Anggota</span>
                  </div>
                </div>
              </div>

              {/* Right Content Column */}
              <div className="space-y-2 md:col-span-2">
                <Label className="text-[10px] font-black text-[var(--theme-text-subtle)] tracking-[0.2em] ml-1 uppercase font-headline">Isi Pengumuman Resmi</Label>
                <div className="text-sm font-medium text-[var(--theme-text)] leading-relaxed bg-[var(--theme-surface)] p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm min-h-[120px] whitespace-pre-line">
                  {selected.Isi || selected.isi || '—'}
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogModal>

      {/* ── CRUD Dialog ── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}
        subtitle="Kelola informasi resmi organisasi."
        icon="campaign"
        maxWidth="max-w-xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} />
            <ModalSaveButton loading={isSubmitting} form="pengumuman-form">
              {isEditMode ? 'SIMPAN PERUBAHAN' : 'PUBLIKASIKAN'}
            </ModalSaveButton>
          </div>
        }
      >
        <form id="pengumuman-form" onSubmit={handleSave} className="flex flex-col">
          <div className="space-y-5 font-inter">
            {/* Judul Pengumuman */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Judul Pengumuman</Label>
              <Input
                required
                value={form.Judul}
                onChange={e => setForm({ ...form, Judul: e.target.value })}
                placeholder="Masukkan judul atau tajuk utama pengumuman..."
                className="font-bold text-xs"
              />
            </div>

            {/* Premium Selector Grid Buttons for Kategori */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Pilih Kategori Siaran</Label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'umum', label: 'UMUM', icon: 'feed', cls: 'hover:bg-slate-50 text-slate-600', activeCls: 'bg-slate-900 text-white border-transparent shadow-md' },
                  { id: 'kegiatan', label: 'KEGIATAN', icon: 'event', cls: 'hover:bg-bku-primary/10 text-bku-primary', activeCls: 'bg-bku-primary text-white border-transparent shadow-md shadow-bku-primary/20' },
                  { id: 'penting', label: 'PENTING', icon: 'warning', cls: 'hover:bg-rose-50 text-rose-600', activeCls: 'bg-rose-600 text-white border-transparent shadow-md shadow-rose-500/20' },
                  { id: 'info', label: 'INFORMASI', icon: 'info', cls: 'hover:bg-sky-50 text-sky-600', activeCls: 'bg-sky-600 text-white border-transparent shadow-md shadow-sky-500/20' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setForm({ ...form, Kategori: cat.id })}
                    className={cn(
                      "h-12 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all duration-300 border-2 cursor-pointer",
                      form.Kategori === cat.id
                        ? "bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-[1.02]"
                        : "bg-transparent text-slate-400 border-slate-100 hover:border-slate-300 hover:bg-slate-50"
                    )}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>{cat.icon}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Isi Pengumuman */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Isi Pengumuman</Label>
              <Textarea
                required
                value={form.Isi}
                onChange={e => setForm({ ...form, Isi: e.target.value })}
                placeholder="Tuliskan isi pengumuman secara lengkap, jelas, dan lugas di sini..."
                className="min-h-[140px] border-slate-200 bg-white shadow-sm focus:border-primary focus:ring-1 focus:ring-primary/20 rounded-xl p-4 font-medium text-xs leading-relaxed"
              />
            </div>

            {/* Tanggal Penjadwalan */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 tracking-[0.2em] ml-1 uppercase font-headline">Tanggal Rilis (Opsional)</Label>
              <Input
                type="date"
                value={form.TanggalMulai}
                onChange={e => setForm({ ...form, TanggalMulai: e.target.value })}
                className="font-bold text-xs"
              />
              <p className="text-[10px] text-slate-400 ml-1 font-medium">Jika diisi, pengumuman & notifikasi akan muncul pada tanggal tersebut.</p>
            </div>
          </div>

        </form>
      </DialogModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Pengumuman?"
        description="Apakah Anda yakin ingin menghapus siaran pengumuman ini? Tindakan ini bersifat permanen."
        loading={isSubmitting}
      />
    </PageContent>
  )
}
