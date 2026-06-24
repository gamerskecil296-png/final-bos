import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useKencanaDashboardQuery, useKencanaTimelineQuery, useBandingQuery, useAjukanBandingMutation } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, PrimaryButton, StatusBadge, fmtDate } from './Kencana/components';
import useAuthStore from '@/store/useAuthStore';

export default function KencanaPage() {
  const user = useAuthStore(state => state.user);
  const { data: dashboardData, isLoading: isLoadingDashboard, isError: isErrorDashboard } = useKencanaDashboardQuery();
  const { data: timelineData, isLoading: isLoadingTimeline, isError: isErrorTimeline } = useKencanaTimelineQuery();

  const { data: bandingHistory } = useBandingQuery();
  const submitBanding = useAjukanBandingMutation();
  const [isBandingModalOpen, setIsBandingModalOpen] = useState(false);
  const [bandingReason, setBandingReason] = useState('');

  const handleAjukanBanding = () => {
    if (!bandingReason.trim()) return;
    submitBanding.mutate({ reason: bandingReason }, {
      onSuccess: () => {
        setIsBandingModalOpen(false);
        setBandingReason('');
      }
    });
  };

  if (isLoadingDashboard || isLoadingTimeline) return <KencanaShell title="Dashboard Kencana"><LoadingPanel /></KencanaShell>;
  if (isErrorDashboard || isErrorTimeline) return <KencanaShell title="Dashboard Kencana"><ErrorPanel message="Gagal memuat dashboard Kencana." /></KencanaShell>;

  const blockers = dashboardData?.blockers || [];
  const notifications = dashboardData?.notifications || [];

  // Sort stages purely by order_number so they are chronological
  const sortedStages = [...(timelineData?.stages || [])].sort((a, b) => {
    return (a.order_number || 0) - (b.order_number || 0);
  });

  return (
    <KencanaShell
      title="Dashboard"
      highlightedTitle="Kencana"
      subtitle={`Tahap saat ini: ${dashboardData?.active_stage?.name || 'Menunggu jadwal admin'}.`}
      badges={[
        { label: dashboardData?.period?.name || 'Kencana', active: false },
        { label: `Status: ${dashboardData?.graduation_status?.replaceAll('_', ' ') || 'Belum Mulai'}`, active: true }
      ]}
      actions={
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-[var(--theme-surface)] p-3 md:p-4 rounded-xl border border-[var(--theme-border-muted)] shadow-sm">
          {/* Univ Score */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col text-right">
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Nilai Univ</span>
              <span className="text-2xl font-bold text-[var(--theme-text)] font-headline tracking-tight tabular-nums leading-none">
                {Number(dashboardData?.score_univ?.final_score || dashboardData?.temporary_final_score || 0).toFixed(1)}
              </span>
            </div>
            <div className="w-px h-8 bg-[var(--theme-border)]"></div>
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Status Univ</span>
              <span className={`text-sm font-bold ${
                (dashboardData?.status_univ || dashboardData?.status) === 'not_eligible' ? 'text-[var(--theme-error)]' :
                ((dashboardData?.status_univ || dashboardData?.status) === 'not_started' || (dashboardData?.status_univ || dashboardData?.status) === 'in_progress') ? 'text-[var(--theme-text-muted)]' :
                'text-[var(--theme-success)]'
              }`}>
                {(dashboardData?.status_univ || dashboardData?.status)?.replaceAll('_', ' ') || 'Belum Evaluasi'}
              </span>
            </div>
          </div>
          
          {/* Fakultas Score (if exists) */}
          {dashboardData?.score_fakultas && (
            <>
              <div className="w-full h-px sm:w-px sm:h-8 bg-[var(--theme-border)]"></div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col text-right">
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Nilai Fakultas</span>
                  <span className="text-2xl font-bold text-[var(--theme-text)] font-headline tracking-tight tabular-nums leading-none">
                    {Number(dashboardData?.score_fakultas?.final_score || 0).toFixed(1)}
                  </span>
                </div>
                <div className="w-px h-8 bg-[var(--theme-border)]"></div>
                <div className="flex flex-col text-left">
                  <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Status Fakultas</span>
                  <span className={`text-sm font-bold ${
                    dashboardData?.status_fakultas === 'not_eligible' ? 'text-[var(--theme-error)]' :
                    (dashboardData?.status_fakultas === 'not_started' || dashboardData?.status_fakultas === 'in_progress') ? 'text-[var(--theme-text-muted)]' :
                    'text-[var(--theme-success)]'
                  }`}>
                    {dashboardData?.status_fakultas?.replaceAll('_', ' ') || 'Belum Evaluasi'}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      }
    >

      {/* Main Content */}
      <section className="grid gap-6 lg:grid-cols-[1.8fr_1fr]">
        
        <div className="space-y-6">
          {/* Last Activity - Dipindah ke atas agar langsung terlihat mahasiswa */}
          {user?.role !== 'super_admin' && dashboardData?.last_activity?.id && (
            <div className="glass-card p-4 md:p-5 relative overflow-hidden bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100">
              <div className="absolute top-0 left-0 w-1 h-full bg-[var(--theme-primary)]"></div>
              <div className="flex items-center gap-2 mb-1.5">
                 <span className="material-symbols-outlined text-[var(--theme-primary)] text-[13px]">play_circle</span>
                 <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--theme-text-subtle)]">Lanjutkan Belajar</p>
              </div>
              <h4 className="text-base font-bold text-[var(--theme-text)] leading-tight font-headline">{dashboardData.last_activity.title}</h4>
              <div className="mt-3">
                <PrimaryButton to={`/app/student/kencana/session/${dashboardData.last_activity.id}`} className="text-xs py-1.5 px-4 h-auto">
                  Buka Sesi Terakhir <span className="material-symbols-outlined text-xs ml-1">arrow_forward</span>
                </PrimaryButton>
              </div>
            </div>
          )}

          {/* Rincian Nilai Kencana Univ */}
          <div className="glass-card p-4 md:p-5">
            <h3 className="text-base font-bold text-[var(--theme-text)] font-headline mb-4">Rincian Nilai Universitas</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Kognitif</span>
                <span className="text-xl font-black text-blue-700 leading-none mb-1">{Number(dashboardData?.score_univ?.cognitive_average || dashboardData?.scores?.cognitive || 0).toFixed(1)}</span>
                <span className="text-[9px] text-blue-600/80 font-medium">Tes & Evaluasi</span>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Psikomotor</span>
                <span className="text-xl font-black text-emerald-700 leading-none mb-1">{Number(dashboardData?.score_univ?.psychomotor_average || dashboardData?.scores?.psychomotor || 0).toFixed(1)}</span>
                <span className="text-[9px] text-emerald-600/80 font-medium">Tugas / Karya</span>
              </div>
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Afektif</span>
                <span className="text-xl font-black text-purple-700 leading-none mb-1">{Number(dashboardData?.score_univ?.affective_average || dashboardData?.scores?.affective || 0).toFixed(1)}</span>
                <span className="text-[9px] text-purple-600/80 font-medium">Sikap & Perilaku</span>
              </div>
            </div>
          </div>

          {/* Rincian Nilai Kencana Fakultas */}
          {dashboardData?.score_fakultas && (
            <div className="glass-card p-4 md:p-5">
              <h3 className="text-base font-bold text-[var(--theme-text)] font-headline mb-4">Rincian Nilai Fakultas</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Kognitif</span>
                  <span className="text-xl font-black text-blue-700 leading-none mb-1">{Number(dashboardData?.score_fakultas?.cognitive_average || 0).toFixed(1)}</span>
                  <span className="text-[9px] text-blue-600/80 font-medium">Tes Fakultas</span>
                </div>
                <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Psikomotor</span>
                  <span className="text-xl font-black text-emerald-700 leading-none mb-1">{Number(dashboardData?.score_fakultas?.psychomotor_average || 0).toFixed(1)}</span>
                  <span className="text-[9px] text-emerald-600/80 font-medium">Tugas Fakultas</span>
                </div>
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] font-bold text-purple-500 uppercase tracking-wider mb-1">Afektif</span>
                  <span className="text-xl font-black text-purple-700 leading-none mb-1">{Number(dashboardData?.score_fakultas?.affective_average || 0).toFixed(1)}</span>
                  <span className="text-[9px] text-purple-600/80 font-medium">Sikap Fakultas</span>
                </div>
              </div>
            </div>
          )}

          {/* Timeline Cards */}
          <div className="glass-card p-4 md:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-[var(--theme-text)] font-headline">Jadwal & Tahapan Kencana</h3>
                <p className="text-[13px] font-medium text-[var(--theme-text-muted)] mt-0.5">Pilih tahapan untuk membuka materi, sesi, dan kuis.</p>
              </div>
            </div>

            <div className="space-y-3">
              {sortedStages.map((stage, index) => {
                const CardComponent = user?.role === 'super_admin' ? 'div' : Link;
                const linkProps = user?.role === 'super_admin' ? {} : { to: stage.phase_type === 'pasca_kencana' ? '/app/student/kencana/score' : `/app/student/kencana/stage/${stage.id}` };
                return (
                  <CardComponent
                    key={stage.id}
                    {...linkProps}
                    className={`group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 rounded-xl border transition-all ${stage.status === 'active' ? 'border-[var(--theme-primary)]/50 bg-blue-50/30 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                  >
                    <div className="flex items-start gap-3">
                       <div className={`grid size-8 place-items-center rounded-lg ${stage.status === 'active' ? 'bg-[var(--theme-primary)] text-white shadow-sm' : 'bg-slate-100 text-slate-500'} text-sm font-bold font-headline shrink-0`}>
                         {index + 1}
                       </div>
                       <div>
                         <div className="flex items-center gap-2 mb-0.5">
                           <h4 className={`text-sm font-bold font-headline ${stage.status === 'active' ? 'text-[var(--theme-primary)]' : 'text-slate-800'}`}>{stage.name}</h4>
                           <StatusBadge status={stage.status} />
                         </div>
                         {stage.phase_type !== 'pasca_kencana' && (
                           <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                             <span className="material-symbols-outlined text-[12px]">event</span>
                             {fmtDate(stage.start_date)} - {fmtDate(stage.end_date)}
                           </p>
                         )}
                       </div>
                    </div>
                    
                    <div className="flex gap-4 mt-4 sm:mt-0 ml-14 sm:ml-0 text-center">
                      {stage.phase_type === 'pasca_kencana' ? (
                        <div className="text-xs font-bold text-[var(--theme-primary)] flex items-center gap-1 bg-[var(--theme-primary)]/10 px-3 py-1.5 rounded-lg">
                           <span className="material-symbols-outlined text-sm">workspace_premium</span> Rekap Nilai
                        </div>
                      ) : (
                         <>
                           <div>
                              <p className="text-sm font-bold text-slate-700">{stage.session_count || 0}</p>
                              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mt-0.5">Sesi</p>
                           </div>
                           <div className="w-px h-6 bg-slate-200 self-center"></div>
                           <div>
                              <p className="text-sm font-bold text-slate-700">{(stage.quiz_count || 0) + (stage.assignment_count || 0)}</p>
                              <p className="text-[10px] uppercase text-slate-400 font-bold tracking-widest mt-0.5">Tugas</p>
                           </div>
                         </>
                      )}
                    </div>
                  </CardComponent>
                );
              })}
              {sortedStages.length === 0 && (
                <div className="text-center py-10 rounded-xl border border-dashed border-slate-300 bg-slate-50">
                  <span className="material-symbols-outlined text-3xl text-slate-400 mb-2">event_busy</span>
                  <p className="text-slate-500 font-bold font-headline text-sm">Belum ada tahapan Kencana.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions Menus */}
          {user?.role !== 'super_admin' && (
            <div className="grid gap-3 md:grid-cols-2">
              <Link to="/app/student/kencana/attendance" className="group glass-card p-3.5 transition hover:bg-slate-50/80 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-indigo-50 text-indigo-600 shrink-0">
                  <span className="material-symbols-outlined text-base">fact_check</span>
                </div>
                <div>
                   <h4 className="font-bold text-slate-800 text-[13px] group-hover:text-indigo-600 transition-colors font-headline">Log Kehadiran</h4>
                   <p className="text-[10px] font-medium text-slate-500">Cek rekapitulasi presensi sesi</p>
                </div>
              </Link>
              <Link to="/app/student/kencana/score" className="group glass-card p-3.5 transition hover:bg-slate-50/80 flex items-center gap-3">
                <div className="grid size-9 place-items-center rounded-lg bg-orange-50 text-orange-600 shrink-0">
                  <span className="material-symbols-outlined text-base">workspace_premium</span>
                </div>
                <div>
                   <h4 className="font-bold text-slate-800 text-[13px] group-hover:text-orange-600 transition-colors font-headline">Unduh Sertifikat</h4>
                   <p className="text-[10px] font-medium text-slate-500">Akses nilai akhir dan e-Sertifikat</p>
                </div>
              </Link>
            </div>
          )}
        </div>

        {/* Sidebar Info Kolom Kanan */}
        <div className="space-y-4">
          
          <div className="glass-card p-4 md:p-5 border-slate-200/80">
            <h3 className="text-[13px] font-bold text-slate-800 font-headline mb-4 uppercase tracking-wider flex items-center gap-2">
               <span className="material-symbols-outlined text-sm">info</span> Informasi Status
            </h3>
            
            {/* Mentor Info */}
            <div className="mb-4">
               <p className="text-[11px] font-bold text-slate-500 mb-1.5">PEMBIMBING KENCANA (DP)</p>
               {dashboardData?.mentor ? (
                 <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 flex items-center gap-3">
                   <span className="material-symbols-outlined text-emerald-600">supervised_user_circle</span>
                   <p className="text-sm font-bold text-emerald-800 leading-tight">{dashboardData.mentor.name}</p>
                 </div>
               ) : (
                 <div className="rounded-xl bg-amber-50 border border-amber-100 p-3">
                   <div className="flex items-center gap-2 text-amber-600 mb-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      <p className="text-xs font-bold">Belum ada pembimbing</p>
                   </div>
                   <p className="text-[11px] text-amber-700/80 font-medium">Cek undangan di menu Undangan DP.</p>
                   <Link to="/app/student/kencana/invitations" className="inline-block mt-2 text-[10px] font-bold bg-white text-amber-700 px-3 py-1.5 rounded border border-amber-200 hover:bg-amber-100 transition-colors">
                     Cek Undangan
                   </Link>
                 </div>
               )}
            </div>

            {/* Blockers */}
            <div className="mb-4">
               <p className="text-[11px] font-bold text-slate-500 mb-1.5">PENGHALANG KELULUSAN</p>
               {blockers.length === 0 ? (
                 <div className="text-[12px] font-bold text-emerald-600 flex items-center gap-1.5">
                   <span className="material-symbols-outlined text-[14px]">check_circle</span> Aman, tidak ada masalah.
                 </div>
               ) : (
                 <ul className="space-y-2">
                   {blockers.map((b, i) => (
                     <li key={i} className="text-[12px] font-medium text-rose-600 flex items-start gap-1.5 bg-rose-50 p-2 rounded-lg border border-rose-100">
                       <span className="material-symbols-outlined text-[14px] mt-0.5">cancel</span> {b}
                     </li>
                   ))}
                 </ul>
               )}
            </div>

            {/* Notifications */}
            {notifications.length > 0 && (
               <div>
                  <p className="text-[11px] font-bold text-slate-500 mb-1.5 border-t border-slate-100 pt-4">PENGUMUMAN BARU</p>
                  <div className="space-y-2">
                    {notifications.map((n, i) => (
                      <div key={i} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <p className="text-[12px] font-bold text-slate-700 leading-tight">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                      </div>
                    ))}
                  </div>
               </div>
            )}
          </div>

          {/* Banding Widget (Minimalist) */}
          <div className="glass-card p-4 md:p-5 border-slate-200/80 bg-white">
            <div className="flex items-center gap-3 mb-3">
               <div className="size-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px]">balance</span>
               </div>
               <div>
                 <h3 className="text-[13px] font-bold text-slate-800 font-headline">Banding Kelulusan</h3>
                 <p className="text-[10px] text-slate-500">Ajukan tinjauan ulang nilai kencana</p>
               </div>
            </div>
            
            <button onClick={() => setIsBandingModalOpen(true)} className="w-full text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg py-2 transition-colors">
              Buat Pengajuan Banding
            </button>

            {bandingHistory && bandingHistory.length > 0 && (
               <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Riwayat Terakhir</p>
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded text-xs border border-slate-100">
                     <span className="font-medium text-slate-600 truncate max-w-[120px]">{fmtDate(bandingHistory[0].created_at)}</span>
                     <StatusBadge status={bandingHistory[0].status} />
                  </div>
               </div>
            )}
          </div>
        </div>

      </section>

      {/* Banding Modal */}
      {isBandingModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[24px] p-6 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <button
              onClick={() => { setIsBandingModalOpen(false); setBandingReason(''); }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>

            <h3 className="text-xl font-black font-headline mb-1 text-slate-800">Ajukan Banding</h3>
            <p className="text-[13px] text-slate-500 mb-6 font-medium">
              Silakan tuliskan dengan jelas keluhan atau alasan kenapa kamu mengajukan banding.
            </p>
            
            <textarea
              value={bandingReason}
              onChange={(e) => setBandingReason(e.target.value)}
              placeholder="Contoh: Nilai tugas psikomotor saya di E-Learning belum masuk padahal saya sudah mengumpulkan..."
              className="w-full h-32 rounded-2xl border-2 border-slate-100 bg-slate-50 p-4 text-[13px] font-medium focus:border-[var(--theme-primary)] focus:bg-white focus:ring-0 outline-none resize-none transition-all placeholder:text-slate-400 text-slate-700"
            />
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setIsBandingModalOpen(false); setBandingReason(''); }}
                className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors text-[13px]"
              >
                Batalkan
              </button>
              <button
                onClick={handleAjukanBanding}
                disabled={!bandingReason.trim() || submitBanding.isPending}
                className={`flex-1 py-3 rounded-xl font-bold text-[13px] transition-all shadow-sm ${
                  (!bandingReason.trim() || submitBanding.isPending)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                    : 'bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] hover:-translate-y-0.5 hover:shadow-md'
                }`}
              >
                {submitBanding.isPending ? 'Mengirim...' : 'Kirim Banding'}
              </button>
            </div>
          </div>
        </div>
      )}
    </KencanaShell>
  );
}
