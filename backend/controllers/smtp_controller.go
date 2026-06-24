package controllers

import (
	"fmt"
	"net/smtp"
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
)
// GetSmtpSettings retrieves the SMTP configuration
func GetSmtpSettings(c *fiber.Ctx) error {
	var setting models.SmtpSetting
	if err := config.DB.First(&setting, 1).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal mengambil pengaturan SMTP",
		})
	}
	return c.JSON(fiber.Map{
		"status": "success",
		"data":   setting,
	})
}

// UpdateSmtpSettings updates the SMTP configuration
func UpdateSmtpSettings(c *fiber.Ctx) error {
	var setting models.SmtpSetting
	if err := config.DB.First(&setting, 1).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"status":  "error",
			"message": "Pengaturan SMTP tidak ditemukan",
		})
	}

	// Parsing input
	if err := c.BodyParser(&setting); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Format data tidak valid",
		})
	}

	if err := config.DB.Save(&setting).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal menyimpan pengaturan SMTP",
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Pengaturan SMTP berhasil diperbarui",
		"data":    setting,
	})
}

// TestSmtpConnection simulates sending an email or actually sends it if configured
func TestSmtpConnection(c *fiber.Ctx) error {
	type TestReq struct {
		To string `json:"to"`
	}
	var req TestReq
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Email tujuan tidak valid",
		})
	}

	var setting models.SmtpSetting
	if err := config.DB.First(&setting, 1).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Pengaturan SMTP belum dikonfigurasi",
		})
	}

	// Persiapan pengiriman email
	auth := smtp.PlainAuth("", setting.Username, setting.Password, setting.Host)

	// Format pesan email
	subject := "Subject: Uji Coba Koneksi SMTP SIAKAD BKU\n"
	mime := "MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\n\n"
	body := "<html><body><h3>Koneksi Berhasil!</h3><p>Ini adalah email uji coba dari SIAKAD Universitas Bhakti Kencana untuk memastikan konfigurasi SMTP Anda bekerja dengan baik.</p></body></html>"
	
	fromLine := fmt.Sprintf("From: SIAKAD Universitas Bhakti Kencana <%s>\n", setting.FromAddress)
	toLine := fmt.Sprintf("To: %s\n", req.To)
	msg := []byte(fromLine + toLine + subject + mime + body)

	addr := fmt.Sprintf("%s:%s", setting.Host, setting.Port)

	// Proses pengiriman
	err := smtp.SendMail(addr, auth, setting.FromAddress, []string{req.To}, msg)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"status":  "error",
			"message": "Gagal mengirim email: " + err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Test email berhasil dikirim ke " + req.To,
	})
}

