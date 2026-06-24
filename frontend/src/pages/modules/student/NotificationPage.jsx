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
import { PageContent, PageHeader } from '@/components/ui/page';
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
  achievement: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }}>emoji_events</span>,
  beasiswa: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }} >school</span>,
  konseling: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }}>handshake</span>,
  student_voice: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }} >chat</span>,
  kencana: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }}>menu_book</span>,
  sistem: <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '18px' }} >notifications</span>,
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

  useEffect(() => {
    if (user?.role === 'super_admin') {
      navigate('/app/akademik/mahasiswa');
    }
  }, [user, navigate]);

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
    navigate(notif.link || '/app/student/notifikasi');
  };

  return (
    <PageContent className="font-body">
      <PageHeader
        title="Notifikasi"
        subtitle={`Kamu memiliki ${notifData?.filter(n => !n.is_read).length || 0} pesan belum dibaca.`}
        icon="notifications"
        breadcrumbs={[
          { label: 'Student Hub', path: '/app/student/dashboard' },
          { label: 'Notifikasi' }
        ]}
        action={
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => queryClient.invalidateQueries(['notifikasi'])}
              disabled={!hasUnread}
              className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-primary-light)] text-[var(--theme-primary)] rounded-xl text-xs font-bold border border-[var(--theme-primary-light)] hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }} >check_circle</span>
              Tandai Semua Dibaca
            </button>
            <button
              onClick={() => deleteReadAllMutation.mutate()}
              className="w-full sm:w-auto px-4 py-2 bg-[var(--theme-error-light)] text-[var(--theme-error)] rounded-xl text-xs font-bold border border-[var(--theme-error-light)] hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }} >delete_sweep</span>
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
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold border-2 transition-all whitespace-nowrap ${filterType === cat.id
                    ? 'bg-[var(--theme-primary)] text-white border-[var(--theme-primary)]'
                    : 'bg-surface text-[var(--theme-text-muted)] border-border hover:border-[var(--theme-primary)]'
                  }`}
              >
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="flex items-center justify-between sm:justify-start gap-3 w-full lg:w-auto">
          <span className="text-sm font-bold text-[#a3a3a3] whitespace-nowrap">Filter Waktu:</span>
          <Select value={filterTime} onValueChange={setFilterTime}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl bg-surface border-border font-bold">
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
        <div className="fixed bottom-4 sm:bottom-10 left-1/2 -translate-x-1/2 bg-[#171717] text-white px-5 py-4 rounded-2xl shadow-2xl z-50 flex flex-col sm:flex-row items-center gap-3 sm:gap-6 animate-in slide-in-from-bottom-5 duration-300 w-[92vw] sm:w-auto">
          <div className="flex items-center gap-3">
            <span className="w-6 h-6 bg-[var(--theme-primary)] rounded-full flex items-center justify-center text-[10px] font-black">
              {selectedIds.length}
            </span>
            <span className="text-sm font-bold">dipilih</span>
          </div>
          <div className="hidden sm:block h-6 w-px bg-white/20" />
          <div className="flex flex-wrap items-center justify-center gap-4 w-full sm:w-auto">
            <button
              onClick={() => bulkReadMutation.mutate(selectedIds)}
              className="text-xs sm:text-sm font-bold hover:text-[var(--theme-primary)] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> Tandai Dibaca
            </button>
            <button
              onClick={() => bulkDeleteMutation.mutate(selectedIds)}
              className="text-xs sm:text-sm font-bold text-[#fca5a5] hover:text-[#ef4444] transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >delete</span> Hapus
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs sm:text-sm font-bold opacity-50 hover:opacity-100 transition-opacity"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {/* List content */}
      <div className="space-y-10 pb-20">
        {isLoading ? (
          <NotifListSkeleton count={8} />
        ) : Object.keys(groupedNotifs).length > 0 ? (
          Object.entries(groupedNotifs).map(([groupName, items]) => (
            <div key={groupName} className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-xs font-black uppercase tracking-widest text-[#a3a3a3]">{groupName}</h2>
                <div className="flex-1 h-px bg-[#e5e5e5]/50" />
              </div>

              <div className="grid gap-3">
                {items.map((notif, idx) => (
                  <div
                    key={notif.id || `notif-${idx}`}
                    onClick={() => handleOpenNotification(notif)}
                    className={`group relative bg-surface border rounded-2xl p-4 sm:p-5 transition-all hover:shadow-md flex flex-row gap-3 sm:gap-5 items-start cursor-pointer ${!notif.is_read ? 'border-[var(--theme-primary)]/30 shadow-sm' : 'border-border grayscale-[0.5] opacity-80 hover:grayscale-0 hover:opacity-100'
                      }`}
                  >
                    {/* Checkbox */}
                    <div className="pt-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(notif.id)}
                        onChange={() => toggleSelect(notif.id)}
                        className="w-5 h-5 rounded-md border-border text-[var(--theme-primary)] focus:ring-[var(--theme-primary)] cursor-pointer bg-background"
                      />
                    </div>

                    {/* Icon */}
                    <div className="shrink-0 hidden xs:block">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 ${!notif.is_read ? 'bg-[var(--theme-primary-light)] border-[var(--theme-primary-light)]' : 'bg-background border-border'
                        }`}>
                        {CATEGORY_ICONS[notif.type] || <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >notifications</span>}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pr-12 lg:pr-0">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 mb-1">
                        <h3 className={`text-sm sm:text-base tracking-tight truncate ${!notif.is_read ? 'font-black text-[var(--theme-text)]' : 'font-bold text-[#525252]'}`}>
                          {notif.title}
                        </h3>
                        <span className="text-[10px] sm:text-[11px] font-bold text-[#a3a3a3] flex items-center gap-1">
                          <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >schedule</span>
                          {(() => {
                            try {
                              return format(new Date(notif.created_at), 'HH:mm');
                            } catch (e) {
                              return '';
                            }
                          })()}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm font-medium text-[#737373] leading-relaxed mb-3 sm:mb-4">
                        {stripHtmlAndEntities(notif.content || '')}
                      </p>

                      {notif.link && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenNotification(notif);
                          }}
                          className="inline-flex items-center gap-2 text-[10px] sm:text-xs font-black text-[var(--theme-primary)] uppercase tracking-widest hover:underline"
                        >
                          Lihat Detail <span className="material-symbols-outlined" style={{ fontSize: 14 }}>chevron_right</span>
                        </button>
                      )}
                    </div>

                    {/* Actions Hover / Always visible on mobile */}
                    <div className="absolute top-4 right-4 flex opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity gap-1">
                      {!notif.is_read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markReadMutation.mutate(notif.id); }}
                          className="w-8 h-8 flex items-center justify-center bg-[var(--theme-success-light)] text-[var(--theme-success)] rounded-lg border border-[var(--theme-success-light)] hover:shadow-sm"
                          title="Tandai dibaca"
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span>
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(notif.id); }}
                        className="w-8 h-8 flex items-center justify-center bg-[var(--theme-error-light)] text-[var(--theme-error)] rounded-lg border border-[var(--theme-error-light)] hover:shadow-sm"
                        title="Hapus"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }} >delete</span>
                      </button>
                    </div>

                    {!notif.is_read && (
                      <div className="absolute top-0 left-0 w-1 h-full bg-[var(--theme-primary)] rounded-l-2xl" />
                    )}
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
