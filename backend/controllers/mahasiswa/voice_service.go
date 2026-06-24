package mahasiswa

import (
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"

	"gorm.io/gorm"
)

// RespondAspirasi sets admin response and sends a notification
func RespondAspirasi(db *gorm.DB, ticketID uint, response string, status string) error {
	var ticket models.Aspirasi
	if err := db.Preload("Mahasiswa").First(&ticket, ticketID).Error; err != nil {
		return err
	}

	err := db.Model(&ticket).Updates(map[string]interface{}{
		"status": status, // Diproses, Selesai
		"respon": response,
	}).Error

	if err != nil {
		return err
	}

	// Trigger Notification
	notifikasi.Kirim(db, notifikasi.KirimParams{
		UserID:  ticket.Mahasiswa.PenggunaID,
		Type:    "student_voice",
		Title:   "Aspirasi Dibalas",
		Content: "Laporan aspirasi kamu ('" + ticket.Judul + "') telah mendapatkan respon dari admin.",
		Link:    "/student/voice",
	})

	return nil
}
