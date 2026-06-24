import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  useKencanaMentorInvitationsQuery, 
  useRespondMentorInvitationMutation,
  useRespondGroupInvitationMutation,
  useKencanaDashboardQuery
} from '@/queries/useKencanaQuery';
import { ErrorPanel, KencanaShell, LoadingPanel, StatusBadge } from './components';

export default function KencanaMentorInvitationsPage() {
  const { data, isLoading, isError } = useKencanaMentorInvitationsQuery();
  const { data: dashboardData } = useKencanaDashboardQuery();
  const respondMentor = useRespondMentorInvitationMutation();
  const respondGroup = useRespondGroupInvitationMutation();
  const [message, setMessage] = useState('');

  if (isLoading) return <KencanaShell title="Undangan" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Undangan Pembimbing' }]}><LoadingPanel /></KencanaShell>;
  if (isError) return <KencanaShell title="Undangan" highlightedTitle="Kencana" breadcrumbs={[{ label: 'Undangan Pembimbing' }]}><ErrorPanel message="Gagal memuat undangan pembimbing." /></KencanaShell>;

  const invitations = data?.invitations || [];
  const groupInvitations = data?.group_invitations || [];
  const activeMentor = data?.active_mentor;
  
  const invitationList = Array.isArray(invitations) ? invitations : [];
  const groupList = Array.isArray(groupInvitations) ? groupInvitations : [];
  
  // The old 1-on-1 invitations
  const facultyInvitations = invitationList.filter((inv) => (inv.mentor?.scope_type || inv.Mentor?.ScopeType) === 'faculty');
  const oldUniversityInvitations = invitationList.filter((inv) => (inv.mentor?.scope_type || inv.Mentor?.ScopeType) === 'university');

  const universityGroupList = groupList.filter(inv => (inv.group?.scope_type || inv.Group?.ScopeType) === 'university');
  const facultyGroupList = groupList.filter(inv => (inv.group?.scope_type || inv.Group?.ScopeType) === 'faculty');

  const handleRespondMentor = async (id, action) => {
    setMessage('');
    try {
      await respondMentor.mutateAsync({ id, action });
      setMessage(action === 'accept' ? 'Undangan diterima. Dewan Pembimbing sudah aktif.' : 'Undangan ditolak.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Gagal memperbarui undangan.');
    }
  };

  const handleRespondGroup = async (id, action) => {
    setMessage('');
    try {
      await respondGroup.mutateAsync({ id, action });
      setMessage(action === 'accept' ? 'Berhasil bergabung dengan kelompok.' : 'Undangan kelompok ditolak.');
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Gagal memperbarui undangan kelompok.');
    }
  };

  const combinedUniversityInvitations = [
    ...universityGroupList.map(inv => ({ ...inv, _type: 'group' })),
    ...oldUniversityInvitations.map(inv => ({ 
       ...inv, 
       _type: 'mentor',
       group: {
         name: 'Personal (Lama)',
         code: '-',
         mentor: inv.mentor || inv.Mentor || {}
       }
    }))
  ];

  const handleRespondCombined = (id, action, type) => {
    if (type === 'group') return handleRespondGroup(id, action);
    return handleRespondMentor(id, action);
  };

  const pendingCount = [
    ...combinedUniversityInvitations,
    ...facultyGroupList,
    ...facultyInvitations
  ].filter(i => (i.status || i.Status) === 'pending').length;

  return (
    <KencanaShell 
      title="Undangan" 
      highlightedTitle="Kencana"
      subtitle="Konfirmasi undangan sebelum bergabung dengan kelompok atau Dewan Pembimbing aktif." 
      breadcrumbs={[{ label: 'Undangan Pembimbing' }]}
      badges={[
        { label: dashboardData?.period?.name || 'Kencana', active: false },
        { label: `Status: ${dashboardData?.graduation_status?.replaceAll('_', ' ') || 'Belum Mulai'}`, active: true }
      ]}
      actions={
        <div className="glass-card flex items-center gap-6 p-4 md:p-6 border border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-sm rounded-2xl">
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Menunggu Konfirmasi</span>
            <span className={`text-3xl font-bold font-headline tracking-tight tabular-nums leading-none ${pendingCount > 0 ? 'text-[var(--theme-primary)]' : 'text-[var(--theme-text)]'}`}>
              {pendingCount}
            </span>
          </div>
          <div className={`size-14 rounded-2xl flex items-center justify-center shadow-md border-none ${pendingCount > 0 ? 'bg-[var(--theme-primary)] text-white' : 'bg-[var(--theme-border)] text-[var(--theme-text-muted)] shadow-none'}`}>
            <span className={`material-symbols-outlined ${pendingCount > 0 ? 'animate-pulse' : ''}`} style={{ fontSize: '28px' }} strokeWidth={2.5}>mark_email_unread</span>
          </div>
        </div>
      }
    >
      {activeMentor && (
        <section className="mb-6 rounded-2xl border border-[var(--theme-success)]/30 bg-[var(--theme-success)]/5 p-6 shadow-sm flex flex-col md:flex-row items-start gap-5">
          <div className="w-14 h-14 rounded-full bg-[var(--theme-success)]/10 text-[var(--theme-success)] flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>verified_user</span>
          </div>
          <div>
            <p className="text-[10px] font-black font-headline uppercase tracking-widest text-[var(--theme-success)] mb-1">Dewan Pembimbing Aktif (Personal Lama)</p>
            <h2 className="text-2xl font-bold font-headline text-[var(--theme-text)]">{activeMentor.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm font-medium text-[var(--theme-text-muted)]">
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">mail</span> {activeMentor.email || '-'}</span>
              {activeMentor.phone && <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-[16px]">call</span> {activeMentor.phone}</span>}
            </div>
          </div>
        </section>
      )}

      {message && (
        <div className={`mb-6 flex items-center gap-3 rounded-xl border p-4 shadow-sm text-[var(--theme-text)] ${message.toLowerCase().includes('gagal') || message.toLowerCase().includes('ditolak') ? 'border-[var(--theme-error)]/30 bg-[var(--theme-error)]/10' : 'border-[var(--theme-success)]/30 bg-[var(--theme-success)]/10'}`}>
          <span className={`material-symbols-outlined text-xl ${message.toLowerCase().includes('gagal') || message.toLowerCase().includes('ditolak') ? 'text-[var(--theme-error)]' : 'text-[var(--theme-success)]'}`}>
            {message.toLowerCase().includes('gagal') || message.toLowerCase().includes('ditolak') ? 'error' : 'check_circle'}
          </span>
          <p className="text-sm font-bold">{message}</p>
        </div>
      )}

      <GroupInvitationSection 
        title="Undangan DP Kencana Universitas" 
        description="Undangan bergabung dengan Dewan Pembimbing tingkat universitas." 
        items={combinedUniversityInvitations} 
        hasActive={combinedUniversityInvitations.some(i => i.status === 'active' || i.Status === 'active')}
        respond={respondGroup.isPending || respondMentor.isPending ? { isPending: true } : { isPending: false }} 
        handleRespond={handleRespondCombined} 
      />

      <GroupInvitationSection 
        title="Undangan Kelompok DP Kencana Fakultas" 
        description="Undangan bergabung ke dalam kelompok Dewan Pembimbing khusus fakultas." 
        items={facultyGroupList} 
        hasActive={facultyGroupList.some(i => i.status === 'active' || i.Status === 'active')}
        respond={respondGroup} 
        handleRespond={(id, action) => handleRespondGroup(id, action)} 
      />

      <InvitationSection 
        title="Undangan DP Kencana Fakultas (1-on-1)" 
        description="Undangan dari Dewan Pembimbing khusus fakultas kamu (Format Lama)." 
        items={facultyInvitations} 
        activeMentor={activeMentor} 
        respond={respondMentor} 
        handleRespond={handleRespondMentor} 
      />

      {(!invitationList.length && !groupList.length) && (
        <div className="text-center py-12 glass-card !border-2 !border-dashed !border-slate-200 !bg-slate-50">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">inbox</span>
          <p className="text-slate-400 font-bold font-headline">Belum ada undangan Dewan Pembimbing.</p>
        </div>
      )}
    </KencanaShell>
  );
}



function GroupInvitationSection({ title, description, items, hasActive, respond, handleRespond }) {
  const [expandedId, setExpandedId] = React.useState(null);

  if (!items.length) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] rounded-xl flex justify-center items-center">
          <span className="material-symbols-outlined text-[24px]">groups</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">{description}</span>
          <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">{title}</h3>
        </div>
      </div>
      <div className="grid gap-4">
        {items.map((inv) => {
          const group = inv.group || inv.Group || {};
          const mentor = group.mentor || group.Mentor || {};
          const status = inv.status || inv.Status;
          const members = group.members || group.Members || [];
          const invId = inv.id || inv.ID;
          const isExpanded = expandedId === invId;
          const toggleExpand = () => setExpandedId(isExpanded ? null : invId);
          
          return (
            <article key={invId} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-6 shadow-sm transition-all duration-300">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Undangan Kelompok</p>
                  <h3 className="mt-1 text-xl font-bold font-headline text-[var(--theme-text)]">{group.name || group.Name || 'Kelompok'}</h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">Kode: {group.code || group.Code || '-'}</p>
                  
                  <div className="mt-4 p-4 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border)] flex items-center gap-3 w-full max-w-sm">
                    <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Dewan Pembimbing</p>
                      <p className="font-bold text-[var(--theme-text)] text-sm truncate">{mentor.name || mentor.Name || '-'}</p>
                    </div>
                  </div>
                  
                  <button onClick={toggleExpand} className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[var(--theme-primary)] hover:opacity-80 transition-opacity">
                    <span className="material-symbols-outlined text-[18px]">{isExpanded ? 'keyboard_arrow_up' : 'info'}</span>
                    {isExpanded ? 'Sembunyikan Detail' : 'Lihat Detail Kelompok'}
                  </button>
                </div>
                
                <StatusBadge status={status} />
              </div>

              {isExpanded && (
                <div className="mt-6 pt-6 border-t border-[var(--theme-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="grid gap-6 md:grid-cols-2 mb-6">
                    {(group.description || group.Description) && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] mb-2">Deskripsi Kelompok</p>
                        <p className="text-sm text-[var(--theme-text)] leading-relaxed">{group.description || group.Description}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] mb-2">Informasi Grup</p>
                      <p className="text-sm font-bold text-[var(--theme-text)]">Lingkup: {(group.scope_type || group.ScopeType) === 'faculty' ? 'Fakultas' : 'Universitas'}</p>
                      <p className="mt-1 text-sm font-bold text-[var(--theme-text)]">Jumlah Anggota: {members.length}</p>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] mb-3">Daftar Anggota Saat Ini</p>
                    <div className="max-h-48 overflow-y-auto rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)]/50">
                      {members.length > 0 ? (
                        <ul className="divide-y divide-[var(--theme-border)]">
                          {members.map((m, idx) => {
                            const student = m.student || m.Student || {};
                            return (
                              <li key={idx} className="p-3.5 text-sm flex items-center justify-between hover:bg-[var(--theme-surface)] transition-colors">
                                <span className="font-bold text-[var(--theme-text)]">{student.nama || student.Nama || `Mahasiswa ${m.student_id}`}</span>
                                <span className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg ${
                                  (m.status || m.Status) === 'active' ? 'bg-[var(--theme-success)]/10 text-[var(--theme-success)]' :
                                  (m.status || m.Status) === 'pending' ? 'bg-[var(--theme-warning)]/10 text-[var(--theme-warning)]' : 'bg-[var(--theme-error)]/10 text-[var(--theme-error)]'
                                }`}>
                                  {m.status || m.Status}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <p className="p-5 text-center text-sm text-[var(--theme-text-muted)] font-medium">Belum ada anggota.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {status === 'pending' && (
                <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-[var(--theme-border)]">
                  <button onClick={() => handleRespond(invId, 'accept', inv._type || 'group')} disabled={respond.isPending || hasActive} className="rounded-xl bg-[var(--theme-primary)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50 flex items-center gap-2">
                    Terima Undangan
                  </button>
                  <button onClick={() => handleRespond(invId, 'reject', inv._type || 'group')} disabled={respond.isPending} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-2.5 text-sm font-bold text-[var(--theme-text)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-error)] transition-colors disabled:opacity-50">
                    Tolak
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function InvitationSection({ title, description, items, activeMentor, respond, handleRespond }) {
  if (!items.length) return null;
  return (
    <section className="mb-8">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-10 h-10 bg-[var(--theme-border)] rounded-xl flex justify-center items-center text-[var(--theme-text-muted)]">
          <span className="material-symbols-outlined text-[20px]">person_add</span>
        </div>
        <div>
          <span className="text-[9px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">{description}</span>
          <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">{title}</h3>
        </div>
      </div>
      <div className="grid gap-3">
        {items.map((inv) => {
          const mentor = inv.mentor || inv.Mentor || {};
          const status = inv.status || inv.Status;
          return (
            <article key={inv.id || inv.ID} className="rounded-xl border border-[var(--theme-border)] border-dashed bg-[var(--theme-bg)] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--theme-border)] text-[var(--theme-text-muted)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-[var(--theme-text)]">{mentor.name || mentor.Name || 'Dewan Pembimbing'}</h3>
                    <p className="text-xs font-medium text-[var(--theme-text-muted)]">{mentor.email || mentor.Email || '-'}</p>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3">
                  <StatusBadge status={status} />
                  {status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleRespond(inv.id || inv.ID, 'accept')} disabled={respond.isPending || !!activeMentor} className="rounded-lg bg-[var(--theme-primary)] px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50">Terima</button>
                      <button onClick={() => handleRespond(inv.id || inv.ID, 'reject')} disabled={respond.isPending} className="rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-bold text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-colors disabled:opacity-50">Tolak</button>
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
