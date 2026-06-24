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

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const PERMISSIONS = [
  // Dashboard & Notif
  'ormawa.core.view', 'ormawa.core.update',
  'ormawa.notifications.view', 'ormawa.notifications.manage',
  // Anggota & Struktur
  'ormawa.members.view', 'ormawa.members.create', 'ormawa.members.update', 'ormawa.members.delete',
  'ormawa.structure.view', 'ormawa.structure.manage',
  // Proposal & LPJ
  'ormawa.proposals.view', 'ormawa.proposals.create', 'ormawa.proposals.update', 'ormawa.proposals.delete',
  'ormawa.lpj.view', 'ormawa.lpj.create', 'ormawa.lpj.update', 'ormawa.lpj.delete',
  // Kegiatan & Absensi
  'ormawa.events.view', 'ormawa.events.create', 'ormawa.events.update', 'ormawa.events.delete',
  'ormawa.attendance.view', 'ormawa.attendance.manage',
  // Keuangan
  'ormawa.finance.view', 'ormawa.finance.create', 'ormawa.finance.update', 'ormawa.finance.delete',
  // Aspirasi & Pengumuman
  'ormawa.aspirations.view', 'ormawa.aspirations.update',
  'ormawa.announcements.view', 'ormawa.announcements.create', 'ormawa.announcements.update', 'ormawa.announcements.delete',
  // Rekrutmen & PKKMB
  'ormawa.recruitment.view', 'ormawa.recruitment.create', 'ormawa.recruitment.delete',
  'ormawa.kencana.view', 'ormawa.kencana.manage',
  // RBAC & Settings
  'ormawa.rbac.view', 'ormawa.rbac.create', 'ormawa.rbac.update', 'ormawa.rbac.delete',
  'ormawa.settings.view', 'ormawa.settings.manage'
]

const PERM_LABELS = {
  'ormawa.core.view': 'Dashboard: Lihat Statistik & Notifikasi',
  'ormawa.core.update': 'Pengaturan: Edit Profil & Setting',
  'ormawa.notifications.view': 'Notifikasi: Lihat Kotak Masuk',
  'ormawa.notifications.manage': 'Notifikasi: Tandai/Hapus Pesan',

  'ormawa.members.view': 'Anggota: Lihat Daftar',
  'ormawa.members.create': 'Anggota: Tambah Baru',
  'ormawa.members.update': 'Anggota: Edit Jabatan',
  'ormawa.members.delete': 'Anggota: Keluarkan/Hapus',
  'ormawa.structure.view': 'Struktur: Lihat Bagan Organisasi',
  'ormawa.structure.manage': 'Struktur: Tambah & Edit Divisi/BPH',

  'ormawa.proposals.view': 'Proposal: Lihat Pengajuan',
  'ormawa.proposals.create': 'Proposal: Buat Baru',
  'ormawa.proposals.update': 'Proposal: Edit & Revisi',
  'ormawa.proposals.delete': 'Proposal: Hapus Pengajuan',

  'ormawa.lpj.view': 'LPJ: Lihat Laporan',
  'ormawa.lpj.create': 'LPJ: Buat & Ajukan Baru',
  'ormawa.lpj.update': 'LPJ: Edit & Unggah Dokumen',
  'ormawa.lpj.delete': 'LPJ: Hapus Laporan',

  'ormawa.events.view': 'Kalender: Lihat Jadwal',
  'ormawa.events.create': 'Kalender: Buat Agenda Baru',
  'ormawa.events.update': 'Kalender: Edit Acara',
  'ormawa.events.delete': 'Kalender: Hapus Agenda',

  'ormawa.attendance.view': 'Absensi: Lihat Kehadiran',
  'ormawa.attendance.manage': 'Absensi: Pindai & Kelola Presensi',

  'ormawa.finance.view': 'Buku Kas: Lihat Arus Saldo',
  'ormawa.finance.create': 'Buku Kas: Catat Pemasukan/Pengeluaran',
  'ormawa.finance.update': 'Buku Kas: Edit Transaksi',
  'ormawa.finance.delete': 'Buku Kas: Hapus Riwayat Mutasi',

  'ormawa.aspirations.view': 'Aspirasi: Baca Masukan',
  'ormawa.aspirations.update': 'Aspirasi: Kirim Tanggapan Resmi',

  'ormawa.announcements.view': 'Pengumuman: Lihat Siaran',
  'ormawa.announcements.create': 'Pengumuman: Buat Siaran Baru',
  'ormawa.announcements.update': 'Pengumuman: Edit Isi Siaran',
  'ormawa.announcements.delete': 'Pengumuman: Hapus Siaran',

  'ormawa.recruitment.view': 'Rekrutmen: Lihat Pelamar Oprec',
  'ormawa.recruitment.create': 'Rekrutmen: Buka/Tutup Formulir',
  'ormawa.recruitment.delete': 'Rekrutmen: Hapus Form Pelamar',

  'ormawa.kencana.view': 'PKKMB: Lihat Data Maba & Peserta',
  'ormawa.kencana.manage': 'PKKMB: Kelola Rangkaian Kencana',

  'ormawa.rbac.view': 'RBAC: Lihat Role Akses',
  'ormawa.rbac.create': 'RBAC: Buat Role Baru',
  'ormawa.rbac.update': 'RBAC: Edit Role Akses',
  'ormawa.rbac.delete': 'RBAC: Hapus Role',

  'ormawa.settings.view': 'Pengaturan: Lihat Profil Ormawa',
  'ormawa.settings.manage': 'Pengaturan: Edit Profil, Logo & Rekening'
}

