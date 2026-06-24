package kencana

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/pkg/notifikasi"
	"siakad-backend/services"
	"siakad-backend/utils"
	"strings"
	"time"

	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/chai2010/webp"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/jung-kurt/gofpdf"
	"gorm.io/gorm"
)

func kencanaAdminScope(c *fiber.Ctx) (role string, fakultasID uint) {
	role, _ = c.Locals("role").(string)
	role = strings.ToLower(role)
	if strings.Contains(role, "kencana_fakultas") {
		role = "kencana_fakultas"
	}
	if v, ok := c.Locals("fakultas_id").(float64); ok {
		fakultasID = uint(v)
	} else if v, ok := c.Locals("fakultas_id").(uint); ok {
		fakultasID = v
	} else if v, ok := c.Locals("fakultas_id").(int); ok {
		fakultasID = uint(v)
	}
	return role, fakultasID
}

func applyKencanaMentorScope(c *fiber.Ctx, q *gorm.DB) *gorm.DB {
	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_admin" {
		return q.Where("scope_type = ?", "university")
	}
	if strings.Contains(role, "fakultas") || strings.Contains(role, "faculty") || role == "kencana_fakultas" {
		return q.Where("scope_type = ? AND fakultas_id = ?", "faculty", fakultasID)
	}
	return q
}

const (
	kencanaPhaseDraft     = "draft"
	kencanaPhaseReady     = "ready"
	kencanaPhaseActive    = "active"
	kencanaPhaseCompleted = "completed"
	kencanaPhaseNotOpen   = "not_open"

	scopeTypeUniversity = "university"
	scopeTypeFaculty    = "faculty"
)

var kencanaTimelineTypes = []string{"pra_kencana", "kencana_universitas", "kencana_fakultas", "pasca_kencana"}

func isKencanaUniversityCompleted(period models.KencanaPeriod) bool {
	var phases []models.KencanaTimelinePhase
	if err := config.DB.Where("period_id = ? AND phase_type IN ?", period.ID, []string{"pra_kencana", "kencana_universitas"}).Find(&phases).Error; err != nil {
		return false
	}
	for _, p := range phases {
		if p.Status != kencanaPhaseCompleted {
			return false
		}
	}
	return true
}

func EnsureFacultyPhases(periodID uint) error {
	var faculties []models.Fakultas
	if err := config.DB.Order("nama asc").Find(&faculties).Error; err != nil {
		return err
	}
	for _, faculty := range faculties {
		phase := models.KencanaFacultyPhase{PeriodID: periodID, FakultasID: faculty.ID, Status: kencanaPhaseNotOpen}
		if err := config.DB.Where("period_id = ? AND fakultas_id = ?", periodID, faculty.ID).FirstOrCreate(&phase).Error; err != nil {
			return err
		}
	}
	return nil
}

func EnsureTimelinePhases(periodID uint) error {
	for _, phaseType := range kencanaTimelineTypes {
		phase := models.KencanaTimelinePhase{PeriodID: periodID, PhaseType: phaseType, Status: kencanaPhaseDraft}
		if err := config.DB.Where("period_id = ? AND phase_type = ?", periodID, phaseType).FirstOrCreate(&phase).Error; err != nil {
			return err
		}
	}
	return nil
}

func syncKencanaFacultyRollup(periodID uint) {
	var count int64
	config.DB.Model(&models.KencanaFacultyPhase{}).Where("period_id = ? AND status != ?", periodID, kencanaPhaseCompleted).Count(&count)

	if count == 0 {
		config.DB.Model(&models.KencanaTimelinePhase{}).Where("period_id = ? AND phase_type = ?", periodID, "kencana_fakultas").Updates(map[string]any{
			"status":    kencanaPhaseCompleted,
			"is_active": false,
		})
	} else {
		var globalPhase models.KencanaTimelinePhase
		if err := config.DB.Where("period_id = ? AND phase_type = ?", periodID, "kencana_fakultas").First(&globalPhase).Error; err == nil {
			if globalPhase.Status == kencanaPhaseCompleted {
				config.DB.Model(&globalPhase).Updates(map[string]any{
					"status":    kencanaPhaseActive,
					"is_active": true,
				})
			}
		}
	}
}

func facultyPhaseForRequest(c *fiber.Ctx, periodID uint) (*models.KencanaFacultyPhase, error) {
	role, fakultasID := kencanaAdminScope(c)
	if role == "super_admin" || role == "kencana_admin" {
		if queryFakultasID := uint(c.QueryInt("fakultas_id")); queryFakultasID != 0 {
			fakultasID = queryFakultasID
		} else {
			var firstFaculty models.Fakultas
			if err := config.DB.Order("nama asc").First(&firstFaculty).Error; err == nil {
				fakultasID = firstFaculty.ID
			}
		}
	}
	if fakultasID == 0 {
		return nil, fiber.NewError(fiber.StatusBadRequest, "Fakultas belum tersedia atau belum dipilih")
	}
	var phase models.KencanaFacultyPhase
	err := config.DB.Preload("Fakultas").Where("period_id = ? AND fakultas_id = ?", periodID, fakultasID).First(&phase).Error
	if err == gorm.ErrRecordNotFound {
		phase = models.KencanaFacultyPhase{PeriodID: periodID, FakultasID: fakultasID, Status: kencanaPhaseNotOpen}
		err = config.DB.Create(&phase).Error
	}
	if err != nil {
		return nil, err
	}
	return &phase, nil
}

func activeOrRequestedPeriod(c *fiber.Ctx) (*models.KencanaPeriod, error) {
	periodID := uint(c.QueryInt("period_id"))
	var period models.KencanaPeriod
	if periodID != 0 {
		if err := config.DB.First(&period, periodID).Error; err != nil {
			return nil, err
		}
		return &period, nil
	}
	return activePeriod(config.DB)
}

func ListPeriods(c *fiber.Ctx) error {
	var periods []models.KencanaPeriod
	if err := config.DB.Order("name desc").Find(&periods).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode"})
	}
	return c.JSON(fiber.Map{"success": true, "data": periods})
}

func CreatePeriod(c *fiber.Ctx) error {
	var period models.KencanaPeriod
	if err := c.BodyParser(&period); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload periode tidak valid"})
	}
	if period.Name == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Nama periode wajib diisi"})
	}

	uid, _ := userID(c)
	period.CreatedBy = &uid
	period.Status = kencanaPhaseDraft
	period.UniversityPhaseStatus = kencanaPhaseDraft

	// Set defaults if 0
	if period.PassingGrade == 0 {
		period.PassingGrade = 60
	}
	if period.RemedialGrade == 0 {
		period.RemedialGrade = 50
	}

	// Coba deteksi tahun dari nama, misalnya "PKKMB 2026"
	if period.Year == 0 {
		importRe := regexp.MustCompile(`\d{4}`)
		if matches := importRe.FindString(period.Name); matches != "" {
			var parsedYear int
			fmt.Sscanf(matches, "%d", &parsedYear)
			period.Year = parsedYear
		} else {
			period.Year = time.Now().Year()
		}
	}

	if err := config.DB.Create(&period).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat periode"})
	}

	// Auto prepare phases
	EnsureTimelinePhases(period.ID)
	EnsureFacultyPhases(period.ID)

	return c.JSON(fiber.Map{"success": true, "message": "Periode berhasil dibuat", "data": period})
}

func SyncFromSevimaPeriod(c *fiber.Ctx) error {
	uid, _ := userID(c)
	var academicPeriods []models.AcademicPeriod

	// Cari semua periode Ganjil dari Sevima
	if err := config.DB.Where("semester = ?", "Ganjil").Find(&academicPeriods).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat periode akademik"})
	}

	syncedCount := 0
	for _, ap := range academicPeriods {
		// Ekstrak tahun (contoh: "2025/2026" atau "2025 Genap", kita ambil 4 digit pertama)
		year := ""
		if len(ap.AcademicYear) >= 4 {
			year = ap.AcademicYear[:4]
		} else if len(ap.Name) >= 4 {
			year = ap.Name[:4]
		}

		if year == "" {
			continue
		}

		var parsedYear int
		fmt.Sscanf(year, "%d", &parsedYear)

		expectedName := fmt.Sprintf("PKKMB %s", year)

		var existing models.KencanaPeriod
		err := config.DB.Where("name = ?", expectedName).First(&existing).Error

		if err == gorm.ErrRecordNotFound {
			// Buat periode Kencana baru berdasarkan Ganjil ini
			newPeriod := models.KencanaPeriod{
				Name:                  expectedName,
				Year:                  parsedYear,
				Description:           fmt.Sprintf("Sinkronisasi otomatis dari periode akademik %s", ap.Name),
				Status:                kencanaPhaseDraft,
				UniversityPhaseStatus: kencanaPhaseDraft,
				PassingGrade:          60,
				RemedialGrade:         50,
				CreatedBy:             &uid,
			}

			// Jika periode akademiknya sedang aktif, jadikan status PKKMB-nya minimal aktif
			if ap.IsActive {
				newPeriod.Status = "active"
			}

			if errCreate := config.DB.Create(&newPeriod).Error; errCreate == nil {
				EnsureTimelinePhases(newPeriod.ID)
				EnsureFacultyPhases(newPeriod.ID)
				syncedCount++
			}
		}
	}

	return c.JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Berhasil menyinkronkan %d periode PKKMB baru", syncedCount),
		"synced":  syncedCount,
	})
}

func GetPeriodPhases(c *fiber.Ctx) error {
	var period models.KencanaPeriod
	if err := config.DB.First(&period, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
	}
	if err := EnsureTimelinePhases(period.ID); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyiapkan timeline Kencana"})
	}
	if err := EnsureFacultyPhases(period.ID); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyiapkan fase fakultas"})
	}
	var timelinePhases []models.KencanaTimelinePhase
	if err := config.DB.Where("period_id = ?", period.ID).Order("phase_type asc").Find(&timelinePhases).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat timeline Kencana"})
	}
	var phases []models.KencanaFacultyPhase
	if err := config.DB.Preload("Fakultas").Where("period_id = ?", period.ID).Order("fakultas_id asc").Find(&phases).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat fase fakultas"})
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"period": period, "timeline_phases": timelinePhases, "faculty_phases": phases}})
}

func UpdateTimelinePhase(c *fiber.Ctx) error {
	type reqBody struct {
		StartDate string `json:"start_date"`
		EndDate   string `json:"end_date"`
		Status    string `json:"status"`
		IsActive  bool   `json:"is_active"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload timeline tidak valid"})
	}
	var periodID uint
	fmt.Sscanf(c.Params("id"), "%d", &periodID)
	phaseType := c.Params("phaseType")
	if periodID == 0 || phaseType == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode dan fase wajib diisi"})
	}
	if err := EnsureTimelinePhases(periodID); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyiapkan timeline Kencana"})
	}
	var phase models.KencanaTimelinePhase
	if err := config.DB.Where("period_id = ? AND phase_type = ?", periodID, phaseType).First(&phase).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Timeline fase tidak ditemukan"})
	}
	uid, _ := userID(c)
	if req.StartDate != "" {
		startDate, err := time.Parse("2006-01-02", req.StartDate)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format tanggal mulai tidak valid"})
		}
		phase.StartDate = &startDate
	} else {
		phase.StartDate = nil
	}
	if req.EndDate != "" {
		endDate, err := time.Parse("2006-01-02", req.EndDate)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Format tanggal selesai tidak valid"})
		}
		phase.EndDate = &endDate
	} else {
		phase.EndDate = nil
	}
	phase.UpdatedBy = &uid
	if req.Status != "" {
		phase.Status = req.Status
	}
	if req.IsActive {
		// Strict mode check: Is there any OTHER active phase?
		var activePhase models.KencanaTimelinePhase
		if err := config.DB.Where("period_id = ? AND is_active = ? AND phase_type != ?", periodID, true, phaseType).First(&activePhase).Error; err == nil {
			return c.Status(400).JSON(fiber.Map{
				"success": false,
				"message": "Tidak bisa memulai. Harap Akhiri tahap yang sedang aktif saat ini terlebih dahulu!",
			})
		}

		// Strict mode check 2: Sequence validation
		var prevPhaseType string
		switch phaseType {
		case "kencana_universitas":
			prevPhaseType = "pra_kencana"
		case "kencana_fakultas":
			prevPhaseType = "kencana_universitas"
		case "pasca_kencana":
			prevPhaseType = "kencana_fakultas"
		}

		if prevPhaseType != "" {
			var prevPhase models.KencanaTimelinePhase
			if err := config.DB.Where("period_id = ? AND phase_type = ?", periodID, prevPhaseType).First(&prevPhase).Error; err == nil {
				if prevPhase.Status != kencanaPhaseCompleted {
					// Format nama tahap untuk pesan error
					namaTahap := prevPhaseType
					if namaTahap == "pra_kencana" {
						namaTahap = "Pra-Kencana"
					}
					if namaTahap == "kencana_universitas" {
						namaTahap = "Kencana Universitas"
					}
					if namaTahap == "kencana_fakultas" {
						namaTahap = "Kencana Fakultas"
					}

					return c.Status(400).JSON(fiber.Map{
						"success": false,
						"message": "Tidak bisa melompati tahap. Harap selesaikan tahap " + namaTahap + " terlebih dahulu!",
					})
				}
			}
		}

		if err := config.DB.Model(&models.KencanaTimelinePhase{}).Where("period_id = ?", periodID).Updates(map[string]any{"is_active": false}).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menonaktifkan timeline lain"})
		}

		// Jangan matikan is_published untuk stage yang sudah 'completed'
		// Biarkan riwayat tahap sebelumnya tetap tampil di mahasiswa

		phase.IsActive = true
		phase.Status = kencanaPhaseActive

		// Auto-sync Sevima (Edlink) period & participants in background
		go func() {
			svc := services.NewSevimaSyncService()
			if _, err := svc.SyncPeriode(); err != nil {
				fmt.Printf("[AutoSync] Error syncing periode: %v\n", err)
			}
			if _, err := svc.SyncPMB(); err != nil {
				fmt.Printf("[AutoSync] Error pulling PMB from Sevima: %v\n", err)
			}
			if _, err := svc.SyncPMBToKencana(); err != nil {
				fmt.Printf("[AutoSync] Error syncing PMB/Mahasiswa: %v\n", err)
			}
		}()
	} else {
		phase.IsActive = false
	}
	if err := config.DB.Save(&phase).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan timeline fase"})
	}

	// Sinkronisasi is_published dan status di KencanaStage
	stageUpdates := map[string]any{
		"status": phase.Status,
	}
	if phase.Status == kencanaPhaseCompleted {
		stageUpdates["is_published"] = true
	} else {
		stageUpdates["is_published"] = phase.IsActive
	}
	config.DB.Model(&models.KencanaStage{}).Where("period_id = ? AND type = ?", periodID, phaseType).Updates(stageUpdates)

	return c.JSON(fiber.Map{"success": true, "data": phase})
}

func UpdateUniversityPhase(c *fiber.Ctx) error {
	var period models.KencanaPeriod
	if err := config.DB.First(&period, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
	}
	action := strings.ToLower(c.Params("action"))
	switch action {
	case "start":
		period.UniversityPhaseStatus = kencanaPhaseActive
		period.Status = "active"

		// Auto-sync Sevima (Edlink) period & participants in background
		go func() {
			svc := services.NewSevimaSyncService()
			if _, err := svc.SyncPeriode(); err != nil {
				fmt.Printf("[AutoSync] Error syncing periode: %v\n", err)
			}
			if _, err := svc.SyncPMB(); err != nil {
				fmt.Printf("[AutoSync] Error pulling PMB from Sevima: %v\n", err)
			}
			if _, err := svc.SyncPMBToKencana(); err != nil {
				fmt.Printf("[AutoSync] Error syncing PMB/Mahasiswa: %v\n", err)
			}
		}()
		config.DB.Model(&models.KencanaStage{}).Where("period_id = ? AND (fakultas_id IS NULL OR fakultas_id = 0) AND type = ?", period.ID, "kencana_universitas").UpdateColumns(map[string]interface{}{"status": "active", "is_published": true})
	case "complete":
		period.UniversityPhaseStatus = kencanaPhaseCompleted
		config.DB.Model(&models.KencanaStage{}).Where("period_id = ? AND fakultas_id IS NULL AND status = ?", period.ID, "active").Update("status", "completed")
	case "reset":
		period.UniversityPhaseStatus = kencanaPhaseDraft
		period.Status = "draft"
	default:
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Aksi fase universitas tidak valid"})
	}
	if err := config.DB.Save(&period).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui fase universitas"})
	}
	return c.JSON(fiber.Map{"success": true, "data": period})
}

func OpenFacultyPhases(c *fiber.Ctx) error {
	var period models.KencanaPeriod
	if err := config.DB.First(&period, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
	}
	if !isKencanaUniversityCompleted(period) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kencana Fakultas baru bisa dibuka setelah Kencana University selesai"})
	}
	if err := EnsureFacultyPhases(period.ID); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyiapkan fase fakultas"})
	}
	if err := config.DB.Model(&models.KencanaFacultyPhase{}).Where("period_id = ? AND status = ?", period.ID, kencanaPhaseNotOpen).Updates(map[string]any{"status": kencanaPhaseReady, "is_published": true}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuka fase fakultas"})
	}
	syncKencanaFacultyRollup(period.ID)
	return GetPeriodPhases(c)
}

func GetFacultyPhase(c *fiber.Ctx) error {
	period, err := activeOrRequestedPeriod(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode Kencana tidak ditemukan"})
	}
	phase, err := facultyPhaseForRequest(c, period.ID)
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"success": false, "message": fiberErr.Message})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat fase fakultas"})
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{"period": period, "phase": phase, "university_completed": isKencanaUniversityCompleted(*period)}})
}

func UpdateFacultyPhase(c *fiber.Ctx) error {
	type reqBody struct {
		PeriodID    uint       `json:"period_id"`
		FakultasID  uint       `json:"fakultas_id"`
		StartDate   *time.Time `json:"start_date"`
		EndDate     *time.Time `json:"end_date"`
		Theme       string     `json:"theme"`
		Status      string     `json:"status"`
		IsPublished bool       `json:"is_published"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload fase fakultas tidak valid"})
	}
	if req.PeriodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode aktif tidak ditemukan"})
		}
		req.PeriodID = period.ID
	}
	var period models.KencanaPeriod
	if err := config.DB.First(&period, req.PeriodID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
	}
	if !isKencanaUniversityCompleted(period) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kencana Fakultas baru bisa diatur setelah Kencana University selesai"})
	}
	var phase *models.KencanaFacultyPhase
	var err error
	role, _ := kencanaAdminScope(c)
	if (role == "super_admin" || role == "kencana_admin") && req.FakultasID != 0 {
		var scopedPhase models.KencanaFacultyPhase
		err = config.DB.Preload("Fakultas").Where("period_id = ? AND fakultas_id = ?", req.PeriodID, req.FakultasID).First(&scopedPhase).Error
		if err == gorm.ErrRecordNotFound {
			scopedPhase = models.KencanaFacultyPhase{PeriodID: req.PeriodID, FakultasID: req.FakultasID, Status: kencanaPhaseNotOpen}
			err = config.DB.Create(&scopedPhase).Error
		}
		phase = &scopedPhase
	} else {
		phase, err = facultyPhaseForRequest(c, req.PeriodID)
	}
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"success": false, "message": fiberErr.Message})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat fase fakultas"})
	}
	phase.StartDate = req.StartDate
	phase.EndDate = req.EndDate
	phase.Theme = req.Theme
	phase.IsPublished = req.IsPublished
	if req.Status == kencanaPhaseReady || req.Status == kencanaPhaseActive || req.Status == kencanaPhaseCompleted || req.Status == "inactive" {
		phase.Status = req.Status
	}
	if err := config.DB.Save(phase).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan fase fakultas"})
	}
	syncKencanaFacultyRollup(phase.PeriodID)
	return c.JSON(fiber.Map{"success": true, "data": phase})
}

