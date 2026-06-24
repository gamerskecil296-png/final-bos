package mahasiswa

import (
	"fmt"
	"math"
	"os"
	"path/filepath"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetStats returns count summary for student voice
func GetStats(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var total, diFakultas, diUniversitas, diProses, selesai int64

	config.DB.Model(&models.Aspirasi{}).Where("mahasiswa_id = ?", student.ID).Count(&total)
	config.DB.Model(&models.Aspirasi{}).
		Where("mahasiswa_id = ? AND status != ? AND (tujuan IS NULL OR TRIM(tujuan) = '' OR LOWER(TRIM(tujuan)) = ?)", student.ID, "Selesai", "fakultas").
		Count(&diFakultas)
	config.DB.Model(&models.Aspirasi{}).
		Where("mahasiswa_id = ? AND status != ? AND LOWER(TRIM(tujuan)) = ?", student.ID, "Selesai", "universitas").
		Count(&diUniversitas)
	config.DB.Model(&models.Aspirasi{}).Where("mahasiswa_id = ? AND status = ?", student.ID, "Diproses").Count(&diProses)
	config.DB.Model(&models.Aspirasi{}).Where("mahasiswa_id = ? AND status = ?", student.ID, "Selesai").Count(&selesai)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"total":          total,
			"di_fakultas":    diFakultas,
			"di_universitas": diUniversitas,
			"di_proses":      diProses,
			"selesai":        selesai,
		},
	})
}

func CreateAspirasi(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}
	config.DB.Preload("ProgramStudi").First(student, student.ID)

	var input struct {
		Judul    string `json:"judul"`
		Kategori string `json:"kategori"`
		Isi      string `json:"isi"`
		Tujuan   string `json:"tujuan"`
		IsAnonim bool   `json:"is_anonim"`
	}
	_ = c.BodyParser(&input)

	judul := firstNonEmpty(c.FormValue("judul"), input.Judul)
	kategori := firstNonEmpty(c.FormValue("kategori"), input.Kategori)
	isi := firstNonEmpty(c.FormValue("isi"), input.Isi)
	tujuan := strings.TrimSpace(firstNonEmpty(c.FormValue("tujuan"), input.Tujuan)) // Fakultas / Universitas
	isAnonim := c.FormValue("is_anonim") == "true" || input.IsAnonim

	if judul == "" || kategori == "" || isi == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Judul, kategori, dan isi wajib diisi"})
	}
	if tujuan == "" {
		tujuan = "Fakultas"
	}

	// Handle File Upload (Lampiran)
	var lampiranURL string
	file, err := c.FormFile("lampiran")
	if err == nil {
		// Validate File Size (Max 5MB)
		if file.Size > 5*1024*1024 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ukuran file melebihi 5MB"})
		}

		// Validate Extension
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".pdf" && ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format file hanya boleh PDF, JPG, atau PNG"})
		}

		// Create upload directory
		uploadDir := "./uploads/aspirasi"
		_ = os.MkdirAll(uploadDir, os.ModePerm)

		fileId := uuid.New().String()
		fileOutputName := fmt.Sprintf("%s%s", fileId, ext)
		savePath := filepath.Join(uploadDir, fileOutputName)

		if err := c.SaveFile(file, savePath); err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file lampiran"})
		}

		lampiranURL = "/uploads/aspirasi/" + fileOutputName
	}

	tiket := models.Aspirasi{
		MahasiswaID: student.ID,
		Kategori:    kategori,
		Judul:       judul,
		Isi:         isi,
		Tujuan:      tujuan,
		IsAnonim:    isAnonim,
		Status:      "Menunggu",
		LampiranURL: lampiranURL,
	}

	if err := config.DB.Create(&tiket).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan aspirasi"})
	}

	// Trigger Notification
	notifikasi.Kirim(config.DB, notifikasi.KirimParams{
		MahasiswaID: student.ID,
		Type:        "info",
		Title:       "Aspirasi Berhasil Dikirim",
		Content:     fmt.Sprintf("Aspirasi kamu ('%s') telah dikirim.", judul),
		Link:        "/student/voice",
	})

	logActivity(c, "voice", "Mengirim aspirasi: "+judul)

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Aspirasi berhasil dikirim",
		"data":    tiket,
	})
}

func GetAspirasiList(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	offset := (page - 1) * limit

	var total int64
	var tikets []models.Aspirasi

	query := config.DB.Model(&models.Aspirasi{}).Where("mahasiswa_id = ?", student.ID)
	query.Count(&total)
	query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&tikets)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"total":     total,
			"page":      page,
			"last_page": math.Ceil(float64(total) / float64(limit)),
			"list":      tikets,
		},
	})
}

func GetDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var tiket models.Aspirasi
	if err := config.DB.First(&tiket, "id = ? AND mahasiswa_id = ?", id, student.ID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Aspirasi tidak ditemukan"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    tiket,
	})
}

func CancelAspirasi(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var tiket models.Aspirasi
	if err := config.DB.First(&tiket, "id = ? AND mahasiswa_id = ?", id, student.ID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Aspirasi tidak ditemukan"})
	}

	if tiket.Status == "Selesai" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Aspirasi sudah selesai dan tidak dapat dibatalkan"})
	}

	if err := config.DB.Model(&tiket).Update("status", "Dibatalkan").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membatalkan aspirasi"})
	}

	logActivity(c, "voice", "Membatalkan aspirasi: "+tiket.Judul)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Aspirasi berhasil dibatalkan",
	})
}
