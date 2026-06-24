package mahasiswa

import (
	"siakad-backend/config"
	"siakad-backend/models"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// In a real app, this should be in .env
var jwtSecret = []byte("my_super_secret_key_siakad")

type LoginRequest struct {
	NIM      string `json:"nim"`
	Password string `json:"password"`
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`
}

// Login logic: We authenticate via NIM (Student) -> get User -> check Password
func Login(c *fiber.Ctx) error {
	var req LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request payload"})
	}

	// Find the student by NIM
	var student models.Mahasiswa
	if err := config.DB.Preload("Pengguna").Preload("ProgramStudi").First(&student, "nim = ?", req.NIM).Error; err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "NIM atau Password salah"})
	}

	// Check password via bcrypt
	if err := bcrypt.CompareHashAndPassword([]byte(student.Pengguna.Password), []byte(req.Password)); err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "NIM atau Password salah"})
	}

	if student.StatusAkun != "Aktif" {
		return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akun tidak aktif. Silakan hubungi admin."})
	}

	// Generate Access Token (15 mins)
	now := time.Now().UTC()
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": student.PenggunaID,
		"sid": student.ID,
		"nim": student.NIM,
		"exp": now.Add(15 * time.Minute).Unix(),
	})
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Error generating token"})
	}

	// Generate Refresh Token (7 days)
	refreshToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": student.PenggunaID,
		"sid": student.ID,
		"nim": student.NIM,
		"exp": now.Add(7 * 24 * time.Hour).Unix(),
		"typ": "refresh",
	})
	rtString, err := refreshToken.SignedString(jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Error generating refresh token"})
	}

	// Set Refresh Token HTTP Only Cookie
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    rtString,
		Expires:  now.Add(7 * 24 * time.Hour),
		HTTPOnly: true,
		Secure:   false,
		SameSite: "Strict",
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Berhasil login",
		"data": fiber.Map{
			"access_token": tokenString,
			"expires_in":   900,
			"mahasiswa": fiber.Map{
				"id":       student.ID,
				"nim":      student.NIM,
				"nama":     student.Nama,
				"prodi_id": student.ProgramStudiID,
				"prodi":    student.ProgramStudi.Nama,
				"foto_url": student.FotoURL,
				"status":   student.StatusAkun,
				"angkatan": student.TahunMasuk,
			},
		},
	})
}

func RefreshToken(c *fiber.Ctx) error {
	tokenString := c.Cookies("refresh_token")
	if tokenString == "" {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Refresh token tidak ditemukan"})
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return jwtSecret, nil
	})

	if err != nil || !token.Valid {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Refresh token tidak valid"})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || claims["typ"] != "refresh" {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Refresh token invalid type"})
	}

	now := time.Now().UTC()
	newToken := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": claims["sub"],
		"sid": claims["sid"],
		"nim": claims["nim"],
		"exp": now.Add(15 * time.Minute).Unix(),
	})
	newAT, err := newToken.SignedString(jwtSecret)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal generate token baru"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Token berhasil diperbarui",
		"data": fiber.Map{
			"access_token": newAT,
			"expires_in":   900,
		},
	})
}

func Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    "",
		Expires:  time.Now().Add(-1 * time.Hour),
		HTTPOnly: true,
	})

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Berhasil logout",
	})
}

func ChangePasswordAuth(c *fiber.Ctx) error {
	UserID := c.Locals("user_id")

	var req ChangePasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Invalid request payload"})
	}

	var user models.User
	if err := config.DB.First(&user, UserID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "User tidak ditemukan"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Password lama salah"})
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengenkripsi password baru"})
	}

	user.Password = string(hash)
	config.DB.Save(&user)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Password berhasil diubah",
	})
}
