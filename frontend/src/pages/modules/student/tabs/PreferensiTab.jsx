import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { toast } from 'react-hot-toast';


import { Switch } from '@/components/ui/Switch';
import { Label } from '@/components/ui/Label';

const NOTIF_CATEGORIES = [
  { id: 'EmailAchievement', label: 'Prestasi', desc: 'Update verifikasi dan penolakan laporan prestasi.', icon: 'emoji_events', color: 'text-[var(--theme-primary)] bg-[var(--theme-primary-light)]' },
  { id: 'EmailBeasiswa', label: 'Beasiswa', desc: 'Perubahan status pengajuan dan pengingat deadline beasiswa.', icon: 'menu_book', color: 'text-[#0B4FAE] bg-[var(--theme-primary-light)]' },
  { id: 'EmailCounseling', label: 'Konseling', desc: 'Konfirmasi booking dan pengingat sesi konseling.', icon: 'handshake', color: 'text-[#1D4E9E] bg-[#EDF3FF]' },
  { id: 'EmailVoice', label: 'Student Voice', desc: 'Notifikasi saat aspirasi atau pengaduanmu direspons admin.', icon: 'forum', color: 'text-[#113A80] bg-[#F3F7FF]' },
  { id: 'EmailKencana', label: 'KENCANA', desc: 'Pengingat kuis dan materi yang belum diselesaikan.', icon: 'school', color: 'text-[#294D8D] bg-[var(--theme-primary-light)]' },
  { id: 'EmailNews', label: 'Pengumuman Kampus', desc: 'Berita dan informasi terbaru dari pihak universitas.', icon: 'notifications', color: 'text-[#2A4C86] bg-[#EDF3FF]' },
];

export default function PreferensiTab() {
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery({
    queryKey: ['profil', 'preferensi-notif-local'],
    queryFn: async () => {
      // Simulate network delay for UX consistency
      await new Promise(r => setTimeout(r, 400));
      const localPrefs = localStorage.getItem('bku_notif_prefs');
      if (localPrefs) {
         return JSON.parse(localPrefs);
      }
      return {
         EmailAchievement: true,
         EmailBeasiswa: true,
         EmailCounseling: true,
         EmailVoice: true,
         EmailKencana: true,
         EmailNews: true,
      };
    }
  });

  const mutation = useMutation({
    mutationFn: async (updatedData) => {
      await new Promise(r => setTimeout(r, 300));
      localStorage.setItem('bku_notif_prefs', JSON.stringify(updatedData));
      return updatedData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['profil', 'preferensi-notif-local']);
      toast.success('Preferensi notifikasi disimpan secara lokal');
    },
  });

  const handleToggle = (id, prevValue) => {
    const updated = { ...prefs, [id]: !prevValue };
    mutation.mutate(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="material-symbols-outlined animate-spin text-[var(--theme-primary)]" style={{ fontSize: '32px' }} >sync</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-5 lg:p-5">
      
      {/* Section: In-App Notifications (Locked) */}
      <div className="border-b border-[var(--theme-border-muted)] pb-6">
         <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Notifikasi Dalam Aplikasi</h2>
         <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Pemberitahuan real-time melalui panel navigasi aplikasi.</p>
         
          <div className="bg-background p-5 rounded-2xl border border-[var(--theme-border-muted)] flex items-center justify-between">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-surface rounded-xl shadow-sm flex items-center justify-center text-[var(--theme-primary)]">
                   <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >settings</span>
                </div>
               <div>
                  <h4 className="font-bold text-sm">Semua Notifikasi Sistem</h4>
                  <p className="text-xs font-medium text-[#a3a3a3]">Selalu mendapatkan update dari portal BKU Student Hub.</p>
               </div>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black uppercase text-[#a3a3a3] tracking-widest bg-white px-2 py-0.5 rounded-lg">Wajib Aktif</span>
               <Switch checked={true} disabled />
            </div>
         </div>
      </div>

      {/* Section: Email Notifications */}
      <div className="pb-2">
         <h2 className="text-sm font-black font-headline uppercase tracking-widest mb-1" style={{ color: 'var(--theme-h2)' }}>Notifikasi Email</h2>
         <p className="text-xs font-semibold leading-relaxed text-[var(--theme-text-muted)] mb-6">Pilih kategori update yang ingin diteruskan ke email Anda.</p>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {NOTIF_CATEGORIES.map((cat) => (
                <div key={cat.id} className="p-4 rounded-2xl border border-[var(--theme-border-muted)] hover:border-[var(--theme-primary-light)] transition-all flex items-start justify-between group">
                  <div className="flex items-start gap-4">
                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.color}`}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{cat.icon}</span>
                     </div>
                     <div className="flex flex-col gap-0.5">
                        <Label htmlFor={cat.id} className="cursor-pointer font-bold text-sm group-hover:text-[var(--theme-primary)] transition-colors">{cat.label}</Label>
                        <p className="text-xs font-medium text-[#a3a3a3] leading-relaxed max-w-[240px]">{cat.desc}</p>
                     </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                     <Switch 
                       id={cat.id} 
                       checked={prefs?.[cat.id]} 
                       onCheckedChange={() => handleToggle(cat.id, prefs?.[cat.id])} 
                       disabled={mutation.isPending}
                     />
                  </div>
               </div>
            ))}
         </div>

          <div className="mt-8 p-5 rounded-2xl bg-[var(--theme-primary-light)] border border-[var(--theme-primary-light)] flex items-start gap-3">
             <span className="material-symbols-outlined text-[var(--theme-primary)] shrink-0 mt-0.5" style={{ fontSize: 18 }}>info</span>
             <p className="text-xs font-medium text-[var(--theme-primary)] leading-relaxed">
                <strong>Catatan:</strong> Perubahan preferensi akan segera diterapkan. Kami menyarankan untuk tetap mengaktifkan notifikasi <strong>Beasiswa</strong> dan <strong>Konseling</strong> agar kamu tidak melewatkan informasi penting.
             </p>
          </div>
      </div>

    </div>
  );
}
