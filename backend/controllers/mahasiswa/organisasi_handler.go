package mahasiswa

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"siakad-backend/config"
	"siakad-backend/models"
	"strconv"
	"time"

	"github.com/gofiber/fiber/v2"
)

// DaftarOrmawaRequest represents JSON body for registration
type DaftarOrmawaRequest struct {
	OrmawaID         string                 `json:"ormawa_id"`
	Divisi           string                 `json:"divisi"`
	DivisiPilihanDua string                 `json:"divisi_pilihan_dua"`
	Alasan           string                 `json:"alasan"`
	CVURL            string                 `json:"cv_url"`
	CustomAnswers    map[string]interface{} `json:"custom_answers"`
}

// GetList returns all organisation history for the logged-in student
func GetList(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var list []models.RiwayatOrganisasi
	config.DB.Preload("Prestasi").Where("mahasiswa_id = ?", student.ID).Order("periode_mulai desc").Find(&list)

	return c.JSON(fiber.Map{"success": true, "data": list})
}

type OrgRequest struct {
	NamaOrganisasi    string `json:"nama_organisasi"`
	Tipe              string `json:"tipe"`
	Jabatan           string `json:"jabatan"`
	PeriodeMulai      int    `json:"periode_mulai"`
	PeriodeSelesai    *int   `json:"periode_selesai"`
	DeskripsiKegiatan string `json:"deskripsi_kegiatan"`
	Apresiasi         string `json:"apresiasi"`
}

// Create adds a new organisation record
func Create(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var req OrgRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format request tidak valid"})
	}

	rec := models.RiwayatOrganisasi{
		MahasiswaID:       student.ID,
		NamaOrganisasi:    req.NamaOrganisasi,
		Tipe:              req.Tipe,
		Jabatan:           req.Jabatan,
		PeriodeMulai:      req.PeriodeMulai,
		PeriodeSelesai:    req.PeriodeSelesai,
		DeskripsiKegiatan: req.DeskripsiKegiatan,
		Apresiasi:         req.Apresiasi,
		StatusVerifikasi:  "Menunggu",
	}

	if err := config.DB.Create(&rec).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menambah riwayat organisasi"})
	}

	logActivity(c, "organisasi", "Menambah riwayat organisasi: "+req.NamaOrganisasi)
	return c.Status(201).JSON(fiber.Map{"success": true, "data": rec})
}

// Update modifies an existing organisation record
func Update(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var rec models.RiwayatOrganisasi
	if err := config.DB.Where("id = ? AND mahasiswa_id = ?", id, student.ID).First(&rec).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data tidak ditemukan"})
	}

	var req OrgRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format request tidak valid"})
	}

	rec.NamaOrganisasi = req.NamaOrganisasi
	rec.Tipe = req.Tipe
	rec.Jabatan = req.Jabatan
	rec.PeriodeMulai = req.PeriodeMulai
	rec.PeriodeSelesai = req.PeriodeSelesai
	rec.DeskripsiKegiatan = req.DeskripsiKegiatan
	rec.Apresiasi = req.Apresiasi

	if err := config.DB.Save(&rec).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan perubahan"})
	}

	logActivity(c, "organisasi", "Memperbarui riwayat organisasi: "+rec.NamaOrganisasi)
	return c.JSON(fiber.Map{"success": true, "data": rec})
}

// Delete removes a record
func Delete(c *fiber.Ctx) error {
	id := c.Params("id")
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var rec models.RiwayatOrganisasi
	if err := config.DB.Where("id = ? AND mahasiswa_id = ?", id, student.ID).First(&rec).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data tidak ditemukan"})
	}

	config.DB.Unscoped().Delete(&rec)
	logActivity(c, "organisasi", "Menghapus riwayat organisasi: "+rec.NamaOrganisasi)
	return c.JSON(fiber.Map{"success": true, "message": "Riwayat organisasi berhasil dihapus"})
}

// GetOrmawaList returns all active Ormawas
func GetOrmawaList(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var list []models.Ormawa
	if err := config.DB.Preload("KategoriDetail").Where("status = ?", "Aktif").Order("nama asc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data Ormawa"})
	}

	// Filter based on Kategori and student affiliation
	var filtered []models.Ormawa
	for _, o := range list {
		isUniversal := false
		if o.KategoriDetail != nil && !o.KategoriDetail.TerafiliasiFakultas && !o.KategoriDetail.WajibProdi {
			isUniversal = true
		} else if o.KategoriDetail == nil {
			k := o.Kategori
			if k == "BEM" || k == "MPM" || k == "UKM" || k == "UKK" {
				isUniversal = true
			}
		}

		if isUniversal {
			filtered = append(filtered, o)
		} else {
			// Himpunan and other categories: check affiliation
			if o.ProgramStudiID != nil && *o.ProgramStudiID > 0 {
				if student.ProgramStudiID == *o.ProgramStudiID {
					filtered = append(filtered, o)
				}
			} else if o.FakultasID != nil && *o.FakultasID > 0 {
				if student.FakultasID == *o.FakultasID {
					filtered = append(filtered, o)
				}
			} else {
				// If no affiliation is set, keep it
				filtered = append(filtered, o)
			}
		}
	}

	return c.JSON(fiber.Map{"success": true, "data": filtered})
}

