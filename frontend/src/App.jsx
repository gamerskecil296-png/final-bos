import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// Auth
import Login from './pages/Auth/Login'
import ChangePassword from './pages/Auth/ChangePassword'
import ForgotPassword from './pages/Auth/ForgotPassword'
import UpdateEmail from './pages/Auth/UpdateEmail'
import PMBActivation from './pages/Public/PMBActivation'

// Shared
import ScrollToTop from './components/ScrollToTop'
import ErrorBoundary from './components/ErrorBoundary'
import ThemeProvider from './components/ThemeProvider'
import Error404 from './pages/Error/Error404'
import Error403 from './pages/Error/Error403'
import Error500 from './pages/Error/Error500'
import OfflinePage from './pages/Error/OfflinePage'
import Maintenance from './pages/Error/Maintenance'
import { Loader2 } from 'lucide-react'
import ProtectedRoute from './components/ProtectedRoute'
import useAuthStore from './store/useAuthStore'

// Module-based architecture
import DynamicLayout from './layouts/DynamicLayout'
import AppRoutes from './router/AppRoutes'

// Landing Pages
import { LandingLayout, Beranda, Tentang, ProgramStudi, Berita, BeritaDetail, Kontak, KebijakanPrivasi, SyaratKetentuan } from './pages/Landing'

import './index.css'

function App() {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    const checkHydration = () => {
      useAuthStore.getState();
      setIsHydrated(true);
    };
    checkHydration();
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOffline) return <OfflinePage />;
  if (!isHydrated) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary size-10" /></div>;

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <Router>
          <ScrollToTop />
          <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-primary size-10" /></div>}>
            <Routes>

              {/* Landing Pages */}
              <Route path="/" element={<LandingLayout />}>
                <Route index element={<Beranda />} />
                <Route path="tentang" element={<Tentang />} />
                <Route path="program-studi" element={<ProgramStudi />} />
                <Route path="berita" element={<Berita />} />
                <Route path="berita/:id" element={<BeritaDetail />} />
                <Route path="kontak" element={<Kontak />} />
                <Route path="kebijakan-privasi" element={<KebijakanPrivasi />} />
                <Route path="syarat-ketentuan" element={<SyaratKetentuan />} />
              </Route>

              {/* Auth */}
              <Route path="/login" element={<Login />} />
              <Route path="/daftar-pkkmb" element={<PMBActivation />} />
              <Route path="/aktivasi-pmb" element={<PMBActivation />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/change-password" element={<ChangePassword />} />

              {/* Error Pages */}
              <Route path="/404" element={<Error404 />} />
              <Route path="/403" element={<Error403 />} />
              <Route path="/500" element={<Error500 />} />
              <Route path="/maintenance" element={<Maintenance />} />

              {/* ============================================ */}
              {/* MODULE-BASED ROUTES — Single entry point     */}
              {/* Permission-driven layout & sidebar           */}
              {/* ============================================ */}
              <Route path="/app/*" element={<ProtectedRoute requiredPermissions={[]}><DynamicLayout /></ProtectedRoute>}>
                {AppRoutes()}
              </Route>

              {/* Legacy redirects → new paths */}
              <Route path="/admin" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/admin/*" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/faculty" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/faculty/*" element={<Navigate to="/app/dashboard" replace />} />
              <Route path="/ormawa" element={<Navigate to="/app/ormawa/dashboard" replace />} />
              <Route path="/ormawa/*" element={<Navigate to="/app/ormawa/dashboard" replace />} />
              <Route path="/psychologist" element={<Navigate to="/app/psikologi/dashboard" replace />} />
              <Route path="/psychologist/*" element={<Navigate to="/app/psikologi/dashboard" replace />} />
              <Route path="/tenagakes" element={<Navigate to="/app/kesehatan/dashboard" replace />} />
              <Route path="/tenagakes/*" element={<Navigate to="/app/kesehatan/dashboard" replace />} />
              <Route path="/kencana-admin" element={<Navigate to="/app/kencana/dashboard" replace />} />
              <Route path="/kencana-admin/*" element={<Navigate to="/app/kencana/dashboard" replace />} />
              <Route path="/kencana-fakult" element={<Navigate to="/app/kencana/dashboard" replace />} />
              <Route path="/kencana-fakult/*" element={<Navigate to="/app/kencana/dashboard" replace />} />
              <Route path="/kencana-fakultas" element={<Navigate to="/app/kencana/dashboard" replace />} />
              <Route path="/kencana-fakultas/*" element={<Navigate to="/app/kencana/dashboard" replace />} />
              <Route path="/kencana-mentor" element={<Navigate to="/app/kencana/mentor" replace />} />
              <Route path="/kencana-mentor/*" element={<Navigate to="/app/kencana/mentor" replace />} />
              <Route path="/student" element={<Navigate to="/app/student/dashboard" replace />} />
              <Route path="/student/*" element={<Navigate to="/app/student/dashboard" replace />} />
              <Route path="/dashboard" element={<Navigate to="/app/dashboard" replace />} />

              {/* 404 fallback */}
              <Route path="*" element={<Error404 />} />
            </Routes>
          </React.Suspense>
        </Router>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
