package psychologist

import (
	"fmt"
	"sort"
	"strconv"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

func currentPsikolog(c *fiber.Ctx) (models.Psikolog, error) {
	userID, ok := c.Locals("user_id").(uint)
	if !ok || userID == 0 {
		return models.Psikolog{}, fiber.NewError(fiber.StatusUnauthorized, "User tidak valid")
	}

	var psikolog models.Psikolog
	if err := config.DB.Preload("User").Where("user_id = ?", userID).First(&psikolog).Error; err != nil {
		// Auto-create profile if missing
		var user models.User
		if errUser := config.DB.First(&user, userID).Error; errUser == nil {
			psikolog = models.Psikolog{
				UserID:  userID,
				Nama:    user.NamaLengkap,
				Email:   user.Email,
				IsAktif: true,
			}
			if errCreate := config.DB.Create(&psikolog).Error; errCreate == nil {
				psikolog.User = user
				return psikolog, nil
			}
		}
		return models.Psikolog{}, fiber.NewError(fiber.StatusNotFound, "Profil psikolog belum tersedia")
	}

	return psikolog, nil
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

func formatDate(t time.Time) string {
	return t.Format("02 Jan 2006")
}

func progressPercent(value int64, total int64) string {
	if total <= 0 {
		return "0%"
	}
	percent := int(float64(value) / float64(total) * 100)
	if percent < 8 && value > 0 {
		percent = 8
	}
	return fmt.Sprintf("%d%%", percent)
}

func bookingResponse(booking models.PsikologBooking) fiber.Map {
	student := booking.Mahasiswa
	return fiber.Map{
		"id":           booking.ID,
		"mahasiswa_id": booking.MahasiswaID,
		"name":         student.Nama,
		"nim":          student.NIM,
		"email":        student.EmailKampus,
		"phone":        student.NoHP,
		"prodi":        student.ProgramStudi.Nama,
		"faculty":      student.Fakultas.Nama,
		"semester":     student.SemesterSekarang,
		"date":         formatDate(booking.Tanggal),
		"raw_date":     booking.Tanggal.Format("2006-01-02"),
		"date_full":    booking.Tanggal.Format("Monday, 02 Jan 2006"),
		"time":         strings.TrimSpace(booking.JamMulai + " - " + booking.JamSelesai),
		"jam_mulai":    booking.JamMulai,
		"jam_selesai":  booking.JamSelesai,
		"issue":        booking.Topik,
		"note":         booking.Keluhan,
		"status":       booking.Status,
		"mode":         booking.Mode,
		"link_meeting": booking.LinkMeeting,
		"avatar":       initials(student.Nama),
		"created_at":   booking.CreatedAt,
	}
}

func GetMe(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}
	return jsonOK(c, psikolog)
}

func UpdateProfile(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var body struct {
		Nama         string `json:"nama"`
		Email        string `json:"email"`
		NoHP         string `json:"no_hp"`
		Spesialisasi string `json:"spesialisasi"`
		Bio          string `json:"bio"`
		Lokasi       string `json:"lokasi"`
		Bahasa       string `json:"bahasa"`
		IsAktif      *bool  `json:"is_aktif"` // pointer agar bisa detect kalau tidak dikirim
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	updates := map[string]any{}

	// Hanya update field yang dikirim (tidak kosong)
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
	if body.Bio != "" {
		updates["bio"] = strings.TrimSpace(body.Bio)
	}
	if body.Lokasi != "" {
		updates["lokasi"] = strings.TrimSpace(body.Lokasi)
	}
	if body.Bahasa != "" {
		updates["bahasa"] = strings.TrimSpace(body.Bahasa)
	}
	// is_aktif hanya diupdate kalau field-nya dikirim
	if body.IsAktif != nil {
		updates["is_aktif"] = *body.IsAktif
	}

	if len(updates) == 0 {
		return fiber.NewError(fiber.StatusBadRequest, "Tidak ada data yang diperbarui")
	}

	if err := config.DB.Model(&psikolog).Updates(updates).Error; err != nil {
		return err
	}

	_ = config.DB.Preload("User").First(&psikolog, psikolog.ID).Error
	return jsonOK(c, psikolog)
}

func ChangePassword(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
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
	if err := config.DB.First(&user, psikolog.UserID).Error; err != nil {
		return err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(body.OldPassword)); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Password saat ini salah")
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	// Update password langsung via query untuk menghindari GORM skip zero-value
	if err := config.DB.Exec("UPDATE users SET password = ? WHERE id = ?", string(hash), user.ID).Error; err != nil {
		return err
	}
	return jsonOK(c, fiber.Map{"updated": true, "message": "Password berhasil diubah"})
}

func GetDashboard(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	// Awal bulan ini
	now := time.Now().UTC()
	firstOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	firstOfNextMonth := firstOfMonth.AddDate(0, 1, 0)

	// Booking hari ini (semua status)
	var todayBookings int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND tanggal >= ? AND tanggal < ?", psikolog.ID, today, tomorrow).
		Count(&todayBookings)

	// Upcoming: semua booking dari hari ini ke depan yang belum selesai/ditolak
	var upcomingCount int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND tanggal >= ? AND status NOT IN ?", psikolog.ID, today, []string{"Selesai", "Ditolak", "Dibatalkan"}).
		Count(&upcomingCount)

	// Selesai hari ini — booking yang statusnya Selesai dan updated_at hari ini
	var completedToday int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND status = ? AND DATE(updated_at) = DATE(NOW())", psikolog.ID, "Selesai").
		Count(&completedToday)

	// Selesai bulan ini — booking yang statusnya Selesai dan updated_at bulan ini
	var completedThisMonth int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND status = ? AND updated_at >= ? AND updated_at < ?", psikolog.ID, "Selesai", firstOfMonth, firstOfNextMonth).
		Count(&completedThisMonth)

	// Menunggu (semua waktu, belum dikonfirmasi)
	var waiting int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND status = ?", psikolog.ID, "Menunggu").
		Count(&waiting)

	// Baru hari ini (booking yang baru masuk hari ini, status Menunggu)
	var newToday int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND status = ? AND created_at >= ? AND created_at < ?", psikolog.ID, "Menunggu", today, tomorrow).
		Count(&newToday)

	// Dikonfirmasi (untuk info tambahan)
	var confirmed int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND status = ?", psikolog.ID, "Dikonfirmasi").
		Count(&confirmed)

	// Total pasien unik
	var totalPatients int64
	config.DB.Model(&models.PsikologBooking{}).Where("psikolog_id = ?", psikolog.ID).Distinct("mahasiswa_id").Count(&totalPatients)

	// Total sesi selesai (semua waktu) — dari bookings status Selesai
	var completedSessions int64
	config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND status = ?", psikolog.ID, "Selesai").
		Count(&completedSessions)

	var assessments int64
	config.DB.Model(&models.PsikologAssessment{}).Where("psikolog_id = ?", psikolog.ID).Count(&assessments)

	totalWork := waiting + confirmed + completedSessions
	if totalWork == 0 {
		totalWork = 1
	}

	// 5 booking mendatang (hari ini ke depan, belum selesai)
	var bookings []models.PsikologBooking
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").
		Where("psikolog_id = ? AND tanggal >= ? AND status NOT IN ?", psikolog.ID, today, []string{"Selesai", "Ditolak", "Dibatalkan"}).
		Order("tanggal asc, jam_mulai asc").
		Limit(5).Find(&bookings).Error; err != nil {
		return err
	}

	bookingItems := make([]fiber.Map, 0, len(bookings))
	for _, booking := range bookings {
		bookingItems = append(bookingItems, bookingResponse(booking))
	}

	var currentBooking models.PsikologBooking
	currentSession := fiber.Map{"available": false}
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").
		Where("psikolog_id = ? AND status IN ?", psikolog.ID, []string{"Dikonfirmasi", "Selesai"}).
		Order("tanggal desc, jam_mulai desc").
		First(&currentBooking).Error; err == nil {
		currentSession = bookingResponse(currentBooking)
		currentSession["available"] = true
	}

	recentActivities := []fiber.Map{}
	for _, booking := range bookings {
		recentActivities = append(recentActivities, fiber.Map{
			"title":       "Booking " + booking.Status,
			"description": booking.Mahasiswa.Nama + " - " + booking.Topik,
			"time":        formatDate(booking.UpdatedAt),
			"type":        "booking",
		})
		if len(recentActivities) >= 4 {
			break
		}
	}

	return jsonOK(c, fiber.Map{
		"stats": []fiber.Map{
			{"label": "Total Pasien", "value": totalPatients, "progress": "100%", "color": "bg-blue-500"},
			{"label": "Sesi Selesai", "value": completedSessions, "progress": progressPercent(completedSessions, totalWork), "color": "bg-emerald-500"},
			{"label": "Menunggu", "value": waiting, "progress": progressPercent(waiting, totalWork), "color": "bg-amber-500"},
		},
		"today_appointments":    todayBookings,
		"upcoming_appointments": upcomingCount,
		"completed_today":       completedToday,
		"completed_this_month":  completedThisMonth,
		"waiting_count":         waiting,
		"new_today":             newToday,
		"confirmed_count":       confirmed,

		"assessments_count": assessments,
		"bookings":          bookingItems,
		"current_session":   currentSession,
		"recent_activities": recentActivities,
		"profile":           psikolog,
	})
}

func GetBookings(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var bookings []models.PsikologBooking
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Where("psikolog_id = ?", psikolog.ID).Order("tanggal desc, jam_mulai asc").Find(&bookings).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(bookings))
	for _, booking := range bookings {
		items = append(items, bookingResponse(booking))
	}
	return jsonOK(c, items)
}

func GetBookingDetail(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var booking models.PsikologBooking
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Where("id = ? AND psikolog_id = ?", c.Params("id"), psikolog.ID).First(&booking).Error; err != nil {
		return err
	}

	item := bookingResponse(booking)
	item["history"] = []fiber.Map{
		{"action": "Booking Dibuat", "time": booking.CreatedAt.Format("02 Jan, 15:04"), "type": "created"},
		{"action": booking.Status, "time": "Status saat ini", "type": "status"},
	}
	return jsonOK(c, item)
}

func UpdateBookingStatus(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var body struct {
		Status      string `json:"status"`
		Note        string `json:"note"`
		LinkMeeting string `json:"link_meeting"` // diisi saat konfirmasi booking Online
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload tidak valid")
	}

	allowed := map[string]bool{"Menunggu": true, "Dikonfirmasi": true, "Ditolak": true, "Selesai": true}
	if !allowed[body.Status] {
		return fiber.NewError(fiber.StatusBadRequest, "Status booking tidak valid")
	}

	var booking models.PsikologBooking
	if err := config.DB.Preload("Mahasiswa").Where("id = ? AND psikolog_id = ?", c.Params("id"), psikolog.ID).First(&booking).Error; err != nil {
		return err
	}
	if booking.Status == "Dikonfirmasi" && body.Status != "Selesai" {
		return fiber.NewError(fiber.StatusBadRequest, "Booking yang sudah dikonfirmasi hanya bisa diubah ke Selesai")
	}
	if booking.Status == "Selesai" {
		return fiber.NewError(fiber.StatusBadRequest, "Booking selesai tidak dapat diubah dari halaman booking")
	}

	updates := map[string]any{
		"status":        body.Status,
		"catatan_admin": body.Note,
	}
	// Simpan link meeting kalau ada (hanya relevan untuk mode Online)
	if body.LinkMeeting != "" {
		updates["link_meeting"] = body.LinkMeeting
	}

	if err := config.DB.Model(&booking).Updates(updates).Error; err != nil {
		return err
	}

	// Kirim notifikasi ke mahasiswa
	go func() {
		var notifTitle, notifContent string
		switch body.Status {
		case "Dikonfirmasi":
			if booking.Mode == "Online" && body.LinkMeeting != "" {
				notifTitle = "Booking Konseling Dikonfirmasi ✅"
				notifContent = fmt.Sprintf(
					"Booking konseling kamu dengan %s pada %s pukul %s telah dikonfirmasi.\n\n🔗 Link Meeting: %s",
					psikolog.Nama,
					booking.Tanggal.Format("02 Jan 2006"),
					booking.JamMulai,
					body.LinkMeeting,
				)
			} else {
				notifTitle = "Booking Konseling Dikonfirmasi ✅"
				notifContent = fmt.Sprintf(
					"Booking konseling kamu dengan %s pada %s pukul %s telah dikonfirmasi. Harap hadir tepat waktu di %s.",
					psikolog.Nama,
					booking.Tanggal.Format("02 Jan 2006"),
					booking.JamMulai,
					psikolog.Lokasi,
				)
			}
		case "Ditolak":
			notifTitle = "Booking Konseling Ditolak"
			notifContent = fmt.Sprintf(
				"Maaf, booking konseling kamu dengan %s pada %s pukul %s tidak dapat dikonfirmasi.",
				psikolog.Nama,
				booking.Tanggal.Format("02 Jan 2006"),
				booking.JamMulai,
			)
			if body.Note != "" {
				notifContent += "\n\nAlasan: " + body.Note
			}
		case "Selesai":
			notifTitle = "Sesi Konseling Selesai"
			notifContent = fmt.Sprintf(
				"Sesi konseling kamu dengan %s pada %s telah selesai. Terima kasih telah menggunakan layanan BKU Care.",
				psikolog.Nama,
				booking.Tanggal.Format("02 Jan 2006"),
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

func GetSchedules(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	days := []string{"Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"}
	var slots []models.PsikologScheduleSlot
	if err := config.DB.Where("psikolog_id = ?", psikolog.ID).Order("id asc").Find(&slots).Error; err != nil {
		return err
	}

	grouped := make([]fiber.Map, 0, len(days))
	for _, day := range days {
		daySlots := []fiber.Map{}
		enabled := false
		for _, slot := range slots {
			if slot.Hari == day {
				if slot.IsAktif != nil && *slot.IsAktif {
					enabled = true
				}
				daySlots = append(daySlots, fiber.Map{
					"id":           slot.ID,
					"kategori":     firstNonEmpty(slot.Kategori, "Personal"),
					"start":        slot.JamMulai,
					"end":          slot.JamSelesai,
					"lokasi":       slot.Lokasi,
					"kuota":        slot.Kuota,
					"is_available": slot.IsAktif != nil && *slot.IsAktif,
				})
			}
		}
		grouped = append(grouped, fiber.Map{"day": day, "enabled": enabled, "slots": daySlots})
	}
	return jsonOK(c, grouped)
}

func SaveSchedules(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var body []struct {
		Day     string `json:"day"`
		Enabled bool   `json:"enabled"`
		Slots   []struct {
			Kategori    string `json:"kategori"`
			Start       string `json:"start"`
			End         string `json:"end"`
			Lokasi      string `json:"lokasi"`
			Kuota       int    `json:"kuota"`
			IsAvailable *bool  `json:"is_available"`
		} `json:"slots"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload jadwal tidak valid")
	}

	err = config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("psikolog_id = ?", psikolog.ID).Delete(&models.PsikologScheduleSlot{}).Error; err != nil {
			return err
		}
		for _, day := range body {
			for _, slot := range day.Slots {
				kuota := slot.Kuota
				if kuota <= 0 {
					kuota = 1
				}
				kategori := normalizeScheduleCategory(slot.Kategori)

				// Per-slot toggle: kalau is_available dikirim, pakai itu
				// Kalau tidak, fallback ke day.Enabled
				isAktif := day.Enabled
				if slot.IsAvailable != nil {
					isAktif = *slot.IsAvailable
				}

				isAktifVal := isAktif
				record := models.PsikologScheduleSlot{
					PsikologID: psikolog.ID,
					Hari:       day.Day,
					Kategori:   kategori,
					JamMulai:   slot.Start,
					JamSelesai: slot.End,
					Lokasi:     slot.Lokasi,
					Kuota:      kuota,
					IsAktif:    &isAktifVal,
				}
				if err := tx.Create(&record).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	return GetSchedules(c)
}

func GetPatients(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var students []models.Mahasiswa
	subQuery := config.DB.Model(&models.PsikologBooking{}).Select("mahasiswa_id").Where("psikolog_id = ?", psikolog.ID)
	if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").Where("id IN (?)", subQuery).Find(&students).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(students))
	for _, student := range students {
		var sessions int64
		config.DB.Model(&models.PsikologSessionNote{}).Where("psikolog_id = ? AND mahasiswa_id = ?", psikolog.ID, student.ID).Count(&sessions)

		var latest models.PsikologSessionNote
		lastVisit := "Belum ada"
		rawLastVisit := ""
		status := "Baru"
		if err := config.DB.Where("psikolog_id = ? AND mahasiswa_id = ?", psikolog.ID, student.ID).Order("tanggal desc").First(&latest).Error; err == nil {
			lastVisit = formatDate(latest.Tanggal)
			rawLastVisit = latest.Tanggal.Format("2006-01-02")
			status = latest.StatusPasien
			if status == "" {
				status = latest.Mood
			}
		}
		var activeBookingCount int64
		config.DB.Model(&models.PsikologBooking{}).
			Where("mahasiswa_id = ? AND psikolog_id = ? AND status IN ?", student.ID, psikolog.ID, []string{"Menunggu", "Dikonfirmasi"}).
			Count(&activeBookingCount)

		items = append(items, fiber.Map{"id": student.ID, "name": student.Nama, "nim": student.NIM, "faculty": student.Fakultas.Nama, "program_studi": student.ProgramStudi.Nama, "semester": student.SemesterSekarang, "email": student.EmailKampus, "phone": student.NoHP, "sessions": sessions, "lastVisit": lastVisit, "raw_last_visit": rawLastVisit, "status": status, "color": "bg-blue-500", "has_active_booking": activeBookingCount > 0})
	}
	return jsonOK(c, items)
}

func GetMedicalRecord(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var student models.Mahasiswa
	if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").Preload("DosenPA").Where("id = ?", c.Params("id")).First(&student).Error; err != nil {
		return err
	}

	// Find the latest Siklus for this student
	var latestNote models.PsikologSessionNote
	activeSiklus := 1
	if err := config.DB.Where("psikolog_id = ? AND mahasiswa_id = ?", psikolog.ID, student.ID).Order("tanggal desc").First(&latestNote).Error; err == nil {
		if latestNote.TindakLanjutTuntas {
			// If the last note of the last siklus was "Selesai", the active siklus is empty and ready for the next one
			activeSiklus = latestNote.Siklus + 1
		} else {
			activeSiklus = latestNote.Siklus
		}
	}
	if activeSiklus == 0 {
		activeSiklus = 1
	}

	var records []models.PsikologSessionNote
	if err := config.DB.Where("psikolog_id = ? AND mahasiswa_id = ?", psikolog.ID, student.ID).Order("tanggal desc").Find(&records).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(records))
	status := "Baru"
	for _, record := range records {
		if status == "Baru" && record.StatusPasien != "" {
			status = record.StatusPasien
		}

		tAsesmenStr := ""
		if record.TanggalAsesmen != nil {
			tAsesmenStr = record.TanggalAsesmen.Format("2006-01-02")
		}

		items = append(items, fiber.Map{
			"id":                     record.ID,
			"date":                   formatDate(record.Tanggal),
			"time":                   record.Tanggal.Format("15:04"),
			"complaint":              record.Keluhan,
			"observation":            record.Observasi,
			"recommendation":         record.Rekomendasi,
			"mood":                   record.Mood,
			"type":                   record.JenisSesi,
			"tujuan_pemeriksaan":     record.TujuanPemeriksaan,
			"tanggal_asesmen":        tAsesmenStr,
			"riwayat_keluhan":        record.RiwayatKeluhan,
			"aspek_kognitif":         record.AspekKognitif,
			"aspek_emosional":        record.AspekEmosional,
			"aspek_perilaku":         record.AspekPerilaku,
			"rekomendasi_mahasiswa":  record.RekomendasiMahasiswa,
			"rekomendasi_prodi":      record.RekomendasiProdi,
			"rekomendasi_orang_tua":  record.RekomendasiOrangTua,
			"tindak_lanjut_tuntas":   record.TindakLanjutTuntas,
			"tindak_lanjut_lanjutan": record.TindakLanjutLanjutan,
			"tindak_lanjut_rujuk":    record.TindakLanjutRujuk,
			"kesimpulan":             record.Kesimpulan,
			"siklus":                 record.Siklus,
		})
	}

	var activeBooking models.PsikologBooking
	var activeBookingID *uint
	if err := config.DB.Where("mahasiswa_id = ? AND psikolog_id = ? AND status IN ?", student.ID, psikolog.ID, []string{"Menunggu", "Dikonfirmasi"}).
		Order("tanggal desc, jam_mulai desc").First(&activeBooking).Error; err == nil {
		activeBookingID = &activeBooking.ID
	}

	dosenPaName := "-"
	if student.DosenPA != nil {
		dosenPaName = student.DosenPA.Nama
	}

	tglLahirStr := "-"
	if !student.TanggalLahir.IsZero() {
		tglLahirStr = student.TanggalLahir.Format("2006-01-02")
	}

	return jsonOK(c, fiber.Map{
		"patient": fiber.Map{
			"id":            student.ID,
			"name":          student.Nama,
			"nim":           student.NIM,
			"faculty":       student.Fakultas.Nama,
			"program_studi": student.ProgramStudi.Nama,
			"semester":      student.SemesterSekarang,
			"email":         student.EmailKampus,
			"phone":         student.NoHP,
			"color":         "bg-primary",
			"initials":      initials(student.Nama),
			"status":        status,
			"totalSessions": len(records),
			"dosen_pa":      dosenPaName,
			"ipk":           student.IPK,
			"jenis_kelamin": student.JenisKelamin,
			"tempat_lahir":  student.TempatLahir,
			"tanggal_lahir": tglLahirStr,
		},
		"active_booking_id":   activeBookingID,
		"records":             items,
		"active_siklus":       activeSiklus,
		"last_session_tuntas": len(records) > 0 && records[0].TindakLanjutTuntas,
	})
}

func CreateSessionNote(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var body struct {
		Complaint            string `json:"complaint"`
		Observation          string `json:"observation"`
		Recommendation       string `json:"recommendation"`
		Mood                 string `json:"mood"`
		Type                 string `json:"type"`
		Status               string `json:"status"`
		BookingID            uint   `json:"booking_id"`
		TujuanPemeriksaan    string `json:"tujuan_pemeriksaan"`
		TanggalAsesmen       string `json:"tanggal_asesmen"`
		RiwayatKeluhan       string `json:"riwayat_keluhan"`
		AspekKognitif        string `json:"aspek_kognitif"`
		AspekEmosional       string `json:"aspek_emosional"`
		AspekPerilaku        string `json:"aspek_perilaku"`
		RekomendasiMahasiswa string `json:"rekomendasi_mahasiswa"`
		RekomendasiProdi     string `json:"rekomendasi_prodi"`
		RekomendasiOrangTua  string `json:"rekomendasi_orang_tua"`
		TindakLanjutTuntas   bool   `json:"tindak_lanjut_tuntas"`
		TindakLanjutLanjutan bool   `json:"tindak_lanjut_lanjutan"`
		TindakLanjutRujuk    bool   `json:"tindak_lanjut_rujuk"`
		Kesimpulan           string `json:"kesimpulan"`
		// Rujukan fields
		RujukanTipe        string `json:"rujukan_tipe"`
		RujukanPihakTujuan string `json:"rujukan_pihak_tujuan"`
		RujukanEmailTujuan string `json:"rujukan_email_tujuan"`
		RujukanAlasan      string `json:"rujukan_alasan"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload catatan sesi tidak valid")
	}

	studentID, err := c.ParamsInt("id")
	if err != nil || studentID <= 0 {
		return fiber.NewError(fiber.StatusBadRequest, "ID mahasiswa tidak valid")
	}

	var bookingID *uint
	if body.BookingID != 0 {
		var booking models.PsikologBooking
		if err := config.DB.Where("id = ? AND psikolog_id = ? AND mahasiswa_id = ?", body.BookingID, psikolog.ID, studentID).First(&booking).Error; err == nil {
			if booking.Status == "Selesai" {
				return fiber.NewError(fiber.StatusBadRequest, "Sesi booking ini sudah selesai, tidak bisa menambahkan catatan sesi lagi.")
			}
			bookingID = &body.BookingID
		}
	}
	if bookingID == nil {
		var activeBooking models.PsikologBooking
		if err := config.DB.Where("mahasiswa_id = ? AND psikolog_id = ? AND status IN ?", studentID, psikolog.ID, []string{"Menunggu", "Dikonfirmasi"}).
			Order("tanggal desc, jam_mulai desc").First(&activeBooking).Error; err == nil {
			bookingID = &activeBooking.ID
		}
	}
	if bookingID == nil {
		return fiber.NewError(fiber.StatusBadRequest, "Tidak ada booking aktif untuk mahasiswa ini. Catatan sesi hanya dapat ditambahkan jika ada booking aktif.")
	}

	var tAsesmen *time.Time
	if body.TanggalAsesmen != "" {
		if parsedTime, err := time.Parse("2006-01-02", body.TanggalAsesmen); err == nil {
			tAsesmen = &parsedTime
		}
	}
	if tAsesmen == nil {
		now := time.Now().UTC()
		tAsesmen = &now
	}

	record := models.PsikologSessionNote{
		PsikologID:           psikolog.ID,
		MahasiswaID:          uint(studentID),
		BookingID:            bookingID,
		Tanggal:              time.Now(),
		Keluhan:              body.Complaint,
		Observasi:            body.Observation,
		Rekomendasi:          body.Recommendation,
		Mood:                 body.Mood,
		JenisSesi:            body.Type,
		StatusPasien:         body.Status,
		TujuanPemeriksaan:    body.TujuanPemeriksaan,
		TanggalAsesmen:       tAsesmen,
		RiwayatKeluhan:       body.RiwayatKeluhan,
		AspekKognitif:        body.AspekKognitif,
		AspekEmosional:       body.AspekEmosional,
		AspekPerilaku:        body.AspekPerilaku,
		RekomendasiMahasiswa: body.RekomendasiMahasiswa,
		RekomendasiProdi:     body.RekomendasiProdi,
		RekomendasiOrangTua:  body.RekomendasiOrangTua,
		TindakLanjutTuntas:   body.TindakLanjutTuntas,
		TindakLanjutLanjutan: body.TindakLanjutLanjutan,
		TindakLanjutRujuk:    body.TindakLanjutRujuk,
		Kesimpulan:           body.Kesimpulan,
		NomorSurat:           utils.GenerateDocumentNumber("Hasil Konseling"),
	}

	// Menentukan Siklus
	var previousNote models.PsikologSessionNote
	var siklus int = 1
	if err := config.DB.Where("psikolog_id = ? AND mahasiswa_id = ?", psikolog.ID, studentID).Order("tanggal desc").First(&previousNote).Error; err == nil {
		if previousNote.TindakLanjutTuntas {
			siklus = previousNote.Siklus + 1
		} else {
			siklus = previousNote.Siklus
		}
	}
	if siklus == 0 {
		siklus = 1
	}
	record.Siklus = siklus

	if record.JenisSesi == "" {
		record.JenisSesi = "Konseling Baru"
	}
	if body.TindakLanjutTuntas {
		record.StatusPasien = "Selesai"
	} else if record.StatusPasien == "" {
		record.StatusPasien = record.Mood
	}
	if err := config.DB.Create(&record).Error; err != nil {
		return err
	}

	if bookingID != nil {
		// All bookings associated with a submitted session note are considered "Selesai" (the visit is finished)
		// If they chose "Sesi Lanjutan", they still need to make a new booking for the next visit.
		_ = config.DB.Model(&models.PsikologBooking{}).Where("id = ? AND psikolog_id = ?", *bookingID, psikolog.ID).Update("status", "Selesai").Error
	}

	// Automate referral creation if TindakLanjutRujuk is true
	if body.TindakLanjutRujuk {
		refTipe := body.RujukanTipe
		if refTipe != "Medis" && refTipe != "Akademik" {
			refTipe = "Medis"
		}
		refPihak := body.RujukanPihakTujuan
		if refPihak == "" {
			refPihak = "Klinik Rujukan Utama"
		}
		refEmail := body.RujukanEmailTujuan
		if refEmail == "" {
			refEmail = "rujukan@bku.ac.id"
		}
		refAlasan := body.RujukanAlasan
		if refAlasan == "" {
			refAlasan = body.Kesimpulan
			if refAlasan == "" {
				refAlasan = body.Complaint
			}
		}

		var mahasiswa models.Mahasiswa
		if err := config.DB.Preload("Fakultas").Preload("ProgramStudi").Where("id = ?", studentID).First(&mahasiswa).Error; err == nil {
			referral := models.PsikologReferral{
				PsikologID:    psikolog.ID,
				Psikolog:      psikolog,
				MahasiswaID:   uint(studentID),
				Mahasiswa:     mahasiswa,
				BookingID:     bookingID,
				Tipe:          refTipe,
				Alasan:        refAlasan,
				Status:        "Pending",
				PihakTujuan:   refPihak,
				EmailTujuan:   refEmail,
				TanggalDibuat: time.Now(),
			}

			suratRujukanURL := generateReferralLetter(referral)
			referral.SuratRujiukanURL = suratRujukanURL
			_ = config.DB.Create(&referral).Error

			go func() {
				_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
					MahasiswaID: uint(studentID),
					Type:        "info",
					Title:       "Surat Rujukan Otomatis Dibuat",
					Content: fmt.Sprintf(
						"Psikolog %s telah merujuk Anda ke %s (%s). Surat rujukan telah diterbitkan.",
						psikolog.Nama,
						refPihak,
						refTipe,
					),
				})
			}()
		}
	}

	return jsonOK(c, record)
}

func GetAssessments(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var assessments []models.PsikologAssessment
	if err := config.DB.Preload("Mahasiswa").Where("psikolog_id = ?", psikolog.ID).Order("created_at desc").Find(&assessments).Error; err != nil {
		return err
	}

	counts := map[string]int{}
	verification := map[string]int{}
	totalScore := 0
	scoredItems := 0
	items := make([]fiber.Map, 0, len(assessments))
	for _, assessment := range assessments {
		counts[assessment.Kategori]++
		if assessment.Status != "Selesai" {
			verification[assessment.Nama]++
		}
		switch assessment.Skor {
		case "Normal", "Stabil", "Rendah":
			totalScore += 85
			scoredItems++
		case "Sedang", "Netral":
			totalScore += 70
			scoredItems++
		case "Tinggi", "Berat", "Mendesak":
			totalScore += 45
			scoredItems++
		}
		name := "Belum ditugaskan"
		if assessment.Mahasiswa != nil {
			name = assessment.Mahasiswa.Nama
		}
		date := "Draft"
		if assessment.SubmittedAt != nil {
			date = formatDate(*assessment.SubmittedAt)
		}
		items = append(items, fiber.Map{"id": assessment.ID, "name": name, "assessment": assessment.Nama, "category": assessment.Kategori, "score": assessment.Skor, "date": date, "status": assessment.Status, "color": "bg-indigo-500"})
	}

	categories := []fiber.Map{}
	for _, name := range []string{"Kesehatan Mental", "Kepribadian", "Minat Bakat", "Lainnya"} {
		categories = append(categories, fiber.Map{"name": name, "count": counts[name]})
	}
	queue := []fiber.Map{}
	for name, count := range verification {
		queue = append(queue, fiber.Map{"name": name, "count": count})
	}
	mentalScore := 0
	if scoredItems > 0 {
		mentalScore = totalScore / scoredItems
	}
	return jsonOK(c, fiber.Map{"categories": categories, "submissions": items, "verification_queue": queue, "mental_score": mentalScore})
}

func CreateAssessment(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var body struct {
		Nama      string `json:"nama"`
		Kategori  string `json:"kategori"`
		Deskripsi string `json:"deskripsi"`
	}
	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Payload asesmen tidak valid")
	}
	record := models.PsikologAssessment{PsikologID: psikolog.ID, Nama: body.Nama, Kategori: body.Kategori, Deskripsi: body.Deskripsi, Status: "Draft", Skor: "-"}
	if err := config.DB.Create(&record).Error; err != nil {
		return err
	}
	return jsonOK(c, record)
}

func getBookingQuery(psikologID uint, startDateStr, endDateStr, prodiIDStr, fakultasIDStr string) *gorm.DB {
	q := config.DB.Model(&models.PsikologBooking{}).Where("psikolog_id = ?", psikologID)
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			q = q.Where("tanggal >= ?", t)
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
			q = q.Where("tanggal <= ?", tEnd)
		}
	}
	if prodiIDStr != "" || fakultasIDStr != "" {
		q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			q = q.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			q = q.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	return q
}

func getSessionQuery(psikologID uint, startDateStr, endDateStr, prodiIDStr, fakultasIDStr string) *gorm.DB {
	q := config.DB.Model(&models.PsikologSessionNote{}).Where("psikolog_id = ?", psikologID)
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			q = q.Where("tanggal >= ?", t)
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
			q = q.Where("tanggal <= ?", tEnd)
		}
	}
	if prodiIDStr != "" || fakultasIDStr != "" {
		q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			q = q.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			q = q.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	return q
}

