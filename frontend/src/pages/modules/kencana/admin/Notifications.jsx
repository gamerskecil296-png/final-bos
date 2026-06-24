import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageContent, PageHeader } from '@/components/ui/page';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils';
import { toast, Toaster } from 'react-hot-toast';
import { fetchWithAuth, API_BASE_URL } from '@/services/api';

const Bell = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    notifications
  </span>
);

const Info = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    info
  </span>
);

const ICON_MAP = {
  kencana: Bell,
  sistem: Info,
};

const TIPE_COLORS = {
  kencana: 'bg-blue-50 text-blue-600 border-blue-100',
  sistem: 'bg-slate-50 text-slate-600 border-slate-100',
};

export default function Notifications() {
  const location = useLocation();
  const isAdmin = location.pathname.includes('/app/kencana/dashboard');
  const parentPath = isAdmin ? '/app/kencana/dashboard' : '/app/kencana/mentor';
  const parentLabel = isAdmin ? 'Admin Kencana' : 'Mentor Kencana';
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifikasi`);
      if (res.success) {
        const mapped = (res.data || []).map(n => ({
          id: n.id ?? n.ID,
          tipe: (n.tipe ?? n.Tipe ?? 'sistem').toLowerCase(),
          judul: n.judul ?? n.Judul ?? n.title ?? 'Notifikasi',
          pesan: n.pesan ?? n.Pesan ?? n.desc ?? '',
          is_read: n.is_read ?? n.IsRead ?? false,
          created_at: n.created_at ?? n.CreatedAt,
          link: n.link ?? n.Link,
        }));
        setNotifications(mapped);
      } else {
        setNotifications([]);
      }
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/notifikasi/baca-semua`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.success) {
        setNotifications(n => n.map(item => ({ ...item, is_read: true })));
        toast.success('Semua notifikasi ditandai telah dibaca');
        window.dispatchEvent(new Event('notifications_updated'));
      }
    } catch (err) {
      toast.error('Gagal memperbarui status notifikasi');
    }
  };

  const handleMarkRead = async (id) => {
    if (!id) return;
    try {
      await fetchWithAuth(`${API_BASE_URL}/notifikasi/${id}/baca`, { method: 'PUT' });
      setNotifications(n => n.map(item => item.id === id ? { ...item, is_read: true } : item));
      window.dispatchEvent(new Event('notifications_updated'));
    } catch {}
  };

  useEffect(() => {
    fetchData();

    const handleNotifsUpdate = () => {
      fetchData();
    };
    window.addEventListener('notifications_updated', handleNotifsUpdate);
    return () => {
      window.removeEventListener('notifications_updated', handleNotifsUpdate);
    };
  }, []);

  return (
    <div className="bg-transparent font-body max-w-7xl mx-auto space-y-8">
      <Toaster position="top-right" />

      {/* Page Header */}
      <PageHeader
        icon="notifications_active"
        title={
          <>
            <span className="text-[var(--theme-text)]">Pusat </span>
            <span className="text-[var(--theme-primary)]">Notifikasi</span>
          </>
        }
        subtitle="Pantau aktivitas terbaru, pengumuman Kencana, dan pemberitahuan penting lainnya."
        breadcrumbs={[
          { label: parentLabel, path: parentPath },
          { label: 'Notifikasi' }
        ]}
        action={
          <Button
            onClick={handleMarkAllRead}
            className="h-10 px-6 rounded-xl text-white font-bold text-xs tracking-wider shadow-lg shadow-[var(--theme-primary)]/10 transition-all active:scale-95 shrink-0 w-full lg:w-auto flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--theme-primary)' }}
            disabled={notifications.filter(n => !n.is_read).length === 0}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>done_all</span>
            <span>TANDAI SEMUA DIBACA</span>
          </Button>
        }
      />

      {/* Content Area */}
      <Card className="border border-[var(--theme-border)] shadow-sm rounded-3xl overflow-hidden bg-[var(--theme-surface)]">
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="divide-y divide-[var(--theme-border)]">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-5 first:pt-0 last:pb-0 flex items-start gap-4 animate-pulse">
                  <div className="w-12 h-12 bg-[var(--theme-bg)] rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[var(--theme-bg)] rounded w-1/4" />
                    <div className="h-2.5 bg-[var(--theme-bg)] rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-16 h-16 rounded-2xl bg-[var(--theme-bg)] border border-[var(--theme-border)] flex items-center justify-center text-[var(--theme-text-subtle)]">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>notifications_off</span>
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-[13px] tracking-widest text-[var(--theme-text)] uppercase font-headline">Semua Sudah Dibaca</p>
                <p className="text-xs font-semibold text-[var(--theme-text-muted)]">Tidak ada notifikasi baru untuk Anda saat ini.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[var(--theme-border)]">
              {notifications.map((notif) => {
                const Icon = ICON_MAP[notif.tipe] || Bell;
                const iconColor = TIPE_COLORS[notif.tipe] || 'bg-[var(--theme-primary-light)] text-[var(--theme-primary)] border-[var(--theme-primary-light)]';

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleMarkRead(notif.id)}
                    className={cn(
                      'py-5 first:pt-0 last:pb-0 flex flex-row items-start gap-3 sm:gap-4 transition-all duration-200 cursor-pointer group rounded-xl px-2 -mx-2',
                      notif.is_read
                        ? 'bg-transparent hover:bg-[var(--theme-bg)]'
                        : 'bg-[var(--theme-primary-light)]/20 hover:bg-[var(--theme-primary-light)]/40'
                    )}
                  >
                    {/* Icon Container */}
                    <div className={cn('w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105 duration-200', iconColor)}>
                      <Icon size={18} className="sm:text-xl text-lg" />
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className={cn(
                            'font-headline tracking-tight text-[13px] transition-colors truncate',
                            notif.is_read
                              ? 'text-[var(--theme-text-muted)] font-bold'
                              : 'text-[var(--theme-text)] font-black'
                          )}>
                            {notif.judul}
                          </p>
                          <p className="text-xs font-semibold text-[var(--theme-text-muted)] leading-relaxed max-w-4xl break-words">
                            {notif.pesan}
                          </p>
                        </div>

                        {/* Status Pin & Time */}
                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0">
                          {!notif.is_read && (
                            <span className="h-2 w-2 rounded-full bg-[var(--theme-primary)] shadow-lg shadow-[var(--theme-primary)]/40 animate-pulse shrink-0" />
                          )}
                          <span className="text-[10px] font-bold text-[var(--theme-text-subtle)] tracking-tight whitespace-nowrap">
                            {notif.created_at ? new Date(notif.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
