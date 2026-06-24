import React from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';

import { motion } from 'framer-motion';
import { useParams, Link, NavLink } from 'react-router-dom';
import { useVoiceDetailQuery } from '@/queries/useStudentVoiceQuery';
import { Skeleton } from '@/components/ui/Skeleton';
import { API_BASE_URL } from '@/services/api';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Ban = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>block</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>layers</span>;
const Building = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>business</span>;
const School = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;



export default function StudentVoiceDetailPage() {
  const { id } = useParams();
  const { data: ticket, isLoading, isError, error } = useVoiceDetailQuery(id);

  if (isLoading) return <DetailSkeleton />;
  if (isError || !ticket) return <ErrorView error={error} />;

  return (
    <PageContent className="font-body">
      <PageHeader 
        title={ticket.nomor_tiket} 
        subtitle={
          <div className="flex flex-wrap items-center gap-3 mt-1.5">
            <span className="px-2 py-0.5 bg-[var(--theme-primary)] text-white text-[10px] font-black rounded-md shadow-sm uppercase">
              TICKET ID
            </span>
            <span className="text-xs font-bold text-[var(--theme-text-muted)]">
              Dikirim pada {new Date(ticket.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
        } 
        icon="chat" 
        breadcrumbs={[
          { label: 'Student Hub', path: '/app/student/dashboard' },
          { label: 'Suara Mahasiswa', path: '/app/student/voice' },
          { label: 'Detail Tiket' }
        ]} 
        action={
          <div className="flex flex-wrap items-center gap-2">
             <span className={`px-3 py-1.5 rounded-xl text-xs font-black border shadow-sm ${getCategoryStyle(ticket.kategori)}`}>
               {ticket.kategori}
             </span>
             <LevelBadge level={ticket.level_saat_ini} />
             <StatusBadge status={ticket.status} />
          </div>
        } 
      />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:items-start">
          {/* Left Column: Ticket Content */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm relative overflow-hidden"
            >
              {/* Header Content */}
              <div className="relative z-10">
                <div className="flex flex-col gap-4 mb-6">
                  {ticket.is_anonim && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg shrink-0 self-start">
                      <span className="material-symbols-outlined text-text-muted" style={{ fontSize: '16px' }}>security</span>
                      <span className="text-xs font-semibold text-text-muted">Dikirim secara Anonim</span>
                    </div>
                  )}
                <h2 className="text-xl md:text-2xl font-bold font-headline text-bku-text leading-tight break-words">
                  {ticket.judul}
                </h2>
                </div>

                <div className="h-px w-full bg-border-muted mb-6" />

                <div className="prose prose-neutral max-w-none mb-8 overflow-hidden">
                  <p className="text-sm md:text-base text-bku-text leading-relaxed font-body whitespace-pre-wrap break-words [overflow-wrap:anywhere] opacity-90">
                    {ticket.isi}
                  </p>
                </div>

                {ticket.respon && (
                  <div className="p-4 bg-primary/10 rounded-xl border border-primary/20 overflow-hidden">
                    <p className="text-[11px] font-bold text-primary uppercase tracking-wider mb-2">Respons Admin</p>
                    <p className="text-sm text-primary leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere] opacity-95">
                      {ticket.respon}
                    </p>
                  </div>
                )}

                {ticket.lampiran_url && (
                  <div className="p-5 bg-background rounded-2xl border border-border group/file space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-surface rounded-xl border border-border flex items-center justify-center text-text-muted group-hover/file:text-[var(--theme-primary)] transition-colors shadow-sm">
                          <span className="material-symbols-outlined" style={{ fontSize: '24px' }} >description</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-bku-text">Lampiran Pendukung</p>
                          <p className="text-xs font-semibold text-text-muted flex items-center gap-1.5 mt-0.5">
                             <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 14 }}>download</span> File Attachment
                          </p>
                        </div>
                      </div>
                      <a 
                        href={`${API_BASE_URL.replace('/api', '')}${ticket.lampiran_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-[var(--theme-primary)] text-white font-bold rounded-xl hover:opacity-90 transition-colors text-xs uppercase tracking-wider"
                      >
                        Download <span className="material-symbols-outlined" style={{ fontSize: 16 }}>download</span>
                      </a>
                    </div>

                    {/* Visual Image Preview */}
                    {/\.(jpg|jpeg|png|webp|gif)$/i.test(ticket.lampiran_url) && (
                      <div className="relative aspect-video max-w-md rounded-xl overflow-hidden border border-border shadow-sm mt-2 bg-surface">
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

            {/* Guidelines Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-6 bg-primary/10 border border-primary/20 rounded-2xl flex flex-col gap-3">
                <div className="w-10 h-10 bg-surface rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/20">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>info</span>
                </div>
                <h4 className="text-sm font-bold text-primary">Proses Penyelesaian</h4>
                <p className="text-xs text-primary/80 leading-relaxed">
                  Aspirasi ini sedang dikelola oleh Unit Kerja terkait. Mohon menunggu respons resmi sistem.
                </p>
              </div>
              <div className="p-6 bg-[var(--theme-primary)] rounded-2xl flex flex-col gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white border border-white/20">
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>security</span>
                </div>
                <h4 className="text-sm font-bold font-headline text-white">Kerahasiaan Data</h4>
                <p className="text-xs text-white/90 leading-relaxed">
                  Data pelapor dijaga kerahasiaannya dengan sistem enkripsi guna menjamin keamanan mahasiswa.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Journey Tracker */}
          <div className="lg:col-span-1">
            <div className="bg-surface rounded-2xl border border-border p-6 shadow-sm relative overflow-hidden">
              <div className="flex items-center justify-between mb-8 relative z-10">
                <h3 className="text-base font-bold font-headline text-bku-text flex items-center gap-2">
                  <div className="w-2 h-2 bg-[var(--theme-primary)] rounded-full" />
                  Journey Tracker
                </h3>
                <Layers size={18} className="text-text-muted opacity-50" />
              </div>

              <div className="relative pl-8 space-y-6 z-10">
                {/* Vertical Line Connector */}
                <div className="absolute left-[15px] top-4 bottom-6 w-0.5 bg-border-muted">
                   <motion.div 
                     initial={{ height: 0 }} 
                     animate={{ height: '100%' }}
                     transition={{ duration: 1, ease: "easeOut" }}
                     className="w-full bg-[var(--theme-primary)]"
                   />
                </div>

                {/* Timeline Events */}
                {(ticket.timeline || []).map((event, idx) => (
                  <TimelineEvent 
                    key={event.id} 
                    event={event} 
                    isLatest={idx === 0} 
                    idx={idx}
                  />
                ))}

                {(!ticket.timeline || ticket.timeline.length === 0) && (
                  <div className="text-xs text-text-muted bg-background border border-border rounded-xl px-3 py-2">
                    Belum ada riwayat proses untuk tiket ini.
                  </div>
                )}

                {/* Progress Goal */}
                {ticket.status !== 'selesai' && (
                  <div className="relative flex items-center gap-4 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-opacity">
                    <div className="absolute left-[-39px] w-8 h-8 rounded-full bg-surface border-[3px] border-border flex items-center justify-center z-20">
                      <span className="material-symbols-outlined text-text-muted opacity-40" style={{ fontSize: '14px' }} >check_circle</span>
                    </div>
                    <div>
                      <h5 className="text-xs font-bold text-text-muted">
                        Goal: Tiket Selesai
                      </h5>
                      <p className="text-[11px] font-medium text-text-muted/70 mt-0.5">Menunggu tindakan</p>
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
      {/* Icon Circle */}
      <div className={`absolute left-[-41px] w-8 h-8 rounded-full border-2 border-surface flex items-center justify-center z-30 transition-transform shadow-sm ${config.circleColor}`}>
        <div className="text-white">
          {React.cloneElement(config.icon, { size: 14, strokeWidth: 2.5 })}
        </div>
      </div>

      <div className={`p-4 rounded-xl border transition-colors overflow-hidden ${isLatest ? 'bg-primary/5 border-primary/20 shadow-sm' : 'bg-surface border-border'}`}>
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${config.badgeStyle}`}>
              {config.label}
            </span>
            <span className="text-[10px] font-medium text-text-muted flex items-center gap-1">
              <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '12px' }} >schedule</span> 
              {new Date(event.created_at).toLocaleTimeString('id-id', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
             <span className="material-symbols-outlined text-text-muted opacity-50" style={{ fontSize: '12px' }} >calendar_month</span>
             <p className="text-[11px] font-medium text-bku-text">
               {new Date(event.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
             </p>
          </div>
        </div>

        {event.isi_respons && (
          <div className={`p-3 rounded-lg text-xs font-semibold leading-relaxed border italic relative whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${config.msgStyle}`}>
             "{event.isi_respons}"
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-dashed border-border flex items-center justify-between">
           <div className="flex items-center gap-1.5">
              {event.level === 'sistem' ? <Building size={12} className="text-text-muted opacity-50"/> : <span className="material-symbols-outlined text-text-muted opacity-50" style={{ fontSize: '12px' }}>security</span>}
              <span className="text-[10px] font-medium text-text-muted">
                Oleh {event.level === 'sistem' ? 'Sistem' : `Admin ${event.level.charAt(0).toUpperCase() + event.level.slice(1)}`}
              </span>
           </div>
           {isLatest && <div className="w-1.5 h-1.5 bg-[var(--theme-primary)] rounded-full animate-pulse" />}
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
        icon: <span className="material-symbols-outlined" >call_made</span>, 
        circleColor: 'bg-[var(--theme-primary)]', 
        badgeStyle: 'bg-primary/10 text-primary border-primary/20',
        msgStyle: 'bg-background text-text-muted border-border'
      };
    case 'diterima_fakultas':
      return { 
        label: 'Diterima Fakultas', 
        icon: <Building />, 
        circleColor: 'bg-primary', 
        badgeStyle: 'bg-primary/10 text-primary border-primary/20',
        msgStyle: 'bg-primary/5 text-primary border-primary/20'
      };
    case 'respons_fakultas':
      return { 
        label: 'Feedback Fakultas', 
        icon: <span className="material-symbols-outlined" >chat</span>, 
        circleColor: 'bg-primary', 
        badgeStyle: 'bg-primary/10 text-primary border-primary/20',
        msgStyle: 'bg-primary/5 text-primary border-primary/20'
      };
    case 'diteruskan_universitas':
      return { 
        label: 'Eskalasi Universitas', 
        icon: <School />, 
        circleColor: 'bg-secondary', 
        badgeStyle: 'bg-secondary/10 text-secondary border-secondary/20',
        msgStyle: 'bg-secondary/5 text-secondary border-secondary/20'
      };
    case 'respons_universitas':
      return { 
        label: 'Feedback Universitas', 
        icon: <span className="material-symbols-outlined" >chat</span>, 
        circleColor: 'bg-secondary', 
        badgeStyle: 'bg-secondary/10 text-secondary border-secondary/20',
        msgStyle: 'bg-secondary/5 text-secondary border-secondary/20'
      };
    case 'selesai':
      return { 
        label: 'Selesai', 
        icon: <span className="material-symbols-outlined" >check_circle</span>, 
        circleColor: 'bg-success', 
        badgeStyle: 'bg-success/10 text-success border-success/20',
        msgStyle: 'bg-success/5 text-success border-success/20'
      };
    case 'dibatalkan':
      return { 
        label: 'Dibatalkan', 
        icon: <Ban />, 
        circleColor: 'bg-error', 
        badgeStyle: 'bg-error/10 text-error border-error/20',
        msgStyle: 'bg-error/5 text-error border-error/20'
      };
    default:
      return { label: 'Status', icon: <span className="material-symbols-outlined" >schedule</span>, circleColor: 'bg-text-muted', badgeStyle: 'bg-surface text-text-muted border-border', msgStyle: 'bg-surface text-text-muted border border-border' };
  }
}

function LevelBadge({ level }) {
  const styles = {
    fakultas: 'bg-primary/10 text-primary border-primary/20',
    universitas: 'bg-secondary/10 text-secondary border-secondary/20',
    prodi: 'bg-success/10 text-success border-success/20',
    ormawa: 'bg-info/10 text-info border-info/20',
    selesai: 'bg-success/10 text-success border-success/20'
  };
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-sm ${styles[level] || styles.selesai}`}>
      {level === 'selesai' ? 'Tercapai' : `Unit: ${level.charAt(0).toUpperCase() + level.slice(1)}`}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    'menunggu': 'bg-surface text-text-muted border-border',
    'diproses': 'bg-warning/10 text-warning border-warning/20',
    'ditindaklanjuti': 'bg-primary/10 text-primary border-primary/20',
    'disetujui fakultas': 'bg-primary/10 text-primary border-primary/20',
    'ditolak fakultas': 'bg-error/10 text-error border-error/20',
    'ditolak': 'bg-error/10 text-error border-error/20',
    'proses': 'bg-primary/10 text-primary border-primary/20',
    'ditinjau': 'bg-warning/10 text-warning border-warning/20',
    'selesai': 'bg-success/10 text-success border-success/20'
  };
  const key = (status || 'menunggu').toLowerCase();
  return (
    <span className={`px-3 py-1 rounded-lg text-xs font-bold border shadow-sm capitalize ${styles[key] || styles.menunggu}`}>
      {status}
    </span>
  );
}

const getCategoryStyle = (cat) => {
  const styles = {
    Akademik: 'bg-primary/10 text-primary border-primary/20',
    Fasilitas: 'bg-secondary/10 text-secondary border-secondary/20',
    Kemahasiswaan: 'bg-success/10 text-success border-success/20',
    'Saran & Ide': 'bg-info/10 text-info border-info/20'
  };
  return styles[cat] || 'bg-surface text-text-muted border border-border';
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
           <Skeleton className="h-[400px] w-full rounded-2xl" />
        </div>
        <div className="lg:col-span-1 space-y-6">
           <Skeleton className="h-[300px] w-full rounded-2xl" />
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
       <div className="w-24 h-24 bg-surface rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-border">
          <span className="material-symbols-outlined text-text-muted" style={{ fontSize: '32px' }} >chat</span>
       </div>
       <h2 className="text-xl md:text-2xl font-bold font-headline text-bku-text mb-3">
          {error?.status === 500 ? "Kesalahan Sistem" : "Data Tidak Ditemukan"}
       </h2>
       <p className="text-text-muted font-medium max-w-sm mb-8 text-sm">
         {message}
       </p>
       <div className="flex items-center gap-3">
         <Link 
           to="/app/student/voice" 
           className="px-6 py-2.5 bg-primary text-white font-medium rounded-xl hover:opacity-90 transition-colors text-sm animate-none"
         >
           Kembali ke Riwayat
         </Link>
         <button 
           onClick={() => window.location.reload()}
           className="px-6 py-2.5 bg-surface border border-border text-bku-text font-medium rounded-xl hover:bg-background transition-colors text-sm"
         >
           Coba Lagi
         </button>
       </div>
    </div>
  );
}
