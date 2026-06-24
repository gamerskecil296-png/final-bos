"use client"

import React from 'react'

import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { cn } from '@/lib/utils'
import { adminService } from '@/services/api'
import api from '@/lib/axios'
import { toast } from 'sonner'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const RefreshCcw = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>sync</span>;
const Monitor = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>desktop_windows</span>;
const UserX = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person_off</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Lock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>lock</span>;
const Zap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>bolt</span>;
const KeyRound = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>vpn_key</span>;



const SecuritySettings = () => {
    const [isResetting, setIsResetting] = React.useState(false);
    const [isMaintenance, setIsMaintenance] = React.useState(false);
    const [isUpdatingMaintenance, setIsUpdatingMaintenance] = React.useState(false);

    React.useEffect(() => {
        const fetchMaintenance = async () => {
            try {
                const response = await api.get('/public/maintenance');
                if (response.data?.success) {
                    setIsMaintenance(response.data.maintenance_mode);
                }
            } catch (error) {
                console.error('Failed to fetch maintenance status', error);
            }
        };
        fetchMaintenance();
    }, []);

    const toggleMaintenanceMode = async () => {
        try {
            setIsUpdatingMaintenance(true);
            const newState = !isMaintenance;
            const response = await adminService.updateMaintenance({
                enabled: newState,
                message: newState ? 'Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.' : ''
            });
            if (response.success) {
                setIsMaintenance(newState);
                toast.success(`Mode Maintenance berhasil ${newState ? 'diaktifkan' : 'dinonaktifkan'}.`);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Gagal mengubah status Maintenance');
        } finally {
            setIsUpdatingMaintenance(false);
        }
    };

    const handleResetDatabase = async () => {
        const confirmText = window.prompt('Tindakan ini akan menghapus SEMUA data secara permanen (kecuali akun Anda). Ketik "RESET" untuk melanjutkan:');
        
        if (confirmText !== 'RESET') {
            if (confirmText !== null) {
                toast.error('Konfirmasi tidak valid. Reset dibatalkan.');
            }
            return;
        }

        try {
            setIsResetting(true);
            const response = await adminService.resetDatabase({ confirmation: 'RESET' });
            if (response.status === 'success') {
                toast.success('Database berhasil di-reset!');
                setTimeout(() => {
                    window.location.href = '/app/dashboard';
                }, 1500);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Gagal mereset database');
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <PageContent>
            
            <div className="max-w-[1600px] mx-auto space-y-8 select-none">
                
                {/* ── Page Header ─────────────────────────────────────────── */}
                <DashboardHero
                    title="Security"
                    highlightedTitle="Protocols"
                    subtitle="Konfigurasi tingkat tinggi untuk keamanan institusional, manajemen akses IP, dan otorisasi sesi administratif global."
                    icon="security"
                    badges={[
                        { label: 'Security Hub', active: true }
                    ]}
                    action={
                        <Button 
                            className="h-11 px-6 rounded-xl bg-slate-800 text-white hover:bg-rose-600 shadow-none gap-2 transition-all active:scale-95 border-none cursor-pointer font-headline"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }} >save</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Save Protocols</span>
                        </Button>
                    }
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                    
                    {/* ── Identity & Access Control ────────────────────────── */}
                    <Card className="glass-card border border-slate-200/60 shadow-none rounded-2xl overflow-hidden group">
                        <CardContent className="p-8 md:p-10 space-y-8 relative">
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><Lock size={120} /></div>
                            
                            <div className="space-y-1 relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '14px' }} >language</span>
                                    <span className="text-[10px] font-black text-bku-primary uppercase tracking-widest font-headline">Access Policy</span>
                                </div>
                                <h3 className="text-lg font-black font-headline tracking-tight" style={{ color: 'var(--theme-h3)' }}>Identity Guard</h3>
                                <p className="text-[11px] font-medium text-slate-400 font-inter">Konfigurasi IP Whitelist & Session Lifecycle</p>
                            </div>

                            <div className="space-y-6 relative z-10">
                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline ml-1">Authorized IP Whitelist</Label>
                                    <div className="p-6 bg-slate-50/50 rounded-xl border border-slate-200/60 space-y-4">
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {['103.212.xx (HOME)', '127.0.0.1 (LOCAL)'].map((ip, idx) => (
                                                <Badge key={idx} className="px-3 py-1.5 bg-slate-800 text-white border-none rounded-lg text-[10px] font-black font-headline uppercase tracking-widest shadow-none">
                                                    {ip}
                                                </Badge>
                                            ))}
                                            <Button variant="outline" className="h-9 w-9 rounded-lg border-slate-200 text-slate-400 hover:text-bku-primary hover:border-bku-primary transition-all p-0 shadow-none cursor-pointer">
                                                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}  strokeWidth={3}>add</span>
                                            </Button>
                                        </div>
                                        <p className="text-[11px] font-medium text-slate-400 leading-relaxed italic border-t border-slate-200/40 pt-4 font-inter">
                                            Peringatan: Akses ke panel Super Admin akan diblokir total dari alamat IP yang tidak terdaftar di atas.
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline ml-1">Session Expiration Lifecycle</Label>
                                    <div className="relative group/select">
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within/select:text-bku-primary transition-colors" >schedule</span>
                                        <select className="w-full h-12 bg-white/50 border border-slate-200/60 pl-11 pr-6 rounded-xl text-xs font-black font-headline text-slate-800 uppercase tracking-widest focus:ring-2 ring-bku-primary/20 transition-all outline-none appearance-none cursor-pointer">
                                            <option>30 Menit (STANDAR KEAMANAN)</option>
                                            <option>1 Jam (MODERAT)</option>
                                            <option>Revoke Instan saat Idle</option>
                                        </select>
                                        <RefreshCcw size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 relative z-10">
                               <Button className="w-full h-12 rounded-xl bg-slate-800 text-white font-black font-headline text-[10px] uppercase tracking-widest hover:bg-bku-primary shadow-none transition-all active:scale-95 cursor-pointer border-none">
                                  Simpan Konfigurasi <Zap size={14} className="ml-2" />
                               </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ── Active Sessions Monitoring ───────────────────────── */}
                    <Card className="glass-card bg-slate-900 text-white border-none shadow-none rounded-2xl overflow-hidden relative group">
                        <CardContent className="p-8 md:p-10 space-y-8 relative">
                            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:scale-110 transition-transform"><KeyRound size={120} /></div>
                            
                            <div className="space-y-1 relative z-10">
                                <div className="flex items-center gap-2 mb-2">
                                    <Monitor size={14} className="text-bku-primary" />
                                    <span className="text-[10px] font-black text-bku-primary uppercase tracking-widest font-headline">Live Monitoring</span>
                                </div>
                                <h3 className="text-lg font-black font-headline tracking-tight" style={{ color: 'var(--theme-h3)' }}>Active Administrative Sessions</h3>
                                <p className="text-[11px] font-medium text-slate-400 font-inter">Sesi operasional yang sedang aktif secara real-time.</p>
                            </div>

                            <div className="space-y-4 relative z-10">
                                {[
                                    { user: "Super Admin (Self)", ip: "127.0.0.1", device: "Chrome · macOS", status: "Active Now", active: true },
                                    { user: "Siti (Faculty Admin)", ip: "103.xxx.xxx.xxx", device: "Firefox · Windows", status: "2 menit lalu", active: false },
                                ].map((session, i) => (
                                    <div key={i} className="p-5 bg-white/[0.03] border border-white/10 rounded-xl flex items-center justify-between group/session hover:bg-white/[0.06] transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="size-11 bg-bku-primary/20 rounded-xl flex items-center justify-center text-bku-primary font-black font-headline text-sm border border-bku-primary/20 shadow-none">
                                                {session.user[0]}
                                            </div>
                                            <div className="space-y-0.5">
                                                <div className="flex items-center gap-2">
                                                    {session.active && <div className="size-1.5 bg-emerald-500 rounded-full animate-pulse" />}
                                                    <p className="font-black text-white text-[13px] tracking-tight uppercase font-headline">{session.user}</p>
                                                </div>
                                                <p className="text-[10px] font-black uppercase text-slate-400 font-headline tracking-widest">{session.device} · {session.ip}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5">
                                            <Button variant="ghost" className="h-8 px-3 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-[9px] font-black font-headline uppercase tracking-widest transition-all gap-1.5 shadow-none cursor-pointer">
                                                <UserX size={12} /> Terminate
                                            </Button>
                                            <span className="text-[9px] text-slate-500 font-black font-headline tracking-widest uppercase">{session.status}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Emergency Shutdown Section */}
                            <div className="pt-6 relative z-10">
                                <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-4 group/emergency">
                                    <div className="flex items-center gap-3">
                                       <div className="p-2 bg-rose-500/10 rounded-lg text-rose-500">
                                          <span className="material-symbols-outlined group-hover/emergency:animate-bounce" style={{ fontSize: '18px' }} Alert >security</span>
                                       </div>
                                       <div className="space-y-0.5">
                                          <p className="text-[11px] font-black font-headline text-rose-400 uppercase tracking-widest">Global Emergency Lockdown</p>
                                          <p className="text-[10px] text-rose-500/50 font-medium font-inter">Matikan seluruh sesi administratif secara instan.</p>
                                       </div>
                                    </div>
                                    <Button className="w-full h-11 bg-rose-600 text-white rounded-xl text-[10px] font-black font-headline uppercase tracking-widest shadow-none hover:bg-rose-500 transition-all border-none cursor-pointer">
                                        Execute Lockdown ⚡
                                    </Button>
                                </div>
                            </div>

                            {/* Maintenance Mode Section */}
                            <div className="pt-6 relative z-10">
                                <div className={`p-6 border rounded-xl space-y-4 transition-all ${isMaintenance ? 'bg-amber-500/10 border-amber-500/20' : 'bg-slate-500/5 border-slate-500/10'}`}>
                                    <div className="flex items-center gap-3">
                                       <div className={`p-2 rounded-lg ${isMaintenance ? 'bg-amber-500/10 text-amber-500' : 'bg-slate-500/10 text-slate-500'}`}>
                                          <span className="material-symbols-outlined" style={{ fontSize: '18px' }} >construction</span>
                                       </div>
                                       <div className="space-y-0.5">
                                          <p className={`text-[11px] font-black font-headline uppercase tracking-widest ${isMaintenance ? 'text-amber-500' : 'text-slate-500'}`}>
                                              Maintenance Mode
                                          </p>
                                          <p className={`text-[10px] font-medium font-inter ${isMaintenance ? 'text-amber-600/70' : 'text-slate-500/70'}`}>
                                              {isMaintenance ? 'Sistem sedang dalam perbaikan. User tidak dapat login.' : 'Aktifkan mode perbaikan untuk mencegah user mengakses sistem.'}
                                          </p>
                                       </div>
                                    </div>
                                    <Button 
                                        onClick={toggleMaintenanceMode}
                                        disabled={isUpdatingMaintenance}
                                        className={`w-full h-11 text-white rounded-xl text-[10px] font-black font-headline uppercase tracking-widest shadow-none transition-all border-none cursor-pointer ${
                                            isMaintenance ? 'bg-amber-600 hover:bg-amber-500' : 'bg-slate-800 hover:bg-slate-700'
                                        }`}
                                    >
                                        {isUpdatingMaintenance ? 'Updating...' : isMaintenance ? 'Nonaktifkan Maintenance 🛑' : 'Aktifkan Maintenance ⚡'}
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                </div>

                {/* ── System Wipe (Factory Reset) ───────────────────────── */}
                <div className="pt-4">
                    <Card className="glass-card border-none shadow-none rounded-2xl overflow-hidden bg-rose-500/5 relative group border border-rose-500/20">
                        <CardContent className="p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative">
                            <div className="absolute right-0 bottom-0 opacity-5 group-hover:scale-110 transition-transform"><span className="material-symbols-outlined" style={{ fontSize: '140px' }}>warning</span></div>
                            <div className="space-y-2 relative z-10 max-w-2xl">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="material-symbols-outlined text-rose-500" style={{ fontSize: '16px' }}>dangerous</span>
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest font-headline">Danger Zone</span>
                                </div>
                                <h3 className="text-xl font-black font-headline tracking-tight text-rose-600">Factory Reset Database</h3>
                                <p className="text-xs font-medium text-slate-500 font-inter leading-relaxed">
                                    Tindakan ini akan menghapus <strong>seluruh data operasional</strong> (mahasiswa, dosen, ormawa, proposal, transaksi, dsb) secara permanen. Hanya akun Super Admin yang akan dipertahankan. Tindakan ini tidak dapat dibatalkan.
                                </p>
                            </div>
                            <div className="relative z-10 w-full md:w-auto flex-shrink-0">
                                <Button 
                                    onClick={handleResetDatabase}
                                    disabled={isResetting}
                                    className="w-full md:w-auto h-12 px-8 rounded-xl bg-rose-600 text-white font-black font-headline text-[11px] uppercase tracking-widest hover:bg-rose-700 shadow-none transition-all active:scale-95 cursor-pointer border-none"
                                >
                                    {isResetting ? 'Processing Wipe...' : 'Reset Semua Data'}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* ── Security Status Footer ────────────────────────────── */}
                <div className="flex items-center justify-center gap-3 py-6 grayscale opacity-40">
                   <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '20px' }} >security</span>
                   <span className="text-[10px] font-black text-slate-400 font-headline uppercase tracking-[0.4em]">Military Grade Encryption Active</span>
                </div>

            </div>
        </PageContent>
    )
}

export default SecuritySettings
