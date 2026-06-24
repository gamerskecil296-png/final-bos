"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { adminService, landingService } from '@/services/api'
import { toast, Toaster } from 'react-hot-toast'

import { useNavigate } from 'react-router-dom'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Card, CardContent } from '@/components/ui/Card'
import { PageContent } from '@/components/ui/page'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'
import { DashboardHero } from '@/components/ui/dashboard'
import { DataTable } from '@/components/ui/DataTable'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { cn, stripHtmlAndEntities } from '@/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { usePermission } from '@/hooks/usePermission'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts"
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import YoastSeoAnalysis from '@/components/Editor/YoastSeoAnalysis';

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const NewspaperIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>newspaper</span>;
const CheckCircleIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>check_circle</span>;
const EditNoteIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>edit_note</span>;
const GroupIcon = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;



export default function ContentManagement() {
    const { hasPermission } = usePermission();
    const [news, setNews] = useState([])
    const [faculties, setFaculties] = useState([])
    const [ormawas, setOrmawas] = useState([])
    const [students, setStudents] = useState([])
    const [loading, setLoading] = useState(true)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isDelOpen, setIsDelOpen] = useState(false)
    const [selected, setSelected] = useState(null)
    const navigate = useNavigate()
    const [form, setForm] = useState({
        Judul: '',
        Isi: '',
        Status: 'Published',
        Kategori: 'Pengumuman',
        GambarURL: '',
        slug: '',
        meta_description: '',
        focus_keyword: '',
        target_audience: 'semua',
        target_fakultas_id: '',
        target_ormawa_id: '',
        target_mahasiswa_ids: '',
        target_ormawa_ids: ''
    })

    // Detailed Checklist states
    const [studentSearch, setStudentSearch] = useState('')
    const [ormawaSearch, setOrmawaSearch] = useState('')
    const [mahasiswaSubtype, setMahasiswaSubtype] = useState('global') // 'global', 'fakultas', 'spesifik'
    const [ormawaSubtype, setOrmawaSubtype] = useState('all') // 'all', 'spesifik'

    const filteredStudents = useMemo(() => {
        if (!studentSearch) return students
        const term = studentSearch.toLowerCase()
        return students.filter(s =>
            (s.Nama || s.nama || '').toLowerCase().includes(term) ||
            (s.NIM || s.nim || '').toLowerCase().includes(term)
        )
    }, [students, studentSearch])

    const filteredOrmawas = useMemo(() => {
        if (!ormawaSearch) return ormawas
        const term = ormawaSearch.toLowerCase()
        return ormawas.filter(o =>
            (o.Nama || o.nama || '').toLowerCase().includes(term)
        )
    }, [ormawas, ormawaSearch])

    const contentStatusData = useMemo(() => {
        const published = news.filter(n => n.Status === 'Published').length
        const draft = news.filter(n => n.Status !== 'Published').length
        return [
            { name: 'Published', value: published },
            { name: 'Draft', value: draft }
        ].filter(d => d.value > 0)
    }, [news])

    const audienceData = useMemo(() => {
        const counts = { semua: 0, fakultas: 0, ormawa: 0, mahasiswa: 0 }
        news.forEach(n => {
            const a = n.target_audience || n.TargetAudience || 'semua'
            const key = a.toLowerCase()
            if (counts[key] !== undefined) {
                counts[key]++
            } else {
                counts.semua++
            }
        })
        return [
            { name: 'Semua', value: counts.semua },
            { name: 'Fakultas', value: counts.fakultas },
            { name: 'Ormawa', value: counts.ormawa },
            { name: 'Mahasiswa', value: counts.mahasiswa }
        ].filter(d => d.value > 0)
    }, [news])

    const monthlyTrendData = useMemo(() => {
        const byMonth = {}
        news.forEach(n => {
            const date = n.TanggalPublish || n.tanggal_publish
            if (!date) return
            const d = new Date(date)
            if (isNaN(d.getTime())) return
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
            byMonth[key] = (byMonth[key] || 0) + 1
        })
        return Object.entries(byMonth)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, count]) => {
                const [y, m] = month.split('-')
                const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des']
                return { month: `${months[parseInt(m) - 1]} ${y}`, value: count }
            })
    }, [news])

    const PIE_COLORS = ['#10b981', '#f59e0b', '#3b82f6', '#8b5cf6']

    const fetchNews = async () => {
        setLoading(true)
        try {
            const data = await adminService.getAllNews()
            if (data.status === 'success') setNews(data.data || [])
            else toast.error('Gagal memuat database berita')
        } catch {
            toast.error('Koneksi sistem terputus')
        } finally {
            setLoading(false)
        }
    }

    const fetchMasterData = async () => {
        try {
            const [facRes, ormawaRes, studentRes] = await Promise.all([
                adminService.getAllFaculties(),
                adminService.getAllOrmawa(),
                adminService.getAllStudents()
            ])
            if (facRes?.status === 'success') setFaculties(facRes.data || [])
            if (ormawaRes?.status === 'success') setOrmawas(ormawaRes.data || [])
            if (studentRes?.status === 'success') setStudents(studentRes.data || [])
        } catch (e) {
            console.error("Gagal memuat data master untuk target berita", e)
        }
    }

    useEffect(() => {
        fetchNews()
        fetchMasterData()
    }, [])

    const handleOpenAdd = () => {
        navigate('/app/sistem/berita/create')
    }

    const handleOpenEdit = (row) => {
        navigate('/app/sistem/berita/edit/' + (row.ID || row.id))
    }

    const handleAudienceChange = (aud) => {
        setForm(prev => ({
            ...prev,
            target_audience: aud,
            target_fakultas_id: '',
            target_ormawa_id: '',
            target_mahasiswa_ids: '',
            target_ormawa_ids: ''
        }))
        setMahasiswaSubtype('global')
        setOrmawaSubtype('all')
    }

    const handleMahasiswaSubtypeChange = (subtype) => {
        setMahasiswaSubtype(subtype)
        setForm(prev => ({
            ...prev,
            target_fakultas_id: '',
            target_mahasiswa_ids: ''
        }))
    }

    const handleOrmawaSubtypeChange = (subtype) => {
        setOrmawaSubtype(subtype)
        setForm(prev => ({
            ...prev,
            target_ormawa_id: '',
            target_ormawa_ids: ''
        }))
    }

    const handleDelete = async () => {
        setIsSubmitting(true)
        try {
            await adminService.deleteNews(selected?.id || selected?.ID)
            toast.success('Konten berhasil dihapus')
            setIsDelOpen(false)
            fetchNews()
        } catch {
            toast.error('Gagal menghapus konten')
        } finally {
            setIsSubmitting(false)
        }
    }

    const columns = [
        {
            key: 'Judul',
            label: 'Informasi & Pratinjau',
            className: 'min-w-[350px]',
            render: (v, row) => (
                <div className="flex flex-col gap-1 py-2">
                    <span className="font-bold text-slate-800 font-headline tracking-tight text-[14px] leading-tight uppercase">{v || '—'}</span>
                    <span className="text-[11px] text-slate-500 font-medium line-clamp-1 max-w-sm">{row.Isi ? stripHtmlAndEntities(row.Isi) : 'Tidak ada deskripsi konten.'}</span>
                </div>
            )
        },
        {
            key: 'TanggalPublish',
            label: 'Tgl Publikasi',
            className: 'w-[200px]',
            render: v => (
                <div className="flex items-center gap-2 text-slate-500">
                    <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '12px' }} >schedule</span>
                    <span className="text-[11px] font-bold font-headline uppercase tabular-nums">
                        {v ? new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                    </span>
                </div>
            )
        },
        {
            key: 'target_audience',
            label: 'Target Penerima',
            className: 'w-[180px]',
            render: (v, row) => {
                const aud = v || row.TargetAudience || 'semua'
                let label = 'Semua Sivitas'
                let details = ''

                if (aud === 'fakultas') {
                    label = 'Fakultas'
                    const facId = row.target_fakultas_id || row.TargetFakultasID
                    const fac = faculties.find(f => (f.ID || f.id) === facId)
                    details = fac ? fac.Nama || fac.nama : `Fakultas ID: ${facId}`
                } else if (aud === 'ormawa') {
                    label = 'Ormawa'
                    const ormIdsStr = row.target_ormawa_ids || row.TargetOrmawaIDs || ''
                    if (ormIdsStr) {
                        const count = ormIdsStr.split(',').filter(Boolean).length
                        details = `${count} Ormawa Terpilih`
                    } else {
                        const ormId = row.target_ormawa_id || row.TargetOrmawaID
                        if (ormId) {
                            const orm = ormawas.find(o => (o.id || o.ID) === ormId)
                            details = orm ? orm.Nama || orm.nama : `Ormawa ID: ${ormId}`
                        } else {
                            details = 'Semua Ormawa'
                        }
                    }
                } else if (aud === 'mahasiswa') {
                    label = 'Mahasiswa'
                    const mhsIdsStr = row.target_mahasiswa_ids || row.TargetMahasiswaIDs || ''
                    if (mhsIdsStr) {
                        const count = mhsIdsStr.split(',').filter(Boolean).length
                        details = `${count} Mahasiswa Terpilih`
                    } else {
                        const facId = row.target_fakultas_id || row.TargetFakultasID
                        if (facId) {
                            const fac = faculties.find(f => (f.ID || f.id) === facId)
                            details = fac ? `Fakultas ${fac.Singkatan || fac.Nama || fac.nama}` : `Fakultas ID: ${facId}`
                        } else {
                            details = 'Global'
                        }
                    }
                }

                return (
                    <div className="flex flex-col gap-0.5">
                        <Badge className="px-2 py-0.5 rounded-lg border-none shadow-none bg-bku-primary/10 text-bku-primary text-[9px] font-black uppercase tracking-widest w-fit font-headline">
                            {label}
                        </Badge>
                        {details && <span className="text-[10px] font-bold text-slate-400 mt-1 max-w-[160px] truncate leading-tight uppercase tracking-widest">{details}</span>}
                    </div>
                )
            }
        },
        {
            key: 'Status',
            label: 'Status',
            className: 'w-[120px] hidden md:table-cell',
            render: (v) => (
                <div className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase inline-flex items-center gap-1.5 ${v === 'Published' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${v === 'Published' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {v}
                </div>
            )
        },
        {
            key: 'publish_to',
            label: 'Tampilkan Di',
            className: 'w-[150px] hidden md:table-cell',
            render: (v) => {
                let text = 'Semua (Web & Notif)';
                if (v === 'landing_saja') text = 'Landing Page Saja';
                if (v === 'notifikasi_saja') text = 'Notifikasi Saja';
                return <span className="text-[11px] font-bold text-slate-600">{text}</span>
            }
        }
    ]

    return (
        <PageContent>
            <Toaster position="top-right" />

            <div className="max-w-[1600px] mx-auto space-y-8 select-none">

                {/* ── Page Header ─────────────────────────────────────────── */}
                <DashboardHero
                    title="Kelola"
                    highlightedTitle="Konten"
                    subtitle="Manajemen publikasi berita, pengumuman akademik, dan informasi resmi universitas untuk seluruh sivitas akademika."
                    icon="newspaper"
                    badges={[
                        { label: 'Public Relations', active: true }
                    ]}
                    actions={
                        hasPermission('announcement.create') && (
                        <Button
                            onClick={handleOpenAdd}
                            className="h-11 px-6 rounded-xl bg-slate-800 text-white font-black font-headline text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-900 transition-all active:scale-95 shadow-none border-none cursor-pointer"
                        >
                            <span className="material-symbols-outlined" style={{ fontSize: '16px' }} strokeWidth={3}>add</span>
                            Tulis Berita
                        </Button>
                        )
                    }
                />

                {/* ── Stat Cards ─────────────────────────────────────────── */}
                {!loading && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 animate-in fade-in duration-300 mb-6">
                        <PrimaryStatsCard
                            title="Total Berita"
                            value={news.length}
                            icon={NewspaperIcon}
                            colorTheme="info"
                        />
                        <PrimaryStatsCard
                            title="Published"
                            value={news.filter(n => n.Status === 'Published').length}
                            icon={CheckCircleIcon}
                            colorTheme="success"
                        />
                        <PrimaryStatsCard
                            title="Draft"
                            value={news.filter(n => n.Status !== 'Published').length}
                            icon={EditNoteIcon}
                            colorTheme="warning"
                        />
                        <PrimaryStatsCard
                            title="Target Audien"
                            value={new Set(news.map(n => n.target_audience || n.TargetAudience || 'semua')).size}
                            icon={GroupIcon}
                            colorTheme="primary"
                        />
                    </div>
                )}

                {/* ── Charts Section ──────────────────────────────────────── */}
                {!loading && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
                        {/* Bar Chart: Target Penerima */}
                        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-bku-primary/10 rounded-xl flex justify-center items-center text-bku-primary flex-shrink-0">
                                    <span className="material-symbols-outlined text-bku-primary" style={{ fontSize: '18px' }} >bar_chart</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">Distribusi Target Penerima Berita</span>
                            </div>
                            <div className="h-[200px] w-full">
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={audienceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" tick={{ fontSize: 8.5, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                        <Tooltip
                                            cursor={{ fill: '#f8fafc' }}
                                            contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "11px", fontWeight: "bold" }}
                                        />
                                        <Bar dataKey="value" name="Jumlah Berita" fill="var(--theme-primary, #00236f)" radius={[4, 4, 0, 0]} barSize={24} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Pie Chart: Status Rilis */}
                        <div className="lg:col-span-1 bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none flex flex-col justify-between">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex justify-center items-center text-emerald-600 flex-shrink-0">
                                    <span className="material-symbols-outlined text-emerald-600" style={{ fontSize: '18px' }} >pie_chart</span>
                                </div>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">Status Publikasi</span>
                            </div>
                            <div className="h-[140px] w-full flex items-center justify-center">
                                {contentStatusData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={140}>
                                        <PieChart>
                                            <Pie
                                                data={contentStatusData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {contentStatusData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "10px", fontWeight: "bold" }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Tidak ada data</span>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 mt-2">
                                {contentStatusData.slice(0, 4).map((item, idx) => (
                                    <div key={item.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                                        <div className="min-w-0">
                                            <p className="text-[9px] font-bold text-slate-400 truncate leading-none">{item.name}</p>
                                            <p className="text-xs font-extrabold text-slate-800 leading-none mt-1">{item.value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Line Chart: Tren Publikasi ──────────────────────────── */}
                {!loading && monthlyTrendData.length > 1 && (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-none animate-in fade-in duration-300">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex justify-center items-center text-indigo-600 flex-shrink-0">
                                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>trending_up</span>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-headline">Tren Publikasi per Bulan</span>
                        </div>
                        <div className="h-[200px] w-full">
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" tick={{ fontSize: 8.5, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <YAxis allowDecimals={false} tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", fontSize: "11px", fontWeight: "bold" }}
                                    />
                                    <Line type="monotone" dataKey="value" name="Jumlah Berita" stroke="#00236f" strokeWidth={2.5} dot={{ fill: '#00236f', r: 3 }} activeDot={{ r: 5, fill: '#00236f' }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )}

                {/* ── Table Section ────────────────────────────────────────── */}
                <Card className="glass-card shadow-sm rounded-xl overflow-hidden animate-in slide-in-from-bottom-4 duration-500 delay-300">
                    <CardContent className="p-0">
                        <DataTable
                            title="Daftar Konten"
                            subtitle="Menampilkan daftar seluruh konten."
                            columns={columns}
                            data={news}
                            loading={loading}
                            searchPlaceholder="Cari judul atau topik berita..."
                            filters={[
                                { key: 'Status', placeholder: 'Semua Status', options: [{ label: 'Published', value: 'Published' }, { label: 'Draft', value: 'Draft' }] }
                            ]}
                            actions={(row) => (
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    {hasPermission('announcement.update') && (
                                      <Button onClick={(e) => { e.stopPropagation(); handleOpenEdit(row); }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >edit</span></Button>
                                    )}
                                      {hasPermission('announcement.delete') && (
                                      <Button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSelected(row); setIsDelOpen(true); }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"><span className="material-symbols-outlined" style={{ fontSize: '16px' }} >delete</span></Button>
                                      )}
                                </div>
                            )}
                        />
                    </CardContent>
                </Card>


            </div>

            <DeleteConfirmModal
                isOpen={isDelOpen}
                onClose={() => setIsDelOpen(false)}
                title="Hapus Konten"
                description={`Anda yakin ingin menghapus konten "${selected?.Judul}"? Aksi ini tidak dapat dibatalkan.`}
                onConfirm={handleDelete}
                loading={isSubmitting}
            />
        </PageContent>
    )
}
