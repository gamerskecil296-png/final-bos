import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';


import { cn } from '@/lib/utils';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/Table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/AlertDialog';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Smartphone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>smartphone</span>;
const LogOut = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>logout</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Monitor = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>desktop_windows</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const KeyRound = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>vpn_key</span>;
const History = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>history</span>;

const Mail = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>mail</span>;


const FIELD_CLASS = 'w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)] focus:ring-4 focus:ring-[var(--theme-primary-light)] placeholder-[var(--theme-text-subtle)]';

const Label = ({ children, icon: Icon, ...props }) => (
  <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]" {...props}>
    {Icon && <Icon size={13} className="text-[var(--theme-text-subtle)]" />}
    {children}
  </span>
);

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} className={cn(FIELD_CLASS, className)} ref={ref} {...props} />
));

const passwordSchema = z.object({
  old_password: z.string().min(1, 'Password saat ini wajib diisi'),
  new_password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Harus mengandung huruf besar')
    .regex(/[a-z]/, 'Harus mengandung huruf kecil')
    .regex(/[0-9]/, 'Harus mengandung angka'),
  confirm_password: z.string(),
}).refine((data) => data.new_password === data.confirm_password, {
  message: "Konfirmasi password tidak cocok",
  path: ["confirm_password"],
});

const emailSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  confirm_email: z.string().email('Format konfirmasi email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi untuk konfirmasi'),
}).refine((data) => data.email === data.confirm_email, {
  message: "Email dan konfirmasi tidak cocok",
  path: ["confirm_email"],
});

