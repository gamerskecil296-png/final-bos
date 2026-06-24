import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, Mail } from 'lucide-react';
import api from '../../lib/axios';

const updateEmailSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  confirmEmail: z.string().email('Format konfirmasi email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi untuk konfirmasi'),
}).refine((data) => data.email === data.confirmEmail, {
  message: 'Email dan konfirmasi email tidak cocok',
  path: ['confirmEmail'],
});

export default function UpdateEmail() {
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(updateEmailSchema),
  });

  const onSubmit = async (data) => {
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    try {
      const response = await api.put('/auth/update-email', {
        email: data.email,
        confirm_email: data.confirmEmail,
        password: data.password,
      });

      if (response.data.success) {
        setSuccessMsg('Email berhasil diperbarui!');
        reset();
        // Update stored user data
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        userData.email = data.email;
        localStorage.setItem('user', JSON.stringify(userData));
      }
    } catch (error) {
      if (error.response?.data?.message) {
        setErrorMsg(error.response.data.message);
      } else {
        setErrorMsg('Terjadi kesalahan. Coba lagi nanti.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <Mail className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Ubah Email</h2>
            <p className="text-sm text-gray-500">Perbarui email akun Anda</p>
          </div>
        </div>

        {/* Success Message */}
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-green-800 font-medium">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {errorMsg && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-red-800 font-medium">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* New Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Baru
            </label>
            <input
              type="email"
              {...register('email')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="email@universitas.edu"
              disabled={isLoading}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          {/* Confirm Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konfirmasi Email Baru
            </label>
            <input
              type="email"
              {...register('confirmEmail')}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${
                errors.confirmEmail ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ulangi email baru"
              disabled={isLoading}
            />
            {errors.confirmEmail && (
              <p className="mt-1 text-sm text-red-600">{errors.confirmEmail.message}</p>
            )}
          </div>

          {/* Password Confirmation */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password (untuk konfirmasi)
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Masukkan password Anda"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              'Simpan Email Baru'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
