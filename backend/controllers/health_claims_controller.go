package controllers

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"siakad-backend/utils"
	"strings"
	"time"
	"sync"
	"mime/multipart"
	"image"
	"image/jpeg"
	_ "image/png"
	"github.com/chai2010/webp"
	"golang.org/x/image/draw"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
	"gorm.io/gorm"
)

// ========================
// INSURANCE CLAIMS (MAHASISWA)
// ========================

func mapClaimToFrontend(claim models.PengajuanAsuransi) fiber.Map {
	var mhsMap fiber.Map = nil
	if claim.Mahasiswa.ID != 0 {
		prodiName := ""
		if claim.Mahasiswa.ProgramStudi.ID != 0 {
			prodiName = claim.Mahasiswa.ProgramStudi.Nama
		}
		fakName := ""
		if claim.Mahasiswa.Fakultas.ID != 0 {
			fakName = claim.Mahasiswa.Fakultas.Nama
		}

		mhsMap = fiber.Map{
			"id":   claim.Mahasiswa.ID,
			"nama": claim.Mahasiswa.Nama,
			"nim":  claim.Mahasiswa.NIM,
			"program_studi": fiber.Map{
				"id":   claim.Mahasiswa.ProgramStudiID,
				"nama": prodiName,
			},
			"fakultas": fiber.Map{
				"id":   claim.Mahasiswa.FakultasID,
				"nama": fakName,
			},
			"email_personal": claim.Mahasiswa.EmailPersonal,
			"no_hp":          claim.Mahasiswa.NoHP,
		}
	}

	// Dynamic PDF regeneration if missing on disk
	if (claim.Status == models.StatusAsuransiApprovedTK || claim.Status == models.StatusAsuransiApprovedFinal) && claim.SuratPengantarURL != "" {
		filePath := "." + claim.SuratPengantarURL
		if _, err := os.Stat(filePath); os.IsNotExist(err) {
			fullClaim := claim
			if fullClaim.Mahasiswa.ID == 0 {
				config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&fullClaim, claim.ID)
			}
			filename := fullClaim.SuratPengantarURL
			filename = strings.TrimPrefix(filename, "/uploads/surat/")
			filename = strings.TrimSuffix(filename, ".pdf")

			nomorSurat := fmt.Sprintf("%03d/Direktorat-LK/Klaim-Assurance/%d", claim.ID, time.Now().Year())

			_, errGen := BuildSuratPengantarPDF(fullClaim, nomorSurat, filename)
			if errGen != nil {
				log.Printf("[Asuransi] Gagal meregenerasi PDF surat pengantar: %v", errGen)
			}
		}
	}

	return fiber.Map{
		"id":                  claim.ID,
		"mahasiswa_id":        claim.MahasiswaID,
		"mahasiswa":           mhsMap,
		"jenis_provider":      claim.JenisProvider,
		"tanggal_kejadian":    claim.TanggalKejadian,
		"lokasi_faskes":       claim.LokasiFaskes,
		"deskripsi":           claim.Deskripsi,
		"estimasi_biaya":      claim.EstimasiBiaya,
		"file_url":            claim.FileURL,
		"file_url_2":          claim.FileURL2,
		"nama_file":           claim.NamaFile,
		"nama_file_2":         claim.NamaFile2,
		"status":              claim.Status,
		"catatan_review":      claim.CatatanReview,
		"reviewed_by":         claim.ReviewedBy,
		"reviewed_at":         claim.ReviewedAt,
		"surat_pengantar_url": claim.SuratPengantarURL,
		"created_at":          claim.CreatedAt,
		"updated_at":          claim.UpdatedAt,
	}
}

// GetInsuranceClaims - List all insurance claims (filtered by role)
func GetInsuranceClaims(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	// Base query with preloading
	query := config.DB.Model(&models.PengajuanAsuransi{}).Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi")

	// Role-based filtering
	switch role {
	case "mahasiswa", "student":
		// Mahasiswa hanya bisa lihat miliknya
		var mahasiswa models.Mahasiswa
		if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
		}
		query = query.Where("mahasiswa_id = ?", mahasiswa.ID)
	case "tenaga_kesehatan":
		// TK bisa lihat semua yang belum direview atau yang sudah dia review sendiri
		query = query.Where("status = ? OR reviewed_by = ?", models.StatusAsuransiPending, userID)
	case "super_admin":
		// Super admin bisa lihat semua
	default:
		// Admin fakultas bisa lihat based on fakultas
		var fakultasID *uint
		config.DB.Model(&models.User{}).Where("id = ?", userID).Pluck("fakultas_id", &fakultasID)
		if fakultasID != nil {
			query = query.Joins("JOIN mahasiswa.mahasiswa m ON m.id = pengajuan_asuransi.mahasiswa_id").
				Where("m.fakultas_id = ?", *fakultasID)
		}
	}

	// Apply filters
	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	jenisProvider := c.Query("jenis_provider")
	if jenisProvider != "" {
		query = query.Where("jenis_provider = ?", jenisProvider)
	}

	// Date range filter
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate != "" && endDate != "" {
		query = query.Where("tanggal_kejadian >= ? AND tanggal_kejadian <= ?", startDate, endDate+" 23:59:59")
	}

	var claims []models.PengajuanAsuransi
	if err := query.Order("created_at desc").Find(&claims).Error; err != nil {
		return err
	}

	var data []fiber.Map
	for _, claim := range claims {
		data = append(data, mapClaimToFrontend(claim))
	}

	return c.JSON(fiber.Map{"status": "success", "data": data})
}

// GetInsuranceClaimDetail - Get single insurance claim
func GetInsuranceClaimDetail(c *fiber.Ctx) error {
	claimID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	var claim models.PengajuanAsuransi
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&claim, claimID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Pengajuan tidak ditemukan")
	}

	// Check access
	if role == "mahasiswa" || role == "student" {
		var mahasiswa models.Mahasiswa
		if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
			return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
		}
		if claim.MahasiswaID != mahasiswa.ID {
			return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
		}
	}

	return c.JSON(fiber.Map{"status": "success", "data": mapClaimToFrontend(claim)})
}

// CreateInsuranceClaim - Create new insurance claim (Mahasiswa)
func CreateInsuranceClaim(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	// Only mahasiswa can create
	if role != "mahasiswa" && role != "student" {
		return fiber.NewError(fiber.StatusForbidden, "Hanya mahasiswa yang bisa mengajukan klaim")
	}

	// Find mahasiswa profile
	var mahasiswa models.Mahasiswa
	if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
	}

	var body struct {
		JenisProvider   string  `json:"jenis_provider"`
		TanggalKejadian string  `json:"tanggal_kejadian"`
		LokasiFaskes    string  `json:"lokasi_faskes"`
		Deskripsi       string  `json:"deskripsi"`
		EstimasiBiaya   float64 `json:"estimasi_biaya"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	// Validate required fields
	if body.JenisProvider == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Jenis provider wajib diisi")
	}
	if body.TanggalKejadian == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Tanggal kejadian wajib diisi")
	}
	if body.Deskripsi == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Deskripsi kronologis wajib diisi")
	}

	// Parse date
	parsedDate, err := time.Parse("2006-01-02", body.TanggalKejadian)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Format tanggal tidak valid (YYYY-MM-DD)")
	}

	// Create claim
	claim := models.PengajuanAsuransi{
		MahasiswaID:     mahasiswa.ID,
		JenisProvider:   body.JenisProvider,
		TanggalKejadian: parsedDate,
		LokasiFaskes:    body.LokasiFaskes,
		Deskripsi:       body.Deskripsi,
		EstimasiBiaya:   body.EstimasiBiaya,
		Status:          models.StatusAsuransiPending,
	}

	if err := config.DB.Create(&claim).Error; err != nil {
		return err
	}

	// Notify Super Admins
	var adminUsers []models.User
	if err := config.DB.Where("role = ?", "super_admin").Find(&adminUsers).Error; err == nil {
		for _, admin := range adminUsers {
			config.DB.Create(&models.Notifikasi{
				UserID:    admin.ID,
				Judul:     "Pengajuan Klaim Asuransi Baru",
				Deskripsi: fmt.Sprintf("Mahasiswa %s telah mengajukan klaim asuransi dengan provider %s.", mahasiswa.Nama, body.JenisProvider),
				Tipe:      "asuransi",
				IsRead:    false,
			})
		}
	}

	// Reload with mahasiswa data
	config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&claim, claim.ID)

	return c.JSON(fiber.Map{"status": "success", "data": mapClaimToFrontend(claim), "message": "Pengajuan klaim berhasil"})
}

// UpdateInsuranceClaim - Update claim (Mahasiswa only if pending)
func UpdateInsuranceClaim(c *fiber.Ctx) error {
	claimID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	if role != "mahasiswa" && role != "student" {
		return fiber.NewError(fiber.StatusForbidden, "Hanya mahasiswa yang bisa mengubah klaim")
	}

	var mahasiswa models.Mahasiswa
	if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
	}

	var claim models.PengajuanAsuransi
	if err := config.DB.First(&claim, claimID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Pengajuan tidak ditemukan")
	}

	if claim.MahasiswaID != mahasiswa.ID {
		return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
	}

	if claim.Status != models.StatusAsuransiPending {
		return fiber.NewError(fiber.StatusBadRequest, "Hanya pengajuan berstatus PENDING yang dapat diubah")
	}

	var body struct {
		JenisProvider   string  `json:"jenis_provider"`
		TanggalKejadian string  `json:"tanggal_kejadian"`
		LokasiFaskes    string  `json:"lokasi_faskes"`
		Deskripsi       string  `json:"deskripsi"`
		EstimasiBiaya   float64 `json:"estimasi_biaya"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	updates := map[string]interface{}{}
	if body.JenisProvider != "" {
		updates["jenis_provider"] = body.JenisProvider
	}
	if body.TanggalKejadian != "" {
		if parsed, err := time.Parse("2006-01-02", body.TanggalKejadian); err == nil {
			updates["tanggal_kejadian"] = parsed
		}
	}
	if body.LokasiFaskes != "" {
		updates["lokasi_faskes"] = body.LokasiFaskes
	}
	if body.Deskripsi != "" {
		updates["deskripsi"] = body.Deskripsi
	}
	if body.EstimasiBiaya > 0 {
		updates["estimasi_biaya"] = body.EstimasiBiaya
	}

	if err := config.DB.Model(&claim).Updates(updates).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal mengubah pengajuan")
	}

	config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&claim, claim.ID)
	return c.JSON(fiber.Map{"status": "success", "data": mapClaimToFrontend(claim), "message": "Pengajuan berhasil diubah"})
}

