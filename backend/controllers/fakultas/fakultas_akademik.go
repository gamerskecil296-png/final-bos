package controllers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/services"

	"github.com/gofiber/fiber/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// --- MAHASISWA ---

func AmbilDaftarMahasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var mhs = []models.Mahasiswa{}
	query := config.DB.Preload("Pengguna").Preload("ProgramStudi.Fakultas").Preload("DosenPA")

	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND prodi_id = ?", fid, pid)
	}

	angkatan := c.Query("angkatan")
	if angkatan != "" {
		query = query.Where("tahun_masuk = ?", angkatan)
	}

	prodiID := c.Query("program_studi_id")
	if prodiID != "" {
		query = query.Where("prodi_id = ?", prodiID)
	}

	semester := c.Query("semester")
	if semester != "" {
		query = query.Where("current_semester = ?", semester)
	}

	status := c.Query("status")
	if status != "" {
		query = query.Where("status_akun = ?", status)
	}

	if err := query.Find(&mhs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	for i := range mhs {
		if mhs[i].Nama == "" && mhs[i].Pengguna.NamaLengkap != "" {
			mhs[i].Nama = mhs[i].Pengguna.NamaLengkap
		}
	}
	return c.JSON(fiber.Map{"status": "success", "data": mhs})
}

func AmbilMahasiswaBerdasarID(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	var mhs models.Mahasiswa
	query := config.DB.Preload("Pengguna").Preload("ProgramStudi.Fakultas").Preload("DosenPA")

	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND prodi_id = ?", fid, pid)
	}

	if err := query.First(&mhs, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan atau Anda tidak memiliki akses"})
	}
	if mhs.Nama == "" && mhs.Pengguna.NamaLengkap != "" {
		mhs.Nama = mhs.Pengguna.NamaLengkap
	}
	return c.JSON(fiber.Map{"status": "success", "data": mhs})
}

