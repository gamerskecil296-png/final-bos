package routes

import (
	"siakad-backend/controllers"
	fakultas "siakad-backend/controllers/fakultas"
	ormawa "siakad-backend/controllers/ormawa"
	"siakad-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

// InisialisasiRuteFakultas mendaftarkan rute administrator fakultas (English Path for Frontend Compatibility)
func InisialisasiRuteFakultas(aplikasi *fiber.App) {
	api := aplikasi.Group("/api/faculty", middleware.AuthProtected)

	// Mahasiswa
	api.Get("/students", middleware.RequirePermission("students.view"), fakultas.AmbilDaftarMahasiswa)
	api.Get("/students/:id", middleware.RequirePermission("students.view"), fakultas.AmbilMahasiswaBerdasarID)
	api.Post("/students", middleware.RequirePermission("students.create"), fakultas.TambahMahasiswaBaru)
	api.Put("/students/:id", middleware.RequirePermission("students.update"), fakultas.PerbaruiDataMahasiswa)
	api.Delete("/students/:id", middleware.RequirePermission("students.delete"), fakultas.HapusDataMahasiswa)
	api.Get("/students/:nim/academic", middleware.RequirePermission("students.view"), fakultas.AmbilAkademikMahasiswa)
	api.Get("/students/:nim/perwalian", middleware.RequirePermission("students.view"), fakultas.AmbilPerwalianMahasiswa)

	// Dosen
	api.Get("/lecturers", middleware.RequirePermission("dosen.view"), fakultas.AmbilDaftarDosen)
	api.Post("/lecturers", middleware.RequirePermission("dosen.create"), fakultas.TambahDosenBaru)
	api.Put("/lecturers/:id", middleware.RequirePermission("dosen.update"), fakultas.PerbaruiDataDosen)
	api.Delete("/lecturers/:id", middleware.RequirePermission("dosen.delete"), fakultas.HapusDataDosen)
	api.Post("/sync-dosen", middleware.RequirePermission("dosen.create"), controllers.SyncSevimaDosen)

	// Struktur Organisasi (Fakultas & Prodi/Majors)
	api.Get("/faculties", middleware.RequirePermission("faculty.view"), fakultas.AmbilDaftarFakultas)
	api.Get("/majors", middleware.RequirePermission("program_studi.view"), fakultas.AmbilDaftarProdi)
	api.Post("/majors", middleware.RequirePermission("program_studi.create"), fakultas.TambahProdiBaru)
	api.Put("/majors/:id", middleware.RequirePermission("program_studi.update"), fakultas.PerbaruiProdi)
	api.Delete("/majors/:id", middleware.RequirePermission("program_studi.delete"), fakultas.HapusProdi)

	// Matakuliah & Jadwal
	api.Get("/courses", middleware.RequirePermission("program_studi.view"), fakultas.AmbilDaftarProdi)
	api.Post("/courses", middleware.RequirePermission("program_studi.create"), fakultas.TambahProdiBaru)
	api.Put("/courses/:id", middleware.RequirePermission("program_studi.update"), fakultas.PerbaruiProdi)
	api.Delete("/courses/:id", middleware.RequirePermission("program_studi.delete"), fakultas.HapusProdi)

	// Dashboard & Ringkasan
	api.Get("/summary", middleware.RequirePermission("faculty.dashboard.view"), fakultas.AmbilRingkasanDashboard)
	api.Get("/reports/summary", middleware.RequirePermission("faculty_report.view"), fakultas.AmbilRingkasanLaporan)
	api.Get("/notifications/stats", fakultas.AmbilNotifikasiAntrean)

	// Pelayanan Mahasiswa (Aspirasi, Prestasi, Surat)
	api.Get("/aspirations", middleware.RequirePermission("faculty.aspiration.view"), fakultas.AmbilDaftarAspirasi)
	api.Get("/aspirasi", middleware.RequirePermission("faculty.aspiration.view"), fakultas.AmbilDaftarAspirasi)
	api.Put("/aspirations/:id", middleware.RequirePermission("faculty.aspiration.update"), fakultas.TanggapiAspirasi)
	api.Put("/aspirasi/:id", middleware.RequirePermission("faculty.aspiration.update"), fakultas.TanggapiAspirasi)
	api.Delete("/aspirations/:id", middleware.RequirePermission("faculty.aspiration.delete"), fakultas.HapusAspirasi)

	api.Get("/achievements", middleware.RequirePermission("faculty.achievement.view"), fakultas.AmbilDaftarPrestasi)
	api.Get("/prestasi", middleware.RequirePermission("faculty.achievement.view"), fakultas.AmbilDaftarPrestasi)
	api.Put("/achievements/:id/verify", middleware.RequirePermission("faculty.achievement.update"), fakultas.VerifikasiPrestasi)
	api.Put("/prestasi/:id/verify", middleware.RequirePermission("faculty.achievement.update"), fakultas.VerifikasiPrestasi)
	api.Put("/prestasi/:id", middleware.RequirePermission("faculty.achievement.update"), fakultas.VerifikasiPrestasi)
	api.Post("/achievements/:id/sync-simkatmawa", middleware.RequirePermission("faculty.achievement.update"), fakultas.SyncSimkatmawa)
	api.Put("/achievements/:id/simkatmawa-status", middleware.RequirePermission("faculty.achievement.update"), fakultas.UpdateSimkatmawaStatus)
	api.Delete("/achievements/:id", middleware.RequirePermission("faculty.achievement.update"), fakultas.HapusPrestasi)
	api.Delete("/prestasi/:id", middleware.RequirePermission("faculty.achievement.update"), fakultas.HapusPrestasi)

	// Beasiswa — Faculty can only VIEW programs & VIEW pendaftar (CUD returns 403 in controller)

	api.Get("/scholarships", middleware.RequirePermission("faculty.scholarship.view"), fakultas.AmbilDaftarBeasiswa)
	api.Post("/scholarships", middleware.RequirePermission("faculty.scholarship.view"), fakultas.TambahBeasiswa)
	api.Put("/scholarships/:id", middleware.RequirePermission("faculty.scholarship.view"), fakultas.PerbaruiBeasiswa)
	api.Delete("/scholarships/:id", middleware.RequirePermission("faculty.scholarship.view"), fakultas.HapusBeasiswa)
	api.Get("/scholarships/applications", middleware.RequirePermission("faculty.scholarship.view"), fakultas.AmbilPendaftarBeasiswa)
	api.Put("/scholarships/applications/:id", middleware.RequirePermission("faculty.scholarship.view"), fakultas.VerifikasiBeasiswa)
	api.Delete("/scholarships/applications/:id", middleware.RequirePermission("faculty.scholarship.view"), fakultas.HapusPendaftarBeasiswa)

	// Organisasi & Proposal
	api.Get("/organizations", middleware.RequirePermission("faculty_ormawa.view"), fakultas.AmbilDaftarOrganisasi)
	api.Get("/organizations-faculty", middleware.RequirePermission("faculty_ormawa.view"), fakultas.AmbilDaftarOrganisasi)
	api.Post("/organizations", middleware.RequirePermission("faculty_ormawa.create"), fakultas.TambahOrganisasi)
	api.Put("/organizations/:id", middleware.RequirePermission("faculty_ormawa.update"), fakultas.PerbaruiOrganisasi)
	api.Delete("/organizations/:id", middleware.RequirePermission("faculty_ormawa.delete"), fakultas.HapusOrganisasi)

	// Kategori Ormawa — read-only untuk Faculty Admin (dipakai form Tambah/Edit Ormawa)
	api.Get("/ormawa-kategori", middleware.RequirePermission("faculty_ormawa.view"), ormawa.GetAllKategoriOrmawa)

	api.Get("/ormawa/proposals", middleware.RequirePermission("faculty_proposal.view"), fakultas.AmbilDaftarProposalOrmawa)
	api.Put("/ormawa/proposals/:id", middleware.RequirePermission("faculty_proposal.update"), fakultas.ValidasiProposalOrmawa)

	// Jadwal Konseling
	api.Get("/counseling", middleware.RequirePermission("faculty.counseling.view"), fakultas.AmbilDaftarKonseling)
	api.Post("/counseling", middleware.RequirePermission("faculty.counseling.manage"), fakultas.TambahSesiKonseling)
	api.Put("/counseling/:id", middleware.RequirePermission("faculty.counseling.manage"), fakultas.UpdateSesiKonseling)
	api.Delete("/counseling/:id", middleware.RequirePermission("faculty.counseling.manage"), fakultas.HapusSesiKonseling)
	api.Get("/psychologists", middleware.RequirePermission("faculty.counseling.view"), fakultas.AmbilDaftarPsikolog)

	// Layanan Kesehatan (Health Screening)
	api.Get("/health-screening", middleware.RequirePermission("faculty_health.view"), fakultas.AmbilDaftarKesehatan)
	api.Get("/health-screening/summary", middleware.RequirePermission("faculty_health.view"), fakultas.AmbilRingkasanKesehatan)
	api.Delete("/health-screening/:id", middleware.RequirePermission("faculty_health.delete"), fakultas.HapusDataKesehatan)

	// Periode Akademik (Pengaturan)
	api.Get("/academic-periods", middleware.RequirePermission("faculty_settings.view"), fakultas.AmbilPengaturanAkademik)
	api.Get("/academic-periods/all", middleware.RequirePermission("faculty_settings.view"), fakultas.AmbilSemuaPeriodeAkademik)
	api.Post("/academic-periods", middleware.RequirePermission("faculty_settings.manage"), fakultas.SimpanPengaturanAkademik)
	api.Put("/academic-periods", middleware.RequirePermission("faculty_settings.manage"), fakultas.SimpanPengaturanAkademik)
	api.Post("/sync-periode", middleware.RequirePermission("faculty_settings.manage"), controllers.SyncSevimaPeriode)
	api.Post("/sync-mahasiswa", middleware.RequirePermission("students.create"), controllers.SyncSevimaMahasiswa)

	api.Get("/profile", middleware.RequirePermission("faculty_profile.view"), fakultas.AmbilProfilAdminFakultas)
	api.Put("/profile", middleware.RequirePermission("faculty_profile.update"), fakultas.PerbaruiProfilAdminFakultas)
	api.Post("/profile/upload-avatar", middleware.RequirePermission("faculty_profile.update"), fakultas.UploadAvatarAdminFakultas)
	api.Delete("/profile/avatar", middleware.RequirePermission("faculty_profile.update"), fakultas.HapusAvatarAdminFakultas)
	api.Put("/change-password", fakultas.GantiPasswordAdminFakultas)

	api.Get("/ringkasan", middleware.RequirePermission("kencana.faculty.dashboard"), fakultas.AmbilRingkasanPkkmb)
	api.Get("/peserta", middleware.RequirePermission("kencana.faculty.dashboard"), fakultas.AmbilDaftarKelulusanMaba)

	// Agenda/Kegiatan
	api.Get("/kegiatan", middleware.RequirePermission("kencana.faculty.dashboard"), fakultas.AmbilDaftarKegiatanPkkmb)

	// Materi
	api.Get("/materi", middleware.RequirePermission("kencana.faculty.dashboard"), fakultas.AmbilDaftarMateriPkkmb)

	// Tugas
	api.Get("/tugas", middleware.RequirePermission("kencana.faculty.dashboard"), fakultas.AmbilDaftarTugasPkkmb)

	// Kelulusan
	api.Get("/kelulusan/:id", middleware.RequirePermission("kencana.faculty.dashboard"), fakultas.AmbilStatusKelulusanMahasiswa)

	// RBAC Prodi Roles (Managed by Faculty Admin)
	api.Get("/prodi-roles", middleware.RequirePermission("faculty_rbac.view"), fakultas.GetProdiRoles)
	api.Post("/prodi-roles", middleware.RequirePermission("faculty_rbac.create"), fakultas.CreateProdiRole)
	api.Put("/prodi-roles/:id", middleware.RequirePermission("faculty_rbac.update"), fakultas.UpdateProdiRole)
	api.Delete("/prodi-roles/:id", middleware.RequirePermission("faculty_rbac.delete"), fakultas.DeleteProdiRole)

	// Prodi Admin Accounts (Managed by Faculty Admin)
	api.Get("/prodi-admins", middleware.RequirePermission("prodi_users.view"), fakultas.GetProdiAdmins)
	api.Post("/prodi-admins", middleware.RequirePermission("prodi_users.create"), fakultas.CreateProdiAdmin)
	api.Put("/prodi-admins/:id", middleware.RequirePermission("prodi_users.update"), fakultas.UpdateProdiAdmin)
	api.Delete("/prodi-admins/:id", middleware.RequirePermission("prodi_users.delete"), fakultas.DeleteProdiAdmin)
}
