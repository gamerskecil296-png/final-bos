import useAuthStore from '../store/useAuthStore'
import { toast } from 'react-hot-toast'
import { migratePermission } from '../config/permissions'

// ============================================================
// PERMISSION BRIDGE - Sinkronisasi Backend & Frontend
// Tanggal: 2026-06-19
// ============================================================

// Label per permission untuk pesan toast yang jelas
const PERMISSION_LABELS = {
  // Ormawa permissions
  'create_members': 'Tambah Anggota',
  'edit_members': 'Edit Anggota',
  'delete_members': 'Hapus Anggota',
  'create_finance': 'Catat Transaksi Keuangan',
  'delete_finance': 'Hapus Transaksi Keuangan',
  'create_lpj': 'Buat Laporan LPJ',
  'edit_lpj': 'Edit Laporan LPJ',
  'delete_lpj': 'Hapus Laporan LPJ',
  'create_proposal': 'Buat Proposal',
  'edit_proposal': 'Edit Proposal',
  'delete_proposal': 'Hapus Proposal',
  'respond_aspirations': 'Kirim Tanggapan Aspirasi',
  'create_announcements': 'Buat Pengumuman',
  'edit_announcements': 'Edit Pengumuman',
  'delete_announcements': 'Hapus Pengumuman',
  'create_calendar': 'Tambah Jadwal Kegiatan',
  'edit_calendar': 'Edit Jadwal Kegiatan',
  'delete_calendar': 'Hapus Jadwal Kegiatan',
  'manage_staff': 'Kelola Rekrutmen',

  // Kencana permissions
  'kencana.manage': 'Kelola PKKMB Kencana',
  'kencana.dashboard.view': 'Lihat Dashboard',
  'kencana.timeline.view': 'Lihat Kelola Periode',
  'kencana.timeline.create': 'Tambah Periode',
  'kencana.timeline.update': 'Ubah Periode',
  'kencana.timeline.delete': 'Hapus Periode',
  'kencana.pre_kencana.view': 'Lihat Pre-Kencana',
  'kencana.pre_kencana.create': 'Tambah Pre-Kencana',
  'kencana.pre_kencana.update': 'Ubah Pre-Kencana',
  'kencana.pre_kencana.delete': 'Hapus Pre-Kencana',
  'kencana.university.view': 'Lihat Tahap Universitas',
  'kencana.university.create': 'Tambah Tahap Universitas',
  'kencana.university.update': 'Ubah Tahap Universitas',
  'kencana.university.delete': 'Hapus Tahap Universitas',
  'kencana.faculty_stages.view': 'Lihat Tahap Fakultas',
  'kencana.faculty_stages.create': 'Tambah Tahap Fakultas',
  'kencana.faculty_stages.update': 'Ubah Tahap Fakultas',
  'kencana.faculty_stages.delete': 'Hapus Tahap Fakultas',
  'kencana.score_summary.view': 'Lihat Rekap Nilai Kelompok',
  'kencana.scores.view': 'Lihat Rekap Nilai',
  'kencana.scores.create': 'Buat Nilai',
  'kencana.scores.update': 'Ubah Nilai',
  'kencana.scores.delete': 'Hapus Nilai',
  'kencana.banding.view': 'Lihat Banding Nilai',
  'kencana.banding.update': 'Proses Banding Nilai',
  'kencana.remedials.view': 'Lihat Remedial',
  'kencana.remedials.create': 'Tambah Remedial',
  'kencana.remedials.update': 'Ubah Remedial',
  'kencana.remedials.delete': 'Hapus Remedial',
  'kencana.certificates.view': 'Lihat Sertifikat',
  'kencana.certificates.create': 'Generate Sertifikat',
  'kencana.certificates.update': 'Ubah Sertifikat',
  'kencana.certificates.delete': 'Hapus Sertifikat',
  'kencana.participants.view': 'Lihat Data Peserta',
  'kencana.participants.create': 'Tambah Peserta',
  'kencana.participants.update': 'Ubah Peserta',
  'kencana.participants.delete': 'Hapus Peserta',
  'kencana.groups.view': 'Lihat Kelompok',
  'kencana.groups.create': 'Tambah Kelompok',
  'kencana.groups.update': 'Ubah Kelompok',
  'kencana.groups.delete': 'Hapus Kelompok',
  'kencana.mentors.view': 'Lihat Mentor',
  'kencana.mentors.create': 'Tambah Mentor',
  'kencana.mentors.update': 'Ubah Mentor',
  'kencana.mentors.delete': 'Hapus Mentor',
  'kencana.notifications.view': 'Lihat Notifikasi Kencana',
  'kencana.settings.view': 'Lihat Pengaturan Kencana',
  'kencana.settings.update': 'Ubah Pengaturan Kencana',
  'kencana.mentor.dashboard': 'Lihat Dashboard Mentor',
  'kencana.mentor.view': 'Lihat Data Mahasiswa (Mentor)',
  'kencana.mentor.update': 'Kelola Bimbingan Mahasiswa',
  'kencana.mentor.settings': 'Pengaturan Mentor',
  'kencana.attendance.view': 'Lihat Absensi Kencana',
  'kencana.attendance.update': 'Ubah Absensi Kencana',
  'kencana.handbook.view': 'Lihat Handbook Kencana',
  'kencana.handbook.update': 'Ubah Handbook Kencana',

  // Medical / Tenaga Kesehatan permissions
  'health.dashboard.view': 'Lihat Dashboard Medis',
  'health.schedules.view': 'Lihat Jadwal Praktik',
  'health.schedules.manage': 'Kelola Jadwal Praktik',
  'health.bookings.view': 'Lihat Booking Masuk',
  'health.bookings.manage': 'Kelola Booking Masuk',
  'health.patients.view': 'Lihat Daftar Pasien',
  'health.medical_records.view': 'Lihat Rekam Medis',
  'health.medical_records.manage': 'Kelola Rekam Medis',
  'health.bap.manage': 'Kelola BAP Kesehatan',

  // Psychologist / Konseling Psikolog permissions
  'psychologist.dashboard.view': 'Lihat Dashboard Psikolog',
  'psychologist.schedules.view': 'Lihat Jadwal Konseling',
  'psychologist.schedules.create': 'Tambah Jadwal Konseling',
  'psychologist.schedules.update': 'Ubah Jadwal Konseling',
  'psychologist.schedules.delete': 'Hapus Jadwal Konseling',
  'psychologist.bookings.view': 'Lihat Reservasi Konseling',
  'psychologist.bookings.create': 'Buat Reservasi Konseling',
  'psychologist.bookings.update': 'Ubah Reservasi Konseling',
  'psychologist.bookings.delete': 'Hapus Reservasi Konseling',
  'psychologist.patients.view': 'Lihat Daftar Pasien Psikologi',
  'psychologist.patients.create': 'Tambah Pasien Psikologi',
  'psychologist.patients.update': 'Ubah Pasien Psikologi',
  'psychologist.patients.delete': 'Hapus Pasien Psikologi',
  'psychologist.medical_records.view': 'Lihat Rekam Medis Psikologis',
  'psychologist.medical_records.create': 'Buat Rekam Medis Psikologis',
  'psychologist.medical_records.update': 'Ubah Rekam Medis Psikologis',
  'psychologist.medical_records.delete': 'Hapus Rekam Medis Psikologis',
  'psychologist.referrals.view': 'Lihat Surat Rujukan',
  'psychologist.referrals.create': 'Buat Surat Rujukan',
  'psychologist.referrals.update': 'Ubah Surat Rujukan',
  'psychologist.referrals.delete': 'Hapus Surat Rujukan',
  'psychologist.reports.view': 'Lihat Laporan Bulanan',
  'psychologist.reports.create': 'Buat Laporan Bulanan',
  'psychologist.reports.update': 'Ubah Laporan Bulanan',
  'psychologist.reports.delete': 'Hapus Laporan Bulanan',
  'psychologist.notifications.view': 'Lihat Notifikasi Konseling',
  'psychologist.settings.view': 'Lihat Pengaturan Psikolog',
  'psychologist.settings.update': 'Ubah Pengaturan Psikolog',

  // SuperAdmin permissions
  'faculty.create': 'Tambah Fakultas',
  'faculty.update': 'Edit Fakultas',
  'faculty.delete': 'Hapus Fakultas',
  'faculty.sync': 'Sinkronisasi Fakultas',
  'achievement.create': 'Import Prestasi',
  'achievement.update': 'Edit Prestasi',
  'announcement.create': 'Buat Pengumuman Global',
  'announcement.update': 'Edit Pengumuman Global',
  'announcement.delete': 'Hapus Pengumuman Global',
  'aspiration.update_status': 'Update Status Aspirasi',
  'user.manage': 'Kelola Pengguna',

  // Legacy permission labels
  'view_mahasiswa': 'Lihat Data Mahasiswa',
  'edit_mahasiswa': 'Edit Data Mahasiswa',
  'view_prodi': 'Lihat Program Studi',
  'view_pkkmb': 'Lihat PKKMB',
  'view_organisasi': 'Lihat Organisasi',
  'view_proposal': 'Lihat Proposal',
  'view_prestasi': 'Lihat Prestasi',
  'view_beasiswa': 'Lihat Beasiswa',
  'view_kesehatan': 'Lihat Kesehatan',
  'view_aspirasi': 'Lihat Aspirasi',
  'view_laporan': 'Lihat Laporan',
  'view_pengaturan': 'Lihat Pengaturan',
}

