package controllers

import (
	"encoding/json"
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"

	"github.com/gofiber/fiber/v2"
	"gorm.io/datatypes"
)

// Default permissions for Prodi admin RBAC — page-level with view/edit granularity
var prodiPermissionList = []string{
	// Dashboard
	"view_dashboard",
	// Data Master
	"view_mahasiswa", "edit_mahasiswa",
	"view_dosen", "edit_dosen",
	"view_psikolog",
	"view_prodi", "edit_prodi",
	// Kegiatan & Kemahasiswaan
	"view_pkkmb",
	"view_organisasi",
	"view_proposal",
	"view_prestasi", "edit_prestasi",
	"view_beasiswa", "edit_beasiswa",
	"view_kesehatan",
	// Administrasi
	"view_aspirasi", "edit_aspirasi",
	"view_laporan",
	"view_pengaturan",
}

// seedDefaultProdiRoles seeds default RBAC roles for a fakultas
func seedDefaultProdiRoles(fakultasID uint) error {
	defaultRoles := []struct {
		Nama      string
		Deskripsi string
		Hak       []string
	}{
		{
			Nama:      "Kaprodi",
			Deskripsi: "Akses penuh ke seluruh halaman yang tersedia untuk Prodi.",
			Hak: []string{
				"view_dashboard",
				"view_mahasiswa", "edit_mahasiswa",
				"view_dosen", "edit_dosen",
				"view_psikolog",
				"view_prodi", "edit_prodi",
				"view_pkkmb",
				"view_organisasi",
				"view_proposal",
				"view_prestasi", "edit_prestasi",
				"view_beasiswa", "edit_beasiswa",
				"view_kesehatan",
				"view_aspirasi", "edit_aspirasi",
				"view_laporan",
				"view_pengaturan",
			},
		},
		{
			Nama:      "Sekretaris Prodi",
			Deskripsi: "Akses ke Dashboard, Mahasiswa, Prestasi, dan Laporan.",
			Hak: []string{
				"view_dashboard",
				"view_mahasiswa",
				"view_prestasi",
				"view_laporan",
			},
		},
		{
			Nama:      "Staff Prodi",
			Deskripsi: "Akses terbatas ke Dashboard dan data Mahasiswa.",
			Hak: []string{
				"view_dashboard",
				"view_mahasiswa",
			},
		},
	}

	for _, dr := range defaultRoles {
		perms, _ := json.Marshal(dr.Hak)
		role := models.FakultasProdiRole{
			FakultasID:  fakultasID,
			Nama:        dr.Nama,
			Deskripsi:   dr.Deskripsi,
			Permissions: datatypes.JSON(perms),
		}
		if err := config.DB.Create(&role).Error; err != nil {
			return err
		}
	}
	return nil
}

// GetProdiRoles returns all RBAC roles for prodi under the current faculty
func GetProdiRoles(c *fiber.Ctx) error {
	userRole, _ := c.Locals("role").(string)
	roleLower := strings.ToLower(userRole)
	fid, _ := c.Locals("fakultas_id").(uint)

	if roleLower != "super_admin" && fid == 0 {
		return c.JSON(fiber.Map{
			"status":      "success",
			"data":        []models.FakultasProdiRole{},
			"permissions": prodiPermissionList,
		})
	}

	if fid != 0 {
		// Auto-seed defaults if none exist
		var count int64
		config.DB.Model(&models.FakultasProdiRole{}).Where("fakultas_id = ?", fid).Count(&count)
		if count == 0 {
			_ = seedDefaultProdiRoles(fid)
		}
	}

	var query = config.DB.Model(&models.FakultasProdiRole{})
	if fid != 0 {
		query = query.Where("fakultas_id = ?", fid)
	}

	var roles []models.FakultasProdiRole
	query.Order("id asc").Find(&roles)

	return c.JSON(fiber.Map{
		"status":      "success",
		"data":        roles,
		"permissions": prodiPermissionList,
	})
}

// CreateProdiRole creates a new prodi RBAC role
func CreateProdiRole(c *fiber.Ctx) error {
	fid, _ := c.Locals("fakultas_id").(uint)

	if fid == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas ID tidak ditemukan"})
	}

	var data struct {
		Nama      string   `json:"Nama"`
		Deskripsi string   `json:"Deskripsi"`
		Hak       []string `json:"Hak"`
	}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	if data.Nama == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Nama role wajib diisi"})
	}

	perms, _ := json.Marshal(data.Hak)
	role := models.FakultasProdiRole{
		FakultasID:  fid,
		Nama:        data.Nama,
		Deskripsi:   data.Deskripsi,
		Permissions: datatypes.JSON(perms),
	}
	if err := config.DB.Create(&role).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan role: " + err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"status": "success", "data": role})
}

// UpdateProdiRole updates an existing prodi RBAC role
func UpdateProdiRole(c *fiber.Ctx) error {

	id := c.Params("id")
	fid, _ := c.Locals("fakultas_id").(uint)

	var role models.FakultasProdiRole
	if err := config.DB.Where("id = ? AND fakultas_id = ?", id, fid).First(&role).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Role tidak ditemukan"})
	}

	var data struct {
		Nama      string   `json:"Nama"`
		Deskripsi string   `json:"Deskripsi"`
		Hak       []string `json:"Hak"`
	}
	if err := c.BodyParser(&data); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	perms, _ := json.Marshal(data.Hak)
	role.Nama = data.Nama
	role.Deskripsi = data.Deskripsi
	role.Permissions = datatypes.JSON(perms)

	if err := config.DB.Save(&role).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui role: " + err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": role})
}

// DeleteProdiRole deletes a prodi RBAC role
func DeleteProdiRole(c *fiber.Ctx) error {

	id := c.Params("id")
	fid, _ := c.Locals("fakultas_id").(uint)

	if err := config.DB.Where("id = ? AND fakultas_id = ?", id, fid).Delete(&models.FakultasProdiRole{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus role"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Role berhasil dihapus"})
}
