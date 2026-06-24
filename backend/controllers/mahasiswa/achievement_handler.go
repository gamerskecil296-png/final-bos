package mahasiswa

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

// GetAchievements returns paginated achievements and total stats for an individual student
func GetAchievements(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	search := c.Query("search", "")

	// Base Query
	query := config.DB.Model(&models.Prestasi{}).Preload("Mahasiswa.ProgramStudi").Where("mahasiswa_id = ?", student.ID)

	if search != "" {
		query = query.Where("nama_kegiatan LIKE ?", "%"+search+"%")
	}

	var totalReported, verifiedCount, pendingCount int64
	// Stats for all achievements (ignoring search)
	config.DB.Model(&models.Prestasi{}).Where("mahasiswa_id = ?", student.ID).Count(&totalReported)
	config.DB.Model(&models.Prestasi{}).Where("mahasiswa_id = ? AND status = ?", student.ID, "Diverifikasi").Count(&verifiedCount)
	config.DB.Model(&models.Prestasi{}).Where("mahasiswa_id = ? AND status = ?", student.ID, "Menunggu").Count(&pendingCount)

	// Fetch List
	var achievements []models.Prestasi
	query.Order("created_at desc").Find(&achievements)

	return c.JSON(fiber.Map{
		"success": true,
		"data": fiber.Map{
			"stats": fiber.Map{
				"total":    totalReported,
				"verified": verifiedCount,
				"pending":  pendingCount,
			},
			"list": achievements,
		},
	})
}

