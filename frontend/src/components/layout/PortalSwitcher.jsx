import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { usePermission } from '@/hooks/usePermission';

export default function PortalSwitcher() {
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const location = useLocation();
  const navigate = useNavigate();
  
  const user = useAuthStore(state => state.user);
  const { isSuperAdmin, permissions } = usePermission();

  const isFacultyPerm = (p) => 
    p.startsWith('faculty.') || p.startsWith('faculty_') || 
    p.startsWith('program_studi.') ||
    ['students.view', 'dosen.view', 'achievement.view', 'scholarship.view', 'akademik.view', 'aspiration.view', 'prodi_users.view'].includes(p);

  const availablePortals = [];

  // Super Admin Portal
  const superAdminPerms = ['admin.', 'rbac.', 'system.', 'system_'];
  if (isSuperAdmin || permissions.includes('*') || permissions.some(p => superAdminPerms.some(prefix => p.startsWith(prefix)))) {
    availablePortals.push({ id: 'superadmin', label: 'Super Admin', path: '/admin', icon: 'admin_panel_settings', theme: 'rose' });
  }

  // Faculty Portal
  if (isSuperAdmin || permissions.some(isFacultyPerm)) {
    availablePortals.push({ id: 'faculty', label: 'Fakultas / Prodi', path: '/faculty', icon: 'school', theme: 'blue' });
  }

  // Kencana Admin
  if (isSuperAdmin || permissions.some(p => ['kencana.university.view', 'kencana.timeline.view', 'kencana.score_summary.view'].includes(p))) {
    availablePortals.push({ id: 'kencana_admin', label: 'Kencana Admin', path: '/kencana-admin', icon: 'workspace_premium', theme: 'amber' });
  }

  // Kencana Fakultas
  if (isSuperAdmin || permissions.some(p => p.startsWith('kencana.faculty'))) {
    availablePortals.push({ id: 'kencana_fakultas', label: 'Kencana Fakultas', path: '/kencana-fakultas', icon: 'domain', theme: 'cyan' });
  }

  // Kencana Mentor
  if (isSuperAdmin || permissions.some(p => p.startsWith('kencana.mentor'))) {
    availablePortals.push({ id: 'kencana_mentor', label: 'Mentor Kencana', path: '/kencana-mentor', icon: 'psychology_alt', theme: 'stone' });
  }

  // Ormawa
  if (isSuperAdmin || permissions.some(p => ['ormawa.core.view', 'ormawa.dashboard.view', 'ormawa.view', 'view_dashboard'].includes(p))) {
    availablePortals.push({ id: 'ormawa', label: 'Ormawa', path: '/ormawa', icon: 'groups', theme: 'violet' });
  }

  // Psychologist
  if (isSuperAdmin || permissions.some(p => ['psychologist.dashboard.view', 'counseling.dashboard.view'].includes(p))) {
    availablePortals.push({ id: 'psychologist', label: 'Psikolog', path: '/psychologist', icon: 'psychology', theme: 'teal' });
  }

  // Tenaga Kesehatan
  if (isSuperAdmin || permissions.some(p => ['health.dashboard.view', 'health_claims.view', 'tenagakes.dashboard.view'].includes(p))) {
    availablePortals.push({ id: 'tenagakes', label: 'Tenaga Kesehatan', path: '/tenagakes', icon: 'medical_services', theme: 'sky' });
  }

  // Student (Selalu punya jika mahasiswa)
  if (user?.role === 'student' || user?.role === 'mahasiswa' || useAuthStore.getState().mahasiswa) {
    availablePortals.push({ id: 'student', label: 'Student Hub', path: '/student/dashboard', icon: 'face', theme: 'emerald' });
  }

  // Jangan tampilkan switcher jika hanya ada 1 atau 0 portal
  if (availablePortals.length <= 1) {
    return null;
  }

  // Current Portal detection
  const currentPath = location.pathname;
  const currentPortal = availablePortals.find(p => currentPath.startsWith(p.path)) || availablePortals[0];

  const themes = {
    slate: 'bg-slate-100 text-slate-600',
    rose: 'bg-rose-100 text-rose-600 border-rose-200',
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    amber: 'bg-amber-100 text-amber-600 border-amber-200',
    cyan: 'bg-cyan-100 text-cyan-600 border-cyan-200',
    stone: 'bg-stone-100 text-stone-600 border-stone-200',
    violet: 'bg-violet-100 text-violet-600 border-violet-200',
    teal: 'bg-teal-100 text-teal-600 border-teal-200',
    sky: 'bg-sky-100 text-sky-600 border-sky-200',
    emerald: 'bg-emerald-100 text-emerald-600 border-emerald-200'
  };

  const openDropdown = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: 220,
        zIndex: 9999,
      });
    }
    setOpen(p => !p);
  };

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownStyle(prev => ({ ...prev, top: rect.bottom + 8, left: rect.left }));
      }
    };
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={`rounded-2xl border bg-white border-slate-200 shadow-xl overflow-hidden`}
      style={{
        ...dropdownStyle,
        animation: 'topbarDropdown 0.18s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pindah Portal</p>
      </div>
      <div className="p-2 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {availablePortals.map(p => {
          const isActive = p.id === currentPortal?.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                navigate(p.path);
                setOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${themes[p.theme] || themes.slate}`}>
                <span className="material-symbols-outlined !text-[16px]">{p.icon}</span>
              </div>
              <span className="truncate leading-tight flex-1">{p.label}</span>
              {isActive && (
                <span className="material-symbols-outlined !text-[14px] shrink-0 text-white">check_circle</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="shrink-0" ref={triggerRef}>
      <button
        onClick={openDropdown}
        className={`flex items-center gap-2 h-9 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 shadow-sm transition-all duration-200 active:scale-[0.97] cursor-pointer group`}
      >
        <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${themes[currentPortal?.theme] || themes.slate} border`}>
          <span className="material-symbols-outlined !text-[14px]">{currentPortal?.icon}</span>
        </div>
        <span className="truncate max-w-[120px] hidden sm:block">{currentPortal?.label}</span>
        <span className={`material-symbols-outlined !text-[14px] text-slate-400 transition-transform duration-200 group-hover:text-slate-600 ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && ReactDOM.createPortal(dropdownContent, document.body)}
    </div>
  );
}
