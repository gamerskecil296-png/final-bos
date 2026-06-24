package notifikasi

import (
	"fmt"
	"log"
	"siakad-backend/models"

	"gorm.io/gorm"
)

type KirimParams struct {
	MahasiswaID uint
	UserID      uint
	Type        string // info, warning, success, error, referral
	Title       string
	Content     string
	Link        string
}

// Kirim sends a notification to a user via the general notifikasi table (DB + Async Email)
func Kirim(db *gorm.DB, params KirimParams) error {
	finalUserID := params.UserID

	// Backward compatibility: If MahasiswaID is provided instead of UserID
	if finalUserID == 0 && params.MahasiswaID != 0 {
		var maba models.Mahasiswa
		if err := db.Select("pengguna_id").First(&maba, params.MahasiswaID).Error; err == nil {
			finalUserID = maba.PenggunaID
		}
	}

	if finalUserID == 0 {
		return fmt.Errorf("no valid user id provided for notification")
	}

	// 1. Save to Database
	notif := models.Notifikasi{
		UserID:    finalUserID,
		Tipe:      params.Type,
		Judul:     params.Title,
		Deskripsi: params.Content,
		IsRead:    false,
	}

	if err := db.Create(&notif).Error; err != nil {
		return fmt.Errorf("failed to save notification: %w", err)
	}

	// 2. Send Email (Async)
	go func() {
		kirimEmail(finalUserID, params)
	}()

	return nil
}

// KirimPsikolog mengirim notifikasi ke tabel psikolog.notifications (portal psikolog)
// Digunakan saat SuperAdmin mengambil tindakan terhadap referral milik psikolog
func KirimPsikolog(db *gorm.DB, psikologID, userID uint, tipe, judul, deskripsi string) error {
	if psikologID == 0 || userID == 0 {
		return fmt.Errorf("psikologID atau userID tidak valid: psikologID=%d userID=%d", psikologID, userID)
	}
	notif := models.PsikologNotification{
		PsikologID: psikologID,
		UserID:     userID,
		Tipe:       tipe,
		Judul:      judul,
		Deskripsi:  deskripsi,
		IsRead:     false,
	}
	if err := db.Create(&notif).Error; err != nil {
		log.Printf("[Notifikasi] Gagal simpan notif psikolog ID=%d: %v", psikologID, err)
		return err
	}
	log.Printf("[Notifikasi] Notif psikolog terkirim: psikologID=%d judul=%s", psikologID, judul)
	return nil
}

// kirimEmail is a placeholder for actual email sending logic
func kirimEmail(userID uint, params KirimParams) {
	log.Printf("[Notifikasi] SENDING EMAIL to User %d: [%s] %s - %s",
		userID, params.Type, params.Title, params.Content)
}
