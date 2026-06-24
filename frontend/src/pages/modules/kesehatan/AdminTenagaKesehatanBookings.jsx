"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { DialogModal, ModalCancelButton } from '@/components/ui/DialogModal'

export default function TenagaKesehatanBookings() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const bkRes = await adminService.getTenagaKesehatanBookings()
      if (bkRes.status === 'success') {
        const flattened = (bkRes.data || []).map(item => {
          const mhs = item.mahasiswa || item.Mahasiswa;
          return {
            ...item,
            _fakultas: mhs?.fakultas?.Nama || mhs?.Fakultas?.Nama || mhs?.fakultas?.nama || mhs?.Fakultas?.nama || '',
            _semester: mhs?.SemesterSekarang || mhs?.semester_sekarang || ''
          };
        })
        setBookings(flattened)
      } else {
        toast.error('Gagal memuat data booking janji temu')
      }
    } catch (err) {
      console.error(err)
      toast.error('Koneksi sistem terputus / Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const semesterOptions = [
    { label: 'SEMESTER 1', value: '1' },
    { label: 'SEMESTER 2', value: '2' },
    { label: 'SEMESTER 3', value: '3' },
    { label: 'SEMESTER 4', value: '4' },
    { label: 'SEMESTER 5', value: '5' },
    { label: 'SEMESTER 6', value: '6' },
    { label: 'SEMESTER 7', value: '7' },
    { label: 'SEMESTER 8', value: '8' },
  ]

  const bookingColumns = [
    {
      key: 'mahasiswa',
      label: 'Mahasiswa',
      className: 'w-[250px]',
      render: (v, row) => {
        const mhs = row.mahasiswa || row.Mahasiswa;
        return (
          <div className="flex flex-col py-1 font-jakarta">
            <span className="font-bold text-neutral-900 text-xs">{mhs?.Nama || mhs?.nama || '—'}</span>
            <span className="text-[10px] text-neutral-400 font-bold">{mhs?.NIM || mhs?.nim || '—'}</span>
            <span className="text-[9px] text-neutral-400 font-medium tracking-wide uppercase">{mhs?.program_studi?.nama || mhs?.ProgramStudi?.Nama || mhs?.program_studi?.Nama || '—'}</span>
            <div className="flex items-center gap-2 mt-0.5">
              {row._fakultas && <span className="text-[8px] text-bku-primary font-bold bg-bku-primary/10 px-1.5 py-0.5 rounded">{row._fakultas}</span>}
              {row._semester && <span className="text-[8px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded">Sem {row._semester}</span>}
            </div>
          </div>
        )
      }
    },
    {
      key: 'tenaga_kes',
      label: 'Tenaga Medis',
      className: 'w-[200px]',
      render: (v, row) => {
        const jdwl = row.jadwal || row.Jadwal;
        const nakes = jdwl?.tenaga_kes || jdwl?.TenagaKes;
        return (
          <div className="flex flex-col py-1 font-jakarta">
            <span className="font-bold text-neutral-800 text-xs">{nakes?.nama || nakes?.Nama || '—'}</span>
            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{nakes?.spesialisasi || nakes?.Spesialisasi || '—'}</span>
          </div>
        )
      }
    },
    {
      key: 'tanggal',
      label: 'Tanggal & Layanan',
      className: 'w-[220px]',
      render: (v, row) => {
        const jdwl = row.jadwal || row.Jadwal;
        const tanggalStr = jdwl?.tanggal || jdwl?.Tanggal;
        const formattedDate = tanggalStr ? new Date(tanggalStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        return (
          <div className="flex flex-col py-1 font-jakarta">
            <span className="font-bold text-neutral-800 text-xs">{formattedDate}</span>
            <span className="text-[10px] text-neutral-500 font-medium">{jdwl?.jam_mulai || jdwl?.JamMulai} - {jdwl?.jam_selesai || jdwl?.JamSelesai}</span>
            <span className="text-[9px] font-bold text-bku-primary bg-bku-primary/10 px-1 py-0.5 rounded w-fit mt-0.5 uppercase">{jdwl?.tipe_layanan || jdwl?.TipeLayanan || 'Pemeriksaan'}</span>
          </div>
        )
      }
    },
    {
      key: 'keluhan',
      label: 'Keluhan',
      className: 'w-[250px]',
      render: (v, row) => (
        <div className="flex flex-col py-1 max-w-[220px] font-jakarta">
          <span className="text-xs text-neutral-800 font-medium block leading-normal line-clamp-2" title={row.keluhan || row.Keluhan}>{row.keluhan || row.Keluhan || '—'}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      className: 'w-[140px]',
      render: (v, row) => {
        const stat = row.status || row.Status;
        const statusLower = String(stat || '').toLowerCase()
        let bg = 'bg-neutral-50 text-neutral-600 border-neutral-100'
        if (statusLower === 'dikonfirmasi' || statusLower === 'selesai' || statusLower === 'disetujui') {
          bg = 'bg-emerald-50 text-emerald-600 border-emerald-100'
        } else if (statusLower === 'menunggu konfirmasi' || statusLower === 'waiting' || statusLower === 'pending' || statusLower === 'menunggu') {
          bg = 'bg-amber-50 text-amber-600 border-amber-100'
        } else if (statusLower === 'ditolak' || statusLower === 'dibatalkan') {
          bg = 'bg-rose-50 text-rose-600 border-rose-100'
        }
        return (
          <Badge className={cn('px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border font-jakarta shadow-none', bg)}>
            {stat || 'Menunggu'}
          </Badge>
        )
      }
    }
  ]

  const handleOpenDetail = (item) => {
    setDetailItem(item)
    setIsDetailOpen(true)
  }

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Jadwal &"
        highlightedTitle="Janji Temu"
        subtitle="Manajemen log janji temu klinik mahasiswa dengan tenaga medis, verifikasi kuota harian, serta pemantauan status pelayanan operasional."
        icon="calendar_month"
        badges={[{ label: 'Klinik Kesehatan Kampus', active: false }]}
        actions={
          <div className="px-4 py-2 bg-bku-primary/5 border border-bku-primary/20 rounded-xl flex items-center gap-3 w-full lg:w-auto justify-center">
            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '16px' }}>calendar_month</span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold text-bku-primary/70 uppercase tracking-widest">Akses Validasi</span>
              <span className="text-[12px] font-bold text-bku-primary font-jakarta">Super Admin Portal</span>
            </div>
          </div>
        }
      />

      {/* ── Table Section ────────────────────────────────────────── */}
      <div className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden mb-6">
        <DataTable
          columns={bookingColumns}
          data={bookings}
          loading={loading}
          searchPlaceholder="Cari Nama Mahasiswa, NIM, atau Keluhan..."
          filters={[
            { key: '_semester', placeholder: 'Pilih Semester', options: semesterOptions },
            { key: 'status', placeholder: 'Pilih Status', options: [{ label: 'Menunggu', value: 'menunggu' }, { label: 'Dikonfirmasi', value: 'dikonfirmasi' }, { label: 'Selesai', value: 'selesai' }, { label: 'Dibatalkan', value: 'dibatalkan' }] }
          ]}
          actions={(row) => (
            <div className="flex items-center gap-1.5">
              <Button onClick={() => handleOpenDetail(row)} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] rounded-lg transition-colors shadow-none cursor-pointer" title="Lihat Detail"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >visibility</span></Button>
            </div>
          )}
        />
      </div>

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        icon="visibility"
        title="Informasi Booking Janji Temu"
        description="Detail reservasi pemeriksaan medis."
        subtitle="Detail Booking Klinik"
        maxWidth="max-w-xl"
        bodyClassName="p-6 md:p-8 space-y-6 font-jakarta max-h-[60vh] overflow-y-auto no-scrollbar"
        footer={<ModalCancelButton onClick={() => setIsDetailOpen(false)}>Tutup Detail</ModalCancelButton>}
      >
        {detailItem && (() => {
          const mhs = detailItem.mahasiswa || detailItem.Mahasiswa || {};
          const jdwl = detailItem.jadwal || detailItem.Jadwal || {};
          const nakes = jdwl.tenaga_kes || jdwl.TenagaKes || {};
          const tanggalStr = jdwl.tanggal || jdwl.Tanggal;
          const formattedDate = tanggalStr ? new Date(tanggalStr).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';
          const stat = detailItem.status || detailItem.Status || 'Menunggu';

          return (
            <>
              {/* Mahasiswa Info Section */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Identitas Mahasiswa</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">Nama Lengkap</span>
                    <span className="text-xs font-bold text-neutral-800">{mhs.Nama || mhs.nama || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">NIM</span>
                    <span className="text-xs font-bold text-neutral-800">{mhs.NIM || mhs.nim || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">Program Studi</span>
                    <span className="text-xs font-bold text-neutral-800">{mhs.program_studi?.nama || mhs.ProgramStudi?.Nama || mhs.program_studi?.Nama || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">Fakultas / Sem</span>
                    <span className="text-xs font-bold text-neutral-800">
                      {detailItem._fakultas || '—'} {detailItem._semester ? `(Sem ${detailItem._semester})` : ''}
                    </span>
                  </div>
                </div>
              </div>

              {/* Tenaga Medis Info Section */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Informasi Jadwal & Tenaga Medis</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">Tenaga Medis</span>
                    <span className="text-xs font-bold text-neutral-800">{nakes.nama || nakes.Nama || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">Spesialisasi</span>
                    <span className="text-xs font-bold text-neutral-800">{nakes.spesialisasi || nakes.Spesialisasi || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">Tanggal Praktik</span>
                    <span className="text-xs font-bold text-neutral-800">{formattedDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-0.5">Waktu / Tipe Layanan</span>
                    <span className="text-xs font-bold text-neutral-800">{jdwl.jam_mulai || jdwl.JamMulai} - {jdwl.jam_selesai || jdwl.JamSelesai} ({jdwl.tipe_layanan || jdwl.TipeLayanan || 'Pemeriksaan Umum'})</span>
                  </div>
                </div>
              </div>

              {/* Booking Details Section */}
              <div className="bg-white p-4 rounded-xl border border-neutral-200 shadow-sm space-y-3">
                <h4 className="text-[10px] font-bold text-bku-primary uppercase tracking-widest">Detail Keluhan & Status</h4>

                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-1">Status Reservasi</span>
                    <Badge className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-none',
                      stat.toLowerCase() === 'selesai' || stat.toLowerCase() === 'dikonfirmasi' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        stat.toLowerCase() === 'ditolak' || stat.toLowerCase() === 'dibatalkan' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          'bg-amber-50 text-amber-600 border-amber-100'
                    )}>
                      {stat}
                    </Badge>
                  </div>

                  <div>
                    <span className="text-[10px] text-neutral-500 block mb-1">Keluhan / Catatan Medis</span>
                    <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs leading-relaxed text-neutral-700">
                      {detailItem.keluhan || detailItem.Keluhan || 'Tidak ada keluhan spesifik yang dicantumkan.'}
                    </div>
                  </div>

                  {(detailItem.alasan_penolakan || detailItem.AlasanPenolakan) && (
                    <div>
                      <span className="text-[10px] text-neutral-500 block mb-1">Alasan Penolakan</span>
                      <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs leading-relaxed text-rose-700 font-medium">
                        {detailItem.alasan_penolakan || detailItem.AlasanPenolakan}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )
        })()}
      </DialogModal>
    </PageContent>
  )
}
