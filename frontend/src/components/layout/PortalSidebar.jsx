import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import api from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { usePermission } from '../../hooks/usePermission';

export default function PortalSidebar({ config, onNavigate }) {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const mahasiswa = useAuthStore(state => state.mahasiswa);

  const [isLogoutHovered, setIsLogoutHovered] = useState(false);
  const [openSubmenus, setOpenSubmenus] = useState({});

  // Auto-expand active submenus on location change or initial load
  useEffect(() => {
    if (config?.menu) {
      const updates = {};
      let changed = false;
      config.menu.forEach(group => {
        group.items?.forEach(item => {
          if (item.hasSubmenu && item.submenu) {
            const hasActive = item.submenu.some(sub => {
              if (sub.path.includes('?')) {
                return (location.pathname + location.search) === sub.path;
              }
              return location.pathname.startsWith(sub.path);
            });
            if (hasActive && !openSubmenus[item.path]) {
              updates[item.path] = true;
              changed = true;
            }
          }
        });
      });
      if (changed) {
        setOpenSubmenus(prev => ({ ...prev, ...updates }));
      }
    }
  }, [location.pathname, location.search, config]);

  // Toggle submenu
  const toggleSubmenu = (path) => {
    setOpenSubmenus(prev => ({
      ...prev,
      [path]: !prev[path]
    }));
  };

  // Check if a path is active
  const isActive = (itemPath, hasSubmenu) => {
    const currentPath = location.pathname;

    // Exact match (including query param if itemPath has it)
    if (itemPath.includes('?')) {
      return (currentPath + location.search) === itemPath;
    }

    if (currentPath === itemPath) return true;

    // Dashboard exact match
    if (itemPath === '/admin' || itemPath === '/ormawa' || itemPath === '/student/dashboard') {
      if (currentPath === itemPath) return true;
    }

    // Subpath matching
    if (currentPath.startsWith(itemPath) && itemPath !== '/') {
      // Check if there's a more specific match
      const allItems = config.menu.flatMap(g => g.items);
      const moreSpecific = allItems.find(item =>
        item.path !== itemPath &&
        item.path.length > itemPath.length &&
        currentPath.startsWith(item.path)
      );
      return !moreSpecific;
    }

    // Check if current path is under a submenu path
    if (hasSubmenu) {
      const submenuItem = config.menu.flatMap(g => g.items).find(i => i.hasSubmenu && i.path === itemPath);
      if (submenuItem?.submenu) {
        return submenuItem.submenu.some(sub => {
          if (sub.path.includes('?')) {
            return (currentPath + location.search) === sub.path;
          }
          return currentPath.startsWith(sub.path);
        });
      }
    }

    return false;
  };

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // continue anyway
    } finally {
      logout();
      toast.success('Berhasil logout');
      navigate('/login', { replace: true });
    }
  };

  const sidebarClasses = `
    h-screen sticky top-0 flex flex-col z-20 shrink-0 font-inter select-none
    shadow-xl border-r border-white/10 transition-all duration-500
  `;

  const { hasPermission } = usePermission();

  const roleStr = user?.role ? user.role.toLowerCase() : '';
  const isSuperAdmin = roleStr.includes('super') && roleStr.includes('admin');

  const filteredMenu = (config.menu || [])
    .filter(group => !(isSuperAdmin && group.module === 'student'))
    .map(group => {
      const filteredItems = (group.items || [])
        .map(item => {
          if (item.hasSubmenu && item.submenu) {
            const filteredSubmenu = item.submenu.filter(sub => hasPermission(sub.permission));
            return { ...item, submenu: filteredSubmenu };
          }
          return item;
        })
        .filter(item => {
          if (item.hasSubmenu && (!item.submenu || item.submenu.length === 0)) return false;
          return hasPermission(item.permission);
        });
      return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);

  return (
    <aside
      className={sidebarClasses}
      style={{
        width: 'var(--sidebar-width)',
        background: `linear-gradient(to bottom, var(--theme-sidebar-bg), color-mix(in srgb, var(--theme-sidebar-bg) 90%, var(--theme-primary)))`,
        color: 'var(--theme-sidebar-text)'
      }}
    >
      {/* ─── Logo Section ─── */}
      <div className="px-4 py-4 flex items-center justify-between shrink-0 border-b border-white/10">
        <Link
          to={filteredMenu[0]?.items[0]?.path || '/'}
          className="flex items-center gap-2.5 group"
        >
          <div className="relative">
            <div
              className="w-9 h-9 bg-white/10 border border-white/20 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 p-1 overflow-hidden"
            >
              <img
                src={config.logo || '/images/bku logo.png'}
                alt="Logo"
                className="w-full h-full object-contain brightness-110"
              />
            </div>
            <div
              className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 shadow-sm"
              style={{ borderColor: 'var(--theme-sidebar-bg)' }}
            />
          </div>
          <div className="flex flex-col leading-tight min-w-0 flex-1">
            <span
              className="text-[13px] font-extrabold uppercase tracking-wider font-headline truncate"
              style={{ color: 'var(--theme-sidebar-text)' }}
            >
              {config.title}
            </span>
            <span
              className="text-[9px] font-bold uppercase tracking-widest font-headline truncate"
              style={{ color: 'color-mix(in srgb, var(--theme-sidebar-text) 70%, var(--theme-secondary))' }}
            >
              {config.subtitle}
            </span>
          </div>
        </Link>
      </div>

      {/* ─── Navigation Items ─── */}
      <nav className="flex-1 px-3 py-5 overflow-y-auto no-scrollbar scroll-smooth pb-10 overscroll-contain space-y-1">
        {filteredMenu.map((group, gIdx) => (
          <div key={gIdx} className="mb-5 last:mb-0">
            {/* Group Title */}
            <h3
              className="px-4 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] font-headline"
              style={{ color: 'color-mix(in srgb, var(--theme-sidebar-text) 50%, transparent)' }}
            >
              {group.group}
            </h3>

            {/* Menu Items */}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.path, item.hasSubmenu);
                const isSubmenuOpen = openSubmenus[item.path];

                // If item has submenu, check if any child is active
                const hasActiveChild = item.hasSubmenu && item.submenu?.some(
                  sub => {
                    if (sub.path.includes('?')) {
                      return (location.pathname + location.search) === sub.path;
                    }
                    return location.pathname.startsWith(sub.path);
                  }
                );

                return (
                  <div key={item.path}>
                    {item.hasSubmenu ? (
                      <>
                        {/* Parent Menu Item (with submenu) */}
                        <button
                          onClick={() => toggleSubmenu(item.path)}
                          className={`
                            w-full relative flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all duration-300 group active:scale-[0.98] font-inter text-[11px]
                            ${active || hasActiveChild
                              ? 'bg-white/10 border-l-4 shadow-md shadow-white/5 opacity-100'
                              : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                            }
                          `}
                          style={{
                            color: 'var(--theme-sidebar-text)',
                            borderLeftColor: active || hasActiveChild ? 'var(--theme-secondary)' : 'transparent'
                          }}
                        >
                          <div className="w-4 h-4 flex items-center justify-center shrink-0">
                            <span
                              className="material-symbols-outlined transition-all duration-300"
                              style={{
                                fontSize: '16px',
                                color: active || hasActiveChild ? 'var(--theme-secondary)' : 'inherit'
                              }}
                            >
                              {item.icon}
                            </span>
                          </div>
                          <span className="tracking-tight flex-1 font-medium text-left truncate">{item.name}</span>
                          <span
                            className={`material-symbols-outlined transition-transform duration-300 ${isSubmenuOpen ? 'rotate-90' : ''}`}
                            style={{ fontSize: '14px', color: 'inherit' }}
                          >
                            chevron_right
                          </span>
                        </button>

                        {/* Submenu */}
                        {isSubmenuOpen && item.submenu && (
                          <div className="ml-2.5 mt-1 space-y-0.5 border-l border-white/10 pl-2.5">
                            {item.submenu.map((subItem) => {
                              const subActive = subItem.path.includes('?')
                                ? (location.pathname + location.search) === subItem.path
                                : (() => {
                                  if (!location.pathname.startsWith(subItem.path)) return false;
                                  // Check if there is a more specific submenu path match
                                  const moreSpecific = item.submenu.find(sub =>
                                    sub.path !== subItem.path &&
                                    sub.path.length > subItem.path.length &&
                                    location.pathname.startsWith(sub.path)
                                  );
                                  return !moreSpecific;
                                })();
                              return (
                                <Link
                                  key={subItem.path}
                                  to={subItem.path}
                                  onClick={onNavigate}
                                  className={`
                                    flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg font-medium transition-all duration-300 font-inter text-[10px] group
                                    ${subActive
                                      ? 'bg-white/10 opacity-100'
                                      : 'hover:bg-white/5 opacity-60 hover:opacity-100'
                                    }
                                  `}
                                  style={{
                                    color: 'var(--theme-sidebar-text)'
                                  }}
                                >
                                  <span
                                    className="material-symbols-outlined transition-all duration-300"
                                    style={{ fontSize: '14px', color: subActive ? 'var(--theme-secondary)' : 'inherit' }}
                                  >
                                    {subItem.icon}
                                  </span>
                                  <span className="truncate">{subItem.name}</span>
                                </Link>
                              );
                            })}
                          </div>
                        )}
                      </>
                    ) : (
                      /* Regular Menu Item */
                      <Link
                        to={item.path}
                        onClick={onNavigate}
                        className={`
                          relative flex items-center gap-2.5 px-3 py-2 rounded-lg font-bold transition-all duration-300 group active:scale-[0.98] font-inter text-[11px]
                          ${active
                            ? 'bg-white/10 border-l-4 shadow-md shadow-white/5 opacity-100'
                            : 'hover:bg-white/5 opacity-70 hover:opacity-100'
                          }
                        `}
                        style={{
                          color: 'var(--theme-sidebar-text)',
                          borderLeftColor: active ? 'var(--theme-secondary)' : 'transparent'
                        }}
                      >
                        <div className="w-4 h-4 flex items-center justify-center shrink-0">
                          <span
                            className={`material-symbols-outlined transition-all duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}
                            style={{
                              fontSize: '16px',
                              color: active ? 'var(--theme-secondary)' : 'inherit'
                            }}
                          >
                            {item.icon}
                          </span>
                        </div>
                        <span className="tracking-tight flex-1 font-medium truncate">{item.name}</span>
                        {active ? (
                          <div className="w-3 h-3 flex items-center justify-center shrink-0">
                            <span
                              className="material-symbols-outlined"
                              style={{ fontSize: '12px', color: 'inherit' }}
                            >
                              chevron_right
                            </span>
                          </div>
                        ) : (
                          <div className="w-3 h-3 flex items-center justify-center shrink-0">
                            <span
                              className="material-symbols-outlined opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-300"
                              style={{ fontSize: '12px', color: 'inherit' }}
                            >
                              chevron_right
                            </span>
                          </div>
                        )}
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ─── Master Hub Button for Super Admin ─── */}
      {user?.role === 'super_admin' && !location.pathname.startsWith('/admin') && (
        <div className="px-4 py-1.5 shrink-0">
          <Link
            to="/admin"
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl font-bold text-[11px] hover:bg-white/10 active:scale-[0.98] transition-all"
            style={{
              color: 'var(--theme-secondary)',
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
              arrow_back
            </span>
            <span className="truncate">Kembali ke Master Hub</span>
          </Link>
        </div>
      )}



      {/* ─── Logout Section ─── */}
      <div className="p-3 bg-transparent border-t border-white/10 shrink-0">
        <button
          onClick={handleLogout}
          onMouseEnter={() => setIsLogoutHovered(true)}
          onMouseLeave={() => setIsLogoutHovered(false)}
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl font-bold transition-all duration-300 active:scale-[0.98] text-xs cursor-pointer shadow-sm hover:shadow-md border border-transparent"
          style={{
            backgroundColor: isLogoutHovered
              ? 'color-mix(in srgb, var(--theme-error) 90%, black)'
              : 'var(--theme-error)',
            color: '#ffffff'
          }}
        >
          <div className="w-5 h-5 flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined transition-all duration-300"
              style={{ fontSize: '18px', color: '#ffffff' }}
            >
              logout
            </span>
          </div>
          <span className="tracking-tight flex-1 text-left font-semibold font-headline text-white">
            Keluar
          </span>
        </button>
      </div>
    </aside>
  );
}