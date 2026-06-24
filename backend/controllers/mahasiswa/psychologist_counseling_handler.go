package mahasiswa

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
)

func studentWithRelations(c *fiber.Ctx) (*models.Mahasiswa, error) {
	student, err := getStudent(c)
	if err != nil {
		return nil, fiber.NewError(fiber.StatusNotFound, "Profil mahasiswa tidak ditemukan")
	}

	config.DB.Preload("Fakultas").Preload("ProgramStudi").First(student, student.ID)
	return student, nil
}

func studentProfileResponse(student *models.Mahasiswa) fiber.Map {
	return fiber.Map{
		"id":               student.ID,
		"user_id":          student.PenggunaID,
		"nim":              student.NIM,
		"name":             student.Nama,
		"email":            student.EmailKampus,
		"phone":            student.NoHP,
		"faculty_id":       student.FakultasID,
		"faculty":          student.Fakultas.Nama,
		"program_studi_id": student.ProgramStudiID,
		"program_studi":    student.ProgramStudi.Nama,
		"status":           student.StatusAkun,
		"tahun_masuk":      student.TahunMasuk,
	}
}

func psychologistProfileResponse(psikolog models.Psikolog) fiber.Map {
	return fiber.Map{
		"id":             psikolog.ID,
		"user_id":        psikolog.UserID,
		"name":           psikolog.Nama,
		"email":          psikolog.Email,
		"phone":          psikolog.NoHP,
		"specialization": psikolog.Spesialisasi,
		"bio":            psikolog.Bio,
		"photo_url":      psikolog.FotoURL,
		"location":       psikolog.Lokasi,
		"languages":      splitCSV(psikolog.Bahasa),
		"is_active":      psikolog.IsAktif,
	}
}

func psychologistBookingResponse(booking models.PsikologBooking) fiber.Map {
	return fiber.Map{
		"id":              booking.ID,
		"psychologist":    psychologistProfileResponse(booking.Psikolog),
		"psychologist_id": booking.PsikologID,
		"student_id":      booking.MahasiswaID,
		"date":            booking.Tanggal.Format("2006-01-02"),
		"display_date":    booking.Tanggal.Format("02 Jan 2006"),
		"start":           booking.JamMulai,
		"end":             booking.JamSelesai,
		"topic":           booking.Topik,
		"complaint":       booking.Keluhan,
		"status":          booking.Status,
		"admin_note":      booking.CatatanAdmin,
		"mode":            booking.Mode,
		"link_meeting":    booking.LinkMeeting,
	}
}

func jsonSuccess(c *fiber.Ctx, data any) error {
	return c.JSON(fiber.Map{"success": true, "data": data})
}

// GetStudentSummary returns compact student data that can be consumed by web or mobile dashboards.
func GetStudentSummary(c *fiber.Ctx) error {
	student, err := studentWithRelations(c)
	if err != nil {
		return err
	}

	var achievements int64
	config.DB.Model(&models.Prestasi{}).Where("mahasiswa_id = ?", student.ID).Count(&achievements)
	var scholarships int64
	config.DB.Model(&models.BeasiswaPendaftaran{}).Where("mahasiswa_id = ?", student.ID).Count(&scholarships)
	var aspirations int64
	config.DB.Model(&models.Aspirasi{}).Where("mahasiswa_id = ?", student.ID).Count(&aspirations)
	var health int64
	config.DB.Model(&models.Kesehatan{}).Where("mahasiswa_id = ?", student.ID).Count(&health)
	var psikologBookings int64
	config.DB.Model(&models.PsikologBooking{}).Where("mahasiswa_id = ?", student.ID).Count(&psikologBookings)

	return jsonSuccess(c, fiber.Map{
		"profile": studentProfileResponse(student),
		"stats": fiber.Map{
			"achievements":          achievements,
			"scholarship_requests":  scholarships,
			"aspirations":           aspirations,
			"health_records":        health,
			"psychologist_bookings": psikologBookings,
		},
	})
}

// ListPsychologists returns active psychologists that students can book.
func ListPsychologists(c *fiber.Ctx) error {
	var psychologists []models.Psikolog
	query := config.DB.Where("is_aktif = ?", true).Order("nama asc")
	if search := strings.TrimSpace(c.Query("search")); search != "" {
		like := "%" + search + "%"
		query = query.Where("nama ILIKE ? OR spesialisasi ILIKE ? OR lokasi ILIKE ?", like, like, like)
	}
	if err := query.Find(&psychologists).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(psychologists))
	for _, psikolog := range psychologists {
		items = append(items, psychologistProfileResponse(psikolog))
	}
	return jsonSuccess(c, items)
}

