import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { usePeriodsQuery, useMentorsQuery, usePeriodPhasesQuery, useDashboardStatsQuery } from '@/queries/useKencanaAdminQuery';
import { PageHeader } from '@/components/ui/page/PageHeader';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { DialogModal } from '@/components/ui/DialogModal';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const fmtDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }) : '';

const Dashboard = ({ portalType = 'admin' }) => {
  const { data: periods, isLoading: loadingPeriods } = usePeriodsQuery();
  const { data: mentors, isLoading: loadingMentors } = useMentorsQuery();
  const activePeriod = (periods || []).find(p => p.is_active || p.status === 'active') || periods?.[0] || null;
  const { data: statsData, isLoading: loadingStats } = useDashboardStatsQuery({ period_id: activePeriod?.id || '' }, portalType);
  
  const { data: phaseData } = usePeriodPhasesQuery(activePeriod?.id);
  const timelinePhases = phaseData?.timeline_phases || [];

  const isFakultasPortal = portalType === 'faculty' || portalType === 'fakultas';
  const [isCityModalOpen, setIsCityModalOpen] = useState(false);

  const isLoading = loadingPeriods || loadingStats || loadingMentors;

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-64 bg-transparent">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[var(--theme-primary)]"></div>
      </div>
    );
  }

  const s = statsData || {};
  
  const totalParticipants = s.total_participants || 0;
  const facultyBreakdown = (s.faculty_breakdown || []).map(f => ({
    ...f,
    percentage: totalParticipants > 0 ? Math.round((f.jumlah / totalParticipants) * 100) : 0
  }));
  const prodiBreakdown = s.prodi_breakdown || [];
  const cityBreakdown = s.city_breakdown || [];
  const topCities = cityBreakdown.slice(0, 5);
  
  let males = s.males || 0;
  let females = s.females || 0;

  const jalurBreakdown = (s.jalur_breakdown || []).map((j, idx) => {
    const colors = ['var(--theme-primary)', 'var(--theme-info)', 'var(--theme-warning)', 'var(--theme-secondary)', 'var(--theme-success)'];
    return { ...j, fill: colors[idx % colors.length] };
  });

  const passedCount = s.passed_count || 0;
  const remedialCount = s.remedial_count || 0;
  const inProgressCount = s.in_progress_count || 0;
  
  const avgScore = s.avg_score ? s.avg_score.toFixed(1) : '0.0';
  const avgCog = s.avg_cog ? Math.round(s.avg_cog) : 0;
  const avgPsy = s.avg_psy ? Math.round(s.avg_psy) : 0;
  const avgAff = s.avg_aff ? Math.round(s.avg_aff) : 0;

  const passRate = totalParticipants > 0 ? Math.round((passedCount / totalParticipants) * 100) : 0;
  const remedialRate = totalParticipants > 0 ? Math.round((remedialCount / totalParticipants) * 100) : 0;
  const inProgressRate = totalParticipants > 0 ? Math.round((inProgressCount / totalParticipants) * 100) : 0;

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <PageHeader
          icon="shield_person"
          title={
            <>
              <span className="text-[var(--theme-text)]">{isFakultasPortal ? 'Admin Fakultas ' : 'Super Admin '}</span>
              <span className="text-[var(--theme-primary)]">Kencana</span>
            </>
          }
          subtitle="Kelola seluruh tahapan PKKMB, atur penugasan mentor, dan awasi perkembangan nilai mahasiswa dari satu dashboard terpusat."
          breadcrumbs={[
            { label: 'Kencana Admin', path: '#' },
            { label: 'Dashboard Admin Universitas' }
          ]}
          action={
            <div className="flex gap-2 w-full md:w-auto items-center">
              <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] px-4 py-2 rounded-xl text-center min-w-[140px] shrink-0">
                <p className="text-[9px] font-bold text-[var(--theme-secondary)] uppercase tracking-wider">Periode Aktif</p>
                <p className="text-xs font-semibold truncate max-w-[120px]" style={{ color: 'var(--theme-text)' }}>
                  {activePeriod ? activePeriod.name : 'Belum Ada'}
                </p>
              </div>
            </div>
          }
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <PrimaryStatsCard
            title="Total Periode"
            value={periods?.length || 0}
            icon="calendar_today"
            colorTheme="primary"
          />
          <PrimaryStatsCard
            title="Total Peserta"
            value={totalParticipants}
            icon="group"
            colorTheme="info"
          />
          <PrimaryStatsCard
            title="Total Mentor"
            value={mentors?.length || 0}
            icon="groups"
            colorTheme="warning"
          />
          <PrimaryStatsCard
            title="Rerata Nilai"
            value={avgScore}
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
                <h3 className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Lulus Orientasi</h3>
              </div>
              <span className="text-xs font-bold text-[var(--theme-success)] bg-[var(--theme-success-light)] px-2 py-0.5 rounded-lg border border-[var(--theme-success-light)]">{passRate}%</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="font-black text-[var(--theme-text)] tracking-tighter font-headline text-xl">{passedCount}</span>
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
                <h3 className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Perlu Remedial</h3>
              </div>
              <span className="text-xs font-bold text-[var(--theme-error)] bg-[var(--theme-error-light)] px-2 py-0.5 rounded-lg border border-[var(--theme-error-light)]">{remedialRate}%</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="font-black text-[var(--theme-text)] tracking-tighter font-headline text-xl">{remedialCount}</span>
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
                <h3 className="text-[11px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">Sedang Berjalan</h3>
              </div>
              <span className="text-xs font-bold text-[var(--theme-warning)] bg-[var(--theme-warning-light)] px-2 py-0.5 rounded-lg border border-[var(--theme-warning-light)]">{inProgressRate}%</span>
            </div>
            <div className="flex items-end gap-2 mb-3">
              <span className="font-black text-[var(--theme-text)] tracking-tighter font-headline text-xl">{inProgressCount}</span>
              <span className="text-xs font-semibold text-[var(--theme-text-muted)] mb-0.5">Mahasiswa</span>
            </div>
            <div className="w-full h-1.5 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
              <div className="h-full bg-[var(--theme-warning)] rounded-full transition-all duration-500" style={{ width: `${inProgressRate}%` }} />
            </div>
          </div>
        </div>

        {/* ── Additional 5W1H Analytics ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
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
                             <span className="text-sm font-semibold text-[var(--theme-text)] truncate max-w-[140px]" title={item.name}>{item.name}</span>
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
                             <span className="text-xs font-bold text-[var(--theme-text-muted)] truncate">{item.name}</span>
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
                       <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Status Pelaksanaan</h2>
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

        {/* ── Monitoring Kencana Fakultas ─────────────────────────── */}
        {!isFakultasPortal && phaseData?.faculty_phases?.length > 0 && (
          <div className="bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[var(--theme-info-light)] rounded-xl flex justify-center items-center text-[var(--theme-info)]">
                <span className="material-symbols-outlined text-[var(--theme-info)]" style={{ fontSize: '20px' }}>account_balance</span>
              </div>
              <div className="text-left">
                <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Monitoring Kencana Fakultas</h2>
                <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Status pelaksanaan orientasi di masing-masing fakultas</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {phaseData.faculty_phases.map((fp) => {
                let statusLabel = fp.status;
                if (fp.status === 'not_open') statusLabel = 'Belum Buka';
                if (fp.status === 'ready') statusLabel = 'Siap';
                if (fp.status === 'active' || fp.status === 'in_progress') statusLabel = 'Aktif';
                if (fp.status === 'completed') statusLabel = 'Selesai';
                
                return (
                  <div key={fp.id} className="p-4 rounded-2xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] flex justify-between items-center">
                    <div>
                      <p className="text-sm font-bold text-[var(--theme-text)]">{fp.fakultas?.Nama || fp.fakultas?.nama || 'Fakultas'}</p>
                      {fp.start_date && fp.end_date && (
                         <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] mt-1">
                            {fmtDate(fp.start_date)} - {fmtDate(fp.end_date)}
                         </p>
                      )}
                    </div>
                    <span className={`text-[10px] font-extrabold px-2 py-1 rounded-md uppercase tracking-wider ${
                      fp.status === 'completed' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)]' :
                      fp.status === 'active' || fp.status === 'in_progress' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' :
                      fp.status === 'ready' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)]' :
                      'bg-[var(--theme-border-muted)] text-[var(--theme-text-muted)]'
                    }`}>
                      {statusLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Visual Charts Grid ─────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {isFakultasPortal ? (
            <>
              {/* What & Where: Sebaran Program Studi */}
              <div className="lg:col-span-3 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
                       <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>domain</span>
                    </div>
                    <div className="text-left">
                       <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Sebaran Program Studi</h2>
                       <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Komposisi mahasiswa baru berdasarkan program studi</p>
                    </div>
                  </div>
                  <div className="w-full mt-6">
                    {prodiBreakdown.length > 0 ? (
                      <ResponsiveContainer width="99%" height={260} debounce={50}>
                        <BarChart data={prodiBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--theme-border-muted)" />
                          <XAxis type="number" hide domain={[0, 'dataMax']} />
                          <YAxis dataKey="name" type="category" width={160}
                            tick={({ y, payload }) => (
                              <text x={0} y={y} dy={4} textAnchor="start" fill="var(--theme-text-muted)" fontSize={9.5} fontWeight={700} className="font-headline">
                                {payload.value?.length > 25 ? `${payload.value.substring(0, 25)}...` : payload.value}
                              </text>
                            )}
                            axisLine={false} tickLine={false}
                          />
                          <Tooltip cursor={{ fill: 'var(--theme-bg)' }}
                            contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "11px", fontWeight: "bold", color: "var(--theme-text)" }}
                          />
                          <Bar dataKey="jumlah" fill="var(--theme-primary)" radius={[0, 10, 10, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[200px] flex flex-col items-center justify-center text-[var(--theme-text-muted)] bg-[var(--theme-bg)] rounded-2xl border border-dashed border-[var(--theme-border)]">
                         <span className="material-symbols-outlined text-4xl mb-2 opacity-50">analytics</span>
                         <span className="text-xs font-bold font-body">Belum ada data</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Chart 1: Faculty breakdown */}
              <div className="lg:col-span-2 bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm flex flex-col justify-between">
                <div>
                   <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 bg-[var(--theme-primary-light)] rounded-xl flex justify-center items-center text-[var(--theme-primary)]">
                         <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>bar_chart</span>
                      </div>
                      <div className="text-left">
                         <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Sebaran Keseluruhan Fakultas</h2>
                         <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Sebaran pendaftaran peserta PKKMB di setiap fakultas universitas</p>
                      </div>
                   </div>
                   
                   <div className="w-full mt-6">
                      {facultyBreakdown.length > 0 ? (
                        <ResponsiveContainer width="99%" height={240} debounce={50}>
                        <BarChart data={facultyBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--theme-border-muted)" />
                          <XAxis type="number" hide domain={[0, 'dataMax']} />
                          <YAxis dataKey="name" type="category" width={160}
                            tick={({ y, payload }) => (
                              <text x={0} y={y} dy={4} textAnchor="start" fill="var(--theme-text-muted)" fontSize={9.5} fontWeight={700} className="font-headline">
                                {payload.value?.length > 25 ? `${payload.value.substring(0, 25)}...` : payload.value}
                              </text>
                            )}
                            axisLine={false} tickLine={false}
                          />
                          <Tooltip cursor={{ fill: 'var(--theme-bg)' }}
                            contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "11px", fontWeight: "bold", color: "var(--theme-text)" }}
                          />
                          <Bar dataKey="jumlah" fill="var(--theme-primary)" radius={[0, 10, 10, 0]} barSize={14} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                       <div className="h-[200px] flex flex-col items-center justify-center text-[var(--theme-text-muted)] bg-[var(--theme-bg)] rounded-2xl border border-dashed border-[var(--theme-border)]">
                          <span className="material-symbols-outlined text-4xl mb-2 opacity-30">analytics</span>
                          <p className="text-sm font-bold">{loadingStats ? 'Memuat grafik...' : 'Belum ada data'}</p>
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
                        <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Akumulasi Kompetensi</h2>
                        <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Rata-rata aspek penilaian seluruh universitas</p>
                     </div>
                  </div>

                  <div className="space-y-5 mt-6 text-left">
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--theme-text-muted)]">Kognitif (Misi & Kuis)</span>
                        <span className="font-black text-[var(--theme-primary)]">{loadingStats ? '...' : `${avgCog}/100`}</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--theme-primary)] rounded-full transition-all duration-500" style={{ width: `${avgCog}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--theme-text-muted)]">Psikomotorik (Tugas / Handbook)</span>
                        <span className="font-black text-[var(--theme-info)]">{loadingStats ? '...' : `${avgPsy}/100`}</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--theme-border-muted)] rounded-full overflow-hidden">
                        <div className="h-full bg-[var(--theme-info)] rounded-full transition-all duration-500" style={{ width: `${avgPsy}%` }} />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-[var(--theme-text-muted)]">Afektif (DP / Mentor Review)</span>
                        <span className="font-black text-[var(--theme-success)]">{loadingStats ? '...' : `${avgAff}/100`}</span>
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
                    <span>Nilai dihitung berdasarkan total rata-rata kuis, penugasan, and review mentor universitas.</span>
                  </div>
                </div>
              </div>
              </div>
            </>
          )}
        </div>

        {/* ── Visual Charts Grid 2 (Program Studi) ─────────────────────────── */}
        <div className="bg-[var(--theme-surface)] p-6 rounded-3xl border border-[var(--theme-border)] shadow-sm">
           <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-[var(--theme-info-light)] rounded-xl flex justify-center items-center text-[var(--theme-info)]">
                 <span className="material-symbols-outlined text-[var(--theme-info)]" style={{ fontSize: '20px' }}>domain</span>
              </div>
              <div className="text-left">
                 <h2 className="text-lg font-black text-[var(--theme-text)] tracking-tight font-headline">Sebaran Keseluruhan Program Studi</h2>
                 <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-0.5">Seluruh program studi dengan jumlah peserta terbanyak (diurutkan)</p>
              </div>
           </div>
           
           <div className="w-full mt-6">
              {prodiBreakdown.length > 0 ? (
                <ResponsiveContainer width="99%" height={Math.max(300, prodiBreakdown.length * 28)} debounce={50}>
                  <BarChart data={prodiBreakdown} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="var(--theme-border-muted)" />
                    <XAxis type="number" hide domain={[0, 'dataMax']} />
                    <YAxis dataKey="name" type="category" width={220}
                      tick={({ y, payload }) => (
                        <text x={0} y={y} dy={4} textAnchor="start" fill="var(--theme-text-muted)" fontSize={10} fontWeight={700} className="font-headline">
                          {payload.value?.length > 40 ? `${payload.value.substring(0, 40)}...` : payload.value}
                        </text>
                      )}
                      axisLine={false} tickLine={false}
                    />
                    <Tooltip cursor={{ fill: 'var(--theme-bg)' }}
                      contentStyle={{ backgroundColor: "var(--theme-surface)", border: "1px solid var(--theme-border)", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)", fontSize: "11px", fontWeight: "bold", color: "var(--theme-text)" }}
                    />
                    <Bar dataKey="jumlah" fill="var(--theme-info)" radius={[0, 10, 10, 0]} barSize={12} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                 <div className="h-[200px] flex flex-col items-center justify-center text-[var(--theme-text-muted)] bg-[var(--theme-bg)] rounded-2xl border border-dashed border-[var(--theme-border)]">
                    <span className="material-symbols-outlined text-4xl mb-2 opacity-30">analytics</span>
                    <p className="text-sm font-bold">{loadingStats ? 'Memuat grafik...' : 'Belum ada data'}</p>
                 </div>
              )}
           </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]">
            <h2 className="text-xs font-bold uppercase tracking-widest text-[var(--theme-primary)] font-headline">Akses Cepat Pengelolaan</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[var(--theme-border)]">
            <Link to="/app/kencana/periods" className="p-6 hover:bg-[var(--theme-bg)] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border border-[var(--theme-primary-light)] flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-xl">calendar_today</span>
              </div>
              <h3 className="font-bold text-[var(--theme-text)] text-sm mb-1 group-hover:text-[var(--theme-primary)] transition-colors font-headline">Periode PKKMB</h3>
              <p className="text-xs text-[var(--theme-text-muted)] font-medium">Buka atau tutup periode Kencana.</p>
            </Link>

            <Link to="/app/kencana/stages" className="p-6 hover:bg-[var(--theme-bg)] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-info-light)] text-[var(--theme-info)] border border-[var(--theme-info-light)] flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-xl">menu_book</span>
              </div>
              <h3 className="font-bold text-[var(--theme-text)] text-sm mb-1 group-hover:text-[var(--theme-info)] transition-colors font-headline">Tahapan & Materi</h3>
              <p className="text-xs text-[var(--theme-text-muted)] font-medium">Kelola modul, quiz, dan materi untuk mahasiswa.</p>
            </Link>

            <Link to="/app/kencana/mentors" className="p-6 hover:bg-[var(--theme-bg)] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border border-[var(--theme-warning-light)] flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-xl">assignment_ind</span>
              </div>
              <h3 className="font-bold text-[var(--theme-text)] text-sm mb-1 group-hover:text-[var(--theme-warning)] transition-colors font-headline">Akun Mentor</h3>
              <p className="text-xs text-[var(--theme-text-muted)] font-medium">Buat dan kelola akun Dewan Pembimbing Kencana.</p>
            </Link>

            <Link to="/app/kencana/scores" className="p-6 hover:bg-[var(--theme-bg)] transition-colors group">
              <div className="w-10 h-10 rounded-xl bg-[var(--theme-error-light)] text-[var(--theme-error)] border border-[var(--theme-error-light)] flex items-center justify-center mb-4 group-hover:scale-110 transition-all">
                <span className="material-symbols-outlined text-xl">fact_check</span>
              </div>
              <h3 className="font-bold text-[var(--theme-text)] text-sm mb-1 group-hover:text-[var(--theme-error)] transition-colors font-headline">Rekap Penilaian</h3>
              <p className="text-xs text-[var(--theme-text-muted)] font-medium">Lihat dan ekspor hasil penilaian akhir mahasiswa.</p>
            </Link>
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
      </div>
  );
};

export default Dashboard;
