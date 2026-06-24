package kencana

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/xuri/excelize/v2"

	"siakad-backend/config"
	"siakad-backend/models"
)

func AdminDownloadScoresExcel(c *fiber.Ctx) error {
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

	f := excelize.NewFile()
	sheet := "Rekap Nilai"
	f.SetSheetName("Sheet1", sheet)

	// Set complex headers
	// Row 1: Group Headers
	f.SetCellValue(sheet, "A1", "No.")
	f.MergeCell(sheet, "A1", "A2")
	f.SetCellValue(sheet, "B1", "Nama")
	f.MergeCell(sheet, "B1", "B2")
	f.SetCellValue(sheet, "C1", "Prodi / Kelompok")
	f.MergeCell(sheet, "C1", "C2")
	f.SetCellValue(sheet, "D1", "Kehadiran\n(100%)")
	f.MergeCell(sheet, "D1", "D2")
	f.SetCellValue(sheet, "E1", "Handbook")
	f.MergeCell(sheet, "E1", "E2")

	f.SetCellValue(sheet, "F1", "KOGNITIF")
	f.MergeCell(sheet, "F1", "H1")
	f.SetCellValue(sheet, "I1", "PSIKOMOTOR")
	f.MergeCell(sheet, "I1", "P1")
	f.SetCellValue(sheet, "Q1", "AFEKTIF")
	f.MergeCell(sheet, "Q1", "V1")
	f.SetCellValue(sheet, "W1", "NILAI KOMPONEN")
	f.MergeCell(sheet, "W1", "Y1")

	f.SetCellValue(sheet, "Z1", "Nilai Akhir")
	f.MergeCell(sheet, "Z1", "Z2")
	f.SetCellValue(sheet, "AA1", "Keterangan")
	f.MergeCell(sheet, "AA1", "AA2")

	// Row 2: Sub-headers
	subHeaders := map[string]string{
		"F2": "Post Test Day 1", "G2": "Post Test Day 2", "H2": "Rata-rata Kognitif",
		"I2": "Taat Peraturan", "J2": "Twibon", "K2": "Vidio Analog", "L2": "Atribut",
		"M2": "Kreativitas Individu", "N2": "Kreativitas Kelompok", "O2": "Fasilitas UBK", "P2": "Rata-rata Psikomotor",
		"Q2": "Etika", "R2": "Empati", "S2": "Tanggung Jawab", "T2": "Disiplin", "U2": "Adil", "V2": "Rata-rata Afektif",
		"W2": "Kognitif (25%)", "X2": "Psikomotor (35%)", "Y2": "Afektif (40%)",
	}
	for cell, text := range subHeaders {
		f.SetCellValue(sheet, cell, text)
	}

	style, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border: []excelize.Border{
			{Type: "left", Color: "000000", Style: 1},
			{Type: "top", Color: "000000", Style: 1},
			{Type: "bottom", Color: "000000", Style: 1},
			{Type: "right", Color: "000000", Style: 1},
		},
	})
	f.SetRowStyle(sheet, 1, 2, style)

	// Helper to find score
	findItemScore := func(items []models.KencanaScoreItem, comp string, keyPart string) float64 {
		for _, it := range items {
			if strings.ToLower(it.Component) == comp && strings.Contains(strings.ToLower(it.ItemName), keyPart) {
				return it.Score
			}
		}
		return 0
	}
	findQuizScore := func(items []models.KencanaScoreItem, index int) float64 {
		var quizzes []models.KencanaScoreItem
		for _, it := range items {
			if strings.ToLower(it.Component) == "cognitive" && strings.Contains(strings.ToLower(it.ItemName), "quiz") {
				quizzes = append(quizzes, it)
			}
		}
		if index < len(quizzes) {
			return quizzes[index].Score
		}
		return 0
	}

	for i, row := range rows {
		rowIndex := i + 3
		
		statusStr := "Belum Lengkap"
		if row.Score.GraduationStatus == "passed" {
			statusStr = "LULUS"
		} else if row.Score.GraduationStatus == "remedial" {
			statusStr = "REMEDIAL"
		} else if row.Score.GraduationStatus == "not_eligible" {
			statusStr = "TIDAK LULUS"
		} else if row.Score.GraduationStatus == "dropped_out" {
			statusStr = "KELUAR"
		}

		prodiKelompok := row.Student.ProgramStudi.Nama
		if groupID != "" && groupID != "all" {
			prodiKelompok = row.Student.ProgramStudi.Nama + " / " + groupID // Or groupName if available
		}

		// Calculate weighted
		cogWeighted := row.Score.CognitiveAverage * 0.25
		psyWeighted := row.Score.PsychomotorAverage * 0.35
		affWeighted := row.Score.AffectiveAverage * 0.40

		f.SetCellValue(sheet, fmt.Sprintf("A%d", rowIndex), i+1)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", rowIndex), row.Student.Nama)
		f.SetCellValue(sheet, fmt.Sprintf("C%d", rowIndex), prodiKelompok)
		f.SetCellValue(sheet, fmt.Sprintf("D%d", rowIndex), row.AttendanceCount)
		f.SetCellValue(sheet, fmt.Sprintf("E%d", rowIndex), findItemScore(row.Items, "cognitive", "handbook"))
		
		// Kognitif
		f.SetCellValue(sheet, fmt.Sprintf("F%d", rowIndex), findQuizScore(row.Items, 0))
		f.SetCellValue(sheet, fmt.Sprintf("G%d", rowIndex), findQuizScore(row.Items, 1))
		f.SetCellValue(sheet, fmt.Sprintf("H%d", rowIndex), row.Score.CognitiveAverage)
		
		// Psikomotor
		f.SetCellValue(sheet, fmt.Sprintf("I%d", rowIndex), findItemScore(row.Items, "psychomotor", "taat"))
		f.SetCellValue(sheet, fmt.Sprintf("J%d", rowIndex), findItemScore(row.Items, "psychomotor", "twibon"))
		f.SetCellValue(sheet, fmt.Sprintf("K%d", rowIndex), findItemScore(row.Items, "psychomotor", "video"))
		f.SetCellValue(sheet, fmt.Sprintf("L%d", rowIndex), findItemScore(row.Items, "psychomotor", "atribut"))
		f.SetCellValue(sheet, fmt.Sprintf("M%d", rowIndex), findItemScore(row.Items, "psychomotor", "kreativitas individu"))
		f.SetCellValue(sheet, fmt.Sprintf("N%d", rowIndex), findItemScore(row.Items, "psychomotor", "kreativitas kelompok"))
		f.SetCellValue(sheet, fmt.Sprintf("O%d", rowIndex), findItemScore(row.Items, "psychomotor", "memelihara"))
		f.SetCellValue(sheet, fmt.Sprintf("P%d", rowIndex), row.Score.PsychomotorAverage)
		
		// Afektif
		f.SetCellValue(sheet, fmt.Sprintf("Q%d", rowIndex), findItemScore(row.Items, "affective", "etika"))
		f.SetCellValue(sheet, fmt.Sprintf("R%d", rowIndex), findItemScore(row.Items, "affective", "empati"))
		f.SetCellValue(sheet, fmt.Sprintf("S%d", rowIndex), findItemScore(row.Items, "affective", "tanggung jawab"))
		f.SetCellValue(sheet, fmt.Sprintf("T%d", rowIndex), findItemScore(row.Items, "affective", "disiplin"))
		f.SetCellValue(sheet, fmt.Sprintf("U%d", rowIndex), findItemScore(row.Items, "affective", "adil"))
		f.SetCellValue(sheet, fmt.Sprintf("V%d", rowIndex), row.Score.AffectiveAverage)
		
		// Weighted
		f.SetCellValue(sheet, fmt.Sprintf("W%d", rowIndex), cogWeighted)
		f.SetCellValue(sheet, fmt.Sprintf("X%d", rowIndex), psyWeighted)
		f.SetCellValue(sheet, fmt.Sprintf("Y%d", rowIndex), affWeighted)
		
		// Final
		f.SetCellValue(sheet, fmt.Sprintf("Z%d", rowIndex), row.Score.FinalScore)
		f.SetCellValue(sheet, fmt.Sprintf("AA%d", rowIndex), statusStr)
	}

	savePath := filepath.Join(os.TempDir(), fmt.Sprintf("kencana_scores_%d.xlsx", time.Now().Unix()))
	if err := f.SaveAs(savePath); err != nil {
		fmt.Printf("Excel Error: %v\n", err)
		return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
	}

	defer os.Remove(savePath) // Prevent temp file leak

	return c.Download(savePath, filepath.Base(savePath))
}
