import React from 'react';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { motion } from 'framer-motion';
import { useParams, Link } from 'react-router-dom';
import { useVoiceDetailQuery } from '@/queries/useStudentVoiceQuery';
import { Skeleton } from '@/components/ui/Skeleton';
import { API_BASE_URL } from '@/services/api';

// Auto-injected Material Symbol fallbacks
const Ban = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>block</span>;
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>layers</span>;
const Building = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>business</span>;
const School = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;

export default function StudentVoiceDetailPage() {
  const { id } = useParams();
  const { data: ticket, isLoading, isError, error } = useVoiceDetailQuery(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !ticket) return <ErrorView error={error} />;

  return (
    <PageContent className="font-body">
      <DashboardHero 
        icon="forum"
        title={ticket.nomor_tiket}
        subtitle={`Dikirim pada ${new Date(ticket.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}
        breadcrumbs={[
          { label: 'Student Hub', path: '/student' },
          { label: 'Suara Mahasiswa', path: '/student/voice' },
          { label: 'Detail Tiket' }
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2 mt-4 sm:mt-0">
             <span className={`px-4 py-2 rounded-xl text-xs font-black shadow-sm border ${getCategoryStyle(ticket.kategori)}`}>
               {ticket.kategori}
             </span>
             <LevelBadge level={ticket.level_saat_ini} />
             <StatusBadge status={ticket.status} />
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start mb-8">
        {/* Left Column: Ticket Content */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-6 md:p-8 border-0 shadow-xl relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex flex-col gap-4 mb-6">
                {ticket.is_anonim && (
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-lg shrink-0 self-start">
                    <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: '16px' }}>security</span>
                    <span className="text-xs font-semibold text-[var(--theme-text-muted)]">Dikirim secara Anonim</span>
                  </div>
                )}
                <h2 className="text-xl md:text-2xl font-bold font-headline text-[var(--theme-text)] leading-tight break-words">
                  {ticket.judul}
                </h2>
              </div>

              <div className="h-px w-full bg-[var(--theme-border-muted)] mb-6" />

              <div className="prose prose-neutral max-w-none mb-8 overflow-hidden">
                <p className="text-sm md:text-base text-[var(--theme-text)] leading-relaxed font-body whitespace-pre-wrap break-words [overflow-wrap:anywhere] opacity-90">
                  {ticket.isi}
                </p>
              </div>

              {ticket.respon && (
                <div className="p-5 bg-[var(--theme-primary-light)]/40 rounded-2xl border border-[var(--theme-primary)]/20 overflow-hidden shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }}>comment</span>
                    <p className="text-[11px] font-black text-[var(--theme-primary)] uppercase tracking-widest">Respons Admin</p>
                  </div>
                  <p className="text-sm text-[var(--theme-text)] leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] opacity-95 font-medium">
                    {ticket.respon}
                  </p>
                </div>
              )}

              {ticket.lampiran_url && (
                <div className="mt-6 p-5 bg-[var(--theme-surface)] rounded-3xl border border-[var(--theme-border)] group/file space-y-4 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-[var(--theme-bg)] rounded-2xl border border-[var(--theme-border-muted)] flex items-center justify-center text-[var(--theme-text-muted)] group-hover/file:text-[var(--theme-primary)] transition-colors shadow-sm">
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>description</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--theme-text)]">Lampiran Pendukung</p>
                        <p className="text-xs font-semibold text-[var(--theme-text-muted)] flex items-center gap-1.5 mt-0.5">
                            <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 14 }}>download</span> File Attachment
                        </p>
                      </div>
                    </div>
                    <a 
                      href={`${API_BASE_URL.replace('/api', '')}${ticket.lampiran_url}`} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--theme-primary)] text-white font-bold rounded-xl hover:bg-[var(--theme-primary-hover)] transition-colors text-xs uppercase tracking-wider"
                    >
                      Download <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                    </a>
                  </div>

                  {/\.(jpg|jpeg|png|webp|gif)$/i.test(ticket.lampiran_url) && (
                    <div className="relative aspect-video max-w-md rounded-xl overflow-hidden border border-[var(--theme-border)] shadow-sm mt-4 bg-[var(--theme-bg)]">
                      <img 
                        src={`${API_BASE_URL.replace('/api', '')}${ticket.lampiran_url}`} 
                        alt="Lampiran Visual" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-6 bg-[var(--theme-primary-light)]/50 border border-[var(--theme-primary)]/20 rounded-3xl flex flex-col gap-3">
              <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center text-[var(--theme-primary)] shadow-sm border border-[var(--theme-primary)]/10">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>
              </div>
              <h4 className="text-sm font-bold text-[var(--theme-primary)]">Proses Penyelesaian</h4>
              <p className="text-xs text-[var(--theme-primary)]/80 leading-relaxed font-medium">
                Aspirasi ini dikelola oleh Unit Kerja terkait. Mohon menunggu respons resmi sistem.
              </p>
            </div>
            <div className="p-6 bg-[var(--theme-primary)] rounded-3xl flex flex-col gap-3 shadow-lg shadow-[var(--theme-primary)]/30">
              <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center text-white border border-white/20 backdrop-blur-sm">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>security</span>
              </div>
              <h4 className="text-sm font-bold font-headline text-white">Kerahasiaan Data</h4>
              <p className="text-xs text-white/90 leading-relaxed font-medium">
                Data pelapor dijaga kerahasiaannya dengan sistem enkripsi guna menjamin keamanan.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Journey Tracker */}
        <div className="lg:col-span-1">
          <div className="glass-card rounded-3xl border-0 p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between mb-8 relative z-10">
              <h3 className="text-base font-bold font-headline text-[var(--theme-text)] flex items-center gap-2">
                <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full" />
                Journey Tracker
              </h3>
              <Layers size={18} className="text-[var(--theme-text-muted)] opacity-50" />
            </div>

            <div className="relative pl-8 space-y-6 z-10">
              <div className="absolute left-[15px] top-4 bottom-6 w-0.5 bg-[var(--theme-border)]">
                  <motion.div 
                    initial={{ height: 0 }} 
                    animate={{ height: '100%' }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="w-full bg-[var(--theme-primary)]"
                  />
              </div>

              {(ticket.timeline || []).map((event, idx) => (
                <TimelineEvent 
                  key={event.id} 
                  event={event} 
                  isLatest={idx === 0} 
                  idx={idx}
                />
              ))}

              {(!ticket.timeline || ticket.timeline.length === 0) && (
                <div className="text-xs text-[var(--theme-text-muted)] bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2">
                  Belum ada riwayat proses.
                </div>
              )}

              {ticket.status !== 'selesai' && (
                <div className="relative flex items-center gap-4 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-opacity">
                  <div className="absolute left-[-39px] w-8 h-8 rounded-full bg-[var(--theme-surface)] border-[3px] border-[var(--theme-border)] flex items-center justify-center z-20">
                    <span className="material-symbols-outlined text-[var(--theme-text-muted)] opacity-40" style={{ fontSize: '14px' }}>check_circle</span>
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-[var(--theme-text-muted)]">
                      Goal: Tiket Selesai
                    </h5>
                    <p className="text-[11px] font-medium text-[var(--theme-text-muted)]/70 mt-0.5">Menunggu tindakan</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PageContent>
  );
}

function TimelineEvent({ event, isLatest, idx }) {
  const config = getEventConfig(event.tipe_event);
  
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.1 }}
      className={`relative ${isLatest ? 'z-20' : 'z-10'}`}
    >
      <div className={`absolute left-[-41px] w-8 h-8 rounded-full border-[3px] border-white dark:border-[var(--theme-bg)] flex items-center justify-center z-30 transition-transform shadow-sm ${config.circleColor}`}>
        <div className="text-white flex items-center justify-center">
          {React.cloneElement(config.icon, { style: { fontSize: '16px' } })}
        </div>
      </div>

      <div className="p-4 md:p-5 rounded-2xl bg-[var(--theme-surface)] border border-[var(--theme-border)] shadow-sm transition-colors overflow-hidden">
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] md:text-xs font-black tracking-widest px-3 py-1.5 rounded-lg border uppercase ${config.badgeStyle}`}>
              {config.label}
            </span>
            <span className="text-xs font-bold text-[var(--theme-text-muted)] flex items-center gap-1.5">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span> 
              {new Date(event.created_at).toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' }).replace(':', '.')}
            </span>
          </div>
          <div className="flex items-center gap-2">
             <span className="material-symbols-outlined text-[var(--theme-text-muted)] opacity-50" style={{ fontSize: '16px' }}>calendar_month</span>
             <p className="text-xs font-bold text-[var(--theme-text)]">
               {new Date(event.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
             </p>
          </div>
        </div>

        {event.isi_respons && (
          <div className={`p-4 rounded-xl text-xs md:text-sm font-semibold leading-relaxed mb-4 whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${config.msgStyle}`}>
             {event.isi_respons}
          </div>
        )}

        <div className="pt-4 border-t border-dashed border-[var(--theme-border-muted)] flex items-center justify-between">
           <div className="flex items-center gap-2">
              {event.level === 'sistem' ? <Building size={16} className="text-[var(--theme-text-muted)] opacity-50"/> : <span className="material-symbols-outlined text-[var(--theme-text-muted)] opacity-50" style={{ fontSize: '16px' }}>security</span>}
              <span className="text-xs font-bold text-[var(--theme-text-muted)]">
                Oleh {event.level === 'sistem' ? 'Sistem' : `Admin ${event.level.charAt(0).toUpperCase() + event.level.slice(1)}`}
              </span>
           </div>
           {isLatest && <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full animate-pulse" />}
        </div>
      </div>
    </motion.div>
  );
}

function getEventConfig(type) {
  switch (type) {
    case 'dikirim':
      return { 
        label: 'Terkirim', 
        icon: <span className="material-symbols-outlined">arrow_outward</span>, 
        circleColor: 'bg-[var(--theme-primary)]', 
        badgeStyle: 'text-[var(--theme-primary)] border-[var(--theme-primary)]/30 bg-[var(--theme-primary-light)]/10',
        msgStyle: 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'
      };
    case 'diterima_fakultas':
      return { 
        label: 'Diterima Fakultas', 
        icon: <Building />, 
        circleColor: 'bg-[var(--theme-primary)]', 
        badgeStyle: 'text-[var(--theme-primary)] border-[var(--theme-primary)]/30 bg-[var(--theme-primary-light)]/10',
        msgStyle: 'text-[var(--theme-primary)] bg-[var(--theme-primary-light)]/20'
      };
    case 'respons_fakultas':
      return { 
        label: 'Feedback Fakultas', 
        icon: <span className="material-symbols-outlined">chat</span>, 
        circleColor: 'bg-[var(--theme-primary)]', 
        badgeStyle: 'text-[var(--theme-primary)] border-[var(--theme-primary)]/30 bg-[var(--theme-primary-light)]/10',
        msgStyle: 'text-[var(--theme-primary)] bg-[var(--theme-primary-light)]/20'
      };
    case 'diteruskan_universitas':
      return { 
        label: 'Eskalasi Universitas', 
        icon: <School />, 
        circleColor: 'bg-[var(--theme-secondary)]', 
        badgeStyle: 'text-[var(--theme-secondary)] border-[var(--theme-secondary)]/30 bg-[var(--theme-secondary)]/10',
        msgStyle: 'text-[var(--theme-secondary)] bg-[var(--theme-secondary)]/10'
      };
    case 'respons_universitas':
      return { 
        label: 'Feedback Universitas', 
        icon: <span className="material-symbols-outlined">chat</span>, 
        circleColor: 'bg-[var(--theme-secondary)]', 
        badgeStyle: 'text-[var(--theme-secondary)] border-[var(--theme-secondary)]/30 bg-[var(--theme-secondary)]/10',
        msgStyle: 'text-[var(--theme-secondary)] bg-[var(--theme-secondary)]/10'
      };
    case 'selesai':
      return { 
        label: 'Selesai', 
        icon: <span className="material-symbols-outlined">check_circle</span>, 
        circleColor: 'bg-[var(--theme-success)]', 
        badgeStyle: 'text-[var(--theme-success)] border-[var(--theme-success)]/30 bg-[var(--theme-success)]/10',
        msgStyle: 'text-[var(--theme-success)] bg-[var(--theme-success)]/10 border border-[var(--theme-success)]/20'
      };
    case 'dibatalkan':
      return { 
        label: 'Dibatalkan', 
        icon: <Ban />, 
        circleColor: 'bg-[var(--theme-error)]', 
        badgeStyle: 'text-[var(--theme-error)] border-[var(--theme-error)]/30 bg-[var(--theme-error)]/10',
        msgStyle: 'text-[var(--theme-error)] bg-[var(--theme-error)]/10'
      };
    default:
      return { 
        label: 'Status', 
        icon: <span className="material-symbols-outlined">schedule</span>, 
        circleColor: 'bg-[var(--theme-text-muted)]', 
        badgeStyle: 'text-[var(--theme-text-muted)] border-[var(--theme-border)] bg-[var(--theme-surface)]', 
        msgStyle: 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]' 
      };
  }
}

function LevelBadge({ level }) {
  const styles = {
    fakultas: 'bg-[var(--theme-primary-light)]/50 text-[var(--theme-primary)] border-[var(--theme-primary)]/20',
    universitas: 'bg-[var(--theme-secondary)]/10 text-[var(--theme-secondary)] border-[var(--theme-secondary)]/20',
    prodi: 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20',
    ormawa: 'bg-[var(--theme-info)]/10 text-[var(--theme-info)] border-[var(--theme-info)]/20',
    selesai: 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20'
  };
  return (
    <span className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase border shadow-sm ${styles[level] || styles.selesai}`}>
      {level === 'selesai' ? 'Tercapai' : `Unit: ${level}`}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'menunggu': 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border)]',
    'diproses': 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)] border-[var(--theme-warning)]/20',
    'ditindaklanjuti': 'bg-[var(--theme-primary-light)]/50 text-[var(--theme-primary)] border-[var(--theme-primary)]/20',
    'disetujui fakultas': 'bg-[var(--theme-primary-light)]/50 text-[var(--theme-primary)] border-[var(--theme-primary)]/20',
    'ditolak fakultas': 'bg-[var(--theme-error)]/10 text-[var(--theme-error)] border-[var(--theme-error)]/20',
    'ditolak': 'bg-[var(--theme-error)]/10 text-[var(--theme-error)] border-[var(--theme-error)]/20',
    'proses': 'bg-[var(--theme-primary-light)]/50 text-[var(--theme-primary)] border-[var(--theme-primary)]/20',
    'ditinjau': 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)] border-[var(--theme-warning)]/20',
    'selesai': 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20'
  };
  const key = (status || 'menunggu').toLowerCase();
  return (
    <span className={`px-4 py-1.5 rounded-xl text-xs font-black tracking-widest uppercase border shadow-sm ${styles[key] || styles.menunggu}`}>
      {status}
    </span>
  );
}

const getCategoryStyle = (cat) => {
  const styles = {
    Akademik: 'bg-[var(--theme-primary-light)]/50 text-[var(--theme-primary)] border-[var(--theme-primary)]/20',
    Fasilitas: 'bg-[var(--theme-secondary)]/10 text-[var(--theme-secondary)] border-[var(--theme-secondary)]/20',
    Kemahasiswaan: 'bg-[var(--theme-success)]/10 text-[var(--theme-success)] border-[var(--theme-success)]/20',
    'Saran & Ide': 'bg-[var(--theme-info)]/10 text-[var(--theme-info)] border-[var(--theme-info)]/20'
  };
  return styles[cat] || 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border border-[var(--theme-border)]';
};

function DetailSkeleton() {
  return (
    <div className="min-h-screen bg-transparent p-6 md:p-10 space-y-8 animate-pulse">
      <div className="max-w-5xl mx-auto space-y-4">
        <Skeleton className="h-6 w-32 rounded-lg" />
        <div className="flex justify-between items-center">
           <Skeleton className="h-12 w-64 rounded-xl" />
           <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <Skeleton className="h-[400px] w-full rounded-3xl" />
        </div>
        <div className="lg:col-span-1 space-y-6">
           <Skeleton className="h-[300px] w-full rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

function ErrorView({ error }) {
  const message = error?.status === 500 
    ? "Terjadi kesalahan sistem saat memuat data."
    : (error?.message || "Data tiket tidak ditemukan atau akses ditolak.");
    
  return (
    <div className="min-h-screen bg-transparent flex flex-col items-center justify-center p-6 text-center font-body">
       <div className="w-24 h-24 bg-[var(--theme-surface)] rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-[var(--theme-border)]">
          <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: '32px' }}>forum</span>
       </div>
       <h2 className="text-xl md:text-2xl font-bold font-headline text-[var(--theme-text)] mb-3">
          {error?.status === 500 ? "Kesalahan Sistem" : "Data Tidak Ditemukan"}
       </h2>
       <p className="text-[var(--theme-text-muted)] font-medium max-w-sm mb-8 text-sm">
         {message}
       </p>
       <div className="flex items-center gap-3">
         <Link 
           to="/student/voice" 
           className="px-6 py-2.5 bg-[var(--theme-primary)] text-white font-bold rounded-xl hover:bg-[var(--theme-primary-hover)] transition-colors text-sm shadow-md shadow-[var(--theme-primary)]/20"
         >
           Kembali ke Riwayat
         </Link>
         <button 
           onClick={() => window.location.reload()}
           className="px-6 py-2.5 bg-[var(--theme-surface)] border border-[var(--theme-border)] text-[var(--theme-text)] font-bold rounded-xl hover:bg-[var(--theme-bg)] transition-colors text-sm"
         >
           Coba Lagi
         </button>
       </div>
    </div>
  );
}
