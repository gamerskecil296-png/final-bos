"use client"

import React, { useState, useEffect } from "react"
import { toast, Toaster } from "react-hot-toast"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/Button"
import { PageContent } from "@/components/ui/page/PageContent"
import { DashboardHero } from "@/components/ui/dashboard/DashboardHero"
import { API_BASE_URL } from "@/services/api"
import useAuthStore from "@/store/useAuthStore"

export default function Settings() {
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [profile, setProfile]       = useState({ email: '', role: '', nama_lengkap: '', no_hp: '', avatar_url: '' })
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' })
  const [activeTab, setActiveTab]   = useState('profile')
  const updateUser = useAuthStore((state) => state.updateUser)

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = API_BASE_URL?.replace('/api', '') || '';
    return `${baseUrl}${path}`;
  }

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/app/dashboard/profile')
      if (data.success) {
        setProfile({ 
          email: data.data.email, 
          role: data.data.role,
          nama_lengkap: data.data.nama_lengkap || '',
          no_hp: data.data.no_hp || '',
          avatar_url: data.data.avatar_url || ''
        })
      }
    } catch {
      toast.error('Gagal memuat profil')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const { data } = await api.put('/app/dashboard/profile', { 
        email: profile.email,
        nama_lengkap: profile.nama_lengkap,
        no_hp: profile.no_hp,
        avatar_url: profile.avatar_url
      })
      if (data.success) {
        toast.success('Profil berhasil diperbarui')
        updateUser({
          email: profile.email,
          nama_lengkap: profile.nama_lengkap,
          avatar_url: profile.avatar_url
        })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui profil')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Format file harus PNG/JPG/WEBP')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran maksimal file adalah 2MB')
      return
    }

    setUploadingAvatar(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const { data } = await api.post('/app/dashboard/profile/upload-avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      if (data.success) {
        setProfile({ ...profile, avatar_url: data.url })
        toast.success('Avatar berhasil diunggah')
        updateUser({ avatar_url: data.url })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengunggah avatar')
    } finally {
      setUploadingAvatar(false)
      e.target.value = null // reset input
    }
  }

  const handleAvatarDelete = async () => {
    try {
      setUploadingAvatar(true)
      const { data } = await api.delete('/app/dashboard/profile/avatar')
      if (data.success) {
        setProfile({ ...profile, avatar_url: '' })
        toast.success('Avatar berhasil dihapus')
        updateUser({ avatar_url: '' })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    if (passwordData.new_password !== passwordData.confirm_password) {
      return toast.error('Konfirmasi password tidak cocok')
    }
    setSubmitting(true)
    try {
      const { data } = await api.put('/app/dashboard/change-password', passwordData)
      if (data.success) {
        toast.success('Password berhasil diperbarui')
        setPasswordData({ old_password: '', new_password: '', confirm_password: '' })
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memperbarui password')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 font-inter">
        <span className="material-symbols-outlined animate-spin text-[var(--theme-primary)]" style={{ fontSize: 32 }}>sync</span>
        <p className="text-sm text-[var(--theme-text-muted)] font-medium">Memuat konfigurasi profil...</p>
      </div>
    )
  }

  return (
    <PageContent>
      <Toaster position="top-right" />

      <DashboardHero
        title="Pengaturan"
        highlightedTitle="Akun"
        subtitle="Kelola identitas dan keamanan portal fakultas Anda."
        icon="manage_accounts"
        badges={[
          { label: 'Sistem Aktif', active: true },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* ── Navigation Sidebar ───────────────────────────────── */}
        <aside className="lg:col-span-3 space-y-2">
          {[
            { id: 'profile', label: 'Informasi Profil', icon: 'person', desc: 'Email & Username' },
            { id: 'security', label: 'Keamanan', icon: 'security', desc: 'Kata Sandi & Akses' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 text-left border group",
                activeTab === tab.id 
                  ? "bg-[var(--theme-surface)] border-[var(--theme-primary)] shadow-sm ring-4 ring-[var(--theme-primary-light)]/20" 
                  : "bg-transparent border-transparent text-[var(--theme-text-muted)] hover:bg-[var(--theme-surface-hover)]"
              )}
            >
              <div className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-[var(--theme-primary)] text-white border-[var(--theme-primary)] shadow-md shadow-[var(--theme-primary-light)]" 
                  : "bg-[var(--theme-surface)] text-[var(--theme-text-muted)] border-[var(--theme-border)] group-hover:text-[var(--theme-primary)]"
              )}>
                <span className="material-symbols-outlined" style={{ fontSize: 22 }}>{tab.icon}</span>
              </div>
              <div className="min-w-0">
                <p className={cn("text-sm font-bold transition-colors", activeTab === tab.id ? "text-[var(--theme-text)]" : "text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text)]")}>{tab.label}</p>
                <p className="text-[11px] text-[var(--theme-text-subtle)] font-medium truncate mt-0.5">{tab.desc}</p>
              </div>
            </button>
          ))}
        </aside>

        {/* ── Main Content Area ────────────────────────────────── */}
        <main className="lg:col-span-9">
          
          {/* TAB: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl p-8 shadow-sm space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[var(--theme-text)]">Informasi Profil</h2>
                <p className="text-sm text-[var(--theme-text-muted)] font-medium">Data ini digunakan untuk login dan korespondensi sistem.</p>
              </div>

              <div className="bg-[var(--theme-primary-light)]/30 border border-[var(--theme-primary)]/20 p-4 rounded-2xl flex gap-3 mb-6">
                <span className="material-symbols-outlined text-[var(--theme-primary)] mt-0.5" style={{ fontSize: 20 }}>info</span>
                <div>
                  <p className="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider mb-0.5">Catatan Sistem</p>
                  <p className="text-xs text-[var(--theme-text-muted)] font-medium leading-relaxed">
                    Username Anda dibuat secara otomatis berdasarkan awalan dari alamat email resmi.
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-8">
                
                {/* Avatar Section */}
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                  <div className="relative group cursor-pointer shrink-0">
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--theme-surface)] shadow-lg bg-[var(--theme-surface-hover)] flex items-center justify-center transition-all group-hover:border-[var(--theme-primary)]">
                      {uploadingAvatar ? (
                        <span className="material-symbols-outlined animate-spin text-[var(--theme-primary)]" style={{ fontSize: 32 }}>sync</span>
                      ) : profile.avatar_url ? (
                        <img src={getImageUrl(profile.avatar_url)} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="material-symbols-outlined text-[var(--theme-text-muted)]" style={{ fontSize: 40 }}>person</span>
                      )}
                    </div>
                    <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-full cursor-pointer">
                      <span className="material-symbols-outlined" style={{ fontSize: 24 }}>photo_camera</span>
                      <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                    </label>
                  </div>
                  <div className="flex-1 space-y-3 w-full text-center md:text-left pt-2">
                    <div>
                      <h3 className="text-sm font-bold text-[var(--theme-text)]">Foto Profil</h3>
                      <p className="text-xs text-[var(--theme-text-muted)] font-medium mt-1 leading-relaxed">
                        Klik pada foto di samping untuk mengunggah gambar baru.<br/>
                        <span className="text-[10px] bg-[var(--theme-surface-hover)] px-2 py-1 rounded-md border border-[var(--theme-border)] mt-1 inline-block">Format: JPG, PNG, WEBP (Max 2MB)</span>
                      </p>
                    </div>
                    {profile.avatar_url && (
                      <button
                        type="button"
                        onClick={handleAvatarDelete}
                        disabled={uploadingAvatar}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <span className="material-symbols-outlined !text-[16px]">delete</span>
                        Hapus Foto
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[var(--theme-border)] w-full opacity-50" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Nama Lengkap</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 20 }}>badge</span>
                      <input
                        type="text"
                        value={profile.nama_lengkap}
                        onChange={(e) => setProfile({ ...profile, nama_lengkap: e.target.value })}
                        className="w-full h-12 pl-12 pr-4 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-all font-semibold shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                        placeholder="Dr. Budi Santoso, M.Si."
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Nomor Telepon (Opsional)</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 20 }}>call</span>
                      <input
                        type="tel"
                        value={profile.no_hp}
                        onChange={(e) => setProfile({ ...profile, no_hp: e.target.value })}
                        className="w-full h-12 pl-12 pr-4 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-all font-semibold shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                        placeholder="0812xxxxxx"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Alamat Email Resmi</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 20 }}>mail</span>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full h-12 pl-12 pr-4 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-all font-semibold shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                        placeholder="contoh@bku.ac.id"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Username Login</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 20 }}>account_circle</span>
                      <input
                        type="text"
                        value={profile.email ? profile.email.split('@')[0] : 'admin'}
                        className="w-full h-12 pl-12 pr-4 border border-[var(--theme-border)] rounded-xl text-sm bg-[var(--theme-surface-hover)] text-[var(--theme-text-muted)] cursor-not-allowed font-semibold shadow-sm"
                        disabled
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--theme-border)] flex justify-end">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-8 rounded-xl bg-[var(--theme-primary)] text-white hover:bg-[var(--theme-primary-hover)] font-bold text-xs tracking-wide transition-all shadow-lg shadow-[var(--theme-primary-light)] active:scale-95 flex items-center gap-2"
                  >
                    {submitting ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>save</span>}
                    Simpan Perubahan
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: SECURITY */}
          {activeTab === 'security' && (
            <div className="bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-3xl p-8 shadow-sm space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="space-y-1 text-left">
                <h2 className="text-lg font-bold text-[var(--theme-text)]">Keamanan & Password</h2>
                <p className="text-sm text-[var(--theme-text-muted)] font-medium">Pastikan Anda menggunakan kombinasi password yang kuat.</p>
              </div>

              <div className="bg-[var(--theme-warning-light)]/30 border border-[var(--theme-warning)]/20 p-4 rounded-2xl flex gap-3 mb-6">
                <span className="material-symbols-outlined text-[var(--theme-warning)] mt-0.5" style={{ fontSize: 20 }}>warning</span>
                <div>
                  <p className="text-xs font-bold text-[var(--theme-warning)] uppercase tracking-wider mb-0.5">Perhatian Keamanan</p>
                  <p className="text-xs text-[var(--theme-text-muted)] font-medium leading-relaxed">
                    Setelah Anda mengubah kata sandi, Anda mungkin akan diminta untuk masuk kembali ke dalam sistem.
                  </p>
                </div>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-8 text-left">
                <div className="max-w-md space-y-6">
                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1">Password Saat Ini</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 20 }}>lock_open</span>
                      <input
                        type="password"
                        value={passwordData.old_password}
                        onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                        className="w-full h-12 pl-12 pr-4 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-all font-semibold shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                        placeholder="Masukkan password lama"
                        required
                      />
                    </div>
                  </div>

                  <div className="h-px bg-[var(--theme-border)] w-full opacity-50" />

                  <div className="space-y-2.5">
                    <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1 text-left">Password Baru</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 20 }}>lock</span>
                      <input
                        type="password"
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                        className="w-full h-12 pl-12 pr-4 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-all font-semibold shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                        placeholder="Min. 8 karakter"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5 text-left">
                    <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider ml-1 text-left">Konfirmasi Password Baru</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 20 }}>lock_reset</span>
                      <input
                        type="password"
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                        className="w-full h-12 pl-12 pr-4 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-all font-semibold shadow-sm placeholder:text-[var(--theme-text-subtle)]"
                        placeholder="Ulangi password baru"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-[var(--theme-border)] flex justify-start">
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="h-11 px-8 rounded-xl bg-[var(--theme-text)] text-[var(--theme-surface)] hover:bg-[var(--theme-text-muted)] font-bold text-xs tracking-wide transition-all shadow-lg active:scale-95 flex items-center gap-2"
                  >
                    {submitting ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: 18 }}>sync</span> : <span className="material-symbols-outlined" style={{ fontSize: 18 }}>security_update_good</span>}
                    Update Password Keamanan
                  </Button>
                </div>
              </form>
            </div>
          )}

        </main>
      </div>
    </PageContent>
  )
}
