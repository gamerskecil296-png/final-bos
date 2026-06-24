import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import PortalSidebar from './PortalSidebar';
import PortalTopbar from './PortalTopbar';
import { usePermission } from '@/hooks/usePermission';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';


export default function PortalShell({ config }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const location = useLocation();
  const { hasPermission, isSuperAdmin } = usePermission();
  const updateUser = useAuthStore(state => state.updateUser);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);

  useEffect(() => {
    if (isAuthenticated) {
      api.get('/auth/me')
        .then(res => {
          if (res.data?.status === 'success' && res.data?.data?.user) {
            updateUser(res.data.data.user);
          }
        })
        .catch(err => {
          console.error("Gagal memperbarui data user & permissions:", err);
        });
    }
  }, [isAuthenticated, updateUser, location.pathname]); // Run on mount and when navigating to ensure permissions are up to date

  if (!config) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <p>PortalShell: No config provided</p>
      </div>
    );
  }

  // Find if current path is a menu item and requires a permission
  const currentPath = location.pathname;
  const allItems = (config.menu || []).flatMap(g => g.items || []);
  const currentItem = allItems.find(item => item.path === currentPath);

  const isAccessDenied = currentItem?.permission && !isSuperAdmin && !hasPermission(currentItem.permission);




  return (
    <div
      className="flex h-screen w-screen font-inter overflow-hidden"
      style={{ backgroundColor: 'var(--theme-bg)' }}
    >
      {/* ─── Desktop Sidebar ─── */}
      <div className="hidden lg:flex h-full shrink-0">
        <PortalSidebar config={config} />
      </div>

      {/* ─── Mobile Sidebar (overlay) ─── */}
      {mobileSidebarOpen && (
        <>
          <button
            onClick={() => setMobileSidebarOpen(false)}
            className="lg:hidden fixed inset-0 z-40 backdrop-blur-sm animate-in fade-in duration-300"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            aria-label="Tutup menu"
          />
          <div className="lg:hidden fixed left-0 top-0 bottom-0 z-50">
            <PortalSidebar
              config={config}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </div>
        </>
      )}

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-full">
        <PortalTopbar
          config={config}
          onMenuClick={() => setMobileSidebarOpen(true)}
        />

        {/* Main Content or Access Denied Popup */}
        <div className="flex-1 overflow-y-auto p-3 md:p-5 lg:p-6 space-y-4 relative" style={{ backgroundColor: 'var(--theme-bg)' }}>
          {isAccessDenied ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 z-10 backdrop-blur-sm bg-white/30 dark:bg-black/20">
              <div className="bg-white dark:bg-slate-900 border border-red-100 dark:border-red-900 shadow-2xl rounded-3xl p-8 max-w-sm w-full text-center animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-red-50 dark:bg-red-900/30 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                  <span className="material-symbols-outlined text-4xl">lock</span>
                </div>
                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-2 tracking-tight">Akses Ditolak</h2>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                  Ups! Anda tidak memiliki izin untuk membuka fitur <span className="text-slate-700 dark:text-slate-300 font-bold">"{currentItem?.name}"</span>. Hubungi Super Admin jika ini adalah kesalahan.
                </p>
                <button
                  onClick={() => window.history.back()}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                >
                  Kembali ke Halaman Sebelumnya
                </button>
              </div>
            </div>
          ) : (
            <Outlet />
          )}
        </div>
      </div>
    </div>
  );
}