package ormawa

import (
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"

	"github.com/gofiber/fiber/v2"
)

// --- RINGKASAN & MONITORING (UNTUK DASHBOARD ORMAWA) ---

func AmbilRingkasanPkkmb(c *fiber.Ctx) error {
	var totalMaba int64
	var totalLulus int64
	var totalProses int64

	config.DB.Model(&models.PkkmbHasil{}).Count(&totalMaba)
	config.DB.Model(&models.PkkmbHasil{}).Where("status_kelulusan = ?", "Lulus").Count(&totalLulus)
	config.DB.Model(&models.PkkmbHasil{}).Where("status_kelulusan = ?", "Proses").Count(&totalProses)

	// Breakdown per Prodi
	type ProdiStats struct {
		ID          uint    `json:"id"`
		Prodi       string  `json:"prodi"`
		Partisipasi float64 `json:"partisipasi"`
		Nilai       float64 `json:"nilai"`
		Status      string  `json:"status"`
	}

	var prodis []models.ProgramStudi
	config.DB.Find(&prodis)

	var listStats []ProdiStats
	for _, p := range prodis {
		var mabaProdi int64
		config.DB.Model(&models.PkkmbHasil{}).
			Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.pkkmb_hasil.mahasiswa_id").
			Where("mahasiswa.mahasiswa.prodi_id = ?", p.ID).
			Count(&mabaProdi)

		var mabaLulus int64
		config.DB.Model(&models.PkkmbHasil{}).
			Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.pkkmb_hasil.mahasiswa_id").
			Where("mahasiswa.mahasiswa.prodi_id = ?", p.ID).
			Where("mahasiswa.pkkmb_hasil.status_kelulusan = ?", "Lulus").
			Count(&mabaLulus)

		var avgNilai float64
		config.DB.Model(&models.PkkmbHasil{}).
			Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.pkkmb_hasil.mahasiswa_id").
			Where("mahasiswa.mahasiswa.prodi_id = ?", p.ID).
			Select("COALESCE(AVG(mahasiswa.pkkmb_hasil.nilai), 0)").
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
			"totalMaba":   totalMaba,
			"totalLulus":  totalLulus,
			"totalProses": totalProses,
		},
		"prodiBreakdown": listStats,
	})
}

func AmbilDaftarKelulusanMaba(c *fiber.Ctx) error {
	var list []models.PkkmbHasil
	config.DB.Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Pengguna").Find(&list)
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func AmbilDaftarBandingPkkmb(c *fiber.Ctx) error {
	var list []models.PkkmbBanding
	query := config.DB.Preload("Mahasiswa.ProgramStudi").Order("created_at desc")
	if status := strings.TrimSpace(c.Query("status")); status != "" {
		query = query.Where("LOWER(status) = LOWER(?)", status)
	}
	if err := query.Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil data banding"})
	}
	return c.JSON(fiber.Map{"status": "success", "data": list})
}

func ReviewBandingPkkmb(c *fiber.Ctx) error {
	id := c.Params("id")
	var banding models.PkkmbBanding
	if err := config.DB.First(&banding, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Banding tidak ditemukan"})
	}

	var payload struct {
		Approved *bool  `json:"approved"`
		Status   string `json:"status"`
		Catatan  string `json:"catatan"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload review tidak valid"})
	}

	status := strings.TrimSpace(payload.Status)
	if status == "" && payload.Approved != nil {
		if *payload.Approved {
			status = "Disetujui"
		} else {
			status = "Ditolak"
		}
	}
	if status == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Status review wajib diisi"})
	}

	if err := config.DB.Model(&banding).Update("status", status).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui status banding"})
	}
	banding.Status = status

	return c.JSON(fiber.Map{"status": "success", "message": "Banding berhasil direview", "data": banding})
}

// --- KEGIATAN (AGENDA) CRUD ORMAWA ---

func AmbilDaftarKegiatanPkkmb(c *fiber.Ctx) error {
	var k []models.PkkmbKegiatan
	config.DB.Order("tanggal asc").Find(&k)
	return c.JSON(fiber.Map{"status": "success", "data": k})
}

func TambahKegiatanPkkmb(c *fiber.Ctx) error {
	var k models.PkkmbKegiatan
	if err := c.BodyParser(&k); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Gagal memproses data"})
	}
	config.DB.Create(&k)
	return c.Status(201).JSON(fiber.Map{"status": "success", "data": k})
}

func UpdateKegiatanPkkmb(c *fiber.Ctx) error {
	id := c.Params("id")
	var k models.PkkmbKegiatan
	if err := config.DB.First(&k, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kegiatan tidak ditemukan"})
	}
	if err := c.BodyParser(&k); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}
	config.DB.Save(&k)
	return c.JSON(fiber.Map{"status": "success", "data": k, "message": "Kegiatan berhasil diperbarui"})
}

func HapusKegiatanPkkmb(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.PkkmbKegiatan{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus kegiatan"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Kegiatan berhasil dihapus"})
}

// --- MATERI / MODUL (MISSIONS) CRUD ORMAWA ---

func AmbilDaftarMateriPkkmb(c *fiber.Ctx) error {
	var m []models.PkkmbMateri
	config.DB.Order("id asc").Find(&m)
	return c.JSON(fiber.Map{"status": "success", "data": m})
}

func TambahMateriPkkmb(c *fiber.Ctx) error {
	var m models.PkkmbMateri
	if err := c.BodyParser(&m); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Gagal memproses data materi"})
	}
	config.DB.Create(&m)
	return c.Status(201).JSON(fiber.Map{"status": "success", "data": m})
}

func UpdateMateriPkkmb(c *fiber.Ctx) error {
	id := c.Params("id")
	var m models.PkkmbMateri
	if err := config.DB.First(&m, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Materi tidak ditemukan"})
	}
	if err := c.BodyParser(&m); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data materi tidak valid"})
	}
	config.DB.Save(&m)
	return c.JSON(fiber.Map{"status": "success", "data": m, "message": "Materi berhasil diperbarui"})
}

func HapusMateriPkkmb(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.PkkmbMateri{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus materi"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Materi berhasil dihapus"})
}
