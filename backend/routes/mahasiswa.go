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
	kencanaGroup := api.Group("/kencana", middleware.RequireAnyPermission("student.kencana.view", "student_kencana_view"))
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
	achievementGroup.Get("/", middleware.RequireAnyPermission("student.achievement.view", "student.achievements.view", "student.prestasi.view"), mahasiswa.GetAchievements)
	achievementGroup.Post("/", middleware.RequireAnyPermission("student.achievement.create", "student.achievements.create"), mahasiswa.CreateAchievement)
	achievementGroup.Get("/:id", middleware.RequireAnyPermission("student.achievement.view", "student.achievements.view", "student.prestasi.view"), mahasiswa.GetAchievementDetail)
	achievementGroup.Put("/:id", middleware.RequireAnyPermission("student.achievement.update", "student.achievements.update"), mahasiswa.UpdateAchievement)
	achievementGroup.Delete("/:id", middleware.RequireAnyPermission("student.achievement.delete", "student.achievements.delete"), mahasiswa.DeleteAchievement)

	// Organisasi
	organisasiGroup := api.Group("/organisasi", middleware.RequireAnyPermission("student.organisasi.view", "student.organizations.view"))
	organisasiGroup.Get("/", mahasiswa.GetList)
	organisasiGroup.Post("/", middleware.RequireAnyPermission("student.organizations.create", "student.organisasi.create"), mahasiswa.Create)
	organisasiGroup.Put("/:id", middleware.RequireAnyPermission("student.organizations.update", "student.organisasi.update"), mahasiswa.Update)
	organisasiGroup.Delete("/:id", middleware.RequireAnyPermission("student.organizations.delete", "student.organisasi.delete"), mahasiswa.Delete)
	organisasiGroup.Get("/ormawa-list", mahasiswa.GetOrmawaList)
	organisasiGroup.Post("/daftar", mahasiswa.DaftarOrmawa)
	organisasiGroup.Get("/pendaftaran", mahasiswa.GetPendaftaranList)
	organisasiGroup.Get("/divisions/:ormawaId", mahasiswa.GetOrmawaDivisions)
	organisasiGroup.Get("/recruitment-fields/:ormawaId", mahasiswa.GetRecruitmentFields)
	organisasiGroup.Post("/upload-file", mahasiswa.UploadRecruitmentFile)

	// Profil
	profilGroup := api.Group("/profil", middleware.RequireAnyPermission("student.profile.view", "student.profil.view"))
	profilGroup.Get("/", mahasiswa.GetProfile)
	profilGroup.Put("/data-diri", middleware.RequireAnyPermission("student.profile.update", "student.profil.update"), mahasiswa.UpdateProfile)
	profilGroup.Put("/change-password", middleware.RequireAnyPermission("student.profile.update", "student.profil.update"), mahasiswa.ChangePassword)
	profilGroup.Post("/foto", middleware.RequireAnyPermission("student.profile.update", "student.profil.update"), mahasiswa.UploadAvatar)
	profilGroup.Get("/preferensi-notif", mahasiswa.GetPreferensiNotif)
	profilGroup.Put("/preferensi-notif", mahasiswa.UpdatePreferensiNotif)
	profilGroup.Get("/sesi-aktif", mahasiswa.GetSesiAktif)
	profilGroup.Get("/riwayat-login", mahasiswa.GetRiwayatLogin)

	// Student Health Records
	studentHealthGroup := api.Group("/student-health")
	studentHealthGroup.Get("/riwayat", middleware.RequireAnyPermission("student.health.records.view", "student.kesehatan.view"), mahasiswa.GetHealthRiwayat)
	studentHealthGroup.Get("/riwayat/:id", middleware.RequireAnyPermission("student.health.records.view", "student.kesehatan.view"), mahasiswa.GetHealthDetail)
	studentHealthGroup.Get("/ringkasan", middleware.RequireAnyPermission("student.health.records.view", "student.kesehatan.view"), mahasiswa.GetHealthRingkasan)
	studentHealthGroup.Get("/tips", middleware.RequireAnyPermission("student.health.records.view", "student.kesehatan.view"), mahasiswa.GetHealthTips)
	studentHealthGroup.Post("/record", middleware.RequireAnyPermission("student.health.records.create", "student.kesehatan.create"), mahasiswa.CreateHealthRecord)
	studentHealthGroup.Post("/mandiri", middleware.RequireAnyPermission("student.health.records.create", "student.kesehatan.create"), mahasiswa.CreateHealthMandiri)

	// Student Health Bookings & Schedules (v1.3)
	studentHealthGroup.Get("/health-worker-schedules", middleware.RequireAnyPermission("student.health.bookings.view", "student.kesehatan.view"), mahasiswa.GetAvailableHealthSchedules)
	studentHealthGroup.Get("/health-workers", middleware.RequireAnyPermission("student.health.bookings.view", "student.kesehatan.view"), mahasiswa.ListHealthWorkers)
	studentHealthGroup.Get("/health-workers/:id/schedules", middleware.RequireAnyPermission("student.health.bookings.view", "student.kesehatan.view"), mahasiswa.GetHealthWorkerSchedules)
	studentHealthGroup.Get("/bookings", middleware.RequireAnyPermission("student.health.bookings.view", "student.kesehatan.view"), mahasiswa.GetStudentHealthBookings)
	studentHealthGroup.Post("/bookings", middleware.RequireAnyPermission("student.health.bookings.create", "student.kesehatan.create"), mahasiswa.CreateStudentHealthBooking)
	studentHealthGroup.Delete("/bookings/:id", middleware.RequireAnyPermission("student.health.bookings.delete", "student.kesehatan.delete"), mahasiswa.CancelStudentHealthBooking)
	studentHealthGroup.Put("/bookings/:id/reschedule", middleware.RequireAnyPermission("student.health.bookings.update", "student.kesehatan.update"), mahasiswa.RescheduleStudentHealthBooking)
	studentHealthGroup.Get("/session-notes/:id/export-pdf", middleware.RequireAnyPermission("student.health.records.view", "student.kesehatan.view"), tenaga_kesehatan.ExportMedicalRecordPDF)

	// Counseling
	counselingGroup := api.Group("/counseling")
	counselingGroup.Get("/status", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetCounselingStatus)
	counselingGroup.Get("/jadwal", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetCounselingJadwal)
	counselingGroup.Get("/psychologist-schedules", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetAvailablePsychologistSchedules)
	counselingGroup.Get("/psychologists", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.ListPsychologists)
	counselingGroup.Get("/faculty-statistics", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetFacultyStatistics)
	counselingGroup.Get("/psychologists/:id/schedules", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetPsychologistSchedules)
	counselingGroup.Get("/psychologist-bookings", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetStudentPsychologistBookings)
	counselingGroup.Get("/psychologist-bookings/:id/export-pdf", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.ExportBookingSessionNotePDF)
	counselingGroup.Get("/medical-record", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetStudentPsychologistMedicalRecord)
	counselingGroup.Get("/session-notes/:id/export-pdf", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.ExportStudentSessionNotePDF)
	counselingGroup.Get("/referrals", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetStudentReferrals)
	counselingGroup.Post("/psychologist-bookings", middleware.RequireAnyPermission("student.counseling.create", "student.konseling.create"), mahasiswa.CreateStudentPsychologistBooking)
	counselingGroup.Put("/psychologist-bookings/:id/reschedule", middleware.RequireAnyPermission("student.counseling.update", "student.konseling.update"), mahasiswa.RescheduleStudentPsychologistBooking)
	counselingGroup.Delete("/psychologist-bookings/:id", middleware.RequireAnyPermission("student.counseling.delete", "student.konseling.delete"), mahasiswa.CancelStudentPsychologistBooking)
	counselingGroup.Post("/booking", middleware.RequireAnyPermission("student.counseling.create", "student.konseling.create"), mahasiswa.CreateBooking)
	counselingGroup.Post("/request", middleware.RequireAnyPermission("student.counseling.create", "student.konseling.create"), mahasiswa.RequestCounseling)
	counselingGroup.Get("/riwayat", middleware.RequireAnyPermission("student.counseling.view", "student.konseling.view"), mahasiswa.GetCounselingRiwayat)
	counselingGroup.Delete("/riwayat/:id", middleware.RequireAnyPermission("student.counseling.delete", "student.konseling.delete"), mahasiswa.CancelBooking)

	// Scholarship
	scholarshipGroup := api.Group("/scholarship")
	scholarshipGroup.Get("/", middleware.RequireAnyPermission("student.scholarship.view", "student.scholarships.view", "student.beasiswa.view"), mahasiswa.GetKatalogBeasiswa)
	scholarshipGroup.Get("/riwayat", middleware.RequireAnyPermission("student.scholarship.view", "student.scholarships.view", "student.beasiswa.view"), mahasiswa.GetRiwayatPengajuan)
	scholarshipGroup.Get("/:id", middleware.RequireAnyPermission("student.scholarship.view", "student.scholarships.view", "student.beasiswa.view"), mahasiswa.GetBeasiswaDetail)
	scholarshipGroup.Post("/:id/daftar", middleware.RequireAnyPermission("student.scholarship.create", "student.scholarships.create"), mahasiswa.DaftarBeasiswa)
	scholarshipGroup.Get("/pengajuan/:id", middleware.RequireAnyPermission("student.scholarship.view", "student.scholarships.view", "student.beasiswa.view"), mahasiswa.GetPengajuanDetail)
	scholarshipGroup.Post("/upload-custom-file", middleware.RequireAnyPermission("student.scholarship.create", "student.scholarships.create"), mahasiswa.UploadScholarshipCustomFile)

	// Voice (Aspirasi)
	voiceGroup := api.Group("/student-voice", middleware.RequireAnyPermission("student.voice.view", "student.aspirations.view", "student.aspirasi.view"))
	voiceGroup.Get("/stats", mahasiswa.GetStats)
	voiceGroup.Get("/", mahasiswa.GetAspirasiList)
	voiceGroup.Post("/create", middleware.RequireAnyPermission("student.aspirations.create", "student.aspirasi.create"), mahasiswa.CreateAspirasi)
	voiceGroup.Get("/:id", mahasiswa.GetDetail)
	voiceGroup.Put("/:id/cancel", middleware.RequireAnyPermission("student.aspirations.update", "student.aspirasi.update"), mahasiswa.CancelAspirasi)

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
