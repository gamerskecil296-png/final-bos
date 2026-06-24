import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, User, LogOut, ChevronRight, Settings } from 'lucide-react';
import { useLocation, useNavigate, NavLink, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationDropdown from './NotificationDropdown';
import useAuthStore from '../../store/useAuthStore';
import { menuItems } from '../../constants/menuItems';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { API_BASE_URL } from '../../services/api';

export default function Header({ onMenuClick }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const profileRef = useRef(null);
  const searchRef = useRef(null);
  
  const logout = useAuthStore(state => state.logout);
  const mahasiswaStore = useAuthStore(state => state.mahasiswa);
  const user = useAuthStore(state => state.user);
  const role = user?.role || '';
  const isStudent = role === 'mahasiswa' || role === 'student' || role === '';

  // Use React Query for reactive profile data (synced with upload)
  // Only fetch for student role — admin/psychologist/ormawa don't use /profil
  const { data: profile } = useQuery({
    queryKey: ['mahasiswa', 'profile'],
    queryFn: async () => {
      const { data } = await api.get('/profil');
      return data.data;
    },
    placeholderData: mahasiswaStore, // Fallback to store while loading
    enabled: isStudent // Only run for student role
  });

  // For non-student roles, use user store data as display info
  const student = profile || mahasiswaStore || {
    nama: user?.name || user?.email || 'Admin',
    nim: user?.role ? user.role.replace('_', ' ').toUpperCase() : '-'
  };
  const displayName = String(student?.nama || student?.Nama || student?.name || 'User');
  const displayNim = String(student?.nim || student?.NIM || '-');
  const displayPhoto = student?.foto_url || student?.FotoURL || student?.photo_url || '';
  const displayInitial = displayName.charAt(0).toUpperCase();

  const getFullUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Tetap lanjut logout di client
    } finally {
      logout();
      setIsProfileOpen(false);
      toast.success('Berhasil logout');
      navigate('/login', { replace: true });
    }
  };

  // Filter menu items for search
  const searchResults = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut Ctrl+K to trigger Spotlight Search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchFocused(true);
      }
      if (e.key === 'Escape') {
        setIsSearchFocused(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Format path to breadcrumb
  const pathParts = location.pathname.split('/').filter(p => p !== '');
  const currentPage = pathParts.length > 1 ? pathParts[1] : 'Dashboard';
  const pageTitle = currentPage.charAt(0).toUpperCase() + currentPage.slice(1);

  return (
    <>
      <header className="h-20 glass-card flex items-center justify-between px-6 lg:px-10 sticky top-0 z-50 shrink-0 border-b border-white/40 font-inter transition-all duration-300">
        
        <div className="flex items-center gap-6 flex-1">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition border border-slate-200 active:scale-95"
            aria-label="Buka menu"
          >
            <span className="material-symbols-outlined size-5" style={{ fontSize: '20px' }}>menu</span>
          </button>
          
          {/* Unified BKU Grid icon & Breadcrumbs */}
          <nav className="hidden md:flex items-center gap-3 overflow-hidden">
            <div className="p-2 rounded-xl bg-bku-primary/5 text-bku-primary flex items-center justify-center border border-bku-primary/10 shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[18px]" style={{ fontSize: '18px' }}>grid_view</span>
            </div>
            <div className="flex items-center text-[10px] font-extrabold tracking-widest uppercase font-headline">
              <span className="text-slate-400">Student Portal</span>
              <span className="material-symbols-outlined text-slate-300 mx-2 text-[14px] leading-none select-none">
                chevron_right
              </span>
              <span className="text-slate-800 bg-slate-100/50 px-3 py-1 rounded-xl truncate max-w-[160px] border border-slate-200/30 normal-case font-extrabold text-[11px] font-body">
                {pageTitle.replace('-', ' ')}
              </span>
            </div>
          </nav>

          {/* Premium Student Status Indicator Badge */}
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/5 text-emerald-600 rounded-2xl text-[10px] font-extrabold tracking-wider uppercase border border-emerald-500/10 shadow-sm shadow-emerald-500/5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            Mahasiswa Aktif
          </div>
        </div>

        <div className="flex items-center gap-3 lg:gap-4">
          {/* Search trigger button capsule (spotlight search style) */}
          <div>
            <button 
              onClick={() => setIsSearchFocused(true)}
              className="h-10 px-4 rounded-2xl bg-slate-50/70 border border-slate-200/60 hover:bg-slate-100 hover:border-slate-300 text-slate-500 hover:text-bku-primary transition-all active:scale-95 shadow-sm flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>search</span>
              <span className="hidden sm:inline text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mr-1">CARI (Ctrl+K)</span>
            </button>
          </div>

          {/* Notification Bell */}
          <NotificationDropdown />

          {/* Vertical Separator */}
          <div className="hidden sm:block w-px h-8 bg-slate-200 mx-1"></div>

          {/* Premium Capsule Profile Dropdown Trigger */}
          <div className="relative" ref={profileRef}>
            <div 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className={`flex items-center gap-2.5 cursor-pointer group hover:bg-slate-50 p-1 pr-3 rounded-full transition-all duration-300 outline-none border border-slate-200/60 bg-white shadow-sm hover:shadow-md ${isProfileOpen ? 'ring-4 ring-bku-primary/10 border-bku-primary/30' : ''}`}
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-bku-primary to-indigo-500 text-white flex items-center justify-center font-black text-sm ring-2 ring-white shadow-md shadow-bku-primary/20 group-hover:scale-105 transition-all duration-300 shrink-0 overflow-hidden">
                {displayPhoto && !imageError ? (
                  <img 
                    src={getFullUrl(displayPhoto)} 
                    alt="Nav Profile" 
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  displayInitial
                )}
              </div>
              <div className="hidden sm:flex flex-col leading-tight pr-1.5 shrink-0 text-left">
                <span className="text-[11px] font-extrabold text-slate-800 group-hover:text-bku-primary transition-colors truncate max-w-[100px]">
                  {displayName}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Mahasiswa</span>
              </div>
              <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-slate-600 transition-colors" style={{ fontSize: '16px' }}>expand_more</span>
            </div>

            {/* Profile Dropdown Menu */}
            <AnimatePresence>
              {isProfileOpen && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute top-full right-0 mt-3 w-72 glass-card rounded-3xl shadow-xl border border-white/40 overflow-hidden z-[60]"
                >
                  {/* User Info Section */}
                  <div className="bg-gradient-to-br from-bku-primary to-bku-hover p-6 text-white">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-xl overflow-hidden shrink-0">
                        {displayPhoto && !imageError ? (
                          <img 
                            src={getFullUrl(displayPhoto)} 
                            alt="Profile" 
                            className="w-full h-full object-cover" 
                            onError={() => setImageError(true)}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-bku-primary/40 to-bku-primary text-white flex items-center justify-center font-black text-2xl">
                            {displayInitial}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-base truncate font-headline">{displayName}</h4>
                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest truncate font-inter">{displayNim}</p>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span className="text-[10px] font-bold text-emerald-300 uppercase">Aktif</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="p-3 bg-slate-50/50">
                    <div className="space-y-1">
                      <NavLink 
                        to="/student/profile" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white hover:shadow-md text-sm font-semibold text-slate-600 hover:text-bku-primary transition-all group font-headline"
                      >
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform" size={18}>person</span>
                        Data Diri
                      </NavLink>
                      <NavLink 
                        to="/student/profile?tab=preferensi" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-white hover:shadow-md text-sm font-semibold text-slate-600 hover:text-bku-primary transition-all group font-headline"
                      >
                        <span className="material-symbols-outlined group-hover:scale-110 transition-transform" size={18}>settings</span>
                        Pengaturan
                      </NavLink>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-slate-200">
                      <button 
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-3 rounded-2xl hover:bg-rose-50 text-sm font-semibold text-rose-600 transition-all group font-headline"
                      >
                        <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform" size={18}>logout</span>
                        Keluar Sesi
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      {/* Spotlight Search Overlay Modal */}
      {isSearchFocused && (
        <div 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-start justify-center pt-[12vh] px-4 animate-in fade-in duration-200"
          onClick={() => setIsSearchFocused(false)}
        >
          <div 
            ref={searchRef}
            className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[70vh] animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Box */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 shrink-0">
              <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '22px' }}>search</span>
              <input
                autoFocus
                className="flex-1 bg-transparent text-sm font-semibold text-slate-800 placeholder:text-slate-400 outline-none h-6 font-inter"
                placeholder="Cari layanan mahasiswa (misal: Kencana, Beasiswa, Konseling)..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="flex items-center gap-1">
                <div className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[9px] font-black text-slate-400 uppercase">
                  ESC
                </div>
              </div>
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto p-3 space-y-0.5 no-scrollbar">
              <div className="px-3 py-2 border-b border-slate-50 mb-1 text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {searchQuery.trim() === '' ? 'Rekomendasi Layanan' : `Hasil Pencarian (${searchResults.length})`}
                </p>
              </div>

              {searchResults.length > 0 ? (
                searchResults.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => {
                      navigate(item.path);
                      setSearchQuery('');
                      setIsSearchFocused(false);
                    }}
                    className="flex items-center gap-3.5 p-3 rounded-2xl hover:bg-slate-50 cursor-pointer transition-all duration-200 group active:scale-[0.99]"
                  >
                    <div className="w-9 h-9 rounded-xl bg-bku-primary/5 text-bku-primary flex items-center justify-center group-hover:bg-bku-primary group-hover:text-white transition-colors shrink-0">
                      {item.icon ? <item.icon className="size-4" /> : <span className="material-symbols-outlined">grid_view</span>}
                    </div>
                    <div className="flex flex-col flex-1 leading-tight text-left">
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900 transition-colors">{item.name}</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">{item.path}</span>
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-slate-300 opacity-0 group-hover:opacity-100 transition-all transform translate-x-1 group-hover:translate-x-0">arrow_forward</span>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2">
                  <span className="material-symbols-outlined text-slate-300" style={{ fontSize: '40px' }}>find_in_page</span>
                  <p className="text-xs font-bold text-slate-400">Tidak ada fitur yang cocok</p>
                  <p className="text-[10px] text-slate-400/70 max-w-[200px]">Coba cari dengan kata kunci lain seperti 'Kencana', 'Beasiswa', 'Kesehatan'.</p>
                </div>
              )}
            </div>

            {/* Hotkeys Guide Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest font-headline shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="bg-white border border-slate-200 px-1 py-0.5 rounded shadow-sm text-slate-500">↑↓</span>
                <span>Navigasi</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-white border border-slate-200 px-1.5 py-0.5 rounded shadow-sm text-slate-500">Enter</span>
                <span>Pilih</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="bg-white border border-slate-200 px-1 py-0.5 rounded shadow-sm text-slate-500">ESC</span>
                <span>Tutup</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
