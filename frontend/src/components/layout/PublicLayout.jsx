import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import PublicNavbar from './PublicNavbar';
import PublicFooter from './PublicFooter';

export default function PublicLayout() {
  const { pathname } = useLocation();

  // Scroll to top automatically when navigating between public pages
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div
      className="min-h-screen flex flex-col antialiased font-inter"
      style={{
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text)'
      }}
    >
      {/* Premium Header/Navbar */}
      <PublicNavbar />
      
      {/* Main Content Area */}
      <main className="flex-grow pt-20">
        <Outlet />
      </main>

      {/* Premium Footer */}
      <PublicFooter />
    </div>
  );
}
