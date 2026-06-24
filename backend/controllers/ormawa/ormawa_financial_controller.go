package ormawa

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/utils"
	"time"

	"github.com/gofiber/fiber/v2"
)

// GetFinancialSettings retrieves all ORMAWA financial settings for a specific period
func GetFinancialSettings(c *fiber.Ctx) error {
	periode := c.Query("periode")
	if periode == "" {
		periode = fmt.Sprintf("%d", time.Now().Year())
	}

	var ormawas []models.Ormawa
	if err := config.DB.Find(&ormawas).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to retrieve ORMAWA list"})
	}

	type SettingResponse struct {
		OrmawaID         uint    `json:"ormawa_id"`
		Name             string  `json:"name"`
		Code             string  `json:"code"`
		BudgetLimit      float64 `json:"budget_limit"`
		UsedBudget       float64 `json:"used_budget"`
		PendingBudget    float64 `json:"pending_budget"`
		RemainingBudget  float64 `json:"remaining_budget"`
		FiscalYear       string  `json:"fiscal_year"`
		Active           bool    `json:"active"`
		WarningThreshold int     `json:"warning_threshold"`
		EnforceLimit     bool    `json:"enforce_limit"`
	}

	response := make([]SettingResponse, 0)

	for _, o := range ormawas {
		var setting models.OrmawaFinancialSetting
		config.DB.Where("ormawa_id = ? AND periode = ?", o.ID, periode).First(&setting)

		var usedBudget float64
		config.DB.Model(&models.Proposal{}).
			Where("ormawa_id = ?", o.ID).
			Where("status IN ?", []string{"disetujui_fakultas", "disetujui_univ", "selesai", "disetujui"}).
			Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
			Select("COALESCE(SUM(anggaran), 0)").
			Scan(&usedBudget)

		var pendingBudget float64
		config.DB.Model(&models.Proposal{}).
			Where("ormawa_id = ?", o.ID).
			Where("status = ?", "diajukan").
			Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
			Select("COALESCE(SUM(anggaran), 0)").
			Scan(&pendingBudget)

		remainingBudget := setting.BudgetLimit - usedBudget - pendingBudget
		if remainingBudget < 0 {
			remainingBudget = 0
		}

		response = append(response, SettingResponse{
			OrmawaID:         o.ID,
			Name:             o.Nama,
			Code:             o.Singkatan,
			BudgetLimit:      setting.BudgetLimit,
			UsedBudget:       usedBudget,
			PendingBudget:    pendingBudget,
			RemainingBudget:  remainingBudget,
			FiscalYear:       periode,
			Active:           setting.IsActive,
			WarningThreshold: setting.WarningThreshold,
			EnforceLimit:     setting.EnforceLimit,
		})
	}

	return c.JSON(fiber.Map{"status": "success", "data": response})
}

