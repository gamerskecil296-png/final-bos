"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { toast, Toaster } from 'react-hot-toast'
import { adminService } from '@/services/api'
import { PageContent, PageCard, PageCardHeader } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { usePermission } from '@/hooks/usePermission'
import { migratePermission } from '@/config/permissions'


const getActionLabel = (suffix) => {
  const actionLabels = {
    "view": "Lihat", "create": "Tambah", "update": "Ubah", "delete": "Hapus",
    "manage": "Kelola", "verify": "Verifikasi", "assign": "Tugaskan",
    "generate": "Generate", "export": "Ekspor",
    "sync_sevima": "Sync SEVIMA",
    "sync_ipk": "Sync IPK",
    "sync_simkatmawa": "Sync Simkatmawa",
    "reset": "Reset Data",
    "reset_password": "Reset Password",
    "generate_account": "Generate Akun",
    "dashboard": "Dashboard", "settings": "Pengaturan",
    "full_access": "Akses Penuh",
  };
  if (actionLabels[suffix]) return actionLabels[suffix];
  let s = suffix.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const getFeatureLabel = (prefix) => {
  const featureLabels = {
    // ═══════════════════════════════════════════════════════
    // MODULE: Sistem & Konfigurasi
    // ═══════════════════════════════════════════════════════
    "admin":              "Akses Penuh (Super Admin)",
    "admin.dashboard":    "Dashboard Admin",
    "admin.profile":      "Profil Admin",
    "admin.audit":        "Log & Audit Trail",
    "rbac.roles":         "Manajemen Role & Hak Akses",
    "rbac.users":         "Manajemen Pengguna (RBAC)",
    "system.pmb":         "PMB (Penerimaan Mahasiswa Baru)",
    "system.database":    "⛔ Database Sistem (Danger Zone)",
    "system.docs":        "Dokumentasi Sistem",
    "system.news":        "Berita & Pengumuman Sistem",
    "system.landing":     "Pengaturan Landing Page",
    "system.theme":       "Pengaturan Tampilan & Tema",
    "system_settings":    "Konfigurasi Umum Sistem",
    "system.document":    "Format & Template Surat",
    "system.finance":     "Pagu & Keuangan Sistem",
    "system.insurance":   "Pengaturan Asuransi",
    "system.category":    "Kategori Organisasi",

    // ═══════════════════════════════════════════════════════
    // MODULE: Akademik & Fakultas
    // ═══════════════════════════════════════════════════════
    "faculty.dashboard":  "Dashboard Fakultas",
    "students":           "Data Mahasiswa (Master)",
    "faculty":            "Data Fakultas (Master)",
    "program_studi":      "Data Program Studi (Master)",
    "dosen":              "Data Dosen (Master)",
    "akademik":           "Periode Akademik",
    "faculty_report":     "Laporan Fakultas",
    "faculty_profile":    "Profil Fakultas",
    "prodi_users":        "Akun Pengguna Prodi",
    "faculty_settings":   "Pengaturan Fakultas",
    "faculty_rbac":       "Role & Akses Fakultas (RBAC)",

    // ═══════════════════════════════════════════════════════
    // MODULE: Kemahasiswaan
    // ═══════════════════════════════════════════════════════
    "scholarship":            "Beasiswa (Kelola Admin)",
    "achievement":            "Prestasi (Kelola Admin)",
    "aspiration":             "Aspirasi (Kelola Admin)",
    "faculty.scholarship":    "Beasiswa (Monitor Fakultas)",
    "faculty.achievement":    "Prestasi (Monitor Fakultas)",
    "faculty.aspiration":     "Aspirasi (Monitor Fakultas)",

    // ═══════════════════════════════════════════════════════
    // MODULE: Ormawa
    // ═══════════════════════════════════════════════════════
    "ormawa.core":            "Dashboard Ormawa",
    "ormawa.structure":       "Struktur Organisasi Ormawa",
    "ormawa.members":         "Anggota & Pengurus Ormawa",
    "ormawa.events":          "Kegiatan & Kalender Ormawa",
    "ormawa.attendance":      "Absensi Kegiatan Ormawa",
    "ormawa.finance":         "Keuangan Kas Ormawa",
    "ormawa.proposals":       "Proposal Kegiatan Ormawa",
    "ormawa.lpj":             "Laporan LPJ Ormawa",
    "ormawa.announcements":   "Pengumuman Ormawa",
    "ormawa.aspirations":     "Aspirasi & Pengaduan Ormawa",
    "ormawa.recruitment":     "Open Recruitment Ormawa",
    "ormawa.notifications":   "Notifikasi Ormawa",
    "ormawa.kencana":         "PKKMB / Kencana Ormawa",
    "ormawa.rbac":            "Role & Akses Ormawa (RBAC)",
    "ormawa.settings":        "Pengaturan Ormawa",
    "ormawa.gamifikasi":      "Gamifikasi & Poin Ormawa",
    "ormawa.pagu":            "Pagu Keuangan Ormawa",
    "faculty_ormawa":         "Ormawa (Monitor Fakultas)",
    "faculty_proposal":       "Proposal Ormawa (Monitor Fakultas)",

    // ═══════════════════════════════════════════════════════
    // MODULE: Klinik & Psikologi
    // ═══════════════════════════════════════════════════════
    "psychologist.dashboard":       "Dashboard Psikolog",
    "psychologist.patients":        "Data Pasien (Psikolog)",
    "psychologist.bookings":        "Jadwal Konseling (Psikolog)",
    "psychologist.medical_records": "Rekam Medis (Psikolog)",
    "psychologist.referrals":       "Rujukan (Psikolog)",
    "psychologist.schedules":       "Jadwal Praktik (Psikolog)",
    "psychologist.reports":         "Laporan (Psikolog)",
    "psychologist.notifications":   "Notifikasi (Psikolog)",
    "psychologist.settings":        "Pengaturan (Psikolog)",
    "health.dashboard":             "Dashboard Klinik Kesehatan",
    "health.bookings":              "Jadwal Kunjungan (Klinik)",
    "health.schedules":             "Jadwal Praktik (Klinik)",
    "health.patients":              "Data Pasien (Klinik)",
    "health.medical_records":       "Rekam Medis (Klinik)",
    "health.bap":                   "Berita Acara Pemeriksaan (Klinik)",
    "health.reports":               "Laporan (Klinik)",
    "health_claims":                "Klaim Asuransi Kesehatan",
    "faculty_health":               "Kesehatan (Monitor Fakultas)",
    "faculty.counseling":           "Data Konseling (Monitor Fakultas)",

    // ═══════════════════════════════════════════════════════
    // MODULE: Kencana (PKKMB)
    // ═══════════════════════════════════════════════════════
    "kencana.dashboard":        "Dashboard Kencana",
    "kencana.announcement":     "Pengumuman Kencana",
    "kencana.timeline":         "Timeline Kegiatan Kencana",
    "kencana.pre_kencana":      "Pra-Kencana (Persiapan)",
    "kencana.university":       "Kencana Tingkat Universitas",
    "kencana.faculty_stages":   "Kencana Tingkat Fakultas",
    "kencana.score_summary":    "Rekap Nilai Kencana",
    "kencana.scores":           "Penilaian Kencana",
    "kencana.banding":          "Banding Nilai Kencana",
    "kencana.remedials":        "Remedial Kencana",
    "kencana.certificates":     "Sertifikat Kencana",
    "kencana.participants":     "Data Peserta Kencana",
    "kencana.groups":           "Kelompok Kencana",
    "kencana.mentors":          "Data Mentor Kencana",
    "kencana.mentor":           "Portal Mentor Kencana",
    "kencana.attendance":       "Kehadiran Kencana",
    "kencana.handbook":         "Buku Panduan Kencana",
    "kencana.notifications":    "Notifikasi Kencana",
    "kencana.settings":         "Pengaturan Kencana",
    "kencana.faculty":          "Monitor Kencana (Fakultas)",

    // ═══════════════════════════════════════════════════════
    // MODULE: Portal Mahasiswa
    // ═══════════════════════════════════════════════════════
    "student.dashboard":        "Dashboard Mahasiswa",
    "student.profile":          "Profil Mahasiswa",
    "student.kencana":          "Kencana PKKMB (Mahasiswa)",
    "student_kencana":          "Kencana PKKMB (Mahasiswa)",
    "student.achievement":      "Prestasi (Akses Mahasiswa)",
    "student.organisasi":       "Organisasi (Akses Mahasiswa)",
    "student.organizations":    "Organisasi (Akses Mahasiswa)",
    "student.health":           "Kesehatan (Akses Mahasiswa)",
    "student.health.records":   "Rekam Medis (Akses Mahasiswa)",
    "student.health.bookings":  "Jadwal Kunjungan (Akses Mahasiswa)",
    "student.counseling":       "Konseling (Akses Mahasiswa)",
    "student.scholarship":      "Beasiswa (Akses Mahasiswa)",
    "student.voice":            "Aspirasi (Akses Mahasiswa)",
    "student.aspirations":      "Aspirasi (Akses Mahasiswa)",
    "student.insurance":        "Asuransi (Akses Mahasiswa)",
    "student.presensi":         "Presensi Kegiatan (Akses Mahasiswa)",

    // ═══════════════════════════════════════════════════════
    // MODULE: Integrasi & Sinkronisasi
    // ═══════════════════════════════════════════════════════
    // (Reuse existing prefixes — these will be grouped under
    //  the "Integrasi" tab when they appear in that catalog module)
  };
  if (featureLabels[prefix]) return featureLabels[prefix];
  // Fallback: humanize the key
  return prefix.split('.').map(part => {
    let s = part.replace(/_/g, ' ');
    return s.charAt(0).toUpperCase() + s.slice(1);
  }).join(' › ');
};

const groupPermissionsByFeature = (items) => {
  const groups = {};
  items.forEach(permission => {
    let parts = permission.split('.');
    let suffix = parts[parts.length - 1];
    let prefix = parts.slice(0, -1).join('.');
    if (parts.length === 1) {
      prefix = 'other';
      suffix = permission;
    }
    if (!groups[prefix]) {
      groups[prefix] = { prefix: prefix, name: getFeatureLabel(prefix), permissions: [] };
    }
    groups[prefix].permissions.push({
      key: permission,
      suffix: suffix,
      label: getActionLabel(suffix)
    });
  });
  return Object.values(groups);
};

export default function RoleManagement() {
  const { hasPermission } = usePermission();
  const navigate = useNavigate();

  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [loading, setLoading] = useState(true);

  const [viewState, setViewState] = useState('list'); // 'list' or 'form'
  const [editingRole, setEditingRole] = useState(null);

  const [formName, setFormName] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPermissions, setFormPermissions] = useState([]);

  const [activeTab, setActiveTab] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const roleRes = await adminService.getRBACRoles();
      if (roleRes?.status === 'success') {
        const payload = roleRes.data || {};
        setRoles(payload.roles || []);
        
        // MIGRATION: Translate the backend catalog to use the new permission keys
        const rawCatalog = payload.catalog || [];
        const migratedCatalog = rawCatalog.map(module => ({
          ...module,
          items: [...new Set(module.items.map(p => migratePermission(p)))]
        }));
        
        setPermissionCatalog(migratedCatalog);
        if (migratedCatalog.length > 0 && !activeTab) {
          setActiveTab(migratedCatalog[0].module);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Gagal sinkronisasi data role');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreateNew = () => {
    setEditingRole(null);
    setFormName('');
    setFormLabel('');
    setFormDesc('');
    setFormPermissions([]);
    if (permissionCatalog.length > 0) setActiveTab(permissionCatalog[0].module);
    setViewState('form');
  };

  const handleEdit = (role) => {
    if (role.key === 'super_admin') {
      toast.info('Role Super Admin memiliki akses penuh secara default dan tidak dapat dimodifikasi secara manual.', { duration: 5000 });
      return;
    }
    setEditingRole(role);
    setFormName(role.key || '');
    setFormLabel(role.label || '');
    setFormDesc(role.description || '');
    
    // MIGRATION: Translate legacy permissions from DB so checkboxes appear checked
    const rawPerms = Array.isArray(role.permissions) ? role.permissions : [];
    const migratedPerms = rawPerms.map(p => migratePermission(p));
    setFormPermissions([...new Set(migratedPerms)]);

    if (permissionCatalog.length > 0) setActiveTab(permissionCatalog[0].module);
    setViewState('form');
  };

  const handleSave = async () => {
    if (!formName.trim() || !formLabel.trim()) {
      toast.error('Nama dan Label harus diisi');
      return;
    }
    setIsSubmitting(true);
    try {
      if (editingRole) {
        await adminService.updateRBACRole(editingRole.id || editingRole.ID, {
          label: formLabel,
          description: formDesc,
          permissions: formPermissions,
          status: 'active'
        });
        toast.success(`Role ${formLabel} berhasil diperbarui`);
      } else {
        await adminService.createRBACRole({
          key: formName,
          label: formLabel,
          description: formDesc,
          permissions: formPermissions,
          status: 'active'
        });
        toast.success(`Role ${formLabel} berhasil dibuat`);
      }
      fetchData();
      setViewState('list');
    } catch (err) {
      toast.error(err?.message || 'Gagal menyimpan role');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (role) => {
    setRoleToDelete(role);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!roleToDelete) return;
    setIsSubmitting(true);
    try {
      await adminService.deleteRBACRole(roleToDelete.id || roleToDelete.ID);
      toast.success(`Role ${roleToDelete.label} berhasil dihapus`);
      fetchData();
    } catch (err) {
      toast.error(err?.message || 'Gagal menghapus role');
    } finally {
      setIsSubmitting(false);
      setIsDeleteOpen(false);
      setRoleToDelete(null);
    }
  };

  const togglePermission = (perm) => {
    setFormPermissions(prev =>
      prev.includes(perm) ? prev.filter(p => p !== perm) : [...prev, perm]
    );
  };

  const filteredCatalog = useMemo(() => {
    if (!searchQuery.trim()) return permissionCatalog;
    const q = searchQuery.toLowerCase();
    return permissionCatalog.map(group => {
      const items = (group.items || []).filter(p => p.toLowerCase().includes(q));
      return { ...group, items };
    }).filter(g => g.items.length > 0);
  }, [permissionCatalog, searchQuery]);

  const activeGroup = useMemo(() => {
    return filteredCatalog.find(g => g.module === activeTab) || filteredCatalog[0];
  }, [filteredCatalog, activeTab]);

  if (viewState === 'form') {
    return (
      <PageContent>
        <Toaster position="top-center" />
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-slate-800">
            {editingRole ? `Edit Role: ${formLabel || formName}` : 'Create New Role'}
          </h1>
          <Button variant="outline" onClick={() => setViewState('list')} className="h-9 px-4 border-slate-200 text-sm font-medium">
            <span className="material-symbols-outlined mr-2" style={{ fontSize: '16px' }}>arrow_back</span>
            Kembali
          </Button>
        </div>

        <div className="pb-10">
          <Card className="shadow-sm border-slate-200 mb-6">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <Label className="text-slate-600 mb-2 block">Nama <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="Enter role name (e.g. admin_prodi)"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    disabled={!!editingRole}
                    className="h-11"
                  />
                  <p className="text-xs text-slate-400 mt-1">Identifier unik (tanpa spasi)</p>
                </div>
                <div>
                  <Label className="text-slate-600 mb-2 block">Label <span className="text-rose-500">*</span></Label>
                  <Input
                    placeholder="Enter role label (e.g. Admin Program Studi)"
                    value={formLabel}
                    onChange={e => setFormLabel(e.target.value)}
                    className="h-11"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-slate-600 mb-2 block">Deskripsi</Label>
                  <Input
                    placeholder="Penjelasan singkat tugas role ini..."
                    value={formDesc}
                    onChange={e => setFormDesc(e.target.value)}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="mb-6">
                <div className="relative max-w-md">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" style={{ fontSize: '18px' }}>search</span>
                  <Input
                    placeholder="Search features..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="h-10 pl-10"
                  />
                </div>
              </div>

              {/* Horizontal Tabs */}
              <div className="flex overflow-x-auto bg-slate-100 p-1.5 rounded-lg mb-6 gap-1 border border-slate-200 shadow-inner" style={{ scrollbarWidth: 'thin' }}>
                {filteredCatalog.map(group => (
                  <button
                    key={group.module}
                    onClick={() => setActiveTab(group.module)}
                    className={`whitespace-nowrap px-4 py-2 font-medium text-sm transition-all rounded-md ${activeTab === group.module
                      ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/60'
                      }`}
                  >
                    {group.module}
                  </button>
                ))}
              </div>

              {/* Checkboxes Grid Grouped by Feature */}
              <div className="min-h-[300px]">
                {activeGroup && (
                  <div className="space-y-6">
                    <h3 className="font-bold text-slate-800 text-lg border-b border-slate-100 pb-2">Permissions</h3>

                    <div className="space-y-4">
                      {groupPermissionsByFeature(activeGroup.items || []).map(group => (
                        <div key={group.prefix} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h4 className="font-bold text-sm text-slate-800">{group.name}</h4>
                            <button
                              type="button"
                              disabled={formPermissions.includes('*')}
                              onClick={() => {
                                const keys = group.permissions.map(p => p.key);
                                const allSelected = keys.every(key => formPermissions.includes(key) || formPermissions.includes('*'));
                                if (allSelected) {
                                  setFormPermissions(prev => prev.filter(k => !keys.includes(k)));
                                } else {
                                  setFormPermissions(prev => Array.from(new Set([...prev, ...keys])));
                                }
                              }}
                              className="text-[10px] font-black uppercase tracking-widest text-bku-primary hover:text-bku-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1"
                            >
                              {group.permissions.every(p => formPermissions.includes(p.key) || formPermissions.includes('*')) ? (
                                <><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>deselect</span> Hapus Semua</>
                              ) : (
                                <><span className="material-symbols-outlined" style={{ fontSize: '14px' }}>checklist</span> Pilih Semua</>
                              )}
                            </button>
                          </div>
                          <div className="p-5">
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-4 gap-x-4">
                              {group.permissions.map(permItem => {
                                const { key: perm, label } = permItem;
                                const isChecked = formPermissions.includes(perm) || formPermissions.includes('*');
                                return (
                                  <label key={perm} className="flex items-center gap-3 cursor-pointer group">
                                    <div className="relative flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePermission(perm)}
                                        disabled={formPermissions.includes('*') && perm !== '*'}
                                        className="peer sr-only"
                                      />
                                      <div className="w-5 h-5 border-2 border-slate-300 rounded peer-checked:bg-bku-primary peer-checked:border-bku-primary transition-colors flex items-center justify-center">
                                        {isChecked && <span className="material-symbols-outlined text-white" style={{ fontSize: '14px' }}>check</span>}
                                      </div>
                                    </div>
                                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900">{label}</span>
                                  </label>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {filteredCatalog.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    Tidak ada fitur yang cocok dengan pencarian.
                  </div>
                )}
              </div>

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-3 mt-10 pt-6 border-t border-slate-100">
                <Button variant="outline" onClick={() => setViewState('list')} className="h-10 px-6 border-slate-200">
                  Batal
                </Button>
                <Button onClick={handleSave} disabled={isSubmitting} className="h-10 px-8 bg-bku-primary hover:bg-bku-primary/90 text-white font-bold tracking-wide">
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Role'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    );
  }

  const columns = [
    {
      key: 'role',
      label: 'Role / Jabatan',
      render: (_, r) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>badge</span>
          </div>
          <div>
            <div className="font-bold text-slate-800">{r.label || r.key}</div>
            <div className="text-xs text-slate-500 mt-0.5 max-w-sm truncate" title={r.description}>{r.description || 'Tidak ada deskripsi'}</div>
          </div>
        </div>
      )
    },
    {
      key: 'key',
      label: 'Key',
      render: (_, r) => <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded border border-slate-200">{r.key}</span>
    },
    {
      key: 'permissions',
      label: 'Akses Dimiliki',
      render: (_, r) => {
        if (!Array.isArray(r.permissions) || r.permissions.length === 0) {
          return <span className="text-xs font-semibold text-slate-400">Tidak ada akses</span>;
        }
        if (r.permissions.includes('*')) {
          return <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200">Akses Penuh (Full Access)</span>;
        }

        const grouped = groupPermissionsByFeature(r.permissions);
        const displayLimit = 2;
        const toShow = grouped.slice(0, displayLimit);
        const remaining = grouped.length - displayLimit;

        return (
          <div className="flex flex-wrap gap-1.5 max-w-[220px]">
            {toShow.map(g => (
              <Badge key={g.prefix} className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-600 border-slate-200 font-bold shadow-none truncate max-w-[100px]">
                {g.name}
              </Badge>
            ))}
            {remaining > 0 && (
              <Badge className="text-[9px] px-1.5 py-0.5 bg-slate-50 text-slate-400 border-slate-200 font-bold shadow-none">
                +{remaining} lainnya
              </Badge>
            )}
          </div>
        );
      }
    },
    {
      key: 'actions',
      label: 'Aksi',
      className: 'text-right',
      cellClassName: 'text-right',
      render: (_, r) => (
        <div className="flex items-center justify-end gap-2">
          {hasPermission('rbac.roles.update') && (
            <Button
              onClick={(e) => { e.stopPropagation(); handleEdit(r); }}
              variant="ghost"
              disabled={r.key === 'super_admin'}
              title={r.key === 'super_admin' ? "Role sistem tidak dapat dimodifikasi" : "Edit role"}
              className={`h-8 px-3 font-semibold text-xs ${r.key === 'super_admin' ? 'text-slate-300' : 'text-bku-primary hover:bg-bku-primary/10'}`}
            >
              Edit
            </Button>
          )}
          {hasPermission('rbac.roles.delete') && (
            <Button
              onClick={(e) => { e.stopPropagation(); handleDelete(r); }}
              variant="ghost"
              disabled={r.key === 'super_admin' || r.key === 'student' || r.key === 'mahasiswa'}
              title={r.key === 'super_admin' || r.key === 'student' || r.key === 'mahasiswa' ? "Role inti sistem tidak dapat dihapus" : "Hapus role"}
              className={`h-8 px-3 font-semibold text-xs ${r.key === 'super_admin' || r.key === 'student' || r.key === 'mahasiswa' ? 'text-slate-300' : 'text-rose-500 hover:bg-rose-50 hover:text-rose-600'}`}
            >
              Hapus
            </Button>
          )}
        </div>
      )
    }
  ];

  return (
    <PageContent>
      <Toaster position="top-center" />
      <DashboardHero
        icon="vpn_key"
        title="Role"
        highlightedTitle="Management"
        subtitle="Kelola role dan konfigurasi hak akses spesifik per modul. Batasi dan izinkan akses untuk tiap entitas level."
        badges={[
          { label: 'RBAC Configuration', active: true }
        ]}
      />
      <DataTable
        title="Daftar Role Sistem"
        subtitle="Role digunakan untuk membatasi hak akses pengguna ke fitur tertentu."
        onAdd={handleCreateNew}
        addLabel="Create New Role"
        columns={columns}
        data={roles}
        loading={loading}
        emptyMessage="Belum ada role terdaftar."
        hoverable
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Hapus Role?"
        description={`Apakah Anda yakin ingin menghapus role "${roleToDelete?.label}"? Pengguna yang memiliki role ini mungkin akan kehilangan hak aksesnya. Tindakan ini tidak dapat dibatalkan.`}
        loading={isSubmitting}
      />
    </PageContent>
  )
}
