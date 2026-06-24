package controllers

import (
	"fmt"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/gamifikasi"
	"siakad-backend/pkg/notifikasi"
	"siakad-backend/services"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// --- ASPIRASI ---

func AmbilDaftarAspirasi(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var daftar = []models.Aspirasi{}
	query := config.DB.Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Pengguna").Order("created_at desc")

	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.aspirasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.aspirasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	query.Find(&daftar)
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func TanggapiAspirasi(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	var req struct {
		Status string `json:"Status"`    // Match frontend PascalCase
		Respon string `json:"tanggapan"` // Match frontend camelCase/lowercase
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah: " + err.Error()})
	}

	// 1. Verify existence and ownership
	var aspirasi models.Aspirasi
	query := config.DB.Model(&models.Aspirasi{})
	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.aspirasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.aspirasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	if err := query.Where("mahasiswa.aspirasi.id = ?", id).First(&aspirasi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Aspirasi tidak ditemukan atau Anda tidak memiliki akses"})
	}

	// 2. Perform direct update by primary key
	if err := config.DB.Model(&models.Aspirasi{}).Where("id = ?", aspirasi.ID).Updates(map[string]interface{}{
		"status": req.Status,
		"respon": req.Respon,
	}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan tanggapan: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Aspirasi telah ditanggapi"})
}

// HapusAspirasi — Soft delete (arsipkan), admin fakultas tidak bisa hapus permanen
func HapusAspirasi(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	query := config.DB.Model(&models.Aspirasi{})
	if role == "faculty_admin" {
		query = query.Joins("Mahasiswa").Where("\"Mahasiswa\".fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("Mahasiswa").Where("\"Mahasiswa\".fakultas_id = ? AND \"Mahasiswa\".program_studi_id = ?", fid, pid)
	}

	if err := query.Where("mahasiswa.aspirasi.id = ?", id).Update("status", "diarsipkan").Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Aspirasi tidak ditemukan atau Anda tidak memiliki akses"})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Aspirasi diarsipkan"})
}

// --- PRESTASI (ACHIEVEMENT) ---

func AmbilDaftarPrestasi(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var daftar = []models.Prestasi{}
	query := config.DB.Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.Pengguna").Order("created_at desc")

	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.prestasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.prestasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	query.Find(&daftar)
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func VerifikasiPrestasi(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")
	var req struct {
		Status        string  `json:"Status"`        // Match frontend PascalCase
		Catatan       string  `json:"Catatan"`       // Match frontend PascalCase
		Poin          int     `json:"Poin"`          // Match frontend PascalCase
		DanaDisetujui float64 `json:"DanaDisetujui"` // Match frontend PascalCase
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah: " + err.Error()})
	}

	// 1. Verify existence and ownership
	var prestasi models.Prestasi
	query := config.DB.Model(&models.Prestasi{})
	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.prestasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.prestasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	if err := query.Preload("Mahasiswa").Where("mahasiswa.prestasi.id = ?", id).First(&prestasi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Prestasi tidak ditemukan atau Anda tidak memiliki akses"})
	}

	updates := map[string]interface{}{
		"status":              req.Status,
		"catatan_verifikator": req.Catatan,
	}
	if req.Poin > 0 {
		updates["poin"] = req.Poin
	}
	if req.DanaDisetujui > 0 {
		updates["dana_disetujui"] = req.DanaDisetujui
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Prestasi{}).Where("id = ?", prestasi.ID).Updates(updates).Error; err != nil {
			return err
		}

		statusLower := strings.ToLower(req.Status)
		prevStatusLower := strings.ToLower(prestasi.Status)
		isApproved := statusLower == "verified" || statusLower == "diverifikasi" || statusLower == "disetujui"
		wasApproved := prevStatusLower == "verified" || prevStatusLower == "diverifikasi" || prevStatusLower == "disetujui"

		if isApproved && !wasApproved && prestasi.RiwayatOrganisasiID != nil {
			var riwayat models.RiwayatOrganisasi
			if err := tx.First(&riwayat, *prestasi.RiwayatOrganisasiID).Error; err == nil && riwayat.OrmawaID != 0 {
				if err := gamifikasi.AwardOrmawaPoints(tx, riwayat.OrmawaID, "prestasi_terverifikasi", 100, "tambah", fmt.Sprintf("Prestasi mahasiswa di organisasi terverifikasi: %s", prestasi.NamaKegiatan)); err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan verifikasi: " + err.Error()})
	}

	// 3. Send Notification to Student
	var notifTitle, notifContent string
	statusLabel := "diverifikasi"
	if req.Status == "rejected" || req.Status == "Ditolak" {
		statusLabel = "ditolak"
	} else if req.Status == "verified" || req.Status == "Diverifikasi" || req.Status == "Disetujui" {
		statusLabel = "disetujui"
	}

	if prestasi.Tipe == "Pengajuan Dana" {
		notifTitle = "Pengajuan Dana Lomba " + strings.Title(statusLabel)
		notifContent = "Pengajuan dana lomba '" + prestasi.NamaKegiatan + "' Anda telah " + statusLabel + "."
		if statusLabel == "disetujui" && req.DanaDisetujui > 0 {
			notifContent += " Dana disetujui: Rp " + strconv.FormatFloat(req.DanaDisetujui, 'f', 0, 64) + "."
		}
	} else {
		notifTitle = "Laporan Prestasi " + strings.Title(statusLabel)
		notifContent = "Laporan prestasi '" + prestasi.NamaKegiatan + "' Anda telah " + statusLabel + "."
	}

	notifikasi.Kirim(config.DB, notifikasi.KirimParams{
		UserID:  prestasi.Mahasiswa.PenggunaID,
		Type:    "prestasi",
		Title:   notifTitle,
		Content: notifContent,
		Link:    "/student/achievement",
	})

	return c.JSON(fiber.Map{"status": "success", "message": "Prestasi diverifikasi"})
}

// SyncSimkatmawa mengirim data prestasi ke API SIMKATMAWA
func SyncSimkatmawa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	id := c.Params("id")

	// 1. Ambil data prestasi
	var prestasi models.Prestasi
	query := config.DB.Model(&models.Prestasi{}).Preload("AnggotaMahasiswa.Mahasiswa").Preload("PembimbingDosen.Dosen")

	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.prestasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.prestasi.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	if err := query.Where("mahasiswa.prestasi.id = ?", id).First(&prestasi).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Prestasi tidak ditemukan atau Anda tidak memiliki akses"})
	}

	// 2. Format payload
	mahasiswaList := []map[string]interface{}{}
	for _, m := range prestasi.AnggotaMahasiswa {
		mahasiswaList = append(mahasiswaList, map[string]interface{}{
			"nim":  m.Mahasiswa.NIM,
			"nama": m.Mahasiswa.Nama,
		})
	}

	dosenList := []map[string]interface{}{}
	for _, d := range prestasi.PembimbingDosen {
		dosenList = append(dosenList, map[string]interface{}{
			"nuptk":           d.Dosen.NIDN,
			"nama":            d.Dosen.Nama,
			"url_surat_tugas": d.SuratTugasURL,
		})
	}

	payload := map[string]interface{}{
		"level":                prestasi.Tingkat,
		"penyelenggara":        prestasi.Penyelenggara,
		"url_peserta":          prestasi.UrlPeserta,
		"url_sertifikat":       prestasi.UrlSertifikat,
		"tgl_sertifikat":       prestasi.Tanggal.Format("2006-01-02"),
		"url_foto_upp":         prestasi.UrlFotoUpp,
		"url_dokumen_undangan": prestasi.UrlDokumenUndangan,
		"keterangan":           prestasi.CatatanVerifikator,
		"mahasiswa":            mahasiswaList,
		"dosen":                dosenList,
	}

	// 3. Panggil service
	simkatmawaSvc := services.NewSimkatmawaService()
	var simkatmawaID string
	var errSync error

	if prestasi.Tipe == "Sertifikasi" {
		payload["nama"] = prestasi.NamaKegiatan
		simkatmawaID, errSync = simkatmawaSvc.PostSertifikasi(payload)
	} else if prestasi.Tipe == "Rekognisi" {
		payload["nama"] = prestasi.NamaKegiatan
		payload["jenis"] = prestasi.JenisRekognisi
		simkatmawaID, errSync = simkatmawaSvc.PostRekognisi(payload)
	} else {
		payload["kategori"] = prestasi.Kategori
		payload["lomba"] = prestasi.NamaKegiatan
		payload["cabang"] = prestasi.Cabang
		payload["peringkat"] = prestasi.Peringkat
		payload["jumlah_unit_peserta"] = strconv.Itoa(prestasi.JumlahUnitPeserta)
		payload["kelompok_prestasi"] = prestasi.KelompokPrestasi
		payload["bentuk"] = prestasi.Bentuk
		simkatmawaID, errSync = simkatmawaSvc.PostPrestasiMandiri(payload)
	}

	// 4. Update status
	if errSync != nil {
		errorMsg := "Gagal: " + errSync.Error()
		if len(errorMsg) > 50 {
			errorMsg = errorMsg[:47] + "..."
		}
		config.DB.Model(&prestasi).Updates(map[string]interface{}{
			"simkatmawa_status": errorMsg,
		})
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal sinkronisasi ke SIMKATMAWA: " + errSync.Error()})
	}

	config.DB.Model(&prestasi).Updates(map[string]interface{}{
		"simkatmawa_id":     simkatmawaID,
		"simkatmawa_status": "Sukses",
	})

	return c.JSON(fiber.Map{
		"status":        "success",
		"message":       "Sinkronisasi ke SIMKATMAWA berhasil",
		"simkatmawa_id": simkatmawaID,
	})
}

// UpdateSimkatmawaStatus update status simkatmawa manual
func UpdateSimkatmawaStatus(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		SimkatmawaStatus string `json:"simkatmawa_status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid"})
	}

	// Update langsung ke database
	if err := config.DB.Model(&models.Prestasi{}).Where("id = ?", id).Update("simkatmawa_status", req.SimkatmawaStatus).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal update status simkatmawa"})
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": "Status SIMKATMAWA berhasil diperbarui",
	})
}

// HapusPrestasi — Tidak diizinkan untuk admin fakultas
// Validasi final prestasi = opsional superadmin
func HapusPrestasi(c *fiber.Ctx) error {
	return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Admin fakultas tidak diizinkan menghapus data prestasi"})
}

// --- MBKM ---

func AmbilDaftarMBKM(c *fiber.Ctx) error {
	// ProgramMBKM tidak ada di model.go
	return c.JSON(fiber.Map{"status": "success", "data": []string{}})
}

func PerbaruiStatusMBKM(c *fiber.Ctx) error {
	return c.Status(501).JSON(fiber.Map{"status": "error", "message": "Fitur tidak tersedia"})
}

func HapusMBKM(c *fiber.Ctx) error {
	return c.Status(501).JSON(fiber.Map{"status": "error", "message": "Fitur tidak tersedia"})
}

// --- BEASISWA ---

func AmbilDaftarBeasiswa(c *fiber.Ctx) error {
	var daftar = []models.Beasiswa{}
	config.DB.Order("deadline desc").Find(&daftar)
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

// TambahBeasiswa — Program beasiswa = milik superadmin. Admin fakultas tidak bisa buat.
func TambahBeasiswa(c *fiber.Ctx) error {
	return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Program beasiswa hanya dapat dibuat oleh superadmin"})
}

// PerbaruiBeasiswa — Program beasiswa = milik superadmin.
func PerbaruiBeasiswa(c *fiber.Ctx) error {
	return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Program beasiswa hanya dapat diubah oleh superadmin"})
}

// HapusBeasiswa — Program beasiswa = milik superadmin.
func HapusBeasiswa(c *fiber.Ctx) error {
	return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Program beasiswa hanya dapat dihapus oleh superadmin"})
}

func AmbilPendaftarBeasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)
	var pid uint
	var tahunMasuk int

	// Fallback to headers for SuperAdmin or dynamic scope filtering
	headerFid := c.Get("X-Faculty-ID")
	if headerFid != "" && headerFid != "undefined" && headerFid != "null" && headerFid != "all" {
		if parsedFid, err := strconv.ParseUint(headerFid, 10, 32); err == nil {
			fid = uint(parsedFid)
			if role == "super_admin" {
				role = "faculty_admin"
			}
		}
	}

	headerPid := c.Get("X-Prodi-ID")
	if headerPid != "" && headerPid != "undefined" && headerPid != "null" && headerPid != "all" {
		if parsedPid, err := strconv.ParseUint(headerPid, 10, 32); err == nil {
			pid = uint(parsedPid)
			role = "prodi_admin"
		}
	}

	headerPeriodId := c.Get("X-Academic-Period-ID")
	if headerPeriodId != "" && headerPeriodId != "undefined" && headerPeriodId != "null" && headerPeriodId != "all" {
		if parsedPeriodId, err := strconv.ParseUint(headerPeriodId, 10, 32); err == nil {
			var selectedPeriod models.AcademicPeriod
			if err := config.DB.First(&selectedPeriod, parsedPeriodId).Error; err == nil {
				var year int
				fmt.Sscanf(selectedPeriod.AcademicYear, "%d", &year)
				if year > 0 {
					tahunMasuk = year
				}
			}
		}
	}

	var pendaftar = []models.BeasiswaPendaftaran{}
	query := config.DB.Preload("Beasiswa").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Fakultas")

	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.beasiswa_pendaftaran.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.beasiswa_pendaftaran.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	} else if role == "super_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.beasiswa_pendaftaran.mahasiswa_id")
	}

	if tahunMasuk > 0 {
		query = query.Where("mahasiswa.mahasiswa.tahun_masuk = ?", tahunMasuk)
	}

	query.Find(&pendaftar)
	return c.JSON(fiber.Map{"status": "success", "data": pendaftar})
}

func VerifikasiBeasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)

	id := c.Params("id")
	var req struct {
		Status  string `json:"status"`
		Catatan string `json:"catatan"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah"})
	}

	var application models.BeasiswaPendaftaran
	if err := config.DB.Preload("Mahasiswa").First(&application, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Pendaftaran tidak ditemukan"})
	}

	if role == "faculty_admin" {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Fakultas tidak berwenang mengambil keputusan untuk pendaftaran beasiswa"})
	}

	if req.Status == "Diterima" {
		var accepted models.BeasiswaPendaftaran
		if err := config.DB.Preload("Beasiswa").Where("mahasiswa_id = ? AND status = ? AND id != ?", application.MahasiswaID, "Diterima", application.ID).First(&accepted).Error; err == nil {
			return c.Status(400).JSON(fiber.Map{
				"status":  "error",
				"message": fmt.Sprintf("Mahasiswa ini sudah menerima beasiswa lain (%s)", accepted.Beasiswa.Nama),
			})
		}
	}

	if err := config.DB.Model(&models.BeasiswaPendaftaran{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":  req.Status,
		"catatan": req.Catatan,
	}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Status verifikasi beasiswa disimpan"})
}

func HapusPendaftarBeasiswa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)

	id := c.Params("id")
	var p models.BeasiswaPendaftaran
	if err := config.DB.Preload("Mahasiswa").First(&p, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Pendaftaran tidak ditemukan"})
	}

	if role == "faculty_admin" {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Fakultas tidak berwenang menghapus pendaftaran beasiswa"})
	}

	if err := config.DB.Unscoped().Delete(&p).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "message": "Pendaftar beasiswa dihapus"})
}