const PERM_DESCS = {
  'ormawa.core.view': 'Mampu memantau performa, jumlah anggota, kegiatan aktif, proposal terbaru, dan live saldo kas.',
  'ormawa.core.update': 'Mampu mengedit profil resmi, visi/misi, rekening bank, dan pengaturan sistem lainnya.',
  'ormawa.notifications.view': 'Mampu membaca notifikasi terkait pengajuan dan aktivitas harian.',
  'ormawa.notifications.manage': 'Mampu menghapus atau menandai notifikasi sebagai sudah dibaca.',

  'ormawa.members.view': 'Mampu melihat list lengkap seluruh anggota.',
  'ormawa.members.create': 'Mampu mendaftarkan anggota baru ke dalam sistem kepengurusan.',
  'ormawa.members.update': 'Mampu memperbarui jabatan dan mengedit profil anggota.',
  'ormawa.members.delete': 'Mampu melakukan pemecatan atau menghapus data anggota secara permanen dari ormawa.',
  'ormawa.structure.view': 'Mampu melihat bagan hierarki struktural.',
  'ormawa.structure.manage': 'Mampu membuat divisi baru dan meng-assign anggota BPH.',

  'ormawa.proposals.view': 'Mampu mengakses dan melihat seluruh berkas proposal kegiatan yang diajukan.',
  'ormawa.proposals.create': 'Mampu mengisi formulir dan mengirimkan proposal kegiatan baru ke fakultas.',
  'ormawa.proposals.update': 'Mampu mengubah isi deskripsi, menaikkan/menurunkan anggaran, dan merevisi proposal.',
  'ormawa.proposals.delete': 'Mampu menghapus/membatalkan proposal kegiatan yang sudah dikirim.',

  'ormawa.lpj.view': 'Mampu membuka dan mengunduh berkas Laporan Pertanggungjawaban (LPJ) kegiatan.',
  'ormawa.lpj.create': 'Mampu mengisi form realisasi dana dan mengajukan LPJ setelah kegiatan selesai.',
  'ormawa.lpj.update': 'Mampu menyesuaikan angka nominal realisasi penggunaan dana dan mengunggah bukti fisik dokumen LPJ.',
  'ormawa.lpj.delete': 'Mampu menghapus draf atau laporan LPJ kegiatan.',

  'ormawa.events.view': 'Mampu melihat rincian jadwal rapat dan program kerja.',
  'ormawa.events.create': 'Mampu menyusun agenda kerja baru dan menambahkannya ke kalender.',
  'ormawa.events.update': 'Mampu menggeser jadwal acara pada kalender.',
  'ormawa.events.delete': 'Mampu membatalkan agenda dan menghapusnya dari kalender ormawa.',

  'ormawa.attendance.view': 'Mampu melihat rekapitulasi kehadiran anggota di suatu acara.',
  'ormawa.attendance.manage': 'Mampu membuat sesi presensi, men-scan QR, dan merubah status absensi (Hadir, Sakit, Alpa).',

  'ormawa.finance.view': 'Mampu memantau mutasi buku kas ormawa, rincian nominal pemasukan, dan pengeluaran.',
  'ormawa.finance.create': 'Mampu menuliskan catatan transaksi keuangan baru (iuran masuk, sewa dana keluar, dll.).',
  'ormawa.finance.update': 'Mampu mengedit catatan mutasi transaksi.',
  'ormawa.finance.delete': 'Mampu menghapus catatan transaksi keuangan jika terjadi salah ketik/input.',

  'ormawa.aspirations.view': 'Mampu melihat keluhan, kritik, atau saran yang dikirimkan oleh mahasiswa umum.',
  'ormawa.aspirations.update': 'Mampu merumuskan tanggapan resmi dari pihak pengurus ormawa untuk membalas mahasiswa.',

  'ormawa.announcements.view': 'Mampu melihat daftar pengumuman penting internal organisasi.',
  'ormawa.announcements.create': 'Mampu memublikasikan pengumuman penting ke seluruh mahasiswa.',
  'ormawa.announcements.update': 'Mampu mengedit teks, lampiran, atau periode terbit pengumuman.',
  'ormawa.announcements.delete': 'Mampu menarik kembali/menghapus pengumuman yang sudah kedaluwarsa.',

  'ormawa.recruitment.view': 'Mampu melihat daftar mahasiswa yang mendaftar Oprec.',
  'ormawa.recruitment.create': 'Mampu menyusun form pendaftaran (custom fields) untuk Oprec.',
  'ormawa.recruitment.delete': 'Mampu menghapus data pelamar.',

  'ormawa.kencana.view': 'Mampu melihat peserta dan mahasiswa baru PKKMB.',
  'ormawa.kencana.manage': 'Mampu memvalidasi kelulusan, dan mengelola tahapan orientasi mahasiswa baru.',

  'ormawa.rbac.view': 'Mampu melihat jenis-jenis role kepengurusan beserta hak otoritasnya.',
  'ormawa.rbac.create': 'Mampu mendaftarkan dan membuat role otoritas baru.',
  'ormawa.rbac.update': 'Mampu mengonfigurasi pembagian hak istimewa pengurus dan mengedit role.',
  'ormawa.rbac.delete': 'Mampu menghapus role otorisasi yang sudah ada.',

  'ormawa.settings.view': 'Mampu melihat data profil resmi, website, dan rekening bank ormawa.',
  'ormawa.settings.manage': 'Mampu mengunggah logo baru, visi/misi, link sosial media, dan rekening bank penerimaan dana kegiatan.'
}