// UpdateFinancialSetting creates or updates a financial setting for an ORMAWA
func UpdateFinancialSetting(c *fiber.Ctx) error {
	var payload struct {
		OrmawaID         uint    `json:"ormawa_id"`
		Periode          string  `json:"periode"`
		BudgetLimit      float64 `json:"budget_limit"`
		WarningThreshold int     `json:"warning_threshold"`
		EnforceLimit     bool    `json:"enforce_limit"`
		IsActive         bool    `json:"is_active"`
		Reason           string  `json:"reason"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid payload format"})
	}

	if payload.OrmawaID == 0 || payload.Periode == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "OrmawaID and Periode are required"})
	}

	userIdVal := c.Locals("user_id")
	if userIdVal == nil {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized"})
	}
	userId := userIdVal.(uint)

	// Fetch existing or create new
	var setting models.OrmawaFinancialSetting
	result := config.DB.Where("ormawa_id = ? AND periode = ?", payload.OrmawaID, payload.Periode).First(&setting)

	isNew := result.Error != nil
	oldLimit := setting.BudgetLimit

	setting.OrmawaID = payload.OrmawaID
	setting.Periode = payload.Periode
	setting.BudgetLimit = payload.BudgetLimit

	if payload.WarningThreshold > 0 {
		setting.WarningThreshold = payload.WarningThreshold
	} else if isNew {
		setting.WarningThreshold = 80
	}

	setting.EnforceLimit = payload.EnforceLimit
	setting.IsActive = payload.IsActive

	if err := config.DB.Save(&setting).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to save financial setting"})
	}

	// Create Audit Log
	action := "UPDATE_BUDGET"
	if isNew {
		action = "CREATE_SETTING"
	}

	auditLog := models.OrmawaFinancialAuditLog{
		SettingID: setting.ID,
		Action:    action,
		OldValue:  fmt.Sprintf("%.2f", oldLimit),
		NewValue:  fmt.Sprintf("%.2f", setting.BudgetLimit),
		ChangedBy: userId,
		Reason:    payload.Reason,
	}

	if payload.Reason == "" && isNew {
		auditLog.Reason = "Initial budget allocation"
	} else if payload.Reason == "" {
		auditLog.Reason = "Budget limit adjustment"
	}

	if err := config.DB.Create(&auditLog).Error; err != nil {
		fmt.Printf("[UpdateFinancialSetting] Failed to create audit log: %v\n", err)
	}

	return c.JSON(fiber.Map{"status": "success", "data": setting, "message": "Financial setting updated successfully"})
}

// GetFinancialAuditLogs retrieves the audit history for a specific financial setting
func GetFinancialAuditLogs(c *fiber.Ctx) error {
	ormawaId := c.Params("id")
	var logs []models.OrmawaFinancialAuditLog

	var settingIDs []uint
	var numericOrmawaID uint
	fmt.Sscanf(ormawaId, "%d", &numericOrmawaID)
	config.DB.Model(&models.OrmawaFinancialSetting{}).Where("ormawa_id = ?", numericOrmawaID).Pluck("id", &settingIDs)

	if len(settingIDs) == 0 {
		return c.JSON(fiber.Map{"status": "success", "data": []models.OrmawaFinancialAuditLog{}})
	}

	if err := config.DB.Preload("User").Preload("Setting").Where("setting_id IN ?", settingIDs).Order("created_at desc").Find(&logs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Failed to retrieve audit logs"})
	}

	return c.JSON(fiber.Map{"status": "success", "data": logs})
}

// GetBudgetStatus retrieves the current financial status and remaining budget for an ORMAWA
func GetBudgetStatus(c *fiber.Ctx) error {
	ormawaIdVal := c.Locals("ormawa_id")
	if ormawaIdVal == nil {
		return c.Status(401).JSON(fiber.Map{"status": "error", "message": "Unauthorized"})
	}
	ormawaId := ormawaIdVal.(uint)

	periode := c.Query("periode")
	if periode == "" {
		periode = fmt.Sprintf("%d", time.Now().Year())
	}

	var setting models.OrmawaFinancialSetting
	if err := config.DB.Where("ormawa_id = ? AND periode = ?", ormawaId, periode).First(&setting).Error; err != nil {
		return c.JSON(fiber.Map{
			"status": "success",
			"data": fiber.Map{
				"budget_limit":     0,
				"used_budget":      0,
				"pending_budget":   0,
				"remaining_budget": 0,
				"is_active":        false,
				"enforce_limit":    false,
			},
		})
	}

	var usedBudget float64
	config.DB.Model(&models.Proposal{}).
		Where("ormawa_id = ?", ormawaId).
		Where("status IN ?", []string{"disetujui_fakultas", "disetujui_univ", "selesai", "disetujui"}).
		Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
		Select("COALESCE(SUM(anggaran), 0)").
		Scan(&usedBudget)

	var pendingBudget float64
	config.DB.Model(&models.Proposal{}).
		Where("ormawa_id = ?", ormawaId).
		Where("status = ?", "diajukan").
		Where("sumber_dana IN ?", []string{"Dana Kemahasiswaan Universitas", "Dana Kemahasiswaan Fakultas"}).
		Select("COALESCE(SUM(anggaran), 0)").
		Scan(&pendingBudget)

	remainingBudget := setting.BudgetLimit - usedBudget - pendingBudget
	if remainingBudget < 0 {
		remainingBudget = 0
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"setting_id":        setting.ID,
			"periode":           setting.Periode,
			"budget_limit":      setting.BudgetLimit,
			"used_budget":       usedBudget,
			"pending_budget":    pendingBudget,
			"remaining_budget":  remainingBudget,
			"warning_threshold": setting.WarningThreshold,
			"enforce_limit":     setting.EnforceLimit,
			"is_active":         setting.IsActive,
		},
	})
}

// GenerateFinancialReportNumber generates a new document number for the financial report
func GenerateFinancialReportNumber(c *fiber.Ctx) error {
	docNumber := utils.GenerateDocumentNumber("Laporan Anggaran ORMAWA")
	return c.JSON(fiber.Map{
		"status":          "success",
		"document_number": docNumber,
	})
}

// GeneratePaguReportNumber generates a new document number for the superadmin pagu report
func GeneratePaguReportNumber(c *fiber.Ctx) error {
	docNumber := utils.GenerateDocumentNumber("Laporan Pagu Anggaran ORMAWA")
	return c.JSON(fiber.Map{
		"status":          "success",
		"document_number": docNumber,
	})
}
