package psychologist

import (
	"fmt"
	"os"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"siakad-backend/config"
	"siakad-backend/models"
	"siakad-backend/utils"

	"github.com/gofiber/fiber/v2"
	"github.com/jung-kurt/gofpdf"
)

// ExportSessionNotePDF generates a complete PDF record for a single counseling session in Landscape using the official Rektorat Kop background
func ExportSessionNotePDF(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	var rec models.PsikologSessionNote
	if err := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Preload("Mahasiswa.DosenPA").
		Where("id = ? AND psikolog_id = ?", c.Params("id"), psikolog.ID).First(&rec).Error; err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Catatan sesi tidak ditemukan")
	}

	student := rec.Mahasiswa

	// Create Landscape PDF
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(20, 38, 20)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AliasNbPages("")

	// Background Kop Surat
	pdf.SetHeaderFunc(func() {
		pdf.Image("assets/kop_rektorat_landscape.jpeg", 0, 0, 297, 210, false, "JPEG", 0, "")
	})

	pdf.AddPage()

	pdf.SetTextColor(15, 23, 42) // Slate 900

	// Title
	pdf.SetFont("Helvetica", "B", 13)
	pdf.CellFormat(0, 6, "LAPORAN SESI KONSELING MAHASISWA", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetTextColor(100, 116, 139)
	docNumber := utils.GenerateDocumentNumber("Hasil Konseling")
	refNum := fmt.Sprintf("Nomor: %s", docNumber)
	pdf.CellFormat(0, 5, refNum, "", 1, "C", false, 0, "")
	pdf.Ln(5)

	// Divider
	pdf.SetDrawColor(226, 232, 240)
	pdf.Line(20, pdf.GetY(), 277, pdf.GetY())
	pdf.Ln(3)

	// ── Student Identity Section ─────────────────────────────────────────────
	pdf.SetTextColor(15, 23, 42)
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(0, 5, "I. DATA DIRI MAHASISWA (STUDENT PROFILE)", "", 1, "L", false, 0, "")
	pdf.Ln(1)

	// Profile Table Grid (Total printable width is 257mm)
	dosenPAVal := "-"
	if student.DosenPA != nil {
		dosenPAVal = student.DosenPA.Nama
	}

	tglLahirStr := "-"
	if !student.TanggalLahir.IsZero() {
		tglLahirStr = formatIndoDate(student.TanggalLahir)
	}

	details := [][]string{
		{"Nama Mahasiswa", student.Nama, "NIM", student.NIM},
		{"Program Studi", student.ProgramStudi.Nama, "Fakultas", student.Fakultas.Nama},
		{"Semester Sekarang", strconv.Itoa(student.SemesterSekarang), "IPK", fmt.Sprintf("%.2f", student.IPK)},
		{"Tempat/Tgl Lahir", fmt.Sprintf("%s, %s", student.TempatLahir, tglLahirStr), "Jenis Kelamin", student.JenisKelamin},
		{"Dosen Wali (PA)", dosenPAVal, "No. Handphone", student.NoHP},
	}

	// Table style
	pdf.SetFillColor(248, 250, 252) // Slate 50
	pdf.SetDrawColor(241, 245, 249) // Slate 100

	for _, row := range details {
		pdf.SetFont("Helvetica", "B", 8)
		pdf.CellFormat(50, 5, row[0], "1", 0, "L", true, 0, "")
		pdf.SetFont("Helvetica", "", 8)
		pdf.CellFormat(78, 5, row[1], "1", 0, "L", false, 0, "")

		pdf.SetFont("Helvetica", "B", 8)
		pdf.CellFormat(50, 5, row[2], "1", 0, "L", true, 0, "")
		pdf.SetFont("Helvetica", "", 8)
		pdf.CellFormat(79, 5, row[3], "1", 1, "L", false, 0, "")
	}
	pdf.Ln(4)

	// ── Session Details Section ──────────────────────────────────────────────
	pdf.SetFont("Helvetica", "B", 9.5)
	pdf.CellFormat(0, 5, "II. CATATAN ASESMEN & SESI KONSELING", "", 1, "L", false, 0, "")
	pdf.Ln(1)

	// Session Header Band (257mm width)
	pdf.SetFillColor(241, 245, 249) // Slate 100
	pdf.SetDrawColor(226, 232, 240) // Slate 200
	pdf.SetTextColor(15, 23, 42)

	pdf.SetFont("Helvetica", "B", 8.5)
	headerText := fmt.Sprintf(" Tanggal Sesi: %s  -  Waktu: %s WIB  -  Mode: %s", formatIndoDate(rec.Tanggal), rec.Tanggal.Format("15:04"), rec.JenisSesi)
	pdf.CellFormat(257, 5.5, headerText, "1", 1, "L", true, 0, "")

	// Sesi Meta info (Mood / Status Pasien)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(71, 85, 105)
	metaText := fmt.Sprintf("  Mood: %s  |  Status Pasien: %s", rec.Mood, rec.StatusPasien)
	pdf.CellFormat(257, 4, metaText, "LRB", 1, "L", false, 0, "")
	pdf.Ln(2)

	// 1. Tujuan Pemeriksaan & Riwayat Keluhan
	pdf.SetTextColor(15, 23, 42)
	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Tujuan Pemeriksaan / Asesmen:")
	pdf.Ln(3)
	pdf.SetFont("Helvetica", "", 8)
	tujuan := strings.ReplaceAll(rec.TujuanPemeriksaan, "•", "-")
	if tglAsesStr := ""; rec.TanggalAsesmen != nil {
		tglAsesStr = formatIndoDate(*rec.TanggalAsesmen)
		tujuan = tujuan + " (Tanggal Asesmen: " + tglAsesStr + ")"
	}
	if tujuan == "" {
		tujuan = "-"
	}
	pdf.MultiCell(257, 3.5, tujuan, "", "L", false)
	pdf.Ln(2)

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Riwayat Keluhan / Isu Utama:")
	pdf.Ln(3)
	pdf.SetFont("Helvetica", "", 8)
	kel := strings.ReplaceAll(rec.RiwayatKeluhan, "•", "-")
	if kel == "" {
		kel = strings.ReplaceAll(rec.Keluhan, "•", "-")
	}
	if kel == "" {
		kel = "-"
	}
	pdf.MultiCell(257, 3.5, kel, "", "L", false)
	pdf.Ln(3)

	// 2. Aspek Asesmen Klinis Table (3 columns: 85mm + 85mm + 87mm = 257mm)
	cog := strings.ReplaceAll(rec.AspekKognitif, "•", "-")
	if cog == "" {
		cog = "-"
	}
	emo := strings.ReplaceAll(rec.AspekEmosional, "•", "-")
	if emo == "" {
		emo = "-"
	}
	beh := strings.ReplaceAll(rec.AspekPerilaku, "•", "-")
	if beh == "" {
		beh = "-"
	}

	// Calculate row height dynamically
	cogLines := pdf.SplitLines([]byte(cog), 85)
	emoLines := pdf.SplitLines([]byte(emo), 85)
	behLines := pdf.SplitLines([]byte(beh), 87)
	maxLines := len(cogLines)
	if len(emoLines) > maxLines {
		maxLines = len(emoLines)
	}
	if len(behLines) > maxLines {
		maxLines = len(behLines)
	}
	if maxLines < 1 {
		maxLines = 1
	}
	colH := float64(maxLines)*3.2 + 2

	// Preemptive check before drawing Aspek Asesmen
	if pdf.GetY()+colH+10 > 195 {
		pdf.AddPage()
	}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Aspek Asesmen Klinis:")
	pdf.Ln(3.5)

	pdf.SetFillColor(248, 250, 252)
	pdf.CellFormat(85, 4, "Aspek Kognitif", "1", 0, "C", true, 0, "")
	pdf.CellFormat(85, 4, "Aspek Emosional", "1", 0, "C", true, 0, "")
	pdf.CellFormat(87, 4, "Aspek Perilaku", "1", 1, "C", true, 0, "")

	curX := pdf.GetX()
	curY := pdf.GetY()
	pdf.Rect(curX, curY, 257, colH, "D")
	pdf.Line(curX+85, curY, curX+85, curY+colH)
	pdf.Line(curX+170, curY, curX+170, curY+colH)

	pdf.SetXY(curX, curY+1)
	pdf.MultiCell(85, 3, cog, "", "L", false)
	pdf.SetXY(curX+85, curY+1)
	pdf.MultiCell(85, 3, emo, "", "L", false)
	pdf.SetXY(curX+170, curY+1)
	pdf.MultiCell(87, 3, beh, "", "L", false)

	pdf.SetXY(curX, curY+colH)
	pdf.Ln(3)

	// 3. Rekomendasi
	rekMhs := strings.ReplaceAll(rec.RekomendasiMahasiswa, "•", "-")
	if rekMhs == "" && rec.Rekomendasi != "" {
		rekMhs = strings.ReplaceAll(rec.Rekomendasi, "•", "-")
	}
	if rekMhs == "" {
		rekMhs = "-"
	}
	rekProdi := strings.ReplaceAll(rec.RekomendasiProdi, "•", "-")
	if rekProdi == "" {
		rekProdi = "-"
	}
	rekOrtu := strings.ReplaceAll(rec.RekomendasiOrangTua, "•", "-")
	if rekOrtu == "" {
		rekOrtu = "-"
	}

	rekMhsLines := pdf.SplitLines([]byte(rekMhs), 85)
	rekProdiLines := pdf.SplitLines([]byte(rekProdi), 85)
	rekOrtuLines := pdf.SplitLines([]byte(rekOrtu), 87)
	maxLinesRek := len(rekMhsLines)
	if len(rekProdiLines) > maxLinesRek {
		maxLinesRek = len(rekProdiLines)
	}
	if len(rekOrtuLines) > maxLinesRek {
		maxLinesRek = len(rekOrtuLines)
	}
	if maxLinesRek < 1 {
		maxLinesRek = 1
	}
	colHRek := float64(maxLinesRek)*3.2 + 2

	// Preemptive check before drawing Rekomendasi
	if pdf.GetY()+colHRek+10 > 195 {
		pdf.AddPage()
	}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(0, 3.5, "Rekomendasi Hasil Konseling:")
	pdf.Ln(3.5)

	pdf.CellFormat(85, 4, "Rekomendasi Mahasiswa", "1", 0, "C", true, 0, "")
	pdf.CellFormat(85, 4, "Rekomendasi Program Studi", "1", 0, "C", true, 0, "")
	pdf.CellFormat(87, 4, "Rekomendasi Orang Tua / Wali", "1", 1, "C", true, 0, "")

	curXRek := pdf.GetX()
	curYRek := pdf.GetY()
	pdf.Rect(curXRek, curYRek, 257, colHRek, "D")
	pdf.Line(curXRek+85, curYRek, curXRek+85, curYRek+colHRek)
	pdf.Line(curXRek+170, curYRek, curXRek+170, curYRek+colHRek)

	pdf.SetXY(curXRek, curYRek+1)
	pdf.MultiCell(85, 3, rekMhs, "", "L", false)
	pdf.SetXY(curXRek+85, curYRek+1)
	pdf.MultiCell(85, 3, rekProdi, "", "L", false)
	pdf.SetXY(curXRek+170, curYRek+1)
	pdf.MultiCell(87, 3, rekOrtu, "", "L", false)

	pdf.SetXY(curXRek, curYRek+colHRek)
	pdf.Ln(3)

	// 4. Tindak Lanjut & Kesimpulan
	kes := strings.ReplaceAll(rec.Kesimpulan, "•", "-")
	if kes == "" {
		kes = "-"
	}

	kesLines := pdf.SplitLines([]byte(kes), 137)
	kesHeight := float64(len(kesLines))*3.2 + 2
	sectionHeight := kesHeight
	if sectionHeight < 15 {
		sectionHeight = 15 // Checkbox section height
	}

	// Preemptive check for Section + Signature (approx 35mm total)
	if pdf.GetY()+sectionHeight+35 > 195 {
		pdf.AddPage()
	}

	pdf.SetFont("Helvetica", "B", 8)
	pdf.Cell(120, 3.5, "Tindak Lanjut Layanan:")
	pdf.Cell(0, 3.5, "Kesimpulan Akhir:")
	pdf.Ln(3.5)

	curXTl := pdf.GetX()
	curYTl := pdf.GetY()

	// Tindak Lanjut checks
	pdf.SetFont("Helvetica", "", 8)
	tuntasCheck := " [ ] Sesi Tuntas"
	if rec.TindakLanjutTuntas {
		tuntasCheck = " [X] Sesi Tuntas"
	}
	lanjutCheck := " [ ] Konseling Lanjutan"
	if rec.TindakLanjutLanjutan {
		lanjutCheck = " [X] Konseling Lanjutan"
	}
	rujukCheck := " [ ] Rujuk Klinis"
	if rec.TindakLanjutRujuk {
		rujukCheck = " [X] Rujuk Klinis"
	}

	pdf.CellFormat(120, 4, tuntasCheck, "", 1, "L", false, 0, "")
	pdf.SetX(curXTl)
	pdf.CellFormat(120, 4, lanjutCheck, "", 1, "L", false, 0, "")
	pdf.SetX(curXTl)
	pdf.CellFormat(120, 4, rujukCheck, "", 1, "L", false, 0, "")

	// Kesimpulan
	pdf.SetXY(curXTl+120, curYTl)
	pdf.SetFont("Helvetica", "I", 8)
	pdf.MultiCell(137, 3.2, kes, "", "L", false)

	// Set cursor below Tindak Lanjut / Kesimpulan block
	pdf.SetXY(curXTl, curYTl+sectionHeight)
	pdf.Ln(4)

	// ── Signature ────────────────────────────────────────────────────────────
	sigY := pdf.GetY()

	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(15, 23, 42)
	pdf.SetXY(180, sigY)
	pdf.CellFormat(0, 4, fmt.Sprintf("Bandung, %s", formatIndoDate(rec.Tanggal)), "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.CellFormat(0, 4, "Psikolog Penanggung Jawab,", "", 1, "C", false, 0, "")

	pdf.SetXY(180, sigY+18)
	pdf.SetFont("Helvetica", "BU", 8.5)
	pdf.CellFormat(0, 4, psikolog.Nama, "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(0, 3.5, fmt.Sprintf("BKU Care Center - NIP/Reg: %d", psikolog.ID), "", 1, "C", false, 0, "")

	// Save and download
	exportsDir := "uploads/exports"
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		return err
	}

	fileName := fmt.Sprintf("sesi_%d_%s.pdf", rec.ID, time.Now().Format("20060102150405"))
	filePath := filepath.Join(exportsDir, fileName)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return err
	}

	c.Set("Content-Type", "application/pdf")
	safeNama := strings.ReplaceAll(student.Nama, " ", "_")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Rekam_Medis_Sesi_%s_%s.pdf\"", safeNama, time.Now().Format("02-01-2006")))
	return c.SendFile(filePath)
}