// DaftarOrmawa registers a student to an Ormawa (supports JSON + FormData)
func DaftarOrmawa(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	// Parse request — support both JSON and FormData
	contentType := string(c.Request().Header.ContentType())
	isJSON := len(contentType) >= 16 && contentType[:16] == "application/json"

	var req DaftarOrmawaRequest
	var ormawaID uint
	alasan := ""
	divisi := ""
	divisiPilihanDua := ""
	customAnswersJSON := "{}"
	var cvURL string

	if isJSON {
		if err := c.BodyParser(&req); err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format JSON tidak valid"})
		}
		oid, err := strconv.Atoi(req.OrmawaID)
		if err != nil || oid <= 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ormawa ID tidak valid"})
		}
		ormawaID = uint(oid)
		alasan = req.Alasan
		divisi = req.Divisi
		divisiPilihanDua = req.DivisiPilihanDua
		if req.CVURL != "" {
			cvURL = req.CVURL
		}
		if req.CustomAnswers != nil {
			caBytes, _ := json.Marshal(req.CustomAnswers)
			customAnswersJSON = string(caBytes)
		}
	} else {
		ormawaIDStr := c.FormValue("ormawa_id")
		if ormawaIDStr == "" {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ormawa ID wajib diisi"})
		}
		oid, err := strconv.Atoi(ormawaIDStr)
		if err != nil || oid <= 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ormawa ID tidak valid"})
		}
		ormawaID = uint(oid)
		alasan = c.FormValue("alasan")
		divisi = c.FormValue("divisi")
		divisiPilihanDua = c.FormValue("divisi_pilihan_dua")
		ca := c.FormValue("custom_answers")
		if ca != "" {
			customAnswersJSON = ca
		}

		// Handle Lampiran Upload (FormData only)
		file, err := c.FormFile("lampiran")
		if err == nil && file != nil {
			uploadDir := "./uploads/ormawa"
			if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
				return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat direktori upload"})
			}
			filename := fmt.Sprintf("%d_%d_%s", student.ID, ormawaID, file.Filename)
			filepath := fmt.Sprintf("%s/%s", uploadDir, filename)
			if err := c.SaveFile(file, filepath); err != nil {
				return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file lampiran"})
			}
			cvURL = "/uploads/ormawa/" + filename
		}
	}

	// Fetch Ormawa details
	var ormawa models.Ormawa
	if err := config.DB.Preload("KategoriDetail").First(&ormawa, ormawaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Ormawa tidak ditemukan"})
	}

	// Validate Open Recruitment
	if !ormawa.OpenRecruitment {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Pendaftaran Ormawa ini sedang ditutup"})
	}

	// Validate dates
	now := time.Now().UTC()
	if ormawa.RecruitmentStart != nil && !ormawa.RecruitmentStart.IsZero() && now.Before(*ormawa.RecruitmentStart) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Pendaftaran Ormawa belum dibuka"})
	}
	if ormawa.RecruitmentEnd != nil && !ormawa.RecruitmentEnd.IsZero() && now.After(*ormawa.RecruitmentEnd) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Pendaftaran Ormawa sudah ditutup"})
	}

	// Validate GPA
	isNewStudent := student.SemesterSekarang == 1
	if ormawa.MinIPK > 0 && student.IPK < ormawa.MinIPK && !isNewStudent {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": fmt.Sprintf("IPK Anda (%.2f) tidak memenuhi syarat minimal IPK (%.2f) untuk Ormawa ini", student.IPK, ormawa.MinIPK)})
	}

	// Validate affiliation
	isUniversal := false
	if ormawa.KategoriDetail != nil && !ormawa.KategoriDetail.TerafiliasiFakultas && !ormawa.KategoriDetail.WajibProdi {
		isUniversal = true
	} else if ormawa.KategoriDetail == nil {
		k := ormawa.Kategori
		if k == "BEM" || k == "MPM" || k == "UKM" || k == "UKK" {
			isUniversal = true
		}
	}
	if !isUniversal {
		if ormawa.ProgramStudiID != nil && *ormawa.ProgramStudiID > 0 {
			if student.ProgramStudiID != *ormawa.ProgramStudiID {
				return c.Status(403).JSON(fiber.Map{"success": false, "message": "Ormawa ini hanya terbuka untuk Program Studi yang bersangkutan"})
			}
		} else if ormawa.FakultasID != nil && *ormawa.FakultasID > 0 {
			if student.FakultasID != *ormawa.FakultasID {
				return c.Status(403).JSON(fiber.Map{"success": false, "message": "Ormawa ini hanya terbuka untuk Fakultas yang bersangkutan"})
			}
		}
	}

	// Check duplicate
	var count int64
	config.DB.Model(&models.OrmawaAnggota{}).Where("mahasiswa_id = ? AND ormawa_id = ? AND status IN ?", student.ID, ormawaID, []string{"aktif", "pending"}).Count(&count)
	if count > 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Anda sudah terdaftar atau memiliki pendaftaran pending di Ormawa ini"})
	}

	if divisi == "" {
		divisi = "Umum"
	}

	anggota := models.OrmawaAnggota{
		OrmawaID:         ormawaID,
		MahasiswaID:      student.ID,
		Role:             "Anggota",
		Divisi:           divisi,
		DivisiPilihanDua: divisiPilihanDua,
		IPK:              student.IPK,
		Alasan:           alasan,
		CVURL:            cvURL,
		CustomAnswers:    customAnswersJSON,
		Status:           "pending",
		JoinedAt:         now,
	}

	if err := config.DB.Create(&anggota).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengajukan pendaftaran"})
	}

	// Send notification to ormawa board (1 notification for all admins)
	config.DB.Create(&models.OrmawaNotifikasi{
		OrmawaID: ormawaID,
		Judul:    "Pendaftaran Anggota Baru",
		Pesan:    fmt.Sprintf("%s mendaftar sebagai anggota baru", student.Nama),
		Tipe:     "pendaftaran",
	})

	return c.Status(201).JSON(fiber.Map{"success": true, "message": "Pendaftaran berhasil dikirim, menunggu persetujuan admin Ormawa", "data": anggota})
}

