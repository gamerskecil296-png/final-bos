import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useKencanaQuizQuery, useStartQuizMutation, useSubmitQuizMutation } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, PrimaryButton, StatusBadge } from './Kencana/components';

export default function KencanaKuisPage() {
  const { kuisId, quizId } = useParams();
  const id = quizId || kuisId;
  const navigate = useNavigate();
  const { data, isLoading, isError } = useKencanaQuizQuery(id);
  const startQuiz = useStartQuizMutation();
  const submitQuiz = useSubmitQuizMutation();
  const [attempt, setAttempt] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(null);
  const [result, setResult] = useState(null);

  const questions = data?.questions || [];
  const flatAnswers = useMemo(() => Object.entries(answers).map(([questionId, selectedOptionId]) => ({ question_id: Number(questionId), selected_option_id: Number(selectedOptionId) })), [answers]);

  useEffect(() => {
    if (!attempt || timeLeft === null || result) return;
    if (timeLeft <= 0) { handleSubmit(); return; }
    const timer = setTimeout(() => setTimeLeft((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [attempt, timeLeft, result]);

  useEffect(() => {
    if (data?.last_attempt && data?.attempts_used >= data?.max_attempts && !result) {
      setResult(data.last_attempt);
    }
  }, [data, result]);

  const handleStart = () => {
    startQuiz.mutate(id, {
      onSuccess: (res) => {
        setAttempt(res);
        setTimeLeft((data?.duration_minutes || 30) * 60);
        toast.success('Quiz dimulai');
      },
      onError: (err) => toast.error(err.response?.data?.message || 'Gagal memulai quiz'),
    });
  };

  const handleSubmit = () => {
    if (!attempt) return;
    submitQuiz.mutate({ attemptId: attempt.id || attempt.ID, answers: flatAnswers }, {
      onSuccess: setResult,
      onError: (err) => toast.error(err.response?.data?.message || 'Gagal submit quiz'),
    });
  };

  const fmt = (s) => `${String(Math.floor((s || 0) / 60)).padStart(2, '0')}:${String((s || 0) % 60).padStart(2, '0')}`;

  if (isLoading) return <KencanaShell title="Quiz Kencana" breadcrumbs={[{ label: 'Timeline', to: '/app/student/kencana/timeline' }, { label: 'Quiz' }]}><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Quiz Kencana" breadcrumbs={[{ label: 'Timeline', to: '/app/student/kencana/timeline' }, { label: 'Quiz' }]}><ErrorPanel message="Quiz tidak ditemukan atau belum tersedia." /></KencanaShell>;

  if (result) {
    return (
      <KencanaShell title="Hasil Kuis" subtitle="Nilai kuis otomatis masuk ke rekapitulasi nilai Kencana." breadcrumbs={[{ label: 'Timeline', to: '/app/student/kencana' }, { label: 'Hasil Kuis' }]}>
        <section className="mx-auto max-w-xl glass-card p-8 text-center">
          <div className="mx-auto grid size-20 place-items-center rounded-full bg-emerald-50 text-emerald-600 mb-6 border border-emerald-100"><span className="material-symbols-outlined" style={{ fontSize: 42 }}>check_circle</span></div>
          <h2 className="text-3xl font-bold font-headline text-slate-800 mb-2">Nilai Kuis: {Number(result.score || result.nilai || 0).toFixed(1)}</h2>
          <p className="text-sm font-semibold text-slate-500 mb-6">Benar {result.correct_count || result.jumlah_benar || 0} dari {result.total_questions || result.total_soal || 0} soal.</p>
          <div className="flex justify-center mb-8">
             <StatusBadge status={(result.passed || result.lulus) ? 'passed' : 'not_passed'} />
          </div>
          <PrimaryButton onClick={() => navigate('/app/student/kencana/score')}>Lihat Rekap Nilai Kencana</PrimaryButton>
        </section>
      </KencanaShell>
    );
  }

  if (!attempt) {
    return (
      <KencanaShell title={data?.title || 'Kuis Kencana'} subtitle={data?.description} breadcrumbs={[{ label: 'Timeline', to: '/app/student/kencana' }, { label: data?.title || 'Kuis' }]}>
        <section className="glass-card p-6 md:p-8">
          <StatusBadge status={data?.can_start ? 'active' : 'locked'} />
          <h2 className="mt-4 text-xl font-bold font-headline text-slate-800">Instruksi Kuis</h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-slate-600">{data?.instruction || 'Tidak ada instruksi khusus untuk kuis ini.'}</p>
          
          <div className="mt-6 grid gap-4 grid-cols-2 md:grid-cols-4">
            <Mini icon="format_list_numbered" label="Jumlah Soal" value={questions.length} />
            <Mini icon="timer" label="Durasi" value={`${data?.duration_minutes}m`} />
            <Mini icon="replay" label="Percobaan" value={`${data?.attempts_used}/${data?.max_attempts}`} />
            <Mini icon="visibility" label="Nilai" value={data?.show_score ? 'Tampil' : 'Ditahan'} />
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 border-t border-slate-200 pt-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Waktu Dibuka</p>
              <p className="text-sm font-bold text-slate-700">
                {data?.open_at ? new Date(data.open_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : 'Tidak dibatasi'}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Waktu Ditutup (Tenggat)</p>
              <p className="text-sm font-bold text-slate-700">
                {data?.close_at ? new Date(data.close_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' }) : 'Tidak dibatasi'}
              </p>
            </div>
          </div>

          {data?.lock_reason && <p className="mt-6 rounded-xl bg-amber-50 border border-amber-100 p-4 text-sm font-bold text-amber-800 flex items-center gap-2"><span className="material-symbols-outlined text-[18px]">lock</span> {data.lock_reason}</p>}
          <div className="mt-8 pt-6 border-t border-slate-200 flex justify-end">
            <PrimaryButton onClick={handleStart} disabled={!data?.can_start || startQuiz.isPending}>
              {startQuiz.isPending ? 'Memulai...' : 'Mulai Kerjakan'}
            </PrimaryButton>
          </div>
        </section>
      </KencanaShell>
    );
  }

  return (
    <KencanaShell title={data?.title || 'Kuis Kencana'} subtitle={`Sisa waktu ${fmt(timeLeft)} · ${Object.keys(answers).length}/${questions.length} soal terjawab`} breadcrumbs={[{ label: 'Timeline', to: '/app/student/kencana' }, { label: data?.title || 'Kuis' }]}>
      <section className="space-y-4">
        {questions.map((q, idx) => (
          <article key={q.id} className="glass-card p-5 md:p-6 border border-slate-200">
            <h3 className="text-base font-bold font-headline text-slate-800 leading-relaxed">{idx + 1}. {q.question_text}</h3>
            <div className="mt-5 grid gap-3">
              {(q.options || []).map((opt) => (
                <label key={opt.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-all ${Number(answers[q.id]) === Number(opt.id) ? 'border-[var(--theme-primary)] bg-[var(--theme-primary)]/5 shadow-sm' : 'border-slate-200 bg-slate-50 hover:border-slate-300'}`}>
                  <input className="mt-0.5 w-4 h-4 text-[var(--theme-primary)] border-slate-300 focus:ring-[var(--theme-primary)] focus:ring-2" type="radio" name={`q-${q.id}`} checked={Number(answers[q.id]) === Number(opt.id)} onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt.id }))} />
                  <span className={`text-sm font-semibold leading-relaxed ${Number(answers[q.id]) === Number(opt.id) ? 'text-[var(--theme-primary)]' : 'text-slate-700'}`}>{opt.option_text}</span>
                </label>
              ))}
            </div>
          </article>
        ))}
        <div className="sticky bottom-6 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur-md flex items-center justify-between gap-4 z-50">
          <div className="flex items-center gap-3">
             <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                <span className="material-symbols-outlined">timer</span>
             </div>
             <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sisa Waktu</p>
                <p className={`text-base font-bold font-headline ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-slate-700'}`}>{fmt(timeLeft)}</p>
             </div>
          </div>
          <PrimaryButton onClick={handleSubmit} disabled={submitQuiz.isPending}>{submitQuiz.isPending ? 'Mengirim...' : 'Kirim Jawaban'}</PrimaryButton>
        </div>
      </section>
    </KencanaShell>
  );
}

function Mini({ label, value, icon }) { 
  return (
    <div className="glass-card p-4 flex flex-col items-center justify-center text-center gap-1 border-slate-200/60 bg-white">
      {icon && <span className="material-symbols-outlined text-[var(--theme-primary)] mb-0.5 text-xl">{icon}</span>}
      <p className="text-xl font-bold text-slate-800 font-headline">{value}</p>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{label}</p>
    </div>
  ); 
}