// --- ORGANISASI & PROPOSAL ---

func AmbilDaftarOrganisasi(c *fiber.Ctx) error {
	fid := c.Locals("fakultas_id").(uint)
	role := c.Locals("role").(string)

	var daftar = []models.Ormawa{}
	query := config.DB.Model(&models.Ormawa{}).Preload("Fakultas").Preload("ProgramStudi")

	if role == "faculty_admin" || role == "prodi_admin" {
		query = query.Where("fakultas_id = ?", fid)
	}

	query.Find(&daftar)
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func TambahOrganisasi(c *fiber.Ctx) error {
	var body struct {
		models.Ormawa
		Password         string `json:"Password"`
		KetuaID          *uint  `json:"KetuaID"`   // ID Mahasiswa yang jadi ketua
		KetuaNama        string `json:"KetuaNama"` // Nama ketua (optional, untuk display)
		FakultasID       *uint  `json:"fakultas_id"`
		ProgramStudiID   *uint  `json:"program_studi_id"`
		KategoriOrmawaID *uint  `json:"KategoriOrmawaID"`
	}

	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah"})
	}

	fid, _ := c.Locals("fakultas_id").(uint)
	role, _ := c.Locals("role").(string)

	org := body.Ormawa
	if body.FakultasID != nil && *body.FakultasID != 0 {
		org.FakultasID = body.FakultasID
	} else {
		org.FakultasID = nil
	}
	if body.ProgramStudiID != nil {
		org.ProgramStudiID = body.ProgramStudiID
	}
	if body.KategoriOrmawaID != nil {
		org.KategoriOrmawaID = body.KategoriOrmawaID
	}

	// Hanya Himpunan yang bisa punya Program Studi parent
	if org.Kategori != "Himpunan" && (org.KategoriOrmawaID == nil) {
		org.ProgramStudiID = nil
	}

	if role != "super_admin" && role != "kencana_admin" {
		org.FakultasID = &fid
	}

	// Transaction untuk memastikan semua berhasil atau rollback
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// 1. Create Ormawa
		if err := tx.Create(&org).Error; err != nil {
			return fmt.Errorf("gagal simpan ormawa: %v", err)
		}

		// 2. Create user for this ormawa if email & password present
		if org.Email != "" && body.Password != "" {
			hashed, _ := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
			newUser := models.User{
				Email:      org.Email,
				Password:   string(hashed),
				Role:       "ormawa",
				FakultasID: org.FakultasID,
				OrmawaID:   &org.ID,
			}
			if err := tx.Create(&newUser).Error; err != nil {
				return fmt.Errorf("gagal buat user ormawa: %v", err)
			}
		}

		// 3. Create Ketua as first member (jika KetuaID diisi)
		if body.KetuaID != nil && *body.KetuaID > 0 {
			// Verify mahasiswa exists
			var mahasiswa models.Mahasiswa
			if err := tx.First(&mahasiswa, *body.KetuaID).Error; err != nil {
				return fmt.Errorf("mahasiswa ketua tidak ditemukan: %v", err)
			}

			// Create anggota pertama (Ketua)
			anggota := models.OrmawaAnggota{
				OrmawaID:    org.ID,
				MahasiswaID: *body.KetuaID,
				Role:        "Ketua",
				Divisi:      "Pengurus Inti",
				Status:      "aktif",
				JoinedAt:    time.Now(),
			}
			if err := tx.Create(&anggota).Error; err != nil {
				return fmt.Errorf("gagal tambah ketua sebagai anggota: %v", err)
			}

			// Create atau update RiwayatOrganisasi
			year := time.Now().Year()
			periodeStr := fmt.Sprintf("%d/%d", year, year+1)

			var existingRiwayat models.RiwayatOrganisasi
			err := tx.Where("mahasiswa_id = ? AND ormawa_id = ? AND periode = ?",
				*body.KetuaID, org.ID, periodeStr).First(&existingRiwayat).Error

			if err == gorm.ErrRecordNotFound {
				// Create new
				riwayat := models.RiwayatOrganisasi{
					MahasiswaID: *body.KetuaID,
					OrmawaID:    org.ID,
					Jabatan:     "Ketua",
					Periode:     periodeStr,
					Status:      "Aktif",
				}
				if err := tx.Create(&riwayat).Error; err != nil {
					return fmt.Errorf("gagal buat riwayat organisasi: %v", err)
				}
			} else if err == nil {
				// Update existing
				tx.Model(&existingRiwayat).Updates(map[string]interface{}{
					"jabatan": "Ketua",
					"status":  "Aktif",
				})
			}

			// Update user role menjadi ormawa (jika belum)
			var userMhs models.User
			if err := tx.Where("id = ?", mahasiswa.PenggunaID).First(&userMhs).Error; err == nil {
				// Tambahkan ormawa_id ke user mahasiswa
				tx.Model(&userMhs).Updates(map[string]interface{}{
					"ormawa_id": org.ID,
				})
			}
		}

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Organisasi & Akun ditambahkan. Ketua otomatis menjadi anggota pertama."})
}

