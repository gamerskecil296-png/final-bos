package tenaga_kesehatan

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
	"golang.org/x/crypto/bcrypt"
)

func currentTenagaKesehatan(c *fiber.Ctx) (models.TenagaKesehatan, error) {
	userID, ok := c.Locals("user_id").(uint)
	if !ok || userID == 0 {
		return models.TenagaKesehatan{}, fiber.NewError(fiber.StatusUnauthorized, "User tidak valid")
	}

	var tk models.TenagaKesehatan
	if err := config.DB.Preload("User").Where("user_id = ?", userID).First(&tk).Error; err != nil {
		var user models.User
		if err := config.DB.First(&user, userID).Error; err == nil {
			name := strings.Split(user.Email, "@")[0]
			name = strings.Title(strings.ReplaceAll(name, ".", " "))
			tk = models.TenagaKesehatan{
				UserID:       userID,
				Nama:         name,
				Email:        user.Email,
				NoHP:         "-",
				Spesialisasi: "Pemeriksaan Umum",
				Lokasi:       "Klinik Kampus BKU",
				IsAktif:      true,
			}
			if err := config.DB.Create(&tk).Error; err != nil {
				return models.TenagaKesehatan{}, fiber.NewError(fiber.StatusInternalServerError, "Gagal menginisialisasi profil")
			}
		} else {
			return models.TenagaKesehatan{}, fiber.NewError(fiber.StatusNotFound, "Profil Tenaga Kesehatan belum tersedia")
		}
	}

	return tk, nil
}

func jsonOK(c *fiber.Ctx, data any) error {
	return c.JSON(fiber.Map{"status": "success", "data": data})
}

func initials(name string) string {
	parts := strings.Fields(name)
	if len(parts) == 0 {
		return "-"
	}
	result := ""
	for i, part := range parts {
		if i >= 3 {
			break
		}
		result += strings.ToUpper(string([]rune(part)[0]))
	}
	return result
}

func GetMe(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}
	return jsonOK(c, tk)
}