// ============================================================
// PERMISSION MAPPING - Legacy ke New Format (dan sebaliknya)
// ============================================================
const LEGACY_MAP = {};

// ============================================================
// ROLE-BASED DEFAULT PERMISSIONS
// Auto-grant permissions berdasarkan role (fallback jika DB permissions kosong)
// ============================================================
const ROLE_DEFAULT_PERMISSIONS = {
  super_admin: ['*'], // Full access
  superadmin: ['*'],
  'super admin': ['*'],

  faculty_admin: [
    'faculty.dashboard.view', 'faculty.view',
    'students.view', 'students.create', 'students.update', 'students.delete',
    'program_studi.view',
    'kencana.faculty.dashboard', 'pkkmb.view',
    'ormawa.view', 'ormawa.proposals.view',
    'achievement.view', 'achievement.update', 'achievement.create',
    'scholarship.view', 'scholarship.manage',
    'health.view', 'health.dashboard.view',
    'psychologist.view', 'psychologist.dashboard.view',
    'aspiration.view', 'aspiration.respond',
    'report.view',
    'faculty_rbac.view', 'faculty_rbac.manage',
    'admin.audit.view',
    'dosen.view', 'dosen.manage',
    'akademik.view', 'akademik.manage',
  ],

  prodi_admin: [
    'faculty.dashboard.view',
    'students.view', 'students.create', 'students.update',
    'achievement.view', 'achievement.update',
    'scholarship.view',
    'aspiration.view',
    'report.view',
    'dosen.view',
    'akademik.view',
  ],

  mahasiswa: [], // Mahasiswa should not get wildcard admin permissions

  ormawa_admin: [
    'ormawa.view', 'ormawa.core.view',
    'ormawa.members.view', 'ormawa.members.create', 'ormawa.members.update', 'ormawa.members.delete',
    'ormawa.proposals.view', 'ormawa.proposals.create',
    'ormawa.finance.view', 'ormawa.finance.create',
    'ormawa.lpj.view', 'ormawa.lpj.create',
    'ormawa.aspirations.view', 'ormawa.aspirations.respond',
    'ormawa.announcements.view', 'ormawa.announcements.create',
    'ormawa.events.view', 'ormawa.events.create',
  ],

  psikolog: [
    'psychologist.view', 'psychologist.core', 'psychologist.dashboard.view',
    'psychologist.schedules.view', 'psychologist.schedules.create', 'psychologist.schedules.update', 'psychologist.schedules.delete',
    'psychologist.bookings.view', 'psychologist.bookings.create', 'psychologist.bookings.update', 'psychologist.bookings.delete',
    'psychologist.patients.view', 'psychologist.patients.create', 'psychologist.patients.update', 'psychologist.patients.delete',
    'psychologist.medical_records.view', 'psychologist.medical_records.create', 'psychologist.medical_records.update',
    'psychologist.referrals.view', 'psychologist.referrals.create',
    'psychologist.reports.view', 'psychologist.reports.create',
    'psychologist.notifications.view', 'psychologist.settings.view', 'psychologist.settings.update',
  ],

  tenaga_kesehatan: [
    'health.view', 'health.dashboard.view',
    'health.schedules.view', 'health.schedules.manage',
    'health.bookings.view', 'health.bookings.manage',
    'health.patients.view',
    'health.medical_records.view', 'health.medical_records.manage',
    'health.bap.manage',
  ],

  kencana_admin: [
    'kencana.dashboard.view', 'kencana.timeline.view', 'kencana.university.view',
    'kencana.participants.view', 'kencana.scores.view', 'kencana.banding.view', 'kencana.score_summary.view',
    'kencana.remedials.view', 'kencana.certificates.view', 'kencana.groups.view', 'kencana.mentors.view',
    'kencana.notifications.view', 'kencana.settings.view', 'kencana.announcement.view'
  ],

  kencana_fakultas: [
    'kencana.dashboard.view', 'kencana.faculty_stages.view', 'kencana.participants.view',
    'kencana.scores.view', 'kencana.banding.view', 'kencana.score_summary.view',
    'kencana.remedials.view', 'kencana.certificates.view', 'kencana.groups.view', 'kencana.mentors.view',
    'kencana.notifications.view', 'kencana.settings.view', 'kencana.announcement.view'
  ],

  kencana_mentor: [
    'kencana.mentor.dashboard', 'kencana.mentor.view', 'kencana.mentor.settings',
    'kencana.notifications.view'
  ],
}

