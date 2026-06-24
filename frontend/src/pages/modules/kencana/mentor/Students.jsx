import React from 'react';
import { useMentorStudentsQuery, useMentorRemoveAssignmentMutation } from '@/queries/useKencanaMentorQuery';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/ui/page/PageHeader';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';

const Students = () => {
  const { data: students, isLoading } = useMentorStudentsQuery();
  const removeMutation = useMentorRemoveAssignmentMutation();
  const rows = Array.isArray(students) ? students : [];

  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);
  const [selectedStudentId, setSelectedStudentId] = React.useState(null);

  const handleRemoveClick = (id) => {
    setSelectedStudentId(id);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if(selectedStudentId) {
      removeMutation.mutate(selectedStudentId, {
        onSettled: () => {
          setDeleteModalOpen(false);
          setSelectedStudentId(null);
        }
      });
    }
  };
  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon="group"
        title={
          <>
            <span className="text-[var(--theme-text)]">Mahasiswa </span>
            <span className="text-[var(--theme-primary)]">Bimbingan</span>
          </>
        }
        subtitle="Daftar mahasiswa yang Anda bimbing beserta rincian status bimbingannya."
        breadcrumbs={[
          { label: 'Kencana Mentor', path: '#' },
          { label: 'Daftar Bimbingan' }
        ]}
        action={
          <Link to="/app/kencana/mentor/available" className="h-10 px-5 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-bold transition-all flex items-center justify-center shadow-sm">
            + Tambah Bimbingan
          </Link>
        }
      />

      <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
        <div className="p-6 md:p-8 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]">
          <h2 className="text-base font-bold text-[var(--theme-text)]">Mahasiswa Aktif</h2>
          <p className="text-xs font-semibold text-[var(--theme-text-muted)] mt-1">Daftar lengkap bimbingan beserta NIM, Prodi, dan status verifikasi.</p>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-[var(--theme-text-muted)] font-bold">Memuat data mahasiswa...</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[var(--theme-border)] text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider bg-[var(--theme-bg)]/50">
                  <th className="px-6 py-3 font-semibold">NIM</th>
                  <th className="px-6 py-3 font-semibold">Nama Mahasiswa</th>
                  <th className="px-6 py-3 font-semibold">Program Studi</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--theme-border-muted)]">
                {rows.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-[var(--theme-bg)]/40 transition-colors text-sm font-semibold text-[var(--theme-text)]">
                    <td className="px-6 py-4 font-bold text-[var(--theme-primary)]">{assignment.student?.nim || '-'}</td>
                    <td className="px-6 py-4 text-[var(--theme-text)]">{assignment.student?.nama || '-'}</td>
                    <td className="px-6 py-4 text-[var(--theme-text-muted)]">{assignment.student?.program_studi || '-'}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        assignment.status === 'active' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]' :
                        assignment.status === 'pending' ? 'bg-[var(--theme-warning-light)] text-[var(--theme-warning)] border-[var(--theme-warning-light)]' :
                        'bg-[var(--theme-danger-light)] text-[var(--theme-danger)] border-[var(--theme-danger-light)]'
                      }`}>
                        {assignment.status === 'active' ? 'Disetujui' : 
                         assignment.status === 'pending' ? 'Pending' : 'Ditolak'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right flex items-center justify-end gap-2">
                      {assignment.status === 'active' && (
                        <Link 
                          to={`/app/kencana/mentor/students/${assignment.student_id}`} 
                          className="w-8 h-8 rounded-lg bg-[var(--theme-primary-light)] text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)]/85 transition-colors border border-[var(--theme-primary-light)] flex items-center justify-center"
                          title="Lihat Detail"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>visibility</span>
                        </Link>
                      )}
                      <button 
                        onClick={() => handleRemoveClick(assignment.id)}
                        disabled={removeMutation.isPending}
                        className="w-8 h-8 rounded-lg bg-[var(--theme-danger-light)] text-[var(--theme-danger)] hover:bg-[var(--theme-danger-light)]/85 transition-colors border border-[var(--theme-danger-light)] disabled:opacity-50 flex items-center justify-center"
                        title="Hapus Bimbingan"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-[var(--theme-text-muted)] font-semibold">
                      Anda belum memiliki mahasiswa bimbingan.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Hapus Mahasiswa?"
        description="Mahasiswa ini akan dihapus dari daftar bimbingan Anda. Anda bisa mengundangnya kembali dari daftar mahasiswa yang tersedia jika terjadi kesalahan."
        loading={removeMutation.isPending}
      />
    </div>
  );
};

export default Students;
