package ormawa

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"gorm.io/gorm"
)

type quizOptionPayload struct {
	Opsi    string `json:"opsi"`
	IsBenar bool   `json:"is_benar"`
}

type quizQuestionPayload struct {
	Pertanyaan string              `json:"pertanyaan"`
	Tipe       string              `json:"tipe"`
	Point      int                 `json:"point"`
	Options    []quizOptionPayload `json:"options"`
}

type quizPayload struct {
	MateriID  uint                  `json:"materi_id"`
	Judul     string                `json:"judul"`
	Deskripsi string                `json:"deskripsi"`
	Durasi    int                   `json:"durasi"`
	IsActive  *bool                 `json:"is_active"`
	Bobot     int                   `json:"bobot_persen"`
	Questions []quizQuestionPayload `json:"questions"`
}

func AmbilDaftarKuis(c *fiber.Ctx) error {
	var kuis []models.PkkmbQuiz
	config.DB.Preload("Questions.Options").Order("created_at desc").Find(&kuis)
	return c.JSON(fiber.Map{"status": "success", "data": kuis})
}

func TambahKuis(c *fiber.Ctx) error {
	var payload quizPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Gagal memproses data"})
	}
	payload.Judul = strings.TrimSpace(payload.Judul)
	if payload.Judul == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Judul kuis wajib diisi"})
	}
	if payload.Durasi <= 0 {
		payload.Durasi = 30
	}
	if payload.Bobot <= 0 {
		payload.Bobot = 10
	}

	materiID := payload.MateriID
	if materiID == 0 {
		resolved, err := ensureDefaultMateriID()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyiapkan materi default: " + err.Error()})
		}
		materiID = resolved
	}

	isActive := true
	if payload.IsActive != nil {
		isActive = *payload.IsActive
	}

	kuis := models.PkkmbQuiz{
		MateriID:  materiID,
		Judul:     payload.Judul,
		Deskripsi: payload.Deskripsi,
		Durasi:    payload.Durasi,
		IsActive:  isActive,
		Bobot:     payload.Bobot,
	}

	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&kuis).Error; err != nil {
			return err
		}
		for _, q := range payload.Questions {
			question := models.PkkmbQuizQuestion{
				QuizID:     kuis.ID,
				Pertanyaan: strings.TrimSpace(q.Pertanyaan),
				Tipe:       q.Tipe,
				Point:      q.Point,
			}
			if question.Pertanyaan == "" {
				continue
			}
			if question.Tipe == "" {
				question.Tipe = "multiple_choice"
			}
			if question.Point <= 0 {
				question.Point = 10
			}
			if err := tx.Create(&question).Error; err != nil {
				return err
			}
			for _, o := range q.Options {
				opt := models.PkkmbQuizOption{QuestionID: question.ID, Opsi: strings.TrimSpace(o.Opsi), IsBenar: o.IsBenar}
				if opt.Opsi == "" {
					continue
				}
				if err := tx.Create(&opt).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan kuis: " + err.Error()})
	}

	config.DB.Preload("Questions.Options").First(&kuis, kuis.ID)

	// Broadcast notifikasi ke semua mahasiswa aktif
	go func() {
		var mahasiswaList []models.Mahasiswa
		config.DB.Where("status_akun = ?", "Aktif").Select("id, pengguna_id").Find(&mahasiswaList)
		for _, mhs := range mahasiswaList {
			_ = notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				UserID:  mhs.PenggunaID,
				Type:    "kencana",
				Title:   "📚 Kuis PKKMB Baru Tersedia!",
				Content: "Kuis baru \"" + kuis.Judul + "\" telah ditambahkan. Segera kerjakan agar tidak tertinggal!",
				Link:    "/student/kencana",
			})
		}
	}()

	return c.Status(201).JSON(fiber.Map{"status": "success", "data": kuis})
}

