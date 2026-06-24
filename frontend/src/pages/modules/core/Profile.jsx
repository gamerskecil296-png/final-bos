"use client"

import React, { useState, useEffect } from 'react'

import api from '@/lib/axios'
import { toast, Toaster } from 'react-hot-toast'
import useAuthStore from '@/store/useAuthStore'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Avatar, AvatarFallback } from '@/components/ui/Avatar'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Camera = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>photo_camera</span>;
const Badge = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>verified</span>;
const Smartphone = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>smartphone</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const ChevronRight = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>chevron_right</span>;
const User = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>person</span>;
const Lock = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>lock</span>;
const KeyRound = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>vpn_key</span>;
const Zap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>bolt</span>;



// Auto-injected Material Symbol fallbacks for removed Lucide icons
const Activity = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>show_chart</span>;
const Bell = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>notifications</span>;



const AdminProfile = () => {
    const { user: authUser } = useAuthStore()
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [profile, setProfile] = useState({ Email: '' })
    const [passwords, setPasswords] = useState({
        OldPassword: '',
        NewPassword: '',
        ConfirmPassword: ''
    })
    
    // UI State
    const [activeTab, setActiveTab] = useState('general')

    const TABS = [
        { id: 'general', label: 'Identity & Info', icon: User },
        { id: 'security', label: 'Security Configuration', icon: Lock },
        { id: 'activity', label: 'Audit & Node Status', icon: Activity }
    ]

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const endpoint = window.location.pathname.startsWith('/app/dashboard') ? '/app/dashboard/profile' : '/app/dashboard/profile'
                const res = await api.get(endpoint)
                if (res.data.status === 'success') {
                    setProfile(res.data.data)
                }
            } catch (err) {
                toast.error('Gagal memuat profil administratif')
            } finally {
                setLoading(false)
            }
        }
        fetchProfile()
    }, [])

    const handleUpdateProfile = async (e) => {
        if (e) e.preventDefault()
        setSubmitting(true)
        try {
            const endpoint = window.location.pathname.startsWith('/app/dashboard') ? '/app/dashboard/profile' : '/app/dashboard/profile'
            const res = await api.put(endpoint, { Email: profile.Email })
            if (res.data.status === 'success') {
                toast.success('Profil administratif berhasil diperbarui')
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memperbarui profil')
        } finally {
            setSubmitting(false)
        }
    }

    const handleChangePassword = async (e) => {
        if (e) e.preventDefault()
        if (passwords.NewPassword !== passwords.ConfirmPassword) {
            toast.error('Konfirmasi password baru tidak sesuai')
            return
        }
        setSubmitting(true)
        try {
            const endpoint = window.location.pathname.startsWith('/app/dashboard') ? '/app/dashboard/profile' : '/app/dashboard/profile'
            const res = await api.put(endpoint, {
                OldPassword: passwords.OldPassword,
                NewPassword: passwords.NewPassword
            })
            if (res.data.status === 'success') {
                toast.success('Kredensial keamanan berhasil diperbarui')
                setPasswords({ OldPassword: '', NewPassword: '', ConfirmPassword: '' })
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Gagal memperbarui kredensial')
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#fafafa]">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined size-10 text-primary animate-spin" >sync</span>
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Loading Personal Node...</span>
                </div>
            </div>
        )
    }

    return (
        <PageContent>
            <Toaster position="top-right" />
            
            <div className="max-w-[1200px] mx-auto space-y-8">
                
                {/* ── Breadcrumbs ─────────────────────────── */}
                <nav className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 font-jakarta">
                    <span className="hover:text-primary transition-colors cursor-pointer">Super Admin Hub</span>
                    <ChevronRight size={10} className="text-neutral-300" />
                    <span className="text-neutral-900">Administrator Settings</span>
                </nav>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
                    
                    {/* ── Sidebar Navigation ────────────────────────────────────── */}
                    <aside className="lg:col-span-3 space-y-6">
                        <Card className="glass-card border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden bg-white/60 relative">
                            <div className="absolute inset-0 bg-gradient-to-b from-bku-primary/5 to-transparent pointer-events-none" />
                            <div className="p-6 flex flex-col items-center text-center space-y-4 relative z-10">
                                <div className="relative group/avatar">
                                    <Avatar className="size-24 rounded-[2rem] border-4 border-white shadow-lg bg-gradient-to-br from-bku-primary to-indigo-700 flex items-center justify-center text-white text-3xl font-black font-headline">
                                        {profile.Email?.[0]?.toUpperCase() || <User size={30} />}
                                    </Avatar>
                                    <Button size="icon" className="absolute -bottom-2 -right-2 h-8 w-8 bg-white text-slate-800 rounded-lg shadow-md hover:bg-slate-100 transition-all opacity-0 group-hover/avatar:opacity-100 border-none">
                                        <Camera size={14} />
                                    </Button>
                                </div>
                                <div className="space-y-1 mt-2">
                                    <h3 className="text-[15px] font-black font-headline uppercase tracking-tight text-slate-800">{profile.Email?.split('@')[0] || (window.location.pathname.startsWith('/app/dashboard') ? 'Faculty Administrator' : 'Super Administrator')}</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{profile.Email}</p>
                                </div>
                                <Badge className="px-3 py-1 mt-2 bg-bku-primary/10 text-bku-primary border-none text-[9px] font-black uppercase tracking-widest rounded-lg shadow-none">{window.location.pathname.startsWith('/app/dashboard') ? 'Faculty Level Access' : 'Root Authority'}</Badge>
                            </div>
                        </Card>

                        <nav className="flex flex-col gap-1.5 p-1 bg-white/50 backdrop-blur-sm rounded-2xl border border-slate-200/60">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all relative overflow-hidden",
                                        activeTab === tab.id 
                                            ? "bg-white text-bku-primary font-bold shadow-sm border border-slate-200/50" 
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700 font-medium border border-transparent"
                                    )}
                                >
                                    {activeTab === tab.id && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-1/2 bg-bku-primary rounded-r-full" />
                                    )}
                                    <tab.icon size={16} className={cn("shrink-0", activeTab === tab.id ? "text-bku-primary" : "text-slate-400")} />
                                    <span className="text-[11px] uppercase tracking-wider font-headline">{tab.label}</span>
                                </button>
                            ))}
                        </nav>
                    </aside>

                    {/* ── Main Content Area ─────────────────────────── */}
                    <div className="lg:col-span-9">
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="glass-card border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
                                    <form onSubmit={handleUpdateProfile} className="p-8 md:p-10 space-y-8">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-xl bg-bku-primary/10 flex items-center justify-center text-bku-primary shrink-0">
                                                    <User size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="text-sm font-black font-headline uppercase tracking-tight text-slate-800">Identity Configuration</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Informasi Dasar Akun Administratif</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 self-start md:self-auto">
                                                <div className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span className="text-[9px] font-bold uppercase tracking-widest">Active Status</span>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-3 md:col-span-2">
                                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 font-headline">Administrative Access Email</Label>
                                                    <div className="relative group/input">
                                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within/input:text-bku-primary transition-colors" >mail</span>
                                                        <Input 
                                                            type="email" 
                                                            value={profile.Email}
                                                            onChange={(e) => setProfile({...profile, Email: e.target.value})}
                                                            className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white font-bold text-sm font-headline focus:ring-bku-primary/20 transition-all shadow-inner"
                                                            required
                                                        />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-medium ml-1">Email ini digunakan untuk autentikasi sistem dan menerima notifikasi audit penting.</p>
                                                </div>
                                                
                                                <div className="space-y-3 opacity-60">
                                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 font-headline">Registration Date</Label>
                                                    <div className="h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '16px' }} >schedule</span>
                                                        <span className="text-xs font-bold text-slate-600 font-inter">{new Date(profile.CreatedAt || Date.now()).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 opacity-60">
                                                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 font-headline">Authority Level</Label>
                                                    <div className="h-12 px-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-slate-400" style={{ fontSize: '16px' }} >admin_panel_settings</span>
                                                        <span className="text-xs font-bold text-slate-600 font-inter">{window.location.pathname.startsWith('/app/dashboard') ? 'Faculty / Prodi Admin' : 'Level 0 (Root Admin)'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 flex justify-end">
                                            <Button 
                                                type="submit"
                                                disabled={submitting}
                                                className="h-12 px-8 bg-slate-800 text-white rounded-xl font-black font-headline text-[10px] uppercase tracking-widest hover:bg-slate-900 shadow-lg shadow-slate-900/20 transition-all active:scale-95 border-none"
                                            >
                                                {submitting ? <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: '16px' }} >sync</span> : <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }} >save</span>}
                                                Save Changes
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="glass-card border border-rose-100 shadow-sm rounded-2xl overflow-hidden relative">
                                    <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-rose-600 pointer-events-none">
                                        <span className="material-symbols-outlined" style={{ fontSize: '180px' }}>security</span>
                                    </div>
                                    <form onSubmit={handleChangePassword} className="p-8 md:p-10 space-y-8 relative z-10">
                                        <div className="flex items-center gap-4 border-b border-rose-50 pb-6">
                                            <div className="size-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-100 shrink-0">
                                                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>key</span>
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black font-headline uppercase tracking-tight text-slate-800">Security Override</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Pembaruan Kredensial Akses Master</p>
                                            </div>
                                        </div>

                                        <div className="space-y-6 max-w-xl">
                                            <div className="space-y-3">
                                                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 font-headline">Current Master Password</Label>
                                                <div className="relative group/input">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 group-focus-within/input:text-rose-500 transition-colors" />
                                                    <Input 
                                                        type="password" 
                                                        value={passwords.OldPassword}
                                                        onChange={(e) => setPasswords({...passwords, OldPassword: e.target.value})}
                                                        placeholder="Enter current password..."
                                                        className="h-12 pl-12 rounded-xl border-slate-200 bg-white/60 focus:bg-white font-bold text-sm font-headline focus:ring-rose-500/20"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 space-y-6">
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1 font-headline">New Master Password</Label>
                                                    <div className="relative group/input">
                                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-rose-300 group-focus-within/input:text-rose-500 transition-colors" />
                                                        <Input 
                                                            type="password" 
                                                            value={passwords.NewPassword}
                                                            onChange={(e) => setPasswords({...passwords, NewPassword: e.target.value})}
                                                            placeholder="Create new strong password..."
                                                            className="h-12 pl-12 rounded-xl border-rose-200 bg-white focus:bg-white font-bold text-sm font-headline focus:ring-rose-500/30"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <Label className="text-[10px] font-black text-rose-600 uppercase tracking-widest ml-1 font-headline">Confirm New Password</Label>
                                                    <div className="relative group/input">
                                                        <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-rose-300 group-focus-within/input:text-rose-500 transition-colors" />
                                                        <Input 
                                                            type="password" 
                                                            value={passwords.ConfirmPassword}
                                                            onChange={(e) => setPasswords({...passwords, ConfirmPassword: e.target.value})}
                                                            placeholder="Repeat new password..."
                                                            className="h-12 pl-12 rounded-xl border-rose-200 bg-white focus:bg-white font-bold text-sm font-headline focus:ring-rose-500/30"
                                                            required
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-rose-50">
                                            <Button 
                                                type="submit"
                                                disabled={submitting}
                                                className="h-12 px-8 bg-rose-600 text-white rounded-xl font-black font-headline text-[10px] uppercase tracking-widest hover:bg-rose-700 shadow-lg shadow-rose-600/20 transition-all active:scale-95 border-none"
                                            >
                                                {submitting ? <span className="material-symbols-outlined animate-spin mr-2" style={{ fontSize: '16px' }} >sync</span> : <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }} >security</span>}
                                                Update Security Key
                                            </Button>
                                        </div>
                                    </form>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'activity' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                <Card className="glass-card border border-slate-200/60 shadow-sm rounded-2xl overflow-hidden">
                                    <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="size-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black font-headline uppercase tracking-tight text-slate-800">System Activity & Audit</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Log aktivitas administratif dan status node</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" className="h-9 px-4 rounded-lg text-[10px] font-bold uppercase tracking-widest border-slate-200">
                                            Download Report
                                        </Button>
                                    </div>
                                    
                                    <div className="p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                                            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-start gap-4 relative overflow-hidden group">
                                                <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-emerald-50 to-transparent pointer-events-none" />
                                                <div className="size-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0 group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined">shield</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Master Encryption</p>
                                                    <p className="text-lg font-black text-slate-800 font-headline leading-tight">256-bit AES</p>
                                                    <p className="text-[10px] font-medium text-emerald-600 mt-2 flex items-center gap-1"><span className="material-symbols-outlined text-[12px]">check_circle</span> System Secured</p>
                                                </div>
                                            </div>
                                            <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm flex items-start gap-4 relative overflow-hidden group">
                                                <div className="absolute right-0 top-0 w-24 h-full bg-gradient-to-l from-blue-50 to-transparent pointer-events-none" />
                                                <div className="size-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0 group-hover:scale-110 transition-transform">
                                                    <span className="material-symbols-outlined">history</span>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Last Login</p>
                                                    <p className="text-lg font-black text-slate-800 font-headline leading-tight">15:44 UTC</p>
                                                    <p className="text-[10px] font-medium text-slate-500 mt-2 flex items-center gap-1">IP: 192.168.1.104</p>
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-[10px] font-black font-headline uppercase tracking-[0.2em] text-slate-400 mb-6 border-b border-slate-100 pb-3">Recent Logs</h4>
                                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                                            {[
                                                { label: "Updated Global RBAC", icon: Activity, color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100" },
                                                { label: "Security Status Verified", icon: Bell, color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100" },
                                                { label: "Admin Profile Updated", icon: User, color: "text-purple-500", bg: "bg-purple-50", border: "border-purple-100" }
                                            ].map((stat, i) => (
                                                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                    <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm z-10 transition-transform group-hover:scale-110">
                                                        <stat.icon size={16} className={stat.color} />
                                                    </div>
                                                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-100 bg-slate-50/50 group-hover:bg-white group-hover:shadow-md transition-all">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className={cn("text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded border", stat.color, stat.bg, stat.border)}>System Event</span>
                                                            <span className="text-[9px] font-bold text-slate-400 tabular-nums">Today, 10:24 AM</span>
                                                        </div>
                                                        <p className="text-[12px] font-bold font-headline text-slate-700 mt-2">{stat.label}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </PageContent>
    )
}

export default AdminProfile
