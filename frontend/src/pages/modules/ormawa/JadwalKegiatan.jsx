"use client"
import React, { useState, useEffect } from 'react';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable'



import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { SelectField, SelectOption } from '@/components/ui/SelectField'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Calendar } from '@/components/ui/Calendar'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const CalendarMonthIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>calendar_month</span>;
const PendingIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>pending</span>;
const ScheduleIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const CheckCircleIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;

const STATUS_CFG = {
  terjadwal: { label: 'Terjadwal', cls: 'bg-blue-50 text-blue-700 border-blue-100/60 shadow-sm', icon: 'schedule' },
  berlangsung: { label: 'Berlangsung', cls: 'bg-amber-50 text-amber-700 border-amber-100/60 shadow-sm', icon: 'pending' },
  selesai: { label: 'Selesai', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100/60 shadow-sm', icon: 'check_circle' },
  dibatalkan: { label: 'Dibatalkan', cls: 'bg-rose-50 text-rose-700 border-rose-100/60 shadow-sm', icon: 'cancel' },
}

const formatRp = (n) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(n || 0)
}

const formatRupiahInput = (value) => {
  if (!value) return ''
  const numberString = value.toString().replace(/[^,\d]/g, '')
  const split = numberString.split(',')
  const sisa = split[0].length % 3
  let rupiah = split[0].substr(0, sisa)
  const ribuan = split[0].substr(sisa).match(/\d{3}/gi)

  if (ribuan) {
    const separator = sisa ? '.' : ''
    rupiah += separator + ribuan.join('.')
  }

  rupiah = split[1] !== undefined ? rupiah + ',' + split[1] : rupiah
  return rupiah
}

const parseRupiahInput = (value) => {
  if (!value) return 0
  return Number(value.toString().replace(/[^0-9]/g, ''))
}


