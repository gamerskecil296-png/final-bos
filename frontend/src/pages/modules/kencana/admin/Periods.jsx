import React, { useEffect, useMemo, useState } from 'react';
import {
  useOpenFacultyPhasesMutation,
  usePeriodPhasesQuery,
  usePeriodsQuery,
  useUpdateTimelinePhaseMutation,
  useUpdateUniversityPhaseMutation,
  useCreatePeriodMutation,
  useResetKencanaMutation,
} from '@/queries/useKencanaAdminQuery';
import toast from 'react-hot-toast';
import { PageHeader } from '@/components/ui/page/PageHeader';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';

const phases = [
  { key: 'pra_kencana', title: 'Tahap 1: Pra-Kencana', short: 'Pra-Kencana', hint: 'Persiapan, briefing awal, handbook, dan tugas pembuka.', tone: 'violet', icon: 'flag' },
  { key: 'kencana_universitas', title: 'Tahap 2: Kencana University', short: 'University', hint: 'Orientasi utama tingkat universitas.', tone: 'emerald', icon: 'account_balance' },
  { key: 'kencana_fakultas', title: 'Tahap 3: Kencana Fakultas', short: 'Fakultas', hint: 'Orientasi per fakultas setelah University selesai.', tone: 'sky', icon: 'corporate_fare' },
  { key: 'pasca_kencana', title: 'Tahap 4: Pasca-Kencana', short: 'Pasca-Kencana', hint: 'Refleksi, remedial, penutupan, dan sertifikat.', tone: 'amber', icon: 'verified' },
];

const statusClass = {
  active: 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]',
  completed: 'bg-[var(--theme-info-light)] text-[var(--theme-info)] border-[var(--theme-info-light)]',
  inactive: 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]',
  not_open: 'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]',
  ready: 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]',
};

const statusLabel = {
  active: 'Aktif',
  completed: 'Selesai',
  inactive: 'Nonaktif',
  not_open: 'Terkunci',
  ready: 'Siap',
};

const toneClass = {
  violet: 'from-[var(--theme-primary-light)] to-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-primary)]',
  emerald: 'from-[var(--theme-success-light)] to-[var(--theme-surface)] border-[var(--theme-success-light)] text-[var(--theme-success)]',
  sky: 'from-[var(--theme-info-light)] to-[var(--theme-surface)] border-[var(--theme-info-light)] text-[var(--theme-info)]',
  amber: 'from-[var(--theme-warning-light)] to-[var(--theme-surface)] border-[var(--theme-warning-light)] text-[var(--theme-warning)]',
};

const Badge = ({ status }) => (
  <span className={`inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${statusClass[status] || statusClass.inactive}`}>
    {statusLabel[status] || 'Belum Aktif'}
  </span>
);

const fmtDate = (value) => value ? new Date(value).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Belum diatur';

