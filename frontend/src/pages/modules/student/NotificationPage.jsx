import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/axios';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '@/store/useAuthStore';
import { resolveStudentNotificationLink } from '@/utils/notificationLinks';
import { stripHtmlAndEntities } from '@/lib/utils';

import { format, isToday, isYesterday, isThisWeek, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { toast } from 'react-hot-toast';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { PageContent } from '@/components/ui/page';
import { DashboardHero } from '@/components/ui/dashboard';
import { NotifListSkeleton } from '@/components/ui/SkeletonGroups';
import EmptyState from '@/components/ui/EmptyState';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/Select';

const CATEGORY_ICONS = {
  achievement: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>emoji_events</span>,
  beasiswa: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }} >school</span>,
  konseling: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>handshake</span>,
  student_voice: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }} >forum</span>,
  kencana: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>menu_book</span>,
  sistem: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }} >notifications</span>,
};

const CATEGORIES = [
  { id: 'Semua', label: 'Semua' },
  { id: 'achievement', label: 'Achievement' },
  { id: 'beasiswa', label: 'Beasiswa' },
  { id: 'konseling', label: 'Konseling' },
  { id: 'student_voice', label: 'Student Voice' },
  { id: 'kencana', label: 'KENCANA' },
  { id: 'sistem', label: 'Sistem' },
];

