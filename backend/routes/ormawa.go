package routes

import (
	"github.com/gofiber/fiber/v2"
	"siakad-backend/controllers/ormawa"
	"siakad-backend/middleware"
)

func SetupOrmawaRoutes(app *fiber.App) {
	api := app.Group("/api/ormawa", middleware.AuthProtected, middleware.OrmawaCheck)

	// DASHBOARD STATS
	api.Get("/profile", middleware.RequirePermission("ormawa.core.view"), ormawa.GetOrmawaProfile)
	api.Get("/stats", middleware.RequirePermission("ormawa.core.view"), ormawa.GetOrmawaStats)
	api.Get("/gamifikasi", middleware.RequirePermission("ormawa.core.view"), ormawa.GetOrmawaGamifikasi)

	// PROPOSALS
	api.Get("/proposals", middleware.RequirePermission("ormawa.proposals.view"), ormawa.GetProposals)
	api.Get("/proposals/:id/history", middleware.RequirePermission("ormawa.proposals.view"), ormawa.GetProposalHistory)
	api.Post("/proposals", middleware.RequirePermission("ormawa.proposals.create"), ormawa.CreateProposal)
	api.Put("/proposals/:id", middleware.RequirePermission("ormawa.proposals.update"), ormawa.UpdateProposal)
	api.Post("/proposals/:id/resubmit", middleware.RequirePermission("ormawa.proposals.update"), ormawa.ResubmitProposal)
	api.Delete("/proposals/:id", middleware.RequirePermission("ormawa.proposals.delete"), ormawa.DeleteProposal)

	// SETTINGS & PROFILE
	api.Get("/settings/:id", middleware.RequirePermission("ormawa.settings.view"), ormawa.GetOrmawaSettings)
	api.Put("/settings/:id", middleware.RequirePermission("ormawa.settings.manage"), ormawa.UpdateOrmawaSettings)

	// CASH MUTATIONS (BUKU KAS) & FINANCE
	api.Get("/kas", middleware.RequirePermission("ormawa.finance.view"), ormawa.GetCashMutations)
	api.Post("/kas", middleware.RequirePermission("ormawa.finance.create"), ormawa.CreateCashMutation)
	api.Delete("/kas/:id", middleware.RequirePermission("ormawa.finance.delete"), ormawa.DeleteCashMutation)
	api.Get("/budget-status", middleware.RequirePermission("ormawa.finance.view"), ormawa.GetBudgetStatus)
	api.Post("/kas/generate-report-number", middleware.RequirePermission("ormawa.finance.view"), ormawa.GenerateFinancialReportNumber)

	// EVENTS
	api.Get("/events", middleware.RequirePermission("ormawa.events.view"), ormawa.GetEvents)
	api.Post("/events", middleware.RequirePermission("ormawa.events.create"), ormawa.CreateEvent)
	api.Put("/events/:id", middleware.RequirePermission("ormawa.events.update"), ormawa.UpdateEvent)
	api.Delete("/events/:id", middleware.RequirePermission("ormawa.events.delete"), ormawa.DeleteEvent)

	// ATTENDANCE
	api.Get("/attendance/:eventId", middleware.RequirePermission("ormawa.attendance.view"), ormawa.GetAttendance)
	api.Post("/attendance", middleware.RequirePermission("ormawa.attendance.manage"), ormawa.SubmitAttendance)

	// ANNOUNCEMENTS
	api.Get("/announcements", middleware.RequirePermission("ormawa.announcements.view"), ormawa.GetAnnouncements)
	api.Post("/announcements", middleware.RequirePermission("ormawa.announcements.create"), ormawa.CreateAnnouncement)
	api.Put("/announcements/:id", middleware.RequirePermission("ormawa.announcements.update"), ormawa.UpdateAnnouncement)
	api.Delete("/announcements/:id", middleware.RequirePermission("ormawa.announcements.delete"), ormawa.DeleteAnnouncement)

	// ROLES
	api.Get("/roles", middleware.RequirePermission("ormawa.rbac.view"), ormawa.GetOrmawaRoles)
	api.Post("/roles", middleware.RequirePermission("ormawa.rbac.manage"), ormawa.CreateOrmawaRole)
	api.Put("/roles/:id", middleware.RequirePermission("ormawa.rbac.manage"), ormawa.UpdateOrmawaRole)
	api.Delete("/roles/:id", middleware.RequirePermission("ormawa.rbac.manage"), ormawa.DeleteOrmawaRole)

	// MEMBERS
	api.Get("/members", middleware.RequirePermission("ormawa.members.view"), ormawa.GetMembers)
	api.Post("/members", middleware.RequirePermission("ormawa.members.create"), ormawa.CreateMember)
	api.Post("/members/regenerate", middleware.RequirePermission("ormawa.members.create"), ormawa.RegenerateMembers)
	api.Put("/members/:id", middleware.RequirePermission("ormawa.members.update"), ormawa.UpdateMember)
	api.Delete("/members/:id", middleware.RequirePermission("ormawa.members.delete"), ormawa.DeleteMember)
	api.Post("/members/:id/assign-role", middleware.RequirePermission("ormawa.members.update"), ormawa.AssignPengurusRole)
	api.Post("/members/:id/revoke-role", middleware.RequirePermission("ormawa.members.update"), ormawa.RevokePengurusRole)

	// LOOKUPS
	api.Get("/students", middleware.RequirePermission("ormawa.members.view"), ormawa.GetStudentsLookup)

	// NOTIFICATIONS
	api.Get("/notifications", middleware.RequirePermission("ormawa.notifications.view"), ormawa.GetOrmawaNotifications)
	api.Put("/notifications/:id/read", middleware.RequirePermission("ormawa.notifications.manage"), ormawa.MarkNotificationRead)
	api.Put("/notifications/read-all", middleware.RequirePermission("ormawa.notifications.manage"), ormawa.MarkAllNotificationsRead)
	api.Delete("/notifications/:id", middleware.RequirePermission("ormawa.notifications.manage"), ormawa.DeleteNotification)

	// DIVISIONS
	api.Get("/divisions", middleware.RequirePermission("ormawa.structure.view"), ormawa.GetDivisions)
	api.Post("/divisions", middleware.RequirePermission("ormawa.structure.manage"), ormawa.CreateDivision)
	api.Delete("/divisions/:id", middleware.RequirePermission("ormawa.structure.manage"), ormawa.DeleteDivision)

	// LPJ
	api.Get("/lpjs", middleware.RequirePermission("ormawa.lpj.view"), ormawa.GetLPJs)
	api.Post("/lpjs", middleware.RequirePermission("ormawa.lpj.create"), ormawa.CreateLPJ)
	api.Put("/lpjs/:id", middleware.RequirePermission("ormawa.lpj.update"), ormawa.UpdateLPJ)
	api.Delete("/lpjs/:id", middleware.RequirePermission("ormawa.lpj.delete"), ormawa.DeleteLPJ)
	api.Post("/lpjs/:id/documents", middleware.RequirePermission("ormawa.lpj.update"), ormawa.UploadLPJDocument)
	api.Delete("/lpjs/documents/:docId", middleware.RequirePermission("ormawa.lpj.update"), ormawa.DeleteLPJDocument)

	// ASPIRATIONS
	api.Get("/aspirations", middleware.RequirePermission("ormawa.aspirations.view"), ormawa.GetAspirations)
	api.Post("/aspirations", middleware.RequirePermission("ormawa.aspirations.create"), ormawa.CreateAspiration)
	api.Put("/aspirations/:id", middleware.RequirePermission("ormawa.aspirations.update"), ormawa.UpdateAspiration)

	// PKKMB / KENCANA (MANAGEMENT FOR ORMAWA ADMIN)
	api.Get("/kencana/ringkasan", middleware.RequirePermission("ormawa.kencana.view"), ormawa.AmbilRingkasanPkkmb)
	api.Get("/kencana/peserta", middleware.RequirePermission("ormawa.kencana.view"), ormawa.AmbilDaftarKelulusanMaba)
	api.Get("/kencana/banding", middleware.RequirePermission("ormawa.kencana.view"), ormawa.AmbilDaftarBandingPkkmb)
	api.Post("/kencana/banding/:id/review", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.ReviewBandingPkkmb)

	api.Get("/kencana/kegiatan", middleware.RequirePermission("ormawa.kencana.view"), ormawa.AmbilDaftarKegiatanPkkmb)
	api.Post("/kencana/kegiatan", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.TambahKegiatanPkkmb)
	api.Put("/kencana/kegiatan/:id", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.UpdateKegiatanPkkmb)
	api.Delete("/kencana/kegiatan/:id", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.HapusKegiatanPkkmb)

	api.Get("/kencana/materi", middleware.RequirePermission("ormawa.kencana.view"), ormawa.AmbilDaftarMateriPkkmb)
	api.Post("/kencana/materi", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.TambahMateriPkkmb)
	api.Put("/kencana/materi/:id", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.UpdateMateriPkkmb)
	api.Delete("/kencana/materi/:id", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.HapusMateriPkkmb)

	api.Get("/kencana/kuis", middleware.RequirePermission("ormawa.kencana.view"), ormawa.AmbilDaftarKuis)
	api.Post("/kencana/kuis", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.TambahKuis)
	api.Put("/kencana/kuis/:id", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.UpdateKuis)
	api.Delete("/kencana/kuis/:id", middleware.RequirePermission("ormawa.kencana.manage"), ormawa.HapusKuis)

	// FILE UPLOAD HANDLER
	api.Post("/upload", middleware.RequirePermission("ormawa.core.view"), ormawa.UploadFile)

	// RECRUITMENT FIELDS (dynamic form builder)
	api.Get("/recruitment-fields", middleware.RequirePermission("ormawa.recruitment.view"), ormawa.GetRecruitmentFields)
	api.Post("/recruitment-fields", middleware.RequirePermission("ormawa.recruitment.create"), ormawa.SaveRecruitmentFields)
	api.Delete("/recruitment-fields/:id", middleware.RequirePermission("ormawa.recruitment.delete"), ormawa.DeleteRecruitmentField)

	// EXPORT applicants to CSV
	api.Get("/recruitment/export", middleware.RequirePermission("ormawa.recruitment.view"), ormawa.ExportRecruitmentApplicants)

}
