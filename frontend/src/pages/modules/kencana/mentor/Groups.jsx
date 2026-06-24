import React, { useState, useEffect } from 'react';
import useAuthStore from '@/store/useAuthStore';
import { useNavigate } from 'react-router-dom';
import { useMentorGroupsQuery } from '@/queries/useKencanaMentorQuery';
import { PageHeader } from '@/components/ui/page/PageHeader';

const Groups = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  
  const { data: groups, isLoading } = useMentorGroupsQuery({ search });

  useEffect(() => {
    if (groups?.length) {
      navigate(`/app/kencana/mentor/groups/${groups[0].id}`, { replace: true });
    }
  }, [groups, navigate]);

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon="groups"
        title={
          <>
            <span className="text-[var(--theme-text)]">Kelompok </span>
            <span className="text-[var(--theme-primary)]">Kencana</span>
          </>
        }
        subtitle="Kelola kelompok bimbingan yang Anda ampu dan pantau keaktifan anggotanya."
        breadcrumbs={[
          { label: 'Kencana Mentor', path: '#' },
          { label: 'Kelompok Saya' }
        ]}
      />

      <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--theme-border-muted)] flex flex-col md:flex-row gap-3 md:items-center justify-between bg-[var(--theme-bg)]">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Cari nama/kode kelompok..." 
              className="px-4 h-10 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-sm font-semibold outline-none flex-1 max-w-md focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all" 
            />
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {isLoading ? (
            <div className="col-span-full py-16 text-center font-bold text-[var(--theme-text-muted)]">Memuat kelompok...</div>
          ) : groups?.length ? (
            groups.map(group => (
              <div key={group.id} className="rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-5 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest">KELOMPOK {group.group_number || '-'} • {group.code || 'Tanpa Kode'}</p>
                      <h3 className="text-base font-bold text-[var(--theme-text)] mt-1">{group.name}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-[var(--theme-primary-light)] text-[var(--theme-primary)] text-[10px] font-bold uppercase border border-[var(--theme-primary-light)]">{group.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 my-4 text-center">
                    <div className="bg-white rounded-xl p-3 border border-[var(--theme-border)]">
                      <p className="text-lg font-bold text-[var(--theme-text)]">{group.members_count || 0}</p>
                      <p className="text-[10px] font-bold text-[var(--theme-text-muted)]">Anggota</p>
                    </div>
                    <div className="bg-white rounded-xl p-3 border border-[var(--theme-border)]">
                      <p className="text-lg font-bold text-[var(--theme-text)]">{group.capacity || 0}</p>
                      <p className="text-[10px] font-bold text-[var(--theme-text-muted)]">Kapasitas</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button 
                    onClick={() => navigate(`/app/kencana/mentor/groups/${group.id}`)} 
                    className="w-full h-10 px-4 rounded-xl bg-[var(--theme-primary)] text-white text-xs font-bold hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm"
                  >
                    Kelola Anggota
                  </button>
                  <button 
                    onClick={async () => {
                      try {
                        const baseUrl = import.meta.env.VITE_API_URL || '/api';
                        const urlToFetch = baseUrl.endsWith('/api') 
                          ? baseUrl.replace(/\/api$/, `/api/kencana-mentor/groups/${group.id}/pdf`)
                          : `${baseUrl}/kencana-mentor/groups/${group.id}/pdf`;
                        
                        const token = useAuthStore.getState().accessToken || '';
                        const res = await fetch(urlToFetch, {
                          headers: { Authorization: `Bearer ${token}` }
                        });
                        if (!res.ok) {
                          const errData = await res.json().catch(() => null);
                          throw new Error(errData?.message || 'Gagal mengunduh PDF');
                        }
                        const blob = await res.blob();
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `Rekap_Kelompok_${group.name.replace(/\s+/g, '_')}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } catch (err) {
                        console.error("PDF Download Error:", err);
                        alert('Terjadi kesalahan saat mengunduh PDF: ' + err.message);
                      }
                    }}
                    className="w-full h-10 px-4 rounded-xl bg-[var(--theme-surface)] text-[var(--theme-primary)] border border-[var(--theme-border)] text-xs font-bold hover:bg-[var(--theme-bg)] transition-colors shadow-sm flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[16px]">download</span>
                    PDF Rekap
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-16 text-center font-bold text-[var(--theme-text-muted)]">Belum ada kelompok yang ditugaskan kepada Anda.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Groups;
