package mahasiswa

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

// ==================== HELPER ====================

// ==================== GET PROGRESS ====================

func GetProgress(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	// 1. Fetch All Stages with Materials and their Quizzes
	var tahaps []models.PkkmbTahap
	if err := config.DB.Order("\"order\" asc").Preload("Materis", func(db *gorm.DB) *gorm.DB {
		return db.Order("\"order\" asc")
	}).Preload("Materis.Quiz").Find(&tahaps).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data tahapan"})
	}

	// 2. Fetch All Quiz Attempts for this student
	var attempts []models.PkkmbQuizAttempt
	config.DB.Where("mahasiswa_id = ?", student.ID).Find(&attempts)

	// Map best score and status for each quiz
	type quizResult struct {
		BestScore float64
		Attempts  int
		Status    string
	}
	resultMap := make(map[uint]quizResult)
	for _, a := range attempts {
		res := resultMap[a.QuizID]
		res.Attempts++
		if a.Nilai > res.BestScore {
			res.BestScore = a.Nilai
		}
		if a.Nilai >= 70 { // Assuming 70 is passing grade
			res.Status = "lulus"
		} else if res.Status != "lulus" {
			res.Status = "tidak_lulus"
		}
		resultMap[a.QuizID] = res
	}

	// 3. Build Hierarchical Response
	totalKuis := 0
	kuisSelesai := 0
	nilaiTotal := 0.0

	type QuizInfo struct {
		KuisID        uint    `json:"kuis_id"`
		Status        string  `json:"status"`
		NilaiTerbaik  float64 `json:"nilai_terbaik"`
		BobotPersen   int     `json:"bobot_persen"`
		JumlahAttempt int     `json:"jumlah_attempt"`
		JudulKuis     string  `json:"judul_kuis"`
	}

	type MateriInfo struct {
		MateriID  uint      `json:"materi_id"`
		Judul     string    `json:"judul"`
		Tipe      string    `json:"tipe"`
		FileURL   string    `json:"file_url"`
		Deskripsi string    `json:"deskripsi"`
		Kuis      *QuizInfo `json:"kuis"`
	}

	type TahapInfo struct {
		TahapID        uint         `json:"tahap_id"`
		Label          string       `json:"label"`
		Status         string       `json:"status"`
		TanggalMulai   time.Time    `json:"tanggal_mulai"`
		TanggalSelesai time.Time    `json:"tanggal_selesai"`
		TotalKuis      int          `json:"total_kuis"`
		KuisSelesai    int          `json:"kuis_selesai"`
		Materis        []MateriInfo `json:"materis"`
	}

	var stages []TahapInfo
	for _, t := range tahaps {
		tTotal := 0
		tSelesai := 0
		var mInfos []MateriInfo

		for _, m := range t.Materis {
			var qInfo *QuizInfo
			if m.Quiz != nil {
				tTotal++
				totalKuis++
				res := resultMap[m.Quiz.ID]

				status := "belum_dikerjakan"
				if res.Attempts > 0 {
					status = res.Status
					if status == "lulus" {
						tSelesai++
						kuisSelesai++
						nilaiTotal += (res.BestScore * float64(m.Quiz.Bobot) / 100)
					}
				}

				qInfo = &QuizInfo{
					KuisID:        m.Quiz.ID,
					Status:        status,
					NilaiTerbaik:  res.BestScore,
					BobotPersen:   m.Quiz.Bobot,
					JumlahAttempt: res.Attempts,
					JudulKuis:     m.Quiz.Judul,
				}
			}

			mInfos = append(mInfos, MateriInfo{
				MateriID:  m.ID,
				Judul:     m.Judul,
				Tipe:      m.Tipe,
				FileURL:   m.FileURL,
				Deskripsi: m.Deskripsi,
				Kuis:      qInfo,
			})
		}

		// Determine stage status
		tahapStatus := t.Status
		if tSelesai == tTotal && tTotal > 0 {
			tahapStatus = "selesai"
		} else if tSelesai > 0 {
			tahapStatus = "berlangsung"
		}

		stages = append(stages, TahapInfo{
			TahapID:        t.ID,
			Label:          t.Label,
			Status:         tahapStatus,
			TanggalMulai:   t.TanggalMulai,
			TanggalSelesai: t.TanggalSelesai,
			TotalKuis:      tTotal,
			KuisSelesai:    tSelesai,
			Materis:        mInfos,
		})
	}

	// Overall status
	statusKeseluruhan := "belum_mulai"
	if kuisSelesai == totalKuis && totalKuis > 0 {
		statusKeseluruhan = "lulus"
	} else if kuisSelesai > 0 {
		statusKeseluruhan = "berlangsung"
	}

	// Check if certificate exists
	var countSertif int64
	config.DB.Model(&models.PkkmbSertifikat{}).Where("mahasiswa_id = ?", student.ID).Count(&countSertif)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"nilai_kumulatif":     nilaiTotal,
			"status_keseluruhan":  statusKeseluruhan,
			"total_kuis":          totalKuis,
			"kuis_selesai":        kuisSelesai,
			"tahaps":              stages,
			"has_sertifikat":      countSertif > 0,
			"eligible_sertifikat": statusKeseluruhan == "lulus",
		},
	})
}