func TambahMahasiswaBaru(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	// Parse request body - support both PascalCase and snake_case
	var body struct {
		Email          string `json:"email"`
		NIM            string `json:"nim"`
		Nama           string `json:"nama"`
		NamaMhs        string `json:"nama_mahasiswa"`
		ProgramStudiID uint   `json:"program_studi_id"`
		ProdiID        uint   `json:"prodi_id"`
		TahunMasuk     int    `json:"tahun_masuk"`
		StatusAkun     string `json:"status_akun"`
		NIK            string `json:"nik"`
		NoHP           string `json:"no_hp"`
		TempatLahir    string `json:"tempat_lahir"`
		TanggalLahir   string `json:"tanggal_lahir"`
		JenisKelamin   string `json:"jenis_kelamin"`
		Agama          string `json:"agama"`
		NamaAyah       string `json:"nama_ayah"`
		NamaIbuKandung string `json:"nama_ibu_kandung"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid: " + err.Error()})
	}

	// Build mahasiswa struct - support multiple field naming
	m := models.Mahasiswa{
		NIM:           body.NIM,
		Nama:          body.Nama,
		ProgramStudiID: body.ProgramStudiID,
		TahunMasuk:    body.TahunMasuk,
		NIK:           body.NIK,
		NoHP:          body.NoHP,
		TempatLahir:   body.TempatLahir,
		NamaAyah:      body.NamaAyah,
		NamaIbuKandung: body.NamaIbuKandung,
	}

	// Alternative prodi_id
	if m.ProgramStudiID == 0 && body.ProdiID > 0 {
		m.ProgramStudiID = body.ProdiID
	}

	// Alternative nama_mahasiswa
	if m.Nama == "" && body.NamaMhs != "" {
		m.Nama = body.NamaMhs
	}

	// Force FakultasID if faculty_admin / prodi_admin / super_admin
	if (role == "faculty_admin" || role == "prodi_admin") || (role == "super_admin" && m.FakultasID == 0) {
		m.FakultasID = fid
	}
	if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		m.ProgramStudiID = pid
	}

	// --- LOGIKA CEK KAPASITAS (SLOT) ---
	var prodi models.ProgramStudi
	if err := config.DB.First(&prodi, m.ProgramStudiID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Program Studi tidak ditemukan"})
	}

	// Double check: if faculty_admin or super_admin, prodi must belong to their faculty
	if role == "faculty_admin" && prodi.FakultasID != fid {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Anda tidak diizinkan menambah mahasiswa ke Program Studi di luar fakultas Anda"})
	}
	if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		if prodi.ID != pid {
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Anda tidak diizinkan menambah mahasiswa ke Program Studi lain"})
		}
	}

	// ------------------------------------

	tx := config.DB.Begin()
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	if err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyiapkan password akun mahasiswa"})
	}

	user := models.User{
		Email:      body.Email,
		Password:   string(hashedPassword),
		Role:       "mahasiswa",
		FakultasID: &m.FakultasID,
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuat akun mahasiswa: " + err.Error()})
	}

	m.PenggunaID = user.ID
	m.StatusAkun = "Aktif"

	if err := tx.Create(&m).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuat profil mahasiswa: " + err.Error()})
	}

	tx.Commit()
	return c.Status(201).JSON(fiber.Map{"status": "success", "message": "Mahasiswa berhasil ditambahkan", "data": m})
}

func PerbaruiDataMahasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	var mhs models.Mahasiswa

	query := config.DB.Preload("Pengguna")
	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND prodi_id = ?", fid, pid)
	}

	if err := query.First(&mhs, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan atau Anda tidak memiliki akses"})
	}

	var payload struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&mhs); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}
	c.BodyParser(&payload)

	tx := config.DB.Begin()

	// Update email if requested
	if payload.Email != "" && payload.Email != mhs.Pengguna.Email {
		if err := tx.Model(&mhs.Pengguna).Update("email", payload.Email).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui email akun"})
		}
	}

	// Always ensure FakultasID stays correct
	if role == "faculty_admin" || role == "prodi_admin" {
		mhs.FakultasID = fid
	}
	if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		mhs.ProgramStudiID = pid
	}

	if err := tx.Save(&mhs).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui data mahasiswa"})
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Data mahasiswa berhasil diperbarui", "data": mhs})
}

func HapusDataMahasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	var mhs models.Mahasiswa

	query := config.DB
	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND prodi_id = ?", fid, pid)
	}

	if err := query.First(&mhs, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan atau Anda tidak memiliki akses"})
	}

	penggunaID := mhs.PenggunaID
	tx := config.DB.Begin()

	if err := tx.Unscoped().Delete(&mhs).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus profil mahasiswa"})
	}

	if err := tx.Unscoped().Delete(&models.User{}, penggunaID).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus akun mahasiswa"})
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Mahasiswa dan akun berhasil dihapus"})
}

func AmbilAkademikMahasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)
	nim := c.Params("nim")

	var mhs models.Mahasiswa
	query := config.DB
	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND prodi_id = ?", fid, pid)
	}

	if err := query.Where("nim = ?", nim).First(&mhs).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan atau Anda tidak memiliki akses"})
	}

	// Fetch from SEVIMA
	svc := services.NewSevimaSyncService()
	if svc.AppKey == "" || svc.SecretKey == "" {
		return c.JSON(fiber.Map{
			"status": "success",
			"data": fiber.Map{
				"krs":       []interface{}{},
				"transkrip": []interface{}{},
				"ipk":       mhs.IPK,
				"total_sks": mhs.TotalSKS,
			},
		})
	}

	// 1. Fetch KRS
	var krsItems []interface{}
	krsUrl := fmt.Sprintf("%s/mahasiswa/%s/krs", svc.BaseURL, nim)
	reqKrs, err := http.NewRequest("GET", krsUrl, nil)
	if err == nil {
		reqKrs.Header.Set("X-App-Key", svc.AppKey)
		reqKrs.Header.Set("X-Secret-Key", svc.SecretKey)
		reqKrs.Header.Set("Content-Type", "application/json")
		reqKrs.Header.Set("Accept", "application/json")
		resKrs, err := svc.Client.Do(reqKrs)
		if err == nil {
			defer resKrs.Body.Close()
			var krsRes struct {
				Data []struct {
					Attributes map[string]interface{} `json:"attributes"`
				} `json:"data"`
			}
			if json.NewDecoder(resKrs.Body).Decode(&krsRes) == nil {
				for _, item := range krsRes.Data {
					krsItems = append(krsItems, item.Attributes)
				}
			}
		}
	}

	// 2. Fetch Transkrip
	var transcriptItems []interface{}
	txUrl := fmt.Sprintf("%s/mahasiswa/%s/transkrip", svc.BaseURL, nim)
	reqTx, err := http.NewRequest("GET", txUrl, nil)
	var totalSks int
	var gradePoints float64
	var gradedSks int

	if err == nil {
		reqTx.Header.Set("X-App-Key", svc.AppKey)
		reqTx.Header.Set("X-Secret-Key", svc.SecretKey)
		reqTx.Header.Set("Content-Type", "application/json")
		reqTx.Header.Set("Accept", "application/json")
		resTx, err := svc.Client.Do(reqTx)
		if err == nil {
			defer resTx.Body.Close()
			var txRes struct {
				Data []struct {
					Attributes map[string]interface{} `json:"attributes"`
				} `json:"data"`
			}
			if json.NewDecoder(resTx.Body).Decode(&txRes) == nil {
				for _, item := range txRes.Data {
					attr := item.Attributes
					transcriptItems = append(transcriptItems, attr)

					// Calculate
					sksVal := attr["sks_mata_kuliah"]
					sks := 0
					if sStr, ok := sksVal.(string); ok {
						fmt.Sscanf(sStr, "%d", &sks)
					} else if sF, ok := sksVal.(float64); ok {
						sks = int(sF)
					}

					nilaiVal := attr["nilai_angka"]
					nilai := 0.0
					if nStr, ok := nilaiVal.(string); ok {
						fmt.Sscanf(nStr, "%f", &nilai)
					} else if nF, ok := nilaiVal.(float64); ok {
						nilai = nF
					}

					isLulusVal := attr["is_lulus"]
					isLulus := false
					if ilStr, ok := isLulusVal.(string); ok {
						isLulus = ilStr == "1"
					} else if ilF, ok := isLulusVal.(float64); ok {
						isLulus = ilF == 1
					} else if ilBool, ok := isLulusVal.(bool); ok {
						isLulus = ilBool
					}

					if isLulus {
						totalSks += sks
					}
					gradePoints += nilai * float64(sks)
					gradedSks += sks
				}
			}
		}
	}

	// 3. Fetch latest perwalian to sync Dosen PA
	var matchedDosenID *uint
	rawDosenName := ""
	perwalianUrl := fmt.Sprintf("%s/mahasiswa/%s/perwalian", svc.BaseURL, nim)
	reqPerwalian, err := http.NewRequest("GET", perwalianUrl, nil)
	if err == nil {
		reqPerwalian.Header.Set("X-App-Key", svc.AppKey)
		reqPerwalian.Header.Set("X-Secret-Key", svc.SecretKey)
		reqPerwalian.Header.Set("Content-Type", "application/json")
		reqPerwalian.Header.Set("Accept", "application/json")
		resPerwalian, err := svc.Client.Do(reqPerwalian)
		if err == nil {
			defer resPerwalian.Body.Close()
			var perwalianRes struct {
				Data []struct {
					Attributes map[string]interface{} `json:"attributes"`
				} `json:"data"`
			}
			if json.NewDecoder(resPerwalian.Body).Decode(&perwalianRes) == nil && len(perwalianRes.Data) > 0 {
				var latestItem *map[string]interface{}
				latestPeriod := ""
				for _, item := range perwalianRes.Data {
					pId, _ := item.Attributes["id_periode"].(string)
					if pId > latestPeriod {
						latestPeriod = pId
						latestItem = &item.Attributes
					}
				}
				if latestItem == nil && len(perwalianRes.Data) > 0 {
					latestItem = &perwalianRes.Data[0].Attributes
				}

				if latestItem != nil {
					attr := *latestItem
					nidnVal, _ := attr["nidn_penasehat"].(string)
					if nidnVal == "" {
						nidnVal, _ = attr["nidn_dosen_pembimbing"].(string)
					}
					
					dosenVal, _ := attr["penasehat"].(string)
					if dosenVal == "" {
						dosenVal, _ = attr["dosen_pembimbing"].(string)
					}
					rawDosenName = dosenVal

					if nidnVal != "" {
						var d models.Dosen
						if err := config.DB.Where("nidn = ?", nidnVal).First(&d).Error; err == nil {
							matchedDosenID = &d.ID
						}
					} else if dosenVal != "" {
						var d models.Dosen
						if err := config.DB.Where("nama = ?", dosenVal).First(&d).Error; err == nil {
							matchedDosenID = &d.ID
						}
					}
				}
			}
		}
	}

	ipk := 0.0
	if gradedSks > 0 {
		ipk = gradePoints / float64(gradedSks)
	}

	// Update local student model if it's different/updated
	dbChanged := false
	if mhs.IPK != ipk {
		mhs.IPK = ipk
		dbChanged = true
	}
	if mhs.TotalSKS != totalSks {
		mhs.TotalSKS = totalSks
		dbChanged = true
	}
	if matchedDosenID != nil && (mhs.DosenPAID == nil || *mhs.DosenPAID != *matchedDosenID) {
		mhs.DosenPAID = matchedDosenID
		dbChanged = true
	}
	if dbChanged {
		config.DB.Save(&mhs)
	}

	dosenPAName := "—"
	if mhs.DosenPAID != nil {
		var d models.Dosen
		if err := config.DB.First(&d, *mhs.DosenPAID).Error; err == nil {
			dosenPAName = d.Nama
		}
	}
	if (dosenPAName == "—" || dosenPAName == "") && rawDosenName != "" {
		dosenPAName = rawDosenName
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"krs":       krsItems,
			"transkrip": transcriptItems,
			"ipk":       ipk,
			"total_sks": totalSks,
			"dosen_pa":  dosenPAName,
		},
	})
}

// --- FAKULTAS & PRODI ---

func AmbilDaftarFakultas(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var f = []models.Fakultas{}
	query := config.DB
	if role == "faculty_admin" || role == "prodi_admin" {
		query = query.Where("id = ?", fid)
	}

	query.Find(&f)
	return c.JSON(fiber.Map{"status": "success", "data": f})
}

func AmbilDaftarProdi(c *fiber.Ctx) error {
	role, fid, pid := facultyScope(c)

	var p = []models.ProgramStudi{}
	query := config.DB.Preload("Fakultas")
	if strings.Contains(role, "faculty_admin") || (strings.Contains(role, "super_admin") && fid != 0) {
		if fid == 0 {
			return c.JSON(fiber.Map{"status": "success", "data": []models.ProgramStudi{}})
		}
		query = query.Where("fakultas_id = ?", fid)
	} else if strings.Contains(role, "prodi_admin") {
		if fid == 0 {
			return c.JSON(fiber.Map{"status": "success", "data": []models.ProgramStudi{}})
		}
		if pid > 0 {
			query = query.Where("fakultas_id = ? AND id = ?", fid, pid)
		} else {
			query = query.Where("fakultas_id = ?", fid)
		}
	}
	query.Find(&p)

	periode := c.Query("periode")
	var filterYear int
	if periode != "" && periode != "all" {
		var selectedPeriod models.AcademicPeriod
		if err := config.DB.First(&selectedPeriod, periode).Error; err == nil {
			fmt.Sscanf(selectedPeriod.AcademicYear, "%d", &filterYear)
		} else {
			fmt.Sscanf(periode, "%d", &filterYear)
		}
	}

	// Hitung jumlah mahasiswa untuk setiap prodi (Slot)
	for i := range p {
		var count int64
		q := config.DB.Model(&models.Mahasiswa{}).Where("program_studi_id = ?", p[i].ID)
		if filterYear > 0 {
			q = q.Where("tahun_masuk = ?", filterYear)
		}
		q.Count(&count)
		p[i].CurrentMahasiswa = count
	}

	return c.JSON(fiber.Map{"status": "success", "data": p})
}

func TambahProdiBaru(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var p models.ProgramStudi
	if err := c.BodyParser(&p); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	// Force FakultasID if faculty_admin / prodi_admin / super_admin
	if (role == "faculty_admin" || role == "prodi_admin") || (role == "super_admin" && p.FakultasID == 0) {
		p.FakultasID = fid
	}

	if err := config.DB.Create(&p).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menambah Program Studi"})
	}
	return c.Status(201).JSON(fiber.Map{"status": "success", "data": p})
}

func PerbaruiProdi(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	var p models.ProgramStudi

	query := config.DB
	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND id = ?", fid, pid)
	}

	if err := query.First(&p, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Prodi tidak ditemukan atau Anda tidak memiliki akses"})
	}

	if err := c.BodyParser(&p); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	// Force FakultasID
	if role == "faculty_admin" || role == "prodi_admin" {
		p.FakultasID = fid
	}

	config.DB.Save(&p)
	return c.JSON(fiber.Map{"status": "success", "message": "Data prodi berhasil diperbarui", "data": p})
}

func HapusProdi(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	var p models.ProgramStudi

	query := config.DB
	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND id = ?", fid, pid)
	}

	if err := query.First(&p, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Prodi tidak ditemukan atau Anda tidak memiliki akses"})
	}

	config.DB.Unscoped().Delete(&p)
	return c.JSON(fiber.Map{"status": "success", "message": "Program Studi berhasil dihapus"})
}

// --- PENGATURAN AKADEMIK ---

// --- PENGATURAN AKADEMIK ---

func AmbilPengaturanAkademik(c *fiber.Ctx) error {
	var period models.AcademicPeriod
	// Ambil periode yang aktif
	if err := config.DB.Where("is_aktif = ?", true).First(&period).Error; err != nil {
		// Jika tidak ada yang aktif, ambil yang terakhir dibuat
		config.DB.Order("id desc").First(&period)
	}

	// Map ke format yang diharapkan frontend
	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"id":               period.ID,
			"activeYear":       period.AcademicYear,
			"activeSemester":   period.Semester,
			"isKrsOpen":        period.IsKRSOpen,
			"isGradeInputOpen": true, // Defaulting for dashboard compatibility
			"updatedAt":        period.UpdatedAt,
		},
	})
}

func SimpanPengaturanAkademik(c *fiber.Ctx) error {
	var payload struct {
		ID               uint   `json:"id"`
		ActiveYear       string `json:"activeYear"`
		ActiveSemester   string `json:"activeSemester"`
		IsKrsOpen        bool   `json:"isKrsOpen"`
		IsGradeInputOpen bool   `json:"isGradeInputOpen"`
	}

	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Invalid payload"})
	}

	var period models.AcademicPeriod
	if payload.ID != 0 {
		config.DB.First(&period, payload.ID)
	}

	period.AcademicYear = payload.ActiveYear
	period.Semester = payload.ActiveSemester
	period.IsKRSOpen = payload.IsKrsOpen
	period.IsActive = true
	period.Name = fmt.Sprintf("%s %s", payload.ActiveSemester, payload.ActiveYear)

	// Set yang lain jadi tidak aktif jika ini aktif
	config.DB.Model(&models.AcademicPeriod{}).Where("id <> ?", period.ID).Update("is_aktif", false)

	if err := config.DB.Save(&period).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan periode: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Periode akademik diperbarui", "data": period})
}

func AmbilSemuaPeriodeAkademik(c *fiber.Ctx) error {
	var periods []models.AcademicPeriod
	if err := config.DB.Order("sevima_id desc").Find(&periods).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil data periode"})
	}
	return c.JSON(fiber.Map{"status": "success", "data": periods})
}

// --- DOSEN ---

func facultyScope(c *fiber.Ctx) (role string, fid uint, pid uint) {
	if v, ok := c.Locals("role").(string); ok {
		role = strings.ToLower(v)
	}
	if v, ok := c.Locals("fakultas_id").(uint); ok {
		fid = v
	}
	if v, ok := c.Locals("program_studi_id").(uint); ok {
		pid = v
	}
	return
}

func facultyDosenFilter(c *fiber.Ctx, query *gorm.DB) *gorm.DB {
	role, fid, pid := facultyScope(c)
	if strings.Contains(role, "faculty_admin") {
		if fid == 0 {
			return query.Where("1 = 0")
		}
		return query.Where("fakultas_id = ?", fid)
	}
	if strings.Contains(role, "prodi_admin") {
		if fid == 0 {
			return query.Where("1 = 0")
		}
		if pid > 0 {
			return query.Where("fakultas_id = ? AND program_studi_id = ?", fid, pid)
		}
		return query.Where("fakultas_id = ?", fid)
	}
	return query
}

func AmbilDaftarDosen(c *fiber.Ctx) error {
	var dosen = []models.Dosen{}
	query := config.DB.Preload("Pengguna").Preload("Fakultas").Preload("ProgramStudi")
	query = facultyDosenFilter(c, query)

	if prodiID := c.Query("program_studi_id"); prodiID != "" {
		query = query.Where("program_studi_id = ?", prodiID)
	}
	if jabatan := c.Query("jabatan"); jabatan != "" {
		query = query.Where("jabatan = ?", jabatan)
	}

	if err := query.Find(&dosen).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": dosen})
}

func TambahDosenBaru(c *fiber.Ctx) error {
	role, fid, _ := facultyScope(c)
	if fid == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Fakultas tidak terdeteksi. Hubungi admin."})
	}

	var payload struct {
		NIDN           string `json:"NIDN"`
		Nama           string `json:"Nama"`
		Email          string `json:"Email"`
		Jabatan        string `json:"Jabatan"`
		ProgramStudiID uint   `json:"ProgramStudiID"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Format data tidak valid"})
	}

	tx := config.DB.Begin()

	var user models.User
	err := tx.Where("email = ?", payload.Email).First(&user).Error
	if err == gorm.ErrRecordNotFound {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
		if err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengamankan password"})
		}
		user = models.User{
			Email:          payload.Email,
			Password:       string(hashedPassword),
			Role:           "dosen",
			FakultasID:     &fid,
			ProgramStudiID: &payload.ProgramStudiID,
		}
		if err := tx.Create(&user).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuat akun dosen: " + err.Error()})
		}
	} else if err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Database error: " + err.Error()})
	}

	if strings.Contains(role, "faculty_admin") || strings.Contains(role, "prodi_admin") {
		var prodi models.ProgramStudi
		if err := tx.First(&prodi, payload.ProgramStudiID).Error; err != nil {
			tx.Rollback()
			return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Program studi tidak ditemukan"})
		}
		if prodi.FakultasID != fid {
			tx.Rollback()
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Program studi tidak berada di fakultas Anda"})
		}
	}

	dosen := models.Dosen{
		PenggunaID:     user.ID,
		NIDN:           payload.NIDN,
		Nama:           payload.Nama,
		FakultasID:     fid,
		ProgramStudiID: payload.ProgramStudiID,
		Jabatan:        payload.Jabatan,
		Email:          payload.Email,
	}

	if err := tx.Create(&dosen).Error; err != nil {
		tx.Rollback()
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return c.Status(400).JSON(fiber.Map{"status": "error", "message": "NIDN sudah digunakan"})
		}
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan data dosen: " + err.Error()})
	}

	tx.Commit()
	return c.Status(201).JSON(fiber.Map{"status": "success", "message": "Dosen berhasil didaftarkan", "data": dosen})
}

