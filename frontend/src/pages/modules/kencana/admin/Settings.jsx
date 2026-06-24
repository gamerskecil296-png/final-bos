import React from 'react';
import useAuthStore from '@/store/useAuthStore';
import { PageHeader } from '@/components/ui/page/PageHeader';
import { usePeriodsQuery } from '@/queries/useKencanaAdminQuery';

const Settings = ({ portalType = 'admin' }) => {
  const { user } = useAuthStore();
  const { data: periods } = usePeriodsQuery();

  const isFakultasPortal = portalType === 'faculty' || portalType === 'fakultas';
  const activePeriod = (periods || []).find(p => p.is_active) || periods?.[0] || null;

  // Derive administrative role name
  const userRole = String(user?.role || user?.Role || '').toLowerCase();
  let roleName = 'Root Administrator';
  if (userRole === 'kencana_admin') roleName = 'Admin Universitas (Pusat)';
  if (userRole === 'kencana_fakultas' || userRole.includes('faculty') || userRole.includes('fakultas')) roleName = 'Admin Fakultas';

  // Extract faculty info if applicable
  const facultyName = user?.fakultas?.nama || user?.Fakultas?.Nama || (user?.fakultas_id ? `Fakultas ID: ${user.fakultas_id}` : '-');

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon="settings"
        title={
          <>
            <span className="text-[var(--theme-text)]">Pengaturan </span>
            <span className="text-[var(--theme-primary)]">Sistem Kencana</span>
          </>
        }
        subtitle="Informasi dan konfigurasi akun administratif Anda pada portal PKKMB."
        breadcrumbs={[
          { label: isFakultasPortal ? 'Kencana Fakultas' : 'Kencana Admin', path: '#' },
          { label: 'Pengaturan' }
        ]}
      />

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <aside className="rounded-2xl border border-[var(--theme-border)] bg-white p-6 shadow-sm flex flex-col justify-between h-fit">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--theme-primary-light)] text-2xl font-bold text-[var(--theme-primary)] border border-[var(--theme-primary-light)] shadow-sm">
              <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>
                shield_person
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-[var(--theme-text)] uppercase tracking-tight">
                {isFakultasPortal ? 'Admin Fakultas' : 'Admin Pusat'}
              </h2>
              <p className="truncate text-xs font-semibold text-[var(--theme-text-muted)] mt-1">{user?.email || user?.Email || 'Email tidak tersedia'}</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-sm border-t border-[var(--theme-border-muted)] pt-6">
            <Info label="Level Otoritas" value={roleName} />
            {isFakultasPortal && <Info label="Lingkup Fakultas" value={facultyName} />}
            <Info label="Periode Aktif" value={activePeriod ? activePeriod.name : 'Belum Ada'} />
          </div>
        </aside>

        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--theme-border)] bg-white p-8 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-[var(--theme-primary)] pointer-events-none">
                <span className="material-symbols-outlined" style={{ fontSize: '180px' }}>admin_panel_settings</span>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-4 border-b border-[var(--theme-border-muted)] pb-6 mb-8">
                  <div className="size-10 rounded-xl bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)] border border-[var(--theme-primary-light)] shrink-0">
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
                  </div>
                  <div>
                      <h3 className="text-sm font-black font-headline uppercase tracking-tight text-[var(--theme-text)]">Detail Akses & Konfigurasi</h3>
                      <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest mt-1">Status dan Batasan Operasional Akun</p>
                  </div>
              </div>

              <div className="space-y-8">
                  <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 font-headline">Manajemen Identitas</label>
                      <div className="p-4 rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-bg)] flex items-start gap-4">
                        <span className="material-symbols-outlined text-[var(--theme-text-muted)] mt-0.5">info</span>
                        <div>
                          <p className="text-xs font-bold text-[var(--theme-text)]">Pembaruan Profil Administrator</p>
                          <p className="text-[11px] font-medium text-[var(--theme-text-muted)] mt-1">
                            Akun Anda adalah akun administratif yang melekat pada RBAC Sistem Utama Siakad. Untuk mengubah kata sandi atau memperbarui email, silakan gunakan panel <strong className="text-[var(--theme-primary)]">Pengaturan Profil</strong> di menu utama (Super Admin/Fakultas).
                          </p>
                        </div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      <label className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest ml-1 font-headline">Status Node Aktif</label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50 flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">verified</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">Koneksi Database</p>
                            <p className="text-xs font-black text-emerald-800">Sinkron & Stabil</p>
                          </div>
                        </div>
                        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50 flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[16px]">sync</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-0.5">Timeline Kencana</p>
                            <p className="text-xs font-black text-blue-800">{activePeriod ? 'Sedang Berjalan' : 'Tidak Ada Periode'}</p>
                          </div>
                        </div>
                      </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
