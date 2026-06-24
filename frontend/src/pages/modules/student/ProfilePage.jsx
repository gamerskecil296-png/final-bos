import React, { useState } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

import { cn } from '@/lib/utils';
import DataDiriTab from './tabs/DataDiriTab';
import KeamananTab from './tabs/KeamananTab';
import PreferensiTab from './tabs/PreferensiTab';
import AvatarUploadModal from './components/AvatarUploadModal';

export default function ProfilePage() {
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('data-diri');

  const tabs = [
    { id: 'data-diri', label: 'Data Diri', icon: 'person' },
    { id: 'keamanan', label: 'Keamanan Akun', icon: 'security' },
    { id: 'preferensi', label: 'Preferensi Notif', icon: 'notifications' },
  ];

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['mahasiswa', 'profile'],
    queryFn: async () => {
      const { data } = await api.get('/profil');
      return data.data;
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="material-symbols-outlined w-10 h-10 text-[var(--theme-primary)] animate-spin" >sync</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-10 text-center">
        <p className="text-[var(--theme-primary)] font-bold">Gagal memuat profil. Silakan coba lagi nanti.</p>
      </div>
    );
  }

  const statusColors = {
    aktif: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/30',
    cuti: 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning)]/30',
    alumni: 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border)]',
  };

  const currentStatus = profile?.StatusAkademik?.toLowerCase() || 'aktif';

  return (
    <PageContent className="font-body">
      <div className="w-full relative space-y-6 scroll-smooth pb-8">
        {/* Page Heading */}
        <PageHeader 
          title="Pengaturan Profil Akun"
          subtitle="Kelola informasi identitas, keamanan kata sandi, dan preferensi notifikasi secara mandiri."
          icon="account_circle"
          breadcrumbs={[
            { label: 'Student Hub', path: '/app/student/dashboard' },
            { label: 'Profil Akun', path: '/app/student/profile' }
          ]}
        />
        
        {/* Identity Card — visual hero of the page */}
        <div className="rounded-3xl border border-[var(--theme-border)] p-5 md:p-6 shadow-sm mb-6 relative overflow-hidden group glass-card" style={{ background: 'linear-gradient(135deg, var(--theme-surface) 0%, var(--theme-bg) 100%)' }}>
          
          {/* Decorative background blobs */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-[var(--theme-primary)]/5 rounded-full blur-3xl pointer-events-none group-hover:bg-[var(--theme-primary)]/10 transition-all duration-700"></div>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
            
            {/* Left: Avatar */}
            <div className="flex flex-col items-center gap-3 group/avatar relative shrink-0">
               <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[var(--theme-bg)] border-2 border-[var(--theme-surface)] shadow-md flex items-center justify-center overflow-hidden relative transition-transform duration-500 group-hover/avatar:scale-105">
                  {profile?.FotoURL ? (
                    <img src={profile.FotoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[var(--theme-text-muted)] opacity-30" style={{ fontSize: 48 }}>account_circle</span>
                  )}
                  <button 
                    onClick={() => setIsAvatarModalOpen(true)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm text-white flex flex-col items-center justify-center opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer"
                  >
                    <span className="material-symbols-outlined mb-1" style={{ fontSize: 20 }}>photo_camera</span>
                    <span className="text-[9px] font-black uppercase tracking-widest">Ganti Foto</span>
                  </button>
               </div>
             </div>

            {/* Right: SiaKAD Info */}
             <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-y-6 gap-x-8 items-center w-full">
                
                {/* Name & NIM */}
                <div>
                  <div className="flex flex-wrap items-center gap-3 mb-1">
                    <h1 className="text-xl md:text-2xl font-black font-headline truncate max-w-[280px] text-[var(--theme-text)]">{profile?.Nama}</h1>
                    <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shadow-sm ${statusColors[currentStatus] || statusColors['aktif']}`}>
                      {profile?.StatusAkademik || 'Aktif'}
                    </span>
                  </div>
                   <p className="text-[var(--theme-text-muted)] font-bold text-xs md:text-sm tracking-wide flex items-center gap-1.5">
                     <span className="material-symbols-outlined" style={{ fontSize: 16 }}>badge</span>
                     NIM: <span className="text-[var(--theme-text)]">{profile?.NIM}</span>
                   </p>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">school</span>Program Studi</label>
                    <p className="text-sm font-bold text-[var(--theme-text)] truncate" title={profile?.ProgramStudi?.Nama}>{profile?.ProgramStudi?.Nama || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">calendar_today</span>Angkatan</label>
                    <p className="text-sm font-bold text-[var(--theme-text)]">{profile?.TahunMasuk || '-'}</p>
                  </div>
                  <div>
                    <label className="text-[9px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest mb-1 flex items-center gap-1.5"><span className="material-symbols-outlined text-[14px]">timeline</span>Semester</label>
                    <p className="text-sm font-bold text-[var(--theme-text)] flex items-center gap-1.5">
                        {profile?.SemesterSekarang || '-'} <span className="text-[var(--theme-text-muted)] opacity-30 text-[10px]">•</span> <span className="text-[var(--theme-primary)]">Aktif</span>
                    </p>
                  </div>
               </div>

             </div>
          </div>
          
          <div className="mt-5 pt-3 border-t border-[var(--theme-border-muted)] flex items-center gap-2 text-[10px] font-semibold text-[var(--theme-text-muted)] italic relative z-10">
            <span className="material-symbols-outlined opacity-50" style={{ fontSize: 12 }}>info</span>
            Data akademik terintegrasi otomatis dari sistem Student Hub dan bersifat read-only.
          </div>
        </div>

        {/* Profile Settings Layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <aside className="space-y-2 lg:col-span-3">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-2xl px-5 py-4 transition-all cursor-pointer active:scale-95 border",
                  activeTab === tab.id 
                    ? 'bg-[var(--theme-primary)] text-white shadow-lg shadow-[var(--theme-primary)]/20 border-transparent' 
                    : 'border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'
                )}
              >
                <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'text-white' : 'text-[var(--theme-text-subtle)]'}`}>{tab.icon}</span>
                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            ))}
          </aside>

          <section className="lg:col-span-9">
            <div className="overflow-hidden rounded-2xl border shadow-sm min-h-[400px]" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
              {activeTab === 'data-diri' && (
                <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <DataDiriTab profile={profile} />
                </div>
              )}
              {activeTab === 'keamanan' && (
                <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <KeamananTab />
                </div>
              )}
              {activeTab === 'preferensi' && (
                <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-500">
                  <PreferensiTab />
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Modals */}
        <AvatarUploadModal 
          isOpen={isAvatarModalOpen} 
          onClose={() => setIsAvatarModalOpen(false)} 
          currentPhoto={profile?.FotoURL}
        />
      </div>
    </PageContent>
  );
}
