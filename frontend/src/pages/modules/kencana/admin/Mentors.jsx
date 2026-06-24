import React, { useMemo, useState, useEffect } from 'react';
import useAuthStore from '@/store/useAuthStore';
import { getKencanaInitialFakultas } from '@/utils/kencanaFilters';
import { useCreateMentorMutation, useMentorsQuery, useFakultasListQuery, useDeleteMentorMutation, useSearchStudentsQuery } from '@/queries/useKencanaAdminQuery';
import { DashboardHero } from '@/components/ui/dashboard';
import { Button } from "@/components/ui/Button";
import { DataTable } from '@/components/ui/DataTable';
import { Card, CardContent } from '@/components/ui/Card';
import { UserInfoCell, StatusBadgeCell, ActionButton } from '@/components/ui/TableCells';
import { cn } from "@/lib/utils";
import { DialogModal } from '@/components/ui/DialogModal';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { toast } from 'react-hot-toast';
import { Eye, Trash2 } from 'lucide-react';

const emptyForm = { name: '', email: '', password: '', phone: '', jenis_kelamin: '', scope_type: 'faculty', fakultas_id: '' };

const Mentors = ({ portal = 'admin', facultyId: propFacultyId }) => {
  const user = useAuthStore((state) => state.user);
  const role = String(user?.role || '').toLowerCase();
  const isFakultasPortal = portal === 'fakultas' || portal === 'fakult' || role === 'kencana_fakultas';
  const [form, setForm] = useState(emptyForm);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [openStudentSelect, setOpenStudentSelect] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [detailData, setDetailData] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  
  
  // Table interactivity states
  const [filterScope, setFilterScope] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [fakultasFilter, setFakultasFilter] = useState(() => getKencanaInitialFakultas(role, isFakultasPortal, user?.fakultas_id));

  useEffect(() => {
    const handleFilterChange = (e) => {
      const { fakultasId } = e.detail;
      setFakultasFilter(fakultasId);
    };

    window.addEventListener('kencana-filter-changed', handleFilterChange);
    return () => window.removeEventListener('kencana-filter-changed', handleFilterChange);
  }, []);

  const { data: mentors, isLoading } = useMentorsQuery(portal);
  const createMentor = useCreateMentorMutation(portal);
  const deleteMentor = useDeleteMentorMutation(portal);
  const { data: studentsRes, isLoading: isLoadingStudents } = useSearchStudentsQuery(studentSearchQuery, portal);
  const students = studentsRes || [];

  const { data: faculties } = useFakultasListQuery();

  const userFacultyId = user?.fakultas_id || user?.FakultasID || '';
  const isSuperAdmin = role === 'super_admin' || role === 'kencana_admin';

  useEffect(() => {
    if (propFacultyId && String(form.fakultas_id) !== String(propFacultyId)) {
      setForm(prev => ({ ...prev, fakultas_id: propFacultyId }));
    }
  }, [propFacultyId]);

  const filteredMentors = useMemo(() => {
    if (!mentors) return [];
    if (isFakultasPortal) {
      const activeFacultyId = isSuperAdmin ? fakultasFilter : userFacultyId;
      if (activeFacultyId) {
        return mentors.filter(m => String(m.fakultas_id) === String(activeFacultyId));
      }
      return mentors.filter(m => m.scope_type === 'faculty'); 
    }
    return mentors;
  }, [mentors, isFakultasPortal, isSuperAdmin, fakultasFilter, userFacultyId]);

  const tableData = useMemo(() => {
    let items = [...filteredMentors];
    if (filterScope !== 'all') {
      items = items.filter(m => (m.scope_type || '') === filterScope);
    }
    if (filterStatus !== 'all') {
      items = items.filter(m => (m.status || 'aktif').toLowerCase() === filterStatus.toLowerCase());
    }
    return items;
  }, [filteredMentors, filterScope, filterStatus]);

  const hasPermission = role === 'super_admin' || role === 'kencana_admin' ||
    (isFakultasPortal && (role.includes('fakultas') || role.includes('faculty') || role === 'kencana_fakultas')) ||
    (isFakultasPortal ? user?.permissions?.includes('kencana.faculty.mentor.manage')
                       : user?.permissions?.includes('kencana.mentor.university.manage'));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedStudent) {
      toast.error('Silakan pilih mahasiswa terlebih dahulu.');
      return;
    }
    const payload = {
      user_id: selectedStudent.user_id,
      scope_type: isFakultasPortal ? 'faculty' : 'university',
      fakultas_id: isFakultasPortal ? Number(selectedStudent.fakultas_id || userFacultyId || 0) : 0,
    };

    createMentor.mutate(payload, {
      onSuccess: () => {
        toast.success('Pembimbing berhasil ditambahkan');
        setIsModalOpen(false);
        setForm(emptyForm);
        setSelectedStudent(null);
        setStudentSearchQuery('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Gagal menambahkan pembimbing');
      }
    });
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await deleteMentor.mutateAsync(deleteTargetId);
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      toast.success("Akun Dewan Pembimbing berhasil dihapus.");
    } catch (err) {
      setIsDeleteModalOpen(false);
      setDeleteTargetId(null);
      toast.error(err?.response?.data?.message || 'Gagal menghapus pembimbing.');
    }
  };

  const columns = [
    { 
      key: 'name', 
      label: 'Informasi Pembimbing', 
      className: 'w-[25%] min-w-[200px]',
      render: (v, m) => <UserInfoCell name={m.name || m.Name || `User ID: ${m.user_id}`} subtitle={m.email || m.Email || '-'} avatarUrl={m.foto_url || m.foto} />
    },
    {
      key: 'jenis_kelamin',
      label: 'Jenis Kelamin',
      className: 'w-[15%]',
      render: (v, m) => (
        <span className={m.jenis_kelamin ? 'text-[11px] font-medium text-[var(--theme-text-muted)]' : 'text-[11px] text-[var(--theme-text-muted)] italic font-medium'}>
          {m.jenis_kelamin || 'Belum diisi'}
        </span>
      )
    },
    {
      key: 'phone',
      label: 'No. HP',
      className: 'w-[15%]',
      render: (v, m) => (
        <span className={m.phone ? 'text-[11px] font-medium text-[var(--theme-text-muted)]' : 'text-[11px] text-[var(--theme-text-muted)] italic font-medium'}>
          {m.phone || 'Belum diisi'}
        </span>
      )
    },
    { 
      key: 'scope_type', 
      label: 'Lingkup', 
      className: 'w-[15%]',
      render: (v, m) => {
        const isUni = m.scope_type === 'university';
        let facName = '';
        if (!isUni && m.fakultas_id) {
          const f = faculties?.find(fac => String(fac.id) === String(m.fakultas_id));
          facName = f ? (f.nama || f.Nama) : `ID ${m.fakultas_id}`;
        }
        
        const displayFacName = (facName || '').toUpperCase().includes('FAKULTAS') ? facName : `Fakultas ${facName}`;

        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border border-slate-200 bg-slate-50 text-slate-600">
            {isUni ? 'Universitas' : displayFacName}
          </span>
        );
      }
    },
    { 
      key: 'status', 
      label: 'Status', 
      className: 'w-[15%]',
      render: (v, m) => <StatusBadgeCell status={m.status?.toLowerCase() === 'nonaktif' ? 'error' : 'success'} label={m.status || 'Aktif'} />
    },
    {
      key: 'actions',
      label: 'Aksi',
      sortable: false,
      className: 'w-[100px] text-center',
      cellClassName: 'text-center',
      render: (v, m) => (
        <div className="flex justify-center items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setDetailData(m); setDetailModalOpen(true); }}
            title="Detail"
            className="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-colors flex items-center justify-center cursor-pointer"
          >
            <Eye className="w-4 h-4" strokeWidth={2.5} />
          </button>
          {hasPermission && (
            <button 
              onClick={(e) => { e.stopPropagation(); setDeleteTargetId(m.id || m.ID || m.user_id); setIsDeleteModalOpen(true); }} 
              title="Hapus"
              className="p-1.5 rounded-lg text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] transition-colors flex items-center justify-center cursor-pointer" 
            >
              <Trash2 className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <DashboardHero 
        title="Kelola"
        highlightedTitle="Fasilitator"
        subtitle={isFakultasPortal ? 'Admin fakultas hanya membuat mentor untuk fakultasnya.' : 'Admin universitas hanya membuat mentor lingkup universitas.'}
        icon="groups"
        actions={hasPermission && (
          <button 
            onClick={() => {
              setForm(emptyForm);
              setIsModalOpen(true);
            }}
            className="h-9 px-4 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white font-bold text-[11px] uppercase tracking-wider flex items-center gap-1.5 transition-all border-none shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
            Registrasi Fasilitator
          </button>
        )}
      />

      {!hasPermission && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 md:p-8 shadow-sm">
          <h2 className="text-lg font-headline font-black text-amber-800 mb-2">Akses Dibatasi (Hanya Lihat)</h2>
          <p className="text-sm font-medium text-amber-700 leading-relaxed">
            Anda tidak memiliki izin (permission) untuk membuat atau mengelola mentor baru. Anda hanya dapat melihat daftar mentor yang sudah ada. 
            Jika Anda memerlukan akses ini, silakan hubungi Super Admin untuk mengaktifkannya di panel RBAC.
          </p>
        </div>
      )}

      <div className="mt-6">
          <DataTable
            columns={columns}
            data={tableData}
            loading={isLoading}
            searchPlaceholder="Cari nama atau email mentor..."
            title="Daftar Pembimbing Aktif"
            itemLabel="pembimbing"
            actions={
              <div className="flex items-center gap-2">
                {!isFakultasPortal && (
                  <select
                    value={filterScope}
                    onChange={(e) => setFilterScope(e.target.value)}
                    className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none focus:border-[var(--theme-primary)] transition-all cursor-pointer"
                  >
                    <option value="all">Semua Lingkup</option>
                    <option value="university">Universitas</option>
                    <option value="faculty">Fakultas</option>
                  </select>
                )}

                {/* Hide local faculty filter since it's driven by topbar now */}
                
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-[11px] font-bold text-slate-700 outline-none focus:border-[var(--theme-primary)] transition-all cursor-pointer"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Aktif</option>
                  <option value="nonaktif">Nonaktif</option>
                </select>
              </div>
            }
          />
      </div>

      <DialogModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title="Registrasi Fasilitator"
        subtitle="Lengkapi form di bawah untuk menambahkan akun mentor."
        icon="person_add"
      >
        <form onSubmit={handleSubmit} className={cn("space-y-6 transition-all duration-300", openStudentSelect && !selectedStudent && "pb-[320px]")}>
          <Field label="Cari Mahasiswa (Nama / NIM)">
            <div className="relative">
              <input
                required
                type="text"
                placeholder="Ketik minimal 3 karakter (contoh: 231fk... atau Budi)..."
                value={studentSearchQuery}
                onChange={(e) => {
                  setStudentSearchQuery(e.target.value);
                  setSelectedStudent(null);
                  if (!openStudentSelect) setOpenStudentSelect(true);
                }}
                onFocus={() => setOpenStudentSelect(true)}
                className="w-full h-11 pl-4 pr-11 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-800 !outline-none !ring-0 !shadow-none focus:!border-[var(--theme-primary)] focus:!outline-none focus:!ring-0 focus:!shadow-none transition-all placeholder:text-slate-400 placeholder:font-semibold"
              />
              <span className={`material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform duration-200 ${openStudentSelect ? 'rotate-180' : ''}`} style={{ fontSize: '22px' }}>
                expand_more
              </span>

              {openStudentSelect && studentSearchQuery.length >= 3 && !selectedStudent && (
                <div className="absolute top-full left-0 right-0 mt-2 max-h-[320px] overflow-y-auto bg-white rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] border border-slate-100 z-50 p-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                  {isLoadingStudents ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                      <span className="material-symbols-outlined animate-spin text-[var(--theme-primary)] mb-2" style={{ fontSize: '28px' }}>progress_activity</span>
                      <p className="text-sm font-bold text-slate-600">Mencari mahasiswa...</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Tunggu sebentar ya</p>
                    </div>
                  ) : students?.length > 0 ? (
                    <div className="flex flex-col gap-1">
                      {students.map(s => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setSelectedStudent(s);
                            setStudentSearchQuery(`${s.name} (${s.nim})`);
                            setOpenStudentSelect(false);
                          }}
                          className="w-full text-left p-3 hover:bg-slate-50 rounded-xl transition-all flex items-center gap-3 group"
                        >
                          <div className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-[var(--theme-primary)]/10 group-hover:text-[var(--theme-primary)] transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>person</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-slate-800 text-sm truncate group-hover:text-[var(--theme-primary)] transition-colors">{s.name}</h4>
                            <p className="text-xs font-semibold text-slate-500 truncate mt-0.5">{s.nim} • {s.prodi || s.email}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-3">
                        <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>search_off</span>
                      </div>
                      <p className="text-sm font-bold text-slate-600">Pencarian tidak ditemukan</p>
                      <p className="text-xs font-medium text-slate-400 mt-1">Coba gunakan nama atau NIM yang lain</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Field>

          {selectedStudent && (
            <div className="mt-6 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Sleek Profile Card */}
              <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-primary)]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                
                <div className="flex items-start justify-between relative z-10">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center text-[var(--theme-primary)]">
                      <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-800">{selectedStudent.name}</h3>
                      <p className="text-xs font-bold text-slate-500 mt-0.5">{selectedStudent.nim}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-cyan-50 text-cyan-600 text-[10px] font-black uppercase tracking-wider rounded-lg border border-cyan-100">
                    Kandidat
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-y-5 gap-x-6 mt-6 relative z-10">
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Email Mahasiswa</p>
                    <p className="text-xs font-bold text-slate-700">{selectedStudent.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No. Telepon / WA</p>
                    <p className="text-xs font-bold text-slate-700">{selectedStudent.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fakultas</p>
                    <p className="text-xs font-bold text-slate-700">{selectedStudent.fakultas || '-'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Program Studi</p>
                    <p className="text-xs font-bold text-slate-700">{selectedStudent.prodi || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end mt-8 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setIsModalOpen(false)} className="h-10 px-5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-100 transition-colors">Batal</button>
            <button type="submit" disabled={createMentor.isPending || !selectedStudent} className="h-10 px-6 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-sm font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {createMentor.isPending ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>}
              Simpan Fasilitator
            </button>
          </div>
        </form>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Fasilitator"
        description="Apakah Anda yakin ingin menghapus akun mentor ini? Tindakan ini tidak dapat dibatalkan dan semua data bimbingan yang terkait mungkin akan hilang atau dialihkan."
        loading={deleteMentor.isPending}
      />

      <DialogModal
        open={detailModalOpen}
        onOpenChange={(val) => { setDetailModalOpen(val); if (!val) setDetailData(null); }}
        title="Detail Pembimbing"
        subtitle="Informasi lengkap akun dewan pembimbing Kencana."
        icon="badge"
      >
        {detailData && (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-slate-50 to-white rounded-2xl p-5 border border-slate-200/60 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-primary)]/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
              
              <div className="flex items-start justify-between relative z-10">
                <div className="flex gap-4 items-center">
                  <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/10 flex items-center justify-center text-[var(--theme-primary)]">
                    <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>person</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-800">{detailData.name || detailData.Name}</h3>
                    <p className="text-xs font-bold text-slate-500 mt-0.5">{detailData.email || detailData.Email}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border ${detailData.status?.toLowerCase() === 'nonaktif' ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-emerald-50 text-emerald-600 border-emerald-100'}`}>
                  {detailData.status || 'Aktif'}
                </span>
              </div>
              
              <div className="grid grid-cols-2 gap-y-5 gap-x-6 mt-6 relative z-10">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">NIM Mahasiswa</p>
                  <p className="text-xs font-bold text-slate-700">{detailData.mahasiswa?.nim || detailData.mahasiswa?.NIM || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Program Studi</p>
                  <p className="text-xs font-bold text-slate-700">{detailData.mahasiswa?.ProgramStudi?.nama || detailData.mahasiswa?.ProgramStudi?.Nama || '-'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No. Telepon / WA</p>
                  <p className="text-xs font-bold text-slate-700">{detailData.phone || 'Belum diisi'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Jenis Kelamin</p>
                  <p className="text-xs font-bold text-slate-700">{detailData.jenis_kelamin || 'Belum diisi'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lingkup Akses</p>
                  <p className="text-xs font-bold text-slate-700">{detailData.scope_type === 'university' ? 'Universitas' : (() => {
                    const fName = detailData.fakultas?.nama || detailData.fakultas?.Nama || `(ID: ${detailData.fakultas_id})`;
                    return (fName || '').toUpperCase().includes('FAKULTAS') ? fName : `Fakultas ${fName}`;
                  })()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Mentor / User ID</p>
                  <p className="text-xs font-bold text-slate-700">{detailData.id || detailData.ID} / {detailData.user_id || detailData.UserID}</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button type="button" onClick={() => { setDetailModalOpen(false); setDetailData(null); }} className="h-10 px-6 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-bold transition-all">
                Tutup
              </button>
            </div>
          </div>
        )}
      </DialogModal>
    </div>
  );
};

function Field({ label, children }) {
  return <label className="space-y-2.5"><span className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">{label}</span>{children}</label>;
}

export default Mentors;
