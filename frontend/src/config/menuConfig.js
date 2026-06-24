// ============================================================
// UNIFIED MENU CONFIG — Module-Based Architecture
// Single source of truth for ALL navigation menus.
// Visibility is controlled by permissions, NOT by role.
// ============================================================

import { P } from './permissions';

/**
 * Each menu item specifies one or more permissions.
 * The sidebar will only show items the user has access to.
 * 
 * Format:
 * {
 *   group: 'GROUP LABEL',        // Section header
 *   module: 'module_name',       // Optional: used for grouping in RBAC UI
 *   items: [
 *     {
 *       name: 'Menu Label',
 *       icon: 'material_icon_name',
 *       path: '/app/...',
 *       permission: 'module.resource.action',  // Required permission(s)
 *       submenu?: [...]           // Optional nested items
 *     }
 *   ]
 * }
 */

// ─── MASTER MENU ─────────────────────────────────────────────
// This is the COMPLETE list of all navigable items in the app.
// Every role sees a SUBSET of this menu based on their permissions.
export const MENU_ITEMS = [

  // =============================================
  // CORE / DASHBOARD
  // =============================================
  {
    group: 'DASHBOARD',
    module: 'core',
    items: [
      {
        name: 'Dashboard',
        icon: 'dashboard',
        path: '/app/dashboard',
        permission: P.DASHBOARD_VIEW,
      },
    ],
  },

  // =============================================
  // STUDENT PORTAL
  // =============================================
  {
    group: 'PORTAL MAHASISWA',
    module: 'student',
    items: [
      { name: 'Dashboard', icon: 'space_dashboard', path: '/app/student/dashboard', permission: P.STUDENT_DASHBOARD_VIEW },
      { name: 'Data Diri', icon: 'person', path: '/app/student/profile', permission: P.STUDENT_PROFILE_VIEW },
    ],
  },
  {
    group: 'LAYANAN MAHASISWA',
    module: 'student',
    items: [
      { name: 'Kencana (PKKMB)', icon: 'school', path: '/app/student/kencana', permission: P.STUDENT_KENCANA_VIEW },
      { name: 'Handbook Kencana', icon: 'menu_book', path: '/app/student/kencana/handbook', permission: P.STUDENT_KENCANA_VIEW },
      { name: 'Konseling', icon: 'psychology', path: '/app/student/counseling', permission: P.STUDENT_COUNSELING_VIEW },
      { name: 'Kesehatan', icon: 'favorite', path: '/app/student/health', permission: P.STUDENT_HEALTH_VIEW },
      { name: 'Asuransi', icon: 'verified_user', path: '/app/student/insurance', permission: P.STUDENT_INSURANCE_VIEW },
    ],
  },
  {
    group: 'INFO & AKTIVITAS',
    module: 'student',
    items: [
      { name: 'Beasiswa', icon: 'school', path: '/app/student/scholarship', permission: P.STUDENT_SCHOLARSHIP_VIEW },
      { name: 'Prestasi', icon: 'emoji_events', path: '/app/student/achievement', permission: P.STUDENT_ACHIEVEMENT_VIEW },
      { name: 'Organisasi', icon: 'groups', path: '/app/student/organisasi', permission: P.STUDENT_ORGANISATION_VIEW },
      { name: 'Aspirasi', icon: 'campaign', path: '/app/student/voice', permission: P.STUDENT_VOICE_VIEW },
    ],
  },

  // =============================================
  // AKADEMIK
  // =============================================
  {
    group: 'AKADEMIK',
    module: 'akademik',
    items: [
      {
        name: 'Master Akademik',
        icon: 'apartment',
        path: '/app/akademik',
        hasSubmenu: true,
        submenu: [
          { name: 'Periode Akademik', icon: 'calendar_month', path: '/app/akademik/periode', permission: P.PERIODE_VIEW },
          { name: 'Kelola Fakultas', icon: 'corporate_fare', path: '/app/akademik/fakultas', permission: P.FAKULTAS_VIEW },
          { name: 'Program Studi', icon: 'database', path: '/app/akademik/prodi', permission: P.PRODI_VIEW },
        ],
      },
      {
        name: 'Sivitas Akademika',
        icon: 'school',
        path: '/app/akademik/sivitas',
        hasSubmenu: true,
        submenu: [
          { name: 'Dosen', icon: 'badge', path: '/app/akademik/dosen', permission: P.DOSEN_VIEW },
          { name: 'Direktori Mahasiswa', icon: 'groups', path: '/app/akademik/mahasiswa', permission: P.MAHASISWA_VIEW },
          { name: 'PMB / Daftar Ulang', icon: 'person_add', path: '/app/akademik/pmb', permission: P.PMB_VIEW },
        ],
      },
    ],
  },

  // =============================================
  // KEMAHASISWAAN
  // =============================================
  {
    group: 'KEMAHASISWAAN',
    module: 'kemahasiswaan',
    items: [
      {
        name: 'Layanan Kemahasiswaan',
        icon: 'school',
        path: '/app/kemahasiswaan/layanan',
        hasSubmenu: true,
        submenu: [
          { name: 'Beasiswa', icon: 'payments', path: '/app/kemahasiswaan/beasiswa', permission: P.BEASISWA_VIEW },
          { name: 'Prestasi Mahasiswa', icon: 'emoji_events', path: '/app/kemahasiswaan/prestasi', permission: P.PRESTASI_VIEW },
          { name: 'Aspirasi', icon: 'chat', path: '/app/kemahasiswaan/aspirasi', permission: P.ASPIRASI_VIEW },
          { name: 'Asuransi Mahasiswa', icon: 'health_and_safety', path: '/app/kemahasiswaan/asuransi', permission: P.ASURANSI_VIEW },
        ]
      }
    ],
  },

  // =============================================
  // ORGANISASI MAHASISWA (ORMAWA)
  // =============================================
  {
    group: 'ORGANISASI MAHASISWA',
    module: 'ormawa',
    items: [
      {
        name: 'Master Data Ormawa',
        icon: 'corporate_fare',
        path: '/app/ormawa/master',
        hasSubmenu: true,
        submenu: [
          { name: 'Dashboard Ormawa', icon: 'dashboard', path: '/app/ormawa/dashboard', permission: P.ORMAWA_DASHBOARD_VIEW },
          { name: 'Daftar Organisasi', icon: 'corporate_fare', path: '/app/ormawa/organisasi', permission: P.ORMAWA_VIEW },
          { name: 'Kategori Organisasi', icon: 'category', path: '/app/ormawa/kategori', permission: P.ORMAWA_KATEGORI_VIEW },
          { name: 'Gamifikasi', icon: 'emoji_events', path: '/app/ormawa/gamifikasi', permission: P.ORMAWA_GAMIFIKASI_VIEW },
          { name: 'Pagu Dana Ormawa', icon: 'account_balance_wallet', path: '/app/ormawa/pagu', permission: P.ORMAWA_PAGU_VIEW },
        ],
      },
      {
        name: 'Keanggotaan & SDM',
        icon: 'groups',
        path: '/app/ormawa/sdm',
        hasSubmenu: true,
        submenu: [
          { name: 'Anggota Aktif', icon: 'group', path: '/app/ormawa/anggota', permission: P.ORMAWA_MEMBERS_VIEW },
          { name: 'Staf Organisasi', icon: 'badge', path: '/app/ormawa/staff', permission: P.ORMAWA_MEMBERS_VIEW },
          { name: 'Struktur Pengurus', icon: 'account_tree', path: '/app/ormawa/struktur', permission: P.ORMAWA_STRUCTURE_VIEW },
          { name: 'Open Recruitment', icon: 'how_to_reg', path: '/app/ormawa/recruitment', permission: P.ORMAWA_RECRUITMENT_VIEW },
          { name: 'Siaran Pengumuman', icon: 'campaign', path: '/app/ormawa/pengumuman', permission: P.ORMAWA_ANNOUNCEMENT_VIEW },
        ],
      },
      {
        name: 'Operasional & Kegiatan',
        icon: 'assignment',
        path: '/app/ormawa/operasional',
        hasSubmenu: true,
        submenu: [
          { name: 'Proposal & Kegiatan', icon: 'description', path: '/app/ormawa/proposal', permission: P.ORMAWA_PROPOSAL_VIEW },
          { name: 'Jadwal Kalender', icon: 'calendar_month', path: '/app/ormawa/jadwal', permission: P.ORMAWA_EVENT_VIEW },
          { name: 'Sistem Absensi (QR)', icon: 'qr_code', path: '/app/ormawa/absensi', permission: P.ORMAWA_ATTENDANCE_VIEW },
          { name: 'Pagu & Buku Keuangan', icon: 'account_balance_wallet', path: '/app/ormawa/keuangan', permission: P.ORMAWA_FINANCE_VIEW },
          { name: 'Laporan & LPJ', icon: 'assignment', path: '/app/ormawa/lpj', permission: P.ORMAWA_LPJ_VIEW },
        ],
      },
    ],
  },

  // =============================================
  // LAYANAN PSIKOLOGI / KONSELING
  // =============================================
  {
    group: 'LAYANAN PSIKOLOGI',
    module: 'psikologi',
    items: [
      {
        name: 'Klinik Psikologi',
        icon: 'psychology',
        path: '/app/psikologi/klinik',
        hasSubmenu: true,
        submenu: [
          { name: 'Dashboard Psikolog', icon: 'dashboard', path: '/app/psikologi/dashboard', permission: P.PSIKOLOGI_DASHBOARD_VIEW },
          { name: 'Direktori Psikolog', icon: 'groups', path: '/app/psikologi/list', permission: P.PSIKOLOGI_VIEW },
          { name: 'Booking Konseling', icon: 'calendar_month', path: '/app/psikologi/bookings', permission: P.PSIKOLOGI_BOOKING_VIEW },
          { name: 'Jadwal Saya', icon: 'schedule', path: '/app/psikologi/schedule', permission: P.PSIKOLOGI_SCHEDULE_VIEW },
          { name: 'Daftar Pasien', icon: 'people', path: '/app/psikologi/patients', permission: P.PSIKOLOGI_PATIENT_VIEW },
          { name: 'Rekam Konseling', icon: 'medical_services', path: '/app/psikologi/medical-records', permission: P.PSIKOLOGI_RECORD_VIEW },
          { name: 'Analytics & Trend', icon: 'analytics', path: '/app/psikologi/analytics', permission: P.PSIKOLOGI_REPORT_VIEW },
          { name: 'Tindak Lanjut', icon: 'forward_to_inbox', path: '/app/psikologi/referrals', permission: P.PSIKOLOGI_REFERRAL_VIEW },
        ],
      }
    ],
  },

  // =============================================
  // LAYANAN KESEHATAN / TENAGA KESEHATAN
  // =============================================
  {
    group: 'LAYANAN KESEHATAN',
    module: 'kesehatan',
    items: [
      {
        name: 'Klinik Kesehatan',
        icon: 'health_and_safety',
        path: '/app/kesehatan/klinik',
        hasSubmenu: true,
        submenu: [
          { name: 'Dashboard', icon: 'dashboard', path: '/app/kesehatan/dashboard', permission: P.KESEHATAN_DASHBOARD_VIEW },
          { name: 'Manajemen Jadwal Praktik', icon: 'schedule', path: '/app/kesehatan/schedule', permission: P.KESEHATAN_SCHEDULE_VIEW },
          { name: 'Manajemen Antrean', icon: 'calendar_month', path: '/app/kesehatan/bookings', permission: P.KESEHATAN_BOOKING_VIEW },
          { name: 'Daftar & Pencarian Pasien', icon: 'people', path: '/app/kesehatan/patients', permission: P.KESEHATAN_PATIENT_VIEW },
          { name: 'Pemeriksaan Live', icon: 'monitor_heart', path: '/app/kesehatan/examination', permission: P.KESEHATAN_RECORD_MANAGE },
          { name: 'EMR', icon: 'medical_information', path: '/app/kesehatan/emr', permission: P.KESEHATAN_RECORD_MANAGE },
          { name: 'Tindak Lanjut & Rujukan', icon: 'forward_to_inbox', path: '/app/kesehatan/referrals', permission: P.KESEHATAN_REFERRAL_VIEW },
          { name: 'Laporan Klinik', icon: 'analytics', path: '/app/kesehatan/reports', permission: P.KESEHATAN_REPORT_VIEW },
          { name: 'Notifikasi', icon: 'notifications', path: '/app/kesehatan/notifications', permission: P.KESEHATAN_DASHBOARD_VIEW },
          { name: 'Edit Profile', icon: 'settings', path: '/app/kesehatan/settings', permission: P.KESEHATAN_SETTINGS_VIEW },
        ],
      }
    ],
  },

  // =============================================
  // KENCANA / PKKMB
  // =============================================
  {
    group: 'PKKMB KENCANA',
    module: 'kencana',
    items: [
      {
        name: 'Manajemen Kencana',
        icon: 'account_balance',
        path: '/app/kencana/manajemen',
        hasSubmenu: true,
        submenu: [
          { name: 'Dashboard', icon: 'dashboard', path: '/app/kencana/dashboard', permission: P.KENCANA_DASHBOARD_VIEW },
          { name: 'Kelola Periode', icon: 'date_range', path: '/app/kencana/periods', permission: P.KENCANA_PERIOD_VIEW },
          { name: 'Pengumuman', icon: 'campaign', path: '/app/kencana/announcements', permission: P.KENCANA_ANNOUNCEMENT_VIEW },
          { name: 'Tahap Pra-Kencana', icon: 'flag', path: '/app/kencana/pre-kencana', permission: P.KENCANA_PRE_VIEW },
          { name: 'Tahap Universitas', icon: 'account_tree', path: '/app/kencana/stages', permission: P.KENCANA_UNIV_VIEW },
          { name: 'Tahap Fakultas', icon: 'corporate_fare', path: '/app/kencana/faculty-stages', permission: P.KENCANA_FACULTY_VIEW },
          { name: 'Data Peserta', icon: 'groups', path: '/app/kencana/participants', permission: P.KENCANA_PARTICIPANT_VIEW },
          { name: 'Kelola Kelompok', icon: 'group_work', path: '/app/kencana/groups', permission: P.KENCANA_GROUP_VIEW },
          { name: 'Kelola Mentor', icon: 'supervisor_account', path: '/app/kencana/mentors', permission: P.KENCANA_MENTOR_VIEW },
        ],
      },
      {
        name: 'Penilaian & Kelulusan',
        icon: 'grade',
        path: '/app/kencana/penilaian',
        hasSubmenu: true,
        submenu: [
          { name: 'Rekap Nilai', icon: 'grade', path: '/app/kencana/scores', permission: P.KENCANA_SCORE_VIEW },
          { name: 'Banding Nilai', icon: 'gavel', path: '/app/kencana/banding', permission: P.KENCANA_BANDING_VIEW },
          { name: 'Rekap Nilai Kelompok', icon: 'assessment', path: '/app/kencana/score-summary', permission: P.KENCANA_SUMMARY_VIEW },
          { name: 'Remedial', icon: 'autorenew', path: '/app/kencana/remedials', permission: P.KENCANA_REMEDIAL_VIEW },
          { name: 'Sertifikat', icon: 'workspace_premium', path: '/app/kencana/certificates', permission: P.KENCANA_CERTIFICATE_VIEW },
        ],
      },
      {
        name: 'Portal Mentor',
        icon: 'diversity_3',
        path: '/app/kencana/portal-mentor',
        hasSubmenu: true,
        submenu: [
          { name: 'Dashboard Mentor', icon: 'dashboard', path: '/app/kencana/mentor', permission: P.KENCANA_MENTOR_DASHBOARD },
          { name: 'Kelompok Saya', icon: 'diversity_3', path: '/app/kencana/mentor/groups', permission: P.KENCANA_MENTOR_STUDENTS },
          { name: 'Mahasiswa Saya', icon: 'school', path: '/app/kencana/mentor/students', permission: P.KENCANA_MENTOR_STUDENTS },
          { name: 'Cari Mahasiswa', icon: 'person_search', path: '/app/kencana/mentor/available', permission: P.KENCANA_MENTOR_STUDENTS },
        ],
      }
    ],
  },

  // =============================================
  // LAPORAN
  // =============================================
  {
    group: 'LAPORAN',
    module: 'laporan',
    items: [
      { name: 'Laporan Fakultas', icon: 'description', path: '/app/laporan/fakultas', permission: P.REPORT_VIEW },
    ],
  },

  // =============================================
  // KEAMANAN & AKSES (RBAC)
  // =============================================
  {
    group: 'KEAMANAN & AKSES',
    module: 'rbac',
    items: [
      {
        name: 'RBAC',
        icon: 'security',
        path: '/app/rbac',
        permission: P.RBAC_ROLES_VIEW,
        hasSubmenu: true,
        submenu: [
          { name: 'Role', icon: 'admin_panel_settings', path: '/app/rbac/roles', permission: P.RBAC_ROLES_VIEW },
          { name: 'User Access', icon: 'group', path: '/app/rbac/users', permission: P.RBAC_USERS_VIEW },
        ],
      },
    ],
  },

  // =============================================
  // CMS & SISTEM
  // =============================================
  {
    group: 'CMS & SISTEM',
    module: 'sistem',
    items: [
      {
        name: 'Manajemen Sistem',
        icon: 'settings_applications',
        path: '/app/sistem',
        hasSubmenu: true,
        submenu: [
          { name: 'Kelola Berita', icon: 'newspaper', path: '/app/sistem/berita', permission: P.NEWS_VIEW },
          { name: 'Landing Page', icon: 'web', path: '/app/sistem/landing', permission: P.LANDING_VIEW },
          { name: 'Tema & Tampilan', icon: 'palette', path: '/app/sistem/tema', permission: P.THEME_VIEW },
          { name: 'Format Surat', icon: 'description', path: '/app/sistem/dokumen', permission: P.DOCUMENT_VIEW },
          { name: 'Dokumentasi', icon: 'menu_book', path: '/app/sistem/docs', permission: P.DOCS_VIEW },
          { name: 'Audit Log', icon: 'history', path: '/app/sistem/audit', permission: P.AUDIT_VIEW },
        ],
      }
    ],
  },

  // =============================================
  // NOTIFIKASI (always visible for authenticated users)
  // =============================================
  {
    group: 'LAINNYA',
    module: 'core',
    items: [
      { name: 'Notifikasi', icon: 'notifications', path: '/app/notifications', permission: P.NOTIFICATIONS_VIEW },
      { name: 'Profil', icon: 'account_circle', path: '/app/profile', permission: P.PROFILE_VIEW },
      { name: 'Pengaturan Sistem', icon: 'settings', path: '/app/sistem/pengaturan', permission: P.SETTINGS_VIEW },
    ],
  },
];