// DeleteInsuranceClaim - Delete claim (Mahasiswa only if pending)
func DeleteInsuranceClaim(c *fiber.Ctx) error {
	claimID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	if role != "mahasiswa" && role != "student" {
		return fiber.NewError(fiber.StatusForbidden, "Hanya mahasiswa yang bisa menghapus klaim")
	}

	var mahasiswa models.Mahasiswa
	if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
	}

	var claim models.PengajuanAsuransi
	if err := config.DB.First(&claim, claimID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Pengajuan tidak ditemukan")
	}

	if claim.MahasiswaID != mahasiswa.ID {
		return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
	}

	if claim.Status != models.StatusAsuransiPending {
		return fiber.NewError(fiber.StatusBadRequest, "Hanya pengajuan berstatus PENDING yang dapat dihapus")
	}

	if err := config.DB.Unscoped().Delete(&claim).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal menghapus pengajuan")
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Pengajuan berhasil dihapus"})
}

// UpdateInsuranceClaimStatus - Update status (TK/Admin review)
func UpdateInsuranceClaimStatus(c *fiber.Ctx) error {
	claimID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	// Only TK and admin can update status
	if role != "tenaga_kesehatan" && role != "super_admin" {
		return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
	}

	var body struct {
		Status        string `json:"status"`
		CatatanReview string `json:"catatan_review"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	// Validate status
	validStatuses := map[string]bool{
		models.StatusAsuransiPending:       true,
		models.StatusAsuransiApprovedTK:    true,
		models.StatusAsuransiApprovedFinal: true,
		models.StatusAsuransiRejected:      true,
	}

	if !validStatuses[body.Status] {
		return fiber.NewError(fiber.StatusBadRequest, "Status tidak valid")
	}

	var claim models.PengajuanAsuransi
	if err := config.DB.First(&claim, claimID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Pengajuan tidak ditemukan")
	}

	// Update claim
	now := time.Now().UTC()
	updates := map[string]interface{}{
		"status":         body.Status,
		"catatan_review": body.CatatanReview,
		"reviewed_by":    userID,
		"reviewed_at":    &now,
	}

	if body.Status == models.StatusAsuransiApprovedTK || body.Status == models.StatusAsuransiApprovedFinal {
		// Generate nomor surat if not generated yet
		if claim.SuratPengantarURL == "" {
			nomorSurat := fmt.Sprintf("%03s/Direktorat-LK/Klaim-Assurance/%d", claimID, now.Year())
			filename := fmt.Sprintf("surat_pengantar_klaim_%s_%d", claimID, now.Unix())
			updates["surat_pengantar_url"] = "/uploads/surat/" + filename + ".pdf"

			// Preload Mahasiswa data to generate the PDF
			var fullClaim models.PengajuanAsuransi
			if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&fullClaim, claimID).Error; err == nil {
				_, errGen := BuildSuratPengantarPDF(fullClaim, nomorSurat, filename)
				if errGen != nil {
					log.Printf("[Asuransi] Gagal generate PDF surat pengantar: %v", errGen)
				}
			} else {
				log.Printf("[Asuransi] Gagal load fullClaim untuk PDF: %v", err)
			}
		}
	}

	if err := config.DB.Model(&claim).Updates(updates).Error; err != nil {
		return err
	}

	// Reload
	config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&claim, claim.ID)

	// Send notification to mahasiswa
	go func() {
		var title, content string
		switch body.Status {
		case models.StatusAsuransiApprovedTK:
			title = "Klaim Asuransi Disetujui 🎉"
			content = "Pengajuan klaim asuransi Anda telah disetujui oleh Tenaga Kesehatan. Surat pengantar sedang dalam proses."
		case models.StatusAsuransiApprovedFinal:
			title = "Klaim Asuransi Final Approved ✅"
			content = "Pengajuan klaim asuransi Anda telah disetujui secara final."
		case models.StatusAsuransiRejected:
			title = "Klaim Asuransi Ditolak ❌"
			content = "Maaf, pengajuan klaim asuransi Anda ditolak. Catatan: " + body.CatatanReview
		}

		config.DB.Create(&models.Notifikasi{
			UserID:    claim.MahasiswaID,
			Judul:     title,
			Deskripsi: content,
			IsRead:    false,
		})
	}()

	return c.JSON(fiber.Map{"status": "success", "data": mapClaimToFrontend(claim), "message": "Status berhasil diperbarui"})
}

// UploadInsuranceDocument - Upload document for insurance claim
func UploadInsuranceDocument(c *fiber.Ctx) error {
	claimID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	var claim models.PengajuanAsuransi
	if err := config.DB.First(&claim, claimID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Pengajuan tidak ditemukan")
	}

	// Check ownership (mahasiswa only can upload to their own)
	if role == "mahasiswa" || role == "student" {
		var mahasiswa models.Mahasiswa
		if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
			return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
		}
		if claim.MahasiswaID != mahasiswa.ID {
			return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
		}
	}

	// Get file from form
	file, err := c.FormFile("file")
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "File tidak ditemukan")
	}

	// Validate file size (max 5MB)
	if file.Size > 5*1024*1024 {
		return fiber.NewError(fiber.StatusBadRequest, "Ukuran file maksimal 5MB")
	}

	// Validate file type
	ext := filepath.Ext(file.Filename)
	validExts := map[string]bool{".pdf": true, ".jpg": true, ".jpeg": true, ".png": true}
	if !validExts[ext] {
		return fiber.NewError(fiber.StatusBadRequest, "Format file tidak valid (pdf, jpg, png)")
	}

	// Generate filename
	filename := fmt.Sprintf("insurance_%s_%d%s", claimID, time.Now().Unix(), ext)
	saveDir := "uploads/insurance"
	if err := os.MkdirAll(saveDir, os.ModePerm); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat folder tujuan")
	}
	savePath := filepath.Join(saveDir, filename)

	// Save file
	if err := c.SaveFile(file, savePath); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal menyimpan file")
	}

	// Update claim
	dbPath := filepath.ToSlash(savePath)
	// Add leading slash if not present
	if !strings.HasPrefix(dbPath, "/") {
		dbPath = "/" + dbPath
	}
	updates := map[string]interface{}{
		"file_url":  dbPath,
		"nama_file": file.Filename,
	}

	// Check if second file
	docNum := c.FormValue("doc_number")
	if docNum == "2" {
		updates["file_url_2"] = dbPath
		updates["nama_file_2"] = file.Filename
	}

	config.DB.Model(&claim).Updates(updates)
	config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&claim, claim.ID)

	return c.JSON(fiber.Map{"status": "success", "data": mapClaimToFrontend(claim), "message": "Dokumen berhasil diupload"})
}

// GetInsuranceStats - Get insurance claim statistics
func GetInsuranceStats(c *fiber.Ctx) error {
	var stats struct {
		TotalPengajuan     int64   `json:"total_pengajuan"`
		Pending            int64   `json:"pending"`
		ApprovedTK         int64   `json:"approved_tk"`
		ApprovedFinal      int64   `json:"approved_final"`
		Rejected           int64   `json:"rejected"`
		TotalEstimasiBiaya float64 `json:"total_estimasi_biaya"`
	}

	// Total all
	config.DB.Model(&models.PengajuanAsuransi{}).Count(&stats.TotalPengajuan)
	config.DB.Model(&models.PengajuanAsuransi{}).Where("status = ?", models.StatusAsuransiPending).Count(&stats.Pending)
	config.DB.Model(&models.PengajuanAsuransi{}).Where("status = ?", models.StatusAsuransiApprovedTK).Count(&stats.ApprovedTK)
	config.DB.Model(&models.PengajuanAsuransi{}).Where("status = ?", models.StatusAsuransiApprovedFinal).Count(&stats.ApprovedFinal)
	config.DB.Model(&models.PengajuanAsuransi{}).Where("status = ?", models.StatusAsuransiRejected).Count(&stats.Rejected)
	config.DB.Model(&models.PengajuanAsuransi{}).Where("status IN ?", []string{models.StatusAsuransiApprovedTK, models.StatusAsuransiApprovedFinal}).Select("COALESCE(SUM(estimasi_biaya), 0)").Row().Scan(&stats.TotalEstimasiBiaya)

	// By provider
	type ProviderStats struct {
		Provider string  `json:"provider"`
		Count    int     `json:"count"`
		Total    float64 `json:"total"`
	}

	var byProvider []ProviderStats
	config.DB.Model(&models.PengajuanAsuransi{}).
		Where("status IN ?", []string{models.StatusAsuransiApprovedTK, models.StatusAsuransiApprovedFinal}).
		Select("jenis_provider as provider, count(*) as count, COALESCE(sum(estimasi_biaya), 0) as total").
		Group("jenis_provider").
		Scan(&byProvider)

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"summary":     stats,
			"by_provider": byProvider,
		},
	})
}

// ========================
// SELF-SCREENING (MAHASISWA)
// ========================

// GetSelfScreenings - Get all self-screenings (own for mahasiswa, all for TK/admin)
func GetSelfScreenings(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	query := config.DB.Model(&models.SelfScreening{}).Preload("Mahasiswa")

	switch role {
	case "mahasiswa", "student":
		// Find mahasiswa ID
		var mahasiswa models.Mahasiswa
		if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
		}
		query = query.Where("mahasiswa_id = ?", mahasiswa.ID)
	case "tenaga_kesehatan":
		// TK bisa filter by status
		isCompleted := c.Query("is_completed")
		if isCompleted == "true" {
			query = query.Where("is_completed_tk = ?", true)
		} else if isCompleted == "false" {
			query = query.Where("is_completed_tk = ?", false)
		}
	}

	// Date filter
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate != "" && endDate != "" {
		query = query.Where("created_at >= ? AND created_at <= ?", startDate, endDate+" 23:59:59")
	}

	var screenings []models.SelfScreening
	if err := query.Order("created_at desc").Find(&screenings).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"status": "success", "data": screenings})
}

// GetSelfScreeningDetail - Get single self-screening
func GetSelfScreeningDetail(c *fiber.Ctx) error {
	screeningID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	var screening models.SelfScreening
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&screening, screeningID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Data screening tidak ditemukan")
	}

	// Check access
	if role == "mahasiswa" || role == "student" {
		var mahasiswa models.Mahasiswa
		if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
			return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
		}
		if screening.MahasiswaID != mahasiswa.ID {
			return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
		}
	}

	// Get related data if exists
	if screening.BookingID != nil {
		var booking models.BookingKesehatan
		config.DB.Preload("Jadwal").First(&booking, *screening.BookingID)
		_ = booking // bisa ditambahkan ke response
	}

	return c.JSON(fiber.Map{"status": "success", "data": screening})
}

// CreateSelfScreening - Create new self-screening (Mahasiswa)
func CreateSelfScreening(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	// Find mahasiswa profile
	var mahasiswa models.Mahasiswa
	if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
	}

	var body struct {
		BookingID    *uint  `json:"booking_id"`
		KeluhanUtama string `json:"keluhan_utama"`
		SkalaNyeri   int    `json:"skala_nyeri"`
		AlergiObat   string `json:"alergi_obat"`
		KonsumsiObat string `json:"konsumsi_obat"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	// Validate
	if body.KeluhanUtama == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Keluhan utama wajib diisi")
	}

	// Skala nyeri validation
	if body.SkalaNyeri < 0 || body.SkalaNyeri > 10 {
		return fiber.NewError(fiber.StatusBadRequest, "Skala nyeri harus antara 0-10")
	}

	// Create screening
	screening := models.SelfScreening{
		MahasiswaID:   mahasiswa.ID,
		BookingID:     body.BookingID,
		KeluhanUtama:  body.KeluhanUtama,
		SkalaNyeri:    body.SkalaNyeri,
		AlergiObat:    body.AlergiObat,
		KonsumsiObat:  body.KonsumsiObat,
		IsCompletedTK: false,
	}

	if err := config.DB.Create(&screening).Error; err != nil {
		return err
	}

	// Reload with mahasiswa data
	config.DB.Preload("Mahasiswa").First(&screening, screening.ID)

	return c.JSON(fiber.Map{"status": "success", "data": screening, "message": "Data screening berhasil disimpan"})
}