// CreateAchievement handles new achievement submissions with file upload
func CreateAchievement(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var input struct {
		NamaKegiatan       string  `json:"nama_kegiatan"`
		Kategori           string  `json:"kategori"`
		Tingkat            string  `json:"tingkat"`
		Peringkat          string  `json:"peringkat"`
		BuktiURL           string  `json:"bukti_url"`
		Tipe               string  `json:"tipe"`
		Penyelenggara      string  `json:"penyelenggara"`
		Tanggal            string  `json:"tanggal"`
		DanaDiajukan       float64 `json:"dana_diajukan"`
		Cabang             string  `json:"cabang"`
		JumlahUnitPeserta  int     `json:"jumlah_unit_peserta"`
		KelompokPrestasi   string  `json:"kelompok_prestasi"`
		Bentuk             string  `json:"bentuk"`
		UrlPeserta         string  `json:"url_peserta"`
		UrlSertifikat      string  `json:"url_sertifikat"`
		UrlFotoUpp         string  `json:"url_foto_upp"`
		UrlDokumenUndangan string  `json:"url_dokumen_undangan"`
		JenisRekognisi     string  `json:"jenis_rekognisi"`
		Keterangan         string  `json:"keterangan"`
		AnggotaMahasiswa   string  `json:"anggota_mahasiswa"` // JSON array of Mahasiswa IDs
		PembimbingDosen    string  `json:"pembimbing_dosen"`  // JSON array of objects
	}
	_ = c.BodyParser(&input)

	namaKegiatan := firstNonEmpty(c.FormValue("nama_kegiatan"), input.NamaKegiatan)
	kategori := firstNonEmpty(c.FormValue("kategori"), input.Kategori)
	tingkat := firstNonEmpty(c.FormValue("tingkat"), input.Tingkat)
	peringkat := firstNonEmpty(c.FormValue("peringkat"), input.Peringkat)
	tipe := firstNonEmpty(c.FormValue("tipe"), input.Tipe)
	if tipe == "" {
		tipe = "Laporan Prestasi"
	}
	penyelenggara := firstNonEmpty(c.FormValue("penyelenggara"), input.Penyelenggara)

	var tanggalObj time.Time
	tanggalStr := firstNonEmpty(c.FormValue("tanggal"), input.Tanggal)
	if tanggalStr != "" {
		if t, err := time.Parse("2006-01-02", tanggalStr); err == nil {
			tanggalObj = t
		} else if t, err := time.Parse(time.RFC3339, tanggalStr); err == nil {
			tanggalObj = t
		}
	}

	var danaDiajukan float64
	danaDiajukanStr := c.FormValue("dana_diajukan")
	if danaDiajukanStr != "" {
		if val, err := strconv.ParseFloat(danaDiajukanStr, 64); err == nil {
			danaDiajukan = val
		}
	} else {
		danaDiajukan = input.DanaDiajukan
	}

	cabang := firstNonEmpty(c.FormValue("cabang"), input.Cabang)
	kelompokPrestasi := firstNonEmpty(c.FormValue("kelompok_prestasi"), input.KelompokPrestasi)
	bentuk := firstNonEmpty(c.FormValue("bentuk"), input.Bentuk)
	urlPeserta := firstNonEmpty(c.FormValue("url_peserta"), input.UrlPeserta)
	urlSertifikat := firstNonEmpty(c.FormValue("url_sertifikat"), input.UrlSertifikat)
	urlFotoUpp := firstNonEmpty(c.FormValue("url_foto_upp"), input.UrlFotoUpp)
	urlDokumenUndangan := firstNonEmpty(c.FormValue("url_dokumen_undangan"), input.UrlDokumenUndangan)
	jenisRekognisi := firstNonEmpty(c.FormValue("jenis_rekognisi"), input.JenisRekognisi)
	keterangan := firstNonEmpty(c.FormValue("keterangan"), input.Keterangan)

	var jumlahUnitPeserta int
	jumlahUnitPesertaStr := c.FormValue("jumlah_unit_peserta")
	if jumlahUnitPesertaStr != "" {
		if val, err := strconv.Atoi(jumlahUnitPesertaStr); err == nil {
			jumlahUnitPeserta = val
		}
	} else {
		jumlahUnitPeserta = input.JumlahUnitPeserta
	}

	anggotaMahasiswaStr := firstNonEmpty(c.FormValue("anggota_mahasiswa"), input.AnggotaMahasiswa)
	pembimbingDosenStr := firstNonEmpty(c.FormValue("pembimbing_dosen"), input.PembimbingDosen)

	if namaKegiatan == "" || tingkat == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Field nama kegiatan dan tingkat wajib diisi"})
	}

	// Handle File Upload
	buktiURL := strings.TrimSpace(input.BuktiURL)
	file, err := c.FormFile("bukti")
	if err == nil {
		// Validate File Size (Max 5MB)
		if file.Size > 5*1024*1024 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ukuran file melebihi 5MB"})
		}

		// Validate Extension
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".pdf" && ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format file hanya boleh PDF, JPG, atau PNG"})
		}

		// Buat direktori jika belum ada
		uploadDir := "./uploads/achievements"
		_ = os.MkdirAll(uploadDir, os.ModePerm)

		fileId := uuid.New().String()
		fileOutputName := fmt.Sprintf("%s%s", fileId, ext)
		savePath := filepath.Join(uploadDir, fileOutputName)

		if err := c.SaveFile(file, savePath); err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file"})
		}

		buktiURL = "/uploads/achievements/" + fileOutputName
	}

	achievement := models.Prestasi{
		MahasiswaID:   student.ID,
		NamaKegiatan:  namaKegiatan,
		Kategori:      kategori,
		Tingkat:       tingkat,
		Peringkat:     peringkat,
		BuktiURL:      buktiURL,
		Status:        "Menunggu",
		Poin:          0,
		Tipe:          tipe,
		Penyelenggara: penyelenggara,
		Tanggal:       tanggalObj,
		DanaDiajukan:  danaDiajukan,

		Cabang:             cabang,
		JumlahUnitPeserta:  jumlahUnitPeserta,
		KelompokPrestasi:   kelompokPrestasi,
		Bentuk:             bentuk,
		UrlPeserta:         urlPeserta,
		UrlSertifikat:      urlSertifikat,
		UrlFotoUpp:         urlFotoUpp,
		UrlDokumenUndangan: urlDokumenUndangan,
		JenisRekognisi:     jenisRekognisi,
		Keterangan:         keterangan,
		SimkatmawaStatus:   "Belum Dikirim",
	}

	orgID := c.FormValue("riwayat_organisasi_id")
	if orgID != "" {
		var org models.RiwayatOrganisasi
		if err := config.DB.First(&org, orgID).Error; err == nil {
			achievement.RiwayatOrganisasiID = &org.ID
		}
	}

	config.DB.Create(&achievement)

	// Save Anggota Mahasiswa
	if anggotaMahasiswaStr != "" {
		var anggotaIDs []uint
		if err := json.Unmarshal([]byte(anggotaMahasiswaStr), &anggotaIDs); err == nil {
			for _, mID := range anggotaIDs {
				config.DB.Create(&models.PrestasiMahasiswa{
					PrestasiID:  achievement.ID,
					MahasiswaID: mID,
					Peran:       "Anggota",
				})
			}
		}
	}

	// Save Dosen Pembimbing
	if pembimbingDosenStr != "" {
		type dosenInput struct {
			DosenID       *uint  `json:"dosen_id"`
			NamaDosen     string `json:"nama_dosen"`
			Nidn          string `json:"nidn"`
			SuratTugasURL string `json:"surat_tugas_url"`
		}
		var dosenList []dosenInput
		if err := json.Unmarshal([]byte(pembimbingDosenStr), &dosenList); err == nil {
			for _, d := range dosenList {
				config.DB.Create(&models.PrestasiDosen{
					PrestasiID:    achievement.ID,
					DosenID:       d.DosenID,
					NamaDosen:     d.NamaDosen,
					Nidn:          d.Nidn,
					SuratTugasURL: d.SuratTugasURL,
					Peran:         "Pembimbing",
				})
			}
		}
	}

	// Notifikasi konfirmasi ke mahasiswa
	var notifTitle, notifContent string
	if tipe == "Pengajuan Dana" {
		notifTitle = "Pengajuan Dana Lomba Dikirim"
		notifContent = "Pengajuan dana lomba '" + achievement.NamaKegiatan + "' sebesar Rp " + strconv.FormatFloat(danaDiajukan, 'f', 0, 64) + " berhasil dikirim dan sedang menunggu verifikasi admin."
	} else {
		notifTitle = "Laporan Prestasi Diterima"
		notifContent = "Laporan prestasi '" + achievement.NamaKegiatan + "' berhasil dikirim dan sedang menunggu verifikasi admin."
	}

	notifikasi.Kirim(config.DB, notifikasi.KirimParams{
		UserID:  student.PenggunaID,
		Type:    "prestasi",
		Title:   notifTitle,
		Content: notifContent,
		Link:    "/student/achievement",
	})

	logActivity(c, "achievement", "Mengirim "+tipe+": "+namaKegiatan)

	return c.Status(201).JSON(fiber.Map{
		"success": true,
		"message": "Data berhasil dilaporkan/diajukan",
		"data":    achievement,
	})
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