// GetPsychologistSchedules returns active schedule slots for one psychologist.
func GetPsychologistSchedules(c *fiber.Ctx) error {
	psikologID := c.Params("id")
	var psikolog models.Psikolog
	if err := config.DB.Where("id = ? AND is_aktif = ?", psikologID, true).First(&psikolog).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Psikolog tidak ditemukan")
	}

	// Ambil student ID untuk cek booking aktif mahasiswa ini
	var studentID uint
	if student, err := getStudent(c); err == nil {
		studentID = student.ID
	}

	var slots []models.PsikologScheduleSlot
	if err := config.DB.Where("psikolog_id = ? AND is_aktif = ?", psikolog.ID, true).Order("hari asc, jam_mulai asc").Find(&slots).Error; err != nil {
		return err
	}

	days := []string{"Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"}
	dayOrder := map[string]int{}
	for index, day := range days {
		dayOrder[day] = index
	}
	sort.Slice(slots, func(i, j int) bool {
		if dayOrder[slots[i].Hari] == dayOrder[slots[j].Hari] {
			return slots[i].JamMulai < slots[j].JamMulai
		}
		return dayOrder[slots[i].Hari] < dayOrder[slots[j].Hari]
	})

	items := make([]fiber.Map, 0, len(slots))
	for _, slot := range slots {
		nextDate := nextDateForIndonesianDay(slot.Hari, slot.JamMulai)

		// Hitung booking aktif HANYA untuk tanggal occurrence berikutnya dari slot ini
		// Ini memastikan booking dari minggu lalu tidak ikut terhitung
		var activeBookings int64
		config.DB.Model(&models.PsikologBooking{}).
			Where("psikolog_id = ? AND jam_mulai = ? AND DATE(tanggal) = DATE(?) AND status IN ?",
				psikolog.ID, slot.JamMulai, nextDate, []string{"Menunggu", "Dikonfirmasi"}).
			Count(&activeBookings)

		remaining := slot.Kuota - int(activeBookings)
		if remaining < 0 {
			remaining = 0
		}

		// Cek apakah mahasiswa INI sudah booking slot ini untuk tanggal berikutnya
		alreadyBooked := false
		if studentID > 0 {
			var studentBooking int64
			config.DB.Model(&models.PsikologBooking{}).
				Where("psikolog_id = ? AND mahasiswa_id = ? AND jam_mulai = ? AND DATE(tanggal) = DATE(?) AND status IN ?",
					psikolog.ID, studentID, slot.JamMulai, nextDate, []string{"Menunggu", "Dikonfirmasi"}).
				Count(&studentBooking)
			alreadyBooked = studentBooking > 0
		}

		items = append(items, fiber.Map{
			"id":              slot.ID,
			"day":             slot.Hari,
			"hari":            slot.Hari,
			"category":        firstNonEmpty(slot.Kategori, counselingCategoryFromSpecialization(psikolog.Spesialisasi)),
			"kategori":        firstNonEmpty(slot.Kategori, counselingCategoryFromSpecialization(psikolog.Spesialisasi)),
			"start":           slot.JamMulai,
			"jam_mulai":       slot.JamMulai,
			"end":             slot.JamSelesai,
			"jam_selesai":     slot.JamSelesai,
			"location":        slot.Lokasi,
			"lokasi":          slot.Lokasi,
			"quota":           slot.Kuota,
			"kuota":           slot.Kuota,
			"sisa_kuota":      remaining,
			"active_bookings": activeBookings,
			"already_booked":  alreadyBooked,
			"is_active":       slot.IsAktif,
			"next_date":       nextDate.Format("2006-01-02"),
			"tanggal":         nextDate.Format("2006-01-02"),
			"display_date":    nextDate.Format("02 Jan 2006"),
			"display":         fmt.Sprintf("%s, %s - %s", slot.Hari, slot.JamMulai, slot.JamSelesai),
			"psikolog_id":     psikolog.ID,
		})
	}

	return jsonSuccess(c, fiber.Map{"psychologist": psychologistProfileResponse(psikolog), "slots": items})
}

// GetAvailablePsychologistSchedules returns every active psychologist slot that students can book.
func GetAvailablePsychologistSchedules(c *fiber.Ctx) error {
	// Ambil student ID untuk cek booking aktif mahasiswa ini
	var studentID uint
	if student, err := getStudent(c); err == nil {
		studentID = student.ID
	}

	var slots []models.PsikologScheduleSlot
	if err := config.DB.
		Preload("Psikolog").
		Joins("JOIN psikolog.profiles ON psikolog.profiles.id = psikolog.schedule_slots.psikolog_id").
		Where("psikolog.schedule_slots.is_aktif = ? AND psikolog.profiles.is_aktif = ?", true, true).
		Order("psikolog.schedule_slots.hari asc, psikolog.schedule_slots.jam_mulai asc").
		Find(&slots).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(slots))
	for _, slot := range slots {
		nextDate := nextDateForIndonesianDay(slot.Hari, slot.JamMulai)

		// Hitung booking aktif HANYA untuk tanggal occurrence berikutnya
		var activeBookings int64
		config.DB.Model(&models.PsikologBooking{}).
			Where("psikolog_id = ? AND jam_mulai = ? AND DATE(tanggal) = DATE(?) AND status IN ?",
				slot.PsikologID, slot.JamMulai, nextDate, []string{"Menunggu", "Dikonfirmasi"}).
			Count(&activeBookings)

		remaining := slot.Kuota - int(activeBookings)
		if remaining < 0 {
			remaining = 0
		}

		// Cek apakah mahasiswa INI sudah booking slot ini untuk tanggal berikutnya
		alreadyBooked := false
		if studentID > 0 {
			var studentBooking int64
			config.DB.Model(&models.PsikologBooking{}).
				Where("psikolog_id = ? AND mahasiswa_id = ? AND jam_mulai = ? AND DATE(tanggal) = DATE(?) AND status IN ?",
					slot.PsikologID, studentID, slot.JamMulai, nextDate, []string{"Menunggu", "Dikonfirmasi"}).
				Count(&studentBooking)
			alreadyBooked = studentBooking > 0
		}

		category := firstNonEmpty(slot.Kategori, counselingCategoryFromSpecialization(slot.Psikolog.Spesialisasi))

		items = append(items, fiber.Map{
			"id":              slot.ID,
			"slot_id":         slot.ID,
			"psikolog_id":     slot.PsikologID,
			"psychologist":    psychologistProfileResponse(slot.Psikolog),
			"nama_konselor":   slot.Psikolog.Nama,
			"kategori":        category,
			"tipe":            category,
			"specialization":  slot.Psikolog.Spesialisasi,
			"hari":            slot.Hari,
			"tanggal":         nextDate.Format("2006-01-02"),
			"display_date":    nextDate.Format("02 Jan 2006"),
			"jam_mulai":       slot.JamMulai,
			"jam_selesai":     slot.JamSelesai,
			"lokasi":          firstNonEmpty(slot.Lokasi, slot.Psikolog.Lokasi, "Ruang Konseling BKU"),
			"kuota":           slot.Kuota,
			"sisa_kuota":      remaining,
			"active_bookings": activeBookings,
			"already_booked":  alreadyBooked,
			"is_active":       slot.IsAktif,
		})
	}

	sort.Slice(items, func(i, j int) bool {
		leftDate, _ := time.Parse("2006-01-02", items[i]["tanggal"].(string))
		rightDate, _ := time.Parse("2006-01-02", items[j]["tanggal"].(string))
		if leftDate.Equal(rightDate) {
			return items[i]["jam_mulai"].(string) < items[j]["jam_mulai"].(string)
		}
		return leftDate.Before(rightDate)
	})

	return jsonSuccess(c, items)
}

