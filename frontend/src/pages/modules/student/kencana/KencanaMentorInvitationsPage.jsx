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
        <div className="glass-card flex items-center gap-6 p-4 md:p-6 border border-slate-200 shadow-sm">
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-bold text-[var(--theme-text-muted)] tracking-wide mb-1 uppercase">Nilai Kencana</span>
            <span className="text-3xl font-bold text-[var(--theme-text)] font-headline tracking-tight tabular-nums leading-none">
              {Number(dashboardData?.temporary_final_score || 0).toFixed(1)}
            </span>
          </div>
          <div className="size-14 rounded-2xl bg-[var(--theme-primary)] flex items-center justify-center text-white shadow-md border-none">
            <span className="material-symbols-outlined animate-pulse" style={{ fontSize: '28px' }} strokeWidth={2.5}>grade</span>
          </div>
        </div>
      }
    >
      {activeMentor && (
        <section className="glass-card !border-[var(--theme-success)]/20 !bg-[var(--theme-success)]/10 p-6 text-[var(--theme-success)] mb-6 shadow-sm">
          <p className="text-[10px] font-bold font-headline uppercase tracking-widest opacity-80">Dewan Pembimbing Aktif (1-on-1 Lama)</p>
          <h2 className="mt-2 text-2xl font-bold font-headline">{activeMentor.name}</h2>
          <p className="mt-1 text-sm font-semibold">{activeMentor.email || '-'} {activeMentor.phone ? `- ${activeMentor.phone}` : ''}</p>
        </section>
      )}

      {message && <p className="glass-card !bg-[var(--theme-warning)]/10 !border-[var(--theme-warning)]/20 p-4 mb-6 text-sm font-bold text-[var(--theme-warning)] shadow-sm">{message}</p>}

      <GroupInvitationSection 
        title="Undangan Kelompok DP Kencana Universitas" 
        description="Undangan bergabung ke dalam kelompok Dewan Pembimbing universitas." 
        items={universityGroupList} 
        hasActive={universityGroupList.some(i => i.status === 'active' || i.Status === 'active')}
        respond={respondGroup} 
        handleRespond={handleRespondGroup} 
      />

      <GroupInvitationSection 
        title="Undangan Kelompok DP Kencana Fakultas" 
        description="Undangan bergabung ke dalam kelompok Dewan Pembimbing khusus fakultas." 
        items={facultyGroupList} 
        hasActive={facultyGroupList.some(i => i.status === 'active' || i.Status === 'active')}
        respond={respondGroup} 
        handleRespond={handleRespondGroup} 
      />

      <InvitationSection 
        title="Undangan DP Kencana Fakultas (1-on-1)" 
        description="Undangan dari Dewan Pembimbing khusus fakultas kamu (Format Lama)." 
        items={facultyInvitations} 
        activeMentor={activeMentor} 
        respond={respondMentor} 
        handleRespond={handleRespondMentor} 
      />

      {oldUniversityInvitations.length > 0 && (
        <InvitationSection 
          title="Undangan DP Kencana Universitas (Lama)" 
          description="Undangan dari Dewan Pembimbing lingkup universitas (Format Lama)." 
          items={oldUniversityInvitations} 
          activeMentor={activeMentor} 
          respond={respondMentor} 
          handleRespond={handleRespondMentor} 
        />
      )}

      {(!invitationList.length && !groupList.length) && (
        <div className="text-center py-12 glass-card !border-2 !border-dashed !border-slate-200 !bg-slate-50">
          <span className="material-symbols-outlined text-4xl text-slate-300 mb-3">inbox</span>
          <p className="text-slate-400 font-bold font-headline">Belum ada undangan Dewan Pembimbing.</p>
        </div>
      )}
    </KencanaShell>
  );
}

