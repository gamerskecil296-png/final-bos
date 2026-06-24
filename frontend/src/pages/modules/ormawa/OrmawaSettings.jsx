"use client"
import React, { useState, useEffect } from 'react';
import { PageContent, PageHeader } from '@/components/ui/page';
import { Button } from '@/components/ui/Button'



import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { fetchWithAuth, API_BASE_URL } from '@/services/api'
import useAuthStore from '@/store/useAuthStore'
import { getOrmawaId } from '@/utils/getOrmawaId'
import { usePermission } from '@/hooks/usePermission'

const API = `${API_BASE_URL}/ormawa`

const FieldGroup = ({ label, children, icon }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-1.5 ml-1">
      {icon && <span className="material-symbols-outlined text-slate-400 text-sm">{icon}</span>}
      <Label className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase font-headline">{label}</Label>
    </div>
    {children}
  </div>
)

export default function Settings() {
  const { hasPermission } = usePermission()
  const canManageSettings = hasPermission('ormawa.settings.manage')
  
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [config, setConfig] = useState({
    Nama: '',
    Deskripsi: '',
    Visi: '',
    Misi: '',
    LogoURL: '',
    Email: '',
    Phone: '',
    Instagram: '',
    Website: '',
    Rekening: ''
  })

  const ormawaId = getOrmawaId()

  const fetchSettings = async () => {
    try {
      const data = await fetchWithAuth(`${API}/settings/${ormawaId}`)
      if (data.status === 'success') {
        const d = data.data;
        const formatDate = (dateStr) => {
          if (!dateStr) return '';
          try {
            return new Date(dateStr).toISOString().split('T')[0];
          } catch (e) {
            return '';
          }
        };
        setConfig({
          Nama: d?.Nama || d?.nama || '',
          Deskripsi: d?.Deskripsi || d?.deskripsi || '',
          Visi: d?.Visi || d?.visi || '',
          Misi: d?.Misi || d?.misi || '',
          LogoURL: d?.LogoURL || d?.logo_url || d?.logoUrl || '',
          Email: d?.Email || d?.email || '',
          Phone: d?.Phone || d?.phone || '',
          Instagram: d?.Instagram || d?.instagram || '',
          Website: d?.Website || d?.website || '',
          Rekening: d?.Rekening || d?.rekening || '',
        })
      }
    } catch { }
  }

  useEffect(() => {
    fetchSettings()
  }, [ormawaId])

  const handleLogoUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Check file constraints
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File terlalu besar! Maksimal 2MB.')
      return
    }

    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    try {
      const json = await fetchWithAuth(`${API}/upload`, { method: 'POST', body: fd })
      if (json.status === 'success') {
        setConfig(c => ({ ...c, LogoURL: json.url }))
        toast.success('Logo berhasil diunggah!')
        // Dispatch custom event to notify Sidebar/Navbar to refresh settings
        window.dispatchEvent(new Event('ormawa_settings_updated'))
      } else {
        toast.error('Gagal mengunggah logo')
      }
    } catch {
      toast.error('Gagal mengunggah logo karena gangguan server')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        ...config,
      }
      const json = await fetchWithAuth(`${API}/settings/${ormawaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (json.status === 'success') {
        toast.success('Pengaturan sistem berhasil disimpan!')
        window.dispatchEvent(new Event('ormawa_settings_updated'))
        fetchSettings()
      } else {
        toast.error(json.message || 'Gagal menyimpan perubahan')
      }
    } catch {
      toast.error('Terjadi kesalahan jaringan backend')
    } finally {
      setLoading(false)
    }
  }

  const getLogoPath = (path) => {
    if (!path) return null
    if (path.startsWith('http')) return path
    const baseDomain = API_BASE_URL ? API_BASE_URL.replace('/api', '') : ''
    return `${baseDomain}${path.startsWith('/') ? '' : '/'}${path}`
  }

  const logoUrl = getLogoPath(config.LogoURL)

  // Profile completeness percentage
  const calculateCompleteness = () => {
    const fields = [config.Nama, config.Deskripsi, config.Visi, config.Misi, config.LogoURL, config.Email, config.Phone]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }
  const completeness = calculateCompleteness()

  return (
    <PageContent className="font-body">
      <Toaster position="top-right" />

            {/* ── Welcome Banner ─────────────────────────────────────────── */}
      <PageHeader 
        title="Pengaturan Sistem"
        subtitle="Kelola data resmi, profil kelembagaan, visi misi, serta informasi saluran komunikasi organisasi."
        icon="settings"
       
        breadcrumbs={[ { label: 'Dashboard', path: '/ormawa' }, { label: 'Pengaturan Sistem', path: '#' } ]} 
      />

      {/* ── Content Area ───────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* LEFT SIDEBAR: Brand & Brand Identity */}
          <div className="space-y-6 lg:col-span-1">
            <Card className="border border-border shadow-sm overflow-hidden bg-surface rounded-2xl transition-all hover:shadow-md">
              <CardContent className="p-8 flex flex-col items-center gap-6">

                <div className="relative group">
                  {/* Outer breathing accent */}
                  <div className="absolute inset-0 bg-[var(--theme-primary-light)] rounded-2xl blur-xl scale-95 transition-all group-hover:scale-105 duration-300" />

                  {/* Logo Container */}
                  <div className="relative w-36 h-36 rounded-2xl border-4 border-white shadow-xl overflow-hidden bg-[var(--theme-bg)] flex items-center justify-center transition-all duration-300 group-hover:rotate-1 group-hover:scale-[1.03]">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo Organisasi" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-300 gap-1.5">
                        <span className="material-symbols-outlined text-5xl" style={{ fontVariationSettings: "'FILL' 0, 'wght' 200" }}>group</span>
                        <span className="text-[9px] font-black tracking-widest text-slate-400">NO LOGO</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="w-full text-center space-y-1">
                  <h3 className="font-bold text-sm font-headline tracking-tight" style={{ color: 'var(--theme-h3)' }}>{config.Nama || 'Nama Ormawa Belum Diisi'}</h3>
                  <Badge className="bg-[var(--theme-bg)] text-[var(--theme-text-muted)] font-bold text-[9px] border border-border px-3 py-0.5 rounded-full uppercase tracking-wider">
                    ID ORMAWA: {ormawaId}
                  </Badge>
                </div>

                {/* Upload Action */}
                {canManageSettings && (
                  <label className="cursor-pointer w-full">
                    <div className="w-full h-10 rounded-xl border border-dashed border-border bg-[var(--theme-bg)] hover:bg-[var(--theme-border-muted)] hover:border-[var(--theme-primary)] flex items-center justify-center gap-2 text-[10px] font-semibold tracking-wider text-[var(--theme-text-muted)] hover:text-[var(--theme-primary)] transition-all active:scale-95">
                      {uploading ? (
                        <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span>
                      ) : (
                        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>cloud_upload</span>
                      )}
                      <span>{uploading ? 'MENGUNGGAH LOGO...' : 'UNGGAH LOGO BARU'}</span>
                    </div>
                    <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploading} />
                  </label>
                )}

                <p className="text-[9px] font-bold text-slate-400 tracking-wider text-center leading-normal">
                  Format berkas: PNG, JPG, JPEG.<br />Maksimal 2MB. Dimensi proporsional 1:1.
                </p>
              </CardContent>
            </Card>

            {/* Profile Completeness Card */}
            <Card className="border border-border shadow-sm overflow-hidden bg-surface rounded-2xl">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: '20px' }}>info</span>
                    <span className="text-[10px] font-black text-[var(--theme-text-muted)] tracking-wider font-headline uppercase">Kelengkapan Profil</span>
                  </div>
                  <span className="text-xs font-black text-[var(--theme-primary)] font-headline">{completeness}%</span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--theme-primary)] rounded-full transition-all duration-500"
                    style={{ width: `${completeness}%` }}
                  />
                </div>

                <p className="text-[9.5px] leading-relaxed text-slate-400 font-medium">
                  Pastikan seluruh data profil, visi & misi, serta narasi singkat organisasi Anda terisi agar terlihat kredibel pada sistem informasi publik kampus.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT CONTENT FORM: Organization Details */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="border border-border shadow-sm overflow-hidden bg-surface rounded-2xl">
              <CardContent className="p-6 md:p-8 space-y-8">

                {/* Section: Identitas Utama */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border-muted)]">
                    <div className="size-6 rounded-lg bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)]">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>id_card</span>
                    </div>
                    <h2 className="text-[11px] font-black tracking-widest text-[var(--theme-primary)] uppercase font-headline">IDENTITAS LEMBAGA MAHASISWA</h2>
                  </div>

                  <div className="space-y-4">
                    <FieldGroup label="Nama Resmi Ormawa" icon="badge">
                      <Input
                        required
                        value={config.Nama}
                        onChange={e => setConfig({ ...config, Nama: e.target.value })}
                        placeholder="Masukkan nama resmi lembaga/organisasi..."
                        className="h-10 rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none transition-all font-bold text-xs"
                      />
                    </FieldGroup>

                    <FieldGroup label="Narasi Singkat Profil" icon="article">
                      <Textarea
                        value={config.Deskripsi}
                        onChange={e => setConfig({ ...config, Deskripsi: e.target.value })}
                        placeholder="Tuliskan narasi singkat yang merepresentasikan organisasi Anda..."
                        className="min-h-[100px] rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none p-4 font-medium text-xs leading-relaxed"
                      />
                    </FieldGroup>
                  </div>
                </div>

                {/* Section: Filosofi Visi Misi */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border-muted)]">
                    <div className="size-6 rounded-lg bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)]">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>explore</span>
                    </div>
                    <h2 className="text-[11px] font-black tracking-widest text-[var(--theme-primary)] uppercase font-headline">FILOSOFI GERAKAN & ARAH JUANG</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Pernyataan Visi" icon="visibility">
                      <Textarea
                        value={config.Visi}
                        onChange={e => setConfig({ ...config, Visi: e.target.value })}
                        placeholder="Visi organisasi jangka panjang..."
                        className="min-h-[120px] rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none p-4 font-medium text-xs leading-relaxed"
                      />
                    </FieldGroup>

                    <FieldGroup label="Rencana Strategis Misi" icon="task_alt">
                      <Textarea
                        value={config.Misi}
                        onChange={e => setConfig({ ...config, Misi: e.target.value })}
                        placeholder="Poin-poin misi utama organisasi (pisahkan dengan baris baru)..."
                        className="min-h-[120px] rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none p-4 font-medium text-xs leading-relaxed"
                      />
                    </FieldGroup>
                  </div>
                </div>

                {/* Section: Kontak & Media Sosial */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border-muted)]">
                    <div className="size-6 rounded-lg bg-[var(--theme-primary-light)] flex items-center justify-center text-[var(--theme-primary)]">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>contact_mail</span>
                    </div>
                    <h2 className="text-[11px] font-black tracking-widest text-[var(--theme-primary)] uppercase font-headline">KONTAK & MEDIA INFORMASI PUBLIK</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FieldGroup label="Surel Resmi (Email)" icon="alternate_email">
                      <Input
                        type="email"
                        value={config.Email}
                        onChange={e => setConfig({ ...config, Email: e.target.value })}
                        placeholder="misal: bem@student.bku.ac.id"
                        className="h-10 rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none transition-all font-bold text-xs"
                      />
                    </FieldGroup>

                    <FieldGroup label="Nomor Telepon (WhatsApp)" icon="call">
                      <Input
                        value={config.Phone}
                        onChange={e => setConfig({ ...config, Phone: e.target.value })}
                        placeholder="misal: 0812-3456-7890"
                        className="h-10 rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none transition-all font-bold text-xs"
                      />
                    </FieldGroup>

                    <FieldGroup label="Akun Instagram" icon="photo_camera">
                      <Input
                        value={config.Instagram}
                        onChange={e => setConfig({ ...config, Instagram: e.target.value })}
                        placeholder="misal: @bem_bku"
                        className="h-10 rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none transition-all font-bold text-xs"
                      />
                    </FieldGroup>

                    <FieldGroup label="Alamat Situs Web" icon="language">
                      <Input
                        type="url"
                        value={config.Website}
                        onChange={e => setConfig({ ...config, Website: e.target.value })}
                        placeholder="misal: https://bem.bku.ac.id"
                        className="h-10 rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none transition-all font-bold text-xs"
                      />
                    </FieldGroup>
                  </div>
                </div>

                {/* Section: Rekening Penerimaan Dana */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 pb-3 border-b border-[var(--theme-border-muted)]">
                    <div className="size-6 rounded-lg bg-[var(--theme-primary-light)]/40 flex items-center justify-center text-[var(--theme-primary)]">
                      <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>account_balance</span>
                    </div>
                    <h2 className="text-[11px] font-black tracking-widest text-[var(--theme-primary)] uppercase font-headline">REKENING PENERIMAAN DANA KEGIATAN</h2>
                  </div>

                  <div className="space-y-4">
                    <FieldGroup label="Informasi Rekening Bank" icon="credit_card">
                      <Input
                        value={config.Rekening}
                        onChange={e => setConfig({ ...config, Rekening: e.target.value })}
                        placeholder="misal: Bank Mandiri - 1234567890 a.n. BEM BKU"
                        className="h-10 rounded-xl border border-border bg-white focus:ring-[var(--theme-primary-light)] focus:outline-none focus:border-[var(--theme-primary)] shadow-none transition-all font-bold text-xs"
                      />
                    </FieldGroup>
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Sticky Save Button Container */}
            {canManageSettings && (
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full md:w-auto h-10 px-8 rounded-xl bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 border-none"
                >
                  {loading ? (
                    <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span>
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>save</span>
                  )}
                  <span className="text-[10px] font-black tracking-widest uppercase">SIMPAN PERUBAHAN SISTEM</span>
                </Button>
              </div>
            )}

          </div>

        </div>
      </form>
    </PageContent>
  )
}
