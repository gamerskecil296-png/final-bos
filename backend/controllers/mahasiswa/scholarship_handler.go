package mahasiswa

import (
	"fmt"
	"path/filepath"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// Pipeline Statuses
const (
	StatusMenunggu = "Menunggu"
	StatusProses   = "Proses"
	StatusDiterima = "Diterima"
	StatusDitolak  = "Ditolak"
)

// GetKatalogBeasiswa retrieves all active scholarships
func GetKatalogBeasiswa(c *fiber.Ctx) error {
	var beasiswaList []models.Beasiswa
	query := config.DB.Where("deadline > ?", time.Now())

	kategori := c.Query("kategori")
	if kategori != "" && kategori != "Semua" {
		query = query.Where("LOWER(kategori) = LOWER(?)", kategori)
	}

	sortParam := c.Query("sort")
	if sortParam == "nilai_desc" {
		query = query.Order("nilai_bantuan desc")
	} else {
		query = query.Order("deadline asc") // default deadline_asc
	}

	query.Find(&beasiswaList)

	// Fetch student's applications to inject dynamic status and application_status
	student, err := getStudent(c)
	appliedMap := make(map[uint]models.BeasiswaPendaftaran)
	if err == nil && student != nil {
		var riwayat []models.BeasiswaPendaftaran
		config.DB.Where("mahasiswa_id = ?", student.ID).Find(&riwayat)
		for _, r := range riwayat {
			appliedMap[r.BeasiswaID] = r
		}
	}

	var responseList []fiber.Map
	for _, b := range beasiswaList {
		status := "Open"
		var appStatus interface{} = nil
		var motivasi, ktmKtpURL, sertifikatURL, transkripURL, customAnswers interface{} = nil, nil, nil, nil, nil
		if app, exists := appliedMap[b.ID]; exists {
			status = "Applied"
			appStatus = app.Status
			motivasi = app.Motivasi
			ktmKtpURL = app.KtmKtpURL
			sertifikatURL = app.SertifikatURL
			transkripURL = app.TranskripURL
			customAnswers = app.CustomAnswers
		}
		responseList = append(responseList, fiber.Map{
			"id":                 b.ID,
			"created_at":         b.CreatedAt,
			"updated_at":         b.UpdatedAt,
			"nama":               b.Nama,
			"penyelenggara":      b.Penyelenggara,
			"deskripsi":          b.Deskripsi,
			"persyaratan":        b.Persyaratan,
			"deadline":           b.Deadline,
			"kuota":              b.Kuota,
			"ipk_min":            b.IPKMin,
			"kategori":           b.Kategori,
			"nilai_bantuan":      b.NilaiBantuan,
			"anggaran":           b.Anggaran,
			"status":             status,
			"application_status": appStatus,
			"motivasi":           motivasi,
			"ktm_ktp_url":        ktmKtpURL,
			"sertifikat_url":     sertifikatURL,
			"transkrip_url":      transkripURL,
			"custom_fields":      b.CustomFields,
			"custom_answers":     customAnswers,
			"file_ktm":           b.FileKtm,
			"file_transkrip":     b.FileTranskrip,
			"file_sertifikat":    b.FileSertifikat,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    responseList,
	})
}

// GetBeasiswaDetail retrieves detail info for a single scholarship
func GetBeasiswaDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	var beasiswa models.Beasiswa

	if err := config.DB.First(&beasiswa, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Beasiswa tidak ditemukan"})
	}

	student, err := getStudent(c)
	status := "Open"
	var appStatus interface{} = nil
	var motivasi, ktmKtpURL, sertifikatURL, transkripURL, customAnswers interface{} = nil, nil, nil, nil, nil
	if err == nil && student != nil {
		var app models.BeasiswaPendaftaran
		if err := config.DB.Where("mahasiswa_id = ? AND beasiswa_id = ?", student.ID, beasiswa.ID).First(&app).Error; err == nil {
			status = "Applied"
			appStatus = app.Status
			motivasi = app.Motivasi
			ktmKtpURL = app.KtmKtpURL
			sertifikatURL = app.SertifikatURL
			transkripURL = app.TranskripURL
			customAnswers = app.CustomAnswers
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":                 beasiswa.ID,
			"created_at":         beasiswa.CreatedAt,
			"updated_at":         beasiswa.UpdatedAt,
			"nama":               beasiswa.Nama,
			"penyelenggara":      beasiswa.Penyelenggara,
			"deskripsi":          beasiswa.Deskripsi,
			"persyaratan":        beasiswa.Persyaratan,
			"deadline":           beasiswa.Deadline,
			"kuota":              beasiswa.Kuota,
			"ipk_min":            beasiswa.IPKMin,
			"kategori":           beasiswa.Kategori,
			"nilai_bantuan":      beasiswa.NilaiBantuan,
			"anggaran":           beasiswa.Anggaran,
			"status":             status,
			"application_status": appStatus,
			"motivasi":           motivasi,
			"ktm_ktp_url":        ktmKtpURL,
			"sertifikat_url":     sertifikatURL,
			"transkrip_url":      transkripURL,
			"custom_fields":      beasiswa.CustomFields,
			"custom_answers":     customAnswers,
			"file_ktm":           beasiswa.FileKtm,
			"file_transkrip":     beasiswa.FileTranskrip,
			"file_sertifikat":    beasiswa.FileSertifikat,
		},
	})
}