export default function JadwalKegiatan() {
  const [data, setData] = useState([])
  const [proposals, setProposals] = useState([])
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedFilterDate, setSelectedFilterDate] = useState(null)
  const ormawaId = getOrmawaId()
  const { hasPermission } = usePermission()
  const [form, setForm] = useState({
    Judul: '',
    Deskripsi: '',
    TanggalMulai: '',
    TanggalSelesai: '',
    Lokasi: '',
    Status: 'terjadwal',
    OrmawaID: ormawaId,
    LandasanKegiatan: '',
    BentukKegiatan: '',
    Mitra: '',
    LatarBelakang: '',
    TujuanKegiatan: '',
    JadwalPelaksanaan: '',
    SasaranKegiatan: '',
    IndikatorKeberhasilan: '',
    SumberDana: '',
    EstimasiDana: '',
    PJKegiatan: ''
  })

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const [resEv, resProp, resAnn] = await Promise.all([
        fetchWithAuth(`${API}/events?ormawaId=${ormawaId}`),
        fetchWithAuth(`${API}/proposals?ormawaId=${ormawaId}`),
        fetchWithAuth(`${API}/announcements?ormawaId=${ormawaId}`)
      ])
      if (resEv.status === 'success') setData(resEv.data || [])
      if (resProp.status === 'success') setProposals(resProp.data || [])
      if (resAnn.status === 'success') setAnnouncements(resAnn.data || [])
    } catch {
      toast.error('Koneksi gagal')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [ormawaId])

  const handleOpenAdd = () => {
    setIsEditMode(false)
    setForm({
      Judul: '',
      Deskripsi: '',
      Lokasi: '',
      TanggalMulai: '',
      TanggalSelesai: '',
      Status: 'terjadwal',
      OrmawaID: ormawaId,
      LandasanKegiatan: '',
      BentukKegiatan: '',
      Mitra: '',
      LatarBelakang: '',
      TujuanKegiatan: '',
      JadwalPelaksanaan: '',
      SasaranKegiatan: '',
      IndikatorKeberhasilan: '',
      SumberDana: '',
      EstimasiDana: '',
      PJKegiatan: ''
    })
    setIsCrudOpen(true)
  }

  const handleOpenEdit = (row) => {
    setIsEditMode(true)
    setForm({
      ID: row.id || row.ID,
      Judul: row.Judul || row.judul || '',
      Deskripsi: row.Deskripsi || row.deskripsi || '',
      Lokasi: row.Lokasi || row.lokasi || '',
      TanggalMulai: row.TanggalMulai ? row.TanggalMulai.split('T')[0] : (row.tanggalMulai ? row.tanggalMulai.split('T')[0] : ''),
      TanggalSelesai: row.TanggalSelesai ? row.TanggalSelesai.split('T')[0] : (row.tanggalSelesai ? row.tanggalSelesai.split('T')[0] : ''),
      Status: row.Status || row.status || 'terjadwal',
      OrmawaID: ormawaId,

      LandasanKegiatan: row.LandasanKegiatan || row.landasan_kegiatan || '',
      BentukKegiatan: row.BentukKegiatan || row.bentuk_kegiatan || '',
      Mitra: row.Mitra || row.mitra || '',
      LatarBelakang: row.LatarBelakang || row.latar_belakang || '',
      TujuanKegiatan: row.TujuanKegiatan || row.tujuan_kegiatan || '',
      JadwalPelaksanaan: row.JadwalPelaksanaan || row.jadwal_pelaksanaan || '',
      SasaranKegiatan: row.SasaranKegiatan || row.sasaran_kegiatan || '',
      IndikatorKeberhasilan: row.IndikatorKeberhasilan || row.indikator_keberhasilan || '',
      SumberDana: row.SumberDana || row.sumber_dana || '',
      EstimasiDana: row.EstimasiDana || row.estimasi_dana || '',
      PJKegiatan: row.PJKegiatan || row.pj_kegiatan || '',
    })
    setIsCrudOpen(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()

    if (form.TanggalSelesai && new Date(form.TanggalSelesai) < new Date(form.TanggalMulai)) {
      toast.error('Tanggal selesai tidak boleh sebelum tanggal mulai')
      return
    }

    setIsSubmitting(true)
    const url = isEditMode ? `${API}/events/${form.ID || form.id}` : `${API}/events`
    const method = isEditMode ? 'PUT' : 'POST'
    const payload = {
      Judul: form.Judul,
      Deskripsi: form.Deskripsi,
      Lokasi: form.Lokasi,
      Status: form.Status,
      OrmawaID: Number(form.OrmawaID),
      EstimasiDana: Number(form.EstimasiDana || 0),
      TanggalMulai: form.TanggalMulai ? new Date(form.TanggalMulai).toISOString() : null,
      TanggalSelesai: form.TanggalSelesai ? new Date(form.TanggalSelesai).toISOString() : null,
      landasan_kegiatan: form.LandasanKegiatan,
      bentuk_kegiatan: form.BentukKegiatan,
      mitra: form.Mitra,
      latar_belakang: form.LatarBelakang,
      tujuan_kegiatan: form.TujuanKegiatan,
      jadwal_pelaksanaan: form.JadwalPelaksanaan,
      sasaran_kegiatan: form.SasaranKegiatan,
      indikator_keberhasilan: form.IndikatorKeberhasilan,
      sumber_dana: form.SumberDana,
      estimasi_dana: Number(form.EstimasiDana || 0),
      pj_kegiatan: form.PJKegiatan
    }
    try {
      const data = await fetchWithAuth(url, { method, body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } })
      if (data.status === 'success') {
        toast.success(isEditMode ? 'Kegiatan diperbarui' : 'Kegiatan dijadwalkan')
        setIsCrudOpen(false)
        fetchEvents()
      } else {
        toast.error(data.message || 'Gagal menyimpan')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const data = await fetchWithAuth(`${API}/events/${selected.id || selected.ID}`, { method: 'DELETE' })
      if (data.status === 'success') {
        toast.success('Kegiatan dibatalkan')
        setIsDelOpen(false)
        fetchEvents()
      } else {
        toast.error('Gagal menghapus')
      }
    } catch {
      toast.error('Terjadi kesalahan')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'Judul',
      label: 'Nama Kegiatan',
      className: 'min-w-[280px]',
      render: (v, row) => (
        <div className="flex flex-col leading-none gap-1">
          <span className="font-bold text-[var(--theme-text)] font-headline tracking-tighter text-[13px]">{v || '—'}</span>
          <span className="text-[10px] text-[var(--theme-text-subtle)] font-semibold tracking-tight font-mono flex items-center gap-1">
            <span className="material-symbols-outlined normal-case" style={{ fontSize: '11px' }}>location_on</span>
            <span>{row.Lokasi || 'Belum ditentukan'}</span>
          </span>
        </div>
      )
    },
    {
      key: 'TanggalMulai',
      label: 'Jadwal Pelaksanaan',
      className: 'w-[240px]',
      render: (v, row) => {
        const start = v || row.tanggalMulai
        const end = row.TanggalSelesai || row.tanggalSelesai
        return (
          <div className="flex flex-col leading-none gap-1">
            <span className="font-bold text-[var(--theme-text)] font-headline text-[11px]">
              {start ? new Date(start).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
            </span>
            {end && (
              <span className="text-[9px] text-[var(--theme-text-subtle)] font-bold tracking-wider uppercase">
                s/d {new Date(end).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        )
      }
    },
    {
      key: 'Status',
      label: 'Status Agenda',
      className: 'w-[160px] text-center',
      cellClassName: 'text-center',
      render: (v) => {
        const cfg = STATUS_CFG[v] || { label: v, cls: 'bg-[var(--theme-bg)] text-[var(--theme-text-subtle)]', icon: 'info' }
        return (
          <div className="flex justify-center">
            <Badge className={cn('font-semibold text-[9px] tracking-wider uppercase px-2.5 py-1 border-none shadow-none flex items-center gap-1 w-max mx-auto rounded-full', cfg.cls)}>
              <span className="material-symbols-outlined normal-case" style={{ fontSize: '11px' }}>{cfg.icon}</span>
              <span>{cfg.label}</span>
            </Badge>
          </div>
        )
      }
    }
  ]

  const totalEvents = data.length
  const activeEvents = data.filter(e => (e.Status || e.status) === 'berlangsung').length
  const upcomingEvents = data.filter(e => (e.Status || e.status) === 'terjadwal').length
  const completedEvents = data.filter(e => (e.Status || e.status) === 'selesai').length

  const eventDates = React.useMemo(() => {
    const dates = [];
    data.forEach(d => {
      const dStr = d.TanggalMulai || d.tanggalMulai;
      if (dStr) dates.push(new Date(dStr));
    });
    proposals.forEach(p => {
      const pStr = p.TanggalKegiatan || p.tanggal_kegiatan || p.CreatedAt || p.created_at;
      if (pStr) dates.push(new Date(pStr));
    });
    announcements.forEach(a => {
      const aStr = a.TanggalMulai || a.CreatedAt || a.created_at || a.createdat;
      if (aStr) dates.push(new Date(aStr));
    });
    return dates;
  }, [data, proposals, announcements]);

  const modifiers = {
    event: eventDates,
  }

  const modifiersClassNames = {
    event: 'has-events after:content-[""] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-[var(--theme-primary)] after:rounded-full font-bold [&:not([data-selected-single=true])]:text-[var(--theme-primary)] [&:not([data-selected-single=true])]:bg-[var(--theme-primary)]/5',
  }

  const displayedData = React.useMemo(() => {
    if (!selectedFilterDate) return data;
    return data.filter(d => {
      const startStr = d.TanggalMulai || d.tanggalMulai;
      const endStr = d.TanggalSelesai || d.tanggalSelesai;

      if (!startStr || String(startStr).startsWith('0001')) return false;

      const start = new Date(startStr);
      const end = (endStr && !String(endStr).startsWith('0001')) ? new Date(endStr) : start;

      const target = new Date(selectedFilterDate);
      target.setHours(0, 0, 0, 0);

      const s = new Date(start);
      s.setHours(0, 0, 0, 0);

      const e = new Date(end);
      e.setHours(23, 59, 59, 999);

      return target >= s && target <= e;
    });
  }, [data, selectedFilterDate]);

  const selectedDateEvents = React.useMemo(() => {
    if (!selectedFilterDate) return [];

    const target = new Date(selectedFilterDate);
    target.setHours(0, 0, 0, 0);

    const isMatch = (startStr, endStr) => {
      if (!startStr || String(startStr).startsWith('0001')) return false;
      const s = new Date(startStr);
      s.setHours(0, 0, 0, 0);
      const e = (endStr && !String(endStr).startsWith('0001')) ? new Date(endStr) : new Date(s);
      e.setHours(23, 59, 59, 999);
      return target >= s && target <= e;
    };

    const evs = data.filter(d => isMatch(d.TanggalMulai || d.tanggalMulai, d.TanggalSelesai || d.tanggalSelesai)).map(d => ({ ...d, typeLabel: 'Kegiatan', typeCls: 'bg-blue-100 text-blue-700' }));
    const props = proposals.filter(p => isMatch(p.TanggalKegiatan || p.tanggal_kegiatan || p.CreatedAt || p.created_at, null)).map(p => ({ ...p, Judul: p.JudulKegiatan || p.judul_kegiatan || 'Proposal', typeLabel: 'Proposal', typeCls: 'bg-amber-100 text-amber-700' }));
    const anns = announcements.filter(a => isMatch(a.TanggalMulai || a.CreatedAt || a.created_at || a.createdat, a.TanggalSelesai)).map(a => ({ ...a, typeLabel: 'Pengumuman', typeCls: 'bg-emerald-100 text-emerald-700' }));

    return [...evs, ...props, ...anns];
  }, [data, proposals, announcements, selectedFilterDate]);

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Jadwal"
        highlightedTitle="Kegiatan"
        subtitle="Manajemen agenda operasional, sinkronisasi jadwal kegiatan, serta pemantauan jadwal program kerja rutin ormawa."
        icon="event_note"
        badges={[{ label: 'Kalender Organisasi', active: true }]}
        actions={hasPermission('ormawa.events.create') && (
          <Button
            onClick={handleOpenAdd}
            className="h-11 px-6 rounded-xl bg-slate-800 text-white font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-none border-none cursor-pointer"
          >
            <span className="material-symbols-outlined normal-case text-[16px] stroke-[3px]">add</span> Tambah Kegiatan Baru
          </Button>
        )}
      />

      {/* ── Stats Overview ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <PrimaryStatsCard
          title="Total Kegiatan"
          value={totalEvents}
          icon={CalendarMonthIcon}
          colorTheme="info"
          badgeText="Semua Agenda"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">list_alt</span>}
        />

        <PrimaryStatsCard
          title="Berlangsung"
          value={activeEvents}
          icon={PendingIcon}
          colorTheme="warning"
          badgeText="Saat ini"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">update</span>}
        />

        <PrimaryStatsCard
          title="Terjadwal"
          value={upcomingEvents}
          icon={ScheduleIcon}
          colorTheme="primary"
          badgeText="Akan Datang"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">event_upcoming</span>}
        />

        <PrimaryStatsCard
          title="Selesai"
          value={completedEvents}
          icon={CheckCircleIcon}
          colorTheme="success"
          badgeText="Tuntas"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">task_alt</span>}
        />
      </div>

      {/* ── Content Area ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mt-4">
        <Card className="xl:col-span-1 glass-card shadow-sm rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-150 h-fit">
          <CardHeader className="bg-slate-50/50 border-b border-border p-5 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-black font-headline tracking-tight uppercase flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
              Kalender Kegiatan
            </CardTitle>
            {selectedFilterDate && (
              <Button variant="ghost" size="sm" onClick={() => setSelectedFilterDate(null)} className="h-7 text-[10px] uppercase tracking-wider text-rose-500 hover:text-rose-600 hover:bg-rose-50 px-2 rounded-lg font-bold">
                Reset Filter
              </Button>
            )}
          </CardHeader>
          <CardContent className="p-3 sm:p-4 flex flex-col items-center w-full">
            <div className="w-full flex justify-center pb-2">
              <Calendar
                mode="single"
                selected={selectedFilterDate}
                onSelect={setSelectedFilterDate}
                modifiers={modifiers}
                modifiersClassNames={modifiersClassNames}
                className="w-fit rounded-2xl border border-[var(--theme-border)] shadow-sm p-4 bg-[var(--theme-bg)]"
              />
            </div>
            {selectedFilterDate && (
              <div className="w-full mt-4 flex flex-col gap-2">
                <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 border-b border-slate-100 pb-2 text-center">
                  Acara pada {new Date(selectedFilterDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
                </h4>
                <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 no-scrollbar">
                  {selectedDateEvents.length > 0 ? selectedDateEvents.map((d, idx) => (
                    <div key={idx} onClick={() => { if (d.typeLabel === 'Kegiatan') { setSelected(d); setIsDetailOpen(true); } }} className={cn("bg-slate-50 border border-slate-100 rounded-lg p-3 text-left transition-colors", d.typeLabel === 'Kegiatan' ? 'hover:bg-slate-100 cursor-pointer' : '')}>
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={cn('text-[8px] px-1.5 py-0 uppercase border-none tracking-wider', d.typeCls)}>{d.typeLabel}</Badge>
                      </div>
                      <p className="text-xs font-bold text-slate-800 leading-tight">{d.Judul || d.judul}</p>
                      {d.Lokasi && (
                        <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">location_on</span>
                          {d.Lokasi || d.lokasi || 'Belum ditentukan'}
                        </p>
                      )}
                    </div>
                  )) : (
                    <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">Tidak ada agenda</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2 glass-card shadow-sm rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-300">
          <CardContent className="p-0">
            <DataTable
            title="Daftar Kegiatan"
            subtitle="Menampilkan daftar kegiatan yang akan datang."
              columns={columns}
              data={displayedData}
              loading={loading}
              searchPlaceholder="Cari nama atau lokasi kegiatan..."
              filters={[{ key: 'Status', placeholder: 'Filter Status', options: Object.entries(STATUS_CFG).map(([v, { label }]) => ({ label, value: v })) }]}
              actions={(row) => (
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => { setSelected(row); setIsDetailOpen(true) }} title="Detail"><span className="material-symbols-outlined block" style={{ fontSize: '18px' }}>visibility</span></Button>
                  {hasPermission('ormawa.events.update') && (
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(row)} title="Edit"><span className="material-symbols-outlined block text-[var(--theme-warning)]" style={{ fontSize: '18px' }}>edit</span></Button>
                  )}
                  {hasPermission('ormawa.events.delete') && (
                    <Button variant="ghost" size="icon" onClick={() => { setSelected(row); setIsDelOpen(true) }} title="Hapus"><span className="material-symbols-outlined block text-[var(--theme-error)]" style={{ fontSize: '18px' }}>delete</span></Button>
                  )}
                </div>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <DialogModal
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        title={selected?.Judul || "Detail Agenda"}
        subtitle="DETAIL AGENDA"
        description="Informasi rincian jadwal dan rencana agenda."
        icon="calendar_today"
        maxWidth="max-w-4xl"
        bodyClassName="p-0"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsDetailOpen(false)}>
              Tutup
            </ModalCancelButton>
            <Button onClick={() => { setIsDetailOpen(false); handleOpenEdit(selected) }} className="text-[11px] font-bold tracking-wider h-11 px-8 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-sm active:scale-95 transition-all flex items-center gap-1.5 border-none">
              <span className="material-symbols-outlined normal-case text-[16px]">edit</span> Edit Agenda
            </Button>
          </>
        }
      >
        {selected && (
          <div className="flex flex-col">
            <div className="flex items-center justify-between gap-4 p-6 sm:p-8 border-b border-[var(--theme-border)]">
              <div className="space-y-1">
                <h2 className="text-xl font-bold font-headline tracking-tight text-[var(--theme-text)]">{selected.Judul}</h2>
              </div>
              <Badge className={cn('font-bold text-[10px] tracking-wider uppercase px-2.5 py-1 border-none flex items-center gap-1 shadow-sm', STATUS_CFG[selected.Status]?.cls || 'bg-slate-50 text-slate-650')}>
                <span className="material-symbols-outlined normal-case text-[12px]">{STATUS_CFG[selected.Status]?.icon || 'info'}</span>
                <span>{STATUS_CFG[selected.Status]?.label || 'Terjadwal'}</span>
              </Badge>
            </div>

            {/* Quick Info Grid */}
            <div className="p-6 sm:p-8 space-y-6 bg-[var(--theme-bg)]/30">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text-muted)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined normal-case" style={{ fontSize: '20px' }}>calendar_today</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] tracking-wider uppercase">Mulai Pelaksanaan</p>
                    <p className="text-[13px] font-bold text-[var(--theme-text)] font-headline mt-0.5">
                      {selected.TanggalMulai ? new Date(selected.TanggalMulai).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text-muted)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined normal-case" style={{ fontSize: '20px' }}>event_available</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] tracking-wider uppercase">Selesai Pelaksanaan</p>
                    <p className="text-[13px] font-bold text-[var(--theme-text)] font-headline mt-0.5">
                      {selected.TanggalSelesai ? new Date(selected.TanggalSelesai).toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text-muted)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined normal-case" style={{ fontSize: '20px' }}>location_on</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] tracking-wider uppercase">Lokasi Kegiatan</p>
                    <p className="text-[13px] font-bold text-[var(--theme-text)] font-headline mt-0.5">
                      {selected.Lokasi || 'Belum ditentukan'}
                    </p>
                  </div>
                </div>

                <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 flex items-center gap-3.5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-[var(--theme-bg)] text-[var(--theme-text-muted)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined normal-case" style={{ fontSize: '20px' }}>payments</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] tracking-wider uppercase">Estimasi Dana</p>
                    <p className="text-[13px] font-bold text-[var(--theme-success)] font-headline mt-0.5">
                      {selected.EstimasiDana || selected.estimasi_dana ? formatRp(selected.EstimasiDana || selected.estimasi_dana) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Detail Fields Grid */}
              <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-6 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-wider font-headline">Informasi Detail Kegiatan</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Landasan Kegiatan</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.LandasanKegiatan || selected.landasan_kegiatan || "—"}</p>
                  </div>
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Bentuk Kegiatan</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.BentukKegiatan || selected.bentuk_kegiatan || "—"}</p>
                  </div>
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Mitra Kerja</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.Mitra || selected.mitra || "—"}</p>
                  </div>
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">PJ Kegiatan</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.PJKegiatan || selected.pj_kegiatan || "—"}</p>
                  </div>
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Jadwal Pelaksanaan</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.JadwalPelaksanaan || selected.jadwal_pelaksanaan || "—"}</p>
                  </div>
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Sasaran Kegiatan</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.SasaranKegiatan || selected.sasaran_kegiatan || "—"}</p>
                  </div>
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Sumber Dana</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.SumberDana || selected.sumber_dana || "—"}</p>
                  </div>
                  <div className="bg-[var(--theme-bg)] p-3 rounded-xl border border-[var(--theme-border)] space-y-1">
                    <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Indikator Keberhasilan</p>
                    <p className="font-bold text-[var(--theme-text)]">{selected.IndikatorKeberhasilan || selected.indikator_keberhasilan || "—"}</p>
                  </div>
                </div>

                <div className="bg-[var(--theme-bg)] p-4 rounded-xl border border-[var(--theme-border)] space-y-1.5 text-xs text-[var(--theme-text)]">
                  <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Latar Belakang</p>
                  <p className="font-medium leading-relaxed whitespace-pre-line">{selected.LatarBelakang || selected.latar_belakang || "—"}</p>
                </div>

                <div className="bg-[var(--theme-bg)] p-4 rounded-xl border border-[var(--theme-border)] space-y-1.5 text-xs text-[var(--theme-text)]">
                  <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Tujuan Kegiatan</p>
                  <p className="font-medium leading-relaxed whitespace-pre-line">{selected.TujuanKegiatan || selected.tujuan_kegiatan || "—"}</p>
                </div>

                <div className="bg-[var(--theme-bg)] p-4 rounded-xl border border-[var(--theme-border)] space-y-1.5 text-xs text-[var(--theme-text)]">
                  <p className="text-[10px] font-bold text-[var(--theme-text-subtle)] uppercase tracking-wider">Deskripsi Kegiatan</p>
                  <p className="font-medium leading-relaxed whitespace-pre-line">{selected.Deskripsi || selected.deskripsi || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </DialogModal>

      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        title={isEditMode ? 'Edit Kegiatan' : 'Jadwalkan Kegiatan'}
        description="Tambahkan agenda dan jadwal pelaksanaan kegiatan resmi organisasi."
        icon={isEditMode ? "edit" : "calendar_add_on"}
        maxWidth="max-w-3xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} disabled={isSubmitting} />
            <ModalSaveButton loading={isSubmitting} label={isEditMode ? 'Simpan Perubahan' : 'Jadwalkan'} onClick={handleSave} />
          </>
        }
      >
        <form id="crud-form" onSubmit={handleSave} className="flex flex-col">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Nama Kegiatan</Label>
              <Input
                required
                value={form.Judul}
                onChange={e => setForm({ ...form, Judul: e.target.value })}
                placeholder="Contoh: Pekan Olahraga Mahasiswa..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Landasan Kegiatan *</Label>
                <Input
                  required
                  value={form.LandasanKegiatan}
                  onChange={e => setForm({ ...form, LandasanKegiatan: e.target.value })}
                  placeholder="Contoh: Program Kerja Himpunan 2026..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Bentuk Kegiatan</Label>
                <Input
                  value={form.BentukKegiatan}
                  onChange={e => setForm({ ...form, BentukKegiatan: e.target.value })}
                  placeholder="Contoh: Kompetisi & Seminar..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Mitra **</Label>
                <Input
                  value={form.Mitra}
                  onChange={e => setForm({ ...form, Mitra: e.target.value })}
                  placeholder="Contoh: PT. Djarum, Pemda..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">PJ Kegiatan</Label>
                <Input
                  value={form.PJKegiatan}
                  onChange={e => setForm({ ...form, PJKegiatan: e.target.value })}
                  placeholder="Contoh: Budi Santoso (Ketua Panitia)..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Jadwal Pelaksanaan (Hari, Waktu)</Label>
                <Input
                  value={form.JadwalPelaksanaan}
                  onChange={e => setForm({ ...form, JadwalPelaksanaan: e.target.value })}
                  placeholder="Contoh: Senin, 15 Juli 2026, 09.00 - 15.00 WIB..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Sasaran Kegiatan</Label>
                <Input
                  value={form.SasaranKegiatan}
                  onChange={e => setForm({ ...form, SasaranKegiatan: e.target.value })}
                  placeholder="Contoh: Seluruh Mahasiswa Fakultas Teknik..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Sumber Dana</Label>
                <Input
                  value={form.SumberDana}
                  onChange={e => setForm({ ...form, SumberDana: e.target.value })}
                  placeholder="Contoh: Dana Kemahasiswaan & Sponsor..."
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Indikator Keberhasilan</Label>
                <Input
                  value={form.IndikatorKeberhasilan}
                  onChange={e => setForm({ ...form, IndikatorKeberhasilan: e.target.value })}
                  placeholder="Contoh: Target 200 Peserta Hadir..."
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Estimasi Dana (Rp)</Label>
                <Input
                  required
                  type="text"
                  value={formatRupiahInput(form.EstimasiDana)}
                  onChange={e => {
                    const rawVal = parseRupiahInput(e.target.value)
                    setForm({ ...form, EstimasiDana: rawVal })
                  }}
                  placeholder="Cth: 10.000.000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Status Agenda</Label>
                <SelectField
                  value={form.Status}
                  onValueChange={val => setForm({ ...form, Status: val })}
                >
                  {Object.entries(STATUS_CFG).map(([v, { label }]) => (
                    <SelectOption key={v} value={v}>{label}</SelectOption>
                  ))}
                </SelectField>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Tanggal Mulai</Label>
                <Input
                  required
                  type="date"
                  value={form.TanggalMulai}
                  onChange={e => setForm({ ...form, TanggalMulai: e.target.value })}
                  className="cursor-pointer"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Tanggal Selesai</Label>
                <Input
                  type="date"
                  value={form.TanggalSelesai}
                  onChange={e => setForm({ ...form, TanggalSelesai: e.target.value })}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Lokasi Kegiatan</Label>
              <Input
                value={form.Lokasi}
                onChange={e => setForm({ ...form, Lokasi: e.target.value })}
                placeholder="Contoh: Gedung Rektorat Lt. 3..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Latar Belakang</Label>
              <Textarea
                value={form.LatarBelakang}
                onChange={e => setForm({ ...form, LatarBelakang: e.target.value })}
                placeholder="Deskripsikan latar belakang pengajuan kegiatan..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Tujuan Kegiatan</Label>
              <Textarea
                value={form.TujuanKegiatan}
                onChange={e => setForm({ ...form, TujuanKegiatan: e.target.value })}
                placeholder="Deskripsikan tujuan dari kegiatan..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold text-[var(--theme-text-subtle)] uppercase">Deskripsi Detail Kegiatan</Label>
              <Textarea
                value={form.Deskripsi}
                onChange={e => setForm({ ...form, Deskripsi: e.target.value })}
                placeholder="Deskripsikan rincian detail/mekanisme kegiatan..."
                className="min-h-[80px]"
              />
            </div>
          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal isOpen={isDelOpen} onClose={() => setIsDelOpen(false)} onConfirm={handleDelete}
        title="Hapus Kegiatan?" description="Data kegiatan ini akan dihapus permanen dari jadwal." loading={isSubmitting} />
    </PageContent>
  )
}
