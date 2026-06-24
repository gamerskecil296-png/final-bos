import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import NotificationDropdown from './NotificationDropdown';
import { fetchWithAuth, adminService, API_BASE_URL } from '../../services/api';

const getItemIcon = (name, path) => {
  const n = name.toLowerCase();
  const p = path.toLowerCase();
  if (n.includes('dashboard')) return 'grid_view';
  if (n.includes('mahasiswa') || n.includes('student')) return 'group';
  if (n.includes('dosen') || n.includes('lecturer')) return 'psychology_alt';
  if (n.includes('psikolog') || n.includes('psychologist')) return 'psychology';
  if (n.includes('prodi') || n.includes('program studi')) return 'school';
  if (n.includes('jadwal') || n.includes('calendar')) return 'calendar_month';
  if (n.includes('krs')) return 'app_registration';
  if (n.includes('nilai') || n.includes('grade')) return 'grade';
  if (n.includes('laporan') || n.includes('report')) return 'analytics';
  if (n.includes('pengaturan') || n.includes('setting')) return 'settings';
  if (n.includes('prestasi') || n.includes('achievement')) return 'emoji_events';
  if (n.includes('beasiswa') || n.includes('scholarship')) return 'workspace_premium';
  if (n.includes('proposal') || n.includes('ormawa')) return 'description';
  if (n.includes('organisasi')) return 'corporate_fare';
  if (n.includes('notif') || n.includes('notifikasi')) return 'notifications';
  return 'explore';
};

