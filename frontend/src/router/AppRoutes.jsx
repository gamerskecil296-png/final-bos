// ============================================================
// UNIFIED APP ROUTES — Module-Based Architecture
// All routes under /app/* with permission-based access.
// Pages imported from MODULE folders — clean, no role references.
// ============================================================

import React from 'react';
import { Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import { P } from '@/config/permissions';

// ─── Lazy-loaded from MODULE folders ─────────────────────────

// Core
const AdminDashboard = React.lazy(() => import('@/pages/modules/core/AdminDashboard'));
const AdminProfile = React.lazy(() => import('@/pages/modules/core/Profile'));
const Laporan = React.lazy(() => import('@/pages/modules/core/Laporan'));

// Akademik
const KelolaFakultas = React.lazy(() => import('@/pages/modules/akademik/KelolaFakultas'));
const ProdiPage = React.lazy(() => import('@/pages/modules/akademik/ProdiPage'));
const ProdiUsers = React.lazy(() => import('@/pages/modules/akademik/ProdiUsers'));
const LecturerDirectory = React.lazy(() => import('@/pages/modules/akademik/LecturerDirectory'));
const StudentDirectory = React.lazy(() => import('@/pages/modules/akademik/StudentDirectory'));
const PMBDirectory = React.lazy(() => import('@/pages/modules/akademik/PMBDirectory'));
const TahunAkademik = React.lazy(() => import('@/pages/modules/akademik/TahunAkademik'));

// Kemahasiswaan
const KelolaBeasiswa = React.lazy(() => import('@/pages/modules/kemahasiswaan/KelolaBeasiswa'));
const KelolaPrestasi = React.lazy(() => import('@/pages/modules/kemahasiswaan/KelolaPrestasi'));
const AspirationControl = React.lazy(() => import('@/pages/modules/kemahasiswaan/AspirationControl'));
const AspirationDetail = React.lazy(() => import('@/pages/modules/kemahasiswaan/AspirationDetail'));
const InsuranceManagement = React.lazy(() => import('@/pages/modules/kemahasiswaan/InsuranceManagement'));

// Ormawa
const KelolaOrganisasi = React.lazy(() => import('@/pages/modules/ormawa/KelolaOrganisasi'));
const KategoriOrmawaPage = React.lazy(() => import('@/pages/modules/ormawa/KategoriOrmawa'));
const GamifikasiOrmawa = React.lazy(() => import('@/pages/modules/ormawa/GamifikasiOrmawa'));
const FinancialSettings = React.lazy(() => import('@/pages/modules/ormawa/FinancialSettings'));
const OrmawaDashboard = React.lazy(() => import('@/pages/modules/ormawa/OrmawaDashboard'));
const AnggotaManagement = React.lazy(() => import('@/pages/modules/ormawa/AnggotaManagement'));
const StaffManagement = React.lazy(() => import('@/pages/modules/ormawa/StaffManagement'));
const StrukturOrganisasi = React.lazy(() => import('@/pages/modules/ormawa/StrukturOrganisasi'));
const Recruitment = React.lazy(() => import('@/pages/modules/ormawa/Recruitment'));
const ProposalManagement = React.lazy(() => import('@/pages/modules/ormawa/ProposalManagement'));
const JadwalKegiatan = React.lazy(() => import('@/pages/modules/ormawa/JadwalKegiatan'));
const AbsensiKegiatan = React.lazy(() => import('@/pages/modules/ormawa/AbsensiKegiatan'));
const KeuanganKas = React.lazy(() => import('@/pages/modules/ormawa/KeuanganKas'));
const DetailMutasi = React.lazy(() => import('@/pages/modules/ormawa/DetailMutasi'));
const LpjManagement = React.lazy(() => import('@/pages/modules/ormawa/LpjManagement'));
const AspirationManagement = React.lazy(() => import('@/pages/modules/ormawa/AspirationManagement'));
const Pengumuman = React.lazy(() => import('@/pages/modules/ormawa/Pengumuman'));
const RoleBasedAccess = React.lazy(() => import('@/pages/modules/ormawa/RoleBasedAccess'));
const OrmawaSettings = React.lazy(() => import('@/pages/modules/ormawa/OrmawaSettings'));

// Psikologi
const PsychologistDashboard = React.lazy(() => import('@/pages/modules/psikologi/PsychologistDashboard'));
const AdminPsychologistList = React.lazy(() => import('@/pages/modules/psikologi/AdminPsychologistList'));
const BookingManagement = React.lazy(() => import('@/pages/modules/psikologi/BookingManagement'));
const BookingDetail = React.lazy(() => import('@/pages/modules/psikologi/BookingDetail'));
const ScheduleManagement = React.lazy(() => import('@/pages/modules/psikologi/ScheduleManagement'));
const PatientList = React.lazy(() => import('@/pages/modules/psikologi/PatientList'));
const PatientMedicalRecord = React.lazy(() => import('@/pages/modules/psikologi/PatientMedicalRecord'));
const MedicalRecordsPage = React.lazy(() => import('@/pages/modules/psikologi/MedicalRecords'));
const AssessmentManagement = React.lazy(() => import('@/pages/modules/psikologi/AssessmentManagement'));
const AnalyticsTrends = React.lazy(() => import('@/pages/modules/psikologi/AnalyticsTrends'));
const ReferralManagement = React.lazy(() => import('@/pages/modules/psikologi/ReferralManagement'));
const PsychologistSettings = React.lazy(() => import('@/pages/modules/psikologi/PsychologistSettings'));

// Kesehatan
const TenagaKesehatanDashboard = React.lazy(() => import('@/pages/modules/kesehatan/TenagaKesehatanDashboard'));
const AdminTenagaKesehatanList = React.lazy(() => import('@/pages/modules/kesehatan/AdminTenagaKesehatanList'));
const TenagaKesehatanBooking = React.lazy(() => import('@/pages/modules/kesehatan/BookingManagement'));
const TenagaKesehatanSchedule = React.lazy(() => import('@/pages/modules/kesehatan/ScheduleManagement'));
const TenagaKesehatanPatientList = React.lazy(() => import('@/pages/modules/kesehatan/PatientList'));
const TenagaKesehatanPatientRecord = React.lazy(() => import('@/pages/modules/kesehatan/PatientMedicalRecord'));
const AdminTenagaKesehatanMedicalRecords = React.lazy(() => import('@/pages/modules/kesehatan/AdminTenagaKesehatanMedicalRecords'));
const InsuranceReview = React.lazy(() => import('@/pages/modules/kesehatan/InsuranceReview'));
const TenagaKesehatanReferral = React.lazy(() => import('@/pages/modules/kesehatan/ReferralManagement'));
const BAPManagement = React.lazy(() => import('@/pages/modules/kesehatan/BAPManagement'));
const ReportsPage = React.lazy(() => import('@/pages/modules/kesehatan/ReportsPage'));
const TenagaKesehatanSettings = React.lazy(() => import('@/pages/modules/kesehatan/Settings'));

// Kencana
const KencanaAdminDashboard = React.lazy(() => import('@/pages/modules/kencana/admin/Dashboard'));
const KencanaAdminPeriods = React.lazy(() => import('@/pages/modules/kencana/admin/Periods'));
const KencanaAdminAnnouncements = React.lazy(() => import('@/pages/modules/kencana/admin/Announcements'));
const KencanaAdminStages = React.lazy(() => import('@/pages/modules/kencana/admin/Stages'));
const QuizBuilder = React.lazy(() => import('@/pages/modules/kencana/admin/QuizBuilder'));
const KencanaAdminParticipants = React.lazy(() => import('@/pages/modules/kencana/admin/Participants'));
const KencanaAdminScores = React.lazy(() => import('@/pages/modules/kencana/admin/Scores'));
const KencanaAdminSummary = React.lazy(() => import('@/pages/modules/kencana/admin/ScoreSummary'));
const KencanaAdminRemedials = React.lazy(() => import('@/pages/modules/kencana/admin/Remedials'));
const KencanaAdminCertificates = React.lazy(() => import('@/pages/modules/kencana/admin/Certificates'));
const KencanaAdminBanding = React.lazy(() => import('@/pages/modules/kencana/admin/Banding'));
const KencanaAdminGroups = React.lazy(() => import('@/pages/modules/kencana/admin/Groups'));
const KencanaAdminMentors = React.lazy(() => import('@/pages/modules/kencana/admin/Mentors'));
const KencanaAdminSettings = React.lazy(() => import('@/pages/modules/kencana/admin/Settings'));
const KencanaFakultasStages = React.lazy(() => import('@/pages/modules/kencana/fakultas/Stages'));
const KencanaMentorDashboard = React.lazy(() => import('@/pages/modules/kencana/mentor/Dashboard'));
const KencanaMentorStudents = React.lazy(() => import('@/pages/modules/kencana/mentor/Students'));
const KencanaMentorAvailable = React.lazy(() => import('@/pages/modules/kencana/mentor/AvailableStudents'));
const KencanaMentorStudentDetail = React.lazy(() => import('@/pages/modules/kencana/mentor/StudentDetail'));
const KencanaMentorSettings = React.lazy(() => import('@/pages/modules/kencana/mentor/Settings'));
const KencanaMentorGroups = React.lazy(() => import('@/pages/modules/kencana/mentor/Groups'));
const KencanaMentorGroupDetail = React.lazy(() => import('@/pages/modules/kencana/mentor/GroupDetail'));

// Student Portal
const BkuDashboard = React.lazy(() => import('@/pages/modules/student/BkuDashboard'));
const ProfilePage = React.lazy(() => import('@/pages/modules/student/ProfilePage'));
const KencanaPage = React.lazy(() => import('@/pages/modules/student/KencanaPage'));
const KencanaKuisPage = React.lazy(() => import('@/pages/modules/student/KencanaKuisPage'));
const CounselingPage = React.lazy(() => import('@/pages/modules/student/CounselingPage'));
const CounselingHistoryPage = React.lazy(() => import('@/pages/modules/student/CounselingHistoryPage'));
const HealthScreeningPage = React.lazy(() => import('@/pages/modules/student/HealthScreeningPage'));
const SelfScreeningPage = React.lazy(() => import('@/pages/modules/student/SelfScreeningPage'));
const InsurancePage = React.lazy(() => import('@/pages/modules/student/InsurancePage'));
const ScholarshipPage = React.lazy(() => import('@/pages/modules/student/ScholarshipPage'));
const ScholarshipDetailPage = React.lazy(() => import('@/pages/modules/student/ScholarshipDetailPage'));
const AchievementPage = React.lazy(() => import('@/pages/modules/student/AchievementPage'));
const OrganisasiPage = React.lazy(() => import('@/pages/modules/student/OrganisasiPage'));
const StudentVoicePage = React.lazy(() => import('@/pages/modules/student/StudentVoicePage'));
const StudentVoiceDetailPage = React.lazy(() => import('@/pages/modules/student/StudentVoiceDetailPage'));
const NotificationPage = React.lazy(() => import('@/pages/modules/student/NotificationPage'));
const PresensiPage = React.lazy(() => import('@/pages/modules/student/PresensiPage'));
const KencanaTimelinePage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaTimelinePage'));
const KencanaStagePage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaStagePage'));
const KencanaSessionPage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaSessionPage'));
const KencanaHandbookPage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaHandbookPage'));
const KencanaMentorInvitationsPage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaMentorInvitationsPage'));
const KencanaAttendancePage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaAttendancePage'));
const KencanaAssignmentPage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaAssignmentPage'));
const KencanaScorePage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaScorePage'));
const KencanaRemedialPage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaRemedialPage'));
const KencanaCertificatePage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaCertificatePage'));
const KencanaBandingPage = React.lazy(() => import('@/pages/modules/student/kencana/KencanaBandingPage'));

// RBAC & System
const UserManagement = React.lazy(() => import('@/pages/modules/rbac/UserManagement'));
const RoleManagement = React.lazy(() => import('@/pages/modules/rbac/RoleManagement'));
const ContentManagement = React.lazy(() => import('@/pages/modules/sistem/ContentManagement'));
const ContentEditor = React.lazy(() => import('@/pages/modules/sistem/ContentEditor'));
const LandingPageEditor = React.lazy(() => import('@/pages/modules/sistem/LandingPageEditor'));
const ThemeCustomizer = React.lazy(() => import('@/pages/modules/sistem/theme').then(m => ({ default: m.ThemeCustomizer })));
const DocumentSettings = React.lazy(() => import('@/pages/modules/sistem/DocumentSettings'));
const AcademicPortal = React.lazy(() => import('@/pages/modules/sistem/AcademicPortal'));
const Documentation = React.lazy(() => import('@/pages/modules/sistem/Documentation'));
const AuditLog = React.lazy(() => import('@/pages/modules/sistem/AuditLog'));


// ─── Route helper ────────────────────────────────────────────
const Guarded = ({ perm, children }) => (
  <ProtectedRoute requiredPermissions={perm ? [perm] : []}>{children}</ProtectedRoute>
);


/**
 * Returns all <Route> elements for the /app/* path tree.
 * Used inside <Route path="/app" element={<DynamicLayout />}> in App.jsx.
 */
export default function AppRoutes() {
  return (
    <>
      {/* ─── Dashboard ─── */}
      <Route index element={<Navigate to="dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />

      {/* ─── Student Portal ─── */}
      <Route path="student/dashboard" element={<BkuDashboard />} />
      <Route path="student/profile" element={<ProfilePage />} />
      <Route path="student/kencana" element={<KencanaPage />} />
      <Route path="student/kencana/kuis/:kuisId" element={<KencanaKuisPage />} />
      <Route path="student/kencana/timeline" element={<KencanaTimelinePage />} />
      <Route path="student/kencana/stage/:stageId" element={<KencanaStagePage />} />
      <Route path="student/kencana/session/:sessionId" element={<KencanaSessionPage />} />
      <Route path="student/kencana/handbook" element={<KencanaHandbookPage />} />
      <Route path="student/kencana/mentors" element={<KencanaMentorInvitationsPage />} />
      <Route path="student/kencana/invitations" element={<KencanaMentorInvitationsPage />} />
      <Route path="student/kencana/attendance" element={<KencanaAttendancePage />} />
      <Route path="student/kencana/assignment/:assignmentId" element={<KencanaAssignmentPage />} />
      <Route path="student/kencana/assignments/:assignmentId" element={<KencanaAssignmentPage />} />
      <Route path="student/kencana/score" element={<KencanaScorePage />} />
      <Route path="student/kencana/scores" element={<KencanaScorePage />} />
      <Route path="student/kencana/banding" element={<KencanaBandingPage />} />
      <Route path="student/kencana/remedial" element={<KencanaRemedialPage />} />
      <Route path="student/kencana/certificate" element={<KencanaCertificatePage />} />
      <Route path="student/counseling" element={<CounselingPage />} />
      <Route path="student/counseling/history" element={<CounselingHistoryPage />} />
      <Route path="student/health" element={<HealthScreeningPage />} />
      <Route path="student/health/self-screening" element={<SelfScreeningPage />} />
      <Route path="student/insurance" element={<InsurancePage />} />
      <Route path="student/scholarship" element={<ScholarshipPage />} />
      <Route path="student/scholarship/pengajuan/:id" element={<ScholarshipDetailPage />} />
      <Route path="student/achievement" element={<AchievementPage />} />
      <Route path="student/organisasi" element={<OrganisasiPage />} />
      <Route path="student/voice" element={<StudentVoicePage />} />
      <Route path="student/voice/tiket/:id" element={<StudentVoiceDetailPage />} />
      <Route path="student/presensi" element={<PresensiPage />} />

      {/* ─── Akademik ─── */}
      <Route path="akademik/fakultas" element={<Guarded perm={P.FAKULTAS_VIEW}><KelolaFakultas /></Guarded>} />
      <Route path="akademik/prodi" element={<Guarded perm={P.PRODI_VIEW}><ProdiPage /></Guarded>} />
      <Route path="akademik/prodi-users" element={<Guarded perm={P.PRODI_USERS_VIEW}><ProdiUsers /></Guarded>} />
      <Route path="akademik/dosen" element={<Guarded perm={P.DOSEN_VIEW}><LecturerDirectory /></Guarded>} />
      <Route path="akademik/mahasiswa" element={<Guarded perm={P.MAHASISWA_VIEW}><StudentDirectory /></Guarded>} />
      <Route path="akademik/pmb" element={<Guarded perm={P.PMB_VIEW}><PMBDirectory /></Guarded>} />
      <Route path="akademik/periode" element={<Guarded perm={P.PERIODE_VIEW}><TahunAkademik /></Guarded>} />

      {/* ─── Kemahasiswaan ─── */}
      <Route path="kemahasiswaan/beasiswa" element={<Guarded perm={P.BEASISWA_VIEW}><KelolaBeasiswa /></Guarded>} />
      <Route path="kemahasiswaan/prestasi" element={<Guarded perm={P.PRESTASI_VIEW}><KelolaPrestasi /></Guarded>} />
      <Route path="kemahasiswaan/aspirasi" element={<Guarded perm={P.ASPIRASI_VIEW}><AspirationControl /></Guarded>} />
      <Route path="kemahasiswaan/aspirasi/:id" element={<Guarded perm={P.ASPIRASI_VIEW}><AspirationDetail /></Guarded>} />
      <Route path="kemahasiswaan/asuransi" element={<Guarded perm={P.ASURANSI_VIEW}><InsuranceManagement /></Guarded>} />

      {/* ─── Ormawa ─── */}
      <Route path="ormawa/organisasi" element={<Guarded perm={P.ORMAWA_VIEW}><KelolaOrganisasi /></Guarded>} />
      <Route path="ormawa/kategori" element={<Guarded perm={P.ORMAWA_KATEGORI_VIEW}><KategoriOrmawaPage /></Guarded>} />
      <Route path="ormawa/gamifikasi" element={<Guarded perm={P.ORMAWA_GAMIFIKASI_VIEW}><GamifikasiOrmawa /></Guarded>} />
      <Route path="ormawa/pagu" element={<Guarded perm={P.ORMAWA_PAGU_VIEW}><FinancialSettings /></Guarded>} />
      <Route path="ormawa/dashboard" element={<Guarded perm={P.ORMAWA_DASHBOARD_VIEW}><OrmawaDashboard /></Guarded>} />
      <Route path="ormawa/anggota" element={<Guarded perm={P.ORMAWA_MEMBERS_VIEW}><AnggotaManagement /></Guarded>} />
      <Route path="ormawa/staff" element={<Guarded perm={P.ORMAWA_MEMBERS_VIEW}><StaffManagement /></Guarded>} />
      <Route path="ormawa/struktur" element={<Guarded perm={P.ORMAWA_STRUCTURE_VIEW}><StrukturOrganisasi /></Guarded>} />
      <Route path="ormawa/recruitment" element={<Guarded perm={P.ORMAWA_RECRUITMENT_VIEW}><Recruitment /></Guarded>} />
      <Route path="ormawa/proposal" element={<Guarded perm={P.ORMAWA_PROPOSAL_VIEW}><ProposalManagement /></Guarded>} />
      <Route path="ormawa/jadwal" element={<Guarded perm={P.ORMAWA_EVENT_VIEW}><JadwalKegiatan /></Guarded>} />
      <Route path="ormawa/absensi" element={<Guarded perm={P.ORMAWA_ATTENDANCE_VIEW}><AbsensiKegiatan /></Guarded>} />
      <Route path="ormawa/keuangan" element={<Guarded perm={P.ORMAWA_FINANCE_VIEW}><KeuanganKas /></Guarded>} />
      <Route path="ormawa/keuangan/mutasi" element={<Guarded perm={P.ORMAWA_FINANCE_VIEW}><DetailMutasi /></Guarded>} />
      <Route path="ormawa/lpj" element={<Guarded perm={P.ORMAWA_LPJ_VIEW}><LpjManagement /></Guarded>} />
      <Route path="ormawa/aspirasi" element={<Guarded perm={P.ORMAWA_ASPIRATION_VIEW}><AspirationManagement /></Guarded>} />
      <Route path="ormawa/pengumuman" element={<Guarded perm={P.ORMAWA_ANNOUNCEMENT_VIEW}><Pengumuman /></Guarded>} />
      <Route path="ormawa/rbac" element={<Guarded perm={P.ORMAWA_RBAC_VIEW}><RoleBasedAccess /></Guarded>} />
      <Route path="ormawa/pengaturan" element={<Guarded perm={P.ORMAWA_SETTINGS_VIEW}><OrmawaSettings /></Guarded>} />

      {/* ─── Psikologi ─── */}
      <Route path="psikologi/dashboard" element={<Guarded perm={P.PSIKOLOGI_DASHBOARD_VIEW}><PsychologistDashboard /></Guarded>} />
      <Route path="psikologi/list" element={<Guarded perm={P.PSIKOLOGI_VIEW}><AdminPsychologistList /></Guarded>} />
      <Route path="psikologi/bookings" element={<Guarded perm={P.PSIKOLOGI_BOOKING_VIEW}><BookingManagement /></Guarded>} />
      <Route path="psikologi/bookings/:id" element={<Guarded perm={P.PSIKOLOGI_BOOKING_VIEW}><BookingDetail /></Guarded>} />
      <Route path="psikologi/schedule" element={<Guarded perm={P.PSIKOLOGI_SCHEDULE_VIEW}><ScheduleManagement /></Guarded>} />
      <Route path="psikologi/patients" element={<Guarded perm={P.PSIKOLOGI_PATIENT_VIEW}><PatientList /></Guarded>} />
      <Route path="psikologi/patients/:id/medical-record" element={<Guarded perm={P.PSIKOLOGI_PATIENT_VIEW}><PatientMedicalRecord /></Guarded>} />
      <Route path="psikologi/medical-records" element={<Guarded perm={P.PSIKOLOGI_RECORD_VIEW}><MedicalRecordsPage /></Guarded>} />
      <Route path="psikologi/assessment" element={<Guarded perm={P.PSIKOLOGI_ASSESSMENT_VIEW}><AssessmentManagement /></Guarded>} />
      <Route path="psikologi/analytics" element={<Guarded perm={P.PSIKOLOGI_REPORT_VIEW}><AnalyticsTrends /></Guarded>} />
      <Route path="psikologi/referrals" element={<Guarded perm={P.PSIKOLOGI_REFERRAL_VIEW}><ReferralManagement /></Guarded>} />
      <Route path="psikologi/settings" element={<Guarded perm={P.PSIKOLOGI_SETTINGS_VIEW}><PsychologistSettings /></Guarded>} />

      {/* ─── Kesehatan ─── */}
      <Route path="kesehatan/dashboard" element={<Guarded perm={P.KESEHATAN_DASHBOARD_VIEW}><TenagaKesehatanDashboard /></Guarded>} />
      <Route path="kesehatan/notifications" element={<Guarded perm={P.KESEHATAN_DASHBOARD_VIEW}><NotificationPage /></Guarded>} />
      <Route path="kesehatan/list" element={<Guarded perm={P.KESEHATAN_VIEW}><AdminTenagaKesehatanList /></Guarded>} />
      <Route path="kesehatan/bookings" element={<Guarded perm={P.KESEHATAN_BOOKING_VIEW}><TenagaKesehatanBooking /></Guarded>} />
      <Route path="kesehatan/schedule" element={<Guarded perm={P.KESEHATAN_SCHEDULE_VIEW}><TenagaKesehatanSchedule /></Guarded>} />
      <Route path="kesehatan/patients" element={<Guarded perm={P.KESEHATAN_PATIENT_VIEW}><TenagaKesehatanPatientList /></Guarded>} />
      <Route path="kesehatan/patients/:id/medical-record" element={<Guarded perm={P.KESEHATAN_PATIENT_VIEW}><TenagaKesehatanPatientRecord /></Guarded>} />
      <Route path="kesehatan/medical-records" element={<Guarded perm={P.KESEHATAN_RECORD_VIEW}><AdminTenagaKesehatanMedicalRecords /></Guarded>} />
      <Route path="kesehatan/claims" element={<Guarded perm={P.KESEHATAN_CLAIM_VIEW}><InsuranceReview /></Guarded>} />
      <Route path="kesehatan/referrals" element={<Guarded perm={P.KESEHATAN_REFERRAL_VIEW}><TenagaKesehatanReferral /></Guarded>} />
      <Route path="kesehatan/bap" element={<Guarded perm={P.KESEHATAN_BAP_VIEW}><BAPManagement /></Guarded>} />
      <Route path="kesehatan/reports" element={<Guarded perm={P.KESEHATAN_REPORT_VIEW}><ReportsPage /></Guarded>} />
      <Route path="kesehatan/settings" element={<Guarded perm={P.KESEHATAN_SETTINGS_VIEW}><TenagaKesehatanSettings /></Guarded>} />

      {/* ─── Kencana / PKKMB ─── */}
      <Route path="kencana/dashboard" element={<Guarded perm={P.KENCANA_DASHBOARD_VIEW}><KencanaAdminDashboard /></Guarded>} />
      <Route path="kencana/periods" element={<Guarded perm={P.KENCANA_PERIOD_VIEW}><KencanaAdminPeriods /></Guarded>} />
      <Route path="kencana/announcements" element={<Guarded perm={P.KENCANA_ANNOUNCEMENT_VIEW}><KencanaAdminAnnouncements /></Guarded>} />
      <Route path="kencana/pre-kencana" element={<Guarded perm={P.KENCANA_PRE_VIEW}><KencanaAdminStages phaseType="pra_kencana" /></Guarded>} />
      <Route path="kencana/stages" element={<Guarded perm={P.KENCANA_UNIV_VIEW}><KencanaAdminStages /></Guarded>} />
      <Route path="kencana/faculty-stages" element={<Guarded perm={P.KENCANA_FACULTY_VIEW}><KencanaFakultasStages /></Guarded>} />
      <Route path="kencana/faculty-stages/:facultyId" element={<Guarded perm={P.KENCANA_FACULTY_VIEW}><KencanaFakultasStages /></Guarded>} />
      <Route path="kencana/quiz/:id/builder" element={<Guarded perm={P.KENCANA_QUIZ_MANAGE}><QuizBuilder /></Guarded>} />
      <Route path="kencana/participants" element={<Guarded perm={P.KENCANA_PARTICIPANT_VIEW}><KencanaAdminParticipants /></Guarded>} />
      <Route path="kencana/scores" element={<Guarded perm={P.KENCANA_SCORE_VIEW}><KencanaAdminScores /></Guarded>} />
      <Route path="kencana/banding" element={<Guarded perm={P.KENCANA_BANDING_VIEW}><KencanaAdminBanding /></Guarded>} />
      <Route path="kencana/score-summary" element={<Guarded perm={P.KENCANA_SUMMARY_VIEW}><KencanaAdminSummary /></Guarded>} />
      <Route path="kencana/remedials" element={<Guarded perm={P.KENCANA_REMEDIAL_VIEW}><KencanaAdminRemedials /></Guarded>} />
      <Route path="kencana/certificates" element={<Guarded perm={P.KENCANA_CERTIFICATE_VIEW}><KencanaAdminCertificates /></Guarded>} />
      <Route path="kencana/groups" element={<Guarded perm={P.KENCANA_GROUP_VIEW}><KencanaAdminGroups /></Guarded>} />
      <Route path="kencana/mentors" element={<Guarded perm={P.KENCANA_MENTOR_VIEW}><KencanaAdminMentors /></Guarded>} />
      <Route path="kencana/settings" element={<Guarded perm={P.KENCANA_SETTINGS_VIEW}><KencanaAdminSettings /></Guarded>} />

      {/* Kencana Mentor */}
      <Route path="kencana/mentor" element={<Guarded perm={P.KENCANA_MENTOR_DASHBOARD}><KencanaMentorDashboard /></Guarded>} />
      <Route path="kencana/mentor/students" element={<Guarded perm={P.KENCANA_MENTOR_STUDENTS}><KencanaMentorStudents /></Guarded>} />
      <Route path="kencana/mentor/students/:studentId" element={<Guarded perm={P.KENCANA_MENTOR_STUDENTS}><KencanaMentorStudentDetail /></Guarded>} />
      <Route path="kencana/mentor/available" element={<Guarded perm={P.KENCANA_MENTOR_STUDENTS}><KencanaMentorAvailable /></Guarded>} />
      <Route path="kencana/mentor/groups" element={<Guarded perm={P.KENCANA_MENTOR_STUDENTS}><KencanaMentorGroups /></Guarded>} />
      <Route path="kencana/mentor/groups/:id" element={<Guarded perm={P.KENCANA_MENTOR_STUDENTS}><KencanaMentorGroupDetail /></Guarded>} />
      <Route path="kencana/mentor/settings" element={<Guarded perm={P.KENCANA_MENTOR_SETTINGS}><KencanaMentorSettings /></Guarded>} />

      {/* ─── Laporan ─── */}
      <Route path="laporan/fakultas" element={<Guarded perm={P.REPORT_VIEW}><Laporan /></Guarded>} />

      {/* ─── RBAC ─── */}
      <Route path="rbac/roles" element={<Guarded perm={P.RBAC_ROLES_VIEW}><RoleManagement /></Guarded>} />
      <Route path="rbac/users" element={<Guarded perm={P.RBAC_USERS_VIEW}><UserManagement /></Guarded>} />

      {/* ─── Sistem / CMS ─── */}
      <Route path="sistem/berita" element={<Guarded perm={P.NEWS_VIEW}><ContentManagement /></Guarded>} />
      <Route path="sistem/berita/create" element={<Guarded perm={P.NEWS_MANAGE}><ContentEditor /></Guarded>} />
      <Route path="sistem/berita/edit/:id" element={<Guarded perm={P.NEWS_MANAGE}><ContentEditor /></Guarded>} />
      <Route path="sistem/landing" element={<Guarded perm={P.LANDING_VIEW}><LandingPageEditor /></Guarded>} />
      <Route path="sistem/tema" element={<Guarded perm={P.THEME_VIEW}><ThemeCustomizer /></Guarded>} />
      <Route path="sistem/dokumen" element={<Guarded perm={P.DOCUMENT_VIEW}><DocumentSettings /></Guarded>} />
      <Route path="sistem/pengaturan" element={<Guarded perm={P.SETTINGS_VIEW}><AcademicPortal /></Guarded>} />
      <Route path="sistem/docs" element={<Guarded perm={P.DOCS_VIEW}><Documentation /></Guarded>} />
      <Route path="sistem/audit" element={<Guarded perm={P.AUDIT_VIEW}><AuditLog /></Guarded>} />

      {/* ─── Core / Shared ─── */}
      <Route path="notifications" element={<NotificationPage />} />
      <Route path="profile" element={<AdminProfile />} />
    </>
  );
}
