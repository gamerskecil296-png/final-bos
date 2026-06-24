import React, { useEffect, useMemo, useState } from 'react';
import { UI } from '@/constants/designSystem';
import { psychologistService } from '@/services/api';
import { DashboardHero } from '@/components/ui/dashboard';
import { PageContent } from '@/components/ui/page';
import { cn } from '@/lib/utils';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Lock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>lock</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const User = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person</span>;
const Mail = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>mail</span>;
const Phone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>phone</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Shield = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>security</span>;
const Briefcase = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>work</span>;
const MapPin = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>location_on</span>;
const Languages = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>language</span>;
const DollarSign = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>attach_money</span>;
const Globe = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>public</span>;
const Key = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>vpn_key</span>;



const EMPTY_PROFILE = {
  nama: '',
  email: '',
  spesialisasi: '',
  no_hp: '',
  bio: '',
  lokasi: '',
  bahasa: '',
  is_aktif: true,
};

const DAYS = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
const FIELD_CLASS = 'w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-3 text-sm font-semibold text-[var(--theme-text)] outline-none transition-all focus:border-[var(--theme-primary)] focus:bg-[var(--theme-surface)] focus:ring-4 focus:ring-[var(--theme-primary-light)] placeholder-[var(--theme-text-subtle)]';

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return parts.map(p => p[0]).slice(0, 2).join('').toUpperCase();
};