func PerbaruiDataDosen(c *fiber.Ctx) error {
	role, fid, pid := facultyScope(c)
	id := c.Params("id")

	var dosen models.Dosen
	query := config.DB
	if strings.Contains(role, "faculty_admin") {
		if fid == 0 {
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
		}
		query = query.Where("fakultas_id = ?", fid)
	} else if strings.Contains(role, "prodi_admin") {
		if fid == 0 {
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
		}
		if pid > 0 {
			query = query.Where("fakultas_id = ? AND program_studi_id = ?", fid, pid)
		} else {
			query = query.Where("fakultas_id = ?", fid)
		}
	}

	if err := query.First(&dosen, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Dosen tidak ditemukan atau Anda tidak memiliki akses"})
	}

	var payload struct {
		NIDN           string `json:"NIDN"`
		Nama           string `json:"Nama"`
		Email          string `json:"Email"`
		Jabatan        string `json:"Jabatan"`
		ProgramStudiID uint   `json:"ProgramStudiID"`
	}
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	tx := config.DB.Begin()

	if strings.Contains(role, "faculty_admin") || strings.Contains(role, "prodi_admin") {
		var prodi models.ProgramStudi
		if err := tx.First(&prodi, payload.ProgramStudiID).Error; err != nil {
			tx.Rollback()
			return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Program studi tidak ditemukan"})
		}
		if prodi.FakultasID != fid {
			tx.Rollback()
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Program studi tidak berada di fakultas Anda"})
		}
	}

	dosen.NIDN = payload.NIDN
	dosen.Nama = payload.Nama
	dosen.FakultasID = fid
	dosen.ProgramStudiID = payload.ProgramStudiID
	dosen.Jabatan = payload.Jabatan
	dosen.Email = payload.Email

	if err := tx.Save(&dosen).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui data dosen: " + err.Error()})
	}

	if dosen.PenggunaID != 0 && payload.Email != "" {
		if err := tx.Exec("UPDATE public.users SET email = ?, fakultas_id = ?, program_studi_id = ? WHERE id = ?", payload.Email, fid, payload.ProgramStudiID, dosen.PenggunaID).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui akun terkait: " + err.Error()})
		}
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Data dosen berhasil diperbarui", "data": dosen})
}

