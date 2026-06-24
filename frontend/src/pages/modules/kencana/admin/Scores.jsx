import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { API_BASE_URL } from '@/services/api';
import {
  useScoresQuery,
  usePeriodsQuery,
  useCalculateAllScoresMutation,
  useScoreSummaryQuery,
  useAdminScoreItemsQuery,
  useBulkUpsertScoreItemsMutation,
  useParticipantsQuery,
  useGroupsQuery,
  useSessionsByPeriodQuery
} from '@/queries/useKencanaAdminQuery';
import useAuthStore from '@/store/useAuthStore';
import { DashboardHero } from '@/components/ui/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { DataTable } from '@/components/ui/DataTable';
import { UserInfoCell, ScoreCell, StatusBadgeCell, ActionButton } from '@/components/ui/TableCells';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { getKencanaInitialFakultas, getKencanaInitialProdi } from '@/utils/kencanaFilters';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';


const STATIC_SCORE_DEFINITIONS = {
  psychomotor: [
    { key: 'Taat Peraturan & Tatib (Makanan)', label: 'Taat Peraturan & Tatib', manual: true },
    { key: 'Twibon', label: 'Twibon', manual: true },
    { key: 'Video Perkenalan (Analog)', label: 'Video Perkenalan', manual: true },
    { key: 'Atribut sesuai Ketentuan', label: 'Atribut Sesuai Ketentuan', manual: true },
    { key: 'Kreativitas Individu (name tag, mind map & video rekap)', label: 'Kreativitas Individu', manual: true },
    { key: 'Kreativitas Kelompok (Tongkat & yelyel)', label: 'Kreativitas Kelompok', manual: true },
    { key: 'Memelihara Fasilitas UBK', label: 'Memelihara Fasilitas UBK', manual: true },
  ],
  affective: [
    { key: 'Etika terhadap panitia & civitas', label: 'Etika terhadap Panitia/Civitas', manual: true },
    { key: 'Empati', label: 'Empati', manual: true },
    { key: 'Tanggung Jawab', label: 'Tanggung Jawab', manual: true },
    { key: 'Disiplin', label: 'Disiplin', manual: true },
    { key: 'Adil', label: 'Adil', manual: true },
  ],
  // Handbook masuk sebagai item kognitif manual
  cognitive_static: [
    { key: 'Handbook', label: 'Handbook', manual: true },
  ],
  requirements: [
    { key: 'Kehadiran', label: 'Kehadiran (Manual Override)', manual: true },
  ],
};