// GetStudentPsychologistBookings returns the logged-in student's bookings in the psychologist module.
func GetStudentPsychologistBookings(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var bookings []models.PsikologBooking
	if err := config.DB.Preload("Psikolog").Where("mahasiswa_id = ?", student.ID).Order("tanggal desc, jam_mulai desc").Find(&bookings).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(bookings))
	for _, booking := range bookings {
		item := psychologistBookingResponse(booking)
		var noteCount int64
		config.DB.Model(&models.PsikologSessionNote{}).
			Where("mahasiswa_id = ? AND psikolog_id = ? AND booking_id = ?", student.ID, booking.PsikologID, booking.ID).
			Count(&noteCount)
		item["has_medical_record"] = noteCount > 0
		item["medical_record_count"] = noteCount

		var queueNumber int64 = 0
		if booking.Status != "Dibatalkan" && booking.Status != "Ditolak" {
			config.DB.Model(&models.PsikologBooking{}).
				Where("psikolog_id = ? AND DATE(tanggal) = DATE(?) AND created_at <= ? AND status IN ?",
					booking.PsikologID, booking.Tanggal, booking.CreatedAt, []string{"Menunggu", "Dikonfirmasi", "Selesai"}).
				Count(&queueNumber)
		}
		item["queue_number"] = queueNumber

		items = append(items, item)
	}
	return jsonSuccess(c, items)
}

// GetStudentPsychologistMedicalRecord returns session notes visible to the logged-in student.
func GetStudentPsychologistMedicalRecord(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var records []models.PsikologSessionNote
	if err := config.DB.
		Preload("Psikolog").
		Preload("Booking.Psikolog").
		Where("mahasiswa_id = ?", student.ID).
		Order("tanggal desc").
		Find(&records).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(records))
	status := "Belum ada catatan"
	for _, record := range records {
		if status == "Belum ada catatan" && strings.TrimSpace(record.StatusPasien) != "" {
			status = record.StatusPasien
		}

		psikologName := record.Psikolog.Nama
		if psikologName == "" && record.Booking != nil {
			psikologName = record.Booking.Psikolog.Nama
		}

		// Tindak lanjut flags
		tindakLanjut := []string{}
		if record.TindakLanjutTuntas {
			tindakLanjut = append(tindakLanjut, "Tuntas")
		}
		if record.TindakLanjutLanjutan {
			tindakLanjut = append(tindakLanjut, "Lanjutan")
		}
		if record.TindakLanjutRujuk {
			tindakLanjut = append(tindakLanjut, "Rujuk")
		}

		tanggalAsesmen := ""
		if record.TanggalAsesmen != nil {
			tanggalAsesmen = record.TanggalAsesmen.Format("02 Jan 2006")
		}

		items = append(items, fiber.Map{
			"id":             record.ID,
			"booking_id":     record.BookingID,
			"psychologist":   psikologName,
			"date":           record.Tanggal.Format("2006-01-02"),
			"display_date":   record.Tanggal.Format("02 Jan 2006"),
			"time":           record.Tanggal.Format("15:04"),
			"complaint":      record.Keluhan,
			"observation":    record.Observasi,
			"recommendation": record.Rekomendasi,
			"mood":           record.Mood,
			"type":           firstNonEmpty(record.JenisSesi, "Konseling"),
			"status":         firstNonEmpty(record.StatusPasien, record.Mood, "Tercatat"),
			// Screening detail fields
			"tujuan_pemeriksaan":     record.TujuanPemeriksaan,
			"tanggal_asesmen":        tanggalAsesmen,
			"riwayat_keluhan":        record.RiwayatKeluhan,
			"aspek_kognitif":         record.AspekKognitif,
			"aspek_emosional":        record.AspekEmosional,
			"aspek_perilaku":         record.AspekPerilaku,
			"rekomendasi_mahasiswa":  record.RekomendasiMahasiswa,
			"rekomendasi_prodi":      record.RekomendasiProdi,
			"rekomendasi_orang_tua":  record.RekomendasiOrangTua,
			"tindak_lanjut":          tindakLanjut,
			"tindak_lanjut_tuntas":   record.TindakLanjutTuntas,
			"tindak_lanjut_lanjutan": record.TindakLanjutLanjutan,
			"tindak_lanjut_rujuk":    record.TindakLanjutRujuk,
			"kesimpulan":             record.Kesimpulan,
		})
	}

	return jsonSuccess(c, fiber.Map{
		"summary": fiber.Map{
			"total_records": len(records),
			"latest_status": status,
		},
		"records": items,
	})
}