export function usePermission() {
  const user = useAuthStore(state => state.user)

  // Backend mengirimkan permissions dalam bentuk array string di user.permissions
  const dbPermissions = user?.permissions || user?.Permissions || []

  // Parse user roles - supports comma-separated roles
  const userRoles = (user?.role || '').split(',').map(r => r.trim().toLowerCase());
  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('superadmin') || userRoles.includes('super admin');

  // Start with database permissions
  let permissions = [...dbPermissions];

  // Remove duplicates and empty strings, and translate legacy keys
  permissions = [...new Set(permissions.map(p => {
    return p && p.trim() ? migratePermission(p.trim()) : null;
  }).filter(Boolean))];

  // Check specific permission
  const hasPermission = (key) => {
    if (!key) return true // If no key, pass
    if (isSuperAdmin) return true
    if (permissions.includes('*')) return true // Wildcard = full access

    // Mahasiswa is a default role, bypass specific permission checks for student menus
    if (userRoles.includes('mahasiswa')) {
      if (key.startsWith('student.') || key === 'student_kencana_view') return true;
    }

    // Direct match
    if (permissions.includes(key)) return true

    // Check legacy mappings
    const mappedKeys = LEGACY_MAP[key] || [];
    if (mappedKeys.some(mappedKey => permissions.includes(mappedKey))) return true;

    // Dashboard fallback: jika cek dashboard, izinkan jika mereka memiliki permission portal apa saja
    if (key === 'view_dashboard' || key === 'faculty.dashboard.view' || key === 'admin.dashboard.view') {
      const isFacultyPerm = (p) =>
        p.startsWith('faculty.') || p.startsWith('faculty_') ||
        p.startsWith('kencana.faculty') || p.startsWith('program_studi.') ||
        ['students.view', 'dosen.view', 'achievement.view', 'scholarship.view', 'akademik.view', 'aspiration.view', 'prodi_users.view'].includes(p);

      if (permissions.some(p => p.startsWith('ormawa.') || p.startsWith('admin.') || p.startsWith('health.') || p.startsWith('psychologist.') || isFacultyPerm(p))) {
        return true;
      }
    }

    return false;
  }

  // Get all permissions for a role
  const getRolePermissions = (role) => {
    return ROLE_DEFAULT_PERMISSIONS[role] || [];
  }

  // Interceptor for sensitive actions (onClick, etc.)
  // If no permission, show toast and cancel execution
  const withPermissionCheck = (permKey, fn) => (...args) => {
    if (!hasPermission(permKey)) {
      const label = PERMISSION_LABELS[permKey] || permKey;
      toast.error(`Akses Ditolak`, {
        description: `Anda tidak memiliki izin untuk: ${label}`,
        icon: '🔒',
        style: { background: '#ef4444', color: '#fff' }
      });
      return;
    }
    return typeof fn === 'function' ? fn(...args) : undefined;
  }

  return {
    hasPermission,
    withPermissionCheck,
    getRolePermissions,
    permissions,
    isSuperAdmin,
    userRoles
  };
}

// Export constants for use elsewhere
export { LEGACY_MAP, ROLE_DEFAULT_PERMISSIONS, PERMISSION_LABELS };
