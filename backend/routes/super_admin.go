package routes

import (
	"siakad-backend/controllers"
	fakultas "siakad-backend/controllers/fakultas"
	ormawa "siakad-backend/controllers/ormawa"
	"siakad-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupSuperAdminRoutes(r fiber.Router) {
	m := middleware.RequirePermission
	mAny := middleware.RequireAnyPermission

	// User & RBAC Management
	r.Get("/stats", mAny("admin.dashboard.view", "faculty.dashboard.view"), controllers.GetDashboardStats)
	r.Get("/system-health", m("admin.dashboard.view"), controllers.GetSystemHealth)
	r.Get("/dashboard-analytics", m("admin.dashboard.view"), controllers.GetDashboardAnalytics)
	
	users := r.Group("/users", m("rbac.users.view"))
	users.Get("/", controllers.GetUsers)
	users.Post("/", m("rbac.users.create"), controllers.CreateUser)
	users.Put("/role", m("rbac.users.update"), controllers.UpdateUserRole)
	users.Patch("/:id", m("rbac.users.update"), controllers.UpdateUser)
	users.Delete("/:id", m("rbac.users.delete"), controllers.DeleteUser)

	rbac := r.Group("/rbac", m("rbac.roles.view"))
	rbac.Get("/roles", controllers.GetRBACRoles)
	rbac.Post("/roles", mAny("rbac.roles.manage", "rbac.roles.create"), controllers.CreateRBACRole)
	rbac.Put("/roles/:id", mAny("rbac.roles.manage", "rbac.roles.update"), controllers.UpdateRBACRole)
	rbac.Delete("/roles/:id", mAny("rbac.roles.manage", "rbac.roles.delete"), controllers.DeleteRBACRole)
	
	r.Get("/audit-logs", m("admin.audit.view"), controllers.GetAuditLogs)
	r.Get("/audit-logs/export", m("admin.audit.view"), controllers.ExportAuditLogsCSV)
	r.Get("/profile", controllers.GetAdminProfile)
	r.Put("/profile", controllers.UpdateAdminProfile)

	// Global Proposal Pipeline
	proposals := r.Group("/proposals", m("proposal.univ.view"))
	proposals.Get("/", controllers.GetGlobalProposals)
	proposals.Put("/:id/approve", m("proposal.univ.approve"), controllers.ApproveProposalUniv)
	proposals.Put("/:id/reject", m("proposal.univ.approve"), controllers.RejectProposalUniv)

	// Master Data
	r.Get("/academic-periods", mAny("academic_periods.view", "admin.dashboard.view", "faculty.dashboard.view"), controllers.GetAllAcademicPeriods)
	
	fakGrp := r.Group("/fakultas", mAny("faculty.view", "admin.dashboard.view"))
	fakGrp.Get("/", controllers.GetAllFakultas)
	fakGrp.Post("/", m("faculty.manage"), controllers.CreateFakultas)
	fakGrp.Put("/:id", m("faculty.manage"), controllers.UpdateFakultas)
	fakGrp.Delete("/reset", m("faculty.manage"), controllers.ResetFakultas)
	fakGrp.Delete("/:id", m("faculty.manage"), controllers.DeleteFakultas)

	ormawaGrp := r.Group("/ormawa", mAny("ormawa.view", "admin.dashboard.view"))
	ormawaGrp.Get("/", controllers.GetAllOrmawa)
	ormawaGrp.Post("/", m("ormawa.manage"), controllers.CreateOrmawa)
	ormawaGrp.Get("/leaderboard", controllers.GetOrmawaLeaderboard)
	ormawaGrp.Get("/gamifikasi/history", controllers.GetGlobalOrmawaPoinHistory)
	ormawaGrp.Get("/gamifikasi/rules", controllers.GetOrmawaGamifikasiRules)
	ormawaGrp.Post("/gamifikasi/rules", m("ormawa.manage"), controllers.CreateOrmawaGamifikasiRule)
	ormawaGrp.Put("/gamifikasi/rules/:id", m("ormawa.manage"), controllers.UpdateOrmawaGamifikasiRule)
	ormawaGrp.Delete("/gamifikasi/rules/:id", m("ormawa.manage"), controllers.DeleteOrmawaGamifikasiRule)
	ormawaGrp.Get("/lpjs", controllers.GetGlobalLPJs)
	ormawaGrp.Put("/lpjs/:id/review", m("proposal.univ.approve"), controllers.ReviewLPJ)
	ormawaGrp.Put("/:id", m("ormawa.manage"), controllers.UpdateOrmawa)
	ormawaGrp.Delete("/:id", m("ormawa.manage"), controllers.DeleteOrmawa)

	// Kategori Ormawa — Master Data (Super Admin CRUD)
	katGrp := r.Group("/ormawa-kategori", m("ormawa.manage"))
	katGrp.Get("/", ormawa.GetAllKategoriOrmawa)
	katGrp.Post("/", ormawa.CreateKategoriOrmawa)
	katGrp.Put("/:id", ormawa.UpdateKategoriOrmawa)
	katGrp.Delete("-reset", ormawa.ResetKategoriOrmawa)
	katGrp.Delete("/:id", ormawa.DeleteKategoriOrmawa)

	// Ormawa Financial Settings
	r.Get("/ormawa-financial-settings", ormawa.GetFinancialSettings)
	r.Put("/ormawa-financial-settings", ormawa.UpdateFinancialSetting)
	r.Post("/ormawa-financial-settings/generate-report-number", ormawa.GeneratePaguReportNumber)
	r.Get("/ormawa-financial-settings/:id/audit-logs", ormawa.GetFinancialAuditLogs)

	students := r.Group("/students", m("students.view"))
	students.Get("/", controllers.GetAllStudents)
	students.Get("/stats", controllers.GetStudentStats)
	students.Get("/report/executive", controllers.GenerateExecutiveReportPDF)
	students.Post("/", m("students.create"), controllers.CreateStudent)
	students.Put("/:id", m("students.update"), controllers.UpdateStudent)
	students.Delete("/:id", m("students.delete"), controllers.DeleteStudent)
	students.Delete("/reset/all", m("students.delete"), controllers.ResetStudents)

	pmb := r.Group("/pmb", m("system.pmb.view"))
	pmb.Get("/", controllers.GetAllPMB)
	pmb.Get("/stats", controllers.GetPMBStats)

	dosen := r.Group("/lecturers", m("dosen.view"))
	dosen.Get("/", controllers.GetAllLecturers)
	dosen.Post("/", m("dosen.manage"), controllers.CreateLecturer)
	dosen.Put("/:id", m("dosen.manage"), controllers.UpdateLecturer)
	dosen.Delete("/:id", m("dosen.manage"), controllers.DeleteLecturer)

	prodi := r.Group("/prodi", m("program_studi.view"))
	prodi.Get("/", controllers.GetAllProgramStudi)
	prodi.Post("/", m("program_studi.manage"), controllers.CreateProgramStudi)
	prodi.Put("/:id", m("program_studi.manage"), controllers.UpdateProgramStudi)
	prodi.Delete("/:id", m("program_studi.manage"), controllers.DeleteProgramStudi)

	psych := r.Group("/psychologists", m("psychologist.view"))
	psych.Get("/", controllers.GetAllPsychologists)
	psych.Put("/:id", m("psychologist.core"), controllers.UpdatePsychologist)
	psych.Delete("/:id", m("psychologist.core"), controllers.DeletePsychologist)
	psych.Get("/bookings", m("psychologist.bookings.view"), controllers.GetPsychologistBookingsAdmin)
	psych.Get("/medical-records", m("psychologist.medical_records.view"), controllers.GetPsychologistMedicalRecordsAdmin)
	psych.Get("/referrals", m("psychologist.referrals.view"), controllers.GetPsychologistReferralsAdmin)
	psych.Post("/referrals/:id/approve", m("psychologist.referrals.update"), controllers.ApprovePsychologistReferral)
	psych.Get("/:id/schedules", m("psychologist.schedules.view"), controllers.GetPsychologistSchedulesAdmin)
	psych.Put("/:id/schedules", m("psychologist.schedules.update"), controllers.SavePsychologistSchedulesAdmin)

	// Tenaga Kesehatan Management (Super Admin)
	tk := r.Group("/tenagakes", m("health.view"))
	tk.Get("/", controllers.GetAllTenagaKesehatan)
	tk.Put("/:id", m("health.core"), controllers.UpdateTenagaKesehatan)
	tk.Delete("/:id", m("health.core"), controllers.DeleteTenagaKesehatan)
	tk.Get("/bookings", m("health.bookings.view"), controllers.GetTenagaKesehatanBookingsAdmin)
	tk.Get("/medical-records", m("health.medical_records.view"), controllers.GetTenagaKesehatanMedicalRecordsAdmin)
	tk.Get("/referrals", m("health.referrals.view"), controllers.GetTenagaKesehatanReferralsAdmin)
	tk.Post("/referrals/:id/approve", m("health.referrals.update"), controllers.ApproveTenagaKesehatanReferral)
	tk.Get("/:id/schedules", m("health.schedules.view"), controllers.GetTenagaKesehatanSchedulesAdmin)
	tk.Post("/:id/schedules", m("health.schedules.update"), controllers.CreateTenagaKesehatanScheduleAdmin)
	tk.Put("/schedules/:id", m("health.schedules.update"), controllers.UpdateTenagaKesehatanScheduleAdmin)
	tk.Delete("/schedules/:id", m("health.schedules.update"), controllers.DeleteTenagaKesehatanScheduleAdmin)

	aspirations := r.Group("/aspirations", m("aspiration.view"))
	aspirations.Get("/", controllers.GetGlobalAspirations)
	aspirations.Put("/:id/status", m("aspiration.respond"), controllers.UpdateAspirationStatus)

	scholarships := r.Group("/scholarships", m("scholarship.view"))
	scholarships.Get("/", controllers.GetAllScholarships)
	scholarships.Post("/", m("scholarship.manage"), controllers.CreateScholarship)
	scholarships.Put("/:id", m("scholarship.manage"), controllers.UpdateScholarship)
	scholarships.Delete("/:id", m("scholarship.manage"), controllers.DeleteScholarship)
	
	scholarshipsApp := r.Group("/scholarship-applications", m("scholarship.view"))
	scholarshipsApp.Get("/", controllers.GetAllScholarshipApplications)
	scholarshipsApp.Put("/bulk/status", m("scholarship.manage"), controllers.UpdateBulkScholarshipApplicationStatus)
	scholarshipsApp.Put("/:id/status", m("scholarship.manage"), controllers.UpdateScholarshipApplicationStatus)

	// Achievements (Prestasi Mahasiswa)
	achievements := r.Group("/achievements", m("achievement.view"))
	achievements.Get("/", fakultas.AmbilDaftarPrestasi)
	achievements.Post("/import", m("achievement.manage"), fakultas.ImportAchievements)
	achievements.Put("/:id/verify", m("achievement.manage"), fakultas.VerifikasiPrestasi)
	achievements.Post("/:id/sync-simkatmawa", m("achievement.manage"), fakultas.SyncSimkatmawa)
	achievements.Put("/:id/simkatmawa-status", m("achievement.manage"), fakultas.UpdateSimkatmawaStatus)
	achievements.Delete("/:id", m("achievement.manage"), fakultas.HapusPrestasi)

	// Counseling
	counseling := r.Group("/counseling-records", m("counseling.view"))
	counseling.Get("/", controllers.GetAllCounseling)
	counseling.Post("/", m("counseling.manage"), controllers.CreateCounseling)
	counseling.Put("/:id", m("counseling.manage"), controllers.UpdateCounseling)
	counseling.Delete("/:id", m("counseling.manage"), controllers.DeleteCounseling)

	counselingSch := r.Group("/counseling-schedules", m("counseling.view"))
	counselingSch.Get("/", controllers.GetAllCounselingJadwal)
	counselingSch.Post("/", m("counseling.manage"), controllers.CreateCounselingJadwal)
	counselingSch.Put("/:id", m("counseling.manage"), controllers.UpdateCounselingJadwal)
	counselingSch.Delete("/:id", m("counseling.manage"), controllers.DeleteCounselingJadwal)

	// News & Content
	news := r.Group("/news", m("news.view"))
	news.Get("/", controllers.GetAllNews)
	news.Post("/", m("news.manage"), controllers.CreateNews)
	news.Put("/:id", m("news.manage"), controllers.UpdateNews)
	news.Delete("/:id", m("news.manage"), controllers.DeleteNews)

	r.Get("/academic-settings", m("academic_settings.view"), controllers.GetAcademicSettings)
	r.Put("/academic-settings", m("academic_settings.manage"), controllers.UpdateAcademicSettings)

	// System Integrations Settings (Super Admin Only typically, but handled via permission '*')
	integrations := r.Group("/api-integrations", m("*"))
	integrations.Get("/", controllers.GetAllApiIntegrations)
	integrations.Put("/", controllers.UpdateApiIntegrations)

	smtp := r.Group("/smtp-settings", m("*"))
	smtp.Get("/", controllers.GetSmtpSettings)
	smtp.Put("/", controllers.UpdateSmtpSettings)
	smtp.Post("/test", controllers.TestSmtpConnection)

	r.Post("/sync-sevima", m("integration.sync"), controllers.SyncSevimaMahasiswa)
	r.Get("/sync-sevima/progress", m("integration.sync"), controllers.GetSyncProgress)
	r.Post("/sync-sevima/cancel", m("integration.sync"), controllers.CancelSyncSevima)
	r.Get("/sevima/health", m("integration.sync"), controllers.CheckSevimaHealth)
	
	sevimaAnomali := r.Group("/sevima/anomali", m("integration.sync"))
	sevimaAnomali.Get("/", controllers.GetSevimaAnomali)
	sevimaAnomali.Post("/:id/sync", controllers.SyncSingleSevimaAnomali)
	sevimaAnomali.Delete("/:id", controllers.DeleteSevimaAnomali)

	sevimaPmbAnomali := r.Group("/sevima/pmb-anomali", m("system.pmb.sync_sevima"))
	sevimaPmbAnomali.Get("/", controllers.GetSevimaPMBAnomali)
	sevimaPmbAnomali.Post("/:id/sync", controllers.SyncSingleSevimaPMBAnomali)
	sevimaPmbAnomali.Delete("/:id", controllers.DeleteSevimaPMBAnomali)

	r.Post("/sync-sevima-fakultas", m("integration.sync"), controllers.SyncSevimaFakultas)
	r.Post("/sync-sevima-prodi", m("integration.sync"), controllers.SyncSevimaProgramStudi)
	r.Post("/sync-sevima-dosen", m("integration.sync"), controllers.SyncSevimaDosen)
	r.Post("/integrasi/sync-periode", m("integration.sync"), controllers.SyncSevimaPeriode)
	r.Post("/integrasi/sync-ipk", m("integration.sync"), controllers.SyncIPKFromSevima)
	
	r.Get("/lecturers", m("dosen.view"), controllers.GetAllLecturers)
	r.Delete("/lecturers/reset", m("dosen.manage"), controllers.ResetLecturersData)
	r.Delete("/integrasi/reset-pmb", m("system.database.reset"), controllers.ResetPMBData)
	r.Post("/integrasi/kencana-sync-pmb", m("system.pmb.sync_sevima"), controllers.SyncKencanaPMB)
	r.Delete("/fakultas/reset", m("faculty.manage"), controllers.ResetFakultasData)
	r.Delete("/prodi/reset", m("program_studi.manage"), controllers.ResetProdiData)

	landing := r.Group("/landing-settings", m("landing.manage"))
	landing.Put("/", controllers.UpdateLandingSettings)
	landing.Post("/upload", controllers.LandingUploadImage)

	// Theme Customizer
	theme := r.Group("/theme", m("theme.manage"))
	theme.Get("/", controllers.GetTheme)
	theme.Put("/", controllers.UpdateTheme)
	theme.Post("/reset", controllers.ResetTheme)
	theme.Post("/upload-logo", controllers.UploadLogo)
	theme.Post("/upload-favicon", controllers.UploadFavicon)

	// Document Settings
	doc := r.Group("/document-settings", m("document.manage"))
	doc.Get("/", controllers.GetDocumentSettings)
	doc.Put("/:id", controllers.UpdateDocumentSetting)
	doc.Post("/generate", controllers.GenerateDocumentNumberAPI)

	// CMS Documentation Module
	r.Get("/docs/:menu_id", controllers.GetDocumentationByMenuID)
	r.Post("/docs", m("docs.manage"), controllers.SaveDocumentation)

	// Factory Reset (SuperAdmin ONLY)
	r.Post("/reset-database", m("*"), controllers.ResetDatabase)
	
	// Integration alias
	r.Post("/sync/sevima/mahasiswa", m("integration.sync"), controllers.SyncSevimaMahasiswa)
}