func StartFacultyPhase(c *fiber.Ctx) error {
	period, err := activeOrRequestedPeriod(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode Kencana tidak ditemukan"})
	}
	if !isKencanaUniversityCompleted(*period) {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Kencana Fakultas baru bisa dimulai setelah Kencana University selesai"})
	}
	phase, err := facultyPhaseForRequest(c, period.ID)
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"success": false, "message": fiberErr.Message})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat fase fakultas"})
	}
	uid, _ := userID(c)
	phase.Status = kencanaPhaseActive
	phase.IsPublished = true
	phase.StartedBy = &uid
	if err := config.DB.Save(phase).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memulai Kencana Fakultas"})
	}
	return c.JSON(fiber.Map{"success": true, "data": phase})
}

func CompleteFacultyPhase(c *fiber.Ctx) error {
	period, err := activeOrRequestedPeriod(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode Kencana tidak ditemukan"})
	}
	phase, err := facultyPhaseForRequest(c, period.ID)
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"success": false, "message": fiberErr.Message})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat fase fakultas"})
	}
	uid, _ := userID(c)

	// Validasi: Cegah Salah Pencet (Cek apakah semua Maba sudah terplot)
	var totalStudents int64
	if err := config.DB.Model(&models.Mahasiswa{}).
		Where("fakultas_id = ? AND tahun_masuk = ? AND status_akademik IN ('Aktif')", phase.FakultasID, period.Year).
		Count(&totalStudents).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghitung jumlah mahasiswa aktif"})
	}

	var assignedStudents int64
	if err := config.DB.Model(&models.KencanaMentorAssignment{}).
		Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa.kencana_mentor_assignments.student_id").
		Where("mahasiswa.kencana_mentor_assignments.period_id = ? AND m.fakultas_id = ? AND mahasiswa.kencana_mentor_assignments.status = 'active'", period.ID, phase.FakultasID).
		Count(&assignedStudents).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghitung mahasiswa yang sudah diplot"})
	}

	if assignedStudents < totalStudents {
		return c.Status(400).JSON(fiber.Map{
			"success": false, 
			"message": fmt.Sprintf("Tidak dapat menyelesaikan fase. Ada %d mahasiswa yang belum mendapatkan kelompok/mentor.", totalStudents-assignedStudents),
		})
	}

	phase.Status = kencanaPhaseCompleted
	phase.CompletedBy = &uid
	if err := config.DB.Save(phase).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyelesaikan Kencana Fakultas"})
	}

	syncKencanaFacultyRollup(period.ID)

	return c.JSON(fiber.Map{"success": true, "data": phase})
}

func UndoFacultyPhase(c *fiber.Ctx) error {
	period, err := activeOrRequestedPeriod(c)
	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode Kencana tidak ditemukan"})
	}

	// Pastikan Tahap Pasca Kencana belum jalan
	var pascaPhase models.KencanaTimelinePhase
	if err := config.DB.Where("period_id = ? AND phase_type = ?", period.ID, "pasca_kencana").First(&pascaPhase).Error; err == nil {
		if pascaPhase.Status == kencanaPhaseActive || pascaPhase.Status == kencanaPhaseCompleted {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tidak dapat membatalkan. Tahap Pasca-Kencana sudah berjalan."})
		}
	}

	phase, err := facultyPhaseForRequest(c, period.ID)
	if err != nil {
		if fiberErr, ok := err.(*fiber.Error); ok {
			return c.Status(fiberErr.Code).JSON(fiber.Map{"success": false, "message": fiberErr.Message})
		}
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat fase fakultas"})
	}

	if phase.Status != kencanaPhaseCompleted {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Fase belum selesai, tidak perlu dibatalkan"})
	}

	phase.Status = kencanaPhaseActive
	phase.CompletedBy = nil

	if err := config.DB.Save(phase).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membatalkan Kencana Fakultas"})
	}

	syncKencanaFacultyRollup(period.ID)

	return c.JSON(fiber.Map{"success": true, "data": phase})
}

func ListStages(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)
	var fid *uint
	if role == "kencana_fakultas" {
		fid = &fakultasID
	} else {
		if reqFakultasID := c.QueryInt("fakultas_id"); reqFakultasID != 0 {
			uFid := uint(reqFakultasID)
			fid = &uFid
		}
	}

	materialCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("order_number asc")
		}
		return db.Where("fakultas_id IS NULL").Order("order_number asc")
	}

	quizCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("created_at asc")
		}
		return db.Where("fakultas_id IS NULL").Order("created_at asc")
	}

	assignmentCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("created_at asc")
		}
		return db.Where("fakultas_id IS NULL").Order("created_at asc")
	}

	var stages []models.KencanaStage
	q := config.DB.
		Preload("Sessions", func(db *gorm.DB) *gorm.DB { return db.Order("order_number asc") }).
		Preload("Sessions.Materials", materialCond).
		Preload("Sessions.Quizzes", quizCond).
		Preload("Sessions.Assignments", assignmentCond).
		Order("period_id desc, order_number asc")
	if periodID := c.Query("period_id"); periodID != "" {
		q = q.Where("period_id = ?", periodID)
	}
	if stageType := c.Query("type"); stageType != "" {
		if stageType == "kencana_universitas" {
			q = q.Where("type IN ?", []string{"kencana_universitas", "university"})
		} else {
			q = q.Where("type = ?", stageType)
		}
	}
	if role == "super_admin" || role == "kencana_admin" {
		if reqFakultasID := c.Query("fakultas_id"); reqFakultasID != "" {
			q = q.Where("fakultas_id = ?", reqFakultasID)
		} else {
			q = q.Where("fakultas_id IS NULL")
		}
	} else if role == "kencana_fakultas" {
		q = q.Where("fakultas_id = ?", fakultasID)
	}
	if err := q.Find(&stages).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat tahap"})
	}
	return c.JSON(fiber.Map{"success": true, "data": stages})
}

func CreateStage(c *fiber.Ctx) error {
	var stage models.KencanaStage
	if err := c.BodyParser(&stage); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload Tahap tidak valid"})
	}
	role, fakultasID := kencanaAdminScope(c)
	uid, _ := userID(c)
	stage.CreatedBy = &uid
	if role == "kencana_fakultas" {
		if fakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		var period models.KencanaPeriod
		if err := config.DB.First(&period, stage.PeriodID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
		}
		if !isKencanaUniversityCompleted(period) {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tahap fakultas baru bisa dibuat setelah Kencana University selesai"})
		}
		_, err := facultyPhaseForRequest(c, stage.PeriodID)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Fase Kencana Fakultas tidak ditemukan"})
		}
		stage.FakultasID = &fakultasID
		stage.Type = "faculty"
	} else if role == "super_admin" || role == "kencana_admin" {
		if stage.Type != "faculty" {
			stage.FakultasID = nil
			if stage.Type == "" {
				stage.Type = "kencana_universitas"
			}
		} else if stage.FakultasID == nil || *stage.FakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Fakultas wajib dipilih untuk timeline fakultas"})
		}
	}
	if err := config.DB.Create(&stage).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat Tahap"})
	}
	return c.JSON(fiber.Map{"success": true, "data": stage})
}

func UpdateStage(c *fiber.Ctx) error {
	var stage models.KencanaStage
	role, fakultasID := kencanaAdminScope(c)
	q := config.DB
	if role == "kencana_fakultas" {
		q = q.Where("fakultas_id = ?", fakultasID)
	}
	if err := q.First(&stage, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Tahap tidak ditemukan atau di luar scope"})
	}
	if err := c.BodyParser(&stage); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload Tahap tidak valid"})
	}
	if role == "kencana_fakultas" {
		stage.FakultasID = &fakultasID
		stage.Type = "faculty"
	} else if role == "super_admin" || role == "kencana_admin" {
		if stage.Type != "faculty" {
			stage.FakultasID = nil
			if stage.Type == "" {
				stage.Type = "kencana_universitas"
			}
		}
	}
	if err := config.DB.Save(&stage).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui Tahap"})
	}
	return c.JSON(fiber.Map{"success": true, "data": stage})
}
func ListSessions(c *fiber.Ctx) error {
	var sessions []models.KencanaSession

	role, fakultasID := kencanaAdminScope(c)
	var fid *uint
	if role == "kencana_fakultas" {
		fid = &fakultasID
	} else {
		if reqFakultasID := c.QueryInt("fakultas_id"); reqFakultasID != 0 {
			uFid := uint(reqFakultasID)
			fid = &uFid
		}
	}

	materialCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("order_number asc")
		}
		return db.Where("fakultas_id IS NULL").Order("order_number asc")
	}

	quizCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("created_at asc")
		}
		return db.Where("fakultas_id IS NULL").Order("created_at asc")
	}

	assignmentCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("created_at asc")
		}
		return db.Where("fakultas_id IS NULL").Order("created_at asc")
	}

	q := config.DB.Preload("Materials", materialCond).
		Preload("Quizzes", quizCond).
		Preload("Assignments", assignmentCond).
		Order("stage_id desc, order_number asc")

	if stageID := c.Query("stage_id"); stageID != "" {
		q = q.Where("stage_id = ?", stageID)
	}
	if periodID := c.Query("period_id"); periodID != "" {
		q = q.Where("stage_id IN (SELECT id FROM mahasiswa.kencana_stages WHERE period_id = ?)", periodID)
	}
	if scopeType := c.Query("scope_type"); scopeType != "" {
		if scopeType == "faculty" {
			q = q.Where("stage_id IN (SELECT id FROM mahasiswa.kencana_stages WHERE type = 'faculty')")
		} else if scopeType == "kencana_universitas" {
			q = q.Where("stage_id IN (SELECT id FROM mahasiswa.kencana_stages WHERE type = 'kencana_universitas')")
		}
	}
	if err := q.Find(&sessions).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat sesi"})
	}
	return c.JSON(fiber.Map{"success": true, "data": sessions})
}

func GetAdminSessionDetail(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)
	var session models.KencanaSession

	q := config.DB
	if role == "kencana_fakultas" {
		q = q.Joins("JOIN mahasiswa.kencana_stages s ON s.id = kencana_sessions.stage_id").
			Where("s.fakultas_id = ?", fakultasID)
	}

	if err := q.First(&session, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sesi tidak ditemukan atau di luar scope fakultas Anda"})
	}

	var fid *uint
	if role == "kencana_fakultas" {
		fid = &fakultasID
	} else {
		if reqFakultasID := c.QueryInt("fakultas_id"); reqFakultasID != 0 {
			uFid := uint(reqFakultasID)
			fid = &uFid
		}
	}

	materialCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("order_number asc")
		}
		return db.Where("fakultas_id IS NULL").Order("order_number asc")
	}

	quizCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("created_at asc")
		}
		return db.Where("fakultas_id IS NULL").Order("created_at asc")
	}

	assignmentCond := func(db *gorm.DB) *gorm.DB {
		if fid != nil {
			return db.Where("fakultas_id = ?", *fid).Order("created_at asc")
		}
		return db.Where("fakultas_id IS NULL").Order("created_at asc")
	}

	if err := config.DB.Preload("Materials", materialCond).
		Preload("Quizzes", quizCond).
		Preload("Assignments", assignmentCond).
		First(&session, session.ID).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat detail sesi"})
	}

	return c.JSON(fiber.Map{"success": true, "data": session})
}

func CreateSession(c *fiber.Ctx) error {
	var session models.KencanaSession
	if err := c.BodyParser(&session); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload Sesi tidak valid"})
	}
	role, fakultasID := kencanaAdminScope(c)
	uid, _ := userID(c)
	session.CreatedBy = &uid

	if role == "kencana_fakultas" {
		if fakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		var stage models.KencanaStage
		if err := config.DB.Where("id = ? AND fakultas_id = ?", session.StageID, fakultasID).First(&stage).Error; err != nil {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Tahap tidak ditemukan atau di luar scope fakultas Anda."})
		}
	} else if role == "super_admin" || role == "kencana_admin" {
		var stage models.KencanaStage
		if err := config.DB.First(&stage, session.StageID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "Tahap tidak ditemukan"})
		}
	}

	token, expiresAt := generateQRToken()
	session.QRToken = token
	session.QRExpiresAt = &expiresAt

	if err := config.DB.Create(&session).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat sesi"})
	}
	return c.JSON(fiber.Map{"success": true, "data": session})
}

// GetSessionQRToken returns current QR token for a session
func GetSessionQRToken(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)

	var session models.KencanaSession
	q := config.DB
	if role == "kencana_fakultas" {
		q = q.Where("fakultas_id = ?", fakultasID)
	}
	if err := q.First(&session, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sesi tidak ditemukan atau di luar akses"})
	}
	// Auto-regenerate if expired
	if session.QRExpiresAt == nil || time.Now().After(*session.QRExpiresAt) {
		token, expiresAt := generateQRToken()
		session.QRToken = token
		session.QRExpiresAt = &expiresAt
		config.DB.Save(&session)
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"session_id": session.ID,
		"qr_token":   session.QRToken,
		"expires_at": session.QRExpiresAt,
	}})
}

// RegenerateQRToken generates a new QR token for a session
func RegenerateQRToken(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)

	var session models.KencanaSession
	q := config.DB
	if role == "kencana_fakultas" {
		q = q.Where("fakultas_id = ?", fakultasID)
	}
	if err := q.First(&session, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sesi tidak ditemukan atau di luar akses"})
	}
	token, expiresAt := generateQRToken()
	session.QRToken = token
	session.QRExpiresAt = &expiresAt
	if err := config.DB.Save(&session).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui QR token"})
	}
	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"session_id": session.ID,
		"qr_token":   session.QRToken,
		"expires_at": session.QRExpiresAt,
	}})
}

func UpdateSession(c *fiber.Ctx) error {
	type sessionPayload struct {
		Title       string     `json:"title"`
		Description string     `json:"description"`
		Status      string     `json:"status"`
		IsRequired  bool       `json:"is_required"`
		StartDate   *time.Time `json:"start_date"`
		EndDate     *time.Time `json:"end_date"`
	}
	id := c.Params("id")
	var payload sessionPayload
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload tidak valid"})
	}
	var session models.KencanaSession
	if err := config.DB.First(&session, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sesi tidak ditemukan"})
	}

	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		var stage models.KencanaStage
		if err := config.DB.Where("id = ? AND fakultas_id = ?", session.StageID, fakultasID).First(&stage).Error; err != nil {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Sesi di luar scope fakultas Anda."})
		}
	}

	session.Title = payload.Title
	session.Description = payload.Description
	session.Status = payload.Status
	session.IsRequired = payload.IsRequired
	session.StartDate = payload.StartDate
	session.EndDate = payload.EndDate

	if err := config.DB.Save(&session).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui sesi"})
	}
	// Cascade: if session inactive, lock all quizzes in it
	if payload.Status == "locked" || payload.Status == "draft" {
		config.DB.Model(&models.KencanaQuiz{}).Where("session_id = ?", session.ID).Update("status", "locked")
	} else if payload.Status == "active" || payload.Status == "published" {
		config.DB.Model(&models.KencanaQuiz{}).Where("session_id = ? AND status = ?", session.ID, "locked").Update("status", "published")
	}
	return c.JSON(fiber.Map{"success": true, "message": "Sesi diperbarui", "data": session})
}