// CreateStudentPsychologistBooking creates a booking in the psychologist module from the student counseling flow.
func CreateStudentPsychologistBooking(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var body struct {
		PsikologID uint   `json:"psikolog_id"`
		SlotID     uint   `json:"slot_id"`
		Date       string `json:"date"`
		Start      string `json:"start"`
		End        string `json:"end"`
		Topic      string `json:"topic"`
		Complaint  string `json:"complaint"`
		Mode       string `json:"mode"` // "Tatap Muka" atau "Online"
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload booking tidak valid")
	}
	if body.PsikologID == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "psikolog_id wajib diisi")
	}

	var psikolog models.Psikolog
	if err := config.DB.Where("id = ? AND is_aktif = ?", body.PsikologID, true).First(&psikolog).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Psikolog tidak tersedia")
	}

	if body.SlotID != 0 {
		var slot models.PsikologScheduleSlot
		if err := config.DB.Where("id = ? AND psikolog_id = ? AND is_aktif = ?", body.SlotID, psikolog.ID, true).First(&slot).Error; err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Slot jadwal tidak tersedia")
		}
		body.Start = slot.JamMulai
		body.End = slot.JamSelesai
		if strings.TrimSpace(body.Topic) == "" {
			body.Topic = firstNonEmpty(slot.Kategori, counselingCategoryFromSpecialization(psikolog.Spesialisasi))
		}
		if body.Date == "" {
			body.Date = nextDateForIndonesianDay(slot.Hari, slot.JamMulai).Format("2006-01-02")
		}
	}

	date, err := time.Parse("2006-01-02", strings.TrimSpace(body.Date))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "date wajib berformat YYYY-MM-DD")
	}
	if strings.TrimSpace(body.Start) == "" || strings.TrimSpace(body.End) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "start dan end wajib diisi")
	}
	if strings.TrimSpace(body.Topic) == "" {
		body.Topic = "Konseling"
	}

	// Cek booking aktif untuk slot ini — hanya untuk tanggal yang sama persis
	var existing int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND jam_mulai = ? AND DATE(tanggal) = DATE(?) AND status IN ?",
			psikolog.ID, body.Start, date, []string{"Menunggu", "Dikonfirmasi"}).
		Count(&existing)

	// Cek apakah mahasiswa ini sudah booking slot yang sama pada tanggal yang sama
	var studentExisting int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND mahasiswa_id = ? AND jam_mulai = ? AND DATE(tanggal) = DATE(?) AND status IN ?",
			psikolog.ID, student.ID, body.Start, date, []string{"Menunggu", "Dikonfirmasi"}).
		Count(&studentExisting)
	if studentExisting > 0 {
		return fiber.NewError(fiber.StatusConflict, "Kamu sudah memiliki booking aktif pada slot ini")
	}
	if body.SlotID != 0 {
		var slot models.PsikologScheduleSlot
		if err := config.DB.First(&slot, body.SlotID).Error; err == nil && slot.Kuota > 0 && existing >= int64(slot.Kuota) {
			return fiber.NewError(fiber.StatusConflict, "Kuota slot ini sudah penuh")
		}
	} else if existing > 0 {
		return fiber.NewError(fiber.StatusConflict, "Slot ini sudah memiliki booking aktif")
	}

	mode := body.Mode
	if mode != "Online" {
		mode = "Tatap Muka"
	}

	booking := models.PsikologBooking{
		PsikologID:  psikolog.ID,
		MahasiswaID: student.ID,
		Tanggal:     date,
		JamMulai:    body.Start,
		JamSelesai:  body.End,
		Topik:       body.Topic,
		Keluhan:     body.Complaint,
		Status:      "Menunggu",
		Mode:        mode,
	}
	if err := config.DB.Create(&booking).Error; err != nil {
		return err
	}

	notification := models.PsikologNotification{
		PsikologID: psikolog.ID,
		UserID:     psikolog.UserID,
		Judul:      "Booking Konseling Baru",
		Deskripsi:  fmt.Sprintf("%s mengajukan booking konseling %s (%s) pukul %s.", student.Nama, date.Format("02 Jan 2006"), mode, booking.JamMulai),
		Tipe:       "booking",
		IsRead:     false,
	}
	_ = config.DB.Create(&notification).Error

	if err := config.DB.Preload("Psikolog").First(&booking, booking.ID).Error; err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"success": true, "data": psychologistBookingResponse(booking)})
}

// CancelStudentPsychologistBooking cancels the logged-in student's psychologist booking.
func CancelStudentPsychologistBooking(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var booking models.PsikologBooking
	if err := config.DB.Where("id = ? AND mahasiswa_id = ?", c.Params("id"), student.ID).First(&booking).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Booking tidak ditemukan")
	}
	if booking.Status == "Selesai" {
		return fiber.NewError(fiber.StatusBadRequest, "Booking selesai tidak dapat dibatalkan")
	}
	if err := config.DB.Model(&booking).Update("status", "Dibatalkan").Error; err != nil {
		return err
	}
	return jsonSuccess(c, fiber.Map{"id": booking.ID, "status": "Dibatalkan"})
}

