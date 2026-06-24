import React, { useState } from 'react';
import toast from 'react-hot-toast';
import { useSubmitStudentAttendanceMutation } from '@/queries/useKencanaQuery';

export default function AbsenceModal({ isOpen, onClose, session }) {
  const [reason, setReason] = useState('');
  const submitAttendance = useSubmitStudentAttendanceMutation();

  if (!isOpen || !session) return null;

  const handleSubmit = () => {
    if (!reason.trim()) {
      toast.error('Alasan izin wajib diisi');
      return;
    }
    submitAttendance.mutate(
      { session_id: session.session_id, status: 'permission', reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success('Permohonan izin berhasil diajukan');
          setReason('');
          onClose();
        },
        onError: () => {
          toast.error('Gagal mengajukan izin');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl flex flex-col">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Ajukan Izin</h2>
            <p className="text-sm text-slate-500 font-semibold mt-1">{session.title}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Alasan Izin</label>
            <textarea
              className="w-full h-28 px-4 py-3 rounded-xl border border-slate-300 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none text-sm font-semibold text-slate-700 resize-none"
              placeholder="Jelaskan alasan ketidakhadiran Anda..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-400 font-semibold">
            Setelah diajukan, mentor akan memeriksa dan menyetujui atau menolak permohonan Anda.
          </p>
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitAttendance.isPending || !reason.trim()}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitAttendance.isPending && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
            Ajukan Izin
          </button>
        </div>
      </div>
    </div>
  );
}