// CheckIn handles student check-in for a PKKMB event
func CheckIn(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	kegiatanID, _ := c.ParamsInt("id")

	var kegiatan models.PkkmbKegiatan
	config.DB.First(&kegiatan, kegiatanID)

	var pg models.PkkmbProgress
	if err := config.DB.Where("mahasiswa_id = ? AND kegiatan_id = ?", student.ID, kegiatanID).First(&pg).Error; err != nil {
		pg = models.PkkmbProgress{
			MahasiswaID: student.ID,
			KegiatanID:  uint(kegiatanID),
			Status:      "Hadir",
		}
		config.DB.Create(&pg)
	} else {
		pg.Status = "Hadir"
		config.DB.Save(&pg)
	}

	logActivity(c, "kencana", "Check-in kegiatan PKKMB: "+kegiatan.Judul)
	return c.JSON(fiber.Map{"success": true, "message": "Berhasil check-in kegiatan"})
}

// GetSertifikat retrieves certificate if graduated
func GetSertifikat(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var sertif models.PkkmbSertifikat
	if err := config.DB.Where("mahasiswa_id = ?", student.ID).First(&sertif).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Sertifikat belum tersedia"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"has_sertifikat": true,
			"eligible":       true,
			"file_url":       sertif.FileURL,
			"nomor":          sertif.ID,
		},
	})
}

// SubmitBanding handles graduation appeal
func SubmitBanding(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	type BandingReq struct {
		Alasan string `json:"alasan"`
	}
	var req BandingReq
	c.BodyParser(&req)

	banding := models.PkkmbBanding{
		MahasiswaID: student.ID,
		Alasan:      req.Alasan,
		Status:      "Menunggu",
	}

	if err := config.DB.Create(&banding).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengajukan banding"})
	}

	// Trigger Notification
	notifikasi.Kirim(config.DB, notifikasi.KirimParams{
		UserID:  student.PenggunaID,
		Type:    "info",
		Title:   "Banding PKKMB",
		Content: "Pengajuan banding kelulusan PKKMB kamu telah diterima dan sedang diproses.",
	})

	logActivity(c, "kencana", "Mengajukan banding PKKMB")
	return c.JSON(fiber.Map{"success": true, "message": "Banding berhasil diajukan"})
}

func GetBandingList(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var list []models.PkkmbBanding
	if err := config.DB.Where("mahasiswa_id = ?", student.ID).Order("created_at desc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data banding"})
	}

	return c.JSON(fiber.Map{"success": true, "data": list})
}

func GenerateSertifikat(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var existing models.PkkmbSertifikat
	if err := config.DB.Where("mahasiswa_id = ?", student.ID).First(&existing).Error; err == nil {
		return c.JSON(fiber.Map{"success": true, "data": existing})
	}

	newCert := models.PkkmbSertifikat{
		MahasiswaID:   student.ID,
		FileURL:       "/uploads/sertifikat/pkkmb-demo.pdf",
		TanggalTerbit: time.Now(),
	}
	if err := config.DB.Create(&newCert).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat sertifikat"})
	}

	logActivity(c, "kencana", "Generate sertifikat PKKMB")
	return c.JSON(fiber.Map{"success": true, "data": newCert})
}

// GetKuisSoal mengambil soal kuis dari DB (tanpa kunci jawaban)
func GetKuisSoal(c *fiber.Ctx) error {
	kuisID := c.Params("id")

	var quiz models.PkkmbQuiz
	if err := config.DB.
		Preload("Questions", func(db *gorm.DB) *gorm.DB {
			return db.Order("\"order\" asc")
		}).
		Preload("Questions.Options", func(db *gorm.DB) *gorm.DB {
			return db.Order("\"order\" asc")
		}).
		First(&quiz, kuisID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kuis tidak ditemukan"})
	}

	// Sembunyikan is_benar dari setiap opsi agar tidak bocor ke client
	type SafeOption struct {
		ID   uint   `json:"id"`
		Opsi string `json:"opsi"`
	}
	type SafeSoal struct {
		ID         uint         `json:"id"`
		Pertanyaan string       `json:"pertanyaan"`
		Tipe       string       `json:"tipe"`
		Point      int          `json:"point"`
		Options    []SafeOption `json:"options"`
	}

	var soalList []SafeSoal
	for _, q := range quiz.Questions {
		var opts []SafeOption
		for _, o := range q.Options {
			opts = append(opts, SafeOption{ID: o.ID, Opsi: o.Opsi})
		}
		soalList = append(soalList, SafeSoal{
			ID:         q.ID,
			Pertanyaan: q.Pertanyaan,
			Tipe:       q.Tipe,
			Point:      q.Point,
			Options:    opts,
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"kuis_id":       quiz.ID,
			"judul":         quiz.Judul,
			"deskripsi":     quiz.Deskripsi,
			"durasi_menit":  quiz.Durasi,
			"bobot_persen":  quiz.Bobot,
			"passing_grade": 70,
			"total_soal":    len(soalList),
			"soal":          soalList,
		},
	})
}

