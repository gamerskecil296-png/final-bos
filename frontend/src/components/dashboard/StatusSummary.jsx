import React from 'react';
import { NavLink } from 'react-router-dom';

export default function StatusSummary({ kencana, beasiswa, voice, kesehatan, kesehatanLoading }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-4 w-1.5 rounded-full bg-primary" />
        <h2 className="text-sm font-semibold text-text-muted">Status & Progress</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card A: KENCANA */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
              <span className="material-symbols-outlined text-[20px]">school</span>
            </div>
            {kencana?.status === 'Selesai ✓' ? (
              <span className="flex items-center gap-1 px-2.5 py-0.5 bg-success/10 text-success border border-success/20 rounded-full text-[10px] font-bold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span> Selesai
              </span>
            ) : (
              <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[10px] font-bold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[10px]">schedule</span> {kencana?.status}
              </span>
            )}
          </div>
          <h3 className="font-bold text-base mb-3 text-on-surface">KENCANA</h3>
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-xs font-bold text-text-muted">
              <span>Progress Modul</span>
              <span>{Math.round(kencana?.persentase || 0)}%</span>
            </div>
            <div className="h-2 w-full bg-background rounded-full overflow-hidden">
               <div 
                 className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-1000" 
                 style={{ width: `${kencana?.persentase || 0}%` }}
               />
            </div>
            <p className="text-[10px] text-text-muted font-bold uppercase tracking-wide leading-none pt-1">
              {kencana?.modul_selesai} dari {kencana?.total_modul} modul selesai
            </p>
          </div>
          <NavLink to="/student/kencana" className="flex items-center justify-between py-1 text-xs font-bold text-primary hover:underline group/btn">
            Lanjutkan 
            <span className="material-symbols-outlined text-[16px] translate-x-0 group-hover/btn:translate-x-0.5 transition-transform">chevron_right</span>
          </NavLink>
        </div>

        {/* Card B: Beasiswa */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center border border-primary/20 shrink-0">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            {beasiswa?.total_tersedia > 0 ? (
              <span className="px-2.5 py-0.5 bg-success/10 text-success border border-success/20 rounded-full text-[10px] font-bold uppercase tracking-wide">
                Terbuka
              </span>
            ) : (
              <span className="px-2.5 py-0.5 bg-error/10 text-error border border-error/20 rounded-full text-[10px] font-bold uppercase tracking-wide">
                Tutup
              </span>
            )}
          </div>
          <h3 className="font-bold text-base mb-1 text-on-surface">Beasiswa</h3>
          <p className="text-xs font-semibold text-text-muted mb-4">Program Beasiswa Aktif</p>
          <div className="flex items-end gap-2 mb-5">
            <span className="text-3xl font-black text-on-surface leading-none font-headline">{beasiswa?.total_tersedia || 0}</span>
            <span className="text-xs font-bold text-text-muted mb-1 italic">Beasiswa Tersedia</span>
          </div>
          <NavLink to="/student/scholarship" className="flex items-center justify-between py-1 text-xs font-bold text-primary hover:underline group/btn">
            Lihat Beasiswa 
            <span className="material-symbols-outlined text-[16px] translate-x-0 group-hover/btn:translate-x-0.5 transition-transform">chevron_right</span>
          </NavLink>
        </div>

        {/* Card C: Student Voice */}
        <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 bg-secondary/10 text-secondary rounded-xl flex items-center justify-center border border-secondary/20 shrink-0">
              <span className="material-symbols-outlined text-[20px]">chat</span>
            </div>
            {voice?.jumlah_belum_direspons > 0 && (
              <span className="flex items-center gap-1 px-2.5 py-0.5 bg-error/10 text-error border border-error/20 rounded-full text-[10px] font-bold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[10px]">warning</span> {voice?.jumlah_belum_direspons} Belum Respons
              </span>
            )}
          </div>
          <h3 className="font-bold text-base mb-1 text-on-surface">Aspirasi</h3>
          <p className="text-xs font-semibold text-text-muted mb-4">Kelola Laporan & Saran</p>
          <div className="flex items-end gap-2 mb-5">
            <span className="text-3xl font-black text-on-surface leading-none font-headline">{voice?.jumlah_aktif || 0}</span>
            <span className="text-xs font-bold text-text-muted mb-1 italic">Tiket Masih Terbuka</span>
          </div>
          <NavLink to="/student/voice" className="flex items-center justify-between py-1 text-xs font-bold text-primary hover:underline group/btn">
            Lihat Tiket 
            <span className="material-symbols-outlined text-[16px] translate-x-0 group-hover/btn:translate-x-0.5 transition-transform">chevron_right</span>
          </NavLink>
        </div>

        {/* Card D: Health Screening */}
        {(() => {
          const status = kesehatan?.status_kesehatan || null;
          const bmi = kesehatan?.bmi;
          const berat = kesehatan?.berat_badan;
          const tinggi = kesehatan?.tinggi_badan;

          let badgeText = 'FIT / SEHAT';
          let badgeBg = 'bg-success/10 border-success/20';
          let badgeText2 = 'text-success';
          let badgeIcon = <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>;
          let iconBg = 'bg-success/10 border-success/20 border';
          let iconColor = 'text-success';
          let mainValue = 'Sehat';

          if (kesehatan) {
            const s = (status || 'sehat').toLowerCase();
            if (s.includes('bahaya') || s.includes('tindak')) {
              badgeText = 'PERLU TINDAKAN';
              badgeBg = 'bg-error/10 border-error/20';
              badgeText2 = 'text-error';
              badgeIcon = <span className="material-symbols-outlined text-[10px]">warning</span>;
              iconBg = 'bg-error/10 border-error/20 border';
              iconColor = 'text-error';
              mainValue = 'Perhatian';
            } else if (s.includes('pantauan') || s.includes('observasi') || s.includes('waspada')) {
              badgeText = 'PANTAUAN';
              badgeBg = 'bg-warning/10 border-warning/20';
              badgeText2 = 'text-warning';
              badgeIcon = <span className="material-symbols-outlined text-[10px]">warning</span>;
              iconBg = 'bg-warning/10 border-warning/20 border';
              iconColor = 'text-warning';
              mainValue = 'Waspada';
            } else {
              mainValue = 'Sehat';
            }
          }

          const bmiLabel = bmi
            ? (() => {
                const v = parseFloat(bmi);
                if (v < 18.5) return { txt: 'Kekurangan BB', color: 'text-primary' };
                if (v < 25)   return { txt: 'Normal', color: 'text-success' };
                if (v < 30)   return { txt: 'Kelebihan BB', color: 'text-warning' };
                return { txt: 'Obesitas', color: 'text-error' };
              })()
            : null;

          const subtitle = berat && tinggi
            ? `BB ${berat} kg · TB ${tinggi} cm`
            : 'Pemantauan Health Screening';

          const bmiDisplay = bmi ? bmi.toFixed(1) : null;

          return (
            <div className="bg-surface p-5 rounded-xl border border-border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden group">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-10 h-10 ${iconBg} ${iconColor} rounded-xl flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-[20px]">monitor_heart</span>
                </div>
                {kesehatanLoading ? (
                  <div className="h-5 w-20 bg-background rounded-full animate-pulse" />
                ) : (
                  <span className={`flex items-center gap-1 px-2.5 py-0.5 ${badgeBg} ${badgeText2} rounded-full text-[10px] font-bold uppercase tracking-wide border`}>
                    {badgeIcon} {badgeText}
                  </span>
                )}
              </div>
              <h3 className="font-bold text-base mb-1 text-on-surface">Kesehatan</h3>
              <p className="text-xs font-semibold text-text-muted mb-4">{subtitle}</p>
              {kesehatanLoading ? (
                <div className="space-y-2 mb-5">
                  <div className="h-8 w-24 bg-background rounded animate-pulse" />
                </div>
              ) : (
                <div className="flex items-end gap-2 mb-4">
                  <span className={`text-3xl font-black leading-none ${kesehatan ? bmiLabel?.color || 'text-on-surface' : 'text-text-muted'} font-headline`}>
                    {bmiDisplay ? bmiDisplay : mainValue}
                  </span>
                  <span className="text-xs font-bold text-text-muted mb-1 italic">
                    {bmiDisplay ? `BMI · ${bmiLabel?.txt || ''}` : 'Hasil Terakhir'}
                  </span>
                </div>
              )}
              <NavLink to="/student/health" className="flex items-center justify-between py-1 text-xs font-bold text-primary hover:underline group/btn">
                Cek Riwayat 
                <span className="material-symbols-outlined text-[16px] translate-x-0 group-hover/btn:translate-x-0.5 transition-transform">chevron_right</span>
              </NavLink>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
