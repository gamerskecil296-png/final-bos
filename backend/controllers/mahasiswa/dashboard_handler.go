package mahasiswa

import (
	"siakad-backend/config"
	"siakad-backend/models"
	"sort"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

type DeadlineItem struct {
	Tipe     string    `json:"tipe"`
	Nama     string    `json:"nama"`
	Tanggal  time.Time `json:"tanggal"`
	SisaHari int       `json:"sisa_hari"`
	Link     string    `json:"link"`
}

type Event struct {
	Tanggal   time.Time `json:"tanggal"`
	Judul     string    `json:"judul"`
	Kategori  string    `json:"kategori"`
	Lokasi    string    `json:"lokasi,omitempty"`
	Deskripsi string    `json:"deskripsi,omitempty"`
}

func firstWordOrDefault(s string, fallback string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return fallback
	}
	parts := strings.Fields(s)
	if len(parts) == 0 {
		return fallback
	}
	return parts[0]
}

func getEventsForMonth(student *models.Mahasiswa, bulan int, tahun int) []Event {
	startOfMonth := time.Date(tahun, time.Month(bulan), 1, 0, 0, 0, 0, time.Local)
	endOfMonth := startOfMonth.AddDate(0, 1, -1).Add(23*time.Hour + 59*time.Minute)

	var events []Event

	// 1. Deadline Beasiswa
	var beasiswas []models.Beasiswa
	config.DB.Where("deadline BETWEEN ? AND ?", startOfMonth, endOfMonth).Find(&beasiswas)
	for _, b := range beasiswas {
		events = append(events, Event{Tanggal: b.Deadline, Judul: "Deadline: " + b.Nama, Kategori: "beasiswa", Deskripsi: b.Deskripsi})
	}

	// 2. Counseling Bookings
	var bookings []models.Konseling
	config.DB.Where("mahasiswa_id = ? AND status = ?", student.ID, "Dikonfirmasi").Find(&bookings)
	for _, b := range bookings {
		if b.Tanggal.After(startOfMonth) && b.Tanggal.Before(endOfMonth) {
			events = append(events, Event{Tanggal: b.Tanggal, Judul: "Konseling: " + b.Topik, Kategori: "konseling", Deskripsi: b.Catatan})
		}
	}

	// 3. PKKMB Activities
	var pkkmbKeg []models.PkkmbKegiatan
	config.DB.Where("tanggal BETWEEN ? AND ?", startOfMonth, endOfMonth).Find(&pkkmbKeg)
	for _, k := range pkkmbKeg {
		events = append(events, Event{Tanggal: k.Tanggal, Judul: "PKKMB: " + k.Judul, Kategori: "pkkmb", Deskripsi: k.Deskripsi, Lokasi: k.Lokasi})
	}

	// 4. Ormawa Events (semua event ormawa di bulan ini)
	var ormawaEvents []models.OrmawaKegiatan
	config.DB.Where("((tanggal_mulai BETWEEN ? AND ?) OR (tanggal_selesai BETWEEN ? AND ?) OR (tanggal_mulai <= ? AND tanggal_selesai >= ?))",
		startOfMonth, endOfMonth, startOfMonth, endOfMonth, startOfMonth, endOfMonth).Find(&ormawaEvents)
	for _, e := range ormawaEvents {
		events = append(events, Event{Tanggal: e.TanggalMulai, Judul: "Event: " + e.Judul, Kategori: "organisasi", Deskripsi: e.Deskripsi, Lokasi: e.Lokasi})
	}

	// 5. Mass Health Screening Events
	var massalEvents []models.PemeriksaanMassal
	config.DB.Where("(tanggal_mulai BETWEEN ? AND ?) OR (tanggal_selesai BETWEEN ? AND ?)",
		startOfMonth, endOfMonth, startOfMonth, endOfMonth).Find(&massalEvents)
	for _, e := range massalEvents {
		events = append(events, Event{Tanggal: e.TanggalMulai, Judul: "Kesehatan: " + e.NamaEvent, Kategori: "kesehatan"})
	}

	// 6. Kencana Stages
	var stages []models.KencanaStage
	config.DB.Where("is_published = ? AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?))",
		true, startOfMonth, endOfMonth, startOfMonth, endOfMonth, startOfMonth, endOfMonth).Find(&stages)
	for _, s := range stages {
		tanggal := time.Now()
		if s.StartDate != nil {
			tanggal = *s.StartDate
		}
		events = append(events, Event{Tanggal: tanggal, Judul: "Tahap PKKMB: " + s.Name, Kategori: "kencana"})
	}

	// 7. Kencana Sessions
	var sessions []models.KencanaSession
	config.DB.Where("is_published = ? AND ((start_date BETWEEN ? AND ?) OR (end_date BETWEEN ? AND ?) OR (start_date <= ? AND end_date >= ?))",
		true, startOfMonth, endOfMonth, startOfMonth, endOfMonth, startOfMonth, endOfMonth).Find(&sessions)
	for _, s := range sessions {
		tanggal := time.Now()
		if s.StartDate != nil {
			tanggal = *s.StartDate
		}
		events = append(events, Event{Tanggal: tanggal, Judul: "Sesi PKKMB: " + s.Title, Kategori: "kencana"})
	}

	return events
}

