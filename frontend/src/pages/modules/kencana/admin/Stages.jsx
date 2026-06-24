import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from "@/lib/utils";
import {
  usePeriodsQuery, useStagesQuery, useCreateStageMutation, useUpdateStageMutation,
  useCreateSessionMutation, useUpdateSessionMutation,
  usePeriodPhasesQuery,
} from '@/queries/useKencanaAdminQuery';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { DashboardHero } from '@/components/ui/dashboard';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { DataTable } from '@/components/ui/DataTable';
import { Settings2 } from 'lucide-react';
import { ManageMaterialsModal } from '../components/ManageMaterialsModal';
import { ManageQuizzesModal } from '../components/ManageQuizzesModal';
import { ManageAssignmentsModal } from '../components/ManageAssignmentsModal';

// ──── Constants ────────────────────────────────────────────────────────────────
const PHASE_CONFIG = {
  pra_kencana: {
    title: 'Pra-Kencana',
    subtitle: 'Kelola sesi persiapan, materi awal, tugas pembuka, dan kuis pra-orientasi.',
  },
  kencana_universitas: {
    title: 'Kencana Universitas',
    subtitle: 'Kelola sesi utama universitas, materi kebijakan kampus, tugas, dan kuis orientasi pusat.',
  },
  pasca_kencana: {
    title: 'Pasca-Kencana',
    subtitle: 'Kelola sesi refleksi, tugas akhir, kuis evaluasi, dan penutupan setelah orientasi utama.',
  },
};