export default function KeamananTab() {
  const queryClient = useQueryClient();
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showEmailPass, setShowEmailPass] = useState(false);

  // Dialog States
  const [confirmPasswordOpen, setConfirmPasswordOpen] = useState(false);
  const [pendingPasswordData, setPendingPasswordData] = useState(null);
  
  const [confirmEmailOpen, setConfirmEmailOpen] = useState(false);
  const [pendingEmailData, setPendingEmailData] = useState(null);

  const { register, handleSubmit, reset, watch, formState: { errors: passwordErrors } } = useForm({
    resolver: zodResolver(passwordSchema)
  });

  const { register: registerEmail, handleSubmit: handleEmailSubmit, reset: resetEmail, watch: watchEmail, formState: { errors: emailErrors } } = useForm({
    resolver: zodResolver(emailSchema)
  });

  const newPassword = watch('new_password', '');
  const newEmail = watch('email', '');

  const { data: sessions } = useQuery({
    queryKey: ['profil', 'sesi-aktif'],
    queryFn: async () => {
      const { data } = await api.get('/profil/sesi-aktif');
      return data.data;
    }
  });

  const { data: history } = useQuery({
    queryKey: ['profil', 'riwayat-login'],
    queryFn: async () => {
      const { data } = await api.get('/profil/riwayat-login');
      return data.data;
    }
  });

  const passwordMutation = useMutation({
    mutationFn: async (data) => {
      const { data: res } = await api.put('/profil/change-password', data);
      return res;
    },
    onSuccess: () => {
      reset();
      toast.success('Password berhasil diubah');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Gagal mengubah password');
    }
  });

  const emailMutation = useMutation({
    mutationFn: async (data) => {
      const { data: res } = await api.put('/auth/update-email', {
        email: data.email,
        confirm_email: data.confirm_email,
        password: data.password,
      });
      return res;
    },
    onSuccess: () => {
      resetEmail();
      toast.success('Email berhasil diperbarui');
      // Update stored user data
      const userData = JSON.parse(localStorage.getItem('user') || '{}');
      userData.email = watchEmail('email');
      localStorage.setItem('user', JSON.stringify(userData));
      queryClient.invalidateQueries(['mahasiswa', 'profile']);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui email');
    }
  });



  return (
    <div className="space-y-8 p-5 lg:p-5">
      
      {/* Card A: Ganti Password */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
         <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Ganti Password</h2>
         <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Pastikan password kamu kuat dan sulit ditebak.</p>

         <form onSubmit={handleSubmit((data) => {
            setPendingPasswordData(data);
            setConfirmPasswordOpen(true);
         })} className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2 relative">
               <Label htmlFor="old_password">Password Saat Ini</Label>
               <div className="relative">
                  <Input
                    id="old_password"
                    type={showOld ? 'text' : 'password'}
                    {...register('old_password')}
                  />
                  <button type="button" onClick={() => setShowOld(!showOld)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] transition-colors">
                    {showOld ? <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility_off</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>}
                  </button>
               </div>
               {passwordErrors.old_password && <p className="text-xs font-bold text-[#0B4FAE]">{passwordErrors.old_password.message}</p>}
            </div>

            <div className="space-y-2">
               <Label htmlFor="new_password">Password Baru</Label>
               <div className="relative">
                  <Input
                    id="new_password"
                    type={showNew ? 'text' : 'password'}
                    {...register('new_password')}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] transition-colors">
                    {showNew ? <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility_off</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>}
                  </button>
               </div>

               {passwordErrors.new_password && <p className="text-xs font-bold text-[#0B4FAE]">{passwordErrors.new_password.message}</p>}
            </div>

            <div className="space-y-2">
               <Label htmlFor="confirm_password">Konfirmasi Password Baru</Label>
               <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirm ? 'text' : 'password'}
                    {...register('confirm_password')}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] transition-colors">
                    {showConfirm ? <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility_off</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>}
                  </button>
               </div>
               {passwordErrors.confirm_password && <p className="text-xs font-bold text-[#0B4FAE]">{passwordErrors.confirm_password.message}</p>}
            </div>

            <div className="md:col-span-3 pt-2 flex justify-end">
               <button
                type="submit"
                disabled={passwordMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-7 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--theme-primary)]/20 transition-all hover:bg-[var(--theme-primary-hover)] active:scale-95 disabled:cursor-wait disabled:opacity-70 border-none cursor-pointer"
               >
                 {passwordMutation.isPending && <span className="material-symbols-outlined animate-spin text-base shrink-0">sync</span>}
                 Perbarui Password
               </button>
            </div>
         </form>
      </div>

      {/* Card: Ubah Email */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
         <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Ubah Email</h2>
         <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Perbarui email akun Anda untuk login dan notifikasi.</p>

         <form onSubmit={handleEmailSubmit((data) => {
            setPendingEmailData(data);
            setConfirmEmailOpen(true);
         })} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            <div className="space-y-2">
               <Label htmlFor="email">Email Baru</Label>
               <Input
                 id="email"
                 type="email"
                 {...registerEmail('email')}
                 placeholder="email@universitas.edu"
               />
               {emailErrors.email && <p className="text-xs font-bold text-[#0B4FAE]">{emailErrors.email.message}</p>}
            </div>

            <div className="space-y-2">
               <Label htmlFor="confirm_email">Konfirmasi Email</Label>
               <Input
                 id="confirm_email"
                 type="email"
                 {...registerEmail('confirm_email')}
                 placeholder="Ulangi email baru"
               />
               {emailErrors.confirm_email && <p className="text-xs font-bold text-[#0B4FAE]">{emailErrors.confirm_email.message}</p>}
            </div>

            <div className="space-y-2">
               <Label htmlFor="email_password">Password (Konfirmasi)</Label>
               <div className="relative">
                     <Input
                       id="email_password"
                       type={showEmailPass ? 'text' : 'password'}
                       {...registerEmail('password')}
                     />
                     <button type="button" onClick={() => setShowEmailPass(!showEmailPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] transition-colors">
                       {showEmailPass ? <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility_off</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>visibility</span>}
                     </button>
               </div>
               {emailErrors.password && <p className="text-xs font-bold text-[#0B4FAE]">{emailErrors.password.message}</p>}
            </div>

            <div className="md:col-span-3 pt-2 flex justify-end">
               <button
                type="submit"
                disabled={emailMutation.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-7 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--theme-primary)]/20 transition-all hover:bg-[var(--theme-primary-hover)] active:scale-95 disabled:cursor-wait disabled:opacity-70 border-none cursor-pointer"
               >
                 {emailMutation.isPending && <span className="material-symbols-outlined animate-spin text-base shrink-0">sync</span>}
                 Simpan Email Baru
               </button>
            </div>
         </form>
      </div>

      {/* Card C: Riwayat Login */}
      <div className="pb-2">
         <div className="flex items-center justify-between mb-6">
            <div>
               <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Riwayat Login</h2>
               <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)]">Aktivitas akses terakhir ke akun Anda.</p>
            </div>
            <button className="text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest hover:underline cursor-pointer">Lihat Semua</button>
          </div>
         <div className="rounded-xl border border-[var(--theme-border-muted)] overflow-hidden bg-[var(--theme-surface)]">
            <Table>
               <TableHeader>
                  <TableRow className="bg-[var(--theme-surface)] hover:bg-[var(--theme-surface)] border-b border-[var(--theme-border-muted)]">
                     <TableHead className="w-[180px] text-[var(--theme-text-muted)]">Waktu</TableHead>
                     <TableHead className="text-[var(--theme-text-muted)]">Perangkat</TableHead>
                     <TableHead className="text-[var(--theme-text-muted)]">Lokasi</TableHead>
                     <TableHead className="text-[var(--theme-text-muted)]">Status</TableHead>
                  </TableRow>
               </TableHeader>
               <TableBody className="divide-y divide-[var(--theme-border-muted)]">
                  {history?.map((h, idx) => (
                     <TableRow key={`history-${h.id ?? idx}-${h.created_at ?? ''}-${h.user_agent ?? 'unknown'}`} className="border-b border-[var(--theme-border-muted)] last:border-0 hover:bg-[var(--theme-bg)] transition-colors">
                       <TableCell className="font-semibold text-[var(--theme-text)]">
                          {new Date(h.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                       </TableCell>
                       <TableCell className="font-semibold text-[var(--theme-text)]">{h.user_agent}</TableCell>
                       <TableCell className="font-semibold text-[var(--theme-text-muted)]">{h.location}</TableCell>
                       <TableCell>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                            h.status === 'Berhasil' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success)]/20' : 'bg-[var(--theme-error-light)] text-[var(--theme-error)] border-[var(--theme-error)]/20'
                          }`}>
                             {h.status}
                          </span>
                       </TableCell>
                    </TableRow>
                  ))}
                  {!history?.length && (
                    <TableRow>
                       <TableCell colSpan={4} className="h-32 text-center">
                          <div className="flex flex-col items-center justify-center text-[var(--theme-text-subtle)] gap-2">
                             <span className="material-symbols-outlined text-4xl opacity-30">history</span>
                             <span className="font-semibold text-xs">Belum ada riwayat login.</span>
                          </div>
                       </TableCell>
                    </TableRow>
                  )}
               </TableBody>
            </Table>
         </div>
      </div>

      {/* ── Dialog Modals ────────────────────────────────────── */}
      <AlertDialog open={confirmPasswordOpen} onOpenChange={setConfirmPasswordOpen}>
        <AlertDialogContent className="rounded-3xl p-6 md:p-8 border border-[var(--theme-border)] shadow-2xl bg-[var(--theme-surface)] max-w-md mx-auto text-left gap-0">
          <AlertDialogHeader className="text-left space-y-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--theme-warning-light)] text-[var(--theme-warning)] flex items-center justify-center mb-5">
               <span className="material-symbols-outlined text-2xl">lock_reset</span>
            </div>
            <AlertDialogTitle className="text-xl font-black font-headline text-[var(--theme-text)] mb-2">Perbarui Password?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-[var(--theme-text-muted)] leading-relaxed">
              Anda akan memperbarui kata sandi akun Anda. Pastikan untuk mengingat kata sandi baru Anda untuk login di kemudian hari.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex justify-end gap-3 flex-row items-center w-full sm:justify-end">
            <AlertDialogCancel 
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[10px] font-black text-[var(--theme-text)] uppercase tracking-widest hover:bg-[var(--theme-bg)] transition-colors h-11 px-6 shadow-sm m-0"
              onClick={(e) => { e.preventDefault(); setConfirmPasswordOpen(false); }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-[10px] font-black uppercase tracking-widest transition-colors h-11 px-6 border-none shadow-md m-0"
              onClick={(e) => {
                e.preventDefault();
                passwordMutation.mutate(pendingPasswordData);
                setConfirmPasswordOpen(false);
              }}
            >
              Ya, Perbarui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmEmailOpen} onOpenChange={setConfirmEmailOpen}>
        <AlertDialogContent className="rounded-3xl p-6 md:p-8 border border-[var(--theme-border)] shadow-2xl bg-[var(--theme-surface)] max-w-md mx-auto text-left gap-0">
          <AlertDialogHeader className="text-left space-y-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--theme-primary-light)] text-[var(--theme-primary)] flex items-center justify-center mb-5">
               <span className="material-symbols-outlined text-2xl">mark_email_read</span>
            </div>
            <AlertDialogTitle className="text-xl font-black font-headline text-[var(--theme-text)] mb-2">Perbarui Alamat Email?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-semibold text-[var(--theme-text-muted)] leading-relaxed">
              Email ini akan digunakan untuk pengiriman notifikasi penting dan tautan pemulihan kata sandi. Apakah Anda yakin ingin melanjutkannya?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex justify-end gap-3 flex-row items-center w-full sm:justify-end">
            <AlertDialogCancel 
              className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[10px] font-black text-[var(--theme-text)] uppercase tracking-widest hover:bg-[var(--theme-bg)] transition-colors h-11 px-6 shadow-sm m-0"
              onClick={(e) => { e.preventDefault(); setConfirmEmailOpen(false); }}
            >
              Batal
            </AlertDialogCancel>
            <AlertDialogAction 
              className="rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-[10px] font-black uppercase tracking-widest transition-colors h-11 px-6 border-none shadow-md m-0"
              onClick={(e) => {
                e.preventDefault();
                emailMutation.mutate(pendingEmailData);
                setConfirmEmailOpen(false);
              }}
            >
              Ya, Perbarui
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
