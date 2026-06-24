import React, { useEffect, useMemo, useState } from 'react';
import { tenagaKesehatanService } from '@/services/api';
import { DashboardHero } from '@/components/ui/dashboard';
import { PageContent } from '@/components/ui/page';
import { toast } from 'react-hot-toast';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
const cn = (...classes) => classes.filter(Boolean).join(' ');
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { usePermission } from '@/hooks/usePermission';

// Fallback Icons
const CalendarToday = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>calendar_today</span>;
const ScheduleIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const GroupIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;

const SERVICE_TYPES = [
  'Pemeriksaan Umum',
  'Konsultasi Gizi',
  'Screening Khusus',
  'Pemeriksaan Gigi',
  'Rujukan Eksternal',
  'Lainnya'
];

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

const dayIcons = {
  Senin: 'calendar_today',
  Selasa: 'event',
  Rabu: 'calendar_month',
  Kamis: 'event_note',
  Jumat: 'event_available',
  Sabtu: 'weekend',
  Minggu: 'hotel',
};

const normalizeSchedule = (apiData) => {
  const grouped = defaultSchedule.map(g => ({ ...g, slots: [] }))

  // Group slots by day
  if (Array.isArray(apiData)) {
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
  }
  return grouped
}

const toMinutes = (value) => {
  const [hours, minutes] = String(value || '00:00').split(':').map(Number);
  return (hours * 60) + minutes;
};

