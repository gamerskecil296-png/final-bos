import React, { useState } from 'react';
import { useBandingQuery, useAjukanBandingMutation, useKencanaDashboardQuery, useKencanaScoreQuery } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, StatusBadge } from './components';

export default function KencanaBandingPage() {
  const { data: dashboardData, isLoading: isDashboardLoading } = useKencanaDashboardQuery();
  const { data: scoreData, isLoading: isScoreLoading } = useKencanaScoreQuery();
  const { data: bandingData, isLoading: isBandingLoading, isError: isBandingError } = useBandingQuery();
  const submitBanding = useAjukanBandingMutation();

  const [reason, setReason] = useState('');
  const [bandingType, setBandingType] = useState('universitas');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isLoading = isDashboardLoading || isScoreLoading || isBandingLoading;

  if (isLoading) return <KencanaShell title="Banding Nilai" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Banding Nilai' }]}><LoadingPanel /></KencanaShell>;
  if (isBandingError) return <KencanaShell title="Banding Nilai" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Banding Nilai' }]}><ErrorPanel message="Gagal memuat histori banding." /></KencanaShell>;

  const score = scoreData?.score || {};
  const bandings = bandingData || [];
  const hasPendingBanding = bandings.some(b => b.status === 'pending');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) return;

    try {
      await submitBanding.mutateAsync({ reason, type: bandingType });
      setReason('');
      setBandingType('universitas');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <KencanaShell 
      title="Banding Nilai" 
      highlightedTitle="Kencana"
      subtitle="Ajukan banding jika terdapat ketidaksesuaian pada rekapitulasi nilai akhir Kencana Anda." 
      breadcrumbs={[{ label: 'Rekap Nilai', to: '/app/student/kencana/score' }, { label: 'Banding Nilai' }]}
    >
      <section className="mb-8 grid gap-6 md:grid-cols-2">
        <div className="glass-card p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <span className="material-symbols-outlined text-8xl">grade</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-widest uppercase mb-1 block">Nilai Saat Ini</span>
            <h3 className="text-4xl font-black text-[var(--theme-text)] font-headline tabular-nums">
              {Number(score?.final_score || 0).toFixed(1)}
            </h3>
            <div className="mt-4">
              <StatusBadge status={score?.graduation_status || 'Belum Final'} />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col justify-center items-start">
          <h3 className="text-lg font-bold text-[var(--theme-text)] mb-2">Punya Keluhan Tentang Nilai?</h3>
          <p className="text-sm text-[var(--theme-text-muted)] leading-relaxed mb-6">
            Anda dapat mengajukan permohonan peninjauan ulang nilai jika merasa ada ketidaksesuaian antara hasil dengan apa yang sudah Anda kerjakan. Tim panitia akan meninjau dan merespon pengajuan Anda.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            disabled={hasPendingBanding}
            className="btn-primary w-full md:w-auto px-8"
          >
            <span className="material-symbols-outlined">gavel</span>
            {hasPendingBanding ? 'Menunggu Peninjauan...' : 'Ajukan Banding'}
          </button>
        </div>
      </section>

      <section>
        <h3 className="text-xl font-bold text-[var(--theme-text)] mb-4">Riwayat Pengajuan Banding</h3>
        {bandings.length === 0 ? (
          <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
            <div className="size-20 bg-[var(--theme-surface)] rounded-full flex items-center justify-center mb-4 text-[var(--theme-text-muted)] border border-[var(--theme-border-muted)]">
              <span className="material-symbols-outlined text-4xl">history</span>
            </div>
            <p className="font-bold text-[var(--theme-text)] mb-1">Belum ada riwayat</p>
            <p className="text-sm text-[var(--theme-text-muted)]">Anda belum pernah mengajukan banding nilai.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bandings.map(banding => (
              <div key={banding.id} className="glass-card p-6 border-l-4" style={{
                borderLeftColor: banding.status === 'pending' ? 'var(--theme-warning)' : banding.status === 'approved' ? 'var(--theme-success)' : 'var(--theme-error)'
              }}>
                <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-4">
                  <div>
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-widest uppercase">
                        Diajukan Pada: {new Date(banding.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded border ${banding.type === 'fakultas' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                        {banding.type === 'fakultas' ? 'Fakultas' : 'Univ'}
                      </span>
                    </div>
                    <h4 className="font-bold text-[var(--theme-text)] mt-2">Alasan Banding:</h4>
                    <p className="text-sm text-[var(--theme-text-muted)] mt-1 whitespace-pre-wrap">{banding.reason}</p>
                  </div>
                  <div>
                    <StatusBadge status={banding.status} />
                  </div>
                </div>
                
                {banding.status !== 'pending' && (
                  <div className="mt-4 p-4 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border-muted)]">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-sm text-[var(--theme-text-muted)]">rate_review</span>
                      <span className="font-bold text-sm text-[var(--theme-text)]">Tanggapan Panitia:</span>
                    </div>
                    <p className="text-sm text-[var(--theme-text-muted)] whitespace-pre-wrap">
                      {banding.admin_response || 'Tidak ada catatan tambahan.'}
                    </p>
                    {banding.reviewed_at && (
                      <span className="text-[10px] text-[var(--theme-text-muted)] block mt-2">
                        Ditinjau pada: {new Date(banding.reviewed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modal Pengajuan Banding */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--theme-bg)] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[var(--theme-border-muted)] flex justify-between items-center">
              <h3 className="font-bold text-lg text-[var(--theme-text)]">Form Pengajuan Banding</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition rounded-full p-1">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-bold text-[var(--theme-text)] mb-2">Pilih Jenis Banding</label>
                <select 
                  className="input-field mb-4 w-full"
                  value={bandingType}
                  onChange={e => setBandingType(e.target.value)}
                  required
                >
                  <option value="universitas">Banding Nilai Universitas (Ujian/Kuis CBT)</option>
                  <option value="fakultas">Banding Nilai Fakultas (Penilaian Mentor/DP)</option>
                </select>
                <label className="block text-sm font-bold text-[var(--theme-text)] mb-2">Jelaskan Alasan Banding Anda</label>
                <textarea 
                  className="input-field min-h-[150px] resize-y" 
                  placeholder="Misal: Nilai tugas resume saya belum masuk padahal saya sudah upload tepat waktu..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  required
                ></textarea>
                <p className="text-xs text-[var(--theme-text-muted)] mt-2">Jelaskan sedetail mungkin bukti atau argumentasi Anda agar panitia dapat meninjau dengan akurat.</p>
              </div>
              <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn-secondary">Batal</button>
                <button type="submit" className="btn-primary" disabled={submitBanding.isPending || !reason.trim()}>
                  {submitBanding.isPending ? 'Mengirim...' : 'Kirim Pengajuan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </KencanaShell>
  );
}