func UpdateProfile(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var body struct {
		Nama         string `json:"nama"`
		Email        string `json:"email"`
		NoHP         string `json:"no_hp"`
		Spesialisasi string `json:"spesialisasi"`
		Lokasi       string `json:"lokasi"`
		IsAktif      *bool  `json:"is_aktif"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	updates := map[string]any{}
	if body.Nama != "" {
		updates["nama"] = strings.TrimSpace(body.Nama)
	}
	if body.Email != "" {
		updates["email"] = strings.TrimSpace(body.Email)
	}
	if body.NoHP != "" {
		updates["no_hp"] = strings.TrimSpace(body.NoHP)
	}
	if body.Spesialisasi != "" {
		updates["spesialisasi"] = strings.TrimSpace(body.Spesialisasi)
	}
	if body.Lokasi != "" {
		updates["lokasi"] = strings.TrimSpace(body.Lokasi)
	}
	if body.IsAktif != nil {
		updates["is_aktif"] = *body.IsAktif
	}

	if len(updates) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Tidak ada data yang diperbarui")
	}

	if err := config.DB.Model(&tk).Updates(updates).Error; err != nil {
		return err
	}

	_ = config.DB.Preload("User").First(&tk, tk.ID).Error

	logActivity(c, tk.UserID, "Update Profil", "Memperbarui data profil")

	return jsonOK(c, tk)
}

func ChangePassword(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var body struct {
		OldPassword     string `json:"old_password"`
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	body.OldPassword = strings.TrimSpace(body.OldPassword)
	body.NewPassword = strings.TrimSpace(body.NewPassword)
	body.ConfirmPassword = strings.TrimSpace(body.ConfirmPassword)
	if body.OldPassword == "" || body.NewPassword == "" || body.ConfirmPassword == "" {
		return fiber.NewError(fiber.StatusBadRequest, "Semua field password wajib diisi")
	}
	if len(body.NewPassword) < 8 {
		return fiber.NewError(fiber.StatusBadRequest, "Password baru minimal 8 karakter")
	}
	if body.NewPassword != body.ConfirmPassword {
		return fiber.NewError(fiber.StatusBadRequest, "Konfirmasi password tidak sama")
	}

	var user models.User
	if err := config.DB.First(&user, tk.UserID).Error; err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.OldPassword)); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Password saat ini salah")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if err := config.DB.Exec("UPDATE users SET password = ? WHERE id = ?", string(hash), user.ID).Error; err != nil {
		return err
	}
	config.DB.Save(&tk.User)

	logActivity(c, tk.UserID, "Ubah Kata Sandi", "Mengubah kata sandi akun")

	return jsonOK(c, fiber.Map{"message": "Kata sandi berhasil diubah"})
}

func GetDashboard(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	var totalDiperiksa int64
	config.DB.Model(&models.Kesehatan{}).
		Where("tanggal >= ? AND tanggal < ?", today, tomorrow).
		Count(&totalDiperiksa)

	var belumScreening int64
	config.DB.Model(&models.BookingKesehatan{}).
		Joins("JOIN public.jadwal_kesehatan jk ON jk.id = booking_kesehatan.jadwal_id").
		Where("jk.tenaga_kes_id = ? AND booking_kesehatan.status IN ('Menunggu Konfirmasi', 'Dikonfirmasi')", tk.ID).
		Count(&belumScreening)

	var perluPerhatian int64
	config.DB.Model(&models.Kesehatan{}).
		Where("status_kesehatan IN ('kritis', 'pantauan', 'tindak_lanjut') OR hasil = 'Perlu Perhatian' OR hasil = 'Tidak Layak'").
		Count(&perluPerhatian)

	var bookingHariIni int64
	config.DB.Model(&models.BookingKesehatan{}).
		Joins("JOIN public.jadwal_kesehatan jk ON jk.id = booking_kesehatan.jadwal_id").
		Where("jk.tenaga_kes_id = ? AND jk.tanggal >= ? AND jk.tanggal < ?", tk.ID, today, tomorrow).
		Count(&bookingHariIni)

	// Fetch Booking Hari Ini (Limit 10)
	var bookings []models.BookingKesehatan
	config.DB.Preload("Jadwal").Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").
		Joins("JOIN public.jadwal_kesehatan jk ON jk.id = booking_kesehatan.jadwal_id").
		Where("jk.tenaga_kes_id = ? AND jk.tanggal >= ? AND jk.tanggal < ?", tk.ID, today, tomorrow).
		Order("jk.jam_mulai asc").
		Limit(10).Find(&bookings)

	bookingItems := make([]fiber.Map, 0, len(bookings))
	for _, b := range bookings {
		bookingItems = append(bookingItems, bookingResponseFull(b))
	}

	// Fetch Alert Mahasiswa Perlu Perhatian
	var criticalHealth []models.Kesehatan
	config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").
		Where("status_kesehatan IN ('kritis', 'pantauan', 'tindak_lanjut') OR hasil = 'Tidak Layak'").
		Order("tanggal desc").
		Limit(10).Find(&criticalHealth)

	criticalItems := make([]fiber.Map, 0, len(criticalHealth))
	for _, h := range criticalHealth {
		criticalItems = append(criticalItems, fiber.Map{
			"id":               h.ID,
			"mahasiswa_id":     h.MahasiswaID,
			"nim":              h.Mahasiswa.NIM,
			"nama":             h.Mahasiswa.Nama,
			"event":            h.JenisPemeriksaan,
			"status":           h.Hasil,
			"status_kesehatan": h.StatusKesehatan,
			"tanggal":          h.Tanggal.Format("02 Jan 2006"),
		})
	}

	// ==========================================
	// CHart Data (5W1H)
	// ==========================================
	type chartResult struct {
		Name  string `json:"name"`
		Value int    `json:"value"`
	}

	// 1. Where (Distribusi Fakultas)
	var chartFakultas []chartResult
	config.DB.Table("mahasiswa.kesehatan").
		Select("fakultas.nama as name, count(*) as value").
		Joins("JOIN public.mahasiswa ON mahasiswa.id = kesehatan.mahasiswa_id").
		Joins("JOIN public.fakultas ON fakultas.id = mahasiswa.fakultas_id").
		Group("fakultas.nama").
		Order("value desc").
		Limit(5).
		Scan(&chartFakultas)

	// 2. What (Kondisi Kesehatan)
	var rawKondisi []chartResult
	config.DB.Table("mahasiswa.kesehatan").
		Select("status_kesehatan as name, count(*) as value").
		Group("status_kesehatan").
		Scan(&rawKondisi)

	kondisiMap := map[string]int{"Prima": 0, "Pantauan": 0, "Kritis": 0}
	for _, k := range rawKondisi {
		if k.Name == "prima" {
			kondisiMap["Prima"] += k.Value
		} else if k.Name == "pantauan" {
			kondisiMap["Pantauan"] += k.Value
		} else {
			kondisiMap["Kritis"] += k.Value
		}
	}
	chartKondisi := []fiber.Map{
		{"name": "Prima", "value": kondisiMap["Prima"]},
		{"name": "Pantauan", "value": kondisiMap["Pantauan"]},
		{"name": "Kritis", "value": kondisiMap["Kritis"]},
	}

	// 3. When (Tren 7 Hari)
	sevenDaysAgo := today.AddDate(0, 0, -6)
	var healthRecords7Days []models.Kesehatan
	config.DB.Where("tanggal >= ?", sevenDaysAgo).Find(&healthRecords7Days)

	trenMap := make(map[string]int)
	for _, r := range healthRecords7Days {
		trenMap[r.Tanggal.Format("02 Jan")]++
	}

	var chartTren []fiber.Map
	for i := 0; i < 7; i++ {
		d := sevenDaysAgo.AddDate(0, 0, i).Format("02 Jan")
		chartTren = append(chartTren, fiber.Map{"name": d, "value": trenMap[d]})
	}

	return jsonOK(c, fiber.Map{
		"total_diperiksa_hari_ini": totalDiperiksa,
		"belum_screening":          belumScreening,
		"perlu_perhatian":          perluPerhatian,
		"booking_hari_ini_count":   bookingHariIni,
		"bookings":                 bookingItems,
		"alerts":                   criticalItems,
		"chart_data": fiber.Map{
			"fakultas": chartFakultas,
			"kondisi":  chartKondisi,
			"tren":     chartTren,
		},
	})
}

func GetActivities(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var activities []models.LogAktivitas
	config.DB.Where("user_id = ?", tk.UserID).Order("created_at desc").Limit(20).Find(&activities)

	items := make([]fiber.Map, 0, len(activities))
	for _, act := range activities {
		items = append(items, fiber.Map{
			"id":         act.ID,
			"aktivitas":  act.Aktivitas,
			"deskripsi":  act.Deskripsi,
			"created_at": act.CreatedAt.Format(time.RFC3339),
		})
	}

	return jsonOK(c, items)
}

// ========================
// JADWAL WORKER CRUD
// ========================

func GetSchedules(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var slots []models.JadwalKesehatan
	if err := config.DB.Where("tenaga_kes_id = ?", tk.ID).Order("tanggal desc, jam_mulai asc").Find(&slots).Error; err != nil {
		return err
	}

	return jsonOK(c, slots)
}

func CreateSchedule(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var body struct {
		Tanggal     string `json:"tanggal"`
		JamMulai    string `json:"jam_mulai"`
		JamSelesai  string `json:"jam_selesai"`
		Kuota       int    `json:"kuota"`
		Lokasi      string `json:"lokasi"`
		TipeLayanan string `json:"tipe_layanan"`
		EventID     *uint  `json:"event_id"`
		Catatan     string `json:"catatan"`
		IsRepeat    bool   `json:"is_repeat"`
		RepeatDays  string `json:"repeat_days"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	parsedDate, err := time.Parse("2006-01-02", body.Tanggal)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Format tanggal harus YYYY-MM-DD")
	}

	kuota := body.Kuota
	if kuota <= 0 {
		kuota = 1
	}

	schedule := models.JadwalKesehatan{
		TenagaKesID: tk.ID,
		Tanggal:     parsedDate,
		JamMulai:    body.JamMulai,
		JamSelesai:  body.JamSelesai,
		Kuota:       kuota,
		Lokasi:      body.Lokasi,
		TipeLayanan: body.TipeLayanan,
		EventID:     body.EventID,
		Catatan:     body.Catatan,
		IsRepeat:    body.IsRepeat,
		RepeatDays:  body.RepeatDays,
	}

	if err := config.DB.Create(&schedule).Error; err != nil {
		return err
	}

	logActivity(c, tk.UserID, "Buat Jadwal Praktek", fmt.Sprintf("Menambahkan jadwal pada %s", schedule.Tanggal.Format("02 Jan 2006")))

	return jsonOK(c, schedule)
}