// Visual color categories mapping to permissions for gorgeous badges
const getPermBadgeClass = (h) => {
  if (h.endsWith('.delete')) {
    return 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error-light)]'
  }
  if (h.endsWith('.create')) {
    return 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]'
  }
  if (h.endsWith('.update') || h.endsWith('.manage')) {
    return 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]'
  }
  return 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info-light)]'
}

const PERM_GROUPS = [
  {
    title: 'Dashboard & Notifikasi',
    icon: 'dashboard',
    permissions: ['ormawa.core.view', 'ormawa.notifications.view', 'ormawa.notifications.manage']
  },
  {
    title: 'Keanggotaan & Kepengurusan',
    icon: 'group',
    permissions: ['ormawa.members.view', 'ormawa.members.create', 'ormawa.members.update', 'ormawa.members.delete']
  },
  {
    title: 'Struktur Divisi & BPH',
    icon: 'account_tree',
    permissions: ['ormawa.structure.view', 'ormawa.structure.manage']
  },
  {
    title: 'Proposal Kegiatan',
    icon: 'description',
    permissions: ['ormawa.proposals.view', 'ormawa.proposals.create', 'ormawa.proposals.update', 'ormawa.proposals.delete']
  },
  {
    title: 'Laporan Pertanggungjawaban (LPJ)',
    icon: 'assignment',
    permissions: ['ormawa.lpj.view', 'ormawa.lpj.create', 'ormawa.lpj.update', 'ormawa.lpj.delete']
  },
  {
    title: 'Kalender & Jadwal Acara',
    icon: 'calendar_month',
    permissions: ['ormawa.events.view', 'ormawa.events.create', 'ormawa.events.update', 'ormawa.events.delete']
  },
  {
    title: 'Sistem Absensi (QR)',
    icon: 'how_to_reg',
    permissions: ['ormawa.attendance.view', 'ormawa.attendance.manage']
  },
  {
    title: 'Buku Kas & Keuangan',
    icon: 'account_balance_wallet',
    permissions: ['ormawa.finance.view', 'ormawa.finance.create', 'ormawa.finance.update', 'ormawa.finance.delete']
  },
  {
    title: 'Aspirasi & Suara Mahasiswa',
    icon: 'campaign',
    permissions: ['ormawa.aspirations.view', 'ormawa.aspirations.update']
  },
  {
    title: 'Pengumuman Terbuka',
    icon: 'breaking_news_alt_1',
    permissions: ['ormawa.announcements.view', 'ormawa.announcements.create', 'ormawa.announcements.update', 'ormawa.announcements.delete']
  },
  {
    title: 'Open Recruitment (Oprec)',
    icon: 'group_add',
    permissions: ['ormawa.recruitment.view', 'ormawa.recruitment.create', 'ormawa.recruitment.delete']
  },
  {
    title: 'Manajemen Kencana (PKKMB)',
    icon: 'school',
    permissions: ['ormawa.kencana.view', 'ormawa.kencana.manage']
  },
  {
    title: 'Hak Akses Role (RBAC)',
    icon: 'security',
    permissions: ['ormawa.rbac.view', 'ormawa.rbac.create', 'ormawa.rbac.update', 'ormawa.rbac.delete']
  },
  {
    title: 'Pengaturan Profil Ormawa',
    icon: 'settings',
    permissions: ['ormawa.settings.view', 'ormawa.settings.manage', 'ormawa.core.update']
  }
]