// DaftarBeasiswa handles scholarship applications
func DaftarBeasiswa(c *fiber.Ctx) error {
	beasiswaID := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var beasiswa models.Beasiswa
	if err := config.DB.First(&beasiswa, beasiswaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Beasiswa tidak ditemukan"})
	}

	// VALIDATIONS
	if time.Now().After(beasiswa.Deadline) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Pendaftaran beasiswa ini sudah ditutup"})
	}

	// Check if student already has an accepted scholarship
	var accepted models.BeasiswaPendaftaran
	if err := config.DB.Preload("Beasiswa").Where("mahasiswa_id = ? AND status = ?", student.ID, "Diterima").First(&accepted).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": fmt.Sprintf("Anda sudah menerima beasiswa lain (%s) dan tidak dapat mendaftar lagi", accepted.Beasiswa.Nama),
		})
	}

	// Load existing application to verify existing file paths
	var existing models.BeasiswaPendaftaran
	config.DB.Where("mahasiswa_id = ? AND beasiswa_id = ?", student.ID, beasiswa.ID).First(&existing)

	// Validate required uploads
	ktmKtpUploaded := false
	if _, err := c.FormFile("ktm_ktp"); err == nil {
		ktmKtpUploaded = true
	} else if existing.ID != 0 && existing.KtmKtpURL != "" && c.FormValue("delete_ktm_ktp") != "true" {
		ktmKtpUploaded = true
	}
	if beasiswa.FileKtm == "wajib" && !ktmKtpUploaded {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kartu Tanda Mahasiswa & KTP wajib diunggah"})
	}

	// Dynamic file validation could also occur here but typically checked on frontend first

	transkripUploaded := false
	if _, err := c.FormFile("transkrip"); err == nil {
		transkripUploaded = true
	} else if existing.ID != 0 && existing.TranskripURL != "" && c.FormValue("delete_transkrip") != "true" {
		transkripUploaded = true
	}
	if beasiswa.FileTranskrip == "wajib" && !transkripUploaded {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Transkrip Nilai Akademik wajib diunggah"})
	}

	sertifikatUploaded := false
	if _, err := c.FormFile("sertifikat"); err == nil {
		sertifikatUploaded = true
	} else if existing.ID != 0 && existing.SertifikatURL != "" && c.FormValue("delete_sertifikat") != "true" {
		sertifikatUploaded = true
	}
	if beasiswa.FileSertifikat == "wajib" && !sertifikatUploaded {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Sertifikat Pendukung wajib diunggah"})
	}

	// HANDLE FILE UPLOAD (Bukti URL)
	var buktiURL string
	file, err := c.FormFile("berkas_utama") // Generic main file
	if err == nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		filename := fmt.Sprintf("beasiswa_%d_%s%s", student.ID, uuid.New().String()[:8], ext)
		savePath := "./uploads/scholarship/" + filename
		if err := c.SaveFile(file, savePath); err == nil {
			buktiURL = "/uploads/scholarship/" + filename
		}
	}

	// HANDLE SUPPORTING FILES UPLOAD
	var ktmKtpURL string
	if file, err := c.FormFile("ktm_ktp"); err == nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		filename := fmt.Sprintf("ktm_ktp_%d_%s%s", student.ID, uuid.New().String()[:8], ext)
		savePath := "./uploads/scholarship/" + filename
		if err := c.SaveFile(file, savePath); err == nil {
			ktmKtpURL = "/uploads/scholarship/" + filename
		}
	}

	var sertifikatURL string
	if file, err := c.FormFile("sertifikat"); err == nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		filename := fmt.Sprintf("sertifikat_%d_%s%s", student.ID, uuid.New().String()[:8], ext)
		savePath := "./uploads/scholarship/" + filename
		if err := c.SaveFile(file, savePath); err == nil {
			sertifikatURL = "/uploads/scholarship/" + filename
		}
	}

	var transkripURL string
	if file, err := c.FormFile("transkrip"); err == nil {
		ext := strings.ToLower(filepath.Ext(file.Filename))
		filename := fmt.Sprintf("transkrip_%d_%s%s", student.ID, uuid.New().String()[:8], ext)
		savePath := "./uploads/scholarship/" + filename
		if err := c.SaveFile(file, savePath); err == nil {
			transkripURL = "/uploads/scholarship/" + filename
		}
	}

	if existing.ID != 0 {
		if buktiURL != "" {
			existing.BuktiURL = buktiURL
		}

		if c.FormValue("delete_ktm_ktp") == "true" {
			existing.KtmKtpURL = ""
		} else if ktmKtpURL != "" {
			existing.KtmKtpURL = ktmKtpURL
		}

		if c.FormValue("delete_sertifikat") == "true" {
			existing.SertifikatURL = ""
		} else if sertifikatURL != "" {
			existing.SertifikatURL = sertifikatURL
		}

		if c.FormValue("delete_transkrip") == "true" {
			existing.TranskripURL = ""
		} else if transkripURL != "" {
			existing.TranskripURL = transkripURL
		}

		existing.Motivasi = c.FormValue("motivasi")
		existing.CustomAnswers = c.FormValue("custom_answers")
		// Update status back to StatusMenunggu if edited
		existing.Status = StatusMenunggu
		if err := config.DB.Save(&existing).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui pendaftaran"})
		}

		logActivity(c, "beasiswa", "Memperbarui pendaftaran beasiswa: "+beasiswa.Nama)
		return c.Status(200).JSON(fiber.Map{
			"success": true,
			"message": "Pendaftaran berhasil diperbarui",
			"data":    existing,
		})
	}

	// CREATE PENGAJUAN
	pengajuan := models.BeasiswaPendaftaran{
		MahasiswaID:   student.ID,
		BeasiswaID:    beasiswa.ID,
		Status:        StatusMenunggu,
		Catatan:       c.FormValue("catatan"),
		BuktiURL:      buktiURL,
		Motivasi:      c.FormValue("motivasi"),
		KtmKtpURL:     ktmKtpURL,
		SertifikatURL: sertifikatURL,
		TranskripURL:  transkripURL,
		CustomAnswers: c.FormValue("custom_answers"),
	}

	if err := config.DB.Create(&pengajuan).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan pendaftaran"})
	}

	// Trigger Notification
	notifikasi.Kirim(config.DB, notifikasi.KirimParams{
		MahasiswaID: student.ID,
		Type:        "beasiswa",
		Title:       "Pendaftaran Berhasil",
		Content:     "Pendaftaran beasiswa '" + beasiswa.Nama + "' berhasil dikirim. Menunggu verifikasi admin.",
		Link:        "/student/scholarship",
	})

	logActivity(c, "beasiswa", "Mendaftar beasiswa: "+beasiswa.Nama)

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Pendaftaran berhasil diajukan",
		"data":    pengajuan,
	})
}