func DeleteSession(c *fiber.Ctx) error {
	id := c.Params("id")
	var session models.KencanaSession
	if err := config.DB.First(&session, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sesi tidak ditemukan"})
	}

	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		var stage models.KencanaStage
		if err := config.DB.Where("id = ? AND fakultas_id = ?", session.StageID, fakultasID).First(&stage).Error; err != nil {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Sesi di luar scope fakultas Anda."})
		}
	}

	if err := config.DB.Select("Materials", "Quizzes").Delete(&session).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus sesi"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Sesi berhasil dihapus"})
}

func CreateMaterial(c *fiber.Ctx) error { return createRecord(c, &models.KencanaMaterial{}, "Materi") }
func CreateQuiz(c *fiber.Ctx) error     { return createRecord(c, &models.KencanaQuiz{}, "Quiz") }
func UpdateQuiz(c *fiber.Ctx) error     { return updateRecord(c, &models.KencanaQuiz{}, "Quiz") }

func DeleteQuiz(c *fiber.Ctx) error {
	var quiz models.KencanaQuiz
	if err := config.DB.First(&quiz, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Quiz tidak ditemukan"})
	}
	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if quiz.FakultasID == nil || *quiz.FakultasID != fakultasID {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Anda tidak berwenang menghapus kuis ini."})
		}
	}
	if err := config.DB.Select("Questions").Delete(&quiz).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus kuis"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Kuis dihapus"})
}

func GetQuizDetail(c *fiber.Ctx) error {
	quizID := c.Params("id")
	var quiz models.KencanaQuiz

	err := config.DB.
		Preload("Questions", func(db *gorm.DB) *gorm.DB { return db.Order("order_number asc") }).
		Preload("Questions.Options", func(db *gorm.DB) *gorm.DB { return db.Order("order_number asc") }).
		First(&quiz, quizID).Error

	if err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Quiz tidak ditemukan"})
	}

	return c.JSON(fiber.Map{"success": true, "data": quiz})
}
func CreateQuestion(c *fiber.Ctx) error { return saveQuestion(c, 0) }

func UpdateQuestion(c *fiber.Ctx) error {
	id, err := c.ParamsInt("id")
	if err != nil || id == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Soal tidak valid"})
	}
	return saveQuestion(c, uint(id))
}

