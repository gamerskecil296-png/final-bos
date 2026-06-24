import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page/PageHeader';
import { useCertificateSettingsQuery, useUpdateCertificateSettingsMutation, useUploadCertificateLogoMutation, useUploadCertificateLeftLogoMutation, useUploadCertificateRightLogoMutation } from '@/queries/useKencanaAdminQuery';
import { ASSET_URL } from '@/services/api';
import CertificateTemplate from '@/components/CertificateTemplate';

const CertificateSettings = () => {
  const { data: settingsData, isLoading } = useCertificateSettingsQuery();
  const updateSettings = useUpdateCertificateSettingsMutation();
  const uploadLogo = useUploadCertificateLogoMutation();
  const uploadLeftLogo = useUploadCertificateLeftLogoMutation();
  const uploadRightLogo = useUploadCertificateRightLogoMutation();
  const [logoPreview, setLogoPreview] = useState('');

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isDirty } } = useForm({
    defaultValues: {
      theme: '',
      issue_date: '',
      start_date: '',
      end_date: '',
      rektor_name: '',
      rektor_nik: '',
      direktur_name: '',
      direktur_nik: '',
      presma_name: '',
      presma_npm: '',
      reference_number: '',
      logo_url: '',
      left_logo_url: '',
      right_logo_url: ''
    }
  });

  useEffect(() => {
    if (settingsData?.data) {
      reset(settingsData.data);
      setLogoPreview(settingsData.data.logo_url || '');
    }
  }, [settingsData, reset]);

  const onSubmit = (data) => {
    updateSettings.mutate(data, {
      onSuccess: () => {
        toast.success('Pengaturan Sertifikat berhasil disimpan!');
        reset(data);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.error || 'Gagal menyimpan pengaturan');
      }
    });
  };

  const handleLogoUrlChange = (e) => {
    setLogoPreview(e.target.value);
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Mengunggah logo...');
    uploadLogo.mutate(file, {
      onSuccess: (res) => {
        toast.success('Logo berhasil diunggah', { id: toastId });
        setValue('logo_url', res.url, { shouldDirty: true });
        setLogoPreview(res.url);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.error || 'Gagal mengunggah logo', { id: toastId });
      }
    });
  };

  const handleLeftLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Mengunggah ikon kiri...');
    uploadLeftLogo.mutate(file, {
      onSuccess: (res) => {
        toast.success('Ikon kiri berhasil diunggah', { id: toastId });
        setValue('left_logo_url', res.url, { shouldDirty: true });
      },
      onError: (err) => {
        toast.error(err?.response?.data?.error || 'Gagal mengunggah ikon kiri', { id: toastId });
      }
    });
  };

  const handleRightLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Mengunggah ikon kanan...');
    uploadRightLogo.mutate(file, {
      onSuccess: (res) => {
        toast.success('Ikon kanan berhasil diunggah', { id: toastId });
        setValue('right_logo_url', res.url, { shouldDirty: true });
      },
      onError: (err) => {
        toast.error(err?.response?.data?.error || 'Gagal mengunggah ikon kanan', { id: toastId });
      }
    });
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Memuat pengaturan...</div>;

  const watchedValues = watch();

  return (
    <div className="bg-transparent font-body w-full mx-auto space-y-6 pb-24">
      <PageHeader
        icon="workspace_premium"
        title={<><span className="text-[var(--theme-text)]">Pengaturan & Preview </span><span className="text-[var(--theme-primary)]">Sertifikat</span></>}
        subtitle="Atur variabel teks dan tanda tangan secara real-time."
        breadcrumbs={[
          { label: 'Kencana Admin', path: '/app/kencana/dashboard' },
          { label: 'Sertifikat', path: '/app/kencana/certificates' },
          { label: 'Pengaturan' }
        ]}
      />

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        {/* Kolom Form Pengaturan */}
        <form onSubmit={handleSubmit(onSubmit)} className="w-full xl:w-5/12 space-y-6">
          
          {/* Tema & Tanggal */}
          <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]">
              <h2 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-tight">Informasi Dasar Sertifikat</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Tema Acara</label>
                <input type="text" {...register('theme', { required: true })} className="w-full px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm" placeholder='Contoh: "Membangun Generasi Emas"' />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Nomor Referensi Sertifikat</label>
                <input type="text" {...register('reference_number')} className="w-full px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm" placeholder="Contoh: 02.08.01/FRM-1/KMHS-SPMI" />
              </div>
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Tanggal Terbit</label>
                <input type="text" {...register('issue_date', { required: true })} className="w-full px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm" placeholder="Contoh: 25 Agustus 2026" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Tgl Mulai</label>
                <input type="text" {...register('start_date')} className="w-full px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm" placeholder="25 Agustus" />
              </div>
              <div>
                <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Tgl Selesai</label>
                <input type="text" {...register('end_date')} className="w-full px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm" placeholder="27 Agustus 2026" />
              </div>
            </div>
          </div>

          {/* Tanda Tangan */}
          <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]">
              <h2 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-tight">Pejabat Penandatangan</h2>
            </div>
            <div className="p-6 space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 border-b pb-1 font-bold text-sm text-[var(--theme-primary)]">Rektor Universitas</div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] mb-1 uppercase">Nama</label>
                  <input type="text" {...register('rektor_name')} className="w-full px-3 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] mb-1 uppercase">NIK</label>
                  <input type="text" {...register('rektor_nik')} className="w-full px-3 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 border-b pb-1 font-bold text-sm text-[var(--theme-primary)]">Direktur Layanan Kemahasiswaan</div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] mb-1 uppercase">Nama</label>
                  <input type="text" {...register('direktur_name')} className="w-full px-3 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] mb-1 uppercase">NIK</label>
                  <input type="text" {...register('direktur_nik')} className="w-full px-3 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 border-b pb-1 font-bold text-sm text-[var(--theme-primary)]">Presiden Mahasiswa</div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] mb-1 uppercase">Nama</label>
                  <input type="text" {...register('presma_name')} className="w-full px-3 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] mb-1 uppercase">NPM</label>
                  <input type="text" {...register('presma_npm')} className="w-full px-3 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-lg text-sm" />
                </div>
              </div>

            </div>
          </div>

          {/* Logo Kencana */}
          <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--theme-border)] bg-[var(--theme-bg)]">
              <h2 className="text-sm font-bold text-[var(--theme-text)] uppercase tracking-tight">Logo Header Kencana</h2>
            </div>
            <div className="p-6 border-b border-[var(--theme-border)]">
               <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Logo Utama (Tengah)</label>
               <input 
                 type="file" 
                 accept="image/png, image/jpeg, image/webp"
                 onChange={handleLogoUpload}
                 disabled={uploadLogo.isPending}
                 className="w-full mb-4 px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--theme-primary-light)] file:text-[var(--theme-primary)] hover:file:bg-[var(--theme-primary-light)]/80" 
               />
               <input type="hidden" {...register('logo_url')} />
            </div>
            <div className="p-6 border-b border-[var(--theme-border)]">
               <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Ikon Kiri (Bhakti Kencana University)</label>
               <input 
                 type="file" 
                 accept="image/png, image/jpeg, image/webp"
                 onChange={handleLeftLogoUpload}
                 disabled={uploadLeftLogo.isPending}
                 className="w-full px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--theme-primary-light)] file:text-[var(--theme-primary)] hover:file:bg-[var(--theme-primary-light)]/80" 
               />
               <input type="hidden" {...register('left_logo_url')} />
               <p className="text-[10px] text-gray-400 mt-2">* Kosongkan untuk menggunakan ikon bintang default.</p>
            </div>
            <div className="p-6">
               <label className="block text-xs font-bold text-[var(--theme-text)] mb-2 uppercase">Ikon Kanan (Diktisaintek)</label>
               <input 
                 type="file" 
                 accept="image/png, image/jpeg, image/webp"
                 onChange={handleRightLogoUpload}
                 disabled={uploadRightLogo.isPending}
                 className="w-full px-4 py-2 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl focus:ring-2 focus:ring-[var(--theme-primary)] text-sm cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--theme-primary-light)] file:text-[var(--theme-primary)] hover:file:bg-[var(--theme-primary-light)]/80" 
               />
               <input type="hidden" {...register('right_logo_url')} />
               <p className="text-[10px] text-gray-400 mt-2">* Kosongkan untuk menggunakan ikon biru default.</p>
            </div>
          </div>

        </form>

        {/* Kolom Live Preview */}
        <div className="w-full xl:w-7/12 sticky top-24">
          <div className="bg-gray-800 rounded-3xl p-6 md:p-10 flex items-center justify-center overflow-hidden shadow-2xl border-4 border-gray-900 w-full">
            {/* The scale container */}
            <div className="transform scale-[0.3] sm:scale-[0.5] md:scale-[0.6] lg:scale-[0.7] xl:scale-[0.5] 2xl:scale-[0.65] origin-center transition-transform duration-300">
               <CertificateTemplate 
                 settings={watchedValues} 
                 certNumber="001/KNC/2026" 
                 studentName="NAMA MAHASISWA" 
                 isPreview={true} 
               />
            </div>
          </div>
          <p className="text-center text-sm text-gray-400 mt-4 italic">* Preview bersifat interaktif. Semua perubahan di sisi kiri akan langsung tampil di sini.</p>
        </div>
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 lg:left-64 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-[var(--theme-border)] flex justify-end gap-3 z-30 shadow-lg">
        <button 
          type="button" 
          onClick={() => reset()} 
          disabled={!isDirty || updateSettings.isPending}
          className="px-6 py-2.5 rounded-xl text-sm font-bold text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] disabled:opacity-50"
        >
          Batal
        </button>
        <button 
          type="submit" 
          disabled={!isDirty || updateSettings.isPending}
          className="px-8 py-2.5 rounded-xl text-sm font-bold text-white bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 shadow-lg shadow-[var(--theme-primary-light)] flex items-center gap-2"
        >
          {updateSettings.isPending && <span className="material-symbols-outlined animate-spin text-[18px]">progress_activity</span>}
          Simpan Pengaturan
        </button>
      </div>

    </div>
  );
};

export default CertificateSettings;
