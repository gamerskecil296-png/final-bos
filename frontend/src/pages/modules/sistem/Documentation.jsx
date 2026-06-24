import React, { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

import { cn } from '@/lib/utils';
import { PageContent } from '@/components/ui/page';
import useAuthStore from '@/store/useAuthStore';

export default function Documentation() {
  const [activeDocTab, setActiveDocTab] = useState("intro");

  const authUser = useAuthStore(state => state.user);
  const userRoles = (authUser?.role || '').split(',').map(r => r.trim().toLowerCase());

  const isSuperAdmin = userRoles.includes('super_admin') || userRoles.includes('superadmin');
  const isFacultyAdmin = userRoles.includes('faculty_admin') || userRoles.includes('admin_fakultas');
  const isOrmawaAdmin = userRoles.includes('ormawa_admin') || userRoles.includes('ormawa');
  const isPsychologist = userRoles.includes('psychologist') || userRoles.includes('psikolog');
  const isKencanaAdmin = userRoles.includes('kencana_admin');
  const isKencanaFakultas = userRoles.includes('kencana_fakultas');
  const isKencanaMentor = userRoles.includes('kencana_mentor');
  const isStudent = userRoles.includes('student') || userRoles.includes('mahasiswa');
  const isTenagaMedis = userRoles.includes('tenaga_kesehatan') || userRoles.includes('tenagakes');

  const allMenuGroups = [
    {
      group: "GETTING STARTED",
      items: [
        { id: 'intro', label: 'Pengantar SIAKAD', icon: 'book' },
        { id: 'sync', label: 'Integrasi SEVIMA', icon: 'cloud_sync' },
        { id: 'accounts', label: 'Siklus Akun & Autentikasi', icon: 'how_to_reg' },
      ]
    },
    {
      group: "SUPER ADMIN",
      items: [
        // MENU UTAMA
        { id: 'sa_dashboard', label: 'Dashboard Utama', icon: 'dashboard' },
        // MANAJEMEN DATA
        { id: 'sa_faculty', label: 'Data Fakultas', icon: 'apartment' },
        { id: 'sa_faculty_kelola', label: 'Kelola Fakultas', icon: 'corporate_fare', isSubmenu: true },
        { id: 'sa_faculty_prodi', label: 'Program Studi', icon: 'database', isSubmenu: true },
        { id: 'sa_faculty_aspirasi', label: 'Aspirasi Masuk', icon: 'campaign', isSubmenu: true },
        { id: 'sa_faculty_laporan', label: 'Laporan', icon: 'description', isSubmenu: true },
        { id: 'sa_faculty_akun', label: 'Akun Prodi', icon: 'manage_accounts', isSubmenu: true },

        { id: 'sa_lecturers', label: 'Data Dosen', icon: 'badge' },

        { id: 'sa_students', label: 'Data Mahasiswa', icon: 'school' },
        { id: 'sa_students_direktori', label: 'Direktori Mahasiswa', icon: 'groups', isSubmenu: true },
        { id: 'sa_students_pmb', label: 'Data PMB', icon: 'person_add', isSubmenu: true },
        { id: 'sa_students_beasiswa', label: 'Beasiswa', icon: 'payments', isSubmenu: true },

        { id: 'sa_psikolog', label: 'Data Psikolog', icon: 'psychology' },
        { id: 'sa_psikolog_dash', label: 'Dashboard Psikolog', icon: 'dashboard', isSubmenu: true },
        { id: 'sa_psikolog_dir', label: 'Direktori Psikolog', icon: 'groups', isSubmenu: true },
        { id: 'sa_psikolog_book', label: 'Booking Konseling', icon: 'calendar_month', isSubmenu: true },
        { id: 'sa_psikolog_medis', label: 'Rekam Medis', icon: 'medical_services', isSubmenu: true },
        { id: 'sa_psikolog_ref', label: 'Tindak Lanjut', icon: 'forward_to_inbox', isSubmenu: true },

        { id: 'sa_medis', label: 'Data Medis', icon: 'medical_services' },
        { id: 'sa_medis_dash', label: 'Dashboard Medis', icon: 'dashboard', isSubmenu: true },
        { id: 'sa_medis_dir', label: 'Direktori Tenaga Medis', icon: 'groups', isSubmenu: true },
        { id: 'sa_medis_book', label: 'Booking Janji Temu', icon: 'calendar_month', isSubmenu: true },
        { id: 'sa_medis_rekam', label: 'Rekam Medis & Screening', icon: 'medical_services', isSubmenu: true },
        { id: 'sa_medis_bap', label: 'BAP Kesehatan', icon: 'description', isSubmenu: true },
        { id: 'sa_medis_ref', label: 'Surat Rujukan', icon: 'forward_to_inbox', isSubmenu: true },

        { id: 'sa_ormawa', label: 'Data Ormawa', icon: 'groups' },
        { id: 'sa_ormawa_kelola', label: 'Kelola Ormawa', icon: 'corporate_fare', isSubmenu: true },
        { id: 'sa_ormawa_anggota', label: 'Anggota Aktif', icon: 'group', isSubmenu: true },
        { id: 'sa_ormawa_struktur', label: 'Struktur Pengurus', icon: 'account_tree', isSubmenu: true },
        { id: 'sa_ormawa_proposal', label: 'Proposal & Kegiatan', icon: 'description', isSubmenu: true },
        { id: 'sa_ormawa_jadwal', label: 'Jadwal Kalender', icon: 'calendar_month', isSubmenu: true },
        { id: 'sa_ormawa_absensi', label: 'Absensi (QR)', icon: 'qr_code', isSubmenu: true },
        { id: 'sa_ormawa_keuangan', label: 'Keuangan & Kas', icon: 'account_balance_wallet', isSubmenu: true },
        { id: 'sa_ormawa_lpj', label: 'Laporan & LPJ', icon: 'assignment', isSubmenu: true },
        { id: 'sa_ormawa_aspirasi', label: 'Aspirasi Masuk', icon: 'campaign', isSubmenu: true },
        { id: 'sa_ormawa_pengumuman', label: 'Pengumuman', icon: 'campaign', isSubmenu: true },
        { id: 'sa_ormawa_gamifikasi', label: 'Setting Gamifikasi', icon: 'emoji_events', isSubmenu: true },
        { id: 'sa_ormawa_prop_org', label: 'Proposal Organisasi', icon: 'description', isSubmenu: true },
        // LAYANAN & BANTUAN
        { id: 'sa_beasiswa', label: 'Beasiswa', icon: 'payment' },
        { id: 'sa_prestasi', label: 'Prestasi Mahasiswa', icon: 'emoji_events' },
        { id: 'sa_aspiration', label: 'Aspirasi', icon: 'chat' },
        { id: 'sa_pagu', label: 'Pagu Ormawa', icon: 'account_balance_wallet' },
        { id: 'sa_insurance', label: 'Kelola Asuransi', icon: 'health_and_safety' },
        { id: 'sa_kategori_org', label: 'Kategori Organisasi', icon: 'category' },
        // KENCANA (PKKMB)
        { id: 'sa_kencana_univ', label: 'Kencana Universitas', icon: 'account_balance' },
        { id: 'sa_kenuniv_dash', label: 'Dashboard', icon: 'dashboard', isSubmenu: true },
        { id: 'sa_kenuniv_periods', label: 'Kelola Periode', icon: 'date_range', isSubmenu: true },
        { id: 'sa_kenuniv_ann', label: 'Pengumuman', icon: 'campaign', isSubmenu: true },
        { id: 'sa_kenuniv_pre', label: 'Tahap Pra-Kencana', icon: 'flag', isSubmenu: true },
        { id: 'sa_kenuniv_univ', label: 'Tahap Universitas', icon: 'account_tree', isSubmenu: true },
        { id: 'sa_kenuniv_part', label: 'Data Peserta', icon: 'groups', isSubmenu: true },
        { id: 'sa_kenuniv_score', label: 'Rekap Nilai', icon: 'grade', isSubmenu: true },
        { id: 'sa_kenuniv_band', label: 'Banding Nilai', icon: 'gavel', isSubmenu: true },
        { id: 'sa_kenuniv_sum', label: 'Rekap Nilai Kelompok', icon: 'assessment', isSubmenu: true },
        { id: 'sa_kenuniv_rem', label: 'Remedial', icon: 'autorenew', isSubmenu: true },
        { id: 'sa_kenuniv_cert', label: 'Sertifikat', icon: 'workspace_premium', isSubmenu: true },
        { id: 'sa_kenuniv_group', label: 'Kelola Kelompok', icon: 'group_work', isSubmenu: true },
        { id: 'sa_kenuniv_mentor', label: 'Kelola Mentor', icon: 'supervisor_account', isSubmenu: true },

        { id: 'sa_kencana_fak', label: 'Kencana Fakultas', icon: 'corporate_fare' },
        { id: 'sa_kenfak_dash', label: 'Dashboard', icon: 'dashboard', isSubmenu: true },
        { id: 'sa_kenfak_ann', label: 'Pengumuman', icon: 'campaign', isSubmenu: true },
        { id: 'sa_kenfak_stages', label: 'Jadwal & Tahap', icon: 'calendar_month', isSubmenu: true },
        { id: 'sa_kenfak_part', label: 'Data Peserta', icon: 'groups', isSubmenu: true },
        { id: 'sa_kenfak_score', label: 'Rekap Nilai', icon: 'grade', isSubmenu: true },
        { id: 'sa_kenfak_band', label: 'Banding Nilai', icon: 'gavel', isSubmenu: true },
        { id: 'sa_kenfak_sum', label: 'Rekap Nilai Kelompok', icon: 'assessment', isSubmenu: true },
        { id: 'sa_kenfak_rem', label: 'Remedial', icon: 'autorenew', isSubmenu: true },
        { id: 'sa_kenfak_cert', label: 'Sertifikat', icon: 'workspace_premium', isSubmenu: true },
        { id: 'sa_kenfak_group', label: 'Kelola Kelompok', icon: 'group_work', isSubmenu: true },
        { id: 'sa_kenfak_mentor', label: 'Dewan Pembimbing', icon: 'supervisor_account', isSubmenu: true },
        // KEAMANAN & AKSES
        { id: 'sa_users', label: 'Kelola Akses (RBAC)', icon: 'security' },
        // SISTEM & INFORMASI
        { id: 'sa_docs', label: 'Dokumentasi', icon: 'menu_book' },
        { id: 'sa_announcements', label: 'Kelola Berita', icon: 'newspaper' },
        { id: 'sa_landing', label: 'Landing Page Editor', icon: 'web' },
        { id: 'sa_theme', label: 'Pengaturan Tampilan', icon: 'palette' },
        { id: 'sa_config', label: 'Pengaturan Sistem', icon: 'settings' },
        { id: 'sa_documents', label: 'Format Surat', icon: 'description' },
        { id: 'sa_auditlog', label: 'Log Aktivitas', icon: 'warning' },
      ]
    },
    {
      group: "MAHASISWA",
      items: [
        // MENU UTAMA
        { id: 'mhs_dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'mhs_profile', label: 'Data Diri', icon: 'person' },

        // LAYANAN
        { id: 'mhs_kencana', label: 'Kencana (PKKMB)', icon: 'school' },
        { id: 'mhs_kencana_hb', label: 'Handbook Kencana', icon: 'menu_book' },
        { id: 'mhs_counseling', label: 'Konseling', icon: 'psychology' },
        { id: 'mhs_health', label: 'Kesehatan', icon: 'favorite' },

        // INFO & AKTIVITAS
        { id: 'mhs_scholarship', label: 'Beasiswa', icon: 'school' },
        { id: 'mhs_achievement', label: 'Prestasi', icon: 'emoji_events' },
        { id: 'mhs_organisasi', label: 'Organisasi', icon: 'groups' },
        { id: 'mhs_voice', label: 'Aspirasi', icon: 'campaign' },

        // LAINNYA
        { id: 'mhs_notifikasi', label: 'Notifikasi', icon: 'notifications' },
      ]
    },
    {
      group: "TENAGA MEDIS (POLIKLINIK)",
      items: [
        // MENU UTAMA
        { id: 'tk_dashboard', label: 'Dashboard', icon: 'dashboard' },

        // PELAYANAN MEDIS
        { id: 'tk_booking', label: 'Booking Masuk', icon: 'calendar_month' },
        { id: 'tk_jadwal', label: 'Jadwal Praktik', icon: 'schedule' },
        { id: 'tk_pasien', label: 'Daftar Mahasiswa', icon: 'people' },
        { id: 'tk_klaim', label: 'Klaim Asuransi', icon: 'health_and_safety' },

        // LAPORAN
        { id: 'tk_bap', label: 'BAP Kesehatan', icon: 'description' },
        { id: 'tk_laporan', label: 'Laporan Klinis', icon: 'analytics' },

        // LAINNYA
        { id: 'tk_pengaturan', label: 'Pengaturan', icon: 'settings' },
      ]
    },
    {
      group: "ADMIN FAKULTAS",
      items: [
        // MENU UTAMA
        { id: 'af_dashboard', label: 'Dashboard', icon: 'dashboard' },

        // KEGIATAN & KEMAHASISWAAN
        { id: 'af_pkkmb', label: 'PKKMB (Kencana)', icon: 'school' },
        { id: 'af_ormawa', label: 'Ormawa', icon: 'groups' },
        { id: 'af_prop_ormawa', label: 'Proposal Ormawa', icon: 'assignment' },
        { id: 'af_prestasi', label: 'Prestasi', icon: 'emoji_events' },
        { id: 'af_beasiswa', label: 'Beasiswa', icon: 'payments' },
        { id: 'af_kesehatan', label: 'Kesehatan', icon: 'favorite' },

        // DATA MASTER
        { id: 'af_mahasiswa', label: 'Data Mahasiswa', icon: 'school' },
        { id: 'af_dosen', label: 'Data Dosen', icon: 'badge' },
        { id: 'af_psikolog', label: 'Data Psikolog', icon: 'psychology' },
        { id: 'af_prodi', label: 'Program Studi', icon: 'database' },
        { id: 'af_akademik', label: 'Periode Akademik', icon: 'calendar_month' },

        // ADMINISTRASI
        { id: 'af_aspirasi', label: 'Aspirasi', icon: 'chat' },
        { id: 'af_laporan', label: 'Laporan', icon: 'description' },
        { id: 'af_rbac', label: 'Role & Akses (RBAC)', icon: 'security' },
        { id: 'af_akun_prodi', label: 'Akun Prodi', icon: 'manage_accounts' },
        { id: 'af_pengaturan', label: 'Pengaturan', icon: 'settings' },
      ]
    },
    {
      group: "PENGURUS ORMAWA",
      items: [
        // MANAJEMEN UTAMA
        { id: 'or_dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'or_anggota', label: 'Anggota Aktif', icon: 'group' },
        { id: 'or_struktur', label: 'Struktur Pengurus', icon: 'account_tree' },
        { id: 'or_recruitment', label: 'Open Recruitment', icon: 'how_to_reg' },

        // OPERASIONAL & KEGIATAN
        { id: 'or_proposal', label: 'Proposal & Kegiatan', icon: 'description' },
        { id: 'or_jadwal', label: 'Jadwal Kalender', icon: 'calendar_month' },
        { id: 'or_absensi', label: 'Sistem Absensi (QR)', icon: 'qr_code' },

        // ADMINISTRASI & KEUANGAN
        { id: 'or_keuangan', label: 'Pagu & Buku Keuangan', icon: 'account_balance_wallet' },
        { id: 'or_lpj', label: 'Laporan & LPJ', icon: 'assignment' },

        // KOMUNIKASI & SISTEM
        { id: 'or_aspirasi', label: 'Aspirasi Masuk', icon: 'campaign' },
        { id: 'or_notifikasi', label: 'Pusat Notifikasi', icon: 'notifications' },
        { id: 'or_pengumuman', label: 'Siaran Pengumuman', icon: 'campaign' },
        { id: 'or_rbac', label: 'Role & Akses', icon: 'security' },
        { id: 'or_pengaturan', label: 'Pengaturan Sistem', icon: 'settings' },
      ]
    },
    {
      group: "PSIKOLOG (KONSELING)",
      items: [
        // MENU UTAMA
        { id: 'psy_dashboard', label: 'Dashboard', icon: 'dashboard' },

        // ASESMEN & KONSELING
        { id: 'psy_booking', label: 'Booking Masuk', icon: 'calendar_month' },
        { id: 'psy_jadwal', label: 'Jadwal Praktik', icon: 'schedule' },
        { id: 'psy_pasien', label: 'Daftar Pasien', icon: 'people' },
        { id: 'psy_rekam_medis', label: 'Rekam Medis', icon: 'medical_services' },

        // ANALISIS & REFERRAL
        { id: 'psy_analytics', label: 'Analytics & Trend', icon: 'analytics' },
        { id: 'psy_referral', label: 'Tindak Lanjut', icon: 'forward' },

        // LAINNYA
        { id: 'psy_notifikasi', label: 'Notifikasi', icon: 'notifications' },
        { id: 'psy_pengaturan', label: 'Pengaturan', icon: 'settings' },
      ]
    },
    {
      group: "KENCANA (ADMIN)",
      items: [
        { id: 'kenadm_dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'kenadm_periods', label: 'Kelola Periode', icon: 'date_range' },
        { id: 'kenadm_announcements', label: 'Pengumuman', icon: 'campaign' },
        { id: 'kenadm_pre_kencana', label: 'Tahap Pra-Kencana', icon: 'flag' },
        { id: 'kenadm_stages', label: 'Tahap Universitas', icon: 'account_tree' },
        { id: 'kenadm_participants', label: 'Data Peserta', icon: 'groups' },
        { id: 'kenadm_scores', label: 'Rekap Nilai', icon: 'grade' },
        { id: 'kenadm_banding', label: 'Banding Nilai', icon: 'gavel' },
        { id: 'kenadm_score_summary', label: 'Rekap Nilai Kelompok', icon: 'assessment' },
        { id: 'kenadm_remedials', label: 'Remedial', icon: 'autorenew' },
        { id: 'kenadm_certificates', label: 'Sertifikat', icon: 'workspace_premium' },
        { id: 'kenadm_groups', label: 'Kelola Kelompok', icon: 'group_work' },
        { id: 'kenadm_mentors', label: 'Kelola Mentor', icon: 'supervisor_account' },
        { id: 'kenadm_settings', label: 'Pengaturan', icon: 'settings' },
        { id: 'kenadm_cert_settings', label: 'Pengaturan Sertifikat', icon: 'workspace_premium' },
        { id: 'kenadm_notifications', label: 'Notifikasi', icon: 'notifications' },
      ]
    },
    {
      group: "KENCANA (FAKULTAS)",
      items: [
        { id: 'kenfak_dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'kenfak_announcements', label: 'Pengumuman', icon: 'campaign' },
        { id: 'kenfak_stages', label: 'Jadwal & Tahap', icon: 'calendar_month' },
        { id: 'kenfak_participants', label: 'Data Peserta', icon: 'groups' },
        { id: 'kenfak_scores', label: 'Rekap Nilai', icon: 'grade' },
        { id: 'kenfak_banding', label: 'Banding Nilai', icon: 'gavel' },
        { id: 'kenfak_score_summary', label: 'Rekap Nilai Kelompok', icon: 'assessment' },
        { id: 'kenfak_remedials', label: 'Remedial', icon: 'autorenew' },
        { id: 'kenfak_certificates', label: 'Sertifikat', icon: 'workspace_premium' },
        { id: 'kenfak_groups', label: 'Kelola Kelompok', icon: 'group_work' },
        { id: 'kenfak_mentors', label: 'Dewan Pembimbing', icon: 'supervisor_account' },
        { id: 'kenfak_settings', label: 'Pengaturan', icon: 'settings' },
        { id: 'kenfak_notifications', label: 'Notifikasi', icon: 'notifications' },
      ]
    },
    {
      group: "KENCANA (MENTOR)",
      items: [
        { id: 'kenmen_dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'kenmen_groups', label: 'Kelompok Saya', icon: 'diversity_3' },
        { id: 'kenmen_students', label: 'Mahasiswa Saya', icon: 'school' },
        { id: 'kenmen_available', label: 'Cari Mahasiswa', icon: 'person_search' },
        { id: 'kenmen_notifications', label: 'Notifikasi', icon: 'notifications' },
        { id: 'kenmen_settings', label: 'Pengaturan', icon: 'settings' },
      ]
    },

  ];

  const menuGroups = allMenuGroups.filter(group => {
    if (group.group === "GETTING STARTED") return true;

    // Super Admin dapat melihat semua kategori dokumentasi untuk keperluan editing
    if (isSuperAdmin) return true;

    if (group.group === "SUPER ADMIN" && isSuperAdmin) return true;
    if (group.group === "ADMIN FAKULTAS" && isFacultyAdmin) return true;
    if (group.group === "PENGURUS ORMAWA" && isOrmawaAdmin) return true;
    if (group.group === "PSIKOLOG (KONSELING)" && isPsychologist) return true;
    if (group.group === "KENCANA (ADMIN)" && isKencanaAdmin) return true;
    if (group.group === "KENCANA (FAKULTAS)" && isKencanaFakultas) return true;
    if (group.group === "KENCANA (MENTOR)" && isKencanaMentor) return true;
    if (group.group === "MAHASISWA" && isStudent) return true;
    if (group.group === "TENAGA MEDIS (POLIKLINIK)" && isTenagaMedis) return true;
    return false;
  });


  const [docData, setDocData] = useState({ title: '', subtitle: '', content_html: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editSubtitle, setEditSubtitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    fetchDoc();
    setIsEditing(false);
  }, [activeDocTab]);

  const fetchDoc = async () => {
    setIsLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const token = authStorage?.state?.accessToken || '';

      const res = await fetch(`${apiUrl}/admin/docs/${activeDocTab}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.status === 'success' && data.data && data.data.title) {
        setDocData(data.data);
      } else {
        setDocData({ title: '', subtitle: '', content_html: '' });
      }
    } catch (error) {
      console.error("Failed to fetch doc:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      const authStorage = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const token = authStorage?.state?.accessToken || '';

      const res = await fetch(`${apiUrl}/admin/docs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          menu_id: activeDocTab,
          title: editTitle,
          subtitle: editSubtitle,
          content_html: editContent
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setIsEditing(false);
        fetchDoc();
      } else {
        alert("Gagal menyimpan: " + data.message);
      }
    } catch (error) {
      console.error("Failed to save doc:", error);
      alert("Terjadi kesalahan sistem saat menyimpan dokumentasi.");
    } finally {
      setIsSaving(false);
    }
  };

  const startEdit = () => {
    setEditTitle(docData.title || '');
    setEditSubtitle(docData.subtitle || '');
    setEditContent(docData.content_html || '');
    setIsEditing(true);
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
    }

    if (isEditing) {
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-4">Mode Edit Dokumentasi</h1>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Judul Halaman (H1)</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Contoh: Pengantar SIAKAD" />
              </div>
              <div>
                <label className="text-sm font-bold text-slate-700 block mb-1">Sub-judul (Deskripsi Singkat)</label>
                <input type="text" className="w-full border border-slate-300 rounded-lg p-2.5 text-sm" value={editSubtitle} onChange={e => setEditSubtitle(e.target.value)} placeholder="Contoh: Dokumentasi resmi sistem..." />
              </div>
              <div className="bg-white">
                <label className="text-sm font-bold text-slate-700 block mb-1">Konten Panduan</label>
                <ReactQuill theme="snow" value={editContent} onChange={setEditContent} className="bg-white" />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={isSaving} className="bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:bg-primary/90 flex items-center">
              <span className="material-symbols-outlined mr-2 text-[18px]">save</span>
              {isSaving ? 'Menyimpan...' : 'Simpan Panduan'}
            </button>
            <button onClick={() => setIsEditing(false)} disabled={isSaving} className="bg-slate-200 text-slate-700 px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-slate-300">
              Batal
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative group">
        <DocSection title={docData.title || 'Dokumentasi Belum Tersedia'} subtitle={docData.subtitle || 'Klik tombol edit di pojok kanan atas untuk mulai menulis panduan.'}>
          <div className="absolute top-0 right-0 print:hidden">
            <button onClick={startEdit} className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-4 py-2 rounded-lg text-sm font-bold flex items-center shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="material-symbols-outlined mr-1.5 text-[18px]">edit_document</span>
              Edit Halaman Ini
            </button>
          </div>
          {docData.content_html ? (
            <div dangerouslySetInnerHTML={{ __html: docData.content_html }} className="prose prose-slate max-w-none" />
          ) : (
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-300 rounded-2xl">
              <span className="material-symbols-outlined text-4xl text-slate-300 mb-3 block">menu_book</span>
              <h3 className="text-slate-500 font-bold">Halaman Panduan Kosong</h3>
              <p className="text-sm text-slate-400">Silakan isi konten untuk tab ini.</p>
            </div>
          )}
        </DocSection>
      </div>
    );
  };

  return (
    <PageContent className="p-0 sm:p-0 max-w-none h-[calc(100vh-4rem)] flex flex-col md:flex-row bg-white overflow-hidden">
      {/* Sidebar Documentation */}
      <div className="w-full md:w-72 shrink-0 border-r border-slate-200 bg-slate-50/50 flex flex-col h-full overflow-y-auto hidden md:flex">
        <div className="p-6 pb-2">
          <h2 className="text-lg font-black text-slate-900 font-headline">SIAKAD Docs</h2>
          <p className="text-xs text-slate-500 mt-1">Panduan lengkap operasional (v13.x)</p>
        </div>
        <div className="flex-1 px-4 py-4 space-y-8">
          {menuGroups.map((group, idx) => (
            <div key={idx}>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-3">
                {group.group}
              </h3>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeDocTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveDocTab(item.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg flex items-center gap-3 transition-all cursor-pointer text-xs font-semibold group",
                        item.isSubmenu ? "ml-5 border-l-2 border-slate-200 pl-4 w-[calc(100%-1.25rem)]" : "",
                        isActive
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "text-slate-600 hover:bg-slate-200/50 hover:text-slate-900"
                      )}
                    >
                      <span className={cn(
                        "material-symbols-outlined shrink-0 transition-transform group-hover:scale-110",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-primary"
                      )} style={{ fontSize: '16px' }}>
                        {item.icon}
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 md:p-12 lg:p-16 scroll-smooth bg-white">
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500 pb-20">
          {renderContent()}
        </div>
      </div>
    </PageContent>
  );
}

// Komponen Pembungkus Seksi Dokumen
function DocSection({ title, subtitle, children }) {
  return (
    <div className="space-y-6">
      <div className="pr-40">
        <h1 className="text-3xl md:text-4xl font-black text-slate-900 font-headline tracking-tight mb-3">{title}</h1>
        <p className="text-slate-500 text-sm md:text-base leading-relaxed max-w-2xl">{subtitle}</p>
      </div>
      <hr className="border-slate-200" />

      <div className="prose prose-slate max-w-none prose-headings:font-headline prose-headings:font-bold prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-p:text-sm prose-p:leading-loose prose-li:text-sm prose-li:leading-relaxed prose-a:text-primary prose-code:text-primary prose-code:bg-slate-50 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none">
        {children}
      </div>
    </div>
  )
}
