import React, { useEffect, useState } from 'react';
import { tenagaKesehatanService } from '@/services/api';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';

const UserIcon = () => <span className="material-symbols-outlined text-sm">person</span>;
const MailIcon = () => <span className="material-symbols-outlined text-sm">mail</span>;
const PhoneIcon = () => <span className="material-symbols-outlined text-sm">phone</span>;
const ShieldIcon = () => <span className="material-symbols-outlined text-sm">security</span>;
const WorkIcon = () => <span className="material-symbols-outlined text-sm">work</span>;
const MapPinIcon = () => <span className="material-symbols-outlined text-sm">location_on</span>;
const KeyIcon = () => <span className="material-symbols-outlined text-sm">key</span>;
const LockIcon = () => <span className="material-symbols-outlined text-sm">lock</span>;

const EMPTY_PROFILE = {
  nama: '',
  email: '',
  no_hp: '',
  spesialisasi: '',
  lokasi: '',
  is_aktif: true,
};

const FIELD_CLASS = 'w-full h-11 px-3 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none transition focus:border-bku-primary focus:bg-white focus:ring-4 focus:ring-bku-primary/5';

export default function Settings() {
  const [activeTab, setActiveTab] = useState('profil');
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [password, setPassword] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadProfile = () => {
    setLoading(true);
    tenagaKesehatanService.getMe()
      .then((res) => {
        setProfile({ ...EMPTY_PROFILE, ...(res.data || {}) });
        setError('');
      })
      .catch((err) => {
        setError(err.message || 'Gagal memuat profil Tenaga Kesehatan.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const updateProfileField = (key, value) => {
    setMessage('');
    setError('');
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving('profile');
    setMessage('');
    setError('');
    try {
      const payload = {
        nama: profile.nama,
        email: profile.email,
        no_hp: profile.no_hp,
        spesialisasi: profile.spesialisasi,
        lokasi: profile.lokasi,
        is_aktif: profile.is_aktif,
      };
      const res = await tenagaKesehatanService.updateProfile(payload);
      setProfile({ ...EMPTY_PROFILE, ...(res.data || {}) });
      setMessage('Profil profesional berhasil disimpan!');
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving('');
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (password.new_password !== password.confirm_password) {
      setError('Konfirmasi password baru tidak cocok.');
      return;
    }
    setSaving('password');
    setMessage('');
    setError('');
    try {
      await tenagaKesehatanService.changePassword(password);
      setPassword({ old_password: '', new_password: '', confirm_password: '' });
      setMessage('Password berhasil diperbarui!');
    } catch (err) {
      setError(err?.message || 'Gagal memperbarui password.');
    } finally {
      setSaving('');
    }
  };

  const tabs = [
    { id: 'profil', label: 'Profil Medis', icon: UserIcon },
    { id: 'keamanan', label: 'Keamanan Akun', icon: ShieldIcon },
  ];

  return (
    <PageContent>
      <DashboardHero
        title="Pengaturan"
        highlightedTitle="Portal"
        subtitle="Perbarui data diri profesional Anda atau ubah kata sandi akses Klinik Kampus."
        icon="settings"
        badges={[
          { label: 'Settings', active: true },
        ]}
      />

      {/* Success Alert */}
      {message && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-emerald-700 animate-in fade-in duration-200">
          <span className="material-symbols-outlined text-base">check_circle</span>
          <p className="text-xs font-bold">{message}</p>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-rose-50 px-5 py-4 text-rose-700 animate-in fade-in duration-200">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-base">error</span>
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">

        {/* Sidebar Tabs */}
        <aside className="space-y-2 lg:col-span-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setMessage('');
                  setError('');
                }}
                className={`flex w-full items-center gap-4 rounded-xl px-5 py-4 transition-all duration-200 ${activeTab === tab.id
                    ? 'bg-bku-primary text-white shadow-md shadow-bku-primary/10'
                    : 'border border-slate-200/60 bg-white text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <Icon />
                <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Form Content */}
        <section className="lg:col-span-9">
          <div className="overflow-hidden rounded-2xl border border-slate-200/60 bg-white shadow-sm glass-card">

            {loading ? (
              <div className="flex min-h-96 items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-bku-primary text-2xl">sync</span>
              </div>
            ) : (
              <>
                {activeTab === 'profil' && (
                  <form onSubmit={saveProfile}>
                    <div className="space-y-6 p-6">
                      <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 md:flex-row md:items-center">
                        <div className="flex size-20 items-center justify-center rounded-xl bg-bku-primary text-2xl font-black text-white shadow-inner overflow-hidden relative">
                          {profile.foto_url ? (
                            <img src={profile.foto_url} alt={profile.nama} className="w-full h-full object-cover" />
                          ) : (
                            <span className="material-symbols-outlined text-white/80" style={{ fontSize: '40px' }}>person</span>
                          )}
                        </div>
                        <div>
                          <h2 className="text-xs font-black font-headline uppercase tracking-widest text-slate-700">Identitas Medis</h2>
                          <p className="mt-1 max-w-xl text-[11px] font-semibold leading-relaxed text-slate-400">
                            Data profile ini akan ditampilkan pada sistem antrean booking konsultasi mahasiswa.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        <Field label="Nama Lengkap" icon={UserIcon}>
                          <input
                            value={profile.nama || ''}
                            required
                            onChange={(e) => updateProfileField('nama', e.target.value)}
                            className={FIELD_CLASS}
                          />
                        </Field>
                        <Field label="Email Dinas/Institusi" icon={MailIcon}>
                          <input
                            type="email"
                            value={profile.email || ''}
                            required
                            onChange={(e) => updateProfileField('email', e.target.value)}
                            className={FIELD_CLASS}
                          />
                        </Field>
                        <Field label="Spesialisasi Medis" icon={WorkIcon}>
                          <input
                            value={profile.spesialisasi || ''}
                            placeholder="Misal: Dokter Umum, Perawat Gigi"
                            onChange={(e) => updateProfileField('spesialisasi', e.target.value)}
                            className={FIELD_CLASS}
                          />
                        </Field>
                        <Field label="Nomor WhatsApp/HP" icon={PhoneIcon}>
                          <input
                            value={profile.no_hp || ''}
                            onChange={(e) => updateProfileField('no_hp', e.target.value)}
                            className={FIELD_CLASS}
                          />
                        </Field>
                        <Field label="Lokasi Praktik Klinik" icon={MapPinIcon}>
                          <input
                            value={profile.lokasi || ''}
                            onChange={(e) => updateProfileField('lokasi', e.target.value)}
                            className={FIELD_CLASS}
                          />
                        </Field>

                        <div className="md:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">Status Keaktifan Pelayanan</span>
                            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Jika dinonaktifkan, profil Anda tidak akan muncul untuk booking mahasiswa baru.</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={profile.is_aktif}
                              onChange={(e) => updateProfileField('is_aktif', e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:height-5 after:h-5 after:w-5 after:transition-all peer-checked:bg-bku-primary"></div>
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:justify-end">
                      <button
                        type="submit"
                        disabled={saving === 'profile'}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-bku-primary px-7 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-bku-primary/10 transition-all hover:bg-bku-hover hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                      >
                        {saving === 'profile' ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">save</span>}
                        Simpan Profil
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === 'keamanan' && (
                  <form onSubmit={savePassword}>
                    <div className="space-y-6 p-6">
                      <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 flex items-start gap-3">
                        <LockIcon className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <h2 className="text-xs font-black uppercase tracking-widest text-amber-800">Keamanan Kredensial</h2>
                          <p className="mt-1 text-[11px] font-semibold leading-relaxed text-amber-700">
                            Ganti password secara rutin untuk menjaga kerahasiaan akses rekam medis mahasiswa.
                          </p>
                        </div>
                      </div>

                      <div className="max-w-lg space-y-5">
                        <Field label="Password Saat Ini" icon={KeyIcon}>
                          <input
                            type="password"
                            required
                            value={password.old_password}
                            onChange={(e) => setPassword((prev) => ({ ...prev, old_password: e.target.value }))}
                            className={FIELD_CLASS}
                          />
                        </Field>
                        <Field label="Password Baru" icon={LockIcon}>
                          <input
                            type="password"
                            required
                            value={password.new_password}
                            onChange={(e) => setPassword((prev) => ({ ...prev, new_password: e.target.value }))}
                            className={FIELD_CLASS}
                            placeholder="Minimal 8 karakter"
                          />
                        </Field>
                        <Field label="Konfirmasi Password Baru" icon={LockIcon}>
                          <input
                            type="password"
                            required
                            value={password.confirm_password}
                            onChange={(e) => setPassword((prev) => ({ ...prev, confirm_password: e.target.value }))}
                            className={FIELD_CLASS}
                          />
                        </Field>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-5 sm:flex-row sm:justify-end">
                      <button
                        type="submit"
                        disabled={saving === 'password'}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-bku-primary px-7 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-md shadow-bku-primary/10 transition-all hover:bg-bku-hover hover:scale-[1.02] active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
                      >
                        {saving === 'password' ? <span className="material-symbols-outlined animate-spin text-sm">sync</span> : <span className="material-symbols-outlined text-sm">save</span>}
                        Simpan Password
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </section>
      </div>

    </PageContent>
  );
}

function Field({ label, icon: Icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 font-headline">
        <Icon />
        {label}
      </span>
      {children}
    </label>
  );
}