func saveQuestion(c *fiber.Ctx, questionID uint) error {
	type optionBody struct {
		ID          uint   `json:"id"`
		OptionText  string `json:"option_text"`
		IsCorrect   bool   `json:"is_correct"`
		OrderNumber int    `json:"order_number"`
	}
	type reqBody struct {
		QuizID       uint         `json:"quiz_id"`
		QuestionText string       `json:"question_text"`
		QuestionType string       `json:"question_type"`
		Score        float64      `json:"score"`
		OrderNumber  int          `json:"order_number"`
		Options      []optionBody `json:"options"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || strings.TrimSpace(req.QuestionText) == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload soal tidak valid"})
	}
	if req.QuestionType == "" {
		req.QuestionType = "multiple_choice"
	}
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		question := models.KencanaQuestion{QuizID: req.QuizID, QuestionText: req.QuestionText, QuestionType: req.QuestionType, Score: req.Score, OrderNumber: req.OrderNumber}
		if questionID != 0 {
			if err := tx.First(&question, questionID).Error; err != nil {
				return err
			}
			question.QuestionText = req.QuestionText
			question.QuestionType = req.QuestionType
			question.Score = req.Score
			question.OrderNumber = req.OrderNumber
			if req.QuizID != 0 {
				question.QuizID = req.QuizID
			}
			if err := tx.Save(&question).Error; err != nil {
				return err
			}
			if err := tx.Where("question_id = ?", question.ID).Delete(&models.KencanaQuestionOption{}).Error; err != nil {
				return err
			}
		} else if err := tx.Create(&question).Error; err != nil {
			return err
		}
		if question.QuestionType == "multiple_choice" {
			for idx, opt := range req.Options {
				if strings.TrimSpace(opt.OptionText) == "" {
					continue
				}
				order := opt.OrderNumber
				if order == 0 {
					order = idx + 1
				}
				option := models.KencanaQuestionOption{QuestionID: question.ID, OptionText: opt.OptionText, IsCorrect: opt.IsCorrect, OrderNumber: order}
				if err := tx.Create(&option).Error; err != nil {
					return err
				}
			}
		}
		return nil
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan soal"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Soal berhasil disimpan"})
}
func CreateAssignment(c *fiber.Ctx) error {
	return createRecord(c, &models.KencanaAssignment{}, "Tugas")
}

func ListParticipants(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := strings.ToLower(c.Query("search"))

	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		if period, err := activePeriod(config.DB); err == nil {
			periodID = period.ID
		}
	}

	// Ambil data periode Kencana untuk mendapatkan pmb_periode_id
	var pmbPeriodeId string
	var targetTahunMasuk int
	if periodID != 0 {
		var p models.KencanaPeriod
		if err := config.DB.First(&p, periodID).Error; err == nil {
			pmbPeriodeId = p.PmbPeriodeId
			if p.Year > 0 {
				targetTahunMasuk = p.Year
			}
		}
	}
	if targetTahunMasuk == 0 {
		targetTahunMasuk = time.Now().Year()
	}

	// ====================================================================
	// Jika ada pmb_periode_id → langsung ambil dari tabel PMB (sumber kebenaran)
	// ====================================================================
	if pmbPeriodeId != "" {
		return listParticipantsFromPMB(c, pmbPeriodeId, periodID, page, limit, search)
	}

	// ====================================================================
	// Fallback: ambil dari tabel mahasiswa (untuk periode tanpa PMB link)
	// ====================================================================
	var students []models.Mahasiswa
	q := config.DB.Model(&models.Mahasiswa{}).Preload("Fakultas").Preload("ProgramStudi")

	if periodID != 0 {
		q = q.Where("mahasiswa.mahasiswa.tahun_masuk = ? OR mahasiswa.mahasiswa.id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE period_id = ?)", targetTahunMasuk, periodID)
	} else {
		q = q.Where("mahasiswa.mahasiswa.tahun_masuk = ?", targetTahunMasuk)
	}

	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		q = q.Where("fakultas_id = ?", scopedFakultasID)
	} else if facultyID := c.Query("fakultas_id"); facultyID != "" && facultyID != "all" {
		q = q.Where("fakultas_id = ?", facultyID)
	}

	if programStudiID := c.Query("program_studi_id"); programStudiID != "" && programStudiID != "all" {
		q = q.Where("program_studi_id = ?", programStudiID)
	}

	if mentorStatus := c.Query("mentor_status"); mentorStatus != "" && mentorStatus != "all" {
		if mentorStatus == "assigned" {
			q = q.Joins("JOIN mahasiswa.kencana_mentor_assignments ON mahasiswa.kencana_mentor_assignments.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_mentor_assignments.status = 'active'")
		} else if mentorStatus == "unassigned" {
			q = q.Joins("LEFT JOIN mahasiswa.kencana_mentor_assignments ON mahasiswa.kencana_mentor_assignments.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_mentor_assignments.status = 'active'").
				Where("mahasiswa.kencana_mentor_assignments.id IS NULL")
		}
	}

	if groupID := c.Query("group_id"); groupID != "" && groupID != "all" {
		q = q.Joins("JOIN mahasiswa.kencana_group_members ON mahasiswa.kencana_group_members.student_id = mahasiswa.mahasiswa.id").
			Where("mahasiswa.kencana_group_members.group_id = ?", groupID)
	}

	if search != "" {
		q = q.Where("LOWER(mahasiswa.mahasiswa.nama_mahasiswa) LIKE ? OR LOWER(mahasiswa.mahasiswa.nim) LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	q.Session(&gorm.Session{}).Count(&total)

	q = q.Order("mahasiswa.mahasiswa.nama_mahasiswa asc").Offset((page - 1) * limit).Limit(limit)

	if err := q.Find(&students).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat peserta: " + err.Error()})
	}

	// Fetch active mentor assignments (optimized)
	var studentIDs []uint
	for _, s := range students {
		studentIDs = append(studentIDs, s.ID)
	}

	var assignments []models.KencanaMentorAssignment
	if len(studentIDs) > 0 {
		config.DB.Preload("Mentor.User").Where("status = ? AND student_id IN ?", "active", studentIDs).Find(&assignments)
	}

	assignmentMap := make(map[uint]models.KencanaMentorAssignment)
	for _, a := range assignments {
		assignmentMap[a.StudentID] = a
	}

	groupMap := make(map[uint]models.KencanaGroupMember)
	if len(studentIDs) > 0 && periodID != 0 {
		var groupMembers []models.KencanaGroupMember
		config.DB.Preload("Group.Mentor").Where("period_id = ? AND status = ? AND student_id IN ?", periodID, "active", studentIDs).Find(&groupMembers)
		for _, gm := range groupMembers {
			groupMap[gm.StudentID] = gm
		}
	}

	results := []fiber.Map{}
	for _, s := range students {
		mentorName := "-"
		if a, ok := assignmentMap[s.ID]; ok {
			mentorName = a.Mentor.Name
		}
		groupIDVal := uint(0)
		groupName := "-"
		groupCode := "-"
		groupNumber := 0
		if gm, ok := groupMap[s.ID]; ok {
			groupIDVal = gm.GroupID
			groupName = gm.Group.Name
			groupCode = gm.Group.Code
			groupNumber = gm.Group.GroupNumber
			if gm.Group.Mentor != nil && gm.Group.Mentor.Name != "" {
				mentorName = gm.Group.Mentor.Name
			}
		}

		results = append(results, fiber.Map{
			"id":                 s.ID,
			"nim":                s.NIM,
			"nama":               s.Nama,
			"jenis_kelamin":      s.JenisKelamin,
			"email_kampus":       s.EmailKampus,
			"email_personal":     s.EmailPersonal,
			"fakultas_name":      s.Fakultas.Nama,
			"program_studi_name": s.ProgramStudi.Nama,
			"mentor_name":        mentorName,
			"group_id":           groupIDVal,
			"group_name":         groupName,
			"group_code":         groupCode,
			"group_number":       groupNumber,
		})
	}

	totalPages := 1
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
		"meta": fiber.Map{
			"current_page": page,
			"per_page":     limit,
			"total_pages":  totalPages,
			"total_data":   total,
		},
	})
}

// listParticipantsFromPMB — Ambil data peserta langsung dari tabel PMB (pendaftaran_mahasiswa_baru)
func listParticipantsFromPMB(c *fiber.Ctx, pmbPeriodeId string, periodID uint, page, limit int, search string) error {
	var pmbRecords []models.PendaftaranMahasiswaBaru
	q := config.DB.Model(&models.PendaftaranMahasiswaBaru{}).Where("id_periode = ?", pmbPeriodeId)

	// Filter jalur
	if jalur := c.Query("jalur"); jalur != "" && jalur != "all" {
		q = q.Where("jalur = ?", jalur)
	}

	// Search
	if search != "" {
		q = q.Where("LOWER(nama_lengkap) LIKE ? OR LOWER(nim) LIKE ? OR LOWER(nomor_daftar) LIKE ? OR LOWER(email) LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Data Isolation (Fakultas Scope)
	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		var prodiNames []string
		config.DB.Model(&models.ProgramStudi{}).Where("fakultas_id = ?", scopedFakultasID).Pluck("nama", &prodiNames)
		if len(prodiNames) > 0 {
			q = q.Where("pilihan_prodi IN ?", prodiNames)
		} else {
			q = q.Where("1 = 0")
		}
	} else if facultyID := c.Query("fakultas_id"); facultyID != "" && facultyID != "all" {
		var prodiNames []string
		config.DB.Model(&models.ProgramStudi{}).Where("fakultas_id = ?", facultyID).Pluck("nama", &prodiNames)
		if len(prodiNames) > 0 {
			q = q.Where("pilihan_prodi IN ?", prodiNames)
		} else {
			q = q.Where("1 = 0")
		}
	}

	if programStudiID := c.Query("program_studi_id"); programStudiID != "" && programStudiID != "all" {
		var prodi models.ProgramStudi
		if err := config.DB.First(&prodi, programStudiID).Error; err == nil {
			q = q.Where("pilihan_prodi = ?", prodi.Nama)
		} else {
			q = q.Where("1 = 0")
		}
	}

	if groupID := c.Query("group_id"); groupID != "" && groupID != "all" && periodID != 0 {
		q = q.Where("id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE group_id = ? AND period_id = ?)", groupID, periodID)
	}

	if mentorStatus := c.Query("mentor_status"); mentorStatus != "" && mentorStatus != "all" {
		if mentorStatus == "assigned" {
			q = q.Where("id IN (SELECT student_id FROM mahasiswa.kencana_mentor_assignments WHERE status = 'active')")
		} else if mentorStatus == "unassigned" {
			q = q.Where("id NOT IN (SELECT student_id FROM mahasiswa.kencana_mentor_assignments WHERE status = 'active')")
		}
	}

	var total int64
	q.Session(&gorm.Session{}).Count(&total)

	q = q.Order("nama_lengkap asc").Offset((page - 1) * limit).Limit(limit)

	if err := q.Find(&pmbRecords).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat peserta: " + err.Error()})
	}

	var prodiList []models.ProgramStudi
	config.DB.Preload("Fakultas").Find(&prodiList)
	prodiFakultasMap := make(map[string]string)
	for _, p := range prodiList {
		prodiFakultasMap[p.Nama] = p.Fakultas.Nama
	}

	results := []fiber.Map{}
	for _, r := range pmbRecords {
		nim := r.NIM
		if nim == "" {
			nim = r.NomorDaftar // Tampilkan nomor daftar jika NIM belum ada
		}

		prodiName := r.PilihanProdi
		jalurName := r.Jalur
		
		fakultasName := prodiFakultasMap[prodiName]
		if fakultasName == "" {
			fakultasName = "Lainnya/Tanpa Fakultas"
		}

		results = append(results, fiber.Map{
			"id":                 r.ID,
			"nim":                nim,
			"nama":               r.NamaLengkap,
			"jenis_kelamin":      r.JenisKelamin,
			"email_kampus":       r.Email,
			"email_personal":     r.Email,
			"fakultas_name":      fakultasName,
			"program_studi_name": prodiName,
			"jalur":              jalurName,
			"kota":               r.Kota,
			"provinsi":           r.Provinsi,
			"agama":              r.Agama,
			"mentor_name":        "-",
			"group_id":           uint(0),
			"group_name":         "-",
			"group_code":         "-",
			"group_number":       0,
		})
	}

	totalPages := 1
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    results,
		"meta": fiber.Map{
			"current_page": page,
			"per_page":     limit,
			"total_pages":  totalPages,
			"total_data":   total,
		},
	})
}

func ListScores(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := strings.ToLower(c.Query("search"))
	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		period, err := activePeriod(config.DB)
		if err == nil {
			periodID = period.ID
		}
	}

	// Ambil data periode Kencana
	var pmbPeriodeId string
	var targetTahunMasuk int
	if periodID != 0 {
		var p models.KencanaPeriod
		if err := config.DB.First(&p, periodID).Error; err == nil {
			pmbPeriodeId = p.PmbPeriodeId
			if p.Year > 0 {
				targetTahunMasuk = p.Year
			}
		}
	}
	if targetTahunMasuk == 0 {
		targetTahunMasuk = time.Now().Year()
	}

	role, scopedFakultasID := kencanaAdminScope(c)
	scopeType := "university"
	if role == "kencana_fakultas" {
		scopeType = "fakultas"
	}

	// ====================================================================
	// Jika ada pmb_periode_id → langsung ambil dari tabel PMB
	// ====================================================================
	if pmbPeriodeId != "" {
		return listScoresFromPMB(c, pmbPeriodeId, periodID, page, limit, search, scopeType)
	}

	// ====================================================================
	// Fallback: ambil dari tabel mahasiswa
	// ====================================================================
	var students []models.Mahasiswa
	q := config.DB.Model(&models.Mahasiswa{}).Preload("Pengguna").Preload("Fakultas").Preload("ProgramStudi")

	if periodID != 0 {
		q = q.Where("mahasiswa.mahasiswa.tahun_masuk = ? OR mahasiswa.mahasiswa.id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE period_id = ?)", targetTahunMasuk, periodID)
	} else {
		q = q.Where("mahasiswa.mahasiswa.tahun_masuk = ?", targetTahunMasuk)
	}

	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		q = q.Where("fakultas_id = ?", scopedFakultasID)
	} else if facultyID := c.Query("fakultas_id"); facultyID != "" && facultyID != "all" {
		q = q.Where("fakultas_id = ?", facultyID)
	}

	if programStudiID := c.Query("program_studi_id"); programStudiID != "" && programStudiID != "all" {
		q = q.Where("program_studi_id = ?", programStudiID)
	}

	if groupID := c.Query("group_id"); groupID != "" && groupID != "all" && periodID != 0 {
		q = q.Joins("JOIN mahasiswa.kencana_group_members ON mahasiswa.kencana_group_members.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_group_members.period_id = ?", periodID).
			Where("mahasiswa.kencana_group_members.group_id = ?", groupID)
	}

	if search != "" {
		q = q.Where("LOWER(mahasiswa.mahasiswa.nama_mahasiswa) LIKE ? OR LOWER(mahasiswa.mahasiswa.nim) LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if status := c.Query("status"); status != "" && status != "all" {
		if status == "belum_lengkap" {
			q = q.Joins("LEFT JOIN mahasiswa.kencana_scores AS ks_status ON ks_status.student_id = mahasiswa.mahasiswa.id AND ks_status.period_id = ? AND ks_status.scope_type = ?", periodID, scopeType).
				Where("ks_status.graduation_status IS NULL OR ks_status.graduation_status IN ('not_started', 'in_progress')")
		} else {
			q = q.Joins("LEFT JOIN mahasiswa.kencana_scores AS ks_status ON ks_status.student_id = mahasiswa.mahasiswa.id AND ks_status.period_id = ? AND ks_status.scope_type = ?", periodID, scopeType).
				Where("ks_status.graduation_status = ?", status)
		}
	}

	var total int64
	q.Session(&gorm.Session{}).Count(&total)

	sortBy := c.Query("sort_by", "nama")
	sortOrder := strings.ToLower(c.Query("sort_order", "asc"))
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "asc"
	}

	if sortBy == "final_score" || sortBy == "cognitive" || sortBy == "affective" || sortBy == "psychomotor" {
		q = q.Joins("LEFT JOIN mahasiswa.kencana_scores ON mahasiswa.kencana_scores.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_scores.period_id = ? AND mahasiswa.kencana_scores.scope_type = ?", periodID, scopeType)
		if sortBy == "final_score" {
			q = q.Order(fmt.Sprintf("mahasiswa.kencana_scores.final_score %s NULLS LAST", sortOrder))
		} else if sortBy == "cognitive" {
			q = q.Order(fmt.Sprintf("mahasiswa.kencana_scores.cognitive_weighted %s NULLS LAST", sortOrder))
		} else if sortBy == "affective" {
			q = q.Order(fmt.Sprintf("mahasiswa.kencana_scores.affective_weighted %s NULLS LAST", sortOrder))
		} else if sortBy == "psychomotor" {
			q = q.Order(fmt.Sprintf("mahasiswa.kencana_scores.psychomotor_weighted %s NULLS LAST", sortOrder))
		}
	} else if sortBy == "status" {
		q = q.Joins("LEFT JOIN mahasiswa.kencana_scores ON mahasiswa.kencana_scores.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_scores.period_id = ? AND mahasiswa.kencana_scores.scope_type = ?", periodID, scopeType).
			Order(fmt.Sprintf("mahasiswa.kencana_scores.graduation_status %s NULLS LAST", sortOrder))
	} else {
		q = q.Order(fmt.Sprintf("mahasiswa.mahasiswa.nama_mahasiswa %s", sortOrder))
	}

	q = q.Offset((page - 1) * limit).Limit(limit)

	if err := q.Find(&students).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat nilai"})
	}

	studentIDs := make([]uint, 0, len(students))
	for _, student := range students {
		studentIDs = append(studentIDs, student.ID)
	}

	// Fetch groups for these students
	groupMap := map[uint]string{}
	if len(studentIDs) > 0 && periodID != 0 {
		var members []models.KencanaGroupMember
		config.DB.Preload("Group").Where("period_id = ? AND student_id IN ?", periodID, studentIDs).Find(&members)
		for _, m := range members {
			groupMap[m.StudentID] = m.Group.Name
		}
	}

	scoreMap := map[uint]models.KencanaScore{}
	if len(studentIDs) > 0 && periodID != 0 {
		var existingScores []models.KencanaScore
		config.DB.Where("period_id = ? AND student_id IN ?", periodID, studentIDs).Find(&existingScores)
		for _, score := range existingScores {
			scoreMap[score.StudentID] = score
		}
	}

	var itemsMap = make(map[uint][]models.KencanaScoreItem)
	var attMap = make(map[uint]int)
	if len(studentIDs) > 0 && periodID != 0 {
		var items []models.KencanaScoreItem
		config.DB.Where("student_id IN ? AND period_id = ?", studentIDs, periodID).Find(&items)
		for _, it := range items {
			itemsMap[it.StudentID] = append(itemsMap[it.StudentID], it)
		}

		var atts []models.KencanaAttendance
		config.DB.Where("student_id IN ? AND period_id = ? AND status = 'present'", studentIDs, periodID).Find(&atts)
		for _, a := range atts {
			attMap[a.StudentID]++
		}
	}

	type ScoreResponse struct {
		models.KencanaScore
		GroupName       string                    `json:"group_name"`
		Items           []models.KencanaScoreItem `json:"items"`
		AttendanceCount int                       `json:"attendance_count"`
	}

	scores := make([]ScoreResponse, 0, len(students))
	for _, student := range students {
		score, ok := scoreMap[student.ID]
		if !ok {
			score = models.KencanaScore{
				PeriodID:         periodID,
				StudentID:        student.ID,
				GraduationStatus: "not_started",
			}
		}
		score.Student = student
		scores = append(scores, ScoreResponse{
			KencanaScore:    score,
			GroupName:       groupMap[student.ID],
			Items:           itemsMap[student.ID],
			AttendanceCount: attMap[student.ID],
		})
	}

	totalPages := 1
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    scores,
		"meta": fiber.Map{
			"current_page": page,
			"per_page":     limit,
			"total_pages":  totalPages,
			"total_data":   total,
		},
	})
}

// listScoresFromPMB — Ambil data nilai langsung dari tabel PMB (pendaftaran_mahasiswa_baru)
func listScoresFromPMB(c *fiber.Ctx, pmbPeriodeId string, periodID uint, page, limit int, search string, scopeType string) error {
	var pmbRecords []models.PendaftaranMahasiswaBaru
	q := config.DB.Model(&models.PendaftaranMahasiswaBaru{}).Where("id_periode = ?", pmbPeriodeId)

	// Search
	if search != "" {
		q = q.Where("LOWER(nama_lengkap) LIKE ? OR LOWER(nim) LIKE ? OR LOWER(nomor_daftar) LIKE ? OR LOWER(email) LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
	}

	// Data Isolation (Fakultas Scope)
	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		var prodiNames []string
		config.DB.Model(&models.ProgramStudi{}).Where("fakultas_id = ?", scopedFakultasID).Pluck("nama", &prodiNames)
		if len(prodiNames) > 0 {
			q = q.Where("pilihan_prodi IN ?", prodiNames)
		} else {
			q = q.Where("1 = 0")
		}
	} else if facultyID := c.Query("fakultas_id"); facultyID != "" && facultyID != "all" {
		var prodiNames []string
		config.DB.Model(&models.ProgramStudi{}).Where("fakultas_id = ?", facultyID).Pluck("nama", &prodiNames)
		if len(prodiNames) > 0 {
			q = q.Where("pilihan_prodi IN ?", prodiNames)
		} else {
			q = q.Where("1 = 0")
		}
	}

	if programStudiID := c.Query("program_studi_id"); programStudiID != "" && programStudiID != "all" {
		var prodi models.ProgramStudi
		if err := config.DB.First(&prodi, programStudiID).Error; err == nil {
			q = q.Where("pilihan_prodi = ?", prodi.Nama)
		} else {
			q = q.Where("1 = 0")
		}
	}

	if groupID := c.Query("group_id"); groupID != "" && groupID != "all" && periodID != 0 {
		q = q.Where("id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE group_id = ? AND period_id = ?)", groupID, periodID)
	}

	if status := c.Query("status"); status != "" && status != "all" {
		if status == "belum_lengkap" {
			q = q.Where("id NOT IN (SELECT student_id FROM mahasiswa.kencana_scores WHERE period_id = ? AND scope_type = ? AND graduation_status NOT IN ('not_started', 'in_progress'))", periodID, scopeType)
		} else {
			q = q.Where("id IN (SELECT student_id FROM mahasiswa.kencana_scores WHERE period_id = ? AND scope_type = ? AND graduation_status = ?)", periodID, scopeType, status)
		}
	}

	var total int64
	q.Session(&gorm.Session{}).Count(&total)

	q = q.Order("nama_lengkap asc").Offset((page - 1) * limit).Limit(limit)

	if err := q.Find(&pmbRecords).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat nilai: " + err.Error()})
	}

	type ScoreResponse struct {
		models.KencanaScore
		GroupName       string                    `json:"group_name"`
		Items           []models.KencanaScoreItem `json:"items"`
		AttendanceCount int                       `json:"attendance_count"`
	}

	scores := make([]ScoreResponse, 0, len(pmbRecords))
	for _, r := range pmbRecords {
		nim := r.NIM
		if nim == "" {
			nim = r.NomorDaftar
		}

		// Build a lightweight Student object from PMB data
		prodiName := r.PilihanProdi
		jalurName := r.Jalur
		if prodiName == "" {
			prodiName = r.Jalur
			jalurName = "-"
		}
		student := models.Mahasiswa{
			NIM:          nim,
			Nama:         r.NamaLengkap,
			JenisKelamin: r.JenisKelamin,
		}
		student.ID = r.ID
		student.Fakultas = models.Fakultas{Nama: jalurName}
		student.ProgramStudi = models.ProgramStudi{Nama: prodiName}

		score := models.KencanaScore{
			PeriodID:         periodID,
			StudentID:        r.ID,
			ScopeType:        scopeType,
			GraduationStatus: "not_started",
			Student:          student,
		}

		scores = append(scores, ScoreResponse{
			KencanaScore:    score,
			GroupName:       "-",
			Items:           nil,
			AttendanceCount: 0,
		})
	}

	totalPages := 1
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    scores,
		"meta": fiber.Map{
			"current_page": page,
			"per_page":     limit,
			"total_pages":  totalPages,
			"total_data":   total,
		},
	})
}

// ScoreSummary — Rekap keseluruhan per kelompok: jumlah lulus, tidak lulus, dll.
func ScoreSummary(c *fiber.Ctx) error {
	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
		}
		periodID = period.ID
	}

	type GroupSummaryRow struct {
		GroupID      uint   `json:"group_id"`
		GroupNumber  int    `json:"group_number"`
		GroupName    string `json:"group_name"`
		FakultasName string `json:"fakultas_name"`
		Lulus        int    `json:"lulus"`
		TidakLulus   int    `json:"tidak_lulus"`
		Bersyarat    int    `json:"bersyarat"`
		BelumMulai   int    `json:"belum_mulai"`
		Keluar       int    `json:"keluar"`
		Total        int    `json:"total"`
	}

	// Get all groups for this period
	var groups []models.KencanaGroup
	q := config.DB.Preload("Fakultas").Where("period_id = ?", periodID).Order("group_number asc")
	role, scopedFakultasID := kencanaAdminScope(c)
	scopeType := "university"
	if role == "kencana_fakultas" {
		scopeType = "fakultas"
	}
	if scopedFakultasID != 0 {
		q = q.Where("fakultas_id = ?", scopedFakultasID)
	} else {
		q = q.Where("scope_type = ?", "university")
	}
	if err := q.Find(&groups).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat kelompok"})
	}

	// Get all members for this period
	type memberScore struct {
		StudentID uint
		Status    string
	}
	var members []models.KencanaGroupMember
	config.DB.Where("period_id = ?", periodID).Find(&members)

	// Get all scores for this period
	var allScores []models.KencanaScore
	config.DB.Where("period_id = ? AND scope_type = ?", periodID, scopeType).Find(&allScores)
	scoreByStudent := map[uint]string{}
	for _, s := range allScores {
		scoreByStudent[s.StudentID] = s.GraduationStatus
	}

	// Group members by group_id
	membersByGroup := map[uint][]uint{}
	for _, m := range members {
		membersByGroup[m.GroupID] = append(membersByGroup[m.GroupID], m.StudentID)
	}

	rows := make([]GroupSummaryRow, 0, len(groups))
	totals := GroupSummaryRow{GroupName: "TOTAL"}

	for _, g := range groups {
		row := GroupSummaryRow{
			GroupID:     g.ID,
			GroupNumber: g.GroupNumber,
			GroupName:   g.Name,
		}
		if g.Fakultas != nil {
			row.FakultasName = g.Fakultas.Nama
		}
		for _, sid := range membersByGroup[g.ID] {
			row.Total++
			switch scoreByStudent[sid] {
			case "passed":
				row.Lulus++
			case "not_eligible", "remedial":
				row.TidakLulus++
			case "conditional_pass":
				row.Bersyarat++
			case "dropped_out":
				row.Keluar++
			default:
				row.BelumMulai++
			}
		}
		totals.Lulus += row.Lulus
		totals.TidakLulus += row.TidakLulus
		totals.Bersyarat += row.Bersyarat
		totals.Keluar += row.Keluar
		totals.BelumMulai += row.BelumMulai
		totals.Total += row.Total
		rows = append(rows, row)
	}

	return c.JSON(fiber.Map{
		"success":   true,
		"data":      rows,
		"totals":    totals,
		"period_id": periodID,
	})
}

func ListRemedials(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := strings.ToLower(c.Query("search"))

	var remedials []models.KencanaRemedial
	q := config.DB.Model(&models.KencanaRemedial{}).Preload("Student").Preload("Student.Fakultas").Preload("Student.ProgramStudi")

	if periodID := c.Query("period_id"); periodID != "" {
		q = q.Where("period_id = ?", periodID)
	}

	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = kencana_remedials.student_id").Where("m.fakultas_id = ?", scopedFakultasID).Where("kencana_remedials.type = 'fakultas'")
	} else if facultyID := c.Query("fakultas_id"); facultyID != "" && facultyID != "all" {
		q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = kencana_remedials.student_id").Where("m.fakultas_id = ?", facultyID)
	}

	if role == "kencana_admin" {
		q = q.Where("kencana_remedials.type = 'universitas'")
	}

	if search != "" {
		if role != "kencana_fakultas" && c.Query("fakultas_id") == "" {
			q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = kencana_remedials.student_id")
		}
		q = q.Where("LOWER(m.nama_mahasiswa) LIKE ? OR LOWER(m.nim) LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	q.Session(&gorm.Session{}).Count(&total)

	q = q.Order("created_at desc").Offset((page - 1) * limit).Limit(limit)

	if err := q.Find(&remedials).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat remedial"})
	}

	totalPages := 1
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    remedials,
		"meta": fiber.Map{
			"current_page": page,
			"per_page":     limit,
			"total_pages":  totalPages,
			"total_data":   total,
		},
	})
}

func ListCertificates(c *fiber.Ctx) error {
	page := c.QueryInt("page", 1)
	limit := c.QueryInt("limit", 10)
	search := strings.ToLower(c.Query("search"))

	var certs []models.KencanaCertificate
	q := config.DB.Model(&models.KencanaCertificate{}).Preload("Student").Preload("Student.Fakultas").Preload("Student.ProgramStudi")

	if periodID := c.Query("period_id"); periodID != "" {
		q = q.Where("period_id = ?", periodID)
	}

	role, scopedFakultasID := kencanaAdminScope(c)
	scopeType := "university"
	if role == "kencana_fakultas" {
		scopeType = "fakultas"
	}

	q = q.Where("scope_type = ?", scopeType)

	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		q = q.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.kencana_certificates.student_id").Where("mahasiswa.mahasiswa.fakultas_id = ?", scopedFakultasID)
	} else if facultyID := c.Query("fakultas_id"); facultyID != "" && facultyID != "all" {
		q = q.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.kencana_certificates.student_id").Where("mahasiswa.mahasiswa.fakultas_id = ?", facultyID)
	}

	if groupID := c.Query("group_id"); groupID != "" && groupID != "all" {
		// join group
		if role != "kencana_fakultas" && c.Query("fakultas_id") == "" {
			q = q.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.kencana_certificates.student_id")
		}
		q = q.Joins("JOIN mahasiswa.kencana_group_members ON mahasiswa.kencana_group_members.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_group_members.period_id = mahasiswa.kencana_certificates.period_id").
			Where("mahasiswa.kencana_group_members.group_id = ?", groupID)
	}

	if search != "" {
		if role != "kencana_fakultas" && c.Query("fakultas_id") == "" && c.Query("group_id") == "" {
			q = q.Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.id = mahasiswa.kencana_certificates.student_id")
		}
		q = q.Where("LOWER(mahasiswa.mahasiswa.nama_mahasiswa) LIKE ? OR LOWER(mahasiswa.mahasiswa.nim) LIKE ?", "%"+search+"%", "%"+search+"%")
	}

	var total int64
	q.Session(&gorm.Session{}).Count(&total)

	q = q.Order("created_at desc").Offset((page - 1) * limit).Limit(limit)

	if err := q.Find(&certs).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat sertifikat"})
	}

	studentIDs := make([]uint, 0, len(certs))
	for _, cert := range certs {
		studentIDs = append(studentIDs, cert.StudentID)
	}

	type CertResponse struct {
		models.KencanaCertificate
		GroupName  string `json:"group_name"`
		MentorName string `json:"mentor_name"`
	}

	periodID := c.Query("period_id")
	responses := make([]CertResponse, 0, len(certs))
	if len(studentIDs) > 0 && periodID != "" {
		var members []models.KencanaGroupMember
		groupMap := map[uint]string{}
		mentorMap := map[uint]string{}

		config.DB.Preload("Group").Preload("Group.Mentor").Where("period_id = ? AND student_id IN ?", periodID, studentIDs).Find(&members)
		for _, m := range members {
			groupMap[m.StudentID] = m.Group.Name
			if m.Group.Mentor != nil {
				mentorMap[m.StudentID] = m.Group.Mentor.Name
			}
		}

		for _, cert := range certs {
			responses = append(responses, CertResponse{
				KencanaCertificate: cert,
				GroupName:          groupMap[cert.StudentID],
				MentorName:         mentorMap[cert.StudentID],
			})
		}
	} else {
		for _, cert := range certs {
			responses = append(responses, CertResponse{
				KencanaCertificate: cert,
			})
		}
	}

	totalPages := 1
	if limit > 0 {
		totalPages = int((total + int64(limit) - 1) / int64(limit))
	}

	return c.JSON(fiber.Map{
		"success": true,
		"data":    responses,
		"meta": fiber.Map{
			"current_page": page,
			"per_page":     limit,
			"total_pages":  totalPages,
			"total_data":   total,
		},
	})
}

func CreateRemedial(c *fiber.Ctx) error {
	var remedial models.KencanaRemedial
	if err := c.BodyParser(&remedial); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload Remedial tidak valid"})
	}

	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		var student models.Mahasiswa
		if err := config.DB.Preload("ProgramStudi").First(&student, remedial.StudentID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
		}
		if student.ProgramStudi.FakultasID != scopedFakultasID {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Mahasiswa ini bukan dari fakultas Anda."})
		}
		remedial.Type = "fakultas"
	} else if role == "kencana_admin" {
		remedial.Type = "universitas"
	}

	uid, _ := userID(c)
	remedial.CreatedBy = &uid

	if err := config.DB.Create(&remedial).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat Remedial"})
	}
	return c.JSON(fiber.Map{"success": true, "data": remedial})
}

func generateSingleCertificate(db *gorm.DB, periodID uint, studentID uint, scopeType string, facId *uint) error {
	var score models.KencanaScore
	qScore := db.Where("period_id = ? AND student_id = ? AND scope_type = ?", periodID, studentID, scopeType)
	if facId != nil {
		qScore = qScore.Where("fakultas_id = ?", facId)
	}
	if err := qScore.First(&score).Error; err != nil || score.GraduationStatus != statusPassed {
		return fmt.Errorf("mahasiswa belum lulus atau belum dinilai secara lengkap")
	}

	var period models.KencanaPeriod
	db.First(&period, periodID)

	var student models.Mahasiswa
	if err := db.First(&student, studentID).Error; err != nil {
		return fmt.Errorf("mahasiswa tidak ditemukan")
	}

	uploadDir := "./uploads/kencana/sertifikat"
	os.MkdirAll(uploadDir, 0755)

	var existingCert models.KencanaCertificate
	certNumber := ""
	if err := db.Where("period_id = ? AND student_id = ? AND scope_type = ?", periodID, studentID, scopeType).First(&existingCert).Error; err == nil && existingCert.CertificateNumber != "" {
		certNumber = existingCert.CertificateNumber
	} else {
		certNumber = utils.GenerateDocumentNumber("Sertifikat Kencana")
	}
	safeFileName := strings.ReplaceAll(certNumber, "/", "_")
	filename := fmt.Sprintf("%s_%s.pdf", safeFileName, scopeType)
	savePath := filepath.Join(uploadDir, filename)

	var certSettings models.KencanaCertificateSetting
	db.First(&certSettings)

	univName := "Universitas Bhakti Kencana"
	city := "Bandung"

	startDateStr := certSettings.StartDate
	endDateStr := certSettings.EndDate
	issueDateStr := certSettings.IssueDate
	themeStr := certSettings.Theme
	rektorName := certSettings.RektorName
	rektorNik := certSettings.RektorNik
	direkturName := certSettings.DirekturName
	direkturNik := certSettings.DirekturNik
	presmaName := certSettings.PresmaName
	presmaNpm := certSettings.PresmaNpm

	if startDateStr == "" {
		startDateStr = "-"
	}
	if endDateStr == "" {
		endDateStr = "-"
	}
	if issueDateStr == "" {
		issueDateStr = time.Now().Format("02 January 2006")
	}

	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.AddPage()

	templatePath := "./uploads/kencana/templates/certificate_template.png"
	if _, err := os.Stat(templatePath); err == nil {
		pdf.ImageOptions(templatePath, 0, 0, 297, 210, false, gofpdf.ImageOptions{ReadDpi: true}, 0, "")
	}
	pdf.SetFont("Arial", "B", 36)
	pdf.SetTextColor(0, 0, 0)
	pdf.SetY(45)
	pdf.CellFormat(297, 15, "SERTIFIKAT", "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 14)
	pdf.SetY(60)
	pdf.CellFormat(297, 8, fmt.Sprintf("No. %s", certNumber), "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 16)
	pdf.SetY(75)
	pdf.CellFormat(297, 8, "Diberikan Kepada:", "", 1, "C", false, 0, "")

	nameText := strings.ToUpper(student.Nama)
	if nameText == "" {
		nameText = "NAMA MAHASISWA"
	}
	pdf.SetFont("Arial", "BI", 32)
	pdf.SetY(88)
	pdf.CellFormat(297, 15, nameText, "", 1, "C", false, 0, "")

	pdf.SetFont("Arial", "", 14)
	pdf.SetY(110)

	passThresh := period.PassingGrade
	if passThresh == 0 {
		passThresh = 75
	}
	highThresh := passThresh + 10
	if highThresh > 100 {
		highThresh = 100
	}
	predikat := "BAIK"
	if score.FinalScore >= highThresh {
		predikat = "SANGAT MEMUASKAN"
	} else if score.FinalScore >= passThresh {
		predikat = "MEMUASKAN"
	}

	paragraph := fmt.Sprintf("atas kelulusan dalam rangkaian kegiatan %s\n%s (%s) yang Berlangsung Pada Tanggal %s s.d\n%s dengan predikat \"%s\"", themeStr, univName, univName, startDateStr, endDateStr, predikat)

	pdf.SetXY(20, 110)
	pdf.MultiCell(257, 8, paragraph, "", "C", false)

	pdf.SetFont("Arial", "", 14)
	pdf.SetY(138)
	pdf.CellFormat(297, 8, fmt.Sprintf("%s, %s", city, issueDateStr), "", 1, "C", false, 0, "")
	pdf.SetY(146)
	pdf.CellFormat(297, 8, "Mengetahui,", "", 1, "C", false, 0, "")

	pdf.SetY(160)

	pdf.SetFont("Arial", "", 12)
	pdf.SetXY(15, 160)
	pdf.MultiCell(85, 6, fmt.Sprintf("%s\nRektor", univName), "", "C", false)
	pdf.SetXY(15, 190)
	pdf.CellFormat(85, 6, rektorName, "", 2, "C", false, 0, "")
	pdf.CellFormat(85, 6, fmt.Sprintf("NIK. %s", rektorNik), "", 0, "C", false, 0, "")

	pdf.SetXY(106, 160)
	pdf.MultiCell(85, 6, fmt.Sprintf("%s\nDirektur Layanan Kemahasiswaan", univName), "", "C", false)
	pdf.SetXY(106, 190)
	pdf.CellFormat(85, 6, direkturName, "", 2, "C", false, 0, "")
	pdf.CellFormat(85, 6, fmt.Sprintf("NIK. %s", direkturNik), "", 0, "C", false, 0, "")

	pdf.SetXY(197, 160)
	pdf.MultiCell(85, 6, "Presiden Mahasiswa\nBEM KEMA UBK Periode 2026", "", "C", false)
	pdf.SetXY(197, 190)
	pdf.CellFormat(85, 6, presmaName, "", 2, "C", false, 0, "")
	pdf.CellFormat(85, 6, fmt.Sprintf("NPM. %s", presmaNpm), "", 0, "C", false, 0, "")

	if err := pdf.OutputFileAndClose(savePath); err != nil {
		return fmt.Errorf("gagal mencetak PDF sertifikat: %w", err)
	}

	now := time.Now().UTC()
	var cert models.KencanaCertificate
	if err := db.Where("period_id = ? AND student_id = ? AND scope_type = ?", periodID, studentID, scopeType).First(&cert).Error; err != nil {
		cert = models.KencanaCertificate{
			PeriodID: periodID, StudentID: studentID, CertificateNumber: certNumber, ScopeType: scopeType, FakultasID: facId,
		}
	}
	cert.FileURL = "/uploads/kencana/sertifikat/" + filename
	cert.IssuedAt = &now
	cert.Status = "published"

	if err := db.Save(&cert).Error; err != nil {
		return fmt.Errorf("gagal update status sertifikat: %w", err)
	}
	return nil
}

func GenerateCertificate(c *fiber.Ctx) error {
	type reqBody struct {
		PeriodID  uint `json:"period_id"`
		StudentID uint `json:"student_id"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || req.PeriodID == 0 || req.StudentID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload sertifikat tidak valid"})
	}
	role, scopedFakultasID := kencanaAdminScope(c)
	scopeType := "university"
	var facId *uint
	if role == "kencana_fakultas" {
		scopeType = "fakultas"
		if scopedFakultasID != 0 {
			facId = &scopedFakultasID
		}
	}

	if err := generateSingleCertificate(config.DB, req.PeriodID, req.StudentID, scopeType, facId); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	// Fetch back to return to frontend
	var cert models.KencanaCertificate
	config.DB.Where("period_id = ? AND student_id = ? AND scope_type = ?", req.PeriodID, req.StudentID, scopeType).First(&cert)
	return c.JSON(fiber.Map{"success": true, "data": cert, "message": "Sertifikat berhasil di-generate"})
}