func HapusDataDosen(c *fiber.Ctx) error {
	role, fid, pid := facultyScope(c)
	id := c.Params("id")

	var dosen models.Dosen
	query := config.DB
	if strings.Contains(role, "faculty_admin") {
		if fid == 0 {
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
		}
		query = query.Where("fakultas_id = ?", fid)
	} else if strings.Contains(role, "prodi_admin") {
		if fid == 0 {
			return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Akses ditolak"})
		}
		if pid > 0 {
			query = query.Where("fakultas_id = ? AND program_studi_id = ?", fid, pid)
		} else {
			query = query.Where("fakultas_id = ?", fid)
		}
	}

	if err := query.First(&dosen, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Dosen tidak ditemukan atau Anda tidak memiliki akses"})
	}

	penggunaID := dosen.PenggunaID
	tx := config.DB.Begin()

	if err := tx.Unscoped().Delete(&dosen).Error; err != nil {
		tx.Rollback()
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus profil dosen: " + err.Error()})
	}

	if penggunaID != 0 {
		if err := tx.Exec("DELETE FROM public.users WHERE id = ?", penggunaID).Error; err != nil {
			tx.Rollback()
			return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghapus akun dosen: " + err.Error()})
		}
	}

	tx.Commit()
	return c.JSON(fiber.Map{"status": "success", "message": "Data dosen berhasil dihapus"})
}

func AmbilPerwalianMahasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)
	nim := c.Params("nim")

	var mhs models.Mahasiswa
	query := config.DB
	if role == "faculty_admin" {
		query = query.Where("fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Where("fakultas_id = ? AND prodi_id = ?", fid, pid)
	}

	if err := query.Where("nim = ?", nim).First(&mhs).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Mahasiswa tidak ditemukan atau Anda tidak memiliki akses"})
	}

	// Fetch from SEVIMA
	svc := services.NewSevimaSyncService()
	if svc.AppKey == "" || svc.SecretKey == "" {
		return c.JSON(fiber.Map{
			"status": "success",
			"data":   []interface{}{},
		})
	}

	// 1. Fetch list of perwalian from SEVIMA
	perwalianUrl := fmt.Sprintf("%s/mahasiswa/%s/perwalian", svc.BaseURL, nim)
	req, err := http.NewRequest("GET", perwalianUrl, nil)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuat request ke SEVIMA"})
	}

	req.Header.Set("X-App-Key", svc.AppKey)
	req.Header.Set("X-Secret-Key", svc.SecretKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")

	res, err := svc.Client.Do(req)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menghubungi SEVIMA"})
	}
	defer res.Body.Close()

	type SevimaPerwalianItem struct {
		ID         string                 `json:"id"`
		Attributes map[string]interface{} `json:"attributes"`
	}
	var perwalianRes struct {
		Data []SevimaPerwalianItem `json:"data"`
	}

	if err := json.NewDecoder(res.Body).Decode(&perwalianRes); err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memproses data perwalian SEVIMA"})
	}

	// Process each perwalian item and fetch detailed KHS / match Dosen PA
	type ProcessedPerwalian struct {
		ID         string                 `json:"id"`
		Attributes map[string]interface{} `json:"attributes"`
		KHS        []interface{}          `json:"khs"`
	}

	results := make([]ProcessedPerwalian, len(perwalianRes.Data))
	if len(perwalianRes.Data) > 0 {
		type chResult struct {
			index int
			khs   []interface{}
			err   error
		}
		ch := make(chan chResult, len(perwalianRes.Data))

		for i, item := range perwalianRes.Data {
			go func(idx int, id string) {
				detailUrl := fmt.Sprintf("%s/perwalian/%s", svc.BaseURL, id)
				reqDetail, err := http.NewRequest("GET", detailUrl, nil)
				if err != nil {
					ch <- chResult{index: idx, khs: []interface{}{}, err: err}
					return
				}
				reqDetail.Header.Set("X-App-Key", svc.AppKey)
				reqDetail.Header.Set("X-Secret-Key", svc.SecretKey)
				reqDetail.Header.Set("Content-Type", "application/json")
				reqDetail.Header.Set("Accept", "application/json")

				resDetail, err := svc.Client.Do(reqDetail)
				if err != nil {
					ch <- chResult{index: idx, khs: []interface{}{}, err: err}
					return
				}
				defer resDetail.Body.Close()

				var detailRes struct {
					Attributes map[string]interface{} `json:"attributes"`
				}
				if err := json.NewDecoder(resDetail.Body).Decode(&detailRes); err != nil {
					ch <- chResult{index: idx, khs: []interface{}{}, err: err}
					return
				}

				// Extract relation.khs
				var khsItems []interface{}
				if relation, ok := detailRes.Attributes["relation"].(map[string]interface{}); ok {
					if khs, ok := relation["khs"].([]interface{}); ok {
						khsItems = khs
					}
				}

				ch <- chResult{index: idx, khs: khsItems, err: nil}
			}(i, item.ID)
		}

		for range perwalianRes.Data {
			resChan := <-ch
			if resChan.err == nil {
				results[resChan.index].KHS = resChan.khs
			} else {
				results[resChan.index].KHS = []interface{}{}
			}
		}
	}

	// Map attributes and match Dosen PA
	var matchedDosenID *uint
	for i, item := range perwalianRes.Data {
		results[i].ID = item.ID
		results[i].Attributes = item.Attributes

		// Sync Dosen PA from the latest period (first item in the list is usually latest, or we can check)
		// Let's look for nidn_penasehat or nidn_dosen_pembimbing
		if matchedDosenID == nil {
			nidnVal, _ := item.Attributes["nidn_penasehat"].(string)
			if nidnVal == "" {
				nidnVal, _ = item.Attributes["nidn_dosen_pembimbing"].(string)
			}
			
			dosenVal, _ := item.Attributes["penasehat"].(string)
			if dosenVal == "" {
				dosenVal, _ = item.Attributes["dosen_pembimbing"].(string)
			}

			if nidnVal != "" {
				var d models.Dosen
				if err := config.DB.Where("nidn = ?", nidnVal).First(&d).Error; err == nil {
					matchedDosenID = &d.ID
				}
			} else if dosenVal != "" {
				// fallback by name
				var d models.Dosen
				if err := config.DB.Where("nama = ?", dosenVal).First(&d).Error; err == nil {
					matchedDosenID = &d.ID
				}
			}
		}
	}

	// If Dosen PA ID is found and it is different, save it to DB
	if matchedDosenID != nil && (mhs.DosenPAID == nil || *mhs.DosenPAID != *matchedDosenID) {
		mhs.DosenPAID = matchedDosenID
		config.DB.Save(&mhs)
	}

	return c.JSON(fiber.Map{
		"status": "success",
		"data":   results,
	})
}

// --- END OF ACADEMIC CONTROLLERS ---

