package routes

import (
	"siakad-backend/controllers"
	"siakad-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupHealthRoutes(app *fiber.App) {
	// ========================
	// MAHASISWA ROUTES
	// ========================
	mahasiswa := app.Group("/api/mahasiswa", middleware.AuthProtected)

	// Self-Screening (Patient Intake)
	mahasiswa.Get("/self-screening", controllers.GetSelfScreenings)
	mahasiswa.Get("/self-screening/:id", controllers.GetSelfScreeningDetail)
	mahasiswa.Post("/self-screening", controllers.CreateSelfScreening)

	// Insurance (Mahasiswa)
	mahasiswa.Get("/insurance", controllers.GetInsuranceClaims)
	mahasiswa.Get("/insurance/:id", controllers.GetInsuranceClaimDetail)
	mahasiswa.Post("/insurance", controllers.CreateInsuranceClaim)
	mahasiswa.Put("/insurance/:id", controllers.UpdateInsuranceClaim)
	mahasiswa.Delete("/insurance/:id", controllers.DeleteInsuranceClaim)
	mahasiswa.Post("/insurance/:id/upload", controllers.UploadInsuranceDocument)

	// Rujukan (Mahasiswa - published only)
	mahasiswa.Get("/rujukan", controllers.GetRujukans)
	mahasiswa.Get("/rujukan/:id", controllers.GetRujukanDetail)
	mahasiswa.Get("/rujukan/:id/export-pdf", controllers.ExportRujukanPDF)

	// ========================
	// TENAGA KESEHATAN ROUTES
	// ========================
	tenagakes := app.Group("/api/tenagakes", middleware.AuthProtected, middleware.TenagaKesehatanCheck)

	// Self-Screening management (TK)
	tenagakes.Get("/screenings", controllers.GetSelfScreenings)
	tenagakes.Get("/screenings/:id", controllers.GetSelfScreeningDetail)
	tenagakes.Put("/screenings/:id/complete", controllers.CompleteSelfScreening)

	// Insurance claims review (TK)
	tenagakes.Get("/claims", controllers.GetInsuranceClaims)
	tenagakes.Get("/claims/stats", controllers.GetInsuranceStats)
	tenagakes.Get("/claims/:id", controllers.GetInsuranceClaimDetail)
	tenagakes.Put("/claims/:id/status", controllers.UpdateInsuranceClaimStatus)

	// BAP Kesehatan
	tenagakes.Get("/bap", controllers.GetBAPs)
	tenagakes.Get("/bap/:id", controllers.GetBAPDetail)
	tenagakes.Post("/bap", controllers.CreateBAP)
	tenagakes.Post("/bap/upload-photos", controllers.UploadBAPPhotos)
	tenagakes.Put("/bap/:id", controllers.UpdateBAP)
	tenagakes.Delete("/bap/:id", controllers.DeleteBAP)
	tenagakes.Get("/bap/:id/export-pdf", controllers.ExportBAPPDF)

	// Rujukan management
	tenagakes.Post("/rujukan", controllers.CreateRujukan)
	tenagakes.Get("/rujukans", controllers.GetRujukans)
	tenagakes.Get("/rujukan/:id", controllers.GetRujukanDetail)
	tenagakes.Put("/rujukan/:id/publish", controllers.PublishRujukan)

	// Clinical Reports
	tenagakes.Get("/reports", controllers.GetClinicalReports)

	// PDF Exports (stubs)
	tenagakes.Get("/claims/:id/export-pdf", controllers.ExportSuratPengantarPDF)
	tenagakes.Get("/rujukan/:id/export-pdf", controllers.ExportRujukanPDF)

	// ========================
	// SUPER ADMIN ROUTES
	// ========================
	superadmin := app.Group("/api/super-admin/health", middleware.AuthProtected, middleware.RequireRole("super_admin"))

	// Full access to all health features
	superadmin.Get("/claims", controllers.GetInsuranceClaims)
	superadmin.Get("/claims/stats", controllers.GetInsuranceStats)
	superadmin.Get("/claims/:id", controllers.GetInsuranceClaimDetail)
	superadmin.Put("/claims/:id/status", controllers.UpdateInsuranceClaimStatus)

	superadmin.Get("/reports", controllers.GetClinicalReports)

	superadmin.Get("/bap", controllers.GetBAPs)
	superadmin.Get("/bap/:id", controllers.GetBAPDetail)
	superadmin.Put("/bap/:id", controllers.UpdateBAP)
	superadmin.Get("/bap/:id/export-pdf", controllers.ExportBAPPDF)

	superadmin.Get("/rujukan/:id/export-pdf", controllers.ExportRujukanPDF)
}