func GenerateBulkCertificates(c *fiber.Ctx) error {
	type reqBody struct {
		PeriodID uint `json:"period_id"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || req.PeriodID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload tidak valid"})
	}
	role, scopedFakultasID := kencanaAdminScope(c)
	scopeType := "university"
	var facId *uint
	if role == "kencana_fakultas" {
		scopeType = "fakultas"
		if scopedFakultasID != 0 {
			facId = &scopedFakultasID
		}
	}

	// 1. Dapatkan daftar ID mahasiswa yang lulus tapi belum di-generate atau masih not_available
	var scores []models.KencanaScore
	qScore := config.DB.Where("period_id = ? AND scope_type = ? AND graduation_status = ?", req.PeriodID, scopeType, statusPassed)
	if facId != nil {
		qScore = qScore.Where("fakultas_id = ?", facId)
	}
	if err := qScore.Find(&scores).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengambil data skor mahasiswa"})
	}

	var studentIDsToGenerate []uint
	for _, sc := range scores {
		var cert models.KencanaCertificate
		err := config.DB.Where("period_id = ? AND student_id = ? AND scope_type = ?", req.PeriodID, sc.StudentID, scopeType).First(&cert).Error
		if err != nil || cert.Status != "published" {
			studentIDsToGenerate = append(studentIDsToGenerate, sc.StudentID)
		}
	}

	if len(studentIDsToGenerate) == 0 {
		return c.JSON(fiber.Map{"success": true, "message": "Tidak ada sertifikat yang perlu dicetak. Semua mahasiswa yang lulus sudah memiliki sertifikat."})
	}

	uid, _ := userID(c)

	// 2. Jalankan di background
	go func() {
		successCount := 0
		for _, sID := range studentIDsToGenerate {
			if err := generateSingleCertificate(config.DB, req.PeriodID, sID, scopeType, facId); err == nil {
				successCount++
			}
		}

		// Kirim notifikasi
		title := "Generate Massal Sertifikat Selesai"
		msg := fmt.Sprintf("Berhasil mencetak %d dari %d sertifikat mahasiswa.", successCount, len(studentIDsToGenerate))

		// Send notif
		notifikasi := models.Notifikasi{
			UserID:    uid,
			Judul:     title,
			Deskripsi: msg,
			Tipe:      "system",
			IsRead:    false,
		}
		config.DB.Create(&notifikasi)
	}()

	return c.Status(fiber.StatusAccepted).JSON(fiber.Map{
		"success": true,
		"message": fmt.Sprintf("Proses pencetakan massal berjalan di background untuk %d sertifikat. Anda akan menerima notifikasi jika sudah selesai.", len(studentIDsToGenerate)),
	})
}

func GetCertificateDetail(c *fiber.Ctx) error {
	id := c.Params("id")
	role, fakultasID := kencanaAdminScope(c)

	var cert models.KencanaCertificate
	q := config.DB.Preload("Student").Preload("Student.ProgramStudi")
	if role == "kencana_fakultas" {
		q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = kencana_certificates.student_id").
			Where("m.fakultas_id = ?", fakultasID)
	}
	if err := q.First(&cert, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Sertifikat tidak ditemukan atau di luar akses"})
	}
	return c.JSON(fiber.Map{"success": true, "data": cert})
}

func ListMentors(c *fiber.Ctx) error {
	var mentors []models.KencanaMentor
	q := applyKencanaMentorScope(c, config.DB.Preload("Fakultas").Preload("User").Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").Order("created_at desc"))
	if err := q.Find(&mentors).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat mentor"})
	}
	return c.JSON(fiber.Map{"success": true, "data": mentors})
}

func CreateMentor(c *fiber.Ctx) error {
	type reqBody struct {
		UserID     uint   `json:"user_id"`
		ScopeType  string `json:"scope_type"`
		FakultasID uint   `json:"fakultas_id"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload mentor tidak valid"})
	}
	req.ScopeType = strings.TrimSpace(req.ScopeType)
	if req.ScopeType == "" {
		req.ScopeType = "faculty"
	}
	role, adminFakultasID := kencanaAdminScope(c)

	var rbacRole models.RBACRole
	if err := config.DB.Where("key = ?", role).First(&rbacRole).Error; err == nil {
		var perms []string
		json.Unmarshal(rbacRole.Permissions, &perms)

		hasPerm := false
		for _, p := range perms {
			if p == "*" || p == "kencana.faculty.mentor.manage" || p == "kencana.mentor.university.manage" || p == "kencana.mentors.create" || p == "faculty.view" {
				hasPerm = true
				break
			}
		}
		if !hasPerm && role != "super_admin" && role != "kencana_admin" {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Anda tidak memiliki izin (permission) untuk membuat mentor"})
		}
	}
	isFacultyRole := strings.Contains(role, "fakultas") || strings.Contains(role, "faculty") || role == "kencana_fakultas"

	if isFacultyRole {
		if adminFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		req.ScopeType = "faculty"
		req.FakultasID = adminFakultasID
	} else if role == "kencana_admin" {
		req.ScopeType = "university"
		req.FakultasID = 0
	}
	if req.UserID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Mahasiswa (UserID) wajib dipilih"})
	}
	if req.ScopeType == "faculty" && req.FakultasID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Fakultas wajib dipilih untuk mentor fakultas"})
	}

	var mhs models.Mahasiswa
	if err := config.DB.Preload("Pengguna").Where("pengguna_id = ?", req.UserID).First(&mhs).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data mahasiswa tidak ditemukan"})
	}

	var mentor models.KencanaMentor
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		mentor = models.KencanaMentor{
			UserID:       req.UserID,
			Name:         mhs.Nama,
			Email:        mhs.Pengguna.Email,
			Phone:        mhs.NoHP,
			JenisKelamin: mhs.JenisKelamin,
			ScopeType:    req.ScopeType,
			Status:       "active",
		}
		if req.FakultasID != 0 {
			mentor.FakultasID = &req.FakultasID
		}
		if err := tx.Create(&mentor).Error; err != nil {
			return err
		}

		// Append kencana_mentor role to the user if they don't have it
		if !strings.Contains(mhs.Pengguna.Role, "kencana_mentor") {
			newRole := mhs.Pengguna.Role
			if newRole == "" {
				newRole = "kencana_mentor"
			} else {
				newRole = newRole + ",kencana_mentor"
			}
			if err := tx.Model(&models.User{}).Where("id = ?", req.UserID).Update("role", newRole).Error; err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat mentor: " + err.Error()})
	}
	return c.JSON(fiber.Map{"success": true, "data": mentor, "message": "Pembimbing berhasil ditambahkan"})
}

func UpdateMentor(c *fiber.Ctx) error {
	var mentor models.KencanaMentor
	q := applyKencanaMentorScope(c, config.DB)
	if err := q.First(&mentor, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mentor tidak ditemukan atau di luar scope"})
	}
	if err := c.BodyParser(&mentor); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload Mentor tidak valid"})
	}
	role, adminFakultasID := kencanaAdminScope(c)
	isFacultyRole := strings.Contains(role, "fakultas") || strings.Contains(role, "faculty") || role == "kencana_fakultas"
	if isFacultyRole {
		mentor.ScopeType = "faculty"
		mentor.FakultasID = &adminFakultasID
	}
	if err := config.DB.Save(&mentor).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui Mentor"})
	}
	return c.JSON(fiber.Map{"success": true, "data": mentor})
}

func DeleteMentor(c *fiber.Ctx) error {
	q := applyKencanaMentorScope(c, config.DB)
	if err := q.Delete(&models.KencanaMentor{}, c.Params("id")).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus mentor"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Mentor dihapus"})
}

func ListMentorAssignments(c *fiber.Ctx) error {
	var assignments []models.KencanaMentorAssignment
	q := applyKencanaMentorScope(c, config.DB).Preload("Mentor").Order("created_at desc")
	if periodID := c.Query("period_id"); periodID != "" {
		q = q.Where("period_id = ?", periodID)
	}
	if err := q.Find(&assignments).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat assignment mentor"})
	}
	return c.JSON(fiber.Map{"success": true, "data": assignments})
}