func GetAnalytics(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")
	prodiIDStr := c.Query("prodi_id")
	fakultasIDStr := c.Query("fakultas_id")

	// Calculate counts using clean queries
	var patients int64
	getBookingQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Distinct("mahasiswa_id").Count(&patients)

	var sessions int64
	getBookingQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Where("status = ?", "Selesai").Count(&sessions)

	var urgent int64
	getBookingQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Where("status NOT IN ?", []string{"Selesai", "Ditolak", "Dibatalkan"}).Count(&urgent)

	var stable int64
	getSessionQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Where("status_pasien IN ?", []string{"Stabil", "Pemulihan", "Membaik"}).Count(&stable)

	var totalNotes int64
	getSessionQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Count(&totalNotes)

	stablePercentage := 0
	if totalNotes > 0 {
		stablePercentage = int(float64(stable) / float64(totalNotes) * 100)
	}

	// Top Issues using filtered bookings
	var bookings []models.PsikologBooking
	qBookings := config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ?", psikolog.ID)
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			qBookings = qBookings.Where("tanggal >= ?", t)
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
			qBookings = qBookings.Where("tanggal <= ?", tEnd)
		}
	}
	if prodiIDStr != "" || fakultasIDStr != "" {
		qBookings = qBookings.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			qBookings = qBookings.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			qBookings = qBookings.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	if err := qBookings.Find(&bookings).Error; err != nil {
		fmt.Printf("Error querying bookings: %v\n", err)
	}

	issueCounts := map[string]int{}
	for _, booking := range bookings {
		if booking.Topik != "" {
			issueCounts[booking.Topik]++
		}
	}
	total := len(bookings)
	topIssues := []fiber.Map{}
	for issue, count := range issueCounts {
		percentage := 0
		if total > 0 {
			percentage = int(float64(count) / float64(total) * 100)
		}
		topIssues = append(topIssues, fiber.Map{"name": issue, "percentage": percentage, "count": count, "color": "bg-primary"})
	}
	sort.Slice(topIssues, func(i, j int) bool { return topIssues[i]["percentage"].(int) > topIssues[j]["percentage"].(int) })

	// Academic & Non-Academic counts
	var academicCount int64
	var nonAcademicCount int64
	for _, b := range bookings {
		if b.Topik == "Akademik" {
			academicCount++
		} else if b.Topik != "" {
			nonAcademicCount++
		}
	}
	totalIssues := academicCount + nonAcademicCount
	academicPercentage := 0
	nonAcademicPercentage := 0
	if totalIssues > 0 {
		academicPercentage = int(float64(academicCount) / float64(totalIssues) * 100)
		nonAcademicPercentage = 100 - academicPercentage
	}

	// Monthly Trends (Completed bookings per month in current year)
	now := time.Now().UTC()
	monthly := make([]int, 12)
	qCompleted := config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND status = ? AND EXTRACT(YEAR FROM updated_at) = ?", psikolog.ID, "Selesai", now.Year())
	if prodiIDStr != "" || fakultasIDStr != "" {
		qCompleted = qCompleted.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			qCompleted = qCompleted.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			qCompleted = qCompleted.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	var completedBookings []models.PsikologBooking
	_ = qCompleted.Find(&completedBookings).Error
	for _, b := range completedBookings {
		month := int(b.UpdatedAt.Month()) - 1
		if month >= 0 && month < 12 {
			monthly[month]++
		}
	}

	// Dynamic Range Counseling Trend (Daily Trend)
	var startRange, endRange time.Time
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			startRange = t
		}
	}
	if startRange.IsZero() {
		startRange = time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	}

	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			endRange = time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
		}
	}
	if endRange.IsZero() {
		startOfNextMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC).AddDate(0, 1, 0)
		endRange = startOfNextMonth.Add(-time.Second)
	}

	var dailyCounts []struct {
		DateVal time.Time `gorm:"column:date_val"`
		Count   int64     `gorm:"column:count"`
	}
	qDaily := config.DB.Model(&models.PsikologBooking{}).
		Select("DATE(tanggal) as date_val, count(id) as count").
		Where("psikolog_id = ? AND tanggal BETWEEN ? AND ?", psikolog.ID, startRange, endRange)
	if prodiIDStr != "" || fakultasIDStr != "" {
		qDaily = qDaily.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			qDaily = qDaily.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			qDaily = qDaily.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	qDaily.Group("DATE(tanggal)").Order("date_val asc").Scan(&dailyCounts)

	dailyTrendsMap := make(map[string]int64)
	for _, dc := range dailyCounts {
		dailyTrendsMap[dc.DateVal.Format("2006-01-02")] = dc.Count
	}
	dailyTrends := []fiber.Map{}

	// Limit loop to maximum of 45 days to prevent huge response payload
	limitDays := 45
	curr := startRange
	for i := 0; i < limitDays && !curr.After(endRange); i++ {
		dateKey := curr.Format("2006-01-02")
		count := dailyTrendsMap[dateKey]
		dailyTrends = append(dailyTrends, fiber.Map{
			"date":  curr.Format("02 Jan"),
			"count": count,
		})
		curr = curr.AddDate(0, 0, 1)
	}

	// Jurusan/Prodi Terbanyak
	var prodiCounts []struct {
		ProdiName string `json:"prodi_name"`
		Count     int64  `json:"count"`
	}
	qProdi := config.DB.Model(&models.PsikologBooking{}).
		Select("ps.nama as prodi_name, count(psikolog.bookings.id) as count").
		Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id").
		Joins("JOIN fakultas.program_studi ps ON ps.id = m.prodi_id").
		Where("psikolog_id = ?", psikolog.ID)
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			qProdi = qProdi.Where("tanggal >= ?", t)
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
			qProdi = qProdi.Where("tanggal <= ?", tEnd)
		}
	}
	if prodiIDStr != "" {
		qProdi = qProdi.Where("m.prodi_id = ?", prodiIDStr)
	}
	if fakultasIDStr != "" {
		qProdi = qProdi.Where("m.fakultas_id = ?", fakultasIDStr)
	}
	qProdi.Group("ps.nama").Order("count desc").Limit(5).Scan(&prodiCounts)

	prodiPopularity := []fiber.Map{}
	var totalProdiCount int64
	for _, pc := range prodiCounts {
		totalProdiCount += pc.Count
	}
	for _, pc := range prodiCounts {
		percentage := 0
		if totalProdiCount > 0 {
			percentage = int(float64(pc.Count) / float64(totalProdiCount) * 100)
		}
		prodiPopularity = append(prodiPopularity, fiber.Map{
			"name":       pc.ProdiName,
			"count":      pc.Count,
			"percentage": percentage,
		})
	}

	// Tren topik minggu ini
	weekStart := now.AddDate(0, 0, -int(now.Weekday()))
	weekStart = time.Date(weekStart.Year(), weekStart.Month(), weekStart.Day(), 0, 0, 0, 0, time.UTC)
	var weekBookings []models.PsikologBooking
	qWeek := config.DB.Model(&models.PsikologBooking{}).
		Where("psikolog_id = ? AND created_at >= ?", psikolog.ID, weekStart)
	if prodiIDStr != "" || fakultasIDStr != "" {
		qWeek = qWeek.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			qWeek = qWeek.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			qWeek = qWeek.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	_ = qWeek.Find(&weekBookings).Error
	weekIssueCounts := map[string]int{}
	weekTotal := len(weekBookings)
	for _, b := range weekBookings {
		if b.Topik != "" {
			weekIssueCounts[b.Topik]++
		}
	}
	weekTrends := []fiber.Map{}
	for issue, count := range weekIssueCounts {
		val := 0.0
		if weekTotal > 0 {
			val = float64(count) / float64(weekTotal)
		}
		weekTrends = append(weekTrends, fiber.Map{"name": issue, "val": val, "count": count})
	}
	sort.Slice(weekTrends, func(i, j int) bool {
		return weekTrends[i]["val"].(float64) > weekTrends[j]["val"].(float64)
	})
	if len(weekTrends) > 4 {
		weekTrends = weekTrends[:4]
	}

	recommendations := []fiber.Map{
		{"title": "Tindakan Diperlukan", "type": "warning", "description": fmt.Sprintf("%d sesi aktif membutuhkan tindak lanjut.", urgent)},
		{"title": "Insight Positif", "type": "positive", "description": fmt.Sprintf("%d%% sesi menunjukkan status stabil atau pemulihan.", stablePercentage)},
	}

	var notes []models.PsikologSessionNote
	qNotes := config.DB.Model(&models.PsikologSessionNote{}).
		Where("psikolog_id = ?", psikolog.ID)
	if prodiIDStr != "" || fakultasIDStr != "" {
		qNotes = qNotes.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			qNotes = qNotes.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			qNotes = qNotes.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	_ = qNotes.Order("sn.tanggal desc").Limit(3).Find(&notes).Error
	activities := []fiber.Map{}
	for _, note := range notes {
		activities = append(activities, fiber.Map{"title": "Sesi Baru Selesai", "description": note.Keluhan, "time": formatDate(note.Tanggal)})
	}

	return jsonOK(c, fiber.Map{
		"stats": []fiber.Map{
			{"label": "Total Pasien Unik", "value": patients, "trend": "", "isPositive": true},
			{"label": "Sesi Selesai", "value": sessions, "trend": "", "isPositive": true},
			{"label": "Sesi Aktif", "value": urgent, "trend": "", "isPositive": false},
		},
		"monthly":                 monthly,
		"top_issues":              topIssues,
		"week_trends":             weekTrends,
		"stable_percentage":       stablePercentage,
		"recommendations":         recommendations,
		"activities":              activities,
		"academic_count":          academicCount,
		"non_academic_count":      nonAcademicCount,
		"academic_percentage":     academicPercentage,
		"non_academic_percentage": nonAcademicPercentage,
		"daily_trends":            dailyTrends,
		"prodi_popularity":        prodiPopularity,
	})
}

func GetProdiList(c *fiber.Ctx) error {
	var prodis []models.ProgramStudi
	if err := config.DB.Preload("Fakultas").Order("nama asc").Find(&prodis).Error; err != nil {
		return err
	}
	items := make([]fiber.Map, 0, len(prodis))
	for _, p := range prodis {
		items = append(items, fiber.Map{
			"id":          p.ID,
			"nama":        p.Nama,
			"fakultas_id": p.FakultasID,
		})
	}
	return jsonOK(c, items)
}

func GetFakultasList(c *fiber.Ctx) error {
	var fakultas []models.Fakultas
	if err := config.DB.Order("nama asc").Find(&fakultas).Error; err != nil {
		return err
	}
	items := make([]fiber.Map, 0, len(fakultas))
	for _, f := range fakultas {
		items = append(items, fiber.Map{
			"id":   f.ID,
			"nama": f.Nama,
		})
	}
	return jsonOK(c, items)
}

func GetNotifications(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}
	var notifications []models.PsikologNotification
	if err := config.DB.Where("psikolog_id = ? AND user_id = ?", psikolog.ID, psikolog.UserID).Order("created_at desc").Find(&notifications).Error; err != nil {
		return err
	}
	items := make([]fiber.Map, 0, len(notifications))
	for _, notification := range notifications {
		items = append(items, fiber.Map{"id": notification.ID, "title": notification.Judul, "desc": notification.Deskripsi, "time": formatDate(notification.CreatedAt), "type": notification.Tipe, "unread": !notification.IsRead})
	}
	return jsonOK(c, items)
}

