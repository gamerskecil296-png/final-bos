package ormawa

import (
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
)

// ============================================================
// KATEGORI ORMAWA — CRUD
// Master data kategori ormawa dengan flag TerafiliasiFakultas
// yang menentukan alur proposal (via Fakultas atau langsung ke Univ)
// ============================================================

// GetAllKategoriOrmawa mengembalikan semua kategori, diurutkan berdasarkan Urutan.
// Endpoint ini terbuka untuk semua role (digunakan oleh form Tambah/Edit Ormawa).
func GetAllKategoriOrmawa(c *fiber.Ctx) error {
	var kategoris []models.KategoriOrmawa
	if err := config.DB.Order("urutan asc, nama asc").Find(&kategoris).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": kategoris})
}

// CreateKategoriOrmawa membuat kategori baru (Super Admin only).
func CreateKategoriOrmawa(c *fiber.Ctx) error {
	var body struct {
		Nama                string `json:"nama"`
		Deskripsi           string `json:"deskripsi"`
		TerafiliasiFakultas bool   `json:"terafiliasi_fakultas"`
		WajibProdi          bool   `json:"wajib_prodi"`
		Urutan              int    `json:"urutan"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format request tidak valid"})
	}
	if body.Nama == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Nama kategori wajib diisi"})
	}

	// Cek duplikasi nama
	var existing models.KategoriOrmawa
	if err := config.DB.Where("nama = ?", body.Nama).First(&existing).Error; err == nil {
		return c.Status(409).JSON(fiber.Map{"status": "error", "message": "Kategori dengan nama tersebut sudah ada"})
	}

	kategori := models.KategoriOrmawa{
		Nama:                body.Nama,
		Deskripsi:           body.Deskripsi,
		TerafiliasiFakultas: body.TerafiliasiFakultas,
		WajibProdi:          body.WajibProdi,
		IsSystem:            false, // kategori buatan admin tidak bisa jadi system
		Urutan:              body.Urutan,
	}

	if err := config.DB.Create(&kategori).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"status": "success", "message": "Kategori berhasil ditambahkan", "data": kategori})
}

// UpdateKategoriOrmawa memperbarui kategori (Super Admin only).
// Kategori system (IsSystem=true) hanya boleh diubah nama/deskripsi, tidak TerafiliasiFakultas.
func UpdateKategoriOrmawa(c *fiber.Ctx) error {
	id := c.Params("id")
	var kategori models.KategoriOrmawa
	if err := config.DB.First(&kategori, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kategori tidak ditemukan"})
	}

	var body struct {
		Nama                string `json:"nama"`
		Deskripsi           string `json:"deskripsi"`
		TerafiliasiFakultas *bool  `json:"terafiliasi_fakultas"`
		WajibProdi          *bool  `json:"wajib_prodi"`
		Urutan              *int   `json:"urutan"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format request tidak valid"})
	}

	if body.Nama != "" {
		kategori.Nama = body.Nama
	}
	if body.Deskripsi != "" {
		kategori.Deskripsi = body.Deskripsi
	}
	if body.Urutan != nil {
		kategori.Urutan = *body.Urutan
	}

	// Kategori system: perubahan flag TerafiliasiFakultas tetap diizinkan (super admin bisa override)
	if body.TerafiliasiFakultas != nil {
		kategori.TerafiliasiFakultas = *body.TerafiliasiFakultas
	}
	if body.WajibProdi != nil {
		kategori.WajibProdi = *body.WajibProdi
	}

	if err := config.DB.Save(&kategori).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Kategori berhasil diperbarui", "data": kategori})
}

// DeleteKategoriOrmawa menghapus kategori (Super Admin only).
// Tidak bisa menghapus:
// 1. Kategori system (IsSystem = true)
// 2. Kategori yang masih digunakan oleh Ormawa
func DeleteKategoriOrmawa(c *fiber.Ctx) error {
	id := c.Params("id")
	var kategori models.KategoriOrmawa
	if err := config.DB.First(&kategori, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kategori tidak ditemukan"})
	}

	// Guard: tidak bisa hapus kategori system
	if kategori.IsSystem {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Kategori bawaan sistem (" + kategori.Nama + ") tidak dapat dihapus",
		})
	}

	// Guard: cek apakah masih dipakai oleh Ormawa
	var count int64
	config.DB.Model(&models.Ormawa{}).Where("kategori_ormawa_id = ?", kategori.ID).Count(&count)
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{
			"status":  "error",
			"message": "Kategori ini masih digunakan oleh " + string(rune(count)) + " organisasi, tidak dapat dihapus",
		})
	}

	if err := config.DB.Unscoped().Delete(&kategori).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Kategori berhasil dihapus"})
}

// ResetKategoriOrmawa menghapus semua kategori (Super Admin only).
// Kecuali kategori system (IsSystem = true).
func ResetKategoriOrmawa(c *fiber.Ctx) error {
	if err := config.DB.Where("is_system = ?", false).Unscoped().Delete(&models.KategoriOrmawa{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengosongkan data kategori: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Data kategori berhasil dikosongkan (kecuali sistem)"})
}
