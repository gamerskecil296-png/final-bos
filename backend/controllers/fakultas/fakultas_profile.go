package controllers

import (
	"fmt"
	"os"
	"path/filepath"
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func getUserID(c *fiber.Ctx) (uint, error) {
	v, ok := c.Locals("user_id").(uint)
	if !ok || v == 0 {
		return 0, fiber.NewError(fiber.StatusUnauthorized, "User tidak terautentikasi")
	}
	return v, nil
}

// AmbilProfilAdminFakultas mengembalikan data profil user yang sedang login
func AmbilProfilAdminFakultas(c *fiber.Ctx) error {
	PenggunaID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	var user models.User
	if err := config.DB.First(&user, PenggunaID).Error; err != nil {
		fmt.Println("❌ [DB ERROR] AmbilProfilAdminFakultas:", err)
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Profil admin tidak ditemukan"})
	}

	var fakultas models.Fakultas
	if user.FakultasID != nil && *user.FakultasID != 0 {
		config.DB.First(&fakultas, *user.FakultasID)
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"id":           user.ID,
			"email":        user.Email,
			"role":         user.Role,
			"nama_lengkap": user.NamaLengkap,
			"no_hp":        user.NoHP,
			"avatar_url":   user.AvatarURL,
			"fakultas_id":  user.FakultasID,
			"fakultas":     fakultas,
		},
	})
}

// PerbaruiProfilAdminFakultas memperbarui email/akun admin fakultas
func PerbaruiProfilAdminFakultas(c *fiber.Ctx) error {
	PenggunaID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	type Request struct {
		Email       string `json:"email"`
		NamaLengkap string `json:"nama_lengkap"`
		NoHP        string `json:"no_hp"`
		AvatarURL   string `json:"avatar_url"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data tidak valid"})
	}

	var user models.User
	if err := config.DB.First(&user, PenggunaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "User tidak ditemukan"})
	}

	if req.Email != "" && req.Email != user.Email {
		// Validasi email unik
		var check models.User
		if err := config.DB.Where("email = ? AND id != ?", req.Email, PenggunaID).First(&check).Error; err == nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Email sudah digunakan oleh akun lain"})
		}
		user.Email = req.Email
	}

	user.NamaLengkap = req.NamaLengkap
	user.NoHP = req.NoHP
	if req.AvatarURL != "" {
		user.AvatarURL = req.AvatarURL
	}

	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan perubahan profil"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Profil berhasil diperbarui"})
}

// GantiPasswordAdminFakultas mengubah password admin fakultas
func GantiPasswordAdminFakultas(c *fiber.Ctx) error {
	PenggunaID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	type Request struct {
		OldPassword     string `json:"old_password"`
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	var req Request
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data tidak valid"})
	}

	if req.NewPassword != req.ConfirmPassword {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Konfirmasi password baru tidak cocok"})
	}

	var user models.User
	if err := config.DB.First(&user, PenggunaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "User tidak ditemukan"})
	}

	// Cek password lama
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Password saat ini salah"})
	}

	// Hash password baru
	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memproses password baru"})
	}

	user.Password = string(hash)
	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan password baru"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Password berhasil diperbarui"})
}

// UploadAvatarAdminFakultas mengupload file avatar dan mengembalikan URL-nya
func UploadAvatarAdminFakultas(c *fiber.Ctx) error {
	PenggunaID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "File tidak ditemukan"})
	}

	// Validasi ekstensi
	ext := filepath.Ext(file.Filename)
	allowedExts := map[string]bool{".png": true, ".jpg": true, ".jpeg": true, ".webp": true}
	if !allowedExts[strings.ToLower(ext)] {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format file harus PNG/JPG/WEBP"})
	}

	os.MkdirAll("./uploads/avatars", 0755)
	filename := fmt.Sprintf("avatar_%d_%d%s", PenggunaID, time.Now().Unix(), ext)
	filePath := "./uploads/avatars/" + filename

	if err := c.SaveFile(file, filePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file avatar"})
	}

	url := "/uploads/avatars/" + filename

	// Opsional: Langsung simpan ke user DB agar praktis
	config.DB.Model(&models.User{}).Where("id = ?", PenggunaID).Update("avatar_url", url)

	return c.JSON(fiber.Map{"success": true, "url": url, "message": "Avatar berhasil diunggah"})
}

// HapusAvatarAdminFakultas menghapus foto profil dan file dari server
func HapusAvatarAdminFakultas(c *fiber.Ctx) error {
	PenggunaID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	var user models.User
	if err := config.DB.First(&user, PenggunaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "User tidak ditemukan"})
	}

	// Hapus file fisik jika ada
	if user.AvatarURL != "" {
		// Hapus awalan '/' dari url supaya menunjuk ke path file relatif yang benar
		filePath := "." + user.AvatarURL
		_ = os.Remove(filePath) // abaikan error jika file sudah tidak ada
	}

	// Hapus url dari db
	if err := config.DB.Model(&user).Update("avatar_url", "").Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus avatar di database"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Avatar berhasil dihapus"})
}
