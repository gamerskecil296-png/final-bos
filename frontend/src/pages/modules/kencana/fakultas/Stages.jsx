import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { usePeriodsQuery, usePeriodPhasesQuery } from '@/queries/useKencanaAdminQuery';
import {
  useCompleteFakultasPhaseMutation,
  useCreateFakultasSessionMutation,
  useCreateFakultasStageMutation,
  useFakultasPhaseQuery,
  useFakultasStagesQuery,
  useStartFakultasPhaseMutation,
  useUpdateFakultasPhaseMutation,
  useUndoFakultasPhaseMutation,
  useUpdateFakultasStageMutation,
  useUpdateFakultasSessionMutation,
  useDeleteFakultasSessionMutation,
} from '@/queries/useKencanaFakultasQuery';
import { adminService } from '@/services/api';
import useAuthStore from '@/store/useAuthStore';
import Mentors from '../Admin/Mentors';
import Groups from '../Admin/Groups';
import { ManageMaterialsModal } from '../components/ManageMaterialsModal';
import { ManageQuizzesModal } from '../components/ManageQuizzesModal';
import { ManageAssignmentsModal } from '../components/ManageAssignmentsModal';
import { DashboardHero } from '@/components/ui/dashboard';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { DataTable } from '@/components/ui/DataTable';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Settings2, CheckCircle2, ChevronRight, LayoutDashboard } from 'lucide-react';

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
  const getBasePath = () => {
    const p = window.location.pathname;
    if (p.includes('/app/dashboard/kencana-fakultas-admin')) return '/app/dashboard/kencana-fakultas-admin/stages';
    if (p.includes('/kencana-fakultas')) return '/app/kencana/stages';
    if (p.includes('/kencana-fakult')) return '/app/kencana/stages';
    return '/app/kencana/faculty-stages';
  };
  const basePath = getBasePath();
  const { facultyId } = useParams();
  const user = useAuthStore(state => state.user);
  const role = String(user?.role || '').toLowerCase();
  const canPickFaculty = role === 'super_admin' || role === 'kencana_admin';
  const { data: periods } = usePeriodsQuery();
  const [faculties, setFaculties] = useState([]);
  const [selectedFacultyId, setSelectedFacultyId] = useState(facultyId || '');
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [showStageModal, setShowStageModal] = useState(false);
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [activeStage, setActiveStage] = useState(null);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [editingSession, setEditingSession] = useState(null);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [showQuizModal, setShowQuizModal] = useState(false);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [stageForm, setStageForm] = useState({ name: '', description: '', status: 'locked', start_date: '', end_date: '', is_published: false });
  const [sessionForm, setSessionForm] = useState({ title: '', description: '', status: 'locked', start_date: '', end_date: '', is_required: true, is_published: false });
  const [phaseForm, setPhaseForm] = useState({ start_date: '', end_date: '', theme: '', is_published: true });
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'stages');

  useEffect(() => {
    if (searchParams.get('tab') !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    setSelectedFacultyId(facultyId || '');
  }, [facultyId]);

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

  const scopeParams = canPickFaculty && selectedFacultyId ? { fakultas_id: Number(selectedFacultyId) } : {};
  const { data: phaseData } = useFakultasPhaseQuery(selectedPeriodId, scopeParams);
  const { data: stages, isLoading } = useFakultasStagesQuery(selectedPeriodId, scopeParams);
  const phaseStage = stages?.[0] || null;
  const sessions = stages?.flatMap(stage => (stage.sessions || []).map(session => ({ ...session, stage }))) || [];
  const updatePhase = useUpdateFakultasPhaseMutation();
  const startPhase = useStartFakultasPhaseMutation();
  const completePhase = useCompleteFakultasPhaseMutation();
  const undoPhase = useUndoFakultasPhaseMutation();
  const createStage = useCreateFakultasStageMutation();
  const updateStage = useUpdateFakultasStageMutation();
  const createSession = useCreateFakultasSessionMutation();
  const updateSession = useUpdateFakultasSessionMutation();
  const deleteSession = useDeleteFakultasSessionMutation();

  const period = phaseData?.period;
  const phase = phaseData?.phase;
  const universityCompleted = true;
  const canManage = !!phase;

  useEffect(() => {
    if (phase) {
      let minStart = '';
      let maxEnd = '';
      if (sessions && sessions.length > 0) {
        let minD = null;
        let maxD = null;
        sessions.forEach(s => {
          if (s.start_date) {
            const d = new Date(s.start_date);
            if (!minD || d < minD) minD = d;
          }
          if (s.end_date) {
            const d = new Date(s.end_date);
            if (!maxD || d > maxD) maxD = d;
          }
        });
        if (minD) {
          minStart = `${minD.getFullYear()}-${String(minD.getMonth() + 1).padStart(2, '0')}-${String(minD.getDate()).padStart(2, '0')}`;
        }
        if (maxD) {
          maxEnd = `${maxD.getFullYear()}-${String(maxD.getMonth() + 1).padStart(2, '0')}-${String(maxD.getDate()).padStart(2, '0')}`;
        }
      }

      setPhaseForm({
        start_date: phase.start_date ? phase.start_date.slice(0, 10) : minStart,
        end_date: phase.end_date ? phase.end_date.slice(0, 10) : maxEnd,
        theme: phase.theme || '',
        is_published: phase.is_published ?? true,
      });
    }
  }, [phase?.id, sessions.length]);


  const savePhase = () => {
    updatePhase.mutate({
      period_id: Number(selectedPeriodId),
      ...scopeParams,
      start_date: formatApiDate(phaseForm.start_date),
      end_date: formatApiDate(phaseForm.end_date),
      theme: phaseForm.theme,
      status: phase?.status === 'not_open' ? 'ready' : phase?.status,
      is_published: phaseForm.is_published,
    }, {
      onSuccess: () => {
        alert('Berhasil menyimpan perubahan timeline!');
      },
      onError: (err) => {
        alert('Gagal menyimpan perubahan: ' + (err.response?.data?.message || err.message));
      }
    });
  };


  const openNewStage = () => {
    setActiveStage(null);
    setStageForm({ name: '', description: '', status: 'locked', start_date: '', end_date: '', is_published: false });
    setShowStageModal(true);
  };

  const openEditStage = (stage) => {
    if (!selectedPeriodId) {
      alert("Silakan pilih periode Kencana terlebih dahulu di bagian atas halaman!");
      return;
    }
    if (!canManage) {
      alert("Fase Kencana Fakultas belum aktif atau belum dimulai! Silakan klik tombol 'Mulai Timeline Fakultas' terlebih dahulu.");
      return;
    }
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

  const openSession = async (stage = null, session = null) => {
    if (!selectedPeriodId) {
      alert("Silakan pilih periode Kencana terlebih dahulu di bagian atas halaman!");
      return;
    }
    if (!canManage) {
      alert("Fase Kencana Fakultas belum aktif atau belum dimulai! Silakan klik tombol 'Mulai Timeline Fakultas' terlebih dahulu di tab Sesi & Tahapan.");
      return;
    }
    const targetStage = stage || await ensureFacultyStage();
    if (!targetStage) return;
    setActiveStage(targetStage);
    if (session) {
      setEditingSession(session);
      setSessionForm({
        title: session.title || '',
        description: session.description || '',
        status: session.status || 'locked',
        start_date: session.start_date ? session.start_date.slice(0, 10) : '',
        end_date: session.end_date ? session.end_date.slice(0, 10) : '',
        is_required: Boolean(session.is_required),
        is_published: Boolean(session.is_published),
      });
    } else {
      setEditingSession(null);
      setSessionForm({
        title: '',
        description: '',
        status: phase?.status === 'active' ? 'active' : 'locked',
        start_date: phase?.start_date ? phase.start_date.slice(0, 10) : '',
        end_date: phase?.end_date ? phase.end_date.slice(0, 10) : '',
        is_required: true,
        is_published: phase?.status === 'active',
      });
    }
    setShowSessionModal(true);
  };

  const saveSession = (e) => {
    e.preventDefault();
    const payload = { ...sessionForm, stage_id: activeStage.id };
    payload.start_date = formatApiDate(payload.start_date);
    payload.end_date = formatApiDate(payload.end_date);
    if (editingSession) {
      updateSession.mutate({ id: editingSession.id, ...payload }, { onSuccess: () => setShowSessionModal(false) });
    } else {
      createSession.mutate(payload, { onSuccess: () => setShowSessionModal(false) });
    }
  };

  const handleDeleteSession = (id) => {
    if (window.confirm('Hapus sesi ini? Semua kuis, materi, dan tugas di dalamnya akan tetap tersimpan tetapi tidak terasosiasi lagi.')) {
      deleteSession.mutate(id);
    }
  };


  return (
    <div className="md:max-w-7xl mx-auto space-y-6 font-body">
      <DashboardHero
        title="Sesi & Konten"
        highlightedTitle={selectedFacultyId ? (faculties.find(f => String(f.id) === String(selectedFacultyId))?.Nama || faculties.find(f => String(f.id) === String(selectedFacultyId))?.nama || 'Fakultas') : 'Fakultas'}
        subtitle="Kelola sesi, materi, kuis, dan tugas untuk Kencana Fakultas. Super admin dapat memilih fakultas, sedangkan admin fakultas dibatasi ke fakultasnya sendiri."
        icon="event_note"
        badges={[
          { label: 'PORTAL ORIENTASI MAHASISWA BARU', active: false },
          { label: 'KENCANA FAKULTAS', active: true }
        ]}
        actions={
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto mt-2 lg:mt-0">
            <select
              value={selectedPeriodId}
              onChange={e => setSelectedPeriodId(e.target.value)}
              className="w-full sm:w-64 h-10 px-4 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 outline-none focus:border-cyan-500 transition-colors shadow-sm"
            >
              <option value="" disabled className="text-slate-800">Pilih Periode...</option>
              {periods?.map(p => <option key={p.id} value={p.id} className="text-slate-800">{p.name}</option>)}
            </select>
          </div>
        }
      />

      {canPickFaculty && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden p-6">
          <div className="mb-6 flex justify-between items-end">
            <div>
              <h2 className="text-xl font-black text-slate-800 font-headline">Daftar Fakultas</h2>
              <p className="text-sm font-semibold text-slate-500 mt-1">Pilih fakultas untuk mengelola sesi dan melihat status Kencana Fakultas mereka.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {faculties.map(faculty => {
              const fp = allFacultyPhases.find(p => p.fakultas_id === faculty.id) || null;
              const isActive = String(selectedFacultyId) === String(faculty.id);
              
              return (
                <div 
                  key={faculty.id} 
                  className={`p-5 rounded-2xl border transition-all flex flex-col h-full cursor-pointer group ${
                    isActive 
                      ? 'bg-[var(--theme-primary-light)] border-[var(--theme-primary)] shadow-sm ring-1 ring-[var(--theme-primary)]' 
                      : 'bg-[var(--theme-surface)] border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:shadow-md'
                  }`}
                  onClick={() => {
                    navigate(`${basePath}/${faculty.id}?tab=stages`);
                    setTimeout(() => document.getElementById('faculty-details-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                  }}
                >
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <h3 className={`font-bold text-[13px] leading-tight line-clamp-2 ${isActive ? 'text-[var(--theme-primary-dark)]' : 'text-[var(--theme-text)]'}`}>
                      {faculty.Nama || faculty.nama || `Fakultas ID ${faculty.id}`}
                    </h3>
                    <div className="shrink-0"><Badge status={fp?.status || 'not_open'} /></div>
                  </div>
                  
                  <div className="space-y-1.5 mb-5 flex-1">
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-[var(--theme-text-muted)]">Mulai</span>
                      <span className={`font-bold ${isActive ? 'text-[var(--theme-primary-dark)]' : 'text-[var(--theme-text)]'}`}>{formatDate(fp?.start_date)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-[var(--theme-text-muted)]">Selesai</span>
                      <span className={`font-bold ${isActive ? 'text-[var(--theme-primary-dark)]' : 'text-[var(--theme-text)]'}`}>{formatDate(fp?.end_date)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-3 border-t border-[var(--theme-border-muted)] flex justify-between items-center">
                    {isActive ? (
                      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-[var(--theme-primary)] bg-[var(--theme-primary-light)] px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-4 h-4" /> Sedang Dikelola
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 text-[var(--theme-text-muted)] group-hover:text-[var(--theme-primary)] transition-colors">
                        Buka Ruang Kerja <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {faculties.length === 0 && (
              <div className="col-span-full p-8 text-center text-slate-500 font-bold">Belum ada data fakultas.</div>
            )}
          </div>
        </div>
      )}

      {(!canPickFaculty || selectedFacultyId) && (
        <div id="faculty-details-section" className="pt-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm w-fit mb-6">
            <button
              onClick={() => setActiveTab('stages')}
              className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'stages'
                  ? 'bg-[var(--theme-primary)] text-white shadow-md'
                  : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>list_alt</span>
              Sesi & Tahapan
            </button>
            <button
              onClick={() => setActiveTab('groups')}
              className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${activeTab === 'groups'
                  ? 'bg-[var(--theme-primary)] text-white shadow-md'
                  : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
                }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>groups</span>
              Kelompok Mahasiswa
            </button>
          </div>

          {activeTab === 'stages' && (
            <div className="space-y-6">
              {/* Control Panel Section */}
              <div className="bg-white rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 overflow-hidden flex flex-col lg:flex-row relative">

                {/* Left Column: Premium Primary Hero */}
                <div className="p-8 lg:p-10 lg:w-[40%] bg-gradient-to-br from-primary via-[#152F58] to-[#0D1C36] text-white flex flex-col justify-between relative overflow-hidden">
                  {/* Decorative Background Elements */}
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-[0.03] blur-3xl"></div>
                  <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-white opacity-[0.05] blur-2xl"></div>

                  <div className="relative z-10">
                    <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-3 drop-shadow-sm">Manajemen Fase Kencana</p>
                    <h2 className="text-3xl font-black text-white leading-tight mb-5 drop-shadow-sm font-headline">{period?.name || 'Periode Kencana'}</h2>
                    <div className="inline-block bg-white/10 backdrop-blur-md border border-white/20 px-3 py-1.5 rounded-lg text-xs font-bold text-white mb-6 shadow-sm">
                      Status: {phase?.status === 'active' ? 'Sedang Berjalan' : phase?.status === 'completed' ? 'Selesai' : phase?.status === 'ready' ? 'Siap Dimulai' : 'Terkunci'}
                    </div>
                    <p className="text-sm text-white/70 font-medium leading-relaxed max-w-sm">Kelola timeline dan tema utama acara Kencana di tingkat Fakultas untuk mengkoordinasikan seluruh kegiatan mahasiswa baru.</p>
                  </div>

                  {!universityCompleted && (
                    <div className="relative z-10 mt-8 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs font-bold text-amber-200 leading-relaxed flex gap-3 items-start backdrop-blur-sm">
                      <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5 text-amber-400">warning</span>
                      <span>Menunggu Kencana University selesai. Timeline fakultas belum bisa dimulai.</span>
                    </div>
                  )}
                </div>
                {/* Right Column: Refined Minimalistic Form */}
                <div className="p-8 lg:p-10 lg:w-[60%] flex flex-col justify-center bg-white/50">
                  <div className="flex flex-col gap-8 mb-8">
                    <div className="flex flex-col sm:flex-row gap-8">
                      <div className="flex-1 relative group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 transition-colors group-focus-within:text-primary">Tanggal Mulai</label>
                        <input type="date" value={phaseForm.start_date} disabled={!universityCompleted} onChange={e => setPhaseForm({ ...phaseForm, start_date: e.target.value })}
                          className="w-full pb-2 pt-1 bg-transparent border-b-2 border-slate-200 focus:border-primary text-sm font-bold text-slate-800 disabled:opacity-50 transition-all outline-none" />
                      </div>
                      <div className="flex-1 relative group">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 transition-colors group-focus-within:text-primary">Tanggal Selesai</label>
                        <input type="date" value={phaseForm.end_date} disabled={!universityCompleted} onChange={e => setPhaseForm({ ...phaseForm, end_date: e.target.value })}
                          className="w-full pb-2 pt-1 bg-transparent border-b-2 border-slate-200 focus:border-primary text-sm font-bold text-slate-800 disabled:opacity-50 transition-all outline-none" />
                      </div>
                    </div>
                    <div className="relative group">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 transition-colors group-focus-within:text-primary">Tema / Slogan Kencana Fakultas</label>
                      <input type="text" placeholder="Ketik tema besar acara kencana di sini..." value={phaseForm.theme} disabled={!universityCompleted} onChange={e => setPhaseForm({ ...phaseForm, theme: e.target.value })}
                        className="w-full pb-2 pt-1 bg-transparent border-b-2 border-slate-200 focus:border-primary text-sm font-bold text-slate-800 disabled:opacity-50 transition-all outline-none placeholder:text-slate-300 placeholder:font-medium" />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-3 pt-6 mt-auto">
                    <button onClick={savePhase} disabled={!universityCompleted || updatePhase.isPending} className="px-6 py-3 rounded-full bg-primary/5 hover:bg-primary/10 text-primary text-xs font-black disabled:opacity-40 transition-colors">
                      Simpan Perubahan
                    </button>
                    {phase?.status !== 'active' && phase?.status !== 'completed' && (
                      <button onClick={() => startPhase.mutate({ periodId: selectedPeriodId, ...scopeParams })} disabled={!universityCompleted || startPhase.isPending} className="px-7 py-3 rounded-full bg-primary hover:bg-primary/90 text-white text-xs font-black disabled:opacity-40 transition-all shadow-lg shadow-primary/20 flex items-center gap-2">
                        Mulai Timeline Fakultas <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                      </button>
                    )}
                    {phase?.status === 'active' && (
                      <button onClick={() => completePhase.mutate({ periodId: selectedPeriodId, ...scopeParams }, {
                        onError: (err) => alert(err.response?.data?.message || 'Gagal menyelesaikan timeline')
                      })} disabled={completePhase.isPending} className="px-7 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black disabled:opacity-40 transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2">
                        Selesaikan Timeline <span className="material-symbols-outlined text-[16px]">check</span>
                      </button>
                    )}
                    {phase?.status === 'completed' && (
                      <button onClick={() => undoPhase.mutate({ periodId: selectedPeriodId, ...scopeParams }, {
                        onError: (err) => alert(err.response?.data?.message || 'Gagal membatalkan status selesai')
                      })} disabled={undoPhase.isPending} className="px-7 py-3 rounded-full bg-red-500 hover:bg-red-600 text-white text-xs font-black disabled:opacity-40 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2">
                        Batal Selesai (Undo) <span className="material-symbols-outlined text-[16px]">undo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Sessions List Section */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black text-slate-800 font-headline">Sesi & Konten Fakultas</h2>
                    <p className="text-sm font-semibold text-slate-500 mt-1">Buat wadah sesi untuk menyusun materi, kuis, dan tugas.</p>
                  </div>
                </div>

                {isLoading ? (
                  <div className="p-16 text-center text-slate-500 font-bold bg-white rounded-3xl border border-slate-100 shadow-sm">Memuat sesi...</div>
                ) : (
                  <DataTable
                    emptyMessage="Ruang sesi masih kosong. Tambahkan sesi pertama."
                    emptyIcon="dashboard_customize"
                    data={sessions}
                    filters={[
                      {
                        key: 'status',
                        placeholder: 'Status',
                        options: [
                          { label: 'Aktif', value: 'active' },
                          { label: 'Terkunci', value: 'locked' },
                          { label: 'Published', value: 'published' }
                        ]
                      },
                      {
                        key: 'is_required',
                        placeholder: 'Sifat',
                        options: [
                          { label: 'Wajib', value: 'true' },
                          { label: 'Opsional', value: 'false' }
                        ]
                      }
                    ]}
                    actions={
                      <div className="flex items-center gap-2">
                        {phaseStage && (
                          <button onClick={() => openEditStage(phaseStage)} className="h-9 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11px] font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-2">
                            <Settings2 className="w-4 h-4" />
                            Atur Visibilitas
                          </button>
                        )}
                        <button onClick={() => openSession(phaseStage)} disabled={createStage.isPending} className="h-9 px-4 rounded-lg bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-[11px] font-black uppercase tracking-wider shadow-sm disabled:opacity-40 transition-colors flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px]">add</span>
                          Tambah Sesi
                        </button>
                      </div>
                    }
                    columns={[
                        {
                          key: 'title',
                          label: 'Informasi Sesi',
                          className: 'w-[25%]',
                          render: (v, item) => (
                            <div>
                              <p className="text-[13px] font-bold text-[var(--theme-text)] leading-tight">{item.title}</p>
                              <p className="text-[11px] font-medium text-[var(--theme-text-muted)] mt-1 line-clamp-1">{item.description || '-'}</p>
                            </div>
                          )
                        },
                        {
                          key: 'timeline',
                          label: 'Timeline',
                          className: 'w-[20%]',
                          render: (v, item) => (
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[11px] text-[var(--theme-text-muted)] font-mono font-bold">Mulai: {formatDate(item.start_date)}</span>
                              <span className="text-[11px] text-[var(--theme-text-muted)] font-mono font-bold">Akhir: {formatDate(item.end_date)}</span>
                            </div>
                          )
                        },
                        {
                          key: 'sisa_waktu',
                          label: 'Sisa Waktu',
                          className: 'w-[15%]',
                          render: (v, item) => {
                            if (!item.end_date) return <span className="text-[11px] font-bold text-slate-400">-</span>;
                            const end = new Date(item.end_date);
                            const now = new Date();
                            const diffTime = end.getTime() - now.getTime();
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            
                            if (diffDays < 0) return <span className="text-[11px] font-bold text-slate-500">Berakhir</span>;
                            if (diffDays === 0) return <span className="text-[11px] font-bold text-amber-500 animate-pulse">Hari Ini</span>;
                            return <span className="text-[11px] font-bold text-[var(--theme-primary)]">{diffDays} Hari Lagi</span>;
                          }
                        },
                        {
                          key: 'is_required',
                          label: 'Sifat',
                          className: 'w-[15%]',
                          render: (v, item) => (
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wide uppercase ${item.is_required ? 'bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)]' : 'bg-slate-100 text-slate-500'}`}>
                              {item.is_required ? 'Wajib' : 'Opsional'}
                            </span>
                          )
                        },
                        {
                          key: 'status',
                          label: 'Status',
                          className: 'w-[15%]',
                          render: (v, item) => <Badge status={item.status} />
                        },
                        {
                          key: 'actions',
                          label: 'Aksi',
                          className: 'w-[100px] text-center',
                          cellClassName: 'text-center',
                          sortable: false,
                          render: (_, item) => (
                            <div className="flex justify-center items-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button
                                    title="Kelola Konten"
                                    className="px-3 py-1.5 rounded-lg text-white bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-95 text-[11px] font-bold"
                                  >
                                    <Settings2 className="w-[14px] h-[14px]" strokeWidth={2.5} />
                                    Kelola
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent align="end" className="w-40 p-1 rounded-xl bg-white border border-slate-100 shadow-xl z-50">
                                      <div className="flex flex-col">
                                        <button
                                          onClick={() => {
                                            setActiveSessionId(item.id);
                                            setShowMaterialModal(true);
                                          }}
                                          className="text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[var(--theme-primary)] rounded-lg transition-colors flex items-center gap-2"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">library_books</span> Materi
                                        </button>
                                        <button
                                          onClick={() => {
                                            setActiveSessionId(item.id);
                                            setShowQuizModal(true);
                                          }}
                                          className="text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[var(--theme-primary)] rounded-lg transition-colors flex items-center gap-2"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">quiz</span> Kuis
                                        </button>
                                        <button
                                          onClick={() => {
                                            setActiveSessionId(item.id);
                                            setShowAssignmentModal(true);
                                          }}
                                          className="text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[var(--theme-primary)] rounded-lg transition-colors flex items-center gap-2"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">assignment</span> Tugas
                                        </button>
                                        <div className="border-t border-slate-100 my-1"></div>
                                        <button
                                          onClick={() => {
                                            openSession(item.stage, item);
                                          }}
                                          className="text-left px-3 py-2 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">edit</span> Edit Sesi
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleDeleteSession(item.id);
                                          }}
                                          className="text-left px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                                        >
                                          <span className="material-symbols-outlined text-[16px]">delete</span> Hapus Sesi
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
            <Groups portal="fakultas" facultyId={selectedFacultyId} />
          )}
        </div>
      )}

      {/* Stage Modal */}
      <Dialog open={showStageModal} onOpenChange={setShowStageModal}>
        <DialogContent className="max-w-lg">
          <div className="relative bg-gradient-to-br from-primary via-primary to-blue-700 pt-6 pb-7 px-6 overflow-hidden flex-shrink-0 border-b-0">
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
            <div className="absolute -bottom-6 right-16 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.25em] mb-1 block">
                {activeStage ? 'Edit Tahap' : 'Tambah Tahap'}
              </span>
              <DialogTitle className="text-xl font-extrabold font-headline leading-tight truncate text-white mt-0.5">
                {activeStage ? 'Edit Tahap Fakultas' : 'Tambah Tahap Fakultas'}
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-100 font-medium mt-1">
                {activeStage ? 'Perbarui detail tahapan orientasi fakultas' : 'Tambahkan tahapan orientasi baru'}
              </DialogDescription>
            </div>
          </div>
          <form onSubmit={saveStage} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Nama Tahap</label>
              <input required value={stageForm.name} onChange={e => setStageForm({ ...stageForm, name: e.target.value })} placeholder="Nama tahap (cth: Pembekalan)" className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all placeholder:text-[var(--theme-text-subtle)]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Deskripsi</label>
              <textarea rows="2" value={stageForm.description} onChange={e => setStageForm({ ...stageForm, description: e.target.value })} placeholder="Deskripsi tahapan..." className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all resize-none placeholder:text-[var(--theme-text-subtle)]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Tanggal Mulai</label>
                <input type="date" value={stageForm.start_date} onChange={e => setStageForm({ ...stageForm, start_date: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Tanggal Selesai</label>
                <input type="date" value={stageForm.end_date} onChange={e => setStageForm({ ...stageForm, end_date: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Status</label>
                <select value={stageForm.status} onChange={e => setStageForm({ ...stageForm, status: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all text-[var(--theme-text)]">
                  <option value="locked">Terkunci</option>
                  <option value="active">Aktif</option>
                  <option value="completed">Selesai</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Publikasikan</label>
                <label className="flex items-center gap-2.5 px-4 h-[46px] rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-sm font-semibold cursor-pointer hover:bg-[var(--theme-border-muted)] transition-colors text-[var(--theme-text)]">
                  <input type="checkbox" checked={stageForm.is_published} onChange={e => setStageForm({ ...stageForm, is_published: e.target.checked })} className="rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary-light)] w-4 h-4" />
                  <span>Publish</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-5 border-t border-[var(--theme-border-muted)]">
              <button type="button" onClick={() => setShowStageModal(false)} className="h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors border border-[var(--theme-border)]">Batal</button>
              <button type="submit" className="h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-sm active:scale-95 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">save</span> Simpan
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Session Modal */}
      <Dialog open={showSessionModal} onOpenChange={setShowSessionModal}>
        <DialogContent className="max-w-lg">
          <div className="relative bg-gradient-to-br from-primary via-primary to-blue-700 pt-6 pb-7 px-6 overflow-hidden flex-shrink-0 border-b-0">
            <div className="absolute -top-10 -right-10 w-44 h-44 bg-white/5 rounded-full pointer-events-none" />
            <div className="absolute -bottom-6 right-16 w-28 h-28 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative z-10">
              <span className="text-[10px] font-bold text-white/50 uppercase tracking-[0.25em] mb-1 block">
                Sesi Kencana
              </span>
              <DialogTitle className="text-xl font-extrabold font-headline leading-tight truncate text-white mt-0.5">
                {editingSession ? 'Edit Sesi Fakultas' : 'Tambah Sesi Fakultas'}
              </DialogTitle>
              <DialogDescription className="text-xs text-blue-100 font-medium mt-1">
                {editingSession ? 'Perbarui detail sesi pembelajaran orientasi mahasiswa' : 'Buat sesi pembelajaran baru untuk orientasi mahasiswa'}
              </DialogDescription>
            </div>
          </div>
          <form onSubmit={saveSession} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Judul Sesi</label>
              <input required value={sessionForm.title} onChange={e => setSessionForm({ ...sessionForm, title: e.target.value })} placeholder="Judul sesi (cth: Perkenalan Prodi)" className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all placeholder:text-[var(--theme-text-subtle)]" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Deskripsi</label>
              <textarea rows="2" value={sessionForm.description} onChange={e => setSessionForm({ ...sessionForm, description: e.target.value })} placeholder="Deskripsi sesi..." className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all resize-none placeholder:text-[var(--theme-text-subtle)]" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Tanggal Mulai</label>
                <input type="date" value={sessionForm.start_date} onChange={e => setSessionForm({ ...sessionForm, start_date: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Tanggal Selesai</label>
                <input type="date" value={sessionForm.end_date} onChange={e => setSessionForm({ ...sessionForm, end_date: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Status</label>
                <select value={sessionForm.status} onChange={e => setSessionForm({ ...sessionForm, status: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold transition-all text-[var(--theme-text)]">
                  <option value="locked">Terkunci</option>
                  <option value="active">Aktif</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Publikasikan</label>
                <label className="flex items-center gap-2.5 px-4 h-[46px] rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] text-sm font-semibold cursor-pointer hover:bg-[var(--theme-border-muted)] transition-colors text-[var(--theme-text)]">
                  <input type="checkbox" checked={sessionForm.is_published} onChange={e => setSessionForm({ ...sessionForm, is_published: e.target.checked })} className="rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary-light)] w-4 h-4" />
                  <span>Publish</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-5 border-t border-[var(--theme-border-muted)]">
              <button type="button" onClick={() => setShowSessionModal(false)} className="h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors border border-[var(--theme-border)]">Batal</button>
              <button type="submit" className="h-10 px-6 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-sm active:scale-95 transition-all flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">save</span> Simpan
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Modals */}
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