// ExportPatientsRecapPDF generates a summary recap PDF of counseling sessions based on filters in Landscape using Rektorat Kop
func ExportPatientsRecapPDF(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	query := config.DB.Preload("Mahasiswa.Fakultas").Preload("Mahasiswa.ProgramStudi").Preload("Psikolog").
		Joins("JOIN mahasiswa.mahasiswa m ON m.id = session_notes.mahasiswa_id").
		Where("session_notes.psikolog_id = ?", psikolog.ID)

	fakultasVal := c.Query("fakultas")
	if fakultasVal != "" && fakultasVal != "Semua Fakultas" {
		query = query.Joins("JOIN fakultas.fakultas f ON f.id = m.fakultas_id").Where("f.nama = ?", fakultasVal)
	}

	prodiVal := c.Query("prodi")
	if prodiVal != "" && prodiVal != "Semua Prodi" {
		query = query.Joins("JOIN fakultas.program_studi p ON p.id = m.prodi_id").Where("p.nama = ?", prodiVal)
	}

	statusVal := c.Query("status")
	if statusVal != "" && statusVal != "Semua Status" {
		query = query.Where("session_notes.status_pasien = ?", statusVal)
	}

	startDateVal := c.Query("start_date")
	if startDateVal != "" {
		if t, err := time.Parse("2006-01-02", startDateVal); err == nil {
			query = query.Where("session_notes.tanggal >= ?", t)
		}
	}

	endDateVal := c.Query("end_date")
	if endDateVal != "" {
		if t, err := time.Parse("2006-01-02", endDateVal); err == nil {
			tEnd := t.Add(24*time.Hour - time.Second)
			query = query.Where("session_notes.tanggal <= ?", tEnd)
		}
	}

	var notes []models.PsikologSessionNote
	if err := query.Order("session_notes.tanggal desc").Find(&notes).Error; err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, "Gagal memuat rekapitulasi data")
	}

	// Create Landscape PDF
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(20, 38, 20)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AliasNbPages("")

	// Background Kop Surat
	pdf.SetHeaderFunc(func() {
		pdf.Image("assets/kop_rektorat_landscape.jpeg", 0, 0, 297, 210, false, "JPEG", 0, "")
	})

	pdf.AddPage()

	pdf.SetTextColor(15, 23, 42) // Slate 900

	// Filter metadata subtitle
	filterDesc := "Filter:"
	if fakultasVal != "" {
		filterDesc += " Fakultas: " + fakultasVal + " |"
	} else {
		filterDesc += " Semua Fakultas |"
	}
	if prodiVal != "" {
		filterDesc += " Prodi: " + prodiVal + " |"
	} else {
		filterDesc += " Semua Prodi |"
	}
	if statusVal != "" {
		filterDesc += " Status: " + statusVal + " |"
	}
	if startDateVal != "" || endDateVal != "" {
		filterDesc += fmt.Sprintf(" Periode: %s s.d %s", startDateVal, endDateVal)
	}

	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(0, 5, "LAPORAN REKAPITULASI SESI KONSELING MAHASISWA", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "B", 8)
	docNumber := utils.GenerateDocumentNumber("Rekap Sesi Konseling")
	pdf.CellFormat(0, 5, fmt.Sprintf("Nomor: %s", docNumber), "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(0, 4, filterDesc, "", 1, "C", false, 0, "")
	pdf.Ln(2)

	// ── Table Setup (257mm printable width) ──────────────────────────────────
	// Columns:
	// No: 8mm
	// Tanggal: 25mm
	// Mahasiswa: 42mm
	// Prodi: 40mm
	// Keluhan: 47mm
	// Aspek Klinis: 38mm
	// Rekomendasi/TL: 37mm
	// Status: 20mm
	// Total = 8 + 25 + 42 + 40 + 47 + 38 + 37 + 20 = 257mm.

	headerDraw := func() {
		pdf.SetFont("Helvetica", "B", 7.5)
		pdf.SetFillColor(241, 245, 249)
		pdf.SetTextColor(51, 65, 85)
		pdf.CellFormat(8, 6, "No", "1", 0, "C", true, 0, "")
		pdf.CellFormat(25, 6, "Tanggal", "1", 0, "C", true, 0, "")
		pdf.CellFormat(42, 6, "Mahasiswa (NIM)", "1", 0, "C", true, 0, "")
		pdf.CellFormat(40, 6, "Program Studi", "1", 0, "C", true, 0, "")
		pdf.CellFormat(47, 6, "Keluhan / Isu", "1", 0, "C", true, 0, "")
		pdf.CellFormat(38, 6, "Aspek Klinis", "1", 0, "C", true, 0, "")
		pdf.CellFormat(37, 6, "Rekomendasi & TL", "1", 0, "C", true, 0, "")
		pdf.CellFormat(20, 6, "Status", "1", 1, "C", true, 0, "")
		pdf.SetTextColor(15, 23, 42)
	}

	headerDraw()

	pdf.SetFont("Helvetica", "", 7)
	if len(notes) == 0 {
		pdf.SetFont("Helvetica", "I", 8.5)
		pdf.CellFormat(257, 8, "Tidak ada data rekapitulasi sesi yang sesuai dengan kriteria filter.", "1", 1, "C", false, 0, "")
	} else {
		for idx, n := range notes {
			noStr := fmt.Sprintf("%d", idx+1)
			tglStr := n.Tanggal.Format("02-01-2006 15:04")

			// Format Student name cleanly (No Truncation)
			mhsNameClean := n.Mahasiswa.Nama
			if n.Mahasiswa.NIM != "" {
				mhsNameClean = fmt.Sprintf("%s\n(%s)", mhsNameClean, n.Mahasiswa.NIM)
			}

			// Format Prodi (No Truncation)
			mhsProdiClean := n.Mahasiswa.ProgramStudi.Nama
			if n.Mahasiswa.Fakultas.Kode != "" {
				mhsProdiClean = fmt.Sprintf("%s\n(%s)", mhsProdiClean, n.Mahasiswa.Fakultas.Kode)
			}

			// Full complaint
			kel := n.RiwayatKeluhan
			if kel == "" {
				kel = n.Keluhan
			}
			if kel == "" {
				kel = "-"
			}

			// Full clinical aspects
			aspek := fmt.Sprintf("Kog: %s\nEmo: %s\nPer: %s",
				orElse(n.AspekKognitif, "-"),
				orElse(n.AspekEmosional, "-"),
				orElse(n.AspekPerilaku, "-"),
			)

			// Combine recommendations and follow-up
			tlParts := []string{}
			if n.TindakLanjutTuntas {
				tlParts = append(tlParts, "Tuntas")
			}
			if n.TindakLanjutLanjutan {
				tlParts = append(tlParts, "Lanjutan")
			}
			if n.TindakLanjutRujuk {
				tlParts = append(tlParts, "Rujuk")
			}
			tlStr := "TL: " + strings.Join(tlParts, "/")
			if len(tlParts) == 0 {
				tlStr = "TL: -"
			}

			// Full recommendation
			rekVal := n.RekomendasiMahasiswa
			if rekVal == "" {
				rekVal = n.Rekomendasi
			}
			if rekVal == "" {
				rekVal = "-"
			}
			rekTLCombined := fmt.Sprintf("%s\n%s", rekVal, tlStr)

			// Full status
			status := n.StatusPasien
			if status == "" {
				status = n.Mood
			}

			// Split lines for cell height calculations
			noLines := []string{noStr}
			tglLines := []string{tglStr}
			mhsLines := pdf.SplitLines([]byte(mhsNameClean), 42)
			prodiLines := pdf.SplitLines([]byte(mhsProdiClean), 40)
			kelLines := pdf.SplitLines([]byte(kel), 47)
			aspekLines := pdf.SplitLines([]byte(aspek), 38)
			rekLines := pdf.SplitLines([]byte(rekTLCombined), 37)
			statusLines := []string{status}

			maxL := len(mhsLines)
			if len(prodiLines) > maxL {
				maxL = len(prodiLines)
			}
			if len(kelLines) > maxL {
				maxL = len(kelLines)
			}
			if len(aspekLines) > maxL {
				maxL = len(aspekLines)
			}
			if len(rekLines) > maxL {
				maxL = len(rekLines)
			}
			if maxL < 1 {
				maxL = 1
			}

			// Start drawing the row
			curX := pdf.GetX()
			curY := pdf.GetY()

			lineHeight := 3.2
			padding := 1.0 // top/bottom padding inside cells

			// Preemptive page break check before drawing the row
			if curY+lineHeight+2*padding > 195 {
				pdf.AddPage()
				headerDraw()
				pdf.SetFont("Helvetica", "", 7)
				curY = pdf.GetY()
			}

			// Draw top boundary line for this row
			pdf.Line(curX, curY, curX+257, curY)

			rowStartY := curY
			pdf.SetY(curY + padding)

			for i := 0; i < maxL; i++ {
				// Mid-row page break check
				if pdf.GetY()+lineHeight > 195 {
					// Draw bottom line for current page segment
					pdf.Line(curX, pdf.GetY(), curX+257, pdf.GetY())

					// Draw vertical grid lines for current page segment
					segmentH := pdf.GetY() - rowStartY
					pdf.Line(curX, rowStartY, curX, rowStartY+segmentH)
					pdf.Line(curX+8, rowStartY, curX+8, rowStartY+segmentH)
					pdf.Line(curX+33, rowStartY, curX+33, rowStartY+segmentH)
					pdf.Line(curX+75, rowStartY, curX+75, rowStartY+segmentH)
					pdf.Line(curX+115, rowStartY, curX+115, rowStartY+segmentH)
					pdf.Line(curX+162, rowStartY, curX+162, rowStartY+segmentH)
					pdf.Line(curX+200, rowStartY, curX+200, rowStartY+segmentH)
					pdf.Line(curX+237, rowStartY, curX+237, rowStartY+segmentH)
					pdf.Line(curX+257, rowStartY, curX+257, rowStartY+segmentH)

					// Trigger page break
					pdf.AddPage()
					headerDraw()
					pdf.SetFont("Helvetica", "", 7)

					// Reset row start coordinates for new page segment
					rowStartY = pdf.GetY()
					pdf.SetY(rowStartY + padding)

					// Draw top line for new page segment
					pdf.Line(curX, rowStartY, curX+257, rowStartY)
				}

				y := pdf.GetY()

				// Draw column texts line by line
				if i < len(noLines) {
					pdf.SetXY(curX, y)
					pdf.CellFormat(8, lineHeight, noLines[i], "", 0, "C", false, 0, "")
				}
				if i < len(tglLines) {
					pdf.SetXY(curX+8, y)
					pdf.CellFormat(25, lineHeight, tglLines[i], "", 0, "C", false, 0, "")
				}
				if i < len(mhsLines) {
					pdf.SetXY(curX+33, y)
					pdf.CellFormat(42, lineHeight, string(mhsLines[i]), "", 0, "L", false, 0, "")
				}
				if i < len(prodiLines) {
					pdf.SetXY(curX+75, y)
					pdf.CellFormat(40, lineHeight, string(prodiLines[i]), "", 0, "L", false, 0, "")
				}
				if i < len(kelLines) {
					pdf.SetXY(curX+115, y)
					pdf.CellFormat(47, lineHeight, string(kelLines[i]), "", 0, "L", false, 0, "")
				}
				if i < len(aspekLines) {
					pdf.SetXY(curX+162, y)
					pdf.CellFormat(38, lineHeight, string(aspekLines[i]), "", 0, "L", false, 0, "")
				}
				if i < len(rekLines) {
					pdf.SetXY(curX+200, y)
					pdf.CellFormat(37, lineHeight, string(rekLines[i]), "", 0, "L", false, 0, "")
				}
				if i < len(statusLines) {
					pdf.SetXY(curX+237, y)
					pdf.CellFormat(20, lineHeight, statusLines[i], "", 0, "C", false, 0, "")
				}

				// Move to next line height
				pdf.SetY(y + lineHeight)
			}

			// Draw bottom border line and vertical grid lines for the final segment of the row
			finalY := pdf.GetY() + padding
			pdf.Line(curX, finalY, curX+257, finalY)

			segmentH := finalY - rowStartY
			pdf.Line(curX, rowStartY, curX, rowStartY+segmentH)
			pdf.Line(curX+8, rowStartY, curX+8, rowStartY+segmentH)
			pdf.Line(curX+33, rowStartY, curX+33, rowStartY+segmentH)
			pdf.Line(curX+75, rowStartY, curX+75, rowStartY+segmentH)
			pdf.Line(curX+115, rowStartY, curX+115, rowStartY+segmentH)
			pdf.Line(curX+162, rowStartY, curX+162, rowStartY+segmentH)
			pdf.Line(curX+200, rowStartY, curX+200, rowStartY+segmentH)
			pdf.Line(curX+237, rowStartY, curX+237, rowStartY+segmentH)
			pdf.Line(curX+257, rowStartY, curX+257, rowStartY+segmentH)

			// Set cursor below this drawn row
			pdf.SetXY(curX, finalY)
		}
	}

	// ── Signature ────────────────────────────────────────────────────────────
	pdf.Ln(8)
	if pdf.GetY()+30 > 195 {
		pdf.AddPage()
	}

	sigY := pdf.GetY()
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(15, 23, 42)
	pdf.SetXY(180, sigY)
	pdf.CellFormat(0, 4, fmt.Sprintf("Bandung, %s", formatIndoDate(time.Now())), "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.CellFormat(0, 4, "Psikolog Penanggung Jawab,", "", 1, "C", false, 0, "")

	pdf.SetXY(180, sigY+18)
	pdf.SetFont("Helvetica", "BU", 8.5)
	pdf.CellFormat(0, 4, psikolog.Nama, "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(0, 3.5, fmt.Sprintf("BKU Care Center NIP/Reg: %d", psikolog.ID), "", 1, "C", false, 0, "")

	// Save and download
	exportsDir := "uploads/exports"
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		return err
	}

	fileName := fmt.Sprintf("rekap_konseling_%s.pdf", time.Now().Format("20060102150405"))
	filePath := filepath.Join(exportsDir, fileName)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return err
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", "attachment; filename=\"rekap_rekam_medis.pdf\"")
	return c.SendFile(filePath)
}

