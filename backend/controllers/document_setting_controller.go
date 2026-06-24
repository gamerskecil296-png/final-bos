package controllers

import (
	"siakad-backend/config"
	"siakad-backend/models"
	siakad_utils "siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
)

// GetDocumentSettings retrieves all document formatting settings
func GetDocumentSettings(c *fiber.Ctx) error {
	modul := c.Query("modul")
	query := config.DB.Order("modul, jenis_surat")
	if modul != "" {
		query = query.Where("modul = ?", modul)
	}

	var settings []models.DocumentSetting
	if err := query.Find(&settings).Error; err != nil {
		return err
	}
	return c.JSON(fiber.Map{"status": "success", "data": settings})
}

// UpdateDocumentSetting updates a specific document format setting
func UpdateDocumentSetting(c *fiber.Ctx) error {
	id := c.Params("id")
	var setting models.DocumentSetting
	if err := config.DB.First(&setting, id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Setting tidak ditemukan")
	}

	var body struct {
		FormatNomor string `json:"format_nomor"`
		ResetPeriod string `json:"reset_period"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	updates := map[string]any{}
	if body.FormatNomor != "" {
		updates["format_nomor"] = body.FormatNomor
	}
	if body.ResetPeriod != "" {
		updates["reset_period"] = body.ResetPeriod
	}

	if err := config.DB.Model(&setting).Updates(updates).Error; err != nil {
		return err
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Format nomor surat berhasil diperbarui"})
}

// GenerateDocumentNumberAPI generates a new document number for a given jenis_surat
func GenerateDocumentNumberAPI(c *fiber.Ctx) error {
	var body struct {
		JenisSurat string `json:"jenis_surat"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	if body.JenisSurat == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Jenis surat wajib diisi")
	}

	// Assuming utils.GenerateDocumentNumber exists and works correctly
	nomor := siakad_utils.GenerateDocumentNumber(body.JenisSurat)

	return c.JSON(fiber.Map{"status": "success", "data": nomor})
}