// GetRiwayatPengajuan retrieves historical submissions
func GetRiwayatPengajuan(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var riwayat []models.BeasiswaPendaftaran
	config.DB.Preload("Beasiswa").Where("mahasiswa_id = ?", student.ID).Order("created_at desc").Find(&riwayat)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    riwayat,
	})
}

// GetPengajuanDetail retrieves detailed tracking info
func GetPengajuanDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var pengajuan models.BeasiswaPendaftaran
	if err := config.DB.Preload("Beasiswa").Where("id = ? AND mahasiswa_id = ?", id, student.ID).First(&pengajuan).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Pengajuan tidak ditemukan"})
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"pengajuan": pengajuan,
	})
}

// UploadScholarshipCustomFile handles uploads of custom files for dynamic requirements
func UploadScholarshipCustomFile(c *fiber.Ctx) error {
	_, err := getStudent(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Tidak terautentikasi"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "File wajib diunggah"})
	}

	// Validate size (max 5 MB)
	if file.Size > 5*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ukuran file maksimal 5 MB"})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("custom_req_%d_%s%s", time.Now().UnixNano(), uuid.New().String()[:8], ext)
	savePath := "./uploads/scholarship/" + filename

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file"})
	}

	fileURL := "/uploads/scholarship/" + filename
	return c.JSON(fiber.Map{"success": true, "url": fileURL, "message": "Berkas persyaratan berhasil diunggah"})
}