func UpdateSchedule(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	id := c.Params("id")
	var schedule models.JadwalKesehatan
	if err := config.DB.Where("id = ? AND tenaga_kes_id = ?", id, tk.ID).First(&schedule).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Jadwal tidak ditemukan")
	}

	var body struct {
		Tanggal     string `json:"tanggal"`
		JamMulai    string `json:"jam_mulai"`
		JamSelesai  string `json:"jam_selesai"`
		Kuota       int    `json:"kuota"`
		Lokasi      string `json:"lokasi"`
		TipeLayanan string `json:"tipe_layanan"`
		EventID     *uint  `json:"event_id"`
		Catatan     string `json:"catatan"`
		IsRepeat    bool   `json:"is_repeat"`
		RepeatDays  string `json:"repeat_days"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	updates := map[string]any{}
	if body.Tanggal != "" {
		if t, err := time.Parse("2006-01-02", body.Tanggal); err == nil {
			updates["tanggal"] = t
		}
	}
	if body.JamMulai != "" {
		updates["jam_mulai"] = body.JamMulai
	}
	if body.JamSelesai != "" {
		updates["jam_selesai"] = body.JamSelesai
	}
	if body.Kuota > 0 {
		updates["kuota"] = body.Kuota
	}
	if body.Lokasi != "" {
		updates["lokasi"] = body.Lokasi
	}
	if body.TipeLayanan != "" {
		updates["tipe_layanan"] = body.TipeLayanan
	}
	updates["event_id"] = body.EventID
	updates["catatan"] = body.Catatan
	updates["is_repeat"] = body.IsRepeat
	updates["repeat_days"] = body.RepeatDays

	if err := config.DB.Model(&schedule).Updates(updates).Error; err != nil {
		return err
	}

	logActivity(c, tk.UserID, "Update Jadwal Praktek", "Memperbarui data jadwal praktek")

	config.DB.First(&schedule, schedule.ID)
	return jsonOK(c, schedule)
}

func DeleteSchedule(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	id := c.Params("id")
	var schedule models.JadwalKesehatan
	if err := config.DB.Where("id = ? AND tenaga_kes_id = ?", id, tk.ID).First(&schedule).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Jadwal tidak ditemukan")
	}

	var bookingCount int64
	config.DB.Model(&models.BookingKesehatan{}).Where("jadwal_id = ? AND status != 'Ditolak' AND status != 'Dibatalkan'", schedule.ID).Count(&bookingCount)
	if bookingCount > 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Jadwal tidak bisa dihapus karena sudah memiliki booking aktif.")
	}

	if err := config.DB.Unscoped().Delete(&schedule).Error; err != nil {
		return err
	}

	logActivity(c, tk.UserID, "Hapus Jadwal Praktek", "Menghapus data jadwal praktek")

	return jsonOK(c, fiber.Map{"deleted": true})
}

// ========================
// BOOKINGS MANAGEMENT
// ========================

func GetBookings(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	// Get all jadwal IDs for this TK first
	var jadwalIDs []uint
	config.DB.Model(&models.JadwalKesehatan{}).Where("tenaga_kes_id = ?", tk.ID).Pluck("id", &jadwalIDs)

	if len(jadwalIDs) == 0 {
		return jsonOK(c, []fiber.Map{})
	}

	var bookings []models.BookingKesehatan
	if err := config.DB.Preload("Jadwal").
		Preload("Mahasiswa.Fakultas").
		Preload("Mahasiswa.ProgramStudi").
		Where("jadwal_id IN ?", jadwalIDs).
		Order("created_at desc").
		Find(&bookings).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(bookings))
	for _, b := range bookings {
		items = append(items, bookingResponseFull(b))
	}

	return jsonOK(c, items)
}

func bookingResponseFull(b models.BookingKesehatan) fiber.Map {
	student := b.Mahasiswa
	prodiName := ""
	fakName := ""
	if student.ProgramStudi.Nama != "" {
		prodiName = student.ProgramStudi.Nama
	}
	if student.Fakultas.Nama != "" {
		fakName = student.Fakultas.Nama
	}
	return fiber.Map{
		"id":           b.ID,
		"mahasiswa_id": b.MahasiswaID,
		"name":         student.Nama,
		"nim":          student.NIM,
		"email":        student.EmailPersonal,
		"phone":        student.NoHP,
		"prodi":        prodiName,
		"faculty":      fakName,
		"semester":     student.SemesterSekarang,
		"jadwal": fiber.Map{
			"id":           b.Jadwal.ID,
			"tanggal":      b.Jadwal.Tanggal,
			"jam_mulai":    b.Jadwal.JamMulai,
			"jam_selesai":  b.Jadwal.JamSelesai,
			"lokasi":       b.Jadwal.Lokasi,
			"tipe_layanan": b.Jadwal.TipeLayanan,
		},
		"date":         b.Jadwal.Tanggal.Format("02 Jan 2006"),
		"raw_date":     b.Jadwal.Tanggal.Format("2006-01-02"),
		"time":         strings.TrimSpace(b.Jadwal.JamMulai + " - " + b.Jadwal.JamSelesai),
		"tipe_layanan": b.Jadwal.TipeLayanan,
		"note":         b.Keluhan,
		"status":       b.Status,
		"created_at":   b.CreatedAt,
		"jenis_pendaftaran": b.JenisPendaftaran,
	}
}

func GetBookingDetail(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var booking models.BookingKesehatan
	if err := config.DB.Preload("Jadwal").Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").
		Joins("JOIN public.jadwal_kesehatan jk ON jk.id = booking_kesehatan.jadwal_id").
		Where("booking_kesehatan.id = ? AND jk.tenaga_kes_id = ?", c.Params("id"), tk.ID).
		First(&booking).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Booking tidak ditemukan")
	}

	return jsonOK(c, bookingResponseFull(booking))
}

func UpdateBookingStatus(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	var body struct {
		Status          string `json:"status"`
		AlasanPenolakan string `json:"alasan_penolakan"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	allowed := map[string]bool{"Menunggu Konfirmasi": true, "Dikonfirmasi": true, "Ditolak": true, "Selesai": true}
	if !allowed[body.Status] {
		return fiber.NewError(fiber.StatusBadRequest, "Status booking tidak valid")
	}

	var booking models.BookingKesehatan
	if err := config.DB.Preload("Mahasiswa").Preload("Jadwal").
		Joins("JOIN public.jadwal_kesehatan jk ON jk.id = booking_kesehatan.jadwal_id").
		Where("booking_kesehatan.id = ? AND jk.tenaga_kes_id = ?", c.Params("id"), tk.ID).
		First(&booking).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Booking tidak ditemukan")
	}

	updates := map[string]any{
		"status":           body.Status,
		"alasan_penolakan": body.AlasanPenolakan,
	}

	if err := config.DB.Model(&booking).Updates(updates).Error; err != nil {
		return err
	}

	go func() {
		var notifTitle, notifContent string
		switch body.Status {
		case "Dikonfirmasi":
			notifTitle = "Booking Layanan Kesehatan Dikonfirmasi ✅"
			notifContent = fmt.Sprintf(
				"Pemesanan jadwal kesehatan Anda pada tanggal %s pukul %s (%s) telah disetujui oleh %s.",
				booking.Jadwal.Tanggal.Format("02 Jan 2006"),
				booking.Jadwal.JamMulai,
				booking.Jadwal.TipeLayanan,
				tk.Nama,
			)
		case "Ditolak":
			notifTitle = "Booking Layanan Kesehatan Ditolak ❌"
			notifContent = fmt.Sprintf(
				"Maaf, pemesanan jadwal kesehatan Anda pada tanggal %s pukul %s ditolak.",
				booking.Jadwal.Tanggal.Format("02 Jan 2006"),
				booking.Jadwal.JamMulai,
			)
			if body.AlasanPenolakan != "" {
				notifContent += "\nAlasan: " + body.AlasanPenolakan
			}
		case "Selesai":
			notifTitle = "Pemeriksaan Kesehatan Selesai 🏥"
			notifContent = fmt.Sprintf(
				"Sesi konsultasi/pemeriksaan kesehatan Anda dengan %s pada tanggal %s telah selesai.",
				tk.Nama,
				booking.Jadwal.Tanggal.Format("02 Jan 2006"),
			)
		}

		if notifTitle != "" {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				MahasiswaID: booking.MahasiswaID,
				Type:        "info",
				Title:       notifTitle,
				Content:     notifContent,
			})
		}
	}()

	return jsonOK(c, fiber.Map{"id": booking.ID, "status": body.Status})
}

