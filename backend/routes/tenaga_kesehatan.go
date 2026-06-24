package routes

import (
	"siakad-backend/controllers"
	notifCtrl "siakad-backend/controllers/mahasiswa"
	"siakad-backend/controllers/tenaga_kesehatan"
	"siakad-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupTenagaKesehatanRoutes(app *fiber.App) {
	api := app.Group("/api/tenagakes", middleware.AuthProtected, middleware.TenagaKesehatanCheck)

	api.Get("/me", tenaga_kesehatan.GetMe)
	api.Put("/profile", tenaga_kesehatan.UpdateProfile)
	api.Put("/change-password", tenaga_kesehatan.ChangePassword)
	api.Get("/dashboard", middleware.RequirePermission("health.dashboard.view"), tenaga_kesehatan.GetDashboard)
	api.Get("/activities", middleware.RequirePermission("health.dashboard.view"), tenaga_kesehatan.GetActivities)

	// Jadwal & Booking
	api.Get("/schedules", middleware.RequirePermission("health.schedules.view"), tenaga_kesehatan.GetSchedules)
	api.Post("/schedules", middleware.RequirePermission("health.schedules.create"), tenaga_kesehatan.CreateSchedule)
	api.Put("/schedules/:id", middleware.RequirePermission("health.schedules.update"), tenaga_kesehatan.UpdateSchedule)
	api.Delete("/schedules/:id", middleware.RequirePermission("health.schedules.delete"), tenaga_kesehatan.DeleteSchedule)

	api.Get("/bookings", middleware.RequirePermission("health.bookings.view"), tenaga_kesehatan.GetBookings)
	api.Get("/bookings/:id", middleware.RequirePermission("health.bookings.view"), tenaga_kesehatan.GetBookingDetail)
	api.Put("/bookings/:id/status", middleware.RequirePermission("health.bookings.update"), tenaga_kesehatan.UpdateBookingStatus)

	// Rekam Medis & Screening
	api.Get("/patients", middleware.RequirePermission("health.patients.view"), tenaga_kesehatan.GetPatients)
	api.Get("/patients/:id/medical-record", middleware.RequirePermission("health.medical_records.view"), tenaga_kesehatan.GetMedicalRecord)
	api.Get("/medical-records/:id/export-pdf", middleware.RequirePermission("health.medical_records.view"), tenaga_kesehatan.ExportMedicalRecordPDF)
	api.Post("/patients/:id/screening", middleware.RequirePermission("health.medical_records.create"), tenaga_kesehatan.CreateScreening)
	api.Put("/medical-records/:record_id", middleware.RequirePermission("health.medical_records.update"), tenaga_kesehatan.UpdateMedicalRecord)

	// QR / NIM Lookup
	api.Get("/students/lookup", middleware.RequirePermission("health.patients.view"), tenaga_kesehatan.LookupStudent)

	// Psikolog (untuk eskalasi rujukan)
	api.Get("/psychologists", notifCtrl.ListPsychologists)
	api.Get("/psychologists/:id/schedules", notifCtrl.GetPsychologistSchedules)

	// Laporan
	api.Get("/reports/export-excel", middleware.RequirePermission("health.reports.view"), tenaga_kesehatan.ExportExcel)
	api.Get("/reports/export-pdf", middleware.RequirePermission("health.reports.view"), tenaga_kesehatan.ExportPDF)

	// Document Settings
	api.Get("/document-settings", controllers.GetDocumentSettings)
	api.Put("/document-settings/:id", controllers.UpdateDocumentSetting)

	// Notifikasi — share same handler as mahasiswa (user_id based, no role restriction in logic)
	notifGroup := api.Group("/notifikasi")
	notifGroup.Get("/", notifCtrl.GetNotifications)
	notifGroup.Get("/unread-count", notifCtrl.GetUnreadCount)
	notifGroup.Put("/:id/baca", notifCtrl.MarkAsRead)
	notifGroup.Put("/baca-semua", notifCtrl.MarkAllAsRead)
	notifGroup.Delete("/hapus-dibaca", notifCtrl.DeleteRead)
	notifGroup.Delete("/hapus-bulk", notifCtrl.DeleteBulk)
	notifGroup.Delete("/:id", notifCtrl.DeleteNotification)
}
