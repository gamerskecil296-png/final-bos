import React from 'react';
import { useKencanaCertificateQuery } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, PrimaryButton, StatusBadge, fmtDate } from './components';

export default function KencanaCertificatePage() {
  const { data, isLoading, isError } = useKencanaCertificateQuery();

  if (isLoading) return <KencanaShell title="Sertifikat Kencana"><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Sertifikat Kencana"><ErrorPanel message="Gagal memuat sertifikat." /></KencanaShell>;

  const certificate = data?.certificate || {};
  const eligible = Boolean(data?.eligible);
  const lockedReasons = data?.locked_reasons || [];
  const fileUrl = certificate.file_url || certificate.FileURL || '';

  return (
    <KencanaShell
      title="Sertifikat Kencana"
      subtitle="Sertifikat hanya dapat diunduh ketika status kelulusan sudah lulus dan seluruh syarat wajib terpenuhi."
      actions={<PrimaryButton to="/student/kencana/score">Lihat Nilai</PrimaryButton>}
    >
      <section className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
        <div className="glass-card p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--theme-text-muted)]">Certificate Gate</p>
              <h2 className="mt-2 text-3xl font-bold font-headline text-[var(--theme-text)]">{eligible ? 'Sertifikat siap diakses' : 'Sertifikat masih terkunci'}</h2>
            </div>
            <StatusBadge status={eligible ? 'passed' : 'locked'} />
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <Info label="Nomor Sertifikat" value={certificate.certificate_number || '-'} />
            <Info label="Tanggal Terbit" value={certificate.issued_at ? fmtDate(certificate.issued_at) : '-'} />
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {eligible && fileUrl ? (
              <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-5 py-3 text-sm font-bold text-[var(--theme-text-on-primary)] transition hover:bg-[var(--theme-primary-hover)] shadow-sm">
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                Unduh Sertifikat
              </a>
            ) : (
              <PrimaryButton disabled>{eligible ? 'File belum diterbitkan' : 'Belum Bisa Diunduh'}</PrimaryButton>
            )}
            <PrimaryButton to="/student/kencana/remedial">Cek Remedial</PrimaryButton>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--theme-primary)]/20 bg-[var(--theme-primary)] p-8 text-[var(--theme-text-on-primary)] shadow-sm relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>
          <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-[var(--theme-text-on-primary)]/70 relative z-10">Syarat Wajib</p>
          <h2 className="mt-2 text-2xl font-bold font-headline relative z-10">Checklist Kelulusan</h2>
          <div className="mt-6 space-y-3 relative z-10">
            {lockedReasons.length === 0 ? (
              <p className="rounded-xl bg-white/20 p-4 text-sm font-bold text-white backdrop-blur-sm shadow-sm border border-white/20">Tidak ada pengunci. Jika file belum tersedia, tunggu penerbitan dari admin.</p>
            ) : (
              lockedReasons.map((reason) => <p key={reason} className="rounded-xl bg-black/20 p-4 text-sm font-bold text-white backdrop-blur-sm shadow-sm border border-black/10">{reason}</p>)
            )}
          </div>
        </div>
      </section>
    </KencanaShell>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-100 p-5 flex flex-col justify-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[var(--theme-text-muted)]">{label}</p>
      <p className="mt-2 text-lg font-bold font-headline text-[var(--theme-text)]">{value}</p>
    </div>
  );
}
