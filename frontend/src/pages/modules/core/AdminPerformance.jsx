"use client"

import React, { useState, useEffect } from 'react'
import { adminService } from '@/services/api'
import { toast, Toaster } from 'react-hot-toast'

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCcw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const User = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Database = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>storage</span>;
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const Edit3 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>edit</span>;
const Trash2 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>delete</span>;



const AdminPerformance = () => {
    const [logs, setLogs] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadLogs()
    }, [])

    const loadLogs = async () => {
        try {
            setLoading(true)
            const res = await adminService.getAuditLogs()
            if (res.status === 'success') {
                setLogs(res.data || [])
            } else {
                toast.error('Gagal memuat basis data audit')
            }
        } catch (error) {
            toast.error('Koneksi intelijen terputus')
        } finally {
            setLoading(false)
        }
    }

    const getActionIcon = (activity = '') => {
        const act = activity.toUpperCase()
        if (act.includes('DELETE')) return <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >delete</span>
        if (act.includes('UPDATE') || act.includes('EDIT')) return <Edit3 size={18} />
        return <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >show_chart</span>
    }

    const getActionColors = (activity = '') => {
        const act = activity.toUpperCase()
        if (act.includes('DELETE')) return 'bg-rose-50 text-rose-600 border-rose-100'
        if (act.includes('UPDATE')) return 'bg-amber-50 text-amber-600 border-amber-100'
        return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    }

    return (
        <PageContent>
            <Toaster position="top-right" />
            
            <div className="max-w-[1600px] mx-auto space-y-8 select-none">
                
                {/* ── Page Header ─────────────────────────────────────────── */}
                <DashboardHero
                    title="Performance"
                    highlightedTitle="& Audit"
                    subtitle="Monitoring aktivitas sistem real-time, audit jejak digital administratif, dan pemantauan integritas data universitas."
                    icon="security"
                    badges={[
                        { label: 'Security Forensics', active: true }
                    ]}
                    action={
                        <Button 
                            onClick={loadLogs}
                            disabled={loading}
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-slate-200 bg-white text-slate-500 hover:bg-slate-100 shadow-none gap-2 transition-all active:scale-95 cursor-pointer font-headline"
                        >
                            <RefreshCcw size={16} className={cn(loading && "animate-spin")} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Refresh Logs</span>
                        </Button>
                    }
                />

                {/* ── Stats Summary ────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Events', val: logs.length, color: 'text-bku-primary', icon: Database, desc: 'Aktivitas Tercatat' },
                        { label: 'Create Actions', val: logs.filter(l => l.Aktivitas?.includes('CREATE')).length, color: 'text-emerald-600', icon: Activity, desc: 'Entri Data Baru' },
                        { label: 'Update Actions', val: logs.filter(l => l.Aktivitas?.includes('UPDATE')).length, color: 'text-amber-600', icon: Edit3, desc: 'Modifikasi Aktif' },
                        { label: 'Delete Actions', val: logs.filter(l => l.Aktivitas?.includes('DELETE')).length, color: 'text-rose-600', icon: Trash2, desc: 'Penghapusan Terdeteksi' },
                    ].map((s, i) => (
                        <Card key={i} className="glass-card border border-slate-200/60 shadow-none rounded-2xl overflow-hidden group hover:border-bku-primary/20 transition-all">
                            <CardContent className="p-6 space-y-3">
                                <div className="flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">{s.label}</p>
                                    <div className="p-2 rounded-xl bg-slate-100/50 text-slate-500 group-hover:bg-bku-primary/10 group-hover:text-bku-primary transition-all">
                                        <s.icon size={18} />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <h3 className={cn("text-2xl font-black font-headline tracking-tight", s.color)}>
                                        {loading ? '...' : s.val.toString().padStart(2, '0')}
                                    </h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">{s.desc}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* ── Audit Timeline ───────────────────────────────────────── */}
                <Card className="glass-card border border-slate-200/60 shadow-none rounded-2xl overflow-hidden">
                    <div className="p-6 border-b border-slate-200/40 bg-white/40 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="size-8 rounded-lg bg-bku-primary/10 flex items-center justify-center text-bku-primary">
                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >search</span>
                            </div>
                            <h3 className="text-sm font-black font-headline uppercase tracking-tight" style={{ color: 'var(--theme-h3)' }}>Audit Trail Timeline</h3>
                        </div>
                        <Badge className="px-3 py-1 bg-white border border-slate-200/60 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg shadow-none font-headline">
                            Real-time Stream
                        </Badge>
                    </div>
                    
                    <CardContent className="p-0">
                        <div className="divide-y divide-slate-200/40 max-h-[700px] overflow-y-auto custom-scrollbar">
                            {loading ? (
                                <div className="py-32 flex flex-col items-center gap-4">
                                    <span className="material-symbols-outlined size-10 animate-spin text-bku-primary/30" >sync</span>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-headline">Synchronizing Security Hub...</p>
                                </div>
                            ) : logs.length === 0 ? (
                                <div className="py-32 flex flex-col items-center gap-4">
                                    <div className="size-16 rounded-full bg-slate-100/50 flex items-center justify-center text-slate-300">
                                        <span className="material-symbols-outlined" style={{ fontSize: '32px' }} >error</span>
                                    </div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">No activities detected in current buffer.</p>
                                </div>
                            ) : logs.map((log) => (
                                <div key={log.ID} className="p-6 md:p-8 hover:bg-slate-50/50 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-6 group">
                                    <div className="flex gap-6 items-start">
                                        <div className={cn(
                                            "size-12 rounded-2xl flex items-center justify-center shadow-none shrink-0 transition-transform group-hover:scale-105 border-none",
                                            getActionColors(log.Aktivitas || '')
                                        )}>
                                            {getActionIcon(log.Aktivitas || '')}
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-4 flex-wrap">
                                                <span className="text-slate-800 font-black text-sm uppercase tracking-tight font-headline">{log.Aktivitas}</span>
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '12px' }} >schedule</span>
                                                    <span className="text-[10px] font-black uppercase tabular-nums font-headline">{new Date(log.CreatedAt).toLocaleTimeString('id-ID')}</span>
                                                </div>
                                            </div>
                                            <p className="text-xs font-medium text-slate-500 max-w-2xl leading-relaxed font-inter italic group-hover:text-slate-700 transition-colors">
                                                "{log.Deskripsi || 'Tidak ada rincian metadata aktivitas.'}"
                                            </p>
                                            <div className="flex items-center gap-3 mt-2 flex-wrap">
                                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50/50 border border-slate-200/60">
                                                    <User size={10} className="text-slate-400" />
                                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest font-headline">
                                                        {log.Pengguna?.Email || log.User?.Email || 'SYSTEM'}
                                                    </span>
                                                </div>
                                                {log.IPAddress && (
                                                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50/50 border border-slate-200/60">
                                                        <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '10px' }} >location_on</span>
                                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest tabular-nums font-headline">
                                                            {log.IPAddress}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <span className="text-[9px] font-black text-bku-primary uppercase tracking-widest font-headline">Integrity Verified</span>
                                        <span className="text-[10px] font-medium text-slate-400 uppercase tracking-tighter mt-1 tabular-nums">{new Date(log.CreatedAt).toLocaleDateString('id-ID')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* ── Security Banner ───────────────────────────────────────── */}
                <div className="bg-slate-900 rounded-2xl p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group shadow-none border border-slate-800">
                   <div className="absolute inset-0 bg-bku-primary/20 pointer-events-none" />
                   <div className="flex items-center gap-6 relative z-10">
                      <div className="size-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-bku-primary group-hover:scale-110 transition-transform">
                         <span className="material-symbols-outlined" style={{ fontSize: '32px' }} >security</span>
                      </div>
                      <div className="space-y-1">
                         <h4 className="text-lg font-black font-headline" style={{ color: 'var(--theme-h4)' }}>Immutable Audit Infrastructure</h4>
                         <p className="text-slate-400 text-[11px] font-black font-headline uppercase tracking-widest leading-relaxed">Seluruh log aktivitas bersifat read-only dan dilindungi secara kriptografis.</p>
                      </div>
                   </div>
                   <div className="flex items-center gap-2 relative z-10">
                      <div className="size-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                      <span className="text-[10px] font-black font-headline text-slate-400 uppercase tracking-widest">System Status: Secure</span>
                   </div>
                </div>

            </div>
        </PageContent>
    )
}

export default AdminPerformance