func MarkNotificationRead(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}
	if err := config.DB.Model(&models.PsikologNotification{}).Where("id = ? AND psikolog_id = ? AND user_id = ?", c.Params("id"), psikolog.ID, psikolog.UserID).Update("is_read", true).Error; err != nil {
		return err
	}
	return jsonOK(c, fiber.Map{"id": c.Params("id")})
}

func MarkAllNotificationsRead(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}
	if err := config.DB.Model(&models.PsikologNotification{}).Where("psikolog_id = ? AND user_id = ?", psikolog.ID, psikolog.UserID).Update("is_read", true).Error; err != nil {
		return err
	}
	return jsonOK(c, fiber.Map{"updated": true})
}

func DeleteNotification(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}
	if err := config.DB.Where("id = ? AND psikolog_id = ? AND user_id = ?", c.Params("id"), psikolog.ID, psikolog.UserID).Delete(&models.PsikologNotification{}).Error; err != nil {
		return err
	}
	return jsonOK(c, fiber.Map{"deleted": true, "id": c.Params("id")})
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func normalizeScheduleCategory(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "akademik":
		return "Akademik"
	case "karir":
		return "Karir"
	case "personal":
		return "Personal"
	default:
		return "Personal"
	}
}

// UpdatePatientStatus - Update status pasien (Aktif/Selesai/dll)
func UpdatePatientStatus(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	// Get student ID from params
	studentIDStr := c.Params("studentId")
	studentID, err := strconv.ParseUint(studentIDStr, 10, 32)
	if err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "ID mahasiswa tidak valid")
	}

	// Parse request body
	var body struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Format data tidak valid")
	}

	// Validate status
	validStatuses := []string{"Aktif", "Selesai", "Baru", "Stabil", "Pemulihan", "Membaik", "Perlu Perhatian"}
	isValid := false
	for _, status := range validStatuses {
		if body.Status == status {
			isValid = true
			break
		}
	}
	if !isValid {
		return fiber.NewError(fiber.StatusBadRequest, "Status tidak valid")
	}

	// Check if student exists
	var mahasiswa models.Mahasiswa
	if err := config.DB.First(&mahasiswa, uint(studentID)).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Mahasiswa tidak ditemukan")
	}

	// Check if psychologist has treated this student
	var existingBooking models.PsikologBooking
	if err := config.DB.Where("mahasiswa_id = ? AND psikolog_id = ?", uint(studentID), psikolog.ID).First(&existingBooking).Error; err != nil {
		return fiber.NewError(fiber.StatusForbidden, "Anda tidak memiliki akses untuk mengubah status pasien ini")
	}

	// Update the latest session note status
	var latestNote models.PsikologSessionNote
	if err := config.DB.Where("mahasiswa_id = ? AND psikolog_id = ?", uint(studentID), psikolog.ID).
		Order("tanggal desc").First(&latestNote).Error; err == nil {
		latestNote.StatusPasien = body.Status
		if body.Status == "Selesai" {
			latestNote.TindakLanjutTuntas = true
		}
		config.DB.Save(&latestNote)
	}

	// Create a status update note if notes provided
	if body.Notes != "" {
		siklus := latestNote.Siklus
		if siklus == 0 {
			siklus = 1
		}
		statusNote := models.PsikologSessionNote{
			PsikologID:   psikolog.ID,
			MahasiswaID:  uint(studentID),
			Tanggal:      time.Now(),
			Keluhan:      fmt.Sprintf("Update Status: %s", body.Status),
			Observasi:    body.Notes,
			Rekomendasi:  "Status pasien telah diperbarui",
			Mood:         "Netral",
			JenisSesi:    "Update Status",
			StatusPasien: body.Status,
			Siklus:       siklus,
			NomorSurat:   utils.GenerateDocumentNumber("Hasil Konseling"),
		}
		if body.Status == "Selesai" {
			statusNote.TindakLanjutTuntas = true
		}
		config.DB.Create(&statusNote)
	}

	if body.Status == "Selesai" {
		config.DB.Model(&models.PsikologBooking{}).
			Where("mahasiswa_id = ? AND psikolog_id = ? AND status IN ?", uint(studentID), psikolog.ID, []string{"Menunggu", "Dikonfirmasi"}).
			Update("status", "Selesai")
	}

	return jsonOK(c, fiber.Map{
		"message": "Status pasien berhasil diupdate",
		"status":  body.Status,
	})
}