func CreateMentorAssignment(c *fiber.Ctx) error {
	type reqBody struct {
		PeriodID  uint `json:"period_id"`
		MentorID  uint `json:"mentor_id"`
		StudentID uint `json:"student_id"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || req.PeriodID == 0 || req.MentorID == 0 || req.StudentID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload assignment tidak valid"})
	}

	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		var mentor models.KencanaMentor
		if err := config.DB.First(&mentor, req.MentorID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mentor tidak ditemukan"})
		}
		if mentor.FakultasID == nil || *mentor.FakultasID != fakultasID {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Mentor tidak berada dalam fakultas yang sama"})
		}
	}

	uid, _ := userID(c)
	assignment := models.KencanaMentorAssignment{PeriodID: req.PeriodID, MentorID: req.MentorID, StudentID: req.StudentID, AssignedBy: &uid, AssignmentSource: "admin_assign", Status: "active"}
	if err := config.DB.Create(&assignment).Error; err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Gagal assign mentor. Pastikan mahasiswa belum punya mentor aktif."})
	}
	return c.JSON(fiber.Map{"success": true, "data": assignment})
}

func MoveMentorAssignment(c *fiber.Ctx) error {
	type reqBody struct {
		MentorID uint `json:"mentor_id"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || req.MentorID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Mentor tujuan wajib diisi"})
	}

	role, fakultasID := kencanaAdminScope(c)
	var assignment models.KencanaMentorAssignment
	if err := config.DB.First(&assignment, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Assignment tidak ditemukan"})
	}
	if role == "kencana_fakultas" {
		var mentor models.KencanaMentor
		if err := config.DB.First(&mentor, req.MentorID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mentor tujuan tidak ditemukan"})
		}
		if mentor.FakultasID == nil || *mentor.FakultasID != fakultasID {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Mentor tujuan tidak berada dalam fakultas yang sama"})
		}
	}

	assignment.MentorID = req.MentorID
	assignment.AssignmentSource = "admin_assign"
	if err := config.DB.Save(&assignment).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memindahkan mentor"})
	}
	return c.JSON(fiber.Map{"success": true, "data": assignment})
}

func DeleteMentorAssignment(c *fiber.Ctx) error {
	var assignment models.KencanaMentorAssignment
	if err := config.DB.First(&assignment, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Assignment tidak ditemukan"})
	}
	assignment.Status = "removed"
	if err := config.DB.Save(&assignment).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal melepas assignment"})
	}
	return c.JSON(fiber.Map{"success": true, "data": assignment})
}

func applyKencanaGroupScope(c *fiber.Ctx, q *gorm.DB) *gorm.DB {
	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		return q.Where("fakultas_id = ?", fakultasID)
	}
	return q
}

func ListGroups(c *fiber.Ctx) error {
	var groups []models.KencanaGroup
	q := config.DB.Model(&models.KencanaGroup{}).Preload("Period").Preload("Fakultas").Preload("Mentor").Preload("Members").Order("group_number asc, name asc")
	if periodID := c.Query("period_id"); periodID != "" {
		q = q.Where("period_id = ?", periodID)
	}
	if scopeType := c.Query("scope_type"); scopeType != "" && scopeType != "all" {
		q = q.Where("scope_type = ?", scopeType)
	}
	if status := c.Query("status"); status != "" && status != "all" {
		q = q.Where("status = ?", status)
	}
	if facultyID := c.Query("fakultas_id"); facultyID != "" && facultyID != "all" {
		q = q.Where("fakultas_id = ?", facultyID)
	}
	if search := strings.ToLower(c.Query("search")); search != "" {
		q = q.Where("LOWER(name) LIKE ? OR LOWER(code) LIKE ?", "%"+search+"%", "%"+search+"%")
	}
	q = applyKencanaGroupScope(c, q)
	if err := q.Find(&groups).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat kelompok"})
	}
	results := make([]fiber.Map, 0, len(groups))
	for _, group := range groups {
		results = append(results, groupResponse(group))
	}
	return c.JSON(fiber.Map{"success": true, "data": results})
}

func GetGroup(c *fiber.Ctx) error {
	var group models.KencanaGroup
	q := config.DB.Preload("Period").Preload("Fakultas").Preload("Mentor").Preload("Members.Student.Fakultas").Preload("Members.Student.ProgramStudi")
	q = applyKencanaGroupScope(c, q)
	if err := q.First(&group, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kelompok tidak ditemukan"})
	}
	return c.JSON(fiber.Map{"success": true, "data": groupResponse(group)})
}

func CreateGroup(c *fiber.Ctx) error {
	var group models.KencanaGroup
	if err := c.BodyParser(&group); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload kelompok tidak valid"})
	}
	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Scope fakultas tidak ditemukan"})
		}
		group.ScopeType = "faculty"
		group.FakultasID = &scopedFakultasID
	}
	if group.PeriodID == 0 || group.Name == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode dan nama kelompok wajib diisi"})
	}

	// Auto-generate group_number: find max for this period+scope and increment
	var maxNum int
	q := config.DB.Model(&models.KencanaGroup{}).Where("period_id = ? AND scope_type = ?", group.PeriodID, group.ScopeType)
	if group.ScopeType == "faculty" && group.FakultasID != nil {
		q = q.Where("fakultas_id = ?", *group.FakultasID)
	}
	q.Select("COALESCE(MAX(group_number), 0)").Row().Scan(&maxNum)
	group.GroupNumber = maxNum + 1

	prepareGroupDefaults(&group)
	uid, _ := userID(c)
	group.CreatedBy = &uid
	if err := validateGroupMentorScope(&group); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	if err := config.DB.Create(&group).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat kelompok"})
	}
	config.DB.Preload("Period").Preload("Fakultas").Preload("Mentor").Preload("Members").First(&group, group.ID)
	return c.JSON(fiber.Map{"success": true, "data": groupResponse(group), "message": "Kelompok berhasil dibuat"})
}

func UpdateGroup(c *fiber.Ctx) error {
	var group models.KencanaGroup
	q := applyKencanaGroupScope(c, config.DB.Model(&models.KencanaGroup{}))
	if err := q.First(&group, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kelompok tidak ditemukan"})
	}
	var payload models.KencanaGroup
	if err := c.BodyParser(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload kelompok tidak valid"})
	}
	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		payload.ScopeType = "faculty"
		payload.FakultasID = &scopedFakultasID
	}
	if payload.PeriodID == 0 {
		payload.PeriodID = group.PeriodID
	}
	if payload.Name == "" {
		payload.Name = group.Name
	}
	if payload.ScopeType == "" {
		payload.ScopeType = group.ScopeType
	}
	if payload.Capacity <= 0 {
		payload.Capacity = group.Capacity
	}
	if payload.Status == "" {
		payload.Status = group.Status
	}
	prepareGroupDefaults(&payload)
	if err := validateGroupMentorScope(&payload); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	updates := map[string]interface{}{"period_id": payload.PeriodID, "fakultas_id": payload.FakultasID, "mentor_id": payload.MentorID, "name": payload.Name, "code": payload.Code, "description": payload.Description, "scope_type": payload.ScopeType, "capacity": payload.Capacity, "status": payload.Status}
	if err := config.DB.Model(&group).Updates(updates).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui kelompok"})
	}
	config.DB.Preload("Period").Preload("Fakultas").Preload("Mentor").Preload("Members").First(&group, group.ID)
	return c.JSON(fiber.Map{"success": true, "data": groupResponse(group), "message": "Kelompok berhasil diperbarui"})
}

func DeleteGroup(c *fiber.Ctx) error {
	var group models.KencanaGroup
	q := applyKencanaGroupScope(c, config.DB.Model(&models.KencanaGroup{}))
	if err := q.First(&group, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kelompok tidak ditemukan"})
	}
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("group_id = ?", group.ID).Delete(&models.KencanaGroupMember{}).Error; err != nil {
			return err
		}
		return tx.Delete(&group).Error
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus kelompok"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Kelompok berhasil dihapus"})
}

func AddGroupMembers(c *fiber.Ctx) error {
	var group models.KencanaGroup
	q := applyKencanaGroupScope(c, config.DB.Model(&models.KencanaGroup{}))
	if err := q.First(&group, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kelompok tidak ditemukan"})
	}
	var req struct {
		StudentIDs []uint `json:"student_ids"`
	}
	if err := c.BodyParser(&req); err != nil || len(req.StudentIDs) == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "student_ids wajib diisi"})
	}
	now := time.Now().UTC()
	uid, _ := userID(c)
	added := 0
	for _, studentID := range req.StudentIDs {
		if err := validateStudentForGroup(group, studentID); err != nil {
			continue
		}
		var existing models.KencanaGroupMember
		err := config.DB.Unscoped().Where("period_id = ? AND student_id = ?", group.PeriodID, studentID).First(&existing).Error
		if err == nil {
			existing.GroupID = group.ID
			existing.Status = "active"
			existing.DeletedAt = gorm.DeletedAt{}
			existing.JoinedAt = &now
			existing.AddedBy = &uid
			if config.DB.Unscoped().Save(&existing).Error == nil {
				added++
			}
		} else {
			member := models.KencanaGroupMember{GroupID: group.ID, PeriodID: group.PeriodID, StudentID: studentID, Status: "active", JoinedAt: &now, AddedBy: &uid}
			if config.DB.Create(&member).Error == nil {
				added++
			}
		}
	}
	return c.JSON(fiber.Map{"success": true, "message": fmt.Sprintf("%d mahasiswa dimasukkan ke kelompok", added)})
}

func RemoveGroupMember(c *fiber.Ctx) error {
	var group models.KencanaGroup
	q := applyKencanaGroupScope(c, config.DB.Model(&models.KencanaGroup{}))
	if err := q.First(&group, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Kelompok tidak ditemukan"})
	}
	studentParam, err := c.ParamsInt("studentId")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "student_id tidak valid"})
	}
	studentID := uint(studentParam)
	if studentID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "student_id wajib diisi"})
	}
	if err := config.DB.Where("group_id = ? AND student_id = ?", group.ID, studentID).Delete(&models.KencanaGroupMember{}).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal mengeluarkan anggota"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Anggota dikeluarkan dari kelompok"})
}

func AutoAssignGroups(c *fiber.Ctx) error {
	var req struct {
		PeriodID       uint   `json:"period_id"`
		ScopeType      string `json:"scope_type"`
		FakultasID     *uint  `json:"fakultas_id"`
		Prefix         string `json:"prefix"`
		GroupCount     int    `json:"group_count"`
		Capacity       int    `json:"capacity"`
		OnlyUnassigned bool   `json:"only_unassigned"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload auto assign tidak valid"})
	}
	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		req.ScopeType = "faculty"
		req.FakultasID = &scopedFakultasID
	}
	if req.PeriodID == 0 || req.GroupCount <= 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "period_id dan group_count wajib diisi"})
	}
	if req.ScopeType == "" {
		req.ScopeType = "university"
	}
	if req.Prefix == "" {
		req.Prefix = "Kelompok"
	}
	if req.Capacity <= 0 {
		req.Capacity = 30
	}
	uid, _ := userID(c)
	var students []models.Mahasiswa
	studentQ := config.DB.Order("nama asc")
	if req.ScopeType == "faculty" && req.FakultasID != nil {
		studentQ = studentQ.Where("fakultas_id = ?", *req.FakultasID)
	}
	if req.OnlyUnassigned {
		studentQ = studentQ.Joins("LEFT JOIN mahasiswa.kencana_group_members ON mahasiswa.kencana_group_members.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_group_members.period_id = ?", req.PeriodID).Where("mahasiswa.kencana_group_members.id IS NULL")
	}
	studentQ.Find(&students)
	if len(students) == 0 {
		return c.JSON(fiber.Map{"success": true, "message": "Tidak ada mahasiswa untuk dibagi", "data": []models.KencanaGroup{}})
	}
	groups := make([]models.KencanaGroup, 0, req.GroupCount)
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		for i := 1; i <= req.GroupCount; i++ {
			group := models.KencanaGroup{PeriodID: req.PeriodID, FakultasID: req.FakultasID, GroupNumber: i, Name: fmt.Sprintf("%s %d", req.Prefix, i), Code: fmt.Sprintf("KEL-%02d", i), ScopeType: req.ScopeType, Capacity: req.Capacity, Status: "active", CreatedBy: &uid}
			if err := tx.Create(&group).Error; err != nil {
				return err
			}
			groups = append(groups, group)
		}
		now := time.Now().UTC()
		for idx, student := range students {
			group := groups[idx%len(groups)]
			member := models.KencanaGroupMember{GroupID: group.ID, PeriodID: req.PeriodID, StudentID: student.ID, Status: "active", JoinedAt: &now, AddedBy: &uid}
			if err := tx.Where("period_id = ? AND student_id = ?", req.PeriodID, student.ID).Assign(member).FirstOrCreate(&member).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membagi kelompok"})
	}
	return c.JSON(fiber.Map{"success": true, "data": groups, "message": fmt.Sprintf("%d mahasiswa dibagi ke %d kelompok", len(students), len(groups))})
}

func prepareGroupDefaults(group *models.KencanaGroup) {
	if group.ScopeType == "" {
		group.ScopeType = "university"
	}
	if group.ScopeType == "university" {
		group.FakultasID = nil
	}
	if group.Capacity <= 0 {
		group.Capacity = 30
	}
	if group.Status == "" {
		group.Status = "active"
	}
	if group.MentorID != nil && *group.MentorID == 0 {
		group.MentorID = nil
	}
}

func validateGroupMentorScope(group *models.KencanaGroup) error {
	if group.MentorID == nil || *group.MentorID == 0 {
		group.MentorID = nil
		return nil
	}
	var mentor models.KencanaMentor
	if err := config.DB.First(&mentor, *group.MentorID).Error; err != nil {
		return fmt.Errorf("mentor tidak ditemukan")
	}
	if group.ScopeType == "faculty" {
		if group.FakultasID == nil || mentor.FakultasID == nil || *mentor.FakultasID != *group.FakultasID {
			return fmt.Errorf("mentor harus sesuai fakultas kelompok")
		}
	} else if mentor.ScopeType == "faculty" {
		return fmt.Errorf("kelompok university harus memakai mentor scope university")
	}
	return nil
}

func validateStudentForGroup(group models.KencanaGroup, studentID uint) error {
	var student models.Mahasiswa
	if err := config.DB.First(&student, studentID).Error; err != nil {
		return err
	}
	if group.ScopeType == "faculty" {
		if group.FakultasID == nil || student.FakultasID != *group.FakultasID {
			return fmt.Errorf("mahasiswa tidak sesuai fakultas kelompok")
		}
	}
	return nil
}

func groupResponse(group models.KencanaGroup) fiber.Map {
	members := make([]fiber.Map, 0, len(group.Members))
	for _, member := range group.Members {
		student := member.Student
		members = append(members, fiber.Map{"id": member.ID, "student_id": member.StudentID, "status": member.Status, "joined_at": member.JoinedAt, "student": fiber.Map{"id": student.ID, "nim": student.NIM, "nama": student.Nama, "fakultas_name": student.Fakultas.Nama, "program_studi_name": student.ProgramStudi.Nama}})
	}
	mentorName := "-"
	if group.Mentor != nil {
		mentorName = group.Mentor.Name
	}
	fakultasName := "-"
	if group.Fakultas != nil {
		fakultasName = group.Fakultas.Nama
	}
	return fiber.Map{
		"id": group.ID, "period_id": group.PeriodID, "fakultas_id": group.FakultasID, "fakultas_name": fakultasName,
		"mentor_id": group.MentorID, "mentor_name": mentorName, "group_number": group.GroupNumber, "name": group.Name, "code": group.Code, "description": group.Description,
		"scope_type": group.ScopeType, "capacity": group.Capacity, "status": group.Status,
		"members_count": len(group.Members), "members": members,
	}
}

func createRecord(c *fiber.Ctx, dest any, label string) error {
	if err := c.BodyParser(dest); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload " + label + " tidak valid"})
	}
	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" && fakultasID != 0 {
		if fScoped, ok := dest.(interface{ SetFakultasID(id *uint) }); ok {
			fScoped.SetFakultasID(&fakultasID)
		}
	} else if role == "super_admin" || role == "kencana_admin" {
		if reqFakultasID := c.QueryInt("fakultas_id"); reqFakultasID != 0 {
			uFid := uint(reqFakultasID)
			if fScoped, ok := dest.(interface{ SetFakultasID(id *uint) }); ok {
				fScoped.SetFakultasID(&uFid)
			}
		}
	}
	uid, uidErr := userID(c)
	if uidErr == nil {
		if cb, ok := dest.(interface{ SetCreatedBy(id *uint) }); ok {
			cb.SetCreatedBy(&uid)
		}
	}
	if err := config.DB.Create(dest).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat " + label})
	}
	return c.JSON(fiber.Map{"success": true, "data": dest})
}

func updateRecord(c *fiber.Ctx, dest any, label string) error {
	if err := config.DB.First(dest, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": label + " tidak ditemukan"})
	}
	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if fScoped, ok := dest.(interface{ GetFakultasID() *uint }); ok {
			fid := fScoped.GetFakultasID()
			if fid == nil || *fid != fakultasID {
				return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Anda tidak berwenang memperbarui item ini."})
			}
		}
	}
	if err := c.BodyParser(dest); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload " + label + " tidak valid"})
	}
	if role == "kencana_fakultas" && fakultasID != 0 {
		if fScoped, ok := dest.(interface{ SetFakultasID(id *uint) }); ok {
			fScoped.SetFakultasID(&fakultasID)
		}
	}
	if err := config.DB.Model(dest).Updates(dest).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui " + label})
	}
	return c.JSON(fiber.Map{"success": true, "data": dest})
}

// ──────────────────────────────────────────────
//  MATERIAL MANAGEMENT
// ──────────────────────────────────────────────

func UpdateMaterial(c *fiber.Ctx) error { return updateRecord(c, &models.KencanaMaterial{}, "Materi") }

func DeleteMaterial(c *fiber.Ctx) error {
	var m models.KencanaMaterial
	if err := config.DB.First(&m, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Materi tidak ditemukan"})
	}
	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if m.FakultasID == nil || *m.FakultasID != fakultasID {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Anda tidak berwenang menghapus materi ini."})
		}
	}
	// Hapus file fisik jika ada
	if m.FileURL != "" {
		path := "." + m.FileURL
		_ = os.Remove(path)
	}
	if err := config.DB.Delete(&m).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus materi"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Materi dihapus"})
}
func UploadMedia(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "File tidak ditemukan di request"})
	}

	// Validasi ekstensi
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExt := map[string]bool{
		".pdf": true, ".doc": true, ".docx": true,
		".jpg": true, ".jpeg": true, ".png": true, ".webp": true,
		".mp4": true,
	}
	if !allowedExt[ext] {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tipe file tidak diizinkan. Gunakan PDF/DOC, Gambar, atau MP4."})
	}

	// Buat direktori jika belum ada
	uploadDir := "./uploads/kencana/media"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat direktori upload"})
	}

	// Buat nama file unik
	filename := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
	savePath := filepath.Join(uploadDir, filename)

	// Simpan file
	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file"})
	}

	fileURL := "/uploads/kencana/media/" + filename
	return c.JSON(fiber.Map{
		"success": true,
		"url":     fileURL,
		"message": "File berhasil diunggah",
	})
}

func UploadMaterial(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "File tidak ditemukan di request"})
	}

	// Validasi ekstensi yang diizinkan
	ext := strings.ToLower(filepath.Ext(file.Filename))
	allowedExt := map[string]bool{".pdf": true, ".doc": true, ".docx": true, ".ppt": true, ".pptx": true, ".xlsx": true, ".xls": true, ".jpg": true, ".jpeg": true, ".png": true, ".mp4": true}
	if !allowedExt[ext] {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Tipe file tidak diizinkan. Gunakan PDF, DOC, PPT, gambar, atau video."})
	}

	// Buat direktori jika belum ada
	uploadDir := "./uploads/kencana/materials"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal membuat direktori upload"})
	}

	// Nama file unik agar tidak bertabrakan
	uniqueName := fmt.Sprintf("%d_%s", time.Now().UnixNano(), file.Filename)
	savePath := filepath.Join(uploadDir, uniqueName)

	if err := c.SaveFile(file, savePath); err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan file"})
	}

	// URL publik yang akan disimpan ke database
	publicURL := "/uploads/kencana/materials/" + uniqueName

	// Parse data materi dari form
	sessionID := c.FormValue("session_id")
	title := c.FormValue("title")
	if title == "" {
		title = strings.TrimSuffix(file.Filename, ext)
	}

	// Tentukan tipe materi dari ekstensi
	materialType := "file"
	if ext == ".mp4" {
		materialType = "video"
	} else if ext == ".pdf" {
		materialType = "pdf"
	}

	material := models.KencanaMaterial{
		Title:            title,
		Type:             materialType,
		FileURL:          publicURL,
		OriginalFileName: file.Filename,
		IsRequired:       true,
	}

	if sessionID != "" {
		var sid uint
		fmt.Sscanf(sessionID, "%d", &sid)
		material.SessionID = sid
	}

	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" && fakultasID != 0 {
		material.FakultasID = &fakultasID
	} else if role == "super_admin" || role == "kencana_admin" {
		if reqFakultasID := c.QueryInt("fakultas_id"); reqFakultasID != 0 {
			uFid := uint(reqFakultasID)
			material.FakultasID = &uFid
		}
	}

	if err := config.DB.Create(&material).Error; err != nil {
		_ = os.Remove(savePath)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan data materi ke database"})
	}

	return c.JSON(fiber.Map{"success": true, "data": material, "url": publicURL})
}

// ──────────────────────────────────────────────
//  ASSIGNMENT MANAGEMENT
// ──────────────────────────────────────────────

func UpdateAssignment(c *fiber.Ctx) error {
	return updateRecord(c, &models.KencanaAssignment{}, "Tugas")
}

func DeleteAssignment(c *fiber.Ctx) error {
	var a models.KencanaAssignment
	if err := config.DB.First(&a, c.Params("id")).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Tugas tidak ditemukan"})
	}
	role, fakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if a.FakultasID == nil || *a.FakultasID != fakultasID {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Akses ditolak. Anda tidak berwenang menghapus tugas ini."})
		}
	}
	if err := config.DB.Delete(&a).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus tugas"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Tugas dihapus"})
}

// ──────────────────────────────────────────────
//  SCORE MANAGEMENT (ADMIN)
// ──────────────────────────────────────────────

// UpsertScoreItem — Admin dapat input/update satu sub-item nilai mahasiswa
func UpsertScoreItem(c *fiber.Ctx) error {
	type reqBody struct {
		PeriodID  uint    `json:"period_id"`
		StudentID uint    `json:"student_id"`
		Component string  `json:"component"` // cognitive / psychomotor / affective
		ItemName  string  `json:"item_name"`
		Score     float64 `json:"score"`
		Notes     string  `json:"notes"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || req.StudentID == 0 || req.ItemName == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload nilai tidak valid"})
	}
	validComponents := map[string]bool{"cognitive": true, "psychomotor": true, "affective": true, "requirements": true}
	if !validComponents[req.Component] {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Komponen tidak valid. Gunakan: cognitive, psychomotor, affective, requirements"})
	}
	if req.Score < 0 || req.Score > 100 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Nilai harus antara 0 dan 100"})
	}
	if req.PeriodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode aktif tidak ditemukan"})
		}
		req.PeriodID = period.ID
	}

	role, fakultasID := kencanaAdminScope(c)
	scopeType := "university"
	if role == "kencana_fakultas" {
		scopeType = "faculty"
		var student models.Mahasiswa
		if err := config.DB.First(&student, req.StudentID).Error; err != nil {
			return c.Status(404).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak ditemukan"})
		}
		if student.FakultasID != fakultasID {
			return c.Status(403).JSON(fiber.Map{"success": false, "message": "Mahasiswa tidak berada dalam fakultas yang sama"})
		}
	}

	uid, _ := userID(c)
	now := time.Now().UTC()

	// Cari item yang sudah ada dengan kombinasi period+student+component+itemName
	var existing models.KencanaScoreItem
	err := config.DB.Where("period_id = ? AND student_id = ? AND component = ? AND item_name = ? AND scope_type = ?",
		req.PeriodID, req.StudentID, req.Component, req.ItemName, scopeType).First(&existing).Error

	if err == nil {
		// Update yang sudah ada
		existing.Score = req.Score
		existing.Notes = req.Notes
		existing.AssessedBy = &uid
		existing.AssessedAt = &now
		if err := config.DB.Save(&existing).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memperbarui nilai"})
		}
		calculateAndStoreScore(config.DB, req.PeriodID, req.StudentID)
		return c.JSON(fiber.Map{"success": true, "data": existing})
	}

	// Buat baru
	item := models.KencanaScoreItem{
		PeriodID: req.PeriodID, StudentID: req.StudentID,
		Component: req.Component, ItemName: req.ItemName,
		Score: req.Score, SourceType: "manual",
		AssessedBy: &uid, AssessedAt: &now, Notes: req.Notes,
		ScopeType: scopeType,
	}
	if err := config.DB.Create(&item).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan nilai"})
	}
	calculateAndStoreScore(config.DB, req.PeriodID, req.StudentID)
	return c.JSON(fiber.Map{"success": true, "data": item})
}

