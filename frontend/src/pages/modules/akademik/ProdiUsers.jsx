"use client"

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from "@/components/ui/DialogModal"
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { PrimaryStatsCard } from '@/components/ui/StatsCard'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'

import { fetchWithAuth, API_BASE_URL } from '@/services/api'

// Auto-injected Material Symbol fallbacks
const Users = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>group</span>;
const School = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>school</span>;
const ShieldCheck = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>security</span>;

const API_ADMINS = `${API_BASE_URL}/faculty/prodi-admins`
const API_ROLES  = `${API_BASE_URL}/faculty/prodi-roles`
const API_PRODI  = `${API_BASE_URL}/faculty/majors`

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  SearchableSelect — A styled, inline searchable combobox list               */
/* ═══════════════════════════════════════════════════════════════════════════ */
function SearchableSelect({ value, onChange, options, placeholder, searchPlaceholder = "Cari...", required = false, direction = "down" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  const selectedOption = options.find(opt => String(opt.value) === String(value));

  // Sync search text when closed
  useEffect(() => {
    if (!isOpen) {
      setSearch(selectedOption ? selectedOption.label : "");
    }
  }, [value, selectedOption, isOpen]);

  // Close dropdown when user clicks outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    (opt.label || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Invisible input to maintain native HTML5 validation constraints (removed required to fix focus issue) */}
      <input
        type="text"
        tabIndex={-1}
        className="sr-only absolute inset-x-0 bottom-0 h-0 w-full opacity-0 pointer-events-none"
        value={value || ""}
        onChange={() => {}}
      />

      <div className="relative">
        <input
          type="text"
          value={isOpen ? search : (selectedOption ? selectedOption.label : "")}
          onChange={(e) => {
            setSearch(e.target.value);
            if (!isOpen) setIsOpen(true);
            if (e.target.value === "") onChange(""); // Clear if they empty it
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearch(""); // Start fresh search when clicked
          }}
          placeholder={placeholder}
          className="w-full h-10 pl-3 pr-10 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-colors font-medium placeholder-[var(--theme-text-subtle)]"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--theme-text-subtle)]">
          <span
            className="material-symbols-outlined text-[18px] transition-transform duration-200"
            style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
          >
            keyboard_arrow_down
          </span>
        </div>
      </div>

      {/* Styled Popover list */}
      {isOpen && (
        <div className={`absolute z-[100] left-0 w-full bg-[var(--theme-surface)] border border-[var(--theme-border)] rounded-xl shadow-xl overflow-hidden flex flex-col animate-in fade-in duration-150 ${
          direction === "up" 
            ? "bottom-full mb-1.5 slide-in-from-bottom-1" 
            : "top-full mt-1.5 slide-in-from-top-1"
        }`}>
          <div className="max-h-48 overflow-y-auto custom-scrollbar py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-3 text-xs text-[var(--theme-text-subtle)] text-center font-medium">
                Tidak ada hasil ditemukan
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`px-3 py-2.5 text-xs cursor-pointer font-medium transition-colors flex items-center justify-between ${
                      isSelected
                        ? "bg-[var(--theme-primary-light)] text-[var(--theme-primary)] font-semibold"
                        : "text-[var(--theme-text)] hover:bg-[var(--theme-surface-hover)]"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {isSelected && (
                      <span className="material-symbols-outlined text-[14px] text-[var(--theme-primary)] font-bold">check</span>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  ProdiUsers — Manage prodi_admin accounts under the current faculty       */
/* ═══════════════════════════════════════════════════════════════════════════ */


export default function ProdiUsers() {
  // ── state ──
  const [users, setUsers]     = useState([])
  const [roles, setRoles]     = useState([])
  const [prodis, setProdis]   = useState([])
  const [loading, setLoading] = useState(true)

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen]     = useState(false)
  const [isDelOpen, setIsDelOpen]       = useState(false)
  const [selected, setSelected]         = useState(null)
  const [submitting, setSubmitting]     = useState(false)

  const emptyForm = { email: '', password: '', program_studi_id: '', ormawa_assign: '' }
  const [form, setForm] = useState(emptyForm)
  const [showCreatePassword, setShowCreatePassword] = useState(false)
  const [showEditPassword, setShowEditPassword] = useState(false)

  // ── fetchers ──
  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [uRes, rRes, pRes] = await Promise.all([
        fetchWithAuth(API_ADMINS),
        fetchWithAuth(API_ROLES),
        fetchWithAuth(API_PRODI),
      ])
      if (uRes.status === 'success') setUsers(uRes.data || [])
      if (rRes.status === 'success') setRoles(rRes.data || [])
      // prodi endpoint may return { data: [...] } or directly [...]
      const prodiData = pRes?.data || pRes || []
      setProdis(Array.isArray(prodiData) ? prodiData : [])
    } catch (err) {
      toast.error('Gagal memuat data: ' + (err?.message || ''))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── handlers ──
  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.email) return toast.error('Email wajib diisi')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return toast.error('Format email tidak valid (harus mengandung @ dan domain)')
    if (!form.password) return toast.error('Password wajib diisi')
    if (!form.program_studi_id) return toast.error('Program Studi wajib dipilih')
    if (!form.ormawa_assign) return toast.error('Role/Jabatan wajib dipilih')

    setSubmitting(true)
    try {
      const res = await fetchWithAuth(API_ADMINS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          program_studi_id: Number(form.program_studi_id),
          ormawa_assign: form.ormawa_assign,
        }),
      })
      if (res.status === 'success') {
        toast.success('Akun Prodi Admin berhasil dibuat')
        setIsCreateOpen(false)
        setForm(emptyForm)
        fetchAll()
      } else {
        toast.error(res.message || 'Gagal membuat akun')
      }
    } catch (err) {
      toast.error(err?.message || 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!selected) return
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      return toast.error('Format email tidak valid (harus mengandung @ dan domain)')
    }

    setSubmitting(true)
    try {
      const body = {
        email: form.email,
        program_studi_id: Number(form.program_studi_id),
        ormawa_assign: form.ormawa_assign,
      }
      if (form.password) body.password = form.password

      const res = await fetchWithAuth(`${API_ADMINS}/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.status === 'success') {
        toast.success('Akun berhasil diperbarui')
        setIsEditOpen(false)
        setForm(emptyForm)
        setSelected(null)
        fetchAll()
      } else {
        toast.error(res.message || 'Gagal memperbarui akun')
      }
    } catch (err) {
      toast.error(err?.message || 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!selected) return
    setSubmitting(true)
    try {
      const res = await fetchWithAuth(`${API_ADMINS}/${selected.id}`, { method: 'DELETE' })
      if (res.status === 'success') {
        toast.success('Akun berhasil dihapus')
        setIsDelOpen(false)
        setSelected(null)
        fetchAll()
      } else {
        toast.error(res.message || 'Gagal menghapus akun')
      }
    } catch (err) {
      toast.error(err?.message || 'Terjadi kesalahan')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (user) => {
    setSelected(user)
    setForm({
      email: user.email || '',
      password: '',
      program_studi_id: user.program_studi_id ? String(user.program_studi_id) : '',
      ormawa_assign: user.ormawa_assign || '',
    })
    setIsEditOpen(true)
  }

  const openDelete = (user) => {
    setSelected(user)
    setIsDelOpen(true)
  }

  // ── table columns ──
  const columns = [
    {
      key: 'email',
      label: 'Identitas Akun',
      className: 'min-w-[260px]',
      render: (v, row) => (
        <div className="flex items-center gap-3 py-1.5">
          <div className="w-10 h-10 rounded-xl bg-[var(--theme-primary-light)] flex items-center justify-center shadow-sm">
            <span className="material-symbols-outlined text-[var(--theme-primary)]" style={{ fontSize: 20 }}>person</span>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-[var(--theme-text)] text-[14px] leading-tight">{v}</span>
            <span className="text-[12px] font-medium text-[var(--theme-text-muted)] tracking-tight mt-0.5">Prodi Admin</span>
          </div>
        </div>
      ),
    },
    {
      key: 'prodi_nama',
      label: 'Program Studi',
      className: 'w-[200px]',
      render: (v) => (
        <span className="font-bold text-[var(--theme-text)] text-[13px] capitalize">{v ? v.toLowerCase() : '—'}</span>
      ),
    },
    {
      key: 'ormawa_assign',
      label: 'Role / Jabatan',
      className: 'w-[160px]',
      render: (v) => (
        <span className="bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
          {v || '—'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Dibuat',
      className: 'w-[140px]',
      render: (v) => {
        if (!v) return '—'
        const d = new Date(v)
        return (
          <span className="text-[12px] font-medium text-[var(--theme-text-muted)] tracking-tight">
            {d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
        )
      },
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'w-[100px] text-right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
            title="Edit"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>edit</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); openDelete(row); }}
            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
            title="Hapus"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
          </button>
        </div>
      ),
    },
  ]

  // ── render ──
  return (
    <PageContent>
      <Toaster position="top-right" />
        <DashboardHero
          title="Kelola Akun Prodi"
          subtitle="Buat, ubah, dan kelola akun administrator program studi di bawah fakultas Anda."
          icon="manage_accounts"
          badges={[
            { label: 'Administrasi Sistem', active: false },
            { label: `${users.length} Akun Terdaftar`, active: true }
          ]}
          actions={
            <Button
              onClick={() => { setForm(emptyForm); setIsCreateOpen(true) }}
              className="bg-[var(--theme-primary)] hover:bg-[var(--theme-primary-hover)] text-white shadow-lg shadow-[var(--theme-primary-light)] text-sm px-5 h-10 rounded-xl font-semibold flex items-center gap-2 transition-all hover:scale-[1.02]"
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>person_add</span>
              Tambah Akun
            </Button>
          }
        />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-6 mt-6">
        <PrimaryStatsCard
          title="Total Akun Prodi"
          value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : users.length}
          icon={Users}
          colorTheme="primary"
          badgeText="Akun Terdaftar"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">manage_accounts</span>}
        />
        <PrimaryStatsCard
          title="Program Studi"
          value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : prodis.length}
          icon={School}
          colorTheme="success"
          badgeText="Total Prodi"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">account_balance</span>}
        />
        <PrimaryStatsCard
          title="Role Tersedia"
          value={loading ? <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>sync</span> : roles.length}
          icon={ShieldCheck}
          colorTheme="info"
          badgeText="Hak Akses"
          badgeIcon={<span className="material-symbols-outlined text-[12px]">admin_panel_settings</span>}
        />
      </div>

      {/* Data Table */}
      <div className="mt-6 mb-6">
        <DataTable 
          title="Daftar Akun Prodi Admin"
          subtitle="Data administrator yang terdaftar"
          columns={columns} 
          data={users} 
          loading={loading}
          searchPlaceholder="Cari email atau prodi..." 
        />
      </div>

      {/* ═══ CREATE MODAL ═══ */}
      <DialogModal
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        icon="person_add"
        title="Tambah Akun Prodi Admin"
        description="Buat akun baru untuk administrator program studi."
        subtitle="Tambah Akun"
        maxWidth="max-w-lg"
        bodyClassName="!overflow-visible p-6 pt-2"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCreateOpen(false)} />
            <ModalSaveButton 
              form="create-prodi-user" 
              loading={submitting} 
              text="Simpan Akun" 
            />
          </>
        }
      >
          <form id="create-prodi-user" noValidate onSubmit={handleCreate} className="space-y-5 text-[var(--theme-text)]">
            
            <div className="bg-[var(--theme-primary-light)]/30 border border-[var(--theme-primary)]/20 p-4 rounded-2xl flex gap-3 mb-2">
              <span className="material-symbols-outlined text-[var(--theme-primary)] mt-0.5" style={{ fontSize: 20 }}>info</span>
              <div>
                <p className="text-xs font-bold text-[var(--theme-primary)] uppercase tracking-wider mb-0.5">Informasi Kredensial</p>
                <p className="text-xs text-[var(--theme-text-muted)] font-medium leading-relaxed">
                  Email dan password ini akan digunakan oleh pengurus program studi untuk masuk ke portal admin.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Alamat Email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 18 }}>mail</span>
                  <input
                    type="email"
                    placeholder="admin.prodi@bku.ac.id"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                    className="w-full h-11 pl-10 pr-3 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-colors font-semibold shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Kata Sandi Akses</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 18 }}>lock</span>
                  <input
                    type={showCreatePassword ? "text" : "password"}
                    placeholder="Minimal 6 karakter"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    required
                    className="w-full h-11 pl-10 pr-10 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-colors font-semibold shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showCreatePassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Program Studi</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] z-10 pointer-events-none" style={{ fontSize: 18 }}>school</span>
                  <div className="[&_input]:pl-10 [&_input]:h-11 [&_input]:font-semibold [&_input]:shadow-sm">
                    <SearchableSelect
                      value={form.program_studi_id}
                      onChange={val => setForm(f => ({ ...f, program_studi_id: val }))}
                      options={prodis.map(p => {
                        const jenjang = p.jenjang || '';
                        const nama = p.nama || p.Nama || p.name || '';
                        const fakultas = p.Fakultas?.nama || p.Fakultas?.Nama || 'Tanpa Fakultas';
                        return { 
                          value: String(p.id || p.ID), 
                          label: `${jenjang} ${nama} - ${fakultas}` 
                        };
                      })}
                      placeholder="Pilih Program Studi"
                      searchPlaceholder="Cari program studi..."
                      required
                      direction="up"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Role / Jabatan</label>
                  <span className="text-[9px] font-bold text-[var(--theme-primary)] uppercase tracking-wider bg-[var(--theme-primary-light)] px-1.5 py-0.5 rounded">Wajib</span>
                </div>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] z-10 pointer-events-none" style={{ fontSize: 18 }}>admin_panel_settings</span>
                  <div className="[&_input]:pl-10 [&_input]:h-11 [&_input]:font-semibold [&_input]:shadow-sm">
                    <SearchableSelect
                      value={form.ormawa_assign}
                      onChange={val => setForm(f => ({ ...f, ormawa_assign: val }))}
                      options={Array.from(new Set(roles.map(r => r.nama || r.Nama))).map(nama => ({ value: nama, label: nama }))}
                      placeholder="Pilih Role (RBAC)"
                      searchPlaceholder="Cari role..."
                      required
                      direction="up"
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
      </DialogModal>

      {/* ═══ EDIT MODAL ═══ */}
      <DialogModal
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        icon="edit"
        title="Edit Akun Prodi Admin"
        description={`Perbarui informasi akun ${selected?.email}`}
        subtitle="Edit Akun"
        maxWidth="max-w-lg"
        bodyClassName="!overflow-visible p-6 pt-2"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsEditOpen(false)} />
            <ModalSaveButton 
              form="edit-prodi-user" 
              loading={submitting} 
              text="Perbarui Akun" 
            />
          </>
        }
      >
          <form id="edit-prodi-user" noValidate onSubmit={handleEdit} className="space-y-5 text-[var(--theme-text)]">
            
            <div className="bg-[var(--theme-warning-light)]/30 border border-[var(--theme-warning)]/20 p-4 rounded-2xl flex gap-3 mb-2">
              <span className="material-symbols-outlined text-[var(--theme-warning)] mt-0.5" style={{ fontSize: 20 }}>edit_note</span>
              <div>
                <p className="text-xs font-bold text-[var(--theme-warning)] uppercase tracking-wider mb-0.5">Edit Kredensial</p>
                <p className="text-xs text-[var(--theme-text-muted)] font-medium leading-relaxed">
                  Kosongkan kata sandi akses jika Anda tidak ingin mereset password akun ini.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Alamat Email</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 18 }}>mail</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                    className="w-full h-11 pl-10 pr-3 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-colors font-semibold shadow-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Password Baru (Opsional)</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)]" style={{ fontSize: 18 }}>lock_reset</span>
                  <input
                    type={showEditPassword ? "text" : "password"}
                    placeholder="Kosongkan untuk tetap sama"
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full h-11 pl-10 pr-10 border border-[var(--theme-border)] rounded-xl text-sm focus:border-[var(--theme-primary)] focus:ring-2 focus:ring-[var(--theme-primary-light)] outline-none bg-[var(--theme-surface)] text-[var(--theme-text)] transition-colors font-semibold shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] hover:text-[var(--theme-text)] transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {showEditPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Program Studi</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] z-10 pointer-events-none" style={{ fontSize: 18 }}>school</span>
                  <div className="[&_input]:pl-10 [&_input]:h-11 [&_input]:font-semibold [&_input]:shadow-sm">
                    <SearchableSelect
                      value={form.program_studi_id}
                      onChange={val => setForm(f => ({ ...f, program_studi_id: val }))}
                      options={prodis.map(p => {
                        const jenjang = p.jenjang || '';
                        const nama = p.nama || p.Nama || p.name || '';
                        const fakultas = p.Fakultas?.nama || p.Fakultas?.Nama || 'Tanpa Fakultas';
                        return { 
                          value: String(p.id || p.ID), 
                          label: `${jenjang} ${nama} - ${fakultas}` 
                        };
                      })}
                      placeholder="Pilih Program Studi"
                      searchPlaceholder="Cari program studi..."
                      required
                      direction="up"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">Role / Jabatan</label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-subtle)] z-10 pointer-events-none" style={{ fontSize: 18 }}>admin_panel_settings</span>
                  <div className="[&_input]:pl-10 [&_input]:h-11 [&_input]:font-semibold [&_input]:shadow-sm">
                    <SearchableSelect
                      value={form.ormawa_assign}
                      onChange={val => setForm(f => ({ ...f, ormawa_assign: val }))}
                      options={Array.from(new Set(roles.map(r => r.nama || r.Nama))).map(nama => ({ value: nama, label: nama }))}
                      placeholder="Pilih Role (RBAC)"
                      searchPlaceholder="Cari role..."
                      required
                      direction="up"
                    />
                  </div>
                </div>
              </div>
            </div>

          </form>
      </DialogModal>

      {/* ═══ DELETE MODAL ═══ */}
      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Hapus Akun Prodi Admin"
        description={`Apakah Anda yakin ingin menghapus akun "${selected?.email}"? Akun yang dihapus tidak dapat dikembalikan.`}
        loading={submitting}
      />
    </PageContent>
  )
}
