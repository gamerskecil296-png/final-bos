import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast } from 'react-hot-toast'
import useAuthStore from '@/store/useAuthStore'
import { DashboardHero } from '@/components/ui/dashboard'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { PageContent } from '@/components/ui/page'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { SquarePen, Trash2 } from 'lucide-react'

const EMPTY_FORM = {
  nama: '',
  deskripsi: '',
  terafiliasi_fakultas: false,
  wajib_prodi: false,
}

const API = '/app/dashboard'

const authGet  = (url)       => axios.get(url,        { headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` } })
const authPost = (url, data) => axios.post(url, data, { headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` } })
const authPut  = (url, data) => axios.put(url, data,  { headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` } })
const authDel  = (url)       => axios.delete(url,     { headers: { Authorization: `Bearer ${useAuthStore.getState().accessToken}` } })

export default function KategoriOrmawaPage() {
  const [kategoris, setKategoris] = useState([])
  const [loading, setLoading]     = useState(true)
  const [showModal, setModal]     = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [formData, setFormData]   = useState(EMPTY_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [delTarget, setDelTarget] = useState(null)
  const [isResetModalOpen, setIsResetModalOpen] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await authGet(`${API}/ormawa-kategori`)
      setKategoris(res.data.data || [])
    } catch {
      toast.error('Gagal memuat data kategori')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const set = (k, v) => setFormData(p => ({ ...p, [k]: v }))

  const openAdd = () => {
    setEditTarget(null)
    setFormData(EMPTY_FORM)
    setModal(true)
  }

  const openEdit = (kat) => {
    setEditTarget(kat)
    setFormData({
      nama: kat.nama,
      deskripsi: kat.deskripsi,
      terafiliasi_fakultas: kat.terafiliasi_fakultas,
      wajib_prodi: kat.wajib_prodi,
    })
    setModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.nama.trim()) { toast.error('Nama kategori wajib diisi'); return }
    setIsSubmitting(true)
    try {
      if (editTarget) {
        await authPut(`${API}/ormawa-kategori/${editTarget.id}`, formData)
        toast.success('Kategori berhasil diperbarui')
      } else {
        await authPost(`${API}/ormawa-kategori`, formData)
        toast.success('Kategori berhasil ditambahkan')
      }
      setModal(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menyimpan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReset = async () => {
    setIsResetting(true)
    try {
      await authDel(`${API}/ormawa-kategori-reset`)
      toast.success('Data kategori berhasil dikosongkan')
      setIsResetModalOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengosongkan data')
    } finally {
      setIsResetting(false)
    }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try {
      await authDel(`${API}/ormawa-kategori/${delTarget.id}`)
      toast.success('Kategori dihapus')
      setDelTarget(null)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus')
    }
  }



  const totalKategori    = kategoris.length
  const totalAfiliasi    = kategoris.filter(k => k.terafiliasi_fakultas).length
  const totalLangsung    = kategoris.filter(k => !k.terafiliasi_fakultas).length
  const totalSystem      = kategoris.filter(k => k.is_system).length

  return (
    <PageContent>
      {/* ── Hero ───────────────────────────── */}
      <DashboardHero
        title="Kategori"
        highlightedTitle="Organisasi"
        subtitle="Master data kategori ormawa — menentukan apakah ormawa terafiliasi dengan Fakultas dan bagaimana alur proposal berjalan."
        icon="category"
        badges={[{ label: 'Master Data • Super Admin', active: true }]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setIsResetModalOpen(true)}
              variant="danger"
              icon="delete_sweep"
              loading={isResetting}
              className="h-11 px-6 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all shadow-md flex items-center justify-center cursor-pointer"
            >
              RESET
            </Button>
            <Button
              onClick={openAdd}
              className="h-11 px-6 bg-primary hover:bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-primary/20 flex items-center gap-2 cursor-pointer border-none"
            >
              <span className="material-symbols-outlined font-black" style={{ fontSize: '16px' }}>add</span>
              <span>Tambah Kategori</span>
            </Button>
          </div>
        }
      />

      {/* ── Stats ─────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <PrimaryStatsCard
          title="Total Kategori"
          value={totalKategori}
          icon="category"
          colorTheme="primary"
          subtitle="Terdaftar"
        />
        <PrimaryStatsCard
          title="Via Fakultas"
          value={totalAfiliasi}
          icon="account_balance"
          colorTheme="info"
          subtitle="Terafiliasi fakultas"
        />
        <PrimaryStatsCard
          title="Langsung Univ"
          value={totalLangsung}
          icon="school"
          colorTheme="success"
          subtitle="Tanpa afiliasi"
        />
        <PrimaryStatsCard
          title="Kategori Sistem"
          value={totalSystem}
          icon="lock"
          colorTheme="warning"
          subtitle="Tidak dapat dihapus"
        />
      </div>

      {/* ── Info Banner ────────────────────── */}
      <div className="flex items-start gap-3 p-4 rounded-2xl border border-primary/20 bg-primary/5">
        <span className="material-symbols-outlined text-primary text-[20px] shrink-0 mt-0.5">info</span>
        <div className="text-xs leading-relaxed" style={{ color: 'var(--theme-primary)' }}>
          <p className="font-bold mb-0.5">Cara Kerja Kategori Ormawa</p>
          <p className="text-muted">
            Jika <strong>terafiliasi</strong>, proposal ormawa wajib melewati persetujuan <strong>Fakultas</strong> dulu sebelum ke Universitas.
            Jika <strong>tidak terafiliasi</strong>, proposal langsung masuk ke Universitas. Kategori 🔒 Sistem tidak bisa dihapus.
          </p>
        </div>
      </div>

      {/* ── Data Table ─────────────────────── */}
      <div className="flex flex-col gap-4">
        <DataTable
          title="Daftar Kategori Ormawa"
          subtitle="Menampilkan daftar Kategori Ormawa"
          searchable={true}
          searchPlaceholder="Cari kategori..."
          searchWidth="sm:w-80"
          onSearch={(data, query) => data.filter(k => k.nama.toLowerCase().includes(query.toLowerCase()))}
          data={kategoris}
          loading={loading}
          emptyMessage="Belum ada kategori terdaftar"
          columns={[
            {
              key: 'index',
              label: 'No',
              className: 'w-[60px] text-center',
              cellClassName: 'text-center',
              render: (_, __, i) => <span className="text-[11px] text-[var(--theme-text-muted)] font-mono font-bold">{i + 1}</span>
            },
            {
              key: 'nama',
              label: 'Nama Kategori',
              className: 'w-[200px]',
              render: (_, kat) => (
                <div className="flex items-center gap-3">
                  <div className={cn(
                    'h-8 w-8 rounded-xl flex items-center justify-center text-[13px] font-black shrink-0',
                    kat.terafiliasi_fakultas ? 'bg-[var(--theme-info-light)] text-[var(--theme-info)]' : 'bg-[var(--theme-success-light)] text-[var(--theme-success)]'
                  )}>
                    {kat.nama.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <p className="text-[13px] font-bold text-[var(--theme-text)] leading-tight">{kat.nama}</p>
                    {kat.is_system && (
                      <span className="text-[9px] font-black text-[var(--theme-warning)] uppercase tracking-wider flex items-center gap-0.5 mt-0.5">
                        <span className="material-symbols-outlined text-[10px]">lock</span> Sistem
                      </span>
                    )}
                  </div>
                </div>
              )
            },
            {
              key: 'deskripsi',
              label: 'Deskripsi',
              className: 'min-w-[280px]',
              render: (_, kat) => (
                <p className="text-[11px] text-[var(--theme-text-muted)] font-medium leading-relaxed pr-4">
                  {kat.deskripsi || <span className="italic text-[var(--theme-text-subtle)]">—</span>}
                </p>
              )
            },
            {
              key: 'afiliasi',
              label: 'Afiliasi Fakultas',
              className: 'w-[160px]',
              render: (_, kat) => (
                <div className="flex items-center">
                  {kat.terafiliasi_fakultas ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--theme-primary-light)] text-[var(--theme-primary)] text-[10px] font-bold tracking-wide">
                      <span className="material-symbols-outlined text-[13px]">account_balance</span>
                      Via Fakultas
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--theme-success-light)] text-[var(--theme-success)] text-[10px] font-bold tracking-wide">
                      <span className="material-symbols-outlined text-[13px]">school</span>
                      Langsung Univ
                    </span>
                  )}
                </div>
              )
            },
            {
              key: 'wajib_prodi',
              label: 'Wajib Prodi',
              className: 'w-[120px]',
              render: (_, kat) => (
                <div className="flex items-center">
                  {kat.wajib_prodi ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)] text-[10px] font-bold tracking-wide">Wajib</span>
                  ) : (
                    <span className="text-[var(--theme-text-subtle)] text-xs font-bold ml-2">—</span>
                  )}
                </div>
              )
            },
            {
              key: 'tipe',
              label: 'Tipe',
              className: 'w-[100px]',
              render: (_, kat) => (
                <span className={cn(
                  'inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide',
                  kat.is_system ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)]' : 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]'
                )}>
                  {kat.is_system ? 'Bawaan' : 'Kustom'}
                </span>
              )
            },
            {
              key: 'actions',
              label: 'Aksi',
              className: 'w-[110px] text-right',
              cellClassName: 'text-right',
              render: (_, kat) => (
                <div className="flex items-center justify-end gap-1">
                  <button
                    onClick={() => openEdit(kat)}
                    className="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-colors flex items-center justify-center cursor-pointer"
                  >
                    <SquarePen className="w-4 h-4" strokeWidth={2.5} />
                  </button>
                  {!kat.is_system && (
                    <button
                      onClick={() => setDelTarget(kat)}
                      className="p-1.5 rounded-lg text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] transition-colors flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>

      {/* ── Modal Form ─────────────────────── */}
      <DialogModal
        open={showModal}
        onOpenChange={setModal}
        title={editTarget ? 'Edit Kategori' : 'Tambah Kategori'}
        subtitle="Konfigurasikan kategori dan alur proposal"
        icon={editTarget ? 'edit' : 'add'}
        maxWidth="max-w-md"
        footer={
          <>
            <ModalCancelButton onClick={() => setModal(false)} />
            <ModalSaveButton
              form="form-kategori"
              loading={isSubmitting}
              icon="save"
            >
              {editTarget ? 'Simpan Perubahan' : 'Tambah Kategori'}
            </ModalSaveButton>
          </>
        }
      >
        <form id="form-kategori" onSubmit={handleSubmit} className="space-y-4">
          {/* Nama */}
          <div>
            <label className="block text-sm font-bold text-[var(--theme-text)] mb-1.5">
              Nama Kategori <span className="text-red-500">*</span>
            </label>
            <input
              value={formData.nama}
              onChange={e => set('nama', e.target.value)}
              placeholder="Contoh: Himpunan, BEM, UKM..."
              required
              disabled={editTarget?.is_system}
              className="w-full h-11 px-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm font-medium text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {editTarget?.is_system && (
              <p className="mt-1 text-[10px] text-orange-500">🔒 Nama kategori sistem tidak dapat diubah</p>
            )}
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-bold text-[var(--theme-text)] mb-1.5">Deskripsi</label>
            <textarea
              value={formData.deskripsi}
              onChange={e => set('deskripsi', e.target.value)}
              placeholder="Deskripsi singkat tentang kategori ini..."
              rows={2}
              className="w-full px-4 py-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] text-sm font-medium text-[var(--theme-text)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/10 transition-all resize-none"
            />
          </div>

          {/* Konfigurasi Alur */}
          <div className="p-4 rounded-xl border border-[var(--theme-border)] bg-slate-50/30 space-y-3">
            <p className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Konfigurasi Alur Proposal</p>

            {/* Terafiliasi Fakultas */}
            <div
              className={cn(
                'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border-2',
                formData.terafiliasi_fakultas ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200/60 hover:border-slate-300'
              )}
              onClick={() => {
                set('terafiliasi_fakultas', !formData.terafiliasi_fakultas)
                if (formData.terafiliasi_fakultas) set('wajib_prodi', false)
              }}
            >
              <div className={cn(
                'mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                formData.terafiliasi_fakultas ? 'bg-blue-500 border-blue-500' : 'border-slate-300 bg-white'
              )}>
                {formData.terafiliasi_fakultas && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--theme-text)]">Terafiliasi dengan Fakultas</p>
                <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">
                  Proposal wajib disetujui Fakultas terlebih dahulu sebelum ke Universitas.
                </p>
                <div className={cn('mt-1 flex items-center gap-1 text-[10px] font-bold', formData.terafiliasi_fakultas ? 'text-blue-600' : 'text-emerald-600')}>
                  <span className="material-symbols-outlined text-[12px]">route</span>
                  {formData.terafiliasi_fakultas ? 'Ormawa → Fakultas → Universitas' : 'Ormawa → Universitas (langsung)'}
                </div>
              </div>
            </div>

            {/* Wajib Prodi */}
            {formData.terafiliasi_fakultas && (
              <div
                className={cn(
                  'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all border-2',
                  formData.wajib_prodi ? 'bg-violet-50 border-violet-200' : 'bg-white border-slate-200/60 hover:border-slate-300'
                )}
                onClick={() => set('wajib_prodi', !formData.wajib_prodi)}
              >
                <div className={cn(
                  'mt-0.5 h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all',
                  formData.wajib_prodi ? 'bg-violet-500 border-violet-500' : 'border-slate-300 bg-white'
                )}>
                  {formData.wajib_prodi && <span className="material-symbols-outlined text-white text-[13px]">check</span>}
                </div>
                <div>
                  <p className="text-sm font-bold text-[var(--theme-text)]">Program Studi Wajib Diisi</p>
                  <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">Ormawa harus memilih Program Studi spesifik saat registrasi.</p>
                </div>
              </div>
            )}
          </div>
        </form>
      </DialogModal>

      {/* ── Modal Delete ───────────────────── */}
      <DialogModal
        open={!!delTarget}
        onOpenChange={(open) => { if (!open) setDelTarget(null) }}
        title="Hapus Kategori?"
        subtitle="Tindakan ini tidak bisa dibatalkan"
        icon="delete_forever"
        variant="danger"
        maxWidth="max-w-sm"
        footer={
          <>
            <ModalCancelButton onClick={() => setDelTarget(null)} />
            <ModalSaveButton
              onClick={handleDelete}
              icon="delete"
              className="bg-rose-500 hover:bg-rose-600 ring-rose-500/20"
            >
              Ya, Hapus
            </ModalSaveButton>
          </>
        }
      >
        <p className="text-sm text-[var(--theme-text-muted)]">
          Apakah Anda yakin ingin menghapus kategori <strong className="text-[var(--theme-text)] font-black">"{delTarget?.nama}"</strong>?
          Pastikan tidak ada ormawa yang masih menggunakan kategori ini.
        </p>
      </DialogModal>

      {/* ── Modal Reset ───────────────────── */}
      <DeleteConfirmModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleReset}
        title="Botakin Kategori Ormawa?"
        description={
          <span>
            Apakah Anda yakin ingin <strong className="text-red-600 font-black">MENGOSONGKAN (BOTAKIN)</strong> seluruh data kategori ormawa? Kategori sistem bawaan aplikasi <strong>TIDAK</strong> akan ikut terhapus. Aksi ini tidak dapat dibatalkan.
          </span>
        }
      />
    </PageContent>
  )
}
