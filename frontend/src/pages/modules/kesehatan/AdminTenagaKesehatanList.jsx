"use client"

import React, { useState, useEffect } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { SelectField, SelectOption } from '@/components/ui/SelectField'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService, API_BASE_URL } from '@/services/api'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

// Fallback Icons
const MedicalServices = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>medical_services</span>;

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

const SERVICE_TYPES = [
  'Pemeriksaan Umum',
  'Konsultasi Gizi',
  'Screening Khusus',
  'Pemeriksaan Gigi',
  'Rujukan Eksternal',
  'Lainnya'
];

const REPEAT_DAYS_OPTIONS = [
  { label: 'Senin', value: 'Monday' },
  { label: 'Selasa', value: 'Tuesday' },
  { label: 'Rabu', value: 'Wednesday' },
  { label: 'Kamis', value: 'Thursday' },
  { label: 'Jumat', value: 'Friday' },
  { label: 'Sabtu', value: 'Saturday' },
  { label: 'Minggu', value: 'Sunday' }
];

export default function TenagaKesehatanList() {
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [addForm, setAddForm] = useState({ Nama: '', Email: '', Password: '' })
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Schedule Management States
  const [isScheduleOpen, setIsScheduleOpen] = useState(false)
  const [scheduleData, setScheduleData] = useState([])
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [isSavingSchedule, setIsSavingSchedule] = useState(false)
  const [selectedDay, setSelectedDay] = useState('Senin')

  const defaultSchedule = [
    { day: 'Senin', enabled: false, slots: [] },
    { day: 'Selasa', enabled: false, slots: [] },
    { day: 'Rabu', enabled: false, slots: [] },
    { day: 'Kamis', enabled: false, slots: [] },
    { day: 'Jumat', enabled: false, slots: [] },
    { day: 'Sabtu', enabled: false, slots: [] },
    { day: 'Minggu', enabled: false, slots: [] }
  ]

  const dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

  const getEnglishDay = (dayName) => {
    const map = { 'Minggu': 'Sunday', 'Senin': 'Monday', 'Selasa': 'Tuesday', 'Rabu': 'Wednesday', 'Kamis': 'Thursday', 'Jumat': 'Friday', 'Sabtu': 'Saturday' }
    return map[dayName] || 'Monday'
  }

  const getNextDateForDay = (dayName) => {
    const dayMap = { 'Minggu': 0, 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 }
    const target = dayMap[dayName]
    const d = new Date()
    d.setDate(d.getDate() + ((target + 7 - d.getDay()) % 7))
    return d.toISOString().split('T')[0]
  }

  const toMinutes = (timeStr) => {
    if (!timeStr) return 0
    const [h, m] = timeStr.split(':').map(Number)
    return h * 60 + m
  }

  const normalizeSchedule = (apiData) => {
    const grouped = defaultSchedule.map(g => ({ ...g, slots: [] }))
    
    // Group slots by day
    apiData.forEach(sch => {
      const dateObj = new Date(sch.tanggal)
      const dayName = dayNames[dateObj.getDay()]
      const group = grouped.find(g => g.day === dayName)
      if (group) {
        group.enabled = true
        group.slots.push({
          id: sch.id,
          kategori: sch.tipe_layanan,
          start: sch.jam_mulai,
          end: sch.jam_selesai,
          lokasi: sch.lokasi,
          kuota: sch.kuota || 1
        })
      }
    })
    return grouped
  }

  const [form, setForm] = useState({
    ID: '', Nama: '', Spesialisasi: 'Pemeriksaan Umum', Lokasi: 'Klinik Kampus BKU', IsAktif: true,
    Email: '', NoHP: '', FotoURL: ''
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const tkRes = await adminService.getAllTenagaKesehatan()
      if (tkRes.status === 'success') setData(tkRes.data || [])
      else toast.error('Gagal memuat data tenaga kesehatan')
    } catch (err) {
      console.error(err)
      toast.error('Koneksi sistem terputus / Gagal memuat data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleOpenEdit = (row) => {
    setForm({
      ID: row.id || row.ID,
      Nama: row.nama || '',
      Spesialisasi: row.spesialisasi || 'Pemeriksaan Umum',
      Lokasi: row.lokasi || 'Klinik Kampus BKU',
      IsAktif: row.is_aktif ?? true,
      Email: row.email || '',
      NoHP: row.no_hp || '',
      FotoURL: row.foto_url || row.FotoURL || ''
    })
    setIsEditOpen(true)
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        nama: form.Nama,
        spesialisasi: form.Spesialisasi,
        lokasi: form.Lokasi,
        is_aktif: form.IsAktif,
        email: form.Email,
        no_hp: form.NoHP,
        foto_url: form.FotoURL
      }
      const targetId = form.ID || form.id
      const res = await adminService.updateTenagaKesehatan(targetId, payload)
      if (res.status === 'success') {
        toast.success('Profil Tenaga Medis diperbarui')
        setIsEditOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menyimpan data')
      }
    } catch { toast.error('Terjadi kesalahan sistem') } finally { setIsSubmitting(false) }
  }

  const handleAdd = async (e) => {
    if (e) e.preventDefault()
    setIsSubmitting(true)
    try {
      const payload = {
        Role: 'tenaga_kesehatan',
        Nama: addForm.Nama,
        Email: addForm.Email,
        Password: addForm.Password
      }
      const res = await adminService.createUser(payload)
      if (res.status === 'success') {
        toast.success('Tenaga Medis baru berhasil didaftarkan')
        setIsAddOpen(false)
        setAddForm({ Nama: '', Email: '', Password: '' })
        fetchData()
      } else {
        toast.error(res.message || 'Gagal mendaftarkan tenaga medis')
      }
    } catch (err) {
      toast.error(err?.message || 'Terjadi kesalahan sistem')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      await adminService.deleteTenagaKesehatan(selected.id || selected.ID)
      toast.success('Tenaga Medis berhasil dihapus')
      setIsDelOpen(false)
      fetchData()
    } catch { toast.error('Gagal menghapus data') } finally { setIsSubmitting(false) }
  }

  // Schedule Management Handlers
  const handleOpenSchedule = async (row) => {
    setSelected(row)
    setIsScheduleOpen(true)
    setScheduleLoading(true)
    try {
      const res = await adminService.getTenagaKesehatanSchedules(row.id || row.ID)
      if (res.status === 'success') {
        setScheduleData(normalizeSchedule(res.data || []))
      } else {
        toast.error('Gagal memuat jadwal')
      }
    } catch (err) {
      console.error(err)
      toast.error('Gagal memuat jadwal')
    } finally {
      setScheduleLoading(false)
    }
  }

  const loadSchedules = async (tkId) => {
    setScheduleLoading(true)
    try {
      const res = await adminService.getTenagaKesehatanSchedules(tkId)
      if (res.status === 'success') {
        setScheduleData(normalizeSchedule(res.data || []))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setScheduleLoading(false)
    }
  }

  const resetScheduleChanges = () => {
    if (selected) {
      loadSchedules(selected.id || selected.ID)
    }
  }

  const toggleDay = (dayName) => {
    setScheduleData(prev => prev.map(d => {
      if (d.day === dayName) {
        return { ...d, enabled: !d.enabled }
      }
      return d
    }))
  }

  const addSlot = (dayName) => {
    setScheduleData(prev => prev.map(d => {
      if (d.day === dayName) {
        return {
          ...d,
          slots: [...d.slots, { kategori: 'Pemeriksaan Umum', start: '08:00', end: '12:00', lokasi: 'Klinik Kampus BKU', kuota: 10 }]
        }
      }
      return d
    }))
  }

  const removeSlot = (dayName, idx) => {
    setScheduleData(prev => prev.map(d => {
      if (d.day === dayName) {
        return {
          ...d,
          slots: d.slots.filter((_, i) => i !== idx)
        }
      }
      return d
    }))
  }

  const updateSlot = (dayName, idx, field, val) => {
    setScheduleData(prev => prev.map(d => {
      if (d.day === dayName) {
        const slots = [...d.slots]
        slots[idx] = { ...slots[idx], [field]: val }
        return { ...d, slots }
      }
      return d
    }))
  }

  const saveSchedule = async () => {
    let hasError = false;
    scheduleData.forEach((day) => {
      if (day.enabled) {
        day.slots.forEach((slot) => {
          if (toMinutes(slot.end) <= toMinutes(slot.start)) {
            hasError = true;
          }
        });
      }
    });

    if (hasError) {
      toast.error('Gagal menyimpan. Harap pastikan jam selesai diatur setelah jam mulai pada setiap slot.');
      return;
    }

    setIsSavingSchedule(true)
    try {
      const tkId = selected.id || selected.ID;
      
      const currentRes = await adminService.getTenagaKesehatanSchedules(tkId);
      const currentSlots = currentRes.data || [];
      const currentIds = currentSlots.map(s => s.id);

      const desiredIds = [];
      const createPromises = [];
      const updatePromises = [];

      for (const dayGrp of scheduleData) {
        if (dayGrp.enabled) {
          for (const slot of dayGrp.slots) {
            const nextDate = getNextDateForDay(dayGrp.day);
            const payload = {
              tanggal: nextDate,
              jam_mulai: slot.start,
              jam_selesai: slot.end,
              kuota: Number(slot.kuota),
              lokasi: slot.lokasi,
              tipe_layanan: slot.kategori,
              catatan: '',
              is_repeat: true,
              repeat_days: getEnglishDay(dayGrp.day)
            };

            if (slot.id) {
              desiredIds.push(slot.id);
              updatePromises.push(adminService.updateTenagaKesehatanSchedule(slot.id, payload));
            } else {
              createPromises.push(adminService.createTenagaKesehatanSchedule(tkId, payload));
            }
          }
        }
      }

      const deletePromises = currentIds
        .filter(id => !desiredIds.includes(id))
        .map(id => adminService.deleteTenagaKesehatanSchedule(id));

      await Promise.all([...createPromises, ...updatePromises, ...deletePromises]);

      toast.success('Jadwal operasional tenaga medis berhasil diperbarui');
      setIsScheduleOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setIsSavingSchedule(false);
    }
  }

  const currentDayData = scheduleData.find(d => d.day === selectedDay) || { enabled: false, slots: [] }

  const columns = [
    {
      key: 'nama',
      label: 'Nama Tenaga Medis',
      className: 'w-[300px]',
      render: (v, row) => (
        <div className="flex items-center gap-4 py-2 group/avatar">
          <StudentAvatar
            src={getCleanImageUrl(row.FotoURL || row.foto_url)}
            name={v}
            className="w-11 h-11 rounded-xl border-2 border-white shadow-md transition-all group-hover/avatar:scale-110"
          />
          <div className="flex flex-col">
            <span className="font-bold text-neutral-900 font-jakarta tracking-tight text-[14px] leading-tight">
              {v ? v.toLowerCase().replace(/\b\w/g, s => s.toUpperCase()) : '—'}
            </span>
            <div className="flex items-center gap-1.5 mt-1 text-neutral-400">
              <MedicalServices size={10} className="text-bku-primary/60" />
              <span className="text-[10px] font-bold tracking-widest uppercase">{row.spesialisasi || 'Tenaga Medis'}</span>
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'email',
      label: 'Kontak',
      className: 'w-[250px]',
      render: (v, row) => (
        <div className="flex flex-col text-neutral-500 gap-0.5 font-jakarta">
          <span className="text-xs font-semibold text-neutral-800">{v || '—'}</span>
          <span className="text-[10px] font-medium text-neutral-400">{row.no_hp || '—'}</span>
        </div>
      )
    },
    {
      key: 'lokasi',
      label: 'Lokasi Pemeriksaan',
      className: 'w-[250px]',
      render: v => (
        <div className="flex items-center gap-2 text-neutral-500">
          <span className="material-symbols-outlined text-neutral-400" style={{ fontSize: '12px' }} >location_on</span>
          <span className="text-[12px] font-medium truncate font-jakarta" title={v}>{v || 'Klinik Kampus BKU'}</span>
        </div>
      )
    },
    {
      key: 'is_aktif',
      label: 'Status',
      className: 'w-[140px] text-center',
      cellClassName: 'text-center pr-4',
      render: v => (
        <Badge className={cn(
          'px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase tracking-wider shadow-none font-jakarta',
          v ? 'bg-success/10 text-success border-success/20' : 'bg-rose-50 text-rose-600 border-rose-100'
        )}>
          {v ? 'Aktif Tugas' : 'Non-Aktif'}
        </Badge>
      )
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Direktori"
        highlightedTitle="Tenaga Medis"
        subtitle="Manajemen data dokter, perawat, bidang keahlian spesialisasi, lokasi klinik, serta pengelolaan jadwal operasional."
        icon="verified_user"
        badges={[{ label: 'Klinik Kesehatan Kampus', active: false }]}
        actions={
          <div className="px-4 py-2 bg-bku-primary/5 border border-bku-primary/20 rounded-xl flex items-center gap-3 w-full lg:w-auto justify-center">
            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '16px' }}>verified_user</span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-bold text-bku-primary/70 uppercase tracking-widest">Akses Validasi</span>
              <span className="text-[12px] font-bold text-bku-primary font-jakarta">Super Admin Portal</span>
            </div>
          </div>
        }
      />

      {/* ── Table Section ────────────────────────────────────────── */}
      <Card className="glass-card shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0 animate-in fade-in duration-300">
          <DataTable
            columns={columns}
            data={data}
            loading={loading}
            searchPlaceholder="Cari Nama atau Spesialisasi..."
            onAdd={() => {
              setAddForm({ Nama: '', Email: '', Password: '' })
              setIsAddOpen(true)
            }}
            addLabel="Tambah Tenaga Medis"
            actions={(row) => (
              <div className="flex items-center gap-1.5">
                <Button onClick={() => handleOpenSchedule(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-bku-primary hover:bg-bku-primary/10 rounded-lg transition-colors" title="Kelola Jadwal"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >calendar_month</span></Button>
                <Button onClick={() => handleOpenEdit(row)} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit Profil"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >edit</span></Button>
                <Button onClick={() => { setSelected(row); setIsDelOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Hapus"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >delete</span></Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      {/* ── Edit Modal ───────────────────────────────────────────── */}
      <DialogModal
        open={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Profil Tenaga Medis"
        description="Pembaruan kualifikasi dan pengaturan operasional tenaga medis klinik."
        icon="edit"
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSave}>
          <div className="p-6 md:p-8 space-y-5 max-h-[50vh] overflow-y-auto no-scrollbar font-jakarta">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Nama Lengkap & Gelar</Label>
                <Input required value={form.Nama} onChange={e => setForm({ ...form, Nama: e.target.value })} placeholder="Nama lengkap..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta uppercase" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Spesialisasi / Jabatan</Label>
                <Input value={form.Spesialisasi} onChange={e => setForm({ ...form, Spesialisasi: e.target.value })} placeholder="Contoh: Dokter Umum, Perawat..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Email</Label>
                <Input type="email" value={form.Email} onChange={e => setForm({ ...form, Email: e.target.value })} placeholder="Email dinas..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">No. HP / WhatsApp</Label>
                <Input value={form.NoHP} onChange={e => setForm({ ...form, NoHP: e.target.value })} placeholder="Contoh: 08123456789" className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Lokasi Pemeriksaan</Label>
                <Input value={form.Lokasi} onChange={e => setForm({ ...form, Lokasi: e.target.value })} placeholder="Klinik / Ruang..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Status Operasional</Label>
                <SelectField
                  value={form.IsAktif ? "1" : "0"}
                  onValueChange={v => setForm({ ...form, IsAktif: v === "1" })}
                  className="w-full h-11 rounded-xl border-slate-200 bg-slate-50/30 font-semibold text-sm text-slate-800 focus:border-bku-primary"
                >
                  <SelectOption value="1">Aktif Tugas</SelectOption>
                  <SelectOption value="0">Non-Aktif</SelectOption>
                </SelectField>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Foto URL / Avatar</Label>
              <Input value={form.FotoURL} onChange={e => setForm({ ...form, FotoURL: e.target.value })} placeholder="https://example.com/foto.jpg..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta" />
            </div>
          </div>

          <div className="flex gap-3 justify-end p-6 bg-slate-50 border-t border-slate-200">
            <ModalCancelButton onClick={() => setIsEditOpen(false)} />
            <ModalSaveButton isSubmitting={isSubmitting} text="Update Profil" />
          </div>
        </form>
      </DialogModal>

      {/* ── Add Modal ───────────────────────────────────────────── */}
      <DialogModal
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Tambah Tenaga Medis Baru"
        description="Registrasi akun baru untuk dokter atau perawat."
        icon="add_circle"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAdd}>
          <div className="p-6 md:p-8 space-y-5 max-h-[50vh] overflow-y-auto no-scrollbar font-jakarta">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Nama Lengkap & Gelar</Label>
              <Input required value={addForm.Nama} onChange={e => setAddForm({ ...addForm, Nama: e.target.value })} placeholder="Contoh: dr. Ahmad Fauzi" className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta uppercase" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Email</Label>
              <Input type="email" required value={addForm.Email} onChange={e => setAddForm({ ...addForm, Email: e.target.value })} placeholder="Contoh: medis.ahmad@bku.ac.id" className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1 font-jakarta">Password</Label>
              <Input type="password" required value={addForm.Password} onChange={e => setAddForm({ ...addForm, Password: e.target.value })} placeholder="Password..." className="h-11 rounded-xl border-slate-200 bg-slate-50/30 focus:bg-white font-semibold text-sm text-slate-800 focus:border-bku-primary font-jakarta" />
            </div>
          </div>

          <div className="flex gap-3 justify-end p-6 bg-slate-50 border-t border-slate-200">
            <ModalCancelButton onClick={() => setIsAddOpen(false)} />
            <ModalSaveButton isSubmitting={isSubmitting} text="Daftarkan Akun" icon="add" />
          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Data Tenaga Medis?"
        description="Profil dan seluruh rekam praktik tenaga medis ini akan dihapus permanen dari sistem."
        loading={isSubmitting}
      />

      {/* ── Schedule Management Modal ────────────────────────────── */}
      <DialogModal
        open={isScheduleOpen}
        onOpenChange={setIsScheduleOpen}
        icon="calendar_month"
        title={`Kelola Jadwal: ${selected?.nama || ''}`}
        description="Atur ketersediaan slot jam praktik untuk tenaga medis."
        subtitle="Jadwal Praktik"
        maxWidth="max-w-4xl"
        bodyClassName="p-0 font-jakarta overflow-hidden"
        footer={
          <div className="flex flex-col sm:flex-row justify-between items-center w-full gap-3">
            <ModalCancelButton onClick={() => setIsScheduleOpen(false)}>Tutup Panel</ModalCancelButton>
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                type="button"
                onClick={resetScheduleChanges}
                disabled={isSavingSchedule || scheduleLoading}
                className="h-12 px-6 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-widest rounded-xl transition-all duration-200 font-jakarta cursor-pointer"
              >
                Reset
              </button>
              <ModalSaveButton onClick={saveSchedule} loading={isSavingSchedule} disabled={isSavingSchedule || scheduleLoading} icon="save">
                {isSavingSchedule ? 'Menyimpan...' : 'Simpan Jadwal'}
              </ModalSaveButton>
            </div>
          </div>
        }
      >

          {scheduleLoading ? (
            <div className="h-[350px] flex items-center justify-center flex-col gap-3 bg-white">
              <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: '40px' }}>sync</span>
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Memuat Jadwal...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-12 max-h-[70vh] min-h-[450px] bg-white border-t border-b border-neutral-100">
              {/* Day Selector Aside */}
              <aside className="md:col-span-3 border-r border-neutral-100 p-4 bg-slate-50/30 overflow-y-auto space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400 block px-2 mb-2">Pilih Hari</span>
                {scheduleData.map((item) => {
                  const isSelected = selectedDay === item.day;
                  return (
                    <button
                      key={item.day}
                      type="button"
                      onClick={() => setSelectedDay(item.day)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-all duration-200 relative overflow-hidden flex flex-col gap-1.5 cursor-pointer",
                        isSelected
                          ? "border-bku-primary bg-bku-primary/10 text-bku-primary shadow-sm"
                          : "border-neutral-200/60 bg-white text-neutral-600 hover:border-bku-primary/30"
                      )}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs font-bold uppercase font-jakarta">{item.day}</span>
                        <span className={cn("size-2 rounded-full", item.enabled ? "bg-emerald-500" : "bg-neutral-300")} />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-400">
                        {item.enabled ? `${item.slots?.length || 0} slot aktif` : 'Tidak Aktif'}
                      </span>
                    </button>
                  );
                })}
              </aside>

              {/* Slot Editor Area */}
              <section className="md:col-span-9 p-6 overflow-y-auto h-full no-scrollbar">
                {currentDayData.enabled ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
                      <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-neutral-900 font-jakarta flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '16px' }}>schedule</span>
                          Slot Hari {selectedDay}
                        </h3>
                        <p className="text-[10px] font-medium text-neutral-400">Tentukan jam mulai, selesai, jenis layanan, lokasi, dan kuota.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggleDay(selectedDay)}
                          className="h-9 px-3 rounded-xl text-[10px] font-bold uppercase tracking-widest text-rose-600 border border-rose-100 hover:bg-rose-50 hover:text-rose-700 cursor-pointer bg-white"
                        >
                          Nonaktifkan Hari
                        </button>
                        <button
                          type="button"
                          onClick={() => addSlot(selectedDay)}
                          className="h-9 rounded-xl bg-bku-primary/10 text-bku-primary hover:bg-bku-primary hover:text-white text-[10px] font-bold uppercase tracking-widest flex items-center px-3 border border-bku-primary/20 cursor-pointer"
                        >
                          <span className="material-symbols-outlined mr-1" style={{ fontSize: '12px' }}>add</span>
                          Tambah Slot
                        </button>
                      </div>
                    </div>

                    {currentDayData.slots.length === 0 ? (
                      <div className="h-[240px] flex flex-col items-center justify-center border-2 border-dashed border-neutral-200 rounded-xl bg-slate-50/50 text-center p-6">
                        <span className="material-symbols-outlined text-neutral-300 mb-2" style={{ fontSize: '32px' }}>schedule</span>
                        <h4 className="text-xs font-bold uppercase tracking-tight text-neutral-800">Belum Ada Slot Waktu</h4>
                        <p className="text-[11px] text-neutral-400 mt-1 max-w-xs">Tambahkan slot waktu praktik agar pasien dapat memilih hari ini.</p>
                        <button
                          type="button"
                          onClick={() => addSlot(selectedDay)}
                          className="mt-4 h-9 bg-bku-primary text-white rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer px-4 border-none"
                        >
                          Tambah Slot Pertama
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {currentDayData.slots.map((slot, index) => {
                          const invalidTime = toMinutes(slot.end) <= toMinutes(slot.start);
                          return (
                            <div key={index} className={cn("border rounded-xl p-4 bg-slate-50/30 transition-all hover:bg-white hover:shadow-sm", invalidTime ? "border-amber-200 bg-amber-50/20" : "border-neutral-200/60")}>
                              <div className="flex flex-col xl:flex-row gap-4 items-end xl:items-center justify-between">
                                <div className="grid grid-cols-2 md:grid-cols-[130px_130px_1fr_1fr_80px] gap-3 w-full items-start">
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-neutral-400 uppercase">Mulai</Label>
                                    <Input
                                      type="time"
                                      value={slot.start}
                                      onChange={(e) => updateSlot(selectedDay, index, 'start', e.target.value)}
                                      className="h-9 rounded-lg border-neutral-200 text-xs font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-neutral-400 uppercase">Selesai</Label>
                                    <Input
                                      type="time"
                                      value={slot.end}
                                      onChange={(e) => updateSlot(selectedDay, index, 'end', e.target.value)}
                                      className="h-9 rounded-lg border-neutral-200 text-xs font-bold"
                                    />
                                  </div>
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-[9px] font-bold text-neutral-400 uppercase">Jenis</Label>
                                    <SelectField
                                      value={slot.kategori}
                                      onValueChange={(val) => updateSlot(selectedDay, index, 'kategori', val)}
                                      className="h-9 rounded-lg border-neutral-200 text-xs font-bold w-full truncate"
                                    >
                                      {SERVICE_TYPES.map((type) => (
                                        <SelectOption key={type} value={type}>{type}</SelectOption>
                                      ))}
                                    </SelectField>
                                  </div>
                                  <div className="space-y-1 min-w-0">
                                    <Label className="text-[9px] font-bold text-neutral-400 uppercase">Lokasi</Label>
                                    <Input
                                      value={slot.lokasi}
                                      placeholder="Lokasi..."
                                      onChange={(e) => updateSlot(selectedDay, index, 'lokasi', e.target.value)}
                                      className="h-9 rounded-lg border-neutral-200 text-xs font-bold w-full truncate"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[9px] font-bold text-neutral-400 uppercase">Kuota</Label>
                                    <Input
                                      type="number"
                                      min="1"
                                      value={slot.kuota}
                                      onChange={(e) => updateSlot(selectedDay, index, 'kuota', parseInt(e.target.value) || 1)}
                                      className="h-9 rounded-lg border-neutral-200 text-xs font-bold"
                                    />
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => removeSlot(selectedDay, index)}
                                  className="h-9 w-9 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 flex items-center justify-center border-none bg-transparent cursor-pointer"
                                >
                                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                </button>
                              </div>
                              {invalidTime && (
                                <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-amber-700">Jam selesai harus setelah jam mulai.</p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6">
                    <div className="size-16 rounded-full bg-slate-50 flex items-center justify-center text-neutral-300 mb-4 border border-neutral-100">
                      <span className="material-symbols-outlined text-[32px]">dark_mode</span>
                    </div>
                    <h3 className="text-xs font-bold uppercase tracking-tight text-neutral-800">Hari Ini Tidak Aktif</h3>
                    <p className="text-[11px] text-neutral-400 mt-1 max-w-xs leading-normal">
                      Tenaga medis tidak akan menerima pasien pada hari {selectedDay}. Aktifkan hari ini jika ingin membuka jadwal praktik.
                    </p>
                    <button
                      type="button"
                      onClick={() => toggleDay(selectedDay)}
                      className="mt-5 h-9 bg-bku-primary hover:bg-bku-primary/90 text-white rounded-lg text-[10px] font-bold uppercase tracking-widest cursor-pointer px-4 border-none"
                    >
                      Aktifkan Hari {selectedDay}
                    </button>
                  </div>
                )}
              </section>
            </div>
          )}

      </DialogModal>
    </PageContent>
  )
}