export default function ScheduleManagement() {
  const [selectedDay, setSelectedDay] = useState('Senin');
  const [schedule, setSchedule] = useState(defaultSchedule);
  const [savedSnapshot, setSavedSnapshot] = useState(JSON.stringify(defaultSchedule));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { hasPermission } = usePermission();
  const canViewSchedules = hasPermission('health.schedules.view');
  const canCreateSchedules = hasPermission('health.schedules.create');
  const canUpdateSchedules = hasPermission('health.schedules.update');
  const canDeleteSchedules = hasPermission('health.schedules.delete');
  const canManageSchedule = canCreateSchedules || canUpdateSchedules || canDeleteSchedules;

  const fetchSchedules = () => {
    setLoading(true);
    tenagaKesehatanService.getSchedules()
      .then((res) => {
        const nextSchedule = normalizeSchedule(res.data);
        setSchedule(nextSchedule);
        setSavedSnapshot(JSON.stringify(nextSchedule));
      })
      .catch(() => { })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const currentDayData = schedule.find((item) => item.day === selectedDay) || { day: selectedDay, enabled: false, slots: [] };
  const hasUnsavedChanges = savedSnapshot !== JSON.stringify(schedule);

  const summary = useMemo(() => {
    const activeDays = schedule.filter((item) => item.enabled).length;
    const totalSlots = schedule.reduce((total, item) => total + (item.enabled ? item.slots.length : 0), 0);
    const totalQuota = schedule.reduce((total, item) => {
      if (!item.enabled) return total;
      return total + item.slots.reduce((slotTotal, slot) => slotTotal + Number(slot.kuota || 0), 0);
    }, 0);

    return { activeDays, totalSlots, totalQuota };
  }, [schedule]);

  const toggleDay = (day) => {
    setSchedule((prev) => prev.map((item) => {
      if (item.day !== day) return item;

      const nextEnabled = !item.enabled;
      return {
        ...item,
        enabled: nextEnabled,
        slots: nextEnabled && item.slots.length === 0
          ? [{ kategori: 'Pemeriksaan Umum', start: '08:00', end: '12:00', lokasi: 'Klinik Kampus BKU', kuota: 10 }]
          : item.slots,
      };
    }));
  };

  const addSlot = (day) => {
    setSchedule((prev) => prev.map((item) => item.day === day
      ? { ...item, enabled: true, slots: [...item.slots, { kategori: 'Pemeriksaan Umum', start: '08:00', end: '12:00', lokasi: 'Klinik Kampus BKU', kuota: 10 }] }
      : item));
  };

  const removeSlot = (day, index) => {
    setSchedule((prev) => prev.map((item) => item.day === day
      ? { ...item, slots: item.slots.filter((_, slotIndex) => slotIndex !== index) }
      : item));
  };

  const updateSlot = (day, index, key, value) => {
    setSchedule((prev) => prev.map((item) => item.day === day
      ? { ...item, slots: item.slots.map((slot, slotIndex) => slotIndex === index ? { ...slot, [key]: value } : slot) }
      : item));
  };

  const resetChanges = () => {
    const restored = JSON.parse(savedSnapshot);
    setSchedule(restored);
    toast.success('Perubahan jadwal dikembalikan ke versi tersimpan.');
  };

  const saveSchedule = async () => {
    let hasError = false;
    schedule.forEach((day) => {
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

    setSaving(true);
    try {
      const currentRes = await tenagaKesehatanService.getSchedules();
      const currentSlots = currentRes.data || [];
      const currentIds = currentSlots.map(s => s.id);

      const desiredIds = [];
      const createPromises = [];
      const updatePromises = [];

      for (const dayGrp of schedule) {
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
              updatePromises.push(tenagaKesehatanService.updateSchedule(slot.id, payload));
            } else {
              createPromises.push(tenagaKesehatanService.createSchedule(payload));
            }
          }
        }
      }

      if (canDeleteSchedules) {
        const deletePromises = currentIds
          .filter(id => !desiredIds.includes(id))
          .map(id => tenagaKesehatanService.deleteSchedule(id));
        await Promise.all(deletePromises);
      }

      await Promise.all([...createPromises, ...updatePromises]);

      toast.success('Jadwal berhasil disimpan dan tersinkron ke portal mahasiswa.');
      fetchSchedules(); // Reload fully from server
    } catch (error) {
      toast.error(error?.message || 'Gagal menyimpan jadwal. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContent>
      <DashboardHero
        title="Manajemen"
        highlightedTitle="Jadwal"
        subtitle="Kelola jam praktik, cuti, dan ketersediaan waktu untuk layanan medis."
        icon="event_note"
        badges={[{ label: 'Jadwal Saya', active: false }]}
        actions={hasUnsavedChanges && canManageSchedule ? (
          <div className="flex items-center gap-2">
            <button
              onClick={resetChanges}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-rose-50 text-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider hover:bg-rose-100 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
              Batal
            </button>
            <button
              onClick={saveSchedule}
              disabled={saving}
              className="flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] text-white px-5 py-2 text-xs font-bold uppercase tracking-wider hover:bg-[var(--theme-primary-hover)] transition-colors shadow-md disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">
                {saving ? 'sync' : 'save'}
              </span>
              {saving ? 'Menyimpan...' : 'Simpan Jadwal'}
            </button>
          </div>
        ) : null}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3 w-full mb-6 mt-6">
        <PrimaryStatsCard
          title="Hari Aktif"
          value={summary.activeDays}
          icon={CalendarToday}
          colorTheme="success"
          badgeText="AKTIF"
          badgeIcon={<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        />
        <PrimaryStatsCard
          title="Total Slot"
          value={summary.totalSlots}
          icon={ScheduleIcon}
          colorTheme="info"
          badgeText="LIVE"
          badgeIcon={<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        />
        <PrimaryStatsCard
          title="Kuota Mingguan"
          value={summary.totalQuota}
          icon={GroupIcon}
          colorTheme="warning"
          badgeText="KUOTA"
          badgeIcon={<span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />}
        />
      </div>

      {loading ? (
        <div className="h-[350px] flex items-center justify-center flex-col gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="material-symbols-outlined animate-spin text-bku-primary" style={{ fontSize: '40px' }}>sync</span>
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Memuat Jadwal...</span>
        </div>
      ) : (
        <div className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden flex flex-col">
          {/* Horizontal Tabs for Days */}
          <div className="flex items-center overflow-x-auto no-scrollbar border-b border-[var(--theme-border)] bg-slate-50/50 px-3 py-3 gap-2">
            {schedule.map((item) => {
              const isSelected = selectedDay === item.day;
              const Icon = dayIcons[item.day] || 'calendar_month';
              return (
                <button
                  key={item.day}
                  type="button"
                  onClick={() => setSelectedDay(item.day)}
                  className={`
                  flex items-center gap-2 px-3 py-2 rounded-xl transition-all whitespace-nowrap min-w-max outline-none
                  ${isSelected
                      ? 'bg-white text-[var(--theme-primary)] shadow-sm ring-1 ring-[var(--theme-border)] font-headline font-bold'
                      : 'text-[var(--theme-text-muted)] hover:bg-white hover:text-[var(--theme-text)] font-headline font-semibold'}
                `}
                >
                  <span className="material-symbols-outlined text-[15px]">{Icon}</span>
                  <span className="text-[13px]">{item.day}</span>
                  <span className={`ml-1 size-1.5 rounded-full ${item.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                </button>
              )
            })}
          </div>

          {/* Content Section */}
          <div className="p-5 md:p-8">
            {!currentDayData.enabled ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <span className="material-symbols-outlined text-[48px] text-[var(--theme-text-muted)] opacity-50 mb-4">event_busy</span>
                <h3 className="text-lg font-bold text-[var(--theme-text)]">Hari Tidak Aktif</h3>
                <p className="mt-2 max-w-sm text-sm text-[var(--theme-text-muted)]">Pasien tidak akan melihat slot booking untuk hari {selectedDay}.</p>
                <button
                  type="button"
                  onClick={() => toggleDay(selectedDay)}
                  className="mt-6 rounded-xl bg-[var(--theme-primary)] px-6 py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[var(--theme-primary-hover)] transition-colors"
                >
                  Aktifkan Hari {selectedDay}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Header Pengaturan Slot */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-[15px] font-bold text-[var(--theme-text)] font-headline">Pengaturan Slot Waktu - {selectedDay}</h3>
                    <p className="text-[12px] text-[var(--theme-text-muted)] font-body">Atur jam buka dan detail layanan untuk hari ini.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {canDeleteSchedules && (
                      <button
                        type="button"
                        onClick={() => toggleDay(selectedDay)}
                        className="h-8 px-3 text-[11px] font-headline font-bold uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors"
                      >
                        Nonaktifkan Hari
                      </button>
                    )}
                    {canCreateSchedules && (
                      <button
                        type="button"
                        onClick={() => addSlot(selectedDay)}
                        className="flex items-center gap-1 h-8 px-3 text-[11px] font-headline font-bold uppercase tracking-wider text-white bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] rounded-lg transition-colors shadow-sm"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Tambah Slot
                      </button>
                    )}
                  </div>
                </div>

                {currentDayData.slots.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-[var(--theme-border)] rounded-2xl bg-slate-50/50">
                    <span className="material-symbols-outlined text-[28px] text-slate-300 mb-2">schedule</span>
                    <p className="text-[12px] text-[var(--theme-text-muted)] font-medium font-body">Belum ada slot waktu di hari ini.</p>
                    {canCreateSchedules ? (
                      <button
                        type="button"
                        onClick={() => addSlot(selectedDay)}
                        className="mt-4 rounded-lg bg-[var(--theme-primary)] h-8 px-4 text-[11px] font-headline font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[var(--theme-primary-hover)] transition-colors"
                      >
                        Tambah Slot Pertama
                      </button>
                    ) : (
                      <div className="mt-4 text-[10px] font-bold text-rose-500 uppercase tracking-wider bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                        View Only - Anda Tidak Memiliki Akses Tambah
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Table Header (visible on lg screens) */}
                    <div className="hidden lg:grid grid-cols-[120px_120px_minmax(140px,1fr)_minmax(180px,1.5fr)_100px_48px] gap-4 px-4 text-[11px] font-headline font-bold uppercase tracking-wider text-[var(--theme-text-subtle)] pb-1">
                      <div className="pl-9">Jam Mulai</div>
                      <div className="pl-9">Jam Selesai</div>
                      <div className="pl-9">Jenis Layanan</div>
                      <div className="pl-9">Lokasi / Ruangan</div>
                      <div className="pl-9">Kuota</div>
                      <div></div>
                    </div>

                    {currentDayData.slots.map((slot, index) => {
                      const invalidTime = toMinutes(slot.end) <= toMinutes(slot.start);
                      return (
                        <div key={`${selectedDay}-${index}`} className="relative group flex flex-col">
                          <div className={`grid grid-cols-1 lg:grid-cols-[120px_120px_minmax(140px,1fr)_minmax(180px,1.5fr)_100px_48px] gap-4 p-3 rounded-2xl border transition-all duration-300 ${invalidTime ? 'border-rose-300 bg-rose-50/50' : 'border-[var(--theme-border)] bg-white hover:border-[var(--theme-primary)]/40 hover:shadow-sm'}`}>
                            {/* Jam Mulai */}
                            <div className="flex flex-col lg:block gap-1.5">
                              <label className="lg:hidden text-[10px] font-headline font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Jam Mulai</label>
                              <div className="relative">
                                <input type="time" disabled={!canUpdateSchedules} value={slot.start} onChange={(e) => updateSlot(selectedDay, index, 'start', e.target.value)} className="h-10 w-full rounded-xl bg-transparent pl-9 pr-2 text-[13px] font-body font-bold text-[var(--theme-text)] outline-none transition-all hover:bg-slate-50 focus:bg-slate-50 focus:ring-1 focus:ring-[var(--theme-primary)]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--theme-text-subtle)] pointer-events-none">schedule</span>
                              </div>
                            </div>

                            {/* Jam Selesai */}
                            <div className="flex flex-col lg:block gap-1.5">
                              <label className="lg:hidden text-[10px] font-headline font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Jam Selesai</label>
                              <div className="relative">
                                <input type="time" disabled={!canUpdateSchedules} value={slot.end} onChange={(e) => updateSlot(selectedDay, index, 'end', e.target.value)} className={`h-10 w-full rounded-xl bg-transparent pl-9 pr-2 text-[13px] font-body font-bold outline-none transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${invalidTime ? 'text-rose-600 bg-rose-50/50 hover:bg-rose-100/50 focus:ring-1 focus:ring-rose-400' : 'text-[var(--theme-text)] hover:bg-slate-50 focus:bg-slate-50 focus:ring-1 focus:ring-[var(--theme-primary)]/30'}`} />
                                <span className={`material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] pointer-events-none ${invalidTime ? 'text-rose-500' : 'text-[var(--theme-text-subtle)]'}`}>update</span>
                              </div>
                            </div>

                            {/* Kategori */}
                            <div className="flex flex-col lg:block gap-1.5">
                              <label className="lg:hidden text-[10px] font-headline font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Jenis Layanan</label>
                              <div className="relative">
                                <select disabled={!canUpdateSchedules} value={slot.kategori || 'Pemeriksaan Umum'} onChange={(e) => updateSlot(selectedDay, index, 'kategori', e.target.value)} className="h-10 w-full appearance-none rounded-xl bg-transparent pl-9 pr-8 text-[13px] font-body font-semibold text-[var(--theme-text)] outline-none transition-all hover:bg-slate-50 focus:bg-slate-50 focus:ring-1 focus:ring-[var(--theme-primary)]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                                  {SERVICE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                                </select>
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--theme-text-subtle)] pointer-events-none">category</span>
                                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--theme-text-subtle)] pointer-events-none">expand_more</span>
                              </div>
                            </div>

                            {/* Lokasi */}
                            <div className="flex flex-col lg:block gap-1.5">
                              <label className="lg:hidden text-[10px] font-headline font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Lokasi</label>
                              <div className="relative">
                                <input disabled={!canUpdateSchedules} value={slot.lokasi || ''} onChange={(e) => updateSlot(selectedDay, index, 'lokasi', e.target.value)} placeholder="Klinik Kampus BKU" className="h-10 w-full rounded-xl bg-transparent pl-9 pr-3 text-[13px] font-body font-semibold text-[var(--theme-text)] outline-none transition-all hover:bg-slate-50 focus:bg-slate-50 focus:ring-1 focus:ring-[var(--theme-primary)]/30 placeholder:text-[var(--theme-text-subtle)] disabled:opacity-50 disabled:cursor-not-allowed" />
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--theme-text-subtle)] pointer-events-none">meeting_room</span>
                              </div>
                            </div>

                            {/* Kuota */}
                            <div className="flex flex-col lg:block gap-1.5">
                              <label className="lg:hidden text-[10px] font-headline font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Kuota</label>
                              <div className="relative">
                                <input type="number" disabled={!canUpdateSchedules} min="1" value={slot.kuota || 1} onChange={(e) => updateSlot(selectedDay, index, 'kuota', Number(e.target.value))} className="h-10 w-full rounded-xl bg-transparent pl-9 pr-3 text-[13px] font-body font-semibold text-[var(--theme-text)] outline-none transition-all hover:bg-slate-50 focus:bg-slate-50 focus:ring-1 focus:ring-[var(--theme-primary)]/30 disabled:opacity-50 disabled:cursor-not-allowed" />
                                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-[var(--theme-text-subtle)] pointer-events-none">group</span>
                              </div>
                            </div>

                            {/* Hapus Action */}
                            {canDeleteSchedules ? (
                              <div className="flex items-end lg:items-center justify-end lg:justify-center">
                                <button
                                  type="button"
                                  onClick={() => removeSlot(selectedDay, index)}
                                  className="h-8 w-8 flex items-center justify-center rounded-lg text-rose-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                >
                                  <span className="material-symbols-outlined text-[16px]">delete</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-end lg:items-center justify-end lg:justify-center opacity-30 cursor-not-allowed">
                                <span className="material-symbols-outlined text-[16px]">lock</span>
                              </div>
                            )}
                          </div>

                          {/* Validasi Waktu */}
                          {invalidTime && (
                            <div className="mt-1.5 flex items-center gap-1.5 text-rose-500 text-[10px] font-bold uppercase tracking-wider px-4">
                              <span className="material-symbols-outlined text-[14px]">error</span>
                              <span>Jam selesai harus setelah jam mulai.</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </PageContent>
  );
}
