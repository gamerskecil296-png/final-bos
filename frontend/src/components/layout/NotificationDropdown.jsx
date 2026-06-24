import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { stripHtmlAndEntities } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';
import api from '../../lib/axios';
import useAuthStore from '../../store/useAuthStore';
import {
  Bell,
  Trophy,
  BookOpen,
  HeartHandshake,
  MessageSquare,
  GraduationCap,
  Check,
  ChevronRight,
  Info,
  CheckCircle2,
  Dot
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { resolveStudentNotificationLink } from '../../utils/notificationLinks';
import { Modal, ModalBody, ModalFooter, ModalBtn } from '../ui/Modal';

const CATEGORY_ICONS = {
  achievement: <Trophy size={16} className="text-blue-600" />,
  beasiswa: <GraduationCap size={16} className="text-blue-600" />,
  konseling: <HeartHandshake size={16} className="text-blue-600" />,
  student_voice: <MessageSquare size={16} className="text-blue-600" />,
  kencana: <BookOpen size={16} className="text-blue-600" />,
  sistem: <Bell size={16} className="text-blue-600" />,
};

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotifDetail, setSelectedNotifDetail] = useState(null);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const user = useAuthStore(state => state.user);
  const role = user?.role || '';
  const ormawaId = user?.ormawa_id || user?.OrmawaID || user?.ormawaId || 1;

  const isOrmawa = role === 'ormawa' || role === 'ormawa_admin';
  const isPsychologist = role === 'psychologist' || role === 'psikolog';
  const isSuperAdmin = role === 'super_admin';
  const isTenagaKesehatan = role === 'tenaga_kesehatan' || role === 'tenagakes';
  const isKencanaAdmin = role === 'kencana_admin';
  const isKencanaFakultas = role === 'kencana_fakultas';
  const isKencanaMentor = role === 'kencana_mentor';
  const isKencanaStaff = isKencanaAdmin || isKencanaFakultas || isKencanaMentor;
  const hasNotifications = true; // Enable notifications for all roles

  // Polling strategy: check unread count every 30s
  const { data: unreadData } = useQuery({
    queryKey: ['notifikasi', 'unread-count', role, ormawaId],
    queryFn: async () => {
      if (isOrmawa) {
        const { data } = await api.get(`/ormawa/notifications?ormawaId=${ormawaId}`);
        const unreadCount = (data.data || []).filter(n => !(n.is_read ?? n.IsRead)).length;
        return { count: unreadCount };
      }
      if (isPsychologist) {
        const { data } = await api.get('/psychologist/notifications');
        const unreadCount = (data.data || []).filter(n => n.unread !== undefined ? n.unread : !(n.is_read ?? n.IsRead)).length;
        return { count: unreadCount };
      }
      if (isTenagaKesehatan) {
        const { data } = await api.get('/tenagakes/notifikasi/unread-count');
        return data;
      }
      const { data } = await api.get('/notifikasi/unread-count');
      return data;
    },
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    enabled: hasNotifications // Skip for super_admin
  });

  const { data: notifData, isLoading } = useQuery({
    queryKey: ['notifikasi', 'list-dropdown', role, ormawaId],
    queryFn: async () => {
      let responseData = [];
      if (isOrmawa) {
        const { data } = await api.get(`/ormawa/notifications?ormawaId=${ormawaId}`);
        responseData = data.data || [];
      } else if (isPsychologist) {
        const { data } = await api.get('/psychologist/notifications');
        responseData = data.data || [];
      } else if (isTenagaKesehatan) {
        const { data } = await api.get('/tenagakes/notifikasi');
        responseData = data.data || [];
      } else {
        const { data } = await api.get('/notifikasi');
        responseData = data.data || [];
      }

      return responseData.slice(0, 5).map(raw => {
        let defaultLink = raw.link ?? raw.Link ?? '';
        let hasCustomLink = !!defaultLink;
        if (!defaultLink) {
          const typeLower = (raw.tipe ?? raw.Tipe ?? raw.type ?? raw.Type ?? 'sistem').toLowerCase();
          const text = (raw.title ?? raw.judul ?? raw.Judul ?? '') + ' ' + (raw.desc ?? raw.pesan ?? raw.Pesan ?? raw.deskripsi ?? raw.Deskripsi ?? '');
          const lowerText = text.toLowerCase();

          if (isSuperAdmin) {
            if (typeLower === 'konseling' || typeLower === 'booking' || typeLower === 'reschedule') {
              defaultLink = '/admin/psychologists/dashboard';
            } else if (typeLower === 'referral') {
              defaultLink = '/app/psikologi/referrals';
            } else if (typeLower === 'referral_medis') {
              defaultLink = '/app/kesehatan/referrals';
            } else if (typeLower === 'beasiswa') {
              defaultLink = '/admin/scholarships';
            } else if (typeLower === 'achievement' || typeLower === 'prestasi') {
              defaultLink = '/admin/achievements';
            } else if (typeLower === 'asuransi') {
              defaultLink = '/admin/insurance';
            } else if (typeLower === 'student_voice' || typeLower === 'aspirasi') {
              defaultLink = '/admin/aspirations';
            } else if (typeLower === 'kencana') {
              defaultLink = '/admin/kencana-univ';
            } else if (typeLower === 'ormawa' || typeLower === 'proposal') {
              defaultLink = '/admin/ormawa-dashboard';
            } else {
              defaultLink = '/admin';
            }
          } else if (isPsychologist) {
            if (typeLower === 'booking' || typeLower === 'reschedule') {
              defaultLink = '/app/psikologi/bookings';
            } else if (typeLower === 'referral') {
              defaultLink = '/app/psikologi/referrals';
            } else {
              defaultLink = '/app/psikologi/notifications';
            }
          } else if (isOrmawa) {
            defaultLink = '/ormawa/notifikasi';
          } else if (isTenagaKesehatan) {
            if (typeLower === 'referral_medis' || lowerText.includes('rujukan')) {
              defaultLink = '/app/kesehatan/referrals';
            } else {
              defaultLink = '/app/kesehatan/notifications';
            }
          } else if (isKencanaAdmin) {
            defaultLink = '/kencana-admin/notifications';
          } else if (isKencanaFakultas) {
            defaultLink = '/kencana-fakultas/notifications';
          } else if (isKencanaMentor) {
            defaultLink = '/kencana-mentor/notifications';
          } else { // Student
            if (typeLower === 'konseling' || typeLower === 'referral' || (typeLower === 'info' && lowerText.includes('rujukan psikolog'))) {
              defaultLink = '/student/counseling/history?tab=referrals';
            } else if (typeLower === 'health' || typeLower === 'referral_medis') {
              defaultLink = '/student/health';
            } else if (typeLower === 'beasiswa') {
              defaultLink = '/student/scholarship';
            } else if (typeLower === 'achievement' || typeLower === 'prestasi') {
              defaultLink = '/student/achievement';
            } else if (typeLower === 'student_voice' || typeLower === 'aspirasi') {
              defaultLink = '/student/voice';
            } else if (typeLower === 'kencana') {
              if (lowerText.includes('undangan') || lowerText.includes('kelompok') || lowerText.includes('pembimbing')) {
                defaultLink = '/student/kencana/invitations';
              } else {
                defaultLink = '/student/kencana';
              }
            } else {
              defaultLink = '/student/notifikasi';
            }
          }
        }

        const contentRaw = raw.desc ?? raw.pesan ?? raw.Pesan ?? raw.deskripsi ?? raw.Deskripsi ?? '';

        const normalizedRaw = {
          id: raw.id ?? raw.ID,
          title: raw.title ?? raw.judul ?? raw.Judul ?? 'Tanpa Judul',
          content: stripHtmlAndEntities(contentRaw),
          originalContent: contentRaw,
          type: (raw.tipe ?? raw.Tipe ?? raw.type ?? raw.Type ?? 'sistem').toLowerCase(),
          is_read: raw.unread !== undefined ? !raw.unread : (raw.is_read ?? raw.IsRead ?? false),
          created_at: raw.created_at ?? raw.CreatedAt,
          link: defaultLink,
          hasCustomLink: hasCustomLink
        };

        return {
          ...normalizedRaw,
          link: isOrmawa || isPsychologist || isSuperAdmin || isTenagaKesehatan || isKencanaStaff ? normalizedRaw.link : resolveStudentNotificationLink(normalizedRaw)
        };
      });
    },
    enabled: isOpen && hasNotifications // Only load when open AND role has notifications
  });

  const markReadMutation = useMutation({
    mutationFn: async (notifId) => {
      if (isOrmawa) {
        await api.put(`/ormawa/notifications/${notifId}/read`);
      } else if (isPsychologist) {
        await api.put(`/psychologist/notifications/${notifId}/read`);
      } else if (isTenagaKesehatan) {
        await api.put(`/tenagakes/notifikasi/${notifId}/baca`);
      } else {
        await api.put(`/notifikasi/${notifId}/baca`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifikasi']);
      if (isOrmawa) {
        window.dispatchEvent(new Event('ormawa_notifications_updated'));
      } else if (isPsychologist) {
        window.dispatchEvent(new Event('psychologist_notifications_updated'));
      }
    }
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      if (isOrmawa) {
        await api.put(`/ormawa/notifications/read-all?ormawaId=${ormawaId}`);
      } else if (isPsychologist) {
        await api.put(`/psychologist/notifications/read-all`);
      } else if (isTenagaKesehatan) {
        await api.put('/tenagakes/notifikasi/baca-semua');
      } else {
        await api.put('/notifikasi/baca-semua');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['notifikasi']);
      if (isOrmawa) {
        window.dispatchEvent(new Event('ormawa_notifications_updated'));
      } else if (isPsychologist) {
        window.dispatchEvent(new Event('psychologist_notifications_updated'));
      }
    }
  });

  // Handle click away
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Sync with main pages notification updates
  useEffect(() => {
    const handleNotifsUpdate = () => {
      queryClient.invalidateQueries(['notifikasi']);
    };
    window.addEventListener('ormawa_notifications_updated', handleNotifsUpdate);
    window.addEventListener('psychologist_notifications_updated', handleNotifsUpdate);
    return () => {
      window.removeEventListener('ormawa_notifications_updated', handleNotifsUpdate);
      window.removeEventListener('psychologist_notifications_updated', handleNotifsUpdate);
    };
  }, [queryClient]);

  const handleNotifClick = (notif) => {
    if (!notif.is_read) {
      markReadMutation.mutate(notif.id);
    }
    
    if (!notif.hasCustomLink && notif.content) {
      setSelectedNotifDetail(notif);
      setIsOpen(false);
    } else {
      setIsOpen(false);
      if (notif.link) {
        navigate(notif.link);
      }
    }
  };

  const unreadCount = unreadData?.count || 0;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-9 h-9 flex items-center justify-center rounded-full transition-all duration-300 ${isOpen ? 'bg-blue-50 text-blue-600' : 'hover:bg-neutral-100 text-neutral-600'
          }`}
      >
        <Bell size={18} className={unreadCount > 0 ? 'animate-[ring_2s_ease-in-out_infinite]' : ''} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed sm:absolute top-16 sm:top-auto right-4 sm:right-0 mt-3 w-[calc(100vw-32px)] sm:w-[380px] bg-white rounded-3xl border border-neutral-200 shadow-2xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-neutral-900">Notifikasi</h3>
                {unreadCount > 0 && (
                  <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-lg border border-blue-100">
                    {unreadCount} BARU
                  </span>
                )}
              </div>
              <button
                onClick={() => markAllReadMutation.mutate()}
                className="text-xs font-bold text-blue-600 hover:underline disabled:opacity-50"
                disabled={unreadCount === 0}
              >
                Tandai semua dibaca
              </button>
            </div>

            {/* List */}
            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
              {isLoading ? (
                <div className="p-10 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-neutral-400 font-bold">Memuat...</p>
                </div>
              ) : notifData?.length > 0 ? (
                <div className="divide-y divide-neutral-100">
                  {notifData.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotifClick(notif)}
                      className={`p-4 flex gap-3 cursor-pointer transition-colors hover:bg-neutral-50 relative ${!notif.is_read ? 'bg-blue-50/50' : ''
                        }`}
                    >
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center border border-neutral-200 bg-white">
                          {CATEGORY_ICONS[notif.type] || <Bell size={16} />}
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2 mb-0.5">
                          <h4 className={`text-xs truncate ${!notif.is_read ? 'font-bold text-neutral-900' : 'font-medium text-neutral-600'}`}>
                            {notif.title}
                          </h4>
                          <span className="text-[10px] font-medium text-neutral-400 flex-shrink-0">
                            {(() => {
                              if (!notif.created_at) return '';
                              try {
                                return formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: id });
                              } catch (e) {
                                return '';
                              }
                            })()}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed font-semibold">
                          {notif.content}
                        </p>
                      </div>

                      {!notif.is_read && (
                        <div className="flex-shrink-0 self-center">
                          <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-200">
                    <Bell size={28} className="text-neutral-300" />
                  </div>
                  <p className="text-sm font-bold text-neutral-900">Belum ada notifikasi</p>
                  <p className="text-xs text-neutral-400 mt-1">Event terbaru kamu akan muncul di sini.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/app/notifications');
              }}
              className="w-full p-4 border-t border-neutral-100 text-xs font-bold text-neutral-900 hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2"
            >
              Lihat Semua Notifikasi
              <ChevronRight size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Styles for Ring Animation */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes ring {
          0% { transform: rotate(0); }
          5% { transform: rotate(15deg); }
          10% { transform: rotate(-15deg); }
          15% { transform: rotate(10deg); }
          20% { transform: rotate(-10deg); }
          25% { transform: rotate(0); }
          100% { transform: rotate(0); }
        }
      `}} />

      {/* Detail Modal */}
      <Modal
        open={!!selectedNotifDetail}
        onClose={() => setSelectedNotifDetail(null)}
        title="Detail Notifikasi"
        icon={<Bell className="text-blue-600" size={24} />}
        maxWidth="max-w-xl"
      >
        <ModalBody className="p-6">
          {selectedNotifDetail && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-neutral-900 mb-1">{selectedNotifDetail.title}</h2>
                {selectedNotifDetail.created_at && (
                  <p className="text-xs text-neutral-500 font-medium flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-green-500" />
                    {format(new Date(selectedNotifDetail.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                  </p>
                )}
              </div>
              <div className="bg-neutral-50/80 rounded-xl p-5 border border-neutral-100">
                <div 
                  className="prose prose-sm max-w-none text-neutral-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedNotifDetail.originalContent }}
                />
              </div>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <ModalBtn variant="outline" onClick={() => setSelectedNotifDetail(null)}>
            Tutup
          </ModalBtn>
          {selectedNotifDetail?.link && (
            <ModalBtn onClick={() => {
              navigate(selectedNotifDetail.link);
              setSelectedNotifDetail(null);
            }}>
              Lihat Detail
            </ModalBtn>
          )}
        </ModalFooter>
      </Modal>
    </div>
  );
}
