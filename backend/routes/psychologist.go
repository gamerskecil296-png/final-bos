package routes

import (
	"siakad-backend/controllers"
	"siakad-backend/controllers/psychologist"
	"siakad-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupPsychologistRoutes(app *fiber.App) {
	api := app.Group("/api/psychologist", middleware.AuthProtected, middleware.PsikologCheck)

	api.Get("/me", psychologist.GetMe)
	api.Put("/profile", psychologist.UpdateProfile)
	api.Put("/change-password", psychologist.ChangePassword)
	api.Get("/dashboard", middleware.RequirePermission("psychologist.dashboard.view"), psychologist.GetDashboard)

	api.Get("/bookings", middleware.RequirePermission("psychologist.bookings.view"), psychologist.GetBookings)
	api.Get("/bookings/:id", middleware.RequirePermission("psychologist.bookings.view"), psychologist.GetBookingDetail)
	api.Put("/bookings/:id/status", middleware.RequirePermission("psychologist.bookings.update"), psychologist.UpdateBookingStatus)

	api.Get("/schedules", middleware.RequirePermission("psychologist.schedules.view"), psychologist.GetSchedules)
	api.Put("/schedules", middleware.RequirePermission("psychologist.schedules.update"), psychologist.SaveSchedules)

	api.Get("/patients", middleware.RequirePermission("psychologist.patients.view"), psychologist.GetPatients)
	api.Get("/patients/export-pdf", middleware.RequirePermission("psychologist.patients.view"), psychologist.ExportPatientsRecapPDF)
	api.Get("/session-notes/:id/export-pdf", middleware.RequirePermission("psychologist.medical_records.view"), psychologist.ExportSessionNotePDF)
	api.Put("/session-notes/:id", middleware.RequirePermission("psychologist.medical_records.update"), psychologist.UpdateSessionNote)
	api.Get("/patients/:id/medical-record", middleware.RequirePermission("psychologist.medical_records.view"), psychologist.GetMedicalRecord)
	api.Get("/medical-records", middleware.RequirePermission("psychologist.medical_records.view"), psychologist.GetMedicalRecords)
	api.Post("/patients/:id/session-notes", middleware.RequirePermission("psychologist.medical_records.create"), psychologist.CreateSessionNote)
	api.Put("/patients/:studentId/status", middleware.RequirePermission("psychologist.patients.update"), psychologist.UpdatePatientStatus)

	api.Get("/assessments", middleware.RequirePermission("psychologist.reports.view"), psychologist.GetAssessments)
	api.Post("/assessments", middleware.RequirePermission("psychologist.reports.create"), psychologist.CreateAssessment)

	api.Get("/analytics", middleware.RequirePermission("psychologist.dashboard.view"), psychologist.GetAnalytics)
	api.Get("/prodi", psychologist.GetProdiList)
	api.Get("/fakultas", psychologist.GetFakultasList)

	api.Get("/notifications", psychologist.GetNotifications)
	api.Put("/notifications/read-all", psychologist.MarkAllNotificationsRead)
	api.Put("/notifications/:id/read", psychologist.MarkNotificationRead)
	api.Delete("/notifications/:id", psychologist.DeleteNotification)

	// Tindak Lanjut (Referral)
	api.Get("/referrals", middleware.RequirePermission("psychologist.referrals.view"), psychologist.GetReferrals)
	api.Post("/referrals", middleware.RequirePermission("psychologist.referrals.create"), psychologist.CreateReferral)
	api.Post("/referrals/:id/send", middleware.RequirePermission("psychologist.referrals.update"), psychologist.SendReferral)
	api.Post("/referrals/:id/confirm-received", middleware.RequirePermission("psychologist.referrals.update"), psychologist.ConfirmReferralReceived)
	api.Get("/referrals/:id/download", middleware.RequirePermission("psychologist.referrals.view"), psychologist.DownloadReferralPDF)

	// Document Settings
	api.Get("/document-settings", controllers.GetDocumentSettings)
	api.Put("/document-settings/:id", controllers.UpdateDocumentSetting)
}