export default function NotificationPage() {
  const user = useAuthStore(state => state.user);
  const navigate = useNavigate();

  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState('Semua');
  const [filterTime, setFilterTime] = useState('semua'); // hari_ini, minggu_ini, bulan_ini, semua
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifikasi', 'full-list', filterType, filterTime],
    queryFn: async () => {
      const { data } = await api.get(`/notifikasi?tipe=${filterType}&waktu=${filterTime}`);
      return (data.data || []).map(raw => {
        const normalized = {
          id: raw.id ?? raw.ID,
          title: raw.Judul || 'Tanpa Judul',
          content: stripHtmlAndEntities(raw.Deskripsi || ''),
          type: (raw.Tipe || 'sistem').toLowerCase(),
          is_read: raw.IsRead ?? false,
          created_at: raw.created_at || raw.CreatedAt || new Date().toISOString(),
          link: raw.Link || ''
        };

        return {
          ...normalized,
          link: resolveStudentNotificationLink(normalized)
        };
      });
    }
  });

  const markReadMutation = useMutation({
    mutationFn: async (id) => api.put(`/notifikasi/${id}/baca`),
    onSuccess: () => queryClient.invalidateQueries(['notifikasi'])
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => api.delete(`/notifikasi/${id}`),
    onSuccess: () => {
      toast.success("Notifikasi dihapus");
      queryClient.invalidateQueries(['notifikasi']);
    }
  });

  const bulkReadMutation = useMutation({
    mutationFn: async (ids) => api.put('/notifikasi/baca-semua'), // For simplicity, mark all. or we need bulk read.
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['notifikasi']);
      toast.success("Notifikasi ditandai telah dibaca");
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids) => api.delete('/notifikasi/hapus-bulk', { data: { ids } }),
    onSuccess: () => {
      setSelectedIds([]);
      queryClient.invalidateQueries(['notifikasi']);
      toast.success("Notifikasi terpilih berhasil dihapus");
    }
  });

  const deleteReadAllMutation = useMutation({
    mutationFn: async () => api.delete('/notifikasi/hapus-sudah-dibaca'),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifikasi']);
      toast.success("Semua notifikasi terbaca telah dihapus");
    }
  });

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifData?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifData?.map(n => n.id) || []);
    }
  };

  // Grouping logic
  const groupedNotifs = useMemo(() => {
    if (!notifData) return {};

    const groups = {
      'Hari Ini': [],
      'Kemarin': [],
      'Minggu Ini': [],
      'Lebih Lama': []
    };

    notifData.forEach(notif => {
      try {
        const date = new Date(notif.created_at);
        if (isNaN(date.getTime())) {
          groups['Lebih Lama'].push(notif);
          return;
        }
        if (isToday(date)) {
          groups['Hari Ini'].push(notif);
        } else if (isYesterday(date)) {
          groups['Kemarin'].push(notif);
        } else if (isThisWeek(date)) {
          groups['Minggu Ini'].push(notif);
        } else {
          groups['Lebih Lama'].push(notif);
        }
      } catch (e) {
        groups['Lebih Lama'].push(notif);
      }
    });

    // Remove empty groups
    return Object.fromEntries(Object.entries(groups).filter(([_, v]) => v.length > 0));
  }, [notifData]);

  const hasUnread = notifData?.some(n => !n.is_read);

  const handleOpenNotification = (notif) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    navigate(notif.link || '/student/notifikasi');
  };

  return (
    <PageContent className="font-body">
      <DashboardHero
        title="Notifikasi"
        subtitle={`Kamu memiliki ${notifData?.filter(n => !n.is_read).length || 0} pesan belum dibaca yang menunggu.`}
        icon="notifications_active"
        breadcrumbs={[
          { label: user?.role === 'super_admin' ? 'Dashboard' : 'Student Hub', path: user?.role === 'super_admin' ? '/app/dashboard' : '/app/student/dashboard' },
          { label: 'Notifikasi' }
        ]}
        actions={
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => {
                const unreadIds = notifData?.filter(n => !n.is_read).map(n => n.id) || [];
                if (unreadIds.length > 0) {
                  bulkReadMutation.mutate(unreadIds);
                }
              }}
              disabled={!hasUnread}
              className="w-full sm:w-auto px-5 py-2.5 bg-[var(--theme-primary)] text-white rounded-xl text-xs font-bold hover:bg-[var(--theme-primary-hover)] transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 shadow-md shadow-[var(--theme-primary)]/20 cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >mark_email_read</span>
              Tandai Semua Dibaca
            </button>
            <button
              onClick={() => deleteReadAllMutation.mutate()}
              className="w-full sm:w-auto px-5 py-2.5 bg-[var(--theme-surface)] text-[var(--theme-error)] rounded-xl text-xs font-bold border border-[var(--theme-error)]/20 hover:bg-[var(--theme-error)] hover:text-white transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >delete_sweep</span>
              Hapus Terbaca
            </button>
          </div>
        }
      />

      {/* Tabs & Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <Tabs value={filterType} onValueChange={setFilterType} className="w-full lg:max-w-none overflow-x-auto pb-1.5 scrollbar-thin">
          <TabsList className="bg-transparent h-auto p-0 gap-2 flex flex-row flex-nowrap shrink-0">
            {CATEGORIES.map(cat => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all whitespace-nowrap shadow-sm ${filterType === cat.id
                    ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]'
                    : 'bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border)] hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]'
                  }`}
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
          <span className="text-sm font-bold text-[var(--theme-text-muted)] whitespace-nowrap">Filter Waktu:</span>
          <Select value={filterTime} onValueChange={setFilterTime}>
            <SelectTrigger className="w-[160px] h-11 rounded-xl bg-[var(--theme-surface)] border-[var(--theme-border)] text-[var(--theme-text)] font-bold shadow-sm">
              <SelectValue placeholder="Semua Waktu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Waktu</SelectItem>
              <SelectItem value="hari_ini">Hari Ini</SelectItem>
              <SelectItem value="minggu_ini">Minggu Ini</SelectItem>
              <SelectItem value="bulan_ini">Bulan Ini</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 bg-[#171717] text-white px-5 sm:px-6 py-3 sm:py-4 rounded-full shadow-2xl z-50 flex flex-col sm:flex-row items-center gap-3 sm:gap-5 animate-in slide-in-from-bottom-5 duration-300 w-[92vw] sm:w-auto border border-white/10">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-[var(--theme-primary)] text-white rounded-full flex items-center justify-center text-[11px] font-black shadow-inner shadow-white/20">
              {selectedIds.length}
            </span>
            <span className="text-xs sm:text-sm font-bold whitespace-nowrap">Item Dipilih</span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-white/20" />
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 w-full sm:w-auto">
            <button
              onClick={toggleSelectAll}
              className="text-xs sm:text-sm font-bold hover:text-gray-300 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>select_all</span> Pilih Semua
            </button>
            <button
              onClick={() => bulkReadMutation.mutate(selectedIds)}
              className="text-xs sm:text-sm font-bold hover:text-gray-300 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mark_email_read</span> Tandai Dibaca
            </button>
            <button
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="text-xs sm:text-sm font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >delete</span> Hapus
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs sm:text-sm font-bold text-gray-400 hover:text-white transition-colors"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* List content */}
      <div className="space-y-6 pb-24">
        {/* Top Control Bar for Select All */}
        {notifData?.length > 0 && !isLoading && (
          <div className="flex items-center justify-between bg-[var(--theme-surface)] p-3 rounded-2xl border border-[var(--theme-border)] shadow-sm">
             <div className="flex items-center gap-3 px-3 cursor-pointer" onClick={toggleSelectAll}>
                 <input
                    type="checkbox"
                    checked={selectedIds.length === notifData.length && notifData.length > 0}
                    onChange={toggleSelectAll}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded-[4px] border border-[var(--theme-border-muted)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] cursor-pointer bg-[var(--theme-bg)] transition-colors checked:border-[var(--theme-primary)]"
                 />
                 <span className="text-sm font-bold text-[var(--theme-text)]">Pilih Semua</span>
             </div>
             {selectedIds.length > 0 && (
               <div className="flex items-center gap-2 pr-2">
                 <button onClick={() => bulkReadMutation.mutate(selectedIds)} className="text-[11px] px-3 py-1.5 bg-[var(--theme-primary)]/10 text-[var(--theme-primary)] hover:bg-[var(--theme-primary)]/20 rounded-lg font-bold flex items-center gap-1.5 transition-colors cursor-pointer">
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>mark_email_read</span> Tandai Dibaca
                 </button>
               </div>
             )}
          </div>
        )}

        {isLoading ? (
          <NotifListSkeleton count={8} />
        ) : Object.keys(groupedNotifs).length > 0 ? (
          Object.entries(groupedNotifs).map(([groupName, items]) => (
            <div key={groupName} className="space-y-4">
              <div className="flex items-center">
                <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[var(--theme-primary)] bg-[var(--theme-surface)] px-4 py-1.5 rounded-lg border border-[var(--theme-border)] shadow-sm">
                  {groupName}
                </h2>
                <div className="flex-1 h-px bg-[var(--theme-border)] ml-4" />
              </div>

              <div className="grid gap-4">
                {items.map((notif, idx) => (
                  <div
                    key={notif.id || `notif-${idx}`}
                    onClick={() => handleOpenNotification(notif)}
                    className={`group relative bg-[var(--theme-surface)] border rounded-2xl p-4 sm:p-5 transition-all duration-300 hover:shadow-md flex flex-row gap-4 items-start cursor-pointer overflow-hidden ${!notif.is_read ? 'border-[var(--theme-border-muted)] shadow-sm' : 'border-[var(--theme-border)] grayscale-[0.2] opacity-80 hover:grayscale-0 hover:opacity-100'
                      }`}
                  >
                    {/* Left blue indicator for unread */}
                    {!notif.is_read && (
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--theme-primary)]" />
                    )}

                    {/* Checkbox */}
                    <div className="shrink-0 relative z-10 pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <div className="relative flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notif.id)}
                          onChange={() => toggleSelect(notif.id)}
                          className="peer w-5 h-5 rounded-[4px] border border-[var(--theme-border-muted)] text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] cursor-pointer bg-[var(--theme-bg)] transition-colors checked:border-[var(--theme-primary)]"
                        />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 flex flex-col relative z-10 pr-20 lg:pr-24">
                      <h3 className={`text-sm sm:text-base tracking-tight truncate mb-1.5 ${!notif.is_read ? 'font-bold text-[var(--theme-text)]' : 'font-semibold text-[var(--theme-text-muted)]'}`}>
                        {notif.title}
                      </h3>
                      
                      <p className={`text-xs sm:text-sm leading-relaxed mb-4 ${!notif.is_read ? 'text-[var(--theme-text)]/90 font-medium' : 'text-[var(--theme-text-muted)] font-medium'}`}>
                        {stripHtmlAndEntities(notif.content || '')}
                      </p>

                      {notif.link && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNotification(notif);
                          }}
                          className="self-start inline-flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-[var(--theme-primary)] uppercase tracking-widest hover:text-[var(--theme-primary-hover)] transition-colors"
                        >
                          Lihat Detail <span className="material-symbols-outlined transition-transform group-hover:translate-x-1" style={{ fontSize: 14 }}>arrow_forward</span>
                        </button>
                      )}
                    </div>

                    {/* Right side static time pill & Actions */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2 z-20">
                      <span className="text-[10px] font-bold text-[var(--theme-text-muted)] flex items-center gap-1.5 px-2 py-1 rounded-md border border-[var(--theme-border)] bg-[var(--theme-bg)]">
                        <span className="material-symbols-outlined opacity-70" style={{ fontSize: '12px' }} >schedule</span>
                        {(() => {
                          try {
                            return format(new Date(notif.created_at), 'HH:mm');
                          } catch (e) {
                            return '';
                          }
                        })()}
                      </span>
                      
                      {/* Actions - Only visible on hover */}
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-300">
                        {!notif.is_read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif.id); }}
                            className="w-8 h-8 flex items-center justify-center bg-[var(--theme-success)]/10 text-[var(--theme-success)] rounded-lg hover:bg-[var(--theme-success)]/20 transition-colors shadow-sm cursor-pointer"
                            title="Tandai dibaca"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span>
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }}
                          className="w-8 h-8 flex items-center justify-center bg-[var(--theme-error)]/10 text-[var(--theme-error)] rounded-lg hover:bg-[var(--theme-error)]/20 transition-colors shadow-sm cursor-pointer"
                          title="Hapus"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 16 }} >delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <EmptyState
            icon="notifications"
            title="Semua Sudah Beres!"
            description="Belum ada notifikasi baru untuk filter ini. Kamu sudah update dengan semua informasi terbaru."
          />
        )}
      </div>
    </PageContent>
  );
}