// CompleteSelfScreening - Mark self-screening as completed by TK
func CompleteSelfScreening(c *fiber.Ctx) error {
	screeningID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	if role != "tenaga_kesehatan" && role != "super_admin" {
		return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
	}

	var screening models.SelfScreening
	if err := config.DB.First(&screening, screeningID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Data screening tidak ditemukan")
	}

	now := time.Now().UTC()
	updates := map[string]interface{}{
		"is_completed_tk": true,
		"screened_at":     &now,
		"tk_id":           userID,
	}

	if err := config.DB.Model(&screening).Updates(updates).Error; err != nil {
		return err
	}

	config.DB.Preload("Mahasiswa").First(&screening, screening.ID)

	// Notify mahasiswa
	go func() {
		config.DB.Create(&models.Notifikasi{
			UserID:    screening.MahasiswaID,
			Judul:     "Pemeriksaan Telah Selesai ✅",
			Deskripsi: "Data screening Anda telah diverifikasi oleh Tenaga Kesehatan. Silakan ke klinik untuk pemeriksaan lebih lanjut jika diperlukan.",
			IsRead:    false,
		})
	}()

	return c.JSON(fiber.Map{"status": "success", "data": screening, "message": "Screening ditandai selesai"})
}

// ========================
// BAP KESEHATAN (TENAGA KESEHATAN)
// ========================

// GetBAPs - Get all BAP Kesehatan
func GetBAPs(c *fiber.Ctx) error {
	query := config.DB.Model(&models.BeritaAcaraPemeriksaan{})

	// Filters
	eventID := c.Query("event_id")
	if eventID != "" {
		query = query.Where("event_id = ?", eventID)
	}

	status := c.Query("status")
	if status != "" {
		query = query.Where("status = ?", status)
	}

	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	if startDate != "" && endDate != "" {
		query = query.Where("tanggal_pelaksanaan >= ? AND tanggal_pelaksanaan <= ?", startDate, endDate+" 23:59:59")
	}

	var baps []models.BeritaAcaraPemeriksaan
	if err := query.Order("tanggal_pelaksanaan desc").Find(&baps).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"status": "success", "data": baps})
}

// GetBAPDetail - Get single BAP
func GetBAPDetail(c *fiber.Ctx) error {
	bapID := c.Params("id")

	var bap models.BeritaAcaraPemeriksaan
	if err := config.DB.First(&bap, bapID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "BAP tidak ditemukan")
	}

	// Get related event
	if bap.EventID != nil {
		var event models.PemeriksaanMassal
		config.DB.First(&event, *bap.EventID)
		_ = event
	}

	return c.JSON(fiber.Map{"status": "success", "data": bap})
}

// CreateBAP - Create new BAP
func CreateBAP(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)

	var body struct {
		EventID             *uint  `json:"event_id"`
		NamaKegiatan        string `json:"nama_kegiatan"`
		TanggalPelaksanaan  string `json:"tanggal_pelaksanaan"`
		WaktuMulai          string `json:"waktu_mulai"`
		WaktuSelesai        string `json:"waktu_selesai"`
		Tempat              string `json:"tempat"`
		JumlahPeserta       int    `json:"jumlah_peserta"`
		JumlahDiperiksa     int    `json:"jumlah_diperiksa"`
		TotalLayak          int    `json:"total_layak"`
		TotalPantauan       int    `json:"total_pantauan"`
		TotalTidakLayak     int    `json:"total_tidak_layak"`
		TtdKepalaDivisiNama string `json:"ttd_kepala_divisi_nama"`
		TtdKepalaDivisiNik  string `json:"ttd_kepala_divisi_nik"`
		TtdTimMedisNama     string `json:"ttd_tim_medis_nama"`
		TtdTimMedisNik      string `json:"ttd_tim_medis_nik"`
		FotoKegiatan        string `json:"foto_kegiatan"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	if body.NamaKegiatan == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Nama kegiatan wajib diisi")
	}

	// Parse date
	parsedDate, err := time.Parse("2006-01-02", body.TanggalPelaksanaan)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Format tanggal tidak valid")
	}

	bap := models.BeritaAcaraPemeriksaan{
		EventID:             body.EventID,
		TKID:                &userID,
		NamaKegiatan:        body.NamaKegiatan,
		TanggalPelaksanaan:  parsedDate,
		WaktuMulai:          body.WaktuMulai,
		WaktuSelesai:        body.WaktuSelesai,
		Tempat:              body.Tempat,
		JumlahPeserta:       body.JumlahPeserta,
		JumlahDiperiksa:     body.JumlahDiperiksa,
		TotalLayak:          body.TotalLayak,
		TotalPantauan:       body.TotalPantauan,
		TotalTidakLayak:     body.TotalTidakLayak,
		TTDKepalaDivisiNama: body.TtdKepalaDivisiNama,
		TTDKepalaDivisiNIK:  body.TtdKepalaDivisiNik,
		TTDTimMedisNama:     body.TtdTimMedisNama,
		TTDTimMedisNIK:      body.TtdTimMedisNik,
		FotoKegiatan:        body.FotoKegiatan,
		Status:              models.BAPStatusDraft,
		NomorSurat:          utils.GenerateDocumentNumber("BAP Kesehatan"),
	}

	if err := config.DB.Create(&bap).Error; err != nil {
		return err
	}

	config.DB.First(&bap, bap.ID)
	return c.JSON(fiber.Map{"status": "success", "data": bap, "message": "BAP berhasil dibuat"})
}

// UpdateBAP - Update BAP
func UpdateBAP(c *fiber.Ctx) error {
	bapID := c.Params("id")

	var bap models.BeritaAcaraPemeriksaan
	if err := config.DB.First(&bap, bapID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "BAP tidak ditemukan")
	}

	var body struct {
		NamaKegiatan        string `json:"nama_kegiatan"`
		TanggalPelaksanaan  string `json:"tanggal_pelaksanaan"`
		WaktuMulai          string `json:"waktu_mulai"`
		WaktuSelesai        string `json:"waktu_selesai"`
		Tempat              string `json:"tempat"`
		JumlahPeserta       int    `json:"jumlah_peserta"`
		JumlahDiperiksa     int    `json:"jumlah_diperiksa"`
		TotalLayak          int    `json:"total_layak"`
		TotalPantauan       int    `json:"total_pantauan"`
		TotalTidakLayak     int    `json:"total_tidak_layak"`
		Status              string `json:"status"`
		TtdKepalaDivisiNama string `json:"ttd_kepala_divisi_nama"`
		TtdKepalaDivisiNik  string `json:"ttd_kepala_divisi_nik"`
		TtdTimMedisNama     string `json:"ttd_tim_medis_nama"`
		TtdTimMedisNik      string `json:"ttd_tim_medis_nik"`
		FotoKegiatan        string `json:"foto_kegiatan"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	updates := map[string]interface{}{}

	if body.NamaKegiatan != "" {
		updates["nama_kegiatan"] = body.NamaKegiatan
	}
	if body.TanggalPelaksanaan != "" {
		if parsedDate, err := time.Parse("2006-01-02", body.TanggalPelaksanaan); err == nil {
			updates["tanggal_pelaksanaan"] = parsedDate
		}
	}
	if body.WaktuMulai != "" {
		updates["waktu_mulai"] = body.WaktuMulai
	}
	if body.WaktuSelesai != "" {
		updates["waktu_selesai"] = body.WaktuSelesai
	}
	if body.Tempat != "" {
		updates["tempat"] = body.Tempat
	}
	if body.JumlahPeserta >= 0 {
		updates["jumlah_peserta"] = body.JumlahPeserta
	}
	if body.JumlahDiperiksa >= 0 {
		updates["jumlah_diperiksa"] = body.JumlahDiperiksa
	}
	if body.TotalLayak >= 0 {
		updates["total_layak"] = body.TotalLayak
	}
	if body.TotalPantauan >= 0 {
		updates["total_pantauan"] = body.TotalPantauan
	}
	if body.TotalTidakLayak >= 0 {
		updates["total_tidak_layak"] = body.TotalTidakLayak
	}
	if body.Status != "" {
		updates["status"] = body.Status
	}
	if body.TtdKepalaDivisiNama != "" {
		updates["ttd_kepala_divisi_nama"] = body.TtdKepalaDivisiNama
	}
	if body.TtdKepalaDivisiNik != "" {
		updates["ttd_kepala_divisi_nik"] = body.TtdKepalaDivisiNik
	}
	if body.TtdTimMedisNama != "" {
		updates["ttd_tim_medis_nama"] = body.TtdTimMedisNama
	}
	if body.TtdTimMedisNik != "" {
		updates["ttd_tim_medis_nik"] = body.TtdTimMedisNik
	}
	if body.FotoKegiatan != "" {
		updates["foto_kegiatan"] = body.FotoKegiatan
	}

	if err := config.DB.Model(&bap).Updates(updates).Error; err != nil {
		return err
	}

	config.DB.First(&bap, bap.ID)
	return c.JSON(fiber.Map{"status": "success", "data": bap, "message": "BAP berhasil diperbarui"})
}

