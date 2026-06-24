package controllers

import (
	"siakad-backend/config"
	"siakad-backend/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// --- RINGKASAN & MONITORING (UNTUK DASHBOARD) ---

func AmbilRingkasanPkkmb(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	// Fallback to X-Faculty-ID header for SuperAdmin
	headerFid := c.Get("X-Faculty-ID")
	if headerFid != "" && headerFid != "undefined" && headerFid != "null" && headerFid != "all" {
		if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
			fid = uint(parsedFid)
			role = "faculty_admin"
		}
	}

	headerPid := c.Get("X-Prodi-ID")
	if headerPid != "" && headerPid != "undefined" && headerPid != "null" && headerPid != "all" {
		if parsedPid, err := strconv.ParseUint(headerPid, 10, 32); err == nil {
			c.Locals("program_studi_id", uint(parsedPid))
			role = "prodi_admin"
		}
	}

	var totalMaba int64
	var totalLulus int64
	var totalProses int64
	var totalSertifikat int64
	var totalGagal int64

	var pa models.PengaturanAkademik
	config.DB.Order("id desc").First(&pa)
	activeYear := time.Now().Year()
	if len(pa.TahunAkademik) >= 4 {
		if year, err := strconv.Atoi(pa.TahunAkademik[:4]); err == nil {
			activeYear = year
		}
	}

	tahunParam := c.Query("tahun")

	// Helper function untuk get base query
	getBaseQuery := func() *gorm.DB {
		q := config.DB.Model(&models.Mahasiswa{})
		
		if tahunParam != "" && tahunParam != "all" {
			q = q.Where("mahasiswa.tahun_masuk = ?", tahunParam)
		} else if tahunParam == "" {
			q = q.Where("mahasiswa.tahun_masuk = ?", activeYear)
		}

		if role == "faculty_admin" {
			q = q.Where("mahasiswa.fakultas_id = ?", fid)
		} else if role == "prodi_admin" {
			pid, _ := c.Locals("program_studi_id").(uint)
			q = q.Where("mahasiswa.fakultas_id = ? AND mahasiswa.prodi_id = ?", fid, pid)
		}
		return q
	}

	getBaseQuery().Count(&totalMaba)
	
	// Join with kencana_scores for status
	getBaseQuery().Joins("LEFT JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id").
		Where("ks.graduation_status = 'passed'").Count(&totalLulus)
	
	getBaseQuery().Joins("LEFT JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id").
		Where("ks.graduation_status IN ('not_started', 'in_progress') OR ks.graduation_status IS NULL").Count(&totalProses)
		
	getBaseQuery().Joins("LEFT JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id").
		Where("ks.graduation_status IN ('not_eligible', 'remedial', 'dropped_out')").Count(&totalGagal)

	// Count sertifikat (legacy fallback or just use KencanaCertificate later, but keep simple for now)
	getBaseQuery().Joins("JOIN mahasiswa.pkkmb_sertifikat ps ON ps.mahasiswa_id = mahasiswa.mahasiswa.id").Count(&totalSertifikat)

	// Distribusi Status (untuk Pie/Donut Chart)
	distribusi := fiber.Map{
		"Lulus":  totalLulus,
		"Proses": totalProses,
		"Gagal":  totalGagal,
		"Total":  totalMaba,
	}

	// Breakdown per Angkatan
	type AngkatanStats struct {
		Angkatan string `json:"angkatan"`
		Total    int64  `json:"total"`
		Lulus    int64  `json:"lulus"`
		Proses   int64  `json:"proses"`
		Gagal    int64  `json:"gagal"`
	}
	var angkatanList []AngkatanStats
	var yearCondition string
	var yearParams []interface{}
	
	if tahunParam != "" && tahunParam != "all" {
		yearCondition = "WHERE mahasiswa.mahasiswa.tahun_masuk = ?"
		yearParams = append(yearParams, tahunParam)
	} else if tahunParam == "" {
		yearCondition = "WHERE mahasiswa.mahasiswa.tahun_masuk = ?"
		yearParams = append(yearParams, activeYear)
	} else {
		yearCondition = "WHERE 1=1"
	}

	angkatanQuery := `SELECT
		COALESCE(CAST(mahasiswa.mahasiswa.tahun_masuk AS VARCHAR), 'Unknown') as angkatan,
		COUNT(*) as total,
		SUM(CASE WHEN ks.graduation_status = 'passed' THEN 1 ELSE 0 END) as lulus,
		SUM(CASE WHEN ks.graduation_status IN ('not_started', 'in_progress') OR ks.graduation_status IS NULL THEN 1 ELSE 0 END) as proses,
		SUM(CASE WHEN ks.graduation_status IN ('not_eligible', 'remedial', 'dropped_out') THEN 1 ELSE 0 END) as gagal
	FROM mahasiswa.mahasiswa
	LEFT JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id
	` + yearCondition

	if role == "faculty_admin" {
		angkatanQuery += " AND mahasiswa.mahasiswa.fakultas_id = ? GROUP BY mahasiswa.mahasiswa.tahun_masuk ORDER BY angkatan DESC"
		yearParams = append(yearParams, fid)
		config.DB.Raw(angkatanQuery, yearParams...).Scan(&angkatanList)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		angkatanQuery += " AND mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ? GROUP BY mahasiswa.mahasiswa.tahun_masuk ORDER BY angkatan DESC"
		yearParams = append(yearParams, fid, pid)
		config.DB.Raw(angkatanQuery, yearParams...).Scan(&angkatanList)
	} else {
		angkatanQuery += " GROUP BY mahasiswa.mahasiswa.tahun_masuk ORDER BY angkatan DESC"
		config.DB.Raw(angkatanQuery, yearParams...).Scan(&angkatanList)
	}

	// Breakdown Gender
	type GenderStats struct {
		Gender string `json:"gender"`
		Total  int64  `json:"total"`
		Lulus  int64  `json:"lulus"`
	}
	var genderList []GenderStats
	genderQuery := `SELECT
		COALESCE(mahasiswa.mahasiswa.jenis_kelamin, 'Unknown') as gender,
		COUNT(*) as total,
		SUM(CASE WHEN ks.graduation_status = 'passed' THEN 1 ELSE 0 END) as lulus
	FROM mahasiswa.mahasiswa
	LEFT JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id
	` + yearCondition

	// Reset yearParams for genderQuery reuse
	var genderParams []interface{}
	if tahunParam != "" && tahunParam != "all" {
		genderParams = append(genderParams, tahunParam)
	} else if tahunParam == "" {
		genderParams = append(genderParams, activeYear)
	}

	if role == "faculty_admin" {
		genderQuery += " AND mahasiswa.mahasiswa.fakultas_id = ? GROUP BY mahasiswa.mahasiswa.jenis_kelamin"
		genderParams = append(genderParams, fid)
		config.DB.Raw(genderQuery, genderParams...).Scan(&genderList)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		genderQuery += " AND mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ? GROUP BY mahasiswa.mahasiswa.jenis_kelamin"
		genderParams = append(genderParams, fid, pid)
		config.DB.Raw(genderQuery, genderParams...).Scan(&genderList)
	} else {
		genderQuery += " GROUP BY mahasiswa.mahasiswa.jenis_kelamin"
		config.DB.Raw(genderQuery, genderParams...).Scan(&genderList)
	}

	// Distribusi Nilai (Histogram)
	type NilaiDist struct {
		Range string `json:"range"`
		Count int64  `json:"count"`
	}
	var nilaiDist []NilaiDist
	nilaiQuery := `SELECT
		CASE
			WHEN COALESCE(ks.final_score, 0) >= 90 THEN '90-100'
			WHEN COALESCE(ks.final_score, 0) >= 80 THEN '80-89'
			WHEN COALESCE(ks.final_score, 0) >= 70 THEN '70-79'
			WHEN COALESCE(ks.final_score, 0) >= 60 THEN '60-69'
			WHEN COALESCE(ks.final_score, 0) >= 50 THEN '50-59'
			ELSE '0-49'
		END as range,
		COUNT(*) as count
	FROM mahasiswa.mahasiswa
	LEFT JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id
	WHERE mahasiswa.mahasiswa.tahun_masuk = ?`

	if role == "faculty_admin" {
		nilaiQuery += " AND mahasiswa.mahasiswa.fakultas_id = ? GROUP BY range ORDER BY range"
		config.DB.Raw(nilaiQuery, activeYear, fid).Scan(&nilaiDist)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		nilaiQuery += " AND mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ? GROUP BY range ORDER BY range"
		config.DB.Raw(nilaiQuery, activeYear, fid, pid).Scan(&nilaiDist)
	} else {
		nilaiQuery += " GROUP BY range ORDER BY range"
		config.DB.Raw(nilaiQuery, activeYear).Scan(&nilaiDist)
	}

	// Batas Nilai Kelulusan (threshold)
	batasNilai := 70.0 // default

	// Kegiatan (Agenda) PKKMB
	type KegiatanInfo struct {
		ID      uint   `json:"id"`
		Nama    string `json:"nama" gorm:"column:judul"`
		Tanggal string `json:"tanggal"`
		Lokasi  string `json:"lokasi"`
		Status  string `json:"status"`
	}
	var kegiatanList []KegiatanInfo
	config.DB.Model(&models.PkkmbKegiatan{}).Limit(5).Order("tanggal asc").Scan(&kegiatanList)

	// Breakdown per Prodi
	type ProdiStats struct {
		ID          uint    `json:"id"`
		Prodi       string  `json:"prodi"`
		Partisipasi float64 `json:"partisipasi"`
		Nilai       float64 `json:"nilai"`
		Status      string  `json:"status"`
	}

	var prodis []models.ProgramStudi
	qProdi := config.DB
	if role == "faculty_admin" {
		qProdi = qProdi.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		qProdi = qProdi.Where("fakultas_id = ? AND id = ?", fid, pid)
	}
	qProdi.Find(&prodis)

	var listStats []ProdiStats
	for _, p := range prodis {
		var mabaProdi int64
		config.DB.Model(&models.Mahasiswa{}).
			Where("program_studi_id = ? AND tahun_masuk = ?", p.ID, activeYear).
			Count(&mabaProdi)

		var mabaLulus int64
		config.DB.Model(&models.Mahasiswa{}).
			Joins("JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id").
			Where("mahasiswa.mahasiswa.prodi_id = ? AND mahasiswa.mahasiswa.tahun_masuk = ?", p.ID, activeYear).
			Where("ks.graduation_status = 'passed'").
			Count(&mabaLulus)

		var avgNilai float64
		config.DB.Model(&models.Mahasiswa{}).
			Joins("LEFT JOIN mahasiswa.kencana_scores ks ON ks.student_id = mahasiswa.mahasiswa.id").
			Where("mahasiswa.mahasiswa.prodi_id = ? AND mahasiswa.mahasiswa.tahun_masuk = ?", p.ID, activeYear).
			Select("COALESCE(AVG(ks.final_score), 0)").
			Scan(&avgNilai)

		partisipasi := 0.0
		if mabaProdi > 0 {
			partisipasi = (float64(mabaLulus) / float64(mabaProdi)) * 100
		}

		status := "Optimal"
		if partisipasi < 80 {
			status = "Warning"
		}

		listStats = append(listStats, ProdiStats{
			ID:          p.ID,
			Prodi:       p.Nama,
			Partisipasi: partisipasi,
			Nilai:       avgNilai,
			Status:      status,
		})
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"stats": fiber.Map{
			"totalMaba":       totalMaba,
			"totalLulus":      totalLulus,
			"totalProses":     totalProses,
			"totalGagal":      totalGagal,
			"totalSertifikat": totalSertifikat,
		},
		"distribusi":     distribusi,
		"angkatanStats":  angkatanList,
		"genderStats":    genderList,
		"nilaiDist":      nilaiDist,
		"batasNilai":     batasNilai,
		"kegiatanList":   kegiatanList,
		"prodiBreakdown": listStats,
	})
}