func PerbaruiOrganisasi(c *fiber.Ctx) error {
	id := c.Params("id")
	fid := c.Locals("fakultas_id").(uint)
	role := c.Locals("role").(string)

	var org models.Ormawa
	if err := config.DB.First(&org, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Organisasi tidak ditemukan"})
	}

	// Faculty scoping: pastikan admin hanya bisa edit ormawa dari fakultasnya
	if role != "super_admin" && role != "kencana_admin" && (org.FakultasID == nil || *org.FakultasID != fid) {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Anda tidak berwenang mengedit organisasi dari fakultas lain"})
	}

	var body struct {
		models.Ormawa
		Password         string `json:"Password"`
		KetuaID          *uint  `json:"KetuaID"`
		KetuaNama        string `json:"KetuaNama"`
		FakultasID       *uint  `json:"fakultas_id"`
		ProgramStudiID   *uint  `json:"program_studi_id"`
		KategoriOrmawaID *uint  `json:"KategoriOrmawaID"`
	}

	if err := c.BodyParser(&body); err != nil {
		fmt.Printf("[PerbaruiOrganisasi] Error BodyParser: %v\n", err)
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload tidak valid: " + err.Error()})
	}
	fmt.Printf("[PerbaruiOrganisasi] ID: %s, Payload: %+v\n", id, body)

	// Simpan data ormawa
	updates := map[string]interface{}{
		"nama":               body.Nama,
		"singkatan":          body.Singkatan,
		"deskripsi":          body.Deskripsi,
		"status":             body.Status,
		"kategori":           body.Kategori,
		"kategori_ormawa_id": body.KategoriOrmawaID,
		"jumlah_anggota":     body.JumlahAnggota,
		"email":              body.Email,
		"phone":              body.Phone,
	}

	if role == "super_admin" || role == "kencana_admin" {
		updates["fakultas_id"] = body.FakultasID

		if body.Kategori == "Himpunan" {
			updates["program_studi_id"] = body.ProgramStudiID
		} else {
			updates["program_studi_id"] = nil
		}
	} else {
		// Untuk Himpunan tanpa ProgramStudiID, biarkan null
		if body.Kategori != "Himpunan" {
			updates["program_studi_id"] = nil
		} else if body.ProgramStudiID != nil {
			updates["program_studi_id"] = body.ProgramStudiID
		}
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&org).Updates(updates).Error; err != nil {
			return err
		}

		// Jika password diisi, update password user-nya
		if body.Password != "" && body.Email != "" {
			var user models.User
			if err := tx.Where("ormawa_id = ?", org.ID).First(&user).Error; err == nil {
				hashed, _ := bcrypt.GenerateFromPassword([]byte(body.Password), bcrypt.DefaultCost)
				tx.Model(&user).Update("password", string(hashed))
			}
		}

		// Jika KetuaID diisi, update/create Ketua di OrmawaAnggota & RiwayatOrganisasi
		if body.KetuaID != nil && *body.KetuaID > 0 {
			// Verify mahasiswa exists
			var mahasiswa models.Mahasiswa
			if err := tx.First(&mahasiswa, *body.KetuaID).Error; err != nil {
				return fmt.Errorf("mahasiswa ketua tidak ditemukan: %v", err)
			}

			// Cek apakah sudah ada Ketua di ormawa ini
			var ketuaAnggota models.OrmawaAnggota
			err := tx.Where("ormawa_id = ? AND role = ?", org.ID, "Ketua").First(&ketuaAnggota).Error
			if err == gorm.ErrRecordNotFound {
				// Buat baru
				ketuaAnggota = models.OrmawaAnggota{
					OrmawaID:    org.ID,
					MahasiswaID: *body.KetuaID,
					Role:        "Ketua",
					Divisi:      "Pengurus Inti",
					Status:      "aktif",
					JoinedAt:    time.Now(),
				}
				if err := tx.Create(&ketuaAnggota).Error; err != nil {
					return fmt.Errorf("gagal membuat anggota ketua: %v", err)
				}
			} else if err == nil {
				// Update Ketua lama
				if err := tx.Model(&ketuaAnggota).Update("mahasiswa_id", *body.KetuaID).Error; err != nil {
					return fmt.Errorf("gagal memperbarui mahasiswa ketua: %v", err)
				}
			}

			// Update Riwayat Organisasi
			year := time.Now().Year()
			periodeStr := fmt.Sprintf("%d/%d", year, year+1)
			var riwayat models.RiwayatOrganisasi
			err = tx.Where("ormawa_id = ? AND jabatan = ? AND periode = ?", org.ID, "Ketua", periodeStr).First(&riwayat).Error
			if err == gorm.ErrRecordNotFound {
				riwayat = models.RiwayatOrganisasi{
					MahasiswaID: *body.KetuaID,
					OrmawaID:    org.ID,
					Jabatan:     "Ketua",
					Periode:     periodeStr,
					Status:      "Aktif",
				}
				tx.Create(&riwayat)
			} else if err == nil {
				tx.Model(&riwayat).Update("mahasiswa_id", *body.KetuaID)
			}
		}

		return nil
	})

	if err != nil {
		fmt.Printf("[PerbaruiOrganisasi] Error Transaction: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal memperbarui: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Organisasi diperbarui", "data": org})
}