func UpdateKuis(c *fiber.Ctx) error {
	id := c.Params("id")
	var kuis models.PkkmbQuiz
	if err := config.DB.First(&kuis, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Kuis tidak ditemukan"})
	}

	var payload quizPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}
	payload.Judul = strings.TrimSpace(payload.Judul)
	if payload.Judul == "" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Judul kuis wajib diisi"})
	}
	if payload.Durasi <= 0 {
		payload.Durasi = kuis.Durasi
		if payload.Durasi <= 0 {
			payload.Durasi = 30
		}
	}
	if payload.Bobot <= 0 {
		payload.Bobot = kuis.Bobot
		if payload.Bobot <= 0 {
			payload.Bobot = 10
		}
	}

	materiID := payload.MateriID
	if materiID == 0 {
		materiID = kuis.MateriID
	}
	if materiID == 0 {
		resolved, err := ensureDefaultMateriID()
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyiapkan materi default: " + err.Error()})
		}
		materiID = resolved
	}

	isActive := kuis.IsActive
	if payload.IsActive != nil {
		isActive = *payload.IsActive
	}

	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&kuis).Updates(map[string]interface{}{
			"materi_id": materiID,
			"judul":     payload.Judul,
			"deskripsi": payload.Deskripsi,
			"durasi":    payload.Durasi,
			"is_active": isActive,
			"bobot":     payload.Bobot,
		}).Error; err != nil {
			return err
		}

		sub := tx.Model(&models.PkkmbQuizQuestion{}).Select("id").Where("quiz_id = ?", kuis.ID)
		if err := tx.Where("question_id IN (?)", sub).Delete(&models.PkkmbQuizOption{}).Error; err != nil {
			return err
		}
		if err := tx.Where("quiz_id = ?", kuis.ID).Delete(&models.PkkmbQuizQuestion{}).Error; err != nil {
			return err
		}

		for _, q := range payload.Questions {
			question := models.PkkmbQuizQuestion{
				QuizID:     kuis.ID,
				Pertanyaan: strings.TrimSpace(q.Pertanyaan),
				Tipe:       q.Tipe,
				Point:      q.Point,
			}
			if question.Pertanyaan == "" {
				continue
			}
			if question.Tipe == "" {
				question.Tipe = "multiple_choice"
			}
			if question.Point <= 0 {
				question.Point = 10
			}
			if err := tx.Create(&question).Error; err != nil {
				return err
			}
			for _, o := range q.Options {
				opt := models.PkkmbQuizOption{QuestionID: question.ID, Opsi: strings.TrimSpace(o.Opsi), IsBenar: o.IsBenar}
				if opt.Opsi == "" {
					continue
				}
				if err := tx.Create(&opt).Error; err != nil {
					return err
				}
			}
		}
		return nil
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui kuis: " + err.Error()})
	}

	config.DB.Preload("Questions.Options").First(&kuis, kuis.ID)
	return c.JSON(fiber.Map{"status": "success", "data": kuis})
}

func HapusKuis(c *fiber.Ctx) error {
	id := c.Params("id")
	if err := config.DB.Unscoped().Delete(&models.PkkmbQuiz{}, id).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus kuis"})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Kuis berhasil dihapus"})
}

func AmbilHasilKuis(c *fiber.Ctx) error {
	var attempts []models.PkkmbQuizAttempt
	config.DB.Preload("Mahasiswa").Preload("Quiz").Find(&attempts)
	return c.JSON(fiber.Map{"status": "success", "data": attempts})
}

func ensureDefaultMateriID() (uint, error) {
	var materi models.PkkmbMateri
	if err := config.DB.Order("id asc").First(&materi).Error; err == nil {
		return materi.ID, nil
	}

	var tahap models.PkkmbTahap
	if err := config.DB.Order("id asc").First(&tahap).Error; err != nil {
		tahap = models.PkkmbTahap{
			Label:          "Tahap Umum",
			Status:         "berlangsung",
			TanggalMulai:   time.Now(),
			TanggalSelesai: time.Now().AddDate(0, 0, 30),
			Order:          1,
		}
		if err := config.DB.Create(&tahap).Error; err != nil {
			return 0, err
		}
	}

	materi = models.PkkmbMateri{
		TahapID:   tahap.ID,
		Judul:     "Materi Umum PKKMB",
		Tipe:      "PDF",
		FileURL:   "",
		Deskripsi: "Materi default untuk kuis PKKMB",
		Order:     1,
	}
	if err := config.DB.Create(&materi).Error; err != nil {
		return 0, fmt.Errorf("create default materi failed: %w", err)
	}

	return materi.ID, nil
}