const Scores = ({ portalType = 'admin' }) => {
  const user = useAuthStore(state => state.user);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const role = String(user?.role || '').toLowerCase();
  const isFacultyScoped = portalType === 'fakultas' || role === 'kencana_fakultas';
  const [openStudentSelect, setOpenStudentSelect] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [searchParams] = useSearchParams();
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
  const [groupFilter, setGroupFilter] = useState(searchParams.get('group_id') || 'all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('nama');
  const [sortOrder, setSortOrder] = useState('asc');

  // Modals / Editing States
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showBulkInputModal, setShowBulkInputModal] = useState(false);
  const [bulkSelectedStudentId, setBulkSelectedStudentId] = useState('');

  // Local score input states (key is `component__itemName`)
  const [scoresInput, setScoresInput] = useState({});

  // Queries
  const { data: periods } = usePeriodsQuery();
  const { data: groups } = useGroupsQuery({ scope_type: isFacultyScoped ? 'faculty' : 'all' }, isFacultyScoped ? 'fakultas' : 'admin');

  // Auto-select active period on mount
  useEffect(() => {
    if (Array.isArray(periods) && periods.length > 0 && !selectedPeriodId) {
      const active = periods.find(p => p.status === 'active');
      setSelectedPeriodId(active ? active.id : periods[0].id);
    }
  }, [periods, selectedPeriodId]);

  const { data: sessionsRes } = useSessionsByPeriodQuery(selectedPeriodId, isFacultyScoped ? 'faculty' : 'kencana_universitas');

  const getScoreDefinitionsContext = (backendData) => {
    const { cognitive_static, ...rest } = STATIC_SCORE_DEFINITIONS;
    return {
      ...rest,
      cognitive: [
        ...(backendData?.score_definitions?.cognitive || []),
        ...cognitive_static,
      ],
    };
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchTerm(searchTermInput);
      setPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTermInput]);

  const { data: scoresRes, isLoading: loadingScores } = useScoresQuery(
    { 
      period_id: selectedPeriodId || undefined,
      page, 
      limit, 
      search: searchTerm, 
      group_id: groupFilter !== 'all' ? groupFilter : undefined, 
      status: statusFilter !== 'all' ? statusFilter : undefined, 
      sort_by: sortBy, 
      sort_order: sortOrder,
      fakultas_id: fakultasFilter === 'all' ? undefined : fakultasFilter,
      program_studi_id: programStudiFilter === 'all' ? undefined : programStudiFilter
    },
    portalType
  );

  const scores = scoresRes?.data || [];
  const meta = scoresRes?.meta || { current_page: 1, total_pages: 1, total_data: 0 };

  const { data: summaryData, isLoading: isSummaryLoading } = useScoreSummaryQuery(selectedPeriodId);

  const { data: detailedItems, isLoading: loadingDetails } = useAdminScoreItemsQuery(
    selectedStudent ? { student_id: selectedStudent.id, period_id: selectedPeriodId } : {}
  );

  // We also query the details for the bulk input dropdown
  const { data: bulkDetailedItems, isLoading: loadingBulkDetails } = useAdminScoreItemsQuery(
    bulkSelectedStudentId ? { student_id: bulkSelectedStudentId, period_id: selectedPeriodId } : {}
  );

  const { data: participants } = useParticipantsQuery(
    selectedPeriodId ? { period_id: selectedPeriodId } : {}
  );

  // Mutations
  const calculateMutation = useCalculateAllScoresMutation();
  const bulkUpsertMutation = useBulkUpsertScoreItemsMutation();

  // Pre-fill score input when detailed items load for single student editing
  useEffect(() => {
    if (isEditing && detailedItems?.items) {
      const map = {};
      detailedItems.items.forEach(item => {
        map[`${item.component}__${item.item_name}`] = item.score;
      });
      setScoresInput(map);
    }
  }, [detailedItems, isEditing]);

  // Pre-fill score input when detailed items load for bulk input modal selection
  useEffect(() => {
    if (showBulkInputModal && bulkDetailedItems?.items) {
      const map = {};
      bulkDetailedItems.items.forEach(item => {
        map[`${item.component}__${item.item_name}`] = item.score;
      });
      setScoresInput(map);
    }
  }, [bulkDetailedItems, showBulkInputModal]);

  const handleScoreChange = (component, itemName, value) => {
    const parsed = value === '' ? '' : Math.min(100, Math.max(0, parseFloat(value) || 0));
    setScoresInput(prev => ({
      ...prev,
      [`${component}__${itemName}`]: parsed
    }));
  };

  const handleSortChange = ({ key, direction }) => {
    let apiField = key;
    if (key === 'student') apiField = 'nama';
    if (key === 'status') apiField = 'status';
    setSortBy(apiField);
    setSortOrder(direction);
  };

  // Save edits for single student (inside detail modal)
  const handleSaveSingleEdit = (e) => {
    e.preventDefault();
    if (!selectedStudent) return;
    saveScores(selectedStudent.id, getScoreDefinitionsContext(detailedItems), () => {
      setIsEditing(false);
      alert('✅ Nilai mahasiswa berhasil diperbarui!');
    });
  };

  // Save edits in the bulk input modal
  const handleSaveBulkInput = (e) => {
    e.preventDefault();
    if (!bulkSelectedStudentId) return;
    saveScores(bulkSelectedStudentId, getScoreDefinitionsContext(bulkDetailedItems), () => {
      setBulkSelectedStudentId('');
      setScoresInput({});
      setShowBulkInputModal(false);
      alert('✅ Nilai mahasiswa berhasil disimpan!');
    });
  };

  // Reusable save score caller
  const saveScores = (studentId, definitionsContext, callback) => {
    const items = [];
    Object.entries(definitionsContext).forEach(([component, list]) => {
      list.forEach(def => {
        const val = scoresInput[`${component}__${def.key}`];
        // Only upload manual items or keep manual ones. System items are handled by backend quiz/handbook
        if (def.manual) {
          items.push({
            student_id: Number(studentId),
            component,
            item_name: def.key,
            score: val === '' || val === undefined ? 0 : Number(val),
            notes: 'Diinput melalui Rekap Nilai Admin'
          });
        }
      });
    });

    bulkUpsertMutation.mutate(
      { period_id: Number(selectedPeriodId), items },
      {
        onSuccess: callback,
        onError: (err) => alert('❌ Gagal menyimpan nilai: ' + (err.response?.data?.message || err.message))
      }
    );
  };

  const handleCalculateAll = () => {
    if (!selectedPeriodId) return;
    if (window.confirm('Apakah Anda yakin ingin menghitung ulang nilai seluruh mahasiswa pada periode ini?')) {
      calculateMutation.mutate(
        { period_id: selectedPeriodId },
        {
          onSuccess: () => alert('✅ Kalkulasi nilai berhasil diselesaikan!'),
          onError: (err) => alert('❌ Gagal melakukan kalkulasi: ' + (err.response?.data?.message || err.message))
        }
      );
    }
  };

  const handleSetKeluar = (studentId) => {
    if (!window.confirm('Yakin ingin menetapkan status Keluar untuk mahasiswa ini? Status ini akan membongkar status kelulusan lamanya.')) return;
    bulkUpsertMutation.mutate(
      {
        period_id: parseInt(selectedPeriodId),
        items: [
          {
            student_id: studentId,
            component: 'requirements',
            item_name: 'Keluar',
            score: 100,
            notes: 'Manual Override Keluar'
          }
        ]
      },
      {
        onSuccess: () => {
          // Trigger recalculation immediately to apply 'dropped_out' status
          calculateMutation.mutate({ period_id: selectedPeriodId });
        }
      }
    );
  };

  // Summary counts (for current page data)
  const totalCount = meta.total_data || 0;
  const passedCount = summaryData?.passed || 0;
  const conditionalPassCount = summaryData?.conditional_pass || 0;
  const notEligibleCount = summaryData?.not_eligible || 0;
  const inProgressCount = totalCount - passedCount - conditionalPassCount - notEligibleCount;

  const columns = [
    {
      key: 'student',
      label: 'Mahasiswa',
      sortable: true,
      render: (v, s) => <UserInfoCell name={s.student?.Nama || s.student?.nama} subtitle={`NIM: ${s.student?.NIM || s.student?.nim || '-'}`} avatarUrl={s.student?.FotoURL || s.student?.foto_url || s.student?.Foto || s.student?.foto} />
    },
    {
      key: 'group_name',
      label: 'Kelompok',
      sortable: false,
      render: (v, s) => <div className="font-semibold text-[var(--theme-text)] text-xs">{s.group_name || '-'}</div>
    },
    {
      key: 'cognitive',
      label: 'Kognitif (25%)',
      sortable: true,
      render: (v, s) => <ScoreCell value={s.cognitive_average?.toFixed(1)} subtitle={`Weighted: ${s.cognitive_weighted?.toFixed(1) || '0.0'}`} />
    },
    {
      key: 'psychomotor',
      label: 'Psikomotor (35%)',
      sortable: true,
      render: (v, s) => <ScoreCell value={s.psychomotor_average?.toFixed(1)} subtitle={`Weighted: ${s.psychomotor_weighted?.toFixed(1) || '0.0'}`} />
    },
    {
      key: 'affective',
      label: 'Afektif (40%)',
      sortable: true,
      render: (v, s) => <ScoreCell value={s.affective_average?.toFixed(1)} subtitle={`Weighted: ${s.affective_weighted?.toFixed(1) || '0.0'}`} />
    },
    {
      key: 'final_score',
      label: 'Nilai Akhir',
      sortable: true,
      render: (v, s) => <ScoreCell value={s.final_score?.toFixed(1)} highlight={true} />
    },
    {
      key: 'status',
      label: 'Status Evaluasi',
      sortable: true,
      render: (v, s) => {
        let st = 'default';
        if (s.graduation_status === 'passed') st = 'success';
        if (s.graduation_status === 'conditional_pass') st = 'warning';
        if (s.graduation_status === 'not_eligible') st = 'error';

        let lb = 'Belum Lengkap';
        if (s.graduation_status === 'passed') lb = 'Lulus';
        if (s.graduation_status === 'conditional_pass') lb = 'Lulus Bersyarat';
        if (s.graduation_status === 'not_eligible') lb = 'Tidak Lulus';
        if (s.graduation_status === 'dropped_out') lb = 'Keluar';

        return <StatusBadgeCell status={st} label={lb} />;
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      className: 'text-right',
      render: (v, s) => (
        <ActionButton
          icon="visibility"
          label="Detail"
          onClick={() => { setSelectedStudent(s.student); setIsEditing(false); }}
        />
      )
    }
  ];

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      {/* Header section */}
      <DashboardHero
        icon="percent"
        title="Rekapitulasi &"
        highlightedTitle="Kelola Nilai Kencana"
        subtitle={isFacultyScoped ? 'Review dan input nilai untuk peserta fakultas Anda.' : 'Review nilai komponen, input nilai manual mahasiswa, dan lakukan kalkulasi kelulusan.'}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md">
              <span className="text-xs font-bold text-white whitespace-nowrap">Periode:</span>
              <SelectField
                value={selectedPeriodId ? String(selectedPeriodId) : ""}
                onValueChange={val => {
                  setSelectedPeriodId(val);
                  setSelectedStudent(null);
                  setBulkSelectedStudentId('');
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


            
            {/* Download PDF Button */}
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (selectedPeriodId) params.append('period_id', selectedPeriodId);
                if (groupFilter && groupFilter !== 'all') params.append('group_id', groupFilter);
                if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
                if (searchTerm) params.append('search', searchTerm);
                
                const url = `${API_BASE_URL}/kencana-admin/scores/export-pdf?${params.toString()}`;
                const token = useAuthStore.getState().accessToken;
                
                fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                  .then(res => {
                    if (!res.ok) throw new Error('Gagal mengunduh PDF');
                    return res.blob();
                  })
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Rekap_Nilai_Admin.pdf`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                  })
                  .catch(err => alert(err.message));
              }}
              disabled={!selectedPeriodId}
              className="h-9 px-4 rounded-xl bg-white border border-[var(--theme-border)] hover:bg-[var(--theme-bg)] disabled:opacity-50 text-[var(--theme-text)] font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
              Download PDF
            </button>

            {/* Download Excel Button */}
            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (selectedPeriodId) params.append('period_id', selectedPeriodId);
                if (groupFilter && groupFilter !== 'all') params.append('group_id', groupFilter);
                if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
                if (searchTerm) params.append('search', searchTerm);
                
                const url = `${API_BASE_URL}/kencana-admin/scores/export-excel?${params.toString()}`;
                const token = useAuthStore.getState().accessToken;
                
                fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
                  .then(res => {
                    if (!res.ok) throw new Error('Gagal mengunduh Excel');
                    return res.blob();
                  })
                  .then(blob => {
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Rekap_Nilai_Admin.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                  })
                  .catch(err => alert(err.message));
              }}
              disabled={!selectedPeriodId}
              className="h-9 px-4 rounded-xl bg-white border border-[var(--theme-border)] hover:bg-[var(--theme-success)] hover:text-white hover:border-[var(--theme-success)] disabled:opacity-50 text-[var(--theme-text)] font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <span className="material-symbols-outlined text-[16px]">table_view</span>
              Download Excel
            </button>

            {/* Calculate Button */}
            <button
              onClick={handleCalculateAll}
              disabled={calculateMutation.isPending || !selectedPeriodId}
              className="h-9 px-4 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] disabled:opacity-50 text-white font-semibold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all border-none cursor-pointer shadow-sm"
            >
              {calculateMutation.isPending ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-white"></div>
              ) : (
                <span className="material-symbols-outlined text-[16px]">sync</span>
              )}
              Kalkulasi Ulang
            </button>
          </div>
        }
      />

      {/* Summary dashboard statistics (Current Page) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <PrimaryStatsCard title="Total Seluruh Data" value={totalCount} icon="groups" colorTheme="primary" />
        <PrimaryStatsCard title="Lulus" value={passedCount} icon="check_circle" colorTheme="success" />
        <PrimaryStatsCard title="Lulus Bersyarat" value={conditionalPassCount} icon="stars" colorTheme="warning" />
        <PrimaryStatsCard title="Tidak Lulus" value={notEligibleCount} icon="cancel" colorTheme="error" />
        <PrimaryStatsCard title="Belum Lengkap" value={inProgressCount} icon="pending_actions" colorTheme="info" />
      </div>

      {/* Main List Container */}
      <div className="flex flex-col mt-6">
        <div className="flex-1 flex flex-col">
          <DataTable
            data={scores}
            loading={loadingScores}
            searchable={true}
            searchPlaceholder="Cari mahasiswa berdasarkan nama atau NIM..."
            onSearchChange={setSearchQuery}
            serverPagination={true}
            serverSort={true}
            totalData={meta.total_data}
            currentPage={meta.current_page}
            onPageChange={setPage}
            onPageSizeChange={setLimit}
            onSortChange={handleSortChange}
            emptyMessage="Tidak ada data nilai mahasiswa untuk kriteria ini."
            emptyIcon="school"
            customTable={
            <table className="w-full text-left border-collapse min-w-[max-content]">
              <thead>
                <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/80 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center">
                  <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">No.</th>
                  <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] text-left min-w-[200px]">Nama</th>
                  <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] text-left min-w-[150px]">Prodi / Kelompok</th>
                  <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kehadiran<br/>(100%)</th>
                  <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">Handbook</th>
                  <th colSpan={3} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Kognitif</th>
                  <th colSpan={8} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Psikomotor</th>
                  <th colSpan={6} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Afektif</th>
                  <th colSpan={3} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Nilai Komponen</th>
                  <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Nilai<br/>Akhir</th>
                  <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">Keterangan</th>
                  <th rowSpan={2} className="p-3 border-l-4 border-l-[var(--theme-bg)] sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10 whitespace-nowrap">Aksi</th>
                </tr>
                <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/40 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center">
                  {/* Kognitif */}
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Post Test<br/>Day 1</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Post Test<br/>Day 2</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br/>Kognitif</th>
                  {/* Psikomotor */}
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Taat<br/>Peraturan</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Twibon</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Vidio<br/>Analog</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Atribut</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kreativitas<br/>Individu</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kreativitas<br/>Kelompok</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Fasilitas<br/>UBK</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br/>Psikomotor</th>
                  {/* Afektif */}
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Etika</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Empati</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Tanggung<br/>Jawab</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Disiplin</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Adil</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br/>Afektif</th>
                  {/* Komponen */}
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kognitif<br/>(25%)</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Psikomotor<br/>(35%)</th>
                  <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Afektif<br/>(40%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-muted)] text-[12px] text-[var(--theme-text)]">
                {scores.map((row, i) => {
                  const it = row.items || [];
                  const findItemScore = (comp, keyPart) => {
                    const found = it.find(x => x.component?.toLowerCase() === comp && x.item_name?.toLowerCase().includes(keyPart));
                    return found ? Math.round(found.score).toString() : '0';
                  };
                  const findQuizScore = (index) => {
                    const quizzes = it.filter(x => x.component?.toLowerCase() === 'cognitive' && x.item_name?.toLowerCase().includes('quiz'))
                      .sort((a, b) => (a.source_id || 0) - (b.source_id || 0));
                    if (index < quizzes.length) return Math.round(quizzes[index].score).toString();
                    return '0';
                  };
                  return (
                    <tr key={row.student_id} className="hover:bg-[var(--theme-bg)]/30 transition-colors group/row">
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[var(--theme-text-muted)]">{(page - 1) * limit + i + 1}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)]">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${row.graduation_status === 'passed' ? 'bg-[var(--theme-success)]' : row.graduation_status === 'conditional_pass' ? 'bg-[var(--theme-warning)]' : row.graduation_status === 'not_eligible' ? 'bg-[var(--theme-danger)]' : 'bg-[var(--theme-text-muted)]'}`} />
                          <div>
                            <p className="font-bold text-sm leading-tight text-[var(--theme-text)]">{row.student?.Nama || '-'}</p>
                            <p className="text-[10px] text-[var(--theme-text-muted)] font-bold">{row.student?.NIM || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-[11px] leading-tight">
                        <p className="font-semibold text-[var(--theme-text-muted)]">{row.student?.ProgramStudi?.Nama || '-'}</p>
                        <p className="font-bold text-[var(--theme-primary)]">{row.group_name || '-'}</p>
                      </td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[var(--theme-primary)]">{row.attendance_count || 0}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold">{findItemScore('cognitive', 'handbook')}</td>
                      
                      {/* Kognitif */}
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findQuizScore(0)}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findQuizScore(1)}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">{row.cognitive_average?.toFixed(1) || '0.0'}</td>
                      
                      {/* Psikomotor */}
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'taat')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'twibon')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'video')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'atribut')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'kreativitas individu')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'kreativitas kelompok')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'memelihara')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">{row.psychomotor_average?.toFixed(1) || '0.0'}</td>
                      
                      {/* Afektif */}
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'etika')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'empati')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'tanggung jawab')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'disiplin')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'adil')}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">{row.affective_average?.toFixed(1) || '0.0'}</td>
                      
                      {/* Komponen */}
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-primary)]">{row.cognitive_weighted?.toFixed(1) || '0.0'}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-primary)]">{row.psychomotor_weighted?.toFixed(1) || '0.0'}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-primary)]">{row.affective_weighted?.toFixed(1) || '0.0'}</td>
                      
                      {/* Akhir */}
                      <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[14px] text-[var(--theme-primary)] bg-[var(--theme-primary)]/5">{row.final_score?.toFixed(1) || '0.0'}</td>
                      <td className="p-3 border-r border-[var(--theme-border-muted)]">
                        <StatusBadgeCell value={row.graduation_status || 'belum_lengkap'} />
                      </td>
                      <td className="p-3 border-l-4 border-l-[var(--theme-bg)] sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10 text-center">
                        <button
                          onClick={() => {
                            setBulkSelectedStudentId(row.student_id);
                            setShowBulkInputModal(true);
                          }}
                          className="w-8 h-8 rounded-lg bg-[var(--theme-bg)] text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/10 flex items-center justify-center transition-colors mx-auto"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          }
            actions={
              <>
                <SelectField
                  value={statusFilter}
                  onValueChange={val => { setStatusFilter(val); setPage(1); }}
                  placeholder="Semua Status"
                  className="min-w-[140px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none flex"
                >
                  <SelectOption value="all">Semua Status</SelectOption>
                  <SelectOption value="passed">Lulus</SelectOption>
                  <SelectOption value="conditional_pass">Lulus Bersyarat</SelectOption>
                  <SelectOption value="not_eligible">Tidak Lulus</SelectOption>
                  <SelectOption value="belum_lengkap">Belum Lengkap</SelectOption>
                  <SelectOption value="dropped_out">Keluar</SelectOption>
                </SelectField>
                <SelectField
                  value={groupFilter ? String(groupFilter) : "all"}
                  onValueChange={val => { setGroupFilter(val); setPage(1); }}
                  placeholder="Semua Kelompok"
                  className="min-w-[160px] h-9 text-xs rounded-lg border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none flex"
                >
                  <SelectOption value="all">Semua Kelompok</SelectOption>
                  {groups?.map(group => (
                    <SelectOption key={group.id} value={String(group.id)}>
                      Kelompok {group.group_number || '-'} - {group.name}
                    </SelectOption>
                  ))}
                </SelectField>
              </>
            }
          />
        </div>
      </div>

      {/* MODAL 1: Detail Student Score Items (Folder Style) */}
      {/* MODAL 1: Detail Student Score Items (Folder Style) */}
      <DialogModal
        open={!!selectedStudent}
        onOpenChange={(isOpen) => {
          if (!isOpen && !bulkUpsertMutation.isPending) {
            setSelectedStudent(null);
            setIsEditing(false);
          }
        }}
        icon="person"
        title={selectedStudent ? (selectedStudent.Nama || selectedStudent.nama) : ''}
        subtitle={isEditing ? 'Mode Edit Nilai' : 'Profil & Nilai Mahasiswa'}
        description={selectedStudent ? `${selectedStudent.ProgramStudi?.Nama || selectedStudent.program_studi || 'Kencana Univ'} • NIM ${selectedStudent.NIM || selectedStudent.nim} ${selectedStudent.Kelompok ? `• Kelompok ${selectedStudent.Kelompok}` : ''}` : ''}
        maxWidth="max-w-2xl"
        footer={
          isEditing ? (
            <>
              <ModalCancelButton onClick={() => setIsEditing(false)}>Batal</ModalCancelButton>
              <ModalSaveButton
                form="single-edit-form"
                loading={bulkUpsertMutation.isPending}
                icon="save"
              >
                Simpan Perubahan
              </ModalSaveButton>
            </>
          ) : (
            <>
              <ModalCancelButton onClick={() => {
                setSelectedStudent(null);
                setIsEditing(false);
              }}>Tutup</ModalCancelButton>
              <button
                onClick={() => setIsEditing(true)}
                className="group relative h-11 px-6 sm:px-8 rounded-xl bg-[var(--theme-primary)] hover:opacity-90 text-white font-black text-[11px] uppercase tracking-[0.1em] transition-all duration-300 flex items-center justify-center gap-2 border border-transparent shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden"
              >
                <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/20 pointer-events-none" />
                <span className="material-symbols-outlined relative z-10 group-hover:scale-110 transition-transform duration-300" style={{ fontSize: '18px' }}>edit</span>
                <span className="relative z-10">Edit Nilai</span>
              </button>
            </>
          )
        }
      >
        {selectedStudent && (
          <div className="space-y-6">
            {loadingDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--theme-primary)]"></div>
              </div>
            ) : isEditing ? (
              /* EDIT FORM */
              <form id="single-edit-form" onSubmit={handleSaveSingleEdit} className="space-y-6">
                {['cognitive', 'psychomotor', 'affective', 'requirements'].map((component) => {
                  const list = getScoreDefinitionsContext(detailedItems)[component] || [];
                  const titles = { cognitive: 'I. Kognitif (Bobot 25%)', psychomotor: 'II. Psikomotor (Bobot 35%)', affective: 'III. Afektif (Bobot 40%)', requirements: 'IV. Persyaratan & Override (Tidak Masuk Bobot)' };
                  return (
                    <div key={component} className="space-y-3 bg-[var(--theme-surface)] p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">{titles[component]}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {list.map(def => {
                          const key = `${component}__${def.key}`;
                          const val = scoresInput[key] ?? '';
                          return (
                            <div key={def.key} className="space-y-1">
                              <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] block">{def.label}</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={val}
                                onChange={e => handleScoreChange(component, def.key, e.target.value)}
                                disabled={!def.manual}
                                className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${def.manual
                                    ? `border-[var(--theme-border)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)]`
                                    : 'border-[var(--theme-border-muted)] bg-[var(--theme-bg)] text-[var(--theme-text-subtle)] cursor-not-allowed font-medium'
                                  }`}
                                placeholder="0"
                              />
                              {!def.manual && (
                                <span className="text-[9px] text-[var(--theme-text-subtle)] block font-semibold">Tersinkronisasi dari sistem</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </form>
            ) : (
              /* READ ONLY BREAKDOWN */
              <div className="space-y-6">
                {/* Summary row */}
                {detailedItems?.score && (
                  <div className="grid grid-cols-3 gap-4 p-4 bg-[var(--theme-primary-light)] rounded-2xl border border-[var(--theme-primary)]/20 bg-surface">
                    <div className="text-center">
                      <span className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider block">Kognitif (Avg)</span>
                      <span className="text-base font-bold text-[var(--theme-text)]">{detailedItems.score.cognitive_average?.toFixed(1) || '0.0'}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider block">Psikomotor (Avg)</span>
                      <span className="text-base font-bold text-[var(--theme-text)]">{detailedItems.score.psychomotor_average?.toFixed(1) || '0.0'}</span>
                    </div>
                    <div className="text-center">
                      <span className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider block">Afektif (Avg)</span>
                      <span className="text-base font-bold text-[var(--theme-text)]">{detailedItems.score.affective_average?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                )}

                {/* Blockers */}
                {detailedItems?.blockers?.length > 0 && (
                  <div className="p-4 bg-[var(--theme-error-light)] border border-[var(--theme-error-light)] rounded-2xl text-[var(--theme-error)] space-y-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--theme-error)] block">⚠️ Kendala Kelulusan:</span>
                    <ul className="list-disc pl-5 text-xs font-semibold space-y-0.5">
                      {detailedItems.blockers.map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  </div>
                )}

                {/* Items breakdown list */}
                <div className="space-y-4">
                  {['cognitive', 'psychomotor', 'affective', 'requirements'].map(comp => {
                    const itemsFromDb = detailedItems?.items?.filter(it => it.component.toLowerCase() === comp) ?? [];
                    const definedItems = getScoreDefinitionsContext(detailedItems)[comp] || [];

                    return (
                      <div key={comp} className="space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)] flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${comp === 'cognitive' ? 'bg-[var(--theme-info)]' : comp === 'psychomotor' ? 'bg-[var(--theme-primary)]' : comp === 'requirements' ? 'bg-[var(--theme-secondary)]' : 'bg-[var(--theme-error)]'}`}></span>
                          {comp}
                        </h4>
                        <div className="border border-[var(--theme-border)] rounded-2xl overflow-hidden divide-y divide-[var(--theme-border-muted)] text-xs bg-surface">
                          {definedItems.map(def => {
                            const dbItem = itemsFromDb.find(it => it.item_name === def.key);
                            return (
                              <div key={def.key} className="p-3 flex items-center justify-between bg-[var(--theme-surface)] hover:bg-[var(--theme-bg)] transition-colors">
                                <div>
                                  <div className="font-bold text-[var(--theme-text)]">{def.label}</div>
                                  {dbItem?.notes && <div className="text-[10px] text-[var(--theme-text-subtle)] italic mt-0.5">Note: {dbItem.notes}</div>}
                                  {!dbItem && def.manual && <div className="text-[10px] text-[var(--theme-error)] italic mt-0.5">Belum diinput</div>}
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className={`font-bold text-sm ${dbItem ? 'text-[var(--theme-text)]' : 'text-[var(--theme-text-subtle)]'}`}>
                                    {dbItem ? dbItem.score : '0'}
                                  </span>
                                  <span className="text-[9px] font-semibold bg-[var(--theme-bg)] text-[var(--theme-text-muted)] rounded px-1.5 py-0.5 uppercase">
                                    {dbItem ? dbItem.source_type : (def.manual ? 'manual' : 'system')}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </DialogModal>

      {/* MODAL 2: Standalone Student Score Entry (Folder Style) */}
      <DialogModal
        open={showBulkInputModal}
        onOpenChange={(isOpen) => {
          if (!isOpen && !bulkUpsertMutation.isPending) {
            setShowBulkInputModal(false);
            setBulkSelectedStudentId('');
            setScoresInput({});
          }
        }}
        icon="edit_document"
        title="Input Nilai Mahasiswa"
        subtitle="Mode Input Nilai"
        description="Pilih salah satu mahasiswa untuk mulai mengisi sub-item komponen nilai."
        maxWidth="max-w-2xl"
        footer={
          bulkSelectedStudentId ? (
            <>
              <ModalCancelButton onClick={() => {
                setShowBulkInputModal(false);
                setBulkSelectedStudentId('');
                setScoresInput({});
              }}>Batal</ModalCancelButton>
              <ModalSaveButton
                form="bulk-input-form"
                loading={bulkUpsertMutation.isPending}
                icon="save"
              >
                Simpan Nilai
              </ModalSaveButton>
            </>
          ) : (
            <ModalCancelButton onClick={() => {
              setShowBulkInputModal(false);
              setBulkSelectedStudentId('');
              setScoresInput({});
            }}>Tutup</ModalCancelButton>
          )
        }
      >
        <div className="space-y-6">
          {/* Dropdown Selection */}
          <div className="space-y-1.5 bg-[var(--theme-surface)] p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
            <label className="text-xs font-semibold text-[var(--theme-text-muted)] block">Nama / NIM Mahasiswa</label>
            <div className="relative z-[1000]" onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setOpenStudentSelect(false);
              }
            }}>
              <div className="flex items-center w-full bg-white border border-[var(--theme-border)] rounded-xl focus-within:border-[var(--theme-primary)] focus-within:ring-2 focus-within:ring-[var(--theme-primary-light)] transition-all overflow-hidden h-11 shadow-sm">
                <span className="material-symbols-outlined text-[var(--theme-text-muted)] pl-4 pr-2 text-[20px]">search</span>
                <input
                  type="text"
                  className="flex-1 h-full bg-transparent !border-none !outline-none !ring-0 focus:!border-none focus:!outline-none focus:!ring-0 text-sm font-semibold text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] px-0 m-0"
                  placeholder={bulkSelectedStudentId ? (() => {
                    const s = participants?.data?.find(st => String(st.id || st.ID) === String(bulkSelectedStudentId));
                    return s ? `${s.nama || s.Nama} — NIM: ${s.nim || s.NIM}` : "Ketik nama atau NIM...";
                  })() : "Ketik nama atau NIM..."}
                  value={studentSearchQuery}
                  onChange={(e) => {
                    setStudentSearchQuery(e.target.value);
                    if (!openStudentSelect) setOpenStudentSelect(true);
                    if (bulkSelectedStudentId && e.target.value !== '') {
                      setBulkSelectedStudentId('');
                      setScoresInput({});
                    }
                  }}
                  onFocus={() => setOpenStudentSelect(true)}
                />
                <button
                  type="button"
                  onClick={() => setOpenStudentSelect(!openStudentSelect)}
                  className="px-4 h-full flex items-center justify-center text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {openStudentSelect ? 'expand_less' : 'expand_more'}
                  </span>
                </button>
              </div>

              {openStudentSelect && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-[var(--theme-border)] shadow-md rounded-xl max-h-[250px] overflow-y-auto z-[1000] p-1 animate-in fade-in zoom-in-95 duration-100">
                  {(() => {
                    if (!studentSearchQuery || studentSearchQuery.trim().length === 0) {
                      return <div className="py-6 text-center text-sm text-[var(--theme-text-muted)]">Mulai ketik nama atau NIM...</div>;
                    }

                    const filtered = participants?.data?.filter(s => {
                      const q = studentSearchQuery.toLowerCase();
                      return (s.nama || s.Nama)?.toLowerCase().includes(q) || (s.nim || s.NIM)?.toLowerCase().includes(q);
                    });

                    if (!filtered || filtered.length === 0) {
                      return <div className="py-6 text-center text-sm text-[var(--theme-text-muted)]">Mahasiswa tidak ditemukan.</div>;
                    }

                    return filtered.map(s => (
                      <button
                        key={s.id || s.ID}
                        type="button"
                        onClick={() => {
                          setBulkSelectedStudentId(String(s.id || s.ID));
                          setStudentSearchQuery('');
                          setScoresInput({});
                          setOpenStudentSelect(false);
                        }}
                        className="w-full text-left relative flex items-center gap-2 rounded-lg py-2.5 pl-8 pr-2 text-sm text-[var(--theme-text)] cursor-pointer outline-none hover:bg-[var(--theme-primary-light)] hover:text-[var(--theme-primary)] transition-colors"
                      >
                        <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                          {String(bulkSelectedStudentId) === String(s.id || s.ID) && (
                            <span className="material-symbols-outlined text-[16px]">check</span>
                          )}
                        </span>
                        <div className="flex flex-col min-w-0">
                          <span className="font-bold truncate">{s.nama || s.Nama}</span>
                          <span className="text-[10px] text-[var(--theme-text-muted)] font-semibold uppercase tracking-wider group-hover:text-[var(--theme-primary)]">
                            NIM: {s.nim || s.NIM}
                          </span>
                        </div>
                      </button>
                    ));
                  })()}
                </div>
              )}
            </div>
          </div>

          {bulkSelectedStudentId && (
            loadingBulkDetails ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[var(--theme-primary)]"></div>
              </div>
            ) : (
              /* Form */
              <form id="bulk-input-form" onSubmit={handleSaveBulkInput} className="space-y-6">
                {['cognitive', 'psychomotor', 'affective', 'requirements'].map((component) => {
                  const list = getScoreDefinitionsContext(bulkDetailedItems)[component] || [];
                  const titles = { cognitive: 'I. Kognitif (Bobot 25%)', psychomotor: 'II. Psikomotor (Bobot 35%)', affective: 'III. Afektif (Bobot 40%)', requirements: 'IV. Persyaratan & Override (Tidak Masuk Bobot)' };
                  return (
                    <div key={component} className="space-y-3 bg-[var(--theme-surface)] p-5 rounded-2xl border border-[var(--theme-border)] shadow-sm">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--theme-text-muted)]">{titles[component]}</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {list.map(def => {
                          const key = `${component}__${def.key}`;
                          const val = scoresInput[key] ?? '';
                          return (
                            <div key={def.key} className="space-y-1">
                              <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] block">{def.label}</label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="any"
                                value={val}
                                onChange={e => handleScoreChange(component, def.key, e.target.value)}
                                disabled={!def.manual}
                                className={`w-full h-10 px-3 rounded-xl border text-xs font-semibold focus:outline-none transition-all ${def.manual
                                    ? `border-[var(--theme-border)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)]`
                                    : 'border-[var(--theme-border-muted)] bg-[var(--theme-bg)] text-[var(--theme-text-subtle)] cursor-not-allowed font-medium'
                                  }`}
                                placeholder="0"
                              />
                              {!def.manual && (
                                <span className="text-[9px] text-[var(--theme-text-subtle)] block font-semibold">Tersinkronisasi dari sistem</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </form>
            )
          )}
        </div>
      </DialogModal>
    </div>
  );
};

export default Scores;
