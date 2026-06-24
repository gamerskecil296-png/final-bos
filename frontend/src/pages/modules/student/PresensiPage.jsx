import React, { useState, useEffect } from 'react';
import { PageContent } from '@/components/ui/page';
import { useSearchParams, NavLink, useNavigate } from 'react-router-dom';
import { fetchWithAuth, API_BASE_URL } from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { toast, Toaster } from 'react-hot-toast';

export default function PresensiPage() {
  const [searchParams] = useSearchParams();
  const eventId = searchParams.get('eventId');
  const navigate = useNavigate();
  
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [errorMessage, setErrorMessage] = useState('');
  const [eventData, setEventData] = useState(null);
  
  const user = useAuthStore((s) => s.user);
  const student = useAuthStore((s) => s.mahasiswa);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('Silakan login terlebih dahulu untuk melakukan presensi');
      // Redirect to login but save the current path to redirect back after login
      setTimeout(() => {
        navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      }, 2000);
      return;
    }

    if (!eventId) {
      setStatus('error');
      setErrorMessage('ID Kegiatan tidak valid atau tidak ditemukan.');
      return;
    }

    const processPresensi = async () => {
      try {
        // 1. Fetch event details first (we can use GetAttendance list to find it, or hit general event endpoint if exists)
        // For security and simplicity, we directly submit the attendance to backend
        const response = await fetchWithAuth(`${API_BASE_URL}/ormawa/attendance`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            KegiatanID: Number(eventId),
            MahasiswaID: student?.id || student?.ID || user?.id,
            Status: 'hadir'
          })
        });

        if (response.status === 'success' || response.KegiatanID) {
          setStatus('success');
          // Try to fetch event name or set default
          setEventData({
            Judul: 'Presensi Terkonfirmasi',
            Waktu: new Date().toLocaleDateString('id-ID', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
          });
          toast.success('Presensi berhasil dicatat!');
        } else {
          setStatus('error');
          setErrorMessage(response.message || 'Gagal merekam presensi. Pastikan Anda anggota aktif organisasi ini.');
        }
      } catch (err) {
        setStatus('error');
        setErrorMessage('Gagal menghubungi server. Silakan coba beberapa saat lagi.');
      }
    };

    processPresensi();
  }, [eventId, isAuthenticated, student, user, navigate]);

  return (
    <PageContent className="font-body flex items-center justify-center min-h-[70vh]">
      <Toaster position="top-center" />
      
      {/* Dynamic scan laser pulse keyframes */}
      <style>{`
        @keyframes pulse-radar {
          0% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .animate-radar {
          animation: pulse-radar 2s infinite ease-out;
        }
      `}</style>

      <Card className="w-full max-w-md border-none shadow-2xl rounded-[2.5rem] bg-surface overflow-hidden">
        <CardContent className="p-8 flex flex-col items-center text-center gap-6 relative">
          
          {/* Header branding */}
          <div className="space-y-1">
            <span className="text-[9px] font-black text-[var(--theme-primary)] tracking-[0.25em] uppercase font-headline">PRESENSI DIGITAL</span>
            <h2 className="text-2xl font-black text-[var(--theme-text)] font-headline tracking-tighter leading-none">BKU Student Hub</h2>
          </div>

          {/* LOADING STATE */}
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-6 my-6">
              <div className="relative w-24 h-24 flex items-center justify-center">
                {/* Pulsing radar circles */}
                <div className="absolute inset-0 rounded-full bg-[var(--theme-primary)]/10 animate-radar" />
                <div className="absolute inset-2 rounded-full bg-[var(--theme-primary)]/20 animate-radar" style={{ animationDelay: '0.6s' }} />
                <div className="w-16 h-16 rounded-full bg-[var(--theme-primary)] flex items-center justify-center text-white relative z-10 shadow-lg shadow-[var(--theme-primary)]/30">
                  <span className="material-symbols-outlined text-3xl animate-spin">sync</span>
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="font-black text-[var(--theme-text)] text-sm uppercase tracking-wider">Memproses Presensi...</p>
                <p className="text-xs text-[var(--theme-text-muted)] font-medium">Sistem sedang memverifikasi identitas dan koordinasi kegiatan Anda.</p>
              </div>
            </div>
          )}

          {/* SUCCESS STATE */}
          {status === 'success' && (
            <div className="flex flex-col items-center gap-6 my-4 w-full">
              <div className="w-20 h-20 rounded-full bg-[var(--theme-success)] flex items-center justify-center text-white shadow-xl shadow-[var(--theme-success)]/20 animate-bounce">
                <span className="material-symbols-outlined text-4xl font-bold">check</span>
              </div>
              
              <div className="space-y-2 w-full">
                <h3 className="font-black text-[var(--theme-success)] text-lg uppercase tracking-wider font-headline">Presensi Berhasil!</h3>
                <div className="p-4 bg-[var(--theme-success-light)]/30 border border-[var(--theme-success-light)] rounded-2xl text-left space-y-1.5">
                  <p className="text-[10px] font-black text-[var(--theme-success)] tracking-wider uppercase leading-none">Data Terdaftar</p>
                  <p className="text-sm font-black text-[var(--theme-text)] font-headline truncate leading-tight">{student?.Nama || user?.Nama || 'Mahasiswa BKU'}</p>
                  <p className="text-xs font-bold text-[var(--theme-text-muted)] leading-none">NIM: {student?.NIM || '-'}</p>
                  <p className="text-xs font-bold text-[var(--theme-text-subtle)] leading-none mt-1">Presensi direkam pada: {new Date().toLocaleTimeString('id-ID')}</p>
                </div>
              </div>
            </div>
          )}

          {/* ERROR STATE */}
          {status === 'error' && (
            <div className="flex flex-col items-center gap-6 my-4 w-full">
              <div className="w-20 h-20 rounded-full bg-[var(--theme-error)] flex items-center justify-center text-white shadow-xl shadow-[var(--theme-error)]/20">
                <span className="material-symbols-outlined text-4xl">error_outline</span>
              </div>
              
              <div className="space-y-2 w-full">
                <h3 className="font-black text-[var(--theme-error)] text-lg uppercase tracking-wider font-headline">Presensi Gagal</h3>
                <p className="text-xs text-[var(--theme-text-muted)] font-semibold leading-relaxed px-2">
                  {errorMessage}
                </p>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="w-full pt-4 border-t border-[var(--theme-border-muted)] flex flex-col gap-3">
            <NavLink to="/student/dashboard" className="w-full">
              <Button className="w-full h-12 rounded-2xl bg-[var(--theme-primary)] hover:opacity-90 text-white font-black text-xs tracking-wider uppercase shadow-lg">
                Kembali ke Dashboard
              </Button>
            </NavLink>
          </div>

        </CardContent>
      </Card>
    </PageContent>
  );
}
