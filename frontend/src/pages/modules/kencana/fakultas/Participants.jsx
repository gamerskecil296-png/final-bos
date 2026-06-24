import React, { useState, useMemo } from 'react';
import { useParticipantsQuery, useFakultasListQuery, useProgramStudiListQuery, useGroupsQuery, usePeriodsQuery } from '@/queries/useKencanaAdminQuery';
import useAuthStore from '@/store/useAuthStore';
import { DashboardHero } from '@/components/ui/dashboard';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { UserInfoCell, TitleSubtitleCell, PillBadgeCell } from '@/components/ui/TableCells';
import { Button } from '@/components/ui/Button';
import { toast } from 'react-hot-toast';
import api from '@/lib/axios';

const Participants = () => {
  const user = useAuthStore(state => state.user);
  const role = String(user?.role || '').toLowerCase();
  const isFacultyScoped = role === 'kencana_fakultas' || role.includes('kencana_fakultas');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTermInput, setSearchTermInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fakultasFilter, setFakultasFilter] = useState(isFacultyScoped ? String(user?.fakultas_id || '') : 'all');
  const [programStudiFilter, setProgramStudiFilter] = useState('all');
  const [mentorFilter, setMentorFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const { data: periods } = usePeriodsQuery();

  const { data: faculties } = useFakultasListQuery();
  const { data: majors } = useProgramStudiListQuery(fakultasFilter);
  const { data: groups } = useGroupsQuery({ scope_type: isFacultyScoped ? 'faculty' : 'all' }, isFacultyScoped ? 'fakultas' : 'admin');
  
  // Debounce search input
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchTermInput);
      setPage(1); // Reset to page 1 on search
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTermInput]);

  const { data: resData, isLoading, error, refetch } = useParticipantsQuery({ 
    page, 
    limit, 
    search: searchTerm, 
    fakultas_id: isFacultyScoped ? undefined : fakultasFilter,
    program_studi_id: programStudiFilter,
    mentor_status: mentorFilter,
    group_id: groupFilter,
    period_id: periodFilter === 'all' || periodFilter === '' ? undefined : periodFilter,
  });
  
  const data = error?.response?.data || resData;
  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta || { current_page: 1, total_pages: 1, total_data: 0 };

  const handleSyncPMB = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/app/dashboard/integrasi/kencana-sync-pmb');
      if (res.data.status === 'success') {
        toast.success(res.data.message || `Berhasil ditarik! ${res.data.total || 0} data diproses.`);
        refetch();
      } else {
        toast.error(res.data.message || 'Gagal sinkronisasi');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat sinkronisasi');
    } finally {
      setSyncing(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      const res = await api.delete('/app/akademik/mahasiswa/reset');
      if (res.data.status === 'success' || res.status === 'success') {
        toast.success('Data peserta/mahasiswa berhasil direset total!');
        fetchParticipants(1);
      } else {
        toast.error('Gagal reset data peserta');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan saat mereset data');
    } finally {
      setResetting(false);
    }
  };

  const columns = [
    {
      key: 'nama',
      label: 'Informasi Mahasiswa',
      render: (v, p) => <UserInfoCell name={p.nama || '-'} subtitle={p.nim || p.email_kampus || p.email_personal || '-'} avatarUrl={p.foto_url || p.foto} />
    },
    {
      key: 'prodi',
      label: 'Prodi & Fakultas',
      render: (v, p) => <TitleSubtitleCell title={p.program_studi_name} subtitle={p.fakultas_name} />
    },
    {
      key: 'gender',
      label: 'Gender',
      render: (v, p) => (
        <span className="text-[11px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md">
          {p.jenis_kelamin || p.JenisKelamin || '-'}
        </span>
      )
    },
    {
      key: 'kontak',
      label: 'Kontak',
      render: (v, p) => <TitleSubtitleCell title={p.telepon || p.Telepon || p.no_hp || '-'} subtitle={p.email_kampus || p.email_personal || p.email || '-'} />
    },
    {
      key: 'group_name',
      label: 'Kelompok',
      render: (v, p) => {
        const groupName = p.group_name && p.group_name !== '-' ? p.group_name : 'Belum Ada';
        return <PillBadgeCell title={groupName} subtitle={`KELOMPOK ${p.group_number || '-'}`} active={groupName !== 'Belum Ada'} />;
      }
    },
    {
      key: 'mentor_name',
      label: 'Mentor',
      className: 'text-right',
      render: (v, p) => {
        const mentor = p.mentor_name && p.mentor_name !== '-' ? p.mentor_name : 'Menunggu';
        const hasMentor = mentor !== 'Menunggu';
        return (
          <div className="flex justify-end">
            <PillBadgeCell title={mentor} icon={hasMentor ? 'verified' : 'pending'} active={hasMentor} />
          </div>
        );
      }
    }
  ];

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <DashboardHero
        title="Data Peserta"
        highlightedTitle="Orientasi"
        subtitle={isFacultyScoped ? 'Pantau peserta Kencana khusus fakultas Anda.' : 'Pantau peserta Kencana University dan Kencana Fakultas dari satu halaman.'}
        icon="school"
        badges={[
          { label: 'Kencana Admin', active: false },
          { label: 'Peserta Orientasi', active: true }
        ]}
        actions={
          <div className="flex items-center gap-3 w-full sm:w-auto">
            {!isFacultyScoped && (
              <>
                <Button
                  onClick={() => setIsResetModalOpen(true)}
                  disabled={syncing || resetting}
                  className="h-11 px-6 rounded-xl text-[10px] font-semibold font-body uppercase tracking-widest text-white hover:opacity-90 gap-2 transition-all active:scale-95 shadow-none justify-center cursor-pointer border-none"
                  style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                >
                  {resetting ? <span className="material-symbols-outlined animate-spin text-white" style={{ fontSize: '14px' }}>sync</span> : <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>delete_forever</span>}
                  {resetting ? 'Resetting...' : 'Hard Reset'}
                </Button>
                <Button
                  onClick={handleSyncPMB}
                  variant="outline"
                  disabled={syncing || resetting}
                  className="h-11 px-6 rounded-xl border-[var(--theme-border)] text-[10px] font-semibold font-body uppercase tracking-widest text-[var(--theme-text)] hover:bg-[var(--theme-bg-alt)] gap-2 transition-all active:scale-95 shadow-none justify-center cursor-pointer"
                >
                  {syncing ? <span className="material-symbols-outlined animate-spin text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>sync</span> : <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>cloud_download</span>}
                  {syncing ? 'Menarik Data...' : 'Tarik Maba (Ber-NIM)'}
                </Button>
              </>
            )}
            <div className="bg-[var(--theme-bg)] border border-[var(--theme-border)] px-4 py-2 rounded-xl flex items-center gap-3 shrink-0">
              <div className="w-8 h-8 rounded-lg bg-[var(--theme-primary)]/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }}>groups</span>
              </div>
              <div>
                <p className="text-[9px] font-bold text-[var(--theme-secondary)] uppercase tracking-wider text-left">Total Peserta</p>
                <p className="text-sm font-bold text-[var(--theme-text)] mt-0.5 text-left">
                  {meta.total_data} Orang
                </p>
              </div>
            </div>
          </div>
        }
      />

      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-600 text-3xl">warning</span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">Hard Reset Data Peserta?</h3>
                <p className="text-sm text-slate-600">
                  PERINGATAN: Aksi ini akan menghapus SELURUH data mahasiswa dan akun pesertanya dari database secara permanen! Apakah Anda benar-benar yakin?
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 mt-8">
              <button
                onClick={() => setIsResetModalOpen(false)}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => { setIsResetModalOpen(false); handleReset(); }}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-semibold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <><span className="material-symbols-outlined animate-spin text-sm">sync</span> Processing...</>
                ) : 'YA, RESET TOTAL'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>
          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading}
            searchable={true}
            searchPlaceholder="Cari berdasarkan nama, NIM, email, dsb..."
            serverPagination={true}
            totalData={meta.total_data}
            currentPage={meta.current_page}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onSearchChange={setSearchTermInput}
            emptyMessage="Tidak ada data mahasiswa orientasi Kencana yang ditemukan."
            emptyIcon="groups"
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <SelectField 
                  value={periodFilter} 
                  onValueChange={(val) => {
                    setPeriodFilter(val);
                    setPage(1);
                  }}
                  placeholder="Periode Aktif"
                  className="min-w-[140px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none flex"
                >
                  <SelectOption value="">Periode Aktif</SelectOption>
                  {periods?.map(p => (
                    <SelectOption key={p.id} value={String(p.id)}>{p.name || p.year}</SelectOption>
                  ))}
                </SelectField>
                {!isFacultyScoped && (
                  <SelectField 
                    value={fakultasFilter} 
                    onValueChange={(val) => {
                      setFakultasFilter(val);
                      setProgramStudiFilter('all');
                      setPage(1);
                    }}
                    placeholder="Semua Fakultas"
                    className="min-w-[160px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none hidden md:flex"
                  >
                    <SelectOption value="all">Semua Fakultas</SelectOption>
                    {faculties?.map(f => (
                      <SelectOption key={f.id} value={String(f.id)}>{f.nama || f.Nama}</SelectOption>
                    ))}
                  </SelectField>
                )}
                <SelectField 
                  value={programStudiFilter} 
                  onValueChange={(val) => {
                    setProgramStudiFilter(val);
                    setPage(1);
                  }}
                  placeholder="Semua Prodi"
                  className="min-w-[160px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none hidden lg:flex"
                >
                  <SelectOption value="all">Semua Prodi</SelectOption>
                  {majors?.map(m => (
                    <SelectOption key={m.id} value={String(m.id)}>{m.nama || m.Nama}</SelectOption>
                  ))}
                </SelectField>
                <SelectField 
                  value={mentorFilter} 
                  onValueChange={(val) => {
                    setMentorFilter(val);
                    setPage(1);
                  }}
                  placeholder="Status Mentor"
                  className="min-w-[140px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none flex"
                >
                  <SelectOption value="all">Status Mentor</SelectOption>
                  <SelectOption value="assigned">Sudah Ada</SelectOption>
                  <SelectOption value="unassigned">Belum Ada</SelectOption>
                </SelectField>
                <SelectField 
                  value={groupFilter} 
                  onValueChange={(val) => {
                    setGroupFilter(val);
                    setPage(1);
                  }}
                  placeholder="Kelompok"
                  className="min-w-[140px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none flex"
                >
                  <SelectOption value="all">Kelompok</SelectOption>
                  {groups?.map(g => (
                    <SelectOption key={g.id} value={String(g.id)}>Kelompok {g.group_number || '-'} - {g.name}</SelectOption>
                  ))}
                </SelectField>
              </div>
            }
          />
      </div>
    </div>
  );
};

export default Participants;
