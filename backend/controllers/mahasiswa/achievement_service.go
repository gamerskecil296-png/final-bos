package mahasiswa

import (
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"

	"gorm.io/gorm"
)

// VerifyAchievement sets status to Diverifikasi and sends a notification
func VerifyAchievement(db *gorm.DB, achievementID uint, adminID uint) error {
	var achievement models.Prestasi
	if err := db.Preload("Mahasiswa").First(&achievement, achievementID).Error; err != nil {
		return err
	}

	err := db.Model(&achievement).Updates(map[string]interface{}{
		"status": "Diverifikasi",
	}).Error

	if err != nil {
		return err
	}

	// Trigger Notification
	notifikasi.Kirim(db, notifikasi.KirimParams{
		UserID:  achievement.Mahasiswa.PenggunaID,
		Type:    "success",
		Title:   "Prestasi Diverifikasi",
		Content: "Pencapaian kamu '" + achievement.NamaKegiatan + "' telah diverifikasi oleh admin. Selamat!",
		Link:    "/student/achievement",
	})

	return nil
}

// RejectAchievement sets status to Ditolak and sends a notification
func RejectAchievement(db *gorm.DB, achievementID uint, adminID uint, reason string) error {
	var achievement models.Prestasi
	if err := db.Preload("Mahasiswa").First(&achievement, achievementID).Error; err != nil {
		return err
	}

	err := db.Model(&achievement).Updates(map[string]interface{}{
		"status": "Ditolak",
	}).Error

	if err != nil {
		return err
	}

	// Trigger Notification
	notifikasi.Kirim(db, notifikasi.KirimParams{
		UserID:  achievement.Mahasiswa.PenggunaID,
		Type:    "error",
		Title:   "Prestasi Ditolak",
		Content: "Mohon maaf, laporan prestasi '" + achievement.NamaKegiatan + "' kamu ditolak. Alasan: " + reason,
		Link:    "/student/achievement",
	})

	return nil
}