// ── Custom Dropdown Switcher Component (Portal-based, never clipped) ─────────
function SwitcherDropdown({ icon, label, value, options, onChange, colorScheme = 'slate', searchable = false }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dropdownStyle, setDropdownStyle] = useState({});
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const schemes = {
    slate: {
      bg: 'bg-white border-slate-200 hover:border-slate-300',
      icon: 'text-slate-400',
      text: 'text-slate-700',
      dropdown: 'bg-white border-slate-200 shadow-[0_12px_40px_-4px_rgba(15,23,42,0.15)]',
      itemActive: 'bg-slate-900 text-white',
      itemHover: 'hover:bg-slate-50',
      searchBg: 'bg-slate-50 border-slate-100 text-slate-700',
    },
    violet: {
      bg: 'bg-violet-50 border-violet-200 hover:border-violet-300',
      icon: 'text-violet-500',
      text: 'text-violet-700',
      dropdown: 'bg-white border-violet-100 shadow-[0_12px_40px_-4px_rgba(109,40,217,0.15)]',
      itemActive: 'bg-violet-600 text-white',
      itemHover: 'hover:bg-violet-50',
      searchBg: 'bg-violet-50 border-violet-100 text-violet-700',
    },
    indigo: {
      bg: 'bg-indigo-50 border-indigo-200 hover:border-indigo-300',
      icon: 'text-indigo-500',
      text: 'text-indigo-700',
      dropdown: 'bg-white border-indigo-100 shadow-[0_12px_40px_-4px_rgba(79,70,229,0.15)]',
      itemActive: 'bg-indigo-600 text-white',
      itemHover: 'hover:bg-indigo-50',
      searchBg: 'bg-indigo-50 border-indigo-100 text-indigo-700',
    },
    amber: {
      bg: 'bg-amber-50 border-amber-200 hover:border-amber-300',
      icon: 'text-amber-500',
      text: 'text-amber-700',
      dropdown: 'bg-white border-amber-100 shadow-[0_12px_40px_-4px_rgba(245,158,11,0.15)]',
      itemActive: 'bg-amber-500 text-white',
      itemHover: 'hover:bg-amber-50',
      searchBg: 'bg-amber-50 border-amber-100 text-amber-700',
    },
  };
  const s = schemes[colorScheme] || schemes.slate;

  // Calculate position when opening
  const openDropdown = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 8,
        left: rect.left,
        width: 256,
        zIndex: 9999,
      });
    }
    setOpen(p => !p);
  };

  // Close on outside click
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

  // Focus search on open
  useEffect(() => {
    if (open && searchable && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
    if (!open) setQuery('');
  }, [open]);

  // Reposition on scroll/resize
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

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [query, options]);

  const selectedOption = options.find(o => String(o.value) === String(value));
  const displayLabel = selectedOption?.label || label;

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className={`rounded-2xl border overflow-hidden ${s.dropdown}`}
      style={{
        ...dropdownStyle,
        animation: 'topbarDropdown 0.18s cubic-bezier(0.16,1,0.3,1)',
      }}
    >
      {/* Search bar inside dropdown */}
      {searchable && options.length > 5 && (
        <div className={`flex items-center gap-2 mx-3 mt-3 mb-1 px-3 py-2 rounded-xl border ${s.searchBg}`}>
          <span className="material-symbols-outlined !text-[14px] shrink-0 opacity-50">search</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari..."
            className="flex-1 bg-transparent border-0 outline-none text-xs font-semibold"
            style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="cursor-pointer opacity-50 hover:opacity-100">
              <span className="material-symbols-outlined !text-[13px]">close</span>
            </button>
          )}
        </div>
      )}

      <div className="p-2 max-h-72 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400 font-medium">Tidak ada hasil</div>
        ) : filtered.map(opt => {
          const isActive = String(opt.value) === String(value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-semibold transition-all duration-150 cursor-pointer ${
                isActive ? s.itemActive : `text-slate-600 ${s.itemHover}`
              }`}
            >
              {opt.icon && (
                <span className={`material-symbols-outlined !text-[15px] shrink-0 ${isActive ? 'opacity-90' : s.icon}`}>
                  {opt.icon}
                </span>
              )}
              <span className="truncate leading-tight flex-1">{opt.label}</span>
              {isActive && (
                <span className="material-symbols-outlined !text-[14px] ml-auto shrink-0">check</span>
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
        type="button"
        onClick={openDropdown}
        className={`flex items-center gap-2 h-8 px-3 rounded-xl border text-xs font-bold transition-all duration-200 active:scale-[0.97] cursor-pointer ${s.bg}`}
      >
        <span className={`material-symbols-outlined !text-[15px] shrink-0 ${s.icon}`}>{icon}</span>
        <span className={`truncate max-w-[120px] ${s.text}`}>{displayLabel}</span>
        <span className={`material-symbols-outlined !text-[14px] transition-transform duration-200 ${s.icon} ${open ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {open && ReactDOM.createPortal(dropdownContent, document.body)}
    </div>

  );
}

export default function PortalTopbar({ config, onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const mahasiswa = useAuthStore(state => state.mahasiswa);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Search Palette State
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [facultiesList, setFacultiesList] = useState([]);
  const [activeFacultyId, setActiveFacultyId] = useState(
    localStorage.getItem('superadmin_fakultas_id') || 'all'
  );

  const [prodisList, setProdisList] = useState([]);
  const [activeProdiId, setActiveProdiId] = useState(
    localStorage.getItem('superadmin_prodi_id') || 'all'
  );

  const [periodsList, setPeriodsList] = useState([]);
  const [activePeriodId, setActivePeriodId] = useState(
    localStorage.getItem('superadmin_period_id') || 'all'
  );

  const [studentsList, setStudentsList] = useState([]);
  const [activeStudentId, setActiveStudentId] = useState(
    localStorage.getItem('superadmin_impersonate_student_id') || ''
  );

  const [ormawasList, setOrmawasList] = useState([]);
  const [activeOrmawaId, setActiveOrmawaId] = useState(
    localStorage.getItem('superadmin_ormawa_id') || ''
  );

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchWithAuth('/api/admin/fakultas')
        .then(data => {
          if (data.status === 'success' && data.data) {
            setFacultiesList(data.data);
            if (!localStorage.getItem('superadmin_fakultas_id')) {
              localStorage.setItem('superadmin_fakultas_id', 'all');
              setActiveFacultyId('all');
              window.dispatchEvent(new Event('storage'));
            }
          }
        })
        .catch(err => console.error('Gagal mengambil daftar fakultas:', err));

      fetchWithAuth('/api/admin/academic-periods')
        .then(data => {
          if (data.status === 'success' && data.data) {
            setPeriodsList(data.data);
            if (!localStorage.getItem('superadmin_period_id')) {
              localStorage.setItem('superadmin_period_id', 'all');
              setActivePeriodId('all');
              window.dispatchEvent(new Event('storage'));
            }
          }
        })
        .catch(err => console.error('Gagal mengambil daftar periode akademik:', err));

      adminService.getAllStudents()
        .then(res => {
          if (res.status === 'success' && res.data) {
            setStudentsList(res.data);
            if (!localStorage.getItem('superadmin_impersonate_student_id') && res.data.length > 0) {
              const firstId = String(res.data[0].id || res.data[0].ID);
              localStorage.setItem('superadmin_impersonate_student_id', firstId);
              setActiveStudentId(firstId);
              window.dispatchEvent(new Event('storage'));
            }
          }
        })
        .catch(err => console.error('Gagal mengambil daftar mahasiswa:', err));

      adminService.getAllOrmawa()
        .then(res => {
          if (res.status === 'success' && res.data) {
            setOrmawasList(res.data);
            if (!localStorage.getItem('superadmin_ormawa_id') && res.data.length > 0) {
              const firstId = String(res.data[0].id || res.data[0].ID);
              localStorage.setItem('superadmin_ormawa_id', firstId);
              setActiveOrmawaId(firstId);
              window.dispatchEvent(new Event('storage'));
            }
          }
        })
        .catch(err => console.error('Gagal mengambil daftar ormawa:', err));
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'super_admin') {
      fetchWithAuth('/api/admin/prodi')
        .then(res => {
          if (res.status === 'success' && res.data) {
            setProdisList(res.data);
          }
        })
        .catch(err => console.error('Gagal mengambil daftar prodi:', err));
    }
  }, [user, activeFacultyId]);

  const applyChange = (key, value) => {
    localStorage.setItem(key, value);
    window.dispatchEvent(new Event('storage'));
    window.location.reload();
  };

  const handleFacultyChange = (val) => {
    localStorage.setItem('superadmin_fakultas_id', val);
    localStorage.setItem('superadmin_prodi_id', 'all');
    setActiveFacultyId(val);
    setActiveProdiId('all');
    window.dispatchEvent(new Event('storage'));
    window.location.reload();
  };

  const handleProdiChange = (val) => {
    applyChange('superadmin_prodi_id', val);
    setActiveProdiId(val);
  };

  const handlePeriodChange = (val) => {
    applyChange('superadmin_period_id', val);
    setActivePeriodId(val);
  };

  const handleResetFilters = () => {
    localStorage.setItem('superadmin_fakultas_id', 'all');
    localStorage.setItem('superadmin_prodi_id', 'all');
    localStorage.setItem('superadmin_period_id', 'all');
    setActiveFacultyId('all');
    setActiveProdiId('all');
    setActivePeriodId('all');
    window.dispatchEvent(new Event('storage'));
    window.location.reload();
  };

  const handleStudentChange = (val) => {
    if (val) {
      localStorage.setItem('superadmin_impersonate_student_id', val);
    } else {
      localStorage.removeItem('superadmin_impersonate_student_id');
    }
    setActiveStudentId(val);
    window.dispatchEvent(new Event('storage'));
    window.location.reload();
  };

  const handleOrmawaChange = (val) => {
    if (val) {
      localStorage.setItem('superadmin_ormawa_id', val);
    } else {
      localStorage.removeItem('superadmin_ormawa_id');
    }
    setActiveOrmawaId(val);
    window.dispatchEvent(new Event('storage'));
    window.location.reload();
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${API_BASE_URL}/auth/logout`, { method: 'POST' });
    } catch { /* ignore */ }
    finally {
      logout();
      navigate('/login', { replace: true });
    }
  };

  // Get user display info
  let displayName = user?.nama_lengkap || user?.name || user?.nama || user?.Nama || mahasiswa?.nama || 'User';
  if (typeof displayName === 'string' && displayName.toLowerCase().startsWith('admin ')) {
    displayName = displayName.substring(6).trim();
  }
  const displayRole = user?.role_display || user?.role || config.roleLabel || 'User';
  const cleanNameForInitial = String(displayName).replace(/Dr\.\s*|M\.Psi|S\.Psi|,/gi, '').trim();
  const displayInitial = cleanNameForInitial.charAt(0).toUpperCase() || 'U';

  const getAvatarUrl = () => {
    const url = user?.avatar_url || mahasiswa?.avatar_url;
    if (!url) return null;
    if (url.startsWith('http')) return url;
    return `${API_BASE_URL?.replace('/api', '') || ''}${url}`;
  };
  const avatarUrl = getAvatarUrl();

  // Detect current portal and resolve valid routes
  const portalRoutes = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith('/admin')) return { profile: '/admin/profile', pengaturan: '/admin/theme' };
    if (p.startsWith('/ormawa')) return { profile: null, pengaturan: '/ormawa/pengaturan' };
    if (p.startsWith('/faculty')) return { profile: '/faculty/profile', pengaturan: '/faculty/pengaturan' };
    if (p.startsWith('/psychologist')) return { profile: '/psychologist/settings', pengaturan: null };
    if (p.startsWith('/student')) return { profile: '/student/profile', pengaturan: null };
    return { profile: null, pengaturan: null };
  }, [location.pathname]);

  // Build breadcrumb from pathname
  const pathParts = location.pathname.split('/').filter(Boolean);
  const currentPage = pathParts.length > 1
    ? pathParts[pathParts.length - 1]
    : (pathParts[0] || 'Dashboard');

  const pageTitle = currentPage
    .replace(/-/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase());

  // Find menu group label
  const getMenuGroup = () => {
    if (!config || !config.menu) return '';
    const allItems = config.menu.flatMap(g => g.items || []);
    const match = allItems.find(item => {
      if (item.path === location.pathname) return true;
      if (item.hasSubmenu && item.submenu?.some(s => s.path === location.pathname)) return true;
      if (location.pathname.startsWith(item.path) && item.path !== '/') {
        return !allItems.some(other =>
          other.path !== item.path &&
          other.path.length > item.path.length &&
          location.pathname.startsWith(other.path)
        );
      }
      return false;
    });
    if (match) {
      const group = config.menu.find(g => (g.items || []).includes(match));
      return group?.group || '';
    }
    return '';
  };

  const menuGroup = getMenuGroup();

  const allSearchableItems = useMemo(() => {
    if (!config || !config.menu) return [];
    return config.menu.flatMap(group =>
      (group.items || []).flatMap(item => {
        const items = [];
        if (item.hasSubmenu && item.submenu) {
          item.submenu.forEach(sub => {
            items.push({ name: `${item.name} › ${sub.name}`, path: sub.path, group: group.group });
          });
        } else {
          items.push({ name: item.name, path: item.path, group: group.group });
        }
        return items;
      })
    );
  }, [config]);

  const filteredSearchItems = useMemo(() => {
    if (!searchQuery) return allSearchableItems.slice(0, 8);
    const query = searchQuery.toLowerCase();
    return allSearchableItems.filter(item =>
      item.name.toLowerCase().includes(query) ||
      item.group.toLowerCase().includes(query)
    );
  }, [searchQuery, allSearchableItems]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(prev => !prev);
        setSearchQuery('');
        setSelectedIndex(0);
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearchKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredSearchItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredSearchItems.length) % Math.max(1, filteredSearchItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSearchItems[selectedIndex]) {
        navigate(filteredSearchItems[selectedIndex].path);
        setIsSearchOpen(false);
      }
    }
  };

  // Build dropdown options
  const isOrmawaPage = location.pathname.includes('/admin/ormawa') && !location.pathname.includes('/admin/ormawa-kategori');
  const isSpecialPage = location.pathname.includes('/admin/ormawa') || location.pathname.includes('/admin/psychologist') || location.pathname.includes('/admin/tenagakes');
  const hasActiveFilter = activeFacultyId !== 'all' || activeProdiId !== 'all' || activePeriodId !== 'all';

  const facultyOptions = [
    { value: 'all', label: 'Semua Fakultas', icon: 'domain' },
    ...facultiesList.map(f => ({ value: String(f.id || f.ID), label: f.nama || f.Nama, icon: 'corporate_fare' })),
  ];

  const prodiOptions = [
    { value: 'all', label: 'Semua Prodi', icon: 'menu_book' },
    ...prodisList
      .filter(p => activeFacultyId === 'all' || String(p.fakultas_id || p.FakultasID) === String(activeFacultyId))
      .map(p => ({ value: String(p.id || p.ID), label: p.nama || p.Nama, icon: 'school' })),
  ];

  const periodOptions = [
    { value: 'all', label: 'Semua Periode', icon: 'event_note' },
    ...periodsList.map(p => ({ value: String(p.id || p.ID), label: `${p.AcademicYear} · ${p.Semester}${p.IsActive ? ' ⭐' : ''}`, icon: p.IsActive ? 'verified' : 'calendar_month' })),
  ];

  const ormawaOptions = ormawasList.map(o => ({
    value: String(o.id || o.ID),
    label: o.Nama || o.nama,
    icon: 'groups',
  }));

  return (
    <>
      {/* Inject keyframe animation */}
      <style>{`
        @keyframes topbarDropdown {
          from { opacity: 0; transform: translateY(-6px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      <header
        className="h-16 flex items-center justify-between px-4 lg:px-6 shrink-0 border-b transition-all duration-300 font-inter"
        style={{
          backgroundColor: 'var(--theme-surface)',
          borderColor: 'var(--theme-border)',
        }}
      >
        {/* ─── Left: Hamburger + Breadcrumb + Switchers ─── */}
        <div className="flex items-center gap-2 flex-1 min-w-0 overflow-x-auto no-scrollbar">
          {/* Mobile hamburger */}
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl transition-colors active:scale-95"
            style={{ color: 'var(--theme-text-muted)', backgroundColor: 'var(--theme-bg)' }}
            aria-label="Buka menu"
          >
            <span className="material-symbols-outlined text-xl">menu</span>
          </button>

          {/* Breadcrumb */}
          <nav className="hidden md:flex items-center gap-1.5 text-xs shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest truncate" style={{ color: 'var(--theme-text-muted)' }}>
              {config.title}
            </span>
            <span className="opacity-30" style={{ color: 'var(--theme-text-muted)' }}>›</span>
            {menuGroup && (
              <>
                <span className="text-[10px] font-bold uppercase tracking-widest truncate hidden lg:block" style={{ color: 'var(--theme-text-muted)' }}>
                  {menuGroup}
                </span>
                <span className="opacity-30 hidden lg:block" style={{ color: 'var(--theme-text-muted)' }}>›</span>
              </>
            )}
            <span className="text-xs font-semibold truncate max-w-[140px]" style={{ color: 'var(--theme-text)' }}>
              {pageTitle}
            </span>
          </nav>

          {/* Divider */}
          <div className="hidden md:block w-px h-5 bg-slate-200 mx-1 shrink-0" />
          {/* Menu Toggle */}

          {/* Divider */}
          {user?.role === 'super_admin' && (
            <div className="hidden md:block w-px h-5 bg-slate-200 mx-1 shrink-0" />
          )}

          {/* ── Switchers group ── */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">

            {/* Faculty Switcher */}
            {user?.role === 'super_admin' && facultiesList.length > 0 && !isSpecialPage && (
              <SwitcherDropdown
                icon="corporate_fare"
                label="Fakultas"
                value={activeFacultyId}
                options={facultyOptions}
                onChange={handleFacultyChange}
                colorScheme="slate"
                searchable
              />
            )}

            {/* Prodi Switcher */}
            {user?.role === 'super_admin' && activeFacultyId !== 'all' && prodisList.length > 0 && !isSpecialPage && (
              <SwitcherDropdown
                icon="school"
                label="Prodi"
                value={activeProdiId}
                options={prodiOptions}
                onChange={handleProdiChange}
                colorScheme="indigo"
                searchable
              />
            )}

            {/* Period Switcher */}
            {user?.role === 'super_admin' && periodsList.length > 0 && !isSpecialPage && (
              <SwitcherDropdown
                icon="calendar_month"
                label="Periode"
                value={activePeriodId}
                options={periodOptions}
                onChange={handlePeriodChange}
                colorScheme="amber"
                searchable
              />
            )}

            {/* Reset Filter */}
            {user?.role === 'super_admin' && hasActiveFilter && !isSpecialPage && (
              <button
                onClick={handleResetFilters}
                title="Reset semua filter"
                className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-500 hover:bg-rose-100 hover:text-rose-600 text-[10px] font-bold uppercase tracking-wider transition-all active:scale-[0.97] shrink-0 cursor-pointer"
              >
                <span className="material-symbols-outlined !text-[14px]">filter_alt_off</span>
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            {/* Ormawa Switcher — for Ormawa pages */}
            {user?.role === 'super_admin' && ormawasList.length > 0 && isOrmawaPage && (
              <SwitcherDropdown
                icon="groups"
                label="Pilih Ormawa"
                value={activeOrmawaId}
                options={ormawaOptions}
                onChange={handleOrmawaChange}
                colorScheme="violet"
                searchable
              />
            )}
          </div>
        </div>

        {/* ─── Right: Search + Notif + Profile ─── */}
        <div className="flex items-center gap-2 shrink-0 ml-3">

          {/* ── Search Trigger (pill style) ── */}
          <button
            onClick={() => { setIsSearchOpen(true); setSearchQuery(''); setSelectedIndex(0); }}
            title="Cari menu atau halaman (Ctrl+K)"
            className="hidden md:flex items-center gap-2.5 h-9 pl-3 pr-3 rounded-xl text-xs border transition-all hover:border-slate-300 hover:bg-slate-50 active:scale-95 cursor-pointer group"
            style={{
              backgroundColor: 'var(--theme-bg)',
              color: 'var(--theme-text-muted)',
              borderColor: 'var(--theme-border)',
            }}
          >
            <span className="material-symbols-outlined !text-[16px] group-hover:text-slate-600 transition-colors">search</span>
            <span className="hidden lg:inline text-[10px] font-medium text-slate-400 group-hover:text-slate-500 transition-colors">
              Cari menu...
            </span>
            <span
              className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold font-mono border"
              style={{ backgroundColor: 'var(--theme-border)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }}
            >
              ⌘K
            </span>
          </button>

          {/* Notifications */}
          <div className="flex items-center justify-center shrink-0">
            <NotificationDropdown />
          </div>

          {/* Separator */}
          <div className="hidden sm:block w-px h-6 mx-1" style={{ backgroundColor: 'var(--theme-border)' }} />

          {/* Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2.5 cursor-pointer p-1.5 pr-3 rounded-2xl transition-all border active:scale-[0.98] hover:bg-slate-50/50"
              style={{
                backgroundColor: 'var(--theme-surface)',
                borderColor: 'var(--theme-border)',
              }}
            >
              <div
                className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                style={{ backgroundColor: 'var(--theme-primary)' }}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  displayInitial
                )}
              </div>
              <div className="hidden sm:flex flex-col leading-none min-w-0 overflow-hidden text-left">
                <span className="text-xs font-bold truncate block max-w-[100px]" style={{ color: 'var(--theme-text)' }}>
                  {displayName}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.06em] mt-1 opacity-50 truncate" style={{ color: 'var(--theme-text-muted)' }}>
                  {String(displayRole).toUpperCase().includes('FACULTY') ? 'Admin Fakultas' : displayRole}
                </span>
              </div>
              <span
                className={`material-symbols-outlined !text-[16px] shrink-0 hidden sm:block opacity-40 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
                style={{ color: 'var(--theme-text-muted)' }}
              >
                expand_more
              </span>
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileOpen && (
              <div
                className="absolute top-full right-0 mt-2 w-64 rounded-2xl shadow-xl border overflow-hidden z-50"
                style={{
                  backgroundColor: 'var(--theme-surface)',
                  borderColor: 'var(--theme-border)',
                  animation: 'topbarDropdown 0.18s cubic-bezier(0.16,1,0.3,1)',
                }}
              >
                {/* User Info Header */}
                <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--theme-border)' }}>
                  <div
                    className="w-11 h-11 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-lg shrink-0 shadow-sm"
                    style={{ backgroundColor: 'var(--theme-primary)' }}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      displayInitial
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate" style={{ color: 'var(--theme-text)' }}>{displayName}</p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--theme-text-muted)' }}>{user?.Email || user?.email || displayRole}</p>
                  </div>
                </div>

                {/* Ormawa name if applicable */}
                {(user?.ormawa_name || mahasiswa?.ormawaName || user?.ormawaName || config?.orgName) && (
                  <div className="px-4 py-2 border-b bg-slate-50/50 flex items-center gap-2" style={{ borderColor: 'var(--theme-border)' }}>
                    <span className="material-symbols-outlined text-[14px]" style={{ color: 'var(--theme-text-muted)' }}>groups</span>
                    <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--theme-text-subtle)' }}>
                      {user?.ormawa_name || mahasiswa?.ormawaName || user?.ormawaName || config?.orgName}
                    </span>
                  </div>
                )}

                {/* Quick Links */}
                <div className="p-2">
                  {portalRoutes.profile && (
                    <button
                      onClick={() => { navigate(portalRoutes.profile); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-slate-50 text-left cursor-pointer"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--theme-text-muted)' }}>person</span>
                      <span>Profil Saya</span>
                    </button>
                  )}

                  {portalRoutes.pengaturan && (
                    <button
                      onClick={() => { navigate(portalRoutes.pengaturan); setIsProfileOpen(false); }}
                      className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-slate-50 text-left cursor-pointer"
                      style={{ color: 'var(--theme-text)' }}
                    >
                      <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--theme-text-muted)' }}>settings</span>
                      <span>Pengaturan</span>
                    </button>
                  )}

                  <div className="my-1 border-t" style={{ borderColor: 'var(--theme-border)' }} />

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-red-50 text-left text-red-600 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[18px] text-red-500">logout</span>
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ─── Search Command Palette Modal ─── */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[999] flex justify-center items-start pt-[12vh] p-4"
          style={{ animation: 'fadeIn 0.15s ease' }}
          onClick={() => setIsSearchOpen(false)}
        >
          <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl border border-slate-100 shadow-[0_40px_80px_-12px_rgba(15,23,42,0.2)] overflow-hidden flex flex-col max-h-[70vh]"
            style={{ animation: 'topbarDropdown 0.2s cubic-bezier(0.16,1,0.3,1)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Input Header */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-slate-500 !text-[18px]">search</span>
              </div>
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSelectedIndex(0); }}
                onKeyDown={handleSearchKeyDown}
                placeholder="Cari menu, layanan, atau halaman..."
                className="flex-1 bg-transparent border-0 outline-none text-sm font-semibold text-slate-800 placeholder-slate-400 h-9 w-full"
                style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
              />
              {searchQuery ? (
                <button
                  onClick={() => setSearchQuery('')}
                  className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-all cursor-pointer shrink-0"
                >
                  <span className="material-symbols-outlined !text-[14px]">close</span>
                </button>
              ) : (
                <span className="px-2 py-1 rounded-lg border border-slate-200 bg-white font-mono text-[9px] font-bold text-slate-400 shadow-sm select-none shrink-0">ESC</span>
              )}
            </div>

            {/* Category label */}
            {!searchQuery && (
              <div className="px-5 pt-3 pb-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Menu Tersedia</span>
              </div>
            )}
            {searchQuery && filteredSearchItems.length > 0 && (
              <div className="px-5 pt-3 pb-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">{filteredSearchItems.length} hasil ditemukan</span>
              </div>
            )}

            {/* Results List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-[120px] custom-scrollbar">
              {filteredSearchItems.length > 0 ? (
                <div className="space-y-0.5">
                  {filteredSearchItems.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    const icon = getItemIcon(item.name, item.path);
                    return (
                      <button
                        key={item.path}
                        onClick={() => { navigate(item.path); setIsSearchOpen(false); }}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl transition-all duration-150 text-left ${isSelected
                          ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                          : 'text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all ${isSelected
                          ? 'bg-white/15 text-white'
                          : 'bg-slate-100 text-slate-500'
                          }`}>
                          <span className="material-symbols-outlined !text-[17px]">{icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-xs font-bold block truncate ${isSelected ? 'text-white' : 'text-slate-800'}`}>{item.name}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-widest block mt-0.5 ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>{item.group}</span>
                        </div>
                        <span className={`material-symbols-outlined !text-[15px] shrink-0 transition-all ${isSelected ? 'text-white/70 translate-x-0.5' : 'text-slate-300'}`}>
                          arrow_forward
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="py-14 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                    <span className="material-symbols-outlined text-3xl text-slate-400">search_off</span>
                  </div>
                  <p className="text-sm font-bold text-slate-500">Tidak ada hasil</p>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    Coba kata kunci lain atau navigasi lewat sidebar.
                  </p>
                </div>
              )}
            </div>

            {/* Command Palette Footer */}
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-[9px] font-bold text-slate-400 select-none">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <kbd className="flex items-center justify-center w-5 h-5 bg-white border border-slate-200 rounded text-[10px] shadow-sm">↑</kbd>
                  <kbd className="flex items-center justify-center w-5 h-5 bg-white border border-slate-200 rounded text-[10px] shadow-sm">↓</kbd>
                  Navigasi
                </span>
                <span className="flex items-center gap-1.5">
                  <kbd className="flex items-center justify-center px-1.5 h-5 bg-white border border-slate-200 rounded text-[9px] shadow-sm">↵</kbd>
                  Pilih
                </span>
              </div>
              <span className="flex items-center gap-1.5 text-slate-300">
                <span className="material-symbols-outlined !text-[12px]">bolt</span>
                Spotlight Search
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}