function GroupDetailModal({ isOpen, onClose, group }) {
  if (!isOpen || !group) return null;

  const mentor = group.mentor || group.Mentor || {};
  const members = group.members || group.Members || [];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl glass-card p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[var(--theme-primary)] to-[var(--theme-info)]"></div>
        <button onClick={onClose} className="absolute right-6 top-6 text-[var(--theme-text-muted)] hover:text-[var(--theme-text)] transition-colors">
          <span className="material-symbols-rounded">close</span>
        </button>

        <h2 className="text-2xl font-bold font-headline text-[var(--theme-text)]">Detail Kelompok</h2>
        <p className="text-sm font-medium text-[var(--theme-text-muted)] mt-1">{group.name || group.Name || '-'}</p>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)]">Dewan Pembimbing</p>
            <p className="mt-2 text-lg font-bold font-headline text-[var(--theme-text)]">{mentor.name || mentor.Name || '-'}</p>
            <p className="text-sm font-medium text-[var(--theme-text-muted)]">{mentor.email || mentor.Email || '-'}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Informasi Grup</p>
            <p className="mt-2 text-sm font-bold text-[var(--theme-text)]">Kode: {group.code || group.Code || '-'}</p>
            <p className="mt-1 text-sm font-bold text-[var(--theme-text)]">Lingkup: {(group.scope_type || group.ScopeType) === 'faculty' ? 'Fakultas' : 'Universitas'}</p>
            <p className="mt-1 text-sm font-bold text-[var(--theme-text)]">Jumlah Anggota: {members.length}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] mb-3">Daftar Anggota Saat Ini</p>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50">
            {members.length > 0 ? (
              <ul className="divide-y divide-[var(--theme-border-muted)]">
                {members.map((m, idx) => {
                  const student = m.student || m.Student || {};
                  return (
                    <li key={idx} className="p-4 text-sm flex items-center justify-between hover:bg-[var(--theme-surface)] transition-colors">
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
              <p className="p-6 text-center text-sm text-[var(--theme-text-subtle)] font-medium">Belum ada anggota.</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button onClick={onClose} className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-6 py-2.5 text-sm font-bold text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-colors">
            Tutup
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function GroupInvitationSection({ title, description, items, hasActive, respond, handleRespond }) {
  const [selectedGroup, setSelectedGroup] = React.useState(null);

  if (!items.length) return null; // Only render if there are items to prevent clutter
  return (
    <section className="glass-card p-6 mb-6 group hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-indigo-50/80 rounded-xl flex justify-center items-center text-indigo-600 group-hover:scale-110 transition-all duration-300">
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
          
          return (
            <article key={inv.id || inv.ID} className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-[var(--theme-primary-light)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Undangan Kelompok</p>
                  <h3 className="mt-1 text-xl font-bold font-headline text-[var(--theme-text)]">{group.name || group.Name || 'Kelompok'}</h3>
                  <p className="mt-1 text-xs font-semibold text-[var(--theme-text-muted)]">Kode: {group.code || group.Code || '-'}</p>
                  <div className="mt-4 p-4 bg-[var(--theme-bg)] rounded-xl border border-[var(--theme-border-muted)] flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[20px]">person</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Dewan Pembimbing</p>
                      <p className="font-bold text-[var(--theme-text)] text-sm">{mentor.name || mentor.Name || '-'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedGroup(group)} className="mt-4 text-xs font-bold text-[var(--theme-primary)] hover:text-[var(--theme-primary-hover)] transition-colors flex items-center gap-1">
                    <span className="material-symbols-rounded text-[16px]">info</span>
                    Lihat Detail Kelompok
                  </button>
                </div>
                <StatusBadge status={status} />
              </div>
              {status === 'pending' && (
                <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-[var(--theme-border-muted)]">
                  <button onClick={() => handleRespond(inv.id || inv.ID, 'accept')} disabled={respond.isPending || hasActive} className="rounded-xl bg-[var(--theme-primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm disabled:opacity-50">Terima Undangan</button>
                  <button onClick={() => handleRespond(inv.id || inv.ID, 'reject')} disabled={respond.isPending} className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] px-6 py-2.5 text-sm font-bold text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-colors disabled:opacity-50">Tolak</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
      
      <GroupDetailModal 
        isOpen={!!selectedGroup} 
        group={selectedGroup} 
        onClose={() => setSelectedGroup(null)} 
      />
    </section>
  );
}

function InvitationSection({ title, description, items, activeMentor, respond, handleRespond }) {
  if (!items.length) return null;
  return (
    <section className="glass-card p-6 mb-6 group hover:shadow-md transition-all duration-300">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 bg-amber-50/80 rounded-xl flex justify-center items-center text-amber-600 group-hover:scale-110 transition-all duration-300">
          <span className="material-symbols-outlined text-[24px]">person_add</span>
        </div>
        <div>
          <span className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-widest block mb-0.5">{description}</span>
          <h3 className="text-sm font-bold text-[var(--theme-text)] leading-tight">{title}</h3>
        </div>
      </div>
      <div className="grid gap-4">
        {items.map((inv) => {
          const mentor = inv.mentor || inv.Mentor || {};
          const status = inv.status || inv.Status;
          return (
            <article key={inv.id || inv.ID} className="rounded-xl border border-slate-200 bg-slate-50 p-6 shadow-sm hover:shadow-md transition-all duration-300 hover:border-[var(--theme-primary-light)]">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[24px]">person</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)]">Undangan Pembimbing (1-on-1)</p>
                    <h3 className="mt-1 text-xl font-bold font-headline text-[var(--theme-text)]">{mentor.name || mentor.Name || 'Dewan Pembimbing'}</h3>
                    <p className="mt-1 text-sm font-medium text-[var(--theme-text-muted)] flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">mail</span> {mentor.email || mentor.Email || '-'}</p>
                    <span className="inline-block mt-2 px-2 py-1 bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-lg text-[10px] font-bold text-[var(--theme-text-muted)] tracking-widest uppercase">
                      Scope: {mentor.scope_type || mentor.ScopeType || '-'}
                    </span>
                  </div>
                </div>
                <StatusBadge status={status} />
              </div>
              {status === 'pending' && (
                <div className="mt-6 flex flex-wrap gap-3 pt-4 border-t border-[var(--theme-border-muted)]">
                  <button onClick={() => handleRespond(inv.id || inv.ID, 'accept')} disabled={respond.isPending || !!activeMentor} className="rounded-xl bg-[var(--theme-primary)] px-6 py-2.5 text-sm font-bold text-white hover:bg-[var(--theme-primary-hover)] transition-colors shadow-sm disabled:opacity-50">Terima Undangan</button>
                  <button onClick={() => handleRespond(inv.id || inv.ID, 'reject')} disabled={respond.isPending} className="rounded-xl border border-[var(--theme-border-muted)] bg-[var(--theme-surface)] px-6 py-2.5 text-sm font-bold text-[var(--theme-text)] hover:bg-[var(--theme-bg)] transition-colors disabled:opacity-50">Tolak</button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
