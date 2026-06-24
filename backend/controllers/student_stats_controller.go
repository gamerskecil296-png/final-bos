package controllers

import (
	"fmt"
	"os"
	"time"
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
	"gorm.io/gorm"
)

func GetStudentStats(c *fiber.Ctx) error {
	type StatsResponse struct {
		TotalData        int64                    `json:"total_data"`
		Terverifikasi    int64                    `json:"terverifikasi"`
		Anomali          int64                    `json:"anomali"`
		Aktif            int64                    `json:"aktif"`
		Cuti             int64                    `json:"cuti"`
		Lulus            int64                    `json:"lulus"`
		Keluar           int64                    `json:"keluar"`
		LakiLaki         int64                    `json:"laki_laki"`
		Perempuan        int64                    `json:"perempuan"`
		AvgIpk           float64                  `json:"avg_ipk"`
		AtRisk           int64                    `json:"at_risk"`
		DataAnomalyRate  float64                  `json:"data_anomaly_rate"`
		FacultyData      []map[string]interface{} `json:"faculty_data"`
		TrendData        []map[string]interface{} `json:"trend_data"`
		FacultyIpk       []map[string]interface{} `json:"faculty_ipk"`
		TopSekolah       []map[string]interface{} `json:"top_sekolah"`
		TopKota          []map[string]interface{} `json:"top_kota"`
		AgeDistribution         []map[string]interface{} `json:"age_distribution"`
		SistemKuliahData        []map[string]interface{} `json:"sistem_kuliah_data"`
		KategoriUktData         []map[string]interface{} `json:"kategori_ukt_data"`
		SchoolIpk               []map[string]interface{} `json:"school_ipk"`
		UktDropout              []map[string]interface{} `json:"ukt_dropout"`
		OrmawaIpk               []map[string]interface{} `json:"ormawa_ipk"`
		PsychVulnerability      []map[string]interface{} `json:"psych_vulnerability"`
		RetentionTrend          []map[string]interface{} `json:"retention_trend"`
		StatusDist              []map[string]interface{} `json:"status_dist"`
	}

	var stats StatsResponse

	// Base query with filters
	angkatan := c.Query("angkatan")
	status := c.Query("statusAkun") // keeping query param name for backward compatibility

	getBaseQuery := func() *gorm.DB {
		q := config.DB.Model(&models.Mahasiswa{}).Where("deleted_at IS NULL")
		if angkatan != "" && angkatan != "all" && angkatan != "undefined" && angkatan != "null" {
			q = q.Where("tahun_masuk = ?", angkatan)
		}
		if status != "" && status != "undefined" && status != "null" && status != "all" {
			q = q.Where("status_akademik = ?", status)
		}
		return q
	}

	// Total Terverifikasi
	getBaseQuery().Count(&stats.Terverifikasi)

	// Anomaly checking logic: empty NIK, NISN, or Nama Ibu Kandung
	var anomalyCount int64
	getBaseQuery().Where("nik IS NULL OR nik = '' OR nisn IS NULL OR nisn = '' OR nama_ibu_kandung IS NULL OR nama_ibu_kandung = ''").Count(&anomalyCount)
	stats.Anomali = anomalyCount
	stats.TotalData = stats.Terverifikasi

	if stats.TotalData > 0 {
		stats.DataAnomalyRate = (float64(stats.Anomali) / float64(stats.TotalData)) * 100
	}

	// Status counts — using actual values from the database:
	// Aktif, Lulus, Mengajukan pengunduran diri, Dikeluarkan, Transfer, Meninggal dunia, Mutasi
	getBaseQuery().Where("status_akademik = ?", "Aktif").Count(&stats.Aktif)
	getBaseQuery().Where("status_akademik ILIKE ?", "%Cuti%").Count(&stats.Cuti)
	getBaseQuery().Where("status_akademik = ?", "Lulus").Count(&stats.Lulus)
	// "Keluar" = Mengajukan pengunduran diri + Dikeluarkan + Transfer + Mutasi + Meninggal dunia
	getBaseQuery().Where("status_akademik NOT IN (?, ?) AND status_akademik IS NOT NULL AND status_akademik != ''", "Aktif", "Lulus").Count(&stats.Keluar)

	// Status Distribution directly from DB (Dynamic mapping for UI)
	var statusCounts []struct {
		Status string `gorm:"column:status_akademik"`
		Count  int64  `gorm:"column:count"`
	}
	getBaseQuery().Select("COALESCE(NULLIF(status_akademik, ''), 'Tidak Diketahui') as status_akademik, count(*) as count").
		Group("COALESCE(NULLIF(status_akademik, ''), 'Tidak Diketahui')").
		Order("count DESC").
		Scan(&statusCounts)

	stats.StatusDist = make([]map[string]interface{}, 0)
	for _, s := range statusCounts {
		stats.StatusDist = append(stats.StatusDist, map[string]interface{}{
			"name":  s.Status,
			"count": s.Count,
		})
	}

	// Gender counts
	getBaseQuery().Where("jenis_kelamin = ?", "L").Count(&stats.LakiLaki)
	getBaseQuery().Where("jenis_kelamin = ?", "P").Count(&stats.Perempuan)

	// At Risk (Aktif but IPK < 2.0)
	getBaseQuery().Where("status_akademik = ? AND ipk > 0 AND ipk < 2.0", "Aktif").Count(&stats.AtRisk)

	// Avg IPK
	type IpkResult struct {
		AvgIpk float64
	}
	var ipkRes IpkResult
	getBaseQuery().Select("COALESCE(AVG(ipk), 0) as avg_ipk").Where("ipk > 0").Scan(&ipkRes)
	stats.AvgIpk = ipkRes.AvgIpk

	// Prepare table aliases for grouped queries
	getDbGroup := func() *gorm.DB {
		q := config.DB.Table("mahasiswa.mahasiswa m").Where("m.deleted_at IS NULL")
		if angkatan != "" && angkatan != "all" && angkatan != "undefined" && angkatan != "null" {
			q = q.Where("m.tahun_masuk = ?", angkatan)
		}
		if status != "" && status != "undefined" && status != "null" && status != "all" {
			q = q.Where("m.status_akademik = ?", status)
		}
		return q
	}

	// Faculty Data (Donut Chart)
	getDbGroup().Select("COALESCE(f.nama, 'Lainnya') as name, COUNT(m.id) as count").
		Joins("LEFT JOIN fakultas.fakultas f ON m.fakultas_id = f.id").
		Group("f.nama").
		Order("count DESC").
		Find(&stats.FacultyData)

	// Enrollment Trend Data (Bar + Line)
	dbGroupTrend := config.DB.Table("mahasiswa.mahasiswa m").Where("m.deleted_at IS NULL")
	if status != "" && status != "undefined" && status != "null" && status != "all" {
		dbGroupTrend = dbGroupTrend.Where("m.status_akademik = ?", status)
	}
	dbGroupTrend.Select("CAST(m.tahun_masuk AS VARCHAR) as name, COUNT(m.id) as value, SUM(CASE WHEN m.status_akademik = 'Aktif' THEN 1 ELSE 0 END) as aktif, SUM(CASE WHEN m.status_akademik = 'Lulus' THEN 1 ELSE 0 END) as lulus").
		Where("m.tahun_masuk > 0").
		Group("m.tahun_masuk").
		Order("m.tahun_masuk asc").
		Find(&stats.TrendData)

	// Faculty IPK Data (Bar Chart)
	getDbGroup().Select("COALESCE(f.nama, 'Lainnya') as name, COALESCE(AVG(m.ipk), 0) as \"Rerata IPK\"").
		Joins("LEFT JOIN fakultas.fakultas f ON m.fakultas_id = f.id").
		Where("m.ipk > 0").
		Group("f.nama").
		Order("\"Rerata IPK\" DESC").
		Find(&stats.FacultyIpk)

	// Asal Sekolah (All)
	getDbGroup().Select("COALESCE(m.asal_sekolah, 'Tidak Diketahui') as name, COUNT(m.id) as count").
		Where("m.asal_sekolah IS NOT NULL AND m.asal_sekolah != ''").
		Group("m.asal_sekolah").
		Order("count DESC").
		Find(&stats.TopSekolah)

	// Kota/Kabupaten (All) — FIX: column is "kota" not "kabupaten_kota"
	getDbGroup().Select("COALESCE(m.kota, 'Tidak Diketahui') as name, COUNT(m.id) as count").
		Where("m.kota IS NOT NULL AND m.kota != ''").
		Group("m.kota").
		Order("count DESC").
		Find(&stats.TopKota)

	// Sistem Kuliah
	getDbGroup().Select("COALESCE(m.sistem_kuliah, 'Tidak Diketahui') as name, COUNT(m.id) as count").
		Where("m.sistem_kuliah IS NOT NULL AND m.sistem_kuliah != ''").
		Group("m.sistem_kuliah").
		Order("count DESC").
		Find(&stats.SistemKuliahData)

	// Kategori UKT
	getDbGroup().Select("COALESCE(m.kategori_ukt, 'Tidak Diketahui') as name, COUNT(m.id) as count").
		Where("m.kategori_ukt IS NOT NULL AND m.kategori_ukt != ''").
		Group("m.kategori_ukt").
		Order("count DESC").
		Find(&stats.KategoriUktData)

	// Age Distribution — FIX: tanggal_lahir is timestamptz, use EXTRACT() not SUBSTRING()
	getDbGroup().Select(`
		CASE 
			WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.tanggal_lahir)) < 18 THEN '< 18 thn'
			WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.tanggal_lahir)) BETWEEN 18 AND 22 THEN '18-22 thn'
			WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.tanggal_lahir)) BETWEEN 23 AND 27 THEN '23-27 thn'
			WHEN EXTRACT(YEAR FROM AGE(CURRENT_DATE, m.tanggal_lahir)) > 27 THEN '> 27 thn'
			ELSE 'Unknown'
		END as name,
		COUNT(m.id) as count
	`).
		Where("m.tanggal_lahir IS NOT NULL").
		Group("name").
		Order("name ASC").
		Find(&stats.AgeDistribution)

	// 1. Kualitas Input vs Output (Asal Sekolah vs Rata-rata IPK)
	getDbGroup().Select("COALESCE(m.asal_sekolah, 'Tidak Diketahui') as name, COUNT(m.id) as count, COALESCE(AVG(m.ipk), 0) as avg_ipk").
		Where("m.ipk > 0 AND m.asal_sekolah IS NOT NULL AND m.asal_sekolah != ''").
		Group("m.asal_sekolah").
		Having("COUNT(m.id) > 2"). // Only schools with more than 2 students for statistical significance
		Order("avg_ipk DESC").
		Limit(10).
		Find(&stats.SchoolIpk)

	// 2. Analisis Risiko Finansial (UKT vs Dropout/Keluar/Non-Aktif)
	// FIX: use actual status_akademik values from database
	getDbGroup().Select("COALESCE(m.kategori_ukt, 'Tidak Diketahui') as name, COUNT(m.id) as dropout_count").
		Where("m.status_akademik IN ('Mengajukan pengunduran diri', 'Dikeluarkan', 'Transfer', 'Mutasi') AND m.kategori_ukt IS NOT NULL AND m.kategori_ukt != ''").
		Group("m.kategori_ukt").
		Order("dropout_count DESC").
		Find(&stats.UktDropout)

	// 3. Dampak Kegiatan Non-Akademik (Ormawa vs IPK)
	getDbGroup().Select(`
		CASE WHEN o.id IS NOT NULL THEN 'Aktivis Ormawa' ELSE 'Mahasiswa Reguler' END as name,
		COUNT(DISTINCT m.id) as count,
		COALESCE(AVG(m.ipk), 0) as avg_ipk
	`).
		Joins("LEFT JOIN ormawa.ormawa_anggota o ON m.id = o.mahasiswa_id AND o.status_anggota = 'Aktif'").
		Where("m.ipk > 0 AND m.status_akademik = 'Aktif'").
		Group("CASE WHEN o.id IS NOT NULL THEN 'Aktivis Ormawa' ELSE 'Mahasiswa Reguler' END").
		Find(&stats.OrmawaIpk)

	// 4. Peta Kesejahteraan & Beban Mental (Konseling/Assessments per Fakultas)
	getDbGroup().Select("COALESCE(f.nama, 'Lainnya') as name, COUNT(p.id) as counseling_count").
		Joins("LEFT JOIN fakultas.fakultas f ON m.fakultas_id = f.id").
		Joins("JOIN psikolog.bookings p ON m.id = p.mahasiswa_id").
		Group("f.nama").
		Order("counseling_count DESC").
		Find(&stats.PsychVulnerability)

	// 5. Tren Retensi Cuti/Mangkir — FIX: use actual status values
	dbGroupTrendRetention := config.DB.Table("mahasiswa.mahasiswa m").Where("m.deleted_at IS NULL")
	if status != "" && status != "undefined" && status != "null" && status != "all" {
		dbGroupTrendRetention = dbGroupTrendRetention.Where("m.status_akademik = ?", status)
	}
	dbGroupTrendRetention.Select("CAST(m.tahun_masuk AS VARCHAR) as name, COUNT(m.id) as count").
		Where("m.status_akademik IN ('Mengajukan pengunduran diri', 'Dikeluarkan', 'Transfer', 'Mutasi', 'Meninggal dunia') AND m.tahun_masuk > 0").
		Group("m.tahun_masuk").
		Order("m.tahun_masuk ASC").
		Find(&stats.RetentionTrend)

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   stats,
	})
}

