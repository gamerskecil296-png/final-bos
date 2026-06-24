package mahasiswa

import (
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"

	"gorm.io/gorm"
)

// ConfirmCounseling sets status to Dikonfirmasi and sends a notification
func ConfirmCounseling(db *gorm.DB, konselingID uint) error {
	var record models.Konseling
	if err := db.Preload("Mahasiswa").First(&record, konselingID).Error; err != nil {
		return err
	}

	err := db.Model(&record).Update("status", "Dikonfirmasi").Error
	if err != nil {
		return err
	}

	// Trigger Notification
	notifikasi.Kirim(db, notifikasi.KirimParams{
		UserID:  record.Mahasiswa.PenggunaID,
		Type:    "info",
		Title:   "Konseling Dikonfirmasi",
		Content: "Permohonan konseling kamu dengan topik '" + record.Topik + "' telah dikonfirmasi.",
		Link:    "/student/counseling",
	})

	return nil
}
