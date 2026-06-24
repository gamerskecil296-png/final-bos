import React from 'react';
import { useFakultasParticipantsQuery, useFakultasScoresQuery, useFakultasMentorsQuery } from '@/queries/useKencanaFakultasQuery';
import { useGroupsQuery, usePeriodsQuery, usePeriodPhasesQuery } from '@/queries/useKencanaAdminQuery';
import useAuthStore from '@/store/useAuthStore';
import { useState, useEffect, useMemo } from 'react';
import { getKencanaInitialFakultas, getKencanaInitialProdi } from '@/utils/kencanaFilters';

const fmtDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { DashboardHero } from '@/components/ui/dashboard';
import { PageContent } from '@/components/ui/page';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DialogModal } from '@/components/ui/DialogModal';

// SVG Icons
const Building2 = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>business</span>;
const Group = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>group</span>;
const Award = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>school</span>;
const GroupsIcon = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>diversity_3</span>;
const LeaderboardIcon = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>leaderboard</span>;
const CheckCircle = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>check_circle</span>;
const Warning = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>assignment_late</span>;
const Pending = ({ size = 24, className = "" }) => <span className={`material-symbols-outlined ${className}`} style={{ fontSize: size }}>pending</span>;

const Dashboard = () => {
  const { data: periods } = usePeriodsQuery();
  const activePeriod = (periods || []).find(p => p.is_active || p.status === 'active') || periods?.[0] || null;
  const { data: phaseData } = usePeriodPhasesQuery(activePeriod?.id);
  const timelinePhases = phaseData?.timeline_phases || [];

  const user = useAuthStore(state => state.user);
  const role = user?.role || '';
  const isFacultyScoped = role === 'kencana_fakultas' || role.includes('kencana_fakultas');
  const isSuperAdmin = role === 'super_admin';
  const [fakultasFilter, setFakultasFilter] = useState(() => getKencanaInitialFakultas(role, isFacultyScoped, user?.fakultas_id));
  const [programStudiFilter, setProgramStudiFilter] = useState(() => getKencanaInitialProdi(role));
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  useEffect(() => {
    const handleFilterChange = (e) => {
      const { fakultasId, programStudiId } = e.detail;
      setFakultasFilter(fakultasId);
      setProgramStudiFilter(programStudiId);
    };

    window.addEventListener('kencana-filter-changed', handleFilterChange);
    return () => window.removeEventListener('kencana-filter-changed', handleFilterChange);
  }, []);

  const queryParams = useMemo(() => ({
    limit: 10000,
    ...(fakultasFilter && { fakultas_id: fakultasFilter }),
    ...(programStudiFilter && { program_studi_id: programStudiFilter }),
  }), [fakultasFilter, programStudiFilter]);

  // Fetch data
  const { data: participants, isLoading: isParticipantsLoading } = useFakultasParticipantsQuery(queryParams);
  const { data: mentors, isLoading: isMentorsLoading } = useFakultasMentorsQuery(queryParams);
  const { data: groups, isLoading: isGroupsLoading } = useGroupsQuery(queryParams, 'fakultas');
  const { data: scores, isLoading: isScoresLoading } = useFakultasScoresQuery(queryParams);

  const participantsList = Array.isArray(participants) ? participants : [];
  const totalParticipants = participantsList.length;
  const facultyMentors = mentors?.filter(m => m.scope_type === 'faculty' || m.scopeType === 'faculty') || [];
  const totalMentors = facultyMentors.length;
  const totalGroups = groups?.length || 0;

  // Calculate scores and graduation analytics
  let passedCount = 0;
  let remedialCount = 0;
  let inProgressCount = 0;
  let scoreSum = 0;
  let scoreCount = 0;
  let cogSum = 0, psySum = 0, affSum = 0;
  const scoresList = Array.isArray(scores) ? scores : [];

  scoresList.forEach(s => {
    const status = (s.graduation_status || s.GraduationStatus || '').toLowerCase();
    if (status === 'passed') passedCount++;
    else if (status === 'remedial') remedialCount++;
    else inProgressCount++;

    if (s.final_score > 0) {
      scoreSum += s.final_score;
      cogSum += s.cognitive_average || 0;
      psySum += s.psychomotor_average || 0;
      affSum += s.affective_average || 0;
      scoreCount++;
    }
  });

  const avgScore = scoreCount > 0 ? (scoreSum / scoreCount).toFixed(1) : '0.0';
  const avgCog = scoreCount > 0 ? Math.round(cogSum / scoreCount) : 0;
  const avgPsy = scoreCount > 0 ? Math.round(psySum / scoreCount) : 0;
  const avgAff = scoreCount > 0 ? Math.round(affSum / scoreCount) : 0;

  const passRate = totalParticipants > 0 ? Math.round((passedCount / totalParticipants) * 100) : 0;
  const remedialRate = totalParticipants > 0 ? Math.round((remedialCount / totalParticipants) * 100) : 0;
  const inProgressRate = totalParticipants > 0 ? Math.round((inProgressCount / totalParticipants) * 100) : 0;

  // Breakdown per program studi (major)
  const prodiMap = {};
  participantsList.forEach(p => {
    const pname = p.program_studi_name || 'Tanpa Prodi';
    if (!prodiMap[pname]) {
      prodiMap[pname] = { count: 0 };
    }
    prodiMap[pname].count += 1;
  });

  const uniqueProdiCount = Object.keys(prodiMap).filter(k => k !== 'Tanpa Prodi').length;
  const prodiBreakdown = Object.entries(prodiMap)
    .map(([name, data]) => ({
      name,
      count: data.count,
      percentage: totalParticipants > 0 ? Math.round((data.count / totalParticipants) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const chartData = prodiBreakdown.map(f => ({
    name: f.name.replace(/^Program Studi\s+/i, '').replace(/^S1\s+/i, ''),
    jumlah: f.count,
    percentage: f.percentage
  }));

  const maxJumlah = Math.max(...chartData.map(d => d.jumlah), 1);

  // Additional 5W1H metrics
  let males = 0, females = 0;
  const cityMap = {};
  const jalurMap = {};

  participantsList.forEach(p => {
    const jk = (p.jenis_kelamin || '').toLowerCase();
    if (jk.startsWith('l')) males++;
    else if (jk.startsWith('p')) females++;

    const kota = p.kota || 'Tidak Diketahui';
    cityMap[kota] = (cityMap[kota] || 0) + 1;

    const jalur = p.jalur || 'Jalur Lainnya';
    jalurMap[jalur] = (jalurMap[jalur] || 0) + 1;
  });

  const cityBreakdown = Object.entries(cityMap)
    .filter(([name]) => name !== 'Tidak Diketahui' && name !== '')
    .map(([name, count]) => ({ name, jumlah: count }))
    .sort((a, b) => b.jumlah - a.jumlah);

  const topCities = cityBreakdown.slice(0, 5);

  const jalurBreakdown = Object.entries(jalurMap)
    .map(([name, count], idx) => {
      const colors = ['var(--theme-primary)', 'var(--theme-info)', 'var(--theme-warning)', 'var(--theme-secondary)', 'var(--theme-success)'];
      return { name, jumlah: count, fill: colors[idx % colors.length] };
    })
    .sort((a, b) => b.jumlah - a.jumlah);

  return (
    <PageContent>
        
        {/* ── Page Header ─────────────────────────────────────────── */}
        <DashboardHero 
          title="Selamat datang,"
          highlightedTitle={`${user?.name?.split(' ')[0] || user?.email?.split('@')[0] || 'Admin'}!`}
          subtitle="Ringkasan data peserta PKKMB, status kelulusan orientasi, dan data pendukung bimbingan fakultas secara real-time."
          icon="domain"
          badges={[
            { label: 'PORTAL ORIENTASI FAKULTAS', active: false },
            { label: `${isParticipantsLoading ? '...' : totalParticipants} PESERTA PKKMB`, active: true }
          ]}
          actions={
            <button 
              onClick={() => window.location.reload()} 
              className="h-10 px-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)] text-xs font-bold text-[var(--theme-text)] flex items-center gap-2 transition-all shadow-sm shrink-0 uppercase tracking-wider"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sync</span>
              REFRESH DATA
            </button>
          }
        />

        {/* ── Enriched Stats Grid ─────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <PrimaryStatsCard
            title="Total Peserta"
            value={isParticipantsLoading ? '...' : totalParticipants}
            icon="group"
            colorTheme="primary"
          />
          <PrimaryStatsCard
            title="Jumlah Kelompok"
            value={isGroupsLoading ? '...' : totalGroups}
            icon="diversity_3"
            colorTheme="info"
          />
          <PrimaryStatsCard
            title="Mentor / DP"
            value={isMentorsLoading ? '...' : totalMentors}
            icon="school"
            colorTheme="warning"
          />
          <PrimaryStatsCard
            title="Rerata Nilai"
            value={isScoresLoading ? '...' : avgScore}
            icon="leaderboard"
            colorTheme="error"
          />
        </div>

        {/* ── Academic Analytics Cards ───────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card Lulus Orientasi */}
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 transition-all text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-success-light)] text-[var(--theme-success)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">check_circle</span>
                </div>
                <h3 className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Lulus Orientasi</h3>
              </div>
              <span className="text-xs font-bold text-[var(--theme-success)] bg-[var(--theme-success-light)] px-2 py-0.5 rounded-lg border border-[var(--theme-success-light)]">{passRate}%</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-xl font-bold text-[var(--theme-text)]">{isScoresLoading ? '...' : passedCount}</span>
              <span className="text-xs font-semibold text-[var(--theme-text-muted)] mb-0.5">Mahasiswa</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--theme-success)] rounded-full transition-all duration-500" style={{ width: `${passRate}%` }} />
            </div>
          </div>

          {/* Card Perlu Remedial */}
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 transition-all text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-error-light)] text-[var(--theme-error)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">assignment_late</span>
                </div>
                <h3 className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Perlu Remedial</h3>
              </div>
              <span className="text-xs font-bold text-[var(--theme-error)] bg-[var(--theme-error-light)] px-2 py-0.5 rounded-lg border border-[var(--theme-error-light)]">{remedialRate}%</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-xl font-bold text-[var(--theme-text)]">{isScoresLoading ? '...' : remedialCount}</span>
              <span className="text-xs font-semibold text-[var(--theme-text-muted)] mb-0.5">Mahasiswa</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--theme-error)] rounded-full transition-all duration-500" style={{ width: `${remedialRate}%` }} />
            </div>
          </div>

          {/* Card Sedang Berjalan */}
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 transition-all text-left">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--theme-warning-light)] text-[var(--theme-warning)] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-xl">pending</span>
                </div>
                <h3 className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Sedang Berjalan</h3>
              </div>
              <span className="text-xs font-bold text-[var(--theme-warning)] bg-[var(--theme-warning-light)] px-2 py-0.5 rounded-lg border border-[var(--theme-warning-light)]">{inProgressRate}%</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="text-xl font-bold text-[var(--theme-text)]">{isScoresLoading ? '...' : inProgressCount}</span>
              <span className="text-xs font-semibold text-[var(--theme-text-muted)] mb-0.5">Mahasiswa</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--theme-warning)] rounded-full transition-all duration-500" style={{ width: `${inProgressRate}%` }} />
            </div>
          </div>
        </div>

        {/* ── Enriched Visual Charts Grid ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
              {/* Who: Demografi Gender */}
              <div className="lg:col-span-1 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[var(--theme-secondary-light)] rounded-xl flex justify-center items-center text-[var(--theme-secondary)]">
                       <span className="material-symbols-outlined text-[var(--theme-secondary)]" style={{ fontSize: '20px' }}>wc</span>
                    </div>
                    <div className="text-left">
                       <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Demografi</h2>
                       <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Komposisi berdasarkan gender</p>
                    </div>
                  </div>
                  <div className="flex-1 min-h-[160px] flex flex-col items-center justify-center pt-2">
                     <div className="w-full flex items-center justify-between mb-2">
                        <div className="flex flex-col items-center gap-1">
                           <span className="text-3xl font-black text-blue-600 font-headline">{males}</span>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Laki-Laki</span>
                        </div>
                        <div className="text-xs font-bold text-slate-300">VS</div>
                        <div className="flex flex-col items-center gap-1">
                           <span className="text-3xl font-black text-pink-500 font-headline">{females}</span>
                           <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Perempuan</span>
                        </div>
                     </div>
                     <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden mt-2 border border-slate-200">
                        <div className="h-full bg-blue-500" style={{ width: `${(males / (males + females || 1)) * 100}%` }}></div>
                        <div className="h-full bg-pink-500" style={{ width: `${(females / (males + females || 1)) * 100}%` }}></div>
                     </div>
                  </div>
                </div>
              </div>

              {/* Where: Asal Wilayah */}
              <div className="lg:col-span-1 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col group relative cursor-pointer hover:border-[var(--theme-info)]/30 hover:shadow-md transition-all" onClick={() => setIsCityModalOpen(true)}>
                 <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-[var(--theme-info-light)] rounded-xl flex justify-center items-center text-[var(--theme-info)] group-hover:scale-105 transition-transform">
                          <span className="material-symbols-outlined text-[var(--theme-info)]" style={{ fontSize: '20px' }}>map</span>
                       </div>
                       <div className="text-left">
                          <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Asal Wilayah</h2>
                          <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Top kota pendaftar</p>
                       </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[var(--theme-bg)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                       <span className="material-symbols-outlined text-[var(--theme-info)]" style={{ fontSize: '16px' }}>open_in_new</span>
                    </div>
                 </div>
                 <div className="flex-1 space-y-3 mt-2">
                    {topCities.map((item, idx) => (
                       <div key={idx} className="flex justify-between items-center group/item">
                          <div className="flex items-center gap-3">
                             <div className="w-6 h-6 rounded bg-[var(--theme-bg)] border border-[var(--theme-border)] flex justify-center items-center text-[10px] font-bold text-[var(--theme-text-muted)] group-hover/item:bg-[var(--theme-info-light)] group-hover/item:text-[var(--theme-info)] transition-colors">{idx + 1}</div>
                             <span className="text-sm font-semibold text-[var(--theme-text)] truncate max-w-[100px]" title={item.name}>{item.name}</span>
                          </div>
                          <span className="text-sm font-bold text-[var(--theme-info)] bg-[var(--theme-info-light)] px-2 py-0.5 rounded-lg">{item.jumlah}</span>
                       </div>
                    ))}
                    {topCities.length === 0 && (
                       <div className="text-center py-4 text-xs font-bold text-slate-400">Belum ada data wilayah</div>
                    )}
                 </div>
              </div>

              {/* How: Jalur Penerimaan */}
              <div className="lg:col-span-1 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col">
                 <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-[var(--theme-warning-light)] rounded-xl flex justify-center items-center text-[var(--theme-warning)]">
                       <span className="material-symbols-outlined text-[var(--theme-warning)]" style={{ fontSize: '20px' }}>alt_route</span>
                    </div>
                    <div className="text-left">
                       <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Jalur Masuk</h2>
                       <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Metode pendaftaran peserta</p>
                    </div>
                 </div>
                 <div className="flex-1 space-y-3 mt-2">
                    {jalurBreakdown.map((item, idx) => {
                       const total = males + females || 1;
                       const pct = Math.round((item.jumlah / total) * 100);
                       return (
                       <div key={idx} className="space-y-1.5">
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-bold text-[var(--theme-text-muted)] truncate max-w-[120px]">{item.name}</span>
                             <span className="text-xs font-black" style={{ color: item.fill }}>{pct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
                             <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: item.fill }}></div>
                          </div>
                       </div>
                    )})}
                 </div>
              </div>

              {/* When: Timeline Pelaksanaan */}
              <div className="lg:col-span-1 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col">
                 <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 bg-[var(--theme-success-light)] rounded-xl flex justify-center items-center text-[var(--theme-success)]">
                       <span className="material-symbols-outlined text-[var(--theme-success)]" style={{ fontSize: '20px' }}>event_available</span>
                    </div>
                    <div className="text-left">
                       <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Status</h2>
                       <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Progres agenda orientasi</p>
                    </div>
                 </div>
                 <div className="flex-1 flex flex-col justify-center gap-4 relative pl-4 mt-2 border-l-2 border-[var(--theme-border)]">
                     {[
                        { key: 'pra_kencana', label: 'Pra-Kencana', step: 'Tahap 1' },
                        { key: 'kencana_universitas', label: 'Kencana University', step: 'Tahap 2' },
                        { key: 'kencana_fakultas', label: 'Kencana Fakultas', step: 'Tahap 3' },
                        { key: 'pasca_kencana', label: 'Pasca-Kencana', step: 'Tahap 4' },
                     ].map((phase) => {
                        const pData = timelinePhases.find(p => p.phase_type === phase.key);
                        const isActive = pData ? (pData.is_active || pData.status === 'active') : false;
                        const isCompleted = pData ? pData.status === 'completed' : false;

                        let dotClass = "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--theme-border-muted)] ring-4 ring-[var(--theme-surface)]";
                        let textClass = "text-sm font-semibold text-[var(--theme-text-muted)]";
                        let containerClass = "relative opacity-40";
                        let statusText = "";

                        if (isActive) {
                           dotClass = "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--theme-primary)] ring-4 ring-[var(--theme-surface)] shadow-[0_0_0_2px_var(--theme-primary-light)]";
                           textClass = "text-sm font-bold text-[var(--theme-text)]";
                           containerClass = "relative opacity-100";
                           statusText = "Aktif";
                        } else if (isCompleted) {
                           dotClass = "absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--theme-success)] ring-4 ring-[var(--theme-surface)]";
                           textClass = "text-sm font-bold text-[var(--theme-text)]";
                           containerClass = "relative opacity-100";
                           statusText = "Selesai";
                        }

                        return (
                           <div key={phase.key} className={containerClass}>
                              <div className={dotClass}></div>
                              <div className="flex items-center gap-2">
                                 <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider mb-0.5">{phase.step}</p>
                                 {statusText && (
                                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase ${isActive ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : 'bg-[var(--theme-success-light)] text-[var(--theme-success)]'}`}>
                                       {statusText}
                                    </span>
                                 )}
                              </div>
                              <p className={textClass}>{phase.label}</p>
                              {pData?.start_date && pData?.end_date && (
                                 <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] mt-0.5">
                                    {fmtDate(pData.start_date)} - {fmtDate(pData.end_date)}
                                 </p>
                              )}
                           </div>
                        );
                     })}
                 </div>
              </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Prodi breakdown list */}
            <div className="lg:col-span-2 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between">
              <div>
                 <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
                       <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>bar_chart</span>
                    </div>
                    <div className="text-left">
                       <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Sebaran Maba per Program Studi</h2>
                       <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Sebaran pendaftaran mahasiswa baru PKKMB di setiap jurusan</p>
                    </div>
                 </div>
                 
                 <div className="w-full mt-6 h-[240px] overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-[var(--theme-border)] scrollbar-track-transparent">
                    {chartData.length > 0 ? (
                       chartData.map((item, idx) => {
                          const fillPercentage = Math.round((item.jumlah / maxJumlah) * 100);
                          const colors = [
                             { bg: 'bg-blue-500', text: 'text-blue-600', iconBg: 'bg-blue-50 text-blue-600 border-blue-100' },
                             { bg: 'bg-indigo-500', text: 'text-indigo-600', iconBg: 'bg-indigo-50 text-indigo-600 border-indigo-100' },
                             { bg: 'bg-emerald-500', text: 'text-emerald-600', iconBg: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                             { bg: 'bg-amber-500', text: 'text-amber-600', iconBg: 'bg-amber-50 text-amber-600 border-amber-100' },
                             { bg: 'bg-rose-500', text: 'text-rose-600', iconBg: 'bg-rose-50 text-rose-600 border-rose-100' }
                          ];
                          const color = colors[idx % colors.length];

                          return (
                             <div key={idx} className="p-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] flex flex-col justify-between transition-colors hover:bg-[var(--theme-surface)] hover:border-[var(--theme-primary)]/30 hover:shadow-sm cursor-default">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                   <div className="flex items-center gap-3 min-w-0">
                                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 border ${color.iconBg}`}>
                                         <span className="material-symbols-outlined text-base">school</span>
                                      </div>
                                      <div className="text-left min-w-0">
                                         <span className="text-xs font-bold text-[var(--theme-text)] block truncate" title={item.name}>{item.name}</span>
                                      </div>
                                   </div>
                                   <span className={`px-2 py-0.5 rounded-lg text-[9px] font-extrabold tracking-wide shrink-0 border bg-[var(--theme-surface)] shadow-sm ${color.text} ${color.iconBg}`}>
                                      {item.jumlah} Maba
                                   </span>
                                </div>
                                
                                <div className="space-y-1">
                                   <div className="flex justify-between items-center text-[9px] font-bold text-[var(--theme-text-muted)]">
                                      <span>Rasio terhadap Tertinggi</span>
                                      <span className={color.text}>{fillPercentage}%</span>
                                   </div>
                                   <div className="w-full h-1.5 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-500 ${color.bg}`} style={{ width: `${fillPercentage}%` }} />
                                   </div>
                                </div>
                             </div>
                          )
                       })
                    ) : (
                       <div className="h-full flex flex-col items-center justify-center text-[var(--theme-text-muted)] bg-[var(--theme-bg)] rounded-2xl border border-dashed border-[var(--theme-border)]">
                          <span className="material-symbols-outlined text-4xl mb-2 opacity-30">analytics</span>
                          <p className="text-sm font-bold">{isParticipantsLoading ? 'Memuat data...' : 'Belum ada data'}</p>
                       </div>
                    )}
                 </div>
              </div>
            </div>

            {/* Chart 2: Competency Breakdown */}
            <div className="lg:col-span-1 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between">
              <div className="flex flex-col h-full justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                     <div className="w-10 h-10 bg-[var(--theme-warning-light)] rounded-xl flex justify-center items-center text-[var(--theme-warning)]">
                        <span className="material-symbols-outlined text-[var(--theme-warning)]" style={{ fontSize: '20px' }}>psychology</span>
                     </div>
                     <div className="text-left">
                        <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Kompilasi Kompetensi</h2>
                        <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Rata-rata aspek penilaian PKKMB</p>
                     </div>
                  </div>

                  <div className="space-y-5 mt-6 text-left">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--theme-text-muted)]">Kognitif (Misi & Kuis)</span>
                        <span className="font-black text-[var(--theme-primary)]">{isScoresLoading ? '...' : `${avgCog}/100`}</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--theme-primary)] rounded-full transition-all duration-500" style={{ width: `${avgCog}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--theme-text-muted)]">Psikomotorik (Tugas / Handbook)</span>
                        <span className="font-black text-[var(--theme-info)]">{isScoresLoading ? '...' : `${avgPsy}/100`}</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--theme-info)] rounded-full transition-all duration-500" style={{ width: `${avgPsy}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--theme-text-muted)]">Afektif (DP / Mentor Review)</span>
                        <span className="font-black text-[var(--theme-success)]">{isScoresLoading ? '...' : `${avgAff}/100`}</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--theme-success)] rounded-full transition-all duration-500" style={{ width: `${avgAff}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-2xl p-4 mt-6 text-left shrink-0">
                  <div className="flex gap-2 items-start text-xs font-semibold text-[var(--theme-text-muted)] leading-relaxed">
                    <span className="material-symbols-outlined text-[var(--theme-primary)] shrink-0" style={{ fontSize: '16px' }}>info</span>
                    <span>Nilai dihitung berdasarkan data akumulasi tugas, kuis, kehadiran, dan penilaian kedisiplinan maba.</span>
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Modal Detail Wilayah */}
        <DialogModal
           open={isCityModalOpen}
           onOpenChange={setIsCityModalOpen}
           title="Detail Asal Wilayah"
           subtitle="DAFTAR KOTA"
           icon="map"
           maxWidth="max-w-md"
           bodyClassName="p-0"
        >
           <div className="max-h-[60vh] overflow-y-auto bg-slate-50/50 p-4">
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                 <div className="grid grid-cols-12 gap-4 p-3 bg-slate-50 border-b border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="col-span-2 text-center">No</div>
                    <div className="col-span-8">Nama Kota/Kabupaten</div>
                    <div className="col-span-2 text-center">Jml</div>
                 </div>
                 <div className="divide-y divide-slate-100">
                    {cityBreakdown.map((item, idx) => (
                       <div key={idx} className="grid grid-cols-12 gap-4 p-3 items-center hover:bg-blue-50/30 transition-colors">
                          <div className="col-span-2 text-center text-xs font-bold text-slate-400">{idx + 1}</div>
                          <div className="col-span-8 text-sm font-bold text-slate-700">{item.name}</div>
                          <div className="col-span-2 text-center text-xs font-black text-[var(--theme-info)] bg-[var(--theme-info-light)] rounded-md py-1">{item.jumlah}</div>
                       </div>
                    ))}
                    {cityBreakdown.length === 0 && (
                       <div className="p-8 text-center text-sm font-bold text-slate-400">Belum ada data wilayah yang diketahui</div>
                    )}
                 </div>
              </div>
           </div>
        </DialogModal>
    </PageContent>
  );
};

export default Dashboard;
