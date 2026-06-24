package mahasiswa

import (
	"fmt"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"

	"github.com/gofiber/fiber/v2"
)

// ListHealthWorkers lists all active health workers
func ListHealthWorkers(c *fiber.Ctx) error {
	var workers []models.TenagaKesehatan
	if err := config.DB.Where("is_aktif = ?", true).Find(&workers).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil daftar tenaga kesehatan"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    workers,
	})
}

// GetHealthWorkerSchedules gets upcoming schedules for a specific worker
func GetHealthWorkerSchedules(c *fiber.Ctx) error {
	workerID := c.Params("id")
	var schedules []models.JadwalKesehatan
	today := time.Now().Truncate(24 * time.Hour)

	if err := config.DB.Where("tenaga_kes_id = ? AND tanggal >= ?", workerID, today).
		Order("tanggal asc, jam_mulai asc").Find(&schedules).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil jadwal"})
	}

	// Calculate remaining quota for each schedule
	var results []fiber.Map
	for _, s := range schedules {
		var bookingCount int64
		config.DB.Model(&models.BookingKesehatan{}).Where("jadwal_id = ? AND status NOT IN ('Ditolak', 'Dibatalkan')", s.ID).Count(&bookingCount)

		results = append(results, fiber.Map{
			"id":            s.ID,
			"tenaga_kes_id": s.TenagaKesID,
			"tanggal":       s.Tanggal.Format("2006-01-02"),
			"jam_mulai":     s.JamMulai,
			"jam_selesai":   s.JamSelesai,
			"kuota":         s.Kuota,
			"sisa_kuota":    s.Kuota - int(bookingCount),
			"lokasi":        s.Lokasi,
			"tipe_layanan":  s.TipeLayanan,
			"catatan":       s.Catatan,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

// GetAvailableHealthSchedules gets all upcoming available schedules
func GetAvailableHealthSchedules(c *fiber.Ctx) error {
	var schedules []models.JadwalKesehatan
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)

	if err := config.DB.Preload("TenagaKes").Where("tanggal >= ?", today).
		Order("tanggal asc, jam_mulai asc").Find(&schedules).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil jadwal"})
	}

	var results []fiber.Map
	for _, s := range schedules {
		var bookingCount int64
		config.DB.Model(&models.BookingKesehatan{}).Where("jadwal_id = ? AND status NOT IN ('Ditolak', 'Dibatalkan')", s.ID).Count(&bookingCount)

		results = append(results, fiber.Map{
			"id":            s.ID,
			"tenaga_kes_id": s.TenagaKesID,
			"tenaga_kes":    s.TenagaKes,
			"tanggal":       s.Tanggal.Format("2006-01-02"),
			"jam_mulai":     s.JamMulai,
			"jam_selesai":   s.JamSelesai,
			"kuota":         s.Kuota,
			"sisa_kuota":    s.Kuota - int(bookingCount),
			"lokasi":        s.Lokasi,
			"tipe_layanan":  s.TipeLayanan,
			"catatan":       s.Catatan,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
	})
}

// GetStudentHealthBookings returns booking history for the logged-in student
func GetStudentHealthBookings(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var bookings []models.BookingKesehatan
	if err := config.DB.Preload("Jadwal.TenagaKes").Where("mahasiswa_id = ?", student.ID).
		Order("created_at desc").Find(&bookings).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil riwayat booking"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    bookings,
	})
}

