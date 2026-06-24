import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import api from '../../lib/axios';

const changePasswordSchema = z.object({
  old_password: z.string().min(1, 'Password lama harus diisi'),
  new_password: z
    .string()
    .min(8, 'Password baru minimal 8 karakter')
    .regex(/[A-Za-z]/, 'Harus mengandung huruf')
    .regex(/[0-9]/, 'Harus mengandung angka'),
  confirm_password: z.string().min(1, 'Konfirmasi password harus diisi'),
}).refine((data) => data.new_password !== data.old_password, {
  message: "Password baru tidak boleh sama dengan password lama",
  path: ["new_password"],
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirm_password"],
});

export default function ChangePassword() {
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const [status, setStatus] = useState({ type: '', message: '' });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = async (data) => {
    setStatus({ type: '', message: '' });
    try {
      const response = await api.put('/auth/change-password', {
        old_password: data.old_password,
        new_password: data.new_password
      });
      
      if (response.data.success) {
        setStatus({ type: 'success', message: 'Password berhasil diperbarui!' });
        reset();
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setStatus({ type: 'error', message: error.response.data.message });
      } else {
        setStatus({ type: 'error', message: 'Terjadi kesalahan. Silakan coba lagi.' });
      }
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-white rounded-xl shadow-sm border border-neutral-200 overflow-hidden">
      <div className="p-6 border-b border-neutral-100 flex items-center gap-3">
        <div className="bg-orange-100 p-2 rounded-lg text-orange-600">
          <ShieldCheck size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold font-jakarta" style={{ color: 'var(--theme-h2)' }}>Ganti Password</h2>
          <p className="text-sm text-neutral-500">Perbarui password akun portal Anda</p>
        </div>
      </div>
      
      <div className="p-6">
        {status.message && (
          <div className={`mb-6 p-4 rounded-lg text-sm flex font-medium ${status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {status.message}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Old Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1.5" htmlFor="old_password">
              Password Lama
            </label>
            <div className="relative">
              <input
                id="old_password"
                type={showOld ? 'text' : 'password'}
                className={`w-full px-4 py-2 rounded-lg border ${errors.old_password ? 'border-red-500 focus:ring-red-500' : 'border-neutral-200 focus:border-orange-500 focus:ring-orange-500'} focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all`}
                {...register('old_password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                onClick={() => setShowOld(!showOld)}
              >
                {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.old_password && <p className="mt-1 text-sm text-red-600">{errors.old_password.message}</p>}
          </div>

          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1.5" htmlFor="new_password">
              Password Baru
            </label>
            <div className="relative">
              <input
                id="new_password"
                type={showNew ? 'text' : 'password'}
                className={`w-full px-4 py-2 rounded-lg border ${errors.new_password ? 'border-red-500 focus:ring-red-500' : 'border-neutral-200 focus:border-orange-500 focus:ring-orange-500'} focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all`}
                {...register('new_password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                onClick={() => setShowNew(!showNew)}
              >
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.new_password && <p className="mt-1 text-sm text-red-600">{errors.new_password.message}</p>}
            <p className="text-xs text-neutral-500 mt-1.5">Min. 8 karakter, kombinasi huruf dan angka.</p>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-neutral-900 mb-1.5" htmlFor="confirm_password">
              Konfirmasi Password Baru
            </label>
            <div className="relative">
              <input
                id="confirm_password"
                type={showConfirm ? 'text' : 'password'}
                className={`w-full px-4 py-2 rounded-lg border ${errors.confirm_password ? 'border-red-500 focus:ring-red-500' : 'border-neutral-200 focus:border-orange-500 focus:ring-orange-500'} focus:outline-none focus:ring-2 focus:ring-opacity-20 transition-all`}
                {...register('confirm_password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirm_password && <p className="mt-1 text-sm text-red-600">{errors.confirm_password.message}</p>}
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={18} />
                  Menyimpan...
                </>
              ) : (
                'Simpan Password'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