// BulkUpsertScoreItems — Input nilai banyak mahasiswa sekaligus
func BulkUpsertScoreItems(c *fiber.Ctx) error {
	type itemPayload struct {
		StudentID uint    `json:"student_id"`
		Component string  `json:"component"`
		ItemName  string  `json:"item_name"`
		Score     float64 `json:"score"`
		Notes     string  `json:"notes"`
	}
	type reqBody struct {
		PeriodID uint          `json:"period_id"`
		Items    []itemPayload `json:"items"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || len(req.Items) == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload tidak valid"})
	}
	if req.PeriodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode aktif tidak ditemukan"})
		}
		req.PeriodID = period.ID
	}

	role, fakultasID := kencanaAdminScope(c)
	scopeType := "university"
	if role == "kencana_fakultas" {
		scopeType = "faculty"
	}

	uid, _ := userID(c)
	now := time.Now().UTC()
	updatedStudents := map[uint]bool{}

	for _, it := range req.Items {
		if it.Score < 0 || it.Score > 100 {
			continue
		}
		if role == "kencana_fakultas" {
			var student models.Mahasiswa
			if err := config.DB.First(&student, it.StudentID).Error; err != nil {
				continue
			}
			if student.FakultasID != fakultasID {
				continue
			}
		}
		var existing models.KencanaScoreItem
		err := config.DB.Where("period_id = ? AND student_id = ? AND component = ? AND item_name = ? AND scope_type = ?",
			req.PeriodID, it.StudentID, it.Component, it.ItemName, scopeType).First(&existing).Error
		if err == nil {
			existing.Score = it.Score
			existing.Notes = it.Notes
			existing.AssessedBy = &uid
			existing.AssessedAt = &now
			config.DB.Save(&existing)
		} else {
			item := models.KencanaScoreItem{
				PeriodID: req.PeriodID, StudentID: it.StudentID,
				Component: it.Component, ItemName: it.ItemName,
				Score: it.Score, SourceType: "manual",
				AssessedBy: &uid, AssessedAt: &now, Notes: it.Notes,
				ScopeType: scopeType,
			}
			config.DB.Create(&item)
		}
		updatedStudents[it.StudentID] = true
	}

	// Recalculate scores untuk semua mahasiswa yang datanya diupdate
	for sid := range updatedStudents {
		calculateAndStoreScore(config.DB, req.PeriodID, sid)
	}

	return c.JSON(fiber.Map{"success": true, "message": fmt.Sprintf("%d item nilai berhasil disimpan", len(req.Items))})
}

// CalculateAllScores — Admin klik "Hitung Nilai Semua" untuk satu periode
func CalculateAllScores(c *fiber.Ctx) error {
	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode tidak ditemukan"})
		}
		periodID = period.ID
	}
	var studentIDs []uint
	studentQuery := config.DB.Model(&models.Mahasiswa{})
	role, scopedFakultasID := kencanaAdminScope(c)
	if role == "kencana_fakultas" {
		if scopedFakultasID == 0 {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Admin Kencana Fakultas belum memiliki scope fakultas"})
		}
		studentQuery = studentQuery.Where("fakultas_id = ?", scopedFakultasID)
	}
	studentQuery.Pluck("id", &studentIDs)

	// Ambil ID pengguna admin untuk dikirimi notifikasi saat selesai
	adminUID, _ := userID(c)

	go func(pID uint, sIDs []uint, aUID uint) {
		calculated := 0
		for _, sid := range sIDs {
			_, _, err := calculateAndStoreScore(config.DB, pID, sid)
			if err == nil {
				calculated++
			}
		}

		if aUID != 0 {
			notifikasi.Kirim(config.DB, notifikasi.KirimParams{
				UserID:  aUID,
				Type:    "success",
				Title:   "Kalkulasi Nilai Selesai",
				Content: fmt.Sprintf("Proses perhitungan massal nilai Kencana berhasil. %d mahasiswa telah dihitung nilainya.", calculated),
			})
		}
	}(periodID, studentIDs, adminUID)

	return c.JSON(fiber.Map{"success": true, "message": "Proses kalkulasi sedang berjalan di latar belakang. Anda akan menerima notifikasi saat selesai."})
}

// AdminListScoreItems — Lihat semua score item untuk satu mahasiswa (per periode)
func AdminListScoreItems(c *fiber.Ctx) error {
	periodID := uint(c.QueryInt("period_id"))
	studentID := uint(c.QueryInt("student_id"))
	if studentID == 0 {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "student_id wajib diisi"})
	}
	if periodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode aktif tidak ditemukan"})
		}
		periodID = period.ID
	}
	role, scopedFakultasID := kencanaAdminScope(c)
	scopeType := "university"
	var facId *uint
	if role == "kencana_fakultas" {
		scopeType = "fakultas"
		if scopedFakultasID != 0 {
			facId = &scopedFakultasID
		}
	}

	var items []models.KencanaScoreItem
	qItems := config.DB.Where("period_id = ? AND student_id = ? AND scope_type = ?", periodID, studentID, scopeType)
	if scopeType == "fakultas" && facId != nil {
		qItems = qItems.Where("fakultas_id = ?", facId)
	}
	qItems.Order("component asc, item_name asc").Find(&items)

	score, blockers, _ := calculateAndStoreScoreForScope(config.DB, periodID, studentID, scopeType, facId, true)

	return c.JSON(fiber.Map{"success": true, "data": fiber.Map{
		"items":             items,
		"score":             score,
		"blockers":          blockers,
		"score_definitions": mentorScoreDefinitions(periodID, scopeType, facId),
	}})
}

// SearchStudents mencari mahasiswa untuk ditambahkan sebagai mentor (berdasarkan nama/nim)
func SearchStudents(c *fiber.Ctx) error {
	var students []models.Mahasiswa
	query := config.DB.Preload("Pengguna").Preload("ProgramStudi.Fakultas")

	// Apply isolation data (Fakultas Scope)
	role, fakultasID := kencanaAdminScope(c)
	if strings.Contains(role, "fakultas") || strings.Contains(role, "faculty") || role == "kencana_fakultas" {
		if fakultasID != 0 {
			query = query.Where("fakultas_id = ?", fakultasID)
		}
	}

	if search := c.Query("search"); search != "" {
		query = query.Where("nama_mahasiswa ILIKE ? OR nim ILIKE ?", "%"+search+"%", "%"+search+"%")
	}

	if err := query.Limit(30).Find(&students).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	results := []map[string]interface{}{}
	for _, s := range students {
		email := "-"
		if s.Pengguna.ID != 0 {
			email = s.Pengguna.Email
		}
		prodiName := "-"
		fakultasName := "-"
		var fakultasID uint
		if s.ProgramStudi.ID != 0 {
			prodiName = s.ProgramStudi.Nama
			fakultasID = s.ProgramStudi.FakultasID
			if s.ProgramStudi.Fakultas.ID != 0 {
				fakultasName = s.ProgramStudi.Fakultas.Nama
			}
		}
		results = append(results, map[string]interface{}{
			"id":            s.ID,
			"user_id":       s.PenggunaID,
			"name":          s.Nama,
			"nim":           s.NIM,
			"email":         email,
			"phone":         s.NoHP,
			"jenis_kelamin": s.JenisKelamin,
			"prodi":         prodiName,
			"fakultas":      fakultasName,
			"fakultas_id":   fakultasID,
		})
	}
	return c.JSON(fiber.Map{"success": true, "data": results})
}

// AdminListBanding returns a list of Kencana Banding requests
func AdminListBanding(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)
	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode aktif tidak ditemukan"})
		}
		periodID = period.ID
	}

	var bandings []models.KencanaBanding
	q := config.DB.Preload("Student").Preload("Student.ProgramStudi").Preload("Student.ProgramStudi.Fakultas").Where("period_id = ?", periodID)

	if role == "kencana_fakultas" {
		q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = kencana_bandings.student_id").
			Joins("JOIN fakultas.program_studi p ON p.id = m.prodi_id").
			Where("p.fakultas_id = ?", fakultasID).
			Where("kencana_bandings.type = 'fakultas'")
	} else if role == "kencana_admin" {
		q = q.Where("kencana_bandings.type = 'universitas'")
	}

	if status := c.Query("status"); status != "" {
		q = q.Where("kencana_bandings.status = ?", status)
	}

	if err := q.Order("created_at desc").Find(&bandings).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat data banding"})
	}

	return c.JSON(fiber.Map{"success": true, "data": bandings})
}

// AdminRespondBanding handles approval/rejection of a banding request
func AdminRespondBanding(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)
	bandingID := c.Params("id")

	var banding models.KencanaBanding
	q := config.DB.Preload("Student").Preload("Student.ProgramStudi")
	if role == "kencana_fakultas" {
		q = q.Joins("JOIN mahasiswa.mahasiswa m ON m.id = kencana_bandings.student_id").
			Joins("JOIN public.program_studi p ON p.id = m.prodi_id").
			Where("p.fakultas_id = ?", fakultasID)
	}

	if err := q.First(&banding, bandingID).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Data banding tidak ditemukan atau di luar scope akses"})
	}

	type reqBody struct {
		Status        string `json:"status"` // approved, rejected
		AdminResponse string `json:"admin_response"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Payload tidak valid"})
	}

	uid, _ := userID(c)
	now := time.Now().UTC()

	banding.Status = req.Status
	banding.AdminResponse = req.AdminResponse
	banding.ReviewedBy = &uid
	banding.ReviewedAt = &now

	if err := config.DB.Save(&banding).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal merespon banding"})
	}

	// Auto-recalculate score jika banding disetujui
	if req.Status == "approved" {
		calculateAndStoreScore(config.DB, banding.PeriodID, banding.StudentID)
	}

	return c.JSON(fiber.Map{"success": true, "message": "Respon banding berhasil disimpan", "data": banding})
}

