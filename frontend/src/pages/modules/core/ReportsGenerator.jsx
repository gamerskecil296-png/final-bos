"use client"

import React, { useState } from 'react'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { cn } from '@/lib/utils'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Layers = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>layers</span>;
const Download = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>download</span>;
const PieChart = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>pie_chart</span>;
const Database = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>storage</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const BarChart3 = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>bar_chart</span>;



const ShieldCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified_user</span>;
const Zap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>bolt</span>;
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;



const ReportsGenerator = () => {
    const stats = [
        { label: "Faculty Accuracy", value: "98.2%", trend: "+2.1%", icon: BarChart3, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
        { label: "Data Integrity", value: "100%", trend: "Synced", icon: ShieldCheck, color: "text-bku-primary", bg: "bg-bku-primary/10", border: "border-none" },
        { label: "Export Latency", value: "0.2s", trend: "Optimized", icon: Zap, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
        { label: "Active Nodes", value: "45", trend: "All Online", icon: Users, color: "text-slate-600", bg: "bg-slate-100", border: "border-slate-200" },
    ]

    const reports = [
        { name: "Laporan Bulanan Layanan Kemahasiswaan", lastRun: "Hari ini, 10:00", size: "1.2 MB", type: "PDF/XLS" },
        { name: "Data Prestasi Mahasiswa Nasional & Internasional", lastRun: "2 hari lalu", size: "4.5 MB", type: "XLS" },
        { name: "Rekapitulasi Konseling Global Hub", lastRun: "1 minggu lalu", size: "850 KB", type: "PDF" },
    ]

    return (
        <PageContent>
            
            <div className="max-w-[1600px] mx-auto space-y-8 select-none">
                
                {/* ── Page Header ─────────────────────────────────────────── */}
                <DashboardHero
                    title="Reports"
                    highlightedTitle="& Analytics"
                    subtitle="Pusat generasi laporan institusi, export data akreditasi BAN-PT, dan pemantauan statistik performa akademik global."
                    icon="analytics"
                    badges={[
                        { label: 'Institutional Intelligence', active: true }
                    ]}
                    action={
                        <Button 
                            variant="outline"
                            className="h-11 px-6 rounded-xl border-slate-200 bg-white text-slate-500 hover:bg-slate-100 shadow-none gap-2 transition-all active:scale-95 font-headline cursor-pointer"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >show_chart</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Real-time Metrics</span>
                        </Button>
                    }
                />

                {/* ── Stats Grid ─────────────────────────────────────────── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {stats.map((stat, i) => (
                        <Card key={i} className="glass-card border border-slate-200/60 shadow-none rounded-2xl overflow-hidden group hover:border-bku-primary/20 transition-all">
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-start">
                                    <div className={cn("p-2.5 rounded-xl border transition-transform group-hover:scale-110", stat.bg, stat.border)}>
                                        <stat.icon className={cn("size-5", stat.color)} />
                                    </div>
                                    <Badge className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest border-none shadow-none font-headline">
                                        {stat.label}
                                    </Badge>
                                </div>
                                <div className="space-y-1">
                                    <h3 className={cn("text-2xl font-black font-headline tracking-tight", stat.color)}>{stat.value}</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">{stat.trend}</p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* ── Report Templates ────────────────────────────────── */}
                    <div className="lg:col-span-2 space-y-6">
                        <Card className="glass-card border border-slate-200/60 shadow-none rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-slate-200/40 bg-white/40 flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-bku-primary/10 flex items-center justify-center text-bku-primary">
                                    <Layers size={16} />
                                </div>
                                <h3 className="text-sm font-black font-headline uppercase tracking-tight" style={{ color: 'var(--theme-h3)' }}>Export Templates (BAN-PT / LAM)</h3>
                            </div>
                            
                            <CardContent className="p-6 space-y-4">
                                {reports.map((report, i) => (
                                    <div key={i} className="flex items-center justify-between p-5 rounded-xl border border-slate-200/60 group hover:bg-slate-50/50 hover:border-bku-primary/20 transition-all">
                                        <div className="flex items-center gap-5">
                                            <div className="size-12 bg-white rounded-xl border border-slate-200/60 flex items-center justify-center text-slate-400 group-hover:text-bku-primary group-hover:border-bku-primary/20 transition-all shadow-none">
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }} >description</span>
                                            </div>
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-800 tracking-tight text-[13px] uppercase font-headline">{report.name}</p>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 text-slate-400">
                                                        <span className="material-symbols-outlined" style={{ fontSize: '10px' }} >schedule</span>
                                                        <span className="text-[9px] font-black uppercase tracking-widest font-headline">{report.lastRun}</span>
                                                    </div>
                                                    <div className="size-1 rounded-full bg-slate-300" />
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-headline">{report.size}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button className="h-9 px-4 rounded-lg bg-slate-800 text-white font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-none border-none cursor-pointer">
                                                <Download size={14} /> {report.type.split('/')[0]}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>

                        {/* ── Intelligence Banner ────────────────────────────── */}
                        <div className="glass-card border border-slate-200/60 rounded-2xl p-6 flex items-center gap-5 shadow-none relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-32 h-full bg-bku-primary/5 -skew-x-12 translate-x-16 pointer-events-none" />
                           <div className="size-12 rounded-xl bg-white flex items-center justify-center text-slate-400 group-hover:text-bku-primary transition-colors border border-slate-200/60">
                              <PieChart size={24} />
                           </div>
                           <div className="space-y-0.5">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] font-headline">Data Analytics Status</p>
                              <p className="text-sm font-bold text-slate-800 font-headline">Dataset sinkronisasi 100% lengkap untuk periode akreditasi 2024.</p>
                           </div>
                        </div>
                    </div>

                    {/* ── Custom Report Side Panel ───────────────────────── */}
                    <aside className="space-y-6">
                        <Card className="bg-slate-900 text-white border-none shadow-none rounded-2xl overflow-hidden relative group h-full flex flex-col">
                            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform"><BarChart3 size={150} /></div>
                            
                            <div className="p-8 space-y-6 relative z-10 flex-1">
                                <div className="space-y-2">
                                    <div className="size-10 rounded-xl bg-bku-primary flex items-center justify-center text-white mb-2 shadow-[0_0_12px_rgba(0,35,111,0.5)]">
                                        <Database size={20} />
                                    </div>
                                    <h3 className="text-xl font-black font-headline tracking-tight uppercase" style={{ color: 'var(--theme-h3)' }}>Custom Aggregate</h3>
                                    <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-inter">
                                        Bangun dataset kustom dengan menggabungkan parameter akademik lintas fakultas secara real-time.
                                    </p>
                                </div>

                                <div className="space-y-5 pt-4">
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 font-headline tracking-widest ml-1">Target Analysis Unit</Label>
                                        <select className="w-full bg-white/5 border border-white/10 px-4 py-3 rounded-xl text-[11px] font-bold text-white font-headline focus:outline-none focus:ring-2 focus:ring-bku-primary/40 transition-all appearance-none cursor-pointer">
                                            <option className="bg-slate-900">SELURUH UNIVERSITAS</option>
                                            <option className="bg-slate-900">FAKULTAS FARMASI</option>
                                            <option className="bg-slate-900">FAKULTAS TEKNOLOGI</option>
                                            <option className="bg-slate-900">FAKULTAS KESEHATAN</option>
                                        </select>
                                    </div>
                                    
                                    <div className="space-y-2.5">
                                        <Label className="text-[10px] font-black uppercase text-slate-500 font-headline tracking-widest ml-1">Reporting Window</Label>
                                        <div className="relative">
                                            <Input 
                                                placeholder="PILIH RENTANG WAKTU" 
                                                className="bg-white/5 border-white/10 text-white h-12 rounded-xl text-[10px] font-black uppercase font-headline tracking-widest placeholder:text-slate-600 focus:ring-bku-primary/40"
                                            />
                                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-600" style={{ fontSize: '14px' }} >calendar_month</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-0 space-y-3 relative z-10">
                                <Button className="w-full h-14 bg-bku-primary text-white border-none rounded-xl font-black text-[10px] font-headline uppercase tracking-widest hover:bg-bku-primary/90 shadow-none transition-all active:scale-95 group/btn cursor-pointer">
                                    Initiate Process <span className="material-symbols-outlined ml-2 group-hover/btn:animate-pulse" style={{ fontSize: '14px' }} >show_chart</span>
                                </Button>
                                <div className="flex items-center justify-center gap-2">
                                   <div className="size-1 rounded-full bg-bku-primary animate-pulse" />
                                   <p className="text-[9px] font-black font-headline text-slate-500 uppercase tracking-widest">Query engine standby</p>
                                </div>
                            </div>
                        </Card>
                    </aside>
                </div>
            </div>
        </PageContent>
    )
}

export default ReportsGenerator