// --- KEGIATAN (AGENDA) ---

func AmbilDaftarKegiatanPkkmb(c *fiber.Ctx) error {
	var k []models.PkkmbKegiatan
	config.DB.Order("tanggal asc").Find(&k)
	return c.JSON(fiber.Map{"status": "success", "data": k})
}

// --- MATERI ---

func AmbilDaftarMateriPkkmb(c *fiber.Ctx) error {
	// Model PkkmbMateri tidak ada di model.go
	return c.JSON(fiber.Map{"status": "success", "data": []string{}})
}

// --- TUGAS ---

func AmbilDaftarTugasPkkmb(c *fiber.Ctx) error {
	// Model PkkmbTugas tidak ada di model.go
	return c.JSON(fiber.Map{"status": "success", "data": []string{}})
}

// --- KELULUSAN (MAHASISWA) ---

func AmbilStatusKelulusanMahasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	mID := c.Params("id")
	var s models.PkkmbHasil

	query := config.DB.Preload("Mahasiswa")
	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.pkkmb_hasil.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.pkkmb_hasil.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	if err := query.Where("mahasiswa_id = ?", mID).First(&s).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Status tidak ditemukan atau Anda tidak memiliki akses"})
	}
	return c.JSON(fiber.Map{"status": "success", "data": s})
}

