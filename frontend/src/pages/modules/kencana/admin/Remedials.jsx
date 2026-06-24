import React, { useState, useEffect } from 'react';
import { useRemedialsQuery, usePeriodsQuery } from '@/queries/useKencanaAdminQuery';
import useAuthStore from '@/store/useAuthStore';
import { getKencanaInitialFakultas, getKencanaInitialProdi } from '@/utils/kencanaFilters';
import { DashboardHero } from '@/components/ui/dashboard';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { UserInfoCell, TitleSubtitleCell, StatusBadgeCell } from '@/components/ui/TableCells';

const Remedials = ({ portalType = 'admin' }) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const user = useAuthStore(state => state.user);
  const role = String(user?.role || '').toLowerCase();
  const isFacultyScoped = portalType === 'fakultas' || role === 'kencana_fakultas';
  const [searchTermInput, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fakultasFilter, setFakultasFilter] = useState(() => getKencanaInitialFakultas(role, isFacultyScoped, user?.fakultas_id));
  const [programStudiFilter, setProgramStudiFilter] = useState(() => getKencanaInitialProdi(role));

  useEffect(() => {
    const handleFilterChange = (e) => {
      const { fakultasId, prodiId } = e.detail;
      setFakultasFilter(fakultasId);
      setProgramStudiFilter(prodiId);
      setPage(1);
    };

    window.addEventListener('kencana-filter-changed', handleFilterChange);
    return () => window.removeEventListener('kencana-filter-changed', handleFilterChange);
  }, []);

  const { data: periods } = usePeriodsQuery();

  useEffect(() => {
    if (periods?.length && !selectedPeriodId) {
      const active = periods.find(p => p.status === 'active' || p.status === 'published');
      setSelectedPeriodId(active ? String(active.id) : String(periods[0].id));
    }
  }, [periods, selectedPeriodId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchTermInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTermInput]);

  const { data: res, isLoading } = useRemedialsQuery(
    { 
      period_id: selectedPeriodId || undefined, 
      page, 
      limit, 
      search: searchTerm,
      fakultas_id: fakultasFilter === 'all' ? undefined : fakultasFilter,
      program_studi_id: programStudiFilter === 'all' ? undefined : programStudiFilter
    },
    portalType
  );
  
  const rows = res?.data || [];
  const meta = res?.meta || { current_page: 1, total_pages: 1, total_data: 0 };

  const columns = [
    {
      key: 'student',
      label: 'NIM / Nama',
      render: (v, r) => <UserInfoCell name={r.student?.Nama || r.student?.nama || '-'} subtitle={`NIM: ${r.student?.NIM || r.student?.nim || '-'}`} avatarUrl={r.student?.FotoURL || r.student?.foto_url || r.student?.Foto || r.student?.foto} />
    },
    {
      key: 'prodi',
      label: 'Prodi & Fakultas',
      render: (v, r) => <TitleSubtitleCell title={r.student?.program_studi?.nama || r.student?.ProgramStudi?.Nama || '-'} subtitle={r.student?.fakultas?.nama || r.student?.Fakultas?.Nama || '-'} />
    },
    {
      key: 'status',
      label: 'Status',
      render: (v, r) => <StatusBadgeCell status={r.status?.toLowerCase() === 'selesai' ? 'success' : 'warning'} label={r.status || 'Remedial'} />
    }
  ];

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <DashboardHero
        title="Program"
        highlightedTitle="Remedial"
        subtitle={`Pantau dan kelola data peserta orientasi ${portalType === 'fakultas' ? 'fakultas' : 'universitas'} yang harus mengikuti program perbaikan nilai.`}
        icon="assignment_late"
        actions={
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md">
            <span className="text-xs font-bold text-white whitespace-nowrap">Periode:</span>
            <SelectField
              value={selectedPeriodId}
              onValueChange={setSelectedPeriodId}
              placeholder="Pilih Periode..."
              className="min-w-[160px] h-8 bg-white/90 border-0"
            >
              {periods?.map(p => (
                <SelectOption key={p.id} value={String(p.id)}>
                  {p.name}
                </SelectOption>
              ))}
            </SelectField>
          </div>
        }
      />

      <div>
        <div>
          <DataTable
            columns={columns}
            data={rows}
            loading={isLoading}
            searchable={true}
            searchPlaceholder="Cari berdasarkan nama atau NIM..."
            serverPagination={true}
            totalData={meta.total_data}
            currentPage={meta.current_page}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onSearchChange={setSearchQuery}
            emptyMessage="Tidak ada data remedial ditemukan."
            emptyIcon="assignment_late"
          />
        </div>
      </div>
    </div>
  );
};

export default Remedials;
