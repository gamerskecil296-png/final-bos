"use client"
import React, { useState, useEffect } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';



import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

import { cn } from '@/lib/utils'
import { toast, Toaster } from 'react-hot-toast'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { stripHtmlAndEntities } from '@/lib/utils'

// Auto-injected Material Symbol fallbacks for Lucide icons
const FileText = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    description
  </span>
)
const Calendar = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    calendar_today
  </span>
)
const Users = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    group
  </span>
)
const DollarSign = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    attach_money
  </span>
)
const Megaphone = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    campaign
  </span>
)
const Bell = ({ size, className, style, ...props }) => (
  <span className={cn('material-symbols-outlined', className)} style={{ fontSize: size || 24, ...style }} {...props}>
    notifications
  </span>
)

const API = `${API_BASE_URL}/ormawa`
const ICON_MAP = { 
  proposal: FileText, 
  kegiatan: Calendar, 
  anggota: Users, 
  keuangan: DollarSign, 
  pengumuman: Megaphone 
}

const TIPE_COLORS = {
  proposal: 'bg-blue-50 text-blue-600 border-blue-100',
  kegiatan: 'bg-amber-50 text-amber-600 border-amber-100',
  anggota: 'bg-violet-50 text-violet-600 border-violet-100',
  keuangan: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  pengumuman: 'bg-rose-50 text-rose-600 border-rose-100',
}

export default function Notifikasi() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const ormawaId = getOrmawaId()

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetchWithAuth(`${API}/notifications?ormawaId=${ormawaId}`)
      if (res.status === 'success') {
        const mapped = (res.data || []).map(n => {
          const pesanRaw = n.pesan ?? n.Pesan;
          return {
            id: n.id ?? n.ID,
            tipe: n.tipe ?? n.Tipe,
            judul: n.judul ?? n.Judul,
            pesan: stripHtmlAndEntities(pesanRaw),
            is_read: n.is_read ?? n.IsRead ?? false,
            created_at: n.created_at ?? n.CreatedAt,
          };
        })
        setNotifications(mapped)
      } else {
        // Fallback demo notifications for design preview
        setNotifications([
          { id: 1, judul: 'Proposal diajukan', pesan: 'Proposal "Webinar Nasional" telah diajukan ke dosen pembina.', tipe: 'proposal', is_read: false, created_at: new Date().toISOString() },
          { id: 2, judul: 'Kegiatan baru dijadwalkan', pesan: 'Latihan rutin telah ditambahkan ke jadwal minggu ini.', tipe: 'kegiatan', is_read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
          { id: 3, judul: 'Anggota baru bergabung', pesan: '3 mahasiswa baru telah bergabung sebagai anggota aktif.', tipe: 'anggota', is_read: false, created_at: new Date(Date.now() - 172800000).toISOString() },
        ])
      }
    } catch {
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await fetchWithAuth(`${API}/notifications/read-all`, { 
        method: 'PUT', 
        body: JSON.stringify({ OrmawaID: ormawaId }),
        headers: { 'Content-Type': 'application/json' }
      })
      if (res.status === 'success') {
        setNotifications(n => n.map(item => ({ ...item, is_read: true })))
        toast.success('Semua notifikasi ditandai telah dibaca')
        window.dispatchEvent(new Event('ormawa_notifications_updated'))
      }
    } catch (err) {
      toast.error('Gagal memperbarui status notifikasi')
    }
  }

  const handleMarkRead = async (id) => {
    if (!id) return
    try {
      await fetchWithAuth(`${API}/notifications/${id}/read`, { method: 'PUT' })
      setNotifications(n => n.map(item => item.id === id ? { ...item, is_read: true } : item))
      window.dispatchEvent(new Event('ormawa_notifications_updated'))
    } catch {}
  }

  useEffect(() => {
    fetchData()

    const handleNotifsUpdate = () => {
      fetchData()
    }
    window.addEventListener('ormawa_notifications_updated', handleNotifsUpdate)
    return () => {
      window.removeEventListener('ormawa_notifications_updated', handleNotifsUpdate)
    }
  }, [ormawaId])

  const unreadCount = notifications.filter(n => !n.is_read).length
  const totalCount = notifications.length
  const proposalCount = notifications.filter(n => n.tipe === 'proposal').length
  const infoCount = notifications.filter(n => n.tipe !== 'proposal').length

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

            {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <PageHeader 
        title="Pusat Notifikasi"
        subtitle="Pantau perkembangan proposal, perubahan jadwal, dan pembukuan keuangan ormawa."
        icon="notifications"
        action={
          <Button 
              onClick={handleMarkAllRead} 
              className="h-10 px-6 rounded-xl text-white font-bold text-xs tracking-wider shadow-lg shadow-[var(--theme-primary)]/10 transition-all active:scale-95 shrink-0 w-full lg:w-auto flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>done_all</span>
              <span>TANDAI SEMUA DIBACA</span>
            </Button>
        }
       
        breadcrumbs={[ { label: 'Dashboard', path: '/ormawa' }, { label: 'Pusat Notifikasi', path: '#' } ]} 
      />

      {/* ── Content Area ───────────────────────────────────────────── */}
      <Card className="border border-border shadow-sm rounded-2xl overflow-hidden bg-surface">
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="py-5 first:pt-0 last:pb-0 flex items-start gap-4 animate-pulse">
                  <div className="size-12 bg-slate-100 rounded-2xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-slate-100 rounded w-1/4" />
                    <div className="h-2.5 bg-slate-100 rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="size-16 rounded-2xl bg-[var(--theme-bg)] border border-border flex items-center justify-center text-[var(--theme-text-subtle)]">
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>notifications_off</span>
              </div>
              <div className="text-center space-y-1">
                <p className="font-bold text-[13px] tracking-widest text-[var(--theme-text)] uppercase font-headline">Semua Sudah Dibaca</p>
                <p className="text-xs font-semibold text-[var(--theme-text-muted)]">Tidak ada notifikasi baru untuk kepengurusan Anda saat ini.</p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map((notif) => {
                const Icon = ICON_MAP[notif.tipe] || Bell
                const iconColor = TIPE_COLORS[notif.tipe] || 'bg-slate-50 text-slate-500 border-slate-100'

                return (
                  <div 
                    key={notif.id} 
                    onClick={() => handleMarkRead(notif.id)}
                    className={cn(
                      'py-5 first:pt-0 last:pb-0 flex flex-row items-start gap-3 sm:gap-4 transition-all duration-200 cursor-pointer group',
                      notif.is_read 
                        ? 'bg-transparent hover:bg-slate-50/50' 
                        : 'bg-blue-50/20 hover:bg-blue-50/40'
                    )}
                  >
                    {/* Icon Container */}
                    <div className={cn('size-10 sm:size-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-transform group-hover:scale-105 duration-200', iconColor)}>
                      <Icon size={18} className="sm:size-5" />
                    </div>

                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                        <div className="space-y-1 flex-1 min-w-0">
                          <p className={cn(
                            'font-headline tracking-tight text-[13px] transition-colors truncate',
                            notif.is_read 
                              ? 'text-slate-600 font-bold' 
                              : 'text-slate-900 font-black'
                          )}>
                            {notif.judul}
                          </p>
                          <p className="text-xs font-semibold text-slate-500 leading-relaxed max-w-4xl break-words">
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
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </PageContent>
  )
}
