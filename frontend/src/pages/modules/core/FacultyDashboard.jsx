"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts"
import { API_BASE_URL, fetchWithAuth } from "@/services/api"
import useAuthStore from '@/store/useAuthStore';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { PageContent, PageCard, PageCardHeader } from '@/components/ui/page'
import { DashboardHero, DashboardQuickActions } from '@/components/ui/dashboard'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { Button } from '@/components/ui/Button'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Group = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const School = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const CheckCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const Block = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>block</span>;
const PauseCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>pause_circle</span>;
const Award = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>emoji_events</span>;
const PersonBadge = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>badge</span>;

export default function FacultyDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('all');
  const [filterProdi, setFilterProdi] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summaryData, setSummaryData] = useState({
    totalStudents: 0,
    totalLecturers: 0,
    totalPrestasi: 0,
    totalProdi: 0,
    statusCounts: [],
    prodiDistribution: [],
    trendData: [],
    recentActivity: [],
    activePeriod: null,
    periods: []
  });

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Admin';

  const fetchDashboardData = React.useCallback(async (periodId, start, end, prodiId) => {
    Promise.resolve().then(() => setLoading(true));
    try {
      let url = `${API_BASE_URL}/faculty/summary`;
      const params = [];
      if (start && end) {
        params.push(`start_date=${start}`);
        params.push(`end_date=${end}`);
      } else if (periodId && periodId !== 'all') {
        params.push(`period_id=${periodId}`);
      }
      if (prodiId && prodiId !== 'all') {
        params.push(`prodi_id=${prodiId}`);
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`;
      }
      const result = await fetchWithAuth(url);
      if (result.status === 'success') {
        setSummaryData(result.data);
      }
    } catch (error) {
      console.error("Error fetching dashboard statistics:", error);
    } finally {
      Promise.resolve().then(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    fetchDashboardData(filterPeriod, startDate, endDate, filterProdi);
  }, [filterPeriod, startDate, endDate, filterProdi, fetchDashboardData]);

  const handlePeriodChange = (val) => {
    setFilterPeriod(val);
    if (val !== 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const handleResetFilters = () => {
    setStartDate('');
    setEndDate('');
    setFilterPeriod('all');
    setFilterProdi('all');
  };

  const statusColors = {
    'Aktif': '#10b981',     // emerald-500
    'Cuti': '#f59e0b',      // amber-500
    'Lulus': '#3b82f6',     // blue-500
    'DO': '#ef4444',        // red-500
    'NON-AKTIF': '#94a3b8', // slate-400
  };

  const allStatusNames = [...new Set(['Aktif', 'Cuti', 'Lulus', 'DO', ...(summaryData.statusCounts?.map(s => s.status) || [])])];
  const dynamicStatusData = allStatusNames.map(name => {
    const found = summaryData.statusCounts?.find(s => s.status === name);
    return { name, value: found ? found.count : 0, color: statusColors[name] || '#cbd5e1' };
  });

  const totalAktif = dynamicStatusData.find(d => d.name === 'Aktif')?.value || 0;
  const totalLulus = dynamicStatusData.find(d => d.name === 'Lulus')?.value || 0;
  const totalCuti = dynamicStatusData.find(d => d.name === 'Cuti')?.value || 0;
  const totalDO = dynamicStatusData.find(d => d.name === 'DO')?.value || 0;

  const rasioAktifPct = summaryData.totalStudents > 0 ? Math.round((totalAktif / summaryData.totalStudents) * 100) : 0;

  // Chart 1: Kapasitas/Distribusi Mahasiswa per Prodi (List)
  const prodiDistributionData = useMemo(() => {
    return (summaryData.prodiDistribution || [])
      .sort((a, b) => b.jumlah - a.jumlah);
  }, [summaryData.prodiDistribution]);
  const maxStudentsInProdi = Math.max(...prodiDistributionData.map(d => d.jumlah), 1);

  // Chart 3: Top 5 Prodi Terbesar (Bar Chart)
  const topProdiChartData = useMemo(() => {
    return [...prodiDistributionData].slice(0, 5).map(item => ({
      name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
      fullName: item.name,
      jumlah: item.jumlah
    }));
  }, [prodiDistributionData]);

  const quickActions = [
    { label: 'Validasi Prestasi', icon: 'emoji_events', path: '/app/dashboard/prestasi', iconBg: 'bg-emerald-100 text-emerald-600 border-emerald-200' },
    { label: 'Monitor PKKMB', icon: 'verified', path: '/app/dashboard/pkkmb', iconBg: 'bg-blue-100 text-blue-600 border-blue-200' },
    { label: 'Aspirasi Mahasiswa', icon: 'campaign', path: '/app/dashboard/aspirasi', iconBg: 'bg-rose-100 text-rose-600 border-rose-200' },
    { label: 'Proposal ORMAWA', icon: 'description', path: '/app/dashboard/ormawa/proposals', iconBg: 'bg-indigo-100 text-indigo-600 border-indigo-200' },
    { label: 'Screening Kesehatan', icon: 'monitor_heart', path: '/app/dashboard/kesehatan', iconBg: 'bg-amber-100 text-amber-600 border-amber-200' },
    { label: 'Jadwal Konseling', icon: 'psychology', path: '/app/dashboard/konseling', iconBg: 'bg-violet-100 text-violet-600 border-violet-200' },
    { label: 'Mahasiswa', icon: 'groups', path: '/app/dashboard/mahasiswa', iconBg: 'bg-cyan-100 text-cyan-600 border-cyan-200' },
  ];

  return (
    <PageContent>
      {/* ── Page Header ────────────────────────────────────────── */}
      <DashboardHero 
        title="Selamat datang,"
        highlightedTitle={`${firstName}!`}
        subtitle="Kelola data akademik, pantau kinerja mahasiswa, dan verifikasi layanan kampus dari satu panel terpusat."
        icon="admin_panel_settings"
        badges={[
          { label: 'SIAKAD Portal', active: false },
          { label: 'Active Session', active: true }
        ]}
        actions={
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Select value={filterPeriod} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[150px] h-10 bg-white/80 backdrop-blur-sm border border-[var(--theme-border)] rounded-xl font-bold text-xs text-[var(--theme-text-muted)] hover:border-[var(--theme-primary)]/50 focus:ring-0 transition-colors">
                <SelectValue placeholder="Semua Periode" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white">
                <SelectItem value="all" className="text-xs rounded-lg py-1.5 font-medium">Semua Periode</SelectItem>
                {summaryData.periods?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs rounded-lg py-1.5 font-medium">{p.Name || p.nama_periode}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterProdi} onValueChange={setFilterProdi}>
              <SelectTrigger className="w-[180px] h-10 bg-white/80 backdrop-blur-sm border border-[var(--theme-border)] rounded-xl font-bold text-xs text-[var(--theme-text-muted)] hover:border-[var(--theme-primary)]/50 focus:ring-0 transition-colors">
                <SelectValue placeholder="Semua Prodi" />
              </SelectTrigger>
              <SelectContent className="rounded-xl border border-[var(--theme-border)] shadow-md bg-white">
                <SelectItem value="all" className="text-xs rounded-lg py-1.5 font-medium">Semua Prodi</SelectItem>
                {summaryData.prodis?.map(p => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs rounded-lg py-1.5 font-medium">{p.Nama || p.nama} ({p.Jenjang || p.jenjang})</SelectItem>
                ))}
              </SelectContent>
            </Select>


            <button onClick={() => navigate('/app/dashboard/laporan')}
              className="h-10 px-4 rounded-xl text-white text-xs font-bold uppercase tracking-wider gap-2 flex items-center transition-all active:scale-95 shadow-lg shrink-0"
              style={{
                backgroundColor: 'var(--theme-primary)',
                boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--theme-primary) 30%, transparent)'
              }}>
              <span className="material-symbols-outlined text-[16px]">download</span> Laporan
            </button>
          </div>
        }
      />

      {/* ── Enriched Stats Grid (Like KelolaFakultas) ─────────────────────────────────── */}
      <div className="space-y-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          <PrimaryStatsCard
            title="Total Mahasiswa"
            value={summaryData.totalStudents}
            icon={Group}
            colorTheme="info"
            badgeText="Keseluruhan"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">verified</span>}
            onClick={() => navigate('/app/dashboard/mahasiswa')}
          />
          <PrimaryStatsCard
            title="Total Program Studi"
            value={summaryData.totalProdi}
            icon={School}
            colorTheme="primary"
            onClick={() => navigate('/app/dashboard/prodi')}
          />
          <PrimaryStatsCard
            title="Total Dosen"
            value={summaryData.totalLecturers || 0}
            icon={PersonBadge}
            colorTheme="info"
          />
          <PrimaryStatsCard
            title="Mahasiswa Aktif"
            value={totalAktif}
            icon={CheckCircle}
            colorTheme="success"
            badgeText={`${rasioAktifPct}% Aktif`}
            badgeIcon={<span className="material-symbols-outlined text-[12px]">trending_up</span>}
          />
          <PrimaryStatsCard
            title="Prestasi Baru"
            value={summaryData.totalPrestasi}
            icon={Award}
            colorTheme="warning"
            badgeText="Menunggu Validasi"
            onClick={() => navigate('/app/dashboard/prestasi')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <PrimaryStatsCard
            title="Mahasiswa Lulus"
            value={totalLulus}
            subtitle="Alumni tercetak"
            icon={Award}
            colorTheme="info"
          />
          <PrimaryStatsCard
            title="Mahasiswa Cuti"
            value={totalCuti}
            subtitle="Sedang Cuti Akademik"
            icon={PauseCircle}
            colorTheme="warning"
          />
          <PrimaryStatsCard
            title="Mahasiswa DO"
            value={totalDO}
            subtitle="Drop Out / Putus Studi"
            icon={Block}
            colorTheme="error"
          />
          <PrimaryStatsCard
            title="Rata-rata Mahasiswa"
            value={`${summaryData.totalProdi > 0 ? Math.round(summaryData.totalStudents / summaryData.totalProdi) : 0} Mhs`}
            subtitle="Per Program Studi"
            icon={Group}
            colorTheme="primary"
          />
        </div>
      </div>

      {/* Quick Actions */}
      <DashboardQuickActions 
        title="Aksi Cepat"
        description="Pintasan Menu"
        actions={quickActions.map(ql => ({
          label: ql.label,
          icon: ql.icon,
          path: ql.path,
          iconBg: ql.iconBg
        }))}
      />

      {/* ── Enriched Visual Charts Grid ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Chart 1: Distribusi Mahasiswa per Prodi (List) */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex flex-col h-full">
            <div className="flex items-center gap-4 mb-4 shrink-0">
              <div className="w-12 h-12 bg-blue-50/80 rounded-xl flex justify-center items-center text-blue-600 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">groups</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Statistik Distribusi</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Mahasiswa per Prodi</h3>
              </div>
            </div>
            <div className="max-h-[320px] w-full mt-2 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
              {prodiDistributionData.length > 0 ? (
                prodiDistributionData.map((item, idx) => {
                  const percentage = Math.round((item.jumlah / maxStudentsInProdi) * 100);
                  const colors = [
                    { bg: 'bg-blue-500', text: 'text-blue-600', iconBg: 'bg-blue-50 text-blue-600 border-blue-100' },
                    { bg: 'bg-indigo-500', text: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                    { bg: 'bg-emerald-500', text: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                    { bg: 'bg-amber-500', text: 'text-amber-600', iconBg: 'bg-amber-50 text-amber-600 border-amber-100' },
                    { bg: 'bg-rose-500', text: 'text-rose-600', iconBg: 'bg-rose-50 text-rose-600 border-rose-100' }
                  ];
                  const color = colors[idx % colors.length];

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col justify-between transition-colors hover:bg-white hover:border-slate-200 hover:shadow-sm cursor-default">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border", color.iconBg)}>
                            <span className="material-symbols-outlined text-base">school</span>
                          </div>
                          <div className="text-left min-w-0">
                            <span className="text-[11px] font-bold text-slate-800 block truncate" title={item.name}>{item.name}</span>
                          </div>
                        </div>
                        <span className={cn("px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wide shrink-0 border bg-white shadow-sm", color.text, color.iconBg)}>
                          {item.jumlah} Mhs
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                          <span>Rasio terhadap Tertinggi</span>
                          <span className={color.text}>{percentage}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={cn("h-full rounded-full transition-all duration-500", color.bg)} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="py-8 text-center text-xs text-slate-400 italic">Tidak ada data program studi</div>
              )}
            </div>
          </div>
        </div>

        {/* Chart 2: Donut Chart - Status Akademik */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-50/80 rounded-xl flex justify-center items-center text-emerald-600 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">donut_small</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Komposisi Akademik</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Sebaran Status Mahasiswa</h3>
              </div>
            </div>
            <div className="h-[180px] w-full flex items-center justify-center relative">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={dynamicStatusData.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {dynamicStatusData.filter(d => d.value > 0).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", fontSize: "11px", fontWeight: "bold" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {dynamicStatusData.filter(d => d.value > 0).map((item, idx) => (
              <div key={item.name} className="flex items-center gap-2 p-1.5 rounded-md bg-slate-50 border border-slate-100 hover:bg-white transition-colors">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-400 truncate leading-none">{item.name}</p>
                  <p className="text-sm font-black text-slate-700 leading-none mt-1">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 3: Top 5 Prodi Terbesar */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-50/80 rounded-xl flex justify-center items-center text-indigo-600 group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">bar_chart</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Top Distribusi</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">5 Prodi Terbesar</h3>
              </div>
            </div>
            <div className="h-[200px] w-full mt-2">
              {isMounted && (
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={topProdiChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)", fontSize: "11px", fontWeight: "bold" }}
                    />
                    <Bar dataKey="jumlah" name="Jumlah Mhs" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-12">
          <PageCard>
            <PageCardHeader title="Aktivitas Terbaru" description="Log aktivitas sistem terbaru di tingkat fakultas" icon="schedule" />
          <div className="p-5">
            {summaryData.recentActivity?.length > 0
              ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {summaryData.recentActivity.map((activity, idx) => (
                    <div key={idx} className="h-full flex items-start gap-3.5 p-4 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] group hover:border-[var(--theme-border)] hover:bg-[var(--theme-surface)] transition-all shadow-sm hover:shadow">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm flex-shrink-0 border" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)', color: 'var(--theme-primary)', borderColor: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}>
                        {activity.avatar || '—'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-[var(--theme-text)] truncate">{activity.user}</p>
                        <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed mt-1 line-clamp-2">{activity.action}</p>
                      </div>
                      <span className="text-[10px] font-medium text-[var(--theme-text-muted)] bg-[var(--theme-border-muted)]/30 px-2 py-1 rounded-md self-start whitespace-nowrap shrink-0 ml-1">{activity.time}</span>
                    </div>
                  ))}
                </div>
              )
              : (
                <div className="py-16 text-center">
                  <div className="w-12 h-12 bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-xl flex items-center justify-center text-[var(--theme-text-muted)] mx-auto mb-3">
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >notifications</span>
                  </div>
                  <p className="text-xs font-medium text-[var(--theme-text-muted)]">Belum ada aktivitas</p>
                </div>
              )
            }
          </div>
          </PageCard>
        </div>
      </div>
    </PageContent>
  );
}
