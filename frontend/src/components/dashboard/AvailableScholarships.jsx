import React from 'react';
import { useScholarshipKatalogQuery } from '../../queries/useScholarshipQuery';
import { NavLink } from 'react-router-dom';
import { ArrowRight, Wallet, Calendar } from 'lucide-react';
import { PageCard, PageCardHeader } from '@/components/ui/page';

const formatRupiah = (number) => {
  if (number === undefined || number === null || isNaN(number)) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(number);
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
};

export default function AvailableScholarships() {
  const { data: katalog, isLoading } = useScholarshipKatalogQuery({ kategori: 'Semua', sort: 'deadline_asc' });

  if (isLoading) {
    return (
      <PageCard className="mb-6 animate-pulse">
        <div className="h-6 w-48 bg-background rounded-lg mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-background/50 rounded-2xl"></div>
          ))}
        </div>
      </PageCard>
    );
  }

  // Show only open/available scholarships (max 3 for dashboard display)
  const openScholarships = katalog?.slice(0, 3) || [];

  if (openScholarships.length === 0) return null;

  return (
    <PageCard className="mb-6">
      <PageCardHeader 
        title="Beasiswa yang Tersedia"
        icon="workspace_premium"
        action={
          <NavLink to="/student/scholarship" className="text-xs font-bold text-primary hover:underline flex items-center gap-1 group">
            Lihat Semua
            <ArrowRight size={14} className="translate-x-0 group-hover:translate-x-1 transition-all" />
          </NavLink>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {openScholarships.map((beasiswa) => {
          const id = beasiswa.id || beasiswa.ID;
          const nama = beasiswa.nama || beasiswa.Nama || '';
          const penyelenggara = beasiswa.penyelenggara || beasiswa.Penyelenggara || '';
          const kategori = beasiswa.kategori || beasiswa.Kategori || 'Internal';
          const nilaiBantuan = beasiswa.nilai_bantuan || beasiswa.NilaiBantuan || 0;
          const deadline = beasiswa.deadline || beasiswa.Deadline;

          return (
            <div key={id} className="group/item flex flex-col justify-between p-5 rounded-2xl border border-border hover:border-primary/40 hover:shadow-md transition-all bg-background/50 relative">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                    kategori === 'Internal' ? 'bg-primary/10 text-primary border-primary/20' :
                    kategori === 'Mitra' ? 'bg-secondary/10 text-secondary border-secondary/20' :
                    kategori === 'Prestasi' ? 'bg-warning/10 text-warning border-warning/20' :
                    'bg-success/10 text-success border-success/20'
                  }`}>
                    {kategori}
                  </span>
                </div>
                <h4 className="font-bold text-base mb-1 group-hover/item:text-primary transition-colors line-clamp-1">{nama}</h4>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-wider mb-4">{penyelenggara}</p>
              </div>

              <div className="space-y-2 pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Wallet size={14} className="text-success" />
                  <span className="font-semibold">{formatRupiah(nilaiBantuan)}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-text-muted">
                  <Calendar size={14} className="text-error" />
                  <span>Hingga {formatDate(deadline)}</span>
                </div>
              </div>

              <div className="mt-4">
                <NavLink 
                  to="/student/scholarship"
                  className="w-full bg-primary text-white py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 hover:opacity-90 transition-all"
                >
                  Daftar Sekarang <ArrowRight size={12} />
                </NavLink>
              </div>
            </div>
          );
        })}
      </div>
    </PageCard>
  );
}
