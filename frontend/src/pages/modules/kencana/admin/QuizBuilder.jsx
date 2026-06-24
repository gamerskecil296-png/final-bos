import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAdminQuizQuery, useCreateQuestionMutation, useUpdateQuestionMutation } from '@/queries/useKencanaAdminQuery';
import { PageHeader } from '@/components/ui/page/PageHeader';
import { SelectField, SelectOption } from '@/components/ui/SelectField';

const QuizBuilder = () => {
  const { id: quizId } = useParams();
  const navigate = useNavigate();
  
  const { data: quiz, isLoading } = useAdminQuizQuery(quizId);
  const createQuestionMutation = useCreateQuestionMutation();
  const updateQuestionMutation = useUpdateQuestionMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [questionForm, setQuestionForm] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    score: 10,
    options: [
      { option_text: '', is_correct: true },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false },
      { option_text: '', is_correct: false }
    ]
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20 bg-transparent">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--theme-primary)]"></div>
      </div>
    );
  }

  if (!quiz) {
    return <div className="p-8 text-center text-[var(--theme-text-subtle)] font-bold">Kuis tidak ditemukan.</div>;
  }

  const handleAddOption = () => {
    setQuestionForm(prev => ({
      ...prev,
      options: [...prev.options, { option_text: '', is_correct: false }]
    }));
  };

  const handleRemoveOption = (index) => {
    setQuestionForm(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }));
  };

  const handleOptionChange = (index, field, value) => {
    const newOptions = [...questionForm.options];
    if (field === 'is_correct') {
      newOptions.forEach(opt => opt.is_correct = false);
      newOptions[index].is_correct = true;
    } else {
      newOptions[index][field] = value;
    }
    setQuestionForm({ ...questionForm, options: newOptions });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!questionForm.question_text.trim()) return alert("Teks soal tidak boleh kosong");
    
    let payload = {
      quiz_id: parseInt(quizId),
      question_text: questionForm.question_text,
      question_type: questionForm.question_type,
      score: parseFloat(questionForm.score),
      order_number: (quiz.questions?.length || 0) + 1
    };

    if (questionForm.question_type === 'multiple_choice') {
      const validOptions = questionForm.options.filter(o => o.option_text.trim() !== '');
      if (validOptions.length < 2) return alert("Soal pilihan ganda minimal harus memiliki 2 opsi jawaban");
      const hasCorrect = validOptions.some(o => o.is_correct);
      if (!hasCorrect) return alert("Tentukan setidaknya satu jawaban yang benar");
      
      payload.options = validOptions.map((o, idx) => ({
        option_text: o.option_text,
        is_correct: o.is_correct,
        order_number: idx + 1
      }));
    }

    const mutation = editingQuestion ? updateQuestionMutation : createQuestionMutation;
    const submitPayload = editingQuestion ? { id: editingQuestion.id, ...payload } : payload;

    mutation.mutate(submitPayload, {
      onSuccess: () => {
        setShowForm(false);
        setEditingQuestion(null);
        setQuestionForm({
          question_text: '',
          question_type: 'multiple_choice',
          score: 10,
          options: [
            { option_text: '', is_correct: true },
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false },
            { option_text: '', is_correct: false }
          ]
        });
      }
    });
  };

  const startEditQuestion = (question) => {
    setEditingQuestion(question);
    setQuestionForm({
      question_text: question.question_text || '',
      question_type: question.question_type || 'multiple_choice',
      score: question.score || 10,
      options: question.options?.length ? question.options.map((opt) => ({
        id: opt.id,
        option_text: opt.option_text || '',
        is_correct: Boolean(opt.is_correct),
        order_number: opt.order_number || 0,
      })) : [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
      ],
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingQuestion(null);
    setQuestionForm({
      question_text: '',
      question_type: 'multiple_choice',
      score: 10,
      options: [
        { option_text: '', is_correct: true },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false },
        { option_text: '', is_correct: false }
      ]
    });
  };

  return (
    <div className="bg-transparent font-body max-w-5xl mx-auto space-y-6">
      
      {/* Back button */}
      <div>
        <button onClick={() => navigate(-1)} className="text-xs font-bold text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors">
          ← Kembali ke Detail Sesi
        </button>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--theme-primary-light)] rounded-full -mr-20 -mt-20 blur-3xl opacity-60 pointer-events-none"></div>
        <div className="flex justify-between items-start gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-[var(--theme-text)]">{quiz.title}</h1>
            <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-2 max-w-2xl leading-relaxed">{quiz.description || 'Kuis ini belum memiliki deskripsi.'}</p>
          </div>
          <div className="text-right flex flex-col items-end gap-1.5">
            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${quiz.status === 'published' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]' : 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]'}`}>
              {quiz.status === 'published' ? 'Aktif' : 'Draft'}
            </span>
            <p className="text-[10px] font-bold text-[var(--theme-text-subtle)]">Durasi: {quiz.duration_minutes} Menit</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-base font-bold text-[var(--theme-text)]">Daftar Pertanyaan ({quiz.questions?.length || 0})</h2>
        {!showForm && (
          <button 
            onClick={() => { setEditingQuestion(null); setShowForm(true); }}
            className="h-10 px-5 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-bold shadow-md transition-colors"
          >
            + Tambah Soal
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-[var(--theme-primary)] shadow-lg p-6 lg:p-8 relative">
          <button onClick={resetForm} className="absolute top-6 right-6 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)]">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
          <h3 className="text-lg font-bold text-[var(--theme-text)] mb-6">{editingQuestion ? 'Edit Soal' : 'Buat Soal Baru'}</h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-[var(--theme-text-muted)]">Teks Pertanyaan</label>
                <textarea 
                  required
                  rows="4"
                  value={questionForm.question_text}
                  onChange={e => setQuestionForm({...questionForm, question_text: e.target.value})}
                  className="w-full p-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all leading-relaxed"
                  placeholder="Masukkan pertanyaan di sini..."
                />
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[var(--theme-text-muted)]">Tipe Soal</label>
                  <SelectField
                    value={questionForm.question_type}
                    onValueChange={(val) => setQuestionForm({...questionForm, question_type: val})}
                    className="w-full"
                  >
                    <SelectOption value="multiple_choice">Pilihan Ganda</SelectOption>
                    <SelectOption value="essay">Esai / Teks Pendek</SelectOption>
                  </SelectField>
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[var(--theme-text-muted)]">Skor / Bobot Nilai</label>
                  <input 
                    type="number"
                    required min="1"
                    value={questionForm.score}
                    onChange={e => setQuestionForm({...questionForm, score: e.target.value})}
                    className="w-full h-10 px-4 bg-[var(--theme-bg)] border border-[var(--theme-border)] rounded-xl text-sm font-semibold focus:outline-none focus:border-[var(--theme-primary)]"
                  />
                </div>
              </div>
            </div>

            {questionForm.question_type === 'multiple_choice' && (
              <div className="mt-6 border border-[var(--theme-border)] rounded-2xl overflow-hidden bg-white">
                <div className="bg-[var(--theme-bg)] px-5 py-3 border-b border-[var(--theme-border-muted)] flex justify-between items-center">
                  <h4 className="font-bold text-xs text-[var(--theme-text-muted)] uppercase tracking-wider">Opsi Jawaban</h4>
                  <button type="button" onClick={handleAddOption} className="text-[10px] font-bold text-[var(--theme-primary)] bg-[var(--theme-primary-light)] hover:opacity-80 px-3 py-1.5 rounded-lg transition-colors">
                    + Tambah Opsi
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  {questionForm.options.map((opt, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all ${opt.is_correct ? 'border-[var(--theme-success-light)] bg-[var(--theme-success-light)]/40' : 'border-transparent bg-[var(--theme-bg)]'}`}>
                      <div className="pt-2">
                        <input 
                          type="radio" 
                          name="correct_option"
                          checked={opt.is_correct}
                          onChange={() => handleOptionChange(idx, 'is_correct', true)}
                          className="w-5 h-5 text-[var(--theme-success)] focus:ring-[var(--theme-success)]"
                          title="Tandai sebagai jawaban benar"
                        />
                      </div>
                      <div className="flex-1">
                        <input 
                          type="text"
                          value={opt.option_text}
                          onChange={e => handleOptionChange(idx, 'option_text', e.target.value)}
                          placeholder={`Opsi ${String.fromCharCode(65 + idx)}`}
                          className="w-full h-10 px-4 bg-white border border-[var(--theme-border)] rounded-lg text-sm font-semibold focus:outline-none focus:border-[var(--theme-primary)]"
                        />
                      </div>
                      {questionForm.options.length > 2 && (
                        <button type="button" onClick={() => handleRemoveOption(idx)} className="text-[var(--theme-text-subtle)] hover:text-[var(--theme-error)] p-2">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t border-[var(--theme-border-muted)]">
              <button 
                type="submit" 
                disabled={createQuestionMutation.isPending || updateQuestionMutation.isPending}
                className="h-10 px-6 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-bold shadow-md disabled:opacity-50 transition-colors"
              >
                {(createQuestionMutation.isPending || updateQuestionMutation.isPending) ? 'Menyimpan...' : (editingQuestion ? 'Update Soal' : 'Simpan Soal')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-4">
        {!quiz.questions?.length ? (
          <div className="text-center py-16 bg-[var(--theme-bg)] border border-[var(--theme-border)] border-dashed rounded-2xl">
            <svg className="w-12 h-12 text-[var(--theme-text-subtle)] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
            <p className="text-[var(--theme-text-muted)] font-bold text-sm">Belum ada soal untuk kuis ini.</p>
            <p className="text-xs text-[var(--theme-text-subtle)] mt-1">Klik tombol Tambah Soal untuk memulai membuat kuis.</p>
          </div>
        ) : (
          quiz.questions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 rounded-2xl border border-[var(--theme-border)] shadow-sm flex gap-4">
              <div className="flex-shrink-0 w-10 h-10 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] rounded-xl flex items-center justify-center font-bold text-base">
                {idx + 1}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-3 gap-2">
                  <h4 className="text-sm font-bold text-[var(--theme-text)] pr-8 leading-relaxed">{q.question_text}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold bg-[var(--theme-bg)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] px-2 py-0.5 rounded whitespace-nowrap">Bobot: {q.score}</span>
                    <button onClick={() => startEditQuestion(q)} className="text-[10px] font-bold bg-[var(--theme-primary-light)] text-[var(--theme-primary)] px-2.5 py-1 rounded hover:opacity-85 transition-colors">Edit</button>
                  </div>
                </div>
                
                <div className="inline-flex mb-3 px-2 py-0.5 bg-[var(--theme-bg)] text-[var(--theme-text-muted)] rounded text-[9px] font-bold uppercase tracking-wider border border-[var(--theme-border)]">
                  {q.question_type === 'multiple_choice' ? 'Pilihan Ganda' : 'Esai / Teks'}
                </div>

                {q.question_type === 'multiple_choice' && q.options && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {q.options.map((opt, oIdx) => (
                      <div key={opt.id} className={`flex items-start gap-3 p-3 rounded-xl border ${opt.is_correct ? 'bg-[var(--theme-success-light)] border-[var(--theme-success-light)] text-[var(--theme-success)] font-bold' : 'bg-[var(--theme-bg)] border-[var(--theme-border-muted)] text-[var(--theme-text-muted)] font-semibold'}`}>
                        <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold flex-shrink-0 ${opt.is_correct ? 'bg-[var(--theme-success)] text-white' : 'bg-[var(--theme-border)] text-[var(--theme-text-muted)]'}`}>
                          {String.fromCharCode(65 + oIdx)}
                        </div>
                        <span className="text-xs pt-0.5 leading-relaxed">{opt.option_text}</span>
                        {opt.is_correct && (
                          <svg className="w-4 h-4 text-[var(--theme-success)] ml-auto flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};

export default QuizBuilder;