func GetDashboard(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	// Preload ProgramStudi
	if student.ProgramStudi.ID == 0 && student.ProgramStudiID != 0 {
		config.DB.Model(student).Association("ProgramStudi").Find(&student.ProgramStudi)
	}
	PenggunaID := student.PenggunaID

	// 2. Banner / Latest News
	var news models.Berita
	config.DB.Order("tanggal_publish desc").First(&news)

	// 3. PKKMB (Formerly KENCANA) Stats
	var kencanaScore models.KencanaScore
	config.DB.Where("student_id = ?", student.ID).Order("created_at desc").First(&kencanaScore)

	pkkmbStatus := "Belum Dimulai"
	pkkmbPersentase := 0.0
	totalPkkmb := int64(1)
	selesaiPkkmb := int64(0)

	if kencanaScore.ID != 0 {
		pkkmbPersentase = kencanaScore.FinalScore
		selesaiPkkmb = 1 // Mark as started
		if kencanaScore.GraduationStatus == "lulus" || kencanaScore.GraduationStatus == "lulus_bersyarat" {
			pkkmbStatus = "Selesai ✓"
		} else {
			pkkmbStatus = "Sedang Berlangsung"
		}
	}

	// 4. Beasiswa Stats
	var countBeasiswaProses int64
	var countBeasiswaMenunggu int64
	var countBeasiswaTersedia int64
	config.DB.Model(&models.BeasiswaPendaftaran{}).Where("mahasiswa_id = ? AND status NOT IN (?, ?)", student.ID, "Diterima", "Ditolak").Count(&countBeasiswaProses)
	config.DB.Model(&models.BeasiswaPendaftaran{}).Where("mahasiswa_id = ? AND status IN (?, ?)", student.ID, "Menunggu", "Diajukan").Count(&countBeasiswaMenunggu)
	config.DB.Model(&models.Beasiswa{}).Where("deadline > ?", time.Now()).Count(&countBeasiswaTersedia)

	// 5. Student Voice (Aspirasi) Stats
	var countAspirasiAktif int64
	var countAspirasiBelumRespons int64
	config.DB.Model(&models.Aspirasi{}).Where("mahasiswa_id = ? AND status != ?", student.ID, "selesai").Count(&countAspirasiAktif)
	config.DB.Model(&models.Aspirasi{}).Where("mahasiswa_id = ? AND respon = ?", student.ID, "").Count(&countAspirasiBelumRespons)

	// 6. Aggregated Deadlines (Next 14 Days)
	var deadlines []DeadlineItem
	now := time.Now().UTC()
	fourteenDaysLater := now.AddDate(0, 0, 14)

	// Beasiswa Deadlines
	var activeBeasiswa []models.Beasiswa
	config.DB.Where("deadline BETWEEN ? AND ?", now, fourteenDaysLater).Find(&activeBeasiswa)
	for _, b := range activeBeasiswa {
		deadlines = append(deadlines, DeadlineItem{
			Tipe:     "beasiswa",
			Nama:     "Deadline " + b.Nama,
			Tanggal:  b.Deadline,
			SisaHari: int(b.Deadline.Sub(now).Hours() / 24),
			Link:     "/student/scholarship",
		})
	}

	// Counseling Sessions
	var myBookings []models.Konseling
	config.DB.Where("mahasiswa_id = ? AND status = ? AND tanggal BETWEEN ? AND ?", student.ID, "Dikonfirmasi", now, fourteenDaysLater).Find(&myBookings)
	for _, bk := range myBookings {
		deadlines = append(deadlines, DeadlineItem{
			Tipe:     "konseling",
			Nama:     "Sesi Konseling: " + bk.Topik,
			Tanggal:  bk.Tanggal,
			SisaHari: int(bk.Tanggal.Sub(now).Hours() / 24),
			Link:     "/student/counseling",
		})
	}

	// Sort deadlines by date
	sort.Slice(deadlines, func(i, j int) bool {
		return deadlines[i].Tanggal.Before(deadlines[j].Tanggal)
	})
	if len(deadlines) > 3 {
		deadlines = deadlines[:3]
	}

	// 7. Recent Activity (Last 5)
	var activities []models.LogAktivitas
	config.DB.Where("user_id = ?", PenggunaID).Order("created_at desc").Limit(5).Find(&activities)

	// 8. Recent Berita
	var rawBerita []models.Berita
	config.DB.Order("tanggal_publish desc").Limit(3).Find(&rawBerita)
	var recentNews []fiber.Map
	for _, b := range rawBerita {
		isiSingkat := b.Isi
		if len([]rune(isiSingkat)) > 150 {
			isiSingkat = string([]rune(isiSingkat)[:150]) + "..."
		}
		recentNews = append(recentNews, fiber.Map{
			"id":          b.ID,
			"judul":       b.Judul,
			"isi":         b.Isi,
			"isi_singkat": isiSingkat,
			"gambar_url":  b.GambarURL,
			"kategori":    b.Kategori,
			"tanggal":     b.TanggalPublish,
			"link":        "/student/notifikasi",
		})
	}

	// 10. Contextual Greeting Logic
	pesan := "Semangat menjalani hari ini! Ada yang bisa kami bantu?"
	link := ""

	// Priority 1: PKKMB
	if selesaiPkkmb < totalPkkmb && totalPkkmb > 0 {
		pesan = "Kamu masih memiliki modul PKKMB yang belum diselesaikan. Yuk lanjutkan! →"
		link = "/student/kencana"
	} else if len(deadlines) > 0 {
		for _, d := range deadlines {
			if d.Tipe == "beasiswa" && d.SisaHari < 7 {
				pesan = "⚠️ " + d.Nama + " akan ditutup dalam " + strings.TrimSpace(strings.Repeat(" ", 1)) + " hari. Segera daftar! →"
				link = "/student/scholarship"
				break
			}
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"mahasiswa": fiber.Map{
				"id":          student.ID,
				"nim":         student.NIM,
				"nama":        student.Nama,
				"nama_depan":  firstWordOrDefault(student.Nama, "Mahasiswa"),
				"prodi":       student.ProgramStudi.Nama,
				"semester":    student.SemesterSekarang,
				"tahun_masuk": student.TahunMasuk,
				"jalur_masuk": student.JalurMasuk,
				"foto_url":    student.FotoURL,
				"status":      student.StatusAkun,
			},
			"banner_pinned": fiber.Map{
				"aktif": news.ID != 0,
				"id":    news.ID,
				"pesan": news.Judul,
				"link":  "/student/news",
			},
			"kencana": fiber.Map{
				"total_modul":   totalPkkmb,
				"modul_selesai": selesaiPkkmb,
				"persentase":    pkkmbPersentase,
				"status":        pkkmbStatus,
			},
			"beasiswa": fiber.Map{
				"jumlah_proses":   countBeasiswaProses,
				"jumlah_menunggu": countBeasiswaMenunggu,
				"total_tersedia":  countBeasiswaTersedia,
			},
			"student_voice": fiber.Map{
				"jumlah_aktif":           countAspirasiAktif,
				"jumlah_belum_direspons": countAspirasiBelumRespons,
			},
			"deadlines":          deadlines,
			"aktivitas_terbaru":  activities,
			"pengumuman":         recentNews,
			"pesan_kontekstual":  pesan,
			"link_kontekstual":   link,
			"kegiatan_bulan_ini": getEventsForMonth(student, int(now.Month()), now.Year()),
		},
	})
}

func GetKegiatan(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	bulan := c.QueryInt("bulan", int(time.Now().Month()))
	tahun := c.QueryInt("tahun", time.Now().Year())

	events := getEventsForMonth(student, bulan, tahun)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    events,
	})
}
