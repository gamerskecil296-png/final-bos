import React, { useState, useEffect } from 'react';
import {
  useAdminBandingListQuery,
  useAdminRespondBandingMutation,
  usePeriodsQuery
} from '@/queries/useKencanaAdminQuery';
import useAuthStore from '@/store/useAuthStore';
import { DashboardHero } from '@/components/ui/dashboard';
import { DataTable } from '@/components/ui/DataTable';
import { UserInfoCell, ActionButton } from '@/components/ui/TableCells';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { getKencanaInitialFakultas } from '@/utils/kencanaFilters';

const Banding = ({ portalType = 'admin' }) => {
  const user = useAuthStore(state => state.user);
  const role = String(user?.role || '').toLowerCase();
  const isFacultyScoped = portalType === 'faculty' || portalType === 'fakultas' || role === 'kencana_fakultas';
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [fakultasFilter, setFakultasFilter] = useState(() => getKencanaInitialFakultas(role, isFacultyScoped, user?.fakultas_id));
  
  const [selectedBanding, setSelectedBanding] = useState(null);
  const [responseStatus, setResponseStatus] = useState('approved');
  const [adminResponse, setAdminResponse] = useState('');

  const { data: periods } = usePeriodsQuery();

  useEffect(() => {
    const handleFilterChange = (e) => {
      const { fakultasId } = e.detail;
      setFakultasFilter(fakultasId);
      setPage(1);
    };

    window.addEventListener('kencana-filter-changed', handleFilterChange);
    return () => window.removeEventListener('kencana-filter-changed', handleFilterChange);
  }, []);

  useEffect(() => {
    if (Array.isArray(periods) && periods.length > 0 && !selectedPeriodId) {
      const active = periods.find(p => p.status === 'active');
      setSelectedPeriodId(active ? active.id : periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const queryParams = {
    page,
    limit,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    ...(selectedPeriodId && { period_id: selectedPeriodId }),
    ...(fakultasFilter && { fakultas_id: fakultasFilter })
  };

  const { data: bandingRes, isLoading } = useAdminBandingListQuery(queryParams, portalType);

  const respondMutation = useAdminRespondBandingMutation(portalType);

  const bandings = bandingRes?.data || [];
  const meta = bandingRes?.meta || { current_page: 1, total_pages: 1, total_data: 0 };

  const totalCount = meta.total_data;
  // Ini hanya perkiraan berdasarkan respons jika ingin agregasi akurat harus dari backend
  const pendingCount = statusFilter === 'pending' ? totalCount : 0; 
  const approvedCount = statusFilter === 'approved' ? totalCount : 0;
  const rejectedCount = statusFilter === 'rejected' ? totalCount : 0;

  const handleRespond = (e) => {
    e.preventDefault();
    if (!selectedBanding) return;

    respondMutation.mutate(
      {
        id: selectedBanding.id,
        status: responseStatus,
        admin_response: adminResponse
      },
      {
        onSuccess: () => {
          setSelectedBanding(null);
          alert('Tanggapan berhasil dikirim!');
        },
        onError: (err) => {
          alert('Gagal mengirim tanggapan: ' + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  const columns = [
    {
      key: 'student',
      label: 'Mahasiswa',
      sortable: false,
      render: (v, b) => <UserInfoCell name={b.student?.Nama || b.student?.nama} subtitle={`NIM: ${b.student?.NIM || b.student?.nim || '-'}`} />
    },
    {
      key: 'type',
      label: 'Tingkat',
      sortable: false,
      render: (v, b) => (
        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider border ${b.type === 'fakultas' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
          {b.type === 'fakultas' ? 'Fakultas' : 'Univ'}
        </span>
      )
    },
    {
      key: 'reason',
      label: 'Alasan Banding',
      sortable: false,
      render: (v, b) => (
        <div className="max-w-[300px] truncate text-xs text-[var(--theme-text-muted)]" title={b.reason}>
          {b.reason}
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: false,
      render: (v, b) => {
        let bg = 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)]';
        let lbl = 'Menunggu';
        if (b.status === 'approved') {
          bg = 'bg-[var(--theme-success)]/10 text-[var(--theme-success)]';
          lbl = 'Disetujui';
        } else if (b.status === 'rejected') {
          bg = 'bg-[var(--theme-error)]/10 text-[var(--theme-error)]';
          lbl = 'Ditolak';
        }
        return <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${bg}`}>{lbl}</span>;
      }
    },
    {
      key: 'created_at',
      label: 'Tanggal',
      sortable: false,
      render: (v, b) => <span className="text-xs">{new Date(b.created_at).toLocaleDateString('id-ID')}</span>
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      className: 'text-right',
      render: (v, b) => (
        <ActionButton
          icon={b.status === 'pending' ? 'rate_review' : 'visibility'}
          label={b.status === 'pending' ? 'Tinjau' : 'Detail'}
          onClick={() => {
            setSelectedBanding(b);
            setResponseStatus(b.status === 'pending' ? 'approved' : b.status);
            setAdminResponse(b.admin_response || '');
          }}
        />
      )
    }
  ];

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <DashboardHero
        icon="gavel"
        title="Tinjauan"
        highlightedTitle="Banding Nilai"
        subtitle="Review keluhan mahasiswa terkait rekapitulasi nilai Kencana."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md">
              <span className="text-xs font-bold text-white whitespace-nowrap">Periode:</span>
              <SelectField
                value={selectedPeriodId ? String(selectedPeriodId) : ""}
                onValueChange={val => {
                  setSelectedPeriodId(val);
                  setPage(1);
                }}
                placeholder="Pilih Periode..."
                className="min-w-[160px] h-8 bg-white/90 border-0"
              >
                {periods?.map(p => (
                  <SelectOption key={p.id} value={String(p.id)}>
                    {p.name} {p.status === 'active' || p.status === 'published' ? '(Aktif)' : ''}
                  </SelectOption>
                ))}
              </SelectField>
            </div>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <PrimaryStatsCard title="Total Filtered" value={totalCount} icon="list" colorTheme="primary" />
        <PrimaryStatsCard title="Menunggu" value={statusFilter === 'pending' ? totalCount : '-'} icon="pending_actions" colorTheme="warning" />
        <PrimaryStatsCard title="Disetujui" value={statusFilter === 'approved' ? totalCount : '-'} icon="check_circle" colorTheme="success" />
        <PrimaryStatsCard title="Ditolak" value={statusFilter === 'rejected' ? totalCount : '-'} icon="cancel" colorTheme="error" />
      </div>

      <div className="flex flex-col mt-6">
        <div className="flex-1 flex flex-col">
          <DataTable
            columns={columns}
            data={bandings}
            loading={isLoading}
            serverPagination={true}
            totalData={meta.total_data}
            currentPage={meta.current_page}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            emptyMessage="Tidak ada pengajuan banding."
            emptyIcon="gavel"
            actions={
              <SelectField
                value={statusFilter}
                onValueChange={val => { setStatusFilter(val); setPage(1); }}
                placeholder="Filter Status"
                className="min-w-[140px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none flex"
              >
                <SelectOption value="all">Semua Status</SelectOption>
                <SelectOption value="pending">Menunggu</SelectOption>
                <SelectOption value="approved">Disetujui</SelectOption>
                <SelectOption value="rejected">Ditolak</SelectOption>
              </SelectField>
            }
          />
        </div>
      </div>

      {/* Modal Respond Banding */}
      <DialogModal
        open={!!selectedBanding}
        onOpenChange={(isOpen) => {
          if (!isOpen && !respondMutation.isPending) {
            setSelectedBanding(null);
          }
        }}
        icon="gavel"
        title="Tinjauan Banding"
        subtitle={selectedBanding?.student?.nama || selectedBanding?.student?.Nama}
        description={`NIM: ${selectedBanding?.student?.nim || selectedBanding?.student?.NIM}`}
        maxWidth="max-w-2xl"
        footer={
          selectedBanding?.status === 'pending' ? (
            <>
              <ModalCancelButton onClick={() => setSelectedBanding(null)}>Batal</ModalCancelButton>
              <ModalSaveButton
                form="respond-banding-form"
                loading={respondMutation.isPending}
                icon="send"
              >
                Kirim Tanggapan
              </ModalSaveButton>
            </>
          ) : (
            <ModalCancelButton onClick={() => setSelectedBanding(null)}>Tutup</ModalCancelButton>
          )
        }
      >
        {selectedBanding && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)]">
              <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-widest uppercase mb-2 block">
                Alasan Pengajuan Banding
              </span>
              <p className="text-sm text-[var(--theme-text)] whitespace-pre-wrap">{selectedBanding.reason}</p>
            </div>

            {selectedBanding.status === 'pending' ? (
              <form id="respond-banding-form" onSubmit={handleRespond} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] block">Keputusan</label>
                  <SelectField
                    value={responseStatus}
                    onValueChange={setResponseStatus}
                    className="w-full"
                  >
                    <SelectOption value="approved">Setujui (Banding Diterima)</SelectOption>
                    <SelectOption value="rejected">Tolak (Banding Ditolak)</SelectOption>
                  </SelectField>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] block">Catatan Tanggapan (Opsional)</label>
                  <textarea
                    className="input-field min-h-[100px] resize-y"
                    placeholder="Berikan penjelasan terkait keputusan ini..."
                    value={adminResponse}
                    onChange={(e) => setAdminResponse(e.target.value)}
                  />
                  <p className="text-[10px] text-[var(--theme-text-subtle)] mt-1">Catatan ini akan dapat dilihat oleh mahasiswa di portal mereka.</p>
                </div>
              </form>
            ) : (
              <div className="p-4 rounded-xl bg-[var(--theme-surface)] border border-[var(--theme-border)]">
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] tracking-widest uppercase mb-2 block">
                  Tanggapan Panitia (Keputusan: {selectedBanding.status === 'approved' ? 'Disetujui' : 'Ditolak'})
                </span>
                <p className="text-sm text-[var(--theme-text)] whitespace-pre-wrap">
                  {selectedBanding.admin_response || 'Tidak ada catatan tambahan.'}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogModal>
    </div>
  );
};

export default Banding;
