import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/axios';
import { usePeriodsQuery } from '@/queries/useKencanaAdminQuery';
import { DashboardHero } from '@/components/ui/dashboard';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { TitleSubtitleCell, ActionButton } from '@/components/ui/TableCells';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import useAuthStore from '@/store/useAuthStore';
import { getKencanaInitialFakultas } from '@/utils/kencanaFilters';

const unwrap = (res) => res.data;

const useScoreSummaryQuery = (periodId, portalType, fakultasId) => useQuery({
  queryKey: [`kencana-${portalType}`, 'scores-summary', periodId, fakultasId],
  queryFn: async () => unwrap(await api.get(`/${portalType === 'fakultas' ? 'kencana-fakultas' : 'kencana-admin'}/scores/summary`, { params: { period_id: periodId, fakultas_id: fakultasId } })),
  enabled: !!periodId,
});

const pct = (val, total) => total > 0 ? Math.round((val / total) * 100) : 0;

const ScoreSummary = ({ portalType = 'admin' }) => {
  const user = useAuthStore(state => state.user);
  const role = String(user?.role || '').toLowerCase();
  const isFacultyScoped = portalType === 'faculty' || portalType === 'fakultas' || role === 'kencana_fakultas';
  const navigate = useNavigate();
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [fakultasFilter, setFakultasFilter] = useState(() => getKencanaInitialFakultas(role, isFacultyScoped, user?.fakultas_id));
  const { data: periods } = usePeriodsQuery();

  useEffect(() => {
    const handleFilterChange = (e) => {
      const { fakultasId } = e.detail;
      setFakultasFilter(fakultasId);
    };

    window.addEventListener('kencana-filter-changed', handleFilterChange);
    return () => window.removeEventListener('kencana-filter-changed', handleFilterChange);
  }, []);

  useEffect(() => {
    if (periods?.length && !selectedPeriodId) {
      const active = periods.find(p => p.status === 'active' || p.status === 'published');
      setSelectedPeriodId(active ? String(active.id) : String(periods[0].id));
    }
  }, [periods, selectedPeriodId]);

  const { data: res, isLoading } = useScoreSummaryQuery(selectedPeriodId, portalType, fakultasFilter);
  const rawRows = res?.data || [];
  const totals = res?.totals || {};

  const columns = [
    {
      key: 'no',
      label: 'No',
      className: 'w-14 text-center',
      cellClassName: 'text-center text-[var(--theme-text-muted)]',
      render: (v, r, idx) => idx + 1
    },
    {
      key: 'group_name',
      label: 'Kelompok',
      sortable: true,
      render: (v, row) => <TitleSubtitleCell title={row.group_name} subtitle={row.fakultas_name} />
    },
    {
      key: 'lulus',
      label: 'Lulus',
      sortable: true,
      className: 'text-center',
      cellClassName: 'text-center font-medium',
      render: v => v || '-'
    },
    {
      key: 'tidak_lulus',
      label: 'Tdk Lulus',
      sortable: true,
      className: 'text-center',
      cellClassName: 'text-center font-medium',
      render: v => v || '-'
    },
    {
      key: 'bersyarat',
      label: 'Bersyarat',
      sortable: true,
      className: 'text-center',
      cellClassName: 'text-center font-medium',
      render: v => v || '-'
    },
    {
      key: 'belum_mulai',
      label: 'Belum Lengkap',
      sortable: true,
      className: 'text-center',
      cellClassName: 'text-center font-medium',
      render: v => v || '-'
    },
    {
      key: 'keluar',
      label: 'Keluar',
      sortable: true,
      className: 'text-center',
      cellClassName: 'text-center font-medium',
      render: v => v || '-'
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      className: 'text-center',
      cellClassName: 'text-center font-bold text-[var(--theme-primary)]'
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-center',
      cellClassName: 'text-center',
      render: (v, row) => (
        <div className="flex justify-center">
          <ActionButton 
            icon="visibility" 
            label="Detail" 
            onClick={() => navigate(portalType === 'fakultas' ? `/app/kencana/scores?group_id=${row.group_id}` : `/app/kencana/scores?group_id=${row.group_id}`)} 
          />
        </div>
      )
    }
  ];

  const tableFooter = totals.total > 0 ? (
    <tfoot>
      <tr className="border-t-2 border-[var(--theme-border)] bg-[var(--theme-bg)] font-bold">
        <td className="py-4 px-6 text-center text-sm text-[var(--theme-text)]" colSpan={2}>TOTAL</td>
        <td className="py-4 px-6 text-center text-[var(--theme-text)] text-sm">{totals.lulus ?? 0}</td>
        <td className="py-4 px-6 text-center text-[var(--theme-text)] text-sm">{totals.tidak_lulus ?? 0}</td>
        <td className="py-4 px-6 text-center text-[var(--theme-text)] text-sm">{totals.bersyarat ?? 0}</td>
        <td className="py-4 px-6 text-center text-[var(--theme-text)] text-sm">{totals.belum_mulai ?? 0}</td>
        <td className="py-4 px-6 text-center text-[var(--theme-text)] text-sm">{totals.keluar ?? 0}</td>
        <td className="py-4 px-6 text-center text-[var(--theme-primary)] text-sm">{totals.total ?? 0}</td>
        <td></td>
      </tr>
      <tr className="bg-[var(--theme-bg)]/50 border-t border-[var(--theme-border-muted)]">
        <td className="py-3 px-6 text-center text-xs text-[var(--theme-text-muted)] font-semibold" colSpan={2}>Persentase</td>
        <td className="py-3 px-6 text-center text-xs text-[var(--theme-text-muted)] font-semibold">{pct(totals.lulus, totals.total)}%</td>
        <td className="py-3 px-6 text-center text-xs text-[var(--theme-text-muted)] font-semibold">{pct(totals.tidak_lulus, totals.total)}%</td>
        <td className="py-3 px-6 text-center text-xs text-[var(--theme-text-muted)] font-semibold">{pct(totals.bersyarat, totals.total)}%</td>
        <td className="py-3 px-6 text-center text-xs text-[var(--theme-text-muted)] font-semibold">{pct(totals.belum_mulai, totals.total)}%</td>
        <td className="py-3 px-6 text-center text-xs text-[var(--theme-text-muted)] font-semibold">{pct(totals.keluar, totals.total)}%</td>
        <td className="py-3 px-6 text-center text-xs text-[var(--theme-text-muted)] font-semibold">100%</td>
        <td></td>
      </tr>
    </tfoot>
  ) : null;

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <DashboardHero
        title="Rekap Kencana"
        highlightedTitle={portalType === 'fakultas' ? 'Fakultas' : 'Universitas'}
        subtitle={`Ringkasan kelulusan seluruh peserta Kencana ${portalType === 'fakultas' ? 'Fakultas' : 'Universitas'} per kelompok pembimbingan.`}
        icon="summarize"
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
                <SelectOption key={p.id} value={String(p.id)}>{p.name}</SelectOption>
              ))}
            </SelectField>
          </div>
        }
      />

      {/* Stats Cards - Clean UI */}
      {!isLoading && totals.total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <PrimaryStatsCard title="Lulus" value={totals.lulus ?? 0} subtitle={`(${pct(totals.lulus, totals.total)}%)`} icon="check_circle" colorTheme="success" />
          <PrimaryStatsCard title="Lulus Bersyarat" value={totals.bersyarat ?? 0} subtitle={`(${pct(totals.bersyarat, totals.total)}%)`} icon="stars" colorTheme="warning" />
          <PrimaryStatsCard title="Tidak Lulus" value={totals.tidak_lulus ?? 0} subtitle={`(${pct(totals.tidak_lulus, totals.total)}%)`} icon="cancel" colorTheme="error" />
          <PrimaryStatsCard title="Belum Lengkap" value={totals.belum_mulai ?? 0} subtitle={`(${pct(totals.belum_mulai, totals.total)}%)`} icon="pending_actions" colorTheme="info" />
          <PrimaryStatsCard title="Keluar" value={totals.keluar ?? 0} subtitle={`(${pct(totals.keluar, totals.total)}%)`} icon="logout" colorTheme="warning" />
          <PrimaryStatsCard title="Total Peserta" value={totals.total ?? 0} subtitle="(100%)" icon="groups" colorTheme="primary" />
        </div>
      )}

      {/* Table Section */}
      <div className="rounded-xl overflow-hidden mt-6">
        <div className="p-5 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-base font-bold text-[var(--theme-text)]">Detail Per Kelompok</h2>
        </div>
        
        <div>
          <DataTable
            columns={columns}
            data={rawRows}
            loading={isLoading}
            searchable={true}
            searchPlaceholder="Cari kelompok..."
            pagination={true}
            pageSize={10}
            emptyMessage="Data kelompok tidak ditemukan."
            emptyIcon="inbox"
            tableFooter={tableFooter}
          />
        </div>
      </div>
    </div>
  );
};

export default ScoreSummary;
