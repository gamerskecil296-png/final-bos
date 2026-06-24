import React from 'react';
import { Link } from 'react-router-dom';
import { useKencanaScoreQuery, useKencanaCertificateQuery, useKencanaDashboardQuery } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, StatusBadge } from './components';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';

export default function KencanaScorePage() {
  const { data, isLoading, isError } = useKencanaScoreQuery();
  const { data: certData } = useKencanaCertificateQuery();
  const { data: dashboardData } = useKencanaDashboardQuery();
  
  if (isLoading) return <KencanaShell title="Rekap Nilai" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Rekap Nilai & Sertifikat' }]}><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Rekap Nilai" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Rekap Nilai & Sertifikat' }]}><ErrorPanel message="Gagal memuat nilai." /></KencanaShell>;
  const score = data?.score || {};
  return (
    <KencanaShell 
      title="Rekap Nilai" 
      highlightedTitle="Kencana"
      subtitle="Rekapitulasi Nilai Akhir = Kognitif 25% + Psikomotor 35% + Afektif 40%." 
      breadcrumbs={[{ label: 'Rekap Nilai & Sertifikat' }]}
      badges={[
        { label: dashboardData?.period?.name || 'Kencana', active: false },
        { label: `Status: ${score?.graduation_status?.replaceAll('_', ' ') || dashboardData?.graduation_status?.replaceAll('_', ' ') || 'Belum Mulai'}`, active: true }
      ]}
      actions={
        <div className="flex items-center gap-4">
          <Link to="/student/kencana/banding" className="btn-secondary hidden md:flex">
            <span className="material-symbols-outlined">gavel</span> Ajukan Banding
          </Link>
          <div className="glass-card flex items-center gap-6 p-4 md:p-6 border border-slate-200 shadow-sm">
            <div className="flex flex-col text-right">
              <span className="text-[11px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Nilai Kencana</span>
              <span className="text-3xl font-bold text-[var(--theme-text)] font-headline tracking-tight tabular-nums leading-none">
                {Number(score?.final_score || 0).toFixed(1)}
              </span>
            </div>
            <div className="size-14 rounded-2xl bg-[var(--theme-primary)] flex items-center justify-center text-white shadow-md border-none">
              <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '28px' }} strokeWidth={2.5}>grade</span>
            </div>
          </div>
        </div>
      }
    >
      {dashboardData?.certificates && Object.values(dashboardData.certificates).some(c => c.file_url) && (
        <section className="mb-6 rounded-3xl bg-[var(--theme-primary)] p-8 shadow-xl text-white flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="flex items-start gap-4 relative z-10">
            <span className="material-symbols-outlined text-5xl text-white/80">workspace_premium</span>
            <div>
              <h2 className="text-2xl font-black font-headline">Selamat! Anda Lulus Kencana</h2>
              <p className="mt-2 text-sm font-medium text-white/80 max-w-lg leading-relaxed">Sertifikat kelulusan Anda telah diterbitkan resmi. Gunakan sertifikat ini sebagai bukti kelulusan orientasi.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 relative z-10">
            {dashboardData.certificates.university?.file_url && (
              <a href={dashboardData.certificates.university.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-white px-6 py-4 text-sm font-black text-[var(--theme-primary)] transition hover:bg-white/90 shadow-lg hover:-translate-y-1 hover:shadow-xl shrink-0">
                <span className="material-symbols-outlined">download</span> Unduh Sertifikat Univ
              </a>
            )}
            {dashboardData.certificates.fakultas?.file_url && (
              <a href={dashboardData.certificates.fakultas.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-2xl bg-emerald-500 px-6 py-4 text-sm font-black text-white transition hover:bg-emerald-400 shadow-lg hover:-translate-y-1 hover:shadow-xl shrink-0">
                <span className="material-symbols-outlined">download</span> Unduh Sertifikat Fakultas
              </a>
            )}
          </div>
        </section>
      )}
      <section className="grid gap-4 md:grid-cols-4 mb-6">
        <PrimaryStatsCard
          title="Kognitif"
          value={Number(score.cognitive_average || 0).toFixed(1)}
          badgeText="Bobot 25%"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>quiz</span>}
          colorTheme="primary"
        />
        <PrimaryStatsCard
          title="Psikomotor"
          value={Number(score.psychomotor_average || 0).toFixed(1)}
          badgeText="Bobot 35%"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>construction</span>}
          colorTheme="primary"
        />
        <PrimaryStatsCard
          title="Afektif"
          value={Number(score.affective_average || 0).toFixed(1)}
          badgeText="Bobot 40%"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>volunteer_activism</span>}
          colorTheme="primary"
        />
        <PrimaryStatsCard
          title="Nilai Akhir"
          value={Number(score.final_score || 0).toFixed(1)}
          badgeText="Minimal 75"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>workspace_premium</span>}
          colorTheme={Number(score.final_score || 0) >= 75 ? "success" : "warning"}
        />
      </section>
      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr] mb-5">
        <div className="glass-card p-6 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50/80 rounded-xl flex justify-center items-center text-blue-600 group-hover:scale-110 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Penilaian</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Status Kelulusan</h3>
              </div>
            </div>
            <StatusBadge status={score.graduation_status} />
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Weighted label="Kognitif" value={score.cognitive_weighted} />
            <Weighted label="Psikomotor" value={score.psychomotor_weighted} />
            <Weighted label="Afektif" value={score.affective_weighted} />
          </div>
        </div>
        <div className="glass-card p-6 flex flex-col justify-between group hover:shadow-md transition-all duration-300">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-amber-50/80 rounded-xl flex justify-center items-center text-amber-600 group-hover:scale-110 transition-all duration-300">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Persyaratan</span>
              <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Komponen Belum Lengkap</h3>
            </div>
          </div>
          <div className="space-y-3">
            {(data?.blockers || []).length === 0 ? <p className="rounded-xl bg-[var(--theme-success)]/10 p-4 text-xs font-bold text-[var(--theme-success)] leading-relaxed">Semua syarat terpenuhi.</p> : data.blockers.map((b) => <p key={b} className="rounded-xl bg-[var(--theme-error)]/10 p-4 text-xs font-bold text-[var(--theme-error)] leading-relaxed">{b}</p>)}
          </div>
        </div>
      </section>
      <section className="glass-card p-6 group hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-indigo-50/80 rounded-xl flex justify-center items-center text-indigo-600 group-hover:scale-110 transition-all duration-300">
            <span className="material-symbols-outlined text-[24px]">list_alt</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Rincian</span>
            <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Detail Item Nilai</h3>
          </div>
        </div>
        <div className="divide-y divide-[var(--theme-border-muted)]">
          {(data?.items || []).map((item) => <div key={item.id} className="flex items-center justify-between py-4"><div><p className="font-bold text-sm text-[var(--theme-text)]">{item.item_name}</p><p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] mt-1">{item.component}</p></div><p className="text-xl font-black text-[var(--theme-text)] font-headline">{Number(item.score || 0).toFixed(1)}</p></div>)}
        </div>
      </section>
    </KencanaShell>
  );
}

function Weighted({ label, value }) { 
  return (
    <div className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-4 flex flex-col items-center justify-center text-center">
      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[var(--theme-text)]">{Number(value || 0).toFixed(2)}</p>
    </div>
  ); 
}
