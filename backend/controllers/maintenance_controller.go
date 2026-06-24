package controllers

import (
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
)

func GetMaintenanceStatus(c *fiber.Ctx) error {
	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load maintenance settings",
		})
	}

	return c.JSON(fiber.Map{
		"success":           true,
		"maintenance_mode":  theme.MaintenanceMode,
		"maintenance_message": theme.MaintenanceMessage,
	})
}

func UpdateMaintenance(c *fiber.Ctx) error {
	var payload struct {
		Enabled bool   `json:"enabled"`
		Message string `json:"message"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{
			"success": false,
			"message": "Invalid JSON payload",
		})
	}

	var theme models.ThemeSettings
	if err := config.DB.First(&theme).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to load theme settings",
		})
	}

	theme.MaintenanceMode = payload.Enabled
	if payload.Message != "" {
		theme.MaintenanceMessage = payload.Message
	}

	if err := config.DB.Save(&theme).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{
			"success": false,
			"message": "Failed to update maintenance settings",
		})
	}

	return c.JSON(fiber.Map{
		"success":           true,
		"message":           "Maintenance mode updated successfully",
		"maintenance_mode":  theme.MaintenanceMode,
		"maintenance_message": theme.MaintenanceMessage,
	})
}
