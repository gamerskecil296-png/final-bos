package utils

import (
	"fmt"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
)

// GenerateDocumentNumber fetches the format from DocumentSetting, increments the number, and returns the formatted string.
func GenerateDocumentNumber(jenisSurat string) string {
	var setting models.DocumentSetting
	if err := config.DB.Where("jenis_surat = ?", jenisSurat).First(&setting).Error; err != nil {
		// Fallback formatting if not found
		return fmt.Sprintf("000/%s/%s/%d", strings.ToUpper(strings.ReplaceAll(jenisSurat, " ", "-")), getRomawiBulan(time.Now().Month()), time.Now().Year())
	}

	now := time.Now()
	currentYear := fmt.Sprintf("%d", now.Year())
	currentMonth := fmt.Sprintf("%02d", now.Month())

	// Handle Reset Period
	resetNeeded := false
	if setting.ResetPeriod == "Tahunan" && setting.LastUpdate != currentYear {
		resetNeeded = true
		setting.LastUpdate = currentYear
	} else if setting.ResetPeriod == "Bulanan" && setting.LastUpdate != fmt.Sprintf("%s-%s", currentYear, currentMonth) {
		resetNeeded = true
		setting.LastUpdate = fmt.Sprintf("%s-%s", currentYear, currentMonth)
	}

	if resetNeeded {
		setting.LastNumber = 1
	} else {
		setting.LastNumber += 1
	}

	// Update DB
	config.DB.Save(&setting)

	// Format
	format := setting.FormatNomor
	format = strings.ReplaceAll(format, "{{nomor}}", fmt.Sprintf("%03d", setting.LastNumber))
	format = strings.ReplaceAll(format, "{{bulan_romawi}}", getRomawiBulan(now.Month()))
	format = strings.ReplaceAll(format, "{{bulan_biasa}}", currentMonth)
	format = strings.ReplaceAll(format, "{{tahun}}", currentYear)

	return format
}

func getRomawiBulan(m time.Month) string {
	romawi := []string{"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"}
	if int(m) >= 1 && int(m) <= 12 {
		return romawi[int(m)]
	}
	return ""
}
