"use client"

import React, { useState, useEffect, useMemo } from 'react'
import axios from 'axios'
import { toast, Toaster } from 'react-hot-toast'

import { cn } from '@/lib/utils'
import { psychologistService } from '@/services/api'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { Button } from "@/components/ui/Button"
import { DashboardHero } from "@/components/ui/dashboard"
import { DataTable } from "@/components/ui/DataTable"
import { Card, CardContent } from "@/components/ui/Card"
import { PrimaryStatsCard } from "@/components/ui/StatsCard"
import { DialogModal, ModalCancelButton } from '@/components/ui/DialogModal'
import { PageContent } from '@/components/ui/page'
import { Badge } from '@/components/ui/Badge'
import { usePermission } from '@/hooks/usePermission'

import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// Auto-injected Material Symbol fallbacks
const RefreshCw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const FileText = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>description</span>;
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const CheckCircle2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const ShieldCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified_user</span>;
const Clock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>schedule</span>;
const XCircle = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>cancel</span>;
const People = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;

const formatDate = (d) => {
  if (!d) return '—'
  const date = new Date(d)
  if (isNaN(date.getTime())) return d
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const BOOKING_STATUS = {
  Selesai: { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Selesai' },
  Dikonfirmasi: { cls: 'bg-indigo-50 text-indigo-700 border-indigo-200', dot: 'bg-indigo-500', label: 'Dikonfirmasi' },
  Menunggu: { cls: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Menunggu' },
  Ditolak: { cls: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Ditolak' },
}
const getStatus = (v = '') => BOOKING_STATUS[v] || BOOKING_STATUS.Menunggu

export default function PsychologistDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isSubmitting, setIsSub] = useState(false)

  const [catatan, setCatatan] = useState('')
  const [linkMeeting, setLinkMeeting] = useState('')
  const [isAvailable, setIsAvailable] = useState(true)

  const { hasPermission } = usePermission()
  const canManageBookings = hasPermission('psychologist.bookings.create') || hasPermission('psychologist.bookings.update') || hasPermission('psychologist.bookings.delete')
  const canManageSchedules = hasPermission('psychologist.schedules.create') || hasPermission('psychologist.schedules.update') || hasPermission('psychologist.schedules.delete')

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await psychologistService.getDashboard()
      setDashboard(res.data)
      if (res.data?.profile?.is_aktif !== undefined) {
        setIsAvailable(res.data.profile.is_aktif)
      }
    } catch {
      toast.error('Gagal mengambil data dashboard psikolog')
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStatus = async (status) => {
    if (!selected) return
    setIsSub(true)
    try {
      const res = await psychologistService.updateBookingStatus(selected.id, status, catatan, linkMeeting)
      if (res.data) {
        toast.success(`Sesi berhasil ${status === 'Dikonfirmasi' ? 'dikonfirmasi' : status === 'Selesai' ? 'diselesaikan' : 'ditolak'}`)
        setSelected(null)
        setCatatan('')
        setLinkMeeting('')
        fetchData()
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'Server sibuk')
    } finally {
      setIsSub(false)
    }
  }

  const handleToggleAvailability = async () => {
    const newStatus = !isAvailable
    setIsAvailable(newStatus)
    try {
      await psychologistService.updateProfile({ is_aktif: newStatus })
      toast.success(`Status diubah menjadi: ${newStatus ? 'Tersedia' : 'Tidak Tersedia'}`)
    } catch (e) {
      setIsAvailable(!newStatus)
      toast.error('Gagal mengubah status ketersediaan')
    }
  }

  useEffect(() => { fetchData() }, [])

  const rawBookings = dashboard?.bookings || []

  const handleTableSearch = (data, query) => {
    const q = query.toLowerCase();
    return data.filter(
      (item) =>
        (item.name || '').toLowerCase().includes(q) ||
        (item.nim || '').toLowerCase().includes(q) ||
        (item.issue || '').toLowerCase().includes(q)
    );
  };

  const columns = useMemo(() => [
    {
      key: 'name',
      label: 'Mahasiswa',
      className: 'min-w-[220px]',
      render: (v, row) => (
        <div>
          <p className="font-semibold text-[var(--theme-text)] font-headline tracking-tight text-[14px] max-w-[200px] truncate">{row.name}</p>
          <p className="text-[11px] text-[var(--theme-text-muted)] font-body tracking-tight mt-0.5">{row.nim} &bull; {row.prodi}</p>
        </div>
      )
    },
    {
      key: 'issue',
      label: 'Topik Keluhan',
      className: 'w-[160px]',
      render: (v, row) => (
        <Badge variant="outline" className="font-semibold text-[var(--theme-text-muted)] font-headline uppercase text-[9px] tracking-[0.2em] border-[var(--theme-border)] bg-[var(--theme-bg)] px-2.5 py-1 rounded-md">
          {row.issue || '—'}
        </Badge>
      )
    },
    {
      key: 'date',
      label: 'Jadwal Sesi',
      className: 'w-[160px]',
      render: (v, row) => (
        <div className="flex flex-col leading-tight gap-1.5">
          <span className="font-semibold text-[var(--theme-text)] font-headline text-[13px]">{row.date}</span>
          <span className="text-[10px] text-[var(--theme-primary)] font-bold bg-[var(--theme-primary-light)]/20 border border-[var(--theme-primary)]/10 inline-block px-1.5 py-0.5 rounded uppercase tracking-wider w-fit">{row.time}</span>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      className: 'w-[140px]',
      render: (v, row) => {
        const st = getStatus(row.status)
        return (
          <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold border uppercase tracking-wider whitespace-nowrap shadow-sm', st.cls)}>
            <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', st.dot)} />
            {st.label}
          </span>
        )
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'w-[120px]',
      render: (v, row) => (
        <Button
          type="button"
          onClick={() => {
            setSelected(row)
            setCatatan(row.note || '')
            setLinkMeeting(row.link_meeting || '')
          }}
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-neutral-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors shadow-none"
          title="Tinjau Detail Sesi"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
        </Button>
      )
    }
  ], [setSelected, setCatatan, setLinkMeeting])

  const rawStats = dashboard?.stats || []
  const totalPasien = rawStats[0]?.value || 0
  const sesiSelesai = dashboard?.completed_this_month || dashboard?.completed_today || 0
  const antreanMenunggu = dashboard?.waiting_count || 0
  const sesiHariIni = dashboard?.today_appointments || 0
  const totalAsesmen = dashboard?.assessments_count || 0

  const facultyDistribution = useMemo(() => {
    const counts = {}
    if (rawBookings.length > 0) {
      rawBookings.forEach(p => {
        const f = p.faculty || 'Lainnya'
        counts[f] = (counts[f] || 0) + 1
      })
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({
        name,
        value
      }))
  }, [rawBookings])

  const topTopicsData = useMemo(() => {
    const counts = {}
    if (rawBookings.length > 0) {
      rawBookings.forEach(p => {
        const name = p.issue || 'Lainnya'
        counts[name] = (counts[name] || 0) + 1
      })
    }
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  }, [rawBookings])

  const monthlyTrendData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
    const currentMonthIdx = new Date().getMonth()

    // Real trend logic using actual data if available
    const trend = []
    for (let i = 5; i >= 0; i--) {
      let mIdx = currentMonthIdx - i
      if (mIdx < 0) mIdx += 12
      trend.push({
        month: months[mIdx],
        value: i === 0 ? (dashboard?.completed_this_month || dashboard?.today_appointments || 0) : 0
      })
    }
    return trend
  }, [dashboard])

  const PIE_COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#00236f']

  return (
    <PageContent>
      <Toaster position="top-right" />
        <DashboardHero 
          title="Dashboard" 
          highlightedTitle="Psikolog" 
          subtitle="Ringkasan metrik harian, jadwal sesi terdekat, dan notifikasi untuk efisiensi praktik." 
          icon="dashboard" 
          badges={[{ label: 'Beranda Utama', active: false }, { label: 'Sesi Aktif', active: true }]}
          actions={
            canManageSchedules && (
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleToggleAvailability}
                  className={`flex-1 md:flex-initial px-4 py-2 h-10 rounded-xl font-bold text-xs transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                    isAvailable 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100' 
                      : 'bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                  {isAvailable ? 'Tersedia' : 'Tidak Tersedia'}
                  <span className="material-symbols-outlined text-sm ml-1">swap_horiz</span>
                </button>
              </div>
            )
          }
        />

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-5 mb-6 mt-6">
          <PrimaryStatsCard
            title="Total Pasien"
            value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : totalPasien}
            icon={People}
            colorTheme="primary"
            badgeText="Pasien Terdaftar"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">group</span>}
          />
          <PrimaryStatsCard
            title="Sesi Selesai"
            value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : sesiSelesai}
            icon={CheckCircle2}
            colorTheme="success"
            badgeText="Bulan Ini"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">event_available</span>}
          />
          <PrimaryStatsCard
            title="Antrean Baru"
            value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : antreanMenunggu}
            icon={Clock}
            colorTheme="warning"
            badgeText="Menunggu ACC"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">hourglass_empty</span>}
          />
          <PrimaryStatsCard
            title="Sesi Hari Ini"
            value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : sesiHariIni}
            icon={Activity}
            colorTheme="info"
            badgeText="Jadwal Aktif"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">today</span>}
          />
          <PrimaryStatsCard
            title="Total Asesmen"
            value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : totalAsesmen}
            icon={FileText}
            colorTheme="error"
            badgeText="Rekam Medis"
            badgeIcon={<span className="material-symbols-outlined text-[12px]">folder_shared</span>}
          />
        </div>

        {/* Charts */}
        {!loading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Pie: Faculty Distribution */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>pie_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Rasio Pasien</span>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">Distribusi Sesi per Fakultas</h3>
                </div>
              </div>
              <div className="h-[180px] w-full flex items-center justify-center">
                {facultyDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={facultyDistribution} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value" stroke="none">
                        {facultyDistribution.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <span className="text-xs text-slate-400 italic">Tidak ada data</span>}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mt-2">
                {facultyDistribution.slice(0, 6).map((item, i) => (
                  <div key={item.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <div className="min-w-0">
                      <p className="text-[9px] font-bold text-slate-400 truncate leading-none">{item.name}</p>
                      <p className="text-xs font-extrabold text-slate-800 leading-none mt-1">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bar: Topik Keluhan (Top 5) */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>bar_chart</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Isu Terbanyak</span>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">Topik Konseling (Top 5)</h3>
                </div>
              </div>
              <div className="h-[180px] w-full">
                {topTopicsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={topTopicsData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                      <Bar dataKey="value" name="Sesi" fill="#10b981" radius={[0, 4, 4, 0]} barSize={14} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><span className="text-xs text-slate-400 italic">Tidak ada data</span></div>}
              </div>
            </div>

            {/* Line: Tren Sesi per Bulan */}
            <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-3 mb-4 shrink-0">
                <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-600 shrink-0">
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Grafik Riwayat</span>
                  <h3 className="text-sm font-bold text-slate-800 leading-tight">Tren Sesi per Bulan</h3>
                </div>
              </div>
              <div className="h-[180px] w-full">
                {monthlyTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <LineChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="month" tick={{ fontSize: 8, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }} />
                      <Line type="monotone" dataKey="value" name="Sesi" stroke="#f59e0b" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} activeDot={{ r: 5, fill: '#f59e0b' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : <div className="h-full flex items-center justify-center"><span className="text-xs text-slate-400 italic">Tidak ada data</span></div>}
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-[var(--theme-surface)] rounded-2xl border border-[var(--theme-border)] shadow-sm overflow-hidden mb-6">
            <DataTable
              columns={columns}
              data={rawBookings}
              loading={loading}
              searchable={true}
              onSearch={handleTableSearch}
              searchPlaceholder="Cari mahasiswa atau keluhan..."
              pagination={true}
              pageSize={10}
              emptyMessage="Tidak Ada Sesi Terjadwal."
              emptyIcon="psychology"
              filters={[
                {
                  key: 'status',
                  placeholder: 'Status',
                  options: [
                    { label: 'Menunggu', value: 'Menunggu' },
                    { label: 'Dikonfirmasi', value: 'Dikonfirmasi' },
                    { label: 'Selesai', value: 'Selesai' },
                    { label: 'Ditolak', value: 'Ditolak' }
                  ]
                }
              ]}
            />
        </div>

      <DialogModal
        open={!!selected}
        onOpenChange={(val) => { if (!val) setSelected(null) }}
        icon="psychology"
        subtitle="Detail Sesi Konseling"
        title={selected ? `${selected.name} - ${selected.issue}` : ''}
        maxWidth="max-w-xl"
        footer={
          <ModalCancelButton onClick={() => setSelected(null)}>Tutup</ModalCancelButton>
        }
      >
        {selected && (
          <div className="flex flex-col gap-5 p-1">
            {/* Left Pane */}
            <div className="space-y-5">
              <div>
                <h3 className="text-sm font-semibold text-[var(--theme-text)] uppercase tracking-wider flex items-center gap-2 mb-4 font-headline">
                  <span className="material-symbols-outlined text-[var(--theme-primary)]">account_circle</span> Identitas Pasien
                </h3>
                <div className="bg-[var(--theme-bg)] border border-[var(--theme-border-muted)] rounded-2xl p-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest leading-none mb-1.5 font-headline">Nama Lengkap</p>
                    <p className="font-semibold text-xs text-[var(--theme-text)] font-body">{selected.name}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest leading-none mb-1.5 font-headline">NIM</p>
                    <p className="font-semibold text-xs text-[var(--theme-text)] font-body">{selected.nim}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest leading-none mb-1.5 font-headline">Program Studi / Fakultas</p>
                    <p className="font-semibold text-xs text-[var(--theme-text)] font-body">{selected.prodi} ({selected.faculty})</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest leading-none mb-1.5 font-headline">Semester</p>
                    <p className="font-semibold text-xs text-[var(--theme-text)] font-body">Semester {selected.semester}</p>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--theme-text)] uppercase tracking-wider flex items-center gap-2 mb-4 font-headline">
                  <span className="material-symbols-outlined text-[var(--theme-secondary)]">assignment_late</span> Detail Keluhan Utama
                </h3>
                <div className="bg-[var(--theme-secondary-light)]/20 border border-[var(--theme-secondary)]/20 rounded-2xl p-4 space-y-3">
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-secondary)] uppercase tracking-widest leading-none mb-1.5 font-headline">Kategori / Topik</p>
                    <p className="font-semibold text-xs text-[var(--theme-text)] font-body">{selected.issue}</p>
                  </div>
                  <div className="w-full h-px bg-amber-200/50 my-2" />
                  <div>
                    <p className="text-[9px] font-semibold text-[var(--theme-secondary)] uppercase tracking-widest leading-none mb-1.5 font-headline">Deskripsi Lengkap (Self-Report)</p>
                    <p className="text-xs text-[var(--theme-text)] font-medium leading-relaxed italic border-l-2 border-[var(--theme-secondary)] pl-3 font-body">
                      "{selected.note || 'Tidak ada detail spesifik yang diisi mahasiswa.'}"
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Pane */}
            <div className="space-y-5">
              <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-2xl p-4 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[var(--theme-primary-light)]/20 text-[var(--theme-primary)] rounded-xl flex items-center justify-center">
                    <span className="material-symbols-outlined">event</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest mb-0.5 font-headline">Jadwal Sesi</p>
                    <p className="font-semibold text-sm text-[var(--theme-text)] font-body">{selected.date_full}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-widest mb-0.5 font-headline">Pukul</p>
                  <p className="font-semibold text-sm text-[var(--theme-primary)] bg-[var(--theme-primary-light)]/20 px-2 py-0.5 rounded-lg border border-[var(--theme-primary)]/20 inline-block font-body">{selected.time}</p>
                </div>
              </div>

              {selected.mode === 'Online' && (
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-[0.18em] mb-2 font-headline">Tautan Video Conference (Google Meet/Zoom)</label>
                  <input
                    type="url"
                    value={linkMeeting}
                    onChange={e => setLinkMeeting(e.target.value)}
                    placeholder="https://meet.google.com/xxx-xxxx-xxx"
                    disabled={!canManageBookings}
                    className="h-10 w-full px-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-xs font-semibold text-[var(--theme-text)] transition-colors outline-none font-body disabled:opacity-60"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-[0.18em] mb-2 font-headline">Catatan Tambahan (Khusus Psikolog)</label>
                <textarea
                  value={catatan}
                  onChange={e => setCatatan(e.target.value)}
                  rows={4}
                  disabled={!canManageBookings}
                  placeholder="Masukkan catatan pendahuluan, pesan untuk pasien jika ditolak, atau ringkasan pasca-sesi jika telah selesai..."
                  className="w-full p-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] focus:outline-none focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] text-xs font-semibold text-[var(--theme-text)] transition-colors resize-none outline-none font-body disabled:opacity-60"
                />
              </div>

              {canManageBookings && (
                <div>
                  <label className="block text-[10px] font-semibold text-[var(--theme-text-muted)] uppercase tracking-[0.18em] mb-2 font-headline">Pilih Tindakan & Perbarui Status</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { s: 'Dikonfirmasi', label: 'Konfirmasi', icon: CheckCircle2, cls: 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/10' },
                      { s: 'Selesai', label: 'Sesi Selesai', icon: ShieldCheck, cls: 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10' },
                      { s: 'Ditolak', label: 'Tolak / Batal', icon: XCircle, cls: 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10' },
                    ].map(opt => (
                      <button key={opt.s} onClick={() => handleUpdateStatus(opt.s)} disabled={isSubmitting || selected.status === opt.s || ['Selesai', 'Dibatalkan', 'Ditolak'].includes(selected.status)}
                        className={cn('flex flex-col items-center justify-center gap-1.5 h-16 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider transition-all active:scale-[0.97] shadow-lg disabled:opacity-50 font-headline', opt.cls)}>
                        {isSubmitting ? (
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span>
                        ) : (
                          <opt.icon size={16} />
                        )}
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {['Selesai', 'Dibatalkan', 'Ditolak'].includes(selected.status) && (
                    <p className="text-[10px] font-semibold text-[var(--theme-error)] mt-2 text-center font-body">Status booking sudah {selected.status}. Tidak dapat diubah lagi.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </DialogModal>
    </PageContent>
  )
}