// SubmitKuis memproses jawaban, menghitung skor, menyimpan attempt, dan kirim notifikasi jika lulus
func SubmitKuis(c *fiber.Ctx) error {
	kuisID := c.Params("id")

	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	// Ambil kuis + soal + opsi benar
	var quiz models.PkkmbQuiz
	if err := config.DB.
		Preload("Questions.Options").
		First(&quiz, kuisID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kuis tidak ditemukan"})
	}

	// Cek batas attempt
	var jumlahAttempt int64
	config.DB.Model(&models.PkkmbQuizAttempt{}).
		Where("mahasiswa_id = ? AND quiz_id = ?", student.ID, quiz.ID).
		Count(&jumlahAttempt)

	// Parse jawaban: map[question_id] -> option_id
	var req struct {
		Jawaban map[string]uint `json:"jawaban"` // {"soal_id": opsi_id}
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format jawaban tidak valid"})
	}

	// Hitung skor
	totalPoint := 0
	benarPoint := 0
	jumlahBenar := 0

	for _, q := range quiz.Questions {
		totalPoint += q.Point
		selectedID, answered := req.Jawaban[fmt.Sprintf("%d", q.ID)]
		if !answered {
			continue
		}
		for _, opt := range q.Options {
			if opt.ID == selectedID && opt.IsBenar {
				benarPoint += q.Point
				jumlahBenar++
				break
			}
		}
	}

	var nilai float64
	if totalPoint > 0 {
		nilai = float64(benarPoint) / float64(totalPoint) * 100
	}

	// Simpan attempt
	now := time.Now().UTC()
	attempt := models.PkkmbQuizAttempt{
		MahasiswaID:  student.ID,
		QuizID:       quiz.ID,
		Nilai:        nilai,
		Status:       "Selesai",
		WaktuMulai:   now.Add(-time.Minute * time.Duration(quiz.Durasi)),
		WaktuSelesai: &now,
	}
	config.DB.Create(&attempt)

	// Hitung nilai kumulatif terbaru
	var allAttempts []models.PkkmbQuizAttempt
	config.DB.Where("mahasiswa_id = ?", student.ID).Find(&allAttempts)
	bestMap := make(map[uint]float64)
	for _, a := range allAttempts {
		if a.Nilai > bestMap[a.QuizID] {
			bestMap[a.QuizID] = a.Nilai
		}
	}
	var nilaiKumulatif float64
	for _, v := range bestMap {
		nilaiKumulatif += v
	}
	if len(bestMap) > 0 {
		nilaiKumulatif = nilaiKumulatif / float64(len(bestMap))
	}

	lulus := nilai >= 70
	eligibleSertifikat := nilaiKumulatif >= 70 && len(bestMap) > 0

	// Kirim notifikasi berdasarkan hasil kuis
	if lulus {
		notifikasi.Kirim(config.DB, notifikasi.KirimParams{
			MahasiswaID: student.ID,
			Type:        "kencana",
			Title:       "Selamat! Kuis Lulus 🎉",
			Content:     fmt.Sprintf("Kamu lulus kuis \"%s\" dengan nilai %.0f. Terus semangat!", quiz.Judul, nilai),
			Link:        "/student/kencana",
		})
		// Notif tambahan jika sudah eligible sertifikat
		if eligibleSertifikat {
			notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				MahasiswaID: student.ID,
				Type:        "kencana",
				Title:       "🏆 Selamat, Kamu Lulus PKKMB!",
				Content:     fmt.Sprintf("Nilai kumulatif kamu %.1f. Kamu sekarang bisa mengunduh sertifikat kelulusan PKKMB Kencana!", nilaiKumulatif),
				Link:        "/student/kencana",
			})
		}
	} else {
		notifikasi.Kirim(config.DB, notifikasi.KirimParams{
			MahasiswaID: student.ID,
			Type:        "kencana",
			Title:       "📝 Kuis Belum Lulus",
			Content:     fmt.Sprintf("Nilai kuis \"%s\" kamu %.0f (minimal 70). Jangan menyerah, kamu bisa coba lagi!", quiz.Judul, nilai),
			Link:        "/student/kencana",
		})
	}

	logActivity(c, "kencana", fmt.Sprintf("Submit kuis: %s (nilai: %.0f, lulus: %v)", quiz.Judul, nilai, lulus))

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"nilai":                   nilai,
			"lulus":                   lulus,
			"jumlah_benar":            jumlahBenar,
			"total_soal":              len(quiz.Questions),
			"nilai_kumulatif_terbaru": nilaiKumulatif,
			"eligible_sertifikat":     eligibleSertifikat,
			"jumlah_attempt":          jumlahAttempt + 1,
		},
	})
}

func GetPkkmbKegiatan(c *fiber.Ctx) error {
	var k []models.PkkmbKegiatan
	if err := config.DB.Order("tanggal asc").Find(&k).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data kegiatan PKKMB"})
	}
	return c.JSON(fiber.Map{"success": true, "data": k})
}
