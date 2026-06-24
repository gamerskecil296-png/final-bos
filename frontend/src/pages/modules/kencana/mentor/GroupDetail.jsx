import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  useMentorGroupQuery,
  useMentorRemoveGroupMemberMutation,
} from '@/queries/useKencanaMentorQuery';
import { PageHeader } from '@/components/ui/page/PageHeader';
import MentorAttendanceModal from './MentorAttendanceModal';
import MentorQRModal from './MentorQRModal';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const { data: group, isLoading } = useMentorGroupQuery(id);
  const removeMember = useMentorRemoveGroupMemberMutation();
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = React.useState(false);
  const [isQRModalOpen, setIsQRModalOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [page, setPage] = React.useState(1);
  const perPage = 10;

  const allMembers = group?.members || [];
  const filtered = search
    ? allMembers.filter(m =>
        (m.student?.nama || '').toLowerCase().includes(search.toLowerCase()) ||
        (m.student?.nim || '').toLowerCase().includes(search.toLowerCase())
      )
    : allMembers;
  const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, totalPages);
  const paged = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  if (isLoading) return <div className="p-8 text-center font-bold text-[var(--theme-text-muted)]">Memuat detail kelompok...</div>;
  if (!group) return <div className="p-8 text-center font-bold text-[var(--theme-text-muted)]">Kelompok tidak ditemukan atau bukan milik Anda.</div>;

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-6">

      <PageHeader
        icon="groups"
        title={
          <>
            <span className="text-[var(--theme-text)]">Detail </span>
            <span className="text-[var(--theme-primary)]">{group.name}</span>
          </>
        }
        subtitle={group.description || 'Kelola anggota mahasiswa kelompok Anda.'}
        breadcrumbs={[
          { label: 'Kencana Mentor', path: '/app/kencana/mentor/groups' },
          { label: group.name }
        ]}
        action={
          <div className="flex flex-col sm:flex-row gap-3 text-center min-w-[200px]">
            <div className="bg-white rounded-xl px-4 py-2 border border-[var(--theme-border)]">
              <p className="text-lg font-bold text-[var(--theme-text)]">{group.members_count || 0}</p>
              <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Anggota</p>
            </div>
            <div className="bg-white rounded-xl px-4 py-2 border border-[var(--theme-border)]">
              <p className="text-lg font-bold text-[var(--theme-text)]">{group.capacity || 0}</p>
              <p className="text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Kapasitas</p>
            </div>
          </div>
        }
      />

      <div className="bg-white rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden">
        <div className="p-5 border-b border-[var(--theme-border-muted)] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--theme-bg)]">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari nama atau NIM..."
              className="px-4 h-10 rounded-xl bg-white border border-[var(--theme-border)] text-sm font-semibold outline-none flex-1 max-w-xs focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:border-[var(--theme-primary)] transition-all"
            />
          </div>
           <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsQRModalOpen(true)}
              className="h-10 px-5 rounded-xl bg-white border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-bg)] text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">qr_code_scanner</span>
              Tampilkan QR Absen
            </button>
            <button 
              onClick={() => setIsAttendanceModalOpen(true)}
              className="h-10 px-5 rounded-xl bg-white border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-[var(--theme-bg)] text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">checklist</span>
              Kelola Presensi
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[max-content]">
            <thead>
              <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/80 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center">
                <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">No.</th>
                <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] text-left min-w-[200px]">Nama</th>
                <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] text-left min-w-[150px]">Prodi</th>
                <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kehadiran<br/>(100%)</th>
                <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">Handbook</th>
                <th colSpan={3} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Kognitif</th>
                <th colSpan={8} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Psikomotor</th>
                <th colSpan={6} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Afektif</th>
                <th colSpan={3} className="p-3 border-b border-r border-[var(--theme-border-muted)]">Nilai Komponen</th>
                <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Nilai<br/>Akhir</th>
                <th rowSpan={2} className="p-3 border-r border-[var(--theme-border-muted)]">Keterangan</th>
                <th rowSpan={2} className="p-3 border-l-4 border-l-[var(--theme-bg)] sticky right-0 bg-white shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10 whitespace-nowrap">Aksi</th>
              </tr>
              <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/40 text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider text-center">
                {/* Kognitif */}
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Post Test<br/>Day 1</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Post Test<br/>Day 2</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br/>Kognitif</th>
                {/* Psikomotor */}
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Taat<br/>Peraturan</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Twibon</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Vidio<br/>Analog</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Atribut</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kreativitas<br/>Individu</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kreativitas<br/>Kelompok</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Fasilitas<br/>UBK</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br/>Psikomotor</th>
                {/* Afektif */}
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Etika</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Empati</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Tanggung<br/>Jawab</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Disiplin</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Adil</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap bg-[var(--theme-bg)]/60 text-[var(--theme-text)]">Rata-rata<br/>Afektif</th>
                {/* Komponen */}
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Kognitif<br/>(25%)</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Psikomotor<br/>(35%)</th>
                <th className="p-3 border-r border-[var(--theme-border-muted)] whitespace-nowrap">Afektif<br/>(40%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--theme-border-muted)] text-[12px] text-[var(--theme-text)]">
              {paged.map((member, i) => {
                const sc = member.score_details || {};
                const it = sc.items || [];
                const findItemScore = (comp, keyPart) => {
                  const found = it.find(x => x.component?.toLowerCase() === comp && x.item_name?.toLowerCase().includes(keyPart));
                  return found ? Math.round(found.score).toString() : '0';
                };
                const findQuizScore = (index) => {
                  const quizzes = it.filter(x => x.component?.toLowerCase() === 'cognitive' && x.item_name?.toLowerCase().includes('quiz'))
                    .sort((a, b) => (a.source_id || 0) - (b.source_id || 0));
                  if (index < quizzes.length) return Math.round(quizzes[index].score).toString();
                  return '0';
                };
                return (
                  <tr key={member.id} className="hover:bg-[var(--theme-bg)]/30 transition-colors group/row">
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[var(--theme-text-muted)]">{i + 1}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)]">
                      <div className="flex items-center gap-2">
                        {member.status === 'active' ? (
                          <div className="w-2 h-2 rounded-full bg-[var(--theme-success)]" title="Aktif" />
                        ) : member.status === 'pending' ? (
                          <div className="w-2 h-2 rounded-full bg-[var(--theme-warning)]" title="Menunggu ACC" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[var(--theme-danger)]" title="Ditolak" />
                        )}
                        <div>
                          <p className="font-bold text-sm leading-tight text-[var(--theme-text)]">{member.student?.nama || '-'}</p>
                          <p className="text-[10px] text-[var(--theme-text-muted)] font-bold">{member.student?.nim || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] font-semibold text-[11px] leading-tight text-[var(--theme-text-muted)]">{member.student?.program_studi_name || '-'}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold text-[var(--theme-primary)]">{sc.attendance_count || 0}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold">{findItemScore('cognitive', 'handbook')}</td>
                    {/* Kognitif */}
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findQuizScore(0)}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findQuizScore(1)}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">{sc.cognitive_average?.toFixed(1) || '0.0'}</td>
                    {/* Psikomotor */}
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'taat')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'twibon')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'video')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'atribut')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'kreativitas individu')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'kreativitas kelompok')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('psychomotor', 'memelihara')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">{sc.psychomotor_average?.toFixed(1) || '0.0'}</td>
                    {/* Afektif */}
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'etika')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'empati')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'tanggung jawab')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'disiplin')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">{findItemScore('affective', 'adil')}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-bold bg-[var(--theme-bg)]/20 text-[var(--theme-text)]">{sc.affective_average?.toFixed(1) || '0.0'}</td>
                    {/* Komponen */}
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-text-muted)]">{sc.cognitive_weighted?.toFixed(1) || '0.0'}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-text-muted)]">{sc.psychomotor_weighted?.toFixed(1) || '0.0'}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-semibold text-[var(--theme-text-muted)]">{sc.affective_weighted?.toFixed(1) || '0.0'}</td>
                    {/* Akhir & Ket */}
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center font-black text-[14px] text-[var(--theme-primary)]">{sc.final_score?.toFixed(1) || '0.0'}</td>
                    <td className="p-3 border-r border-[var(--theme-border-muted)] text-center">
                      <span className={`px-2 py-1 rounded border text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                        sc.graduation_status === 'lulus' ? 'bg-[var(--theme-success-light)] border-[var(--theme-success-light)] text-[var(--theme-success)]' :
                        sc.graduation_status === 'tidak_lulus' ? 'bg-[var(--theme-danger-light)] border-[var(--theme-danger-light)] text-[var(--theme-danger)]' :
                        'bg-[var(--theme-warning-light)] border-[var(--theme-warning-light)] text-[var(--theme-warning)]'
                      }`}>
                        {(sc.graduation_status || 'in progress').replace('_', ' ')}
                      </span>
                    </td>
                    {/* Aksi (Sticky Right) */}
                    <td className="p-3 text-center flex items-center justify-center gap-2 border-l-4 border-l-[var(--theme-bg)] sticky right-0 bg-white group-hover/row:bg-[var(--theme-bg)] transition-colors shadow-[-4px_0_10px_rgba(0,0,0,0.05)] z-10">
                      {group.scope_type !== 'faculty' && (
                        <>
                          <button
                            onClick={() => navigate(`/app/kencana/mentor/students/${member.student_id}?tab=progress`)}
                            className="h-7 px-3 rounded text-[var(--theme-primary)] text-[10px] font-bold hover:bg-[var(--theme-primary-light)] transition-colors border border-[var(--theme-border)] hover:border-[var(--theme-primary-light)]"
                            title="Detail"
                          >
                            Detail
                          </button>
                          <button
                            onClick={() => navigate(`/app/kencana/mentor/students/${member.student_id}?tab=form`)}
                            className="h-7 px-3 rounded text-[var(--theme-success)] text-[10px] font-bold hover:bg-[var(--theme-success-light)] transition-colors border border-[var(--theme-border)] hover:border-[var(--theme-success-light)]"
                            title="Nilai"
                          >
                            Nilai
                          </button>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          if (confirm(`Yakin ingin mengeluarkan ${member.student?.nama} dari kelompok?`)) {
                            removeMember.mutate({ groupId: id, studentId: member.student_id });
                          }
                        }} 
                        className="h-7 px-3 rounded text-[var(--theme-danger)] text-[10px] font-bold hover:bg-[var(--theme-danger-light)] transition-colors border border-[var(--theme-border)] hover:border-[var(--theme-danger-light)]"
                        title="Keluarkan"
                      >
                        Keluarkan
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan="28" className="py-12 text-center text-[var(--theme-text-muted)] font-bold">{search ? 'Anggota tidak ditemukan.' : 'Belum ada anggota.'}</td></tr>}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 border-t border-[var(--theme-border-muted)] flex items-center justify-between bg-[var(--theme-bg)]">
            <p className="text-xs font-bold text-[var(--theme-text-muted)]">
              {filtered.length} anggota
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="h-8 px-3 rounded-lg border border-[var(--theme-border)] text-xs font-bold text-[var(--theme-text)] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Sebelumnya
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-8 min-w-[32px] px-2 rounded-lg text-xs font-bold transition-colors ${
                    p === safePage
                      ? 'bg-[var(--theme-primary)] text-white'
                      : 'border border-[var(--theme-border)] text-[var(--theme-text)] hover:bg-white'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="h-8 px-3 rounded-lg border border-[var(--theme-border)] text-xs font-bold text-[var(--theme-text)] hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>
      <MentorAttendanceModal 
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        group={group}
      />
      <MentorQRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
      />
    </div>
  );
};

export default GroupDetail;
