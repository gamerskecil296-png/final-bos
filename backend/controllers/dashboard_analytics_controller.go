package controllers

import (
	"math"
	"siakad-backend/config"
	"siakad-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetDashboardAnalytics returns comprehensive cross-module analytics for the Super Admin dashboard.
// This is a read-only aggregate endpoint designed for the executive dashboard view.
// Supports optional ?tahun_masuk=YYYY query parameter to filter mahasiswa-related data.
func GetDashboardAnalytics(c *fiber.Ctx) error {
	now := time.Now().UTC()
	todayStart := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	thisMonthStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)

	// ─── TAHUN MASUK FILTER ─────────────────────────────────────
	tahunMasuk := c.Query("tahun_masuk")
	filterTahun := tahunMasuk != "" && tahunMasuk != "all" && tahunMasuk != "undefined"

	// Tahun masuk list — always return all distinct years regardless of filter
	type YearEntry struct {
		TahunMasuk int `json:"tahun_masuk"`
	}
	var tahunMasukList []YearEntry
	config.DB.Model(&models.Mahasiswa{}).
		Select("DISTINCT tahun_masuk").
		Where("tahun_masuk IS NOT NULL AND tahun_masuk > 0").
		Order("tahun_masuk DESC").
		Scan(&tahunMasukList)

	// ═══════════════════════════════════════════════════════════
	// SECTION 1: OVERVIEW COUNTS
	// ═══════════════════════════════════════════════════════════
	var totalMahasiswa, totalDosen, totalOrmawa, totalFakultas, totalProdi int64
	var totalUsers, totalPMB int64

	mhsQuery := config.DB.Model(&models.Mahasiswa{})
	if filterTahun {
		mhsQuery = mhsQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	mhsQuery.Count(&totalMahasiswa)

	config.DB.Model(&models.User{}).Where("role ILIKE ?", "%dosen%").Count(&totalDosen)
	config.DB.Model(&models.Ormawa{}).Count(&totalOrmawa)
	config.DB.Model(&models.Fakultas{}).Count(&totalFakultas)
	config.DB.Model(&models.ProgramStudi{}).Count(&totalProdi)
	config.DB.Model(&models.User{}).Count(&totalUsers)
	config.DB.Model(&models.PendaftaranMahasiswaBaru{}).Count(&totalPMB)

	// Average IPK — use primary `ipk` field, exclude zero values
	var avgIpk float64
	ipkQuery := config.DB.Model(&models.Mahasiswa{}).Select("COALESCE(AVG(NULLIF(ipk, 0)), 0)")
	if filterTahun {
		ipkQuery = ipkQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	ipkQuery.Scan(&avgIpk)
	avgIpk = math.Round(avgIpk*100) / 100

	// ═══════════════════════════════════════════════════════════
	// SECTION 2: USER DISTRIBUTION
	// ═══════════════════════════════════════════════════════════
	type RoleCount struct {
		Role  string `json:"role"`
		Count int64  `json:"count"`
	}
	var roleDist []RoleCount
	config.DB.Model(&models.User{}).
		Select("COALESCE(NULLIF(role, ''), 'Tanpa Role') as role, COUNT(*) as count").
		Group("COALESCE(NULLIF(role, ''), 'Tanpa Role')").
		Order("count DESC").
		Scan(&roleDist)

	// Active users today (logged in today)
	var activeUsersToday int64
	config.DB.Model(&models.LogAktivitas{}).
		Where("aktivitas ILIKE ? AND created_at >= ?", "%LOGIN%", todayStart).
		Distinct("user_id").
		Count(&activeUsersToday)

	// Active users this month
	var activeUsersMonth int64
	config.DB.Model(&models.LogAktivitas{}).
		Where("aktivitas ILIKE ? AND created_at >= ?", "%LOGIN%", thisMonthStart).
		Distinct("user_id").
		Count(&activeUsersMonth)

	// ═══════════════════════════════════════════════════════════
	// SECTION 3: GEOGRAPHIC & STRUCTURAL DISTRIBUTION
	// ═══════════════════════════════════════════════════════════
	type NameCount struct {
		Name  string `json:"name"`
		Count int64  `json:"count"`
	}

	// Faculty distribution
	var facultyDist []NameCount
	facDistQuery := config.DB.Table("mahasiswa.mahasiswa m").
		Select("f.nama as name, COUNT(m.id) as count").
		Joins("JOIN fakultas.fakultas f ON m.fakultas_id = f.id").
		Where("m.deleted_at IS NULL AND m.fakultas_id IS NOT NULL")
	if filterTahun {
		facDistQuery = facDistQuery.Where("m.tahun_masuk = ?", tahunMasuk)
	}
	facDistQuery.Group("f.nama").Order("count DESC").Scan(&facultyDist)

	// Gender distribution
	var genderMale, genderFemale int64
	gMaleQuery := config.DB.Model(&models.Mahasiswa{}).Where("jenis_kelamin = ?", "L")
	if filterTahun {
		gMaleQuery = gMaleQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	gMaleQuery.Count(&genderMale)

	gFemaleQuery := config.DB.Model(&models.Mahasiswa{}).Where("jenis_kelamin = ?", "P")
	if filterTahun {
		gFemaleQuery = gFemaleQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	gFemaleQuery.Count(&genderFemale)

	// City distribution (kota)
	var cityDist []NameCount
	cityQuery := config.DB.Model(&models.Mahasiswa{}).
		Select("kota as name, COUNT(*) as count").
		Where("kota IS NOT NULL AND kota != ''")
	if filterTahun {
		cityQuery = cityQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	cityQuery.Group("kota").
		Order("count DESC").
		Scan(&cityDist)

	// Province distribution (provinsi)
	var provinsiDist []NameCount
	provQuery := config.DB.Model(&models.Mahasiswa{}).
		Select("provinsi as name, COUNT(*) as count").
		Where("provinsi IS NOT NULL AND provinsi != ''")
	if filterTahun {
		provQuery = provQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	provQuery.Group("provinsi").
		Order("count DESC").
		Scan(&provinsiDist)

	// ═══════════════════════════════════════════════════════════
	// SECTION 4: ACTIVITY TIMELINE (6 months)
	// ═══════════════════════════════════════════════════════════
	type MonthlyTrend struct {
		Month    string `json:"month"`
		Aspirasi int64  `json:"aspirasi"`
		Proposal int64  `json:"proposal"`
		Beasiswa int64  `json:"beasiswa"`
		Login    int64  `json:"login"`
	}
	var monthlyTrends []MonthlyTrend

	for i := 5; i >= 0; i-- {
		monthStart := time.Date(now.Year(), now.Month()-time.Month(i), 1, 0, 0, 0, 0, time.UTC)
		monthEnd := monthStart.AddDate(0, 1, 0)
		monthLabel := monthStart.Format("Jan")

		var aspCount, propCount, scholarshipAppCount, loginCount int64
		config.DB.Model(&models.Aspirasi{}).Where("created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&aspCount)
		config.DB.Model(&models.Proposal{}).Where("created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&propCount)
		config.DB.Model(&models.BeasiswaPendaftaran{}).Where("created_at >= ? AND created_at < ?", monthStart, monthEnd).Count(&scholarshipAppCount)
		config.DB.Model(&models.LogAktivitas{}).Where("aktivitas ILIKE ? AND created_at >= ? AND created_at < ?", "%LOGIN%", monthStart, monthEnd).Count(&loginCount)

		monthlyTrends = append(monthlyTrends, MonthlyTrend{
			Month:    monthLabel,
			Aspirasi: aspCount,
			Proposal: propCount,
			Beasiswa: scholarshipAppCount,
			Login:    loginCount,
		})
	}

	// ═══════════════════════════════════════════════════════════
	// SECTION 5: RISK & SLA ANALYSIS
	// ═══════════════════════════════════════════════════════════
	var aspirasiAktif, aspirasiSelesai, slaOverdue, resolvedToday int64

	config.DB.Model(&models.Aspirasi{}).Where("status != ?", "Selesai").Count(&aspirasiAktif)
	config.DB.Model(&models.Aspirasi{}).Where("status = ?", "Selesai").Count(&aspirasiSelesai)
	config.DB.Model(&models.Aspirasi{}).Where("status != ? AND deadline < ?", "Selesai", now).Count(&slaOverdue)
	config.DB.Model(&models.Aspirasi{}).Where("status = ? AND updated_at >= ?", "Selesai", todayStart).Count(&resolvedToday)

	// At-risk students (IPK < 2.0 and still active) — uses primary `ipk` field
	var atRiskStudents int64
	atRiskQuery := config.DB.Model(&models.Mahasiswa{}).
		Where("status_akademik = ? AND ipk > 0 AND ipk < 2.0", "Aktif")
	if filterTahun {
		atRiskQuery = atRiskQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	atRiskQuery.Count(&atRiskStudents)

	// Student status distribution
	var studentStatusDist []NameCount
	statusDistQuery := config.DB.Model(&models.Mahasiswa{}).
		Select("status_akademik as name, COUNT(*) as count").
		Where("status_akademik IS NOT NULL AND status_akademik != ''")
	if filterTahun {
		statusDistQuery = statusDistQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	statusDistQuery.Group("status_akademik").
		Order("count DESC").
		Scan(&studentStatusDist)

	// ═══════════════════════════════════════════════════════════
	// SECTION 6: PROCESS PIPELINES
	// ═══════════════════════════════════════════════════════════

	// Proposal Pipeline
	var propDiajukan, propDisetujuiFak, propDisetujuiUniv, propDitolak, propRevisi int64
	config.DB.Model(&models.Proposal{}).Where("status = ?", "diajukan").Count(&propDiajukan)
	config.DB.Model(&models.Proposal{}).Where("status = ?", "disetujui_fakultas").Count(&propDisetujuiFak)
	config.DB.Model(&models.Proposal{}).Where("status = ?", "disetujui").Count(&propDisetujuiUniv)
	config.DB.Model(&models.Proposal{}).Where("status = ?", "ditolak").Count(&propDitolak)
	config.DB.Model(&models.Proposal{}).Where("status = ?", "revisi").Count(&propRevisi)

	// Beasiswa Pipeline
	var beasiswaAktif, beasiswaApplicants, beasiswaApproved, beasiswaRejected int64
	config.DB.Model(&models.Beasiswa{}).Where("deadline >= ?", now).Count(&beasiswaAktif)
	config.DB.Model(&models.BeasiswaPendaftaran{}).Where("status = ?", "Menunggu").Count(&beasiswaApplicants)
	config.DB.Model(&models.BeasiswaPendaftaran{}).Where("status = ?", "Diterima").Count(&beasiswaApproved)
	config.DB.Model(&models.BeasiswaPendaftaran{}).Where("status = ?", "Ditolak").Count(&beasiswaRejected)

	// Ormawa Activity
	var totalAnggotaOrmawa int64
	config.DB.Model(&models.OrmawaAnggota{}).Count(&totalAnggotaOrmawa)

	// Counseling & Health — use raw table names since they belong to different schemas
	var totalBookingPsikolog, totalBookingKesehatan int64
	var bookingPsikologPending, bookingKesehatanPending int64

	config.DB.Table("psikolog.bookings").Count(&totalBookingPsikolog)
	config.DB.Table("psikolog.bookings").Where("status = ?", "Menunggu").Count(&bookingPsikologPending)
	config.DB.Model(&models.BookingKesehatan{}).Count(&totalBookingKesehatan)
	config.DB.Model(&models.BookingKesehatan{}).Where("status = ?", "Menunggu Konfirmasi").Count(&bookingKesehatanPending)

	// Content / News
	var totalBerita, beritaPublished, beritaDraft int64
	config.DB.Model(&models.Berita{}).Count(&totalBerita)
	config.DB.Model(&models.Berita{}).Where("status = ?", "Published").Count(&beritaPublished)
	config.DB.Model(&models.Berita{}).Where("status = ?", "Draft").Count(&beritaDraft)

	// Recent Activity Logs (last 8)
	type AuditEntry struct {
		CreatedAt time.Time `json:"created_at"`
		Aktivitas string    `json:"aktivitas"`
		Deskripsi string    `json:"deskripsi"`
		UserEmail string    `json:"user_email"`
	}
	var recentLogs []AuditEntry
	config.DB.Table("mahasiswa.log_aktivitas al").
		Select("al.created_at, al.aktivitas, al.deskripsi, COALESCE(u.email, 'system') as user_email").
		Joins("LEFT JOIN public.users u ON al.user_id = u.id").
		Order("al.created_at DESC").
		Limit(8).
		Scan(&recentLogs)

	// Kencana stats
	var totalPesertaKencana int64
	var activeKencanaPeriod models.KencanaPeriod
	if err := config.DB.Where("status = ?", "active").Order("created_at desc").First(&activeKencanaPeriod).Error; err == nil {
		config.DB.Model(&models.Mahasiswa{}).
			Where("tahun_masuk = ? OR id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE period_id = ? AND status = 'active')", activeKencanaPeriod.Year, activeKencanaPeriod.ID).
			Count(&totalPesertaKencana)
	} else {
		config.DB.Model(&models.KencanaGroupMember{}).Where("status = 'active'").Distinct("student_id").Count(&totalPesertaKencana)
	}

	// ═══════════════════════════════════════════════════════════
	// SECTION 7: 5W1H ANALYTICS
	// ═══════════════════════════════════════════════════════════

	// Enrollment trend — students grouped by tahun_masuk with status breakdown
	// Optimized: single aggregate query instead of N*4 separate queries
	type EnrollmentTrendEntry struct {
		Year     int   `json:"year"`
		Total    int64 `json:"total"`
		Aktif    int64 `json:"aktif"`
		Lulus    int64 `json:"lulus"`
		Keluar   int64 `json:"keluar"`
		Cuti     int64 `json:"cuti"`
		NonAktif int64 `json:"non_aktif"`
		Lainnya  int64 `json:"lainnya"`
	}

	var enrollmentTrend []EnrollmentTrendEntry
	config.DB.Model(&models.Mahasiswa{}).
		Select(`tahun_masuk as year, COUNT(*) as total,
			SUM(CASE WHEN status_akademik = 'Aktif' THEN 1 ELSE 0 END) as aktif,
			SUM(CASE WHEN status_akademik = 'Lulus' THEN 1 ELSE 0 END) as lulus,
			SUM(CASE WHEN status_akademik = 'Keluar' THEN 1 ELSE 0 END) as keluar,
			SUM(CASE WHEN status_akademik = 'Cuti' THEN 1 ELSE 0 END) as cuti,
			SUM(CASE WHEN status_akademik = 'Non-Aktif' OR status_akademik = 'NonAktif' OR status_akademik = 'DO' THEN 1 ELSE 0 END) as non_aktif,
			SUM(CASE WHEN status_akademik IS NULL OR status_akademik = '' OR status_akademik NOT IN ('Aktif','Lulus','Keluar','Cuti','Non-Aktif','NonAktif','DO') THEN 1 ELSE 0 END) as lainnya`).
		Where("tahun_masuk IS NOT NULL AND tahun_masuk > 0").
		Group("tahun_masuk").
		Order("tahun_masuk ASC").
		Scan(&enrollmentTrend)

	// Gender by faculty — male/female counts per faculty
	type GenderByFacultyEntry struct {
		Faculty string `json:"faculty"`
		Male    int64  `json:"male"`
		Female  int64  `json:"female"`
	}
	var genderByFaculty []GenderByFacultyEntry
	genderFacQuery := config.DB.Table("mahasiswa.mahasiswa m").
		Select(`f.nama as faculty,
			SUM(CASE WHEN m.jenis_kelamin = 'L' THEN 1 ELSE 0 END) as male,
			SUM(CASE WHEN m.jenis_kelamin = 'P' THEN 1 ELSE 0 END) as female`).
		Joins("JOIN fakultas.fakultas f ON m.fakultas_id = f.id").
		Where("m.deleted_at IS NULL AND m.fakultas_id IS NOT NULL")
	if filterTahun {
		genderFacQuery = genderFacQuery.Where("m.tahun_masuk = ?", tahunMasuk)
	}
	genderFacQuery.Group("f.nama").Order("faculty ASC").Scan(&genderByFaculty)

	// Top 10 sekolah asal by count
	type SekolahCount struct {
		Name  string `json:"name"`
		Count int64  `json:"count"`
	}
	var topSekolah []SekolahCount
	sekolahQuery := config.DB.Model(&models.Mahasiswa{}).
		Select("asal_sekolah as name, COUNT(*) as count").
		Where("asal_sekolah IS NOT NULL AND asal_sekolah != ''")
	if filterTahun {
		sekolahQuery = sekolahQuery.Where("tahun_masuk = ?", tahunMasuk)
	}
	sekolahQuery.Group("asal_sekolah").
		Order("count DESC").
		Limit(10).
		Scan(&topSekolah)

	// Aspirasi by category
	var aspirasiByCategory []NameCount
	config.DB.Model(&models.Aspirasi{}).
		Select("COALESCE(NULLIF(kategori, ''), 'Tidak Dikategorikan') as name, COUNT(*) as count").
		Group("COALESCE(NULLIF(kategori, ''), 'Tidak Dikategorikan')").
		Order("count DESC").
		Scan(&aspirasiByCategory)

	// Proposal by faculty
	var proposalByFaculty []NameCount
	config.DB.Table("ormawa.proposal p").
		Select("COALESCE(f.nama, 'Universitas') as name, COUNT(p.id) as count").
		Joins("LEFT JOIN fakultas.fakultas f ON p.fakultas_id = f.id").
		Where("p.deleted_at IS NULL").
		Group("f.nama").
		Order("count DESC").
		Scan(&proposalByFaculty)

	// ═══════════════════════════════════════════════════════════
	// RESPONSE
	// ═══════════════════════════════════════════════════════════
	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			// Overview
			"total_mahasiswa": totalMahasiswa,
			"total_dosen":     totalDosen,
			"total_ormawa":    totalOrmawa,
			"total_fakultas":  totalFakultas,
			"total_prodi":     totalProdi,
			"total_users":     totalUsers,
			"total_pmb":       totalPMB,
			"avg_ipk":         avgIpk,

			// People
			"role_distribution":  roleDist,
			"active_users_today": activeUsersToday,
			"active_users_month": activeUsersMonth,

			// Distribution
			"faculty_distribution":  facultyDist,
			"gender_male":           genderMale,
			"gender_female":         genderFemale,
			"city_distribution":     cityDist,
			"provinsi_distribution": provinsiDist,

			// Timeline
			"monthly_trends": monthlyTrends,

			// Risk & SLA
			"aspirasi_aktif":     aspirasiAktif,
			"aspirasi_selesai":   aspirasiSelesai,
			"sla_overdue":        slaOverdue,
			"resolved_today":     resolvedToday,
			"at_risk_students":   atRiskStudents,
			"student_status_dist": studentStatusDist,

			// Pipelines
			"proposal_diajukan":       propDiajukan,
			"proposal_disetujui_fak":  propDisetujuiFak,
			"proposal_disetujui_univ": propDisetujuiUniv,
			"proposal_ditolak":        propDitolak,
			"proposal_revisi":         propRevisi,

			"beasiswa_aktif":      beasiswaAktif,
			"beasiswa_applicants": beasiswaApplicants,
			"beasiswa_approved":   beasiswaApproved,
			"beasiswa_rejected":   beasiswaRejected,

			"total_anggota_ormawa":  totalAnggotaOrmawa,
			"total_peserta_kencana": totalPesertaKencana,

			// Health & Counseling
			"booking_psikolog_total":    totalBookingPsikolog,
			"booking_psikolog_pending":  bookingPsikologPending,
			"booking_kesehatan_total":   totalBookingKesehatan,
			"booking_kesehatan_pending": bookingKesehatanPending,

			// Content
			"total_berita":     totalBerita,
			"berita_published": beritaPublished,
			"berita_draft":     beritaDraft,

			// Recent Activity
			"recent_logs": recentLogs,

			// Tahun Masuk
			"tahun_masuk_list": tahunMasukList,

			// 5W1H Analytics
			"enrollment_trend":      enrollmentTrend,
			"gender_by_faculty":     genderByFaculty,
			"top_sekolah":           topSekolah,
			"aspirasi_by_category":  aspirasiByCategory,
			"proposal_by_faculty":   proposalByFaculty,
		},
	})
}