// GetAchievementDetail returns single achievement data
func GetAchievementDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var achievement models.Prestasi
	if err := config.DB.Preload("AnggotaMahasiswa.Mahasiswa").Preload("PembimbingDosen.Dosen").Where("id = ? AND mahasiswa_id = ?", id, student.ID).First(&achievement).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data tidak ditemukan"})
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    achievement,
	})
}

// DeleteAchievement deletes an achievement ONLY if its status is Menunggu
func DeleteAchievement(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var achievement models.Prestasi
	if err := config.DB.Where("id = ? AND mahasiswa_id = ?", id, student.ID).First(&achievement).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data tidak ditemukan"})
	}

	if achievement.Status != "Menunggu" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Hanya prestasi dengan status Menunggu yang dapat dihapus"})
	}

	config.DB.Unscoped().Delete(&achievement)

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Prestasi berhasil dihapus",
	})
}

// UpdateAchievement updates an achievement ONLY if its status is Menunggu
func UpdateAchievement(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var achievement models.Prestasi
	if err := config.DB.Where("id = ? AND mahasiswa_id = ?", id, student.ID).First(&achievement).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data tidak ditemukan"})
	}

	if achievement.Status != "Menunggu" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Hanya prestasi dengan status Menunggu yang dapat diedit"})
	}

	var input struct {
		NamaKegiatan       string  `json:"nama_kegiatan"`
		Kategori           string  `json:"kategori"`
		Tingkat            string  `json:"tingkat"`
		Peringkat          string  `json:"peringkat"`
		BuktiURL           string  `json:"bukti_url"`
		Tipe               string  `json:"tipe"`
		Penyelenggara      string  `json:"penyelenggara"`
		Tanggal            string  `json:"tanggal"`
		DanaDiajukan       float64 `json:"dana_diajukan"`
		Cabang             string  `json:"cabang"`
		JumlahUnitPeserta  int     `json:"jumlah_unit_peserta"`
		KelompokPrestasi   string  `json:"kelompok_prestasi"`
		Bentuk             string  `json:"bentuk"`
		UrlPeserta         string  `json:"url_peserta"`
		UrlSertifikat      string  `json:"url_sertifikat"`
		UrlFotoUpp         string  `json:"url_foto_upp"`
		UrlDokumenUndangan string  `json:"url_dokumen_undangan"`
		JenisRekognisi     string  `json:"jenis_rekognisi"`
		Keterangan         string  `json:"keterangan"`
		AnggotaMahasiswa   string  `json:"anggota_mahasiswa"` // JSON array of Mahasiswa IDs
		PembimbingDosen    string  `json:"pembimbing_dosen"`  // JSON array of objects
	}
	_ = c.BodyParser(&input)

	namaKegiatan := firstNonEmpty(c.FormValue("nama_kegiatan"), input.NamaKegiatan)
	kategori := firstNonEmpty(c.FormValue("kategori"), input.Kategori)
	tingkat := firstNonEmpty(c.FormValue("tingkat"), input.Tingkat)
	peringkat := firstNonEmpty(c.FormValue("peringkat"), input.Peringkat)
	tipe := firstNonEmpty(c.FormValue("tipe"), input.Tipe)
	if tipe == "" {
		tipe = "Laporan Prestasi"
	}
	penyelenggara := firstNonEmpty(c.FormValue("penyelenggara"), input.Penyelenggara)

	var tanggalObj time.Time
	tanggalStr := firstNonEmpty(c.FormValue("tanggal"), input.Tanggal)
	if tanggalStr != "" {
		if t, err := time.Parse("2006-01-02", tanggalStr); err == nil {
			tanggalObj = t
		} else if t, err := time.Parse(time.RFC3339, tanggalStr); err == nil {
			tanggalObj = t
		}
	}

	var danaDiajukan float64
	danaDiajukanStr := c.FormValue("dana_diajukan")
	if danaDiajukanStr != "" {
		if val, err := strconv.ParseFloat(danaDiajukanStr, 64); err == nil {
			danaDiajukan = val
		}
	} else {
		danaDiajukan = input.DanaDiajukan
	}

	cabang := firstNonEmpty(c.FormValue("cabang"), input.Cabang)
	kelompokPrestasi := firstNonEmpty(c.FormValue("kelompok_prestasi"), input.KelompokPrestasi)
	bentuk := firstNonEmpty(c.FormValue("bentuk"), input.Bentuk)
	urlPeserta := firstNonEmpty(c.FormValue("url_peserta"), input.UrlPeserta)
	urlSertifikat := firstNonEmpty(c.FormValue("url_sertifikat"), input.UrlSertifikat)
	urlFotoUpp := firstNonEmpty(c.FormValue("url_foto_upp"), input.UrlFotoUpp)
	urlDokumenUndangan := firstNonEmpty(c.FormValue("url_dokumen_undangan"), input.UrlDokumenUndangan)
	jenisRekognisi := firstNonEmpty(c.FormValue("jenis_rekognisi"), input.JenisRekognisi)
	keterangan := firstNonEmpty(c.FormValue("keterangan"), input.Keterangan)

	var jumlahUnitPeserta int
	jumlahUnitPesertaStr := c.FormValue("jumlah_unit_peserta")
	if jumlahUnitPesertaStr != "" {
		if val, err := strconv.Atoi(jumlahUnitPesertaStr); err == nil {
			jumlahUnitPeserta = val
		}
	} else {
		jumlahUnitPeserta = input.JumlahUnitPeserta
	}

	anggotaMahasiswaStr := firstNonEmpty(c.FormValue("anggota_mahasiswa"), input.AnggotaMahasiswa)
	pembimbingDosenStr := firstNonEmpty(c.FormValue("pembimbing_dosen"), input.PembimbingDosen)

	if namaKegiatan == "" || tingkat == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Field nama kegiatan dan tingkat wajib diisi"})
	}

	// Handle File Upload if there's any
	buktiURL := strings.TrimSpace(input.BuktiURL)
	file, err := c.FormFile("bukti")
	if err == nil {
		if file.Size > 5*1024*1024 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ukuran file melebihi 5MB"})
		}

		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".pdf" && ext != ".jpg" && ext != ".jpeg" && ext != ".png" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format file hanya boleh PDF, JPG, atau PNG"})
		}

		uploadDir := "./uploads/achievements"
		_ = os.MkdirAll(uploadDir, os.ModePerm)

		fileId := uuid.New().String()
		fileOutputName := fmt.Sprintf("%s%s", fileId, ext)
		savePath := filepath.Join(uploadDir, fileOutputName)

		if err := c.SaveFile(file, savePath); err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file"})
		}

		buktiURL = "/uploads/achievements/" + fileOutputName
	}

	achievement.NamaKegiatan = namaKegiatan
	achievement.Kategori = kategori
	achievement.Tingkat = tingkat
	achievement.Peringkat = peringkat
	achievement.Tipe = tipe
	achievement.Penyelenggara = penyelenggara
	achievement.Tanggal = tanggalObj
	achievement.DanaDiajukan = danaDiajukan

	if cabang != "" {
		achievement.Cabang = cabang
	}
	if jumlahUnitPeserta != 0 {
		achievement.JumlahUnitPeserta = jumlahUnitPeserta
	}
	if kelompokPrestasi != "" {
		achievement.KelompokPrestasi = kelompokPrestasi
	}
	if bentuk != "" {
		achievement.Bentuk = bentuk
	}
	if urlPeserta != "" {
		achievement.UrlPeserta = urlPeserta
	}
	if urlSertifikat != "" {
		achievement.UrlSertifikat = urlSertifikat
	}
	if urlFotoUpp != "" {
		achievement.UrlFotoUpp = urlFotoUpp
	}
	if urlDokumenUndangan != "" {
		achievement.UrlDokumenUndangan = urlDokumenUndangan
	}
	if jenisRekognisi != "" {
		achievement.JenisRekognisi = jenisRekognisi
	}
	if keterangan != "" {
		achievement.Keterangan = keterangan
	}

	if buktiURL != "" {
		achievement.BuktiURL = buktiURL
		if achievement.UrlSertifikat == "" {
			achievement.UrlSertifikat = buktiURL
		}
	}

	config.DB.Save(&achievement)

	// Update Anggota Mahasiswa
	if anggotaMahasiswaStr != "" {
		var anggotaIDs []uint
		if err := json.Unmarshal([]byte(anggotaMahasiswaStr), &anggotaIDs); err == nil {
			config.DB.Where("prestasi_id = ?", achievement.ID).Delete(&models.PrestasiMahasiswa{})
			for _, mID := range anggotaIDs {
				config.DB.Create(&models.PrestasiMahasiswa{
					PrestasiID:  achievement.ID,
					MahasiswaID: mID,
					Peran:       "Anggota",
				})
			}
		}
	}

	// Update Dosen Pembimbing
	if pembimbingDosenStr != "" {
		type dosenInput struct {
			DosenID       *uint  `json:"dosen_id"`
			NamaDosen     string `json:"nama_dosen"`
			Nidn          string `json:"nidn"`
			SuratTugasURL string `json:"surat_tugas_url"`
		}
		var dosenList []dosenInput
		if err := json.Unmarshal([]byte(pembimbingDosenStr), &dosenList); err == nil {
			config.DB.Where("prestasi_id = ?", achievement.ID).Delete(&models.PrestasiDosen{})
			for _, d := range dosenList {
				config.DB.Create(&models.PrestasiDosen{
					PrestasiID:    achievement.ID,
					DosenID:       d.DosenID,
					NamaDosen:     d.NamaDosen,
					Nidn:          d.Nidn,
					SuratTugasURL: d.SuratTugasURL,
					Peran:         "Pembimbing",
				})
			}
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": "Data berhasil diperbarui",
		"data":    achievement,
	})
}