const Periods = () => {
  const { data: periods, isLoading } = usePeriodsQuery();
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [activePhase, setActivePhase] = useState('pra_kencana');
  const [phaseDraft, setPhaseDraft] = useState(() => phases.reduce((acc, item) => ({ ...acc, [item.key]: { start: '', end: '' } }), {}));

  const { data: phaseData, isLoading: loadingPhases } = usePeriodPhasesQuery(selectedPeriodId);
  const updateTimelinePhase = useUpdateTimelinePhaseMutation();
  const updateUniversityPhase = useUpdateUniversityPhaseMutation();
  const openFacultyPhases = useOpenFacultyPhasesMutation();
  const createPeriod = useCreatePeriodMutation();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPeriodData, setNewPeriodData] = useState({ name: '', description: '', passing_grade: 60, remedial_grade: 50, theme: '' });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const resetKencana = useResetKencanaMutation();

  const handleCreatePeriod = async (e) => {
    e.preventDefault();
    if (!newPeriodData.name) {
      toast.error('Nama periode wajib diisi');
      return;
    }
    createPeriod.mutate(newPeriodData, {
      onSuccess: (res) => {
        toast.success('Periode berhasil dibuat!');
        setIsCreateModalOpen(false);
        if (res.data?.id) setSelectedPeriodId(String(res.data.id));
        setNewPeriodData({ name: '', description: '', passing_grade: 60, remedial_grade: 50, theme: '' });
      },
      onError: (err) => toast.error(err?.response?.data?.message || 'Gagal membuat periode'),
    });
  };

  useEffect(() => {
    if (periods?.length && !selectedPeriodId) {
      const active = periods.find(p => p.status === 'active' || p.university_phase_status === 'active') || periods[0];
      setSelectedPeriodId(String(active.id));
    }
  }, [periods, selectedPeriodId]);

  const selectedPeriod = phaseData?.period || periods?.find(p => String(p.id) === String(selectedPeriodId));
  const facultyPhases = phaseData?.faculty_phases || [];
  const timelinePhases = phaseData?.timeline_phases || [];
  const universityStatus = selectedPeriod?.university_phase_status || 'draft';
  const savedTimeline = useMemo(() => timelinePhases.reduce((acc, phase) => ({ ...acc, [phase.phase_type]: phase }), {}), [timelinePhases]);
  const activeSavedPhase = useMemo(() => timelinePhases.find(phase => phase.is_active)?.phase_type || '', [timelinePhases]);
  const activePhaseMeta = useMemo(() => phases.find(phase => phase.key === activePhase) || phases[0], [activePhase]);

  useEffect(() => {
    if (!timelinePhases.length) return;
    setPhaseDraft(prev => {
      const next = { ...prev };
      timelinePhases.forEach(phase => {
        next[phase.phase_type] = {
          start: phase.start_date ? phase.start_date.slice(0, 10) : '',
          end: phase.end_date ? phase.end_date.slice(0, 10) : '',
        };
      });
      return next;
    });
  }, [timelinePhases]);

  useEffect(() => {
    if (activeSavedPhase) setActivePhase(activeSavedPhase);
  }, [activeSavedPhase]);

  const phaseState = useMemo(() => ({
    pra_kencana: savedTimeline.pra_kencana?.is_active ? 'active' : savedTimeline.pra_kencana?.status === 'completed' ? 'completed' : 'inactive',
    kencana_universitas: savedTimeline.kencana_universitas?.is_active ? 'active' : universityStatus === 'completed' ? 'completed' : 'inactive',
    kencana_fakultas: savedTimeline.kencana_fakultas?.is_active ? 'active' : 'inactive',
    pasca_kencana: savedTimeline.pasca_kencana?.is_active ? 'active' : 'inactive',
  }), [savedTimeline, universityStatus]);

  const updateDraft = (key, field, value) => {
    setPhaseDraft(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const saveTimeline = (makeActive = false) => {
    if (!selectedPeriod) {
      toast.error('Pilih periode terlebih dahulu.');
      return;
    }
    const currentStart = phaseDraft[activePhase]?.start;
    const currentEnd = phaseDraft[activePhase]?.end;

    if (!currentStart || !currentEnd) {
      toast.error('Tanggal mulai dan selesai wajib diisi.');
      return;
    }

    if (new Date(currentStart) > new Date(currentEnd)) {
      toast.error('Tanggal mulai tidak boleh melebihi tanggal selesai.');
      return;
    }

    const phaseOrder = ['pra_kencana', 'kencana_universitas', 'kencana_fakultas', 'pasca_kencana'];
    const activeIdx = phaseOrder.indexOf(activePhase);
    
    if (activeIdx > 0) {
      const prevPhase = phaseOrder[activeIdx - 1];
      const prevPhaseData = savedTimeline[prevPhase] || phaseDraft[prevPhase];
      const prevEnd = prevPhaseData?.end_date?.slice(0,10) || prevPhaseData?.end;
      
      if (prevEnd && new Date(currentStart) < new Date(prevEnd)) {
        toast.error(`Tanggal mulai tidak boleh mendahului tanggal selesai tahap sebelumnya.`);
        return;
      }
    }
    const keepActive = Boolean(savedTimeline[activePhase]?.is_active);
    updateTimelinePhase.mutate({
      periodId: selectedPeriod.id,
      phaseType: activePhase,
      start_date: phaseDraft[activePhase]?.start || null,
      end_date: phaseDraft[activePhase]?.end || null,
      status: makeActive || keepActive ? 'active' : 'draft',
      is_active: makeActive || keepActive,
    }, {
      onSuccess: () => toast.success(makeActive ? 'Timeline disimpan dan fase diaktifkan.' : 'Timeline berhasil disimpan.'),
      onError: (err) => toast.error(err?.response?.data?.message || err?.message || 'Gagal menyimpan timeline.'),
    });
  };

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon="calendar_month"
        title={
          <>
            <span className="text-[var(--theme-text)]">Kelola </span>
            <span className="text-[var(--theme-primary)]">Timeline Kencana</span>
          </>
        }
        subtitle="Atur periode PKKMB (Kencana) dan kelola alur orientasinya dari Pra-Kencana hingga Pasca-Kencana."
        breadcrumbs={[
          { label: 'Kencana Admin', path: '#' },
          { label: 'Kelola Timeline' }
        ]}
        action={
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
            <SelectField
              value={selectedPeriodId}
              onValueChange={setSelectedPeriodId}
              placeholder="Pilih Periode..."
              className="min-w-[200px]"
            >
              {(periods || []).map(period => (
                <SelectOption key={period.id} value={String(period.id)}>
                  {period.name} {period.status === 'active' ? '(Aktif)' : ''}
                </SelectOption>
              ))}
            </SelectField>
            
            <div className="flex w-full sm:w-auto mt-2 sm:mt-0 gap-2">
              <button 
                onClick={() => setIsResetModalOpen(true)}
                className="h-11 rounded-xl bg-rose-600 hover:bg-rose-700 px-4 text-xs font-bold text-white shadow-md transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                Reset Kencana
              </button>
              <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="h-11 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] px-4 text-xs font-bold text-white shadow-md transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none"
              >
                <span className="material-symbols-outlined text-base">add</span>
                Buat Manual
              </button>
            </div>
          </div>
        }
      />

      {selectedPeriod ? (
        <>
          {/* Period Context Card */}
          <div className="rounded-2xl border border-[var(--theme-border)] bg-white p-6 shadow-sm">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-subtle)]">Periode Terpilih</p>
                <h2 className="mt-1 text-2xl font-bold text-[var(--theme-text)]">{selectedPeriod.name}</h2>
                <p className="mt-1 text-sm font-medium text-[var(--theme-text-muted)] max-w-2xl">{selectedPeriod.description || 'Tidak ada deskripsi.'}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-right">
                <div className="bg-[var(--theme-bg)] rounded-xl px-4 py-2 border border-[var(--theme-border)] text-left">
                  <p className="text-[10px] font-black uppercase text-[var(--theme-text-subtle)]">Passing Grade</p>
                  <p className="text-lg font-bold text-[var(--theme-success)]">{selectedPeriod.passing_grade}</p>
                </div>
                <div className="bg-[var(--theme-bg)] rounded-xl px-4 py-2 border border-[var(--theme-border)] text-left">
                  <p className="text-[10px] font-black uppercase text-[var(--theme-text-subtle)]">Batas Remedial</p>
                  <p className="text-lg font-bold text-[var(--theme-warning)]">{selectedPeriod.remedial_grade}</p>
                </div>
              </div>
            </div>
            {selectedPeriod.theme && (
              <div className="mt-4 inline-block bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] px-4 py-1.5 rounded-full text-xs font-bold border border-[var(--theme-primary)]/20">
                Tema: {selectedPeriod.theme}
              </div>
            )}
          </div>

          {/* Horizontal Stepper Navigation */}
          <div className="flex w-full items-center">
            {phases.map((phase, idx) => {
              const isActive = activePhase === phase.key;
              const status = phaseState[phase.key];
              const isCompleted = status === 'completed';
              const isStatusActive = status === 'active';
              
              let stepColor = isActive ? 'text-[var(--theme-primary)] border-[var(--theme-primary)] bg-[var(--theme-primary)]/5' : 'text-[var(--theme-text-muted)] border-[var(--theme-border)] bg-white hover:bg-[var(--theme-bg)]';
              
              if (isStatusActive) {
                stepColor = 'text-[var(--theme-success)] border-[var(--theme-success)] bg-[var(--theme-success-light)] shadow-sm';
              } else if (isCompleted) {
                stepColor = 'text-[var(--theme-info)] border-[var(--theme-info)] bg-[var(--theme-info-light)] opacity-80';
              }

              return (
                <React.Fragment key={phase.key}>
                  <button
                    onClick={() => setActivePhase(phase.key)}
                    className={`relative flex flex-col md:flex-row items-center gap-3 p-4 rounded-2xl border-2 transition-all flex-1 min-w-0 ${stepColor}`}
                  >
                    <div className={`flex shrink-0 items-center justify-center w-10 h-10 rounded-full bg-white border-2 shadow-sm ${isStatusActive ? 'border-[var(--theme-success)] text-[var(--theme-success)]' : isCompleted ? 'border-[var(--theme-info)] text-[var(--theme-info)]' : isActive ? 'border-[var(--theme-primary)] text-[var(--theme-primary)]' : 'border-[var(--theme-border-muted)] text-[var(--theme-text-subtle)]'}`}>
                      <span className="material-symbols-outlined text-lg">{isCompleted ? 'check' : phase.icon}</span>
                    </div>
                    <div className="text-center md:text-left min-w-0 flex-1">
                      <p className="text-xs font-bold truncate">{phase.short}</p>
                      <p className="text-[10px] font-semibold opacity-80 truncate hidden lg:block">{fmtDate(savedTimeline[phase.key]?.start_date)} - {fmtDate(savedTimeline[phase.key]?.end_date)}</p>
                      <div className="mt-1 flex justify-center md:justify-start lg:hidden"><Badge status={status} /></div>
                    </div>
                    <div className="hidden lg:block">
                      <Badge status={status} />
                    </div>
                  </button>
                  {idx < phases.length - 1 && (
                    <div className="hidden md:block w-8 shrink-0 h-1 bg-[var(--theme-border)] mx-2 rounded-full opacity-50" />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Active Phase Settings Card */}
          <div className="rounded-2xl border border-[var(--theme-border)] bg-white shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className={`p-6 bg-gradient-to-br ${toneClass[activePhaseMeta.tone]} border-b`}>
              <div className="flex items-start gap-4">
                <div className="p-3 bg-white/60 backdrop-blur-sm rounded-xl shadow-sm">
                  <span className="material-symbols-outlined text-3xl">{activePhaseMeta.icon}</span>
                </div>
                <div>
                  <h3 className="text-xl font-bold">{activePhaseMeta.title}</h3>
                  <p className="mt-1 text-sm font-medium opacity-90">{activePhaseMeta.hint}</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              {activePhase === 'pasca_kencana' ? (
                <div className="rounded-xl bg-[var(--theme-bg)] p-8 text-center border border-[var(--theme-border)]">
                  <span className="material-symbols-outlined text-[var(--theme-text-subtle)] text-5xl mb-4">task_alt</span>
                  <h4 className="text-lg font-bold text-[var(--theme-text)]">Fase Evaluasi & Kelulusan</h4>
                  <p className="mt-2 text-sm text-[var(--theme-text-muted)] max-w-md mx-auto">
                    Pada tahap ini, orientasi telah selesai. Sistem akan menggunakan periode ini untuk menampilkan pengumuman kelulusan, nilai rekap, sertifikat, serta remedial bagi mahasiswa. Tidak memerlukan pengaturan *timeline* spesifik.
                  </p>
                </div>
              ) : (
                <div className="max-w-3xl">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <label className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Tanggal Mulai {activePhaseMeta.short}</span>
                      <input type="date" value={phaseDraft[activePhase]?.start || ''} onChange={e => updateDraft(activePhase, 'start', e.target.value)} className="w-full h-12 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Tanggal Selesai {activePhaseMeta.short}</span>
                      <input type="date" value={phaseDraft[activePhase]?.end || ''} onChange={e => updateDraft(activePhase, 'end', e.target.value)} className="w-full h-12 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all" />
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-6 border-t border-[var(--theme-border-muted)]">
                    <button onClick={() => saveTimeline(false)} disabled={updateTimelinePhase.isPending} className="h-11 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] hover:bg-[var(--theme-border-muted)] px-6 text-xs font-bold text-[var(--theme-text)] shadow-sm transition-colors flex items-center gap-2">
                      <span className="material-symbols-outlined text-base">save</span>
                      {updateTimelinePhase.isPending ? 'Menyimpan...' : 'Simpan Tanggal Saja'}
                    </button>
                    
                    <div className="w-px h-8 bg-[var(--theme-border)] mx-2 hidden sm:block"></div>

                    {activePhase === 'kencana_universitas' ? (
                      <>
                        <button onClick={() => { saveTimeline(true); updateUniversityPhase.mutate({ periodId: selectedPeriod.id, action: 'start' }); }} className="h-11 rounded-xl bg-[var(--theme-success)] hover:bg-[var(--theme-success)]/90 px-6 text-xs font-bold text-white shadow-md transition-colors flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">play_arrow</span>
                          Mulai Fase Universitas
                        </button>
                        <button disabled={universityStatus !== 'active'} onClick={() => {
                          updateTimelinePhase.mutate({ periodId: selectedPeriod.id, phaseType: 'kencana_universitas', status: 'completed', is_active: false, start_date: phaseDraft.kencana_universitas?.start || null, end_date: phaseDraft.kencana_universitas?.end || null });
                          updateUniversityPhase.mutate({ periodId: selectedPeriod.id, action: 'complete' }, { onSuccess: () => { setActivePhase('kencana_fakultas'); toast.success('Fase Universitas diakhiri'); }});
                        }} className="h-11 rounded-xl bg-[var(--theme-info)] hover:bg-[var(--theme-info)]/90 px-6 text-xs font-bold text-white shadow-md transition-colors disabled:opacity-40 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">flag</span>
                          Akhiri Universitas
                        </button>
                      </>
                    ) : activePhase === 'kencana_fakultas' ? (
                      <>
                        <button onClick={() => saveTimeline(true)} className="h-11 rounded-xl bg-[var(--theme-success)] hover:bg-[var(--theme-success)]/90 px-6 text-xs font-bold text-white shadow-md transition-colors flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">play_arrow</span>
                          Mulai Fase Fakultas
                        </button>
                        <button disabled={universityStatus !== 'completed'} onClick={() => openFacultyPhases.mutate(selectedPeriod.id, { onSuccess: () => toast.success('Akses Semua Fakultas Dibuka') })} className="h-11 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] px-6 text-xs font-bold text-white shadow-md transition-colors disabled:opacity-40 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">lock_open</span>
                          Buka Akses Semua Fakultas
                        </button>
                      </>
                    ) : activePhase === 'pra_kencana' ? (
                      <>
                        <button onClick={() => saveTimeline(true)} className="h-11 rounded-xl bg-[var(--theme-success)] hover:bg-[var(--theme-success)]/90 px-6 text-xs font-bold text-white shadow-md transition-colors flex items-center gap-2">
                           <span className="material-symbols-outlined text-base">play_arrow</span>
                           Mulai Pra-Kencana
                        </button>
                        <button disabled={phaseState.pra_kencana !== 'active'} onClick={() => updateTimelinePhase.mutate({ periodId: selectedPeriod.id, phaseType: 'pra_kencana', status: 'completed', is_active: false, start_date: phaseDraft.pra_kencana?.start || null, end_date: phaseDraft.pra_kencana?.end || null }, { onSuccess: () => { setActivePhase('kencana_universitas'); toast.success('Fase Pra-Kencana diakhiri'); }})} className="h-11 rounded-xl bg-[var(--theme-info)] hover:bg-[var(--theme-info)]/90 px-6 text-xs font-bold text-white shadow-md transition-colors disabled:opacity-40 flex items-center gap-2">
                          <span className="material-symbols-outlined text-base">flag</span>
                          Akhiri Pra-Kencana
                        </button>
                      </>
                    ) : (
                      <button onClick={() => saveTimeline(true)} className="h-11 rounded-xl bg-[var(--theme-success)] hover:bg-[var(--theme-success)]/90 px-6 text-xs font-bold text-white shadow-md transition-colors flex items-center gap-2">
                         <span className="material-symbols-outlined text-base">play_arrow</span>
                         Mulai Fase Ini
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Jika Kencana Fakultas, tampilkan status per fakultas di bawahnya */}
            {activePhase === 'kencana_fakultas' && (
              <div className="border-t border-[var(--theme-border-muted)] bg-[var(--theme-bg)] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-bold text-[var(--theme-text)] flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--theme-primary)] text-lg">corporate_fare</span>
                    Status Kencana Fakultas (Detail)
                  </h4>
                  {loadingPhases && <span className="text-xs font-bold text-[var(--theme-text-subtle)] animate-pulse">Memuat...</span>}
                </div>
                
                {facultyPhases.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {facultyPhases.map(phase => (
                      <div key={phase.id} className="rounded-xl border border-[var(--theme-border)] bg-white p-3.5 flex items-center justify-between gap-3 shadow-sm hover:border-[var(--theme-primary)]/30 transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-[var(--theme-text)]">{phase.fakultas?.Nama || phase.fakultas?.nama || `Fakultas #${phase.fakultas_id}`}</p>
                          <p className="mt-0.5 text-[10px] font-semibold text-[var(--theme-text-muted)]">{fmtDate(phase.start_date)} - {fmtDate(phase.end_date)}</p>
                        </div>
                        <Badge status={phase.status} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-[var(--theme-border)] p-6 text-center">
                    <p className="text-xs font-semibold text-[var(--theme-text-subtle)]">Belum ada timeline spesifik untuk fakultas pada periode ini.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-bg)] p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-[var(--theme-text-muted)] text-3xl">event_busy</span>
          </div>
          <h2 className="text-lg font-bold text-[var(--theme-text)] mb-2">Belum Ada Periode Terpilih</h2>
          <p className="text-sm font-medium text-[var(--theme-text-muted)] max-w-sm mb-6">Pilih periode yang ingin Anda kelola melalui dropdown di pojok kanan atas, atau buat periode baru.</p>
          
          <div className="flex flex-col sm:flex-row justify-center mt-6">
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="h-11 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/90 px-6 text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              Buat Periode Manual
            </button>
          </div>
        </div>
      )}

      {/* CREATE PERIOD MODAL */}
      <DialogModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        title="Buat Periode PKKMB Baru"
        description="Masukkan detail periode orientasi mahasiswa baru secara manual."
        icon="add_box"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCreateModalOpen(false)} />
            <ModalSaveButton form="create-period-form" loading={createPeriod.isPending} />
          </>
        }
      >
        <form id="create-period-form" onSubmit={handleCreatePeriod} className="space-y-5">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Nama Periode <span className="text-red-500">*</span></span>
            <input 
              required
              placeholder="Contoh: PKKMB 2026 Ganjil"
              value={newPeriodData.name} 
              onChange={e => setNewPeriodData(p => ({ ...p, name: e.target.value }))} 
              className="w-full h-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all" 
            />
          </label>
          
          <label className="block space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Tema Orientasi</span>
            <input 
              placeholder="Tema PKKMB tahun ini (Opsional)"
              value={newPeriodData.theme} 
              onChange={e => setNewPeriodData(p => ({ ...p, theme: e.target.value }))} 
              className="w-full h-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all" 
            />
          </label>
          
          <label className="block space-y-1.5">
            <span className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Deskripsi</span>
            <textarea 
              rows={3}
              placeholder="Keterangan singkat mengenai periode ini"
              value={newPeriodData.description} 
              onChange={e => setNewPeriodData(p => ({ ...p, description: e.target.value }))} 
              className="w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] p-4 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all resize-none" 
            />
          </label>

          <div className="grid grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Batas Kelulusan</span>
              <input 
                type="number"
                min="0" max="100"
                value={newPeriodData.passing_grade} 
                onChange={e => setNewPeriodData(p => ({ ...p, passing_grade: Number(e.target.value) }))} 
                className="w-full h-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all" 
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Batas Remedial</span>
              <input 
                type="number"
                min="0" max="100"
                value={newPeriodData.remedial_grade} 
                onChange={e => setNewPeriodData(p => ({ ...p, remedial_grade: Number(e.target.value) }))} 
                className="w-full h-11 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 text-sm outline-none focus:ring-2 focus:ring-[var(--theme-primary)]/20 focus:border-[var(--theme-primary)] transition-all" 
              />
            </label>
          </div>
        </form>
      </DialogModal>

      {/* Reset Kencana Confirmation Modal */}
      <DialogModal
        open={isResetModalOpen}
        onOpenChange={(val) => { setIsResetModalOpen(val); if (!val) setResetConfirmText(''); }}
        title="⚠️ Reset Seluruh Data Kencana"
        subtitle="PERINGATAN: Tindakan ini akan menghapus SELURUH data Kencana secara permanen."
        icon="warning"
      >
        <div className="space-y-4">
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-sm font-semibold text-rose-700 space-y-2">
            <p>Data yang akan dihapus:</p>
            <ul className="list-disc pl-5 text-xs space-y-1">
              <li>Semua Periode, Timeline, dan Fase Fakultas</li>
              <li>Semua Stage, Session, Material, Quiz, dan Assignment</li>
              <li>Semua data progress, jawaban kuis, dan submission mahasiswa</li>
              <li>Semua Kelompok, Mentor, dan Assignment bimbingan</li>
              <li>Semua Nilai, Sertifikat, Remedial, dan Banding</li>
              <li>Semua Pengumuman dan Notifikasi Kencana</li>
            </ul>
          </div>
          <label className="block space-y-2">
            <span className="text-xs font-bold text-[var(--theme-text-muted)]">Ketik <strong className="text-rose-600">RESET</strong> untuk mengonfirmasi:</span>
            <input
              type="text"
              value={resetConfirmText}
              onChange={e => setResetConfirmText(e.target.value)}
              placeholder="Ketik RESET di sini..."
              className="w-full h-11 rounded-xl border border-rose-300 bg-white px-4 text-sm font-bold outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-500 transition-all"
            />
          </label>
          <div className="flex gap-3 justify-end pt-4 border-t border-[var(--theme-border-muted)]">
            <button
              type="button"
              onClick={() => { setIsResetModalOpen(false); setResetConfirmText(''); }}
              className="h-10 px-5 rounded-xl text-sm font-bold text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={resetConfirmText !== 'RESET' || resetKencana.isPending}
              onClick={() => {
                resetKencana.mutate(undefined, {
                  onSuccess: () => {
                    toast.success('Seluruh data Kencana berhasil direset!');
                    setIsResetModalOpen(false);
                    setResetConfirmText('');
                    setSelectedPeriodId('');
                  },
                  onError: (err) => toast.error(err?.response?.data?.message || 'Gagal mereset data Kencana.'),
                });
              }}
              className="h-10 px-6 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {resetKencana.isPending && <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>}
              <span className="material-symbols-outlined text-base">delete_forever</span>
              Hapus Semua Data
            </button>
          </div>
        </div>
      </DialogModal>

    </div>
  );
};

export default Periods;