export default function PsychologistSettings() {
  const [activeTab, setActiveTab] = useState('profil');
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [password, setPassword] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    Promise.all([psychologistService.getMe()])
      .then(([profileRes]) => {
        if (!mounted) return;
        setProfile({ ...EMPTY_PROFILE, ...(profileRes.data || {}) });
      })
      .catch((err) => {
        if (mounted) setError(err?.message || 'Gagal memuat pengaturan.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const tabs = [
    { id: 'profil', label: 'Profil Publik', icon: User },
    { id: 'keamanan', label: 'Keamanan', icon: Shield },
  ];

  const updateProfileField = (key, value) => {
    setMessage('');
    setError('');
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async () => {
    setSaving('profile');
    setMessage('');
    setError('');
    try {
      const payload = { ...profile };
      const res = await psychologistService.updateProfile(payload);
      setProfile({ ...EMPTY_PROFILE, ...(res.data || {}) });
      setMessage('Profil berhasil disimpan ke psikolog.profiles.');
    } catch (err) {
      setError(err?.message || 'Gagal menyimpan profil.');
    } finally {
      setSaving('');
    }
  };

  const savePassword = async () => {
    setSaving('password');
    setMessage('');
    setError('');
    try {
      await psychologistService.changePassword(password);
      setPassword({ old_password: '', new_password: '', confirm_password: '' });
      setMessage('Password berhasil diperbarui di public.users.');
    } catch (err) {
      setError(err?.message || 'Gagal memperbarui password.');
    } finally {
      setSaving('');
    }
  };

  return (
    <div className="w-full relative space-y-6 min-h-screen bg-transparent font-inter pb-8">
      {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <DashboardHero
        title="Pengaturan"
        highlightedTitle="Akun"
        subtitle="Profil tersimpan di psikolog.profiles dan password di public.users."
        icon="settings"
        badges={[{ label: 'Settings', active: false }]}
      />

          {message && (
            <div className="flex items-center gap-3 rounded-2xl border border-[var(--theme-success)]/20 bg-[var(--theme-success-light)] px-5 py-4 text-[var(--theme-success)]">
              <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
              <p className="text-sm font-semibold">{message}</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-3 rounded-2xl border border-[var(--theme-error)]/20 bg-[var(--theme-error-light)] px-5 py-4 text-[var(--theme-error)]">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-lg">error</span>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <aside className="space-y-2 lg:col-span-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex w-full items-center gap-4 rounded-2xl px-5 py-4 transition-all cursor-pointer active:scale-95 border",
                    activeTab === tab.id 
                      ? 'bg-[var(--theme-primary)] text-white shadow-lg shadow-[var(--theme-primary)]/20 border-transparent' 
                      : 'border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] bg-[var(--theme-surface)] hover:text-[var(--theme-text)]'
                  )}
                >
                  <tab.icon size={20} className={activeTab === tab.id ? 'text-white' : 'text-[var(--theme-text-subtle)]'} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{tab.label}</span>
                </button>
              ))}
            </aside>

            <section className="lg:col-span-9">
              <div className="overflow-hidden rounded-2xl border shadow-sm" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                {loading ? (
                  <div className="flex min-h-96 items-center justify-center">
                    <span className="material-symbols-outlined animate-spin text-primary text-3xl shrink-0">sync</span>
                  </div>
                ) : (
                  <>
                    {activeTab === 'profil' && (
                      <div className="space-y-6 p-5 lg:p-5">
                        <div className="flex flex-col gap-5 border-b border-[var(--theme-border-muted)] pb-6 md:flex-row md:items-center">
                          <div className="flex size-28 items-center justify-center rounded-2xl bg-[var(--theme-primary)] text-3xl font-black text-white shadow-lg shadow-[var(--theme-primary)]/20 overflow-hidden relative">
                            {getInitials(profile.nama)}
                          </div>
                          <div>
                            <h2 className="text-sm font-black font-headline uppercase tracking-widest" style={{ color: 'var(--theme-h2)' }}>Identitas Profesional</h2>
                            <p className="mt-1 max-w-xl text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)]">
                              Data ini digunakan oleh portal booking mahasiswa dan dashboard psikolog.
                            </p>

                          </div>
                        </div>

                        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                          <Field label="Nama Lengkap" icon={User}>
                            <input value={profile.nama || ''} onChange={(e) => updateProfileField('nama', e.target.value)} className={FIELD_CLASS} />
                          </Field>
                          <Field label="Email Institusi" icon={Mail}>
                            <input value={profile.email || ''} onChange={(e) => updateProfileField('email', e.target.value)} className={FIELD_CLASS} />
                          </Field>
                          <Field label="Spesialisasi" icon={Briefcase}>
                            <input value={profile.spesialisasi || ''} onChange={(e) => updateProfileField('spesialisasi', e.target.value)} className={FIELD_CLASS} />
                          </Field>
                          <Field label="Nomor Telepon" icon={Phone}>
                            <input value={profile.no_hp || ''} onChange={(e) => updateProfileField('no_hp', e.target.value)} className={FIELD_CLASS} />
                          </Field>
                          <Field label="Lokasi Praktik" icon={MapPin}>
                            <input value={profile.lokasi || ''} onChange={(e) => updateProfileField('lokasi', e.target.value)} className={FIELD_CLASS} />
                          </Field>
                          <Field label="Bahasa" icon={Languages}>
                            <input value={profile.bahasa || ''} onChange={(e) => updateProfileField('bahasa', e.target.value)} className={FIELD_CLASS} placeholder="Indonesia, Inggris" />
                          </Field>

                          <div className="md:col-span-2">
                            <Field label="Bio Profesional" icon={Globe}>
                              <textarea
                                value={profile.bio || ''}
                                onChange={(e) => updateProfileField('bio', e.target.value)}
                                className={`${FIELD_CLASS} min-h-32 resize-none`}
                              />
                            </Field>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'keamanan' && (
                      <div className="space-y-6 p-5 lg:p-5">
                        <div className="rounded-2xl border border-[var(--theme-warning)]/20 bg-[var(--theme-warning-light)] p-5">
                          <div className="flex items-start gap-3">
                            <Lock size={22} className="mt-0.5 text-[var(--theme-warning)]" />
                            <div>
                              <h2 className="text-xs font-black uppercase tracking-widest text-[var(--theme-warning)]">Keamanan Akun</h2>
                              <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--theme-warning)]/80">
                                Perubahan password langsung memperbarui hash password akun psikolog di database.
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="max-w-lg space-y-5">
                          <Field label="Password Saat Ini" icon={Key}>
                            <input
                              type="password"
                              value={password.old_password}
                              onChange={(e) => setPassword((prev) => ({ ...prev, old_password: e.target.value }))}
                              className={FIELD_CLASS}
                            />
                          </Field>
                          <Field label="Password Baru" icon={Lock}>
                            <input
                              type="password"
                              value={password.new_password}
                              onChange={(e) => setPassword((prev) => ({ ...prev, new_password: e.target.value }))}
                              className={FIELD_CLASS}
                              placeholder="Minimal 8 karakter"
                            />
                          </Field>
                          <Field label="Konfirmasi Password Baru" icon={Lock}>
                            <input
                              type="password"
                              value={password.confirm_password}
                              onChange={(e) => setPassword((prev) => ({ ...prev, confirm_password: e.target.value }))}
                              className={FIELD_CLASS}
                            />
                          </Field>
                        </div>
                      </div>
                    )}


                    <div className="flex flex-col gap-3 border-t px-6 py-5 sm:flex-row sm:justify-end" style={{ borderColor: 'var(--theme-border)', backgroundColor: 'var(--theme-bg)' }}>
                      {activeTab === 'keamanan' ? (
                        <button
                          type="button"
                          onClick={savePassword}
                          disabled={saving === 'password'}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-7 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--theme-primary)]/20 transition-all hover:bg-[var(--theme-primary-hover)] active:scale-95 disabled:cursor-wait disabled:opacity-70 border-none cursor-pointer"
                        >
                          {saving === 'password' ? <span className="material-symbols-outlined animate-spin text-base shrink-0">sync</span> : <span className="material-symbols-outlined text-base shrink-0">save</span>}
                          Simpan Password
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={saveProfile}
                          disabled={saving === 'profile'}
                          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--theme-primary)] px-7 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--theme-primary)]/20 transition-all hover:bg-[var(--theme-primary-hover)] active:scale-95 disabled:cursor-wait disabled:opacity-70 border-none cursor-pointer"
                        >
                          {saving === 'profile' ? <span className="material-symbols-outlined animate-spin text-base shrink-0">sync</span> : <span className="material-symbols-outlined text-base shrink-0">save</span>}
                          Simpan Profil
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">
        {React.createElement(icon, { size: 13, className: "text-[var(--theme-text-subtle)]" })}
        {label}
      </span>
      {children}
    </label>
  );
}