// GenerateExecutiveReportPDF generates a PDF report containing top level metrics
func GenerateExecutiveReportPDF(c *fiber.Ctx) error {
	angkatan := c.Query("angkatan")
	status := c.Query("statusAkun")

	var terverifikasi, aktif, lulus, cuti, keluar int64
	var avgIpk float64

	q := config.DB.Model(&models.Mahasiswa{}).Where("deleted_at IS NULL")
	if angkatan != "" && angkatan != "all" && angkatan != "undefined" && angkatan != "null" {
		q = q.Where("tahun_masuk = ?", angkatan)
	}
	if status != "" && status != "undefined" && status != "null" && status != "all" {
		q = q.Where("status_akademik = ?", status)
	}

	q.Count(&terverifikasi)
	q.Session(&gorm.Session{}).Where("status_akademik = ?", "Aktif").Count(&aktif)
	q.Session(&gorm.Session{}).Where("status_akademik = ?", "Lulus").Count(&lulus)
	q.Session(&gorm.Session{}).Where("status_akademik = ?", "Cuti").Count(&cuti)
	q.Session(&gorm.Session{}).Where("status_akademik IN ('Mengajukan pengunduran diri', 'Dikeluarkan', 'Mutasi', 'Meninggal dunia', 'Transfer')").Count(&keluar)
	
	q.Session(&gorm.Session{}).Where("ipk > 0").Select("COALESCE(AVG(ipk), 0)").Scan(&avgIpk)

	lainnya := terverifikasi - (aktif + lulus)

	type NameCount struct {
		Name  string
		Count int64
	}

	var topKota []NameCount
	q.Session(&gorm.Session{}).Select("COALESCE(kota, 'Tidak Diketahui') as name, COUNT(id) as count").
		Where("kota IS NOT NULL AND kota != ''").
		Group("kota").
		Order("count DESC").
		Limit(10).
		Scan(&topKota)

	var topSekolah []NameCount
	q.Session(&gorm.Session{}).Select("COALESCE(asal_sekolah, 'Tidak Diketahui') as name, COUNT(id) as count").
		Where("asal_sekolah IS NOT NULL AND asal_sekolah != ''").
		Group("asal_sekolah").
		Order("count DESC").
		Limit(10).
		Scan(&topSekolah)

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()

	// Colors
	primaryR, primaryG, primaryB := 26, 54, 93 // Dark Blue (BKU Theme)
	accentR, accentG, accentB := 245, 167, 70   // Orange/Gold

	// Logo (Centered at the top)
	logoPath := "../frontend/public/images/bku logo.png"
	// Check if logo exists
	if _, err := os.Stat(logoPath); err == nil {
		// x=90, y=10, w=30 (Centers a 30mm logo on a 210mm wide page)
		pdf.ImageOptions(logoPath, 90, 10, 30, 0, false, gofpdf.ImageOptions{ImageType: "PNG", ReadDpi: true}, 0, "")
		pdf.SetY(45)
	} else {
		// Fallback space if logo is missing
		pdf.SetY(20)
	}

	// Header Text
	pdf.SetTextColor(primaryR, primaryG, primaryB)
	pdf.SetFont("Arial", "B", 18)
	pdf.CellFormat(190, 10, "EXECUTIVE REPORT", "", 1, "C", false, 0, "")
	
	pdf.SetTextColor(50, 50, 50)
	pdf.SetFont("Arial", "B", 14)
	pdf.CellFormat(190, 8, "Analitik & Demografi Mahasiswa", "", 1, "C", false, 0, "")
	
	pdf.SetFont("Arial", "", 10)
	pdf.SetTextColor(100, 100, 100)
	pdf.CellFormat(190, 6, "Universitas Bhakti Kencana", "", 1, "C", false, 0, "")
	pdf.CellFormat(190, 6, fmt.Sprintf("Tanggal Cetak: %s", time.Now().Format("02 Jan 2006 15:04:05")), "", 1, "C", false, 0, "")
	
	// Filter Info
	filterText := "Semua Angkatan"
	if angkatan != "" && angkatan != "all" && angkatan != "undefined" && angkatan != "null" {
		filterText = "Angkatan " + angkatan
	}
	pdf.SetTextColor(accentR, accentG, accentB)
	pdf.SetFont("Arial", "B", 10)
	pdf.CellFormat(190, 6, fmt.Sprintf("Filter: %s", filterText), "", 1, "C", false, 0, "")

	// Decorative Line
	pdf.Ln(5)
	pdf.SetDrawColor(primaryR, primaryG, primaryB)
	pdf.SetLineWidth(0.5)
	pdf.Line(15, pdf.GetY(), 195, pdf.GetY())
	pdf.Ln(10)

	// Metrik Utama Title
	pdf.SetTextColor(primaryR, primaryG, primaryB)
	pdf.SetFont("Arial", "B", 12)
	pdf.SetX(15)
	pdf.CellFormat(180, 10, "1. Ringkasan Metrik Utama", "", 1, "L", false, 0, "")
	pdf.Ln(2)

	// Table settings
	pdf.SetDrawColor(220, 220, 220)
	pdf.SetLineWidth(0.2)
	
	// Center the table. Width is 160. Margin is (210-160)/2 = 25
	startX := 25.0

	// Table Header
	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 11)
	pdf.SetX(startX)
	pdf.CellFormat(100, 10, "Indikator", "1", 0, "C", true, 0, "")
	pdf.CellFormat(60, 10, "Jumlah", "1", 1, "C", true, 0, "")

	// Table Body helper
	drawRow := func(label string, value string, isZebra bool) {
		pdf.SetX(startX)
		if isZebra {
			pdf.SetFillColor(248, 250, 252) // Very light slate
		} else {
			pdf.SetFillColor(255, 255, 255) // White
		}
		
		pdf.SetTextColor(70, 70, 70)
		pdf.SetFont("Arial", "", 11)
		pdf.CellFormat(100, 10, "  "+label, "1", 0, "L", true, 0, "")
		
		pdf.SetTextColor(primaryR, primaryG, primaryB)
		pdf.SetFont("Arial", "B", 11)
		pdf.CellFormat(60, 10, value+"  ", "1", 1, "R", true, 0, "")
	}

	drawRow("Total Mahasiswa Terverifikasi", fmt.Sprintf("%d", terverifikasi), false)
	drawRow("Status Aktif", fmt.Sprintf("%d", aktif), true)
	drawRow("Total Lulus (Alumni)", fmt.Sprintf("%d", lulus), false)
	drawRow("Status Lainnya (Cuti/DO/Keluar)", fmt.Sprintf("%d", lainnya), true)
	drawRow("IPK Rata-Rata", fmt.Sprintf("%.2f", avgIpk), false)

	pdf.Ln(10)

	// Helper to draw secondary tables
	drawSecondaryTable := func(title string, data []NameCount) {
		// Check page break
		if pdf.GetY() > 220 {
			pdf.AddPage()
			pdf.SetY(20)
		}

		pdf.SetTextColor(primaryR, primaryG, primaryB)
		pdf.SetFont("Arial", "B", 12)
		pdf.SetX(15)
		pdf.CellFormat(180, 10, title, "", 1, "L", false, 0, "")
		pdf.Ln(2)

		pdf.SetDrawColor(220, 220, 220)
		pdf.SetLineWidth(0.2)
		
		pdf.SetFillColor(primaryR, primaryG, primaryB)
		pdf.SetTextColor(255, 255, 255)
		pdf.SetFont("Arial", "B", 11)
		pdf.SetX(startX)
		pdf.CellFormat(100, 8, "Nama/Area", "1", 0, "C", true, 0, "")
		pdf.CellFormat(60, 8, "Jumlah", "1", 1, "C", true, 0, "")

		for i, item := range data {
			pdf.SetX(startX)
			if i%2 == 1 {
				pdf.SetFillColor(248, 250, 252)
			} else {
				pdf.SetFillColor(255, 255, 255)
			}
			
			pdf.SetTextColor(70, 70, 70)
			pdf.SetFont("Arial", "", 10)
			
			// Truncate name if too long
			nameStr := item.Name
			if len(nameStr) > 45 {
				nameStr = nameStr[:42] + "..."
			}
			
			pdf.CellFormat(100, 8, "  "+nameStr, "1", 0, "L", true, 0, "")
			
			pdf.SetTextColor(primaryR, primaryG, primaryB)
			pdf.SetFont("Arial", "B", 10)
			pdf.CellFormat(60, 8, fmt.Sprintf("%d  ", item.Count), "1", 1, "R", true, 0, "")
		}
		pdf.Ln(10)
	}

	drawSecondaryTable("2. Top 10 Wilayah Asal Mahasiswa", topKota)
	drawSecondaryTable("3. Top 10 Asal Sekolah", topSekolah)

	// Check page break for footer text
	if pdf.GetY() > 250 {
		pdf.AddPage()
		pdf.SetY(20)
	}

	// Keterangan Box (Quotation style)
	pdf.SetX(15)
	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(accentR, accentG, accentB)
	pdf.SetLineWidth(0.8)
	pdf.SetFont("Arial", "I", 9)
	pdf.SetTextColor(120, 120, 120)
	
	// Drawing a left border for the info box
	yStart := pdf.GetY()
	pdf.MultiCell(180, 6, " Dokumen ini dicetak secara otomatis oleh SIAKAD BKU Student Hub. Data yang ditampilkan adalah data waktu nyata (real-time) sesuai dengan sinkronisasi terakhir dari Pangkalan Data Dikti dan sistem akademik lokal.", "", "L", true)
	yEnd := pdf.GetY()
	pdf.Line(15, yStart, 15, yEnd)

	// Footer (Page Numbers) on all pages
	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Arial", "I", 8)
		pdf.SetTextColor(150, 150, 150)
		pdf.CellFormat(0, 10, fmt.Sprintf("Halaman %d - Dokumen Rahasia Universitas Bhakti Kencana", pdf.PageNo()), "", 0, "C", false, 0, "")
	})

	// Output PDF to response
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "attachment; filename=\"Executive_Report.pdf\"")
	return pdf.Output(c.Response().BodyWriter())
}
