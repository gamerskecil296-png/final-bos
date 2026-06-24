import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { useKencanaHandbookQuery, useSaveHandbookDraftMutation, useSubmitHandbookMutation } from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, PrimaryButton, StatusBadge } from './components';

export default function KencanaHandbookPage() {
  const { data, isLoading, isError } = useKencanaHandbookQuery();
  const saveDraft = useSaveHandbookDraftMutation();
  const submit = useSubmitHandbookMutation();
  const [form, setForm] = useState({ refleksi: '', komitmen: '', rencana: '' });
  useEffect(() => {
    if (data?.content_json) {
      let content = {};
      try {
        content = typeof data.content_json === 'string' ? JSON.parse(data.content_json || '{}') : data.content_json;
      } catch {
        content = {};
      }
      setForm({ refleksi: content.refleksi || '', komitmen: content.komitmen || '', rencana: content.rencana || '' });
    }
  }, [data]);
  if (isLoading) return <KencanaShell title="Handbook"><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Handbook"><ErrorPanel message="Gagal memuat handbook." /></KencanaShell>;
  const action = (mutation, msg) => mutation.mutate(form, { onSuccess: () => toast.success(msg) });
  return (
    <KencanaShell title="Handbook Mahasiswa" subtitle="Handbook wajib diisi dan disetujui agar bisa lulus penuh.">
      <section className="grid gap-5 lg:grid-cols-[1fr_0.45fr]">
        <div className="glass-card p-6 shadow-sm space-y-4">
          <Field label="Refleksi Kencana" value={form.refleksi} onChange={(v) => setForm({ ...form, refleksi: v })} />
          <Field label="Komitmen Mahasiswa" value={form.komitmen} onChange={(v) => setForm({ ...form, komitmen: v })} />
          <Field label="Rencana Pengembangan Diri" value={form.rencana} onChange={(v) => setForm({ ...form, rencana: v })} />
          <div className="flex flex-wrap gap-3"><PrimaryButton onClick={() => action(saveDraft, 'Draft handbook disimpan')}>Simpan Draft</PrimaryButton><PrimaryButton onClick={() => action(submit, 'Handbook dikirim')}>Submit Handbook</PrimaryButton></div>
        </div>
        <aside className="glass-card p-6 shadow-sm">
          <h2 className="text-xl font-bold font-headline text-slate-800">Status Handbook</h2>
          <div className="mt-4"><StatusBadge status={data?.status} /></div>
          {data?.feedback && <p className="mt-4 rounded-xl bg-[var(--theme-warning)]/10 p-4 text-sm font-bold text-[var(--theme-warning)]">{data.feedback}</p>}
        </aside>
      </section>
    </KencanaShell>
  );
}

function Field({ label, value, onChange }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span><textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium outline-none focus:border-[var(--theme-primary)] transition-colors" /></label>; }
