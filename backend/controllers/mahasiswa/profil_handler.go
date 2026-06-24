package mahasiswa

import (
	"fmt"
	"os"
	"siakad-backend/config"
	"siakad-backend/models"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
)

func GetProfile(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Profil tidak ditemukan"})
	}

	config.DB.Preload("ProgramStudi.Fakultas").Preload("Pengguna").First(student, student.ID)

	return c.JSON(fiber.Map{
		"success": true,
		"data":    student,
	})
}

func UpdateProfile(c *fiber.Ctx) error {

	type UpdateRequest struct {
		// Data Pribadi
		NIK              string `json:"nik"`
		NISN             string `json:"nisn"`
		NUPN             string `json:"nupn"`
		NPSN             string `json:"npsn"`
		NIRM             string `json:"nirm"`
		NIRL             string `json:"nirl"`
		TempatLahir      string `json:"tempat_lahir"`
		TanggalLahir     string `json:"tanggal_lahir"`
		JenisKelamin     string `json:"jenis_kelamin"`
		Agama            string `json:"agama"`
		Kewarganegaraan  string `json:"kewarganegaraan"`
		StatusPernikahan string `json:"status_pernikahan"`
		GolonganDarah    string `json:"golongan_darah"`
		IsDisabilitas    string `json:"is_disabilitas"`
		JenisTinggal    string `json:"jenis_tinggal"`

		// Kontak
		EmailPersonal string `json:"email_personal"`
		EmailKampus   string `json:"email_kampus"`
		NoHP          string `json:"no_hp"`
		Telepon       string `json:"telepon"`
		Alamat        string `json:"alamat"`
		RT            string `json:"rt"`
		RW            string `json:"rw"`
		Kota          string `json:"kota"`
		KodePos       string `json:"kode_pos"`
		Desa          string `json:"desa"`
		Kecamatan     string `json:"kecamatan"`
		Provinsi      string `json:"provinsi"`

		// Domisili
		AlamatDomisili    string `json:"alamat_domisili"`
		RTDomisili        string `json:"rt_domisili"`
		RWDomisili        string `json:"rw_domisili"`
		KotaDomisili      string `json:"kota_domisili"`
		KodePosDomisili   string `json:"kode_pos_domisili"`
		DesaDomisili      string `json:"desa_domisili"`
		KecamatanDomisili string `json:"kecamatan_domisili"`
		ProvinsiDomisili  string `json:"provinsi_domisili"`

		// Kontak Darurat
		KontakDarurat   string `json:"kontak_darurat"`
		TeleponDarurat string `json:"telepon_darurat"`

		// Keluarga
		NamaAyah        string `json:"nama_ayah"`
		PekerjaanAyah   string `json:"pekerjaan_ayah"`
		NamaIbuKandung  string `json:"nama_ibu_kandung"`
		PekerjaanIbu    string `json:"pekerjaan_ibu"`
		NamaWali        string `json:"nama_wali"`
		PekerjaanWali   string `json:"pekerjaan_wali"`
		PenghasilanOrtu  int    `json:"penghasilan_ortu"`
		Pekerjaan       string `json:"pekerjaan"`

		// Nomor Identitas
		NomorKK  string `json:"nomor_kk"`
		NomorKPS string `json:"nomor_kps"`

		// Pendidikan
		AsalSekolah  string `json:"asal_sekolah"`
		NoIjazahSMA string `json:"no_ijazah_sma"`
	}

	var req UpdateRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data tidak valid"})
	}

	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Student not found"})
	}

	// === Data Pribadi ===
	student.NIK = req.NIK
	student.NISN = req.NISN
	student.NUPN = req.NUPN
	student.NPSN = req.NPSN
	student.NIRM = req.NIRM
	student.NIRL = req.NIRL
	student.TempatLahir = req.TempatLahir
	if req.TanggalLahir != "" {
		t, _ := time.Parse("2006-01-02", req.TanggalLahir)
		student.TanggalLahir = t
	}
	student.JenisKelamin = req.JenisKelamin
	student.Agama = req.Agama
	student.Kewarganegaraan = req.Kewarganegaraan
	student.StatusPernikahan = req.StatusPernikahan
	student.GolonganDarah = req.GolonganDarah
	student.IsDisabilitas = req.IsDisabilitas
	student.JenisTinggal = req.JenisTinggal

	// === Kontak ===
	student.EmailPersonal = req.EmailPersonal
	student.EmailKampus = req.EmailKampus
	student.NoHP = req.NoHP
	student.Telepon = req.Telepon
	student.Alamat = req.Alamat
	student.RT = req.RT
	student.RW = req.RW
	student.Kota = req.Kota
	student.KodePos = req.KodePos
	student.Desa = req.Desa
	student.Kecamatan = req.Kecamatan
	student.Provinsi = req.Provinsi

	// === Domisili ===
	student.AlamatDomisili = req.AlamatDomisili
	student.RTDomisili = req.RTDomisili
	student.RWDomisili = req.RWDomisili
	student.KotaDomisili = req.KotaDomisili
	student.KodePosDomisili = req.KodePosDomisili
	student.DesaDomisili = req.DesaDomisili
	student.KecamatanDomisili = req.KecamatanDomisili
	student.ProvinsiDomisili = req.ProvinsiDomisili

	// === Kontak Darurat ===
	student.KontakDarurat = req.KontakDarurat

	// === Keluarga ===
	student.NamaAyah = req.NamaAyah
	student.PekerjaanAyah = req.PekerjaanAyah
	student.NamaIbuKandung = req.NamaIbuKandung
	student.PekerjaanIbu = req.PekerjaanIbu
	student.NamaWali = req.NamaWali
	student.PenghasilanOrtu = req.PenghasilanOrtu
	student.Pekerjaan = req.Pekerjaan

	// === Nomor Identitas ===
	student.NomorKK = req.NomorKK
	student.NomorKPS = req.NomorKPS

	// === Pendidikan ===
	student.AsalSekolah = req.AsalSekolah
	student.NoIjazahSMA = req.NoIjazahSMA

	if err := config.DB.Save(&student).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui profil: " + err.Error()})
	}

	// Sinkronisasi Golongan Darah ke tabel kesehatan jika ada perubahan
	if req.GolonganDarah != "" {
		config.DB.Model(&models.Kesehatan{}).Where("mahasiswa_id = ?", student.ID).Update("golongan_darah", strings.ToUpper(strings.TrimSpace(req.GolonganDarah)))
	}

	logActivity(c, "Memperbarui profil", "Data diri berhasil diperbarui")

	return c.JSON(fiber.Map{"success": true, "message": "Profil berhasil diperbarui"})
}

