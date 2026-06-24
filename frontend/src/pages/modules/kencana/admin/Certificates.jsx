import React, { useState, useEffect } from 'react';
import { useCertificatesQuery, usePeriodsQuery, useGenerateCertificateMutation, useGroupsQuery, useGenerateBulkCertificatesMutation } from '@/queries/useKencanaAdminQuery';
import useAuthStore from '@/store/useAuthStore';
import { DashboardHero } from '@/components/ui/dashboard';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { getKencanaInitialFakultas, getKencanaInitialProdi } from '@/utils/kencanaFilters';
import { ASSET_URL } from '@/services/api';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { UserInfoCell } from '@/components/ui/TableCells';

const Certificates = ({ portalType = 'admin' }) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchTermInput, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const user = useAuthStore(state => state.user);
  const role = String(user?.role || '').toLowerCase();
  const isFacultyScoped = portalType === 'fakultas' || role === 'kencana_fakultas';
  
  const [fakultasFilter, setFakultasFilter] = useState(() => getKencanaInitialFakultas(role, isFacultyScoped, user?.fakultas_id));
  const [programStudiFilter, setProgramStudiFilter] = useState(() => getKencanaInitialProdi(role));
  const [groupFilter, setGroupFilter] = useState('all');

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
  const { data: groups } = useGroupsQuery({ scope_type: portalType === 'fakultas' ? 'faculty' : 'all' }, portalType);

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

  const { data: res, isLoading } = useCertificatesQuery({
    period_id: selectedPeriodId || undefined,
    page,
    limit,
    search: searchTerm,
    group_id: groupFilter !== 'all' ? groupFilter : undefined,
    fakultas_id: fakultasFilter === 'all' ? undefined : fakultasFilter,
    program_studi_id: programStudiFilter === 'all' ? undefined : programStudiFilter
  }, portalType);
  
  const rows = res?.data || [];
  const meta = res?.meta || { current_page: 1, total_pages: 1, total_data: 0 };

  const generateMut = useGenerateCertificateMutation(portalType);

  const handleGenerate = (studentId) => {
    if (!selectedPeriodId) return;
    generateMut.mutate({ period_id: parseInt(selectedPeriodId), student_id: studentId });
  };

  const bulkGenerateMut = useGenerateBulkCertificatesMutation(portalType);

  const handleBulkGenerate = () => {
    if (!selectedPeriodId) return;
    if (window.confirm("Apakah Anda yakin ingin men-generate sertifikat massal untuk semua mahasiswa yang berhak di periode ini? Proses ini akan berjalan di background.")) {
      bulkGenerateMut.mutate(
        { period_id: parseInt(selectedPeriodId) },
        {
          onSuccess: (res) => {
            alert(res.message || "Proses berjalan di background.");
          }
        }
      );
    }
  };

  const columns = [
    {
      key: 'certificate_number',
      label: 'Nomor Sertifikat',
      cellClassName: 'font-mono text-sm text-[var(--theme-text-muted)]',
      render: (v) => v || '-'
    },
    {
      key: 'student',
      label: 'Mahasiswa',
      render: (v, r) => <UserInfoCell name={r.student?.Nama} subtitle={`NIM: ${r.student?.NIM}`} avatarUrl={r.student?.FotoURL || r.student?.foto_url || r.student?.Foto || r.student?.foto} />
    },
    {
      key: 'group_name',
      label: 'Kelompok',
      cellClassName: 'text-sm font-semibold text-[var(--theme-text-muted)]',
      render: (v) => v || '-'
    },
    {
      key: 'mentor_name',
      label: 'Mentor',
      cellClassName: 'text-sm font-semibold text-[var(--theme-text-muted)]',
      render: (v) => v || '-'
    },
    {
      key: 'issued_at',
      label: 'Tanggal Terbit',
      cellClassName: 'text-sm font-semibold text-[var(--theme-text-muted)]',
      render: (v) => v ? new Date(v).toLocaleDateString('id-ID') : '-'
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      render: (v, r) => r.file_url ? (
        <a href={window.location.pathname + '/view/' + r.id} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-bold text-xs hover:bg-[var(--theme-primary-light)]/80 transition-colors">
          <span className="material-symbols-outlined text-[16px]">visibility</span> Lihat
        </a>
      ) : (
        <button 
          onClick={() => handleGenerate(r.student_id)}
          disabled={generateMut.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--theme-success-light)] text-[var(--theme-success)] font-bold text-xs hover:bg-[var(--theme-success-light)]/80 transition-colors disabled:opacity-50 cursor-pointer border-none"
        >
          <span className="material-symbols-outlined text-[16px]">print</span>
          {generateMut.isPending ? 'Mencetak...' : 'Generate'}
        </button>
      )
    }
  ];

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <DashboardHero
        title="Sertifikat"
        highlightedTitle="Kelulusan"
        subtitle={`Unduh atau buat ulang sertifikat kelulusan peserta orientasi Kencana ${portalType === 'fakultas' ? 'fakultas' : 'universitas'} yang telah memenuhi kriteria kelulusan.`}
        icon="workspace_premium"
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={handleBulkGenerate}
              disabled={bulkGenerateMut.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--theme-success)] hover:bg-[var(--theme-success)]/90 text-white font-bold text-xs transition-colors border-none cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">dynamic_feed</span>
              {bulkGenerateMut.isPending ? 'Memproses...' : 'Generate Massal'}
            </button>
            <a 
              href={window.location.pathname + '/view/preview'} 
              target="_blank" 
              rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--theme-primary-light)] hover:bg-[var(--theme-primary)] text-[var(--theme-primary)] hover:text-white font-bold text-xs transition-colors border border-[var(--theme-primary)]/20"
            >
              <span className="material-symbols-outlined text-[16px]">preview</span>
              Preview Template
            </a>
            <div className="flex items-center gap-2 bg-[var(--theme-surface)] px-3 py-1.5 rounded-xl border border-[var(--theme-border)]">
              <span className="text-xs font-bold text-[var(--theme-text-muted)] whitespace-nowrap">Periode:</span>
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
            searchPlaceholder="Cari berdasarkan nama atau sertifikat..."
            serverPagination={true}
            totalData={meta.total_data}
            currentPage={meta.current_page}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onSearchChange={setSearchQuery}
            emptyMessage="Tidak ada sertifikat ditemukan."
            emptyIcon="workspace_premium"
            actions={
              <SelectField 
                value={groupFilter} 
                onValueChange={val => { setGroupFilter(val); setPage(1); }} 
                placeholder="Semua Kelompok"
                className="w-full sm:w-48 h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none"
              >
                <SelectOption value="all">Semua Kelompok</SelectOption>
                {groups?.map(group => (
                  <SelectOption key={group.id} value={String(group.id)}>
                    Kelompok {group.group_number || '-'} - {group.name}
                  </SelectOption>
                ))}
              </SelectField>
            }
          />
        </div>
      </div>
    </div>
  );
};

export default Certificates;
