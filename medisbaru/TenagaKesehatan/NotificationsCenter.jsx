import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import { stripHtmlAndEntities } from '../../lib/utils';
import { DashboardHero } from '@/components/ui/dashboard';

const iconByType = {
  booking: 'calendar_month',
  assessment: 'assignment',
  alert: 'error',
  report: 'check_circle',
  referral: 'move_to_inbox',
  sistem: 'settings',
  info: 'info',
};

const colorByType = {
  booking: 'bg-primary',
  assessment: 'bg-indigo-500',
  alert: 'bg-rose-500',
  report: 'bg-emerald-500',
  referral: 'bg-indigo-500',
  sistem: 'bg-slate-500',
  info: 'bg-sky-500',
};

export default function NotificationsCenter() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const unreadCount = useMemo(() => notifications.filter((item) => !item.IsRead && !item.is_read).length, [notifications]);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/tenagakes/notifikasi');
      const mappedData = Array.isArray(res.data.data) ? res.data.data.map(n => ({
        ...n,
        Deskripsi: stripHtmlAndEntities(n.Deskripsi || n.desc || '')
      })) : [];
      setNotifications(mappedData);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || 'Gagal memuat notifikasi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markRead = async (id) => {
    setBusyId(`read-${id}`);
    try {
      await api.put(`/tenagakes/notifikasi/${id}/baca`);
      setNotifications((prev) => prev.map((item) => (item.id === id || item.ID === id ? { ...item, is_read: true, IsRead: true } : item)));
    } catch (err) {
      setError(err?.message || 'Gagal menandai notifikasi.');
    } finally {
      setBusyId('');
    }
  };

  const markAllRead = async () => {
    setBusyId('read-all');
    try {
      await api.put('/tenagakes/notifikasi/baca-semua');
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true, IsRead: true })));
    } catch (err) {
      setError(err?.message || 'Gagal menandai semua notifikasi.');
    } finally {
      setBusyId('');
    }
  };

  const deleteNotification = async (id) => {
    setBusyId(`delete-${id}`);
    try {
      await api.delete(`/tenagakes/notifikasi/${id}`);
      setNotifications((prev) => prev.filter((item) => item.id !== id && item.ID !== id));
    } catch (err) {
      setError(err?.message || 'Gagal menghapus notifikasi.');
    } finally {
      setBusyId('');
    }
  };

  const handleNotificationClick = (noti) => {
    const isRead = noti.is_read ?? noti.IsRead;
    if (!isRead) {
      markRead(noti.id || noti.ID);
    }
    
    if (noti.Link || noti.link) {
      navigate(noti.Link || noti.link);
      return;
    }
  };

  return (
    <>
      <div className="w-full relative space-y-6 scroll-smooth">
          <DashboardHero
            title="Pusat"
            highlightedTitle="Notifikasi"
            subtitle="Pantau informasi terbaru dan update dari sistem secara langsung."
            icon="notifications"
            badges={[{ label: `${unreadCount} Belum Dibaca`, active: false }]}
            actions={
              <div className="flex flex-wrap gap-2 w-full lg:w-auto">
                <button
                  type="button"
                  onClick={fetchNotifications}
                  disabled={loading}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] shadow-sm transition hover:text-[var(--theme-primary)] hover:border-[var(--theme-primary)]/30 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className={`material-symbols-outlined text-[18px] shrink-0 ${loading ? 'animate-spin' : ''}`}>sync</span>
                  Muat Ulang
                </button>
                <button
                  type="button"
                  onClick={markAllRead}
                  disabled={!unreadCount || busyId === 'read-all'}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--theme-primary)] px-4 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-[var(--theme-primary)]/20 transition hover:bg-[var(--theme-primary-hover)] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
                >
                  {busyId === 'read-all' ? <span className="material-symbols-outlined animate-spin text-[18px] shrink-0">sync</span> : <span className="material-symbols-outlined text-[18px] shrink-0">check</span>}
                  Tandai Semua Dibaca
                </button>
              </div>
            }
          />

          {error && (
            <div className="flex items-start gap-3 rounded-3xl border border-rose-100 bg-rose-50 px-5 py-4 text-rose-700">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-lg">error</span>
              <p className="text-sm font-semibold">{error}</p>
            </div>
          )}

          <section className="w-full space-y-4">
            {loading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="h-28 animate-pulse rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                    <div className="mb-4 h-4 w-44 rounded bg-slate-100" />
                    <div className="h-3 w-3/4 rounded bg-slate-100" />
                  </div>
                ))
              : notifications.map((noti) => {
                  const type = noti.Tipe || noti.tipe || 'sistem';
                  const isRead = noti.is_read ?? noti.IsRead;
                  const Icon = iconByType[type] || 'notifications';
                  return (
                    <article
                      key={noti.id || noti.ID}
                      onClick={() => handleNotificationClick(noti)}
                      className={`group relative flex items-start gap-3 rounded-xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md cursor-pointer sm:gap-4 sm:p-4 ${
                        !isRead ? 'border-primary/20' : 'border-[var(--theme-border)] opacity-85'
                      }`}
                      style={{ backgroundColor: 'var(--theme-surface)' }}
                    >
                      {!isRead && <span className="absolute left-2.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-primary shadow-lg shadow-primary/40" />}

                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-2xl ${colorByType[type] || 'bg-primary'} text-white shadow-sm`}>
                        <span className="material-symbols-outlined text-xl shrink-0">{Icon}</span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-0.5 flex flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                          <h2 className="truncate text-xs font-black uppercase tracking-tight font-headline" style={{ color: 'var(--theme-h2)' }}>{noti.Judul || noti.title}</h2>
                          <span className="inline-flex shrink-0 items-center gap-1 text-[8px] font-black uppercase tracking-widest text-slate-400">
                            <span className="material-symbols-outlined text-[10px] shrink-0">schedule</span>
                            {new Date(noti.created_at || noti.CreatedAt).toLocaleDateString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="line-clamp-2 text-[10px] font-medium leading-relaxed text-slate-500">{noti.Deskripsi || noti.desc}</p>
                      </div>

                      <div className="flex shrink-0 gap-1">
                        {!isRead && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); markRead(noti.id || noti.ID); }}
                            disabled={busyId === `read-${noti.id || noti.ID}`}
                            className="rounded-xl p-1.5 text-slate-300 transition hover:bg-primary/5 hover:text-primary disabled:cursor-wait"
                            aria-label="Tandai dibaca"
                          >
                            {busyId === `read-${noti.id || noti.ID}` ? <span className="material-symbols-outlined animate-spin text-base shrink-0">sync</span> : <span className="material-symbols-outlined text-base shrink-0">check</span>}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); deleteNotification(noti.id || noti.ID); }}
                          disabled={busyId === `delete-${noti.id || noti.ID}`}
                          className="rounded-xl p-1.5 text-slate-300 transition hover:bg-rose-50 hover:text-rose-500 disabled:cursor-wait"
                          aria-label="Hapus notifikasi"
                        >
                          {busyId === `delete-${noti.id || noti.ID}` ? <span className="material-symbols-outlined animate-spin text-base shrink-0">sync</span> : <span className="material-symbols-outlined text-base shrink-0">delete</span>}
                        </button>
                      </div>
                    </article>
                  );
                })}

            {!loading && notifications.length === 0 && (
              <div className="rounded-2xl border border-dashed p-10 text-center shadow-sm" style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}>
                <span className="material-symbols-outlined mx-auto mb-3 text-slate-300 text-4xl shrink-0">notifications</span>
                <p className="text-sm font-black uppercase tracking-widest text-slate-500">Belum ada notifikasi</p>
                <p className="mt-1 text-xs font-semibold text-slate-400">Notifikasi baru akan muncul di sini.</p>
              </div>
            )}
          </section>
        </div>
    </>
  );
}
