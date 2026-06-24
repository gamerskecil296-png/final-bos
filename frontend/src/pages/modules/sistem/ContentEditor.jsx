import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { Badge } from '@/components/ui/Badge'
import { Toaster, toast } from 'react-hot-toast'
import { adminService, landingService, ASSET_URL } from '@/services/api'
import { usePermission } from '@/hooks/usePermission'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import Editor from '@monaco-editor/react'
import SeoAnalysis from '@/components/Editor/YoastSeoAnalysis'
import { cn, compressToWebP } from '@/lib/utils'

export default function ContentEditor() {
    const navigate = useNavigate()
    const { id } = useParams()
    const { hasPermission } = usePermission()
    const reactQuillRef = useRef(null)
    
    const isEditMode = !!id

    const [editorMode, setEditorMode] = useState('visual') // 'visual' | 'code'
    const [loading, setLoading] = useState(isEditMode)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [faculties, setFaculties] = useState([])
    const [ormawas, setOrmawas] = useState([])
    const [students, setStudents] = useState([])
    
    const [mahasiswaSubtype, setMahasiswaSubtype] = useState('global')
    const [ormawaSubtype, setOrmawaSubtype] = useState('all')
    const [studentSearch, setStudentSearch] = useState('')
    const [ormawaSearch, setOrmawaSearch] = useState('')

    const [form, setForm] = useState({
        Judul: '',
        Isi: '',
        Kategori: 'Pengumuman',
        Status: 'Draft',
        GambarURL: '',
        target_audience: 'semua',
        target_fakultas_id: '',
        target_ormawa_id: '',
        target_mahasiswa_ids: '',
        target_ormawa_ids: '',
        slug: '',
        meta_description: '',
        focus_keyword: '',
        publish_to: 'keduanya'
    })

    useEffect(() => {
        fetchMetadata()
        if (isEditMode) {
            fetchNewsDetail()
        }
    }, [id])

    const fetchMetadata = async () => {
        try {
            const [facRes, ormRes, stdRes] = await Promise.all([
                adminService.getAllFaculties(),
                adminService.getAllOrmawa(),
                adminService.getAllStudents()
            ])
            if (facRes.status === 'success') setFaculties(facRes.data || [])
            if (ormRes.status === 'success') setOrmawas(ormRes.data || [])
            if (stdRes.status === 'success') setStudents(stdRes.data || [])
        } catch {
            toast.error('Gagal mengambil data referensi')
        }
    }

    const fetchNewsDetail = async () => {
        try {
            setLoading(true)
            const res = await adminService.getAllNews()
            if (res.status === 'success') {
                const item = res.data.find(n => String(n.id || n.ID) === id)
                if (item) {
                    setForm({
                        Judul: item.Judul || '',
                        Isi: item.Isi || '',
                        Kategori: item.Kategori || 'Pengumuman',
                        Status: item.Status || 'Draft',
                        GambarURL: item.GambarURL || '',
                        target_audience: item.target_audience || item.TargetAudience || 'semua',
                        target_fakultas_id: item.target_fakultas_id || item.TargetFakultasID || '',
                        target_ormawa_id: item.target_ormawa_id || item.TargetOrmawaID || '',
                        target_mahasiswa_ids: item.target_mahasiswa_ids || item.TargetMahasiswaIDs || '',
                        target_ormawa_ids: item.target_ormawa_ids || item.TargetOrmawaIDs || '',
                        slug: item.Slug || '',
                        meta_description: item.MetaDescription || '',
                        focus_keyword: item.FocusKeyword || '',
                        publish_to: item.publish_to || item.PublishTo || 'keduanya'
                    })
                    
                    const audience = item.target_audience || item.TargetAudience || 'semua'
                    const targetMhsIds = item.target_mahasiswa_ids || item.TargetMahasiswaIDs || ''
                    const targetOrmIds = item.target_ormawa_ids || item.TargetOrmawaIDs || ''
                    const targetFacId = item.target_fakultas_id || item.TargetFakultasID || ''
                    const targetOrmId = item.target_ormawa_id || item.TargetOrmawaID || ''

                    if (audience === 'mahasiswa') {
                        if (targetMhsIds) setMahasiswaSubtype('spesifik')
                        else if (targetFacId) setMahasiswaSubtype('fakultas')
                        else setMahasiswaSubtype('global')
                    } else if (audience === 'ormawa') {
                        if (targetOrmIds) setOrmawaSubtype('spesifik')
                        else setOrmawaSubtype('all')
                    }
                } else {
                    toast.error('Berita tidak ditemukan')
                    navigate('/app/sistem/berita')
                }
            }
        } catch {
            toast.error('Gagal mengambil data berita')
        } finally {
            setLoading(false)
        }
    }

    const filteredStudents = students.filter(s => {
        const query = studentSearch.toLowerCase()
        return (s.Nama?.toLowerCase().includes(query) || s.nama?.toLowerCase().includes(query) || s.NIM?.toLowerCase().includes(query) || s.nim?.toLowerCase().includes(query))
    })

    const filteredOrmawas = ormawas.filter(o => {
        const query = ormawaSearch.toLowerCase()
        return (o.Nama?.toLowerCase().includes(query) || o.nama?.toLowerCase().includes(query))
    })

    const toggleAudience = (val) => {
        let current = (form.target_audience || '').split(',').filter(Boolean);
        if (val === 'semua') {
            current = ['semua'];
        } else {
            current = current.filter(a => a !== 'semua');
            if (current.includes(val)) {
                current = current.filter(a => a !== val);
            } else {
                current.push(val);
            }
            if (current.length === 0) current = ['semua'];
        }
        setForm(prev => ({
            ...prev,
            target_audience: current.join(','),
            ...(val === 'semua' ? { target_fakultas_id: '', target_ormawa_id: '', target_mahasiswa_ids: '', target_ormawa_ids: '' } : {})
        }));
        if (val === 'mahasiswa' && current.includes('mahasiswa')) setMahasiswaSubtype('global');
        if (val === 'ormawa' && current.includes('ormawa')) setOrmawaSubtype('all');
    }

    const handleMahasiswaSubtypeChange = (v) => {
        setMahasiswaSubtype(v)
        setForm(prev => ({
            ...prev,
            target_fakultas_id: '',
            target_mahasiswa_ids: ''
        }))
    }

    const handleOrmawaSubtypeChange = (v) => {
        setOrmawaSubtype(v)
        setForm(prev => ({
            ...prev,
            target_ormawa_id: '',
            target_ormawa_ids: ''
        }))
    }

    const handleTitleChange = (e) => {
        const newTitle = e.target.value;
        const autoSlug = newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
        
        setForm(prev => {
            return {
                ...prev,
                Judul: newTitle,
                slug: autoSlug
            };
        });
    }

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsSubmitting(true);
        try {
            let uploadFile = file;
            if (file.type.startsWith('image/')) {
                toast.loading('Mengompresi gambar ke WebP...', { id: 'compress_toast' });
                uploadFile = await compressToWebP(file, 0.8);
                toast.dismiss('compress_toast');
            }

            const formData = new FormData();
            formData.append('image', uploadFile);
            const res = await landingService.uploadImage(formData);
            if (res.status === 'success' || res.url) {
                setForm({ ...form, GambarURL: res.url });
                toast.success('Gambar berhasil diunggah');
            } else {
                toast.error(res.message || 'Gagal mengunggah gambar');
            }
        } catch (error) {
            toast.error(error.message || 'Error saat mengunggah gambar');
        } finally {
            setIsSubmitting(false);
        }
    };

    const imageHandler = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            toast.loading('Mengompresi dan mengunggah gambar...', { id: 'quill_upload' });
            try {
                let uploadFile = file;
                if (file.type.startsWith('image/')) {
                    uploadFile = await compressToWebP(file, 0.8);
                }

                const formData = new FormData();
                formData.append('image', uploadFile);
                
                const res = await landingService.uploadImage(formData);
                if (res.status === 'success' || res.url) {
                    const quill = reactQuillRef.current.getEditor();
                    const range = quill.getSelection(true);
                    quill.insertEmbed(range.index, 'image', `${ASSET_URL}${res.url}`);
                    toast.success('Gambar berhasil ditambahkan', { id: 'quill_upload' });
                } else {
                    toast.error(res.message || 'Gagal mengunggah gambar', { id: 'quill_upload' });
                }
            } catch (error) {
                toast.error('Error: ' + error.message, { id: 'quill_upload' });
            }
        };
    }, []);

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                ['bold', 'italic', 'underline', 'strike', 'blockquote'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }, { 'indent': '-1'}, { 'indent': '+1' }],
                ['link', 'image', 'video'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        }
    }), [imageHandler]);

    const handleSave = async (e) => {
        if (e) e.preventDefault()
        setIsSubmitting(true)
        try {
            let finalAudience = form.target_audience || "";
            const audArr = finalAudience.split(',').filter(Boolean);
            if (audArr.includes('mahasiswa') && mahasiswaSubtype === 'global') {
                finalAudience = audArr.map(a => a === 'mahasiswa' ? 'mahasiswa_global' : a).join(',');
            }

            const payload = {
                ...form,
                target_audience: finalAudience,
                target_fakultas_id: form.target_fakultas_id ? Number(form.target_fakultas_id) : null,
                target_ormawa_id: form.target_ormawa_id ? Number(form.target_ormawa_id) : null,
                target_mahasiswa_ids: form.target_mahasiswa_ids || "",
                target_ormawa_ids: form.target_ormawa_ids || ""
            }
            const res = isEditMode
                ? await adminService.updateNews(id, payload)
                : await adminService.createNews(payload)
            if (res.status === 'success') {
                toast.success(isEditMode ? 'Konten diperbarui' : 'Berita berhasil diterbitkan')
                navigate('/app/sistem/berita')
            } else {
                toast.error(res.message || 'Gagal menyimpan konten')
            }
        } catch {
            toast.error('Terjadi kesalahan sistem')
        } finally {
            setIsSubmitting(false)
        }
    }

    if (loading) {
        return (
            <PageContent>
                <div className="flex justify-center items-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-bku-primary"></div>
                </div>
            </PageContent>
        )
    }

    return (
        <PageContent>
            <Toaster position="top-right" />
            <div className="max-w-[1600px] mx-auto space-y-8 select-none">
                <div className="mb-6">
                    <DashboardHero
                        title={isEditMode ? 'Edit' : 'Tulis'}
                        highlightedTitle="Berita"
                        subtitle={isEditMode ? 'Ubah konten berita atau pengumuman yang sudah ada.' : 'Buat publikasi baru untuk sivitas akademika.'}
                        icon={isEditMode ? 'edit' : 'add_circle'}
                    />
                </div>

                <form id="announcement-form" onSubmit={handleSave}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 px-1 font-inter items-start">
                        {/* LEFT COLUMN: Editor & SEO */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="space-y-2">
                                <Input required value={form.Judul} onChange={handleTitleChange} placeholder="Add title" className="h-14 rounded-xl border-slate-200 bg-white focus:bg-white font-bold text-2xl font-headline focus:ring-bku-primary/20" />
                            </div>

                            <div className="space-y-2 bg-white rounded-xl shadow-sm border border-slate-200">
                                <div className="flex items-center justify-between p-2 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                                    <div className="flex gap-2">
                                        <Button 
                                            type="button"
                                            variant={editorMode === 'visual' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setEditorMode('visual')}
                                            className={cn("h-8 text-[11px] font-bold uppercase tracking-wider", editorMode === 'visual' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700')}
                                        >
                                            <span className="material-symbols-outlined mr-1" style={{ fontSize: '14px' }}>visibility</span>
                                            Visual (Quill)
                                        </Button>
                                        <Button 
                                            type="button"
                                            variant={editorMode === 'code' ? 'default' : 'ghost'}
                                            size="sm"
                                            onClick={() => setEditorMode('code')}
                                            className={cn("h-8 text-[11px] font-bold uppercase tracking-wider", editorMode === 'code' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-700')}
                                        >
                                            <span className="material-symbols-outlined mr-1" style={{ fontSize: '14px' }}>code</span>
                                            Code (HTML)
                                        </Button>
                                    </div>
                                </div>
                                {editorMode === 'visual' ? (
                                    <ReactQuill 
                                        ref={reactQuillRef}
                                        theme="snow" 
                                        value={form.Isi} 
                                        onChange={val => setForm({ ...form, Isi: val })}
                                        modules={modules}
                                        placeholder="Start writing or type / to choose a block"
                                        className="h-[500px] mb-12"
                                    />
                                ) : (
                                    <div className="h-[500px]">
                                        <Editor
                                            height="100%"
                                            defaultLanguage="html"
                                            theme="vs-dark"
                                            value={form.Isi}
                                            onChange={val => setForm({ ...form, Isi: val || '' })}
                                            options={{
                                                wordWrap: 'on',
                                                minimap: { enabled: false },
                                                fontSize: 14,
                                                formatOnPaste: true,
                                            }}
                                        />
                                    </div>
                                )}
                            </div>

                            {form.publish_to !== 'notifikasi_saja' && (
                                <SeoAnalysis 
                                    title={form.Judul}
                                    content={form.Isi}
                                    slug={form.slug}
                                    metaDescription={form.meta_description}
                                    focusKeyword={form.focus_keyword}
                                    onSlugChange={(v) => setForm({...form, slug: v})}
                                    onMetaChange={(v) => setForm({...form, meta_description: v})}
                                    onKeywordChange={(v) => setForm({...form, focus_keyword: v})}
                                />
                            )}
                        </div>

                        {/* RIGHT COLUMN: Settings */}
                        <div className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="flex flex-col gap-3 pb-5 border-b border-slate-100">
                                <Button
                                    onClick={handleSave}
                                    disabled={isSubmitting}
                                    className="w-full h-12 rounded-xl bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-slate-900 transition-all active:scale-95 border-none"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>{isSubmitting ? 'sync' : 'save'}</span>
                                    {isSubmitting ? 'Menyimpan...' : (isEditMode ? 'Update Konten' : 'Terbitkan')}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={(e) => { e.preventDefault(); navigate('/app/sistem/berita'); }}
                                    className="w-full h-12 rounded-xl font-black text-[10px] uppercase tracking-widest gap-2"
                                    type="button"
                                >
                                    <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>arrow_back</span>
                                    Kembali
                                </Button>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Kategori Berita</Label>
                                <Select value={form.Kategori} onValueChange={(v) => setForm({ ...form, Kategori: v })}>
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm font-headline focus:ring-bku-primary/20">
                                        <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-slate-200">
                                        <SelectItem value="Pengumuman" className="text-[11px] font-bold uppercase tracking-widest font-headline">Pengumuman</SelectItem>
                                        <SelectItem value="Prestasi" className="text-[11px] font-bold uppercase tracking-widest font-headline">Prestasi</SelectItem>
                                        <SelectItem value="Acara" className="text-[11px] font-bold uppercase tracking-widest font-headline">Acara</SelectItem>
                                        <SelectItem value="Kerja Sama" className="text-[11px] font-bold uppercase tracking-widest font-headline">Kerja Sama</SelectItem>
                                        <SelectItem value="Pengabdian" className="text-[11px] font-bold uppercase tracking-widest font-headline">Pengabdian</SelectItem>
                                        <SelectItem value="Akademik" className="text-[11px] font-bold uppercase tracking-widest font-headline">Akademik</SelectItem>
                                        <SelectItem value="Lainnya" className="text-[11px] font-bold uppercase tracking-widest font-headline">Lainnya</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 mt-4">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Tampilkan Di</Label>
                                <Select value={form.publish_to} onValueChange={(v) => setForm({ ...form, publish_to: v })}>
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm font-headline focus:ring-bku-primary/20">
                                        <SelectValue placeholder="Pilih Tempat Tayang" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-slate-200">
                                        <SelectItem value="keduanya" className="text-[11px] font-bold uppercase tracking-widest font-headline">Keduanya (Web & Notif)</SelectItem>
                                        <SelectItem value="landing_saja" className="text-[11px] font-bold uppercase tracking-widest font-headline">Website Landing Page</SelectItem>
                                        <SelectItem value="notifikasi_saja" className="text-[11px] font-bold uppercase tracking-widest font-headline">Notifikasi Internal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Visibilitas Publikasi</Label>
                                <Select value={form.Status} onValueChange={(v) => setForm({ ...form, Status: v })}>
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50 font-bold text-sm font-headline focus:ring-bku-primary/20">
                                        <SelectValue placeholder="Pilih Visibilitas" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-slate-200">
                                        <SelectItem value="Published" className="text-[11px] font-bold uppercase tracking-widest font-headline text-emerald-600">Published</SelectItem>
                                        <SelectItem value="Draft" className="text-[11px] font-bold uppercase tracking-widest font-headline text-amber-600">Draft</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Gambar Cover / Thumbnail</Label>
                            <div className="flex flex-col gap-3">
                                {form.GambarURL && (
                                    <img src={form.GambarURL.startsWith('http') ? form.GambarURL : `${ASSET_URL}${form.GambarURL.startsWith('/') ? '' : '/'}${form.GambarURL}`} alt="Thumbnail" className="w-full h-32 object-cover rounded-xl border border-slate-200" />
                                )}
                                <Input type="file" accept="image/*" onChange={handleImageUpload} className="h-11 rounded-xl border-slate-200 bg-slate-50 focus:bg-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:uppercase file:tracking-widest file:bg-slate-200 file:text-slate-700 hover:file:bg-slate-300 transition-all cursor-pointer w-full" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Target Penerima (Audience)</Label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'semua', label: 'Semua Sivitas' },
                                    { value: 'fakultas', label: 'Spesifik Fakultas' },
                                    { value: 'ormawa', label: 'Spesifik Ormawa' },
                                    { value: 'mahasiswa', label: 'Mahasiswa' }
                                ].map(opt => {
                                    const isSelected = (form.target_audience || '').split(',').includes(opt.value);
                                    return (
                                        <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => toggleAudience(opt.value)}
                                            className={`px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest font-headline transition-all ${isSelected ? 'bg-bku-primary text-white shadow-md' : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {(form.target_audience || '').split(',').includes('fakultas') && (
                            <div className="space-y-2 animate-in fade-in duration-200">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Pilih Fakultas Penerima</Label>
                                <Select
                                    value={form.target_fakultas_id ? String(form.target_fakultas_id) : undefined}
                                    onValueChange={v => setForm({ ...form, target_fakultas_id: Number(v) })}
                                >
                                    <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-white font-bold text-sm font-headline focus:ring-bku-primary/20">
                                        <SelectValue placeholder="PILIH FAKULTAS" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl shadow-xl border-slate-200 max-h-[200px] overflow-y-auto">
                                        {faculties.map(f => (
                                            <SelectItem key={f.ID || f.id} value={String(f.ID || f.id)} className="text-[11px] font-bold uppercase tracking-widest font-headline">
                                                {f.Nama || f.nama}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {(form.target_audience || '').split(',').includes('ormawa') && (
                            <div className="space-y-3 animate-in fade-in duration-200">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Tipe Pengiriman Ormawa</Label>
                                    <Select value={ormawaSubtype} onValueChange={handleOrmawaSubtypeChange}>
                                        <SelectTrigger className="h-11 rounded-lg border-neutral-200 bg-white font-medium text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl shadow-xl">
                                            <SelectItem value="all" className="text-xs font-medium uppercase">Kirim ke Satu Ormawa Tertentu</SelectItem>
                                            <SelectItem value="spesifik" className="text-xs font-medium uppercase text-primary">Kirim ke Beberapa Ormawa (Pilih/Ceklis)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {ormawaSubtype === 'all' && (
                                    <div className="space-y-2 animate-in fade-in duration-200">
                                        <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Pilih Ormawa Penerima</Label>
                                        <Select
                                            value={form.target_ormawa_id ? String(form.target_ormawa_id) : undefined}
                                            onValueChange={v => setForm({ ...form, target_ormawa_id: Number(v) })}
                                        >
                                            <SelectTrigger className="h-11 rounded-lg border-neutral-200 bg-white font-medium text-sm">
                                                <SelectValue placeholder="PILIH ORMAWA" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl shadow-xl max-h-[200px] overflow-y-auto">
                                                {ormawas.map(o => (
                                                    <SelectItem key={o.id || o.ID} value={String(o.id || o.ID)} className="text-xs font-bold uppercase">
                                                        {o.nama || o.Nama}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {ormawaSubtype === 'spesifik' && (
                                    <div className="space-y-2 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between text-xs font-bold text-neutral-500 font-jakarta ml-1">
                                            <span>Pilih Daftar Ormawa (Ceklis)</span>
                                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[10px]">
                                                {(form.target_ormawa_ids || '').split(',').filter(Boolean).length} Terpilih
                                            </Badge>
                                        </div>
                                        <Input
                                            placeholder="Cari nama ormawa..."
                                            value={ormawaSearch}
                                            onChange={e => setOrmawaSearch(e.target.value)}
                                            className="h-10 rounded-lg border-neutral-200 bg-white font-medium text-sm font-jakarta"
                                        />
                                        <div className="border border-neutral-200 rounded-xl p-3 bg-white space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                                                <input
                                                    type="checkbox"
                                                    id="select-all-ormawas"
                                                    checked={filteredOrmawas.length > 0 && filteredOrmawas.every(o => (form.target_ormawa_ids || '').split(',').includes(String(o.id || o.ID)))}
                                                    onChange={e => {
                                                        const checked = e.target.checked
                                                        const currentIds = (form.target_ormawa_ids || '').split(',').filter(Boolean)
                                                        let nextIds
                                                        if (checked) {
                                                            nextIds = Array.from(new Set([...currentIds, ...filteredOrmawas.map(o => String(o.id || o.ID))]))
                                                        } else {
                                                            const filteredSet = new Set(filteredOrmawas.map(o => String(o.id || o.ID)))
                                                            nextIds = currentIds.filter(id => !filteredSet.has(id))
                                                        }
                                                        setForm({ ...form, target_ormawa_ids: nextIds.join(',') })
                                                    }}
                                                    className="rounded border-neutral-300 text-primary focus:ring-primary size-4"
                                                />
                                                <Label htmlFor="select-all-ormawas" className="text-xs font-bold text-neutral-600 cursor-pointer">Pilih Semua Hasil Pencarian</Label>
                                            </div>

                                            {filteredOrmawas.length === 0 ? (
                                                <p className="text-xs text-neutral-400 italic text-center py-4">Ormawa tidak ditemukan.</p>
                                            ) : (
                                                filteredOrmawas.map(o => {
                                                    const oid = String(o.id || o.ID)
                                                    const selectedIds = (form.target_ormawa_ids || '').split(',').filter(Boolean)
                                                    const isChecked = selectedIds.includes(oid)
                                                    return (
                                                        <div key={oid} className="flex items-center gap-2 py-0.5">
                                                            <input
                                                                type="checkbox"
                                                                id={`orm-chk-${oid}`}
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    let nextIds
                                                                    if (isChecked) {
                                                                        nextIds = selectedIds.filter(id => id !== oid)
                                                                    } else {
                                                                        nextIds = [...selectedIds, oid]
                                                                    }
                                                                    setForm({ ...form, target_ormawa_ids: nextIds.join(',') })
                                                                }}
                                                                className="rounded border-neutral-300 text-primary focus:ring-primary size-4"
                                                            />
                                                            <Label htmlFor={`orm-chk-${oid}`} className="text-xs font-medium text-neutral-700 cursor-pointer flex flex-1 justify-between items-center">
                                                                <span>{o.nama || o.Nama}</span>
                                                            </Label>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {(form.target_audience || '').split(',').includes('mahasiswa') && (
                            <div className="space-y-3 animate-in fade-in duration-200">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Tipe Pengiriman Mahasiswa</Label>
                                    <Select value={mahasiswaSubtype} onValueChange={handleMahasiswaSubtypeChange}>
                                        <SelectTrigger className="h-11 rounded-lg border-neutral-200 bg-white font-medium text-sm"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl shadow-xl">
                                            <SelectItem value="global" className="text-xs font-medium uppercase">Kirim ke Semua Mahasiswa (Global)</SelectItem>
                                            <SelectItem value="fakultas" className="text-xs font-medium uppercase">Kirim ke Mahasiswa Fakultas Tertentu</SelectItem>
                                            <SelectItem value="spesifik" className="text-xs font-medium uppercase text-primary">Kirim ke Mahasiswa Spesifik (Pilih/Ceklis)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {mahasiswaSubtype === 'fakultas' && (
                                    <div className="space-y-2 animate-in fade-in duration-200">
                                        <Label className="text-xs font-bold text-neutral-500 font-jakarta ml-1">Pilih Fakultas Mahasiswa</Label>
                                        <Select
                                            value={form.target_fakultas_id ? String(form.target_fakultas_id) : undefined}
                                            onValueChange={v => setForm({ ...form, target_fakultas_id: Number(v) })}
                                        >
                                            <SelectTrigger className="h-11 rounded-lg border-neutral-200 bg-white font-medium text-sm">
                                                <SelectValue placeholder="PILIH FAKULTAS" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl shadow-xl max-h-[200px] overflow-y-auto">
                                                {faculties.map(f => (
                                                    <SelectItem key={f.ID || f.id} value={String(f.ID || f.id)} className="text-xs font-bold uppercase">
                                                        {f.Nama || f.nama}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {mahasiswaSubtype === 'spesifik' && (
                                    <div className="space-y-2 animate-in fade-in duration-200">
                                        <div className="flex items-center justify-between text-xs font-bold text-neutral-500 font-jakarta ml-1">
                                            <span>Pilih Daftar Mahasiswa (Ceklis)</span>
                                            <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border-none font-bold text-[10px]">
                                                {(form.target_mahasiswa_ids || '').split(',').filter(Boolean).length} Terpilih
                                            </Badge>
                                        </div>
                                        <Input
                                            placeholder="Cari nama atau NIM mahasiswa..."
                                            value={studentSearch}
                                            onChange={e => setStudentSearch(e.target.value)}
                                            className="h-10 rounded-lg border-neutral-200 bg-white font-medium text-sm font-jakarta"
                                        />
                                        <div className="border border-neutral-200 rounded-xl p-3 bg-white space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                            <div className="flex items-center gap-2 pb-2 border-b border-neutral-200">
                                                <input
                                                    type="checkbox"
                                                    id="select-all-students"
                                                    checked={filteredStudents.length > 0 && filteredStudents.every(s => (form.target_mahasiswa_ids || '').split(',').includes(String(s.ID || s.id)))}
                                                    onChange={e => {
                                                        const checked = e.target.checked
                                                        const currentIds = (form.target_mahasiswa_ids || '').split(',').filter(Boolean)
                                                        let nextIds
                                                        if (checked) {
                                                            nextIds = Array.from(new Set([...currentIds, ...filteredStudents.map(s => String(s.ID || s.id))]))
                                                        } else {
                                                            const filteredSet = new Set(filteredStudents.map(s => String(s.ID || s.id)))
                                                            nextIds = currentIds.filter(id => !filteredSet.has(id))
                                                        }
                                                        setForm({ ...form, target_mahasiswa_ids: nextIds.join(',') })
                                                    }}
                                                    className="rounded border-neutral-300 text-primary focus:ring-primary size-4"
                                                />
                                                <Label htmlFor="select-all-students" className="text-xs font-bold text-neutral-600 cursor-pointer">Pilih Semua Hasil Pencarian</Label>
                                            </div>

                                            {filteredStudents.length === 0 ? (
                                                <p className="text-xs text-neutral-400 italic text-center py-4">Mahasiswa tidak ditemukan.</p>
                                            ) : (
                                                filteredStudents.map(s => {
                                                    const sid = String(s.ID || s.id)
                                                    const selectedIds = (form.target_mahasiswa_ids || '').split(',').filter(Boolean)
                                                    const isChecked = selectedIds.includes(sid)
                                                    return (
                                                        <div key={sid} className="flex items-center gap-2 py-0.5">
                                                            <input
                                                                type="checkbox"
                                                                id={`mhs-chk-${sid}`}
                                                                checked={isChecked}
                                                                onChange={() => {
                                                                    let nextIds
                                                                    if (isChecked) {
                                                                        nextIds = selectedIds.filter(id => id !== sid)
                                                                    } else {
                                                                        nextIds = [...selectedIds, sid]
                                                                    }
                                                                    setForm({ ...form, target_mahasiswa_ids: nextIds.join(',') })
                                                                }}
                                                                className="rounded border-neutral-300 text-primary focus:ring-primary size-4"
                                                            />
                                                            <Label htmlFor={`mhs-chk-${sid}`} className="text-xs font-medium text-neutral-700 cursor-pointer flex flex-1 justify-between items-center">
                                                                <span>{s.Nama || s.nama}</span>
                                                                <span className="text-[10px] text-neutral-400 font-mono">NIM: {s.NIM || s.nim}</span>
                                                            </Label>
                                                        </div>
                                                    )
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        </div>
                    </div>
                </form>
            </div>
        </PageContent>
    )
}
