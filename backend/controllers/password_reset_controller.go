package controllers

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/utils"
)

// generateOTP generates a random 6-digit string
func generateOTP() (string, error) {
	max := big.NewInt(1000000)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// ForgotPassword handles POST /api/auth/forgot-password
func ForgotPassword(c *fiber.Ctx) error {
	var payload struct {
		Identifier string `json:"identifier"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Payload tidak valid",
		})
	}

	if payload.Identifier == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Email atau NIM diperlukan",
		})
	}

	// 1. Find user by email
	var user models.User
	err := config.DB.Where("email = ?", payload.Identifier).First(&user).Error
	if err != nil {
		// If not found by email, try NIM via Mahasiswa
		var mhs models.Mahasiswa
		if errMhs := config.DB.Preload("Pengguna").Where("nim = ?", payload.Identifier).First(&mhs).Error; errMhs == nil {
			user = mhs.Pengguna
		} else {
			// Do not reveal if user exists or not for security, but since UI expects message, return success
			return c.JSON(fiber.Map{
				"status":  "success",
				"message": "Jika identifier terdaftar, OTP telah dikirim ke email.",
			})
		}
	}

	// 2. Generate OTP
	otp, err := generateOTP()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal membuat OTP",
		})
	}

	// 3. Fetch SMTP settings
	var smtpSetting models.SmtpSetting
	config.DB.First(&smtpSetting)

	lifetime := smtpSetting.OtpLifetime
	if lifetime <= 0 {
		lifetime = 5 // default 5 minutes
	}
	expiresAt := time.Now().Add(time.Duration(lifetime) * time.Minute)

	// 4. Save to DB
	user.ResetOTP = otp
	user.ResetOTPExpiresAt = &expiresAt
	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal menyimpan OTP",
		})
	}

	// 5. Send Email Asynchronously
	go func(u models.User, otpCode string, setting models.SmtpSetting) {
		lifetime := setting.OtpLifetime
		if lifetime <= 0 {
			lifetime = 5
		}

		name := u.NamaLengkap
		if name == "" {
			name = "Pengguna"
		}

		body := utils.FormatOtpTemplate(setting.OtpBody, otpCode, name, lifetime)
		subject := setting.OtpSubject
		if subject == "" {
			subject = "Kode OTP Reset Sandi"
		}
		// Send email
		err := utils.SendEmailHTML(setting, u.Email, subject, body)
		if err != nil {
			// Log error (in a real app we might use a proper logger)
			fmt.Println("Failed to send OTP email to", u.Email, ":", err.Error())
		}
	}(user, otp, smtpSetting)

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "OTP telah dikirim ke email Anda.",
	})
}

// VerifyOTP handles POST /api/auth/verify-otp
func VerifyOTP(c *fiber.Ctx) error {
	var payload struct {
		Identifier string `json:"identifier"`
		OTP        string `json:"otp"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Payload tidak valid",
		})
	}

	// 1. Find user by email or NIM
	var user models.User
	err := config.DB.Where("email = ?", payload.Identifier).First(&user).Error
	if err != nil {
		var mhs models.Mahasiswa
		if errMhs := config.DB.Preload("Pengguna").Where("nim = ?", payload.Identifier).First(&mhs).Error; errMhs == nil {
			user = mhs.Pengguna
		} else {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"status":  "error",
				"message": "Pengguna tidak ditemukan",
			})
		}
	}

	// 2. Validate OTP
	if user.ResetOTP == "" || user.ResetOTP != payload.OTP {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Kode OTP tidak valid",
		})
	}

	if user.ResetOTPExpiresAt == nil || time.Now().After(*user.ResetOTPExpiresAt) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Kode OTP telah kedaluwarsa",
		})
	}

	// 3. Generate ResetToken
	resetToken := uuid.NewString()

	// Clear OTP and set ResetToken
	user.ResetOTP = ""
	user.ResetOTPExpiresAt = nil
	user.ResetToken = resetToken

	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal memproses verifikasi",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "OTP valid",
		"data": fiber.Map{
			"reset_token": resetToken,
		},
	})
}

// ResetPassword handles POST /api/auth/reset-password
func ResetPassword(c *fiber.Ctx) error {
	var payload struct {
		ResetToken      string `json:"reset_token"`
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Payload tidak valid",
		})
	}

	if payload.ResetToken == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Token reset tidak valid",
		})
	}

	if len(payload.NewPassword) < 6 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Sandi minimal 6 karakter",
		})
	}

	if payload.NewPassword != payload.ConfirmPassword {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Konfirmasi sandi tidak cocok",
		})
	}

	// 1. Find user by reset token
	var user models.User
	err := config.DB.Where("reset_token = ?", payload.ResetToken).First(&user).Error
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Sesi ubah sandi tidak valid atau sudah kedaluwarsa",
		})
	}

	// 2. Hash new password
	hash, err := bcrypt.GenerateFromPassword([]byte(payload.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal memproses sandi baru",
		})
	}

	// 3. Save password and clear reset token
	user.Password = string(hash)
	user.ResetToken = ""

	if err := config.DB.Save(&user).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal menyimpan sandi baru",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Kata sandi berhasil diubah. Silakan masuk.",
	})
}
