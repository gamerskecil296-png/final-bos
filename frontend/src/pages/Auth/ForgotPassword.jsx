import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Loader2, ArrowLeft, MailCheck, ShieldCheck, KeyRound } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { motion, AnimatePresence } from 'framer-motion';

// Validation Schemas
const step1Schema = z.object({
  identifier: z.string().min(4, 'Email atau NIM minimal 4 karakter'),
});

const step2Schema = z.object({
  otp: z.string().length(6, 'Kode OTP harus 6 digit'),
});

const step3Schema = z.object({
  newPassword: z.string().min(6, 'Sandi minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi sandi minimal 6 karakter'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi sandi tidak cocok",
  path: ["confirmPassword"],
});

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [identifier, setIdentifier] = useState('');
  const [resetToken, setResetToken] = useState('');
  
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Forms
  const form1 = useForm({ resolver: zodResolver(step1Schema) });
  const form2 = useForm({ resolver: zodResolver(step2Schema) });
  const form3 = useForm({ resolver: zodResolver(step3Schema) });

  const onStep1Submit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/forgot-password', {
        identifier: data.identifier,
      });
      setIdentifier(data.identifier);
      setSuccessMsg(res.data.message || 'OTP telah dikirim ke email Anda.');
      setStep(2);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal mengirim OTP. Coba lagi nanti.');
    }
  };

  const onStep2Submit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/verify-otp', {
        identifier,
        otp: data.otp,
      });
      setResetToken(res.data.data.reset_token);
      setSuccessMsg('OTP berhasil diverifikasi. Silakan masukkan kata sandi baru.');
      setStep(3);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'OTP tidak valid atau telah kedaluwarsa.');
    }
  };

  const onStep3Submit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const res = await api.post('/auth/reset-password', {
        reset_token: resetToken,
        new_password: data.newPassword,
        confirm_password: data.confirmPassword,
      });
      setSuccessMsg(res.data.message || 'Kata sandi berhasil diubah.');
      setStep(4);
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Gagal mengubah kata sandi.');
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
          className="w-full max-w-[640px] max-h-full flex flex-col"
        >
          {/* Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 sm:p-8 overflow-y-auto hide-scrollbar">
            <Link to="/login" className="inline-flex items-center text-sm font-bold text-slate-500 hover:text-[var(--theme-primary)] transition-colors mb-6 group">
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Kembali ke Login
            </Link>

            {/* Logo & Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center size-14 rounded-2xl bg-white shadow-md border border-slate-100 p-2 mb-3">
                <img src="/images/bku logo.png" alt="UBK" className="w-full h-full object-contain" />
              </div>
              <h1 className="text-2xl font-extrabold font-headline text-[var(--theme-primary)]">
                {step === 1 && "Lupa Sandi?"}
                {step === 2 && "Verifikasi OTP"}
                {step === 3 && "Kata Sandi Baru"}
                {step === 4 && "Berhasil!"}
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {step === 1 && "Masukkan email atau NIM Anda, dan kami akan mengirimkan OTP untuk mengatur ulang kata sandi."}
                {step === 2 && `Masukkan 6 digit kode OTP yang dikirimkan ke email Anda.`}
                {step === 3 && "Buat kata sandi baru untuk akun Anda."}
                {step === 4 && "Kata sandi Anda telah berhasil diubah. Silakan masuk dengan sandi baru."}
              </p>
            </div>

            {/* Progress Indicators */}
            {step < 4 && (
              <div className="mb-6">
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
                      {step > i ? <ShieldCheck className="size-4" /> : i}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 1 ? 'text-blue-600' : 'text-slate-400'}`}>Email</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 2 ? 'text-blue-600' : 'text-slate-400'}`}>OTP</span>
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${step >= 3 ? 'text-blue-600' : 'text-slate-400'}`}>Sandi</span>
                </div>
              </div>
            )}

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

            {successMsg && step !== 4 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-green-50 border border-green-200 text-green-700 px-4 py-3.5 rounded-2xl mb-6 text-sm flex items-start gap-3"
              >
                <MailCheck className="size-5 shrink-0 mt-0.5" />
                <span className="font-semibold">{successMsg}</span>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={form1.handleSubmit(onStep1Submit)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="identifier">
                      Email atau NIM
                    </label>
                    <input
                      id="identifier"
                      type="text"
                      className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all ${
                        form1.formState.errors.identifier
                          ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/50 focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/5 focus:bg-white'
                      } focus:outline-none`}
                      placeholder="student@ubk.ac.id"
                      {...form1.register('identifier')}
                      disabled={form1.formState.isSubmitting}
                    />
                    {form1.formState.errors.identifier && (
                      <p className="mt-1.5 text-xs font-bold text-red-500">
                        {form1.formState.errors.identifier.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={form1.formState.isSubmitting}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 mt-6 bg-[var(--theme-primary)] hover:bg-[#152F58] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {form1.formState.isSubmitting ? (
                      <><Loader2 className="animate-spin" size={18} /> Memproses...</>
                    ) : (
                      "Kirim OTP"
                    )}
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.form
                  key="step2"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={form2.handleSubmit(onStep2Submit)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="otp">
                      Kode OTP (6 Digit)
                    </label>
                    <input
                      id="otp"
                      type="text"
                      maxLength={6}
                      className={`w-full px-4 py-3 rounded-xl border-2 text-center text-2xl tracking-widest font-bold text-slate-900 placeholder:text-slate-300 transition-all ${
                        form2.formState.errors.otp
                          ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/50 focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/5 focus:bg-white'
                      } focus:outline-none`}
                      placeholder="000000"
                      {...form2.register('otp')}
                      disabled={form2.formState.isSubmitting}
                    />
                    {form2.formState.errors.otp && (
                      <p className="mt-1.5 text-xs font-bold text-red-500 text-center">
                        {form2.formState.errors.otp.message}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      disabled={form2.formState.isSubmitting}
                      className="py-3.5 px-4 rounded-xl font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={form2.formState.isSubmitting}
                      className="flex-1 py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 bg-[var(--theme-primary)] hover:bg-[#152F58] disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {form2.formState.isSubmitting ? (
                        <><Loader2 className="animate-spin" size={18} /> Memproses...</>
                      ) : (
                        "Verifikasi OTP"
                      )}
                    </button>
                  </div>
                </motion.form>
              )}

              {step === 3 && (
                <motion.form
                  key="step3"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={form3.handleSubmit(onStep3Submit)}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="newPassword">
                      Kata Sandi Baru
                    </label>
                    <input
                      id="newPassword"
                      type="password"
                      className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all ${
                        form3.formState.errors.newPassword
                          ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/50 focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/5 focus:bg-white'
                      } focus:outline-none`}
                      placeholder="Minimal 6 karakter"
                      {...form3.register('newPassword')}
                      disabled={form3.formState.isSubmitting}
                    />
                    {form3.formState.errors.newPassword && (
                      <p className="mt-1.5 text-xs font-bold text-red-500">
                        {form3.formState.errors.newPassword.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1.5" htmlFor="confirmPassword">
                      Konfirmasi Kata Sandi Baru
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className={`w-full px-4 py-2.5 rounded-xl border-2 text-sm font-semibold text-slate-900 placeholder:text-slate-400 transition-all ${
                        form3.formState.errors.confirmPassword
                          ? 'border-red-300 bg-red-50/30 focus:border-red-400 focus:ring-4 focus:ring-red-100'
                          : 'border-slate-200 bg-slate-50/70 hover:bg-slate-100/50 focus:border-[var(--theme-primary)] focus:ring-4 focus:ring-[var(--theme-primary)]/5 focus:bg-white'
                      } focus:outline-none`}
                      placeholder="Ulangi sandi baru"
                      {...form3.register('confirmPassword')}
                      disabled={form3.formState.isSubmitting}
                    />
                    {form3.formState.errors.confirmPassword && (
                      <p className="mt-1.5 text-xs font-bold text-red-500">
                        {form3.formState.errors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={form3.formState.isSubmitting}
                    className="w-full py-3.5 rounded-xl font-bold text-white text-sm flex items-center justify-center gap-2 mt-6 bg-[var(--theme-primary)] hover:bg-[#152F58] disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {form3.formState.isSubmitting ? (
                      <><Loader2 className="animate-spin" size={18} /> Memproses...</>
                    ) : (
                      "Simpan Sandi Baru"
                    )}
                  </button>
                </motion.form>
              )}

              {step === 4 && (
                <motion.div
                  key="step4"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <KeyRound className="size-10 text-emerald-500" />
                  </div>
                  <button
                    onClick={() => navigate('/login')}
                    className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl flex items-center justify-center transition-all shadow-md shadow-emerald-500/20"
                  >
                    Kembali ke Login
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-slate-400 font-medium">
              &copy; {new Date().getFullYear()} Universitas Bhakti Kencana
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
