import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';
import { usePermission } from '@/hooks/usePermission';
import { P } from '@/config/permissions';

import { cn } from '@/lib/utils';
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
import { Textarea } from '@/components/ui/Textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RotateCcw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>restart_alt</span>;

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const User = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person</span>;
const Phone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>phone</span>;


const FIELD_CLASS = 'w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)] focus:ring-4 focus:ring-[var(--theme-primary-light)] placeholder-[var(--theme-text-subtle)]';

const Label = ({ children, icon: Icon, required, ...props }) => (
  <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]" {...props}>
    {Icon && <Icon size={13} className="text-[var(--theme-text-subtle)]" />}
    {children}
    {required && <span className="text-red-500">*</span>}
  </span>
);

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} className={cn(FIELD_CLASS, className)} ref={ref} {...props} />
));

// Extended Zod schema dengan semua field dari database
const schema = z.object({
  // === DATA PRIBADI ===
  nik: z.string().optional(),
  nisn: z.string().optional(),
  nupn: z.string().optional(),
  npsn: z.string().optional(),
  nirm: z.string().optional(),
  nirl: z.string().optional(),
  birth_place: z.string().min(1, 'Tempat lahir wajib diisi'),
  birth_date: z.string().min(1, 'Tanggal lahir wajib diisi'),
  gender: z.string().min(1, 'Jenis kelamin wajib diisi'),
  religion: z.string().min(1, 'Agama wajib diisi'),
  kewarganegaraan: z.string().optional(),
  status_pernikahan: z.string().optional(),
  golongan_darah: z.string().optional(),
  is_disabilitas: z.string().optional(),
  jenis_tinggal: z.string().optional(),

  // === KONTAK & DOMISILI (SAAT INI) ===
  email_personal: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  email_kampus: z.string().email('Format email tidak valid').optional().or(z.literal('')),
  phone: z.string().min(10, 'Nomor HP minimal 10 digit').regex(/^(08|\+628)/, 'Format nomor HP harus 08xx atau +628xx').optional().or(z.literal('')),
  telepon: z.string().optional(),
  address: z.string().min(5, 'Alamat domisili minimal 5 karakter').optional().or(z.literal('')),
  rt: z.string().optional(),
  rw: z.string().optional(),
  city: z.string().optional(),
  zip_code: z.string().optional(),
  desa: z.string().optional(),
  kecamatan: z.string().optional(),
  provinsi: z.string().optional(),

  // === DOMISILI (BEDA DENGAN KTP) ===
  alamat_domisili: z.string().optional(),
  rt_domisili: z.string().optional(),
  rw_domisili: z.string().optional(),
  kota_domisili: z.string().optional(),
  kode_pos_domisili: z.string().optional(),
  desa_domisili: z.string().optional(),
  kecamatan_domisili: z.string().optional(),
  provinsi_domisili: z.string().optional(),

  // === KONTAK DARURAT ===
  kontak_darurat: z.string().optional(),
  telepon_darurat: z.string().optional(),

  // === KELUARGA ===
  nama_ayah: z.string().optional(),
  pekerjaan_ayah: z.string().optional(),
  nama_ibu_kandung: z.string().optional(),
  pekerjaan_ibu: z.string().optional(),
  nama_wali: z.string().optional(),
  pekerjaan_wali: z.string().optional(),
  penghasilan_ortu: z.union([z.string(), z.number()]).optional(),
  pekerjaan: z.string().optional(), // Pekerjaan mahasiswa sendiri

  // === NOMOR IDENTITAS KELUARGA ===
  nomor_kk: z.string().optional(),
  nomor_kps: z.string().optional(),

  // === PENDIDIKAN TERAKHIR ===
  asal_sekolah: z.string().optional(),
  no_ijazah_sma: z.string().optional(),
});

