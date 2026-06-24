"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton } from '@/components/ui/DialogModal'
import { Card, CardContent } from '@/components/ui/Card'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService, API_BASE_URL } from '@/services/api'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

const getCleanImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const baseUrl = API_BASE_URL.replace('/api', '')
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

function StudentAvatar({ src, name, className = "w-9 h-9 rounded-xl" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const hasNoImage = !src || src.trim() === "" || src.endsWith("/profiles/") || src.endsWith("/students/") || src.endsWith("localhost:8000") || src.endsWith("localhost:8000/");

  return (
    <div className={cn("relative bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-inner overflow-hidden", className)}>
      {(!loaded || error || hasNoImage) && (
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute animate-in fade-in" style={{ fontSize: className.includes('w-28') ? '56px' : className.includes('w-14') ? '28px' : '20px' }}>
          person
        </span>
      )}
      {!hasNoImage && !error && (
        <img
          src={src}
          alt={name}
          className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setLoaded(true)}
          onLive={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}


const parseCatatan = (catatan) => {
  if (!catatan) return '—';
  try {
    const parsed = JSON.parse(catatan);
    return (
      <ul className="list-disc pl-4 space-y-1 mt-1 text-xs text-neutral-700">
        {Object.entries(parsed).map(([k, v]) => {
          if (v === '' || v === null || v === undefined) return null;
          if (Array.isArray(v) && v.length === 0) return null;
          return <li key={k}><strong className="capitalize">{k.replace(/_/g, ' ')}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>;
        })}
      </ul>
    );
  } catch (e) {
    return <p className="text-xs text-neutral-750 font-medium leading-relaxed mt-1">{catatan}</p>;
  }
}

export default function TenagaKesehatanMedicalRecords() {
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const mrRes = await adminService.getTenagaKesehatanMedicalRecords()
      if (mrRes.status === 'success') {
        const flattened = (mrRes.data || []).map(item => {
          const mhs = item.mahasiswa || item.Mahasiswa;
          return {
            ...item,
            _fakultas: mhs?.fakultas?.Nama || mhs?.Fakultas?.Nama || mhs?.fakultas?.nama || mhs?.Fakultas?.nama || '',
            _semester: mhs?.SemesterSekarang || mhs?.semester_sekarang || ''
          };
        })
        setRecords(flattened)
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

  const medicalRecordColumns = [
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
      className: 'w-[180px]',
      render: (v, row) => {
        const nakes = row.tenaga_kes || row.TenagaKes || {};
        return (
          <div className="flex flex-col py-1 font-jakarta">
            <span className="font-bold text-neutral-800 text-xs">{nakes.nama || nakes.Nama || row.diperiksa_oleh || row.DiperiksaOleh || 'Tidak Diketahui'}</span>
            <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider">{nakes.spesialisasi || nakes.Spesialisasi || '—'}</span>
          </div>
        )
      }
    },
    {
      key: 'tanggal',
      label: 'Pemeriksaan',
      className: 'w-[150px]',
      render: (v, row) => {
        const tanggalStr = row.tanggal || row.Tanggal;
        const formattedDate = tanggalStr ? new Date(tanggalStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        return (
          <div className="flex flex-col font-jakarta">
            <span className="font-bold text-xs text-neutral-800">{formattedDate}</span>
            <span className="text-[9px] text-neutral-400 font-bold uppercase mt-0.5">{row.jenis_pemeriksaan || row.JenisPemeriksaan || 'Screening'}</span>
          </div>
        )
      }
    },
    {
      key: 'hasil',
      label: 'Kondisi & Hasil',
      className: 'w-[180px]',
      render: (v, row) => {
        const kondisiStr = String(row.hasil_diagnosis || row.HasilDiagnosis || v || '').toLowerCase();
        const statKesehatan = row.status_kesehatan || row.StatusKesehatan;
        return (
          <div className="flex flex-col py-1 gap-1 font-jakarta">
            <Badge className={cn(
              'w-fit px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border shadow-none bg-neutral-50 text-neutral-600 border-neutral-200',
              kondisiStr.includes('sehat') && 'bg-emerald-50 text-emerald-600 border-emerald-100',
              kondisiStr.includes('pantauan') && 'bg-amber-50 text-amber-600 border-amber-100',
              kondisiStr.includes('perlu perhatian') && 'bg-rose-50 text-rose-600 border-rose-100'
            )}>
              Hasil: {row.hasil_diagnosis || row.HasilDiagnosis || v || '—'}
            </Badge>
            <Badge className={cn(
              'w-fit px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border bg-neutral-50 text-neutral-600 border-neutral-200 shadow-none',
              statKesehatan?.toLowerCase() === 'prima' && 'bg-emerald-50 text-emerald-600 border-emerald-100',
              statKesehatan?.toLowerCase() === 'stabil' && 'bg-blue-50 text-blue-600 border-blue-100',
              statKesehatan?.toLowerCase() === 'kritis' && 'bg-rose-50 text-rose-600 border-rose-100'
            )}>
              Kesehatan: {statKesehatan || '—'}
            </Badge>
          </div>
        )
      }
    },
    {
      key: 'tindakan_diberikan',
      label: 'Tindakan & Rekomendasi',
      className: 'w-[250px]',
      render: (v, row) => (
        <div className="flex flex-col py-1 max-w-[220px] font-jakarta">
          <span className="text-xs font-semibold text-neutral-800 truncate" title={v || row.TindakanDiberikan}>Tindakan: {v || row.TindakanDiberikan || '—'}</span>
          <span className="text-[10px] text-neutral-500 font-medium truncate mt-0.5" title={row.rekomendasi || row.Rekomendasi}>Rekomendasi: {row.rekomendasi || row.Rekomendasi || '—'}</span>
        </div>
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
        title="Rekam Medis &"
        highlightedTitle="Screening"
        subtitle="Log pemeriksaan fisik, vital signs, riwayat kesehatan klinis, tindakan pengobatan, serta saran rujukan medis."
        icon="medical_services"
        badges={[{ label: 'Klinik Kesehatan Kampus', active: false }]}
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
        <DataTable
          columns={medicalRecordColumns}
          data={records}
          loading={loading}
          searchPlaceholder="Cari Nama Mahasiswa, NIM, atau Diagnosa..."
          filters={[
            { key: '_semester', placeholder: 'Pilih Semester', options: semesterOptions },
            { key: 'status_kesehatan', placeholder: 'Pilih Status Kesehatan', options: [{ label: 'Prima', value: 'prima' }, { label: 'Stabil', value: 'stabil' }, { label: 'Pantauan', value: 'pantauan' }, { label: 'Kritis', value: 'kritis' }] }
          ]}
          actions={(row) => (
            <div className="flex items-center gap-1.5">
              <Button onClick={() => handleOpenDetail(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-bku-primary hover:bg-bku-primary/10 rounded-lg transition-colors" title="Lihat Detail"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >visibility</span></Button>
            </div>
          )}
        />
      </div>

      {/* ── Detail Rekam Medis / Screening Dialog ─────────────── */}
      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        icon="medical_services"
        title="Detail Pemeriksaan & Screening"
        description="Informasi lengkap hasil pemeriksaan fisik mahasiswa."
        subtitle="Medical Records"
        maxWidth="max-w-2xl"
        bodyClassName="p-6 md:p-8 space-y-6 font-jakarta max-h-[60vh] overflow-y-auto no-scrollbar"
        footer={<ModalCancelButton onClick={() => setIsDetailOpen(false)}>Tutup Detail</ModalCancelButton>}
      >
        {detailItem && (() => {
          const mhs = detailItem.mahasiswa || detailItem.Mahasiswa || {};
          const nakes = detailItem.tenaga_kes || detailItem.TenagaKes || {};
          const tanggalStr = detailItem.tanggal || detailItem.Tanggal;
          return (
            <>
              {/* Mahasiswa Info Card */}
              <div className="flex gap-4 p-4 bg-slate-50 border border-slate-200/50 rounded-2xl font-jakarta">
                <StudentAvatar
                  src={getCleanImageUrl(mhs.foto_url || mhs.FotoURL)}
                  name={mhs.Nama || mhs.nama}
                  className="w-14 h-14 rounded-xl border border-neutral-200"
                />
                <div className="flex flex-col justify-center">
                  <div className="text-sm font-bold text-neutral-800">{mhs.Nama || mhs.nama || '—'}</div>
                  <div className="text-xs text-neutral-400 font-bold mt-0.5">NIM: {mhs.NIM || mhs.nim || '—'}</div>
                  <div className="text-[10px] text-neutral-400 font-medium uppercase tracking-wide mt-0.5">
                    {mhs.program_studi?.nama || mhs.ProgramStudi?.Nama || '—'} • {mhs.fakultas?.Nama || mhs.fakultas?.nama || mhs.Fakultas?.Nama || '—'}
                  </div>
                </div>
              </div>

              {/* Vital Signs Grid */}
              <div className="font-jakarta">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#737373] mb-3">Tanda-Tanda Vital (Vital Signs)</div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white border p-3 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Suhu Tubuh</span>
                    <span className="text-base font-black text-neutral-800 mt-0.5">{detailItem.suhu_tubuh || detailItem.SuhuTubuh || '—'} °C</span>
                  </div>
                  <div className="bg-white border p-3 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Tekanan Darah</span>
                    <span className="text-base font-black text-neutral-800 mt-0.5">{detailItem.sistole || detailItem.Sistole || '—'}/{detailItem.diastole || detailItem.Diastole || '—'} mmHg</span>
                  </div>
                  <div className="bg-white border p-3 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Denyut Nadi</span>
                    <span className="text-base font-black text-neutral-800 mt-0.5">{detailItem.denyut_nadi || detailItem.DenyutNadi || '—'} bpm</span>
                  </div>
                  <div className="bg-white border p-3 rounded-xl flex flex-col justify-center">
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Saturasi Oksigen</span>
                    <span className="text-base font-black text-neutral-800 mt-0.5">{detailItem.spo2 || detailItem.SPO2 || '—'} %</span>
                  </div>
                </div>
              </div>

              {/* Physical Measurements */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-jakarta">
                <div className="border border-neutral-100 p-3.5 rounded-xl bg-neutral-50/20">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase">Tinggi Badan</span>
                  <div className="text-sm font-bold text-neutral-800 mt-1">{detailItem.tinggi_badan || detailItem.TinggiBadan || '—'} cm</div>
                </div>
                <div className="border border-neutral-100 p-3.5 rounded-xl bg-neutral-50/20">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase">Berat Badan</span>
                  <div className="text-sm font-bold text-neutral-800 mt-1">{detailItem.berat_badan || detailItem.BeratBadan || '—'} kg</div>
                </div>
                <div className="border border-neutral-100 p-3.5 rounded-xl bg-neutral-50/20">
                  <span className="text-[9px] font-bold text-neutral-400 uppercase">Golongan Darah</span>
                  <div className="text-sm font-bold text-neutral-800 mt-1">{detailItem.golongan_darah || detailItem.GolonganDarah || '—'}</div>
                </div>
              </div>

              {/* Clinical Details */}
              <div className="space-y-4 font-jakarta">
                <div className="text-[10px] font-black uppercase tracking-widest text-[#737373] border-b pb-1">Detail Diagnosis & Tindakan</div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Keluhan Pasien</span>
                    {parseCatatan(detailItem.catatan || detailItem.Catatan)}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Alergi Obat</span>
                    <p className="text-xs text-neutral-750 font-medium leading-relaxed mt-1">{detailItem.alergi_obat || detailItem.AlergiObat || 'Tidak Ada'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Tindakan Diberikan</span>
                    <p className="text-xs text-neutral-750 font-medium leading-relaxed mt-1">{detailItem.tindakan_diberikan || detailItem.TindakanDiberikan || 'Tidak Ada Tindakan Khusus'}</p>
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Obat Diberikan</span>
                    <p className="text-xs text-neutral-750 font-medium leading-relaxed mt-1">{detailItem.obat_diberikan || detailItem.ObatDiberikan || 'Tidak Ada Obat Diberikan'}</p>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-neutral-400 uppercase">Rekomendasi / Saran Medis</span>
                  <p className="text-xs text-neutral-750 font-medium leading-relaxed mt-1 bg-bku-primary/5 p-3 border border-bku-primary/20 rounded-xl">
                    {detailItem.rekomendasi || detailItem.Rekomendasi || 'Tidak Ada Saran Spesifik'}
                  </p>
                </div>
              </div>

              {/* Officer / Practitioner Info */}
              <div className="border-t pt-4 flex justify-between items-center text-neutral-400 text-[10px] font-medium font-jakarta">
                <span>Pemeriksa: <strong className="text-neutral-700">{nakes.nama || nakes.Nama || detailItem.diperiksa_oleh || detailItem.DiperiksaOleh || 'Tidak Diketahui'}</strong></span>
                <span>Tanggal Sesi: <strong className="text-neutral-700">{tanggalStr ? new Date(tanggalStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</strong></span>
              </div>
            </>
          )
        })()}
      </DialogModal>
    </PageContent>
  )
}
