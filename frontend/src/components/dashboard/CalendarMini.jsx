import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageCard, PageCardHeader } from '@/components/ui/page';

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const CATEGORY_COLORS = {
  kencana: 'bg-primary',
  beasiswa: 'bg-success',
  konseling: 'bg-secondary',
  kampus: 'bg-info',
  organisasi: 'bg-warning',
  pkkmb: 'bg-primary',
  kesehatan: 'bg-error',
};

const CATEGORY_LABELS = {
  kencana: 'PKKMB',
  beasiswa: 'Beasiswa',
  konseling: 'Konseling',
  kampus: 'Kampus',
  organisasi: 'Organisasi',
  pkkmb: 'PKKMB',
  kesehatan: 'Kesehatan',
};

export default function CalendarMini({ events }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const viewedEvents = events?.filter(e => {
    const d = new Date(e.tanggal_mulai || e.tanggal);
    return d.getMonth() === month && d.getFullYear() === year;
  }) || [];

  const eventDates = viewedEvents.map(e => new Date(e.tanggal_mulai || e.tanggal).getDate());

  const selectedDateEvents = selectedDay
    ? viewedEvents.filter(e => {
        const d = new Date(e.tanggal_mulai || e.tanggal);
        return d.getDate() === selectedDay;
      })
    : [];

  const changeMonth = (offset) => {
    setCurrentDate(new Date(year, month + offset, 1));
    setSelectedDay(null);
  };

  const handleDayClick = (day) => {
    setSelectedDay(selectedDay === day ? null : day);
  };

  const renderDays = () => {
    const cells = [];
    for (let i = 0; i < startDay; i++) {
      cells.push(<div key={`pad-${i}`} className="h-10"></div>);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const hasEvent = eventDates.includes(d);
      const isPast = d < today.getDate() && month === today.getMonth() && year === today.getFullYear();
      const isSelected = selectedDay === d;

      cells.push(
        <div
          key={d}
          onClick={() => handleDayClick(d)}
          className={`relative flex flex-col items-center justify-center h-10 ${
            hasEvent ? 'cursor-pointer' : 'cursor-default'
          }`}
        >
          <div className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
            isSelected ? 'bg-primary/20 text-primary ring-2 ring-primary/40 shadow-sm' :
            isToday ? 'bg-primary text-white shadow-md' : 
            isPast ? 'text-text-muted/40' : 'text-bku-text hover:bg-background'
          }`}>
            {d}
          </div>
          {hasEvent && (
            <div className={`absolute -bottom-0.5 w-1 h-1 rounded-full ${
              isToday || isSelected ? 'bg-primary' : 'bg-primary/60'
            }`}></div>
          )}
        </div>
      );
    }
    return cells;
  };

  const renderSelectedDateEvents = () => {
    if (!selectedDay) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-50">
          <span className="material-symbols-outlined text-3xl text-text-muted mb-2">touch_app</span>
          <p className="text-sm font-bold text-text-muted text-center max-w-[200px]">
            Klik tanggal yang memiliki titik untuk melihat kegiatan
          </p>
        </div>
      );
    }

    if (selectedDateEvents.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-10 opacity-50">
          <span className="material-symbols-outlined text-3xl text-text-muted mb-2">event_busy</span>
          <p className="text-sm font-bold text-text-muted text-center">
            Tidak ada kegiatan di tanggal ini
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {selectedDateEvents.map((e, idx) => (
          <div key={idx} className="flex items-center gap-3 group/event">
            <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[e.kategori] || 'bg-text-muted'}`}></div>
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold text-text-muted">
                  {new Date(e.tanggal_mulai || e.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border border-current/10 opacity-70 ${CATEGORY_COLORS[e.kategori] ? 'text-current' : 'text-text-muted'} uppercase`}>
                  {CATEGORY_LABELS[e.kategori] || e.kategori}
                </span>
              </div>
              <p className="text-sm font-bold text-bku-text leading-tight">{e.judul || e.nama}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <PageCard className="flex flex-col h-full">
      <PageCardHeader 
        title="Kalender Kegiatan"
        icon="calendar_month"
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => changeMonth(-1)} className="p-1.5 hover:bg-background rounded-lg transition-colors"><ChevronLeft size={16} /></button>
            <span className="text-xs font-bold w-28 text-center">{MONTHS[month]} {year}</span>
            <button onClick={() => changeMonth(1)} className="p-1.5 hover:bg-background rounded-lg transition-colors"><ChevronRight size={16} /></button>
          </div>
        }
      />

      <div className="grid grid-cols-7 gap-1 mb-2">
        {DAYS.map(d => (
          <div key={d} className="text-[10px] font-black text-text-muted uppercase text-center py-2 tracking-widest">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {renderDays()}
      </div>

      <div className="flex-1 flex flex-col border-t border-border-muted pt-5">
        <h4 className="text-[13px] font-bold text-slate-800 font-headline mb-4">
          {selectedDay
            ? `Kegiatan ${selectedDay} ${MONTHS[month]} ${year}`
            : `Kegiatan ${MONTHS[month]} ${year}`
          }
        </h4>
        {renderSelectedDateEvents()}
      </div>
    </PageCard>
  );
}
