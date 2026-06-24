import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { psychologistService } from '@/services/api';
import { DataTable } from '@/components/ui/DataTable';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/Table';
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal';
import { DashboardHero } from '@/components/ui/dashboard';
import { PageContent } from '@/components/ui/page';
import { PrimaryStatsCard } from '@/components/ui/StatsCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePermission } from '@/hooks/usePermission';

const PendingIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>pending_actions</span>;
const ConfirmIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>event_available</span>;
const DoneIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>task_alt</span>;
const RejectIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>cancel</span>;


const tabs = ['Semua', 'Menunggu', 'Dikonfirmasi', 'Selesai', 'Ditolak'];
const statusMeta = {
  Menunggu: {
    dot: 'bg-amber-400',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-600',
    badgeBorder: 'border-amber-100',
  },
  Dikonfirmasi: {
    dot: 'bg-blue-400',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-600',
    badgeBorder: 'border-blue-100',
  },
  Selesai: {
    dot: 'bg-emerald-400',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-600',
    badgeBorder: 'border-emerald-100',
  },
  Ditolak: {
    dot: 'bg-rose-400',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-600',
    badgeBorder: 'border-rose-100',
  },
};

export default function BookingManagement() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [pendingConfirmId, setPendingConfirmId] = useState(null);
  const [meetingLink, setMeetingLink] = useState('');
  const navigate = useNavigate();

  const [bookings, setBookings] = useState([]);

  const { hasPermission } = usePermission();
  const canManageBookings = hasPermission('psychologist.bookings.create') || hasPermission('psychologist.bookings.update') || hasPermission('psychologist.bookings.delete');

  useEffect(() => {
    let ignore = false;

    psychologistService.getBookings()
      .then((res) => {
        if (!ignore) setBookings(res.data || []);
      })
      .catch((err) => {
        if (!ignore) setError(err.message || 'Gagal memuat data booking.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => { ignore = true; };
  }, []);

  const prodiOptions = useMemo(() => {
    const prodis = bookings
      .map((booking) => booking.prodi)
      .filter(Boolean);
    return ['Semua Prodi', ...Array.from(new Set(prodis))];
  }, [bookings]);

  const issueOptions = useMemo(() => {
    const issues = bookings
      .map((booking) => booking.issue)
      .filter(Boolean);
    return ['Semua Topik', ...Array.from(new Set(issues))];
  }, [bookings]);

  const statusCounts = useMemo(() => {
    return tabs.reduce((acc, tab) => {
      acc[tab] = tab === 'Semua'
        ? bookings.length
        : bookings.filter((booking) => booking.status === tab).length;
      return acc;
    }, {});
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const first = new Date(a.created_at || a.date).getTime();
        const second = new Date(b.created_at || b.date).getTime();
        return second - first;
      });
  }, [bookings]);

  const handleTableSearch = (data, searchVal) => {
    const query = searchVal.trim().toLowerCase();
    if (!query) return data;
    return data.filter((booking) => {
      const searchableStr = [
        booking.name,
        booking.nim,
        booking.prodi,
        booking.issue,
        booking.date,
        booking.time,
        booking.note,
      ].filter(Boolean).join(' ').toLowerCase();
      return searchableStr.includes(query);
    });
  };



  const handleAction = async (id, newStatus, link = '') => {
    setUpdatingId(id);
    try {
      await psychologistService.updateBookingStatus(id, newStatus, '', link);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus, link_meeting: link } : b));
    } catch (err) {
      alert(err.message || 'Gagal mengubah status booking.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmClick = (booking) => {
    if (booking.mode === 'Online') {
      setPendingConfirmId(booking.id);
      setMeetingLink('');
      setShowLinkModal(true);
    } else {
      handleAction(booking.id, 'Dikonfirmasi');
    }
  };

  const submitConfirmWithLink = () => {
    if (!meetingLink.trim()) {
      alert('Harap masukkan link meeting Zoom/Google Meet');
      return;
    }
    setShowLinkModal(false);
    handleAction(pendingConfirmId, 'Dikonfirmasi', meetingLink);
    setPendingConfirmId(null);
  };

  const columns = [
    {
      key: 'name',
      label: 'Mahasiswa',
      render: (v, row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm bg-[var(--theme-primary-light)]/20 text-[var(--theme-primary)] border border-[var(--theme-primary)]/20 shrink-0">
            {row.avatar || row.name?.charAt(0) || 'M'}
          </div>
          <div>
            <p className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px] max-w-[200px] truncate">{row.name || 'Mahasiswa'}</p>
            <p className="text-[11px] text-[var(--theme-text-muted)] font-body tracking-tight mt-0.5">{row.nim || '-'} &bull; {row.prodi || '-'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'issue',
      label: 'Topik Keluhan',
      render: (v, row) => (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="font-semibold text-[var(--theme-text-muted)] font-headline uppercase text-[9px] tracking-[0.2em] border-[var(--theme-border)] bg-[var(--theme-bg)] px-2.5 py-1 rounded-md">
              {row.issue || '—'}
            </Badge>
            <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[9px] font-headline font-semibold uppercase tracking-wider border ${
              row.mode === 'Online' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}>
              <span className="material-symbols-outlined !text-[12px] shrink-0">{row.mode === 'Online' ? 'videocam' : 'groups'}</span>
              {row.mode || 'Tatap Muka'}
            </span>
          </div>
          <p className="line-clamp-1 text-[10px] font-medium text-[var(--theme-text-subtle)] italic max-w-[250px] font-body">"{row.note || 'Tidak ada catatan'}"</p>
        </div>
      )
    },
    {
      key: 'date',
      label: 'Jadwal Sesi',
      render: (v, row) => (
        <div className="flex flex-col leading-tight gap-1.5">
          <span className="font-semibold text-[var(--theme-text)] font-headline text-[13px]">{row.date || '-'}</span>
          <span className="text-[10px] text-[var(--theme-primary)] font-bold bg-[var(--theme-primary-light)]/20 border border-[var(--theme-primary)]/10 inline-block px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">{row.time || '-'}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (v, row) => {
        const status = row.status || 'Menunggu';
        const statusCfg = statusMeta[status] || statusMeta['Menunggu'];
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border uppercase tracking-wider whitespace-nowrap shadow-sm ${statusCfg.badgeBg} ${statusCfg.badgeText} ${statusCfg.badgeBorder}`}>
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusCfg.dot}`} />
            {status}
          </span>
        );
      }
    }
  ];

  const renderActions = (row) => {
    const status = row.status || 'Menunggu';
    const isUpdating = updatingId === row.id;

    if (status !== 'Menunggu' || !canManageBookings) return null;

    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          type="button"
          disabled={isUpdating}
          onClick={(e) => { e.stopPropagation(); handleAction(row.id, 'Ditolak'); }}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shadow-none disabled:opacity-50"
          title="Tolak Booking"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>close</span>
        </Button>
        <Button
          type="button"
          disabled={isUpdating}
          onClick={(e) => { e.stopPropagation(); handleConfirmClick(row); }}
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-neutral-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors shadow-none disabled:opacity-50"
          title="Setujui Booking"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '15px' }}>check</span>
        </Button>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50/50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500 animate-pulse">Memuat Data Booking...</p>
        </div>
      </div>
    );
  }

  return (
    <PageContent>
      <div className="w-full relative space-y-6 scroll-smooth">
        <DashboardHero
        title="Manajemen"
        highlightedTitle="Janji Temu"
        subtitle="Pantau, cari, dan tindak lanjuti permintaan sesi konseling baru untuk mempercepat penyelesaian bantuan psikologis mahasiswa."
        icon="event_available"
        badges={[{ label: 'Layanan Konseling Mahasiswa', active: false }]}
        actions={
          <div className="px-4 py-2 bg-[var(--theme-primary)]/5 border border-[var(--theme-primary)]/20 rounded-xl flex items-center gap-3 w-full lg:w-auto justify-center">
             <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '16px' }}>psychology</span>
             <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-bold text-[var(--theme-primary)]/70 uppercase tracking-widest">Akses Validasi</span>
                <span className="text-[12px] font-bold text-[var(--theme-primary)] font-jakarta">Psychologist Portal</span>
             </div>
          </div>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {tabs.slice(1).map((status) => {
          let theme = 'primary';
          let StatusIcon = PendingIcon;
          let badgeText = '';
          let badgeIconStr = '';
          
          if (status === 'Menunggu') { theme = 'warning'; StatusIcon = PendingIcon; badgeText = 'Menunggu ACC'; badgeIconStr = 'hourglass_empty'; }
          if (status === 'Dikonfirmasi') { theme = 'info'; StatusIcon = ConfirmIcon; badgeText = 'Disetujui'; badgeIconStr = 'event_available'; }
          if (status === 'Selesai') { theme = 'success'; StatusIcon = DoneIcon; badgeText = 'Tuntas'; badgeIconStr = 'task_alt'; }
          if (status === 'Ditolak') { theme = 'error'; StatusIcon = RejectIcon; badgeText = 'Dibatalkan'; badgeIconStr = 'cancel'; }

          return (
            <PrimaryStatsCard
              key={status}
              title={`Status ${status}`}
              value={statusCounts[status] || 0}
              icon={StatusIcon}
              colorTheme={theme}
              badgeText={badgeText}
              badgeIcon={<span className="material-symbols-outlined text-[12px]">{badgeIconStr}</span>}
            />
          );
        })}
      </div>

      <div className="space-y-5">
        <div>
          <DataTable
            columns={columns}
            data={filteredBookings}
            loading={loading}
            searchable={true}
            filters={[
              {
                key: 'status',
                placeholder: 'Status',
                options: tabs.filter(t => t !== 'Semua').map(t => ({ label: t, value: t }))
              },
              {
                key: 'issue',
                placeholder: 'Topik',
                options: issueOptions.filter(i => i !== 'Semua Topik').map(i => ({ label: i, value: i }))
              },
              {
                key: 'prodi',
                placeholder: 'Prodi',
                options: prodiOptions.filter(p => p !== 'Semua Prodi').map(p => ({ label: p, value: p }))
              }
            ]}
            onSearch={handleTableSearch}
            searchPlaceholder="Cari nama, NIM, topik..."
            pagination={true}
            pageSize={10}
            actions={renderActions}
            onRowClick={(row) => navigate(`/app/psikologi/bookings/${row.id}`)}
            emptyMessage="Tidak ada booking. Coba ubah filter atau kata kunci untuk menampilkan data lain."
            emptyIcon="assignment"
          />
        </div>
      </div>
      </div>

      {/* Zoom / Meeting Link Modal */}
      <DialogModal
        open={showLinkModal}
        onOpenChange={(val) => { if (!val) { setShowLinkModal(false); setPendingConfirmId(null); } }}
        icon="videocam"
        subtitle="Harap masukkan link Zoom atau Google Meet untuk mahasiswa."
        title="Sesi Online"
        maxWidth="max-w-md"
        footer={
          <>
            <ModalCancelButton onClick={() => { setShowLinkModal(false); setPendingConfirmId(null); }} />
            <ModalSaveButton onClick={submitConfirmWithLink}>
              Konfirmasi
            </ModalSaveButton>
          </>
        }
      >
        <div className="space-y-2 text-left p-1">
          <label className="text-[11px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Link Meeting</label>
          <input
            type="text"
            placeholder="https://zoom.us/j/... atau https://meet.google.com/..."
            value={meetingLink}
            onChange={(e) => setMeetingLink(e.target.value)}
            className="h-10 w-full rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 text-sm font-body text-[var(--theme-text)] placeholder:text-[var(--theme-text-subtle)] focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] focus:outline-none transition-colors outline-none"
          />
        </div>
      </DialogModal>
    </PageContent>
  );
}
