import React from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { usePengajuanDetailQuery } from '@/queries/useScholarshipQuery';
import useAuthStore from '@/store/useAuthStore';

import { motion, AnimatePresence } from 'framer-motion';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const ArrowLeft = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>arrow_back</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Zap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>bolt</span>;
const Sparkles = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>auto_awesome</span>;
const ExternalLink = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>open_in_new</span>;



const STAGES = [
  { key: 'dikirim', label: 'Pengajuan Dikirim', desc: 'Data pendaftaran pertama kali diterima oleh sistem.' },
  { key: 'seleksi_berkas', label: 'Seleksi Berkas', desc: 'Tim verifikator sedang memeriksa keabsahan dokumen.' },
  { key: 'evaluasi', label: 'Evaluasi & Wawancara', desc: 'Penilaian substansi dan sesi wawancara (jika ada).' },
  { key: 'review', label: 'Review Akhir', desc: 'Review kumulatif oleh jajaran pimpinan BKU.' },
  { key: 'penetapan', label: 'Penetapan Pemenang', desc: 'Penetapan final daftar penerima beasiswa.' },
  { key: 'hasil', label: 'Hasil Akhir', desc: 'Pengumuman resmi status penerimaan.' },
];

export default function ScholarshipDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const { data, isLoading } = usePengajuanDetailQuery(id);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <span className="material-symbols-outlined animate-spin text-primary mx-auto mb-4" style={{ fontSize: '48px' }} >sync</span>
          <p className="text-sm font-black text-text-muted uppercase tracking-widest">Memuat Progress...</p>
        </div>
      </div>
    );
  }

  const { pengajuan, logs } = data || {};
  
  if (!pengajuan) return null;

  // Safe mapping of properties with casing fallbacks
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
        : `http://localhost:8000${pengajuanKtmKtpUrl}`
    });
  }
  if (pengajuanSertifikatUrl) {
    berkas.push({
      id: 'sertifikat',
      tipe_berkas: 'Sertifikat Pendukung',
      file_url: pengajuanSertifikatUrl.startsWith('http') 
        ? pengajuanSertifikatUrl 
        : `http://localhost:8000${pengajuanSertifikatUrl}`
    });
  }
  if (pengajuanTranskripUrl) {
    berkas.push({
      id: 'transkrip',
      tipe_berkas: 'Transkrip Nilai Akademik',
      file_url: pengajuanTranskripUrl.startsWith('http') 
        ? pengajuanTranskripUrl 
        : `http://localhost:8000${pengajuanTranskripUrl}`
    });
  }

  // Find current stage index
  const statusToStage = {
    dikirim: 0,
    menunggu: 0,
    seleksi_berkas: 1,
    evaluasi: 2,
    review: 3,
    penetapan: 4,
    diterima: 5,
    ditolak: 5,
    proses: 1,
    diajukan: 0
  };
  const currentStageIdx = statusToStage[pengajuanStatus.toLowerCase()] || 0;
  const isFinal = pengajuanStatus.toLowerCase() === 'diterima' || pengajuanStatus.toLowerCase() === 'ditolak';

  return (
    <PageContent className="font-body">
      <PageHeader 
        title={beasiswaNama} 
        subtitle={`${beasiswaPenyelenggara} • Terdaftar pada ${new Date(pengajuanCreatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`} 
        icon="workspace_premium" 
        breadcrumbs={[
          { label: 'Student Hub', path: '/app/student/dashboard' },
          { label: 'Beasiswa', path: user?.role === 'super_admin' ? '/app/dashboard/student-beasiswa' : '/app/student/scholarship' },
          { label: 'Detail Pengajuan' }
        ]} 
        action={
          <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border shadow-sm ${
            pengajuanStatus.toLowerCase() === 'diterima' ? 'bg-success/15 border-success/30 text-success' : 
            pengajuanStatus.toLowerCase() === 'ditolak' ? 'bg-error/15 border-error/30 text-error' :
            'bg-primary/10 border-primary/20 text-primary'
          }`}>
            {pengajuanStatus.replace('_', ' ')}
          </div>
        } 
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Left Column: Info & Tracker */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* Main Info Card */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-surface rounded-2xl p-5 md:p-6 border border-border shadow-sm relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent -mr-32 -mt-32 rounded-full blur-3xl opacity-60" />
            
            <div className="flex flex-col md:flex-row justify-between gap-6 relative z-10">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                   <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Tracking Real-time</span>
                </div>
                 <div className="flex flex-wrap items-center gap-3 mb-1">
                   <h1 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">{beasiswaNama}</h1>
                   <div className={`px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${
                     pengajuanStatus.toLowerCase() === 'diterima' ? 'bg-success/15 border-success/30 text-success' : 
                     pengajuanStatus.toLowerCase() === 'ditolak' ? 'bg-error/15 border-error/30 text-error' :
                      'bg-primary/10 border-primary/20 text-primary'
                   }`}>
                     {pengajuanStatus.replace('_', ' ')}
                   </div>
                 </div>
                 <p className="text-[11px] font-bold text-text-muted uppercase tracking-[0.2em]">{beasiswaPenyelenggara}</p>
                
                <div className="flex flex-wrap items-center gap-4 mt-6">
                  <div className="px-4 py-2 bg-background rounded-2xl border border-border flex items-center gap-2">
                    <Zap size={14} className="text-primary" />
                    <span className="text-xs font-black text-text-muted">{pengajuan.nomor_referensi || pengajuanId}</span>
                  </div>
                  <div className="px-4 py-2 bg-background rounded-2xl border border-border flex items-center gap-2">
                    <span className="material-symbols-outlined text-text-muted" style={{ fontSize: '14px' }} >calendar_month</span>
                    <span className="text-xs font-bold text-text-muted">Terdaftar: {new Date(pengajuanCreatedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                {/* Summary Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                  <div className="p-4 bg-background rounded-2xl border border-border">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Nilai Bantuan</p>
                    <p className="text-sm font-black text-primary">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(beasiswaNilaiBantuan)}
                    </p>
                  </div>
                  <div className="p-4 bg-background rounded-2xl border border-border">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Min. IPK</p>
                    <p className="text-sm font-black text-bku-text">{beasiswaIpkMin?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="p-4 bg-background rounded-2xl border border-border">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Status Ekonomi</p>
                    <p className="text-sm font-black text-bku-text">{beasiswaKategori?.toLowerCase()?.includes('sktm') || beasiswaKategori === 'Ekonomi' ? 'Wajib SKTM' : 'Umum'}</p>
                  </div>
                  <div className="p-4 bg-background rounded-2xl border border-border">
                    <p className="text-[9px] font-black text-text-muted uppercase tracking-widest mb-1">Kategori</p>
                    <p className="text-sm font-black text-bku-text">{beasiswaKategori || '-'}</p>
                  </div>
                </div>
              </div>

            </div>

            {/* PIPELINE STEPPER (Vertical) */}
            <div className="mt-8 space-y-2">
              <h3 className="text-xs font-black text-text-muted uppercase tracking-[0.3em] mb-8">Pipeline Seleksi</h3>
              
              <div className="relative">
                {/* Connecting Line */}
                <div className="absolute left-6 top-8 bottom-8 w-1 bg-border-muted">
                   <motion.div 
                     initial={{ height: 0 }}
                     animate={{ height: `${(currentStageIdx / (STAGES.length - 1)) * 100}%` }}
                     className="w-full bg-primary relative transition-all duration-1000"
                    />
                </div>

                <div className="space-y-12">
                  {STAGES.map((s, idx) => {
                    const isCompleted = idx < currentStageIdx;
                    const isActive = idx === currentStageIdx;
                    const isRejected = s.key === 'hasil' && pengajuanStatus.toLowerCase() === 'ditolak';

                    return (
                      <div key={s.key} className="flex gap-10 relative items-start group">
                         {/* Circle Indicator */}
                         <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center z-10 transition-all border-4 ${
                           isCompleted ? 'bg-success border-success/20 text-white shadow-lg shadow-success/10' :
                           isActive ? (isRejected ? 'bg-error border-error-muted text-white shadow-lg' : 'bg-primary border-primary/25 text-white shadow-lg shadow-primary/20 scale-110') :
                           'bg-surface border-border text-text-muted'
                          }`}>
                            {isCompleted ? <span className="material-symbols-outlined" style={{ fontSize: '24px' }} >check_circle</span> : (isRejected ? <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>close</span> : (idx + 1))}
                         </div>
 
                         <div className={`flex-1 transition-opacity ${!isCompleted && !isActive ? 'opacity-40' : 'opacity-100'}`}>
                            <div className="flex items-center gap-2 mb-1">
                               <p className={`text-lg font-black tracking-tight ${isActive ? 'text-bku-text' : 'text-text-muted'}`}>{s.label}</p>
                               {isActive && !isFinal && (
                                 <span className="flex h-2 w-2 relative">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning/75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-warning"></span>
                                 </span>
                               )}
                            </div>
                            <p className="text-sm font-medium text-text-muted leading-relaxed max-w-xl">{s.desc}</p>
                            
                            {/* Log per stage (latest relevant log) */}
                            {isActive && logs?.length > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, x: -10 }} 
                                animate={{ opacity: 1, x: 0 }}
                                className="mt-4 p-5 bg-background rounded-[24px] border border-border flex gap-4"
                              >
                                 <div className="p-2.5 bg-surface rounded-xl shadow-sm border border-border text-primary shrink-0 h-fit">
                                   <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>
                                 </div>
                                <div>
                                   <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-1">Catatan Verifikator</p>
                                   <p className="text-sm font-bold text-bku-text">{logs[logs.length - 1].catatan_admin || 'Sedang dalam proses verifikasi substansi.'}</p>
                                   <p className="text-[9px] font-bold text-text-muted mt-2 uppercase tracking-tighter">Diperbarui: {new Date(logs[logs.length - 1].created_at).toLocaleString('id-ID')}</p>
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
          </motion.div>
        </div>

        {/* Right Column: Docs & Details */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* Motivation Snapshot */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary p-6 rounded-2xl text-white shadow-xl shadow-primary/20 relative overflow-hidden"
          >
             <div className="absolute bottom-0 right-0 p-4 opacity-10">
               <Zap size={120} strokeWidth={1} />
             </div>
             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-white/60 mb-5 flex items-center gap-2"><Sparkles size={14} className="text-[#dbe7ff]" /> Snapshot Motivasi</h4>
             <p className="text-sm font-medium leading-relaxed italic opacity-80 line-clamp-[10] break-words text-white">
               "{pengajuanMotivasi || 'tidak ada motivasi'}"
             </p>
          </motion.div>

          {/* Files List */}
          <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm">
             <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-muted mb-5 flex items-center gap-2"><span className="material-symbols-outlined text-primary" style={{ fontSize: '16px' }} >description</span> Dokumen Pendaftaran</h4>
             <div className="space-y-3">
                {berkas?.length > 0 ? berkas.map(file => (
                  <div key={file.id} className="group p-4 bg-background rounded-xl border border-border flex items-center justify-between hover:border-primary/50 transition-all">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 bg-surface rounded-xl border border-border group-hover:border-primary/50 flex items-center justify-center text-text-muted group-hover:text-primary">
                         <span className="material-symbols-outlined" style={{ fontSize: 18 }}>download</span>
                       </div>
                       <div>
                         <p className="text-[10px] font-black uppercase tracking-widest text-bku-text">{file.tipe_berkas}</p>
                         <p className="text-[8px] font-bold text-text-muted">PDF/JPG Document</p>
                       </div>
                    </div>
                    <a 
                      href={file.file_url} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2 hover:bg-surface rounded-lg text-text-muted hover:text-bku-text transition-all"
                    >
                      <ExternalLink size={16} />
                    </a>
                  </div>
                )) : (
                  <p className="text-xs text-text-muted italic">Tidak ada berkas ditemukan.</p>
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
              console.error(e);
              return null;
            }
            if (Object.keys(answers).length === 0) return null;
            return (
              <div className="bg-white p-6 rounded-2xl border border-[#e5e5e5] shadow-sm">
                <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#a3a3a3] mb-5 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00236F]" style={{ fontSize: '16px' }}>assignment</span>
                  Jawaban Form Kustom
                </h4>
                <div className="space-y-3 text-left">
                  {Object.entries(answers).map(([label, value]) => {
                    const isFile = typeof value === 'string' && (value.startsWith('/uploads/') || value.startsWith('http') || value.includes('/api/scholarship/upload-custom-file'));
                    const fullFileUrl = isFile && !value.startsWith('http') ? `http://localhost:8000${value}` : value;
                    return (
                      <div key={label} className="p-4 bg-[#fafafa] rounded-xl border border-[#f5f5f5] space-y-1">
                        <span className="block text-[9px] font-black uppercase tracking-wider text-[#a3a3a3]">{label}</span>
                        {isFile ? (
                          <div className="flex items-center justify-between bg-white p-2.5 rounded-lg border border-[#e5e5e5] mt-1">
                            <span className="text-xs font-bold text-[#171717] truncate max-w-[150px]">Lampiran File</span>
                            <a 
                              href={fullFileUrl} 
                              target="_blank" 
                              rel="noreferrer" 
                              className="text-[#00236F] hover:underline text-xs font-black flex items-center gap-1"
                            >
                              Buka <span className="material-symbols-outlined" style={{ fontSize: 12 }}>open_in_new</span>
                            </a>
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-[#171717] whitespace-pre-line leading-relaxed">
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

          {/* Verified Badge Header */}
          <div className="bg-primary/5 p-6 rounded-2xl border border-primary/15 flex flex-col items-center text-center">
             <div className="w-16 h-16 bg-surface rounded-[24px] flex items-center justify-center text-success border border-border shadow-sm mb-4">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>security</span>
             </div>
             <p className="text-sm font-black text-primary tracking-tight mb-1 uppercase">Sistem BKU Student Hub</p>
             <p className="text-[10px] font-bold text-primary opacity-80 uppercase tracking-widest">End-to-End Encryption & Verified Data</p>
          </div>

        </div>

      </div>
    </PageContent>
  );
}