func GetMedicalRecords(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var records []models.PsikologSessionNote
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").
		Where("psikolog_id = ?", psikolog.ID).Order("tanggal desc").Find(&records).Error; err != nil {
		return err
	}

	items := make([]fiber.Map, 0, len(records))
	for _, record := range records {
		tAsesmenStr := ""
		if record.TanggalAsesmen != nil {
			tAsesmenStr = record.TanggalAsesmen.Format("2006-01-02")
		}

		items = append(items, fiber.Map{
			"id":                     record.ID,
			"mahasiswa_id":           record.MahasiswaID,
			"mahasiswa_name":         record.Mahasiswa.Nama,
			"mahasiswa_nim":          record.Mahasiswa.NIM,
			"mahasiswa_prodi":        record.Mahasiswa.ProgramStudi.Nama,
			"mahasiswa_fakultas":     record.Mahasiswa.Fakultas.Nama,
			"date":                   formatDate(record.Tanggal),
			"time":                   record.Tanggal.Format("15:04"),
			"complaint":              record.Keluhan,
			"observation":            record.Observasi,
			"recommendation":         record.Rekomendasi,
			"mood":                   record.Mood,
			"type":                   record.JenisSesi,
			"status_pasien":          record.StatusPasien,
			"tujuan_pemeriksaan":     record.TujuanPemeriksaan,
			"tanggal_asesmen":        tAsesmenStr,
			"riwayat_keluhan":        record.RiwayatKeluhan,
			"aspek_kognitif":         record.AspekKognitif,
			"aspek_emosional":        record.AspekEmosional,
			"aspek_perilaku":         record.AspekPerilaku,
			"rekomendasi_mahasiswa":  record.RekomendasiMahasiswa,
			"rekomendasi_prodi":      record.RekomendasiProdi,
			"rekomendasi_orang_tua":  record.RekomendasiOrangTua,
			"tindak_lanjut_tuntas":   record.TindakLanjutTuntas,
			"tindak_lanjut_lanjutan": record.TindakLanjutLanjutan,
			"tindak_lanjut_rujuk":    record.TindakLanjutRujuk,
			"kesimpulan":             record.Kesimpulan,
			"siklus":                 record.Siklus,
		})
	}

	return jsonOK(c, items)
}

