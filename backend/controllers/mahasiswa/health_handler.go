package mahasiswa

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
)

func parseTanggal(input ...string) time.Time {
	for _, raw := range input {
		v := strings.TrimSpace(raw)
		if v == "" {
			continue
		}
		if t, err := time.Parse(time.RFC3339, v); err == nil {
			return t
		}
		if t, err := time.Parse("2006-01-02", v); err == nil {
			return t
		}
	}
	return time.Now()
}

func buildStatusKesehatan(sistolik int, diastolik int, bmi float64) string {
	if sistolik >= 140 || diastolik >= 90 || bmi >= 30 {
		return "tindak_lanjut"
	}
	if sistolik >= 120 || diastolik >= 80 || bmi >= 25 || bmi < 18.5 {
		return "pantauan"
	}
	return "sehat"
}

func buildHasil(status string) string {
	switch status {
	case "tindak_lanjut":
		return "Perlu Perhatian"
	case "pantauan":
		return "Pantauan"
	default:
		return "Sehat"
	}
}

// GetHealthRiwayat returns all health screenings
func GetHealthRiwayat(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	sumber := c.Query("sumber")

	var histories []models.Kesehatan
	query := config.DB.Where("mahasiswa_id = ?", student.ID)
	if sumber != "" && sumber != "Semua" {
		query = query.Where("sumber = ?", sumber)
	}

	err = query.Order("created_at DESC").Find(&histories).Error
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil riwayat kesehatan"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    histories,
	})
}

// CreateHealthRecord handles new health input
func CreateHealthRecord(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	type Input struct {
		Tanggal          string  `json:"tanggal"`
		TanggalPeriksa   string  `json:"tanggal_periksa"`
		JenisPemeriksaan string  `json:"jenis_pemeriksaan"`
		Hasil            string  `json:"hasil"`
		Catatan          string  `json:"catatan"`
		Keluhan          string  `json:"keluhan"`
		TinggiBadan      float64 `json:"tinggi_badan"`
		BeratBadan       float64 `json:"berat_badan"`
		Sistolik         int     `json:"sistolik"`
		Diastolik        int     `json:"diastolik"`
		GolonganDarah    string  `json:"golongan_darah"`
		GulaDarah        int     `json:"gula_darah"`
	}

	var input Input
	if err := c.BodyParser(&input); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data tidak valid"})
	}

	tanggal := parseTanggal(input.TanggalPeriksa, input.Tanggal)

	if input.TinggiBadan <= 0 || input.BeratBadan <= 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tinggi badan dan berat badan wajib diisi"})
	}

	heightMeter := input.TinggiBadan / 100
	bmi := 0.0
	if heightMeter > 0 {
		bmi = input.BeratBadan / (heightMeter * heightMeter)
	}

	statusKesehatan := buildStatusKesehatan(input.Sistolik, input.Diastolik, bmi)
	hasilText := strings.TrimSpace(input.Hasil)
	if hasilText == "" {
		hasilText = buildHasil(statusKesehatan)
	}

	catatan := strings.TrimSpace(input.Catatan)
	if catatan == "" {
		catatan = strings.TrimSpace(input.Keluhan)
	}

	jenisPemeriksaan := strings.TrimSpace(input.JenisPemeriksaan)
	if jenisPemeriksaan == "" {
		jenisPemeriksaan = "Screening Mandiri"
	}

	golonganDarah := strings.ToUpper(strings.TrimSpace(input.GolonganDarah))
	if golonganDarah == "" {
		golonganDarah = student.GolonganDarah
	}

	record := models.Kesehatan{
		MahasiswaID:      student.ID,
		Tanggal:          tanggal,
		JenisPemeriksaan: jenisPemeriksaan,
		Hasil:            hasilText,
		Catatan:          catatan,
		TinggiBadan:      input.TinggiBadan,
		BeratBadan:       input.BeratBadan,
		Sistole:          input.Sistolik,
		Diastole:         input.Diastolik,
		GulaDarah:        input.GulaDarah,
		GolonganDarah:    golonganDarah,
		StatusKesehatan:  statusKesehatan,
		Sumber:           "mandiri",
	}

	if err := config.DB.Create(&record).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan data"})
	}

	logActivity(c, "health", "Mengisi screening kesehatan (BMI: "+fmt.Sprintf("%.1f", bmi)+")")

	// Kirim notif jika status perlu perhatian atau pantauan
	switch statusKesehatan {
	case "tindak_lanjut":
		notifikasi.Kirim(config.DB, notifikasi.KirimParams{
			UserID:  student.PenggunaID,
			Type:    "health",
			Title:   "⚠️ Peringatan Kesehatan - Perlu Tindak Lanjut",
			Content: "Hasil screening kesehatanmu menunjukkan kondisi yang perlu perhatian medis. Segera konsultasikan ke dokter atau tenaga kesehatan.",
			Link:    "/student/health",
		})
	case "pantauan":
		notifikasi.Kirim(config.DB, notifikasi.KirimParams{
			UserID:  student.PenggunaID,
			Type:    "health",
			Title:   "📋 Hasil Screening - Status Pantauan",
			Content: "Kondisi kesehatanmu masuk dalam kategori pantauan. Jaga pola makan, istirahat cukup, dan lakukan pemeriksaan rutin.",
			Link:    "/student/health",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Data kesehatan berhasil disimpan.",
		"data":    record,
	})
}

func GetHealthRingkasan(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var rec models.Kesehatan
	_ = config.DB.Where("mahasiswa_id = ?", student.ID).Order("created_at DESC").First(&rec).Error

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"terakhir": rec,
			"ada_data": rec.ID != 0,
		},
	})
}

func GetHealthDetail(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	id := c.Params("id")
	var rec models.Kesehatan
	if err := config.DB.Where("id = ? AND mahasiswa_id = ?", id, student.ID).First(&rec).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data kesehatan tidak ditemukan"})
	}

	return c.JSON(fiber.Map{"success": true, "data": rec})
}

func CreateHealthMandiri(c *fiber.Ctx) error {
	return CreateHealthRecord(c)
}

func GetHealthTips(c *fiber.Ctx) error {
	bmi := c.QueryFloat("bmi", 0)
	tips := "Jaga pola makan, tidur cukup, dan olahraga rutin."
	if bmi > 0 && bmi < 18.5 {
		tips = "BMI rendah: pertimbangkan menambah asupan nutrisi seimbang."
	} else if bmi >= 25 {
		tips = "BMI tinggi: tingkatkan aktivitas fisik dan kurangi gula berlebih."
	}

	return c.JSON(fiber.Map{"success": true, "tips": tips})
}
