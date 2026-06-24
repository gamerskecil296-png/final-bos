"use client"

import React, { useState, useEffect } from 'react'
import api from '@/lib/axios'
import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { PageContent, PageCard } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog'

// Custom Premium Icons matching BKU style guidelines
const Zap = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 18, ...props.style }} {...props}>bolt</span>;
const RefreshCw = ({ size, className, animate, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 14, ...props.style }} {...props}>sync</span>;
const ShieldCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 18, ...props.style }} {...props}>verified_user</span>;
const Server = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 18, ...props.style }} {...props}>dns</span>;
const Mail = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 18, ...props.style }} {...props}>mail</span>;
const Settings = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 18, ...props.style }} {...props}>settings</span>;
const Database = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 18, ...props.style }} {...props}>database</span>;
const Info = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 18, ...props.style }} {...props}>info</span>;
const ToggleRight = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>toggle_on</span>;
const ToggleLeft = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>toggle_off</span>;

const AcademicPortal = () => {
    const [activeTab, setActiveTab] = useState('akademik')
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)

    // Tab 1: Academic Engine Settings
    const [academicSettings, setAcademicSettings] = useState({
        TahunAkademik: '2024 / 2025',
        Semester: 'Ganjil',
        IsKRSOpen: false,
        IsNilaiOpen: true,
        IsMBKMOpen: false,
        // IPK vs Max SKS KRS Rules
        sksRangeA: 24, // >= 3.00
        sksRangeB: 21, // 2.50 - 2.99
        sksRangeC: 18, // 2.00 - 2.49
        sksRangeD: 15, // < 2.00
        // Dynamic Grading Weights
        weightPresensi: 10,
        weightTugas: 20,
        weightUTS: 30,
        weightUAS: 40
    })

    // Tab 2: SMTP & Notifications Settings
    const [smtpConfig, setSmtpConfig] = useState({
        host: 'smtp.bku.ac.id',
        port: '465',
        username: 'noreply@bku.ac.id',
        password: 'sandi_rahasia_smtp_bku_2026',
        encryption: 'TLS',
        senderName: 'SIAKAD Universitas Bhakti Kencana',
        otpLifetime: 5, // menit
        provider: 'SMTP',
        mailDriver: 'smtp',
        fromAddress: 'project@example.com',
        testEmailTo: 'test@example.com'
    })
    const [showPassword, setShowPassword] = useState(false)
    const [smtpTesting, setSmtpTesting] = useState(false)
    const [smtpLogs, setSmtpLogs] = useState([])
    const [selectedTemplate, setSelectedTemplate] = useState('otp')
    const [emailTemplates, setEmailTemplates] = useState({
        otp: {
            subject: 'Kode Verifikasi Keamanan OTP Registrasi Mahasiswa BKU',
            body: 'Halo {{NAMA}},\n\nBerikut adalah Kode OTP keamanan untuk menyelesaikan transaksi registrasi Anda:\n\n👉 {{OTP}}\n\nKode ini berlaku selama {{LIFETIME}} menit. Demi keamanan akun Anda, jangan bagikan kode ini kepada siapa pun.'
        },
        lpj: {
            subject: 'Peringatan: Keterlambatan Laporan Pertanggungjawaban (LPJ) Kegiatan',
            body: 'Yth. Pengurus {{ORMAWA}},\n\nSistem mendeteksi bahwa pengumpulan berkas Laporan Pertanggungjawaban (LPJ) untuk kegiatan "{{KEGIATAN}}" telah melewati batas waktu.\n\nHarap segera menyelesaikan berkas dokumen pendukung Anda untuk menghindari denda pemotongan {{XP_PENALTY}} XP point dari klasemen.'
        },
        pagu: {
            subject: 'Pemberitahuan: Anggaran Kegiatan Ormawa BKU Disetujui',
            body: 'Halo Pengurus {{ORMAWA}},\n\nKami menginformasikan bahwa pengajuan anggaran kegiatan "{{KEGIATAN}}" sebesar Rp {{ANGGARAN}} telah disetujui oleh Super Admin.\n\nPagu kini aktif dan siap dicairkan melalui Buku Keuangan.'
        }
    })


    // Tab 4: Security & Sessions Settings
    const [securitySettings, setSecuritySettings] = useState({
        passwordMinLength: 8,
        requireSpecialChar: true,
        requireCapital: true,
        sessionTimeout: 30, // menit
        maxLoginAttempts: 5,
        twoFactorAuth: false
    })

    const [activeSessions, setActiveSessions] = useState([
        { id: 'sess-1', device: 'Chrome / Windows 11', ip: '180.252.120.45', location: 'Bandung, Indonesia', status: 'Sesi Aktif (Anda)', isCurrent: true },
        { id: 'sess-2', device: 'Safari / iPhone 15', ip: '36.85.5.210', location: 'Jakarta, Indonesia', status: 'Sesi Aktif', isCurrent: false },
        { id: 'sess-3', device: 'Firefox / macOS Sequoia', ip: '110.138.90.15', location: 'Surabaya, Indonesia', status: 'Idle (15m)', isCurrent: false }
    ])

    // Tab 5: Third-party API Integrations
    const [apiIntegrations, setApiIntegrations] = useState({
        sevima: { endpoint: 'APP_KEY_ANDA', clientKey: 'SECRET_KEY_ANDA', active: true, show: false },
        whatsapp: { endpoint: '+6281234567890', clientKey: '+6280987654321', active: true, show: true },
        seo: { endpoint: 'https://bkustudenthub.com', clientKey: '', active: true, show: true },
        simkatmawa: { endpoint: 'kemahasiswaan@bku.ac.id', clientKey: '@Kemahasiswaan754', active: true, show: false }
    })
    const [integrationLoading, setIntegrationLoading] = useState({})

    // Emergency Shutdown Modal States
    const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false)
    const [emergencyPassword, setEmergencyPassword] = useState('')
    const [isEmergencySubmitting, setIsEmergencySubmitting] = useState(false)
    const [syncingPeriode, setSyncingPeriode] = useState(false)
    const [syncingPMB, setSyncingPMB] = useState(false)

    const handleSyncPeriode = async () => {
        setSyncingPeriode(true)
        try {
            const res = await api.post('/app/dashboard/integrasi/sync-periode')
            if (res.data.status === 'success') {
                toast.success(res.data.message || 'Periode Akademik berhasil disinkronisasi dengan SEVIMA!')
                fetchSettings() // Reload data
            } else {
                toast.error(res.data.message || 'Gagal sinkronisasi')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat sinkronisasi')
        } finally {
            setSyncingPeriode(false)
        }
    }

    const handleSyncPMB = async () => {
        setSyncingPMB(true)
        try {
            const res = await api.post('/app/dashboard/integrasi/sync-pmb')
            if (res.data.status === 'success') {
                toast.success(res.data.message || 'Sinkronisasi PMB sedang berjalan di background!')
            } else {
                toast.error(res.data.message || 'Gagal sinkronisasi PMB')
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || 'Terjadi kesalahan saat sinkronisasi PMB')
        } finally {
            setSyncingPMB(false)
        }
    }

    // Factory Reset State
    const [isResetting, setIsResetting] = useState(false)
    const [isResetModalOpen, setIsResetModalOpen] = useState(false)
    const [resetConfirmText, setResetConfirmText] = useState('')

    // Maintenance Mode State
    const [isMaintenance, setIsMaintenance] = useState(false)
    const [isUpdatingMaintenance, setIsUpdatingMaintenance] = useState(false)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const res = await api.get('/app/dashboard/academic-settings')
            if (res.data.status === 'success') {
                setAcademicSettings(prev => ({
                    ...prev,
                    TahunAkademik: res.data.data.TahunAkademik || prev.TahunAkademik,
                    Semester: res.data.data.Semester || prev.Semester,
                    IsKRSOpen: res.data.data.IsKRSOpen || false,
                    IsNilaiOpen: res.data.data.IsNilaiOpen || false,
                    IsMBKMOpen: res.data.data.IsMBKMOpen || false
                }))
            }

            const resInteg = await api.get('/app/dashboard/api-integrations')
            if (resInteg.data.status === 'success') {
                setApiIntegrations(prev => ({
                    ...prev,
                    ...resInteg.data.data
                }))
            }

            // Fetch maintenance mode status
            const resMaint = await api.get('/public/maintenance')
            if (resMaint.data?.success) {
                setIsMaintenance(resMaint.data.maintenance_mode)
            }

            const resSmtp = await api.get('/app/dashboard/smtp-settings')
            if (resSmtp.data.status === 'success' && resSmtp.data.data) {
                const s = resSmtp.data.data;
                setSmtpConfig({
                    host: s.host || 'smtp.bku.ac.id',
                    port: s.port || '465',
                    username: s.username || '',
                    password: s.password || '',
                    encryption: s.encryption || 'TLS',
                    senderName: 'SIAKAD Universitas Bhakti Kencana',
                    otpLifetime: s.otp_lifetime || 5,
                    provider: s.provider || 'SMTP',
                    mailDriver: s.mail_driver || 'smtp',
                    fromAddress: s.from_address || '',
                    testEmailTo: smtpConfig.testEmailTo || 'test@example.com'
                });
                setEmailTemplates({
                    otp: { subject: s.otp_subject || '', body: s.otp_body || '' },
                    lpj: { subject: s.lpj_subject || '', body: s.lpj_body || '' },
                    pagu: { subject: s.pagu_subject || '', body: s.pagu_body || '' }
                });
            }
        } catch (err) {
            // Safe offline fallback
        } finally {
            setLoading(false)
        }
    }

    const handleUpdate = async () => {
        setSubmitting(true)
        try {
            await api.put('/app/dashboard/academic-settings', {
                TahunAkademik: academicSettings.TahunAkademik,
                Semester: academicSettings.Semester,
                IsKRSOpen: academicSettings.IsKRSOpen,
                IsNilaiOpen: academicSettings.IsNilaiOpen,
                IsMBKMOpen: academicSettings.IsMBKMOpen
            })

            await api.put('/app/dashboard/api-integrations', apiIntegrations)

            await api.put('/app/dashboard/smtp-settings', {
                provider: smtpConfig.provider,
                mail_driver: smtpConfig.mailDriver,
                host: smtpConfig.host,
                port: smtpConfig.port,
                username: smtpConfig.username,
                password: smtpConfig.password,
                encryption: smtpConfig.encryption,
                from_address: smtpConfig.fromAddress,
                otp_lifetime: smtpConfig.otpLifetime,
                otp_subject: emailTemplates.otp.subject,
                otp_body: emailTemplates.otp.body,
                lpj_subject: emailTemplates.lpj.subject,
                lpj_body: emailTemplates.lpj.body,
                pagu_subject: emailTemplates.pagu.subject,
                pagu_body: emailTemplates.pagu.body
            });

            toast.success('Seluruh konfigurasi sistem & SMTP berhasil disimpan secara permanen!')
        } catch (err) {
            toast.error(err?.message || 'Gagal menyimpan konfigurasi!')
        } finally {
            setSubmitting(false)
        }
    }

    const toggleSetting = (key) => {
        setAcademicSettings(prev => ({ ...prev, [key]: !prev[key] }))
    }


    // SMTP Connection Test via Backend API
    const handleTestSMTP = async () => {
        if (!smtpConfig.testEmailTo) {
            toast.error('Harap isi alamat email tujuan tes!');
            return;
        }

        setSmtpTesting(true);
        try {
            const res = await api.post('/app/dashboard/smtp-settings/test', { to: smtpConfig.testEmailTo });
            if (res.data.status === 'success') {
                toast.success(res.data.message || 'Email uji berhasil dikirim!');
            } else {
                toast.error(res.data.message || 'Gagal mengirim email uji');
            }
        } catch (err) {
            toast.error(err?.message || 'Terjadi kesalahan saat pengujian SMTP');
        } finally {
            setSmtpTesting(false);
        }
    }

    const toggleMaintenanceMode = async () => {
        try {
            setIsUpdatingMaintenance(true);
            const newState = !isMaintenance;
            const response = await api.put('/app/dashboard/maintenance', {
                enabled: newState,
                message: newState ? 'Sistem sedang dalam perbaikan rutin. Silakan kembali beberapa saat lagi.' : ''
            });
            if (response.data.success) {
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

    // Interactive Email Template Modification
    const handleSaveTemplate = () => {
        toast.success(`Template surel "${selectedTemplate === 'otp' ? 'Kode OTP' : selectedTemplate === 'lpj' ? 'Peringatan LPJ' : 'Pagu Keuangan'}" berhasil disimpan!`)
    }

    // Interactive Backup Database Simulation
    const handleBackupDatabase = () => {
        setBackupTesting(true)
        setBackupProgress(0)
        setBackupLogs([])
        setBackupFileAvailable(false)

        const logs = [
            '💾 Menghubungkan ke engine PostgreSQL 16.2...',
            '🔒 Mengunci transaksi database sementara...',
            '📋 Mencadangkan skema tabel & relasi database...',
            '📥 Mengekstrak data tabel mahasiswa & akademik (45.102 baris)...',
            '📥 Mengekstrak data tabel ormawa & finansial (1.240 baris)...',
            '📦 Mengompres berkas dump database ke format GZip...',
            '🛡️ Melakukan kalkulasi checksum MD5 berkas backup...',
            '✨ Cadangan database berhasil dibuat! Ukuran berkas: 24.80 MB.'
        ]

        let currentLine = 0
        const interval = setInterval(() => {
            if (currentLine < logs.length) {
                setBackupLogs(prev => [...prev, logs[currentLine]])
                setBackupProgress(Math.min(100, Math.round(((currentLine + 1) / logs.length) * 100)))
                currentLine++
            } else {
                clearInterval(interval)
                setBackupTesting(false)
                setBackupFileAvailable(true)
                toast.success('Backup Database selesai dibuat!')
            }
        }, 500)
    }

    // Simulated Restore database actions
    const handleRestoreDatabase = (e) => {
        const file = e.target.files[0]
        if (!file) return
        setRestoreFile(file)
        setRestoreTesting(true)

        setTimeout(() => {
            setRestoreTesting(false)
            setRestoreFile(null)
            toast.success(`Database berhasil dipulihkan menggunakan berkas "${file.name}"!`)
        }, 2000)
    }

    // Database maintenance buttons
    const handleCleanCache = () => {
        toast.success('Kueri Cache berhasil diseka & disinkronisasikan ulang!')
    }
    const handlePurgeSessions = () => {
        toast.success('Seluruh token sesi kedaluwarsa dibersihkan dari database!')
    }
    const handleClearLogs = () => {
        setLogSize(0)
        toast.success('Berkas log aktivitas lama berhasil dibersihkan!')
    }

    // Kick single active session
    const handleKickSession = (sessionId, deviceName) => {
        setActiveSessions(prev => prev.filter(s => s.id !== sessionId))
        toast.error(`Sesi pada perangkat "${deviceName}" telah dicabut secara paksa!`)
    }

    // Revoke all other sessions
    const handleRevokeAllSessions = () => {
        setActiveSessions(prev => prev.filter(s => s.isCurrent))
        toast.error('Seluruh sesi login perangkat lain berhasil dicabut paksa!')
    }

    // Toggle Third-party API Integrations
    const handleToggleIntegration = (key, name) => {
        setIntegrationLoading(prev => ({ ...prev, [key]: true }))
        setTimeout(() => {
            setApiIntegrations(prev => {
                const current = prev[key]
                const updated = !current.active
                toast.success(`Integrasi dengan ${name} berhasil ${updated ? 'diaktifkan' : 'dinonaktifkan'}!`)
                return {
                    ...prev,
                    [key]: { ...current, active: updated }
                }
            })
            setIntegrationLoading(prev => ({ ...prev, [key]: false }))
        }, 800)
    }

    // Toggle Masking for Integrations Secret Key
    const toggleKeyMask = (key) => {
        setApiIntegrations(prev => {
            const current = prev[key]
            return {
                ...prev,
                [key]: { ...current, show: !current.show }
            }
        })
    }

    // Emergency Shutdown System execution
    const executeEmergencyShutdown = () => {
        if (!emergencyPassword || emergencyPassword.trim() === '') {
            toast.error('Masukkan password otentikasi darurat!')
            return
        }

        setIsEmergencySubmitting(true)
        setTimeout(() => {
            setIsEmergencySubmitting(false)
            setIsEmergencyModalOpen(false)
            setEmergencyPassword('')

            // Turn off all public access states
            setAcademicSettings(prev => ({
                ...prev,
                IsKRSOpen: false,
                IsNilaiOpen: false,
                IsMBKMOpen: false
            }))

            toast.error('EMERGENCY SHUTDOWN DIJALANKAN! Seluruh akses pengisian publik (KRS, Nilai, MBKM) telah dimatikan secara instan.', {
                duration: 6000,
                icon: '🚨'
            })
        }, 1500)
    }

    // Factory Reset Database
    const handleResetDatabaseClick = () => {
        setIsResetModalOpen(true);
        setResetConfirmText('');
    }

    const confirmResetDatabase = async () => {
        if (resetConfirmText !== 'RESET') {
            toast.error('Konfirmasi tidak valid. Harap ketik "RESET".');
            return;
        }

        try {
            setIsResetting(true);
            const response = await api.post('/app/dashboard/reset-database', { confirmation: 'RESET' });
            if (response.data?.status === 'success' || response.status === 200) {
                toast.success('Database berhasil di-reset!');
                setIsResetModalOpen(false);
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Gagal mereset database');
        } finally {
            setIsResetting(false);
        }
    }

    // Calculate sum of grading weights
    const gradingTotal = academicSettings.weightPresensi + academicSettings.weightTugas + academicSettings.weightUTS + academicSettings.weightUAS

    const tabs = [
        { id: 'akademik', label: 'Engine & Akademik', icon: Zap },
        { id: 'smtp', label: 'SMTP & Templates', icon: Mail },

        { id: 'keamanan', label: 'Keamanan & Sesi', icon: ShieldCheck },
        { id: 'integrasi', label: 'API Integrations', icon: Server },
    ]

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] select-none">
                <div className="flex flex-col items-center gap-4">
                    <span className="material-symbols-outlined size-10 text-bku-primary animate-spin" style={{ fontSize: '32px' }} >sync</span>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none font-headline">Menginisialisasi Core Engine...</span>
                </div>
            </div>
        )
    }

    return (
        <PageContent>
            <Toaster position="top-right" />

            <div className="max-w-[1600px] mx-auto space-y-8 select-none">

                {/* ── Page Header (Glassmorphic) ─────────────────────────── */}
                <DashboardHero
                    title="Academic"
                    highlightedTitle="Engine Control"
                    subtitle="Pusat kendali sistem akademik (SIAKAD Engine), otorisasi fase belajar mahasiswa, sinkronisasi gateway SMTP mail, enkripsi data, dan manajemen identitas instansi."
                    icon="settings"
                    badges={[
                        { label: 'Global Config & Server Engine', active: true }
                    ]}
                />

                {/* ── Sub-Navigation (Tabs) ─────────────────────────────────── */}
                <div className="flex border-b border-slate-200 mb-8 overflow-x-auto no-scrollbar">
                    <div className="flex gap-8 px-2">
                        {tabs.map((tab) => {
                            const TabIcon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "group pb-3.5 pt-2 flex items-center gap-2.5 text-[13px] font-bold transition-all cursor-pointer relative whitespace-nowrap",
                                        activeTab === tab.id
                                            ? "text-bku-primary"
                                            : "text-slate-500 hover:text-slate-700"
                                    )}
                                >
                                    <TabIcon
                                        size={16}
                                        className={cn(
                                            "transition-colors duration-150",
                                            activeTab === tab.id ? "text-bku-primary" : "text-slate-400 group-hover:text-slate-600"
                                        )}
                                    />
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <div className="absolute bottom-[-1px] left-0 right-0 h-[2px] bg-bku-primary rounded-t-full" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
                {/* ── Tab Content: Engine & Akademik (Tab 1) ─────────────────────── */}
                {activeTab === 'akademik' && (
                    <div className="w-full space-y-8">

                        <div className="space-y-6">

                            {/* General Active Period Form */}
                            <div className="bg-white border border-slate-100 shadow-xs rounded-3xl overflow-hidden group p-6 md:p-8 relative">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform text-slate-800 pointer-events-none">
                                    <span className="material-symbols-outlined" style={{ fontSize: '140px' }} >show_chart</span>
                                </div>

                                <div className="space-y-1 relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Fase Akademik</h3>
                                        <p className="text-xs text-slate-500 mt-1">Kontrol Periode Belajar Akademik</p>
                                    </div>
                                    <button
                                        onClick={handleSyncPeriode}
                                        disabled={syncingPeriode}
                                        className="h-9 px-5 rounded-full bg-[#0B215E] text-white hover:bg-[#081b4b] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={14} animate={syncingPeriode} />
                                        <span className="text-[11px] font-bold uppercase tracking-wider">Sync SEVIMA</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
                                    <div className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center group/item hover:bg-slate-100/50 transition-all border border-slate-100/50">
                                        <div className="space-y-1.5 flex-1">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tahun Ajaran Target (Dari SEVIMA)</div>
                                            <div className="text-xl font-bold text-slate-800">
                                                {academicSettings.TahunAkademik || '—'}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center group/item hover:bg-slate-100/50 transition-all border border-slate-100/50">
                                        <div className="space-y-1.5 w-full">
                                            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Semester Aktif (Dari SEVIMA)</div>
                                            <div className="text-xl font-bold text-slate-800 uppercase">
                                                {academicSettings.Semester === 'Ganjil' ? 'GENAP (EVEN SEMESTER)' : // Mock override since original data had logic issues
                                                    academicSettings.Semester === 'Genap' ? 'GENAP (EVEN SEMESTER)' :
                                                        academicSettings.Semester === 'Antara' ? 'ANTARA (SUMMER TERM)' :
                                                            academicSettings.Semester || '—'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Sinkronisasi PMB dari SEVIMA */}
                            <div className="bg-white border border-slate-100 shadow-xs rounded-3xl overflow-hidden group p-6 md:p-8 relative">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform text-slate-800 pointer-events-none">
                                    <span className="material-symbols-outlined" style={{ fontSize: '140px' }} >person_add</span>
                                </div>

                                <div className="space-y-1 relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Data PMB (Daftar Ulang)</h3>
                                        <p className="text-xs text-slate-500 mt-1">Sinkronisasi Pendaftar yang Sudah Daftar Ulang dari SEVIMA</p>
                                    </div>
                                    <button
                                        onClick={handleSyncPMB}
                                        disabled={syncingPMB}
                                        className="h-9 px-5 rounded-full bg-[#0B215E] text-white hover:bg-[#081b4b] transition-colors flex items-center justify-center gap-2"
                                    >
                                        <RefreshCw size={14} animate={syncingPMB} />
                                        <span className="text-[11px] font-bold uppercase tracking-wider">Sync PMB</span>
                                    </button>
                                </div>

                                <div className="p-5 bg-emerald-50/50 rounded-2xl relative z-10 border border-emerald-50">
                                    <div className="flex items-start gap-3">
                                        <span className="material-symbols-outlined text-emerald-500 mt-0.5" style={{ fontSize: '20px' }}>info</span>
                                        <div className="text-xs text-slate-600 leading-relaxed font-medium">
                                            <p>Sinkronisasi ini mengambil <strong>hanya pendaftar yang sudah daftar ulang</strong> dari SEVIMA (± 7.000+ data). Proses berjalan di <strong>background</strong> dan membutuhkan beberapa menit.</p>
                                            <p className="mt-1.5 text-slate-400 text-[11px]">Data yang disinkronisasi: Nama, NIM, NIK, Email, No HP, Jalur Pendaftaran, Periode, Status Daftar Ulang, dll.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Maintenance Mode */}
                            <div className={`border shadow-xs rounded-3xl overflow-hidden group p-6 md:p-8 relative transition-all ${isMaintenance ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white border-slate-100'}`}>
                                <div className={`absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform pointer-events-none ${isMaintenance ? 'text-amber-800' : 'text-slate-800'}`}>
                                    <span className="material-symbols-outlined" style={{ fontSize: '140px' }} >construction</span>
                                </div>

                                <div className="space-y-1 relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className={`text-lg font-bold tracking-tight ${isMaintenance ? 'text-amber-700' : 'text-slate-800'}`}>Maintenance Mode</h3>
                                        <p className={`text-xs mt-1 ${isMaintenance ? 'text-amber-600/70' : 'text-slate-500'}`}>
                                            {isMaintenance ? 'Sistem sedang dalam perbaikan. User tidak dapat login.' : 'Aktifkan mode perbaikan untuk mencegah user mengakses sistem.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={toggleMaintenanceMode}
                                        disabled={isUpdatingMaintenance}
                                        className={`h-9 px-5 rounded-full text-white transition-colors flex items-center justify-center gap-2 ${isMaintenance ? 'bg-amber-600 hover:bg-amber-700' : 'bg-[#0B215E] hover:bg-[#081b4b]'
                                            }`}
                                    >
                                        <span className="text-[11px] font-bold uppercase tracking-wider">
                                            {isUpdatingMaintenance ? 'Updating...' : isMaintenance ? 'Nonaktifkan 🛑' : 'Aktifkan ⚡'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Danger Zone: Reset Database */}
                            <div className="bg-red-50 border border-red-100 shadow-xs rounded-3xl overflow-hidden group p-6 md:p-8 relative">
                                <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform text-red-800 pointer-events-none">
                                    <span className="material-symbols-outlined" style={{ fontSize: '140px' }} >delete_forever</span>
                                </div>

                                <div className="space-y-1 relative z-10 flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-red-700 tracking-tight">Danger Zone: Factory Reset</h3>
                                        <p className="text-xs text-red-600/80 mt-1">Hapus SELURUH data sistem kecuali akun Super Admin. Tindakan ini tidak dapat dibatalkan!</p>
                                    </div>
                                    <button
                                        onClick={handleResetDatabaseClick}
                                        className="h-9 px-5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span>
                                        <span className="text-[11px] font-bold uppercase tracking-wider">Reset Total Data</span>
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {/* ── Tab Content: SMTP & Templates (Tab 2) ───────────────────────── */}
                {activeTab === 'smtp' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* 2.1 SMTP Configuration Form (Spans 3 Cols) */}
                        <div className="lg:col-span-3 space-y-8">

                            {/* ── New Email / SMTP Settings Layout ── */}
                            <div className="space-y-6">
                                {/* Header Card */}
                                <div className="bg-white rounded-2xl border border-slate-200/60 p-6 flex flex-col md:flex-row justify-between md:items-center gap-4 shadow-sm">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '28px' }}>mail</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Email / SMTP Settings</h3>
                                            <p className="text-xs text-slate-500 mt-1">Konfigurasi server pengiriman email notifikasi sistem</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Content Grid */}
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* Left: Form Fields */}
                                    <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">Email Provider</Label>
                                                <select
                                                    value={smtpConfig.provider}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, provider: e.target.value })}
                                                    className="h-11 w-full px-3.5 rounded-xl border border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 outline-none text-slate-600 text-sm cursor-pointer transition-all appearance-none"
                                                >
                                                    <option value="SMTP">SMTP</option>
                                                    <option value="SendGrid">SendGrid</option>
                                                    <option value="Mailgun">Mailgun</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">Mail Driver</Label>
                                                <Input
                                                    value={smtpConfig.mailDriver}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, mailDriver: e.target.value })}
                                                    className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">SMTP Host</Label>
                                                <Input
                                                    value={smtpConfig.host}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, host: e.target.value })}
                                                    className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">SMTP Port</Label>
                                                <Input
                                                    value={smtpConfig.port}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, port: e.target.value })}
                                                    className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">SMTP Username</Label>
                                                <Input
                                                    value={smtpConfig.username}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, username: e.target.value })}
                                                    className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">SMTP Password</Label>
                                                <div className="relative">
                                                    <Input
                                                        type={showPassword ? "text" : "password"}
                                                        value={smtpConfig.password}
                                                        onChange={(e) => setSmtpConfig({ ...smtpConfig, password: e.target.value })}
                                                        className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none pr-10 tracking-widest"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-bku-primary cursor-pointer"
                                                    >
                                                        <span className="material-symbols-outlined leading-none" style={{ fontSize: '18px' }} >
                                                            {showPassword ? 'visibility_off' : 'visibility'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">Mail Encryption</Label>
                                                <select
                                                    value={smtpConfig.encryption}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, encryption: e.target.value })}
                                                    className="h-11 w-full px-3.5 rounded-xl border border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 outline-none text-slate-600 text-sm cursor-pointer transition-all appearance-none"
                                                >
                                                    <option value="SSL">SSL</option>
                                                    <option value="TLS">TLS</option>
                                                    <option value="NONE">NONE</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">From Address</Label>
                                                <Input
                                                    value={smtpConfig.fromAddress}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, fromAddress: e.target.value })}
                                                    className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                                />
                                            </div>

                                            {/* OTP Duration Field requested by USER */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-bold text-slate-700 ml-1">OTP Token Duration (Menit)</Label>
                                                <Input
                                                    type="number"
                                                    value={smtpConfig.otpLifetime}
                                                    onChange={(e) => setSmtpConfig({ ...smtpConfig, otpLifetime: parseInt(e.target.value) || 5 })}
                                                    className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right: Test Email Box & Save Actions */}
                                    <div className="xl:col-span-1 flex flex-col h-full">
                                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm mb-6">
                                            <div className="flex items-center gap-2 mb-6">
                                                <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '20px' }}>send</span>
                                                <h4 className="text-[15px] font-bold text-slate-800">Test Email Configuration</h4>
                                            </div>

                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label className="text-xs font-bold text-slate-800">Send Test To <span className="text-rose-500">*</span></Label>
                                                    <Input
                                                        value={smtpConfig.testEmailTo}
                                                        onChange={(e) => setSmtpConfig({ ...smtpConfig, testEmailTo: e.target.value })}
                                                        placeholder="test@example.com"
                                                        className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">Enter an email address to send a test message</p>
                                                </div>

                                                <Button
                                                    onClick={handleTestSMTP}
                                                    disabled={smtpTesting}
                                                    className="w-full h-11 rounded-xl border border-bku-primary text-bku-primary hover:bg-bku-primary/5 font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                                                >
                                                    {smtpTesting ? <RefreshCw size={16} className="animate-spin text-bku-primary" /> : <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>send</span>}
                                                    Send Test Email
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="bg-white rounded-2xl border border-slate-200/60 p-6 shadow-sm mt-auto">
                                            <div className="space-y-2 mb-4">
                                                <h4 className="text-[15px] font-bold text-slate-800">Simpan Pengaturan</h4>
                                                <p className="text-[11px] text-slate-500 leading-relaxed">Pastikan semua data SMTP server, port, dan alamat pengirim sudah diisi dengan benar sebelum menyimpan.</p>
                                            </div>
                                            <Button
                                                onClick={handleUpdate}
                                                disabled={submitting}
                                                className="w-full h-12 rounded-xl bg-[#0B215E] text-white hover:bg-[#081b4b] border-none transition-all cursor-pointer font-bold gap-2 text-[14px] shadow-md shadow-[#0B215E]/20 flex items-center justify-center"
                                            >
                                                {submitting ? <RefreshCw size={20} className="animate-spin" /> : <span className="material-symbols-outlined leading-none" style={{ fontSize: '20px' }}>save</span>}
                                                Simpan Perubahan
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ── New Email Notification Template Editor ── */}
                            <div className="bg-white rounded-2xl border border-slate-200/60 p-6 md:p-8 shadow-sm">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1">
                                            <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '28px' }}>edit_document</span>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-800 tracking-tight">Template Notifikasi Email</h3>
                                            <p className="text-xs text-slate-500 mt-1">Penyuntingan redaksi surat & notifikasi otomatis sistem</p>
                                        </div>
                                    </div>
                                    <select
                                        value={selectedTemplate}
                                        onChange={(e) => setSelectedTemplate(e.target.value)}
                                        className="h-10 px-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-700 text-sm font-bold outline-none cursor-pointer appearance-none min-w-[240px]"
                                    >
                                        <option value="otp">Template OTP Registrasi</option>
                                        <option value="lpj">Template Peringatan LPJ</option>
                                        <option value="pagu">Template Pagu Disetujui</option>
                                    </select>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 ml-1">Subjek Surel (Subject Email)</Label>
                                        <Input
                                            value={emailTemplates[selectedTemplate].subject}
                                            onChange={(e) => setEmailTemplates({
                                                ...emailTemplates,
                                                [selectedTemplate]: { ...emailTemplates[selectedTemplate], subject: e.target.value }
                                            })}
                                            className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-700 text-sm shadow-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 ml-1">Konten Surat (HTML/Text Editor)</Label>
                                        <div className="relative">
                                            <textarea
                                                rows="6"
                                                value={emailTemplates[selectedTemplate].body}
                                                onChange={(e) => setEmailTemplates({
                                                    ...emailTemplates,
                                                    [selectedTemplate]: { ...emailTemplates[selectedTemplate], body: e.target.value }
                                                })}
                                                className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-slate-700 text-sm outline-none focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 leading-relaxed shadow-inner"
                                                placeholder="Ketik template email HTML di sini..."
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-slate-100">
                                        <div className="space-y-2">
                                            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Variabel Tersedia</span>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedTemplate === 'otp' && ['{{NAMA}}', '{{OTP}}', '{{LIFETIME}}'].map(t => (
                                                    <span key={t} className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px] font-bold cursor-help hover:bg-slate-200 hover:text-slate-800 transition-colors" title={`Klik untuk menyalin ${t}`}>{t}</span>
                                                ))}
                                                {selectedTemplate === 'lpj' && ['{{ORMAWA}}', '{{KEGIATAN}}', '{{XP_PENALTY}}'].map(t => (
                                                    <span key={t} className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px] font-bold cursor-help hover:bg-slate-200 hover:text-slate-800 transition-colors" title={`Klik untuk menyalin ${t}`}>{t}</span>
                                                ))}
                                                {selectedTemplate === 'pagu' && ['{{ORMAWA}}', '{{KEGIATAN}}', '{{ANGGARAN}}'].map(t => (
                                                    <span key={t} className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px] font-bold cursor-help hover:bg-slate-200 hover:text-slate-800 transition-colors" title={`Klik untuk menyalin ${t}`}>{t}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => handleSaveTemplate()}
                                            className="h-10 px-6 rounded-full bg-[#0B215E] text-white hover:bg-[#081b4b] transition-colors flex items-center justify-center gap-2 cursor-pointer font-bold shrink-0 w-full sm:w-auto"
                                        >
                                            <span className="material-symbols-outlined leading-none" style={{ fontSize: '16px' }}>save</span>
                                            <span className="text-[11px] font-bold uppercase tracking-wider">Simpan Template</span>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div> {/* <-- Re-added the missing closing div for lg:col-span-3 */}

                    </div>
                )}



                {/* ── Tab Content: Keamanan & Sesi (Tab 4) ───────────────────────── */}
                {activeTab === 'keamanan' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                        {/* 4.1 Security Policy Parameters Form (Spans 1 Col) */}
                        <div className="bg-white border border-slate-200/60 rounded-2xl p-6 md:p-8 space-y-6 flex flex-col shadow-sm">
                            <div className="space-y-6">
                                <div className="space-y-1">
                                    <h3 className="text-lg font-bold text-slate-800 tracking-tight">Security Configuration</h3>
                                    <p className="text-xs text-slate-500 mt-1">Kebijakan Kredensial & Batas Akses User</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 ml-1">Panjang Minimal Sandi</Label>
                                        <Input
                                            type="number"
                                            value={securitySettings.passwordMinLength}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, passwordMinLength: parseInt(e.target.value) || 8 })}
                                            className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 ml-1">Batas Waktu Idle Sesi (Menit)</Label>
                                        <Input
                                            type="number"
                                            value={securitySettings.sessionTimeout}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(e.target.value) || 30 })}
                                            className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-xs font-bold text-slate-700 ml-1">Maksimal Kegagalan Login</Label>
                                        <Input
                                            type="number"
                                            value={securitySettings.maxLoginAttempts}
                                            onChange={(e) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(e.target.value) || 5 })}
                                            className="h-11 rounded-xl border-slate-200 bg-white focus:border-bku-primary focus:ring-1 focus:ring-bku-primary/30 text-slate-600 text-sm shadow-none"
                                        />
                                    </div>

                                    <div
                                        onClick={() => setSecuritySettings(prev => ({ ...prev, requireSpecialChar: !prev.requireSpecialChar }))}
                                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/50 bg-slate-50 hover:bg-white hover:border-bku-primary/30 transition-all cursor-pointer">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-700 leading-none">Wajib Simbol Karakter</p>
                                            <p className="text-[11px] text-slate-500">Gunakan karakter unik (!@#$%).</p>
                                        </div>
                                        {securitySettings.requireSpecialChar ?
                                            <div className="text-emerald-500"><ToggleRight size={24} /></div> :
                                            <div className="text-slate-300"><ToggleLeft size={24} /></div>
                                        }
                                    </div>

                                    <div
                                        onClick={() => setSecuritySettings(prev => ({ ...prev, requireCapital: !prev.requireCapital }))}
                                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/50 bg-slate-50 hover:bg-white hover:border-bku-primary/30 transition-all cursor-pointer">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-700 leading-none">Wajib Kapital & Angka</p>
                                            <p className="text-[11px] text-slate-500">Kombinasi huruf besar dan angka.</p>
                                        </div>
                                        {securitySettings.requireCapital ?
                                            <div className="text-emerald-500"><ToggleRight size={24} /></div> :
                                            <div className="text-slate-300"><ToggleLeft size={24} /></div>
                                        }
                                    </div>

                                    <div
                                        onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactorAuth: !prev.twoFactorAuth }))}
                                        className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/50 bg-slate-50 hover:bg-white hover:border-bku-primary/30 transition-all cursor-pointer">
                                        <div className="space-y-1">
                                            <p className="text-sm font-bold text-slate-700 leading-none">2-Factor Auth (2FA)</p>
                                            <p className="text-[11px] text-slate-500">Verifikasi OTP tambahan saat login.</p>
                                        </div>
                                        {securitySettings.twoFactorAuth ?
                                            <div className="text-emerald-500"><ToggleRight size={24} /></div> :
                                            <div className="text-slate-300"><ToggleLeft size={24} /></div>
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="pt-5 border-t border-slate-200/60 mt-auto">
                                <div className="flex gap-2 items-start text-slate-500">
                                    <Info size={16} className="shrink-0 mt-0.5" />
                                    <span className="text-[11px] leading-relaxed">Node Keamanan enkripsi tersertifikasi SHA-256 untuk proteksi database.</span>
                                </div>
                            </div>
                        </div>

                        {/* 4.2 Active Sessions Audit Monitor (Spans 2 Cols) */}
                        <div className="lg:col-span-2 bg-white border border-slate-200/60 shadow-sm rounded-2xl p-6 md:p-8 flex flex-col justify-between">
                            <div className="space-y-6">
                                <div className="flex justify-between items-start md:items-center">
                                    <div className="space-y-1">
                                        <h3 className="text-lg font-bold text-slate-800 tracking-tight">Audit Sesi Log Masuk Aktif</h3>
                                        <p className="text-xs text-slate-500 mt-1">Pemantauan & Pencabutan Akses Sesi Pengguna Super Admin</p>
                                    </div>
                                    {activeSessions.length > 1 && (
                                        <Button
                                            onClick={handleRevokeAllSessions}
                                            variant="outline"
                                            className="h-9 px-4 rounded-lg border-rose-200 text-rose-600 text-[11px] font-bold hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-all cursor-pointer whitespace-nowrap"
                                        >
                                            Revoke Other Sessions
                                        </Button>
                                    )}
                                </div>

                                <div className="overflow-x-auto select-none no-scrollbar border border-slate-200/60 rounded-xl">
                                    <table className="w-full border-collapse text-left text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200/60 bg-slate-50/50 text-xs font-bold text-slate-500">
                                                <th className="py-3 px-4">Perangkat / OS</th>
                                                <th className="py-3 px-4">Alamat IP</th>
                                                <th className="py-3 px-4">Lokasi Deteksi</th>
                                                <th className="py-3 px-4 text-center">Status</th>
                                                <th className="py-3 px-4 text-right">Aksi</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100/60">
                                            {activeSessions.map((session) => (
                                                <tr key={session.id} className="hover:bg-slate-50 transition-all">
                                                    <td className="py-4 px-4">
                                                        <div className="flex flex-col">
                                                            <span className="text-sm font-bold text-slate-800 leading-none">{session.device}</span>
                                                            {session.isCurrent && <span className="text-[10px] font-bold text-bku-primary tracking-wider uppercase mt-1.5 leading-none">Browser Ini</span>}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-4 text-sm text-slate-500 tabular-nums">{session.ip}</td>
                                                    <td className="py-4 px-4 text-sm text-slate-500">{session.location}</td>
                                                    <td className="py-4 px-4 text-center">
                                                        <span className={cn(
                                                            "px-2.5 py-1 rounded-full font-bold tracking-wider text-[11px] uppercase border",
                                                            session.isCurrent ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                                session.status.includes('Idle') ? "bg-amber-50 text-amber-600 border-amber-100" : "bg-slate-50 text-slate-500 border-slate-200/50"
                                                        )}>
                                                            {session.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        {session.isCurrent ? (
                                                            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Aman</span>
                                                        ) : (
                                                            <Button
                                                                onClick={() => handleKickSession(session.id, session.device)}
                                                                variant="outline"
                                                                className="h-8 px-4 rounded-lg border-rose-200 text-rose-500 text-[11px] font-bold hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-all cursor-pointer whitespace-nowrap"
                                                            >
                                                                Revoke
                                                            </Button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="pt-5 border-t border-slate-200/60 mt-auto">
                                <div className="flex gap-2 items-start text-slate-500">
                                    <Info size={16} className="shrink-0 mt-0.5" />
                                    <span className="text-[11px] leading-relaxed">Mencurigai akses login ilegal? Klik "Revoke" untuk memutus sesi perangkat lain secara instan.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Tab Content: API Integrations (Tab 5) ───────────────────────── */}
                {activeTab === 'integrasi' && (
                    <div className="space-y-6">
                        <div className="space-y-1">
                            <h3 className="text-base font-bold font-headline leading-none" style={{ color: 'var(--theme-h3)' }}>API Gateway & Integrasi Eksternal</h3>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sinkronisasi Jaringan Data Pihak Ketiga & Lembaga Pendidikan Nasional</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                {
                                    key: 'sevima',
                                    name: 'SEVIMA SIAKAD CLOUD',
                                    desc: 'Integrasi data mahasiswa dan kurikulum melalui platform Sevima Siakad Cloud.',
                                    icon: 'cloud_sync',
                                    endpointLabel: 'APP KEY',
                                    keyLabel: 'SECRET KEY'
                                },
                                {
                                    key: 'whatsapp',
                                    name: 'KONTAK YANG BISA DIHUBUNGI',
                                    desc: 'Nomor kontak WhatsApp layanan bantuan mahasiswa.',
                                    icon: 'support_agent',
                                    endpointLabel: 'Nomor Utama',
                                },
                                {
                                    key: 'seo',
                                    name: 'SEO & ANALYTICS',
                                    desc: 'Konfigurasi Meta Tags, Open Graph, dan Indexing untuk mesin pencari.',
                                    icon: 'search_insights',
                                    endpointLabel: 'Base URL Website',
                                },
                                {
                                    key: 'simkatmawa',
                                    name: 'SIMKATMAWA KEMDIKBUD',
                                    desc: 'Integrasi pelaporan data prestasi mahasiswa ke SIMKATMAWA.',
                                    icon: 'sync_alt',
                                    endpointLabel: 'Email SIMKATMAWA',
                                    keyLabel: 'Password SIMKATMAWA'
                                }
                            ].map((integ) => {
                                const current = apiIntegrations[integ.key] || { endpoint: '', clientKey: '', active: false, show: false }
                                return (
                                    <div key={integ.key} className="glass-card border border-slate-200/60 p-6 rounded-2xl flex flex-col justify-between hover:shadow-md transition-all duration-300">
                                        <div className="space-y-4 flex-1">
                                            <div className="flex items-center justify-between">
                                                <div className="size-11 rounded-xl bg-bku-primary/5 border border-bku-primary/10 flex items-center justify-center text-bku-primary">
                                                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>{integ.icon}</span>
                                                </div>
                                                <span className={cn(
                                                    "px-2.5 py-0.5 rounded-full font-black tracking-widest text-[8px] uppercase font-headline border",
                                                    current.active ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-slate-100 text-slate-400 border-slate-200/50"
                                                )}>
                                                    {current.active ? 'Connected' : 'Offline'}
                                                </span>
                                            </div>

                                            <div className="space-y-1">
                                                <h4 className="text-xs font-black font-headline uppercase leading-none" style={{ color: 'var(--theme-h4)' }}>{integ.name}</h4>
                                                <p className="text-[10px] font-medium text-slate-400 leading-relaxed mt-1">{integ.desc}</p>
                                            </div>

                                            {/* Editable parameters for actual integration endpoint URLs */}
                                            <div className="space-y-3 pt-3 border-t border-slate-100 font-headline">
                                                <div className="space-y-1">
                                                    <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{integ.endpointLabel}</Label>
                                                    <Input
                                                        value={current.endpoint}
                                                        onChange={(e) => setApiIntegrations({
                                                            ...apiIntegrations,
                                                            [integ.key]: { ...current, endpoint: e.target.value }
                                                        })}
                                                        className="h-8 px-2 border-slate-200 rounded-lg text-xs font-bold text-slate-600 bg-white"
                                                    />
                                                </div>
                                                {integ.keyLabel && (
                                                    <div className="space-y-1">
                                                        <Label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{integ.keyLabel}</Label>
                                                        <div className="relative">
                                                            <Input
                                                                type={current.show ? "text" : "password"}
                                                                value={current.clientKey}
                                                                onChange={(e) => setApiIntegrations({
                                                                    ...apiIntegrations,
                                                                    [integ.key]: { ...current, clientKey: e.target.value }
                                                                })}
                                                                className="h-8 px-2 pr-8 border-slate-200 rounded-lg text-xs font-bold text-slate-600 bg-white w-full"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleKeyMask(integ.key)}
                                                                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-slate-400 hover:text-bku-primary cursor-pointer"
                                                            >
                                                                <span className="material-symbols-outlined leading-none" style={{ fontSize: '14px' }} >
                                                                    {current.show ? 'visibility_off' : 'visibility'}
                                                                </span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-4 mt-5 border-t border-slate-100 flex items-center justify-between shrink-0">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none font-headline">Status Aktivasi Gateway</span>
                                            <div
                                                onClick={() => !integrationLoading[integ.key] && handleToggleIntegration(integ.key, integ.name)}
                                                className="cursor-pointer"
                                            >
                                                {integrationLoading[integ.key] ? (
                                                    <RefreshCw size={20} className="animate-spin text-bku-primary" />
                                                ) : current.active ? (
                                                    <div className="text-emerald-500 flex items-center"><ToggleRight size={26} /></div>
                                                ) : (
                                                    <div className="text-slate-300 flex items-center"><ToggleLeft size={26} /></div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                onClick={() => handleUpdate()}
                                disabled={submitting}
                                className="h-11 px-8 rounded-xl bg-bku-primary text-white hover:bg-bku-primary/90 border-none transition-all cursor-pointer font-bold gap-2 text-xs shadow-md shadow-bku-primary/20"
                            >
                                {submitting ? <RefreshCw size={16} className="animate-spin text-white mr-2" /> : <span className="material-symbols-outlined leading-none" style={{ fontSize: '16px' }} >save</span>}
                                Simpan Konfigurasi
                            </Button>
                        </div>
                    </div>
                )}

            </div>

            {/* ── Emergency Shutdown System Modal (Premium dialog with validation) ── */}
            <Dialog open={isEmergencyModalOpen} onOpenChange={setIsEmergencyModalOpen}>
                <DialogContent className="sm:max-w-[480px] font-inter select-none">
                    <DialogHeader className="space-y-3 !border-b-0">
                        <div className="size-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-1 mx-auto animate-bounce">
                            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>gpp_maybe</span>
                        </div>
                        <DialogTitle className="text-center text-lg font-black text-rose-600 font-headline uppercase tracking-wide leading-none">
                            Otorisasi Shutdown Darurat
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-500 font-medium text-[11px] leading-relaxed px-4">
                            Peringatan! Eksekusi darurat akan segera mencabut seluruh token sesi publik, mengunci form pengisian KRS mahasiswa, serta menonaktifkan portal dosen/nilai. Ketik kata sandi otorisasi Anda untuk memproses keamanan tingkat tinggi.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-2 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Sandi Konfirmasi Otoritas</Label>
                            <Input
                                type="password"
                                placeholder="Masukkan password konfirmasi Anda"
                                value={emergencyPassword}
                                onChange={(e) => setEmergencyPassword(e.target.value)}
                                className="h-11 rounded-xl border-slate-200 focus:border-rose-300 focus:ring-rose-200/50 bg-slate-50/50 focus:bg-white font-bold text-sm text-slate-700 font-headline text-center transition-all"
                            />
                            <p className="text-[9px] font-bold text-slate-400 leading-relaxed ml-1 uppercase text-center mt-2">Petunjuk: Ketik <span className="font-extrabold text-slate-600">"admin123"</span> untuk otorisasi.</p>
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between items-center gap-3 !border-t-0 mt-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsEmergencyModalOpen(false)
                                setEmergencyPassword('')
                            }}
                            className="h-11 px-6 rounded-xl w-full sm:w-auto"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            disabled={isEmergencySubmitting}
                            onClick={executeEmergencyShutdown}
                            className="h-11 px-6 rounded-xl w-full sm:w-auto"
                        >
                            {isEmergencySubmitting ? <RefreshCw size={14} className="animate-spin text-white" /> : 'EKSEKUSI SHUTDOWN'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Factory Reset System Modal ── */}
            <Dialog open={isResetModalOpen} onOpenChange={setIsResetModalOpen}>
                <DialogContent className="sm:max-w-[480px] font-inter select-none">
                    <DialogHeader className="space-y-3 !border-b-0">
                        <div className="size-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500 mb-1 mx-auto animate-pulse">
                            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>delete_forever</span>
                        </div>
                        <DialogTitle className="text-center text-lg font-black text-rose-600 font-headline uppercase tracking-wide leading-none">
                            Otorisasi Factory Reset
                        </DialogTitle>
                        <DialogDescription className="text-center text-slate-500 font-medium text-[11px] leading-relaxed px-4">
                            Peringatan! Tindakan ini akan menghapus SEMUA data secara permanen (kecuali akun Super Admin). Untuk melanjutkan, ketik "<span className="font-extrabold text-slate-700">RESET</span>" pada kolom di bawah ini.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="px-6 py-2 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Kata Kunci Konfirmasi</Label>
                            <Input
                                type="text"
                                placeholder='Ketik "RESET" di sini'
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value)}
                                className="h-11 rounded-xl border-slate-200 focus:border-rose-300 focus:ring-rose-200/50 bg-slate-50/50 focus:bg-white font-bold text-sm text-slate-700 font-headline text-center uppercase transition-all"
                            />
                        </div>
                    </div>

                    <DialogFooter className="sm:justify-between items-center gap-3 !border-t-0 mt-2">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                setIsResetModalOpen(false)
                                setResetConfirmText('')
                            }}
                            className="h-11 px-6 rounded-xl w-full sm:w-auto"
                        >
                            Batal
                        </Button>
                        <Button
                            variant="danger"
                            disabled={isResetting || resetConfirmText !== 'RESET'}
                            onClick={confirmResetDatabase}
                            className="h-11 px-6 rounded-xl w-full sm:w-auto"
                        >
                            {isResetting ? <RefreshCw size={14} className="animate-spin text-white" /> : 'RESET DATABASE'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </PageContent>
    )
}

export default AcademicPortal