func ChangePassword(c *fiber.Ctx) error {
	PenggunaID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	type PasswordRequest struct {
		OldPassword     string `json:"old_password"`
		NewPassword     string `json:"new_password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	var req PasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Data tidak valid"})
	}

	if req.NewPassword != req.ConfirmPassword {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Konfirmasi password baru tidak cocok"})
	}

	var user models.User
	config.DB.First(&user, PenggunaID)

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.OldPassword)); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Password saat ini salah"})
	}

	hash, _ := bcrypt.GenerateFromPassword([]byte(req.NewPassword), 12)
	user.Password = string(hash)
	config.DB.Save(&user)

	return c.JSON(fiber.Map{"success": true, "message": "Password berhasil diperbarui"})
}

func UploadAvatar(c *fiber.Ctx) error {
	PenggunaID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	file, err := c.FormFile("foto")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tidak ada file yang diunggah"})
	}

	filename := fmt.Sprintf("avatar_%d_%v", PenggunaID, file.Filename)
	uploadDir := "./uploads/avatars"
	_ = os.MkdirAll(uploadDir, os.ModePerm)
	path := uploadDir + "/" + filename

	if err := c.SaveFile(file, path); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file"})
	}

	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Student not found"})
	}
	config.DB.Model(student).Update("foto_url", "/uploads/avatars/"+filename)

	return c.JSON(fiber.Map{"success": true, "message": "Foto berhasil diunggah", "url": "/uploads/avatars/" + filename})
}

func GetPreferensiNotif(c *fiber.Ctx) error {
	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"email":  true,
			"push":   true,
			"in_app": true,
		},
	})
}

func UpdatePreferensiNotif(c *fiber.Ctx) error {
	var body map[string]any
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format data tidak valid"})
	}

	return c.JSON(fiber.Map{"success": true, "message": "Preferensi berhasil diperbarui", "data": body})
}

func GetSesiAktif(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	var sessions []fiber.Map

	// Ambil dari log_aktivitas untuk sesi terbaru
	var logs []models.LogAktivitas
	config.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(5).
		Find(&logs)

	for i, log := range logs {
		sessions = append(sessions, fiber.Map{
			"device":      "Web Browser",
			"last_active": log.CreatedAt,
			"ip":          log.IPAddress,
			"current":      i == 0,
		})
	}

	if len(sessions) == 0 {
		sessions = []fiber.Map{{
			"device":      "Web Browser",
			"last_active": time.Now(),
			"ip":          "127.0.0.1",
			"current":     true,
		}}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    sessions,
	})
}

func GetRiwayatLogin(c *fiber.Ctx) error {
	userID, err := getUserID(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "User tidak terautentikasi"})
	}

	var logs []models.LogAktivitas
	config.DB.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(20).
		Find(&logs)

	var riwayat []fiber.Map
	for _, log := range logs {
		riwayat = append(riwayat, fiber.Map{
			"created_at": log.CreatedAt,
			"user_agent": "Web Browser",
			"location":   "Tidak diketahui",
			"ip":         log.IPAddress,
			"status":     "Berhasil",
		})
	}

	if len(riwayat) == 0 {
		riwayat = []fiber.Map{{
			"created_at": time.Now(),
			"user_agent": "Web Browser",
			"location":   "Tidak diketahui",
			"ip":         "127.0.0.1",
			"status":     "Berhasil",
		}}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    riwayat,
	})
}
