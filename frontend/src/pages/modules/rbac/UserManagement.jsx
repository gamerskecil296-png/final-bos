"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { DialogModal, ModalCancelButton, ModalSaveButton } from '@/components/ui/DialogModal'
import { DeleteConfirmModal } from '@/components/ui/DeleteConfirmModal'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

import { toast, Toaster } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { adminService, API_BASE_URL } from '@/services/api'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select'
import { PageContent } from '@/components/ui/page'
import { DashboardHero } from '@/components/ui/dashboard'
import { usePermission } from '@/hooks/usePermission'

// Auto-injected Material Symbol fallbacks for removed Lucide icons
const KeyRound = ({ size, className, ...props }) => <span className={`material-symbols-outlined ${className || ''} ${props.animate ? 'animate-spin' : ''}`} style={{ fontSize: size || 24, ...props.style }} {...props}>vpn_key</span>;

const ROLE_DETAILS_DEFAULT = {
  super_admin: {
    label: 'Super Admin',
    cls: 'bg-rose-50/70 text-rose-600 border border-rose-200/60 shadow-none font-bold',
  },
  SUPER_ADMIN: { label: 'Super Admin', cls: 'bg-rose-50/70 text-rose-600 border border-rose-200/60 shadow-none font-bold' },
  faculty_admin: {
    label: 'Admin Fakultas',
    cls: 'bg-indigo-50/70 text-indigo-600 border border-indigo-200/60 shadow-none font-bold',
  },
  prodi_admin: {
    label: 'Admin Program Studi',
    cls: 'bg-violet-50/70 text-violet-600 border border-violet-200/60 shadow-none font-bold',
  },
  ormawa_admin: {
    label: 'Admin Ormawa',
    cls: 'bg-bku-primary/10 text-bku-primary border border-bku-primary/20 shadow-none font-bold',
  },
  ormawa: {
    label: 'Pengurus Ormawa',
    cls: 'bg-sky-50/70 text-sky-600 border border-sky-200/60 shadow-none font-bold',
  },
  student: {
    label: 'Mahasiswa',
    cls: 'bg-emerald-50/70 text-emerald-600 border border-emerald-200/60 shadow-none font-bold',
  },
  psikolog: {
    label: 'Psikolog',
    cls: 'bg-teal-50/70 text-teal-600 border border-teal-200/60 shadow-none font-bold',
  },
  psychologist: {
    label: 'Psikolog (English)',
    cls: 'bg-teal-50/70 text-teal-600 border border-teal-200/60 shadow-none font-bold',
  },
  tenaga_kesehatan: {
    label: 'Tenaga Kesehatan',
    cls: 'bg-blue-50/70 text-blue-600 border border-blue-200/60 shadow-none font-bold',
  },
  kencana_admin: {
    label: 'Admin Kencana',
    cls: 'bg-amber-600 text-white shadow-amber-200',
  },
  kencana_fakultas: {
    label: 'Admin Kencana Fakultas',
    cls: 'bg-cyan-700 text-white shadow-cyan-200',
  },
  kencana_mentor: {
    label: 'Dewan Pembimbing',
    cls: 'bg-stone-800 text-white shadow-stone-200',
  }
}

const getCleanImageUrl = (url) => {
  if (!url) return ''
  if (url.startsWith('http')) return url
  const baseUrl = API_BASE_URL.replace('/api', '')
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
}

