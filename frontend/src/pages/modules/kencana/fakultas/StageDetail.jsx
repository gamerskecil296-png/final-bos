import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usePeriodsQuery, usePeriodPhasesQuery } from '@/queries/useKencanaAdminQuery';
import {
  useCompleteFakultasPhaseMutation,
  useCreateFakultasSessionMutation,
  useCreateFakultasStageMutation,
  useFakultasPhaseQuery,
  useFakultasStagesQuery,
  useStartFakultasPhaseMutation,
  useUpdateFakultasPhaseMutation,
  useUpdateFakultasStageMutation,
  useUndoFakultasPhaseMutation,
} from '@/queries/useKencanaFakultasQuery';
import { adminService } from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import Mentors from '../Admin/Mentors';
import Groups from '../Admin/Groups';

const badgeClass = {
  not_open: 'bg-slate-100 text-slate-500',
  ready: 'bg-amber-100 text-amber-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  locked: 'bg-slate-100 text-slate-500',
};

const badgeLabel = {
  not_open: 'Belum Dibuka',
  ready: 'Belum Aktif',
  active: 'Aktif',
  completed: 'Selesai',
  locked: 'Terkunci',
};

const Badge = ({ status }) => <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${badgeClass[status] || 'bg-slate-100 text-slate-500'}`}>{badgeLabel[status] || status}</span>;

const formatDate = (date) => date ? new Date(date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

const formatApiDate = (d) => {
  if (!d) return null;
  if (d.includes('T')) return d;
  return `${d}T00:00:00Z`;
};

const Stages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore(state => state.user);
  const role = String(user?.role || '').toLowerCase();
  const canPickFaculty = role === 'super_admin';
  const { data: periods } = usePeriodsQuery();
  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState(searchParams.get('faculty') || '');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [activeStage, setActiveStage] = useState(null);
  const [stageForm, setStageForm] = useState({ name: '', description: '', status: 'locked', start_date: '', end_date: '', is_published: false });
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', status: 'locked', start_date: '', end_date: '', is_required: true, is_published: false });
  const [phaseForm, setPhaseForm] = useState({ start_date: '', end_date: '', is_published: true });
  const [activeTab, setActiveTab] = useState('stages');

  useEffect(() => {
    if (!canPickFaculty) return;
    adminService.getAllFaculties().then(res => {
      const rows = res?.data || [];
      setFaculties(rows);
    }).catch(() => setFaculties([]));
  }, [canPickFaculty]);

  useEffect(() => {
    if (periods?.length && !selectedPeriodId) {
      const active = periods.find(p => p.status === 'active' || p.university_phase_status === 'completed') || periods[0];
      setSelectedPeriodId(String(active.id));
    }
  }, [periods, selectedPeriodId]);

  const { data: periodPhasesData } = usePeriodPhasesQuery(selectedPeriodId);
  const allFacultyPhases = periodPhasesData?.faculty_phases || [];
  
  const scopeParams = canPickFaculty && selectedFacultyId ? { fakultas_id: selectedFacultyId } : {};
  const { data: phaseData } = useFakultasPhaseQuery(selectedPeriodId, scopeParams);
  const { data: stages, isLoading } = useFakultasStagesQuery(selectedPeriodId, scopeParams);
  const updatePhase = useUpdateFakultasPhaseMutation();
  const startPhase = useStartFakultasPhaseMutation();
  const completePhase = useCompleteFakultasPhaseMutation();
  const undoPhase = useUndoFakultasPhaseMutation();
  const createStage = useCreateFakultasStageMutation();
  const updateStage = useUpdateFakultasStageMutation();
  const createSession = useCreateFakultasSessionMutation();

  const period = phaseData?.period;
  const phase = phaseData?.phase;
  const universityCompleted = true;
  const canManage = !!phase;

  useEffect(() => {
    if (phase) {
      setPhaseForm({
        start_date: phase.start_date ? phase.start_date.slice(0, 10) : '',
        end_date: phase.end_date ? phase.end_date.slice(0, 10) : '',
        is_published: phase.is_published ?? true,
      });
    }
  }, [phase?.id]);

  const savePhase = () => {
    updatePhase.mutate({
      period_id: Number(selectedPeriodId),
      ...scopeParams,
      start_date: phaseForm.start_date || null,
      end_date: phaseForm.end_date || null,
      status: phase?.status === 'not_open' ? 'ready' : phase?.status,
      is_published: phaseForm.is_published,
    });
  };

  const openNewStage = () => {
    setActiveStage(null);
    setStageForm({ name: '', description: '', status: 'locked', start_date: '', end_date: '', is_published: false });
    setShowStageModal(true);
  };

  const openEditStage = (stage) => {
    setActiveStage(stage);
    setStageForm({
      name: stage.name || '',
      description: stage.description || '',
      status: stage.status || 'locked',
      start_date: stage.start_date ? stage.start_date.slice(0, 10) : '',
      end_date: stage.end_date ? stage.end_date.slice(0, 10) : '',
      is_published: Boolean(stage.is_published),
    });
    setShowStageModal(true);
  };

  const saveStage = (e) => {
    e.preventDefault();
    const payload = { ...stageForm, period_id: Number(selectedPeriodId), type: 'faculty', ...(selectedFacultyId ? { fakultas_id: Number(selectedFacultyId) } : {}) };
    if (activeStage) {
      updateStage.mutate({ id: activeStage.id, ...payload }, { onSuccess: () => setShowStageModal(false) });
    } else {
      createStage.mutate(payload, { onSuccess: () => setShowStageModal(false) });
    }
  };

  const ensureFacultyStage = async () => {
    if (stages?.length) return stages[0];
    if (!selectedPeriodId) return null;
    return createStage.mutateAsync({
      name: 'Kencana Fakultas',
      description: 'Wadah konten sesi Kencana Fakultas.',
      period_id: Number(selectedPeriodId),
      type: 'faculty',
      status: phase?.status === 'active' ? 'active' : 'locked',
      start_date: formatApiDate(phase?.start_date ? phase.start_date.slice(0, 10) : null),
      end_date: formatApiDate(phase?.end_date ? phase.end_date.slice(0, 10) : null),
      is_published: phase?.status === 'active',
      ...(selectedFacultyId ? { fakultas_id: Number(selectedFacultyId) } : {}),
    });
  };

  const openSession = async (stage = null) => {
    const targetStage = stage || await ensureFacultyStage();
    if (!targetStage) return;
    setActiveStage(targetStage);
    setSessionForm({
      title: '',
      description: '',
      status: phase?.status === 'active' ? 'active' : 'locked',
      start_date: phase?.start_date ? phase.start_date.slice(0, 10) : '',
      end_date: phase?.end_date ? phase.end_date.slice(0, 10) : '',
      is_required: true,
      is_published: phase?.status === 'active',
    });
    setShowSessionModal(true);
  };

  const saveSession = (e) => {
    e.preventDefault();
    const payload = { ...sessionForm, stage_id: activeStage.id };
    payload.start_date = formatApiDate(payload.start_date);
    payload.end_date = formatApiDate(payload.end_date);
    createSession.mutate(payload, { onSuccess: () => setShowSessionModal(false) });
  };

  const phaseStage = stages?.[0] || null;
  const sessions = stages?.flatMap(stage => (stage.sessions || []).map(session => ({ ...session, stage }))) || [];

  return (
    <div className="md:max-w-7xl mx-auto space-y-6 font-body">
      <div className="bg-gradient-to-br from-blue-900 via-sky-900 to-slate-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 bg-sky-400/20 rounded-full blur-3xl -mr-24 -mt-24" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <p className="text-[11px] font-black text-sky-200 uppercase tracking-[0.3em] mb-3">Kencana Fakultas</p>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight font-headline">Sesi & Konten Fakultas</h1>
            <p className="text-sky-100/90 text-sm md:text-base font-medium max-w-3xl mt-3">Kelola sesi, materi, kuis, dan tugas untuk Kencana Fakultas. Super admin dapat memilih fakultas, sedangkan kencana_fakultas otomatis dibatasi ke fakultasnya sendiri.</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={selectedPeriodId} onChange={e => setSelectedPeriodId(e.target.value)} className="bg-white/10 border border-white/20 rounded-2xl px-4 py-3 text-sm font-bold text-white outline-none backdrop-blur-md">
              <option value="" className="text-slate-800">Pilih Periode</option>
              {periods?.map(p => <option key={p.id} value={p.id} className="text-slate-800">{p.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {canPickFaculty && !selectedFacultyId ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-800 font-headline">Daftar Fakultas</h2>
            <p className="text-sm font-semibold text-slate-500 mt-1">Pilih fakultas untuk mengelola sesi dan melihat status Kencana Fakultas mereka.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {faculties.map(faculty => {
              const fp = allFacultyPhases.find(p => p.fakultas_id === faculty.id) || null;
              return (
                <div key={faculty.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-sky-200 hover:shadow-lg transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="font-black text-slate-800 text-lg leading-tight font-headline">{faculty.Nama || faculty.nama || `Fakultas ID ${faculty.id}`}</h3>
                      <div className="shrink-0"><Badge status={fp?.status || 'not_open'} /></div>
                    </div>
                    <div className="space-y-1 mb-4">
                      <p className="text-xs font-semibold text-slate-500 flex justify-between"><span>Mulai:</span> <span>{formatDate(fp?.start_date)}</span></p>
                      <p className="text-xs font-semibold text-slate-500 flex justify-between"><span>Selesai:</span> <span>{formatDate(fp?.end_date)}</span></p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedFacultyId(String(faculty.id))} className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-black rounded-xl transition-colors">
                    Kelola Kencana Fakultas →
                  </button>
                </div>
              );
            })}
            {faculties.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500 font-bold">Belum ada data fakultas.</div>
            )}
          </div>
        </div>
      ) : (
        <>
          {canPickFaculty && (
            <button onClick={() => setSelectedFacultyId('')} className="flex items-center gap-2 text-sm font-black text-slate-500 hover:text-slate-800 transition-colors mb-2">
              <span>←</span> Kembali ke Daftar Fakultas
            </button>
          )}

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm w-fit mb-6">
            <button
              onClick={() => setActiveTab('stages')}
              className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'stages'
                  ? 'bg-[var(--theme-primary)] text-white shadow-md'
                  : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span>
              Sesi & Tahapan
            </button>
            <button
              onClick={() => setActiveTab('mentors')}
              className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'mentors'
                  ? 'bg-[var(--theme-primary)] text-white shadow-md'
                  : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>assignment_ind</span>
              Dewan Pembimbing
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
                activeTab === 'groups'
                  ? 'bg-[var(--theme-primary)] text-white shadow-md'
                  : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>groups</span>
              Kelompok Mahasiswa
            </button>
          </div>

          {activeTab === 'stages' && (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
            <div className="space-y-5">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Status Fase</p>
                    <h2 className="text-xl font-black text-slate-800 mt-1 font-headline">{period?.name || 'Periode Kencana'}</h2>
                  </div>
                  <Badge status={phase?.status || 'not_open'} />
                </div>
                {!universityCompleted && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 text-sm font-bold text-amber-800 leading-relaxed">Menunggu Kencana University selesai. Timeline fakultas belum bisa dimulai.</div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <input type="date" value={phaseForm.start_date} disabled={!universityCompleted} onChange={e => setPhaseForm({ ...phaseForm, start_date: e.target.value })} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold disabled:opacity-50" />
                  <input type="date" value={phaseForm.end_date} disabled={!universityCompleted} onChange={e => setPhaseForm({ ...phaseForm, end_date: e.target.value })} className="px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold disabled:opacity-50" />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <button onClick={savePhase} disabled={!universityCompleted || updatePhase.isPending} className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-black disabled:opacity-40">Simpan Jadwal Fakultas</button>
                  <button onClick={() => startPhase.mutate({ periodId: selectedPeriodId, ...scopeParams })} disabled={!universityCompleted || phase?.status === 'active' || startPhase.isPending} className="px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black disabled:opacity-40">Mulai Kencana Fakultas</button>
                  <button onClick={() => completePhase.mutate({ periodId: selectedPeriodId, ...scopeParams }, {
                    onError: (err) => alert(err.response?.data?.message || 'Gagal menyelesaikan Kencana Fakultas')
                  })} disabled={phase?.status !== 'active' || completePhase.isPending} className="px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black disabled:opacity-40">Selesaikan Kencana Fakultas</button>
                  {phase?.status === 'completed' && (
                    <button onClick={() => undoPhase.mutate({ periodId: selectedPeriodId, ...scopeParams }, {
                      onError: (err) => alert(err.response?.data?.message || 'Gagal membatalkan status selesai')
                    })} disabled={undoPhase.isPending} className="px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black disabled:opacity-40">Batal Selesai (Undo)</button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black text-slate-800 font-headline">Sesi Fakultas</h2>
                  <p className="text-sm font-semibold text-slate-500 mt-1">Timeline fase: {formatDate(phase?.start_date)} - {formatDate(phase?.end_date)}. Tahap dipakai sebagai wadah teknis konten.</p>
                </div>
                <button onClick={() => openSession(phaseStage)} disabled={!canManage || createStage.isPending} className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black disabled:opacity-40">+ Tambah Sesi</button>
              </div>

              {isLoading ? (
                <div className="p-12 text-center text-slate-500 font-bold">Memuat sesi...</div>
              ) : !sessions.length ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-3xl p-12 text-center shadow-sm">
                  <div className="text-5xl mb-4">📚</div>
                  <h3 className="text-lg font-black text-slate-700 font-headline">Belum Ada Sesi Fakultas</h3>
                  <p className="text-sm font-semibold text-slate-500 max-w-xl mx-auto mt-2">Gunakan tombol Tambah Sesi untuk mulai menyusun konten Kencana Fakultas berdasarkan timeline fakultas terpilih.</p>
                  <button onClick={() => openSession(phaseStage)} disabled={!canManage || createStage.isPending} className="mt-6 px-6 py-3 rounded-2xl bg-slate-900 text-white text-sm font-black disabled:opacity-40">+ Tambah Sesi Pertama</button>
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 font-headline">Daftar Sesi</h3>
                      <p className="text-xs font-semibold text-slate-500 mt-1">{sessions.length} sesi dalam Kencana Fakultas.</p>
                    </div>
                    {phaseStage && <button onClick={() => openEditStage(phaseStage)} disabled={!canManage} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-black disabled:opacity-40">Atur Wadah Konten</button>}
                  </div>
                  <div className="p-5 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sessions.map(session => (
                      <div key={session.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-black text-slate-800 text-sm line-clamp-2 font-headline">{session.title}</p>
                          <Badge status={session.status} />
                        </div>
                        <p className="text-xs font-semibold text-slate-500 mt-2 line-clamp-2">{session.description || 'Tidak ada deskripsi.'}</p>
                        <div className="flex items-center justify-between pt-3 border-t border-slate-200/70 mt-4">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{session.is_required ? 'Wajib' : 'Opsional'}</span>
                          <button onClick={() => navigate(`/app/kencana/sessions/${session.id}/content`)} className="text-[10px] font-black text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">Kelola Konten →</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          )}
          {activeTab === 'mentors' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
              <Mentors portal="fakultas" facultyId={selectedFacultyId} />
            </div>
          )}
          {activeTab === 'groups' && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-2">
              <Groups portal="fakultas" facultyId={selectedFacultyId} />
            </div>
          )}
        </>
      )}

      {showStageModal && (
        <div className="fixed inset-0 lg:left-72 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="relative bg-gradient-to-br from-primary via-primary to-blue-700 pt-6 pb-7 px-6 overflow-hidden flex-shrink-0 border-b-0">
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
              <div className="absolute -bottom-6 right-16 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
              <button onClick={() => setShowStageModal(false)} type="button" className="absolute z-50 top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors text-white border-none cursor-pointer">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
              </button>
              <div className="relative z-10">
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.25em] mb-1">Tahapan Fakultas</p>
                <h2 className="text-xl font-extrabold font-headline leading-tight truncate text-white">{activeStage ? 'Edit Tahap Fakultas' : 'Tambah Tahap Fakultas'}</h2>
              </div>
            </div>
            <form onSubmit={saveStage} className="p-6 space-y-4">
              <input required value={stageForm.name} onChange={e => setStageForm({ ...stageForm, name: e.target.value })} placeholder="Nama tahap" className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" />
              <textarea rows="2" value={stageForm.description} onChange={e => setStageForm({ ...stageForm, description: e.target.value })} placeholder="Deskripsi" className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" />
              <div className="grid grid-cols-2 gap-3"><input type="date" value={stageForm.start_date} onChange={e => setStageForm({ ...stageForm, start_date: e.target.value })} className="px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" /><input type="date" value={stageForm.end_date} onChange={e => setStageForm({ ...stageForm, end_date: e.target.value })} className="px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" /></div>
              <div className="grid grid-cols-2 gap-3"><select value={stageForm.status} onChange={e => setStageForm({ ...stageForm, status: e.target.value })} className="px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all"><option value="locked">Terkunci</option><option value="active">Aktif</option><option value="completed">Selesai</option></select><label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-bold cursor-pointer hover:bg-[var(--theme-border-muted)] transition-colors"><input type="checkbox" checked={stageForm.is_published} onChange={e => setStageForm({ ...stageForm, is_published: e.target.checked })} className="text-[var(--theme-primary)] focus:ring-[var(--theme-primary-light)]" /> Publish</label></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--theme-border-muted)] mt-4"><button type="button" onClick={() => setShowStageModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-[var(--theme-text-muted)] border border-[var(--theme-border)] hover:bg-[var(--theme-bg)] transition-colors">Batal</button><button className="px-5 py-2.5 rounded-xl font-bold bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white transition-colors">Simpan</button></div>
            </form>
          </div>
        </div>
      )}

      {showSessionModal && (
        <div className="fixed inset-0 lg:left-72 z-[70] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 relative">
            <div className="relative bg-gradient-to-br from-primary via-primary to-blue-700 pt-6 pb-7 px-6 overflow-hidden flex-shrink-0 border-b-0">
              <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
              <div className="absolute -bottom-6 right-16 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
              <button onClick={() => setShowSessionModal(false)} type="button" className="absolute z-50 top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors text-white border-none cursor-pointer">
                <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
              </button>
              <div className="relative z-10">
                <p className="text-[9px] font-bold text-white/50 uppercase tracking-[0.25em] mb-1">Sesi Kencana</p>
                <h2 className="text-xl font-extrabold font-headline leading-tight truncate text-white">Tambah Sesi Fakultas</h2>
              </div>
            </div>
            <form onSubmit={saveSession} className="p-6 space-y-4">
              <input required value={sessionForm.title} onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })} placeholder="Judul sesi" className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" />
              <textarea rows="2" value={sessionForm.description} onChange={e => setSessionForm({ ...sessionForm, description: e.target.value })} placeholder="Deskripsi" className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" />
              <div className="grid grid-cols-2 gap-3"><input type="date" value={sessionForm.start_date} onChange={e => setSessionForm({ ...sessionForm, start_date: e.target.value })} className="px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" /><input type="date" value={sessionForm.end_date} onChange={e => setSessionForm({ ...sessionForm, end_date: e.target.value })} className="px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all" /></div>
              <div className="grid grid-cols-2 gap-3"><select value={sessionForm.status} onChange={e => setSessionForm({ ...sessionForm, status: e.target.value })} className="px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-semibold focus:border-[var(--theme-primary)] focus:outline-none transition-all"><option value="locked">Terkunci</option><option value="active">Aktif</option><option value="published">Published</option></select><label className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text)] text-sm font-bold cursor-pointer hover:bg-[var(--theme-border-muted)] transition-colors"><input type="checkbox" checked={sessionForm.is_published} onChange={e => setSessionForm({ ...sessionForm, is_published: e.target.checked })} className="text-[var(--theme-primary)] focus:ring-[var(--theme-primary-light)]" /> Publish</label></div>
              <div className="flex justify-end gap-3 pt-4 border-t border-[var(--theme-border-muted)] mt-4"><button type="button" onClick={() => setShowSessionModal(false)} className="px-5 py-2.5 rounded-xl font-bold text-[var(--theme-text-muted)] border border-[var(--theme-border)] hover:bg-[var(--theme-bg)] transition-colors">Batal</button><button className="px-5 py-2.5 rounded-xl font-bold bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white transition-colors">Simpan</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stages;