// GetPendaftaranList returns registration history for the student
func GetPendaftaranList(c *fiber.Ctx) error {
	student, err := getStudent(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
	}

	var list []models.OrmawaAnggota
	if err := config.DB.Preload("Ormawa").Where("mahasiswa_id = ?", student.ID).Order("created_at desc").Find(&list).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data pendaftaran"})
	}

	return c.JSON(fiber.Map{"success": true, "data": list})
}

// GetOrmawaDivisions returns all divisions for a specific Ormawa
func GetOrmawaDivisions(c *fiber.Ctx) error {
	ormawaID := c.Params("ormawaId")
	if ormawaID == "" {
		ormawaID = c.Query("ormawaId")
	}
	if ormawaID == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ormawa ID wajib diisi"})
	}

	var divisions []models.OrmawaDivisi
	if err := config.DB.Where("ormawa_id = ?", ormawaID).Order("nama asc").Find(&divisions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data divisi"})
	}

	return c.JSON(fiber.Map{"success": true, "data": divisions})
}

// GetRecruitmentFields returns all dynamic form fields for a specific Ormawa's open-recruitment
func GetRecruitmentFields(c *fiber.Ctx) error {
	ormawaID := c.Params("ormawaId")
	if ormawaID == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ormawa ID wajib diisi"})
	}

	var ormawa models.Ormawa
	if err := config.DB.First(&ormawa, ormawaID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Ormawa tidak ditemukan"})
	}
	if !ormawa.OpenRecruitment {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ormawa ini sedang tidak membuka pendaftaran"})
	}

	var fields []models.OrmawaRecruitmentField
	config.DB.Where("ormawa_id = ?", ormawaID).Order("\"order\" asc").Find(&fields)

	return c.JSON(fiber.Map{
		"success":      true,
		"data":         fields,
		"is_open":      ormawa.OpenRecruitment,
		"start_date":   ormawa.RecruitmentStart,
		"end_date":     ormawa.RecruitmentEnd,
		"min_ipk":      ormawa.MinIPK,
		"requirements": ormawa.RecruitmentRequirements,
	})
}

// UploadRecruitmentFile handles file upload for PDF/image fields in the recruitment form
func UploadRecruitmentFile(c *fiber.Ctx) error {
	_, err := getStudent(c)
	if err != nil {
		return c.Status(401).JSON(fiber.Map{"success": false, "message": "Tidak terautentikasi"})
	}

	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "File wajib diunggah"})
	}

	// Validate size (max 5 MB)
	if file.Size > 5*1024*1024 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Ukuran file maksimal 5 MB"})
	}

	ext := filepath.Ext(file.Filename)
	filename := fmt.Sprintf("recruit_%d%s", time.Now().UnixNano(), ext)
	uploadDir := "./uploads/recruitment"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		fmt.Printf("Error creating upload dir: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat direktori upload"})
	}
	savePath := uploadDir + "/" + filename

	if err := c.SaveFile(file, savePath); err != nil {
		fmt.Printf("Error saving file: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file"})
	}

	fileURL := "/uploads/recruitment/" + filename
	return c.JSON(fiber.Map{"success": true, "url": fileURL, "message": "File berhasil diunggah"})
}
