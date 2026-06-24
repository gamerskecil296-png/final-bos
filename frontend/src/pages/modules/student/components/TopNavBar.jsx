import React from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

import useAuthStore from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { API_BASE_URL } from '@/services/api';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const UserCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>account_circle</span>;

const TopNavBar = () => {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);

  const { data: profile } = useQuery({
    queryKey: ['mahasiswa', 'profile'],
    queryFn: async () => {
      const { data } = await api.get('/profil');
      return data.data;
    }
  });

  const getFullUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    const baseUrl = API_BASE_URL.replace('/api', '');
    return `${baseUrl}${path}`;
  };

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#fcf9f8]/80 backdrop-blur-md shadow-sm flex justify-between items-center px-6 h-16">
      <div className="flex items-center gap-8">
        <span className="text-xl font-bold text-blue-900 font-headline">BKU Student Hub</span>
        <div className="hidden md:flex items-center bg-slate-100/50 px-4 py-2 rounded-full w-96">
          <span className="material-symbols-outlined text-slate-500 mr-2">search</span>
          <input 
            className="bg-transparent border-none focus:ring-0 text-sm w-full placeholder-slate-500 outline-none" 
            placeholder="Search courses, resources, or help..." 
            type="text" 
          />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button className="p-2 rounded-full hover:bg-blue-50 transition-colors active:scale-95 duration-150">
          <span className="material-symbols-outlined text-blue-900">notifications</span>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer group hover:bg-white/50 p-1 rounded-full transition-all outline-none">
              <div className="h-9 w-9 rounded-full overflow-hidden border border-border bg-surface flex items-center justify-center">
                {profile?.FotoURL ? (
                  <img 
                    alt="Student profile picture" 
                    src={getFullUrl(profile.FotoURL)} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="material-symbols-outlined text-slate-300 w-7 h-7" >account_circle</span>
                )}
              </div>
              <span className="material-symbols-outlined size-3 text-slate-400 group-hover:text-blue-900 transition-colors" >expand_more</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2 rounded-2xl p-1.5 shadow-xl border border-slate-100 bg-white">
            <div className="px-3 py-2 border-b border-slate-50 mb-1">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">Mahasiswa</p>
              <p className="text-xs font-bold text-slate-900 truncate">{user?.Email}</p>
            </div>
            
            <DropdownMenuItem onClick={() => navigate('/student/profile')} className="rounded-xl p-2.5 focus:bg-blue-50/50 group cursor-pointer transition-all">
              <UserCircle className="mr-2 size-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
              <span className="text-xs font-medium text-slate-600 group-hover:text-blue-900 transition-colors">Profil Saya</span>
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => navigate('/student/profile')} className="rounded-xl p-2.5 focus:bg-blue-50/50 group cursor-pointer transition-all">
              <span className="material-symbols-outlined mr-2 size-4 text-slate-400 group-hover:text-blue-600 transition-colors" >settings</span>
              <span className="text-xs font-medium text-slate-600 group-hover:text-blue-900 transition-colors">Pengaturan</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1.5 bg-slate-50" />
            
            <DropdownMenuItem 
              onClick={() => {
                logout();
                navigate('/login');
              }} 
              className="rounded-xl p-2.5 focus:bg-rose-50 group cursor-pointer transition-all"
            >
              <span className="material-symbols-outlined mr-2 size-4 text-rose-400 group-hover:text-rose-600 transition-colors" >logout</span>
              <span className="text-xs font-bold text-rose-500 group-hover:text-rose-600 transition-colors">Keluar</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};

export default TopNavBar;
