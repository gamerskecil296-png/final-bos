package controllers

import (
	"siakad-backend/config"
	"siakad-backend/models"

	"github.com/gofiber/fiber/v2"
)

// GetAllApiIntegrations returns all API integrations
func GetAllApiIntegrations(c *fiber.Ctx) error {
	var integrations []models.ApiIntegration
	if err := config.DB.Find(&integrations).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	// Map them to an object structure matching the frontend format
	integrationMap := make(map[string]map[string]interface{})
	for _, integ := range integrations {
		integrationMap[integ.Key] = map[string]interface{}{
			"endpoint":  integ.Endpoint,
			"clientKey": integ.ClientKey,
			"active":    integ.Active,
			"show":      false,
		}
	}

	// Make sure defaults exist if not in DB yet
	if _, ok := integrationMap["sevima"]; !ok {
		integrationMap["sevima"] = map[string]interface{}{"endpoint": "", "clientKey": "", "active": true, "show": false}
	}
	if _, ok := integrationMap["whatsapp"]; !ok {
		integrationMap["whatsapp"] = map[string]interface{}{"endpoint": "", "clientKey": "", "active": true, "show": false}
	}
	if _, ok := integrationMap["seo"]; !ok {
		integrationMap["seo"] = map[string]interface{}{"endpoint": "https://bkustudenthub.com", "clientKey": "", "active": true, "show": false}
	}
	if _, ok := integrationMap["simkatmawa"]; !ok {
		integrationMap["simkatmawa"] = map[string]interface{}{"endpoint": "kemahasiswaan@bku.ac.id", "clientKey": "@Kemahasiswaan754", "active": true, "show": false}
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   integrationMap,
	})
}

// UpdateApiIntegrations updates API integrations
func UpdateApiIntegrations(c *fiber.Ctx) error {
	var payload map[string]struct {
		Endpoint  string `json:"endpoint"`
		ClientKey string `json:"clientKey"`
		Active    bool   `json:"active"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid request body"})
	}

	for key, data := range payload {
		var integ models.ApiIntegration
		err := config.DB.Where("key = ?", key).First(&integ).Error
		if err != nil {
			// Create
			integ = models.ApiIntegration{
				Key:       key,
				Name:      key, // basic fallback
				Endpoint:  data.Endpoint,
				ClientKey: data.ClientKey,
				Active:    data.Active,
			}
			config.DB.Create(&integ)
		} else {
			// Update
			config.DB.Model(&integ).Updates(map[string]interface{}{
				"endpoint":   data.Endpoint,
				"client_key": data.ClientKey,
				"active":     data.Active,
			})
		}
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Konfigurasi Integrasi API berhasil diperbarui",
	})
}