// RescheduleStudentPsychologistBooking allows a student to reschedule an existing booking.
func RescheduleStudentPsychologistBooking(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var booking models.PsikologBooking
	if err := config.DB.Preload("Psikolog").
		Where("id = ? AND mahasiswa_id = ?", c.Params("id"), student.ID).
		First(&booking).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Booking tidak ditemukan")
	}
	if booking.Status != "Menunggu" && booking.Status != "Dikonfirmasi" {
		return fiber.NewError(fiber.StatusBadRequest, "Hanya booking berstatus Menunggu atau Dikonfirmasi yang dapat dijadwalkan ulang")
	}

	var body struct {
		Date  string `json:"date"`
		Start string `json:"start"`
		End   string `json:"end"`
		Mode  string `json:"mode"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}
	if strings.TrimSpace(body.Date) == "" || strings.TrimSpace(body.Start) == "" {
		return fiber.NewError(fiber.StatusBadRequest, "date dan start wajib diisi")
	}

	newDate, err := time.Parse("2006-01-02", strings.TrimSpace(body.Date))
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "date wajib berformat YYYY-MM-DD")
	}
	now := time.Now().UTC()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	if newDate.Before(today) {
		return fiber.NewError(fiber.StatusBadRequest, "Tanggal reschedule tidak boleh di masa lalu")
	}

	// Check if the new slot already has an active booking (excluding this one)
	var existing int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND jam_mulai = ? AND DATE(tanggal) = DATE(?) AND status IN ? AND id != ?",
			booking.PsikologID, body.Start, newDate, []string{"Menunggu", "Dikonfirmasi"}, booking.ID).
		Count(&existing)
	if existing > 0 {
		return fiber.NewError(fiber.StatusConflict, "Slot tersebut sudah terisi oleh booking lain")
	}

	end := body.End
	if strings.TrimSpace(end) == "" {
		end = booking.JamSelesai
	}

	mode := body.Mode
	if mode != "Online" {
		mode = "Tatap Muka"
	}

	updates := map[string]any{
		"tanggal":      newDate,
		"jam_mulai":    body.Start,
		"jam_selesai":  end,
		"status":       "Menunggu",
		"link_meeting": "",
		"mode":         mode,
	}
	if err := config.DB.Model(&booking).Updates(updates).Error; err != nil {
		return err
	}

	// Notify psychologist
	notification := models.PsikologNotification{
		PsikologID: booking.PsikologID,
		UserID:     booking.Psikolog.UserID,
		Judul:      "Permintaan Reschedule Konseling",
		Deskripsi:  fmt.Sprintf("%s mengajukan reschedule ke %s pukul %s.", student.Nama, newDate.Format("02 Jan 2006"), body.Start),
		Tipe:       "reschedule",
		IsRead:     false,
	}
	_ = config.DB.Create(&notification).Error

	if err := config.DB.Preload("Psikolog").First(&booking, booking.ID).Error; err != nil {
		return err
	}
	return jsonSuccess(c, psychologistBookingResponse(booking))
}

func nextDateForIndonesianDay(day string, jamMulai string) time.Time {
	targets := map[string]time.Weekday{
		"Minggu": time.Sunday,
		"Senin":  time.Monday,
		"Selasa": time.Tuesday,
		"Rabu":   time.Wednesday,
		"Kamis":  time.Thursday,
		"Jumat":  time.Friday,
		"Sabtu":  time.Saturday,
	}
	now := time.Now().UTC()
	target, ok := targets[day]
	if !ok {
		return time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	}
	daysUntil := (int(target) - int(now.Weekday()) + 7) % 7
	if daysUntil == 0 {
		t, err := time.Parse("15:04", jamMulai)
		if err == nil {
			slotTime := time.Date(now.Year(), now.Month(), now.Day(), t.Hour(), t.Minute(), 0, 0, time.UTC)
			if now.After(slotTime) {
				daysUntil = 7
			}
		} else {
			daysUntil = 7
		}
	}

	res := now.AddDate(0, 0, daysUntil)
	return time.Date(res.Year(), res.Month(), res.Day(), 0, 0, 0, 0, res.Location())
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			result = append(result, trimmed)
		}
	}
	return result
}

func counselingCategoryFromSpecialization(value string) string {
	lowered := strings.ToLower(value)
	switch {
	case strings.Contains(lowered, "akademik"), strings.Contains(lowered, "belajar"), strings.Contains(lowered, "studi"):
		return "Akademik"
	case strings.Contains(lowered, "karir"), strings.Contains(lowered, "minat"), strings.Contains(lowered, "bakat"):
		return "Karir"
	default:
		return "Personal"
	}
}

// GetStudentReferrals returns psychologist referrals/tindak lanjut for the logged-in student.
func GetStudentReferrals(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var referrals []models.PsikologReferral
	if err := config.DB.
		Preload("Psikolog").
		Preload("Booking").
		Where("mahasiswa_id = ?", student.ID).
		Order("created_at desc").
		Find(&referrals).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(referrals))
	for _, r := range referrals {
		// Only show sent or received referrals to student (or you can show all status, but let's show all status since it represents their tindak lanjut)
		psikologName := r.Psikolog.Nama
		if psikologName == "" && r.Booking != nil {
			psikologName = r.Booking.Psikolog.Nama
		}

		items = append(items, fiber.Map{
			"id":               r.ID,
			"booking_id":       r.BookingID,
			"psychologist":     psikologName,
			"type":             r.Tipe,
			"reason":           r.Alasan,
			"status":           r.Status,
			"target_party":     r.PihakTujuan,
			"target_email":     r.EmailTujuan,
			"created_at":       r.TanggalDibuat.Format("2006-01-02"),
			"display_date":     r.TanggalDibuat.Format("02 Jan 2006"),
			"time":             r.TanggalDibuat.Format("15:04"),
			"sent_at":          r.TanggalDikirim,
			"received_at":      r.TanggalDiterima,
			"referral_pdf_url": r.SuratRujiukanURL,
			"support_file_url": r.FilePendukungURL,
		})
	}

	return jsonSuccess(c, items)
}

// ExportStudentSessionNotePDF generates a complete PDF record for a single counseling session for student
func ExportStudentSessionNotePDF(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var rec models.PsikologSessionNote
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.DosenPA").Preload("Psikolog").
		Where("id = ? AND mahasiswa_id = ?", c.Params("id"), student.ID).First(&rec).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Catatan sesi tidak ditemukan")
	}

	return generateSessionNotePDF(c, rec)
}

func ExportBookingSessionNotePDF(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return err
	}

	var rec models.PsikologSessionNote
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.DosenPA").Preload("Psikolog").
		Where("booking_id = ? AND mahasiswa_id = ?", c.Params("id"), student.ID).First(&rec).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Catatan sesi tidak ditemukan untuk booking ini")
	}

	return generateSessionNotePDF(c, rec)
}

func generateSessionNotePDF(c *fiber.Ctx, rec models.PsikologSessionNote) error {
	psikolog := rec.Psikolog

	// Create Landscape PDF
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(20, 38, 20)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AliasNbPages("")

	// Background Kop Surat
	pdf.SetHeaderFunc(func() {
		pdf.Image("assets/kop_rektorat_landscape.jpeg", 0, 0, 297, 210, false, "JPEG", 0, "")
	})

	pdf.AddPage()

	pdf.SetTextColor(15, 23, 42) // Slate 900

	// Title
	pdf.SetFont("Helvetica", "B", 13)
	pdf.CellFormat(0, 6, "LAPORAN SESI KONSELING MAHASISWA", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetTextColor(100, 116, 139)
	docNumber := utils.GenerateDocumentNumber("Hasil Konseling")
	refNum := fmt.Sprintf("Nomor: %s", docNumber)
	pdf.CellFormat(0, 5, refNum, "", 1, "C", false, 0, "")
	pdf.Ln(5)

	// Divider
	pdf.SetDrawColor(226, 232, 240)
	pdf.Line(20, pdf.GetY(), 277, pdf.GetY())
	pdf.Ln(3)

	// ── Student Identity Section ─────────────────────────────────────────────
	pdf.SetTextColor(15, 23, 42)
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(0, 5, "I. DATA DIRI MAHASISWA (STUDENT PROFILE)", "", 1, "L", false, 0, "")
	pdf.Ln(1)

	// Profile Table Grid (Total printable width is 257mm)
	dosenPAVal := "-"
	if rec.Mahasiswa.DosenPA != nil {
		dosenPAVal = rec.Mahasiswa.DosenPA.Nama
	}

	tglLahirStr := "-"
	if !rec.Mahasiswa.TanggalLahir.IsZero() {
		tglLahirStr = formatIndoDate(rec.Mahasiswa.TanggalLahir)
	}

	details := [][]string{
		{"Nama Mahasiswa", rec.Mahasiswa.Nama, "NIM", rec.Mahasiswa.NIM},
		{"Program Studi", rec.Mahasiswa.ProgramStudi.Nama, "Fakultas", rec.Mahasiswa.Fakultas.Nama},
		{"Semester Sekarang", strconv.Itoa(rec.Mahasiswa.SemesterSekarang), "IPK", fmt.Sprintf("%.2f", rec.Mahasiswa.IPK)},
		{"Tempat/Tgl Lahir", fmt.Sprintf("%s, %s", rec.Mahasiswa.TempatLahir, tglLahirStr), "Jenis Kelamin", rec.Mahasiswa.JenisKelamin},
		{"Dosen Wali (PA)", dosenPAVal, "No. Handphone", rec.Mahasiswa.NoHP},
	}

	// Table style
	pdf.SetFillColor(248, 250, 252) // Slate 50
	pdf.SetDrawColor(241, 245, 249) // Slate 100

	for _, row := range details {
		pdf.SetFont("Helvetica", "B", 8)
		pdf.CellFormat(50, 5, row[0], "1", 0, "L", true, 0, "")
		pdf.SetFont("Helvetica", "", 8)
		pdf.CellFormat(78, 5, row[1], "1", 0, "L", false, 0, "")

		pdf.SetFont("Helvetica", "B", 8)
		pdf.CellFormat(50, 5, row[2], "1", 0, "L", true, 0, "")
		pdf.SetFont("Helvetica", "", 8)
		pdf.CellFormat(79, 5, row[3], "1", 1, "L", false, 0, "")
	}
	pdf.Ln(4)

	// ── Session Details Section ──────────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(0, 5, "II. CATATAN ASESMEN & SESI KONSELING", "", 1, "L", false, 0, "")
	pdf.Ln(1)

	// Session Header Band (257mm width)
	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetDrawColor(226, 232, 240) // Slate 200
	pdf.SetTextColor(15, 23, 42)

	pdf.SetFont("Helvetica", "B", 8.5)
	headerText := fmt.Sprintf(" Tanggal Sesi: %s  -  Waktu: %s WIB  -  Mode: %s", formatIndoDate(rec.Tanggal), rec.Tanggal.Format("15:04"), rec.JenisSesi)
	pdf.CellFormat(257, 5.5, headerText, "1", 1, "L", true, 0, "")

	// Sesi Meta info (Mood / Status Pasien)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(71, 85, 105)
	metaText := fmt.Sprintf("  Mood: %s  |  Status Pasien: %s", rec.Mood, rec.StatusPasien)
	pdf.CellFormat(257, 4, metaText, "LRB", 1, "L", false, 0, "")
	pdf.Ln(2)

	// 1. Tujuan Pemeriksaan & Riwayat Keluhan
	pdf.SetTextColor(15, 23, 42)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Tujuan Pemeriksaan / Asesmen:")
	pdf.Ln(3)
	pdf.SetFont("Helvetica", "", 8)
	tujuan := strings.ReplaceAll(rec.TujuanPemeriksaan, "•", "-")
	if tglAsesStr := ""; rec.TanggalAsesmen != nil {
		tglAsesStr = formatIndoDate(*rec.TanggalAsesmen)
		tujuan = tujuan + " (Tanggal Asesmen: " + tglAsesStr + ")"
	}
	if tujuan == "" {
		tujuan = "-"
	}
	pdf.MultiCell(257, 3.5, tujuan, "", "L", false)
	pdf.Ln(2)

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Riwayat Keluhan / Isu Utama:")
	pdf.Ln(3)
	pdf.SetFont("Helvetica", "", 8)
	kel := strings.ReplaceAll(rec.RiwayatKeluhan, "•", "-")
	if kel == "" {
		kel = strings.ReplaceAll(rec.Keluhan, "•", "-")
	}
	if kel == "" {
		kel = "-"
	}
	pdf.MultiCell(257, 3.5, kel, "", "L", false)
	pdf.Ln(3)

	// 2. Aspek Asesmen Klinis Table (3 columns: 85mm + 85mm + 87mm = 257mm)
	cog := strings.ReplaceAll(rec.AspekKognitif, "•", "-")
	if cog == "" {
		cog = "-"
	}
	emo := strings.ReplaceAll(rec.AspekEmosional, "•", "-")
	if emo == "" {
		emo = "-"
	}
	beh := strings.ReplaceAll(rec.AspekPerilaku, "•", "-")
	if beh == "" {
		beh = "-"
	}

	// Calculate row height dynamically
	cogLines := pdf.SplitLines([]byte(cog), 85)
	emoLines := pdf.SplitLines([]byte(emo), 85)
	behLines := pdf.SplitLines([]byte(beh), 87)
	maxLines := len(cogLines)
	if len(emoLines) > maxLines {
		maxLines = len(emoLines)
	}
	if len(behLines) > maxLines {
		maxLines = len(behLines)
	}
	if maxLines < 1 {
		maxLines = 1
	}
	colH := float64(maxLines)*3.2 + 2

	// Preemptive check before drawing Aspek Asesmen
	if pdf.GetY()+colH+10 > 195 {
		pdf.AddPage()
	}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Aspek Asesmen Klinis:")
	pdf.Ln(3.5)

	pdf.SetFillColor(248, 250, 252)
	pdf.CellFormat(85, 4, "Aspek Kognitif", "1", 0, "C", true, 0, "")
	pdf.CellFormat(85, 4, "Aspek Emosional", "1", 0, "C", true, 0, "")
	pdf.CellFormat(87, 4, "Aspek Perilaku", "1", 1, "C", true, 0, "")

	curX := pdf.GetX()
	curY := pdf.GetY()
	pdf.Rect(curX, curY, 257, colH, "D")
	pdf.Line(curX+85, curY, curX+85, curY+colH)
	pdf.Line(curX+170, curY, curX+170, curY+colH)

	pdf.SetXY(curX, curY+1)
	pdf.MultiCell(85, 3, cog, "", "L", false)
	pdf.SetXY(curX+85, curY+1)
	pdf.MultiCell(85, 3, emo, "", "L", false)
	pdf.SetXY(curX+170, curY+1)
	pdf.MultiCell(87, 3, beh, "", "L", false)

	pdf.SetXY(curX, curY+colH)
	pdf.Ln(3)

	// 3. Rekomendasi
	rekMhs := strings.ReplaceAll(rec.RekomendasiMahasiswa, "•", "-")
	if rekMhs == "" && rec.Rekomendasi != "" {
		rekMhs = strings.ReplaceAll(rec.Rekomendasi, "•", "-")
	}
	if rekMhs == "" {
		rekMhs = "-"
	}
	rekProdi := strings.ReplaceAll(rec.RekomendasiProdi, "•", "-")
	if rekProdi == "" {
		rekProdi = "-"
	}
	rekOrtu := strings.ReplaceAll(rec.RekomendasiOrangTua, "•", "-")
	if rekOrtu == "" {
		rekOrtu = "-"
	}

	rekMhsLines := pdf.SplitLines([]byte(rekMhs), 85)
	rekProdiLines := pdf.SplitLines([]byte(rekProdi), 85)
	rekOrtuLines := pdf.SplitLines([]byte(rekOrtu), 87)
	maxLinesRek := len(rekMhsLines)
	if len(rekProdiLines) > maxLinesRek {
		maxLinesRek = len(rekProdiLines)
	}
	if len(rekOrtuLines) > maxLinesRek {
		maxLinesRek = len(rekOrtuLines)
	}
	if maxLinesRek < 1 {
		maxLinesRek = 1
	}
	colHRek := float64(maxLinesRek)*3.2 + 2

	// Preemptive check before drawing Rekomendasi
	if pdf.GetY()+colHRek+10 > 195 {
		pdf.AddPage()
	}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Rekomendasi Hasil Konseling:")
	pdf.Ln(3.5)

	pdf.CellFormat(85, 4, "Rekomendasi Mahasiswa", "1", 0, "C", true, 0, "")
	pdf.CellFormat(85, 4, "Rekomendasi Program Studi", "1", 0, "C", true, 0, "")
	pdf.CellFormat(87, 4, "Rekomendasi Orang Tua / Wali", "1", 1, "C", true, 0, "")

	curXRek := pdf.GetX()
	curYRek := pdf.GetY()
	pdf.Rect(curXRek, curYRek, 257, colHRek, "D")
	pdf.Line(curXRek+85, curYRek, curXRek+85, curYRek+colHRek)
	pdf.Line(curXRek+170, curYRek, curXRek+170, curYRek+colHRek)

	pdf.SetXY(curXRek, curYRek+1)
	pdf.MultiCell(85, 3, rekMhs, "", "L", false)
	pdf.SetXY(curXRek+85, curYRek+1)
	pdf.MultiCell(85, 3, rekProdi, "", "L", false)
	pdf.SetXY(curXRek+170, curYRek+1)
	pdf.MultiCell(87, 3, rekOrtu, "", "L", false)

	pdf.SetXY(curXRek, curYRek+colHRek)
	pdf.Ln(3)

	// 4. Tindak Lanjut & Kesimpulan
	kes := strings.ReplaceAll(rec.Kesimpulan, "•", "-")
	if kes == "" {
		kes = "-"
	}

	kesLines := pdf.SplitLines([]byte(kes), 137)
	kesHeight := float64(len(kesLines))*3.2 + 2
	sectionHeight := kesHeight
	if sectionHeight < 15 {
		sectionHeight = 15 // Checkbox section height
	}

	// Preemptive check for Section + Signature (approx 35mm total)
	if pdf.GetY()+sectionHeight+35 > 195 {
		pdf.AddPage()
	}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(120, 3.5, "Tindak Lanjut Layanan:")
	pdf.Cell(0, 3.5, "Kesimpulan Akhir:")
	pdf.Ln(3.5)

	curXTl := pdf.GetX()
	curYTl := pdf.GetY()

	// Tindak Lanjut checks
	pdf.SetFont("Helvetica", "", 8)
	tuntasCheck := " [ ] Sesi Tuntas"
	if rec.TindakLanjutTuntas {
		tuntasCheck = " [X] Sesi Tuntas"
	}
	lanjutCheck := " [ ] Konseling Lanjutan"
	if rec.TindakLanjutLanjutan {
		lanjutCheck = " [X] Konseling Lanjutan"
	}
	rujukCheck := " [ ] Rujuk Klinis"
	if rec.TindakLanjutRujuk {
		rujukCheck = " [X] Rujuk Klinis"
	}

	pdf.CellFormat(120, 4, tuntasCheck, "", 1, "L", false, 0, "")
	pdf.SetX(curXTl)
	pdf.CellFormat(120, 4, lanjutCheck, "", 1, "L", false, 0, "")
	pdf.SetX(curXTl)
	pdf.CellFormat(120, 4, rujukCheck, "", 1, "L", false, 0, "")

	// Kesimpulan
	pdf.SetXY(curXTl+120, curYTl)
	pdf.SetFont("Helvetica", "I", 8)
	pdf.MultiCell(137, 3.2, kes, "", "L", false)

	// Set cursor below Tindak Lanjut / Kesimpulan block
	pdf.SetXY(curXTl, curYTl+sectionHeight)
	pdf.Ln(4)

	// ── Signature ────────────────────────────────────────────────────────────
	sigY := pdf.GetY()

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(15, 23, 42)
	pdf.SetXY(180, sigY)
	pdf.CellFormat(0, 4, fmt.Sprintf("Bandung, %s", formatIndoDate(rec.Tanggal)), "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.CellFormat(0, 4, "Psikolog Penanggung Jawab,", "", 1, "C", false, 0, "")

	pdf.SetXY(180, sigY+18)
	pdf.SetFont("Helvetica", "BU", 8.5)
	pdf.CellFormat(0, 4, psikolog.Nama, "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(0, 3.5, fmt.Sprintf("BKU Care Center • NIP/Reg: %d", psikolog.ID), "", 1, "C", false, 0, "")

	// Save and download
	exportsDir := "uploads/exports"
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		return err
	}

	fileName := fmt.Sprintf("sesi_%d_%s.pdf", rec.ID, time.Now().Format("20060102150405"))
	filePath := filepath.Join(exportsDir, fileName)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return err
	}

	c.Set("Content-Type", "application/pdf")
	safeNama := strings.ReplaceAll(rec.Mahasiswa.Nama, " ", "_")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Rekam_Medis_Sesi_%s_%s.pdf\"", safeNama, time.Now().Format("02-01-2006")))
	return c.SendFile(filePath)
}

var indoMonths = []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}

func formatIndoDate(t time.Time) string {
	return fmt.Sprintf("%02d %s %d", t.Day(), indoMonths[t.Month()], t.Year())
}

func generateStableRandom(seed uint, salt int64) int {
	val := (int64(seed) * 2654435761) + salt
	val = val ^ (val >> 16)
	val = val * 2246822507
	val = val ^ (val >> 13)
	modVal := val % 90000
	if modVal < 0 {
		modVal = -modVal
	}
	return int(modVal) + 10000
}
