"use client"

import React, { useState, useEffect } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Terminal = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>terminal</span>;
const Download = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>;



const ACTION_STYLES = {
  LOGIN: 'bg-emerald-100 text-emerald-700',
  LOGOUT: 'bg-neutral-100 text-neutral-500',
  CREATE: 'bg-blue-100 text-blue-700',
  UPDATE: 'bg-amber-100 text-amber-700',
  DELETE: 'bg-rose-100 text-rose-700',
  APPROVE: 'bg-violet-100 text-violet-700',
  REJECT: 'bg-rose-100 text-rose-700',
  DEFAULT: 'bg-neutral-100 text-neutral-500'
}

const getActionStyle = (action = '') => {
  const k = Object.keys(ACTION_STYLES).find(k => action.toUpperCase().includes(k))
  return ACTION_STYLES[k] || ACTION_STYLES.DEFAULT
}

export default function AuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await adminService.getAuditLogs()
      if (res.status === 'success') setLogs(res.data || [])
      else toast.error('Gagal memuat log sistem')
    } catch { toast.error('Koneksi sistem terputus') } finally { setLoading(false) }
  }

  const handleExport = async () => {
    try {
      toast.loading('Memulai ekspor log forensik...', { id: 'export-audit' });
      await adminService.exportAuditLogsCSV();
      toast.success('Berhasil mengekspor log forensik', { id: 'export-audit' });
    } catch (err) {
      console.error('[Export Error]', err);
      toast.error('Gagal mengekspor data forensik', { id: 'export-audit' });
    }
  };

  useEffect(() => { fetchData() }, [])

  const columns = [
    {
      key: 'Aktivitas',
      label: 'Tindakan',
      className: 'w-[180px]',
      render: v => (
        <Badge className={cn('px-3 py-0.5 rounded-lg border-none shadow-none text-[9px] font-black uppercase tracking-widest font-headline', getActionStyle(v))}>
          {(v || '—').replace(/_/g, ' ')}
        </Badge>
      )
    },
    {
      key: 'Deskripsi',
      label: 'Detail Aktivitas',
      className: 'min-w-[350px]',
      render: v => <span className="font-medium text-neutral-900 text-[13px] font-inter leading-relaxed">{v || '—'}</span>
    },
    {
      key: 'User',
      label: 'Operator / Alamat IP',
      className: 'w-[250px]',
      render: (v, row) => (
        <div className="flex flex-col">
          <span className="font-bold text-neutral-900 text-[13px] font-jakarta tracking-tight leading-tight">{row.User?.nama_lengkap || row.User?.email || '—'}</span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Terminal size={10} className="text-neutral-300" />
            <span className="text-[10px] text-neutral-400 font-bold tabular-nums tracking-widest uppercase">{row.IPAddress || '0.0.0.0'}</span>
          </div>
        </div>
      )
    },
    {
      key: 'created_at',
      label: 'Timestamp',
      className: 'w-[180px]',
      render: v => (
        <div className="flex flex-col">
          <span className="font-bold text-neutral-900 text-[11px] font-jakarta">
            {v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
          </span>
          <span className="text-[10px] font-medium text-neutral-400 tabular-nums uppercase">
            {v ? new Date(v).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '—'} WIB
          </span>
        </div>
      )
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      <div className="max-w-[1600px] mx-auto space-y-10">

        {/* ── Page Header ─────────────────────────────────────────── */}
        <DashboardHero
          title="Audit"
          highlightedTitle="Log"
          subtitle="Rekaman jejak operasional sistem, perubahan data, dan aktivitas otentikasi secara transparan."
          icon="history"
          badges={[
            { label: 'Security Forensics', active: true }
          ]}
          actions={
            <Button
              onClick={handleExport}
              className="h-11 px-6 rounded-xl bg-slate-800 text-white font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-none border-none cursor-pointer"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={3}>download</span>
              Ekspor Forensik
            </Button>
          }
        />

        {/* ── Table Section ────────────────────────────────────────── */}
        <Card className="glass-card shadow-sm rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-300 mb-6">
          <CardContent className="p-0">
            <DataTable
              title="Laporan Audit Log"
              subtitle="Menampilkan daftar seluruh log audit."
              columns={columns}
              data={logs}
              loading={loading}
              searchPlaceholder="Cari operator, aktivitas, atau alamat IP..."
              searchWidth="max-w-md"
            />
          </CardContent>
        </Card>


      </div>
    </PageContent>
  )
}