func AdminDownloadScoresPDF(c *fiber.Ctx) error {
	search := strings.ToLower(c.Query("search"))
	periodID := uint(c.QueryInt("period_id"))
	if periodID == 0 {
		period, err := activePeriod(config.DB)
		if err == nil {
			periodID = period.ID
		}
	}

	var pmbPeriodeId string
	var targetTahunMasuk int
	if periodID != 0 {
		var p models.KencanaPeriod
		if err := config.DB.First(&p, periodID).Error; err == nil {
			pmbPeriodeId = p.PmbPeriodeId
			if p.Year > 0 {
				targetTahunMasuk = p.Year
			}
		}
	}
	if targetTahunMasuk == 0 {
		targetTahunMasuk = time.Now().Year()
	}

	groupID := c.Query("group_id")
	status := c.Query("status")
	var rows []PDFRowData

	if pmbPeriodeId != "" {
		var pmbRecords []models.PendaftaranMahasiswaBaru
		q := config.DB.Model(&models.PendaftaranMahasiswaBaru{}).Where("id_periode = ?", pmbPeriodeId)
		if search != "" {
			q = q.Where("LOWER(nama_lengkap) LIKE ? OR LOWER(nim) LIKE ? OR LOWER(nomor_daftar) LIKE ? OR LOWER(email) LIKE ?", "%"+search+"%", "%"+search+"%", "%"+search+"%", "%"+search+"%")
		}
		q = q.Order("nama_lengkap asc")
		if err := q.Find(&pmbRecords).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat data"})
		}
		for _, r := range pmbRecords {
			nim := r.NIM
			if nim == "" {
				nim = r.NomorDaftar
			}
			prodiName := r.PilihanProdi
			jalurName := r.Jalur
			if prodiName == "" {
				prodiName = r.Jalur
				jalurName = "-"
			}
			student := models.Mahasiswa{NIM: nim, Nama: r.NamaLengkap, JenisKelamin: r.JenisKelamin}
			student.ID = r.ID
			student.Fakultas = models.Fakultas{Nama: jalurName}
			student.ProgramStudi = models.ProgramStudi{Nama: prodiName}
			rows = append(rows, PDFRowData{
				Student: student,
				Score:   models.KencanaScore{PeriodID: periodID, StudentID: r.ID, GraduationStatus: "not_started"},
			})
		}
	} else {
		var students []models.Mahasiswa
		q := config.DB.Model(&models.Mahasiswa{}).Preload("Pengguna").Preload("Fakultas").Preload("ProgramStudi")
		if periodID != 0 {
			q = q.Where("mahasiswa.mahasiswa.tahun_masuk = ? OR mahasiswa.mahasiswa.id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE period_id = ?)", targetTahunMasuk, periodID)
		} else {
			q = q.Where("mahasiswa.mahasiswa.tahun_masuk = ?", targetTahunMasuk)
		}
		if groupID != "" && groupID != "all" && periodID != 0 {
			q = q.Joins("JOIN mahasiswa.kencana_group_members ON mahasiswa.kencana_group_members.student_id = mahasiswa.mahasiswa.id AND mahasiswa.kencana_group_members.period_id = ?", periodID).
				Where("mahasiswa.kencana_group_members.group_id = ?", groupID)
		}
		if search != "" {
			q = q.Where("LOWER(mahasiswa.mahasiswa.nama_mahasiswa) LIKE ? OR LOWER(mahasiswa.mahasiswa.nim) LIKE ?", "%"+search+"%", "%"+search+"%")
		}
		if status != "" && status != "all" {
			if status == "belum_lengkap" {
				q = q.Joins("LEFT JOIN mahasiswa.kencana_scores AS ks_status ON ks_status.student_id = mahasiswa.mahasiswa.id AND ks_status.period_id = ?", periodID).
					Where("ks_status.graduation_status IS NULL OR ks_status.graduation_status IN ('not_started', 'in_progress')")
			} else {
				q = q.Joins("LEFT JOIN mahasiswa.kencana_scores AS ks_status ON ks_status.student_id = mahasiswa.mahasiswa.id AND ks_status.period_id = ?", periodID).
					Where("ks_status.graduation_status = ?", status)
			}
		}
		q = q.Order("mahasiswa.mahasiswa.nama_mahasiswa asc")
		if err := q.Find(&students).Error; err != nil {
			return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat mahasiswa"})
		}
		studentIDs := make([]uint, 0, len(students))
		for _, student := range students {
			studentIDs = append(studentIDs, student.ID)
		}
		scoreMap := map[uint]models.KencanaScore{}
		itemsMap := map[uint][]models.KencanaScoreItem{}
		attMap := map[uint]int64{}
		if len(studentIDs) > 0 && periodID != 0 {
			var existingScores []models.KencanaScore
			config.DB.Where("period_id = ? AND student_id IN ?", periodID, studentIDs).Find(&existingScores)
			for _, score := range existingScores {
				scoreMap[score.StudentID] = score
			}
			var items []models.KencanaScoreItem
			config.DB.Where("student_id IN ? AND period_id = ?", studentIDs, periodID).Find(&items)
			for _, it := range items {
				itemsMap[it.StudentID] = append(itemsMap[it.StudentID], it)
			}
			var atts []models.KencanaAttendance
			config.DB.Where("student_id IN ? AND period_id = ? AND status = 'present'", studentIDs, periodID).Find(&atts)
			for _, a := range atts {
				attMap[a.StudentID]++
			}
		}
		for _, student := range students {
			score, ok := scoreMap[student.ID]
			if !ok {
				score = models.KencanaScore{PeriodID: periodID, StudentID: student.ID, GraduationStatus: "not_started"}
			}
			rows = append(rows, PDFRowData{Student: student, Score: score, Items: itemsMap[student.ID], AttendanceCount: attMap[student.ID]})
		}
	}

	groupName := "Semua Kelompok"
	if groupID != "" && groupID != "all" && periodID != 0 {
		var g models.KencanaGroup
		if err := config.DB.First(&g, groupID).Error; err == nil {
			groupName = g.Name
		}
	}
	evaluatorName := "Admin Kencana"
	fasilitatorName := "-"
	if groupName != "Semua Kelompok" {
		var group models.KencanaGroup
		config.DB.Preload("Mentor").Where("id = ?", groupID).First(&group)
		if group.Mentor != nil {
			fasilitatorName = group.Mentor.Name
			if fasilitatorName == "" {
				fasilitatorName = group.Mentor.Email
			}
		}
	} else {
		fasilitatorName = "Semua Fasilitator"
	}

	savePath, err := GenerateKencanaPDFHelper(groupName, fasilitatorName, evaluatorName, rows)
	if err != nil {
		fmt.Printf("PDF Error: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}
	return c.Download(savePath, filepath.Base(savePath))
}

// ==========================================
// CERTIFICATE SETTINGS
// ==========================================

func GetCertificateSettings(c *fiber.Ctx) error {
	var setting models.KencanaCertificateSetting
	if err := config.DB.First(&setting).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Settings not found"})
	}
	return c.Status(fiber.StatusOK).JSON(fiber.Map{"data": setting})
}

func UpdateCertificateSettings(c *fiber.Ctx) error {
	var setting models.KencanaCertificateSetting
	if err := config.DB.First(&setting).Error; err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "Settings not found"})
	}

	if err := c.BodyParser(&setting); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}

	if err := config.DB.Save(&setting).Error; err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to update settings"})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{"message": "Settings updated successfully", "data": setting})
}

func UploadCertificateLogo(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file uploaded"})
	}

	src, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open uploaded file"})
	}
	defer src.Close()

	// Decode the image (handles png, jpeg, etc.)
	img, _, err := image.Decode(src)
	if err != nil {
		// Fallback: save as original if not decodable
		ext := filepath.Ext(fileHeader.Filename)
		if ext == "" {
			ext = ".png"
		}
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		uploadDir := "./uploads/kencana/logo"
		os.MkdirAll(uploadDir, os.ModePerm)
		savePath := filepath.Join(uploadDir, filename)
		c.SaveFile(fileHeader, savePath)
		url := fmt.Sprintf("/uploads/kencana/logo/%s", filename)
		var setting models.KencanaCertificateSetting
		if err := config.DB.First(&setting).Error; err == nil {
			setting.LogoUrl = url
			config.DB.Save(&setting)
		}
		return c.JSON(fiber.Map{"url": url})
	}

	// It's a valid image, encode to WebP
	filename := fmt.Sprintf("%s.webp", uuid.New().String())
	uploadDir := "./uploads/kencana/logo"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	savePath := filepath.Join(uploadDir, filename)
	outFile, err := os.Create(savePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create destination file"})
	}
	defer outFile.Close()

	// Encode to WebP with 90% quality
	options := &webp.Options{Lossless: false, Quality: 90}
	if err := webp.Encode(outFile, img, options); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to convert image to WebP"})
	}

	url := fmt.Sprintf("/uploads/kencana/logo/%s", filename)

	// Update settings
	var setting models.KencanaCertificateSetting
	if err := config.DB.First(&setting).Error; err == nil {
		setting.LogoUrl = url
		config.DB.Save(&setting)
	}

	return c.JSON(fiber.Map{"url": url})
}

func UploadCertificateLeftLogo(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file uploaded"})
	}

	src, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open uploaded file"})
	}
	defer src.Close()

	// Decode the image
	img, _, err := image.Decode(src)
	if err != nil {
		ext := filepath.Ext(fileHeader.Filename)
		if ext == "" {
			ext = ".png"
		}
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		uploadDir := "./uploads/kencana/logo"
		os.MkdirAll(uploadDir, os.ModePerm)
		savePath := filepath.Join(uploadDir, filename)
		c.SaveFile(fileHeader, savePath)
		url := fmt.Sprintf("/uploads/kencana/logo/%s", filename)
		var setting models.KencanaCertificateSetting
		if err := config.DB.First(&setting).Error; err == nil {
			setting.LeftLogoUrl = url
			config.DB.Save(&setting)
		}
		return c.JSON(fiber.Map{"url": url})
	}

	filename := fmt.Sprintf("%s.webp", uuid.New().String())
	uploadDir := "./uploads/kencana/logo"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	savePath := filepath.Join(uploadDir, filename)
	outFile, err := os.Create(savePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create destination file"})
	}
	defer outFile.Close()

	options := &webp.Options{Lossless: false, Quality: 90}
	if err := webp.Encode(outFile, img, options); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to convert image to WebP"})
	}

	url := fmt.Sprintf("/uploads/kencana/logo/%s", filename)

	// Update settings
	var setting models.KencanaCertificateSetting
	if err := config.DB.First(&setting).Error; err == nil {
		setting.LeftLogoUrl = url
		config.DB.Save(&setting)
	}

	return c.JSON(fiber.Map{"url": url})
}

func UploadCertificateRightLogo(c *fiber.Ctx) error {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "No file uploaded"})
	}

	src, err := fileHeader.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to open uploaded file"})
	}
	defer src.Close()

	// Decode the image
	img, _, err := image.Decode(src)
	if err != nil {
		ext := filepath.Ext(fileHeader.Filename)
		if ext == "" {
			ext = ".png"
		}
		filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
		uploadDir := "./uploads/kencana/logo"
		os.MkdirAll(uploadDir, os.ModePerm)
		savePath := filepath.Join(uploadDir, filename)
		c.SaveFile(fileHeader, savePath)
		url := fmt.Sprintf("/uploads/kencana/logo/%s", filename)
		var setting models.KencanaCertificateSetting
		if err := config.DB.First(&setting).Error; err == nil {
			setting.RightLogoUrl = url
			config.DB.Save(&setting)
		}
		return c.JSON(fiber.Map{"url": url})
	}

	filename := fmt.Sprintf("%s.webp", uuid.New().String())
	uploadDir := "./uploads/kencana/logo"
	if err := os.MkdirAll(uploadDir, os.ModePerm); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create upload directory"})
	}

	savePath := filepath.Join(uploadDir, filename)
	outFile, err := os.Create(savePath)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to create destination file"})
	}
	defer outFile.Close()

	options := &webp.Options{Lossless: false, Quality: 90}
	if err := webp.Encode(outFile, img, options); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "Failed to convert image to WebP"})
	}

	url := fmt.Sprintf("/uploads/kencana/logo/%s", filename)

	// Update settings
	var setting models.KencanaCertificateSetting
	if err := config.DB.First(&setting).Error; err == nil {
		setting.RightLogoUrl = url
		config.DB.Save(&setting)
	}

	return c.JSON(fiber.Map{"url": url})
}

// ──────────────────────────────────────────────
//  ANNOUNCEMENT (PENGUMUMAN) HANDLERS
// ──────────────────────────────────────────────

func ListAnnouncements(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)
	var announcements []models.KencanaPengumuman
	q := config.DB.Order("created_at desc")
	if role == "kencana_fakultas" {
		q = q.Where("scope_type = ? AND (fakultas_id IS NULL OR fakultas_id = ?)", "faculty", fakultasID)
	}
	if err := q.Find(&announcements).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal memuat pengumuman"})
	}
	return c.JSON(fiber.Map{"success": true, "data": announcements})
}

func CreateAnnouncement(c *fiber.Ctx) error {
	type reqBody struct {
		PeriodID   uint   `json:"period_id"`
		Judul      string `json:"judul"`
		Isi        string `json:"isi"`
		TargetRole string `json:"target_role"`
	}
	var req reqBody
	if err := c.BodyParser(&req); err != nil || req.Judul == "" || req.Isi == "" {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Judul dan isi pengumuman wajib diisi"})
	}
	if req.TargetRole == "" {
		req.TargetRole = "mahasiswa"
	}
	validTargets := map[string]bool{"mahasiswa": true, "mentor": true, "both": true}
	if !validTargets[req.TargetRole] {
		return c.Status(400).JSON(fiber.Map{"success": false, "message": "Target role tidak valid. Gunakan: mahasiswa, mentor, both"})
	}
	if req.PeriodID == 0 {
		period, err := activePeriod(config.DB)
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"success": false, "message": "Periode aktif tidak ditemukan"})
		}
		req.PeriodID = period.ID
	}

	role, fakultasID := kencanaAdminScope(c)
	uid, _ := userID(c)
	scopeType := scopeTypeUniversity
	if role == "kencana_fakultas" {
		scopeType = scopeTypeFaculty
	}

	pengumuman := models.KencanaPengumuman{
		PeriodID:   req.PeriodID,
		Judul:      req.Judul,
		Isi:        req.Isi,
		TargetRole: req.TargetRole,
		CreatedBy:  uid,
		ScopeType:  scopeType,
	}
	if role == "kencana_fakultas" {
		pengumuman.FakultasID = &fakultasID
	}
	if err := config.DB.Create(&pengumuman).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menyimpan pengumuman"})
	}

	go broadcastAnnouncement(config.DB, pengumuman, fakultasID)

	return c.JSON(fiber.Map{"success": true, "data": pengumuman, "message": "Pengumuman berhasil dikirim"})
}

func DeleteAnnouncement(c *fiber.Ctx) error {
	role, fakultasID := kencanaAdminScope(c)
	id := c.Params("id")
	var pengumuman models.KencanaPengumuman
	q := config.DB
	if role == "kencana_fakultas" {
		q = q.Where("scope_type = ? AND (fakultas_id IS NULL OR fakultas_id = ?)", "faculty", fakultasID)
	}
	if err := q.First(&pengumuman, id).Error; err != nil {
		return c.Status(404).JSON(fiber.Map{"success": false, "message": "Pengumuman tidak ditemukan"})
	}
	if err := config.DB.Delete(&pengumuman).Error; err != nil {
		return c.Status(500).JSON(fiber.Map{"success": false, "message": "Gagal menghapus pengumuman"})
	}
	return c.JSON(fiber.Map{"success": true, "message": "Pengumuman dihapus"})
}

func broadcastAnnouncement(db *gorm.DB, p models.KencanaPengumuman, fakultasID uint) {
	// Ambil periode aktif
	var activePeriod models.KencanaPeriod
	err := db.Where("status IN ?", []string{"active", "published"}).Order("start_date desc nulls last, created_at desc").First(&activePeriod).Error
	if err != nil {
		return // Tidak ada periode aktif, tidak broadcast
	}

	if p.TargetRole == "mahasiswa" || p.TargetRole == "both" {
		q := db.Model(&models.User{}).
			Joins("JOIN mahasiswa.mahasiswa ON mahasiswa.mahasiswa.user_id = public.users.id").
			Where("LOWER(public.users.role) = ?", "mahasiswa").
			Where(`mahasiswa.mahasiswa.tahun_masuk = ? OR 
				mahasiswa.mahasiswa.id IN (SELECT student_id FROM mahasiswa.kencana_group_members WHERE period_id = ? AND status = 'active') OR 
				mahasiswa.mahasiswa.id IN (SELECT student_id FROM mahasiswa.kencana_mentor_assignments WHERE period_id = ? AND status = 'active')`, 
				activePeriod.Year, activePeriod.ID, activePeriod.ID)
		
		if p.ScopeType == "faculty" && p.FakultasID != nil {
			q = q.Where("public.users.fakultas_id = ?", *p.FakultasID)
		}
		var users []models.User
		if err := q.Find(&users).Error; err == nil {
			for _, u := range users {
				db.Create(&models.Notifikasi{
					UserID:    u.ID,
					Judul:     p.Judul,
					Deskripsi: p.Isi,
					Tipe:      "kencana",
				})
			}
		}
	}

	if p.TargetRole == "mentor" || p.TargetRole == "both" {
		q := db.Model(&models.User{}).Where("LOWER(role) = ?", "kencana_mentor")
		if p.ScopeType == "faculty" && p.FakultasID != nil {
			q = q.Where("fakultas_id = ?", *p.FakultasID)
		}
		var users []models.User
		if err := q.Find(&users).Error; err == nil {
			for _, u := range users {
				db.Create(&models.Notifikasi{
					UserID:    u.ID,
					Judul:     p.Judul,
					Deskripsi: p.Isi,
					Tipe:      "kencana",
				})
			}
		}
	}
}
