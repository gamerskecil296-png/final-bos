import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateGroupMutation,
  useDeleteGroupMutation,
  useFakultasListQuery,
  useGroupsQuery,
  useMentorsQuery,
  usePeriodsQuery,
  useUpdateGroupMutation,
  useParticipantsQuery,
  useAddGroupMembersMutation,
  useRemoveGroupMemberMutation,
  useGroupQuery,
} from '@/queries/useKencanaAdminQuery';
import useAuthStore from '@/store/useAuthStore';
import { DashboardHero } from '@/components/ui/dashboard';
import { SelectField, SelectOption } from '@/components/ui/SelectField';
import { getKencanaInitialFakultas } from '@/utils/kencanaFilters';
import { UserInfoCell, TitleSubtitleCell } from '@/components/ui/TableCells';
import { DialogModal } from '@/components/ui/DialogModal';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/Command';
import { Check, ChevronsUpDown, Users, SquarePen, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DataTable } from '@/components/ui/DataTable';
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal';
import { Card, CardContent } from '@/components/ui/Card';

const emptyForm = { group_number: '', name: '', code: '', description: '', scope_type: 'university', fakultas_id: '', mentor_id: '', capacity: 30, status: 'active' };

const Groups = ({ portal: propPortal, facultyId: propFacultyId }) => {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  const role = String(user?.role || '').toLowerCase();
  const isFacultyScoped = propPortal === 'fakultas' || role === 'kencana_fakultas';
  const portal = propPortal || (isFacultyScoped ? 'fakultas' : 'admin');
  const isSuperAdmin = role === 'super_admin' || role === 'kencana_admin';
  const userFacultyId = user?.fakultas_id || user?.FakultasID || '';
  const basePath = window.location.pathname.startsWith('/kencana-fakultas') ? '/kencana-fakultas' : window.location.pathname.startsWith('/kencana-fakult') ? '/kencana-fakult' : '/app/kencana/dashboard';

  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [selectedFacultyFilter, setSelectedFacultyFilter] = useState(() => getKencanaInitialFakultas(role, isFacultyScoped, user?.fakultas_id));

  useEffect(() => {
    const handleFilterChange = (e) => {
      const { fakultasId } = e.detail;
      setSelectedFacultyFilter(fakultasId);
    };

    window.addEventListener('kencana-filter-changed', handleFilterChange);
    return () => window.removeEventListener('kencana-filter-changed', handleFilterChange);
  }, []);
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const [mentorSearch, setMentorSearch] = useState('');
  const [openMentorSelect, setOpenMentorSelect] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: periods } = usePeriodsQuery();
  const { data: faculties } = useFakultasListQuery();
  const { data: mentors } = useMentorsQuery(portal);
  const { data: groups, isLoading } = useGroupsQuery({ 
    period_id: selectedPeriodId, 
    search, 
    scope_type: isFacultyScoped ? 'faculty' : scopeFilter,
    fakultas_id: selectedFacultyFilter === 'all' ? undefined : selectedFacultyFilter
  }, portal);
  const createGroup = useCreateGroupMutation(portal);
  const updateGroup = useUpdateGroupMutation(portal);
  const deleteGroup = useDeleteGroupMutation(portal);

  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedGroupForMembers, setSelectedGroupForMembers] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);

  const { data: selectedGroupDetails, isLoading: isLoadingGroupDetails } = useGroupQuery(selectedGroupForMembers?.id, portal);
  const { data: participantsRes } = useParticipantsQuery({
    limit: 500,
    search: studentSearch,
    ...(selectedGroupDetails?.period_id && { period_id: selectedGroupDetails.period_id }),
    ...((isFacultyScoped ? (selectedFacultyFilter || userFacultyId) : selectedGroupDetails?.fakultas_id) && { fakultas_id: isFacultyScoped ? (selectedFacultyFilter || userFacultyId) : selectedGroupDetails?.fakultas_id })
  });

  const addMembers = useAddGroupMembersMutation(portal);
  const removeMember = useRemoveGroupMemberMutation(portal);

  const memberStudentIds = useMemo(() => new Set((selectedGroupDetails?.members || []).map(m => Number(m.student_id))), [selectedGroupDetails]);
  const availableStudents = useMemo(() => {
    const rows = Array.isArray(participantsRes?.data) ? participantsRes.data : [];
    return rows.filter(s => !memberStudentIds.has(Number(s.id)));
  }, [participantsRes, memberStudentIds]);

  const toggleStudent = (studentId) => {
    setSelectedStudentIds(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  };

  const submitMembers = () => {
    if (!selectedStudentIds.length || !selectedGroupForMembers) return;
    addMembers.mutate({ groupId: selectedGroupForMembers.id, student_ids: selectedStudentIds.map(Number) }, {
      onSuccess: () => {
        setSelectedStudentIds([]);
        // Optional: refresh groups query to update member count
      }
    });
  };

  const openMembersModal = (group) => {
    setSelectedGroupForMembers(group);
    setStudentSearch('');
    setSelectedStudentIds([]);
    setShowMembersModal(true);
  };

  const periodsList = Array.isArray(periods) ? periods : [];
  useEffect(() => {
    if (!selectedPeriodId && periodsList.length) {
      const active = periodsList.find(p => p.status === 'active' || p.status === 'published') || periodsList[0];
      setSelectedPeriodId(String(active.id));
    }
  }, [periodsList, selectedPeriodId]);

  useEffect(() => {
    if (propFacultyId && String(selectedFacultyFilter) !== String(propFacultyId)) {
      setSelectedFacultyFilter(propFacultyId);
    }
  }, [propFacultyId]);

  const filteredGroups = useMemo(() => {
    if (!groups) return [];
    if (isFacultyScoped) {
      const activeId = isSuperAdmin ? selectedFacultyFilter : userFacultyId;
      if (activeId) {
        return groups.filter(g => String(g.fakultas_id) === String(activeId));
      }
      return [];
    }
    return groups;
  }, [groups, isFacultyScoped, isSuperAdmin, selectedFacultyFilter, userFacultyId]);

  const mentorOptions = useMemo(() => {
    const scope = isFacultyScoped ? 'faculty' : form.scope_type;
    return (mentors || []).filter(m => {
      if (scope && m.scope_type !== scope && m.scope_type) return false;
      if (scope === 'faculty') {
        const activeId = isSuperAdmin ? selectedFacultyFilter : userFacultyId;
        if (activeId && String(m.fakultas_id) !== String(activeId)) return false;
      }
      return true;
    });
  }, [mentors, form.scope_type, isFacultyScoped, isSuperAdmin, selectedFacultyFilter, userFacultyId]);

  const openCreate = () => {
    setEditingGroup(null);
    setForm({ ...emptyForm, scope_type: isFacultyScoped ? 'faculty' : 'university', fakultas_id: isFacultyScoped ? (selectedFacultyFilter || userFacultyId || '') : '' });
    setMentorSearch('');
    setOpenMentorSelect(false);
    setShowForm(true);
  };

  const openEdit = (group) => {
    setEditingGroup(group);
    setForm({
      group_number: group.group_number || '', name: group.name || '', code: group.code || '', description: group.description || '', scope_type: group.scope_type || 'university',
      fakultas_id: group.fakultas_id || '', mentor_id: group.mentor_id || '', capacity: group.capacity || 30, status: group.status || 'active',
    });
    const mentor = (mentors || []).find(m => String(m.id) === String(group.mentor_id));
    setMentorSearch(mentor ? mentor.name : '');
    setOpenMentorSelect(false);
    setShowForm(true);
  };

  const saveGroup = (e) => {
    e.preventDefault();
    const payload = { ...form, period_id: Number(selectedPeriodId), capacity: Number(form.capacity), mentor_id: form.mentor_id ? Number(form.mentor_id) : null, fakultas_id: form.fakultas_id ? Number(form.fakultas_id) : null };
    if (editingGroup) {
      payload.group_number = form.group_number ? Number(form.group_number) : editingGroup.group_number;
    }
    if (payload.scope_type === 'university') payload.fakultas_id = null;
    const mutation = editingGroup ? updateGroup : createGroup;
    mutation.mutate(editingGroup ? { id: editingGroup.id, ...payload } : payload, { onSuccess: () => setShowForm(false) });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    deleteGroup.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        setIsDeleting(false);
      },
      onError: () => {
        setIsDeleting(false);
      }
    });
  };



  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">

      {/* Page Header */}
      <DashboardHero
        icon="groups"
        title="Kelola"
        highlightedTitle="Kelompok & DP"
        subtitle="Buat kelompok orientasi, pasangkan mentor pendamping (DP), dan masukkan banyak mahasiswa ke dalam kelompok."
        actions={
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-stretch sm:items-center">
            <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20 backdrop-blur-md">
              <span className="text-xs font-bold text-white whitespace-nowrap">Periode:</span>
              <SelectField
                value={selectedPeriodId}
                onValueChange={setSelectedPeriodId}
                placeholder="Pilih Periode..."
                className="min-w-[160px] h-8 bg-white/90 border-0"
              >
                {periodsList.map(p => (
                  <SelectOption key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectOption>
                ))}
              </SelectField>
            </div>
            <button
              onClick={openCreate}
              disabled={!selectedPeriodId}
              className="h-9 px-5 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-[11px] font-bold uppercase tracking-widest shadow-md disabled:opacity-50 transition-all active:scale-95 shrink-0 flex items-center justify-center gap-1.5 border-none cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add_circle</span>
              Buat Kelompok
            </button>
          </div>
        }
      />

      <div>
          <div className="flex-1">
            {isLoading ? (
              <div className="py-16 text-center font-bold text-[var(--theme-text-subtle)]">Memuat kelompok...</div>
            ) : (
              <DataTable
                data={groups || []}
                searchable={true}
                searchPlaceholder="Cari nama/kode kelompok..."
                onSearch={(data, searchStr) => {
                  const q = searchStr.toLowerCase();
                  return data.filter(g => (g.name || '').toLowerCase().includes(q) || (g.code || '').toLowerCase().includes(q));
                }}
                filters={[
                  !isFacultyScoped && { key: 'scope_type', placeholder: 'Scope', options: [{ label: 'University', value: 'university' }, { label: 'Fakultas', value: 'faculty' }] }
                ].filter(Boolean)}
                emptyMessage={isFacultyScoped && isSuperAdmin && !selectedFacultyFilter ? 'Pilih fakultas di filter atas untuk melihat kelompok' : 'Belum ada kelompok.'}
                emptyIcon="group_off"
                columns={[
                  {
                    key: 'group_number',
                    label: 'Kel.',
                    className: 'w-[80px]',
                    render: (v, item) => <span className="font-bold text-[var(--theme-text)]">{item.group_number || '-'}</span>
                  },
                  {
                    key: 'info',
                    label: 'Informasi Kelompok',
                    className: 'w-[30%]',
                    render: (v, item) => (
                      <div>
                        <p className="text-[13px] font-bold text-[var(--theme-text)] leading-tight">{item.name}</p>
                        {item.code && item.code.toLowerCase() !== item.name.toLowerCase() && (
                          <p className="text-[11px] font-medium text-[var(--theme-text-muted)] mt-1">{item.code}</p>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'mentor',
                    label: 'Mentor/DP',
                    className: 'w-[20%]',
                    render: (v, item) => (
                      <span className="text-[12px] font-bold text-[var(--theme-primary)]">{item.mentor_name || '-'}</span>
                    )
                  },
                  {
                    key: 'stats',
                    label: 'Anggota / Kuota',
                    className: 'w-[15%]',
                    render: (v, item) => (
                      <span className="text-[12px] font-bold text-[var(--theme-text)]">{item.members_count || 0} <span className="text-[var(--theme-text-muted)] font-medium">/ {item.capacity || 0}</span></span>
                    )
                  },
                  {
                    key: 'scope',
                    label: 'Scope',
                    className: 'w-[10%]',
                    render: (v, item) => (
                      <span className="text-[11px] font-bold uppercase text-[var(--theme-text)]">{item.scope_type}</span>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    className: 'w-[10%]',
                    render: (v, item) => (
                      <span className={`px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-wide uppercase ${item.status === 'active' ? 'bg-[var(--theme-success-light)] text-[var(--theme-success)] border-[var(--theme-success-light)]' : item.status === 'completed' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {item.status}
                      </span>
                    )
                  },
                  {
                    key: 'actions',
                    label: 'Aksi',
                    className: 'w-[100px] text-center',
                    cellClassName: 'text-center',
                    sortable: false,
                    render: (_, item) => (
                      <div className="flex justify-center items-center gap-1">
                        <button
                          onClick={() => openMembersModal(item)}
                          title="Anggota"
                          className="p-1.5 rounded-lg text-[var(--theme-primary)] hover:bg-[var(--theme-primary-light)] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Users className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => openEdit(item)}
                          title="Edit"
                          className="p-1.5 rounded-lg text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] hover:bg-[var(--theme-bg)] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <SquarePen className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          title="Hapus"
                          className="p-1.5 rounded-lg text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                        </button>
                      </div>
                    )
                  }
                ]}
              />
            )}
          </div>
      </div>

      {/* Group Create/Edit Modal */}
      <DialogModal
        open={showForm}
        onOpenChange={setShowForm}
        title={editingGroup ? 'Edit Detail Kelompok' : 'Buat Kelompok Baru'}
        subtitle="Silakan tentukan nama kelompok, kuota, dan mentor pembimbing."
        icon={editingGroup ? 'edit_square' : 'group_add'}
        maxWidth="max-w-2xl"
        footer={
          <>
            <button type="button" onClick={() => setShowForm(false)} className="px-5 h-10 rounded-xl border border-[var(--theme-border)] text-xs font-bold uppercase tracking-wider text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] transition-colors">
              Batal
            </button>
            <button type="submit" form="groupForm" className="px-6 h-10 rounded-xl text-xs font-bold uppercase tracking-wider bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-md active:scale-95 transition-all flex items-center gap-2">
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>save</span> Simpan
            </button>
          </>
        }
      >
        <form id="groupForm" onSubmit={saveGroup} className="space-y-4 font-body text-left">
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Nama Kelompok</span>
            <input required value={form.name} onChange={e => {
              const newName = e.target.value;
              const newCode = newName.toUpperCase().replace(/\s+/g, '-').replace(/[^A-Z0-9-]/g, '');
              setForm({ ...form, name: newName, code: newCode });
            }} placeholder="Contoh: Praja" className="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)]" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Kode Kelompok</span>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} placeholder="Contoh: PRAJA-01" className="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)]" />
          </div>
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Deskripsi</span>
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Deskripsi kelompok..." rows="2" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] resize-none" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Scope dropdown removed: Admin Univ will only create University-scoped groups */}
            <div className="space-y-1.5 flex flex-col">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Mentor/DP</span>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama mentor..."
                  value={mentorSearch}
                  onChange={(e) => {
                    setMentorSearch(e.target.value);
                    setForm({ ...form, mentor_id: '' });
                    if (!openMentorSelect) setOpenMentorSelect(true);
                  }}
                  onFocus={() => setOpenMentorSelect(true)}
                  onBlur={() => setTimeout(() => setOpenMentorSelect(false), 200)}
                  className="w-full h-10 pl-4 pr-10 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
                <span className={`material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none transition-transform duration-200 ${openMentorSelect ? 'rotate-180' : ''}`} style={{ fontSize: '20px' }}>
                  expand_more
                </span>

                {openMentorSelect && (
                  <div className="absolute top-full left-0 right-0 mt-2 max-h-[280px] overflow-y-auto bg-white rounded-xl shadow-xl border border-slate-100 z-50 p-2 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setForm({ ...form, mentor_id: '' });
                          setMentorSearch('');
                          setOpenMentorSelect(false);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${form.mentor_id === '' ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : 'text-slate-700 hover:bg-slate-50'}`}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: form.mentor_id === '' ? 1 : 0 }}>check</span>
                        Tanpa Mentor
                      </button>

                      {mentorOptions.filter(m => !mentorSearch || m.name.toLowerCase().includes(mentorSearch.toLowerCase()) || (m.nim && m.nim.toLowerCase().includes(mentorSearch.toLowerCase()))).map(m => (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            setForm({
                              ...form,
                              mentor_id: String(m.id),
                              fakultas_id: m.fakultas_id ? String(m.fakultas_id) : form.fakultas_id,
                              scope_type: m.fakultas_id ? 'faculty' : form.scope_type
                            });
                            setMentorSearch(m.name);
                            setOpenMentorSelect(false);
                          }}
                          className={`w-full text-left p-2.5 rounded-lg text-sm font-bold transition-colors flex items-center gap-2 ${form.mentor_id === String(m.id) ? 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)]' : 'text-slate-700 hover:bg-slate-50'}`}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: form.mentor_id === String(m.id) ? 1 : 0 }}>check</span>
                          <div className="flex flex-col">
                            <span>{m.name}</span>
                            <span className="text-[11px] font-semibold text-slate-400 -mt-0.5">{m.nim}</span>
                          </div>
                        </button>
                      ))}

                      {mentorSearch && mentorOptions.filter(m => m.name.toLowerCase().includes(mentorSearch.toLowerCase()) || (m.nim && m.nim.toLowerCase().includes(mentorSearch.toLowerCase()))).length === 0 && (
                        <div className="py-4 text-center text-sm font-medium text-slate-500">Mentor tidak ditemukan.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Kuota</span>
              <input type="number" min="1" value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} className="w-full h-10 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)]" />
            </div>
          </div>

          {((!isFacultyScoped && form.scope_type === 'faculty') || isFacultyScoped) && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Fakultas</span>
              <SelectField
                value={form.fakultas_id}
                onValueChange={(val) => setForm({ ...form, fakultas_id: val })}
                className="w-full"
                disabled={!!form.mentor_id || isFacultyScoped}
              >
                <SelectOption value="">Pilih Fakultas</SelectOption>
                {faculties?.map(f => (
                  <SelectOption key={f.id} value={String(f.id)}>{f.nama || f.Nama}</SelectOption>
                ))}
              </SelectField>
            </div>
          )}

          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider pl-1">Status Keaktifan</span>
            <SelectField
              value={form.status}
              onValueChange={(val) => setForm({ ...form, status: val })}
              className="w-full"
            >
              <SelectOption value="active">Aktif</SelectOption>
              <SelectOption value="inactive">Nonaktif</SelectOption>
              <SelectOption value="completed">Selesai</SelectOption>
            </SelectField>
          </div>
        </form>
      </DialogModal>

      {/* Members Modal */}
      <DialogModal
        open={showMembersModal}
        onOpenChange={setShowMembersModal}
        title={`Anggota ${selectedGroupForMembers?.name || 'Kelompok'}`}
        subtitle="Kelola mahasiswa yang tergabung dalam kelompok ini."
        icon="groups"
        className="max-w-4xl"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Members List */}
          <div className="border border-[var(--theme-border)] rounded-2xl overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-4 bg-[var(--theme-bg)] border-b border-[var(--theme-border)]">
              <h3 className="text-sm font-bold text-[var(--theme-text)]">Anggota Saat Ini ({selectedGroupDetails?.members?.length || 0})</h3>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar bg-white">
              {isLoadingGroupDetails ? (
                <div className="p-8 text-center text-[var(--theme-text-subtle)] text-xs font-bold">Memuat...</div>
              ) : selectedGroupDetails?.members?.length ? (
                <div className="divide-y divide-[var(--theme-border-muted)]">
                  {selectedGroupDetails.members.map(member => (
                    <div key={member.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <UserInfoCell name={member.student?.nama} subtitle={member.student?.nim} avatarUrl={member.student?.foto_url || member.student?.foto} />
                      <button
                        onClick={() => removeMember.mutate({ groupId: selectedGroupForMembers.id, studentId: member.student_id })}
                        title="Keluarkan"
                        className="p-1.5 rounded-lg text-[var(--theme-error)] hover:bg-[var(--theme-error-light)] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-[var(--theme-text-subtle)] text-xs font-bold">Belum ada anggota.</div>
              )}
            </div>
          </div>

          {/* Add Members */}
          <div className="border border-[var(--theme-border)] rounded-2xl overflow-hidden flex flex-col max-h-[500px]">
            <div className="p-4 bg-[var(--theme-bg)] border-b border-[var(--theme-border)]">
              <h3 className="text-sm font-bold text-[var(--theme-text)]">Tambah Mahasiswa</h3>
              <div className="mt-3 relative">
                <input
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  placeholder="Cari nama atau NIM..."
                  className="w-full h-9 pl-9 pr-4 rounded-xl border border-[var(--theme-border)] text-xs font-semibold focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] outline-none"
                />
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[var(--theme-text-muted)] pointer-events-none">search</span>
              </div>
            </div>
            <div className="overflow-y-auto flex-1 custom-scrollbar p-2 bg-white space-y-1">
              {availableStudents.map(student => (
                <label key={student.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-transparent hover:bg-slate-50 cursor-pointer transition-colors group">
                  <input
                    type="checkbox"
                    checked={selectedStudentIds.includes(student.id)}
                    onChange={() => toggleStudent(student.id)}
                    className="rounded text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-[var(--theme-text)] truncate">{student.nama}</p>
                    <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] truncate mt-0.5">{student.nim} • {student.program_studi_name || '-'}</p>
                  </div>
                </label>
              ))}
              {!availableStudents.length && (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <span className="material-symbols-outlined text-3xl text-slate-300 mb-2">person_off</span>
                  <p className="text-xs font-bold text-[var(--theme-text-subtle)]">Tidak ada mahasiswa.</p>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-[var(--theme-border)] bg-white">
              <button
                onClick={submitMembers}
                disabled={!selectedStudentIds.length || addMembers.isPending}
                className="w-full h-10 rounded-xl bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-bold shadow-md disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                Tambah {selectedStudentIds.length > 0 ? selectedStudentIds.length : ''} Mahasiswa
              </button>
            </div>
          </div>
        </div>
      </DialogModal>

      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Hapus Kelompok?"
        description={deleteTarget ? `Apakah Anda yakin ingin menghapus kelompok "${deleteTarget.name}"? Semua data anggota di dalamnya juga akan terhapus dan tidak dapat dikembalikan.` : ''}
        loading={isDeleting}
      />
    </div>
  );
};

export default Groups;
