package mahasiswa

import (
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"time"

	"gorm.io/gorm"
)

// UpdatePengajuanStatus sets status and sends a notification
func UpdatePengajuanStatus(db *gorm.DB, pengajuanID uint, status string, reason string) error {
	var pengajuan models.BeasiswaPendaftaran
	if err := db.Preload("Beasiswa").Preload("Mahasiswa").First(&pengajuan, pengajuanID).Error; err != nil {
		return err
	}

	err := db.Model(&pengajuan).Updates(map[string]interface{}{
		"status":  status, // Diterima, Ditolak
		"catatan": reason,
	}).Error

	if err != nil {
		return err
	}

	// Trigger Notification
	title := "Update Pengajuan Beasiswa"
	content := "Status pengajuan beasiswa '" + pengajuan.Beasiswa.Nama + "' kamu sekarang: " + status
	if status == "Ditolak" && reason != "" {
		content += ". Alasan: " + reason
	}

	notifikasi.Kirim(db, notifikasi.KirimParams{
		UserID:  pengajuan.Mahasiswa.PenggunaID,
		Type:    "beasiswa",
		Title:   title,
		Content: content,
		Link:    "/student/scholarship",
	})

	return nil
}

// CekDeadlineBeasiswa broadcasts deadline warnings to all students
func CekDeadlineBeasiswa(db *gorm.DB) error {
	var list []models.Beasiswa
	// Find active scholarships with deadline <= 3 days
	limit := time.Now().AddDate(0, 0, 3)
	db.Where("deadline <= ? AND deadline > ?", limit, time.Now()).Find(&list)

	for _, b := range list {
		// Ambil semua mahasiswa aktif
		var mahasiswaList []models.Mahasiswa
		db.Where("status_akun = ?", "Aktif").Select("id, pengguna_id").Find(&mahasiswaList)

		for _, mhs := range mahasiswaList {
			// Skip mahasiswa yang sudah mendaftar
			var existing models.BeasiswaPendaftaran
			if db.Where("mahasiswa_id = ? AND beasiswa_id = ?", mhs.ID, b.ID).First(&existing).Error == nil {
				continue
			}
			notifikasi.Kirim(db, notifikasi.KirimParams{
				UserID:  mhs.PenggunaID,
				Type:    "beasiswa",
				Title:   "⏰ Deadline Beasiswa Mendekat!",
				Content: "Pendaftaran '" + b.Nama + "' akan ditutup dalam 3 hari. Jangan sampai terlewat!",
				Link:    "/student/scholarship",
			})
		}
	}
	return nil
}
