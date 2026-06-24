package gamifikasi

import (
	"fmt"
	"siakad-backend/models"
	"time"

	"gorm.io/gorm"
)

// AwardOrmawaPoints modifies an Ormawa's points and logs the transaction in OrmawaPoinHistory
func AwardOrmawaPoints(db *gorm.DB, ormawaID uint, ruleKey string, points int, tipe string, deskripsi string) error {
	var rule models.OrmawaGamifikasiRule
	if err := db.Where("key = ?", ruleKey).First(&rule).Error; err == nil {
		points = rule.Poin
		deskripsi = fmt.Sprintf("%s: %s", rule.Label, deskripsi)
	}

	var ormawa models.Ormawa
	if err := db.First(&ormawa, ormawaID).Error; err != nil {
		return fmt.Errorf("ormawa tidak ditemukan: %w", err)
	}

	// Calculate new point total (floor at 0)
	newPoints := ormawa.Poin + points
	if newPoints < 0 {
		newPoints = 0
	}

	// Update points
	if err := db.Model(&ormawa).Update("poin", newPoints).Error; err != nil {
		return fmt.Errorf("gagal update poin ormawa: %w", err)
	}

	// Log points history
	history := models.OrmawaPoinHistory{
		OrmawaID:  ormawaID,
		Poin:      points,
		Tipe:      tipe,
		Deskripsi: deskripsi,
		Tanggal:   time.Now(),
	}
	if err := db.Create(&history).Error; err != nil {
		return fmt.Errorf("gagal mencatat riwayat poin ormawa: %w", err)
	}

	return nil
}
