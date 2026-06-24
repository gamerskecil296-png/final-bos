import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import {
  useMentorSessionsQuery,
  useMentorGetSessionAttendanceQuery,
  useMentorSubmitSessionAttendanceMutation,
} from '@/queries/useKencanaMentorQuery';

const MentorAttendanceModal = ({ isOpen, onClose, group }) => {
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [attendances, setAttendances] = useState({});

  const { data: sessions, isLoading: sessionsLoading } = useMentorSessionsQuery();
  const { data: attendanceData, isLoading: attendanceLoading } = useMentorGetSessionAttendanceQuery(selectedSessionId);
  const submitAttendance = useMentorSubmitSessionAttendanceMutation();

  useEffect(() => {
    if (selectedSessionId && attendanceData && group?.members) {
      const initialAttendances = {};
      group.members.forEach(m => {
        if (m.status === 'active') {
          const existing = attendanceData.find(a => a.student_id === m.student_id);
          initialAttendances[m.student_id] = existing ? existing.status : 'absent';
        }
      });
      setAttendances(initialAttendances);
    }
  }, [selectedSessionId, attendanceData, group]);

  const handleStatusChange = (studentId, status) => {
    setAttendances(prev => ({ ...prev, [studentId]: status }));
  };

  const handleSave = () => {
    if (!selectedSessionId) {
      toast.error('Pilih sesi terlebih dahulu');
      return;
    }
    const payload = Object.entries(attendances).map(([studentId, status]) => ({
      student_id: parseInt(studentId),
      status
    }));

    submitAttendance.mutate(
      { sessionId: selectedSessionId, attendances: payload },
      {
        onSuccess: () => {
          toast.success('Absensi berhasil disimpan');
          onClose();
        },
        onError: () => {
          toast.error('Gagal menyimpan absensi');
        }
      }
    );
  };

  if (!isOpen) return null;

  const activeMembers = group?.members?.filter(m => m.status === 'active') || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Kelola Presensi Kelompok</h2>
            <p className="text-sm text-slate-500 font-semibold">{group?.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Sesi Kencana</label>
            {sessionsLoading ? (
              <div className="text-sm font-bold text-slate-500">Memuat sesi...</div>
            ) : (
              <select
                className="w-full h-11 px-4 rounded-xl border border-slate-300 focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary)]/20 outline-none text-sm font-bold text-slate-700"
                value={selectedSessionId}
                onChange={e => setSelectedSessionId(e.target.value)}
              >
                <option value="">-- Pilih Sesi --</option>
                {sessions?.map(s => (
                  <option key={s.id} value={s.id}>{s.title}</option>
                ))}
              </select>
            )}
          </div>

          {selectedSessionId && (
            <div>
              <h3 className="text-sm font-bold text-slate-800 mb-3">Daftar Anggota Aktif</h3>
              {attendanceLoading ? (
                <div className="text-sm font-bold text-slate-500 text-center py-8">Memuat data absensi...</div>
              ) : activeMembers.length === 0 ? (
                <div className="text-sm font-bold text-slate-500 text-center py-8">Belum ada anggota kelompok yang aktif.</div>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        <th className="py-3 px-4 text-xs font-bold text-slate-500">NIM / Nama</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 text-center w-24">Hadir</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 text-center w-24">Izin</th>
                        <th className="py-3 px-4 text-xs font-bold text-slate-500 text-center w-24">Alpa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeMembers.map(member => (
                        <tr key={member.student_id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4">
                            <p className="font-bold text-slate-800 text-sm">{member.student?.nama}</p>
                            <p className="text-xs text-slate-500 font-semibold">{member.student?.nim}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input 
                              type="radio" 
                              name={`att_${member.student_id}`}
                              checked={attendances[member.student_id] === 'present'}
                              onChange={() => handleStatusChange(member.student_id, 'present')}
                              className="w-4 h-4 text-[var(--theme-primary)] focus:ring-[var(--theme-primary)]"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input 
                              type="radio" 
                              name={`att_${member.student_id}`}
                              checked={attendances[member.student_id] === 'permission'}
                              onChange={() => handleStatusChange(member.student_id, 'permission')}
                              className="w-4 h-4 text-orange-500 focus:ring-orange-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input 
                              type="radio" 
                              name={`att_${member.student_id}`}
                              checked={attendances[member.student_id] === 'absent'}
                              onChange={() => handleStatusChange(member.student_id, 'absent')}
                              className="w-4 h-4 text-red-500 focus:ring-red-500"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-200 transition-colors"
          >
            Batal
          </button>
          <button 
            onClick={handleSave}
            disabled={!selectedSessionId || submitAttendance.isPending}
            className="px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {submitAttendance.isPending && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
            Simpan Absensi
          </button>
        </div>
      </div>
    </div>
  );
};

export default MentorAttendanceModal;
