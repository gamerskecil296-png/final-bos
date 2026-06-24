"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal } from '@/components/ui/DialogModal'
import { Card, CardContent } from '@/components/ui/Card'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService, API_BASE_URL } from '@/services/api'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

export default function PsychologistMedicalRecords() {
  const [medicalRecords, setMedicalRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const mrRes = await adminService.getPsychologistMedicalRecords()
      if (mrRes.status === 'success') {
        const flattened = (mrRes.data || []).map(item => {
          const mhs = item.mahasiswa || item.Mahasiswa;
          return {
            ...item,
            _fakultas: mhs?.fakultas?.Nama || mhs?.Fakultas?.Nama || mhs?.fakultas?.nama || mhs?.Fakultas?.nama || '',
            _semester: mhs?.SemesterSekarang || mhs?.semester_sekarang || ''
          };
        })
        setMedicalRecords(flattened)
      } else {
        toast.error('Gagal memuat rekam medis')
      }
    } catch (err) {
      console.error(err)
      toast.error('Koneksi sistem terputus / Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const semesterOptions = Array.from({ length: 8 }, (_, i) => ({
    label: `SEMESTER ${i + 1}`,
    value: String(i + 1)
  }))

  const statusOptions = useMemo(() => {
    const unique = [...new Set(medicalRecords.map(i => i.status_pasien).filter(Boolean))].sort()
    return unique.map(s => ({ label: s, value: s }))
  }, [medicalRecords])

  const medicalRecordColumns = [
    {
      key: 'mahasiswa',
      label: 'Mahasiswa',
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
      key: 'psikolog',
      label: 'Konselor / Psikolog',
      render: (v, row) => (
        <div className="flex flex-col py-1 font-jakarta">
          <span className="font-bold text-neutral-800 text-xs">{row.psikolog?.nama || '—'}</span>
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{row.psikolog?.spesialisasi || '—'}</span>
        </div>
      )
    },
    {
      key: 'tanggal',
      label: 'Pemeriksaan',
      render: (v, row) => {
        const formattedDate = v ? new Date(v).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        return (
          <div className="flex flex-col font-jakarta">
            <span className="font-bold text-xs text-neutral-800">{formattedDate}</span>
            <span className="text-[9px] text-neutral-400 font-bold uppercase">Konseling</span>
          </div>
        )
      }
    },
    {
      key: 'mood',
      label: 'Mood',
      render: v => (
        <span className="text-xs font-bold text-bku-primary font-jakarta">{v || '—'}</span>
      )
    },
    {
      key: 'status_pasien',
      label: 'Status Pasien',
      render: v => (
        <Badge className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 font-jakarta shadow-none">
          {v || '—'}
        </Badge>
      )
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
        title="Rekam Medis"
        highlightedTitle="Psikologi"
        subtitle="Catatan sesi klinis mahasiswa, hasil observasi psikolog, mood logger, dan rekomendasi tindak lanjut penanganan kesehatan mental."
        icon="medical_services"
        badges={[{ label: 'Layanan Konseling Kampus', active: false }]}
        actions={
          <div className="px-4 py-2 bg-bku-primary/5 border border-bku-primary/20 rounded-xl flex items-center gap-3 w-full lg:w-auto justify-center">
             <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '16px' }}>medical_services</span>
             <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold text-bku-primary/70 uppercase tracking-widest">Akses Validasi</span>
                <span className="text-[12px] font-bold text-bku-primary font-jakarta">Super Admin Portal</span>
             </div>
          </div>
        }
      />

        {/* ── Table Section ────────────────────────────────────────── */}
        <div className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden mb-6">
          <div className="p-0 animate-in fade-in duration-300">
            <DataTable
              title="Rekam Medis Psikologi"
              subtitle="Menampilkan rekam medis psikologi mahasiswa."
              columns={medicalRecordColumns}
              data={medicalRecords}
              loading={loading}
              searchPlaceholder="Cari Nama Mahasiswa, Keluhan, atau Observasi..."
              filters={[
                { key: '_semester', placeholder: 'Semester', options: semesterOptions },
                { key: 'status_pasien', placeholder: 'Status Pasien', options: statusOptions }
              ]}
              actions={(row) => (
                <div className="flex items-center gap-1.5">
                  <Button onClick={() => handleOpenDetail(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-bku-primary hover:bg-bku-primary/10 rounded-lg transition-colors" title="Lihat Detail"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >visibility</span></Button>
                </div>
              )}
            />
          </div>
        </div>

      {/* ── Detail Modal ─────────────────────────────────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title="Rekam Medis Mahasiswa"
        description="Informasi lengkap riwayat konseling klinis."
        icon="psychology"
        iconBg="bg-bku-primary/10 text-bku-primary"
        maxWidth="max-w-xl"
      >
        <div className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar font-jakarta">
          {detailItem && (
            <>
              {/* Mahasiswa Info Section */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Identitas Mahasiswa</h4>
                {(() => {
                  const mhs = detailItem.mahasiswa || detailItem.Mahasiswa;
                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold block">Nama Lengkap</span>
                        <span className="text-sm font-bold text-neutral-800">{mhs?.Nama || mhs?.nama || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold block">NIM (Nomor Induk Mahasiswa)</span>
                        <span className="text-sm font-bold text-neutral-800">{mhs?.NIM || mhs?.nim || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold block">Program Studi</span>
                        <span className="text-xs font-semibold text-neutral-700">{mhs?.program_studi?.nama || mhs?.ProgramStudi?.Nama || mhs?.program_studi?.Nama || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-neutral-400 font-bold block">Fakultas</span>
                        <span className="text-xs font-semibold text-neutral-700">{mhs?.fakultas?.Nama || mhs?.Fakultas?.Nama || mhs?.fakultas?.nama || mhs?.Fakultas?.nama || '—'}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Psychologist Info Section */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-100 space-y-3">
                <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Tenaga Profesional</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block">Nama Psikolog</span>
                    <span className="text-sm font-bold text-neutral-800">{detailItem.psikolog?.nama || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block">Spesialisasi</span>
                    <span className="text-xs font-bold text-bku-primary uppercase tracking-wide">{detailItem.psikolog?.spesialisasi || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block">Tanggal Sesi</span>
                    <span className="text-xs font-bold text-neutral-800">
                      {detailItem.tanggal ? new Date(detailItem.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block">Mood Mahasiswa</span>
                    <span className="text-xs font-bold text-bku-primary">{detailItem.mood || '—'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 font-bold block">Status Pasien</span>
                    <Badge className="px-2 py-0.5 mt-1 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700">
                      {detailItem.status_pasien || '—'}
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-neutral-400 font-bold block">Keluhan Konseling</span>
                  <p className="text-xs font-medium text-neutral-700 bg-neutral-50/50 p-3 rounded-lg border border-neutral-100 whitespace-pre-wrap leading-relaxed">{detailItem.keluhan || '—'}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-neutral-400 font-bold block">Hasil Observasi Psikolog</span>
                  <p className="text-xs font-medium text-neutral-700 bg-neutral-50/50 p-3 rounded-lg border border-neutral-100 whitespace-pre-wrap leading-relaxed">{detailItem.observasi || '—'}</p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] text-neutral-400 font-bold block">Rekomendasi Tindak Lanjut</span>
                  <p className="text-xs font-medium text-bku-primary bg-bku-primary/5 p-3 rounded-lg border border-bku-primary/20 whitespace-pre-wrap leading-relaxed">{detailItem.rekomendasi || '—'}</p>
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="flex justify-end pt-4 mt-6 border-t" style={{ borderColor: 'var(--theme-border-muted)' }}>
          <button
            type="button"
            onClick={() => setIsDetailOpen(false)}
            className="h-10 px-6 bg-[var(--theme-surface-hover)] hover:bg-[var(--theme-surface-active)] text-[var(--theme-text)] text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-200"
          >
            Tutup
          </button>
        </div>
      </DialogModal>
    </PageContent>
  )
}