func AmbilDaftarKelulusanMaba(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	// Fallback to X-Faculty-ID header for SuperAdmin
	headerFid := c.Get("X-Faculty-ID")
	if headerFid != "" && headerFid != "undefined" && headerFid != "null" && headerFid != "all" {
		if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
			fid = uint(parsedFid)
			role = "faculty_admin"
		}
	}

	headerPid := c.Get("X-Prodi-ID")
	if headerPid != "" && headerPid != "undefined" && headerPid != "null" && headerPid != "all" {
		if parsedPid, err := strconv.ParseUint(headerPid, 10, 32); err == nil {
			c.Locals("program_studi_id", uint(parsedPid))
			role = "prodi_admin"
		}
	}

	var pa models.PengaturanAkademik
	config.DB.Order("id desc").First(&pa)
	activeYear := time.Now().Year()
	if len(pa.TahunAkademik) >= 4 {
		if year, err := strconv.Atoi(pa.TahunAkademik[:4]); err == nil {
			activeYear = year
		}
	}

	tahunParam := c.Query("tahun")

	var mabaList []models.Mahasiswa
	query := config.DB.Preload("ProgramStudi").Preload("Fakultas").Preload("Pengguna").Preload("PkkmbSertifikat")

	if tahunParam != "" && tahunParam != "all" {
		query = query.Where("tahun_masuk = ?", tahunParam)
	} else if tahunParam == "" {
		query = query.Where("tahun_masuk = ?", activeYear)
	}

	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND program_studi_id = ?", fid, pid)
	}

	query.Find(&mabaList)
	
	// Fetch scores for mapped maba
	var studentIDs []uint
	for _, m := range mabaList {
		studentIDs = append(studentIDs, m.ID)
	}
	
	scoreMap := make(map[uint]models.KencanaScore)
	if len(studentIDs) > 0 {
		var scores []models.KencanaScore
		config.DB.Where("student_id IN ?", studentIDs).Find(&scores)
		for _, s := range scores {
			scoreMap[s.StudentID] = s
		}
	}
	
	// Format to PkkmbHasil structure to prevent breaking frontend
	var list []models.PkkmbHasil
	for _, m := range mabaList {
		status := "Proses"
		nilai := float64(0)
		if s, ok := scoreMap[m.ID]; ok {
			nilai = s.FinalScore
			switch s.GraduationStatus {
			case "passed": status = "Lulus"
			case "not_eligible", "remedial", "dropped_out": status = "Gagal"
			}
		}
		
		list = append(list, models.PkkmbHasil{
			MahasiswaID: m.ID,
			Mahasiswa: m,
			Nilai: nilai,
			StatusKelulusan: status,
		})
	}

	return c.JSON(fiber.Map{"status": "success", "data": list})
}