export default function RoleBasedAccess() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selected, setSelected] = useState(null)

  const ormawaId = getOrmawaId()

  const [form, setForm] = useState({ Nama: '', Deskripsi: '', Hak: [], OrmawaID: ormawaId })
  const [expandedGroups, setExpandedGroups] = useState({})

  const { hasPermission } = usePermission()
  const canManageRbac = hasPermission('ormawa.rbac.create') || hasPermission('ormawa.rbac.update') || hasPermission('ormawa.rbac.delete') || hasPermission('ormawa.rbac.manage')

  const toggleGroup = (index) => {
    setExpandedGroups(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

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
      const json = await fetchWithAuth(`${API}/roles?ormawaId=${ormawaId}`)
      if (json.status === 'success') {
        const normalized = (json.data || []).map(r => {
          const rawPermissions = r.Permissions || r.permissions || r.Hak || r.hak || []
          return {
            ID: r.ID || r.id,
            Nama: r.Nama || r.nama || '',
            Deskripsi: r.Deskripsi || r.deskripsi || '',
            Hak: parsePermissions(rawPermissions),
            OrmawaID: ormawaId
          }
        })
        setRoles(normalized)
      } else {
        // Fallback static roles for display if API not ready
        setRoles([
          { ID: 1, Nama: 'Ketua', Deskripsi: 'Akses penuh ke semua fitur', Hak: PERMISSIONS },
          { ID: 2, Nama: 'Sekretaris', Deskripsi: 'Manajemen anggota dan dokumen', Hak: ['ormawa.members.view', 'ormawa.members.create', 'ormawa.members.update', 'ormawa.members.delete', 'ormawa.proposals.view', 'ormawa.proposals.create', 'ormawa.proposals.update', 'ormawa.proposals.delete', 'ormawa.lpj.view', 'ormawa.lpj.create', 'ormawa.lpj.update', 'ormawa.lpj.delete'] },
          { ID: 3, Nama: 'Bendahara', Deskripsi: 'Manajemen keuangan dan laporan', Hak: ['ormawa.finance.view', 'ormawa.finance.create', 'ormawa.finance.update', 'ormawa.finance.delete', 'ormawa.lpj.view', 'ormawa.lpj.create', 'ormawa.lpj.update', 'ormawa.lpj.delete'] },
        ])
      }
    } catch {
      setRoles([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [ormawaId])

  const handleOpenAdd = () => {
    setIsEditMode(false)
    setForm({ Nama: '', Deskripsi: '', Hak: [], OrmawaID: ormawaId })
    setIsCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({
      ID: row.ID || row.id,
      Nama: row.Nama || row.nama || '',
      Deskripsi: row.Deskripsi || row.deskripsi || '',
      Hak: parsePermissions(row.Hak || row.permissions || row.Permissions || []),
      OrmawaID: ormawaId
    })
    setIsCrudOpen(true)
  }

  const toggleHak = (h) => {
    setForm(f => {
      const currentHak = f.Hak || []
      return {
        ...f,
        Hak: currentHak.includes(h) ? currentHak.filter(x => x !== h) : [...currentHak, h]
      }
    })
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    const url = isEditMode ? `${API}/roles/${form.ID || form.id}` : `${API}/roles`
    const method = isEditMode ? 'PUT' : 'POST'
    try {
      const json = await fetchWithAuth(url, {
        method,
        body: JSON.stringify({
          OrmawaID: Number(ormawaId),
          Nama: form.Nama,
          Deskripsi: form.Deskripsi,
          Hak: form.Hak
        }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (json.status === 'success') {
        toast.success(isEditMode ? 'Role berhasil diperbarui!' : 'Role baru berhasil dibuat!')
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

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const json = await fetchWithAuth(`${API}/roles/${selected?.id || selected?.ID}`, { method: 'DELETE' })
      if (json.status === 'success') {
        toast.success('Role berhasil dihapus')
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

  const columns = [
    {
      key: 'Nama',
      label: 'Nama Role',
      className: 'w-[200px]',
      render: (v, row) => <span className="font-bold text-[var(--theme-text)] font-headline text-[13px] tracking-tighter">{row.Nama || '—'}</span>
    },
    {
      key: 'Deskripsi',
      label: 'Deskripsi Tanggung Jawab',
      className: 'min-w-[240px]',
      render: (v, row) => <span className="font-medium text-[var(--theme-text-muted)] text-[12px]">{row.Deskripsi || '—'}</span>
    },
    {
      key: 'Hak',
      label: 'Kewenangan Otorisasi',
      className: 'min-w-[320px]',
      disableSort: true,
      render: (v, row) => {
        const hakList = row.Hak || []
        return (
          <div className="flex flex-wrap gap-1.5 py-1">
            {hakList.slice(0, 3).map(h => (
              <Badge key={h} className={cn("font-semibold text-[8px] tracking-wider px-2.5 py-0.5 border rounded-full uppercase", getPermBadgeClass(h))}>
                {PERM_LABELS[h]?.replace('Manajemen ', '').replace('Akses ', '') || h}
              </Badge>
            ))}
            {hakList.length > 3 && (
              <Badge className="bg-[var(--theme-bg)] text-[var(--theme-text-muted)] font-semibold text-[8px] border border-border px-2.5 py-0.5 rounded-full">
                +{hakList.length - 3} HAK LAIN
              </Badge>
            )}
            {hakList.length === 0 && (
              <span className="text-[10px] font-bold text-[var(--theme-text-subtle)] italic">Tanpa Akses Modul</span>
            )}
          </div>
        )
      }
    }
  ]

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Otoritas &"
        highlightedTitle="Hak Akses"
        subtitle="Konfigurasi tata kelola otorisasi modul, hak istimewa role, dan kendali keamanan sistem."
        icon="security"
        badges={[
          { label: 'RBAC Portal', active: true }
        ]}
      />

      {/* ── Content Area ───────────────────────────────────────────── */}
      <div className="glass-card mb-8 animate-in slide-in-from-bottom-4 duration-500 fade-in border border-white/20 overflow-hidden">
        <div className="p-0">
          <DataTable
            title="Daftar Role"
            subtitle="Menampilkan daftar role yang ada di sistem."
            containerClassName="border-0 shadow-none rounded-none"
            columns={columns}
            data={roles}
            loading={loading}
            searchPlaceholder="Cari nama role..."
            onAdd={canManageRbac ? handleOpenAdd : undefined}
            addLabel="Buat Role Baru"
            actions={(row) => canManageRbac ? (
              <div className="flex items-center justify-end gap-1.5">
                <Button
                  onClick={() => handleOpenEdit(row)}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--theme-text-muted)] hover:text-[var(--theme-warning)] hover:bg-[var(--theme-warning-light)] rounded-lg active:scale-95 transition-all"
                  title="Edit Otoritas Role"
                >
                  <span className="material-symbols-outlined block" style={{ fontSize: '16px' }}>edit_square</span>
                </Button>
                <Button
                  onClick={() => {
                    setSelected(row)
                    setIsDelOpen(true)
                  }}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-[var(--theme-text-muted)] hover:text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] rounded-lg active:scale-95 transition-all"
                  title="Hapus Role Ini"
                >
                  <span className="material-symbols-outlined block" style={{ fontSize: '16px' }}>delete</span>
                </Button>
              </div>
            ) : null}
          />
        </div>
      </div>

      {/* ── CRUD Dialog (Premium Glassmorphism Style) ── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? 'Konfigurasi Hak Akses Role' : 'Daftarkan Role Baru'}
        subtitle="Konfigurasi izin akses dan otorisasi modul."
        icon="security"
        maxWidth="max-w-4xl"
        footer={
          <div className="flex items-center justify-end gap-2">
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} />
            <ModalSaveButton loading={isSubmitting} form="rbac-form">
              {isEditMode ? 'SIMPAN OTORITAS' : 'TERBITKAN ROLE'}
            </ModalSaveButton>
          </div>
        }
      >
        <form id="rbac-form" onSubmit={handleSave} className="flex flex-col gap-6">
          <div className="font-inter">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nama Role */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--theme-text)]">Nama Otoritas Role</Label>
                <Input
                  required
                  value={form.Nama}
                  onChange={e => setForm({ ...form, Nama: e.target.value })}
                  placeholder="Misal: Ketua, Bendahara, Staff Divisi..."
                  className="w-full"
                />
              </div>

              {/* Deskripsi */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-[var(--theme-text)]">Tanggung Jawab Singkat</Label>
                <Input
                  value={form.Deskripsi}
                  onChange={e => setForm({ ...form, Deskripsi: e.target.value })}
                  placeholder="Deskripsi singkat kewenangan tugas..."
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* CRUD Permission Matrix */}
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-[var(--theme-text)] block">
              Matriks Izin Otorisasi (Centang per CRUD)
            </Label>
            <div className="max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest border-b border-[var(--theme-border-muted)]">
                    <th className="py-2 pr-2 w-1/3">Fitur</th>
                    <th className="py-2 px-1 text-center w-[60px]"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span></th>
                    <th className="py-2 px-1 text-center w-[60px]"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span></th>
                    <th className="py-2 px-1 text-center w-[60px]"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span></th>
                    <th className="py-2 px-1 text-center w-[60px]"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span></th>
                    <th className="py-2 pl-1 text-center w-[60px]">Lain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--theme-border-muted)]">
                  {PERM_GROUPS.map((group, gIdx) => {
                    const viewP = group.permissions.find(p => p.endsWith('.view'))
                    const createP = group.permissions.find(p => p.endsWith('.create'))
                    const editP = group.permissions.find(p => p.endsWith('.update'))
                    const deleteP = group.permissions.find(p => p.endsWith('.delete'))
                    const extraP = group.permissions.filter(p => p !== viewP && p !== createP && p !== editP && p !== deleteP && !p.startsWith('manage_'))
                    return (
                      <tr key={gIdx} className="hover:bg-[var(--theme-primary-light)]/40 transition-colors">
                        <td className="py-2.5 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[var(--theme-text-muted)] shrink-0" style={{ fontSize: '15px' }}>{group.icon}</span>
                            <span className="text-[11px] font-semibold text-[var(--theme-text)] font-headline leading-tight">{group.title}</span>
                          </div>
                        </td>
                        {[viewP, createP, editP, deleteP].map((p, i) => (
                          <td key={i} className="py-2.5 px-1 text-center">
                            {p && (
                              <label className="flex items-center justify-center cursor-pointer">
                                <input type="checkbox"
                                  checked={(form.Hak || []).includes(p)}
                                  onChange={() => toggleHak(p)}
                                  className="size-4 rounded border-border text-[var(--theme-primary)] focus:ring-[var(--theme-primary-light)] cursor-pointer" />
                              </label>
                            )}
                          </td>
                        ))}
                        <td className="py-2.5 pl-1 text-center">
                          {extraP.length > 0 && (
                            <div className="flex items-center justify-center gap-0.5">
                              {extraP.map(p => (
                                <label key={p} className="flex items-center justify-center cursor-pointer" title={PERM_LABELS[p]?.split(': ')[1] || p}>
                                  <input type="checkbox"
                                    checked={(form.Hak || []).includes(p)}
                                    onChange={() => toggleHak(p)}
                                    className="size-4 rounded border-border text-[var(--theme-warning)] focus:ring-[var(--theme-warning-light)] cursor-pointer" />
                                </label>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <p className="text-[9px] text-[var(--theme-text-muted)] font-medium mt-3 italic px-1">
                Total: <span className="font-bold text-[var(--theme-text)]">{(form.Hak || []).length}</span> dari {PERMISSIONS.length} Izin Terpilih
              </p>
            </div>
          </div>
        </form>
      </DialogModal>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Role Otoritas?"
        description="Apakah Anda yakin ingin menghapus role otorisasi ini? Seluruh anggota dengan role ini akan kehilangan izin akses modul terkait."
        loading={isSubmitting}
      />
    </PageContent>
  )
}