func HapusOrganisasi(c *fiber.Ctx) error {
	id := c.Params("id")
	fid := c.Locals("fakultas_id").(uint)
	role := c.Locals("role").(string)

	var org models.Ormawa
	// Unscoped() untuk bisa lihat record yang sudah di-soft delete
	if err := config.DB.Unscoped().First(&org, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Organisasi tidak ditemukan dengan ID: " + id})
	}

	// Faculty scoping: pastikan admin hanya bisa hapus ormawa dari fakultasnya
	if role != "super_admin" && role != "kencana_admin" && (org.FakultasID == nil || *org.FakultasID != fid) {
		fmt.Printf("[HapusOrganisasi] Error Scoping: role=%s, org.FakultasID=%v, fid=%v\n", role, org.FakultasID, fid)
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Anda tidak berwenang menghapus organisasi dari fakultas lain"})
	}

	fmt.Printf("[HapusOrganisasi] Starting transaction for ID %s\n", id)

	// Transaction untuk cascade delete
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Delete related records without throwing error if empty
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaAnggota{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaKegiatan{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaMutasiSaldo{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaPengumuman{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaDivisi{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaAspirasi{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaNotifikasi{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.OrmawaRole{})
		tx.Where("ormawa_id = ?", org.ID).Delete(&models.User{})

		// 11. Delete ormawa itself
		if err := tx.Unscoped().Delete(&org).Error; err != nil {
			return fmt.Errorf("gagal hapus ormawa: %v", err)
		}

		return nil
	})

	if err != nil {
		fmt.Printf("[HapusOrganisasi] Error Transaction: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Organisasi dan semua data terkait berhasil dihapus"})
}

func AmbilDaftarProposalOrmawa(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var daftar = []models.Proposal{}
	query := config.DB.Preload("Ormawa").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Pengguna").Preload("Riwayat").Order("created_at desc")

	// ALWAYS exclude university-level ORMAWA proposals (FakultasID IS NULL)
	// Those go directly to the Universitas/Super Admin queue
	query = query.Where("fakultas_id IS NOT NULL")

	// Filter berdasarkan role: proposal hanya untuk fakultas yang bersangkutan
	if role == "faculty_admin" || role == "prodi_admin" || role == "dosen" {
		// Filter langsung berdasarkan fakultas_id pada tabel proposal
		query = query.Where("fakultas_id = ?", fid)
	}
	// super_admin/kencana_admin can see all faculty proposals (but not univ-level ones — those are in super admin route)

	query.Find(&daftar)
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func ValidasiProposalOrmawa(c *fiber.Ctx) error {
	id := c.Params("id")
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var req struct {
		Status     string `json:"status"`
		AdminNotes string `json:"catatan_admin"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah"})
	}

	var proposal models.Proposal
	if err := config.DB.First(&proposal, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"status": "error", "message": "Proposal tidak ditemukan"})
	}

	// Block faculty from validating university-level ORMAWA proposals
	if proposal.FakultasID == nil {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Proposal dari ORMAWA tingkat universitas (BEM-U, UKM, MPM) tidak memerlukan validasi fakultas. Ajukan langsung ke Universitas."})
	}

	// Faculty scoping: pastikan admin hanya bisa validasi proposal dari fakultasnya sendiri
	if role != "super_admin" && role != "kencana_admin" && *proposal.FakultasID != fid {
		return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Anda tidak berwenang memvalidasi proposal dari fakultas lain"})
	}

	// Status guard: only allow transition from "diajukan" or "revisi"
	currentStatus := strings.ToLower(strings.TrimSpace(proposal.Status))
	if currentStatus != "diajukan" && currentStatus != "revisi" {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Proposal sudah diproses, tidak bisa divalidasi lagi"})
	}

	err := config.DB.Transaction(func(tx *gorm.DB) error {
		// Update status and catatan
		if err := tx.Model(&proposal).Updates(map[string]interface{}{
			"status":  req.Status,
			"catatan": req.AdminNotes,
		}).Error; err != nil {
			return err
		}

		// Create notification for Ormawa
		pesan := fmt.Sprintf("Status proposal '%s' diperbarui oleh Fakultas menjadi: %s", proposal.Judul, req.Status)
		if req.Status == "disetujui_fakultas" {
			pesan = fmt.Sprintf("Kabar Baik! Proposal '%s' telah disetujui Fakultas dan diteruskan ke Universitas untuk pengesahan akhir.", proposal.Judul)
		} else if req.Status == "revisi" {
			pesan = fmt.Sprintf("Proposal '%s' membutuhkan revisi: %s", proposal.Judul, req.AdminNotes)
		}

		tx.Create(&models.OrmawaNotifikasi{
			OrmawaID: proposal.OrmawaID,
			Tipe:     "proposal",
			Judul:    "Update Proposal Fakultas",
			Pesan:    pesan,
		})

		return nil
	})

	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal menyimpan keputusan: " + err.Error()})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Keputusan fakultas telah disimpan dan diteruskan"})
}

func AmbilDaftarProposalFakultas(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var daftar []models.Proposal
	query := config.DB.Preload("Mahasiswa").Preload("Fakultas")

	if role == "faculty_admin" {
		// Proposals where OrmawaID is NOT set are internal faculty proposals
		query = query.Where("fakultas_id = ? AND ormawa_id IS NULL", fid)
	} else if role == "prodi_admin" {
		query = query.Where("fakultas_id = ? AND ormawa_id IS NULL", fid)
	}

	if err := query.Order("created_at desc").Find(&daftar).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal mengambil data"})
	}

	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func ValidasiProposalFakultas(c *fiber.Ctx) error {
	id := c.Params("id")
	var req struct {
		Status  string `json:"status"`
		Catatan string `json:"catatan_admin"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah"})
	}

	// Internal proposals also follow the same status pipeline
	if err := config.DB.Model(&models.Proposal{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":  req.Status,
		"catatan": req.Catatan,
	}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal update"})
	}

	return c.JSON(fiber.Map{"status": "success", "message": "Validasi internal disimpan"})
}

func AmbilDaftarPsikolog(c *fiber.Ctx) error {
	var daftar []models.Psikolog
	if err := config.DB.Order("nama asc").Find(&daftar).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": err.Error()})
	}
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func AmbilDaftarKesehatan(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var daftar = []models.Kesehatan{}
	query := config.DB.Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Pengguna")

	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.kesehatan.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.kesehatan.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	query.Order("mahasiswa.kesehatan.created_at desc").Find(&daftar)
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func AmbilRingkasanKesehatan(c *fiber.Ctx) error {
	fid := c.Locals("fakultas_id").(uint)
	role := c.Locals("role").(string)

	var total int64
	var res struct {
		BloodA  int64 `json:"bloodA"`
		BloodB  int64 `json:"bloodB"`
		BloodO  int64 `json:"bloodO"`
		BloodAB int64 `json:"bloodAB"`
	}
	var stats struct {
		Prima    int64 `json:"prima"`
		Stabil   int64 `json:"stabil"`
		Pantauan int64 `json:"pantauan"`
		Kritis   int64 `json:"kritis"`
	}

	getScopedQuery := func() *gorm.DB {
		q := config.DB.Model(&models.Kesehatan{}).
			Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.kesehatan.mahasiswa_id")
		if role == "faculty_admin" {
			return q.Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
		} else if role == "prodi_admin" {
			pid, _ := c.Locals("program_studi_id").(uint)
			return q.Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
		}
		return q
	}

	getScopedQuery().Count(&total)

	getScopedQuery().Where("golongan_darah = ?", "A").Count(&res.BloodA)

	getScopedQuery().Where("golongan_darah = ?", "B").Count(&res.BloodB)

	getScopedQuery().Where("golongan_darah = ?", "O").Count(&res.BloodO)

	getScopedQuery().Where("golongan_darah = ?", "AB").Count(&res.BloodAB)

	getScopedQuery().Where("status_kesehatan = ?", "prima").Count(&stats.Prima)

	getScopedQuery().Where("status_kesehatan = ?", "stabil").Count(&stats.Stabil)

	getScopedQuery().Where("status_kesehatan = ?", "pantauan").Count(&stats.Pantauan)

	getScopedQuery().Where("status_kesehatan = ?", "kritis").Count(&stats.Kritis)

	return c.JSON(fiber.Map{
		"status": "success",
		"data": fiber.Map{
			"total":        total,
			"distribution": res,
			"condition":    stats,
		},
	})
}

func HapusDataKesehatan(c *fiber.Ctx) error {
	return c.Status(403).JSON(fiber.Map{"status": "error", "message": "Admin fakultas tidak diizinkan menghapus data kesehatan"})
}

// --- KONSELING (PSIKOLOG BOOKING) ---

func AmbilDaftarKonseling(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	fid := c.Locals("fakultas_id").(uint)

	var daftar = []models.PsikologBooking{}
	query := config.DB.Preload("Psikolog").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.Pengguna")

	if role == "faculty_admin" {
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = psikolog.bookings.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ?", fid)
	} else if role == "prodi_admin" {
		pid, _ := c.Locals("program_studi_id").(uint)
		query = query.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = psikolog.bookings.mahasiswa_id").
			Where("mahasiswa.mahasiswa.fakultas_id = ? AND mahasiswa.mahasiswa.prodi_id = ?", fid, pid)
	}

	query.Order("psikolog.bookings.tanggal desc, psikolog.bookings.jam_mulai desc").Find(&daftar)
	return c.JSON(fiber.Map{"status": "success", "data": daftar})
}

func TambahSesiKonseling(c *fiber.Ctx) error {
	var session models.PsikologBooking
	if err := c.BodyParser(&session); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah: " + err.Error()})
	}
	config.DB.Create(&session)
	return c.JSON(fiber.Map{"status": "success", "message": "Sesi konseling berhasil dibuat", "data": session})
}

func UpdateSesiKonseling(c *fiber.Ctx) error {
	id := c.Params("id")
	var req models.PsikologBooking
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Payload salah: " + err.Error()})
	}
	config.DB.Model(&models.PsikologBooking{}).Where("id = ?", id).Save(&req)
	return c.JSON(fiber.Map{"status": "success", "message": "Data konseling dikelola"})
}

func HapusSesiKonseling(c *fiber.Ctx) error {
	id := c.Params("id")
	config.DB.Unscoped().Delete(&models.PsikologBooking{}, id)
	return c.JSON(fiber.Map{"status": "success", "message": "Sesi konseling dihapus"})
}

func ImportAchievements(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "File tidak ditemukan"})
	}

	f, err := file.Open()
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membuka file"})
	}
	defer f.Close()

	xf, err := excelize.OpenReader(f)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Format file excel tidak valid"})
	}
	defer xf.Close()

	sheets := xf.GetSheetList()
	if len(sheets) == 0 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "File excel kosong"})
	}
	sheet := sheets[0]

	rows, err := xf.GetRows(sheet)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"status": "error", "message": "Gagal membaca baris"})
	}

	if len(rows) < 2 {
		return c.Status(400).JSON(fiber.Map{"status": "error", "message": "Data kosong"})
	}

	var imported int
	var failed []string

	for i, row := range rows {
		if i == 0 {
			continue // skip header
		}
		// Expected: NIM | Nama Prestasi | Tipe | Level | Kategori | Peringkat | Penyelenggara | Tahun | Cabang | Bentuk | Kelompok | URL Sertifikat | Simkatmawa ID
		if len(row) < 8 {
			failed = append(failed, fmt.Sprintf("Baris %d: Kolom tidak lengkap", i+1))
			continue
		}

		nim := strings.TrimSpace(row[0])
		if nim == "" {
			continue
		}

		var mhs models.Mahasiswa
		if err := config.DB.Where("nim = ?", nim).First(&mhs).Error; err != nil {
			failed = append(failed, fmt.Sprintf("Baris %d: NIM %s tidak ditemukan", i+1, nim))
			continue
		}

		yearStr := row[7]
		yearInt, _ := strconv.Atoi(yearStr)
		if yearInt == 0 {
			yearInt = time.Now().Year()
		}

		prestasi := models.Prestasi{
			MahasiswaID:      mhs.ID,
			NamaKegiatan:     row[1],
			Tipe:             row[2], // Mandiri / Sertifikasi / Rekognisi
			Tingkat:          row[3], // NAS/PROV/KAB/INT
			Kategori:         row[4], // RISNOV / SENBUD / OLAHRAGA / MINAT
			Peringkat:        row[5],
			Penyelenggara:    row[6],
			Tanggal:          time.Date(yearInt, 1, 1, 0, 0, 0, 0, time.UTC),
			Cabang:           safelyGetCol(row, 8),
			Bentuk:           safelyGetCol(row, 9),
			KelompokPrestasi: safelyGetCol(row, 10),
			UrlSertifikat:    safelyGetCol(row, 11),
			Status:           "Disetujui",
			Poin:             10,
		}

		simkatmawaId := safelyGetCol(row, 12)
		if simkatmawaId != "" {
			prestasi.SimkatmawaId = simkatmawaId
			prestasi.SimkatmawaStatus = "Disinkronkan"
		}

		if err := config.DB.Create(&prestasi).Error; err != nil {
			failed = append(failed, fmt.Sprintf("Baris %d: Gagal menyimpan data", i+1))
			continue
		}

		// Connect to mahasiswa
		pm := models.PrestasiMahasiswa{
			PrestasiID:  prestasi.ID,
			MahasiswaID: mhs.ID,
		}
		config.DB.Create(&pm)
		imported++
	}

	return c.JSON(fiber.Map{
		"status":  "success",
		"message": fmt.Sprintf("Berhasil import %d data. Gagal: %d data.", imported, len(failed)),
		"failed":  failed,
	})
}

func safelyGetCol(row []string, index int) string {
	if index < len(row) {
		return strings.TrimSpace(row[index])
	}
	return ""
}
