import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';
import RoleSelector from './RoleSelector';

const loginSchema = z.object({
  identifier: z
    .string()
    .min(4, 'Email atau NIM minimal 4 karakter'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
});

const getRoleFromToken = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return '';
    const decoded = JSON.parse(atob(payload));
    return String(decoded?.role || '').toLowerCase();
  } catch {
    return '';
  }
};

import { getRouteByRole } from '../../utils/roleRoutes';

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [roleSelectionData, setRoleSelectionData] = useState(null);
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [maintenanceMsg, setMaintenanceMsg] = useState('');
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  useEffect(() => {
    const fetchMaintenance = async () => {
      try {
        const response = await api.get('/public/maintenance');
        if (response.data?.success && response.data?.maintenance_mode) {
          setIsMaintenance(true);
          setMaintenanceMsg(response.data?.maintenance_message || 'Sistem sedang dalam perbaikan. Hanya Super Admin yang dapat masuk.');
        }
      } catch (error) {
        console.error('Failed to fetch maintenance status', error);
      }
    };
    fetchMaintenance();
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    try {
      const response = await api.post('/auth/login', {
        identifier: data.identifier,
        password: data.password,
      });
      if (response.data.success || response.data.status === 'success') {
        const payload = response.data.data || {};

        if (payload.requires_role_selection) {
          setRoleSelectionData({
            tempToken: payload.temp_token,
            roles: payload.roles,
            user: payload.user,
          });
          return;
        }

        const token = payload.access_token || payload.token;
        if (!token) {
          setErrorMsg('Token login tidak ditemukan dari server.');
          return;
        }

        const roleFromResponse = payload?.user?.role;
        const role = roleFromResponse || getRoleFromToken(token);
        const userPermissions = payload?.user?.permissions || payload?.user?.Permissions || [];

        setAuth(token, payload.user, payload.mahasiswa);
        navigate(getRouteByRole(role, userPermissions), { replace: true });
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Terjadi kesalahan pada server. Coba lagi nanti.');
      }
    }
  };

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

      <div className="relative w-full flex items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-[640px]"
        >
          {/* Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8">
            {roleSelectionData ? (
              <RoleSelector
                data={roleSelectionData}
                onBack={() => { setRoleSelectionData(null); setErrorMsg(''); }}
                onError={(msg) => { setErrorMsg(msg); setRoleSelectionData(null); }}
              />
            ) : (
              <>
                {/* Logo & Title */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-white shadow-md border border-slate-100 p-2 mb-3">
                    <img src="/images/bku logo.png" alt="UBK" className="w-full h-full object-contain" />
                  </div>
                  <h1 className="text-2xl font-extrabold font-headline text-[var(--theme-primary)]">
                    Selamat Datang
                  </h1>
                  <p className="text-sm text-slate-500 mt-1">
                    Masuk ke portal mahasiswa Universitas Bhakti Kencana
                  </p>
                </div>

                {/* Error Message */}
                {errorMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-red-50 border border-red-100 text-red-600 px-4 py-3.5 rounded-2xl mb-6 text-sm flex items-start gap-3"
                  >
                    <svg className="size-5 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-semibold">{errorMsg}</span>
                  </motion.div>
                )}

                {/* Maintenance Banner */}
                {isMaintenance && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-orange-50 border border-orange-200 text-orange-700 px-4 py-3.5 rounded-2xl mb-6 text-sm flex items-start gap-3"
                  >
                    <svg className="size-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <div className="flex flex-col">
                      <span className="font-bold">Mode Pemeliharaan Aktif</span>
                      <span className="opacity-90 mt-0.5">{maintenanceMsg}</span>
                    </div>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Identifier */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="identifier">
                      Email atau NIM
                    </label>
                    <input
                      id="identifier"
                      type="text"
                      className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all ${
                        errors.identifier
                          ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/50 focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/5 focus:bg-white'
                      } focus:outline-none`}
                      placeholder="student@ubk.ac.id"
                      {...register('identifier')}
                      disabled={isSubmitting}
                    />
                    {errors.identifier && (
                      <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.identifier.message}
                      </p>
                    )}
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-sm font-bold text-slate-700" htmlFor="password">
                        Password
                      </label>
                      <Link
                        to="/forgot-password"
                        className="text-xs font-bold text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] hover:underline transition-colors"
                      >
                        Lupa sandi?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all pr-12 ${
                          errors.password
                            ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                            : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/50 focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/5 focus:bg-white'
                        } focus:outline-none`}
                        placeholder="Masukkan password"
                        {...register('password')}
                        disabled={isSubmitting}
                      />
                      <button
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex="-1"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="mt-1.5 text-xs font-bold text-red-500 flex items-center gap-1">
                        <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Remember Me */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="remember"
                      className="size-4 rounded-md border-2 border-slate-300 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] focus:ring-offset-1 transition-all"
                    />
                    <label htmlFor="remember" className="text-sm font-medium text-slate-600 select-none cursor-pointer">
                      Ingat saya
                    </label>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center justify-center gap-2 bg-[var(--theme-primary)] hover:bg-[#152F58]"
                    style={{
                      boxShadow: isSubmitting ? 'none' : '0 4px 16px rgba(27, 58, 107, 0.3)',
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Memproses...
                      </>
                    ) : (
                      <>
                        Masuk ke Portal
                        <ChevronRight className="size-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Back to Home */}
                <div className="mt-6 pt-5 border-t border-slate-100 text-center">
                  <Link
                    to="/"
                    className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
                  >
                    &larr; Kembali ke Beranda
                  </Link>
                </div>

                {/* Footer */}
                <p className="mt-5 text-center text-xs text-slate-400 font-medium">
                  &copy; {new Date().getFullYear()} Universitas Bhakti Kencana
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