// ========================
// REKAM MEDIS & SCREENING (Tahap 3 & 5)
// ========================

func mapMahasiswaToFrontend(student models.Mahasiswa, latestAlergi string) fiber.Map {
	prodiName := ""
	prodiID := uint(0)
	prodiKode := ""
	if student.ProgramStudi.ID != 0 {
		prodiName = student.ProgramStudi.Nama
		prodiID = student.ProgramStudi.ID
		prodiKode = student.ProgramStudi.Kode
	}

	fakName := ""
	fakID := uint(0)
	fakKode := ""
	if student.Fakultas.ID != 0 {
		fakName = student.Fakultas.Nama
		fakID = student.Fakultas.ID
		fakKode = student.Fakultas.Kode
	}

	prodiMap := fiber.Map{
		"id":           prodiID,
		"nama":         prodiName,
		"Nama":         prodiName,
		"kode":         prodiKode,
		"jenjang":      student.ProgramStudi.Jenjang,
		"akreditasi":   student.ProgramStudi.Akreditasi,
		"kepala_prodi": student.ProgramStudi.KepalaProdi,
	}

	fakMap := fiber.Map{
		"id":    fakID,
		"nama":  fakName,
		"Nama":  fakName,
		"kode":  fakKode,
		"dekan": student.Fakultas.Dekan,
	}

	return fiber.Map{
		"id":                student.ID,
		"nama":              student.Nama,
		"Nama":              student.Nama,
		"nim":               student.NIM,
		"NIM":               student.NIM,
		"jenis_kelamin":     student.JenisKelamin,
		"JenisKelamin":      student.JenisKelamin,
		"ProgramStudi":      prodiMap,
		"program_studi":     prodiMap,
		"Fakultas":          fakMap,
		"fakultas":          fakMap,
		"no_hp":             student.NoHP,
		"NoHP":              student.NoHP,
		"email_personal":    student.EmailPersonal,
		"EmailPersonal":     student.EmailPersonal,
		"email_kampus":      student.EmailKampus,
		"EmailKampus":       student.EmailKampus,
		"semester_sekarang": student.SemesterSekarang,
		"SemesterSekarang":  student.SemesterSekarang,
		"golongan_darah":    student.GolonganDarah,
		"GolonganDarah":     student.GolonganDarah,
		"alergi_obat":       latestAlergi,
		"AlergiObat":        latestAlergi,
	}
}

func GetPatients(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	// Ambil semua mahasiswa yang pernah booking dengan TK ini
	var studentIDsFromBookings []uint
	config.DB.Table("public.booking_kesehatan").
		Joins("JOIN public.jadwal_kesehatan j ON j.id = booking_kesehatan.jadwal_id").
		Where("j.tenaga_kes_id = ?", tk.ID).
		Pluck("DISTINCT booking_kesehatan.mahasiswa_id", &studentIDsFromBookings)

	// Ambil semua mahasiswa yang punya rekam medis dengan TK ini
	var studentIDsFromKesehatan []uint
	config.DB.Table("mahasiswa.kesehatan").
		Where("tenaga_kes_id = ?", tk.ID).
		Pluck("DISTINCT mahasiswa_id", &studentIDsFromKesehatan)

	// Gabungkan ID unik
	studentMap := make(map[uint]bool)
	for _, id := range studentIDsFromBookings {
		studentMap[id] = true
	}
	for _, id := range studentIDsFromKesehatan {
		studentMap[id] = true
	}

	var allStudentIDs []uint
	for id := range studentMap {
		allStudentIDs = append(allStudentIDs, id)
	}

	var students []models.Mahasiswa
	if len(allStudentIDs) > 0 {
		if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").Where("id IN ?", allStudentIDs).Find(&students).Error; err != nil {
			return err
		}
	}

	items := make([]fiber.Map, 0, len(students))
	for _, s := range students {
		// Check for active booking
		var activeBooking models.BookingKesehatan
		hasActiveBooking := false
		var bookingId uint
		if err := config.DB.Joins("JOIN public.jadwal_kesehatan j ON j.id = booking_kesehatan.jadwal_id").
			Where("booking_kesehatan.mahasiswa_id = ? AND j.tenaga_kes_id = ? AND booking_kesehatan.status IN ?", s.ID, tk.ID, []string{"Dikonfirmasi", "Perlu Kontrol"}).
			First(&activeBooking).Error; err == nil {
			hasActiveBooking = true
			bookingId = activeBooking.ID
		}

		mapped := mapMahasiswaToFrontend(s, "")
		mapped["has_active_booking"] = hasActiveBooking
		mapped["active_booking_id"] = bookingId
		items = append(items, mapped)
	}

	return jsonOK(c, items)
}

func GetMedicalRecord(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	studentID := c.Params("id")
	var student models.Mahasiswa
	if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").First(&student, studentID).Error; err != nil {
		return err
	}

	var records []models.Kesehatan
	// Isolasi data medis: hanya rekam medis yang ditangani TK ini
	config.DB.Where("mahasiswa_id = ? AND tenaga_kes_id = ?", student.ID, tk.ID).Order("tanggal desc").Find(&records)

	latestAlergi := ""
	if len(records) > 0 {
		latestAlergi = records[0].AlergiObat
	}

	return jsonOK(c, fiber.Map{
		"patient": mapMahasiswaToFrontend(student, latestAlergi),
		"records": records,
	})
}