// DeleteBAP - Delete BAP
func DeleteBAP(c *fiber.Ctx) error {
	bapID := c.Params("id")

	var bap models.BeritaAcaraPemeriksaan
	if err := config.DB.First(&bap, bapID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "BAP tidak ditemukan")
	}

	if bap.Status == models.BAPStatusFinal {
		return fiber.NewError(fiber.StatusBadRequest, "BAP yang sudah FINAL tidak bisa dihapus")
	}

	config.DB.Unscoped().Delete(&bap)
	return c.JSON(fiber.Map{"status": "success", "message": "BAP berhasil dihapus"})
}

// UploadBAPPhotos - Upload multiple photos for BAP
func UploadBAPPhotos(c *fiber.Ctx) error {
	form, err := c.MultipartForm()
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Gagal memproses form data")
	}

	files := form.File["fotos"]
	if len(files) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Tidak ada file yang diupload")
	}

	var photoUrls []string
	saveDir := "uploads/bap/photos"
	if err := os.MkdirAll(saveDir, 0755); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat direktori upload")
	}

	var wg sync.WaitGroup
	var mu sync.Mutex
	var errUpload error

	for i, file := range files {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
			continue // Skip file non-image
		}

		wg.Add(1)
		go func(index int, f *multipart.FileHeader) {
			defer wg.Done()

			// Pastikan nama file unique meskipun diproses bersamaan dalam nanosecond yang sama
			uniqueID := fmt.Sprintf("%d_%d_%s", time.Now().UnixNano(), index, f.Filename)
			safeFileName := fmt.Sprintf("foto_%s", strings.ReplaceAll(strings.TrimSuffix(uniqueID, filepath.Ext(uniqueID)), " ", "_"))
			savePath := filepath.Join(saveDir, safeFileName+".webp")

			src, err := f.Open()
			if err != nil {
				mu.Lock()
				errUpload = err
				mu.Unlock()
				return
			}
			defer src.Close()

			img, _, err := image.Decode(src)
			if err != nil {
				mu.Lock()
				errUpload = err
				mu.Unlock()
				return
			}

			// Resize image before encoding to WebP to speed up upload
			bounds := img.Bounds()
			width := bounds.Dx()
			height := bounds.Dy()
			maxDim := 1000 // 1000px max
			if width > maxDim || height > maxDim {
				var newW, newH int
				if width > height {
					newW = maxDim
					newH = (height * maxDim) / width
				} else {
					newH = maxDim
					newW = (width * maxDim) / height
				}
				
				dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
				draw.ApproxBiLinear.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
				img = dst
			}

			outFile, err := os.Create(savePath)
			if err != nil {
				mu.Lock()
				errUpload = err
				mu.Unlock()
				return
			}
			defer outFile.Close()

			options := &webp.Options{Lossless: false, Quality: 85}
			if err := webp.Encode(outFile, img, options); err != nil {
				mu.Lock()
				errUpload = err
				mu.Unlock()
				return
			}

			mu.Lock()
			photoUrls = append(photoUrls, "/"+filepath.ToSlash(savePath))
			mu.Unlock()
		}(i, file)
	}

	wg.Wait()

	if errUpload != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal memproses beberapa gambar: "+errUpload.Error())
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": photoUrls,
	})
}

// ========================
// RUJUKAN KESEHATAN
// ========================

