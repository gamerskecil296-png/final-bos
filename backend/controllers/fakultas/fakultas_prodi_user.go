package controllers

import (

	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

// ─── Prodi Admin User Management (by Faculty Admin) ──────────────────────────

// prodiAdminResult is a view-model for listing prodi admins with context
type prodiAdminResult struct {
	models.User
	ProdiNama string `json:"prodi_nama"`
	RoleNama  string `json:"role_nama"` // ormawa_assign mapped to readable role
}

// GetProdiAdmins returns all prodi_admin users scoped to the current faculty
func GetProdiAdmins(c *fiber.Ctx) error {
	role, _ := c.Locals("role").(string)
	roleLower := strings.ToLower(role)

	fid, _ := c.Locals("fakultas_id").(uint)

	// If not superadmin and no fid, return empty
	if roleLower != "super_admin" && fid == 0 {
		return c.JSON(fiber.Map{"status": "success", "data": []prodiAdminResult{}})
	}

	var results []prodiAdminResult
	query := config.DB.Table("public.users").
		Select(`"public"."users".*, p.nama as prodi_nama`).
		Joins(`LEFT JOIN "fakultas"."program_studi" p ON p.id = "public"."users".program_studi_id`).
		Where(`"public"."users".role = ?`, "prodi_admin")

	if fid != 0 {
		query = query.Where(`"public"."users".fakultas_id = ?`, fid)
	}

	err := query.Order(`"public"."users".created_at DESC`).Find(&results).Error

	if err != nil {
		fmt.Println("❌ [DB ERROR] GetProdiAdmins:", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil data akun prodi"})
	}

	// Map ormawa_assign to readable role name
	for i := range results {
		results[i].RoleNama = results[i].OrmawaAssign
	}

	return c.JSON(fiber.Map{"status": "success", "data": results})
}

// CreateProdiAdmin creates a new prodi_admin user under the current faculty
func CreateProdiAdmin(c *fiber.Ctx) error {
	role, _ := c.Locals("role").(string)
	roleLower := strings.ToLower(role)

	fid, _ := c.Locals("fakultas_id").(uint)
	if roleLower != "super_admin" && fid == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas ID tidak ditemukan"})
	}

	var req struct {
		Email          string `json:"email"`
		Password       string `json:"password"`
		ProgramStudiID uint   `json:"program_studi_id"`
		OrmawaAssign   string `json:"ormawa_assign"` // role name, e.g. "Kaprodi"
	}

	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	// ── Validations ──
	if req.Email == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Email wajib diisi"})
	}
	if req.Password == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Password wajib diisi"})
	}
	if req.ProgramStudiID == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program Studi wajib dipilih"})
	}
	if req.OrmawaAssign == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Role/jabatan prodi wajib dipilih"})
	}

	// Verify the program studi belongs to this faculty (or allow all if super admin)
	var prodi models.ProgramStudi
	queryProdi := config.DB.Where("id = ?", req.ProgramStudiID)
	if roleLower != "super_admin" {
		queryProdi = queryProdi.Where("fakultas_id = ?", fid)
	}
	if err := queryProdi.First(&prodi).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program Studi tidak valid atau bukan milik fakultas ini"})
	}

	// Check email uniqueness
	var existing models.User
	if err := config.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Email sudah digunakan oleh akun lain"})
	}

	// Hash password
	hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memproses password"})
	}

	user := models.User{
		Email:          req.Email,
		Password:       string(hashed),
		Role:           "prodi_admin",
		FakultasID:     &prodi.FakultasID, // Inherit from selected program studi
		ProgramStudiID: &req.ProgramStudiID,
		OrmawaAssign:   req.OrmawaAssign,
	}

	if err := config.DB.Create(&user).Error; err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Email sudah terdaftar"})
		}
		fmt.Println("❌ [DB ERROR] CreateProdiAdmin:", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuat akun prodi"})
	}

	return c.Status(201).JSON(fiber.Map{"status": "success", "message": "Akun Prodi Admin berhasil dibuat", "data": fiber.Map{
		"id":               user.ID,
		"email":            user.Email,
		"program_studi_id": user.ProgramStudiID,
		"ormawa_assign":    user.OrmawaAssign,
	}})
}

// UpdateProdiAdmin updates an existing prodi_admin user
func UpdateProdiAdmin(c *fiber.Ctx) error {
	role, _ := c.Locals("role").(string)
	roleLower := strings.ToLower(role)

	fid, _ := c.Locals("fakultas_id").(uint)
	id := c.Params("id")

	// Find the user, ensuring it belongs to this faculty and is prodi_admin
	var user models.User
	queryUser := config.DB.Where("id = ? AND role = ?", id, "prodi_admin")
	if roleLower != "super_admin" {
		queryUser = queryUser.Where("fakultas_id = ?", fid)
	}
	if err := queryUser.First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Akun prodi tidak ditemukan"})
	}

	var req struct {
		Email          string `json:"email"`
		Password       string `json:"password"` // optional — only update if non-empty
		ProgramStudiID uint   `json:"program_studi_id"`
		OrmawaAssign   string `json:"ormawa_assign"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	// Update email (with uniqueness check)
	if req.Email != "" && req.Email != user.Email {
		var check models.User
		if err := config.DB.Where("email = ? AND id != ?", req.Email, user.ID).First(&check).Error; err == nil {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Email sudah digunakan oleh akun lain"})
		}
		user.Email = req.Email
	}

	// Update password if provided
	if req.Password != "" {
		hashed, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memproses password"})
		}
		user.Password = string(hashed)
	}

	// Update program studi (verify it belongs to this faculty or allow all if super admin)
	if req.ProgramStudiID != 0 {
		var prodi models.ProgramStudi
		queryProdi := config.DB.Where("id = ?", req.ProgramStudiID)
		if roleLower != "super_admin" {
			queryProdi = queryProdi.Where("fakultas_id = ?", fid)
		}
		if err := queryProdi.First(&prodi).Error; err != nil {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Program Studi tidak valid atau bukan milik fakultas ini"})
		}
		user.ProgramStudiID = &req.ProgramStudiID
		user.FakultasID = &prodi.FakultasID // Ensure it changes faculty if super admin changed the prodi to another faculty
	}

	// Update role assignment
	if req.OrmawaAssign != "" {
		user.OrmawaAssign = req.OrmawaAssign
	}

	if err := config.DB.Save(&user).Error; err != nil {
		fmt.Println("❌ [DB ERROR] UpdateProdiAdmin:", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui akun prodi"})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Akun prodi berhasil diperbarui"})
}

// DeleteProdiAdmin deletes a prodi_admin user
func DeleteProdiAdmin(c *fiber.Ctx) error {
	role, _ := c.Locals("role").(string)
	roleLower := strings.ToLower(role)

	fid, _ := c.Locals("fakultas_id").(uint)
	id := c.Params("id")

	// Ensure the user exists, belongs to this faculty, and is prodi_admin
	var user models.User
	queryUser := config.DB.Where("id = ? AND role = ?", id, "prodi_admin")
	if roleLower != "super_admin" {
		queryUser = queryUser.Where("fakultas_id = ?", fid)
	}
	if err := queryUser.First(&user).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Akun prodi tidak ditemukan"})
	}

	if err := config.DB.Unscoped().Delete(&user).Error; err != nil {
		fmt.Println("❌ [DB ERROR] DeleteProdiAdmin:", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus akun prodi"})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Akun prodi berhasil dihapus"})
}