// CreateStudentHealthBooking creates a health booking for the student
func CreateStudentHealthBooking(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var body struct {
		JadwalID uint   `json:"jadwal_id"`
		Keluhan  string `json:"keluhan"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload tidak valid"})
	}

	// 1. Verify schedule
	var schedule models.JadwalKesehatan
	if err := config.DB.Preload("TenagaKes").First(&schedule, body.JadwalID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Jadwal tidak ditemukan"})
	}

	// 2. Check schedule date
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	if schedule.Tanggal.Before(today) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tidak dapat melakukan booking pada jadwal di masa lalu"})
	}

	// 3. Check quota
	var activeBookingCount int64
	config.DB.Model(&models.BookingKesehatan{}).Where("jadwal_id = ? AND status NOT IN ('Ditolak', 'Dibatalkan')", schedule.ID).Count(&activeBookingCount)
	if int(activeBookingCount) >= schedule.Kuota {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kuota jadwal ini sudah penuh"})
	}

	// 4. Check if student has already booked this schedule
	var existing models.BookingKesehatan
	err = config.DB.Where("jadwal_id = ? AND mahasiswa_id = ? AND status NOT IN ('Ditolak', 'Dibatalkan')", schedule.ID, student.ID).First(&existing).Error
	if err == nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Anda sudah terdaftar pada jadwal ini"})
	}

	// 5. Create booking
	booking := models.BookingKesehatan{
		JadwalID:    schedule.ID,
		MahasiswaID: student.ID,
		Keluhan:     body.Keluhan,
		Status:      "Menunggu Konfirmasi",
	}

	if err := config.DB.Create(&booking).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan booking"})
	}

	// Send notification to Tenaga Kesehatan
	go func() {
		var tk models.TenagaKesehatan
		if err := config.DB.First(&tk, schedule.TenagaKesID).Error; err == nil {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				UserID:  tk.UserID,
				Type:    "info",
				Title:   "Booking Baru Masuk 🏥",
				Content: fmt.Sprintf("Booking baru dari %s (%s) untuk tanggal %s pukul %s.", student.Nama, student.NIM, schedule.Tanggal.Format("02 Jan 2006"), schedule.JamMulai),
			})
		}
	}()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Pemesanan jadwal berhasil diajukan, menunggu konfirmasi.",
		"data":    booking,
	})
}

// CancelStudentHealthBooking cancels a booking
func CancelStudentHealthBooking(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	bookingID := c.Params("id")
	var booking models.BookingKesehatan
	if err := config.DB.Preload("Jadwal").Where("id = ? AND mahasiswa_id = ?", bookingID, student.ID).First(&booking).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Booking tidak ditemukan"})
	}

	if booking.Status == "Selesai" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tidak dapat membatalkan booking yang sudah selesai"})
	}

	booking.Status = "Dibatalkan"
	if err := config.DB.Save(&booking).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membatalkan booking"})
	}

	// Send notification to Tenaga Kesehatan
	go func() {
		var tk models.TenagaKesehatan
		if err := config.DB.First(&tk, booking.Jadwal.TenagaKesID).Error; err == nil {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				UserID:  tk.UserID,
				Type:    "warning",
				Title:   "Booking Dibatalkan Mahasiswa ⚠️",
				Content: fmt.Sprintf("Mahasiswa %s (%s) membatalkan booking untuk jadwal %s pukul %s.", student.Nama, student.NIM, booking.Jadwal.Tanggal.Format("02 Jan 2006"), booking.Jadwal.JamMulai),
			})
		}
	}()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Pemesanan jadwal berhasil dibatalkan",
	})
}

// RescheduleStudentHealthBooking reschedules an active or follow-up booking to a new schedule slot
func RescheduleStudentHealthBooking(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	bookingID := c.Params("id")
	var body struct {
		JadwalID uint `json:"jadwal_id"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload tidak valid"})
	}

	// 1. Fetch old booking
	var booking models.BookingKesehatan
	if err := config.DB.Preload("Jadwal").Where("id = ? AND mahasiswa_id = ?", bookingID, student.ID).First(&booking).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Booking tidak ditemukan"})
	}

	if booking.Status == "Selesai" || booking.Status == "Dibatalkan" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Sesi ini sudah tidak bisa dijadwalkan ulang"})
	}

	// 2. Fetch new schedule
	var newSchedule models.JadwalKesehatan
	if err := config.DB.Preload("TenagaKes").First(&newSchedule, body.JadwalID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Jadwal baru tidak ditemukan"})
	}

	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	if newSchedule.Tanggal.Before(today) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tidak dapat melakukan reschedule ke jadwal masa lalu"})
	}

	// 3. Check quota on new schedule
	var activeBookingCount int64
	config.DB.Model(&models.BookingKesehatan{}).Where("jadwal_id = ? AND status NOT IN ('Ditolak', 'Dibatalkan')", newSchedule.ID).Count(&activeBookingCount)
	if int(activeBookingCount) >= newSchedule.Kuota {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kuota jadwal yang baru sudah penuh"})
	}

	// 4. Update booking
	booking.JadwalID = newSchedule.ID
	booking.Status = "Menunggu Konfirmasi"
	if err := config.DB.Save(&booking).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan jadwal baru"})
	}

	// Send notification
	go func() {
		var tk models.TenagaKesehatan
		if err := config.DB.First(&tk, newSchedule.TenagaKesID).Error; err == nil {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				UserID:  tk.UserID,
				Type:    "info",
				Title:   "Jadwal Ulang Sesi Medis 🔄",
				Content: fmt.Sprintf("Mahasiswa %s (%s) melakukan penjadwalan ulang ke tanggal %s pukul %s.", student.Nama, student.NIM, newSchedule.Tanggal.Format("02 Jan 2006"), newSchedule.JamMulai),
			})
		}
	}()

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Sesi berhasil dijadwalkan ulang, menunggu konfirmasi Tenaga Kesehatan.",
		"data":    booking,
	})
}
