package routes

import (
	"siakad-backend/controllers/mahasiswa"
	"siakad-backend/controllers/tenaga_kesehatan"
	"siakad-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

// SetupMahasiswaRoutes mendaftarkan semua rute untuk role mahasiswa
func SetupMahasiswaRoutes(app *fiber.App) {
	api := app.Group("/api", middleware.AuthProtected)

	// Mahasiswa Dashboard
	api.Get("/mahasiswa/dashboard", mahasiswa.GetDashboard)
	api.Get("/mahasiswa/summary", mahasiswa.GetStudentSummary)
	api.Get("/mahasiswa/kegiatan", mahasiswa.GetKegiatan)

	// PKKMB (Kencana)
	kencanaGroup := api.Group("/kencana")
	kencanaGroup.Get("/progress", mahasiswa.GetProgress)
	kencanaGroup.Get("/kegiatan", mahasiswa.GetPkkmbKegiatan)
	kencanaGroup.Post("/check-in/:id", mahasiswa.CheckIn)
	kencanaGroup.Get("/sertifikat", mahasiswa.GetSertifikat)
	kencanaGroup.Post("/sertifikat/generate", mahasiswa.GenerateSertifikat)
	kencanaGroup.Get("/banding", mahasiswa.GetBandingList)
	kencanaGroup.Post("/banding", mahasiswa.SubmitBanding)
	kencanaGroup.Get("/kuis/:id/soal", mahasiswa.GetKuisSoal)
	kencanaGroup.Post("/kuis/:id/submit", mahasiswa.SubmitKuis)

	// Achievement
	achievementGroup := api.Group("/achievement")
	achievementGroup.Get("/", mahasiswa.GetAchievements)
	achievementGroup.Post("/", mahasiswa.CreateAchievement)
	achievementGroup.Get("/:id", mahasiswa.GetAchievementDetail)
	achievementGroup.Put("/:id", mahasiswa.UpdateAchievement)
	achievementGroup.Delete("/:id", mahasiswa.DeleteAchievement)

	// Organisasi
	organisasiGroup := api.Group("/organisasi")
	organisasiGroup.Get("/", mahasiswa.GetList)
	organisasiGroup.Post("/", mahasiswa.Create)
	organisasiGroup.Put("/:id", mahasiswa.Update)
	organisasiGroup.Delete("/:id", mahasiswa.Delete)
	organisasiGroup.Get("/ormawa-list", mahasiswa.GetOrmawaList)
	organisasiGroup.Post("/daftar", mahasiswa.DaftarOrmawa)
	organisasiGroup.Get("/pendaftaran", mahasiswa.GetPendaftaranList)
	organisasiGroup.Get("/divisions/:ormawaId", mahasiswa.GetOrmawaDivisions)
	organisasiGroup.Get("/recruitment-fields/:ormawaId", mahasiswa.GetRecruitmentFields)
	organisasiGroup.Post("/upload-file", mahasiswa.UploadRecruitmentFile)

	// Profil
	profilGroup := api.Group("/profil")
	profilGroup.Get("/", mahasiswa.GetProfile)
	profilGroup.Put("/data-diri", mahasiswa.UpdateProfile)
	profilGroup.Put("/change-password", mahasiswa.ChangePassword)
	profilGroup.Post("/foto", mahasiswa.UploadAvatar)
	profilGroup.Get("/preferensi-notif", mahasiswa.GetPreferensiNotif)
	profilGroup.Put("/preferensi-notif", mahasiswa.UpdatePreferensiNotif)
	profilGroup.Get("/sesi-aktif", mahasiswa.GetSesiAktif)
	profilGroup.Get("/riwayat-login", mahasiswa.GetRiwayatLogin)

	// Student Health Records
	studentHealthGroup := api.Group("/student-health")
	studentHealthGroup.Get("/riwayat", middleware.RequirePermission("student.health.records.view"), mahasiswa.GetHealthRiwayat)
	studentHealthGroup.Get("/riwayat/:id", middleware.RequirePermission("student.health.records.view"), mahasiswa.GetHealthDetail)
	studentHealthGroup.Get("/ringkasan", middleware.RequirePermission("student.health.records.view"), mahasiswa.GetHealthRingkasan)
	studentHealthGroup.Get("/tips", middleware.RequirePermission("student.health.records.view"), mahasiswa.GetHealthTips)
	studentHealthGroup.Post("/record", middleware.RequirePermission("student.health.records.create"), mahasiswa.CreateHealthRecord)
	studentHealthGroup.Post("/mandiri", middleware.RequirePermission("student.health.records.create"), mahasiswa.CreateHealthMandiri)

	// Student Health Bookings & Schedules (v1.3)
	studentHealthGroup.Get("/health-worker-schedules", middleware.RequirePermission("student.health.bookings.view"), mahasiswa.GetAvailableHealthSchedules)
	studentHealthGroup.Get("/health-workers", middleware.RequirePermission("student.health.bookings.view"), mahasiswa.ListHealthWorkers)
	studentHealthGroup.Get("/health-workers/:id/schedules", middleware.RequirePermission("student.health.bookings.view"), mahasiswa.GetHealthWorkerSchedules)
	studentHealthGroup.Get("/bookings", middleware.RequirePermission("student.health.bookings.view"), mahasiswa.GetStudentHealthBookings)
	studentHealthGroup.Post("/bookings", middleware.RequirePermission("student.health.bookings.create"), mahasiswa.CreateStudentHealthBooking)
	studentHealthGroup.Delete("/bookings/:id", middleware.RequirePermission("student.health.bookings.delete"), mahasiswa.CancelStudentHealthBooking)
	studentHealthGroup.Put("/bookings/:id/reschedule", middleware.RequirePermission("student.health.bookings.update"), mahasiswa.RescheduleStudentHealthBooking)
	studentHealthGroup.Get("/session-notes/:id/export-pdf", middleware.RequirePermission("student.health.records.view"), tenaga_kesehatan.ExportMedicalRecordPDF)

	// Counseling
	counselingGroup := api.Group("/counseling")
	counselingGroup.Get("/status", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetCounselingStatus)
	counselingGroup.Get("/jadwal", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetCounselingJadwal)
	counselingGroup.Get("/psychologist-schedules", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetAvailablePsychologistSchedules)
	counselingGroup.Get("/psychologists", middleware.RequirePermission("student.counseling.view"), mahasiswa.ListPsychologists)
	counselingGroup.Get("/faculty-statistics", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetFacultyStatistics)
	counselingGroup.Get("/psychologists/:id/schedules", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetPsychologistSchedules)
	counselingGroup.Get("/psychologist-bookings", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetStudentPsychologistBookings)
	counselingGroup.Get("/psychologist-bookings/:id/export-pdf", middleware.RequirePermission("student.counseling.view"), mahasiswa.ExportBookingSessionNotePDF)
	counselingGroup.Get("/medical-record", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetStudentPsychologistMedicalRecord)
	counselingGroup.Get("/session-notes/:id/export-pdf", middleware.RequirePermission("student.counseling.view"), mahasiswa.ExportStudentSessionNotePDF)
	counselingGroup.Get("/referrals", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetStudentReferrals)
	counselingGroup.Post("/psychologist-bookings", middleware.RequirePermission("student.counseling.create"), mahasiswa.CreateStudentPsychologistBooking)
	counselingGroup.Put("/psychologist-bookings/:id/reschedule", middleware.RequirePermission("student.counseling.update"), mahasiswa.RescheduleStudentPsychologistBooking)
	counselingGroup.Delete("/psychologist-bookings/:id", middleware.RequirePermission("student.counseling.delete"), mahasiswa.CancelStudentPsychologistBooking)
	counselingGroup.Post("/booking", middleware.RequirePermission("student.counseling.create"), mahasiswa.CreateBooking)
	counselingGroup.Post("/request", middleware.RequirePermission("student.counseling.create"), mahasiswa.RequestCounseling)
	counselingGroup.Get("/riwayat", middleware.RequirePermission("student.counseling.view"), mahasiswa.GetCounselingRiwayat)
	counselingGroup.Delete("/riwayat/:id", middleware.RequirePermission("student.counseling.delete"), mahasiswa.CancelBooking)

	// Scholarship
	scholarshipGroup := api.Group("/scholarship")
	scholarshipGroup.Get("/", mahasiswa.GetKatalogBeasiswa)
	scholarshipGroup.Get("/riwayat", mahasiswa.GetRiwayatPengajuan)
	scholarshipGroup.Get("/:id", mahasiswa.GetBeasiswaDetail)
	scholarshipGroup.Post("/:id/daftar", mahasiswa.DaftarBeasiswa)
	scholarshipGroup.Get("/pengajuan/:id", mahasiswa.GetPengajuanDetail)
	scholarshipGroup.Post("/upload-custom-file", mahasiswa.UploadScholarshipCustomFile)

	// Voice (Aspirasi)
	voiceGroup := api.Group("/student-voice")
	voiceGroup.Get("/stats", mahasiswa.GetStats)
	voiceGroup.Get("/", mahasiswa.GetAspirasiList)
	voiceGroup.Post("/create", mahasiswa.CreateAspirasi)
	voiceGroup.Get("/:id", mahasiswa.GetDetail)
	voiceGroup.Put("/:id/cancel", mahasiswa.CancelAspirasi)

	// Notification
	notifGroup := api.Group("/notifikasi")
	notifGroup.Get("/", mahasiswa.GetNotifications)
	notifGroup.Get("/unread-count", mahasiswa.GetUnreadCount)
	notifGroup.Put("/:id/baca", mahasiswa.MarkAsRead)
	notifGroup.Put("/baca-semua", mahasiswa.MarkAllAsRead)
	notifGroup.Delete("/hapus-dibaca", mahasiswa.DeleteRead)
	notifGroup.Delete("/hapus-bulk", mahasiswa.DeleteBulk)
	notifGroup.Delete("/:id", mahasiswa.DeleteNotification)
}
