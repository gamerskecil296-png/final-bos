import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenagaKesehatanService } from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import { PageContent, PageCard, PageCardHeader } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { usePermission } from '@/hooks/usePermission';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import EmptyState from '@/components/ui/EmptyState';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip
} from 'recharts';
export default function TenagaKesehatanDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { hasPermission } = usePermission();

  const handleToggleAvailability = () => {
    setIsAvailable(prev => !prev);
  };

  useEffect(() => {
    let ignore = false;
    tenagaKesehatanService.getDashboard().then((res) => {
      if (!ignore) {
        setDashboard(res.data);
        if (res.data?.profile?.is_aktif !== undefined) {
          setIsAvailable(res.data.profile.is_aktif);
        }
      }
    }).catch(() => {
      if (!ignore) setDashboard(null);
    });
    return () => { ignore = true; };
  }, []);

  const totalDiperiksa = dashboard?.total_diperiksa_hari_ini ?? 0;
  const belumScreening = dashboard?.belum_screening ?? 0;
  const perluPerhatian = dashboard?.perlu_perhatian ?? 0;
  const bookingCount = dashboard?.booking_hari_ini_count ?? 0;
  const bookings = dashboard?.bookings || [];
  const alerts = dashboard?.alerts || [];
  const profileName = dashboard?.profile?.nama || 'Tenaga Kesehatan';
  
  const antreanAktif = bookings.filter(b => b.status === 'Menunggu' || b.status === 'Dikonfirmasi' || b.status === 'Menunggu Konfirmasi').length;

  // Chart data derived from dashboard API
  const KONDISI_COLORS = {
    'Sehat': '#22c55e',
    'Ringan': '#f59e0b',
    'Sedang': '#f97316',
    'Berat': '#ef4444',
    'Kritis': '#7c3aed',
  };

  const sebaranKondisi = dashboard?.sebaran_kondisi || {};
  const chartKondisi = Object.entries(sebaranKondisi).map(([name, value]) => ({ name, value }));

  const trenHarian = dashboard?.tren_7_hari || [];
  const chartTren = trenHarian.map(item => ({
    name: item.tanggal ? new Date(item.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : item.label || '',
    value: item.jumlah ?? item.total ?? 0,
  }));

  const statCards = [
    { 
      title: 'Diperiksa Hari Ini', 
      value: totalDiperiksa, 
      icon: 'done_all', 
      colorTheme: 'success', 
      badgeText: 'Selesai',
      badgeIcon: <span className="material-symbols-outlined text-[12px]">check_circle</span>
    },
    { 
      title: 'Total Booking', 
      value: bookingCount, 
      icon: 'calendar_month', 
      colorTheme: 'primary', 
      badgeText: 'Hari Ini',
      badgeIcon: <span className="material-symbols-outlined text-[12px]">today</span>
    },
    { 
      title: 'Antrean Aktif', 
      value: antreanAktif, 
      icon: 'pending_actions', 
      colorTheme: 'info', 
      badgeText: 'Menunggu',
      badgeIcon: <span className="material-symbols-outlined text-[12px]">hourglass_empty</span>
    },
    { 
      title: 'Belum Screening', 
      value: belumScreening, 
      icon: 'group', 
      colorTheme: 'warning', 
      badgeText: 'Mahasiswa',
      badgeIcon: <span className="material-symbols-outlined text-[12px]">group</span>
    },
    { 
      title: 'Perlu Perhatian', 
      value: perluPerhatian, 
      icon: 'emergency', 
      colorTheme: perluPerhatian > 0 ? 'error' : 'success', 
      badgeText: perluPerhatian > 0 ? 'Kritis' : 'Aman',
      badgeIcon: <span className="material-symbols-outlined text-[12px]">{perluPerhatian > 0 ? 'warning' : 'check'}</span>
    }
  ];

  const services = [
    { 
      name: 'Jadwal Praktik', 
      icon: 'schedule', 
      path: '/app/kesehatan/schedule',
      permission: 'health.schedules.view'
    },
    { 
      name: 'Booking Masuk', 
      icon: 'calendar_month', 
      path: '/app/kesehatan/bookings',
      permission: 'health.bookings.view'
    },
    { 
      name: 'Daftar Pasien', 
      icon: 'people', 
      path: '/app/kesehatan/patients',
      permission: 'health.patients.view'
    },
    { 
      name: 'Pengaturan', 
      icon: 'settings', 
      path: '/app/kesehatan/settings' 
    },
  ].filter(s => hasPermission(s.permission));

  return (
    <PageContent>
      {/* Page Header */}
      <DashboardHero
        title="Selamat Datang,"
        highlightedTitle={`${profileName}! 👋`}
        subtitle={`Hari ini Anda memiliki ${bookingCount} booking harian aktif.`}
        icon="medical_services"
        badges={[
          { label: 'Portal Kesehatan', active: false },
          { label: 'Sesi Aktif', active: true }
        ]}
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleToggleAvailability}
              className={`flex-1 md:flex-initial px-4 py-2 h-10 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                isAvailable 
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              {isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
              <span className="material-symbols-outlined text-sm ml-1">swap_horiz</span>
            </button>
            {hasPermission('health.bookings.view') && (
              <button
                onClick={() => navigate('/app/kesehatan/bookings')}
                className="flex-1 md:flex-initial px-4 py-2 h-10 rounded-xl font-bold text-xs transition-all text-white hover:opacity-90 shadow-sm flex items-center justify-center gap-1.5"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                <span className="material-symbols-outlined text-sm">calendar_month</span> Lihat Booking
              </button>
            )}
            {hasPermission('health.patients.view') && (
              <button
                onClick={() => navigate('/app/kesehatan/patients')}
                className="flex-1 md:flex-initial border border-border bg-surface px-4 py-2 h-10 rounded-xl font-bold text-xs transition-all hover:bg-muted/30 flex items-center justify-center gap-1.5 text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">history</span> Riwayat Pasien
              </button>
            )}
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-6">
        {statCards.map((card, i) => (
          <PrimaryStatsCard key={i} {...card} />
        ))}
      </div>

      {/* Quick Access Services - Horizontal */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {services.map((item, i) => (
          <button 
            key={i} 
            onClick={() => navigate(item.path)} 
            className="group relative flex items-center p-4 bg-[var(--theme-surface)] hover:bg-[var(--theme-primary-light)]/20 rounded-2xl border border-[var(--theme-border)] hover:border-[var(--theme-primary)]/40 transition-all duration-300 w-full overflow-hidden shadow-sm hover:shadow-md active:scale-95 cursor-pointer gap-4"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div 
              className="size-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm bg-[var(--theme-primary-light)] text-[var(--theme-primary)]"
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
            </div>
            <div className="flex-1 text-left min-w-0">
              <span className="text-xs font-bold tracking-tight font-headline transition-colors block truncate" style={{ color: 'var(--theme-text)' }}>{item.name}</span>
              <span className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider block mt-0.5">Buka Menu</span>
            </div>
          </button>
        ))}
      </div>

      {/* Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full">
          {/* Booking Kesehatan Baru */}
          <PageCard>
            <PageCardHeader
              title="Antrean Booking Hari Ini"
              description="Daftar mahasiswa yang dijadwalkan hari ini"
              icon="assignment"
              action={
                hasPermission('health.bookings.view') && (
                  <button 
                    onClick={() => navigate('/app/kesehatan/bookings')} 
                    className="text-xs font-bold hover:underline transition-colors tracking-wider font-headline"
                    style={{ color: 'var(--theme-primary)' }}
                  >
                    Lihat Semua
                  </button>
                )
              }
            />
            
            <div className="space-y-3">
              {bookings.length > 0 ? (
                bookings.slice(0, 3).map((booking) => (
                  <div 
                    key={booking.id} 
                    onClick={() => {
                      if (hasPermission('health.bookings.view')) {
                        navigate(`/app/kesehatan/bookings`);
                      }
                    }} 
                    className={`flex items-center justify-between p-3 rounded-xl bg-background border border-border-muted transition-all duration-300 group ${hasPermission('health.bookings.view') ? 'hover:bg-surface hover:border-border cursor-pointer' : ''}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs group-hover:scale-105 transition-transform duration-300 shrink-0 border border-primary/20 bg-primary/10 text-primary overflow-hidden relative"
                      >
                        <span className="material-symbols-outlined text-primary/60" style={{ fontSize: '20px' }}>person</span>
                      </div>
                      <div className="min-w-0 flex flex-col justify-center gap-0.5">
                        <div className="text-[12px] font-bold truncate font-headline" style={{ color: 'var(--theme-text)' }}>{booking.name}</div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider truncate" style={{ color: 'var(--theme-text-muted)' }}>{booking.tipe_layanan} - {booking.note || 'Pemeriksaan Umum'}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right flex flex-col justify-center">
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'var(--theme-text-muted)' }}>Jam</p>
                        <p className="text-[11px] font-bold uppercase" style={{ color: 'var(--theme-primary)' }}>{booking.time}</p>
                      </div>
                      <span 
                        className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-primary/5 text-primary border border-primary/10"
                        style={{
                          backgroundColor: booking.status === 'Dikonfirmasi' 
                            ? 'color-mix(in srgb, var(--theme-success) 10%, transparent)' 
                            : 'color-mix(in srgb, var(--theme-warning) 10%, transparent)',
                          color: booking.status === 'Dikonfirmasi' 
                            ? 'var(--theme-success)' 
                            : 'var(--theme-warning)',
                          border: `1px solid ${
                            booking.status === 'Dikonfirmasi' 
                              ? 'color-mix(in srgb, var(--theme-success) 20%, transparent)' 
                              : 'color-mix(in srgb, var(--theme-warning) 20%, transparent)'
                          }`
                        }}
                      >
                        {booking.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <EmptyState 
                  icon="event_busy" 
                  title="Tidak Ada Antrean" 
                  description="Belum ada mahasiswa yang dijadwalkan untuk diperiksa hari ini." 
                  className="py-10"
                />
              )}
            </div>
          </PageCard>

          {/* Alert Mahasiswa Perlu Perhatian */}
          <PageCard>
            <PageCardHeader
              title="Mahasiswa Perlu Perhatian Khusus"
              description="Kondisi kritis atau dalam pantauan tim medis"
              icon="warning"
              action={
                <span className="text-xs font-semibold uppercase tracking-wider text-error">Kondisi Kritis / Pantauan</span>
              }
            />
            
            <div className="space-y-3">
              {alerts.length > 0 ? (
                alerts.slice(0, 3).map((alert) => (
                  <div 
                    key={alert.id} 
                    className="flex gap-4 items-center p-3 rounded-xl bg-background border border-border-muted hover:bg-surface hover:border-border transition-all duration-300"
                  >
                    <div 
                      className="size-8 rounded-lg flex items-center justify-center shrink-0 bg-error/10 text-error border border-error/20"
                    >
                      <span className="material-symbols-outlined text-base">emergency</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-tight font-headline" style={{ color: 'var(--theme-text)' }}>{alert.nama} ({alert.nim})</p>
                      <p className="text-xs font-medium mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>
                        {alert.event} - Status: <span style={{ color: 'var(--theme-error)', fontWeight: 'bold' }}>{alert.status}</span>
                      </p>
                    </div>
                    {hasPermission('health.medical_records.view') && (
                      <button 
                        onClick={() => navigate(`/app/kesehatan/patients/${alert.mahasiswa_id}/medical-record`)}
                        className="px-3 py-1 border border-border bg-surface text-[10px] font-bold rounded-lg transition-all hover:bg-muted/30 font-headline text-on-surface"
                      >
                        Detail
                      </button>
                    )}
                  </div>
                ))
              ) : (
                <EmptyState 
                  icon="check_circle" 
                  title="Semua Aman" 
                  description="Saat ini tidak ada mahasiswa yang berada dalam status kritis atau pantauan khusus." 
                  className="py-10"
                />
              )}
            </div>
          </PageCard>
      </div>

      {/* Analytics 5W1H Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full mt-6">
        {/* Kondisi Kesehatan (Pie Chart) */}
        <PageCard className="col-span-1 lg:col-span-1">
          <PageCardHeader
            title="Sebaran Kondisi Medis"
            description="Proporsi hasil pemeriksaan medis"
            icon="pie_chart"
          />
          <div className="h-64 mt-4 relative">
            {chartKondisi.some(c => c.value > 0) ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      itemStyle={{ color: 'var(--theme-text)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Pie
                      data={chartKondisi}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartKondisi.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={KONDISI_COLORS[entry.name] || 'var(--theme-primary)'} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend Custom */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4">
                  {chartKondisi.map(c => (
                    <div key={c.name} className="flex items-center gap-1.5 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: KONDISI_COLORS[c.name] }}></div>
                      {c.name} ({c.value})
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[var(--theme-text-muted)]">Belum ada data pemeriksaan.</div>
            )}
          </div>
        </PageCard>

        {/* Tren 7 Hari (Line Chart) */}
        <PageCard className="col-span-1 lg:col-span-1">
          <PageCardHeader
            title="Aktivitas Pemeriksaan (7 Hari)"
            description="Tren operasional harian"
            icon="show_chart"
          />
          <div className="h-64 mt-4">
            {chartTren.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartTren} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--theme-border)" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'var(--theme-text-muted)' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: 'var(--theme-text)', fontSize: '12px' }}
                    labelStyle={{ color: 'var(--theme-text-muted)', fontSize: '12px', fontWeight: 'bold', marginBottom: '4px' }}
                  />
                  <Line type="monotone" dataKey="value" stroke="var(--theme-primary)" strokeWidth={3} dot={{ r: 4, fill: 'var(--theme-primary)', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-[var(--theme-text-muted)]">Belum ada tren data.</div>
            )}
          </div>
        </PageCard>

        {/* Quick Access Services */}
        <PageCard className="col-span-1 lg:col-span-1 h-full">
          <PageCardHeader title="Pintasan Layanan" icon="apps" />
          <div className="grid grid-cols-2 gap-4 mt-4">
            {services.map((item, i) => (
              <button 
                key={i} 
                onClick={() => navigate(item.path)} 
                className="group flex flex-col items-center justify-center p-4 bg-background hover:bg-surface rounded-xl border border-border-muted hover:border-primary transition-all duration-300 w-full"
              >
                <div 
                  className="size-10 rounded-lg flex items-center justify-center mb-2 group-hover:scale-110 transition-transform shadow-sm bg-primary/10 text-primary border border-primary/20"
                >
                  <span className="material-symbols-outlined text-base">{item.icon}</span>
                </div>
                <span className="text-xs font-semibold text-on-surface tracking-tight text-center font-headline" style={{ color: 'var(--theme-text)' }}>{item.name}</span>
              </button>
            ))}
          </div>
        </PageCard>
      </div>
    </PageContent>
  );
}