func UpdateSessionNote(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	noteID := c.Params("id")
	var record models.PsikologSessionNote
	if err := config.DB.Where("id = ? AND psikolog_id = ?", noteID, psikolog.ID).First(&record).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Catatan sesi tidak ditemukan")
	}

	var body struct {
		Complaint            string `json:"complaint"`
		Observation          string `json:"observation"`
		Recommendation       string `json:"recommendation"`
		Mood                 string `json:"mood"`
		TujuanPemeriksaan    string `json:"tujuan_pemeriksaan"`
		TanggalAsesmen       string `json:"tanggal_asesmen"`
		RiwayatKeluhan       string `json:"riwayat_keluhan"`
		AspekKognitif        string `json:"aspek_kognitif"`
		AspekEmosional       string `json:"aspek_emosional"`
		AspekPerilaku        string `json:"aspek_perilaku"`
		RekomendasiMahasiswa string `json:"rekomendasi_mahasiswa"`
		RekomendasiProdi     string `json:"rekomendasi_prodi"`
		RekomendasiOrangTua  string `json:"rekomendasi_orang_tua"`
		Kesimpulan           string `json:"kesimpulan"`
		TindakLanjutTuntas   bool   `json:"tindak_lanjut_tuntas"`
		TindakLanjutLanjutan bool   `json:"tindak_lanjut_lanjutan"`
		TindakLanjutRujuk    bool   `json:"tindak_lanjut_rujuk"`
		Status               string `json:"status"`
	}

	if err := c.BodyParser(&body); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Format data tidak valid")
	}

	var tAsesmen *time.Time
	if body.TanggalAsesmen != "" {
		if parsedTime, err := time.Parse("2006-01-02", body.TanggalAsesmen); err == nil {
			tAsesmen = &parsedTime
		}
	}

	record.Keluhan = body.Complaint
	record.Observasi = body.Observation
	record.Rekomendasi = body.Recommendation
	if body.Mood != "" {
		record.Mood = body.Mood
	}
	record.TujuanPemeriksaan = body.TujuanPemeriksaan
	if tAsesmen != nil {
		record.TanggalAsesmen = tAsesmen
	}
	record.RiwayatKeluhan = body.RiwayatKeluhan
	record.AspekKognitif = body.AspekKognitif
	record.AspekEmosional = body.AspekEmosional
	record.AspekPerilaku = body.AspekPerilaku
	record.RekomendasiMahasiswa = body.RekomendasiMahasiswa
	record.RekomendasiProdi = body.RekomendasiProdi
	record.RekomendasiOrangTua = body.RekomendasiOrangTua
	record.Kesimpulan = body.Kesimpulan
	record.TindakLanjutTuntas = body.TindakLanjutTuntas
	record.TindakLanjutLanjutan = body.TindakLanjutLanjutan
	record.TindakLanjutRujuk = body.TindakLanjutRujuk
	if body.Status != "" {
		record.StatusPasien = body.Status
	}

	if err := config.DB.Save(&record).Error; err != nil {
		return err
	}

	return jsonOK(c, fiber.Map{"message": "Catatan sesi berhasil diperbarui"})
}