const StatusBadge = ({ status }) => {
  const map = {
    published: 'bg-emerald-50 text-emerald-700',
    active: 'bg-emerald-50 text-emerald-700',
    locked: 'bg-slate-50 text-slate-600',
    draft: 'bg-amber-50 text-amber-700',
    completed: 'bg-indigo-50 text-indigo-700',
  };
  const labelMap = { published: 'Aktif', active: 'Aktif', locked: 'Terkunci', draft: 'Draft', completed: 'Selesai' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-wider', map[status] || 'bg-slate-50 text-slate-600')}>
      <span className={cn('w-1.5 h-1.5 rounded-full', status === 'active' || status === 'published' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400')} />
      {labelMap[status] || status}
    </span>
  );
};

const formatDate = (date, options = { day: '2-digit', month: 'short', year: 'numeric' }) => (
  date ? new Date(date).toLocaleDateString('id-ID', options) : '-'
);

const getContentCount = (session, key) => session?.[key]?.length || session?.[key.charAt(0).toUpperCase() + key.slice(1)]?.length || 0;

const formatApiDate = (d) => {
  if (!d) return null;
  if (d.includes('T')) return d;
  return `${d}T00:00:00Z`;
};

// ──── Main Component ────────────────────────────────────────────────────────
const Stages = ({ phaseType = 'kencana_universitas' }) => {
  const navigate = useNavigate();
  const phaseConfig = PHASE_CONFIG[phaseType] || PHASE_CONFIG.kencana_universitas;
  const { data: periods, isLoading: loadingPeriods } = usePeriodsQuery();
  const [selectedPeriodId, setSelectedPeriodId] = useState('');

  useEffect(() => {
    if (periods?.length > 0 && !selectedPeriodId) {
      const active = periods.find(p => p.is_active || p.status === 'active' || p.status === 'published') || periods[0];
      setSelectedPeriodId(String(active.id));
    }
  }, [periods, selectedPeriodId]);

  const { data: stages, isLoading: loadingStages } = useStagesQuery(selectedPeriodId, { type: phaseType });
  const { data: phaseData } = usePeriodPhasesQuery(selectedPeriodId);

  const [showAddSessionModal, setShowAddSessionModal] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [showEditSessionModal, setShowEditSessionModal] = useState(false);
  const [activeStage, setActiveStage] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', status: 'locked', is_required: true, start_date: '', end_date: '' });

  const createStageMutation = useCreateStageMutation();
  const updateStageMutation = useUpdateStageMutation();
  const createSessionMutation = useCreateSessionMutation();
  const updateSessionMutation = useUpdateSessionMutation();

  const ensurePhaseStage = async () => {
    if (!selectedPeriodId) return null;
    const timeline = phaseData?.timeline_phases?.find(item => item.phase_type === phaseType);
    
    if (stages?.length) {
      const stage = stages[0];
      const tStart = timeline?.start_date ? timeline.start_date.slice(0, 10) : '';
      const tEnd = timeline?.end_date ? timeline.end_date.slice(0, 10) : '';
      const sStart = stage.start_date ? stage.start_date.slice(0, 10) : '';
      const sEnd = stage.end_date ? stage.end_date.slice(0, 10) : '';
      
      const expectedStatus = timeline?.is_active ? 'active' : 'locked';
      const expectedPublished = Boolean(timeline?.is_active);
      
      if (['pra_kencana', 'kencana_universitas'].includes(phaseType) && 
          (tStart !== sStart || tEnd !== sEnd || stage.status !== expectedStatus || stage.is_published !== expectedPublished)) {
        updateStageMutation.mutate({
          id: stage.id,
          start_date: formatApiDate(tStart),
          end_date: formatApiDate(tEnd),
          status: expectedStatus,
          is_published: expectedPublished
        });
      }
      return stage;
    }

    return createStageMutation.mutateAsync({
      name: phaseConfig.title,
      type: phaseType,
      period_id: Number(selectedPeriodId),
      status: timeline?.is_active ? 'active' : 'locked',
      is_published: Boolean(timeline?.is_active),
      description: phaseConfig.subtitle,
      start_date: formatApiDate(timeline?.start_date ? timeline.start_date.slice(0, 10) : null),
      end_date: formatApiDate(timeline?.end_date ? timeline.end_date.slice(0, 10) : null),
    });
  };

  const handleCreateSession = (e) => {
    e.preventDefault();
    if (!activeStage) return;
    
    const payload = { ...sessionForm, stage_id: activeStage.id };
    payload.start_date = formatApiDate(payload.start_date);
    payload.end_date = formatApiDate(payload.end_date);

    createSessionMutation.mutate(
      payload,
      { onSuccess: () => { setShowAddSessionModal(false); setSessionForm({ title: '', description: '', status: 'locked', is_required: true, start_date: '', end_date: '' }); } }
    );
  };

  const handleUpdateSession = (e) => {
    e.preventDefault();
    if (!activeSession) return;
    const payload = { ...sessionForm };
    payload.start_date = formatApiDate(payload.start_date);
    payload.end_date = formatApiDate(payload.end_date);
    updateSessionMutation.mutate(
      { id: activeSession.id, ...payload },
      { onSuccess: () => { setShowEditSessionModal(false); setActiveSession(null); } }
    );
  };

  const openAddSession = async (stage = null) => {
    const targetStage = stage || await ensurePhaseStage();
    if (!targetStage) return;
    const timeline = phaseData?.timeline_phases?.find(item => item.phase_type === phaseType);
    setActiveStage(targetStage);
    setSessionForm({
      title: '',
      description: '',
      status: timeline?.is_active ? 'active' : 'locked',
      is_required: true,
      start_date: timeline?.start_date ? timeline.start_date.slice(0, 10) : '',
      end_date: timeline?.end_date ? timeline.end_date.slice(0, 10) : '',
    });
    setShowAddSessionModal(true);
  };

  const openEditSession = (session) => {
    setActiveSession(session);
    setSessionForm({
      title: session.title,
      description: session.description || '',
      status: session.status,
      is_required: session.is_required,
      start_date: session.start_date ? session.start_date.slice(0, 10) : '',
      end_date: session.end_date ? session.end_date.slice(0, 10) : '',
    });
    setShowEditSessionModal(true);
  };

  const set = (k, v) => setSessionForm(prev => ({ ...prev, [k]: v }));

  const phaseTimeline = phaseData?.timeline_phases?.find(item => item.phase_type === phaseType);
  const phaseStage = stages?.[0] || null;
  const phaseSessions = stages?.flatMap(stage => (stage.sessions || []).map(session => ({ ...session, stage }))) || [];
  const totalMaterials = phaseSessions.reduce((sum, session) => sum + getContentCount(session, 'materials'), 0);
  const totalQuizzes = phaseSessions.reduce((sum, session) => sum + getContentCount(session, 'quizzes'), 0);
  const totalAssignments = phaseSessions.reduce((sum, session) => sum + getContentCount(session, 'assignments'), 0);

  return (
    <div className="font-body max-w-7xl mx-auto space-y-4 pb-12">
      
      {/* Page Header (using Faculty Admin DashboardHero) */}
      <DashboardHero
        title="Sesi "
        highlightedTitle={phaseConfig.title}
        subtitle={phaseConfig.subtitle}
        icon="view_kanban"
        actions={
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:w-[220px]">
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                disabled={loadingPeriods}
                className="w-full h-9 px-3 pr-8 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] shadow-sm appearance-none cursor-pointer transition-colors"
              >
                <option value="" disabled>Pilih Periode...</option>
                {periods?.map(p => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name} {p.status === 'active' || p.status === 'published' ? '(Aktif)' : ''}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-2.5 flex items-center pointer-events-none">
                <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '18px' }}>expand_more</span>
              </div>
            </div>
            <button
              onClick={() => openAddSession(phaseStage)}
              disabled={!selectedPeriodId || createStageMutation.isPending}
              className="h-10 px-4 rounded-xl bg-primary hover:bg-bku-hover text-white text-xs font-bold uppercase tracking-wider gap-2 flex items-center transition-all active:scale-95 shadow-lg shadow-bku-primary/20 shrink-0 w-full sm:w-auto justify-center"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span> Tambah Sesi
            </button>
          </div>
        }
      />

      {/* Stats Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        <PrimaryStatsCard
          title="Timeline"
          value={loadingStages ? <span className="material-symbols-outlined animate-spin">sync</span> : `${formatDate(phaseTimeline?.start_date)} - ${formatDate(phaseTimeline?.end_date)}`}
          icon="event"
          colorTheme="primary"
          subtitle="Jadwal pelaksanaan"
        />
        <PrimaryStatsCard
          title="Total Sesi"
          value={loadingStages ? <span className="material-symbols-outlined animate-spin">sync</span> : phaseSessions.length}
          icon="view_agenda"
          colorTheme="success"
          subtitle="Sesi pembelajaran"
        />
        <PrimaryStatsCard
          title="Materi & Kuis"
          value={loadingStages ? <span className="material-symbols-outlined animate-spin">sync</span> : (totalMaterials + totalQuizzes)}
          icon="library_books"
          colorTheme="warning"
          subtitle="Konten aktif"
        />
        <PrimaryStatsCard
          title="Tugas"
          value={loadingStages ? <span className="material-symbols-outlined animate-spin">sync</span> : totalAssignments}
          icon="assignment"
          colorTheme="info"
          subtitle="Tagihan utama"
        />
      </div>

      {/* Content */}
      <div className="mt-8">
        {loadingStages ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : !selectedPeriodId ? (
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8 text-center text-slate-500 font-medium">
            Silakan pilih periode di atas.
          </div>
        ) : phaseSessions.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-sm">
            <div className="text-4xl mb-4 text-slate-300">📚</div>
            <h2 className="text-lg font-bold text-slate-800 mb-2">Belum Ada Sesi</h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              Sesi akan menjadi wadah untuk materi, tugas, dan kuis. Buat sesi pertama Anda untuk memulai.
            </p>
            <button
              onClick={() => openAddSession(phaseStage)}
              disabled={createStageMutation.isPending}
              className="h-10 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold uppercase tracking-wider transition-all inline-flex items-center gap-2"
            >
              Tambah Sesi Pertama
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 mt-6">
            <DataTable
              data={phaseSessions}
              columns={[
                {
                  key: 'title',
                  label: 'Detail Sesi',
                  className: 'w-[45%]',
                  render: (v, item) => (
                    <div className="flex flex-col py-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="font-bold text-[var(--theme-text)] font-jakarta text-sm">{item.title}</span>
                      </div>
                      <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed line-clamp-2">
                        {item.description || 'Tidak ada deskripsi.'}
                      </p>
                      <div className="flex gap-2 mt-2">
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>library_books</span>
                          Materi: {getContentCount(item, 'materials')}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>quiz</span>
                          Kuis: {getContentCount(item, 'quizzes')}
                        </span>
                        <span className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }}>assignment</span>
                          Tugas: {getContentCount(item, 'assignments')}
                        </span>
                      </div>
                    </div>
                  )
                },
                {
                  key: 'schedule',
                  label: 'Jadwal Sesi',
                  className: 'w-[25%]',
                  render: (v, item) => {
                    const hasSchedule = item.start_date && item.end_date;
                    if (!hasSchedule) return <span className="text-[11px] text-slate-400 italic">Belum diatur</span>;
                    
                    const start = new Date(item.start_date);
                    const end = new Date(item.end_date);
                    const now = new Date();
                    
                    return (
                      <div className="flex flex-col gap-1.5 py-1">
                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 bg-slate-50 w-fit px-2.5 py-1 rounded-md border border-slate-100">
                          <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '14px' }}>calendar_today</span>
                          {start.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {end.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        {now > end ? (
                          <span className="text-[11px] font-bold text-slate-500 pl-1">Berakhir</span>
                        ) : now >= start && now <= end ? (
                          <span className="text-[11px] font-bold text-amber-500 animate-pulse pl-1">Sedang Berlangsung</span>
                        ) : (
                          <span className="text-[11px] font-bold text-[var(--theme-primary)] pl-1">
                            {Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))} Hari Lagi
                          </span>
                        )}
                      </div>
                    );
                  }
                },
                {
                  key: 'is_required',
                  label: 'Sifat',
                  className: 'w-[10%]',
                  render: (v, item) => (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${item.is_required ? 'bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)]' : 'bg-slate-100 text-slate-500'}`}>
                      {item.is_required ? 'Wajib' : 'Opsional'}
                    </span>
                  )
                },
                {
                  key: 'status',
                  label: 'Status',
                  className: 'w-[10%]',
                  render: (v, item) => <StatusBadge status={item.status} />
                },
                {
                  key: 'actions',
                  label: 'Aksi',
                  className: 'w-[10%] text-center',
                  cellClassName: 'text-center',
                  sortable: false,
                  render: (_, item) => (
                    <div className="flex justify-center items-center gap-1">
                      <button 
                        onClick={() => openEditSession(item)}
                        title="Edit Sesi"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
                      </button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            title="Kelola Konten"
                            className="px-3 py-1.5 rounded-lg text-white bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 text-[11px] font-bold ml-1"
                          >
                            <Settings2 className="w-[12px] h-[12px]" strokeWidth={2.5} />
                            Kelola
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-40 p-1 rounded-xl bg-white border border-slate-100 shadow-xl z-50">
                          <div className="flex flex-col">
                            <button onClick={() => { setActiveSessionId(item.id); setShowMaterialModal(true); }} className="text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px]">library_books</span> Materi
                            </button>
                            <button onClick={() => { setActiveSessionId(item.id); setShowQuizModal(true); }} className="text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px]">quiz</span> Kuis
                            </button>
                            <button onClick={() => { setActiveSessionId(item.id); setShowAssignmentModal(true); }} className="text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary rounded-lg transition-colors flex items-center gap-2">
                              <span className="material-symbols-outlined text-[16px]">assignment</span> Tugas
                            </button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )
                }
              ]}
              searchPlaceholder="Cari sesi..."
              searchable={true}
            />
          </div>
        )}
      </div>

      {/* Add Session Custom Modal (from Faculty Admin style) */}
      <DialogModal
        open={showAddSessionModal}
        onOpenChange={setShowAddSessionModal}
        title="Buat Sesi Baru"
        subtitle="Isi semua detail sesi di bawah ini dengan lengkap."
        icon="add_box"
        maxWidth="max-w-lg"
        footer={
          <>
            <ModalCancelButton onClick={() => setShowAddSessionModal(false)} />
            <ModalSaveButton
              form="createSessionForm"
              loading={createSessionMutation.isPending}
              icon="save"
            >
              Simpan Sesi
            </ModalSaveButton>
          </>
        }
      >
        <form id="createSessionForm" onSubmit={handleCreateSession} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-[var(--theme-text)]">Judul Sesi</span>
            <input
              value={sessionForm.title}
              onChange={e => set('title', e.target.value)}
              placeholder="Contoh: Sesi 1 - Pengenalan Kampus..."
              required
              className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all"
            />
          </label>
          
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-[var(--theme-text)]">Deskripsi Sesi</span>
            <textarea
              value={sessionForm.description}
              onChange={e => set('description', e.target.value)}
              placeholder="Materi yang akan dibahas..."
              rows="3"
              className="w-full py-3 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Tanggal Mulai</span>
              <input
                type="date"
                value={sessionForm.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Tanggal Berakhir</span>
              <input
                type="date"
                value={sessionForm.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Status Sesi</span>
              <select
                value={sessionForm.status}
                onChange={e => set('status', e.target.value)}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="active">Aktif</option>
                <option value="locked">Terkunci</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Sifat Sesi</span>
              <select
                value={String(sessionForm.is_required)}
                onChange={e => set('is_required', e.target.value === 'true')}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="true">Wajib</option>
                <option value="false">Opsional</option>
              </select>
            </label>
          </div>
        </form>
      </DialogModal>

      {/* Edit Session Custom Modal */}
      <DialogModal
        open={showEditSessionModal}
        onOpenChange={setShowEditSessionModal}
        title="Update Detail Sesi"
        subtitle="Perbarui informasi sesi di bawah ini."
        icon="edit_square"
        maxWidth="max-w-lg"
        footer={
          <>
            <ModalCancelButton onClick={() => setShowEditSessionModal(false)} />
            <ModalSaveButton
              form="editSessionForm"
              loading={updateSessionMutation.isPending}
              icon="save"
            >
              Update Sesi
            </ModalSaveButton>
          </>
        }
      >
        <form id="editSessionForm" onSubmit={handleUpdateSession} className="space-y-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-[var(--theme-text)]">Judul Sesi</span>
            <input
              value={sessionForm.title}
              onChange={e => set('title', e.target.value)}
              required
              className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all"
            />
          </label>
          
          <label className="block space-y-1.5">
            <span className="text-sm font-bold text-[var(--theme-text)]">Deskripsi Sesi</span>
            <textarea
              value={sessionForm.description}
              onChange={e => set('description', e.target.value)}
              rows="3"
              className="w-full py-3 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all resize-none"
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Tanggal Mulai</span>
              <input
                type="date"
                value={sessionForm.start_date}
                onChange={e => set('start_date', e.target.value)}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Tanggal Berakhir</span>
              <input
                type="date"
                value={sessionForm.end_date}
                onChange={e => set('end_date', e.target.value)}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Status Sesi</span>
              <select
                value={sessionForm.status}
                onChange={e => set('status', e.target.value)}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="active">Aktif</option>
                <option value="locked">Terkunci</option>
                <option value="published">Diterbitkan</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-bold text-[var(--theme-text)]">Sifat Sesi</span>
              <select
                value={String(sessionForm.is_required)}
                onChange={e => set('is_required', e.target.value === 'true')}
                className="w-full h-11 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-medium outline-none focus:ring-4 focus:ring-[var(--theme-primary)]/10 focus:border-[var(--theme-primary)] transition-all appearance-none cursor-pointer"
              >
                <option value="true">Wajib</option>
                <option value="false">Opsional</option>
              </select>
            </label>
          </div>
        </form>
      </DialogModal>

      <ManageMaterialsModal
        open={showMaterialModal}
        onOpenChange={setShowMaterialModal}
        sessionId={activeSessionId}
      />
      <ManageQuizzesModal
        open={showQuizModal}
        onOpenChange={setShowQuizModal}
        sessionId={activeSessionId}
      />
      <ManageAssignmentsModal
        open={showAssignmentModal}
        onOpenChange={setShowAssignmentModal}
        sessionId={activeSessionId}
      />
    </div>
  );
};

export default Stages;
