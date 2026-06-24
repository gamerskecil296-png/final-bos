package controllers

import (
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
)

// GetDocumentationByMenuID retrieves the documentation content for a specific menu
func GetDocumentationByMenuID(c *fiber.Ctx) error {
	menuID := c.Params("menu_id")

	var doc models.Documentation
	result := config.DB.Where("menu_id = ?", menuID).First(&doc)

	if result.Error != nil {
		// If not found, return empty structure rather than 404, so frontend can show placeholder
		return c.JSON(fiber.Map{
			"status":  "success",
			"message": "Documentation not found",
			"data": fiber.Map{
				"menu_id":      menuID,
				"title":        "",
				"subtitle":     "",
				"content_html": "",
			},
		})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Documentation retrieved successfully",
		"data":    doc,
	})
}

// SaveDocumentation creates or updates the documentation for a specific menu
func SaveDocumentation(c *fiber.Ctx) error {
	var payload struct {
		MenuID      string `json:"menu_id"`
		Title       string `json:"title"`
		Subtitle    string `json:"subtitle"`
		ContentHTML string `json:"content_html"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Invalid request payload",
			"error":   err.Error(),
		})
	}

	if payload.MenuID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"status":  "error",
			"message": "Menu ID is required",
		})
	}

	var doc models.Documentation
	result := config.DB.Where("menu_id = ?", payload.MenuID).First(&doc)

	if result.Error != nil {
		// Not found, so create new
		doc = models.Documentation{
			MenuID:      payload.MenuID,
			Title:       payload.Title,
			Subtitle:    payload.Subtitle,
			ContentHTML: payload.ContentHTML,
		}
		if err := config.DB.Create(&doc).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to create documentation",
				"error":   err.Error(),
			})
		}
	} else {
		// Update existing
		doc.Title = payload.Title
		doc.Subtitle = payload.Subtitle
		doc.ContentHTML = payload.ContentHTML
		if err := config.DB.Save(&doc).Error; err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
				"status":  "error",
				"message": "Failed to update documentation",
				"error":   err.Error(),
			})
		}
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Documentation saved successfully",
		"data":    doc,
	})
}
