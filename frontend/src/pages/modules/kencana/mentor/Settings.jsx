import React, { useEffect, useState } from 'react';
import useAuthStore from '@/store/useAuthStore';
import { useMentorProfileQuery, useUpdateMentorProfileMutation } from '@/queries/useKencanaMentorQuery';
import { PageHeader } from '@/components/ui/page/PageHeader';

const Settings = () => {
  const user = useAuthStore((state) => state.user);
  const { data: profile, isLoading } = useMentorProfileQuery();
  const updateProfile = useUpdateMentorProfileMutation();
  const [form, setForm] = useState({ name: '', phone: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (profile) {
      setForm({ name: profile.name || '', phone: profile.phone || '' });
    }
  }, [profile]);

  const email = profile?.email || user?.email || user?.Email || '-';
  const scope = profile?.scope_type === 'university' ? 'Kencana Universitas' : `Kencana Fakultas${profile?.fakultas?.nama ? ` - ${profile.fakultas.nama}` : ''}`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await updateProfile.mutateAsync(form);
      setMessage('Profil berhasil disimpan.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Gagal menyimpan profil.');
    }
  };

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon="settings"
        title={
          <>
            <span className="text-[var(--theme-text)]">Pengaturan </span>
            <span className="text-[var(--theme-primary)]">Profil</span>
          </>
        }
        subtitle="Perbarui identitas Dewan Pembimbing yang tampil di portal Kencana."
        breadcrumbs={[
          { label: 'Kencana Mentor', path: '/app/kencana/mentor/groups' },
          { label: 'Pengaturan Profil' }
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-[var(--theme-border)] bg-white p-6 shadow-sm flex flex-col justify-between h-fit">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--theme-primary-light)] text-2xl font-bold text-[var(--theme-primary)] border border-[var(--theme-primary-light)] shadow-sm">
              {(profile?.name || email || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[var(--theme-text)]">{profile?.name || 'Nama belum diatur'}</h2>
              <p className="truncate text-xs font-semibold text-[var(--theme-text-muted)] mt-1">{email}</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm border-t border-[var(--theme-border-muted)] pt-6">
            <Info label="Scope" value={scope} />
            <Info label="Status" value={profile?.status || 'active'} />
            <Info label="Telepon" value={profile?.phone || '-'} />
          </div>
        </aside>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--theme-border)] bg-white p-6 shadow-sm">
          {isLoading ? (
            <p className="text-sm font-bold text-[var(--theme-text-muted)]">Memuat profil...</p>
          ) : (
            <div className="space-y-5">
              <Field label="Nama Pembimbing">
                <input 
                  required 
                  value={form.name} 
                  onChange={(e) => setForm({ ...form, name: e.target.value })} 
                  className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
                  placeholder="Nama lengkap" 
                />
              </Field>
              <Field label="Email Login">
                <input 
                  disabled 
                  value={email} 
                  className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-xl text-sm font-semibold text-[var(--theme-text-muted)] cursor-not-allowed" 
                />
              </Field>
              <Field label="Nomor Telepon">
                <input 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} 
                  className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
                  placeholder="Nomor telepon aktif" 
                />
              </Field>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button 
                  disabled={updateProfile.isPending} 
                  className="h-10 px-6 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-bold hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 transition-all shadow-sm"
                >
                  {updateProfile.isPending ? 'Menyimpan...' : 'Simpan Profil'}
                </button>
                {message && <p className="text-xs font-bold text-[var(--theme-text-muted)]">{message}</p>}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

const Field = ({ label, children }) => {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">{label}</span>
      {children}
    </label>
  );
};

const Info = ({ label, value }) => {
  return (
    <div className="rounded-xl bg-[var(--theme-bg)] p-4 border border-[var(--theme-border)]">
      <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">{label}</p>
      <p className="mt-1 font-bold text-[var(--theme-text)] text-xs">{value}</p>
    </div>
  );
};

export default Settings;