export default function DataDiriTab({ profile }) {
  const queryClient = useQueryClient();
  const [confirmDataOpen, setConfirmDataOpen] = useState(false);
  const [pendingData, setPendingData] = useState(null);
  const { hasPermission } = usePermission();
  const canUpdate = hasPermission(P.STUDENT_PROFILE_UPDATE);

  // Helper untuk parse date
  const parseDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      // === DATA PRIBADI ===
      nik: profile?.NIK || '',
      nisn: profile?.NISN || '',
      nupn: profile?.NUPN || '',
      npsn: profile?.NPSN || '',
      nirm: profile?.NIRM || '',
      nirl: profile?.NIRL || '',
      birth_place: profile?.TempatLahir || '',
      birth_date: parseDate(profile?.TanggalLahir),
      gender: profile?.JenisKelamin || '',
      religion: profile?.Agama || '',
      kewarganegaraan: profile?.Kewarganegaraan || '',
      status_pernikahan: profile?.StatusPernikahan || '',
      golongan_darah: profile?.GolonganDarah || '',
      is_disabilitas: profile?.IsDisabilitas || 'Tidak',
      jenis_tinggal: profile?.JenisTinggal || '',

      // === KONTAK ===
      email_personal: profile?.EmailPersonal || '',
      email_kampus: profile?.EmailKampus || '',
      phone: profile?.NoHP || '',
      telepon: profile?.Telepon || '',
      address: profile?.Alamat || '',
      rt: profile?.RT || '',
      rw: profile?.RW || '',
      city: profile?.Kota || '',
      zip_code: profile?.KodePos || '',
      desa: profile?.Desa || '',
      kecamatan: profile?.Kecamatan || '',
      provinsi: profile?.Provinsi || '',

      // === DOMISILI ===
      alamat_domisili: profile?.AlamatDomisili || '',
      rt_domisili: profile?.RTDomisili || '',
      rw_domisili: profile?.RWDomisili || '',
      kota_domisili: profile?.KotaDomisili || '',
      kode_pos_domisili: profile?.KodePosDomisili || '',
      desa_domisili: profile?.DesaDomisili || '',
      kecamatan_domisili: profile?.KecamatanDomisili || '',
      provinsi_domisili: profile?.ProvinsiDomisili || '',

      // === KONTAK DARURAT ===
      kontak_darurat: profile?.KontakDarurat || '',
      telepon_darurat: profile?.TeleponDarurat || '',

      // === KELUARGA ===
      nama_ayah: profile?.NamaAyah || '',
      pekerjaan_ayah: profile?.PekerjaanAyah || '',
      nama_ibu_kandung: profile?.NamaIbuKandung || '',
      pekerjaan_ibu: profile?.PekerjaanIbu || '',
      nama_wali: profile?.NamaWali || '',
      pekerjaan_wali: profile?.PekerjaanWali || '',
      penghasilan_ortu: profile?.PenghasilanOrtu || 0,
      pekerjaan: profile?.Pekerjaan || '',

      // === NOMOR IDENTITAS ===
      nomor_kk: profile?.NomorKK || '',
      nomor_kps: profile?.NomorKPS || '',

      // === PENDIDIKAN ===
      asal_sekolah: profile?.AsalSekolah || '',
      no_ijazah_sma: profile?.NoIjazahSMA || '',
    }
  });

  // Transform payload ke snake_case untuk API
  const transformToPayload = (data) => {
    return {
      // Data Pribadi
      nik: data.nik || '',
      nisn: data.nisn || '',
      nupn: data.nupn || '',
      npsn: data.npsn || '',
      nirm: data.nirm || '',
      nirl: data.nirl || '',
      tempat_lahir: data.birth_place || '',
      tanggal_lahir: data.birth_date || '',
      jenis_kelamin: data.gender || '',
      agama: data.religion || '',
      kewarganegaraan: data.kewarganegaraan || '',
      status_pernikahan: data.status_pernikahan || '',
      golongan_darah: data.golongan_darah || '',
      is_disabilitas: data.is_disabilitas || 'Tidak',
      jenis_tinggal: data.jenis_tinggal || '',

      // Kontak
      email_personal: data.email_personal || '',
      email_kampus: data.email_kampus || '',
      no_hp: data.phone || '',
      telepon: data.telepon || '',
      alamat: data.address || '',
      rt: data.rt || '',
      rw: data.rw || '',
      kota: data.city || '',
      kode_pos: data.zip_code || '',
      desa: data.desa || '',
      kecamatan: data.kecamatan || '',
      provinsi: data.provinsi || '',

      // Domisili
      alamat_domisili: data.alamat_domisili || '',
      rt_domisili: data.rt_domisili || '',
      rw_domisili: data.rw_domisili || '',
      kota_domisili: data.kota_domisili || '',
      kode_pos_domisili: data.kode_pos_domisili || '',
      desa_domisili: data.desa_domisili || '',
      kecamatan_domisili: data.kecamatan_domisili || '',
      provinsi_domisili: data.provinsi_domisili || '',

      // Kontak Darurat
      kontak_darurat: data.kontak_darurat || '',
      telepon_darurat: data.telepon_darurat || '',

      // Keluarga
      nama_ayah: data.nama_ayah || '',
      pekerjaan_ayah: data.pekerjaan_ayah || '',
      nama_ibu_kandung: data.nama_ibu_kandung || '',
      pekerjaan_ibu: data.pekerjaan_ibu || '',
      nama_wali: data.nama_wali || '',
      pekerjaan_wali: data.pekerjaan_wali || '',
      penghasilan_ortu: parseInt(data.penghasilan_ortu) || 0,
      pekerjaan: data.pekerjaan || '',

      // Nomor Identitas
      nomor_kk: data.nomor_kk || '',
      nomor_kps: data.nomor_kps || '',

      // Pendidikan
      asal_sekolah: data.asal_sekolah || '',
      no_ijazah_sma: data.no_ijazah_sma || '',
    };
  };

  const mutation = useMutation({
    mutationFn: async (data) => {
      const payload = transformToPayload(data);
      const res = await api.put('/profil/data-diri', payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['mahasiswa', 'profile']);
      toast.success('Data diri berhasil diperbarui');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Gagal memperbarui data');
    }
  });

  const GOLONGAN_DARAH = ['A', 'B', 'AB', 'O', 'Tidak Tahu'];
  const KEWARGANEGARAAN = ['WNI', 'WNA'];
  const STATUS_NIKAH = ['Belum Kawin', 'Kawin', 'Cerai Hidup', 'Cerai Mati'];
  const JENIS_TINGGAL = ['Bersama Orang Tua', 'Kos', 'Asrama', 'Kontrak', 'Milik Sendiri', 'Lainnya'];
  const STATUS_DISABILITAS = ['Tidak', 'Ya - Fisik', 'Ya - Netra/Rungu', 'Ya - Mental/Intelektual', 'Ya - Ganda'];

  const watchedGender = watch('gender');

  return (
    <form
      onSubmit={handleSubmit(
        (data) => mutation.mutate(data),
        (errs) => {
          const flatErrors = Object.keys(errs).reduce((acc, k) => ({ ...acc, [k]: errs[k].message }), {});
          console.error('Validation errors:', JSON.stringify(flatErrors, null, 2));

          const errorMessages = Object.values(errs).map(e => e.message);
          if (errorMessages.length > 0) {
            if (errorMessages.length <= 2) {
              toast.error(`Gagal menyimpan:\n• ${errorMessages.join('\n• ')}`);
            } else {
              toast.error(`Gagal menyimpan:\n• ${errorMessages.slice(0, 2).join('\n• ')}\n• ...dan ${errorMessages.length - 2} error lainnya`);
            }
          } else {
            toast.error('Mohon lengkapi seluruh field yang wajib diisi');
          }
        }
      )}
      className="space-y-8 p-5 lg:p-5"
    >
      <fieldset disabled={!canUpdate} className="space-y-8">
      {/* SEKSI: DATA PRIBADI */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
        <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Data Pribadi</h2>
        <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Identitas dasar yang terdaftar dalam sistem akademik.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <Label>NIK KTP <span className="text-[9px] normal-case font-normal text-slate-400">(16 Digit)</span></Label>
            <Input {...register('nik')} placeholder="3201234567890123" maxLength={16} />
          </div>
          <div className="space-y-2">
            <Label>Nomor KK</Label>
            <Input {...register('nomor_kk')} placeholder="Nomor Kartu Keluarga" maxLength={16} />
          </div>
          <div className="space-y-2">
            <Label>NPM / NIM</Label>
            <Input value={profile?.NIM || ''} disabled className="bg-slate-100" />
          </div>

          <div className="space-y-2">
            <Label> NISN</Label>
            <Input {...register('nisn')} placeholder="Nomor Induk Siswa Nasional" maxLength={10} />
          </div>
          <div className="space-y-2">
            <Label>Nomor KPS / PKH</Label>
            <Input {...register('nomor_kps')} placeholder="Nomor KPS / PKH (opsional)" />
          </div>

          {/* Baris 3 */}
          <div className="space-y-2">
            <Label required>Tempat Lahir</Label>
            <Input {...register('birth_place')} placeholder="Kota Kelahiran" />
            {errors.birth_place && <p className="text-xs font-bold text-red-500">{errors.birth_place.message}</p>}
          </div>
          <div className="space-y-2">
            <Label required>Tanggal Lahir</Label>
            <Input type="date" {...register('birth_date')} />
            {errors.birth_date && <p className="text-xs font-bold text-red-500">{errors.birth_date.message}</p>}
          </div>

          {/* Baris 4: Jenis Kelamin */}
          <div className="space-y-3 col-span-1 md:col-span-2 lg:col-span-3">
            <Label required>Jenis Kelamin</Label>
            <div className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" value="Laki-laki" {...register('gender')} className="w-4 h-4 text-[var(--theme-primary)]" />
                <span className="text-sm font-bold text-[var(--theme-text)]">Laki-laki</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="radio" value="Perempuan" {...register('gender')} className="w-4 h-4 text-[var(--theme-primary)]" />
                <span className="text-sm font-bold text-[var(--theme-text)]">Perempuan</span>
              </label>
            </div>
            {errors.gender && <p className="text-xs font-bold text-red-500">{errors.gender.message}</p>}
          </div>

          {/* Baris 5 */}
          <div className="space-y-2">
            <Label required>Agama</Label>
            <Select defaultValue={profile?.Agama} onValueChange={(val) => setValue('religion', val)}>
              <SelectTrigger><SelectValue placeholder="Pilih Agama" /></SelectTrigger>
              <SelectContent>
                {['Islam', 'Kristen', 'Katolik', 'Hindu', 'Budha', 'Khonghucu'].map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.religion && <p className="text-xs font-bold text-red-500">{errors.religion.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Golongan Darah</Label>
            <Select defaultValue={profile?.GolonganDarah} onValueChange={(val) => setValue('golongan_darah', val)}>
              <SelectTrigger><SelectValue placeholder="- Pilih -" /></SelectTrigger>
              <SelectContent>
                {GOLONGAN_DARAH.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kewarganegaraan</Label>
            <Select defaultValue={profile?.Kewarganegaraan} onValueChange={(val) => setValue('kewarganegaraan', val)}>
              <SelectTrigger><SelectValue placeholder="- Pilih -" /></SelectTrigger>
              <SelectContent>
                {KEWARGANEGARAAN.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status Pernikahan</Label>
            <Select defaultValue={profile?.StatusPernikahan} onValueChange={(val) => setValue('status_pernikahan', val)}>
              <SelectTrigger><SelectValue placeholder="- Pilih -" /></SelectTrigger>
              <SelectContent>
                {STATUS_NIKAH.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Jenis Tinggal</Label>
            <Select defaultValue={profile?.JenisTinggal} onValueChange={(val) => setValue('jenis_tinggal', val)}>
              <SelectTrigger><SelectValue placeholder="- Pilih -" /></SelectTrigger>
              <SelectContent>
                {JENIS_TINGGAL.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Status Disabilitas</Label>
            <Select defaultValue={profile?.IsDisabilitas || 'Tidak'} onValueChange={(val) => setValue('is_disabilitas', val)}>
              <SelectTrigger><SelectValue placeholder="- Pilih -" /></SelectTrigger>
              <SelectContent>
                {STATUS_DISABILITAS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Baris 6: Identitas Kemendikbud (collapsible) */}
          <div className="col-span-1 md:col-span-2 lg:col-span-3 space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-bold text-slate-600 uppercase tracking-wider">Identitas Kemendikbud (Opsional)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <Label>NUPN</Label>
                <Input {...register('nupn')} placeholder="NUPN" />
              </div>
              <div className="space-y-1">
                <Label>NPSN</Label>
                <Input {...register('npsn')} placeholder="NPSN" />
              </div>
              <div className="space-y-1">
                <Label>NIRM</Label>
                <Input {...register('nirm')} placeholder="NIRM" />
              </div>
              <div className="space-y-1">
                <Label>NIRL</Label>
                <Input {...register('nirl')} placeholder="NIRL" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEKSI: KONTAK */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
        <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Kontak & Domisili</h2>
        <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Informasi untuk komunikasi dan pengiriman dokumen.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <Label>Email Personal</Label>
            <Input {...register('email_personal')} placeholder="email.pribadi@gmail.com" type="email" />
            {errors.email_personal && <p className="text-xs font-bold text-red-500">{errors.email_personal.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Email Kampus</Label>
            <Input {...register('email_kampus')} placeholder="nama@student.univ.ac.id" type="email" />
          </div>

          <div className="space-y-2">
            <Label>No. HP / WhatsApp</Label>
            <Input {...register('phone')} placeholder="081234567890" />
            {errors.phone && <p className="text-xs font-bold text-red-500">{errors.phone.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Telepon (Rumah)</Label>
            <Input {...register('telepon')} placeholder="021-1234567" />
          </div>

          {/* Alamat Lengkap */}
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label>Alamat Lengkap (sesuai KTP)</Label>
            <Textarea {...register('address')} placeholder="Jalan Raya No. 123, RT/RW..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label>RT</Label>
            <Input {...register('rt')} placeholder="001" maxLength={5} />
          </div>
          <div className="space-y-2">
            <Label>RW</Label>
            <Input {...register('rw')} placeholder="002" maxLength={5} />
          </div>

          <div className="space-y-2">
            <Label>Desa / Kelurahan</Label>
            <Input {...register('desa')} placeholder="Desa/Kelurahan" />
          </div>
          <div className="space-y-2">
            <Label>Kecamatan</Label>
            <Input {...register('kecamatan')} placeholder="Kecamatan" />
          </div>

          <div className="space-y-2">
            <Label>Kota / Kabupaten</Label>
            <Input {...register('city')} />
          </div>
          <div className="space-y-2">
            <Label>Provinsi</Label>
            <Input {...register('provinsi')} placeholder="Provinsi" />
          </div>

          <div className="space-y-2">
            <Label>Kode Pos</Label>
            <Input {...register('zip_code')} maxLength={5} placeholder="40123" />
          </div>
        </div>
      </div>

      {/* SEKSI: DOMISILI BERBEDA (opsional) */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
        <div className="flex items-center gap-2 mb-1">
          <h2 className="text-sm font-black font-headline uppercase tracking-widest" style={{ color: 'var(--theme-h2)' }}>Alamat Domisili</h2>
          <span className="text-[9px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-bold">BEDA DENGAN KTP</span>
        </div>
        <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Isi jika alamat domisili saat ini berbeda dengan alamat KTP.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="col-span-1 md:col-span-2 space-y-2">
            <Label>Alamat Domisili Lengkap</Label>
            <Textarea {...register('alamat_domisili')} placeholder="Jalan, RT/RW, Desa/Kel..." rows={2} />
          </div>

          <div className="space-y-2">
            <Label>RT Domisili</Label>
            <Input {...register('rt_domisili')} placeholder="001" />
          </div>
          <div className="space-y-2">
            <Label>RW Domisili</Label>
            <Input {...register('rw_domisili')} placeholder="002" />
          </div>

          <div className="space-y-2">
            <Label>Desa / Kelurahan Domisili</Label>
            <Input {...register('desa_domisili')} />
          </div>
          <div className="space-y-2">
            <Label>Kecamatan Domisili</Label>
            <Input {...register('kecamatan_domisili')} />
          </div>

          <div className="space-y-2">
            <Label>Kota Domisili</Label>
            <Input {...register('kota_domisili')} />
          </div>
          <div className="space-y-2">
            <Label>Provinsi Domisili</Label>
            <Input {...register('provinsi_domisili')} />
          </div>

          <div className="space-y-2">
            <Label>Kode Pos Domisili</Label>
            <Input {...register('kode_pos_domisili')} placeholder="40123" />
          </div>
        </div>
      </div>

      {/* SEKSI: KONTAK DARURAT */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
        <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Kontak Darurat</h2>
        <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Orang yang dapat dihubungi dalam keadaan darurat.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <Label>Nama Kontak Darurat</Label>
            <Input {...register('kontak_darurat')} placeholder="Nama Lengkap" />
          </div>
          <div className="space-y-2">
            <Label>No. HP Kontak Darurat</Label>
            <Input {...register('telepon_darurat')} placeholder="081234567890" />
          </div>
        </div>
      </div>

      {/* SEKSI: KELUARGA */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
        <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Data Keluarga</h2>
        <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Informasi orang tua / wali untuk keperluan administrasi.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <Label>Nama Lengkap Ayah</Label>
            <Input {...register('nama_ayah')} />
          </div>
          <div className="space-y-2">
            <Label>Pekerjaan Ayah</Label>
            <Input {...register('pekerjaan_ayah')} placeholder="PNS, Wiraswasta, dll" />
          </div>
          <div className="space-y-2">
            <Label>Nama Lengkap Ibu Kandung</Label>
            <Input {...register('nama_ibu_kandung')} />
          </div>
          <div className="space-y-2">
            <Label>Pekerjaan Ibu</Label>
            <Input {...register('pekerjaan_ibu')} placeholder="IRT, PNS, Wiraswasta, dll" />
          </div>

          <div className="space-y-2">
            <Label>Nama Wali (opsional)</Label>
            <Input {...register('nama_wali')} placeholder="Jika tidak dengan orang tua" />
          </div>
          <div className="space-y-2">
            <Label>Pekerjaan Wali</Label>
            <Input {...register('pekerjaan_wali')} />
          </div>

          <div className="space-y-2 lg:col-span-2">
            <Label>Penghasilan Kumulatif Orang Tua (Rp / Bulan)</Label>
            <Input type="number" {...register('penghasilan_ortu')} placeholder="Tanpa titik (contoh: 5000000)" className="w-full" />
          </div>

          <div className="space-y-2">
            <Label>Pekerjaan Sendiri (mahasiswa)</Label>
            <Input {...register('pekerjaan')} placeholder="Jika ada kerja sampingan" />
          </div>
        </div>
      </div>

      {/* SEKSI: PENDIDIKAN TERAKHIR */}
      <div className="pb-6">
        <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Pendidikan Terakhir</h2>
        <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Riwayat asal sekolah menengah.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <div className="space-y-2">
            <Label>Asal Sekolah (SMA / SMK / Sederajat)</Label>
            <Input {...register('asal_sekolah')} placeholder="SMA Negeri 1 ..." />
          </div>
          <div className="space-y-2">
            <Label>No. Ijazah SMA / SMK</Label>
            <Input {...register('no_ijazah_sma')} placeholder="Nomor Ijazah" />
          </div>
        </div>
      </div>

      {/* AKSI */}
      {canUpdate && (
        <div className="flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:justify-end" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)] px-7 py-3 text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] transition-all hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)] active:scale-95 cursor-pointer"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-7 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--theme-primary)]/20 transition-all hover:bg-[var(--theme-primary-hover)] active:scale-95 disabled:cursor-wait disabled:opacity-70 border-none cursor-pointer"
          >
            {mutation.isPending ? <span className="material-symbols-outlined animate-spin text-base shrink-0">sync</span> : <span className="material-symbols-outlined text-base shrink-0">save</span>}
            Simpan Profil
          </button>
        </div>
      )}
      </fieldset>
    </form>
  );
}