function StudentAvatar({ src, name, className = "w-9 h-9 rounded-xl" }) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const hasNoImage = !src || src.trim() === "" || src.endsWith("/profiles/") || src.endsWith("/students/") || src.endsWith("localhost:8000") || src.endsWith("localhost:8000/");

  return (
    <div className={cn("relative bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-inner overflow-hidden", className)}>
      {(!loaded || error || hasNoImage) && (
        <span className="material-symbols-outlined text-slate-400/80 block select-none leading-none absolute animate-in fade-in" style={{ fontSize: className.includes('w-28') ? '56px' : className.includes('w-14') ? '28px' : '20px' }}>
          person
        </span>
      )}
      {!hasNoImage && !error && (
        <img
          src={src}
          alt={name}
          className={cn("absolute inset-0 w-full h-full object-cover transition-opacity duration-200", loaded ? "opacity-100" : "opacity-0")}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

// Safely parse permissions: handles both array and JSON-encoded string from GORM datatypes.JSON
const parsePermissions = (raw) => {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

export default function UserManagement() {
  const { hasPermission } = usePermission();
  const navigate = useNavigate();

  const [users, setUsers] = useState([])

  // ── Global Filter dari Topbar (localStorage) ────────────────────────────
  const [activeFacultyId, setActiveFacultyId] = useState(
    localStorage.getItem('superadmin_fakultas_id') || 'all'
  )
  const [activeProdiId, setActiveProdiId] = useState(
    localStorage.getItem('superadmin_prodi_id') || 'all'
  )

  // Sync filter ketika topbar mengubah localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      setActiveFacultyId(localStorage.getItem('superadmin_fakultas_id') || 'all')
      setActiveProdiId(localStorage.getItem('superadmin_prodi_id') || 'all')
    }
    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  const [rbacRoles, setRbacRoles] = useState([])
  const [faculties, setFaculties] = useState([])
  const [allProdi, setAllProdi] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [isCrudOpen, setIsCrudOpen] = useState(false)
  const [isRoleOpen, setIsRoleOpen] = useState(false)
  const [isDelOpen, setIsDelOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [newOrmawaId, setNewOrmawaId] = useState('')
  const [newOrmawaAssign, setNewOrmawaAssign] = useState('')
  const [newFakultasId, setNewFakultasId] = useState('')
  const [newProdiId, setNewProdiId] = useState('')
  const [newRoleScopeType, setNewRoleScopeType] = useState('university')
  const [editNama, setEditNama] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [ormawas, setOrmawas] = useState([])

  const [form, setForm] = useState({
    Email: '',
    Password: '',
    Role: '',
    Nama: '',
    FakultasID: '',
    ProgramStudiID: '',
    OrmawaAssign: '',
    OrmawaID: '',
    RoleScopeType: 'university',
    Phone: ''
  })

  const roleDetails = useMemo(() => {
    const details = { ...ROLE_DETAILS_DEFAULT }
    rbacRoles.forEach(role => {
      if (!details[role.key]) {
        details[role.key] = {
          label: role.label || role.key,
          cls: 'bg-slate-50/70 text-slate-600 border border-slate-200/60 shadow-none font-bold'
        }
      }
    })
    return details
  }, [rbacRoles])

  const ROLE_DETAILS = roleDetails

  const roleOptions = useMemo(() => {
    return rbacRoles.map(role => ({
      value: role.key,
      label: role.label || ROLE_DETAILS[role.key]?.label || role.key,
      description: role.description || ROLE_DETAILS[role.key]?.desc || '',
      permissions: parsePermissions(role.permissions),
      status: role.status || 'active',
      isSystem: Boolean(role.is_system)
    }))
  }, [rbacRoles, ROLE_DETAILS])

  // ── Users yang sudah difilter berdasarkan Fakultas & Prodi terpilih ──────
  const filteredUsers = useMemo(() => {
    if (activeFacultyId === 'all' && activeProdiId === 'all') return users

    const prodiIdsByFakultas = activeFacultyId !== 'all'
      ? new Set(
        allProdi
          .filter(p => String(p.fakultas_id || p.FakultasID) === String(activeFacultyId))
          .map(p => String(p.id || p.ID))
      )
      : null

    const selectedFaculty = activeFacultyId !== 'all'
      ? faculties.find(f => String(f.id || f.ID) === String(activeFacultyId))
      : null
    const selectedFacultyNama = selectedFaculty ? (selectedFaculty.nama || selectedFaculty.Nama || '').toLowerCase() : ''

    const customRoles = rbacRoles.map(r => (r.key || '').toLowerCase())
    const SYSTEM_ROLES = new Set(['super_admin', 'psychologist', 'psikolog', 'tenaga_kesehatan', ...customRoles])

    return users.filter(u => {
      const userRoles = (u.role || u.Role || '').split(',').map(r => {
        const trimmed = r.trim().toLowerCase();
        return trimmed === 'student' ? 'mahasiswa' : trimmed;
      }).filter(Boolean);

      if (activeProdiId !== 'all') {
        const userProdiId = String(u.program_studi_id || u.ProgramStudiID || '')
        if (userProdiId !== String(activeProdiId)) {
          const isSystemRole = userRoles.some(r => SYSTEM_ROLES.has(r))
          if (!isSystemRole) return false
        }
      }

      if (activeFacultyId === 'all') return true

      const directFakId = u.fakultas_id || u.FakultasID
      if (directFakId && String(directFakId) !== '0') {
        return String(directFakId) === String(activeFacultyId)
      }

      const userProdiId = String(u.program_studi_id || u.ProgramStudiID || '')
      if (userProdiId && userProdiId !== '0' && prodiIdsByFakultas) {
        return prodiIdsByFakultas.has(userProdiId)
      }

      const userFakNama = (u.fakultas_nama || '').toLowerCase()
      if (userFakNama) {
        return userFakNama === selectedFacultyNama
      }

      const isSystemRole = userRoles.some(r => SYSTEM_ROLES.has(r))
      if (isSystemRole) return true

      return false
    })
  }, [users, activeFacultyId, activeProdiId, allProdi, faculties, rbacRoles])

  useEffect(() => {
    console.log('[DEBUG] SYSTEM_ROLES:', new Set(['super_admin', 'psychologist', 'psikolog', 'tenaga_kesehatan', ...rbacRoles.map(r => (r.key || '').toLowerCase())]));
    console.log('[DEBUG] filteredUsers length:', filteredUsers.length, 'out of', users.length);
  }, [filteredUsers, rbacRoles]);

  const formRoles = useMemo(() => {
    return form.Role ? form.Role.split(',').map(r => r.trim()).filter(Boolean) : [];
  }, [form.Role]);

  const showRoleScopeSelect = useMemo(() => {
    if (formRoles.includes('super_admin') || formRoles.includes('student')) return false;
    return true;
  }, [formRoles]);

  const isCustomSuperAdmin = useMemo(() => {
    return formRoles.some(r => {
      if (r === 'super_admin' || r === 'superadmin') return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p => p === '*' || p.startsWith('admin.') || p.startsWith('system.') || p.startsWith('rbac.'));
      }
      return false;
    });
  }, [formRoles, rbacRoles]);

  const showFakultasSelect = useMemo(() => {
    if (isCustomSuperAdmin) return false;
    if (showRoleScopeSelect && (form.RoleScopeType === 'faculty' || form.RoleScopeType === 'prodi')) return true;
    return formRoles.some(r => {
      if (['faculty_admin', 'prodi_admin', 'student', 'ormawa_admin', 'ormawa', 'kencana_fakultas'].includes(r)) return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p =>
          p.startsWith('faculty.') || p.startsWith('faculty_') ||
          p.startsWith('program_studi.') || p.startsWith('kencana.faculty') ||
          ['students.view', 'dosen.view', 'achievement.view', 'scholarship.view', 'akademik.view', 'aspiration.view', 'prodi_users.view'].includes(p)
        );
      }
      return false;
    });
  }, [formRoles, form.RoleScopeType, showRoleScopeSelect, rbacRoles]);

  const showProdiSelect = useMemo(() => {
    if (isCustomSuperAdmin) return false;
    if (showRoleScopeSelect && form.RoleScopeType === 'prodi') return true;
    return formRoles.some(r => {
      if (['student', 'ormawa_admin', 'ormawa', 'prodi_admin'].includes(r)) return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p => p.startsWith('program_studi.'));
      }
      return false;
    });
  }, [formRoles, form.RoleScopeType, showRoleScopeSelect, rbacRoles]);

  const showOrmawaSelect = useMemo(() => {
    if (isCustomSuperAdmin) return false;
    return formRoles.some(r => {
      if (['ormawa_admin', 'ormawa'].includes(r)) return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p => p.startsWith('ormawa.'));
      }
      return false;
    });
  }, [formRoles, rbacRoles]);

  const newRoles = useMemo(() => {
    return newRole ? newRole.split(',').map(r => r.trim()).filter(Boolean) : [];
  }, [newRole]);

  const showNewRoleScopeSelect = useMemo(() => {
    if (newRoles.includes('super_admin') || newRoles.includes('student')) return false;
    return true;
  }, [newRoles]);

  const isNewCustomSuperAdmin = useMemo(() => {
    return newRoles.some(r => {
      if (r === 'super_admin' || r === 'superadmin') return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p => p === '*' || p.startsWith('admin.') || p.startsWith('system.') || p.startsWith('rbac.'));
      }
      return false;
    });
  }, [newRoles, rbacRoles]);

  const showNewFakultasSelect = useMemo(() => {
    if (isNewCustomSuperAdmin) return false;
    if (showNewRoleScopeSelect && newRoleScopeType === 'university') return false;
    if (showNewRoleScopeSelect && (newRoleScopeType === 'faculty' || newRoleScopeType === 'prodi')) return true;
    return newRoles.some(r => {
      if (['faculty_admin', 'prodi_admin', 'student', 'ormawa_admin', 'ormawa', 'kencana_fakultas'].includes(r)) return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p =>
          p.startsWith('faculty.') || p.startsWith('faculty_') ||
          p.startsWith('program_studi.') || p.startsWith('kencana.faculty') ||
          ['students.view', 'dosen.view', 'achievement.view', 'scholarship.view', 'akademik.view', 'aspiration.view', 'prodi_users.view'].includes(p)
        );
      }
      return false;
    });
  }, [newRoles, newRoleScopeType, showNewRoleScopeSelect, rbacRoles]);

  const showNewProdiSelect = useMemo(() => {
    if (isNewCustomSuperAdmin) return false;
    if (showNewRoleScopeSelect && newRoleScopeType === 'prodi') return true;
    return newRoles.some(r => {
      if (['student', 'ormawa_admin', 'ormawa', 'prodi_admin'].includes(r)) return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p => p.startsWith('program_studi.'));
      }
      return false;
    });
  }, [newRoles, newRoleScopeType, showNewRoleScopeSelect, rbacRoles]);

  const showNewOrmawaSelect = useMemo(() => {
    if (isNewCustomSuperAdmin) return false;
    return newRoles.some(r => {
      if (['ormawa_admin', 'ormawa'].includes(r)) return true;
      const rbacRole = rbacRoles.find(role => role.key === r);
      if (rbacRole && Array.isArray(rbacRole.permissions)) {
        return rbacRole.permissions.some(p =>
          p === 'ormawa.dashboard.view' ||
          p === 'ormawa.core.view' ||
          p.startsWith('ormawa.manage')
        );
      }
      return false;
    });
  }, [newRoles, rbacRoles]);

  const handleEmailChange = (emailVal) => {
    setForm(prev => {
      let updatedPassword = prev.Password;
      const currentRoles = prev.Role ? prev.Role.split(',').map(r => r.trim()).filter(Boolean) : [];
      if (currentRoles.includes('student') && (!prev.Password || prev.Password.startsWith('pass'))) {
        const parts = emailVal.split('@');
        const nim = parts[0].trim();
        if (nim) {
          updatedPassword = `pass${nim}`;
        }
      }
      return {
        ...prev,
        Email: emailVal,
        Password: updatedPassword
      };
    });
  };

  const isRoleConflicting = (currentRoles, roleToCheck) => {
    if (currentRoles.includes(roleToCheck)) return false;

    const invalidCombinations = [
      ["super_admin", "student"],
      ["super_admin", "dosen"],
      ["super_admin", "psikolog"],
      ["super_admin", "tenaga_kesehatan"],
      ["student", "dosen"],
      ["student", "psikolog"],
      ["student", "tenaga_kesehatan"],
      ["student", "faculty_admin"],
      ["student", "prodi_admin"],
      ["student", "kencana_admin"],
      ["student", "kencana_fakultas"],
      ["dosen", "psikolog"],
      ["dosen", "tenaga_kesehatan"],
      ["faculty_admin", "ormawa_admin"],
      ["faculty_admin", "ormawa"],
      ["ormawa_admin", "prodi_admin"],
    ];

    for (const combo of invalidCombinations) {
      const [roleA, roleB] = combo;
      if (
        (currentRoles.includes(roleA) && roleToCheck === roleB) ||
        (currentRoles.includes(roleB) && roleToCheck === roleA)
      ) {
        return true;
      }
    }
    return false;
  };

  const handleToggleRole = (roleToToggle) => {
    setForm(prev => {
      const currentRoles = prev.Role ? prev.Role.split(',').map(r => r.trim()).filter(Boolean) : [];

      if (!currentRoles.includes(roleToToggle) && isRoleConflicting(currentRoles, roleToToggle)) {
        toast.error('Kombinasi role tidak valid (hirarki dilanggar)');
        return prev;
      }
      let nextRoles;
      if (currentRoles.includes(roleToToggle)) {
        nextRoles = currentRoles.filter(r => r !== roleToToggle);
      } else {
        nextRoles = [...currentRoles, roleToToggle];
      }
      const roleVal = nextRoles.join(',');

      let updatedPassword = prev.Password;
      if (nextRoles.includes('student') && (!prev.Password || prev.Password.startsWith('pass'))) {
        const parts = prev.Email.split('@');
        const nim = parts[0].trim();
        if (nim) {
          updatedPassword = `pass${nim}`;
        }
      }
      return {
        ...prev,
        Role: roleVal,
        Password: updatedPassword
      };
    });
  };

  const handleToggleNewRole = (roleToToggle) => {
    const currentRoles = newRole ? newRole.split(',').map(r => r.trim()).filter(Boolean) : [];

    if (!currentRoles.includes(roleToToggle) && isRoleConflicting(currentRoles, roleToToggle)) {
      toast.error('Kombinasi role tidak valid (hirarki dilanggar)');
      return;
    }

    let nextRoles;
    if (currentRoles.includes(roleToToggle)) {
      nextRoles = currentRoles.filter(r => r !== roleToToggle);
    } else {
      nextRoles = [...currentRoles, roleToToggle];
    }
    setNewRole(nextRoles.join(','));
  };

  const fetchData = async () => {
    setLoading(true)
    try {
      const [userRes, facRes, prodiRes, ormawaRes, roleRes] = await Promise.all([
        adminService.getAllUsers(),
        adminService.getAllFaculties(),
        adminService.getAllProdi(),
        adminService.getAllOrmawa(),
        adminService.getRBACRoles()
      ])

      if (userRes?.status === 'success') setUsers(userRes.data || [])
      if (facRes?.status === 'success') setFaculties(facRes.data || [])
      if (prodiRes?.status === 'success') setAllProdi(prodiRes.data || [])
      if (ormawaRes?.status === 'success') setOrmawas(ormawaRes.data || [])
      if (roleRes?.status === 'success') {
        const rolePayload = roleRes.data || {}
        const roles = rolePayload.roles || []
        setRbacRoles(roles)
      }
    } catch (err) {
      console.error("[UserManagement] Gagal fetchData:", err)
      toast.error('Gagal sinkronisasi data master-node')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!String(form.Role || '').trim()) {
      toast.error('Level otorisasi wajib dipilih setidaknya satu')
      return
    }
    setIsSubmitting(true)
    try {
      const payload = {
        ...form,
        Email: String(form.Email || '').trim(),
        Password: String(form.Password || ''),
        Role: String(form.Role || '').trim(),
        Nama: String(form.Nama || '').trim(),
        FakultasID: Number(form.FakultasID) || 0,
        ProgramStudiID: Number(form.ProgramStudiID) || 0,
        OrmawaAssign: String(form.OrmawaAssign || '').trim(),
        OrmawaID: Number(form.OrmawaID) || 0,
        RoleScopeType: String(form.RoleScopeType || 'university').trim(),
        Phone: String(form.Phone || '').trim(),
      }
      const res = await adminService.createUser(payload)
      if (res.status === 'success') {
        toast.success('Identitas digital berhasil diregistrasi')
        setIsCrudOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal menginisialisasi akun')
      }
    } catch (err) { toast.error(err?.message || 'Kesalahan operasional internal') } finally { setIsSubmitting(false) }
  }

  const handleUpdateRole = async () => {
    if (!newRole) { toast.error('Seleksi level akses diperlukan'); return }
    setIsSubmitting(true)
    try {
      const userId = selected?.id || selected?.ID

      // Jika nama diubah, update nama terlebih dahulu
      const originalNama = selected?.identity_name || selected?.nama_lengkap || ''
      if (editNama.trim() && editNama.trim() !== originalNama.trim()) {
        const namaRes = await adminService.updateUser(userId, { nama_lengkap: editNama.trim() })
        if (namaRes.status !== 'success') {
          toast.error(namaRes.message || 'Gagal memperbarui nama')
          return
        }
      }

      const res = await adminService.updateUserRole({
        userId,
        role: newRole,
        action: 'add',
        ormawaId: Number(newOrmawaId) || 0,
        ormawaAssign: String(newOrmawaAssign || '').trim(),
        fakultasId: Number(newFakultasId) || 0,
        prodiId: Number(newProdiId) || 0,
        roleScopeType: String(newRoleScopeType || 'university').trim()
      })
      if (res.status === 'success') {
        toast.success('Level otorisasi & identitas berhasil diperbarui')
        setIsRoleOpen(false)
        fetchData()
      } else {
        toast.error(res.message || 'Gagal memperbarui otorisasi')
      }
    } catch (err) {
      toast.error(err.message || 'Kegagalan sinkronisasi RBAC')
    } finally { setIsSubmitting(false) }
  }


  const handleDelete = async () => {
    setIsSubmitting(true)
    try {
      const res = await adminService.deleteUser(selected?.id || selected?.ID)
      // Backend mengembalikan JSON error (bukan exception), cek status
      if (res && res.status === 'error') {
        toast.error(res.message || 'Gagal mencabut entitas akun')
        return
      }
      toast.success('Entitas akun berhasil dicabut')
      setIsDelOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err?.message || 'Gagal mencabut entitas akun')
    } finally {
      setIsSubmitting(false)
    }
  }

  const columns = [
    {
      key: 'email', label: 'Identitas Digital', className: 'min-w-[320px]',
      render: (v, row) => {
        const linkedName = row.identity_name || row.nama_lengkap || (row.role === 'super_admin' ? 'System Administrator' : 'Pending Identity')
        return (
          <div className="flex items-center gap-4 py-2 group/avatar">
            <StudentAvatar
              src={getCleanImageUrl(row.foto_url || row.FotoURL || row.Foto || row.Pengguna?.Foto || row.foto || row.pengguna?.foto)}
              name={linkedName}
              className="w-11 h-11 rounded-xl border-2 border-white shadow-md transition-all group-hover/avatar:scale-110"
            />
            <div className="flex flex-col">
              <span className="font-bold text-neutral-900 font-jakarta tracking-tight text-[14px] leading-tight group-hover:text-primary transition-colors">{linkedName}</span>
              <div className="flex items-center gap-1.5 mt-1 text-neutral-400">
                <span className="material-symbols-outlined text-primary/60" style={{ fontSize: '10px' }} >mail</span>
                <span className="text-[10px] font-bold tracking-widest lowercase">{v || row.email || '—'}</span>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      key: 'fakultas_nama', label: 'Cluster Afiliasi', className: 'w-[240px]',
      render: (v, row) => {
        const roleLower = (row.role || row.Role || '').toLowerCase()
        const roles = roleLower.split(',').map(r => r.trim()).filter(Boolean)

        let contexts = []
        let subContexts = []

        if (roles.includes('super_admin')) {
          contexts.push('Universitas (Global)')
        }
        if (roles.includes('faculty_admin')) {
          contexts.push(v || 'Cluster Unassigned')
        }
        if (roles.includes('ormawa_admin')) {
          contexts.push(row.ormawa_assign || row.ormawa_nama || 'Org Unassigned')
          if (v) subContexts.push(`Managed at ${v}`)
        }
        if (roles.includes('mahasiswa')) {
          contexts.push(row.prodi_nama || '-')
          if (v) subContexts.push(v)
        }
        if (roles.includes('psikolog')) {
          contexts.push('Psychological Wing')
          subContexts.push('BKU Clinical Unit')
        }
        if (roles.includes('kencana_admin')) {
          contexts.push('Kencana University')
          subContexts.push('Global LMS Operations')
        }
        if (roles.includes('kencana_fakultas')) {
          contexts.push(v || 'Kencana Fakultas')
          subContexts.push('Scoped faculty operations')
        }
        if (roles.includes('kencana_mentor')) {
          contexts.push(row.kencana_scope_type === 'university' ? 'Mentor Universitas' : (v || 'Mentor Fakultas'))
          subContexts.push(row.kencana_scope_type === 'university' ? 'All faculties' : 'Faculty scoped')
        }

        const uniqueContexts = [...new Set(contexts)]
        const contextText = uniqueContexts.length > 0 ? uniqueContexts.join(', ') : '-'
        const uniqueSubContexts = [...new Set(subContexts)]
        const subContextText = uniqueSubContexts.length > 0 ? uniqueSubContexts.join(' | ') : ''

        return (
          <div className="flex flex-col gap-0.5">
            <span className="text-[12px] font-bold text-neutral-800 font-jakarta leading-tight tracking-tight">{contextText}</span>
            {subContextText && <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest leading-none mt-1">{subContextText}</span>}
          </div>
        )
      }
    },
    {
      key: 'role', label: 'Authorization', className: 'w-[160px]',
      render: (v, row) => {
        const rStr = v || row.role || row.Role || ''
        const roles = rStr.split(',').map(r => r.trim()).filter(Boolean)
        return (
          <div className="flex flex-wrap gap-1.5 max-w-[200px]">
            {roles.map(r => {
              const roleOption = roleOptions.find(role => role.value === r)
              const cfg = ROLE_DETAILS[r] || { label: roleOption?.label || r, cls: 'bg-neutral-100 text-neutral-500 shadow-none' }
              return (
                <Badge key={r} className={cn('font-bold text-[8px] px-2 py-0.5 border-none shadow-sm uppercase tracking-[0.05em] rounded-lg', cfg.cls)}>
                  {cfg.label}
                </Badge>
              )
            })}
          </div>
        )
      }
    },
    {
      key: 'created_at', label: 'Audit Trail', className: 'w-[140px]',
      render: (v, row) => {
        const d = v || row.created_at
        return (
          <div className="flex flex-col text-right">
            <span className="font-bold text-neutral-900 text-[11px] font-jakarta tabular-nums">{d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span>
            <span className="text-[9px] text-neutral-300 font-bold uppercase tracking-widest mt-0.5">Registration</span>
          </div>
        )
      }
    }
  ]

  return (
    <PageContent>
      <Toaster position="top-right" />

      {/* ── Page Header ─────────────────────────── */}
      <DashboardHero
        title="Identity"
        highlightedTitle="Governance"
        subtitle="Kendali akses terpusat berbasis RBAC untuk seluruh entitas sistem. Kelola identitas dan otorisasi pengguna."
        icon="shield_person"
        badges={[
          { label: 'Security & OIDC Cluster', active: true }
        ]}
        actions={null}
      />

      {/* ── Table Section ────────────────────────────────────────── */}
      <Card className="glass-card shadow-sm rounded-xl overflow-hidden">
        <CardContent className="p-0">
          <DataTable
            title="Daftar User"
            subtitle="Menampilkan daftar seluruh user yang terdaftar."
            columns={columns}
            data={filteredUsers}
            loading={loading}
            searchPlaceholder="Search by identity handle, email, or authorization level..."
            onAdd={hasPermission('rbac.users.create') ? () => { setForm({ Email: '', Password: '', Role: '', Nama: '', FakultasID: '', ProgramStudiID: '', OrmawaAssign: '', OrmawaID: '', RoleScopeType: 'university', Phone: '' }); setIsCrudOpen(true) } : undefined}
            addLabel="New Identity"
            filters={[{ key: 'role', placeholder: 'Pilih Level', options: roleOptions.map(r => ({ label: r.label, value: r.value })) }]}
            searchWidth="max-w-md"
            actions={(row) => (
              <div className="flex items-center gap-2">
                {hasPermission('rbac.users.update') && (
                  <Button
                    onClick={() => {
                      setSelected(row);
                      setNewRole(row.role || row.Role || '');
                      setNewOrmawaId(row.ormawa_id || row.OrmawaID || '');
                      setNewOrmawaAssign(row.ormawa_assign || row.OrmawaAssign || '');
                      setNewFakultasId(row.fakultas_id || row.FakultasID || '');
                      setNewProdiId(row.program_studi_id || row.ProgramStudiID || '');
                      setNewRoleScopeType(row.role_scope_type || row.RoleScopeType || row.kencana_scope_type || row.KencanaScopeType || 'university');
                      setEditNama(row.identity_name || row.nama_lengkap || '');
                      setIsRoleOpen(true)
                    }}

                    variant="ghost"
                    className="h-8 px-3 gap-2 text-slate-400 hover:text-bku-primary hover:bg-bku-primary/5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border-none shadow-none cursor-pointer"
                  >
                    <KeyRound size={12} strokeWidth={2.5} className="text-slate-400 group-hover:text-bku-primary" /> Otoritas
                  </Button>
                )}
                {hasPermission('rbac.users.delete') && (
                  <Button onClick={() => { setSelected(row); setIsDelOpen(true) }} variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shadow-none cursor-pointer"><span className="material-symbols-outlined leading-none" style={{ fontSize: '15px' }} >delete</span></Button>
                )}
              </div>
            )}
          />
        </CardContent>
      </Card>


      {/* ── Create User Modal ───────────────────────────────────── */}
      <DialogModal
        open={isCrudOpen}
        onOpenChange={setIsCrudOpen}
        icon="manage_accounts"
        subtitle="Account Provisioning"
        title="Provision User Account"
        maxWidth="max-w-xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsCrudOpen(false)} />
            <ModalSaveButton onClick={handleCreate} loading={isSubmitting}>Commit New Account</ModalSaveButton>
          </>
        }
      >

        <form onSubmit={handleCreate}>
          <div className="space-y-6 font-inter">
            {/* Identity & Contextual Group */}
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Identity Handle (Email)</Label>
                  <Input required type="email" value={form.Email} onChange={e => handleEmailChange(e.target.value)} placeholder="email@bku.ac.id" className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs text-slate-800 transition-all font-inter" />
                  {form.Email && form.Email.includes('@') && (
                    <span className="text-[9px] font-extrabold text-blue-500 block mt-1.5 pl-1 tracking-wide animate-in fade-in duration-200">
                      Auto-detect ID Pokok: {form.Email.split('@')[0]}
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Default Authentication</Label>
                  <div className="relative">
                    <Input required type={showPassword ? "text" : "password"} value={form.Password} onChange={e => setForm({ ...form, Password: e.target.value })} placeholder="••••••••" className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs text-slate-800 transition-all font-inter pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Full Legal Name</Label>
                <Input required value={form.Nama} onChange={e => setForm({ ...form, Nama: e.target.value })} placeholder="Full name for ID mapping..." className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs text-slate-800 transition-all font-inter" />
              </div>

              {/* Contextual Selects (Always visible, disabled if not needed) */}
              <div className="pt-5 border-t border-slate-200/60 mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Fakultas</Label>
                  <Select disabled={!showFakultasSelect} value={form.FakultasID ? String(form.FakultasID) : undefined} onValueChange={v => setForm({ ...form, FakultasID: v, ProgramStudiID: '' })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                      <SelectValue placeholder={showFakultasSelect ? "PILIH FAKULTAS" : "TIDAK DIBUTUHKAN"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md max-h-[200px] overflow-y-auto z-[9999]">
                      {faculties.map(f => (
                        <SelectItem key={f.ID || f.id} value={String(f.ID || f.id)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">{f.Nama || f.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Program Studi</Label>
                  <Select disabled={!showProdiSelect || !form.FakultasID} value={form.ProgramStudiID ? String(form.ProgramStudiID) : undefined} onValueChange={v => setForm({ ...form, ProgramStudiID: v })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                      <SelectValue placeholder={!showProdiSelect ? "TIDAK DIBUTUHKAN" : form.FakultasID ? "PILIH PRODI" : "PILIH FAKULTAS DULU"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md max-h-[200px] overflow-y-auto z-[9999]">
                      {allProdi.filter(p => String(p.FakultasID || p.fakultas_id) === String(form.FakultasID)).map(p => (
                        <SelectItem key={p.ID || p.id} value={String(p.ID || p.id)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">{p.Nama || p.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Assign Ormawa</Label>
                  <Select disabled={!showOrmawaSelect || !ormawas || ormawas.length === 0} value={form.OrmawaID ? String(form.OrmawaID) : undefined} onValueChange={v => {
                    const selectedOrm = ormawas.find(o => String(o.id || o.ID) === String(v));
                    setForm({ ...form, OrmawaID: v, OrmawaAssign: selectedOrm ? selectedOrm.Nama || selectedOrm.nama : '' });
                  }}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                      <SelectValue placeholder={!showOrmawaSelect ? "TIDAK DIBUTUHKAN" : ormawas && ormawas.length > 0 ? "PILIH ORGANISASI MAHASISWA" : "BELUM ADA DATA ORMAWA"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md max-h-[200px] overflow-y-auto z-[9999]">
                      {ormawas && ormawas.map(o => (
                        <SelectItem key={o.id || o.ID} value={String(o.id || o.ID)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">{o.nama || o.Nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Custom Prodi Role Name</Label>
                  <Select disabled={!formRoles.includes('prodi_admin')} value={form.OrmawaAssign ? form.OrmawaAssign : undefined} onValueChange={v => setForm({ ...form, OrmawaAssign: v })}>
                    <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                      <SelectValue placeholder={!formRoles.includes('prodi_admin') ? "TIDAK DIBUTUHKAN" : "PILIH ROLE PRODI (e.g. Kaprodi)"} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md z-[9999]">
                      <SelectItem value="Kaprodi" className="text-[10px] font-black uppercase tracking-widest">Kaprodi</SelectItem>
                      <SelectItem value="Sekretaris Prodi" className="text-[10px] font-black uppercase tracking-widest">Sekretaris Prodi</SelectItem>
                      <SelectItem value="Staff Prodi" className="text-[10px] font-black uppercase tracking-widest">Staff Prodi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showRoleScopeSelect && (
                  <>
                    <div className="space-y-2 col-span-1 md:col-span-2 pt-4 border-t border-slate-200/50">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Pengaturan Scope Role</Label>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Role Scope</Label>
                      <Select value={form.RoleScopeType} onValueChange={v => setForm({ ...form, RoleScopeType: v, FakultasID: v === 'university' ? '' : form.FakultasID, ProgramStudiID: (v === 'university' || v === 'faculty') ? '' : form.ProgramStudiID })}>
                        <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all"><SelectValue placeholder="Pilih Scope" /></SelectTrigger>
                        <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md z-[9999]">
                          <SelectItem value="faculty" className="text-[10px] font-black uppercase tracking-widest">Fakultas</SelectItem>
                          <SelectItem value="prodi" className="text-[10px] font-black uppercase tracking-widest">Program Studi</SelectItem>
                          <SelectItem value="university" className="text-[10px] font-black uppercase tracking-widest">Universitas</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Phone</Label>
                      <Input value={form.Phone} onChange={e => setForm({ ...form, Phone: e.target.value })} placeholder="Nomor kontak mentor" className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs text-slate-800 transition-all font-inter" />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Authorization Level */}
            <div className="space-y-2 pt-2">
              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Authorization Level (Pilih satu atau lebih)</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
                {roleOptions.map(r => {
                  const isSelected = form.Role ? form.Role.split(',').map(x => x.trim()).includes(r.value) : false;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      onClick={() => handleToggleRole(r.value)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer",
                        isSelected
                          ? "border-bku-primary bg-bku-primary/5 shadow-sm text-bku-primary"
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                      )}
                    >
                      <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase tracking-wider">{r.label}</p>
                        {r.description && <p className="text-[9px] text-slate-400 line-clamp-1">{r.description}</p>}
                      </div>
                      <div className={cn(
                        "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                        isSelected ? "bg-bku-primary border-bku-primary" : "border-slate-300"
                      )}>
                        {isSelected && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

        </form>
      </DialogModal>

      {/* ── Update Role Modal ────────────────────────────────────── */}
      <DialogModal
        open={isRoleOpen}
        onOpenChange={setIsRoleOpen}
        icon="security"
        subtitle="Privilege Node"
        title="Modify Otoritas"
        maxWidth="max-w-xl"
        footer={
          <>
            <ModalCancelButton onClick={() => setIsRoleOpen(false)} />
            <ModalSaveButton onClick={handleUpdateRole} loading={isSubmitting}>Commit Authority</ModalSaveButton>
          </>
        }
      >
        <div className="space-y-6 font-inter">
          {/* Identity & Contextual Group */}
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200/50 flex items-center justify-between group shadow-sm">
              <div className="flex items-center gap-3 min-w-0">
                {/* Avatar initials */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-bku-primary/20 to-bku-primary/10 border border-bku-primary/20 flex items-center justify-center shrink-0">
                  <span className="text-bku-primary font-black text-sm uppercase">
                    {(selected?.identity_name || selected?.nama_lengkap || selected?.Email || selected?.email || '?').charAt(0)}
                  </span>
                </div>
                <div className="space-y-0.5 min-w-0">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] font-headline">Target Identity</p>
                  {/* Nama */}
                  <p className="text-sm font-black font-inter text-slate-800 truncate max-w-[180px] leading-tight">
                    {selected?.identity_name || selected?.nama_lengkap || '—'}
                  </p>
                  {/* Email */}
                  <p className="text-[10px] font-semibold font-inter text-slate-400 truncate max-w-[180px] lowercase">
                    {selected?.Email || selected?.email}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 justify-end max-w-[160px] shrink-0">
                {(selected?.role || selected?.Role || '').split(',').map(r => r.trim()).filter(Boolean).map(r => {
                  const roleOption = roleOptions.find(role => role.value === r)
                  const cfg = roleDetails[r] || { label: roleOption?.label || r, cls: 'bg-neutral-100 text-slate-500 border border-slate-200/60' }
                  return (
                    <Badge key={r} className={cn("font-bold text-[8px] px-2.5 py-1 border-none shadow-sm uppercase rounded-lg group-hover:scale-105 transition-transform", cfg.cls)}>
                      {cfg.label}
                    </Badge>
                  )
                })}
              </div>
            </div>

            {/* Edit Nama */}
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">
                Edit Nama Identitas
              </Label>
              <Input
                value={editNama}
                onChange={e => setEditNama(e.target.value)}
                placeholder="Nama lengkap..."
                className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs text-slate-800 transition-all font-inter"
              />
              <p className="text-[9px] text-slate-400 ml-1">Nama akan diperbarui di semua tabel profil yang terhubung.</p>
            </div>

            {/* Contextual Selects (Always visible, disabled if not needed) */}
            <div className="pt-5 border-t border-slate-200/60 mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-300">
              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Fakultas</Label>
                <Select disabled={!showNewFakultasSelect} value={newFakultasId ? String(newFakultasId) : undefined} onValueChange={v => { if (v === 'none') { setNewFakultasId(''); setNewProdiId(''); } else { setNewFakultasId(v); setNewProdiId(''); } }}>
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                    <SelectValue placeholder={showNewFakultasSelect ? "PILIH FAKULTAS" : "TIDAK DIBUTUHKAN"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md max-h-[200px] overflow-y-auto z-[9999]">
                    <SelectItem value="none" className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic bg-slate-50 border-b border-slate-100 mb-1">-- KOSONGKAN --</SelectItem>
                    {faculties.map(f => (
                      <SelectItem key={f.ID || f.id} value={String(f.ID || f.id)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">
                        {f.Nama || f.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Program Studi</Label>
                <Select
                  disabled={!showNewProdiSelect || !newFakultasId}
                  value={newProdiId ? String(newProdiId) : undefined}
                  onValueChange={v => { if (v === 'none') setNewProdiId(''); else setNewProdiId(v); }}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                    <SelectValue placeholder={!showNewProdiSelect ? "TIDAK DIBUTUHKAN" : newFakultasId ? "PILIH PRODI" : "PILIH FAKULTAS DULU"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md max-h-[200px] overflow-y-auto z-[9999]">
                    <SelectItem value="none" className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic bg-slate-50 border-b border-slate-100 mb-1">-- KOSONGKAN --</SelectItem>
                    {allProdi
                      .filter(p => String(p.FakultasID || p.fakultas_id) === String(newFakultasId))
                      .map(p => (
                        <SelectItem key={p.ID || p.id} value={String(p.ID || p.id)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">
                          {p.Nama || p.nama}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Assign Ormawa</Label>
                <Select
                  disabled={!showNewOrmawaSelect || !ormawas || ormawas.length === 0}
                  value={newOrmawaId ? String(newOrmawaId) : undefined}
                  onValueChange={v => {
                    if (v === 'none') {
                      setNewOrmawaId('');
                      setNewOrmawaAssign('');
                    } else {
                      const selectedOrm = ormawas.find(o => String(o.id || o.ID) === String(v));
                      setNewOrmawaId(v);
                      setNewOrmawaAssign(selectedOrm ? selectedOrm.Nama || selectedOrm.nama : '');
                    }
                  }}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                    <SelectValue placeholder={!showNewOrmawaSelect ? "TIDAK DIBUTUHKAN" : ormawas && ormawas.length > 0 ? "PILIH ORGANISASI MAHASISWA" : "BELUM ADA DATA ORMAWA"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md max-h-[200px] overflow-y-auto z-[9999]">
                    <SelectItem value="none" className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic bg-slate-50 border-b border-slate-100 mb-1">-- KOSONGKAN --</SelectItem>
                    {ormawas.map(o => (
                      <SelectItem key={o.id || o.ID} value={String(o.id || o.ID)} className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">
                        {o.nama || o.Nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Custom Prodi Role Name</Label>
                <Select
                  disabled={!newRoles.includes('prodi_admin')}
                  value={newOrmawaAssign ? newOrmawaAssign : undefined}
                  onValueChange={v => { if (v === 'none') setNewOrmawaAssign(''); else setNewOrmawaAssign(v); }}
                >
                  <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all disabled:opacity-50 disabled:bg-white">
                    <SelectValue placeholder={!newRoles.includes('prodi_admin') ? "TIDAK DIBUTUHKAN" : "PILIH ROLE PRODI"} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md z-[9999]">
                    <SelectItem value="none" className="text-[10px] font-black uppercase tracking-widest text-slate-400 italic bg-slate-50 border-b border-slate-100 mb-1">-- KOSONGKAN --</SelectItem>
                    <SelectItem value="Kaprodi" className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">Kaprodi</SelectItem>
                    <SelectItem value="Sekretaris Prodi" className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">Sekretaris Prodi</SelectItem>
                    <SelectItem value="Staff Prodi" className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">Staff Prodi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showNewRoleScopeSelect && (
                <>
                  <div className="space-y-2 col-span-1 md:col-span-2 pt-4 border-t border-slate-200/50">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Pengaturan Scope Role</Label>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Role Scope</Label>
                    <Select value={newRoleScopeType} onValueChange={v => { setNewRoleScopeType(v); if (v === 'university') { setNewFakultasId(''); setNewProdiId('') } else if (v === 'faculty') { setNewProdiId('') } }}>
                      <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white focus:bg-white focus:border-bku-primary focus:ring-2 focus:ring-bku-primary/20 font-bold text-xs uppercase tracking-[0.08em] text-slate-700 transition-all">
                        <SelectValue placeholder="PILIH SCOPE" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-2xl border-slate-100/80 bg-white/95 backdrop-blur-md z-[9999]">
                        <SelectItem value="faculty" className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">Fakultas</SelectItem>
                        <SelectItem value="prodi" className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">Program Studi</SelectItem>
                        <SelectItem value="university" className="text-[10px] font-black uppercase tracking-widest text-slate-600 focus:bg-slate-50 focus:text-bku-primary">Universitas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Authorization Level */}
          <div className="space-y-2 pt-2">
            <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1 font-headline">Target Authorization Level (Pilih satu atau lebih)</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[200px] overflow-y-auto pr-1 no-scrollbar">
              {roleOptions.map(r => {
                const isSelected = newRole ? newRole.split(',').map(x => x.trim()).includes(r.value) : false;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleToggleNewRole(r.value)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all flex items-start justify-between cursor-pointer",
                      isSelected
                        ? "border-bku-primary bg-bku-primary/5 shadow-sm text-bku-primary"
                        : "border-slate-200 bg-white hover:bg-slate-50 text-slate-600"
                    )}
                  >
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-wider">{r.label}</p>
                      {r.description && <p className="text-[9px] text-slate-400 line-clamp-1">{r.description}</p>}
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-colors shrink-0",
                      isSelected ? "bg-bku-primary border-bku-primary" : "border-slate-300"
                    )}>
                      {isSelected && <span className="material-symbols-outlined text-white" style={{ fontSize: '12px' }}>check</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

      </DialogModal>

      <DeleteConfirmModal
        isOpen={isDelOpen}
        onClose={() => setIsDelOpen(false)}
        onConfirm={handleDelete}
        title="Destroy Identity Entity?"
        description="Aksi ini akan mencabut seluruh hak akses, identitas digital, dan kaitan entitas pengguna ini secara permanen. Prosedur ini tidak dapat dibatalkan."
        loading={isSubmitting}
      />

    </PageContent>
  )
}