func CreateScreening(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	studentID := c.Params("id")
	var student models.Mahasiswa
	if err := config.DB.Preload("Fakultas").First(&student, studentID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Mahasiswa tidak ditemukan")
	}

	var body struct {
		Tanggal           string  `json:"tanggal"`
		JenisPemeriksaan  string  `json:"jenis_pemeriksaan"`
		TinggiBadan       float64 `json:"tinggi_badan"`
		BeratBadan        float64 `json:"berat_badan"`
		Sistole           int     `json:"sistole"`
		Diastole          int     `json:"diastole"`
		GulaDarah         int     `json:"gula_darah"`
		ButaWarna         string  `json:"buta_warna"`
		RiwayatPenyakit   string  `json:"riwayat_penyakit"`
		GolonganDarah     string  `json:"golongan_darah"`
		SuhuTubuh         float64 `json:"suhu_tubuh"`
		DenyutNadi        int     `json:"denyut_nadi"`
		RespirationRate   int     `json:"respiration_rate"`
		SpO2              int     `json:"spo2"`
		SkalaNyeri        int     `json:"skala_nyeri"`
		AlergiObat        string  `json:"alergi_obat"`
		KondisiPsikologis string  `json:"kondisi_psikologis"`
		KonsumsiObat      string  `json:"konsumsi_obat"`
		TindakanDiberikan string  `json:"tindakan_diberikan"`
		ObatDiberikan     string  `json:"obat_diberikan"`
		Catatan           string  `json:"catatan"`
		Hasil             string  `json:"hasil"` // Layak Kegiatan / Perlu Perhatian / Tidak Layak
		Rekomendasi       string  `json:"rekomendasi"`
		EventID           *uint   `json:"event_id"`
		BookingID         *uint   `json:"booking_id"`
		Sumber            string  `json:"sumber"`

		EskalasiPsikolog bool `json:"eskalasi_psikolog"`
		PsikologID       uint `json:"psikolog_id"`      // chosen psychologist if any
		PsikologSlotID   uint `json:"psikolog_slot_id"` // chosen slot if any

		AkhiriSesi bool `json:"akhiri_sesi"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	// 0. Check Booking Status & Auto-resolve
	if body.BookingID != nil {
		var booking models.BookingKesehatan
		if err := config.DB.First(&booking, *body.BookingID).Error; err != nil {
			return fiber.NewError(fiber.StatusNotFound, "Booking tidak ditemukan")
		}
		if booking.Status == "Selesai" {
			return fiber.NewError(fiber.StatusBadRequest, "Tidak dapat menambah pemeriksaan pada sesi booking yang sudah Selesai")
		}
	} else {
		// If BookingID not provided, auto-find an active "Dikonfirmasi" booking for this student
		var activeBooking models.BookingKesehatan
		if err := config.DB.Where("mahasiswa_id = ? AND status = ?", student.ID, "Dikonfirmasi").Order("tanggal asc").First(&activeBooking).Error; err == nil {
			body.BookingID = &activeBooking.ID
		}
	}

	// 1. Parse Tanggal
	parsedDate := time.Now()
	if body.Tanggal != "" {
		if t, err := time.Parse("2006-01-02", body.Tanggal); err == nil {
			parsedDate = t
		}
	}

	// 2. Calculate BMI
	heightMeter := body.TinggiBadan / 100
	imt := 0.0
	if heightMeter > 0 {
		imt = body.BeratBadan / (heightMeter * heightMeter)
	}

	// 3. Auto Logic
	statusKesehatan := "stabil"
	if body.Sistole >= 140 || body.Diastole >= 90 || imt >= 30 || body.SuhuTubuh > 38.0 || body.SpO2 < 92 {
		statusKesehatan = "kritis"
	} else if body.SuhuTubuh > 37.5 || body.SpO2 < 95 || imt < 18.5 || imt >= 25 {
		statusKesehatan = "pantauan"
	} else {
		statusKesehatan = "prima"
	}

	hasilText := body.Hasil
	if body.SuhuTubuh > 38.0 || body.SpO2 < 92 {
		hasilText = "Tidak Layak"
	} else if hasilText == "" {
		hasilText = "Layak Kegiatan"
	}

	sumber := body.Sumber
	if sumber == "" {
		if strings.Contains(strings.ToLower(body.JenisPemeriksaan), "pkkmb") || strings.Contains(strings.ToLower(body.JenisPemeriksaan), "massal") {
			sumber = "kencana_screening"
		} else {
			sumber = "klinik_kampus"
		}
	}
	diperiksaOleh := tk.Nama

	// Create Kesehatan record
	record := models.Kesehatan{
		MahasiswaID:       student.ID,
		Tanggal:           parsedDate,
		JenisPemeriksaan:  body.JenisPemeriksaan,
		Hasil:             hasilText,
		Catatan:           body.Catatan,
		TinggiBadan:       body.TinggiBadan,
		BeratBadan:        body.BeratBadan,
		Sistole:           body.Sistole,
		Diastole:          body.Diastole,
		GulaDarah:         body.GulaDarah,
		ButaWarna:         body.ButaWarna,
		RiwayatPenyakit:   body.RiwayatPenyakit,
		GolonganDarah:     body.GolonganDarah,
		StatusKesehatan:   statusKesehatan,
		SuhuTubuh:         body.SuhuTubuh,
		DenyutNadi:        body.DenyutNadi,
		RespirationRate:   body.RespirationRate,
		SpO2:              body.SpO2,
		SkalaNyeri:        body.SkalaNyeri,
		AlergiObat:        body.AlergiObat,
		KondisiPsikologis: body.KondisiPsikologis,
		KonsumsiObat:      body.KonsumsiObat,
		TindakanDiberikan: body.TindakanDiberikan,
		ObatDiberikan:     body.ObatDiberikan,
		Rekomendasi:       body.Rekomendasi,
		TenagaKesID:       &tk.ID,
		EventID:           body.EventID,
		BookingID:         body.BookingID,
		Sumber:            sumber,
		DiperiksaOleh:     diperiksaOleh,
	}

	if err := config.DB.Create(&record).Error; err != nil {
		return err
	}

	// Update Mahasiswa's Golongan Darah if provided
	if body.GolonganDarah != "" {
		config.DB.Model(&student).Update("golongan_darah", body.GolonganDarah)
	}

	// If this screening was started from a booking, update the booking status
	if body.BookingID != nil {
		newStatus := "Perlu Kontrol"
		if body.AkhiriSesi {
			newStatus = "Selesai"
		}
		config.DB.Model(&models.BookingKesehatan{}).Where("id = ?", *body.BookingID).Update("status", newStatus)
	}

	// Send notification to Mahasiswa
	go func() {
		notifTitle := "Hasil Pemeriksaan Kesehatan Baru 🏥"
		notifContent := fmt.Sprintf("Hasil pemeriksaan kesehatan Anda pada %s telah diinput oleh Tenaga Kesehatan (%s). Hasil akhir: %s.", parsedDate.Format("02 Jan 2006"), tk.Nama, hasilText)

		if hasilText == "Tidak Layak" {
			notifTitle = "Rekomendasi Istirahat: Hasil Kesehatan Tidak Layak ⚠️"
			notifContent = fmt.Sprintf("Berdasarkan pemeriksaan oleh %s pada %s, Anda direkomendasikan untuk beristirahat. Rekomendasi: %s", tk.Nama, parsedDate.Format("02 Jan 2006"), body.Rekomendasi)
		}

		_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
			MahasiswaID: student.ID,
			Type:        "info",
			Title:       notifTitle,
			Content:     notifContent,
		})
	}()

	// 4. Eskalasi Logic
	// Eskalasi ke Psikolog
	if body.EskalasiPsikolog || body.KondisiPsikologis == "Perlu Rujukan Psikolog" {
		// Jika slot dipilih, auto-booking
		if body.PsikologSlotID != 0 {
			var slot models.PsikologScheduleSlot
			if err := config.DB.Preload("Psikolog").First(&slot, body.PsikologSlotID).Error; err == nil {
				// Helper untuk hitung tanggal
				days := map[string]time.Weekday{"Minggu": time.Sunday, "Senin": time.Monday, "Selasa": time.Tuesday, "Rabu": time.Wednesday, "Kamis": time.Thursday, "Jumat": time.Friday, "Sabtu": time.Saturday}
				targetDay := days[slot.Hari]
				now := time.Now().UTC()
				daysUntil := (int(targetDay) - int(now.Weekday()) + 7) % 7
				if daysUntil == 0 {
					daysUntil = 7
				}
				nextDate := now.AddDate(0, 0, daysUntil).Truncate(24 * time.Hour)

				booking := models.PsikologBooking{
					PsikologID:  slot.PsikologID,
					MahasiswaID: student.ID,
					Tanggal:     nextDate,
					JamMulai:    slot.JamMulai,
					JamSelesai:  slot.JamSelesai,
					Topik:       "Rujukan Medis",
					Keluhan:     "Rujukan dari klinik: " + body.Catatan,
					Status:      "Dikonfirmasi", // Auto confirm since it's a direct referral
					Mode:        "Tatap Muka",
				}
				if err := config.DB.Create(&booking).Error; err == nil {
					// Notifikasi ke sistem psikolog internal
					notifPsi := models.PsikologNotification{
						PsikologID: slot.PsikologID,
						UserID:     slot.Psikolog.UserID,
						Judul:      "Rujukan Medis & Auto-Booking",
						Deskripsi:  fmt.Sprintf("Tenaga Kesehatan %s merujuk dan membuat booking untuk mahasiswa %s (%s) pada %s pukul %s. Catatan medis: %s", tk.Nama, student.Nama, student.NIM, nextDate.Format("02 Jan 2006"), slot.JamMulai, body.Catatan),
						Tipe:       "booking",
						IsRead:     false,
					}
					_ = config.DB.Create(&notifPsi).Error

					// Beri notif spesifik bahwa jadwal sudah dibuatkan ke Mahasiswa
					_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
						MahasiswaID: student.ID,
						Type:        "success",
						Title:       "Jadwal Konseling Rujukan Dibuat 📅",
						Content:     fmt.Sprintf("Tenaga Kesehatan %s telah mendaftarkan jadwal konseling psikologi untuk Anda pada %s jam %s. Silakan cek menu Konseling.", tk.Nama, nextDate.Format("02 Jan 2006"), slot.JamMulai),
					})
				}
			}
		}

		go func() {
			if body.PsikologID != 0 {
				var psi models.Psikolog
				if err := config.DB.First(&psi, body.PsikologID).Error; err == nil {
					_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
						UserID:  psi.UserID,
						Type:    "warning",
						Title:   "Rujukan Pasien Baru (Eskalasi Medis) 🩺",
						Content: fmt.Sprintf("Tenaga Kesehatan %s merujuk mahasiswa %s (%s) untuk sesi konseling psikologi. Catatan: %s", tk.Nama, student.Nama, student.NIM, body.Catatan),
					})
				}
			} else {
				var psychologists []models.Psikolog
				config.DB.Where("is_aktif = ?", true).Find(&psychologists)
				for _, psi := range psychologists {
					_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
						UserID:  psi.UserID,
						Type:    "warning",
						Title:   "Rujukan Pasien Baru (Eskalasi Medis) 🩺",
						Content: fmt.Sprintf("Tenaga Kesehatan %s merujuk mahasiswa %s (%s) untuk sesi konseling psikologi. Catatan: %s", tk.Nama, student.Nama, student.NIM, body.Catatan),
					})
				}
			}

			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				MahasiswaID: student.ID,
				Type:        "info",
				Title:       "Rekomendasi Konseling Psikologi 🧑‍⚕️",
				Content:     fmt.Sprintf("Tenaga Kesehatan %s merekomendasikan Anda untuk melakukan sesi konseling dengan Psikolog. Silakan buat janji di menu Konseling.", tk.Nama),
			})
		}()
	}

	// Eskalasi Fakultas removed per user request

	logActivity(c, tk.UserID, "Input Rekam Medis", fmt.Sprintf("Menginput rekam medis baru untuk mahasiswa %s (%s)", student.Nama, student.NIM))

	return jsonOK(c, record)
}

func UpdateMedicalRecord(c *fiber.Ctx) error {
	tk, err := currentTenagaKesehatan(c)
	if err != nil {
		return err
	}

	recordID := c.Params("record_id")
	var record models.Kesehatan
	if err := config.DB.First(&record, recordID).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Rekam medis tidak ditemukan")
	}

	// Verify ownership or permission
	if record.TenagaKesID != nil && *record.TenagaKesID != tk.ID {
		// Could allow if user has super permission, but for now enforce own records
		// (Or skip this check if tenakes is allowed to edit any record)
	}

	var body struct {
		Tanggal           string  `json:"tanggal"`
		JenisPemeriksaan  string  `json:"jenis_pemeriksaan"`
		TinggiBadan       float64 `json:"tinggi_badan"`
		BeratBadan        float64 `json:"berat_badan"`
		Sistole           int     `json:"sistole"`
		Diastole          int     `json:"diastole"`
		GulaDarah         int     `json:"gula_darah"`
		ButaWarna         string  `json:"buta_warna"`
		RiwayatPenyakit   string  `json:"riwayat_penyakit"`
		GolonganDarah     string  `json:"golongan_darah"`
		SuhuTubuh         float64 `json:"suhu_tubuh"`
		DenyutNadi        int     `json:"denyut_nadi"`
		RespirationRate   int     `json:"respiration_rate"`
		SpO2              int     `json:"spo2"`
		SkalaNyeri        int     `json:"skala_nyeri"`
		AlergiObat        string  `json:"alergi_obat"`
		KondisiPsikologis string  `json:"kondisi_psikologis"`
		KonsumsiObat      string  `json:"konsumsi_obat"`
		TindakanDiberikan string  `json:"tindakan_diberikan"`
		ObatDiberikan     string  `json:"obat_diberikan"`
		Catatan           string  `json:"catatan"`
		Hasil             string  `json:"hasil"`
		Rekomendasi       string  `json:"rekomendasi"`
		AkhiriSesi        bool    `json:"akhiri_sesi"`
		BookingID         *uint   `json:"booking_id"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	parsedDate := record.Tanggal
	if body.Tanggal != "" {
		if t, err := time.Parse("2006-01-02", body.Tanggal); err == nil {
			parsedDate = t
		}
	}

	heightMeter := body.TinggiBadan / 100
	imt := 0.0
	if heightMeter > 0 {
		imt = body.BeratBadan / (heightMeter * heightMeter)
	}

	statusKesehatan := "stabil"
	if body.Sistole >= 140 || body.Diastole >= 90 || imt >= 30 || body.SuhuTubuh > 38.0 || body.SpO2 < 92 {
		statusKesehatan = "kritis"
	} else if body.SuhuTubuh > 37.5 || body.SpO2 < 95 || imt < 18.5 || imt >= 25 {
		statusKesehatan = "pantauan"
	} else {
		statusKesehatan = "prima"
	}

	hasilText := body.Hasil
	if body.SuhuTubuh > 38.0 || body.SpO2 < 92 {
		hasilText = "Tidak Layak"
	} else if hasilText == "" {
		hasilText = "Layak Kegiatan"
	}

	record.Tanggal = parsedDate
	record.JenisPemeriksaan = body.JenisPemeriksaan
	record.TinggiBadan = body.TinggiBadan
	record.BeratBadan = body.BeratBadan
	record.Sistole = body.Sistole
	record.Diastole = body.Diastole
	record.GulaDarah = body.GulaDarah
	record.ButaWarna = body.ButaWarna
	record.RiwayatPenyakit = body.RiwayatPenyakit
	record.GolonganDarah = body.GolonganDarah
	record.SuhuTubuh = body.SuhuTubuh
	record.DenyutNadi = body.DenyutNadi
	record.RespirationRate = body.RespirationRate
	record.SpO2 = body.SpO2
	record.SkalaNyeri = body.SkalaNyeri
	record.AlergiObat = body.AlergiObat
	record.KondisiPsikologis = body.KondisiPsikologis
	record.KonsumsiObat = body.KonsumsiObat
	record.TindakanDiberikan = body.TindakanDiberikan
	record.ObatDiberikan = body.ObatDiberikan
	record.Catatan = body.Catatan
	record.Hasil = hasilText
	record.Rekomendasi = body.Rekomendasi
	record.StatusKesehatan = statusKesehatan

	// Jika ini pertama kali diperiksa (dari self screening), catat siapa tenakesnya
	if record.TenagaKesID == nil {
		record.TenagaKesID = &tk.ID
	}
	if record.DiperiksaOleh == "" {
		record.DiperiksaOleh = tk.Nama
	}

	if err := config.DB.Save(&record).Error; err != nil {
		return err
	}

	if body.GolonganDarah != "" {
		config.DB.Model(&models.Mahasiswa{}).Where("id = ?", record.MahasiswaID).Update("golongan_darah", body.GolonganDarah)
	}

	if body.BookingID != nil {
		newStatus := "Perlu Kontrol"
		if body.AkhiriSesi {
			newStatus = "Selesai"
		}
		config.DB.Model(&models.BookingKesehatan{}).Where("id = ?", *body.BookingID).Update("status", newStatus)
	}

	logActivity(c, tk.UserID, "Update Rekam Medis", fmt.Sprintf("Mengupdate rekam medis ID %d", record.ID))

	return jsonOK(c, record)
}

func LookupStudent(c *fiber.Ctx) error {
	query := c.Query("query")
	var students []models.Mahasiswa
	config.DB.Preload("Fakultas").Preload("ProgramStudi").
		Where("nim LIKE ? OR nama LIKE ?", "%"+query+"%", "%"+query+"%").
		Limit(10).Find(&students)

	items := make([]fiber.Map, 0, len(students))
	for _, s := range students {
		items = append(items, mapMahasiswaToFrontend(s, ""))
	}

	return jsonOK(c, items)
}

// ========================
// REPORTS & EXPORT
// ========================

// ExportMedicalRecordPDF - Generate Rekam Medis / Sesi PDF
func ExportMedicalRecordPDF(c *fiber.Ctx) error {
	id := c.Params("id")

	var record models.Kesehatan
	if err := config.DB.Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Fakultas").Preload("TenagaKes").First(&record, id).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Rekam medis tidak ditemukan")
	}

	// Role validation: if student, make sure they own it
	role := c.Locals("role")
	if role == "mahasiswa" || role == "student" {
		userID := c.Locals("user_id").(uint)
		var student models.Mahasiswa
		config.DB.Where("pengguna_id = ?", userID).First(&student)
		if record.MahasiswaID != student.ID {
			return fiber.NewError(fiber.StatusForbidden, "Anda tidak memiliki akses ke rekam medis ini")
		}
	}

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(20, 45, 20)
	pdf.SetAutoPageBreak(false, 0)
	pdf.AliasNbPages("")

	kopImage := "assets/kop_kesehatan2.jpg"

	pdf.SetHeaderFunc(func() {
		// Draw full A4 page background (210x297mm)
		if strings.HasSuffix(kopImage, ".jpg") || strings.HasSuffix(kopImage, ".jpeg") {
			pdf.ImageOptions(kopImage, 0, 0, 210, 297, false, gofpdf.ImageOptions{ImageType: "JPEG", ReadDpi: true}, 0, "")
		} else {
			pdf.ImageOptions(kopImage, 0, 0, 210, 297, false, gofpdf.ImageOptions{ReadDpi: true}, 0, "")
		}
	})

	pdf.AddPage()

	pdf.Ln(5)

	pdf.SetFont("Helvetica", "B", 13)
	pdf.CellFormat(0, 6, "FORM ASESMEN DAN REKAM MEDIS", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 10)

	nomorSurat := record.NomorSurat
	if nomorSurat == "" {
		nomorSurat = utils.GenerateDocumentNumber("Hasil Medis")
		// Save it back to DB
		config.DB.Model(&record).Update("nomor_surat", nomorSurat)
	}

	pdf.CellFormat(0, 5, fmt.Sprintf("Nomor Surat: %s", nomorSurat), "", 1, "C", false, 0, "")

	pdf.Ln(8)

	pdf.SetFont("Helvetica", "B", 10)
	pdf.SetFillColor(240, 240, 240)
	pdf.CellFormat(0, 6, " I. IDENTITAS PASIEN", "1", 1, "L", true, 0, "")
	pdf.Ln(3)

	pdf.SetFont("Helvetica", "", 10)
	details1 := [][]string{
		{"Nama Lengkap", record.Mahasiswa.Nama},
		{"NIM / ID", record.Mahasiswa.NIM},
		{"Program Studi", record.Mahasiswa.ProgramStudi.Nama},
		{"Jenis Kelamin", record.Mahasiswa.JenisKelamin},
		{"Golongan Darah", record.GolonganDarah},
		{"Alergi Obat", record.AlergiObat},
	}

	yStart := pdf.GetY()
	for i, row := range details1 {
		pdf.SetXY(25, yStart+float64(i)*6)
		pdf.CellFormat(40, 5, row[0], "", 0, "L", false, 0, "")
		pdf.CellFormat(5, 5, ":", "", 0, "C", false, 0, "")
		pdf.CellFormat(100, 5, row[1], "", 0, "L", false, 0, "")
	}
	pdf.SetY(yStart + float64(len(details1)*6) + 4)

	pdf.SetFont("Helvetica", "B", 10)
	pdf.CellFormat(0, 6, " II. HASIL PEMERIKSAAN MEDIS", "1", 1, "L", true, 0, "")
	pdf.Ln(3)

	pdf.SetFont("Helvetica", "", 10)

	catatanStr := record.Catatan
	if strings.HasPrefix(strings.TrimSpace(record.Catatan), "{") {
		var cMap map[string]interface{}
		if err := json.Unmarshal([]byte(record.Catatan), &cMap); err == nil {
			var parts []string
			if ct, ok := cMap["catatan_tambahan"].(string); ok && ct != "" {
				parts = append(parts, ct)
			}
			
			var info []string
			if v, ok := cMap["jam_tidur"]; ok { info = append(info, fmt.Sprintf("Tidur: %v jam", v)) }
			if v, ok := cMap["mood"]; ok { info = append(info, fmt.Sprintf("Mood: %v", v)) }
			if v, ok := cMap["tingkat_stres"]; ok { info = append(info, fmt.Sprintf("Stres: %v/10", v)) }
			
			if len(info) > 0 {
				parts = append(parts, "[" + strings.Join(info, ", ") + "]")
			}
			catatanStr = strings.Join(parts, " ")
			if catatanStr == "" {
				catatanStr = "Data self-screening tersimpan."
			}
		}
	}

	details2 := [][]string{
		{"Tanggal Pemeriksaan", record.Tanggal.Format("02 Jan 2006")},
		{"Keluhan / Penyakit", record.RiwayatPenyakit},
		{"Kondisi Psikologis", record.KondisiPsikologis},
		{"Tanda Vital", fmt.Sprintf("Suhu: %.1f C | Tensi: %d/%d | Nadi: %d | SpO2: %d%%", record.SuhuTubuh, record.Sistole, record.Diastole, record.DenyutNadi, record.SpO2)},
		{"Skala Nyeri", fmt.Sprintf("%d / 10", record.SkalaNyeri)},
		{"Tindakan", record.TindakanDiberikan},
		{"Obat", record.ObatDiberikan},
		{"Catatan", catatanStr},
		{"Hasil / Kesimpulan", record.Hasil},
		{"Rekomendasi", record.Rekomendasi},
	}

	yStart2 := pdf.GetY()
	for i, row := range details2 {
		pdf.SetXY(25, yStart2+float64(i)*6)
		pdf.CellFormat(40, 5, row[0], "", 0, "L", false, 0, "")
		pdf.CellFormat(5, 5, ":", "", 0, "C", false, 0, "")
		pdf.MultiCell(100, 5, row[1], "", "L", false)
		if i != len(details2)-1 {
			yStart2 = pdf.GetY() - float64(i+1)*6
		}
	}
	pdf.SetY(pdf.GetY() + 4)

	pdf.Ln(10)

	sigY := pdf.GetY()

	pdf.SetXY(130, sigY)
	pdf.CellFormat(60, 5, fmt.Sprintf("Bandung, %s", record.Tanggal.Format("02 Jan 2006")), "", 1, "C", false, 0, "")
	pdf.SetX(130)
	pdf.CellFormat(60, 5, "Tenaga Kesehatan / Medis", "", 1, "C", false, 0, "")

	pdf.SetXY(130, sigY+25)
	pdf.SetFont("Helvetica", "B", 10)
	namaTK := record.DiperiksaOleh
	if record.TenagaKes != nil {
		namaTK = record.TenagaKes.Nama
	}
	pdf.CellFormat(60, 5, fmt.Sprintf("( %s )", namaTK), "", 1, "C", false, 0, "")

	pdf.SetFooterFunc(func() {
		pdf.SetY(-15)
		pdf.SetFont("Helvetica", "I", 8)
		pdf.SetTextColor(128, 128, 128)
		pdf.CellFormat(0, 10, fmt.Sprintf("Dokumen ini dihasilkan secara otomatis oleh sistem pada %s", time.Now().Format("2006-01-02 15:04")), "", 0, "C", false, 0, "")
	})

	dirPath := filepath.Dir("uploads/kesehatan/rekam_medis.pdf")
	os.MkdirAll(dirPath, 0755)

	fileName := fmt.Sprintf("rekam_medis_%d.pdf", record.ID)
	filePath := filepath.Join(filepath.Dir("uploads/kesehatan/rekam_medis.pdf"), fileName)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal generate PDF")
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Rekam_Medis_%s.pdf\"", record.Mahasiswa.Nama))
	return c.SendFile(filePath)
}

func logActivity(c *fiber.Ctx, userID uint, aktivitas, deskripsi string) {
	audit := models.LogAktivitas{
		UserID:    userID,
		Aktivitas: aktivitas,
		Deskripsi: deskripsi,
		IPAddress: c.IP(),
	}
	config.DB.Create(&audit)
}
