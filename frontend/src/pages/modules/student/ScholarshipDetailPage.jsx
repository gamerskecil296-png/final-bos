import React from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { useParams, useNavigate } from 'react-router-dom';
import { usePengajuanDetailQuery } from '@/queries/useScholarshipQuery';
import useAuthStore from '@/store/useAuthStore';

import { motion } from 'framer-motion';

const STAGES = [
  { key: 'dikirim', label: 'Pengajuan Dikirim', desc: 'Pendaftaran diterima oleh sistem' },
  { key: 'verifikasi_fakultas', label: 'Verifikasi Fakultas', desc: 'Pemeriksaan berkas di tingkat Fakultas' },
  { key: 'persetujuan_univ', label: 'Persetujuan Universitas', desc: 'Review akhir pimpinan Universitas' },
  { key: 'hasil', label: 'Hasil Akhir', desc: 'Pengumuman resmi status penerimaan' },
];

export default function ScholarshipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { data, isLoading } = usePengajuanDetailQuery(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--theme-bg)]">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-[var(--theme-primary)] mx-auto mb-4" style={{ fontSize: '32px' }} >sync</span>
          <p className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest">Memuat Detail...</p>
        </div>
      </div>
    );
  }

  const { pengajuan, logs } = data || {};
  
  if (!pengajuan) return null;

  const pengajuanId = pengajuan.id || pengajuan.ID;
  const pengajuanCreatedAt = pengajuan.created_at || pengajuan.CreatedAt;
  const pengajuanStatus = pengajuan.Status || pengajuan.status || '';
  const pengajuanMotivasi = pengajuan.motivasi || pengajuan.Motivasi || '';
  const pengajuanKtmKtpUrl = pengajuan.ktm_ktp_url || pengajuan.KtmKtpURL || '';
  const pengajuanSertifikatUrl = pengajuan.sertifikat_url || pengajuan.SertifikatURL || '';
  const pengajuanTranskripUrl = pengajuan.transkrip_url || pengajuan.TranskripURL || '';

  const beasiswaObj = pengajuan.Beasiswa || pengajuan.beasiswa || {};
  const beasiswaNama = beasiswaObj.nama || beasiswaObj.Nama || '';
  const beasiswaPenyelenggara = beasiswaObj.penyelenggara || beasiswaObj.Penyelenggara || '';
  const beasiswaNilaiBantuan = beasiswaObj.nilai_bantuan || beasiswaObj.NilaiBantuan || 0;
  const beasiswaIpkMin = beasiswaObj.ipk_min || beasiswaObj.IPKMin || beasiswaObj.syarat_ipk_min || 0;
  const beasiswaKategori = beasiswaObj.kategori || beasiswaObj.Kategori || 'Internal';

  // Construct docs list
  const berkas = [];
  if (pengajuanKtmKtpUrl) {
    berkas.push({
      id: 'ktm_ktp',
      tipe_berkas: 'KTM & KTP',
      file_url: pengajuanKtmKtpUrl.startsWith('http') 
        ? pengajuanKtmKtpUrl 
        : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${pengajuanKtmKtpUrl}`
    });
  }
  if (pengajuanSertifikatUrl) {
    berkas.push({
      id: 'sertifikat',
      tipe_berkas: 'Sertifikat',
      file_url: pengajuanSertifikatUrl.startsWith('http') 
        ? pengajuanSertifikatUrl 
        : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${pengajuanSertifikatUrl}`
    });
  }
  if (pengajuanTranskripUrl) {
    berkas.push({
      id: 'transkrip',
      tipe_berkas: 'Transkrip Nilai',
      file_url: pengajuanTranskripUrl.startsWith('http') 
        ? pengajuanTranskripUrl 
        : `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${pengajuanTranskripUrl}`
    });
  }

  const statusToStage = {
    dikirim: 0,
    menunggu: 1,
    proses: 1,
    diajukan: 1,
    'diverifikasi fakultas': 2,
    'ditolak fakultas': 3,
    diterima: 3,
    ditolak: 3,
  };
  const currentStageIdx = statusToStage[pengajuanStatus.toLowerCase()] ?? 1;
  const isFinal = pengajuanStatus.toLowerCase() === 'diterima' || pengajuanStatus.toLowerCase() === 'ditolak' || pengajuanStatus.toLowerCase() === 'ditolak fakultas';

  return (
    <PageContent className="font-body">
      <PageHeader 
        title="Detail Pengajuan"
        subtitle="Pantau proses seleksi beasiswa"
        icon="analytics" 
        breadcrumbs={[
          { label: 'Beasiswa', path: '/app/student/scholarship' },
          { label: 'Detail Pengajuan' }
        ]} 
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        
        {/* Left Column: Info & Tracker */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Main Info Card */}
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-[var(--theme-primary)]/5 rounded-full -mr-10 -mt-10 pointer-events-none blur-3xl"></div>
            
            <div className="flex flex-col gap-4 relative z-10">
               <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] animate-pulse" />
                    <span className="text-[9px] font-black text-[var(--theme-primary)] uppercase tracking-widest">Real-time Tracker</span>
                  </div>
                  <h1 className="text-base font-black text-[var(--theme-text)] leading-tight">{beasiswaNama}</h1>
                  <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mt-1">
                    <span className="material-symbols-outlined align-middle mr-1" style={{ fontSize: '12px' }}>corporate_fare</span> 
                    {beasiswaPenyelenggara}
                  </p>
               </div>

               <div className="flex items-center gap-3 mt-1">
                  <div className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shadow-sm ${
                    pengajuanStatus.toLowerCase() === 'diterima' ? 'bg-[var(--theme-success-light)] border-[var(--theme-success)]/20 text-[var(--theme-success)]' : 
                    (pengajuanStatus.toLowerCase() === 'ditolak' || pengajuanStatus.toLowerCase() === 'ditolak fakultas') ? 'bg-[var(--theme-error-light)] border-[var(--theme-error)]/20 text-[var(--theme-error)]' :
                    'bg-[var(--theme-primary-light)] border-[var(--theme-primary)]/20 text-[var(--theme-primary)]'
                  }`}>
                    {pengajuanStatus.replace('_', ' ')}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--theme-bg)] rounded-md border border-[var(--theme-border)]">
                    <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: '12px' }} >calendar_month</span>
                    <span className="text-[9px] font-bold text-[var(--theme-text-muted)] tracking-widest">
                      {new Date(pengajuanCreatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-[var(--theme-bg)] rounded-md border border-[var(--theme-border)] hidden sm:flex">
                    <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: '12px' }} >tag</span>
                    <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">{pengajuan.nomor_referensi || pengajuanId}</span>
                  </div>
               </div>

               <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 pt-4 border-t border-dashed border-[var(--theme-border)]">
                  <div>
                    <p className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Bantuan</p>
                    <p className="text-[11px] font-black text-[var(--theme-primary)]">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(beasiswaNilaiBantuan)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Min. IPK</p>
                    <p className="text-[11px] font-black text-[var(--theme-text)]">{beasiswaIpkMin?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Status Ekonomi</p>
                    <p className="text-[11px] font-black text-[var(--theme-text)]">{beasiswaKategori?.toLowerCase()?.includes('sktm') || beasiswaKategori === 'Ekonomi' ? 'SKTM' : 'Umum'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1">Kategori</p>
                    <p className="text-[11px] font-black text-[var(--theme-text)]">{beasiswaKategori || '-'}</p>
                  </div>
               </div>
            </div>
          </div>

          {/* PIPELINE STEPPER (Horizontal/Compact) */}
          <div className="glass-card rounded-2xl p-5">
            <h3 className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>route</span> Pipeline Seleksi
            </h3>
            
            <div className="relative pl-3">
              <div className="absolute left-[17px] top-4 bottom-4 w-0.5 bg-[var(--theme-border)]">
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: `${(currentStageIdx / (STAGES.length - 1)) * 100}%` }}
                    className="w-full bg-[var(--theme-primary)] relative transition-all duration-1000"
                  />
              </div>

              <div className="space-y-6">
                {STAGES.map((s, idx) => {
                  const isCompleted = idx < currentStageIdx;
                  const isActive = idx === currentStageIdx;
                  const isRejected = s.key === 'hasil' && (pengajuanStatus.toLowerCase() === 'ditolak' || pengajuanStatus.toLowerCase() === 'ditolak fakultas');

                  return (
                    <div key={s.key} className="flex gap-4 relative items-start group">
                        <div className={`shrink-0 w-4 h-4 mt-0.5 rounded-full flex items-center justify-center z-10 transition-all border-2 ${
                          (isCompleted || (isFinal && idx === STAGES.length - 1 && !isRejected)) ? 'bg-[var(--theme-success)] border-[var(--theme-success)] text-white shadow-sm' :
                          isActive ? (isRejected ? 'bg-[var(--theme-error)] border-[var(--theme-error)] text-white' : 'bg-[var(--theme-primary)] border-[var(--theme-primary)] text-white ring-4 ring-[var(--theme-primary)]/20') :
                          'bg-[var(--theme-bg)] border-[var(--theme-border)]'
                        }`}>
                          {/* Inner dot or icon can be added here if needed, keep it simple for now */}
                        </div>

                        <div className={`flex-1 ${!isCompleted && !isActive ? 'opacity-50' : 'opacity-100'}`}>
                          <div className="flex items-center gap-2 mb-0.5">
                              <p className={`text-[11px] font-black tracking-widest uppercase ${(isActive || (isFinal && idx === STAGES.length - 1)) ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-muted)]'}`}>
                                {s.key === 'hasil' && isFinal ? (isRejected ? 'Ditolak' : 'Diterima') : s.label}
                              </p>
                          </div>
                          <p className="text-[10px] font-bold text-[var(--theme-text-muted)]">
                            {s.key === 'hasil' && isFinal 
                              ? (isRejected ? 'Maaf, pengajuan beasiswa Anda tidak dapat dilanjutkan.' : 'Selamat! Anda diterima sebagai penerima beasiswa.') 
                              : s.desc}
                          </p>
                          
                          {/* Log per stage */}
                          {isActive && logs?.length > 0 && (
                            <motion.div 
                              initial={{ opacity: 0, y: -5 }} 
                              animate={{ opacity: 1, y: 0 }}
                              className="mt-2.5 p-3 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)] flex gap-3"
                            >
                                <span className="material-symbols-outlined text-[var(--theme-primary)] mt-0.5" style={{ fontSize: 14 }}>info</span>
                                <div>
                                  <p className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-0.5">Catatan Verifikator</p>
                                  <p className="text-[11px] font-bold text-[var(--theme-text)]">{logs[logs.length - 1].catatan_admin || 'Sedang dalam proses verifikasi substansi.'}</p>
                                </div>
                            </motion.div>
                          )}
                        </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Docs & Details */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Motivation Snapshot */}
          <div className="glass-card rounded-2xl p-5 relative overflow-hidden bg-[var(--theme-primary)]/5 border-[var(--theme-primary)]/10">
             <span className="material-symbols-outlined absolute right-[-20px] bottom-[-20px] text-[var(--theme-primary)] opacity-5 pointer-events-none" style={{ fontSize: '100px' }}>format_quote</span>
             <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--theme-primary)] mb-3 flex items-center gap-1.5"><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit_note</span> Motivasi</h4>
             <p className="text-[11px] font-medium leading-relaxed italic text-[var(--theme-text)] opacity-80 line-clamp-6">
               "{pengajuanMotivasi || '-'}"
             </p>
          </div>

          {/* Files List */}
          <div className="glass-card rounded-2xl p-5">
             <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] mb-3 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '14px' }} >folder</span> 
                Dokumen Terlampir
             </h4>
             <div className="space-y-2">
                {berkas?.length > 0 ? berkas.map(file => (
                  <div key={file.id} className="p-3 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)] flex items-center justify-between hover:border-[var(--theme-primary)]/50 transition-all group">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-[var(--theme-surface)] rounded-lg flex items-center justify-center text-[var(--theme-text-muted)] group-hover:text-[var(--theme-primary)] group-hover:bg-[var(--theme-primary-light)] transition-colors">
                         <span className="material-symbols-outlined" style={{ fontSize: 16 }}>description</span>
                       </div>
                       <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text)]">{file.tipe_berkas}</p>
                         <p className="text-[9px] font-bold text-[var(--theme-text-muted)]">PDF / JPG</p>
                       </div>
                    </div>
                    <a 
                      href={file.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-1.5 hover:bg-[var(--theme-surface)] rounded-md text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] transition-all"
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>open_in_new</span>
                    </a>
                  </div>
                )) : (
                  <p className="text-[10px] text-[var(--theme-text-muted)] italic">Tidak ada berkas.</p>
                )}
             </div>
          </div>

          {/* Custom Answers List */}
          {(() => {
            const rawAnswers = pengajuan.custom_answers || pengajuan.CustomAnswers;
            if (!rawAnswers) return null;
            let answers = {};
            try {
              answers = typeof rawAnswers === 'string' ? JSON.parse(rawAnswers) : rawAnswers;
            } catch (e) {
              return null;
            }
            if (Object.keys(answers).length === 0) return null;
            return (
              <div className="glass-card rounded-2xl p-5">
                <h4 className="text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>fact_check</span>
                  Syarat Kustom
                </h4>
                <div className="space-y-3">
                  {Object.entries(answers).map(([label, value]) => {
                    const isFile = typeof value === 'string' && (value.startsWith('/uploads/') || value.startsWith('http') || value.includes('/api/scholarship/upload-custom-file'));
                    const fullFileUrl = isFile && !value.startsWith('http') ? `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace('/api', '') : ''}${value}` : value;
                    return (
                      <div key={label} className="p-3 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)] space-y-1">
                        <span className="block text-[8px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">{label}</span>
                        {isFile ? (
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] font-bold text-[var(--theme-text)]">Lampiran File</span>
                            <a 
                              href={fullFileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[var(--theme-primary)] hover:underline text-[9px] font-black flex items-center gap-0.5 uppercase tracking-widest"
                            >
                              Buka <span className="material-symbols-outlined" style={{ fontSize: 10 }}>open_in_new</span>
                            </a>
                          </div>
                        ) : (
                          <p className="text-[10px] font-bold text-[var(--theme-text)] whitespace-pre-line leading-relaxed">
                            {Array.isArray(value) ? value.join(', ') : String(value)}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

        </div>

      </div>
    </PageContent>
  );
}