// CreateRujukan - Create new rujukan (TK only)
func CreateRujukan(c *fiber.Ctx) error {
	role := c.Locals("role").(string)

	if role != "tenaga_kesehatan" && role != "super_admin" {
		return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
	}

	var body struct {
		SelfScreeningID     *uint   `json:"self_screening_id"`
		KesehatanID         *uint   `json:"kesehatan_id"`
		MahasiswaID         uint    `json:"mahasiswa_id"`
		FaskesTujuan        string  `json:"faskes_tujuan"`
		AlasanRujukan       string  `json:"alasan_rujukan"`
		KeluhanUtama        string  `json:"keluhan_utama"`
		SuhuTubuh           float64 `json:"suhu_tubuh"`
		Sistole             int     `json:"sistole"`
		Diastole            int     `json:"diastole"`
		DenyutNadi          int     `json:"denyut_nadi"`
		RespirationRate     int     `json:"respiration_rate"`
		SpO2                int     `json:"spo2"`
		Diagnosis           string  `json:"diagnosis"`
		RekomendasiAsuransi string  `json:"rekomendasi_asuransi"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	if body.FaskesTujuan == "" || body.AlasanRujukan == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Faskes tujuan dan alasan rujukan wajib diisi")
	}

	rujukan := models.RujukanKesehatan{
		SelfScreeningID:     body.SelfScreeningID,
		KesehatanID:         body.KesehatanID,
		MahasiswaID:         body.MahasiswaID,
		FaskesTujuan:        body.FaskesTujuan,
		AlasanRujukan:       body.AlasanRujukan,
		KeluhanUtama:        body.KeluhanUtama,
		SuhuTubuh:           body.SuhuTubuh,
		Sistole:             body.Sistole,
		Diastole:            body.Diastole,
		DenyutNadi:          body.DenyutNadi,
		RespirationRate:     body.RespirationRate,
		SpO2:                body.SpO2,
		Diagnosis:           body.Diagnosis,
		RekomendasiAsuransi: body.RekomendasiAsuransi,
		IsPublished:         false,
		ApprovalStatus:      "pending",
		Status:              "Menunggu Persetujuan",
		NomorSurat:          utils.GenerateDocumentNumber("Rujukan Medis"),
	}

	if err := config.DB.Create(&rujukan).Error; err != nil {
		return err
	}

	// Update self_screening if linked
	if body.SelfScreeningID != nil {
		config.DB.Model(&models.SelfScreening{}).Where("id = ?", *body.SelfScreeningID).Updates(map[string]interface{}{
			"has_rujukan": true,
			"rujukan_id":  rujukan.ID,
		})
	}

	config.DB.Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").First(&rujukan, rujukan.ID)

	// Fetch screening if exists
	var screening models.Kesehatan
	if rujukan.SelfScreeningID != nil {
		config.DB.Preload("TenagaKes").First(&screening, *rujukan.SelfScreeningID)
	}

	// Generate initial PDF (only Tenaga Kes signature)
	pdfUrl, _, errGen := BuildMedisReferralLetterPDF(rujukan, screening)
	if errGen == nil && pdfUrl != "" {
		config.DB.Model(&rujukan).Update("surat_rujukan_url", pdfUrl)
		rujukan.SuratRujukanURL = pdfUrl
	} else {
		log.Printf("Failed to generate medis referral PDF: %v", errGen)
	}

	// Notify admins about new referral waiting for approval
	go func() {
		// 1. Notify SuperAdmin
		var adminUsers []models.User
		if err := config.DB.Where("role = ?", "super_admin").Find(&adminUsers).Error; err == nil {
			for _, admin := range adminUsers {
				_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
					UserID: admin.ID,
					Type:   "referral_medis",
					Title:  "Rujukan Medis Perlu Persetujuan 🔔",
					Content: fmt.Sprintf(
						"Tenaga Kesehatan telah mengajukan surat rujukan medis untuk mahasiswa %s. Harap tinjau dan berikan persetujuan di portal admin.",
						rujukan.Mahasiswa.Nama,
					),
					Link: "/admin/tenagakes/referrals",
				})
			}
		}

		// 2. Notify Mahasiswa
		if rujukan.MahasiswaID > 0 {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				MahasiswaID: rujukan.MahasiswaID,
				Type:        "referral_medis",
				Title:       "Surat Rujukan Medis Dibuat 📋",
				Content: fmt.Sprintf(
					"Tenaga Kesehatan telah membuat surat rujukan medis ke %s untuk Anda. Surat sedang menunggu persetujuan Kemahasiswaan sebelum dapat diunduh.",
					rujukan.FaskesTujuan,
				),
				Link: "/student/health",
			})
		}

		// 3. Notify Tenaga Kesehatan (if applicable)
		if rujukan.SelfScreeningID != nil && screening.TenagaKes != nil && screening.TenagaKes.UserID > 0 {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				UserID: screening.TenagaKes.UserID,
				Type:   "referral_medis",
				Title:  "Surat Rujukan Berhasil Diajukan 📋",
				Content: fmt.Sprintf(
					"Surat rujukan medis untuk %s berhasil diajukan dan sedang menunggu persetujuan Kemahasiswaan.",
					rujukan.Mahasiswa.Nama,
				),
				Link: "/tenagakes/referrals",
			})
		}
	}()

	return c.JSON(fiber.Map{"status": "success", "data": rujukan, "message": "Rujukan berhasil dibuat"})
}

// GetRujukans - Get all rujukans (filtered by role)
func GetRujukans(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	query := config.DB.Model(&models.RujukanKesehatan{}).Preload("Mahasiswa")

	switch role {
	case "mahasiswa", "student":
		var mahasiswa models.Mahasiswa
		if err := config.DB.Where("pengguna_id = ?", userID).First(&mahasiswa).Error; err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
		}
		// Only published rujukans for mahasiswa
		query = query.Where("mahasiswa_id = ? AND is_published = ?", mahasiswa.ID, true)
	case "tenaga_kesehatan":
		// Filter by published status
		isPublished := c.Query("is_published")
		if isPublished != "" {
			query = query.Where("is_published = ?", isPublished == "true")
		}
	}

	var rujukans []models.RujukanKesehatan
	if err := query.Order("created_at desc").Find(&rujukans).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"status": "success", "data": rujukans})
}

// GetRujukanDetail - Get single rujukan
func GetRujukanDetail(c *fiber.Ctx) error {
	rujukanID := c.Params("id")
	role := c.Locals("role").(string)

	var rujukan models.RujukanKesehatan
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").First(&rujukan, rujukanID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Rujukan tidak ditemukan")
	}

	// Check access
	if (role == "mahasiswa" || role == "student") && !rujukan.IsPublished {
		return fiber.NewError(fiber.StatusForbidden, "Rujukan belum dipublikasikan")
	}

	return c.JSON(fiber.Map{"status": "success", "data": rujukan})
}

// PublishRujukan - Publish rujukan (make available to mahasiswa)
func PublishRujukan(c *fiber.Ctx) error {
	rujukanID := c.Params("id")
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	if role != "tenaga_kesehatan" && role != "super_admin" {
		return fiber.NewError(fiber.StatusForbidden, "Akses ditolak")
	}

	var rujukan models.RujukanKesehatan
	if err := config.DB.First(&rujukan, rujukanID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Rujukan tidak ditemukan")
	}

	now := time.Now().UTC()
	updates := map[string]interface{}{
		"is_published": true,
		"published_at": &now,
		"published_by": &userID,
	}

	if err := config.DB.Model(&rujukan).Updates(updates).Error; err != nil {
		return err
	}

	config.DB.Preload("Mahasiswa").First(&rujukan, rujukan.ID)

	// Notify mahasiswa
	go func() {
		config.DB.Create(&models.Notifikasi{
			UserID:    rujukan.MahasiswaID,
			Judul:     "Surat Rujukan Siap Diunduh 📄",
			Deskripsi: "Surat rujukan ke " + rujukan.FaskesTujuan + " telah siap. Silakan download dari menu Kesehatan.",
			IsRead:    false,
		})
	}()

	return c.JSON(fiber.Map{"status": "success", "data": rujukan, "message": "Rujukan berhasil dipublikasikan"})
}

// ========================
// CLINICAL REPORTS
// ========================

// GetClinicalReports - Get clinical reports data
func GetClinicalReports(c *fiber.Ctx) error {
	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)

	// Date range
	startDate := c.Query("start_date", time.Now().AddDate(0, -1, 0).Format("2006-01-02"))
	endDate := c.Query("end_date", time.Now().Format("2006-01-02"))

	// Base query condition builder to ensure filters are applied consistently
	applyFilters := func(q *gorm.DB) *gorm.DB {
		q = q.Where("tanggal >= ? AND tanggal <= ?", startDate, endDate+" 23:59:59")
		if role == "tenaga_kesehatan" {
			var tk models.TenagaKesehatan
			if err := config.DB.Where("user_id = ?", userID).First(&tk).Error; err == nil {
				q = q.Where("tenaga_kes_id = ?", tk.ID)
			}
		}
		return q
	}

	// Summary stats
	var stats struct {
		TotalDiperiksa int64 `json:"total_diperiksa"`
		Layak          int64 `json:"layak"`
		PerluPerhatian int64 `json:"perlu_perhatian"`
		TidakLayak     int64 `json:"tidak_layak"`
	}

	applyFilters(config.DB.Model(&models.Kesehatan{})).Count(&stats.TotalDiperiksa)
	applyFilters(config.DB.Model(&models.Kesehatan{})).Where("hasil = ?", "Layak Kegiatan").Count(&stats.Layak)
	applyFilters(config.DB.Model(&models.Kesehatan{})).Where("hasil = ?", "Perlu Perhatian").Count(&stats.PerluPerhatian)
	applyFilters(config.DB.Model(&models.Kesehatan{})).Where("hasil = ?", "Tidak Layak").Count(&stats.TidakLayak)

	// Records
	var records []models.Kesehatan
	applyFilters(config.DB.Preload("Mahasiswa").Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Preload("TenagaKes")).
		Order("tanggal desc").
		Limit(100).Find(&records)

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"summary": stats,
			"records": records,
			"filters": fiber.Map{
				"start_date": startDate,
				"end_date":   endDate,
			},
		},
	})
}

// ========================
// PDF EXPORT HELPERS (STUBS)
// ========================

// ExportSuratPengantarPDF - Generate/Serve Surat Pengantar Klaim PDF
func ExportSuratPengantarPDF(c *fiber.Ctx) error {
	claimID := c.Params("id")

	var claim models.PengajuanAsuransi
	if err := config.DB.Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Fakultas").First(&claim, claimID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Pengajuan tidak ditemukan")
	}

	if claim.Status != models.StatusAsuransiApprovedTK {
		return fiber.NewError(fiber.StatusBadRequest, "Surat pengantar hanya tersedia untuk pengajuan yang telah disetujui Tenaga Kesehatan")
	}

	// Generate nomor surat if not exists
	if claim.SuratPengantarURL == "" {
		nomorSurat := utils.GenerateDocumentNumber("Klaim Asuransi Kesehatan")
		safeFileName := strings.ReplaceAll(nomorSurat, "/", "_")
		claim.SuratPengantarURL = "/uploads/surat/" + safeFileName + ".pdf"
		config.DB.Model(&claim).Update("surat_pengantar_url", claim.SuratPengantarURL)
	}

	filePath := "." + claim.SuratPengantarURL
	// Build/regenerate if file doesn't exist
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		filename := claim.SuratPengantarURL
		filename = strings.TrimPrefix(filename, "/uploads/surat/")
		filename = strings.TrimSuffix(filename, ".pdf")

		// Reconstruct nomor surat from filename
		nomorSurat := strings.ReplaceAll(filename, "_", "/")

		var errGen error
		filePath, errGen = BuildSuratPengantarPDF(claim, nomorSurat, filename)
		if errGen != nil {
			return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat PDF surat pengantar: "+errGen.Error())
		}
	}

	// Set header for file download
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=surat_pengantar_klaim_%s.pdf", claimID))
	return c.SendFile(filePath)
}

func ExportBAPPDF(c *fiber.Ctx) error {
	bapID := c.Params("id")

	var bap models.BeritaAcaraPemeriksaan
	if err := config.DB.First(&bap, bapID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "BAP tidak ditemukan")
	}

	// Build/regenerate file
	fileName := fmt.Sprintf("bap_%d.pdf", bap.ID)
	dirPath := "uploads/bap"
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat direktori PDF")
	}

	filePath := filepath.Join(dirPath, fileName)
	_ = os.Remove(filePath) // clean up old file if exists

	if err := BuildBAPPDF(bap, filePath); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat PDF BAP: "+err.Error())
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=bap_%s.pdf", bapID))
	return c.SendFile(filePath)
}

func getIndonesianDay(t time.Time) string {
	days := map[string]string{
		"Sunday":    "Minggu",
		"Monday":    "Senin",
		"Tuesday":   "Selasa",
		"Wednesday": "Rabu",
		"Thursday":  "Kamis",
		"Friday":    "Jumat",
		"Saturday":  "Sabtu",
	}
	return days[t.Format("Monday")]
}

func getIndonesianMonth(t time.Time) string {
	months := map[string]string{
		"January":   "Januari",
		"February":  "Februari",
		"March":     "Maret",
		"April":     "April",
		"May":       "Mei",
		"June":      "Juni",
		"July":      "Juli",
		"August":    "Agustus",
		"September": "September",
		"October":   "Oktober",
		"November":  "November",
		"December":  "Desember",
	}
	return months[t.Format("January")]
}

func BuildBAPPDF(bap models.BeritaAcaraPemeriksaan, filePath string) error {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 15, 20)
	pdf.SetAutoPageBreak(false, 0)
	
	pdf.SetHeaderFunc(func() {
		// Motif / Kop Background
		bgPath := "../frontend/public/images/bap_kesehatan_bg.jpg"
		if _, err := os.Stat(bgPath); err == nil {
			pdf.ImageOptions(bgPath, 0, 0, 210, 297, false, gofpdf.ImageOptions{ImageType: "JPEG", ReadDpi: true}, 0, "")
		}
	})
	
	pdf.AddPage()

	// Title
	pdf.SetFont("Helvetica", "B", 13)
	pdf.SetXY(20, 50)
	pdf.CellFormat(0, 7, "BERITA ACARA LAYANAN KESEHATAN", "", 1, "C", false, 0, "")

	// Nomor Surat
	pdf.SetFont("Helvetica", "", 10)
	nomorSurat := bap.NomorSurat
	if nomorSurat == "" {
		nomorSurat = fmt.Sprintf("%04d/BAP-KES/%d", bap.ID, bap.TanggalPelaksanaan.Year())
	}
	pdf.CellFormat(0, 5, fmt.Sprintf("Nomor: %s", nomorSurat), "", 1, "C", false, 0, "")
	pdf.Ln(8)

	// Opening statement
	pdf.SetFont("Helvetica", "", 11)
	pdf.SetX(20)
	indDay := getIndonesianDay(bap.TanggalPelaksanaan)
	indMonth := getIndonesianMonth(bap.TanggalPelaksanaan)
	formattedOpening := fmt.Sprintf("Pada hari ini %s, tanggal %d bulan %s tahun %d telah dilaksanakan Layanan Kesehatan sebagai berikut:", indDay, bap.TanggalPelaksanaan.Day(), indMonth, bap.TanggalPelaksanaan.Year())
	pdf.MultiCell(0, 6, formattedOpening, "", "J", false)
	pdf.Ln(4)

	// Fields
	pdf.SetX(25)
	pdf.CellFormat(45, 6, "Tanggal Pelaksanaan", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	formattedDate := fmt.Sprintf("%d %s %d", bap.TanggalPelaksanaan.Day(), indMonth, bap.TanggalPelaksanaan.Year())
	pdf.CellFormat(0, 6, formattedDate, "", 1, "L", false, 0, "")

	pdf.SetX(25)
	pdf.CellFormat(45, 6, "Waktu Pelaksanaan", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	waktu := fmt.Sprintf("%s - %s", bap.WaktuMulai, bap.WaktuSelesai)
	if bap.WaktuMulai == "" {
		waktu = "-"
	}
	pdf.CellFormat(0, 6, waktu, "", 1, "L", false, 0, "")

	pdf.SetX(25)
	pdf.CellFormat(45, 6, "Jumlah Mahasiswa", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	pdf.CellFormat(0, 6, fmt.Sprintf("%d Orang", bap.JumlahDiperiksa), "", 1, "L", false, 0, "")

	pdf.SetX(25)
	pdf.CellFormat(45, 6, "Tempat", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	pdf.CellFormat(0, 6, bap.Tempat, "", 1, "L", false, 0, "")

	pdf.SetX(25)
	pdf.CellFormat(45, 6, "Hasil", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	hasilText := fmt.Sprintf("Layak: %d, Pantauan: %d, Tidak Layak: %d", bap.TotalLayak, bap.TotalPantauan, bap.TotalTidakLayak)
	pdf.CellFormat(0, 6, hasilText, "", 1, "L", false, 0, "")
	pdf.Ln(8)

	// Closing statement
	pdf.SetX(20)
	pdf.MultiCell(0, 6, "Demikian Berita Acara Layanan Kesehatan. Atas perhatiannya kami ucapkan terimakasih.", "", "J", false)
	pdf.Ln(15)

	// Signatures
	pdf.SetX(130)
	pdf.CellFormat(0, 5, fmt.Sprintf("Bandung, %d %s %d", bap.TanggalPelaksanaan.Day(), indMonth, bap.TanggalPelaksanaan.Year()), "", 1, "C", false, 0, "")
	pdf.Ln(5)

	ySig := pdf.GetY()

	pdf.SetXY(20, ySig)
	pdf.CellFormat(80, 5, "Kepala Divisi Karir, Konseling dan Alumni", "", 1, "C", false, 0, "")
	pdf.Ln(25)
	pdf.SetX(20)
	pdf.SetFont("Helvetica", "U", 11)
	ttdDivNama := bap.TTDKepalaDivisiNama
	if ttdDivNama == "" {
		ttdDivNama = "                                                 "
	}
	pdf.CellFormat(80, 5, ttdDivNama, "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)
	pdf.SetX(20)
	ttdDivNik := "NIK. " + bap.TTDKepalaDivisiNIK
	if bap.TTDKepalaDivisiNIK == "" {
		ttdDivNik = "NIK."
	}
	pdf.CellFormat(80, 5, ttdDivNik, "", 1, "C", false, 0, "")

	pdf.SetXY(110, ySig)
	pdf.CellFormat(80, 5, "Tim Kesehatan", "", 1, "C", false, 0, "")
	pdf.Ln(25)
	pdf.SetX(110)
	pdf.SetFont("Helvetica", "U", 11)
	ttdTimNama := bap.TTDTimMedisNama
	if ttdTimNama == "" {
		ttdTimNama = "                                                 "
	}
	pdf.CellFormat(80, 5, ttdTimNama, "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)
	pdf.SetX(110)
	ttdTimNik := "NIK. " + bap.TTDTimMedisNIK
	if bap.TTDTimMedisNIK == "" {
		ttdTimNik = "NIK."
	}
	pdf.CellFormat(80, 5, ttdTimNik, "", 1, "C", false, 0, "")

	if bap.FotoKegiatan != "" {
		var photos []string
		if err := json.Unmarshal([]byte(bap.FotoKegiatan), &photos); err == nil && len(photos) > 0 {
			
			// Tambahkan halaman baru KHUSUS untuk lampiran foto
			pdf.AddPage()
			pdf.SetY(50) // Mulai dari bawah Kop Surat
			
			pdf.SetFont("Helvetica", "B", 11)
			pdf.SetX(20)
			pdf.CellFormat(0, 5, "Lampiran Dokumentasi Kegiatan", "", 1, "L", false, 0, "")
			pdf.Ln(10)

			// Siapkan slice untuk menyimpan file path gambar yang siap di-render
			readyImgPaths := make([]string, len(photos))
			
			// Konversi webp ke jpeg secara concurrent sebelum mem-build PDF
			var wg sync.WaitGroup
			for i, photoPath := range photos {
				wg.Add(1)
				go func(index int, pathStr string) {
					defer wg.Done()
					cleanPath := strings.TrimPrefix(pathStr, "/")
					if _, err := os.Stat(cleanPath); err == nil {
						finalImgPath := cleanPath
						
						if strings.HasSuffix(strings.ToLower(cleanPath), ".webp") {
							file, err := os.Open(cleanPath)
							if err == nil {
								img, err := webp.Decode(file)
								file.Close()
								if err == nil {
									// Resize image before encoding to JPEG to prevent PDF lag
									bounds := img.Bounds()
									width := bounds.Dx()
									height := bounds.Dy()
									
									// Max dimension to compress
									maxDim := 800
									if width > maxDim || height > maxDim {
										var newW, newH int
										if width > height {
											newW = maxDim
											newH = (height * maxDim) / width
										} else {
											newH = maxDim
											newW = (width * maxDim) / height
										}
										
										dst := image.NewRGBA(image.Rect(0, 0, newW, newH))
										draw.ApproxBiLinear.Scale(dst, dst.Bounds(), img, bounds, draw.Over, nil)
										img = dst
									}

									tempPath := fmt.Sprintf("%s_%d_%d.jpg", cleanPath, index, time.Now().UnixNano())
									out, err := os.Create(tempPath)
									if err == nil {
										if err := jpeg.Encode(out, img, &jpeg.Options{Quality: 60}); err == nil {
											finalImgPath = tempPath
										}
										out.Close()
									}
								}
							}
						}
						readyImgPaths[index] = finalImgPath
					}
				}(i, photoPath)
			}
			wg.Wait()

			pdf.SetX(20)
			pdf.SetFont("Helvetica", "", 10)
			yPos := pdf.GetY()
			drawnCount := 0
			
			for i, finalImgPath := range readyImgPaths {
				if finalImgPath == "" {
					continue // Gambar gagal diproses atau tidak ditemukan
				}
				
				col := drawnCount % 2
				
				// Max dimension for each image box
				boxW := 80.0
				boxH := 80.0
				rowSpacing := 85.0
				
				// Jika ini gambar kiri dan sisa halaman tidak cukup untuk 1 baris
				if col == 0 && yPos+boxH > 270 {
					pdf.AddPage()
					yPos = 50 // Mulai dari bawah Kop Surat agar tidak tumpang tindih
				}
				
				// Hitung koordinat X (kiri: 20, kanan: 110)
				xPos := 20.0
				if col == 1 {
					xPos = 110.0 // Kolom kanan
				}

				// Deteksi ukuran gambar agar proporsional di dalam kotak 80x80
				info := pdf.RegisterImageOptions(finalImgPath, gofpdf.ImageOptions{ReadDpi: true})
				imgDrawW := boxW
				imgDrawH := 0.0
				imgDrawX := xPos
				imgDrawY := yPos
				
				if info != nil {
					imgW := info.Width()
					imgH := info.Height()
					if imgW > 0 && imgH > 0 {
						aspect := imgH / imgW
						if aspect > 1.0 {
							// Portrait (Tinggi > Lebar)
							imgDrawH = boxH
							imgDrawW = imgDrawH / aspect
							imgDrawX = xPos + (boxW - imgDrawW) / 2 // Center horizontal
						} else {
							// Landscape (Lebar >= Tinggi)
							imgDrawW = boxW
							imgDrawH = imgDrawW * aspect
							// Batasi tinggi jika masih terlalu tinggi
							if imgDrawH > boxH {
								imgDrawH = boxH
								imgDrawW = imgDrawH / aspect
								imgDrawX = xPos + (boxW - imgDrawW) / 2
							}
							imgDrawY = yPos + (boxH - imgDrawH) / 2 // Center vertical
						}
					}
				}
				
				pdf.ImageOptions(finalImgPath, imgDrawX, imgDrawY, imgDrawW, imgDrawH, false, gofpdf.ImageOptions{ReadDpi: true}, 0, "")
				
				// Hapus file temp jika tadi kita bikin
				originalCleanPath := strings.TrimPrefix(photos[i], "/")
				if finalImgPath != originalCleanPath {
					os.Remove(finalImgPath)
				}
				
				// Beri spasi ke bawah untuk baris selanjutnya HANYA jika kolom kanan sudah terisi
				if col == 1 {
					yPos += rowSpacing
				}
				drawnCount++
			}
		}
	}

	return pdf.OutputFileAndClose(filePath)
}

// ExportRujukanPDF - Generate Rujukan Medis PDF
func ExportRujukanPDF(c *fiber.Ctx) error {
	id := c.Params("id")
	var rujukan models.RujukanKesehatan

	if err := config.DB.Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Fakultas").First(&rujukan, id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Rujukan tidak ditemukan")
	}

	var screening models.Kesehatan
	if rujukan.SelfScreeningID != nil {
		config.DB.Preload("TenagaKes").First(&screening, *rujukan.SelfScreeningID)
	}

	// Regenerate PDF if URL is empty or user requests to download it directly
	fullUrl, filePath, err := BuildMedisReferralLetterPDF(rujukan, screening)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal membuat PDF rujukan: "+err.Error())
	}

	if rujukan.SuratRujukanURL == "" {
		config.DB.Model(&rujukan).Update("surat_rujukan_url", fullUrl)
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Surat_Rujukan_Medis_%s.pdf\"", rujukan.Mahasiswa.Nama))
	return c.SendFile(filePath)
}

// BuildMedisReferralLetterPDF - Creates the medical referral PDF
func BuildMedisReferralLetterPDF(rujukan models.RujukanKesehatan, screening models.Kesehatan) (string, string, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(25, 45, 25) // Leave space for header
	pdf.SetAutoPageBreak(true, 15)
	pdf.AliasNbPages("")

	kopImage := "assets/kop_kesehatan2.jpg"

	pdf.SetHeaderFunc(func() {
		// Draw full A4 page background (210x297mm)
		if strings.HasSuffix(kopImage, ".jpg") || strings.HasSuffix(kopImage, ".jpeg") {
			pdf.ImageOptions(kopImage, 0, 0, 210, 297, false, gofpdf.ImageOptions{ImageType: "JPEG", ReadDpi: true}, 0, "")
		} else {
			pdf.ImageOptions(kopImage, 0, 0, 210, 297, false, gofpdf.ImageOptions{ReadDpi: true}, 0, "")
		}
	})

	pdf.AddPage()

	pdf.Ln(5)

	pdf.SetFont("Helvetica", "B", 13)
	pdf.CellFormat(0, 6, "FORMULIR RUJUKAN PELAYANAN KESEHATAN", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)
	pdf.CellFormat(0, 5, "UNIT KESEHATAN KAMPUS (UKK)", "", 1, "C", false, 0, "")
	pdf.CellFormat(0, 5, "Universitas Bhakti Kencana", "", 1, "C", false, 0, "")
	if rujukan.NomorSurat != "" {
		pdf.CellFormat(0, 5, fmt.Sprintf("Nomor: %s", rujukan.NomorSurat), "", 1, "C", false, 0, "")
	}

	pdf.Ln(8)

	// Helper function for rendering table rows
	renderTableRow := func(no, uraian, keterangan string) {
		pdf.SetFont("Helvetica", "", 10)
		lines := pdf.SplitLines([]byte(keterangan), 98)
		expectedH := float64(len(lines)) * 7.0
		if expectedH < 7.0 {
			expectedH = 7.0
		}

		if pdf.GetY()+expectedH > 275 {
			pdf.AddPage()
		}

		yStart := pdf.GetY()

		// MultiCell for Keterangan to support long texts
		pdf.SetXY(85, yStart)
		pdf.MultiCell(100, 7, keterangan, "1", "L", false)
		h := pdf.GetY() - yStart
		if h < 7.0 {
			h = 7.0
		}

		pdf.SetXY(25, yStart)
		pdf.CellFormat(10, h, no, "1", 0, "C", false, 0, "")
		pdf.CellFormat(50, h, uraian, "1", 0, "L", false, 0, "")
		pdf.SetY(yStart + h)
	}

	renderTableHeader := func(title string) {
		if pdf.GetY()+25 > 275 {
			pdf.AddPage()
		}
		pdf.SetFont("Helvetica", "B", 10)
		pdf.Cell(0, 8, title)
		pdf.Ln(8)

		pdf.SetFillColor(240, 240, 240)
		pdf.CellFormat(10, 7, "No", "1", 0, "C", true, 0, "")
		pdf.CellFormat(50, 7, "Uraian", "1", 0, "C", true, 0, "")
		pdf.CellFormat(100, 7, "Keterangan", "1", 0, "C", true, 0, "")
		pdf.Ln(7)
	}

	// A. IDENTITAS PASIEN
	renderTableHeader("A. IDENTITAS PASIEN")

	jk := "Laki-laki [ ]  Perempuan [ ]"
	if rujukan.Mahasiswa.JenisKelamin == "L" {
		jk = "Laki-laki [X]  Perempuan [ ]"
	} else if rujukan.Mahasiswa.JenisKelamin == "P" {
		jk = "Laki-laki [ ]  Perempuan [X]"
	}

	tglLahir := "......................................................."
	if !rujukan.Mahasiswa.TanggalLahir.IsZero() {
		tglLahir = rujukan.Mahasiswa.TanggalLahir.Format("02-01-2006")
	}

	renderTableRow("1", "Nama Lengkap", rujukan.Mahasiswa.Nama)
	renderTableRow("2", "NIM/NIP", rujukan.Mahasiswa.NIM)
	renderTableRow("3", "Program Studi", rujukan.Mahasiswa.ProgramStudi.Nama)
	renderTableRow("4", "Jenis Kelamin", jk)
	renderTableRow("5", "Tanggal Lahir", tglLahir)
	renderTableRow("6", "Nomor HP Aktif", rujukan.Mahasiswa.NoHP)

	pdf.Ln(6)

	// B. INFORMASI MEDIS
	renderTableHeader("B. INFORMASI MEDIS")

	ttv := fmt.Sprintf("TD: %d/%d mmHg   N: %d x/menit\nRR: %d x/menit     S: %.1f °C",
		rujukan.Sistole, rujukan.Diastole, rujukan.DenyutNadi, rujukan.RespirationRate, rujukan.SuhuTubuh)

	tindakan := screening.TindakanDiberikan
	if tindakan == "" {
		tindakan = "......................................................."
	}

	pemeriksaanFisik := screening.Hasil
	if pemeriksaanFisik == "" {
		pemeriksaanFisik = "......................................................."
	}

	renderTableRow("1", "Keluhan Utama", rujukan.KeluhanUtama)
	renderTableRow("2", "TTV (Tanda Vital)", ttv)
	renderTableRow("3", "Pemeriksaan Fisik Singkat", pemeriksaanFisik)
	renderTableRow("4", "Diagnosis Sementara", rujukan.Diagnosis)
	renderTableRow("5", "Tindakan Diberikan", tindakan)
	renderTableRow("6", "Alasan Rujukan", rujukan.AlasanRujukan)

	pdf.Ln(6)

	// C. INFORMASI RUJUKAN
	renderTableHeader("C. INFORMASI RUJUKAN")

	faskesStr := rujukan.FaskesTujuan

	namaTenagaKes := "......................................................."
	if screening.TenagaKes != nil {
		namaTenagaKes = screening.TenagaKes.Nama
	} else if screening.DiperiksaOleh != "" {
		namaTenagaKes = screening.DiperiksaOleh
	}

	catatan := screening.Catatan
	if catatan == "" {
		catatan = "......................................................."
	}

	renderTableRow("1", "Fasilitas Rujukan", faskesStr)
	renderTableRow("2", "Nakes Pengantar", namaTenagaKes)
	renderTableRow("3", "Catatan Tambahan", catatan)

	pdf.Ln(6)

	// D. TANDA TANGAN DAN PENGESAHAN
	if pdf.GetY()+45 > 275 {
		pdf.AddPage()
	}
	pdf.SetFont("Helvetica", "B", 10)
	pdf.Cell(0, 8, "D. TANDA TANGAN DAN PENGESAHAN")
	pdf.Ln(8)

	// Signature Block
	sigY := pdf.GetY()
	pdf.SetFont("Helvetica", "", 10)

	// Tenaga Kesehatan di Kanan
	pdf.SetXY(130, sigY)
	dateStr := fmt.Sprintf("Bandung, %s", time.Now().Format("02 Jan 2006"))
	if rujukan.TanggalDikirim != nil {
		dateStr = fmt.Sprintf("Bandung, %s", rujukan.TanggalDikirim.Format("02 Jan 2006"))
	}
	pdf.Cell(0, 5, dateStr)

	pdf.SetXY(130, sigY+5)
	pdf.Cell(0, 5, "Tenaga Kesehatan Pengantar,")

	// Signature space Tenaga Kesehatan
	pdf.SetXY(130, sigY+23)
	pdf.SetFont("Helvetica", "BU", 10)
	pdf.Cell(0, 5, namaTenagaKes)

	pdf.SetXY(130, sigY+28)
	pdf.SetFont("Helvetica", "", 9)
	pdf.SetTextColor(100, 116, 139)
	pdf.Cell(0, 4, "Unit Kesehatan Kampus (UKK)")

	// Jika rujukan sudah disetujui, tambahkan signature Kemahasiswaan di kiri
	if rujukan.ApprovalStatus == "disetujui" {
		adminName := "Kepala Bagian Kemahasiswaan"

		pdf.SetTextColor(15, 23, 42) // Slate 900
		pdf.SetXY(25, sigY+5)
		pdf.Cell(0, 5, "Mengetahui,")

		pdf.SetXY(25, sigY+10)
		pdf.Cell(0, 5, "Bagian Kemahasiswaan")

		// Signature space admin
		pdf.SetXY(25, sigY+23)
		pdf.SetFont("Helvetica", "BU", 10)
		pdf.Cell(0, 5, adminName)

		pdf.SetXY(25, sigY+28)
		pdf.SetFont("Helvetica", "", 9)
		pdf.SetTextColor(100, 116, 139)
		pdf.Cell(0, 4, "Direktorat Kemahasiswaan")
	}

	pdf.SetTextColor(15, 23, 42)
	pdf.SetY(sigY + 40)

	// Catatan
	pdf.SetFont("Helvetica", "B", 9)
	pdf.CellFormat(0, 5, "Catatan:", "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "I", 9)
	pdf.CellFormat(0, 5, "- Mohon membawa serta dokumen ini saat ke fasilitas rujukan.", "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 5, "- Simpan salinan sebagai dokumentasi UKK.", "", 1, "L", false, 0, "")

	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Helvetica", "I", 8)
		pdf.SetTextColor(128, 128, 128)
		pdf.CellFormat(0, 10, fmt.Sprintf("Surat ini di-generate secara otomatis oleh Sistem pada %s", time.Now().Format("2006-01-02 15:04")), "", 0, "C", false, 0, "")
	})

	dirPath := filepath.Dir("uploads/rujukan")
	os.MkdirAll(dirPath, 0755)

	fileName := fmt.Sprintf("rujukan_medis_%d_%d.pdf", rujukan.MahasiswaID, time.Now().Unix())
	filePath := filepath.Join(dirPath, fileName)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return "", "", err
	}

	fullUrl := "/uploads/rujukan/" + fileName
	return fullUrl, filePath, nil
}

func formatIndonesianDate(t time.Time) string {
	months := []string{"Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}
	if int(t.Month()) >= 1 && int(t.Month()) <= 12 {
		return fmt.Sprintf("%02d %s %d", t.Day(), months[t.Month()-1], t.Year())
	}
	return t.Format("02 January 2006")
}

func BuildSuratPengantarPDF(claim models.PengajuanAsuransi, nomorSurat string, filename string) (string, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	// Margin atas 42mm agar ada space bernafas di bawah garis kop surat
	pdf.SetMargins(25, 42, 25)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AliasNbPages("")

	pdf.SetHeaderFunc(func() {
		pdf.Image("assets/kop_asuransi_header.jpg", 0, 0, 210, 35, false, "JPEG", 0, "")
		pdf.SetDrawColor(180, 180, 180)
		pdf.Line(15, 36, 195, 36)
	})

	pdf.AddPage()

	pdf.SetFont("Helvetica", "", 11)
	pdf.SetTextColor(0, 0, 0)

	// Tempat dan Tanggal (Bahasa Indonesia)
	tanggalStr := formatIndonesianDate(time.Now())
	pdf.CellFormat(0, 5, fmt.Sprintf("Bandung, %s", tanggalStr), "", 1, "R", false, 0, "")
	pdf.Ln(6)

	// Header Info
	pdf.CellFormat(18, 5, "Nomor", "", 0, "L", false, 0, "")
	pdf.CellFormat(4, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 5, nomorSurat, "", 1, "L", false, 0, "")

	pdf.CellFormat(18, 5, "Lampiran", "", 0, "L", false, 0, "")
	pdf.CellFormat(4, 5, ":", "", 0, "L", false, 0, "")
	pdf.CellFormat(0, 5, "-", "", 1, "L", false, 0, "")

	pdf.CellFormat(18, 5, "Perihal", "", 0, "L", false, 0, "")
	pdf.CellFormat(4, 5, ":", "", 0, "L", false, 0, "")
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(0, 5, "Surat Pengantar Klaim Assurance", "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)
	pdf.Ln(8)

	// Kepada
	pdf.CellFormat(0, 5, "Kepada", "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 5, "Yth. Tim BKU Assurance", "", 1, "L", false, 0, "")
	pdf.CellFormat(0, 5, "di Tempat", "", 1, "L", false, 0, "")
	pdf.Ln(8)

	// Opening
	pdf.CellFormat(0, 5, "Dengan hormat,", "", 1, "L", false, 0, "")
	pdf.Ln(2)
	pdf.MultiCell(0, 6, "Bersama surat ini kami dari Direktorat Layanan Kemahasiswaan, mengajukan klaim asuransi mahasiswa dengan data sebagai berikut:", "", "J", false)
	pdf.Ln(4)

	// Student Data List (NOT 2 columns, just single column as in docx)
	pdf.SetX(35)
	pdf.CellFormat(35, 6, "Nama", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(0, 6, claim.Mahasiswa.Nama, "", 1, "L", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)

	pdf.SetX(35)
	pdf.CellFormat(35, 6, "NIM", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	pdf.CellFormat(0, 6, claim.Mahasiswa.NIM, "", 1, "L", false, 0, "")

	pdf.SetX(35)
	pdf.CellFormat(35, 6, "Program Studi", "", 0, "L", false, 0, "")
	pdf.CellFormat(5, 6, ":", "", 0, "C", false, 0, "")
	if claim.Mahasiswa.ProgramStudi.Nama != "" {
		pdf.CellFormat(0, 6, claim.Mahasiswa.ProgramStudi.Nama, "", 1, "L", false, 0, "")
	} else {
		pdf.CellFormat(0, 6, ".........................", "", 1, "L", false, 0, "")
	}
	pdf.Ln(6)

	// Body Paragraph
	tglKejadian := formatIndonesianDate(claim.TanggalKejadian)
	lokasiFaskes := claim.LokasiFaskes
	if lokasiFaskes == "" {
		lokasiFaskes = "...................."
	}

	kronologiStr := fmt.Sprintf("Mahasiswa tersebut diatas mengalami kejadian kesehatan pada %s dan telah melakukan pemeriksaan dan/atau penanganan kesehatan di Rumah Sakit/klinik %s. Berdasarkan penilaian kami, yang bersangkutan memenuhi syarat untuk pengajuan klaim asuransi.", tglKejadian, lokasiFaskes)
	pdf.MultiCell(0, 6, kronologiStr, "", "J", false)
	pdf.Ln(4)

	// Closing
	pdf.MultiCell(0, 6, "Bersama ini kami lampirkan dokumen pendukung yang diperlukan untuk proses klaim. Kami mohon bantuan dari pihak BKU Assurance untuk memproses klaim asuransi sesuai dengan ketentuan yang berlaku. Atas perhatian dan kerjasamanya, kami ucapkan terima kasih.", "", "J", false)
	pdf.Ln(12)

	// Signature Section
	pdf.CellFormat(0, 5, "Mengetahui,", "", 1, "L", false, 0, "")
	pdf.Ln(5)

	ySig := pdf.GetY()

	// Left Signature
	pdf.SetXY(25, ySig)
	pdf.CellFormat(80, 5, "Universitas Bhakti Kencana", "", 2, "C", false, 0, "")
	pdf.CellFormat(80, 5, "Direktur Layanan Kemahasiswaan", "", 2, "C", false, 0, "")
	pdf.Ln(25)
	pdf.SetX(25)
	pdf.CellFormat(80, 5, "Ttd + Cap", "", 2, "C", false, 0, "")
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(80, 5, "................................", "", 2, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)
	pdf.CellFormat(80, 5, "NIK ...........................", "", 2, "C", false, 0, "")

	// Right Signature
	pdf.SetXY(110, ySig)
	pdf.CellFormat(80, 5, "Universitas Bhakti Kencana", "", 2, "C", false, 0, "")
	pdf.CellFormat(80, 5, "Kepala Divisi Konseling, Karir, dan Alumni", "", 2, "C", false, 0, "")
	pdf.Ln(25)
	pdf.SetX(110)
	pdf.CellFormat(80, 5, "Ttd", "", 2, "C", false, 0, "")
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(80, 5, "................................", "", 2, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 11)
	pdf.CellFormat(80, 5, "NIK. ...........................", "", 2, "C", false, 0, "")

	dirPath := filepath.Dir("uploads/surat/" + filename + ".pdf")
	if err := os.MkdirAll(dirPath, 0755); err != nil {
		return "", err
	}

	filePath := "uploads/surat/" + filename + ".pdf"
	_ = os.Remove(filePath)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return "", err
	}

	return filePath, nil
}
