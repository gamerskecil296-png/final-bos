import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts';
import { UI } from '@/constants/designSystem';
import { psychologistService } from '@/services/api';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DashboardHero } from '@/components/ui/dashboard';
import DateRangeExportModal from '@/components/ui/DateRangeExportModal';
import { toast } from 'react-hot-toast';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const DownloadIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>;



const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const STAT_SKINS = [
  { icon: 'group', colorTheme: 'primary' },
  { icon: 'check_circle', colorTheme: 'success' },
  { icon: 'error', colorTheme: 'error' },
];

const SOURCE_TABLES = [
  { table: 'psikolog.bookings', note: 'isu dominan dan pasien unik' },
  { table: 'psikolog.session_notes', note: 'sesi, tren bulanan, stabilitas' },
  { table: 'psikolog.assessments', note: 'kasus mendesak' },
];

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function formatValue(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return value ?? '-';
  return new Intl.NumberFormat('id-ID').format(numeric);
}

export default function AnalyticsTrends() {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportModalConfig, setExportModalConfig] = useState({ isOpen: false, title: 'Export Laporan Analitik' });

  // Filter state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedProdi, setSelectedProdi] = useState('');
  const [selectedFakultas, setSelectedFakultas] = useState('');

  // Lookup lists state
  const [prodiList, setProdiList] = useState([]);
  const [fakultasList, setFakultasList] = useState([]);

  // Load lookup data
  useEffect(() => {
    psychologistService.getProdiList().then(res => setProdiList(res.data || res)).catch(console.error);
    psychologistService.getFakultasList().then(res => setFakultasList(res.data || res)).catch(console.error);
  }, []);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (selectedProdi) params.prodi_id = selectedProdi;
      if (selectedFakultas) params.fakultas_id = selectedFakultas;

      const res = await psychologistService.getAnalytics(params);
      setAnalytics(res.data ?? res);
    } catch (err) {
      setError(err?.message || 'Gagal memuat data analitik.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedProdi, selectedFakultas]);

  // Load analytics when filters change
  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const stats = useMemo(() => {
    const rawStats = Array.isArray(analytics?.stats) ? analytics.stats : [];
    return rawStats.map((stat, index) => ({
      ...stat,
      value: formatValue(stat.value),
      iconStr: STAT_SKINS[index]?.icon || 'show_chart',
      colorTheme: STAT_SKINS[index]?.colorTheme || 'primary',
    }));
  }, [analytics]);

  const monthly = useMemo(() => {
    const source = Array.isArray(analytics?.monthly) ? analytics.monthly : [];
    return MONTHS.map((month, index) => ({
      name: month,
      sesi: toNumber(source[index])
    }));
  }, [analytics]);

  const topIssues = Array.isArray(analytics?.top_issues) ? analytics.top_issues : [];
  const recommendations = Array.isArray(analytics?.recommendations) ? analytics.recommendations : [];
  const activities = Array.isArray(analytics?.activities) ? analytics.activities : [];
  const maxMonthly = Math.max(...monthly.map(m => m.sesi), 1);
  const totalMonthlySessions = monthly.reduce((sum, item) => sum + item.sesi, 0);
  const stablePercentage = Math.max(0, Math.min(100, toNumber(analytics?.stable_percentage)));
  const hasAnalytics = Boolean(analytics) && !loading;

  // New analytics values
  const prodiPopularity = Array.isArray(analytics?.prodi_popularity) ? analytics.prodi_popularity : [];
  const academicCount = analytics?.academic_count ?? 0;
  const nonAcademicCount = analytics?.non_academic_count ?? 0;
  const academicPercentage = analytics?.academic_percentage ?? 0;
  const nonAcademicPercentage = analytics?.non_academic_percentage ?? 0;

  const issueCategoriesData = [
    { name: 'Akademik', value: academicCount, fill: '#3b82f6' },
    { name: 'Non-Akademik', value: nonAcademicCount, fill: '#f59e0b' }
  ];
  const dailyTrends = Array.isArray(analytics?.daily_trends) ? analytics.daily_trends : [];
  const maxDaily = Math.max(...dailyTrends.map(d => toNumber(d.count)), 1);

  const HeaderActions = (
    <div className="flex flex-col sm:flex-row gap-3 items-end">
      <div className="flex flex-col gap-1.5 w-full sm:w-[200px]">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Fakultas</label>
        <div className="relative">
          <select
            value={selectedFakultas}
            onChange={(e) => {
              setSelectedFakultas(e.target.value);
              setSelectedProdi('');
            }}
            className="h-10 w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] pl-4 pr-8 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 cursor-pointer"
          >
            <option value="">Semua Fakultas</option>
            {fakultasList.map((f) => (
              <option key={f.id} value={f.id}>{f.nama}</option>
            ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--theme-text-muted)] pointer-events-none">expand_more</span>
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5 w-full sm:w-[160px]">
        <label className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-muted)] pl-1">Program Studi</label>
        <div className="relative">
          <select
            value={selectedProdi}
            onChange={(e) => setSelectedProdi(e.target.value)}
            disabled={!selectedFakultas}
            className="h-10 w-full appearance-none rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] pl-4 pr-8 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">Semua Prodi</option>
            {prodiList
              .filter((p) => !selectedFakultas || p.fakultas_id === Number(selectedFakultas))
              .map((p) => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
          </select>
          <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-[var(--theme-text-muted)] pointer-events-none">expand_more</span>
        </div>
      </div>

      <button
        onClick={() => setExportModalConfig({ isOpen: true, title: 'Export Laporan Analitik' })}
        className="h-10 px-4 rounded-xl font-black text-[10px] uppercase tracking-widest bg-[var(--theme-primary)] text-white shadow-sm flex items-center gap-2 hover:bg-[var(--theme-primary-hover)] transition-all ml-auto sm:ml-2"
        title="Download Analytics as PDF"
      >
        <DownloadIcon size={16} /> <span className="hidden lg:inline">Download Laporan</span>
      </button>
    </div>
  );

  const handleExport = async ({ startDate: modalStartDate, endDate: modalEndDate }) => {
    try {
      const params = {};
      if (modalStartDate) params.start_date = modalStartDate;
      if (modalEndDate) params.end_date = modalEndDate;
      if (selectedProdi) params.prodi_id = selectedProdi;
      if (selectedFakultas) params.fakultas_id = selectedFakultas;
      
      await psychologistService.downloadAnalyticsPDF(params);
      toast.success('Berhasil mengunduh laporan analitik');
      setExportModalConfig({ ...exportModalConfig, isOpen: false });
    } catch (err) {
      toast.error(err.message || 'Gagal mengunduh laporan analitik');
    }
  };

  return (
    <>
      <div className="w-full relative space-y-6 scroll-smooth">
        {/* ── Welcome Banner ─────────────────────────────────────────── */}
        <DashboardHero
          title="Analitik &"
          highlightedTitle="Tren"
          subtitle="Lihat ringkasan real-time dari data sesi, booking, dan asesmen."
          icon="insert_chart"
          badges={[{ label: 'Data Statistik', active: false }]}
          actions={HeaderActions}
        />

        {error && (
          <div className="flex items-start gap-3 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-rose-700">
            <span className="material-symbols-outlined mt-0.5 shrink-0 text-lg">error</span>
            <div>
              <p className="text-xs font-black uppercase tracking-widest">Data belum bisa dimuat</p>
              <p className="mt-1 text-sm font-medium">{error}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 mb-6">
          {loading && !analytics
            ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-32 animate-pulse rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div className="h-4 w-24 rounded bg-slate-100" />
                  <div className="size-10 rounded-xl bg-slate-100" />
                </div>
                <div className="h-8 w-16 rounded bg-slate-100 mt-4" />
              </div>
            ))
            : stats.map((stat, index) => {
              const IconComponent = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>{stat.iconStr}</span>;
              return (
                <PrimaryStatsCard
                  key={stat.label || index}
                  title={stat.label}
                  value={stat.value}
                  icon={IconComponent}
                  colorTheme={stat.colorTheme}
                  badgeText="Data Analitik"
                  badgeIcon={<span className="material-symbols-outlined text-[12px]">{stat.iconStr}</span>}
                />
              );
            })}
        </div>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="space-y-6 xl:col-span-8">
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bar_chart</span>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Grafik Riwayat</span>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">Tren Sesi Bulanan</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span className="material-symbols-outlined text-sm shrink-0">calendar_month</span>
                    Jan-Des
                  </div>
                </div>
              </div>

              <div className="h-72">
                {hasAnalytics && totalMonthlySessions === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-slate-500">Belum ada sesi selesai</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">Grafik akan terisi dari `psikolog.session_notes`.</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-full w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthly} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                        <RechartsTooltip
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                        />
                        <Bar dataKey="sesi" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Tren Harian Bulan Ini */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>show_chart</span>
                </div>
                <div className="flex-1 flex justify-between items-center">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Aktivitas Terkini</span>
                    <h3 className="text-sm font-bold text-slate-800 leading-tight">Tren Konseling Bulan Ini</h3>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-100 bg-slate-50 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500">
                    <span className="material-symbols-outlined text-sm shrink-0">calendar_today</span>
                    Harian
                  </div>
                </div>
              </div>

              <div className="h-64 overflow-x-auto pb-4 scrollbar-thin">
                {dailyTrends.length === 0 ? (
                  <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 text-center">
                    <p className="text-xs font-semibold text-slate-400">Belum ada aktivitas harian pada bulan ini.</p>
                  </div>
                ) : (
                  <div className="h-full w-full min-w-[500px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dailyTrends} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} />
                        <RechartsTooltip
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}
                          labelStyle={{ color: '#64748b' }}
                        />
                        <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

          </div>

          <aside className="space-y-6 xl:col-span-4">
            <div className="rounded-2xl border shadow-sm p-5" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              <h3 className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                <span className="material-symbols-outlined text-lg shrink-0">database</span>
                Sumber Data
              </h3>
              <div className="space-y-3">
                {SOURCE_TABLES.map((source) => (
                  <div key={source.table} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-black text-slate-900">{source.table}</p>
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">{source.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                <span className="material-symbols-outlined text-lg shrink-0">trending_up</span>
                Rekomendasi
              </h3>
              <div className="space-y-3">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => {
                    const positive = rec.type === 'positive';
                    return (
                      <div
                        key={`${rec.title}-${index}`}
                        className={`rounded-2xl border px-4 py-3 ${positive ? 'border-emerald-100 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          {positive ? <span className="material-symbols-outlined text-emerald-600 text-sm shrink-0">check_circle</span> : <span className="material-symbols-outlined text-amber-600 text-sm shrink-0">error</span>}
                          <p className={`text-[10px] font-black uppercase tracking-widest ${positive ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {rec.title}
                          </p>
                        </div>
                        <p className="text-xs font-semibold leading-relaxed text-slate-600">{rec.description}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs font-semibold text-slate-400">
                    Belum ada rekomendasi dari data saat ini.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
              <h3 className="mb-5 flex items-center gap-2 text-xs font-black uppercase tracking-widest text-primary">
                <span className="material-symbols-outlined text-lg shrink-0">schedule</span>
                Aktivitas Terakhir
              </h3>
              <div className="space-y-4">
                {activities.length > 0 ? (
                  activities.map((activity, index) => (
                    <div key={`${activity.title}-${index}`} className="flex gap-3">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/5 text-primary">
                        <span className="material-symbols-outlined text-lg shrink-0">chat</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-black uppercase tracking-wide text-slate-950">{activity.title}</p>
                        <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">{activity.time}</p>
                        <p className="mt-1 line-clamp-2 text-xs font-medium leading-relaxed text-slate-500">{activity.description}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs font-semibold text-slate-400">
                    Belum ada aktivitas sesi.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </section>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3 mb-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>psychology</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Topik Booking</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Isu Dominan</h3>
              </div>
            </div>

            <div className="h-64 w-full flex flex-col items-center justify-center mt-4 pb-4">
              {topIssues.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topIssues.map(issue => ({ name: issue.name || 'Tanpa Topik', value: toNumber(issue.percentage) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {topIssues.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'][index % 6]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center mt-auto">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Belum ada topik</p>
                  <p className="mt-1 text-[10px] font-semibold text-slate-400">Data muncul setelah ada booking.</p>
                </div>
              )}
            </div>
          </div>

          {/* Jurusan/Prodi Terbanyak */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col group hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-3 mb-6 shrink-0">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>domain</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Distribusi Mahasiswa</span>
                <h3 className="text-sm font-bold text-slate-800 leading-tight">Prodi Terbanyak</h3>
              </div>
            </div>

            <div className="h-64 w-full flex flex-col items-center justify-center mt-4 pb-4">
              {prodiPopularity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={prodiPopularity.map(prodi => ({ name: prodi.name, value: toNumber(prodi.count) }))}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {prodiPopularity.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'][index % 6]} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingTop: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Belum ada data prodi</p>
                </div>
              )}
            </div>
          </div>

          {/* Kategori Masalah: Akademik vs Non-Akademik */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
            <div>
              <div className="flex items-center gap-3 mb-6 shrink-0">
                <div className="w-10 h-10 bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>category</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Akademik vs Non</span>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">Kategori Masalah</h3>
                </div>
              </div>

              <div className="h-64 w-full flex flex-col items-center justify-center mt-4 pb-4">
                {(academicCount === 0 && nonAcademicCount === 0) ? (
                  <p className="text-xs font-semibold text-slate-400">Belum ada data kategori.</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={issueCategoriesData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={85}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {issueCategoriesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <RechartsTooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingTop: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
              <span>Total Kasus Terdata:</span>
              <span className="text-slate-950 font-black text-xs">{academicCount + nonAcademicCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      <DateRangeExportModal
        isOpen={exportModalConfig.isOpen}
        onClose={() => setExportModalConfig({ ...exportModalConfig, isOpen: false })}
        onExport={handleExport}
        title={exportModalConfig.title}
        requireRows={false}
      />
    </>
  );
}
