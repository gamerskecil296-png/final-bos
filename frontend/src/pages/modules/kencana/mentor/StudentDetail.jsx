import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
  useMentorStudentProgressQuery, 
  useMentorStudentScoreQuery,
  useMentorStudentAttendanceQuery,
  useMentorStudentHandbookQuery,
  useMentorUpsertBulkScoreItemsMutation,
  useMentorReviewHandbookMutation
} from '@/queries/useKencanaMentorQuery';
import { SelectField, SelectOption } from '@/components/ui/SelectField';



const validTabs = new Set(['progress', 'form', 'handbook']);

const StudentDetail = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(validTabs.has(searchParams.get('tab')) ? searchParams.get('tab') : 'progress');
  const [scoresInput, setScoresInput] = useState({});
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewFeedback, setReviewFeedback] = useState('');

  // Parallel Queries
  const { data: progressData, isLoading: loadingProgress } = useMentorStudentProgressQuery(studentId);
  const { data: scoreData, isLoading: loadingScore } = useMentorStudentScoreQuery(studentId);
  const { data: attendanceData, isLoading: loadingAttendance } = useMentorStudentAttendanceQuery(studentId);
  const { data: handbookData, isLoading: loadingHandbook } = useMentorStudentHandbookQuery(studentId);

  // Mutations
  const saveScoresMutation = useMentorUpsertBulkScoreItemsMutation();
  const reviewHandbookMutation = useMentorReviewHandbookMutation();

  const isLoading = loadingProgress || loadingScore || loadingAttendance || loadingHandbook;

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (validTabs.has(tab)) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  const switchTab = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Initialize scores state from existing database values
  useEffect(() => {
    if (scoreData?.items) {
      const map = {};
      scoreData.items.forEach(item => {
        map[`${item.component}__${item.item_name}`] = item.score;
      });
      setScoresInput(map);
    }
  }, [scoreData]);

  // Initialize review form state from existing database values
  useEffect(() => {
    if (handbookData) {
      setReviewStatus(handbookData.status === 'approved' ? 'approved' : 'rejected');
      setReviewFeedback(handbookData.feedback || '');
    }
  }, [handbookData]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
        <span className="ml-3 font-semibold text-[var(--theme-text-muted)] text-sm">Memuat detail mahasiswa...</span>
      </div>
    );
  }

  const student = progressData?.student || scoreData?.student || {};
  const score = scoreData?.score || {};
  const scoreItems = scoreData?.items || [];
  const blockers = scoreData?.blockers || [];
  const progress = progressData?.progress_total || 0;
  const attendance = attendanceData || { percentage: 0, present_count: 0, required_sessions: 0 };
  const attendanceOverrideItem = scoreItems.find(item =>
    String(item.component || '').toLowerCase() === 'requirements' &&
    String(item.item_name || '').toLowerCase() === 'kehadiran'
  );
  const attendancePercentage = attendanceOverrideItem ? Number(attendanceOverrideItem.score || 0) : Number(attendance.percentage || 0);
  const attendanceStatus = attendancePercentage >= 100 ? 'Lengkap' : 'Kurang';
  const handbookScoreItem = scoreItems.find(item =>
    ['cognitive', 'requirements', 'cognitive_static'].includes(String(item.component || '').toLowerCase()) &&
    String(item.item_name || '').toLowerCase() === 'handbook'
  );
  const isHandbookScored = Number(handbookScoreItem?.score || 0) > 0;
  const handbookStatusLabel = isHandbookScored
    ? 'Sudah Diisi'
    : !handbookData || handbookData.status === 'not_started' ? 'Belum Diisi' :
      handbookData.status === 'draft' ? 'Draft Mahasiswa' :
      handbookData.status === 'submitted' ? 'Menunggu Review' :
      handbookData.status === 'approved' ? 'Disetujui' : 'Perlu Perbaikan';
  const handbookStatusMeta = isHandbookScored
    ? `Nilai handbook: ${handbookScoreItem.score}`
    : handbookData?.reviewed_at ? `Direview: ${new Date(handbookData.reviewed_at).toLocaleDateString('id-ID')}` : 'Belum dievaluasi';
  
  const scopePrefix = scoreData?.mentor_scope === 'fakultas' ? '[Fakultas]' : '[Univ]';
  const STATIC_SCORE_DEFINITIONS = {
    cognitive: scoreData?.mentor_scope === 'fakultas' ? [] : [
      { key: 'Handbook', label: `${scopePrefix} Handbook`, manual: true },
    ],
    psychomotor: [
      { key: 'Taat Peraturan & Tatib (Makanan)', label: `${scopePrefix} Taat Peraturan & Tatib`, manual: true },
      { key: 'Twibon', label: `${scopePrefix} Twibon`, manual: true },
      { key: 'Video Perkenalan (Analog)', label: `${scopePrefix} Video Perkenalan`, manual: true },
      { key: 'Atribut sesuai Ketentuan', label: `${scopePrefix} Atribut Sesuai Ketentuan`, manual: true },
      { key: 'Kreativitas Individu (name tag, mind map & video rekap)', label: `${scopePrefix} Kreativitas Individu`, manual: true },
      { key: 'Kreativitas Kelompok (Tongkat & yelyel)', label: `${scopePrefix} Kreativitas Kelompok`, manual: true },
      { key: 'Memelihara Fasilitas UBK', label: `${scopePrefix} Memelihara Fasilitas UBK`, manual: true },
    ],
    affective: [
      { key: 'Etika terhadap panitia & civitas', label: `${scopePrefix} Etika terhadap Panitia & Civitas`, manual: true },
      { key: 'Empati', label: `${scopePrefix} Empati`, manual: true },
      { key: 'Tanggung Jawab', label: `${scopePrefix} Tanggung Jawab`, manual: true },
      { key: 'Disiplin', label: `${scopePrefix} Disiplin`, manual: true },
      { key: 'Adil', label: `${scopePrefix} Adil`, manual: true },
    ],
    requirements: [
      { key: 'Kehadiran', label: `${scopePrefix} Kehadiran (Manual Override)`, manual: true },
    ],
  };

  const SCORE_DEFINITIONS = {
    ...STATIC_SCORE_DEFINITIONS,
    cognitive: [
      ...(scoreData?.score_definitions?.cognitive || []),
      ...STATIC_SCORE_DEFINITIONS.cognitive,
    ],
  };
  const cognitiveDefinitions = SCORE_DEFINITIONS.cognitive || [];

  const handleScoreChange = (component, key, val) => {
    const parsed = val === '' ? '' : Math.min(100, Math.max(0, parseFloat(val) || 0));
    setScoresInput(prev => ({
      ...prev,
      [`${component}__${key}`]: parsed
    }));
  };

  const handleSaveScores = (e) => {
    e.preventDefault();
    const items = [];
    Object.entries(SCORE_DEFINITIONS).forEach(([component, list]) => {
      list.forEach(def => {
        if (def.manual) {
          const val = scoresInput[`${component}__${def.key}`];
          items.push({
            component,
            item_name: def.key,
            score: val === '' || val === undefined ? 0 : val,
            notes: `Diisi oleh Mentor/DP`
          });
        }
      });
    });

    saveScoresMutation.mutate(
      { studentId, items },
      {
        onSuccess: () => {
          alert('✅ Nilai mahasiswa bimbingan berhasil disimpan!');
        },
        onError: (err) => {
          alert('❌ Gagal menyimpan nilai: ' + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  const handleSaveReview = (e) => {
    e.preventDefault();
    if (!handbookData || handbookData.status === 'not_started') {
      alert('⚠️ Mahasiswa belum membuat atau mengirimkan handbook.');
      return;
    }

    reviewHandbookMutation.mutate(
      { studentId, status: reviewStatus, feedback: reviewFeedback },
      {
        onSuccess: () => {
          alert('✅ Review handbook berhasil disimpan!');
        },
        onError: (err) => {
          alert('❌ Gagal menyimpan review handbook: ' + (err.response?.data?.message || err.message));
        }
      }
    );
  };

  // Group items by component for presentation
  const cognitiveItems = scoreItems.filter(i => i.component.toLowerCase() === 'cognitive');
  const psychomotorItems = scoreItems.filter(i => i.component.toLowerCase() === 'psychomotor');
  const affectiveItems = scoreItems.filter(i => i.component.toLowerCase() === 'affective');

  // Parse handbook JSON securely
  let handbookContent = null;
  if (handbookData?.content_json) {
    try {
      handbookContent = typeof handbookData.content_json === 'string' 
        ? JSON.parse(handbookData.content_json) 
        : handbookData.content_json;
    } catch (e) {
      handbookContent = handbookData.content_json;
    }
  }

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      {/* Breadcrumbs & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate(-1)} 
            className="px-4 py-2 bg-[var(--theme-bg)] rounded-xl text-[var(--theme-text)] hover:bg-[var(--theme-border-muted)] transition-colors border border-[var(--theme-border)] text-xs font-bold"
          >
            &larr; Kembali
          </button>
          <div>
            <h1 className="text-lg font-bold text-[var(--theme-text)] tracking-tight">
              {student.Nama || student.nama || student.NAMA || student.Name || 'Detail Mahasiswa'}
            </h1>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">
              NIM: {student.NIM || student.nim || '-'} &bull; {student.ProgramStudi?.Nama || student.program_studi?.Nama || student.program_studi?.nama || '-'} &bull; {student.Fakultas?.Nama || student.fakultas?.Nama || student.fakultas?.nama || '-'}
            </p>
          </div>
        </div>

        {/* Graduation badge status inside header */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-1">Status Kelulusan</span>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
              score.graduation_status === 'passed' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]' :
              score.graduation_status === 'conditional_pass' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]' :
              score.graduation_status === 'remedial' ? 'bg-[var(--theme-danger-light)] text-[var(--theme-danger)] border-[var(--theme-danger-light)]' : 
              'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'
            }`}>
              {score.graduation_status === 'passed' ? 'LULUS' :
               score.graduation_status === 'conditional_pass' ? 'LULUS BERSYARAT' :
               score.graduation_status === 'remedial' ? 'REMEDIAL' : 'BELUM EVALUASI'}
            </span>
          </div>
          <div className="bg-[var(--theme-primary-light)] px-4 py-2 rounded-xl border border-[var(--theme-primary-light)] text-center">
            <span className="text-[9px] font-bold text-[var(--theme-primary)] uppercase tracking-widest block">Nilai Akhir</span>
            <span className="text-2xl font-bold text-[var(--theme-primary)]">{score.final_score?.toFixed(1) || '0.0'}</span>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm w-fit mb-6">
        <button
          onClick={() => switchTab('progress')}
          className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'progress' 
              ? 'bg-[var(--theme-primary)] text-white shadow-md' 
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
          }`}
        >
          📈 Rincian Nilai
        </button>
        <button
          onClick={() => switchTab('form')}
          className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'form' 
              ? 'bg-[var(--theme-primary)] text-white shadow-md' 
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
          }`}
        >
          📝 Input &amp; Edit Nilai
        </button>
        <button
          onClick={() => switchTab('handbook')}
          className={`h-10 px-5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${
            activeTab === 'handbook' 
              ? 'bg-[var(--theme-primary)] text-white shadow-md' 
              : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]'
          }`}
        >
          📘 Review Handbook
        </button>
      </div>

      {/* TAB CONTENT: PROGRESS */}
      {activeTab === 'progress' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Blockers / Warnings */}
            {blockers.length > 0 && (
              <div className="md:col-span-3 p-5 bg-[var(--theme-danger-light)] border border-[var(--theme-danger-light)] rounded-2xl text-[var(--theme-danger)]">
                <h4 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                  ⚠️ Syarat Kelulusan Belum Terpenuhi
                </h4>
                <ul className="list-disc pl-5 text-xs font-bold space-y-1">
                  {blockers.map((b, idx) => <li key={idx}>{b}</li>)}
                </ul>
              </div>
            )}

            {/* Attendance widget */}
            <div className="bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block">Persentase Kehadiran</span>
                <span className="text-2xl font-bold text-[var(--theme-text)] mt-1 block">{attendancePercentage}%</span>
                <span className="text-xs font-semibold text-[var(--theme-text-muted)] block mt-1">
                  {attendanceOverrideItem ? 'Diambil dari nilai manual Kehadiran' : `Sesi: ${attendance.attended_sessions} / ${attendance.required_sessions}`}
                </span>
              </div>
              <div className={`p-3 rounded-xl border font-bold text-xs ${attendancePercentage >= 100 ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]' : 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]'}`}>
                <span className="font-bold text-xs">{attendanceStatus}</span>
              </div>
            </div>

            {/* Progress widget */}
            <div className="bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block">Progress Materi</span>
                <span className="text-2xl font-bold text-[var(--theme-text)] mt-1 block">{progress}%</span>
                <span className="text-xs font-semibold text-[var(--theme-text-muted)] block mt-1">Materi &amp; Tugas diselesaikan</span>
              </div>
              <div className="p-3 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] rounded-xl border border-[var(--theme-primary-light)] font-bold text-xs">
                Aktif
              </div>
            </div>

            {/* Handbook Status widget */}
            <div className="bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block">Status Handbook</span>
                <span className="text-lg font-bold text-[var(--theme-text)] mt-1 block uppercase tracking-tight">
                  {handbookStatusLabel}
                </span>
                <span className="text-xs font-semibold text-[var(--theme-text-muted)] block mt-1">
                  {handbookStatusMeta}
                </span>
              </div>
              <div className={`p-3 rounded-xl border font-bold text-xs ${
                isHandbookScored || handbookData?.status === 'approved' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]' :
                handbookData?.status === 'submitted' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary-light)] animate-pulse' :
                'bg-[var(--theme-bg)] text-[var(--theme-text-muted)] border-[var(--theme-border)]'
              }`}>
                {isHandbookScored || handbookData?.status === 'approved' ? 'SUDAH' : 'PENDING'}
              </div>
            </div>
          </div>

          {/* Simplified Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pengetahuan */}
            <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[var(--theme-text)] text-sm uppercase tracking-wider">1. Pengetahuan</h3>
                <span className="bg-[var(--theme-primary-light)] text-[var(--theme-primary)] px-2 py-1 rounded text-xs font-bold">{score.cognitive_average?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="space-y-2 text-sm font-semibold text-[var(--theme-text-muted)]">
                {cognitiveDefinitions.length > 0 ? cognitiveDefinitions.map(def => {
                  const item = cognitiveItems.find(i => i.item_name === def.key);
                  return (
                    <div key={def.key} className="flex justify-between border-b border-dashed border-[var(--theme-border-muted)] pb-1">
                      <span className="truncate pr-2">{def.label || def.key}</span>
                      <span className="font-bold text-[var(--theme-text)]">{item?.score ?? '-'}</span>
                    </div>
                  );
                }) : <span className="italic text-xs">Belum ada nilai</span>}
              </div>
            </div>

            {/* Keterampilan */}
            <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[var(--theme-text)] text-sm uppercase tracking-wider">2. Keterampilan</h3>
                <span className="bg-[var(--theme-secondary-light)] text-[var(--theme-secondary)] px-2 py-1 rounded text-xs font-bold">{score.psychomotor_average?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="space-y-2 text-sm font-semibold text-[var(--theme-text-muted)]">
                {SCORE_DEFINITIONS.psychomotor.length > 0 ? SCORE_DEFINITIONS.psychomotor.map(def => {
                  const item = psychomotorItems.find(i => i.item_name === def.key);
                  return (
                    <div key={def.key} className="flex justify-between border-b border-dashed border-[var(--theme-border-muted)] pb-1">
                      <span className="truncate pr-2">{def.label || def.key}</span>
                      <span className="font-bold text-[var(--theme-text)]">{item?.score ?? '-'}</span>
                    </div>
                  );
                }) : <span className="italic text-xs">Belum ada nilai</span>}
              </div>
            </div>

            {/* Sikap */}
            <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-[var(--theme-text)] text-sm uppercase tracking-wider">3. Sikap</h3>
                <span className="bg-[var(--theme-danger-light)] text-[var(--theme-danger)] px-2 py-1 rounded text-xs font-bold">{score.affective_average?.toFixed(1) || '0.0'}</span>
              </div>
              <div className="space-y-2 text-sm font-semibold text-[var(--theme-text-muted)]">
                {SCORE_DEFINITIONS.affective.length > 0 ? SCORE_DEFINITIONS.affective.map(def => {
                  const item = affectiveItems.find(i => i.item_name === def.key);
                  return (
                    <div key={def.key} className="flex justify-between border-b border-dashed border-[var(--theme-border-muted)] pb-1">
                      <span className="truncate pr-2">{def.label || def.key}</span>
                      <span className="font-bold text-[var(--theme-text)]">{item?.score ?? '-'}</span>
                    </div>
                  );
                }) : <span className="italic text-xs">Belum ada nilai</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GRADE INPUT FORM */}
      {activeTab === 'form' && (
        <form onSubmit={handleSaveScores} className="bg-white p-8 rounded-2xl border border-[var(--theme-border)] shadow-sm space-y-8">
          <div>
            <h3 className="text-base font-bold text-[var(--theme-text)] uppercase tracking-tight">Form Pengisian Nilai Mahasiswa</h3>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">Masukkan nilai dari 0 hingga 100 untuk sub-item manual. Nilai tes otomatis ditampilkan sebagai referensi.</p>
          </div>

          <div className="space-y-6">
            {/* Cognitive */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-primary)]">1. Nilai Pengetahuan (Kuis &amp; Tugas)</h4>
              {!SCORE_DEFINITIONS.cognitive.length && (
                <div className="rounded-2xl bg-[var(--theme-bg)] border border-[var(--theme-border)] px-4 py-3 text-xs font-bold text-[var(--theme-text-muted)]">
                  Belum ada post test aktif dari Kencana University. Nilai post test akan muncul otomatis setelah kuis aktif dan dikerjakan mahasiswa.
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SCORE_DEFINITIONS.cognitive.map(def => {
                  const key = `cognitive__${def.key}`;
                  const currentVal = scoresInput[key] ?? '';
                  return (
                    <div key={def.key} className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--theme-text-muted)] block">{def.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="Nilai (0-100)"
                        value={currentVal}
                        onChange={e => handleScoreChange('cognitive', def.key, e.target.value)}
                        disabled={!def.manual}
                        className={`w-full h-10 px-4 bg-[var(--theme-bg)] border rounded-xl text-sm font-semibold focus:outline-none transition-all ${
                          def.manual 
                            ? 'border-[var(--theme-border)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)]' 
                            : 'border-[var(--theme-border-muted)] bg-[var(--theme-bg)] text-[var(--theme-text-muted)] cursor-not-allowed font-medium'
                        }`}
                      />
                      {!def.manual && (
                        <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] block">Dihitung otomatis oleh sistem</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Psychomotor */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-secondary)]">2. Nilai Keterampilan &amp; Keaktifan</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {SCORE_DEFINITIONS.psychomotor.map(def => {
                  const key = `psychomotor__${def.key}`;
                  const currentVal = scoresInput[key] ?? '';
                  return (
                    <div key={def.key} className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--theme-text-muted)] block" title={def.key}>
                        {def.label}
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="Nilai (0-100)"
                        value={currentVal}
                        onChange={e => handleScoreChange('psychomotor', def.key, e.target.value)}
                        className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Affective */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-danger)]">3. Nilai Sikap &amp; Perilaku</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {SCORE_DEFINITIONS.affective.map(def => {
                  const key = `affective__${def.key}`;
                  const currentVal = scoresInput[key] ?? '';
                  return (
                    <div key={def.key} className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--theme-text-muted)] block">{def.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="Nilai (0-100)"
                        value={currentVal}
                        onChange={e => handleScoreChange('affective', def.key, e.target.value)}
                        className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Requirements Override */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-warning)]">IV. Persyaratan Kelulusan (Manual Override)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {SCORE_DEFINITIONS.requirements.map(def => {
                  const key = `requirements__${def.key}`;
                  const currentVal = scoresInput[key] ?? '';
                  return (
                    <div key={def.key} className="space-y-1.5">
                      <label className="text-xs font-bold text-[var(--theme-text-muted)] block">{def.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        placeholder="Nilai (0-100)"
                        value={currentVal}
                        onChange={e => handleScoreChange('requirements', def.key, e.target.value)}
                        className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all"
                      />
                      <span className="text-[10px] font-semibold text-[var(--theme-text-muted)] block">Isi 100 untuk menyatakan lengkap/lulus.</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[var(--theme-border-muted)]">
            <button
              type="submit"
              disabled={saveScoresMutation.isPending}
              className="h-10 px-6 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white font-bold rounded-xl disabled:opacity-50 transition-all text-xs flex items-center gap-2 shadow-sm"
            >
              {saveScoresMutation.isPending && (
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              )}
              Simpan Semua Nilai
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT: HANDBOOK REVIEW */}
      {activeTab === 'handbook' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Content panel */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm space-y-6">
            <div className="border-b border-[var(--theme-border-muted)] pb-4">
              <h3 className="text-base font-bold text-[var(--theme-text)] uppercase tracking-tight">Lembar Pengisian Handbook Mahasiswa</h3>
              <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">Review isian handbook yang telah dikumpulkan mahasiswa bimbingan.</p>
            </div>

            {!handbookData || handbookData.status === 'not_started' ? (
              <div className="p-8 text-center text-[var(--theme-text-muted)] italic font-semibold">
                Mahasiswa belum mengisi handbook pada periode ini.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)]">
                  <div>
                    <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-1">Status Pengiriman</span>
                    <span className="font-bold text-[var(--theme-text)] uppercase">{handbookData.status}</span>
                  </div>
                  {handbookData.submitted_at && (
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-1">Tanggal Submit</span>
                      <span className="font-semibold text-[var(--theme-text)] text-xs">{new Date(handbookData.submitted_at).toLocaleString('id-ID')}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)]">Isi Ringkasan Handbook:</h4>
                  {handbookContent ? (
                    <div className="max-h-[500px] overflow-y-auto no-scrollbar">
                      <div className="space-y-4 px-1">
                        {Object.entries(handbookContent).map(([section, value]) => (
                          <div key={section} className="p-4 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]">
                            <span className="text-[10px] font-bold text-[var(--theme-primary)] uppercase tracking-wider block mb-2">{section.replace(/_/g, ' ')}</span>
                            <p className="text-sm font-semibold text-[var(--theme-text)] whitespace-pre-wrap">{typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value || '-')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-[var(--theme-bg)] text-[var(--theme-text-muted)] text-xs italic rounded-xl border border-[var(--theme-border)]">
                      Format isian handbook kosong atau tidak valid.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Approval review Form */}
          <div className="bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm space-y-6 self-start">
            <h3 className="text-base font-bold text-[var(--theme-text)] uppercase tracking-tight">Keputusan Evaluasi</h3>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)]">Sebagai DP/Mentor, Anda wajib memverifikasi keabsahan handbook sebelum menyetujuinya.</p>

            <form onSubmit={handleSaveReview} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--theme-text-muted)] block">Status Persetujuan</label>
                <SelectField
                  value={reviewStatus}
                  onValueChange={val => setReviewStatus(val)}
                  className="w-full"
                >
                  <SelectOption value="approved">✅ Setujui (Approved)</SelectOption>
                  <SelectOption value="rejected">❌ Perlu Perbaikan (Rejected)</SelectOption>
                </SelectField>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--theme-text-muted)] block">Feedback / Catatan</label>
                <textarea
                  rows="4"
                  placeholder="Tuliskan catatan perbaikan atau feedback untuk mahasiswa..."
                  value={reviewFeedback}
                  onChange={e => setReviewFeedback(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[var(--theme-bg)] border border-[var(--theme-border)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] text-sm font-semibold text-[var(--theme-text)] focus:outline-none transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={reviewHandbookMutation.isPending || !handbookData || handbookData.status === 'not_started'}
                className="w-full h-10 bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white font-bold rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs flex items-center justify-center gap-2 shadow-sm"
              >
                {reviewHandbookMutation.isPending && (
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                )}
                Simpan Evaluasi
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDetail;
