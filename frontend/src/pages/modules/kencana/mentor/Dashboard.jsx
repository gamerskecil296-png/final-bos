import React from 'react';
import { Link } from 'react-router-dom';
import { useMentorDashboardQuery } from '@/queries/useKencanaMentorQuery';
import useAuthStore from '@/store/useAuthStore';

const Dashboard = () => {
  const { data: dashboardInfo, isLoading } = useMentorDashboardQuery();
  const user = useAuthStore(state => state.user);

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-4 border-[var(--theme-primary)]"></div>
      </div>
    );
  }

  const mentor = dashboardInfo?.mentor || {};
  const period = dashboardInfo?.period || {};
  const studentCount = dashboardInfo?.student_count || 0;
  
  // Calculate profile completeness
  const isProfileComplete = mentor.name && mentor.phone;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in font-body">
      {/* Header Section with Premium Gradient */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--theme-primary)] via-[var(--theme-primary-hover)] to-[var(--theme-text)] p-8 md:p-12 shadow-2xl">
        {/* Abstract background elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-[var(--theme-secondary-light)]/20 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-[var(--theme-primary-light)]/20 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white/90 text-xs font-semibold uppercase tracking-widest backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-[var(--theme-success)] animate-pulse"></span>
                Portal Dewan Pembimbing
              </div>
              {dashboardInfo?.group?.name && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--theme-secondary)]/80 border border-white/20 text-white text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-sm">
                  <span className="material-symbols-outlined text-[14px]">groups</span>
                  Kelompok {dashboardInfo.group.name}
                </div>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-2 font-headline">
              Selamat Datang, {mentor.name || user?.name || user?.email?.split('@')[0]}
            </h1>
            <p className="text-white/80 text-lg max-w-2xl font-medium">
              Kelola mahasiswa bimbingan Anda dan pantau perkembangan PKKMB Kencana secara real-time.
            </p>
          </div>
          
          <div className="flex-shrink-0 bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 text-center min-w-[140px]">
            <p className="text-xs font-bold text-white/70 uppercase tracking-wider mb-1">Cakupan Wilayah</p>
            <p className="text-xl font-bold text-white">
              {mentor.scope_type === 'university' ? 'Universitas' : 'Fakultas'}
            </p>
            {mentor.scope_type === 'faculty' && mentor.fakultas?.Nama && (
              <p className="text-xs text-white/80 mt-1 font-semibold">{mentor.fakultas.Nama}</p>
            )}
          </div>
        </div>
      </div>

      {/* Warning Alert if profile incomplete */}
      {!isProfileComplete && (
        <div className="bg-[var(--theme-warning-light)] border border-[var(--theme-warning)] rounded-2xl p-5 flex items-start gap-4 shadow-sm">
          <div className="p-2 bg-[var(--theme-warning-light)] text-[var(--theme-warning)] rounded-xl">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--theme-warning)]">Profil Anda Belum Lengkap</h3>
            <p className="text-sm text-[var(--theme-text)] mt-1">Silakan lengkapi nama lengkap dan nomor telepon Anda di halaman Pengaturan agar mahasiswa dapat menghubungi Anda.</p>
            <Link to="/app/kencana/mentor/settings" className="inline-block mt-3 text-xs font-semibold text-[var(--theme-warning)] uppercase tracking-wider hover:opacity-85 border-b border-[var(--theme-warning)] pb-0.5 transition-all">Lengkapi Profil &rarr;</Link>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-[var(--theme-surface)] rounded-2xl p-6 border border-[var(--theme-border)] shadow-sm hover:-translate-y-0.5 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[var(--theme-primary)] group-hover:text-white transition-all duration-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <h3 className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Total Bimbingan</h3>
          <div className="flex items-end gap-2">
            <span className="text-3xl font-bold text-[var(--theme-text)]">{studentCount}</span>
            <span className="text-xs font-medium text-[var(--theme-text-muted)] mb-1">Mahasiswa Aktif</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[var(--theme-surface)] rounded-2xl p-6 border border-[var(--theme-border)] shadow-sm hover:-translate-y-0.5 transition-all group">
          <div className="w-12 h-12 rounded-xl bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)] flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-[var(--theme-secondary)] group-hover:text-white transition-all duration-300">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
          </div>
          <h3 className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1">Periode Kencana</h3>
          <p className="text-xl font-bold text-[var(--theme-text)] leading-tight mt-2">
            {period.name || 'Belum ada periode aktif'}
          </p>
        </div>

        {/* Card 3 */}
        <div className="bg-[var(--theme-surface)] rounded-2xl p-6 border border-[var(--theme-border)] shadow-sm hover:-translate-y-0.5 transition-all group relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-6 opacity-10 transform translate-x-4 -translate-y-4 group-hover:rotate-12 transition-all duration-500">
            <svg className="w-32 h-32 text-[var(--theme-secondary)]" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13.5H5.5L12 6.5z"/></svg>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-1 relative z-10">Jelajahi Mahasiswa</h3>
            <p className="text-[var(--theme-text-muted)] font-medium text-xs mt-2 relative z-10">Cari mahasiswa yang tersedia untuk dibimbing pada kelompok Anda.</p>
          </div>
          <Link to="/app/kencana/mentor/available" className="inline-flex items-center gap-2 font-semibold text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] transition-colors mt-4 relative z-10 text-sm">
            Undang Mahasiswa <span className="text-xl leading-none">&rarr;</span>
          </Link>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
        <div className="px-8 py-5 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]">
          <h2 className="text-base font-bold text-[var(--theme-text)]">Aksi Cepat</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-[var(--theme-border)]">
          <Link to="/app/kencana/mentor/groups" className="p-8 hover:bg-[var(--theme-bg)] transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center mb-4 group-hover:bg-[var(--theme-primary)] group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
            </div>
            <h3 className="font-bold text-[var(--theme-text)] mb-1 group-hover:text-[var(--theme-primary)] transition-colors">Kelompok Saya</h3>
            <p className="text-xs text-[var(--theme-text-muted)] font-medium">Lihat kelompok bimbingan dan kelola anggotanya.</p>
          </Link>
          <Link to="/app/kencana/mentor/available" className="p-8 hover:bg-[var(--theme-bg)] transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)] flex items-center justify-center mb-4 group-hover:bg-[var(--theme-secondary)] group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </div>
            <h3 className="font-bold text-[var(--theme-text)] mb-1 group-hover:text-[var(--theme-secondary)] transition-colors">Undang Mahasiswa</h3>
            <p className="text-xs text-[var(--theme-text-muted)] font-medium">Cari dan undang mahasiswa baru ke kelompok Anda.</p>
          </Link>
          <Link to="/app/kencana/mentor/settings" className="p-8 hover:bg-[var(--theme-bg)] transition-colors group">
            <div className="w-10 h-10 rounded-xl bg-[var(--theme-success-light)] text-[var(--theme-success)] flex items-center justify-center mb-4 group-hover:bg-[var(--theme-success)] group-hover:text-white transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
            </div>
            <h3 className="font-bold text-[var(--theme-text)] mb-1 group-hover:text-[var(--theme-success)] transition-colors">Pengaturan</h3>
            <p className="text-xs text-[var(--theme-text-muted)] font-medium">Perbarui informasi profil dan kontak Anda.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