func orElse(val, fallback string) string {
	if strings.TrimSpace(val) == "" {
		return fallback
	}
	return val
}

var indoMonths = []string{"", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"}

func formatIndoDate(t time.Time) string {
	return fmt.Sprintf("%02d %s %d", t.Day(), indoMonths[t.Month()], t.Year())
}

func generateStableRandom(seed uint, salt int64) int {
	val := (int64(seed) * 2654435761) + salt
	val = val ^ (val >> 16)
	val = val * 2246822507
	val = val ^ (val >> 13)
	modVal := val % 90000
	if modVal < 0 {
		modVal = -modVal
	}
	return int(modVal) + 10000
}


// ExportAnalyticsPDF generates a PDF report for Analytics
func ExportAnalyticsPDF(c *fiber.Ctx) error {
	psikolog, err := currentPsikolog(c)
	if err != nil {
		return err
	}

	startDateStr := c.Query("start_date")
	endDateStr := c.Query("end_date")
	prodiIDStr := c.Query("prodi_id")
	fakultasIDStr := c.Query("fakultas_id")

	// Calculate counts using clean queries
	var patients int64
	getBookingQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Distinct("mahasiswa_id").Count(&patients)

	var sessions int64
	getBookingQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Where("status = ?", "Selesai").Count(&sessions)

	var urgent int64
	getBookingQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Where("status NOT IN ?", []string{"Selesai", "Ditolak", "Dibatalkan"}).Count(&urgent)

	var stable int64
	getSessionQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Where("status_pasien IN ?", []string{"Stabil", "Pemulihan", "Membaik"}).Count(&stable)

	var totalNotes int64
	getSessionQuery(psikolog.ID, startDateStr, endDateStr, prodiIDStr, fakultasIDStr).Count(&totalNotes)

	stablePercentage := 0
	if totalNotes > 0 {
		stablePercentage = int(float64(stable) / float64(totalNotes) * 100)
	}

	// Bookings
	var bookings []models.PsikologBooking
	qBookings := config.DB.Model(&models.PsikologBooking{}).Where("psikolog_id = ?", psikolog.ID)
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			qBookings = qBookings.Where("tanggal >= ?", t)
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
			qBookings = qBookings.Where("tanggal <= ?", tEnd)
		}
	}
	if prodiIDStr != "" || fakultasIDStr != "" {
		qBookings = qBookings.Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id")
		if prodiIDStr != "" {
			qBookings = qBookings.Where("m.prodi_id = ?", prodiIDStr)
		}
		if fakultasIDStr != "" {
			qBookings = qBookings.Where("m.fakultas_id = ?", fakultasIDStr)
		}
	}
	_ = qBookings.Preload("Mahasiswa").Preload("Mahasiswa.ProgramStudi").Find(&bookings).Error

	issueCounts := map[string]int{}
	var academicCount int64
	var nonAcademicCount int64
	for _, booking := range bookings {
		if booking.Topik != "" {
			issueCounts[booking.Topik]++
			if booking.Topik == "Akademik" {
				academicCount++
			} else {
				nonAcademicCount++
			}
		}
	}
	
	type IssueCount struct {
		Name  string
		Count int
	}
	var topIssues []IssueCount
	for issue, count := range issueCounts {
		topIssues = append(topIssues, IssueCount{Name: issue, Count: count})
	}
	sort.Slice(topIssues, func(i, j int) bool { return topIssues[i].Count > topIssues[j].Count })

	// Jurusan/Prodi Terbanyak
	var prodiCounts []struct {
		ProdiName string `gorm:"column:prodi_name"`
		Count     int64  `gorm:"column:count"`
	}
	qProdi := config.DB.Model(&models.PsikologBooking{}).
		Select("ps.nama as prodi_name, count(psikolog.bookings.id) as count").
		Joins("JOIN mahasiswa.mahasiswa m ON m.id = mahasiswa_id").
		Joins("JOIN fakultas.program_studi ps ON ps.id = m.prodi_id").
		Where("psikolog_id = ?", psikolog.ID)
	if startDateStr != "" {
		if t, err := time.Parse("2006-01-02", startDateStr); err == nil {
			qProdi = qProdi.Where("tanggal >= ?", t)
		}
	}
	if endDateStr != "" {
		if t, err := time.Parse("2006-01-02", endDateStr); err == nil {
			tEnd := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, t.Location())
			qProdi = qProdi.Where("tanggal <= ?", tEnd)
		}
	}
	if prodiIDStr != "" {
		qProdi = qProdi.Where("m.prodi_id = ?", prodiIDStr)
	}
	if fakultasIDStr != "" {
		qProdi = qProdi.Where("m.fakultas_id = ?", fakultasIDStr)
	}
	qProdi.Group("ps.nama").Order("count desc").Limit(5).Scan(&prodiCounts)

	// -- PDF GENERATION --
	pdf := gofpdf.New("L", "mm", "A4", "")
	pdf.SetMargins(20, 20, 20)
	pdf.AddPage()

	// Header Image Background
	pdf.ImageOptions("assets/kop_rektorat_landscape.jpeg", 0, 0, 297, 210, false, gofpdf.ImageOptions{ImageType: "JPEG", ReadDpi: true}, 0, "")

	// Move cursor below header
	pdf.SetY(45)

	// Title
	pdf.SetFont("Helvetica", "B", 13)
	pdf.CellFormat(0, 6, "LAPORAN ANALITIK KONSELING", "", 1, "C", false, 0, "")
	pdf.SetFont("Helvetica", "", 9.5)
	pdf.SetTextColor(100, 116, 139)
	docNumber := utils.GenerateDocumentNumber("Riwayat Konseling") // Reusing document number for analytics as requested
	refNum := fmt.Sprintf("Nomor: %s", docNumber)
	pdf.CellFormat(0, 5, refNum, "", 1, "C", false, 0, "")
	
	// Print Filters
	filterText := "Filter: "
	if startDateStr != "" { filterText += fmt.Sprintf("Dari: %s ", startDateStr) }
	if endDateStr != "" { filterText += fmt.Sprintf("Sampai: %s ", endDateStr) }
	if prodiIDStr != "" { filterText += fmt.Sprintf("Prodi ID: %s ", prodiIDStr) }
	if fakultasIDStr != "" { filterText += fmt.Sprintf("Fakultas ID: %s ", fakultasIDStr) }
	if filterText == "Filter: " { filterText = "Filter: Semua Data" }
	
	pdf.SetFont("Helvetica", "I", 9)
	pdf.CellFormat(0, 5, filterText, "", 1, "C", false, 0, "")
	pdf.Ln(5)

	// Divider
	pdf.SetDrawColor(226, 232, 240)
	pdf.Line(20, pdf.GetY(), 277, pdf.GetY())
	pdf.Ln(5)

	// 1. Ringkasan Kasus
	pdf.SetTextColor(15, 23, 42)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(0, 6, "I. RINGKASAN KASUS", "", 1, "L", false, 0, "")
	pdf.Ln(2)

	summaryData := [][]string{
		{"Total Pasien Unik", fmt.Sprintf("%d Pasien", patients), "Persentase Pasien Stabil", fmt.Sprintf("%d%%", stablePercentage)},
		{"Total Sesi Selesai", fmt.Sprintf("%d Sesi", sessions), "Total Kasus Akademik", fmt.Sprintf("%d Kasus", academicCount)},
		{"Total Kasus Mendesak (Urgent)", fmt.Sprintf("%d Kasus", urgent), "Total Kasus Non-Akademik", fmt.Sprintf("%d Kasus", nonAcademicCount)},
	}

	pdf.SetFillColor(248, 250, 252)
	pdf.SetDrawColor(241, 245, 249)

	for _, row := range summaryData {
		pdf.SetFont("Helvetica", "B", 9)
		pdf.CellFormat(55, 6, row[0], "1", 0, "L", true, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.CellFormat(73, 6, row[1], "1", 0, "L", false, 0, "")

		pdf.SetFont("Helvetica", "B", 9)
		pdf.CellFormat(55, 6, row[2], "1", 0, "L", true, 0, "")
		pdf.SetFont("Helvetica", "", 9)
		pdf.CellFormat(74, 6, row[3], "1", 1, "L", false, 0, "")
	}
	pdf.Ln(8)

	// 2. Isu Dominan & Prodi
	yStart := pdf.GetY()
	
	// Left Column: Isu Dominan
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(128, 6, "II. TOPIK KONSELING (ISU DOMINAN)", "", 1, "L", false, 0, "")
	pdf.Ln(2)
	
	pdf.SetFont("Helvetica", "B", 9)
	pdf.CellFormat(90, 6, "Topik", "1", 0, "L", true, 0, "")
	pdf.CellFormat(38, 6, "Jumlah", "1", 1, "C", true, 0, "")
	
	pdf.SetFont("Helvetica", "", 9)
	if len(topIssues) == 0 {
		pdf.CellFormat(128, 6, "Belum ada data topik.", "1", 1, "C", false, 0, "")
	} else {
		limit := 5
		if len(topIssues) < limit { limit = len(topIssues) }
		for i := 0; i < limit; i++ {
			pdf.CellFormat(90, 6, " " + topIssues[i].Name, "1", 0, "L", false, 0, "")
			pdf.CellFormat(38, 6, fmt.Sprintf("%d", topIssues[i].Count), "1", 1, "C", false, 0, "")
		}
	}
	
	// Right Column: Prodi Terbanyak
	pdf.SetXY(160, yStart)
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(117, 6, "III. DISTRIBUSI PROGRAM STUDI TERBANYAK", "", 1, "L", false, 0, "")
	pdf.SetX(160)
	pdf.Ln(2)
	pdf.SetX(160)
	pdf.SetFont("Helvetica", "B", 9)
	pdf.CellFormat(90, 6, "Program Studi", "1", 0, "L", true, 0, "")
	pdf.CellFormat(27, 6, "Jumlah", "1", 1, "C", true, 0, "")
	
	pdf.SetFont("Helvetica", "", 9)
	if len(prodiCounts) == 0 {
		pdf.SetX(160)
		pdf.CellFormat(117, 6, "Belum ada data prodi.", "1", 1, "C", false, 0, "")
	} else {
		for _, pc := range prodiCounts {
			pdf.SetX(160)
			pdf.CellFormat(90, 6, " " + pc.ProdiName, "1", 0, "L", false, 0, "")
			pdf.CellFormat(27, 6, fmt.Sprintf("%d", pc.Count), "1", 1, "C", false, 0, "")
		}
	}
	
	pdf.Ln(15)

	// 3. Daftar Mahasiswa Konsultasi
	// Filter unique students from bookings
	type PatientData struct {
		NIM    string
		Name   string
		Prodi  string
		Status string
	}
	uniquePatients := make(map[uint]PatientData)
	var patientList []PatientData
	for _, b := range bookings {
		if _, exists := uniquePatients[b.MahasiswaID]; !exists {
			prodiName := "-"
			if b.Mahasiswa.ProgramStudi.Nama != "" {
				prodiName = b.Mahasiswa.ProgramStudi.Nama
			}
			
			// Simple status determination based on latest booking
			statusStr := "Urgent/Aktif"
			if b.Status == "Selesai" {
				statusStr = "Selesai"
			}
			
			p := PatientData{
				NIM:    b.Mahasiswa.NIM,
				Name:   b.Mahasiswa.Nama,
				Prodi:  prodiName,
				Status: statusStr,
			}
			uniquePatients[b.MahasiswaID] = p
			patientList = append(patientList, p)
		}
	}
	
	// Draw Table
	if pdf.GetY() > 165 {
		pdf.AddPage()
	}
	
	pdf.SetFont("Helvetica", "B", 11)
	pdf.CellFormat(0, 6, "IV. DAFTAR MAHASISWA KONSULTASI", "", 1, "L", false, 0, "")
	pdf.Ln(2)
	
	pdf.SetFont("Helvetica", "B", 9)
	pdf.SetFillColor(241, 245, 249)
	pdf.CellFormat(10, 6, "No", "1", 0, "C", true, 0, "")
	pdf.CellFormat(35, 6, "NIM", "1", 0, "C", true, 0, "")
	pdf.CellFormat(80, 6, "Nama Mahasiswa", "1", 0, "C", true, 0, "")
	pdf.CellFormat(85, 6, "Program Studi", "1", 0, "C", true, 0, "")
	pdf.CellFormat(47, 6, "Status Terbaru", "1", 1, "C", true, 0, "")
	
	pdf.SetFont("Helvetica", "", 9)
	if len(patientList) == 0 {
		pdf.CellFormat(257, 6, "Tidak ada data mahasiswa pada periode/filter ini.", "1", 1, "C", false, 0, "")
	} else {
		for idx, p := range patientList {
			// Auto page break protection for table rows
			if pdf.GetY() > 185 {
				pdf.AddPage()
				pdf.SetFont("Helvetica", "B", 9)
				pdf.SetFillColor(241, 245, 249)
				pdf.CellFormat(10, 6, "No", "1", 0, "C", true, 0, "")
				pdf.CellFormat(35, 6, "NIM", "1", 0, "C", true, 0, "")
				pdf.CellFormat(80, 6, "Nama Mahasiswa", "1", 0, "C", true, 0, "")
				pdf.CellFormat(85, 6, "Program Studi", "1", 0, "C", true, 0, "")
				pdf.CellFormat(47, 6, "Status Terbaru", "1", 1, "C", true, 0, "")
				pdf.SetFont("Helvetica", "", 9)
			}
			
			pdf.CellFormat(10, 6, fmt.Sprintf("%d", idx+1), "1", 0, "C", false, 0, "")
			pdf.CellFormat(35, 6, " "+p.NIM, "1", 0, "L", false, 0, "")
			pdf.CellFormat(80, 6, " "+p.Name, "1", 0, "L", false, 0, "")
			pdf.CellFormat(85, 6, " "+p.Prodi, "1", 0, "L", false, 0, "")
			pdf.CellFormat(47, 6, " "+p.Status, "1", 1, "C", false, 0, "")
		}
	}
	
	pdf.Ln(15)

	// ── Signature ────────────────────────────────────────────────────────────
	if pdf.GetY()+30 > 195 {
		pdf.AddPage()
	}

	sigY := pdf.GetY()
	pdf.SetFont("Helvetica", "", 8)
	pdf.SetTextColor(15, 23, 42)
	pdf.SetXY(180, sigY)
	pdf.CellFormat(0, 4, fmt.Sprintf("Bandung, %s", formatIndoDate(time.Now())), "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.CellFormat(0, 4, "Psikolog Penanggung Jawab,", "", 1, "C", false, 0, "")

	pdf.SetXY(180, sigY+18)
	pdf.SetFont("Helvetica", "BU", 8.5)
	pdf.CellFormat(0, 4, psikolog.Nama, "", 1, "C", false, 0, "")
	pdf.SetX(180)
	pdf.SetFont("Helvetica", "", 7.5)
	pdf.SetTextColor(100, 116, 139)
	pdf.CellFormat(0, 3.5, fmt.Sprintf("BKU Care Center NIP/Reg: %d", psikolog.ID), "", 1, "C", false, 0, "")

	// Save and download
	exportsDir := "uploads/exports"
	if err := os.MkdirAll(exportsDir, 0755); err != nil {
		return err
	}

	fileName := fmt.Sprintf("laporan_analitik_%s.pdf", time.Now().Format("20060102150405"))
	filePath := filepath.Join(exportsDir, fileName)

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return err
	}

	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf("attachment; filename=\"Laporan_Analitik_%s.pdf\"", time.Now().Format("02-01-2006")))
	return c.SendFile(filePath)
}


