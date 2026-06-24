import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useKencanaAttendanceQuery, useKencanaDashboardQuery, useStudentSubmitAttendanceMutation } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, ProgressBar, StatusBadge, fmtTime, fmtLongDate, isToday } from './components';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';

const ScannerModal = ({ isOpen, onClose, onScan }) => {
  const scannerRef = useRef(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;
    let scanner;
    import('html5-qrcode').then(mod => {
      const Html5Qrcode = mod.Html5Qrcode;
      scanner = new Html5Qrcode('qr-reader');
      setScanning(true);
      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop().catch(() => {});
          setScanning(false);
          onScan(decodedText);
        },
        () => {},
      ).catch(() => setScanning(false));
    });
    return () => {
      if (scanner) {
        scanner.stop().catch(() => {});
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Scan QR Presensi</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-5">
          <div id="qr-reader" className="w-full aspect-square bg-slate-100 rounded-xl overflow-hidden" />
          {scanning && (
            <p className="text-sm text-center text-slate-500 font-semibold mt-3">
              Arahkan kamera ke QR Code milik Pembimbing Anda
            </p>
          )}
        </div>
        <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
};

export default function KencanaAttendancePage() {
  const { data, isLoading, isError } = useKencanaAttendanceQuery();
  const { data: dashboardData } = useKencanaDashboardQuery();
  const submitAttendance = useStudentSubmitAttendanceMutation();
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanMessage, setScanMessage] = useState('');

  const handleScan = useCallback(async (qrCode) => {
    setIsScannerOpen(false);
    setScanMessage('Memproses presensi...');
    try {
      await submitAttendance.mutateAsync(qrCode);
      setScanMessage('Presensi berhasil dicatat!');
    } catch (err) {
      setScanMessage(err?.response?.data?.message || err?.message || 'Gagal memproses presensi');
    }
    setTimeout(() => setScanMessage(''), 4000);
  }, [submitAttendance]);

  if (isLoading) return <KencanaShell title="Log Presensi" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Kehadiran' }]}><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Log Presensi" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Kehadiran' }]}><ErrorPanel message="Gagal memuat kehadiran." /></KencanaShell>;

  const summary = data?.summary || {};
  const details = data?.details || [];

  return (
    <KencanaShell 
      title="Log Presensi" 
      highlightedTitle="Kencana"
      subtitle="Kehadiran wajib 100% pada sesi yang diaktifkan sebagai syarat kelulusan penuh Kencana."
      breadcrumbs={[{ label: 'Kehadiran' }]}
      badges={[
        { label: dashboardData?.period?.name || 'Kencana', active: false },
        { label: `Status: ${dashboardData?.graduation_status?.replaceAll('_', ' ') || 'Belum Mulai'}`, active: true }
      ]}
      actions={
        <div className="glass-card flex items-center gap-6 p-4 md:p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Nilai Kencana</span>
            <span className="text-3xl font-bold text-[var(--theme-text)] font-headline tracking-tight tabular-nums leading-none">
              {Number(dashboardData?.temporary_final_score || 0).toFixed(1)}
            </span>
          </div>
          <div className="size-14 rounded-2xl bg-[var(--theme-primary)] flex items-center justify-center text-white shadow-md border-none">
            <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '28px' }} strokeWidth={2.5}>grade</span>
          </div>
        </div>
      }
    >
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setIsScannerOpen(true)}
          disabled={submitAttendance.isPending}
          className="h-12 px-6 rounded-xl bg-[var(--theme-primary)] text-white hover:opacity-90 text-sm font-bold transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
          Scan Presensi
        </button>
      </div>

      {scanMessage && (
        <div className="mb-4 px-5 py-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-bold text-blue-700 text-center">
          {scanMessage}
        </div>
      )}

      <section className="grid gap-4 md:grid-cols-4 mb-6">
        <PrimaryStatsCard
          title="Sesi Wajib"
          value={summary.required_sessions || 0}
          badgeText="Total"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>event</span>}
          colorTheme="primary"
        />
        <PrimaryStatsCard
          title="Dihadiri"
          value={summary.attended_sessions || 0}
          badgeText="Presensi"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>how_to_reg</span>}
          colorTheme="success"
        />
        <PrimaryStatsCard
          title="Persentase"
          value={`${summary.percentage || 0}%`}
          badgeText="Kehadiran"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>percent</span>}
          colorTheme={summary.percentage >= 100 ? "success" : "warning"}
        />
        <PrimaryStatsCard
          title="Presensi"
          value={submitAttendance.isPending ? 'Memproses...' : 'Scan QR'}
          badgeText="Aksi"
          icon={({ size }) => <span className="material-symbols-outlined" style={{ fontSize: size }}>qr_code_scanner</span>}
          colorTheme="primary"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2 items-start mb-6">
        <section className="glass-card p-6 group hover:shadow-md transition-all duration-300 h-full">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50/80 rounded-xl flex justify-center items-center text-blue-600 group-hover:scale-110 transition-all duration-300">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Penilaian</span>
                <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Status Kehadiran</h3>
              </div>
            </div>
            <StatusBadge status={summary.percentage >= 100 ? 'completed' : 'not_eligible'} />
          </div>
          <div className="mt-5"><ProgressBar value={summary.percentage || 0} /></div>
          <p className="mt-4 text-sm font-medium text-[var(--theme-text-muted)]">
            {summary.percentage >= 100 
              ? 'Selamat! Persyaratan kehadiran Anda sudah terpenuhi sepenuhnya.' 
              : 'Harap menghadiri seluruh sesi wajib yang tersisa.'}
          </p>
        </section>

        <section className="glass-card p-6 group hover:shadow-md transition-all duration-300 h-full">
          <div className="flex items-center gap-4 mb-6 border-b border-[var(--theme-border-muted)] pb-4">
            <div className="w-12 h-12 bg-indigo-50/80 rounded-xl flex justify-center items-center text-indigo-600 group-hover:scale-110 transition-all duration-300">
              <span className="material-symbols-outlined text-[24px]">list_alt</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">Rincian</span>
              <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">Riwayat Kehadiran Sesi</h3>
            </div>
          </div>
          {details.length === 0 ? (
            <p className="text-sm font-bold text-[var(--theme-text-subtle)] p-6 text-center border border-dashed border-[var(--theme-border-muted)] rounded-2xl bg-[var(--theme-surface)]/50">
              Belum ada sesi wajib yang dijadwalkan.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-[var(--theme-border-muted)]">
              <table className="w-full text-left border-collapse min-w-[500px] bg-[var(--theme-surface)]">
                <thead>
                  <tr className="border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)] text-[10px] font-black uppercase tracking-wider text-[var(--theme-text-muted)]">
                    <th className="py-4 px-5">Sesi Kencana</th>
                    <th className="py-4 px-5">Tanggal Sesi</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5">Waktu Presensi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--theme-border-muted)] text-sm">
                  {details.map((item) => (
                    <tr key={item.session_id} className="hover:bg-[var(--theme-bg)] transition-colors group">
                      <td className="py-4 px-5 font-bold text-[var(--theme-text)]">
                        <div className="flex items-center gap-2">
                          <span>{item.title}</span>
                          {isToday(item.start_date) && (
                            <span className="inline-flex items-center rounded-lg bg-[var(--theme-warning)]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-[var(--theme-warning)] border border-[var(--theme-warning)]/20">
                              Hari Ini
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-[var(--theme-text-muted)]">
                        {fmtLongDate(item.start_date)}
                      </td>
                      <td className="py-4 px-5">
                        <span className={`inline-flex rounded-lg px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border ${
                          item.status === 'present' 
                            ? 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20' 
                            : 'bg-[var(--theme-error)]/10 text-[var(--theme-error)] border-[var(--theme-error)]/20'
                        }`}>
                          {item.status === 'present' ? 'Hadir' : 'Tidak Hadir'}
                        </span>
                      </td>
                      <td className="py-4 px-5 font-bold text-[var(--theme-text)]">
                        {item.status === 'present' && item.checked_at ? (
                          <div className="flex items-center gap-1.5 text-[var(--theme-success)]">
                            <span className="material-symbols-outlined text-base">schedule</span>
                            {fmtTime(item.checked_at)}
                          </div>
                        ) : (
                          <span className="text-[var(--theme-text-subtle)] font-bold">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
      <ScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScan}
      />
    </KencanaShell>
  );
}
