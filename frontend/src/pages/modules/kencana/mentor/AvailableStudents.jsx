import React, { useState, useMemo } from 'react';
import { useMentorAvailableStudentsQuery, useMentorInviteMutation } from '@/queries/useKencanaMentorQuery';
import { PageHeader } from '@/components/ui/page/PageHeader';
import DataTable from '@/components/ui/DataTable';

const AvailableStudents = () => {
  const { data: available, isLoading } = useMentorAvailableStudentsQuery();
  const inviteMutation = useMentorInviteMutation();
  const [selected, setSelected] = useState([]);
  const [message, setMessage] = useState('');

  const rows = Array.isArray(available) ? available : [];

  // Extract unique fakultas for the dropdown
  const uniqueFakultas = useMemo(() => {
    const list = rows.map(r => r.fakultas).filter(Boolean);
    return [...new Set(list)].sort();
  }, [rows]);

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleInvite = () => {
    if(selected.length === 0) return;
    setMessage('');
    inviteMutation.mutate({ student_ids: selected }, {
      onSuccess: (res) => {
        setSelected([]);
        setMessage(res?.message || 'Undangan berhasil dikirim. Menunggu konfirmasi mahasiswa.');
      },
      onError: (err) => setMessage(err?.response?.data?.message || 'Gagal mengirim undangan.')
    });
  };

  const columns = [
    {
      key: 'select',
      label: '',
      sortable: false,
      render: (_, row) => (
        <input 
          type="checkbox" 
          checked={selected.includes(row.id)} 
          disabled={row.already_has_mentor === 'true'}
          onChange={(e) => {
            e.stopPropagation();
            toggleSelect(row.id);
          }}
          className="w-4 h-4 text-[var(--theme-primary)] rounded border-[var(--theme-border)] focus:ring-[var(--theme-primary)] disabled:cursor-not-allowed disabled:opacity-40"
        />
      )
    },
    { key: 'nim', label: 'NIM', sortable: true, render: (val) => <span className="font-bold text-[var(--theme-primary)]">{val}</span> },
    { key: 'nama', label: 'Nama Mahasiswa', sortable: true, render: (_, row) => <span className="font-bold text-[var(--theme-text)]">{row.nama || row.name}</span> },
    { key: 'fakultas', label: 'Fakultas / Prodi', sortable: true, render: (_, row) => (
      <div className="flex flex-col">
        <span className="text-[var(--theme-text)] font-semibold">{row.fakultas || '-'}</span>
        <span className="text-[10px] text-[var(--theme-text-muted)] font-bold uppercase mt-0.5">{row.program_studi || '-'}</span>
      </div>
    )},
    { key: 'already_has_mentor', label: 'Status', sortable: true, render: (hasMentor, row) => (
      hasMentor === 'true' ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-warning-light)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-warning)] border border-[var(--theme-warning-light)]">
          <span className="material-symbols-outlined text-[12px]">lock</span>
          Mentor: {row.mentor_name || 'Menunggu'}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--theme-success-light)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--theme-success)] border border-[var(--theme-success-light)]">
           Tersedia
        </span>
      )
    )}
  ];

  const filters = [
    {
      key: 'already_has_mentor',
      placeholder: 'Status Mentor',
      options: [
        { label: 'Belum Punya Mentor', value: 'false' },
        { label: 'Sudah Punya Mentor', value: 'true' }
      ]
    },
    {
      key: 'fakultas',
      placeholder: 'Fakultas',
      options: uniqueFakultas.map(f => ({ label: f, value: f }))
    }
  ];

  // DataTable uses exact string matching for filters
  const formattedRows = rows.map(r => ({
    ...r,
    nama: r.nama || r.name,
    already_has_mentor: r.already_has_mentor ? 'true' : 'false'
  }));

  const toolbarActions = (
    <button 
      onClick={handleInvite}
      disabled={selected.length === 0 || inviteMutation.isPending}
      className="h-9 px-4 rounded-lg bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white text-xs font-bold shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-[16px]">person_add</span>
      {inviteMutation.isPending ? 'Mengundang...' : `Undang (${selected.length})`}
    </button>
  );

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">
      <PageHeader
        icon="person_search"
        title={
          <>
            <span className="text-[var(--theme-text)]">Cari </span>
            <span className="text-[var(--theme-primary)]">Mahasiswa</span>
          </>
        }
        subtitle="Pilih mahasiswa untuk diundang sebagai bimbingan Anda."
        breadcrumbs={[
          { label: 'Kencana Mentor', path: '/app/kencana/mentor/groups' },
          { label: 'Cari Mahasiswa' }
        ]}
      />

      {message && <p className="rounded-xl bg-[var(--theme-primary-light)] p-4 text-sm font-bold text-[var(--theme-primary)] border border-[var(--theme-primary-light)]">{message}</p>}

      <DataTable
        title="Daftar Mahasiswa Kencana"
        subtitle="Pilih mahasiswa yang tersedia untuk diundang ke kelompok."
        data={formattedRows}
        columns={columns}
        loading={isLoading}
        searchable={true}
        searchPlaceholder="Cari NIM, Nama..."
        filters={filters}
        toolbarActions={toolbarActions}
        pagination={true}
        pageSize={10}
        emptyMessage="Tidak ada mahasiswa yang tersedia untuk diundang saat ini."
      />
    </div>
  );
};

export default AvailableStudents;
