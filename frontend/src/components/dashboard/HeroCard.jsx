import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../../services/api';
import { cn } from '../../lib/utils';

export default function HeroCard({ data }) {
  const { mahasiswa, pesan_kontekstual, link_kontekstual } = data;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Selamat Pagi';
    if (hour >= 12 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  const currentStatus = mahasiswa?.status?.toLowerCase() || 'alumni';
  const firstName = mahasiswa?.nama_depan || mahasiswa?.nama || 'Mahasiswa';

  const getFullUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  return (
    <section className="relative overflow-hidden rounded-2xl p-6 md:p-8 border border-border bg-surface shadow-sm">
      {/* Subtle geometric grid background overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-surface via-background/40 to-background/30" />
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 20% 50%, var(--theme-primary) 1px, transparent 1px), radial-gradient(circle at 80% 20%, var(--theme-primary) 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Accent glow blobs */}
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full blur-3xl animate-pulse pointer-events-none" 
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 5%, transparent)' }} />
      <div className="absolute -bottom-10 right-40 w-48 h-48 rounded-full blur-2xl pointer-events-none" 
        style={{ backgroundColor: 'color-mix(in srgb, var(--theme-secondary) 5%, transparent)' }} />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-4">
            {/* Visual Avatar / Profile Image */}
            <div className="relative shrink-0">
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl border flex items-center justify-center shrink-0 shadow-sm relative overflow-hidden group/icon"
                style={{ 
                  backgroundColor: 'color-mix(in srgb, var(--theme-primary) 10%, transparent)', 
                  borderColor: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)', 
                  color: 'var(--theme-primary)' 
                }}>
                {mahasiswa?.foto_url ? (
                  <img src={getFullUrl(mahasiswa.foto_url)} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full text-white flex items-center justify-center text-lg md:text-xl font-bold font-jakarta"
                    style={{ backgroundColor: 'var(--theme-primary)' }}
                  >
                    {firstName.charAt(0)}
                  </div>
                )}
              </div>
              {/* Status dot */}
              {currentStatus === 'aktif' && (
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse" style={{ borderColor: 'var(--theme-surface)' }} />
              )}
            </div>

            <div className="space-y-1">
              {/* Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border bg-primary/5 text-primary border-primary/10">
                  Student Hub Portal
                </span>
                {currentStatus === 'aktif' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Sesi Aktif
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-extrabold text-on-surface tracking-tight font-headline leading-none">
                {getGreeting()}, <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{firstName}!</span>
              </h1>
            </div>
          </div>

          {/* Subtitle */}
          <p className="text-muted font-medium text-xs md:text-sm max-w-3xl leading-relaxed mt-3 md:pl-[72px]">
            {mahasiswa?.nim ? `${mahasiswa.nim} · ` : ''}{mahasiswa?.prodi || ''}{mahasiswa?.semester ? ` · Semester ${mahasiswa.semester}` : ''} · {dateStr}
          </p>
        </div>

        {/* Action Button Area */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto">
          {pesan_kontekstual && (
            <NavLink
              to={link_kontekstual || '#'}
              className="flex-1 md:flex-initial text-center px-4 py-2 h-10 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all shadow-md flex items-center justify-center gap-1.5"
              style={{ 
                backgroundColor: 'var(--theme-primary)',
                boxShadow: '0 10px 15px -3px color-mix(in srgb, var(--theme-primary) 30%, transparent)'
              }}
            >
              {pesan_kontekstual}
              <ChevronRight size={14} />
            </NavLink>
          )}
          

        </div>
      </div>
    </section>
  );
}