package cron

import (
	"fmt"
	"log"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"time"

	"github.com/robfig/cron/v3"
)

// InitCron menginisialisasi scheduler untuk berbagai task di backend.
func InitCron() {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.Local
	}

	c := cron.New(cron.WithLocation(loc))

	// Job 1: Pengingat Jadwal Kesehatan H-1 Hari (Berjalan setiap jam 08:00 Pagi)
	_, err = c.AddFunc("0 8 * * *", func() {
		log.Println("[Cron] Menjalankan pengecekan pengingat jadwal kesehatan H-1 Hari...")
		checkPengingatKesehatanH1Hari()
	})
	if err != nil {
		log.Printf("[Cron] Gagal menambahkan job H-1 Hari: %v", err)
	}

	// Job 2: Pengingat Jadwal Kesehatan H-1 Jam (Berjalan setiap 10 menit)
	_, err = c.AddFunc("*/10 * * * *", func() {
		log.Println("[Cron] Menjalankan pengecekan pengingat jadwal kesehatan H-1 Jam...")
		checkPengingatKesehatanH1Jam()
	})
	if err != nil {
		log.Printf("[Cron] Gagal menambahkan job H-1 Jam: %v", err)
	}

	c.Start()
	log.Println("[Cron] Scheduler berhasil dijalankan")
}

func checkPengingatKesehatanH1Hari() {
	db := config.DB
	now := time.Now()
	// Besok dari jam 00:00 sampai 23:59
	tomorrowStart := now.AddDate(0, 0, 1).Truncate(24 * time.Hour)
	tomorrowEnd := tomorrowStart.AddDate(0, 0, 1)

	var bookings []models.BookingKesehatan
	if err := db.Preload("Jadwal").Preload("Jadwal.TenagaKes").Preload("Mahasiswa").
		Joins("JOIN jadwal_kesehatan on jadwal_kesehatan.id = booking_kesehatan.jadwal_id").
		Where("booking_kesehatan.status = ?", "Dikonfirmasi").
		Where("jadwal_kesehatan.tanggal >= ? AND jadwal_kesehatan.tanggal < ?", tomorrowStart, tomorrowEnd).
		Find(&bookings).Error; err != nil {
		log.Println("[Cron] Error query booking H-1 hari:", err)
		return
	}

	for _, b := range bookings {
		if b.Mahasiswa.ID == 0 || b.Jadwal.TenagaKes.ID == 0 {
			continue
		}

		_ = notifikasi.Kirim(db, notifikasi.KirimParams{
			MahasiswaID: b.MahasiswaID,
			Type:        "info",
			Title:       "Pengingat Jadwal Kesehatan Besok ⏰",
			Content:     fmt.Sprintf("Besok tanggal %s Anda memiliki jadwal konsultasi/pemeriksaan kesehatan dengan %s pada pukul %s. Jangan lupa datang tepat waktu!", b.Jadwal.Tanggal.Format("02 Jan 2006"), b.Jadwal.TenagaKes.Nama, b.Jadwal.JamMulai),
		})
	}
	log.Printf("[Cron] H-1 Hari Pengingat Selesai dikirim ke %d mahasiswa", len(bookings))
}

func checkPengingatKesehatanH1Jam() {
	db := config.DB
	now := time.Now()
	// Hari ini dari jam 00:00 sampai 23:59
	todayStart := now.Truncate(24 * time.Hour)
	todayEnd := todayStart.AddDate(0, 0, 1)

	var bookings []models.BookingKesehatan
	if err := db.Preload("Jadwal").Preload("Jadwal.TenagaKes").Preload("Mahasiswa").
		Joins("JOIN jadwal_kesehatan on jadwal_kesehatan.id = booking_kesehatan.jadwal_id").
		Where("booking_kesehatan.status = ?", "Dikonfirmasi").
		Where("jadwal_kesehatan.tanggal >= ? AND jadwal_kesehatan.tanggal < ?", todayStart, todayEnd).
		Find(&bookings).Error; err != nil {
		log.Println("[Cron] Error query booking H-1 jam:", err)
		return
	}

	sentCount := 0
	for _, b := range bookings {
		if b.Mahasiswa.ID == 0 || b.Jadwal.TenagaKes.ID == 0 {
			continue
		}

		t, err := time.Parse("15:04", b.Jadwal.JamMulai)
		if err != nil {
			continue
		}

		jadwalTime := time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, now.Location())
		diff := jadwalTime.Sub(now)

		// Cek apakah jadwal tersebut akan dimulai dalam 50 hingga 60 menit ke depan
		if diff > 50*time.Minute && diff <= 60*time.Minute {
			_ = notifikasi.Kirim(db, notifikasi.KirimParams{
				MahasiswaID: b.MahasiswaID,
				Type:        "warning",
				Title:       "Pengingat: Jadwal 1 Jam Lagi! ⏰",
				Content:     fmt.Sprintf("Jadwal pemeriksaan kesehatan Anda dengan %s akan dimulai 1 jam lagi (Pukul %s). Segera bersiap-siap menuju lokasi: %s.", b.Jadwal.TenagaKes.Nama, b.Jadwal.JamMulai, b.Jadwal.Lokasi),
			})
			sentCount++
		}
	}
	log.Printf("[Cron] H-1 Jam Pengingat selesai diproses, %d notif terkirim", sentCount)
}
