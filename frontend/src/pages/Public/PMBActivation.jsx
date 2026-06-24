import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import api from '../../lib/axios';
import { getPublicLandingSettings } from '../../services/api';
import Error404 from '../Error/Error404';

// Icons
const PersonIcon = () => <span className="material-symbols-outlined">person</span>;
const BadgeIcon = () => <span className="material-symbols-outlined">badge</span>;
const LockIcon = () => <span className="material-symbols-outlined">lock</span>;
const VerifiedIcon = () => <span className="material-symbols-outlined">verified</span>;
const ArrowRightIcon = () => <span className="material-symbols-outlined">arrow_forward</span>;

export default function PMBActivation() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isPmbOpen, setIsPmbOpen] = useState(null);

  React.useEffect(() => {
    getPublicLandingSettings()
      .then(res => {
        if (res?.data) {
          setIsPmbOpen(res.data?.is_pmb_open ?? true);
        } else {
          setIsPmbOpen(true);
        }
      })
      .catch(() => setIsPmbOpen(true));
  }, []);

  // Form State
  const [nomorDaftar, setNomorDaftar] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [detectedEmail, setDetectedEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!nomorDaftar || !namaLengkap) {
      toast.error('Mohon lengkapi Nomor Daftar dan Nama Lengkap');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/pmb/verify', {
        nomor_daftar: nomorDaftar,
        nama_lengkap: namaLengkap
      });
      
      if (res.data.status === 'success') {
        setDetectedEmail(res.data.data.email);
        setMaskedEmail(res.data.data.masked_email);
        // Also update namaLengkap from db just in case they typed in lowercase
        setNamaLengkap(res.data.data.nama_lengkap);
        setStep(2);
        toast.success('Data ditemukan!');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Data tidak ditemukan atau terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleActivate = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Konfirmasi password tidak cocok');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/pmb/set-password', {
        nomor_daftar: nomorDaftar,
        email: detectedEmail,
        password: password
      });

      if (res.data.status === 'success') {
        setStep(3);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengaktifkan akun');
    } finally {
      setLoading(false);
    }
  };

  if (isPmbOpen === false) {
    return <Error404 />;
  }

  return (
    <div className="h-screen flex relative overflow-hidden bg-[var(--theme-primary)]">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img
          src="/images/unnamed.webp"
          alt="Kampus UBK"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[var(--theme-primary)]/70" />
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-1/4 -right-32 w-[500px] h-[500px] bg-[var(--theme-secondary)]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[400px] h-[400px] bg-white/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[500px] max-h-full flex flex-col"
        >
          {/* Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-5 sm:p-6 overflow-y-auto hide-scrollbar">
            {/* Logo & Title */}
            <div className="text-center mb-4">
              <div className="inline-flex items-center justify-center size-12 rounded-2xl bg-white shadow-md border border-slate-100 p-2 mb-2">
                <img src="/images/bku logo.png" alt="UBK" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold font-headline text-[var(--theme-primary)]">
                Aktivasi Akun PKKMB
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                Buat password untuk portal akademik Anda menggunakan data pendaftaran ulang SEVIMA.
              </p>
            </div>
          
          {isPmbOpen === null ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-500 font-medium">Memeriksa status pendaftaran...</p>
            </div>
          ) : (
            <>
          {/* Progress Bar */}
          <div className="mb-5">
            <div className="flex items-center justify-between relative">
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-blue-600"
                  initial={{ width: '0%' }}
                  animate={{ width: step === 1 ? '33%' : step === 2 ? '66%' : '100%' }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              
              {[1, 2, 3].map((i) => (
                <div 
                  key={i} 
                  className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${
                    step >= i ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'bg-white text-slate-400 border-2 border-slate-200'
                  }`}
                >
                  {step > i ? <VerifiedIcon /> : i}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 px-1">
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>Verifikasi</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>Password</span>
              <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>Selesai</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.form
                key="step1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleVerify}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Nomor Pendaftaran (SEVIMA)
                  </label>
                  <Input
                    icon={BadgeIcon}
                    type="text"
                    placeholder="Contoh: PKKMB2026-1029"
                    value={nomorDaftar}
                    onChange={(e) => setNomorDaftar(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Nama Lengkap (Sesuai Ijazah)
                  </label>
                  <Input
                    icon={PersonIcon}
                    type="text"
                    placeholder="Masukkan nama lengkap Anda"
                    value={namaLengkap}
                    onChange={(e) => setNamaLengkap(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin">sync</span>
                  ) : (
                    <>
                      Verifikasi Data
                      <ArrowRightIcon />
                    </>
                  )}
                </Button>
              </motion.form>
            )}

            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                onSubmit={handleActivate}
                className="space-y-4"
              >
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-600 font-bold uppercase tracking-wider mb-1">Halo, {namaLengkap}!</p>
                  <p className="text-sm text-blue-900 font-medium">Email yang terdaftar pada sistem adalah:</p>
                  <div className="mt-2 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm">
                    <span className="material-symbols-outlined text-blue-500 text-[18px]">mail</span>
                    <span className="font-bold text-slate-700">{maskedEmail}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Buat Password Baru
                  </label>
                  <Input
                    icon={LockIcon}
                    type="password"
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1">
                    Konfirmasi Password
                  </label>
                  <Input
                    icon={LockIcon}
                    type="password"
                    placeholder="Ulangi password baru Anda"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="h-12"
                  />
                </div>

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="h-12 px-4 rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    <span className="material-symbols-outlined">arrow_back</span>
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
                  >
                    {loading ? (
                      <span className="material-symbols-outlined animate-spin">sync</span>
                    ) : (
                      <>
                        <VerifiedIcon />
                        Aktifkan Akun
                      </>
                    )}
                  </Button>
                </div>
              </motion.form>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6"
              >
                <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-emerald-500 text-4xl">check_circle</span>
                </div>
                <h3 className="text-xl font-black text-slate-800 font-headline mb-2">Akun Berhasil Diaktifkan!</h3>
                <p className="text-sm text-slate-500 mb-8 max-w-[250px] mx-auto">
                  Anda sekarang dapat login ke Portal SIAKAD menggunakan email <strong>{detectedEmail}</strong> dan password yang baru dibuat.
                </p>
                <Button
                  onClick={() => navigate('/login')}
                  className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-emerald-500/20"
                >
                  Masuk ke Portal
                  <ArrowRightIcon />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          </>
          )}

            <div className="mt-4 text-center border-t border-slate-100 pt-4">
              <Link
                to="/login"
                className="text-xs text-slate-400 hover:text-[var(--theme-primary)] transition-colors font-medium"
              >
                &larr; Kembali ke halaman Login
              </Link>
            </div>
            <p className="mt-4 text-center text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} Universitas Bhakti Kencana
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
