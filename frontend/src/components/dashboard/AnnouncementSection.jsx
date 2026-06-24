import React from 'react';
import { ArrowRight, Info, Calendar } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { PageCard, PageCardHeader } from '@/components/ui/page';

const KATEGORI_STYLES = {
  umum: 'bg-sky-50 text-sky-600 border-sky-200',
  akademik: 'bg-purple-50 text-purple-600 border-purple-200',
  kemahasiswaan: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  urgent: 'bg-red-50 text-red-600 border-red-200',
  event: 'bg-amber-50 text-amber-600 border-amber-200',
  beasiswa: 'bg-blue-50 text-blue-600 border-blue-200',
};

export default function AnnouncementSection({ announcements }) {
  const getKelasKategori = (kat) => {
    const k = (kat || '').toLowerCase();
    return KATEGORI_STYLES[k] || 'bg-slate-50 text-slate-600 border-slate-200';
  };

  return (
    <PageCard className="mb-6">
      <PageCardHeader 
        title="Berita"
        icon="feed"
        action={
          <NavLink to="/student/notifikasi" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group">
            Lihat Semua
            <ArrowRight size={14} className="translate-x-0 group-hover:translate-x-1 transition-all" />
          </NavLink>
        }
      />

      {announcements?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
          {announcements.map((item, idx) => {
            const kategori = item.kategori || 'Umum';
            const judul = item.judul || 'Berita';
            const isi = item.isi_singkat || '';
            const tanggal = item.tanggal || '';
            const gambar = item.gambar_url || '';

            return (
              <NavLink
                key={idx}
                to={item.link || '/student/notifikasi'}
                className="flex flex-col h-full rounded-2xl bg-white border border-slate-100 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_20px_rgba(0,0,0,0.04)] hover:border-primary/20 transition-all duration-500 hover:-translate-y-1 group/item overflow-hidden"
              >
                {gambar && (
                  <div className="h-40 bg-slate-100 overflow-hidden shrink-0">
                    <img
                      src={gambar}
                      alt={judul}
                      className="w-full h-full object-cover group-hover/item:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}
                <div className="flex flex-col flex-1 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getKelasKategori(kategori)}`}>
                      {kategori}
                    </span>
                    {tanggal && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400">
                        <Calendar size={10} />
                        {new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold font-headline text-[15px] mb-2 text-slate-800 group-hover/item:text-primary transition-colors line-clamp-2 leading-snug">
                    {judul}
                  </h4>
                  {isi && (
                    <p className="text-[13px] text-slate-500 font-medium leading-relaxed line-clamp-3 mb-4 flex-1">
                      {isi}
                    </p>
                  )}
                  <div className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary mt-auto w-max">
                    Baca Selengkapnya <ArrowRight size={14} className="group-hover/item:translate-x-1 transition-transform" />
                  </div>
                </div>
              </NavLink>
            );
          })}
        </div>
      ) : (
        <div className="py-16 text-center flex flex-col items-center justify-center opacity-40">
           <Info size={48} className="text-text-muted/40 mb-4" />
           <p className="font-bold text-text-muted">Belum ada berita terbaru.</p>
        </div>
      )}
    </PageCard>
  );
}