// ============================================================
// PORTAL BRANDING — Determines look-and-feel per context
// Unlike the old system, this is NOT tied to role but to
// which "context" the user selected or was auto-detected.
// ============================================================
export const PORTAL_BRANDING = {
  default: {
    title: 'BKU StudentHub',
    logo: '/images/bku logo.png',
    subtitle: 'Sistem Informasi Akademik',
    roleLabel: null,       // Will be auto-set from user role
    roleBadgeColor: 'blue',
  },
};


/**
 * Filter MENU_ITEMS to only show items the user has permission for.
 * This is the core function that replaces all 9 PortalConfig entries.
 *
 * @param {function} hasPermission - Permission checker function (from usePermission hook)
 * @param {boolean} isSuperAdmin - Whether the user is a superadmin
 * @returns {Array} Filtered menu groups with only accessible items
 */
export function getFilteredMenu(hasPermission, isSuperAdmin = false) {
  return MENU_ITEMS
    .filter(group => {
      // Hide student portal from superadmin sidebar
      if (isSuperAdmin && group.module === 'student') return false;
      return true;
    })
    .map(group => {
      const filteredItems = (group.items || [])
        .map(item => {
          // If item has submenu, filter submenu items first
          if (item.hasSubmenu && item.submenu) {
            const filteredSubmenu = item.submenu.filter(sub =>
              hasPermission(sub.permission)
            );
            return { ...item, submenu: filteredSubmenu };
          }
          return item;
        })
        .filter(item => {
          // Remove submenu parents with no visible children
          if (item.hasSubmenu && (!item.submenu || item.submenu.length === 0)) {
            return false;
          }
          // If it's a submenu parent and has visible children, let it through
          if (item.hasSubmenu && item.submenu && item.submenu.length > 0) {
            return true;
          }
          // Check item's own permission
          return hasPermission(item.permission);
        });

      return { ...group, items: filteredItems };
    })
    .filter(group => group.items.length > 0);
}


/**
 * Get all unique modules from MENU_ITEMS.
 * Useful for RBAC management UI.
 */
export function getModules() {
  const modules = new Set();
  MENU_ITEMS.forEach(group => {
    if (group.module) modules.add(group.module);
  });
  return [...modules];
}

/**
 * Get all permissions used in MENU_ITEMS.
 * Useful for RBAC role editor.
 */
export function getAllMenuPermissions() {
  const perms = new Set();
  MENU_ITEMS.forEach(group => {
    group.items.forEach(item => {
      if (item.permission) perms.add(item.permission);
      if (item.submenu) {
        item.submenu.forEach(sub => {
          if (sub.permission) perms.add(sub.permission);
        });
      }
    });
  });
  return [...perms].sort();
}
